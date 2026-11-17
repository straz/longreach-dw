// What dw keeps in this browser (localStorage), as JSON under keys named dw:<what>:…. Storage may be blocked or hold
// something unreadable; then a value reads as its fallback and a change lasts until the page reloads.

export function readStored<T>(key: string, fallback: T): T {
  try {
    const held = localStorage.getItem(key)
    return held === null ? fallback : (JSON.parse(held) as T)
  } catch {
    return fallback
  }
}

/** Keep a value; undefined removes it. */
export function writeStored(key: string, value: unknown) {
  try {
    if (value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage blocked: the value lasts until the page reloads.
  }
}
