# A client side importer that provides most of the functionality of es6 imports.

Welcome to es6-import, a small library for using es6 imports without the need for a server-side transpiler.

The core goal here is to allow fast iterative development using all es6(next) syntax that is supported by the major browsers.  Browsers have been constantly improving their ECMA-script support to the point that we now can write es-next javascript with few pain points. But, one of the main missing pieces has been imports and exports.  To solve this and other missing features, most projects use server-side transpilers.  There are great advantages to server side packaging for production code (treeshaking etc), for working with typescript, or jsx and for allowing imports and exports. 

But what if I just want to hack out a simple proof of concept without the extra overhead of packaging? But why not just code in es6 with imports without server-side transpilation?  Give it a try and feel how rewarding it it is to just write code without worrying about transpilation.

### Usage: 

1. Install: 
`npm install es6-import`
2. in your main html page add a script tag like the following: 
`<script src="node_modules/es6-import/importer.js" import="./appStartScript.js"></script>` 


#### Q&A:
1. Should I use this in production? **No** -- there are many optimizations that happen with server side transpilers that are optimized for serving production code. The goal of this project is not to compete with them, but rather to allow quick development against modern browsers with minimial overhead.
2. Does this support typescript?  **No** -- But if you really want to give typescript a try, just write javascript in the most recent version of [vscode](https://code.visualstudio.com/) and enable [typescript evaluation of javascript](https://code.visualstudio.com/updates/v1_12#_typescript-23)
3. Does this support jsx? **No** -- some miracles are out of scope (the same pattern used here for imports could potentially be used for other types of transpilation, but at some point, you probably should just use a traditional transpiler.  But, if you want to submit a pull request, go for it!).

#### Changelog:

1.2.1: Updated the importer to support imports without a semi-colon at the end.
