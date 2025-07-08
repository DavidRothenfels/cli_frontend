// ===== PROJEKTANSICHT LOGIC =====

let pb = null;
let currentProjectId = null;
let projectData = { documents: [] };
let simplemde = null;
let currentDocumentId = null;

document.addEventListener('DOMContentLoaded', async () => {
    pb = new PocketBase(window.location.origin);

    if (!pb.authStore.isValid) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Test if the current auth token actually works
        await pb.collection('users').authRefresh();
    } catch (error) {
        console.log('Auth token invalid, redirecting to login');
        pb.authStore.clear();
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    currentProjectId = urlParams.get('request_id') || urlParams.get('id');

    console.log('🔍 URL Params:', window.location.search);
    console.log('🔍 Current Project ID:', currentProjectId);

    if (!currentProjectId) {
        showNotification('Keine Projekt-ID gefunden!', 'error');
        window.location.href = 'dashboard.html';
        return;
    }

    initAuthAndTheme();
    initEditor();
    initEventListeners();
    await loadProjectData();
});

function initAuthAndTheme() {
    const user = pb.authStore.model;
    if (user) document.getElementById('user-email').textContent = user.email;
    
    document.getElementById('logout-btn').addEventListener('click', () => {
        pb.authStore.clear();
        window.location.href = 'login.html';
    });

    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    // CSS handles the icon visibility based on theme

    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

async function loadProjectData() {
    try {
        console.log('🔍 Loading project data for request_id:', currentProjectId);
        
        // Load project record first to get name and description
        const projects = await pb.collection('projects').getFullList({
            filter: `request_id="${currentProjectId}"`
        });
        
        const project = projects.length > 0 ? projects[0] : null;
        
        // Load documents by request_id
        const documents = await pb.collection('documents').getFullList({
            filter: `request_id="${currentProjectId}"`,
            sort: '-created'
        });

        console.log('📋 Found documents:', documents.length);
        console.log('📋 Found project:', project);

        // Use project name from projects collection or extract from first document
        const projectName = project?.name || 
            (documents.length > 0 && documents[0]?.title?.includes(':') 
                ? documents[0].title.split(':')[1]?.trim() 
                : `Projekt ${currentProjectId}`);

        projectData.id = currentProjectId;
        projectData.name = projectName || `Projekt ${currentProjectId}`;
        projectData.description = project?.description || '';
        projectData.documents = documents;

        // Pre-fill the prompt input with project description
        const promptInput = document.getElementById('prompt-input');
        if (promptInput && projectData.description) {
            promptInput.value = projectData.description;
        }

        // If no documents exist, show empty state but don't redirect
        if (documents.length === 0) {
            console.log('ℹ️ No documents found, showing empty project state');
            logToOutput('Projekt geladen - noch keine Dokumente vorhanden. Erstellen Sie neue Dokumente über "Dokumente generieren".');
        }

        document.getElementById('project-title').textContent = projectData.name;
        populateDocumentSelector();
        
        console.log('✅ Project data loaded successfully');
    } catch (error) {
        console.error('Fehler beim Laden der Projektdaten:', error);
        logToOutput('Fehler beim Laden der Projektdaten: ' + error.message);
        showNotification('Fehler beim Laden der Projektdaten: ' + error.message, 'error');
        
        // Only redirect on real errors, not missing documents
        if (!error.message.includes('Keine Dokumente')) {
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);
        }
    }
}

function populateDocumentSelector() {
    const select = document.getElementById('document-select');
    const currentlySelected = select.value;
    
    if (projectData.documents.length === 0) {
        select.innerHTML = '<option value="">-- Keine Dokumente vorhanden --</option>';
        return;
    }
    
    select.innerHTML = '<option value="">-- Dokument auswählen --</option>';
    
    projectData.documents.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = doc.title;
        select.appendChild(option);
    });

    // Restore selection if possible
    if (projectData.documents.find(d => d.id === currentlySelected)) {
        select.value = currentlySelected;
    }
}

function initEditor() {
    simplemde = new SimpleMDE({
        element: document.getElementById("markdown-editor"),
        spellChecker: false,
        toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "preview", "side-by-side", "fullscreen"],
    });
}

function initEventListeners() {
    document.getElementById('document-select').addEventListener('change', handleDocumentSelect);
    document.getElementById('save-doc-btn').addEventListener('click', saveCurrentDocument);
    document.getElementById('generate-docs-btn').addEventListener('click', generateDocuments);
    document.getElementById('leave-project-btn').addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });

    // Subscribe to changes in the documents collection for this project
    pb.collection('documents').subscribe('*', handleDocumentUpdate);
    
    // Subscribe to generation_requests to track completion status
    pb.collection('generation_requests').subscribe('*', handleGenerationStatusUpdate);
    
    // Subscribe to logs for real-time progress updates
    pb.collection('logs').subscribe('*', handleLogUpdate);
}

function handleDocumentSelect(e) {
    currentDocumentId = e.target.value;
    if (currentDocumentId) {
        const document = projectData.documents.find(d => d.id === currentDocumentId);
        if (document) {
            simplemde.value(document.content);
        }
    } else {
        simplemde.value('');
    }
}

async function saveCurrentDocument() {
    if (!currentDocumentId) {
        showNotification('Bitte wählen Sie zuerst ein Dokument aus.', 'error');
        return;
    }
    logToOutput('Speichere Dokument...');
    try {
        await pb.collection('documents').update(currentDocumentId, { content: simplemde.value() });
        
        const docIndex = projectData.documents.findIndex(d => d.id === currentDocumentId);
        projectData.documents[docIndex].content = simplemde.value();
        
        logToOutput('Dokument erfolgreich gespeichert!');
        showNotification('Dokument erfolgreich gespeichert!', 'success');
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        logToOutput('Speichern fehlgeschlagen.');
        showNotification('Speichern fehlgeschlagen.', 'error');
    }
}

async function generateDocuments() {
    const prompt = document.getElementById('prompt-input').value.trim();
    if (!prompt) {
        showNotification('Bitte geben Sie die Eckpunkte der Vergabe in das Textfeld ein.', 'error');
        return;
    }

    logToOutput('Starte Dokumentengenerierung...');
    document.getElementById('generate-docs-btn').disabled = true;

    try {
        // Create generation request with correct field mapping
        const generationRequest = await pb.collection('generation_requests').create({
            user_need_id: currentProjectId,  // Reference to the user_needs record
            prompt: prompt,
            status: 'pending'  // Will be set by hook, but ensure it's clear
        });
        
        logToOutput('Anfrage zur Generierung gesendet. Warte auf Antwort...');
        showNotification('Dokumentengenerierung gestartet...', 'info');
        
        console.log('Generation request created:', generationRequest.id);
    } catch (error) {
        console.error('Fehler bei der Generierungsanfrage:', error);
        logToOutput('Fehler: Konnte die Generierung nicht starten.');
        showNotification('Fehler: Konnte die Generierung nicht starten.', 'error');
        document.getElementById('generate-docs-btn').disabled = false;
    }
}

async function handleDocumentUpdate(e) {
    // Check if the update belongs to the current project
    if (e.record.request_id !== currentProjectId) {
        return;
    }

    logToOutput(`Echtzeit-Update: Dokument "${e.record.title}" wurde ${e.action}.`);

    // Reload all documents for simplicity
    await loadProjectData();
}

async function handleGenerationStatusUpdate(e) {
    // Check if the update belongs to the current project
    if (e.record.user_need_id !== currentProjectId) {
        return;
    }

    console.log('Generation status update:', e.record);
    
    if (e.record.status === 'completed') {
        logToOutput('✅ Dokumentengenerierung abgeschlossen!');
        showNotification('Dokumente erfolgreich generiert!', 'success');
        
        // Re-enable the generate button
        document.getElementById('generate-docs-btn').disabled = false;
        
        // Reload documents to show the new ones
        await loadProjectData();
    } else if (e.record.status === 'failed') {
        logToOutput('❌ Dokumentengenerierung fehlgeschlagen!');
        showNotification('Fehler bei der Dokumentengenerierung', 'error');
        
        // Re-enable the generate button
        document.getElementById('generate-docs-btn').disabled = false;
    } else if (e.record.status === 'processing') {
        logToOutput('⏳ Dokumentengenerierung läuft...');
    }
}

async function handleLogUpdate(e) {
    // Check if the log belongs to the current project
    if (e.record.request_id !== currentProjectId) {
        return;
    }

    // Only show relevant log messages from the CLI processor
    const message = e.record.message;
    if (message && (
        message.includes('📋') || message.includes('✅') || message.includes('⏳') || 
        message.includes('🤖') || message.includes('📝') || message.includes('❌') ||
        message.includes('🎉')
    )) {
        logToOutput(message);
        
        // Show notification for important milestones
        if (message.includes('🎉')) {
            showNotification('Alle Dokumente erfolgreich erstellt!', 'success');
        } else if (message.includes('❌') && e.record.level === 'error') {
            showNotification('Fehler bei der Dokumentenerstellung', 'error');
        }
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function logToOutput(message) {
    const logOutput = document.getElementById('log-output');
    const time = new Date().toLocaleTimeString();
    logOutput.innerHTML += `<div>[${time}] ${message}</div>`;
    logOutput.scrollTop = logOutput.scrollHeight;
}