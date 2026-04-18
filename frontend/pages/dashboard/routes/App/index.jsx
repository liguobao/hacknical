
import React from 'react'
import { connect } from 'react-redux'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import asyncComponent from 'COMPONENTS/AsyncComponent'
import AppAction from './redux/actions'

const dashboard = {
  mobile: asyncComponent(
    () => import('./Components/Mobile')
      .then(component => component.default)
  ),
  desktop: asyncComponent(
    () => import('./Components/Desktop')
      .then(component => component.default)
  )
}

class App extends React.Component {
  componentDidMount() {
    // https://github.com/ReactTraining/react-router/issues/3854
    const {
      app,
      navigate,
      location
    } = this.props
    const { login, activeTab } = app
    const target = `/${login}/${activeTab}`
    if (location.pathname !== target) {
      navigate(target, { replace: true })
    }
  }

  render() {
    const {
      app,
      location,
      changeActiveTab
    } = this.props
    const dashboardType = app.isMobile ? 'mobile' : 'desktop'
    const Dashboard = dashboard[dashboardType]
    return (
      <Dashboard
        routes={<Outlet />}
        location={location}
        changeActiveTab={changeActiveTab}
        {...app}
      />
    )
  }
}

const mapStateToProps = state => ({ app: state.app })

function mapDispatchToProps(dispatch) {
  return {
    changeActiveTab: (tab) => {
      dispatch(AppAction.changeTab(tab))
    }
  }
}

const AppConnected = connect(mapStateToProps, mapDispatchToProps)(App)

const AppWithRouter = (props) => {
  const navigate = useNavigate()
  const location = useLocation()
  return <AppConnected {...props} navigate={navigate} location={location} />
}

export default AppWithRouter
