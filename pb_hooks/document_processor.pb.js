/**
 * PocketBase Hook for Document Processing
 * Handles document storage and metadata management
 */

// Collection schema for uploaded documents
const uploadedDocumentsSchema = {
    name: "uploaded_documents",
    fields: [
        {
            name: "filename",
            type: "text",
            required: true,
            options: {
                max: 255
            }
        },
        {
            name: "original_file",
            type: "file",
            required: true,
            options: {
                maxSelect: 1,
                maxSize: 10485760, // 10MB
                mimeTypes: ["application/pdf"]
            }
        },
        {
            name: "document_type",
            type: "select",
            options: {
                values: [
                    "leistungsbeschreibung",
                    "eignungskriterien", 
                    "zuschlagskriterien",
                    "unknown"
                ]
            }
        },
        {
            name: "confidence",
            type: "number",
            options: {
                min: 0,
                max: 1
            }
        },
        {
            name: "extracted_text",
            type: "text"
        },
        {
            name: "excerpt",
            type: "text",
            options: {
                max: 500
            }
        },
        {
            name: "metadata",
            type: "json"
        },
        {
            name: "file_size",
            type: "number"
        },
        {
            name: "processing_status",
            type: "select",
            options: {
                values: [
                    "pending",
                    "processing", 
                    "completed",
                    "failed"
                ]
            }
        },
        {
            name: "error_message",
            type: "text"
        }
    ]
};

// Collection schema for generated documents
const generatedDocumentsSchema = {
    name: "generated_documents",
    fields: [
        {
            name: "title",
            type: "text",
            required: true
        },
        {
            name: "document_type",
            type: "select",
            required: true,
            options: {
                values: [
                    "leistungsbeschreibung",
                    "eignungskriterien",
                    "zuschlagskriterien"
                ]
            }
        },
        {
            name: "content",
            type: "text",
            required: true
        },
        {
            name: "source_documents",
            type: "relation",
            options: {
                collectionId: "uploaded_documents",
                maxSelect: 10
            }
        },
        {
            name: "generation_prompt",
            type: "text"
        },
        {
            name: "ai_model",
            type: "text"
        },
        {
            name: "generation_metadata",
            type: "json"
        }
    ]
};

// Initialize collections on startup
onStart(() => {
    console.log("Initializing document processor collections...");
    
    try {
        // Create uploaded_documents collection if it doesn't exist
        if (!$app.dao().findCollectionByNameOrId("uploaded_documents")) {
            const uploadedCollection = new Collection();
            uploadedCollection.name = uploadedDocumentsSchema.name;
            uploadedCollection.type = "base";
            uploadedCollection.schema = uploadedDocumentsSchema.fields;
            
            $app.dao().saveCollection(uploadedCollection);
            console.log("Created uploaded_documents collection");
        }
        
        // Create generated_documents collection if it doesn't exist
        if (!$app.dao().findCollectionByNameOrId("generated_documents")) {
            const generatedCollection = new Collection();
            generatedCollection.name = generatedDocumentsSchema.name;
            generatedCollection.type = "base";
            generatedCollection.schema = generatedDocumentsSchema.fields;
            
            $app.dao().saveCollection(generatedCollection);
            console.log("Created generated_documents collection");
        }
        
    } catch (error) {
        console.error("Error initializing collections:", error);
    }
});

// API endpoint for document processing
routerAdd("POST", "/api/process-document", (c) => {
    const data = $apis.requestInfo(c);
    
    try {
        // Validate request data
        if (!data.data || !data.data.filename) {
            return c.json(400, {
                error: "Missing required fields"
            });
        }
        
        // Create document record
        const collection = $app.dao().findCollectionByNameOrId("uploaded_documents");
        const record = new Record(collection);
        
        // Set document data
        record.set("filename", data.data.filename);
        record.set("document_type", data.data.documentType || "unknown");
        record.set("confidence", data.data.confidence || 0);
        record.set("extracted_text", data.data.text || "");
        record.set("excerpt", data.data.excerpt || "");
        record.set("file_size", data.data.fileSize || 0);
        record.set("processing_status", "completed");
        
        // Set metadata
        if (data.data.metadata) {
            record.set("metadata", JSON.stringify(data.data.metadata));
        }
        
        // Save record
        $app.dao().saveRecord(record);
        
        return c.json(200, {
            id: record.id,
            message: "Document processed successfully"
        });
        
    } catch (error) {
        console.error("Error processing document:", error);
        return c.json(500, {
            error: "Internal server error"
        });
    }
});

// API endpoint for retrieving processed documents
routerAdd("GET", "/api/processed-documents", (c) => {
    try {
        const records = $app.dao().findRecordsByExpr("uploaded_documents", 
            $dbx.exp("processing_status = 'completed'"));
        
        const documents = records.map(record => ({
            id: record.id,
            filename: record.get("filename"),
            documentType: record.get("document_type"),
            confidence: record.get("confidence"),
            excerpt: record.get("excerpt"),
            fileSize: record.get("file_size"),
            metadata: record.get("metadata"),
            created: record.created,
            updated: record.updated
        }));
        
        return c.json(200, {
            documents: documents
        });
        
    } catch (error) {
        console.error("Error retrieving documents:", error);
        return c.json(500, {
            error: "Internal server error"
        });
    }
});

// API endpoint for document generation
routerAdd("POST", "/api/generate-document", (c) => {
    const data = $apis.requestInfo(c);
    
    try {
        // Validate request data
        if (!data.data || !data.data.title || !data.data.documentType) {
            return c.json(400, {
                error: "Missing required fields"
            });
        }
        
        // Create generated document record
        const collection = $app.dao().findCollectionByNameOrId("generated_documents");
        const record = new Record(collection);
        
        // Set document data
        record.set("title", data.data.title);
        record.set("document_type", data.data.documentType);
        record.set("content", data.data.content || "");
        record.set("generation_prompt", data.data.prompt || "");
        record.set("ai_model", data.data.aiModel || "");
        
        // Set source documents if provided
        if (data.data.sourceDocuments && data.data.sourceDocuments.length > 0) {
            record.set("source_documents", data.data.sourceDocuments);
        }
        
        // Set generation metadata
        if (data.data.metadata) {
            record.set("generation_metadata", JSON.stringify(data.data.metadata));
        }
        
        // Save record
        $app.dao().saveRecord(record);
        
        return c.json(200, {
            id: record.id,
            message: "Document generated successfully"
        });
        
    } catch (error) {
        console.error("Error generating document:", error);
        return c.json(500, {
            error: "Internal server error"
        });
    }
});

// Hook for document updates
onRecordAfterUpdateRequest((e) => {
    if (e.record.collection().name === "uploaded_documents") {
        console.log("Document updated:", e.record.get("filename"));
        
        // Could trigger additional processing here
        // e.g., AI document analysis, notifications, etc.
    }
});

// Hook for document deletion
onRecordAfterDeleteRequest((e) => {
    if (e.record.collection().name === "uploaded_documents") {
        console.log("Document deleted:", e.record.get("filename"));
        
        // Clean up generated documents that reference this document
        try {
            const generatedDocs = $app.dao().findRecordsByExpr("generated_documents",
                $dbx.exp("source_documents ~ {:docId}", {docId: e.record.id}));
            
            generatedDocs.forEach(doc => {
                console.log("Cleaning up generated document:", doc.get("title"));
                // Update or delete generated documents as needed
            });
            
        } catch (error) {
            console.error("Error cleaning up generated documents:", error);
        }
    }
});

// Health check endpoint
routerAdd("GET", "/api/health", (c) => {
    return c.json(200, {
        status: "healthy",
        timestamp: new Date().toISOString(),
        collections: {
            uploaded_documents: !!$app.dao().findCollectionByNameOrId("uploaded_documents"),
            generated_documents: !!$app.dao().findCollectionByNameOrId("generated_documents")
        }
    });
});

console.log("Document processor hook loaded successfully");