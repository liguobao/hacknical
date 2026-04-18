
import 'STYLES/fonts-hack.css'
import renderApp from 'PAGES/initial'

$(() => {
  $(document).on('contextmenu', () => false)

  renderApp('initial', {
    login: window.login
  })
})
