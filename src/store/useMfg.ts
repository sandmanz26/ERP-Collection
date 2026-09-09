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
} from '@/data/types'
import { company as seedCompany, customers as seedCustomers, defaultSettings, items as seedItems, products as seedProducts, suppliers as seedSuppliers, warehouses as seedWarehouses, workCentres as seedWorkCentres } from '@/data/seed-master'
import { boms as seedBoms, routings as seedRoutings } from '@/data/seed-engineering'
import { permits as seedPermits, purchaseOrders as seedPurchaseOrders, shipments as seedShipments } from '@/data/seed-import'
import { kilnBatches as seedKiln, lots as seedLots, qcRecords as seedQc, salesOrders as seedSalesOrders, stockMovements as seedMovements, workOrders as seedWorkOrders } from '@/data/seed-production'
import { accounts as seedAccounts, invoices as seedInvoices, journal as seedJournal } from '@/data/seed-finance'
import { uid } from '@/lib/utils'
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
  updateSettings: (patch: Partial<AppSettings>) => void
  updateCompany: (patch: Partial<CompanyProfile>) => void
  reseed: () => void
}

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

      recordMrpRun: (run) => set((s) => ({ mrpRuns: [run, ...s.mrpRuns].slice(0, 30) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      updateCompany: (patch) => set((s) => ({ company: { ...s.company, ...patch } })),

      reseed: () => set({ ...seed() }),
    }),
    { name: 'wanakarya-mfg', version: 1 },
  ),
)
