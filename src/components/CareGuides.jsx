import { useState } from 'react'
import { SearchIcon } from './Icons.jsx'
import { plantPhoto } from '../lib/storage.js'

const GUIDES = [
  {
    id: 'water', icon: '💧', title: 'איך משקים נכון',
    sub: 'הטעות הנפוצה ביותר היא השקיית יתר',
    body: [
      'בודקים לפני שמשקים: תוחבים אצבע 2–3 ס"מ לאדמה. יבש — משקים. לח — מחכים.',
      'משקים לעומק עד שהמים יוצאים מחורי הניקוז, ושופכים את מה שהצטבר בתחתית אחרי 15 דקות.',
      'בקיץ הישראלי צמחי מרפסת וגינה צריכים מים בתדירות כפולה ויותר; בחורף — הרבה פחות.',
      'עדיף להשקות בבוקר מוקדם או בערב, לא בשמש של הצהריים.',
      'עלים צהובים ורכים ואדמה שתמיד רטובה = השקיית יתר. עלים יבשים ופריכים ואדמה שמתנתקת מדופן העציץ = חוסר מים.',
    ],
  },
  {
    id: 'light', icon: '☀️', title: 'אור ומיקום',
    sub: 'לכל צמח יש את החלון שלו',
    body: [
      'אור ישיר: מרפסת דרומית או מערבית, 6+ שעות שמש — לסוקולנטים, קקטוסים, תבלינים ועצי פרי.',
      'אור עקיף בהיר: ליד חלון מזרחי או מטר–שניים מחלון דרומי — לרוב צמחי הבית (פוטוס, מונסטרה, פיקוס).',
      'צל חלקי: חדרים פנימיים — לזמיוקולקס, סנסווייריה, ספטיפיליום.',
      'סימני חוסר אור: גבעולים ארוכים ודקים, עלים קטנים, צמח שנוטה לכיוון החלון.',
      'סימני עודף שמש: כתמים חומים-לבנים "שרופים" על העלים העליונים.',
    ],
  },
  {
    id: 'fertilize', icon: '🧪', title: 'דישון',
    sub: 'מעט ובקביעות, רק בעונת הגדילה',
    body: [
      'מדשנים באביב ובקיץ (מרץ–ספטמבר) כל 2–4 שבועות; בחורף מפסיקים או מצמצמים מאוד.',
      'דשן נוזלי מאוזן (כמו 20-20-20) בחצי מהריכוז שעל האריזה מתאים לרוב צמחי הבית.',
      'לא מדשנים צמח יבש — משקים קודם, ואז מדשנים.',
      'לא מדשנים צמח חולה או צמח שהועבר עציץ בחודש האחרון.',
      'קרום לבן על פני האדמה = הצטברות מלחים. שוטפים את האדמה במים רבים.',
    ],
  },
  {
    id: 'pests', icon: '🐛', title: 'מזיקים נפוצים',
    sub: 'כנימות, קמחיות, אקריות — ומה עושים',
    body: [
      'כנימת עלה: חרקים קטנים ירוקים/שחורים על קצות צמיחה. שוטפים בזרם מים ומרססים בסבון אשלגן.',
      'כנימה קמחית: "צמר גפן" לבן בפינות העלים. מנגבים בצמר גפן טבול באלכוהול 70%.',
      'אקרית אדומה: קורים דקים ונקודות צהבהבות בעלים, בעיקר באוויר יבש. מרססים מים ומעלים לחות; שמן נים.',
      'זבובוני פטריות: זבובים קטנים סביב העציץ. מייבשים את שכבת האדמה העליונה בין השקיות.',
      'תמיד בודקים את הצד התחתון של העלים, ומבודדים צמח נגוע משאר הצמחים.',
    ],
  },
  {
    id: 'repot', icon: '🪴', title: 'העברת עציץ',
    sub: 'מתי ואיך מעבירים לעציץ גדול יותר',
    body: [
      'הזמן הנכון: אביב. סימנים — שורשים יוצאים מחורי הניקוז, המים עוברים מהר מדי, הצמח מפסיק לגדול.',
      'עוברים לעציץ גדול ב-2–5 ס"מ בלבד. עציץ גדול מדי = אדמה שנשארת רטובה ושורשים נרקבים.',
      'תמיד עציץ עם חור ניקוז. שכבת חצץ בתחתית לא מחליפה ניקוז.',
      'מצע מנקז: אדמת שתילה + פרלייט (כ-30%). לסוקולנטים — הרבה יותר פרלייט או חול גס.',
      'אחרי ההעברה משקים היטב ומוותרים על דישון לחודש.',
    ],
  },
  {
    id: 'seasons', icon: '🗓️', title: 'עונות בישראל',
    sub: 'מה משתנה בין קיץ לחורף',
    body: [
      'קיץ (יוני–ספטמבר): חום ושרב. משקים יותר, מצלים צמחי מרפסת בשעות הצהריים, מגבירים לחות לצמחי בית.',
      'סתיו: הזמן הטוב לשתילה בגינה ולזריעת ירקות חורף ותבלינים.',
      'חורף (דצמבר–פברואר): מפחיתים השקיה ודישון, מרחיקים צמחי בית מהמזגן ומהתנור.',
      'אביב: עונת הגדילה — מעבירים עציצים, גוזמים, מתחילים לדשן.',
      'בשרב: משקים מוקדם בבוקר, לא מרססים עלים בשמש ישירה.',
    ],
  },
]

export default function CareGuides({ plants, onOpenPlant }) {
  const [open, setOpen] = useState(null)
  const [q, setQ] = useState('')

  const guide = GUIDES.find(g => g.id === open)
  if (guide) {
    return (
      <div className="space-y-4">
        <button onClick={() => setOpen(null)} className="text-sm font-bold text-mint-600">→ כל המדריכים</button>
        <div className="card">
          <div className="text-4xl">{guide.icon}</div>
          <h2 className="text-2xl font-extrabold text-forest mt-2">{guide.title}</h2>
          <p className="text-stone-500">{guide.sub}</p>
          <ul className="mt-4 space-y-3">
            {guide.body.map((line, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                <span className="mt-2 w-2 h-2 rounded-full bg-mint-500 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  const term = q.trim()
  const guides = GUIDES.filter(g => !term || [g.title, g.sub, ...g.body].some(t => t.includes(term)))
  const mine = plants.filter(p => !term || p.name.includes(term))

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-2 rounded-2xl bg-white border border-stone-200 px-4 py-3">
        <SearchIcon className="w-5 h-5 text-stone-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש: השקיה, כנימות, דישון..." className="flex-1 outline-none bg-transparent" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        {guides.map(g => (
          <button key={g.id} onClick={() => setOpen(g.id)} className="card p-4 text-right">
            <div className="w-12 h-12 rounded-2xl bg-mint-50 grid place-items-center text-2xl">{g.icon}</div>
            <div className="mt-3 font-extrabold text-stone-900">{g.title}</div>
            <div className="text-xs text-stone-500 mt-0.5">{g.sub}</div>
          </button>
        ))}
      </div>

      {mine.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-forest">המדריכים של הצמחים שלי</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {mine.map(p => (
              <button key={p.id} onClick={() => onOpenPlant(p.id)} className="shrink-0 w-32 text-right">
                <img src={plantPhoto(p)} alt="" className="w-32 h-32 rounded-2xl object-cover bg-mint-50" />
                <div className="mt-1.5 font-bold text-sm truncate">{p.name}</div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
