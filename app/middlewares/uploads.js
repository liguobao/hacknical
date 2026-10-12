import fs from 'fs'
import path from 'path'
import { getLocalUploadPath, isLocalStorage } from '../utils/uploader'

const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const UPLOAD_PATH = /^\/uploads\/([a-zA-Z0-9_-]{1,39})\/avator\/([a-f0-9-]{36})\.(jpg|jpeg|png)$/

const isImage = (data, extension) => {
  if (extension === 'png') {
    return data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  }
  return data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255
}

export default () => async (ctx, next) => {
  if (!isLocalStorage || ctx.method !== 'PUT' || !ctx.path.startsWith('/uploads/')) {
    return next()
  }

  const match = UPLOAD_PATH.exec(ctx.path)
  if (!ctx.session || !ctx.session.userId || !match || match[1] !== ctx.session.githubLogin) {
    ctx.status = 403
    ctx.body = { success: false, message: 'Upload is not allowed' }
    return
  }

  const extension = match[3]
  const contentType = ctx.get('Content-Type').split(';')[0].toLowerCase()
  const expectedType = extension === 'png' ? 'image/png' : 'image/jpeg'
  if (contentType !== expectedType && !(extension === 'jpg' && contentType === 'image/jpg')) {
    ctx.status = 415
    ctx.body = { success: false, message: 'Invalid image type' }
    return
  }

  const chunks = []
  let length = 0
  for await (const chunk of ctx.req) {
    length += chunk.length
    if (length > MAX_IMAGE_BYTES) {
      ctx.status = 413
      ctx.body = { success: false, message: 'Image is too large' }
      return
    }
    chunks.push(chunk)
  }

  const image = Buffer.concat(chunks, length)
  if (!isImage(image, extension)) {
    ctx.status = 415
    ctx.body = { success: false, message: 'Invalid image data' }
    return
  }

  const target = getLocalUploadPath(ctx.path.replace(/^\/uploads\//, ''))
  await fs.promises.mkdir(path.dirname(target), { recursive: true })
  try {
    await fs.promises.writeFile(target, image, { flag: 'wx', mode: 0o600 })
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    ctx.status = 409
    ctx.body = { success: false, message: 'Image already exists' }
    return
  }
  ctx.status = 200
  ctx.body = { success: true }
}
