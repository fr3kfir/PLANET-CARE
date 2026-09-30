import { HealthBadge } from './ResultView.jsx'
import { LOCATIONS } from '../lib/labels.js'
import { wateringStatus } from '../lib/storage.js'

export function WaterBadge({ plant }) {
  const w = wateringStatus(plant)
  if (!w) return null
  if (w.dueInDays <= 0) return <span className="text-xs font-bold text-sky-700">💧 להשקות היום</span>
  if (w.dueInDays === 1) return <span className="text-xs text-sky-700">💧 השקיה מחר</span>
  return <span className="text-xs text-stone-500">💧 בעוד {w.dueInDays} ימים</span>
}

export default function PlantList({ plants, onOpen, onScan }) {
  if (!plants.length) {
    return (
      <div className="card text-center py-10 space-y-3">
        <div className="text-5xl">🪴</div>
        <p className="font-bold">עוד אין צמחים באוסף</p>
        <p className="text-sm text-stone-500">סרקו את הצמח הראשון שלכם ושמרו אותו כדי לעקוב אחרי ההשקיה והבריאות שלו.</p>
        <button className="btn-primary" onClick={onScan}>📷 לסריקה ראשונה</button>
      </div>
    )
  }

  const thirsty = plants.filter(p => (wateringStatus(p)?.dueInDays ?? 1) <= 0)
  const sick = plants.filter(p => p.scans[0]?.result?.health?.status !== 'healthy')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="card p-3"><div className="text-2xl font-extrabold">{plants.length}</div><div className="text-xs text-stone-500">צמחים</div></div>
        <div className="card p-3"><div className="text-2xl font-extrabold text-sky-700">{thirsty.length}</div><div className="text-xs text-stone-500">להשקות היום</div></div>
        <div className="card p-3"><div className="text-2xl font-extrabold text-amber-600">{sick.length}</div><div className="text-xs text-stone-500">דורשים טיפול</div></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {plants.map(p => {
          const last = p.scans[0]
          const loc = LOCATIONS.find(l => l.id === p.location)
          return (
            <button key={p.id} onClick={() => onOpen(p.id)} className="card p-0 overflow-hidden text-right">
              <img src={last?.thumb} alt="" className="w-full aspect-square object-cover bg-stone-100" />
              <div className="p-3 space-y-1">
                <div className="font-bold truncate">{p.name}</div>
                <div className="text-xs text-stone-500">{loc?.icon} {loc?.label}</div>
                {last?.result?.health && <HealthBadge status={last.result.health.status} />}
                <div><WaterBadge plant={p} /></div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
