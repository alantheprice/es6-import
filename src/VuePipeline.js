export class VuePipeline {

    /**
     * Creates an instance of VuePipeline.
     * 
     * @param {string} filePath 
     * @param {string} fullImportText 
     * @memberof VuePipeline
     */
    constructor(filePath, fullImportText) {
        this.filePath = filePath
        this.fullImportText = fullImportText
    }

    /**
     * Get converted Text
     * 
     * @returns 
     * @memberof VuePipeline
     */
    getConvertedText() {
        if (this.filePath.indexOf('.vue') === -1) {
            return this.fullImportText
        }
        let converted = this.processTemplate(this.fullImportText)
        if (converted.indexOf('<script src=') > -1) {
            return this.convertSrcScript(converted)
        }
        return this.convertScript(converted)
    }

    /**
     * Process Template
     * 
     * @param {string} converted 
     * @returns {string}
     * @memberof VuePipeline
     */
    processTemplate(converted) {
        let styleImport = '\n`;\nconst styleTag = document.createElement("style");\nstyleTag.innerHTML = styles;\ndocument.head.appendChild(styleTag)'
        converted = this.fullImportText.replace('<template>', 'const template = `').replace('</template>', '`')
        return converted.replace('<style>', 'let styles = `').replace('</style>', styleImport)
    }

    /**
     * Convert Source Script
     * 
     * @param {string} converted 
     * @returns {string}
     * @memberof VuePipeline
     */
    convertSrcScript(converted) {
        let [firstHalf, secondHalf] = converted.split('<script src=')
        converted = firstHalf + '\nimport component from ' + secondHalf.replace('>', '')
        converted = converted + 'component.template = template;\nexport default component'
        converted = converted.replace('<script>', '').replace('</script>', '')
        return converted
    }

    /**
     * Convert Script
     * 
     * @param {any} converted 
     * @returns 
     * @memberof VuePipeline
     */
    convertScript(converted) {
        converted = converted.replace('<script>', '').replace('</script>', '')
        if (converted.indexOf('export default {') > -1) {
            return converted.replace('export default {', 'export default {\n template: template,')
        }
        return converted.replace('data()', 'template: template,\ndata()')      
    }
}