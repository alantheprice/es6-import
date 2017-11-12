const http = require("http");
const fs = require("fs");
const path = require("path");

const DEFAULT_PORT = 3000;
var port = DEFAULT_PORT;

process.argv.forEach(function (val, index, array) {
  // First two arguments will be node and this file path.
  if (index > 1) {
    console.log(index + ': ' + val);
    port = parseInt(val);
  }
});

const mimeTypes = {
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpg",
    ".wav": "audio/wav"
};

http.createServer(function (request, response) {
    console.log(["Url:", request.url].join(" "));
    console.log(__dirname);

    // only add a dot to the current path if it is not already added.
    var filePath = (request.url.indexOf(".") === 0) ? request.url : "." + request.url;

    var extname = path.extname(filePath);
    var contentType = mimeTypes[extname] || "text/html";

    fs.readFile(filePath, function(error, content) {
        if (error) {
            if(error.code == "ENOENT"){
                response.writeHead(404, "File not found");
                response.end();
            }
            else {
                response.writeHead(500);
                response.end("Sorry, check with the site admin for error: " + error.code + " ..\n");
            }
        }
        else {
            response.writeHead(200, { "Content-Type": contentType });
            response.end(content, "utf-8");
        }
    });

}).listen(port);

console.log(["Server running at http://127.0.0.1:", port, "/"].join(""));
