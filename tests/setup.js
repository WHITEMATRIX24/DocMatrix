import '@testing-library/jest-dom'
import { configure } from '@testing-library/dom'

configure({ asyncUtilTimeout: 5000 })

// Ensure valid Web Storage API in Node 22+/25+ environments where native localStorage may be uninitialized
const createMemoryStorage = () => {
  let store = new Map()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key) {
      const k = String(key)
      return store.has(k) ? store.get(k) : null
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key) {
      store.delete(String(key))
    },
    setItem(key, value) {
      store.set(String(key), String(value))
    }
  }
}

if (typeof window !== 'undefined') {
  if (!window.localStorage || typeof window.localStorage.clear !== 'function') {
    const ls = createMemoryStorage()
    Object.defineProperty(window, 'localStorage', { value: ls, configurable: true, writable: true })
    Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true, writable: true })
  }
  if (!window.sessionStorage || typeof window.sessionStorage.clear !== 'function') {
    const ss = createMemoryStorage()
    Object.defineProperty(window, 'sessionStorage', { value: ss, configurable: true, writable: true })
    Object.defineProperty(globalThis, 'sessionStorage', { value: ss, configurable: true, writable: true })
  }
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock HTMLCanvasElement getContext
HTMLCanvasElement.prototype.getContext = function (type) {
  if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
    const noop = () => {}
    return new Proxy({
      getExtension: () => null,
      getParameter: () => 0,
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      createShader: () => ({}),
      createProgram: () => ({}),
      createBuffer: () => ({}),
      createTexture: () => ({}),
      createFramebuffer: () => ({}),
      getAttribLocation: () => 0,
      getUniformLocation: () => ({})
    }, {
      get: (target, prop) => {
        if (prop in target) return target[prop]
        return noop
      }
    })
  }
  return {
    clearRect: () => {},
    fillRect: () => {},
    resetTransform: () => {},
    scale: () => {}
  }
}

// Mock window.scrollTo
window.scrollTo = () => {}
Element.prototype.scrollIntoView = () => {}
