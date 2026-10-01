// Plant identification + diagnosis endpoint (Vercel entry).
// Core logic lives in api/_lib/diagnose-core.js, shared with server.js.

import { getDiagnosisPayload } from './_lib/diagnose-core.js';
import { checkAiAccess } from './_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const denied = await checkAiAccess(req, 'diagnose').catch(err => {
    console.error('quota check failed:', err.message);
    return { status: 503, error: 'שירות החשבונות לא זמין כרגע' };
  });
  if (denied) return res.status(denied.status).json({ error: denied.error });
  const { status, body } = await getDiagnosisPayload(req.body);
  res.status(status).json(body);
}
