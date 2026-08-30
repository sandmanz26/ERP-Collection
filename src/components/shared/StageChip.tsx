import { STAGES, stageIndex } from '@/data/reference'
import type { StageKey } from '@/data/types'
import { cn } from '@/lib/utils'

export function StageChip({ stage, className }: { stage: StageKey; className?: string }) {
  const idx = stageIndex(stage)
  const meta = STAGES[idx]
  const pct = ((idx + 1) / STAGES.length) * 100
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-md border border-border bg-surface-sunken px-2 py-1 text-[11.5px] font-medium text-fg-muted',
        className,
      )}
    >
      <span className="tnum text-[10px] text-fg-subtle">
        {idx + 1}/{STAGES.length}
      </span>
      <span className="relative h-1 w-9 overflow-hidden rounded-full bg-neutral-soft">
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-fg">{meta?.short}</span>
    </span>
  )
}
