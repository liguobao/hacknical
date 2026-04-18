import config from 'config'
import iconv from 'iconv-lite'
import logger from './logger'
import getSignature from './signature'
import { REQUEST_JSON_METHODS } from './constant'
import NewError from './error'
import { mockRequest, MOCK_MISS } from '../services/mock'

const name = config.get('appName')
const mockEnabled = config.has('mock') && config.get('mock')

const buildQueryString = (qs) => {
  if (!qs) return ''
  if (typeof qs === 'string') return qs
  const params = new URLSearchParams()
  Object.entries(qs).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    params.append(key, String(value))
  })
  return params.toString()
}

const appendQueryString = (url, qs) => {
  const queryString = buildQueryString(qs)
  if (!queryString) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${queryString}`
}

const verify = (options = {}, appName = name) => {
  const { json = true } = options

  if (!options.headers) options.headers = {}
  const { body } = options
  const date = new Date().toString()
  options.headers.Date = date
  options.headers['X-App-Name'] = appName
  options.json = json

  try {
    const auth = config.get(`services.${options.source}.auth`)
    delete options.source
    let contentType = ''
    if (REQUEST_JSON_METHODS.find(method => method === options.method)) {
      contentType = 'application/json'
      options.headers['Content-Type'] = contentType
    }

    if (auth && auth.secretKey && auth.publicKey) {
      const { secretKey, publicKey } = auth
      const signature = getSignature({
        ...options,
        date,
        secretKey,
        contentType,
        body: body ? JSON.stringify(body) : ''
      })
      options.headers.Authorization = `Bearer ${publicKey}:${signature}`
    }
  } catch (e) {
    logger.error(e.stack || e)
  }
}

const fetchData = async (options) => {
  const {
    url,
    method = 'GET',
    headers = {},
    body,
    json = true,
    qs,
    timeout,
    encoding
  } = options

  const targetUrl = appendQueryString(url, qs)

  const init = {
    method: method.toUpperCase(),
    headers: { ...headers }
  }

  if (body !== undefined && body !== null) {
    if (Buffer.isBuffer(body) || typeof body === 'string') {
      init.body = body
    } else if (json) {
      init.body = JSON.stringify(body)
      if (!init.headers['Content-Type']) {
        init.headers['Content-Type'] = 'application/json'
      }
    } else {
      init.body = body
    }
  }

  let timer
  if (timeout) {
    const controller = new AbortController()
    init.signal = controller.signal
    timer = setTimeout(() => controller.abort(), timeout)
  }

  try {
    const response = await fetch(targetUrl, init)

    if (encoding === null) {
      const arrayBuffer = await response.arrayBuffer()
      return iconv.decode(Buffer.from(arrayBuffer), 'gbk')
    }

    const text = await response.text()

    if (json) {
      if (!text) {
        throw new NewError.ServerError(
          `Empty response when fetch: ${JSON.stringify(options)}`
        )
      }
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch (e) {
        throw new NewError.ServerError(
          `Invalid JSON response when fetch: ${JSON.stringify(options)} - ${text}`
        )
      }
      return parsed.result || parsed
    }

    return text
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const fetchWithRetry = async (options, timeouts = [2000]) => {
  if (mockEnabled) {
    const mocked = mockRequest(options)
    if (mocked !== MOCK_MISS) {
      logger.info(`[FETCH:MOCK] ${options.source} ${options.method || 'GET'} ${options.url}`)
      return mocked
    }
    logger.info(`[FETCH:MOCK-MISS] ${options.source} ${options.method || 'GET'} ${options.url}`)
  }

  verify(options)

  let err = null
  for (let i = 0; i < timeouts.length; i += 1) {
    try {
      const time = timeouts[i]
      if (time) {
        options.timeout = time
      }
      logger.info(`[FETCH:START] ${JSON.stringify(options)}`)
      const result = await fetchData(options)
      err = null
      return result
    } catch (e) {
      err = e
    }
  }
  if (err) {
    throw new NewError.ServerError(`${JSON.stringify(options)} - ${err.message} - ${err.stack}`)
  }
}

const handler = {
  get: (_, method) => {
    return (...args) => {
      const [options, timeouts] = args
      options.method = method.toUpperCase()
      return fetchWithRetry(options, timeouts)
    }
  }
}

const proxy = new Proxy({}, handler)
export default proxy
