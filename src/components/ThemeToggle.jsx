import { useRef, useState, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { Sun, Moon } from 'lucide-react'

export const THEME_STORAGE_KEY = 'docmatrix-theme-pref'
export const LEGACY_STORAGE_KEY = 'docmatrix-theme'

/**
 * Returns system OS color-scheme preference ('dark' | 'light')
 */
export function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

/**
 * Returns stored user preference ('system' | 'dark' | 'light').
 * Defaults to 'system' so OS dark / bright mode is respected everywhere.
 */
export function getThemePreference() {
  try {
    const pref = localStorage.getItem(THEME_STORAGE_KEY)
    if (pref === 'dark' || pref === 'light' || pref === 'system') {
      return pref
    }
    // Backward compatibility: if old key is explicitly set and new key is not
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy === 'dark') {
      return 'dark'
    }
    return 'system'
  } catch {
    return 'system'
  }
}

/**
 * Returns the effective active theme applied to document ('dark' | 'light').
 */
export function getStoredTheme() {
  const pref = getThemePreference()
  if (pref === 'system') {
    return getSystemTheme()
  }
  return pref
}

/**
 * True if currently following system default.
 */
export function isSystemTheme() {
  return getThemePreference() === 'system'
}

/**
 * Apply theme to document element and notify listeners.
 */
export function applyTheme(prefOrTheme, save = true) {
  let effectiveTheme = 'light'
  let preferenceToSave = prefOrTheme || 'system'

  if (prefOrTheme === 'system' || !prefOrTheme) {
    effectiveTheme = getSystemTheme()
    preferenceToSave = 'system'
  } else if (prefOrTheme === 'dark' || prefOrTheme === 'light') {
    effectiveTheme = prefOrTheme
    preferenceToSave = prefOrTheme
  }

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = effectiveTheme
    document.documentElement.style.colorScheme = effectiveTheme
  }

  if (save) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preferenceToSave)
      localStorage.setItem(LEGACY_STORAGE_KEY, effectiveTheme)
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('docmatrix-theme-changed', {
        detail: {
          preference: preferenceToSave,
          effectiveTheme,
          isSystem: preferenceToSave === 'system'
        }
      })
    )
  }

  return effectiveTheme
}

/**
 * Global OS preference listener: dynamically updates anywhere in dashboard
 * when system toggles between dark and bright modes.
 */
let isListenerInitialized = false
export function initSystemThemeListener() {
  if (isListenerInitialized || typeof window === 'undefined' || !window.matchMedia) return
  isListenerInitialized = true

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = (e) => {
    const currentPref = getThemePreference()
    if (currentPref === 'system') {
      const nextTheme = e.matches ? 'dark' : 'light'
      if (document.documentElement.dataset.theme !== nextTheme) {
        document.documentElement.dataset.theme = nextTheme
        document.documentElement.style.colorScheme = nextTheme
        window.dispatchEvent(
          new CustomEvent('docmatrix-theme-changed', {
            detail: {
              preference: 'system',
              effectiveTheme: nextTheme,
              isSystem: true
            }
          })
        )
      }
    }
  }

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange)
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(handleChange)
  }
}

export default function ThemeToggle() {
  const [effectiveTheme, setEffectiveTheme] = useState(getStoredTheme)
  const buttonRef = useRef(null)

  useEffect(() => {
    initSystemThemeListener()
    const handleThemeChange = (e) => {
      if (e.detail) {
        setEffectiveTheme(e.detail.effectiveTheme)
      }
    }
    window.addEventListener('docmatrix-theme-changed', handleThemeChange)
    return () => window.removeEventListener('docmatrix-theme-changed', handleThemeChange)
  }, [])

  const isDark = effectiveTheme === 'dark'

  const toggle = (e) => {
    if (e && (e.altKey || e.shiftKey)) {
      applyTheme('system')
      return
    }

    const next = isDark ? 'light' : 'dark'
    const commit = () => {
      flushSync(() => {
        setEffectiveTheme(next)
      })
      applyTheme(next)
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduceMotion || !buttonRef.current) {
      commit()
      return
    }

    // The new theme grows outward as a circle from the switch itself. Percentages keep the
    // origin correct regardless of the root `zoom` and device pixel ratio.
    const rect = buttonRef.current.getBoundingClientRect()
    const x = (((rect.left + rect.width / 2) / window.innerWidth) * 100).toFixed(2)
    const y = (((rect.top + rect.height / 2) / window.innerHeight) * 100).toFixed(2)

    document.documentElement.classList.add('dm-theme-transition')
    const transition = document.startViewTransition(commit)
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0% at ${x}% ${y}%)`, `circle(150% at ${x}% ${y}%)`] },
        { duration: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
      )
    })
    transition.finished.finally(() => document.documentElement.classList.remove('dm-theme-transition'))
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Dark mode' : 'Bright mode'}
      className={`dmx-theme-switch ${isDark ? 'is-dark' : ''}`}
      onClick={toggle}
    >
      <span className="dmx-theme-track">
        <Sun size={13} className="dmx-theme-icon dmx-theme-sun" />
        <Moon size={13} className="dmx-theme-icon dmx-theme-moon" />
      </span>
      <span className="dmx-theme-knob">
        {isDark ? <Moon size={12} /> : <Sun size={12} />}
      </span>
    </button>
  )
}
