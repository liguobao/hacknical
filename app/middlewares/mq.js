
import config from 'config'
import mq from 'mq-utils'

const mqConfig = config.get('mq')
const mockEnabled = config.has('mock') && config.get('mock')

const createQueue = () => {
  if (mockEnabled) {
    return {
      async send() {
        return null
      },
      async sendMulti() {
        return null
      }
    }
  }

  const MQ = mq[mqConfig.source](mqConfig.config)
  return new MQ(mqConfig.channels.messenger, mqConfig.options)
}

const mqMiddleware = () => {
  const queue = createQueue()
  return async (ctx, next) => {
    ctx.mq = queue
    await next()
  }
}

export default mqMiddleware
