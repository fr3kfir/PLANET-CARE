# צמחייה 🌱 — Plant Care

A mobile-first web app (PWA, Hebrew/RTL) for growing plants at home, on the balcony and in the garden:

- **Photo → species ID**: common name (Hebrew/English), scientific name, family, confidence and alternatives.
- **Health scan**: a health score and status, plus each detected problem by category
  (light, over/under-watering, soil/drainage, pests such as aphids/mealybugs/spider mites, disease,
  nutrients, temperature, humidity, pot/roots), what in the photo points to it, and step-by-step treatment.
- **Care guide**: light, water, soil, humidity, temperature, fertilizer, repotting, pet toxicity and
  best spot, fitted to the Israeli climate, the current season and where the plant grows.
- **My plants**: save plants, track watering ("I watered now" plus a next-watering reminder),
  run follow-up scans and browse each plant's scan history.

Identification and diagnosis use Claude (vision) on the server. The plant collection
lives in the browser's localStorage.

## Run locally

```bash
git clone https://github.com/fr3kfir/PLANET-CARE.git && cd PLANET-CARE
npm install
cp .env.example .env   # paste your ANTHROPIC_API_KEY
npm run dev            # UI on http://localhost:5173, API on :3002
```

To use the phone camera during development, run `npx vite --host` and open the LAN address on your phone.

## Deploy (Vercel)

1. Import the repo in Vercel (framework: Vite).
2. Settings → Environment Variables → add `ANTHROPIC_API_KEY`.
3. Deploy, then on your phone use "Add to Home Screen" to install it as an app.

## Structure

| Path | Purpose |
|---|---|
| `api/_lib/diagnose-core.js` | Claude prompt + JSON schema for the diagnosis |
| `api/diagnose.js` | Vercel function `POST /api/diagnose` |
| `server.js` | Local Express server for `/api` |
| `src/components/ScanView.jsx` | Camera/gallery → analyze → save |
| `src/components/ResultView.jsx` | Diagnosis display (ID, health, issues, care guide) |
| `src/components/PlantList.jsx`, `PlantDetail.jsx` | Collection, watering, history |

## Claude artifact version

`claude-artifact/index.html` is a single-file version that runs as a claude.ai artifact:
it asks Claude through the viewer's own account (no API key needed) and keeps each
person's plants in the artifact's private per-user storage.
