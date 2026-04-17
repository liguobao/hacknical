
import React from 'react'
import GitHubComponent from 'SHARED/components/GitHub/Desktop'
import 'SRC/vendor/share.css'
import initialHeadroom from 'SRC/vendor/shared/headroom'
import renderRoot from 'UTILS/render'

const renderApp = (domId, props = {}) => {
  renderRoot(
    domId,
    <GitHubComponent
      {...props}
    />
  )
}

$(() => {
  renderApp('share', {
    login: window.login,
    isShare: window.isShare,
    isAdmin: window.isAdmin === 'true'
  })
  initialHeadroom('#share_banner')
})
