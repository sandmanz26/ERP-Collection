import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, PackageSearch, Scale, TriangleAlert, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Because, MetaRow, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import {
  orderProgress, priceVariance, purchaseOrderValue, supplierQualification, threeWayMatch,
} from '@/lib/receiving'
import { permitGate } from '@/lib/importing'
import {
  countryFlag, paymentInstrumentLabel, PRICE_VARIANCE_TOLERANCE, supplierApprovalMeta,
} from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'

export function PurchaseOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const s = useMfg()

  const po = s.purchaseOrders.find((x) => x.id === id)
  if (!po) {
    return (
      <EmptyState
        title="Purchase order not found"
        description="It may have been removed, or the link is stale."
        action={<Button onClick={() => navigate('/purchasing')}>Back to purchasing</Button>}
      />
    )
  }

  const supplier = s.suppliers.find((x) => x.id === po.supplierId)
  const qual = supplier ? supplierQualification(supplier) : undefined
  const progress = orderProgress(po)
  const shipment = po.shipmentId ? s.shipments.find((x) => x.id === po.shipmentId) : undefined
  const gate = shipment ? permitGate(shipment, s.items, s.permits, s.settings.permitWarningDays) : undefined
  const receipts = s.goodsReceipts.filter((r) => r.purchaseOrderId === po.id)
  const match = threeWayMatch(po, s.goodsReceipts, s.invoices)
  const requisition = s.requisitions.find((r) => r.id === po.requisitionId)

  /* only lines whose price and standard are on the same basis: an imported line
     is quoted FOB against a landed standard and cannot be summed with the rest */
  const comparableLines = po.lines.filter((l) => priceVariance(l, s.items, po.fxRateAtOrder).comparable)
  const totalVariance = comparableLines.reduce((a, l) => {
    const v = priceVariance(l, s.items, po.fxRateAtOrder)
    return a + v.variance * l.quantity
  }, 0)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <Link to="/purchasing" className="inline-flex items-center gap-1 text-[13px] font-normal text-fg-muted hover:text-fg">
              <ArrowLeft className="size-4" /> Purchasing
            </Link>
            <span className="text-fg-subtle">·</span>
            {po.code}
          </span>
        }
        description={
          supplier
            ? `${countryFlag(supplier.country)} ${supplier.name} · ${po.kind === 'OVERSEAS' ? 'import' : 'local'} · ${paymentInstrumentLabel(po.paymentInstrument)}`
            : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge value={po.status} size="md" />
            {po.status === 'PENDING_APPROVAL' && (
              <Button
                size="sm" variant="primary"
                onClick={() => { s.approvePurchaseOrder(po.id); toast.push({ title: `${po.code} approved`, tone: 'success' }) }}
              >
                Approve
              </Button>
            )}
            {po.status === 'APPROVED' && (
              <Button
                size="sm" variant="primary"
                onClick={() => { s.releasePurchaseOrder(po.id); toast.push({ title: `${po.code} released to the supplier`, tone: 'success' }) }}
              >
                Release
              </Button>
            )}
          </div>
        }
      />

      {qual && !qual.canOrder && (
        <Card className="border-danger/50">
          <CardBody className="py-3">
            <p className="text-[12.5px] text-fg">
              <span className="font-semibold text-danger">This supplier is not clear to be ordered from.</span>{' '}
              <span className="text-fg-muted">{qual.verdict}</span>
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader
              icon={<PackageSearch />}
              title="Lines"
              description="What was ordered, what has been received against it, and what the price says about the standard cost behind it."
            />
            <CardBody className="p-0">
              <div className="divide-y divide-border">
                {po.lines.map((l) => {
                  const item = s.items.find((i) => i.id === l.itemId)
                  const v = priceVariance(l, s.items, po.fxRateAtOrder)
                  const outstanding = Math.max(0, l.quantity - l.receivedQuantity)
                  const pct = l.quantity > 0 ? (Math.min(l.receivedQuantity, l.quantity) / l.quantity) * 100 : 0
                  return (
                    <div key={l.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-fg">{item?.name ?? l.itemId}</p>
                          <p className="truncate font-mono text-[11.5px] text-fg-muted">
                            {item?.code}
                            {item?.hsCode && ` · HS ${item.hsCode}`}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="tnum text-[13px] font-semibold text-fg">
                            {fmtNumber(l.quantity, 2)} {l.uom}
                          </p>
                          <p className="tnum text-[11.5px] text-fg-muted">
                            at {fmtCurrency(l.unitPrice, po.currency, { compact: true })}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2">
                        <Progress value={pct} tone={pct === 100 ? 'success' : 'accent'} className="flex-1" size="sm" />
                        <span className="tnum shrink-0 text-[11px] text-fg-muted">
                          {fmtNumber(l.receivedQuantity, 2)} / {fmtNumber(l.quantity, 2)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        <span className="tnum text-[11.5px] text-fg-muted">
                          needed {fmtDate(l.requiredDate, 'short')}
                          {l.promisedDate && ` · promised ${fmtDate(l.promisedDate, 'short')}`}
                        </span>
                        {outstanding > 0 && (
                          <span className="tnum text-[11.5px] font-medium text-warning">
                            {fmtNumber(outstanding, 2)} {l.uom} still to come
                          </span>
                        )}
                        <Tooltip content={v.note}>
                          <span>
                            <Badge tone={v.beyondTolerance ? (v.variance > 0 ? 'danger' : 'success') : 'neutral'} size="sm">
                              {v.comparable
                                ? `${v.variance > 0 ? '+' : ''}${fmtPercent(v.variancePercent, 1)} on standard`
                                : 'FOB — not comparable to a landed standard'}
                            </Badge>
                          </span>
                        </Tooltip>
                      </div>
                      {l.mrpDemandRef && <Because className="mt-1.5 text-[11px]">{l.mrpDemandRef}</Because>}
                    </div>
                  )
                })}
              </div>
            </CardBody>
            <CardBody className="border-t border-border">
              <MetaRow label="Order value">
                {fmtCurrency(purchaseOrderValue(po), 'IDR', { compact: true })}
                {po.currency !== 'IDR' && (
                  <span className="ml-1.5 text-fg-muted">
                    ({fmtNumber(po.lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0))} {po.currency})
                  </span>
                )}
              </MetaRow>
              <MetaRow label="Still to arrive">{fmtCurrency(progress.outstandingValue, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Against standard cost">
                {comparableLines.length === 0 ? (
                  <span className="text-fg-muted">n/a — every line is imported and quoted FOB</span>
                ) : (
                  <span className={totalVariance > 0 ? 'text-danger' : 'text-success'}>
                    {totalVariance > 0 ? '+' : ''}{fmtCurrency(totalVariance, 'IDR', { compact: true })}
                    {comparableLines.length < po.lines.length && (
                      <span className="ml-1.5 text-fg-muted">on {comparableLines.length} of {po.lines.length} lines</span>
                    )}
                  </span>
                )}
              </MetaRow>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={<ClipboardCheck />}
              title="Receipts against this order"
              description="A purchase order line only moves when a receipt is put away — not when a lorry arrives and not when a status is changed."
            />
            <CardBody className="p-0">
              {receipts.length === 0 && (
                <EmptyState title="Nothing received yet" description="Until a goods receipt is put away, MRP is right to keep counting this order as supply still to come." />
              )}
              <div className="divide-y divide-border">
                {receipts.map((r) => (
                  <Link key={r.id} to="/receiving" className="block px-4 py-3 transition-colors hover:bg-bg-muted">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[12.5px] font-semibold text-fg">{r.code}</p>
                        <p className="truncate text-[11.5px] text-fg-muted">
                          {fmtDate(r.receivedAt)} · {r.supplierDeliveryNote ?? 'no delivery note'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.lines.some((l) => l.discrepancy !== 'NONE') && <Badge tone="warning" size="sm">discrepancy</Badge>}
                        <StatusBadge value={r.status} size="sm" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader icon={<Scale />} title="Three-way match" description="Ordered, received, invoiced. A bill that agrees with none of them is how a works pays twice for one container." />
            <CardBody>
              <MetaRow label="Ordered">{fmtCurrency(match.orderedValue, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Received & accepted">{fmtCurrency(match.receivedValue, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Invoiced">{fmtCurrency(match.invoicedValue, 'IDR', { compact: true })}</MetaRow>
              <Separator className="my-2.5" />
              {match.matched && <Because className="text-success">All three legs agree. Clear to pay.</Because>}
              {!match.matched && match.problems.length === 0 && (
                <Because>Not enough has happened yet to match — this order is still waiting on a receipt or a bill.</Because>
              )}
              {match.problems.map((p, i) => (
                <p key={i} className="text-[12px] leading-relaxed text-danger">{p}</p>
              ))}
            </CardBody>
          </Card>

          {supplier && (
            <Card>
              <CardHeader
                icon={<Wallet />}
                title="Supplier"
                actions={
                  <Badge tone={(supplierApprovalMeta(supplier.approvalStatus)?.tone ?? 'neutral') as never} size="sm">
                    {supplierApprovalMeta(supplier.approvalStatus)?.label}
                  </Badge>
                }
              />
              <CardBody className="divide-y divide-border py-0">
                <MetaRow label="Name">
                  <Link to={`/suppliers/${supplier.id}`} className="text-primary hover:underline">{supplier.name}</Link>
                </MetaRow>
                <MetaRow label="Terms">{paymentInstrumentLabel(po.paymentInstrument)} · {supplier.paymentTermDays} days</MetaRow>
                <MetaRow label="On time">{fmtPercent(supplier.onTimePercent, 0)}</MetaRow>
                <MetaRow label="Document accuracy">{fmtPercent(supplier.documentAccuracyPercent, 0)}</MetaRow>
              </CardBody>
              {qual && (
                <CardBody className="border-t border-border">
                  <Because>{qual.verdict}</Because>
                </CardBody>
              )}
            </Card>
          )}

          <Card>
            <CardHeader icon={<TriangleAlert />} title="Dates and gates" />
            <CardBody className="divide-y divide-border py-0">
              <MetaRow label="Ordered">{fmtDate(po.orderDate)}</MetaRow>
              <MetaRow label="Raised by">{po.requestedBy}</MetaRow>
              {requisition && (
                <MetaRow label="From requisition">
                  <Link to="/requisitions" className="font-mono text-primary hover:underline">{requisition.code}</Link>
                </MetaRow>
              )}
              {po.approvedBy && <MetaRow label="Approved by">{po.approvedBy}</MetaRow>}
              <MetaRow label="Next due">
                {progress.nextDue
                  ? <span className={progress.late ? 'text-danger' : undefined}>{fmtDate(progress.nextDue)}{progress.late && ` · ${progress.daysLate}d late`}</span>
                  : 'nothing outstanding'}
              </MetaRow>
              {shipment && (
                <MetaRow label="Consignment">
                  <Link to={`/imports/${shipment.id}`} className="font-mono text-primary hover:underline">{shipment.code}</Link>
                </MetaRow>
              )}
            </CardBody>
            {gate && (
              <CardBody className="border-t border-border">
                {gate.ok ? (
                  <Because className="text-success">LARTAS gate clear — every restricted line has a permit that covers it and does not lapse before arrival.</Because>
                ) : (
                  <div className="space-y-1.5">
                    {gate.problems.map((x, i) => (
                      <p key={i} className="text-[12px] leading-relaxed text-danger">
                        <strong className="font-medium">{x.title}.</strong> {x.detail}
                      </p>
                    ))}
                  </div>
                )}
              </CardBody>
            )}
            {po.note && (
              <CardBody className="border-t border-border">
                <Because>{po.note}</Because>
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader title="Why the price matters here" />
            <CardBody>
              <Because>
                A local line carries its variance against the standard cost the bill of material is costed at. Beyond {fmtPercent(PRICE_VARIANCE_TOLERANCE * 100, 0)} it stops being a market move and becomes a costing problem: the product still reports the old cost, so the margin on everything quoted from it is wrong by exactly this much.
                {' '}An imported line is not comparable at all — it is quoted FOB and the standard is landed. Judging one against the other is how an import programme convinces itself it is buying twenty per cent under standard while paying duty, freight and clearance on top.
              </Because>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
