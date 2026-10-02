import { useEffect, useRef, useState } from 'react'
import { LOCATIONS } from '../lib/labels.js'
import { resizeImage } from '../lib/image.js'
import { IS_ARTIFACT } from '../lib/platform.js'

// Full-screen live camera with a scan frame, in the style of plant ID apps.
// Falls back to the system camera / gallery picker when live video isn't available.
export default function CameraScanner({ mode, location, onLocation, notes, onNotes, onCapture, onClose }) {
  const videoRef = useRef(null)
  const trackRef = useRef(null)
  const cameraInput = useRef(null)
  const galleryInput = useRef(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState('')
  const [torch, setTorch] = useState(null) // null = unsupported
  const [flash, setFlash] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  useEffect(() => {
    let stream
    let cancelled = false
    ;(async () => {
      // claude.ai artifacts can't use the live camera: take the photo with the phone's camera app.
      if (IS_ARTIFACT) return setFailed('לחצו על כפתור הצילום למטה כדי לצלם את הצמח עם המצלמה של הטלפון, או בחרו תמונה מהגלריה.')
      if (!navigator.mediaDevices?.getUserMedia) return setFailed('הדפדפן לא תומך במצלמה חיה.')
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        })
        if (cancelled) return stream.getTracks().forEach(t => t.stop())
        const video = videoRef.current
        video.srcObject = stream
        await video.play()
        trackRef.current = stream.getVideoTracks()[0]
        if (trackRef.current.getCapabilities?.().torch) setTorch(false)
        setReady(true)
      } catch (e) {
        setFailed(e?.name === 'NotAllowedError' ? 'אין הרשאה למצלמה. אפשר לאשר בהגדרות הדפדפן, או לצלם דרך מצלמת הטלפון.' : 'לא הצלחנו לפתוח את המצלמה.')
      }
    })()
    return () => {
      cancelled = true
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const toggleTorch = async () => {
    try {
      await trackRef.current.applyConstraints({ advanced: [{ torch: !torch }] })
      setTorch(!torch)
    } catch { /* torch not available right now */ }
  }

  const shoot = () => {
    const video = videoRef.current
    if (!video?.videoWidth) return
    const scale = Math.min(1, 1400 / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    setFlash(true)
    navigator.vibrate?.(30)
    setTimeout(() => onCapture(canvas.toDataURL('image/jpeg', 0.85)), 180)
  }

  const onFile = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      onCapture(await resizeImage(file))
    } catch {
      setFailed('לא הצלחנו לקרוא את התמונה. נסו תמונה אחרת (JPG/PNG).')
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black text-white select-none overflow-hidden">
      <video ref={videoRef} playsInline muted className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {/* Scan frame: everything outside it is dimmed */}
      <div className="absolute inset-x-0 top-[22%] mx-auto w-[78vw] max-w-[380px] aspect-[3/4]">
        <div className="absolute inset-0 rounded-[28px] shadow-[0_0_0_200vmax_rgba(0,0,0,.45)]" />
        {['top-0 right-0 border-t-4 border-r-4 rounded-tr-[28px]', 'top-0 left-0 border-t-4 border-l-4 rounded-tl-[28px]', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-[28px]', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-[28px]'].map(c => (
          <span key={c} className={`absolute w-12 h-12 border-white ${c}`} />
        ))}
        {ready && <div className="scan-line" />}
        {failed && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm leading-relaxed">
            <div className="space-y-4">
              <div className="text-4xl">📷</div>
              <p>{failed}</p>
              <button onClick={() => cameraInput.current.click()} className="rounded-full bg-mint-500 px-5 py-2.5 font-bold">צילום עם מצלמת הטלפון</button>
            </div>
          </div>
        )}
      </div>

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 p-4 pt-[max(env(safe-area-inset-top),16px)] bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <button onClick={onClose} aria-label="סגירה" className="w-10 h-10 rounded-full bg-black/40 grid place-items-center text-xl">✕</button>
          <div className="font-extrabold text-lg">{mode === 'identify' ? 'זיהוי צמח' : 'אבחון צמח'}</div>
          {torch !== null ? (
            <button onClick={toggleTorch} aria-label="פנס" className={`w-10 h-10 rounded-full grid place-items-center text-lg ${torch ? 'bg-amber-400 text-black' : 'bg-black/40'}`}>⚡</button>
          ) : <span className="w-10" />}
        </div>
        <div className="mt-3 flex justify-center gap-2">
          {LOCATIONS.map(l => (
            <button
              key={l.id}
              onClick={() => onLocation(l.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold backdrop-blur ${location === l.id ? 'bg-white text-forest' : 'bg-black/35 text-white'}`}
            >
              {l.icon} {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hint */}
      <div className="absolute inset-x-0 top-[calc(22%-2.5rem)] text-center text-sm font-bold drop-shadow">
        {mode === 'identify' ? 'מרכזו את הצמח במסגרת' : 'צלמו את החלק הפגוע מקרוב'}
      </div>

      {/* Notes sheet */}
      {showNotes && (
        <div className="absolute inset-x-4 bottom-44 rounded-3xl bg-white text-stone-800 p-4 shadow-xl">
          <div className="text-sm font-bold mb-2">משהו שכדאי שנדע? (לא חובה)</div>
          <textarea
            autoFocus
            value={notes}
            onChange={e => onNotes(e.target.value)}
            rows={3}
            placeholder="למשל: העלים מצהיבים מלמטה, משקה פעם בשבוע..."
            className="w-full rounded-2xl border border-stone-200 p-3 text-sm focus:outline-mint-500"
          />
          <button onClick={() => setShowNotes(false)} className="btn-primary w-full mt-2 py-2.5">שמירה</button>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 pb-[max(env(safe-area-inset-bottom),20px)] pt-6 bg-gradient-to-t from-black/70 to-transparent">
        <div className="max-w-sm mx-auto grid grid-cols-3 items-center px-6">
          <button onClick={() => setShowNotes(s => !s)} className="justify-self-start flex flex-col items-center gap-1 text-xs">
            <span className={`w-12 h-12 rounded-full grid place-items-center text-xl ${notes.trim() ? 'bg-mint-500' : 'bg-white/20'}`}>📝</span>
            תיאור
          </button>
          <button
            onClick={ready ? shoot : () => cameraInput.current.click()}
            aria-label="צילום"
            className="justify-self-center w-20 h-20 rounded-full border-4 border-white grid place-items-center active:scale-90 transition"
          >
            <span className="w-16 h-16 rounded-full bg-mint-500 grid place-items-center text-2xl">{mode === 'identify' ? '🔍' : '🩺'}</span>
          </button>
          <button onClick={() => galleryInput.current.click()} className="justify-self-end flex flex-col items-center gap-1 text-xs">
            <span className="w-12 h-12 rounded-full bg-white/20 grid place-items-center text-xl">🖼️</span>
            גלריה
          </button>
        </div>
      </div>

      {flash && <div className="absolute inset-0 bg-white animate-[flash_.35s_ease-out_forwards]" />}
    </div>
  )
}
