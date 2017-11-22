const IS_JSON_KEY = 'is_JSON'

export default {
    setItem: setItem,
    getItem: getItem
}

/**
 * Set item
 * 
 * @param {string} key 
 * @param {object|string} value 
 */
function setItem(key, value) {
    let isJSON = !(typeof value === 'string')
    if (!isJSON) {
        localStorage.setItem(key, value)
        return
    }    
    let saveValue = IS_JSON_KEY + JSON.stringify(value)

    localStorage.setItem(key, saveValue)
}

/**
 * Get item
 * 
 * @param {string} key 
 */
function getItem(key) {
    let found = localStorage.getItem(key)
    if (!found) {
        return null
    }
    return (found.indexOf(IS_JSON_KEY) === 0) ? JSON.parse(found.replace(IS_JSON_KEY, '')) : found
}
