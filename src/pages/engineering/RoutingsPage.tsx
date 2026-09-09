import * as React from 'react'
import { Clock, Gauge, Route as RouteIcon, Users } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useMfg } from '@/store/useMfg'
import { useCapacityLoad } from '@/hooks/useDerived'
import { INSPECTION_POINTS, workCentreKindLabel, WORK_CENTRE_KINDS } from '@/data/reference'
import { fmtCurrency, fmtNumber, fmtPercent } from '@/lib/format'

export function RoutingsPage() {
  const { routings, products, workCentres, suppliers } = useMfg()
  const loads = useCapacityLoad()
  const routed = products.filter((p) => routings.some((r) => r.productId === p.id))
  const [productId, setProductId] = React.useState(routed[0]?.id ?? '')

  const routing = routings.find((r) => r.productId === productId)
  const product = products.find((p) => p.id === productId)
  const qty = 100

  const totalHours = routing
    ? routing.operations.reduce((a, op) => a + (op.setupMinutes + op.runMinutesPerUnit * qty) / 60, 0)
    : 0
  const totalQueue = routing ? routing.operations.reduce((a, op) => a + op.queueHours, 0) : 0

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><RouteIcon className="size-3" /> Engineering</Badge>}
        title="Routings & work centres"
        description="What each product costs in hours, and on which machine. Queue time here is physics rather than backlog — lacquer curing and glue setting cannot be shortened by adding a shift."
        actions={
          <Select
            value={productId}
            onChange={setProductId}
            options={routed.map((p) => ({ value: p.id, label: `${p.sku} · ${p.name}` }))}
            className="w-[320px]"
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Work centres" value={fmtNumber(workCentres.filter((w) => w.active).length)} icon={<RouteIcon />} accent="primary" />
        <KpiCard
          label="Bottleneck"
          value={loads[0]?.workCentre.name ?? '—'}
          icon={<Gauge />}
          accent={loads[0] && loads[0].utilisation > 100 ? 'danger' : 'accent'}
          sub={loads[0] ? `${fmtPercent(loads[0].utilisation, 0)} loaded next fortnight` : ''}
        />
        <KpiCard label={`Hours for ${qty} units`} value={fmtNumber(totalHours, 1)} icon={<Clock />} accent="primary" sub={`${routing?.operations.length ?? 0} operations`} />
        <KpiCard
          label="Cure & queue time"
          value={`${fmtNumber(totalQueue, 0)} h`}
          icon={<Clock />}
          accent="warning"
          sub="physics, not backlog — no shift pattern shortens it"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            icon={<RouteIcon />}
            title={product ? `${product.sku} · ${product.name}` : 'Routing'}
            description={`Setup plus run for a batch of ${qty}, in the order the floor works it.`}
          />
          <CardBody className="p-0">
            {!routing && <EmptyState title="No routing on file" />}
            {routing && (
              <div className="divide-y divide-border">
                {routing.operations.map((op) => {
                  const wc = workCentres.find((w) => w.id === op.workCentreId)
                  const hours = (op.setupMinutes + op.runMinutesPerUnit * qty) / 60
                  const sub = op.subcontractorId ? suppliers.find((x) => x.id === op.subcontractorId) : undefined
                  return (
                    <div key={op.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="tnum mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-neutral-soft text-[11.5px] font-semibold text-neutral-soft-fg">
                            {op.operationNo}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-fg">{op.name}</p>
                            <p className="text-[11.5px] text-fg-muted">
                              {wc?.name}
                              {op.subcontracted && sub && ` · subcontracted to ${sub.name} (${fmtPercent(sub.onTimePercent, 0)} on time)`}
                            </p>
                            {op.instruction && <Because className="mt-1">{op.instruction}</Because>}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-4 text-right">
                          <div>
                            <p className="text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">Setup</p>
                            <p className="tnum text-[12.5px]">{op.setupMinutes} min</p>
                          </div>
                          <div>
                            <p className="text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">Run / unit</p>
                            <p className="tnum text-[12.5px]">{op.runMinutesPerUnit} min</p>
                          </div>
                          <div>
                            <p className="text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">Batch</p>
                            <p className="tnum text-[12.5px] font-semibold text-fg">{fmtNumber(hours, 1)} h</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {op.queueHours > 0 && (
                          <Tooltip content="Waiting that is physics — a coat has to cure before the next one goes on, and glue has to set before the clamps come off.">
                            <Badge tone="purple" size="sm"><Clock className="size-3" /> {op.queueHours} h cure / queue</Badge>
                          </Tooltip>
                        )}
                        {op.inspectionAfter !== 'NONE' && (
                          <Tooltip content={INSPECTION_POINTS.find((x) => x.value === op.inspectionAfter)?.label ?? ''}>
                            <Badge tone="info" size="sm">{op.inspectionAfter === 'FINAL' ? 'Final inspection' : 'In-process check'}</Badge>
                          </Tooltip>
                        )}
                        {op.subcontracted && (
                          <Badge tone="warning" size="sm">
                            Leaves the building · {fmtCurrency(op.subcontractCostPerUnit ?? 0, 'IDR', { compact: true })}/unit
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<Users />} title="Work centres" description="Capacity, rates and who runs it. Load is against the next fortnight." />
          <CardBody className="p-0">
            <div className="divide-y divide-border">
              {loads.map((l) => {
                const wc = l.workCentre
                return (
                  <div key={wc.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold text-fg">{wc.name}</p>
                        <p className="truncate text-[11.5px] text-fg-muted">
                          {workCentreKindLabel(wc.kind)} · {wc.stations} station{wc.stations === 1 ? '' : 's'} × {wc.hoursPerDay} h · {wc.supervisor}
                        </p>
                      </div>
                      <span className={`tnum shrink-0 text-[12.5px] font-semibold ${l.utilisation > 100 ? 'text-danger' : l.utilisation > 85 ? 'text-warning' : 'text-fg-muted'}`}>
                        {fmtPercent(l.utilisation, 0)}
                      </span>
                    </div>
                    <Progress
                      className="mt-2"
                      value={Math.min(100, l.utilisation)}
                      tone={l.utilisation > 100 ? 'danger' : l.utilisation > 85 ? 'warning' : 'primary'}
                      size="sm"
                    />
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="tnum text-[11px] text-fg-muted">
                        {fmtNumber(l.loadedHours, 0)} / {fmtNumber(l.availableHours, 0)} h · {l.openOperations} operations queued
                      </span>
                      <span className="tnum text-[11px] text-fg-subtle">
                        {fmtCurrency(wc.labourRatePerHour, 'IDR', { compact: true })} + {fmtCurrency(wc.overheadRatePerHour, 'IDR', { compact: true })} /h
                      </span>
                    </div>
                    {wc.note && <Because className="mt-1.5 text-[11px]">{wc.note}</Because>}
                  </div>
                )
              })}
            </div>
          </CardBody>
          <CardBody className="border-t border-border">
            <Because>
              {WORK_CENTRE_KINDS.find((k) => k.value === 'FINISHING')?.hint}
            </Because>
            <Separator className="my-2.5" />
            <div className="flex flex-wrap gap-1.5">
              {WORK_CENTRE_KINDS.map((k) => (
                <Tooltip key={k.value} content={k.hint}>
                  <span><StatusBadge value={k.value} size="sm" /></span>
                </Tooltip>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
