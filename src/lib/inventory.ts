/**
 * Inventory arithmetic.
 *
 * Every figure on every stock screen is folded out of the movement ledger.
 * There is no stored balance to drift, and no way for a warehouse total to
 * disagree with the goods receipt that created it.
 */
import type {
  Item, Project, StockCount, StockMovement, StockReservation, StockTransfer, Warehouse,
} from '@/data/types'
import { explodeBom } from '@/data/bom'

export interface StockRow {
  itemId: string
  warehouseId: string
  onHand: number
  /** moving average, recomputed from the movements that added stock */
  unitCost: number
  value: number
  lastMovementAt?: string
  daysSinceMovement: number
}

const DAY = 86_400_000

/** On-hand quantity and value for every item × warehouse pair that has ever moved. */
export function stockRows(movements: StockMovement[]): StockRow[] {
  const map = new Map<string, StockRow & { inQty: number; inValue: number }>()
  for (const m of movements) {
    const key = `${m.itemId}::${m.warehouseId}`
    let row = map.get(key)
    if (!row) {
      row = {
        itemId: m.itemId, warehouseId: m.warehouseId, onHand: 0, unitCost: m.unitCost, value: 0,
        lastMovementAt: m.at, daysSinceMovement: 0, inQty: 0, inValue: 0,
      }
      map.set(key, row)
    }
    row.onHand += m.qty
    if (m.qty > 0) {
      row.inQty += m.qty
      row.inValue += m.qty * m.unitCost
    }
    if (!row.lastMovementAt || m.at > row.lastMovementAt) row.lastMovementAt = m.at
  }
  const now = Date.now()
  return Array.from(map.values()).map((r) => {
    const unitCost = r.inQty > 0 ? r.inValue / r.inQty : r.unitCost
    return {
      itemId: r.itemId,
      warehouseId: r.warehouseId,
      onHand: Math.round(r.onHand * 1000) / 1000,
      unitCost,
      value: (Math.round(r.onHand * 1000) / 1000) * unitCost,
      lastMovementAt: r.lastMovementAt,
      daysSinceMovement: r.lastMovementAt ? Math.floor((now - new Date(r.lastMovementAt).getTime()) / DAY) : 9999,
    }
  })
}

/** Total on hand for an item across every warehouse. */
export function onHand(rows: StockRow[], itemId: string, warehouseId?: string) {
  return rows
    .filter((r) => r.itemId === itemId && (!warehouseId || r.warehouseId === warehouseId))
    .reduce((a, r) => a + r.onHand, 0)
}

export interface ItemPosition {
  item: Item
  onHand: number
  /** stock in the quarantine bay is on the books but cannot be used */
  quarantined: number
  reserved: number
  /** on hand, less quarantine, less what is already promised to an order */
  available: number
  onOrder: number
  value: number
  belowReorder: boolean
  belowMinimum: boolean
  /** days of stock at the rate it has been consumed over the period */
  coverDays: number
  daysSinceMovement: number
}

/**
 * Where an item stands: what is physically there, what of it is spoken for,
 * what is on its way, and whether that is enough.
 */
export function itemPositions(
  items: Item[],
  rows: StockRow[],
  reservations: StockReservation[],
  openOrderQty: (itemId: string) => number,
  movements: StockMovement[],
  windowDays = 90,
): ItemPosition[] {
  const since = Date.now() - windowDays * DAY
  return items.map((item) => {
    const mine = rows.filter((r) => r.itemId === item.id)
    const total = mine.reduce((a, r) => a + r.onHand, 0)
    const quarantined = mine.filter((r) => r.warehouseId === 'wh_qrn').reduce((a, r) => a + r.onHand, 0)
    const reserved = reservations
      .filter((r) => r.itemId === item.id && r.status === 'RESERVED')
      .reduce((a, r) => a + r.qty, 0)
    const consumed = movements
      .filter((m) => m.itemId === item.id && m.qty < 0 && new Date(m.at).getTime() >= since)
      .reduce((a, m) => a + Math.abs(m.qty), 0)
    const perDay = consumed / windowDays
    const available = total - quarantined - reserved
    return {
      item,
      onHand: total,
      quarantined,
      reserved,
      available,
      onOrder: openOrderQty(item.id),
      value: mine.reduce((a, r) => a + r.value, 0),
      belowReorder: item.reorderPoint > 0 && available < item.reorderPoint,
      belowMinimum: item.minStock > 0 && available < item.minStock,
      coverDays: perDay > 0 ? available / perDay : available > 0 ? 999 : 0,
      daysSinceMovement: Math.min(...mine.map((r) => r.daysSinceMovement), 9999),
    }
  })
}

/** How full each warehouse is, by the cubic volume of what is standing in it. */
export function warehouseLoad(warehouses: Warehouse[], rows: StockRow[], itemOf: (id: string) => Item | undefined) {
  return warehouses.map((w) => {
    const mine = rows.filter((r) => r.warehouseId === w.id && r.onHand > 0)
    const cbm = mine.reduce((a, r) => {
      const item = itemOf(r.itemId)
      if (!item) return a
      const per = item.uom === 'M3' ? 1 : item.cbmPerUnit
      return a + r.onHand * per
    }, 0)
    const value = mine.reduce((a, r) => a + r.value, 0)
    return {
      warehouse: w,
      lines: mine.length,
      cbm,
      value,
      utilisationPct: w.capacityM3 ? (cbm / w.capacityM3) * 100 : 0,
    }
  })
}

/**
 * What an order still needs and whether it is there.
 *
 * The demand is the bill of materials for whatever has not been produced yet;
 * the supply is unreserved stock plus anything already on order. A shortfall
 * with nothing on order is the thing that stops a work order dead.
 */
export interface MaterialGap {
  itemId: string
  required: number
  available: number
  onOrder: number
  shortfall: number
  covered: boolean
}

export function materialGaps(
  project: Project,
  positions: ItemPosition[],
  reservations: StockReservation[],
): MaterialGap[] {
  const demand = new Map<string, number>()
  project.items.forEach((pi) => {
    const remaining = Math.max(0, pi.qty - pi.producedQty)
    explodeBom(pi.itemRef, remaining).forEach((d) => demand.set(d.itemId, (demand.get(d.itemId) ?? 0) + d.qty))
  })
  return Array.from(demand.entries())
    .filter(([, required]) => required > 0.0001)
    .map(([itemId, required]) => {
      const pos = positions.find((p) => p.item.id === itemId)
      const mine = reservations
        .filter((r) => r.projectId === project.id && r.itemId === itemId && r.status === 'RESERVED')
        .reduce((a, r) => a + r.qty, 0)
      /* our own reservation counts as supply for our own order */
      const available = (pos?.available ?? 0) + mine
      const onOrder = pos?.onOrder ?? 0
      const shortfall = Math.max(0, required - available - onOrder)
      return { itemId, required, available, onOrder, shortfall, covered: shortfall <= 0.001 }
    })
    .sort((a, b) => b.shortfall - a.shortfall)
}

/** Stock that has not moved in a long time and is quietly tying up money. */
export function slowMoving(positions: ItemPosition[], days: number) {
  return positions
    .filter((p) => p.onHand > 0 && p.daysSinceMovement >= days)
    .sort((a, b) => b.value - a.value)
}

/** Transfers that left one warehouse and have not arrived at the other. */
export const inTransit = (transfers: StockTransfer[]) => transfers.filter((t) => t.status === 'IN_TRANSIT')

/** The money a count moved, which is the number an auditor asks about. */
export function countVariance(count: StockCount, itemOf: (id: string) => Item | undefined) {
  return count.lines.reduce((a, l) => {
    const item = itemOf(l.itemId)
    return a + (l.countedQty - l.systemQty) * (item?.standardCost ?? 0)
  }, 0)
}

/** Total value of everything on the books. */
export const inventoryValue = (rows: StockRow[]) => rows.reduce((a, r) => a + r.value, 0)
