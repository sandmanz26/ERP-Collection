import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, CalendarDays, Plus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { useStore } from '@/store/useStore'
import { isOpenStatus } from '@/lib/sla'
import { cn } from '@/lib/utils'
import type { Space } from '@/data/types'

const KIND: Record<Space['kind'], string> = { meeting: 'Meeting room', office: 'Workspace', common: 'Common area', pantry: 'Pantry', technical: 'Plant & technical', lobby: 'Lobby', parking: 'Parking', restroom: 'Restroom' }

export function SpacesPage() {
  const nav = useNavigate()
  const buildings = useStore((s) => s.buildings)
  const spaces = useStore((s) => s.spaces)
  const tickets = useStore((s) => s.tickets)
  const assets = useStore((s) => s.assets)
  const [bid, setBid] = React.useState(buildings[0].id)
  const [floor, setFloor] = React.useState<number | null>(null)
  const open = React.useMemo(() => tickets.filter((t) => isOpenStatus(t.status)), [tickets])

  const floors = React.useMemo(() => {
    const m = new Map<number, Space[]>()
    spaces.filter((s) => s.buildingId === bid).forEach((s) => m.set(s.floor, [...(m.get(s.floor) ?? []), s]))
    return [...m.entries()].sort((a, b) => b[0] - a[0]).map(([n, list]) => {
      const ids = new Set(list.map((s) => s.id))
      return {
        n, list,
        tickets: open.filter((t) => t.spaceId && ids.has(t.spaceId)),
        bad: assets.filter((a) => ids.has(a.spaceId) && (a.status === 'down' || a.status === 'degraded')),
        capacity: list.filter((s) => s.kind === 'office').reduce((t, s) => t + s.capacity, 0),
      }
    })
  }, [spaces, bid, open, assets])

  const selected = floors.find((f) => f.n === floor)
  const label = (n: number) => (n < 0 ? `Basement ${Math.abs(n)}` : n === 1 ? 'Ground / L1' : `Level ${n}`)
  const b = buildings.find((x) => x.id === bid)!

  return (
    <div className="space-y-5">
      <PageHeader title="Spaces" description="Every floor and room, with what is going wrong in it right now." />
      <Tabs value={bid} onChange={(v) => { setBid(v); setFloor(null) }} items={buildings.map((x) => ({ value: x.id, label: x.name }))} />
      <p className="-mt-2 text-[13px] text-fg-muted">{b.address} · {b.floors} floors</p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="overflow-hidden self-start">
          <div className="border-b border-border px-4 py-3"><p className="text-[13px] font-semibold">Stacking view</p><p className="text-[12px] text-fg-muted">Colour shows open tickets per floor</p></div>
          <ul className="divide-y divide-border">
            {floors.map((f) => {
              const heat = f.tickets.length >= 4 ? 'bg-danger' : f.tickets.length >= 2 ? 'bg-warning' : f.tickets.length === 1 ? 'bg-info' : 'bg-success/60'
              return (
                <li key={f.n}>
                  <button onClick={() => setFloor(f.n)} aria-pressed={floor === f.n} className={cn('flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-muted', floor === f.n && 'bg-primary-soft/60')}>
                    <span className={cn('h-9 w-1.5 shrink-0 rounded-full', heat)} />
                    <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium">{label(f.n)}</span><span className="block text-[12px] text-fg-muted">{f.list.length} spaces{f.capacity ? ` · ${f.capacity} desks` : ''}</span></span>
                    <span className="flex items-center gap-1.5">{f.bad.length > 0 && <Badge tone="warning" size="sm">{f.bad.length} asset{f.bad.length > 1 ? 's' : ''}</Badge>}<Badge tone={f.tickets.length ? 'primary' : 'neutral'} size="sm">{f.tickets.length} open</Badge></span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>

        <div className="min-w-0">
          {!selected ? (
            <Card><div className="flex flex-col items-center gap-3 px-6 py-20 text-center"><span className="grid size-11 place-items-center rounded-xl border border-border bg-surface-sunken text-fg-subtle"><Building2 className="size-5" /></span><p className="text-[14px] font-semibold">Pick a floor</p><p className="max-w-sm text-[12.5px] text-fg-muted">See its rooms, who is using them and what needs attention.</p></div></Card>
          ) : (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"><div><h2 className="text-[16px] font-semibold">{label(selected.n)}</h2><p className="text-[12.5px] text-fg-muted">{b.name}</p></div><Button variant="secondary" size="sm" onClick={() => nav('/new')}><Plus /> Raise ticket</Button></div>
              <ul className="divide-y divide-border">
                {selected.list.map((s) => {
                  const t = open.filter((x) => x.spaceId === s.id)
                  const a = assets.filter((x) => x.spaceId === s.id)
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                      <div className="min-w-0 flex-1 basis-[200px]"><p className="text-[13.5px] font-medium">{s.name}</p><p className="text-[12px] text-fg-muted">{KIND[s.kind]}{s.capacity ? <> · <Users className="mb-0.5 inline size-3" /> {s.capacity}</> : ''}{s.amenities.length ? ` · ${s.amenities.join(', ')}` : ''}</p></div>
                      {a.length > 0 && <span className="text-[12px] text-fg-muted">{a.length} asset{a.length > 1 ? 's' : ''}</span>}
                      {t.length > 0 ? <Link to={`/tickets?q=`} className="contents"><Badge tone="warning" dot>{t.length} open ticket{t.length > 1 ? 's' : ''}</Badge></Link> : <Badge tone="success" dot>All clear</Badge>}
                      {s.bookable && <Button variant="ghost" size="xs" onClick={() => nav('/rooms')}><CalendarDays /> Book</Button>}
                    </li>
                  )
                })}
              </ul>
              {selected.tickets.length > 0 && (
                <div className="border-t border-border bg-surface-sunken/60 px-4 py-3"><p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">Open on this floor</p><ul className="space-y-1.5">{selected.tickets.slice(0, 5).map((t) => <li key={t.id}><Link to={`/tickets/${t.id}`} className="text-[13px] hover:text-primary hover:underline"><span className="tnum mr-2 text-fg-subtle">{t.number}</span>{t.title}</Link></li>)}</ul></div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
