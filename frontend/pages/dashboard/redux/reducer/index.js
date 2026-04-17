
import { combineReducers } from 'redux'

const initialReducers = {}

export const makeRootReducer = (asyncReducers) => {
  const reducer = combineReducers({
    ...initialReducers,
    ...asyncReducers
  })
  return reducer
}

export const injectReducer = (store, { key, reducer }) => {
  store.asyncReducers[key] = reducer
  store.replaceReducer(makeRootReducer(store.asyncReducers))
}

const appReducer = makeRootReducer()

export default appReducer
