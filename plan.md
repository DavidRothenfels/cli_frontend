# Umsetzungsplan: Autonomer Vergabedokument-Generator

## Überblick
PocketBase-basierter Generator für deutsche Vergabedokumente mit Gemini CLI Integration, PDF-Kontext-Extraktion, Realtime-Updates und automatischer Dokumentenerstellung.

## Architektur

### Backend: PocketBase + Gemini CLI
- **PocketBase**: Database, Auth, Realtime, Static Files, Native Templates
- **Gemini CLI**: Autonome Dokumentgenerierung mit 1M Token Context, Web Search
- **PDF Processing**: Browser-basierte Text-Extraktion im Frontend
- **Templates**: PocketBase Native Template System für alle Templates
- **JS Hooks**: Workflow-Steuerung und Gemini Integration

### Frontend: Minimales SPA mit PDF Upload
- **Vanilla JS**: Keine Frameworks, direkte PocketBase Integration
- **PDF Processing**: Browser-basierte PDF-Text-Extraktion
- **Realtime**: Live Progress Updates via WebSocket
- **Responsive**: CSS Grid Layout

## Projektstruktur
```
ausschreibung-generator/
├── pocketbase*                    # Executable
├── pb_hooks/                      # Server-side Logic
│   ├── main.pb.js                # Collections & Routes
│   ├── gemini_integration.pb.js  # Gemini CLI Workflow
│   ├── native_template_manager.pb.js # Template Manager
│   └── auth.pb.js                # User Management
│   └── views/                    # ⭐ PocketBase Native Templates
│       ├── layouts/
│       │   ├── base.html         # Base Layout
│       │   └── email.html        # Email Layout
│       ├── documents/            # Document Templates
│       │   ├── leistung.html     # → generates MD
│       │   ├── eignung.html      # → generates MD
│       │   └── zuschlag.html     # → generates MD
│       ├── prompts/              # Prompt Templates
│       │   ├── system/
│       │   │   ├── base.txt
│       │   │   ├── legal.txt
│       │   │   └── functions.txt
│       │   ├── tasks/
│       │   │   ├── analyze.txt
│       │   │   ├── generate.txt
│       │   │   └── validate.txt
│       │   └── documents/
│       │       ├── leistung.txt
│       │       ├── eignung.txt
│       │       └── zuschlag.txt
│       └── emails/               # Email Templates
│           ├── verification.html
│           └── password_reset.html
├── pb_public/                     # Static Frontend
│   ├── index.html                # SPA mit PDF Upload
│   ├── app.js                    # Frontend Logic + PDF Processing
│   ├── style.css                 # Styling
│   └── lib/                      # PDF.js Library
│       └── pdf.min.js
└── pb_data/                      # Database
```

## Database Schema

### Core Collections
```javascript
users: built-in                   // PocketBase Auth

user_needs: {                     // ⭐ Bedarfseingabe
  user: "relation",
  title: "text",                  // Projekt Titel
  description: "text",            // Detaillierte Beschreibung
  budget: "number",               // Geschätztes Budget
  deadline: "date",               // Gewünschte Deadline
  category: "select",             // IT, Bau, Dienstleistung, etc.
  requirements: "text",           // Spezifische Anforderungen
  created_at: "date"
}

uploaded_documents: {             // ⭐ PDF Dokumente
  user: "relation",
  filename: "text",
  file_size: "number",
  extracted_text: "text",         // Extrahierter PDF Text
  document_type: "select",        // "reference_leistung", "reference_eignung", etc.
  upload_date: "date"
}

generation_requests: {            // Generierungsanfragen
  user: "relation",
  user_need: "relation",          // Verknüpfung zu Bedarf
  requirements: "text",
  extracted_context: "text",      // ⭐ Kombinierter PDF Kontext
  status: "select"                // pending, processing, completed, error
}

generation_progress: {            // Realtime Progress Tracking
  request_id: "relation",
  step: "text",                   // Aktueller Schritt
  progress: "number",             // 0-100%
  current_task: "text",           // Aktuelle Aufgabe
  gemini_feedback: "text",        // ⭐ Live Gemini Output
  tool_calls: "json",             // Welche Tools Gemini nutzt
  web_searches: "json",           // ⭐ Google Search Queries
  errors: "text",                 // Fehler/Warnungen
  logs: "text"                    // Debug Logs
}

documents: {                      // Generierte Dokumente
  request_id: "relation",
  title: "text",
  content: "text",                // Generated MD
  type: "select",                 // leistung, eignung, zuschlag
  created_by: "text"              // ⭐ gemini-cli
}

document_metadata: {              // ⭐ Native Template Metadata
  name: "text",                   // "leistung"
  template_path: "text",          // "documents/leistung.html" 
  variables: "json",              // Required variables
  active: "bool"
}

prompt_metadata: {               // ⭐ Prompt Template Metadata
  name: "text",                  // "system_base"
  template_path: "text",         // "prompts/system/base.txt"
  category: "select",            // "system", "task", "validation"
  variables: "json",             // Required variables
  dependencies: "json",          // Other template files to load
  active: "bool"
}

gemini_sessions: {               // ⭐ Gemini CLI Session Tracking
  request_id: "relation",
  session_id: "text",            // Unique Gemini Session
  status: "select",              // "starting", "running", "completed", "error"
  output_stream: "text",         // Live stdout/stderr
  api_usage: "json",             // ⭐ API Usage Tracking
  last_heartbeat: "date"
}
```

## Implementation Steps

### Phase 1: Setup (30 min)
1. **PocketBase Installation**
   ```bash
   mkdir ausschreibung-generator && cd ausschreibung-generator
   wget https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_linux_amd64.zip
   unzip pocketbase_linux_amd64.zip && chmod +x pocketbase
   ./pocketbase serve
   ```

2. **Gemini CLI Installation**
   ```bash
   npm install -g gemini-cli
   # Oder: Auth mit Google Account für 1000 free requests/day
   gemini auth
   ```

3. **Collections erstellen** (Admin UI)
   - Schema aus Database Schema implementieren
   - Berechtigungen konfigurieren
   - Realtime aktivieren

### Phase 2: Native Templates (60 min)
1. **Document Templates erstellen**
   ```html
   <!-- pb_hooks/views/documents/leistung.html -->
   {{template "base" .}}
   {{define "content"}}
   # Leistungsbeschreibung: {{.title}}
   
   {{if .extracted_context}}
   ## Kontext aus Referenzdokumenten
   {{.extracted_context}}
   {{end}}
   
   ## Projektdaten
   - **Auftraggeber:** {{.contracting_authority}}
   - **Budget:** {{.budget}} EUR
   - **Abgabefrist:** {{.deadline}}
   
   ## Anforderungen
   {{.requirements}}
   
   {{if .technical_specs}}
   ## Technische Spezifikationen
   {{range .technical_specs}}
   - {{.name}}: {{.description}}
   {{end}}
   {{end}}
   {{end}}
   ```

2. **Prompt Templates erstellen**
   ```html
   <!-- pb_hooks/views/prompts/system/base.txt -->
   Du bist ein autonomer Vergabedokument-Generator mit direktem PocketBase-Zugriff.
   
   ## KONTEXT
   Titel: {{.title}}
   Budget: {{.budget}} EUR
   Anforderungen: {{.requirements}}
   
   {{if .extracted_context}}
   ## REFERENZ-KONTEXT AUS PDF-DOKUMENTEN
   Nutze folgende extrahierte Inhalte als Referenz:
   ```
   {{.extracted_context}}
   ```
   {{end}}
   
   {{template "database_functions" .}}
   {{template "progress_functions" .}}
   {{template "web_search_functions" .}}
   ```

3. **Native Template Manager**
   ```javascript
   // pb_hooks/native_template_manager.pb.js
   class NativeTemplateManager {
     generateDocument(type, data) {
       return $template.loadFiles(
         `${__hooks}/views/layouts/base.html`,
         `${__hooks}/views/documents/${type}.html`
       ).render(data)
     }
     
     buildSystemPrompt(data) {
       return $template.loadFiles(
         `${__hooks}/views/prompts/system/base.txt`,
         `${__hooks}/views/prompts/system/functions.txt`,
         `${__hooks}/views/prompts/system/legal.txt`
       ).render(data)
     }
   }
   ```

### Phase 3: Frontend mit PDF Processing (90 min)
1. **HTML Structure mit PDF Upload**
   ```html
   <div id="app">
     <!-- Schritt 1: Bedarf eingeben -->
     <div id="needs-container">
       <h2>1. Ihren Bedarf beschreiben</h2>
       <form id="needs-form">
         <input type="text" name="title" placeholder="Projekt Titel" required>
         <textarea name="description" placeholder="Detaillierte Beschreibung" required></textarea>
         <input type="number" name="budget" placeholder="Geschätztes Budget (EUR)">
         <input type="date" name="deadline" placeholder="Gewünschte Deadline">
         <select name="category">
           <option value="it">IT-Dienstleistungen</option>
           <option value="bau">Bauleistungen</option>
           <option value="beratung">Beratungsdienstleistungen</option>
         </select>
         <textarea name="requirements" placeholder="Spezifische Anforderungen"></textarea>
         <button type="submit">Weiter zu Schritt 2</button>
       </form>
     </div>
   
     <!-- Schritt 2: PDF Upload -->
     <div id="upload-container" style="display: none;">
       <h2>2. Referenzdokumente hochladen (optional)</h2>
       <div class="upload-area" id="pdf-upload-area">
         <input type="file" id="pdf-files" multiple accept=".pdf">
         <p>Leistungsbeschreibungen, Wertungskriterien, etc. als PDF hochladen</p>
       </div>
       <div id="pdf-processing-status"></div>
       <button id="start-generation">Dokumente generieren</button>
     </div>
   
     <!-- Schritt 3: Progress & Results -->
     <div id="progress-container" style="display: none;">
       <h2>3. Gemini CLI arbeitet für Sie...</h2>
       
       <div class="progress-header">
         <span id="gemini-status" class="status-indicator">running</span>
         <div id="api-usage">Requests: 0/1000</div>
       </div>
       
       <div class="progress-bar-container">
         <div class="progress-bar">
           <div id="progress-bar"></div>
         </div>
         <span id="progress-text">0%</span>
       </div>
       
       <div class="current-status">
         <h3 id="current-step">Initialisierung</h3>
         <p id="current-task">Startet Gemini CLI...</p>
         <div class="gemini-feedback">
           <strong>Gemini:</strong> <span id="gemini-feedback">Lade System-Templates...</span>
         </div>
       </div>
       
       <div class="web-searches">
         <h4>Web-Recherche</h4>
         <div id="web-search-queries"></div>
       </div>
       
       <details class="gemini-output">
         <summary>Live Gemini Output</summary>
         <pre id="gemini-output"></pre>
       </details>
       
       <div id="generated-documents"></div>
     </div>
   </div>
   ```

2. **PDF Processing mit PDF.js**
   ```javascript
   // pb_public/app.js - PDF Processing
   class PDFProcessor {
     constructor() {
       this.pdfjsLib = window['pdfjs-dist/build/pdf']
       this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js'
     }
   
     async extractTextFromPDF(file) {
       const arrayBuffer = await file.arrayBuffer()
       const pdf = await this.pdfjsLib.getDocument({data: arrayBuffer}).promise
       let fullText = ""
       
       for (let i = 1; i <= pdf.numPages; i++) {
         const page = await pdf.getPage(i)
         const textContent = await page.getTextContent()
         const pageText = textContent.items.map(item => item.str).join(' ')
         fullText += pageText + '\n'
       }
       
       return fullText.trim()
     }
   
     async processPDFFiles(files) {
       const extractedTexts = []
       
       for (const file of files) {
         try {
           const text = await this.extractTextFromPDF(file)
           extractedTexts.push({
             filename: file.name,
             size: file.size,
             text: text
           })
           
           // In PocketBase speichern
           await pb.collection('uploaded_documents').create({
             filename: file.name,
             file_size: file.size,
             extracted_text: text,
             document_type: this.detectDocumentType(file.name, text)
           })
         } catch (error) {
           console.error(`Error processing ${file.name}:`, error)
         }
       }
       
       return extractedTexts
     }
   
     detectDocumentType(filename, text) {
       if (text.includes('Leistungsbeschreibung') || filename.includes('leistung')) {
         return 'reference_leistung'
       } else if (text.includes('Eignungskriterien') || filename.includes('eignung')) {
         return 'reference_eignung'
       } else if (text.includes('Zuschlagskriterien') || filename.includes('zuschlag')) {
         return 'reference_zuschlag'
       }
       return 'unknown'
     }
   }
   ```

### Phase 4: Gemini CLI Integration (120 min)
1. **Gemini Manager mit Native Templates**
   ```javascript
   // pb_hooks/gemini_integration.pb.js
   class GeminiManager {
     constructor() {
       this.templateManager = new NativeTemplateManager()
     }
   
     async startGeminiSession(requestId, userNeed, extractedContext = "") {
       const sessionId = `gemini_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
       
       // Template Data für Prompts
       const templateData = {
         title: userNeed.title,
         description: userNeed.description,
         budget: userNeed.budget,
         deadline: userNeed.deadline,
         requirements: userNeed.requirements,
         extracted_context: extractedContext,
         request_id: requestId,
         pb_url: "http://localhost:8090",
         pb_admin_email: $os.getenv("PB_ADMIN_EMAIL"),
         pb_admin_password: $os.getenv("PB_ADMIN_PASSWORD")
       }
   
       // System Prompt mit Native Templates generieren
       const systemPrompt = this.templateManager.buildSystemPrompt(templateData)
       
       // Gemini CLI ausführen
       this.executeGemini(sessionId, requestId, systemPrompt, userNeed.requirements)
     }
   
     executeGemini(sessionId, requestId, systemPrompt, requirements) {
       const workDir = `/tmp/gemini_projects/${requestId}`
       $os.mkdir(workDir, 0755)
       $os.writeFile(`${workDir}/system_prompt.txt`, systemPrompt)
       
       const geminiProcess = spawn('gemini', [
         '--prompt-file', `${workDir}/system_prompt.txt`,
         '--context', requirements,
         '--web-search',              // ⭐ Google Search aktiviert
         '--format', 'json',
         '--streaming'
       ], {
         cwd: workDir,
         env: {
           ...process.env,
           GEMINI_API_KEY: $os.getenv("GEMINI_API_KEY"),
           REQUEST_ID: requestId
         }
       })
   
       // Live Output Processing
       geminiProcess.stdout.on('data', (data) => {
         this.processGeminiOutput(data.toString(), requestId, sessionId)
       })
     }
   
     processGeminiOutput(output, requestId, sessionId) {
       // Update Session Stream
       const session = $app.dao().findFirstRecordByFilter("gemini_sessions", `session_id="${sessionId}"`)
       session.set("output_stream", session.getString("output_stream") + output)
       session.set("last_heartbeat", new Date())
       $app.dao().saveRecord(session)
       
       // Parse für Progress Updates
       this.parseGeminiProgress(output, requestId)
       this.parseWebSearches(output, requestId)
     }
   
     parseWebSearches(output, requestId) {
       // Gemini Web Search Queries extrahieren
       const searchMatches = output.match(/SEARCH:(.+)/g)
       if (searchMatches) {
         const progress = $app.dao().findFirstRecordByFilter("generation_progress", `request_id="${requestId}"`)
         const searches = searchMatches.map(match => match.replace('SEARCH:', '').trim())
         progress.set("web_searches", JSON.stringify(searches))
         $app.dao().saveRecord(progress)
       }
     }
   }
   ```

2. **Enhanced Prompt Templates**
   ```html
   <!-- pb_hooks/views/prompts/system/functions.txt -->
   {{define "web_search_functions"}}
   ## WEB SEARCH INTEGRATION
   Nutze Google Search für aktuelle Informationen:
   - Aktuelle Vergaberichtlinien
   - Rechtsprechung
   - Best Practices
   
   Protokolliere Searches: SEARCH:<query>
   {{end}}
   
   {{define "progress_functions"}}
   ## PROGRESS TRACKING
   async function updateProgress(step, progress, task, feedback) {
     const record = await pb.collection('generation_progress').getFirstListItem(`request_id="{{.request_id}}"`)
     await pb.collection('generation_progress').update(record.id, {
       step: step,
       progress: progress,
       current_task: task,
       gemini_feedback: feedback,
       updated_at: new Date().toISOString()
     })
   }
   {{end}}
   ```

### Phase 5: Realtime Frontend (60 min)
1. **Enhanced Progress Tracking**
   ```javascript
   // pb_public/app.js - Gemini Realtime Updates
   class GeminiProgressTracker {
     setupRealtimeSubscriptions() {
       // Gemini Session Updates
       pb.collection('gemini_sessions').subscribe('*', (e) => {
         if (e.record.request_id === this.currentRequestId) {
           this.updateGeminiOutput(e.record)
           this.updateApiUsage(e.record.api_usage)
         }
       })
   
       // Progress mit Web Search Updates
       pb.collection('generation_progress').subscribe('*', (e) => {
         if (e.record.request_id === this.currentRequestId) {
           this.updateProgressDisplay(e.record)
           this.updateWebSearches(e.record.web_searches)
         }
       })
     }
   
     updateWebSearches(searches) {
       if (searches) {
         const searchData = JSON.parse(searches)
         document.getElementById('web-search-queries').innerHTML = searchData.map(query => 
           `<div class="search-query">🔍 ${query}</div>`
         ).join('')
       }
     }
   
     updateApiUsage(usage) {
       if (usage) {
         const usageData = JSON.parse(usage)
         document.getElementById('api-usage').innerHTML = `
           Requests: ${usageData.used}/${usageData.limit}
           (${usageData.limit - usageData.used} remaining)
         `
       }
     }
   }
   ```

### Phase 6: Testing & Deployment (60 min)
1. **End-to-End Tests**
   - PDF Upload & Text Extraction
   - Vollständiger Workflow
   - Realtime Updates
   - Gemini API Integration

2. **Produktion Setup**
   ```bash
   # Environment Variables
   export GEMINI_API_KEY="your-gemini-key"
   export PB_ADMIN_EMAIL="admin@example.com"
   export PB_ADMIN_PASSWORD="secure-password"
   
   # Start Production
   ./pocketbase serve --http=0.0.0.0:8080
   ```

## Technische Details

### Gemini CLI Integration
- **Kostenlos**: 1000 Requests/Tag mit Google Account
- **Web Search**: Eingebaute Google Search für aktuelle Infos
- **Large Context**: 1M Token Context Window
- **ReAct Loop**: Reason and Act für autonomes Arbeiten
- **MCP Support**: Model Context Protocol für Erweiterungen

### PDF Processing
- **Browser-basiert**: PDF.js für clientseitige Text-Extraktion
- **Keine Server-Last**: Processing im Frontend
- **Multi-File Support**: Mehrere PDFs gleichzeitig
- **Type Detection**: Automatische Erkennung von Dokumenttypen

### Native Template System
- **Einheitlich**: Alle Templates über PocketBase Native System
- **Template Inheritance**: `{{define}}`, `{{block}}`, `{{template}}`
- **Conditional Logic**: `{{if}}`, `{{range}}`, `{{with}}`
- **Auto Escaping**: Sicherheit durch kontextuelles Escaping
- **Performance**: Native Caching und Optimierung

### Realtime Features
- **WebSocket Connection**: Automatische Reconnection
- **Progress Tracking**: Live Updates mit Gemini Feedback
- **Web Search Tracking**: Sichtbare Google Searches
- **API Usage Monitoring**: Live Request Counter

## Zeitschätzung
- **Gesamtdauer**: 7-9 Stunden
- **MVP**: 5-6 Stunden
- **Vollversion**: 9-12 Stunden

## Workflow

### User Journey
1. **Bedarfseingabe**: User beschreibt sein Projekt
2. **PDF Upload**: Optional Referenzdokumente hochladen
3. **Text Extraction**: Browser extrahiert PDF Text
4. **Generation Request**: Kombiniert Bedarf + PDF Kontext
5. **Gemini Processing**: Autonome Dokumenterstellung
6. **Live Updates**: Realtime Progress + Web Searches
7. **Document Download**: Fertige Vergabedokumente

### Gemini Workflow
1. **Kontext Analysis**: Bedarf + PDF Kontext analysieren
2. **Web Research**: Google Search für aktuelle Rechtslage
3. **Document Structure**: Gliederung basierend auf Referenzen
4. **Content Generation**: Detaillierte Inhalte erstellen
5. **Legal Validation**: Rechtskonformität prüfen
6. **Final Documents**: MD-Dokumente in PocketBase speichern

## Erweiterungen
- **Multi-Tenant**: Mehrere Organisationen
- **Workflow Management**: Komplexe Genehmigungsprozesse
- **Integration**: Bestehende Vergabesysteme
- **Analytics**: Nutzungsstatistiken und Erfolgsmetriken
- **Export**: PDF/DOCX Generation aus MD-Dokumenten
- **AI Training**: Feedback-Loop für Prompt Verbesserung
- **Template Library**: Branchen-spezifische Vorlagen
- **Collaboration**: Team-basierte Dokumentenerstellung