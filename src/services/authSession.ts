export const AUTH_SESSION_CHANGED = 'docmatrix:auth-session-changed'

export function notifyAuthSessionChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_SESSION_CHANGED))
}
