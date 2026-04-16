const fs = require('fs')
const path = require('path')

const LIGHT_UI_SEGMENT = `${path.sep}node_modules${path.sep}light-ui${path.sep}`
const importRulePattern = /@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g

const fileCache = new Map()

const readFile = (filepath) => {
  if (!fileCache.has(filepath)) {
    try {
      fileCache.set(filepath, fs.readFileSync(filepath, 'utf8'))
    } catch (error) {
      fileCache.set(filepath, '')
    }
  }

  return fileCache.get(filepath)
}

const hasClassName = (content, className) => {
  const matcher = new RegExp(`\\.${className}(?:[\\s:{.#>+~]|$)`)
  return matcher.test(content)
}

module.exports = function lightUiComposeLoader(source) {
  if (!this.resourcePath.includes(LIGHT_UI_SEGMENT)) {
    return source
  }

  const imports = []
  let importMatch = importRulePattern.exec(source)

  while (importMatch) {
    imports.push({
      request: importMatch[1],
      filepath: path.resolve(path.dirname(this.resourcePath), importMatch[1])
    })
    importMatch = importRulePattern.exec(source)
  }

  return source.replace(/composes:\s*([^;]+);/g, (fullMatch, rawValue) => {
    const value = rawValue.trim()

    if (/\bfrom\b/.test(value)) {
      return fullMatch
    }

    const classNames = value.split(/\s+/).filter(Boolean)
    const matchedImport = imports.find(({ filepath }) => {
      const content = readFile(filepath)
      return classNames.every(className => hasClassName(content, className))
    })

    if (!matchedImport) {
      return fullMatch
    }

    return `composes: ${classNames.join(' ')} from '${matchedImport.request}';`
  })
}
