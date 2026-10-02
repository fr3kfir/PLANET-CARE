import { useEffect, useRef, useState } from 'react'
import { chatStream } from '../lib/api.js'
import { resizeImage } from '../lib/image.js'
import { newId } from '../lib/storage.js'
import { askConfirm } from './Dialogs.jsx'

const KEY = 'plant-care:chat:v1'
const SUGGESTIONS = [
  'למה העלים של הצמח שלי מצהיבים?',
  'מה כדאי לשתול במרפסת עכשיו?',
  'איך מרבים סוקולנטים מעלה?',
  'נוסע לשבועיים — איך להשאיר את הצמחים בחיים?',
  'יש לי זבובונים קטנים סביב העציצים, מה לעשות?',
  'אילו צמחי בית בטוחים לחתולים?',
]

function loadChat() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

function saveChat(messages) {
  let keep = messages.slice(-40)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      localStorage.setItem(KEY, JSON.stringify(keep))
      return
    } catch {
      // Over quota: drop photos from older messages first, then older messages.
      keep = attempt === 0 ? keep.map((m, i) => (i < keep.length - 4 ? { ...m, image: undefined } : m)) : keep.slice(-12)
    }
  }
}

// A small, safe markdown subset: paragraphs, bullet / numbered lists and **bold**.
function Inline({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part,
  )
}

function RichText({ text }) {
  const blocks = []
  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*[-•*]\s+(.*)/)
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)/)
    const last = blocks[blocks.length - 1]
    if (bullet) {
      if (last?.type === 'ul') last.items.push(bullet[1])
      else blocks.push({ type: 'ul', items: [bullet[1]] })
    } else if (numbered) {
      if (last?.type === 'ol') last.items.push(numbered[2])
      else blocks.push({ type: 'ol', items: [numbered[2]] })
    } else if (line.trim()) {
      blocks.push({ type: 'p', text: line.replace(/^#+\s*/, '') })
    }
  }
  return (
    <div className="space-y-2">
      {blocks.map((b, i) =>
        b.type === 'p' ? <p key={i}><Inline text={b.text} /></p>
          : b.type === 'ul' ? <ul key={i} className="space-y-1 pr-4 list-disc">{b.items.map((t, j) => <li key={j}><Inline text={t} /></li>)}</ul>
            : <ol key={i} className="space-y-1 pr-5 list-decimal">{b.items.map((t, j) => <li key={j}><Inline text={t} /></li>)}</ol>,
      )}
    </div>
  )
}

const plantContext = plants => plants.map(p => ({
  name: p.name,
  scientific: p.scans[0]?.result?.identification?.scientific_name,
  site: p.site,
  location: p.location,
  waterEveryDays: p.waterEveryDays,
  lastWatered: p.lastWatered,
  health: p.scans[0]?.result?.health?.summary,
}))

export default function Chat({ plants, draft = '', onDraftUsed }) {
  const [messages, setMessages] = useState(loadChat)
  const [text, setText] = useState(draft)
  const [image, setImage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef(null)
  const fileRef = useRef(null)
  const inputRef = useRef(null)
  const endRef = useRef(null)

  useEffect(() => {
    if (draft) {
      setText(draft)
      onDraftUsed?.()
      inputRef.current?.focus()
    }
  }, [draft, onDraftUsed])

  useEffect(() => {
    if (!busy) saveChat(messages)
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, busy])

  useEffect(() => () => abortRef.current?.abort(), [])

  // Grow the input with its content, up to a few lines.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [text])

  const send = async content => {
    const body = (content ?? text).trim()
    if ((!body && !image) || busy) return
    const userMsg = { id: newId(), role: 'user', text: body, image: image || undefined }
    const replyId = newId()
    const history = [...messages, userMsg]
    setMessages([...history, { id: replyId, role: 'assistant', text: '' }])
    setText('')
    setImage(null)
    setError('')
    setBusy(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      await chatStream({
        messages: history.map(({ role, text, image }) => ({ role, text, image: image && { data: image.data, mediaType: image.mediaType } })),
        plants: plantContext(plants),
        signal: controller.signal,
        onDelta: chunk => setMessages(ms => ms.map(m => (m.id === replyId ? { ...m, text: m.text + chunk } : m))),
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message)
        // Drop an empty reply bubble and give the user back their text.
        setMessages(ms => {
          const reply = ms.find(m => m.id === replyId)
          if (reply?.text) return ms
          setText(body)
          setImage(userMsg.image || null)
          return ms.filter(m => m.id !== replyId && m.id !== userMsg.id)
        })
      }
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  const onFile = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUrl = await resizeImage(file, 768, 0.8)
      setImage({ url: dataUrl, data: dataUrl.split(',')[1], mediaType: 'image/jpeg' })
    } catch {
      setError('לא הצלחנו לקרוא את התמונה.')
    }
  }

  const clear = async () => {
    if (!(await askConfirm({ title: 'להתחיל שיחה חדשה?', message: 'השיחה הנוכחית תימחק.', confirmText: 'מחיקה', danger: true }))) return
    abortRef.current?.abort()
    setMessages([])
    saveChat([])
  }

  const last = messages[messages.length - 1]
  const waiting = busy && last?.role === 'assistant' && !last.text

  return (
    <div className="pb-24">
      {messages.length === 0 ? (
        <div className="space-y-4">
          <div className="card text-center space-y-2 py-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-mint-50 grid place-items-center text-4xl">🧑‍🌾</div>
            <p className="font-extrabold text-forest text-lg">שלום! אני המומחה לצמחים שלך</p>
            <p className="text-sm text-stone-500 px-2">
              שאלו אותי כל דבר: השקיה, מזיקים, דישון, ריבוי, מה לשתול ומתי. אפשר גם לצרף תמונה.
              {plants.length > 0 && ` אני מכיר את ${plants.length} הצמחים שלכם.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)} className="rounded-2xl bg-white border border-mint-100 px-3.5 py-2 text-sm text-right text-forest shadow-sm active:scale-95 transition">
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={clear} className="text-xs text-stone-400 underline">שיחה חדשה</button>
          </div>
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
              {m.role === 'assistant' && <span className="order-last mr-2 mt-1 w-8 h-8 shrink-0 rounded-full bg-mint-100 grid place-items-center text-base">🧑‍🌾</span>}
              <div
                className={`max-w-[85%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed ${
                  m.role === 'user' ? 'bg-mint-500 text-white rounded-tr-md' : 'bg-white text-stone-800 shadow-sm border border-emerald-900/5 rounded-tl-md'
                }`}
              >
                {m.image && <img src={m.image.url} alt="" className="mb-2 w-48 max-w-full rounded-2xl" />}
                {m.role === 'user' ? <p className="whitespace-pre-wrap">{m.text}</p>
                  : m.text ? <RichText text={m.text} />
                    : <span className="flex gap-1 py-1.5" aria-label="מקליד">{[0, 1, 2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-mint-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      {error && <div className="mt-3 p-3 rounded-2xl bg-red-100 text-red-800 text-sm">{error}</div>}

      <div className="fixed z-10 inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+68px)] px-3 pb-2 pt-2 bg-gradient-to-t from-[#f6faf8] via-[#f6faf8] to-transparent">
        <div className="max-w-xl mx-auto">
          {image && (
            <div className="relative inline-block mb-2">
              <img src={image.url} alt="" className="w-20 h-20 object-cover rounded-2xl border-2 border-white shadow" />
              <button onClick={() => setImage(null)} aria-label="הסרת תמונה" className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-stone-800 text-white text-xs">✕</button>
            </div>
          )}
          <div className="flex items-end gap-2 rounded-3xl bg-white border border-stone-200 shadow-sm p-1.5">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            <button onClick={() => fileRef.current.click()} aria-label="צירוף תמונה" className="shrink-0 w-10 h-10 rounded-full grid place-items-center text-xl hover:bg-mint-50">📷</button>
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="שאלו על צמחים…"
              className="flex-1 resize-none bg-transparent outline-none py-2 text-[15px] max-h-[120px]"
            />
            {busy ? (
              <button onClick={() => abortRef.current?.abort()} aria-label="עצירה" className="shrink-0 w-10 h-10 rounded-full bg-stone-800 text-white grid place-items-center">■</button>
            ) : (
              <button onClick={() => send()} disabled={!text.trim() && !image} aria-label="שליחה" className="shrink-0 w-10 h-10 rounded-full bg-mint-500 text-white grid place-items-center disabled:opacity-40">
                <svg viewBox="0 0 24 24" className="w-5 h-5 -scale-x-100" fill="currentColor" aria-hidden="true"><path d="M3 20.5 21 12 3 3.5l2.5 8.5zM5.5 12H13" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
      {waiting && <span className="sr-only">המומחה חושב…</span>}
    </div>
  )
}
