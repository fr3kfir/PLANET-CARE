import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchAccount, mergePlants, pullPlants as pullCloud, pushChanges as pushCloud, signIn, signOut } from './cloud.js'
import { IS_ARTIFACT } from './platform.js'
import { artifactStorage, pullArtifactPlants, pushArtifactChanges } from './artifactStore.js'

// The website syncs to its own server per account; the claude.ai build syncs to the
// artifact's database under the viewer's Claude identity.
const pullPlants = IS_ARTIFACT ? pullArtifactPlants : pullCloud
const pushChanges = IS_ARTIFACT ? pushArtifactChanges : pushCloud

// Keeps the plant collection in sync with the signed-in account.
// localStorage stays the working copy; changes are pushed to the cloud shortly after they happen.
export function useCloudSync(plants, setPlants) {
  const [account, setAccount] = useState({ loading: true, cloud: false, user: null })
  const [status, setStatus] = useState('idle') // idle | syncing | saved | error
  const plantsRef = useRef(plants)
  const baseline = useRef(null) // Map of the plants as last seen while syncing; null when signed out
  const pending = useRef({ upsert: new Map(), remove: new Set() })
  const timer = useRef(null)
  plantsRef.current = plants

  const [artifactReady, setArtifactReady] = useState(false)

  useEffect(() => {
    if (IS_ARTIFACT) {
      setAccount({ loading: false, cloud: false, user: null })
      artifactStorage().then(s => setArtifactReady(!!s))
      return
    }
    fetchAccount()
      .then(a => setAccount({ ...a, loading: false }))
      .catch(() => setAccount({ loading: false, cloud: false, user: null, offline: true }))
  }, [])

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    const { upsert, remove } = pending.current
    if (!upsert.size && !remove.size) return
    pending.current = { upsert: new Map(), remove: new Set() }
    setStatus('syncing')
    try {
      await pushChanges({ upsert: [...upsert.values()], remove: [...remove] })
      setStatus(pending.current.upsert.size || pending.current.remove.size ? 'syncing' : 'saved')
    } catch (err) {
      // Put the changes back (newer edits made meanwhile win) and retry later.
      for (const [id, p] of upsert) if (!pending.current.upsert.has(id)) pending.current.upsert.set(id, p)
      for (const id of remove) pending.current.remove.add(id)
      setStatus('error')
      if (err.status === 401) setAccount(a => ({ ...a, user: null }))
      else timer.current = setTimeout(flush, 30_000)
    }
  }, [])

  // Signed in: pull the cloud copy, merge it with this device, upload what the cloud is missing.
  const email = IS_ARTIFACT ? (artifactReady ? 'claude' : null) : account.user?.email
  useEffect(() => {
    if (!email) {
      baseline.current = null
      setStatus('idle')
      return
    }
    let cancelled = false
    setStatus('syncing')
    pullPlants()
      .then(async ({ plants: remote, deleted }) => {
        if (cancelled) return
        const { merged, toPush } = mergePlants(plantsRef.current, remote, deleted)
        baseline.current = new Map(merged.map(p => [p.id, p]))
        setPlants(merged)
        if (toPush.length) await pushChanges({ upsert: toPush })
        if (!cancelled) setStatus('saved')
      })
      .catch(err => {
        if (cancelled) return
        setStatus('error')
        if (err.status === 401) setAccount(a => ({ ...a, user: null }))
      })
    return () => { cancelled = true }
  }, [email, setPlants])

  // Queue every added, changed or deleted plant and push after a short pause.
  useEffect(() => {
    const base = baseline.current
    if (!base) return
    const now = new Map(plants.map(p => [p.id, p]))
    let changed = false
    for (const [id, p] of now) {
      if (base.get(id) !== p) {
        pending.current.upsert.set(id, p)
        changed = true
      }
    }
    for (const id of base.keys()) {
      if (!now.has(id)) {
        pending.current.upsert.delete(id)
        pending.current.remove.add(id)
        changed = true
      }
    }
    baseline.current = now
    if (changed) {
      setStatus('syncing')
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, 1500)
    }
  }, [plants, flush])

  // Don't lose a queued save when the app goes to the background or comes back online.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('online', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('online', flush)
    }
  }, [flush])

  const login = async (action, form) => {
    const user = await signIn(action, form)
    setAccount(a => ({ ...a, user }))
  }

  const logout = async () => {
    await flush()
    await signOut()
    setAccount(a => ({ ...a, user: null }))
  }

  return { account, status, login, logout }
}
