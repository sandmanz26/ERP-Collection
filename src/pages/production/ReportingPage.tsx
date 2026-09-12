import * as React from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Gauge, Timer, TriangleAlert, Undo2, Users } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, MetaRow } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { Tabs } from '@/components/ui/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import type { ProductionEntry } from '@/data/types'
import { labourSummary, operationReports, reportedCompletion, returnSummary, scrapByOperation } from '@/lib/reporting'
import {
  defectLabel, DEFECT_CODES, DOWNTIME_REASONS, MATERIAL_RETURN_REASONS, OPERATION_SCRAP_TOLERANCE,
  PRODUCTION_ENTRY_KINDS, SHIFTS, workOrderIsOpen,
} from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'
import { TODAY } from '@/data/clock'

export function ReportingPage() {
  const {
    productionEntries, workOrders, workCentres, products, materialReturns, items,
    reportProduction, returnMaterial,
  } = useMfg()
  const toast = useToast()
  const [tab, setTab] = React.useState<'entries' | 'scrap' | 'returns'>('entries')

  const open = workOrders.filter((w) => workOrderIsOpen(w.status))
  const [woId, setWoId] = React.useState(open[0]?.id ?? workOrders[0]?.id ?? '')
  const workOrder = workOrders.find((w) => w.id === woId)
  const reports = workOrder ? operationReports(workOrder, productionEntries) : []
  const nextOp = reports.find((r) => r.good < (workOrder?.quantity ?? 0)) ?? reports[0]

  const [opNo, setOpNo] = React.useState<string>('')
  const [good, setGood] = React.useState('')
  const [scrap, setScrap] = React.useState('')
  const [rework, setRework] = React.useState('')
  const [hours, setHours] = React.useState('')
  const [defect, setDefect] = React.useState('')
  const [shift, setShift] = React.useState<ProductionEntry['shift']>('PAGI')
  const [downtime, setDowntime] = React.useState('')
  const [downtimeReason, setDowntimeReason] = React.useState('')

  const chosenOp = reports.find((r) => String(r.operationNo) === opNo) ?? nextOp
  const labour = labourSummary(productionEntries, workOrders)
  const scrapRows = scrapByOperation(productionEntries, workOrders)
  const returns = returnSummary(materialReturns, workOrders)
  const completion = workOrder ? reportedCompletion(workOrder, productionEntries) : undefined
  const overTolerance = scrapRows.filter((r) => r.scrapPercent > OPERATION_SCRAP_TOLERANCE * 100)

  const book = () => {
    if (!workOrder || !chosenOp) return
    const g = Number(good) || 0
    const sc = Number(scrap) || 0
    const rw = Number(rework) || 0
    const hr = Number(hours) || 0
    const dt = Number(downtime) || 0
    if (g + sc + rw + dt === 0) {
      toast.push({ title: 'Nothing to book', description: 'A booking needs pieces, hours or downtime against it.', tone: 'warning' })
      return
    }
    reportProduction({
      workOrderId: workOrder.id,
      operationNo: chosenOp.operationNo,
      workCentreId: chosenOp.workCentreId,
      kind: dt > 0 && g + sc + rw === 0 ? 'DOWNTIME' : 'OUTPUT',
      at: TODAY,
      shift,
      operator: workCentres.find((c) => c.id === chosenOp.workCentreId)?.supervisor ?? 'Operator',
      goodQuantity: g,
      scrapQuantity: sc,
      reworkQuantity: rw,
      defectCode: defect ? (defect as never) : undefined,
      labourHours: hr,
      downtimeHours: dt,
      downtimeReason: dt > 0 ? downtimeReason || 'Not stated' : undefined,
    })
    toast.push({
      title: `Booked on ${workOrder.code}`,
      description: sc > 0
        ? `${g} good and ${sc} scrap at operation ${chosenOp.operationNo}. The scrap is now in the yield figures and in the work order's actual cost.`
        : `${g} good at operation ${chosenOp.operationNo}.`,
      tone: 'success',
    })
    setGood(''); setScrap(''); setRework(''); setHours(''); setDefect(''); setDowntime(''); setDowntimeReason('')
  }

  const entryColumns: Column<ProductionEntry>[] = [
    {
      key: 'code', header: 'Booking', width: 'min-w-[200px]', pinned: true, sortable: true, sortValue: (e) => e.code,
      cell: (e) => {
        const wo = workOrders.find((w) => w.id === e.workOrderId)
        return (
          <div className="min-w-0">
            <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{e.code}</p>
            <Link to={`/work-orders/${e.workOrderId}`} className="truncate font-mono text-[11.5px] text-primary hover:underline">
              {wo?.code} · op {e.operationNo}
            </Link>
          </div>
        )
      },
      exportValue: (e) => e.code,
    },
    {
      key: 'kind', header: 'Kind', width: 'w-[130px]', sortable: true, sortValue: (e) => e.kind,
      cell: (e) => (
        <Tooltip content={PRODUCTION_ENTRY_KINDS.find((k) => k.value === e.kind)?.hint ?? ''}>
          <span>
            <Badge tone={e.kind === 'DOWNTIME' ? 'danger' : e.kind === 'REWORK' ? 'warning' : 'neutral'} size="sm">
              {PRODUCTION_ENTRY_KINDS.find((k) => k.value === e.kind)?.label}
            </Badge>
          </span>
        </Tooltip>
      ),
      exportValue: (e) => e.kind,
    },
    {
      key: 'centre', header: 'Work centre', width: 'min-w-[170px]',
      cell: (e) => <span className="truncate text-[12.5px] text-fg-muted">{workCentres.find((c) => c.id === e.workCentreId)?.name}</span>,
      exportValue: (e) => workCentres.find((c) => c.id === e.workCentreId)?.name ?? '',
    },
    {
      key: 'pieces', header: 'Good / scrap / rework', align: 'right', width: 'w-[190px]', sortable: true,
      sortValue: (e) => e.goodQuantity,
      cell: (e) => {
        const produced = e.goodQuantity + e.scrapQuantity + e.reworkQuantity
        if (produced === 0) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <div>
            <p className="tnum text-[12.5px] font-semibold text-fg">
              {fmtNumber(e.goodQuantity)}
              {e.scrapQuantity > 0 && <span className="text-danger"> · {fmtNumber(e.scrapQuantity)}</span>}
              {e.reworkQuantity > 0 && <span className="text-warning"> · {fmtNumber(e.reworkQuantity)}</span>}
            </p>
            {e.defectCode && <p className="truncate text-[11px] text-fg-muted">{defectLabel(e.defectCode)}</p>}
          </div>
        )
      },
      exportValue: (e) => e.goodQuantity,
    },
    {
      key: 'hours', header: 'Hours', align: 'right', width: 'w-[130px]', sortable: true, sortValue: (e) => e.labourHours,
      cell: (e) => (
        <div>
          <p className="tnum text-[12.5px]">{e.labourHours > 0 ? `${fmtNumber(e.labourHours, 1)} h` : '—'}</p>
          {e.downtimeHours > 0 && <p className="tnum text-[11px] text-danger">{fmtNumber(e.downtimeHours, 1)} h down</p>}
        </div>
      ),
      exportValue: (e) => e.labourHours,
    },
    {
      key: 'who', header: 'Who and when', width: 'min-w-[180px]', sortable: true, sortValue: (e) => e.at,
      cell: (e) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg">{e.operator}</p>
          <p className="tnum truncate text-[11px] text-fg-muted">{fmtDate(e.at, 'short')} · {SHIFTS.find((x) => x.value === e.shift)?.label}</p>
        </div>
      ),
      exportValue: (e) => `${e.operator} ${e.at}`,
    },
    {
      key: 'note', header: 'Note', width: 'min-w-[280px]',
      cell: (e) => (
        <p className="line-clamp-2 text-[11.5px] leading-snug text-fg-muted">
          {e.downtimeReason ? <strong className="font-medium text-danger">{e.downtimeReason}. </strong> : null}
          {e.note}
        </p>
      ),
      exportValue: (e) => e.note ?? '',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Production reporting"
        description="Lapor produksi. Until an operator books an output there is no scrap, no actual labour and no real yield — only a plan with a tick against it. Every number downstream starts on this page."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Hours booked, 30 days"
          value={`${fmtNumber(labour.hoursBooked, 0)} h`}
          icon={<Timer />} accent="primary"
          sub={`${fmtNumber(labour.downtimeHours, 0)} h of it standing still`}
        />
        <KpiCard
          label="Labour efficiency"
          value={fmtPercent(labour.efficiencyPercent, 0)}
          icon={<Gauge />}
          accent={labour.efficiencyPercent >= 95 ? 'success' : labour.efficiencyPercent >= 80 ? 'warning' : 'danger'}
          sub="standard hours earned over hours booked"
        />
        <KpiCard
          label="Scrap beyond tolerance"
          value={fmtNumber(overTolerance.length)}
          icon={<TriangleAlert />}
          accent={overTolerance.length ? 'danger' : 'success'}
          sub={overTolerance.length ? `${fmtCurrency(overTolerance.reduce((a, r) => a + r.value, 0), 'IDR', { compact: true })} at the worst operations` : `every operation inside ${fmtPercent(OPERATION_SCRAP_TOLERANCE * 100, 0)}`}
        />
        <KpiCard
          label="Material returned"
          value={fmtCurrency(returns.value, 'IDR', { compact: true })}
          icon={<Undo2 />}
          accent={returns.returnRatePercent > 5 ? 'warning' : 'success'}
          sub={`${fmtPercent(returns.returnRatePercent, 1)} of what was issued came back`}
        />
      </div>

      {labour.topDowntimeReason && (
        <Card>
          <CardBody className="py-3">
            <p className="text-[12.5px] text-fg">
              <span className="font-semibold text-danger">{fmtNumber(labour.topDowntimeReason.hours, 0)} hours</span> lost to{' '}
              <span className="font-medium">{labour.topDowntimeReason.reason.toLowerCase()}</span> in the last month — {fmtPercent(labour.downtimeShare, 0)} of everything booked.{' '}
              <span className="text-fg-muted">Those hours were promised to somebody in the order book.</span>
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardBody className="p-0">
            <div className="border-b border-border px-4 pt-3">
              <Tabs
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'entries', label: 'Bookings', count: productionEntries.length },
                  { value: 'scrap', label: 'Where scrap happens', count: scrapRows.length },
                  { value: 'returns', label: 'Returned to store', count: materialReturns.length },
                ]}
              />
            </div>

            {tab === 'entries' && (
              <div className="p-0">
                <DataTable
                  data={productionEntries}
                  columns={entryColumns}
                  getId={(e) => e.id}
                  getLabel={(e) => e.code}
                  entityLabel="booking"
                  exportName="production-entries"
                  storageKey="production-entries"
                  searchText={(e) => `${e.code} ${e.operator} ${e.note ?? ''} ${e.downtimeReason ?? ''}`}
                  initialSort={{ key: 'who', dir: 'desc' }}
                  rowTone={(e) => (e.kind === 'DOWNTIME' ? 'bg-danger-soft/20' : e.scrapQuantity > 0 ? 'bg-warning-soft/15' : undefined)}
                />
              </div>
            )}

            {tab === 'scrap' && (
              <div className="divide-y divide-border">
                {scrapRows.length === 0 && <EmptyState title="Nothing scrapped" description="Every piece booked so far came off right the first time." />}
                {scrapRows.map((r) => (
                  <div key={`${r.workOrderId}:${r.operationNo}`} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/work-orders/${r.workOrderId}`} className="font-mono text-[12.5px] font-semibold text-primary hover:underline">
                          {r.workOrderCode}
                        </Link>
                        <p className="truncate text-[11.5px] text-fg-muted">op {r.operationNo} · {r.operationName}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`tnum text-[13px] font-semibold ${r.scrapPercent > OPERATION_SCRAP_TOLERANCE * 100 ? 'text-danger' : 'text-fg'}`}>
                          {fmtPercent(r.scrapPercent, 1)}
                        </p>
                        <p className="tnum text-[11px] text-fg-muted">{fmtNumber(r.scrap)} of {fmtNumber(r.produced)}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress
                        value={Math.min(100, (r.scrapPercent / (OPERATION_SCRAP_TOLERANCE * 100)) * 50)}
                        tone={r.scrapPercent > OPERATION_SCRAP_TOLERANCE * 100 ? 'danger' : 'success'}
                        className="flex-1" size="sm"
                      />
                      <span className="tnum shrink-0 text-[11.5px] font-medium text-danger">
                        {fmtCurrency(r.value, 'IDR', { compact: true })}
                      </span>
                    </div>
                    {r.defectCode && (
                      <p className="mt-1.5 text-[11.5px] text-fg-muted">
                        {defectLabel(r.defectCode as never)} — {DEFECT_CODES.find((d) => d.value === r.defectCode)?.typicalCause}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === 'returns' && (
              <div className="divide-y divide-border">
                {materialReturns.length === 0 && <EmptyState title="Nothing has come back" description="Either the picking lists are exact, or nobody is recording what goes back." />}
                {materialReturns.map((r) => {
                  const meta = MATERIAL_RETURN_REASONS.find((x) => x.value === r.reason)
                  return (
                    <div key={r.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{r.code}</p>
                          <p className="truncate text-[11.5px] text-fg-muted">{r.description}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="tnum text-[12.5px] font-semibold text-fg">{fmtNumber(r.quantity, 2)} {r.uom}</p>
                          <p className="tnum text-[11px] text-fg-muted">{fmtCurrency(r.quantity * r.unitCost, 'IDR', { compact: true })}</p>
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Tooltip content={meta?.hint ?? ''}>
                          <span><Badge tone="neutral" size="sm">{meta?.label}</Badge></span>
                        </Tooltip>
                        {r.asRemnant && (
                          <Tooltip content="Already cut, so it cannot go back as full stock — it goes on the offcut rack at a fraction of the value.">
                            <span><Badge tone="warning" size="sm">racked as an offcut</Badge></span>
                          </Tooltip>
                        )}
                        <span className="tnum text-[11px] text-fg-muted">{fmtDate(r.at, 'short')} · {r.returnedBy}</span>
                      </div>
                      {r.note && <Because className="mt-1 text-[11px]">{r.note}</Because>}
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader icon={<ClipboardList />} title="Book an output" description="What came off the operation: good, scrapped, and going back for rework." />
            <CardBody className="space-y-3">
              <Field label="Work order">
                <Select
                  value={woId}
                  onChange={(v) => { setWoId(v); setOpNo('') }}
                  options={workOrders.map((w) => ({
                    value: w.id,
                    label: `${w.code} · ${products.find((p) => p.id === w.productId)?.name ?? ''}`,
                  }))}
                />
              </Field>

              {workOrder && completion && (
                <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12px] text-fg-muted">Off the final operation</span>
                    <span className="tnum text-[12.5px] font-semibold text-fg">
                      {fmtNumber(completion.good)} / {fmtNumber(workOrder.quantity)}
                    </span>
                  </div>
                  <Progress className="mt-1.5" value={completion.percentComplete} tone="primary" size="sm" />
                  <p className="tnum mt-1.5 text-[11px] text-fg-muted">
                    {fmtNumber(completion.scrapTotal)} scrapped · {fmtNumber(completion.reworkOpen)} in rework
                  </p>
                  {(() => {
                    /* nothing off the last operation is not the same as nothing done —
                       say how far the order has actually got */
                    const furthest = reports.filter((r) => r.good > 0).slice(-1)[0]
                    if (completion.good > 0 || !furthest) return null
                    return (
                      <p className="mt-1 text-[11px] leading-snug text-warning">
                        Nothing has come off the last operation yet. The furthest it has got is operation {furthest.operationNo}, {furthest.name} — {fmtNumber(furthest.good)} pieces.
                      </p>
                    )
                  })()}
                  {completion.worstOperation && (
                    <Because className="mt-1.5 text-[11px]">
                      Most is lost at operation {completion.worstOperation.operationNo}, {completion.worstOperation.name} — {fmtPercent(completion.worstOperation.scrapPercent, 1)}.
                    </Because>
                  )}
                </div>
              )}

              <Field label="Operation">
                <Select
                  value={chosenOp ? String(chosenOp.operationNo) : ''}
                  onChange={setOpNo}
                  options={reports.map((r) => ({ value: String(r.operationNo), label: `${r.operationNo} · ${r.name}` }))}
                />
              </Field>

              <div className="grid grid-cols-3 gap-2">
                <Field label="Good"><Input value={good} onChange={(e) => setGood(e.target.value)} inputMode="numeric" placeholder="0" /></Field>
                <Field label="Scrap"><Input value={scrap} onChange={(e) => setScrap(e.target.value)} inputMode="numeric" placeholder="0" /></Field>
                <Field label="Rework"><Input value={rework} onChange={(e) => setRework(e.target.value)} inputMode="numeric" placeholder="0" /></Field>
              </div>

              {(Number(scrap) > 0 || Number(rework) > 0) && (
                <Field label="Defect" help="A scrap with no defect code is a number nobody can act on.">
                  <Select
                    value={defect}
                    onChange={setDefect}
                    options={DEFECT_CODES.map((d) => ({ value: d.value, label: d.label }))}
                    placeholder="What went wrong"
                  />
                </Field>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Field label="Hours"><Input value={hours} onChange={(e) => setHours(e.target.value)} inputMode="decimal" placeholder="0.0" /></Field>
                <Field label="Shift">
                  <Select value={shift} onChange={(v) => setShift(v as never)} options={SHIFTS.map((x) => ({ value: x.value, label: `${x.label} · ${x.hours}` }))} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Downtime"><Input value={downtime} onChange={(e) => setDowntime(e.target.value)} inputMode="decimal" placeholder="0.0" /></Field>
                <Field label="Reason">
                  <Select
                    value={downtimeReason}
                    onChange={setDowntimeReason}
                    options={DOWNTIME_REASONS.map((r) => ({ value: r, label: r }))}
                    placeholder="If it stood still"
                  />
                </Field>
              </div>

              <Button variant="primary" className="w-full" onClick={book}>Book it</Button>
              <Because className="text-[11px]">
                Booking writes the scrap into the work order, the hours into its actual labour cost, and the output into stock. Nothing here is a report about the past — it is the thing that makes the past true.
              </Because>
            </CardBody>
          </Card>

          {workOrder && (
            <Card>
              <CardHeader title="This order, operation by operation" description="First-pass yield against hours booked." />
              <CardBody className="space-y-2.5">
                {reports.map((r) => (
                  <div key={r.operationNo}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-fg">{r.operationNo} · {r.name}</p>
                        <p className="tnum truncate text-[11px] text-fg-muted">
                          {fmtNumber(r.good)} good
                          {r.scrap > 0 && ` · ${fmtNumber(r.scrap)} scrap`}
                          {r.labourHours > 0 && ` · ${fmtNumber(r.labourHours, 1)} h`}
                        </p>
                      </div>
                      {r.entries > 0 && (
                        <span className={`tnum shrink-0 text-[12px] font-semibold ${r.scrapBeyondTolerance ? 'text-danger' : 'text-success'}`}>
                          {fmtPercent(r.firstPassPercent, 1)}
                        </span>
                      )}
                    </div>
                    {r.entries > 0 && r.standardHours > 0 && (
                      <p className={`tnum mt-0.5 text-[11px] ${Math.abs(r.efficiencyVariancePercent) > 15 ? 'text-warning' : 'text-fg-subtle'}`}>
                        {r.efficiencyVariancePercent > 0 ? '+' : ''}{fmtPercent(r.efficiencyVariancePercent, 0)} against a standard of {fmtNumber(r.standardHours, 1)} h
                      </p>
                    )}
                    <Separator className="mt-2" />
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader icon={<Users />} title="Who booked what" description="Hours and scrap by operator over the last month." />
            <CardBody className="space-y-2">
              {labour.byOperator.slice(0, 6).map((o) => (
                <div key={o.operator} className="flex items-start justify-between gap-3">
                  <span className="min-w-0 truncate text-[12.5px] text-fg">{o.operator}</span>
                  <span className="tnum shrink-0 text-[11.5px] text-fg-muted">
                    {fmtNumber(o.hours, 0)} h · {fmtNumber(o.good)} good
                    {o.scrapPercent > 0 && <span className={o.scrapPercent > OPERATION_SCRAP_TOLERANCE * 100 ? 'text-danger' : ''}> · {fmtPercent(o.scrapPercent, 1)}</span>}
                  </span>
                </div>
              ))}
              <Separator className="my-1" />
              {labour.byShift.map((sh) => (
                <div key={sh.shift} className="flex items-start justify-between gap-3">
                  <span className="text-[12.5px] text-fg">{SHIFTS.find((x) => x.value === sh.shift)?.label ?? sh.shift}</span>
                  <span className="tnum shrink-0 text-[11.5px] text-fg-muted">
                    {fmtNumber(sh.hours, 0)} h · {fmtPercent(sh.scrapPercent, 1)} scrap
                  </span>
                </div>
              ))}
              <Because className="border-t border-border pt-2.5">
                Scrap by shift is worth reading before scrap by operator. A night shift losing more than a day shift is a lighting and supervision problem, not a people one.
              </Because>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Undo2 />} title="Returning material" description="Full pieces go back as stock; anything already cut goes on the offcut rack." />
            <CardBody className="space-y-2.5">
              {!workOrder && <Because>Pick a work order above.</Because>}
              {workOrder && workOrder.materials.filter((m) => m.issuedQuantity > 0).length === 0 && (
                <Because>Nothing has been issued against {workOrder.code} yet.</Because>
              )}
              {workOrder?.materials.filter((m) => m.issuedQuantity > 0).slice(0, 4).map((m) => (
                <div key={m.id} className="rounded-lg border border-border px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-[12px] text-fg">{items.find((i) => i.id === m.itemId)?.name}</p>
                    <p className="tnum shrink-0 text-[11.5px] text-fg-muted">{fmtNumber(m.issuedQuantity, 2)} {m.uom} out</p>
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    <Button
                      size="xs" variant="secondary" className="flex-1"
                      onClick={() => {
                        const qty = Math.min(m.issuedQuantity, Math.max(1, Math.round(m.issuedQuantity * 0.1)))
                        returnMaterial(workOrder.id, m.id, qty, 'OVER_ISSUED', false)
                        toast.push({ title: 'Returned to stock', description: `${qty} ${m.uom} back on the rack as full stock.`, tone: 'success' })
                      }}
                    >
                      Back to stock
                    </Button>
                    <Button
                      size="xs" variant="ghost" className="flex-1"
                      onClick={() => {
                        const qty = Math.min(m.issuedQuantity, Math.max(1, Math.round(m.issuedQuantity * 0.05)))
                        returnMaterial(workOrder.id, m.id, qty, 'SURPLUS_AT_CLOSE', true)
                        toast.push({ title: 'Racked as an offcut', description: `${qty} ${m.uom} already cut, so carried at 60%.`, tone: 'info' })
                      }}
                    >
                      As offcut
                    </Button>
                  </div>
                </div>
              ))}
              {returns.byReason.length > 0 && (
                <>
                  <Separator />
                  {returns.byReason.map((r) => (
                    <MetaRow key={r.reason} label={MATERIAL_RETURN_REASONS.find((x) => x.value === r.reason)?.label ?? r.reason}>
                      {fmtCurrency(r.value, 'IDR', { compact: true })}
                    </MetaRow>
                  ))}
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
