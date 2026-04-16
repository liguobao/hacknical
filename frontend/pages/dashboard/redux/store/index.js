
import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'
import { routerMiddleware } from 'react-router-redux'
import history from '../../history'

import appReducer from '../reducer'

export const createAppStore = (initialState = {}) => {
  const logger = createLogger()
  const router = routerMiddleware(history)

  const mids = [
    thunk
  ]
  if (window.LogRocket) mids.push(window.LogRocket.reduxMiddleware())
  if (process.env.NODE_ENV !== 'production') {
    mids.unshift(logger)
  }
  mids.unshift(router)
  const middlewares = applyMiddleware(...mids)

  const AppStore = createStore(appReducer, initialState, middlewares)

  AppStore.asyncReducers = {}
  return AppStore
}

export default createAppStore()
