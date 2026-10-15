import config from 'config'

export const CALLBACK_PATH = '/api/user/login/google/callback'

export const getSettings = () => {
  let oauth = {}
  try {
    oauth = config.get('google.oauth') || {}
  } catch (e) {
    oauth = {}
  }

  const appUrl = config.get('url') || (process.env.NODE_ENV !== 'production' ? 'http://localhost:4000' : '')
  const clientId = oauth.clientId || process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.DSH_GOOGLE_OAUTH_CLIENT_ID || ''
  const clientSecret = oauth.clientSecret || process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.DSH_GOOGLE_OAUTH_CLIENT_SECRET || ''
  const redirectUri = oauth.redirectUri
    || process.env.GOOGLE_OAUTH_REDIRECT_URI
    || (appUrl ? new URL(CALLBACK_PATH, appUrl).href : '')
  const proxyUrl = oauth.proxyUrl || process.env.GOOGLE_OAUTH_PROXY_URL || process.env.DSH_GOOGLE_OAUTH_PROXY_URL || ''
  const authorizeUrl = oauth.authorizeUrl
    || process.env.GOOGLE_OAUTH_AUTHORIZE_URL
    || 'https://accounts.google.com/o/oauth2/v2/auth'
  const tokenUrl = oauth.tokenUrl
    || process.env.GOOGLE_OAUTH_TOKEN_URL
    || 'https://oauth2.googleapis.com/token'
  const userInfoUrl = oauth.userInfoUrl
    || process.env.GOOGLE_OAUTH_USER_INFO_URL
    || 'https://openidconnect.googleapis.com/v1/userinfo'

  return {
    clientId,
    clientSecret,
    redirectUri,
    proxyUrl,
    authorizeUrl,
    tokenUrl,
    userInfoUrl
  }
}

export const isConfigured = () => {
  const { clientId, clientSecret, redirectUri } = getSettings()
  if (!clientId || !clientSecret || !redirectUri) return false
  try {
    const uri = new URL(redirectUri)
    return process.env.NODE_ENV === 'production' ? uri.protocol === 'https:' : /^https?:$/.test(uri.protocol)
  } catch (error) {
    return false
  }
}

export const authorizationUrl = state => {
  const { clientId, redirectUri, authorizeUrl } = getSettings()
  const url = new URL(authorizeUrl)
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state
  }).toString()
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
    throw new Error(`Google OAuth response returned non-JSON (${response.status})`)
  }
  if (!response.ok) {
    const errMsg = (data && (data.error_description || data.error || data.message)) || `status ${response.status}`
    throw new Error(`Google OAuth request failed: ${errMsg}`)
  }
  return data
}

export const exchangeCode = async code => {
  if (!isConfigured() || typeof code !== 'string' || !code || code.startsWith('local:')) {
    throw new Error('Google OAuth is not configured or authorization code is invalid')
  }

  const { clientId, clientSecret, redirectUri, tokenUrl, userInfoUrl } = getSettings()
  const tokenPayload = await requestJson(tokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  })

  const accessToken = tokenPayload.access_token
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('Google omitted the access token')
  }

  const userPayload = await requestJson(userInfoUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  })

  const sub = userPayload.sub
  if (!sub || typeof sub !== 'string' || sub.length > 128) {
    throw new Error('Google omitted a valid subject')
  }

  const email = userPayload.email || ''
  if (userPayload.email_verified !== true || !email) {
    throw new Error('Google email is not verified')
  }

  const profile = {
    open_id: sub,
    account: `google-${sub}`,
    email,
    name: userPayload.name || email,
    avatar_url: userPayload.picture || null
  }

  const expiresIn = Number(tokenPayload.expires_in)
  const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0
    ? Date.now() + expiresIn * 1000
    : null

  return {
    accessToken,
    refreshToken: tokenPayload.refresh_token || null,
    expiresAt,
    profile
  }
}
