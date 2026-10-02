// Plant-expert chat: multi-turn, optional photos, streamed Hebrew replies.
// Shared by the Vercel function (api/chat.js) and the local Express server.

import Anthropic from '@anthropic-ai/sdk';
import { anthropicClient } from './anthropic-key.js';
import { CHAT_PROMPT, collectionContext } from '../../src/lib/prompts.js';

const ALLOWED_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_MESSAGES = 30;
const MAX_IMAGES = 4;

// Client sends [{ role: 'user'|'assistant', text, image?: { data, mediaType } }].
// Only the most recent photos are forwarded, to keep requests small.
function toApiMessages(history) {
  const recent = history.slice(-MAX_MESSAGES);
  while (recent.length && recent[0].role !== 'user') recent.shift();
  let imagesLeft = MAX_IMAGES;
  const keepImage = new Set();
  for (let i = recent.length - 1; i >= 0 && imagesLeft > 0; i--) {
    if (recent[i].image) {
      keepImage.add(i);
      imagesLeft--;
    }
  }
  return recent.map((m, i) => {
    const text = String(m.text || '').slice(0, 4000);
    if (m.role !== 'user') return { role: 'assistant', content: text || '…' };
    const content = [];
    if (m.image && keepImage.has(i) && ALLOWED_MEDIA.has(m.image.mediaType) && typeof m.image.data === 'string') {
      content.push({ type: 'image', source: { type: 'base64', media_type: m.image.mediaType, data: m.image.data } });
    } else if (m.image) {
      content.push({ type: 'text', text: '[תמונה ששותפה קודם בשיחה]' });
    }
    content.push({ type: 'text', text: text || 'מה אתה רואה בתמונה?' });
    return { role: 'user', content };
  });
}

export function validateChatBody(body) {
  const { messages, plants } = body || {};
  if (!Array.isArray(messages) || !messages.length) return { error: 'messages is required' };
  if (!messages.every(m => m && (m.role === 'user' || m.role === 'assistant'))) return { error: 'invalid message role' };
  if (messages[messages.length - 1].role !== 'user') return { error: 'last message must be from the user' };
  return { messages, plants };
}

// Streams the reply text through write(chunk). Resolves when done.
export async function streamChat({ messages, plants }, write) {
  const anthropic = anthropicClient();

  const params = {
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    system: [
      { type: 'text', text: CHAT_PROMPT, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: collectionContext(plants) },
    ],
    messages: toApiMessages(messages),
    // Conversational replies: low effort keeps answers quick on a phone.
    output_config: { effort: 'low' },
  };

  // If the primary model declines, the API retries on a fallback model in the same call.
  // If this account can't use that beta, start over without it (nothing was sent yet).
  let stream = anthropic.beta.messages.stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  let wrote = false;
  try {
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        wrote = true;
        write(event.delta.text);
      }
    }
  } catch (err) {
    if (wrote || !(err instanceof Anthropic.BadRequestError && /fallback|beta/i.test(err.message))) throw err;
    console.warn('fallback beta rejected, retrying without it:', err.message);
    stream = anthropic.messages.stream(params);
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') write(event.delta.text);
    }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') write('\n\nלא אוכל לעזור בזה. אשמח לענות על כל שאלה אחרת על צמחים 🌱');
  if (final.stop_reason === 'max_tokens') write('…');
}
