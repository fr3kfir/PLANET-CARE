import { CARE_FIELDS, CATEGORY, CONFIDENCE, SEVERITY, STATUS } from '../lib/labels.js'

export function HealthBadge({ status }) {
  const s = STATUS[status] || STATUS.needs_attention
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${s.cls}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export function CareGuide({ care }) {
  return (
    <div className="card">
      <h3 className="font-extrabold mb-3">📘 מדריך גידול</h3>
      <dl className="space-y-3">
        {CARE_FIELDS.map(([key, icon, label]) =>
          care[key] ? (
            <div key={key} className="flex gap-3">
              <span className="text-xl shrink-0">{icon}</span>
              <div>
                <dt className="text-xs font-bold text-forest">{label}</dt>
                <dd className="text-sm">{care[key]}</dd>
              </div>
            </div>
          ) : null,
        )}
      </dl>
    </div>
  )
}

export default function ResultView({ result, mode = 'diagnose', hideCare = false }) {
  if (!result.is_plant) {
    return (
      <div className="card text-center space-y-2">
        <div className="text-4xl">🤔</div>
        <p className="font-bold">לא זיהינו צמח בתמונה</p>
        <p className="text-sm text-stone-500">{result.photo_quality_note || 'נסו לצלם שוב כשהצמח במרכז הפריים ובאור טוב.'}</p>
      </div>
    )
  }

  const { identification: id, health, issues, care, tips } = result

  const careBlock = hideCare ? null : <CareGuide care={care} />

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-2xl font-extrabold">{id.common_name_he}</h2>
            <p className="text-sm text-stone-500 italic" dir="ltr">{id.scientific_name}</p>
            <p className="text-xs text-stone-400">{id.common_name_en} · {id.family}</p>
          </div>
          <span className="text-xs rounded-full bg-stone-100 px-2 py-1 whitespace-nowrap">{CONFIDENCE[id.confidence]}</span>
        </div>
        <p className="text-sm mt-3">{id.description}</p>
        {id.alternatives?.length > 0 && id.confidence !== 'high' && (
          <p className="text-xs text-stone-500 mt-2">ייתכן גם: {id.alternatives.join(' · ')}</p>
        )}
      </div>

      {mode === 'identify' && careBlock}

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-extrabold">🩺 מצב הצמח</h3>
          <HealthBadge status={health.status} />
        </div>
        <div className="h-2 rounded-full bg-stone-100 overflow-hidden mb-3">
          <div
            className={`h-full ${health.score >= 75 ? 'bg-green-500' : health.score >= 45 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${Math.max(3, Math.min(100, health.score))}%` }}
          />
        </div>
        <p className="text-sm">{health.summary}</p>
        {result.photo_quality_note && (
          <p className="text-xs text-stone-500 mt-2">📸 {result.photo_quality_note}</p>
        )}
      </div>

      {issues.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-extrabold px-1">⚠️ בעיות שזוהו ({issues.length})</h3>
          {issues.map((issue, i) => {
            const cat = CATEGORY[issue.category] || CATEGORY.other
            const sev = SEVERITY[issue.severity] || SEVERITY.medium
            return (
              <div key={i} className="card">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="font-bold">{issue.title}</span>
                  <span className={`text-xs rounded-full px-2 py-0.5 ${sev.cls}`}>{sev.label}</span>
                  <span className="text-xs rounded-full px-2 py-0.5 bg-stone-100">{cat.label}</span>
                </div>
                <p className="text-sm text-stone-600 mt-2">🔎 {issue.evidence}</p>
                <div className="mt-3 bg-mint-50 rounded-2xl p-3">
                  <div className="text-xs font-bold text-forest mb-1">מה לעשות:</div>
                  <ol className="list-decimal pr-5 text-sm space-y-1">
                    {issue.treatment.map((step, j) => <li key={j}>{step}</li>)}
                  </ol>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {issues.length === 0 && (
        <div className="card bg-green-100 border-green-200 text-green-900 text-sm">
          ✅ לא נמצאו בעיות נראות לעין. המשיכו כך!
        </div>
      )}

      {mode !== 'identify' && careBlock}

      {tips.length > 0 && (
        <div className="card">
          <h3 className="font-extrabold mb-2">🌱 טיפים</h3>
          <ul className="space-y-2 text-sm">
            {tips.map((t, i) => <li key={i}>• {t}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
