import { useEffect, useState } from 'react'
import { SearchIcon } from './Icons.jsx'
import LightMeter from './LightMeter.jsx'
import { ArticleCard } from './PlantTips.jsx'
import { ARTICLES, CATEGORIES, articleById } from '../lib/articles.js'
import { plantPhoto } from '../lib/storage.js'
import { IS_ARTIFACT } from '../lib/platform.js'

function ArticleView({ article, onBack, onOpen }) {
  const more = ARTICLES.filter(a => a.category === article.category && a.id !== article.id).slice(0, 4)
  const category = CATEGORIES.find(c => c.id === article.category)

  useEffect(() => window.scrollTo(0, 0), [article.id])

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm font-bold text-mint-600">→ כל המאמרים</button>
      <article className="card p-0 overflow-hidden">
        <div className={`h-36 bg-gradient-to-bl ${article.color} grid place-items-center text-7xl`}>{article.emoji}</div>
        <div className="p-5 space-y-4">
          <div>
            <div className="text-xs font-bold text-mint-600">{category?.emoji} {category?.label} · {article.minutes} דק׳ קריאה</div>
            <h2 className="text-2xl font-extrabold text-forest mt-1 leading-tight">{article.title}</h2>
            <p className="text-stone-500 mt-1">{article.subtitle}</p>
          </div>
          {article.sections.map((s, i) => (
            <section key={i} className="space-y-2">
              {s.h && <h3 className="text-lg font-extrabold text-stone-900">{s.h}</h3>}
              {s.p && <p className="text-[15px] leading-relaxed text-stone-700">{s.p}</p>}
              {s.list && (
                <ul className="space-y-2.5">
                  {s.list.map((line, j) => (
                    <li key={j} className="flex gap-3 text-[15px] leading-relaxed text-stone-700">
                      <span className="mt-2 w-2 h-2 rounded-full bg-mint-500 shrink-0" />
                      {line}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </article>

      {more.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-extrabold text-forest px-1">עוד ב{category?.label}</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {more.map(a => <ArticleCard key={a.id} article={a} onOpen={onOpen} compact />)}
          </div>
        </section>
      )}
    </div>
  )
}

export default function CareGuides({ plants, onOpenPlant, article: articleProp, onArticle }) {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState(null)
  const [meter, setMeter] = useState(false)

  const article = articleById(articleProp)
  if (article) return <ArticleView article={article} onBack={() => onArticle(null)} onOpen={onArticle} />

  const term = q.trim()
  const matches = a => !term || [a.title, a.subtitle, ...a.sections.flatMap(s => [s.h, s.p, ...(s.list || [])])].some(t => t?.includes(term))
  const list = ARTICLES.filter(a => (!category || a.category === category) && matches(a))
  const [featured, ...rest] = list
  const mine = plants.filter(p => !term || p.name.includes(term))

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-2 rounded-2xl bg-white border border-stone-200 px-4 py-3">
        <SearchIcon className="w-5 h-5 text-stone-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש: השקיה, כנימות, ריחן..." className="flex-1 outline-none bg-transparent" />
      </label>

      {mine.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-extrabold text-forest">טיפים לצמחים שלי</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {mine.map(p => (
              <button key={p.id} onClick={() => onOpenPlant(p.id, 'guide')} className="card p-0 overflow-hidden w-44 shrink-0 text-right">
                <img src={plantPhoto(p)} alt="" className="w-full h-24 object-cover bg-mint-50" />
                <div className="p-2.5">
                  <div className="font-extrabold text-sm truncate">{p.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5 line-clamp-2 min-h-[2rem]">
                    {p.tips?.data?.headline || 'טיפים אישיים לפי הזן, המיקום והעונה ←'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <button
          onClick={() => setCategory(null)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ${!category ? 'bg-forest text-white' : 'bg-white text-stone-600 border border-stone-200'}`}
        >
          הכול
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id === category ? null : c.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ${category === c.id ? 'bg-forest text-white' : 'bg-white text-stone-600 border border-stone-200'}`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {featured && (
        <button onClick={() => onArticle(featured.id)} className="card p-0 overflow-hidden w-full text-right">
          <div className={`h-40 bg-gradient-to-bl ${featured.color} grid place-items-center text-7xl`}>{featured.emoji}</div>
          <div className="p-4">
            <div className="text-xs font-bold text-mint-600">{CATEGORIES.find(c => c.id === featured.category)?.label} · {featured.minutes} דק׳ קריאה</div>
            <div className="text-xl font-extrabold text-stone-900 mt-1">{featured.title}</div>
            <div className="text-sm text-stone-500 mt-0.5">{featured.subtitle}</div>
          </div>
        </button>
      )}

      {!category && !term && !IS_ARTIFACT && (
        <>
          {meter && <LightMeter onClose={() => setMeter(false)} />}
          <button onClick={() => setMeter(true)} className="card w-full flex items-center gap-4 text-right bg-gradient-to-l from-amber-50 to-white">
            <span className="w-14 h-14 rounded-2xl bg-amber-400 grid place-items-center text-3xl shrink-0">☀️</span>
            <span className="flex-1">
              <span className="block text-lg font-extrabold text-stone-900">מד אור</span>
              <span className="block text-sm text-stone-500">מודדים במצלמה כמה אור יש במקום ובודקים אם הוא מתאים לצמח</span>
            </span>
          </button>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        {rest.map(a => <ArticleCard key={a.id} article={a} onOpen={onArticle} />)}
      </div>

      {!list.length && <p className="text-center text-sm text-stone-500 py-6">לא מצאנו מאמר על "{term}". נסו לשאול את המומחה בצ׳אט 💬</p>}
    </div>
  )
}
