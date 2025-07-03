/// <reference path="../pb_data/types.d.ts" />

// Initialize collections on startup
onAfterBootstrap((e) => {
    console.log("Initializing collections...")
    
    // Create user_needs collection
    try {
        const userNeedsCollection = new Collection()
        userNeedsCollection.name = "user_needs"
        userNeedsCollection.type = "base"
        userNeedsCollection.listRule = null
        userNeedsCollection.viewRule = null
        userNeedsCollection.createRule = null
        userNeedsCollection.updateRule = null
        userNeedsCollection.deleteRule = null
        
        userNeedsCollection.schema = [
            {
                name: "title",
                type: "text",
                required: true,
                options: {
                    min: 1,
                    max: 255
                }
            },
            {
                name: "description",
                type: "text",
                required: true,
                options: {
                    min: 1,
                    max: 2000
                }
            },
            {
                name: "budget",
                type: "number",
                required: false,
                options: {
                    min: 0
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
                    maxSelect: 1,
                    values: ["it", "bau", "beratung"]
                }
            },
            {
                name: "requirements",
                type: "text",
                required: false,
                options: {
                    max: 5000
                }
            }
        ]
        
        $app.dao().saveCollection(userNeedsCollection)
        console.log("Created user_needs collection")
    } catch (e) {
        console.log("user_needs collection might already exist:", e.message)
    }
    
    // Create documents collection
    try {
        const documentsCollection = new Collection()
        documentsCollection.name = "documents"
        documentsCollection.type = "base"
        documentsCollection.listRule = null
        documentsCollection.viewRule = null
        documentsCollection.createRule = null
        documentsCollection.updateRule = null
        documentsCollection.deleteRule = null
        
        documentsCollection.schema = [
            {
                name: "request_id",
                type: "relation",
                required: true,
                options: {
                    collectionId: "", // Will be set programmatically
                    cascadeDelete: true,
                    minSelect: 1,
                    maxSelect: 1
                }
            },
            {
                name: "title",
                type: "text",
                required: true,
                options: {
                    min: 1,
                    max: 255
                }
            },
            {
                name: "content",
                type: "text",
                required: true,
                options: {
                    min: 1,
                    max: 50000
                }
            },
            {
                name: "type",
                type: "select",
                required: true,
                options: {
                    maxSelect: 1,
                    values: ["leistung", "eignung", "zuschlag"]
                }
            },
            {
                name: "created_by",
                type: "text",
                required: false,
                options: {
                    max: 255
                }
            }
        ]
        
        $app.dao().saveCollection(documentsCollection)
        console.log("Created documents collection")
    } catch (e) {
        console.log("documents collection might already exist:", e.message)
    }
    
    // Create generation_requests collection
    try {
        const generationRequestsCollection = new Collection()
        generationRequestsCollection.name = "generation_requests"
        generationRequestsCollection.type = "base"
        generationRequestsCollection.listRule = null
        generationRequestsCollection.viewRule = null
        generationRequestsCollection.createRule = null
        generationRequestsCollection.updateRule = null
        generationRequestsCollection.deleteRule = null
        
        generationRequestsCollection.schema = [
            {
                name: "user_need",
                type: "relation",
                required: true,
                options: {
                    collectionId: "", // Will be set programmatically
                    cascadeDelete: true,
                    minSelect: 1,
                    maxSelect: 1
                }
            },
            {
                name: "status",
                type: "select",
                required: true,
                options: {
                    maxSelect: 1,
                    values: ["pending", "processing", "completed", "error"]
                }
            },
            {
                name: "error_message",
                type: "text",
                required: false,
                options: {
                    max: 1000
                }
            }
        ]
        
        $app.dao().saveCollection(generationRequestsCollection)
        console.log("Created generation_requests collection")
    } catch (e) {
        console.log("generation_requests collection might already exist:", e.message)
    }
    
    // Update relation field collection IDs
    try {
        const userNeedsCollection = $app.dao().findCollectionByNameOrId("user_needs")
        const documentsCollection = $app.dao().findCollectionByNameOrId("documents")
        const generationRequestsCollection = $app.dao().findCollectionByNameOrId("generation_requests")
        
        if (userNeedsCollection && documentsCollection && generationRequestsCollection) {
            // Update documents collection relation to user_needs
            documentsCollection.schema.forEach(field => {
                if (field.name === "request_id") {
                    field.options.collectionId = userNeedsCollection.id
                }
            })
            
            // Update generation_requests collection relation to user_needs
            generationRequestsCollection.schema.forEach(field => {
                if (field.name === "user_need") {
                    field.options.collectionId = userNeedsCollection.id
                }
            })
            
            $app.dao().saveCollection(documentsCollection)
            $app.dao().saveCollection(generationRequestsCollection)
            console.log("Updated collection relationships")
        }
    } catch (e) {
        console.log("Error updating relationships:", e.message)
    }
    
    console.log("Collection initialization complete")
})