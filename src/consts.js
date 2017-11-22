const EXPORT_REGEX_PATTERN = /(?:^|\n)\s*export\s+[a-zA-Z_]*\s+[a-zA-Z1-9_]*/g
const IMPORT_REGEX = /(?:^|\n)\s*import\s+([{}a-zA-Z1-9,_\s]*)\s+from\s+['|"].*['|"]/g
const MODULE_VERSION_URL_REGEX = /[a-zA-Z0-9-]*@[0-9]*\.[0-9]*\.[0-9]*\.*/
const DEFAULT_SUPPORTED_MODULES = ['vue', 'whatwg-fetch']
const DEFAULT_NAME = '_default'
const SCRIPT_TAG = 'script'
const MODULE_URL = 'https://unpkg.com/'

export default {
    EXPORT_REGEX_PATTERN: EXPORT_REGEX_PATTERN,
    IMPORT_REGEX: IMPORT_REGEX,
    DEFAULT_SUPPORTED_MODULES: DEFAULT_SUPPORTED_MODULES,
    DEFAULT_NAME: DEFAULT_NAME,
    SCRIPT_TAG: SCRIPT_TAG,
    MODULE_URL: MODULE_URL,
    MODULE_VERSION_URL_REGEX: MODULE_VERSION_URL_REGEX
}
