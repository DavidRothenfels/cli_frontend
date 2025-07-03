// Vergabedokument-Generator Frontend Application

// Global state
let currentStep = 1;
let uploadedFiles = [];
let currentRequest = null;
let pb = null;

// Initialize PocketBase connection
document.addEventListener('DOMContentLoaded', function() {
    try {
        pb = new PocketBase('http://127.0.0.1:8090');
        console.log('PocketBase initialized');
    } catch (error) {
        console.error('PocketBase initialization failed:', error);
        showError('Verbindung zur Anwendung fehlgeschlagen. Bitte Seite neu laden.');
    }
    
    initializeApp();
});

// Initialize application
function initializeApp() {
    setupEventListeners();
    goToStep(1);
}

// Setup event listeners
function setupEventListeners() {
    // Form submission
    const needsForm = document.getElementById('needs-form');
    if (needsForm) {
        needsForm.addEventListener('submit', handleNeedsSubmission);
    }
    
    // File upload
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleFileDrop);
        fileInput.addEventListener('change', handleFileSelect);
    }
}

// Handle needs form submission
async function handleNeedsSubmission(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const needs = {
        title: formData.get('title'),
        description: formData.get('description'),
        budget: parseInt(formData.get('budget')) || 0,
        deadline: formData.get('deadline'),
        category: formData.get('category'),
        requirements: formData.get('requirements') || ''
    };
    
    // Validate required fields
    if (!needs.title || !needs.description || !needs.category) {
        showError('Bitte füllen Sie alle Pflichtfelder aus.');
        return;
    }
    
    // Store needs data for later use
    sessionStorage.setItem('userNeeds', JSON.stringify(needs));
    
    // Move to next step
    goToStep(2);
}

// File handling functions
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

function handleFileDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    processFiles(files);
}

function processFiles(files) {
    const validFiles = files.filter(file => {
        const validTypes = ['.pdf', '.doc', '.docx'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        const isValidType = validTypes.some(type => 
            file.name.toLowerCase().endsWith(type)
        );
        const isValidSize = file.size <= maxSize;
        
        if (!isValidType) {
            showError(`Dateityp nicht unterstützt: ${file.name}`);
            return false;
        }
        
        if (!isValidSize) {
            showError(`Datei zu groß: ${file.name} (max. 10MB)`);
            return false;
        }
        
        return true;
    });
    
    // Add valid files to upload list
    validFiles.forEach(file => {
        if (!uploadedFiles.find(f => f.name === file.name && f.size === file.size)) {
            uploadedFiles.push(file);
        }
    });
    
    updateFileList();
}

function updateFileList() {
    const fileList = document.getElementById('file-list');
    if (!fileList) return;
    
    if (uploadedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }
    
    fileList.innerHTML = uploadedFiles.map((file, index) => `
        <div class="file-item">
            <div class="file-info">
                <div class="file-icon">📄</div>
                <div class="file-details">
                    <h4>${file.name}</h4>
                    <p>${formatFileSize(file.size)} • ${getFileType(file.name)}</p>
                </div>
            </div>
            <div class="file-actions">
                <button class="btn btn-secondary" onclick="removeFile(${index})">
                    Entfernen
                </button>
            </div>
        </div>
    `).join('');
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    updateFileList();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileType(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const types = {
        'pdf': 'PDF-Dokument',
        'doc': 'Word-Dokument',
        'docx': 'Word-Dokument'
    };
    return types[ext] || 'Unbekannt';
}

// Document generation
async function startGeneration() {
    try {
        const userNeeds = JSON.parse(sessionStorage.getItem('userNeeds'));
        if (!userNeeds) {
            showError('Bedarfsdaten nicht gefunden. Bitte beginnen Sie von vorn.');
            goToStep(1);
            return;
        }
        
        // Move to progress step
        goToStep(3);
        
        // Start progress animation
        updateProgress('leistung', 10, '🔄 Wird generiert...');
        updateProgress('eignung', 0, '⏳ Warten...');
        updateProgress('zuschlag', 0, '⏳ Warten...');
        
        addLogEntry('Starte Dokumentgenerierung...');
        
        // Call document generation API
        const response = await fetch('/api/generate-documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userNeeds)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Unbekannter Fehler');
        }
        
        const result = await response.json();
        
        // Simulate progress updates
        setTimeout(() => {
            updateProgress('leistung', 100, '✅ Abgeschlossen');
            updateProgress('eignung', 50, '🔄 Wird generiert...');
            addLogEntry('Leistungsbeschreibung erfolgreich erstellt');
        }, 1000);
        
        setTimeout(() => {
            updateProgress('eignung', 100, '✅ Abgeschlossen');
            updateProgress('zuschlag', 50, '🔄 Wird generiert...');
            addLogEntry('Eignungskriterien erfolgreich erstellt');
        }, 2000);
        
        setTimeout(() => {
            updateProgress('zuschlag', 100, '✅ Abgeschlossen');
            addLogEntry('Zuschlagskriterien erfolgreich erstellt');
            addLogEntry('Alle Dokumente wurden erfolgreich generiert');
            
            // Store result and move to results
            currentRequest = result;
            loadDocuments(result.user_need_id);
        }, 3000);
        
    } catch (error) {
        console.error('Generation error:', error);
        showError(`Fehler bei der Generierung: ${error.message}`);
        
        // Reset progress
        updateProgress('leistung', 0, '❌ Fehler');
        updateProgress('eignung', 0, '❌ Fehler');
        updateProgress('zuschlag', 0, '❌ Fehler');
        addLogEntry(`Fehler: ${error.message}`);
    }
}

function updateProgress(type, percentage, status) {
    const progressBar = document.getElementById(`${type}-progress`);
    const statusElement = document.getElementById(`${type}-status`);
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    
    if (statusElement) {
        statusElement.textContent = status;
    }
}

function addLogEntry(message) {
    const logContent = document.getElementById('log-content');
    if (!logContent) return;
    
    const timestamp = new Date().toLocaleTimeString('de-DE');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
        <span class="log-time">🕐 ${timestamp}</span>
        <span>${message}</span>
    `;
    
    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
}

// Load and display documents
async function loadDocuments(userNeedId) {
    try {
        const response = await fetch(`/api/documents/${userNeedId}`);
        if (!response.ok) {
            throw new Error('Dokumente konnten nicht geladen werden');
        }
        
        const result = await response.json();
        displayDocuments(result.documents);
        goToStep(4);
        
    } catch (error) {
        console.error('Document loading error:', error);
        showError(`Fehler beim Laden der Dokumente: ${error.message}`);
    }
}

function displayDocuments(documents) {
    const resultsContainer = document.getElementById('document-results');
    if (!resultsContainer) return;
    
    const documentTypes = {
        'leistung': '📋 Leistungsbeschreibung',
        'eignung': '🎯 Eignungskriterien',
        'zuschlag': '⚖️ Zuschlagskriterien'
    };
    
    resultsContainer.innerHTML = documents.map(doc => `
        <div class="document-card">
            <h3>${documentTypes[doc.type] || doc.title}</h3>
            <div class="document-meta">
                Erstellt: ${new Date(doc.created).toLocaleDateString('de-DE')}
            </div>
            <div class="document-actions">
                <button class="btn btn-primary" onclick="previewDocument('${doc.id}')">
                    Vorschau
                </button>
                <button class="btn btn-secondary" onclick="downloadDocument('${doc.id}')">
                    Download
                </button>
            </div>
        </div>
    `).join('');
}

// Document actions
function previewDocument(docId) {
    // Find document in current request
    if (!currentRequest) return;
    
    // Open preview in new window/modal
    window.open(`/api/download/${docId}`, '_blank');
}

async function downloadDocument(docId) {
    try {
        const response = await fetch(`/api/download/${docId}`);
        if (!response.ok) {
            throw new Error('Download fehlgeschlagen');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'document.md';
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showSuccess('Dokument wurde heruntergeladen');
        
    } catch (error) {
        console.error('Download error:', error);
        showError(`Download fehlgeschlagen: ${error.message}`);
    }
}

function downloadAll() {
    if (!currentRequest || !currentRequest.documents) {
        showError('Keine Dokumente zum Download verfügbar');
        return;
    }
    
    // Download each document
    currentRequest.documents.forEach((doc, index) => {
        setTimeout(() => {
            downloadDocument(doc.id);
        }, index * 500); // Stagger downloads
    });
}

// Navigation
function goToStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show target step
    const targetStep = document.getElementById(`step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
        currentStep = stepNumber;
    }
}

function startOver() {
    // Clear session data
    sessionStorage.removeItem('userNeeds');
    uploadedFiles = [];
    currentRequest = null;
    
    // Reset form
    const form = document.getElementById('needs-form');
    if (form) {
        form.reset();
    }
    
    // Reset file list
    updateFileList();
    
    // Reset progress
    updateProgress('leistung', 0, '⏳ Warten...');
    updateProgress('eignung', 0, '⏳ Warten...');
    updateProgress('zuschlag', 0, '⏳ Warten...');
    
    // Clear log
    const logContent = document.getElementById('log-content');
    if (logContent) {
        logContent.innerHTML = `
            <div class="log-entry">
                <span class="log-time">🕐</span>
                <span>Bereit für neue Dokumentgenerierung...</span>
            </div>
        `;
    }
    
    // Go to first step
    goToStep(1);
}

// Modal functions
function showError(message) {
    const errorModal = document.getElementById('error-modal');
    const errorMessage = document.getElementById('error-message');
    
    if (errorModal && errorMessage) {
        errorMessage.textContent = message;
        errorModal.classList.add('show');
    }
}

function showSuccess(message) {
    const successModal = document.getElementById('success-modal');
    const successMessage = document.getElementById('success-message');
    
    if (successModal && successMessage) {
        successMessage.textContent = message;
        successModal.classList.add('show');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Error handling
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // ESC to close modals
    if (event.key === 'Escape') {
        closeModal('error-modal');
        closeModal('success-modal');
    }
    
    // Ctrl+Enter to submit form in step 1
    if (event.ctrlKey && event.key === 'Enter' && currentStep === 1) {
        const form = document.getElementById('needs-form');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }
});