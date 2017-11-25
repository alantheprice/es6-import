import consts from './consts.js'

let domain = null
let supportedModules = consts.DEFAULT_SUPPORTED_MODULES
let debug = false
let cacheAll = false
let cacheModules = true
let compileSingle = true
let moduleConfig = {}

let importScript = Array.from(document.getElementsByTagName('script')).find((elem) => {
    return elem.getAttribute('import') != null
})
if (importScript == null) {
    throw new Error('No import script found')
}

setup(importScript)

export default {
    importScript: importScript,
    domain: domain,
    supportedModules: supportedModules,
    debug: debug,
    cacheAll: cacheAll,
    cacheModules: cacheModules,
    compileSingle: compileSingle,
    moduleConfig: moduleConfig,
    setup: setup
}

/**
 * Setup
 * 
 * @param {HTMLElement} importScript 
 */
function setup(importScript) {
    let customNpmModules = importScript.getAttribute('npm-modules')
    if (customNpmModules) {
        supportedModules = supportedModules.concat(parseCustomModules(customNpmModules))
    }
    debug = (importScript.getAttribute('debug') === 'true') ? true : false
    cacheAll = (importScript.getAttribute('cache-all') === 'true') ? true : false
    moduleConfig = loadModConfig(importScript)
    console.log(moduleConfig)
}

/**
 * 
 * 
 * @param {HTMLElement} importScript 
 * @returns {any}
 */
function loadModConfig(importScript) {
    return supportedModules.reduce((agg, mod) => {
        let config = importScript.getAttribute(mod)
        if (config) {
            agg[mod] = parseConfig(config, mod)
        }
        return agg
    }, {})
}

/**
 * 
 * 
 * @param {any} config 
 * @param {string} moduleName
 * @returns {{version: string, overideUrl: string, moduleName: string}}
 */
function parseConfig(config, moduleName) {
    if (config.indexOf('{') > -1) {
        return JSON.parse(config)
    }
    return config.split('&').reduce((agg, keyValue) => {
        let kv = keyValue.split('=')
        agg[kv[0]] = kv[1]
        return agg
    }, {moduleName: moduleName})
}
/**
 * 
 * 
 * @param {string} customNpmModules 
 * @returns {string[]}
 */
function parseCustomModules(customNpmModules) {
    if (customNpmModules.indexOf('[') > -1) {
        return JSON.parse(customNpmModules)
    }
    return customNpmModules.split(',').map((mod) => mod.trim())
}
