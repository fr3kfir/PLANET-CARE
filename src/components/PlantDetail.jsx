import { useRef, useState } from 'react'
import ResultView, { CareGuide, HealthBadge } from './ResultView.jsx'
import { BackIcon, CalendarIcon, CameraIcon, CheckIcon, PinIcon } from './Icons.jsx'
import { STATUS, formatDate, formatShortDate } from '../lib/labels.js'
import { SEASON_LABEL, TASKS, applySeasonPlan, completeTask, currentSeason, dueLabel, newId, plantPhoto, taskStatus } from '../lib/storage.js'
import LightMeter, { LIGHT_LEVELS } from './LightMeter.jsx'
import PlantTips from './PlantTips.jsx'
import { IS_ARTIFACT } from '../lib/platform.js'
import { askConfirm, notify } from './Dialogs.jsx'
import { downloadTaskIcs } from '../lib/reminders.js'
import { resizeImage, thumbnailFromDataUrl } from '../lib/image.js'

function TaskCard({ plant, type, onUpdate }) {
  const t = TASKS[type]
  const st = taskStatus(plant, type)
  const late = st && st.dueInDays < 0
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <span className={`w-11 h-11 rounded-2xl grid place-items-center text-xl shrink-0 ${t.color}`}>{t.icon}</span>
        <div className="flex-1">
          <div className="font-extrabold text-stone-900">{t.label}</div>
          <div className="text-sm text-stone-500">
            {st ? (
              <>הבא: <span className={late ? 'text-red-600 font-bold' : st.dueInDays === 0 ? 'text-mint-600 font-bold' : ''}>{dueLabel(st.dueInDays)}</span>
                {plant[t.last] && <> · אחרון {formatShortDate(plant[t.last])}</>}</>
            ) : 'ללא תזכורת'}
          </div>
        </div>
        {st && (
          <button
            aria-label={`${t.label} בוצע`}
            onClick={() => onUpdate(p => completeTask(p, type))}
            className="w-11 h-11 rounded-full bg-mint-500 text-white grid place-items-center active:scale-90 transition shadow"
          >
            <CheckIcon className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span>כל</span>
        <input
          type="number"
          min="0"
          max="120"
          inputMode="numeric"
          value={plant[t.every] || ''}
          placeholder="—"
          onChange={e => onUpdate(p => ({ ...p, [t.every]: Number(e.target.value) || null }))}
          className="w-16 border border-stone-200 rounded-xl px-2 py-1.5 text-center"
        />
        <span>ימים</span>
        {!['water', 'fertilize'].includes(type) && (
          <button onClick={() => onUpdate(p => ({ ...p, [t.every]: null }))} className="text-stone-400 underline">הסרה</button>
        )}
        {st && (
          <button onClick={() => downloadTaskIcs(plant, type)} className="mr-auto flex items-center gap-1.5 text-mint-600 font-bold">
            <CalendarIcon className="w-4 h-4" /> הוסף ליומן
          </button>
        )}
      </div>
    </div>
  )
}

// Optional tasks the plant doesn't have yet, with a sensible default interval.
function AddTask({ plant, onUpdate }) {
  const care = plant.scans[0]?.result?.care
  const DEFAULTS = { mist: 3, prune: 60, repot: 365 }
  const missing = Object.keys(DEFAULTS).filter(type => !plant[TASKS[type].every])
  if (!missing.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <span className="text-sm text-stone-500">הוספת תזכורת:</span>
      {missing.map(type => (
        <button
          key={type}
          onClick={() => onUpdate(p => ({ ...p, [TASKS[type].every]: care?.[TASKS[type].care] || DEFAULTS[type], [TASKS[type].last]: p[TASKS[type].last] || new Date().toISOString() }))}
          className="rounded-full border border-mint-200 bg-white px-3 py-1.5 text-sm font-bold text-forest"
        >
          + {TASKS[type].icon} {TASKS[type].label}
        </button>
      ))}
    </div>
  )
}

function SeasonPlan({ plant, onUpdate }) {
  const plan = plant.scans[0]?.result?.care?.seasonal_plan
  if (!plan) return null
  const season = currentSeason()
  const auto = plant.autoSeason !== false
  const row = s => ['water', 'fertilize', 'mist']
    .filter(type => plan[s][TASKS[type].care])
    .map(type => `${TASKS[type].icon} כל ${plan[s][TASKS[type].care]}`)
    .join('  ·  ') || '—'
  return (
    <div className="card bg-gradient-to-l from-mint-50 to-white space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-extrabold text-forest">🗓️ תוכנית טיפול עונתית</div>
          <div className="text-xs text-stone-500">מותאמת ל{plant.site} ולאקלים בישראל</div>
        </div>
        <button
          role="switch"
          aria-checked={auto}
          aria-label="עדכון אוטומטי לפי עונה"
          onClick={() => onUpdate(p => (auto ? { ...p, autoSeason: false } : applySeasonPlan({ ...p, autoSeason: true, seasonApplied: null })))}
          className={`shrink-0 w-12 h-7 rounded-full p-0.5 transition ${auto ? 'bg-mint-500' : 'bg-stone-200'}`}
        >
          <span className={`block w-6 h-6 rounded-full bg-white shadow transition ${auto ? '-translate-x-5' : ''}`} />
        </button>
      </div>
      {['warm', 'cool'].map(s => (
        <div key={s} className={`rounded-2xl px-3 py-2 text-sm ${s === season ? 'bg-white border border-mint-200' : 'text-stone-500'}`}>
          <div className="font-bold">{s === 'warm' ? '☀️' : '❄️'} {SEASON_LABEL[s]}{s === season && ' · עכשיו'}</div>
          <div>{row(s)} ימים</div>
        </div>
      ))}
      <p className="text-xs text-stone-500">{auto ? 'הלוח מתעדכן לבד כשמתחלפת העונה.' : 'עדכון אוטומטי כבוי — הלוח נשאר כפי שקבעתם.'}</p>
    </div>
  )
}

function LightCard({ plant, onMeasure }) {
  const care = plant.scans[0]?.result?.care
  const need = LIGHT_LEVELS.find(l => l.id === care?.light_level)
  return (
    <div className="card flex items-center gap-3">
      <span className="w-11 h-11 rounded-2xl grid place-items-center text-xl shrink-0 bg-amber-50">☀️</span>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-stone-900">אור{need && `: ${need.label}`}</div>
        <div className="text-sm text-stone-500 line-clamp-2">{need?.hint || care?.light || 'בדקו אם המקום מואר מספיק'}</div>
      </div>
      {onMeasure && <button onClick={onMeasure} className="shrink-0 rounded-2xl bg-amber-400 text-stone-900 font-bold px-3 py-2 text-sm">מד אור</button>}
    </div>
  )
}

const ENTRY = {
  ...Object.fromEntries(Object.entries(TASKS).map(([k, t]) => [k, { icon: t.icon, text: t.done }])),
  season: { icon: '🗓️' },
  note: { icon: '📝' },
  photo: { icon: '📸' },
  scan: { icon: '🩺' },
}

function Journal({ plant, onUpdate }) {
  const photoRef = useRef(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const add = entry => onUpdate(p => ({ ...p, journal: [{ id: newId(), date: new Date().toISOString(), ...entry }, ...p.journal] }))

  const onPhoto = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const thumb = await thumbnailFromDataUrl(await resizeImage(file), 480)
      add({ type: 'photo', thumb, text: note.trim() })
      setNote('')
    } catch {
      notify({ title: 'לא הצלחנו לקרוא את התמונה', message: 'נסו תמונה אחרת (JPG או PNG).' })
    } finally {
      setBusy(false)
    }
  }

  // Scans are part of the plant's story too: merge them into the timeline.
  const entries = [
    ...plant.journal,
    ...plant.scans.map(s => ({ id: s.id, date: s.date, type: 'scan', thumb: s.thumb, status: s.result?.health?.status, text: s.result?.health?.summary })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder="מה חדש? עלה חדש, פריחה, העברה לעציץ גדול..."
          className="w-full rounded-2xl border border-stone-200 p-3 text-sm focus:outline-mint-500"
        />
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-primary py-2.5" disabled={!note.trim()} onClick={() => { add({ type: 'note', text: note.trim() }); setNote('') }}>📝 הוספת הערה</button>
          <button className="btn-ghost py-2.5" disabled={busy} onClick={() => photoRef.current.click()}>{busy ? '...' : '📸 תמונת התקדמות'}</button>
        </div>
      </div>

      {entries.length === 0 && <p className="text-center text-sm text-stone-500">היומן ריק. השקיה, דישון והערות יופיעו כאן.</p>}

      <ol className="relative border-r-2 border-mint-100 mr-4 space-y-4">
        {entries.map(e => (
          <li key={e.id} className="relative pr-6">
            <span className="absolute -right-[15px] top-1 w-7 h-7 rounded-full bg-white border-2 border-mint-100 grid place-items-center text-sm">{ENTRY[e.type]?.icon}</span>
            <div className="text-xs text-stone-400">{formatDate(e.date)}</div>
            <div className="text-sm text-stone-800">
              {e.type === 'scan' ? <span className="font-bold">סריקת בריאות</span> : ENTRY[e.type]?.text && <span className="font-bold">{ENTRY[e.type].text}</span>}
              {e.status && <span className="mr-2 inline-block scale-90 origin-right"><HealthBadge status={e.status} /></span>}
              {e.text && <p className="mt-0.5 whitespace-pre-line">{e.text}</p>}
            </div>
            {e.thumb && <img src={e.thumb} alt="" className="mt-2 w-40 h-40 object-cover rounded-2xl" />}
          </li>
        ))}
      </ol>
    </div>
  )
}

const DIFFICULTY = { easy: 'קל לגידול', medium: 'בינוני', hard: 'מאתגר' }

// The quick facts strip under the plant's name, in the order a grower checks them.
function FactChips({ plant, care }) {
  const light = LIGHT_LEVELS.find(l => l.id === care?.light_level)
  const every = plant.waterEveryDays
  const water = every ? (every <= 4 ? 'השקיה גבוהה' : every <= 9 ? 'השקיה בינונית' : 'השקיה נמוכה') : null
  const toxic = typeof care?.toxic_to_pets === 'boolean'
    ? care.toxic_to_pets
    : care?.pet_toxicity ? /רעיל/.test(care.pet_toxicity) && !/לא רעיל|אינו רעיל|בטוח/.test(care.pet_toxicity) : null
  const chips = [
    ['📍', plant.site],
    ['☀️', light?.label],
    ['🌱', DIFFICULTY[care?.difficulty]],
    ['💧', water],
    [toxic ? '⚠️' : '🐾', toxic === null ? null : toxic ? 'רעיל לחיות מחמד' : 'בטוח לחיות מחמד'],
  ].filter(([, label]) => label)
  return (
    <div className="grid grid-cols-2 gap-2">
      {chips.map(([icon, label], i) => (
        <div key={i} className={`flex items-center gap-2 rounded-2xl bg-mint-50 px-3 py-2.5 text-sm font-bold text-stone-700 ${chips.length % 2 && i === chips.length - 1 ? 'col-span-2' : ''}`}>
          <span className="text-base">{icon}</span>{label}
        </div>
      ))}
    </div>
  )
}

function HealthCard({ plant, onRescan }) {
  const [open, setOpen] = useState(false)
  const [scanIdx, setScanIdx] = useState(0)
  const last = plant.scans[0]
  const health = last?.result?.health
  const scan = plant.scans[scanIdx] || last
  return (
    <div className="card space-y-3">
      <h3 className="text-lg font-extrabold text-stone-900">בריאות הצמח</h3>
      <div className="flex items-center gap-3">
        <span className={`w-12 h-12 rounded-full grid place-items-center text-xl ${health ? STATUS[health.status]?.cls || 'bg-mint-50' : 'bg-stone-100'}`}>
          {health ? (health.status === 'healthy' ? '🌿' : health.status === 'critical' ? '🥀' : '🍂') : '❔'}
        </span>
        <div>
          <div className="font-extrabold text-stone-900">מצב נוכחי: {health ? STATUS[health.status]?.label : 'לא אובחן'}</div>
          <div className="text-sm text-stone-500">{last ? `סריקה אחרונה ${formatDate(last.date)}${health ? ` · ציון ${health.score}` : ''}` : 'עוד לא נסרק'}</div>
        </div>
      </div>
      <button className="btn-primary w-full" onClick={onRescan}><CameraIcon className="w-5 h-5" /> אבחון אוטומטי</button>
      {last && (
        <button className="w-full text-sm font-bold text-mint-600" onClick={() => setOpen(o => !o)}>
          {open ? 'הסתרת פרטי האבחון' : 'פרטי האבחון האחרון ←'}
        </button>
      )}
      {open && (
        <div className="space-y-3">
          {plant.scans.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {plant.scans.map((s, i) => (
                <button key={s.id} onClick={() => setScanIdx(i)} className={`shrink-0 w-24 rounded-2xl border-2 overflow-hidden bg-white ${i === scanIdx ? 'border-mint-500' : 'border-transparent'}`}>
                  {s.thumb && <img src={s.thumb} alt="" className="w-24 h-20 object-cover" />}
                  <div className="text-[10px] py-1">{formatDate(s.date)}</div>
                </button>
              ))}
            </div>
          )}
          {scan?.result && <ResultView result={scan.result} hideCare />}
        </div>
      )}
    </div>
  )
}

const TAB_ALIASES = { care: 'overview', guide: 'info', health: 'overview' }

export default function PlantDetail({ plant, onBack, onUpdate, onDelete, onRescan, onAsk, onOpenArticle, locked, initialTab = 'overview' }) {
  const [tab, setTab] = useState(TAB_ALIASES[initialTab] || initialTab)
  const [meter, setMeter] = useState(false)
  const care = plant.scans[0]?.result?.care
  const id = plant.scans[0]?.result?.identification
  const genus = id?.scientific_name?.split(' ')[0]
  const otherNames = [id?.common_name_en, ...(id?.alternatives || [])].filter(Boolean).slice(0, 4)

  return (
    <div className="space-y-4">
      <div className="relative -mx-4 -mt-4">
        <img src={plantPhoto(plant)} alt="" className="w-full h-64 object-cover bg-mint-50" />
        <button onClick={onBack} aria-label="חזרה" className="absolute top-[max(env(safe-area-inset-top),12px)] right-4 w-10 h-10 rounded-full bg-white/90 text-forest grid place-items-center shadow">
          <BackIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="relative -mx-4 -mt-12 rounded-t-[28px] bg-white px-4 pt-5 pb-4 space-y-3 shadow-[0_-6px_20px_rgba(16,80,60,.08)]">
        <div>
          <h2 className="text-3xl font-extrabold text-stone-900 leading-tight">{plant.name}</h2>
          {id?.family && <p className="text-sm text-stone-400">ממשפחת <i dir="ltr">{id.family}</i>{genus ? <>, סוג <i dir="ltr">{genus}</i></> : null}</p>}
          {otherNames.length > 0 && <p className="text-sm text-stone-600 mt-1"><b>שמות נוספים:</b> {otherNames.join(', ')}</p>}
          {id?.scientific_name && <p className="text-sm text-stone-600"><b>שם בוטני:</b> <i dir="ltr">{id.scientific_name}</i></p>}
        </div>
        <FactChips plant={plant} care={care} />
      </div>

      <div className="flex gap-6 border-b border-stone-200 px-1">
        {[['overview', 'סקירה'], ['info', 'מידע על הצמח'], ['journal', 'יומן']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`pb-2 -mb-px font-extrabold transition border-b-[3px] ${tab === k ? 'border-mint-500 text-forest' : 'border-transparent text-stone-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <HealthCard plant={plant} onRescan={onRescan} />

          <section className="space-y-3">
            <h3 className="text-lg font-extrabold text-stone-900 px-1">לוח טיפול</h3>
            {Object.keys(TASKS).filter(type => ['water', 'fertilize'].includes(type) || plant[TASKS[type].every]).map(type => (
              <TaskCard key={type} plant={plant} type={type} onUpdate={onUpdate} />
            ))}
            <AddTask plant={plant} onUpdate={onUpdate} />
          </section>

          <button onClick={onAsk} className="card w-full flex items-center gap-3 text-right">
            <span className="w-14 h-14 rounded-full bg-gradient-to-br from-mint-200 to-amber-100 grid place-items-center text-2xl shrink-0">🧑‍🌾</span>
            <span className="flex-1 min-w-0">
              <span className="block font-extrabold text-stone-900">צריכים עזרה נוספת עם הצמח?</span>
              <span className="block text-sm text-stone-500">שאלו את המומחה וקבלו פתרון מדויק לבעיה</span>
            </span>
            <span className="text-stone-300 text-xl">‹</span>
          </button>

          <section className="card space-y-3">
            <h3 className="text-lg font-extrabold text-stone-900">תוכנית הטיפול מבוססת על</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-mint-50 p-3">
                <div className="font-extrabold text-stone-800">{currentSeason() === 'warm' ? '☀️ עונה חמה' : '❄️ עונה קרירה'}</div>
                <div className="text-xs text-stone-500">עונה</div>
              </div>
              <div className="rounded-2xl bg-mint-50 p-3">
                <div className="font-extrabold text-stone-800 truncate">📍 {plant.site}</div>
                <div className="text-xs text-stone-500">מיקום</div>
              </div>
            </div>
            <SeasonPlan plant={plant} onUpdate={onUpdate} />
          </section>

          <button
            className="w-full text-sm text-red-600 py-3"
            onClick={async () => (await askConfirm({ title: `למחוק את "${plant.name}"?`, message: 'הצמח, היומן וההיסטוריה שלו יימחקו.', confirmText: 'מחיקה', danger: true })) && onDelete()}
          >
            🗑️ מחיקת הצמח
          </button>
        </div>
      )}

      {tab === 'info' && (
        <div className="space-y-4">
          <PlantTips plant={plant} onUpdate={onUpdate} onOpenArticle={onOpenArticle} locked={locked} />
          {care && <CareGuide care={care} />}
          <LightCard plant={plant} onMeasure={IS_ARTIFACT ? null : () => setMeter(true)} />
        </div>
      )}

      {tab === 'journal' && <Journal plant={plant} onUpdate={onUpdate} />}

      {meter && <LightMeter plant={plant} onClose={() => setMeter(false)} />}
    </div>
  )
}
