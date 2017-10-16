let downloaded = []

export default {
    load: loadFile
}

function loadFile(path) {
    if (downloaded[path]) {
        return Promise.resolve(downloaded[path])
    }
    // TODO: eventually we can do some optimization to ensure that we only request a file once here and allow multiple synchronous requests
    return fetch(path)
    .then((response) => {
        if (!response.ok) {
            throw new Error(response.statusText)
        }
        return response.text()
    }).then(text => {
        downloaded[path] = text
        return text
    })
}