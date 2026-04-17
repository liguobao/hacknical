import ReactDOM from 'react-dom'

const ROOT_KEY = '__hacknicalReactRoot__'

const renderRoot = (domId, element) => {
  const dom = document.getElementById(domId)
  if (!dom) return null

  const root = dom[ROOT_KEY] || ReactDOM.createRoot(dom)
  dom[ROOT_KEY] = root
  root.render(element)
  return root
}

export default renderRoot
