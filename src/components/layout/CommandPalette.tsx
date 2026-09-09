import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import * as D from '@radix-ui/react-dialog'
import { ArrowRight, Boxes, Building2, CornerDownLeft, Factory, Search, Ship, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMfg } from '@/store/useMfg'
import { NAV } from './nav'
import { Kbd } from '@/components/ui/misc'

interface Cmd {
  id: string
  label: string
  hint?: string
  group: string
  to: string
  icon: React.ReactNode
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const nav = useNavigate()
  const [q, setQ] = React.useState('')
  const [active, setActive] = React.useState(0)
  const { salesOrders, customers, items, workOrders, shipments, products } = useMfg()

  const commands = React.useMemo<Cmd[]>(() => {
    const list: Cmd[] = []
    NAV.forEach((g) =>
      g.items.forEach((it) =>
        list.push({ id: `nav_${it.to}`, label: it.label, hint: it.description, group: 'Navigate', to: it.to, icon: <it.icon /> }),
      ),
    )
    salesOrders.forEach((o) => {
      const customer = customers.find((c) => c.id === o.customerId)
      list.push({ id: o.id, label: `${o.code} · ${customer?.name ?? ''}`, hint: `${o.lines.length} lines · ${o.status.replace(/_/g, ' ').toLowerCase()}`, group: 'Sales orders', to: `/orders/${o.id}`, icon: <ShoppingCart /> })
    })
    workOrders.forEach((w) => {
      const product = products.find((p) => p.id === w.productId)
      list.push({ id: w.id, label: `${w.code} · ${product?.name ?? ''}`, hint: `${w.quantity} × ${w.status.replace(/_/g, ' ').toLowerCase()}`, group: 'Work orders', to: `/work-orders/${w.id}`, icon: <Factory /> })
    })
    shipments.forEach((sh) =>
      list.push({ id: sh.id, label: `${sh.code}${sh.containerNo ? ` · ${sh.containerNo}` : ''}`, hint: `${sh.status.replace(/_/g, ' ').toLowerCase()} · ${sh.vessel ?? 'not booked'}`, group: 'Import shipments', to: `/imports/${sh.id}`, icon: <Ship /> }),
    )
    customers.forEach((c) =>
      list.push({ id: c.id, label: `${c.code} · ${c.name}`, hint: c.city, group: 'Customers', to: `/customers`, icon: <Building2 /> }),
    )
    items.forEach((i) =>
      list.push({ id: i.id, label: `${i.code} · ${i.name}`, hint: i.imported ? `imported · HS ${i.hsCode}` : 'local', group: 'Items', to: `/items`, icon: <Boxes /> }),
    )
    return list
  }, [salesOrders, customers, items, workOrders, shipments, products])

  const filtered = React.useMemo(() => {
    if (!q.trim()) return commands.filter((c) => c.group === 'Navigate').concat(commands.filter((c) => c.group === 'Sales orders').slice(0, 5))
    const s = q.toLowerCase()
    return commands.filter((c) => c.label.toLowerCase().includes(s) || c.hint?.toLowerCase().includes(s)).slice(0, 40)
  }, [q, commands])

  React.useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
    }
  }, [open])
  React.useEffect(() => setActive(0), [q])

  const go = (c: Cmd) => {
    nav(c.to)
    onOpenChange(false)
  }

  const groups = React.useMemo(() => {
    const m = new Map<string, Cmd[]>()
    filtered.forEach((c) => {
      if (!m.has(c.group)) m.set(c.group, [])
      m.get(c.group)!.push(c)
    })
    return Array.from(m.entries())
  }, [filtered])

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[80] bg-overlay/50 backdrop-blur-[3px] animate-fade-in" />
        <D.Content
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(filtered.length - 1, a + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(0, a - 1))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const c = filtered[active]
              if (c) go(c)
            }
          }}
          className="fixed left-1/2 top-[14vh] z-[81] w-[94vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-pop animate-slide-up"
        >
          <D.Title className="sr-only">Command palette</D.Title>
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-fg-subtle" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search jobs, containers, customers, packages…"
              className="h-12 flex-1 bg-transparent text-[14px] text-fg placeholder:text-fg-subtle focus:outline-none"
            />
            <Kbd>Esc</Kbd>
          </div>
          <div className="scrollbar-thin max-h-[52vh] overflow-y-auto p-1.5">
            {filtered.length === 0 && (
              <p className="px-3 py-10 text-center text-[13px] text-fg-subtle">Nothing matches “{q}”.</p>
            )}
            {groups.map(([group, items]) => (
              <div key={group}>
                <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{group}</p>
                {items.map((c) => {
                  const idx = filtered.indexOf(c)
                  return (
                    <button
                      key={c.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(c)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                        idx === active && 'bg-primary-soft/70',
                      )}
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-bg-muted text-fg-muted [&_svg]:size-4">
                        {c.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-fg">{c.label}</span>
                        {c.hint && <span className="block truncate text-[11.5px] text-fg-muted">{c.hint}</span>}
                      </span>
                      {idx === active ? (
                        <CornerDownLeft className="size-3.5 shrink-0 text-primary" />
                      ) : (
                        <ArrowRight className="size-3.5 shrink-0 text-fg-subtle opacity-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 border-t border-border bg-surface-sunken px-4 py-2 text-[11.5px] text-fg-muted">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> open
            </span>
            <span className="ml-auto flex items-center gap-1">
              <Boxes className="size-3" /> {commands.length} records indexed
            </span>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
