import * as React from 'react'
import { GripVertical, LayoutList, Rows3, Table2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTableStyle, type TableMode } from '@/store/useTableStyle'
import { Tooltip } from '@/components/ui/tooltip'

/* ------------------------------------------------------------------
   The floating table-style control.

   It is draggable because there is no one right place for it: on a wide
   register it belongs out of the way bottom-right, on a narrow one it lands
   on top of the pagination. Rather than guess, it goes where the person
   using it puts it, and stays there.
   ------------------------------------------------------------------ */

const MODES: { value: TableMode; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    value: 'detailed',
    label: 'Detailed',
    hint: 'Every column at once — for reconciling a whole month',
    icon: <Table2 className="size-4" />,
  },
  {
    value: 'relaxed',
    label: 'Relaxed',
    hint: 'The few columns that decide, the rest behind an icon on each row',
    icon: <LayoutList className="size-4" />,
  },
]

const MARGIN = 12

export function TableStyleSwitcher() {
  const { mode, x, y, collapsed, tables, setMode, setPosition, setCollapsed } = useTableStyle()
  const ref = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef<{ dx: number; dy: number } | null>(null)
  const [dragging, setDragging] = React.useState(false)

  /* Keep it on screen when the window changes size under it. */
  React.useEffect(() => {
    const clamp = () => {
      const el = ref.current
      if (!el || x === null || y === null) return
      const { width, height } = el.getBoundingClientRect()
      const maxX = window.innerWidth - width - MARGIN
      const maxY = window.innerHeight - height - MARGIN
      if (x > maxX || y > maxY) {
        setPosition(Math.max(MARGIN, Math.min(x, maxX)), Math.max(MARGIN, Math.min(y, maxY)))
      }
    }
    window.addEventListener('resize', clamp)
    clamp()
    return () => window.removeEventListener('resize', clamp)
  }, [x, y, setPosition])

  const onPointerDown = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el) return
    const box = el.getBoundingClientRect()
    drag.current = { dx: e.clientX - box.left, dy: e.clientY - box.top }
    setDragging(true)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current
    if (!drag.current || !el) return
    const box = el.getBoundingClientRect()
    const maxX = window.innerWidth - box.width - MARGIN
    const maxY = window.innerHeight - box.height - MARGIN
    setPosition(
      Math.max(MARGIN, Math.min(e.clientX - drag.current.dx, maxX)),
      Math.max(MARGIN, Math.min(e.clientY - drag.current.dy, maxY)),
    )
  }

  const endDrag = (e: React.PointerEvent) => {
    drag.current = null
    setDragging(false)
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
  }

  /* Bottom-right until somebody moves it. */
  const style: React.CSSProperties =
    x === null || y === null ? { right: 20, bottom: 20 } : { left: x, top: y }

  /* Nothing to restyle on a page without a register. */
  if (tables === 0) return null

  if (collapsed) {
    return (
      <div ref={ref} style={style} className="fixed z-40">
        <Tooltip content="Table style" side="left">
          <button
            onClick={() => setCollapsed(false)}
            className="grid size-10 place-items-center rounded-full border border-border bg-surface text-fg-muted shadow-pop transition-colors hover:text-fg"
            aria-label="Open the table style control"
          >
            <Rows3 className="size-[18px]" />
          </button>
        </Tooltip>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        'fixed z-40 select-none rounded-xl border border-border bg-surface shadow-pop',
        dragging && 'cursor-grabbing',
      )}
    >
      <div className="flex items-center gap-1 border-b border-border px-1.5 py-1">
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded text-fg-subtle transition-colors hover:bg-bg-muted hover:text-fg-muted',
            dragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
          aria-label="Drag the table style control"
          title="Drag me anywhere"
        >
          <GripVertical className="size-3.5" />
        </button>
        <span className="flex-1 text-[11px] font-medium uppercase tracking-[0.055em] text-fg-subtle">Table style</span>
        <button
          onClick={() => setCollapsed(true)}
          className="grid size-6 shrink-0 place-items-center rounded text-fg-subtle transition-colors hover:bg-bg-muted hover:text-fg-muted"
          aria-label="Collapse the table style control"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="flex gap-1 p-1.5">
        {MODES.map((m) => (
          <Tooltip key={m.value} content={m.hint} side="top">
            <button
              onClick={() => setMode(m.value)}
              aria-pressed={mode === m.value}
              className={cn(
                'flex w-[104px] flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11.5px] font-medium transition-colors',
                mode === m.value
                  ? 'bg-primary-soft text-primary-soft-fg'
                  : 'text-fg-muted hover:bg-bg-muted hover:text-fg',
              )}
            >
              {m.icon}
              {m.label}
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}
