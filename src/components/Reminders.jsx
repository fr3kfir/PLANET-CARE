import { useState } from 'react'
import { BellIcon, CheckIcon } from './Icons.jsx'
import { TASKS, allTasks, dueLabel, plantPhoto } from '../lib/storage.js'
import {
  loadReminderSettings, notificationsSupported, requestNotifications, saveReminderSettings,
} from '../lib/reminders.js'

function TaskRow({ task, onDone, onOpen }) {
  const t = TASKS[task.type]
  const late = task.dueInDays < 0
  return (
    <div className="card p-3 flex items-center gap-3">
      <button onClick={onOpen} className="flex items-center gap-3 flex-1 min-w-0 text-right">
        <div className="relative shrink-0">
          <img src={plantPhoto(task.plant)} alt="" className="w-14 h-14 rounded-2xl object-cover bg-mint-50" />
          <span className={`absolute -bottom-1 -left-1 w-7 h-7 rounded-full grid place-items-center text-sm ring-2 ring-white ${t.color}`}>{t.icon}</span>
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-stone-900 truncate">{t.task(task.plant.name)}</div>
          <div className="text-sm text-stone-500 truncate">{task.plant.site} · כל {task.every} ימים</div>
          <span className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${late ? 'bg-red-50 text-red-600' : task.dueInDays === 0 ? 'bg-mint-50 text-mint-600' : 'bg-stone-100 text-stone-600'}`}>
            {dueLabel(task.dueInDays)}
          </span>
        </div>
      </button>
      {onDone && (
        <button
          aria-label={`סימון ${t.label} כבוצע`}
          onClick={onDone}
          className="shrink-0 w-11 h-11 rounded-full border-2 border-mint-200 text-mint-500 grid place-items-center hover:bg-mint-500 hover:text-white hover:border-mint-500 active:scale-90 transition"
        >
          <CheckIcon className="w-5 h-5" />
        </button>
      )}
    </div>
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

export default function Reminders({ plants, onComplete, onOpen, onScan }) {
  const [justDone, setJustDone] = useState(null)
  const tasks = allTasks(plants)
  const today = tasks.filter(t => t.dueInDays <= 0)
  const soon = tasks.filter(t => t.dueInDays > 0 && t.dueInDays <= 7)

  const done = task => {
    onComplete(task.plant.id, task.type)
    setJustDone(`${TASKS[task.type].icon} ${task.plant.name} ${TASKS[task.type].done}`)
    setTimeout(() => setJustDone(null), 2200)
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="card p-3"><div className="text-2xl font-extrabold text-forest">{plants.length}</div><div className="text-xs text-stone-500">צמחים</div></div>
        <div className="card p-3"><div className="text-2xl font-extrabold text-mint-600">{today.length}</div><div className="text-xs text-stone-500">משימות היום</div></div>
        <div className="card p-3"><div className="text-2xl font-extrabold text-sky-600">{soon.length}</div><div className="text-xs text-stone-500">השבוע</div></div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold text-forest">היום</h2>
        {!plants.length ? (
          <div className="card text-center py-8 space-y-3">
            <div className="text-4xl">🌱</div>
            <p className="text-sm text-stone-500">הוסיפו צמח ונבנה לו לוח השקיה ודישון אוטומטי.</p>
            <button className="btn-primary" onClick={onScan}>📷 הוספת צמח</button>
          </div>
        ) : today.length ? (
          today.map(t => <TaskRow key={t.plant.id + t.type} task={t} onDone={() => done(t)} onOpen={() => onOpen(t.plant.id)} />)
        ) : (
          <div className="card text-center py-6">
            <div className="text-4xl mb-1">🎉</div>
            <p className="font-bold text-forest">הכול מטופל להיום</p>
          </div>
        )}
      </section>

      {soon.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-forest">בשבוע הקרוב</h2>
          {soon.map(t => <TaskRow key={t.plant.id + t.type} task={t} onDone={() => done(t)} onOpen={() => onOpen(t.plant.id)} />)}
        </section>
      )}

      <NotificationsCard />

      {justDone && (
        <div className="fixed z-30 inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+92px)] flex justify-center pointer-events-none">
          <div className="rounded-full bg-forest text-white px-5 py-2.5 text-sm font-bold shadow-lg">✓ {justDone}</div>
        </div>
      )}
    </div>
  )
}
