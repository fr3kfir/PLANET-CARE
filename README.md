# צמחייה 🌱 — Plant Care

A mobile-first web app (PWA, Hebrew/RTL) for growing plants at home, on the balcony and in the garden:

- **Live scanner**: full-screen camera with a scan frame, flash toggle and gallery picker, then an
  animated scan (sweeping line, detection points, progress) over the photo while it is analyzed.
- **Plant expert chat**: ask anything about plants and gardening in Hebrew, attach photos, and get
  streamed answers that know your plant collection; conversation kept on the device.
- **Photo → species ID**: common name (Hebrew/English), scientific name, family, confidence and alternatives.
- **Health scan**: a health score and status, plus each detected problem by category
  (light, over/under-watering, soil/drainage, pests such as aphids/mealybugs/spider mites, disease,
  nutrients, temperature, humidity, pot/roots), what in the photo points to it, and step-by-step treatment.
- **Care guide**: light, water, soil, humidity, temperature, fertilizer, repotting, pet toxicity and
  best spot, fitted to the Israeli climate, the current season and where the plant grows.
- **My plants**: plant cards with photo, scientific name, site and watering interval, plus a
  Sites view that groups plants by where they live (living room, balcony, backyard...).
- **Reminders / task board**: today's and this week's watering, fertilizing, misting, pruning and repotting tasks with one-tap
  ✓, a daily summary notification, and a repeating calendar event (.ics) per task for real phone alerts.
- **Seasonal care plan**: separate warm-season (Apr-Oct) and cool-season (Nov-Mar) intervals per plant,
  fitted to where it grows; the schedule switches by itself when the season changes.
- **Light meter**: measures light with the phone camera (lux from the camera's exposure where the
  browser reports it, otherwise a rough estimate) and says whether the spot suits the plant.
- **Plant journal**: a timeline of waterings, feedings, notes, progress photos and health scans.
- **Care guide**: general guides (watering, light, fertilizing, pests, repotting, Israeli seasons)
  plus each saved plant's own guide.

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
| `api/_lib/chat-core.js`, `api/chat.js` | Plant-expert chat prompt and streaming `POST /api/chat` |
| `server.js` | Local Express server for `/api` |
| `src/components/ScanView.jsx` | Scan flow: camera → scanning → result → save |
| `src/components/CameraScanner.jsx`, `ScanningOverlay.jsx` | Live camera viewfinder and scanning animation |
| `src/components/ResultView.jsx` | Diagnosis display (ID, health, issues, care guide) |
| `src/components/PlantList.jsx` | My plants: plant cards, sites view, add button |
| `src/components/PlantDetail.jsx` | Plant page: care schedule, journal, health, guide |
| `src/components/Reminders.jsx` | Task board and notification toggle |
| `src/components/CareGuides.jsx` | General care guides |
| `src/components/Chat.jsx` | Plant-expert chat screen |
| `src/components/LightMeter.jsx` | Camera light meter |
| `src/lib/storage.js` | Plant storage, care tasks and due dates |
| `src/lib/reminders.js` | Notifications and calendar (.ics) reminders |

## Claude artifact version

`claude-artifact/index.html` is a single-file version that runs as a claude.ai artifact:
it asks Claude through the viewer's own account (no API key needed) and keeps each
person's plants in the artifact's private per-user storage.
