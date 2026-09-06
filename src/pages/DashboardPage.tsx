import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowUpRight, Boxes, CalendarClock, Container, Factory, Gauge, ShoppingCart,
  TrendingDown, Wallet,
} from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/misc'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { StatusBadge } from '@/components/shared/status'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent, relativeLabel } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { useExceptions, useWarehouseLoads } from '@/hooks/useExceptions'
import { inventoryValue } from '@/lib/inventory'
import { budgetTotal, revenueIdr } from '@/lib/costing'
import { orderProgress } from '@/lib/procurement'
import {
  cashPosition, pipeline, productionLoad, shipCalendar, spendByCategory, winLoss,
} from '@/lib/analytics'
import { COST_CATEGORIES, complianceSpec } from '@/data/reference'
import type { Exception, Severity } from '@/lib/exceptions'

const SEVERITY_TONE: Record<Severity, string> = {
  CRITICAL: 'text-danger',
  HIGH: 'text-warning',
  MEDIUM: 'text-info',
}

export function DashboardPage() {
  const navigate = useNavigate()
  const store = useErp()
  const { exceptions, rows } = useExceptions()
  const loads = useWarehouseLoads()
  const [area, setArea] = React.useState<'ALL' | Exception['area']>('ALL')

  const live = store.projects.filter((p) => p.status === 'WON' && p.stage !== 'CLOSED')
  const orderBook = live.reduce((a, p) => a + revenueIdr(p), 0)

  const exposure = store.orders
    .filter((o) => !['DRAFT', 'CANCELLED'].includes(o.status))
    .reduce((a, o) => {
      const progress = orderProgress(o, store.receipts)
      return a + progress.openValue + progress.receivedValue
    }, 0)

  const stockValue = inventoryValue(rows)
  const cash = cashPosition(store.invoices, store.bills)
  const ships = shipCalendar(store.projects, 45)
  const load = productionLoad(store.workOrders)
  const wl = winLoss(store.projects)
  const funnel = pipeline(store.projects)
  const spend = spendByCategory(store.orders, store.budgets, (id) => store.items.find((i) => i.id === id))

  const areas = React.useMemo(() => {
    const map = new Map<Exception['area'], number>()
    exceptions.forEach((e) => map.set(e.area, (map.get(e.area) ?? 0) + 1))
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [exceptions])

  const shown = area === 'ALL' ? exceptions : exceptions.filter((e) => e.area === area)
  const counts = {
    critical: exceptions.filter((e) => e.severity === 'CRITICAL').length,
    high: exceptions.filter((e) => e.severity === 'HIGH').length,
    medium: exceptions.filter((e) => e.severity === 'MEDIUM').length,
  }

  return (
    <div className="min-h-0">
      <PageHeader
        eyebrow={
          <>
            <Badge tone="primary" size="sm">Control Tower</Badge>
            <span className="text-[12px] text-fg-muted">{store.company.tradingName} · {store.company.city}</span>
          </>
        }
        title="What needs a decision today"
        description="Every figure below is folded out of the order book, the purchase ledger and the stock movements as the page renders. Nothing on this screen is a stored total, and nothing on the exception list was put there by hand."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/analytics')}>
              <Gauge /> Analytics
            </Button>
            <Button variant="primary" onClick={() => navigate('/projects')}>
              <ArrowUpRight /> Open the order book
            </Button>
          </>
        }
      />

      {/* ---------------- KPIs ---------------- */}
      <div data-tour="kpis" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Order book"
          value={fmtCurrency(orderBook, 'IDR', { compact: true })}
          sub={`${live.length} orders won and open`}
          icon={<Boxes />}
          accent="primary"
          onClick={() => navigate('/projects')}
        />
        <KpiCard
          label="Purchase exposure"
          value={fmtCurrency(exposure, 'IDR', { compact: true })}
          sub={`${store.orders.filter((o) => ['SENT', 'APPROVED', 'PARTIALLY_RECEIVED'].includes(o.status)).length} orders open`}
          icon={<ShoppingCart />}
          accent="warning"
          onClick={() => navigate('/purchase-orders')}
        />
        <KpiCard
          label="Stock at cost"
          value={fmtCurrency(stockValue, 'IDR', { compact: true })}
          sub={`across ${loads.filter((l) => l.cbm > 0).length} warehouses`}
          icon={<Boxes />}
          accent="accent"
          onClick={() => navigate('/inventory')}
        />
        <KpiCard
          label="Owed to us"
          value={fmtCurrency(cash.receivable, 'IDR', { compact: true })}
          delta={cash.overdueIn > 0 ? `${fmtCurrency(cash.overdueIn, 'IDR', { compact: true })} late` : undefined}
          deltaTone={cash.overdueIn > 0 ? 'down' : 'neutral'}
          icon={<Wallet />}
          accent="success"
          onClick={() => navigate('/receivables')}
        />
        <KpiCard
          label="We owe"
          value={fmtCurrency(cash.payable, 'IDR', { compact: true })}
          delta={cash.overdueOut > 0 ? `${fmtCurrency(cash.overdueOut, 'IDR', { compact: true })} late` : undefined}
          deltaTone={cash.overdueOut > 0 ? 'down' : 'neutral'}
          icon={<TrendingDown />}
          accent="danger"
          onClick={() => navigate('/payables')}
        />
        <KpiCard
          label="On the floor"
          value={`${fmtNumber(load.produced)} / ${fmtNumber(load.pieces)}`}
          sub={`${load.open} work orders · ${load.late} late${load.onHold ? ` · ${load.onHold} on hold` : ''}`}
          icon={<Factory />}
          accent={load.late > 0 ? 'warning' : 'accent'}
          onClick={() => navigate('/production')}
        />
      </div>

      {/* ---------------- exceptions + ship calendar ---------------- */}
      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card data-tour="exceptions" className="min-w-0">
          <CardHeader
            icon={<AlertTriangle />}
            title={`${exceptions.length} things want attention`}
            description={`${counts.critical} critical · ${counts.high} high · ${counts.medium} worth knowing. Each one is a rule read off the live records, not a flag somebody set.`}
          />
          <div className="border-b border-border px-4 py-2.5">
            <div className="scrollbar-thin flex gap-1.5 overflow-x-auto pb-0.5">
              <button
                onClick={() => setArea('ALL')}
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors',
                  area === 'ALL' ? 'bg-primary text-primary-fg' : 'bg-neutral-soft text-neutral-soft-fg hover:text-fg',
                )}
              >
                Everything {exceptions.length}
              </button>
              {areas.map(([a, n]) => (
                <button
                  key={a}
                  onClick={() => setArea(a)}
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors',
                    area === a ? 'bg-primary text-primary-fg' : 'bg-neutral-soft text-neutral-soft-fg hover:text-fg',
                  )}
                >
                  {a} {n}
                </button>
              ))}
            </div>
          </div>
          <div className="scrollbar-thin max-h-[560px] divide-y divide-border overflow-y-auto">
            {shown.length === 0 && (
              <EmptyState
                title="Nothing outstanding here"
                description="No rule in this area is firing against the current records."
              />
            )}
            {shown.map((e) => (
              <Link
                key={e.id}
                to={e.to}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-bg-muted/60"
              >
                <AlertTriangle className={cn('mt-0.5 size-4 shrink-0', SEVERITY_TONE[e.severity])} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold leading-snug text-fg">{e.title}</p>
                    <Badge size="sm" tone={e.severity === 'CRITICAL' ? 'danger' : e.severity === 'HIGH' ? 'warning' : 'info'}>
                      {e.severity.toLowerCase()}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{e.detail}</p>
                  <p className="mt-1.5 text-[11.5px] text-fg-subtle">
                    {e.area} · {e.entity}
                    {e.value ? ` · ${fmtCurrency(e.value, e.currency ?? 'IDR', { compact: true })}` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card data-tour="ship">
            <CardHeader
              icon={<CalendarClock />}
              title="Sailing soonest"
              description="Orders by target ship date, with what each one still owes before a container can legally leave."
            />
            <div className="divide-y divide-border">
              {ships.length === 0 && <EmptyState title="Nothing due in the next six weeks" />}
              {ships.slice(0, 7).map(({ project, daysToShip }) => {
                const missing = project.compliance.filter(
                  (c) => complianceSpec(c.key).blocking && c.status !== 'SATISFIED',
                )
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block px-4 py-3 transition-colors hover:bg-bg-muted/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-fg">{project.code}</p>
                        <p className="truncate text-[12px] text-fg-muted">
                          {project.buyerName} → {project.destinationPort}
                        </p>
                      </div>
                      <Badge
                        size="sm"
                        tone={daysToShip < 0 ? 'danger' : daysToShip <= 10 ? 'warning' : 'neutral'}
                      >
                        {daysToShip < 0 ? `${Math.abs(daysToShip)}d late` : `${daysToShip}d`}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusBadge value={project.stage} size="sm" />
                      {missing.length > 0 ? (
                        <Tooltip content={missing.map((m) => complianceSpec(m.key).label).join(' · ')}>
                          <span>
                            <Badge size="sm" tone="danger">
                              {missing.length} certificate{missing.length > 1 ? 's' : ''} outstanding
                            </Badge>
                          </span>
                        </Tooltip>
                      ) : (
                        <Badge size="sm" tone="success">Paperwork complete</Badge>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={<Container />}
              title="Warehouse load"
              description="Volume standing in each store against what it holds."
            />
            <CardBody className="space-y-3">
              {loads
                .filter((l) => l.warehouse.active)
                .sort((a, b) => b.utilisationPct - a.utilisationPct)
                .map((l) => (
                  <div key={l.warehouse.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-fg">{l.warehouse.name}</p>
                      <p className="tnum truncate text-[11.5px] text-fg-muted">
                        {fmtNumber(l.cbm, 1)} of {fmtNumber(l.warehouse.capacityM3)} m³ · {fmtCurrency(l.value, 'IDR', { compact: true })}
                      </p>
                    </div>
                    <UtilisationBar pct={l.utilisationPct} className="w-24 shrink-0" />
                  </div>
                ))}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ---------------- pipeline and spend ---------------- */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="The order book by stage"
            description={`${wl.open} still being won, ${wl.won} won, ${wl.lost} lost. Win rate ${fmtPercent(wl.winRatePct, 0)} on decided enquiries.`}
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/pipeline">Open the board</Link>
              </Button>
            }
          />
          <CardBody className="space-y-2">
            {funnel
              .filter((f) => f.count > 0)
              .map((f) => {
                const max = Math.max(...funnel.map((x) => x.valueIdr), 1)
                return (
                  <div key={f.stage.key} className="flex items-center gap-3">
                    <span className="w-[124px] shrink-0 truncate text-[12.5px] text-fg-muted">{f.stage.label}</span>
                    <div className="relative h-6 min-w-0 flex-1 overflow-hidden rounded bg-surface-sunken">
                      <div
                        className="h-full rounded bg-primary/75 transition-all"
                        style={{ width: `${Math.max(3, (f.valueIdr / max) * 100)}%` }}
                      />
                      <span className="tnum absolute inset-y-0 left-2 flex items-center text-[11.5px] font-medium text-fg">
                        {f.count} · {fmtCurrency(f.valueIdr, 'IDR', { compact: true })}
                      </span>
                    </div>
                  </div>
                )
              })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Where the money is being spent"
            description="Purchase orders by cost category, showing what has actually been received against what is only committed."
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/purchase-orders">Orders</Link>
              </Button>
            }
          />
          <CardBody className="space-y-2">
            {spend.slice(0, 9).map((row) => {
              const max = Math.max(...spend.map((x) => x.ordered), 1)
              const label = COST_CATEGORIES.find((c) => c.value === row.category)?.label ?? row.category
              return (
                <div key={row.category} className="flex items-center gap-3">
                  <span className="w-[124px] shrink-0 truncate text-[12.5px] text-fg-muted">{label}</span>
                  <div className="relative h-6 min-w-0 flex-1 overflow-hidden rounded bg-surface-sunken">
                    <div className="absolute inset-y-0 left-0 rounded bg-warning/30" style={{ width: `${(row.ordered / max) * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded bg-accent/70" style={{ width: `${(row.received / max) * 100}%` }} />
                    <span className="tnum absolute inset-y-0 left-2 flex items-center text-[11.5px] font-medium text-fg">
                      {fmtCurrency(row.received, 'IDR', { compact: true })} of {fmtCurrency(row.ordered, 'IDR', { compact: true })}
                    </span>
                  </div>
                </div>
              )
            })}
            <p className="pt-1 text-[11.5px] text-fg-subtle">
              Solid is received and therefore a real cost. The pale band behind it is ordered and not yet delivered — money
              promised to a supplier that has not yet turned into anything you can put in a container.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* ---------------- margin watch ---------------- */}
      <Card className="mt-4">
        <CardHeader
          title="Margin watch"
          description="Every won order, ranked by the margin its approved budget leaves. The thinnest ones are where a late delivery or a rework turns a profit into a loss."
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/profitability">Full profitability</Link>
            </Button>
          }
        />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-[12.5px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Buyer</th>
                <th className="px-4 py-2 text-right font-medium">Revenue</th>
                <th className="px-4 py-2 text-right font-medium">Budget</th>
                <th className="px-4 py-2 text-right font-medium">Margin</th>
                <th className="px-4 py-2 font-medium">Against target</th>
                <th className="px-4 py-2 font-medium">Ships</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {live
                .map((p) => {
                  const budget = store.budgets.find(
                    (b) => b.projectId === p.id && (b.status === 'APPROVED' || b.status === 'CLOSED'),
                  )
                  const revenue = revenueIdr(p)
                  const cost = budgetTotal(budget)
                  return { p, budget, revenue, cost, pct: revenue && cost ? ((revenue - cost) / revenue) * 100 : null }
                })
                .sort((a, b) => (a.pct === null ? 999 : a.pct) - (b.pct === null ? 999 : b.pct))
                .slice(0, 8)
                .map(({ p, budget, revenue, cost, pct }) => (
                  <tr key={p.id} className="hover:bg-bg-muted/50">
                    <td className="px-4 py-2.5">
                      <Link to={`/projects/${p.id}`} className="font-medium text-fg hover:text-primary">
                        {p.code}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-fg-muted">{p.buyerName}</td>
                    <td className="tnum px-4 py-2.5 text-right">{fmtCurrency(revenue, 'IDR', { compact: true })}</td>
                    <td className="tnum px-4 py-2.5 text-right text-fg-muted">
                      {cost ? fmtCurrency(cost, 'IDR', { compact: true }) : '—'}
                    </td>
                    <td className="tnum px-4 py-2.5 text-right font-semibold">
                      {pct === null ? <span className="text-fg-subtle">no budget</span> : fmtPercent(pct as number, 1)}
                    </td>
                    <td className="px-4 py-2.5">
                      {budget && pct !== null ? (
                        <Badge
                          size="sm"
                          tone={pct >= budget.targetMarginPct ? 'success' : pct >= budget.targetMarginPct - 4 ? 'warning' : 'danger'}
                        >
                          target {budget.targetMarginPct}%
                        </Badge>
                      ) : (
                        <Badge size="sm" tone="danger">not costed</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-fg-muted">
                      {fmtDate(p.targetShipAt, 'short')}{' '}
                      <span className="text-fg-subtle">({relativeLabel(p.targetShipAt)})</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
