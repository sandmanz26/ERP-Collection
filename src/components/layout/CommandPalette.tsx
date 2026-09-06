import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import * as D from '@radix-ui/react-dialog'
import {
  ArrowRight, Boxes, Building2, CornerDownLeft, Handshake, Ruler, Search, ShoppingCart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useErp } from '@/store/useErp'
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
  const { projects, buyers, suppliers, items, orders } = useErp()

  const commands = React.useMemo<Cmd[]>(() => {
    const list: Cmd[] = []
    NAV.forEach((g) =>
      g.items.forEach((it) =>
        list.push({ id: `nav_${it.to}`, label: it.label, hint: it.description, group: 'Navigate', to: it.to, icon: <it.icon /> }),
      ),
    )
    projects.forEach((p) =>
      list.push({
        id: p.id,
        label: `${p.code} · ${p.name}`,
        hint: `${p.buyerName} → ${p.destinationPort}`,
        group: 'Orders',
        to: `/projects/${p.id}`,
        icon: <Ruler />,
      }),
    )
    buyers.forEach((b) =>
      list.push({ id: b.id, label: `${b.code} · ${b.tradingName}`, hint: b.countryName, group: 'Buyers', to: `/buyers/${b.id}`, icon: <Building2 /> }),
    )
    suppliers.forEach((s) =>
      list.push({ id: s.id, label: `${s.code} · ${s.name}`, hint: s.city, group: 'Suppliers', to: '/suppliers', icon: <Handshake /> }),
    )
    orders.forEach((o) =>
      list.push({ id: o.id, label: `${o.code} · ${o.supplierName}`, hint: o.status.toLowerCase().replace('_', ' '), group: 'Purchase orders', to: `/purchase-orders/${o.id}`, icon: <ShoppingCart /> }),
    )
    items.forEach((i) =>
      list.push({ id: i.id, label: `${i.sku} · ${i.name}`, hint: i.category.toLowerCase(), group: 'Items', to: '/items', icon: <Boxes /> }),
    )
    return list
  }, [projects, buyers, suppliers, items, orders])

  const filtered = React.useMemo(() => {
    if (!q.trim()) return commands.filter((c) => c.group === 'Navigate')
    const needle = q.toLowerCase()
    return commands.filter((c) => `${c.label} ${c.hint ?? ''}`.toLowerCase().includes(needle)).slice(0, 40)
  }, [commands, q])

  React.useEffect(() => setActive(0), [q])
  React.useEffect(() => {
    if (!open) setQ('')
  }, [open])

  const go = (cmd?: Cmd) => {
    if (!cmd) return
    nav(cmd.to)
    onOpenChange(false)
  }

  const groups = React.useMemo(() => {
    const map = new Map<string, Cmd[]>()
    filtered.forEach((c) => map.set(c.group, [...(map.get(c.group) ?? []), c]))
    return Array.from(map.entries())
  }, [filtered])

  let index = -1

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-overlay/50 backdrop-blur-[2px]" />
        <D.Content
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, filtered.length - 1))
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              go(filtered[active])
            }
          }}
          className="fixed left-1/2 top-[14vh] z-50 w-[min(94vw,620px)] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-pop animate-pop-in"
        >
          <D.Title className="sr-only">Search</D.Title>
          <D.Description className="sr-only">Jump to any record or screen</D.Description>
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-fg-subtle" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search orders, buyers, suppliers, purchase orders, items…"
              className="h-12 min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-subtle"
            />
            <Kbd>esc</Kbd>
          </div>

          <div className="scrollbar-thin max-h-[52vh] overflow-y-auto p-2">
            {filtered.length === 0 && (
              <p className="px-3 py-8 text-center text-[13px] text-fg-muted">Nothing matches “{q}”.</p>
            )}
            {groups.map(([group, rows]) => (
              <div key={group} className="mb-2 last:mb-0">
                <p className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{group}</p>
                {rows.map((c) => {
                  index += 1
                  const isActive = index === active
                  return (
                    <button
                      key={c.id}
                      onMouseEnter={() => setActive(commands.indexOf(c) >= 0 ? filtered.indexOf(c) : 0)}
                      onClick={() => go(c)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                        isActive ? 'bg-primary-soft text-primary-soft-fg' : 'text-fg hover:bg-neutral-soft',
                      )}
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-sunken [&_svg]:size-[15px]">
                        {c.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{c.label}</span>
                        {c.hint && <span className="block truncate text-[11.5px] text-fg-muted">{c.hint}</span>}
                      </span>
                      {isActive ? <CornerDownLeft className="size-3.5 shrink-0 opacity-60" /> : <ArrowRight className="size-3.5 shrink-0 opacity-0" />}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
