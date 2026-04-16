
import fs from 'fs'
import path from 'path'
import config from 'config'
import puppeteer from 'puppeteer-core'
import PATH from '../../config/path'
import logger from '../utils/logger'
import { ensureFolder } from '../utils/files'
import { uploadFile } from '../utils/uploader'

const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'

const launchBrowser = () => puppeteer.launch({
  executablePath: CHROMIUM_PATH,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage'
  ]
})

const renderPdf = async ({ input, output, pageConfig = {} }) => {
  const browser = await launchBrowser()

  try {
    const page = await browser.newPage()

    if (pageConfig.pageStyle === 'onePage') {
      await page.setViewport({ width: 1024, height: 600 })
    }

    await page.goto(input, { waitUntil: 'networkidle0', timeout: 60000 })
    // 等前端渲染完成（与原 phantom 行为一致：window.done 为 true）
    await page.waitForFunction('window.done === true', { timeout: 60000 })

    const pdfOptions = pageConfig.pageStyle === 'onePage'
      ? {
        path: output,
        width: '1024px',
        height: '600px',
        printBackground: true
      }
      : {
        path: output,
        format: 'A4',
        printBackground: true,
        margin: { top: '1cm', bottom: '1cm' }
      }

    await page.pdf(pdfOptions)
  } catch (e) {
    logger.error(e.stack || e)
  } finally {
    await browser.close()
  }
}

const ensureDownloadFolder = (folder) => {
  const resultFolder = path.resolve(__dirname, `${PATH.ASSETS_PATH}/downloads`, folder)
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

  if (fs.existsSync(filePath)) {
    logger.info(`[RESUME:DOWNLOAD:RENDER-PATH:EXIST] ${filePath} -> ${resultPath}`)
    return resultPath
  }

  await renderPdf({
    input: url,
    output: filePath,
    pageConfig: {
      pageStyle
    }
  })
  uploadFile({
    filePath,
    prefix: `${config.get('services.oss.prefix')}/${folderName}`
  })
  return resultPath
}
