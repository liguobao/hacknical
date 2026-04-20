
import { combineReducers } from 'redux'

const initialReducers = {}
const emptyReducer = (state = {}) => state

export const makeRootReducer = (asyncReducers = {}) => {
  const reducers = {
    ...initialReducers,
    ...asyncReducers
  }

  if (!Object.keys(reducers).length) {
    return emptyReducer
  }

  return combineReducers(reducers)
}

export const injectReducer = (store, { key, reducer }) => {
  store.asyncReducers[key] = reducer
  store.replaceReducer(makeRootReducer(store.asyncReducers))
}

const appReducer = makeRootReducer()

export default appReducer
