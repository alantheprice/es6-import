const EXPORT_REGEX_PATTERN = /(?:^|\n)\s*export\s+[a-zA-Z_]*\s+[a-zA-Z1-9_]*/g
const IMPORT_REGEX = /(?:^|\n)\s*import\s+([{}a-zA-Z1-9,_\s]*)\s+from\s+['|"].*['|"]/g
const DEFAULT_SUPPORTED_MODULES = ['vue', 'whatwg-fetch']
const DEFAULT_NAME = '_default'
const SCRIPT_TAG = 'script'

export default {
    EXPORT_REGEX_PATTERN: EXPORT_REGEX_PATTERN,
    IMPORT_REGEX: IMPORT_REGEX,
    DEFAULT_SUPPORTED_MODULES: DEFAULT_SUPPORTED_MODULES,
    DEFAULT_NAME: DEFAULT_NAME,
    SCRIPT_TAG: SCRIPT_TAG
}
