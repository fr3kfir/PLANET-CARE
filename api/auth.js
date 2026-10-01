// Accounts: GET → current session / whether cloud is set up;
// POST { action: 'register' | 'login' | 'logout', email, password, code }.

import {
  cloudEnabled, createSession, createUser, deleteSession, getSession, normalizeEmail, redis, verifyUser,
} from './_lib/store.js';

export async function handleAuth(req, res) {
  try {
    if (!cloudEnabled()) return res.status(200).json({ cloud: false, user: null });

    if (req.method === 'GET') {
      const session = await getSession(req);
      return res.status(200).json({
        cloud: true,
        signupCode: !!process.env.SIGNUP_CODE,
        user: session ? { email: session.email } : null,
      });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });

    const { action, password, code } = req.body || {};
    const email = normalizeEmail(req.body?.email);

    if (action === 'logout') {
      const session = await getSession(req);
      if (session) await deleteSession(session.token);
      return res.status(200).json({ ok: true });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      return res.status(400).json({ error: 'כתובת אימייל לא תקינה' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
      return res.status(400).json({ error: 'הסיסמה צריכה להכיל לפחות 8 תווים' });
    }

    let user;
    if (action === 'register') {
      if (process.env.SIGNUP_CODE && code !== process.env.SIGNUP_CODE) {
        return res.status(403).json({ error: 'קוד ההרשמה שגוי' });
      }
      user = await createUser(email, password);
      if (!user) return res.status(409).json({ error: 'כבר קיים חשבון עם האימייל הזה. נסו להתחבר.' });
    } else if (action === 'login') {
      // Slow down password guessing: 10 failed attempts per email per 15 minutes.
      const failKey = `loginfail:${email}`;
      if (Number(await redis.get(failKey)) >= 10) {
        return res.status(429).json({ error: 'יותר מדי ניסיונות. נסו שוב בעוד רבע שעה.' });
      }
      user = await verifyUser(email, password);
      if (!user) {
        if ((await redis.incr(failKey)) === 1) await redis.expire(failKey, 15 * 60);
        return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
      }
      await redis.del(failKey);
    } else {
      return res.status(400).json({ error: 'unknown action' });
    }

    const token = await createSession(user);
    return res.status(200).json({ token, user: { email: user.email } });
  } catch (err) {
    console.error('auth error:', err.message);
    return res.status(500).json({ error: 'שגיאת שרת. נסו שוב.' });
  }
}

export default handleAuth;
