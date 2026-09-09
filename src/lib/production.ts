/**
 * The production engine — capacity, the kiln gate, work-order costing and the
 * honest promise date.
 */

import type {
  Bom, Item, KilnBatch, Lot, MrpLine, Product, Routing, WorkCentre, WorkOrder,
} from '@/data/types'
import { addDays, daysBetween, TODAY } from '@/data/clock'
import { MOISTURE_BANDS } from '@/data/reference'

/* ==================================================================
   Capacity
   ================================================================== */

export interface CentreLoad {
  workCentre: WorkCentre
  /** hours available across all stations over the window */
  availableHours: number
  loadedHours: number
  utilisation: number
  openOperations: number
  /** the orders sitting on it, soonest first */
  queue: { workOrder: WorkOrder; operationNo: number; name: string; hours: number; status: string; plannedStart: string }[]
}

/**
 * Load against capacity over a window. A work order cannot be scheduled onto a
 * centre past its available hours, and the board says which centre decides the
 * plan — in this business it is nearly always finishing, because a spray booth
 * plus a cure time is a hard serial constraint.
 */
export function capacityLoad(
  workCentres: WorkCentre[], workOrders: WorkOrder[], from = TODAY, days = 14,
): CentreLoad[] {
  const to = addDays(from, days)
  return workCentres
    .filter((wc) => wc.active)
    .map((wc) => {
      const queue = workOrders
        .filter((w) => !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(w.status))
        .flatMap((w) =>
          w.operations
            .filter((op) => op.workCentreId === wc.id && op.status !== 'DONE')
            .filter((op) => op.plannedStart <= to)
            .map((op) => ({
              workOrder: w, operationNo: op.operationNo, name: op.name,
              hours: op.plannedHours, status: op.status, plannedStart: op.plannedStart,
            })),
        )
        .sort((a, b) => (a.plannedStart < b.plannedStart ? -1 : 1))

      const loadedHours = queue.reduce((a, q) => a + q.hours, 0)
      const availableHours = wc.stations * wc.hoursPerDay * days
      return {
        workCentre: wc,
        availableHours,
        loadedHours,
        utilisation: availableHours ? (loadedHours / availableHours) * 100 : 0,
        openOperations: queue.length,
        queue,
      }
    })
    .sort((a, b) => b.utilisation - a.utilisation)
}

/** The centre that decides the plan. */
export const bottleneck = (loads: CentreLoad[]) => loads.find((l) => l.utilisation === Math.max(...loads.map((x) => x.utilisation)))

/* ==================================================================
   The kiln gate
   ================================================================== */

export interface KilnGateResult {
  ok: boolean
  band: { min: number; max: number }
  finalMoisture?: number
  message: string
}

/**
 * Solid timber cannot be issued to the rough mill unless its lot's batch closed
 * inside the target band. Above it the piece moves and the joints open within a
 * year; below it, for an outdoor line, it swells in the first wet season.
 */
export function kilnGate(lot: Lot, batches: KilnBatch[], item?: Item): KilnGateResult {
  const min = item?.targetMoistureMin ?? MOISTURE_BANDS.INDOOR.min
  const max = item?.targetMoistureMax ?? MOISTURE_BANDS.INDOOR.max
  const band = { min, max }
  if (item && item.type !== 'SOLID_TIMBER') return { ok: true, band, message: 'Not solid timber — the kiln gate does not apply.' }

  const batch = batches
    .filter((b) => b.lotIds.includes(lot.id))
    .sort((a, b) => (a.startedAt > b.startedAt ? -1 : 1))[0]

  if (!batch) return { ok: false, band, message: 'No kiln batch on record for this lot. Green timber cannot be issued at any price.' }
  if (batch.status !== 'COMPLETED') {
    return {
      ok: false, band,
      message: `${batch.code} is ${batch.status.toLowerCase()} in ${batch.chamber}, due to close ${batch.plannedEnd}. Latest reading ${batch.readings.at(-1)?.moisturePercent ?? batch.startMoisturePercent}%.`,
    }
  }
  const final = batch.finalMoisturePercent
  if (final === undefined) return { ok: false, band, message: `${batch.code} closed without a final moisture reading. Take one before anything is issued.` }
  if (final < min || final > max) {
    return {
      ok: false, band, finalMoisture: final,
      message: `${batch.code} closed at ${final}%, outside the ${min}–${max}% band. The charge goes back in; issuing it now buys a warranty claim in eighteen months.`,
    }
  }
  return { ok: true, band, finalMoisture: final, message: `${batch.code} closed at ${final}%, inside the ${min}–${max}% band.` }
}

/** Batches whose final reading missed the band, or that are overdue. */
export function kilnExceptions(batches: KilnBatch[], asOf = TODAY) {
  return batches
    .filter((b) => {
      if (b.status === 'FAILED') return true
      if (b.status === 'COMPLETED' && b.finalMoisturePercent !== undefined) {
        return b.finalMoisturePercent < b.targetMin || b.finalMoisturePercent > b.targetMax
      }
      if (b.status === 'DRYING' || b.status === 'CONDITIONING') return b.plannedEnd < asOf
      return false
    })
}

/* ==================================================================
   Work-order costing and variance
   ================================================================== */

export interface WorkOrderCost {
  standardTotal: number
  actualTotal: number
  materialVariance: number
  labourVariance: number
  overheadVariance: number
  totalVariance: number
  variancePercent: number
  /** per unit actually produced */
  actualUnitCost: number
  standardUnitCost: number
  /** the largest single driver, named */
  driver: string
}

export function workOrderCost(w: WorkOrder): WorkOrderCost {
  const standardTotal = w.standardMaterialCost + w.standardLabourCost + w.standardOverheadCost
  const actualTotal = w.actualMaterialCost + w.actualLabourCost + w.actualOverheadCost + w.actualSubcontractCost
  const done = w.quantityDone || w.quantity
  const progress = w.quantity ? (w.quantityDone + w.quantityScrapped) / w.quantity : 0

  const materialVariance = w.actualMaterialCost - w.standardMaterialCost * progress
  const labourVariance = w.actualLabourCost - w.standardLabourCost * progress
  const overheadVariance = w.actualOverheadCost - w.standardOverheadCost * progress
  const totalVariance = materialVariance + labourVariance + overheadVariance

  const drivers: [string, number][] = [
    ['Material usage — issued above the bill', materialVariance],
    ['Labour efficiency — hours above the routing', labourVariance],
    ['Overhead absorption', overheadVariance],
  ]
  drivers.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))

  return {
    standardTotal,
    actualTotal,
    materialVariance,
    labourVariance,
    overheadVariance,
    totalVariance,
    variancePercent: standardTotal ? (totalVariance / (standardTotal * (progress || 1))) * 100 : 0,
    actualUnitCost: done ? actualTotal / done : 0,
    standardUnitCost: w.quantity ? standardTotal / w.quantity : 0,
    driver: drivers[0][0],
  }
}

/** Material issued against what the bill said, per line — where the timber yield shows up. */
export function usageVariance(w: WorkOrder, items: Item[]) {
  return w.materials
    .filter((m) => m.issuedQuantity > 0)
    .map((m) => {
      const item = items.find((i) => i.id === m.itemId)
      const delta = m.issuedQuantity - m.standardQuantity
      return {
        itemId: m.itemId,
        code: item?.code ?? m.itemId,
        name: item?.name ?? m.itemId,
        uom: m.uom,
        standard: m.standardQuantity,
        issued: m.issuedQuantity,
        deltaQuantity: delta,
        deltaPercent: m.standardQuantity ? (delta / m.standardQuantity) * 100 : 0,
        deltaValue: delta * m.unitCost,
      }
    })
    .sort((a, b) => b.deltaValue - a.deltaValue)
}

/** Progress through the routing, for a stepper. */
export function workOrderProgress(w: WorkOrder) {
  const done = w.operations.filter((o) => o.status === 'DONE').length
  const blocked = w.operations.find((o) => o.status === 'BLOCKED')
  const current = w.operations.find((o) => o.status === 'RUNNING' || o.status === 'CURING') ?? w.operations.find((o) => o.status === 'READY')
  return {
    done,
    total: w.operations.length,
    percent: w.operations.length ? (done / w.operations.length) * 100 : 0,
    current,
    blocked,
    lateDays: w.status === 'COMPLETED' || w.status === 'CLOSED' ? 0 : Math.max(0, daysBetween(w.dueDate, TODAY)),
  }
}

/** Material lines that cannot be issued, with the reason the planner needs. */
export const workOrderShortages = (w: WorkOrder) => w.materials.filter((m) => m.shortageNote)

/* ==================================================================
   Available to promise
   ================================================================== */

export interface AtpResult {
  date: string
  constraint: 'MATERIAL' | 'IMPORT' | 'KILN' | 'CAPACITY' | 'NONE'
  explanation: string
  /** each clock, so the salesperson can see which one bit */
  clocks: { label: string; date: string; note: string }[]
}

/**
 * The honest promise date. All three clocks, and the latest one wins: material
 * availability including anything on the water, the kiln if solid timber is in
 * the bill, and the routing run out over the work centre that is busiest.
 */
export function availableToPromise(
  productId: string, quantity: number,
  ctx: {
    boms: Bom[]; routings: Routing[]; items: Item[]; lots: Lot[]; kilnBatches: KilnBatch[]
    workCentres: WorkCentre[]; workOrders: WorkOrder[]; mrpLines: MrpLine[]; products: Product[]
  },
): AtpResult {
  const clocks: AtpResult['clocks'] = []
  const exploded = ctx.boms.find((b) => b.productId === productId)
  if (!exploded) {
    return { date: addDays(TODAY, 30), constraint: 'NONE', explanation: 'No active bill of material — this cannot be promised at all.', clocks }
  }

  /* material clock: the latest availability among the items this product needs */
  let materialDate = TODAY
  let materialCause = 'Everything is in stock.'
  let materialConstraint = 'NONE' as AtpResult['constraint']

  exploded.lines.forEach((line) => {
    if (line.componentType === 'SUB_ASSEMBLY') return
    const mrp = ctx.mrpLines.find((m) => m.itemId === line.componentId)
    const item = ctx.items.find((i) => i.id === line.componentId)
    if (!item) return
    const need = (line.netQuantity / (line.yield || 1)) * (1 + line.scrapPercent) * quantity
    const stock = ctx.lots.filter((l) => l.itemId === item.id && l.status === 'AVAILABLE').reduce((a, l) => a + l.quantity - l.reserved, 0)
    if (stock >= need) return

    const date = mrp?.availableDate ?? addDays(TODAY, item.supplierLeadDays + item.transitDays + item.inlandDays)
    if (date > materialDate) {
      materialDate = date
      materialConstraint = mrp?.supplyKind === 'KILN' ? 'KILN' : item.imported ? 'IMPORT' : 'MATERIAL'
      materialCause = mrp?.coverage ?? `${item.name}: ${item.supplierLeadDays + item.transitDays + item.inlandDays} days total lead time and nothing on order.`
    }
  })

  clocks.push({ label: materialConstraint === 'KILN' ? 'Kiln' : materialConstraint === 'IMPORT' ? 'Import' : 'Material', date: materialDate, note: materialCause })

  /* capacity clock: the routing's own hours, queued behind what is already loaded */
  const routing = ctx.routings.find((r) => r.productId === productId)
  let capacityDate = TODAY
  let capacityNote = 'No routing on file.'
  if (routing) {
    const loads = capacityLoad(ctx.workCentres, ctx.workOrders, TODAY, 30)
    let cursorDays = 0
    let worst = { centre: '', days: 0 }
    routing.operations.forEach((op) => {
      const wc = ctx.workCentres.find((w) => w.id === op.workCentreId)
      if (!wc) return
      const load = loads.find((l) => l.workCentre.id === wc.id)
      const opHours = (op.setupMinutes + op.runMinutesPerUnit * quantity) / 60
      const dailyCapacity = wc.stations * wc.hoursPerDay
      /* what is already queued has to run first */
      const queueDays = load ? load.loadedHours / dailyCapacity : 0
      const runDays = opHours / dailyCapacity + op.queueHours / 24
      const opDays = Math.ceil(runDays + (load && load.utilisation > 100 ? queueDays - 30 : 0))
      cursorDays += Math.max(1, opDays)
      if (opDays > worst.days) worst = { centre: wc.name, days: opDays }
    })
    capacityDate = addDays(TODAY, Math.ceil(cursorDays))
    capacityNote = `${Math.ceil(cursorDays)} working days through the routing; ${worst.centre} is the longest single step at ${worst.days} day${worst.days === 1 ? '' : 's'}.`
  }
  clocks.push({ label: 'Capacity', date: capacityDate, note: capacityNote })

  const date = materialDate > capacityDate ? materialDate : capacityDate
  const constraint = materialDate > capacityDate ? materialConstraint : 'CAPACITY'
  const explanation = materialDate > capacityDate
    ? materialCause
    : capacityNote

  return { date, constraint, explanation, clocks }
}
