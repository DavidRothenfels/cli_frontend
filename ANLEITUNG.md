# 🚀 Vergabedokument-Generator - Startanleitung

## ⚡ Sofortiger Start (Empfohlen)

```bash
# 1. Ins Projektverzeichnis wechseln
cd /mnt/c/Users/danie/claude/code/cli

# 2. Alles automatisch einrichten und starten
./quick-start.sh
```

**Das war's!** Die Anwendung lädt automatisch herunter, richtet alles ein und startet.

---

## 📋 Manueller Start (falls gewünscht)

### Schritt 1: Setup ausführen
```bash
./setup.sh
```

**Was passiert:**
- ✅ PocketBase Binary wird automatisch heruntergeladen (für Ihr OS)
- ✅ Alle Verzeichnisse werden erstellt
- ✅ Konfigurationsdateien werden generiert
- ✅ Datenbankmigrationen werden vorbereitet

### Schritt 2: Anwendung starten
```bash
./start.sh
```

**Was passiert:**
- ✅ PocketBase startet mit automatischen Migrationen
- ✅ Datenbank wird initialisiert
- ✅ Demo-Benutzer werden angelegt
- ✅ Alle Collections werden erstellt

---

## 🌐 Zugriff auf die Anwendung

### Frontend (Hauptanwendung)
**URL:** http://127.0.0.1:8090

### Demo-Login
- **E-Mail:** `test@vergabe.de`
- **Passwort:** `vergabe123`

### Admin Panel (für Entwickler)
**URL:** http://127.0.0.1:8090/_/
- **E-Mail:** `admin@vergabe.de`
- **Passwort:** `admin123`

---

## 🎯 Workflow nach dem Start

1. **Browser öffnen:** http://127.0.0.1:8090
2. **Automatische Weiterleitung** zur Login-Seite
3. **Mit Demo-Account anmelden**
4. **Bedarf eingeben:**
   - Projekt-Titel: z.B. "Entwicklung einer Verwaltungssoftware"
   - Beschreibung: Detaillierte Projektbeschreibung
   - Budget: z.B. 150000
   - Kategorie: IT-Dienstleistungen
5. **Optional:** PDF-Referenzdokumente hochladen
6. **"Dokumente generieren" klicken**
7. **Live Progress verfolgen**
8. **Fertige Dokumente herunterladen**

---

## 🔧 Verfügbare Skripte

| Skript | Beschreibung |
|--------|-------------|
| `./quick-start.sh` | **Alles automatisch** - Setup + Start in einem |
| `./setup.sh` | Nur Setup ausführen |
| `./start.sh` | Nur Anwendung starten |

---

## 📝 Generierte Dokumente

Nach der Generierung erhalten Sie 3 professionelle Vergabedokumente:

### 1. **Leistungsbeschreibung**
- Allgemeine Angaben und Projektbeschreibung
- Detaillierte technische Anforderungen
- Kategorie-spezifische Systemarchitektur
- Sicherheitsanforderungen
- Vertragsbedingungen

### 2. **Eignungskriterien**
- Persönliche und gewerbliche Zuverlässigkeit
- Berufliche und fachliche Leistungsfähigkeit
- Wirtschaftliche Kapazität
- Technische Qualifikation
- Bewertungsverfahren

### 3. **Zuschlagskriterien**
- Gewichtete Bewertungsmatrix
- Kategorie-spezifische Kriterien
- Detaillierte Bewertungsverfahren
- Transparente Punktevergabe
- Formale Anforderungen

---

## 🆘 Bei Problemen

### Problem: "PocketBase Binary nicht gefunden"
```bash
# Lösung: Setup erneut ausführen
./setup.sh
```

### Problem: "Port bereits in Verwendung"
```bash
# Lösung: Anderen Port verwenden
echo "PORT=8091" >> .env
./start.sh
```

### Problem: "Anwendung lädt nicht"
```bash
# Lösung: Browser-Cache leeren oder
# Private/Inkognito-Fenster verwenden
```

### Problem: "Login funktioniert nicht"
```bash
# Lösung: Admin Panel prüfen
# http://127.0.0.1:8090/_/
# Mit admin@vergabe.de / admin123 anmelden
```

---

## 🎉 Fertig!

**Ihre professionellen Vergabedokumente sind nur 3 Klicks entfernt:**

1. `./quick-start.sh`
2. Demo-Login verwenden
3. Bedarf eingeben und generieren

**Viel Erfolg bei Ihren Vergabeverfahren!** 🏛️