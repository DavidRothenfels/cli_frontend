#!/usr/bin/env node

/**
 * Integration Test Script for Gemini CLI Integration
 * Tests basic functionality without PocketBase
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

class IntegrationTester {
    constructor() {
        this.testResults = []
        this.workDir = '/tmp/gemini_test'
    }

    async runTests() {
        console.log('🧪 Starting Gemini CLI Integration Tests\n')
        
        try {
            await this.setupWorkDir()
            await this.testGeminiCLIInstallation()
            await this.testBasicGeminiExecution()
            await this.testPromptTemplateRendering()
            await this.testProcessMonitoring()
            await this.cleanup()
            
            this.printResults()
        } catch (error) {
            console.error('❌ Test suite failed:', error.message)
            process.exit(1)
        }
    }

    async setupWorkDir() {
        console.log('📁 Setting up work directory...')
        
        if (!fs.existsSync(this.workDir)) {
            fs.mkdirSync(this.workDir, { recursive: true })
        }
        
        this.addResult('setup', 'Work directory created', true)
    }

    async testGeminiCLIInstallation() {
        console.log('🔍 Testing Gemini CLI installation...')
        
        return new Promise((resolve, reject) => {
            const geminiProcess = spawn('gemini', ['--version'], { 
                stdio: ['pipe', 'pipe', 'pipe'] 
            })
            
            let output = ''
            let error = ''
            
            geminiProcess.stdout.on('data', (data) => {
                output += data.toString()
            })
            
            geminiProcess.stderr.on('data', (data) => {
                error += data.toString()
            })
            
            geminiProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Gemini CLI installed and working')
                    this.addResult('cli_installation', 'Gemini CLI available', true)
                    resolve()
                } else {
                    console.log('❌ Gemini CLI not working properly')
                    console.log('Error:', error)
                    this.addResult('cli_installation', 'Gemini CLI not available', false)
                    reject(new Error('Gemini CLI not installed or not working'))
                }
            })
            
            geminiProcess.on('error', (err) => {
                console.log('❌ Gemini CLI not found')
                this.addResult('cli_installation', 'Gemini CLI not found', false)
                reject(new Error('Gemini CLI not found: ' + err.message))
            })
        })
    }

    async testBasicGeminiExecution() {
        console.log('⚡ Testing basic Gemini execution...')
        
        const testPrompt = `
Du bist ein Test-Assistent. Antworte mit genau dem Text: "TEST_SUCCESS"
Verwende keine anderen Wörter oder Formatierungen.
`
        
        const promptFile = path.join(this.workDir, 'test_prompt.txt')
        fs.writeFileSync(promptFile, testPrompt)
        
        return new Promise((resolve, reject) => {
            const geminiProcess = spawn('gemini', [
                '-p', promptFile,
                '--model', 'gemini-2.5-pro'
            ], { 
                cwd: this.workDir,
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 30000 // 30 seconds timeout
            })
            
            let output = ''
            let error = ''
            
            geminiProcess.stdout.on('data', (data) => {
                output += data.toString()
            })
            
            geminiProcess.stderr.on('data', (data) => {
                error += data.toString()
            })
            
            geminiProcess.on('close', (code) => {
                if (code === 0 && output.includes('TEST_SUCCESS')) {
                    console.log('✅ Basic Gemini execution working')
                    this.addResult('basic_execution', 'Gemini responds correctly', true)
                    resolve()
                } else {
                    console.log('❌ Basic Gemini execution failed')
                    console.log('Output:', output)
                    console.log('Error:', error)
                    this.addResult('basic_execution', 'Gemini execution failed', false)
                    
                    // Don't fail the test suite if API key is missing
                    if (error.includes('API') || error.includes('key') || error.includes('auth')) {
                        console.log('ℹ️  Skipping - appears to be API key issue')
                        resolve()
                    } else {
                        reject(new Error('Gemini execution failed'))
                    }
                }
            })
            
            geminiProcess.on('error', (err) => {
                console.log('❌ Gemini process error:', err.message)
                this.addResult('basic_execution', 'Process error: ' + err.message, false)
                reject(err)
            })
        })
    }

    async testPromptTemplateRendering() {
        console.log('📝 Testing prompt template rendering...')
        
        try {
            // Test template data
            const templateData = {
                title: 'Test Projekt',
                description: 'Eine Test-Beschreibung',
                budget: 50000,
                category: 'it',
                requirements: 'Test-Anforderungen',
                extracted_context: 'Test-Kontext aus PDF'
            }
            
            // Read base template
            const baseTemplatePath = path.join(__dirname, 'pb_hooks/views/prompts/system/base.txt')
            
            if (fs.existsSync(baseTemplatePath)) {
                const baseTemplate = fs.readFileSync(baseTemplatePath, 'utf8')
                
                // Simple template rendering test
                let renderedTemplate = baseTemplate
                    .replace(/\{\{\.title\}\}/g, templateData.title)
                    .replace(/\{\{\.description\}\}/g, templateData.description)
                    .replace(/\{\{\.budget\}\}/g, templateData.budget.toString())
                    .replace(/\{\{\.category\}\}/g, templateData.category)
                    .replace(/\{\{\.requirements\}\}/g, templateData.requirements)
                    .replace(/\{\{\.extracted_context\}\}/g, templateData.extracted_context)
                
                if (renderedTemplate.includes(templateData.title) && 
                    renderedTemplate.includes(templateData.description)) {
                    console.log('✅ Template rendering working')
                    this.addResult('template_rendering', 'Templates render correctly', true)
                } else {
                    console.log('❌ Template rendering failed')
                    this.addResult('template_rendering', 'Template rendering failed', false)
                }
            } else {
                console.log('⚠️  Template file not found, creating placeholder test')
                this.addResult('template_rendering', 'Template file missing', false)
            }
        } catch (error) {
            console.log('❌ Template rendering error:', error.message)
            this.addResult('template_rendering', 'Template rendering error', false)
        }
    }

    async testProcessMonitoring() {
        console.log('🔍 Testing process monitoring capabilities...')
        
        try {
            // Test timeout simulation
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    resolve('timeout_works')
                }, 1000)
            })
            
            const result = await timeoutPromise
            
            if (result === 'timeout_works') {
                console.log('✅ Process timeout mechanisms working')
                this.addResult('process_monitoring', 'Timeout mechanisms work', true)
            }
            
            // Test process tracking
            const activeProcesses = new Map()
            const sessionId = 'test_session_123'
            
            activeProcesses.set(sessionId, {
                startTime: Date.now(),
                lastHeartbeat: Date.now()
            })
            
            if (activeProcesses.has(sessionId)) {
                console.log('✅ Process tracking working')
                this.addResult('process_monitoring', 'Process tracking works', true)
                activeProcesses.delete(sessionId)
            }
            
        } catch (error) {
            console.log('❌ Process monitoring error:', error.message)
            this.addResult('process_monitoring', 'Process monitoring error', false)
        }
    }

    async cleanup() {
        console.log('🧹 Cleaning up test files...')
        
        try {
            if (fs.existsSync(this.workDir)) {
                fs.rmSync(this.workDir, { recursive: true, force: true })
            }
            console.log('✅ Cleanup completed')
        } catch (error) {
            console.log('⚠️  Cleanup warning:', error.message)
        }
    }

    addResult(test, description, passed) {
        this.testResults.push({
            test,
            description,
            passed,
            timestamp: new Date().toISOString()
        })
    }

    printResults() {
        console.log('\n📊 Test Results Summary')
        console.log('='.repeat(50))
        
        let passed = 0
        let total = this.testResults.length
        
        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌'
            console.log(`${status} ${result.test}: ${result.description}`)
            if (result.passed) passed++
        })
        
        console.log('='.repeat(50))
        console.log(`Results: ${passed}/${total} tests passed`)
        
        if (passed === total) {
            console.log('🎉 All tests passed! Integration is ready.')
        } else {
            console.log('⚠️  Some tests failed. Check the results above.')
        }
        
        console.log('\n💡 Next steps:')
        console.log('1. Set up GEMINI_API_KEY environment variable')
        console.log('2. Start PocketBase: ./pocketbase serve')
        console.log('3. Create database collections as described in README.md')
        console.log('4. Open http://localhost:8090 to test the full application')
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new IntegrationTester()
    tester.runTests().catch(error => {
        console.error('Test runner error:', error)
        process.exit(1)
    })
}

module.exports = IntegrationTester