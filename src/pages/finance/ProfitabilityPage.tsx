import * as React from 'react'
import { Link } from 'react-router-dom'
import { LineChart } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { StatusBadge } from '@/components/shared/status'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtNumber, fmtPercent } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { budgetTotal, fobSheet, projectCosting, realisedMargin, sampleCost } from '@/lib/costing'
import { costCategoryLabel } from '@/data/reference'
import { projectCbm } from '@/data/seed-projects'

export function ProfitabilityPage() {
  const store = useErp()
  const [view, setView] = React.useState<'orders' | 'fob' | 'categories'>('orders')

  const categoryOf = (itemId: string) => {
    const item = store.items.find((i) => i.id === itemId)
    const map: Record<string, string> = {
      TIMBER: 'TIMBER', PANEL: 'PANEL', HARDWARE: 'HARDWARE', FINISHING: 'FINISHING',
      UPHOLSTERY: 'UPHOLSTERY', PACKAGING: 'PACKAGING', COMPONENT: 'SUBCON',
    }
    return (item ? map[item.category] ?? 'OVERHEAD' : 'OVERHEAD') as never
  }

  const rows = store.projects
    .filter((p) => p.status === 'WON' || p.status === 'CLOSED')
    .map((p) => {
      const budget = store.budgets.find((b) => b.projectId === p.id && (b.status === 'APPROVED' || b.status === 'CLOSED'))
      const orders = store.orders.filter((o) => o.projectId === p.id)
      const costing = projectCosting(p, budget, orders, categoryOf)
      const realised = realisedMargin(p, store.invoices, store.bills, store.receipts, store.orders)
      return { project: p, budget, costing, realised, fob: fobSheet(p, budget), samples: sampleCost(p) }
    })
    .sort((a, b) => a.costing.projectedMarginPct - b.costing.projectedMarginPct)

  const revenue = rows.reduce((a, r) => a + r.costing.revenue, 0)
  const budgeted = rows.reduce((a, r) => a + r.costing.budget, 0)
  const exposure = rows.reduce((a, r) => a + r.costing.exposure, 0)
  const overCommitted = rows.filter((r) => r.costing.overCommitted)

  /* category totals across the whole book */
  const categoryTotals = React.useMemo(() => {
    const map = new Map<string, { budget: number; committed: number; actual: number }>()
    rows.forEach((r) =>
      r.costing.rows.forEach((c) => {
        const row = map.get(c.category) ?? { budget: 0, committed: 0, actual: 0 }
        row.budget += c.budget
        row.committed += c.committed
        row.actual += c.actual
        map.set(c.category, row)
      }),
    )
    return Array.from(map.entries())
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.budget - a.budget)
  }, [rows])

  return (
    <div className="min-h-0">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Costing</Badge>}
        title="Profitability"
        description="Budget, commitment and actual on one line per order. The projected margin is what is left if the exposure is all that is ever spent — which is optimistic, because it assumes nothing gets reworked and no lorry turns up short."
        actions={
          <Tabs
            variant="pill"
            value={view}
            onChange={setView}
            items={[
              { value: 'orders', label: 'By order' },
              { value: 'fob', label: 'FOB cost sheet' },
              { value: 'categories', label: 'By cost category' },
            ]}
          />
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Order book revenue" value={fmtCurrency(revenue, 'IDR', { compact: true })} sub={`${rows.length} won orders`} icon={<LineChart />} accent="primary" />
        <KpiCard label="Budgeted cost" value={fmtCurrency(budgeted, 'IDR', { compact: true })} sub={fmtPercent(revenue ? ((revenue - budgeted) / revenue) * 100 : 0, 1) + ' margin'} accent="accent" />
        <KpiCard label="Committed to suppliers" value={fmtCurrency(exposure, 'IDR', { compact: true })} sub="ordered plus received" accent="warning" />
        <KpiCard
          label="Over budget"
          value={String(overCommitted.length)}
          sub={overCommitted.map((r) => r.project.code).join(', ') || 'nothing over'}
          accent={overCommitted.length ? 'danger' : 'success'}
        />
      </div>

      {view === 'orders' && (
        <Card>
          <CardHeader
            title="Order by order"
            description="Sorted worst margin first, because that is the order in which they will cause trouble."
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[1080px] text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                  <th className="px-4 py-2 font-medium">Order</th>
                  <th className="px-4 py-2 font-medium">Buyer</th>
                  <th className="px-4 py-2 font-medium">Stage</th>
                  <th className="px-4 py-2 text-right font-medium">Revenue</th>
                  <th className="px-4 py-2 text-right font-medium">Budget</th>
                  <th className="px-4 py-2 text-right font-medium">Committed</th>
                  <th className="px-4 py-2 text-right font-medium">Received</th>
                  <th className="px-4 py-2 text-right font-medium">Budget margin</th>
                  <th className="px-4 py-2 text-right font-medium">Projected</th>
                  <th className="px-4 py-2 font-medium">Budget consumed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ project, budget, costing }) => {
                  const purchased = budget
                    ? budget.lines
                        .filter((l) => !['LABOUR', 'OVERHEAD', 'CONTINGENCY'].includes(l.category))
                        .reduce((a, l) => a + l.qty * l.unitCost * (1 + l.wastagePct / 100), 0)
                    : 0
                  return (
                    <tr key={project.id} className={cn('hover:bg-bg-muted/50', costing.overCommitted && 'bg-danger-soft/25')}>
                      <td className="px-4 py-2.5">
                        <Link to={`/projects/${project.id}`} className="font-medium text-fg hover:text-primary">
                          {project.code}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-fg-muted">{project.buyerName}</td>
                      <td className="px-4 py-2.5"><StatusBadge value={project.stage} size="sm" /></td>
                      <td className="tnum px-4 py-2.5 text-right">{fmtCurrency(costing.revenue, 'IDR', { compact: true })}</td>
                      <td className="tnum px-4 py-2.5 text-right text-fg-muted">
                        {costing.budget ? fmtCurrency(costing.budget, 'IDR', { compact: true }) : <span className="text-danger">none</span>}
                      </td>
                      <td className="tnum px-4 py-2.5 text-right text-warning-soft-fg">{fmtCurrency(costing.committed, 'IDR', { compact: true })}</td>
                      <td className="tnum px-4 py-2.5 text-right text-accent-soft-fg">{fmtCurrency(costing.actual, 'IDR', { compact: true })}</td>
                      <td className="tnum px-4 py-2.5 text-right">
                        {costing.budget ? (
                          <Badge size="sm" tone={costing.budgetMarginPct >= costing.targetMarginPct ? 'success' : 'warning'}>
                            {fmtPercent(costing.budgetMarginPct, 1)}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className="tnum px-4 py-2.5 text-right">
                        {costing.budget ? (
                          <Tooltip content="Committed and received, plus the labour, overhead and contingency the budget allows but no purchase order covers.">
                            <span
                              className={cn(
                                'font-semibold',
                                costing.projectedMarginPct < 8 ? 'text-danger' : costing.projectedMarginPct < costing.targetMarginPct ? 'text-warning-soft-fg' : 'text-success',
                              )}
                            >
                              {fmtPercent(costing.projectedMarginPct, 1)}
                            </span>
                          </Tooltip>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {purchased ? <UtilisationBar pct={(costing.exposure / purchased) * 100} className="w-28" /> : <span className="text-fg-subtle">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <CardBody className="border-t border-border">
            <p className="text-[12.5px] leading-relaxed text-fg-muted">
              Budget consumed compares purchase orders against the bought-in half of the budget only — labour, overhead and
              contingency are budgeted but never appear on a purchase order, so including them would flatter every job.
            </p>
          </CardBody>
        </Card>
      )}

      {view === 'fob' && (
        <Card>
          <CardHeader
            title="FOB cost sheet"
            description="The same budget, read the way an export costing is read: per piece and per cubic metre. Furniture is sold by the piece and shipped by the metre, and the two rarely agree about which orders are worth taking."
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[980px] text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                  <th className="px-4 py-2 font-medium">Order</th>
                  <th className="px-4 py-2 text-right font-medium">Pieces</th>
                  <th className="px-4 py-2 text-right font-medium">m³</th>
                  <th className="px-4 py-2 text-right font-medium">Cost / piece</th>
                  <th className="px-4 py-2 text-right font-medium">Price / piece</th>
                  <th className="px-4 py-2 text-right font-medium">Cost / m³</th>
                  <th className="px-4 py-2 text-right font-medium">Revenue / m³</th>
                  <th className="px-4 py-2 text-right font-medium">Margin / m³</th>
                  <th className="px-4 py-2 text-right font-medium">Sample cost absorbed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ project, fob, samples }) => (
                  <tr key={project.id} className="hover:bg-bg-muted/50">
                    <td className="px-4 py-2.5">
                      <Link to={`/projects/${project.id}`} className="font-medium text-fg hover:text-primary">{project.code}</Link>
                      <p className="truncate text-[11.5px] text-fg-muted">{project.buyerName}</p>
                    </td>
                    <td className="tnum px-4 py-2.5 text-right">{fmtNumber(fob.pieces)}</td>
                    <td className="tnum px-4 py-2.5 text-right">{fmtNumber(fob.cbm, 1)}</td>
                    <td className="tnum px-4 py-2.5 text-right text-fg-muted">{fmtCurrency(fob.costPerPiece, 'IDR', { compact: true })}</td>
                    <td className="tnum px-4 py-2.5 text-right">{fmtCurrency(fob.revenuePerPiece, 'IDR', { compact: true })}</td>
                    <td className="tnum px-4 py-2.5 text-right text-fg-muted">{fmtCurrency(fob.costPerCbm, 'IDR', { compact: true })}</td>
                    <td className="tnum px-4 py-2.5 text-right">{fmtCurrency(fob.revenuePerCbm, 'IDR', { compact: true })}</td>
                    <td className={cn('tnum px-4 py-2.5 text-right font-semibold', fob.marginPerCbm < 0 ? 'text-danger' : 'text-success')}>
                      {fmtCurrency(fob.marginPerCbm, 'IDR', { compact: true })}
                    </td>
                    <td className="tnum px-4 py-2.5 text-right text-fg-muted">
                      {samples.absorbed ? fmtCurrency(samples.absorbed, 'IDR', { compact: true }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CardBody className="border-t border-border">
            <p className="text-[12.5px] leading-relaxed text-fg-muted">
              Margin per cubic metre is the number that decides which orders are worth taking when the factory is full. A
              chair programme can look better per piece than a slab table and still be worse per metre — and a container
              only holds metres.
            </p>
          </CardBody>
        </Card>
      )}

      {view === 'categories' && (
        <Card>
          <CardHeader
            title="Where the cost sits across the whole book"
            description="Budget, committed and received by cost category, added up across every won order."
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[760px] text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 text-right font-medium">Budget</th>
                  <th className="px-4 py-2 text-right font-medium">Committed</th>
                  <th className="px-4 py-2 text-right font-medium">Received</th>
                  <th className="px-4 py-2 text-right font-medium">Share of budget</th>
                  <th className="px-4 py-2 font-medium">Consumed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categoryTotals.map((c) => (
                  <tr key={c.category} className="hover:bg-bg-muted/50">
                    <td className="px-4 py-2.5 font-medium text-fg">{costCategoryLabel(c.category as never)}</td>
                    <td className="tnum px-4 py-2.5 text-right">{fmtCurrency(c.budget, 'IDR', { compact: true })}</td>
                    <td className="tnum px-4 py-2.5 text-right text-warning-soft-fg">{c.committed ? fmtCurrency(c.committed, 'IDR', { compact: true }) : '—'}</td>
                    <td className="tnum px-4 py-2.5 text-right text-accent-soft-fg">{c.actual ? fmtCurrency(c.actual, 'IDR', { compact: true }) : '—'}</td>
                    <td className="tnum px-4 py-2.5 text-right text-fg-muted">{fmtPercent(budgeted ? (c.budget / budgeted) * 100 : 0, 1)}</td>
                    <td className="px-4 py-2.5">
                      {c.budget ? <UtilisationBar pct={((c.actual + c.committed) / c.budget) * 100} className="w-32" /> : <span className="text-fg-subtle">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CardBody className="border-t border-border">
            <p className="text-[12.5px] leading-relaxed text-fg-muted">
              Timber is normally between a third and a half of the whole cost of an order, which is why an eleven per cent
              move in the sawn price is not a rounding error — it is most of the margin on a job like{' '}
              {rows[0]?.project.code ?? 'the thinnest one in the book'}.
            </p>
          </CardBody>
        </Card>
      )}

      <p className="mt-4 text-[11.5px] text-fg-subtle">
        {fmtNumber(rows.reduce((a, r) => a + projectCbm(r.project), 0), 1)} m³ of finished goods across{' '}
        {rows.length} won orders, budgeted at {fmtCurrency(budgetTotal(undefined) + budgeted, 'IDR', { compact: true })}.
      </p>
    </div>
  )
}
