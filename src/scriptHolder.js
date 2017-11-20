import consts from './consts.js'
let finalScript = ''
let addedScripts = {}

export default {
    addToFinalScript: addToFinalScript,
    getFinalScript: getFinalScript,
    scriptIsLoaded: scriptIsLoaded
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

function scriptIsLoaded(scriptPath) {
    return addedScripts[scriptPath] || false
}
