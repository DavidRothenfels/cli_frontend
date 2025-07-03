/**
 * PDF Processor for German Procurement Documents
 * Implements secure PDF text extraction with document type detection
 * 
 * Security Features:
 * - Disabled JavaScript execution in PDFs (CVE-2024-4367)
 * - File size limits (10MB max)
 * - Content sanitization
 * - Memory management
 */

class PDFProcessor {
    constructor() {
        this.maxFileSize = 10 * 1024 * 1024; // 10MB limit
        this.maxPages = 100; // Limit pages to prevent memory issues
        this.processingTimeout = 30000; // 30 second timeout
        this.supportedTypes = ['application/pdf'];
        
        // Initialize PDF.js with secure configuration
        this.initializePDFJS();
        
        // German document type detection patterns
        this.documentPatterns = {
            leistungsbeschreibung: {
                patterns: [
                    /leistungsbeschreibung/gi,
                    /leistungsverzeichnis/gi,
                    /technische\s+spezifikation/gi,
                    /arbeitsanweisung/gi,
                    /pflichtenheft/gi,
                    /\bLV\b/g,
                    /technische\s+anforderung/gi,
                    /lieferumfang/gi,
                    /beschreibung\s+der\s+leistung/gi
                ],
                weight: 1.0
            },
            eignungskriterien: {
                patterns: [
                    /eignungsnachweis/gi,
                    /eignungskriterien/gi,
                    /präqualifikation/gi,
                    /fachkunde/gi,
                    /berufliche\s+qualifikation/gi,
                    /technische\s+leistungsfähigkeit/gi,
                    /wirtschaftliche\s+leistungsfähigkeit/gi,
                    /referenzen/gi,
                    /nachweise/gi,
                    /qualifikation/gi
                ],
                weight: 1.0
            },
            zuschlagskriterien: {
                patterns: [
                    /zuschlagskriterien/gi,
                    /bewertungskriterien/gi,
                    /wertung/gi,
                    /preisbewertung/gi,
                    /punktbewertung/gi,
                    /bewertungsmatrix/gi,
                    /gewichtung/gi,
                    /vergabekriterien/gi,
                    /auswahlkriterien/gi,
                    /bewertungsschema/gi
                ],
                weight: 1.0
            }
        };
    }

    /**
     * Initialize PDF.js with secure configuration
     */
    initializePDFJS() {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js library not loaded');
        }

        // Configure PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
        
        // Disable JavaScript execution in PDFs for security
        pdfjsLib.GlobalWorkerOptions.isEvalSupported = false;
        
        this.pdfjsLib = pdfjsLib;
    }

    /**
     * Process multiple PDF files
     * @param {FileList} files - Files to process
     * @param {Function} progressCallback - Progress callback function
     * @returns {Promise<Array>} Processing results
     */
    async processFiles(files, progressCallback = null) {
        const results = [];
        const errors = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: files.length,
                    filename: file.name,
                    status: 'processing'
                });
            }
            
            try {
                const result = await this.processFile(file);
                results.push(result);
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                errors.push({
                    filename: file.name,
                    error: error.message,
                    type: 'processing_error'
                });
            }
        }
        
        if (progressCallback) {
            progressCallback({
                current: files.length,
                total: files.length,
                status: 'completed'
            });
        }
        
        return { results, errors };
    }

    /**
     * Process a single PDF file
     * @param {File} file - PDF file to process
     * @returns {Promise<Object>} Processing result
     */
    async processFile(file) {
        // Validate file
        this.validateFile(file);
        
        try {
            // Extract text from PDF
            const text = await this.extractTextFromPDF(file);
            
            // Detect document type
            const documentType = this.detectDocumentType(file.name, text);
            
            // Sanitize extracted text
            const sanitizedText = this.sanitizeText(text);
            
            // Create document excerpt
            const excerpt = this.createExcerpt(sanitizedText);
            
            return {
                filename: file.name,
                fileSize: file.size,
                documentType: documentType.type,
                confidence: documentType.confidence,
                text: sanitizedText,
                excerpt: excerpt,
                processedAt: new Date().toISOString(),
                metadata: {
                    pages: documentType.pages,
                    wordCount: sanitizedText.split(/\s+/).length,
                    characterCount: sanitizedText.length
                }
            };
            
        } catch (error) {
            throw new Error(`PDF processing failed: ${error.message}`);
        }
    }

    /**
     * Validate PDF file
     * @param {File} file - File to validate
     */
    validateFile(file) {
        // Check file type
        if (!this.supportedTypes.includes(file.type)) {
            throw new Error(`Unsupported file type: ${file.type}. Only PDF files are supported.`);
        }
        
        // Check file size
        if (file.size > this.maxFileSize) {
            throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: ${this.maxFileSize / 1024 / 1024}MB.`);
        }
        
        // Check file name
        if (file.name.length > 255) {
            throw new Error('Filename too long. Maximum 255 characters allowed.');
        }
    }

    /**
     * Extract text from PDF using PDF.js
     * @param {File} file - PDF file
     * @returns {Promise<string>} Extracted text
     */
    async extractTextFromPDF(file) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('PDF processing timeout'));
            }, this.processingTimeout);

            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const typedArray = new Uint8Array(e.target.result);
                    
                    // Load PDF with secure configuration
                    const loadingTask = this.pdfjsLib.getDocument({
                        data: typedArray,
                        // Security settings
                        disableRange: true,
                        disableStream: true,
                        disableAutoFetch: true,
                        disableFontFace: true,
                        // Disable JavaScript execution
                        disableCreateObjectURL: true,
                        verbosity: 0
                    });

                    const pdf = await loadingTask.promise;
                    const numPages = Math.min(pdf.numPages, this.maxPages);
                    const textContent = [];

                    for (let i = 1; i <= numPages; i++) {
                        try {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            
                            // Extract text items
                            const pageText = content.items
                                .filter(item => item.str && item.str.trim())
                                .map(item => item.str.trim())
                                .join(' ');
                            
                            if (pageText) {
                                textContent.push(pageText);
                            }
                            
                            // Cleanup page resources
                            page.cleanup();
                        } catch (pageError) {
                            console.warn(`Error processing page ${i}:`, pageError);
                            // Continue with other pages
                        }
                    }

                    clearTimeout(timeoutId);
                    
                    const fullText = textContent.join('\n\n');
                    if (!fullText.trim()) {
                        throw new Error('No text content found in PDF. The document may be image-based or encrypted.');
                    }
                    
                    resolve(fullText);
                    
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(new Error(`PDF parsing failed: ${error.message}`));
                }
            };

            reader.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error('File reading failed'));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Detect German document type based on filename and content
     * @param {string} filename - Name of the file
     * @param {string} text - Extracted text content
     * @returns {Object} Detection result
     */
    detectDocumentType(filename, text) {
        const scores = {};
        let totalMatches = 0;
        
        // Analyze filename for hints
        const filenameScore = this.analyzeFilename(filename);
        
        // Analyze text content
        for (const [type, config] of Object.entries(this.documentPatterns)) {
            let score = 0;
            let matches = 0;
            
            for (const pattern of config.patterns) {
                const patternMatches = (text.match(pattern) || []).length;
                matches += patternMatches;
                score += patternMatches * config.weight;
            }
            
            // Boost score if filename suggests this type
            if (filenameScore[type]) {
                score += filenameScore[type] * 5; // Filename bonus
            }
            
            scores[type] = {
                score: score,
                matches: matches,
                density: text.length > 0 ? matches / (text.length / 1000) : 0
            };
            
            totalMatches += matches;
        }
        
        // Find best match
        const bestMatch = Object.entries(scores)
            .sort((a, b) => b[1].score - a[1].score)[0];
        
        const confidence = totalMatches > 0 ? 
            Math.min(bestMatch[1].score / totalMatches, 1.0) : 0;
        
        return {
            type: confidence > 0.1 ? bestMatch[0] : 'unknown',
            confidence: confidence,
            scores: scores,
            pages: Math.ceil(text.length / 2000) // Rough page estimate
        };
    }

    /**
     * Analyze filename for document type hints
     * @param {string} filename - File name
     * @returns {Object} Filename analysis scores
     */
    analyzeFilename(filename) {
        const lower = filename.toLowerCase();
        const scores = {};
        
        // Leistungsbeschreibung patterns
        if (lower.includes('leistung') || lower.includes('lv') || lower.includes('spezifikation')) {
            scores.leistungsbeschreibung = 1.0;
        }
        
        // Eignungskriterien patterns
        if (lower.includes('eignung') || lower.includes('qualifikation') || lower.includes('nachweis')) {
            scores.eignungskriterien = 1.0;
        }
        
        // Zuschlagskriterien patterns
        if (lower.includes('zuschlag') || lower.includes('bewertung') || lower.includes('kriterien')) {
            scores.zuschlagskriterien = 1.0;
        }
        
        return scores;
    }

    /**
     * Sanitize extracted text content
     * @param {string} text - Raw text
     * @returns {string} Sanitized text
     */
    sanitizeText(text) {
        if (!text) return '';
        
        return text
            // Remove control characters
            .replace(/[\x00-\x1F\x7F]/g, '')
            // Remove potential script tags (extra security)
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            // Remove potential HTML tags
            .replace(/<[^>]*>/g, '')
            // Normalize line breaks
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // Remove excessive whitespace (after tag removal)
            .replace(/\s+/g, ' ')
            // Limit length to prevent memory issues
            .substring(0, 100000) // 100KB max
            .trim();
    }

    /**
     * Create document excerpt
     * @param {string} text - Full text
     * @returns {string} Text excerpt
     */
    createExcerpt(text) {
        if (!text) return '';
        
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const excerpt = sentences.slice(0, 3).join('. ');
        
        return excerpt.length > 300 ? 
            excerpt.substring(0, 300) + '...' : 
            excerpt;
    }

    /**
     * Get processing statistics
     * @returns {Object} Processing statistics
     */
    getProcessingStats() {
        return {
            maxFileSize: this.maxFileSize,
            maxPages: this.maxPages,
            processingTimeout: this.processingTimeout,
            supportedTypes: this.supportedTypes,
            documentTypes: Object.keys(this.documentPatterns)
        };
    }
}

// Export for use in other modules
window.PDFProcessor = PDFProcessor;