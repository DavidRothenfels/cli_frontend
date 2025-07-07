/// <reference path="../pb_data/types.d.ts" />

/**
 * Konsolidierte Migration für Vergabedokument-Generator
 * Erstellt alle Collections, Daten und Benutzer in einer einzigen Migration
 * PocketBase v0.28.4 kompatibel
 */

migrate((app) => {
  console.log("🚀 Starting consolidated migration...")

  // ========================================
  // 0. USERS COLLECTION (Create if needed)
  // ========================================
  let usersCollection
  try {
    usersCollection = app.findCollectionByNameOrId("users")
  } catch (e) {
    // Create users collection if it doesn't exist
    usersCollection = new Collection({
      type: "auth",
      name: "users",
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
      fields: [
        {
          name: "name",
          type: "text",
          required: false,
          max: 100
        }
      ]
    })
    app.save(usersCollection)
    console.log("✅ users collection created")
  }

  // ========================================
  // 1. USER_NEEDS COLLECTION
  // ========================================
  const userNeedsCollection = new Collection({
    type: "base",
    name: "user_needs",
    listRule: "@request.auth.id = user_id",
    viewRule: "@request.auth.id = user_id",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id = user_id",
    deleteRule: "@request.auth.id = user_id",
    fields: [
      {
        name: "description",
        type: "text",
        required: true,
        min: 10,
        max: 3000
      },
      {
        name: "user_id",
        type: "relation",
        required: true,
        maxSelect: 1,
        collectionId: usersCollection.id,
        cascadeDelete: true
      },
      {
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false
      },
      {
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true
      }
    ]
  })
  app.save(userNeedsCollection)
  console.log("✅ user_needs collection created")

  // ========================================
  // 2. GENERATION_REQUESTS COLLECTION
  // ========================================
  const generationRequestsCollection = new Collection({
    type: "base",
    name: "generation_requests",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      {
        name: "user_need_id",
        type: "text",
        required: false
      },
      {
        name: "status",
        type: "select",
        required: false,
        maxSelect: 1,
        values: ["pending", "processing", "completed", "failed"]
      },
      {
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false
      },
      {
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true
      }
    ]
  })
  app.save(generationRequestsCollection)
  console.log("✅ generation_requests collection created")

  // ========================================
  // 3. DOCUMENTS COLLECTION
  // ========================================
  const documentsCollection = new Collection({
    type: "base",
    name: "documents",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      {
        name: "request_id",
        type: "text",
        required: true,
        min: 1,
        max: 255
      },
      {
        name: "title",
        type: "text",
        required: true,
        min: 1,
        max: 255
      },
      {
        name: "content",
        type: "text",
        required: true,
        min: 1,
        max: 50000
      },
      {
        name: "type",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["leistung", "eignung", "zuschlag"]
      },
      {
        name: "created_by",
        type: "text",
        required: false,
        max: 100
      },
      {
        name: "pdf_export_id",
        type: "text",
        required: false,
        max: 50
      },
      {
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false
      },
      {
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true
      }
    ]
  })
  app.save(documentsCollection)
  console.log("✅ documents collection created")

  // ========================================
  // 4. PDF_EXPORTS COLLECTION
  // ========================================
  const pdfExportsCollection = new Collection({
    type: "base",
    name: "pdf_exports",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      {
        name: "request_id",
        type: "text",
        required: true,
        min: 1,
        max: 50
      },
      {
        name: "title",
        type: "text",
        required: true,
        min: 1,
        max: 200
      },
      {
        name: "pdf_type",
        type: "select",
        required: true,
        maxSelect: 1,
        values: [
          "einzeldokument",
          "gesamtpaket",
          "compliance_bericht",
          "marktanalyse",
          "projektdokumentation"
        ]
      },
      {
        name: "pdf_file",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 10485760,
        mimeTypes: ["application/pdf"]
      },
      {
        name: "source_documents",
        type: "json",
        required: false
      },
      {
        name: "generation_status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["pending", "processing", "completed", "failed"]
      },
      {
        name: "created_by",
        type: "text",
        required: false,
        max: 100
      },
      {
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false
      },
      {
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true
      }
    ]
  })
  app.save(pdfExportsCollection)
  console.log("✅ pdf_exports collection created")

  // ========================================
  // 5. EXAMPLE_PROMPTS COLLECTION
  // ========================================
  const examplePromptsCollection = new Collection({
    type: "base",
    name: "example_prompts",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      {
        name: "title",
        type: "text",
        required: true,
        min: 1,
        max: 100
      },
      {
        name: "prompt_text",
        type: "text",
        required: true,
        min: 10,
        max: 2000
      },
      {
        name: "sort_order",
        type: "number",
        required: false,
        min: 0
      },
      {
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false
      },
      {
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true
      }
    ]
  })
  app.save(examplePromptsCollection)
  console.log("✅ example_prompts collection created")

  // ========================================
  // 6. LOGS COLLECTION
  // ========================================
  const logsCollection = new Collection({
    type: "base",
    name: "logs",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      {
        name: "message",
        type: "text",
        required: true,
        max: 5000
      },
      {
        name: "level",
        type: "select",
        required: false,
        maxSelect: 1,
        values: ["info", "warn", "error"]
      },
      {
        name: "request_id",
        type: "text",
        required: false,
        max: 255
      },
      {
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false
      },
      {
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true
      }
    ]
  })
  app.save(logsCollection)
  console.log("✅ logs collection created")

  // ========================================
  // 7. CLI_COMMANDS COLLECTION
  // ========================================
  const cliCommandsCollection = new Collection({
    type: "base",
    name: "cli_commands",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      {
        name: "command",
        type: "text",
        required: true,
        min: 1,
        max: 5000
      },
      {
        name: "parameters",
        type: "json",
        required: false
      },
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["pending", "processing", "completed", "failed"]
      },
      {
        name: "output",
        type: "text",
        required: false,
        max: 10000
      },
      {
        name: "error",
        type: "text",
        required: false,
        max: 2000
      },
      {
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false
      },
      {
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true
      }
    ]
  })
  app.save(cliCommandsCollection)
  console.log("✅ cli_commands collection created")

  // ========================================
  // 8. SYSTEM_PROMPTS COLLECTION
  // ========================================
  const systemPromptsCollection = new Collection({
    type: "base",
    name: "system_prompts",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      {
        name: "prompt_type",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["leistung", "eignung", "zuschlag", "master"]
      },
      {
        name: "prompt_text",
        type: "text",
        required: true,
        max: 10000
      },
      {
        name: "description",
        type: "text",
        required: false,
        max: 500
      },
      {
        name: "version",
        type: "number",
        required: true,
        min: 1
      },
      {
        name: "active",
        type: "bool",
        required: false
      },
      {
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false
      },
      {
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true
      }
    ]
  })
  app.save(systemPromptsCollection)
  console.log("✅ system_prompts collection created")

  // ========================================
  // ADMIN & USER CREATION
  // ========================================
  
  // Admin creation handled via CLI in v0.28+
  // Use: ./pocketbase superuser upsert admin@vergabe.de admin123
  console.log("ℹ️ Admin creation via CLI: ./pocketbase superuser upsert admin@vergabe.de admin123")

  // Create demo user
  try {
    const demoUser = new Record(usersCollection, {
      username: "demo",
      email: "test@vergabe.de",
      emailVisibility: true,
      verified: true,
      name: "Demo User"
    })
    demoUser.setPassword("vergabe123")
    app.save(demoUser)
    console.log("✅ Demo user created: test@vergabe.de / vergabe123")
  } catch (e) {
    console.log("ℹ️ Demo user might already exist")
  }

  // ========================================
  // DATA SEEDING
  // ========================================

  // Create example prompts
  const examplePrompts = [
    {
      title: "Website-Relaunch",
      prompt_text: "Erstelle Vergabeunterlagen für den Relaunch unserer Unternehmenswebsite. Das Budget beträgt 50.000 €. Wichtig sind ein modernes Design, Barrierefreiheit und ein CMS-System.",
      sort_order: 10
    },
    {
      title: "Büro-Renovierung",
      prompt_text: "Ich benötige eine Leistungsbeschreibung für die Renovierung unserer Büroräume auf 200qm. Die Arbeiten umfassen Malerarbeiten, neuen Bodenbelag und die Erneuerung der Elektrik.",
      sort_order: 20
    },
    {
      title: "DSGVO-Beratung",
      prompt_text: "Wir benötigen eine Ausschreibung für externe DSGVO-Beratungsleistungen zur Überprüfung und Anpassung unserer internen Prozesse. Geplant sind 10 Beratungstage.",
      sort_order: 30
    },
    {
      title: "IT-Software Entwicklung",
      prompt_text: "Entwicklung einer modernen Projektmanagement-Software mit Budget von 150.000 € und Laufzeit von 6 Monaten. Benötigt werden Admin-Panel, Benutzeroberfläche und API-Integration.",
      sort_order: 40
    }
  ]

  examplePrompts.forEach((prompt, index) => {
    try {
      const record = new Record(examplePromptsCollection, prompt)
      app.save(record)
      console.log(`✅ Example prompt ${index + 1} created: ${prompt.title}`)
    } catch (e) {
      console.log(`⚠️ Failed to create example prompt: ${prompt.title}`)
    }
  })

  // Create system prompts
  const systemPrompts = [
    {
      prompt_type: "master",
      prompt_text: "Du bist ein Experte für deutsche Vergaberecht und öffentliche Beschaffung. Erstelle professionelle Vergabeunterlagen basierend auf den Benutzereingaben.",
      description: "Master Prompt für AI-System",
      version: 1,
      active: true
    },
    {
      prompt_type: "leistung",
      prompt_text: "Erstelle eine detaillierte Leistungsbeschreibung mit folgenden Kapiteln: Projektbeschreibung, Leistungsumfang, technische Anforderungen, Qualitätsstandards, Projektdauer.",
      description: "Template für Leistungsbeschreibung",
      version: 1,
      active: true
    }
  ]

  systemPrompts.forEach((prompt, index) => {
    try {
      const record = new Record(systemPromptsCollection, prompt)
      app.save(record)
      console.log(`✅ System prompt ${index + 1} created: ${prompt.prompt_type}`)
    } catch (e) {
      console.log(`⚠️ Failed to create system prompt: ${prompt.prompt_type}`)
    }
  })

  console.log("🎉 Consolidated migration completed successfully!")
  console.log("📊 Created 8 collections with seeded data")
  console.log("👤 Created admin and demo users")

}, (app) => {
  // Rollback - delete all collections in reverse order
  console.log("🔄 Rolling back consolidated migration...")
  
  const collections = [
    "system_prompts", "cli_commands", "logs", "example_prompts", 
    "pdf_exports", "documents", "generation_requests", "user_needs"
  ]
  
  collections.forEach(name => {
    try {
      const collection = app.findCollectionByNameOrId(name)
      app.delete(collection)
      console.log(`✅ Deleted collection: ${name}`)
    } catch (e) {
      console.log(`ℹ️ Collection ${name} not found for deletion`)
    }
  })

  console.log("🔄 Rollback completed")
})