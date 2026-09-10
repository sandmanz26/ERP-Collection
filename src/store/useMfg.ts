/**
 * The whole book, in the browser.
 *
 * There is no API. Everything is Zustand plus `localStorage`, seeded once and
 * mutated from the screens like any other store — which is exactly the shape a
 * real client layer would have, minus the fetches.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Account, AppSettings, Bom, CompanyProfile, Customer, ImportShipment, Invoice, Item, JournalEntry,
  KilnBatch, Lot, MrpRun, Permit, Product, PurchaseOrder, QcRecord, Routing, SalesOrder, StockMovement,
  Supplier, Warehouse, WorkCentre, WorkOrder,
  BankAccount, Claim, Delivery, MaintenanceOrder, Payment, PurchaseRequisition, Quotation,
  SubcontractOrder,
} from '@/data/types'
import { company as seedCompany, customers as seedCustomers, defaultSettings, items as seedItems, products as seedProducts, suppliers as seedSuppliers, warehouses as seedWarehouses, workCentres as seedWorkCentres } from '@/data/seed-master'
import { boms as seedBoms, routings as seedRoutings } from '@/data/seed-engineering'
import { permits as seedPermits, purchaseOrders as seedPurchaseOrders, shipments as seedShipments } from '@/data/seed-import'
import { kilnBatches as seedKiln, lots as seedLots, qcRecords as seedQc, salesOrders as seedSalesOrders, stockMovements as seedMovements, workOrders as seedWorkOrders } from '@/data/seed-production'
import { accounts as seedAccounts, invoices as seedInvoices, journal as seedJournal } from '@/data/seed-finance'
import { bankAccounts as seedBankAccounts, claims as seedClaims, deliveries as seedDeliveries, payments as seedPayments, quotations as seedQuotations } from '@/data/seed-commerce'
import { maintenanceOrders as seedMaintenance, requisitions as seedRequisitions, subcontractOrders as seedSubcontract } from '@/data/seed-operations'
import { buildApprovals, requisitionValue } from '@/lib/operations'
import { nextCode, uid } from '@/lib/utils'
import { addDays, TODAY } from '@/data/clock'
import { deliveryDocGate } from '@/lib/commerce'
import { useAuth } from './useAuth'

const actor = () => {
  const { users, currentUserId } = useAuth.getState()
  return users.find((u) => u.id === currentUserId)?.fullName ?? 'System'
}

export interface ActivityLog {
  id: string
  at: string
  action: string
  entity: string
  detail: string
  actor: string
}

export type EntityKey =
  | 'customers' | 'products' | 'boms' | 'routings' | 'workCentres' | 'items' | 'suppliers'
  | 'warehouses' | 'lots' | 'movements' | 'purchaseOrders' | 'shipments' | 'permits'
  | 'salesOrders' | 'workOrders' | 'kilnBatches' | 'qcRecords' | 'accounts' | 'journal' | 'invoices'
  | 'quotations' | 'deliveries' | 'claims' | 'payments' | 'bankAccounts' | 'requisitions'
  | 'maintenanceOrders' | 'subcontractOrders'

interface MfgState {
  customers: Customer[]
  products: Product[]
  boms: Bom[]
  routings: Routing[]
  workCentres: WorkCentre[]
  items: Item[]
  suppliers: Supplier[]
  warehouses: Warehouse[]
  lots: Lot[]
  movements: StockMovement[]
  purchaseOrders: PurchaseOrder[]
  shipments: ImportShipment[]
  permits: Permit[]
  salesOrders: SalesOrder[]
  workOrders: WorkOrder[]
  kilnBatches: KilnBatch[]
  qcRecords: QcRecord[]
  accounts: Account[]
  journal: JournalEntry[]
  invoices: Invoice[]
  quotations: Quotation[]
  deliveries: Delivery[]
  claims: Claim[]
  payments: Payment[]
  bankAccounts: BankAccount[]
  requisitions: PurchaseRequisition[]
  maintenanceOrders: MaintenanceOrder[]
  subcontractOrders: SubcontractOrder[]
  mrpRuns: MrpRun[]
  company: CompanyProfile
  settings: AppSettings
  activity: ActivityLog[]

  log: (action: string, entity: string, detail: string) => void
  upsert: <K extends EntityKey>(key: K, row: MfgState[K][number]) => void
  remove: (key: EntityKey, ids: string[]) => void
  importRows: <K extends EntityKey>(key: K, rows: MfgState[K][number][]) => void

  /* domain actions — the ones that carry a rule with them */
  releaseWorkOrder: (id: string) => void
  holdWorkOrder: (id: string, reason: string) => void
  advanceOperation: (workOrderId: string, operationNo: number) => void
  issueMaterial: (workOrderId: string, materialId: string, quantity: number) => void
  advanceShipment: (id: string, to: ImportShipment['status']) => void
  assignLane: (id: string, lane: ImportShipment['lane']) => void
  finaliseLandedCost: (id: string, unitCosts: Record<string, number>) => void
  setDocumentStatus: (shipmentId: string, docId: string, status: ImportShipment['documents'][number]['status'], reference?: string) => void
  approvePurchaseOrder: (id: string) => void
  releasePurchaseOrder: (id: string) => void
  confirmSalesOrderLine: (orderId: string, lineId: string, date: string) => void
  closeKilnBatch: (id: string, finalMoisture: number) => void
  addKilnReading: (id: string, moisture: number, dryBulb: number, wetBulb: number) => void
  dispositionQc: (id: string, disposition: QcRecord['disposition'], rootCause?: string) => void
  recordMrpRun: (run: MrpRun) => void

  /* commercial */
  sendQuotation: (id: string) => void
  decideQuotation: (id: string, outcome: 'WON' | 'LOST' | 'WITHDRAWN', reason?: Quotation['lostReason']) => void
  convertQuotation: (id: string) => void
  advanceDelivery: (id: string, to: Delivery['status']) => void
  setDeliveryDocument: (deliveryId: string, docId: string, status: Delivery['documents'][number]['status'], reference?: string) => void
  settleClaim: (id: string, remedy: Claim['remedy'], liability: Claim['liability'], settledAmount: number) => void
  closeClaim: (id: string, correctiveAction?: string) => void
  clearPayment: (id: string) => void
  allocatePayment: (id: string, invoiceId: string, amount: number) => void

  /* operations */
  submitRequisition: (id: string) => void
  decideRequisition: (id: string, level: number, decision: 'APPROVED' | 'REJECTED', comment?: string) => void
  convertRequisition: (id: string) => void
  startMaintenance: (id: string) => void
  completeMaintenance: (id: string, actualDowntimeHours: number, rootCause?: string) => void
  sendSubcontract: (id: string) => void
  receiveSubcontract: (id: string, returned: Record<string, number>, loss: Record<string, number>) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  updateCompany: (patch: Partial<CompanyProfile>) => void
  reseed: () => void
}

/** The collections a version-1 book predates. */
const newCollections = () => ({
  quotations: seedQuotations,
  deliveries: seedDeliveries,
  claims: seedClaims,
  payments: seedPayments,
  bankAccounts: seedBankAccounts,
  requisitions: seedRequisitions,
  maintenanceOrders: seedMaintenance,
  subcontractOrders: seedSubcontract,
})

const seed = () => ({
  customers: seedCustomers,
  products: seedProducts,
  boms: seedBoms,
  routings: seedRoutings,
  workCentres: seedWorkCentres,
  items: seedItems,
  suppliers: seedSuppliers,
  warehouses: seedWarehouses,
  lots: seedLots,
  movements: seedMovements,
  purchaseOrders: seedPurchaseOrders,
  shipments: seedShipments,
  permits: seedPermits,
  salesOrders: seedSalesOrders,
  workOrders: seedWorkOrders,
  kilnBatches: seedKiln,
  qcRecords: seedQc,
  accounts: seedAccounts,
  journal: seedJournal,
  invoices: seedInvoices,
  ...newCollections(),
  mrpRuns: [] as MrpRun[],
  company: seedCompany,
  settings: defaultSettings,
  activity: [] as ActivityLog[],
})

export const useMfg = create<MfgState>()(
  persist(
    (set, get) => ({
      ...seed(),

      log: (action, entity, detail) =>
        set((s) => ({
          activity: [
            { id: uid('act'), at: new Date().toISOString(), action, entity, detail, actor: actor() },
            ...s.activity,
          ].slice(0, 400),
        })),

      upsert: (key, row) =>
        set((s) => {
          const list = s[key] as { id: string }[]
          const exists = list.some((r) => r.id === (row as { id: string }).id)
          return { [key]: exists ? list.map((r) => (r.id === (row as { id: string }).id ? row : r)) : [row, ...list] } as never
        }),

      remove: (key, ids) =>
        set((s) => ({ [key]: (s[key] as { id: string }[]).filter((r) => !ids.includes(r.id)) } as never)),

      importRows: (key, rows) =>
        set((s) => {
          const list = [...(s[key] as { id: string }[])]
          rows.forEach((row) => {
            const i = list.findIndex((r) => r.id === (row as { id: string }).id)
            if (i >= 0) list[i] = row as never
            else list.unshift(row as never)
          })
          return { [key]: list } as never
        }),

      /* ---------------- production ---------------- */

      releaseWorkOrder: (id) =>
        set((s) => {
          const wo = s.workOrders.find((w) => w.id === id)
          if (wo) get().log('Released', 'Work order', `${wo.code} released to the floor.`)
          return {
            workOrders: s.workOrders.map((w) =>
              w.id === id
                ? {
                    ...w, status: 'RELEASED', releasedBy: actor(),
                    operations: w.operations.map((op, i) => (i === 0 && op.status === 'PENDING' ? { ...op, status: 'READY' } : op)),
                  }
                : w,
            ),
          }
        }),

      holdWorkOrder: (id, reason) =>
        set((s) => {
          const wo = s.workOrders.find((w) => w.id === id)
          if (wo) get().log('Held', 'Work order', `${wo.code} put on hold — ${reason}`)
          return { workOrders: s.workOrders.map((w) => (w.id === id ? { ...w, status: 'ON_HOLD', note: reason } : w)) }
        }),

      advanceOperation: (workOrderId, operationNo) =>
        set((s) => ({
          workOrders: s.workOrders.map((w) => {
            if (w.id !== workOrderId) return w
            const idx = w.operations.findIndex((o) => o.operationNo === operationNo)
            if (idx < 0) return w
            const operations = w.operations.map((op, i) => {
              if (i === idx) return { ...op, status: 'DONE' as const, actualEnd: new Date().toISOString().slice(0, 10), quantityDone: w.quantity - w.quantityScrapped }
              if (i === idx + 1 && op.status === 'PENDING') return { ...op, status: 'READY' as const }
              return op
            })
            const allDone = operations.every((o) => o.status === 'DONE')
            return {
              ...w,
              operations,
              status: allDone ? ('COMPLETED' as const) : ('IN_PROGRESS' as const),
              quantityDone: allDone ? w.quantity - w.quantityScrapped : w.quantityDone,
              actualStart: w.actualStart ?? w.plannedStart,
              actualEnd: allDone ? new Date().toISOString().slice(0, 10) : w.actualEnd,
            }
          }),
        })),

      issueMaterial: (workOrderId, materialId, quantity) =>
        set((s) => {
          const wo = s.workOrders.find((w) => w.id === workOrderId)
          const mat = wo?.materials.find((m) => m.id === materialId)
          const item = s.items.find((i) => i.id === mat?.itemId)
          if (wo && item) get().log('Issued', 'Material', `${quantity} ${mat?.uom} of ${item.code} issued to ${wo.code}.`)
          return {
            workOrders: s.workOrders.map((w) =>
              w.id === workOrderId
                ? {
                    ...w,
                    materials: w.materials.map((m) =>
                      m.id === materialId
                        ? { ...m, issuedQuantity: m.issuedQuantity + quantity, issuedAt: new Date().toISOString().slice(0, 10), shortageNote: undefined }
                        : m,
                    ),
                    actualMaterialCost: w.actualMaterialCost + quantity * (mat?.unitCost ?? 0),
                  }
                : w,
            ),
            movements: [
              {
                id: uid('mv'), at: new Date().toISOString(), kind: 'ISSUE' as const,
                itemId: mat?.itemId, warehouseId: 'wh_wip', quantity: -quantity,
                unitCost: mat?.unitCost ?? 0, reference: `Material issue — ${wo?.code}`,
                workOrderId, actor: actor(),
              },
              ...s.movements,
            ],
          }
        }),

      /* ---------------- import ---------------- */

      advanceShipment: (id, to) =>
        set((s) => {
          const sh = s.shipments.find((x) => x.id === id)
          if (sh) get().log('Advanced', 'Import shipment', `${sh.code} moved to ${to.replace(/_/g, ' ').toLowerCase()}.`)
          const today = new Date().toISOString().slice(0, 10)
          return {
            shipments: s.shipments.map((x) => {
              if (x.id !== id) return x
              const patch: Partial<ImportShipment> = { status: to }
              if (to === 'ARRIVED' && !x.dischargedAt) patch.dischargedAt = today
              if (to === 'PIB_SUBMITTED' && !x.pibDate) patch.pibDate = today
              if (to === 'CLEARED' && !x.sppbDate) { patch.sppbDate = today; patch.sppbNumber = `SPPB-040300-${Math.floor(Math.random() * 900 + 100)}` }
              if (to === 'RECEIVED' && !x.receivedAt) { patch.receivedAt = today; patch.gateOutAt = x.gateOutAt ?? today }
              return { ...x, ...patch }
            }),
          }
        }),

      assignLane: (id, lane) =>
        set((s) => {
          const sh = s.shipments.find((x) => x.id === id)
          if (sh) get().log('Channelled', 'Customs', `${sh.code} drew the ${lane.toLowerCase()} lane.`)
          return {
            shipments: s.shipments.map((x) =>
              x.id === id ? { ...x, lane, laneAssignedAt: new Date().toISOString().slice(0, 10), status: 'LANE_ASSIGNED' } : x,
            ),
          }
        }),

      finaliseLandedCost: (id, unitCosts) =>
        set((s) => {
          const sh = s.shipments.find((x) => x.id === id)
          if (sh) get().log('Finalised', 'Landed cost', `${sh.code} allocated and posted; lots revalued from provisional.`)
          const today = new Date().toISOString().slice(0, 10)
          return {
            shipments: s.shipments.map((x) =>
              x.id === id
                ? {
                    ...x, costFinalised: true, costFinalisedAt: today,
                    costs: x.costs.map((c) => ({ ...c, actual: true })),
                    lines: x.lines.map((l) => ({ ...l, landedUnitCost: unitCosts[l.id] ?? l.landedUnitCost })),
                  }
                : x,
            ),
            lots: s.lots.map((l) => {
              if (l.shipmentId !== id) return l
              const line = sh?.lines.find((x) => x.lotId === l.id)
              return { ...l, costIsProvisional: false, unitCost: (line && unitCosts[line.id]) ?? l.unitCost }
            }),
          }
        }),

      setDocumentStatus: (shipmentId, docId, status, reference) =>
        set((s) => ({
          shipments: s.shipments.map((x) =>
            x.id === shipmentId
              ? {
                  ...x,
                  documents: x.documents.map((doc) =>
                    doc.id === docId
                      ? { ...doc, status, reference: reference ?? doc.reference, receivedAt: status === 'RECEIVED' || status === 'VERIFIED' ? new Date().toISOString().slice(0, 10) : doc.receivedAt }
                      : doc,
                  ),
                }
              : x,
          ),
        })),

      approvePurchaseOrder: (id) =>
        set((s) => {
          const po = s.purchaseOrders.find((p) => p.id === id)
          if (po) get().log('Approved', 'Purchase order', `${po.code} approved.`)
          return {
            purchaseOrders: s.purchaseOrders.map((p) =>
              p.id === id ? { ...p, status: 'APPROVED', approvedBy: actor(), approvedAt: new Date().toISOString().slice(0, 10) } : p,
            ),
          }
        }),

      releasePurchaseOrder: (id) =>
        set((s) => {
          const po = s.purchaseOrders.find((p) => p.id === id)
          if (po) get().log('Released', 'Purchase order', `${po.code} released to the supplier.`)
          return { purchaseOrders: s.purchaseOrders.map((p) => (p.id === id ? { ...p, status: 'RELEASED' } : p)) }
        }),

      /* ---------------- commercial ---------------- */

      confirmSalesOrderLine: (orderId, lineId, date) =>
        set((s) => {
          const so = s.salesOrders.find((o) => o.id === orderId)
          if (so) get().log('Confirmed', 'Sales order', `${so.code} line confirmed for ${date}.`)
          return {
            salesOrders: s.salesOrders.map((o) =>
              o.id === orderId
                ? {
                    ...o, status: o.status === 'DRAFT' || o.status === 'PENDING_CONFIRMATION' ? 'CONFIRMED' : o.status,
                    lines: o.lines.map((l) => (l.id === lineId ? { ...l, confirmedDate: date } : l)),
                  }
                : o,
            ),
          }
        }),

      /* ---------------- kiln and quality ---------------- */

      closeKilnBatch: (id, finalMoisture) =>
        set((s) => {
          const b = s.kilnBatches.find((x) => x.id === id)
          if (!b) return {}
          const inBand = finalMoisture >= b.targetMin && finalMoisture <= b.targetMax
          get().log(
            inBand ? 'Closed' : 'Failed', 'Kiln batch',
            `${b.code} closed at ${finalMoisture}% against a ${b.targetMin}–${b.targetMax}% band.`,
          )
          return {
            kilnBatches: s.kilnBatches.map((x) =>
              x.id === id
                ? { ...x, status: inBand ? 'COMPLETED' : 'FAILED', finalMoisturePercent: finalMoisture, actualEnd: new Date().toISOString().slice(0, 10) }
                : x,
            ),
            lots: s.lots.map((l) =>
              b.lotIds.includes(l.id)
                ? { ...l, status: inBand ? 'AVAILABLE' : 'BLOCKED_KILN', moisturePercent: finalMoisture }
                : l,
            ),
          }
        }),

      addKilnReading: (id, moisture, dryBulb, wetBulb) =>
        set((s) => ({
          kilnBatches: s.kilnBatches.map((b) =>
            b.id === id
              ? {
                  ...b,
                  readings: [...b.readings, { id: uid('kr'), at: new Date().toISOString(), moisturePercent: moisture, dryBulbC: dryBulb, wetBulbC: wetBulb, takenBy: actor() }],
                }
              : b,
          ),
        })),

      dispositionQc: (id, disposition, rootCause) =>
        set((s) => {
          const q = s.qcRecords.find((x) => x.id === id)
          if (q) get().log('Dispositioned', 'Quality', `${q.code} → ${disposition.replace(/_/g, ' ').toLowerCase()}.`)
          return {
            qcRecords: s.qcRecords.map((x) => (x.id === id ? { ...x, disposition, rootCause: rootCause ?? x.rootCause } : x)),
            lots: s.lots.map((l) =>
              q?.itemId && l.itemId === q.itemId && l.status === 'BLOCKED_QC' && disposition === 'ACCEPT'
                ? { ...l, status: 'AVAILABLE' }
                : l,
            ),
          }
        }),


      /* ---------------- commercial ---------------- */

      sendQuotation: (id) =>
        set((s) => {
          const q = s.quotations.find((x) => x.id === id)
          if (q) get().log('Sent', 'Quotation', `${q.code} went out, valid to ${q.validUntil}.`)
          return { quotations: s.quotations.map((x) => (x.id === id ? { ...x, status: 'SENT' as const } : x)) }
        }),

      decideQuotation: (id, outcome, reason) =>
        set((s) => {
          const q = s.quotations.find((x) => x.id === id)
          if (q) get().log(outcome === 'WON' ? 'Won' : 'Closed', 'Quotation', `${q.code} marked ${outcome.toLowerCase()}${reason ? ` — ${reason.replace(/_/g, ' ').toLowerCase()}` : ''}.`)
          return {
            quotations: s.quotations.map((x) =>
              x.id === id
                ? { ...x, status: outcome, decidedAt: TODAY, lostReason: outcome === 'LOST' ? reason : undefined, probabilityPercent: outcome === 'WON' ? 100 : 0 }
                : x,
            ),
          }
        }),

      /**
       * A won quotation becomes an order with the prices it was won at — retyping
       * them is where the margin quietly disappears between the desk and the book.
       */
      convertQuotation: (id) =>
        set((s) => {
          const q = s.quotations.find((x) => x.id === id)
          if (!q || q.salesOrderId) return {}
          const code = nextCode('SO', s.salesOrders.map((o) => o.code), 4, true)
          const customer = s.customers.find((c) => c.id === q.customerId)
          const order: SalesOrder = {
            id: uid('so'), code, customerId: q.customerId, status: 'PENDING_CONFIRMATION',
            priority: 'STANDARD', orderDate: TODAY, currency: q.currency, fxRate: q.fxRate,
            depositPercent: customer?.depositPercent ?? 0, depositReceived: 0,
            salesPerson: q.salesPerson, incoterm: q.incoterm, destination: q.destination,
            note: `Converted from ${q.code} at revision ${q.revision}.`,
            lines: q.lines.map((l) => ({
              id: uid('sol'), productId: l.productId, description: l.description, quantity: l.quantity,
              unitPrice: l.unitPrice, requestedDate: addDays(TODAY, l.leadTimeDays), shippedQuantity: 0,
            })),
          }
          get().log('Converted', 'Quotation', `${q.code} became ${code} at the prices it was won at.`)
          return {
            salesOrders: [order, ...s.salesOrders],
            quotations: s.quotations.map((x) => (x.id === id ? { ...x, status: 'WON' as const, decidedAt: TODAY, salesOrderId: order.id } : x)),
          }
        }),

      /**
       * A delivery cannot be loaded until every document it needs is verified —
       * an export container that sails on an unsubmitted PEB does not get a gate pass.
       */
      advanceDelivery: (id, to) =>
        set((s) => {
          const dv = s.deliveries.find((x) => x.id === id)
          if (!dv) return {}
          if ((to === 'LOADED' || to === 'IN_TRANSIT') && !deliveryDocGate(dv).ok) {
            get().log('Blocked', 'Delivery', `${dv.code} cannot move to ${to.toLowerCase()} — ${deliveryDocGate(dv).missing.join(', ')} still outstanding.`)
            return {}
          }
          get().log('Advanced', 'Delivery', `${dv.code} → ${to.replace(/_/g, ' ').toLowerCase()}.`)
          return {
            deliveries: s.deliveries.map((x) =>
              x.id === id
                ? {
                    ...x, status: to,
                    dispatchedAt: to === 'IN_TRANSIT' ? TODAY : x.dispatchedAt,
                    deliveredAt: to === 'DELIVERED' || to === 'PARTIALLY_ACCEPTED' ? TODAY : x.deliveredAt,
                  }
                : x,
            ),
            /* delivering is the only thing that legitimately moves a sales order line's shipped quantity */
            salesOrders: to === 'DELIVERED' || to === 'PARTIALLY_ACCEPTED'
              ? s.salesOrders.map((o) => {
                  const lines = dv.lines.filter((dl) => dl.salesOrderId === o.id)
                  if (!lines.length) return o
                  return {
                    ...o,
                    lines: o.lines.map((l) => {
                      const dl = lines.find((x) => x.salesOrderLineId === l.id)
                      return dl ? { ...l, shippedQuantity: Math.min(l.quantity, l.shippedQuantity + dl.quantity) } : l
                    }),
                  }
                })
              : s.salesOrders,
          }
        }),

      setDeliveryDocument: (deliveryId, docId, status, reference) =>
        set((s) => ({
          deliveries: s.deliveries.map((dv) =>
            dv.id === deliveryId
              ? { ...dv, documents: dv.documents.map((doc) => (doc.id === docId ? { ...doc, status, reference: reference ?? doc.reference } : doc)) }
              : dv,
          ),
        })),

      settleClaim: (id, remedy, liability, settledAmount) =>
        set((s) => {
          const c = s.claims.find((x) => x.id === id)
          if (c) get().log('Settled', 'Claim', `${c.code} — ${remedy.replace(/_/g, ' ').toLowerCase()}, liability ${liability.toLowerCase()}.`)
          return {
            claims: s.claims.map((x) =>
              x.id === id
                ? {
                    ...x, remedy, liability, settledAmount,
                    status: remedy === 'CREDIT_NOTE' ? ('CREDITED' as const)
                      : remedy === 'NO_REMEDY' ? ('REJECTED' as const)
                      : remedy === 'REPLACE' ? ('REPLACING' as const)
                      : ('APPROVED' as const),
                  }
                : x,
            ),
          }
        }),

      closeClaim: (id, correctiveAction) =>
        set((s) => {
          const c = s.claims.find((x) => x.id === id)
          if (c) get().log('Closed', 'Claim', `${c.code} closed.`)
          return {
            claims: s.claims.map((x) =>
              x.id === id ? { ...x, status: 'CLOSED' as const, closedAt: TODAY, correctiveAction: correctiveAction ?? x.correctiveAction } : x,
            ),
          }
        }),

      clearPayment: (id) =>
        set((s) => {
          const p = s.payments.find((x) => x.id === id)
          if (!p) return {}
          get().log('Cleared', 'Payment', `${p.code} cleared the bank.`)
          const allocated = new Map<string, number>()
          p.allocations.forEach((a) => {
            if (a.invoiceId) allocated.set(a.invoiceId, (allocated.get(a.invoiceId) ?? 0) + a.amount)
          })
          return {
            payments: s.payments.map((x) => (x.id === id ? { ...x, status: 'CLEARED' as const } : x)),
            invoices: s.invoices.map((inv) => {
              const add = allocated.get(inv.id)
              if (!add) return inv
              const paid = inv.paidAmount + add
              return { ...inv, paidAmount: paid, status: paid >= inv.total - 1 ? ('PAID' as const) : ('PARTIALLY_PAID' as const) }
            }),
          }
        }),

      allocatePayment: (id, invoiceId, amount) =>
        set((s) => ({
          payments: s.payments.map((p) =>
            p.id === id
              ? { ...p, allocations: [...p.allocations, { id: uid('pal'), invoiceId, amount, memo: `Applied to ${s.invoices.find((i) => i.id === invoiceId)?.code ?? invoiceId}` }] }
              : p,
          ),
        })),

      /* ---------------- operations ---------------- */

      submitRequisition: (id) =>
        set((s) => {
          const r = s.requisitions.find((x) => x.id === id)
          if (!r) return {}
          const value = requisitionValue(r)
          get().log('Submitted', 'Requisition', `${r.code} submitted at ${Math.round(value).toLocaleString('en-US')}, needing ${buildApprovals(value).length} signature(s).`)
          return {
            requisitions: s.requisitions.map((x) =>
              x.id === id
                ? { ...x, status: 'PENDING_APPROVAL' as const, approvals: x.approvals.length ? x.approvals : buildApprovals(value) }
                : x,
            ),
          }
        }),

      decideRequisition: (id, level, decision, comment) =>
        set((s) => {
          const r = s.requisitions.find((x) => x.id === id)
          if (!r) return {}
          const approvals = r.approvals.map((a) =>
            a.level === level ? { ...a, decision, decidedAt: TODAY, comment: comment ?? a.comment } : a,
          )
          const rejected = approvals.some((a) => a.decision === 'REJECTED')
          const complete = !rejected && approvals.every((a) => a.decision === 'APPROVED')
          get().log(decision === 'APPROVED' ? 'Approved' : 'Rejected', 'Requisition', `${r.code} at level ${level}.`)
          return {
            requisitions: s.requisitions.map((x) =>
              x.id === id
                ? {
                    ...x, approvals,
                    status: rejected ? ('REJECTED' as const) : complete ? ('APPROVED' as const) : ('PENDING_APPROVAL' as const),
                    rejectedReason: rejected ? comment ?? x.rejectedReason : x.rejectedReason,
                  }
                : x,
            ),
          }
        }),

      /** One purchase order per supplier on the requisition — which is how buying actually works. */
      convertRequisition: (id) =>
        set((s) => {
          const r = s.requisitions.find((x) => x.id === id)
          if (!r || r.status !== 'APPROVED') return {}
          const bySupplier = new Map<string, typeof r.lines>()
          r.lines.forEach((l) => {
            const key = l.suggestedSupplierId ?? 'unassigned'
            bySupplier.set(key, [...(bySupplier.get(key) ?? []), l])
          })
          const codes = s.purchaseOrders.map((p) => p.code)
          const created: PurchaseOrder[] = []
          bySupplier.forEach((lines, supplierId) => {
            const supplier = s.suppliers.find((x) => x.id === supplierId)
            const code = nextCode('PO', [...codes, ...created.map((c) => c.code)], 4, true)
            created.push({
              id: uid('po'), code, supplierId, status: 'DRAFT',
              kind: supplier?.country && supplier.country !== 'ID' ? 'OVERSEAS' : 'LOCAL',
              orderDate: TODAY, currency: lines[0].currency, fxRateAtOrder: 1,
              incoterm: supplier?.country !== 'ID' ? 'FOB' : 'DAP',
              paymentInstrument: supplier?.paymentInstrument ?? 'TT_30',
              requisitionId: r.id, requestedBy: r.requestedBy,
              lines: lines.map((l) => ({
                id: uid('pol'), itemId: l.itemId ?? '', quantity: l.quantity,
                uom: l.uom, unitPrice: l.estimatedUnitCost, receivedQuantity: 0,
                requiredDate: l.requiredDate, mrpDemandRef: l.justification,
              })),
              note: `Raised from ${r.code}. ${lines[0].justification}`,
            })
          })
          get().log('Converted', 'Requisition', `${r.code} became ${created.map((c) => c.code).join(', ')}.`)
          return {
            purchaseOrders: [...created, ...s.purchaseOrders],
            requisitions: s.requisitions.map((x) => (x.id === id ? { ...x, status: 'CONVERTED' as const } : x)),
          }
        }),

      startMaintenance: (id) =>
        set((s) => {
          const m = s.maintenanceOrders.find((x) => x.id === id)
          if (m) get().log('Started', 'Maintenance', `${m.code} — ${m.assetName} is down for ${m.plannedDowntimeHours} hours.`)
          return {
            maintenanceOrders: s.maintenanceOrders.map((x) =>
              x.id === id ? { ...x, status: 'IN_PROGRESS' as const, startedAt: TODAY } : x,
            ),
          }
        }),

      completeMaintenance: (id, actualDowntimeHours, rootCause) =>
        set((s) => {
          const m = s.maintenanceOrders.find((x) => x.id === id)
          if (m) get().log('Completed', 'Maintenance', `${m.code} closed after ${actualDowntimeHours} hours of downtime.`)
          return {
            maintenanceOrders: s.maintenanceOrders.map((x) =>
              x.id === id
                ? { ...x, status: 'COMPLETED' as const, completedAt: TODAY, actualDowntimeHours, lastDoneAt: TODAY, rootCause: rootCause ?? x.rootCause }
                : x,
            ),
          }
        }),

      sendSubcontract: (id) =>
        set((s) => {
          const o = s.subcontractOrders.find((x) => x.id === id)
          if (o) get().log('Sent', 'Subcontract', `${o.code} — material left the gate for ${s.suppliers.find((x) => x.id === o.supplierId)?.name ?? 'the subcontractor'}.`)
          return {
            subcontractOrders: s.subcontractOrders.map((x) =>
              x.id === id ? { ...x, status: 'MATERIAL_SENT' as const, sentAt: TODAY } : x,
            ),
          }
        }),

      receiveSubcontract: (id, returned, loss) =>
        set((s) => {
          const o = s.subcontractOrders.find((x) => x.id === id)
          if (!o) return {}
          const materials = o.materials.map((m) => ({
            ...m,
            returnedQuantity: m.returnedQuantity + (returned[m.id] ?? 0),
            lossQuantity: m.lossQuantity + (loss[m.id] ?? 0),
          }))
          const done = materials.every((m) => m.returnedQuantity + m.lossQuantity >= m.sentQuantity)
          get().log('Received', 'Subcontract', `${o.code} — ${done ? 'all back' : 'part back'} from ${s.suppliers.find((x) => x.id === o.supplierId)?.name ?? 'the subcontractor'}.`)
          return {
            subcontractOrders: s.subcontractOrders.map((x) =>
              x.id === id
                ? { ...x, materials, status: done ? ('RETURNED' as const) : ('PARTIALLY_RETURNED' as const), returnedAt: done ? TODAY : x.returnedAt }
                : x,
            ),
          }
        }),

      recordMrpRun: (run) => set((s) => ({ mrpRuns: [run, ...s.mrpRuns].slice(0, 30) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      updateCompany: (patch) => set((s) => ({ company: { ...s.company, ...patch } })),

      reseed: () => set({ ...seed() }),
    }),
    {
      name: 'wanakarya-mfg',
      version: 2,
      /**
       * A book saved before the commercial and operations modules existed has no
       * quotations, deliveries or maintenance in it. Rather than discard the user's
       * edits, fold the new collections in from seed and keep everything else.
       */
      migrate: (persisted, from) => {
        if (from >= 2) return persisted as MfgState
        return { ...seed(), ...(persisted as object), ...newCollections() } as MfgState
      },
    },
  ),
)
