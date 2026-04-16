/* eslint global-require: "off" */

import path from 'path'
import fs from 'fs'
import PATH from '../../config/path'
import logger from '../utils/logger'

let manifest = {}
const manifestPathList = [
  path.resolve(PATH.BUILD_PATH, 'webpack-assets.json'),
  path.resolve(__dirname, '../config', 'webpack-assets.json')
]

const manifestPath = manifestPathList.find(filePath => fs.existsSync(filePath))

if (manifestPath) {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
}

const getAssetName = asset => manifest[asset]

const assetsMiddleware = (assetsName) => {
  const finalName = assetsName.split('/').slice(-1)[0]
  const directAsset = getAssetName(finalName) || getAssetName(assetsName)

  if (typeof directAsset === 'string') {
    logger.info(`[ASSETS] ${directAsset}`)
    return directAsset
  }

  const sections = finalName.split('.')
  // So file base name should not has dot
  const name = sections[0]
  const type = sections.slice(-1)[0]
  const publicAsset = getAssetName(name)

  let result = ''
  if (!publicAsset || !publicAsset[type]) {
    result = `${PATH.CDN_URL}/${assetsName}`
  } else {
    result = publicAsset[type]
  }
  logger.info(`[ASSETS] ${result}`)
  return result
}

export default assetsMiddleware
