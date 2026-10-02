// Local dev server for the /api routes (Vite proxies /api here).
import express from 'express';
import fs from 'fs';

// Load .env (KEY=value lines) so ANTHROPIC_API_KEY works in local dev.
try {
  for (const line of fs.readFileSync(new URL('.env', import.meta.url), 'utf8').split('\n')) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
} catch { /* no .env file */ }

const { default: handleDiagnose } = await import('./api/diagnose.js');
const { handleChat } = await import('./api/chat.js');
const { handleAuth } = await import('./api/auth.js');
const { handleSync } = await import('./api/sync.js');
const { default: handleTips } = await import('./api/tips.js');

const app = express();
app.use(express.json({ limit: '8mb' }));

app.post('/api/diagnose', handleDiagnose);

app.post('/api/chat', handleChat);
app.all('/api/auth', handleAuth);
app.all('/api/sync', handleSync);
app.post('/api/tips', handleTips);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`🌱 plant-care API on http://localhost:${PORT}`));
