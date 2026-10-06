import { addMinutes, format, startOfDay } from 'date-fns'
import type { BusinessHours, Priority, SlaPolicy, Ticket } from '@/data/types'

export const BUSINESS_HOURS: BusinessHours = {
  days: [1, 2, 3, 4, 5],
  startMin: 8 * 60,
  endMin: 17 * 60,
  holidays: [],
}

export const SLA_POLICIES: SlaPolicy[] = [
  { priority: 'p1', label: 'Critical', responseMin: 15, resolveMin: 4 * 60, calendar: '24x7' },
  { priority: 'p2', label: 'High', responseMin: 60, resolveMin: 8 * 60, calendar: 'business' },
  { priority: 'p3', label: 'Medium', responseMin: 4 * 60, resolveMin: 3 * 9 * 60, calendar: 'business' },
  { priority: 'p4', label: 'Low', responseMin: 8 * 60, resolveMin: 5 * 9 * 60, calendar: 'business' },
]

export const policyFor = (p: Priority) => SLA_POLICIES.find((s) => s.priority === p)!

function isWorkingDay(date: Date, bh: BusinessHours) {
  return bh.days.includes(date.getDay()) && !bh.holidays.includes(format(date, 'yyyy-MM-dd'))
}

/** Add `minutes` of working time to `from`, skipping nights, weekends and holidays. */
export function addWorkingMinutes(from: Date, minutes: number, calendar: SlaPolicy['calendar'], bh = BUSINESS_HOURS) {
  if (calendar === '24x7') return addMinutes(from, minutes)
  let cursor = from
  let left = minutes
  for (let guard = 0; guard < 400 && left > 0; guard++) {
    const day0 = startOfDay(cursor)
    if (!isWorkingDay(cursor, bh)) {
      cursor = addMinutes(day0, 24 * 60 + bh.startMin)
      continue
    }
    const open = addMinutes(day0, bh.startMin)
    const close = addMinutes(day0, bh.endMin)
    if (cursor < open) cursor = open
    if (cursor >= close) {
      cursor = addMinutes(day0, 24 * 60 + bh.startMin)
      continue
    }
    const room = (close.getTime() - cursor.getTime()) / 60_000
    if (left <= room) return addMinutes(cursor, left)
    left -= room
    cursor = addMinutes(day0, 24 * 60 + bh.startMin)
  }
  return cursor
}

export function dueDates(createdAt: Date, priority: Priority) {
  const p = policyFor(priority)
  return {
    dueResponseAt: addWorkingMinutes(createdAt, p.responseMin, p.calendar).toISOString(),
    dueResolveAt: addWorkingMinutes(createdAt, p.resolveMin, p.calendar).toISOString(),
  }
}

export type SlaState = 'ok' | 'at_risk' | 'breached' | 'paused' | 'met' | 'missed' | 'n/a'

export interface SlaReading {
  state: SlaState
  dueAt: Date
  /** ms until due (negative once breached) */
  remainingMs: number
  /** 0..1 of the window already used */
  used: number
}

const toMs = (iso: string) => new Date(iso).getTime()

/** Effective due time: the clock is stopped while a ticket is pending. */
function effectiveDue(t: Ticket, which: 'response' | 'resolve', now: number) {
  const base = toMs(which === 'response' ? t.dueResponseAt : t.dueResolveAt)
  const live = t.pausedAt ? now - toMs(t.pausedAt) : 0
  return base + t.pausedMs + live
}

export function readSla(t: Ticket, which: 'response' | 'resolve', now = Date.now()): SlaReading {
  const created = toMs(t.createdAt)
  const due = effectiveDue(t, which, now)
  const total = Math.max(1, due - created)
  const done = which === 'response' ? t.firstResponseAt : t.resolvedAt
  if (t.status === 'cancelled') return { state: 'n/a', dueAt: new Date(due), remainingMs: 0, used: 0 }
  if (done) {
    const ok = toMs(done) <= due
    return { state: ok ? 'met' : 'missed', dueAt: new Date(due), remainingMs: due - toMs(done), used: (toMs(done) - created) / total }
  }
  if (which === 'resolve' && (t.status === 'resolved' || t.status === 'closed')) {
    return { state: 'met', dueAt: new Date(due), remainingMs: 0, used: 1 }
  }
  if (t.pausedAt) return { state: 'paused', dueAt: new Date(due), remainingMs: due - now, used: (now - created) / total }
  const remaining = due - now
  const used = (now - created) / total
  if (remaining < 0) return { state: 'breached', dueAt: new Date(due), remainingMs: remaining, used }
  const risk = remaining < 30 * 60_000 || used > 0.75
  return { state: risk ? 'at_risk' : 'ok', dueAt: new Date(due), remainingMs: remaining, used }
}

/** The worst thing currently true of a ticket's SLAs — drives the list chip. */
export function worstSla(t: Ticket, now = Date.now()): SlaReading & { which: 'response' | 'resolve' } {
  const r = readSla(t, 'response', now)
  const s = readSla(t, 'resolve', now)
  const rank: Record<SlaState, number> = { breached: 6, at_risk: 5, missed: 4, paused: 3, ok: 2, met: 1, 'n/a': 0 }
  const open = t.status !== 'resolved' && t.status !== 'closed' && t.status !== 'cancelled'
  if (open) {
    if (!t.firstResponseAt && rank[r.state] >= rank[s.state]) return { ...r, which: 'response' }
    return { ...s, which: 'resolve' }
  }
  return rank[s.state] >= rank[r.state] ? { ...s, which: 'resolve' } : { ...r, which: 'response' }
}

export const isOpenStatus = (s: Ticket['status']) => s !== 'resolved' && s !== 'closed' && s !== 'cancelled'

/** Elapsed time between two instants, counting only the hours the team's SLA calendar is running. */
export function workingMsBetween(from: Date, to: Date, calendar: SlaPolicy['calendar'], bh = BUSINESS_HOURS) {
  if (to <= from) return 0
  if (calendar === '24x7') return to.getTime() - from.getTime()
  let total = 0
  let day = startOfDay(from)
  for (let guard = 0; guard < 400 && day < to; guard++, day = addMinutes(day, 24 * 60)) {
    if (!isWorkingDay(day, bh)) continue
    const open = addMinutes(day, bh.startMin)
    const close = addMinutes(day, bh.endMin)
    const a = Math.max(open.getTime(), from.getTime())
    const z = Math.min(close.getTime(), to.getTime())
    if (z > a) total += z - a
  }
  return total
}
