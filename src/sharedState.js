import consts from './consts.js'
let finalScript = ''
let addedScripts ={}

export default {
    domain: null,
    supportedModules: consts.DEFAULT_SUPPORTED_MODULES,
    debug: false,
    addToFinalScript: addToFinalScript,
    compileSingle: true
}

function addToFinalScript(partial, path) {
    if (addedScripts[path]) {
        return
    }
    finalScript += partial
    addedScripts[path] = true
}

function getFinalScript() {
    return finalScript;
}