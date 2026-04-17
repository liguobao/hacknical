
import log4js from 'log4js'
import config from 'config'

const logConfig = config.get('log')
const appName = config.get('appName')
const category = `[${appName.toUpperCase()}]`

// log4js 6.x: appenders is a named map, categories wires them up
log4js.configure({
  appenders: {
    out: { ...logConfig.appender }
  },
  categories: {
    default: {
      appenders: ['out'],
      level: logConfig.level
    },
    [category]: {
      appenders: ['out'],
      level: logConfig.level
    }
  }
})

const logger = log4js.getLogger(category)

export default logger
