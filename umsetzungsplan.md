# Umsetzungsplan: Autonomer Vergabedokument-Generator

## Implementierungsreihenfolge

### 🎯 **Phase 1: Foundation Setup (4 Stunden)**
**Ziel**: Funktionsfähiges Basis-System ohne AI-Integration

#### 1.1 PocketBase Installation & Setup (30 min)
```bash
# Task: Setup PocketBase Environment
mkdir ausschreibung-generator
cd ausschreibung-generator
wget https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_linux_amd64.zip
unzip pocketbase_linux_amd64.zip
chmod +x pocketbase
./pocketbase serve --dev
```

#### 1.2 Database Schema Creation (45 min)
```javascript
// Collections zu erstellen über Admin UI:
// 1. user_needs (Bedarfseingabe)
// 2. documents (Generierte Dokumente)  
// 3. generation_requests (Anfragen)
// 4. document_templates (Vorlagen)
```

#### 1.3 Basic Frontend Structure (90 min)
```html
<!-- pb_public/index.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Vergabedokument Generator</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <div id="needs-input">
            <h2>1. Bedarf beschreiben</h2>
            <form id="needs-form">
                <input type="text" name="title" placeholder="Projekt Titel" required>
                <textarea name="description" placeholder="Beschreibung" required></textarea>
                <input type="number" name="budget" placeholder="Budget (EUR)">
                <input type="date" name="deadline">
                <select name="category">
                    <option value="it">IT-Dienstleistungen</option>
                    <option value="bau">Bauleistungen</option>
                    <option value="beratung">Beratung</option>
                </select>
                <button type="submit">Weiter</button>
            </form>
        </div>
        <div id="document-results" style="display: none;"></div>
    </div>
    <script src="app.js"></script>
</body>
</html>
```

#### 1.4 Manual Document Generation (75 min)
```javascript
// pb_hooks/document_generator.pb.js
routerAdd("POST", "/generate-documents", (e) => {
    const data = e.request.body
    
    // Manuelle Template-basierte Generierung
    const leistungsDoc = generateLeistungsbeschreibung(data)
    const eignungsDoc = generateEignungskriterien(data)
    const zuschlagsDoc = generateZuschlagskriterien(data)
    
    // In Database speichern
    const records = [
        { type: "leistung", content: leistungsDoc },
        { type: "eignung", content: eignungsDoc },
        { type: "zuschlag", content: zuschlagsDoc }
    ]
    
    return e.json(200, { documents: records })
})
```

### 🤖 **Phase 2: AI Integration (6 Stunden)**
**Ziel**: Gemini CLI Integration mit robustem Monitoring

#### 2.1 Gemini CLI Setup (45 min)
```bash
# Task: Install and configure Gemini CLI
npm install -g @google/gemini-cli
gemini auth
export GEMINI_API_KEY="your-api-key"
```

#### 2.2 Process Management System (90 min)
```javascript
// pb_hooks/gemini_manager.pb.js
class GeminiManager {
    constructor() {
        this.activeProcesses = new Map()
        this.processTimeout = 120000 // 2 Minuten
        this.maxRetries = 3
    }

    async executeWithMonitoring(requestId, prompt) {
        const processId = `gemini_${requestId}_${Date.now()}`
        
        try {
            // Spawn Gemini Process
            const process = this.spawnGeminiProcess(prompt)
            this.activeProcesses.set(processId, process)
            
            // Setup monitoring
            this.setupProcessMonitoring(processId, process)
            
            // Handle output
            return await this.handleProcessOutput(processId, process)
        } catch (error) {
            this.handleProcessError(processId, error)
        }
    }
}
```

#### 2.3 Template System für AI Prompts (90 min)
```javascript
// pb_hooks/prompt_templates.pb.js
class PromptTemplateManager {
    buildSystemPrompt(userData) {
        return `
Du bist ein Experte für deutsche Vergabeverfahren.

AUFTRAG: Erstelle professionelle Vergabedokumente

KONTEXT:
- Titel: ${userData.title}
- Beschreibung: ${userData.description}
- Budget: ${userData.budget} EUR
- Kategorie: ${userData.category}

ANFORDERUNGEN:
1. Rechtskonforme Leistungsbeschreibung
2. Objektive Eignungskriterien
3. Transparente Zuschlagskriterien

FORMAT: Markdown mit strukturierten Abschnitten
        `
    }
}
```

#### 2.4 Real-time Progress Tracking (105 min)
```javascript
// pb_public/progress_tracker.js
class ProgressTracker {
    constructor() {
        this.setupSSEConnection()
    }

    setupSSEConnection() {
        pb.collection('generation_progress').subscribe('*', (e) => {
            this.updateProgressUI(e.record)
        })
    }

    updateProgressUI(progress) {
        document.getElementById('progress-bar').style.width = `${progress.percentage}%`
        document.getElementById('current-step').textContent = progress.current_step
        document.getElementById('gemini-output').textContent = progress.gemini_feedback
    }
}
```

### 📄 **Phase 3: PDF Processing (4 Stunden)**
**Ziel**: Hybrid PDF Processing mit Fallback-Optionen

#### 3.1 PDF.js Basic Integration (60 min)
```javascript
// pb_public/pdf_processor.js
class PDFProcessor {
    constructor() {
        this.pdfjsLib = window['pdfjs-dist/build/pdf']
        this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js'
    }

    async extractTextFromPDF(file) {
        try {
            const arrayBuffer = await file.arrayBuffer()
            const pdf = await this.pdfjsLib.getDocument({
                data: arrayBuffer,
                isEvalSupported: false // Security
            }).promise
            
            let fullText = ""
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i)
                const textContent = await page.getTextContent()
                const pageText = textContent.items.map(item => item.str).join(' ')
                fullText += pageText + '\n'
            }
            
            return fullText.trim()
        } catch (error) {
            throw new Error(`PDF processing failed: ${error.message}`)
        }
    }
}
```

#### 3.2 Document Type Detection (45 min)
```javascript
// pb_public/document_detector.js
class DocumentTypeDetector {
    detectType(filename, text) {
        const patterns = {
            'leistung': /leistungsbeschreibung|leistungsverzeichnis|lv/i,
            'eignung': /eignungsnachweis|eignungskriterien|präqualifikation/i,
            'zuschlag': /zuschlagskriterien|bewertung|wertung/i
        }
        
        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(text) || pattern.test(filename)) {
                return type
            }
        }
        
        return 'unknown'
    }
}
```

#### 3.3 File Upload UI Enhancement (75 min)
```html
<!-- Enhanced Upload UI -->
<div id="upload-container">
    <h2>2. Referenzdokumente hochladen (optional)</h2>
    <div class="upload-area" id="pdf-upload-area">
        <input type="file" id="pdf-files" multiple accept=".pdf">
        <div class="upload-status">
            <div id="upload-progress"></div>
            <div id="processing-status"></div>
        </div>
    </div>
</div>
```

#### 3.4 Error Handling & Fallbacks (60 min)
```javascript
// pb_public/error_handler.js
class PDFErrorHandler {
    async handlePDFError(file, error) {
        const errorTypes = {
            'InvalidPDFException': 'Beschädigte PDF-Datei',
            'PasswordException': 'Passwort-geschützte PDF',
            'SecurityException': 'Sicherheitsfehler',
            'MemoryException': 'Datei zu groß für Browser-Verarbeitung'
        }
        
        const userMessage = errorTypes[error.name] || 'Unbekannter PDF-Fehler'
        
        // Fallback: Server-seitige Verarbeitung anfragen
        if (error.name === 'MemoryException') {
            return await this.requestServerProcessing(file)
        }
        
        throw new Error(userMessage)
    }
}
```

### 🚀 **Phase 4: Production Setup (4 Stunden)**
**Ziel**: Deployment-bereites System mit Monitoring

#### 4.1 Environment Configuration (60 min)
```bash
# Environment Setup
cat > .env << EOF
GEMINI_API_KEY=your_api_key_here
PB_ADMIN_EMAIL=admin@example.com
PB_ADMIN_PASSWORD=secure_password
PB_ENCRYPTION_KEY=32_char_random_key
ENVIRONMENT=production
EOF
```

#### 4.2 Health Monitoring (75 min)
```javascript
// pb_hooks/health_monitor.pb.js
class HealthMonitor {
    constructor() {
        this.checkInterval = 30000 // 30 Sekunden
        this.startMonitoring()
    }

    async checkGeminiHealth() {
        // Teste Gemini CLI Erreichbarkeit
        try {
            const testResult = await this.runGeminiTest()
            return { status: 'healthy', latency: testResult.latency }
        } catch (error) {
            return { status: 'unhealthy', error: error.message }
        }
    }

    async checkDatabaseHealth() {
        // Teste Database Connectivity
        try {
            const count = $app.dao().findRecordsByFilter("user_needs", "", "-created", 1)
            return { status: 'healthy', recordCount: count.length }
        } catch (error) {
            return { status: 'unhealthy', error: error.message }
        }
    }
}
```

#### 4.3 Deployment Configuration (90 min)
```dockerfile
# Dockerfile
FROM alpine:latest

# Install dependencies
RUN apk add --no-cache \
    ca-certificates \
    curl \
    nodejs \
    npm

# Install Gemini CLI
RUN npm install -g @google/gemini-cli

# Copy PocketBase
COPY pocketbase /usr/local/bin/
COPY pb_hooks /app/pb_hooks
COPY pb_public /app/pb_public

WORKDIR /app

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start command
CMD ["pocketbase", "serve", "--http=0.0.0.0:8080"]
```

#### 4.4 Backup & Recovery (45 min)
```bash
# Backup Script
#!/bin/bash
# backup_system.sh

BACKUP_DIR="/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup Database
cp -r pb_data $BACKUP_DIR/

# Backup Generated Documents
cp -r pb_public/generated_documents $BACKUP_DIR/

# Backup Configuration
cp -r pb_hooks $BACKUP_DIR/

echo "Backup completed: $BACKUP_DIR"
```

## 🔧 **Subagent-Aufgaben**

### Subagent 1: PocketBase Setup
**Aufgabe**: Komplettes PocketBase Setup mit Collections
- Collections erstellen
- Berechtigungen konfigurieren
- Basic Hooks implementieren
- Admin UI konfigurieren

### Subagent 2: Frontend Development
**Aufgabe**: Responsive Frontend mit File Upload
- HTML/CSS/JS Implementation
- File Upload Interface
- Progress Tracking UI
- Error Handling

### Subagent 3: AI Integration
**Aufgabe**: Gemini CLI Integration
- Process Management
- Prompt Templates
- Error Handling
- Real-time Updates

### Subagent 4: PDF Processing
**Aufgabe**: Hybrid PDF Processing System
- PDF.js Integration
- Document Type Detection
- Error Handling
- Fallback Mechanisms

## 📊 **Erfolgsmessung**

### MVP Kriterien (Phase 1-2)
- [ ] Bedarfseingabe funktional
- [ ] Manuelle Dokumentgenerierung
- [ ] AI-basierte Verbesserung
- [ ] Basic Error Handling

### Production Kriterien (Phase 3-4)
- [ ] PDF Upload & Processing
- [ ] Real-time Progress Tracking
- [ ] Robust Error Handling
- [ ] Deployment-ready

## 🚨 **Kritische Abhängigkeiten**

1. **Gemini API Access**: Ohne API-Key kein AI-System
2. **PocketBase Stabilität**: Pre-v1.0 Risiken beachten
3. **PDF.js Limitations**: Fallback-Strategien implementieren
4. **Node.js/npm**: Für Gemini CLI erforderlich

## 🎯 **Nächste Schritte**

1. **Setup Phase 1**: PocketBase Installation & Basic Setup
2. **Create Subagents**: Parallel Development Tasks
3. **Implement MVP**: Basis-Funktionalität
4. **Test & Iterate**: Kontinuierliche Verbesserung
5. **Production Deploy**: Finales System

**Geschätzte Gesamtdauer**: 18 Stunden
**Parallelisierungspotential**: 12 Stunden bei 3 Subagents