// AI features in the claude.ai artifact build: the same prompts as the server
// (src/lib/prompts.js), answered on the viewer's own Claude account via `sample`.
import { capability } from './platform.js'
import {
  CHAT_PROMPT, DIAGNOSIS_PROMPT, DIAGNOSIS_SCHEMA, TIPS_PROMPT, TIPS_SCHEMA,
  collectionContext, describePlant, diagnosisContext,
} from './prompts.js'

const ERRORS = {
  not_granted: 'צריך לאשר לאפליקציה להשתמש ב-Claude (בחלון שנפתח).',
  sampling_disabled: 'Claude לא זמין בחשבון הזה.',
  rate_limited: 'הגעתם למגבלת השימוש ב-Claude כרגע. נסו שוב מאוחר יותר.',
  session_expired: 'צריך להתחבר מחדש ל-Claude.',
  image_rejected: 'התמונה לא נתמכת. נסו תמונה אחרת (JPG או PNG).',
  images_unavailable: 'בתצוגה הזו אי אפשר לשלוח תמונות ל-Claude.',
  refused: 'Claude לא יכול לענות על זה. נסו לנסח אחרת.',
  invalid_json: 'התשובה הגיעה לא שלמה. נסו שוב.',
  prompt_too_large: 'הבקשה ארוכה מדי. נסו שיחה חדשה.',
}

function failure(e) {
  if (e?.code === 'cancelled') {
    const err = new Error('cancelled')
    err.name = 'AbortError'
    return err
  }
  return new Error(ERRORS[e?.code] || 'משהו השתבש בחיבור ל-Claude. נסו שוב.')
}

async function getSample() {
  const sample = await capability('sample')
  if (!sample) throw new Error('Claude לא זמין כאן. פתחו את האפליקציה מתוך claude.ai.')
  return sample
}

function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',')
  const type = head.match(/data:([^;]+)/)?.[1] || 'image/jpeg'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

const jsonInstruction = schema =>
  `Reply with only one JSON object (no Markdown, no other text) that matches this JSON Schema exactly, with every required field present:\n${JSON.stringify(schema)}`

const arr = v => (Array.isArray(v) ? v : [])
const str = (v, d = '') => (typeof v === 'string' ? v : d)
const num = v => (Number.isFinite(Number(v)) ? Number(v) : null)

// sample.json does not validate the shape, so fill anything missing before the UI reads it.
function normalizeDiagnosis(r) {
  const id = r?.identification || {}
  const health = r?.health || {}
  const care = r?.care || {}
  return {
    ...r,
    is_plant: r?.is_plant !== false,
    identification: {
      common_name_he: str(id.common_name_he, 'צמח'), common_name_en: str(id.common_name_en), scientific_name: str(id.scientific_name),
      family: str(id.family), confidence: ['high', 'medium', 'low'].includes(id.confidence) ? id.confidence : 'medium',
      alternatives: arr(id.alternatives).map(String), description: str(id.description),
    },
    health: {
      status: ['healthy', 'needs_attention', 'critical'].includes(health.status) ? health.status : 'needs_attention',
      score: num(health.score) ?? 60, summary: str(health.summary),
    },
    issues: arr(r?.issues).map(i => ({
      category: str(i?.category, 'other'), title: str(i?.title, 'בעיה'), severity: ['low', 'medium', 'high'].includes(i?.severity) ? i.severity : 'medium',
      evidence: str(i?.evidence), treatment: arr(i?.treatment).map(String),
    })),
    care: { ...care, water_every_days: num(care.water_every_days), fertilize_every_days: num(care.fertilize_every_days) },
    tips: arr(r?.tips).map(String),
    photo_quality_note: str(r?.photo_quality_note),
    analyzedAt: new Date().toISOString(),
  }
}

// Some Claude views can't send images to Claude; the app then asks for a description instead.
export async function canSendImages() {
  const sample = await capability('sample')
  if (!sample) return false
  try {
    return !!(await sample.limits())?.images
  } catch {
    return false
  }
}

export async function diagnoseWithClaude({ dataUrl, description, location, notes, knownSpecies }) {
  const sample = await getSample()
  const subject = dataUrl
    ? 'The attached photo shows the plant. Identify this plant and diagnose its health.'
    : `No photo could be sent. Identify the plant and assess its health from the grower's description below; set confidence to reflect that it is based on a description, and use photo_quality_note to say a photo would make the diagnosis more reliable.\n\nGrower's description:\n${String(description || '').slice(0, 2000)}`
  const prompt = `${DIAGNOSIS_PROMPT}\n\n${diagnosisContext({ location, notes, knownSpecies })}\n\n${subject}\n\n${jsonInstruction(DIAGNOSIS_SCHEMA)}`
  try {
    const result = await sample.json(prompt, { ...(dataUrl ? { images: dataUrlToBlob(dataUrl) } : {}), cache: false })
    return normalizeDiagnosis(result)
  } catch (e) {
    throw failure(e)
  }
}

export async function tipsWithClaude(plant) {
  const sample = await getSample()
  const prompt = `${TIPS_PROMPT}\n\n${describePlant(plant)}\n\nWrite personalized care tips for this plant.\n\n${jsonInstruction(TIPS_SCHEMA)}`
  try {
    const r = await sample.json(prompt, { cache: false })
    return {
      headline: str(r?.headline),
      tips: arr(r?.tips).map(t => ({ title: str(t?.title), body: str(t?.body), category: str(t?.category, 'other'), priority: str(t?.priority, 'general') })).filter(t => t.title),
      seasonal_focus: str(r?.seasonal_focus),
      common_mistakes: arr(r?.common_mistakes).map(String),
      did_you_know: str(r?.did_you_know),
      related_articles: arr(r?.related_articles).map(String),
      generatedAt: new Date().toISOString(),
    }
  } catch (e) {
    throw failure(e)
  }
}

// Chat: instructions as a leading user turn, then the conversation; only the newest photo is sent.
export async function chatWithClaude({ messages, plants, signal, onDelta }) {
  const sample = await getSample()
  const recent = messages.slice(-24)
  while (recent.length && recent[0].role !== 'user') recent.shift()
  const turns = recent.map((m, i) => ({
    role: m.role,
    content: (m.text || '').trim() || (m.image ? (i === recent.length - 1 ? 'מה אתה רואה בתמונה?' : '[תמונה ששותפה קודם בשיחה]') : '…'),
  }))
  const last = recent[recent.length - 1]
  const images = last?.image?.data ? dataUrlToBlob(`data:${last.image.mediaType};base64,${last.image.data}`) : undefined
  let shown = ''
  try {
    await sample(
      [{ role: 'user', content: `${CHAT_PROMPT}\n\n${collectionContext(plants)}\n\nThe conversation follows. Reply to the last message.` }, ...turns],
      {
        cache: false,
        signal,
        ...(images ? { images } : {}),
        onText: ({ delta }) => {
          shown += delta
          onDelta(delta)
        },
      },
    )
  } catch (e) {
    if (e?.code === 'cancelled' || !shown) throw failure(e)
    onDelta(`\n\n⚠️ ${failure(e).message}`)
  }
}
