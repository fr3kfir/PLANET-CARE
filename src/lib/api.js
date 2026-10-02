import { authHeaders } from './cloud.js';
import { IS_ARTIFACT } from './platform.js';
import { chatWithClaude, diagnoseWithClaude, tipsWithClaude } from './claudeAI.js';

export async function diagnose({ dataUrl, location, notes, knownSpecies }) {
  if (IS_ARTIFACT) return diagnoseWithClaude({ dataUrl, location, notes, knownSpecies });
  const [, mediaType, image] = dataUrl.match(/^data:(image\/[\w+]+);base64,(.*)$/) || [];
  const r = await fetch('/api/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ image, mediaType, location, notes, knownSpecies }),
  }).catch(() => {
    throw new Error('אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.');
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || serverErrorText(r.status));
  return body;
}

// Messages for failures that come back without our JSON error body (platform errors).
function serverErrorText(status) {
  if (status === 504) return 'הניתוח לקח יותר מדי זמן ונקטע. נסו שוב.';
  if (status === 413) return 'התמונה גדולה מדי. נסו תמונה אחרת.';
  if (status === 404) return 'השרת לא נמצא. ודאו שהאתר נפרס מחדש ב-Vercel.';
  return `שגיאת שרת (${status}). נסו שוב.`;
}

// Plant-expert chat: streams the reply text, calling onDelta with each chunk.
export async function chatStream({ messages, plants, signal, onDelta }) {
  if (IS_ARTIFACT) return chatWithClaude({ messages, plants, signal, onDelta });
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ messages, plants }),
    signal,
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error || serverErrorText(r.status));
  }
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onDelta(decoder.decode(value, { stream: true }));
  }
}

// Personalized tips for one plant (see api/_lib/tips-core.js).
export async function fetchTips(plant) {
  if (IS_ARTIFACT) return tipsWithClaude(plant);
  const r = await fetch('/api/tips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ plant }),
  }).catch(() => {
    throw new Error('אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.');
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || serverErrorText(r.status));
  return body;
}
