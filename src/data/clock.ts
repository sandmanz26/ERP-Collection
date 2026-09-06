/**
 * The seeded book is anchored to whenever the demo is opened, so cut-offs,
 * ageing and overdue dates stay live instead of rotting into last year.
 */
const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)

/** ISO date n days from today — negative is the past. */
export function day(n: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** ISO timestamp n days from today at a given local hour. */
export function stamp(n: number, hour = 9, minute = 0): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + n)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export const today = () => day(0)

/**
 * A deterministic generator, so the seeded transactions look scattered but
 * come out the same on every reload — a demo that reshuffles itself is
 * impossible to talk about.
 */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

export const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length) % arr.length]
export const between = (r: () => number, min: number, max: number) => min + r() * (max - min)
export const intBetween = (r: () => number, min: number, max: number) => Math.floor(between(r, min, max + 1))
export const round = (n: number, dp = 0) => Math.round(n * 10 ** dp) / 10 ** dp
