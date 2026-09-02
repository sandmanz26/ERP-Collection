import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/tooltip'

/**
 * Deployed against contracted headcount — the one number this business is
 * judged on. It appears on the dashboard, the project list, the project
 * record and the deployment register, and it looks the same in all four.
 */
export function FulfilmentBar({
  deployed,
  required,
  width = 'w-[132px]',
  showNumbers = true,
  size = 'md',
}: {
  deployed: number
  required: number
  width?: string
  showNumbers?: boolean
  size?: 'sm' | 'md'
}) {
  const pct = required === 0 ? 0 : Math.round((deployed / required) * 100)
  const gap = Math.max(0, required - deployed)
  const tone =
    required === 0 ? 'bg-border-strong' : pct >= 100 ? 'bg-success' : pct >= 90 ? 'bg-warning' : 'bg-danger'

  return (
    <Tooltip
      content={
        required === 0
          ? 'No manpower lines on this project yet'
          : gap === 0
            ? `All ${required} posts filled`
            : `${gap} post${gap === 1 ? '' : 's'} unfilled — ${deployed} of ${required} deployed`
      }
    >
      <div className={cn('inline-block align-middle', width)}>
        {showNumbers && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="tnum text-[12.5px] font-medium text-fg">
              {deployed}
              <span className="text-fg-subtle"> / {required}</span>
            </span>
            <span className={cn('tnum text-[11.5px] font-semibold', gap === 0 ? 'text-success' : pct >= 90 ? 'text-warning' : 'text-danger')}>
              {pct}%
            </span>
          </div>
        )}
        <div className={cn('mt-1 w-full overflow-hidden rounded-full bg-neutral-soft', size === 'sm' ? 'h-1' : 'h-1.5')}>
          <div className={cn('h-full rounded-full transition-[width] duration-500', tone)} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      </div>
    </Tooltip>
  )
}
