
import React from 'react'

const normalizeComponent = (Component) => {
  let result = Component

  while (result && typeof result === 'object' && result.default) {
    result = result.default
  }

  return result
}

const getOptions = (input) => {
  if (typeof input === 'function') {
    return {
      resolve: input,
      LoadingComponent: null
    }
  }

  return {
    resolve: input.resolve,
    LoadingComponent: input.LoadingComponent || null
  }
}

const asyncComponent = input => {
  const options = getOptions(input)

  class AsyncComponent extends React.Component {
    static Component = null
    state = { Component: AsyncComponent.Component }

    componentDidMount() {
      if (!this.state.Component) {
        options.resolve().then(Component => {
          const LoadedComponent = normalizeComponent(Component)
          AsyncComponent.Component = LoadedComponent
          this.setState({ Component: LoadedComponent })
        })
      }
    }

    render() {
      const { Component } = this.state
      if (Component) {
        return <Component {...this.props} />
      }

      const { LoadingComponent } = options
      return LoadingComponent ? <LoadingComponent /> : null
    }
  }
  return AsyncComponent
}

export default asyncComponent
