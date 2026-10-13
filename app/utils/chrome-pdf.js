import { spawn } from 'child_process'
import fs from 'fs'
import http from 'http'
import net from 'net'
import logger from './logger'

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  process.env.CHROMIUM_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium'
].filter(Boolean)

const DEFAULT_TIMEOUT_MS = 60000
const DESKTOP_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 HacknicalPDF/1.0'

export const resolveChromePath = (candidates = CHROME_CANDIDATES) => {
  const found = candidates.find(candidate => {
    try {
      return Boolean(candidate) && fs.existsSync(candidate)
    } catch (e) {
      return false
    }
  })
  if (!found) {
    throw new Error(
      'Chrome/Chromium not found. Install Chromium or set CHROME_PATH to a browser binary.'
    )
  }
  return found
}

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer()
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    const { port } = address
    server.close((err) => {
      if (err) reject(err)
      else resolve(port)
    })
  })
  server.on('error', reject)
})

const fetchJson = (url, timeoutMs = 5000) => new Promise((resolve, reject) => {
  const req = http.get(url, (res) => {
    let raw = ''
    res.setEncoding('utf8')
    res.on('data', chunk => { raw += chunk })
    res.on('end', () => {
      try {
        resolve(JSON.parse(raw))
      } catch (e) {
        reject(e)
      }
    })
  })
  req.setTimeout(timeoutMs, () => {
    req.destroy(new Error(`Timeout fetching ${url}`))
  })
  req.on('error', reject)
})

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const waitForWebSocketDebuggerUrl = async (port, timeoutMs = 15000) => {
  const start = Date.now()
  let lastError = null
  while (Date.now() - start < timeoutMs) {
    try {
      const version = await fetchJson(`http://127.0.0.1:${port}/json/version`)
      if (version && version.webSocketDebuggerUrl) {
        return version.webSocketDebuggerUrl
      }
    } catch (e) {
      lastError = e
    }
    await sleep(100)
  }
  throw new Error(
    `Chrome DevTools endpoint not ready on port ${port}: ${(lastError && lastError.message) || 'unknown error'}`
  )
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.ws = null
    this.nextId = 0
    this.pending = new Map()
    this.sessionBindings = new Map()
  }

  async open() {
    if (typeof WebSocket === 'undefined') {
      throw new Error('WebSocket is not available in this Node runtime')
    }
    this.ws = new WebSocket(this.wsUrl)
    await new Promise((resolve, reject) => {
      const onOpen = () => {
        cleanup()
        resolve()
      }
      const onError = (event) => {
        cleanup()
        reject(new Error((event && event.message) || 'WebSocket connection failed'))
      }
      const cleanup = () => {
        this.ws.removeEventListener('open', onOpen)
        this.ws.removeEventListener('error', onError)
      }
      this.ws.addEventListener('open', onOpen)
      this.ws.addEventListener('error', onError)
    })
    this.ws.addEventListener('message', (event) => {
      let message
      try {
        message = JSON.parse(String(event.data))
      } catch (e) {
        return
      }
      if (message.method === 'Target.attachedToTarget' && message.params) {
        const { sessionId, targetInfo } = message.params
        if (sessionId && targetInfo && targetInfo.targetId) {
          this.sessionBindings.set(targetInfo.targetId, sessionId)
        }
      }
      if (message.id == null) return
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      if (message.error) {
        pending.reject(new Error(message.error.message || JSON.stringify(message.error)))
      } else {
        pending.resolve(message.result)
      }
    })
  }

  send(method, params = {}, sessionId = null) {
    const id = ++this.nextId
    const payload = { id, method, params }
    if (sessionId) payload.sessionId = sessionId
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      try {
        this.ws.send(JSON.stringify(payload))
      } catch (e) {
        this.pending.delete(id)
        reject(e)
      }
    })
  }

  async close() {
    if (!this.ws) return
    try {
      this.ws.close()
    } catch (e) {
      // ignore
    }
    this.ws = null
  }
}

const launchChrome = async (port) => {
  const chromePath = resolveChromePath()
  const args = [
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--font-render-hinting=none',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-first-run',
    '--safebrowsing-disable-auto-update',
    `--user-agent=${DESKTOP_UA}`,
    'about:blank'
  ]

  if (process.env.CHROME_NO_SANDBOX === '1' || process.env.CHROME_NO_SANDBOX === 'true') {
    args.unshift('--no-sandbox', '--disable-setuid-sandbox')
  }

  logger.info(`[RESUME:DOWNLOAD:CHROME] ${chromePath} port=${port}`)

  const child = spawn(chromePath, args, {
    stdio: ['ignore', 'ignore', 'pipe']
  })

  let stderr = ''
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk)
    if (stderr.length > 8000) stderr = stderr.slice(-8000)
  })

  const exitPromise = new Promise((resolve) => {
    child.on('exit', (code, signal) => resolve({ code, signal }))
  })

  return {
    child,
    stderr: () => stderr,
    exitPromise,
    kill: () => {
      if (!child.killed) {
        try {
          child.kill('SIGKILL')
        } catch (e) {
          // ignore
        }
      }
    }
  }
}

const waitForWindowDone = async (client, sessionId, timeoutMs) => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const evaluated = await client.send('Runtime.evaluate', {
      expression: 'Boolean(window.done)',
      returnByValue: true
    }, sessionId)
    if (evaluated && evaluated.result && evaluated.result.value === true) {
      return
    }
    await sleep(200)
  }
  throw new Error(`Timeout waiting for window.done after ${timeoutMs}ms`)
}

const PREPARE_PRINT_CSS = `
html, body {
  background-color: #fff !important;
  height: auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: visible !important;
}
#footer, #loading, #wechat-image { display: none !important; }
#resume { margin: 0 !important; padding: 0 !important; }
#resume [class*="desktop_container"],
#resume [class*="mobile_container"] {
  width: 100% !important;
  max-width: none !important;
  height: auto !important;
  min-height: 0 !important;
  margin: 0 !important;
}
#resume [class*="container"],
#resume [class*="wrapper"] {
  box-shadow: none !important;
  border-radius: 0 !important;
  height: auto !important;
  min-height: 0 !important;
}
`

const preparePageForPrint = async (client, sessionId) => {
  await client.send('Runtime.evaluate', {
    expression: `(() => {
      const existing = document.getElementById('hacknical-pdf-print')
      if (existing) existing.remove()
      const style = document.createElement('style')
      style.id = 'hacknical-pdf-print'
      style.textContent = ${JSON.stringify(PREPARE_PRINT_CSS)}
      document.head.appendChild(style)
      window.scrollTo(0, 0)
      return true
    })()`,
    returnByValue: true
  }, sessionId)
  // Allow layout to settle after stripping height/margin/shadow.
  await sleep(300)
}

const measureResumeContent = async (client, sessionId) => {
  const evaluated = await client.send('Runtime.evaluate', {
    expression: `(() => {
      const root = document.querySelector('#resume') || document.body
      const rect = root.getBoundingClientRect()
      const width = Math.ceil(Math.max(
        root.scrollWidth || 0,
        rect.width || 0,
        document.documentElement.scrollWidth || 0,
        document.body ? document.body.scrollWidth : 0,
        800
      ))
      const height = Math.ceil(Math.max(
        root.scrollHeight || 0,
        rect.height || 0,
        document.documentElement.scrollHeight || 0,
        document.body ? document.body.scrollHeight : 0,
        600
      ))
      return { width, height }
    })()`,
    returnByValue: true
  }, sessionId)
  return (evaluated && evaluated.result && evaluated.result.value)
    || { width: 1024, height: 600 }
}

const buildPdfOptions = async (client, sessionId, pageStyle) => {
  const base = {
    printBackground: true,
    preferCSSPageSize: false,
    displayHeaderFooter: false,
    scale: 1
  }

  if (pageStyle === 'onePage') {
    const size = await measureResumeContent(client, sessionId)
    // +2px buffer avoids a blank second page from sub-pixel / rounding overflow.
    const widthPx = Math.max(Number(size.width) || 1024, 800)
    const heightPx = Math.max(Number(size.height) || 600, 600) + 2
    return {
      ...base,
      paperWidth: widthPx / 96,
      paperHeight: heightPx / 96,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0
    }
  }

  return {
    ...base,
    paperWidth: 8.27,
    paperHeight: 11.69,
    marginTop: 0.39,
    marginBottom: 0.39,
    marginLeft: 0,
    marginRight: 0
  }
}

export const renderUrlToPdf = async ({ input, output, pageStyle = 'clippedPages', timeoutMs = DEFAULT_TIMEOUT_MS }) => {
  const port = await getFreePort()
  const browser = await launchChrome(port)
  let client = null

  try {
    const wsUrl = await waitForWebSocketDebuggerUrl(port)
    client = new CdpClient(wsUrl)
    await client.open()

    await client.send('Target.setDiscoverTargets', { discover: true })
    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await client.send('Target.attachToTarget', {
      targetId,
      flatten: true
    })

    await client.send('Page.enable', {}, sessionId)
    await client.send('Runtime.enable', {}, sessionId)
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1024,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false
    }, sessionId)

    const navResult = await client.send('Page.navigate', { url: input }, sessionId)
    if (navResult && navResult.errorText) {
      throw new Error(`Navigation failed: ${navResult.errorText}`)
    }
    // Resume pages set window.done after data + layout finish; do not rely on
    // loadEventFired (about:blank / SPA races).
    await waitForWindowDone(client, sessionId, timeoutMs)
    await preparePageForPrint(client, sessionId)

    const pdfOptions = await buildPdfOptions(client, sessionId, pageStyle)
    const pdf = await client.send('Page.printToPDF', pdfOptions, sessionId)
    if (!pdf || !pdf.data) {
      throw new Error('Chrome returned empty PDF data')
    }

    fs.writeFileSync(output, Buffer.from(pdf.data, 'base64'))
    const stat = fs.statSync(output)
    if (!stat.isFile() || stat.size < 100) {
      throw new Error(`Generated PDF is invalid: ${output}`)
    }
  } catch (e) {
    const details = browser.stderr()
    if (details) {
      logger.error(`[RESUME:DOWNLOAD:CHROME:STDERR] ${details}`)
    }
    throw e
  } finally {
    if (client) {
      try {
        await client.close()
      } catch (e) {
        // ignore
      }
    }
    browser.kill()
    await Promise.race([browser.exitPromise, sleep(2000)])
  }
}
