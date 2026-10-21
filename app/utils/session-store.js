import db, { parseJson, stringifyJson } from './sqlite'

// Only an opaque session ID is sent to the browser. OAuth tokens stay in SQLite.
export default {
  async get(key) {
    const row = db.prepare('SELECT data FROM sessions WHERE id = ? AND expires_at > ?').get(key, Date.now())
    if (!row) return null
    const value = parseJson(row.data)
    if (value && value.userId) {
      const user = db.prepare('SELECT github_login FROM users WHERE user_id = ?').get(value.userId)
      if (user) {
        value.githubLogin = user.github_login
        value.login = user.github_login
      }
    }
    return value
  },
  async set(key, value, maxAge) {
    const timestamp = Date.now()
    // Site login lifetime is independent of the GitHub API token lifetime.
    const expiresAt = timestamp + maxAge
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(timestamp)
    db.prepare(`
      INSERT INTO sessions (id, data, expires_at) VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at
    `).run(key, stringifyJson(value), expiresAt)
  },
  async destroy(key) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(key)
  }
}
