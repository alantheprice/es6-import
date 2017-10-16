import { Import } from './Import.js'
import { VuePipeline } from './VuePipeline.js'
import loader from './loader.js'
import consts from './consts.js'
import utils from './utils.js'

export class Importer {

    constructor() {
        this.supportedModules = consts.DEFAULT_SUPPORTED_MODULES
        let importScript = Array.from(document.getElementsByTagName('script')).find((elem) => {
            return elem.getAttribute('import') != null
        })
        if (importScript == null) {
            throw new Error('No import script found')
        }
        this.domain = null
        this.addGlobalFunctions()
        let customNpmModules = importScript.getAttribute('npm-modules')
        if (customNpmModules) {
            this.supportedModules = consts.DEFAULT_SUPPORTED_MODULES.concat(JSON.parse(customNpmModules))
        }
        this.debug = importScript.getAttribute('debug') ? true : false
        this.beginImport(importScript.getAttribute('import'))
    }

    /**
     * Begin file imports
     *
     * @param {string} scriptPath
     * @returns void
     *
     * @memberof Importer
     */
    beginImport(scriptPath) {
        if (scriptPath.indexOf('http') > -1) {
            this.domain = scriptPath.split('/').slice(0, 3).join('/')
            scriptPath = './' + scriptPath.split('/').slice(3).join('/')
        }
        let imp = new Import(`import {} from '${scriptPath}'`, './', this.domain, this.supportedModules)
        let start = performance.now()
        this.getScript(imp)
            .then(() => {
                if (this.debug) {
                    console.log(JSON.stringify(imp.getDependencyMap(), null, 4))                    
                }
                let end = performance.now()
                let diff = end - start
                console.log(`It took ${diff} milliseconds to load all scripts`)
            })
    }

    /**
     * Recursively loads all scripts.
     *
     * @param {Import} _import
     * @param {Import} [parent]
     * @returns
     *
     * @memberof Importer
     */
    getScript(_import) {
        if (_import.loaded) {
            return Promise.resolve(true);
        }
        return loader.load(_import.path)
        .then((fileText) => {
            return this.processFile(_import, fileText)
        })
    }

    /**
     * build Import
     *
     * @param {Import} _import
     * @param {string} script
     * @param {Import} [parent]
     *
     * @memberof Importer
     */
    processFile(_import, script) {
        script = new VuePipeline(_import.path, script).getConvertedText()
        script = this.processExports(_import, script)
        _import.script = this.processImports(_import, script)
        return this.loadDependencies(_import)
            .then(() => _import.addScriptToDom())
    }

    /**
     * Loads dependencies.
     *
     * @param {Import} _import
     * @returns {Promise<any>}
     * @memberof Importer
     */
    loadDependencies(_import) {
        if (!_import.dependencies) {
            return Promise.resolve()
        }
        let proms = _import.dependencies.map((nextImport) => {
            return this.getScript(nextImport, _import)
        })
        return Promise.all(proms)
    }

    /**
     * Process exports
     *
     * @param {Import} _import
     * @param {string} script
     * @returns {string}
     *
     * @memberof Importer
     */
    processExports(_import, script) {
        let exports = this.getExports(_import.path, script)
        if (!exports) {
            return script
        }
        script = script.replace(/export default /, `const ${consts.DEFAULT_NAME} = `)
        script = script.replace(/export /g, '')
        script = [script, exports.join('\n')].join('\n')
        return script
    }

    /**
     * Process imports
     *
     * @param {Import} _import
     * @param {string} script
     * @returns {string}
     *
     * @memberof Importer
     */
    processImports(_import, script) {
        let imports = this.getImports(_import.path, script)
        if (!imports) {
            return script
        }
        let importsText = imports.map(imp => {
            _import.addDependency(imp)
            return imp.getImportText()
        }).join('\n')
        script = script.replace(consts.IMPORT_REGEX, '')
        script = `${importsText} \n ${script}`
        return script
    }

    /**
     * Gets the exports for a given file
     *
     * @param {string} scriptPath
     * @param {string} script
     * @returns {string[]}
     *
     * @memberof Importer
     */
    getExports(scriptPath, script) {
        let exports = script.match(new RegExp('(?:^|\n)\s*export [a-zA-Z_]* [a-zA-Z1-9_]*', 'g'))
        if (!exports) {
            return null
        }

        return exports.map(exp => {
            let [_, varType, name] = exp.trim().split(' ')
            if (varType === 'default') {
                return this.getExportScript(scriptPath, consts.DEFAULT_NAME, consts.DEFAULT_NAME)
            }
            return this.getExportScript(scriptPath, name, name)
        })
    }

    getExportScript(scriptPath, name, objName) {
        return `ei.export('${scriptPath}', '${name}', ${objName});`
    }

    /**
     * Gets the imports for a given file
     *
     * @param {string} scriptPath
     * @param {string} script
     * @returns {Import[]}
     *
     * @memberof Importer
     */
    getImports(scriptPath, script) {
        // TODO: here add 'imports as' syntax.
        let imports = script.match(consts.IMPORT_REGEX)
        if (!imports) {
            return null
        }
        return imports.map(imp => {
            return new Import(imp, scriptPath, this.domain, this.supportedModules)
        })
    }

    addGlobalFunctions() {
        window.ei = (function () {
            let imports = {}

            return {
                import: importer,
                export: exporter,
                imports: imports
            }

            function exporter(path, key, obj) {
                imports[path] = imports[path] || {}
                imports[path][key] = obj
            }

            function importer(path, key) {
                if (key) {
                    return imports[path][key]
                }
                return imports[path]
            }
        })()
    }

}