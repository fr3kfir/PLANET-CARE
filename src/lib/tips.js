// Builds the tips request for a plant and decides when cached tips are stale.
import { TASKS, currentSeason } from './storage.js'
import { formatDate } from './labels.js'

const MONTH = 30 * 24 * 60 * 60 * 1000
const JOURNAL_TEXT = { water: 'השקיה', fertilize: 'דישון', mist: 'ריסוס', prune: 'גיזום', repot: 'החלפת עציץ', note: 'הערה', photo: 'תמונה', season: 'עדכון עונתי' }

export function tipsRequest(plant) {
  const scan = plant.scans[0]
  const schedule = Object.fromEntries(Object.entries(TASKS).filter(([, t]) => plant[t.every]).map(([k, t]) => [k, plant[t.every]]))
  return {
    name: plant.name,
    scientific: scan?.result?.identification?.scientific_name,
    family: scan?.result?.identification?.family,
    location: plant.location,
    site: plant.site,
    health: scan?.result?.health ? `${scan.result.health.status}, ${scan.result.health.score}/100 — ${scan.result.health.summary}` : null,
    healthDate: scan?.date,
    issues: scan?.result?.issues?.map(i => i.title) || [],
    schedule,
    history: plant.journal.slice(0, 12).map(e => `${formatDate(e.date)}: ${JOURNAL_TEXT[e.type] || e.type}${e.text ? ` — ${e.text}` : ''}`),
  }
}

// Tips are regenerated when the season changes, after a new scan, or after a month.
export function tipsAreFresh(plant) {
  const t = plant.tips
  if (!t?.data) return false
  return t.season === currentSeason() && t.scanId === plant.scans[0]?.id && Date.now() - new Date(t.data.generatedAt).getTime() < MONTH
}

export const withTips = (plant, data) => ({ ...plant, tips: { data, season: currentSeason(), scanId: plant.scans[0]?.id } })
