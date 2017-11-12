let promises = {}

export default {
    load: loadFile
}

function loadFile(path) {
    if (promises[path]) {
        return promises[path]
    }
    promises[path] = fetch(path)
    .then((response) => {
        if (!response.ok) {
            throw new Error(response.statusText)
        }
        return response.text()
    }).then(text => {
        return text
    })
    return promises[path]
}