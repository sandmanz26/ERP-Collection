/** Seed dates are relative to today, so the demo never goes stale. */
export function iso(daysFromToday: number, hour = 8) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  d.setDate(d.getDate() + daysFromToday)
  return d.toISOString()
}

/** A fixed calendar date, for contract periods that should read as real dates. */
export function on(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 8)).toISOString()
}

export const TODAY = new Date()
export const THIS_YEAR = TODAY.getFullYear()
