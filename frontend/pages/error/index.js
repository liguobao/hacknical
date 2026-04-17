
import React from 'react'
import Error from 'PAGES/shared/components/Error'
import renderRoot from 'UTILS/render'

const renderApp = (domId, props = {}) => {
  renderRoot(domId, <Error {...props} />)
}

export default renderApp
