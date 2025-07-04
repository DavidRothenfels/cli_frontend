# Autonomer Vergabedokument-Generator

Ein vollständig autonomer KI-Agent zur Generierung deutscher Vergabeunterlagen. Gemini CLI übernimmt die komplette Dokumentenerstellung.

## 🚀 Autonome Architektur

Die Anwendung nutzt eine radikal vereinfachte, KI-zentrierte Architektur:

1. **Frontend**: Nutzer gibt Bedarf, Budget und Deadline ein
2. **Trigger**: PocketBase Hook startet automatisch Gemini CLI
3. **KI-Engine**: Gemini CLI arbeitet vollständig autonom mit Master-Prompt
4. **Realtime**: Dokumente erscheinen automatisch im Frontend

## 📄 Generierte Dokumente

- **Leistungsbeschreibung** (800+ Wörter, detailliert, rechtssicher)
- **Eignungskriterien** (600+ Wörter, messbare Kriterien)
- **Zuschlagskriterien** (600+ Wörter, klare Gewichtungen)

Alle Dokumente entsprechen deutschem Vergaberecht (VgV/GWB).

## 🏃 Schnellstart

### 1. Gemini CLI konfigurieren
```bash
export GEMINI_API_KEY="your-api-key-here"
```

### 2. Anwendung starten
```bash
./run.sh
```

### 3. Browser öffnen
- **Frontend**: http://localhost:8090
- **Admin Panel**: http://localhost:8090/_/

## 🔧 Technische Details

### Minimale Collections
- `user_needs` - Benutzereingaben
- `generation_requests` - Trigger für Gemini CLI
- `documents` - KI-generierte Ergebnisse

### Autonomer Workflow
```
Input → generation_requests → Hook → Gemini CLI → documents → Frontend
```

### Master-Prompt System
Die gesamte Logik liegt im Master-Prompt (`pb_hooks/views/prompts/system/master_prompt.txt`):
- Datenbank-Zugriff via curl
- Web-Recherche für aktuelle Rechtslage
- Autonome Dokumenterstellung
- Ergebnis-Speicherung

## 📁 Projektstruktur

```
ausschreibung-generator/
├── pb_hooks/
│   ├── autonomous.pb.js          # Einziger Hook - startet Gemini CLI
│   ├── download.pb.js           # Document Download API
│   └── views/prompts/system/
│       └── master_prompt.txt    # KI-Logik Engine
├── pb_migrations/
│   └── 1751600000_autonomous_setup.js  # DB Schema
└── pb_public/
    ├── index.html               # Autonomes Frontend
    ├── app.js                   # Realtime UI
    └── style.css               # Styling
```

## 🤖 Gemini CLI Integration

Das System nutzt Gemini CLI als zentrale Logik-Engine:
- Vollständig autonom
- Keine Template-Beschränkungen
- Direkte PocketBase REST API Nutzung
- Robuste Fehlerbehandlung

## 🎯 Zielsetzung

Maximale Vereinfachung bei maximaler KI-Autonomie. Das System reduziert menschliche Eingaben auf das Minimum und lässt die KI alle komplexen Aufgaben autonom erledigen.