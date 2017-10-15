(function () {
    "use strict";

    const EXPORT_REGEX = /(?:^|\n)\s*export [a-zA-Z]* [a-zA-Z1-9_]*/g;
    const IMPORT_REGEX = /(?:^|\n)\s*import ([{}a-zA-Z1-9,_\s]*) from ['|"].*['|"]/g;
    const DEFAULT_SUPPORTED_MODULES = ['vue']

    class Importer {

        constructor() {
            this.downloaded = {};
            let importScript = Array.from(document.getElementsByTagName("script")).find((elem) => {
                return elem.getAttribute("import") != null;
            })
            if (importScript == null) {
                throw new Error("No import script found");
            }
            this.domain = null
            this.addGlobalFunctions();
            let customNpmModules = importScript.getAttribute("npm-modules");
            if (customNpmModules) {
                supportedModules = DEFAULT_SUPPORTED_MODULES.concat(JSON.parse(customNpmModules))
            }
            this.beginImport(importScript.getAttribute("import"));
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
            let imp = new Import(`import {} from '${scriptPath}'`, "./", this.domain)
            let start = performance.now();
            this.getScript(imp)
                .then(() => {
                    let end = performance.now();
                    let diff = end - start;
                    console.log(`It took ${diff} milliseconds to load all scripts`);
                    console.log(finalScript)
                });
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
        getScript(_import, parent) {
            if (this.downloaded[_import.path]) {
                return Promise.resolve();
            }
            return fetch(_import.path)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(response.statusText);
                    }
                    return response.text();
                }).then(text => {
                    this.downloaded[_import.path] = _import;
                    return this.buildImport(_import, text, parent);
                });
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
        buildImport(_import, script, parent) {
            script = new VueImporter(_import.path, script).getConvertedText();
            script = this.processExports(_import, script);
            _import.script = this.processImports(_import, script);
            if (_import.children) {
                let proms = _import.children.map((nextImport) => {
                    return this.getScript(nextImport, _import);
                });
                return Promise.all(proms)
                    .then(() => {
                        return _import.addScriptToDom();
                    })
            }
            return Promise.resolve(_import.addScriptToDom())
                .then(() => {
                    _import.loaded = true;
                    if (parent && parent.childrenLoaded()) {
                        return parent.addScriptToDom();
                    }
                    return;
                });
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
            let exports = this.getExports(_import.path, script);
            if (!exports) {
                return script;
            }
            script = script.replace(/export default /, `const ${Importer.DEFAULT_NAME} = `);
            script = script.replace(/export /g, "");
            script = [script, exports.join("\n")].join("\n");
            return script;
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
            let imports = this.getImports(_import.path, script);
            if (!imports) {
                return script;
            }
            let importsText = imports.map(imp => {
                _import.addChild(imp);
                return imp.getImportText();
            }).join("\n");
            script = script.replace(IMPORT_REGEX, "");
            script = `${importsText} \n ${script}`;
            return script;
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
            let exports = script.match(new RegExp("(?:^|\n)\s*export [a-zA-Z_]* [a-zA-Z1-9_]*", "g"));
            if (!exports) {
                return null;
            }

            return exports.map(exp => {
                let [_e, varType, name] = exp.trim().split(" ")
                if (varType === "default") {
                    return this.getExportScript(scriptPath, Importer.DEFAULT_NAME, Importer.DEFAULT_NAME);
                }
                return this.getExportScript(scriptPath, name, name);
            })
        }

        getExportScript(scriptPath, name, objName) {
            return `ei.export('${scriptPath}', '${name}', ${objName});`;
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
            let imports = script.match(IMPORT_REGEX);
            if (!imports) {
                return null;
            }
            return imports.map(imp => {
                return new Import(imp, scriptPath, this.domain);
            })
        }

        addGlobalFunctions() {
            window.ei = (function() {
                let imports = {};
                
                return {
                    import: importer,
                    export: exporter,
                    imports: imports
                };
                function exporter(path, key, obj) {
                    imports[path] = imports[path] || {};
                    imports[path][key] = obj;
                }
                function importer(path, key) {
                    if (key) {
                        return imports[path][key];
                    }
                    return imports[path];
                }
            })();
        }

    }

    /**
     * Builds path partial
     * 
     * @param {string} combined 
     * @param {string} next 
     * @param {number} index 
     * @param {Array<string>} arr 
     * @returns 
     */
    Importer.composePathParts = function composePathParts(combined, next, index, arr) {
        if (arr.length === index + 1) {
            return (combined !== "")? combined + "/" : combined;
        }
        if (!next) {
            return combined;
        } else if (!combined) {
            return next;
        }
        return [combined, next].join("/");
    }

    new Importer();

})();
