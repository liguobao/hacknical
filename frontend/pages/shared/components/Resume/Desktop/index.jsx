
import React from 'react'
import { Loading } from 'light-ui'
import asyncComponent from 'COMPONENTS/AsyncComponent'

const ResumeViews = {
  v1: asyncComponent({
    resolve: () => import('./v1').then(component => component.default || component),
    LoadingComponent: () => <Loading loading />
  }),
  v2: asyncComponent({
    resolve: () => import('./v2').then(component => component.default || component),
    LoadingComponent: () => <Loading loading />
  }),
  v3: asyncComponent({
    resolve: () => import('./v3').then(component => component.default || component),
    LoadingComponent: () => <Loading loading />
  })
}

const ResumeComponent = (props) => {
  const { shareInfo } = props
  const ResumeView = ResumeViews[shareInfo.template]
  if (!ResumeView) return null
  return <ResumeView {...props} />
}

ResumeComponent.defaultProps = {
  resume: {},
  shareInfo: {},
  login: window.login,
  fromDownload: window.fromDownload === 'true' || window.fromDownload === true
}

export default ResumeComponent
