import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtDate } from '@/lib/format'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function monthMatrix(view: Date) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1)
  const startOffset = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - startOffset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  size = 'md',
  clearable = true,
  min,
  max,
  quickRanges = true,
}: {
  value?: string | null
  onChange: (iso: string | null) => void
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
  clearable?: boolean
  min?: string
  max?: string
  quickRanges?: boolean
}) {
  const selected = value ? new Date(value) : null
  const [open, setOpen] = React.useState(false)
  const [view, setView] = React.useState(() => selected ?? new Date())
  const today = new Date()

  React.useEffect(() => {
    if (open && selected) setView(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const days = monthMatrix(view)
  const h = size === 'sm' ? 'h-8 text-[12.5px]' : 'h-9 text-[13.5px]'
  const minD = min ? new Date(min) : null
  const maxD = max ? new Date(max) : null

  const set = (d: Date) => {
    onChange(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 8)).toISOString())
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2 rounded-lg border border-border-strong/80 bg-surface px-3 text-left transition-[border-color,box-shadow] focus:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/16',
            open && 'border-primary ring-[3px] ring-primary/16',
            h,
            className,
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-fg-subtle" />
          <span className={cn('flex-1 truncate', !selected && 'text-fg-subtle')}>
            {selected ? fmtDate(value!) : placeholder}
          </span>
          {clearable && selected && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation()
                onChange(null)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="grid size-4 place-items-center rounded text-fg-subtle hover:bg-neutral-soft hover:text-fg"
            >
              <X className="size-3" />
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={5}
          className="z-[70] w-[268px] rounded-xl border border-border bg-surface-raised p-2.5 shadow-pop animate-pop-in"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              className="grid size-7 place-items-center rounded-md text-fg-muted hover:bg-bg-muted hover:text-fg"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="text-[13px] font-semibold text-fg">
              {view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </p>
            <button
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              className="grid size-7 place-items-center rounded-md text-fg-muted hover:bg-bg-muted hover:text-fg"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((w) => (
              <div key={w} className="grid h-7 place-items-center text-[10.5px] font-semibold uppercase text-fg-subtle">
                {w}
              </div>
            ))}
            {days.map((d, i) => {
              const outside = d.getMonth() !== view.getMonth()
              const isSel = selected && sameDay(d, selected)
              const isToday = sameDay(d, today)
              const disabled = (minD && d < minD) || (maxD && d > maxD)
              return (
                <button
                  key={i}
                  disabled={!!disabled}
                  onClick={() => set(d)}
                  className={cn(
                    'tnum relative grid h-8 place-items-center rounded-md text-[12.5px] transition-colors',
                    outside ? 'text-fg-subtle/55' : 'text-fg',
                    isSel ? 'bg-primary font-semibold text-primary-fg' : 'hover:bg-primary-soft',
                    disabled && 'pointer-events-none opacity-30',
                  )}
                >
                  {d.getDate()}
                  {isToday && !isSel && <span className="absolute bottom-1 size-1 rounded-full bg-primary" />}
                </button>
              )
            })}
          </div>
          {quickRanges && (
            <div className="mt-2 flex items-center gap-1 border-t border-border pt-2">
              {[
                { label: 'Today', d: 0 },
                { label: '+7d', d: 7 },
                { label: '+14d', d: 14 },
                { label: '+30d', d: 30 },
              ].map((q) => (
                <button
                  key={q.label}
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() + q.d)
                    set(d)
                  }}
                  className="flex-1 rounded-md px-1.5 py-1 text-[11.5px] font-medium text-fg-muted hover:bg-bg-muted hover:text-fg"
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
