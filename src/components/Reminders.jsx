import { useState } from 'react'
import { BellIcon, CheckIcon, PinIcon } from './Icons.jsx'
import { tipOfTheDay } from '../lib/articles.js'
import { IS_ARTIFACT } from '../lib/platform.js'
import { TASKS, dueLabel, plantPhoto, tasksOnDay } from '../lib/storage.js'
import {
  loadReminderSettings, notificationsSupported, requestNotifications, saveReminderSettings,
} from '../lib/reminders.js'

const DAY_MS = 86_400_000
const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime()

// Sunday-to-Saturday strip, like a paper planner; a dot marks days with care tasks.
function WeekStrip({ plants, selected, onSelect }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const today = startOfDay(new Date())
  const sunday = new Date(today.getTime() - today.getDay() * DAY_MS + weekOffset * 7 * DAY_MS)
  const days = Array.from({ length: 7 }, (_, i) => new Date(sunday.getTime() + i * DAY_MS))
  const month = sunday.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-center justify-between px-1">
        <button aria-label="השבוע הקודם" disabled={weekOffset <= 0} onClick={() => setWeekOffset(w => w - 1)} className="w-8 h-8 rounded-full bg-mint-50 text-forest disabled:opacity-30">›</button>
        <div className="text-sm font-bold text-stone-600">{month}</div>
        <button aria-label="השבוע הבא" onClick={() => setWeekOffset(w => w + 1)} className="w-8 h-8 rounded-full bg-mint-50 text-forest">‹</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map(d => {
          const active = sameDay(d, selected)
          const isToday = sameDay(d, today)
          const past = d < today
          const busy = !past && tasksOnDay(plants, d).length > 0
          return (
            <button key={d.getTime()} disabled={past} onClick={() => onSelect(d)} className="flex flex-col items-center gap-1 py-1 disabled:opacity-35">
              <span className="text-[11px] text-stone-500">{WEEKDAYS[d.getDay()]}</span>
              <span className={`w-9 h-9 rounded-xl grid place-items-center font-extrabold tabular-nums ${active ? 'bg-forest text-white' : isToday ? 'border-2 border-forest text-forest' : 'bg-stone-50 text-stone-700'}`}>
                {d.getDate()}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${busy ? 'bg-mint-500' : 'bg-transparent'}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// One card per plant with its tasks for the chosen day.
function PlantTasksCard({ plant, tasks, canComplete, onDone, onOpen }) {
  return (
    <div className="card p-3 space-y-3">
      <button onClick={onOpen} className="flex items-center gap-3 w-full text-right">
        <img src={plantPhoto(plant)} alt="" className="w-16 h-16 rounded-2xl object-cover bg-mint-50 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-lg font-extrabold text-stone-900 truncate">{plant.name}</div>
          <div className="text-sm text-stone-500 flex items-center gap-1"><PinIcon className="w-3.5 h-3.5 text-stone-300" />{plant.site}</div>
        </div>
      </button>
      <div className="space-y-2">
        {tasks.map(task => {
          const t = TASKS[task.type]
          const late = canComplete && task.dueInDays < 0
          return (
            <div key={task.type} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${t.color}`}>
              <span className="text-lg">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{t.label}</div>
                <div className="text-xs opacity-80">כל {task.every} ימים{late ? ` · ${dueLabel(task.dueInDays)}` : ''}</div>
              </div>
              {canComplete && (
                <button
                  aria-label={`סימון ${t.label} כבוצע`}
                  onClick={() => onDone(task)}
                  className="shrink-0 w-9 h-9 rounded-full bg-white text-mint-600 grid place-items-center shadow-sm active:scale-90 transition"
                >
                  <CheckIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// A tip from the user's own plants when there are fresh ones, otherwise one from the articles.
function TipOfTheDay({ plants, onOpenArticle, onOpenPlant }) {
  const day = Math.floor(Date.now() / 86_400_000)
  const personal = plants.flatMap(p => (p.tips?.data?.tips || []).map(t => ({ plant: p, tip: t })))
  if (personal.length) {
    const { plant, tip } = personal[day % personal.length]
    return (
      <button onClick={() => onOpenPlant(plant.id, 'guide')} className="card w-full text-right bg-gradient-to-bl from-amber-50 to-white">
        <div className="text-xs font-bold text-amber-700">💡 טיפ היום · {plant.name}</div>
        <div className="font-extrabold text-stone-900 mt-1">{tip.title}</div>
        <p className="text-sm text-stone-600 mt-0.5 line-clamp-3">{tip.body}</p>
      </button>
    )
  }
  const { text, article } = tipOfTheDay()
  return (
    <button onClick={() => onOpenArticle(article.id)} className="card w-full text-right bg-gradient-to-bl from-amber-50 to-white">
      <div className="text-xs font-bold text-amber-700">💡 טיפ היום</div>
      <p className="text-sm text-stone-700 mt-1">{text}</p>
      <div className="text-xs font-bold text-mint-600 mt-1.5">{article.emoji} מתוך: {article.title} ←</div>
    </button>
  )
}

function NotificationsCard() {
  const [s, setS] = useState(loadReminderSettings)
  const update = next => {
    setS(next)
    saveReminderSettings(next)
  }
  if (!notificationsSupported()) return null
  const blocked = Notification.permission === 'denied'
  return (
    <div className="card flex items-center gap-3">
      <span className="w-11 h-11 rounded-2xl bg-mint-50 text-mint-600 grid place-items-center shrink-0"><BellIcon /></span>
      <div className="flex-1 text-sm">
        <div className="font-bold text-stone-900">התראה יומית</div>
        <div className="text-stone-500">
          {blocked ? 'ההתראות חסומות בהגדרות הדפדפן.' : 'סיכום המשימות להיום כשפותחים את האפליקציה. לתזכורת קבועה ביומן — היכנסו לצמח ← "הוסף ליומן".'}
        </div>
      </div>
      <button
        role="switch"
        aria-checked={s.enabled}
        disabled={blocked}
        onClick={async () => {
          if (!s.enabled && !(await requestNotifications())) return
          update({ ...s, enabled: !s.enabled, lastNotified: null })
        }}
        className={`shrink-0 w-12 h-7 rounded-full p-0.5 transition ${s.enabled ? 'bg-mint-500' : 'bg-stone-200'} disabled:opacity-40`}
      >
        <span className={`block w-6 h-6 rounded-full bg-white shadow transition ${s.enabled ? '-translate-x-5' : ''}`} />
      </button>
    </div>
  )
}

export default function Reminders({ plants, onComplete, onOpen, onScan, onOpenArticle }) {
  const [justDone, setJustDone] = useState(null)
  const [selected, setSelected] = useState(() => new Date())
  const isToday = sameDay(selected, new Date())
  const dayTasks = tasksOnDay(plants, selected)
  const byPlant = plants
    .map(plant => ({ plant, tasks: dayTasks.filter(t => t.plant.id === plant.id) }))
    .filter(g => g.tasks.length)
  const dayLabel = isToday ? 'היום' : selected.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })

  const done = task => {
    onComplete(task.plant.id, task.type)
    setJustDone(`${TASKS[task.type].icon} ${task.plant.name} ${TASKS[task.type].done}`)
    setTimeout(() => setJustDone(null), 2200)
  }

  return (
    <div className="space-y-4">
      <WeekStrip plants={plants} selected={selected} onSelect={setSelected} />

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold text-forest px-1">{dayLabel}{byPlant.length ? ` · ${dayTasks.length} משימות` : ''}</h2>
        {!plants.length ? (
          <div className="card text-center py-8 space-y-3">
            <div className="text-4xl">🌱</div>
            <p className="text-sm text-stone-500">הוסיפו צמח ונבנה לו לוח השקיה ודישון אוטומטי.</p>
            <button className="btn-primary" onClick={onScan}>📷 הוספת צמח</button>
          </div>
        ) : byPlant.length ? (
          byPlant.map(({ plant, tasks }) => (
            <PlantTasksCard key={plant.id} plant={plant} tasks={tasks} canComplete={isToday} onDone={done} onOpen={() => onOpen(plant.id)} />
          ))
        ) : (
          <div className="card text-center py-6">
            <div className="text-4xl mb-1">🎉</div>
            <p className="font-bold text-forest">{isToday ? 'הכול מטופל להיום' : 'אין משימות ביום הזה'}</p>
          </div>
        )}
      </section>

      <TipOfTheDay plants={plants} onOpenArticle={onOpenArticle} onOpenPlant={onOpen} />

      {!IS_ARTIFACT && <NotificationsCard />}

      {justDone && (
        <div className="fixed z-30 inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+92px)] flex justify-center pointer-events-none">
          <div className="rounded-full bg-forest text-white px-5 py-2.5 text-sm font-bold shadow-lg">✓ {justDone}</div>
        </div>
      )}
    </div>
  )
}
