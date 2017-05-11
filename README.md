# A client side importer that may eventually provide much of the functionality of es6 imports.

The core goal here is to allow fast iterative development using all es6(next) syntax that is supported by the majoy browsers.  One of the main missing pieces has been imports and exports.  Every project I have found fixes this issue on the server side with packaging, optimization, treeshaking, concatenation etc. But why not just code in es6 with imports without server-side transpilation?  


### Usage: 

1. Install: 
`npm install es6-import`
2. in your main html page add a script tag like the following: 
`<script src="node_modules/es6-import/importer.js" import="./appStartScript.js"></script>` 


#### Q&A:
1. Should I use this in production: **NO** -- there are many optimizations that happen with server side transpilers that are optimized for serving production code, and the goal of this project is not to compete with them, but rather just allow quick development against modern browsers with minimial overhead.
