// "My plants" collection, kept in this browser's localStorage.
import { LOCATIONS } from './labels.js';

const KEY = 'plant-care:plants:v1';
const DAY = 24 * 60 * 60 * 1000;

export const TASKS = {
  water: { label: 'השקיה', task: n => `להשקות את ${n}`, done: 'הושקה', icon: '💧', every: 'waterEveryDays', last: 'lastWatered', care: 'water_every_days', color: 'text-sky-700 bg-sky-50' },
  fertilize: { label: 'דישון', task: n => `לדשן את ${n}`, done: 'דושן', icon: '🧪', every: 'fertilizeEveryDays', last: 'lastFertilized', care: 'fertilize_every_days', color: 'text-amber-700 bg-amber-50' },
  mist: { label: 'ריסוס', task: n => `לרסס את ${n}`, done: 'רוסס', icon: '🌫️', every: 'mistEveryDays', last: 'lastMisted', care: 'mist_every_days', color: 'text-teal-700 bg-teal-50' },
  prune: { label: 'גיזום', task: n => `לגזום את ${n}`, done: 'נגזם', icon: '✂️', every: 'pruneEveryDays', last: 'lastPruned', care: 'prune_every_days', color: 'text-lime-700 bg-lime-50' },
  repot: { label: 'החלפת עציץ', task: n => `להחליף עציץ ל${n}`, done: 'הועבר לעציץ חדש', icon: '🪴', every: 'repotEveryDays', last: 'lastRepotted', care: 'repot_every_days', color: 'text-orange-700 bg-orange-50' },
};

// Israeli seasons for care plans: warm (April-October) and cool (November-March).
export function currentSeason(date = new Date()) {
  const m = date.getMonth() + 1;
  return m >= 4 && m <= 10 ? 'warm' : 'cool';
}
export const SEASON_LABEL = { warm: 'עונה חמה (אפריל–אוקטובר)', cool: 'עונה קרירה (נובמבר–מרץ)' };
const SEASONAL_TASKS = ['water', 'fertilize', 'mist'];

// Switch a plant's intervals to the current season's plan, once per season change.
export function applySeasonPlan(plant) {
  const plan = plant.scans[0]?.result?.care?.seasonal_plan;
  const season = currentSeason();
  if (!plan?.[season] || plant.autoSeason === false || plant.seasonApplied === season) return plant;
  const next = { ...plant, seasonApplied: season };
  for (const type of SEASONAL_TASKS) next[TASKS[type].every] = plan[season][TASKS[type].care] || null;
  if (plant.seasonApplied) {
    next.journal = [{ id: newId(), date: new Date().toISOString(), type: 'season', text: `לוח הטיפול עודכן ל${SEASON_LABEL[season]}` }, ...plant.journal];
  }
  return next;
}

// Initial schedule for a newly identified plant.
export function scheduleFromCare(care) {
  const out = {};
  for (const t of Object.values(TASKS)) {
    out[t.every] = care?.[t.care] || null;
    out[t.last] = null;
  }
  return out;
}

// Fill in fields added after v1 so older saved plants keep working.
export function normalize(p) {
  const care = p.scans?.[0]?.result?.care;
  const plant = {
    ...p,
    site: p.site || LOCATIONS.find(l => l.id === p.location)?.label || 'בבית',
    journal: p.journal || [],
    scans: p.scans || [],
  };
  for (const t of Object.values(TASKS)) {
    if (plant[t.last] === undefined) plant[t.last] = null;
    if (plant[t.every] === undefined) plant[t.every] = care?.[t.care] || null;
  }
  if (plant.seasonApplied === undefined && care?.seasonal_plan) plant.seasonApplied = currentSeason();
  return applySeasonPlan(plant);
}

export function loadPlants() {
  try {
    return (JSON.parse(localStorage.getItem(KEY)) || []).map(normalize);
  } catch {
    return [];
  }
}

export function savePlants(plants) {
  try {
    localStorage.setItem(KEY, JSON.stringify(plants));
    return true;
  } catch {
    return false; // quota exceeded or storage blocked
  }
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function plantPhoto(plant) {
  return plant.photo || plant.scans[0]?.thumb;
}


function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

// { type, every, dueInDays, next } for a recurring care task, or null when not scheduled.
export function taskStatus(plant, type) {
  const t = TASKS[type];
  const every = plant[t.every];
  if (!every) return null;
  // Never done yet: water right away; other tasks count from when the plant was added.
  const last = plant[t.last] || (type === 'water' ? null : plant.createdAt);
  if (!last) return { type, every, dueInDays: 0, next: null };
  const next = startOfDay(last) + every * DAY;
  const dueInDays = Math.round((next - startOfDay(Date.now())) / DAY);
  return { type, every, dueInDays, next: new Date(next) };
}

export function wateringStatus(plant) {
  return taskStatus(plant, 'water');
}

// All scheduled tasks across the collection, soonest first.
export function allTasks(plants) {
  return plants
    .flatMap(plant => Object.keys(TASKS).map(type => ({ plant, ...taskStatus(plant, type) })).filter(t => t.every))
    .sort((a, b) => a.dueInDays - b.dueInDays);
}

// Mark a care task done now and record it in the plant's journal.
export function completeTask(plant, type) {
  const t = TASKS[type];
  const date = new Date().toISOString();
  return {
    ...plant,
    [t.last]: date,
    journal: [{ id: newId(), date, type }, ...plant.journal],
  };
}

export function dueLabel(dueInDays) {
  if (dueInDays < -1) return `באיחור של ${-dueInDays} ימים`;
  if (dueInDays === -1) return 'באיחור של יום';
  if (dueInDays === 0) return 'היום';
  if (dueInDays === 1) return 'מחר';
  return `בעוד ${dueInDays} ימים`;
}

// Care tasks falling on a given calendar day: overdue ones count as today; each task
// then repeats every N days from its next due date. Past days have no tasks.
export function tasksOnDay(plants, day) {
  const d = startOfDay(day);
  const today = startOfDay(Date.now());
  if (d < today) return [];
  return allTasks(plants).filter(t => {
    const first = today + Math.max(0, t.dueInDays) * DAY;
    if (d < first) return false;
    return Math.round((d - first) / DAY) % t.every === 0;
  });
}
