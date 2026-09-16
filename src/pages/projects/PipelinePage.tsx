import * as React from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/misc'
import { StatusBadge } from '@/components/shared/status'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent, relativeLabel, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { negotiationEffort, pipeline, shipmentForecast, winLoss } from '@/lib/analytics'
import { PROJECT_STAGES } from '@/data/reference'
import { projectCbm } from '@/data/seed-projects'

const GROUPS = ['COMMERCIAL', 'PREPARATION', 'EXECUTION', 'CLOSING'] as const

export function PipelinePage() {
  const store = useErp()
  const [view, setView] = React.useState<'board' | 'effort' | 'forecast'>('board')

  const funnel = pipeline(store.projects)
  const wl = winLoss(store.projects)
  const effort = negotiationEffort(store.projects)
  const forecast = shipmentForecast(store.projects)

  return (
    <div className="min-h-0">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Commercial</Badge>}
        title="Pipeline"
        description="The order book laid out the way it actually moves: won or lost in the first four stages, then prepared, made and shipped. An order that stalls shows up as a column that will not empty."
        actions={
          <Tabs
            variant="pill"
            value={view}
            onChange={setView}
            items={[
              { value: 'board', label: 'Board' },
              { value: 'effort', label: 'What it cost to win' },
              { value: 'forecast', label: 'Ship forecast' },
            ]}
          />
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open enquiries" value={String(wl.open)} sub={fmtCurrency(wl.openValue, 'IDR', { compact: true })} accent="warning" />
        <KpiCard label="Won" value={String(wl.won)} sub={fmtCurrency(wl.wonValue, 'IDR', { compact: true })} accent="success" />
        <KpiCard label="Lost" value={String(wl.lost)} sub={fmtCurrency(wl.lostValue, 'IDR', { compact: true })} accent="danger" />
        <KpiCard label="Win rate" value={fmtPercent(wl.winRatePct, 0)} sub={Object.entries(wl.lossReasons).map(([k, v]) => `${titleCase(k)} ${v}`).join(' · ') || 'nothing lost'} accent="primary" />
      </div>

      {view === 'board' && (
        <div className="space-y-5">
          {GROUPS.map((group) => {
            const stages = funnel.filter((f) => f.stage.group === group)
            const total = stages.reduce((a, s) => a + s.valueIdr, 0)
            return (
              <div key={group}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">
                    {titleCase(group)}
                  </h2>
                  <span className="tnum text-[12px] text-fg-muted">
                    {stages.reduce((a, s) => a + s.count, 0)} orders · {fmtCurrency(total, 'IDR', { compact: true })}
                  </span>
                </div>
                <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2">
                  {stages.map((f) => (
                    <div key={f.stage.key} className="w-[268px] shrink-0">
                      <div className="rounded-t-xl border border-b-0 border-border bg-surface-sunken px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[12.5px] font-semibold text-fg">{f.stage.label}</p>
                          <Badge size="sm" tone={f.count ? 'primary' : 'neutral'}>{f.count}</Badge>
                        </div>
                        <p className="tnum mt-0.5 text-[11.5px] text-fg-muted">
                          {fmtCurrency(f.valueIdr, 'IDR', { compact: true })}
                        </p>
                      </div>
                      <div className="min-h-[120px] space-y-2 rounded-b-xl border border-border bg-bg-muted/40 p-2">
                        {f.projects.length === 0 && (
                          <p className="px-2 py-6 text-center text-[11.5px] text-fg-subtle">Empty</p>
                        )}
                        {f.projects.map((p) => (
                          <Link
                            key={p.id}
                            to={`/projects/${p.id}`}
                            className="block rounded-lg border border-border bg-surface p-2.5 shadow-card transition-shadow hover:shadow-pop"
                          >
                            <p className="truncate text-[12.5px] font-semibold text-fg">{p.code}</p>
                            <p className="truncate text-[11.5px] text-fg-muted">{p.buyerName}</p>
                            <p className="tnum mt-1 text-[11.5px] font-medium text-fg">
                              {fmtCurrency(p.contractValue, p.currency, { compact: true })}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                              <Badge size="sm" tone={p.priority === 'CRITICAL' ? 'danger' : p.priority === 'HIGH' ? 'warning' : 'neutral'}>
                                {titleCase(p.priority)}
                              </Badge>
                              <span className="text-[11px] text-fg-subtle">{relativeLabel(p.targetShipAt)}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'effort' && (
        <Card>
          <CardHeader
            title="What it took to win each order"
            description="Rounds of negotiation, days from first enquiry, how far our own price moved, and how many samples were made before anybody signed anything."
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[820px] text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                  <th className="px-5 py-2.5 font-medium">Order</th>
                  <th className="px-5 py-2.5 font-medium">Buyer</th>
                  <th className="px-5 py-2.5 text-right font-medium">Rounds</th>
                  <th className="px-5 py-2.5 text-right font-medium">Days arguing</th>
                  <th className="px-5 py-2.5 text-right font-medium">Our price moved</th>
                  <th className="px-5 py-2.5 text-right font-medium">Samples</th>
                  <th className="px-5 py-2.5 text-right font-medium">Drawing revisions</th>
                  <th className="px-5 py-2.5 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {effort.map((e) => (
                  <tr key={e.project.id} className="hover:bg-bg-muted/50">
                    <td className="px-5 py-3">
                      <Link to={`/projects/${e.project.id}`} className="font-medium text-fg hover:text-primary">
                        {e.project.code}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-fg-muted">{e.project.buyerName}</td>
                    <td className="tnum px-5 py-3 text-right">{e.rounds}</td>
                    <td className="tnum px-5 py-3 text-right">{e.days}</td>
                    <td className={cn('tnum px-5 py-3 text-right', e.priceMovementPct < -4 ? 'text-danger' : 'text-fg-muted')}>
                      {fmtPercent(e.priceMovementPct, 1)}
                    </td>
                    <td className="tnum px-5 py-3 text-right">{e.samples}</td>
                    <td className="tnum px-5 py-3 text-right">{e.drawingRevisions}</td>
                    <td className="px-5 py-3"><StatusBadge value={e.project.status} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CardBody className="border-t border-border">
            <p className="text-[12.5px] leading-relaxed text-fg-muted">
              A price that moved five per cent across six rounds is not a discount — it is the margin the estimator built,
              given away one concession at a time. Keeping the rounds attached to the order is the only way that argument
              can be had honestly when the job closes.
            </p>
          </CardBody>
        </Card>
      )}

      {view === 'forecast' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader title="Value by month of target ship" description="What is promised to leave the yard, and when." />
            <CardBody className="space-y-2.5">
              {forecast.map((m) => {
                const max = Math.max(...forecast.map((x) => x.valueIdr), 1)
                return (
                  <div key={m.key} className="flex items-center gap-3">
                    <span className="w-[64px] shrink-0 text-[12.5px] text-fg-muted">{m.label}</span>
                    <div className="relative h-7 min-w-0 flex-1 overflow-hidden rounded bg-surface-sunken">
                      <div className="h-full rounded bg-primary/70" style={{ width: `${Math.max(2, (m.valueIdr / max) * 100)}%` }} />
                      <span className="tnum absolute inset-y-0 left-2 flex items-center text-[11.5px] font-medium text-fg">
                        {m.count} orders · {fmtCurrency(m.valueIdr, 'IDR', { compact: true })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Volume to move" description="Cubic metres by order, which is what the container booking is made of." />
            <div className="divide-y divide-border">
              {store.projects
                .filter((p) => p.status === 'WON' && p.stage !== 'CLOSED')
                .sort((a, b) => (a.targetShipAt < b.targetShipAt ? -1 : 1))
                .map((p) => (
                  <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-bg-muted/60">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-fg">{p.code}</p>
                      <p className="truncate text-[11.5px] text-fg-muted">{p.buyerName} · {fmtDate(p.targetShipAt)}</p>
                    </div>
                    <span className="tnum shrink-0 text-[12.5px] font-medium text-fg">{fmtNumber(projectCbm(p), 1)} m³</span>
                  </Link>
                ))}
            </div>
          </Card>
        </div>
      )}

      {funnel.every((f) => f.count === 0) && <EmptyState title="The board is empty" />}
      <p className="mt-6 text-[11.5px] text-fg-subtle">
        {PROJECT_STAGES.length} stages in all. An order does not skip being costed on its way from a drawing to a container.
      </p>
    </div>
  )
}
