// Personalized plant tips endpoint (Vercel entry). Core logic in api/_lib/tips-core.js.

import { getTipsPayload } from './_lib/tips-core.js';
import { checkAiAccess } from './_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const denied = await checkAiAccess(req, 'tips').catch(err => {
    console.error('quota check failed:', err.message);
    return { status: 503, error: 'שירות החשבונות לא זמין כרגע' };
  });
  if (denied) return res.status(denied.status).json({ error: denied.error });
  const { status, body } = await getTipsPayload(req.body);
  res.status(status).json(body);
}
