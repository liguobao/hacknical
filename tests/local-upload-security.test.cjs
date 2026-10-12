const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')
const { spawn } = require('node:child_process')
const { once } = require('node:events')

const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=', 'base64')
const jpeg = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'images', 'gold.jpeg'))

async function unusedPort() {
  const server = http.createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  return port
}

test('local uploads require login, CSRF and valid image data', async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hacknical-upload-test-'))
  const port = await unusedPort()
  const origin = `http://127.0.0.1:${port}`
  const username = `upload_${Date.now()}`
  const uploadFolder = path.join(__dirname, '..', 'public', 'uploads', username)
  const app = spawn(process.execPath, ['dist/bin/app.js'], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      APP_KEY: 'u'.repeat(64),
      SQLITE_PATH: path.join(temporary, 'data.sqlite'),
      INVITE_CODES: 'UPLOAD-TEST-CODE',
      LOG_LEVEL: 'ERROR'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let output = ''
  app.stdout.on('data', data => { output += data })
  app.stderr.on('data', data => { output += data })
  const cookies = new Map()
  let csrf = ''

  const call = async (url, options = {}) => {
    const response = await fetch(`${origin}${url}`, {
      ...options,
      redirect: 'manual',
      headers: {
        'X-Forwarded-Proto': 'https',
        Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; '),
        ...options.headers
      }
    })
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0]
      const at = pair.indexOf('=')
      cookies.set(pair.slice(0, at), pair.slice(at + 1))
    }
    const body = await response.text()
    const match = body.match(/<meta name="csrf-token" content="([^"]+)">/)
    if (match) csrf = match[1]
    return { response, body }
  }

  try {
    let ready = false
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (app.exitCode !== null) throw new Error(output)
      try {
        if ((await fetch(`${origin}/api/healthz`)).ok) {
          ready = true
          break
        }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    assert.ok(ready, output)

    const anonymousPath = `/uploads/${username}/avator/00000000-0000-4000-8000-000000000000.png`
    const anonymous = await call(anonymousPath, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: image
    })
    assert.equal(anonymous.response.status, 403)

    await call('/')
    assert.ok(csrf)
    const signup = await call('/api/user/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email: `${username}@example.test`,
        password: 'test-password',
        inviteCode: 'UPLOAD-TEST-CODE',
        _csrf: csrf
      })
    })
    assert.equal(signup.response.status, 200, signup.body)
    await call(`/${username}`)
    assert.ok(csrf)

    const uploadInfo = await call('/api/resume/image/upload?filename=avatar.png')
    assert.equal(uploadInfo.response.status, 200, uploadInfo.body)
    const uploadUrl = JSON.parse(uploadInfo.body).result.uploadUrl
    assert.match(uploadUrl, new RegExp(`^/uploads/${username}/avator/[a-f0-9-]{36}\\.png$`))

    const noCsrf = await call(uploadUrl, {
      method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: image
    })
    assert.equal(noCsrf.response.status, 403)

    const wrongUser = await call(uploadUrl.replace(username, 'someone_else'), {
      method: 'PUT', headers: { 'Content-Type': 'image/png', 'X-CSRF-Token': csrf }, body: image
    })
    assert.equal(wrongUser.response.status, 403)

    const html = await call(uploadUrl, {
      method: 'PUT', headers: { 'Content-Type': 'image/png', 'X-CSRF-Token': csrf }, body: '<h1>bad</h1>'
    })
    assert.equal(html.response.status, 415)

    const tooLarge = await call(uploadUrl, {
      method: 'PUT', headers: { 'Content-Type': 'image/png', 'X-CSRF-Token': csrf }, body: Buffer.alloc(4 * 1024 * 1024 + 1)
    })
    assert.equal(tooLarge.response.status, 413)

    const accepted = await call(uploadUrl, {
      method: 'PUT', headers: { 'Content-Type': 'image/png', 'X-CSRF-Token': csrf }, body: image
    })
    assert.equal(accepted.response.status, 200, accepted.body)

    const repeated = await call(uploadUrl, {
      method: 'PUT', headers: { 'Content-Type': 'image/png', 'X-CSRF-Token': csrf }, body: image
    })
    assert.equal(repeated.response.status, 409)

    const publicImage = await call(uploadUrl)
    assert.equal(publicImage.response.status, 200)
    assert.equal(publicImage.response.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(publicImage.response.headers.get('content-security-policy'), 'sandbox')

    for (const extension of ['jpg', 'jpeg']) {
      const jpegInfo = await call(`/api/resume/image/upload?filename=avatar.${extension}`)
      assert.equal(jpegInfo.response.status, 200, jpegInfo.body)
      const jpegUrl = JSON.parse(jpegInfo.body).result.uploadUrl
      assert.match(jpegUrl, new RegExp(`\\.${extension}$`))

      const wrongData = await call(jpegUrl, {
        method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'X-CSRF-Token': csrf }, body: image
      })
      assert.equal(wrongData.response.status, 415)

      const acceptedJpeg = await call(jpegUrl, {
        method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'X-CSRF-Token': csrf }, body: jpeg
      })
      assert.equal(acceptedJpeg.response.status, 200, acceptedJpeg.body)

      const publicJpeg = await call(jpegUrl)
      assert.equal(publicJpeg.response.status, 200)
      assert.match(publicJpeg.response.headers.get('content-type'), /^image\/jpeg/)
    }

    const legacyHtml = path.join(uploadFolder, 'legacy.html')
    fs.writeFileSync(legacyHtml, '<script>window.audit = true</script>')
    const oldUpload = await call(`/uploads/${username}/legacy.html`)
    assert.equal(oldUpload.response.status, 200)
    assert.equal(oldUpload.response.headers.get('content-security-policy'), 'sandbox')
  } finally {
    if (app.exitCode === null) {
      const done = once(app, 'exit')
      app.kill('SIGTERM')
      await done
    }
    fs.rmSync(uploadFolder, { recursive: true, force: true })
    fs.rmSync(temporary, { recursive: true, force: true })
  }
})
