/**
 * German Procurement Document Generator - Frontend Application
 * 
 * This application provides a complete frontend interface for generating
 * German procurement documents using PocketBase backend and AI integration.
 */

class VergabedokumentGenerator {
    constructor() {
        // Initialize PocketBase client
        this.pb = new PocketBase('http://localhost:8090');
        
        // Application state
        this.currentStep = 1;
        this.uploadedFiles = [];
        this.generationInProgress = false;
        this.generatedDocuments = [];
        this.eventSource = null;
        
        // Initialize the application
        this.init();
    }
    
    /**
     * Initialize the application
     */
    async init() {
        try {
            // Check PocketBase connection
            await this.checkConnection();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize UI components
            this.setupUI();
            
            // Load any existing session data
            this.loadSessionData();
            
            console.log('Vergabedokument-Generator initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Fehler beim Initialisieren der Anwendung. Bitte prüfen Sie die Verbindung.');
        }
    }
    
    /**
     * Check PocketBase connection
     */
    async checkConnection() {
        try {
            await this.pb.health.check();
            console.log('PocketBase connection successful');
        } catch (error) {
            console.warn('PocketBase connection failed, running in offline mode');
            // Could implement offline mode here
        }
    }
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Step 1: Needs form
        const needsForm = document.getElementById('needs-form');
        if (needsForm) {
            needsForm.addEventListener('submit', (e) => this.handleNeedsSubmit(e));
        }
        
        // Step 2: File upload
        this.setupFileUpload();
        
        // Navigation buttons
        document.getElementById('back-to-step1')?.addEventListener('click', () => this.goToStep(1));
        document.getElementById('start-generation')?.addEventListener('click', () => this.startGeneration());
        document.getElementById('cancel-generation')?.addEventListener('click', () => this.cancelGeneration());
        document.getElementById('new-generation')?.addEventListener('click', () => this.startNewGeneration());
        document.getElementById('download-all')?.addEventListener('click', () => this.downloadAllDocuments());
        
        // Modal controls
        this.setupModalControls();
        
        // Form validation
        this.setupFormValidation();
        
        // Keyboard navigation
        this.setupKeyboardNavigation();
    }
    
    /**
     * Setup file upload functionality
     */
    setupFileUpload() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const fileSelectBtn = document.getElementById('file-select-btn');
        
        if (!dropZone || !fileInput || !fileSelectBtn) return;
        
        // File select button
        fileSelectBtn.addEventListener('click', () => fileInput.click());
        
        // File input change
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        
        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFileSelect(e.dataTransfer.files);
        });
        
        // Click to select files
        dropZone.addEventListener('click', () => fileInput.click());
    }
    
    /**
     * Setup modal controls
     */
    setupModalControls() {
        // Error modal
        const errorModal = document.getElementById('error-modal');
        const errorModalClose = document.getElementById('error-modal-close');
        const errorModalOk = document.getElementById('error-modal-ok');
        
        if (errorModalClose) {
            errorModalClose.addEventListener('click', () => this.hideModal('error-modal'));
        }
        if (errorModalOk) {
            errorModalOk.addEventListener('click', () => this.hideModal('error-modal'));
        }
        
        // Success modal
        const successModal = document.getElementById('success-modal');
        const successModalClose = document.getElementById('success-modal-close');
        const successModalOk = document.getElementById('success-modal-ok');
        
        if (successModalClose) {
            successModalClose.addEventListener('click', () => this.hideModal('success-modal'));
        }
        if (successModalOk) {
            successModalOk.addEventListener('click', () => this.hideModal('success-modal'));
        }
        
        // Close modal on background click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });
    }
    
    /**
     * Setup form validation
     */
    setupFormValidation() {
        const form = document.getElementById('needs-form');
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }
    
    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // ESC key to close modals
            if (e.key === 'Escape') {
                const visibleModal = document.querySelector('.modal.visible');
                if (visibleModal) {
                    this.hideModal(visibleModal.id);
                }
            }
        });
    }
    
    /**
     * Setup UI components
     */
    setupUI() {
        // Set minimum date to today
        const deadlineInput = document.getElementById('project-deadline');
        if (deadlineInput) {
            const today = new Date().toISOString().split('T')[0];
            deadlineInput.min = today;
        }
        
        // Initialize progress
        this.updateProgress();
    }
    
    /**
     * Load session data from localStorage
     */
    loadSessionData() {
        try {
            const sessionData = localStorage.getItem('vergabe-generator-session');
            if (sessionData) {
                const data = JSON.parse(sessionData);
                
                // Restore form data
                if (data.formData) {
                    Object.keys(data.formData).forEach(key => {
                        const input = document.querySelector(`[name="${key}"]`);
                        if (input) {
                            input.value = data.formData[key];
                        }
                    });
                }
                
                // Restore current step
                if (data.currentStep) {
                    this.currentStep = data.currentStep;
                    this.goToStep(this.currentStep);
                }
            }
        } catch (error) {
            console.error('Error loading session data:', error);
        }
    }
    
    /**
     * Save session data to localStorage
     */
    saveSessionData() {
        try {
            const formData = this.getFormData();
            const sessionData = {
                formData,
                currentStep: this.currentStep,
                timestamp: Date.now()
            };
            
            localStorage.setItem('vergabe-generator-session', JSON.stringify(sessionData));
        } catch (error) {
            console.error('Error saving session data:', error);
        }
    }
    
    /**
     * Handle needs form submission
     */
    async handleNeedsSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }
        
        const formData = this.getFormData();
        console.log('Form data submitted:', formData);
        
        // Save to session
        this.saveSessionData();
        
        // Show success and move to next step
        this.showSuccess('Bedarf erfolgreich erfasst!');
        setTimeout(() => {
            this.goToStep(2);
        }, 1000);
    }
    
    /**
     * Get form data
     */
    getFormData() {
        const form = document.getElementById('needs-form');
        if (!form) return {};
        
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }
    
    /**
     * Validate entire form
     */
    validateForm() {
        const form = document.getElementById('needs-form');
        if (!form) return false;
        
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    /**
     * Validate individual field
     */
    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        let isValid = true;
        let errorMessage = '';
        
        // Required field validation
        if (field.required && !value) {
            isValid = false;
            errorMessage = 'Dieses Feld ist erforderlich.';
        }
        
        // Specific field validations
        switch (fieldName) {
            case 'title':
                if (value && value.length < 5) {
                    isValid = false;
                    errorMessage = 'Der Titel muss mindestens 5 Zeichen lang sein.';
                }
                break;
                
            case 'description':
                if (value && value.length < 20) {
                    isValid = false;
                    errorMessage = 'Die Beschreibung muss mindestens 20 Zeichen lang sein.';
                }
                break;
                
            case 'budget':
                if (value && (isNaN(value) || Number(value) <= 0)) {
                    isValid = false;
                    errorMessage = 'Bitte geben Sie einen gültigen Betrag ein.';
                }
                break;
                
            case 'deadline':
                if (value) {
                    const selectedDate = new Date(value);
                    const today = new Date();
                    if (selectedDate <= today) {
                        isValid = false;
                        errorMessage = 'Das Datum muss in der Zukunft liegen.';
                    }
                }
                break;
        }
        
        // Show/hide error
        if (isValid) {
            this.clearFieldError(field);
        } else {
            this.showFieldError(field, errorMessage);
        }
        
        return isValid;
    }
    
    /**
     * Show field error
     */
    showFieldError(field, message) {
        const errorElement = document.getElementById(`${field.id}-error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('visible');
        }
        
        field.classList.add('error');
    }
    
    /**
     * Clear field error
     */
    clearFieldError(field) {
        const errorElement = document.getElementById(`${field.id}-error`);
        if (errorElement) {
            errorElement.classList.remove('visible');
        }
        
        field.classList.remove('error');
    }
    
    /**
     * Handle file selection
     */
    handleFileSelect(files) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        
        Array.from(files).forEach(file => {
            // Validate file size
            if (file.size > maxSize) {
                this.showError(`Die Datei "${file.name}" ist zu groß. Maximale Größe: 10MB`);
                return;
            }
            
            // Validate file type
            if (!allowedTypes.includes(file.type)) {
                this.showError(`Die Datei "${file.name}" hat einen nicht unterstützten Dateityp.`);
                return;
            }
            
            // Check for duplicates
            if (this.uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
                this.showError(`Die Datei "${file.name}" wurde bereits hochgeladen.`);
                return;
            }
            
            // Add to uploaded files
            this.uploadedFiles.push({
                id: Date.now() + Math.random(),
                file: file,
                name: file.name,
                size: this.formatFileSize(file.size),
                type: file.type,
                uploaded: false
            });
        });
        
        this.updateFileList();
    }
    
    /**
     * Update file list display
     */
    updateFileList() {
        const fileList = document.getElementById('file-list');
        if (!fileList) return;
        
        if (this.uploadedFiles.length === 0) {
            fileList.innerHTML = '';
            return;
        }
        
        const html = this.uploadedFiles.map(fileInfo => `
            <div class="file-item" data-file-id="${fileInfo.id}">
                <div class="file-info">
                    <div class="file-icon">${this.getFileIcon(fileInfo.type)}</div>
                    <div class="file-details">
                        <div class="file-name">${fileInfo.name}</div>
                        <div class="file-size">${fileInfo.size}</div>
                    </div>
                </div>
                <div class="file-actions">
                    <button type="button" class="file-remove" onclick="app.removeFile('${fileInfo.id}')">
                        Entfernen
                    </button>
                </div>
            </div>
        `).join('');
        
        fileList.innerHTML = html;
    }
    
    /**
     * Remove file from upload list
     */
    removeFile(fileId) {
        this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== fileId);
        this.updateFileList();
    }
    
    /**
     * Get file icon based on type
     */
    getFileIcon(type) {
        switch (type) {
            case 'application/pdf':
                return '📄';
            case 'application/msword':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return '📝';
            default:
                return '📄';
        }
    }
    
    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Start document generation
     */
    async startGeneration() {
        try {
            this.generationInProgress = true;
            this.goToStep(3);
            
            // Prepare data for generation
            const formData = this.getFormData();
            const generationData = {
                ...formData,
                files: this.uploadedFiles.map(f => ({
                    name: f.name,
                    size: f.size,
                    type: f.type
                })),
                timestamp: new Date().toISOString()
            };
            
            console.log('Starting generation with data:', generationData);
            
            // Start progress simulation (replace with real API call)
            await this.simulateGeneration(generationData);
            
        } catch (error) {
            console.error('Generation failed:', error);
            this.showError('Fehler bei der Dokumentgenerierung: ' + error.message);
            this.generationInProgress = false;
        }
    }
    
    /**
     * Simulate document generation (replace with real API integration)
     */
    async simulateGeneration(data) {
        const steps = [
            { id: 'analysis', name: 'Bedarfsanalyse', duration: 3000 },
            { id: 'performance', name: 'Leistungsbeschreibung', duration: 5000 },
            { id: 'qualification', name: 'Eignungskriterien', duration: 4000 },
            { id: 'award', name: 'Zuschlagskriterien', duration: 3000 }
        ];
        
        this.addLogEntry('Generierung gestartet...');
        
        for (let step of steps) {
            await this.processGenerationStep(step);
        }
        
        this.addLogEntry('Generierung abgeschlossen!');
        this.generationInProgress = false;
        
        // Generate mock documents
        this.generateMockDocuments(data);
        
        setTimeout(() => {
            this.goToStep(4);
        }, 1000);
    }
    
    /**
     * Process individual generation step
     */
    async processGenerationStep(step) {
        const statusElement = document.getElementById(`${step.id}-status`);
        const progressElement = document.getElementById(`${step.id}-progress`);
        
        if (statusElement) statusElement.textContent = 'In Bearbeitung...';
        if (progressElement) progressElement.style.width = '0%';
        
        this.addLogEntry(`${step.name} wird erstellt...`);
        
        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress > 100) progress = 100;
            
            if (progressElement) {
                progressElement.style.width = `${progress}%`;
            }
            
            if (progress >= 100) {
                clearInterval(interval);
                if (statusElement) statusElement.textContent = 'Abgeschlossen';
                this.addLogEntry(`${step.name} erfolgreich erstellt`);
            }
        }, step.duration / 10);
        
        // Wait for completion
        await new Promise(resolve => setTimeout(resolve, step.duration));
    }
    
    /**
     * Add entry to generation log
     */
    addLogEntry(message) {
        const logContent = document.getElementById('generation-log-content');
        if (!logContent) return;
        
        const time = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-message">${message}</span>
        `;
        
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    }
    
    /**
     * Generate mock documents (replace with real API results)
     */
    generateMockDocuments(data) {
        const documents = [
            {
                id: 'leistungsbeschreibung',
                title: 'Leistungsbeschreibung',
                type: 'performance',
                content: `# Leistungsbeschreibung\n\n## Projekttitel\n${data.title}\n\n## Beschreibung\n${data.description}\n\n## Leistungsumfang\n- Detaillierte Anforderungen\n- Technische Spezifikationen\n- Projektablauf`,
                created: new Date().toISOString(),
                size: '2.4 KB'
            },
            {
                id: 'eignungskriterien',
                title: 'Eignungskriterien',
                type: 'qualification',
                content: `# Eignungskriterien\n\n## Fachliche Eignung\n- Erforderliche Qualifikationen\n- Referenzen\n- Zertifizierungen\n\n## Wirtschaftliche Eignung\n- Umsatzanforderungen\n- Bonität`,
                created: new Date().toISOString(),
                size: '1.8 KB'
            },
            {
                id: 'zuschlagskriterien',
                title: 'Zuschlagskriterien',
                type: 'award',
                content: `# Zuschlagskriterien\n\n## Preis (60%)\n- Angebotspreis\n- Wirtschaftlichkeit\n\n## Qualität (40%)\n- Technische Qualität\n- Projekterfahrung`,
                created: new Date().toISOString(),
                size: '1.5 KB'
            }
        ];
        
        this.generatedDocuments = documents;
        this.displayGeneratedDocuments();
    }
    
    /**
     * Display generated documents
     */
    displayGeneratedDocuments() {
        const container = document.getElementById('generated-documents');
        if (!container) return;
        
        const html = this.generatedDocuments.map(doc => `
            <div class="document-card">
                <div class="document-header">
                    <div class="document-icon">${this.getDocumentIcon(doc.type)}</div>
                    <h3 class="document-title">${doc.title}</h3>
                </div>
                <div class="document-meta">
                    Erstellt: ${new Date(doc.created).toLocaleString()} | Größe: ${doc.size}
                </div>
                <div class="document-preview">
                    ${this.truncateText(doc.content, 200)}
                </div>
                <div class="document-actions">
                    <button type="button" class="btn btn-secondary" onclick="app.previewDocument('${doc.id}')">
                        Vorschau
                    </button>
                    <button type="button" class="btn btn-primary" onclick="app.downloadDocument('${doc.id}')">
                        Herunterladen
                    </button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }
    
    /**
     * Get document icon based on type
     */
    getDocumentIcon(type) {
        switch (type) {
            case 'performance':
                return '📝';
            case 'qualification':
                return '✅';
            case 'award':
                return '🏆';
            default:
                return '📄';
        }
    }
    
    /**
     * Truncate text for preview
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    /**
     * Preview document
     */
    previewDocument(docId) {
        const doc = this.generatedDocuments.find(d => d.id === docId);
        if (!doc) return;
        
        // Open in new window or modal
        const newWindow = window.open('', '_blank', 'width=800,height=600');
        newWindow.document.write(`
            <html>
                <head>
                    <title>${doc.title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
                    </style>
                </head>
                <body>
                    <h1>${doc.title}</h1>
                    <pre>${doc.content}</pre>
                </body>
            </html>
        `);
    }
    
    /**
     * Download document
     */
    downloadDocument(docId) {
        const doc = this.generatedDocuments.find(d => d.id === docId);
        if (!doc) return;
        
        const blob = new Blob([doc.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.title}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Download all documents
     */
    downloadAllDocuments() {
        this.generatedDocuments.forEach(doc => {
            setTimeout(() => this.downloadDocument(doc.id), 100);
        });
    }
    
    /**
     * Cancel generation
     */
    cancelGeneration() {
        if (this.generationInProgress) {
            this.generationInProgress = false;
            this.addLogEntry('Generierung abgebrochen');
            this.showError('Generierung wurde abgebrochen.');
        }
    }
    
    /**
     * Start new generation
     */
    startNewGeneration() {
        // Reset state
        this.currentStep = 1;
        this.uploadedFiles = [];
        this.generatedDocuments = [];
        this.generationInProgress = false;
        
        // Clear forms
        const form = document.getElementById('needs-form');
        if (form) form.reset();
        
        this.updateFileList();
        
        // Clear session
        localStorage.removeItem('vergabe-generator-session');
        
        // Go to first step
        this.goToStep(1);
    }
    
    /**
     * Navigate to specific step
     */
    goToStep(step) {
        this.currentStep = step;
        
        // Hide all step contents
        document.querySelectorAll('.step-content').forEach(el => {
            el.classList.remove('active');
        });
        
        // Show current step
        const currentStepElement = document.querySelector(`.step-content:nth-child(${step})`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
        }
        
        // Update progress steps
        document.querySelectorAll('.step').forEach((el, index) => {
            el.classList.remove('active', 'completed');
            if (index + 1 === step) {
                el.classList.add('active');
            } else if (index + 1 < step) {
                el.classList.add('completed');
            }
        });
        
        // Update progress bar
        this.updateProgress();
        
        // Save state
        this.saveSessionData();
    }
    
    /**
     * Update progress bar
     */
    updateProgress() {
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            const percentage = (this.currentStep / 4) * 100;
            progressFill.style.width = `${percentage}%`;
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        this.showModal('error-modal');
    }
    
    /**
     * Show success message
     */
    showSuccess(message) {
        const successMessage = document.getElementById('success-message');
        if (successMessage) {
            successMessage.textContent = message;
        }
        this.showModal('success-modal');
    }
    
    /**
     * Show modal
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('visible');
            // Focus first focusable element
            const focusable = modal.querySelector('button, input, select, textarea');
            if (focusable) focusable.focus();
        }
    }
    
    /**
     * Hide modal
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('visible');
        }
    }
    
    /**
     * Show loading overlay
     */
    showLoading(text = 'Wird geladen...') {
        const overlay = document.getElementById('loading-overlay');
        const loadingText = document.querySelector('.loading-text');
        
        if (loadingText) {
            loadingText.textContent = text;
        }
        
        if (overlay) {
            overlay.classList.add('visible');
        }
    }
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VergabedokumentGenerator();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VergabedokumentGenerator;
}