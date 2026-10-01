import { useCallback, useEffect, useState } from 'react'
import ScanView from './components/ScanView.jsx'
import PlantList from './components/PlantList.jsx'
import PlantDetail from './components/PlantDetail.jsx'
import Reminders from './components/Reminders.jsx'
import CareGuides from './components/CareGuides.jsx'
import Chat from './components/Chat.jsx'
import { BookIcon, ChatIcon, ClockIcon, KitIcon, LeafIcon, SearchIcon } from './components/Icons.jsx'
import { allTasks, completeTask, loadPlants, savePlants } from './lib/storage.js'
import { notifyDueTasks } from './lib/reminders.js'

const TABS = [
  { id: 'reminders', label: 'תזכורות', Icon: ClockIcon, title: 'תזכורות', sub: 'מה הצמחים צריכים היום' },
  { id: 'diagnose', label: 'אבחון', Icon: KitIcon, title: 'אבחון', sub: 'מגלים מה מציק לצמח ואיך מטפלים' },
  { id: 'identify', label: 'זיהוי', Icon: SearchIcon, title: 'זיהוי צמח', sub: 'צלמו צמח וגלו מה הוא' },
  { id: 'chat', label: 'מומחה', Icon: ChatIcon, title: 'המומחה לצמחים', sub: 'שאלו כל שאלה על צמחים וגינון' },
  { id: 'guide', label: 'מדריך', Icon: BookIcon, title: 'מדריך טיפול', sub: 'כל מה שצריך לדעת כדי לגדל נכון' },
  { id: 'plants', label: 'הצמחים שלי', Icon: LeafIcon, title: 'הצמחים שלי', sub: 'שומרים על הצמחים מסודרים ומאושרים' },
]

export default function App() {
  const [plants, setPlants] = useState(loadPlants)
  const [tab, setTab] = useState(plants.length ? 'plants' : 'identify')
  const [openId, setOpenId] = useState(null)
  const [rescanId, setRescanId] = useState(null)
  const [storageError, setStorageError] = useState(false)
  const [chatDraft, setChatDraft] = useState('')

  useEffect(() => {
    setStorageError(!savePlants(plants))
  }, [plants])

  useEffect(() => {
    notifyDueTasks(plants)
    const onVisible = () => document.visibilityState === 'visible' && notifyDueTasks(loadPlants())
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updatePlant = (id, fn) => setPlants(ps => ps.map(p => (p.id === id ? fn(p) : p)))
  const deletePlant = id => {
    setPlants(ps => ps.filter(p => p.id !== id))
    setOpenId(null)
  }
  const openPlant = plants.find(p => p.id === openId)
  const rescanPlant = plants.find(p => p.id === rescanId)
  const dueToday = allTasks(plants).filter(t => t.dueInDays <= 0).length

  const goTab = t => {
    setTab(t)
    setOpenId(null)
    setRescanId(null)
    window.scrollTo(0, 0)
  }
  const showPlant = id => {
    setTab('plants')
    setOpenId(id)
    window.scrollTo(0, 0)
  }

  const clearDraft = useCallback(() => setChatDraft(''), [])
  const askExpert = plant => {
    setChatDraft(`לגבי ה${plant.name} שלי: `)
    goTab('chat')
  }

  const current = TABS.find(t => t.id === tab)
  const inDetail = tab === 'plants' && openPlant

  return (
    <div className="min-h-screen max-w-xl mx-auto flex flex-col">
      {!inDetail && (
        <header className="px-5 pt-[max(env(safe-area-inset-top),20px)] pb-2">
          <div className="flex items-start justify-between gap-3 pt-4">
            <div>
              <h1 className="page-title">{rescanPlant ? `סריקת מעקב` : current.title}</h1>
              <p className="page-sub">{rescanPlant ? rescanPlant.name : current.sub}</p>
            </div>
            <img src="/icon.svg" alt="צמחייה" className="w-11 h-11 mt-1" />
          </div>
        </header>
      )}

      {storageError && (
        <div className="mx-4 mt-2 p-3 rounded-2xl bg-red-100 text-red-800 text-sm">
          לא ניתן לשמור בזיכרון הדפדפן (ייתכן שהאחסון מלא). מחקו תמונות או סריקות ישנות.
        </div>
      )}

      <main className="flex-1 p-4 pb-32">
        {tab === 'reminders' && (
          <Reminders
            plants={plants}
            onComplete={(id, type) => updatePlant(id, p => completeTask(p, type))}
            onOpen={showPlant}
            onScan={() => goTab('identify')}
          />
        )}

        {(tab === 'diagnose' || tab === 'identify') && (
          <ScanView
            key={`${tab}-${rescanId || 'new'}`}
            mode={tab}
            targetPlant={rescanPlant}
            onSaveNew={plant => {
              setPlants(ps => [plant, ...ps])
              showPlant(plant.id)
            }}
            onSaveToPlant={(id, scan) => {
              updatePlant(id, p => ({ ...p, scans: [scan, ...p.scans].slice(0, 12) }))
              setRescanId(null)
              showPlant(id)
            }}
          />
        )}

        {tab === 'chat' && <Chat plants={plants} draft={chatDraft} onDraftUsed={clearDraft} />}

        {tab === 'guide' && <CareGuides plants={plants} onOpenPlant={showPlant} />}

        {tab === 'plants' && !openPlant && (
          <PlantList
            plants={plants}
            onOpen={showPlant}
            onScan={() => goTab('identify')}
            onUpdate={updatePlant}
            onDelete={deletePlant}
          />
        )}

        {inDetail && (
          <PlantDetail
            key={openPlant.id}
            plant={openPlant}
            onBack={() => setOpenId(null)}
            onUpdate={fn => updatePlant(openPlant.id, fn)}
            onDelete={() => deletePlant(openPlant.id)}
            onAsk={() => askExpert(openPlant)}
            onRescan={() => {
              setRescanId(openPlant.id)
              setTab('diagnose')
              window.scrollTo(0, 0)
            }}
          />
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-10 bg-white/95 backdrop-blur border-t border-stone-100 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-xl mx-auto grid grid-cols-6">
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => goTab(id)}
                className={`relative pt-2.5 pb-2 flex flex-col items-center gap-1 text-[11.5px] font-medium ${active ? 'text-mint-500' : 'text-stone-500'}`}
              >
                <Icon className="w-7 h-7" strokeWidth={active ? 2.2 : 1.8} />
                {label}
                {id === 'reminders' && dueToday > 0 && (
                  <span className="absolute top-1.5 left-1/2 -translate-x-[18px] min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold grid place-items-center">{dueToday}</span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
