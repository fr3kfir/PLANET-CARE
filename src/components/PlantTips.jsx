import { useEffect, useRef, useState } from 'react'
import { fetchTips } from '../lib/api.js'
import { tipsAreFresh, tipsRequest, withTips } from '../lib/tips.js'
import { articleById } from '../lib/articles.js'
import { formatDate } from '../lib/labels.js'

const CATEGORY_ICON = {
  water: '💧', light: '☀️', soil: '🪨', fertilize: '🧪', pests: '🐛', pruning: '✂️',
  propagation: '🌱', season: '🗓️', placement: '📍', other: '💡',
}
const PRIORITY = {
  now: { label: 'עכשיו', cls: 'bg-red-50 text-red-600' },
  soon: { label: 'בקרוב', cls: 'bg-amber-50 text-amber-700' },
  general: { label: 'כללי', cls: 'bg-stone-100 text-stone-500' },
}

export function ArticleCard({ article, onOpen, compact = false }) {
  return (
    <button onClick={() => onOpen(article.id)} className={`card p-0 overflow-hidden text-right ${compact ? 'w-56 shrink-0' : ''}`}>
      <div className={`h-24 bg-gradient-to-bl ${article.color} grid place-items-center text-5xl`}>{article.emoji}</div>
      <div className="p-3">
        <div className="font-extrabold text-stone-900 leading-snug">{article.title}</div>
        <div className="text-xs text-stone-500 mt-0.5 line-clamp-2">{article.subtitle}</div>
        <div className="text-[11px] text-mint-600 font-bold mt-1.5">{article.minutes} דק׳ קריאה</div>
      </div>
    </button>
  )
}

// Personalized tips for one plant: loads them once and caches them on the plant.
export default function PlantTips({ plant, onUpdate, onOpenArticle, locked }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const started = useRef(false)
  const data = plant.tips?.data
  const fresh = tipsAreFresh(plant)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const tips = await fetchTips(tipsRequest(plant))
      onUpdate(p => withTips(p, tips))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // First visit (or stale tips): fetch automatically, once.
  useEffect(() => {
    if (!fresh && !locked && !started.current) {
      started.current = true
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh, locked])

  if (!data) {
    return (
      <div className="card text-center space-y-3 py-6">
        <div className="text-4xl">{loading ? '⏳' : '💡'}</div>
        <p className="font-extrabold text-forest">
          {loading ? `מכינים טיפים אישיים ל${plant.name}…` : locked ? 'התחברו כדי לקבל טיפים אישיים' : `טיפים אישיים ל${plant.name}`}
        </p>
        {loading && <p className="text-sm text-stone-500">לפי הזן, המיקום, העונה והיסטוריית הטיפול. לוקח כמה שניות.</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !locked && <button className="btn-primary" onClick={load}>{error ? 'נסו שוב' : 'קבלו טיפים'}</button>}
      </div>
    )
  }

  const related = (data.related_articles || []).map(articleById).filter(Boolean)

  return (
    <div className="space-y-4">
      <div className="card bg-gradient-to-bl from-mint-100 to-white">
        <div className="text-xs font-bold text-mint-600">💡 הכי חשוב עכשיו</div>
        <p className="mt-1 text-lg font-extrabold text-forest leading-snug">{data.headline}</p>
        {data.seasonal_focus && <p className="mt-2 text-sm text-stone-600">🗓️ {data.seasonal_focus}</p>}
      </div>

      <div className="space-y-3">
        {data.tips.map((t, i) => (
          <div key={i} className="card flex gap-3">
            <span className="w-10 h-10 shrink-0 rounded-2xl bg-mint-50 grid place-items-center text-xl">{CATEGORY_ICON[t.category] || '💡'}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-stone-900">{t.title}</span>
                {PRIORITY[t.priority] && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${PRIORITY[t.priority].cls}`}>{PRIORITY[t.priority].label}</span>}
              </div>
              <p className="text-sm text-stone-600 mt-1 leading-relaxed">{t.body}</p>
            </div>
          </div>
        ))}
      </div>

      {data.common_mistakes?.length > 0 && (
        <div className="card">
          <h3 className="font-extrabold text-stone-900 mb-2">🚫 טעויות נפוצות</h3>
          <ul className="space-y-1.5 text-sm text-stone-600">
            {data.common_mistakes.map((m, i) => <li key={i}>• {m}</li>)}
          </ul>
        </div>
      )}

      {data.did_you_know && (
        <div className="card bg-amber-50 border-amber-100">
          <div className="text-xs font-bold text-amber-700">🤓 הידעתם?</div>
          <p className="text-sm text-stone-700 mt-1">{data.did_you_know}</p>
        </div>
      )}

      {related.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-extrabold text-forest px-1">📚 כדאי לקרוא</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {related.map(a => <ArticleCard key={a.id} article={a} onOpen={onOpenArticle} compact />)}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between text-xs text-stone-400 px-1">
        <span>עודכן {formatDate(data.generatedAt)}</span>
        {!locked && (
          <button className="text-mint-600 font-bold disabled:opacity-50" disabled={loading} onClick={load}>
            {loading ? 'מעדכן…' : '↻ רענון טיפים'}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600 px-1">{error}</p>}
    </div>
  )
}
