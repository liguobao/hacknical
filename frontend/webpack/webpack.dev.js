const config = require('./webpack.config.v3')

config.devtool = 'source-map'
config.stats = 'errors-warnings'

module.exports = config
