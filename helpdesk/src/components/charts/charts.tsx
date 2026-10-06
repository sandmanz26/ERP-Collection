import * as React from 'react'
import { cn } from '@/lib/utils'

export interface Series { key: string; label: string; color: string }

/** Vertical bars, 1–2 series, hover tooltip, thin 4px-rounded marks, text-token axes. */
export function BarChart({
  data, series, height = 180, format = (n) => String(n), className,
}: {
  data: { label: string; values: Record<string, number> }[]
  series: Series[]
  height?: number
  format?: (n: number) => string
  className?: string
}) {
  const [hover, setHover] = React.useState<number | null>(null)
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0)))
  const top = Math.ceil(max / 5) * 5 || 5
  const ticks = [0, top / 2, top]
  const n = data.length
  const W = 100
  const slot = W / n
  const gap = 2
  const barW = Math.min(slot * 0.7, 6) / series.length
  const showEvery = n > 16 ? 3 : n > 10 ? 2 : 1
  return (
    <figure className={cn('relative', className)}>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[12px] text-fg-muted">
            <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
      <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
        <div className="absolute inset-0 flex flex-col justify-between">
          {[...ticks].reverse().map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span className="tnum w-6 text-right text-[10.5px] text-fg-subtle">{t}</span>
              <span className="h-px flex-1 bg-border/70" />
            </div>
          ))}
        </div>
        <div className="absolute inset-y-0 left-8 right-0 flex">
          {data.map((d, i) => (
            <div key={i} className="relative flex flex-1 items-end justify-center gap-[2px]" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${d.label}: ${series.map((s) => `${s.label} ${format(d.values[s.key] ?? 0)}`).join(', ')}`}>
              {hover === i && <span className="absolute inset-y-0 inset-x-0 rounded bg-bg-muted/70" />}
              {series.map((s) => {
                const v = d.values[s.key] ?? 0
                return (
                  <span
                    key={s.key}
                    className="relative z-[1] rounded-t-[4px]"
                    style={{ height: `${(v / top) * 100}%`, background: s.color, width: `max(4px, ${(barW / slot) * 100 * 1.0}%)`, maxWidth: 14, marginRight: gap ? 0 : 0 }}
                  />
                )
              })}
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 min-w-[120px] -translate-y-1 whitespace-nowrap rounded-lg border border-border bg-surface-raised px-2.5 py-2 text-[12px] shadow-pop" style={{ [i > n / 2 ? 'right' : 'left']: 0 }}>
                  <p className="mb-1 font-semibold text-fg">{d.label}</p>
                  {series.map((s) => (
                    <p key={s.key} className="flex items-center justify-between gap-4 text-fg-muted">
                      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-[2px]" style={{ background: s.color }} />{s.label}</span>
                      <span className="tnum font-semibold text-fg">{format(d.values[s.key] ?? 0)}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="ml-8 mt-1.5 flex">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[10.5px] text-fg-subtle">{i % showEvery === 0 ? d.label : ''}</span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Chart data</caption>
        <thead><tr><th>Period</th>{series.map((s) => <th key={s.key}>{s.label}</th>)}</tr></thead>
        <tbody>{data.map((d, i) => <tr key={i}><td>{d.label}</td>{series.map((s) => <td key={s.key}>{d.values[s.key] ?? 0}</td>)}</tr>)}</tbody>
      </table>
    </figure>
  )
}

/** Ranked horizontal bars with the value written at the end — no axis needed. */
export function HBars({
  rows, color = 'var(--series-1)', format = (n) => String(n), max, onRowClick,
}: {
  rows: { label: React.ReactNode; value: number; sub?: React.ReactNode; color?: string }[]
  color?: string
  format?: (n: number) => string
  max?: number
  onRowClick?: (i: number) => void
}) {
  const m = max ?? Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={i}>
          <button disabled={!onRowClick} onClick={() => onRowClick?.(i)} className={cn('block w-full text-left', onRowClick && 'rounded-md hover:bg-bg-muted/60')}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-fg">{r.label}</span>
              <span className="tnum shrink-0 font-semibold text-fg">{format(r.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-soft">
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.value / m) * 100)}%`, background: r.color ?? color }} />
            </div>
            {r.sub && <p className="mt-0.5 text-[11.5px] text-fg-subtle">{r.sub}</p>}
          </button>
        </li>
      ))}
    </ul>
  )
}

/** A single-row stacked bar (parts of a whole) with a swatch legend that carries the numbers. */
export function StackBar({ parts, total }: { parts: { label: string; value: number; color: string }[]; total?: number }) {
  const t = total ?? (parts.reduce((a, p) => a + p.value, 0) || 1)
  return (
    <div className="space-y-3">
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(', ')}>
        {parts.filter((p) => p.value > 0).map((p) => (
          <span key={p.label} style={{ width: `${(p.value / t) * 100}%`, background: p.color }} className="first:rounded-l-full last:rounded-r-full" />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center justify-between gap-2 text-[12.5px]">
            <span className="inline-flex items-center gap-1.5 text-fg-muted"><span className="size-2.5 rounded-[3px]" style={{ background: p.color }} />{p.label}</span>
            <span className="tnum font-semibold text-fg">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Tiny trend line with an end dot; no axes — pair with a number. */
export function Spark({ values, color = 'var(--series-1)', width = 96, height = 28 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return null
  const max = Math.max(...values), min = Math.min(...values)
  const r = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 6) + 3, height - 4 - ((v - min) / r) * (height - 8)])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3" fill={color} stroke="hsl(var(--surface))" strokeWidth="2" />
    </svg>
  )
}

/** Radial gauge-free "meter" for a single percentage. */
export function Meter({ value, tone = 'primary' }: { value: number; tone?: 'primary' | 'success' | 'warning' | 'danger' }) {
  const bg = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }[tone]
  return (
    <div className="h-2 overflow-hidden rounded-full bg-neutral-soft" role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full', bg)} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  )
}
