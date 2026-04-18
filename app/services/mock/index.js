/* eslint no-unused-vars: "off" */
import config from 'config'
import fixtures from './fixtures'

export const MOCK_MISS = Symbol('mock-miss')

const stripBase = (source, fullUrl) => {
  if (!fullUrl) return ''
  try {
    const service = config.get(`services.${source}`)
    const base = service && service.url
    if (base && fullUrl.startsWith(base)) return fullUrl.slice(base.length) || '/'
  } catch (e) { /* ignore */ }
  const idx = fullUrl.indexOf('/api')
  if (idx !== -1) return fullUrl.slice(idx + 4) || '/'
  return fullUrl
}

const matchRoute = (source, fullUrl, method) => {
  const table = fixtures[source]
  if (!table) return MOCK_MISS

  const url = stripBase(source, fullUrl).split('?')[0]
  const normalized = method ? method.toLowerCase() : 'get'
  for (const route of table) {
    if (route.method && route.method.toLowerCase() !== normalized) continue
    if (typeof route.match === 'function') {
      const params = route.match(url)
      if (params) return typeof route.data === 'function' ? route.data(params) : route.data
    } else if (route.match instanceof RegExp) {
      const m = route.match.exec(url)
      if (m) return typeof route.data === 'function' ? route.data(m) : route.data
    } else if (route.match === url) {
      return typeof route.data === 'function' ? route.data() : route.data
    }
  }
  return MOCK_MISS
}

export const mockRequest = (options) => {
  const { source, url, method } = options
  if (!source) return MOCK_MISS
  return matchRoute(source, url || '', method)
}

export default mockRequest
