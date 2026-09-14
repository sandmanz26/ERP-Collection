import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, Ban, Building2, PackageCheck, Receipt, ShoppingCart, Truck, Wallet,
} from 'lucide-react'
import type { GoodsReceipt, GoodsReceiptLine, PaymentMethod, PurchaseOrder, SupplierPayment } from '@/data/types'
import { useErp } from '@/store/useErp'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { MetaRow, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Dialog, DialogContent, Sheet } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { EmptyState } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { uid } from '@/lib/utils'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import {
  acceptsReceipt, daysLate, outstandingQty, paymentState, poLineTotal, poTotals, receiptProgress,
} from '@/lib/purchasing'
import { divisionsBehind } from '@/lib/procurement'

const TH = 'whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted'
const TD = 'border-b border-border px-3 py-2.5 align-top'

const METHODS: { value: PaymentMethod; label: string; description: string }[] = [
  { value: 'TRANSFER', label: 'Bank transfer', description: 'The usual route; record the transfer reference' },
  { value: 'GIRO', label: 'Giro', description: 'Post-dated — the money leaves on the giro date' },
  { value: 'CHEQUE', label: 'Cheque', description: 'Handed over; record the cheque number' },
  { value: 'CASH', label: 'Cash', description: 'Petty cash, for small orders only' },
]

/* ================================================================
   Receiving a delivery
   ================================================================ */

function ReceiveSheet({ po, open, onOpenChange }: { po: PurchaseOrder; open: boolean; onOpenChange: (v: boolean) => void }) {
  const toast = useToast()
  const { items, warehouses, goodsReceipts, recordGoodsReceipt } = useErp()
  const [warehouseId, setWarehouseId] = React.useState(po.warehouseId)
  const [receivedAt, setReceivedAt] = React.useState(new Date().toISOString())
  const [deliveryNote, setDeliveryNote] = React.useState('')
  const [vehicleNo, setVehicleNo] = React.useState('')
  const [note, setNote] = React.useState('')
  const [rows, setRows] = React.useState<Record<string, { received: number; rejected: number; reason: string; bin: string; batch: string; expiry: string }>>({})
  const [error, setError] = React.useState('')

  const open_lines = po.lines.filter((l) => outstandingQty(l) > 0)

  React.useEffect(() => {
    if (!open) return
    /* A delivery is assumed complete until the storekeeper says otherwise: that
       is the common case, and it is the one that should take no typing. */
    setRows(
      Object.fromEntries(
        open_lines.map((l) => [l.id, { received: outstandingQty(l), rejected: 0, reason: '', bin: 'RAK-TERIMA', batch: '', expiry: '' }]),
      ),
    )
    setWarehouseId(po.warehouseId)
    setReceivedAt(new Date().toISOString())
    setDeliveryNote('')
    setVehicleNo('')
    setNote('')
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, po.id])

  const set = (lineId: string, patch: Partial<(typeof rows)[string]>) =>
    setRows((r) => ({ ...r, [lineId]: { ...r[lineId], ...patch } }))

  const totalUnits = Object.values(rows).reduce((a, r) => a + (r.received || 0), 0)
  const totalValue = open_lines.reduce((a, l) => a + (rows[l.id]?.received ?? 0) * l.unitPrice, 0)

  const save = () => {
    const lines: GoodsReceiptLine[] = []
    for (const line of open_lines) {
      const row = rows[line.id]
      if (!row) continue
      const received = Number(row.received) || 0
      const rejected = Number(row.rejected) || 0
      if (received <= 0 && rejected <= 0) continue
      if (received + rejected > outstandingQty(line)) {
        const item = items.find((i) => i.id === line.itemId)
        setError(`${item?.sku ?? 'A line'} has only ${outstandingQty(line)} outstanding.`)
        return
      }
      const item = items.find((i) => i.id === line.itemId)
      if (received > 0 && item?.trackBatch && !row.batch.trim()) {
        setError(`${item.name} is batch tracked — record the batch number before receiving it.`)
        return
      }
      if (received > 0 && item?.hasExpiry && !row.expiry) {
        setError(`${item.name} carries an expiry date — record it before receiving.`)
        return
      }
      if (rejected > 0 && !row.reason.trim()) {
        setError(`Say why ${item?.sku ?? 'a line'} was rejected — the supplier will ask.`)
        return
      }
      lines.push({
        id: uid('grl'),
        poLineId: line.id,
        itemId: line.itemId,
        qtyReceived: received,
        qtyRejected: rejected,
        rejectReason: rejected > 0 ? row.reason : undefined,
        binLocation: row.bin.trim() || 'RAK-TERIMA',
        batchNo: row.batch.trim() || undefined,
        expiryDate: row.expiry || undefined,
        unitCost: line.unitPrice,
      })
    }

    if (lines.length === 0) {
      setError('Nothing has been entered as received or rejected.')
      return
    }

    const year = new Date().getFullYear()
    const receipt: GoodsReceipt = {
      id: uid('grn'),
      code: `GRN-${year}-${String(goodsReceipts.filter((g) => g.code.startsWith(`GRN-${year}`)).length + 1).padStart(4, '0')}`,
      purchaseOrderId: po.id,
      supplierId: po.supplierId,
      warehouseId,
      receivedAt,
      deliveryNote: deliveryNote.trim() || undefined,
      vehicleNo: vehicleNo.trim() || undefined,
      lines,
      receivedBy: '',
      onTime: receivedAt <= po.expectedAt,
      createdAt: new Date().toISOString(),
      note: note.trim() || undefined,
    }

    const result = recordGoodsReceipt(receipt)
    if (!result.ok) {
      setError(result.error ?? 'That delivery could not be recorded.')
      return
    }
    toast.push({
      tone: 'success',
      title: `${receipt.code} received`,
      description: `${fmtNumber(totalUnits)} units into ${warehouses.find((w) => w.id === warehouseId)?.name}. The prices paid are now the last purchase prices for those items.`,
    })
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-4xl"
      eyebrow={<Badge tone="primary" size="sm">{po.code}</Badge>}
      title="Record a delivery"
      description="Only what physically arrived. Rejected goods never enter stock and stay owed on the order."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save}>
            <PackageCheck /> Receive {fmtNumber(totalUnits)} units
          </Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Received into" required hint="Where the goods physically went">
          <Select
            value={warehouseId}
            onChange={setWarehouseId}
            options={warehouses.map((w) => ({ value: w.id, label: w.name, description: `${w.code} · ${w.city}` }))}
          />
        </Field>
        <Field label="Received on" required>
          <DatePicker value={receivedAt} onChange={(v) => setReceivedAt(v ?? new Date().toISOString())} clearable={false} />
        </Field>
        <Field label="Delivery note" hint="Nomor surat jalan">
          <Input value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} placeholder="SJ/2026/09/1234" />
        </Field>
        <Field label="Vehicle" hint="optional">
          <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value.toUpperCase())} placeholder="B 1234 XYZ" />
        </Field>
      </div>

      {receivedAt > po.expectedAt && (
        <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg bg-warning-soft/50 px-3 py-2.5 text-[12.5px] text-warning-soft-fg">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>This is after the {fmtDate(po.expectedAt)} the supplier promised. The delivery will be recorded as late.</span>
        </div>
      )}

      <div className="scrollbar-thin overflow-x-auto border-y border-border">
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              <th className={TH}>Item</th>
              <th className={`${TH} text-right`}>Outstanding</th>
              <th className={`${TH} text-right`}>Received</th>
              <th className={`${TH} text-right`}>Rejected</th>
              <th className={TH}>Bin</th>
              <th className={TH}>Batch / expiry</th>
            </tr>
          </thead>
          <tbody>
            {open_lines.map((line) => {
              const item = items.find((i) => i.id === line.itemId)
              const row = rows[line.id]
              if (!row) return null
              return (
                <tr key={line.id}>
                  <td className={TD}>
                    <p className="max-w-[168px] truncate font-medium text-fg">{item?.name}</p>
                    <p className="font-mono text-[11px] text-fg-subtle">{item?.sku} · {fmtCurrency(line.unitPrice, 'IDR')}</p>
                  </td>
                  <td className={`${TD} tnum whitespace-nowrap text-right text-fg-muted`}>
                    {fmtNumber(outstandingQty(line))} <span className="text-[11px] text-fg-subtle">{item?.uom}</span>
                  </td>
                  <td className={`${TD} text-right`}>
                    <Input
                      type="number"
                      min={0}
                      max={outstandingQty(line)}
                      value={row.received}
                      onChange={(e) => set(line.id, { received: Number(e.target.value) })}
                      className="tnum w-[80px]"
                    />
                  </td>
                  <td className={`${TD} text-right`}>
                    <Input
                      type="number"
                      min={0}
                      value={row.rejected}
                      onChange={(e) => set(line.id, { rejected: Number(e.target.value) })}
                      className="tnum w-[80px]"
                    />
                    {row.rejected > 0 && (
                      <Input
                        value={row.reason}
                        onChange={(e) => set(line.id, { reason: e.target.value })}
                        placeholder="Why it was sent back"
                        className="mt-1.5 w-[160px]"
                      />
                    )}
                  </td>
                  <td className={TD}>
                    <Input value={row.bin} onChange={(e) => set(line.id, { bin: e.target.value.toUpperCase() })} className="w-[108px]" />
                  </td>
                  <td className={TD}>
                    <div className="flex flex-col gap-1.5">
                      <Input
                        value={row.batch}
                        onChange={(e) => set(line.id, { batch: e.target.value.toUpperCase() })}
                        placeholder={item?.trackBatch ? 'required' : 'optional'}
                        invalid={!!item?.trackBatch && !row.batch && row.received > 0}
                        className="w-[124px]"
                      />
                      {item?.hasExpiry && (
                        <DatePicker value={row.expiry || null} onChange={(v) => set(line.id, { expiry: v ?? '' })} size="sm" className="w-[124px]" />
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-5">
        <Field label="Note" hint="optional">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Anything the warehouse should know about this delivery" />
        </Field>
        {error && (
          <p className="flex items-start gap-2 rounded-lg bg-danger-soft/50 px-3 py-2.5 text-[12.5px] text-danger-soft-fg">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
          </p>
        )}
        <p className="text-[12.5px] text-fg-muted">
          Receiving posts <span className="font-medium text-fg">{fmtNumber(totalUnits)} units</span> worth{' '}
          <span className="font-medium text-fg">{fmtCurrency(totalValue, 'IDR')}</span> into the warehouse, and records what was
          paid per item — which is what next month's "last purchase price" reads.
        </p>
      </div>
    </Sheet>
  )
}

/* ================================================================
   Paying
   ================================================================ */

function PayDialog({ po, open, onOpenChange }: { po: PurchaseOrder; open: boolean; onOpenChange: (v: boolean) => void }) {
  const toast = useToast()
  const { payments, goodsReceipts, suppliers, recordPayment } = useErp()
  const state = paymentState(po, payments, goodsReceipts)
  const [amount, setAmount] = React.useState(0)
  const [method, setMethod] = React.useState<PaymentMethod>('TRANSFER')
  const [paidAt, setPaidAt] = React.useState(new Date().toISOString())
  const [reference, setReference] = React.useState('')
  const [note, setNote] = React.useState('')
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setAmount(Math.round(state.outstanding))
    setMethod('TRANSFER')
    setPaidAt(new Date().toISOString())
    setReference('')
    setNote('')
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, po.id])

  const supplier = suppliers.find((s) => s.id === po.supplierId)
  const partial = amount > 0 && amount < state.outstanding

  const save = () => {
    const year = new Date().getFullYear()
    const row: SupplierPayment = {
      id: uid('pay'),
      code: `PAY-${year}-${String(payments.filter((p) => p.code.startsWith(`PAY-${year}`)).length + 1).padStart(4, '0')}`,
      purchaseOrderId: po.id,
      supplierId: po.supplierId,
      amount: Math.round(amount),
      method,
      paidAt,
      reference: reference.trim() || undefined,
      bankAccount: supplier?.bankAccount,
      paidBy: '',
      createdAt: new Date().toISOString(),
      note: note.trim() || undefined,
    }
    const result = recordPayment(row)
    if (!result.ok) {
      setError(result.error ?? 'That payment could not be recorded.')
      return
    }
    toast.push({
      tone: 'success',
      title: `${row.code} recorded`,
      description: partial
        ? `${fmtCurrency(row.amount, 'IDR')} paid — ${fmtCurrency(state.outstanding - row.amount, 'IDR')} still outstanding on ${po.code}.`
        : `${po.code} is settled in full.`,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        icon={<Wallet />}
        title={`Pay ${po.code}`}
        description={`${supplier?.legalName} · ${po.paymentTermDays} day terms${state.started ? `, due ${fmtDate(state.dueAt)}` : ', term starts at the first delivery'}`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={save}>
              <Wallet /> Record {partial ? 'part payment' : 'payment'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 p-5">
          <div className="grid gap-3 rounded-lg border border-border bg-surface-sunken/60 p-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.055em] text-fg-subtle">Order value</p>
              <p className="tnum text-[14px] font-semibold text-fg">{fmtCurrency(state.total, 'IDR')}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.055em] text-fg-subtle">Already paid</p>
              <p className="tnum text-[14px] font-semibold text-fg">{fmtCurrency(state.paid, 'IDR')}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.055em] text-fg-subtle">Outstanding</p>
              <p className={`tnum text-[14px] font-semibold ${state.overdue ? 'text-danger' : 'text-fg'}`}>
                {fmtCurrency(state.outstanding, 'IDR')}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount" required hint={partial ? 'a part payment — the rest stays outstanding' : 'settles the order in full'}>
              <div className="flex gap-2">
                <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="tnum" />
                <Button variant="secondary" size="sm" onClick={() => setAmount(Math.round(state.outstanding))}>
                  Full
                </Button>
              </div>
            </Field>
            <Field label="Paid on" required>
              <DatePicker value={paidAt} onChange={(v) => setPaidAt(v ?? new Date().toISOString())} clearable={false} />
            </Field>
            <Field label="Method" required>
              <Select value={method} onChange={setMethod} options={METHODS} />
            </Field>
            <Field label="Reference" hint="Nomor bukti transfer / cek">
              <Input value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} placeholder="TRF/BCA/26090412" />
            </Field>
          </div>

          <Field label="Note" hint="optional">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </Field>

          {state.prepaid > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-warning-soft/50 px-3 py-2.5 text-[12.5px] text-warning-soft-fg">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              This order is already paid ahead of what has been delivered. That is fine as a deposit — just make sure it is one.
            </p>
          )}
          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-danger-soft/50 px-3 py-2.5 text-[12.5px] text-danger-soft-fg">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================
   The order
   ================================================================ */

export function PurchaseOrderDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const can = useCan()
  const {
    purchaseOrders, suppliers, items, warehouses, goodsReceipts, payments, purchaseRequests, divisions,
    purchasePrices, closePurchaseOrder,
  } = useErp()

  const [tab, setTab] = React.useState<'lines' | 'receipts' | 'payments'>('lines')
  const [receiveOpen, setReceiveOpen] = React.useState(false)
  const [payOpen, setPayOpen] = React.useState(false)
  const [closing, setClosing] = React.useState<'CLOSED' | 'CANCELLED' | null>(null)
  const [closeReason, setCloseReason] = React.useState('')

  const po = purchaseOrders.find((p) => p.id === id)

  if (!po) {
    return (
      <EmptyState
        icon={<ShoppingCart />}
        title="This purchase order is no longer in the register"
        description="It may have been deleted. Open the register to find another."
        action={<Button variant="primary" size="sm" onClick={() => nav('/purchase-orders')}>Back to purchase orders</Button>}
      />
    )
  }

  const supplier = suppliers.find((s) => s.id === po.supplierId)
  const warehouse = warehouses.find((w) => w.id === po.warehouseId)
  const pr = purchaseRequests.find((p) => p.id === po.purchaseRequestId)
  const totals = poTotals(po)
  const progress = receiptProgress(po)
  const pay = paymentState(po, payments, goodsReceipts)
  const receipts = goodsReceipts
    .filter((g) => g.purchaseOrderId === po.id)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
  const late = daysLate(po)

  /**
   * Which divisions are waiting on this order, and for how much of it. Purely
   * informational: an order is placed with a supplier, and a division has no
   * standing in it — but the storekeeper still gets asked "who is this for".
   */
  const waiting = (() => {
    if (!pr) return []
    const prLines = po.lines
      .map((line) => pr.lines.find((l) => l.id === line.prLineId))
      .filter((l): l is NonNullable<typeof l> => !!l)
    return divisionsBehind(prLines, purchasePrices, items)
  })()
  const waitingDivisions = waiting
    .map((row) => divisions.find((d) => d.id === row.divisionId)?.code)
    .filter(Boolean) as string[]

  const close = () => {
    if (!closing || !closeReason.trim()) return
    closePurchaseOrder(po.id, closing, closeReason.trim())
    toast.push({
      tone: 'warning',
      title: `${po.code} ${closing === 'CLOSED' ? 'closed short' : 'cancelled'}`,
      description:
        closing === 'CLOSED'
          ? `${fmtNumber(progress.outstanding)} units will not be delivered. What has arrived stays in stock.`
          : 'Nothing further will be delivered or paid against this order.',
    })
    setClosing(null)
    setCloseReason('')
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <Link to="/purchase-orders" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-fg-muted hover:text-primary">
            <ArrowLeft className="size-3.5" /> Purchase orders
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono">{po.code}</span>
            <StatusBadge value={po.status} tone={po.status === 'CLOSED' ? 'neutral' : undefined} />
            <StatusBadge value={pay.state} />
          </span>
        }
        description={`${supplier?.legalName ?? 'Unknown supplier'} — ordered ${fmtDate(po.orderedAt)}, expected ${fmtDate(po.expectedAt)}${late ? `, now ${late} days late` : ''}.`}
        meta={
          <>
            <span className="text-[12px] text-fg-muted">Deliver to <span className="font-medium text-fg">{warehouse?.name}</span></span>
            {pr && (
              <Link to={`/purchase-requests/${pr.id}`} className="text-[12px] font-medium text-primary hover:underline">
                From {pr.code}
              </Link>
            )}
            {waitingDivisions.length > 0 && (
              <span className="text-[12px] text-fg-muted">For {waitingDivisions.join(', ')}</span>
            )}
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {can('po.close') && acceptsReceipt(po) && (
              <Button variant="secondary" onClick={() => { setClosing(progress.received > 0 ? 'CLOSED' : 'CANCELLED'); setCloseReason('') }}>
                <Ban /> {progress.received > 0 ? 'Close short' : 'Cancel'}
              </Button>
            )}
            {can('payments.pay') && pay.outstanding > 0 && po.status !== 'CANCELLED' && po.status !== 'DRAFT' && (
              <Button variant="secondary" onClick={() => setPayOpen(true)}>
                <Wallet /> Record payment
              </Button>
            )}
            {can('grn.receive') && acceptsReceipt(po) && (
              <Button variant="primary" onClick={() => setReceiveOpen(true)}>
                <PackageCheck /> Receive delivery
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Delivered"
          value={`${progress.pct}%`}
          icon={<Truck />}
          accent={progress.pct === 100 ? 'success' : late ? 'danger' : 'primary'}
          sub={`${fmtNumber(progress.received)} of ${fmtNumber(progress.ordered)} units · ${receipts.length} deliveries`}
        />
        <KpiCard
          label="Order value"
          value={fmtCurrency(totals.total, 'IDR', { compact: true })}
          icon={<Receipt />}
          accent="accent"
          sub={`${fmtCurrency(totals.subtotal, 'IDR', { compact: true })} + PPN ${Math.round(po.taxRate * 100)}%`}
        />
        <KpiCard
          label="Paid"
          value={fmtCurrency(pay.paid, 'IDR', { compact: true })}
          icon={<Wallet />}
          accent={pay.state === 'PAID' ? 'success' : pay.state === 'PARTIAL' ? 'warning' : 'neutral'}
          sub={`${pay.payments.length} payment${pay.payments.length === 1 ? '' : 's'} recorded`}
        />
        <KpiCard
          label="Outstanding"
          value={fmtCurrency(pay.outstanding, 'IDR', { compact: true })}
          icon={<AlertTriangle />}
          accent={pay.outstanding === 0 ? 'success' : pay.overdue ? 'danger' : 'warning'}
          sub={
            pay.outstanding === 0
              ? 'settled in full'
              : pay.started
                ? `due ${fmtDate(pay.dueAt)}${pay.overdue ? ` · ${pay.daysOverdue} days over` : ''}`
                : 'term starts at the first delivery'
          }
        />
      </div>

      {po.closeReason && (
        <Card className="mb-5">
          <CardBody className="flex items-start gap-2 text-[12.5px] text-fg-muted">
            <Ban className="mt-0.5 size-4 shrink-0 text-danger" />
            <span>
              <span className="font-medium text-fg">{po.status === 'CLOSED' ? 'Closed short' : 'Cancelled'}</span>{' '}
              {po.closedAt && `on ${fmtDate(po.closedAt)}`} — {po.closeReason}
            </span>
          </CardBody>
        </Card>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: 'lines', label: 'Order lines', count: po.lines.length },
          { value: 'receipts', label: 'Deliveries', count: receipts.length },
          { value: 'payments', label: 'Payments', count: pay.payments.length },
        ]}
      />

      {tab === 'lines' && (
        <Card>
          <CardHeader
            title="What was ordered"
            description="Outstanding is what the supplier still owes. Rejected goods stay outstanding until they are delivered again."
            icon={<ShoppingCart />}
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  <th className={TH}>SKU</th>
                  <th className={TH}>Item</th>
                  <th className={`${TH} text-right`}>Ordered</th>
                  <th className={`${TH} text-right`}>Received</th>
                  <th className={`${TH} text-right`}>Outstanding</th>
                  <th className={`${TH} text-right`}>Unit price</th>
                  <th className={`${TH} text-right`}>Line value</th>
                </tr>
              </thead>
              <tbody>
                {po.lines.map((line) => {
                  const item = items.find((i) => i.id === line.itemId)
                  const left = outstandingQty(line)
                  return (
                    <tr key={line.id} className={left === 0 ? 'bg-success-soft/20' : undefined}>
                      <td className={`${TD} whitespace-nowrap font-mono text-[11.5px] text-fg-muted`}>{item?.sku}</td>
                      <td className={TD}>
                        <p className="max-w-[280px] truncate font-medium text-fg">{item?.name ?? 'Removed item'}</p>
                      </td>
                      <td className={`${TD} tnum whitespace-nowrap text-right text-fg`}>
                        {fmtNumber(line.qty)} <span className="text-[11px] text-fg-subtle">{item?.uom}</span>
                      </td>
                      <td className={`${TD} tnum whitespace-nowrap text-right font-medium text-fg`}>{fmtNumber(line.qtyReceived)}</td>
                      <td className={`${TD} tnum whitespace-nowrap text-right ${left > 0 ? 'font-medium text-warning' : 'text-fg-subtle'}`}>
                        {left > 0 ? fmtNumber(left) : '—'}
                      </td>
                      <td className={`${TD} tnum whitespace-nowrap text-right text-fg-muted`}>{fmtCurrency(line.unitPrice, 'IDR')}</td>
                      <td className={`${TD} tnum whitespace-nowrap text-right font-semibold text-fg`}>
                        {fmtCurrency(poLineTotal(line), 'IDR', { compact: true })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="px-3 py-2 text-right text-[12px] text-fg-muted">Subtotal</td>
                  <td className="tnum whitespace-nowrap px-3 py-2 text-right text-[12.5px] text-fg">{fmtCurrency(totals.subtotal, 'IDR')}</td>
                </tr>
                <tr>
                  <td colSpan={6} className="px-3 py-2 text-right text-[12px] text-fg-muted">PPN {Math.round(po.taxRate * 100)}%</td>
                  <td className="tnum whitespace-nowrap px-3 py-2 text-right text-[12.5px] text-fg">{fmtCurrency(totals.tax, 'IDR')}</td>
                </tr>
                <tr>
                  <td colSpan={6} className="px-3 py-2.5 text-right text-[12.5px] font-medium text-fg">Total</td>
                  <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-[14px] font-semibold text-fg">{fmtCurrency(totals.total, 'IDR')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {tab === 'lines' && waiting.length > 0 && (
        <Card className="mt-4">
          <CardHeader
            icon={<Building2 />}
            title="Divisions waiting on this order"
            description="Who asked for what is on it, taken from the purchase request. Information only — the order is placed with the supplier."
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  <th className={TH}>Division</th>
                  <th className={`${TH} text-right`}>Lines</th>
                  <th className={`${TH} text-right`}>Units</th>
                  <th className={TH}>Share of this order</th>
                </tr>
              </thead>
              <tbody>
                {waiting.map((row) => {
                  const division = divisions.find((d) => d.id === row.divisionId)
                  const totalQty = waiting.reduce((a, x) => a + x.qty, 0)
                  const share = totalQty ? Math.round((row.qty / totalQty) * 100) : 0
                  return (
                    <tr key={row.divisionId}>
                      <td className={TD}>
                        <p className="font-medium text-fg">{division?.name ?? 'Unknown division'}</p>
                        <p className="text-[11px] text-fg-subtle">{division?.code} · {division?.headName}</p>
                      </td>
                      <td className={`${TD} tnum text-right text-fg-muted`}>{row.lines}</td>
                      <td className={`${TD} tnum text-right font-medium text-fg`}>{fmtNumber(row.qty)}</td>
                      <td className={TD}>
                        <div className="w-[180px]">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-soft">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                          </div>
                          <p className="tnum mt-1 text-[11px] text-fg-subtle">{share}% of the units</p>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'receipts' && (
        <div className="space-y-4">
          {receipts.length === 0 && (
            <Card>
              <EmptyState
                icon={<Truck />}
                title="Nothing has arrived yet"
                description={late ? `This order is ${late} days past the date the supplier promised.` : `Expected ${fmtDate(po.expectedAt)}.`}
                action={
                  can('grn.receive') && acceptsReceipt(po) ? (
                    <Button variant="primary" size="sm" onClick={() => setReceiveOpen(true)}>
                      <PackageCheck /> Record a delivery
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          )}
          {receipts.map((receipt) => {
            const units = receipt.lines.reduce((a, l) => a + l.qtyReceived, 0)
            const rejected = receipt.lines.reduce((a, l) => a + l.qtyRejected, 0)
            const value = receipt.lines.reduce((a, l) => a + l.qtyReceived * l.unitCost, 0)
            return (
              <Card key={receipt.id}>
                <CardHeader
                  icon={<PackageCheck />}
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono">{receipt.code}</span>
                      <Badge tone={receipt.onTime ? 'success' : 'warning'} size="sm">{receipt.onTime ? 'On time' : 'Late'}</Badge>
                      {rejected > 0 && <Badge tone="danger" size="sm">{fmtNumber(rejected)} rejected</Badge>}
                    </span>
                  }
                  description={`${fmtDate(receipt.receivedAt)} · ${fmtNumber(units)} units · ${fmtCurrency(value, 'IDR', { compact: true })} · received by ${receipt.receivedBy || '—'}${receipt.deliveryNote ? ` · ${receipt.deliveryNote}` : ''}`}
                  actions={<span className="text-[11px] text-fg-subtle">{warehouses.find((w) => w.id === receipt.warehouseId)?.code}</span>}
                />
                <div className="scrollbar-thin overflow-x-auto">
                  <table className="w-full border-separate border-spacing-0 text-[13px]">
                    <thead>
                      <tr>
                        <th className={TH}>Item</th>
                        <th className={`${TH} text-right`}>Received</th>
                        <th className={`${TH} text-right`}>Rejected</th>
                        <th className={TH}>Bin</th>
                        <th className={TH}>Batch</th>
                        <th className={`${TH} text-right`}>Unit cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipt.lines.map((line) => {
                        const item = items.find((i) => i.id === line.itemId)
                        return (
                          <tr key={line.id}>
                            <td className={TD}>
                              <p className="max-w-[280px] truncate font-medium text-fg">{item?.name}</p>
                              <p className="font-mono text-[11px] text-fg-subtle">{item?.sku}</p>
                            </td>
                            <td className={`${TD} tnum whitespace-nowrap text-right font-medium text-fg`}>{fmtNumber(line.qtyReceived)}</td>
                            <td className={`${TD} tnum whitespace-nowrap text-right`}>
                              {line.qtyRejected > 0 ? (
                                <Tooltip content={line.rejectReason ?? 'Rejected'}>
                                  <span className="font-medium text-danger">{fmtNumber(line.qtyRejected)}</span>
                                </Tooltip>
                              ) : (
                                <span className="text-fg-subtle">—</span>
                              )}
                            </td>
                            <td className={`${TD} font-mono text-[11.5px] text-fg-muted`}>{line.binLocation}</td>
                            <td className={`${TD} font-mono text-[11.5px] text-fg-muted`}>
                              {line.batchNo ?? '—'}
                              {line.expiryDate && <span className="block text-[11px] text-fg-subtle">exp {fmtDate(line.expiryDate)}</span>}
                            </td>
                            <td className={`${TD} tnum whitespace-nowrap text-right text-fg-muted`}>{fmtCurrency(line.unitCost, 'IDR')}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {receipt.note && (
                  <div className="border-t border-border bg-surface-sunken/60 px-4 py-2.5 text-[12px] text-fg-muted">{receipt.note}</div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'payments' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader
              icon={<Wallet />}
              title="Payments against this order"
              description="Full or partial, as many as it takes. The order is settled when nothing is outstanding."
            />
            {pay.payments.length === 0 ? (
              <EmptyState
                icon={<Wallet />}
                title="Nothing paid yet"
                description={pay.started ? `Due ${fmtDate(pay.dueAt)} under ${po.paymentTermDays} day terms.` : 'The term has not started: nothing has been delivered.'}
                action={
                  can('payments.pay') && po.status !== 'CANCELLED' ? (
                    <Button variant="primary" size="sm" onClick={() => setPayOpen(true)}>
                      <Wallet /> Record a payment
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="scrollbar-thin overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-[13px]">
                  <thead>
                    <tr>
                      <th className={TH}>Payment</th>
                      <th className={TH}>Date</th>
                      <th className={TH}>Method</th>
                      <th className={TH}>Reference</th>
                      <th className={`${TH} text-right`}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pay.payments.map((p) => (
                      <tr key={p.id}>
                        <td className={`${TD} whitespace-nowrap font-mono text-[12px] font-medium text-fg`}>{p.code}</td>
                        <td className={`${TD} tnum whitespace-nowrap text-fg-muted`}>{fmtDate(p.paidAt)}</td>
                        <td className={TD}>
                          <Badge tone="outline" size="sm">{p.method.toLowerCase()}</Badge>
                        </td>
                        <td className={`${TD} font-mono text-[11.5px] text-fg-muted`}>
                          {p.reference ?? '—'}
                          {p.note && <span className="block max-w-[280px] truncate font-sans text-[11px] text-fg-subtle">{p.note}</span>}
                        </td>
                        <td className={`${TD} tnum whitespace-nowrap text-right font-semibold text-fg`}>{fmtCurrency(p.amount, 'IDR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="h-fit">
            <CardHeader title="Settlement" icon={<Receipt />} />
            <CardBody className="divide-y divide-border">
              <MetaRow label="Order value">{fmtCurrency(pay.total, 'IDR')}</MetaRow>
              <MetaRow label="Paid">{fmtCurrency(pay.paid, 'IDR')}</MetaRow>
              <MetaRow label="Outstanding">
                <span className={pay.overdue && pay.outstanding > 0 ? 'text-danger' : undefined}>{fmtCurrency(pay.outstanding, 'IDR')}</span>
              </MetaRow>
              <MetaRow label="Terms">{po.paymentTermDays} days</MetaRow>
              <MetaRow label="Due">{pay.started ? fmtDate(pay.dueAt) : 'on first delivery'}</MetaRow>
              <MetaRow label="Delivered value">{fmtCurrency(progress.receivedValue, 'IDR')}</MetaRow>
              <MetaRow label="Supplier account">
                <span className="font-mono text-[11.5px]">{supplier?.bankName} {supplier?.bankAccount}</span>
              </MetaRow>
            </CardBody>
          </Card>
        </div>
      )}

      <ReceiveSheet po={po} open={receiveOpen} onOpenChange={setReceiveOpen} />
      <PayDialog po={po} open={payOpen} onOpenChange={setPayOpen} />

      <Dialog open={!!closing} onOpenChange={(v) => !v && setClosing(null)}>
        <DialogContent
          icon={<Ban />}
          title={closing === 'CLOSED' ? `Close ${po.code} short?` : `Cancel ${po.code}?`}
          description={
            closing === 'CLOSED'
              ? `${fmtNumber(progress.outstanding)} units will never be delivered. What has already arrived stays in stock and still has to be paid for.`
              : 'Nothing has been delivered, so nothing is owed. The order is withdrawn from the supplier.'
          }
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setClosing(null)}>Keep it open</Button>
              <Button variant="danger" size="sm" disabled={!closeReason.trim()} onClick={close}>
                {closing === 'CLOSED' ? 'Close short' : 'Cancel the order'}
              </Button>
            </>
          }
        >
          <div className="p-5">
            <Field label="Reason" required hint="The supplier and the auditor will both ask">
              <Textarea value={closeReason} onChange={(e) => setCloseReason(e.target.value)} rows={3} placeholder="Supplier tidak sanggup memenuhi sisa pesanan…" />
            </Field>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
