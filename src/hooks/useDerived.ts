/**
 * The derived layer.
 *
 * Nothing on any screen is a stored figure — the MRP netting, the exception
 * list and the capacity load are all recomputed from the book. They are
 * expensive enough to be worth memoising once here rather than in every page.
 */

import * as React from 'react'
import { useMfg } from '@/store/useMfg'
import { runMrp } from '@/lib/mrp'
import { buildExceptions } from '@/lib/exceptions'
import { capacityLoad } from '@/lib/production'
import { downtimeHours } from '@/lib/operations'

export function useMrpLines() {
  const s = useMfg()
  return React.useMemo(
    () =>
      runMrp({
        items: s.items, boms: s.boms, products: s.products, lots: s.lots,
        workOrders: s.workOrders, salesOrders: s.salesOrders, purchaseOrders: s.purchaseOrders,
        shipments: s.shipments, suppliers: s.suppliers, kilnBatches: s.kilnBatches,
        remnants: s.remnants,
        horizonDays: s.settings.mrpHorizonDays,
      }),
    [s.items, s.boms, s.products, s.lots, s.workOrders, s.salesOrders, s.purchaseOrders, s.shipments, s.suppliers, s.kilnBatches, s.remnants, s.settings.mrpHorizonDays],
  )
}

export function useExceptions() {
  const s = useMfg()
  const mrpLines = useMrpLines()
  return React.useMemo(
    () =>
      buildExceptions({
        shipments: s.shipments, purchaseOrders: s.purchaseOrders, suppliers: s.suppliers,
        permits: s.permits, items: s.items, lots: s.lots, kilnBatches: s.kilnBatches,
        workOrders: s.workOrders, workCentres: s.workCentres, qcRecords: s.qcRecords,
        salesOrders: s.salesOrders, customers: s.customers, invoices: s.invoices,
        mrpLines, company: s.company, settings: s.settings,
        quotations: s.quotations, deliveries: s.deliveries, claims: s.claims, payments: s.payments,
        requisitions: s.requisitions, maintenanceOrders: s.maintenanceOrders,
        subcontractOrders: s.subcontractOrders,
        conversionOrders: s.conversionOrders, remnants: s.remnants,
        goodsReceipts: s.goodsReceipts, productionEntries: s.productionEntries,
      }),
    [s.shipments, s.purchaseOrders, s.suppliers, s.permits, s.items, s.lots, s.kilnBatches, s.workOrders, s.workCentres, s.qcRecords, s.salesOrders, s.customers, s.invoices, s.company, s.settings, mrpLines, s.quotations, s.deliveries, s.claims, s.payments, s.requisitions, s.maintenanceOrders, s.subcontractOrders, s.conversionOrders, s.remnants, s.goodsReceipts, s.productionEntries],
  )
}

export function useCapacityLoad(days = 14) {
  const { workCentres, workOrders, maintenanceOrders } = useMfg()
  return React.useMemo(
    () => capacityLoad(workCentres, workOrders, undefined, days, (id) => downtimeHours(maintenanceOrders, id, undefined, days)),
    [workCentres, workOrders, maintenanceOrders, days],
  )
}
