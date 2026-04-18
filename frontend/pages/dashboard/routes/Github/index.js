
import asyncComponent from 'COMPONENTS/AsyncComponent'

export default (store, options) => {
  const { device } = options

  const GithubComponent = asyncComponent(
    () => import(`./Components/${device[0].toUpperCase()}${device.slice(1).toLowerCase()}`)
      .then(component => component.default)
  )
  return {
    path: 'visualize',
    component: GithubComponent
  }
}
