/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db)

  // 1. Neue Collection: pdf_exports - für PDF-Dateien
  const pdfExportsCollection = new Collection({
    "id": "pdf_exports_id",
    "name": "pdf_exports", 
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
          "max": 50
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
          "max": 200
        }
      },
      {
        "system": false,
        "id": "pdf_type_field",
        "name": "pdf_type",
        "type": "select",
        "required": true,
        "options": {
          "maxSelect": 1,
          "values": [
            "einzeldokument",
            "gesamtpaket", 
            "compliance_bericht",
            "marktanalyse",
            "projektdokumentation"
          ]
        }
      },
      {
        "system": false,
        "id": "pdf_file_field",
        "name": "pdf_file",
        "type": "file",
        "required": true,
        "options": {
          "maxSelect": 1,
          "maxSize": 10485760,
          "mimeTypes": [
            "application/pdf"
          ]
        }
      },
      {
        "system": false,
        "id": "source_documents_field",
        "name": "source_documents", 
        "type": "json",
        "required": false,
        "options": {}
      },
      {
        "system": false,
        "id": "generation_status_field",
        "name": "generation_status",
        "type": "select",
        "required": true,
        "options": {
          "maxSelect": 1,
          "values": [
            "pending",
            "processing", 
            "completed",
            "failed"
          ]
        }
      },
      {
        "system": false,
        "id": "created_by_field",
        "name": "created_by",
        "type": "text",
        "required": false,
        "options": {
          "min": 0,
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

  dao.saveCollection(pdfExportsCollection)

  // 2. Erweitere documents Collection um PDF-Referenz
  const documentsCollection = dao.findCollectionByNameOrId("documents")
  
  // Neues Feld: pdf_export_id (Optional)
  documentsCollection.schema.addField(new SchemaField({
    "system": false,
    "id": "pdf_export_field",
    "name": "pdf_export_id", 
    "type": "text",
    "required": false,
    "options": {
      "min": 0,
      "max": 50
    }
  }))

  dao.saveCollection(documentsCollection)

  // 3. Erweitere cli_commands um PDF-Generation Commands
  const cliCommandsCollection = dao.findCollectionByNameOrId("cli_commands")
  
  // Das command Feld um PDF-Commands erweitern (falls nicht schon vorhanden)
  // Wird über die bestehende Struktur abgewickelt, keine Schema-Änderung nötig
  
  console.log("PDF Integration Migration completed:")
  console.log("- pdf_exports collection created")
  console.log("- documents collection extended with pdf_export_id")
  console.log("- Ready for PDF generation workflows")
})