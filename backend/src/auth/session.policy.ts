export const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export function sessionExpired(session: { createdAt?: Date; lastActiveAt?: Date; expiresAt: Date }, now = Date.now()) {
  return session.expiresAt.getTime() <= now ||
    (!!session.createdAt && session.createdAt.getTime() + SESSION_ABSOLUTE_MS <= now) ||
    (!!session.lastActiveAt && session.lastActiveAt.getTime() + SESSION_IDLE_MS <= now);
}
