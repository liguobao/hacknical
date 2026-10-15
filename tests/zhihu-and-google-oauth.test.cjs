const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const { spawn } = require('node:child_process')
const { once } = require('node:events')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite')

let provider, providerUrl, app, origin, temporary, database, output = ''
let zhihuProfileFailure = false
let googleProfileFailure = false

async function unusedPort() {
  const server = http.createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  return port
}

async function launch(options = {}) {
  const port = await unusedPort()
  origin = `http://127.0.0.1:${port}`
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    APP_URL: 'https://hackneo.cn',
    APP_KEY: 'a'.repeat(64),
    SQLITE_PATH: database,
    LOG_LEVEL: 'ERROR',
    GITHUB_API_URL: providerUrl,
    GITHUB_OAUTH_CLIENT_ID: 'test-github-client',
    GITHUB_OAUTH_CLIENT_SECRET: 'test-github-secret',
    GITHUB_OAUTH_REDIRECT_URI: 'https://hackneo.cn/api/user/login/github/callback',

    ZHIHU_OAUTH_APP_ID: options.zhihuConfigured ? 'test-zhihu-app-id' : '',
    ZHIHU_OAUTH_APP_KEY: options.zhihuConfigured ? 'test-zhihu-app-key' : '',
    ZHIHU_OAUTH_REDIRECT_URI: 'https://hackneo.cn/api/user/login/zhihu/callback',
    ZHIHU_OAUTH_AUTHORIZE_URL: `${providerUrl}/zhihu/authorize`,
    ZHIHU_OAUTH_ACCESS_TOKEN_URL: `${providerUrl}/zhihu/access_token`,
    ZHIHU_OAUTH_ME_URL: `${providerUrl}/zhihu/user`,

    GOOGLE_OAUTH_CLIENT_ID: options.googleConfigured ? 'test-google-client-id' : '',
    GOOGLE_OAUTH_CLIENT_SECRET: options.googleConfigured ? 'test-google-client-secret' : '',
    GOOGLE_OAUTH_REDIRECT_URI: 'https://hackneo.cn/api/user/login/google/callback',
    GOOGLE_OAUTH_AUTHORIZE_URL: `${providerUrl}/google/authorize`,
    GOOGLE_OAUTH_TOKEN_URL: `${providerUrl}/google/token`,
    GOOGLE_OAUTH_USER_INFO_URL: `${providerUrl}/google/userinfo`,

    NODE_CONFIG: JSON.stringify({
      github: { apiUrl: providerUrl, oauth: { baseUrl: providerUrl, clientId: '', clientSecret: '' } }
    })
  }

  output = ''
  app = spawn(process.execPath, ['dist/bin/app.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  app.stdout.on('data', data => { output += data })
  app.stderr.on('data', data => { output += data })

  for (let i = 0; i < 100; i += 1) {
    if (app.exitCode !== null) throw new Error(output)
    try {
      if ((await fetch(`${origin}/api/healthz`)).ok) return
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error(`Server did not start: ${output}`)
}

async function stop() {
  if (app && app.exitCode === null) {
    const done = once(app, 'exit')
    app.kill('SIGTERM')
    await done
  }
}

function browser() {
  const cookies = new Map()
  return {
    cookies,
    async get(url) {
      const response = await fetch(`${origin}${url}`, {
        redirect: 'manual',
        headers: {
          'X-Forwarded-Proto': 'https',
          Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; ')
        }
      })
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(';')[0]
        const at = pair.indexOf('=')
        cookies.set(pair.slice(0, at), pair.slice(at + 1))
      }
      return response
    }
  }
}

before(async () => {
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hacknical-oauth-test-'))
  database = path.join(temporary, 'test.sqlite')

  provider = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    const url = new URL(req.url, 'http://127.0.0.1')

    if (url.pathname === '/zhihu/access_token') {
      let body = ''
      for await (const chunk of req) body += chunk
      const params = new URLSearchParams(body)
      assert.equal(req.method, 'POST')
      assert.equal(params.get('grant_type'), 'authorization_code')
      assert.equal(params.get('app_id'), 'test-zhihu-app-id')
      assert.equal(params.get('app_key'), 'test-zhihu-app-key')
      assert.equal(params.get('redirect_uri'), 'https://hackneo.cn/api/user/login/zhihu/callback')

      const code = params.get('code')
      if (code === 'http-error') {
        res.statusCode = 502
        return res.end(JSON.stringify({ error: 'gateway_error' }))
      }
      if (code === 'denied') {
        return res.end(JSON.stringify({ code: '40001', message: 'invalid authorization code' }))
      }

      return res.end(JSON.stringify({
        code: 0,
        access_token: 'zhihu-access-token-12345',
        expires_in: 7200,
        token_type: 'bearer',
        data: {
          open_id: code === 'second-user' ? 'zh-open-id-2' : 'zh-open-id-1',
          account: code === 'second-user' ? 'zhihu_coder_2' : 'zhihu_coder',
          name: code === 'second-user' ? '知乎开发者乙' : '知乎开发者甲',
          headline: '代码写得好，下班走得早'
        }
      }))
    } else if (url.pathname === '/zhihu/user') {
      if (zhihuProfileFailure) {
        res.statusCode = 401
        return res.end(JSON.stringify({ error: 'unauthorized' }))
      }
      return res.end(JSON.stringify({
        open_id: 'zh-open-id-1',
        account: 'zhihu_coder',
        name: '知乎开发者甲',
        headline: '代码写得好，下班走得早',
        avatar_url: 'https://example.com/zhihu-avatar.jpg'
      }))
    } else if (url.pathname === '/google/token') {
      let body = ''
      for await (const chunk of req) body += chunk
      const params = new URLSearchParams(body)
      assert.equal(req.method, 'POST')
      assert.equal(params.get('grant_type'), 'authorization_code')
      assert.equal(params.get('client_id'), 'test-google-client-id')
      assert.equal(params.get('client_secret'), 'test-google-client-secret')
      assert.equal(params.get('redirect_uri'), 'https://hackneo.cn/api/user/login/google/callback')

      const code = params.get('code')
      if (code === 'http-error') {
        res.statusCode = 502
        return res.end(JSON.stringify({ error: 'gateway_error' }))
      }
      if (code === 'denied') {
        res.statusCode = 400
        return res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Bad code' }))
      }

      return res.end(JSON.stringify({
        access_token: 'google-access-token-67890',
        expires_in: 3600,
        token_type: 'Bearer'
      }))
    } else if (url.pathname === '/google/userinfo') {
      if (googleProfileFailure) {
        res.statusCode = 401
        return res.end(JSON.stringify({ error: 'unauthorized' }))
      }
      return res.end(JSON.stringify({
        sub: 'google-sub-999',
        email: 'developer@example.com',
        email_verified: true,
        name: 'Google Dev',
        picture: 'https://example.com/google-photo.png'
      }))
    }

    res.statusCode = 404
    res.end('{}')
  })

  provider.listen(0, '127.0.0.1')
  await once(provider, 'listening')
  providerUrl = `http://127.0.0.1:${provider.address().port}`
})

after(async () => {
  await stop()
  if (provider) await new Promise(resolve => provider.close(resolve))
  if (temporary) fs.rmSync(temporary, { recursive: true, force: true })
})

test('missing OAuth credentials returns 503 and reports correct status', async () => {
  await stop()
  await launch({ zhihuConfigured: false, googleConfigured: false })

  const client = browser()
  const statusRes = await client.get('/api/user/oauth/status')
  assert.equal(statusRes.status, 200)
  const statusData = await statusRes.json()
  assert.equal(statusData.success, true)
  assert.equal(statusData.result.zhihu, false)
  assert.equal(statusData.result.google, false)
  assert.equal(statusData.result.github, true)

  const zhihuRes = await client.get('/api/user/login/zhihu')
  assert.equal(zhihuRes.status, 503)
  const zhihuData = await zhihuRes.json()
  assert.equal(zhihuData.code, 'ZHIHU_OAUTH_UNAVAILABLE')

  const googleRes = await client.get('/api/user/login/google')
  assert.equal(googleRes.status, 503)
  const googleData = await googleRes.json()
  assert.equal(googleData.code, 'GOOGLE_OAUTH_UNAVAILABLE')
})

test('landing page renders Zhihu and Google login links', async () => {
  const client = browser()
  const response = await client.get('/')
  assert.equal(response.status, 200)
  const text = await response.text()
  assert.match(text, /window\.zhihuLoginLink = "\/api\/user\/login\/zhihu"/)
  assert.match(text, /window\.googleLoginLink = "\/api\/user\/login\/google"/)
})

test('Zhihu OAuth authorization and callback flow', async () => {
  await stop()
  await launch({ zhihuConfigured: true, googleConfigured: true })

  const client = browser()

  // 1. Start Zhihu login
  const startRes = await client.get('/api/user/login/zhihu')
  assert.equal(startRes.status, 302)
  const redirectUrl = new URL(startRes.headers.get('location'))
  assert.equal(redirectUrl.origin, providerUrl)
  assert.equal(redirectUrl.pathname, '/zhihu/authorize')
  assert.equal(redirectUrl.searchParams.get('response_type'), 'code')
  assert.equal(redirectUrl.searchParams.get('app_id'), 'test-zhihu-app-id')
  assert.equal(redirectUrl.searchParams.get('redirect_uri'), 'https://hackneo.cn/api/user/login/zhihu/callback')
  const state = redirectUrl.searchParams.get('state')
  assert.match(state, /^[a-f\d]{64}$/)

  // 2. Reject missing or invalid state
  assert.equal((await browser().get('/api/user/login/zhihu/callback?code=good')).status, 400)
  const invalidClient = browser()
  await invalidClient.get('/api/user/login/zhihu')
  assert.equal((await invalidClient.get(`/api/user/login/zhihu/callback?code=good&state=wrong`)).status, 400)

  // 3. Callback success
  const callbackRes = await client.get(`/api/user/login/zhihu/callback?code=good&state=${state}`)
  assert.equal(callbackRes.status, 302)
  const location = callbackRes.headers.get('location')
  assert.match(location, /^\/zhihu_coder/)

  // 4. Verify DB persistence
  const db = new DatabaseSync(database)
  const user = db.prepare("SELECT * FROM users WHERE auth_provider = 'zhihu'").get()
  assert.ok(user, 'User should be persisted')
  assert.equal(user.auth_provider, 'zhihu')
  assert.equal(user.initialed, 1)

  const identity = db.prepare("SELECT * FROM oauth_identities WHERE provider = 'zhihu' AND user_id = ?").get(user.user_id)
  assert.ok(identity, 'OAuth identity should be recorded')
  assert.equal(identity.provider_user_id, 'zh-open-id-1')

  const resume = db.prepare('SELECT * FROM resumes WHERE user_id = ?').get(user.user_id)
  assert.ok(resume, 'Resume should be created')
  assert.equal(resume.is_default, 1)
  db.close()

  // 5. User session works
  const infoRes = await client.get('/api/user/info')
  assert.equal(infoRes.status, 200)
  const info = await infoRes.json()
  assert.equal(info.success, true)
  assert.equal(info.result.authProvider, 'zhihu')
  assert.equal(info.result.userName, '知乎开发者甲')

  // 6. Secondary login with same Zhihu account logs in to the same user
  const client2 = browser()
  const startRes2 = await client2.get('/api/user/login/zhihu')
  const state2 = new URL(startRes2.headers.get('location')).searchParams.get('state')
  const callbackRes2 = await client2.get(`/api/user/login/zhihu/callback?code=good&state=${state2}`)
  assert.equal(callbackRes2.status, 302)
  assert.equal(callbackRes2.headers.get('location'), location)

  const dbCheck = new DatabaseSync(database)
  assert.equal(dbCheck.prepare("SELECT COUNT(*) AS count FROM users WHERE auth_provider = 'zhihu'").get().count, 1)
  dbCheck.close()

  // 7. Error handling
  const clientErr = browser()
  const startErr = await clientErr.get('/api/user/login/zhihu')
  const stateErr = new URL(startErr.headers.get('location')).searchParams.get('state')
  const errRes = await clientErr.get(`/api/user/login/zhihu/callback?error=access_denied&state=${stateErr}`)
  assert.equal(errRes.headers.get('location'), '/?messageCode=zhihu&messageType=error')
})

test('Google OAuth authorization and callback flow', async () => {
  const client = browser()

  // 1. Start Google login
  const startRes = await client.get('/api/user/login/google')
  assert.equal(startRes.status, 302)
  const redirectUrl = new URL(startRes.headers.get('location'))
  assert.equal(redirectUrl.origin, providerUrl)
  assert.equal(redirectUrl.pathname, '/google/authorize')
  assert.equal(redirectUrl.searchParams.get('response_type'), 'code')
  assert.equal(redirectUrl.searchParams.get('client_id'), 'test-google-client-id')
  assert.equal(redirectUrl.searchParams.get('redirect_uri'), 'https://hackneo.cn/api/user/login/google/callback')
  assert.equal(redirectUrl.searchParams.get('scope'), 'openid email profile')
  const state = redirectUrl.searchParams.get('state')
  assert.match(state, /^[a-f\d]{64}$/)

  // 2. State validation
  assert.equal((await browser().get('/api/user/login/google/callback?code=good')).status, 400)
  const invalidClient = browser()
  await invalidClient.get('/api/user/login/google')
  assert.equal((await invalidClient.get(`/api/user/login/google/callback?code=good&state=fake`)).status, 400)

  // 3. Callback success
  const callbackRes = await client.get(`/api/user/login/google/callback?code=good&state=${state}`)
  assert.equal(callbackRes.status, 302)
  const location = callbackRes.headers.get('location')
  assert.match(location, /^\/developer/)

  // 4. Verify DB persistence
  const db = new DatabaseSync(database)
  const user = db.prepare("SELECT * FROM users WHERE auth_provider = 'google'").get()
  assert.ok(user, 'Google user should be persisted')
  assert.equal(user.auth_provider, 'google')
  assert.equal(user.email, 'developer@example.com')
  assert.equal(user.initialed, 1)

  const identity = db.prepare("SELECT * FROM oauth_identities WHERE provider = 'google' AND user_id = ?").get(user.user_id)
  assert.ok(identity, 'Google OAuth identity should be recorded')
  assert.equal(identity.provider_user_id, 'google-sub-999')

  const resume = db.prepare('SELECT * FROM resumes WHERE user_id = ?').get(user.user_id)
  assert.ok(resume, 'Resume should be created')
  assert.equal(resume.is_default, 1)
  db.close()

  // 5. User session works
  const infoRes = await client.get('/api/user/info')
  assert.equal(infoRes.status, 200)
  const info = await infoRes.json()
  assert.equal(info.success, true)
  assert.equal(info.result.authProvider, 'google')
  assert.equal(info.result.userName, 'Google Dev')

  // 6. Secondary login with same Google account
  const client2 = browser()
  const startRes2 = await client2.get('/api/user/login/google')
  const state2 = new URL(startRes2.headers.get('location')).searchParams.get('state')
  const callbackRes2 = await client2.get(`/api/user/login/google/callback?code=good&state=${state2}`)
  assert.equal(callbackRes2.status, 302)
  assert.equal(callbackRes2.headers.get('location'), location)

  const dbCheck = new DatabaseSync(database)
  assert.equal(dbCheck.prepare("SELECT COUNT(*) AS count FROM users WHERE auth_provider = 'google'").get().count, 1)
  dbCheck.close()

  // 7. Error handling
  const clientErr = browser()
  const startErr = await clientErr.get('/api/user/login/google')
  const stateErr = new URL(startErr.headers.get('location')).searchParams.get('state')
  const errRes = await clientErr.get(`/api/user/login/google/callback?error=access_denied&state=${stateErr}`)
  assert.equal(errRes.headers.get('location'), '/?messageCode=google&messageType=error')
})
