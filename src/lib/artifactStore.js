// Plant storage in the claude.ai artifact build: one document per plant in the viewer's
// private subtree of the artifact database (data/users/<id>/<plantId>), plus a list of
// deleted ids so a plant removed on one device doesn't come back from another.
import { capability } from './platform.js'
import { normalize } from './storage.js'

const DOC_LIMIT = 230_000 // documents are capped at 256 KiB
const DELETED = '_deleted'

let ready = null

// { db, uid } once the viewer's private storage is available, else null.
export function artifactStorage() {
  ready ??= (async () => {
    const [db, user] = await Promise.all([capability('db'), capability('user')])
    const uid = db && user ? await user.id().catch(() => null) : null
    return db && uid ? { db, uid } : null
  })()
  return ready
}

const size = p => JSON.stringify(p).length

// Shrink a plant until it fits one document: drop progress photos, then older scan photos.
export function fitForDoc(plant) {
  if (size(plant) <= DOC_LIMIT) return plant
  let p = { ...plant, journal: [...plant.journal], scans: [...plant.scans] }
  for (let i = p.journal.length - 1; i >= 0 && size(p) > DOC_LIMIT; i--) {
    if (p.journal[i].thumb) p.journal[i] = { ...p.journal[i], thumb: undefined }
  }
  for (let i = p.scans.length - 1; i >= 1 && size(p) > DOC_LIMIT; i--) {
    if (p.scans[i].thumb) p.scans[i] = { ...p.scans[i], thumb: undefined }
  }
  while (size(p) > DOC_LIMIT && p.scans.length > 1) p = { ...p, scans: p.scans.slice(0, -1) }
  while (size(p) > DOC_LIMIT && p.journal.length > 20) p = { ...p, journal: p.journal.slice(0, -10) }
  return p
}

export async function pullArtifactPlants() {
  const s = await artifactStorage()
  if (!s) throw new Error('storage unavailable')
  const snap = await s.db.collection(`data/users/${s.uid}`).get()
  const plants = []
  let deleted = []
  for (const d of snap.docs) {
    if (d.id === DELETED) deleted = d.data()?.ids || []
    // The document id is the plant id (older versions didn't store it in the body).
    else if (!d.id.startsWith('_')) plants.push(normalize({ ...d.data(), id: d.id }))
  }
  return { plants, deleted }
}

// One write at a time, as the store asks.
export async function pushArtifactChanges({ upsert = [], remove = [] }) {
  const s = await artifactStorage()
  if (!s) throw new Error('storage unavailable')
  const col = s.db.collection(`data/users/${s.uid}`)
  for (const p of upsert) await col.doc(p.id).set(JSON.parse(JSON.stringify(fitForDoc(p))))
  if (remove.length) {
    for (const id of remove) await col.doc(id).delete()
    const ref = col.doc(DELETED)
    const prev = (await ref.get()).data()?.ids || []
    await ref.set({ ids: [...new Set([...remove, ...prev])].slice(0, 500) })
  }
}
