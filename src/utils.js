
export default {
    composePathParts: composePathParts,
    attachSrc: attachSrc
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
function attachSrc(script, parent) {
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
