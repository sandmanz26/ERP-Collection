/**
 * Receiving, purchasing and supplier qualification.
 *
 * The moment a lorry arrives is not the moment material becomes stock. Between
 * the two there is a count, an inspection and a put-away, and a system that
 * collapses them into one status change is a system whose stock figure is a
 * hopeful guess. This is the part that keeps them apart.
 */

import type {
  GoodsReceipt, GoodsReceiptLine, Invoice, Item, PurchaseOrder, Supplier, SupplierCertificate,
  SupplierItem,
} from '@/data/types'
import {
  discrepancyMeta, PRICE_VARIANCE_TOLERANCE, QUARANTINE_SLA_DAYS, RECEIPT_OVER_TOLERANCE,
  receiptIsOpen, SUPPLIER_CERT_WARNING_DAYS, supplierCanOrder,
} from '@/data/reference'
import { daysBetween, TODAY } from '@/data/clock'

/* ==================================================================
   Purchase orders
   ================================================================== */

export const purchaseOrderValue = (po: PurchaseOrder) =>
  po.lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0) * (po.fxRateAtOrder || 1)

export const purchaseOrderIsOpen = (s: PurchaseOrder['status']) =>
  !['CLOSED', 'CANCELLED', 'RECEIVED'].includes(s)

export interface OrderProgress {
  orderedLines: number
  completeLines: number
  orderedQuantity: number
  receivedQuantity: number
  percent: number
  /** the value still to arrive */
  outstandingValue: number
  /** the earliest required date still unmet */
  nextDue?: string
  daysLate: number
  late: boolean
}

export function orderProgress(po: PurchaseOrder): OrderProgress {
  const ordered = po.lines.reduce((a, l) => a + l.quantity, 0)
  const received = po.lines.reduce((a, l) => a + Math.min(l.receivedQuantity, l.quantity), 0)
  const open = po.lines.filter((l) => l.receivedQuantity < l.quantity)
  const nextDue = open.map((l) => l.promisedDate ?? l.requiredDate).sort()[0]
  const daysLate = nextDue && purchaseOrderIsOpen(po.status) ? Math.max(0, daysBetween(nextDue, TODAY)) : 0
  return {
    orderedLines: po.lines.length,
    completeLines: po.lines.length - open.length,
    orderedQuantity: ordered,
    receivedQuantity: received,
    percent: ordered > 0 ? (received / ordered) * 100 : 0,
    outstandingValue: open.reduce((a, l) => a + (l.quantity - l.receivedQuantity) * l.unitPrice, 0) * (po.fxRateAtOrder || 1),
    nextDue,
    daysLate,
    late: daysLate > 0,
  }
}

export interface PriceVariance {
  /** what the bill of material is costed at */
  standard: number
  /** what we actually agreed to pay, in base currency */
  paid: number
  variance: number
  variancePercent: number
  /** beyond the tolerance, so it stops being a market move and becomes a costing problem */
  beyondTolerance: boolean
  /**
   * Whether the two figures are on the same basis at all. On an imported item
   * they are not: the agreed price is FOB at the supplier's quay and the
   * standard cost is landed — duty, freight, clearance and trucking included.
   * Subtracting one from the other produces a favourable variance that is
   * nothing of the sort, which is exactly how an import programme convinces
   * itself it is buying well.
   */
  comparable: boolean
  basis: 'LANDED' | 'FOB_AGAINST_LANDED'
  note: string
}

/**
 * Purchase price variance, per line. The chart of accounts has had an account
 * for this since the beginning; this is the thing that finally posts to it.
 */
export function priceVariance(
  line: { itemId: string; unitPrice: number; quantity: number },
  items: Item[],
  fxRate = 1,
): PriceVariance {
  const item = items.find((i) => i.id === line.itemId)
  const standard = item?.standardCost ?? 0
  const paid = line.unitPrice * fxRate
  const variance = paid - standard
  const variancePercent = standard > 0 ? (variance / standard) * 100 : 0
  const comparable = !item?.imported
  const beyondTolerance = comparable && standard > 0 && Math.abs(variance / standard) > PRICE_VARIANCE_TOLERANCE
  return {
    standard,
    paid,
    variance,
    variancePercent,
    beyondTolerance,
    comparable,
    basis: comparable ? 'LANDED' : 'FOB_AGAINST_LANDED',
    note: standard === 0
      ? 'No standard cost on this item, so there is nothing to vary against.'
      : !comparable
        ? `Not a like-for-like comparison. This is an imported item: the agreed price is FOB at ${Math.round(paid).toLocaleString('en-US')} and the standard cost of ${Math.round(standard).toLocaleString('en-US')} is landed — duty, freight, clearance and trucking included. Judge this price against the last one paid, or against the landed cost once the consignment is finalised.`
        : variance > 0
          ? `Bought ${variancePercent.toFixed(1)}% above standard. Across this line that is ${Math.round(variance * line.quantity).toLocaleString('en-US')} that the product cost does not know about yet.`
          : `Bought ${Math.abs(variancePercent).toFixed(1)}% below standard — ${Math.round(Math.abs(variance) * line.quantity).toLocaleString('en-US')} of favourable variance on this line.`,
  }
}

export interface PurchasingSummary {
  open: number
  openValue: number
  outstandingValue: number
  overdue: number
  awaitingApproval: number
  /** lines bought beyond the price tolerance */
  priceVarianceLines: number
  priceVarianceValue: number
  /** orders placed on a supplier who is not clear to be ordered from */
  unapprovedOrders: number
}

export function purchasingSummary(
  orders: PurchaseOrder[], items: Item[], suppliers: Supplier[],
): PurchasingSummary {
  const open = orders.filter((p) => purchaseOrderIsOpen(p.status))
  let varianceLines = 0
  let varianceValue = 0
  open.forEach((po) => {
    po.lines.forEach((l) => {
      const v = priceVariance(l, items, po.fxRateAtOrder)
      if (v.beyondTolerance && v.variance > 0) {
        varianceLines += 1
        varianceValue += v.variance * l.quantity
      }
    })
  })
  return {
    open: open.length,
    openValue: open.reduce((a, p) => a + purchaseOrderValue(p), 0),
    outstandingValue: open.reduce((a, p) => a + orderProgress(p).outstandingValue, 0),
    overdue: open.filter((p) => orderProgress(p).late).length,
    awaitingApproval: orders.filter((p) => p.status === 'PENDING_APPROVAL').length,
    priceVarianceLines: varianceLines,
    priceVarianceValue: varianceValue,
    unapprovedOrders: open.filter((p) => {
      const sup = suppliers.find((x) => x.id === p.supplierId)
      return sup ? !supplierCanOrder(sup.approvalStatus) : false
    }).length,
  }
}

/* ==================================================================
   Goods receipt
   ================================================================== */

export const receiptLineVariance = (l: GoodsReceiptLine) =>
  l.deliveredQuantity - (l.orderedQuantity - l.previouslyReceived)

export interface ReceiptState {
  /** everything taken in on this note, at the order price */
  acceptedValue: number
  rejectedValue: number
  lines: number
  discrepancyLines: number
  /** delivered beyond what the order still owed, as a fraction */
  overPercent: number
  overBeyondTolerance: boolean
  /** days sitting in the quarantine store */
  quarantineDays: number
  quarantineOverdue: boolean
  /** what a planner needs to know: is this issuable or not */
  issuable: boolean
  note: string
}

export function receiptState(r: GoodsReceipt): ReceiptState {
  const accepted = r.lines.reduce((a, l) => a + l.acceptedQuantity * l.orderUnitPrice, 0)
  const rejected = r.lines.reduce((a, l) => a + l.rejectedQuantity * l.orderUnitPrice, 0)
  const owed = r.lines.reduce((a, l) => a + Math.max(0, l.orderedQuantity - l.previouslyReceived), 0)
  const delivered = r.lines.reduce((a, l) => a + l.deliveredQuantity, 0)
  const over = owed > 0 ? (delivered - owed) / owed : 0
  const quarantineDays = r.status === 'AWAITING_QC' ? daysBetween(r.receivedAt, TODAY) : 0
  const discrepancyLines = r.lines.filter((l) => l.discrepancy !== 'NONE').length

  return {
    acceptedValue: accepted,
    rejectedValue: rejected,
    lines: r.lines.length,
    discrepancyLines,
    overPercent: over * 100,
    overBeyondTolerance: over > RECEIPT_OVER_TOLERANCE,
    quarantineDays,
    quarantineOverdue: quarantineDays > QUARANTINE_SLA_DAYS,
    issuable: r.status === 'PUT_AWAY',
    note: r.status === 'PUT_AWAY'
      ? 'Racked and issuable.'
      : r.status === 'AWAITING_QC'
        ? `On the books and in quarantine ${quarantineDays} day${quarantineDays === 1 ? '' : 's'}. It counts as inventory and it cannot be issued — which is the worst of both.`
        : r.status === 'REJECTED'
          ? 'Refused. Nothing from this note is in stock.'
          : 'Nothing counted yet, so nothing exists in stock against this note.',
  }
}

export interface ReceivingSummary {
  openReceipts: number
  inQuarantine: number
  quarantineValue: number
  quarantineOverdue: number
  discrepancies: number
  rejectedValue: number
  /** accepted over delivered, across the last ninety days — the incoming quality number */
  acceptanceRatePercent: number
  receivedThisMonthValue: number
}

export function receivingSummary(receipts: GoodsReceipt[]): ReceivingSummary {
  const open = receipts.filter((r) => receiptIsOpen(r.status))
  const quarantine = receipts.filter((r) => r.status === 'AWAITING_QC')
  const recent = receipts.filter((r) => daysBetween(r.receivedAt, TODAY) <= 90)
  const delivered = recent.reduce((a, r) => a + r.lines.reduce((x, l) => x + l.deliveredQuantity, 0), 0)
  const accepted = recent.reduce((a, r) => a + r.lines.reduce((x, l) => x + l.acceptedQuantity, 0), 0)
  const monthStart = `${TODAY.slice(0, 7)}-01`
  return {
    openReceipts: open.length,
    inQuarantine: quarantine.length,
    quarantineValue: quarantine.reduce((a, r) => a + receiptState(r).acceptedValue, 0),
    quarantineOverdue: quarantine.filter((r) => receiptState(r).quarantineOverdue).length,
    discrepancies: receipts.filter((r) => receiptState(r).discrepancyLines > 0 && receiptIsOpen(r.status)).length,
    rejectedValue: recent.reduce((a, r) => a + receiptState(r).rejectedValue, 0),
    acceptanceRatePercent: delivered > 0 ? (accepted / delivered) * 100 : 100,
    receivedThisMonthValue: receipts
      .filter((r) => r.receivedAt >= monthStart && r.status === 'PUT_AWAY')
      .reduce((a, r) => a + receiptState(r).acceptedValue, 0),
  }
}

/**
 * Three-way match: what was ordered, what arrived, what was invoiced. A bill that
 * agrees with none of them is how a works pays twice for one container.
 */
export interface ThreeWayMatch {
  orderedValue: number
  receivedValue: number
  invoicedValue: number
  matched: boolean
  /** which leg disagrees, in words */
  problems: string[]
}

export function threeWayMatch(
  po: PurchaseOrder, receipts: GoodsReceipt[], invoices: Invoice[],
): ThreeWayMatch {
  const mine = receipts.filter((r) => r.purchaseOrderId === po.id && r.status === 'PUT_AWAY')
  const bills = invoices.filter((i) => i.kind === 'AP' && i.purchaseOrderId === po.id && i.status !== 'VOID')

  const orderedValue = purchaseOrderValue(po)
  /* receipt prices are stored in base currency already — converting again is how
     a three-way match reports a container as costing sixteen thousand times what it did */
  const receivedValue = mine.reduce((a, r) => a + receiptState(r).acceptedValue, 0)
  const invoicedValue = bills.reduce((a, i) => a + i.total, 0)

  const problems: string[] = []
  const tol = Math.max(orderedValue * 0.02, 100_000)
  if (mine.length === 0 && bills.length > 0) {
    problems.push('Invoiced but nothing has been received against this order. Do not pay it until a receipt exists.')
  }
  if (bills.length > 0 && Math.abs(invoicedValue - receivedValue) > tol) {
    problems.push(
      invoicedValue > receivedValue
        ? `Invoiced ${Math.round(invoicedValue - receivedValue).toLocaleString('en-US')} more than was actually received and accepted.`
        : `Invoiced ${Math.round(receivedValue - invoicedValue).toLocaleString('en-US')} less than was received — a second bill is probably still to come.`,
    )
  }
  if (receivedValue > orderedValue + tol) {
    problems.push('Received more than was ordered. Somebody accepted an over-delivery without an amendment.')
  }
  return {
    orderedValue,
    receivedValue,
    invoicedValue,
    matched: problems.length === 0 && mine.length > 0 && bills.length > 0,
    problems,
  }
}

/* ==================================================================
   Supplier qualification
   ================================================================== */

export interface CertificateState {
  certificate: SupplierCertificate
  daysLeft: number
  expired: boolean
  expiring: boolean
}

export function certificateStates(supplier: Supplier): CertificateState[] {
  return supplier.certificates
    .map((c) => {
      const daysLeft = daysBetween(TODAY, c.expiresAt)
      return { certificate: c, daysLeft, expired: daysLeft < 0, expiring: daysLeft >= 0 && daysLeft <= SUPPLIER_CERT_WARNING_DAYS }
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
}

export interface SupplierQualification {
  canOrder: boolean
  expiredCertificates: number
  expiringCertificates: number
  auditOverdue: boolean
  auditDaysOverdue: number
  /** the single sentence that says whether purchasing may raise an order today */
  verdict: string
}

export function supplierQualification(supplier: Supplier): SupplierQualification {
  const certs = certificateStates(supplier)
  const expired = certs.filter((c) => c.expired)
  const expiring = certs.filter((c) => c.expiring)
  const auditDaysOverdue = supplier.nextAuditDue ? Math.max(0, daysBetween(supplier.nextAuditDue, TODAY)) : 0
  const canOrder = supplierCanOrder(supplier.approvalStatus) && expired.length === 0

  let verdict: string
  if (!supplierCanOrder(supplier.approvalStatus)) {
    verdict = supplier.openFinding ?? `Approval is ${supplier.approvalStatus.replace(/_/g, ' ').toLowerCase()} — no new orders until that changes.`
  } else if (expired.length > 0) {
    verdict = `${expired.map((c) => c.certificate.kind.replace(/_/g, ' ')).join(', ')} has lapsed. Anything ordered under a lapsed certificate is challengeable at the buyer's own audit, so the order waits.`
  } else if (auditDaysOverdue > 0) {
    verdict = `Clear to order, but the qualification audit is ${auditDaysOverdue} day${auditDaysOverdue === 1 ? '' : 's'} overdue. Book it before an export buyer asks for the file.`
  } else if (supplier.approvalStatus === 'CONDITIONAL') {
    verdict = supplier.openFinding ?? 'Orderable with an open finding — incoming inspection stays tight until it closes.'
  } else {
    verdict = 'Qualified, audited and clear to order from.'
  }

  return { canOrder, expiredCertificates: expired.length, expiringCertificates: expiring.length, auditOverdue: auditDaysOverdue > 0, auditDaysOverdue, verdict }
}

/** What a supplier has actually delivered against, from the receipts rather than a stored score. */
export interface SupplierReceiptRecord {
  receipts: number
  deliveredQuantity: number
  acceptedQuantity: number
  acceptanceRatePercent: number
  discrepancyReceipts: number
  /** the discrepancies they cause most, worst first */
  topDiscrepancies: { kind: string; label: string; count: number }[]
  lastReceivedAt?: string
}

export function supplierReceiptRecord(supplierId: string, receipts: GoodsReceipt[]): SupplierReceiptRecord {
  const mine = receipts.filter((r) => r.supplierId === supplierId && r.status !== 'CANCELLED')
  const delivered = mine.reduce((a, r) => a + r.lines.reduce((x, l) => x + l.deliveredQuantity, 0), 0)
  const accepted = mine.reduce((a, r) => a + r.lines.reduce((x, l) => x + l.acceptedQuantity, 0), 0)
  const counts = new Map<string, number>()
  mine.forEach((r) => r.lines.forEach((l) => {
    if (l.discrepancy !== 'NONE') counts.set(l.discrepancy, (counts.get(l.discrepancy) ?? 0) + 1)
  }))
  return {
    receipts: mine.length,
    deliveredQuantity: delivered,
    acceptedQuantity: accepted,
    acceptanceRatePercent: delivered > 0 ? (accepted / delivered) * 100 : 100,
    discrepancyReceipts: mine.filter((r) => r.lines.some((l) => l.discrepancy !== 'NONE')).length,
    topDiscrepancies: [...counts.entries()]
      .map(([kind, count]) => ({ kind, label: discrepancyMeta(kind as never)?.label ?? kind, count }))
      .sort((a, b) => b.count - a.count),
    lastReceivedAt: mine.map((r) => r.receivedAt).sort().reverse()[0],
  }
}

/** What we have agreed to pay a supplier for an item, and how that sits against standard. */
export function supplierPriceRows(supplierId: string, supplierItems: SupplierItem[], items: Item[]) {
  return supplierItems
    .filter((x) => x.supplierId === supplierId)
    .map((row) => {
      const item = items.find((i) => i.id === row.itemId)
      const v = priceVariance({ itemId: row.itemId, unitPrice: row.agreedPrice, quantity: 1 }, items)
      const lapsed = row.priceValidUntil ? daysBetween(TODAY, row.priceValidUntil) < 0 : false
      const drift = row.lastPurchasePrice && row.agreedPrice
        ? ((row.lastPurchasePrice - row.agreedPrice) / row.agreedPrice) * 100
        : 0
      return { row, item, variance: v, lapsed, driftPercent: drift }
    })
    .sort((a, b) => b.variance.variancePercent - a.variance.variancePercent)
}

/**
 * What a purchase-order line has actually had received against it, taken from
 * the receipts rather than from a stored number.
 *
 * The stored `receivedQuantity` is a cache, and a cache nothing writes is a lie:
 * before this existed, an open order counted as MRP supply forever because the
 * field never moved off zero.
 */
export function receivedAgainstLine(
  poId: string, itemId: string, receipts: GoodsReceipt[],
): number {
  return receipts
    .filter((r) => r.purchaseOrderId === poId && r.status === 'PUT_AWAY')
    .flatMap((r) => r.lines)
    .filter((l) => l.itemId === itemId)
    .reduce((a, l) => a + l.acceptedQuantity, 0)
}

/** Fold the receipts back onto the orders, so the two can never disagree. */
export function applyReceiptsToOrders(
  orders: PurchaseOrder[], receipts: GoodsReceipt[],
): PurchaseOrder[] {
  return orders.map((po) => {
    const lines = po.lines.map((l) => ({
      ...l,
      receivedQuantity: Math.max(l.receivedQuantity, receivedAgainstLine(po.id, l.itemId, receipts)),
    }))
    if (['CLOSED', 'CANCELLED'].includes(po.status)) return { ...po, lines }
    const any = lines.some((l) => l.receivedQuantity > 0)
    const all = lines.every((l) => l.receivedQuantity >= l.quantity)
    const status: PurchaseOrder['status'] = all && any ? 'RECEIVED' : any ? 'PARTIALLY_RECEIVED' : po.status
    return { ...po, lines, status }
  })
}
