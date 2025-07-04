# Autonomer Vergabedokument-Generator

Ein KI-gestützter Generator für deutsche Vergabedokumente mit Gemini CLI Integration und Echtzeit-Fortschrittsüberwachung.

## Überblick

Dieses System erstellt automatisch professionelle Vergabedokumente:
- **Leistungsbeschreibung**
- **Eignungskriterien** 
- **Zuschlagskriterien**

## Schnellstart

### Windows Benutzer
```cmd
run-windows.cmd
```

### Linux/WSL Benutzer
```bash
./run.sh
```

### Zugriff
- **Anwendung:** http://localhost:8090
- **Admin:** http://localhost:8090/_/
- **Verbindungstest:** http://localhost:8090/test-connection.html

### Features

- 🤖 **Gemini CLI Integration** - Autonome KI-gestützte Dokumentenerstellung
- 📄 **PDF-Kontext-Extraktion** - Browser-basierte Verarbeitung von Referenzdokumenten
- ⚡ **Echtzeit-Updates** - Live-Fortschrittsüberwachung via WebSocket
- 🔍 **Web-Recherche** - Automatische Suche nach aktuellen Vergaberichtlinien
- 🛡️ **Robust Process Management** - Prozessüberwachung mit Fehlerbehandlung
- 📱 **Responsive UI** - Funktioniert auf Desktop und Mobile

## Schnellstart

### 1. Installation

```bash
# Projekt klonen
git clone <repository-url>
cd ausschreibung-generator

# Gemini CLI installieren
npm install -g @google-ai/generativelanguage

# Gemini API Key konfigurieren
export GEMINI_API_KEY="your_api_key_here"
```

### 2. PocketBase starten

```bash
# PocketBase starten
./pocketbase serve --http=0.0.0.0:8090

# In neuem Terminal: Admin Interface öffnen
open http://localhost:8090/_/
```

### 3. Datenbank einrichten

1. **Admin Account erstellen** (beim ersten Start)
2. **Collections erstellen** (siehe [Database Schema](#database-schema))
3. **Realtime aktivieren** für alle Collections

### 4. Frontend öffnen

```bash
open http://localhost:8090
```

## Database Schema

Erstellen Sie folgende Collections in der PocketBase Admin UI:

### user_needs
```javascript
{
  user: relation(_pb_users_auth_, cascade_delete=true),
  title: text(required),
  description: text(required),
  budget: number,
  deadline: date,
  category: select(it, bau, beratung, sonstiges),
  requirements: text
}
```

### uploaded_documents
```javascript
{
  user: relation(_pb_users_auth_, cascade_delete=true),
  user_need: relation(user_needs, cascade_delete=true),
  filename: text(required),
  file_size: number,
  extracted_text: text,
  document_type: select(reference_leistung, reference_eignung, reference_zuschlag, unknown)
}
```

### generation_requests
```javascript
{
  user: relation(_pb_users_auth_, cascade_delete=true),
  user_need: relation(user_needs, cascade_delete=true),
  requirements: text,
  extracted_context: text,
  status: select(pending, processing, completed, error),
  error_message: text
}
```

### generation_progress
```javascript
{
  request_id: relation(generation_requests, cascade_delete=true),
  step: text(required),
  progress: number(required),
  current_task: text,
  gemini_feedback: text,
  tool_calls: json,
  web_searches: json,
  errors: text,
  logs: text
}
```

### documents
```javascript
{
  request_id: relation(generation_requests, cascade_delete=true),
  title: text(required),
  content: text(required),
  type: select(leistung, eignung, zuschlag),
  created_by: text
}
```

### gemini_sessions
```javascript
{
  request_id: relation(generation_requests, cascade_delete=true),
  session_id: text(required),
  status: select(starting, running, completed, error),
  output_stream: text,
  api_usage: json,
  last_heartbeat: date
}
```

## API Endpoints

### Document Generation
```
POST /api/generate-documents
Body: { user_need_id: "string" }
```

### Generation Status
```
GET /api/generation-status/:requestId
```

### Document Download
```
GET /api/download-document/:documentId
```

### Health Check
```
GET /api/gemini-health
```

## Architektur

### Backend Components

- **Gemini Manager** (`gemini_manager.pb.js`)
  - Prozess-Spawning und Monitoring
  - Rate Limiting (60 Requests/Minute)
  - Timeout und Retry-Mechanismen
  - Health Checks und Recovery

- **Integration Layer** (`gemini_integration.pb.js`)
  - Workflow-Orchestrierung
  - Template-Rendering
  - Realtime-Updates
  - Error Handling

- **Prompt Templates** (`views/prompts/`)
  - Deutsche Vergabe-spezifische Prompts
  - Variable Substitution
  - Kontext-Injection

### Frontend Components

- **React-ähnliche Klassen-Architektur**
- **PDF.js Integration** für clientseitige Textextraktion
- **PocketBase Realtime** für Live-Updates
- **Responsive Design** mit CSS Grid

## Workflow

### 1. Bedarfseingabe
```
User Input → user_needs Collection → Validation
```

### 2. PDF Processing (Optional)
```
PDF Upload → PDF.js Text Extraction → uploaded_documents Collection
```

### 3. Generation Process
```
Generate Request → Gemini CLI Spawn → Progress Tracking → Document Storage
```

### 4. Realtime Updates
```
Progress Updates → WebSocket → Frontend UI Update
```

## Fehlerbehandlung

### Process Management
- **Timeout Handling**: 2 Minuten pro Prozess
- **Health Checks**: Stale Process Detection
- **Automatic Recovery**: Prozess-Neustart bei Fehlern
- **Rate Limiting**: Schutz vor API-Überlastung

### Error Recovery
- **Retry Mechanismus**: Bis zu 3 Versuche
- **Graceful Degradation**: Fallback-Verhalten
- **User Feedback**: Detaillierte Fehlermeldungen

## Entwicklung

### Debugging
```bash
# Gemini CLI Debug-Modus
export DEBUG=1
gemini --debug

# PocketBase Debug-Logs
./pocketbase serve --debug
```

### Testing
```bash
# API Health Check
curl http://localhost:8090/api/gemini-health

# Generate Test Document
curl -X POST http://localhost:8090/api/generate-documents \
  -H "Content-Type: application/json" \
  -d '{"user_need_id": "test_id"}'
```

## Deployment

### Production Setup
```bash
# Environment Variables
export GEMINI_API_KEY="production_key"
export PB_ADMIN_EMAIL="admin@domain.com"
export PB_ADMIN_PASSWORD="secure_password"

# Start Production
./pocketbase serve --http=0.0.0.0:8080 --dir=pb_data_prod
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
COPY . /app
WORKDIR /app
RUN npm install -g @google-ai/generativelanguage
EXPOSE 8090
CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"]
```

## Troubleshooting

### Häufige Probleme

1. **Gemini CLI hängt**
   - Prozess wird automatisch nach 2 Minuten beendet
   - Health Check erkennt stale Prozesse
   - Automatischer Neustart

2. **Rate Limit erreicht**
   - 60 Requests/Minute Standardlimit
   - Wartezeit wird automatisch eingehalten
   - Status in UI angezeigt

3. **PDF Text-Extraktion fehlgeschlagen**
   - PDF.js Fallback-Mechanismen
   - Benutzer-Feedback bei Fehlern
   - Fortfahren ohne PDF-Kontext möglich

### Logs
```bash
# PocketBase Logs
tail -f pb_data/logs/requests.log

# System Logs
tail -f /var/log/syslog | grep gemini
```

## Lizenz

MIT License - siehe LICENSE Datei

## Support

Bei Fragen oder Problemen:
1. README und Troubleshooting prüfen
2. GitHub Issues erstellen
3. Debug-Logs beilegen