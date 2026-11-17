import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// This file runs for every test, including the node-environment ones where
// there is no window at all.
const hasDom = typeof window !== 'undefined'

if (hasDom) {
  // jsdom has no layout or media queries. Tests run as a viewer who prefers
  // reduced motion, so paced steps happen at once.
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList

  // jsdom has no layout, so nothing ever resizes.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  // jsdom has <dialog> but not its methods. Enough of them to open, close,
  // and fire `close` the way browsers do.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    if (!this.open) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

afterEach(cleanup)
