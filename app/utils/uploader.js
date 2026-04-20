
import fs from 'fs'
import path from 'path'
import config from 'config'
import oss from 'ali-oss'
import logger from './logger'

const g = (key, defaultValue) => process.env[key] || defaultValue || ''
const mockEnabled = config.has('mock') && config.get('mock')
const ossConfig = config.get('services.oss')
const accessKeyId = g('HACKNICAL_ALI_ACCESS_ID')
const accessKeySecret = g('HACKNICAL_ALI_ACCESS_KEY')
const hasCredentials = Boolean(accessKeyId && accessKeySecret)

let store = null

const getStore = () => {
  if (store) {
    return store
  }

  if (!hasCredentials) {
    if (mockEnabled) {
      logger.warn('[OSS] Missing OSS credentials in mock mode, falling back to local URLs')
      return null
    }

    throw new Error('require HACKNICAL_ALI_ACCESS_ID and HACKNICAL_ALI_ACCESS_KEY')
  }

  store = oss({
    accessKeyId,
    accessKeySecret,
    bucket: ossConfig.bucket,
    region: ossConfig.region,
    internal: false
  })

  return store
}

const nextTick = (func, ...params) =>
  process.nextTick(async () => {
    if (!func) return

    try {
      await func(...params)
    } catch (e) {
      logger.error(e.stack || e)
    }
  })

export const uploadFile = ({ filePath, prefix = '' }) => {
  if (!fs.statSync(filePath).isFile()) return

  const filename = filePath.split('/').slice(-1)[0]
  const storePrefix = path.join(prefix, filename)
  const ossStore = getStore()

  logger.info(`[OSS:UPLOAD] ${filePath} -> ${storePrefix}`)
  if (!ossStore) {
    logger.warn(`[OSS:SKIP] ${storePrefix}`)
    return
  }

  nextTick(ossStore.put.bind(ossStore), storePrefix, filePath)
}

export const uploadFolder = ({ folderPath, prefix = '' }) => {
  if (!fs.statSync(folderPath).isDirectory()) {
    return uploadFile({ filePath: folderPath, prefix })
  }

  const pathes = fs.readdirSync(folderPath)
  for (const targetPath of pathes) {
    const target = path.resolve(folderPath, targetPath)
    uploadFolder({
      folderPath: target,
      prefix: `${prefix}/${targetPath}`
    })
  }
}

export const getUploadUrl = ({ filePath, expires = 60, mimeType }) =>
  (getStore()
    ? getStore().signatureUrl(filePath, {
      expires,
      method: 'PUT',
      'Content-Type': mimeType
    })
    : `${ossConfig.raw}${filePath}`)

export const getOssObjectUrl = ({ filePath, baseUrl = '' }) =>
  (getStore()
    ? getStore().generateObjectUrl(filePath, baseUrl)
    : `${baseUrl}${filePath}`)
