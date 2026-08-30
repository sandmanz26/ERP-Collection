import { Check, ChevronRight, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAGES, stageIndex } from '@/data/reference'
import type { Project, StageKey } from '@/data/types'

export function Stepper({
  project,
  selected,
  onSelect,
  className,
}: {
  project: Project
  selected: StageKey
  onSelect: (s: StageKey) => void
  className?: string
}) {
  const currentIdx = stageIndex(project.stage)

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-surface', className)}>
      <div className="scrollbar-thin flex overflow-x-auto">
        {STAGES.map((s, i) => {
          const stage = project.stages.find((x) => x.key === s.key)
          const total = stage?.tasks.length ?? 0
          const done = stage?.tasks.filter((t) => t.done).length ?? 0
          const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'upcoming'
          const isSelected = selected === s.key
          return (
            <button
              key={s.key}
              onClick={() => onSelect(s.key)}
              className={cn(
                'group relative flex min-w-[132px] flex-1 shrink-0 items-start gap-2 border-r border-border px-3 py-3 text-left transition-colors last:border-r-0',
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
                  {s.short}
                </span>
                <span className="mt-1 flex items-center gap-1.5">
                  <span className="relative h-1 w-full max-w-[48px] overflow-hidden rounded-full bg-neutral-soft">
                    <span
                      className={cn(
                        'absolute inset-y-0 left-0 rounded-full transition-[width] duration-500',
                        state === 'done' ? 'bg-success' : 'bg-primary',
                      )}
                      style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                    />
                  </span>
                  <span className="tnum text-[10.5px] text-fg-subtle">
                    {done}/{total}
                  </span>
                </span>
              </span>
              {i < STAGES.length - 1 && (
                <ChevronRight className="absolute -right-[9px] top-1/2 z-10 size-4 -translate-y-1/2 rounded-full bg-surface text-fg-subtle" />
              )}
              {isSelected && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-primary" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
