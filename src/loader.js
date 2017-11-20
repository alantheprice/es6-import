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
    let resp = null
    // temp for testing remove before publish
    // if (path === 'https://unpkg.com/vue') {
    //     path = 'https://unpkg.com/vue@2.5.6/dist/vue.min.js'
    // }
    return fetch(path)
    .then((response) => {
        if (!response.ok) {
            throw new Error(response.statusText)
        }
        resp = response
        return response.text()
    }).then(text => {
        cache(path, text, resp)
        return text
    })
}

function cache(path, text, fullResponse) {
    window.response = fullResponse
    // actual url is fullResponse.url, if module, we should be able to pull the version out and save it to be able to do intelligent caching and versioning.
    localStorage.setItem(path, text)
}

function loadFromCache(path) {
    return localStorage.getItem(path)
}