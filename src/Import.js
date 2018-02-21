import consts from './consts.js'
import utils from './utils.js'
import config from './config.js'
import scriptHolder from './scriptHolder.js'
const EXPORT_DEFAULT_REGEX = /ei\.export\('.*', '_default', _default\);/

export class Import {
    /**
     * Creates an instance of Import.
     * @param {string} fullImportText 
     * 
     * @memberof Import
     */
    constructor(fullImportText, parentScriptPath) {
        fullImportText = fullImportText.trim()
        this.variables = this.getVariables(fullImportText);
        let path = fullImportText.match(/["|'].*["|']/g)[0]
            .replace(/["|']/g, "");
        this.path = this.buildRelativePath(path, parentScriptPath.replace(config.domain, ''));
        this.path = this.getActualPath(this.path)
        /**
         * @type {Array<Import>}
         */
        this.dependencies = [];
        /**
         * @type {string}
         */
        this.script = null;
    }

    /**
     * 
     * 
     * @param {string} path 
     * @returns 
     * @memberof Import
     */
    getActualPath(path) {
        if (config.supportedModules.indexOf(path) > -1) {
            return `${consts.MODULE_URL}${path}`
        }
        if (!this.hasExtension(path)) {
            path = path + '.js'
        }
        if (config.domain) {
            let cleanedPath = (path.indexOf('.') === 0) ? path.substr(1) : path
            cleanedPath = (cleanedPath.indexOf('/') === 0) ? cleanedPath.slice(1) : cleanedPath
            path = [config.domain, cleanedPath].join('/')
        }
        return path
    }

    hasExtension(path) {
        let parts = path.split('.')
        if (!parts.length) {
            return false
        }
        return (parts[parts.length - 1].length < 5)
    }

    /**
     * Get a depency map
     * 
     * @returns any
     * @memberof Import
     */
    getDependencyMap() {
        let obj = {}
        obj[this.path] = this.dependencies.map((dep) => {
            return dep.getDependencyMap()
        })
        return obj
    }

    /**
     * 
     * 
     * @param {string} fullImportText 
     * @returns {{name: string, valueName: string}[]}
     * 
     * @memberof Import
     */
    getVariables(fullImportText) {
        if (fullImportText.indexOf("{") === -1) {
            let [_import, defaultName] = fullImportText.split(/\s+/);
            return [{
                name: defaultName,
                valueName: consts.DEFAULT_NAME
            }];
        }
        return fullImportText.match(/{([a-zA-Z1-9,_\s]*)}/g)[0]
            .replace(/[{|}]/g, "")
            .split(",")
            .map(val => val.trim())
            .filter(val => val !== "")
            .map(val => {
                return {
                    name: val,
                    valueName: val
                };
            });
    }

    /**
     * 
     * 
     * @param {string} childPath 
     * @param {string} parentPath 
     * @returns 
     * 
     * @memberof Import
     */
    buildRelativePath(childPath, parentPath) {
        // in this case, we have an external url, don't need to build a path.
        if (childPath.includes("http") || config.supportedModules.indexOf(childPath) > -1) {
            return childPath;
        }

        let cds = childPath.match(/\.\.\//g);
        let cdLength = (cds != null) ? cds.length : 0;
        childPath = childPath.replace(/\.\.\//g, "");
        parentPath = parentPath || "/";
        let parentPathArray = parentPath.split("/");
        if (cdLength) {
            parentPathArray = parentPathArray.slice(0, -(cdLength));
        }
        let path = parentPathArray.reduce(utils.composePathParts, "");
        return [path, childPath.replace("./", "")].join("");
    }

    /**
     * Gets the correct import text for the instance of the Import object
     * 
     * @returns {string}
     * @memberof Import
     */
    getImportText() {
        return this.variables.map((variable) => {
            return `const ${variable.name} = ei.import('${this.path}', '${variable.valueName}');`
        }).join("\n");
    }

    /**
     * Adds a child dependency to this import
     * 
     * @param {Import} _import 
     * 
     * @memberof Import
     */
    addDependency(_import) {
        this.dependencies.push(_import);
    }

    /**
     * To keep the global scope unpolluted and ensure that exports and imports actually do what we expect, 
     * we need to wrap the entire script file in an iife.
     * 
     * @returns {string}
     * 
     * @memberof Import
     */
    getIifeWrappedScript() {
        if (this.variables.length && this.script.indexOf("ei.export") === -1) {
            return this.getExternalModule(this.script);
        }
        return this.getIife(this.script);
    }

    getExternalModule(content) {
        if (this.script.indexOf('typeof exports') > -1 && this.script.indexOf('typeof module') > -1) {
            let top = 'let exports = {};let module = {};'
            let bottom = `\nei.export('${this.path}', '${consts.DEFAULT_NAME}', module.exports);`
            let lineBreak = '\n'
            let forwardModules = `\nObject.keys(module.exports).map((key) => ei.export('${this.path}', key, module.exports[key]))`
            return this.getIife(`${top};\n${content};\n${bottom}\n${forwardModules}`)
        }
        let ex = this.variables[0];
        content = `${content} \nei.export('${this.path}', '${consts.DEFAULT_NAME}', global.${ex.name})`
        let global = "const global = window;";        
        return this.getIife(`${global}\n${content}`);
    }

    getIife(content) {
        return `(function(){"use strict"\n${content}\n})();\n`;
    }

    /**
     * Adds the input script to the DOM.
     * 
     * @returns {Promise<any>}
     */
    addScript() {
        if (config.compileSingle) {
            scriptHolder.addToFinalScript(this.getIifeWrappedScript(), this.path)
            return Promise.resolve()
        }
    }

}
