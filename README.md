# A client side importer that provides much of the functionality of es6 imports.

Welcome to es6-import, a small library for using es6 imports without the need for a server-side transpiler. NEW: added support for .vue files.

The core goal here is to allow fast iterative development using all es6(next) syntax that is supported by the major browsers.  Browsers have been constantly improving their ECMA-script support to the point that we now can write es-next javascript with few pain points. But, one of the main missing pieces has been imports and exports.  To solve this and other missing features, most projects use server-side transpilers.  There are great advantages to server side packaging for production code (treeshaking etc), for working with typescript, or jsx and for allowing imports and exports. 

But what if I just want to hack out a simple proof of concept without the extra overhead of packaging? But why not just code in es6 with imports without server-side transpilation?  Give it a try and feel how rewarding it it is to just write code without worrying about transpilation.

Other uses could be to create a fully in-browser editor with some level of transpilation without the need for any external tooling.

### Usage

**Option 1:** 
* In your main html page add a script tag like the following: 
 `<script src="https://unpkg.com/es6-import" import="./appStartScript.js"></script>`

**Option 2:**
* Install: `npm install es6-import`
* in your main html page add a script tag like the following: 
`<script src="node_modules/es6-import/importer.js" import="./appStartScript.js"></script>`

**Things to keep in mind:**
* For imports to work, you will need to include the extension in the import like: `import jsModule from './src/jsModule.js'`
* Beta: To allow usage of npm-modules, add the attribute 'npm-modules' to the script loading tag.  The npm-modules attribute should be an array of strings in valid JSON format, with each value in the string being a needed npm-module.  So, if you were importing a fetch polyfil in your code like `import _fetchPolyfill from 'whatwg-fetch'`, you will need to add `npm-modules='["whatwg-fetch"]'` attribute to the loading script tag. By default there is only already allowed npm module: `vue`.
* Debugging: sometimes it is helpful to debug a script to find out what is not working correctly.  To enable the debug flag, simply add a `debug="true"` attribute to the loading script tag.  Currently the debug flag simply outputs the import dependancy map to help in troubleshooting.

#### Q&A:
1. Should I use this in production? **Probably Not** -- there are many optimizations that happen with server side transpilers that are optimized for serving production code. The goal of this project is not to compete with them, but rather to allow quick development against modern browsers with minimial overhead.
2. Does this support typescript?  **No** -- But if you really want to give typescript a try, just write javascript in the most recent version of [vscode](https://code.visualstudio.com/) and enable [typescript evaluation of javascript](https://code.visualstudio.com/updates/v1_12#_typescript-23)
3. Does this support jsx? **No** -- some miracles are out of scope (the same pattern used here for imports could potentially be used for other types of transpilation, but at some point, you probably should just use a traditional transpiler.  But, if you want to submit a pull request, go for it!).

#### Changelog:
* 1.6.3: removed all minification to make it easier to read code.
* 1.6.[1-2]: Removed user notification, and optimized storage
* 1.6.0: Updated caching pattern to notify on new versions for fully cached.
* 1.5.0: Added Caching
* 1.4.[11-13]: Fixed an issue with the vue pipeline.
* 1.4.10: Set a default domain to give support for projects that are not served from the root directory of a webserver.
* 1.4.9: Made vue suppeort slightly more robust with greater syntax compatibility.
* 1.4.[3-6]: Default to compiling all scripts into a single file.
* 1.4.[0-2]: Moved to seperated files compiled with webpack and fixed bug with complex dependency trees not being loaded in the correct order.
* 1.3.[3-4]: Added support for underscores in import variables.
* 1.3.0: Added support for `.vue` files, but extensions on all import file types are still needed.
* 1.2.1: Updated the importer to support imports without a semi-colon at the end.
