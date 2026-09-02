import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, Boxes, CalendarClock, ClipboardList, HardHat, TrendingUp, TriangleAlert,
  Users,
} from 'lucide-react'
import { useErp } from '@/store/useErp'
import { useCurrentUser } from '@/store/useAuth'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { FulfilmentBar } from '@/components/shared/FulfilmentBar'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { serviceLabel } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import {
  availableQty, buildAlerts, daysUntil, deployedHeadcount, expiryStatus, fulfilment, isLiveProject,
  isStaffedProject, monthlyMargin, monthlyValue, requiredHeadcount, stockStatus, stockValue,
} from '@/lib/domain'

export function DashboardPage() {
  const nav = useNavigate()
  const user = useCurrentUser()
  const store = useErp()
  const { projects, clients, buildings, positions, items, stock, warehouses, activity } = store

  const live = projects.filter(isLiveProject)
  /* Fulfilment is measured on contracts that owe posts today; a suspended one owes none. */
  const staffed = projects.filter(isStaffedProject)
  const required = staffed.reduce((a, p) => a + requiredHeadcount(p), 0)
  const deployed = staffed.reduce((a, p) => a + deployedHeadcount(p), 0)
  const openPosts = required - deployed
  const monthly = live.reduce((a, p) => a + monthlyValue(p), 0)
  const margin = live.reduce((a, p) => a + monthlyMargin(p).margin, 0)

  const alerts = React.useMemo(
    () => buildAlerts({ projects, clients, buildings, positions, items, stock, warehouses }),
    [projects, clients, buildings, positions, items, stock, warehouses],
  )

  /* Fulfilment per service line — one hue, magnitude only, labelled directly. */
  const byService = React.useMemo(() => {
    const map = new Map<string, { required: number; deployed: number }>()
    staffed.forEach((project) =>
      project.requirements.forEach((line) => {
        const position = positions.find((p) => p.id === line.positionId)
        if (!position) return
        const bucket = map.get(position.serviceType) ?? { required: 0, deployed: 0 }
        bucket.required += line.headcount
        bucket.deployed += Math.min(line.deployed, line.headcount)
        map.set(position.serviceType, bucket)
      }),
    )
    return Array.from(map.entries())
      .map(([serviceType, v]) => ({ serviceType, ...v }))
      .sort((a, b) => b.required - a.required)
  }, [staffed, positions])

  const endingSoon = live
    .filter((p) => daysUntil(p.periodEnd) <= 90)
    .sort((a, b) => daysUntil(a.periodEnd) - daysUntil(b.periodEnd))
    .slice(0, 6)

  const stockWatch = stock
    .map((s) => ({ line: s, item: items.find((i) => i.id === s.itemId) }))
    .filter(({ line, item }) => ['LOW', 'OUT_OF_STOCK'].includes(stockStatus(line, item)) || ['EXPIRED', 'EXPIRING'].includes(expiryStatus(line)))
    .sort((a, b) => availableQty(a.line) - availableQty(b.line))
    .slice(0, 6)

  const worstProjects = staffed
    .filter((p) => fulfilment(p).gap > 0)
    .sort((a, b) => fulfilment(a).pct - fulfilment(b).pct)
    .slice(0, 5)

  return (
    <>
      <PageHeader
        title={`Selamat datang, ${user?.fullName.split(' ')[0] ?? 'rekan'}`}
        description="Where the company stands this morning: how many contracted posts are actually filled, which contracts are running out, and what the warehouse cannot cover."
        meta={
          <>
            <span className="text-[12.5px] text-fg-muted">
              {live.length} running contracts · {clients.filter((c) => c.status === 'ACTIVE').length} active clients ·{' '}
              {buildings.filter((b) => b.status === 'ACTIVE').length} buildings
            </span>
            <span className="text-[12.5px] text-fg-subtle">{fmtDate(new Date().toISOString(), 'long')}</span>
          </>
        }
        actions={
          <Button variant="secondary" onClick={() => nav('/deployments')}>
            <Users /> Open deployments
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Fulfilment"
          value={required ? `${Math.round((deployed / required) * 100)}%` : '—'}
          icon={<HardHat />}
          accent={openPosts === 0 ? 'success' : openPosts > 20 ? 'danger' : 'warning'}
          sub={`${deployed.toLocaleString('en-US')} of ${required.toLocaleString('en-US')} contracted posts filled`}
          onClick={() => nav('/deployments')}
        />
        <KpiCard
          label="Open posts"
          value={openPosts}
          icon={<AlertTriangle />}
          accent={openPosts ? 'danger' : 'success'}
          sub={`across ${worstProjects.length} understaffed contracts`}
          onClick={() => nav('/deployments')}
        />
        <KpiCard
          label="Monthly value"
          value={fmtCurrency(monthly, 'IDR', { compact: true })}
          icon={<TrendingUp />}
          accent="primary"
          sub={`${fmtCurrency(margin, 'IDR', { compact: true })} margin · ${monthly ? ((margin / monthly) * 100).toFixed(1) : '0'}%`}
          onClick={() => nav('/projects')}
        />
        <KpiCard
          label="Stock value"
          value={fmtCurrency(stock.reduce((a, s) => a + stockValue(s), 0), 'IDR', { compact: true })}
          icon={<Boxes />}
          accent="accent"
          sub={`${items.filter((i) => i.status === 'ACTIVE').length} active items in ${warehouses.filter((w) => w.status === 'ACTIVE').length} warehouses`}
          onClick={() => nav('/inventory/stock')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ---------------- attention ---------------- */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Needs attention"
            icon={<TriangleAlert />}
            description="Ranked by what costs the most if it is left alone."
            actions={
              <Badge tone={alerts.some((a) => a.severity === 'CRITICAL') ? 'danger' : 'neutral'} size="md">
                {alerts.length} open
              </Badge>
            }
          />
          <CardBody className="space-y-2 p-3">
            {alerts.length === 0 && (
              <EmptyState icon={<HardHat />} title="Nothing needs attention" description="Every post is filled and every stock level is healthy." />
            )}
            {alerts.slice(0, 8).map((a) => (
              <Link
                key={a.id}
                to={a.link}
                className="flex gap-3 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-bg-muted/70"
              >
                <span
                  className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md ${
                    a.severity === 'CRITICAL' ? 'bg-danger-soft text-danger-soft-fg' : a.severity === 'HIGH' ? 'bg-warning-soft text-warning-soft-fg' : 'bg-neutral-soft text-neutral-soft-fg'
                  }`}
                >
                  <TriangleAlert className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-fg">{a.title}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-fg-muted">{a.detail}</span>
                </span>
                <ArrowRight className="mt-1 size-3.5 shrink-0 text-fg-subtle" />
              </Link>
            ))}
            {alerts.length > 8 && (
              <p className="px-2.5 pt-1 text-[12px] text-fg-subtle">{alerts.length - 8} more, listed in the bell menu.</p>
            )}
          </CardBody>
        </Card>

        {/* ---------------- fulfilment by service line ---------------- */}
        <Card>
          <CardHeader title="Fulfilment by service line" icon={<Users />} description="Contracted headcount, and how much of it is standing on site." />
          <CardBody className="space-y-3.5">
            {byService.map((s) => {
              const pct = s.required ? Math.round((s.deployed / s.required) * 100) : 0
              return (
                <div key={s.serviceType}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12.5px] font-medium text-fg">{serviceLabel(s.serviceType as 'SECURITY')}</span>
                    <span className="tnum shrink-0 text-[11.5px] text-fg-muted">
                      {s.deployed} / {s.required}
                      <span className={`ml-1.5 font-semibold ${pct >= 100 ? 'text-success' : pct >= 90 ? 'text-warning' : 'text-danger'}`}>{pct}%</span>
                    </span>
                  </div>
                  <Tooltip content={`${s.required} contracted, ${s.deployed} deployed, ${s.required - s.deployed} open`}>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-soft">
                      <div
                        className={`h-full rounded-full ${pct >= 100 ? 'bg-success' : pct >= 90 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Tooltip>
                </div>
              )
            })}
            {byService.length === 0 && <p className="py-6 text-center text-[12.5px] text-fg-subtle">No running contracts.</p>}
          </CardBody>
        </Card>

        {/* ---------------- understaffed contracts ---------------- */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Contracts short of headcount"
            icon={<ClipboardList />}
            description="The service-level risk, worst first."
            actions={
              <Button variant="ghost" size="sm" onClick={() => nav('/projects')}>
                All projects <ArrowRight />
              </Button>
            }
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  {['Project', 'Client', 'Fulfilment', 'Open', 'Ends'].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {worstProjects.map((p) => {
                  const f = fulfilment(p)
                  const client = clients.find((c) => c.id === p.clientId)
                  return (
                    <tr key={p.id} className="cursor-pointer transition-colors hover:bg-bg-muted/70" onClick={() => nav(`/projects/${p.id}`)}>
                      <td className="border-b border-border px-3 py-2.5">
                        <p className="font-mono text-[12px] text-fg-muted">{p.code}</p>
                        <p className="max-w-[240px] truncate text-[12.5px] font-medium text-fg">{p.name}</p>
                      </td>
                      <td className="border-b border-border px-3 py-2.5 text-[12.5px] text-fg-muted">{client?.brandName ?? client?.legalName ?? '—'}</td>
                      <td className="border-b border-border px-3 py-2.5">
                        <FulfilmentBar deployed={f.deployed} required={f.required} width="w-[128px]" />
                      </td>
                      <td className="tnum border-b border-border px-3 py-2.5 font-semibold text-danger">{f.gap}</td>
                      <td className="tnum whitespace-nowrap border-b border-border px-3 py-2.5 text-[12px] text-fg-muted">{fmtDate(p.periodEnd)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {worstProjects.length === 0 && (
            <EmptyState icon={<Users />} title="Every contract is fully staffed" description="No project is short of its contracted headcount today." />
          )}
        </Card>

        {/* ---------------- contracts ending ---------------- */}
        <Card>
          <CardHeader title="Contracts ending" icon={<CalendarClock />} description="Within the next 90 days." />
          <CardBody className="space-y-2.5">
            {endingSoon.map((p) => {
              const days = daysUntil(p.periodEnd)
              const client = clients.find((c) => c.id === p.clientId)
              return (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="block rounded-lg border border-border bg-surface-sunken px-3 py-2.5 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12.5px] font-medium text-fg">{p.code}</span>
                    <span className={`tnum shrink-0 text-[11.5px] font-semibold ${days <= 30 ? 'text-danger' : 'text-warning'}`}>
                      {days < 0 ? `${Math.abs(days)}d over` : `${days}d`}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11.5px] text-fg-muted">{client?.brandName ?? client?.legalName}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge tone={p.autoRenew ? 'success' : 'warning'} size="sm">
                      {p.autoRenew ? 'Auto-renews' : 'Manual renewal'}
                    </Badge>
                    <span className="tnum text-[11px] text-fg-subtle">{fmtCurrency(monthlyValue(p), 'IDR', { compact: true })}/mo</span>
                  </div>
                </Link>
              )
            })}
            {endingSoon.length === 0 && <p className="py-6 text-center text-[12.5px] text-fg-subtle">Nothing ends within 90 days.</p>}
          </CardBody>
        </Card>

        {/* ---------------- stock watch ---------------- */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Stock that needs an order"
            icon={<Boxes />}
            description="Below its minimum, out of stock, or close to its expiry date."
            actions={
              <Button variant="ghost" size="sm" onClick={() => nav('/inventory/stock')}>
                All stock <ArrowRight />
              </Button>
            }
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  {['Item', 'Warehouse', 'Available', 'Level', 'Expiry'].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockWatch.map(({ line, item }) => {
                  const wh = warehouses.find((w) => w.id === line.warehouseId)
                  const exp = expiryStatus(line)
                  return (
                    <tr key={line.id} className="cursor-pointer transition-colors hover:bg-bg-muted/70" onClick={() => nav('/inventory/stock')}>
                      <td className="border-b border-border px-3 py-2.5">
                        <p className="font-mono text-[11.5px] text-fg-subtle">{item?.sku}</p>
                        <p className="max-w-[240px] truncate text-[12.5px] font-medium text-fg">{item?.name ?? 'Removed item'}</p>
                      </td>
                      <td className="border-b border-border px-3 py-2.5 text-[12px] text-fg-muted">{wh?.code}</td>
                      <td className="tnum border-b border-border px-3 py-2.5 text-[12.5px] text-fg">
                        {fmtNumber(availableQty(line))} <span className="text-[11px] text-fg-subtle">{item?.uom}</span>
                      </td>
                      <td className="border-b border-border px-3 py-2.5">
                        <StatusBadge value={stockStatus(line, item)} size="sm" />
                      </td>
                      <td className="border-b border-border px-3 py-2.5">
                        {exp === 'NONE' ? <span className="text-[12px] text-fg-subtle">—</span> : <StatusBadge value={exp} size="sm" />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {stockWatch.length === 0 && (
            <EmptyState icon={<Boxes />} title="Every level is healthy" description="Nothing is below its minimum or near its expiry date." />
          )}
        </Card>

        {/* ---------------- activity ---------------- */}
        <Card>
          <CardHeader title="Recent activity" description="What has been changed in this browser session." />
          <CardBody className="space-y-2">
            {activity.length === 0 && (
              <p className="py-6 text-center text-[12.5px] text-fg-subtle">
                Nothing changed yet. Create or edit a record and it is logged here.
              </p>
            )}
            {activity.slice(0, 8).map((a) => (
              <div key={a.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                <p className="text-[12.5px] text-fg">
                  <span className="font-medium">{a.action}</span> {a.entity.toLowerCase()} · {a.detail}
                </p>
                <p className="mt-0.5 text-[11px] text-fg-subtle">
                  {a.actor} · {new Date(a.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  )
}
