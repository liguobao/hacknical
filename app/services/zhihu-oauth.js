import config from 'config'
import crypto from 'node:crypto'

export const CALLBACK_PATH = '/api/user/login/zhihu/callback'

export const getSettings = () => {
  let oauth = {}
  try {
    oauth = config.get('zhihu.oauth') || {}
  } catch (e) {
    oauth = {}
  }

  const appUrl = config.get('url') || (process.env.NODE_ENV !== 'production' ? 'http://localhost:4000' : '')
  const appId = oauth.appId || process.env.ZHIHU_OAUTH_APP_ID || process.env.DSH_ZHIHU_OAUTH_APP_ID || ''
  const appKey = oauth.appKey || process.env.ZHIHU_OAUTH_APP_KEY || process.env.DSH_ZHIHU_OAUTH_APP_KEY || ''
  const redirectUri = oauth.redirectUri
    || process.env.ZHIHU_OAUTH_REDIRECT_URI
    || (appUrl ? new URL(CALLBACK_PATH, appUrl).href : '')
  const authorizeUrl = oauth.authorizeUrl
    || process.env.ZHIHU_OAUTH_AUTHORIZE_URL
    || process.env.DSH_ZHIHU_OAUTH_AUTHORIZE_URL
    || 'https://openapi.zhihu.com/authorize'
  const accessTokenUrl = oauth.accessTokenUrl
    || process.env.ZHIHU_OAUTH_ACCESS_TOKEN_URL
    || process.env.DSH_ZHIHU_OAUTH_ACCESS_TOKEN_URL
    || 'https://openapi.zhihu.com/access_token'
  const meUrl = oauth.meUrl
    || process.env.ZHIHU_OAUTH_ME_URL
    || process.env.DSH_ZHIHU_OAUTH_ME_URL
    || 'https://openapi.zhihu.com/user'
  const scope = oauth.scope || process.env.ZHIHU_OAUTH_SCOPE || process.env.DSH_ZHIHU_OAUTH_SCOPE || ''

  return {
    appId,
    appKey,
    redirectUri,
    authorizeUrl,
    accessTokenUrl,
    meUrl,
    scope
  }
}

export const isConfigured = () => {
  const { appId, appKey, redirectUri } = getSettings()
  if (!appId || !appKey || !redirectUri) return false
  try {
    const uri = new URL(redirectUri)
    return process.env.NODE_ENV === 'production' ? uri.protocol === 'https:' : /^https?:$/.test(uri.protocol)
  } catch (error) {
    return false
  }
}

export const authorizationUrl = state => {
  const { appId, redirectUri, authorizeUrl, scope } = getSettings()
  const url = new URL(authorizeUrl)
  const params = {
    response_type: 'code',
    app_id: appId,
    redirect_uri: redirectUri,
    state
  }
  if (scope && scope.trim()) {
    params.scope = scope.trim()
  }
  url.search = new URLSearchParams(params).toString()
  return url.href
}

const requestJson = async (url, options) => {
  const response = await fetch(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(15000)
  })
  let data
  try {
    data = await response.json()
  } catch (err) {
    throw new Error(`Zhihu OAuth response returned non-JSON (${response.status})`)
  }
  if (!response.ok) {
    const errMsg = (data && (data.error_description || data.error || data.message || data.msg)) || `status ${response.status}`
    throw new Error(`Zhihu OAuth request failed: ${errMsg}`)
  }
  return data
}

const extractPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return {}
  for (const key of ['data', 'payload', 'result']) {
    if (payload[key] && typeof payload[key] === 'object' && !Array.isArray(payload[key])) {
      return payload[key]
    }
  }
  return payload
}

const firstStr = (candidates, ...keys) => {
  for (const item of candidates) {
    if (!item || typeof item !== 'object') continue
    for (const key of keys) {
      const val = item[key]
      if (val !== undefined && val !== null) {
        const text = String(val).trim()
        if (text) return text
      }
    }
  }
  return null
}

const buildProfile = (extracted, tokenPayload, profilePayload, accessToken) => {
  const candidates = []
  if (profilePayload && typeof profilePayload === 'object') {
    candidates.push(profilePayload)
  }
  candidates.push(extracted, tokenPayload)

  let openId = firstStr(
    candidates,
    'open_id', 'openid', 'openId', 'hash_id', 'hashId',
    'user_id', 'userId', 'uid', 'id', 'sub'
  )
  if (!openId) {
    openId = `zhihu-${crypto.createHash('sha256').update(accessToken).digest('hex').slice(0, 24)}`
  }

  const account = firstStr(
    candidates,
    'account', 'url_token', 'urlToken', 'hash_id', 'hashId',
    'username', 'slug'
  ) || `uid-${openId}`

  const name = firstStr(
    candidates,
    'name', 'fullname', 'username', 'full_name', 'screen_name', 'nickname'
  ) || account

  const headline = firstStr(
    candidates,
    'headline', 'description', 'bio', 'tagline', 'business'
  ) || '知乎账号'

  const avatarUrl = firstStr(
    candidates,
    'avatar_url', 'avatarUrl', 'avatar_path', 'avatarPath', 'avatar',
    'avatar_url_template', 'image_url'
  )

  return {
    open_id: openId,
    account,
    name,
    headline,
    avatar_url: avatarUrl || null
  }
}

export const exchangeCode = async code => {
  if (!isConfigured() || typeof code !== 'string' || !code || code.startsWith('local:')) {
    throw new Error('Zhihu OAuth is not configured or authorization code is invalid')
  }

  const { appId, appKey, redirectUri, accessTokenUrl, meUrl } = getSettings()
  const tokenPayload = await requestJson(accessTokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      app_id: appId,
      app_key: appKey,
      code,
      redirect_uri: redirectUri
    })
  })

  const extracted = extractPayload(tokenPayload)
  const codeVal = tokenPayload.code !== undefined ? String(tokenPayload.code).trim() : null
  if (codeVal && !['0', '200', '20000'].includes(codeVal)) {
    throw new Error(tokenPayload.message || tokenPayload.msg || 'Zhihu rejected authorization code')
  }

  const accessToken = firstStr([extracted, tokenPayload], 'access_token', 'accessToken', 'token')
  if (!accessToken) {
    throw new Error('Zhihu OAuth token response did not include access_token')
  }

  let profilePayload = null
  if (meUrl) {
    try {
      const meResponse = await requestJson(meUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })
      profilePayload = extractPayload(meResponse)
    } catch (err) {
      // meUrl is optional if token response contains profile data
      profilePayload = null
    }
  }

  const profile = buildProfile(extracted, tokenPayload, profilePayload, accessToken)
  const expiresIn = Number(firstStr([extracted, tokenPayload], 'expires_in', 'expiresIn'))
  const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0
    ? Date.now() + expiresIn * 1000
    : null

  return {
    accessToken,
    refreshToken: firstStr([extracted, tokenPayload], 'refresh_token', 'refreshToken'),
    expiresAt,
    profile
  }
}
