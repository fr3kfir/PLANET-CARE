import { useState } from 'react'
import ResultView, { HealthBadge } from './ResultView.jsx'
import { WaterBadge } from './PlantList.jsx'
import { formatDate, LOCATIONS } from '../lib/labels.js'
import { wateringStatus } from '../lib/storage.js'

export default function PlantDetail({ plant, onBack, onUpdate, onDelete, onRescan }) {
  const [scanIdx, setScanIdx] = useState(0)
  const scan = plant.scans[scanIdx] || plant.scans[0]
  const w = wateringStatus(plant)

  const rename = () => {
    const name = prompt('שם חדש לצמח:', plant.name)
    if (name?.trim()) onUpdate(p => ({ ...p, name: name.trim() }))
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm font-bold text-green-800">→ חזרה לצמחים שלי</button>

      <div className="card flex gap-3 items-center">
        <img src={plant.scans[0]?.thumb} alt="" className="w-20 h-20 rounded-xl object-cover" />
        <div className="flex-1 min-w-0">
          <button onClick={rename} className="text-xl font-extrabold truncate block text-right">{plant.name} ✏️</button>
          <p className="text-xs text-stone-500 italic" dir="ltr">{plant.scans[0]?.result?.identification?.scientific_name}</p>
          <select
            value={plant.location}
            onChange={e => onUpdate(p => ({ ...p, location: e.target.value }))}
            className="mt-1 text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white"
          >
            {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.icon} {l.label}</option>)}
          </select>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold">💧 השקיה</h3>
          <WaterBadge plant={plant} />
        </div>
        <div className="text-sm text-stone-600 space-y-1">
          <div>השקיה אחרונה: {plant.lastWatered ? formatDate(plant.lastWatered) : 'עוד לא נרשמה'}</div>
          {w?.next && <div>ההשקיה הבאה: {formatDate(w.next)}</div>}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span>להשקות כל</span>
          <input
            type="number"
            min="1"
            max="60"
            value={plant.waterEveryDays || ''}
            onChange={e => onUpdate(p => ({ ...p, waterEveryDays: Number(e.target.value) || null }))}
            className="w-16 border border-stone-200 rounded-lg px-2 py-1 text-center"
          />
          <span>ימים</span>
        </div>
        <button
          className="btn-primary w-full bg-sky-600 hover:bg-sky-700"
          onClick={() => onUpdate(p => ({ ...p, lastWatered: new Date().toISOString() }))}
        >
          💧 השקיתי עכשיו
        </button>
      </div>

      <button className="btn-ghost w-full" onClick={onRescan}>📷 סריקת מעקב — איך הצמח עכשיו?</button>

      {plant.scans.length > 1 && (
        <div className="card">
          <h3 className="font-extrabold mb-3">📅 היסטוריית סריקות</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {plant.scans.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setScanIdx(i)}
                className={`shrink-0 w-24 rounded-xl border-2 overflow-hidden ${i === scanIdx ? 'border-green-600' : 'border-transparent'}`}
              >
                <img src={s.thumb} alt="" className="w-24 h-20 object-cover" />
                <div className="text-[10px] py-1">{formatDate(s.date)}</div>
                <div className="pb-1 scale-75"><HealthBadge status={s.result.health.status} /></div>
              </button>
            ))}
          </div>
        </div>
      )}

      {scan && (
        <>
          <p className="text-xs text-stone-500 px-1">
            אבחון מתאריך {formatDate(scan.date)}{scan.notes ? ` · הערות: ${scan.notes}` : ''}
          </p>
          <ResultView result={scan.result} />
        </>
      )}

      <button
        className="w-full text-sm text-red-600 py-3"
        onClick={() => confirm(`למחוק את "${plant.name}" מהאוסף?`) && onDelete()}
      >
        🗑️ מחיקת הצמח
      </button>
    </div>
  )
}
