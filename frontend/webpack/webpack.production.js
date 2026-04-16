const config = require('./webpack.config.v3')

config.devtool = 'source-map'
config.stats = 'normal'

module.exports = config
