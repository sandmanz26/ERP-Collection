import * as React from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, Factory, Gauge, TriangleAlert } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useMfg } from '@/store/useMfg'
import { useCapacityLoad } from '@/hooks/useDerived'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'
import { addDays, daysBetween, TODAY } from '@/data/clock'
import { workOrderIsOpen } from '@/data/reference'

const WEEKS = 8

export function PlanningPage() {
  const { salesOrders, workOrders, products, customers, workCentres } = useMfg()
  const loads = useCapacityLoad(WEEKS * 7)

  /** eight weeks, each with the demand due in it and the hours it needs */
  const weeks = React.useMemo(() => {
    const out: {
      start: string
      end: string
      lines: { code: string; product: string; quantity: number; due: string; value: number; late: boolean }[]
      units: number
      value: number
      hours: number
    }[] = []
    for (let w = 0; w < WEEKS; w++) {
      const start = addDays(TODAY, w * 7)
      const end = addDays(TODAY, w * 7 + 6)
      const lines = salesOrders
        .filter((o) => !['CLOSED', 'CANCELLED', 'DRAFT'].includes(o.status))
        .flatMap((o) =>
          o.lines
            .filter((l) => {
              const due = l.confirmedDate ?? l.requestedDate
              return due >= start && due <= end
            })
            .map((l) => ({
              code: o.code,
              product: l.description,
              quantity: l.quantity - l.shippedQuantity,
              due: l.confirmedDate ?? l.requestedDate,
              value: (l.quantity - l.shippedQuantity) * l.unitPrice * o.fxRate,
              late: !!(l.atpDate && l.confirmedDate && l.atpDate > l.confirmedDate),
            })),
        )
      const hours = workOrders
        .filter((x) => workOrderIsOpen(x.status))
        .flatMap((x) => x.operations.filter((op) => op.status !== 'DONE' && op.plannedStart >= start && op.plannedStart <= end))
        .reduce((a, op) => a + op.plannedHours, 0)
      out.push({
        start, end, lines,
        units: lines.reduce((a, l) => a + l.quantity, 0),
        value: lines.reduce((a, l) => a + l.value, 0),
        hours,
      })
    }
    return out
  }, [salesOrders, workOrders])

  const weeklyCapacity = workCentres.filter((w) => w.active && w.kind !== 'KILN' && w.kind !== 'SUBCONTRACT')
    .reduce((a, w) => a + w.stations * w.hoursPerDay * 5, 0)
  const peakHours = Math.max(weeklyCapacity, ...weeks.map((w) => w.hours))
  const unplanned = salesOrders
    .filter((o) => ['CONFIRMED', 'IN_PRODUCTION'].includes(o.status))
    .flatMap((o) => o.lines.filter((l) => !workOrders.some((w) => w.salesOrderLineId === l.id)).map((l) => ({ o, l })))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><CalendarRange className="size-3" /> Planning</Badge>}
        title="Master schedule"
        description="Eight weeks of demand against the hours there are to build it with. The capacity line is the whole factory minus the kiln and the subcontractor, because neither is bought by the hour."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Units due, 8 weeks" value={fmtNumber(weeks.reduce((a, w) => a + w.units, 0))} icon={<Factory />} accent="primary" />
        <KpiCard label="Value due, 8 weeks" value={fmtCurrency(weeks.reduce((a, w) => a + w.value, 0), 'IDR', { compact: true })} icon={<CalendarRange />} accent="accent" />
        <KpiCard
          label="Weeks over capacity"
          value={fmtNumber(weeks.filter((w) => w.hours > weeklyCapacity).length)}
          icon={<Gauge />}
          accent={weeks.some((w) => w.hours > weeklyCapacity) ? 'danger' : 'success'}
          sub={`${fmtNumber(weeklyCapacity)} h a week available`}
        />
        <KpiCard
          label="Lines with no work order"
          value={fmtNumber(unplanned.length)}
          icon={<TriangleAlert />}
          accent={unplanned.length ? 'warning' : 'success'}
          sub={unplanned.length ? 'confirmed but not yet planned' : 'everything confirmed is planned'}
        />
      </div>

      <Card>
        <CardHeader
          icon={<CalendarRange />}
          title="Demand against capacity, week by week"
          description="Bars are the hours the released and planned orders need. The dashed line is what the floor can actually do."
        />
        <CardBody>
          <div className="flex h-52 items-end gap-2">
            {weeks.map((w) => {
              const over = w.hours > weeklyCapacity
              return (
                <div key={w.start} className="group relative flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="tnum text-[10.5px] font-medium text-fg-muted">{fmtNumber(w.hours, 0)}</span>
                  <div
                    className={`w-full rounded-t transition-colors ${over ? 'bg-danger' : w.hours > weeklyCapacity * 0.85 ? 'bg-warning' : 'bg-primary'}`}
                    style={{ height: `${Math.max(2, (w.hours / peakHours) * 100)}%` }}
                  />
                </div>
              )
            })}
          </div>
          <div
            className="relative -mt-px border-t border-dashed border-fg-subtle/70"
            style={{ marginBottom: 0 }}
          />
          <div className="mt-1.5 flex gap-2">
            {weeks.map((w) => (
              <div key={w.start} className="flex-1 text-center">
                <p className="text-[10.5px] text-fg-subtle">{fmtDate(w.start, 'short')}</p>
              </div>
            ))}
          </div>
          <Because className="mt-3">
            Capacity line at {fmtNumber(weeklyCapacity)} hours a week.{' '}
            {weeks.some((x) => x.hours > weeklyCapacity)
              ? `Week of ${fmtDate(weeks.find((x) => x.hours > weeklyCapacity)!.start)} is over it. Something moves, or a date does.`
              : 'No week is over it, though the bottleneck centre may still be — an average hides a booth.'}
          </Because>
        </CardBody>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader icon={<CalendarRange />} title="What is due, week by week" />
          <CardBody className="p-0">
            <div className="divide-y divide-border">
              {weeks.filter((w) => w.lines.length > 0).map((w) => (
                <div key={w.start} className="px-4 py-3">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-fg">
                      {fmtDate(w.start)} – {fmtDate(w.end)}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="tnum text-[11.5px] text-fg-muted">{fmtNumber(w.units)} units</span>
                      <span className="tnum text-[11.5px] text-fg-muted">{fmtCurrency(w.value, 'IDR', { compact: true })}</span>
                      <span className={`tnum text-[11.5px] font-medium ${w.hours > weeklyCapacity ? 'text-danger' : 'text-fg-muted'}`}>
                        {fmtNumber(w.hours, 0)} h
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {w.lines.map((l, i) => (
                      <div key={`${l.code}_${i}`} className="flex items-center justify-between gap-3">
                        <span className="truncate text-[12px] text-fg-muted">
                          <span className="font-mono text-fg">{l.code}</span> · {l.product} × {fmtNumber(l.quantity)}
                        </span>
                        {l.late && (
                          <Tooltip content="Promised earlier than the plan supports.">
                            <Badge tone="danger" size="sm">at risk</Badge>
                          </Tooltip>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader icon={<Gauge />} title="Where the hours land" description="The same eight weeks, split across the centres that do the work." />
            <CardBody className="space-y-3">
              {loads.slice(0, 7).map((l) => (
                <div key={l.workCentre.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="truncate text-[12px] text-fg">{l.workCentre.name}</span>
                    <span className={`tnum text-[11.5px] font-medium ${l.utilisation > 100 ? 'text-danger' : 'text-fg-muted'}`}>
                      {fmtPercent(l.utilisation, 0)}
                    </span>
                  </div>
                  <Progress value={Math.min(100, l.utilisation)} tone={l.utilisation > 100 ? 'danger' : l.utilisation > 85 ? 'warning' : 'primary'} size="sm" />
                </div>
              ))}
              <Separator />
              <Because>
                A factory can be at 70% overall and still miss every date, because the work does not queue at the average — it
                queues at {loads[0]?.workCentre.name ?? 'the bottleneck'}.
              </Because>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<TriangleAlert />} title="Confirmed but not planned" description="Order lines with no work order behind them." />
            <CardBody className="p-0">
              {unplanned.length === 0 && (
                <div className="px-4 py-6 text-center text-[12.5px] text-fg-muted">Every confirmed line has a work order.</div>
              )}
              <div className="divide-y divide-border">
                {unplanned.map(({ o, l }) => {
                  const customer = customers.find((c) => c.id === o.customerId)
                  const due = l.confirmedDate ?? l.requestedDate
                  const product = products.find((p) => p.id === l.productId)
                  return (
                    <Link key={l.id} to={`/orders/${o.id}`} className="block px-4 py-2.5 transition-colors hover:bg-bg-muted">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium text-fg">
                            <span className="font-mono">{o.code}</span> · {product?.name}
                          </p>
                          <p className="truncate text-[11.5px] text-fg-muted">{customer?.name} · {fmtNumber(l.quantity)} units</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="tnum text-[12px] text-fg">{fmtDate(due)}</p>
                          <p className="tnum text-[11px] text-fg-muted">{daysBetween(TODAY, due)} days out</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Factory />} title="Order pipeline" />
            <CardBody className="space-y-2">
              {(['PLANNED', 'FIRM', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD'] as const).map((st) => {
                const rows = workOrders.filter((w) => w.status === st)
                return (
                  <div key={st} className="flex items-center justify-between gap-3">
                    <StatusBadge value={st} size="sm" />
                    <span className="tnum text-[12.5px] font-medium text-fg">
                      {rows.length} · {fmtNumber(rows.reduce((a, w) => a + w.quantity, 0))} units
                    </span>
                  </div>
                )
              })}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
