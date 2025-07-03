#!/bin/bash

# Vergabedokument-Generator Setup Script

echo "🏛️  Vergabedokument-Generator Setup"
echo "=================================="

# Check if running in correct directory
if [ ! -f "pb_hooks/document_generator.pb.js" ]; then
    echo "❌ Bitte führen Sie das Setup im Projektverzeichnis aus"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Download and setup PocketBase binary if not exists
if [ ! -f "pocketbase" ]; then
    echo "⬇️  PocketBase Binary wird heruntergeladen..."
    
    # Detect OS and architecture
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    # Map architecture names
    case $ARCH in
        x86_64) ARCH="amd64" ;;
        aarch64|arm64) ARCH="arm64" ;;
        armv7l) ARCH="armv7" ;;
        *) echo "❌ Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    
    # Map OS names
    case $OS in
        linux) OS="linux" ;;
        darwin) OS="darwin" ;;
        *) echo "❌ Unsupported OS: $OS"; exit 1 ;;
    esac
    
    # Download PocketBase
    POCKETBASE_URL="https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_${OS}_${ARCH}.zip"
    
    echo "📥 Downloading PocketBase for ${OS}_${ARCH}..."
    
    if command_exists wget; then
        wget -O pocketbase.zip "$POCKETBASE_URL"
    elif command_exists curl; then
        curl -L -o pocketbase.zip "$POCKETBASE_URL"
    else
        echo "❌ Neither wget nor curl is available. Please install one of them."
        exit 1
    fi
    
    # Extract and setup
    if [ -f "pocketbase.zip" ]; then
        echo "📦 Extracting PocketBase..."
        unzip -q pocketbase.zip
        chmod +x pocketbase
        rm pocketbase.zip
        echo "✅ PocketBase Binary erfolgreich installiert"
    else
        echo "❌ Failed to download PocketBase"
        exit 1
    fi
else
    echo "✅ PocketBase Binary bereits vorhanden"
fi

# Create data directory
mkdir -p pb_data
echo "📁 pb_data Verzeichnis erstellt"

# Create migrations directory
mkdir -p pb_migrations
echo "📁 pb_migrations Verzeichnis erstellt"

# Create environment file template
if [ ! -f ".env" ]; then
    cat > .env << EOF
# Vergabedokument-Generator Environment Configuration

# PocketBase Settings
PB_ADMIN_EMAIL=admin@example.com
PB_ADMIN_PASSWORD=secure_password_123
PB_ENCRYPTION_KEY=$(openssl rand -hex 16)

# Gemini CLI Settings (optional for AI features)
GEMINI_API_KEY=your_gemini_api_key_here

# Application Settings
ENVIRONMENT=development
DEBUG=true
HOST=127.0.0.1
PORT=8090
EOF
    echo "📄 .env Konfigurationsdatei erstellt"
    echo "⚠️  Bitte bearbeiten Sie .env mit Ihren eigenen Werten"
else
    echo "📄 .env Datei bereits vorhanden"
fi

# Create startup script
cat > start.sh << 'EOF'
#!/bin/bash

echo "🚀 Starte Vergabedokument-Generator..."

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Check if PocketBase binary exists
if [ ! -f "pocketbase" ]; then
    echo "❌ PocketBase Binary nicht gefunden!"
    echo "Bitte laden Sie PocketBase herunter und führen Sie setup.sh erneut aus."
    exit 1
fi

# Start PocketBase
echo "🌐 Frontend verfügbar unter: http://${HOST:-127.0.0.1}:${PORT:-8090}"
echo "🔧 Admin Panel verfügbar unter: http://${HOST:-127.0.0.1}:${PORT:-8090}/_/"
echo ""
echo "Drücken Sie Ctrl+C zum Beenden"

./pocketbase serve --http=${HOST:-127.0.0.1}:${PORT:-8090}
EOF

chmod +x start.sh
echo "🚀 start.sh Startskript erstellt"

# Create README
cat > README.md << 'EOF'
# Vergabedokument-Generator

Automatische Erstellung von deutschen Vergabedokumenten mit PocketBase und modernem Frontend.

## 🚀 Schnellstart

1. **PocketBase Binary herunterladen:**
   ```bash
   wget https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_linux_amd64.zip
   unzip pocketbase_linux_amd64.zip
   chmod +x pocketbase
   ```

2. **Konfiguration anpassen:**
   ```bash
   nano .env
   ```

3. **Anwendung starten:**
   ```bash
   ./start.sh
   ```

4. **Zugriff auf die Anwendung:**
   - Frontend: http://127.0.0.1:8090
   - Admin Panel: http://127.0.0.1:8090/_/

## 📋 Features

- ✅ **Leistungsbeschreibung** - Automatische Erstellung nach VgV
- ✅ **Eignungskriterien** - Rechtskonforme Bewertungskriterien  
- ✅ **Zuschlagskriterien** - Transparente Vergabekriterien
- ✅ **Multi-Kategorie Support** - IT, Bau, Beratung
- ✅ **Responsive Design** - Desktop und Tablet optimiert
- ✅ **PDF Upload** - Referenzdokumente hochladen (optional)
- ✅ **Real-time Progress** - Live-Updates während Generierung
- ✅ **Download Funktionen** - Markdown Export

## 🏗️ Projektstruktur

```
/
├── pocketbase              # PocketBase Binary
├── pb_hooks/              # Server-seitige Logik
│   ├── init_collections.pb.js    # Database Schema
│   └── document_generator.pb.js  # Dokument Generator
├── pb_public/             # Frontend Dateien
│   ├── index.html         # Haupt-Interface
│   ├── style.css          # Styling
│   └── app.js             # JavaScript Logik
├── pb_data/               # Database Dateien
├── .env                   # Konfiguration
├── start.sh              # Startskript
└── README.md             # Diese Datei
```

## 🔧 Entwicklung

### Lokale Entwicklung
```bash
# PocketBase im Development Mode starten
./pocketbase serve --dev --http=127.0.0.1:8090
```

### Database Collections
Die Anwendung erstellt automatisch folgende Collections:
- `user_needs` - Bedarfseingaben
- `documents` - Generierte Dokumente  
- `generation_requests` - Generierungsanfragen
- `uploaded_documents` - Hochgeladene Dateien
- `generation_progress` - Progress Tracking

### API Endpoints
- `POST /api/generate-documents` - Dokumente generieren
- `GET /api/documents/:needId` - Dokumente laden
- `GET /api/download/:docId` - Dokument herunterladen

## 📖 Verwendung

1. **Bedarf beschreiben**: Projektdetails, Budget, Kategorie
2. **Dokumente hochladen** (optional): PDF-Referenzen
3. **Generierung starten**: Automatische Erstellung
4. **Dokumente herunterladen**: Markdown-Format

## ⚙️ Konfiguration

Wichtige Einstellungen in `.env`:
- `PB_ADMIN_EMAIL` - Admin Login
- `PB_ADMIN_PASSWORD` - Admin Passwort
- `GEMINI_API_KEY` - Für AI Features (optional)

## 📝 Unterstützte Dokumenttypen

### Leistungsbeschreibung
- Technische Anforderungen
- Projektbeschreibung
- Vertragsbedingungen
- Gewährleistung

### Eignungskriterien  
- Fachliche Leistungsfähigkeit
- Wirtschaftliche Leistungsfähigkeit
- Technische Qualifikation
- Referenzen

### Zuschlagskriterien
- Preisbewertung
- Qualitätskriterien
- Gewichtung nach Kategorie
- Bewertungsmatrix

## 🔒 Sicherheit

- Sichere Konfiguration vorkonfiguriert
- Input Validation auf allen Ebenen
- File Upload Beschränkungen
- XSS Protection
- CSRF Protection

## 🆘 Support

Bei Problemen:
1. Console Logs prüfen (F12)
2. PocketBase Logs prüfen
3. .env Konfiguration validieren
4. Admin Panel nutzen (/_/)

## 📄 Lizenz

Dieses Projekt steht zur freien Verfügung für die Erstellung von Vergabedokumenten.
EOF

echo "📖 README.md erstellt"

# Create .gitignore
cat > .gitignore << 'EOF'
# PocketBase
pocketbase
pb_data/
pocketbase.log

# Environment
.env
.env.local

# Logs
*.log
logs/

# Temporary files
*.tmp
.DS_Store
Thumbs.db

# Editor files
.vscode/
.idea/
*.swp
*.swo

# Node modules (if using npm for tools)
node_modules/
package-lock.json

# Build files
dist/
build/
EOF

echo "📝 .gitignore erstellt"

# Final summary
echo ""
echo "✅ Setup abgeschlossen!"
echo ""
echo "📋 Nächste Schritte:"
echo "1. .env Datei anpassen (falls erforderlich)"
echo "2. ./start.sh ausführen"
echo ""
echo "🌐 Die Anwendung wird dann verfügbar sein unter:"
echo "   Frontend: http://127.0.0.1:8090"
echo "   Admin:    http://127.0.0.1:8090/_/"
echo ""
echo "📖 Weitere Informationen in README.md"