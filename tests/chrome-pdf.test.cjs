const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')

// Mirror of app/utils/chrome-pdf.js#resolveChromePath — keep behavior in sync.
const resolveChromePath = (candidates, existsSync = fs.existsSync) => {
  const found = candidates.find((candidate) => {
    try {
      return Boolean(candidate) && existsSync(candidate)
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

describe('chrome pdf path resolution', () => {
  it('resolves the first existing candidate path', () => {
    const fakeBinary = path.join(ROOT, 'tests', '.fake-chrome-binary')
    fs.writeFileSync(fakeBinary, '#!/bin/sh\n')
    try {
      assert.equal(
        resolveChromePath([
          path.join(ROOT, 'tests', 'missing-a'),
          fakeBinary,
          path.join(ROOT, 'tests', 'missing-b')
        ]),
        fakeBinary
      )
    } finally {
      fs.unlinkSync(fakeBinary)
    }
  })

  it('throws a clear error when no chrome binary is available', () => {
    assert.throws(
      () => resolveChromePath([
        path.join(ROOT, 'tests', 'missing-chrome'),
        path.join(ROOT, 'tests', 'missing-chromium')
      ]),
      /Chrome\/Chromium not found/
    )
  })

  it('keeps resolveChromePath exported from the source module', () => {
    const source = fs.readFileSync(
      path.join(ROOT, 'app/utils/chrome-pdf.js'),
      'utf8'
    )
    assert.match(source, /export const resolveChromePath/)
    assert.match(source, /export const renderUrlToPdf/)
    assert.doesNotMatch(source, /\bphantom\b/)
  })

  it('downloads service no longer depends on phantom', () => {
    const source = fs.readFileSync(
      path.join(ROOT, 'app/services/downloads.js'),
      'utf8'
    )
    assert.doesNotMatch(source, /\bphantom\b/)
    assert.match(source, /renderUrlToPdf/)
  })

  it('resume download renders against loopback instead of public APP_URL', () => {
    const source = fs.readFileSync(
      path.join(ROOT, 'app/controllers/resume.js'),
      'utf8'
    )
    assert.match(source, /127\.0\.0\.1/)
    assert.match(source, /fromDownload \? 'desktop'/)
  })
})
