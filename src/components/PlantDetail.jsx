import { useRef, useState } from 'react'
import ResultView, { CareGuide, HealthBadge } from './ResultView.jsx'
import { BackIcon, CalendarIcon, CameraIcon, CheckIcon, PinIcon } from './Icons.jsx'
import { formatDate, formatShortDate } from '../lib/labels.js'
import { TASKS, completeTask, dueLabel, newId, plantPhoto, taskStatus } from '../lib/storage.js'
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
        {st && (
          <button onClick={() => downloadTaskIcs(plant, type)} className="mr-auto flex items-center gap-1.5 text-mint-600 font-bold">
            <CalendarIcon className="w-4 h-4" /> הוסף ליומן
          </button>
        )}
      </div>
    </div>
  )
}

const ENTRY = {
  water: { icon: '💧', text: 'הושקה' },
  fertilize: { icon: '🧪', text: 'דושן' },
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
      alert('לא הצלחנו לקרוא את התמונה.')
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

export default function PlantDetail({ plant, onBack, onUpdate, onDelete, onRescan }) {
  const [tab, setTab] = useState('care')
  const [scanIdx, setScanIdx] = useState(0)
  const scan = plant.scans[scanIdx] || plant.scans[0]
  const care = plant.scans[0]?.result?.care
  const id = plant.scans[0]?.result?.identification

  return (
    <div className="space-y-4">
      <div className="relative -mx-4 -mt-4">
        <img src={plantPhoto(plant)} alt="" className="w-full h-72 object-cover bg-mint-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        <button onClick={onBack} aria-label="חזרה" className="absolute top-[max(env(safe-area-inset-top),12px)] right-4 w-10 h-10 rounded-full bg-white/90 text-forest grid place-items-center shadow">
          <BackIcon className="w-5 h-5" />
        </button>
        <div className="absolute bottom-4 inset-x-4 text-white">
          <h2 className="text-3xl font-extrabold drop-shadow">{plant.name}</h2>
          {id?.scientific_name && <p className="italic text-white/80" dir="ltr" style={{ textAlign: 'right' }}>{id.scientific_name}</p>}
          <p className="mt-1 flex items-center gap-1.5 text-sm"><PinIcon className="w-4 h-4" />{plant.site}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-mint-100/70 text-sm">
        {[['care', 'טיפול'], ['journal', 'יומן'], ['health', 'בריאות'], ['guide', 'מדריך']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`py-2 rounded-xl font-bold transition ${tab === k ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'care' && (
        <div className="space-y-3">
          <TaskCard plant={plant} type="water" onUpdate={onUpdate} />
          <TaskCard plant={plant} type="fertilize" onUpdate={onUpdate} />
          {care?.water && <p className="text-sm text-stone-500 px-1">💡 {care.water}</p>}
          <button className="btn-ghost w-full" onClick={onRescan}><CameraIcon className="w-5 h-5" /> סריקת בריאות חדשה</button>
          <button
            className="w-full text-sm text-red-600 py-3"
            onClick={() => confirm(`למחוק את "${plant.name}" מהאוסף?`) && onDelete()}
          >
            🗑️ מחיקת הצמח
          </button>
        </div>
      )}

      {tab === 'journal' && <Journal plant={plant} onUpdate={onUpdate} />}

      {tab === 'health' && (
        <div className="space-y-4">
          <button className="btn-primary w-full" onClick={onRescan}><CameraIcon className="w-5 h-5" /> סריקת מעקב — איך הצמח עכשיו?</button>
          {plant.scans.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {plant.scans.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setScanIdx(i)}
                  className={`shrink-0 w-24 rounded-2xl border-2 overflow-hidden bg-white ${i === scanIdx ? 'border-mint-500' : 'border-transparent'}`}
                >
                  <img src={s.thumb} alt="" className="w-24 h-20 object-cover" />
                  <div className="text-[10px] py-1">{formatDate(s.date)}</div>
                </button>
              ))}
            </div>
          )}
          {scan && (
            <>
              <p className="text-xs text-stone-500 px-1">
                אבחון מתאריך {formatDate(scan.date)}{scan.notes ? ` · הערות: ${scan.notes}` : ''}
              </p>
              <ResultView result={scan.result} hideCare />
            </>
          )}
        </div>
      )}

      {tab === 'guide' && (care ? <CareGuide care={care} /> : <p className="text-center text-sm text-stone-500">אין עדיין מדריך לצמח הזה.</p>)}
    </div>
  )
}
