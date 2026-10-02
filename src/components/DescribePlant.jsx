import { useRef, useState } from 'react'
import { LOCATIONS } from '../lib/labels.js'
import { resizeImage } from '../lib/image.js'

// Shown instead of the camera when this Claude view can't send photos to Claude:
// the grower describes the plant, and may still attach a photo for the plant's card.
export default function DescribePlant({ mode, location, onLocation, onSubmit }) {
  const fileRef = useRef(null)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null)

  const onFile = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setPhoto(await resizeImage(file).catch(() => null))
  }

  const description = [name.trim() && `השם (לפי מה שידוע): ${name.trim()}`, text.trim()].filter(Boolean).join('\n')

  return (
    <div className="card space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-extrabold text-forest">{mode === 'identify' ? 'תארו את הצמח' : 'תארו מה עובר על הצמח'}</h2>
        <p className="text-sm text-stone-500">
          בתצוגה הזו של Claude אי אפשר לשלוח תמונות לניתוח, אז נזהה ונאבחן לפי התיאור. כדי לסרוק עם תמונה, פתחו את האפליקציה ב-claude.ai בדפדפן.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-bold">שם הצמח, אם ידוע</span>
        <input id="describe-name" value={name} onChange={e => setName(e.target.value)} placeholder="למשל: פוטוס, מונסטרה, ריחן" className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-[15px] focus:outline-mint-500" />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-bold">איך הוא נראה ומה שמתם לב?</span>
        <textarea
          id="describe-text"
          rows={4}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="צורת העלים וצבעם, גודל, כתמים או עלים צהובים, מזיקים, כל כמה זמן משקים, איפה הוא עומד..."
          className="w-full rounded-2xl border border-stone-200 p-3 text-[15px] focus:outline-mint-500"
        />
      </label>

      <div>
        <div className="text-sm font-bold mb-2">איפה הצמח גדל?</div>
        <div className="grid grid-cols-3 gap-2">
          {LOCATIONS.map(l => (
            <button
              key={l.id}
              type="button"
              onClick={() => onLocation(l.id)}
              className={`rounded-2xl border py-2 text-sm font-bold ${location === l.id ? 'bg-mint-500 text-white border-mint-500' : 'bg-white border-stone-200'}`}
            >
              {l.icon} {l.label}
            </button>
          ))}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <button type="button" onClick={() => fileRef.current.click()} className="flex items-center gap-3 w-full rounded-2xl border border-dashed border-mint-200 p-3 text-right">
        {photo ? <img src={photo} alt="" className="w-14 h-14 rounded-xl object-cover" /> : <span className="w-14 h-14 rounded-xl bg-mint-50 grid place-items-center text-2xl">📷</span>}
        <span className="text-sm text-stone-600">{photo ? 'התמונה תישמר בכרטיס הצמח' : 'תמונה לכרטיס הצמח (לא חובה, לא נשלחת לניתוח)'}</span>
      </button>

      <button className="btn-primary w-full" disabled={text.trim().length < 3 && !name.trim()} onClick={() => onSubmit({ description, photo })}>
        {mode === 'identify' ? '🔍 זהה את הצמח' : '🩺 אבחן את הצמח'}
      </button>
    </div>
  )
}
