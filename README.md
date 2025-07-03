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
