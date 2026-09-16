import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PackageCheck, ShieldAlert, Truck } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/misc'
import { MetaRow, StatusBadge } from '@/components/shared/status'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtDate, fmtDateTime, fmtNumber, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { lineNet, orderProgress } from '@/lib/procurement'
import { DELIVERY_MODES, rejectReasonLabel, uomLabel } from '@/data/reference'

export function ReceiptDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const store = useErp()
  const grn = store.receipts.find((g) => g.id === id)

  if (!grn) {
    return <EmptyState title="No such goods receipt" action={<Button onClick={() => navigate('/receipts')}>Back</Button>} />
  }

  const po = store.orders.find((o) => o.id === grn.poId)
  const project = store.projects.find((p) => p.id === grn.projectId)
  const warehouse = store.warehouses.find((w) => w.id === grn.warehouseId)
  const siblings = store.receipts.filter((g) => g.poId === grn.poId).sort((a, b) => a.sequence - b.sequence)
  const movements = store.movements.filter((m) => m.refCode === grn.code)
  const bill = store.bills.find((b) => b.receiptIds.includes(grn.id))
  const progress = po ? orderProgress(po, store.receipts) : null

  const delivered = grn.lines.reduce((a, l) => a + l.qtyDelivered, 0)
  const accepted = grn.lines.reduce((a, l) => a + l.qtyAccepted, 0)
  const rejected = grn.lines.reduce((a, l) => a + l.qtyRejected, 0)
  const value = grn.lines.reduce((a, l) => {
    const pl = po?.lines.find((x) => x.id === l.poLineId)
    return a + l.qtyAccepted * (pl ? lineNet(pl) : 0)
  }, 0)

  return (
    <div className="min-h-0">
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => navigate('/receipts')}>
        <ArrowLeft /> Goods receipts
      </Button>

      <PageHeader
        eyebrow={
          <>
            <Badge tone="primary" size="sm">{grn.code}</Badge>
            <Badge size="sm" tone={grn.mode === 'FULL' ? 'success' : grn.mode === 'DIRECT' ? 'purple' : 'warning'}>
              {titleCase(grn.mode)} · delivery {grn.sequence} of {siblings.length}
            </Badge>
            <StatusBadge value={grn.qcResult} size="sm" />
          </>
        }
        title={grn.supplierName}
        description={grn.note ?? DELIVERY_MODES.find((m) => m.value === po?.deliveryMode)?.hint}
        meta={
          <>
            <span className="text-[12.5px] text-fg-muted">Received {fmtDateTime(grn.receivedAt)} by {grn.receivedByName}</span>
            <span className="text-[12.5px] text-fg-muted">
              Against <Link to={`/purchase-orders/${grn.poId}`} className="font-medium text-primary hover:underline">{grn.poCode}</Link>
            </span>
            {project && (
              <span className="text-[12.5px] text-fg-muted">
                For <Link to={`/projects/${project.id}`} className="font-medium text-primary hover:underline">{project.code}</Link>
              </span>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Delivered" value={fmtNumber(delivered, 2)} sub="what the lorry brought" icon={<Truck />} accent="primary" />
        <KpiCard label="Accepted" value={fmtNumber(accepted, 2)} sub={`into ${warehouse?.name ?? 'store'}`} icon={<PackageCheck />} accent="success" />
        <KpiCard label="Rejected" value={fmtNumber(rejected, 2)} sub={rejected > 0 ? 'held in the quarantine bay' : 'nothing refused'} icon={<ShieldAlert />} accent={rejected > 0 ? 'danger' : 'accent'} />
        <KpiCard label="Value received" value={fmtCurrency(value, 'IDR', { compact: true })} sub="at the order price" accent="accent" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="The tally"
              description="What the delivery note claimed, what was counted, and what failed inspection at the gate."
            />
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[800px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                    <th className="px-5 py-2.5 font-medium">Item</th>
                    <th className="px-5 py-2.5 text-right font-medium">Delivered</th>
                    <th className="px-5 py-2.5 text-right font-medium">Accepted</th>
                    <th className="px-5 py-2.5 text-right font-medium">Rejected</th>
                    <th className="px-5 py-2.5 font-medium">Reason</th>
                    <th className="px-5 py-2.5 font-medium">Bin / batch</th>
                    <th className="px-5 py-2.5 font-medium">Legality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {grn.lines.map((l) => {
                    const item = store.items.find((i) => i.id === l.itemId)
                    return (
                      <tr key={l.id} className={cn(l.qtyRejected > 0 && 'bg-danger-soft/25')}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-fg">{l.description}</p>
                          <p className="text-[11.5px] text-fg-muted">
                            {item?.sku}
                            {l.moisturePct !== undefined && ` · moisture ${l.moisturePct}%`}
                          </p>
                          {l.note && <p className="mt-1 text-[11.5px] leading-relaxed text-warning-soft-fg">{l.note}</p>}
                        </td>
                        <td className="tnum px-5 py-3 text-right">{fmtNumber(l.qtyDelivered, 2)} {uomLabel(l.uom)}</td>
                        <td className="tnum px-5 py-3 text-right text-success">{fmtNumber(l.qtyAccepted, 2)}</td>
                        <td className="tnum px-5 py-3 text-right text-danger">{l.qtyRejected ? fmtNumber(l.qtyRejected, 2) : '—'}</td>
                        <td className="px-5 py-3">
                          {l.rejectReason ? (
                            <Badge size="sm" tone="danger">{rejectReasonLabel(l.rejectReason)}</Badge>
                          ) : (
                            <span className="text-fg-subtle">—</span>
                          )}
                        </td>
                        <td className="tnum px-5 py-3 text-fg-muted">
                          {l.binCode ?? '—'}
                          <span className="block text-[11px] text-fg-subtle">{l.batchNo}</span>
                        </td>
                        <td className="tnum px-5 py-3">
                          {l.legalityDocNo ? (
                            <span className="text-[11.5px] text-fg-muted">{l.legalityDocNo}</span>
                          ) : item?.legalityControlled ? (
                            <Badge size="sm" tone="danger">missing</Badge>
                          ) : (
                            <span className="text-fg-subtle">n/a</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {grn.lines.some((l) => l.rejectReason === 'NO_LEGALITY_DOC') && (
              <CardBody className="border-t border-border bg-danger-soft/30">
                <p className="text-[12.5px] leading-relaxed text-danger-soft-fg">
                  <strong className="font-semibold">This batch cannot enter the V-Legal chain.</strong> Indonesian timber
                  legality is a chain, not a certificate: a batch with no supplier reference behind it cannot be carried
                  into the V-Legal document for the consignment it ends up in. Until the supplier produces the document,
                  it stays in quarantine and no work order may draw on it.
                </p>
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Stock movements this receipt created"
              description="Posting a receipt is the only thing that moves stock in. There is no separate balance anybody can adjust to agree with it."
            />
            <div className="divide-y divide-border">
              {movements.length === 0 && <EmptyState title="No movements found" description="This receipt was recorded but never posted to the ledger." />}
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-fg">
                      {store.items.find((i) => i.id === m.itemId)?.name}
                    </p>
                    <p className="truncate text-[11.5px] text-fg-muted">
                      {m.refType} → {store.warehouses.find((w) => w.id === m.warehouseId)?.name}
                      {m.binCode ? ` · bin ${m.binCode}` : ''} · {fmtDateTime(m.at)}
                    </p>
                    {m.note && <p className="truncate text-[11.5px] text-fg-subtle">{m.note}</p>}
                  </div>
                  <span className={cn('tnum shrink-0 text-[13px] font-semibold', m.qty > 0 ? 'text-success' : 'text-danger')}>
                    {m.qty > 0 ? '+' : ''}{fmtNumber(m.qty, 2)} {uomLabel(m.uom)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="The delivery" />
            <CardBody className="divide-y divide-border py-0">
              <MetaRow label="Delivery note">{grn.deliveryNoteNo}</MetaRow>
              <MetaRow label="Vehicle">{grn.vehicleNo ?? '—'}</MetaRow>
              <MetaRow label="Driver">{grn.driverName ?? '—'}</MetaRow>
              <MetaRow label="Received into">{warehouse?.name}</MetaRow>
              {grn.deliveredToName && <MetaRow label="Delivered to">{grn.deliveredToName}</MetaRow>}
              <MetaRow label="Inspected by">{grn.qcByName}</MetaRow>
              <MetaRow label="Posted">{grn.posted ? 'yes' : <span className="text-danger">no</span>}</MetaRow>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Where the order stands"
              description="After this delivery and every other one against it."
            />
            <CardBody className="divide-y divide-border py-0">
              <MetaRow label="Order">{grn.poCode}</MetaRow>
              <MetaRow label="Ordered">{fmtNumber(progress?.orderedQty ?? 0, 2)}</MetaRow>
              <MetaRow label="Received">{fmtNumber(progress?.receivedQty ?? 0, 2)}</MetaRow>
              <MetaRow label="Still owed">
                <span className={(progress?.openQty ?? 0) > 0 ? 'text-warning-soft-fg' : undefined}>
                  {fmtNumber(progress?.openQty ?? 0, 2)}
                </span>
              </MetaRow>
              <MetaRow label="Deliveries so far">{siblings.length}</MetaRow>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Other deliveries on this order" />
            <div className="divide-y divide-border">
              {siblings.map((g) => (
                <Link
                  key={g.id}
                  to={`/receipts/${g.id}`}
                  className={cn(
                    'flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-bg-muted/60',
                    g.id === grn.id && 'bg-primary-soft/40',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-fg">{g.code}</p>
                    <p className="truncate text-[11.5px] text-fg-muted">{fmtDate(g.receivedAt)} · {titleCase(g.mode)}</p>
                  </div>
                  <span className="tnum shrink-0 text-[12px] text-fg-muted">
                    {fmtNumber(g.lines.reduce((a, l) => a + l.qtyAccepted, 0), 2)}
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          {bill && (
            <Card>
              <CardHeader title="Invoiced" description="What the supplier billed for this delivery." />
              <CardBody className="divide-y divide-border py-0">
                <MetaRow label="Bill">{bill.code}</MetaRow>
                <MetaRow label="Their invoice">{bill.supplierInvoiceNo}</MetaRow>
                <MetaRow label="Amount">{fmtCurrency(bill.subtotal, 'IDR', { compact: true })}</MetaRow>
                <MetaRow label="Status"><StatusBadge value={bill.status} size="sm" /></MetaRow>
              </CardBody>
              {bill.disputeReason && (
                <CardBody className="border-t border-border">
                  <p className="text-[12px] leading-relaxed text-danger">{bill.disputeReason}</p>
                </CardBody>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
