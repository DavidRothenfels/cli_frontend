/**
 * Autonomer Vergabedokument-Generator
 * Gemini CLI arbeitet vollständig autonom
 */

onRecordAfterCreateRequest((e) => {
    console.log(`Neuer Generierungsauftrag empfangen: ${e.record.id}`)

    try {
        // Master-Prompt laden
        const masterPromptTemplate = $os.readFile("pb_hooks/views/prompts/system/master_prompt.txt")
        
        // Request ID in Prompt einsetzen
        const prompt = masterPromptTemplate.replace('{{REQUEST_ID}}', e.record.id)
        
        // API Key prüfen
        const apiKey = $os.getenv("GEMINI_API_KEY")
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY ist nicht gesetzt")
        }

        // Robuste Gemini CLI Ausführung mit explizitem API-Key
        const cmd = `GEMINI_API_KEY="${apiKey}" echo "${prompt.replace(/"/g, '\\"')}" | gemini chat --autonomous`
        
        // Im Hintergrund starten mit vollständigem Error-Logging
        setTimeout(() => {
            try {
                const result = $os.exec("sh", "-c", cmd)
                console.log(`Gemini CLI für Auftrag ${e.record.id} gestartet`)
                if (result && result.trim()) {
                    console.log(`Gemini CLI Output: ${result.substring(0, 200)}...`)
                }
            } catch (err) {
                console.error(`Fehler beim Starten der Gemini CLI für Auftrag ${e.record.id}:`, err)
                console.error(`Command war: ${cmd.substring(0, 100)}...`)
                
                // Request Status auf error setzen
                try {
                    const request = $app.dao().findRecordById("generation_requests", e.record.id)
                    request.set("status", "error")
                    $app.dao().saveRecord(request)
                } catch (dbErr) {
                    console.error(`Zusätzlicher DB-Fehler:`, dbErr)
                }
            }
        }, 100)

    } catch (error) {
        console.error(`Fehler im autonomen Hook für ${e.record.id}:`, error)
        
        // Fallback: Request als error markieren
        try {
            const request = $app.dao().findRecordById("generation_requests", e.record.id)
            request.set("status", "error")
            $app.dao().saveRecord(request)
        } catch (dbErr) {
            console.error(`DB-Fallback Fehler:`, dbErr)
        }
    }
}, "generation_requests")