/**
 * Stock.
 *
 * There is no balance table. Every quantity in the system is the sum of the
 * movements that produced it, which is the only way a warehouse figure and a
 * goods receipt can never disagree. Movements come from four places: an opening
 * balance three months back, the receipts that have landed since, the material
 * issued against work orders, and the transfers, counts and scrap in between.
 */
import type { CountLine, StockCount, StockMovement, StockReservation, StockTransfer } from './types'
import { day, intBetween, rng, round, stamp } from './clock'
import { itemById, items, warehouses } from './seed-master'
import { goodsReceipts } from './seed-procurement'
import { workOrders } from './seed-production'
import { projects } from './seed-projects'
import { explodeBom } from './bom'
import { stageIndex } from './reference'

const movements: StockMovement[] = []
let mvSeq = 0
const mv = (m: Omit<StockMovement, 'id'>) => {
  movements.push({ id: `mov_${String(++mvSeq).padStart(5, '0')}`, ...m })
}

/* ==================================================================
   1 — the opening balance
   ================================================================== */

/** Where each category naturally lives when it is not being worked on. */
const HOME: Record<string, string> = {
  TIMBER: 'wh_rm', PANEL: 'wh_rm', HARDWARE: 'wh_rm', FINISHING: 'wh_rm',
  UPHOLSTERY: 'wh_rm', PACKAGING: 'wh_rm', CONSUMABLE: 'wh_rm',
  COMPONENT: 'wh_rm', FINISHED_GOOD: 'wh_fg',
}

const openingRng = rng(31_337)
items.forEach((item, i) => {
  const base = item.reorderPoint > 0 ? item.reorderPoint : item.category === 'FINISHED_GOOD' ? 6 : 20
  const factor = 0.85 + openingRng() * 1.5
  const qty = round(base * factor, item.uom === 'M3' ? 2 : 0)
  if (qty <= 0) return
  mv({
    at: stamp(-150, 7),
    type: 'OPENING',
    itemId: item.id,
    warehouseId: HOME[item.category] ?? 'wh_rm',
    binCode: item.category === 'TIMBER' ? `A-0${(i % 8) + 1}` : `B-0${(i % 6) + 1}`,
    qty,
    uom: item.uom,
    unitCost: item.standardCost,
    refType: 'Opening balance',
    refCode: 'OPEN-2026-Q2',
    actorName: 'Lestari Wijaya',
    note: 'Carried forward from the closing count of the previous half-year.',
  })
})

/* a few items were deliberately left at zero so the reorder logic has something to say */
;['itm_t08', 'itm_u02', 'itm_h04'].forEach((id) => {
  const idx = movements.findIndex((m) => m.type === 'OPENING' && m.itemId === id)
  if (idx >= 0) movements[idx].qty = round(movements[idx].qty * 0.12, 2)
})

/* ==================================================================
   2 — everything that has been received
   ================================================================== */

goodsReceipts.forEach((grn) => {
  grn.lines.forEach((gl) => {
    const item = itemById(gl.itemId)
    if (!item) return
    if (gl.qtyAccepted > 0) {
      mv({
        at: grn.receivedAt,
        type: 'RECEIPT',
        itemId: gl.itemId,
        warehouseId: grn.warehouseId,
        binCode: gl.binCode,
        qty: gl.qtyAccepted,
        uom: gl.uom,
        unitCost: item.standardCost,
        batchNo: gl.batchNo,
        refType: 'Goods receipt',
        refCode: grn.code,
        projectId: grn.projectId,
        actorName: grn.receivedByName,
      })
    }
    if (gl.qtyRejected > 0) {
      mv({
        at: grn.receivedAt,
        type: 'RECEIPT',
        itemId: gl.itemId,
        warehouseId: 'wh_qrn',
        qty: gl.qtyRejected,
        uom: gl.uom,
        unitCost: item.standardCost,
        batchNo: gl.batchNo,
        refType: 'Goods receipt — rejected',
        refCode: grn.code,
        projectId: grn.projectId,
        actorName: grn.qcByName,
        note: `Failed inspection on arrival: ${gl.rejectReason ?? 'rejected'}. Held pending return or concession.`,
      })
    }
  })
})

/* ==================================================================
   3 — material issued against work orders, and the goods they produced
   ================================================================== */

workOrders.forEach((wo, wi) => {
  if (wo.producedQty <= 0) return
  const r = rng(41_000 + wi * 19)
  const project = projects.find((p) => p.id === wo.projectId)
  const issueDay = Math.round((new Date(wo.startedAt ?? wo.plannedStartAt).getTime() - Date.now()) / 86_400_000)

  explodeBom(wo.itemRef, wo.producedQty).forEach((d, di) => {
    const item = itemById(d.itemId)
    if (!item || item.category === 'FINISHED_GOOD') return
    /* issued a little over the recipe, because that is what actually happens */
    const issued = round(d.qty * (1 + r() * 0.09), item.uom === 'M3' ? 3 : 0)
    if (issued <= 0) return

    /* Timber does not go straight from the delivery bay to a saw: it goes
       through the kiln first, and the bench draws it from the dry store. Both
       legs are posted so neither warehouse can go negative. */
    const from = wo.subconSupplierId ? 'wh_sub' : item.category === 'TIMBER' ? 'wh_kd' : 'wh_rm'
    if (from !== 'wh_rm') {
      mv({
        at: stamp(issueDay - 3, 7),
        type: 'TRANSFER_OUT',
        itemId: d.itemId,
        warehouseId: 'wh_rm',
        qty: -issued,
        uom: item.uom,
        unitCost: item.standardCost,
        refType: from === 'wh_kd' ? 'Into the kiln' : 'Out to the subcontractor',
        refCode: wo.code,
        projectId: wo.projectId,
        actorName: 'Yusuf Maulana',
      })
      mv({
        at: stamp(issueDay - 2, 7),
        type: 'TRANSFER_IN',
        itemId: d.itemId,
        warehouseId: from,
        qty: issued,
        uom: item.uom,
        unitCost: item.standardCost,
        refType: from === 'wh_kd' ? 'Out of the kiln' : 'Received at the subcontractor',
        refCode: wo.code,
        projectId: wo.projectId,
        actorName: 'Yusuf Maulana',
      })
    }

    mv({
      at: stamp(issueDay + di % 4, 8 + (di % 6)),
      type: 'ISSUE_PRODUCTION',
      itemId: d.itemId,
      warehouseId: from,
      qty: -issued,
      uom: item.uom,
      unitCost: item.standardCost,
      refType: 'Work order',
      refCode: wo.code,
      projectId: wo.projectId,
      actorName: 'Yusuf Maulana',
    })
  })

  /* the finished pieces themselves */
  const fg = items.find((i) => i.category === 'FINISHED_GOOD' && i.sku.includes(wo.itemRef.split('-').slice(0, 2).join('-')))
  if (fg) {
    mv({
      at: stamp(issueDay + 18, 15),
      type: 'FG_PRODUCED',
      itemId: fg.id,
      warehouseId: 'wh_fg',
      binCode: `F-0${(wi % 12) + 1}`,
      qty: wo.producedQty - wo.rejectQty,
      uom: 'PCS',
      unitCost: fg.standardCost,
      refType: 'Work order',
      refCode: wo.code,
      projectId: wo.projectId,
      actorName: wo.supervisorName,
    })
    if (wo.rejectQty > 0) {
      mv({
        at: stamp(issueDay + 18, 15),
        type: 'SCRAP',
        itemId: fg.id,
        warehouseId: 'wh_fg',
        qty: -wo.rejectQty,
        uom: 'PCS',
        unitCost: fg.standardCost,
        refType: 'Work order — QC reject',
        refCode: wo.code,
        projectId: wo.projectId,
        actorName: 'Anita Kusuma',
        note: 'Failed final inspection. Broken down for parts rather than reworked.',
      })
    }
  }

  /* what the shipped orders took out of the finished-goods store */
  if (project && stageIndex(project.stage) >= stageIndex('SHIPPED') && fg) {
    mv({
      at: stamp(Math.round((new Date(project.actualShipAt ?? project.targetShipAt).getTime() - Date.now()) / 86_400_000), 9),
      type: 'SHIPMENT_OUT',
      itemId: fg.id,
      warehouseId: 'wh_fg',
      qty: -(wo.producedQty - wo.rejectQty),
      uom: 'PCS',
      unitCost: fg.standardCost,
      refType: 'Shipment',
      refCode: project.code,
      projectId: project.id,
      actorName: 'Fajar Ramadhan',
    })
  }
})

/* ==================================================================
   4 — transfers between warehouses
   ================================================================== */

const TRANSFER_SPECS: {
  from: string; to: string; day: number; status: StockTransfer['status']; reason: string
  lines: { itemId: string; qty: number }[]; projectId?: string
}[] = [
  {
    from: 'wh_rm', to: 'wh_kd', day: -38, status: 'RECEIVED',
    reason: 'Air-dried teak into kiln chamber 2. Nothing leaves the chamber above 12%.',
    lines: [{ itemId: 'itm_t03', qty: 9 }, { itemId: 'itm_t02', qty: 4 }],
  },
  {
    from: 'wh_kd', to: 'wh_wip', day: -21, status: 'RECEIVED',
    reason: 'Dried stock to the machining bench against the Harborline runs.',
    lines: [{ itemId: 'itm_t01', qty: 6.4 }, { itemId: 'itm_t02', qty: 3.2 }],
    projectId: 'prj_0034',
  },
  {
    from: 'wh_rm', to: 'wh_sub', day: -16, status: 'RECEIVED',
    reason: 'Timber out to Mulyo Karya for the chair frames. Still our stock while it sits in their shed.',
    lines: [{ itemId: 'itm_t02', qty: 5.1 }, { itemId: 'itm_h07', qty: 24 }],
    projectId: 'prj_0034',
  },
  {
    from: 'wh_fg', to: 'wh_srg', day: -9, status: 'IN_TRANSIT',
    reason: 'Part load down to the Semarang bay to consolidate before stuffing.',
    lines: [{ itemId: 'itm_g03', qty: 22 }, { itemId: 'itm_g08', qty: 18 }],
    projectId: 'prj_0036',
  },
  {
    from: 'wh_rm', to: 'wh_kd', day: -4, status: 'IN_TRANSIT',
    reason: 'Suar slabs into the long-cycle chamber. Twelve weeks before they are stable.',
    lines: [{ itemId: 'itm_t08', qty: 2.4 }],
    projectId: 'prj_0043',
  },
  {
    from: 'wh_qrn', to: 'wh_rm', day: -6, status: 'DRAFT',
    reason: 'Concession accepted on the under-thickness batch — released back to raw material at a rebate.',
    lines: [{ itemId: 'itm_t06', qty: 1.8 }],
  },
]

const transfers: StockTransfer[] = TRANSFER_SPECS.map((t, i) => {
  const rec = t.status === 'RECEIVED'
  return {
    id: `trf_${i + 1}`,
    code: `TRF-26-${String(120 + i * 3).padStart(4, '0')}`,
    fromWarehouseId: t.from,
    toWarehouseId: t.to,
    status: t.status,
    issuedAt: stamp(t.day, 10),
    expectedAt: day(t.day + 2),
    receivedAt: rec ? stamp(t.day + 1, 14) : undefined,
    projectId: t.projectId,
    reason: t.reason,
    issuedByName: 'Yusuf Maulana',
    lines: t.lines.map((l, li) => ({
      id: `trl_${i}_${li}`,
      itemId: l.itemId,
      qty: l.qty,
      uom: itemById(l.itemId)?.uom ?? 'PCS',
      receivedQty: rec ? l.qty : 0,
    })),
  }
})

transfers.forEach((t) => {
  if (t.status === 'DRAFT' || t.status === 'CANCELLED') return
  t.lines.forEach((tl) => {
    const item = itemById(tl.itemId)
    if (!item) return
    mv({
      at: t.issuedAt,
      type: 'TRANSFER_OUT',
      itemId: tl.itemId,
      warehouseId: t.fromWarehouseId,
      qty: -tl.qty,
      uom: tl.uom,
      unitCost: item.standardCost,
      refType: 'Stock transfer',
      refCode: t.code,
      projectId: t.projectId,
      actorName: t.issuedByName,
    })
    if (t.status === 'RECEIVED') {
      mv({
        at: t.receivedAt!,
        type: 'TRANSFER_IN',
        itemId: tl.itemId,
        warehouseId: t.toWarehouseId,
        qty: tl.receivedQty,
        uom: tl.uom,
        unitCost: item.standardCost,
        refType: 'Stock transfer',
        refCode: t.code,
        projectId: t.projectId,
        actorName: t.issuedByName,
      })
    }
  })
})

/* ==================================================================
   5 — counts, and the adjustments they force
   ================================================================== */

const countRng = rng(51_515)
const countItems = (warehouseId: string, n: number) =>
  items.filter((i) => (HOME[i.category] ?? 'wh_rm') === warehouseId).slice(0, n)

const counts: StockCount[] = [
  {
    id: 'cnt_1',
    code: 'OPN-26-0007',
    warehouseId: 'wh_rm',
    status: 'POSTED',
    countedAt: stamp(-31, 7),
    countedByName: 'Yusuf Maulana',
    postedAt: stamp(-30, 16),
    lines: [],
    note: 'Monthly cycle count on the raw material store. Timber came up 0.4 m³ short across three bins — sawdust, offcuts and a bin that was never posted.',
  },
  {
    id: 'cnt_2',
    code: 'OPN-26-0008',
    warehouseId: 'wh_fg',
    status: 'POSTED',
    countedAt: stamp(-14, 7),
    countedByName: 'Gilang Saputra',
    postedAt: stamp(-13, 15),
    lines: [],
    note: 'Finished goods count before the Maison Cotier stuffing. Two chairs found damaged and written off.',
  },
  {
    id: 'cnt_3',
    code: 'OPN-26-0009',
    warehouseId: 'wh_sub',
    status: 'COUNTING',
    countedAt: stamp(-1, 8),
    countedByName: 'Yusuf Maulana',
    lines: [],
    note: 'Quarterly count of our material at Mulyo Karya. Half the shed is still to walk.',
  },
]

counts.forEach((count, ci) => {
  const pool = countItems(count.warehouseId, 8)
  const lines: CountLine[] = pool.map((item, li) => {
    const systemQty = round(
      movements
        .filter((m) => m.itemId === item.id && m.warehouseId === count.warehouseId && m.at <= count.countedAt)
        .reduce((a, m) => a + m.qty, 0),
      item.uom === 'M3' ? 2 : 0,
    )
    const drift = countRng() > 0.65 ? (countRng() - 0.55) * 0.06 : 0
    return {
      id: `cl_${ci}_${li}`,
      itemId: item.id,
      systemQty,
      countedQty: round(systemQty * (1 + drift), item.uom === 'M3' ? 2 : 0),
      note: drift < -0.01 ? 'Short. Written back against the store.' : undefined,
    }
  })
  count.lines = lines

  if (count.status === 'POSTED') {
    lines.forEach((cl) => {
      const diff = round(cl.countedQty - cl.systemQty, 3)
      if (Math.abs(diff) < 0.001) return
      const item = itemById(cl.itemId)!
      mv({
        at: count.postedAt!,
        type: 'ADJUSTMENT',
        itemId: cl.itemId,
        warehouseId: count.warehouseId,
        qty: diff,
        uom: item.uom,
        unitCost: item.standardCost,
        refType: 'Stock count',
        refCode: count.code,
        actorName: count.countedByName,
        note: diff < 0 ? 'Counted short.' : 'Counted over — a bin that had never been posted.',
      })
    })
  }
})

/* ==================================================================
   6 — material set aside for an order
   ================================================================== */

const reservations: StockReservation[] = []
projects
  .filter((p) => ['PROCUREMENT', 'PRODUCTION', 'QC_PACKING'].includes(p.stage))
  .forEach((project, pi) => {
    const r = rng(61_000 + pi * 11)
    const demand = new Map<string, number>()
    project.items.forEach((pit) => {
      const remaining = Math.max(0, pit.qty - pit.producedQty)
      explodeBom(pit.itemRef, remaining).forEach((d) => demand.set(d.itemId, (demand.get(d.itemId) ?? 0) + d.qty))
    })
    Array.from(demand.entries())
      .filter(([, qty]) => qty > 0)
      .slice(0, 6)
      .forEach(([itemId, qty], i) => {
        const item = itemById(itemId)!
        reservations.push({
          id: `rsv_${project.id}_${i}`,
          projectId: project.id,
          itemId,
          warehouseId: item.category === 'TIMBER' ? 'wh_kd' : 'wh_rm',
          qty: round(qty * (0.4 + r() * 0.5), item.uom === 'M3' ? 2 : 0),
          status: 'RESERVED',
          reservedAt: stamp(-intBetween(r, 3, 24), 10),
          neededBy: day(intBetween(r, 2, 26)),
        })
      })
  })

/* ==================================================================
   7 — make the opening balance honest

   The opening balance is the one figure nobody can point at a document for,
   so it is the one that has to absorb everything else. Walking each item and
   warehouse chronologically shows the lowest the balance ever got; where that
   is below zero, the opening is raised to cover it. A warehouse that goes
   negative is a warehouse whose numbers are a work of fiction, and no amount
   of downstream cleverness fixes that.
   ================================================================== */

{
  const chronological = movements.slice().sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
  const lowest = new Map<string, number>()
  const running = new Map<string, number>()
  chronological.forEach((m) => {
    const key = `${m.itemId}::${m.warehouseId}`
    const next = (running.get(key) ?? 0) + m.qty
    running.set(key, next)
    if (next < (lowest.get(key) ?? 0)) lowest.set(key, next)
  })

  lowest.forEach((min, key) => {
    if (min >= -0.0001) return
    const [itemId, warehouseId] = key.split('::')
    const item = itemById(itemId)
    if (!item) return
    /* round up, with a little headroom so the store is not left at exactly nil */
    const decimals = item.uom === 'M3' ? 2 : 0
    const topUp = round(Math.abs(min) * 1.12 + (item.uom === 'M3' ? 0.5 : 1), decimals)
    const existing = movements.find((m) => m.type === 'OPENING' && m.itemId === itemId && m.warehouseId === warehouseId)
    if (existing) {
      existing.qty = round(existing.qty + topUp, decimals)
      return
    }
    mv({
      at: stamp(-150, 7),
      type: 'OPENING',
      itemId,
      warehouseId,
      qty: topUp,
      uom: item.uom,
      unitCost: item.standardCost,
      refType: 'Opening balance',
      refCode: 'OPEN-2026-H1',
      actorName: 'Lestari Wijaya',
      note: 'Carried forward from the closing count of the previous half-year.',
    })
  })
}

movements.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))

export { movements, transfers, counts, reservations, warehouses }
