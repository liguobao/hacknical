
import fs from 'fs'
import path from 'path'
import phantom from 'phantom'
import { downloadsRoot } from '../utils/download-path'
import { redactDownloadToken } from '../utils/redact-request'
import logger from '../utils/logger'
import { ensureFolder } from '../utils/files'

const waitUntil = asyncFunc => new Promise((resolve, reject) => {
  const wait = () => {
    asyncFunc().then((value) => {
      if (value === true) {
        resolve()
      } else {
        setTimeout(wait, 100)
      }
    }).catch(reject)
  }
  wait()
})

const renderScreenshot = async ({ input, output, pageConfig = {} }) => {
  const instance = await phantom.create()

  try {
    const page = await instance.createPage()

    if (pageConfig.pageStyle === 'onePage') {
      await page.property('viewportSize', { width: 1024, height: 600 })
    } else {
      await page.property('paperSize', {
        width: 1024,
        height: 1448,
        format: 'A4',
        margin: {
          top: '1cm',
          bottom: '1cm',
        },
        orientation: 'portrait'
      })
    }

    await page.open(input)
    await waitUntil(() => page.evaluate(() => window.done))
    await page.render(output)
  } catch (e) {
    logger.error(redactDownloadToken(e.stack || e))
  } finally {
    await instance.exit()
  }
}

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

  if (fs.existsSync(filePath)) {
    logger.info(`[RESUME:DOWNLOAD:RENDER-PATH:EXIST] ${filePath} -> ${resultPath}`)
    return resultPath
  }

  await renderScreenshot({
    input: url,
    output: filePath,
    pageConfig: {
      pageStyle
    }
  })
  if (!fs.existsSync(filePath)) throw new Error('PDF render failed')
  return resultPath
}
