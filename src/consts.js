const EXPORT_REGEX_PATTERN = '(?:^|\n)\s*export [a-zA-Z_]* [a-zA-Z1-9_]*'
const IMPORT_REGEX = /(?:^|\n)\s*import ([{}a-zA-Z1-9,_\s]*) from ['|"].*['|"]/g
const DEFAULT_SUPPORTED_MODULES = ['vue']
const DEFAULT_NAME = '_default'
const SCRIPT_TAG = 'script'

export default {
    EXPORT_REGEX_PATTERN: EXPORT_REGEX_PATTERN,
    IMPORT_REGEX: IMPORT_REGEX,
    DEFAULT_SUPPORTED_MODULES: DEFAULT_SUPPORTED_MODULES,
    DEFAULT_NAME: DEFAULT_NAME,
    SCRIPT_TAG: SCRIPT_TAG
}
