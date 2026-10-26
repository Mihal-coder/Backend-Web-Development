const sessionStore = require('../session/sessionStore');

module.exports = function requireSession(req, res, next) {
  const sid = req.signedCookies && req.signedCookies.sid;
  const session = typeof sid === 'string' ? sessionStore.get(sid) : null;

  if (!session) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
    });
  }

  req.userId = session.userId;
  req.sessionId = sid;
  next();
};
