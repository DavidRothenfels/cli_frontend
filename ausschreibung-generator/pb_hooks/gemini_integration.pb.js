/**
 * Gemini Integration - Main workflow orchestrator
 * Handles the complete document generation process
 */
routerAdd("POST", "/api/generate-documents", (c) => {
    const data = c.bind()
    
    // Validate request
    if (!data.user_need_id) {
        return c.json(400, { error: "user_need_id is required" })
    }

    try {
        // Get user need details
        const userNeed = $app.dao().findRecordById("user_needs", data.user_need_id)
        if (!userNeed) {
            return c.json(404, { error: "User need not found" })
        }

        // Get extracted context from uploaded PDFs
        const extractedContext = getExtractedContext(data.user_need_id)

        // Create generation request
        const generationRequest = $app.dao().newRecord("generation_requests", {
            user: userNeed.getString("user"),
            user_need: data.user_need_id,
            requirements: userNeed.getString("requirements"),
            extracted_context: extractedContext,
            status: "pending"
        })
        
        const savedRequest = $app.dao().saveRecord(generationRequest)

        // Start async generation process
        startDocumentGeneration(savedRequest.id, userNeed, extractedContext)

        return c.json(200, {
            request_id: savedRequest.id,
            status: "processing",
            message: "Document generation started"
        })

    } catch (error) {
        console.error("Error starting document generation:", error)
        return c.json(500, { error: "Failed to start document generation" })
    }
})

/**
 * Get extracted context from uploaded PDFs
 */
function getExtractedContext(userNeedId) {
    try {
        const uploadedDocs = $app.dao().findRecordsByFilter(
            "uploaded_documents", 
            `user_need = "${userNeedId}"`
        )
        
        if (uploadedDocs.length === 0) {
            return ""
        }

        let context = "# Referenzdokumente\n\n"
        
        uploadedDocs.forEach(doc => {
            context += `## ${doc.getString("filename")}\n`
            context += `Typ: ${doc.getString("document_type")}\n`
            context += `Inhalt:\n${doc.getString("extracted_text")}\n\n`
            context += "---\n\n"
        })

        return context
    } catch (error) {
        console.error("Error getting extracted context:", error)
        return ""
    }
}

/**
 * Start the document generation process
 */
function startDocumentGeneration(requestId, userNeed, extractedContext) {
    try {
        // Update request status
        const request = $app.dao().findRecordById("generation_requests", requestId)
        request.set("status", "processing")
        $app.dao().saveRecord(request)

        // Create initial progress record
        const progressRecord = $app.dao().newRecord("generation_progress", {
            request_id: requestId,
            step: "initializing",
            progress: 0,
            current_task: "Starting document generation",
            gemini_feedback: "Initializing Gemini process...",
            tool_calls: "[]",
            web_searches: "[]",
            errors: "",
            logs: ""
        })
        $app.dao().saveRecord(progressRecord)

        // Generate documents sequentially
        generateDocumentSequence(requestId, userNeed, extractedContext)

    } catch (error) {
        console.error("Error in document generation:", error)
        updateRequestStatus(requestId, "error", error.message)
    }
}

/**
 * Generate documents in sequence
 */
function generateDocumentSequence(requestId, userNeed, extractedContext) {
    const documentTypes = [
        { type: 'leistung', name: 'Leistungsbeschreibung' },
        { type: 'eignung', name: 'Eignungskriterien' },
        { type: 'zuschlag', name: 'Zuschlagskriterien' }
    ]

    // For demo purposes, create mock documents
    documentTypes.forEach((docType, i) => {
        const progress = Math.round(((i + 1) / documentTypes.length) * 100)
        
        // Update progress
        updateProgress(requestId, "processing", progress, `Generating ${docType.name}`, `Creating ${docType.name}`)

        // Create mock document content
        const mockContent = createMockDocument(docType.type, userNeed, extractedContext)
        
        // Save generated document
        saveGeneratedDocument(requestId, docType.type, docType.name, mockContent)
    })

    // Final completion
    updateProgress(requestId, "completed", 100, "All documents generated", "Document generation completed successfully")
    updateRequestStatus(requestId, "completed")
}

/**
 * Create mock document content for demonstration
 */
function createMockDocument(documentType, userNeed, extractedContext) {
    const title = userNeed.getString("title")
    const description = userNeed.getString("description")
    const budget = userNeed.get("budget")
    const category = userNeed.getString("category")
    
    let content = `# ${getDocumentTypeDisplayName(documentType)}: ${title}\n\n`
    
    content += `## Projektübersicht\n`
    content += `- **Titel:** ${title}\n`
    content += `- **Kategorie:** ${category}\n`
    content += `- **Budget:** ${budget} EUR\n\n`
    
    content += `## Beschreibung\n${description}\n\n`
    
    if (extractedContext) {
        content += `## Referenzkontext\n${extractedContext}\n\n`
    }
    
    switch (documentType) {
        case 'leistung':
            content += `## Leistungsumfang\n`
            content += `Die zu erbringende Leistung umfasst...\n\n`
            content += `## Technische Anforderungen\n`
            content += `- Anforderung 1\n- Anforderung 2\n- Anforderung 3\n\n`
            break
        case 'eignung':
            content += `## Fachliche Eignung\n`
            content += `Der Auftragnehmer muss folgende Qualifikationen nachweisen...\n\n`
            content += `## Wirtschaftliche Eignung\n`
            content += `- Umsatznachweis der letzten 3 Jahre\n- Referenzprojekte\n\n`
            break
        case 'zuschlag':
            content += `## Bewertungskriterien\n`
            content += `- Preis (60%)\n- Qualität (25%)\n- Termine (15%)\n\n`
            content += `## Gewichtung\n`
            content += `Das wirtschaftlichste Angebot erhält den Zuschlag...\n\n`
            break
    }
    
    content += `\n---\n`
    content += `*Automatisch generiert am ${new Date().toLocaleString('de-DE')} durch Gemini CLI*`
    
    return content
}

function getDocumentTypeDisplayName(type) {
    const typeNames = {
        'leistung': 'Leistungsbeschreibung',
        'eignung': 'Eignungskriterien',
        'zuschlag': 'Zuschlagskriterien'
    }
    return typeNames[type] || type
}

/**
 * Save generated document
 */
function saveGeneratedDocument(requestId, type, title, content) {
    try {
        const document = $app.dao().newRecord("documents", {
            request_id: requestId,
            title: title,
            content: content,
            type: type,
            created_by: "gemini-cli"
        })
        
        $app.dao().saveRecord(document)
        console.log(`Saved document: ${title} for request ${requestId}`)
        
    } catch (error) {
        console.error("Error saving document:", error)
        throw error
    }
}

/**
 * Update progress record
 */
function updateProgress(requestId, status, progress, task, feedback) {
    try {
        const progressRecord = $app.dao().findFirstRecordByFilter(
            "generation_progress", 
            `request_id = "${requestId}"`
        )
        
        if (progressRecord) {
            progressRecord.set("step", status)
            progressRecord.set("progress", progress)
            progressRecord.set("current_task", task)
            progressRecord.set("gemini_feedback", feedback)
            $app.dao().saveRecord(progressRecord)
        }
    } catch (error) {
        console.error("Error updating progress:", error)
    }
}

/**
 * Update request status
 */
function updateRequestStatus(requestId, status, error = null) {
    try {
        const request = $app.dao().findRecordById("generation_requests", requestId)
        request.set("status", status)
        if (error) {
            request.set("error_message", error)
        }
        $app.dao().saveRecord(request)
    } catch (err) {
        console.error("Error updating request status:", err)
    }
}

/**
 * Get generation status endpoint
 */
routerAdd("GET", "/api/generation-status/:requestId", (c) => {
    const requestId = c.pathParam("requestId")
    
    try {
        const request = $app.dao().findRecordById("generation_requests", requestId)
        const progress = $app.dao().findFirstRecordByFilter(
            "generation_progress", 
            `request_id = "${requestId}"`
        )
        
        let response = {
            request_id: requestId,
            status: request.getString("status"),
            progress: 0,
            current_task: "Initializing",
            gemini_feedback: "",
            documents: []
        }

        if (progress) {
            response.progress = progress.get("progress")
            response.current_task = progress.getString("current_task")
            response.gemini_feedback = progress.getString("gemini_feedback")
            response.tool_calls = progress.getString("tool_calls")
            response.web_searches = progress.getString("web_searches")
            response.errors = progress.getString("errors")
        }

        // Get generated documents
        const documents = $app.dao().findRecordsByFilter(
            "documents", 
            `request_id = "${requestId}"`
        )
        
        response.documents = documents.map(doc => ({
            id: doc.id,
            title: doc.getString("title"),
            type: doc.getString("type"),
            created: doc.getString("created")
        }))

        return c.json(200, response)

    } catch (error) {
        console.error("Error getting generation status:", error)
        return c.json(500, { error: "Failed to get generation status" })
    }
})

/**
 * Download document endpoint
 */
routerAdd("GET", "/api/download-document/:documentId", (c) => {
    const documentId = c.pathParam("documentId")
    
    try {
        const document = $app.dao().findRecordById("documents", documentId)
        if (!document) {
            return c.json(404, { error: "Document not found" })
        }

        const content = document.getString("content")
        const filename = `${document.getString("title")}.md`

        c.response().header().set("Content-Type", "text/markdown")
        c.response().header().set("Content-Disposition", `attachment; filename="${filename}"`)
        
        return c.string(200, content)

    } catch (error) {
        console.error("Error downloading document:", error)
        return c.json(500, { error: "Failed to download document" })
    }
})

/**
 * Health check endpoint
 */
routerAdd("GET", "/api/gemini-health", (c) => {
    try {
        return c.json(200, {
            status: "healthy",
            active_processes: 0,
            rate_limit_remaining: 60,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        return c.json(500, {
            status: "error",
            error: error.message,
            timestamp: new Date().toISOString()
        })
    }
})