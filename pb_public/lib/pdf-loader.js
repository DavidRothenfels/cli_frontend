/**
 * PDF.js Loader
 * Loads PDF.js library from CDN with fallback options
 */

class PDFJSLoader {
    constructor() {
        this.loaded = false;
        this.version = '3.11.174'; // Latest stable version
        this.cdnUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${this.version}/pdf.min.js`;
        this.workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${this.version}/pdf.worker.min.js`;
    }

    /**
     * Load PDF.js library
     * @returns {Promise} Loading promise
     */
    async load() {
        if (this.loaded) {
            return Promise.resolve();
        }

        try {
            // Load main PDF.js library
            await this.loadScript(this.cdnUrl);
            
            // Configure worker
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = this.workerUrl;
                this.loaded = true;
                console.log('PDF.js loaded successfully');
            } else {
                throw new Error('PDF.js not available after loading');
            }
            
        } catch (error) {
            console.error('Failed to load PDF.js:', error);
            throw new Error('PDF.js library could not be loaded');
        }
    }

    /**
     * Load script from URL
     * @param {string} url - Script URL
     * @returns {Promise} Loading promise
     */
    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            
            document.head.appendChild(script);
        });
    }
}

// Auto-load PDF.js when this script loads
const pdfLoader = new PDFJSLoader();
document.addEventListener('DOMContentLoaded', () => {
    pdfLoader.load().catch(error => {
        console.error('PDF.js auto-load failed:', error);
        // Could show user notification here
    });
});