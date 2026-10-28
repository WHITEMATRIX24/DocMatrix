import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Sun, Moon } from 'lucide-react'

const STORAGE_KEY = 'docmatrix-theme'

// Theme only ever changes through this switch: no OS auto-follow.
export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {}
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getStoredTheme)
  const buttonRef = useRef(null)
  const isDark = theme === 'dark'

  const toggle = () => {
    const next = isDark ? 'light' : 'dark'
    const commit = () => {
      flushSync(() => setTheme(next))
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
      // 150% of the normalized diagonal reaches every corner from any origin
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
      title={isDark ? 'Light mode' : 'Dark mode'}
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
