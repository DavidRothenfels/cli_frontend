/**
 * Single-Thread UI/UX - Minimalistischer Dokumentengenerator
 * Eine fokussierte, geführte Erfahrung
 */

const pb = new PocketBase(window.location.origin)
let currentRequestId = null
let documentsReceived = 0

// Init
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners()
    setupDocumentSubscription()
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
    const formData = new FormData(e.target)
    const description = formData.get('description').trim()
    
    if (!description) return

    try {
        // 1. UI Transition: Input -> Status
        transitionToStatus()

        // 2. Extrahiere intelligente Informationen aus der Beschreibung
        const { budget, deadline } = extractInfoFromDescription(description)

        // 3. User Need erstellen
        const userNeed = await pb.collection('user_needs').create({
            description: description,
            budget: budget,
            deadline: deadline
        })

        // 4. Generation Request erstellen -> löst Gemini CLI aus
        const request = await pb.collection('generation_requests').create({
            user_need_id: userNeed.id,
            status: 'pending'
        })

        currentRequestId = request.id
        documentsReceived = 0

    } catch (error) {
        console.error('Fehler:', error)
        showError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
    }
}

function transitionToStatus() {
    const inputContainer = document.getElementById('input-container')
    const statusContainer = document.getElementById('status-container')
    
    // Smooth transition
    inputContainer.style.opacity = '0'
    inputContainer.style.transform = 'translateY(-20px)'
    
    setTimeout(() => {
        inputContainer.style.display = 'none'
        statusContainer.style.display = 'block'
        statusContainer.style.opacity = '0'
        statusContainer.style.transform = 'translateY(20px)'
        
        // Animate in
        setTimeout(() => {
            statusContainer.style.opacity = '1'
            statusContainer.style.transform = 'translateY(0)'
        }, 50)
    }, 300)
}

function transitionToResults() {
    const statusContainer = document.getElementById('status-container')
    const resultsContainer = document.getElementById('results-container')
    
    // Fade out status
    statusContainer.style.opacity = '0'
    statusContainer.style.transform = 'translateY(-20px)'
    
    setTimeout(() => {
        statusContainer.style.display = 'none'
        resultsContainer.style.display = 'block'
        resultsContainer.style.opacity = '0'
        resultsContainer.style.transform = 'translateY(20px)'
        
        // Animate in results
        setTimeout(() => {
            resultsContainer.style.opacity = '1'
            resultsContainer.style.transform = 'translateY(0)'
        }, 50)
    }, 300)
}

function setupDocumentSubscription() {
    // Realtime: Dokumente empfangen
    pb.collection('documents').subscribe('*', (e) => {
        if (e.action === 'create' && e.record.request_id === currentRequestId) {
            addDocumentToUI(e.record)
        }
    })
}

function addDocumentToUI(document) {
    documentsReceived++
    
    // Bei erstem Dokument: Transition zu Results
    if (documentsReceived === 1) {
        transitionToResults()
    }

    const grid = document.getElementById('documents-grid')
    
    const card = document.createElement('div')
    card.className = 'document-card'
    card.style.opacity = '0'
    card.style.transform = 'translateY(20px)'
    
    card.innerHTML = `
        <div class="document-icon">${getDocumentIcon(document.type)}</div>
        <h3>${document.title}</h3>
        <p class="document-type">${getDocumentTypeDisplayName(document.type)}</p>
        <button onclick="downloadDocument('${document.id}', '${document.title}')" class="download-btn">
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
        const response = await fetch(`/api/download-document/${documentId}`)
        if (!response.ok) throw new Error('Download failed')
        
        const content = await response.text()
        const blob = new Blob([content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `${title}.md`
        a.click()
        
        URL.revokeObjectURL(url)
    } catch (error) {
        console.error('Download error:', error)
        showError('Download fehlgeschlagen')
    }
}

function extractInfoFromDescription(description) {
    let budget = 0
    let deadline = null
    
    // Extrahiere Budget (verschiedene Formate)
    const budgetRegex = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:€|EUR|Euro)/i
    const budgetMatch = description.match(budgetRegex)
    if (budgetMatch) {
        budget = parseFloat(budgetMatch[1].replace(/[.,]/g, '').replace(/(\d{2})$/, '.$1')) || 0
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
    try {
        const examples = await pb.collection('example_prompts').getFullList({ sort: 'sort_order' })
        const container = document.getElementById('example-prompts')
        const label = container.querySelector('.example-label')
        
        examples.forEach(ex => {
            const button = document.createElement('button')
            button.type = 'button'
            button.className = 'example-btn'
            button.textContent = ex.title
            button.dataset.prompt = ex.prompt_text
            container.appendChild(button)
        })
        
        // Zeige Container nur an, wenn Beispiele vorhanden sind
        if (examples.length === 0) {
            container.style.display = 'none'
        }
    } catch (error) {
        console.error("Fehler beim Laden der Beispiele:", error)
        console.error("PocketBase URL:", pb.baseUrl)
        
        // Container ausblenden, wenn keine Beispiele geladen werden können
        const container = document.getElementById('example-prompts')
        if (container) {
            container.style.display = 'none'
        }
        
        // Zeige eine Warnung im Browser-Console für Debugging
        console.warn("Beispiele konnten nicht geladen werden. Überprüfen Sie die Serververbindung.")
    }
}

function restartProcess() {
    // Reset state
    currentRequestId = null
    documentsReceived = 0
    
    // Clear form
    document.getElementById('description').value = ''
    document.getElementById('documents-grid').innerHTML = ''
    
    // Reset UI
    const inputContainer = document.getElementById('input-container')
    const statusContainer = document.getElementById('status-container')
    const resultsContainer = document.getElementById('results-container')
    
    resultsContainer.style.display = 'none'
    statusContainer.style.display = 'none'
    inputContainer.style.display = 'block'
    inputContainer.style.opacity = '1'
    inputContainer.style.transform = 'translateY(0)'
    
    // Focus textarea
    document.getElementById('description').focus()
}