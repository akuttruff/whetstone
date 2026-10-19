import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { REACH } from '../lib/reach.ts'

// The waits around a server that gives no reply, cut to a few ticks: a test
// that sits through eight seconds of silence learns nothing from the wait.
REACH.readTimeoutMs = 200
REACH.retryWaitsMs = [10, 20, 30]
REACH.unreachableAfterMs = 40
REACH.probeMs = 40

window.scrollTo = (() => {}) as typeof window.scrollTo
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.hasPointerCapture = () => false
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

beforeEach(() => {
  localStorage.clear()
  // Every suite opts in to the fetch behaviour it wants; an un-stubbed call
  // should fail loudly rather than hit the network.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('unstubbed fetch'))))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllTimers()
  vi.useRealTimers()
})
