import fs from 'fs'
import path from 'path'
import { downloadsRoot } from '../utils/download-path'

const downloadsMiddleware = () => async (ctx, next) => {
  let requestPath
  try {
    requestPath = decodeURIComponent(ctx.path)
  } catch (err) {
    ctx.status = 404
    return
  }
  if (requestPath !== '/downloads' && !requestPath.startsWith('/downloads/')) return next()

  ctx.set('Cache-Control', 'private, no-store')
  const match = /^\/downloads\/([A-Za-z0-9-]+)\/([A-Za-z0-9-]+)\/([^/\\]+\.pdf)$/.exec(requestPath)
  if (!match || ctx.method !== 'GET' || String(ctx.session.userId) !== match[1]) {
    ctx.status = 404
    return
  }

  const [, , login, filename] = match
  if (filename === '..' || filename.includes('..')) {
    ctx.status = 404
    return
  }

  const filePath = path.resolve(downloadsRoot, match[1], login, filename)
  try {
    const root = await fs.promises.realpath(downloadsRoot)
    const actual = await fs.promises.realpath(filePath)
    if (!actual.startsWith(`${root}${path.sep}`) || !(await fs.promises.stat(actual)).isFile()) {
      ctx.status = 404
      return
    }
    ctx.type = 'application/pdf'
    ctx.attachment(filename)
    ctx.body = fs.createReadStream(actual)
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
    ctx.status = 404
  }
}

export default downloadsMiddleware
