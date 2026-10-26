const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db/prisma');
const requireSession = require('../middleware/requireSession');
const sessionStore = require('../session/sessionStore');

const router = express.Router();
const COOKIE_NAME = 'sid';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax',
  path: '/auth',
};

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || !email.trim() ||
        typeof password !== 'string' || !password) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Email and password are required' },
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const session = sessionStore.create(user.id);
    res.cookie(COOKIE_NAME, session.id, {
      ...cookieOptions,
      signed: true,
      maxAge: sessionStore.SESSION_TTL_MS,
    });
    return res.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireSession, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      sessionStore.destroy(req.sessionId);
      res.clearCookie(COOKIE_NAME, cookieOptions);
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
      });
    }

    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (req, res) => {
  const sid = req.signedCookies && req.signedCookies.sid;
  if (typeof sid === 'string') sessionStore.destroy(sid);

  res.clearCookie(COOKIE_NAME, cookieOptions);
  return res.json({ message: 'Logged out' });
});

module.exports = router;
