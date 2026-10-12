export const redactDownloadToken = value => String(value)
  .replace(/([?&]downloadToken=)[^&#\s]+/gi, '$1[REDACTED]')
  .replace(/("downloadToken"\s*:\s*")[^"]+/gi, '$1[REDACTED]')

export const safeQuery = query => Object.keys(query || {}).reduce((result, key) => {
  result[key] = key.toLowerCase() === 'downloadtoken' ? '[REDACTED]' : query[key]
  return result
}, Object.create(null))
