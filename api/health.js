// Setup check: GET /api/health shows which server settings the app can see.
// Only variable NAMES and yes/no flags are returned, never values.

import { findAnthropicKey } from './_lib/anthropic-key.js';
import { cloudEnabled } from './_lib/store.js';

export default function handler(req, res) {
  const found = findAnthropicKey();
  // Names that look related, to spot typos (e.g. "ANTHROPIC_API_KEY " or "anthropic_api_key").
  const related = Object.keys(process.env).filter(n => /anthropic|api_?key|^kv_|upstash|signup/i.test(n)).sort();
  res.status(200).json({
    ok: !!found,
    anthropicKey: found ? `found in ${found.name}` : 'missing',
    cloudStorage: cloudEnabled() ? 'connected' : 'not connected',
    environment: process.env.VERCEL_ENV || 'local',
    relatedVariableNames: related,
  });
}
