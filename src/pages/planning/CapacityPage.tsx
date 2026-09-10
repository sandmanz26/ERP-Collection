import * as React from 'react'
import { Link } from 'react-router-dom'
import { Gauge, Layers, TriangleAlert } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Segmented } from '@/components/ui/checkbox'
import { EmptyState, Progress } from '@/components/ui/misc'
import { useMfg } from '@/store/useMfg'
import { capacityLoad } from '@/lib/production'
import { workCentreKindLabel } from '@/data/reference'
import { fmtDate, fmtNumber, fmtPercent } from '@/lib/format'
import { addDays, TODAY } from '@/data/clock'

export function CapacityPage() {
  const { workCentres, workOrders, products } = useMfg()
  const [window, setWindow] = React.useState<'7' | '14' | '30'>('14')
  const days = Number(window)
  const loads = React.useMemo(() => capacityLoad(workCentres, workOrders, TODAY, days), [workCentres, workOrders, days])
  const [selected, setSelected] = React.useState<string>(loads[0]?.workCentre.id ?? '')

  const chosen = loads.find((l) => l.workCentre.id === selected) ?? loads[0]
  const over = loads.filter((l) => l.utilisation > 100)
  const totalLoaded = loads.reduce((a, l) => a + l.loadedHours, 0)
  const totalAvail = loads.reduce((a, l) => a + l.availableHours, 0)

  /* day-by-day load for the chosen centre, so the shape of the problem is visible */
  const byDay = React.useMemo(() => {
    if (!chosen) return []
    const out: { date: string; hours: number }[] = []
    for (let i = 0; i < days; i++) {
      const date = addDays(TODAY, i)
      const hours = chosen.queue.filter((q) => q.plannedStart === date).reduce((a, q) => a + q.hours, 0)
      out.push({ date, hours })
    }
    return out
  }, [chosen, days])
  const dailyCapacity = chosen ? chosen.workCentre.stations * chosen.workCentre.hoursPerDay : 0
  const peak = Math.max(dailyCapacity, ...byDay.map((d) => d.hours))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Capacity & load"
        description="Loaded hours against available, per work centre. Capacity here is a gate rather than a chart: a work order cannot be scheduled past a centre’s hours, and the board names the one that decides the plan."
        actions={
          <Segmented
            value={window}
            onChange={(v) => setWindow(v)}
            options={[
              { value: '7', label: '7 days' },
              { value: '14', label: 'Fortnight' },
              { value: '30', label: '30 days' },
            ]}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Overall utilisation" value={fmtPercent(totalAvail ? (totalLoaded / totalAvail) * 100 : 0, 0)} icon={<Gauge />} accent="primary" sub={`${fmtNumber(totalLoaded, 0)} of ${fmtNumber(totalAvail, 0)} hours`} />
        <KpiCard
          label="Bottleneck"
          value={loads[0]?.workCentre.name ?? '—'}
          icon={<Gauge />}
          accent={loads[0] && loads[0].utilisation > 100 ? 'danger' : 'accent'}
          sub={loads[0] ? fmtPercent(loads[0].utilisation, 0) + ' loaded' : ''}
        />
        <KpiCard label="Over capacity" value={fmtNumber(over.length)} icon={<TriangleAlert />} accent={over.length ? 'danger' : 'success'} sub={over.length ? over.map((o) => o.workCentre.code).join(', ') : 'every centre inside its hours'} />
        <KpiCard label="Operations queued" value={fmtNumber(loads.reduce((a, l) => a + l.openOperations, 0))} icon={<Layers />} accent="primary" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader icon={<Layers />} title="Load by work centre" description="Click one to see what is queued on it." />
          <CardBody className="p-0">
            <div className="divide-y divide-border">
              {loads.map((l) => (
                <button
                  key={l.workCentre.id}
                  onClick={() => setSelected(l.workCentre.id)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-bg-muted ${selected === l.workCentre.id ? 'bg-primary-soft/40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-fg">{l.workCentre.name}</p>
                      <p className="truncate text-[11.5px] text-fg-muted">
                        {workCentreKindLabel(l.workCentre.kind)} · {l.openOperations} operations
                      </p>
                    </div>
                    <span className={`tnum shrink-0 text-[13px] font-semibold ${l.utilisation > 100 ? 'text-danger' : l.utilisation > 85 ? 'text-warning' : 'text-fg-muted'}`}>
                      {fmtPercent(l.utilisation, 0)}
                    </span>
                  </div>
                  <Progress
                    className="mt-2"
                    value={Math.min(100, l.utilisation)}
                    tone={l.utilisation > 100 ? 'danger' : l.utilisation > 85 ? 'warning' : 'primary'}
                    size="sm"
                  />
                  <p className="tnum mt-1.5 text-[11px] text-fg-muted">
                    {fmtNumber(l.loadedHours, 0)} h loaded · {fmtNumber(Math.max(0, l.availableHours - l.loadedHours), 0)} h spare
                  </p>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-5">
          {chosen && (
            <Card>
              <CardHeader
                icon={<Gauge />}
                title={`${chosen.workCentre.name} — day by day`}
                description={`${chosen.workCentre.stations} station${chosen.workCentre.stations === 1 ? '' : 's'} × ${chosen.workCentre.hoursPerDay} h = ${fmtNumber(dailyCapacity)} h a day. Anything above the line is a day that cannot happen as planned.`}
              />
              <CardBody>
                <div className="flex h-40 items-end gap-1">
                  {byDay.map((d) => {
                    const h = (d.hours / peak) * 100
                    const overCap = d.hours > dailyCapacity
                    return (
                      <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end">
                        <div
                          className={`w-full rounded-t transition-colors ${overCap ? 'bg-danger' : d.hours > 0 ? 'bg-primary' : 'bg-neutral-soft'}`}
                          style={{ height: `${Math.max(2, h)}%` }}
                        />
                        <span className="pointer-events-none absolute -top-6 hidden whitespace-nowrap rounded bg-overlay px-1.5 py-0.5 text-[10.5px] text-fg-inverse group-hover:block">
                          {fmtDate(d.date, 'short')} · {fmtNumber(d.hours, 1)} h
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="relative mt-1 border-t border-dashed border-danger/60 pt-1.5">
                  <span className="text-[11px] text-fg-muted">Daily capacity {fmtNumber(dailyCapacity)} h</span>
                </div>
                <Because className="mt-3">
                  {chosen.utilisation > 100
                    ? chosen.workCentre.kind === 'FINISHING'
                      ? 'Over capacity. A spray booth plus a cure time is a serial constraint — a second shift buys less here than anywhere else, because the coats still have to cure between them.'
                      : 'Over capacity. Add a shift, move work to another centre, or re-promise before the dates start slipping on their own.'
                    : 'Inside its hours for the window. The peaks are what to watch, not the average.'}
                </Because>
              </CardBody>
            </Card>
          )}

          {chosen && (
            <Card>
              <CardHeader title="What is queued" description="Every operation waiting on this centre, soonest first." />
              <CardBody className="p-0">
                {chosen.queue.length === 0 && <EmptyState title="Nothing queued" description="This centre is clear for the window." />}
                <div className="divide-y divide-border">
                  {chosen.queue.slice(0, 14).map((q) => {
                    const product = products.find((p) => p.id === q.workOrder.productId)
                    return (
                      <Link
                        key={`${q.workOrder.id}_${q.operationNo}`}
                        to={`/work-orders/${q.workOrder.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-bg-muted"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium text-fg">
                            <span className="font-mono">{q.workOrder.code}</span> · op {q.operationNo} {q.name}
                          </p>
                          <p className="truncate text-[11.5px] text-fg-muted">
                            {product?.name} × {fmtNumber(q.workOrder.quantity)} · starts {fmtDate(q.plannedStart)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5">
                          <StatusBadge value={q.status} size="sm" />
                          <span className="tnum text-[12px] font-semibold text-fg">{fmtNumber(q.hours, 1)} h</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
