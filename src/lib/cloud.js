// Account session and cloud sync of the plant collection.
const KEY = 'plant-care:auth:v1'

export function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null
  } catch {
    return null
  }
}

function saveAuth(auth) {
  try {
    if (auth) localStorage.setItem(KEY, JSON.stringify(auth))
    else localStorage.removeItem(KEY)
  } catch { /* storage blocked */ }
}

export function authHeaders() {
  const token = loadAuth()?.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function call(path, { method = 'GET', body } = {}) {
  const r = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    const err = new Error(data.error || `שגיאת שרת (${r.status})`)
    err.status = r.status
    throw err
  }
  return data
}

// { cloud, signupCode, user } — user is null when signed out or the session expired.
export async function fetchAccount() {
  const data = await call('/api/auth')
  if (!data.user && loadAuth()) saveAuth(null)
  return data
}

export async function signIn(action, { email, password, code }) {
  const data = await call('/api/auth', { method: 'POST', body: { action, email, password, code } })
  saveAuth({ token: data.token, email: data.user.email })
  return data.user
}

export async function signOut() {
  await call('/api/auth', { method: 'POST', body: { action: 'logout' } }).catch(() => {})
  saveAuth(null)
}

export const pullPlants = () => call('/api/sync')

// Sends changes in batches that stay well under the server's request size limit.
export async function pushChanges({ upsert = [], remove = [] }) {
  const LIMIT = 2_500_000
  let batch = []
  let size = 0
  const flush = async (withDeletes = false) => {
    if (!batch.length && !withDeletes) return
    await call('/api/sync', { method: 'POST', body: { upsert: batch, delete: withDeletes ? remove : [] } })
    batch = []
    size = 0
  }
  for (const p of upsert) {
    const s = JSON.stringify(p).length
    if (size + s > LIMIT && batch.length) await flush()
    batch.push(p)
    size += s
  }
  await flush(remove.length > 0)
}

const stamp = p => new Date(p.updatedAt || p.createdAt || 0).getTime()

// Union of both copies, newest version of each plant wins; plants deleted elsewhere are dropped.
// Returns the merged list plus the local plants the server doesn't have yet (or has older).
export function mergePlants(local, remote, deleted = []) {
  const gone = new Set(deleted)
  const byId = new Map(remote.filter(p => !gone.has(p.id)).map(p => [p.id, p]))
  const toPush = []
  for (const p of local) {
    if (gone.has(p.id)) continue
    const r = byId.get(p.id)
    if (!r || stamp(p) > stamp(r)) {
      byId.set(p.id, p)
      toPush.push(p)
    }
  }
  const created = p => new Date(p.createdAt || 0).getTime()
  const merged = [...byId.values()].sort((a, b) => created(b) - created(a))
  return { merged, toPush }
}
