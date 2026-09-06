/**
 * Procurement — requests, purchase orders, and the goods actually turning up.
 *
 * The interesting part is the last one. A purchase order for eleven cubic
 * metres of teak does not arrive as eleven cubic metres of teak: it arrives as
 * four, then three, then a lorry that is short by half a metre and carries no
 * legality document for the batch. Everything downstream — the open balance,
 * the material availability on a work order, the three-way match on the
 * invoice — is computed from those receipts rather than from the order.
 */
import type {
  GoodsReceipt, GoodsReceiptLine, PurchaseOrder, PurchaseOrderLine, PurchaseRequest,
  PurchaseRequestLine, ReceiptMode, RejectReason,
} from './types'
import { day, intBetween, pick, rng, round, stamp } from './clock'
import { itemById, suppliers } from './seed-master'
import { budgets } from './seed-budgets'
import { projects } from './seed-projects'
import { PURCHASABLE_CATEGORIES, stageIndex } from './reference'

let poSeq = 0
let grnSeq = 0
let prSeq = 0
const poCode = () => `PO-26-${String(++poSeq + 400).padStart(4, '0')}`
const grnCode = () => `GRN-26-${String(++grnSeq + 900).padStart(4, '0')}`
const prCode = () => `PR-26-${String(++prSeq + 200).padStart(4, '0')}`

const purchaseOrders: PurchaseOrder[] = []
const goodsReceipts: GoodsReceipt[] = []
const purchaseRequests: PurchaseRequest[] = []

const BUYERS_DESK = [
  { id: 'usr_05', name: 'Bagas Setiawan' },
  { id: 'usr_06', name: 'Nur Aini' },
]
const RECEIVERS = ['Yusuf Maulana', 'Gilang Saputra']
const QC = ['Anita Kusuma', 'Tri Handoko']

const DRIVERS = ['Slamet Riyadi', 'Joko Susilo', 'Marno', 'Agus Widodo', 'Karyono']
const PLATES = ['K 8812 GH', 'K 9047 CD', 'H 1734 AB', 'K 2298 FE', 'H 8801 LM']

/**
 * How a delivery is planned to land. A supplier who is reliable ships once; a
 * sawmill splits the load across whatever lorries it can find; hardware from
 * Surabaya goes straight to the workshop that needs it.
 */
interface ReceiptPlan {
  mode: ReceiptMode
  /** fraction of the ordered quantity per delivery */
  splits: number[]
  /** deliveries that carry a problem */
  trouble?: { index: number; kind: 'SHORT' | 'REJECT' | 'NO_DOC' | 'LATE' }
}

function planFor(status: PurchaseOrder['status'], r: () => number, deliveryMode: PurchaseOrder['deliveryMode']): ReceiptPlan {
  if (deliveryMode === 'TO_SITE') return { mode: 'DIRECT', splits: [1] }
  if (status === 'RECEIVED' || status === 'CLOSED') {
    const roll = r()
    if (roll > 0.62) return { mode: 'PARTIAL', splits: [0.55, 0.45] }
    if (roll > 0.42) return { mode: 'PARTIAL', splits: [0.4, 0.35, 0.25], trouble: { index: 1, kind: 'REJECT' } }
    return { mode: 'FULL', splits: [1] }
  }
  if (status === 'PARTIALLY_RECEIVED') {
    const roll = r()
    if (roll > 0.6) return { mode: 'PARTIAL', splits: [0.45], trouble: { index: 0, kind: 'SHORT' } }
    if (roll > 0.3) return { mode: 'PARTIAL', splits: [0.6], trouble: { index: 0, kind: 'NO_DOC' } }
    return { mode: 'PARTIAL', splits: [0.35, 0.3] }
  }
  return { mode: 'FULL', splits: [] }
}

function makeReceipts(po: PurchaseOrder, plan: ReceiptPlan, seed: number, firstDay: number) {
  const r = rng(seed + 55)
  plan.splits.forEach((share, i) => {
    /* a delivery cannot have happened tomorrow */
    const receivedDay = Math.min(-1, firstDay + i * intBetween(r, 4, 11))
    const trouble = plan.trouble?.index === i ? plan.trouble.kind : undefined
    const lines: GoodsReceiptLine[] = po.lines.map((pl, li) => {
      let delivered = round(pl.qty * share, 3)
      if (trouble === 'SHORT' && li === 0) delivered = round(delivered * 0.82, 3)
      let rejected = 0
      let reason: RejectReason | undefined
      if (trouble === 'REJECT' && li === 0) {
        rejected = round(delivered * 0.14, 3)
        reason = pick(r, ['MOISTURE', 'DEFECT', 'DIMENSION'] as RejectReason[])
      }
      if (trouble === 'NO_DOC' && itemById(pl.itemId)?.legalityControlled && li === 0) {
        rejected = delivered
        reason = 'NO_LEGALITY_DOC'
      }
      const item = itemById(pl.itemId)
      return {
        id: `grl_${po.id}_${i}_${li}`,
        poLineId: pl.id,
        itemId: pl.itemId,
        description: pl.description,
        uom: pl.uom,
        qtyDelivered: delivered,
        qtyAccepted: round(delivered - rejected, 3),
        qtyRejected: rejected,
        rejectReason: reason,
        binCode: item?.category === 'TIMBER' ? `A-0${(li % 8) + 1}` : `B-0${(li % 6) + 1}`,
        batchNo: `B${String(seed).slice(-3)}${i}${li}`,
        legalityDocNo:
          item?.legalityControlled && trouble !== 'NO_DOC'
            ? `SVLK/${suppliers.find((s) => s.id === po.supplierId)?.svlkNumber?.slice(-4) ?? '0000'}/${intBetween(r, 100, 999)}`
            : undefined,
        moisturePct: item?.category === 'TIMBER' ? round(9 + r() * (trouble === 'REJECT' ? 6 : 2.4), 1) : undefined,
        note: trouble === 'SHORT' && li === 0 ? 'Delivery note claims the full quantity; the tally came up short and was signed for short.' : undefined,
      }
    })

    const anyReject = lines.some((l) => l.qtyRejected > 0)
    const allReject = lines.every((l) => l.qtyRejected >= l.qtyDelivered && l.qtyDelivered > 0)

    goodsReceipts.push({
      id: `grn_${po.id}_${i}`,
      code: grnCode(),
      poId: po.id,
      poCode: po.code,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      projectId: po.projectId,
      mode: plan.mode === 'FULL' ? 'FULL' : plan.mode === 'DIRECT' ? 'DIRECT' : 'PARTIAL',
      sequence: i + 1,
      receivedAt: stamp(receivedDay, 8 + (i % 7)),
      deliveryNoteNo: `SJ/${po.supplierName.split(' ')[1]?.slice(0, 3).toUpperCase() ?? 'SUP'}/${intBetween(r, 1000, 9999)}`,
      vehicleNo: pick(r, PLATES),
      driverName: pick(r, DRIVERS),
      warehouseId: plan.mode === 'DIRECT' ? po.warehouseId : po.warehouseId,
      deliveredToName:
        plan.mode === 'DIRECT'
          ? po.deliveryMode === 'TO_SUBCON'
            ? 'Mulyo Karya workshop, Bangsri'
            : 'Packing hall, Blok D — went straight onto the line'
          : undefined,
      qcResult: allReject ? 'FAILED' : anyReject ? 'PARTIAL' : 'PASSED',
      qcByName: pick(r, QC),
      receivedByName: pick(r, RECEIVERS),
      posted: true,
      lines,
      note:
        trouble === 'NO_DOC'
          ? 'Timber arrived without a legality reference for the batch. Held in quarantine — it cannot enter the V-Legal chain until the supplier produces the document.'
          : trouble === 'REJECT'
            ? 'Part of the load failed inspection on arrival and went to the quarantine bay.'
            : plan.mode === 'DIRECT'
              ? 'Direct delivery — never entered the main gate. Received on paper against the delivery note.'
              : undefined,
    })

    /* write the receipt back onto the order, which is the only place these numbers come from */
    lines.forEach((gl) => {
      const pl = po.lines.find((x) => x.id === gl.poLineId)
      if (!pl) return
      pl.receivedQty = round(pl.receivedQty + gl.qtyAccepted, 3)
      pl.rejectedQty = round(pl.rejectedQty + gl.qtyRejected, 3)
    })
  })
}

/* ==================================================================
   Project-driven procurement
   ================================================================== */

const projectPos = projects.filter((p) => stageIndex(p.stage) >= stageIndex('PROCUREMENT') && p.status !== 'LOST')

projectPos.forEach((project, pi) => {
  const budget = budgets.find((b) => b.projectId === project.id && (b.status === 'APPROVED' || b.status === 'CLOSED'))
  if (!budget) return
  const seed = 7001 + pi * 29
  const r = rng(seed)
  const idx = stageIndex(project.stage)

  /* group the purchasable budget lines by the supplier the estimator assumed */
  const bySupplier = new Map<string, typeof budget.lines>()
  budget.lines
    .filter((bl) => PURCHASABLE_CATEGORIES.includes(bl.category) && bl.supplierId)
    .forEach((bl) => {
      const list = bySupplier.get(bl.supplierId!) ?? []
      list.push(bl)
      bySupplier.set(bl.supplierId!, list)
    })

  const orderDayBase = Math.round((new Date(project.targetShipAt).getTime() - Date.now()) / 86_400_000) - 70

  Array.from(bySupplier.entries()).forEach(([supplierId, lines], si) => {
    const supplier = suppliers.find((s) => s.id === supplierId)!
    const orderedDay = Math.min(-2, orderDayBase + si * intBetween(r, 2, 6))
    const expectedDay = orderedDay + supplier.leadTimeDays

    let status: PurchaseOrder['status']
    if (idx >= stageIndex('QC_PACKING')) status = r() > 0.25 ? 'CLOSED' : 'RECEIVED'
    else if (idx >= stageIndex('PRODUCTION')) status = r() > 0.4 ? 'RECEIVED' : 'PARTIALLY_RECEIVED'
    else status = si === 0 ? 'PARTIALLY_RECEIVED' : r() > 0.55 ? 'SENT' : r() > 0.3 ? 'APPROVED' : 'AWAITING_APPROVAL'

    const deliveryMode: PurchaseOrder['deliveryMode'] =
      supplier.type === 'SUBCON_WORKSHOP' ? 'TO_SUBCON'
        : supplier.type === 'PACKAGING' && r() > 0.6 ? 'TO_SITE'
          : 'TO_WAREHOUSE'

    const warehouseId =
      deliveryMode === 'TO_SUBCON' ? 'wh_sub'
        : deliveryMode === 'TO_SITE' ? 'wh_fg'
          : lines[0] && itemById(lines[0].itemId!)?.category === 'TIMBER' ? 'wh_rm'
            : 'wh_rm'

    const poLines: PurchaseOrderLine[] = lines.map((bl, li) => {
      const item = itemById(bl.itemId!)!
      /* the buyer does not order the wastage allowance — they order the gross need */
      const qty = round(bl.qty * (1 + bl.wastagePct / 100), 3)
      return {
        id: `pol_${seed}_${si}_${li}`,
        itemId: bl.itemId!,
        description: item.name,
        qty,
        uom: item.uom,
        unitPrice: round(bl.unitCost * (1 + (r() - 0.45) * 0.06), 0),
        discountPct: r() > 0.75 ? 2.5 : 0,
        taxPct: 11,
        neededBy: day(expectedDay),
        budgetLineId: bl.id,
        receivedQty: 0,
        rejectedQty: 0,
      }
    })

    const value = poLines.reduce((a, l) => a + l.qty * l.unitPrice, 0)
    const desk = BUYERS_DESK[si % 2]

    const po: PurchaseOrder = {
      id: `po_${seed}_${si}`,
      code: poCode(),
      supplierId,
      supplierName: supplier.name,
      projectId: project.id,
      status,
      orderedAt: stamp(orderedDay, 10),
      expectedAt: day(expectedDay),
      currency: 'IDR',
      paymentTermDays: supplier.paymentTermDays,
      deliveryMode,
      warehouseId,
      partialAllowed: supplier.type === 'SAWMILL' || supplier.type === 'PANEL',
      overReceiptTolerancePct: 5,
      raisedById: desk.id,
      raisedByName: desk.name,
      approvedByName: status === 'AWAITING_APPROVAL' ? undefined : value > 75_000_000 ? 'Rahmat Nugroho' : 'Bagas Setiawan',
      approvedAt: status === 'AWAITING_APPROVAL' ? undefined : stamp(orderedDay + 1, 9),
      requiresSvlkDoc: lines.some((bl) => itemById(bl.itemId!)?.legalityControlled),
      lines: poLines,
      note:
        deliveryMode === 'TO_SUBCON'
          ? 'Delivered straight to the subcontractor. It stays our stock and sits in the subcon warehouse until the components come back.'
          : deliveryMode === 'TO_SITE'
            ? 'Cartons go direct to the packing hall — there is no point putting them away twice.'
            : undefined,
    }

    purchaseOrders.push(po)
    const plan = planFor(status, r, deliveryMode)
    if (plan.splits.length) makeReceipts(po, plan, seed + si * 3, expectedDay + intBetween(r, -2, 5))
  })
})

/* ==================================================================
   Stock replenishment — orders raised against the reorder point rather
   than against any one project
   ================================================================== */

const REPLENISH: { itemId: string; qty: number; supplierId: string; status: PurchaseOrder['status']; offset: number }[] = [
  { itemId: 'itm_h01', qty: 2400, supplierId: 'sup_06', status: 'SENT', offset: -18 },
  { itemId: 'itm_h02', qty: 900, supplierId: 'sup_06', status: 'PARTIALLY_RECEIVED', offset: -26 },
  { itemId: 'itm_f03', qty: 400, supplierId: 'sup_08', status: 'RECEIVED', offset: -34 },
  { itemId: 'itm_f04', qty: 320, supplierId: 'sup_08', status: 'RECEIVED', offset: -33 },
  { itemId: 'itm_c02', qty: 2600, supplierId: 'sup_09', status: 'RECEIVED', offset: -22 },
  { itemId: 'itm_k03', qty: 5200, supplierId: 'sup_12', status: 'PARTIALLY_RECEIVED', offset: -15 },
  { itemId: 'itm_p01', qty: 180, supplierId: 'sup_05', status: 'AWAITING_APPROVAL', offset: -3 },
  { itemId: 'itm_t02', qty: 14, supplierId: 'sup_02', status: 'SENT', offset: -12 },
]

REPLENISH.forEach((spec, i) => {
  const item = itemById(spec.itemId)!
  const supplier = suppliers.find((s) => s.id === spec.supplierId)!
  const r = rng(9001 + i * 17)
  const expectedDay = spec.offset + supplier.leadTimeDays
  const po: PurchaseOrder = {
    id: `po_rep_${i}`,
    code: poCode(),
    supplierId: spec.supplierId,
    supplierName: supplier.name,
    status: spec.status,
    orderedAt: stamp(spec.offset, 11),
    expectedAt: day(expectedDay),
    currency: 'IDR',
    paymentTermDays: supplier.paymentTermDays,
    deliveryMode: 'TO_WAREHOUSE',
    warehouseId: item.category === 'TIMBER' ? 'wh_rm' : 'wh_rm',
    partialAllowed: true,
    overReceiptTolerancePct: 5,
    raisedById: 'usr_06',
    raisedByName: 'Nur Aini',
    approvedByName: spec.status === 'AWAITING_APPROVAL' ? undefined : 'Bagas Setiawan',
    approvedAt: spec.status === 'AWAITING_APPROVAL' ? undefined : stamp(spec.offset + 1, 9),
    requiresSvlkDoc: item.legalityControlled,
    lines: [
      {
        id: `pol_rep_${i}`,
        itemId: spec.itemId,
        description: item.name,
        qty: spec.qty,
        uom: item.uom,
        unitPrice: round(item.standardCost * (1 + (r() - 0.4) * 0.05), 0),
        discountPct: 0,
        taxPct: 11,
        neededBy: day(expectedDay),
        receivedQty: 0,
        rejectedQty: 0,
      },
    ],
    note: 'Raised against the reorder point, not against an order.',
  }
  purchaseOrders.push(po)
  const plan = planFor(spec.status, r, 'TO_WAREHOUSE')
  if (plan.splits.length) makeReceipts(po, plan, 9500 + i * 5, expectedDay + intBetween(r, -1, 4))
})

/* ==================================================================
   Purchase requests — what purchasing is still holding
   ================================================================== */

const openRequestProjects = projects.filter((p) =>
  ['ORDER_CONFIRMED', 'BUDGETING', 'PROCUREMENT'].includes(p.stage),
)

openRequestProjects.forEach((project, i) => {
  const budget = budgets.find((b) => b.projectId === project.id)
  if (!budget) return
  const r = rng(11_000 + i * 31)
  const lines: PurchaseRequestLine[] = budget.lines
    .filter((bl) => PURCHASABLE_CATEGORIES.includes(bl.category) && bl.itemId)
    .slice(0, 5)
    .map((bl, li) => ({
      id: `prl_${i}_${li}`,
      itemId: bl.itemId!,
      description: bl.description,
      qty: round(bl.qty * (1 + bl.wastagePct / 100), 3),
      uom: bl.uom,
      estimatedUnitCost: bl.unitCost,
      budgetLineId: bl.id,
      neededBy: day(intBetween(r, 8, 30)),
      orderedQty: project.stage === 'PROCUREMENT' ? round(bl.qty * 0.6, 3) : 0,
    }))
  if (!lines.length) return

  const status: PurchaseRequest['status'] =
    project.stage === 'PROCUREMENT' ? 'PARTIALLY_ORDERED'
      : project.stage === 'BUDGETING' ? 'SUBMITTED'
        : 'APPROVED'

  purchaseRequests.push({
    id: `pr_${project.id}`,
    code: prCode(),
    projectId: project.id,
    warehouseId: 'wh_rm',
    status,
    requestedById: 'usr_08',
    requestedByName: 'Tri Handoko',
    requestedAt: stamp(-intBetween(r, 4, 26), 9),
    approvedByName: status === 'SUBMITTED' ? undefined : 'Bagas Setiawan',
    approvedAt: status === 'SUBMITTED' ? undefined : stamp(-intBetween(r, 1, 3), 14),
    justification: `Material for ${project.code} — ${project.name}. Quantities are the budget lines grossed up for wastage.`,
    lines,
  })
})

/* one standing request that has nothing to do with a project */
purchaseRequests.push({
  id: 'pr_shop_01',
  code: prCode(),
  warehouseId: 'wh_rm',
  status: 'SUBMITTED',
  requestedById: 'usr_07',
  requestedByName: 'Yusuf Maulana',
  requestedAt: stamp(-2, 8),
  justification: 'Abrasives and glue are below the reorder point across all three benches. Nothing on order.',
  lines: [
    { id: 'prl_s1', itemId: 'itm_c01', description: 'Abrasive belt 120 grit', qty: 240, uom: 'PCS', estimatedUnitCost: 38_000, neededBy: day(9), orderedQty: 0 },
    { id: 'prl_s2', itemId: 'itm_c03', description: 'PVA D3 wood glue', qty: 180, uom: 'KG', estimatedUnitCost: 46_000, neededBy: day(9), orderedQty: 0 },
    { id: 'prl_s3', itemId: 'itm_c04', description: 'TCT saw blade 305mm', qty: 8, uom: 'PCS', estimatedUnitCost: 720_000, neededBy: day(14), orderedQty: 0 },
  ],
})

/* Set the final order status from what actually arrived, so the two can never
   disagree on screen. */
purchaseOrders.forEach((po) => {
  if (['DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'SENT', 'CANCELLED'].includes(po.status)) return
  /* an order for a job that has already sailed is closed, short delivery or not —
     the shortfall was settled with the supplier at the time, not left hanging */
  const project = projects.find((p) => p.id === po.projectId)
  if (project && stageIndex(project.stage) >= stageIndex('SHIPPED')) {
    po.status = 'CLOSED'
    return
  }
  const ordered = po.lines.reduce((a, l) => a + l.qty, 0)
  const received = po.lines.reduce((a, l) => a + l.receivedQty, 0)
  if (received <= 0) po.status = 'SENT'
  else if (received + 0.001 < ordered) po.status = 'PARTIALLY_RECEIVED'
  else if (po.status !== 'CLOSED') po.status = 'RECEIVED'
})

export { purchaseOrders, goodsReceipts, purchaseRequests }

export const poById = (id?: string) => purchaseOrders.find((p) => p.id === id)
export const receiptsForPo = (poId: string) => goodsReceipts.filter((g) => g.poId === poId)
