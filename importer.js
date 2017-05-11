(function () {
    "use strict";

    class Importer {

        constructor() {
            this.downloaded = {};
            this.importReg = /import ([{}a-zA-Z1-9,\s]*) from ['|"].*['|"];*/g
            let scripts = document.getElementsByTagName("script");
            let importScript = Array.from(scripts).find((elem) => {
                return elem.getAttribute("import") != null;
            })
            if (importScript == null) {
                throw new Error("No import script found");
            }
            this.addGlobalFunctions();
            this.beginImport(importScript.getAttribute("import"));
        }

        /**
         * Begin file imports
         * 
         * @param {string} scriptPath 
         * @returns {Promise<any>}
         * 
         * @memberof Importer
         */
        beginImport(scriptPath) {
            let imp = new Import(`import {} from '${scriptPath}'`, "./")
            let start = performance.now();
            this.getScript(imp)
                .then(() => {
                    let end = performance.now();
                    let diff = end - start;
                    console.log(`It took ${diff} milliseconds to load all scripts`);
                });
        }

        /**
         * 
         * 
         * @param {Import} _import 
         * @param {Import} [parent] 
         * @returns 
         * 
         * @memberof Importer
         */
        getScript(_import, parent) {
            if (this.downloaded[_import.path]) {
                // TODO: fix this, it isn't quite right.
                return Promise.resolve(this.downloaded[_import.path]);
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
            if (script.indexOf("export ") > -1) {
                let exports = this.getExports(_import.path, script);
                script = script.replace(/export default /, `let ${Importer.DEFAULT_NAME} = `);
                script = script.replace(/export /g, "");
                script = [script, exports.join("\n")].join("\n");
            }
            return script;
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
        processImports(_import, script) {
            if (script.indexOf("import ") > -1) {
                let imports = this.getImports(_import.path, script);
                let importsText = imports.map(imp => {
                    _import.addChild(imp);
                    return imp.getImportText();
                }).join("\n");
                script = script.replace(this.importReg, "");
                script = `${importsText} \n ${script}`;
            }
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
            let exports = script.match(new RegExp("export [a-zA-Z]* [a-zA-Z1-9]*", "g"));
            return exports.map(exp => {
                let [_e, varType, name] = exp.split(" ")
                if (varType === "default") {
                    return `ei.export('${scriptPath}', '${Importer.DEFAULT_NAME}', ${Importer.DEFAULT_NAME});`;
                }
                return `ei.export('${scriptPath}', '${name}', ${name});`;
            })
        }

        /**
         * Gets the exports for a given file
         * 
         * @param {string} scriptPath 
         * @param {string} script 
         * @returns {Import[]}
         * 
         * @memberof Importer
         */
        getImports(scriptPath, script) {
            let imports = script.match(this.importReg);
            // TODO: here add 'imports as' syntax.
            return imports.map(imp => {
                return new Import(imp, scriptPath);
            })
        }

        addGlobalFunctions() {
            window.ei = (function() {
                let imports = {};
                return {
                    import: importer,
                    export: exporter
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

    Importer.DEFAULT_NAME = "_default";

    class Import {
        /**
         * Creates an instance of Import.
         * @param {string} fullImportText 
         * 
         * @memberof Import
         */
        constructor(fullImportText, parentScriptPath) {
            this.variables = this.getVariables(fullImportText);
            let path = fullImportText.match(/["|'].*["|']/g)[0]
                .replace(/["|']/g, "");
            this.path = this.buildPath(path, parentScriptPath);
            /**
             * @type {Array<Import>}
             */
            this.children = [];
            /**
             * @type {string}
             */
            this.script = null;
            this.loaded = false;
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
                let [_import, defaultName] = fullImportText.split(" ");
                return [{name: defaultName, valueName: Importer.DEFAULT_NAME}];
            }
            return fullImportText.match(/{([a-zA-Z1-9,\s]*)}/g)[0]
                .replace(/[{|}]/g, "")
                .split(",")
                .map(val => val.trim())
                .filter(val => val !== "")
                .map(val => {
                    return {name: val, valueName: val};
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
        buildPath(childPath, parentPath) {
            parentPath = parentPath || "/";
            let path = parentPath.split("/").reduce(Import.buildPath, "");
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
                return `let ${variable.name} = ei.import('${this.path}', '${variable.valueName}');`
            }).join("\n");
        }

        /**
         * Adds a child dependency to this import
         * 
         * @param {Import} _import 
         * 
         * @memberof Import
         */
        addChild(_import) {
            this.children.push(_import);
        }

        /**
         * Are all children loaded.
         * 
         * @returns {boolean}
         * 
         * @memberof Import
         */
        childrenLoaded() {
            return this.children.reduce((bool, child) => {
                return bool && child.loaded;
            }, true)
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
            return `(function() { \n "use strict";\n ${this.script}\n\n})();`;
        }

        /**
         * Adds the input script to the DOM.
         * 
         * @param {string} scriptText 
         * @returns {Promise<boolean>}
         */
        addScriptToDom() {
            if (document.getElementById(this.path) != null) {
                return Promise.resolve();
            } 
            let scriptTag = document.createElement("script");
            scriptTag.setAttribute("id", this.path);
            let blob = new Blob([this.getIifeWrappedScript()], {'type': 'application/javascript'});
            var url = URL.createObjectURL(blob);
            document.head.appendChild(scriptTag);

            return new Promise(resolve => {
                scriptTag.onload = () => {
                    resolve();
                    console.log("loaded", scriptTag.src);
                }
                scriptTag.src = url;
            })
        }

    }

    /**
     * Builds the path from 
     * 
     * @param {string} combined 
     * @param {string} next 
     * @param {number} index 
     * @param {Array<string>} arr 
     * @returns 
     */
    Import.buildPath = function buildPath(combined, next, index, arr) {
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