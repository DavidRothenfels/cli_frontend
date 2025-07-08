#!/usr/bin/env node

/**
 * CLI Command Processor für Gemini AI Integration
 * Läuft separat von PocketBase und verarbeitet cli_commands
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'
const POLL_INTERVAL = 2000 // 2 Sekunden

// OpenAI API Key wird userbezogen aus PocketBase geladen
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

console.log('🚀 CLI Command Processor gestartet')
console.log('📡 PocketBase URL:', POCKETBASE_URL)

// Polling-Loop für neue CLI Commands
setInterval(async () => {
    try {
        await processCommands()
    } catch (error) {
        console.error('❌ Error processing commands:', error)
    }
}, POLL_INTERVAL)

async function processCommands() {
    try {
        // Hole pending Commands
        const response = await fetch(`${POCKETBASE_URL}/api/collections/cli_commands/records?filter=status='pending'&sort=created`)
        if (!response.ok) return
        
        const data = await response.json()
        
        for (const command of data.items) {
            console.log('🔄 Processing command:', command.command, command.id)
            
            if (command.command === 'opencode_generate') {
                await processOpenCodeGenerate(command)
            } else if (command.command === 'gemini_generate') {
                await processOpenCodeGenerate(command)
            } else if (command.command === 'pdf_generate') {
                await processPdfGenerate(command)
            } else {
                // Mark unknown commands as failed
                await updateCommandStatus(command.id, 'failed')
                console.log('❌ Unknown command type:', command.command)
            }
        }
    } catch (error) {
        console.error('❌ Error fetching commands:', error)
    }
}


async function processOpenCodeGenerate(command) {
    // Get request_id from command ID pattern, or find the latest pending request
    let request_id = null
    let user_need_id = null
    
    try {
        // Find the latest pending generation request
        const response = await fetch(`${POCKETBASE_URL}/api/collections/generation_requests/records?filter=status='pending'&sort=-created&limit=1`)
        if (response.ok) {
            const data = await response.json()
            if (data.items.length > 0) {
                request_id = data.items[0].id
                user_need_id = data.items[0].user_need_id
                console.log(`📋 Found pending request: ${request_id} for user_need: ${user_need_id}`)
            }
        }
    } catch (error) {
        console.error('❌ Error finding pending request:', error)
        return
    }
    
    if (!request_id || !user_need_id) {
        console.log('❌ No pending request found')
        await updateCommandStatus(command.id, 'failed')
        return
    }
    
    try {
        // Update command status
        await updateCommandStatus(command.id, 'processing')
        
        // Create log
        await createLog(request_id, '🚀 Dokumentenerstellung gestartet')
        
        // Get project data from projects collection using request_id (with admin access)
        // Use PocketBase SDK with admin auth to bypass user filtering
        const PocketBase = require('pocketbase')
        const pb = new PocketBase(POCKETBASE_URL)
        
        // Authenticate as admin for system operations
        try {
            await pb.admins.authWithPassword('admin@vergabe.de', 'admin123')
            console.log('✅ Admin authenticated successfully')
        } catch (authError) {
            console.log('⚠️ Admin auth failed:', authError.message)
            console.log('🔄 Trying alternative auth method...')
        }
        
        const projects = await pb.collection('projects').getFullList({
            filter: `request_id = "${user_need_id}"`
        })
        
        if (!projects || projects.length === 0) {
            throw new Error(`No project found with request_id: ${user_need_id}`)
        }
        
        const project = projects[0]
        console.log('🔍 Project Data:', project)
        
        // Load user's OpenAI API key
        const userApiKey = await loadUserApiKey(pb, project.user_id)
        if (!userApiKey) {
            throw new Error('No OpenAI API key found for user')
        }
        process.env.OPENAI_API_KEY = userApiKey
        console.log('🔑 User API key loaded successfully')
        
        // Create comprehensive description from project data
        const description = createComprehensiveDescription(project)
        
        console.log(`🔍 Extracted - Description: "${description}"`)
        
        await createLog(request_id, '📝 Anfrage wird analysiert...')
        
        // Generate documents with OpenCode (sequential for better monitoring)
        // WICHTIG: Verwende user_need_id (project ID) für Dokumente, nicht generation_request.id
        await createLog(request_id, '📋 Erstelle Leistungsbeschreibung...')
        await generateDocumentWithOpenCode(request_id, user_need_id, 'Leistungsbeschreibung', 'leistung', description, project.budget, project.deadline)
        
        await createLog(request_id, '✅ Erstelle Eignungskriterien...')
        await generateDocumentWithOpenCode(request_id, user_need_id, 'Eignungskriterien', 'eignung', description, project.budget, project.deadline)
        
        await createLog(request_id, '🎯 Erstelle Zuschlagskriterien...')
        await generateDocumentWithOpenCode(request_id, user_need_id, 'Zuschlagskriterien', 'zuschlag', description, project.budget, project.deadline)
        
        await createLog(request_id, '🎉 Alle Dokumente erfolgreich erstellt!')
        await updateGenerationStatus(request_id, 'completed')
        await updateCommandStatus(command.id, 'completed')
        
    } catch (error) {
        console.error('❌ Error in OpenCode generation:', error)
        await createLog(request_id, `❌ Fehler: ${error.message}`, 'error')
        await updateGenerationStatus(request_id, 'failed')
        await updateCommandStatus(command.id, 'failed')
    }
}



async function generateDocumentWithOpenCode(request_id, project_id, title, type, description, budget = 0, deadline = '') {
    return new Promise(async (resolve, reject) => {
        const prompt = await createOpenCodePromptForType(type, description, budget, deadline)
        
        console.log(`🤖 Generating ${title} with OpenCode AI Agent...`)
        // Minimale Logs für bessere UX - nur bei Problemen mehr Details
        
        // Use OpenCode in non-interactive mode with standalone flags
        const openCodeArgs = [
            '-p',
            prompt,
            '-m',
            'openai/gpt-4.1-mini',
            '-q'  // quiet mode for scripting/automation
        ]
        
        const openCodePath = process.env.HOME + '/.opencode/bin/opencode'
        const opencode = spawn(openCodePath, openCodeArgs, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PATH: process.env.HOME + '/.opencode/bin:' + process.env.PATH,
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'your-api-key-here'
            }
        })
        
        // Minimaler Progress-Indikator nur für lange Wartezeiten
        const progressInterval = setInterval(async () => {
            await createLog(request_id, `⏳ ${title} wird erstellt...`, 'info')
        }, 15000) // Every 15 seconds - weniger häufig
        
        let output = ''
        let errorOutput = ''
        
        // Stream OpenCode output - minimale Logs
        opencode.stdout.on('data', async (data) => {
            const chunk = data.toString()
            output += chunk
            // Nur Console-Logs für Debugging, keine Frontend-Logs für bessere UX
            if (chunk.trim()) {
                console.log(`📝 OpenCode output chunk: ${chunk.length} chars`)
            }
        })
        
        opencode.stderr.on('data', async (data) => {
            const errorChunk = data.toString()
            errorOutput += errorChunk
            // Nur Console-Logs, keine Frontend-Warnings für bessere UX
            if (errorChunk.trim()) {
                console.log(`⚠️ OpenCode stderr: ${errorChunk.trim()}`)
            }
        })
        
        opencode.on('close', async (code) => {
            clearInterval(progressInterval)
            
            if (code !== 0) {
                console.error(`❌ OpenCode error for ${title}:`, errorOutput)
                await createLog(request_id, `❌ ${title} konnte nicht erstellt werden`, 'error')
                resolve()
            } else {
                console.log(`✅ OpenCode response received for ${title}`)
                
                if (output.trim()) {
                    // Extract content from OpenCode output (remove formatting)
                    const content = extractContentFromOpenCodeOutput(output.trim())
                    
                    await createDocument(project_id, title, content, type)
                    await createLog(request_id, `✅ ${title} fertig`, 'success')
                } else {
                    await createLog(request_id, `⚠️ ${title} konnte nicht erstellt werden`, 'warning')
                }
                resolve()
            }
        })
        
        opencode.on('error', async (error) => {
            clearInterval(progressInterval)
            console.error(`❌ Failed to start OpenCode for ${title}:`, error)
            await createLog(request_id, `❌ ${title} konnte nicht gestartet werden`, 'error')
            resolve()
        })
    })
}

async function createOpenCodePromptForType(type, description, budget = 0, deadline = '') {
    const budgetText = budget > 0 ? ` mit einem Budget von ${budget.toLocaleString('de-DE')}€` : ''
    const deadlineText = deadline ? ` bis ${deadline}` : ''
    
    try {
        // Load prompt from PocketBase
        const PocketBase = require('pocketbase/cjs')
        const pb = new PocketBase(POCKETBASE_URL)
        
        const systemPrompts = await pb.collection('system_prompts').getFullList({
            filter: `prompt_type = "${type}" && active = true`,
            sort: '-version'
        })
        
        if (systemPrompts.length > 0) {
            const promptTemplate = systemPrompts[0].prompt_text
            
            // Replace placeholders in the prompt template
            const finalPrompt = promptTemplate
                .replace(/\{description\}/g, description)
            
            await createLog(null, `📋 System-Prompt aus PocketBase geladen: ${type}`, 'info')
            return finalPrompt
        }
    } catch (error) {
        await createLog(null, `⚠️ Fehler beim Laden des System-Prompts: ${error.message}`, 'warning')
        console.error('Error loading system prompt:', error)
    }
    
    // Fallback to existing prompts if PocketBase fails
    const prompts = {
        'leistung': `Erstelle eine sehr ausführliche und professionelle deutsche Leistungsbeschreibung für öffentliche Vergabe für: ${description}. 

WICHTIG: Die Leistungsbeschreibung muss mindestens 2000 Wörter umfassen und sehr detailliert sein.

Verwende folgende detaillierte Struktur:

# Leistungsbeschreibung

## 1. Projektziel und Zweck
- Ausführliche Beschreibung des Projektziels (mindestens 200 Wörter)
- Strategische Bedeutung für die Organisation
- Erwartete Nutzen und Mehrwerte
- Projektkontext und Hintergrund

## 2. Detaillierter Leistungsumfang
- Vollständige Auflistung aller zu erbringenden Leistungen (mindestens 500 Wörter)
- Arbeitsschritte mit detaillierten Beschreibungen
- Teilleistungen und Meilensteine
- Lieferumfang und Ergebnisse

## 3. Technische Anforderungen
- Detaillierte technische Spezifikationen (mindestens 300 Wörter)
- Systemanforderungen und Schnittstellen
- Kompatibilitätsanforderungen
- Sicherheitsanforderungen

## 4. Qualitätsstandards und Normen
- Anzuwendende Standards und Normen (mindestens 200 Wörter)
- Qualitätssicherungsmaßnahmen
- Prüfverfahren und Abnahmekriterien
- Dokumentationsanforderungen

## 5. Projektmanagement und Kommunikation
- Projektorganisation und Ansprechpartner
- Kommunikationswege und Reporting
- Projektcontrolling und Steuerung
- Risikomanagement

## 6. Lieferung und Abnahme
- Detaillierte Lieferbedingungen (mindestens 200 Wörter)
- Abnahmeverfahren und -kriterien
- Übergabe und Einführung
- Schulung und Wissensvermittlung

## 7. Gewährleistung und Support
- Gewährleistungsumfang und -dauer
- Supportleistungen und Service Level
- Wartung und Pflege
- Weiterentwicklung und Updates

## 8. Rechtliche und vertragliche Bestimmungen
- Geltende Gesetze und Vorschriften
- Vergaberechtliche Bestimmungen
- Haftung und Versicherung
- Datenschutz und Compliance

Format: Markdown mit klaren Überschriften. Beachte deutsche Vergabestandards (VgV, VOL/A, VOB). Mindestens 2000 Wörter Gesamtlänge.`,

        'eignung': `Erstelle sehr ausführliche und professionelle deutsche Eignungskriterien für öffentliche Vergabe für: ${description}${budgetText}${deadlineText}.

WICHTIG: Die Eignungskriterien müssen mindestens 1500 Wörter umfassen und sehr detailliert sein.

Verwende folgende detaillierte Struktur:

# Eignungskriterien

## 1. Fachliche Eignung (Qualifikation und Erfahrung)
- Detaillierte Anforderungen an Qualifikationen (mindestens 300 Wörter)
- Erforderliche Berufserfahrung in Jahren
- Spezifische Fachkenntnisse und Expertise
- Branchenspezifische Erfahrungen
- Nachweise von Referenzprojekten
- Qualifikation der Projektleitung und Schlüsselpersonen

## 2. Technische Eignung (Ausstattung und Verfahren)
- Technische Ausstattung und Infrastruktur (mindestens 250 Wörter)
- Vorhandene Systeme und Software
- Technische Kapazitäten und Ressourcen
- Qualitätsmanagementsysteme (ISO 9001, etc.)
- Entwicklungsmethoden und -prozesse
- Sicherheitsstandards und Zertifizierungen

## 3. Wirtschaftliche Eignung (Finanzkraft und Versicherung)
- Finanzielle Stabilität und Bonität (mindestens 200 Wörter)
- Mindestjahresumsätze der letzten 3 Jahre
- Eigenkapitalquote und Liquidität
- Betriebshaftpflichtversicherung (Mindestdeckungssumme)
- Vermögensschadenhaftpflicht
- Bonitätsnachweis und Referenzen

## 4. Referenzen und Nachweise
- Mindestanzahl vergleichbarer Projekte (mindestens 250 Wörter)
- Projektvolumen und Komplexität
- Zeitraum der Referenzprojekte
- Kundenzufriedenheit und Bewertungen
- Erfolgreiche Projektabschlüsse
- Auszeichnungen und Zertifikate

## 5. Erforderliche Zertifikate und Nachweise
- Branchenspezifische Zertifizierungen (mindestens 200 Wörter)
- Datenschutz- und Sicherheitszertifikate
- Qualitätsmanagementsysteme
- Umweltmanagementsysteme
- Compliance-Nachweise
- Fachverbandsmitgliedschaften

## 6. Personelle Eignung
- Projektteam und Schlüsselpersonen
- Qualifikationsnachweise der Mitarbeiter
- Verfügbarkeit und Kapazitäten
- Schulungen und Weiterbildungen
- Sprachkenntnisse und Kommunikationsfähigkeiten

## 7. Organisatorische Eignung
- Unternehmensstruktur und -größe
- Projektorganisation und -management
- Kommunikationsprozesse
- Risikomanagement
- Notfallpläne und Backup-Lösungen

Format: Markdown mit klaren Überschriften. Beachte EU-Vergaberichtlinien und deutsche Vergabestandards. Mindestens 1500 Wörter Gesamtlänge.`,

        'zuschlag': `Erstelle sehr ausführliche und professionelle deutsche Zuschlagskriterien für öffentliche Vergabe für: ${description}${budgetText}${deadlineText}.

WICHTIG: Die Zuschlagskriterien müssen mindestens 1500 Wörter umfassen und sehr detailliert sein.

Verwende folgende detaillierte Struktur:

# Zuschlagskriterien

## 1. Bewertungsmatrix mit Gewichtung
- Übersicht aller Bewertungskriterien (mindestens 200 Wörter)
- Gewichtung in Prozent für jedes Kriterium
- Begründung der Gewichtungsfaktoren
- Zusammenhang zwischen Kriterien und Projektzielen
- Bewertungsverfahren und -methodik

## 2. Preis-Kriterien (Gewichtung: 40%)
- Gesamtpreis für alle Leistungen (mindestens 300 Wörter)
- Preis-Leistungs-Verhältnis
- Kostentransparenz und Nachvollziehbarkeit
- Lebenszykluskosten (Total Cost of Ownership)
- Optionale Zusatzleistungen
- Währungsrisiken und Preisanpassungen
- Zahlungsmodalitäten und Konditionen

## 3. Qualitäts-Kriterien (Gewichtung: 35%)
- Qualität der Projektplanung und -konzeption (mindestens 300 Wörter)
- Qualifikation des Projektteams
- Methodische Herangehensweise
- Qualitätssicherungsmaßnahmen
- Referenzen und Erfahrungen
- Innovationsgrad und Kreativität
- Nachhaltigkeit und Umweltaspekte

## 4. Termin-Kriterien (Gewichtung: 15%)
- Realistische Zeitplanung und Projektdauer (mindestens 200 Wörter)
- Meilensteine und Zwischentermine
- Pufferzeiten und Risikomanagement
- Flexibilität bei Terminanpassungen
- Liefertreue und Zuverlässigkeit
- Projektcontrolling und Steuerung

## 5. Zusätzliche Bewertungsaspekte (Gewichtung: 10%)
- Service und Support (mindestens 200 Wörter)
- Lokale Präsenz und Erreichbarkeit
- Wartung und Weiterentwicklung
- Schulung und Wissensvermittlung
- Compliance und Rechtssicherheit
- Datenschutz und Informationssicherheit

## 6. Punktevergabe-System
- Bewertungsskala (0-100 Punkte) (mindestens 200 Wörter)
- Gewichtung der Teilkriterien
- Berechnung der Gesamtpunktzahl
- Mindestpunktzahl für die Berücksichtigung
- Ausschlusskriterien bei Nichterreichen
- Verfahren bei Punktgleichheit

## 7. Bewertungsverfahren
- Bewertungsgremium und Zuständigkeiten
- Bewertungsablauf und -termine
- Transparenz und Nachvollziehbarkeit
- Dokumentation der Bewertung
- Mitteilung der Ergebnisse

## 8. Rechtliche Bestimmungen
- Vergaberechtliche Grundlagen
- Gleichbehandlungsgrundsatz
- Wirtschaftlichkeitsprinzip
- Rechtsschutzmöglichkeiten

Format: Markdown mit klaren Überschriften. Stelle sicher, dass die Gewichtungen 100% ergeben. Beachte deutsche Vergabestandards (VgV, VOL/A, VOB). Mindestens 1500 Wörter Gesamtlänge.`
    }
    
    return prompts[type] || prompts['leistung']
}

function extractContentFromOpenCodeOutput(output) {
    // Extract markdown content from OpenCode output
    const lines = output.split('\n')
    
    // Find markdown code block if present
    const markdownBlockRegex = /```markdown([\s\S]*?)```/
    const markdownMatch = output.match(markdownBlockRegex)
    
    if (markdownMatch) {
        // Return content inside markdown code block
        return markdownMatch[1].trim()
    }
    
    // If no markdown block, extract meaningful content
    const contentLines = []
    let skipOpenCodeUI = false
    
    for (const line of lines) {
        const trimmedLine = line.trim()
        
        // Skip OpenCode UI elements and ANSI escape sequences
        if (line.includes('█') || line.includes('@') || line.includes('[0m') || 
            line.includes('[1m') || line.includes('[90m') || line.includes('[92m') ||
            trimmedLine.startsWith('>') || trimmedLine.includes('openai/gpt')) {
            continue
        }
        
        // Start collecting content when we see markdown headers or substantial text
        if (trimmedLine.startsWith('#') || 
            (trimmedLine.length > 30 && !trimmedLine.includes('opencode'))) {
            skipOpenCodeUI = true
        }
        
        if (skipOpenCodeUI && trimmedLine.length > 0) {
            contentLines.push(trimmedLine)
        }
    }
    
    // Return the extracted content or fallback
    return contentLines.length > 0 ? contentLines.join('\n') : output.trim()
}

function createComprehensiveDescription(project) {
    let description = ""
    
    // Projekt-Grunddaten
    description += `PROJEKT: ${project.name || 'Unbenanntes Projekt'}\n`
    if (project.description) {
        description += `BESCHREIBUNG: ${project.description}\n`
    }
    if (project.budget && project.budget > 0) {
        description += `BUDGET: ${project.budget.toLocaleString('de-DE')} €\n`
    }
    if (project.deadline) {
        description += `DEADLINE: ${project.deadline}\n`
    }
    
    // Eckpunkte-Details (falls vorhanden)
    if (project.eckpunkte && project.eckpunkte.trim()) {
        description += `\nDETAILLIERTE ECKPUNKTE:\n${project.eckpunkte}\n`
    }
    
    return description.trim() || 'Keine detaillierten Projektinformationen verfügbar'
}

// Fallback templates removed - only use real AI output

// Helper functions
async function updateCommandStatus(commandId, status) {
    try {
        await fetch(`${POCKETBASE_URL}/api/collections/cli_commands/records/${commandId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        })
    } catch (error) {
        console.error('❌ Failed to update command status:', error)
    }
}

async function updateGenerationStatus(requestId, status) {
    try {
        await fetch(`${POCKETBASE_URL}/api/collections/generation_requests/records/${requestId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        })
    } catch (error) {
        console.error('❌ Failed to update generation status:', error)
    }
}

async function createLog(requestId, message, level = 'info') {
    try {
        await fetch(`${POCKETBASE_URL}/api/collections/logs/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                level,
                request_id: requestId
            })
        })
    } catch (error) {
        console.error('❌ Failed to create log:', error)
    }
}

async function createDocument(projectId, title, content, type) {
    try {
        const response = await fetch(`${POCKETBASE_URL}/api/collections/documents/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                request_id: projectId,  // Verwende die Projekt-ID (user_need_id) für konsistente Zuordnung
                title,
                content,
                type,
                created_by: 'OpenCode AI'
            })
        })
        
        if (response.ok) {
            console.log(`✅ Document created: ${title}`)
            await createLog(projectId, `✅ Dokument erstellt: ${title}`)
        }
    } catch (error) {
        console.error('❌ Failed to create document:', error)
        await createLog(projectId, `❌ Fehler beim Erstellen von ${title}: ${error.message}`, 'error')
    }
}

// =====================================================
// PDF-GENERATION FUNCTIONS
// =====================================================

async function processPdfGenerate(command) {
    // Get request_id and pdf_type from command
    let request_id = null
    let pdf_type = 'gesamtpaket' // default
    
    try {
        // Parse command data if available
        if (command.data && typeof command.data === 'string') {
            const commandData = JSON.parse(command.data)
            request_id = commandData.request_id
            pdf_type = commandData.pdf_type || 'gesamtpaket'
        }
        
        // Fallback: Find the latest completed generation request
        if (!request_id) {
            const response = await fetch(`${POCKETBASE_URL}/api/collections/generation_requests/records?filter=status="completed"&sort=-created&limit=1`)
            if (response.ok) {
                const data = await response.json()
                if (data.items.length > 0) {
                    request_id = data.items[0].id
                    console.log(`📋 Found completed request: ${request_id}`)
                }
            }
        }
    } catch (error) {
        console.error('❌ Error parsing command data:', error)
    }
    
    if (!request_id) {
        console.log('❌ No request found for PDF generation')
        await updateCommandStatus(command.id, 'failed')
        return
    }
    
    try {
        // Update command status
        await updateCommandStatus(command.id, 'processing')
        
        // Create PDF export record
        const pdfExportData = {
            request_id: request_id,
            title: `PDF Export - ${pdf_type}`,
            pdf_type: pdf_type,
            generation_status: 'processing',
            created_by: 'OpenCode PDF Generator'
        }
        
        const pdfExportResponse = await fetch(`${POCKETBASE_URL}/api/collections/pdf_exports/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pdfExportData)
        })
        
        if (!pdfExportResponse.ok) {
            throw new Error('Failed to create PDF export record')
        }
        
        const pdfExport = await pdfExportResponse.json()
        console.log(`📄 PDF export record created: ${pdfExport.id}`)
        
        // Create log
        await createLog(request_id, '🚀 PDF-Generation mit OpenCode gestartet')
        
        // Generate PDF with OpenCode
        await generatePdfWithOpenCode(request_id, pdfExport.id, pdf_type)
        
        await createLog(request_id, '🎉 PDF-Generation abgeschlossen!')
        await updateCommandStatus(command.id, 'completed')
        
    } catch (error) {
        console.error('❌ Error in PDF generation:', error)
        await createLog(request_id, `❌ PDF-Fehler: ${error.message}`, 'error')
        await updateCommandStatus(command.id, 'failed')
    }
}

async function generatePdfWithOpenCode(request_id, pdf_export_id, pdf_type) {
    return new Promise((resolve, reject) => {
        console.log(`📄 Generating PDF with OpenCode for type: ${pdf_type}`)
        createLog(request_id, `📄 Erstelle PDF (${pdf_type}) mit OpenCode...`)
        
        // Create OpenCode prompt for PDF generation
        const prompt = createPdfPromptForType(pdf_type, request_id)
        
        // Use OpenCode run command
        const openCodeArgs = ['run', prompt]
        const openCodePath = process.env.HOME + '/.opencode/bin/opencode'
        
        const opencode = spawn(openCodePath, openCodeArgs, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PATH: process.env.HOME + '/.opencode/bin:' + process.env.PATH,
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'your-api-key-here'
            }
        })
        
        // Add progress indicator
        const progressInterval = setInterval(async () => {
            await createLog(request_id, `⏳ OpenCode generiert PDF... (PID: ${opencode.pid})`, 'info')
        }, 10000) // Every 10 seconds
        
        let output = ''
        let errorOutput = ''
        
        // Stream OpenCode output
        opencode.stdout.on('data', async (data) => {
            const chunk = data.toString()
            output += chunk
            
            // Log PDF generation progress
            if (chunk.includes('pandoc') || chunk.includes('.pdf')) {
                console.log(`📝 OpenCode PDF generation progress detected`)
                await createLog(request_id, `📡 PDF wird erstellt...`, 'info')
            }
        })
        
        opencode.stderr.on('data', async (data) => {
            const errorChunk = data.toString()
            errorOutput += errorChunk
            
            if (errorChunk.trim()) {
                console.log(`⚠️ OpenCode PDF stderr: ${errorChunk.trim()}`)
            }
        })
        
        opencode.on('close', async (code) => {
            clearInterval(progressInterval)
            
            if (code !== 0) {
                console.error(`❌ OpenCode PDF generation failed:`, errorOutput)
                await createLog(request_id, `❌ PDF-Generation fehlgeschlagen: Code ${code}`, 'error')
                await updatePdfExportStatus(pdf_export_id, 'failed')
                resolve()
            } else {
                console.log(`✅ OpenCode PDF generation completed`)
                await createLog(request_id, `✅ PDF wurde erfolgreich generiert!`, 'success')
                
                // Check if PDF file was created and upload it
                await uploadGeneratedPdf(request_id, pdf_export_id, pdf_type)
                resolve()
            }
        })
        
        opencode.on('error', async (error) => {
            clearInterval(progressInterval)
            console.error(`❌ Failed to start OpenCode PDF generation:`, error)
            await createLog(request_id, `❌ OpenCode PDF-Aufruf fehlgeschlagen: ${error.message}`, 'error')
            await updatePdfExportStatus(pdf_export_id, 'failed')
            resolve()
        })
    })
}

function createPdfPromptForType(pdf_type, request_id) {
    const prompts = {
        'einzeldokument': `
Lies die neueste Markdown-Datei in diesem Verzeichnis und konvertiere sie in ein professionell formatiertes PDF.

ANFORDERUNGEN:
- Nutze pandoc für die Konvertierung
- Füge ein Inhaltsverzeichnis hinzu (--toc)
- Nummeriere alle Abschnitte (--number-sections) 
- Verwende XeLaTeX als PDF-Engine für beste Qualität
- Erstelle ein professionelles Layout

DATEINAME: Verwende einen aussagekräftigen Namen basierend auf dem Inhalt.
`,
        
        'gesamtpaket': `
Erstelle ein vollständiges PDF-Paket für die Vergabeunterlagen.

AUFGABEN:
1. Sammle alle generierten Dokumente für Request ${request_id}
2. Erstelle ein Deckblatt mit Projekttitel und Datum
3. Füge ein detailliertes Inhaltsverzeichnis hinzu
4. Kombiniere alle Dokumente in logischer Reihenfolge:
   - Leistungsbeschreibung
   - Eignungskriterien  
   - Zuschlagskriterien
   - Weitere verfügbare Dokumente
5. Formatiere als professionelles PDF mit Seitenzahlen

AUSGABE: PDF-Datei mit Namen "Vergabeunterlagen_Komplett.pdf"
`,
        
        'compliance_bericht': `
Erstelle einen Compliance-Bericht als PDF für das Vergabeverfahren.

INHALT:
1. Executive Summary der Rechtsprüfung
2. Detaillierte Compliance-Checks (GWB, VgV, VOL/VOB)
3. Risikobewertung und Empfehlungen
4. Dokumentation der Verfahrenswahl
5. Rechtliche Absicherung

FORMAT: Professioneller Bericht mit Corporate Design
AUSGABE: "Compliance_Bericht.pdf"
`,
        
        'projektdokumentation': `
Erstelle eine vollständige Projektdokumentation als PDF.

STRUKTUR:
1. Projektübersicht und Ziele
2. Bedarfsanalyse und Requirements
3. Marktanalyse und Anbieter-Bewertung
4. Vergabeverfahren und Dokumentation
5. Compliance und Rechtsprüfung
6. Entscheidungsdokumentation
7. Anhänge und Referenzen

FORMAT: Umfassende Dokumentation für Archivierung
AUSGABE: "Projekt_Dokumentation_Komplett.pdf"
`
    }
    
    return prompts[pdf_type] || prompts['gesamtpaket']
}

async function uploadGeneratedPdf(request_id, pdf_export_id, pdf_type) {
    try {
        // Look for generated PDF files
        const fs = require('fs')
        const path = require('path')
        
        // Common PDF filenames that OpenCode might generate
        const possiblePdfFiles = [
            'VERGABE_ANWENDUNGSFAELLE_ERWEITERUNG.pdf',
            'Vergabeunterlagen_Komplett.pdf',
            'Compliance_Bericht.pdf', 
            'Projekt_Dokumentation_Komplett.pdf'
        ]
        
        let pdfFilePath = null
        
        // Find the most recently created PDF
        for (const filename of possiblePdfFiles) {
            if (fs.existsSync(filename)) {
                pdfFilePath = path.resolve(filename)
                break
            }
        }
        
        // Fallback: find any PDF file created recently
        if (!pdfFilePath) {
            const files = fs.readdirSync('.').filter(f => f.endsWith('.pdf'))
            if (files.length > 0) {
                // Get the most recently modified PDF
                const pdfFiles = files.map(f => ({
                    name: f,
                    time: fs.statSync(f).mtime.getTime()
                })).sort((a, b) => b.time - a.time)
                
                pdfFilePath = path.resolve(pdfFiles[0].name)
            }
        }
        
        if (!pdfFilePath) {
            throw new Error('No PDF file found after generation')
        }
        
        console.log(`📄 Found generated PDF: ${pdfFilePath}`)
        await createLog(request_id, `📄 PDF gefunden: ${path.basename(pdfFilePath)}`, 'info')
        
        // Upload PDF to PocketBase using FormData
        const FormData = require('form-data')
        const form = new FormData()
        
        form.append('pdf_file', fs.createReadStream(pdfFilePath))
        form.append('generation_status', 'completed')
        
        const uploadResponse = await fetch(`${POCKETBASE_URL}/api/collections/pdf_exports/records/${pdf_export_id}`, {
            method: 'PATCH',
            body: form
        })
        
        if (uploadResponse.ok) {
            console.log(`✅ PDF uploaded successfully for export ${pdf_export_id}`)
            await createLog(request_id, `✅ PDF wurde in Datenbank gespeichert`, 'success')
            
            // Update source documents in pdf_export
            await updatePdfSourceDocuments(pdf_export_id, request_id)
        } else {
            throw new Error('Failed to upload PDF to PocketBase')
        }
        
    } catch (error) {
        console.error('❌ Error uploading PDF:', error)
        await createLog(request_id, `❌ PDF-Upload fehlgeschlagen: ${error.message}`, 'error')
        await updatePdfExportStatus(pdf_export_id, 'failed')
    }
}

async function updatePdfExportStatus(pdf_export_id, status) {
    try {
        await fetch(`${POCKETBASE_URL}/api/collections/pdf_exports/records/${pdf_export_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ generation_status: status })
        })
    } catch (error) {
        console.error('❌ Failed to update PDF export status:', error)
    }
}

async function loadUserApiKey(pb, userId) {
    try {
        const apiKeys = await pb.collection('user_api_keys').getFullList({
            filter: `user_id="${userId}" && provider="openai" && active=true`,
            sort: '-created'
        })
        
        if (apiKeys.length > 0) {
            return apiKeys[0].api_key
        }
        
        // Fallback: Try to get admin/system default key
        const systemKeys = await pb.collection('user_api_keys').getFullList({
            filter: `provider="openai" && active=true`,
            sort: '-created'
        })
        
        if (systemKeys.length > 0) {
            console.log('⚠️ Using system fallback API key')
            return systemKeys[0].api_key
        }
        
        return null
    } catch (error) {
        console.error('❌ Error loading user API key:', error)
        return null
    }
}

async function updatePdfSourceDocuments(pdf_export_id, request_id) {
    try {
        // Get all documents for this request
        const docsResponse = await fetch(`${POCKETBASE_URL}/api/collections/documents/records?filter=request_id="${request_id}"`)
        if (docsResponse.ok) {
            const docsData = await docsResponse.json()
            const sourceDocuments = docsData.items.map(doc => ({
                id: doc.id,
                title: doc.title,
                type: doc.type
            }))
            
            // Update PDF export with source documents
            await fetch(`${POCKETBASE_URL}/api/collections/pdf_exports/records/${pdf_export_id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source_documents: sourceDocuments })
            })
        }
    } catch (error) {
        console.error('❌ Failed to update PDF source documents:', error)
    }
}