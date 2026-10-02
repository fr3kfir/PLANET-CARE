import { useState } from 'react'
import { CanIcon, DotsIcon, PinIcon, PlusPlantIcon } from './Icons.jsx'
import { TASKS, allTasks, plantPhoto, taskStatus } from '../lib/storage.js'

export function WaterBadge({ plant }) {
  const w = taskStatus(plant, 'water')
  if (!w) return null
  if (w.dueInDays < 0) return <span className="text-xs font-bold text-red-600">💧 באיחור</span>
  if (w.dueInDays === 0) return <span className="text-xs font-bold text-sky-700">💧 להשקות היום</span>
  if (w.dueInDays === 1) return <span className="text-xs text-sky-700">💧 השקיה מחר</span>
  return <span className="text-xs text-stone-500">💧 בעוד {w.dueInDays} ימים</span>
}

function PlantMenu({ plant, onUpdate, onDelete, onClose }) {
  const act = fn => e => {
    e.stopPropagation()
    onClose()
    fn()
  }
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={e => { e.stopPropagation(); onClose() }} />
      <div className="absolute top-10 left-3 z-30 w-44 rounded-2xl bg-white shadow-xl border border-stone-100 py-1 text-sm text-right">
        <button className="block w-full px-4 py-2.5 hover:bg-mint-50 text-right" onClick={act(() => {
          const name = prompt('שם חדש לצמח:', plant.name)
          if (name?.trim()) onUpdate(p => ({ ...p, name: name.trim() }))
        })}>✏️ שינוי שם</button>
        <button className="block w-full px-4 py-2.5 hover:bg-mint-50 text-right" onClick={act(() => {
          const site = prompt('איפה הצמח נמצא? (למשל: סלון, מרפסת, חצר)', plant.site)
          if (site?.trim()) onUpdate(p => ({ ...p, site: site.trim() }))
        })}>📍 שינוי מיקום</button>
        <button className="block w-full px-4 py-2.5 hover:bg-red-50 text-red-600 text-right" onClick={act(() => {
          if (confirm(`למחוק את "${plant.name}" מהאוסף?`)) onDelete()
        })}>🗑️ מחיקה</button>
      </div>
    </>
  )
}

function PlantCard({ plant, onOpen, onUpdate, onDelete }) {
  const [menu, setMenu] = useState(false)
  const scientific = plant.scans[0]?.result?.identification?.scientific_name
  const due = taskStatus(plant, 'water')
  return (
    <div className="relative">
      <button onClick={onOpen} className="card w-full p-3 flex gap-4 text-right items-center">
        <div className="relative shrink-0">
          <img src={plantPhoto(plant)} alt="" className="w-28 h-28 rounded-2xl object-cover bg-mint-50" />
          {due && due.dueInDays <= 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-sky-500 text-white text-xs grid place-items-center ring-2 ring-white">💧</span>
          )}
        </div>
        <div className="flex-1 min-w-0 py-1 pl-6">
          <div className="text-lg font-extrabold text-stone-900 truncate">{plant.name}</div>
          {scientific && <div className="text-sm italic text-stone-400 truncate" dir="ltr" style={{ textAlign: 'right' }}>{scientific}</div>}
          <div className="mt-2.5 space-y-1 text-[15px] text-stone-600">
            <div className="flex items-center gap-2"><PinIcon className="w-4 h-4 text-stone-300" />{plant.site}</div>
            {plant.waterEveryDays && (
              <div className="flex items-center gap-2"><CanIcon className="w-4 h-4 text-stone-300" />כל {plant.waterEveryDays} ימים</div>
            )}
          </div>
        </div>
      </button>
      <button
        aria-label="אפשרויות"
        onClick={() => setMenu(m => !m)}
        className="absolute top-2 left-2 p-2 text-stone-300 hover:text-stone-500"
      >
        <DotsIcon className="w-5 h-5" />
      </button>
      {menu && <PlantMenu plant={plant} onUpdate={onUpdate} onDelete={onDelete} onClose={() => setMenu(false)} />}
    </div>
  )
}

export default function PlantList({ plants, onOpen, onScan, onUpdate, onDelete }) {
  const [view, setView] = useState('plants')
  const [site, setSite] = useState(null)

  const sites = [...new Set(plants.map(p => p.site))]
  const shown = site ? plants.filter(p => p.site === site) : plants

  return (
    <div className="space-y-5">
      <div className="segmented">
        <button aria-pressed={view === 'plants'} onClick={() => setView('plants')}>צמחים</button>
        <button aria-pressed={view === 'sites'} onClick={() => { setView('sites'); setSite(null) }}>מקומות</button>
      </div>

      {!plants.length && (
        <div className="card text-center py-10 space-y-3">
          <div className="text-5xl">🪴</div>
          <p className="font-bold">עוד אין צמחים באוסף</p>
          <p className="text-sm text-stone-500">צלמו את הצמח הראשון שלכם ונזהה אותו, נבדוק את מצבו ונבנה לו לוח טיפולים.</p>
          <button className="btn-primary" onClick={onScan}>📷 הוספת צמח ראשון</button>
        </div>
      )}

      {view === 'sites' && !site && (
        <div className="grid grid-cols-2 gap-3">
          {sites.map(s => {
            const inSite = plants.filter(p => p.site === s)
            const due = allTasks(inSite).filter(t => t.dueInDays <= 0)
            const byType = Object.keys(TASKS).map(type => [type, due.filter(t => t.type === type).length]).filter(([, n]) => n)
            return (
              <button key={s} onClick={() => { setSite(s); setView('plants') }} className="card p-3 text-right">
                <div className="grid grid-cols-2 grid-rows-2 gap-1 rounded-2xl overflow-hidden aspect-square bg-mint-50">
                  {inSite.slice(0, 4).map((p, i) => {
                    const span = inSite.length === 1 ? 'col-span-2 row-span-2' : inSite.length === 2 || (inSite.length === 3 && i === 0) ? 'row-span-2' : ''
                    return <img key={p.id} src={plantPhoto(p)} alt="" className={`w-full h-full min-h-0 object-cover ${span}`} />
                  })}
                </div>
                <div className="mt-2 font-extrabold text-stone-900 flex items-center gap-1.5"><PinIcon className="w-4 h-4 text-mint-500" />{s}</div>
                <div className="text-sm text-stone-500">{inSite.length === 1 ? 'צמח אחד' : `${inSite.length} צמחים`}</div>
                <div className={`mt-1.5 text-xs font-bold ${due.length ? 'text-mint-600' : 'text-stone-400'}`}>
                  {due.length ? `${due.length} משימות היום` : '✓ אין משימות היום'}
                </div>
                {byType.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {byType.map(([type, n]) => (
                      <span key={type} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TASKS[type].color}`}>{TASKS[type].icon} {n}</span>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {view === 'plants' && (
        <>
          {site && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-mint-100 text-forest font-bold text-sm px-3 py-1.5 flex items-center gap-1.5">
                <PinIcon className="w-4 h-4" />{site}
              </span>
              <button className="text-sm text-stone-500 underline" onClick={() => setSite(null)}>הצג הכול</button>
            </div>
          )}
          <div className="space-y-4">
            {shown.map(p => (
              <PlantCard
                key={p.id}
                plant={p}
                onOpen={() => onOpen(p.id)}
                onUpdate={fn => onUpdate(p.id, fn)}
                onDelete={() => onDelete(p.id)}
              />
            ))}
          </div>
        </>
      )}

      <button
        aria-label="הוספת צמח"
        onClick={onScan}
        className="fixed z-10 left-[max(1.25rem,calc(50%-18rem+1.25rem))] bottom-[calc(env(safe-area-inset-bottom)+92px)] w-16 h-16 rounded-full bg-mint-500 text-white shadow-[0_8px_24px_rgba(34,181,127,.45)] grid place-items-center active:scale-95 transition"
      >
        <PlusPlantIcon className="w-8 h-8" />
      </button>
    </div>
  )
}
