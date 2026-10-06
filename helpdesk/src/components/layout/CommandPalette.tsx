import * as React from 'react'
import * as D from '@radix-ui/react-dialog'
import { useNavigate } from 'react-router-dom'
import { Boxes, CornerDownLeft, Inbox, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Kbd } from '@/components/ui/misc'
import { navFor } from './nav'
import { useMe, useStore } from '@/store/useStore'

interface Item { key: string; label: string; hint?: string; group: string; to: string; icon: React.ReactNode }

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const me = useMe()!
  const nav = useNavigate()
  const tickets = useStore((s) => s.tickets)
  const assets = useStore((s) => s.assets)
    const [q, setQ] = React.useState('')
  const [active, setActive] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => { if (open) { setQ(''); setActive(0) } }, [open])

  const items = React.useMemo<Item[]>(() => {
    const query = q.trim().toLowerCase()
    const pages: Item[] = navFor(me.role).flatMap((g) =>
      g.items.map((i) => ({ key: i.to, label: i.label, group: 'Buka halaman', to: i.to, icon: <i.icon className="size-4" />, hint: i.keywords })),
    )
    const match = (s: string) => s.toLowerCase().includes(query)
    const out: Item[] = pages.filter((p) => !query || match(p.label) || (p.hint && match(p.hint)))
    if (query) {
      const mine = me.role === 'requester' ? tickets.filter((t) => t.requesterId === me.id) : tickets
      mine.filter((t) => match(t.number) || match(t.title)).slice(0, 6).forEach((t) =>
        out.push({ key: t.id, label: `${t.number} · ${t.title}`, group: 'Tiket', to: `/tiket/${t.id}`, icon: <Inbox className="size-4" /> }),
      )
      if (me.role !== 'requester')
        assets.filter((a) => match(a.name) || match(a.tag)).slice(0, 5).forEach((a) =>
          out.push({ key: a.id, label: `${a.tag} · ${a.name}`, group: 'Aset', to: `/aset/${a.id}`, icon: <Boxes className="size-4" /> }),
        )
    }
    return out
  }, [q, me, tickets, assets])

  React.useEffect(() => setActive(0), [q])
  React.useEffect(() => { listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }) }, [active])

  const go = (it?: Item) => { if (!it) return; onOpenChange(false); nav(it.to) }

  let lastGroup = ''
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[80] bg-overlay/55 backdrop-blur-[2px] animate-fade-in" />
        <D.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12vh] z-[81] w-[min(640px,94vw)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-pop animate-pop-in"
        >
          <D.Title className="sr-only">Cari</D.Title>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 text-fg-subtle" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)) }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
                if (e.key === 'Enter') go(items[active])
              }}
              placeholder={me.role === 'requester' ? 'Cari laporan Anda atau halaman…' : 'Cari tiket, aset, halaman…'}
              className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-subtle"
            />
            <Kbd>esc</Kbd>
          </div>
          <div ref={listRef} className="scrollbar-thin max-h-[52vh] overflow-y-auto p-2" role="listbox">
            {items.length === 0 && <p className="px-3 py-10 text-center text-[13px] text-fg-muted">Tidak ada hasil untuk “{q}”.</p>}
            {items.map((it, i) => {
              const header = it.group !== lastGroup
              lastGroup = it.group
              return (
                <React.Fragment key={it.group + it.key}>
                  {header && <p className="px-2.5 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">{it.group}</p>}
                  <button
                    data-i={i}
                    role="option"
                    aria-selected={i === active}
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(it)}
                    className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px]', i === active ? 'bg-primary-soft text-primary-soft-fg' : 'text-fg')}
                  >
                    <span className="text-fg-subtle">{it.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{it.label}</span>
                    {i === active && <CornerDownLeft className="size-3.5 opacity-60" />}
                  </button>
                </React.Fragment>
              )
            })}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
