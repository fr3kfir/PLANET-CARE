export const LOCATIONS = [
  { id: 'indoor', label: 'בבית', icon: '🏠' },
  { id: 'balcony', label: 'מרפסת', icon: '🌤️' },
  { id: 'garden', label: 'גינה', icon: '🌳' },
];

export const STATUS = {
  healthy: { label: 'בריא', cls: 'bg-green-100 text-green-800 border-green-300', dot: 'bg-green-500' },
  needs_attention: { label: 'דורש תשומת לב', cls: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
  critical: { label: 'מצב קריטי', cls: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-500' },
};

export const SEVERITY = {
  low: { label: 'קל', cls: 'bg-sky-100 text-sky-800' },
  medium: { label: 'בינוני', cls: 'bg-amber-100 text-amber-800' },
  high: { label: 'חמור', cls: 'bg-red-100 text-red-800' },
};

export const CATEGORY = {
  light_low: { label: 'חוסר אור', icon: '🌥️' },
  light_high: { label: 'עודף שמש', icon: '☀️' },
  overwatering: { label: 'השקיית יתר', icon: '💦' },
  underwatering: { label: 'חוסר מים', icon: '🏜️' },
  soil_drainage: { label: 'אדמה / ניקוז', icon: '🪨' },
  pests: { label: 'מזיקים / כנימות', icon: '🐛' },
  disease: { label: 'מחלה', icon: '🍂' },
  nutrients: { label: 'דישון / מחסור', icon: '🧪' },
  temperature: { label: 'טמפרטורה', icon: '🌡️' },
  humidity: { label: 'לחות', icon: '💧' },
  pot_roots: { label: 'עציץ / שורשים', icon: '🪴' },
  other: { label: 'אחר', icon: '🔎' },
};

export const CONFIDENCE = { high: 'זיהוי ודאי', medium: 'זיהוי סביר', low: 'זיהוי לא ודאי' };

export const CARE_FIELDS = [
  ['light', '☀️', 'אור'],
  ['water', '💧', 'השקיה'],
  ['soil', '🪴', 'אדמה'],
  ['humidity', '🌫️', 'לחות'],
  ['temperature', '🌡️', 'טמפרטורה'],
  ['fertilizer', '🧪', 'דישון'],
  ['repotting', '🔄', 'העברת עציץ'],
  ['best_location', '📍', 'מיקום מומלץ'],
  ['pet_toxicity', '🐾', 'רעילות לחיות מחמד'],
];

export function formatDate(d) {
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatShortDate(d) {
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}
