
import { injectReducer } from '../../redux/reducer'
import reducer from './redux/reducers'
import asyncComponent from 'COMPONENTS/AsyncComponent'

export default (store, options) => {
  const { device } = options

  const RecordsComponent = asyncComponent(
    () => import(`./Components/${device[0].toUpperCase()}${device.slice(1).toLowerCase()}`)
      .then((component) => {
        injectReducer(store, { key: 'records', reducer })
        return component.default
      })
  )
  return {
    path: 'records',
    component: RecordsComponent
  }
}
