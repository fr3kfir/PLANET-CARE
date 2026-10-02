// Finds the Anthropic API key in the environment, tolerating common setup slips:
// a near-miss variable name, or the key pasted under some other variable name.

import Anthropic from '@anthropic-ai/sdk';

const NAMES = ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY', 'ANTHROPIC_KEY', 'ANTHROPIC_APIKEY', 'ANTHROPIC_API_TOKEN'];
const looksLikeKey = v => typeof v === 'string' && v.trim().startsWith('sk-ant-');

// { name, key } of the variable that holds the key, or null.
export function findAnthropicKey(env = process.env) {
  for (const name of NAMES) {
    if (env[name]?.trim()) return { name, key: env[name].trim() };
  }
  for (const [name, value] of Object.entries(env)) {
    if (looksLikeKey(value)) return { name, key: value.trim() };
  }
  return null;
}

export const MISSING_KEY_ERROR =
  'מפתח ה-API של Anthropic לא מוגדר בשרת. ב-Vercel: Settings ← Environment Variables, הוסיפו ANTHROPIC_API_KEY לכל הסביבות, ואז Redeploy. לבדיקה: פתחו /api/health';

export function anthropicClient() {
  const found = findAnthropicKey();
  return found ? new Anthropic({ apiKey: found.key }) : null;
}
