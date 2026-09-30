import { useEffect, useState } from 'react'
import ScanView from './components/ScanView.jsx'
import PlantList from './components/PlantList.jsx'
import PlantDetail from './components/PlantDetail.jsx'
import { loadPlants, savePlants } from './lib/storage.js'

export default function App() {
  const [plants, setPlants] = useState(loadPlants)
  const [tab, setTab] = useState(plants.length ? 'plants' : 'scan')
  const [openId, setOpenId] = useState(null)
  const [rescanId, setRescanId] = useState(null)
  const [storageError, setStorageError] = useState(false)

  useEffect(() => {
    setStorageError(!savePlants(plants))
  }, [plants])

  const updatePlant = (id, fn) => setPlants(ps => ps.map(p => (p.id === id ? fn(p) : p)))
  const openPlant = plants.find(p => p.id === openId)
  const rescanPlant = plants.find(p => p.id === rescanId)

  const goTab = t => {
    setTab(t)
    setOpenId(null)
    setRescanId(null)
  }

  return (
    <div className="min-h-screen max-w-xl mx-auto flex flex-col">
      <header className="sticky top-0 z-10 bg-green-800 text-white px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 shadow">
        <div className="flex items-center gap-2">
          <img src="/icon.svg" alt="" className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-extrabold leading-tight">צמחייה</h1>
            <p className="text-xs text-green-100">מזהים, מאבחנים ומגדלים נכון</p>
          </div>
        </div>
      </header>

      {storageError && (
        <div className="m-4 mb-0 p-3 rounded-xl bg-red-100 text-red-800 text-sm">
          לא ניתן לשמור בזיכרון הדפדפן (ייתכן שהאחסון מלא). מחקו סריקות ישנות.
        </div>
      )}

      <main className="flex-1 p-4 pb-28">
        {tab === 'scan' && (
          <ScanView
            key={rescanId || 'new'}
            targetPlant={rescanPlant}
            onSaveNew={plant => {
              setPlants(ps => [plant, ...ps])
              setTab('plants')
              setOpenId(plant.id)
            }}
            onSaveToPlant={(id, scan) => {
              updatePlant(id, p => ({ ...p, scans: [scan, ...p.scans].slice(0, 12) }))
              setRescanId(null)
              setTab('plants')
              setOpenId(id)
            }}
          />
        )}

        {tab === 'plants' && !openPlant && (
          <PlantList plants={plants} onOpen={setOpenId} onScan={() => goTab('scan')} />
        )}

        {tab === 'plants' && openPlant && (
          <PlantDetail
            plant={openPlant}
            onBack={() => setOpenId(null)}
            onUpdate={fn => updatePlant(openPlant.id, fn)}
            onDelete={() => {
              setPlants(ps => ps.filter(p => p.id !== openPlant.id))
              setOpenId(null)
            }}
            onRescan={() => {
              setRescanId(openPlant.id)
              setTab('scan')
            }}
          />
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-10 bg-white border-t border-stone-200 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-xl mx-auto grid grid-cols-2">
          {[
            ['scan', '📷', 'סריקה'],
            ['plants', '🪴', `הצמחים שלי${plants.length ? ` (${plants.length})` : ''}`],
          ].map(([id, icon, label]) => (
            <button
              key={id}
              onClick={() => goTab(id)}
              className={`py-3 flex flex-col items-center text-sm font-bold ${tab === id ? 'text-green-800' : 'text-stone-400'}`}
            >
              <span className="text-2xl">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
