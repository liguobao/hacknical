
import fs from 'fs'
import path from 'path'
import logger from '../utils/logger'
import { ensureFolder } from '../utils/files'
import { renderUrlToPdf } from '../utils/chrome-pdf'
import { downloadsRoot } from '../utils/download-path'

const ensureDownloadFolder = (folder) => {
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9-]+$/.test(folder)) throw new Error('Invalid download folder')
  const resultFolder = path.resolve(downloadsRoot, folder)
  ensureFolder(resultFolder)
  return resultFolder
}

export const downloadResume = async (url, options = {}) => {
  const {
    title,
    folderName,
    pageStyle
  } = options

  if (!/^[A-Za-z0-9._-]+\.pdf$/.test(title) || title.includes('..')) {
    throw new Error('Invalid download filename')
  }

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
  return resultPath
}
