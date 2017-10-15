class VuePipeline {
    constructor(filePath, fullImportText) {
        this.filePath = filePath
        this.fullImportText = fullImportText
    }

    getConvertedText() {
        if (this.filePath.indexOf('.vue') === -1) {
            return this.fullImportText
        }
        let styleImport = '\n`;\nconst styleTag = document.createElement("style");\nstyleTag.innerHTML = styles;\ndocument.head.appendChild(styleTag)'
        let converted = this.fullImportText.replace('<template>', 'const template = `').replace('</template>', '`')
        converted = converted.replace('<style>', 'let styles = `').replace('</style>', styleImport)

        if (converted.indexOf('<script src=') > -1) {
            let [firstHalf, secondHalf] = converted.split('<script src=')
            converted = firstHalf + '\nimport component from ' + secondHalf.replace('>', '')
            converted = converted + 'component.template = template;\nexport default component'
            converted = converted.replace('<script>', '').replace('</script>', '')
            return converted
        } else {
            converted = converted.replace('<script>', '').replace('</script>', '')
            return converted.replace('export default {', 'export default {\n template: template,')
        }
    }
}