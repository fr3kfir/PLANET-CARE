// Plant-expert chat endpoint (Vercel entry). Streams the reply as plain text.
// Core logic lives in api/_lib/chat-core.js, shared with server.js.

import Anthropic from '@anthropic-ai/sdk';
import { streamChat, validateChatBody } from './_lib/chat-core.js';
import { checkAiAccess } from './_lib/store.js';

export async function handleChat(req, res) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' });
  }
  const input = validateChatBody(req.body);
  if (input.error) return res.status(400).json({ error: input.error });
  const denied = await checkAiAccess(req, 'chat').catch(err => {
    console.error('quota check failed:', err.message);
    return { status: 503, error: 'שירות החשבונות לא זמין כרגע' };
  });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  let started = false;
  try {
    await streamChat(input, chunk => {
      if (!started) {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' });
        started = true;
      }
      res.write(chunk);
    });
    if (!started) res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end();
  } catch (err) {
    console.error('chat error:', err.message);
    if (started) return res.end('\n\n⚠️ החיבור נקטע. נסו לשלוח שוב.');
    const status = err instanceof Anthropic.RateLimitError ? 429 : 500;
    res.status(status).json({ error: status === 429 ? 'יותר מדי בקשות, נסו שוב בעוד רגע' : err.message });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  return handleChat(req, res);
}
