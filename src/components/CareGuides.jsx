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
  const [meter, setMeter] = useState(false)

  const article = articleById(articleProp)
  if (article) return <ArticleView article={article} onBack={() => onArticle(null)} onOpen={onArticle} />

  const term = q.trim()
  const matches = a => !term || [a.title, a.subtitle, ...a.sections.flatMap(s => [s.h, s.p, ...(s.list || [])])].some(t => t?.includes(term))
  const found = ARTICLES.filter(matches)
  const mine = plants.filter(p => !term || p.name.includes(term))

  return (
    <div className="space-y-6">
      <form className="flex items-center gap-2 rounded-full bg-white border border-stone-200 p-1.5 pr-4 shadow-sm" onSubmit={e => e.preventDefault()}>
        <input id="guide-search" value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש מדריכים: השקיה, כנימות, ריחן..." className="flex-1 min-w-0 outline-none bg-transparent" />
        <span className="w-10 h-10 rounded-full bg-mint-500 text-white grid place-items-center shrink-0"><SearchIcon className="w-5 h-5" /></span>
      </form>

      {mine.length > 0 && (
        <section className="space-y-2">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900">הצמחים שלך</h2>
            <p className="text-sm text-stone-500">מדריכים וטיפים אישיים לכל אחד מהצמחים שלך</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {mine.map(p => (
              <button key={p.id} onClick={() => onOpenPlant(p.id, 'guide')} className="relative w-36 h-44 shrink-0 rounded-3xl overflow-hidden text-right shadow-sm">
                <img src={plantPhoto(p)} alt="" className="absolute inset-0 w-full h-full object-cover bg-mint-100" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className="absolute top-2 right-2 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-bold text-white">
                  {p.tips?.data?.tips?.length ? `${p.tips.data.tips.length} טיפים` : 'טיפים אישיים'}
                </span>
                <span className="absolute bottom-2.5 inset-x-3 font-extrabold text-white leading-tight line-clamp-2">{p.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {term ? (
        <section className="space-y-2">
          <h2 className="text-xl font-extrabold text-stone-900">תוצאות ({found.length})</h2>
          <div className="grid grid-cols-2 gap-3">
            {found.map(a => <ArticleCard key={a.id} article={a} onOpen={onArticle} />)}
          </div>
          {!found.length && <p className="text-center text-sm text-stone-500 py-6">לא מצאנו מאמר על "{term}". נסו לשאול את המומחה בצ׳אט 💬</p>}
        </section>
      ) : (
        <>
          {!IS_ARTIFACT && (
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

          {CATEGORIES.map(c => {
            const list = ARTICLES.filter(a => a.category === c.id)
            if (!list.length) return null
            return (
              <section key={c.id} className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xl font-extrabold text-stone-900">{c.emoji} {c.label}</h2>
                  <span className="text-sm font-bold text-mint-600">{list.length} מדריכים</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                  {list.map(a => (
                    <button key={a.id} onClick={() => onArticle(a.id)} className={`relative w-48 h-40 shrink-0 rounded-3xl overflow-hidden text-right bg-gradient-to-bl ${a.color} shadow-sm`}>
                      <span className="absolute top-3 left-4 text-5xl">{a.emoji}</span>
                      <span className="absolute top-2 right-2 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-bold text-white">{a.minutes} דק׳ קריאה</span>
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent pt-8 pb-2.5 px-3 font-extrabold text-white leading-tight line-clamp-2">{a.title}</span>
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}
