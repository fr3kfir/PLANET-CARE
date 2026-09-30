// Shared core for plant identification + health diagnosis — used by the Vercel
// function (api/diagnose.js) and the local Express server (server.js).
// Requires ANTHROPIC_API_KEY. Vercel ignores api/_lib (underscore prefix).

import Anthropic from '@anthropic-ai/sdk';

const ISSUE_CATEGORIES = [
  'light_low', 'light_high', 'overwatering', 'underwatering', 'soil_drainage',
  'pests', 'disease', 'nutrients', 'temperature', 'humidity', 'pot_roots', 'other',
];

const DIAGNOSIS_SCHEMA = {
  type: 'object',
  properties: {
    is_plant: { type: 'boolean', description: 'false if the photo does not show a plant' },
    identification: {
      type: 'object',
      properties: {
        common_name_he: { type: 'string' },
        common_name_en: { type: 'string' },
        scientific_name: { type: 'string' },
        family: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        alternatives: { type: 'array', items: { type: 'string' }, description: 'Other likely species if unsure (Hebrew + scientific)' },
        description: { type: 'string', description: '1-2 sentences about the plant' },
      },
      required: ['common_name_he', 'common_name_en', 'scientific_name', 'family', 'confidence', 'alternatives', 'description'],
      additionalProperties: false,
    },
    health: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'needs_attention', 'critical'] },
        score: { type: 'integer', description: 'Overall health 0-100' },
        summary: { type: 'string' },
      },
      required: ['status', 'score', 'summary'],
      additionalProperties: false,
    },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ISSUE_CATEGORIES },
          title: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          evidence: { type: 'string', description: 'What in the photo indicates this' },
          treatment: { type: 'array', items: { type: 'string' }, description: 'Concrete ordered steps' },
        },
        required: ['category', 'title', 'severity', 'evidence', 'treatment'],
        additionalProperties: false,
      },
    },
    care: {
      type: 'object',
      properties: {
        light: { type: 'string' },
        water: { type: 'string' },
        water_every_days: { type: 'integer', description: 'Typical days between waterings in the current season in Israel' },
        soil: { type: 'string' },
        humidity: { type: 'string' },
        temperature: { type: 'string' },
        fertilizer: { type: 'string' },
        repotting: { type: 'string' },
        pet_toxicity: { type: 'string' },
        best_location: { type: 'string' },
      },
      required: ['light', 'water', 'water_every_days', 'soil', 'humidity', 'temperature', 'fertilizer', 'repotting', 'pet_toxicity', 'best_location'],
      additionalProperties: false,
    },
    tips: { type: 'array', items: { type: 'string' } },
    photo_quality_note: { type: 'string', description: 'Empty string, or advice for a better photo if the diagnosis was limited' },
  },
  required: ['is_plant', 'identification', 'health', 'issues', 'care', 'tips', 'photo_quality_note'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are an experienced horticulturist and plant pathologist helping a home gardener in Israel grow healthy plants (houseplants, balcony, garden, herbs, vegetables and fruit trees).

From the photo, identify the plant species and assess its health. Look carefully at leaf color and texture, spots, edges, curling, wilting, stem condition, new growth, soil surface, pot/drainage, and signs of pests (aphids, mealybugs, spider mites, scale, whitefly, thrips, fungus gnats) or disease (fungal, bacterial, root rot, powdery mildew).

Rules:
- Write every human-readable field in Hebrew (scientific names in Latin; common_name_en in English).
- Only report issues you can actually see evidence for in the photo or that the user's notes describe. A healthy plant should get an empty issues list — do not invent problems.
- Treatment steps must be practical and specific for a home grower (amounts, frequency, what to buy), preferring gentle/organic options first.
- Care guidance should fit the Israeli climate and the current season, and the location the user gave (indoor/balcony/garden).
- If you are unsure of the species, say so via confidence and alternatives rather than guessing confidently.
- If the photo is not a plant, set is_plant=false and fill the other fields with brief placeholders.`;

const LOCATION_LABELS = { indoor: 'בתוך הבית', balcony: 'מרפסת', garden: 'גינה' };
const ALLOWED_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function diagnosePlant({ image, mediaType, location, notes, knownSpecies }) {
  const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

  const month = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'Asia/Jerusalem' });
  const context = [
    `Current month: ${month}.`,
    location && LOCATION_LABELS[location] ? `Where the plant grows: ${LOCATION_LABELS[location]} (${location}).` : null,
    knownSpecies ? `Previously identified as: ${knownSpecies}.` : null,
    notes ? `Notes from the grower: ${notes}` : null,
  ].filter(Boolean).join('\n');

  const response = await anthropic.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    // If the primary model declines, the API retries on a fallback model in the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
        { type: 'text', text: `${context}\n\nIdentify this plant and diagnose its health.` },
      ],
    }],
    output_config: {
      // Medium effort keeps a vision diagnosis well within the 60s function limit.
      effort: 'medium',
      format: { type: 'json_schema', schema: DIAGNOSIS_SCHEMA },
    },
  });

  if (response.stop_reason === 'refusal') throw new Error('Model declined the request');
  if (response.stop_reason === 'max_tokens') throw new Error('Response was cut off');

  const text = response.content.find(b => b.type === 'text')?.text;
  if (!text) throw new Error('Empty model response');
  return { ...JSON.parse(text), analyzedAt: new Date().toISOString() };
}

// Returns { status, body } — platform wrappers turn this into a response.
export async function getDiagnosisPayload(body) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: 503, body: { error: 'ANTHROPIC_API_KEY is not configured on the server' } };
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
    console.error('diagnose error:', err.message);
    const status = err instanceof Anthropic.RateLimitError ? 429 : 500;
    return { status, body: { error: err.message } };
  }
}
