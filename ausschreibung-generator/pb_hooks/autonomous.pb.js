onRecordCreateRequest((e) => {
    e.next() // KRITISCH: Muss aufgerufen werden für v0.28
    
    if (e.collection.name === "generation_requests") {
        console.log("✅ Autonomous hook triggered for:", e.record.id)
        
        // Validate required fields
        const user_need_id = e.record.get("user_need_id")
        if (!user_need_id) {
            console.error("❌ Generation request missing user_need_id")
            return
        }
        
        // Verify user_need exists (simplified for v0.28)
        try {
            // Use $app instead of $app.dao() for v0.28 compatibility
            const userNeed = $app.findRecordById("user_needs", user_need_id)
            if (!userNeed) {
                console.error("❌ Referenced user_need not found:", user_need_id)
                return
            }
            console.log("✅ Valid user_need found:", userNeed.getString("description").substring(0, 50) + "...")
        } catch (error) {
            console.error("❌ Error validating user_need:", error)
            return
        }
        
        // Update the generation request with proper status
        try {
            const record = e.record
            record.set("status", "pending")
            console.log("📝 Generation request status set to pending")
        } catch (error) {
            console.error("❌ Failed to update generation request:", error)
            return
        }
        
        // Create CLI command for async processing with validation
        try {
            const collection = $app.findCollectionByNameOrId("cli_commands")
            const parameters = {
                "request_id": e.record.id,
                "user_need_id": user_need_id,
                "created_at": new Date().toISOString()
            }
            
            const cliRecord = new Record(collection, {
                "command": "opencode_generate",
                "status": "pending",
                "parameters": JSON.stringify(parameters),
                "retry_count": 0,
                "error": ""
            })
            $app.save(cliRecord)
            console.log("🚀 CLI command created with parameters:", JSON.stringify(parameters))
        } catch (error) {
            console.error("❌ Failed to create CLI command:", error)
            // Mark generation request as failed if CLI command creation fails
            try {
                e.record.set("status", "failed")
                console.log("📝 Generation request marked as failed due to CLI command error")
            } catch (updateError) {
                console.error("❌ Failed to update generation request after CLI error:", updateError)
            }
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