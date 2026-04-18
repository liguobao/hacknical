import * as ReactDOM from '../../../node_modules/react-dom/index.js'

const findDOMNode = (nodeOrRef) => {
  if (!nodeOrRef) return null
  if (nodeOrRef.nodeType) return nodeOrRef
  if (nodeOrRef.current && nodeOrRef.current.nodeType) return nodeOrRef.current
  return nodeOrRef
}

const shim = { ...ReactDOM, findDOMNode }

export default shim
export * from '../../../node_modules/react-dom/index.js'
export { findDOMNode }
