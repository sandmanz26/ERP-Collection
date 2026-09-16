import * as React from 'react'
import { Link } from 'react-router-dom'
import { LineChart } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { StatusBadge } from '@/components/shared/status'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { useStock } from '@/hooks/useExceptions'
import {
  byCountry, deliveryPunctuality, marginByProject, negotiationEffort, shipmentForecast,
  spendBySupplier, winLoss,
} from '@/lib/analytics'
import { slowMoving } from '@/lib/inventory'
import { supplierScores } from '@/lib/procurement'

export function AnalyticsPage() {
  const store = useErp()
  const { positions } = useStock()
  const [view, setView] = React.useState<'commercial' | 'supply' | 'stock'>('commercial')

  const wl = winLoss(store.projects)
  const countries = byCountry(store.projects, store.buyers)
  const margins = marginByProject(store.projects, store.budgets)
  const punctuality = deliveryPunctuality(store.orders, store.receipts)
  const spend = spendBySupplier(store.orders, store.receipts, store.suppliers)
  const scores = supplierScores(store.suppliers, store.orders, store.receipts)
  const forecast = shipmentForecast(store.projects)
  const effort = negotiationEffort(store.projects)
  const slow = slowMoving(positions, store.settings.slowMovingDays)

  const maxCountry = Math.max(...countries.map((c) => c.valueIdr), 1)

  return (
    <div className="min-h-0">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Insight</Badge>}
        title="Analytics"
        description="Everything here is derived from the same records the operational screens use. There is no reporting table, no nightly job and no number that can be true on one page and false on another."
        actions={
          <Tabs
            variant="pill"
            value={view}
            onChange={setView}
            items={[
              { value: 'commercial', label: 'Commercial' },
              { value: 'supply', label: 'Supply chain' },
              { value: 'stock', label: 'Stock' },
            ]}
          />
        }
      />

      {view === 'commercial' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Win rate" value={fmtPercent(wl.winRatePct, 0)} sub={`${wl.won} won, ${wl.lost} lost`} icon={<LineChart />} accent="primary" />
            <KpiCard label="Won value" value={fmtCurrency(wl.wonValue, 'IDR', { compact: true })} sub="across the whole book" accent="success" />
            <KpiCard label="Lost value" value={fmtCurrency(wl.lostValue, 'IDR', { compact: true })} sub={Object.entries(wl.lossReasons).map(([k, v]) => `${titleCase(k)} ${v}`).join(', ') || '—'} accent="danger" />
            <KpiCard
              label="Average rounds to win"
              value={fmtNumber(effort.length ? effort.reduce((a, e) => a + e.rounds, 0) / effort.length : 0, 1)}
              sub="of negotiation per order"
              accent="accent"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader title="Where the money comes from" description="Won orders by destination country." />
              <CardBody className="space-y-2.5">
                {countries.map((c) => (
                  <div key={c.code} className="flex items-center gap-3">
                    <span className="w-[130px] shrink-0 truncate text-[12.5px] text-fg-muted">{c.name}</span>
                    <div className="relative h-6 min-w-0 flex-1 overflow-hidden rounded bg-surface-sunken">
                      <div className="h-full rounded bg-primary/70" style={{ width: `${Math.max(3, (c.valueIdr / maxCountry) * 100)}%` }} />
                      <span className="tnum absolute inset-y-0 left-2 flex items-center text-[11.5px] font-medium text-fg">
                        {c.count} · {fmtCurrency(c.valueIdr, 'IDR', { compact: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Ship forecast" description="Value by the month an order is due to leave the yard." />
              <CardBody className="space-y-2.5">
                {forecast.map((m) => {
                  const max = Math.max(...forecast.map((x) => x.valueIdr), 1)
                  return (
                    <div key={m.key} className="flex items-center gap-3">
                      <span className="w-[64px] shrink-0 text-[12.5px] text-fg-muted">{m.label}</span>
                      <div className="relative h-6 min-w-0 flex-1 overflow-hidden rounded bg-surface-sunken">
                        <div className="h-full rounded bg-accent/70" style={{ width: `${Math.max(2, (m.valueIdr / max) * 100)}%` }} />
                        <span className="tnum absolute inset-y-0 left-2 flex items-center text-[11.5px] font-medium text-fg">
                          {m.count} · {fmtCurrency(m.valueIdr, 'IDR', { compact: true })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Margin by order" description="What each budget leaves, against the target it was built to." />
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[760px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                    <th className="px-5 py-2.5 font-medium">Order</th>
                    <th className="px-5 py-2.5 font-medium">Buyer</th>
                    <th className="px-5 py-2.5 text-right font-medium">Revenue</th>
                    <th className="px-5 py-2.5 text-right font-medium">Cost</th>
                    <th className="px-5 py-2.5 text-right font-medium">Margin</th>
                    <th className="px-5 py-2.5 text-right font-medium">Target</th>
                    <th className="px-5 py-2.5 font-medium">Against target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {margins.map((m) => (
                    <tr key={m.project.id} className="hover:bg-bg-muted/50">
                      <td className="px-5 py-3">
                        <Link to={`/projects/${m.project.id}`} className="font-medium text-fg hover:text-primary">{m.project.code}</Link>
                      </td>
                      <td className="px-5 py-3 text-fg-muted">{m.project.buyerName}</td>
                      <td className="tnum px-5 py-3 text-right">{fmtCurrency(m.revenue, 'IDR', { compact: true })}</td>
                      <td className="tnum px-5 py-3 text-right text-fg-muted">{m.cost ? fmtCurrency(m.cost, 'IDR', { compact: true }) : '—'}</td>
                      <td className="tnum px-5 py-3 text-right font-semibold">{m.cost ? fmtPercent(m.marginPct, 1) : '—'}</td>
                      <td className="tnum px-5 py-3 text-right text-fg-muted">{m.targetPct ? `${m.targetPct}%` : '—'}</td>
                      <td className="px-5 py-3">
                        {m.cost ? <UtilisationBar pct={(m.marginPct / Math.max(1, m.targetPct)) * 100} lowIsBad className="w-32" /> : <span className="text-fg-subtle">not costed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {view === 'supply' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Deliveries on time" value={fmtPercent(punctuality.onTimePct, 0)} sub={`${punctuality.onTime} of ${punctuality.total}`} accent={punctuality.onTimePct > 80 ? 'success' : 'warning'} />
            <KpiCard label="Average days late" value={fmtNumber(punctuality.averageDaysLate, 1)} sub="across every delivery" accent="warning" />
            <KpiCard
              label="Spent with suppliers"
              value={fmtCurrency(spend.reduce((a, s) => a + s.received, 0), 'IDR', { compact: true })}
              sub={`${spend.length} suppliers used`}
              accent="primary"
            />
            <KpiCard
              label="Still on order"
              value={fmtCurrency(spend.reduce((a, s) => a + s.open, 0), 'IDR', { compact: true })}
              sub="promised, not yet delivered"
              accent="accent"
            />
          </div>

          <Card>
            <CardHeader title="Supplier scorecard" description="Built from what they actually did: deliveries against the promised date, and quantities rejected on arrival." />
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[900px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                    <th className="px-5 py-2.5 font-medium">Supplier</th>
                    <th className="px-5 py-2.5 font-medium">Type</th>
                    <th className="px-5 py-2.5 text-right font-medium">Orders</th>
                    <th className="px-5 py-2.5 text-right font-medium">Ordered</th>
                    <th className="px-5 py-2.5 text-right font-medium">Still open</th>
                    <th className="px-5 py-2.5 text-right font-medium">On time</th>
                    <th className="px-5 py-2.5 text-right font-medium">Rejected</th>
                    <th className="px-5 py-2.5 font-medium">Composite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scores
                    .filter((s) => s.orders > 0)
                    .sort((a, b) => b.value - a.value)
                    .map((s) => (
                      <tr key={s.supplier.id} className="hover:bg-bg-muted/50">
                        <td className="px-5 py-3">
                          <p className="font-medium text-fg">{s.supplier.name}</p>
                          <p className="text-[11.5px] text-fg-muted">{s.supplier.city}</p>
                        </td>
                        <td className="px-5 py-3"><StatusBadge value={s.supplier.status} size="sm" /></td>
                        <td className="tnum px-5 py-3 text-right">{s.orders}</td>
                        <td className="tnum px-5 py-3 text-right">{fmtCurrency(s.value, 'IDR', { compact: true })}</td>
                        <td className="tnum px-5 py-3 text-right text-fg-muted">{fmtCurrency(s.openValue, 'IDR', { compact: true })}</td>
                        <td className={cn('tnum px-5 py-3 text-right', s.onTimePct < 70 ? 'text-danger' : s.onTimePct < 88 ? 'text-warning-soft-fg' : 'text-success')}>
                          {s.deliveries ? fmtPercent(s.onTimePct, 0) : '—'}
                        </td>
                        <td className={cn('tnum px-5 py-3 text-right', s.rejectRatePct > 5 ? 'text-danger' : 'text-fg-muted')}>
                          {s.deliveredQty ? fmtPercent(s.rejectRatePct, 1) : '—'}
                        </td>
                        <td className="px-5 py-3"><UtilisationBar pct={s.composite} className="w-24" label={`${s.composite}/100`} /></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Late deliveries" description="Every receipt that arrived after the date its order promised." />
            <div className="divide-y divide-border">
              {punctuality.rows
                .filter((r) => r.daysLate > 0)
                .sort((a, b) => b.daysLate - a.daysLate)
                .slice(0, 12)
                .map((r) => (
                  <Link key={r.receipt.id} to={`/receipts/${r.receipt.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-bg-muted/60">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-fg">{r.receipt.code} · {r.receipt.supplierName}</p>
                      <p className="truncate text-[11.5px] text-fg-muted">
                        {r.po?.code} · expected {fmtDate(r.po?.expectedAt)} · arrived {fmtDate(r.receipt.receivedAt)}
                      </p>
                    </div>
                    <Badge size="sm" tone={r.daysLate > 14 ? 'danger' : 'warning'}>{r.daysLate}d late</Badge>
                  </Link>
                ))}
              {punctuality.rows.every((r) => r.daysLate <= 0) && (
                <p className="px-5 py-8 text-center text-[12.5px] text-fg-muted">Everything arrived on time.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {view === 'stock' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Stock at cost"
              value={fmtCurrency(positions.reduce((a, p) => a + p.value, 0), 'IDR', { compact: true })}
              sub={`${positions.filter((p) => p.onHand > 0).length} items with a position`}
              accent="primary"
            />
            <KpiCard
              label="Reserved to orders"
              value={fmtCurrency(positions.reduce((a, p) => a + p.reserved * p.item.standardCost, 0), 'IDR', { compact: true })}
              sub="spoken for and unavailable"
              accent="accent"
            />
            <KpiCard
              label="Idle stock"
              value={fmtCurrency(slow.reduce((a, p) => a + p.value, 0), 'IDR', { compact: true })}
              sub={`${slow.length} items untouched for ${store.settings.slowMovingDays} days`}
              accent="warning"
            />
            <KpiCard
              label="Quarantined"
              value={fmtCurrency(positions.reduce((a, p) => a + p.quarantined * p.item.standardCost, 0), 'IDR', { compact: true })}
              sub="rejected on arrival"
              accent="danger"
            />
          </div>

          <Card>
            <CardHeader
              title="Money standing still"
              description="Stock that has not moved in months, worst first. Every rupiah here was borrowed or earned before it was turned into a plank."
            />
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[720px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                    <th className="px-5 py-2.5 font-medium">Item</th>
                    <th className="px-5 py-2.5 font-medium">Category</th>
                    <th className="px-5 py-2.5 text-right font-medium">On hand</th>
                    <th className="px-5 py-2.5 text-right font-medium">Value</th>
                    <th className="px-5 py-2.5 text-right font-medium">Days since it moved</th>
                    <th className="px-5 py-2.5 text-right font-medium">Cover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {slow.slice(0, 20).map((p) => (
                    <tr key={p.item.id} className="hover:bg-bg-muted/50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-fg">{p.item.name}</p>
                        <p className="tnum text-[11.5px] text-fg-muted">{p.item.sku}</p>
                      </td>
                      <td className="px-5 py-3 text-fg-muted">{titleCase(p.item.category)}</td>
                      <td className="tnum px-5 py-3 text-right">{fmtNumber(p.onHand, 2)}</td>
                      <td className="tnum px-5 py-3 text-right font-medium">{fmtCurrency(p.value, 'IDR', { compact: true })}</td>
                      <td className="tnum px-5 py-3 text-right text-warning-soft-fg">{p.daysSinceMovement}</td>
                      <td className="tnum px-5 py-3 text-right text-fg-muted">
                        <Tooltip content="Days of cover at the rate this item has been consumed over the last quarter.">
                          <span>{p.coverDays > 900 ? 'no demand' : `${fmtNumber(p.coverDays, 0)}d`}</span>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                  {slow.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-fg-muted">Nothing has been standing still.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
