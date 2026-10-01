// Reminders without a push server: a calendar event (.ics) per care task, which the
// phone's calendar then alerts on, plus a summary notification when the app opens.
import { TASKS, allTasks } from './storage.js';

const SETTINGS_KEY = 'plant-care:reminders:v1';

export function loadReminderSettings() {
  try {
    return { enabled: false, hour: 9, lastNotified: null, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
  } catch {
    return { enabled: false, hour: 9, lastNotified: null };
  }
}

export function saveReminderSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch { /* storage blocked */ }
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export async function requestNotifications() {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}

// Once a day, when the app is opened, list what needs doing today.
export function notifyDueTasks(plants) {
  const s = loadReminderSettings();
  if (!s.enabled || !notificationsSupported() || Notification.permission !== 'granted') return;
  const today = new Date().toDateString();
  if (s.lastNotified === today) return;
  const due = allTasks(plants).filter(t => t.dueInDays <= 0);
  saveReminderSettings({ ...s, lastNotified: today });
  if (!due.length) return;
  const body = due.slice(0, 5).map(t => `${TASKS[t.type].icon} ${TASKS[t.type].verb} את ${t.plant.name}`).join('\n');
  try {
    new Notification(`צמחייה · ${due.length} משימות להיום`, { body, icon: '/icon.svg', lang: 'he', dir: 'rtl' });
  } catch { /* some mobile browsers only allow notifications from a service worker */ }
}

const pad = n => String(n).padStart(2, '0');
const icsDate = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const icsText = s => s.replace(/[\\;,]/g, m => `\\${m}`).replace(/\n/g, '\\n');

// A repeating calendar event with an alarm, e.g. "water the pothos every 7 days at 9:00".
export function downloadTaskIcs(plant, type, hour = loadReminderSettings().hour) {
  const t = TASKS[type];
  const every = plant[t.every];
  if (!every) return;
  const start = new Date(plant[t.last] || Date.now());
  if (plant[t.last]) start.setDate(start.getDate() + every);
  if (start < new Date()) start.setTime(Date.now());
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + 15 * 60 * 1000);
  const summary = `${t.icon} ${t.verb} את ${plant.name}`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//tzimchiya//plant-care//HE',
    'BEGIN:VEVENT',
    `UID:${plant.id}-${type}@tzimchiya`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `RRULE:FREQ=DAILY;INTERVAL=${every}`,
    `SUMMARY:${icsText(summary)}`,
    `DESCRIPTION:${icsText(`${t.label} כל ${every} ימים · ${plant.site}`)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(summary)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-${plant.name}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
