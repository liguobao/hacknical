import React from 'react'
import PropTypes from 'prop-types'
import { Provider } from 'react-redux'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { removeDOM } from 'UTILS/helper'
import * as Sentry from '@sentry/browser'

class AppContainer extends React.Component {
  componentDidMount() {
    removeDOM('#loading', { async: true, timeout: 500 })

    const { login: name, isMobile } = this.props
    name && window.LogRocket && window.LogRocket.identify(name, {
      name,
      isMobile
    })

    if (window.LogRocket) {
      Sentry.getCurrentScope().addEventProcessor(async (event) => {
        event.extra = event.extra || {}
        event.extra.sessionURL = window.LogRocket.sessionURL
        return event
      })
    }
  }

  componentDidCatch(error, errorInfo) {
    Sentry.withScope((scope) => {
      Object.keys(errorInfo).forEach((key) => {
        scope.setExtra(key, errorInfo[key])
      })
      Sentry.captureException(error)
    })
  }

  renderRouteTree() {
    const { routes } = this.props
    const { path, component: Layout, routes: children } = routes
    return (
      <Routes>
        <Route path={path} element={<Layout />}>
          {children.map(child => (
            <Route
              key={child.path}
              path={child.path}
              element={<child.component />}
            />
          ))}
        </Route>
      </Routes>
    )
  }

  render() {
    const { store } = this.props
    return (
      <Provider store={store}>
        <BrowserRouter>
          {this.renderRouteTree()}
        </BrowserRouter>
      </Provider>
    )
  }
}

AppContainer.propTypes = {
  routes: PropTypes.object.isRequired,
  store: PropTypes.object.isRequired
}

export default AppContainer
