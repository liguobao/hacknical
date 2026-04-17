
import React from 'react'
import ResumeMobileShare from 'SHARED/components/Resume'
import 'SRC/vendor/shared/loading.css'
import renderRoot from 'UTILS/render'

const renderApp = (domId, props = {}) => {
  renderRoot(domId, <ResumeMobileShare {...props} />)
}

$(() => {
  renderApp('resume', {
    login: window.login,
    userId: window.userId,
    device: 'mobile'
  })
})
