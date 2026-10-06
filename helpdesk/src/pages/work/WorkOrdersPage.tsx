import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarClock, Columns3, List, Plus, Search, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Segmented } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { EmptyState, Progress } from '@/components/ui/misc'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriorityBadge, UserChip, WoStatusBadge, WoTypeBadge } from '@/components/shared/badges'
import { useLookups } from '@/hooks/useLookups'
import { useMe, useStore } from '@/store/useStore'
import { fmtSmart } from '@/lib/format'
import { WO_STATUS, WO_TYPE } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { WorkOrder, WorkOrderStatus, WorkOrderType } from '@/data/types'

type View = 'mine' | 'open' | 'overdue' | 'done' | 'all'

export const woProgress = (w: WorkOrder) => (w.checklist.length ? Math.round((w.checklist.filter((c) => c.done).length / w.checklist.length) * 100) : 0)
export const woOverdue = (w: WorkOrder, now = Date.now()) => w.status !== 'completed' && w.status !== 'cancelled' && new Date(w.dueAt).getTime() < now

export function WorkOrdersPage() {
  const me = useMe()!
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const wos = useStore((s) => s.workOrders)
  const users = useStore((s) => s.users)
  const { asset } = useLookups()
  const [layout, setLayout] = React.useState<'list' | 'board'>('list')
  const [q, setQ] = React.useState('')
  const [type, setType] = React.useState<WorkOrderType>()
  const [who, setWho] = React.useState<string>()
  const view = (sp.get('view') as View) || 'open'
  const now = Date.now()

  const counts = {
    mine: wos.filter((w) => w.assigneeId === me.id && w.status !== 'completed' && w.status !== 'cancelled').length,
    open: wos.filter((w) => w.status !== 'completed' && w.status !== 'cancelled').length,
    overdue: wos.filter((w) => woOverdue(w, now)).length,
  }
  const rows = React.useMemo(() => {
    let r = wos
    if (view === 'mine') r = r.filter((w) => w.assigneeId === me.id && w.status !== 'completed' && w.status !== 'cancelled')
    if (view === 'open') r = r.filter((w) => w.status !== 'completed' && w.status !== 'cancelled')
    if (view === 'overdue') r = r.filter((w) => woOverdue(w, now))
    if (view === 'done') r = r.filter((w) => w.status === 'completed' || w.status === 'cancelled')
    if (type) r = r.filter((w) => w.type === type)
    if (who) r = r.filter((w) => w.assigneeId === who)
    const s = q.trim().toLowerCase()
    if (s) r = r.filter((w) => `${w.number} ${w.title} ${asset.get(w.assetId ?? '')?.name ?? ''}`.toLowerCase().includes(s))
    return [...r].sort((a, b) => (view === 'done' ? (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt) : a.dueAt.localeCompare(b.dueAt)))
  }, [wos, view, type, who, q, me.id, asset, now])

  const cols: WorkOrderStatus[] = ['open', 'scheduled', 'in_progress', 'on_hold', 'completed']

  return (
    <div className="space-y-4">
      <PageHeader title="Work orders" description="Corrective jobs from tickets, scheduled preventive maintenance and inspection rounds." actions={<Button variant="primary" onClick={() => nav('/work-orders/new')}><Plus /> New work order</Button>} className="pb-1" />
      <Tabs value={view} onChange={(v) => { const n = new URLSearchParams(sp); n.set('view', v); setSp(n, { replace: true }) }} items={[{ value: 'mine', label: 'Mine', count: counts.mine }, { value: 'open', label: 'All open', count: counts.open }, { value: 'overdue', label: 'Overdue', count: counts.overdue }, { value: 'done', label: 'Completed' }, { value: 'all', label: 'Everything' }]} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64"><Input leading={<Search className="size-4 text-fg-subtle" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search work orders or assets" aria-label="Search work orders" /></div>
        <Select className="w-[150px]" value={type} onChange={setType} clearable onClear={() => setType(undefined)} placeholder="Any type" options={(Object.keys(WO_TYPE) as WorkOrderType[]).map((t) => ({ value: t, label: WO_TYPE[t].label }))} />
        <Select className="w-[170px]" value={who} onChange={setWho} clearable onClear={() => setWho(undefined)} placeholder="Any assignee" searchable options={users.filter((u) => u.role !== 'requester').map((u) => ({ value: u.id, label: u.name }))} />
        <div className="ml-auto"><Segmented size="sm" value={layout} onChange={setLayout} options={[{ value: 'list', label: 'List', icon: <List className="size-3.5" /> }, { value: 'board', label: 'Board', icon: <Columns3 className="size-3.5" /> }]} /></div>
      </div>

      {rows.length === 0 ? (
        <Card><EmptyState icon={<Wrench />} title="No work orders here" description="Create one from a ticket, or generate a preventive job from the maintenance schedule." action={<Button variant="secondary" onClick={() => nav('/maintenance')}><CalendarClock /> Open schedule</Button>} /></Card>
      ) : layout === 'list' ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {rows.map((w) => {
              const over = woOverdue(w, now)
              return (
                <li key={w.id}>
                  <Link to={`/work-orders/${w.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-bg-muted">
                    <PriorityBadge priority={w.priority} compact />
                    <span className="min-w-0 flex-1 basis-[240px]">
                      <span className="block truncate text-[13.5px] font-medium"><span className="tnum mr-2 text-[12px] font-normal text-fg-subtle">{w.number}</span>{w.title}</span>
                      <span className="block truncate text-[12px] text-fg-muted">{asset.get(w.assetId ?? '')?.name ?? 'No asset'}</span>
                    </span>
                    <WoTypeBadge type={w.type} />
                    <div className="hidden w-24 sm:block"><Progress value={woProgress(w)} size="sm" tone={w.status === 'completed' ? 'success' : 'primary'} /><p className="mt-1 text-[11px] text-fg-subtle">{woProgress(w)}% done</p></div>
                    <WoStatusBadge status={w.status} />
                    <span className={cn('w-28 text-[12.5px]', over ? 'font-semibold text-danger' : 'text-fg-muted')}>{w.status === 'completed' ? `Done ${fmtSmart(w.completedAt)}` : `${over ? 'Overdue · ' : 'Due '}${fmtSmart(w.dueAt)}`}</span>
                    <span className="w-36"><UserChip id={w.assigneeId} size="sm" /></span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      ) : (
        <div className="scrollbar-thin -mx-3 flex gap-3 overflow-x-auto px-3 pb-3 sm:mx-0 sm:px-0">
          {cols.map((c) => {
            const list = rows.filter((w) => w.status === c)
            return (
              <section key={c} className="w-[290px] shrink-0 rounded-xl bg-surface-sunken p-2.5" aria-label={WO_STATUS[c].label}>
                <header className="mb-2 flex items-center justify-between px-1.5"><span className="text-[12.5px] font-semibold">{WO_STATUS[c].label}</span><Badge size="sm">{list.length}</Badge></header>
                <div className="space-y-2">
                  {list.slice(0, 12).map((w) => (
                    <Link key={w.id} to={`/work-orders/${w.id}`} className="block rounded-lg border border-border bg-surface p-3 shadow-card transition-shadow hover:shadow-pop">
                      <div className="mb-1.5 flex items-center justify-between"><span className="tnum text-[11.5px] text-fg-subtle">{w.number}</span><WoTypeBadge type={w.type} /></div>
                      <p className="text-[13px] font-medium leading-snug">{w.title}</p>
                      <Progress value={woProgress(w)} size="sm" className="mt-2.5" tone={w.status === 'completed' ? 'success' : 'primary'} />
                      <div className="mt-2.5 flex items-center justify-between"><UserChip id={w.assigneeId} size="sm" /><span className={cn('text-[11.5px]', woOverdue(w, now) ? 'font-semibold text-danger' : 'text-fg-subtle')}>{fmtSmart(w.dueAt).replace(/ \d\d:\d\d$/, '')}</span></div>
                    </Link>
                  ))}
                  {list.length === 0 && <p className="px-2 py-6 text-center text-[12px] text-fg-subtle">Empty</p>}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
