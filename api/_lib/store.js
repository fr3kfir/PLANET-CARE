// Cloud storage (Upstash Redis), accounts, sessions and daily AI quotas.
// Everything here is optional: without Redis env vars the app runs in local-only mode
// (plants stay in the browser and the AI endpoints are open, as before).

import crypto from 'crypto';
import { Redis } from '@upstash/redis';

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const redis = url && token ? new Redis({ url, token }) : null;
export const cloudEnabled = () => !!redis;

const SESSION_TTL = 60 * 60 * 24 * 180; // 180 days
const scrypt = (password, salt) => new Promise((resolve, reject) =>
  crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key.toString('hex')))));

export const normalizeEmail = email => String(email || '').trim().toLowerCase();

export async function createUser(email, password) {
  const key = `user:${email}`;
  const salt = crypto.randomBytes(16).toString('hex');
  const user = { id: crypto.randomUUID(), email, salt, hash: await scrypt(password, salt), createdAt: new Date().toISOString() };
  // NX: fails if the email is already registered.
  const ok = await redis.set(key, user, { nx: true });
  return ok ? user : null;
}

export async function verifyUser(email, password) {
  const user = await redis.get(`user:${email}`);
  if (!user) return null;
  const hash = await scrypt(password, user.salt);
  const match = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'));
  return match ? user : null;
}

export async function createSession(user) {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  await redis.set(`session:${sessionToken}`, { userId: user.id, email: user.email }, { ex: SESSION_TTL });
  return sessionToken;
}

export async function deleteSession(sessionToken) {
  await redis.del(`session:${sessionToken}`);
}

const bearer = req => (req.headers.authorization || '').match(/^Bearer ([a-f0-9]{64})$/)?.[1];

// { userId, email, token } for a valid session, else null.
export async function getSession(req) {
  if (!redis) return null;
  const sessionToken = bearer(req);
  if (!sessionToken) return null;
  const session = await redis.get(`session:${sessionToken}`);
  return session ? { ...session, token: sessionToken } : null;
}

const LIMITS = {
  diagnose: Number(process.env.DAILY_SCANS_PER_USER) || 40,
  chat: Number(process.env.DAILY_CHATS_PER_USER) || 150,
};
const GLOBAL_LIMIT = Number(process.env.DAILY_AI_LIMIT) || 600;

// Gate for the paid AI endpoints. Returns null when allowed, else { status, error }.
export async function checkAiAccess(req, kind) {
  if (!redis) return null; // local-only mode: no accounts to check against
  const session = await getSession(req);
  if (!session) return { status: 401, error: 'צריך להתחבר לחשבון כדי להשתמש בסריקה ובמומחה' };
  const day = new Date().toISOString().slice(0, 10);
  const userKey = `quota:${day}:${kind}:${session.userId}`;
  const globalKey = `quota:${day}:all`;
  const [used, total] = await Promise.all([redis.incr(userKey), redis.incr(globalKey)]);
  if (used === 1) await redis.expire(userKey, 60 * 60 * 48);
  if (total === 1) await redis.expire(globalKey, 60 * 60 * 48);
  if (used > LIMITS[kind]) return { status: 429, error: `הגעתם למכסה היומית (${LIMITS[kind]}). נסו שוב מחר.` };
  if (total > GLOBAL_LIMIT) return { status: 429, error: 'האפליקציה הגיעה למכסה היומית. נסו שוב מחר.' };
  return null;
}
