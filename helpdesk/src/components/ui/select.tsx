import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------
   Custom listbox — deliberately not a native <select>.
   Full keyboard support: ↑ ↓ Home End, type-ahead, Enter, Esc.
   ------------------------------------------------------------------ */

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  description?: string
  icon?: React.ReactNode
  group?: string
  disabled?: boolean
  meta?: React.ReactNode
}

interface SelectProps<T extends string> {
  value?: T | null
  onChange: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  searchable?: boolean
  clearable?: boolean
  onClear?: () => void
  disabled?: boolean
  invalid?: boolean
  className?: string
  contentClassName?: string
  size?: 'sm' | 'md'
  align?: 'start' | 'end'
  renderValue?: (opt: SelectOption<T>) => React.ReactNode
  emptyLabel?: string
  footer?: React.ReactNode
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchable,
  clearable,
  onClear,
  disabled,
  invalid,
  className,
  contentClassName,
  size = 'md',
  align = 'start',
  renderValue,
  emptyLabel = 'No matches',
  footer,
}: SelectProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const typeahead = React.useRef({ text: '', at: 0 })

  const selected = options.find((o) => o.value === value) ?? null

  const filtered = React.useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q),
    )
  }, [options, query])

  const groups = React.useMemo(() => {
    const map = new Map<string, SelectOption<T>[]>()
    filtered.forEach((o) => {
      const k = o.group ?? ''
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(o)
    })
    return Array.from(map.entries())
  }, [filtered])

  const flat = React.useMemo(() => groups.flatMap(([, items]) => items), [groups])

  React.useEffect(() => {
    if (!open) return
    setQuery('')
    const idx = flat.findIndex((o) => o.value === value)
    setActive(idx >= 0 ? idx : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const commit = (opt: SelectOption<T>) => {
    if (opt.disabled) return
    onChange(opt.value)
    setOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(flat.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(flat.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = flat[active]
      if (opt) commit(opt)
    } else if (!searchable && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      const now = Date.now()
      typeahead.current.text = now - typeahead.current.at > 700 ? e.key : typeahead.current.text + e.key
      typeahead.current.at = now
      const idx = flat.findIndex((o) => o.label.toLowerCase().startsWith(typeahead.current.text.toLowerCase()))
      if (idx >= 0) setActive(idx)
    }
  }

  const h = size === 'sm' ? 'h-8 text-[12.5px]' : 'h-9 text-[13.5px]'

  return (
    <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'group flex w-full items-center gap-2 rounded-lg border bg-surface px-3 text-left transition-[border-color,box-shadow]',
            'focus:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/16',
            'disabled:cursor-not-allowed disabled:bg-bg-muted disabled:text-fg-subtle',
            open && 'border-primary ring-[3px] ring-primary/16',
            invalid ? 'border-danger' : 'border-border-strong/80',
            h,
            className,
          )}
        >
          {selected?.icon && <span className="shrink-0 [&_svg]:size-4">{selected.icon}</span>}
          <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-fg-subtle')}>
            {selected ? (renderValue ? renderValue(selected) : selected.label) : placeholder}
          </span>
          {clearable && selected && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear"
              onClick={(e) => {
                e.stopPropagation()
                onClear?.()
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="grid size-4 shrink-0 place-items-center rounded text-fg-subtle hover:bg-neutral-soft hover:text-fg"
            >
              <X className="size-3" />
            </span>
          )}
          <ChevronsUpDown className="size-3.5 shrink-0 text-fg-subtle transition-transform group-hover:text-fg-muted" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={5}
          onKeyDown={onKeyDown}
          className={cn(
            'z-[70] w-[var(--radix-popover-trigger-width)] min-w-[200px] overflow-hidden rounded-xl border border-border bg-surface-raised p-1 shadow-pop animate-pop-in',
            contentClassName,
          )}
        >
          {searchable && (
            <div className="relative mb-1 border-b border-border px-1 pb-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                placeholder="Search…"
                className="h-8 w-full rounded-md bg-transparent pl-8 pr-2 text-[13px] text-fg placeholder:text-fg-subtle focus:outline-none"
              />
            </div>
          )}
          <div ref={listRef} role="listbox" className="scrollbar-thin max-h-[288px] overflow-y-auto">
            {flat.length === 0 && <p className="px-3 py-6 text-center text-[12.5px] text-fg-subtle">{emptyLabel}</p>}
            {groups.map(([group, items]) => (
              <div key={group || '_'}>
                {group && (
                  <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                    {group}
                  </p>
                )}
                {items.map((opt) => {
                  const idx = flat.indexOf(opt)
                  const isSelected = opt.value === value
                  return (
                    <div
                      key={opt.value}
                      data-idx={idx}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => commit(opt)}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-[7px] text-[13px] text-fg',
                        idx === active && 'bg-primary-soft/70',
                        opt.disabled && 'pointer-events-none opacity-45',
                      )}
                    >
                      {opt.icon && <span className="shrink-0 text-fg-muted [&_svg]:size-4">{opt.icon}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium leading-tight">{opt.label}</span>
                        {opt.description && (
                          <span className="mt-0.5 block truncate text-[11.5px] font-normal leading-tight text-fg-muted">
                            {opt.description}
                          </span>
                        )}
                      </span>
                      {opt.meta}
                      {isSelected && <Check className="size-4 shrink-0 text-primary" />}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          {footer && <div className="mt-1 border-t border-border pt-1">{footer}</div>}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/* ---------------- MultiSelect ---------------- */
export function MultiSelect<T extends string>({
  values,
  onChange,
  options,
  placeholder = 'Any',
  className,
  size = 'md',
  maxTags = 2,
}: {
  values: T[]
  onChange: (values: T[]) => void
  options: SelectOption<T>[]
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
  maxTags?: number
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
  const toggle = (v: T) => (values.includes(v) ? onChange(values.filter((x) => x !== v)) : onChange([...values, v]))
  const h = size === 'sm' ? 'h-8 text-[12.5px]' : 'h-9 text-[13.5px]'
  const selectedOpts = options.filter((o) => values.includes(o.value))

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-1.5 rounded-lg border border-border-strong/80 bg-surface px-2.5 text-left transition-[border-color,box-shadow] focus:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/16',
            open && 'border-primary ring-[3px] ring-primary/16',
            h,
            className,
          )}
        >
          {selectedOpts.length === 0 && <span className="flex-1 truncate text-fg-subtle">{placeholder}</span>}
          {selectedOpts.slice(0, maxTags).map((o) => (
            <span key={o.value} className="max-w-[110px] truncate rounded bg-primary-soft px-1.5 py-0.5 text-[11.5px] font-medium text-primary-soft-fg">
              {o.label}
            </span>
          ))}
          {selectedOpts.length > maxTags && (
            <span className="rounded bg-neutral-soft px-1.5 py-0.5 text-[11.5px] font-medium text-neutral-soft-fg">
              +{selectedOpts.length - maxTags}
            </span>
          )}
          <span className="flex-1" />
          {values.length > 0 && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation()
                onChange([])
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="grid size-4 place-items-center rounded text-fg-subtle hover:bg-neutral-soft hover:text-fg"
            >
              <X className="size-3" />
            </span>
          )}
          <ChevronsUpDown className="size-3.5 shrink-0 text-fg-subtle" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={5}
          className="z-[70] w-[var(--radix-popover-trigger-width)] min-w-[220px] overflow-hidden rounded-xl border border-border bg-surface-raised p-1 shadow-pop animate-pop-in"
        >
          <div className="relative mb-1 border-b border-border px-1 pb-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter…"
              className="h-8 w-full rounded-md bg-transparent pl-8 pr-2 text-[13px] text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </div>
          <div className="scrollbar-thin max-h-[280px] overflow-y-auto">
            {filtered.length === 0 && <p className="px-3 py-6 text-center text-[12.5px] text-fg-subtle">No matches</p>}
            {filtered.map((o) => {
              const on = values.includes(o.value)
              return (
                <div
                  key={o.value}
                  onClick={() => toggle(o.value)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] hover:bg-primary-soft/60"
                >
                  <span
                    className={cn(
                      'grid size-4 shrink-0 place-items-center rounded border transition-colors',
                      on ? 'border-primary bg-primary text-primary-fg' : 'border-border-strong bg-surface',
                    )}
                  >
                    {on && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  {o.icon && <span className="text-fg-muted [&_svg]:size-4">{o.icon}</span>}
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.meta}
                </div>
              )
            })}
          </div>
          {values.length > 0 && (
            <div className="mt-1 flex items-center justify-between border-t border-border px-2 pt-1.5 text-[11.5px] text-fg-muted">
              <span>{values.length} selected</span>
              <button onClick={() => onChange([])} className="font-medium text-primary hover:underline">
                Clear
              </button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
