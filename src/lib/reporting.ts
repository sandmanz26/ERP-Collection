/**
 * Production reporting — what the floor actually did, as opposed to what the
 * routing said it would.
 *
 * Until an operator books an output there is no scrap, no actual labour and no
 * real yield: there is only a plan with a tick against it. Every number that
 * matters downstream — first-pass yield, labour efficiency, the true cost of a
 * work order — starts here.
 */

import type {
  MaterialReturn, ProductionEntry, WorkCentre, WorkOrder,
} from '@/data/types'
import { OPERATION_SCRAP_TOLERANCE } from '@/data/reference'
import { daysBetween, TODAY } from '@/data/clock'

/* ==================================================================
   What an operation actually produced
   ================================================================== */

export interface OperationReport {
  operationNo: number
  name: string
  workCentreId: string
  good: number
  scrap: number
  rework: number
  /** pieces that came off right the first time, over everything that came off */
  firstPassPercent: number
  scrapPercent: number
  scrapBeyondTolerance: boolean
  labourHours: number
  /** hours the routing said this many pieces should take */
  standardHours: number
  /** positive means it took longer than standard */
  efficiencyVariancePercent: number
  downtimeHours: number
  entries: number
}

export function operationReports(
  workOrder: WorkOrder, entries: ProductionEntry[],
): OperationReport[] {
  return workOrder.operations.map((op) => {
    const mine = entries.filter((e) => e.workOrderId === workOrder.id && e.operationNo === op.operationNo)
    const good = mine.reduce((a, e) => a + e.goodQuantity, 0)
    const scrap = mine.reduce((a, e) => a + e.scrapQuantity, 0)
    const rework = mine.reduce((a, e) => a + e.reworkQuantity, 0)
    const produced = good + scrap + rework
    const labourHours = mine.reduce((a, e) => a + e.labourHours, 0)
    /* the routing plans hours for the whole batch, so standard for what was
       actually produced is that figure pro-rated */
    const standardHours = produced > 0 && workOrder.quantity > 0
      ? (op.plannedHours / workOrder.quantity) * produced
      : 0
    return {
      operationNo: op.operationNo,
      name: op.name,
      workCentreId: op.workCentreId,
      good,
      scrap,
      rework,
      firstPassPercent: produced > 0 ? (good / produced) * 100 : 0,
      scrapPercent: produced > 0 ? (scrap / produced) * 100 : 0,
      scrapBeyondTolerance: produced > 0 && scrap / produced > OPERATION_SCRAP_TOLERANCE,
      labourHours,
      standardHours,
      efficiencyVariancePercent: standardHours > 0 ? ((labourHours - standardHours) / standardHours) * 100 : 0,
      downtimeHours: mine.reduce((a, e) => a + e.downtimeHours, 0),
      entries: mine.length,
    }
  })
}

/**
 * The quantity a work order has genuinely finished: what came off the *last*
 * operation, not what somebody ticked. Anything else counts a piece as done
 * while it is still sitting in the cure hall.
 */
export function reportedCompletion(workOrder: WorkOrder, entries: ProductionEntry[]) {
  const last = workOrder.operations[workOrder.operations.length - 1]
  const reports = operationReports(workOrder, entries)
  const final = reports.find((r) => r.operationNo === last?.operationNo)
  const scrapTotal = reports.reduce((a, r) => a + r.scrap, 0)
  const reworkOpen = reports.reduce((a, r) => a + r.rework, 0)
  return {
    good: final?.good ?? 0,
    scrapTotal,
    reworkOpen,
    /** the operation that is losing the most, which is where to stand tomorrow morning */
    worstOperation: reports.filter((r) => r.scrap > 0).sort((a, b) => b.scrapPercent - a.scrapPercent)[0],
    percentComplete: workOrder.quantity > 0 ? ((final?.good ?? 0) / workOrder.quantity) * 100 : 0,
  }
}

export interface LabourSummary {
  hoursBooked: number
  standardHours: number
  efficiencyPercent: number
  downtimeHours: number
  downtimeShare: number
  topDowntimeReason?: { reason: string; hours: number }
  /** hours booked per operator, most first */
  byOperator: { operator: string; hours: number; good: number; scrapPercent: number }[]
  byShift: { shift: string; hours: number; good: number; scrapPercent: number }[]
}

export function labourSummary(
  entries: ProductionEntry[], workOrders: WorkOrder[], days = 30,
): LabourSummary {
  const recent = entries.filter((e) => daysBetween(e.at, TODAY) <= days)
  const hoursBooked = recent.reduce((a, e) => a + e.labourHours, 0)
  const downtimeHours = recent.reduce((a, e) => a + e.downtimeHours, 0)

  const standardHours = recent.reduce((a, e) => {
    const wo = workOrders.find((w) => w.id === e.workOrderId)
    const op = wo?.operations.find((o) => o.operationNo === e.operationNo)
    if (!op || !wo || wo.quantity === 0) return a
    const produced = e.goodQuantity + e.scrapQuantity + e.reworkQuantity
    return a + (op.plannedHours / wo.quantity) * produced
  }, 0)

  const group = <K extends string>(key: (e: ProductionEntry) => K) => {
    const map = new Map<K, { hours: number; good: number; produced: number; scrap: number }>()
    recent.forEach((e) => {
      const k = key(e)
      const row = map.get(k) ?? { hours: 0, good: 0, produced: 0, scrap: 0 }
      row.hours += e.labourHours
      row.good += e.goodQuantity
      row.scrap += e.scrapQuantity
      row.produced += e.goodQuantity + e.scrapQuantity + e.reworkQuantity
      map.set(k, row)
    })
    return [...map.entries()]
      .map(([k, v]) => ({ key: k, hours: v.hours, good: v.good, scrapPercent: v.produced > 0 ? (v.scrap / v.produced) * 100 : 0 }))
      .sort((a, b) => b.hours - a.hours)
  }

  const downtime = new Map<string, number>()
  recent.filter((e) => e.downtimeHours > 0 && e.downtimeReason).forEach((e) => {
    downtime.set(e.downtimeReason!, (downtime.get(e.downtimeReason!) ?? 0) + e.downtimeHours)
  })
  const top = [...downtime.entries()].sort((a, b) => b[1] - a[1])[0]

  return {
    hoursBooked,
    standardHours,
    /* over 100% means the floor produced more than the standard said those hours should */
    efficiencyPercent: hoursBooked > 0 ? (standardHours / hoursBooked) * 100 : 0,
    downtimeHours,
    downtimeShare: hoursBooked + downtimeHours > 0 ? (downtimeHours / (hoursBooked + downtimeHours)) * 100 : 0,
    topDowntimeReason: top ? { reason: top[0], hours: top[1] } : undefined,
    byOperator: group((e) => e.operator).map((x) => ({ operator: x.key, hours: x.hours, good: x.good, scrapPercent: x.scrapPercent })),
    byShift: group((e) => e.shift).map((x) => ({ shift: x.key, hours: x.hours, good: x.good, scrapPercent: x.scrapPercent })),
  }
}

export interface ScrapRow {
  workOrderId: string
  workOrderCode: string
  operationNo: number
  operationName: string
  scrap: number
  produced: number
  scrapPercent: number
  defectCode?: string
  value: number
}

/** Where scrap is actually happening, by operation, worst first. */
export function scrapByOperation(
  entries: ProductionEntry[], workOrders: WorkOrder[],
): ScrapRow[] {
  const rows = new Map<string, ScrapRow>()
  entries.forEach((e) => {
    const wo = workOrders.find((w) => w.id === e.workOrderId)
    if (!wo) return
    const op = wo.operations.find((o) => o.operationNo === e.operationNo)
    const key = `${e.workOrderId}:${e.operationNo}`
    const unitCost = wo.quantity > 0 ? (wo.standardMaterialCost + wo.standardLabourCost) / wo.quantity : 0
    const row = rows.get(key) ?? {
      workOrderId: wo.id, workOrderCode: wo.code, operationNo: e.operationNo,
      operationName: op?.name ?? `Operation ${e.operationNo}`,
      scrap: 0, produced: 0, scrapPercent: 0, defectCode: e.defectCode, value: 0,
    }
    row.scrap += e.scrapQuantity
    row.produced += e.goodQuantity + e.scrapQuantity + e.reworkQuantity
    row.value += e.scrapQuantity * unitCost
    if (e.defectCode && !row.defectCode) row.defectCode = e.defectCode
    rows.set(key, row)
  })
  return [...rows.values()]
    .map((r) => ({ ...r, scrapPercent: r.produced > 0 ? (r.scrap / r.produced) * 100 : 0 }))
    .filter((r) => r.scrap > 0)
    .sort((a, b) => b.value - a.value)
}

/* ==================================================================
   Material going back to the store
   ================================================================== */

export interface ReturnSummary {
  returns: number
  quantity: number
  value: number
  /** returned as full stock rather than racked as an offcut */
  toStockValue: number
  toRackValue: number
  byReason: { reason: string; count: number; value: number }[]
  /** what share of everything issued came back — high means the picking list is wrong */
  returnRatePercent: number
}

export function returnSummary(returns: MaterialReturn[], workOrders: WorkOrder[]): ReturnSummary {
  const issuedValue = workOrders.reduce(
    (a, w) => a + w.materials.reduce((x, m) => x + m.issuedQuantity * m.unitCost, 0), 0,
  )
  const value = returns.reduce((a, r) => a + r.quantity * r.unitCost, 0)
  const byReason = new Map<string, { count: number; value: number }>()
  returns.forEach((r) => {
    const row = byReason.get(r.reason) ?? { count: 0, value: 0 }
    row.count += 1
    row.value += r.quantity * r.unitCost
    byReason.set(r.reason, row)
  })
  return {
    returns: returns.length,
    quantity: returns.reduce((a, r) => a + r.quantity, 0),
    value,
    toStockValue: returns.filter((r) => !r.asRemnant).reduce((a, r) => a + r.quantity * r.unitCost, 0),
    toRackValue: returns.filter((r) => r.asRemnant).reduce((a, r) => a + r.quantity * r.unitCost, 0),
    byReason: [...byReason.entries()].map(([reason, v]) => ({ reason, ...v })).sort((a, b) => b.value - a.value),
    returnRatePercent: issuedValue > 0 ? (value / issuedValue) * 100 : 0,
  }
}

/** Hours actually booked onto a centre over a window — the other half of utilisation. */
export function bookedHours(entries: ProductionEntry[], centre: WorkCentre, days = 14) {
  const from = new Date(TODAY)
  from.setDate(from.getDate() - days)
  const fromIso = from.toISOString().slice(0, 10)
  const mine = entries.filter((e) => e.workCentreId === centre.id && e.at >= fromIso)
  return {
    labourHours: mine.reduce((a, e) => a + e.labourHours, 0),
    downtimeHours: mine.reduce((a, e) => a + e.downtimeHours, 0),
    good: mine.reduce((a, e) => a + e.goodQuantity, 0),
    scrap: mine.reduce((a, e) => a + e.scrapQuantity, 0),
    entries: mine.length,
  }
}
