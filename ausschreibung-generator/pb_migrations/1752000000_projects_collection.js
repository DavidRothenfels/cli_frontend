/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Erstelle Projects Collection für einfacheres Projektmanagement
 * PocketBase v0.28 kompatibel
 */

migrate((app) => {
  console.log("🚀 Creating Projects collection...")

  // Get users collection reference
  let usersCollection
  try {
    usersCollection = app.findCollectionByNameOrId("users")
  } catch (e) {
    console.error("❌ Users collection not found")
    return
  }

  // ========================================
  // PROJECTS COLLECTION
  // ========================================
  const projectsCollection = new Collection({
    type: "base",
    name: "projects",
    listRule: "@request.auth.id = user_id",
    viewRule: "@request.auth.id = user_id", 
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id = user_id",
    deleteRule: "@request.auth.id = user_id",
    fields: [
      {
        name: "name",
        type: "text",
        required: true,
        min: 1,
        max: 200
      },
      {
        name: "description", 
        type: "text",
        required: false,
        max: 2000
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
        name: "request_id",
        type: "text",
        required: true,
        min: 1,
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
  
  app.save(projectsCollection)
  console.log("✅ Projects collection created")

  // Create sample project for demo
  try {
    const demoUser = app.findFirstRecordByData("users", "email", "test@vergabe.de")
    if (demoUser) {
      const sampleProject = new Record(projectsCollection, {
        name: "Website-Relaunch Demo",
        description: "Beispielprojekt für Website-Erneuerung",
        user_id: demoUser.id,
        request_id: "TEST-001"
      })
      app.save(sampleProject)
      console.log("✅ Sample project created")
    }
  } catch (e) {
    console.log("ℹ️ Could not create sample project")
  }

  console.log("🎉 Projects collection migration completed!")

}, (app) => {
  // Rollback
  console.log("🔄 Rolling back projects collection...")
  
  try {
    const collection = app.findCollectionByNameOrId("projects")
    app.delete(collection)
    console.log("✅ Projects collection deleted")
  } catch (e) {
    console.log("ℹ️ Projects collection not found for deletion")
  }

  console.log("🔄 Projects rollback completed")
})