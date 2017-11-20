let promises = {}
import config from './config.js'

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
    if (!shouldLoadFromCache(path)) {
        return getRemote(path)
    }
    let fromCache = loadFromCache(path)
    if (fromCache) {
        // refresh cache, but load instantly from cache since it is possible.
        getRemote(path)
        return Promise.resolve(fromCache)
    }
    return getRemote(path)
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
    if (config.cacheModules && path.indexOf('https://unpkg.com/') === 0) {
        return true
    }
    return config.cacheAll
}

function getRemote(path) {
    return fetch(path)
    .then((response) => {
        if (!response.ok) {
            throw new Error(response.statusText)
        }
        return response.text()
    }).then(text => {
        cache(path, text)
        return text
    })
}

function cache(path, text) {
    localStorage.setItem(path, text)
}

function loadFromCache(path) {
    return localStorage.getItem(path)
}