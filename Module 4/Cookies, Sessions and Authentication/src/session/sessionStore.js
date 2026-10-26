const { randomBytes } = require('node:crypto');

const SESSION_TTL_MS = 60 * 60 * 1000;
const sessions = new Map();

function create(userId) {
  const id = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_TTL_MS;

  sessions.set(id, { userId, expiresAt });
  return { id, expiresAt };
}

function get(id) {
  const session = sessions.get(id);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    sessions.delete(id);
    return null;
  }

  return session;
}

function destroy(id) {
  sessions.delete(id);
}

module.exports = { create, get, destroy, SESSION_TTL_MS };
