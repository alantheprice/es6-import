import { Import } from './Import.js'
import { VuePipeline } from './VuePipeline.js'
import loader from './loader.js'
import consts from './consts.js'
import utils from './utils.js'
import config from './config.js'
import store from './store.js'
import scriptHolder from './scriptHolder.js'

const BUILT_SCRIPT_KEY = 'ltl'

 export class Importer {

    constructor() {
        config.importScript
        config.domain = null
        scriptHolder.addToFinalScript(utils.getGlobalFunctions(), 'global')
        this.beginImport(config.importScript.getAttribute('import'))
    }

    /**s
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
            config.domain = scriptPath.split('/').slice(0, 3).join('/')
            scriptPath = './' + scriptPath.split('/').slice(3).join('/')
        }
        let imp = new Import(`import {} from '${scriptPath}'`, this.getStartingPath())
        let start = performance.now()
        if (config.cacheAll) {
            this.loadFinalFromCache()
        }
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
        config.domain = window.location.href.replace(htmlFileName, '');
        if (config.domain.slice(-1) === '/') {
            config.domain = config.domain.slice(0, -1)
        }
    }

    loadFinalFromCache() {
        let lastCompiled = store.getItem(BUILT_SCRIPT_KEY)
        if (!lastCompiled) {
            return
        }
        this.loadedFromCache = utils.unmangle(lastCompiled)
        this.b64Cache = lastCompiled.text
        utils.log('loading from cache')
        utils.executeImport(this.loadedFromCache, document.head)
    }

    addScript() {
        let finalScript = scriptHolder.getFinalScript()
        let finalB64 = utils.mangle(finalScript)
        if (this.b64Cache === finalB64.text) {
            utils.log('Nothing changed')
            return Promise.resolve()
        }
        store.setItem(BUILT_SCRIPT_KEY, finalB64)

        if (this.b64Cache) {
            // can't actually get this done until we fix ordering.
            utils.log('There are changes, next reload gets them')
            let key = 'diff' + new Date().getMilliseconds()
            store.setItem(key, {old: this.loadedFromCache, new: finalScript})
            return
        }
        utils.log('Loading script')
        return utils.executeImport(finalScript, document.head)
    }

    getStartingPath(){
        // there is already a domain specified, we don't need to find entrance base path.
        if (config.domain) {
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
     * @returns
     *
     * @memberof Importer
     */
    getScript(_import) {
        if (scriptHolder.scriptIsLoaded(_import.path)) {
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
     *
     * @memberof Importer
     */
    processFile(_import, script) {
        script = new VuePipeline(_import.path, script).getConvertedText()
        script = this.processExports(_import, script)
        _import.script = this.processImports(_import, script)
        return this.loadDependencies(_import)
            .then(() => _import.addScript())
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
        let exports = script.match(consts.EXPORT_REGEX_PATTERN)
        if (!exports) {
            return null
        }

        return exports.map(exp => {
            let [_, varType, name] = exp.trim().split(/\s+/)
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