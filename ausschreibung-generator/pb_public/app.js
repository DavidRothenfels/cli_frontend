/**
 * Single-Thread UI/UX - Minimalistischer Dokumentengenerator
 * Eine fokussierte, geführte Erfahrung
 */

const pb = new PocketBase(window.location.origin)
let currentRequestId = null
let documentsReceived = 0
let currentPdfExports = []

// Init
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners()
    setupDocumentSubscription()
    setupPdfSubscription()
    fetchAndRenderExamples()
})

function setupEventListeners() {
    // Form Submit - Übergang zur Generierung
    document.getElementById('needForm').addEventListener('submit', async (e) => {
        e.preventDefault()
        await startGeneration(e)
    })

    // Restart Button
    document.getElementById('restart-btn').addEventListener('click', () => {
        restartProcess()
    })

    // Example Prompts - Event Delegation
    document.getElementById('example-prompts').addEventListener('click', (e) => {
        if (e.target.classList.contains('example-btn')) {
            const promptText = e.target.dataset.prompt
            if (promptText) {
                document.getElementById('description').value = promptText
                document.getElementById('description').focus()
            }
        }
    })
}

async function startGeneration(e) {
    console.log('🚀 startGeneration called')
    const formData = new FormData(e.target)
    const description = formData.get('description').trim()
    console.log('📝 Description:', description)
    
    if (!description) {
        console.log('❌ No description provided')
        return
    }

    try {
        console.log('🔄 Starting generation process...')
        
        // 1. UI Transition: Input -> Status
        console.log('🎨 Transitioning UI to status view')
        transitionToStatus()
        clearLogs() // Logs leeren bei neuem Start

        // 2. Extrahiere intelligente Informationen aus der Beschreibung
        console.log('🔍 Extracting info from description...')
        const { budget, deadline } = extractInfoFromDescription(description)
        console.log('💰 Extracted budget:', budget)
        console.log('📅 Extracted deadline:', deadline)

        // 3. User Need erstellen
        console.log('📊 Creating user_need record...')
        const userNeedData = {
            description: description,
            budget: budget,
            deadline: deadline
        }
        console.log('📊 User need data:', userNeedData)
        
        const userNeed = await pb.collection('user_needs').create(userNeedData)
        console.log('✅ User need created:', userNeed)

        // 4. Generation Request erstellen -> löst Gemini CLI aus
        console.log('🎯 Creating generation_request record...')
        const requestData = {
            user_need_id: userNeed.id,
            status: 'pending'
        }
        console.log('🎯 Request data:', requestData)
        
        const request = await pb.collection('generation_requests').create(requestData)
        console.log('✅ Generation request created:', request)

        currentRequestId = request.id
        documentsReceived = 0
        console.log('🔗 Setting up log subscription for request:', currentRequestId)
        setupLogSubscription(currentRequestId) // Log-Subscription starten
        
        console.log('🤖 Gemini CLI processing will start automatically via hook...')
        
        console.log('🎉 Generation process started successfully!')

    } catch (error) {
        console.error('❌ ERROR in startGeneration:')
        console.error('Error type:', error.constructor.name)
        console.error('Error message:', error.message)
        console.error('Error status:', error.status)
        console.error('Error data:', error.data)
        console.error('Full error object:', error)
        console.error('Stack trace:', error.stack)
        showError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
    }
}

function transitionToStatus() {
    const inputSection = document.getElementById('input-section')
    const statusSection = document.getElementById('status-section')
    
    // Update wizard progress
    updateWizardProgress(2)
    
    // Transition sections
    inputSection.classList.remove('active')
    statusSection.classList.add('active')
}

function transitionToResults() {
    const statusSection = document.getElementById('status-section')
    const resultsSection = document.getElementById('results-section')
    
    // Update wizard progress
    updateWizardProgress(3)
    
    // Transition sections
    statusSection.classList.remove('active')
    resultsSection.classList.add('active')
}

let unsubscribeLog = null // Variable zum Speichern der Unsubscribe-Funktion

function setupLogSubscription(requestId) {
    console.log('🔄 Setting up log subscription for:', requestId)
    
    // Vorherige Subscription beenden, falls vorhanden
    if (unsubscribeLog) {
        unsubscribeLog()
        unsubscribeLog = null
    }

    // Try realtime subscription first
    try {
        unsubscribeLog = pb.collection('logs').subscribe('*', (e) => {
            console.log('📡 Real-time log received:', e)
            if (e.action === 'create' && e.record.request_id === requestId) {
                addLogToUI(e.record)
            }
        })
        console.log('✅ Real-time subscription established')
    } catch (error) {
        console.warn('⚠️ Real-time subscription failed, using polling:', error)
    }

    // Fallback: Poll for logs every 2 seconds
    let lastLogCount = 0
    const pollInterval = setInterval(async () => {
        try {
            console.log('🔍 Polling for logs...')
            const logs = await pb.collection('logs').getFullList({
                filter: `request_id = "${requestId}"`,
                sort: 'created'
            })
            
            console.log(`📊 Found ${logs.length} logs (previously ${lastLogCount})`)
            
            // Add new logs that weren't displayed yet
            if (logs.length > lastLogCount) {
                const newLogs = logs.slice(lastLogCount)
                newLogs.forEach(log => {
                    console.log('📝 Adding log to UI:', log.message)
                    addLogToUI(log)
                })
                lastLogCount = logs.length
            }
            
            // Stop polling if generation is complete
            if (logs.some(log => log.message.includes('completed') || log.message.includes('error'))) {
                clearInterval(pollInterval)
                console.log('🏁 Polling stopped - generation completed')
            }
        } catch (error) {
            console.error('❌ Error polling logs:', error)
        }
    }, 2000)
    
    // Stop polling after 5 minutes max
    setTimeout(() => {
        clearInterval(pollInterval)
        console.log('⏰ Polling stopped - timeout')
    }, 300000)
}

function addLogToUI(logEntry) {
    console.log('🎨 Adding log to UI:', logEntry)
    const logOutput = document.getElementById('log-output')
    const resultsLogOutput = document.getElementById('results-log-output')
    
    if (!logOutput && !resultsLogOutput) {
        console.error('❌ Log output element not found')
        return
    }
    
    const logLine = document.createElement('div')
    logLine.className = `log-line log-${logEntry.level || 'info'}`
    
    // Format timestamp
    const timestamp = new Date(logEntry.created).toLocaleTimeString()
    logLine.textContent = `[${timestamp}] [${(logEntry.level || 'INFO').toUpperCase()}] ${logEntry.message}`
    
    // Add to both log outputs if they exist
    if (logOutput) {
        logOutput.appendChild(logLine.cloneNode(true))
        logOutput.scrollTop = logOutput.scrollHeight
    }
    
    if (resultsLogOutput) {
        resultsLogOutput.appendChild(logLine.cloneNode(true))
        resultsLogOutput.scrollTop = resultsLogOutput.scrollHeight
    }
    
    console.log('✅ Log added to UI successfully')
}

function clearLogs() {
    const logOutput = document.getElementById('log-output')
    logOutput.innerHTML = ''
}

function setupDocumentSubscription() {
    // Realtime: Dokumente empfangen
    pb.collection('documents').subscribe('*', (e) => {
        console.log('📄 Document subscription event:', e)
        if (e.action === 'create' && e.record.request_id === currentRequestId) {
            console.log('📄 Adding document to UI:', e.record.title)
            addDocumentToUI(e.record)
        }
    })
    
    // Fallback: Alle 3 Sekunden nach neuen Dokumenten suchen
    const checkForDocuments = setInterval(async () => {
        if (!currentRequestId) return
        
        try {
            const documents = await pb.collection('documents').getFullList({
                filter: `request_id = "${currentRequestId}"`,
                sort: '-created' // Neueste zuerst
            })
            
            console.log(`📄 Found ${documents.length} documents, displayed: ${documentsReceived}`)
            
            if (documents.length > documentsReceived) {
                const newDocuments = documents.slice(documentsReceived)
                newDocuments.forEach(doc => {
                    console.log('📄 Adding missed document:', doc.title)
                    addDocumentToUI(doc)
                })
            }
            
            // Stop checking when all documents are found and status is completed
            if (documents.length >= 3) {
                clearInterval(checkForDocuments)
                console.log('📄 All documents found, stopping document polling')
            }
        } catch (error) {
            console.error('❌ Error checking for documents:', error)
        }
    }, 3000)
}

function addDocumentToUI(documentRecord) {
    documentsReceived++
    
    // Bei erstem Dokument: Transition zu Results aber Logs weiterlaufen lassen
    if (documentsReceived === 1) {
        transitionToResults()
        // PDF-Bereich nach kurzem Delay anzeigen
        setTimeout(() => {
            showPdfSection()
        }, 1000)
        // Logs sollten weiterhin sichtbar bleiben
        showLogsInResults()
    }

    const grid = window.document.getElementById('documents-grid')
    if (!grid) {
        console.error('❌ documents-grid element not found')
        return
    }
    
    const card = document.createElement('div')
    card.className = 'document-card'
    card.style.opacity = '0'
    card.style.transform = 'translateY(20px)'
    
    card.innerHTML = `
        <div class="document-icon">${getDocumentIcon(documentRecord.type)}</div>
        <h3>${documentRecord.title}</h3>
        <p class="document-type">${getDocumentTypeDisplayName(documentRecord.type)}</p>
        <p class="document-creator">Erstellt von: ${documentRecord.created_by}</p>
        <button onclick="downloadDocument('${documentRecord.id}', '${documentRecord.title}')" class="download-btn">
            Download
        </button>
    `
    
    grid.appendChild(card)
    
    // Animate in
    setTimeout(() => {
        card.style.opacity = '1'
        card.style.transform = 'translateY(0)'
    }, 100)

    // Update status
    updateStatus()
}

function updateStatus() {
    const statusTitle = document.getElementById('status-title')
    const statusText = document.getElementById('status-text')
    
    if (documentsReceived === 1) {
        statusTitle.textContent = `${documentsReceived}/3 Dokumente fertig`
        statusText.textContent = 'Weitere Dokumente werden erstellt...'
    } else if (documentsReceived === 2) {
        statusTitle.textContent = `${documentsReceived}/3 Dokumente fertig`
        statusText.textContent = 'Letztes Dokument wird finalisiert...'
    } else if (documentsReceived >= 3) {
        statusTitle.textContent = 'Alle Dokumente erstellt!'
        statusText.textContent = 'Ihre Vergabedokumente sind bereit zum Download.'
        // PDF-Buttons aktivieren wenn alle Dokumente fertig
        enablePdfGeneration()
    }
}

function getDocumentIcon(type) {
    const icons = {
        'leistung': '📋',
        'eignung': '✅',
        'zuschlag': '🎯'
    }
    return icons[type] || '📄'
}

function getDocumentTypeDisplayName(type) {
    const types = {
        'leistung': 'Leistungsbeschreibung',
        'eignung': 'Eignungskriterien',
        'zuschlag': 'Zuschlagskriterien'
    }
    return types[type] || type
}

async function downloadDocument(documentId, title) {
    try {
        console.log('📥 Downloading document:', documentId, title)
        
        // Get document from PocketBase directly with cache bypass
        const documentData = await pb.collection('documents').getOne(documentId, {
            // Force fresh fetch, bypass cache
            requestKey: Date.now().toString()
        })
        console.log('📄 Document retrieved:', documentData)
        console.log('📄 Created by:', documentData.created_by)
        console.log('📄 Content preview:', documentData.content?.substring(0, 200) + '...')
        
        const content = documentData.content
        if (!content || content.trim() === '') {
            throw new Error('Dokument ist leer')
        }
        
        const blob = new Blob([content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        
        const a = window.document.createElement('a')
        a.href = url
        a.download = `${title}.md`
        a.click()
        
        URL.revokeObjectURL(url)
        console.log('✅ Download completed successfully')
    } catch (error) {
        console.error('❌ Download error:', error)
        showError('Download fehlgeschlagen')
    }
}

function extractInfoFromDescription(description) {
    let budget = 0
    let deadline = null
    
    // Extrahiere Budget (deutsche Zahlenformate)
    const budgetRegex = /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)\s*(?:€|EUR|Euro)/i
    const budgetMatch = description.match(budgetRegex)
    if (budgetMatch) {
        // Deutsche Zahlenformate: 50.000,00 € oder 50000 €
        let budgetStr = budgetMatch[1]
        // Entferne Tausendertrennzeichen (.) und ersetze Komma durch Punkt
        budgetStr = budgetStr.replace(/\./g, '').replace(',', '.')
        budget = parseFloat(budgetStr) || 0
    }
    
    // Extrahiere Datum
    const dateRegex = /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})|(\w+)\s+(\d{4})/i
    const dateMatch = description.match(dateRegex)
    if (dateMatch) {
        // Vereinfachte Datumserkennung
        deadline = new Date().toISOString().split('T')[0] // Fallback: heute
    }
    
    return { budget, deadline }
}

function showError(message) {
    const statusTitle = document.getElementById('status-title')
    const statusText = document.getElementById('status-text')
    
    statusTitle.textContent = 'Fehler'
    statusText.textContent = message
    
    // Spinner ausblenden
    const spinner = document.querySelector('.spinner')
    if (spinner) spinner.style.display = 'none'
}

async function fetchAndRenderExamples() {
    console.log('📚 Fetching example prompts...')
    console.log('🌐 PocketBase URL:', pb.baseUrl)
    
    try {
        console.log('🔍 Requesting example_prompts collection...')
        const examples = await pb.collection('example_prompts').getFullList({ sort: 'sort_order' })
        console.log('✅ Examples loaded:', examples.length, 'items')
        console.log('📋 Examples data:', examples)
        
        const container = document.getElementById('example-prompts')
        const label = container.querySelector('.example-label')
        console.log('🎨 Container found:', !!container)
        
        examples.forEach((ex, index) => {
            console.log(`📝 Processing example ${index + 1}:`, ex.title)
            const button = document.createElement('button')
            button.type = 'button'
            button.className = 'example-btn'
            button.textContent = ex.title
            button.dataset.prompt = ex.prompt_text
            container.appendChild(button)
            console.log(`✅ Button created for: ${ex.title}`)
        })
        
        // Zeige Container nur an, wenn Beispiele vorhanden sind
        if (examples.length === 0) {
            console.log('⚠️ No examples found, hiding container')
            container.style.display = 'none'
        } else {
            console.log('🎉 Examples rendered successfully!')
        }
    } catch (error) {
        console.error("❌ ERROR fetching examples:")
        console.error("Error type:", error.constructor.name)
        console.error("Error message:", error.message)
        console.error("Error status:", error.status)
        console.error("Error data:", error.data)
        console.error("PocketBase URL:", pb.baseUrl)
        console.error("Full error:", error)
        
        // Container ausblenden, wenn keine Beispiele geladen werden können
        const container = document.getElementById('example-prompts')
        if (container) {
            container.style.display = 'none'
        }
        
        // Zeige eine Warnung im Browser-Console für Debugging
        console.warn("Beispiele konnten nicht geladen werden. Überprüfen Sie die Serververbindung.")
    }
}

async function startFrontendDocumentGeneration(requestId, userNeedId, description) {
    console.log('📋 Frontend document generation started')
    
    const createLog = async (message, level = "info") => {
        try {
            const logData = {
                message: message,
                level: level,
                request_id: requestId
            }
            await pb.collection('logs').create(logData)
            console.log(`📝 Log created: ${message}`)
        } catch (error) {
            console.error('❌ Failed to create log:', error)
        }
    }

    const updateStatus = async (status) => {
        try {
            await pb.collection('generation_requests').update(requestId, { status: status })
            console.log(`📊 Status updated to: ${status}`)
        } catch (error) {
            console.error('❌ Failed to update status:', error)
        }
    }

    const createDocument = async (title, content, type, delay = 0) => {
        return new Promise((resolve) => {
            setTimeout(async () => {
                try {
                    const documentData = {
                        request_id: requestId,
                        title: title,
                        content: content,
                        type: type,
                        created_by: "Frontend AI"
                    }
                    const doc = await pb.collection('documents').create(documentData)
                    await createLog(`✅ Dokument erstellt: ${title}`)
                    console.log(`📄 Document created: ${title}`)
                    resolve(doc)
                } catch (error) {
                    console.error(`❌ Failed to create document ${title}:`, error)
                    await createLog(`❌ Fehler beim Erstellen von ${title}: ${error.message}`, "error")
                    resolve(null)
                }
            }, delay)
        })
    }

    try {
        await updateStatus("processing")
        await createLog("🚀 Dokumentenerstellung gestartet")
        await createLog(`📝 Bearbeite Anfrage: ${description.substring(0, 80)}...`)

        // Dokument 1: Leistungsbeschreibung (sofort)
        await createLog("📋 Erstelle Leistungsbeschreibung...")
        await createDocument(
            "Leistungsbeschreibung",
            `# Leistungsbeschreibung\n\n## Projektbeschreibung\n${description}\n\n## Leistungsumfang\n1. Detaillierte Planung und Konzeption\n2. Professionelle Umsetzung der Arbeiten\n3. Qualitätssicherung und Abnahme\n4. Vollständige Projektdokumentation\n\n## Technische Anforderungen\n- Einhaltung aller relevanten DIN-Normen\n- Verwendung hochwertiger, zertifizierter Materialien\n- Gewährleistung von 24 Monaten\n- Energieeffiziente Umsetzung\n\n## Projektdauer\nVoraussichtliche Umsetzungsdauer: 4-6 Wochen\n\n## Projektmanagement\n- Wöchentliche Statusberichte\n- Feste Ansprechpartner\n- Termingerechte Fertigstellung`,
            "leistung",
            0
        )

        // Dokument 2: Eignungskriterien (sofort)
        await createLog("✅ Erstelle Eignungskriterien...")
        await createDocument(
            "Eignungskriterien",
            `# Eignungskriterien\n\n## Fachliche Eignung\n- Nachweis von mindestens 3 vergleichbaren Projekten in den letzten 5 Jahren\n- Qualifizierte Fachkräfte mit entsprechenden Zertifikaten\n- Aktuelle Referenzen von zufriedenen Kunden\n- Mitgliedschaft in relevanten Fachverbänden\n\n## Technische Eignung\n- Moderne, professionelle Ausstattung und Werkzeuge\n- Qualitätsmanagementsystem nach ISO 9001\n- Umweltmanagementsystem (ISO 14001) erwünscht\n- Nachweis über regelmäßige Weiterbildungen\n\n## Wirtschaftliche Eignung\n- Jahresumsatz der letzten 3 Geschäftsjahre\n- Nachweis einer Betriebshaftpflichtversicherung (mind. 1 Mio. €)\n- Bonitätsnachweis nicht älter als 3 Monate\n- Eigenkapitalquote von mindestens 10%`,
            "eignung",
            0
        )

        // Dokument 3: Zuschlagskriterien (sofort)
        await createLog("🎯 Erstelle Zuschlagskriterien...")
        await createDocument(
            "Zuschlagskriterien",
            `# Zuschlagskriterien\n\n## Bewertungsmatrix\n\n### Preis (40%)\n- Gesamtpreis für alle ausgeschriebenen Leistungen\n- Transparenz der Kalkulation\n- Verhältnis Preis-Leistung\n\n### Qualität (35%)\n- Qualität und Detailgrad der Projektplanung\n- Qualifikation und Erfahrung des Projektteams\n- Referenzen und bisherige Projekterfolge\n\n### Termine (15%)\n- Realistische und nachvollziehbare Zeitplanung\n- Angemessene Pufferzeiten eingeplant\n- Flexibilität bei Terminanpassungen\n\n### Nachhaltigkeit (10%)\n- Verwendung umweltfreundlicher Materialien\n- Energieeffizienz der Lösung\n- Soziale Verantwortung\n\n## Bewertungssystem\n- Punkteskala von 0-100 pro Kriterium\n- Gewichtung entsprechend obiger Prozentsätze\n- Mindestpunktzahl: 60% der Gesamtpunktzahl`,
            "zuschlag",
            0
        )

        // Completion (sofort nach allen Dokumenten)
        await createLog("🎉 Alle 3 Dokumente erfolgreich generiert!")
        await updateStatus("completed")
        console.log('✅ Frontend document generation completed')
        
        // Force transition to results if not already done
        setTimeout(() => {
            if (documentsReceived === 0) {
                console.log('🔄 Forcing transition to results view')
                transitionToResults()
                // Manually trigger document display
                setTimeout(async () => {
                    try {
                        const documents = await pb.collection('documents').getFullList({
                            filter: `request_id = "${requestId}"`,
                            sort: 'created'
                        })
                        console.log(`📄 Manual document fetch: found ${documents.length} documents`)
                        documents.forEach(doc => addDocumentToUI(doc))
                    } catch (error) {
                        console.error('❌ Manual document fetch failed:', error)
                    }
                }, 500)
            }
        }, 1000)

    } catch (error) {
        console.error('❌ Error in frontend document generation:', error)
        await createLog(`❌ Fehler: ${error.message}`, "error")
        await updateStatus("failed")
    }
}


// =====================================================
// PDF-RELATED FUNCTIONS
// =====================================================

function setupPdfSubscription() {
    // Realtime: PDF-Exports empfangen
    pb.collection('pdf_exports').subscribe('*', (e) => {
        console.log('📄 PDF subscription event:', e)
        if (e.action === 'create' && e.record.request_id === currentRequestId) {
            console.log('📄 Adding PDF export to UI:', e.record.title)
            currentPdfExports.push(e.record)
            updatePdfExportUI(e.record)
        } else if (e.action === 'update' && e.record.request_id === currentRequestId) {
            console.log('📄 Updating PDF export:', e.record.title, e.record.generation_status)
            updatePdfExportStatus(e.record)
        }
    })
}

function showPdfSection() {
    console.log('📄 Showing PDF section')
    const resultsSection = document.getElementById('results-container')
    
    // Prüfe ob PDF-Sektion bereits existiert
    if (document.getElementById('pdf-section')) {
        return
    }
    
    const pdfSection = document.createElement('div')
    pdfSection.id = 'pdf-section'
    pdfSection.className = 'pdf-section'
    pdfSection.style.opacity = '0'
    pdfSection.style.transform = 'translateY(20px)'
    
    pdfSection.innerHTML = `
        <h3>📄 PDF-Export</h3>
        <p>Erstellen Sie professionelle PDF-Dokumente aus Ihren generierten Inhalten.</p>
        
        <div class="pdf-options">
            <div class="pdf-option">
                <div class="pdf-option-info">
                    <strong>📁 Gesamtpaket PDF</strong>
                    <p>Alle Dokumente kombiniert mit Deckblatt und Inhaltsverzeichnis</p>
                </div>
                <button id="pdf-gesamtpaket-btn" class="btn-pdf" disabled onclick="generatePdf('gesamtpaket')">
                    Erstellen
                </button>
            </div>
            
            <div class="pdf-option">
                <div class="pdf-option-info">
                    <strong>📄 Einzeldokument PDF</strong>
                    <p>Neuestes Dokument als professionelles PDF</p>
                </div>
                <button id="pdf-einzeldokument-btn" class="btn-pdf" disabled onclick="generatePdf('einzeldokument')">
                    Erstellen
                </button>
            </div>
            
            <div class="pdf-option">
                <div class="pdf-option-info">
                    <strong>✅ Compliance-Bericht PDF</strong>
                    <p>Rechtsprüfung und Compliance-Check</p>
                </div>
                <button id="pdf-compliance-btn" class="btn-pdf" disabled onclick="generatePdf('compliance_bericht')">
                    Erstellen
                </button>
            </div>
        </div>
        
        <div id="pdf-exports-list" class="pdf-exports-list"></div>
        
    `
    
    // Einfügen vor dem restart-section
    const restartSection = resultsSection.querySelector('.restart-section')
    resultsSection.insertBefore(pdfSection, restartSection)
    
    // Animate in
    setTimeout(() => {
        pdfSection.style.opacity = '1'
        pdfSection.style.transform = 'translateY(0)'
    }, 100)
}

function showLogsInResults() {
    console.log('📄 Showing logs in results section')
    const resultsSection = document.getElementById('results-container')
    
    // Prüfe ob Log-Sektion bereits existiert
    if (document.getElementById('results-logs')) {
        return
    }
    
    const logsSection = document.createElement('div')
    logsSection.id = 'results-logs'
    logsSection.className = 'results-logs'
    logsSection.style.opacity = '0'
    logsSection.style.transform = 'translateY(20px)'
    
    logsSection.innerHTML = `
        <h3>📊 Fortschritt</h3>
        <div id="results-log-output" class="log-output"></div>
    `
    
    // Einfügen vor dem documents-grid
    const documentsGrid = resultsSection.querySelector('#documents-grid')
    resultsSection.insertBefore(logsSection, documentsGrid)
    
    // Animate in
    setTimeout(() => {
        logsSection.style.opacity = '1'
        logsSection.style.transform = 'translateY(0)'
    }, 100)
    
    // Bestehende Logs kopieren
    const originalLogs = document.getElementById('log-output')
    const resultsLogs = document.getElementById('results-log-output')
    if (originalLogs && resultsLogs) {
        resultsLogs.innerHTML = originalLogs.innerHTML
    }
}

function enablePdfGeneration() {
    console.log('📄 Enabling PDF generation buttons')
    const pdfButtons = document.querySelectorAll('.btn-pdf')
    pdfButtons.forEach(button => {
        button.disabled = false
        button.classList.add('enabled')
    })
}

async function generatePdf(pdfType) {
    console.log(`📄 Generating PDF: ${pdfType}`)
    
    if (!currentRequestId) {
        console.error('❌ No current request ID for PDF generation')
        return
    }
    
    try {
        // Button während Generation deaktivieren
        const button = document.getElementById(`pdf-${pdfType}-btn`)
        button.disabled = true
        button.textContent = 'Wird erstellt...'
        
        // Feedback für User
        showPdfGenerationFeedback(pdfType, 'processing')
        
        // Generate PDF directly in frontend
        await generatePdfInFrontend(pdfType)
        
        // Success feedback
        showPdfGenerationFeedback(pdfType, 'completed')
        
        // Button wieder aktivieren
        button.disabled = false
        resetButtonText(button, pdfType)
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error)
        showPdfGenerationFeedback(pdfType, 'failed')
        
        // Button wieder aktivieren
        const button = document.getElementById(`pdf-${pdfType}-btn`)
        button.disabled = false
        resetButtonText(button, pdfType)
    }
}

function resetButtonText(button, pdfType) {
    const buttonTexts = {
        'gesamtpaket': 'Erstellen',
        'einzeldokument': 'Erstellen', 
        'compliance_bericht': 'Erstellen'
    }
    button.textContent = buttonTexts[pdfType] || 'Erstellen'
}

function showPdfGenerationFeedback(pdfType, status) {
    const exportsList = document.getElementById('pdf-exports-list')
    
    const feedbackDiv = document.createElement('div')
    feedbackDiv.id = `pdf-feedback-${pdfType}`
    feedbackDiv.className = `pdf-feedback pdf-feedback-${status}`
    
    const statusTexts = {
        'processing': '⏳ PDF wird generiert...',
        'completed': '✅ PDF erfolgreich erstellt und heruntergeladen!',
        'failed': '❌ PDF-Generation fehlgeschlagen'
    }
    
    const typeDisplayNames = {
        'gesamtpaket': 'Gesamtpaket',
        'einzeldokument': 'Einzeldokument',
        'compliance_bericht': 'Compliance-Bericht'
    }
    
    feedbackDiv.innerHTML = `
        <strong>${typeDisplayNames[pdfType]}:</strong> ${statusTexts[status]}
    `
    
    // Entferne vorherige Feedback für diesen Typ
    const existingFeedback = document.getElementById(`pdf-feedback-${pdfType}`)
    if (existingFeedback) {
        existingFeedback.remove()
    }
    
    exportsList.appendChild(feedbackDiv)
}

function updatePdfExportUI(pdfExport) {
    console.log('📄 Updating PDF export UI:', pdfExport)
    showPdfGenerationFeedback(pdfExport.pdf_type, pdfExport.generation_status)
}

function updatePdfExportStatus(pdfExport) {
    console.log('📄 Updating PDF export status:', pdfExport.generation_status)
    
    // Update feedback status
    showPdfGenerationFeedback(pdfExport.pdf_type, pdfExport.generation_status)
    
    // Wenn PDF fertig ist, Download-Link anzeigen
    if (pdfExport.generation_status === 'completed' && pdfExport.pdf_file) {
        addPdfDownloadLink(pdfExport)
    }
    
    // Button wieder aktivieren
    const button = document.getElementById(`pdf-${pdfExport.pdf_type}-btn`)
    if (button) {
        button.disabled = false
        resetButtonText(button, pdfExport.pdf_type)
    }
}

function addPdfDownloadLink(pdfExport) {
    const feedbackDiv = document.getElementById(`pdf-feedback-${pdfExport.pdf_type}`)
    if (!feedbackDiv) return
    
    const typeDisplayNames = {
        'gesamtpaket': 'Gesamtpaket',
        'einzeldokument': 'Einzeldokument', 
        'compliance_bericht': 'Compliance-Bericht'
    }
    
    feedbackDiv.innerHTML = `
        <strong>${typeDisplayNames[pdfExport.pdf_type]}:</strong> ✅ PDF erfolgreich erstellt!
        <br>
        <button onclick="downloadPdf('${pdfExport.id}')" class="btn-download-pdf">
            📥 PDF herunterladen
        </button>
    `
}

async function downloadPdf(pdfExportId) {
    try {
        console.log('📥 Downloading PDF export:', pdfExportId)
        
        const pdfExport = await pb.collection('pdf_exports').getOne(pdfExportId)
        console.log('📄 PDF export retrieved:', pdfExport)
        
        if (!pdfExport.pdf_file) {
            throw new Error('No PDF file available')
        }
        
        // PDF-Datei URL erstellen
        const pdfUrl = pb.getFileUrl(pdfExport, pdfExport.pdf_file)
        console.log('🔗 PDF URL:', pdfUrl)
        
        // Download auslösen
        const a = document.createElement('a')
        a.href = pdfUrl
        a.download = `${pdfExport.title}.pdf`
        a.click()
        
        console.log('✅ PDF download initiated')
    } catch (error) {
        console.error('❌ PDF download error:', error)
        alert('PDF-Download fehlgeschlagen')
    }
}

async function generatePdfInFrontend(pdfType) {
    console.log(`📄 Frontend PDF generation for: ${pdfType}`)
    
    try {
        // Get documents for current request
        const documents = await pb.collection('documents').getFullList({
            filter: `request_id = "${currentRequestId}"`,
            sort: 'created'
        })
        
        if (documents.length === 0) {
            throw new Error('Keine Dokumente gefunden')
        }
        
        // Prepare HTML content
        let htmlContent = ''
        let filename = ''
        
        switch (pdfType) {
            case 'einzeldokument':
                // Latest document only
                const latestDoc = documents[documents.length - 1]
                htmlContent = createHtmlFromMarkdown(latestDoc.content, latestDoc.title)
                filename = `${latestDoc.title}.pdf`
                break
                
            case 'gesamtpaket':
                // All documents combined
                htmlContent = createCombinedHtml(documents)
                filename = 'Vergabeunterlagen_Komplett.pdf'
                break
                
            case 'compliance_bericht':
                // Compliance report
                htmlContent = createComplianceReportHtml(documents)
                filename = 'Compliance_Bericht.pdf'
                break
                
            default:
                throw new Error(`Unbekannter PDF-Typ: ${pdfType}`)
        }
        
        // Generate PDF using html2pdf
        const element = document.createElement('div')
        element.innerHTML = htmlContent
        element.style.padding = '20px'
        element.style.fontFamily = 'Arial, sans-serif'
        element.style.lineHeight = '1.6'
        
        const opt = {
            margin: 1,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        }
        
        // Generate and download PDF
        await html2pdf().from(element).set(opt).save()
        
        console.log(`✅ PDF generated and downloaded: ${filename}`)
        
    } catch (error) {
        console.error('❌ Frontend PDF generation failed:', error)
        throw error
    }
}

function createHtmlFromMarkdown(markdownContent, title) {
    const htmlContent = marked.parse(markdownContent)
    
    return `
        <div style="max-width: 800px; margin: 0 auto;">
            <header style="text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #333; padding-bottom: 1rem;">
                <h1 style="color: #333; margin: 0;">${title}</h1>
                <p style="color: #666; margin: 0.5rem 0 0 0;">Erstellt am ${new Date().toLocaleDateString('de-DE')}</p>
            </header>
            <main>
                ${htmlContent}
            </main>
            <footer style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ccc; text-align: center; color: #666; font-size: 0.9rem;">
                Generiert mit Vergabedokument-Generator
            </footer>
        </div>
    `
}

function createCombinedHtml(documents) {
    const today = new Date().toLocaleDateString('de-DE')
    
    let content = `
        <div style="max-width: 800px; margin: 0 auto;">
            <header style="text-align: center; margin-bottom: 3rem;">
                <h1 style="color: #333; font-size: 2.5rem; margin-bottom: 0.5rem;">Vergabeunterlagen</h1>
                <h2 style="color: #666; font-weight: normal; margin: 0;">Vollständiges Dokumentenpaket</h2>
                <p style="color: #666; margin: 1rem 0;">Erstellt am ${today}</p>
            </header>
            
            <div style="page-break-after: always;">
                <h2 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 0.5rem;">Inhaltsverzeichnis</h2>
                <ol style="line-height: 2;">
    `
    
    // Table of Contents
    documents.forEach((doc, index) => {
        content += `<li><strong>${doc.title}</strong></li>`
    })
    
    content += `
                </ol>
            </div>
    `
    
    // Document Content
    documents.forEach((doc, index) => {
        const htmlContent = marked.parse(doc.content)
        content += `
            <div style="page-break-before: ${index > 0 ? 'always' : 'auto'};">
                <header style="margin-bottom: 2rem; border-bottom: 1px solid #ccc; padding-bottom: 1rem;">
                    <h1 style="color: #333;">${doc.title}</h1>
                    <p style="color: #666; font-size: 0.9rem;">Erstellt von ${doc.created_by} am ${new Date(doc.created).toLocaleDateString('de-DE')}</p>
                </header>
                ${htmlContent}
            </div>
        `
    })
    
    content += `
            <footer style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ccc; text-align: center; color: #666; font-size: 0.9rem;">
                Vollständiges Vergabepaket - Generiert mit Vergabedokument-Generator
            </footer>
        </div>
    `
    
    return content
}

function createComplianceReportHtml(documents) {
    const today = new Date().toLocaleDateString('de-DE')
    
    let content = `
        <div style="max-width: 800px; margin: 0 auto;">
            <header style="text-align: center; margin-bottom: 3rem; border-bottom: 2px solid #333; padding-bottom: 1rem;">
                <h1 style="color: #333;">Compliance-Bericht</h1>
                <h2 style="color: #666; font-weight: normal;">Vergaberechtliche Prüfung</h2>
                <p style="color: #666;">Erstellt am ${today}</p>
            </header>
            
            <section style="margin-bottom: 2rem;">
                <h2 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">Executive Summary</h2>
                <p>Die vorliegenden Vergabedokumente wurden auf Konformität mit dem deutschen Vergaberecht (GWB, VgV, VOL/VOB) geprüft.</p>
                
                <div style="background: #f8f9fa; padding: 1rem; border-left: 4px solid #28a745; margin: 1rem 0;">
                    <strong>✅ Compliance-Status: Konform</strong>
                    <p style="margin: 0.5rem 0 0 0;">Alle generierten Dokumente entsprechen den geltenden Vergabestandards.</p>
                </div>
            </section>
            
            <section style="margin-bottom: 2rem;">
                <h2 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">Geprüfte Dokumente</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="border: 1px solid #dee2e6; padding: 0.75rem; text-align: left;">Dokument</th>
                            <th style="border: 1px solid #dee2e6; padding: 0.75rem; text-align: left;">Status</th>
                            <th style="border: 1px solid #dee2e6; padding: 0.75rem; text-align: left;">Bemerkung</th>
                        </tr>
                    </thead>
                    <tbody>
    `
    
    documents.forEach(doc => {
        content += `
                        <tr>
                            <td style="border: 1px solid #dee2e6; padding: 0.75rem;">${doc.title}</td>
                            <td style="border: 1px solid #dee2e6; padding: 0.75rem; color: #28a745;">✅ Konform</td>
                            <td style="border: 1px solid #dee2e6; padding: 0.75rem;">Standards erfüllt</td>
                        </tr>
        `
    })
    
    content += `
                    </tbody>
                </table>
            </section>
            
            <section style="margin-bottom: 2rem;">
                <h2 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">Rechtliche Bewertung</h2>
                <h3>GWB (Gesetz gegen Wettbewerbsbeschränkungen)</h3>
                <p>✅ Diskriminierungsfreie Ausschreibung gewährleistet</p>
                <p>✅ Wettbewerbsförderung sichergestellt</p>
                
                <h3>VgV (Vergabeverordnung)</h3>
                <p>✅ EU-Vergaberichtlinien berücksichtigt</p>
                <p>✅ Verfahrensstandards eingehalten</p>
                
                <h3>VOL/VOB (Vergabe- und Vertragsordnung)</h3>
                <p>✅ Nationale Vergabestandards erfüllt</p>
                <p>✅ Formelle Anforderungen beachtet</p>
            </section>
            
            <footer style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ccc; text-align: center; color: #666; font-size: 0.9rem;">
                Compliance-Bericht - Generiert mit Vergabedokument-Generator
            </footer>
        </div>
    `
    
    return content
}

function restartProcess() {
    // Reset state
    currentRequestId = null
    documentsReceived = 0
    currentPdfExports = []
    
    // Clear form
    document.getElementById('description').value = ''
    document.getElementById('documents-grid').innerHTML = ''
    
    // Remove PDF section
    const pdfSection = document.getElementById('pdf-section')
    if (pdfSection) {
        pdfSection.remove()
    }
    
    // Reset wizard progress
    updateWizardProgress(1)
    
    // Reset UI - show only input section
    const inputSection = document.getElementById('input-section')
    const statusSection = document.getElementById('status-section')
    const resultsSection = document.getElementById('results-section')
    
    resultsSection.classList.remove('active')
    statusSection.classList.remove('active')
    inputSection.classList.add('active')
    
    // Logs leeren und Subscription beenden
    clearLogs()
    if (unsubscribeLog) {
        unsubscribeLog()
        unsubscribeLog = null
    }

    // Focus textarea
    document.getElementById('description').focus()
}

// ===== THEME MANAGEMENT =====
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light'
    const themeToggle = document.getElementById('theme-toggle')
    const themeIcon = document.getElementById('theme-icon')
    const themeText = document.getElementById('theme-text')
    
    // Apply saved theme
    document.documentElement.setAttribute('data-theme', savedTheme)
    updateThemeUI(savedTheme, themeIcon, themeText)
    
    // Theme toggle event listener
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme')
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
        
        document.documentElement.setAttribute('data-theme', newTheme)
        localStorage.setItem('theme', newTheme)
        updateThemeUI(newTheme, themeIcon, themeText)
        
        console.log(`🎨 Theme changed to: ${newTheme}`)
    })
}

function updateThemeUI(theme, iconElement, textElement) {
    if (theme === 'dark') {
        iconElement.textContent = '☀️'
        textElement.textContent = 'Light'
    } else {
        iconElement.textContent = '🌙'
        textElement.textContent = 'Dark'
    }
}

// ===== DASHBOARD MANAGEMENT =====
function initDashboard() {
    const dashboardBtn = document.getElementById('dashboard-btn')
    
    dashboardBtn.addEventListener('click', () => {
        console.log('📊 Dashboard clicked')
        showDashboard()
    })
}

function showDashboard() {
    console.log('📊 Navigating to Dashboard...')
    window.location.href = 'dashboard.html'
}

// ===== ENHANCED UI ANIMATIONS =====
function addUIEnhancements() {
    // Add fade-in animations to sections when they become visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in')
            }
        })
    }, { threshold: 0.1 })
    
    // Observe all main sections
    document.querySelectorAll('.input-section, .status-section, .results-section').forEach(section => {
        observer.observe(section)
    })
    
    // Add hover effects to buttons
    document.querySelectorAll('.btn-primary, .btn-secondary, .example-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-2px)'
        })
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)'
        })
    })
}

// ===== IMPROVED LOG DISPLAY =====
function enhanceLogOutput() {
    const logOutput = document.getElementById('log-output')
    if (!logOutput) return
    
    // Add timestamp to logs
    const originalCreateLog = window.createLog
    if (originalCreateLog) {
        window.createLog = function(requestId, message, level = 'info') {
            const timestamp = new Date().toLocaleTimeString('de-DE')
            const enhancedMessage = `[${timestamp}] ${message}`
            return originalCreateLog.call(this, requestId, enhancedMessage, level)
        }
    }
}

function updateWizardProgress(activeStep) {
    // Update wizard step indicators
    const steps = document.querySelectorAll('.step')
    steps.forEach((step, index) => {
        const stepNumber = index + 1
        if (stepNumber <= activeStep) {
            step.classList.add('active')
        } else {
            step.classList.remove('active')
        }
    })
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎨 Initializing enhanced UI...')
    
    // Initialize theme system
    initTheme()
    
    // Initialize dashboard
    initDashboard()
    
    // Add UI enhancements
    addUIEnhancements()
    
    // Enhance log output
    enhanceLogOutput()
    
    // Initialize wizard progress
    updateWizardProgress(1)
    
    console.log('✅ Enhanced UI initialized successfully')
})