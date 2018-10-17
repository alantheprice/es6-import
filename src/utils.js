import config from './config.js'

export default {
    composePathParts: composePathParts,
    executeImport: excuteImport,
    getGlobalFunctions: getGlobalFunctions,
    log: log,
    mangle: mangle,
    unmangle: unmangle
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
function composePathParts(combined, next, index, arr) {
    if (arr.length === index + 1) {
        return (combined !== '') ? combined + '/' : combined
    }
    if (!next) {
        return combined
    } else if (!combined) {
        return next
    }
    return [combined, next].join('/')
}

/**
 * Adds the input script to the DOM.
 * 
 * @param {string} script 
 * @param {HTMLElement} parent 
 * @returns {Promise<boolean>}
 */
function excuteImport(script, parent) {
    if (!window) {
        //TODO add node support for building and outputing this as a promise
    }
    let scriptTag = document.createElement('script')
    let blob = new Blob([script], {
        'type': 'application/javascript'
    })
    var url = URL.createObjectURL(blob)
    parent.appendChild(scriptTag)
    return new Promise(resolve => {
        scriptTag.onload = () => {
            resolve()
            console.log('loaded', scriptTag.src)
        }
        scriptTag.src = url
    })
}

function log(msg) {
    if (!config.debug) {
        return
    }
    msg = (typeof msg === 'object') ? JSON.stringify(msg, null, 2) : msg
    console.log(msg)
}

function getGlobalFunctions() {
    return `(function (global) {
        let imports = {}

        global.ei = {
            import: importer,
            export: exporter,
            imports: imports
        }

        function exporter(path, key, obj) {
            imports[path] = imports[path] || {}
            imports[path][key] = obj
        }

        function importer(path, key) {
            if (!imports[path]) {
                console.error('unable to find module: ' + path)
                console.log('Available Modules: ', Object.keys(imports))
            }
            if (key) {
                return imports[path][key]
            }
            return imports[path]
        }
    })(window);\n`
}

/**
 * Mangle
 *
 * @param {string} inputString
 * @returns {{ text: string, isBase64: boolean }}
 */
function mangle(inputString) {
    try{
        return {
            text: btoa(inputString),
            isBase64: true
        }
    }
    catch(e) {
        return {
            text: inputString,
            isBase64: false
        }
    }
}

/**
 * Unmangle text
 *
 * @param {{ text: string, isBase64: boolean }} mangledText
 * @returns { string }
 */
function unmangle(mangledText) {
    if (!mangledText.isBase64) {
        return mangledText.text
    }
    return atob(mangledText.text)    
}