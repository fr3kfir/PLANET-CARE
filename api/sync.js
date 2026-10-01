// Cloud copy of the user's plants, one Redis hash field per plant.
// GET → { plants, deleted }   POST { upsert: Plant[], delete: id[] } → { ok }

import { getSession, redis } from './_lib/store.js';

const MAX_PLANT_BYTES = 2_000_000;

export async function handleSync(req, res) {
  try {
    if (!redis) return res.status(503).json({ error: 'cloud storage is not configured' });
    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: 'צריך להתחבר מחדש' });
    const plantsKey = `plants:${session.userId}`;
    const deletedKey = `deleted:${session.userId}`;

    if (req.method === 'GET') {
      const [plants, deleted] = await Promise.all([redis.hgetall(plantsKey), redis.smembers(deletedKey)]);
      return res.status(200).json({ plants: Object.values(plants || {}), deleted: deleted || [] });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });

    const upsert = Array.isArray(req.body?.upsert) ? req.body.upsert : [];
    const remove = Array.isArray(req.body?.delete) ? req.body.delete.filter(id => typeof id === 'string') : [];
    const fields = {};
    for (const p of upsert) {
      if (!p || typeof p.id !== 'string' || p.id.length > 64) continue;
      if (JSON.stringify(p).length > MAX_PLANT_BYTES) continue;
      fields[p.id] = p;
    }
    const ops = [];
    if (Object.keys(fields).length) ops.push(redis.hset(plantsKey, fields));
    if (remove.length) ops.push(redis.hdel(plantsKey, ...remove), redis.sadd(deletedKey, ...remove));
    await Promise.all(ops);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('sync error:', err.message);
    return res.status(500).json({ error: 'שמירה בענן נכשלה' });
  }
}

export default handleSync;
