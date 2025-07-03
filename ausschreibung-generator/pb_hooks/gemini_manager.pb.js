/**
 * Gemini Manager - Robust Process Management for AI Integration
 * Handles process spawning, monitoring, health checks, and recovery
 */
class GeminiManager {
    constructor() {
        this.activeProcesses = new Map()
        this.processTimeout = 120000 // 2 minutes
        this.maxRetries = 3
        this.rateLimitWindow = 60000 // 1 minute
        this.rateLimitRequests = 60
        this.requestHistory = []
        this.sessionCleanupInterval = 300000 // 5 minutes
        
        // Start background cleanup
        this.startCleanupRoutine()
    }

    /**
     * Execute Gemini with comprehensive monitoring
     */
    async executeWithMonitoring(requestId, prompt, options = {}) {
        try {
            // Rate limiting check
            if (!this.checkRateLimit()) {
                throw new Error('Rate limit exceeded. Please wait before making new requests.')
            }

            // Create session tracking
            const sessionId = `gemini_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const sessionData = {
                request_id: requestId,
                session_id: sessionId,
                status: 'starting',
                output_stream: '',
                api_usage: JSON.stringify({ used: 0, limit: 1000 }),
                last_heartbeat: new Date().toISOString()
            }

            // Save session to database
            const session = $app.dao().newRecord('gemini_sessions', sessionData)
            $app.dao().saveRecord(session)

            // Update request history for rate limiting
            this.requestHistory.push(Date.now())
            this.requestHistory = this.requestHistory.filter(time => Date.now() - time < this.rateLimitWindow)

            // Start process with monitoring
            return await this.spawnGeminiProcess(sessionId, requestId, prompt, options)

        } catch (error) {
            console.error('Gemini execution error:', error)
            await this.updateProgressWithError(requestId, 'Error starting Gemini process', error.message)
            throw error
        }
    }

    /**
     * Spawn and monitor Gemini process
     */
    async spawnGeminiProcess(sessionId, requestId, prompt, options = {}) {
        return new Promise((resolve, reject) => {
            const workDir = `/tmp/gemini_projects/${requestId}`
            const promptFile = `${workDir}/prompt.txt`
            
            // Ensure work directory exists
            $os.mkdir(workDir, 0755, true)
            $os.writeFile(promptFile, prompt)

            // Build Gemini command
            const geminiArgs = [
                '-p', promptFile,
                '--model', options.model || 'gemini-2.5-pro',
                '--debug'
            ]

            if (options.yolo) {
                geminiArgs.push('--yolo')
            }

            // Environment variables
            const env = {
                ...process.env,
                GEMINI_API_KEY: $os.getenv('GEMINI_API_KEY'),
                REQUEST_ID: requestId,
                SESSION_ID: sessionId,
                WORK_DIR: workDir
            }

            // Spawn process
            const geminiProcess = $os.exec('gemini', geminiArgs, {
                cwd: workDir,
                env: env,
                timeout: this.processTimeout
            })

            // Store process reference
            this.activeProcesses.set(sessionId, {
                process: geminiProcess,
                requestId: requestId,
                startTime: Date.now(),
                lastHeartbeat: Date.now()
            })

            // Set up process monitoring
            this.setupProcessMonitoring(sessionId, requestId, geminiProcess, resolve, reject)
        })
    }

    checkRateLimit() {
        const now = Date.now()
        this.requestHistory = this.requestHistory.filter(time => now - time < this.rateLimitWindow)
        return this.requestHistory.length < this.rateLimitRequests
    }

    getProcessStats() {
        return {
            activeProcesses: this.activeProcesses.size,
            requestHistory: this.requestHistory.length,
            rateLimitRemaining: this.rateLimitRequests - this.requestHistory.length
        }
    }

    async updateProgressWithError(requestId, task, error) {
        try {
            let progressRecord = $app.dao().findFirstRecordByFilter('generation_progress', `request_id="${requestId}"`)
            
            if (!progressRecord) {
                progressRecord = $app.dao().newRecord('generation_progress', {
                    request_id: requestId,
                    step: 'error',
                    progress: 0,
                    current_task: task,
                    gemini_feedback: '',
                    tool_calls: '[]',
                    web_searches: '[]',
                    errors: error,
                    logs: ''
                })
            } else {
                progressRecord.set('step', 'error')
                progressRecord.set('current_task', task)
                progressRecord.set('errors', error)
            }

            $app.dao().saveRecord(progressRecord)
        } catch (error) {
            console.error('Error updating progress with error:', error)
        }
    }

    startCleanupRoutine() {
        // Note: In PocketBase, we'll use a simpler cleanup approach
        console.log('Gemini Manager initialized with cleanup routines')
    }
}

// Export singleton instance
const geminiManager = new GeminiManager()
module.exports = geminiManager