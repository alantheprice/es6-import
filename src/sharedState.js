import consts from './consts.js'
let finalScript = ''
let addedScripts = {}

export default {
    domain: null,
    supportedModules: consts.DEFAULT_SUPPORTED_MODULES,
    debug: false,
    addToFinalScript: addToFinalScript,
    getFinalScript: getFinalScript,
    compileSingle: true
}

/**
 * Add To final script
 * 
 * @param {string} partial 
 * @param {string} path 
 */
function addToFinalScript(partial, path) {
    if (addedScripts[path]) {
        return
    }
    finalScript += partial
    addedScripts[path] = true
}

/**
 * Gets the final script
 * 
 * @returns {string}
 */
function getFinalScript() {
    return finalScript;
}