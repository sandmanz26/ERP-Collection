import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`
}

/** Next sequential document code, e.g. PRJ-2026-0042 */
export function nextCode(prefix: string, existing: string[], pad = 4, withYear = false) {
  const year = new Date().getFullYear()
  const head = withYear ? `${prefix}-${year}-` : `${prefix}-`
  const max = existing
    .filter((c) => c.startsWith(head))
    .map((c) => parseInt(c.slice(head.length), 10))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `${head}${String(max + 1).padStart(pad, '0')}`
}

export function groupBy<T, K extends string | number>(rows: T[], key: (row: T) => K) {
  return rows.reduce<Record<K, T[]>>((acc, row) => {
    const k = key(row)
    ;(acc[k] ||= []).push(row)
    return acc
  }, {} as Record<K, T[]>)
}

export function sum<T>(rows: T[], pick: (row: T) => number) {
  return rows.reduce((a, r) => a + (pick(r) || 0), 0)
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function unique<T>(arr: T[]) {
  return Array.from(new Set(arr))
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms = 200) {
  let t: ReturnType<typeof setTimeout>
  return (...args: A) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}
