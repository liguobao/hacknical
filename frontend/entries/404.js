
import 'STYLES/fonts-hack.css'
import renderApp from 'PAGES/error'

$(() => {
  $(document).on('contextmenu', () => false)

  renderApp('error', {
    wordLines: [
      '$ SEEMS NOTHING COULD FOUND',
      '$ START REDIRECTING....',
      '$ 5   4   3   2   1   0'
    ],
    onFinish: () => window.location = '/'
  })
})
