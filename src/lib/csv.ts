/* ------------------------------------------------------------------
   CSV toolkit — used by every module's Import / Export.
   Handles quoted fields, embedded commas/newlines, BOM and CRLF.
   ------------------------------------------------------------------ */

export type CsvRow = Record<string, string>

export function toCsv(rows: Record<string, unknown>[], columns?: { key: string; header: string }[]) {
  if (!rows.length && !columns?.length) return ''
  const cols = columns ?? Object.keys(rows[0] ?? {}).map((k) => ({ key: k, header: k }))
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = cols.map((c) => esc(c.header)).join(',')
  const body = rows.map((r) => cols.map((c) => esc(r[c.key])).join(',')).join('\r\n')
  return `${head}\r\n${body}`
}

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const clean = text.replace(/^﻿/, '')
  const cells: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++
      row.push(field)
      cells.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field.length || row.length) {
    row.push(field)
    cells.push(row)
  }

  const nonEmpty = cells.filter((r) => r.some((c) => c.trim() !== ''))
  if (!nonEmpty.length) return { headers: [], rows: [] }
  const headers = nonEmpty[0].map((h) => h.trim())
  const rows = nonEmpty.slice(1).map((r) => {
    const o: CsvRow = {}
    headers.forEach((h, idx) => (o[h] = (r[idx] ?? '').trim()))
    return o
  })
  return { headers, rows }
}

export function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportCsv(filename: string, rows: Record<string, unknown>[], columns?: { key: string; header: string }[]) {
  downloadFile(filename.endsWith('.csv') ? filename : `${filename}.csv`, toCsv(rows, columns))
}

export function exportJson(filename: string, data: unknown) {
  downloadFile(
    filename.endsWith('.json') ? filename : `${filename}.json`,
    JSON.stringify(data, null, 2),
    'application/json',
  )
}

/** Fuzzy-match an incoming CSV header to a known field key. */
export function guessMapping(headers: string[], fields: { key: string; label: string }[]) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const map: Record<string, string> = {}
  for (const f of fields) {
    const hit = headers.find((h) => norm(h) === norm(f.key) || norm(h) === norm(f.label))
    if (hit) map[f.key] = hit
  }
  return map
}

export type ImportIssue = { row: number; field: string; message: string; severity: 'error' | 'warning' }
