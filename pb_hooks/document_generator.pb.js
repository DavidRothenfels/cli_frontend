// Document generation system for German procurement documents

// Document template generators
function generateLeistungsbeschreibung(data) {
    const categoryTemplates = {
        "it": {
            sections: [
                "Technische Anforderungen",
                "Systemarchitektur",
                "Sicherheitsanforderungen", 
                "Integrationsmöglichkeiten",
                "Support und Wartung"
            ],
            requirements: [
                "Compliance mit DSGVO und IT-Sicherheitsgesetz",
                "Barrierefreiheit gemäß BITV 2.0",
                "Dokumentation in deutscher Sprache",
                "24/7 Support während der Gewährleistung"
            ]
        },
        "bau": {
            sections: [
                "Bauleistungen",
                "Materialanforderungen",
                "Ausführungsqualität",
                "Bauablauf und Termine",
                "Gewährleistung"
            ],
            requirements: [
                "Einhaltung der VOB/C",
                "Verwendung zertifizierter Materialien",
                "Koordination mit anderen Gewerken",
                "Baustellensicherheit nach UVV"
            ]
        },
        "beratung": {
            sections: [
                "Beratungsleistungen",
                "Methodisches Vorgehen",
                "Qualifikation der Berater",
                "Projektmanagement",
                "Ergebnisdokumentation"
            ],
            requirements: [
                "Nachgewiesene Expertise im Fachbereich",
                "Projektleitung durch Senior-Berater",
                "Regelmäßige Statusberichte",
                "Wissenstransfer an interne Mitarbeiter"
            ]
        }
    }
    
    const template = categoryTemplates[data.category] || categoryTemplates["beratung"]
    
    return `# Leistungsbeschreibung: ${data.title}

## 1. Allgemeine Angaben

**Auftraggeber:** [Zu ergänzen]
**Vergabestelle:** [Zu ergänzen]
**Vergabeverfahren:** Offenes Verfahren nach § 15 VgV
**Geschätzter Auftragswert:** ${data.budget ? data.budget.toLocaleString('de-DE') + ' EUR' : '[Zu ermitteln]'}
**Angebotsfrist:** ${data.deadline ? new Date(data.deadline).toLocaleDateString('de-DE') : '[Zu bestimmen]'}

## 2. Projektbeschreibung

${data.description}

## 3. Detaillierte Anforderungen

${template.sections.map(section => `### 3.${template.sections.indexOf(section) + 1} ${section}`).join('\n\n')}

## 4. Technische Spezifikationen

${data.requirements || 'Detaillierte technische Anforderungen werden in separaten Anlagen spezifiziert.'}

## 5. Besondere Anforderungen

${template.requirements.map(req => `- ${req}`).join('\n')}

## 6. Vertragsbedingungen

### 6.1 Leistungszeit
Die Leistung ist ${data.deadline ? `bis zum ${new Date(data.deadline).toLocaleDateString('de-DE')}` : 'innerhalb der vereinbarten Frist'} zu erbringen.

### 6.2 Gewährleistung
Es gelten die gesetzlichen Gewährleistungsbestimmungen.

### 6.3 Abnahme
Die Abnahme erfolgt nach vollständiger und vertragsgemäßer Leistungserbringung.

---
*Generiert am ${new Date().toLocaleDateString('de-DE')} durch Vergabedokument-Generator*`
}

function generateEignungskriterien(data) {
    const categoryRequirements = {
        "it": [
            "Zertifizierte IT-Sicherheit (ISO 27001 oder vergleichbar)",
            "Nachweis von mindestens 3 vergleichbaren Projekten in den letzten 3 Jahren",
            "Qualifizierte Projektleitung mit entsprechender Zertifizierung",
            "DSGVO-konforme Prozesse und Datenschutzbeauftragter"
        ],
        "bau": [
            "Eintragung in die Handwerksrolle oder Mitgliedschaft in der IHK",
            "Nachweis der erforderlichen Gewerbeerlaubnis",
            "Referenzen vergleichbarer Bauvorhaben",
            "Berufshaftpflichtversicherung mit Mindestdeckung"
        ],
        "beratung": [
            "Hochschulabschluss der eingesetzten Berater",
            "Nachweis mindestens 5 Jahre Berufserfahrung",
            "Branchenspezifische Zertifizierungen",
            "Berufshaftpflichtversicherung"
        ]
    }
    
    const requirements = categoryRequirements[data.category] || categoryRequirements["beratung"]
    
    return `# Eignungskriterien: ${data.title}

## 1. Grundsätzliche Hinweise

Die Eignung der Bewerber wird nach den folgenden Kriterien beurteilt. Alle Nachweise müssen in deutscher Sprache oder mit beglaubigter Übersetzung eingereicht werden.

## 2. Persönliche und gewerbliche Zuverlässigkeit

### 2.1 Ausschlussgründe
Bewerber sind von der Teilnahme ausgeschlossen, wenn:
- Ein rechtskräftiges Urteil wegen schwerer Verfehlung vorliegt
- Steuerschulden oder Sozialversicherungsbeiträge nicht entrichtet wurden
- Schwere Verfehlung bei der Berufsausübung vorliegt

### 2.2 Nachweise
- Unbedenklichkeitsbescheinigung des Finanzamts (nicht älter als 3 Monate)
- Bescheinigung der Sozialversicherungsträger
- Eidesstattliche Erklärung über weitere Ausschlussgründe

## 3. Berufliche und fachliche Leistungsfähigkeit

${requirements.map((req, index) => `### 3.${index + 1} ${req}`).join('\n\n')}

## 4. Wirtschaftliche und finanzielle Leistungsfähigkeit

### 4.1 Mindestanforderungen
- Jahresumsatz der letzten 3 Geschäftsjahre: Mindestens das 1,5-fache des Auftragswertes
- Eigenkapitalquote: Mindestens 15%
- Bürgschaftsmöglichkeit bis zur Höhe von 10% der Auftragssumme

### 4.2 Nachweise
- Bilanz der letzten 3 Geschäftsjahre
- Gewinn- und Verlustrechnung
- Bankbestätigung über Kreditlinien

## 5. Technische Leistungsfähigkeit

### 5.1 Personal und Qualifikation
${data.category === 'it' ? '- Mindestens 2 zertifizierte IT-Spezialisten im Projektteam\n- Projektleiter mit PMP oder vergleichbarer Zertifizierung' : 
  data.category === 'bau' ? '- Bauleiter mit entsprechender Qualifikation\n- Fachkräfte mit Gesellenbrief oder vergleichbarer Qualifikation' :
  '- Senior-Berater mit mindestens 10 Jahren Berufserfahrung\n- Projektleiter mit methodischer Ausbildung'}

### 5.2 Ausstattung und Referenzen
- Nachweis der erforderlichen technischen Ausstattung
- Mindestens 3 Referenzprojekte vergleichbarer Größenordnung
- Kundenbewertungen und Referenzschreiben

## 6. Bewertungsverfahren

Die Eignung wird in einem zweistufigen Verfahren geprüft:
1. **Formale Prüfung:** Vollständigkeit und Rechtzeitigkeit der Unterlagen
2. **Inhaltliche Prüfung:** Bewertung anhand der definierten Kriterien

Nur bei Erfüllung aller Mindestanforderungen erfolgt die Zulassung zur Angebotsabgabe.

---
*Generiert am ${new Date().toLocaleDateString('de-DE')} durch Vergabedokument-Generator*`
}

function generateZuschlagskriterien(data) {
    const categoryWeighting = {
        "it": {
            "Preis": 40,
            "Technische Qualität": 35,
            "Projektorganisation": 15,
            "Support und Wartung": 10
        },
        "bau": {
            "Preis": 50,
            "Qualität der Bauleistung": 30,
            "Ausführungszeit": 15,
            "Umweltfreundlichkeit": 5
        },
        "beratung": {
            "Preis": 30,
            "Fachliche Qualität": 40,
            "Methodisches Vorgehen": 20,
            "Referenzen": 10
        }
    }
    
    const weighting = categoryWeighting[data.category] || categoryWeighting["beratung"]
    
    return `# Zuschlagskriterien: ${data.title}

## 1. Grundlagen der Bewertung

Die Zuschlagserteilung erfolgt nach dem wirtschaftlichsten Angebot gemäß § 127 GWB. Die Bewertung basiert auf den nachfolgend definierten Kriterien mit ihrer jeweiligen Gewichtung.

## 2. Bewertungskriterien und Gewichtung

${Object.entries(weighting).map(([criterion, weight]) => 
    `### 2.${Object.keys(weighting).indexOf(criterion) + 1} ${criterion} (${weight}%)`
).join('\n\n')}

## 3. Detaillierte Bewertungsmatrix

### 3.1 Preis (${weighting["Preis"]}%)

**Bewertungsmethode:** Lineare Preisbewertung
- Niedrigster Preis = 100 Punkte
- Höhere Preise werden proportional abgewertet
- Formel: Punkte = (niedrigster Preis / bewerteter Preis) × 100

**Besondere Hinweise:**
- Ungewöhnlich niedrige Preise werden geprüft (§ 60 UVgO)
- Preise müssen alle Nebenkosten umfassen

### 3.2 Qualitätskriterien

${data.category === 'it' ? `
#### 3.2.1 Technische Qualität (${weighting["Technische Qualität"]}%)
- Innovationsgrad der Lösung (40%)
- Benutzerfreundlichkeit und Design (30%)
- Sicherheitskonzept (20%)
- Zukunftsfähigkeit und Erweiterbarkeit (10%)

#### 3.2.2 Projektorganisation (${weighting["Projektorganisation"]}%)
- Qualifikation des Projektteams (50%)
- Projektmanagement-Methodik (30%)
- Kommunikationskonzept (20%)

#### 3.2.3 Support und Wartung (${weighting["Support und Wartung"]}%)
- Reaktionszeiten bei Störungen (40%)
- Verfügbarkeit des Supports (30%)
- Schulungskonzept (30%)
` : data.category === 'bau' ? `
#### 3.2.1 Qualität der Bauleistung (${weighting["Qualität der Bauleistung"]}%)
- Materialqualität und Nachhaltigkeit (40%)
- Ausführungsstandard (35%)
- Gewährleistungskonzept (25%)

#### 3.2.2 Ausführungszeit (${weighting["Ausführungszeit"]}%)
- Realistische Terminplanung (60%)
- Flexibilität bei Terminverschiebungen (40%)

#### 3.2.3 Umweltfreundlichkeit (${weighting["Umweltfreundlichkeit"]}%)
- Verwendung nachhaltiger Materialien (60%)
- Energieeffizienz der Lösung (40%)
` : `
#### 3.2.1 Fachliche Qualität (${weighting["Fachliche Qualität"]}%)
- Qualifikation der Berater (40%)
- Branchenexpertise (35%)
- Innovative Lösungsansätze (25%)

#### 3.2.2 Methodisches Vorgehen (${weighting["Methodisches Vorgehen"]}%)
- Projektmethodik (50%)
- Qualitätssicherung (30%)
- Wissenstransfer (20%)

#### 3.2.3 Referenzen (${weighting["Referenzen"]}%)
- Qualität vergleichbarer Projekte (60%)
- Kundenzufriedenheit (40%)
`}

## 4. Bewertungsverfahren

### 4.1 Bewertungsmaßstab
- **Sehr gut (90-100 Punkte):** Deutlich über den Anforderungen
- **Gut (75-89 Punkte):** Über den Anforderungen  
- **Befriedigend (60-74 Punkte):** Entspricht den Anforderungen
- **Ausreichend (50-59 Punkte):** Knapp ausreichend
- **Mangelhaft (0-49 Punkte):** Unzureichend

### 4.2 Gesamtbewertung
Die Gesamtpunktzahl errechnet sich aus:
**Gesamtpunkte = Σ (Einzelpunkte × Gewichtung)**

### 4.3 Zuschlagserteilung
Der Zuschlag wird auf das Angebot mit der höchsten Gesamtpunktzahl erteilt.

## 5. Formale Anforderungen

### 5.1 Angebotspräsentation
${data.category === 'beratung' ? '- Präsentation des Lösungskonzepts (max. 30 Min.)\n- Fragenrunde mit dem Bieterteam' : '- Schriftliches Angebot mit detaillierter Aufschlüsselung\n- Technische Dokumentation'}

### 5.2 Nachweise
- Alle Bewertungskriterien müssen durch Nachweise belegt werden
- Unvollständige Angebote können ausgeschlossen werden

## 6. Hinweise für Bieter

- Angebote müssen alle Bewertungskriterien adressieren
- Pauschale Aussagen ohne Nachweis werden negativ bewertet
- Bei Rückfragen wenden Sie sich an: [Kontaktstelle einfügen]

**Angebotsfrist:** ${data.deadline ? new Date(data.deadline).toLocaleDateString('de-DE') : '[Zu bestimmen]'}
**Geschätzter Auftragswert:** ${data.budget ? data.budget.toLocaleString('de-DE') + ' EUR' : '[Zu ermitteln]'}

---
*Generiert am ${new Date().toLocaleDateString('de-DE')} durch Vergabedokument-Generator*`
}

// Main document generation API endpoint
routerAdd("POST", "/api/generate-documents", (e) => {
    try {
        const data = $requestInfo(e).data
        
        // Validate required fields
        if (!data.title || !data.description || !data.category) {
            return e.json(400, {
                "error": "Fehlende Pflichtfelder",
                "details": "Titel, Beschreibung und Kategorie sind erforderlich"
            })
        }
        
        // Create user need record
        const userNeedData = {
            "title": data.title,
            "description": data.description,
            "budget": data.budget || 0,
            "deadline": data.deadline || "",
            "category": data.category,
            "requirements": data.requirements || ""
        }
        
        const userNeedRecord = new Record($app.dao().findCollectionByNameOrId("user_needs"))
        userNeedRecord.load(userNeedData)
        $app.dao().saveRecord(userNeedRecord)
        
        // Create generation request
        const requestData = {
            "user_need": userNeedRecord.id,
            "status": "processing"
        }
        
        const generationRecord = new Record($app.dao().findCollectionByNameOrId("generation_requests"))
        generationRecord.load(requestData)
        $app.dao().saveRecord(generationRecord)
        
        // Generate documents
        const documents = []
        
        // Generate Leistungsbeschreibung
        const leistungDoc = generateLeistungsbeschreibung(data)
        const leistungRecord = new Record($app.dao().findCollectionByNameOrId("documents"))
        leistungRecord.load({
            "request_id": userNeedRecord.id,
            "title": `Leistungsbeschreibung: ${data.title}`,
            "content": leistungDoc,
            "type": "leistung",
            "created_by": "document_generator"
        })
        $app.dao().saveRecord(leistungRecord)
        documents.push(leistungRecord)
        
        // Generate Eignungskriterien
        const eignungDoc = generateEignungskriterien(data)
        const eignungRecord = new Record($app.dao().findCollectionByNameOrId("documents"))
        eignungRecord.load({
            "request_id": userNeedRecord.id,
            "title": `Eignungskriterien: ${data.title}`,
            "content": eignungDoc,
            "type": "eignung",
            "created_by": "document_generator"
        })
        $app.dao().saveRecord(eignungRecord)
        documents.push(eignungRecord)
        
        // Generate Zuschlagskriterien
        const zuschlagDoc = generateZuschlagskriterien(data)
        const zuschlagRecord = new Record($app.dao().findCollectionByNameOrId("documents"))
        zuschlagRecord.load({
            "request_id": userNeedRecord.id,
            "title": `Zuschlagskriterien: ${data.title}`,
            "content": zuschlagDoc,
            "type": "zuschlag",
            "created_by": "document_generator"
        })
        $app.dao().saveRecord(zuschlagRecord)
        documents.push(zuschlagRecord)
        
        // Update generation request status
        generationRecord.set("status", "completed")
        $app.dao().saveRecord(generationRecord)
        
        // Return success response
        return e.json(200, {
            "success": true,
            "message": "Dokumente erfolgreich generiert",
            "user_need_id": userNeedRecord.id,
            "generation_request_id": generationRecord.id,
            "documents": documents.map(doc => ({
                "id": doc.id,
                "title": doc.getString("title"),
                "type": doc.getString("type"),
                "created": doc.getString("created")
            }))
        })
        
    } catch (error) {
        console.log("Document generation error:", error)
        
        return e.json(500, {
            "error": "Fehler bei der Dokumentgenerierung",
            "details": error.toString()
        })
    }
})

// Get documents by user need ID
routerAdd("GET", "/api/documents/:needId", (e) => {
    try {
        const needId = e.pathParam("needId")
        
        const documents = $app.dao().findRecordsByFilter(
            "documents",
            `request_id = "${needId}"`,
            "-created",
            30
        )
        
        return e.json(200, {
            "documents": documents.map(doc => ({
                "id": doc.id,
                "title": doc.getString("title"),
                "type": doc.getString("type"),
                "content": doc.getString("content"),
                "created": doc.getString("created")
            }))
        })
        
    } catch (error) {
        return e.json(500, {
            "error": "Fehler beim Laden der Dokumente",
            "details": error.toString()
        })
    }
})

// Download document as markdown file
routerAdd("GET", "/api/download/:docId", (e) => {
    try {
        const docId = e.pathParam("docId")
        
        const document = $app.dao().findRecordById("documents", docId)
        if (!document) {
            return e.json(404, {"error": "Dokument nicht gefunden"})
        }
        
        const content = document.getString("content")
        const title = document.getString("title")
        const filename = `${title.replace(/[^a-zA-Z0-9\-_]/g, '_')}.md`
        
        e.response.header().set("Content-Type", "text/markdown")
        e.response.header().set("Content-Disposition", `attachment; filename="${filename}"`)
        
        return e.string(200, content)
        
    } catch (error) {
        return e.json(500, {
            "error": "Fehler beim Download",
            "details": error.toString()
        })
    }
})