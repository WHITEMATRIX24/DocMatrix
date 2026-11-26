import { getStoredToken } from './apiClient';
import { logout } from './authService';

export function installIdleSessionLock() {
  let lastInteraction = Date.now(), locking = false;
  const activity = () => { lastInteraction = Date.now(); };
  const events = ['pointerdown', 'keydown', 'touchstart'];
  events.forEach(event => window.addEventListener(event, activity, { passive: true }));
  const timer = window.setInterval(async () => {
    if (locking || !getStoredToken() || Date.now() - lastInteraction < 30 * 60000) return;
    locking = true;
    try { await logout(); } finally { window.location.assign('/login'); }
  }, 15000);
  return () => { window.clearInterval(timer); events.forEach(event => window.removeEventListener(event, activity)); };
}
