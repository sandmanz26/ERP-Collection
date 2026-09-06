import { cn } from '@/lib/utils'
import { fmtPercent } from '@/lib/format'

/**
 * A capacity bar that changes colour where the number starts to matter —
 * under-filled is money paid for air, over-filled will not fit.
 */
export function UtilisationBar({
  pct,
  label,
  className,
  lowIsBad = false,
  height = 'h-2',
}: {
  pct: number
  label?: string
  className?: string
  /** on a container, empty space is the problem; in a warehouse, fullness is */
  lowIsBad?: boolean
  height?: string
}) {
  const clamped = Math.max(0, Math.min(140, pct))
  const tone =
    pct > 100 ? 'bg-danger'
      : pct > 92 ? 'bg-warning'
        : lowIsBad && pct < 60 ? 'bg-warning'
          : lowIsBad && pct < 80 ? 'bg-info'
            : 'bg-success'
  return (
    <div className={cn('min-w-[90px]', className)}>
      <div className={cn('relative w-full overflow-hidden rounded-full bg-neutral-soft', height)}>
        <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${Math.min(100, clamped)}%` }} />
      </div>
      {label !== undefined ? (
        <p className="tnum mt-1 text-[11px] text-fg-muted">{label}</p>
      ) : (
        <p className="tnum mt-1 text-[11px] text-fg-muted">{fmtPercent(pct, 0)}</p>
      )}
    </div>
  )
}
