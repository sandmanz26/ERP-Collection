const CURRENCY_MINOR: Record<string, number> = { IDR: 0, JPY: 0, USD: 2, EUR: 2, SGD: 2, AUD: 2, CNY: 2, KRW: 0 }

export function fmtMoney(value: number | undefined | null, currency = 'IDR', opts: { compact?: boolean; sign?: boolean } = {}) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  const digits = CURRENCY_MINOR[currency] ?? 2
  const n = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: opts.compact ? 0 : digits,
    maximumFractionDigits: opts.compact ? 1 : digits,
    notation: opts.compact ? 'compact' : 'standard',
  }).format(value)
  const prefix = opts.sign && value > 0 ? '+' : ''
  return `${prefix}${n}`
}

export function fmtCurrency(value: number | undefined | null, currency = 'IDR', opts: { compact?: boolean } = {}) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return `${currency} ${fmtMoney(value, currency, opts)}`
}

export function fmtNumber(value: number | undefined | null, digits = 0) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
}

export function fmtPercent(value: number | undefined | null, digits = 1) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}%`
}

export function fmtDate(iso?: string | null, style: 'short' | 'medium' | 'long' = 'medium') {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  if (style === 'short') return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  if (style === 'long') return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateTime(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${fmtDate(iso)} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

/** "in 3 days" / "2 days ago" — used for cut-off countdowns. */
export function relativeDays(iso?: string | null, from = new Date()) {
  if (!iso) return null
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) return null
  const ms = target.getTime() - from.getTime()
  return Math.round(ms / 86_400_000)
}

export function relativeLabel(iso?: string | null) {
  const d = relativeDays(iso)
  if (d === null) return '—'
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d === -1) return 'yesterday'
  return d > 0 ? `in ${d} days` : `${Math.abs(d)} days ago`
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

/** Terms that must keep their industry casing rather than being title-cased. */
const ACRONYMS: Record<string, string> = {
  fcl: 'FCL', lcl: 'LCL', air: 'Air', roro: 'RoRo', bl: 'B/L', vgm: 'VGM', si: 'SI', peb: 'PEB',
  npe: 'NPE', coo: 'COO', ar: 'AR', ap: 'AP', vat: 'VAT', wht: 'WHT', ppn: 'PPN', hs: 'HS',
  tt: 'TT', cad: 'CAD', lc: 'L/C', fx: 'FX', cbm: 'CBM', teu: 'TEU', usance: 'usance',
  ims: 'IMS', cy: 'CY', cfs: 'CFS', imo: 'IMO', un: 'UN', po: 'PO', ams: 'AMS', ens: 'ENS',
  jv: 'JV', gp: 'GP', hc: 'HC', rf: 'RF', ot: 'OT', fr: 'FR', pod: 'POD', pol: 'POL',
}
/** Words that stay lower-case inside a phrase. */
const MINOR = new Set(['to', 'of', 'at', 'in', 'on', 'and', 'or', 'the', 'a', 'per', 'by', 'from'])

export function titleCase(s: string) {
  const words = s.toLowerCase().replace(/_/g, ' ').split(' ').filter(Boolean)
  return words
    .map((w, i) => {
      if (ACRONYMS[w]) return ACRONYMS[w]
      if (i > 0 && MINOR.has(w)) return w
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

/** "1 day" / "3 days" — never "1 days". */
export function pluralDays(n: number) {
  const abs = Math.abs(n)
  return `${abs} ${abs === 1 ? 'day' : 'days'}`
}
