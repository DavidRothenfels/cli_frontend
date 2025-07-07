/// <reference path="../pb_data/types.d.ts" />

/**
 * Admin Setup Hook für Vergabedokument-Generator
 * Erstellt einen ersten Admin-User wenn noch keiner existiert
 */

// Hook wird nach Server-Start ausgeführt
onBootstrap((e) => {
    e.next() // KRITISCH: Muss aufgerufen werden für v0.28
    
    console.log("🔧 Bootstrap: Checking admin setup...")
    
    try {
        // Check if superuser exists (Admin class not available in v0.28 hooks)
        console.log("ℹ️ Superuser management handled via CLI in v0.28")
        console.log("ℹ️ Use: ./pocketbase superuser upsert EMAIL PASS")
        
        // Prüfe Demo-User (optional, da users collection möglicherweise nicht existiert)
        try {
            const usersCollection = $app.dao().findCollectionByNameOrId("users")
            if (usersCollection) {
                const demoUsers = $app.dao().findRecordsByFilter(usersCollection, "email = 'test@vergabe.de'", "", 0, 1)
                
                if (demoUsers.length === 0) {
                    console.log("📝 Creating demo user...")
                    
                    const demoUser = new Record(usersCollection, {
                        "username": "demo",
                        "email": "test@vergabe.de",
                        "emailVisibility": true,
                        "verified": true
                    })
                    
                    demoUser.setPassword("vergabe123")
                    $app.dao().saveRecord(demoUser)
                    
                    console.log("✅ Demo user created: test@vergabe.de / vergabe123")
                } else {
                    console.log("✅ Demo user already exists")
                }
            }
        } catch (e) {
            console.log("ℹ️  Users collection not available (using admin-only mode)")
        }
        
    } catch (error) {
        console.error("❌ Error in admin setup:", error)
    }
})

/**
 * Auth Hook: Log successful admin logins
 * Note: In v0.28, use more generic hooks for auth events
 */
// onAdminAuthRequest hook might not be available in v0.28
// Alternative: Use general request hooks or app hooks for auth logging

/**
 * Auth Hook: Log successful user logins  
 * Note: In v0.28, use more generic hooks for auth events
 */
// onRecordAuthRequest hook might not be available in v0.28
// Alternative: Use general request hooks for user auth logging