import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  AlertOctagon, ArrowRight, CalendarClock, Factory, Flame, Gauge, Layers, Ship, ShieldCheck,
  ShoppingCart, TrendingUp, TriangleAlert, Wallet,
} from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress, EmptyState, Separator } from '@/components/ui/misc'
import { Tabs } from '@/components/ui/tabs'
import { useMfg } from '@/store/useMfg'
import { useCapacityLoad, useExceptions, useMrpLines } from '@/hooks/useDerived'
import { exceptionGroup, exceptionLabel } from '@/lib/exceptions'
import { freeTimeState } from '@/lib/importing'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent, relativeLabel } from '@/lib/format'
import { daysBetween, TODAY } from '@/data/clock'
import { shipmentIsOpen, workOrderIsOpen } from '@/data/reference'
import { demurrageExposure, kilnMetrics, onTimeDelivery, qualityMetrics } from '@/lib/analytics'

const SEV_TONE = { CRITICAL: 'danger', HIGH: 'warning', MEDIUM: 'info', LOW: 'neutral' } as const

export function DashboardPage() {
  const s = useMfg()
  const exceptions = useExceptions()
  const mrpLines = useMrpLines()
  const loads = useCapacityLoad()
  const [group, setGroup] = React.useState<string>('ALL')

  const shortages = mrpLines.filter((l) => l.slackDays < 0 && l.grossRequirement > 0)
  const openShipments = s.shipments.filter((x) => shipmentIsOpen(x.status))
  const openWorkOrders = s.workOrders.filter((w) => workOrderIsOpen(w.status))
  const kiln = kilnMetrics(s.kilnBatches, s.lots)
  const dem = demurrageExposure(s.shipments)
  const quality = qualityMetrics(s.qcRecords)
  const otd = onTimeDelivery(s.salesOrders)

  const moneyAtRisk = exceptions.reduce((a, e) => a + (e.moneyAtRisk ?? 0), 0)
  const groups = Array.from(new Set(exceptions.map((e) => exceptionGroup(e.kind))))
  const visible = group === 'ALL' ? exceptions : exceptions.filter((e) => exceptionGroup(e.kind) === group)

  /* the three clocks, each with the single soonest thing that decides it */
  const nextPromise = s.salesOrders
    .flatMap((o) => o.lines.filter((l) => l.confirmedDate).map((l) => ({ o, l })))
    .filter(({ o }) => ['CONFIRMED', 'IN_PRODUCTION', 'PARTIALLY_SHIPPED'].includes(o.status))
    .sort((a, b) => (a.l.confirmedDate! < b.l.confirmedDate! ? -1 : 1))[0]

  /* the import clock points at the next berthing, not at one that already landed */
  const nextArrival = openShipments
    .filter((x) => x.eta && x.eta >= TODAY)
    .sort((a, b) => (a.eta! < b.eta! ? -1 : 1))[0]
    ?? openShipments.filter((x) => x.eta).sort((a, b) => (a.eta! > b.eta! ? -1 : 1))[0]

  const nextKiln = s.kilnBatches
    .filter((b) => b.status === 'DRYING' || b.status === 'CONDITIONING')
    .sort((a, b) => (a.plannedEnd < b.plannedEnd ? -1 : 1))[0]

  const bottleneckCentre = loads[0]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><Gauge className="size-3" /> Control Tower</Badge>}
        title="What is going to be late, and what it costs"
        description="A customer promise, a container on the water and a kiln that has not finished drying run at three different speeds. Everything below is the reconciliation — and every figure is derived from the book, not typed into a dashboard."
        meta={
          <>
            <span className="text-[12.5px] text-fg-muted">
              <strong className="text-fg">{exceptions.filter((e) => e.severity === 'CRITICAL').length}</strong> critical
            </span>
            <span className="text-[12.5px] text-fg-muted">
              <strong className="text-fg">{fmtCurrency(moneyAtRisk, 'IDR', { compact: true })}</strong> at risk
            </span>
            <span className="text-[12.5px] text-fg-muted">as at {fmtDate(TODAY, 'long')}</span>
          </>
        }
      />

      {/* ---------------- the three clocks ---------------- */}
      <div data-tour="tower-clocks" className="grid gap-3 lg:grid-cols-3">
        <ClockCard
          icon={<CalendarClock />}
          tone="primary"
          label="The promise clock"
          headline={nextPromise ? relativeLabel(nextPromise.l.confirmedDate) : '—'}
          detail={
            nextPromise
              ? `${nextPromise.o.code} · ${nextPromise.l.description} × ${fmtNumber(nextPromise.l.quantity)} due ${fmtDate(nextPromise.l.confirmedDate)}`
              : 'Nothing confirmed.'
          }
          because={
            nextPromise?.l.atpDate && nextPromise.l.atpDate > nextPromise.l.confirmedDate!
              ? `Promised ${daysBetween(nextPromise.l.confirmedDate!, nextPromise.l.atpDate)} days earlier than the plan supports, on the ${nextPromise.l.atpConstraint?.toLowerCase()} constraint.`
              : 'The plan supports the date that was given.'
          }
          to="/orders"
          stat={`${s.salesOrders.filter((o) => ['CONFIRMED', 'IN_PRODUCTION'].includes(o.status)).length} open orders`}
        />
        <ClockCard
          icon={<Ship />}
          tone="accent"
          label="The import clock"
          headline={nextArrival ? relativeLabel(nextArrival.eta) : '—'}
          detail={
            nextArrival
              ? `${nextArrival.code} · ${nextArrival.vessel ?? 'not booked'} berths ${fmtDate(nextArrival.eta)}`
              : 'Nothing on the water.'
          }
          because={`${openShipments.length} consignments in the pipeline. Clearance, not arrival, is what makes a container issuable.`}
          to="/imports"
          stat={dem.accruing > 0 ? `${fmtCurrency(dem.accruing, 'IDR', { compact: true })} demurrage accruing` : `${fmtCurrency(dem.paid, 'IDR', { compact: true })} demurrage paid to date`}
          statTone={dem.accruing > 0 ? 'danger' : 'neutral'}
        />
        <ClockCard
          icon={<Flame />}
          tone="warning"
          label="The kiln clock"
          headline={nextKiln ? relativeLabel(nextKiln.plannedEnd) : '—'}
          detail={
            nextKiln
              ? `${nextKiln.code} · ${nextKiln.species} in ${nextKiln.chamber}, closing ${fmtDate(nextKiln.plannedEnd)}`
              : 'No batch running.'
          }
          because={
            kiln.blockedVolume > 0
              ? `${fmtNumber(kiln.blockedVolume, 1)} m³ blocked at the moisture gate — nothing there may be cut at any price.`
              : 'Nothing blocked at the moisture gate.'
          }
          to="/kiln"
          stat={`${fmtCurrency(kiln.blockedValue, 'IDR', { compact: true })} of timber blocked`}
          statTone={kiln.blockedValue > 0 ? 'warning' : 'neutral'}
        />
      </div>

      {/* ---------------- KPIs ---------------- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Material shortages"
          value={fmtNumber(shortages.length)}
          icon={<Layers />}
          accent={shortages.length ? 'danger' : 'success'}
          sub={shortages.length ? (shortages[0].slackDays === -999 ? 'the worst has no cover at all' : `worst is ${-shortages[0].slackDays} days late`) : 'nothing late'}
          onClick={undefined}
        />
        <KpiCard
          label="Work orders open"
          value={fmtNumber(openWorkOrders.length)}
          icon={<Factory />}
          accent="primary"
          sub={`${openWorkOrders.filter((w) => w.operations.some((o) => o.status === 'BLOCKED')).length} blocked on the floor`}
        />
        <KpiCard
          label={bottleneckCentre ? `${bottleneckCentre.workCentre.name} load` : 'Capacity'}
          value={bottleneckCentre ? fmtPercent(bottleneckCentre.utilisation, 0) : '—'}
          icon={<Gauge />}
          accent={bottleneckCentre && bottleneckCentre.utilisation > 100 ? 'danger' : 'accent'}
          sub="the centre that decides the plan, next fortnight"
        />
        <KpiCard
          label="First-pass yield"
          value={fmtPercent(quality.firstPassYield, 1)}
          icon={<ShieldCheck />}
          accent={quality.firstPassYield >= s.settings.kpiTargets.firstPassYieldPercent ? 'success' : 'warning'}
          sub={`target ${s.settings.kpiTargets.firstPassYieldPercent}% · ${fmtCurrency(quality.costOfQuality, 'IDR', { compact: true })} cost of quality`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* ---------------- exceptions ---------------- */}
        <Card data-tour="tower-exceptions">
          <CardHeader
            icon={<TriangleAlert />}
            title="Exceptions"
            description="What it is, what it means, what to do, and what it costs if nobody does. The last part is what makes the list rank."
            actions={<Badge tone="danger" size="sm">{fmtCurrency(moneyAtRisk, 'IDR', { compact: true })} at risk</Badge>}
          />
          <div className="scrollbar-thin overflow-x-auto border-b border-border px-4 pt-2">
            <Tabs
              value={group}
              onChange={setGroup}
              className="w-max min-w-full border-b-0"
              items={[
                { value: 'ALL', label: 'All', count: exceptions.length },
                ...groups.map((g) => ({ value: g, label: g, count: exceptions.filter((e) => exceptionGroup(e.kind) === g).length })),
              ]}
            />
          </div>
          <CardBody className="p-0">
            {visible.length === 0 && (
              <EmptyState icon={<ShieldCheck />} title="Nothing needs attention" description="Every gate is satisfied and every clock is inside its promise." />
            )}
            <div className="divide-y divide-border">
              {visible.slice(0, 18).map((e) => (
                <div key={e.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <AlertOctagon
                        className={`mt-0.5 size-4 shrink-0 ${
                          e.severity === 'CRITICAL' ? 'text-danger' : e.severity === 'HIGH' ? 'text-warning' : 'text-fg-subtle'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold leading-snug text-fg">{e.title}</p>
                        <Because className="mt-1">{e.detail}</Because>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-fg">
                          <span className="font-medium text-primary">Do this — </span>
                          {e.remedy}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge tone={SEV_TONE[e.severity]} size="sm">{exceptionLabel(e.kind)}</Badge>
                      {e.moneyAtRisk ? (
                        <span className="tnum text-[12.5px] font-semibold text-danger">
                          {fmtCurrency(e.moneyAtRisk, 'IDR', { compact: true })}
                        </span>
                      ) : null}
                      {e.daysLate ? <span className="tnum text-[11.5px] text-fg-muted">{e.daysLate} days late</span> : null}
                      {e.link && (
                        <Link to={e.link} className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary hover:underline">
                          {e.entityLabel ?? 'Open'} <ArrowRight className="size-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* ---------------- right column ---------------- */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader icon={<Ship />} title="The import pipeline" description="Where every live consignment sits, and how long its free time has left." />
            <CardBody className="space-y-3 p-0">
              {openShipments.length === 0 && <EmptyState title="Nothing in the pipeline" />}
              <div className="divide-y divide-border">
                {openShipments.map((sh) => {
                  const ft = freeTimeState(sh)
                  const supplier = s.suppliers.find((x) => x.id === sh.supplierId)
                  return (
                    <Link key={sh.id} to={`/imports/${sh.id}`} className="block px-4 py-2.5 transition-colors hover:bg-bg-muted">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-semibold text-fg">{sh.code}</p>
                          <p className="truncate text-[11.5px] text-fg-muted">{supplier?.name}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {sh.lane !== 'PENDING' && <StatusBadge value={sh.lane} size="sm" />}
                          <StatusBadge value={sh.status} size="sm" />
                        </div>
                      </div>
                      {ft.running && (
                        <p className={`mt-1 text-[11.5px] ${ft.chargeableDays > 0 ? 'font-medium text-danger' : 'text-warning'}`}>
                          {ft.chargeableDays > 0
                            ? `${ft.chargeableDays} day${ft.chargeableDays === 1 ? '' : 's'} past free time — ${fmtCurrency(ft.accrued, 'IDR', { compact: true })} accrued`
                            : `${ft.daysRemaining} day${ft.daysRemaining === 1 ? '' : 's'} of free time left`}
                        </p>
                      )}
                      {!ft.running && sh.eta && (
                        <p className="mt-1 text-[11.5px] text-fg-muted">Berths {fmtDate(sh.eta)} · {relativeLabel(sh.eta)}</p>
                      )}
                    </Link>
                  )
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Layers />} title="Work-centre load" description="Next fortnight, loaded hours against available." />
            <CardBody className="space-y-3">
              {loads.slice(0, 6).map((l) => (
                <div key={l.workCentre.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="truncate text-[12.5px] font-medium text-fg">{l.workCentre.name}</span>
                    <span className={`tnum text-[12px] font-semibold ${l.utilisation > 100 ? 'text-danger' : l.utilisation > 85 ? 'text-warning' : 'text-fg-muted'}`}>
                      {fmtPercent(l.utilisation, 0)}
                    </span>
                  </div>
                  <Progress value={Math.min(100, l.utilisation)} tone={l.utilisation > 100 ? 'danger' : l.utilisation > 85 ? 'warning' : 'primary'} />
                </div>
              ))}
              <Separator />
              <Because>
                {loads[0] && loads[0].utilisation > 100
                  ? `${loads[0].workCentre.name} is over capacity. ${loads[0].workCentre.kind === 'FINISHING' ? 'A booth plus a cure time is a serial constraint — overtime buys less here than anywhere else.' : 'Re-sequence before the dates slip on their own.'}`
                  : 'No centre is over capacity in the window.'}
              </Because>
              <Button asChild variant="secondary" size="sm" className="w-full">
                <Link to="/capacity">Open capacity board</Link>
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<TrendingUp />} title="Where the book stands" />
            <CardBody className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Metric label="On-time delivery" value={fmtPercent(otd.percent, 0)} sub={`${otd.onTime} of ${otd.total} shipped lines`} />
              <Metric label="Scrap cost, 90 days" value={fmtCurrency(quality.byPoint.reduce((a, p) => a + p.cost, 0), 'IDR', { compact: true })} sub="material plus the operations already spent" />
              <Metric label="Shortages, imported" value={fmtNumber(shortages.filter((x) => x.imported).length)} sub={`${shortages.length} in total`} />
              <Metric label="Kiln batches in band" value={fmtPercent(kiln.inBandPercent, 0)} sub={`${kiln.running} running now`} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Wallet />} title="Quick jumps" />
            <CardBody className="grid grid-cols-2 gap-2">
              {[
                { to: '/mrp', label: 'MRP run', icon: <Layers /> },
                { to: '/work-orders', label: 'Work orders', icon: <Factory /> },
                { to: '/customs', label: 'Customs', icon: <Ship /> },
                { to: '/orders', label: 'Sales orders', icon: <ShoppingCart /> },
              ].map((x) => (
                <Button key={x.to} asChild variant="secondary" size="sm" className="justify-start">
                  <Link to={x.to}>
                    {x.icon}
                    {x.label}
                  </Link>
                </Button>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ClockCard({
  icon, tone, label, headline, detail, because, to, stat, statTone = 'neutral',
}: {
  icon: React.ReactNode
  tone: 'primary' | 'accent' | 'warning'
  label: string
  headline: string
  detail: string
  because: string
  to: string
  stat: string
  statTone?: 'neutral' | 'danger' | 'warning'
}) {
  const accents = {
    primary: 'bg-primary-soft text-primary-soft-fg',
    accent: 'bg-accent-soft text-accent-soft-fg',
    warning: 'bg-warning-soft text-warning-soft-fg',
  }
  return (
    <Link to={to} className="group rounded-xl border border-border bg-surface p-4 shadow-card transition-shadow hover:border-border-strong hover:shadow-pop">
      <div className="flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-[18px] ${accents[tone]}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-fg-subtle">{label}</p>
          <p className="mt-1 text-[19px] font-semibold leading-none tracking-[-0.02em] text-fg">{headline}</p>
          <p className="mt-1.5 truncate text-[12px] text-fg-muted">{detail}</p>
        </div>
      </div>
      <Because className="mt-3 border-t border-border pt-2.5">{because}</Because>
      <p className={`mt-2 text-[11.5px] font-medium ${statTone === 'danger' ? 'text-danger' : statTone === 'warning' ? 'text-warning' : 'text-fg-subtle'}`}>{stat}</p>
    </Link>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-fg-subtle">{label}</p>
      <p className="tnum mt-1 text-[17px] font-semibold leading-none tracking-[-0.02em] text-fg">{value}</p>
      <p className="mt-1 text-[11.5px] leading-snug text-fg-muted">{sub}</p>
    </div>
  )
}
