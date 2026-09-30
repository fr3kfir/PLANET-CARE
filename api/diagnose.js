// Plant identification + diagnosis endpoint (Vercel entry).
// Core logic lives in api/_lib/diagnose-core.js, shared with server.js.

import { getDiagnosisPayload } from './_lib/diagnose-core.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { status, body } = await getDiagnosisPayload(req.body);
  res.status(status).json(body);
}
