// "My plants" collection, kept in this browser's localStorage.
const KEY = 'plant-care:plants:v1';
const DAY = 24 * 60 * 60 * 1000;

export function loadPlants() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
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

export function wateringStatus(plant) {
  const every = plant.waterEveryDays || plant.scans?.[0]?.result?.care?.water_every_days;
  if (!every) return null;
  const last = plant.lastWatered ? new Date(plant.lastWatered).getTime() : null;
  if (!last) return { every, dueInDays: 0, next: null };
  const next = last + every * DAY;
  const dueInDays = Math.ceil((next - Date.now()) / DAY);
  return { every, dueInDays, next: new Date(next) };
}
