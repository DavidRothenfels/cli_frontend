# CLI Multi-User Parallelitäts-Plan

## 🎯 Ziel
Implementierung eines Multi-User CLI Systems, das **20-50 User gleichzeitig** verarbeiten kann ohne Konflikte.

## 📊 Aktuelle Situation

### Probleme:
- **API Key Überschreibung**: `process.env.OPENAI_API_KEY` wird global gesetzt
- **Arbeitsverzeichnis-Konflikte**: Alle User arbeiten im gleichen Verzeichnis
- **Datei-Überschreibungen**: PDF-Generierung überschreibt sich gegenseitig
- **Keine Prozess-Isolation**: OpenCode-Instanzen können sich beeinflussen

### Kapazitätsgrenzen:
- **OpenAI API**: 500 req/min pro API Key (User haben eigene Keys ✅)
- **Prozess-Limits**: ~1024 Prozesse pro Container
- **Memory**: ~150MB pro User (3 Dokumente × 50MB)
- **Dateisystem**: /tmp Konflikte bei gleichzeitiger Nutzung

## 🔧 Verbesserungsstrategie

### 1. User-spezifische Arbeitsverzeichnisse

#### Technische Implementierung:
```javascript
const path = require('path')
const os = require('os')
const fs = require('fs')
const crypto = require('crypto')

// Sichere, eindeutige Verzeichnisstruktur
function createUserWorkDirectory(userId, requestId) {
    const timestamp = Date.now()
    const randomSuffix = crypto.randomBytes(8).toString('hex')
    const workDir = path.join(
        os.tmpdir(), 
        'opencode_sessions',
        `user_${userId}`,
        `req_${requestId}_${timestamp}_${randomSuffix}`
    )
    
    // Rekursive Verzeichniserstellung mit Berechtigungen
    fs.mkdirSync(workDir, { 
        recursive: true, 
        mode: 0o755 
    })
    
    // Subverzeichnisse für verschiedene Dateitypen
    const subdirs = ['prompts', 'outputs', 'temp', 'pdfs']
    subdirs.forEach(subdir => {
        fs.mkdirSync(path.join(workDir, subdir), { mode: 0o755 })
    })
    
    return {
        root: workDir,
        prompts: path.join(workDir, 'prompts'),
        outputs: path.join(workDir, 'outputs'),
        temp: path.join(workDir, 'temp'),
        pdfs: path.join(workDir, 'pdfs')
    }
}

// Erweiterte Prozess-Isolation
const opencode = spawn(openCodePath, openCodeArgs, {
    cwd: workDirPaths.root,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
        // Basis-Environment
        PATH: process.env.PATH,
        LANG: process.env.LANG,
        
        // User-spezifische Isolation
        OPENAI_API_KEY: userApiKey,
        TMPDIR: workDirPaths.temp,
        HOME: workDirPaths.root,
        
        // OpenCode-spezifische Konfiguration
        OPENCODE_OUTPUT_DIR: workDirPaths.outputs,
        OPENCODE_CACHE_DIR: workDirPaths.temp,
        
        // Sicherheits-Umgebung
        USER: `opencode_${userId}`,
        LOGNAME: `opencode_${userId}`,
        
        // Resource-Limits über Environment
        NODE_OPTIONS: '--max-old-space-size=512',
        OPENCODE_MAX_TOKENS: '8192',
        OPENCODE_TIMEOUT: '300000'  // 5 Minuten
    },
    
    // Zusätzliche Sicherheitsoptionen
    detached: false,
    windowsHide: true,
    timeout: 300000  // 5 Minuten Timeout
})
```

#### Verzeichnisstruktur:
```
/tmp/opencode_sessions/
├── user_12345/
│   ├── req_abc123_1625097600000_f4e2d1c8/
│   │   ├── prompts/          # Input-Prompts
│   │   ├── outputs/          # OpenCode-Ausgaben
│   │   ├── temp/             # Temporäre Dateien
│   │   └── pdfs/             # PDF-Generierung
│   └── req_def456_1625097700000_a1b2c3d4/
└── user_67890/
    └── req_ghi789_1625097800000_e5f6g7h8/
```

### 2. Erweiterte Konkurrenz-Management

#### Detaillierte Implementierung:
```javascript
class ConcurrencyManager {
    constructor(maxConcurrent = 20) {
        this.maxConcurrent = maxConcurrent
        this.activeProcesses = new Map()
        this.queuedRequests = new Map()
        this.processingStats = new Map()
        this.resourceMonitor = new ResourceMonitor()
    }
    
    async canProcessUser(userId) {
        // 1. Prüfe maximale Anzahl aktiver Prozesse
        if (this.activeProcesses.size >= this.maxConcurrent) {
            return { allowed: false, reason: 'max_concurrent_reached' }
        }
        
        // 2. Prüfe ob User bereits aktiv
        if (this.activeProcesses.has(userId)) {
            return { allowed: false, reason: 'user_already_active' }
        }
        
        // 3. Prüfe Systemressourcen
        const resources = await this.resourceMonitor.getCurrentUsage()
        if (resources.memoryUsage > 0.85) {
            return { allowed: false, reason: 'memory_threshold_exceeded' }
        }
        
        if (resources.diskUsage > 0.90) {
            return { allowed: false, reason: 'disk_threshold_exceeded' }
        }
        
        // 4. Prüfe User-spezifische Rate Limits
        const userStats = this.processingStats.get(userId) || { lastRequest: 0, requestCount: 0 }
        const now = Date.now()
        const timeSinceLastRequest = now - userStats.lastRequest
        
        if (timeSinceLastRequest < 30000) {  // 30 Sekunden zwischen Requests
            return { allowed: false, reason: 'rate_limit_exceeded' }
        }
        
        return { allowed: true }
    }
    
    async reserveSlot(userId, requestId) {
        const processInfo = {
            userId,
            requestId,
            startTime: Date.now(),
            status: 'initializing',
            workDir: null,
            processes: new Set()
        }
        
        this.activeProcesses.set(userId, processInfo)
        
        // Update User-Statistiken
        const userStats = this.processingStats.get(userId) || { requestCount: 0, lastRequest: 0 }
        userStats.requestCount++
        userStats.lastRequest = Date.now()
        this.processingStats.set(userId, userStats)
        
        return processInfo
    }
    
    async releaseSlot(userId) {
        const processInfo = this.activeProcesses.get(userId)
        if (processInfo) {
            // Terminiere alle laufenden Prozesse
            for (const childProcess of processInfo.processes) {
                if (!childProcess.killed) {
                    childProcess.kill('SIGTERM')
                }
            }
            
            // Cleanup Arbeitsverzeichnis
            if (processInfo.workDir) {
                await this.cleanupWorkDirectory(processInfo.workDir)
            }
            
            this.activeProcesses.delete(userId)
            
            // Prüfe Queue für wartende Requests
            await this.processQueuedRequests()
        }
    }
    
    async processQueuedRequests() {
        for (const [userId, queuedRequest] of this.queuedRequests) {
            const canProcess = await this.canProcessUser(userId)
            if (canProcess.allowed) {
                this.queuedRequests.delete(userId)
                // Starte verarbeiteten Request
                queuedRequest.resolve()
            }
        }
    }
}
```

### 3. Parallele Dokumentenerstellung mit Fehlerbehandlung

#### Robuste Implementierung:
```javascript
async function generateDocumentsParallel(requestId, projectId, description, budget, deadline, userApiKey, workDirPaths) {
    const documentTypes = [
        { type: 'leistung', title: 'Leistungsbeschreibung', priority: 1 },
        { type: 'eignung', title: 'Eignungskriterien', priority: 2 },
        { type: 'zuschlag', title: 'Zuschlagskriterien', priority: 3 }
    ]
    
    // Erstelle Promise für jedes Dokument mit Retry-Logik
    const documentPromises = documentTypes.map(async (docInfo) => {
        const maxRetries = 3
        let lastError = null
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await createLog(requestId, `📝 Erstelle ${docInfo.title} (Versuch ${attempt}/${maxRetries})`)
                
                const result = await generateDocumentWithTimeout(
                    requestId, 
                    projectId, 
                    docInfo.title, 
                    docInfo.type, 
                    description, 
                    budget, 
                    deadline, 
                    userApiKey, 
                    workDirPaths,
                    300000  // 5 Minuten Timeout
                )
                
                await createLog(requestId, `✅ ${docInfo.title} erfolgreich erstellt`)
                return result
                
            } catch (error) {
                lastError = error
                await createLog(requestId, `⚠️ ${docInfo.title} Versuch ${attempt} fehlgeschlagen: ${error.message}`)
                
                if (attempt < maxRetries) {
                    // Exponential backoff
                    const backoffTime = Math.pow(2, attempt) * 1000
                    await new Promise(resolve => setTimeout(resolve, backoffTime))
                }
            }
        }
        
        // Alle Versuche fehlgeschlagen
        await createLog(requestId, `❌ ${docInfo.title} konnte nicht erstellt werden: ${lastError.message}`, 'error')
        throw new Error(`Failed to generate ${docInfo.title} after ${maxRetries} attempts: ${lastError.message}`)
    })
    
    // Promise.allSettled für partielle Erfolge
    const results = await Promise.allSettled(documentPromises)
    
    // Analysiere Ergebnisse
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    await createLog(requestId, `📊 Dokumentenerstellung abgeschlossen: ${successful} erfolgreich, ${failed} fehlgeschlagen`)
    
    // Wenn mindestens ein Dokument erstellt wurde, ist es ein Teilerfolg
    if (successful > 0) {
        return { status: 'partial_success', successful, failed, results }
    } else {
        throw new Error('Alle Dokumente konnten nicht erstellt werden')
    }
}

// Timeout-Wrapper für Dokument-Generierung
async function generateDocumentWithTimeout(requestId, projectId, title, type, description, budget, deadline, userApiKey, workDirPaths, timeout) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`Timeout: ${title} generation exceeded ${timeout}ms`))
        }, timeout)
        
        generateDocumentWithOpenCodeImproved(
            requestId, projectId, title, type, description, budget, deadline, userApiKey, workDirPaths
        ).then(result => {
            clearTimeout(timeoutId)
            resolve(result)
        }).catch(error => {
            clearTimeout(timeoutId)
            reject(error)
        })
    })
}
```

### 4. Erweiterte Cleanup-Strategie

#### Umfassende Implementierung:
```javascript
class ResourceManager {
    constructor() {
        this.workDirectories = new Map()
        this.cleanupInterval = 300000  // 5 Minuten
        this.maxDirectoryAge = 1800000  // 30 Minuten
        this.maxDiskUsage = 0.85  // 85% Disk-Nutzung
        
        // Starte Cleanup-Timer
        setInterval(() => this.performCleanup(), this.cleanupInterval)
        
        // Graceful Shutdown Handler
        process.on('SIGTERM', () => this.gracefulShutdown())
        process.on('SIGINT', () => this.gracefulShutdown())
    }
    
    registerWorkDirectory(userId, workDirInfo) {
        this.workDirectories.set(userId, {
            ...workDirInfo,
            created: Date.now(),
            lastAccessed: Date.now(),
            size: 0
        })
    }
    
    async performCleanup() {
        const now = Date.now()
        const cleanupCandidates = []
        
        // 1. Alterbasierte Cleanup
        for (const [userId, workDirInfo] of this.workDirectories) {
            const age = now - workDirInfo.created
            if (age > this.maxDirectoryAge) {
                cleanupCandidates.push({ userId, reason: 'age_exceeded', age })
            }
        }
        
        // 2. Disk-Usage basierte Cleanup
        const diskUsage = await this.getDiskUsage()
        if (diskUsage > this.maxDiskUsage) {
            // Sortiere nach Alter (älteste zuerst)
            const sortedDirs = Array.from(this.workDirectories.entries())
                .sort(([,a], [,b]) => a.created - b.created)
            
            // Cleanup bis Disk-Usage unter Schwellenwert
            for (const [userId, workDirInfo] of sortedDirs) {
                cleanupCandidates.push({ userId, reason: 'disk_pressure', diskUsage })
                
                if (await this.getDiskUsage() < this.maxDiskUsage * 0.8) {
                    break
                }
            }
        }
        
        // 3. Führe Cleanup durch
        for (const candidate of cleanupCandidates) {
            await this.cleanupUserWorkDirectory(candidate.userId, candidate.reason)
        }
        
        // 4. Garbage Collection
        if (global.gc) {
            global.gc()
        }
    }
    
    async cleanupUserWorkDirectory(userId, reason = 'manual') {
        const workDirInfo = this.workDirectories.get(userId)
        if (!workDirInfo) return
        
        try {
            console.log(`🧹 Cleanup work directory for user ${userId} (reason: ${reason})`)
            
            // Sichere Cleanup-Reihenfolge
            const cleanupSteps = [
                { path: workDirInfo.pdfs, name: 'PDFs' },
                { path: workDirInfo.outputs, name: 'Outputs' },
                { path: workDirInfo.temp, name: 'Temp' },
                { path: workDirInfo.prompts, name: 'Prompts' },
                { path: workDirInfo.root, name: 'Root' }
            ]
            
            for (const step of cleanupSteps) {
                if (fs.existsSync(step.path)) {
                    await this.safeRemoveDirectory(step.path)
                    console.log(`  ✅ Cleaned ${step.name}`)
                }
            }
            
            this.workDirectories.delete(userId)
            console.log(`✅ Work directory cleanup completed for user ${userId}`)
            
        } catch (error) {
            console.error(`❌ Error cleaning up work directory for user ${userId}:`, error)
        }
    }
    
    async safeRemoveDirectory(dirPath) {
        return new Promise((resolve, reject) => {
            // Timeout für Cleanup-Operationen
            const timeout = setTimeout(() => {
                reject(new Error(`Timeout cleaning directory: ${dirPath}`))
            }, 30000)
            
            fs.rm(dirPath, { recursive: true, force: true }, (error) => {
                clearTimeout(timeout)
                if (error) {
                    reject(error)
                } else {
                    resolve()
                }
            })
        })
    }
    
    async getDiskUsage() {
        return new Promise((resolve) => {
            const { execSync } = require('child_process')
            try {
                const output = execSync('df /tmp | tail -1', { encoding: 'utf8' })
                const parts = output.split(/\s+/)
                const usage = parseInt(parts[4].replace('%', '')) / 100
                resolve(usage)
            } catch (error) {
                console.error('Error getting disk usage:', error)
                resolve(0.5)  // Fallback
            }
        })
    }
    
    async gracefulShutdown() {
        console.log('🛑 Graceful shutdown initiated - cleaning up all work directories...')
        
        const cleanupPromises = Array.from(this.workDirectories.keys()).map(userId => 
            this.cleanupUserWorkDirectory(userId, 'shutdown')
        )
        
        await Promise.allSettled(cleanupPromises)
        console.log('✅ Graceful shutdown completed')
        process.exit(0)
    }
}
```

## 📈 Erwartete Kapazität

### Szenario A: Konservativ (20 User)
- **Memory**: 20 × 150MB = 3GB
- **Prozesse**: 20 × 3 = 60 Prozesse
- **Disk**: 20 × 10MB = 200MB /tmp
- **OpenAI**: 20 × 500 req/min = 10K req/min

### Szenario B: Optimiert (50 User)
- **Memory**: 50 × 150MB = 7.5GB
- **Prozesse**: 50 × 3 = 150 Prozesse
- **Disk**: 50 × 10MB = 500MB /tmp
- **OpenAI**: 50 × 500 req/min = 25K req/min

### Szenario C: Maximum (100 User)
- **Memory**: 100 × 150MB = 15GB (benötigt größeren Container)
- **Prozesse**: 100 × 3 = 300 Prozesse
- **Disk**: 100 × 10MB = 1GB /tmp
- **OpenAI**: 100 × 500 req/min = 50K req/min

## 🚀 Implementierungsschritte

### Phase 1: Grundlegende Isolation (Woche 1-2)

#### 1.1 User-spezifische Arbeitsverzeichnisse
```javascript
// Dateistruktur in process_cli_commands.js
const fs = require('fs')
const path = require('path')
const os = require('os')

// Funktionen hinzufügen:
- createUserWorkDirectory(userId, requestId)
- cleanupUserWorkDirectory(userId)
- ensureDirectoryStructure(workDirPaths)
```

**Dateien zu ändern:**
- `process_cli_commands.js` → `process_cli_commands_v2.js`
- `supervisord.conf` → Umgebungsvariablen hinzufügen
- `Dockerfile` → Zusätzliche Pakete für Monitoring

#### 1.2 API Key Isolation
```javascript
// In generateDocumentWithOpenCodeImproved()
const opencode = spawn(openCodePath, openCodeArgs, {
    env: {
        OPENAI_API_KEY: userApiKey,  // Statt process.env.OPENAI_API_KEY
        // ... andere Environment-Variablen
    }
})
```

#### 1.3 Kapazitäts-Management
```javascript
// Neue Klasse in process_cli_commands_v2.js
class ConcurrencyManager {
    constructor(maxConcurrent = 20) { /* ... */ }
    async canProcessUser(userId) { /* ... */ }
    async reserveSlot(userId, requestId) { /* ... */ }
    async releaseSlot(userId) { /* ... */ }
}
```

### Phase 2: Performance-Optimierung (Woche 3-4)

#### 2.1 Parallele Dokumentenerstellung
```javascript
// Ersetze sequenzielle Dokumentenerstellung
// Alt:
await generateDocumentWithOpenCode(requestId, userNeedId, 'Leistungsbeschreibung', 'leistung', ...)
await generateDocumentWithOpenCode(requestId, userNeedId, 'Eignungskriterien', 'eignung', ...)
await generateDocumentWithOpenCode(requestId, userNeedId, 'Zuschlagskriterien', 'zuschlag', ...)

// Neu:
const results = await generateDocumentsParallel(requestId, userNeedId, description, budget, deadline, userApiKey, workDirPaths)
```

#### 2.2 Memory-Optimierung
```javascript
// Streaming-basierte Ausgabe-Verarbeitung
opencode.stdout.on('data', (chunk) => {
    // Verarbeite Chunk-weise statt alles im Memory zu sammeln
    processChunkStreaming(chunk, outputStream)
})

// Garbage Collection nach jeder Verarbeitung
if (global.gc) {
    global.gc()
}
```

#### 2.3 Resource Monitoring
```javascript
// Neue Klasse für System-Monitoring
class ResourceMonitor {
    constructor() { /* ... */ }
    async getCurrentUsage() { /* ... */ }
    async getMemoryUsage() { /* ... */ }
    async getDiskUsage() { /* ... */ }
    async getCPUUsage() { /* ... */ }
}
```

### Phase 3: Skalierungs-Features (Woche 5-6)

#### 3.1 Load Balancing mit Redis
```javascript
// Neue Abhängigkeit in package.json
"dependencies": {
    "redis": "^4.6.0",
    "bull": "^4.12.0"
}

// Queue-System implementieren
const Queue = require('bull')
const redis = require('redis')

const documentQueue = new Queue('document processing', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
    }
})

documentQueue.process(MAX_CONCURRENT_USERS, async (job) => {
    return await processDocumentJob(job.data)
})
```

#### 3.2 Horizontal Scaling
```javascript
// Multiple CLI-Processor Instanzen
// docker-compose.yml Erweiterung:
services:
  cli-processor-1:
    build: .
    environment:
      - INSTANCE_ID=1
      - MAX_CONCURRENT_USERS=10
    
  cli-processor-2:
    build: .
    environment:
      - INSTANCE_ID=2
      - MAX_CONCURRENT_USERS=10
```

#### 3.3 Monitoring Dashboard
```javascript
// Neue API-Endpunkte in Express
app.get('/api/metrics', (req, res) => {
    res.json({
        activeUsers: concurrencyManager.activeProcesses.size,
        queueLength: documentQueue.waiting,
        memoryUsage: process.memoryUsage(),
        diskUsage: resourceManager.getDiskUsage(),
        uptime: process.uptime()
    })
})

// Prometheus-Metriken
const prometheus = require('prom-client')
const activeUsersGauge = new prometheus.Gauge({
    name: 'opencode_active_users',
    help: 'Number of active users'
})
```

### Phase 4: Production-Ready Features (Woche 7-8)

#### 4.1 Health Checks
```javascript
// Erweiterte Health-Checks in supervisord.conf
[program:health_check]
command=node /app/health_check.js
autostart=true
autorestart=true

// health_check.js
const healthCheck = {
    pocketbase: await checkPocketBaseConnection(),
    opencode: await checkOpenCodeBinary(),
    disk: await checkDiskSpace(),
    memory: await checkMemoryUsage(),
    activeUsers: concurrencyManager.activeProcesses.size
}
```

#### 4.2 Graceful Shutdown
```javascript
// Signal-Handler für sauberen Shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, starting graceful shutdown...')
    
    // Stoppe neue Requests
    acceptingNewRequests = false
    
    // Warte auf aktive Prozesse
    await Promise.all([
        waitForActiveProcesses(),
        cleanupAllWorkDirectories(),
        flushLogs()
    ])
    
    process.exit(0)
})
```

#### 4.3 Error Recovery
```javascript
// Automatische Wiederherstellung nach Fehlern
class ErrorRecoveryManager {
    constructor() {
        this.maxRetries = 3
        this.backoffStrategy = 'exponential'
        this.circuitBreaker = new CircuitBreaker()
    }
    
    async executeWithRetry(operation, context) {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await this.circuitBreaker.execute(operation, context)
            } catch (error) {
                if (attempt === this.maxRetries) throw error
                
                const backoffTime = this.calculateBackoff(attempt)
                await new Promise(resolve => setTimeout(resolve, backoffTime))
            }
        }
    }
}
```

### Deployment-Strategie

#### 4.4 Rolling Updates
```yaml
# docker-compose.yml für Rolling Updates
version: '3.8'
services:
  cli-processor:
    image: ghcr.io/davidrothenfels/cli_frontend:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

#### 4.5 Monitoring & Alerting
```javascript
// Prometheus + Grafana Integration
const metrics = {
    processing_time: new prometheus.Histogram({
        name: 'document_processing_duration_seconds',
        help: 'Time spent processing documents'
    }),
    
    error_rate: new prometheus.Counter({
        name: 'processing_errors_total',
        help: 'Total number of processing errors'
    }),
    
    active_users: new prometheus.Gauge({
        name: 'active_users_current',
        help: 'Current number of active users'
    })
}

// Alerting-Rules
const alertRules = {
    memory_usage: { threshold: 0.85, severity: 'warning' },
    disk_usage: { threshold: 0.90, severity: 'critical' },
    error_rate: { threshold: 0.1, severity: 'warning' },
    active_users: { threshold: 18, severity: 'warning' }
}
```

## 🔍 Monitoring & Metriken

### Detaillierte Metriken-Sammlung:
```javascript
class MetricsCollector {
    constructor() {
        this.metrics = {
            // Performance-Metriken
            processing_time: new Map(),
            memory_usage: [],
            cpu_usage: [],
            disk_usage: [],
            
            // User-Metriken
            active_users: new Set(),
            user_request_counts: new Map(),
            user_processing_times: new Map(),
            
            // System-Metriken
            opencode_spawn_count: 0,
            opencode_success_rate: 0,
            api_call_count: 0,
            api_error_count: 0,
            
            // Resource-Metriken
            work_directories_count: 0,
            cleanup_operations: 0,
            failed_cleanups: 0
        }
        
        // Sammle Metriken alle 30 Sekunden
        setInterval(() => this.collectSystemMetrics(), 30000)
    }
    
    async collectSystemMetrics() {
        // Memory-Metriken
        const memUsage = process.memoryUsage()
        this.metrics.memory_usage.push({
            timestamp: Date.now(),
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss
        })
        
        // CPU-Metriken
        const cpuUsage = process.cpuUsage()
        this.metrics.cpu_usage.push({
            timestamp: Date.now(),
            user: cpuUsage.user,
            system: cpuUsage.system
        })
        
        // Disk-Metriken
        const diskUsage = await this.getDiskUsage()
        this.metrics.disk_usage.push({
            timestamp: Date.now(),
            usage: diskUsage,
            available: await this.getAvailableDiskSpace()
        })
        
        // Begrenze Array-Größen (letzte 1000 Einträge)
        this.limitArraySize(this.metrics.memory_usage, 1000)
        this.limitArraySize(this.metrics.cpu_usage, 1000)
        this.limitArraySize(this.metrics.disk_usage, 1000)
    }
    
    // User-spezifische Metriken
    startUserProcessing(userId) {
        this.metrics.active_users.add(userId)
        this.metrics.user_processing_times.set(userId, Date.now())
        
        const userCount = this.metrics.user_request_counts.get(userId) || 0
        this.metrics.user_request_counts.set(userId, userCount + 1)
    }
    
    endUserProcessing(userId) {
        this.metrics.active_users.delete(userId)
        
        const startTime = this.metrics.user_processing_times.get(userId)
        if (startTime) {
            const processingTime = Date.now() - startTime
            this.metrics.processing_time.set(userId, processingTime)
            this.metrics.user_processing_times.delete(userId)
        }
    }
    
    // OpenCode-spezifische Metriken
    recordOpenCodeSpawn(success = true) {
        this.metrics.opencode_spawn_count++
        if (success) {
            this.metrics.opencode_success_rate = 
                (this.metrics.opencode_success_rate * 0.9) + (1 * 0.1)
        } else {
            this.metrics.opencode_success_rate = 
                (this.metrics.opencode_success_rate * 0.9) + (0 * 0.1)
        }
    }
    
    // API-Aufruf Metriken
    recordApiCall(success = true) {
        this.metrics.api_call_count++
        if (!success) {
            this.metrics.api_error_count++
        }
    }
    
    // Prometheus-Format Export
    getPrometheusMetrics() {
        const timestamp = Date.now()
        return `
# HELP opencode_active_users Number of currently active users
# TYPE opencode_active_users gauge
opencode_active_users ${this.metrics.active_users.size} ${timestamp}

# HELP opencode_memory_usage_bytes Memory usage in bytes
# TYPE opencode_memory_usage_bytes gauge
opencode_memory_usage_bytes ${process.memoryUsage().heapUsed} ${timestamp}

# HELP opencode_processing_time_seconds Time spent processing documents
# TYPE opencode_processing_time_seconds histogram
${this.generateProcessingTimeHistogram()}

# HELP opencode_spawn_total Total number of OpenCode spawns
# TYPE opencode_spawn_total counter
opencode_spawn_total ${this.metrics.opencode_spawn_count} ${timestamp}

# HELP opencode_success_rate Success rate of OpenCode operations
# TYPE opencode_success_rate gauge
opencode_success_rate ${this.metrics.opencode_success_rate} ${timestamp}
        `.trim()
    }
}
```

### Alerting-System:
```javascript
class AlertManager {
    constructor() {
        this.alerts = new Map()
        this.thresholds = {
            memory_usage: { warning: 0.80, critical: 0.90 },
            disk_usage: { warning: 0.85, critical: 0.95 },
            active_users: { warning: 18, critical: 20 },
            processing_time: { warning: 300000, critical: 600000 },  // 5/10 min
            error_rate: { warning: 0.05, critical: 0.10 },
            opencode_success_rate: { warning: 0.95, critical: 0.90 }
        }
        
        // Prüfe Alerts alle 60 Sekunden
        setInterval(() => this.checkAlerts(), 60000)
    }
    
    async checkAlerts() {
        const metrics = await this.collectCurrentMetrics()
        
        for (const [metric, thresholds] of Object.entries(this.thresholds)) {
            const currentValue = metrics[metric]
            const alertKey = `${metric}_alert`
            
            if (currentValue >= thresholds.critical) {
                await this.triggerAlert(alertKey, 'critical', metric, currentValue, thresholds.critical)
            } else if (currentValue >= thresholds.warning) {
                await this.triggerAlert(alertKey, 'warning', metric, currentValue, thresholds.warning)
            } else {
                await this.resolveAlert(alertKey)
            }
        }
    }
    
    async triggerAlert(alertKey, severity, metric, currentValue, threshold) {
        const existingAlert = this.alerts.get(alertKey)
        
        if (!existingAlert || existingAlert.severity !== severity) {
            const alert = {
                id: alertKey,
                severity,
                metric,
                currentValue,
                threshold,
                timestamp: Date.now(),
                message: `${metric} is ${severity}: ${currentValue} >= ${threshold}`
            }
            
            this.alerts.set(alertKey, alert)
            
            // Sende Alert über verschiedene Kanäle
            await this.sendAlert(alert)
        }
    }
    
    async sendAlert(alert) {
        // 1. Console-Log
        console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`)
        
        // 2. PocketBase-Log
        await this.logToPocketBase(alert)
        
        // 3. Webhook (optional)
        if (process.env.ALERT_WEBHOOK_URL) {
            await this.sendWebhookAlert(alert)
        }
        
        // 4. Email (optional)
        if (process.env.ALERT_EMAIL && alert.severity === 'critical') {
            await this.sendEmailAlert(alert)
        }
    }
    
    async logToPocketBase(alert) {
        try {
            await fetch(`${POCKETBASE_URL}/api/collections/logs/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: alert.message,
                    level: alert.severity,
                    request_id: 'system_alert',
                    metadata: JSON.stringify({
                        metric: alert.metric,
                        currentValue: alert.currentValue,
                        threshold: alert.threshold
                    })
                })
            })
        } catch (error) {
            console.error('Failed to log alert to PocketBase:', error)
        }
    }
    
    async sendWebhookAlert(alert) {
        try {
            await fetch(process.env.ALERT_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `🚨 OpenCode Alert: ${alert.message}`,
                    severity: alert.severity,
                    metric: alert.metric,
                    timestamp: new Date(alert.timestamp).toISOString()
                })
            })
        } catch (error) {
            console.error('Failed to send webhook alert:', error)
        }
    }
}
```

### Dashboard-Integration:
```javascript
// Express-Route für Metrics-Dashboard
app.get('/api/dashboard/metrics', async (req, res) => {
    const metrics = await metricsCollector.getDetailedMetrics()
    
    res.json({
        system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            disk: await getDiskUsage()
        },
        processing: {
            activeUsers: metrics.active_users.size,
            totalRequests: metrics.api_call_count,
            errorRate: metrics.api_error_count / metrics.api_call_count,
            averageProcessingTime: calculateAverageProcessingTime(metrics.processing_time)
        },
        opencode: {
            totalSpawns: metrics.opencode_spawn_count,
            successRate: metrics.opencode_success_rate,
            currentlyRunning: getCurrentlyRunningProcesses()
        },
        resources: {
            workDirectories: metrics.work_directories_count,
            cleanupOperations: metrics.cleanup_operations,
            failedCleanups: metrics.failed_cleanups
        }
    })
})

// Real-time WebSocket für Live-Updates
const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 8091 })

wss.on('connection', (ws) => {
    const metricsInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'metrics_update',
                data: metricsCollector.getRealtimeMetrics()
            }))
        }
    }, 5000)
    
    ws.on('close', () => {
        clearInterval(metricsInterval)
    })
})
```

## 📋 Testing Strategy

### Comprehensive Load Testing Framework:

#### Test-Setup:
```javascript
// load_test.js
const { spawn } = require('child_process')
const fetch = require('node-fetch')

class LoadTestRunner {
    constructor() {
        this.baseUrl = process.env.POCKETBASE_URL || 'http://localhost:8090'
        this.testUsers = []
        this.testResults = []
        this.concurrentUsers = 0
        this.maxConcurrentUsers = 0
    }
    
    async createTestUsers(count) {
        for (let i = 1; i <= count; i++) {
            const testUser = {
                id: `test_user_${i}`,
                email: `test${i}@vergabe.de`,
                password: `test123_${i}`,
                apiKey: process.env.OPENAI_API_KEY || 'test-key'
            }
            
            await this.createUserInPocketBase(testUser)
            this.testUsers.push(testUser)
        }
    }
    
    async runLoadTest(userCount, testDuration = 300000) {  // 5 Minuten
        console.log(`🚀 Starting load test with ${userCount} users for ${testDuration/1000}s`)
        
        const testPromises = []
        const startTime = Date.now()
        
        // Starte Tests für alle User
        for (let i = 0; i < userCount; i++) {
            const testUser = this.testUsers[i]
            const testPromise = this.runUserTest(testUser, startTime, testDuration)
            testPromises.push(testPromise)
            
            // Stagger user starts um realistische Bedingungen zu simulieren
            if (i < userCount - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }
        
        // Warte auf alle Tests
        const results = await Promise.allSettled(testPromises)
        
        // Analysiere Ergebnisse
        return this.analyzeResults(results, userCount, testDuration)
    }
    
    async runUserTest(testUser, startTime, testDuration) {
        const userResults = {
            userId: testUser.id,
            requests: [],
            errors: [],
            totalProcessingTime: 0,
            successfulRequests: 0,
            failedRequests: 0
        }
        
        while (Date.now() - startTime < testDuration) {
            const requestStart = Date.now()
            
            try {
                // Simuliere normalen User-Flow
                const result = await this.simulateDocumentGeneration(testUser)
                
                const requestEnd = Date.now()
                const processingTime = requestEnd - requestStart
                
                userResults.requests.push({
                    start: requestStart,
                    end: requestEnd,
                    duration: processingTime,
                    success: result.success,
                    documents: result.documents || 0
                })
                
                userResults.totalProcessingTime += processingTime
                userResults.successfulRequests++
                
            } catch (error) {
                userResults.errors.push({
                    timestamp: Date.now(),
                    error: error.message,
                    stack: error.stack
                })
                userResults.failedRequests++
            }
            
            // Warte zwischen Requests (realistisches User-Verhalten)
            const waitTime = Math.random() * 30000 + 10000  // 10-40 Sekunden
            await new Promise(resolve => setTimeout(resolve, waitTime))
        }
        
        return userResults
    }
    
    async simulateDocumentGeneration(testUser) {
        // 1. Erstelle Projekt
        const project = await this.createTestProject(testUser)
        
        // 2. Triggere Dokumentenerstellung
        const generationRequest = await this.triggerDocumentGeneration(project.id)
        
        // 3. Warte auf Completion
        const result = await this.waitForCompletion(generationRequest.id, 300000)  // 5 min timeout
        
        return {
            success: result.status === 'completed',
            documents: result.documents?.length || 0,
            processingTime: result.processingTime
        }
    }
}

// Spezifische Test-Szenarien
class TestScenarios {
    // Baseline Test: 5 User gleichzeitig
    static async baseline() {
        const runner = new LoadTestRunner()
        await runner.createTestUsers(5)
        return await runner.runLoadTest(5, 300000)
    }
    
    // Target Test: 20 User gleichzeitig
    static async target() {
        const runner = new LoadTestRunner()
        await runner.createTestUsers(20)
        return await runner.runLoadTest(20, 600000)  // 10 Minuten
    }
    
    // Stress Test: 50 User gleichzeitig
    static async stress() {
        const runner = new LoadTestRunner()
        await runner.createTestUsers(50)
        return await runner.runLoadTest(50, 900000)  // 15 Minuten
    }
    
    // Spike Test: Alle User starten gleichzeitig
    static async spike() {
        const runner = new LoadTestRunner()
        await runner.createTestUsers(20)
        
        // Alle User starten gleichzeitig (ohne Staggering)
        const promises = runner.testUsers.map(user => 
            runner.simulateDocumentGeneration(user)
        )
        
        return await Promise.allSettled(promises)
    }
    
    // Memory Stress Test: Große Prompts
    static async memoryStress() {
        const runner = new LoadTestRunner()
        await runner.createTestUsers(10)
        
        // Überschreibe Prompt-Generierung für größere Prompts
        const originalPrompt = runner.createPrompt
        runner.createPrompt = (type) => {
            return originalPrompt(type) + '\n' + 'X'.repeat(10000)  // 10KB extra
        }
        
        return await runner.runLoadTest(10, 600000)
    }
    
    // API Rate Limit Test: Schnelle aufeinanderfolgende Requests
    static async rateLimitTest() {
        const runner = new LoadTestRunner()
        await runner.createTestUsers(5)
        
        const promises = []
        for (let i = 0; i < 10; i++) {
            promises.push(runner.simulateDocumentGeneration(runner.testUsers[0]))
            await new Promise(resolve => setTimeout(resolve, 1000))  // 1 Sekunde zwischen Requests
        }
        
        return await Promise.allSettled(promises)
    }
}
```

### Automated Test Execution:
```bash
#!/bin/bash
# run_load_tests.sh

echo "🧪 Starting comprehensive load tests..."

# Baseline Test
echo "📊 Running baseline test (5 users)..."
node load_test.js --scenario=baseline --output=results/baseline.json

# Target Test  
echo "📊 Running target test (20 users)..."
node load_test.js --scenario=target --output=results/target.json

# Stress Test
echo "📊 Running stress test (50 users)..."
node load_test.js --scenario=stress --output=results/stress.json

# Spike Test
echo "📊 Running spike test (simultaneous start)..."
node load_test.js --scenario=spike --output=results/spike.json

# Memory Stress Test
echo "📊 Running memory stress test..."
node load_test.js --scenario=memory --output=results/memory.json

# Rate Limit Test
echo "📊 Running rate limit test..."
node load_test.js --scenario=ratelimit --output=results/ratelimit.json

echo "✅ All tests completed. Results in results/ directory."
```

### Performance Benchmarking:
```javascript
// benchmark.js
class PerformanceBenchmark {
    constructor() {
        this.benchmarks = new Map()
        this.baselineResults = null
    }
    
    async runBenchmark(name, testFunction, iterations = 5) {
        const results = []
        
        for (let i = 0; i < iterations; i++) {
            const startTime = process.hrtime.bigint()
            const startMemory = process.memoryUsage()
            
            try {
                const result = await testFunction()
                
                const endTime = process.hrtime.bigint()
                const endMemory = process.memoryUsage()
                
                results.push({
                    iteration: i + 1,
                    duration: Number(endTime - startTime) / 1000000,  // Convert to ms
                    memoryDelta: {
                        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
                        external: endMemory.external - startMemory.external
                    },
                    success: true,
                    result: result
                })
            } catch (error) {
                results.push({
                    iteration: i + 1,
                    duration: Number(process.hrtime.bigint() - startTime) / 1000000,
                    error: error.message,
                    success: false
                })
            }
            
            // Garbage Collection zwischen Tests
            if (global.gc) global.gc()
            
            // Kurze Pause zwischen Iterationen
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        const benchmark = this.analyzeBenchmarkResults(name, results)
        this.benchmarks.set(name, benchmark)
        
        return benchmark
    }
    
    analyzeBenchmarkResults(name, results) {
        const successfulResults = results.filter(r => r.success)
        const failedResults = results.filter(r => !r.success)
        
        const durations = successfulResults.map(r => r.duration)
        const memoryDeltas = successfulResults.map(r => r.memoryDelta.heapUsed)
        
        return {
            name,
            totalIterations: results.length,
            successfulIterations: successfulResults.length,
            failedIterations: failedResults.length,
            successRate: successfulResults.length / results.length,
            
            performance: {
                avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
                minDuration: Math.min(...durations),
                maxDuration: Math.max(...durations),
                medianDuration: this.calculateMedian(durations),
                p95Duration: this.calculatePercentile(durations, 95),
                p99Duration: this.calculatePercentile(durations, 99)
            },
            
            memory: {
                avgMemoryDelta: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length,
                maxMemoryDelta: Math.max(...memoryDeltas),
                minMemoryDelta: Math.min(...memoryDeltas)
            },
            
            errors: failedResults.map(r => r.error)
        }
    }
    
    // Regression Testing
    async compareWithBaseline(currentBenchmark) {
        if (!this.baselineResults) {
            console.log('⚠️ No baseline results available for comparison')
            return null
        }
        
        const baseline = this.baselineResults.get(currentBenchmark.name)
        if (!baseline) {
            console.log(`⚠️ No baseline available for ${currentBenchmark.name}`)
            return null
        }
        
        const comparison = {
            name: currentBenchmark.name,
            performance: {
                avgDurationChange: (currentBenchmark.performance.avgDuration - baseline.performance.avgDuration) / baseline.performance.avgDuration,
                p95DurationChange: (currentBenchmark.performance.p95Duration - baseline.performance.p95Duration) / baseline.performance.p95Duration,
                maxDurationChange: (currentBenchmark.performance.maxDuration - baseline.performance.maxDuration) / baseline.performance.maxDuration
            },
            memory: {
                avgMemoryChange: (currentBenchmark.memory.avgMemoryDelta - baseline.memory.avgMemoryDelta) / baseline.memory.avgMemoryDelta,
                maxMemoryChange: (currentBenchmark.memory.maxMemoryDelta - baseline.memory.maxMemoryDelta) / baseline.memory.maxMemoryDelta
            },
            successRate: {
                change: currentBenchmark.successRate - baseline.successRate
            }
        }
        
        // Bestimme ob Regression vorliegt
        const isRegression = (
            comparison.performance.avgDurationChange > 0.1 ||  // 10% langsamer
            comparison.performance.p95DurationChange > 0.15 ||  // 15% langsamer P95
            comparison.memory.avgMemoryChange > 0.2 ||  // 20% mehr Memory
            comparison.successRate.change < -0.05  // 5% weniger Erfolgsrate
        )
        
        comparison.isRegression = isRegression
        
        return comparison
    }
}
```

### CI/CD Integration:
```yaml
# .github/workflows/load-test.yml
name: Load Testing

on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]
  schedule:
    - cron: '0 2 * * *'  # Täglich um 2 Uhr

jobs:
  load-test:
    runs-on: ubuntu-latest
    
    services:
      pocketbase:
        image: ghcr.io/davidrothenfels/cli_frontend:latest
        ports:
          - 8090:8090
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Wait for PocketBase
      run: |
        timeout 60 sh -c 'until nc -z localhost 8090; do sleep 1; done'
    
    - name: Run load tests
      run: |
        npm run test:load
        
    - name: Upload results
      uses: actions/upload-artifact@v3
      with:
        name: load-test-results
        path: results/
        
    - name: Check for regressions
      run: |
        node scripts/check_regression.js
        
    - name: Comment PR with results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const results = JSON.parse(fs.readFileSync('results/summary.json', 'utf8'));
          
          const comment = `
          ## 📊 Load Test Results
          
          **Baseline (5 users)**: ${results.baseline.successRate}% success rate, ${results.baseline.performance.avgDuration}ms avg
          **Target (20 users)**: ${results.target.successRate}% success rate, ${results.target.performance.avgDuration}ms avg
          **Stress (50 users)**: ${results.stress.successRate}% success rate, ${results.stress.performance.avgDuration}ms avg
          
          ${results.regression ? '⚠️ **Regression detected**' : '✅ **No regression**'}
          `;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
```

## 🎯 Erfolgs-Kriterien

### Minimale Anforderungen:
- ✅ **20 User parallel** ohne Konflikte
- ✅ **Unter 5 Minuten** Verarbeitungszeit
- ✅ **Keine Datei-Überschreibungen**
- ✅ **Automatisches Cleanup**

### Optimale Ziele:
- 🎯 **50 User parallel**
- 🎯 **Unter 3 Minuten** Verarbeitungszeit
- 🎯 **Real-time Monitoring**
- 🎯 **Graceful Degradation** bei Überlastung

## 💡 Zusätzliche Verbesserungen

### Queue-System:
```javascript
// Redis-basierte Queue für bessere Skalierung
const Queue = require('bull')
const documentQueue = new Queue('document processing')

documentQueue.process(MAX_CONCURRENT_USERS, processDocumentJob)
```

### Health Checks:
```javascript
// Container Health für Coolify
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        activeUsers: activeUserProcesses.size,
        maxUsers: MAX_CONCURRENT_USERS,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
    })
})
```

### Graceful Shutdown:
```javascript
// Sauberer Shutdown bei Container-Neustart
process.on('SIGTERM', async () => {
    console.log('🛑 Graceful shutdown initiated...')
    
    // Warte auf alle aktiven Prozesse
    for (const [userId, processInfo] of activeUserProcesses) {
        await waitForUserProcessCompletion(userId)
    }
    
    // Cleanup alle Arbeitsverzeichnisse
    cleanupAllWorkDirectories()
    
    process.exit(0)
})
```

## 🏁 Fazit

Mit dieser Implementierung können wir **20-50 User gleichzeitig** verarbeiten:
- **Vollständige Isolation** zwischen Users
- **Parallele Verarbeitung** für bessere Performance
- **Automatisches Resource Management**
- **Skalierbare Architektur** für zukünftiges Wachstum

Die Lösung ist **produktionsreif** und kann schrittweise implementiert werden.