import type {
  GoodsReceipt, InventoryItem, PurchaseOrder, PurchaseOrderLine, PurchaseRequest, PurchasePrice,
  StockTransfer, Supplier, SupplierPayment, WarehouseStock,
} from '@/data/types'
import { prLinePrice } from './procurement'

/* ------------------------------------------------------------------
   Purchase order → goods receipt → payment.

   An approved purchase request is a company-wide shopping list. Nobody
   outside the company can act on it, because it names several suppliers at
   once. Splitting it by supplier produces the documents that can be sent,
   delivered against and paid:

     1. Issue: one order per supplier, priced at what the request settled on.
     2. Receive: deliveries arrive in parts. Each one posts stock into a
        warehouse and records what was actually paid per item, which is what
        makes the next month's "last purchase price" true.
     3. Pay: against the order, in full or in instalments, until nothing is
        outstanding.

   Everything below is that arithmetic. The seed builds its orders, receipts
   and payments with the same functions the buttons call.
   ------------------------------------------------------------------ */

export const PPN_RATE = 0.11

/* ================================================================
   Purchase orders
   ================================================================ */

export const poLineTotal = (line: PurchaseOrderLine) => line.qty * line.unitPrice

export function poTotals(po: PurchaseOrder) {
  const subtotal = po.lines.reduce((a, l) => a + poLineTotal(l), 0)
  const tax = Math.round(subtotal * po.taxRate)
  return { subtotal, tax, total: subtotal + tax }
}

/** How much of the order is still owed by the supplier, line by line. */
export const outstandingQty = (line: PurchaseOrderLine) => Math.max(0, line.qty - line.qtyReceived)

export function receiptProgress(po: PurchaseOrder) {
  const ordered = po.lines.reduce((a, l) => a + l.qty, 0)
  const received = po.lines.reduce((a, l) => a + l.qtyReceived, 0)
  return {
    ordered,
    received,
    outstanding: ordered - received,
    linesComplete: po.lines.filter((l) => outstandingQty(l) === 0).length,
    lines: po.lines.length,
    pct: ordered ? Math.round((received / ordered) * 100) : 0,
    /** The value of what has actually arrived — what the company really owes. */
    receivedValue: po.lines.reduce((a, l) => a + l.qtyReceived * l.unitPrice, 0),
  }
}

/**
 * The status a receipt leaves the order in. Derived rather than chosen, so an
 * order can never claim to be complete while a line is still outstanding.
 */
export function poStatusAfterReceipt(po: PurchaseOrder): PurchaseOrder['status'] {
  const progress = receiptProgress(po)
  if (progress.received === 0) return po.status === 'DRAFT' ? 'DRAFT' : 'ISSUED'
  return progress.outstanding === 0 ? 'RECEIVED' : 'PARTIALLY_RECEIVED'
}

/** An order that can still take a delivery. */
export const acceptsReceipt = (po: PurchaseOrder) =>
  po.status === 'ISSUED' || po.status === 'PARTIALLY_RECEIVED'

/** Days past the expected date, or 0 while it is not yet late. */
export function daysLate(po: PurchaseOrder, on = new Date()) {
  if (!acceptsReceipt(po)) return 0
  const diff = Math.floor((on.getTime() - new Date(po.expectedAt).getTime()) / 86_400_000)
  return Math.max(0, diff)
}

/* ================================================================
   Payments
   ================================================================ */

export const paymentsOf = (poId: string, payments: SupplierPayment[]) =>
  payments.filter((p) => p.purchaseOrderId === poId).sort((a, b) => b.paidAt.localeCompare(a.paidAt))

export type PaymentState = 'UNPAID' | 'PARTIAL' | 'PAID'

/**
 * What is still owed on an order, and when it fell due. The due date runs from
 * the first delivery — a supplier that has not delivered has not started the
 * clock — and from the order date only once nothing else is available.
 */
export function paymentState(po: PurchaseOrder, payments: SupplierPayment[], receipts: GoodsReceipt[]) {
  const rows = paymentsOf(po.id, payments)
  const paid = rows.reduce((a, p) => a + p.amount, 0)
  const { total } = poTotals(po)
  /* A rupiah of rounding must not leave an order looking unpaid forever. */
  const outstanding = Math.max(0, total - paid)

  const firstReceipt = receipts
    .filter((r) => r.purchaseOrderId === po.id)
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))[0]
  const from = firstReceipt?.receivedAt ?? po.orderedAt
  const due = new Date(from)
  due.setDate(due.getDate() + po.paymentTermDays)
  const dueAt = due.toISOString()

  const state: PaymentState = paid <= 0 ? 'UNPAID' : outstanding <= 0 ? 'PAID' : 'PARTIAL'
  /* No delivery, no clock: an order the supplier has not delivered against cannot
     be late, whatever its order date says. */
  const daysOverdue =
    state === 'PAID' || po.status === 'CANCELLED' || !firstReceipt
      ? 0
      : Math.max(0, Math.floor((Date.now() - due.getTime()) / 86_400_000))

  return {
    payments: rows,
    paid,
    total,
    outstanding,
    state,
    dueAt,
    /** Whether the clock has actually started: no delivery, no invoice to fall due. */
    started: !!firstReceipt,
    daysOverdue,
    overdue: daysOverdue > 0,
    /** Paid for more than has arrived — legitimate as a deposit, worth showing. */
    prepaid: Math.max(0, paid - receiptProgress(po).receivedValue * (1 + po.taxRate)),
  }
}

/** Why a payment cannot be recorded, or nothing when it can. */
export function paymentProblem(
  po: PurchaseOrder,
  amount: number,
  payments: SupplierPayment[],
  receipts: GoodsReceipt[],
) {
  if (po.status === 'CANCELLED') return 'This order was cancelled — there is nothing to pay.'
  if (po.status === 'DRAFT') return 'Issue the order to the supplier before paying it.'
  if (!(amount > 0)) return 'Enter an amount greater than zero.'
  const { outstanding } = paymentState(po, payments, receipts)
  if (outstanding <= 0) return 'This order is already settled in full.'
  if (amount > outstanding) return `That is more than the ${Math.round(outstanding).toLocaleString('en-US')} still outstanding.`
  return ''
}

/* ================================================================
   Accounts payable, across every order
   ================================================================ */

export function payableSummary(orders: PurchaseOrder[], payments: SupplierPayment[], receipts: GoodsReceipt[]) {
  const live = orders.filter((po) => po.status !== 'CANCELLED' && po.status !== 'DRAFT')
  let outstanding = 0
  let overdue = 0
  let overdueCount = 0
  live.forEach((po) => {
    const state = paymentState(po, payments, receipts)
    outstanding += state.outstanding
    if (state.overdue && state.outstanding > 0) {
      overdue += state.outstanding
      overdueCount += 1
    }
  })
  return {
    orders: live.length,
    outstanding,
    overdue,
    overdueCount,
    paid: payments.reduce((a, p) => a + p.amount, 0),
  }
}

/* ================================================================
   Splitting an approved purchase request into orders
   ================================================================ */

/**
 * One order per supplier on the request, priced at what the request settled on.
 * Called by the seed and by the Issue button, so an order in the file and an
 * order made by pressing the button are the same shape.
 */
export function buildPurchaseOrders(
  pr: PurchaseRequest,
  suppliers: Supplier[],
  items: InventoryItem[],
  prices: PurchasePrice[],
  opts: { warehouseId: string; orderedAt: string; createdBy: string; startNumber: number; taxRate?: number },
): PurchaseOrder[] {
  const bySupplier = new Map<string, PurchaseOrder['lines']>()

  pr.lines.forEach((line) => {
    if (!line.supplierId) return
    const unitPrice = Math.round(prLinePrice(line, prices, items).unitPrice)
    const rows = bySupplier.get(line.supplierId) ?? []
    rows.push({
      id: `pol_${line.supplierId}_${line.itemId}`,
      itemId: line.itemId,
      qty: line.qty,
      unitPrice,
      qtyReceived: 0,
      prLineId: line.id,
    })
    bySupplier.set(line.supplierId, rows)
  })

  /* Biggest order first: that is the one purchasing chases. */
  return Array.from(bySupplier.entries())
    .map(([supplierId, lines]) => ({ supplierId, lines }))
    .sort(
      (a, b) =>
        b.lines.reduce((x, l) => x + poLineTotal(l), 0) - a.lines.reduce((x, l) => x + poLineTotal(l), 0),
    )
    .map(({ supplierId, lines }, index) => {
      const supplier = suppliers.find((s) => s.id === supplierId)
      const year = new Date(opts.orderedAt).getFullYear()
      const sequence = opts.startNumber + index
      const expected = new Date(opts.orderedAt)
      expected.setDate(expected.getDate() + (supplier?.leadTimeDays ?? 14))
      const id = `po_${year}_${String(sequence).padStart(4, '0')}`
      return {
        id,
        code: `PO-${year}-${String(sequence).padStart(4, '0')}`,
        supplierId,
        purchaseRequestId: pr.id,
        sessionId: pr.sessionId,
        status: 'ISSUED' as const,
        lines: lines.map((l) => ({ ...l, id: `${id}_${l.itemId}` })),
        warehouseId: opts.warehouseId,
        orderedAt: opts.orderedAt,
        expectedAt: expected.toISOString(),
        paymentTermDays: supplier?.paymentTermDays ?? 30,
        taxRate: opts.taxRate ?? PPN_RATE,
        createdBy: opts.createdBy,
        createdAt: opts.orderedAt,
        updatedAt: opts.orderedAt,
      }
    })
}

/* ================================================================
   Stock posting — the one place quantities change
   ================================================================ */

export interface StockInInput {
  warehouseId: string
  itemId: string
  qty: number
  unitCost: number
  binLocation: string
  batchNo?: string
  expiryDate?: string
  at: string
}

const sameBatch = (a?: string, b?: string) => (a ?? '') === (b ?? '')

/**
 * Goods arriving. They join the line already holding that item in that batch —
 * at a weighted average cost, because the bin now holds two purchases mixed
 * together and only one number can describe what is in it. Otherwise a new
 * line is opened.
 */
export function stockIn(stock: WarehouseStock[], input: StockInInput, newId: () => string): WarehouseStock[] {
  const at = stock.findIndex(
    (s) => s.warehouseId === input.warehouseId && s.itemId === input.itemId && sameBatch(s.batchNo, input.batchNo),
  )

  if (at < 0) {
    return [
      {
        id: newId(),
        warehouseId: input.warehouseId,
        itemId: input.itemId,
        binLocation: input.binLocation,
        qtyOnHand: input.qty,
        qtyReserved: 0,
        unitCost: input.unitCost,
        condition: 'GOOD',
        batchNo: input.batchNo,
        expiryDate: input.expiryDate,
        lastMovementAt: input.at,
      },
      ...stock,
    ]
  }

  const line = stock[at]
  const qty = line.qtyOnHand + input.qty
  const unitCost = qty > 0 ? Math.round((line.qtyOnHand * line.unitCost + input.qty * input.unitCost) / qty) : input.unitCost
  const next = [...stock]
  next[at] = {
    ...line,
    qtyOnHand: qty,
    unitCost,
    binLocation: line.binLocation || input.binLocation,
    expiryDate: line.expiryDate ?? input.expiryDate,
    lastMovementAt: input.at,
  }
  return next
}

/** Goods leaving a specific line. Refuses to take more than is available on it. */
export function stockOut(
  stock: WarehouseStock[],
  input: { stockId: string; qty: number; at: string },
): { stock: WarehouseStock[]; error?: string } {
  const at = stock.findIndex((s) => s.id === input.stockId)
  if (at < 0) return { stock, error: 'That stock line no longer exists.' }
  const line = stock[at]
  const available = line.qtyOnHand - line.qtyReserved
  if (input.qty > available) {
    return { stock, error: `Only ${available} available on that line — ${line.qtyReserved} of ${line.qtyOnHand} is reserved.` }
  }
  const next = [...stock]
  next[at] = { ...line, qtyOnHand: line.qtyOnHand - input.qty, lastMovementAt: input.at }
  return { stock: next }
}

/* ================================================================
   Transfers between warehouses
   ================================================================ */

export const transferQty = (t: StockTransfer) => t.lines.reduce((a, l) => a + l.qty, 0)
export const transferValue = (t: StockTransfer) => t.lines.reduce((a, l) => a + l.qty * l.unitCost, 0)

/** Units that left the source but never turned up — the reason receipts are counted separately. */
export function transferVariance(t: StockTransfer) {
  if (t.status !== 'RECEIVED') return 0
  return t.lines.reduce((a, l) => a + (l.qty - (l.qtyReceived ?? l.qty)), 0)
}

/** Why a transfer cannot be dispatched, or nothing when it can. */
export function dispatchProblem(t: StockTransfer, stock: WarehouseStock[]) {
  if (t.status !== 'DRAFT') return 'Only a draft transfer can be dispatched.'
  if (t.lines.length === 0) return 'Add at least one line before dispatching.'
  if (t.fromWarehouseId === t.toWarehouseId) return 'The source and destination are the same warehouse.'
  for (const line of t.lines) {
    const source = stock.find((s) => s.id === line.stockId)
    if (!source) return 'One of the source stock lines no longer exists.'
    const available = source.qtyOnHand - source.qtyReserved
    if (line.qty > available) {
      return `Not enough stock to send: ${available} available where ${line.qty} is on the transfer.`
    }
  }
  return ''
}
