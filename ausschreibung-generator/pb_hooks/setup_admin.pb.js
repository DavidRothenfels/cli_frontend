/// <reference path="../pb_data/types.d.ts" />

/**
 * Admin Setup Hook für Vergabedokument-Generator
 * Erstellt einen ersten Admin-User wenn noch keiner existiert
 */

// Hook wird nach Server-Start ausgeführt
onBootstrap((e) => {
    console.log("🔧 Bootstrap: Checking admin setup...")
    
    try {
        // Prüfe ob bereits ein Admin existiert
        const existingAdmins = $app.findAllAdmins()
        
        if (existingAdmins.length === 0) {
            console.log("⚠️  No admin found, creating default admin...")
            
            // Erstelle Standard-Admin
            const admin = new Admin()
            admin.email = process.env.PB_ADMIN_EMAIL || "admin@vergabe.de"
            admin.setPassword(process.env.PB_ADMIN_PASSWORD || "admin123")
            
            $app.saveAdmin(admin)
            
            console.log(`✅ Default admin created: ${admin.email}`)
            console.log("🔑 Please change the default password after first login!")
            
        } else {
            console.log(`✅ Admin setup OK (${existingAdmins.length} admin(s) found)`)
        }
        
        // Prüfe Demo-User
        const usersCollection = $app.findCollectionByNameOrId("users")
        if (usersCollection) {
            const demoUsers = $app.findRecordsByFilter(usersCollection, "email = 'test@vergabe.de'", "", 0, 1)
            
            if (demoUsers.length === 0) {
                console.log("📝 Creating demo user...")
                
                const demoUser = new Record(usersCollection, {
                    "username": "demo",
                    "email": "test@vergabe.de",
                    "emailVisibility": true,
                    "verified": true
                })
                
                demoUser.setPassword("vergabe123")
                $app.save(demoUser)
                
                console.log("✅ Demo user created: test@vergabe.de / vergabe123")
            } else {
                console.log("✅ Demo user already exists")
            }
        }
        
    } catch (error) {
        console.error("❌ Error in admin setup:", error)
    }
})

/**
 * Auth Hook: Log successful admin logins
 */
onAdminAuthRequest((e) => {
    console.log(`🔐 Admin login: ${e.admin.email} from ${e.realIP}`)
})

/**
 * Auth Hook: Log successful user logins  
 */
onRecordAuthRequest((e) => {
    console.log(`👤 User login: ${e.record.email()} from ${e.realIP}`)
})