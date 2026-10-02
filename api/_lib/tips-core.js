// Personalized care tips for one of the user's plants: its species, where it lives,
// its latest health scan, recent care history and the current season in Israel.

import Anthropic from '@anthropic-ai/sdk';
import { TIPS_PROMPT, TIPS_SCHEMA, describePlant } from '../../src/lib/prompts.js';
import { createWithFallback } from './diagnose-core.js';
import { MISSING_KEY_ERROR, anthropicClient } from './anthropic-key.js';

export async function getTipsPayload(body) {
  if (!anthropicClient()) {
    return { status: 503, body: { error: MISSING_KEY_ERROR } };
  }
  const plant = body?.plant;
  if (!plant || typeof plant.name !== 'string') return { status: 400, body: { error: 'plant is required' } };

  try {
    const anthropic = anthropicClient();
    const response = await createWithFallback(anthropic, {
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      system: TIPS_PROMPT,
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
