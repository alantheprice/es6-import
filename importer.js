(function () {
    "use strict";

    const EXPORT_REGEX = /(?:^|\n)\s*export [a-zA-Z]* [a-zA-Z1-9]*/g;
    const IMPORT_REGEX = /(?:^|\n)\s*import ([{}a-zA-Z1-9,\s]*) from ['|"].*['|"]/g;

    class Importer {

        constructor() {
            this.downloaded = {};
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
         * @returns void
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
            let path = (_import.path.indexOf('.') > -1) ? _import.path : _import.path + '.js'
            return fetch(path)
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
            let exports = script.match(new RegExp("(?:^|\n)\s*export [a-zA-Z]* [a-zA-Z1-9]*", "g"));
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

    class VueImporter {
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
            // in this case, we have an external url, don't need to build a path.
            if (childPath.includes("http")) {
                return childPath;
            }

            let cds = childPath.match(/\.\.\//g);
            let cdLength = (cds != null)? cds.length : 0;
            childPath = childPath.replace(/\.\.\//g, "");
            parentPath = parentPath || "/";
            let parentPathArray = parentPath.split("/");
            if (cdLength) {
                parentPathArray = parentPathArray.slice(0, -(cdLength));
            }
            let path = parentPathArray.reduce(Import.composePathParts, "");
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
            if (this.variables.length && this.script.indexOf("ei.export") === -1) {
                let ex = this.variables[0];
                this.script = `${this.script} \nconsole.log('global', global.${ex.name});ei.export('${this.path}', '${Importer.DEFAULT_NAME}', global.${ex.name})`
            }
            return this.getIife(this.script);
        }

        getIife(content) {
            let global = "const global = window;";
            if (content.indexOf("(function (global, factory) {") > -1) {
                global = "const global = {};";
                content = content.replace("(function (global, factory) {", "(function (_global, factory) {")
            }
            return `(function(){"use strict"\n${global}\n${content}\n})();`;
        }

        /**
         * Adds the input script to the DOM.
         * 
         * @param {string} scriptText 
         * @returns {Promise<boolean>}
         */
        addScriptToDom() {
            if (document.getElementById(this.path) != null) {
                return Promise.resolve(true);
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
     * Builds path partial
     * 
     * @param {string} combined 
     * @param {string} next 
     * @param {number} index 
     * @param {Array<string>} arr 
     * @returns 
     */
    Import.composePathParts = function composePathParts(combined, next, index, arr) {
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
