import { useEffect, useState } from 'react'

const STEPS = {
  identify: ['מנתח את צורת העלים…', 'משווה לאלפי מיני צמחים…', 'בודק את מצב הצמח…', 'מכין מדריך טיפול אישי…'],
  diagnose: ['סורק עלים וגבעולים…', 'מחפש כתמים, מזיקים ומחלות…', 'בודק סימני השקיה ואור…', 'מכין תוכנית טיפול…'],
}

// Fixed spots for the "detected point" sparkles, as % of the frame.
const DOTS = [[22, 30], [64, 22], [40, 52], [74, 58], [30, 74], [58, 82], [50, 38]]

// Animated "scanning" screen shown over the captured photo while the diagnosis runs.
export default function ScanningOverlay({ photo, mode, done, error, onRetry, onNewPhoto, onFinished }) {
  const [progress, setProgress] = useState(4)
  const [step, setStep] = useState(0)
  const steps = STEPS[mode] || STEPS.diagnose

  useEffect(() => {
    if (error) return
    const t = setInterval(() => setProgress(p => (done ? Math.min(100, p + 12) : p + (95 - p) * 0.06)), 200)
    return () => clearInterval(t)
  }, [done, error])

  useEffect(() => {
    if (done && progress >= 100) {
      const t = setTimeout(onFinished, 350)
      return () => clearTimeout(t)
    }
  }, [done, progress, onFinished])

  useEffect(() => {
    if (error) return
    const t = setInterval(() => setStep(s => Math.min(steps.length - 1, s + 1)), 3500)
    return () => clearInterval(t)
  }, [error, steps.length])

  const pct = Math.round(progress)
  const R = 26
  const C = 2 * Math.PI * R

  return (
    <div className="fixed inset-0 z-40 bg-black text-white overflow-hidden">
      <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 blur-[2px] scale-105" />

      <div className="absolute inset-x-0 top-[14%] mx-auto w-[82vw] max-w-[400px] aspect-[3/4] rounded-[28px] overflow-hidden shadow-2xl ring-4 ring-white/80">
        <img src={photo} alt="הצמח שצולם" className="w-full h-full object-cover" />
        {!error && (
          <>
            <div className="scan-grid" />
            <div className="scan-line scan-line-strong" />
            {DOTS.map(([x, y], i) => (
              <span key={i} className="scan-dot" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.45}s` }} />
            ))}
          </>
        )}
      </div>

      <div className="absolute inset-x-4 bottom-[max(env(safe-area-inset-bottom),24px)] mx-auto max-w-[400px] rounded-3xl bg-white text-stone-800 p-5 shadow-2xl">
        {error ? (
          <div className="space-y-3 text-center">
            <div className="text-3xl">😕</div>
            <p className="font-bold">הסריקה לא הצליחה</p>
            <p className="text-sm text-stone-500">{error}</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-primary py-2.5" onClick={onRetry}>נסו שוב</button>
              <button className="btn-ghost py-2.5" onClick={onNewPhoto}>תמונה אחרת</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                <circle cx="32" cy="32" r={R} fill="none" stroke="#d5f3e7" strokeWidth="6" />
                <circle cx="32" cy="32" r={R} fill="none" stroke="#22b57f" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress / 100)} className="transition-[stroke-dashoffset] duration-200" />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-sm font-extrabold text-forest">{pct}%</span>
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-lg text-forest">{done ? 'מוכן!' : mode === 'identify' ? 'מזהה את הצמח' : 'סורק את הצמח'}</div>
              <div key={step} className="text-sm text-stone-500 animate-[fadein_.4s_ease-out]">{done ? 'מציג תוצאות…' : steps[step]}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
