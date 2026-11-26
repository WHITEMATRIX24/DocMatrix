// Only non-sensitive UI preferences may survive a browser reload.
const publicKeys = new Set(['docmatrix_theme', 'docmatrix-theme', 'docmatrix-theme-pref', 'docmatrix_remember_email', 'docmatrix_language']);
const safePreference = (key: string) => publicKeys.has(key) || /^(?:theme|i18nextLng|docmatrix[_-](?:theme|language))$/.test(key);
export function createPrivateStorage(native?: Storage): Storage {
  const values = new Map<string, string>();
  // Delete legacy credentials and clinic caches without loading their contents.
  if (native) try {
    for (let i = native.length - 1; i >= 0; i--) {
      const key = native.key(i);
      if (key && /^(?:docmatrix|doc_matrix)/i.test(key) && !safePreference(key)) native.removeItem(key);
    }
  } catch { /* Storage can be disabled by browser policy. */ }
  return {
    get length() { return values.size; },
    key(index: number) { return Array.from(values.keys())[index] ?? null; },
    getItem(key: string) { if (safePreference(key)) { try { return native?.getItem(key) ?? values.get(key) ?? null; } catch {} } return values.get(key) ?? null; },
    setItem(key: string, value: string) { if (safePreference(key)) { try { native?.setItem(key, String(value)); } catch {} } values.set(key, String(value)); },
    removeItem(key: string) { values.delete(key); try { native?.removeItem(key); } catch {} },
    clear() { values.clear(); },
  };
}
function nativeStorage(name: 'localStorage' | 'sessionStorage') { try { return typeof window === 'undefined' ? undefined : window[name]; } catch { return undefined; } }
export const browserLocalStorage = createPrivateStorage(nativeStorage('localStorage'));
export const browserSessionStorage = createPrivateStorage(nativeStorage('sessionStorage'));
