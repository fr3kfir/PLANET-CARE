// Personalized care tips for one of the user's plants: its species, where it lives,
// its latest health scan, recent care history and the current season in Israel.

import Anthropic from '@anthropic-ai/sdk';
import { ARTICLES } from '../../src/lib/articles.js';
import { createWithFallback } from './diagnose-core.js';

const ARTICLE_IDS = ARTICLES.map(a => a.id);

const TIPS_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'One short sentence: the most important thing for this plant right now' },
    tips: {
      type: 'array',
      description: '4-6 tips specific to this plant, most urgent first',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string', description: '1-3 practical sentences' },
          category: { type: 'string', enum: ['water', 'light', 'soil', 'fertilize', 'pests', 'pruning', 'propagation', 'season', 'placement', 'other'] },
          priority: { type: 'string', enum: ['now', 'soon', 'general'] },
        },
        required: ['title', 'body', 'category', 'priority'],
        additionalProperties: false,
      },
    },
    seasonal_focus: { type: 'string', description: 'What to focus on for this plant this month/season in Israel' },
    common_mistakes: { type: 'array', items: { type: 'string' }, description: '2-3 mistakes people often make with this species' },
    did_you_know: { type: 'string', description: 'One interesting, accurate fact about this species' },
    related_articles: { type: 'array', items: { type: 'string', enum: ARTICLE_IDS }, description: 'Up to 3 article ids most relevant to this plant now' },
  },
  required: ['headline', 'tips', 'seasonal_focus', 'common_mistakes', 'did_you_know', 'related_articles'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are an experienced horticulturist writing personalized care tips for one specific plant in a Hebrew plant-care app for home growers in Israel.

Rules:
- Write everything in Hebrew (scientific names in Latin), warm and practical, short enough for a phone.
- Tailor every tip to THIS plant: its species, where it grows (indoors, balcony or garden and the named spot), the current month and season in Israel, its latest health scan and its recent care history. Avoid generic advice that applies to every plant.
- If the care history suggests a problem (e.g. watered too often or not for a long time, a health issue not followed up), address it first with priority "now".
- Give concrete numbers where useful (how often, how much, which product type, what to look for).
- Only state facts you are confident about.`;

const LOCATION_LABELS = { indoor: 'בתוך הבית', balcony: 'מרפסת', garden: 'גינה' };
const clip = (v, n) => String(v ?? '').slice(0, n);

function describePlant(p) {
  const month = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'Asia/Jerusalem' });
  const lines = [
    `Current month: ${month}.`,
    `Plant name: ${clip(p.name, 80)}`,
    p.scientific && `Species: ${clip(p.scientific, 120)}${p.family ? ` (${clip(p.family, 60)})` : ''}`,
    p.location && LOCATION_LABELS[p.location] && `Grows: ${LOCATION_LABELS[p.location]}`,
    p.site && `Spot: ${clip(p.site, 60)}`,
    p.health && `Latest health scan (${clip(p.healthDate, 10)}): ${clip(p.health, 300)}`,
    Array.isArray(p.issues) && p.issues.length && `Issues found then: ${p.issues.slice(0, 5).map(i => clip(i, 80)).join('; ')}`,
    p.schedule && `Care schedule (days): ${clip(JSON.stringify(p.schedule), 300)}`,
    Array.isArray(p.history) && p.history.length && `Recent care history (newest first):\n${p.history.slice(0, 12).map(h => `- ${clip(h, 160)}`).join('\n')}`,
  ];
  return lines.filter(Boolean).join('\n');
}

export async function getTipsPayload(body) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: 503, body: { error: 'ANTHROPIC_API_KEY is not configured on the server' } };
  }
  const plant = body?.plant;
  if (!plant || typeof plant.name !== 'string') return { status: 400, body: { error: 'plant is required' } };

  try {
    const anthropic = new Anthropic();
    const response = await createWithFallback(anthropic, {
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `${describePlant(plant)}\n\nWrite personalized care tips for this plant.` }],
      // Text-only advice; low effort keeps it quick.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: TIPS_SCHEMA } },
    });
    if (response.stop_reason === 'refusal') throw new Error('Model declined the request');
    if (response.stop_reason === 'max_tokens') throw new Error('Response was cut off');
    const text = response.content.find(b => b.type === 'text')?.text;
    if (!text) throw new Error('Empty model response');
    return { status: 200, body: { ...JSON.parse(text), generatedAt: new Date().toISOString() } };
  } catch (err) {
    console.error('tips error:', err.status, err.message);
    if (err instanceof Anthropic.RateLimitError) return { status: 429, body: { error: 'יותר מדי בקשות כרגע, נסו שוב בעוד דקה' } };
    return { status: 500, body: { error: 'לא הצלחנו להכין טיפים כרגע. נסו שוב.' } };
  }
}
