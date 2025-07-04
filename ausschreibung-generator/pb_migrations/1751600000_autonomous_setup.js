migrate((db) => {
  // Nur die essentiellen Collections für autonomen Workflow
  
  // user_needs - Benutzereingaben
  const userNeeds = new Collection({
    "id": "user_needs",
    "name": "user_needs",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "description",
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
        "id": "budget",
        "name": "budget",
        "type": "number",
        "required": false,
        "options": {
          "min": 0
        }
      },
      {
        "system": false,
        "id": "deadline",
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

  // generation_requests - Trigger für Gemini CLI
  const generationRequests = new Collection({
    "id": "generation_requests",
    "name": "generation_requests",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "user_need_id",
        "name": "user_need_id",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 100
        }
      },
      {
        "system": false,
        "id": "status",
        "name": "status",
        "type": "select",
        "required": true,
        "options": {
          "maxSelect": 1,
          "values": ["pending", "processing", "completed", "error"]
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

  // documents - Gemini CLI Ergebnisse
  const documents = new Collection({
    "id": "documents",
    "name": "documents", 
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "request_id",
        "name": "request_id",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 100
        }
      },
      {
        "system": false,
        "id": "title",
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
        "id": "content",
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
        "id": "type",
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
        "id": "created_by",
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

  // example_prompts - Dynamische Beispiele aus der Datenbank
  const examplePrompts = new Collection({
    "id": "example_prompts",
    "name": "example_prompts",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "title",
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
        "id": "prompt_text",
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
        "id": "sort_order",
        "name": "sort_order",
        "type": "number",
        "required": false,
        "options": {
          "min": 0
        }
      }
    ],
    "listRule": "", // Öffentlich lesbar
    "viewRule": "", // Öffentlich lesbar
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  })

  Dao(db).saveCollection(userNeeds)
  Dao(db).saveCollection(generationRequests)
  Dao(db).saveCollection(documents)
  Dao(db).saveCollection(examplePrompts)

  // Standard-Beispiele erstellen
  const examples = [
    { title: 'Website-Relaunch', prompt_text: 'Erstelle Vergabeunterlagen für den Relaunch unserer Unternehmenswebsite. Das Budget beträgt 50.000 €. Wichtig sind ein modernes Design, Barrierefreiheit und ein CMS-System.', sort_order: 10 },
    { title: 'Büro-Renovierung', prompt_text: 'Ich benötige eine Leistungsbeschreibung für die Renovierung unserer Büroräume auf 200qm. Die Arbeiten umfassen Malerarbeiten, neuen Bodenbelag und die Erneuerung der Elektrik.', sort_order: 20 },
    { title: 'DSGVO-Beratung', prompt_text: 'Wir benötigen eine Ausschreibung für externe DSGVO-Beratungsleistungen zur Überprüfung und Anpassung unserer internen Prozesse. Geplant sind 10 Beratungstage.', sort_order: 30 }
  ]

  for (const ex of examples) {
    const record = new Record(examplePrompts, ex)
    Dao(db).saveRecord(record)
  }
}, (db) => {
  const dao = new Dao(db)
  try {
    dao.deleteCollection(dao.findCollectionByNameOrId("user_needs"))
    dao.deleteCollection(dao.findCollectionByNameOrId("generation_requests"))
    dao.deleteCollection(dao.findCollectionByNameOrId("documents"))
    dao.deleteCollection(dao.findCollectionByNameOrId("example_prompts"))
  } catch (e) {
    // Collections existieren nicht
  }
})