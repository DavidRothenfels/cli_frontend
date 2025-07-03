/**
 * Frontend Application for Autonomous Procurement Document Generator
 * Handles UI interactions, PDF processing, and real-time updates
 */

class ProcurementDocumentGenerator {
    constructor() {
        this.pb = new PocketBase('http://localhost:8090')
        this.currentStep = 1
        this.currentUserNeed = null
        this.currentRequestId = null
        this.uploadedFiles = []
        this.progressSubscription = null
        this.sessionSubscription = null
        this.healthCheckInterval = null
        
        this.init()
    }

    init() {
        this.setupEventListeners()
        this.setupPDFProcessor()
        this.startHealthChecking()
    }

    setupEventListeners() {
        // Step 1: User Needs Form
        document.getElementById('needs-form').addEventListener('submit', (e) => {
            e.preventDefault()
            this.handleUserNeedsSubmit(e)
        })

        // Step 2: PDF Upload
        document.getElementById('pdf-upload-area').addEventListener('click', () => {
            document.getElementById('pdf-files').click()
        })

        document.getElementById('pdf-files').addEventListener('change', (e) => {
            this.handlePDFUpload(e.target.files)
        })

        // Drag and drop for PDF upload
        const uploadArea = document.getElementById('pdf-upload-area')
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault()
            uploadArea.classList.add('drag-over')
        })

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over')
        })

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault()
            uploadArea.classList.remove('drag-over')
            this.handlePDFUpload(e.dataTransfer.files)
        })

        // Step navigation
        document.getElementById('back-to-step1').addEventListener('click', () => {
            this.showStep(1)
        })

        document.getElementById('start-generation').addEventListener('click', () => {
            this.startDocumentGeneration()
        })
    }

    setupPDFProcessor() {
        // Initialize PDF.js
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        }
    }

    startHealthChecking() {
        this.healthCheckInterval = setInterval(() => {
            this.checkGeminiHealth()
        }, 10000) // Check every 10 seconds
    }

    async checkGeminiHealth() {
        try {
            const response = await fetch('/api/gemini-health')
            const health = await response.json()
            
            const healthStatus = document.getElementById('health-status')
            if (health.status === 'healthy') {
                healthStatus.innerHTML = '🟢 Gesund'
                healthStatus.className = 'health-status healthy'
            } else {
                healthStatus.innerHTML = '🔴 Fehler'
                healthStatus.className = 'health-status error'
            }
        } catch (error) {
            console.error('Health check failed:', error)
            const healthStatus = document.getElementById('health-status')
            healthStatus.innerHTML = '🟡 Unbekannt'
            healthStatus.className = 'health-status unknown'
        }
    }

    async handleUserNeedsSubmit(e) {
        const formData = new FormData(e.target)
        const userNeedData = {
            title: formData.get('title'),
            description: formData.get('description'),
            budget: parseFloat(formData.get('budget')) || 0,
            deadline: formData.get('deadline') || null,
            category: formData.get('category'),
            requirements: formData.get('requirements') || ''
        }

        try {
            // Save user need to PocketBase
            this.currentUserNeed = await this.pb.collection('user_needs').create(userNeedData)
            console.log('User need created:', this.currentUserNeed.id)
            
            // Move to step 2
            this.showStep(2)
        } catch (error) {
            console.error('Error creating user need:', error)
            this.showError('Fehler beim Speichern der Anforderungen: ' + error.message)
        }
    }

    async handlePDFUpload(files) {
        if (!files || files.length === 0) return
        
        const statusDiv = document.getElementById('pdf-processing-status')
        statusDiv.innerHTML = '<p>Verarbeite PDF-Dateien...</p>'
        
        for (const file of files) {
            if (file.type === 'application/pdf') {
                try {
                    const extractedText = await this.extractTextFromPDF(file)
                    const documentType = this.detectDocumentType(file.name, extractedText)
                    
                    // Save to PocketBase
                    const uploadedDoc = await this.pb.collection('uploaded_documents').create({
                        user_need: this.currentUserNeed.id,
                        filename: file.name,
                        file_size: file.size,
                        extracted_text: extractedText,
                        document_type: documentType
                    })
                    
                    this.uploadedFiles.push({
                        id: uploadedDoc.id,
                        filename: file.name,
                        type: documentType,
                        size: file.size
                    })
                    
                    statusDiv.innerHTML += `<div class="upload-success">✅ ${file.name} (${documentType})</div>`
                    
                } catch (error) {
                    console.error('Error processing PDF:', error)
                    statusDiv.innerHTML += `<div class="upload-error">❌ ${file.name}: ${error.message}</div>`
                }
            }
        }
        
        if (this.uploadedFiles.length > 0) {
            statusDiv.innerHTML += `<p class="upload-summary">📊 ${this.uploadedFiles.length} Dokumente erfolgreich verarbeitet</p>`
        }
    }

    async extractTextFromPDF(file) {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js library not loaded')
        }
        
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ""
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items.map(item => item.str).join(' ')
            fullText += pageText + '\n'
        }
        
        return fullText.trim()
    }

    detectDocumentType(filename, text) {
        const lowerFilename = filename.toLowerCase()
        const lowerText = text.toLowerCase()
        
        if (lowerText.includes('leistungsbeschreibung') || lowerFilename.includes('leistung')) {
            return 'reference_leistung'
        } else if (lowerText.includes('eignungskriterien') || lowerFilename.includes('eignung')) {
            return 'reference_eignung'
        } else if (lowerText.includes('zuschlagskriterien') || lowerFilename.includes('zuschlag')) {
            return 'reference_zuschlag'
        }
        return 'unknown'
    }

    async startDocumentGeneration() {
        if (!this.currentUserNeed) {
            this.showError('Keine Benutzeranforderungen gefunden')
            return
        }

        try {
            // Start generation process
            const response = await fetch('/api/generate-documents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_need_id: this.currentUserNeed.id
                })
            })

            const result = await response.json()
            
            if (response.ok) {
                this.currentRequestId = result.request_id
                this.showStep(3)
                this.startRealtimeTracking()
            } else {
                throw new Error(result.error || 'Generation failed')
            }
        } catch (error) {
            console.error('Error starting generation:', error)
            this.showError('Fehler beim Starten der Dokumentgenerierung: ' + error.message)
        }
    }

    startRealtimeTracking() {
        // Subscribe to progress updates
        this.progressSubscription = this.pb.collection('generation_progress').subscribe('*', (e) => {
            if (e.record.request_id === this.currentRequestId) {
                this.updateProgressDisplay(e.record)
            }
        })

        // Subscribe to Gemini session updates
        this.sessionSubscription = this.pb.collection('gemini_sessions').subscribe('*', (e) => {
            if (e.record.request_id === this.currentRequestId) {
                this.updateSessionDisplay(e.record)
            }
        })

        // Start polling for status updates as backup
        this.statusPollingInterval = setInterval(() => {
            this.pollGenerationStatus()
        }, 2000) // Poll every 2 seconds
    }

    async pollGenerationStatus() {
        if (!this.currentRequestId) return

        try {
            const response = await fetch(`/api/generation-status/${this.currentRequestId}`)
            const status = await response.json()

            if (response.ok) {
                this.updateProgressFromStatus(status)
                
                if (status.status === 'completed') {
                    this.handleGenerationComplete(status)
                } else if (status.status === 'error') {
                    this.handleGenerationError(status)
                }
            }
        } catch (error) {
            console.error('Error polling status:', error)
        }
    }

    updateProgressDisplay(record) {
        const progressBar = document.getElementById('progress-bar')
        const progressText = document.getElementById('progress-text')
        const currentStep = document.getElementById('current-step')
        const currentTask = document.getElementById('current-task')
        const geminiFeedback = document.getElementById('gemini-feedback')

        progressBar.style.width = `${record.progress}%`
        progressText.textContent = `${record.progress}%`
        currentStep.textContent = this.getStepDisplayName(record.step)
        currentTask.textContent = record.current_task || 'Verarbeitung läuft...'
        geminiFeedback.textContent = record.gemini_feedback || 'Keine Rückmeldung'

        // Update web searches
        if (record.web_searches) {
            this.updateWebSearches(JSON.parse(record.web_searches))
        }

        // Update tool usage
        if (record.tool_calls) {
            this.updateToolUsage(JSON.parse(record.tool_calls))
        }

        // Handle errors
        if (record.errors) {
            this.showError(record.errors)
        }
    }

    updateSessionDisplay(record) {
        const geminiOutput = document.getElementById('gemini-output')
        const statusIndicator = document.getElementById('gemini-status')
        
        // Update output stream
        if (record.output_stream) {
            geminiOutput.textContent = record.output_stream
            geminiOutput.scrollTop = geminiOutput.scrollHeight
        }

        // Update status indicator
        switch (record.status) {
            case 'starting':
                statusIndicator.innerHTML = '🔄 Startet'
                statusIndicator.className = 'status-indicator starting'
                break
            case 'running':
                statusIndicator.innerHTML = '🔄 Läuft'
                statusIndicator.className = 'status-indicator running'
                break
            case 'completed':
                statusIndicator.innerHTML = '✅ Abgeschlossen'
                statusIndicator.className = 'status-indicator completed'
                break
            case 'error':
                statusIndicator.innerHTML = '❌ Fehler'
                statusIndicator.className = 'status-indicator error'
                break
        }

        // Update API usage
        if (record.api_usage) {
            const apiUsage = JSON.parse(record.api_usage)
            document.getElementById('api-usage').innerHTML = 
                `Requests: ${apiUsage.used}/${apiUsage.limit} (${apiUsage.limit - apiUsage.used} übrig)`
        }
    }

    updateProgressFromStatus(status) {
        const progressBar = document.getElementById('progress-bar')
        const progressText = document.getElementById('progress-text')
        const currentStep = document.getElementById('current-step')
        const currentTask = document.getElementById('current-task')
        const geminiFeedback = document.getElementById('gemini-feedback')

        progressBar.style.width = `${status.progress}%`
        progressText.textContent = `${status.progress}%`
        currentStep.textContent = this.getStepDisplayName(status.status)
        currentTask.textContent = status.current_task || 'Verarbeitung läuft...'
        geminiFeedback.textContent = status.gemini_feedback || 'Keine Rückmeldung'

        // Update web searches
        if (status.web_searches) {
            this.updateWebSearches(JSON.parse(status.web_searches))
        }

        // Update tool usage
        if (status.tool_calls) {
            this.updateToolUsage(JSON.parse(status.tool_calls))
        }
    }

    updateWebSearches(searches) {
        const container = document.getElementById('web-search-queries')
        container.innerHTML = ''
        
        if (searches && searches.length > 0) {
            searches.forEach(search => {
                const searchDiv = document.createElement('div')
                searchDiv.className = 'search-query'
                searchDiv.innerHTML = `
                    <span class="search-icon">🔍</span>
                    <span class="search-text">${search.query || search}</span>
                    <span class="search-time">${search.timestamp ? new Date(search.timestamp).toLocaleTimeString() : ''}</span>
                `
                container.appendChild(searchDiv)
            })
        } else {
            container.innerHTML = '<div class="no-activity">Keine Web-Recherchen bisher</div>'
        }
    }

    updateToolUsage(tools) {
        const container = document.getElementById('tool-usage')
        container.innerHTML = ''
        
        if (tools && tools.length > 0) {
            tools.forEach(tool => {
                const toolDiv = document.createElement('div')
                toolDiv.className = 'tool-usage-item'
                toolDiv.innerHTML = `
                    <span class="tool-icon">🛠️</span>
                    <span class="tool-text">${tool.tool || tool}</span>
                    <span class="tool-time">${tool.timestamp ? new Date(tool.timestamp).toLocaleTimeString() : ''}</span>
                `
                container.appendChild(toolDiv)
            })
        } else {
            container.innerHTML = '<div class="no-activity">Keine Tools verwendet</div>'
        }
    }

    handleGenerationComplete(status) {
        // Stop polling
        if (this.statusPollingInterval) {
            clearInterval(this.statusPollingInterval)
            this.statusPollingInterval = null
        }

        // Unsubscribe from real-time updates
        if (this.progressSubscription) {
            this.pb.collection('generation_progress').unsubscribe(this.progressSubscription)
        }
        if (this.sessionSubscription) {
            this.pb.collection('gemini_sessions').unsubscribe(this.sessionSubscription)
        }

        // Show generated documents
        this.displayGeneratedDocuments(status.documents)
    }

    handleGenerationError(status) {
        // Stop polling
        if (this.statusPollingInterval) {
            clearInterval(this.statusPollingInterval)
            this.statusPollingInterval = null
        }

        this.showError('Fehler bei der Dokumentgenerierung: ' + (status.errors || 'Unbekannter Fehler'))
    }

    displayGeneratedDocuments(documents) {
        const container = document.getElementById('generated-documents')
        container.innerHTML = '<h3>📄 Generierte Dokumente</h3>'
        
        if (documents && documents.length > 0) {
            documents.forEach(doc => {
                const docDiv = document.createElement('div')
                docDiv.className = 'generated-document'
                docDiv.innerHTML = `
                    <div class="document-info">
                        <h4>${doc.title}</h4>
                        <p>Typ: ${this.getDocumentTypeDisplayName(doc.type)}</p>
                        <p>Erstellt: ${new Date(doc.created).toLocaleString()}</p>
                    </div>
                    <div class="document-actions">
                        <button onclick="app.downloadDocument('${doc.id}')" class="btn-primary">
                            📥 Herunterladen
                        </button>
                    </div>
                `
                container.appendChild(docDiv)
            })
        } else {
            container.innerHTML += '<p>Keine Dokumente generiert</p>'
        }
    }

    async downloadDocument(documentId) {
        try {
            const response = await fetch(`/api/download-document/${documentId}`)
            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = response.headers.get('Content-Disposition').split('filename=')[1].replace(/"/g, '')
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
            } else {
                throw new Error('Download failed')
            }
        } catch (error) {
            console.error('Error downloading document:', error)
            this.showError('Fehler beim Herunterladen: ' + error.message)
        }
    }

    getStepDisplayName(step) {
        const stepNames = {
            'pending': 'Warteschlange',
            'initializing': 'Initialisierung',
            'processing': 'Verarbeitung',
            'completed': 'Abgeschlossen',
            'error': 'Fehler'
        }
        return stepNames[step] || step
    }

    getDocumentTypeDisplayName(type) {
        const typeNames = {
            'leistung': 'Leistungsbeschreibung',
            'eignung': 'Eignungskriterien',
            'zuschlag': 'Zuschlagskriterien'
        }
        return typeNames[type] || type
    }

    showStep(stepNumber) {
        // Hide all steps
        document.querySelectorAll('.step-container').forEach(step => {
            step.style.display = 'none'
        })

        // Show current step
        const stepMap = {
            1: 'needs-container',
            2: 'upload-container',
            3: 'progress-container'
        }

        const stepId = stepMap[stepNumber]
        if (stepId) {
            document.getElementById(stepId).style.display = 'block'
            this.currentStep = stepNumber
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('error-display')
        errorDiv.innerHTML = `
            <div class="error-message">
                <h4>❌ Fehler</h4>
                <p>${message}</p>
            </div>
        `
        errorDiv.style.display = 'block'
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none'
        }, 10000)
    }

    cleanup() {
        // Clean up subscriptions and intervals
        if (this.progressSubscription) {
            this.pb.collection('generation_progress').unsubscribe(this.progressSubscription)
        }
        if (this.sessionSubscription) {
            this.pb.collection('gemini_sessions').unsubscribe(this.sessionSubscription)
        }
        if (this.statusPollingInterval) {
            clearInterval(this.statusPollingInterval)
        }
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval)
        }
    }
}

// Initialize the application
const app = new ProcurementDocumentGenerator()

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    app.cleanup()
})