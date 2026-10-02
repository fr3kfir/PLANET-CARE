// Prompts and output schemas shared by the server (api/_lib) and the Claude-artifact build,
// so both ask Claude exactly the same things.
import { ARTICLES } from './articles.js';

export const LOCATION_LABELS = { indoor: 'בתוך הבית', balcony: 'מרפסת', garden: 'גינה' };
const ARTICLE_IDS = ARTICLES.map(a => a.id);

// ---- Diagnosis ----

const ISSUE_CATEGORIES = [
  'light_low', 'light_high', 'overwatering', 'underwatering', 'soil_drainage',
  'pests', 'disease', 'nutrients', 'temperature', 'humidity', 'pot_roots', 'other',
];

export const DIAGNOSIS_SCHEMA = {
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
        fertilize_every_days: { type: 'integer', description: 'Typical days between feedings in the current season in Israel; 0 if the plant should not be fed now' },
        mist_every_days: { type: 'integer', description: 'Days between misting/leaf spraying now; 0 if the plant does not need misting' },
        prune_every_days: { type: 'integer', description: 'Days between light pruning/tidying (dead leaves, leggy stems); 0 if not needed' },
        repot_every_days: { type: 'integer', description: 'Days between repotting or refreshing soil (e.g. 365-730); 0 for in-ground garden plants' },
        light_level: { type: 'string', enum: ['low', 'medium', 'bright_indirect', 'direct'], description: 'Light the plant needs: low (shade), medium, bright indirect, or direct sun' },
        seasonal_plan: {
          type: 'object',
          description: 'Care intervals in days for the Israeli warm season (Apr-Oct) and cool season (Nov-Mar), for the given location; 0 means skip',
          properties: Object.fromEntries(['warm', 'cool'].map(season => [season, {
            type: 'object',
            properties: {
              water_every_days: { type: 'integer' },
              fertilize_every_days: { type: 'integer' },
              mist_every_days: { type: 'integer' },
            },
            required: ['water_every_days', 'fertilize_every_days', 'mist_every_days'],
            additionalProperties: false,
          }])),
          required: ['warm', 'cool'],
          additionalProperties: false,
        },
        soil: { type: 'string' },
        humidity: { type: 'string' },
        temperature: { type: 'string' },
        fertilizer: { type: 'string' },
        repotting: { type: 'string' },
        pet_toxicity: { type: 'string' },
        best_location: { type: 'string' },
      },
      required: ['light', 'water', 'water_every_days', 'fertilize_every_days', 'mist_every_days', 'prune_every_days', 'repot_every_days', 'light_level', 'seasonal_plan', 'soil', 'humidity', 'temperature', 'fertilizer', 'repotting', 'pet_toxicity', 'best_location'],
      additionalProperties: false,
    },
    tips: { type: 'array', items: { type: 'string' } },
    photo_quality_note: { type: 'string', description: 'Empty string, or advice for a better photo if the diagnosis was limited' },
  },
  required: ['is_plant', 'identification', 'health', 'issues', 'care', 'tips', 'photo_quality_note'],
  additionalProperties: false,
};

export const DIAGNOSIS_PROMPT = `You are an experienced horticulturist and plant pathologist helping a home gardener in Israel grow healthy plants (houseplants, balcony, garden, herbs, vegetables and fruit trees).

From the photo, identify the plant species and assess its health. Look carefully at leaf color and texture, spots, edges, curling, wilting, stem condition, new growth, soil surface, pot/drainage, and signs of pests (aphids, mealybugs, spider mites, scale, whitefly, thrips, fungus gnats) or disease (fungal, bacterial, root rot, powdery mildew).

Rules:
- Write every human-readable field in Hebrew (scientific names in Latin; common_name_en in English).
- Only report issues you can actually see evidence for in the photo or that the user's notes describe. A healthy plant should get an empty issues list — do not invent problems.
- Treatment steps must be practical and specific for a home grower (amounts, frequency, what to buy), preferring gentle/organic options first.
- Care guidance should fit the Israeli climate and the current season, and the location the user gave (indoor/balcony/garden).
- If you are unsure of the species, say so via confidence and alternatives rather than guessing confidently.
- If the photo is not a plant, set is_plant=false and fill the other fields with brief placeholders.`;

// The user-message context for a diagnosis request.
export function diagnosisContext({ location, notes, knownSpecies }) {
  const month = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'Asia/Jerusalem' });
  return [
    `Current month: ${month}.`,
    location && LOCATION_LABELS[location] ? `Where the plant grows: ${LOCATION_LABELS[location]} (${location}).` : null,
    knownSpecies ? `Previously identified as: ${knownSpecies}.` : null,
    notes ? `Notes from the grower: ${notes}` : null,
  ].filter(Boolean).join('\n');
}

// ---- Personal tips ----

export const TIPS_SCHEMA = {
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

export const TIPS_PROMPT = `You are an experienced horticulturist writing personalized care tips for one specific plant in a Hebrew plant-care app for home growers in Israel.

Rules:
- Write everything in Hebrew (scientific names in Latin), warm and practical, short enough for a phone.
- Tailor every tip to THIS plant: its species, where it grows (indoors, balcony or garden and the named spot), the current month and season in Israel, its latest health scan and its recent care history. Avoid generic advice that applies to every plant.
- If the care history suggests a problem (e.g. watered too often or not for a long time, a health issue not followed up), address it first with priority "now".
- Give concrete numbers where useful (how often, how much, which product type, what to look for).
- Only state facts you are confident about.`;

const clip = (v, n) => String(v ?? '').slice(0, n);

export function describePlant(p) {
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

// ---- Expert chat ----

export const CHAT_PROMPT = `You are "המומחה לצמחים", a warm, practical plant expert inside a Hebrew plant-care app for home growers in Israel. You know houseplants, balcony and garden plants, herbs, vegetables, fruit trees, succulents, lawns, propagation, pests and diseases, soil and fertilizers, irrigation, garden design and the Israeli climate and seasons.

How to answer:
- Always reply in Hebrew (Latin only for scientific names), in a friendly, conversational tone.
- Be concrete and actionable: amounts, frequencies, timing for the current season in Israel, what to buy and where it goes. Prefer gentle/organic solutions first.
- Keep answers short and scannable for a phone screen: a direct answer first, then a few bullets or numbered steps only when they help. Use **bold** sparingly for key words. No headings or tables.
- When the user shares a photo, look closely (leaf color, spots, edges, pests, soil, pot) and say what you see before advising. If a better photo would help, say exactly what to shoot.
- Use the user's plant collection below when relevant (refer to their plants by name), but don't recite it unprompted.
- If you're unsure, say so and suggest how to check. Flag pet or child toxicity when it matters.
- Stay on plants, gardening, growing food and closely related topics. If asked about something unrelated, say briefly and kindly that you can only help with plants and offer a plant-related angle.`;

export function collectionContext(plants) {
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
