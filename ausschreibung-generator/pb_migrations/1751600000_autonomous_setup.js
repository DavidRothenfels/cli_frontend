/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db)

  // 1. user_needs - Benutzereingaben
  const userNeedsCollection = new Collection({
    "id": "user_needs_id",
    "name": "user_needs",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "description_field",
        "name": "description",
        "type": "text",
        "required": true,
        "options": {
          "min": 10,
          "max": 3000
        }
      },
      {
        "system": false,
        "id": "budget_field",
        "name": "budget",
        "type": "number",
        "required": false,
        "options": {
          "min": 0
        }
      },
      {
        "system": false,
        "id": "deadline_field",
        "name": "deadline",
        "type": "date",
        "required": false
      }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  })

  dao.saveCollection(userNeedsCollection)

  // 2. generation_requests - Minimal schema
  const generationRequestsCollection = new Collection({
    "id": "generation_requests_id",
    "name": "generation_requests",
    "type": "base", 
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "user_need_id_field",
        "name": "user_need_id",
        "type": "text",
        "required": false,
        "options": {}
      },
      {
        "system": false,
        "id": "status_field",
        "name": "status",
        "type": "text",
        "required": false,
        "options": {}
      }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  })

  dao.saveCollection(generationRequestsCollection)

  // 3. documents
  const documentsCollection = new Collection({
    "id": "documents_id",
    "name": "documents",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "request_id_field",
        "name": "request_id",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 255
        }
      },
      {
        "system": false,
        "id": "title_field",
        "name": "title",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 255
        }
      },
      {
        "system": false,
        "id": "content_field",
        "name": "content",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 50000
        }
      },
      {
        "system": false,
        "id": "type_field",
        "name": "type",
        "type": "select",
        "required": true,
        "options": {
          "maxSelect": 1,
          "values": ["leistung", "eignung", "zuschlag"]
        }
      },
      {
        "system": false,
        "id": "created_by_field",
        "name": "created_by",
        "type": "text",
        "required": false,
        "options": {
          "max": 100
        }
      }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  })

  dao.saveCollection(documentsCollection)

  // 4. example_prompts
  const examplePromptsCollection = new Collection({
    "id": "example_prompts_id",
    "name": "example_prompts",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "title_field",
        "name": "title",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 100
        }
      },
      {
        "system": false,
        "id": "prompt_text_field",
        "name": "prompt_text",
        "type": "text",
        "required": true,
        "options": {
          "min": 10,
          "max": 2000
        }
      },
      {
        "system": false,
        "id": "sort_order_field",
        "name": "sort_order",
        "type": "number",
        "required": false,
        "options": {
          "min": 0
        }
      }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  })

  dao.saveCollection(examplePromptsCollection)

  // 5. logs
  const logsCollection = new Collection({
    "id": "logs_id",
    "name": "logs",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "message_field",
        "name": "message",
        "type": "text",
        "required": true,
        "options": {
          "max": 5000
        }
      },
      {
        "system": false,
        "id": "level_field",
        "name": "level",
        "type": "select",
        "required": false,
        "options": {
          "maxSelect": 1,
          "values": ["info", "warn", "error"]
        }
      },
      {
        "system": false,
        "id": "request_id_field",
        "name": "request_id",
        "type": "text",
        "required": false,
        "options": {
          "max": 255
        }
      }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  })

  dao.saveCollection(logsCollection)

  // 6. cli_commands
  const cliCommandsCollection = new Collection({
    "id": "cli_commands_id",
    "name": "cli_commands",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "command_field",
        "name": "command",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 5000
        }
      },
      {
        "system": false,
        "id": "status_field",
        "name": "status",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 50
        }
      }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  })

  dao.saveCollection(cliCommandsCollection)

  // Beispiele erstellen
  const websiteRecord = new Record(examplePromptsCollection, {
    "title": "Website-Relaunch",
    "prompt_text": "Erstelle Vergabeunterlagen für den Relaunch unserer Unternehmenswebsite. Das Budget beträgt 50.000 €. Wichtig sind ein modernes Design, Barrierefreiheit und ein CMS-System.",
    "sort_order": 10
  })
  dao.saveRecord(websiteRecord)

  const renovierungRecord = new Record(examplePromptsCollection, {
    "title": "Büro-Renovierung",
    "prompt_text": "Ich benötige eine Leistungsbeschreibung für die Renovierung unserer Büroräume auf 200qm. Die Arbeiten umfassen Malerarbeiten, neuen Bodenbelag und die Erneuerung der Elektrik.",
    "sort_order": 20
  })
  dao.saveRecord(renovierungRecord)

  const dsgvoRecord = new Record(examplePromptsCollection, {
    "title": "DSGVO-Beratung",
    "prompt_text": "Wir benötigen eine Ausschreibung für externe DSGVO-Beratungsleistungen zur Überprüfung und Anpassung unserer internen Prozesse. Geplant sind 10 Beratungstage.",
    "sort_order": 30
  })
  dao.saveRecord(dsgvoRecord)

  // Demo-User erstellen
  const usersCollection = dao.findCollectionByNameOrId("users")
  const demoUser = new Record(usersCollection, {
    "username": "demo",
    "email": "test@vergabe.de",
    "emailVisibility": true,
    "verified": true
  })
  demoUser.setPassword("vergabe123")
  dao.saveRecord(demoUser)

  // Admin erstellen
  const admin = new Admin()
  admin.email = "admin@vergabe.de"
  admin.setPassword("admin123")
  dao.saveAdmin(admin)

}, (db) => {
  const dao = new Dao(db)
  const collections = ["cli_commands", "logs", "example_prompts", "documents", "generation_requests", "user_needs"]
  
  collections.forEach(name => {
    try {
      const collection = dao.findCollectionByNameOrId(name)
      dao.deleteCollection(collection)
    } catch (e) {
      // Collection doesn't exist
    }
  })
})