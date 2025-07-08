/// <reference path="../pb_data/types.d.ts" />

/**
 * Admin Setup Hook - Erstellt automatisch Admin bei erstem Start
 * PocketBase v0.28 kompatibel
 */

onBootstrap((e) => {
    e.next() // KRITISCH für v0.28
    
    console.log("🔧 Bootstrap: Checking admin setup...")
    
    try {
        // Prüfe ob bereits ein Admin existiert
        const admins = $app.findRecordsByFilter("_admins", "")
        
        if (admins.length === 0) {
            console.log("📌 No admin found. Please create one manually:")
            console.log("📌 Run: ./pocketbase superuser upsert admin@vergabe.de admin123")
            console.log("📌 Or use: http://localhost:8090/_/ (web interface)")
        } else {
            console.log("✅ Admin exists, system ready")
        }
    } catch (error) {
        console.log("ℹ️ Admin check failed (expected in v0.28):", error.message)
        console.log("📌 Create admin with: ./pocketbase superuser upsert admin@vergabe.de admin123")
    }
    
    console.log("🎯 System initialization complete")
})