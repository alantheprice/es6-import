let promises = {}
import config from './config.js'
import store from './store.js'
import consts from './consts.js'
import utils from './utils.js'

let refreshingCache = []

export default {
    load: loadFile,
    awaitCacheRefresh: awaitCacheRefresh
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
 * @param {string} path 
 * @returns 
 */
function load(path) {
    let moduleConfig = getModuleConfig(path)
    let maxTimeout = loadFromCache(path, moduleConfig) ? 200 : 99999
    if (!shouldLoadFromCache(path)) {
        return getRemote(path, moduleConfig, maxTimeout)
        .catch(() => loadFromCache(path, moduleConfig))
    }
    let fromCache = loadFromCache(path, moduleConfig)
    if (fromCache) {
        // refresh cache, but load instantly from cache since it is possible.
        refreshingCache.push({
            promise: getRemote(path, moduleConfig, 99999), 
            config: moduleConfig
        })
        return Promise.resolve(fromCache)
    }
    return getRemote(path, moduleConfig, maxTimeout)
    .catch(() => loadFromCache(path, moduleConfig))
}

function getModuleConfig(path) {
   if (!isModule(path)) {
      return {}
   }
   let moduleName = path.replace(consts.MODULE_URL, '')
   let moduleConfig = config.moduleConfig[moduleName] || {version: ''}
   return moduleConfig
}

function isModule(path) {
    return path.indexOf(consts.MODULE_URL) === 0
}

/**
 * @param {string} path 
 * @returns 
 */
function shouldLoadFromCache(path) {
    return (config.cacheModules && isModule(path))
}

/**
 * Get Remote
 * s
 * @param {string} path 
 * @param {{version: string, overideUrl: string, moduleName: string}} moduleConfig 
 * @param {number} maxTimeout
 * @returns 
 */
function getRemote(path, moduleConfig, maxTimeout) {
    let resp = null
    let pth = getRemotePath(path, moduleConfig)
    return new Promise((resolve, reject) => {
        let timeoutId = setTimeout(reject, maxTimeout)
        fetch(pth)
        .then((response) => {
            clearTimeout(timeoutId)
            if (!response.ok) {
                throw new Error(response.statusText)
            }
            resp = response
            return response.text()
        }).then(text => {
            cache(path, text, resp, moduleConfig)
            resolve(text)
        }).catch((err) => {
            clearTimeout(timeoutId)
            reject()
        })

    })
}

/**
 * 
 * 
 * @param {string} path 
 * @param {{version: string, overideUrl: string, moduleName: string}} moduleConfig 
 * @returns {string}
 */
function getRemotePath(path, moduleConfig) {
    if (moduleConfig.overideUrl) {
        return moduleConfig.overideUrl
    }
    if (moduleConfig.version && moduleConfig.version !== '') {
        let versionName = [moduleConfig.moduleName, moduleConfig.version].join('@')
        return `${consts.MODULE_URL}${versionName}`
    }
    return path
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
    let mangled = utils.mangle(text)
    if (!mangled.isBase64) {
        return
    }
    store.setItem(path, {
        text: mangled.text,
        isBase64: mangled.isBase64,
        url: fullResponse.url, 
        version: version, 
        overideUrl: moduleConfig.overideUrl
    })
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
    if (moduleConfig.version !== '' && found.version !== moduleConfig.version) {
        return null
    }
    if (moduleConfig.overideUrl !== null && found.overideUrl !== moduleConfig.overideUrl) {
        return null
    }
    if (config.debug) {
        console.log(`Loaded ${path} from cache`)
    }
    return utils.unmangle(found)    
}

function awaitCacheRefresh() {
    let promise = refreshingCache.map((item) => item.promise)
    return Promise.all(promise)
    .then((items) => {
        return true
    })
}

