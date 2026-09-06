import type { GoodsReceipt, PaymentMethod, PurchaseOrder, SupplierPayment } from './types'
import { iso, on } from './seed-util'
import { items } from './seed-inventory'
import { purchasePrices, suppliers } from './seed-suppliers'
import { purchaseRequests } from './seed-procurement'
import { buildPurchaseOrders, poTotals } from '@/lib/purchasing'

/* ------------------------------------------------------------------
   Orders, deliveries and payments.

   The two locked purchase requests were split into one order per supplier
   with the same buildPurchaseOrders() the Issue button calls, so an order
   in this file and an order made by pressing the button are identical.

   Deliveries are deliberately uneven, because real ones are: June arrived
   complete and is paid off, July is half delivered with a deposit against
   it, and one order is late with nothing received at all. The stock lines
   in seed-inventory are the *current* count, so they already include
   everything received here — these receipts are history, not a second
   posting of the same goods.
   ------------------------------------------------------------------ */

const BUYER = 'Rizal Maulana'
const STOREKEEPER = 'Lina Marlina'
const CASHIER = 'Maya Puspita'

const prJun = purchaseRequests.find((p) => p.code === 'PR-2026-06-001')!
const prJul = purchaseRequests.find((p) => p.code === 'PR-2026-07-001')!

/* ---------------- orders ---------------- */

const juneOrders = buildPurchaseOrders(prJun, suppliers, items, purchasePrices, {
  warehouseId: 'wh_jkt',
  orderedAt: on(2026, 6, 16),
  createdBy: BUYER,
  startNumber: 1,
})

const julyOrders = buildPurchaseOrders(prJul, suppliers, items, purchasePrices, {
  warehouseId: 'wh_jkt',
  orderedAt: on(2026, 7, 17),
  createdBy: BUYER,
  startNumber: juneOrders.length + 1,
})

export const purchaseOrders: PurchaseOrder[] = [...juneOrders, ...julyOrders]

const byCode = new Map(purchaseOrders.map((po) => [po.code, po]))

/* ---------------- receipts ---------------- */

let grnSeq = 0
let paySeq = 0

/**
 * Receives a share of an order and writes the running total back onto its
 * lines, exactly as recordGoodsReceipt does at runtime.
 *
 * `share` is how much of each outstanding line arrived: 1 is a complete
 * delivery, 0.5 half of what is still owed. `reject` marks one line as sent
 * back — quantity that never enters stock and stays owed on the order.
 */
function receive(
  poCode: string,
  daysAgo: number,
  share: number,
  extra: { deliveryNote: string; vehicleNo?: string; rejectQty?: number; rejectReason?: string; note?: string; onTime?: boolean },
): GoodsReceipt {
  const po = byCode.get(poCode)
  if (!po) throw new Error(`Unknown purchase order ${poCode}`)
  grnSeq += 1
  const at = iso(-daysAgo)

  /* A rejection lands on the first line big enough to carry it, whatever the
     order happens to contain — the point is the path, not the item. */
  let rejectLeft = extra.rejectQty ?? 0

  const lines = po.lines
    .map((line) => {
      const outstanding = line.qty - line.qtyReceived
      if (outstanding <= 0) return null
      const item = items.find((i) => i.id === line.itemId)
      const rejected = rejectLeft > 0 && outstanding > rejectLeft ? rejectLeft : 0
      rejectLeft -= rejected
      const received = Math.max(0, Math.min(outstanding - rejected, Math.round(outstanding * share)))
      if (received <= 0 && rejected <= 0) return null

      /* The running total lives on the order line: that is what "outstanding" reads. */
      line.qtyReceived += received

      return {
        id: `grl_${String(grnSeq).padStart(3, '0')}_${line.itemId}`,
        poLineId: line.id,
        itemId: line.itemId,
        qtyReceived: received,
        qtyRejected: rejected,
        rejectReason: rejected > 0 ? extra.rejectReason : undefined,
        binLocation: 'RAK-TERIMA',
        batchNo: item?.trackBatch ? `${item.sku.slice(-4)}-${String(grnSeq).padStart(2, '0')}` : undefined,
        expiryDate: item?.hasExpiry ? iso(300 + grnSeq * 5) : undefined,
        unitCost: line.unitPrice,
      }
    })
    .filter((l): l is NonNullable<typeof l> => l !== null)

  const complete = po.lines.every((l) => l.qtyReceived >= l.qty)
  po.status = complete ? 'RECEIVED' : 'PARTIALLY_RECEIVED'
  po.updatedAt = at

  return {
    id: `grn_${String(grnSeq).padStart(3, '0')}`,
    code: `GRN-2026-${String(grnSeq).padStart(4, '0')}`,
    purchaseOrderId: po.id,
    supplierId: po.supplierId,
    warehouseId: po.warehouseId,
    receivedAt: at,
    deliveryNote: extra.deliveryNote,
    vehicleNo: extra.vehicleNo,
    lines,
    receivedBy: STOREKEEPER,
    onTime: extra.onTime ?? at <= po.expectedAt,
    createdAt: at,
    note: extra.note,
  }
}

function pay(
  poCode: string,
  daysAgo: number,
  portion: number | 'FULL',
  extra: { method?: PaymentMethod; reference?: string; note?: string } = {},
): SupplierPayment {
  const po = byCode.get(poCode)
  if (!po) throw new Error(`Unknown purchase order ${poCode}`)
  paySeq += 1
  const { total } = poTotals(po)
  const alreadyPaid = payments.filter((p) => p.purchaseOrderId === po.id).reduce((a, p) => a + p.amount, 0)
  const amount = portion === 'FULL' ? total - alreadyPaid : Math.round(total * portion)
  const supplier = suppliers.find((s) => s.id === po.supplierId)

  return {
    id: `pay_${String(paySeq).padStart(3, '0')}`,
    code: `PAY-2026-${String(paySeq).padStart(4, '0')}`,
    purchaseOrderId: po.id,
    supplierId: po.supplierId,
    amount,
    method: extra.method ?? 'TRANSFER',
    paidAt: iso(-daysAgo),
    reference: extra.reference,
    bankAccount: supplier?.bankAccount,
    paidBy: CASHIER,
    createdAt: iso(-daysAgo),
    note: extra.note,
  }
}

/* June: everything arrived, one delivery in two parts, all of it settled. */
export const goodsReceipts: GoodsReceipt[] = []
export const payments: SupplierPayment[] = []

const juneCodes = juneOrders.map((po) => po.code)
const julyCodes = julyOrders.map((po) => po.code)

juneCodes.forEach((code, index) => {
  if (index === 0) {
    /* The largest June order came in two lorries a week apart. */
    goodsReceipts.push(
      receive(code, 82, 0.6, { deliveryNote: `SJ/2026/06/${1100 + index}`, vehicleNo: 'B 9214 KYU', note: 'Pengiriman tahap 1 dari 2.' }),
      receive(code, 75, 1, { deliveryNote: `SJ/2026/06/${1180 + index}`, vehicleNo: 'B 9214 KYU', note: 'Pelunasan pengiriman tahap 2.' }),
    )
  } else if (index === 1) {
    goodsReceipts.push(
      receive(code, 79, 1, {
        deliveryNote: `SJ/2026/06/${1100 + index}`,
        vehicleNo: 'B 2871 TQF',
        rejectQty: 6,
        rejectReason: 'Jahitan tidak sesuai contoh; dikembalikan ke supplier pada hari yang sama.',
        note: 'Sebagian ditolak saat pemeriksaan penerimaan.',
      }),
    )
  } else {
    goodsReceipts.push(receive(code, 80 - index, 1, { deliveryNote: `SJ/2026/06/${1100 + index}` }))
  }
})

/* July: two orders delivered, one half delivered, one still nothing. */
julyCodes.forEach((code, index) => {
  if (index === 0) {
    goodsReceipts.push(
      receive(code, 44, 0.5, { deliveryNote: `SJ/2026/07/${2200 + index}`, vehicleNo: 'B 9033 SCA', note: 'Baru separuh; sisanya menunggu produksi.' }),
    )
  } else if (index === 1) {
    goodsReceipts.push(receive(code, 46, 1, { deliveryNote: `SJ/2026/07/${2200 + index}`, vehicleNo: 'B 1180 WDL' }))
  } else if (index === 2) {
    goodsReceipts.push(receive(code, 41, 1, { deliveryNote: `SJ/2026/07/${2200 + index}`, onTime: false, note: 'Terlambat 5 hari dari tanggal janji.' }))
  }
  /* Anything beyond that is still outstanding — one of them is now overdue. */
})

/* Payments: June settled, July mixed — a deposit, a part payment and one untouched. */
juneCodes.forEach((code, index) => {
  if (index === 0) {
    /* Pushed one at a time: pay() reads what is already recorded, and both
       arguments of a single push would be evaluated before either lands. */
    payments.push(pay(code, 74, 0.4, { reference: 'TRF/BCA/26060412', note: 'Uang muka 40% sesuai kesepakatan.' }))
    payments.push(pay(code, 52, 'FULL', { reference: 'TRF/BCA/26070199', note: 'Pelunasan setelah barang lengkap diterima.' }))
  } else {
    payments.push(pay(code, 70 - index * 2, 'FULL', { reference: `TRF/MDR/2606${300 + index}` }))
  }
})

julyCodes.forEach((code, index) => {
  if (index === 0) {
    payments.push(pay(code, 40, 0.3, { reference: 'TRF/BCA/26071188', note: 'Uang muka 30% atas pengiriman tahap pertama.' }))
  } else if (index === 1) {
    payments.push(pay(code, 30, 'FULL', { reference: 'TRF/BNI/26072044' }))
  } else if (index === 2) {
    payments.push(
      pay(code, 18, 0.5, { method: 'GIRO', reference: 'GIRO/BCA/0044219', note: 'Giro jatuh tempo; sisa dibayar setelah rekonsiliasi.' }),
    )
  }
  /* The rest are unpaid, and the oldest of them is past its term. */
})
