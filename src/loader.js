let promises = {}
import config from './config.js'
import store from './store.js'
import consts from './consts.js'

export default {
    load: loadFile
}

function loadFile(path) {
    // caching promises so we don't make requests multiple times.
    if (promises[path]) {
        return promises[path]
    }
    promises[path] = load(path)
    return promises[path]
}
/**
 * 
 * 
 * @param {string} path 
 * @returns 
 */
function load(path) {
    let moduleConfig = getModuleConfig(path)
    if (!shouldLoadFromCache(path)) {
        return getRemote(path, moduleConfig)
    }
    let fromCache = loadFromCache(path, moduleConfig)
    if (fromCache) {
        // refresh cache, but load instantly from cache since it is possible.
        getRemote(path, moduleConfig)
        return Promise.resolve(fromCache)
    }
    return getRemote(path, moduleConfig)
}

function getModuleConfig(path) {
   if (!isModule(path)) {
      return 0
   }
   let moduleName = path.replace(consts.MODULE_URL, '')
   let moduleConfig = config.moduleConfig[moduleName] || {version: 0}
   return moduleConfig
}

function isModule(path) {
    return path.indexOf(consts.MODULE_URL) === 0
}

/**
 * 
 * 
 * @param {string} path 
 * @returns 
 */
function shouldLoadFromCache(path) {
    if (!config.cacheModules && !config.cacheAll) {
        return false
    }
    if (config.cacheModules && path.indexOf(consts.MODULE_URL) === 0) {
        return true
    }
    return config.cacheAll
}
/**
 * 
 * 
 * @param {any} path 
 * @param {{version: string, overideUrl: string}} moduleConfig 
 * @returns 
 */
function getRemote(path, moduleConfig) {
    let resp = null
    return fetch(path)
    .then((response) => {
        if (!response.ok) {
            throw new Error(response.statusText)
        }
        resp = response
        return response.text()
    }).then(text => {
        cache(path, text, resp, moduleConfig)
        return text
    })
}

/**
 * 
 * 
 * @param {string} path 
 * @param {string} text 
 * @param {Response} fullResponse 
 * @param {{version: string, overideUrl: string}} moduleConfig
 */
function cache(path, text, fullResponse, moduleConfig) {
    let version = moduleConfig.version

    let loadedVersion = fullResponse.url.match(consts.MODULE_VERSION_URL_REGEX)
    if (loadedVersion) {
        version = loadedVersion[0].split('@')[1]
    }
    store.setItem(path, {text: btoa(text), url: fullResponse.url, version: version, overideUrl: moduleConfig.overideUrl})
}
/**
 * 
 * 
 * @param {any} path 
 * @returns {string}
 */
function loadFromCache(path, moduleConfig) {
    let found = store.getItem(path)
    if (!found || !found.text || !found.url) {
        return null
    }
    debugger
    if (moduleConfig.version !== 0 && found.version !== moduleConfig.version) {
        return null
    }
    if (moduleConfig.overideUrl !== null && found.overideUrl !== moduleConfig.overideUrl) {
        return null
    }
    // if (config.debug) {
        console.log(`Loaded ${path} from cache`)
    // }
    return atob(found.text)
}

