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
    pb = new PocketBase('http://localhost:8090')
    
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

// ===== EVENT LISTENERS =====
function initEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-input')
    const searchBtn = document.getElementById('search-btn')
    
    searchInput.addEventListener('input', debounce(handleSearch, 300))
    searchBtn.addEventListener('click', handleSearch)
    
    // Filter functionality
    const filterPeriod = document.getElementById('filter-period')
    const filterCreator = document.getElementById('filter-creator')
    
    filterPeriod.addEventListener('change', handleFilter)
    filterCreator.addEventListener('change', handleFilter)
    
    // View toggle
    const viewBtns = document.querySelectorAll('.view-btn')
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view
            setView(view)
        })
    })
    
    // Modal functionality
    const modalClose = document.getElementById('modal-close')
    const modal = document.getElementById('project-modal')
    
    modalClose.addEventListener('click', () => closeModal())
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal()
    })
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal()
        if (e.key === '/' && !e.target.matches('input, textarea')) {
            e.preventDefault()
            searchInput.focus()
        }
    })
}

// ===== DATA LOADING =====
async function loadDashboardData() {
    try {
        console.log('📊 Loading dashboard data...')
        
        // Load all projects (grouped by request_id)
        const documents = await pb.collection('documents').getFullList({
            sort: '-created'
        })
        
        // Group documents by request_id to create projects
        const projectsMap = new Map()
        
        documents.forEach(doc => {
            const requestId = doc.request_id
            if (!projectsMap.has(requestId)) {
                projectsMap.set(requestId, {
                    id: requestId,
                    created: doc.created,
                    updated: doc.updated,
                    description: extractProjectDescription(doc),
                    documents: [],
                    creator: doc.created_by || 'Unknown'
                })
            }
            
            projectsMap.get(requestId).documents.push(doc)
        })
        
        allProjects = Array.from(projectsMap.values())
        filteredProjects = [...allProjects]
        
        // Update statistics
        updateStatistics()
        
        // Render projects
        renderProjects()
        
        console.log(`📊 Loaded ${allProjects.length} projects with ${documents.length} documents`)
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error)
        showError('Fehler beim Laden der Dashboard-Daten')
    }
}

// ===== STATISTICS =====
function updateStatistics() {
    const totalProjects = allProjects.length
    const totalDocuments = allProjects.reduce((sum, project) => sum + project.documents.length, 0)
    const openCodeDocuments = allProjects.reduce((sum, project) => {
        return sum + project.documents.filter(doc => doc.created_by === 'OpenCode AI').length
    }, 0)
    
    const thisMonth = allProjects.filter(project => {
        const projectDate = new Date(project.created)
        const now = new Date()
        return projectDate.getMonth() === now.getMonth() && 
               projectDate.getFullYear() === now.getFullYear()
    }).length
    
    // Update UI
    document.getElementById('total-projects').textContent = totalProjects
    document.getElementById('total-documents').textContent = totalDocuments
    document.getElementById('opencode-documents').textContent = openCodeDocuments
    document.getElementById('this-month').textContent = thisMonth
    
    // Animate numbers
    animateNumbers()
}

// ===== PROJECT RENDERING =====
function renderProjects() {
    const container = document.getElementById('projects-container')
    const noProjects = document.getElementById('no-projects')
    
    if (filteredProjects.length === 0) {
        container.style.display = 'none'
        noProjects.style.display = 'block'
        return
    }
    
    container.style.display = currentView === 'grid' ? 'grid' : 'flex'
    container.className = currentView === 'grid' ? 'projects-grid' : 'projects-list'
    noProjects.style.display = 'none'
    
    container.innerHTML = filteredProjects.map(project => createProjectCard(project)).join('')
    
    // Add click listeners to project cards
    container.querySelectorAll('.project-card').forEach((card, index) => {
        card.addEventListener('click', () => openProjectModal(filteredProjects[index]))
    })
}

function createProjectCard(project) {
    const date = new Date(project.created).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
    
    const documentBadges = project.documents.map(doc => {
        const type = doc.type || 'unknown'
        const typeNames = {
            'leistung': 'Leistung',
            'eignung': 'Eignung',
            'zuschlag': 'Zuschlag'
        }
        return `<span class="document-badge ${type}">${typeNames[type] || type}</span>`
    }).join('')
    
    const description = project.description || 'Keine Beschreibung verfügbar'
    const truncatedDescription = description.length > 150 ? 
        description.substring(0, 150) + '...' : description
    
    return `
        <div class="project-card ${currentView === 'list' ? 'list-view' : ''}">
            <div class="project-header">
                <h3 class="project-title">Projekt vom ${date}</h3>
                <span class="project-date">${date}</span>
            </div>
            <p class="project-description">${truncatedDescription}</p>
            <div class="project-documents">
                ${documentBadges}
            </div>
            <div class="project-footer">
                <span class="project-creator">${project.creator}</span>
                <div class="project-actions">
                    <button class="action-btn" onclick="event.stopPropagation(); downloadProjectDocuments('${project.id}')">
                        💾 Download
                    </button>
                    <button class="action-btn" onclick="event.stopPropagation(); deleteProject('${project.id}')">
                        🗑️ Löschen
                    </button>
                </div>
            </div>
        </div>
    `
}

// ===== SEARCH AND FILTER =====
function handleSearch() {
    const query = document.getElementById('search-input').value.toLowerCase()
    
    filteredProjects = allProjects.filter(project => {
        const description = (project.description || '').toLowerCase()
        const creator = (project.creator || '').toLowerCase()
        const documentTypes = project.documents.map(doc => doc.type || '').join(' ').toLowerCase()
        
        return description.includes(query) || 
               creator.includes(query) || 
               documentTypes.includes(query)
    })
    
    applyFilters()
    renderProjects()
}

function handleFilter() {
    applyFilters()
    renderProjects()
}

function applyFilters() {
    const period = document.getElementById('filter-period').value
    const creator = document.getElementById('filter-creator').value
    
    filteredProjects = filteredProjects.filter(project => {
        // Period filter
        if (period !== 'all') {
            const projectDate = new Date(project.created)
            const now = new Date()
            
            switch (period) {
                case 'today':
                    if (projectDate.toDateString() !== now.toDateString()) return false
                    break
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                    if (projectDate < weekAgo) return false
                    break
                case 'month':
                    if (projectDate.getMonth() !== now.getMonth() || 
                        projectDate.getFullYear() !== now.getFullYear()) return false
                    break
                case 'year':
                    if (projectDate.getFullYear() !== now.getFullYear()) return false
                    break
            }
        }
        
        // Creator filter
        if (creator !== 'all') {
            const hasCreatorDocuments = project.documents.some(doc => {
                if (creator === 'opencode') return doc.created_by === 'OpenCode AI'
                if (creator === 'gemini') return doc.created_by === 'Gemini CLI'
                return false
            })
            if (!hasCreatorDocuments) return false
        }
        
        return true
    })
}

// ===== VIEW MANAGEMENT =====
function setView(view) {
    currentView = view
    
    // Update view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view)
    })
    
    renderProjects()
}

// ===== MODAL MANAGEMENT =====
function openProjectModal(project) {
    const modal = document.getElementById('project-modal')
    const modalTitle = document.getElementById('modal-title')
    const modalBody = document.getElementById('modal-body')
    
    const date = new Date(project.created).toLocaleString('de-DE')
    modalTitle.textContent = `Projekt vom ${date}`
    
    const documentsHtml = project.documents.map(doc => {
        const docDate = new Date(doc.created).toLocaleString('de-DE')
        const typeNames = {
            'leistung': 'Leistungsbeschreibung',
            'eignung': 'Eignungskriterien',
            'zuschlag': 'Zuschlagskriterien'
        }
        
        return `
            <div class="document-detail">
                <h4>${doc.title}</h4>
                <p><strong>Typ:</strong> ${typeNames[doc.type] || doc.type}</p>
                <p><strong>Erstellt:</strong> ${docDate}</p>
                <p><strong>Erstellt von:</strong> ${doc.created_by}</p>
                <p><strong>Inhalt:</strong> ${doc.content ? doc.content.substring(0, 200) + '...' : 'Kein Inhalt'}</p>
                <button class="btn-secondary" onclick="downloadSingleDocument('${doc.id}', '${doc.title}')">
                    Download ${doc.title}
                </button>
            </div>
        `
    }).join('')
    
    modalBody.innerHTML = `
        <div class="project-details">
            <h3>Projektbeschreibung</h3>
            <p>${project.description || 'Keine Beschreibung verfügbar'}</p>
            
            <h3>Dokumente (${project.documents.length})</h3>
            ${documentsHtml}
        </div>
    `
    
    modal.style.display = 'flex'
    document.body.style.overflow = 'hidden'
}

function closeModal() {
    const modal = document.getElementById('project-modal')
    modal.style.display = 'none'
    document.body.style.overflow = 'auto'
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
    console.error(message)
    // You could implement a toast notification here
    alert(message)
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