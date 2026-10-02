// Shared core for plant identification + health diagnosis — used by the Vercel
// function (api/diagnose.js) and the local Express server (server.js).
// Requires an Anthropic API key (see anthropic-key.js). Vercel ignores api/_lib (underscore prefix).

import Anthropic from '@anthropic-ai/sdk';
import { MISSING_KEY_ERROR, anthropicClient } from './anthropic-key.js';
import { DIAGNOSIS_PROMPT, DIAGNOSIS_SCHEMA, diagnosisContext } from '../../src/lib/prompts.js';

const ALLOWED_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Streams the request (long vision answers can take a while) and asks the API to retry
// on a fallback model if the primary one declines. If this account can't use that beta,
// the request is sent once more without it.
export async function createWithFallback(anthropic, params) {
  try {
    return await anthropic.beta.messages
      .stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      .finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.BadRequestError && /fallback|beta/i.test(err.message)) {
      console.warn('fallback beta rejected, retrying without it:', err.message);
      return anthropic.messages.stream(params).finalMessage();
    }
    throw err;
  }
}

export async function diagnosePlant({ image, mediaType, location, notes, knownSpecies }) {
  const anthropic = anthropicClient();

  const context = diagnosisContext({ location, notes, knownSpecies });

  const params = {
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    system: DIAGNOSIS_PROMPT,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
        { type: 'text', text: `${context}\n\nIdentify this plant and diagnose its health.` },
      ],
    }],
    output_config: {
      // Medium effort balances diagnosis quality with how long the user waits.
      effort: 'medium',
      format: { type: 'json_schema', schema: DIAGNOSIS_SCHEMA },
    },
  };

  const response = await createWithFallback(anthropic, params);

  if (response.stop_reason === 'refusal') throw new Error('Model declined the request');
  if (response.stop_reason === 'max_tokens') throw new Error('Response was cut off');

  const text = response.content.find(b => b.type === 'text')?.text;
  if (!text) throw new Error('Empty model response');
  return { ...JSON.parse(text), analyzedAt: new Date().toISOString() };
}

// Returns { status, body } — platform wrappers turn this into a response.
export async function getDiagnosisPayload(body) {
  if (!anthropicClient()) {
    return { status: 503, body: { error: MISSING_KEY_ERROR } };
  }
  const { image, mediaType = 'image/jpeg', location, notes, knownSpecies } = body || {};
  if (typeof image !== 'string' || image.length < 100) {
    return { status: 400, body: { error: 'image (base64) is required' } };
  }
  if (!ALLOWED_MEDIA.has(mediaType)) {
    return { status: 400, body: { error: `unsupported mediaType ${mediaType}` } };
  }

  try {
    const result = await diagnosePlant({
      image,
      mediaType,
      location,
      notes: typeof notes === 'string' ? notes.slice(0, 1000) : '',
      knownSpecies: typeof knownSpecies === 'string' ? knownSpecies.slice(0, 200) : '',
    });
    return { status: 200, body: result };
  } catch (err) {
    console.error('diagnose error:', err.status, err.message);
    if (err instanceof Anthropic.RateLimitError) return { status: 429, body: { error: 'יותר מדי בקשות כרגע, נסו שוב בעוד דקה' } };
    if (err instanceof Anthropic.AuthenticationError) return { status: 500, body: { error: 'מפתח ה-API של Anthropic לא תקין. בדקו את ANTHROPIC_API_KEY ב-Vercel.' } };
    if (err instanceof Anthropic.APIError && err.status === 529) return { status: 503, body: { error: 'השירות עמוס כרגע, נסו שוב בעוד רגע' } };
    return { status: 500, body: { error: err.message } };
  }
}
