import { Import } from './Import.js'
import { VuePipeline } from './VuePipeline.js'
import loader from './loader.js'
import consts from './consts.js'
import utils from './utils.js'
import state from './sharedState.js'


export class Importer {

    constructor() {
        let importScript = Array.from(document.getElementsByTagName('script')).find((elem) => {
            return elem.getAttribute('import') != null
        })
        if (importScript == null) {
            throw new Error('No import script found')
        }
        state.domain = null
        state.finalScript = utils.getGlobalFunctions()
        let customNpmModules = importScript.getAttribute('npm-modules')
        if (customNpmModules) {
            state.supportedModules = state.supportedModules.concat(JSON.parse(customNpmModules))
        }
        state.debug = importScript.getAttribute('debug') ? true : false
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
        this.setDefaultDomain()
        if (scriptPath.indexOf('http') > -1) {
            state.domain = scriptPath.split('/').slice(0, 3).join('/')
            scriptPath = './' + scriptPath.split('/').slice(3).join('/')
        }
        let imp = new Import(`import {} from '${scriptPath}'`, this.getStartingPath())
        let start = performance.now()
        this.getScript(imp)
            .then(() => {
                return this.addScript()
            })
            .then(() => {
                utils.log(imp.getDependencyMap())
                let end = performance.now()
                let diff = end - start
                console.log(`It took ${diff} milliseconds to load all scripts`)
            })
    }

    /**
     * Sets the default domain.
     * 
     * @memberof Importer
     */
    setDefaultDomain() {
        let htmlFileName = window.location.href.split('/').filter((pth) => pth.indexOf('.html') > -1)[0] || '____'
        state.domain = window.location.href.replace(htmlFileName, '');
    }

    addScript() {
        if (!state.compileSingle) {
            return Promise.resolve()
        }
        return utils.executeImport(state.finalScript, document.head)
    }

    getStartingPath(){
        // there is already a domain specified, we don't need to find entrance base path.
        if (state.domain) {
            return './'
        }
        let context = window.location.href.replace(window.location.host, '')
        if (context.split('/').length > 2) {
            let startingPath = context.split('/').slice(0, -1).join('/')
            console.log('startingPath', startingPath)
            return startingPath
        }
        return './'
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
        return Promise.all(_import.dependencies.map((nextImport) => this.getScript(nextImport)))
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
        let exports = script.match(new RegExp(consts.EXPORT_REGEX_PATTERN, 'g'))
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
        // TODO: allow 'imports as' syntax.
        let imports = script.match(consts.IMPORT_REGEX)
        if (!imports) {
            return null
        }
        return imports.map(imp => {
            return new Import(imp, scriptPath)
        })
    }
}