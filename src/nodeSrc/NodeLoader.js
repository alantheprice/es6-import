const fs = require('fs')
let downloaded = []

function readFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err) {
                reject(err)
                return
            }
            resolve(data)
        })
    })
}

module.exports.load = loadFile

function loadFile(path) {
    if (downloaded[path]) {
        return Promise.resolve(downloaded[path])
    }
    return readFile(path)
    .then(text => {
        downloaded[path] = text
        return text
    })
}