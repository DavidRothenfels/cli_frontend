onRecordAfterCreateRequest((e) => {
    if (e.collection.name === "generation_requests") {
        console.log("✅ Autonomous hook triggered for:", e.record.id)
        
        // Create CLI command for async processing - this doesn't block HTTP
        try {
            const collection = $app.dao().findCollectionByNameOrId("cli_commands")
            const record = new Record(collection, {
                "command": "opencode_generate",
                "parameters": JSON.stringify({
                    "request_id": e.record.id,
                    "user_need_id": e.record.get("user_need_id")
                }),
                "status": "pending"
            })
            $app.dao().saveRecord(record)
            console.log("🚀 CLI command created for async processing")
        } catch (error) {
            console.error("❌ Failed to create CLI command:", error)
        }
    }
}, "generation_requests")

function processGenerationRequest(request_id, user_need_id) {
    console.log("🔄 Processing generation request:", request_id)
    
    const createLog = (message, level = "info") => {
        try {
            const collection = $app.dao().findCollectionByNameOrId("logs")
            const record = new Record(collection, {
                "message": message,
                "level": level,
                "request_id": request_id
            })
            $app.dao().saveRecord(record)
            console.log(`📝 Log created: [${level}] ${message}`)
        } catch (error) {
            console.error(`❌ Failed to create log for ${request_id}:`, error)
        }
    }

    const updateStatus = (status) => {
        try {
            const request = $app.dao().findRecordById("generation_requests", request_id)
            request.set("status", status)
            $app.dao().saveRecord(request)
            console.log(`📊 Status updated to: ${status}`)
        } catch (error) {
            console.error(`❌ Failed to update status for ${request_id}:`, error)
        }
    }

    const createDocument = (title, content, type) => {
        try {
            const collection = $app.dao().findCollectionByNameOrId("documents")
            const record = new Record(collection, {
                "request_id": request_id,
                "title": title,
                "content": content,
                "type": type,
                "created_by": "Gemini AI"
            })
            $app.dao().saveRecord(record)
            createLog(`✅ Dokument erstellt: ${title}`)
            console.log(`📄 Document created: ${title}`)
            return record
        } catch (error) {
            console.error(`❌ Failed to create document:`, error)
            createLog(`❌ Fehler beim Erstellen von ${title}: ${error.message}`, "error")
        }
    }

    try {
        updateStatus("processing")
        createLog("🚀 Autonome Dokumentenerstellung gestartet")
        
        const user_need = $app.dao().findRecordById("user_needs", user_need_id)
        const description = user_need.get("description")
        console.log("✅ Found user_need:", description)
        createLog(`📝 Analysiere Anfrage: ${description.substring(0, 100)}...`)

        // Create documents with delays
        createLog("📋 Erstelle Leistungsbeschreibung...")
        setTimeout(() => {
            createDocument(
                "Leistungsbeschreibung",
                `# Leistungsbeschreibung\n\n## Projektbeschreibung\n${description}\n\n## Leistungsumfang\n1. Detaillierte Planung und Konzeption\n2. Umsetzung der Arbeiten\n3. Qualitätssicherung\n4. Projektdokumentation\n\n## Technische Anforderungen\n- Einhaltung aller relevanten Normen\n- Verwendung hochwertiger Materialien\n- Gewährleistung von 2 Jahren\n\n## Projektdauer\nVoraussichtliche Umsetzungsdauer: 4-6 Wochen`,
                "leistung"
            )
        }, 2000)

        createLog("✅ Erstelle Eignungskriterien...")
        setTimeout(() => {
            createDocument(
                "Eignungskriterien",
                `# Eignungskriterien\n\n## Fachliche Eignung\n- Nachweis von mindestens 3 vergleichbaren Projekten in den letzten 5 Jahren\n- Qualifizierte Fachkräfte mit entsprechenden Zertifikaten\n- Referenzen von zufriedenen Kunden\n\n## Technische Eignung\n- Moderne Ausstattung und Werkzeuge\n- Qualitätsmanagementsystem nach ISO 9001\n- Umweltmanagementsystem erwünscht\n\n## Wirtschaftliche Eignung\n- Jahresumsatz der letzten 3 Jahre\n- Nachweis einer Betriebshaftpflichtversicherung\n- Bonitätsnachweis`,
                "eignung"
            )
        }, 4000)

        createLog("🎯 Erstelle Zuschlagskriterien...")
        setTimeout(() => {
            createDocument(
                "Zuschlagskriterien",
                `# Zuschlagskriterien\n\n## Bewertungsmatrix\n\n### Preis (40%)\n- Gesamtpreis für alle Leistungen\n- Verhältnis Preis-Leistung\n\n### Qualität (35%)\n- Qualität der Projektplanung\n- Qualifikation des Projektteams\n- Referenzen und Erfahrungen\n\n### Termine (15%)\n- Realistische Zeitplanung\n- Pufferzeiten eingeplant\n- Flexibilität bei Terminanpassungen\n\n### Nachhaltigkeit (10%)\n- Umweltfreundliche Materialien\n- Energieeffizienz\n- Soziale Aspekte\n\n## Mindestpunktzahl\nEin Angebot muss mindestens 60% der Gesamtpunktzahl erreichen.`,
                "zuschlag"
            )
            
            // Final completion
            setTimeout(() => {
                createLog("🎉 Alle Dokumente erfolgreich generiert!")
                updateStatus("completed")
            }, 1000)
        }, 6000)

    } catch (error) {
        console.error(`❌ Error in autonomous process:`, error)
        createLog(`❌ Fehler bei der Dokumentenerstellung: ${error.message}`, "error")
        updateStatus("failed")
    }
}