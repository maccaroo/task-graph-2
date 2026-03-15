import '@testing-library/jest-dom'

// jsdom does not implement ResizeObserver
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
