
import fs from 'fs'
import path from 'path'
import config from 'config'
import PATH from '../../config/path'
import logger from '../utils/logger'
import { ensureFolder } from '../utils/files'
import { uploadFile } from '../utils/uploader'
import { renderUrlToPdf } from '../utils/chrome-pdf'

const ensureDownloadFolder = (folder) => {
  const resultFolder = path.resolve(PATH.ASSETS_PATH, 'downloads', folder)
  ensureFolder(resultFolder)
  return resultFolder
}

export const downloadResume = async (url, options = {}) => {
  const {
    title,
    folderName,
    pageStyle
  } = options

  const resultFolder = ensureDownloadFolder(folderName)
  const filePath = path.resolve(resultFolder, title)
  const resultPath = `/downloads/${folderName}/${title}`

  logger.info(`[RESUME:DOWNLOAD:RENDER-PATH] ${filePath}`)
  logger.info(`[RESUME:DOWNLOAD:RENDER-URL] ${url}`)

  if (fs.existsSync(filePath)) {
    const existing = fs.statSync(filePath)
    if (existing.isFile() && existing.size > 100) {
      logger.info(`[RESUME:DOWNLOAD:RENDER-PATH:EXIST] ${filePath} -> ${resultPath}`)
      return resultPath
    }
    fs.unlinkSync(filePath)
  }

  await renderUrlToPdf({
    input: url,
    output: filePath,
    pageStyle
  })

  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 100) {
    throw new Error(`PDF render produced no usable file at ${filePath}`)
  }

  uploadFile({
    filePath,
    prefix: `${config.get('services.oss.prefix')}/${folderName}`
  })
  return resultPath
}
