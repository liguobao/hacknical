
import React from 'react'

import 'normalize.css'
import 'STYLES/fonts.css'
import 'STYLES/fonts-logo.css'
import 'SRC/vendor/base/base.css'
import 'font-awesome/css/font-awesome.css'
import * as Sentry from '@sentry/browser'
import Footer from 'PAGES/shared/components/Footer'
import renderRoot from 'UTILS/render'

if (process.env.SENTRY) {
  try {
    Sentry.init({
      dsn: process.env.SENTRY
    })
  } catch (e) {
    console.error(e)
  }
}

const renderFooter = (domId, props = {}) => {
  renderRoot(domId, <Footer {...props} />)
}

$(() => {
  renderFooter('footer', {
    isMobile: window.isMobile === 'true' || window.isMobile === true
  })
})
