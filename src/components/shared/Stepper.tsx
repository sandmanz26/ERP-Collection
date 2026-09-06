import { Check, ChevronRight, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROJECT_STAGES, stageIndex } from '@/data/reference'
import type { Project, ProjectStage } from '@/data/types'
import { Tooltip } from '@/components/ui/tooltip'

/**
 * The eleven stages of an order as a rail. Past stages are closed, the current
 * one is open, and everything after it is locked — an order does not skip
 * being costed on its way from a drawing to a container.
 */
export function Stepper({
  project,
  selected,
  onSelect,
  className,
}: {
  project: Project
  selected: ProjectStage
  onSelect: (s: ProjectStage) => void
  className?: string
}) {
  const currentIdx = stageIndex(project.stage)

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-surface', className)}>
      <div className="scrollbar-thin flex overflow-x-auto">
        {PROJECT_STAGES.map((s, i) => {
          const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'upcoming'
          const isSelected = selected === s.key
          return (
            <Tooltip key={s.key} content={s.hint}>
              <button
                onClick={() => onSelect(s.key)}
                className={cn(
                  'group relative flex min-w-[124px] flex-1 shrink-0 items-start gap-2 border-r border-border px-3 py-3 text-left transition-colors last:border-r-0',
                  isSelected ? 'bg-primary-soft/60' : 'hover:bg-bg-muted/70',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors',
                    state === 'done' && 'bg-success text-white',
                    state === 'current' && 'bg-primary text-primary-fg ring-4 ring-primary/18',
                    state === 'upcoming' && 'border border-border-strong bg-surface text-fg-subtle',
                  )}
                >
                  {state === 'done' ? <Check className="size-3.5" strokeWidth={3} /> : state === 'upcoming' ? <Lock className="size-3" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-[12.5px] font-semibold leading-tight',
                      state === 'upcoming' ? 'text-fg-subtle' : 'text-fg',
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="mt-1 block truncate text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">
                    {s.group.toLowerCase().replace('_', ' ')}
                  </span>
                </span>
                {i < PROJECT_STAGES.length - 1 && (
                  <ChevronRight className="absolute -right-[9px] top-1/2 z-10 size-4 -translate-y-1/2 rounded-full bg-surface text-fg-subtle" />
                )}
                {isSelected && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-primary" />}
              </button>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
