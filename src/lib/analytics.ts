/**
 * Analytics — every number derived from the book, none of them typed in.
 */

import type {
  ImportShipment, Invoice, Item, KilnBatch, Lot, Product, PurchaseOrder, QcRecord, SalesOrder,
  Supplier, WorkCentre, WorkOrder,
} from '@/data/types'
import { daysBetween, TODAY } from '@/data/clock'
import { freeTimeState, landedCostTotal } from './importing'
import { capacityLoad, workOrderCost } from './production'

/* ==================================================================
   Delivery
   ================================================================== */

export function onTimeDelivery(salesOrders: SalesOrder[]) {
  const lines = salesOrders
    .filter((s) => s.status === 'CLOSED' || s.status === 'SHIPPED')
    .flatMap((s) => s.lines.filter((l) => l.confirmedDate && l.shippedQuantity > 0).map((l) => ({ so: s, line: l })))
  const onTime = lines.filter(({ line }) => !line.atpDate || line.atpDate <= line.confirmedDate!).length
  return { total: lines.length, onTime, percent: lines.length ? (onTime / lines.length) * 100 : 0 }
}

/**
 * How often sales overrode the system, and what it cost. A promise the plan
 * never supported is a different failure from one the plan lost.
 */
export function promiseAccuracy(salesOrders: SalesOrder[]) {
  const lines = salesOrders.flatMap((s) => s.lines.filter((l) => l.confirmedDate && l.atpDate).map((l) => ({ so: s, line: l })))
  const overridden = lines.filter(({ line }) => line.atpDate! > line.confirmedDate!)
  const totalDays = overridden.reduce((a, { line }) => a + daysBetween(line.confirmedDate!, line.atpDate!), 0)
  return {
    total: lines.length,
    overridden: overridden.length,
    percent: lines.length ? ((lines.length - overridden.length) / lines.length) * 100 : 100,
    averageOverrideDays: overridden.length ? totalDays / overridden.length : 0,
    byConstraint: ['MATERIAL', 'IMPORT', 'KILN', 'CAPACITY'].map((c) => ({
      constraint: c,
      count: overridden.filter(({ line }) => line.atpConstraint === c).length,
    })).filter((x) => x.count > 0),
  }
}

/* ==================================================================
   Quality
   ================================================================== */

export function qualityMetrics(qcRecords: QcRecord[]) {
  const final = qcRecords.filter((q) => q.point === 'FINAL')
  const inspected = final.reduce((a, q) => a + q.lotSize, 0)
  const passed = final.reduce((a, q) => a + q.passedQuantity, 0)
  const scrapped = qcRecords.filter((q) => q.disposition === 'SCRAP').reduce((a, q) => a + q.failedQuantity, 0)
  const reworked = qcRecords.filter((q) => q.disposition === 'REWORK').reduce((a, q) => a + q.failedQuantity, 0)

  return {
    firstPassYield: inspected ? (passed / inspected) * 100 : 0,
    inspected,
    passed,
    scrapped,
    reworked,
    costOfQuality: qcRecords.reduce((a, q) => a + q.costImpact, 0),
    byPoint: (['INCOMING', 'IN_PROCESS', 'FINAL'] as const).map((point) => {
      const rows = qcRecords.filter((q) => q.point === point)
      const lot = rows.reduce((a, q) => a + q.lotSize, 0)
      const fail = rows.reduce((a, q) => a + q.failedQuantity, 0)
      return { point, inspections: rows.length, failRate: lot ? (fail / lot) * 100 : 0, cost: rows.reduce((a, q) => a + q.costImpact, 0) }
    }),
  }
}

/** Defects ranked by how many, which is how a Pareto is actually read. */
export function defectPareto(qcRecords: QcRecord[]) {
  const map = new Map<string, { code: string; quantity: number; occurrences: number; cost: number }>()
  qcRecords.forEach((q) => {
    q.defects.forEach((dft) => {
      const row = map.get(dft.code) ?? { code: dft.code, quantity: 0, occurrences: 0, cost: 0 }
      row.quantity += dft.quantity
      row.occurrences += 1
      row.cost += q.defects.length ? q.costImpact / q.defects.length : 0
      map.set(dft.code, row)
    })
  })
  const rows = Array.from(map.values()).sort((a, b) => b.quantity - a.quantity)
  const total = rows.reduce((a, r) => a + r.quantity, 0)
  let running = 0
  return rows.map((r) => {
    running += r.quantity
    return { ...r, share: total ? (r.quantity / total) * 100 : 0, cumulative: total ? (running / total) * 100 : 0 }
  })
}

/* ==================================================================
   Material and production
   ================================================================== */

export function materialYield(workOrders: WorkOrder[], items: Item[]) {
  let standard = 0
  let issued = 0
  let standardValue = 0
  let issuedValue = 0
  workOrders.forEach((w) => {
    w.materials.filter((m) => m.issuedQuantity > 0).forEach((m) => {
      const item = items.find((i) => i.id === m.itemId)
      if (item?.type !== 'SOLID_TIMBER' && item?.type !== 'PANEL') return
      standard += m.standardQuantity
      issued += m.issuedQuantity
      standardValue += m.standardQuantity * m.unitCost
      issuedValue += m.issuedQuantity * m.unitCost
    })
  })
  return {
    standard, issued,
    variancePercent: standard ? ((issued - standard) / standard) * 100 : 0,
    varianceValue: issuedValue - standardValue,
  }
}

export function scrapRate(workOrders: WorkOrder[], qcRecords: QcRecord[]) {
  const produced = workOrders.reduce((a, w) => a + w.quantityDone, 0)
  const scrapped = workOrders.reduce((a, w) => a + w.quantityScrapped, 0)
  const cost = qcRecords.filter((q) => q.disposition === 'SCRAP').reduce((a, q) => a + q.costImpact, 0)
  return { produced, scrapped, percent: produced + scrapped ? (scrapped / (produced + scrapped)) * 100 : 0, cost }
}

export function utilisation(workCentres: WorkCentre[], workOrders: WorkOrder[]) {
  const loads = capacityLoad(workCentres, workOrders)
  const loaded = loads.reduce((a, l) => a + l.loadedHours, 0)
  const available = loads.reduce((a, l) => a + l.availableHours, 0)
  return { loads, overall: available ? (loaded / available) * 100 : 0, loaded, available }
}

/* ==================================================================
   Import performance — the numbers that make planning parameters
   ================================================================== */

export function clearanceByLane(shipments: ImportShipment[]) {
  return (['GREEN', 'YELLOW', 'RED'] as const).map((lane) => {
    const rows = shipments.filter((s) => s.lane === lane && s.pibDate && s.sppbDate)
    const days = rows.map((s) => daysBetween(s.pibDate!, s.sppbDate!))
    return {
      lane,
      count: rows.length,
      averageDays: days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0,
      worstDays: days.length ? Math.max(...days) : 0,
    }
  })
}

export function importLeadTime(shipments: ImportShipment[], purchaseOrders: PurchaseOrder[]) {
  const rows = shipments
    .filter((s) => s.status === 'RECEIVED' && s.receivedAt)
    .map((s) => {
      const po = purchaseOrders.find((p) => p.shipmentId === s.id)
      if (!po) return null
      return {
        shipment: s,
        totalDays: daysBetween(po.orderDate, s.receivedAt!),
        supplierDays: s.supplierReadyDate ? daysBetween(po.orderDate, s.supplierReadyDate) : 0,
        transitDays: s.etd && s.dischargedAt ? daysBetween(s.etd, s.dischargedAt) : 0,
        clearanceDays: s.pibDate && s.sppbDate ? daysBetween(s.pibDate, s.sppbDate) : 0,
        inlandDays: s.sppbDate ? daysBetween(s.sppbDate, s.receivedAt!) : 0,
      }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
  const avg = (pick: (r: (typeof rows)[number]) => number) => (rows.length ? rows.reduce((a, r) => a + pick(r), 0) / rows.length : 0)
  return {
    rows,
    averageTotal: avg((r) => r.totalDays),
    averageSupplier: avg((r) => r.supplierDays),
    averageTransit: avg((r) => r.transitDays),
    averageClearance: avg((r) => r.clearanceDays),
    averageInland: avg((r) => r.inlandDays),
  }
}

export function demurrageExposure(shipments: ImportShipment[]) {
  const paid = shipments.reduce((a, s) => a + s.costs.filter((c) => c.code === 'DEMURRAGE' || c.code === 'DETENTION').reduce((b, c) => b + c.amount * c.fxRate, 0), 0)
  const accruing = shipments.reduce((a, s) => {
    const ft = freeTimeState(s)
    return a + (ft.running ? ft.accrued : 0)
  }, 0)
  const bySupplier = new Map<string, number>()
  shipments.forEach((s) => {
    const amt = s.costs.filter((c) => c.code === 'DEMURRAGE' || c.code === 'DETENTION').reduce((b, c) => b + c.amount * c.fxRate, 0)
    if (amt) bySupplier.set(s.supplierId, (bySupplier.get(s.supplierId) ?? 0) + amt)
  })
  return { paid, accruing, total: paid + accruing, bySupplier }
}

export function supplierScorecards(suppliers: Supplier[], shipments: ImportShipment[], purchaseOrders: PurchaseOrder[]) {
  return suppliers.map((s) => {
    const mine = shipments.filter((sh) => sh.supplierId === s.id)
    const cleared = mine.filter((sh) => sh.pibDate && sh.sppbDate)
    const clearanceDays = cleared.length
      ? cleared.reduce((a, sh) => a + daysBetween(sh.pibDate!, sh.sppbDate!), 0) / cleared.length
      : s.avgClearanceDays
    const lanes = s.laneHistory
    const laneTotal = lanes.green + lanes.yellow + lanes.red
    const spend = purchaseOrders
      .filter((p) => p.supplierId === s.id)
      .reduce((a, p) => a + p.lines.reduce((b, l) => b + l.quantity * l.unitPrice, 0) * p.fxRateAtOrder, 0)
    const demurrage = mine.reduce((a, sh) => a + sh.costs.filter((c) => c.code === 'DEMURRAGE').reduce((b, c) => b + c.amount * c.fxRate, 0), 0)
    /* one composite the purchasing desk can actually rank on */
    const score = Math.round(
      s.onTimePercent * 0.3 + s.qualityPercent * 0.3 + s.documentAccuracyPercent * 0.25
      + (laneTotal ? (lanes.green / laneTotal) * 100 : 60) * 0.15,
    )
    return { supplier: s, shipments: mine.length, clearanceDays, redLanePercent: laneTotal ? (lanes.red / laneTotal) * 100 : 0, spend, demurrage, score }
  }).sort((a, b) => b.score - a.score)
}

/* ==================================================================
   Money
   ================================================================== */

export function inventoryValue(lots: Lot[], items: Item[]) {
  const byType = new Map<string, number>()
  let total = 0
  let provisional = 0
  lots.forEach((l) => {
    const item = items.find((i) => i.id === l.itemId)
    const value = l.quantity * l.unitCost
    total += value
    if (l.costIsProvisional) provisional += value
    const key = item?.type ?? 'OTHER'
    byType.set(key, (byType.get(key) ?? 0) + value)
  })
  return { total, provisional, byType: Array.from(byType.entries()).map(([type, value]) => ({ type, value })).sort((a, b) => b.value - a.value) }
}

export function orderMargin(so: SalesOrder, workOrders: WorkOrder[], products: Product[]) {
  const revenue = so.lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0) * so.fxRate
  const orders = workOrders.filter((w) => w.salesOrderId === so.id)
  const standard = orders.reduce((a, w) => a + w.standardMaterialCost + w.standardLabourCost + w.standardOverheadCost, 0)
  const actual = orders.reduce((a, w) => {
    const c = workOrderCost(w)
    return a + c.actualTotal
  }, 0)
  const cost = actual > 0 ? actual : standard
  return {
    revenue,
    standardCost: standard,
    actualCost: actual,
    margin: revenue - cost,
    marginPercent: revenue ? ((revenue - cost) / revenue) * 100 : 0,
    products: orders.map((w) => products.find((p) => p.id === w.productId)?.name ?? w.productId),
  }
}

export function receivablesAgeing(invoices: Invoice[], kind: 'AR' | 'AP' = 'AR') {
  const open = invoices.filter((i) => i.kind === kind && i.status !== 'PAID' && i.status !== 'VOID')
  const bucket = (days: number) => (days <= 0 ? 'Current' : days <= 30 ? '1–30' : days <= 60 ? '31–60' : days <= 90 ? '61–90' : '90+')
  const buckets = new Map<string, number>([['Current', 0], ['1–30', 0], ['31–60', 0], ['61–90', 0], ['90+', 0]])
  open.forEach((i) => {
    const outstanding = (i.total - i.paidAmount) * i.fxRate
    const key = bucket(daysBetween(i.dueDate, TODAY))
    buckets.set(key, (buckets.get(key) ?? 0) + outstanding)
  })
  return {
    total: open.reduce((a, i) => a + (i.total - i.paidAmount) * i.fxRate, 0),
    buckets: Array.from(buckets.entries()).map(([label, value]) => ({ label, value })),
    overdue: open.filter((i) => i.dueDate < TODAY).reduce((a, i) => a + (i.total - i.paidAmount) * i.fxRate, 0),
  }
}

export function landedCostSummary(shipments: ImportShipment[]) {
  const finalised = shipments.filter((s) => s.costFinalised)
  const openShipments = shipments.filter((s) => !s.costFinalised && s.status !== 'CANCELLED')
  return {
    finalisedValue: finalised.reduce((a, s) => a + landedCostTotal(s), 0),
    openValue: openShipments.reduce((a, s) => a + landedCostTotal(s), 0),
    finalisedCount: finalised.length,
    openCount: openShipments.length,
  }
}

/* ==================================================================
   Kiln
   ================================================================== */

export function kilnMetrics(batches: KilnBatch[], lots: Lot[]) {
  const closed = batches.filter((b) => b.status === 'COMPLETED' || b.status === 'FAILED')
  const inBand = closed.filter((b) => b.finalMoisturePercent !== undefined && b.finalMoisturePercent >= b.targetMin && b.finalMoisturePercent <= b.targetMax)
  const running = batches.filter((b) => b.status === 'DRYING' || b.status === 'CONDITIONING' || b.status === 'LOADING')
  const blockedVolume = lots.filter((l) => l.status === 'BLOCKED_KILN').reduce((a, l) => a + l.quantity, 0)
  const blockedValue = lots.filter((l) => l.status === 'BLOCKED_KILN').reduce((a, l) => a + l.quantity * l.unitCost, 0)
  return {
    closed: closed.length,
    inBandPercent: closed.length ? (inBand.length / closed.length) * 100 : 0,
    running: running.length,
    chargeVolumeRunning: running.reduce((a, b) => a + b.chargeVolumeM3, 0),
    blockedVolume,
    blockedValue,
    averageDays: closed.length
      ? closed.reduce((a, b) => a + daysBetween(b.startedAt, b.actualEnd ?? b.plannedEnd), 0) / closed.length
      : 0,
  }
}
