/**
 * Допустимые пары логин/пароль для входа на сайт.
 * Либо TW_SITE_USERS_JSON (JSON-объект "user":"pass"),
 * либо одна пара TW_SITE_USER + TW_SITE_PASS (как раньше).
 */
export function loadSiteCredentials(): Record<string, string> {
  const raw = process.env.TW_SITE_USERS_JSON?.trim()
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const out: Record<string, string> = {}
        for (const [k, v] of Object.entries(parsed)) {
          const key = k.trim()
          if (key && typeof v === 'string') {
            out[key] = v
          }
        }
        if (Object.keys(out).length > 0) {
          return out
        }
      }
    } catch {
      // fallback ниже
    }
  }

  const user = process.env.TW_SITE_USER || 'niktwins'
  const pass = process.env.TW_SITE_PASS || '101716'
  return { [user]: pass }
}

export function isValidSiteLogin(username: string, password: string | undefined): boolean {
  if (!username || password === undefined) {
    return false
  }
  const map = loadSiteCredentials()
  return map[username] === password
}
