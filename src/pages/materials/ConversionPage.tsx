import * as React from 'react'
import { ArrowRight, Combine, Recycle, Scissors, TriangleAlert } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, MetaRow, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import type { ConversionOrder } from '@/data/types'
import { conversionCost, conversionIsOpen, conversionSummary, conversionYield, remnantState } from '@/lib/conversion'
import {
  CONVERSION_KINDS, CONVERSION_ROUTES, CONVERSION_STATUSES, conversionKindMeta,
} from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'
import { TODAY } from '@/data/clock'

export function ConversionPage() {
  const {
    conversionOrders, items, workCentres, suppliers, remnants,
    releaseConversion, issueConversionMaterial, completeConversion,
  } = useMfg()
  const toast = useToast()
  const [kind, setKind] = React.useState<string[]>([])
  const [route, setRoute] = React.useState<string[]>([])
  const [selectedId, setSelectedId] = React.useState(
    conversionOrders.find((o) => conversionIsOpen(o.status))?.id ?? conversionOrders[0]?.id ?? '',
  )

  const s = conversionSummary(conversionOrders, workCentres)
  const selected = conversionOrders.find((o) => o.id === selectedId) ?? conversionOrders[0]
  const item = (id: string) => items.find((x) => x.id === id)

  const columns: Column<ConversionOrder>[] = [
    {
      key: 'code', header: 'Order', width: 'min-w-[230px]', pinned: true, sortable: true, sortValue: (o) => o.code,
      cell: (o) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{o.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">
            {conversionKindMeta(o.kind)?.indonesian} · {o.route === 'IN_HOUSE' ? workCentres.find((w) => w.id === o.workCentreId)?.name : suppliers.find((x) => x.id === o.supplierId)?.name}
          </p>
        </div>
      ),
      exportValue: (o) => o.code,
    },
    {
      key: 'status', header: 'Status', width: 'w-[170px]', sortable: true, sortValue: (o) => o.status,
      cell: (o) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Tooltip content={CONVERSION_STATUSES.find((x) => x.value === o.status)?.hint ?? ''}>
            <span><StatusBadge value={o.status} size="sm" /></span>
          </Tooltip>
          {o.route === 'SUBCONTRACT' && <Badge tone="warning" size="sm">maklon</Badge>}
        </div>
      ),
      exportValue: (o) => o.status,
    },
    {
      key: 'what', header: 'What it turns into what', width: 'min-w-[340px]',
      headerHint: 'Inputs on the left, output on the right. The units change, which is the whole reason this step needs an order of its own.',
      cell: (o) => {
        const primary = o.outputs.find((x) => x.role === 'PRIMARY')
        return (
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1">
              {o.inputs.map((i) => (
                <p key={i.id} className="truncate text-[12px] text-fg">
                  {fmtNumber(i.issuedQuantity || i.plannedQuantity, 2)} {i.uom} · {item(i.itemId)?.code ?? i.description}
                  {i.remnantIds.length > 0 && (
                    <span className="ml-1.5 text-success">+{i.remnantIds.length} off the rack</span>
                  )}
                </p>
              ))}
            </div>
            <ArrowRight className="size-3.5 shrink-0 text-fg-subtle" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-fg">
                {fmtNumber(primary ? primary.producedQuantity || primary.plannedQuantity : 0, 2)} {primary?.uom} · {item(primary?.itemId ?? '')?.code ?? '—'}
              </p>
              {o.outputs.filter((x) => x.role === 'BY_PRODUCT').map((x) => (
                <p key={x.id} className="truncate text-[11px] text-fg-muted">
                  + {fmtNumber(x.producedQuantity || x.plannedQuantity, 2)} {x.uom} offcut at {fmtPercent(x.valueFactor * 100, 0)} value
                </p>
              ))}
            </div>
          </div>
        )
      },
      exportValue: (o) => `${o.inputs.map((i) => i.description).join(' + ')} → ${o.outputs.find((x) => x.role === 'PRIMARY')?.description ?? ''}`,
    },
    {
      key: 'yield', header: 'Yield vs standard', align: 'right', width: 'w-[165px]', sortable: true,
      headerHint: 'Output per unit of input, against the standard the recipe carries. The two sides of a conversion are rarely in the same unit — 8.6 parts out of a sheet is a yield just as much as 0.62 m³ out of a m³ — so what is compared is attainment against standard, not one quantity over the other.',
      sortValue: (o) => conversionYield(o).attainment,
      cell: (o) => {
        if (o.status !== 'COMPLETED') return <span className="text-[12px] text-fg-subtle">—</span>
        const y = conversionYield(o)
        return (
          <Tooltip content={y.note}>
            <div>
              <p className={`tnum text-[12.5px] font-semibold ${y.short ? 'text-danger' : 'text-success'}`}>{fmtPercent(y.attainment * 100, 1)}</p>
              <p className="tnum text-[11px] text-fg-muted">
                {fmtNumber(y.actual, y.actual < 10 ? 2 : 1)} / {fmtNumber(y.standard, y.standard < 10 ? 2 : 1)} per {o.inputs[0]?.uom}
              </p>
            </div>
          </Tooltip>
        )
      },
      exportValue: (o) => conversionYield(o).actual,
    },
    {
      key: 'recovery', header: 'Recovered', align: 'right', width: 'w-[135px]',
      headerHint: 'Of the material value that went in, how much came back out as usable offcut rather than dust. Measured in money, because the units on the two sides never agree.',
      cell: (o) => {
        if (o.status !== 'COMPLETED') return <span className="text-[12px] text-fg-subtle">—</span>
        const y = conversionYield(o)
        return y.recoveryPercent > 0
          ? <span className="tnum text-[12.5px] text-success">{fmtPercent(y.recoveryPercent, 0)}</span>
          : <span className="text-[12px] text-fg-muted">nothing racked</span>
      },
      exportValue: (o) => conversionYield(o).recoveryPercent,
    },
    {
      key: 'cost', header: 'Output cost', align: 'right', width: 'w-[150px]', sortable: true,
      headerHint: 'What a unit of the output carries: the material, plus the conversion, less the credit given to the offcuts.',
      sortValue: (o) => conversionCost(o, workCentres).outputUnitCost,
      cell: (o) => {
        const c = conversionCost(o, workCentres)
        return (
          <div>
            <p className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(c.outputUnitCost, 'IDR', { compact: true })}</p>
            {c.byProductCredit > 0 && (
              <p className="tnum text-[11px] text-success">less {fmtCurrency(c.byProductCredit, 'IDR', { compact: true })} credit</p>
            )}
          </div>
        )
      },
      exportValue: (o) => Math.round(conversionCost(o, workCentres).outputUnitCost),
    },
    {
      key: 'due', header: 'Due', width: 'w-[135px]', sortable: true, sortValue: (o) => o.dueDate,
      cell: (o) => {
        const late = conversionIsOpen(o.status) && o.dueDate < TODAY
        return (
          <div>
            <p className={`tnum text-[12.5px] ${late ? 'font-semibold text-danger' : 'text-fg'}`}>{fmtDate(o.dueDate)}</p>
            <p className="tnum text-[11px] text-fg-muted">{o.completedAt ? `done ${fmtDate(o.completedAt, 'short')}` : o.actualStart ? `started ${fmtDate(o.actualStart, 'short')}` : 'not started'}</p>
          </div>
        )
      },
      exportValue: (o) => o.dueDate,
    },
  ]

  const advance = (o: ConversionOrder) => {
    if (o.status === 'PLANNED') {
      releaseConversion(o.id)
      toast.push({ title: `${o.code} released`, description: 'Material reserved; nothing has left the rack yet.', tone: 'info' })
    } else if (o.status === 'RELEASED') {
      issueConversionMaterial(o.id)
      const rack = o.inputs.flatMap((i) => i.remnantIds).length
      toast.push({
        title: `${o.code} — material issued`,
        description: rack ? `${rack} offcut(s) drawn off the rack rather than opening new stock.` : 'Stock has left the store. It is work in progress from here.',
        tone: 'success',
      })
    } else {
      const produced: Record<string, number> = {}
      o.outputs.forEach((x) => { produced[x.id] = x.plannedQuantity })
      completeConversion(o.id, produced)
      toast.push({ title: `${o.code} completed`, description: 'Output booked in and every offcut racked against it.', tone: 'success' })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Material conversion"
        description="The step between buying a cubic metre and building a wardrobe. Timber becomes blanks, a sheet becomes parts, and what falls off the end goes on a rack rather than into a skip — on our own floor or at somebody else's."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="In conversion"
          value={fmtNumber(s.open)}
          icon={<Combine />} accent="primary"
          sub={`${fmtCurrency(s.wipValue, 'IDR', { compact: true })} of material mid-change`}
        />
        <KpiCard
          label="Yield against standard"
          value={fmtPercent(s.averageYieldPercent, 1)}
          icon={<Scissors />}
          accent={s.belowYield ? 'warning' : 'success'}
          sub={s.belowYield ? `${fmtNumber(s.belowYield)} run(s) under their own standard` : 'every completed run met its standard'}
        />
        <KpiCard
          label="Lost to yield"
          value={fmtCurrency(s.yieldLossValue, 'IDR', { compact: true })}
          icon={<TriangleAlert />}
          accent={s.yieldLossValue > 0 ? 'danger' : 'success'}
          sub="material that went in and did not come out as anything"
        />
        <KpiCard
          label="Recovered as offcut"
          value={fmtPercent(s.recoveryPercent, 1)}
          icon={<Recycle />} accent="accent"
          sub="of the material value in, racked rather than burnt"
        />
      </div>

      {s.atSubcontractor > 0 && (
        <Card>
          <CardBody className="py-3">
            <p className="text-[12.5px] text-fg">
              <span className="font-semibold text-warning">{s.atSubcontractor}</span> conversion{s.atSubcontractor === 1 ? '' : 's'} running at a third party.{' '}
              <span className="text-fg-muted">
                The material is ours the whole time it is on their floor — it is not in any warehouse report, and it is not insured past our gate.
              </span>
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <DataTable
          data={conversionOrders}
          columns={columns}
          getId={(o) => o.id}
          getLabel={(o) => o.code}
          entityLabel="conversion order"
          exportName="conversion"
          storageKey="conversion"
          searchText={(o) => `${o.code} ${o.kind} ${o.operator} ${o.inputs.map((i) => i.description).join(' ')} ${o.outputs.map((x) => x.description).join(' ')}`}
          onRowClick={(o) => setSelectedId(o.id)}
          initialSort={{ key: 'due', dir: 'asc' }}
          rowTone={(o) => (conversionYield(o).short && o.status === 'COMPLETED' ? 'bg-danger-soft/25' : o.status === 'AT_SUBCONTRACTOR' ? 'bg-warning-soft/20' : undefined)}
          filters={[
            {
              key: 'kind', label: 'Kind', values: kind, onChange: setKind,
              options: CONVERSION_KINDS.map((x) => ({ value: x.value, label: x.label })),
              match: (o, v) => v.includes(o.kind),
            },
            {
              key: 'route', label: 'Run by', values: route, onChange: setRoute,
              options: CONVERSION_ROUTES.map((x) => ({ value: x.value, label: x.label })),
              match: (o, v) => v.includes(o.route),
            },
          ]}
        />

        <div className="flex flex-col gap-5">
          {!selected && <Card><CardBody><EmptyState title="Nothing to show" /></CardBody></Card>}
          {selected && (
            <>
              <Card>
                <CardHeader
                  icon={<Combine />}
                  title={selected.code}
                  description={conversionKindMeta(selected.kind)?.hint}
                  actions={<StatusBadge value={selected.status} size="sm" />}
                />
                <CardBody>
                  <MetaRow label="Process">{conversionKindMeta(selected.kind)?.label}</MetaRow>
                  <MetaRow label="Run by">
                    {selected.route === 'IN_HOUSE'
                      ? workCentres.find((w) => w.id === selected.workCentreId)?.name
                      : `${suppliers.find((x) => x.id === selected.supplierId)?.name} (maklon)`}
                  </MetaRow>
                  <MetaRow label="Operator">{selected.operator}</MetaRow>
                  {selected.labourHours > 0 && <MetaRow label="Hours booked">{fmtNumber(selected.labourHours)} h</MetaRow>}
                  {selected.serviceCost > 0 && <MetaRow label="Service charge">{fmtCurrency(selected.serviceCost)}</MetaRow>}
                  {selected.wasteQuantity > 0 && (
                    <MetaRow label="Genuinely gone">{fmtNumber(selected.wasteQuantity, 2)} {selected.inputs[0]?.uom}</MetaRow>
                  )}
                  {selected.note && (
                    <>
                      <Separator className="my-2.5" />
                      <Because>{selected.note}</Because>
                    </>
                  )}
                  {conversionIsOpen(selected.status) && selected.status !== 'AT_SUBCONTRACTOR' && (
                    <>
                      <Separator className="my-3" />
                      <Button size="sm" variant="primary" className="w-full" onClick={() => advance(selected)}>
                        {selected.status === 'PLANNED' ? 'Release' : selected.status === 'RELEASED' ? 'Issue material' : 'Book the output in'}
                      </Button>
                    </>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader icon={<ArrowRight />} title="In, out and left over" description="Three columns of the same piece of timber, in three different units." />
                <CardBody className="space-y-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-fg-subtle">Goes in</p>
                    {selected.inputs.map((i) => (
                      <div key={i.id} className="mt-1.5 rounded-lg border border-border bg-surface-sunken px-3 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 truncate text-[12.5px] text-fg">{i.description}</p>
                          <p className="tnum shrink-0 text-[12.5px] font-semibold text-fg">{fmtNumber(i.issuedQuantity || i.plannedQuantity, 2)} {i.uom}</p>
                        </div>
                        <p className="tnum mt-0.5 text-[11px] text-fg-muted">
                          at {fmtCurrency(i.unitCost, 'IDR', { compact: true })} / {i.uom}
                          {i.lotIds.length > 0 && ` · ${i.lotIds.length} lot(s)`}
                        </p>
                        {i.remnantIds.length > 0 && (
                          <p className="mt-1 text-[11.5px] leading-snug text-success">
                            {i.remnantIds.length} offcut{i.remnantIds.length === 1 ? '' : 's'} drawn off the rack —{' '}
                            {fmtNumber(
                              i.remnantIds.reduce((a, id) => a + (remnants.find((r) => r.id === id)?.quantity ?? 0), 0),
                              2,
                            )}{' '}
                            {i.uom} that was already cut and already paid for.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-fg-subtle">Comes out</p>
                    {selected.outputs.map((x) => (
                      <div key={x.id} className={`mt-1.5 rounded-lg border px-3 py-2 ${x.role === 'PRIMARY' ? 'border-border bg-surface-sunken' : 'border-success/25 bg-success-soft/25'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 truncate text-[12.5px] text-fg">{x.description}</p>
                          <p className="tnum shrink-0 text-[12.5px] font-semibold text-fg">{fmtNumber(x.producedQuantity || x.plannedQuantity, 2)} {x.uom}</p>
                        </div>
                        <p className="text-[11px] text-fg-muted">
                          {x.role === 'PRIMARY'
                            ? 'the output that was wanted'
                            : `usable offcut, carried at ${fmtPercent(x.valueFactor * 100, 0)} of the material it came from`}
                        </p>
                      </div>
                    ))}
                  </div>
                  {selected.status === 'COMPLETED' && (
                    <>
                      <Separator />
                      {(() => {
                        const y = conversionYield(selected)
                        return (
                          <div>
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-[12px] text-fg-muted">Yield against standard</span>
                              <span className={`tnum text-[12.5px] font-semibold ${y.short ? 'text-danger' : 'text-success'}`}>{fmtPercent(y.attainment * 100, 1)}</span>
                            </div>
                            <Progress className="mt-1.5" value={Math.min(100, y.attainment * 100)} tone={y.short ? 'danger' : 'success'} size="sm" />
                            <Because className="mt-2">{y.note}</Because>
                          </div>
                        )
                      })()}
                    </>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader icon={<Recycle />} title="What a unit ends up costing" description="The credit given to the offcuts comes off the output — otherwise the offcuts are free and the components look cheaper than they are." />
                <CardBody>
                  {(() => {
                    const c = conversionCost(selected, workCentres)
                    return (
                      <>
                        <MetaRow label="Material in">{fmtCurrency(c.inputValue, 'IDR', { compact: true })}</MetaRow>
                        {c.conversionCost > 0 && <MetaRow label="Labour & overhead">{fmtCurrency(c.conversionCost, 'IDR', { compact: true })}</MetaRow>}
                        {c.serviceCost > 0 && <MetaRow label="Maklon charge">{fmtCurrency(c.serviceCost, 'IDR', { compact: true })}</MetaRow>}
                        <MetaRow label="Less offcut credit">
                          <span className="text-success">−{fmtCurrency(c.byProductCredit, 'IDR', { compact: true })}</span>
                        </MetaRow>
                        <Separator className="my-2" />
                        <MetaRow label="Carried by the output">{fmtCurrency(c.netCostToPrimary, 'IDR', { compact: true })}</MetaRow>
                        <MetaRow label="Per unit">
                          <span className="text-primary">{fmtCurrency(c.outputUnitCost, 'IDR', { compact: true })}</span>
                        </MetaRow>
                      </>
                    )
                  })()}
                </CardBody>
              </Card>

              {remnants.filter((r) => r.sourceConversionId === selected.id).length > 0 && (
                <Card>
                  <CardHeader icon={<Recycle />} title="What it put on the rack" description="Traceable back to this run and to the lot before it." />
                  <CardBody className="space-y-2">
                    {remnants.filter((r) => r.sourceConversionId === selected.id).map((r) => {
                      const st = remnantState(r)
                      return (
                        <div key={r.id} className="rounded-lg border border-border px-3 py-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-mono text-[11.5px] font-semibold text-fg">{r.code}</p>
                              <p className="tnum truncate text-[11px] text-fg-muted">
                                {r.lengthMm ? `${r.lengthMm} × ${r.widthMm} × ${r.thicknessMm} mm · ` : ''}{fmtNumber(r.quantity, 2)} {r.uom}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="tnum text-[12px] font-semibold text-fg">{fmtCurrency(st.value, 'IDR', { compact: true })}</p>
                              <StatusBadge value={r.status} size="sm" />
                            </div>
                          </div>
                          <Because className="mt-1 text-[11px]">{st.usableFor}</Because>
                        </div>
                      )
                    })}
                  </CardBody>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
