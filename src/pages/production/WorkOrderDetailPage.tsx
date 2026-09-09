import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Clock, Factory, Play, ShieldCheck, TriangleAlert, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Because, MetaRow, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import { usageVariance, workOrderCost, workOrderProgress } from '@/lib/production'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'

export function WorkOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const s = useMfg()

  const wo = s.workOrders.find((w) => w.id === id)
  if (!wo) {
    return <EmptyState title="Work order not found" action={<Button onClick={() => navigate('/work-orders')}>Back to work orders</Button>} />
  }

  const product = s.products.find((p) => p.id === wo.productId)
  const so = s.salesOrders.find((o) => o.id === wo.salesOrderId)
  const cost = workOrderCost(wo)
  const progress = workOrderProgress(wo)
  const usage = usageVariance(wo, s.items)
  const qc = s.qcRecords.filter((q) => q.workOrderId === wo.id)
  const shortages = wo.materials.filter((m) => m.shortageNote)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={
          <>
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link to="/work-orders"><ArrowLeft /> Work orders</Link>
            </Button>
            <StatusBadge value={wo.status} size="sm" />
            {wo.priority !== 'STANDARD' && <StatusBadge value={wo.priority} size="sm" />}
            {wo.reworkOfId && <Badge tone="warning" size="sm">rework of {s.workOrders.find((w) => w.id === wo.reworkOfId)?.code}</Badge>}
          </>
        }
        title={`${wo.code} · ${product?.name ?? ''}`}
        description={wo.note}
        meta={
          <>
            <span className="text-[12.5px] text-fg-muted">{fmtNumber(wo.quantity)} units</span>
            <span className="text-[12.5px] text-fg-muted">{fmtDate(wo.plannedStart)} → {fmtDate(wo.plannedEnd)}</span>
            <span className={`text-[12.5px] ${progress.lateDays > 0 ? 'font-medium text-danger' : 'text-fg-muted'}`}>
              due {fmtDate(wo.dueDate)}{progress.lateDays > 0 ? ` · ${progress.lateDays} days late` : ''}
            </span>
            {so && <Link to={`/orders/${so.id}`} className="text-[12.5px] font-medium text-primary hover:underline">{so.code}</Link>}
          </>
        }
        actions={
          wo.status === 'PLANNED' || wo.status === 'FIRM' ? (
            <Button
              onClick={() => {
                if (shortages.length) {
                  toast.push({
                    tone: 'error',
                    title: 'Cannot release',
                    description: shortages[0].shortageNote,
                  })
                  return
                }
                s.releaseWorkOrder(wo.id)
                toast.push({ tone: 'success', title: 'Released to the floor', description: `${wo.code} is now on the shop-floor board.` })
              }}
            >
              <Play /> Release to floor
            </Button>
          ) : undefined
        }
      />

      {shortages.length > 0 && (
        <Card className="border-danger/50">
          <CardHeader
            icon={<TriangleAlert />}
            title={`${shortages.length} material line${shortages.length === 1 ? '' : 's'} cannot be issued`}
            description="Each one names the supply that covers it and the day it becomes issuable — not the quantity that is missing."
          />
          <CardBody className="space-y-3">
            {shortages.map((m) => {
              const item = s.items.find((i) => i.id === m.itemId)
              return (
                <div key={m.id} className="rounded-lg border border-border bg-surface-sunken/60 p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-fg">{item?.name}</p>
                    <span className="tnum text-[12px] text-fg-muted">
                      needs {fmtNumber(m.standardQuantity, m.standardQuantity < 10 ? 3 : 0)} {m.uom} at operation {m.operationNo}
                    </span>
                  </div>
                  <Because className="mt-1">{m.shortageNote}</Because>
                </div>
              )
            })}
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          {/* ---------------- routing ---------------- */}
          <Card>
            <CardHeader
              icon={<Factory />}
              title="Operations"
              description="The routing as the floor is actually working it. Cure time is queue time — it cannot be shortened by adding people."
              actions={<Badge tone="outline" size="sm">{progress.done} of {progress.total} done</Badge>}
            />
            <CardBody className="p-0">
              <div className="divide-y divide-border">
                {wo.operations.map((op) => {
                  const wc = s.workCentres.find((c) => c.id === op.workCentreId)
                  const canAdvance = op.status === 'RUNNING' || op.status === 'READY' || op.status === 'CURING'
                  return (
                    <div key={op.id} className={`px-4 py-3 ${op.status === 'BLOCKED' ? 'bg-danger-soft/30' : ''}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={`tnum mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-[11.5px] font-semibold ${
                              op.status === 'DONE' ? 'bg-success-soft text-success-soft-fg'
                                : op.status === 'BLOCKED' ? 'bg-danger-soft text-danger-soft-fg'
                                : 'bg-neutral-soft text-neutral-soft-fg'
                            }`}
                          >
                            {op.status === 'DONE' ? <Check className="size-3.5" /> : op.operationNo}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-fg">{op.name}</p>
                            <p className="text-[11.5px] text-fg-muted">
                              {wc?.name}
                              {op.operator && ` · ${op.operator}`}
                              {op.subcontracted && ' · subcontracted'}
                            </p>
                            {op.blockReason && (
                              <p className="mt-1 text-[12px] leading-relaxed font-medium text-danger">{op.blockReason}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                          <div className="text-right">
                            <p className="text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">Planned</p>
                            <p className="tnum text-[12px]">{fmtDate(op.plannedStart, 'short')} → {fmtDate(op.plannedEnd, 'short')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">Hours</p>
                            <p className="tnum text-[12px]">
                              {fmtNumber(op.plannedHours, 1)}
                              {op.actualHours !== undefined && (
                                <span className={op.actualHours > op.plannedHours ? ' text-danger' : ' text-success'}>
                                  {' '}/ {fmtNumber(op.actualHours, 1)}
                                </span>
                              )}
                            </p>
                          </div>
                          <StatusBadge value={op.status} size="sm" />
                          {canAdvance && op.status !== 'BLOCKED' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                s.advanceOperation(wo.id, op.operationNo)
                                toast.push({ tone: 'success', title: `Operation ${op.operationNo} complete`, description: `${op.name} signed off.` })
                              }}
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>

          {/* ---------------- materials ---------------- */}
          <Card>
            <CardHeader
              icon={<Wallet />}
              title="Materials"
              description="Standard is the bill grossed up for yield and scrap. Issued is what actually left the store — the gap is the usage variance, and on solid timber it is the largest number in the factory."
            />
            <CardBody className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                    <th className="py-2 pl-4 font-medium">Item</th>
                    <th className="px-2 py-2 text-right font-medium">Op</th>
                    <th className="px-2 py-2 text-right font-medium">Standard</th>
                    <th className="px-2 py-2 text-right font-medium">Issued</th>
                    <th className="px-2 py-2 text-right font-medium">Variance</th>
                    <th className="py-2 pr-4 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {wo.materials.map((m) => {
                    const item = s.items.find((i) => i.id === m.itemId)
                    const delta = m.issuedQuantity > 0 ? m.issuedQuantity - m.standardQuantity : 0
                    return (
                      <tr key={m.id} className="border-b border-border/70 last:border-0">
                        <td className="py-2 pl-4">
                          <p className="text-[12.5px] text-fg">{item?.name ?? m.itemId}</p>
                          <p className="font-mono text-[11px] text-fg-muted">{item?.code}</p>
                          {m.shortageNote && <p className="mt-0.5 text-[11px] font-medium text-danger">Cannot be issued</p>}
                        </td>
                        <td className="px-2 py-2 text-right"><span className="tnum text-[11.5px] text-fg-muted">{m.operationNo}</span></td>
                        <td className="px-2 py-2 text-right">
                          <span className="tnum text-[12.5px]">{fmtNumber(m.standardQuantity, m.standardQuantity < 10 ? 3 : 1)}</span>
                          <span className="ml-1 text-[10.5px] text-fg-subtle">{m.uom}</span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <span className={`tnum text-[12.5px] ${m.issuedQuantity > 0 ? 'text-fg' : 'text-fg-subtle'}`}>
                            {m.issuedQuantity > 0 ? fmtNumber(m.issuedQuantity, m.issuedQuantity < 10 ? 3 : 1) : '—'}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          {delta ? (
                            <span className={`tnum text-[12px] font-semibold ${delta > 0 ? 'text-danger' : 'text-success'}`}>
                              {delta > 0 ? '+' : ''}{fmtPercent((delta / m.standardQuantity) * 100, 1)}
                            </span>
                          ) : (
                            <span className="text-[12px] text-fg-subtle">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right">
                          <span className="tnum text-[12.5px]">{fmtCurrency(m.standardQuantity * m.unitCost, 'IDR', { compact: true })}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardBody>
          </Card>

          {qc.length > 0 && (
            <Card>
              <CardHeader icon={<ShieldCheck />} title="Quality on this order" />
              <CardBody className="space-y-3">
                {qc.map((q) => (
                  <div key={q.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[12.5px] font-semibold text-fg">
                        <span className="font-mono">{q.code}</span> · {q.point.replace('_', ' ').toLowerCase()} inspection
                      </p>
                      <div className="flex items-center gap-2">
                        <StatusBadge value={q.result} size="sm" />
                        <StatusBadge value={q.disposition} size="sm" />
                      </div>
                    </div>
                    <p className="mt-1 text-[12px] text-fg-muted">
                      {fmtNumber(q.passedQuantity)} passed, {fmtNumber(q.failedQuantity)} failed of {fmtNumber(q.lotSize)} ·{' '}
                      {fmtCurrency(q.costImpact, 'IDR', { compact: true })} cost impact
                    </p>
                    {q.rootCause && <Because className="mt-1">{q.rootCause}</Because>}
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>

        {/* ---------------- side ---------------- */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader icon={<Wallet />} title="Cost" description="Actual against standard, scaled to how far the order has run." />
            <CardBody className="space-y-3">
              <CostRow label="Material" standard={wo.standardMaterialCost} actual={wo.actualMaterialCost} />
              <CostRow label="Labour" standard={wo.standardLabourCost} actual={wo.actualLabourCost} />
              <CostRow label="Overhead" standard={wo.standardOverheadCost} actual={wo.actualOverheadCost} />
              {wo.actualSubcontractCost > 0 && <CostRow label="Subcontract" standard={0} actual={wo.actualSubcontractCost} />}
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="text-[12.5px] font-medium text-fg">Variance</span>
                <span className={`tnum text-[16px] font-semibold ${Math.abs(cost.variancePercent) > s.settings.costVarianceTolerance * 100 ? (cost.variancePercent > 0 ? 'text-danger' : 'text-success') : 'text-fg-muted'}`}>
                  {cost.variancePercent > 0 ? '+' : ''}{fmtPercent(cost.variancePercent, 1)}
                </span>
              </div>
              <Because>{cost.driver} is the largest driver.</Because>
              <Separator />
              <MetaRow label="Standard unit cost">{fmtCurrency(cost.standardUnitCost, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Actual unit cost">{fmtCurrency(cost.actualUnitCost, 'IDR', { compact: true })}</MetaRow>
            </CardBody>
          </Card>

          {usage.length > 0 && (
            <Card>
              <CardHeader title="Usage variance" description="Issued against the bill, by value." />
              <CardBody className="space-y-2">
                {usage.slice(0, 6).map((u) => (
                  <div key={u.itemId} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] text-fg">{u.name}</p>
                      <p className="tnum text-[11px] text-fg-muted">
                        {fmtNumber(u.standard, u.standard < 10 ? 3 : 1)} → {fmtNumber(u.issued, u.issued < 10 ? 3 : 1)} {u.uom}
                      </p>
                    </div>
                    <span className={`tnum shrink-0 text-[12px] font-semibold ${u.deltaValue > 0 ? 'text-danger' : 'text-success'}`}>
                      {fmtCurrency(u.deltaValue, 'IDR', { compact: true })}
                    </span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader icon={<Clock />} title="Timing" />
            <CardBody className="divide-y divide-border py-0">
              <MetaRow label="Planned start">{fmtDate(wo.plannedStart)}</MetaRow>
              <MetaRow label="Planned end">{fmtDate(wo.plannedEnd)}</MetaRow>
              <MetaRow label="Actual start">{wo.actualStart ? fmtDate(wo.actualStart) : 'not started'}</MetaRow>
              <MetaRow label="Due">
                <span className={progress.lateDays > 0 ? 'text-danger' : ''}>{fmtDate(wo.dueDate)}</span>
              </MetaRow>
              <MetaRow label="Cure & queue">
                {fmtNumber(
                  s.routings.find((r) => r.id === wo.routingId)?.operations.reduce((a, op) => a + op.queueHours, 0) ?? 0,
                )} h
              </MetaRow>
              <MetaRow label="Released by">{wo.releasedBy ?? 'not released'}</MetaRow>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Progress" />
            <CardBody className="space-y-2">
              <Progress value={progress.percent} tone={progress.blocked ? 'danger' : 'primary'} size="lg" />
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-fg-muted">{progress.done} of {progress.total} operations</span>
                <Tooltip content="Units signed off at the last completed operation.">
                  <span className="tnum text-[12px] font-medium text-fg">{fmtNumber(wo.quantityDone)} / {fmtNumber(wo.quantity)}</span>
                </Tooltip>
              </div>
              {wo.quantityScrapped > 0 && (
                <Because>
                  {wo.quantityScrapped} scrapped. A component scrapped at machining costs its material plus every operation
                  already spent on it, which is why the number matters more than it looks.
                </Because>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

function CostRow({ label, standard, actual }: { label: string; standard: number; actual: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12.5px] text-fg-muted">{label}</span>
      <span className="tnum text-[12.5px]">
        <span className="text-fg-subtle">{fmtCurrency(standard, 'IDR', { compact: true })}</span>
        <span className="mx-1.5 text-fg-subtle">/</span>
        <span className="font-semibold text-fg">{fmtCurrency(actual, 'IDR', { compact: true })}</span>
      </span>
    </div>
  )
}
