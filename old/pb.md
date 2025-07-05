# PocketBase Auth Dashboard - Setup Anleitung

## Überblick

Diese Anleitung zeigt, wie man ein einfaches, aber vollständiges Authentifizierungs-Dashboard mit PocketBase erstellt. Das System umfasst Login, Registrierung und ein geschütztes Dashboard.

## Projektstruktur

```
pocketbasetest/
├── pocketbase              # PocketBase Binary
├── pb_data/               # Datenbank und Konfiguration
├── pb_hooks/              # Server-seitige JavaScript Hooks
│   └── auth.pb.js        # Auth-Routing und Middleware
└── pb_public/            # Statische HTML/CSS/JS Dateien
    ├── index.html        # Dashboard (geschützt)
    ├── dashboard.html    # Alternative Dashboard-Seite
    ├── login.html        # Login-Formular
    └── register.html     # Registrierungs-Formular
```

## 1. PocketBase Setup

### Server starten
```bash
./pocketbase serve --http=0.0.0.0:8090
```

### Admin-Interface konfigurieren
1. Öffne `http://localhost:8090/_/`
2. Erstelle Admin-Account
3. Gehe zu **Collections**
4. Erstelle `users` Collection:
   - **Typ**: Auth Collection
   - **Felder**: email, password (automatisch erstellt)
   - Optional: Weitere Felder wie `last_login`, `profile_data`

## 2. Frontend-Komponenten

### Login-Seite (`pb_public/login.html`)
- **Funktionalität**: 
  - Email/Password Login
  - API-Aufruf: `POST /api/collections/users/auth-with-password`
  - Token-Speicherung im localStorage
  - Weiterleitung zum Dashboard
- **Features**:
  - Responsive Design
  - Fehlerbehandlung
  - Link zur Registrierung

### Registrierung (`pb_public/register.html`)
- **Funktionalität**:
  - Neuer User Account
  - API-Aufruf: `POST /api/collections/users/records`
  - Passwort-Bestätigung
  - Automatische Weiterleitung zum Login
- **Validierung**:
  - Email-Format
  - Passwort-Mindestlänge (8 Zeichen)
  - Passwort-Übereinstimmung

### Dashboard (`pb_public/index.html`)
- **Auth-Schutz**: Automatische Umleitung zu Login wenn nicht authentifiziert
- **Features**:
  - Benutzer-Info Anzeige
  - Statistik-Karten (Demo-Daten)
  - Logout-Funktionalität
  - Token-Refresh (alle 15 Minuten)
- **Responsive Design**: Mobile-freundlich

## 3. Backend-Hooks (`pb_hooks/auth.pb.js`)

### Routing
```javascript
// Root-Route mit Auth-Check
routerAdd("GET", "/", (e) => {
  const info = $apis.requestInfo(e)
  
  if (info.auth) {
    return e.redirect(302, "/dashboard.html")
  } else {
    return e.redirect(302, "/login.html")
  }
})
```

### API-Endpoints
- `GET /api/auth/check` - Auth-Status prüfen
- `GET /api/profile` - Geschützter Benutzer-Endpoint

### Event-Hooks
```javascript
// Nach erfolgreichem Login
onRecordAfterAuthWithPasswordRequest("users", (e) => {
  const user = e.record
  user.set("last_login", new Date().toISOString())
  $app.save(user)
})

// Nach Registrierung
onRecordAfterCreateRequest("users", (e) => {
  const user = e.record
  console.log(`New user registered: ${user.getString("email")}`)
})
```

## 4. Auth-Flow

### Login-Prozess
1. User gibt Email/Password ein
2. Frontend sendet `POST /api/collections/users/auth-with-password`
3. PocketBase validiert Credentials
4. Token wird zurückgegeben und im localStorage gespeichert
5. Weiterleitung zum Dashboard

### Dashboard-Schutz
1. Bei Seitenaufruf: Auth-Token aus localStorage laden
2. Token-Validierung (Format, Existenz)
3. Wenn ungültig: Weiterleitung zu Login
4. Wenn gültig: Dashboard-Inhalte laden

### Token-Management
- **Speicherung**: localStorage (`pocketbase_auth`)
- **Struktur**: `{ token: "...", record: {...} }`
- **Refresh**: Automatisch alle 15 Minuten
- **Cleanup**: Bei Logout entfernt

## 5. Sicherheitsfeatures

### CORS-Konfiguration
```javascript
routerUse((e) => {
  e.response.header().set("Access-Control-Allow-Origin", "*")
  e.response.header().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  e.response.header().set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  
  if (e.request.method === "OPTIONS") {
    return e.noContent(204)
  }
  e.next()
})
```

### Validierung
- **Frontend**: Sofortige Eingabe-Validierung
- **Backend**: PocketBase Collection Rules
- **Token**: Automatische Expire-Behandlung

## 6. Verwendung

### Neue Benutzer erstellen
1. Gehe zu `http://localhost:8090/register.html`
2. Fülle das Formular aus
3. Klicke "Registrieren"
4. Automatische Weiterleitung zum Login

### Anmelden
1. Gehe zu `http://localhost:8090/login.html` (oder Root-URL)
2. Email und Passwort eingeben
3. Nach erfolgreichem Login: Weiterleitung zum Dashboard

### Dashboard nutzen
- **Benutzer-Info**: Anzeige der Account-Details
- **Statistiken**: Demo-Daten (anpassbar)
- **Abmelden**: Logout-Button oben rechts

## 7. Anpassungen

### Styling
- **CSS**: Inline-Styles in HTML-Dateien
- **Framework**: Verwendet CSS Grid und Flexbox
- **Theme**: Moderne, minimalistische Optik

### Zusätzliche Felder
```javascript
// In pb_hooks/auth.pb.js - erweiterte Benutzer-Info
return e.json(200, {
  id: info.auth.getString("id"),
  email: info.auth.getString("email"),
  // Zusätzliche Felder:
  name: info.auth.getString("name"),
  avatar: info.auth.getString("avatar"),
  role: info.auth.getString("role")
})
```

### Dashboard-Inhalte
```html
<!-- Erweiterte Statistiken -->
<div class="stat-card">
  <div class="stat-value" id="projectCount">0</div>
  <div class="stat-label">Meine Projekte</div>
</div>
```

```javascript
// Dynamische Daten laden
async function loadDashboardData() {
  const auth = JSON.parse(localStorage.getItem('pocketbase_auth'))
  const response = await fetch('/api/dashboard/stats', {
    headers: { 'Authorization': `Bearer ${auth.token}` }
  })
  const data = await response.json()
  document.getElementById('projectCount').textContent = data.projects
}
```

## 8. Deployment

### Produktion
```bash
# Server starten
./pocketbase serve --http=0.0.0.0:8090 --dir=./pb_data

# Mit SSL (empfohlen)
./pocketbase serve --http=0.0.0.0:8090 --httpsDir=./ssl --dir=./pb_data
```

### Docker
```dockerfile
FROM alpine:latest
ARG PB_VERSION=0.28.3

RUN apk add --no-cache unzip ca-certificates
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

COPY ./pb_hooks /pb/pb_hooks
COPY ./pb_public /pb/pb_public

EXPOSE 8090
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
```

## 9. Troubleshooting

### Häufige Probleme
- **CORS-Fehler**: Prüfe CORS-Middleware in auth.pb.js
- **Token ungültig**: Lösche localStorage und melde dich neu an
- **Collection nicht gefunden**: Erstelle "users" Auth-Collection im Admin-Panel

### Debug-Tipps
```javascript
// Auth-Status debuggen
console.log('Auth Data:', localStorage.getItem('pocketbase_auth'))

// Token prüfen
fetch('/api/auth/check')
  .then(r => r.json())
  .then(console.log)
```

## 10. Erweiterungen

### Mögliche Features
- **Password Reset**: Email-basierte Passwort-Wiederherstellung
- **Email-Verifizierung**: Bestätigungs-Emails
- **OAuth**: Google/GitHub Login
- **Rollen-System**: Admin/User Unterscheidung
- **Profile-Bearbeitung**: User-Settings Seite
- **Real-time Updates**: WebSocket für Live-Daten

Diese Anleitung bietet eine solide Grundlage für PocketBase Auth-Systeme und kann je nach Anforderungen erweitert werden.

---

## 11. PocketBase Migrationen - Praktische Erkenntnisse

### Übersicht
PocketBase nutzt JavaScript-Migrationen für Datenbankschema-Änderungen. Basierend auf praktischen Erfahrungen mit Collection-Erstellung und häufigen Fehlern.

### Migration Struktur
```javascript
// pb_migrations/timestamp_description.js
migrate((app) => {
  // Upgrade Operation
  // Collections erstellen, Daten einfügen
}, (app) => {
  // Rollback Operation  
  // Änderungen rückgängig machen
})
```

### Häufige Fehler und Lösungen

#### 1. User Relations - `collectionId: cannot be blank`

**❌ Häufiger Fehler:**
```javascript
// Dynamische Collection-Referenz funktioniert NICHT in Migrationen
const usersCollection = app.findCollectionByNameOrId("users")
{
  name: "user",
  type: "relation", 
  options: {
    collectionId: usersCollection.id  // Fehler!
  }
}
```

**✅ Korrekte Lösung:**
```javascript
// Feste Collection-ID verwenden
{
  name: "user",
  type: "relation",
  required: true,
  options: {
    maxSelect: 1,
    collectionId: "_pb_users_auth_",  // Feste PocketBase User Collection ID
    cascadeDelete: false
  }
}
```

**🔄 Alternative - Text Felder:**
```javascript
// Bei Relations-Problemen: Einfache Text-Felder verwenden
{
  name: "user_id",
  type: "text",
  required: false,
  options: {
    max: 255
  }
}
```

#### 2. Collection Abhängigkeiten

**❌ Problem:**
```javascript
// Collection wird referenziert bevor sie gespeichert wurde
const projectTemplates = new Collection({...})
const documents = new Collection({
  fields: [{
    options: {
      collectionId: projectTemplates.id  // Noch nicht verfügbar!
    }
  }]
})
```

**✅ Lösung:**
```javascript
// Collections in richtiger Reihenfolge speichern
const templates = new Collection({...})
const projects = new Collection({...})

// Erst speichern
app.save(templates)
app.save(projects)

// Dann Relations verwenden
const projectTemplates = new Collection({
  fields: [{
    options: {
      collectionId: projects.id  // Jetzt verfügbar
    }
  }]
})
app.save(projectTemplates)
```

#### 3. DAO und Hook-Funktionen in Migrationen

**❌ Fehler:**
```javascript
// Diese Funktionen existieren NICHT in Migrationen
const dao = new Dao(app)           // ReferenceError
const dao = $app.dao()             // $app is not defined
dao.saveRecord(record)             // Object has no member 'dao'
```

**✅ Korrekt:**
```javascript
// Nur app.save() verwenden
migrate((app) => {
  const collection = new Collection({...})
  const record = new Record(collection, {...})
  
  app.save(collection)
  app.save(record)     // Direkt app.save()
})
```

#### 4. Hook-Funktionen in pb_hooks

**❌ Fehler:**
```javascript
// Diese Hook-Funktionen existieren nicht in aktueller PB Version
onRecordAfterAuthWithPasswordRequest("users", (e) => {...})  // Fehler
onRecordAfterCreateRequest("users", (e) => {...})           // Fehler
```

**✅ Korrekt:**
```javascript
// Hooks auskommentieren oder alternative Events nutzen
// onRecordAfterAuthWithPasswordRequest((e) => {
//   // Code falls verfügbar
// })

// Verwende verfügbare Router-Funktionen
routerAdd("POST", "/api/auth/login", (e) => {
  // Custom Login Logic
})
```

### Bewährte Praktiken für Migrationen

#### 1. Einfache Collections zuerst
```javascript
migrate((app) => {
  // 1. Basis-Collections ohne Relations
  const templates = new Collection({
    fields: [
      { name: "name", type: "text", required: true },
      { name: "content", type: "editor", required: true }
      // Keine Relations
    ]
  })
  
  app.save(templates)
  
  // 2. Relations in separater Migration
})
```

#### 2. Access Rules separat setzen
```javascript
migrate((app) => {
  const collection = new Collection({
    name: "templates",
    listRule: "",      // Erstmal offen
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [...]
  })
  
  app.save(collection)
  
  // Access Rules später über Admin UI oder separate Migration
})
```

#### 3. Schrittweise Migration
```javascript
// Migration 1: Basis Collections
migrate((app) => {
  const templates = new Collection({...})
  const projects = new Collection({...})
  app.save(templates)
  app.save(projects)
})

// Migration 2: Junction Tables
migrate((app) => {
  const templates = app.findCollectionByNameOrId("templates")
  const projects = app.findCollectionByNameOrId("projects")
  
  const projectTemplates = new Collection({
    fields: [{
      options: {
        collectionId: projects.id  // Jetzt sicher verfügbar
      }
    }]
  })
  app.save(projectTemplates)
})
```

#### 4. Rollback implementieren
```javascript
migrate((app) => {
  // Upgrade
  const collection = new Collection({...})
  app.save(collection)
}, (app) => {
  // Rollback - Umgekehrte Reihenfolge
  try {
    const collection = app.findCollectionByNameOrId("collection_name")
    app.delete(collection)
  } catch (e) {
    // Collection existiert nicht - okay
  }
})
```

### Migration Debugging

#### Fehler analysieren
```bash
# PocketBase mit Migration starten
./pocketbase serve

# Fehler-Output analysieren:
# "collectionId: cannot be blank" → Relations-Problem
# "Object has no member 'dao'" → Falsche API-Nutzung  
# "ReferenceError: xyz is not defined" → Funktion existiert nicht
```

#### Test-Migration erstellen
```javascript
// pb_migrations/test_simple.js
migrate((app) => {
  const testCollection = new Collection({
    type: "base",
    name: "test_simple",
    fields: [{
      name: "title",
      type: "text",
      required: true,
      options: { max: 255 }
    }]
  })
  
  app.save(testCollection)
  console.log("✅ Test collection created")
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("test_simple")
    app.delete(collection)
    console.log("✅ Test collection deleted")
  } catch (e) {}
})
```

### Template-System Migration (Vollständiges Beispiel)

#### Migration 1: Basis Collections
```javascript
// pb_migrations/1687801090_create_collections.js
migrate((app) => {
  const templates = new Collection({
    type: "base",
    name: "templates",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      {
        name: "name",
        type: "text",
        required: true,
        options: { max: 255 }
      },
      {
        name: "content",
        type: "editor", 
        required: true
      },
      {
        name: "user_id",          // Text statt Relation
        type: "text",
        required: false,
        options: { max: 255 }
      }
    ]
  })

  const projects = new Collection({
    type: "base",
    name: "projects", 
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      {
        name: "name",
        type: "text",
        required: true,
        options: { max: 255 }
      },
      {
        name: "global_data",
        type: "json",
        required: false
      },
      {
        name: "user_id",          // Text statt Relation
        type: "text", 
        required: false,
        options: { max: 255 }
      }
    ]
  })

  app.save(templates)
  app.save(projects)
})
```

#### Migration 2: Sample Data
```javascript
// pb_migrations/1687801091_seed_data.js
migrate((app) => {
  const templatesCollection = app.findCollectionByNameOrId("templates")
  
  const template1 = new Record(templatesCollection, {
    name: "Brief-Vorlage",
    content: `<h1>{{.firma}}</h1><p>{{.anrede}} {{.name}},</p><p>{{.text}}</p>`,
    user_id: "system"
  })
  
  app.save(template1)  // Direkt app.save() nutzen
})
```

### Wichtige Erkenntnisse

1. **Relations vermeiden**: In komplexen Schemas Relations durch Text-IDs ersetzen
2. **Schrittweise vorgehen**: Mehrere kleine Migrationen statt einer großen
3. **Offene Access Rules**: Erstmal ohne Sicherheit, später anpassen
4. **app.save() nutzen**: Keine DAO-Funktionen in Migrationen
5. **Hook-Funktionen prüfen**: Viele existieren nicht in aktueller Version
6. **Rollback implementieren**: Immer Rückgängig-Logik einbauen
7. **Test zuerst**: Einfache Test-Migration vor komplexem Schema

### ✅ KRITISCHE LÖSUNG: Korrekte Collection-Syntax

**❌ FALSCH - führt zu Collections ohne Felder:**
```javascript
const collection = new Collection({
  name: "templates",
  schema: [{ // ❌ FALSCH: 'schema' wird ignoriert
    name: "title",
    type: "text", 
    options: { max: 255 } // ❌ FALSCH: 'options' wrapper
  }]
})
```

**✅ KORREKT - erstellt Collections mit allen Feldern:**
```javascript
const collection = new Collection({
  name: "templates",
  fields: [{ // ✅ RICHTIG: 'fields' verwenden
    name: "title",
    type: "text",
    required: true,
    max: 255 // ✅ RICHTIG: Direkte Eigenschaften ohne 'options'
  }]
})
```

### Vollständige korrekte Migration (funktioniert zu 100%):

```javascript
migrate((app) => {
  const templates = new Collection({
    type: "base",
    name: "templates", 
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      {
        name: "name",
        type: "text", 
        required: true,
        max: 255
      },
      {
        name: "content",
        type: "editor",
        required: true
      },
      {
        name: "user_id", 
        type: "text",
        required: false,
        max: 255
      }
    ]
  })
  
  app.save(templates)
  
  // Records erstellen funktioniert sofort
  const record = new Record(templates, {
    name: "Brief-Vorlage", 
    content: "<h1>{{.firma}}</h1>",
    user_id: "system"
  })
  app.save(record)
})
```

### Verfügbare Feldtypen (aus offizieller Dokumentation):

- **text**: Textfelder mit `max`, `min`, `pattern`
- **number**: Zahlenfelder  
- **bool**: Boolean true/false
- **email**: Email-Validierung
- **url**: URL-Validierung
- **editor**: HTML-Editor (Rich Text)
- **date**: Datum/Zeit
- **autodate**: Automatische Timestamps
- **select**: Auswahllisten
- **file**: Datei-Upload
- **relation**: Verknüpfungen zu anderen Collections
- **json**: JSON-Objekte

### Test-Ergebnis ✅

Mit der korrekten `fields`-Syntax werden jetzt **alle Collections mit vollständigen Feldern** erstellt:

```sql
-- Vor der Korrektur: Nur ID-Feld
CREATE TABLE templates (id TEXT PRIMARY KEY)

-- Nach der Korrektur: Alle gewünschten Felder  
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL, 
  user_id TEXT NOT NULL
)
```

Diese Erkenntnisse sparen viel Debugging-Zeit und führen zu stabilen Migrationen.