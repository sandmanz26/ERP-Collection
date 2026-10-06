import type { Addon, Space } from '@/data/types'

export interface Quote {
  hours: number
  base: number
  addons: { addon: Addon; amount: number }[]
  addonTotal: number
  total: number
}

/** Hours are rounded up to the half hour — the same granularity as the booking grid. */
export function quote(space: Space, renterType: 'internal' | 'external', start: Date, end: Date, addonIds: string[], attendees: number, allAddons: Addon[]): Quote {
  const hours = Math.max(0, Math.ceil(((end.getTime() - start.getTime()) / 3_600_000) * 2) / 2)
  const rate = renterType === 'external' ? space.rental?.rateExternal ?? 0 : space.rental?.rateInternal ?? 0
  const base = rate * hours
  const addons = allAddons
    .filter((a) => addonIds.includes(a.id))
    .map((a) => ({ addon: a, amount: a.per === 'event' ? a.price : a.per === 'hour' ? a.price * hours : a.price * attendees }))
  const addonTotal = addons.reduce((t, a) => t + a.amount, 0)
  return { hours, base, addons, addonTotal, total: base + addonTotal }
}
