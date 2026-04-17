

import React from 'react'
import LoginPanel from './container'
import renderRoot from 'UTILS/render'

const renderApp = (domId, props = {}) => {
  renderRoot(domId, <LoginPanel {...props} />)
}

export default renderApp
