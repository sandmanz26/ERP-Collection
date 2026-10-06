import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'

export const d = (iso: string | Date) => (typeof iso === 'string' ? parseISO(iso) : iso)

export function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return format(d(iso), 'd MMM yyyy')
}

export function fmtTime(iso?: string | null) {
  if (!iso) return '—'
  return format(d(iso), 'HH:mm')
}

export function fmtDateTime(iso?: string | null) {
  if (!iso) return '—'
  return format(d(iso), 'd MMM, HH:mm')
}

/** "Today 14:30", "Tomorrow 09:00", "Mon 12 May, 10:00" */
export function fmtSmart(iso?: string | null) {
  if (!iso) return '—'
  const x = d(iso)
  if (isToday(x)) return `Today ${format(x, 'HH:mm')}`
  if (isTomorrow(x)) return `Tomorrow ${format(x, 'HH:mm')}`
  if (isYesterday(x)) return `Yesterday ${format(x, 'HH:mm')}`
  return format(x, 'EEE d MMM, HH:mm')
}

export function fmtAgo(iso?: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - d(iso).getTime()
  if (Math.abs(diff) < 45_000) return 'just now'
  return formatDistanceToNowStrict(d(iso), { addSuffix: true })
}

/** 3_660_000 → "1h 1m" ; tiny values → "<1m" */
export function fmtDuration(ms: number) {
  const abs = Math.abs(ms)
  const min = Math.round(abs / 60_000)
  if (min < 1) return '<1m'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ${min % 60 ? `${min % 60}m` : ''}`.trim()
  const days = Math.floor(h / 24)
  return `${days}d ${h % 24 ? `${h % 24}h` : ''}`.trim()
}

export function fmtMoney(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}B`
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `Rp ${Math.round(n / 1_000)}K`
  return `Rp ${Math.round(n)}`
}

export function fmtMoneyFull(n: number) {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

export function pct(n: number, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`
}

export const toLocalInput = (iso: string) => format(d(iso), "yyyy-MM-dd'T'HH:mm")
