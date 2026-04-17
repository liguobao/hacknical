
import 'core-js/stable'
import 'regenerator-runtime/runtime'
import React from 'react'
import AppContainer from './AppContainer'
import AppStore from './redux/store'
import routes from './routes'
import history from './history'
import renderRoot from 'UTILS/render'

const renderApp = (id, props = {}) => {
  renderRoot(
    id,
    <AppContainer
      store={AppStore}
      history={history}
      routes={routes(AppStore, props)}
      {...props}
    />
  )
}

export default renderApp
