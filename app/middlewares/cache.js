
import config from 'config'
import redisConnect from '../utils/redis'

const mockEnabled = config.has('mock') && config.get('mock')

const memoryStore = new Map()
const memoryCache = {
  async get(key) {
    const entry = memoryStore.get(key)
    if (!entry) return null
    if (entry.expireAt && entry.expireAt < Date.now()) {
      memoryStore.delete(key)
      return null
    }
    return entry.value
  },
  async set(key, value, _mode, seconds) {
    const expireAt = seconds ? Date.now() + (seconds * 1000) : null
    memoryStore.set(key, { value, expireAt })
    return 'OK'
  },
  async expire(key) {
    memoryStore.delete(key)
    return 1
  },
  async del(key) {
    memoryStore.delete(key)
    return 1
  }
}

export const redisMiddleware = () => async (ctx, next) => {
  if (mockEnabled) {
    ctx.cache = memoryCache
  } else {
    ctx.cache = await redisConnect()
  }
  await next()
}
