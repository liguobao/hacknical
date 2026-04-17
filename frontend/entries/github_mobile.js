
import React from 'react'
import GitHubMobileShare from 'SHARED/components/GitHub/Mobile'
import 'SRC/vendor/mobile/github.css'
import initialHeadroom from 'SRC/vendor/shared/headroom'
import renderRoot from 'UTILS/render'

const renderApp = (domId, props = {}) => {
  renderRoot(
    domId,
    <GitHubMobileShare
      {...props}
    />
  )
}

$(() => {
  renderApp('github', {
    isShare: true,
    login: window.login,
    isAdmin: window.isAdmin === 'true'
  })

  initialHeadroom('#share_banner')
})
