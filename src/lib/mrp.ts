/**
 * The MRP engine.
 *
 * The output that matters is not the plan, it is the exception list — and every
 * line of it answers with a date and a cause rather than a quantity. "Short 340
 * pairs" is not actionable. "Short until the sixteenth because the container
 * berths on the eleventh and this supplier clears in two days" is.
 */

import type {
  Bom, ImportShipment, Item, KilnBatch, Lot, MrpLine, Product, PurchaseOrder, Remnant, SalesOrder,
  Supplier, WorkOrder,
} from '@/data/types'
import { addDays, daysBetween, TODAY } from '@/data/clock'
import { availableDate } from './importing'

export interface MrpInput {
  items: Item[]
  boms: Bom[]
  products: Product[]
  lots: Lot[]
  workOrders: WorkOrder[]
  salesOrders: SalesOrder[]
  purchaseOrders: PurchaseOrder[]
  shipments: ImportShipment[]
  suppliers: Supplier[]
  kilnBatches: KilnBatch[]
  /** the rack. An offcut is stock that is already cut and already paid for */
  remnants: Remnant[]
  horizonDays: number
}

/* ==================================================================
   BOM explosion
   ================================================================== */

export interface ExplodedLine {
  itemId: string
  quantity: number
  level: number
  path: string[]
  operationNo: number
}

/**
 * Explode a product into purchased items, applying yield and scrap at every
 * level. A bill without a yield silently under-orders every material it touches:
 * solid timber runs 62–72% from rough sawn, so a 0.086 m³ net requirement is
 * really 0.129 m³ of timber off the rack.
 */
export function explode(
  productId: string, quantity: number, boms: Bom[], level = 0, path: string[] = [],
): ExplodedLine[] {
  if (level > 5) return []
  const bom = boms.find((b) => b.productId === productId && b.status === 'ACTIVE')
  if (!bom) return []
  return bom.lines.flatMap((line) => {
    const gross = (line.netQuantity / (line.yield || 1)) * (1 + line.scrapPercent) * quantity
    if (line.componentType === 'SUB_ASSEMBLY') {
      return explode(line.componentId, gross, boms, level + 1, [...path, line.componentId])
    }
    return [{ itemId: line.componentId, quantity: gross, level, path, operationNo: line.operationNo }]
  })
}

/** Everything that uses this item, at any level. The question asked whenever a supplier discontinues something. */
export function whereUsed(itemId: string, boms: Bom[], products: Product[]) {
  const direct = boms.filter((b) => b.lines.some((l) => l.componentId === itemId))
  const out: { product: Product; level: number; via?: string; quantity: number }[] = []
  direct.forEach((b) => {
    const product = products.find((p) => p.id === b.productId)
    if (!product) return
    const line = b.lines.find((l) => l.componentId === itemId)!
    out.push({ product, level: 0, quantity: line.netQuantity })
    if (product.isSubAssembly) {
      boms.filter((pb) => pb.lines.some((l) => l.componentId === product.id)).forEach((pb) => {
        const parent = products.find((p) => p.id === pb.productId)
        const pl = pb.lines.find((l) => l.componentId === product.id)!
        if (parent) out.push({ product: parent, level: 1, via: product.name, quantity: line.netQuantity * pl.netQuantity })
      })
    }
  })
  return out
}

/* ==================================================================
   Availability of stock
   ================================================================== */

export interface StockPosition {
  onHand: number
  available: number
  reserved: number
  blocked: number
  blockedReason?: string
  /** the date blocked stock becomes issuable — a kiln batch closing, a QC disposition */
  blockedUntil?: string
}

export function stockPosition(itemId: string, lots: Lot[], kilnBatches: KilnBatch[]): StockPosition {
  const mine = lots.filter((l) => l.itemId === itemId)
  const onHand = mine.reduce((a, l) => a + l.quantity, 0)
  const reserved = mine.reduce((a, l) => a + l.reserved, 0)
  const available = mine.filter((l) => l.status === 'AVAILABLE').reduce((a, l) => a + l.quantity - l.reserved, 0)
  const blockedLots = mine.filter((l) => l.status === 'BLOCKED_KILN' || l.status === 'BLOCKED_QC' || l.status === 'QUARANTINE')
  const blocked = blockedLots.reduce((a, l) => a + l.quantity, 0)

  let blockedReason: string | undefined
  let blockedUntil: string | undefined
  const kilnLot = blockedLots.find((l) => l.status === 'BLOCKED_KILN')
  if (kilnLot) {
    const batch = kilnBatches
      .filter((b) => b.lotIds.includes(kilnLot.id) && b.status !== 'FAILED')
      .sort((a, b) => (a.plannedEnd > b.plannedEnd ? 1 : -1))[0]
    blockedUntil = batch?.plannedEnd
    blockedReason = batch
      ? `${kilnLot.quantity} ${kilnLot.code} in kiln batch ${batch.code}, closing ${batch.plannedEnd}. Nothing may be cut before the final reading lands inside ${batch.targetMin}–${batch.targetMax}%.`
      : `${kilnLot.code} is blocked at the kiln gate with no batch scheduled.`
  } else if (blockedLots.length) {
    blockedReason = `${blocked} held at incoming inspection pending a disposition.`
  }

  return { onHand, available, reserved, blocked, blockedReason, blockedUntil }
}

/* ==================================================================
   The run
   ================================================================== */

interface Demand { itemId: string; quantity: number; date: string; source: string }

function gatherDemand(input: MrpInput): Demand[] {
  const out: Demand[] = []
  const horizon = addDays(TODAY, input.horizonDays)

  input.workOrders
    .filter((w) => ['PLANNED', 'FIRM', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD'].includes(w.status))
    .filter((w) => w.plannedStart <= horizon)
    .forEach((w) => {
      const product = input.products.find((p) => p.id === w.productId)
      w.materials.forEach((m) => {
        const outstanding = Math.max(0, m.standardQuantity - m.issuedQuantity)
        if (outstanding <= 0) return
        /* the date the operation that consumes it starts, not the order's start */
        const op = w.operations.find((o) => o.operationNo === m.operationNo)
        out.push({
          itemId: m.itemId,
          quantity: outstanding,
          date: op?.plannedStart ?? w.plannedStart,
          source: `${w.code} · ${product?.name ?? w.productId} × ${w.quantity}`,
        })
      })
    })

  /* confirmed sales orders with no work order yet still generate requirement */
  const covered = new Set(input.workOrders.map((w) => w.salesOrderLineId).filter(Boolean))
  input.salesOrders
    .filter((s) => s.status === 'CONFIRMED' || s.status === 'IN_PRODUCTION')
    .forEach((so) => {
      so.lines.forEach((line) => {
        if (covered.has(line.id)) return
        const due = line.confirmedDate ?? line.requestedDate
        if (due > horizon) return
        explode(line.productId, line.quantity, input.boms).forEach((e) => {
          out.push({ itemId: e.itemId, quantity: e.quantity, date: addDays(due, -21), source: `${so.code} · ${line.description} (no work order yet)` })
        })
      })
    })

  return out
}

export function runMrp(input: MrpInput): MrpLine[] {
  const demands = gatherDemand(input)
  const byItem = new Map<string, Demand[]>()
  demands.forEach((dm) => {
    const list = byItem.get(dm.itemId) ?? []
    list.push(dm)
    byItem.set(dm.itemId, list)
  })

  const lines: MrpLine[] = []

  input.items.forEach((item) => {
    const mine = byItem.get(item.id) ?? []
    const gross = mine.reduce((a, x) => a + x.quantity, 0)
    const pos = stockPosition(item.id, input.lots, input.kilnBatches)
    if (gross === 0 && pos.available >= item.reorderPoint) return

    const requiredDate = mine.length ? mine.map((x) => x.date).sort()[0] : addDays(TODAY, input.horizonDays)

    /* scheduled receipts: open purchase-order lines, each with the date it becomes issuable */
    const supplies: { quantity: number; date: string; coverage: string; kind: MrpLine['supplyKind']; shipmentId?: string; purchaseOrderId?: string }[] = []

    input.purchaseOrders
      .filter((po) => !['CLOSED', 'CANCELLED', 'RECEIVED'].includes(po.status))
      .forEach((po) => {
        po.lines.filter((l) => l.itemId === item.id).forEach((l) => {
          const outstanding = l.quantity - l.receivedQuantity
          if (outstanding <= 0) return
          const shipment = po.shipmentId ? input.shipments.find((s) => s.id === po.shipmentId) : undefined
          if (shipment) {
            const supplier = input.suppliers.find((s) => s.id === shipment.supplierId)
            const est = availableDate(shipment, supplier, input.items)
            supplies.push({
              quantity: outstanding, date: est.date, kind: 'IMPORT',
              coverage: `${shipment.code} — ${est.explanation}`,
              shipmentId: shipment.id, purchaseOrderId: po.id,
            })
          } else {
            supplies.push({
              quantity: outstanding, date: l.promisedDate ?? l.requiredDate, kind: 'LOCAL_PO',
              coverage: `${po.code} — ${input.suppliers.find((s) => s.id === po.supplierId)?.name ?? 'supplier'} promised ${l.promisedDate ?? l.requiredDate}.`,
              purchaseOrderId: po.id,
            })
          }
        })
      })

    /* timber sitting in a kiln is supply too — it just is not issuable yet */
    if (pos.blocked > 0 && pos.blockedUntil) {
      supplies.push({
        quantity: pos.blocked, date: pos.blockedUntil, kind: 'KILN',
        coverage: pos.blockedReason ?? 'Blocked at the kiln gate.',
      })
    }

    /*
     * The rack counts. A remnant of this item is material that is already cut and
     * already paid for, available today — so it nets before anything is bought.
     * Netting without it is how a works ends up buying a board it already owns.
     */
    const rack = input.remnants.filter((r) => r.itemId === item.id && r.status === 'AVAILABLE')
    const rackQuantity = rack.reduce((a, r) => a + r.quantity, 0)
    if (rackQuantity > 0) {
      supplies.push({
        quantity: rackQuantity, date: TODAY, kind: 'REMNANT',
        coverage: `${rack.length} offcut${rack.length === 1 ? '' : 's'} on the rack cover ${Number(rackQuantity.toFixed(2))} ${item.uom} — already cut, already paid for, available today.`,
      })
    }

    supplies.sort((a, b) => (a.date < b.date ? -1 : 1))
    const scheduledReceipts = supplies.reduce((a, s) => a + s.quantity, 0)
    const net = Math.max(0, gross + item.safetyStock - pos.available - scheduledReceipts)

    /* walk the supplies until demand is covered; the last one used sets the date */
    let need = gross + item.safetyStock - pos.available
    let cover: (typeof supplies)[number] | undefined = supplies[0]
    if (need <= 0) {
      cover = undefined
    } else {
      for (const s of supplies) {
        need -= s.quantity
        cover = s
        if (need <= 0) break
      }
    }

    const totalLead = item.supplierLeadDays + item.transitDays + item.inlandDays
    const availDate = need > 0 ? undefined : (cover ? cover.date : TODAY)
    /* a line can be partly covered — say which part, rather than calling the whole thing uncovered */
    const supplyKind: MrpLine['supplyKind'] = need > 0
      ? (supplies.length ? supplies[supplies.length - 1].kind : 'NONE')
      : cover ? cover.kind : 'ON_HAND'
    const coverage = need > 0
      ? supplies.length
        ? `Partly covered — ${supplies.map((x) => x.coverage).join(' ')} Still short ${Number(net.toFixed(2))} ${item.uom} that nothing covers; at ${totalLead} days total lead time an order placed today lands ${addDays(TODAY, totalLead)}.`
        : `Nothing covers ${Number(net.toFixed(2))} ${item.uom}. At ${totalLead} days total lead time, an order placed today lands ${addDays(TODAY, totalLead)}.`
      : cover
        ? cover.coverage
        : `Covered from stock: ${Math.round(pos.available)} ${item.uom} available against ${Math.round(gross)} required.`

    const slackDays = availDate ? daysBetween(availDate, requiredDate) : -999

    lines.push({
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      imported: item.imported,
      uom: item.uom,
      grossRequirement: Number(gross.toFixed(2)),
      onHand: Number(pos.onHand.toFixed(2)),
      reserved: Number(pos.reserved.toFixed(2)),
      safetyStock: item.safetyStock,
      scheduledReceipts: Number(scheduledReceipts.toFixed(2)),
      netRequirement: Number(net.toFixed(2)),
      remnantCover: rackQuantity > 0 ? Number(rackQuantity.toFixed(2)) : undefined,
      availableDate: availDate,
      requiredDate,
      slackDays: slackDays === -999 ? -999 : slackDays,
      coverage,
      supplyKind,
      shipmentId: cover?.shipmentId,
      purchaseOrderId: cover?.purchaseOrderId,
      demandFrom: Array.from(new Set(mine.map((x) => x.source))),
      suggestedOrderQuantity: net > 0 ? Math.max(item.minOrderQuantity, Math.ceil(net)) : 0,
      suggestedOrderDate: net > 0 ? addDays(requiredDate, -totalLead) : undefined,
    })
  })

  return lines.sort((a, b) => a.slackDays - b.slackDays)
}

/** Lines the planner has to act on today: late, or with nothing covering them at all. */
export const shortages = (lines: MrpLine[]) => lines.filter((l) => l.slackDays < 0 && l.grossRequirement > 0)

/** Items below their reorder point regardless of whether anything is demanding them. */
export function belowReorderPoint(items: Item[], lots: Lot[], kilnBatches: KilnBatch[]) {
  return items
    .filter((i) => i.reorderPoint > 0)
    .map((i) => ({ item: i, ...stockPosition(i.id, lots, kilnBatches) }))
    .filter((x) => x.available < x.item.reorderPoint)
    .sort((a, b) => a.available / a.item.reorderPoint - b.available / b.item.reorderPoint)
}
