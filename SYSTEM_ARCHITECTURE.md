# Systemarchitektur: Der autonome Vergabedokument-Generator

## 1. Design-Philosophie: Minimalismus & Autonomie

Das System ist nach dem Prinzip der **radikalen Vereinfachung** konzipiert. Es besteht aus drei Kernkomponenten:

1.  **Ein minimalistisches Frontend:** Dient ausschließlich zur Erfassung des initialen Nutzerbedarfs.
2.  **Ein schlankes Backend (PocketBase):** Fungiert als Datenbank und als einfacher, ereignisgesteuerter Auslöser (Trigger).
3.  **Eine intelligente Engine (Gemini CLI):** Beinhaltet die gesamte Geschäftslogik, führt den Prozess autonom aus und interagiert direkt mit der Datenbank.

Der gesamte Prozess ist so gestaltet, dass er für den Endnutzer wie Magie wirkt: Er äußert einen Wunsch, und die fertigen Dokumente erscheinen kurz darauf.

## 2. Der Schritt-für-Schritt-Workflow

### Schritt 1: Die Nutzereingabe (Frontend)

- **Datei:** `index_autonomous.html`, `app_autonomous.js`
- **Ablauf:**
    1.  Der Nutzer öffnet die Webseite und sieht eine extrem einfache Oberfläche: eine einzige, große `textarea`.
    2.  Um den Nutzer anzuleiten, werden **dynamisch aus der Datenbank** (`example_prompts`-Collection) klickbare Beispiele geladen. Ein Klick füllt die `textarea` mit einem bewährten Prompt.
    3.  Der Nutzer beschreibt seinen Bedarf in natürlicher Sprache (z.B. "Erstelle Vergabeunterlagen für eine neue Verwaltungssoftware mit einem Budget von ca. 150.000 €...").
    4.  Ein Klick auf "✨ Generieren" startet den gesamten Prozess.
    5.  Die `app_autonomous.js` nimmt den Text aus der `textarea` und führt zwei Aktionen aus:
        a.  Sie erstellt einen neuen Datensatz in der `user_needs`-Collection, um den Bedarf zu speichern.
        b.  Sie erstellt einen neuen Datensatz in der `generation_requests`-Collection. **Dies ist der entscheidende Trigger für das Backend.**
    6.  Das UI wechselt sofort in einen Ladezustand und zeigt an: "KI arbeitet...".

### Schritt 2: Der Auslöser (Backend-Hook)

- **Datei:** `autonomous.pb.js`
- **Ablauf:**
    1.  PocketBase erkennt, dass ein neuer Datensatz in der `generation_requests`-Collection erstellt wurde.
    2.  Dies löst den `onRecordAfterCreateRequest`-Hook in `autonomous.pb.js` aus.
    3.  Dieser Hook hat nur **eine einzige, simple Aufgabe:** Er startet die Gemini CLI im Hintergrund.
    4.  Dazu liest er den `master_prompt.txt`, ersetzt den Platzhalter `{{REQUEST_ID}}` mit der ID des soeben erstellten Auftrags und übergibt diesen finalen Prompt an die Gemini CLI.
    5.  Der Hook stellt sicher, dass der `GEMINI_API_KEY` aus den Umgebungsvariablen an den Prozess übergeben wird.
    6.  Der Hook wartet **nicht** auf das Ergebnis, sondern beendet sich sofort. Die KI arbeitet von nun an völlig autonom.

### Schritt 3: Die autonome KI-Verarbeitung (Engine)

- **Datei:** `master_prompt.txt`
- **Ablauf:** Die Gemini CLI wird mit dem Master-Prompt als "Betriebssystem" gestartet. Sie führt die folgenden Schritte selbstständig aus:
    1.  **Datenbeschaffung:** Die KI nutzt die im Prompt übergebene `REQUEST_ID` und die ebenfalls im Prompt enthaltenen `curl`-Beispiele, um sich selbst alle notwendigen Informationen (Bedarfsbeschreibung, Budget etc.) aus der PocketBase-Datenbank zu holen.
    2.  **Analyse & Recherche:** Die KI analysiert den Bedarf und nutzt ihre eingebaute Web-Recherche-Fähigkeit, um aktuelle rechtliche Rahmenbedingungen (VgV, GWB etc.) zu finden, die für den spezifischen Fall relevant sind.
    3.  **Dokumentenerstellung:** Basierend auf der Analyse und der Recherche generiert die KI die drei geforderten Dokumente (Leistungsbeschreibung, Eignungs- und Zuschlagskriterien) als hochwertige Markdown-Texte.
    4.  **Speichern der Ergebnisse:** Für jedes der drei fertigen Dokumente führt die KI einen weiteren `curl`-Befehl aus, um einen neuen Datensatz in der `documents`-Collection der PocketBase-Datenbank zu erstellen. Sie schreibt den Titel, den Typ und den vollständigen Markdown-Inhalt direkt in die Datenbank.
    5.  **Finale Statusmeldung:** Als allerletzten Schritt, nachdem alle Dokumente gespeichert wurden, sendet die KI einen finalen `curl`-Befehl, um den Status des ursprünglichen Auftrags in der `generation_requests`-Collection auf `completed` zu setzen.

### Schritt 4: Die Echtzeit-Anzeige der Ergebnisse (Frontend)

- **Datei:** `app_autonomous.js`
- **Ablauf:**
    1.  Das Frontend hat von Anfang an eine Echtzeit-Verbindung zur PocketBase-Datenbank aufgebaut und lauscht auf Änderungen.
    2.  Es hat die `documents`-Collection abonniert (`pb.collection('documents').subscribe(...)`).
    3.  Jedes Mal, wenn die KI im Hintergrund ein neues Dokument in der Datenbank speichert, erhält das Frontend sofort eine Benachrichtigung.
    4.  Die `app_autonomous.js` nimmt die Daten des neuen Dokuments und rendert dynamisch eine neue "Dokumenten-Karte" in der Benutzeroberfläche.
    5.  Der Nutzer sieht also, wie die fertigen Dokumente nacheinander auf seinem Bildschirm erscheinen, ohne die Seite neu laden zu müssen.
    6.  Zusätzlich lauscht das Frontend auf Status-Änderungen in der `generation_requests`-Collection. Sobald die KI den Status auf `completed` setzt, kann das UI eine finale Erfolgsmeldung anzeigen und den Lade-Spinner ausblenden.

## 3. Datenmodell (Collections)

- **`user_needs`:** Speichert die ursprüngliche, rohe Eingabe des Benutzers.
- **`generation_requests`:** Dient als reiner Trigger. Ein neuer Eintrag startet den Prozess. Das `status`-Feld gibt Auskunft über den Gesamtzustand (pending, processing, completed, error).
- **`documents`:** Das Ziel für die Ergebnisse. Die KI schreibt die fertigen Markdown-Dokumente hier hinein.
- **`example_prompts`:** Eine flexible, vom Admin pflegbare Liste von Beispiel-Prompts, die dem Nutzer im Frontend als Starthilfe angeboten werden.

Dieses Setup ist robust, wartbar und extrem leistungsfähig, da die komplexe Logik vollständig an die KI delegiert wird, während das restliche System schlank und einfach bleibt.
