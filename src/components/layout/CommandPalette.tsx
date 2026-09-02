import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import * as D from '@radix-ui/react-dialog'
import { Building2, ClipboardList, CornerDownLeft, Package, Search, Users, Warehouse } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Kbd } from '@/components/ui/misc'
import { useErp } from '@/store/useErp'
import { NAV } from './nav'

interface Hit {
  id: string
  label: string
  sub: string
  group: string
  to: string
  icon: React.ReactNode
}

/** ⌘K — one box over every register, because nobody remembers which menu a client lives under. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const nav = useNavigate()
  const { clients, buildings, projects, items, warehouses } = useErp()
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)

  React.useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  const hits = React.useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase()
    const pages: Hit[] = NAV.flatMap((g) =>
      g.items.map((i) => ({
        id: `page-${i.to}`, label: i.label, sub: i.description, group: 'Go to', to: i.to,
        icon: <i.icon className="size-4" />,
      })),
    )
    if (!q) return pages
    const match = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' ').toLowerCase().includes(q)
    return [
      ...pages.filter((p) => match(p.label, p.sub)),
      ...clients.filter((c) => match(c.code, c.legalName, c.brandName, c.city)).map((c) => ({
        id: c.id, label: c.brandName ?? c.legalName, sub: `${c.code} · ${c.city}`, group: 'Clients',
        to: `/clients/${c.id}`, icon: <Users className="size-4" />,
      })),
      ...projects.filter((p) => match(p.code, p.name, p.contractNo)).map((p) => ({
        id: p.id, label: p.name, sub: `${p.code} · ${p.contractNo}`, group: 'Projects',
        to: `/projects/${p.id}`, icon: <ClipboardList className="size-4" />,
      })),
      ...buildings.filter((b) => match(b.code, b.name, b.city)).map((b) => ({
        id: b.id, label: b.name, sub: `${b.code} · ${b.city}`, group: 'Buildings',
        to: '/buildings', icon: <Building2 className="size-4" />,
      })),
      ...items.filter((i) => match(i.sku, i.name, i.brand)).map((i) => ({
        id: i.id, label: i.name, sub: `${i.sku} · ${i.category.replace(/_/g, ' ').toLowerCase()}`, group: 'Item master',
        to: '/inventory/items', icon: <Package className="size-4" />,
      })),
      ...warehouses.filter((w) => match(w.code, w.name, w.city)).map((w) => ({
        id: w.id, label: w.name, sub: `${w.code} · ${w.city}`, group: 'Warehouses',
        to: '/inventory/warehouses', icon: <Warehouse className="size-4" />,
      })),
    ].slice(0, 40)
  }, [query, clients, projects, buildings, items, warehouses])

  const go = (hit: Hit) => {
    onOpenChange(false)
    nav(hit.to)
  }

  const grouped = React.useMemo(() => {
    const map = new Map<string, Hit[]>()
    hits.forEach((h) => {
      if (!map.has(h.group)) map.set(h.group, [])
      map.get(h.group)!.push(h)
    })
    return Array.from(map.entries())
  }, [hits])

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[80] bg-overlay/50 backdrop-blur-[2px] animate-fade-in" />
        <D.Content
          aria-label="Search the suite"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(hits.length - 1, a + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(0, a - 1))
            } else if (e.key === 'Enter' && hits[active]) {
              e.preventDefault()
              go(hits[active])
            }
          }}
          className="fixed left-1/2 top-[14vh] z-[81] w-[94vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-pop animate-slide-up"
        >
          <D.Title className="sr-only">Search</D.Title>
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-fg-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              placeholder="Search clients, projects, buildings, items…"
              className="h-12 flex-1 bg-transparent text-[14px] text-fg placeholder:text-fg-subtle focus:outline-none"
            />
            <Kbd>Esc</Kbd>
          </div>
          <div className="scrollbar-thin max-h-[54vh] overflow-y-auto p-1.5">
            {hits.length === 0 && (
              <p className="px-3 py-10 text-center text-[13px] text-fg-subtle">Nothing matches “{query}”.</p>
            )}
            {grouped.map(([group, rows]) => (
              <div key={group} className="mb-1">
                <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{group}</p>
                {rows.map((hit) => {
                  const idx = hits.indexOf(hit)
                  return (
                    <button
                      key={`${group}-${hit.id}`}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(hit)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                        idx === active ? 'bg-primary-soft' : 'hover:bg-bg-muted',
                      )}
                    >
                      <span className="text-fg-muted">{hit.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-fg">{hit.label}</span>
                        <span className="block truncate text-[11.5px] text-fg-muted">{hit.sub}</span>
                      </span>
                      {idx === active && <CornerDownLeft className="size-3.5 shrink-0 text-primary" />}
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
