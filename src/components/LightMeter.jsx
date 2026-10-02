import { useEffect, useRef, useState } from 'react'

export const LIGHT_LEVELS = [
  { id: 'low', label: 'אור חלש', hint: 'צל, חדר פנימי', min: 0, color: 'bg-stone-400' },
  { id: 'medium', label: 'אור בינוני', hint: 'כמה מטרים מחלון', min: 1000, color: 'bg-amber-300' },
  { id: 'bright_indirect', label: 'בהיר עקיף', hint: 'ליד חלון, בלי שמש ישירה', min: 5000, color: 'bg-amber-400' },
  { id: 'direct', label: 'שמש ישירה', hint: 'מרפסת או גינה בשמש', min: 20000, color: 'bg-orange-500' },
]

const levelIndex = lux => LIGHT_LEVELS.reduce((idx, l, i) => (lux >= l.min ? i : idx), 0)
const srgbToLinear = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const APERTURE_SQ = 1.8 * 1.8 // typical phone main camera, f/1.8

// Mean linear luminance (0..1) of a small downscaled frame.
function frameLuminance(video, canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let sum = 0
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.2126 * srgbToLinear(data[i] / 255) + 0.7152 * srgbToLinear(data[i + 1] / 255) + 0.0722 * srgbToLinear(data[i + 2] / 255)
  }
  return sum / (data.length / 4)
}

// Scene lux from the camera's own exposure (reflected-light metering, 18% grey ≈ 0.18 linear).
function estimateLux(lum, settings) {
  const t = settings.exposureTime ? settings.exposureTime / 10000 : null // Chrome reports 100µs units
  const iso = settings.iso
  if (t && iso) {
    const ev100 = Math.log2(APERTURE_SQ / t) - Math.log2(iso / 100) + Math.log2(Math.max(lum, 0.002) / 0.18)
    return { lux: 2.5 * 2 ** ev100, exact: true }
  }
  // No exposure data (e.g. iPhone): the camera auto-exposes, so this is only a rough guess.
  return { lux: 40000 * Math.max(lum, 0.001) ** 1.4, exact: false }
}

export default function LightMeter({ plant, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [error, setError] = useState('')
  const [reading, setReading] = useState(null)

  useEffect(() => {
    let stream
    let timer
    let smooth = null
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        const video = videoRef.current
        video.srcObject = stream
        await video.play()
        const track = stream.getVideoTracks()[0]
        timer = setInterval(() => {
          if (!video.videoWidth) return
          const { lux, exact } = estimateLux(frameLuminance(video, canvasRef.current), track.getSettings?.() || {})
          smooth = smooth == null ? lux : smooth * 0.6 + lux * 0.4
          setReading({ lux: smooth, exact })
        }, 400)
      } catch (e) {
        setError(e?.name === 'NotAllowedError' ? 'צריך לאשר גישה למצלמה כדי למדוד אור.' : 'לא הצלחנו להפעיל את המצלמה במכשיר הזה.')
      }
    })()
    return () => {
      clearInterval(timer)
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const idx = reading ? levelIndex(reading.lux) : -1
  const level = LIGHT_LEVELS[idx]
  const needIdx = LIGHT_LEVELS.findIndex(l => l.id === plant?.scans[0]?.result?.care?.light_level)

  let advice = null
  if (reading && needIdx >= 0) {
    const need = LIGHT_LEVELS[needIdx]
    if (idx < needIdx) advice = { ok: false, text: `חשוך מדי ל${plant.name} — הוא צריך ${need.label} (${need.hint}). כדאי להזיז קרוב יותר לחלון.` }
    else if (idx > needIdx + 1 || (idx === 3 && needIdx < 2)) advice = { ok: false, text: `חזק מדי ל${plant.name} — הוא צריך ${need.label}. כדאי להרחיק מהשמש הישירה או להצל.` }
    else advice = { ok: true, text: `מקום מתאים ל${plant.name}! הוא צריך ${need.label}.` }
  }

  return (
    <div className="fixed inset-0 z-40 bg-forest text-white overflow-y-auto flex flex-col">
      <div className="max-w-xl w-full mx-auto flex-1 flex flex-col p-5 pt-[max(env(safe-area-inset-top),20px)]">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">☀️ מד אור</h2>
          <button onClick={onClose} className="rounded-full bg-white/15 px-4 py-2 font-bold">סגירה</button>
        </div>
        <p className="text-white/70 text-sm mt-1">
          {plant ? `עמדו במקום של ${plant.name} וכוונו את המצלמה האחורית לכיוון שממנו מגיע האור.` : 'עמדו במקום של הצמח וכוונו את המצלמה האחורית לכיוון שממנו מגיע האור.'}
        </p>

        <div className="relative mt-4 rounded-3xl overflow-hidden bg-black/30 aspect-[4/3]">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} width="64" height="48" className="hidden" />
          {error && <div className="absolute inset-0 grid place-items-center p-6 text-center">{error}</div>}
        </div>

        <div className="mt-5 text-center">
          <div className="text-5xl font-extrabold tabular-nums">{reading ? Math.round(reading.lux).toLocaleString('he-IL') : '—'}</div>
          <div className="text-white/70">לוקס{reading && !reading.exact ? ' (הערכה גסה)' : ''}</div>
          {level && <div className="mt-2 text-xl font-bold">{level.label} · <span className="font-normal text-white/80">{level.hint}</span></div>}
        </div>

        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {LIGHT_LEVELS.map((l, i) => (
            <div key={l.id} className="text-center">
              <div className={`h-3 rounded-full ${i <= idx ? l.color : 'bg-white/15'} ${i === needIdx ? 'ring-2 ring-white' : ''}`} />
              <div className="text-[11px] mt-1 text-white/70">{l.label}</div>
            </div>
          ))}
        </div>

        {advice && (
          <div className={`mt-5 rounded-2xl p-4 font-bold ${advice.ok ? 'bg-mint-500' : 'bg-amber-500 text-stone-900'}`}>
            {advice.ok ? '✅ ' : '⚠️ '}{advice.text}
          </div>
        )}
        {reading && !reading.exact && (
          <p className="mt-auto pt-4 text-xs text-white/60">במכשיר הזה המצלמה לא מדווחת על נתוני החשיפה, ולכן המדידה משוערת. השוו בין מקומות שונים בבית כדי למצוא את המואר ביותר.</p>
        )}
      </div>
    </div>
  )
}
