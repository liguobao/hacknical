
import logger from '../utils/logger'
import { redactDownloadToken, safeQuery } from '../utils/redact-request'

export const isTargetRequest = (ctx, whiteList) => {
  const method = ctx.request.method.toUpperCase()
  const { url } = ctx.request
  const checked = whiteList.some(option => option.method === method && option.url.test(url))
  if (checked) logger.info(`[WHITELIST][method:${method}] ${redactDownloadToken(url)}`)
  return checked
}

const loggerMiddleware = (options = {}) => async (ctx, next) => {
  const { whiteList = [] } = options
  const checkWhite = await isTargetRequest(ctx, whiteList)
  if (checkWhite) return await next()

  const url = ctx.request.URL
  const { pathname } = url
  const {
    device,
    browser,
    platform
  } = ctx.state

  logger.info(
    [
      `[PATH] ${pathname}`,
      `[METHOD] ${ctx.request.method}`,
      `[IP] ${ctx.request.ip}`,
      `[${device.toUpperCase()}] ${browser}:${platform}`,
      `[QUERY] ${JSON.stringify(safeQuery(ctx.query))}`
    ].join('\n')
  )
  await next()
}

export default loggerMiddleware
