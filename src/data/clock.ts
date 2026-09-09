/**
 * The seed book is written relative to today, so the demo is always live: a
 * container that discharged four days ago is still four days ago next month.
 */

const ANCHOR = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
})()

/** ISO date `offset` days from today. Negative is the past. */
export function d(offset: number): string {
  const x = new Date(ANCHOR)
  x.setDate(x.getDate() + offset)
  return x.toISOString().slice(0, 10)
}

/** ISO timestamp `offset` days from today at the given hour. */
export function dt(offset: number, hour = 9, minute = 0): string {
  const x = new Date(ANCHOR)
  x.setDate(x.getDate() + offset)
  x.setHours(hour, minute, 0, 0)
  return x.toISOString()
}

export const TODAY = d(0)

/** Whole days between two ISO dates; positive means `to` is later. */
export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000)
}

/** ISO date `days` after `from`. */
export function addDays(from: string, days: number): string {
  const x = new Date(from)
  x.setDate(x.getDate() + days)
  return x.toISOString().slice(0, 10)
}

/** The later of two ISO dates; undefined values lose. */
export function maxDate(...dates: (string | undefined)[]): string | undefined {
  const real = dates.filter((x): x is string => !!x)
  if (!real.length) return undefined
  return real.reduce((a, b) => (a > b ? a : b))
}
