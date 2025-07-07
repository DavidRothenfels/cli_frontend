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
        
        // Load documents by request_id
        const documents = await pb.collection('documents').getFullList({
            filter: `request_id="${currentProjectId}"`,
            sort: '-created'
        });

        console.log('📋 Found documents:', documents.length);

        if (documents.length === 0) {
            throw new Error('Keine Dokumente für dieses Projekt gefunden');
        }

        // Extract project name from first document or use request_id
        const projectName = documents[0]?.title?.includes(':') 
            ? documents[0].title.split(':')[1]?.trim() 
            : `Projekt ${currentProjectId}`;

        projectData.id = currentProjectId;
        projectData.name = projectName || `Projekt ${currentProjectId}`;
        projectData.documents = documents;

        document.getElementById('project-title').textContent = projectData.name;
        populateDocumentSelector();
        
        console.log('✅ Project data loaded successfully');
    } catch (error) {
        console.error('Fehler beim Laden der Projektdaten:', error);
        logToOutput('Fehler beim Laden der Projektdaten: ' + error.message);
        showNotification('Fehler beim Laden der Projektdaten: ' + error.message, 'error');
        
        // Redirect back to dashboard if no documents found
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 3000);
    }
}

function populateDocumentSelector() {
    const select = document.getElementById('document-select');
    const currentlySelected = select.value;
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
    pb.collection('documents').subscribe('*', handleRealtimeUpdate);
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
        showNotification('Bitte geben Sie einen Bedarf in das Textfeld ein.', 'error');
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

async function handleRealtimeUpdate(e) {
    // Check if the update belongs to the current project
    if (e.record.request_id !== currentProjectId) {
        return;
    }

    logToOutput(`Echtzeit-Update: Dokument "${e.record.title}" wurde ${e.action}.`);

    // Reload all documents for simplicity
    await loadProjectData();
    
    // Re-enable button if the process seems to be done
    document.getElementById('generate-docs-btn').disabled = false;
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