import { useRef, useState } from 'react'
import ResultView from './ResultView.jsx'
import { diagnose } from '../lib/api.js'
import { resizeImage, thumbnailFromDataUrl } from '../lib/image.js'
import { LOCATIONS } from '../lib/labels.js'
import { newId } from '../lib/storage.js'

export default function ScanView({ mode = 'diagnose', targetPlant, onSaveNew, onSaveToPlant }) {
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)
  const [photo, setPhoto] = useState(null)
  const [location, setLocation] = useState(targetPlant?.location || 'indoor')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const onFile = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setResult(null)
    try {
      setPhoto(await resizeImage(file))
    } catch {
      setError('לא הצלחנו לקרוא את התמונה. נסו תמונה אחרת (JPG/PNG).')
    }
  }

  const analyze = async () => {
    setLoading(true)
    setError('')
    try {
      const knownSpecies = targetPlant?.scans?.[0]?.result?.identification?.scientific_name
      setResult(await diagnose({ dataUrl: photo, location, notes, knownSpecies }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const buildScan = async () => ({
    id: newId(),
    date: new Date().toISOString(),
    thumb: await thumbnailFromDataUrl(photo),
    notes,
    result,
  })

  const save = async () => {
    const scan = await buildScan()
    if (targetPlant) return onSaveToPlant(targetPlant.id, scan)
    onSaveNew({
      id: newId(),
      name: result.identification.common_name_he,
      location,
      createdAt: scan.date,
      lastWatered: null,
      site: LOCATIONS.find(l => l.id === location)?.label || 'בבית',
      waterEveryDays: result.care.water_every_days || null,
      lastFertilized: null,
      fertilizeEveryDays: result.care.fertilize_every_days || null,
      journal: [],
      scans: [scan],
    })
  }

  const reset = () => {
    setPhoto(null)
    setResult(null)
    setNotes('')
    setError('')
  }

  return (
    <div className="space-y-4">
      {targetPlant && (
        <div className="card bg-mint-100 border-mint-200 text-forest text-sm">
          סריקת מעקב עבור <b>{targetPlant.name}</b> — התוצאה תתווסף להיסטוריה של הצמח.
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {!photo && (
        <div className="card text-center space-y-4 py-8">
          <div className="mx-auto w-24 h-24 rounded-full bg-mint-50 grid place-items-center text-5xl">{mode === 'identify' ? '🔍' : '🩺'}</div>
          <div>
            <h2 className="text-lg font-extrabold text-forest">{mode === 'identify' ? 'איזה צמח זה?' : 'מה עובר על הצמח?'}</h2>
            <p className="text-sm text-stone-500 mt-1">
              {mode === 'identify'
                ? 'צלמו צמח ונזהה את הזן ונבנה לו מדריך גידול ולוח השקיה ודישון.'
                : 'צלמו את הצמח ונבדוק עלים, אדמה ומזיקים — ונגיד לכם בדיוק מה לעשות.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-primary" onClick={() => cameraRef.current.click()}>📷 צילום</button>
            <button className="btn-ghost" onClick={() => galleryRef.current.click()}>🖼️ מהגלריה</button>
          </div>
          <ul className="text-xs text-stone-500 text-right space-y-1 bg-mint-50 rounded-2xl p-3">
            <li>💡 צלמו באור יום, בלי פלאש.</li>
            <li>💡 שהצמח כולו ייכנס לפריים, ואם יש בעיה — צילום נוסף מקרוב של העלה הפגוע.</li>
            <li>💡 חשוד במזיקים? צלמו גם את הצד התחתון של העלים.</li>
          </ul>
        </div>
      )}

      {photo && !result && (
        <div className="card space-y-4">
          <img src={photo} alt="הצמח שצולם" className="w-full max-h-96 object-contain rounded-2xl bg-stone-100" />

          <div>
            <div className="text-sm font-bold mb-2">איפה הצמח גדל?</div>
            <div className="grid grid-cols-3 gap-2">
              {LOCATIONS.map(l => (
                <button
                  key={l.id}
                  onClick={() => setLocation(l.id)}
                  className={`rounded-2xl border py-2 text-sm font-bold ${location === l.id ? 'bg-mint-500 text-white border-mint-500' : 'bg-white border-stone-200'}`}
                >
                  {l.icon} {l.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-bold">משהו שכדאי שנדע? (לא חובה)</span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="למשל: העלים מצהיבים מלמטה, משקה פעם בשבוע, עומד ליד חלון מערבי..."
              className="mt-1 w-full rounded-2xl border border-stone-200 p-3 text-sm focus:outline-mint-500"
            />
          </label>

          {error && <div className="p-3 rounded-xl bg-red-100 text-red-800 text-sm">{error}</div>}

          <div className="grid grid-cols-3 gap-2">
            <button className="btn-primary col-span-2" onClick={analyze} disabled={loading}>
              {loading ? <><span className="animate-spin">🌀</span> מנתח את הצמח...</> : mode === 'identify' ? '🔍 זהה את הצמח' : '🩺 אבחן את הצמח'}
            </button>
            <button className="btn-ghost" onClick={reset} disabled={loading}>החלף תמונה</button>
          </div>
          {loading && <p className="text-xs text-center text-stone-500">הניתוח לוקח בדרך כלל 10–30 שניות</p>}
        </div>
      )}

      {result && (
        <>
          <img src={photo} alt="" className="w-full max-h-64 object-cover rounded-2xl" />
          <ResultView result={result} mode={mode} />
          <div className="grid grid-cols-2 gap-2 sticky bottom-[calc(env(safe-area-inset-bottom)+88px)]">
            {result.is_plant && (
              <button className="btn-primary shadow-lg" onClick={save}>
                {targetPlant ? '💾 שמור בהיסטוריה' : '💾 הוסף לצמחים שלי'}
              </button>
            )}
            <button className={`btn-ghost shadow-lg ${result.is_plant ? '' : 'col-span-2'}`} onClick={reset}>📷 סריקה חדשה</button>
          </div>
        </>
      )}
    </div>
  )
}
