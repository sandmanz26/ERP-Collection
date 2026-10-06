import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, BookOpen, CalendarClock, CalendarDays, CheckCircle2, Clock, Contact, Flame, Inbox, MessageSquareReply, PlusCircle, Search, Wrench, ShieldAlert, Boxes,
} from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { KpiCard } from '@/components/shared/PageHeader'
import { PriorityBadge, SlaChip, StatusBadge, WoStatusBadge } from '@/components/shared/badges'
import { BarChart, HBars, Spark } from '@/components/charts/charts'
import { useMe, useStore } from '@/store/useStore'
import { useLookups, useSpaceLabel } from '@/hooks/useLookups'
import { useNow } from '@/hooks/useNow'
import { avgFirstResponseMs, csat, dailyFlow, DAY, slaCompliance } from '@/lib/metrics'
import { fmtAgo, fmtDuration, fmtSmart, pct } from '@/lib/format'
import { isOpenStatus, worstSla } from '@/lib/sla'
import type { Ticket } from '@/data/types'
import { cn } from '@/lib/utils'

const greeting = () => {
  const h = new Date().getHours()
  return h < 11 ? 'Good morning' : h < 15 ? 'Good afternoon' : h < 19 ? 'Good evening' : 'Hello'
}

export function DashboardPage() {
  const me = useMe()!
  return me.role === 'requester' ? <EmployeeHome /> : <StaffDashboard />
}

/* ------------------------------------------------------------------ employee */

function EmployeeHome() {
  const me = useMe()!
  const nav = useNavigate()
  const tickets = useStore((s) => s.tickets)
  const kb = useStore((s) => s.kb)
  const bookings = useStore((s) => s.bookings)
  const visitors = useStore((s) => s.visitors)
  const announcements = useStore((s) => s.announcements)
  const { space } = useLookups()
  const [q, setQ] = React.useState('')

  const mine = React.useMemo(() => tickets.filter((t) => t.requesterId === me.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [tickets, me.id])
  const open = mine.filter((t) => isOpenStatus(t.status) || t.status === 'resolved')
  const attention = mine.filter((t) => t.status === 'resolved' || (t.status === 'pending' && t.pendingReason === 'requester'))
  const today = new Date().toDateString()
  const myBookings = bookings.filter((b) => b.userId === me.id && b.status === 'confirmed' && new Date(b.end) > new Date()).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 3)
  const myVisitors = visitors.filter((v) => v.hostId === me.id && (v.status === 'expected' || v.status === 'checked_in') && new Date(v.expectedAt).toDateString() >= today).slice(0, 3)
  const suggestions = React.useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    return kb.filter((a) => a.audience === 'everyone' && (a.title.toLowerCase().includes(s) || a.summary.toLowerCase().includes(s))).slice(0, 4)
  }, [q, kb])
  const popular = [...kb].filter((a) => a.audience === 'everyone').sort((a, b) => b.views - a.views).slice(0, 5)

  const actions = [
    { to: '/new?type=incident', icon: <ShieldAlert />, title: 'Report a problem', sub: 'Something is broken or unsafe', tone: 'bg-danger-soft text-danger-soft-fg' },
    { to: '/new?type=request', icon: <PlusCircle />, title: 'Request a service', sub: 'Equipment, access, catering…', tone: 'bg-primary-soft text-primary-soft-fg' },
    { to: '/rooms', icon: <CalendarDays />, title: 'Book a room', sub: 'Find a free meeting space', tone: 'bg-info-soft text-info-soft-fg' },
    { to: '/visitors?invite=1', icon: <Contact />, title: 'Invite a visitor', sub: 'Pre-register a guest', tone: 'bg-accent-soft text-accent-soft-fg' },
  ]

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary-soft via-surface to-surface p-5 shadow-card sm:p-8">
        <div className="surface-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
        <div className="relative max-w-2xl">
          <p className="text-[13px] font-medium text-primary-soft-fg">{greeting()}, {me.name.split(' ')[0]}</p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[30px]">How can we help today?</h1>
          <form className="relative mt-5" onSubmit={(e) => { e.preventDefault(); nav(`/help?q=${encodeURIComponent(q)}`) }}>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-fg-subtle" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Describe your issue — e.g. “wifi keeps dropping” or “book boardroom”"
              aria-label="Search help articles"
              className="h-12 w-full rounded-xl border border-border-strong/80 bg-surface pl-11 pr-4 text-[14.5px] shadow-card outline-none transition-[border-color,box-shadow] placeholder:text-fg-subtle focus:border-primary focus:ring-[3px] focus:ring-primary/16"
            />
            {suggestions.length > 0 && (
              <div className="absolute inset-x-0 top-[calc(100%+6px)] z-10 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-pop animate-pop-in">
                <p className="px-3.5 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Maybe this helps</p>
                {suggestions.map((a) => (
                  <Link key={a.id} to={`/help/${a.id}`} className="flex items-start gap-3 px-3.5 py-2.5 hover:bg-bg-muted">
                    <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span><span className="block text-[13.5px] font-medium">{a.title}</span><span className="block text-[12px] text-fg-muted">{a.summary}</span></span>
                  </Link>
                ))}
                <Link to={`/new?title=${encodeURIComponent(q)}`} className="flex items-center justify-between border-t border-border bg-surface-sunken px-3.5 py-2.5 text-[13px] font-medium text-primary hover:underline">
                  Not what you need? Raise a request <ArrowRight className="size-4" />
                </Link>
              </div>
            )}
          </form>
        </div>
      </section>

      {announcements.map((a) => (
        <div key={a.id} role="status" className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px]', a.tone === 'warning' ? 'border-warning/30 bg-warning-soft text-warning-soft-fg' : 'border-info/25 bg-info-soft text-info-soft-fg')}>
          {a.tone === 'warning' ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <CalendarClock className="mt-0.5 size-4 shrink-0" />}
          <p><span className="font-semibold">{a.title}.</span> <span className="opacity-90">{a.body}</span></p>
        </div>
      ))}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className="group flex items-center gap-3.5 rounded-xl border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-pop">
            <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl [&_svg]:size-5', a.tone)}>{a.icon}</span>
            <span className="min-w-0"><span className="block text-[14.5px] font-semibold">{a.title}</span><span className="block text-[12.5px] text-fg-muted">{a.sub}</span></span>
          </Link>
        ))}
      </div>

      {attention.length > 0 && (
        <Card className="border-warning/40">
          <CardHeader icon={<MessageSquareReply />} title="Needs your attention" description="These are waiting for you — a quick reply keeps things moving." />
          <div className="divide-y divide-border">
            {attention.map((t) => (
              <Link key={t.id} to={`/tickets/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-bg-muted">
                <span className="tnum text-[12.5px] text-fg-subtle">{t.number}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{t.title}</span>
                {t.status === 'resolved' ? <Badge tone="success" dot>Confirm it is fixed</Badge> : <Badge tone="warning" dot>Reply needed</Badge>}
                <ArrowRight className="size-4 text-fg-subtle" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="My open requests" description={open.length ? `${open.length} in progress` : undefined} actions={<Button variant="ghost" size="sm" asChild><Link to="/requests">View all <ArrowRight /></Link></Button>} />
          {open.length === 0 ? (
            <EmptyState icon={<CheckCircle2 />} title="Nothing open" description="When you raise something, you can follow it here from first reply to fix." action={<Button variant="primary" onClick={() => nav('/new')}>New request</Button>} />
          ) : (
            <ul className="divide-y divide-border">
              {open.slice(0, 5).map((t) => <MyRow key={t.id} t={t} />)}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Coming up" icon={<CalendarClock />} />
            <CardBody className="space-y-3">
              {myBookings.length === 0 && myVisitors.length === 0 && <p className="text-[13px] text-fg-muted">No bookings or visitors scheduled.</p>}
              {myBookings.map((b) => (
                <Link key={b.id} to="/rooms" className="flex items-start gap-3 rounded-lg p-1.5 hover:bg-bg-muted">
                  <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-info-soft text-info-soft-fg"><CalendarDays className="size-4" /></span>
                  <span className="min-w-0"><span className="block truncate text-[13.5px] font-medium">{b.title}</span><span className="block text-[12px] text-fg-muted">{space.get(b.spaceId)?.name} · {fmtSmart(b.start)}</span></span>
                </Link>
              ))}
              {myVisitors.map((v) => (
                <Link key={v.id} to="/visitors" className="flex items-start gap-3 rounded-lg p-1.5 hover:bg-bg-muted">
                  <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-accent-soft text-accent-soft-fg"><Contact className="size-4" /></span>
                  <span className="min-w-0"><span className="block truncate text-[13.5px] font-medium">{v.name} <span className="font-normal text-fg-muted">· {v.company}</span></span><span className="block text-[12px] text-fg-muted">{v.status === 'checked_in' ? 'On site now' : `Arriving ${fmtSmart(v.expectedAt)}`}</span></span>
                </Link>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Popular help" icon={<BookOpen />} actions={<Button variant="ghost" size="sm" asChild><Link to="/help">Browse</Link></Button>} />
            <ul className="divide-y divide-border">
              {popular.map((a) => (
                <li key={a.id}><Link to={`/help/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13.5px] hover:bg-bg-muted"><span className="truncate">{a.title}</span><ArrowRight className="size-4 shrink-0 text-fg-subtle" /></Link></li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MyRow({ t }: { t: Ticket }) {
  const { user, category } = useLookups()
  const cat = category.get(t.categoryId)
  return (
    <li>
      <Link to={`/tickets/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 hover:bg-bg-muted">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2"><span className="tnum text-[12px] text-fg-subtle">{t.number}</span>{t.unreadForRequester && <span className="size-1.5 rounded-full bg-primary" aria-label="New update" />}</span>
          <span className="block truncate text-[14px] font-medium">{t.title}</span>
          <span className="block text-[12px] text-fg-muted">{cat?.name} · {t.assigneeId ? `with ${user.get(t.assigneeId)?.name}` : 'waiting to be picked up'} · updated {fmtAgo(t.updatedAt)}</span>
        </span>
        <StatusBadge status={t.status} />
      </Link>
    </li>
  )
}

/* ------------------------------------------------------------------ staff */

function StaffDashboard() {
  const me = useMe()!
  const nav = useNavigate()
  const isManager = me.role === 'manager'
  const tickets = useStore((s) => s.tickets)
  const wos = useStore((s) => s.workOrders)
  const assets = useStore((s) => s.assets)
  const contracts = useStore((s) => s.contracts)
  const pms = useStore((s) => s.pmSchedules)
  const { user, vendor } = useLookups()
  const spaceLabel = useSpaceLabel()
  const now = useNow()

  const open = React.useMemo(() => tickets.filter((t) => isOpenStatus(t.status)), [tickets])
  const mine = open.filter((t) => t.assigneeId === me.id)
  const unassigned = open.filter((t) => !t.assigneeId)
  const rank = (t: Ticket) => {
    const r = worstSla(t, now)
    const order = { breached: 0, at_risk: 1, ok: 2, paused: 3, met: 4, missed: 4, 'n/a': 5 }
    return order[r.state] * 1e12 + (r.dueAt.getTime())
  }
  const atRisk = open.filter((t) => ['breached', 'at_risk'].includes(worstSla(t, now).state))
  const p1 = open.filter((t) => t.priority === 'p1')
  const from30 = now - 30 * DAY
  const sla = slaCompliance(tickets, from30, now)
  const prevSla = slaCompliance(tickets, from30 - 30 * DAY, from30)
  const frt = avgFirstResponseMs(tickets, from30, now)
  const cs = csat(tickets, from30, now)
  const flow = dailyFlow(tickets, 14)
  const downAssets = assets.filter((a) => a.status === 'down' || a.status === 'degraded')
  const myWos = wos.filter((w) => w.assigneeId === me.id && w.status !== 'completed' && w.status !== 'cancelled').sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  const overduePm = pms.filter((p) => p.active && new Date(p.nextDueAt).getTime() < now)
  const expiring = contracts.filter((c) => new Date(c.endsAt).getTime() - now < 60 * DAY).sort((a, b) => a.endsAt.localeCompare(b.endsAt))

  const list = (isManager ? atRisk : mine).slice().sort((a, b) => rank(a) - rank(b)).slice(0, 7)

  const workload = React.useMemo(() => {
    const m = new Map<string, number>()
    open.forEach((t) => t.assigneeId && m.set(t.assigneeId, (m.get(t.assigneeId) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ label: user.get(id)?.name ?? id, value: n, sub: user.get(id)?.title }))
  }, [open, user])

  const kpis = isManager
    ? [
        { label: 'Open tickets', value: open.length, sub: `${unassigned.length} unassigned`, icon: <Inbox />, accent: 'primary' as const, to: '/tickets' },
        { label: 'SLA met · 30 days', value: pct(sla.rate), delta: `${sla.rate >= prevSla.rate ? '▲' : '▼'} ${Math.abs((sla.rate - prevSla.rate) * 100).toFixed(1)} pts`, deltaTone: sla.rate >= prevSla.rate ? 'up' as const : 'down' as const, sub: `${sla.total} resolved`, icon: <CheckCircle2 />, accent: 'success' as const, to: '/reports' },
        { label: 'Avg first response', value: fmtDuration(frt), sub: 'last 30 days', icon: <Clock />, accent: 'accent' as const, to: '/reports' },
        { label: 'CSAT · 30 days', value: cs.n ? `${cs.avg.toFixed(2)} / 5` : '—', sub: `${cs.n} ratings`, icon: <MessageSquareReply />, accent: 'purple' as const, to: '/reports' },
      ]
    : [
        { label: 'Assigned to me', value: mine.length, sub: `${mine.filter((t) => ['breached', 'at_risk'].includes(worstSla(t, now).state)).length} at risk`, icon: <Inbox />, accent: 'primary' as const, to: '/tickets?view=mine' },
        { label: 'Unassigned', value: unassigned.length, sub: 'in the shared queue', icon: <AlertTriangle />, accent: 'warning' as const, to: '/tickets?view=unassigned' },
        { label: 'My work orders', value: myWos.length, sub: `${myWos.filter((w) => new Date(w.dueAt).getTime() < now).length} overdue`, icon: <Wrench />, accent: 'accent' as const, to: '/work-orders?view=mine' },
        { label: 'Assets needing care', value: downAssets.length, sub: `${downAssets.filter((a) => a.status === 'down').length} down`, icon: <Boxes />, accent: 'danger' as const, to: '/assets' },
      ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-primary">{greeting()}, {me.name.split(' ')[0]}</p>
          <h1 className="mt-0.5 text-[24px] font-semibold tracking-[-0.025em]">{isManager ? 'Operations overview' : 'Your day'}</h1>
        </div>
        <p className="text-[12.5px] text-fg-muted">Live demo data · {new Date(now).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {p1.map((t) => (
        <Link key={t.id} to={`/tickets/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-danger-soft-fg shadow-card transition-shadow hover:shadow-pop">
          <Flame className="size-5 shrink-0" />
          <span className="min-w-0 flex-1 basis-[220px]"><span className="block text-[11px] font-bold uppercase tracking-[0.08em]">Major incident · {t.number}</span><span className="block truncate text-[14px] font-semibold">{t.title}</span></span>
          <span className="text-[12.5px]">{t.assigneeId ? `Owner: ${user.get(t.assigneeId)?.name}` : 'No owner yet'} · opened {fmtAgo(t.createdAt)}</span>
          <SlaChip ticket={t} />
        </Link>
      ))}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ to, ...k }) => <KpiCard key={k.label} {...k} onClick={() => nav(to)} />)}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title={isManager ? 'Needs attention — SLA at risk or breached' : 'My queue, most urgent first'}
            description={isManager ? `${atRisk.length} tickets across all teams` : 'Sorted by what will breach first'}
            actions={<Button variant="ghost" size="sm" asChild><Link to="/tickets">Open queue <ArrowRight /></Link></Button>}
          />
          {list.length === 0 ? (
            <EmptyState icon={<CheckCircle2 />} title={isManager ? 'Everything is inside SLA' : 'Your queue is clear'} description="Nice. Pick something from the shared queue or check on today's work orders." action={<Button variant="secondary" asChild><Link to="/tickets?view=unassigned">See unassigned</Link></Button>} />
          ) : (
            <ul className="divide-y divide-border">
              {list.map((t) => (
                <li key={t.id}>
                  <Link to={`/tickets/${t.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 hover:bg-bg-muted">
                    <PriorityBadge priority={t.priority} compact />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium"><span className="tnum mr-2 text-[12px] font-normal text-fg-subtle">{t.number}</span>{t.title}</span>
                      <span className="block truncate text-[12px] text-fg-muted">{spaceLabel(t.spaceId)}{isManager && t.assigneeId ? ` · ${user.get(t.assigneeId)?.name}` : ''}</span>
                    </span>
                    <StatusBadge status={t.status} />
                    <SlaChip ticket={t} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {isManager ? (
          <Card>
            <CardHeader title="Tickets in and out" description="Last 14 days" />
            <CardBody>
              <BarChart data={flow.map((f) => ({ label: f.label, values: { created: f.created, resolved: f.resolved } }))} series={[{ key: 'created', label: 'Created', color: 'var(--series-1)' }, { key: 'resolved', label: 'Resolved', color: 'var(--series-3)' }]} />
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Today's work orders" icon={<Wrench />} actions={<Button variant="ghost" size="sm" asChild><Link to="/work-orders">All</Link></Button>} />
            {myWos.length === 0 ? <EmptyState title="No work orders assigned" description="New jobs from tickets and PM schedules will appear here." /> : (
              <ul className="divide-y divide-border">
                {myWos.slice(0, 6).map((w) => (
                  <li key={w.id}>
                    <Link to={`/work-orders/${w.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-muted">
                      <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{w.title}</span><span className={cn('block text-[12px]', new Date(w.dueAt).getTime() < now ? 'font-medium text-danger' : 'text-fg-muted')}>Due {fmtSmart(w.dueAt)}</span></span>
                      <WoStatusBadge status={w.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {isManager ? (
          <Card>
            <CardHeader title="Open tickets per person" description="Who is carrying the load" />
            <CardBody>{workload.length ? <HBars rows={workload} /> : <p className="text-[13px] text-fg-muted">No assigned tickets.</p>}</CardBody>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Shared queue" description="Unassigned in your teams" actions={<Badge tone="primary">{unassigned.length}</Badge>} />
            <ul className="divide-y divide-border">
              {unassigned.sort((a, b) => rank(a) - rank(b)).slice(0, 5).map((t) => (
                <li key={t.id}><Link to={`/tickets/${t.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-muted"><PriorityBadge priority={t.priority} compact /><span className="min-w-0 flex-1 truncate text-[13.5px]">{t.title}</span><span className="text-[12px] text-fg-subtle">{fmtAgo(t.createdAt)}</span></Link></li>
              ))}
              {unassigned.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-fg-muted">Nothing waiting.</li>}
            </ul>
          </Card>
        )}

        <Card>
          <CardHeader title="Building health" icon={<Boxes />} actions={<Button variant="ghost" size="sm" asChild><Link to="/assets">Assets</Link></Button>} />
          <ul className="divide-y divide-border">
            {downAssets.sort((a, b) => (a.status === 'down' ? -1 : 1) - (b.status === 'down' ? -1 : 1)).slice(0, 6).map((a) => (
              <li key={a.id}>
                <Link to={`/assets/${a.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-muted">
                  <span className={cn('size-2 rounded-full', a.status === 'down' ? 'bg-danger' : 'bg-warning')} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{a.name}</span><span className="block truncate text-[12px] text-fg-muted">{spaceLabel(a.spaceId)}</span></span>
                  <Badge tone={a.status === 'down' ? 'danger' : 'warning'}>{a.status === 'down' ? 'Down' : 'Degraded'}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title={isManager ? 'Contracts & compliance' : 'Preventive maintenance'} icon={<CalendarClock />} actions={<Button variant="ghost" size="sm" asChild><Link to={isManager ? '/vendors' : '/maintenance'}>Open</Link></Button>} />
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-surface-sunken px-3 py-2.5">
              <div><p className="text-[12px] text-fg-muted">PM overdue</p><p className={cn('tnum text-[20px] font-semibold', overduePm.length ? 'text-danger' : 'text-success')}>{overduePm.length}</p></div>
              <Spark values={[2, 3, 1, 2, 4, 3, 2, 3, overduePm.length + 1, overduePm.length]} color={overduePm.length ? 'var(--series-2)' : 'var(--series-3)'} />
            </div>
            {isManager && (
              <ul className="space-y-2.5">
                {expiring.slice(0, 3).map((c) => {
                  const days = Math.round((new Date(c.endsAt).getTime() - now) / DAY)
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="min-w-0"><span className="block truncate font-medium">{vendor.get(c.vendorId)?.name}</span><span className="block truncate text-[12px] text-fg-muted">{c.title}</span></span>
                      <Badge tone={days < 0 ? 'danger' : days < 30 ? 'warning' : 'neutral'}>{days < 0 ? `Expired ${-days}d ago` : `${days}d left`}</Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

