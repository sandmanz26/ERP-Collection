import { cn } from '@/lib/utils'
import { fmtNumber } from '@/lib/format'
import type { Utilisation } from '@/lib/shipping'

const TONE: Record<Utilisation['status'], { bar: string; text: string; label: string }> = {
  EMPTY: { bar: 'bg-border-strong', text: 'text-fg-subtle', label: 'Empty' },
  LIGHT: { bar: 'bg-warning', text: 'text-warning', label: 'Under-used' },
  HEALTHY: { bar: 'bg-success', text: 'text-success', label: 'Healthy' },
  TIGHT: { bar: 'bg-accent', text: 'text-accent', label: 'Tight' },
  OVERLOADED: { bar: 'bg-danger', text: 'text-danger', label: 'Over capacity' },
}

export function UtilisationBar({
  u,
  compact,
  className,
}: {
  u: Utilisation
  compact?: boolean
  className?: string
}) {
  const tone = TONE[u.status]
  if (compact)
    return (
      <div className={cn('w-[132px]', className)}>
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn('text-[11px] font-medium', tone.text)}>{tone.label}</span>
          <span className="tnum text-[11px] text-fg-muted">
            {Math.max(u.volumePct, u.weightPct).toFixed(0)}%
          </span>
        </div>
        <div className="mt-1 flex gap-0.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-soft">
            <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${Math.min(100, u.volumePct)}%` }} />
          </div>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-soft">
            <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${Math.min(100, u.weightPct)}%` }} />
          </div>
        </div>
      </div>
    )

  return (
    <div className={cn('space-y-2.5', className)}>
      <Row
        label="Volume"
        pct={u.volumePct}
        detail={`${fmtNumber(u.usedCbm, 2)} / ${fmtNumber(u.capacityCbm, 1)} CBM`}
        tone={tone}
        bottleneck={u.bottleneck === 'VOLUME'}
      />
      <Row
        label="Payload"
        pct={u.weightPct}
        detail={`${fmtNumber(u.usedKg)} / ${fmtNumber(u.maxPayloadKg)} kg`}
        tone={tone}
        bottleneck={u.bottleneck === 'WEIGHT'}
      />
    </div>
  )
}

function Row({
  label,
  pct,
  detail,
  tone,
  bottleneck,
}: {
  label: string
  pct: number
  detail: string
  tone: { bar: string; text: string }
  bottleneck: boolean
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-[11.5px] font-medium text-fg-muted">
          {label}
          {bottleneck && <span className="ml-1.5 rounded bg-neutral-soft px-1 py-px text-[9.5px] uppercase tracking-wide text-neutral-soft-fg">limiting</span>}
        </span>
        <span className="tnum text-[11.5px] text-fg-muted">
          {detail} · <span className={cn('font-semibold', pct > 100 ? 'text-danger' : 'text-fg')}>{pct.toFixed(0)}%</span>
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-neutral-soft">
        <div className={cn('h-full rounded-full transition-[width] duration-500', tone.bar)} style={{ width: `${Math.min(100, pct)}%` }} />
        {pct > 100 && <div className="absolute inset-y-0 right-0 w-1 bg-danger" />}
      </div>
    </div>
  )
}
