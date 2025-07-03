// Initialize collections for the German procurement document generator
onModelAfterCreate((e) => {
    console.log("Starting collection initialization...")
    
    // Create user_needs collection
    const userNeedsCollection = new Collection({
        name: "user_needs",
        type: "base",
        schema: [
            {
                name: "title",
                type: "text",
                required: true,
                options: {
                    maxLength: 200
                }
            },
            {
                name: "description",
                type: "text",
                required: true,
                options: {
                    maxLength: 2000
                }
            },
            {
                name: "budget",
                type: "number",
                required: false,
                options: {
                    min: 0,
                    max: 999999999
                }
            },
            {
                name: "deadline",
                type: "date",
                required: false
            },
            {
                name: "category",
                type: "select",
                required: true,
                options: {
                    values: ["it", "bau", "beratung", "sonstiges"]
                }
            },
            {
                name: "requirements",
                type: "text",
                required: false,
                options: {
                    maxLength: 5000
                }
            }
        ]
    })
    
    // Create documents collection
    const documentsCollection = new Collection({
        name: "documents",
        type: "base",
        schema: [
            {
                name: "request_id",
                type: "relation",
                required: true,
                options: {
                    collectionId: "user_needs",
                    cascadeDelete: true
                }
            },
            {
                name: "title",
                type: "text",
                required: true,
                options: {
                    maxLength: 200
                }
            },
            {
                name: "content",
                type: "text",
                required: true,
                options: {
                    maxLength: 50000
                }
            },
            {
                name: "type",
                type: "select",
                required: true,
                options: {
                    values: ["leistung", "eignung", "zuschlag"]
                }
            },
            {
                name: "created_by",
                type: "text",
                required: false,
                options: {
                    maxLength: 100
                }
            }
        ]
    })
    
    // Create generation_requests collection
    const generationRequestsCollection = new Collection({
        name: "generation_requests",
        type: "base",
        schema: [
            {
                name: "user_need",
                type: "relation",
                required: true,
                options: {
                    collectionId: "user_needs",
                    cascadeDelete: true
                }
            },
            {
                name: "status",
                type: "select",
                required: true,
                options: {
                    values: ["pending", "processing", "completed", "error"]
                }
            },
            {
                name: "error_message",
                type: "text",
                required: false,
                options: {
                    maxLength: 1000
                }
            },
            {
                name: "extracted_context",
                type: "text",
                required: false,
                options: {
                    maxLength: 20000
                }
            }
        ]
    })
    
    // Create uploaded_documents collection
    const uploadedDocsCollection = new Collection({
        name: "uploaded_documents",
        type: "base",
        schema: [
            {
                name: "filename",
                type: "text",
                required: true,
                options: {
                    maxLength: 255
                }
            },
            {
                name: "file_size",
                type: "number",
                required: true,
                options: {
                    min: 0
                }
            },
            {
                name: "extracted_text",
                type: "text",
                required: false,
                options: {
                    maxLength: 100000
                }
            },
            {
                name: "document_type",
                type: "select",
                required: false,
                options: {
                    values: ["leistung", "eignung", "zuschlag", "unknown"]
                }
            }
        ]
    })
    
    // Create generation_progress collection
    const progressCollection = new Collection({
        name: "generation_progress",
        type: "base",
        schema: [
            {
                name: "request_id",
                type: "relation",
                required: true,
                options: {
                    collectionId: "generation_requests",
                    cascadeDelete: true
                }
            },
            {
                name: "step",
                type: "text",
                required: true,
                options: {
                    maxLength: 100
                }
            },
            {
                name: "progress",
                type: "number",
                required: true,
                options: {
                    min: 0,
                    max: 100
                }
            },
            {
                name: "current_task",
                type: "text",
                required: false,
                options: {
                    maxLength: 200
                }
            },
            {
                name: "gemini_feedback",
                type: "text",
                required: false,
                options: {
                    maxLength: 1000
                }
            }
        ]
    })
    
    try {
        $app.dao().saveCollection(userNeedsCollection)
        $app.dao().saveCollection(documentsCollection)
        $app.dao().saveCollection(generationRequestsCollection)
        $app.dao().saveCollection(uploadedDocsCollection)
        $app.dao().saveCollection(progressCollection)
        
        console.log("✅ All collections created successfully")
    } catch (error) {
        console.log("Collection creation error:", error)
    }
}, "users")