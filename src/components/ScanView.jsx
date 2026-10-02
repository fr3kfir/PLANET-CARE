import { useCallback, useEffect, useState } from 'react'
import ResultView from './ResultView.jsx'
import CameraScanner from './CameraScanner.jsx'
import ScanningOverlay from './ScanningOverlay.jsx'
import { canSendImages, diagnose } from '../lib/api.js'
import { IS_ARTIFACT } from '../lib/platform.js'
import DescribePlant from './DescribePlant.jsx'
import appIcon from '../icon.svg'
import { thumbnailFromDataUrl } from '../lib/image.js'
import { LOCATIONS } from '../lib/labels.js'
import { currentSeason, newId, scheduleFromCare } from '../lib/storage.js'

export default function ScanView({ mode = 'diagnose', targetPlant, onSaveNew, onSaveToPlant }) {
  const [phase, setPhase] = useState('camera') // camera → scanning → result, or intro when the camera is closed
  const [photo, setPhoto] = useState(null)
  const [location, setLocation] = useState(targetPlant?.location || 'indoor')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null)
  const [result, setResult] = useState(null)
  // Whether photos can go to Claude here (some claude.ai views can't); null while checking.
  const [imagesOk, setImagesOk] = useState(IS_ARTIFACT ? null : true)
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (IS_ARTIFACT) canSendImages().then(setImagesOk)
  }, [])

  const analyze = async (dataUrl, text = description) => {
    setError('')
    setPending(null)
    try {
      const knownSpecies = targetPlant?.scans?.[0]?.result?.identification?.scientific_name
      setPending(await diagnose({ dataUrl: imagesOk ? dataUrl : null, description: text, location, notes, knownSpecies }))
    } catch (err) {
      setError(err.message || 'שגיאה בחיבור לשרת')
    }
  }

  const onCapture = dataUrl => {
    setPhoto(dataUrl)
    setResult(null)
    setPhase('scanning')
    analyze(dataUrl)
  }

  // Description-only scan: keep the optional photo for the plant's card, or use the app icon.
  const onDescribe = ({ description: text, photo: pic }) => {
    setDescription(text)
    setNotes(text)
    setPhoto(pic || appIcon)
    setResult(null)
    setPhase('scanning')
    analyze(null, text)
  }

  const onFinished = useCallback(() => {
    setResult(pending)
    setPhase('result')
    window.scrollTo(0, 0)
  }, [pending])

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
      site: LOCATIONS.find(l => l.id === location)?.label || 'בבית',
      ...scheduleFromCare(result.care),
      seasonApplied: currentSeason(),
      journal: [],
      scans: [scan],
    })
  }

  const reset = () => {
    setPhoto(null)
    setResult(null)
    setPending(null)
    setNotes('')
    setError('')
    setPhase('camera')
  }

  return (
    <div className="space-y-4">
      {targetPlant && (
        <div className="card bg-mint-100 border-mint-200 text-forest text-sm">
          סריקת מעקב עבור <b>{targetPlant.name}</b> — התוצאה תתווסף להיסטוריה של הצמח.
        </div>
      )}

      {phase === 'camera' && imagesOk === false && (
        <DescribePlant mode={mode} location={location} onLocation={setLocation} onSubmit={onDescribe} />
      )}

      {phase === 'camera' && imagesOk === null && <p className="text-center text-sm text-stone-500 py-10">מתחבר ל-Claude…</p>}

      {phase === 'camera' && imagesOk && (
        <CameraScanner
          mode={mode}
          location={location}
          onLocation={setLocation}
          notes={notes}
          onNotes={setNotes}
          onCapture={onCapture}
          onClose={() => setPhase('intro')}
        />
      )}

      {phase === 'scanning' && (
        <ScanningOverlay
          photo={photo}
          mode={mode}
          done={!!pending}
          error={error}
          onRetry={() => analyze(photo)}
          onNewPhoto={reset}
          onFinished={onFinished}
        />
      )}

      {phase === 'intro' && (
        <div className="card text-center space-y-4 py-8">
          <div className="mx-auto w-24 h-24 rounded-full bg-mint-50 grid place-items-center text-5xl">{mode === 'identify' ? '🔍' : '🩺'}</div>
          <div>
            <h2 className="text-lg font-extrabold text-forest">{mode === 'identify' ? 'איזה צמח זה?' : 'מה עובר על הצמח?'}</h2>
            <p className="text-sm text-stone-500 mt-1">
              {mode === 'identify'
                ? 'סרקו צמח ונזהה את הזן ונבנה לו מדריך גידול ולוח השקיה ודישון.'
                : 'סרקו את הצמח ונבדוק עלים, אדמה ומזיקים — ונגיד לכם בדיוק מה לעשות.'}
            </p>
          </div>
          <button className="btn-primary w-full text-lg py-4" onClick={() => setPhase('camera')}>📷 התחלת סריקה</button>
          <ul className="text-xs text-stone-500 text-right space-y-1 bg-mint-50 rounded-2xl p-3">
            <li>💡 צלמו באור יום, בלי פלאש.</li>
            <li>💡 שהצמח כולו ייכנס למסגרת, ואם יש בעיה — סריקה נוספת מקרוב של העלה הפגוע.</li>
            <li>💡 חשוד במזיקים? צלמו גם את הצד התחתון של העלים.</li>
          </ul>
        </div>
      )}

      {phase === 'result' && result && (
        <>
          <img src={photo} alt="" className="w-full max-h-64 object-cover rounded-3xl" />
          <ResultView result={result} mode={mode} />
          <div className="grid grid-cols-2 gap-2 sticky bottom-[calc(env(safe-area-inset-bottom)+88px)]">
            {result.is_plant && (
              <button className="btn-primary shadow-lg" onClick={save}>
                {targetPlant ? '💾 שמור בהיסטוריה' : '➕ הוספה לצמחים'}
              </button>
            )}
            <button className={`btn-ghost shadow-lg ${result.is_plant ? '' : 'col-span-2'}`} onClick={reset}>📷 סריקה חדשה</button>
          </div>
        </>
      )}
    </div>
  )
}
