/// <reference path="../pb_data/types.d.ts" />

// Helper functions (defined first to avoid hoisting issues)
function getCategoryName(category) {
    const names = {
        'it': 'IT-Dienstleistungen',
        'bau': 'Bauleistungen',
        'beratung': 'Beratungsleistungen'
    }
    return names[category] || category
}

function getMainServices(category) {
    const services = {
        'it': `- Konzeption und Planung der IT-Lösung
- Implementierung und Konfiguration
- Testing und Qualitätssicherung
- Dokumentation und Schulung
- Migration und Datenübernahme`,
        'bau': `- Planung und Projektierung
- Bauausführung nach Vorgabe
- Materiallieferung und -einbau
- Qualitätskontrolle und Abnahme
- Gewährleistung und Nachbesserung`,
        'beratung': `- Analyse der Ausgangssituation
- Entwicklung von Lösungskonzepten
- Umsetzungsbegleitung
- Schulung und Wissenstransfer
- Erfolgskontrolle und Optimierung`
    }
    return services[category] || '- Leistungen nach Spezifikation'
}

function getQualityRequirements(category) {
    const requirements = {
        'it': `- Einhaltung aktueller IT-Sicherheitsstandards
- Kompatibilität mit vorhandener IT-Infrastruktur
- Skalierbarkeit und Zukunftssicherheit
- Benutzerfreundlichkeit und Ergonomie`,
        'bau': `- Einhaltung der Bauordnung und Normen
- Verwendung zugelassener Materialien
- Fachgerechte Ausführung nach Handwerksregeln
- Umwelt- und Nachhaltigkeitsaspekte`,
        'beratung': `- Methodische Kompetenz und Expertise
- Branchen- und Fachkenntnisse
- Kommunikationsfähigkeit und Didaktik
- Nachhaltigkeit der Beratungsergebnisse`
    }
    return requirements[category] || '- Fachgerechte Leistungserbringung'
}

function getFinancialRequirements(category, budget) {
    const baseRequirement = budget ? Math.round(budget * 0.5) : 50000
    return `- Jahresumsatz: Mindestens ${baseRequirement.toLocaleString('de-DE')} EUR
- Eigenkapitalquote: Mindestens 15%
- Keine Insolvenzverfahren in den letzten 3 Jahren`
}

function getPersonalRequirements(category) {
    const requirements = {
        'it': `- Projektleiter mit IT-Qualifikation (min. 3 Jahre Erfahrung)
- Entwickler/Techniker mit entsprechender Ausbildung
- Zertifizierungen in relevanten Technologien`,
        'bau': `- Bauleiter mit entsprechender Qualifikation
- Fachkräfte mit Gesellenbrief oder gleichwertiger Qualifikation
- Sicherheitsfachkraft bei größeren Projekten`,
        'beratung': `- Berater mit Hochschulabschluss oder gleichwertiger Qualifikation
- Nachweis von Weiterbildungen und Zertifizierungen
- Referenzen aus vergleichbaren Projekten`
    }
    return requirements[category] || '- Fachlich qualifiziertes Personal'
}

function getTechnicalRequirements(category) {
    const requirements = {
        'it': `- Entwicklungsumgebung und Testtools
- Projektmanagement-Software
- Sicherheitstechnische Ausstattung`,
        'bau': `- Angemessene Werkzeuge und Maschinen
- Messgeräte und Prüfausrüstung
- Sicherheitsausrüstung`,
        'beratung': `- Analysewerkzeuge und Methoden
- Präsentations- und Moderationsausstattung
- Projektmanagement-Tools`
    }
    return requirements[category] || '- Erforderliche technische Ausstattung'
}

function getCertificationRequirements(category) {
    const requirements = {
        'it': `- ISO 27001 (Informationssicherheit) oder vergleichbar
- ITIL-Zertifizierung für Service-Management
- Herstellerzertifizierungen bei spezifischen Technologien`,
        'bau': `- Qualitätsmanagementsystem (ISO 9001)
- Umweltmanagementsystem (ISO 14001) bei Bedarf
- Fachbereichsspezifische Zertifizierungen`,
        'beratung': `- Qualitätsmanagementsystem erwünscht
- Branchenspezifische Zertifizierungen
- Weiterbildungsnachweise`
    }
    return requirements[category] || '- Branchenübliche Zertifizierungen'
}

function getPriceWeight(category) {
    const weights = { 'it': 40, 'bau': 50, 'beratung': 30 }
    return weights[category] || 40
}

function getQualityWeight(category) {
    const weights = { 'it': 35, 'bau': 30, 'beratung': 40 }
    return weights[category] || 35
}

function getTimeWeight(category) {
    const weights = { 'it': 15, 'bau': 15, 'beratung': 20 }
    return weights[category] || 15
}

function getServiceWeight(category) {
    const weights = { 'it': 10, 'bau': 5, 'beratung': 10 }
    return weights[category] || 10
}

function getQualityCriteria(category) {
    const criteria = {
        'it': `- Funktionalität und Benutzerfreundlichkeit (25%)
- Sicherheit und Datenschutz (25%)
- Performance und Skalierbarkeit (25%)
- Dokumentation und Schulung (25%)`,
        'bau': `- Materialqualität und Verarbeitung (40%)
- Bauausführung und Handwerksqualität (30%)
- Terminplanung und Baustellenorganisation (20%)
- Umweltverträglichkeit (10%)`,
        'beratung': `- Methodische Kompetenz (30%)
- Fachexpertise und Branchenkenntnisse (30%)
- Kommunikation und Präsentation (20%)
- Nachhaltigkeit der Ergebnisse (20%)`
    }
    return criteria[category] || '- Allgemeine Qualitätskriterien'
}

// Document template functions
function generateLeistungsbeschreibung(userData) {
    const template = `# Leistungsbeschreibung

## 1. Allgemeine Angaben

**Projekttitel:** ${userData.title}

**Kategorie:** ${getCategoryName(userData.category)}

**Beschreibung:** ${userData.description}

${userData.budget ? `**Geschätzter Auftragswert:** ${userData.budget.toLocaleString('de-DE')} EUR (netto)` : ''}

${userData.deadline ? `**Gewünschter Leistungserbringungszeitraum:** bis ${new Date(userData.deadline).toLocaleDateString('de-DE')}` : ''}

## 2. Leistungsumfang

### 2.1 Hauptleistungen
Die zu erbringenden Leistungen umfassen:

${getMainServices(userData.category)}

### 2.2 Nebenleistungen
- Projektdokumentation
- Einweisung und Schulung
- Gewährleistung und Support

### 2.3 Besondere Anforderungen
${userData.requirements || 'Keine besonderen Anforderungen definiert.'}

## 3. Leistungsort und -zeit

**Leistungsort:** Nach Absprache

**Leistungszeit:** ${userData.deadline ? `Spätestens bis ${new Date(userData.deadline).toLocaleDateString('de-DE')}` : 'Nach Vereinbarung'}

## 4. Qualitätsanforderungen

### 4.1 Allgemeine Qualitätsstandards
- Einhaltung der einschlägigen Normen und Vorschriften
- Professionelle Ausführung nach dem Stand der Technik
- Vollständige und termingerechte Leistungserbringung

### 4.2 Spezifische Qualitätsanforderungen
${getQualityRequirements(userData.category)}

## 5. Abnahme und Gewährleistung

### 5.1 Abnahme
- Abnahme erfolgt nach vollständiger Leistungserbringung
- Behebung von Mängeln vor Abnahme
- Abnahmeprotokoll wird erstellt

### 5.2 Gewährleistung
- Gewährleistungszeit: 24 Monate ab Abnahme
- Behebung von Mängeln innerhalb angemessener Frist
- Kostenlose Nachbesserung bei Gewährleistungsansprüchen

## 6. Sonstige Bestimmungen

### 6.1 Datenschutz
- Einhaltung der DSGVO
- Vertraulichkeit der Daten
- Datensicherheit gewährleisten

### 6.2 Urheberrecht
- Übertragung der Nutzungsrechte an den Auftraggeber
- Freistellung von Rechten Dritter

---
*Erstellt am: ${new Date().toLocaleDateString('de-DE')}*`

    return template
}

function generateEignungskriterien(userData) {
    const template = `# Eignungskriterien

## 1. Wirtschaftliche und finanzielle Leistungsfähigkeit

### 1.1 Nachweis der wirtschaftlichen Leistungsfähigkeit
**Erforderlich:**
- Jahresumsatz der letzten 3 Geschäftsjahre
- Eigenkapitalnachweis
- Bonität und Zahlungsfähigkeit

**Mindestanforderungen:**
${getFinancialRequirements(userData.category, userData.budget)}

### 1.2 Referenzen
**Erforderlich:**
- Mindestens 3 Referenzprojekte der letzten 3 Jahre
- Vergleichbare Projekte in Umfang und Komplexität
- Positive Referenzbewertungen

## 2. Technische und berufliche Leistungsfähigkeit

### 2.1 Qualifikation des Personals
**Erforderlich:**
${getPersonalRequirements(userData.category)}

### 2.2 Technische Ausstattung
**Erforderlich:**
${getTechnicalRequirements(userData.category)}

### 2.3 Zertifizierungen
**Erforderlich:**
${getCertificationRequirements(userData.category)}

## 3. Zuverlässigkeit

### 3.1 Gewerbeanmeldung
- Gültiger Gewerbeschein
- Eintragung in die Handwerksrolle (falls erforderlich)

### 3.2 Steuerliche Unbedenklichkeit
- Unbedenklichkeitsbescheinigung des Finanzamts
- Nachweis über Sozialversicherungsbeiträge

### 3.3 Sonstige Nachweise
- Führungszeugnis der Geschäftsführung
- Keine Insolvenzverfahren
- Keine wesentlichen Vertragsverletzungen

## 4. Nachweise

### 4.1 Einzureichende Unterlagen
- Eigenerklärung (Einheitliches Europäisches Eigenerklärungsformular)
- Umsatznachweise der letzten 3 Jahre
- Referenzliste mit Ansprechpartnern
- Personalqualifikationsnachweise
- Zertifikate und Bescheinigungen

### 4.2 Bewertung
Die Eignungsprüfung erfolgt als Ja/Nein-Entscheidung:
- **Geeignet:** Alle Mindestanforderungen erfüllt
- **Nicht geeignet:** Eine oder mehrere Mindestanforderungen nicht erfüllt

---
*Erstellt am: ${new Date().toLocaleDateString('de-DE')}*`

    return template
}

function generateZuschlagskriterien(userData) {
    const template = `# Zuschlagskriterien

## 1. Bewertungsverfahren

**Zuschlagskriterium:** Bestes Preis-Leistungs-Verhältnis

**Bewertungsverfahren:** Nutzwertanalyse mit Gewichtung

## 2. Bewertungskriterien und Gewichtung

### 2.1 Preis (${getPriceWeight(userData.category)}%)
**Bewertung:** Niedrigster Preis = 100 Punkte

**Berechnung:** (Niedrigster Preis / Angebotspreis) × 100

**Gewichtung:** ${getPriceWeight(userData.category)}%

### 2.2 Qualität (${getQualityWeight(userData.category)}%)
**Bewertungskriterien:**
${getQualityCriteria(userData.category)}

**Bewertung:** 0-100 Punkte je Kriterium

**Gewichtung:** ${getQualityWeight(userData.category)}%

### 2.3 Termine (${getTimeWeight(userData.category)}%)
**Bewertungskriterien:**
- Lieferzeit/Ausführungsdauer
- Projektplan und Meilensteine
- Flexibilität bei Terminänderungen

**Bewertung:** 0-100 Punkte

**Gewichtung:** ${getTimeWeight(userData.category)}%

### 2.4 Service (${getServiceWeight(userData.category)}%)
**Bewertungskriterien:**
- Wartung und Support
- Dokumentation
- Schulung und Einweisung
- Gewährleistung

**Bewertung:** 0-100 Punkte

**Gewichtung:** ${getServiceWeight(userData.category)}%

## 3. Bewertungsmethodik

### 3.1 Punktevergabe
- **Exzellent (90-100 Punkte):** Übertrifft die Anforderungen deutlich
- **Sehr gut (80-89 Punkte):** Übertrifft die Anforderungen
- **Gut (70-79 Punkte):** Erfüllt die Anforderungen vollständig
- **Befriedigend (60-69 Punkte):** Erfüllt die Anforderungen weitgehend
- **Ausreichend (50-59 Punkte):** Erfüllt die Mindestanforderungen
- **Mangelhaft (0-49 Punkte):** Erfüllt die Anforderungen nicht

### 3.2 Gesamtbewertung
**Formel:** Gesamtpunktzahl = Gewichtete Summe aller Kriterien

**Zuschlag:** Höchste Gesamtpunktzahl erhält den Zuschlag

---
*Erstellt am: ${new Date().toLocaleDateString('de-DE')}*`

    return template
}

// Helper function to create document records
function createDocumentRecord(userNeedId, title, content, type) {
    const documentsCollection = $app.dao().findCollectionByNameOrId("documents")
    const documentRecord = new Record(documentsCollection)
    
    documentRecord.set("request_id", userNeedId)
    documentRecord.set("title", title)
    documentRecord.set("content", content)
    documentRecord.set("type", type)
    documentRecord.set("created_by", "system")
    
    $app.dao().saveRecord(documentRecord)
    return documentRecord
}

// Document generation API endpoint
routerAdd("POST", "/api/generate-documents", (c) => {
    try {
        // Get request data using PocketBase's method
        const data = $apis.requestInfo(c).data
        
        // Validate input data
        if (!data.title || !data.description || !data.category) {
            return c.json(400, {
                error: "Fehlende Pflichtfelder: title, description, category sind erforderlich"
            })
        }
        
        // Validate category
        const validCategories = ['it', 'bau', 'beratung']
        if (!validCategories.includes(data.category)) {
            return c.json(400, {
                error: "Ungültige Kategorie. Erlaubt sind: " + validCategories.join(', ')
            })
        }
        
        // Create user need record
        const userNeedsCollection = $app.dao().findCollectionByNameOrId("user_needs")
        const userNeedRecord = new Record(userNeedsCollection)
        
        userNeedRecord.set("title", data.title)
        userNeedRecord.set("description", data.description)
        userNeedRecord.set("category", data.category)
        
        if (data.budget) {
            userNeedRecord.set("budget", data.budget)
        }
        
        if (data.deadline) {
            userNeedRecord.set("deadline", data.deadline)
        }
        
        if (data.requirements) {
            userNeedRecord.set("requirements", data.requirements)
        }
        
        $app.dao().saveRecord(userNeedRecord)
        
        // Create generation request
        const generationRequestsCollection = $app.dao().findCollectionByNameOrId("generation_requests")
        const generationRequest = new Record(generationRequestsCollection)
        
        generationRequest.set("user_need", userNeedRecord.id)
        generationRequest.set("status", "processing")
        
        $app.dao().saveRecord(generationRequest)
        
        // Generate documents using templates
        const documents = []
        
        try {
            // Generate Leistungsbeschreibung
            const leistungsDoc = generateLeistungsbeschreibung(data)
            const leistungsRecord = createDocumentRecord(userNeedRecord.id, "Leistungsbeschreibung", leistungsDoc, "leistung")
            documents.push({
                id: leistungsRecord.id,
                title: "Leistungsbeschreibung",
                type: "leistung",
                content: leistungsDoc
            })
            
            // Generate Eignungskriterien
            const eignungsDoc = generateEignungskriterien(data)
            const eignungsRecord = createDocumentRecord(userNeedRecord.id, "Eignungskriterien", eignungsDoc, "eignung")
            documents.push({
                id: eignungsRecord.id,
                title: "Eignungskriterien",
                type: "eignung",
                content: eignungsDoc
            })
            
            // Generate Zuschlagskriterien
            const zuschlagsDoc = generateZuschlagskriterien(data)
            const zuschlagsRecord = createDocumentRecord(userNeedRecord.id, "Zuschlagskriterien", zuschlagsDoc, "zuschlag")
            documents.push({
                id: zuschlagsRecord.id,
                title: "Zuschlagskriterien",
                type: "zuschlag",
                content: zuschlagsDoc
            })
            
            // Update generation request status
            generationRequest.set("status", "completed")
            $app.dao().saveRecord(generationRequest)
            
            return c.json(200, {
                message: "Dokumente erfolgreich generiert",
                userNeedId: userNeedRecord.id,
                generationRequestId: generationRequest.id,
                documents: documents
            })
            
        } catch (error) {
            // Update generation request with error
            generationRequest.set("status", "error")
            generationRequest.set("error_message", error.message)
            $app.dao().saveRecord(generationRequest)
            
            throw error
        }
        
    } catch (error) {
        console.error("Document generation error:", error)
        return c.json(500, {
            error: "Fehler bei der Dokumentgenerierung: " + error.message
        })
    }
})
