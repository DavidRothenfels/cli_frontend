/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "system_prompts",
    "created": "2025-01-05 12:00:00.000Z",
    "updated": "2025-01-05 12:00:00.000Z",
    "name": "system_prompts",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "prompt_type",
        "name": "prompt_type",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "leistung",
            "eignung", 
            "zuschlag"
          ]
        }
      },
      {
        "system": false,
        "id": "prompt_text",
        "name": "prompt_text",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "description",
        "name": "description",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "version",
        "name": "version",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "active",
        "name": "active",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_system_prompts_type` ON `system_prompts` (`prompt_type`)",
      "CREATE INDEX `idx_system_prompts_active` ON `system_prompts` (`active`)"
    ],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  })

  return Dao(db).saveCollection(collection)
}, (db) => {
  return Dao(db).deleteCollection("system_prompts")
})