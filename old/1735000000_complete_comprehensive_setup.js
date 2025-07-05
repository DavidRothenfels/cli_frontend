/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // Get existing users collection
  const usersCollection = app.findCollectionByNameOrId("users")

  // 1. Documents Collection (must be created before bedarf references it)
  const documents = new Collection({
    type: "base",
    name: "documents",
    listRule: "@request.auth.id = user_id",
    viewRule: "@request.auth.id = user_id",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id = user_id",
    deleteRule: "@request.auth.id = user_id",
    fields: [
      {
        name: "title",
        type: "text",
        required: false,
        max: 255
      },
      {
        name: "document_data",
        type: "json",
        required: false
      },
      {
        name: "user_id",
        type: "relation",
        required: false,
        maxSelect: 1,
        collectionId: usersCollection.id,
        cascadeDelete: false
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

  app.save(documents)

  // 2. Bedarf Collection - Clean version with document_id relation
  const bedarf = new Collection({
    type: "base",
    name: "bedarf",
    listRule: "@request.auth.id = user_id",
    viewRule: "@request.auth.id = user_id", 
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id = user_id",
    deleteRule: "@request.auth.id = user_id",
    fields: [
      {
        name: "beschreibung",
        type: "text",
        required: true,
        max: 2000
      },
      {
        name: "generated_questions",
        type: "json",
        required: false
      },
      {
        name: "user_answers",
        type: "json",
        required: false
      },
      {
        name: "submitted_answers",
        type: "json",
        required: false
      },
      {
        name: "document_id",
        type: "relation",
        required: false,
        maxSelect: 1,
        collectionId: documents.id,
        cascadeDelete: true
      },
      {
        name: "status",
        type: "select",
        required: true,
        values: [
          "draft",
          "questions_generated",
          "answers_submitted", 
          "document_generated"
        ]
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

  app.save(bedarf)

  // 3. Templates Collection
  const templates = new Collection({
    type: "base",
    name: "templates",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      {
        name: "name",
        type: "text",
        required: true,
        max: 255
      },
      {
        name: "content",
        type: "editor",
        required: true
      },
      {
        name: "description",
        type: "text",
        required: false,
        max: 500
      },
      {
        name: "user_id",
        type: "relation",
        required: false,
        maxSelect: 1,
        collectionId: usersCollection.id,
        cascadeDelete: false
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

  app.save(templates)

  // Create comprehensive Leistungsbeschreibung template with 12 chapters
  const comprehensiveTemplate = new Record(templates, {
    name: "Leistungsbeschreibung Bedarf",
    description: "Umfassende Leistungsbeschreibung mit 12 Kapiteln für öffentliche Beschaffung",
    content: getComprehensiveTemplateContent(),
    user_id: null
  })

  app.save(comprehensiveTemplate)

  // Create test user
  const testUser = new Record(usersCollection, {
    username: "testuser",
    email: "test@example.com",
    emailVisibility: true,
    verified: true
  })
  
  testUser.setPassword("123456789")
  app.save(testUser)

  // Create admin user  
  const adminUser = new Record(usersCollection, {
    username: "admin",
    email: "admin@test.com", 
    emailVisibility: true,
    verified: true
  })
  
  adminUser.setPassword("123456789")
  app.save(adminUser)

  // Create sample completed bedarf with comprehensive document
  const sampleDocument = new Record(documents, {
    title: "Beispiel Leistungsbeschreibung - Comprehensive",
    document_data: {
      projektrahmendaten: "Beschaffung einer digitalen Projektmanagement-Lösung für die öffentliche Verwaltung - Budget: 150.000€, Laufzeit: 6 Monate",
      leistungsgegenstand: "Entwicklung einer Webanwendung für Projektmanagement mit Admin-Panel und Benutzeroberfläche",
      funktionale_anforderungen: "Projektplanung, Zeiterfassung, Reporting, Teamkommunikation, Dashboard mit KPIs",
      technische_spezifikationen: "React Frontend, Node.js Backend, PostgreSQL Datenbank, REST API, responsive Design",
      qualitaetsstandards: "ISO 27001 konform, WCAG 2.1 AA Accessibility, Performance: <2s Ladezeit",
      schnittstellen_integration: "LDAP-Anbindung, Single Sign-On, Export zu Excel/PDF, REST API für Drittsysteme",
      sicherheitsanforderungen: "DSGVO-konform, Ende-zu-Ende Verschlüsselung, Audit-Logs, Zwei-Faktor-Authentifizierung",
      projektablauf_meilensteine: "Konzeption (4 Wochen), Entwicklung (16 Wochen), Testing (4 Wochen), Deployment (2 Wochen)",
      dokumentation_schulung: "Technische Dokumentation, Benutzerhandbuch, 2 Schulungstage vor Ort, Video-Tutorials",
      support_wartung: "24/7 Support, SLA 4h Reaktionszeit, monatliche Updates, 3 Jahre Wartung inklusive",
      abnahmekriterien: "Funktionalitätstests, Lastests (100 concurrent users), Security-Audit, User Acceptance Tests",
      verguetungsmodell: "Festpreis 120.000€ netto, 30% Anzahlung, 40% bei Zwischenabnahme, 30% bei Endabnahme"
    },
    user_id: testUser.id
  })

  app.save(sampleDocument)

  const sampleBedarf = new Record(bedarf, {
    beschreibung: "Wir benötigen eine moderne Webanwendung für unser Projektmanagement mit benutzerfreundlicher Oberfläche, Integration in bestehende Systeme und hohen Sicherheitsstandards.",
    generated_questions: {
      "questions": [
        {
          "id": "q1",
          "text": "Welche spezifischen Funktionen soll die Projektmanagement-Lösung haben?",
          "choices": ["Projektplanung & Zeiterfassung", "Team-Kommunikation & Chat", "Reporting & Analytics", "Dokumentenverwaltung"],
          "free_text_prompt": "Beschreiben Sie weitere spezifische Anforderungen...",
          "priority": "high"
        },
        {
          "id": "q2", 
          "text": "Welche technischen Anforderungen sind für die Integration wichtig?",
          "choices": ["LDAP/Active Directory Anbindung", "Single Sign-On (SSO)", "REST API für Drittsysteme", "Mobile Anwendung"],
          "free_text_prompt": "Erläutern Sie die Integrationsanforderungen...",
          "priority": "high"
        },
        {
          "id": "q3",
          "text": "Welche Sicherheits- und Compliance-Anforderungen bestehen?",
          "choices": ["DSGVO-Konformität", "ISO 27001 Standards", "Penetration Testing", "Audit-Protokollierung"],
          "free_text_prompt": "Spezifizieren Sie weitere Sicherheitsanforderungen...",
          "priority": "medium"
        }
      ]
    },
    submitted_answers: {
      "q1": {
        "question": "Welche spezifischen Funktionen soll die Projektmanagement-Lösung haben?",
        "selected_choices": ["Projektplanung & Zeiterfassung", "Reporting & Analytics"],
        "free_text": "Zusätzlich benötigen wir Kalender-Integration und automatische Benachrichtigungen."
      },
      "q2": {
        "question": "Welche technischen Anforderungen sind für die Integration wichtig?",
        "selected_choices": ["LDAP/Active Directory Anbindung", "Single Sign-On (SSO)"],
        "free_text": "Integration mit unserem bestehenden Active Directory ist essentiell."
      },
      "q3": {
        "question": "Welche Sicherheits- und Compliance-Anforderungen bestehen?",
        "selected_choices": ["DSGVO-Konformität", "Audit-Protokollierung"],
        "free_text": "Alle Zugriffe müssen protokolliert werden für interne Audits."
      }
    },
    document_id: sampleDocument.id,
    status: "document_generated",
    user_id: testUser.id
  })

  app.save(sampleBedarf)

  // Create superuser using the superusers collection
  const superusersCollection = app.findCollectionByNameOrId("_superusers")
  const superuser = new Record(superusersCollection, {
    email: "admin@test.com",
    emailVisibility: true,
    verified: true
  })
  
  superuser.setPassword("123456789")
  app.save(superuser)

}, (app) => {
  // Rollback - delete collections in reverse order
  const collections = ["bedarf", "documents", "templates"]
  
  collections.forEach(name => {
    try {
      const collection = app.findCollectionByNameOrId(name)
      app.delete(collection)
    } catch (e) {
      // Collection doesn't exist
    }
  })
})

function getComprehensiveTemplateContent() {
  return `<h1>Leistungsbeschreibung</h1>

<h2>1. Projektrahmendaten</h2>
<p>{{.projektrahmendaten}}</p>

<h2>2. Leistungsgegenstand</h2>
<p>{{.leistungsgegenstand}}</p>

<h2>3. Funktionale Anforderungen</h2>
<p>{{.funktionale_anforderungen}}</p>

<h2>4. Technische Spezifikationen</h2>
<p>{{.technische_spezifikationen}}</p>

<h2>5. Qualitätsstandards</h2>
<p>{{.qualitaetsstandards}}</p>

<h2>6. Schnittstellen & Integration</h2>
<p>{{.schnittstellen_integration}}</p>

<h2>7. Sicherheitsanforderungen</h2>
<p>{{.sicherheitsanforderungen}}</p>

<h2>8. Projektablauf & Meilensteine</h2>
<p>{{.projektablauf_meilensteine}}</p>

<h2>9. Dokumentation & Schulung</h2>
<p>{{.dokumentation_schulung}}</p>

<h2>10. Support & Wartung</h2>
<p>{{.support_wartung}}</p>

<h2>11. Abnahmekriterien</h2>
<p>{{.abnahmekriterien}}</p>

<h2>12. Vergütungsmodell</h2>
<p>{{.verguetungsmodell}}</p>`
}