import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PackageCheck, ShoppingCart, Truck } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { MetaRow, StatusBadge } from '@/components/shared/status'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtDate, fmtNumber, relativeLabel, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { backorder, lineNet, orderProgress, orderTax, orderValue } from '@/lib/procurement'
import { DELIVERY_MODES, deliveryModeLabel, rejectReasonLabel, uomLabel } from '@/data/reference'

export function PurchaseOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const store = useErp()
  const po = store.orders.find((o) => o.id === id)

  if (!po) {
    return <EmptyState title="No such purchase order" action={<Button onClick={() => navigate('/purchase-orders')}>Back</Button>} />
  }

  const receipts = store.receipts.filter((g) => g.poId === po.id).sort((a, b) => a.sequence - b.sequence)
  const progress = orderProgress(po, store.receipts)
  const open = backorder(po)
  const supplier = store.suppliers.find((s) => s.id === po.supplierId)
  const project = store.projects.find((p) => p.id === po.projectId)
  const bills = store.bills.filter((b) => b.poId === po.id)
  const warehouse = store.warehouses.find((w) => w.id === po.warehouseId)

  return (
    <div className="min-h-0">
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => navigate('/purchase-orders')}>
        <ArrowLeft /> Purchase orders
      </Button>

      <PageHeader
        eyebrow={
          <>
            <Badge tone="primary" size="sm">{po.code}</Badge>
            <StatusBadge value={po.status} size="sm" />
            {progress.overdue && <Badge tone="danger" size="sm">{progress.daysLate} days late</Badge>}
            {po.requiresSvlkDoc && <Badge tone="warning" size="sm">legality document required</Badge>}
          </>
        }
        title={po.supplierName}
        description={po.note}
        meta={
          <>
            <span className="text-[12.5px] text-fg-muted">Ordered {fmtDate(po.orderedAt)} by {po.raisedByName}</span>
            <span className="text-[12.5px] text-fg-muted">
              Expected {fmtDate(po.expectedAt)} ({relativeLabel(po.expectedAt)})
            </span>
            {project && (
              <span className="text-[12.5px] text-fg-muted">
                For <Link to={`/projects/${project.id}`} className="font-medium text-primary hover:underline">{project.code}</Link>
              </span>
            )}
          </>
        }
        actions={
          po.status === 'AWAITING_APPROVAL' ? (
            <Button variant="primary" onClick={() => store.approveOrder(po.id)}>Approve the order</Button>
          ) : null
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Order value" value={fmtCurrency(orderValue(po), 'IDR', { compact: true })} sub={`plus ${fmtCurrency(orderTax(po), 'IDR', { compact: true })} VAT`} icon={<ShoppingCart />} accent="primary" />
        <KpiCard label="Received" value={`${progress.receivedPct.toFixed(0)}%`} sub={`${fmtCurrency(progress.receivedValue, 'IDR', { compact: true })} across ${progress.deliveries} deliveries`} icon={<PackageCheck />} accent="success" />
        <KpiCard label="Still owed" value={fmtCurrency(progress.openValue, 'IDR', { compact: true })} sub={`${open.length} line${open.length === 1 ? '' : 's'} outstanding`} accent={progress.openValue > 0 ? 'warning' : 'accent'} />
        <KpiCard label="Rejected on arrival" value={fmtNumber(progress.rejectedQty, 2)} sub={progress.rejectedQty > 0 ? 'held in the quarantine bay' : 'nothing refused'} accent={progress.rejectedQty > 0 ? 'danger' : 'accent'} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Order lines"
              description="Received and rejected are written by the goods receipts. Nothing on this table can be edited into agreement."
            />
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[860px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                    <th className="px-4 py-2 font-medium">Item</th>
                    <th className="px-4 py-2 text-right font-medium">Ordered</th>
                    <th className="px-4 py-2 text-right font-medium">Received</th>
                    <th className="px-4 py-2 text-right font-medium">Rejected</th>
                    <th className="px-4 py-2 text-right font-medium">Outstanding</th>
                    <th className="px-4 py-2 text-right font-medium">Unit price</th>
                    <th className="px-4 py-2 text-right font-medium">Line value</th>
                    <th className="px-4 py-2 font-medium">Needed by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {po.lines.map((l) => {
                    const item = store.items.find((i) => i.id === l.itemId)
                    const outstanding = Math.max(0, l.qty - l.receivedQty)
                    return (
                      <tr key={l.id} className={cn('hover:bg-bg-muted/50', outstanding > 0 && 'bg-warning-soft/20')}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-fg">{l.description}</p>
                          <p className="text-[11.5px] text-fg-muted">{item?.sku}</p>
                        </td>
                        <td className="tnum px-4 py-2.5 text-right">{fmtNumber(l.qty, 2)} {uomLabel(l.uom)}</td>
                        <td className="tnum px-4 py-2.5 text-right text-success">{fmtNumber(l.receivedQty, 2)}</td>
                        <td className="tnum px-4 py-2.5 text-right text-danger">{l.rejectedQty ? fmtNumber(l.rejectedQty, 2) : '—'}</td>
                        <td className="tnum px-4 py-2.5 text-right font-medium">{outstanding ? fmtNumber(outstanding, 2) : '—'}</td>
                        <td className="tnum px-4 py-2.5 text-right text-fg-muted">
                          {fmtCurrency(lineNet(l), 'IDR', { compact: true })}
                          {l.discountPct > 0 && <span className="ml-1 text-[11px] text-accent">-{l.discountPct}%</span>}
                        </td>
                        <td className="tnum px-4 py-2.5 text-right font-medium">{fmtCurrency(l.qty * lineNet(l), 'IDR', { compact: true })}</td>
                        <td className="px-4 py-2.5 text-fg-muted">{fmtDate(l.neededBy, 'short')}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-surface-sunken font-semibold">
                    <td className="px-4 py-2.5">{po.lines.length} lines</td>
                    <td className="tnum px-4 py-2.5 text-right">{fmtNumber(progress.orderedQty, 2)}</td>
                    <td className="tnum px-4 py-2.5 text-right">{fmtNumber(progress.receivedQty, 2)}</td>
                    <td className="tnum px-4 py-2.5 text-right">{fmtNumber(progress.rejectedQty, 2)}</td>
                    <td className="tnum px-4 py-2.5 text-right">{fmtNumber(progress.openQty, 2)}</td>
                    <td />
                    <td className="tnum px-4 py-2.5 text-right">{fmtCurrency(orderValue(po), 'IDR', { compact: true })}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={<Truck />}
              title={`${receipts.length} deliver${receipts.length === 1 ? 'y' : 'ies'}`}
              description="A purchase order rarely arrives in one piece. Each delivery is its own record, with its own tally, its own inspection and its own legality reference."
            />
            <div className="divide-y divide-border">
              {receipts.length === 0 && <EmptyState title="Nothing has arrived" description="The supplier has not delivered against this order yet." />}
              {receipts.map((g) => {
                const delivered = g.lines.reduce((a, l) => a + l.qtyDelivered, 0)
                const accepted = g.lines.reduce((a, l) => a + l.qtyAccepted, 0)
                return (
                  <Link key={g.id} to={`/receipts/${g.id}`} className="block px-4 py-3 transition-colors hover:bg-bg-muted/60">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-fg">
                          {g.code}
                          <span className="ml-2 text-[11.5px] font-normal text-fg-muted">
                            delivery {g.sequence} of {receipts.length}
                          </span>
                        </p>
                        <p className="truncate text-[11.5px] text-fg-muted">
                          {fmtDate(g.receivedAt)} · note {g.deliveryNoteNo} · {g.vehicleNo} · {g.driverName}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge size="sm" tone={g.mode === 'FULL' ? 'success' : g.mode === 'DIRECT' ? 'purple' : 'warning'}>
                          {titleCase(g.mode)}
                        </Badge>
                        <StatusBadge value={g.qcResult} size="sm" />
                        <span className="tnum text-[12px] text-fg-muted">
                          {fmtNumber(accepted, 2)} accepted of {fmtNumber(delivered, 2)}
                        </span>
                      </div>
                    </div>
                    {g.note && <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">{g.note}</p>}
                    {g.lines.some((l) => l.qtyRejected > 0) && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {g.lines
                          .filter((l) => l.qtyRejected > 0)
                          .map((l) => (
                            <Badge key={l.id} size="sm" tone="danger">
                              {fmtNumber(l.qtyRejected, 2)} {uomLabel(l.uom)} — {rejectReasonLabel(l.rejectReason ?? 'DEFECT')}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Terms" />
            <CardBody className="divide-y divide-border py-0">
              <MetaRow label="Supplier">
                {supplier?.name}
                {supplier?.svlkCertified && <Badge size="sm" tone="accent" className="ml-1.5">SVLK</Badge>}
              </MetaRow>
              <MetaRow label="Payment">{po.paymentTermDays} days from invoice</MetaRow>
              <MetaRow label="Delivery mode">
                <Tooltip content={DELIVERY_MODES.find((m) => m.value === po.deliveryMode)?.hint ?? ''}>
                  <span>{deliveryModeLabel(po.deliveryMode)}</span>
                </Tooltip>
              </MetaRow>
              <MetaRow label="Receiving store">{warehouse?.name}</MetaRow>
              <MetaRow label="Part delivery">{po.partialAllowed ? 'allowed' : 'not allowed'}</MetaRow>
              <MetaRow label="Over-receipt tolerance">{po.overReceiptTolerancePct}%</MetaRow>
              <MetaRow label="Approved by">{po.approvedByName ?? <span className="text-danger">not approved</span>}</MetaRow>
            </CardBody>
            <CardBody className="border-t border-border">
              <UtilisationBar pct={progress.receivedPct} label={`${progress.receivedPct.toFixed(0)}% received`} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Still owed" description="The chase list, straight off the receipts." />
            <div className="divide-y divide-border">
              {open.length === 0 && <EmptyState title="Nothing outstanding" description="Everything ordered has been delivered." />}
              {open.map(({ line, open: qty }) => (
                <div key={line.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-fg">{line.description}</p>
                    <p className="text-[11.5px] text-fg-muted">needed by {fmtDate(line.neededBy)}</p>
                  </div>
                  <span className="tnum shrink-0 text-[12.5px] font-medium text-warning-soft-fg">
                    {fmtNumber(qty, 2)} {uomLabel(line.uom)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Bills" description="What the supplier has invoiced against this order." />
            <div className="divide-y divide-border">
              {bills.length === 0 && <EmptyState title="Nothing invoiced yet" />}
              {bills.map((b) => (
                <div key={b.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-fg">{b.code}</p>
                      <p className="truncate text-[11.5px] text-fg-muted">{b.supplierInvoiceNo} · due {fmtDate(b.dueAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge value={b.status} size="sm" />
                      <span className="tnum text-[12.5px] font-medium">{fmtCurrency(b.subtotal, 'IDR', { compact: true })}</span>
                    </div>
                  </div>
                  {b.disputeReason && <p className="mt-1 text-[11.5px] leading-relaxed text-danger">{b.disputeReason}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
