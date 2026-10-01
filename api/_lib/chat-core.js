// Plant-expert chat: multi-turn, optional photos, streamed Hebrew replies.
// Shared by the Vercel function (api/chat.js) and the local Express server.

import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are "המומחה לצמחים", a warm, practical plant expert inside a Hebrew plant-care app for home growers in Israel. You know houseplants, balcony and garden plants, herbs, vegetables, fruit trees, succulents, lawns, propagation, pests and diseases, soil and fertilizers, irrigation, garden design and the Israeli climate and seasons.

How to answer:
- Always reply in Hebrew (Latin only for scientific names), in a friendly, conversational tone.
- Be concrete and actionable: amounts, frequencies, timing for the current season in Israel, what to buy and where it goes. Prefer gentle/organic solutions first.
- Keep answers short and scannable for a phone screen: a direct answer first, then a few bullets or numbered steps only when they help. Use **bold** sparingly for key words. No headings or tables.
- When the user shares a photo, look closely (leaf color, spots, edges, pests, soil, pot) and say what you see before advising. If a better photo would help, say exactly what to shoot.
- Use the user's plant collection below when relevant (refer to their plants by name), but don't recite it unprompted.
- If you're unsure, say so and suggest how to check. Flag pet or child toxicity when it matters.
- Stay on plants, gardening, growing food and closely related topics. If asked about something unrelated, say briefly and kindly that you can only help with plants and offer a plant-related angle.`;

const LOCATION_LABELS = { indoor: 'בתוך הבית', balcony: 'מרפסת', garden: 'גינה' };
const ALLOWED_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_MESSAGES = 30;
const MAX_IMAGES = 4;

function collectionContext(plants) {
  const now = new Date();
  const date = now.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jerusalem' });
  const lines = (Array.isArray(plants) ? plants : []).slice(0, 40).map(p => {
    const parts = [
      `- ${String(p.name || '').slice(0, 60)}`,
      p.scientific ? `(${String(p.scientific).slice(0, 80)})` : '',
      p.site ? `· מיקום: ${String(p.site).slice(0, 40)}` : '',
      p.location && LOCATION_LABELS[p.location] ? `· ${LOCATION_LABELS[p.location]}` : '',
      p.waterEveryDays ? `· השקיה כל ${Number(p.waterEveryDays)} ימים` : '',
      p.lastWatered ? `· הושקה לאחרונה ${String(p.lastWatered).slice(0, 10)}` : '',
      p.health ? `· מצב בסריקה אחרונה: ${String(p.health).slice(0, 160)}` : '',
    ];
    return parts.filter(Boolean).join(' ');
  });
  return `Today's date: ${date} (Israel).\n\nThe user's plant collection:\n${lines.length ? lines.join('\n') : '(no plants saved yet)'}`;
}

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
  const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

  const stream = anthropic.beta.messages.stream({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: collectionContext(plants) },
    ],
    messages: toApiMessages(messages),
    // Conversational replies: low effort keeps answers quick on a phone.
    output_config: { effort: 'low' },
    // If the primary model declines, the API retries on a fallback model in the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') write(event.delta.text);
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') write('\n\nלא אוכל לעזור בזה. אשמח לענות על כל שאלה אחרת על צמחים 🌱');
  if (final.stop_reason === 'max_tokens') write('…');
}
