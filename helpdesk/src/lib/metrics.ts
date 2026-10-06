import { addDays, format, startOfDay } from 'date-fns'
import type { Task, Ticket } from '@/data/types'
import { policyFor, readSla, workingMsBetween } from '@/lib/sla'

const ms = (iso: string) => new Date(iso).getTime()
export const inRange = (iso: string | undefined, from: number, to: number) => !!iso && ms(iso) >= from && ms(iso) < to

export function dailyFlow(tickets: Ticket[], days: number) {
  const out: { label: string; date: Date; created: number; resolved: number }[] = []
  const today = startOfDay(new Date())
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i)
    const a = d.getTime(), b = addDays(d, 1).getTime()
    out.push({
      label: format(d, days > 20 ? 'd MMM' : 'EEE d'),
      date: d,
      created: tickets.filter((t) => inRange(t.createdAt, a, b)).length,
      resolved: tickets.filter((t) => inRange(t.resolvedAt, a, b)).length,
    })
  }
  return out
}

/** Share of tickets finished in the window that met BOTH response and resolution targets. */
export function slaCompliance(tickets: Ticket[], from: number, to: number) {
  const done = tickets.filter((t) => inRange(t.resolvedAt, from, to))
  if (!done.length) return { rate: 1, total: 0, met: 0 }
  const met = done.filter((t) => readSla(t, 'resolve').state === 'met' && readSla(t, 'response').state !== 'missed').length
  return { rate: met / done.length, total: done.length, met }
}

export function avgFirstResponseMs(tickets: Ticket[], from: number, to: number) {
  const rows = tickets.filter((t) => inRange(t.createdAt, from, to) && t.firstResponseAt)
  if (!rows.length) return 0
  return rows.reduce((a, t) => a + workingMsBetween(new Date(t.createdAt), new Date(t.firstResponseAt!), policyFor(t.priority).calendar), 0) / rows.length
}

export function mttrMs(tickets: Ticket[], from: number, to: number) {
  const rows = tickets.filter((t) => inRange(t.resolvedAt, from, to))
  if (!rows.length) return 0
  return rows.reduce((a, t) => a + Math.max(0, workingMsBetween(new Date(t.createdAt), new Date(t.resolvedAt!), policyFor(t.priority).calendar) - t.pausedMs), 0) / rows.length
}

export function csat(tickets: Ticket[], from: number, to: number) {
  const rows = tickets.filter((t) => t.rating && inRange(t.rating.at, from, to))
  if (!rows.length) return { avg: 0, n: 0, dist: [0, 0, 0, 0, 0] }
  const dist = [0, 0, 0, 0, 0]
  rows.forEach((t) => (dist[t.rating!.score - 1]++))
  return { avg: rows.reduce((a, t) => a + t.rating!.score, 0) / rows.length, n: rows.length, dist }
}

export function woCost(w: Task, rate = 85_000) {
  const labor = w.timeLogs.reduce((a, l) => a + (l.minutes / 60) * rate, 0)
  const mats = w.materials.reduce((a, m) => a + m.qty * m.unitCost, 0)
  return { labor, mats, vendor: w.vendorCost ?? 0, total: labor + mats + (w.vendorCost ?? 0) }
}

export const DAY = 86_400_000
