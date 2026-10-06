import { format as dfFormat, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

/** date-fns format with Indonesian month and day names. */
export const format = (date: Date | number, pattern: string) => dfFormat(date, pattern, { locale: idLocale })

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
  if (isToday(x)) return `Hari ini ${format(x, 'HH:mm')}`
  if (isTomorrow(x)) return `Besok ${format(x, 'HH:mm')}`
  if (isYesterday(x)) return `Kemarin ${format(x, 'HH:mm')}`
  return format(x, 'EEE d MMM, HH:mm')
}

export function fmtAgo(iso?: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - d(iso).getTime()
  if (Math.abs(diff) < 45_000) return 'baru saja'
  return formatDistanceToNowStrict(d(iso), { addSuffix: true, locale: idLocale })
}

/** 3_660_000 → "1h 1m" ; tiny values → "<1m" */
export function fmtDuration(ms: number) {
  const abs = Math.abs(ms)
  const min = Math.round(abs / 60_000)
  if (min < 1) return '<1m'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}j ${min % 60 ? `${min % 60}m` : ''}`.trim()
  const days = Math.floor(h / 24)
  return `${days}h ${h % 24 ? `${h % 24}j` : ''}`.trim()
}

export function fmtMoney(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} jt`
  if (Math.abs(n) >= 1_000) return `Rp ${Math.round(n / 1_000)} rb`
  return `Rp ${Math.round(n)}`
}

export function fmtMoneyFull(n: number) {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

export function pct(n: number, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`
}

/** "hari ini 15:00 (3 jam lagi)" / "lewat 2 jam" — used for ETA labels. */
export function fmtEta(iso?: string | null, now = Date.now()) {
  if (!iso) return 'Belum ada estimasi'
  const t = d(iso).getTime()
  const diff = t - now
  return diff < 0 ? `${fmtSmart(iso)} · lewat ${fmtDuration(diff)}` : `${fmtSmart(iso)} · ${fmtDuration(diff)} lagi`
}

export const toLocalInput = (iso: string) => format(d(iso), "yyyy-MM-dd'T'HH:mm")
