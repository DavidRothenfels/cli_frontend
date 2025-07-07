// ===== DASHBOARD FUNCTIONALITY =====

// Global variables
let pb = null
let allProjects = []
let filteredProjects = []
let currentView = 'grid'

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Initializing Dashboard...')
    
    // Initialize PocketBase
    pb = new PocketBase(window.location.origin)
    
    // Initialize theme system
    initTheme()
    
    // Initialize event listeners
    initEventListeners()
    
    // Load dashboard data
    await loadDashboardData()
    
    console.log('✅ Dashboard initialized successfully')
})

// ===== THEME MANAGEMENT =====
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light'
    const themeToggle = document.getElementById('theme-toggle')
    
    // Apply saved theme
    document.documentElement.setAttribute('data-theme', savedTheme)
    
    // Theme toggle event listener
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme')
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
            
            document.documentElement.setAttribute('data-theme', newTheme)
            localStorage.setItem('theme', newTheme)
            
            console.log(`🎨 Theme changed to: ${newTheme}`)
        })
    }
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
    // New project button
    const newProjectBtn = document.getElementById('new-project-btn')
    const modalClose = document.getElementById('modal-close')
    const modalCancel = document.getElementById('modal-cancel-btn')
    const modalCreate = document.getElementById('modal-create-btn')
    const modal = document.getElementById('create-project-modal')
    
    if (newProjectBtn) {
        newProjectBtn.addEventListener('click', () => {
            modal.classList.add('active')
        })
    }
    
    if (modalClose) {
        modalClose.addEventListener('click', () => closeModal())
    }
    
    if (modalCancel) {
        modalCancel.addEventListener('click', () => closeModal())
    }
    
    if (modalCreate) {
        modalCreate.addEventListener('click', createNewProject)
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal()
        })
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal()
    })
}

// ===== DATA LOADING =====
async function loadDashboardData() {
    try {
        console.log('📊 Loading dashboard data...')
        console.log('🔍 PocketBase instance:', pb)
        console.log('🔍 Auth store valid:', pb.authStore.isValid)
        
        // Load projects from new projects collection
        console.log('📡 Fetching projects...')
        const projects = await pb.collection('projects').getFullList({
            sort: '-created'
        })
        
        console.log(`📋 Found ${projects.length} projects:`, projects)
        
        // Disable auto-cancellation for this batch operation
        const oldAutoCancellation = pb.enableAutoCancellation
        pb.enableAutoCancellation = false
        
        // Load documents for each project sequentially to avoid cancellation issues
        const projectsWithDocs = []
        for (const project of projects) {
            try {
                // Small delay to prevent overwhelming the API
                if (projectsWithDocs.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 100))
                }
                
                const documents = await pb.collection('documents').getFullList({
                    filter: `request_id="${project.request_id}"`,
                    sort: '-created'
                })
                
                projectsWithDocs.push({
                    id: project.request_id,
                    name: project.name,
                    description: project.description || extractProjectDescription(documents[0]),
                    created: project.created,
                    updated: project.updated,
                    documents: documents,
                    creator: project.user_id
                })
                
            } catch (error) {
                console.error('Error loading documents for project:', project.id, error)
                projectsWithDocs.push({
                    id: project.request_id,
                    name: project.name,
                    description: project.description || 'Keine Beschreibung verfügbar',
                    created: project.created,
                    updated: project.updated,
                    documents: [],
                    creator: project.user_id
                })
            }
        }
        
        // Restore auto-cancellation setting
        pb.enableAutoCancellation = oldAutoCancellation
        
        allProjects = projectsWithDocs
        console.log(`🎯 Loaded ${allProjects.length} projects with documents:`, allProjects)
        
        // Render projects
        renderProjects()
        
        console.log(`✅ Dashboard loaded successfully`)
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error)
        console.error('❌ Error details:', error.message, error.status, error.data)
        showError('Fehler beim Laden der Dashboard-Daten: ' + error.message)
    }
}

// Statistics functionality removed - not needed for simple dashboard

// ===== PROJECT RENDERING =====
function renderProjects() {
    const container = document.getElementById('projects-container')
    const noProjects = document.getElementById('no-projects')
    
    if (allProjects.length === 0) {
        container.style.display = 'none'
        if (noProjects) noProjects.style.display = 'block'
        return
    }
    
    if (noProjects) noProjects.style.display = 'none'
    container.style.display = 'block'
    
    container.innerHTML = allProjects.map(project => createProjectCard(project)).join('')
}

function createProjectCard(project) {
    const date = new Date(project.created).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
    
    const projectName = project.name || `Projekt ${project.id}`
    const description = project.description || 'Keine Beschreibung verfügbar'
    const truncatedDescription = description.length > 100 ? 
        description.substring(0, 100) + '...' : description
    
    return `
        <div class="project-card" onclick="window.location.href='projekt.html?request_id=${project.id}'">
            <div class="project-card-content">
                <div class="project-card-header">
                    <h4 class="project-card-title">${projectName}</h4>
                </div>
                <p class="project-card-description">${truncatedDescription}</p>
                <p class="project-card-info">
                    <span>📅 ${date}</span>
                    <span>📄 ${project.documents.length} Dokument(e)</span>
                </p>
            </div>
            <div class="project-card-actions">
                <button class="btn-icon btn-danger" onclick="event.stopPropagation(); deleteProject('${project.id}')" title="Projekt löschen">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,2h4a2,2 0 0,1 2,2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
        </div>
    `
}


// Search and filter functionality removed for simple dashboard

// ===== MODAL MANAGEMENT =====
function closeModal() {
    const modal = document.getElementById('create-project-modal')
    if (modal) {
        modal.classList.remove('active')
        document.getElementById('projectName').value = ''
    }
}

async function createNewProject() {
    const projectName = document.getElementById('projectName').value.trim()
    if (!projectName) {
        showNotification('Bitte geben Sie einen Projektnamen ein.', 'error')
        return
    }

    try {
        console.log('🚀 Creating new project:', projectName)
        
        // Check authentication
        const user = pb.authStore.model
        if (!user) {
            showNotification('Benutzer nicht authentifiziert.', 'error')
            return
        }
        
        // Generate a unique request ID
        const requestId = 'PROJ-' + Date.now()
        
        // Create project in new projects collection
        const project = await pb.collection('projects').create({
            name: projectName,
            description: 'Automatisch generiertes Vergabeprojekt',
            user_id: user.id,
            request_id: requestId
        })
        
        console.log('✅ Project created:', project.id)
        
        // Create demo documents immediately (until OpenCode is working)
        const documents = [
            {
                request_id: requestId,
                title: 'Leistungsbeschreibung',
                content: `# Leistungsbeschreibung: ${projectName}

## Projektziel und Zweck
Das Projekt "${projectName}" umfasst die professionelle Umsetzung der definierten Anforderungen unter Berücksichtigung aller relevanten Standards und Qualitätskriterien.

## Detaillierter Leistungsumfang
- Vollständige Analyse der Anforderungen
- Konzeption und Planung der Umsetzung
- Professionelle Implementierung
- Qualitätssicherung und Testing
- Dokumentation und Übergabe

## Technische Anforderungen
- Einhaltung aktueller Standards
- Barrierefreiheit nach WCAG 2.1
- Responsive Design und Benutzerfreundlichkeit
- Sicherheit und Datenschutz

## Projektmanagement
- Agile Projektmethodik
- Regelmäßige Abstimmungen
- Transparente Kommunikation
- Risikomanagement`,
                type: 'leistung',
                created_by: 'System Generator'
            },
            {
                request_id: requestId,
                title: 'Eignungskriterien',
                content: `# Eignungskriterien: ${projectName}

## Fachliche Eignung
- Mindestens 3 Jahre Berufserfahrung im relevanten Bereich
- Nachgewiesene Expertise durch Referenzprojekte
- Qualifikation der Schlüsselpersonen

## Technische Eignung
- Moderne Entwicklungstools und -methoden
- Qualitätsmanagementsystem (ISO 9001 oder vergleichbar)
- Technische Infrastruktur und Kapazitäten

## Wirtschaftliche Eignung
- Jahresumsatz der letzten 3 Jahre: mindestens 50.000 €
- Betriebshaftpflichtversicherung (min. 500.000 €)
- Nachweis der Bonität`,
                type: 'eignung',
                created_by: 'System Generator'
            },
            {
                request_id: requestId,
                title: 'Zuschlagskriterien',
                content: `# Zuschlagskriterien: ${projectName}

## Bewertungsmatrix (100%)

### 1. Preis (40%)
- Angemessenheit des Gesamtpreises
- Preis-Leistungs-Verhältnis
- Kostentransparenz

### 2. Qualität (35%)
- Fachliche Kompetenz des Teams
- Methodische Herangehensweise
- Qualitätssicherungsmaßnahmen

### 3. Terminplanung (15%)
- Realistische Zeitplanung
- Einhaltung der Meilensteine
- Flexibilität bei Anpassungen

### 4. Service (10%)
- Support und Betreuung
- Nachbetreuung und Wartung
- Lokale Präsenz`,
                type: 'zuschlag',
                created_by: 'System Generator'
            }
        ]
        
        // Create all documents
        for (const docData of documents) {
            await pb.collection('documents').create(docData)
        }
        
        console.log('✅ Demo documents created for request:', requestId)
        
        // Close modal and show notification
        closeModal()
        showNotification('Projekt erfolgreich erstellt!', 'success')
        
        // Reload dashboard to show new project
        setTimeout(() => {
            window.location.reload()
        }, 1500)
        
    } catch (error) {
        console.error('Fehler beim Erstellen des Projekts:', error)
        showNotification('Fehler beim Erstellen des Projekts: ' + error.message, 'error')
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div')
    notification.className = `notification ${type}`
    notification.textContent = message
    
    document.body.appendChild(notification)
    
    setTimeout(() => {
        notification.remove()
    }, 5000)
}

// ===== UTILITY FUNCTIONS =====
function extractProjectDescription(document) {
    // Try to extract a meaningful description from the first document
    if (!document.content) return 'Keine Beschreibung verfügbar'
    
    // Look for common patterns in content
    const content = document.content
    const lines = content.split('\n').filter(line => line.trim())
    
    // Find first substantial line that's not a heading
    for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.length > 20 && 
            !trimmed.startsWith('#') && 
            !trimmed.startsWith('**') && 
            !trimmed.includes('##')) {
            return trimmed.length > 100 ? trimmed.substring(0, 100) + '...' : trimmed
        }
    }
    
    return 'Vergabedokument erstellt'
}

function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

function animateNumbers() {
    const counters = document.querySelectorAll('.stat-number')
    
    counters.forEach(counter => {
        const target = parseInt(counter.textContent)
        let current = 0
        const increment = target / 20
        
        const updateCounter = () => {
            if (current < target) {
                current += increment
                counter.textContent = Math.floor(current)
                requestAnimationFrame(updateCounter)
            } else {
                counter.textContent = target
            }
        }
        
        updateCounter()
    })
}

function showError(message) {
    console.error('🚨 ERROR:', message)
    showNotification(message, 'error')
}

// ===== DOWNLOAD FUNCTIONS =====
async function downloadSingleDocument(documentId, title) {
    try {
        const doc = await pb.collection('documents').getOne(documentId)
        const blob = new Blob([doc.content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `${title}.md`
        a.click()
        
        URL.revokeObjectURL(url)
        console.log(`📥 Downloaded: ${title}`)
    } catch (error) {
        console.error('Download error:', error)
        showError('Download fehlgeschlagen')
    }
}

async function downloadProjectDocuments(projectId) {
    try {
        const project = allProjects.find(p => p.id === projectId)
        if (!project) return
        
        // Create a zip-like structure with all documents
        const date = new Date(project.created).toISOString().split('T')[0]
        
        for (const doc of project.documents) {
            const blob = new Blob([doc.content], { type: 'text/markdown' })
            const url = URL.createObjectURL(blob)
            
            const a = document.createElement('a')
            a.href = url
            a.download = `${date}_${doc.title}.md`
            a.click()
            
            URL.revokeObjectURL(url)
            
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        console.log(`📥 Downloaded project: ${projectId}`)
    } catch (error) {
        console.error('Download error:', error)
        showError('Download fehlgeschlagen')
    }
}

async function deleteProject(projectId) {
    if (!confirm('Möchten Sie dieses Projekt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        return
    }
    
    try {
        const project = allProjects.find(p => p.id === projectId)
        if (!project) return
        
        // Delete all documents for this project
        for (const doc of project.documents) {
            await pb.collection('documents').delete(doc.id)
        }
        
        // Reload dashboard data
        await loadDashboardData()
        
        console.log(`🗑️ Deleted project: ${projectId}`)
        
    } catch (error) {
        console.error('Delete error:', error)
        showError('Löschen fehlgeschlagen')
    }
}