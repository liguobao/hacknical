
import React from 'react'
import PropTypes from 'prop-types'

class BaseCount extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      current: props.start
    }
    this.start = this.start.bind(this)
  }

  componentDidMount() {
    this.start()
  }

  componentDidUpdate(prevProps) {
    const { end, start } = prevProps
    if (this.props.start !== start) {
      this.setState({ current: this.props.start })
    }

    if (this.props.end !== end) {
      this.start()
    }
  }

  componentWillUnmount() {
    this.stop()
  }

  start() {
    throw new Error('start func should be rewrite')
  }

  stop() {}

  render() {
    const { render } = this.props
    const { current } = this.state
    return render(current)
  }
}

BaseCount.propTypes = {
  start: PropTypes.number,
  end: PropTypes.number,
  render: PropTypes.func,
}

BaseCount.defaultProps = {
  start: 0,
  end: 100,
  render: () => null
}

export default BaseCount
