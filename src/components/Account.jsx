import { useState } from 'react'

const STATUS = {
  idle: { text: '', cls: '' },
  syncing: { text: 'שומר בענן…', cls: 'text-stone-500' },
  saved: { text: '✓ הכול שמור בענן', cls: 'text-mint-600' },
  error: { text: '⚠️ השמירה בענן נכשלה, ננסה שוב', cls: 'text-amber-600' },
}

export function LoginForm({ account, onLogin, compact = false }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', code: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onLogin(mode, form)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-[15px] focus:outline-mint-500'
  return (
    <form onSubmit={submit} className="space-y-3">
      {!compact && (
        <div className="segmented">
          <button type="button" aria-pressed={mode === 'login'} onClick={() => setMode('login')}>התחברות</button>
          <button type="button" aria-pressed={mode === 'register'} onClick={() => setMode('register')}>חשבון חדש</button>
        </div>
      )}
      <input className={input} type="email" dir="ltr" autoComplete="email" placeholder="אימייל" value={form.email} onChange={set('email')} required />
      <input
        className={input}
        type="password"
        dir="ltr"
        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        placeholder={mode === 'register' ? 'סיסמה (לפחות 8 תווים)' : 'סיסמה'}
        minLength={8}
        value={form.password}
        onChange={set('password')}
        required
      />
      {mode === 'register' && account.signupCode && (
        <input className={input} placeholder="קוד הרשמה" value={form.code} onChange={set('code')} required />
      )}
      {error && <div className="p-3 rounded-2xl bg-red-100 text-red-800 text-sm">{error}</div>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? '...' : mode === 'register' ? 'יצירת חשבון' : 'התחברות'}
      </button>
      {compact && (
        <button type="button" className="w-full text-sm text-mint-600 font-bold" onClick={() => setMode(m => (m === 'login' ? 'register' : 'login'))}>
          {mode === 'login' ? 'אין לכם חשבון? צרו חשבון חדש' : 'יש לכם חשבון? התחברו'}
        </button>
      )}
    </form>
  )
}

// Shown in place of scanning / chat when the server requires an account.
export function LoginPrompt({ account, onLogin, what }) {
  return (
    <div className="card space-y-4 py-6">
      <div className="text-center space-y-1">
        <div className="mx-auto w-16 h-16 rounded-full bg-mint-50 grid place-items-center text-3xl">🔐</div>
        <p className="font-extrabold text-forest text-lg">התחברו כדי {what}</p>
        <p className="text-sm text-stone-500">החשבון שומר את הצמחים שלכם בענן ומגן על האפליקציה משימוש של זרים.</p>
      </div>
      <LoginForm account={account} onLogin={onLogin} compact />
    </div>
  )
}

export default function AccountSheet({ account, status, plantsCount, onLogin, onLogout, onClose }) {
  const s = STATUS[status] || STATUS.idle
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-t-[32px] bg-[#f6faf8] p-5 pb-[max(env(safe-area-inset-bottom),20px)] space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-forest">החשבון שלי</h2>
          <button onClick={onClose} aria-label="סגירה" className="w-9 h-9 rounded-full bg-white grid place-items-center">✕</button>
        </div>

        {!account.cloud ? (
          <div className="card text-sm text-stone-600 space-y-2">
            <p className="font-bold text-stone-900">☁️ שמירה בענן עוד לא הופעלה</p>
            <p>הצמחים נשמרים כרגע רק במכשיר הזה. כדי להפעיל חשבונות ושמירה בענן, צריך לחבר מסד נתונים (Upstash Redis) לפרויקט ב-Vercel.</p>
          </div>
        ) : account.user ? (
          <>
            <div className="card flex items-center gap-3">
              <span className="w-12 h-12 rounded-full bg-mint-500 text-white grid place-items-center text-xl font-extrabold">
                {account.user.email[0].toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-bold truncate" dir="ltr" style={{ textAlign: 'right' }}>{account.user.email}</div>
                <div className={`text-sm ${s.cls}`}>{s.text || `${plantsCount} צמחים מסונכרנים`}</div>
              </div>
            </div>
            <p className="text-sm text-stone-500 px-1">התחברו עם אותו חשבון בטלפון אחר או במחשב, והצמחים יופיעו גם שם.</p>
            <button className="btn-ghost w-full text-red-600" onClick={onLogout}>התנתקות</button>
          </>
        ) : (
          <>
            <p className="text-sm text-stone-500">התחברו כדי לשמור את הצמחים בענן, לראות אותם בכל מכשיר ולהשתמש בסריקה ובמומחה.</p>
            <LoginForm account={account} onLogin={onLogin} />
          </>
        )}
      </div>
    </div>
  )
}
