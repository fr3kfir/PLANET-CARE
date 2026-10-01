// "My plants" collection, kept in this browser's localStorage.
import { LOCATIONS } from './labels.js';

const KEY = 'plant-care:plants:v1';
const DAY = 24 * 60 * 60 * 1000;

// Fill in fields added after v1 so older saved plants keep working.
function normalize(p) {
  const care = p.scans?.[0]?.result?.care;
  return {
    ...p,
    site: p.site || LOCATIONS.find(l => l.id === p.location)?.label || 'בבית',
    lastFertilized: p.lastFertilized ?? null,
    fertilizeEveryDays: p.fertilizeEveryDays !== undefined ? p.fertilizeEveryDays : care?.fertilize_every_days || null,
    journal: p.journal || [],
    scans: p.scans || [],
  };
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

export const TASKS = {
  water: { label: 'השקיה', verb: 'להשקות', done: 'הושקה', icon: '💧', every: 'waterEveryDays', last: 'lastWatered', color: 'text-sky-700 bg-sky-50' },
  fertilize: { label: 'דישון', verb: 'לדשן', done: 'דושן', icon: '🧪', every: 'fertilizeEveryDays', last: 'lastFertilized', color: 'text-amber-700 bg-amber-50' },
};

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
  const last = plant[t.last];
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
