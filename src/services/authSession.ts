export const AUTH_SESSION_CHANGED = 'docmatrix:auth-session-changed'

let sessionVersion = 0
export const getAuthSessionVersion = () => sessionVersion

export function notifyAuthSessionChanged() {
  sessionVersion++
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_SESSION_CHANGED))
}
