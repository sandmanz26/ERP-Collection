/**
 * Procurement arithmetic — what is still owed on an order, whether a delivery
 * was short, and whether the invoice agrees with either of them.
 */
import type {
  GoodsReceipt, PurchaseOrder, PurchaseOrderLine, SupplierBill, Supplier, MatchStatus,
} from '@/data/types'

export const lineNet = (l: PurchaseOrderLine) => l.unitPrice * (1 - l.discountPct / 100)
export const lineValue = (l: PurchaseOrderLine) => l.qty * lineNet(l)
export const orderValue = (po: PurchaseOrder) => po.lines.reduce((a, l) => a + lineValue(l), 0)
export const orderTax = (po: PurchaseOrder) => po.lines.reduce((a, l) => a + lineValue(l) * (l.taxPct / 100), 0)

export interface OrderProgress {
  orderedQty: number
  receivedQty: number
  rejectedQty: number
  openQty: number
  receivedPct: number
  receivedValue: number
  openValue: number
  /** deliveries so far */
  deliveries: number
  /** past its expected date with something still outstanding */
  overdue: boolean
  daysLate: number
  /** somebody sent more than we ordered, beyond the agreed tolerance */
  overReceived: boolean
}

export function orderProgress(po: PurchaseOrder, receipts: GoodsReceipt[]): OrderProgress {
  const orderedQty = po.lines.reduce((a, l) => a + l.qty, 0)
  const receivedQty = po.lines.reduce((a, l) => a + l.receivedQty, 0)
  const rejectedQty = po.lines.reduce((a, l) => a + l.rejectedQty, 0)
  const receivedValue = po.lines.reduce((a, l) => a + l.receivedQty * lineNet(l), 0)
  const openQty = Math.max(0, orderedQty - receivedQty)
  const openValue = po.lines.reduce((a, l) => a + Math.max(0, l.qty - l.receivedQty) * lineNet(l), 0)
  const settled = ['RECEIVED', 'CLOSED', 'CANCELLED', 'DRAFT'].includes(po.status)
  const days = Math.floor((Date.now() - new Date(po.expectedAt).getTime()) / 86_400_000)
  const tolerance = 1 + po.overReceiptTolerancePct / 100
  return {
    orderedQty, receivedQty, rejectedQty, openQty,
    receivedPct: orderedQty ? (receivedQty / orderedQty) * 100 : 0,
    receivedValue, openValue,
    deliveries: receipts.filter((r) => r.poId === po.id).length,
    overdue: !settled && openQty > 0.001 && days > 0,
    daysLate: Math.max(0, days),
    overReceived: po.lines.some((l) => l.receivedQty > l.qty * tolerance),
  }
}

/** Lines the supplier still owes us, which is what a chase list is made of. */
export function backorder(po: PurchaseOrder) {
  return po.lines
    .map((l) => ({ line: l, open: Math.max(0, l.qty - l.receivedQty) }))
    .filter((x) => x.open > 0.001)
}

/**
 * Purchase order, goods receipt and supplier invoice have to agree before
 * finance pays anything. Where they do not, the reason matters: a quantity
 * variance is usually a short delivery nobody credited; a price variance is
 * usually a rate that moved after the order went out.
 */
export function matchBill(bill: SupplierBill, po: PurchaseOrder | undefined, receipts: GoodsReceipt[], tolerancePct: number): {
  status: MatchStatus
  receivedValue: number
  variance: number
  variancePct: number
  detail: string
} {
  const mine = receipts.filter((r) => bill.receiptIds.includes(r.id))
  if (!po || !mine.length) {
    return {
      status: 'NO_RECEIPT',
      receivedValue: 0,
      variance: bill.subtotal,
      variancePct: 100,
      detail: po
        ? 'Invoiced against an order with no goods receipt behind it. Either the delivery was never booked in, or this is a service that has nothing to receive.'
        : 'No purchase order on the invoice at all.',
    }
  }
  const receivedValue = mine.reduce(
    (a, r) => a + r.lines.reduce((la, gl) => {
      const pl = po.lines.find((x) => x.id === gl.poLineId)
      return la + gl.qtyAccepted * (pl ? lineNet(pl) : 0)
    }, 0),
    0,
  )
  const variance = bill.subtotal - receivedValue
  const variancePct = receivedValue ? (variance / receivedValue) * 100 : 100
  if (Math.abs(variancePct) <= tolerancePct) {
    return { status: 'MATCHED', receivedValue, variance, variancePct, detail: 'Invoice agrees with what was received, inside tolerance.' }
  }
  const shortDelivery = mine.some((r) => r.lines.some((gl) => gl.qtyRejected > 0 || (gl.note ?? '').includes('short')))
  return {
    status: shortDelivery ? 'QTY_VARIANCE' : 'PRICE_VARIANCE',
    receivedValue,
    variance,
    variancePct,
    detail: shortDelivery
      ? 'Invoiced for more than we accepted. Part of the delivery was rejected or came up short and has not been credited.'
      : 'Invoiced above the order price. The rate moved after the order went out and nobody amended it.',
  }
}

export const billTotal = (b: SupplierBill) => b.subtotal + b.taxAmount
export const billOutstanding = (b: SupplierBill) => Math.max(0, billTotal(b) - b.paidAmount)

export const isBillOpen = (b: SupplierBill) =>
  ['DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'PARTIALLY_PAID', 'OVERDUE', 'DISPUTED'].includes(b.status)

/** Payables split into the buckets a treasury meeting actually uses. */
export function payableAgeing(bills: SupplierBill[]) {
  const buckets = [
    { key: 'current', label: 'Not yet due', min: -9999, max: 0, amount: 0, count: 0 },
    { key: '1-30', label: '1–30 days', min: 1, max: 30, amount: 0, count: 0 },
    { key: '31-60', label: '31–60 days', min: 31, max: 60, amount: 0, count: 0 },
    { key: '60+', label: 'Over 60 days', min: 61, max: 99999, amount: 0, count: 0 },
  ]
  bills.filter(isBillOpen).forEach((b) => {
    const days = Math.floor((Date.now() - new Date(b.dueAt).getTime()) / 86_400_000)
    const bucket = buckets.find((x) => days >= x.min && days <= x.max) ?? buckets[0]
    bucket.amount += billOutstanding(b)
    bucket.count += 1
  })
  return buckets
}

export interface SupplierScore {
  supplier: Supplier
  orders: number
  value: number
  deliveries: number
  onTimeDeliveries: number
  onTimePct: number
  rejectedQty: number
  deliveredQty: number
  rejectRatePct: number
  openValue: number
  /** the three published scores, folded into one number */
  composite: number
}

/** A scorecard built from what the supplier actually did, not what we think of them. */
export function supplierScores(
  suppliers: Supplier[],
  orders: PurchaseOrder[],
  receipts: GoodsReceipt[],
): SupplierScore[] {
  return suppliers.map((s) => {
    const mine = orders.filter((o) => o.supplierId === s.id)
    const grns = receipts.filter((r) => r.supplierId === s.id)
    const onTime = grns.filter((r) => {
      const po = orders.find((o) => o.id === r.poId)
      return po ? new Date(r.receivedAt) <= new Date(po.expectedAt) : false
    }).length
    const deliveredQty = grns.reduce((a, r) => a + r.lines.reduce((la, l) => la + l.qtyDelivered, 0), 0)
    const rejectedQty = grns.reduce((a, r) => a + r.lines.reduce((la, l) => la + l.qtyRejected, 0), 0)
    return {
      supplier: s,
      orders: mine.length,
      value: mine.reduce((a, o) => a + orderValue(o), 0),
      deliveries: grns.length,
      onTimeDeliveries: onTime,
      onTimePct: grns.length ? (onTime / grns.length) * 100 : 0,
      rejectedQty,
      deliveredQty,
      rejectRatePct: deliveredQty ? (rejectedQty / deliveredQty) * 100 : 0,
      openValue: mine.reduce((a, o) => a + orderProgress(o, receipts).openValue, 0),
      composite: Math.round((s.qualityScore + s.onTimeScore + s.priceScore) / 3),
    }
  })
}

/** Quantity on approved, un-received purchase order lines for one item. */
export function openOrderQty(orders: PurchaseOrder[], itemId: string) {
  return orders
    .filter((po) => ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'].includes(po.status))
    .reduce(
      (a, po) => a + po.lines.filter((l) => l.itemId === itemId).reduce((la, l) => la + Math.max(0, l.qty - l.receivedQty), 0),
      0,
    )
}

/** A receipt where the tally did not match the delivery note. */
export function receiptShortfall(grn: GoodsReceipt, po?: PurchaseOrder) {
  if (!po) return 0
  return grn.lines.reduce((a, gl) => {
    const pl = po.lines.find((x) => x.id === gl.poLineId)
    if (!pl) return a
    return a + Math.max(0, gl.qtyDelivered - gl.qtyAccepted)
  }, 0)
}
