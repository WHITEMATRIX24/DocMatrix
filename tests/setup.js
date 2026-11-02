import '@testing-library/jest-dom'

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
