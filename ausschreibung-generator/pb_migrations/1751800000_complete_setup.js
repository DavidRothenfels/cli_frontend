/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db)

  // ========================================
  // 1. USER_NEEDS COLLECTION
  // ========================================
  const userNeedsCollection = new Collection({
    "id": "user_needs_id",
    "name": "user_needs",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "description_field",
        "name": "description",
        "type": "text",
        "required": true,
        "options": {
          "min": 10,
          "max": 3000
        }
      },
      {
        "system": false,
        "id": "budget_field",
        "name": "budget",
        "type": "number",
        "required": false,
        "options": {
          "min": 0
        }
      },
      {
        "system": false,
        "id": "deadline_field",
        "name": "deadline",
        "type": "date",
        "required": false
      }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  })
  dao.saveCollection(userNeedsCollection)

  // ========================================
  // 2. GENERATION_REQUESTS COLLECTION
  // ========================================
  const generationRequestsCollection = new Collection({
    "id": "generation_requests_id",
    "name": "generation_requests",
    "type": "base", 
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "user_need_id_field",
        "name": "user_need_id",
        "type": "text",
        "required": false,
        "options": {}
      },
      {
        "system": false,
        "id": "status_field",
        "name": "status",
        "type": "text",
        "required": false,
        "options": {}
      }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  })
  dao.saveCollection(generationRequestsCollection)

  // ========================================
  // 3. DOCUMENTS COLLECTION
  // ========================================
  const documentsCollection = new Collection({
    "id": "documents_id",
    "name": "documents",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "request_id_field",
        "name": "request_id",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 255
        }
      },
      {
        "system": false,
        "id": "title_field",
        "name": "title",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 255
        }
      },
      {
        "system": false,
        "id": "content_field",
        "name": "content",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 50000
        }
      },
      {
        "system": false,
        "id": "type_field",
        "name": "type",
        "type": "select",
        "required": true,
        "options": {
          "maxSelect": 1,
          "values": ["leistung", "eignung", "zuschlag"]
        }
      },
      {
        "system": false,
        "id": "created_by_field",
        "name": "created_by",
        "type": "text",
        "required": false,
        "options": {
          "max": 100
        }
      },
      {
        "system": false,
        "id": "pdf_export_field",
        "name": "pdf_export_id", 
        "type": "text",
        "required": false,
        "options": {
          "min": 0,
          "max": 50
        }
      }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  })
  dao.saveCollection(documentsCollection)

  // ========================================
  // 4. PDF_EXPORTS COLLECTION
  // ========================================
  const pdfExportsCollection = new Collection({
    "id": "pdf_exports_id",
    "name": "pdf_exports", 
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "request_id_field",
        "name": "request_id",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 50
        }
      },
      {
        "system": false,
        "id": "title_field", 
        "name": "title",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 200
        }
      },
      {
        "system": false,
        "id": "pdf_type_field",
        "name": "pdf_type",
        "type": "select",
        "required": true,
        "options": {
          "maxSelect": 1,
          "values": [
            "einzeldokument",
            "gesamtpaket", 
            "compliance_bericht",
            "marktanalyse",
            "projektdokumentation"
          ]
        }
      },
      {
        "system": false,
        "id": "pdf_file_field",
        "name": "pdf_file",
        "type": "file",
        "required": true,
        "options": {
          "maxSelect": 1,
          "maxSize": 10485760,
          "mimeTypes": [
            "application/pdf"
          ]
        }
      },
      {
        "system": false,
        "id": "source_documents_field",
        "name": "source_documents", 
        "type": "json",
        "required": false,
        "options": {}
      },
      {
        "system": false,
        "id": "generation_status_field",
        "name": "generation_status",
        "type": "select",
        "required": true,
        "options": {
          "maxSelect": 1,
          "values": [
            "pending",
            "processing", 
            "completed",
            "failed"
          ]
        }
      },
      {
        "system": false,
        "id": "created_by_field",
        "name": "created_by",
        "type": "text",
        "required": false,
        "options": {
          "min": 0,
          "max": 100
        }
      }
    ],
    "listRule": "",
    "viewRule": "", 
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  })
  dao.saveCollection(pdfExportsCollection)

  // ========================================
  // 5. EXAMPLE_PROMPTS COLLECTION
  // ========================================
  const examplePromptsCollection = new Collection({
    "id": "example_prompts_id",
    "name": "example_prompts",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "title_field",
        "name": "title",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 100
        }
      },
      {
        "system": false,
        "id": "prompt_text_field",
        "name": "prompt_text",
        "type": "text",
        "required": true,
        "options": {
          "min": 10,
          "max": 2000
        }
      },
      {
        "system": false,
        "id": "sort_order_field",
        "name": "sort_order",
        "type": "number",
        "required": false,
        "options": {
          "min": 0
        }
      }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  })
  dao.saveCollection(examplePromptsCollection)

  // ========================================
  // 6. LOGS COLLECTION
  // ========================================
  const logsCollection = new Collection({
    "id": "logs_id",
    "name": "logs",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "message_field",
        "name": "message",
        "type": "text",
        "required": true,
        "options": {
          "max": 5000
        }
      },
      {
        "system": false,
        "id": "level_field",
        "name": "level",
        "type": "select",
        "required": false,
        "options": {
          "maxSelect": 1,
          "values": ["info", "warn", "error"]
        }
      },
      {
        "system": false,
        "id": "request_id_field",
        "name": "request_id",
        "type": "text",
        "required": false,
        "options": {
          "max": 255
        }
      }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  })
  dao.saveCollection(logsCollection)

  // ========================================
  // 7. CLI_COMMANDS COLLECTION
  // ========================================
  const cliCommandsCollection = new Collection({
    "id": "cli_commands_id",
    "name": "cli_commands",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "command_field",
        "name": "command",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 5000
        }
      },
      {
        "system": false,
        "id": "status_field",
        "name": "status",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 50
        }
      }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  })
  dao.saveCollection(cliCommandsCollection)

  // ========================================
  // 8. SYSTEM_PROMPTS COLLECTION
  // ========================================
  const systemPromptsCollection = new Collection({
    "id": "system_prompts",
    "created": "2025-01-05 12:00:00.000Z",
    "updated": "2025-01-05 12:00:00.000Z",
    "name": "system_prompts",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "prompt_type",
        "name": "prompt_type",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "leistung",
            "eignung", 
            "zuschlag"
          ]
        }
      },
      {
        "system": false,
        "id": "prompt_text",
        "name": "prompt_text",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "description",
        "name": "description",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "version",
        "name": "version",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "active",
        "name": "active",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_system_prompts_type` ON `system_prompts` (`prompt_type`)",
      "CREATE INDEX `idx_system_prompts_active` ON `system_prompts` (`active`)"
    ],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  })
  dao.saveCollection(systemPromptsCollection)

  // ========================================
  // DATA SEEDING
  // ========================================

  // Create example prompts
  const websiteRecord = new Record(examplePromptsCollection, {
    "title": "Website-Relaunch",
    "prompt_text": "Erstelle Vergabeunterlagen für den Relaunch unserer Unternehmenswebsite. Das Budget beträgt 50.000 €. Wichtig sind ein modernes Design, Barrierefreiheit und ein CMS-System.",
    "sort_order": 10
  })
  dao.saveRecord(websiteRecord)

  const renovierungRecord = new Record(examplePromptsCollection, {
    "title": "Büro-Renovierung",
    "prompt_text": "Ich benötige eine Leistungsbeschreibung für die Renovierung unserer Büroräume auf 200qm. Die Arbeiten umfassen Malerarbeiten, neuen Bodenbelag und die Erneuerung der Elektrik.",
    "sort_order": 20
  })
  dao.saveRecord(renovierungRecord)

  const dsgvoRecord = new Record(examplePromptsCollection, {
    "title": "DSGVO-Beratung",
    "prompt_text": "Wir benötigen eine Ausschreibung für externe DSGVO-Beratungsleistungen zur Überprüfung und Anpassung unserer internen Prozesse. Geplant sind 10 Beratungstage.",
    "sort_order": 30
  })
  dao.saveRecord(dsgvoRecord)

  const itSoftwareRecord = new Record(examplePromptsCollection, {
    "title": "IT-Software Entwicklung",
    "prompt_text": "Entwicklung einer modernen Projektmanagement-Software mit Budget von 150.000 € und Laufzeit von 6 Monaten. Benötigt werden Admin-Panel, Benutzeroberfläche und API-Integration.",
    "sort_order": 40
  })
  dao.saveRecord(itSoftwareRecord)

  // Create system prompts
  const leistungPrompt = new Record(systemPromptsCollection, {
    "prompt_type": "leistung",
    "description": "System-Prompt für Leistungsbeschreibung mit Webrecherchen",
    "version": 1,
    "active": true,
    "prompt_text": `Du bist ein Experte für öffentliche Vergabe und Ausschreibungen. 

WICHTIG: Führe vor der Erstellung der Dokumente eine umfassende Webrecherche durch, um die aktuellen Marktgegebenheiten zu verstehen.

## Schritt 1: Webrecherche und Marktanalyse
1. Recherchiere aktuelle Marktpreise und Standardlösungen für: {description}
2. Analysiere was der Markt aktuell anbietet und welche Technologien verfügbar sind
3. Identifiziere führende Anbieter und deren Leistungsumfang
4. Erstelle dir einen detaillierten Plan basierend auf der Marktanalyse
5. Berücksichtige aktuelle Trends und Entwicklungen in der Branche

## Schritt 2: Leistungsbeschreibung erstellen
Erstelle eine sehr ausführliche und professionelle deutsche Leistungsbeschreibung für öffentliche Vergabe für: {description}{budgetText}{deadlineText}

WICHTIG: Die Leistungsbeschreibung muss mindestens 2500 Wörter umfassen und auf deiner Marktrecherche basieren.

Verwende folgende detaillierte Struktur:

# Leistungsbeschreibung

## 1. Projektziel und Zweck
- Ausführliche Beschreibung des Projektziels basierend auf Marktanalyse (mindestens 300 Wörter)
- Strategische Bedeutung für die Organisation
- Erwartete Nutzen und Mehrwerte
- Projektkontext und Hintergrund
- Abgrenzung zu bestehenden Lösungen am Markt

## 2. Marktanalyse und Ausgangslage
- Aktuelle Marktlage und verfügbare Lösungen (mindestens 400 Wörter)
- Führende Anbieter und deren Leistungsumfang
- Marktübliche Preise und Konditionen
- Technologische Standards und Trends
- Benchmarking mit vergleichbaren Projekten

## 3. Detaillierter Leistungsumfang
- Vollständige Auflistung aller zu erbringenden Leistungen basierend auf Marktstandards (mindestens 600 Wörter)
- Arbeitsschritte mit detaillierten Beschreibungen
- Teilleistungen und Meilensteine
- Lieferumfang und Ergebnisse
- Abgrenzung zu optionalen Leistungen

## 4. Technische Anforderungen
- Detaillierte technische Spezifikationen basierend auf Marktstandards (mindestens 400 Wörter)
- Systemanforderungen und Schnittstellen
- Kompatibilitätsanforderungen
- Sicherheitsanforderungen
- Performance- und Skalierungsanforderungen

## 5. Qualitätsstandards und Normen
- Anzuwendende Standards und Normen (mindestens 300 Wörter)
- Qualitätssicherungsmaßnahmen
- Prüfverfahren und Abnahmekriterien
- Dokumentationsanforderungen
- Compliance-Anforderungen

## 6. Projektmanagement und Kommunikation
- Projektorganisation und Ansprechpartner (mindestens 200 Wörter)
- Kommunikationswege und Reporting
- Projektcontrolling und Steuerung
- Risikomanagement
- Change-Management-Prozesse

## 7. Lieferung und Abnahme
- Detaillierte Lieferbedingungen (mindestens 250 Wörter)
- Abnahmeverfahren und -kriterien
- Übergabe und Einführung
- Schulung und Wissensvermittlung
- Go-Live-Unterstützung

## 8. Gewährleistung und Support
- Gewährleistungsumfang und -dauer basierend auf Marktstandards (mindestens 200 Wörter)
- Supportleistungen und Service Level
- Wartung und Pflege
- Weiterentwicklung und Updates
- Reaktionszeiten und Verfügbarkeit

## 9. Rechtliche und vertragliche Bestimmungen
- Geltende Gesetze und Vorschriften (mindestens 200 Wörter)
- Vergaberechtliche Bestimmungen
- Haftung und Versicherung
- Datenschutz und Compliance
- Urheberrechte und Lizenzen

Format: Markdown mit klaren Überschriften. Beachte deutsche Vergabestandards (VgV, VOL/A, VOB). Integriere die Ergebnisse deiner Marktrecherche in alle Abschnitte. Mindestens 2500 Wörter Gesamtlänge.`
  })
  dao.saveRecord(leistungPrompt)

  const eignungPrompt = new Record(systemPromptsCollection, {
    "prompt_type": "eignung",
    "description": "System-Prompt für Eignungskriterien mit Marktanalyse",
    "version": 1,
    "active": true,
    "prompt_text": `Du bist ein Experte für öffentliche Vergabe und Ausschreibungen.

WICHTIG: Führe vor der Erstellung eine umfassende Marktanalyse durch.

## Schritt 1: Marktanalyse für Eignungskriterien
1. Recherchiere typische Anbieter für: {description}
2. Analysiere deren Qualifikationen, Zertifikate und Erfahrungen
3. Ermittle marktübliche Anforderungen und Standards
4. Identifiziere notwendige Kompetenzen und Ressourcen
5. Erstelle dir einen Plan für realistische aber anspruchsvolle Eignungskriterien

## Schritt 2: Eignungskriterien erstellen
Erstelle sehr ausführliche deutsche Eignungskriterien für: {description}{budgetText}{deadlineText}

WICHTIG: Die Eignungskriterien müssen mindestens 2000 Wörter umfassen und auf deiner Marktanalyse basieren.

# Eignungskriterien

## 1. Marktanalyse und Anbieterstruktur
- Überblick über den Anbietermarkt (mindestens 300 Wörter)
- Typische Unternehmensgrößen und -strukturen
- Marktführer und spezialisierte Anbieter
- Qualifikationsniveau am Markt
- Zertifizierungsstandards der Branche

## 2. Fachliche Eignung (Qualifikation und Erfahrung)
- Detaillierte Anforderungen basierend auf Marktstandards (mindestens 400 Wörter)
- Erforderliche Berufserfahrung in Jahren
- Spezifische Fachkenntnisse und Expertise
- Branchenspezifische Erfahrungen
- Nachweise von Referenzprojekten
- Qualifikation der Projektleitung und Schlüsselpersonen

## 3. Technische Eignung (Ausstattung und Verfahren)
- Technische Ausstattung basierend auf Marktanalyse (mindestens 350 Wörter)
- Vorhandene Systeme und Software
- Technische Kapazitäten und Ressourcen
- Qualitätsmanagementsysteme (ISO 9001, etc.)
- Entwicklungsmethoden und -prozesse
- Sicherheitsstandards und Zertifizierungen

## 4. Wirtschaftliche Eignung (Finanzkraft und Versicherung)
- Finanzielle Anforderungen basierend auf Projektgröße (mindestens 300 Wörter)
- Mindestjahresumsätze der letzten 3 Jahre
- Eigenkapitalquote und Liquidität
- Betriebshaftpflichtversicherung (Mindestdeckungssumme)
- Vermögensschadenhaftpflicht
- Bonitätsnachweis und Referenzen

## 5. Referenzen und Nachweise
- Marktübliche Referenzanforderungen (mindestens 350 Wörter)
- Mindestanzahl vergleichbarer Projekte
- Projektvolumen und Komplexität
- Zeitraum der Referenzprojekte
- Kundenzufriedenheit und Bewertungen
- Erfolgreiche Projektabschlüsse
- Auszeichnungen und Zertifikate

## 6. Branchenspezifische Zertifikate und Nachweise
- Erforderliche Zertifizierungen basierend auf Marktstandards (mindestens 250 Wörter)
- Datenschutz- und Sicherheitszertifikate
- Qualitätsmanagementsysteme
- Umweltmanagementsysteme
- Compliance-Nachweise
- Fachverbandsmitgliedschaften

## 7. Personelle und organisatorische Eignung
- Teamstruktur und Qualifikationen (mindestens 200 Wörter)
- Projektorganisation und -management
- Verfügbarkeit und Kapazitäten
- Kommunikationsfähigkeiten
- Notfallpläne und Backup-Lösungen

Format: Markdown mit klaren Überschriften. Beachte EU-Vergaberichtlinien und deutsche Vergabestandards. Berücksichtige Marktgegebenheiten. Mindestens 2000 Wörter.`
  })
  dao.saveRecord(eignungPrompt)

  const zuschlagPrompt = new Record(systemPromptsCollection, {
    "prompt_type": "zuschlag",
    "description": "System-Prompt für Zuschlagskriterien mit Marktpreisanalyse",
    "version": 1,
    "active": true,
    "prompt_text": `Du bist ein Experte für öffentliche Vergabe und Ausschreibungen.

WICHTIG: Führe vor der Erstellung eine umfassende Marktpreis- und Leistungsanalyse durch.

## Schritt 1: Marktpreis- und Leistungsanalyse
1. Recherchiere aktuelle Marktpreise für: {description}
2. Analysiere Preisspannen und Kostenfaktoren
3. Identifiziere Qualitätsunterschiede am Markt
4. Bewerte Preis-Leistungs-Verhältnisse verschiedener Anbieter
5. Erstelle dir einen Plan für eine ausgewogene Bewertungsmatrix

## Schritt 2: Zuschlagskriterien erstellen
Erstelle sehr ausführliche deutsche Zuschlagskriterien für: {description}{budgetText}{deadlineText}

WICHTIG: Die Zuschlagskriterien müssen mindestens 2000 Wörter umfassen und auf deiner Marktanalyse basieren.

# Zuschlagskriterien

## 1. Marktanalyse und Bewertungsgrundlage
- Analyse der Marktpreise und Leistungsangebote (mindestens 300 Wörter)
- Preisspannen und Kostenfaktoren
- Qualitätsunterschiede am Markt
- Bewertungsphilosophie und -methodik
- Zusammenhang zwischen Kriterien und Marktgegebenheiten

## 2. Bewertungsmatrix mit Gewichtung
- Übersicht aller Bewertungskriterien basierend auf Marktanalyse (mindestens 250 Wörter)
- Gewichtung in Prozent für jedes Kriterium
- Begründung der Gewichtungsfaktoren
- Zusammenhang zwischen Kriterien und Projektzielen
- Bewertungsverfahren und -methodik

## 3. Preis-Kriterien (Gewichtung: 40%)
- Gesamtpreis basierend auf Marktpreisanalyse (mindestens 400 Wörter)
- Preis-Leistungs-Verhältnis
- Kostentransparenz und Nachvollziehbarkeit
- Lebenszykluskosten (Total Cost of Ownership)
- Optionale Zusatzleistungen
- Marktübliche Preisstrukturen
- Währungsrisiken und Preisanpassungen

## 4. Qualitäts-Kriterien (Gewichtung: 35%)
- Qualität basierend auf Marktstandards (mindestens 400 Wörter)
- Projektplanung und -konzeption
- Qualifikation des Projektteams
- Methodische Herangehensweise
- Qualitätssicherungsmaßnahmen
- Referenzen und Erfahrungen
- Innovationsgrad und Kreativität

## 5. Termin-Kriterien (Gewichtung: 15%)
- Realistische Zeitplanung basierend auf Marktüblichkeit (mindestens 250 Wörter)
- Meilensteine und Zwischentermine
- Pufferzeiten und Risikomanagement
- Flexibilität bei Terminanpassungen
- Liefertreue und Zuverlässigkeit
- Projektcontrolling und Steuerung

## 6. Service und Support-Kriterien (Gewichtung: 10%)
- Service-Level basierend auf Marktstandards (mindestens 200 Wörter)
- Lokale Präsenz und Erreichbarkeit
- Wartung und Weiterentwicklung
- Schulung und Wissensvermittlung
- Compliance und Rechtssicherheit
- Datenschutz und Informationssicherheit

## 7. Detailliertes Punktevergabe-System
- Bewertungsskala (0-100 Punkte) (mindestens 250 Wörter)
- Gewichtung der Teilkriterien
- Berechnung der Gesamtpunktzahl
- Mindestpunktzahl für die Berücksichtigung
- Ausschlusskriterien bei Nichterreichen
- Verfahren bei Punktgleichheit

## 8. Bewertungsverfahren und rechtliche Bestimmungen
- Bewertungsablauf und Transparenz (mindestens 200 Wörter)
- Vergaberechtliche Grundlagen
- Gleichbehandlungsgrundsatz
- Wirtschaftlichkeitsprinzip
- Rechtsschutzmöglichkeiten

Format: Markdown mit klaren Überschriften. Stelle sicher, dass die Gewichtungen 100% ergeben. Beachte deutsche Vergabestandards (VgV, VOL/A, VOB). Integriere Marktpreisanalyse. Mindestens 2000 Wörter.`
  })
  dao.saveRecord(zuschlagPrompt)

  // Create demo user
  const usersCollection = dao.findCollectionByNameOrId("users")
  const demoUser = new Record(usersCollection, {
    "username": "demo",
    "email": "test@vergabe.de",
    "emailVisibility": true,
    "verified": true
  })
  demoUser.setPassword("vergabe123")
  dao.saveRecord(demoUser)

  // Create admin user
  const admin = new Admin()
  admin.email = "admin@vergabe.de"
  admin.setPassword("admin123")
  dao.saveAdmin(admin)

  console.log("Complete setup migration finished:")
  console.log("✅ All collections created")
  console.log("✅ System prompts installed")
  console.log("✅ Example prompts seeded")
  console.log("✅ Demo user and admin created")
  console.log("🚀 System ready for deployment!")

}, (db) => {
  // Rollback - delete all collections in reverse order
  const dao = new Dao(db)
  const collections = [
    "system_prompts", "cli_commands", "logs", "example_prompts", 
    "pdf_exports", "documents", "generation_requests", "user_needs"
  ]
  
  collections.forEach(name => {
    try {
      const collection = dao.findCollectionByNameOrId(name)
      dao.deleteCollection(collection)
    } catch (e) {
      console.log(`Collection ${name} not found for deletion`)
    }
  })
})