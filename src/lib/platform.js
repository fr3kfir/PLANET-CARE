// Which host the app is built for: the Vercel website (own server + API key) or a
// claude.ai artifact (Claude and storage come from the viewer's Claude account).
export const IS_ARTIFACT = import.meta.env.VITE_TARGET === 'artifact'

// Resolves a claude.ai capability namespace, or null outside the artifact viewer.
export function capability(name) {
  if (!IS_ARTIFACT || typeof window === 'undefined' || !window.claude?.use) return Promise.resolve(null)
  return window.claude.use(name).catch(() => null)
}
