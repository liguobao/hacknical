const path = require('path')
const postcssPresetEnv = require('postcss-preset-env')
const PATH = require('../../config/path')
const styleVariables = require(path.resolve(PATH.SOURCE_PATH, 'src/styles/variables'))

module.exports = {
  plugins: [
    postcssPresetEnv({
      stage: 3,
      importFrom: [{ customProperties: styleVariables }],
      autoprefixer: {
        overrideBrowserslist: ['ie >= 9']
      },
      features: {
        'custom-properties': {
          disableDeprecationNotice: true,
          preserve: false
        }
      }
    })
  ]
}
