

import React from 'react'
import InitialPanel from './container'
import renderRoot from 'UTILS/render'

const renderApp = (domId, props = {}) => {
  renderRoot(domId, <InitialPanel {...props} />)
}

export default renderApp
