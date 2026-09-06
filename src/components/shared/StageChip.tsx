import { PROJECT_STAGES, stageIndex } from '@/data/reference'
import type { ProjectStage } from '@/data/types'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/tooltip'
import { StatusBadge } from './status'

export function StageChip({ stage }: { stage: ProjectStage }) {
  const spec = PROJECT_STAGES.find((s) => s.key === stage)!
  return (
    <Tooltip content={spec.hint}>
      <span>
        <StatusBadge value={stage} />
      </span>
    </Tooltip>
  )
}

/** The eleven stages as a rail, with everything before the current one filled. */
export function StageRail({ stage, className }: { stage: ProjectStage; className?: string }) {
  const current = stageIndex(stage)
  return (
    <div className={cn('flex items-center gap-[3px]', className)}>
      {PROJECT_STAGES.map((s, i) => (
        <Tooltip key={s.key} content={`${s.label} — ${s.hint}`}>
          <span
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i < current && 'bg-primary/50',
              i === current && 'bg-primary',
              i > current && 'bg-border',
            )}
          />
        </Tooltip>
      ))}
    </div>
  )
}
