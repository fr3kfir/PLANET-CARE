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
- **Care guide library**: 19 articles in 7 categories (basics, problems and pests, seasons,
  propagation, houseplants, balcony and garden, herbs), with search and a tip of the day.
- **Personal tips per plant**: tips written for each saved plant from its species, spot, season,
  latest scan and care history, with common mistakes, a fun fact and recommended articles;
  cached on the plant and refreshed when the season changes, after a new scan or monthly.

Identification and diagnosis use Claude (vision) on the server. The plant collection
lives in the browser's localStorage and, when signed in, is synced to the cloud.

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

## Accounts and cloud storage (recommended)

Without a database the app runs in local-only mode: plants stay in the browser and the AI
endpoints are open to anyone who has the URL. Connecting Upstash Redis turns on:

- **Accounts** (email + password) and **cloud sync** of the plant collection across devices.
- **API protection**: scanning and chat require a signed-in user, with daily limits per user
  and for the whole app, and login attempts are rate-limited.

Setup in Vercel: project → **Storage** → **Create Database** → **Upstash (Redis)** → connect it to
the project (this adds `KV_REST_API_URL` / `KV_REST_API_TOKEN`), then redeploy.

Optional environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `SIGNUP_CODE` | none | If set, creating an account requires this code (keeps strangers out). |
| `DAILY_SCANS_PER_USER` | 40 | Scans per user per day. |
| `DAILY_CHATS_PER_USER` | 150 | Chat messages per user per day. |
| `DAILY_TIPS_PER_USER` | 30 | Personal tip refreshes per user per day. |
| `DAILY_AI_LIMIT` | 600 | Scans + chat messages for the whole app per day. |

## Structure

| Path | Purpose |
|---|---|
| `api/_lib/diagnose-core.js` | Claude prompt + JSON schema for the diagnosis |
| `api/diagnose.js` | Vercel function `POST /api/diagnose` |
| `api/_lib/chat-core.js`, `api/chat.js` | Plant-expert chat prompt and streaming `POST /api/chat` |
| `api/_lib/tips-core.js`, `api/tips.js` | Personalized tips for one plant, `POST /api/tips` |
| `api/_lib/store.js` | Redis connection, accounts, sessions and daily AI quotas |
| `api/auth.js`, `api/sync.js` | Sign up / sign in / sign out, and cloud copy of the plant collection |
| `server.js` | Local Express server for `/api` |
| `src/components/ScanView.jsx` | Scan flow: camera → scanning → result → save |
| `src/components/CameraScanner.jsx`, `ScanningOverlay.jsx` | Live camera viewfinder and scanning animation |
| `src/components/ResultView.jsx` | Diagnosis display (ID, health, issues, care guide) |
| `src/components/PlantList.jsx` | My plants: plant cards, sites view, add button |
| `src/components/PlantDetail.jsx` | Plant page: care schedule, journal, health, guide |
| `src/components/Reminders.jsx` | Task board and notification toggle |
| `src/components/CareGuides.jsx`, `src/lib/articles.js` | Article library and reader |
| `src/components/PlantTips.jsx`, `src/lib/tips.js` | Personal tips on the plant page |
| `src/components/Chat.jsx` | Plant-expert chat screen |
| `src/components/Account.jsx`, `src/lib/cloud.js`, `src/lib/useCloudSync.js` | Account screen and background sync |
| `src/components/LightMeter.jsx` | Camera light meter |
| `src/lib/storage.js` | Plant storage, care tasks and due dates |
| `src/lib/reminders.js` | Notifications and calendar (.ics) reminders |

## Claude artifact version (no API key)

`claude-artifact/index.html` is the whole app built as one file for claude.ai
(https://claude.ai/artifact/GMj5wRpnrZxTnYNNgrycT1). It runs on the viewer's own Claude account:
scans, tips and chat go through the artifact `sample` capability (same prompts as the server,
`src/lib/prompts.js`), and plants are saved in the artifact database under the viewer's private
`data/users/<id>/` path. Differences from the website: photos come from the phone's camera app or
gallery (the artifact frame blocks the live camera, so there is no light meter), calendar reminders
are saved through the `downloads` capability, and there are no accounts (Claude is the account).

Rebuild with `node scripts/build-artifact.mjs`, then republish that file to the artifact with
capabilities `sample`, `db`, `user` and `downloads`.
