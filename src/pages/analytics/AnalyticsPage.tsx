import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Building2, Download, Target, TrendingUp, Users } from 'lucide-react'
import { useErp } from '@/store/useErp'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { companyKpis, customerProfitability, type Kpi } from '@/lib/analytics2'
import { jobFinancials } from '@/lib/analytics'
import { utilisation } from '@/lib/shipping'
import { fmtCurrency, fmtNumber, fmtPercent } from '@/lib/format'
import { exportCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

export function AnalyticsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const store = useErp()
  const { projects, charges, containers, documents, milestones, quotations, invoices, receipts, customers, settings } = store

  const kpis = React.useMemo(
    () => companyKpis({ projects, charges, containers, documents, milestones, quotations, invoices, receipts, settings }),
    [projects, charges, containers, documents, milestones, quotations, invoices, receipts, settings],
  )
  const byCustomer = customerProfitability(projects, charges, customers)
  const revenueTotal = byCustomer.reduce((a, c) => a + c.revenue, 0) || 1
  const concentration = byCustomer.length ? (byCustomer[0].revenue / revenueTotal) * 100 : 0

  /* margin distribution — the average hides the loss-makers */
  const jobMargins = projects
    .filter((p) => charges.some((c) => c.projectId === p.id))
    .map((p) => ({ project: p, ...jobFinancials(charges.filter((c) => c.projectId === p.id)) }))
  const bands = [
    { label: 'Below 0%', min: -Infinity, max: 0, tone: 'bg-danger' },
    { label: '0–8%', min: 0, max: 8, tone: 'bg-danger/70' },
    { label: '8–15%', min: 8, max: 15, tone: 'bg-warning' },
    { label: '15–25%', min: 15, max: 25, tone: 'bg-primary' },
    { label: 'Above 25%', min: 25, max: Infinity, tone: 'bg-success' },
  ].map((b) => ({ ...b, count: jobMargins.filter((j) => j.marginPct >= b.min && j.marginPct < b.max).length }))
  const bandMax = Math.max(...bands.map((b) => b.count), 1)

  const utilBands = containers
    .filter((c) => c.type !== 'LCL')
    .map((c) => {
      const u = utilisation(c.type, c.items, c.tareKg)
      return Math.max(u.volumePct, u.weightPct)
    })
  const utilGroups = [
    { label: '<50%', count: utilBands.filter((v) => v < 50).length, tone: 'bg-danger' },
    { label: '50–65%', count: utilBands.filter((v) => v >= 50 && v < 65).length, tone: 'bg-warning' },
    { label: '65–90%', count: utilBands.filter((v) => v >= 65 && v < 90).length, tone: 'bg-success' },
    { label: '90–100%', count: utilBands.filter((v) => v >= 90 && v <= 100).length, tone: 'bg-accent' },
    { label: 'Over 100%', count: utilBands.filter((v) => v > 100).length, tone: 'bg-danger' },
  ]
  const utilMax = Math.max(...utilGroups.map((g) => g.count), 1)

  return (
    <>
      <PageHeader
        title="Operations Analytics"
        description="The measures the trade actually renews contracts on: punctuality, win rate, margin per shipment, days sales outstanding, container fill and document accuracy. Every figure is computed from records — change a milestone or a charge and these move."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              exportCsv(
                'operations-kpis',
                kpis.map((k) => ({ kpi: k.label, value: k.value.toFixed(2), unit: k.unit, target: k.target ?? '', detail: k.detail })),
                [
                  { key: 'kpi', header: 'KPI' }, { key: 'value', header: 'Value' }, { key: 'unit', header: 'Unit' },
                  { key: 'target', header: 'Target' }, { key: 'detail', header: 'Detail' },
                ],
              )
              toast.push({ tone: 'success', title: 'KPI set exported' })
            }}
          >
            <Download /> Export KPIs
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue concentration" value={fmtPercent(concentration, 0)} icon={<Users />} accent={concentration > 40 ? 'warning' : 'success'} sub={byCustomer[0] ? `${byCustomer[0].customer.tradeName ?? byCustomer[0].customer.legalName} is the largest account` : '—'} />
        <KpiCard label="Jobs measured" value={jobMargins.length} icon={<BarChart3 />} accent="primary" sub={`${projects.length} in the register`} />
        <KpiCard label="Loss-making jobs" value={jobMargins.filter((j) => j.marginPct < 0).length} icon={<TrendingUp />} accent={jobMargins.some((j) => j.marginPct < 0) ? 'danger' : 'success'} sub="Below zero after direct cost" />
        <KpiCard label="KPIs off target" value={kpis.filter((k) => k.target !== undefined && (k.higherIsBetter ? k.value < k.target : k.value > k.target)).length} icon={<Target />} accent="warning" sub={`of ${kpis.filter((k) => k.target !== undefined).length} with a target set`} />
      </div>

      <Card className="mb-5">
        <CardHeader
          icon={<Target />}
          title="Scorecard"
          description="Targets are set in Settings. Variance is against the target, not against last month."
        />
        <div className="grid gap-px bg-border sm:grid-cols-2">
          {kpis.map((k) => (
            <KpiRow key={k.key} kpi={k} />
          ))}
        </div>
      </Card>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Margin distribution" description="The average margin hides the jobs that lose money. This does not." />
          <CardBody className="space-y-2.5">
            {bands.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="w-[92px] shrink-0 text-[12.5px] text-fg-muted">{b.label}</span>
                <span className="relative h-5 flex-1 overflow-hidden rounded-md bg-surface-sunken">
                  <span className={cn('absolute inset-y-0 left-0 rounded-md', b.tone)} style={{ width: `${(b.count / bandMax) * 100}%` }} />
                </span>
                <span className="tnum w-8 shrink-0 text-right text-[12px] text-fg">{b.count}</span>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Container fill" description="Freight is paid on the box, not on what is in it." />
          <CardBody className="space-y-2.5">
            {utilGroups.map((g) => (
              <div key={g.label} className="flex items-center gap-3">
                <span className="w-[92px] shrink-0 text-[12.5px] text-fg-muted">{g.label}</span>
                <span className="relative h-5 flex-1 overflow-hidden rounded-md bg-surface-sunken">
                  <span className={cn('absolute inset-y-0 left-0 rounded-md', g.tone)} style={{ width: `${(g.count / utilMax) * 100}%` }} />
                </span>
                <span className="tnum w-8 shrink-0 text-right text-[12px] text-fg">{g.count}</span>
              </div>
            ))}
            <p className="pt-1 text-[11.5px] leading-relaxed text-fg-muted">
              Anything below 65% is a consolidation opportunity. Anything above 100% will be refused at the gate.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          icon={<Building2 />}
          title="Customer profitability"
          description="Revenue is vanity. This is ranked on what is left after direct cost."
        />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface-sunken text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Customer</th>
                <th className="px-4 py-2 text-right font-semibold">Jobs</th>
                <th className="px-4 py-2 text-right font-semibold">Revenue</th>
                <th className="px-4 py-2 text-right font-semibold">Cost</th>
                <th className="px-4 py-2 text-right font-semibold">Margin</th>
                <th className="px-4 py-2 text-left font-semibold">Margin %</th>
                <th className="px-4 py-2 text-right font-semibold">Share of book</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byCustomer.map((r) => (
                <tr
                  key={r.customer.id}
                  onClick={() => nav(`/customers/${r.customer.id}`)}
                  className="cursor-pointer hover:bg-bg-muted/60"
                >
                  <td className="px-4 py-2">
                    <span className="font-medium text-fg">{r.customer.tradeName ?? r.customer.legalName}</span>
                    <span className="ml-2 font-mono text-[11px] text-fg-subtle">{r.customer.code}</span>
                  </td>
                  <td className="tnum px-4 py-2 text-right text-fg-muted">{r.jobs}</td>
                  <td className="tnum px-4 py-2 text-right text-fg">{fmtCurrency(r.revenue, 'IDR', { compact: true })}</td>
                  <td className="tnum px-4 py-2 text-right text-fg-muted">{fmtCurrency(r.cost, 'IDR', { compact: true })}</td>
                  <td className={cn('tnum px-4 py-2 text-right font-medium', r.margin < 0 ? 'text-danger' : 'text-fg')}>
                    {fmtCurrency(r.margin, 'IDR', { compact: true })}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex w-[130px] items-center gap-2">
                      <Progress value={Math.max(0, Math.min(100, r.marginPct * 2.5))} tone={r.marginPct >= 20 ? 'success' : r.marginPct >= 8 ? 'warning' : 'danger'} size="sm" />
                      <span className={cn('tnum w-9 text-right text-[11.5px] font-medium', r.marginPct >= 20 ? 'text-success' : r.marginPct >= 8 ? 'text-warning' : 'text-danger')}>
                        {r.marginPct.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="tnum px-4 py-2 text-right text-fg-muted">{((r.revenue / revenueTotal) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border bg-surface-sunken/60 px-4 py-2.5 text-[12px] text-fg-muted">
          {concentration > 40 ? (
            <>
              <span className="font-semibold text-warning">Concentration risk:</span> {concentration.toFixed(0)}% of revenue sits
              with one account. Losing it would take most of the margin with it.
            </>
          ) : (
            <>Revenue is spread across {byCustomer.length} paying accounts — the largest holds {concentration.toFixed(0)}%.</>
          )}
        </div>
      </Card>
    </>
  )
}

function KpiRow({ kpi }: { kpi: Kpi }) {
  const onTarget = kpi.target === undefined ? null : kpi.higherIsBetter ? kpi.value >= kpi.target : kpi.value <= kpi.target
  const format = (v: number) =>
    kpi.unit === '%' ? fmtPercent(v, 1)
      : kpi.unit === 'days' ? `${v.toFixed(1)} d`
        : kpi.unit === 'idr' ? fmtCurrency(v, 'IDR', { compact: true })
          : kpi.unit === 'cbm' ? `${fmtNumber(v, 1)} m³`
            : fmtNumber(v)
  const pctOfTarget = kpi.target ? Math.min(140, kpi.higherIsBetter ? (kpi.value / kpi.target) * 100 : (kpi.target / Math.max(kpi.value, 0.01)) * 100) : null

  return (
    <div className="bg-surface px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-fg">{kpi.label}</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className={cn('tnum text-[20px] font-semibold tracking-[-0.02em]', onTarget === null ? 'text-fg' : onTarget ? 'text-success' : 'text-danger')}>
              {format(kpi.value)}
            </span>
            {kpi.target !== undefined && (
              <span className="tnum text-[11.5px] text-fg-subtle">target {format(kpi.target)}</span>
            )}
          </p>
        </div>
        {onTarget !== null && (
          <Tooltip content={onTarget ? 'Meeting the target' : 'Below the target'}>
            <Badge tone={onTarget ? 'success' : 'danger'} size="sm">{onTarget ? 'On target' : 'Off target'}</Badge>
          </Tooltip>
        )}
      </div>
      {pctOfTarget !== null && (
        <div className="mt-2">
          <Progress value={pctOfTarget} tone={onTarget ? 'success' : 'danger'} size="sm" />
        </div>
      )}
      <p className="mt-2 text-[11.5px] leading-relaxed text-fg-muted">{kpi.detail}</p>
      <Separator className="mt-0" />
    </div>
  )
}
