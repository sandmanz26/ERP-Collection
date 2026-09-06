import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Account, AppSettings, Budget, Buyer, CompanyProfile, GoodsReceipt, Item, JournalEntry, Payment,
  Project, ProjectStage, PurchaseOrder, PurchaseRequest, SalesInvoice, Shipment, StockCount,
  StockMovement, StockReservation, StockTransfer, Supplier, SupplierBill, Warehouse, WorkOrder,
} from '@/data/types'
import {
  accounts as seedAccounts, bills as seedBills, budgets as seedBudgets, buyers as seedBuyers,
  company as seedCompany, counts as seedCounts, goodsReceipts as seedReceipts, items as seedItems,
  journal as seedJournal, movements as seedMovements, payments as seedPayments,
  projects as seedProjects, purchaseOrders as seedOrders, purchaseRequests as seedRequests,
  reservations as seedReservations, salesInvoices as seedInvoices, shipments as seedShipments,
  suppliers as seedSuppliers, transfers as seedTransfers, warehouses as seedWarehouses,
  workOrders as seedWorkOrders,
} from '@/data/seed'
import { DEFAULT_SETTINGS } from '@/data/reference'
import { uid } from '@/lib/utils'
import { useAuth } from './useAuth'

/** The audit trail records who did it, so it has to ask the session. */
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

/** Replace by id, or append when it is new. */
function upsert<T extends { id: string }>(rows: T[], row: T): T[] {
  const i = rows.findIndex((r) => r.id === row.id)
  if (i === -1) return [row, ...rows]
  const next = rows.slice()
  next[i] = row
  return next
}

interface ErpState {
  projects: Project[]
  buyers: Buyer[]
  suppliers: Supplier[]
  items: Item[]
  warehouses: Warehouse[]
  budgets: Budget[]
  requests: PurchaseRequest[]
  orders: PurchaseOrder[]
  receipts: GoodsReceipt[]
  movements: StockMovement[]
  transfers: StockTransfer[]
  counts: StockCount[]
  reservations: StockReservation[]
  workOrders: WorkOrder[]
  shipments: Shipment[]
  accounts: Account[]
  journal: JournalEntry[]
  bills: SupplierBill[]
  invoices: SalesInvoice[]
  payments: Payment[]
  company: CompanyProfile
  settings: AppSettings
  activity: ActivityLog[]

  log: (action: string, entity: string, detail: string) => void

  upsertProject: (p: Project) => void
  removeProjects: (ids: string[]) => void
  importProjects: (rows: Project[]) => void
  advanceStage: (projectId: string, to: ProjectStage) => void

  upsertBuyer: (b: Buyer) => void
  removeBuyers: (ids: string[]) => void
  importBuyers: (rows: Buyer[]) => void

  upsertSupplier: (s: Supplier) => void
  removeSuppliers: (ids: string[]) => void
  importSuppliers: (rows: Supplier[]) => void

  upsertItem: (i: Item) => void
  removeItems: (ids: string[]) => void
  importItems: (rows: Item[]) => void

  upsertWarehouse: (w: Warehouse) => void
  removeWarehouses: (ids: string[]) => void

  upsertBudget: (b: Budget) => void
  removeBudgets: (ids: string[]) => void
  submitBudget: (id: string) => void
  approveBudget: (id: string) => void
  rejectBudget: (id: string, reason: string) => void

  upsertRequest: (r: PurchaseRequest) => void
  removeRequests: (ids: string[]) => void
  approveRequest: (id: string) => void

  upsertOrder: (o: PurchaseOrder) => void
  removeOrders: (ids: string[]) => void
  importOrders: (rows: PurchaseOrder[]) => void
  approveOrder: (id: string) => void

  /** Posting a receipt writes back to the order and into the stock ledger. */
  postReceipt: (grn: GoodsReceipt) => void
  removeReceipts: (ids: string[]) => void

  upsertTransfer: (t: StockTransfer) => void
  receiveTransfer: (id: string) => void
  removeTransfers: (ids: string[]) => void

  upsertCount: (c: StockCount) => void
  postCount: (id: string) => void
  removeCounts: (ids: string[]) => void

  addMovement: (m: StockMovement) => void
  removeMovements: (ids: string[]) => void

  upsertWorkOrder: (w: WorkOrder) => void
  removeWorkOrders: (ids: string[]) => void

  upsertShipment: (s: Shipment) => void
  removeShipments: (ids: string[]) => void

  upsertBill: (b: SupplierBill) => void
  removeBills: (ids: string[]) => void
  approveBill: (id: string) => void

  upsertInvoice: (i: SalesInvoice) => void
  removeInvoices: (ids: string[]) => void

  upsertPayment: (p: Payment) => void
  removePayments: (ids: string[]) => void

  upsertAccount: (a: Account) => void
  removeAccounts: (ids: string[]) => void

  upsertJournal: (j: JournalEntry) => void
  removeJournal: (ids: string[]) => void

  updateCompany: (patch: Partial<CompanyProfile>) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  clearActivity: () => void
  resetDemoData: () => void
}

const seedState = () => ({
  projects: structuredClone(seedProjects),
  buyers: structuredClone(seedBuyers),
  suppliers: structuredClone(seedSuppliers),
  items: structuredClone(seedItems),
  warehouses: structuredClone(seedWarehouses),
  budgets: structuredClone(seedBudgets),
  requests: structuredClone(seedRequests),
  orders: structuredClone(seedOrders),
  receipts: structuredClone(seedReceipts),
  movements: structuredClone(seedMovements),
  transfers: structuredClone(seedTransfers),
  counts: structuredClone(seedCounts),
  reservations: structuredClone(seedReservations),
  workOrders: structuredClone(seedWorkOrders),
  shipments: structuredClone(seedShipments),
  accounts: structuredClone(seedAccounts),
  journal: structuredClone(seedJournal),
  bills: structuredClone(seedBills),
  invoices: structuredClone(seedInvoices),
  payments: structuredClone(seedPayments),
  company: structuredClone(seedCompany),
  settings: structuredClone(DEFAULT_SETTINGS) as AppSettings,
  activity: [] as ActivityLog[],
})

export const useErp = create<ErpState>()(
  persist(
    (set, get) => ({
      ...seedState(),

      log: (action, entity, detail) =>
        set((s) => ({
          activity: [
            { id: uid('log'), at: new Date().toISOString(), action, entity, detail, actor: actor() },
            ...s.activity,
          ].slice(0, 400),
        })),

      /* ---------------- commercial ---------------- */

      upsertProject: (p) => {
        set((s) => ({ projects: upsert(s.projects, { ...p, updatedAt: new Date().toISOString() }) }))
        get().log('save', 'Project', `${p.code} — ${p.name}`)
      },
      removeProjects: (ids) => {
        set((s) => ({ projects: s.projects.filter((p) => !ids.includes(p.id)) }))
        get().log('delete', 'Project', `${ids.length} record${ids.length > 1 ? 's' : ''}`)
      },
      importProjects: (rows) => {
        set((s) => {
          let list = s.projects
          rows.forEach((r) => (list = upsert(list, r)))
          return { projects: list }
        })
        get().log('import', 'Project', `${rows.length} records`)
      },
      advanceStage: (projectId, to) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, stage: to, updatedAt: new Date().toISOString() } : p,
          ),
        }))
        const p = get().projects.find((x) => x.id === projectId)
        get().log('advance', 'Project', `${p?.code ?? projectId} moved to ${to}`)
      },

      upsertBuyer: (b) => {
        set((s) => ({ buyers: upsert(s.buyers, b) }))
        get().log('save', 'Buyer', `${b.code} — ${b.tradingName}`)
      },
      removeBuyers: (ids) => {
        set((s) => ({ buyers: s.buyers.filter((b) => !ids.includes(b.id)) }))
        get().log('delete', 'Buyer', `${ids.length} records`)
      },
      importBuyers: (rows) => {
        set((s) => {
          let list = s.buyers
          rows.forEach((r) => (list = upsert(list, r)))
          return { buyers: list }
        })
        get().log('import', 'Buyer', `${rows.length} records`)
      },

      upsertSupplier: (sup) => {
        set((s) => ({ suppliers: upsert(s.suppliers, sup) }))
        get().log('save', 'Supplier', `${sup.code} — ${sup.name}`)
      },
      removeSuppliers: (ids) => {
        set((s) => ({ suppliers: s.suppliers.filter((x) => !ids.includes(x.id)) }))
        get().log('delete', 'Supplier', `${ids.length} records`)
      },
      importSuppliers: (rows) => {
        set((s) => {
          let list = s.suppliers
          rows.forEach((r) => (list = upsert(list, r)))
          return { suppliers: list }
        })
        get().log('import', 'Supplier', `${rows.length} records`)
      },

      upsertItem: (i) => {
        set((s) => ({ items: upsert(s.items, i) }))
        get().log('save', 'Item', `${i.sku} — ${i.name}`)
      },
      removeItems: (ids) => {
        set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }))
        get().log('delete', 'Item', `${ids.length} records`)
      },
      importItems: (rows) => {
        set((s) => {
          let list = s.items
          rows.forEach((r) => (list = upsert(list, r)))
          return { items: list }
        })
        get().log('import', 'Item', `${rows.length} records`)
      },

      upsertWarehouse: (w) => {
        set((s) => ({ warehouses: upsert(s.warehouses, w) }))
        get().log('save', 'Warehouse', `${w.code} — ${w.name}`)
      },
      removeWarehouses: (ids) => {
        set((s) => ({ warehouses: s.warehouses.filter((w) => !ids.includes(w.id)) }))
        get().log('delete', 'Warehouse', `${ids.length} records`)
      },

      /* ---------------- budget ---------------- */

      upsertBudget: (b) => {
        set((s) => ({ budgets: upsert(s.budgets, b) }))
        get().log('save', 'Budget', `${b.code} v${b.version}`)
      },
      removeBudgets: (ids) => {
        set((s) => ({ budgets: s.budgets.filter((b) => !ids.includes(b.id)) }))
        get().log('delete', 'Budget', `${ids.length} records`)
      },
      submitBudget: (id) => {
        set((s) => ({
          budgets: s.budgets.map((b) =>
            b.id === id ? { ...b, status: 'SUBMITTED', submittedAt: new Date().toISOString() } : b,
          ),
        }))
        get().log('submit', 'Budget', get().budgets.find((b) => b.id === id)?.code ?? id)
      },
      approveBudget: (id) => {
        set((s) => ({
          budgets: s.budgets.map((b) =>
            b.id === id
              ? { ...b, status: 'APPROVED', approvedByName: actor(), approvedAt: new Date().toISOString(), rejectedReason: undefined }
              : b,
          ),
        }))
        get().log('approve', 'Budget', get().budgets.find((b) => b.id === id)?.code ?? id)
      },
      rejectBudget: (id, reason) => {
        set((s) => ({
          budgets: s.budgets.map((b) => (b.id === id ? { ...b, status: 'REJECTED', rejectedReason: reason } : b)),
        }))
        get().log('reject', 'Budget', `${get().budgets.find((b) => b.id === id)?.code ?? id} — ${reason}`)
      },

      /* ---------------- procurement ---------------- */

      upsertRequest: (r) => {
        set((s) => ({ requests: upsert(s.requests, r) }))
        get().log('save', 'Purchase request', r.code)
      },
      removeRequests: (ids) => {
        set((s) => ({ requests: s.requests.filter((r) => !ids.includes(r.id)) }))
        get().log('delete', 'Purchase request', `${ids.length} records`)
      },
      approveRequest: (id) => {
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id ? { ...r, status: 'APPROVED', approvedByName: actor(), approvedAt: new Date().toISOString() } : r,
          ),
        }))
        get().log('approve', 'Purchase request', get().requests.find((r) => r.id === id)?.code ?? id)
      },

      upsertOrder: (o) => {
        set((s) => ({ orders: upsert(s.orders, o) }))
        get().log('save', 'Purchase order', `${o.code} — ${o.supplierName}`)
      },
      removeOrders: (ids) => {
        set((s) => ({ orders: s.orders.filter((o) => !ids.includes(o.id)) }))
        get().log('delete', 'Purchase order', `${ids.length} records`)
      },
      importOrders: (rows) => {
        set((s) => {
          let list = s.orders
          rows.forEach((r) => (list = upsert(list, r)))
          return { orders: list }
        })
        get().log('import', 'Purchase order', `${rows.length} records`)
      },
      approveOrder: (id) => {
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id ? { ...o, status: 'APPROVED', approvedByName: actor(), approvedAt: new Date().toISOString() } : o,
          ),
        }))
        get().log('approve', 'Purchase order', get().orders.find((o) => o.id === id)?.code ?? id)
      },

      /**
       * A goods receipt is the only thing that moves stock in. Posting one
       * updates the order line, writes an accepted movement into the receiving
       * warehouse and a rejected movement into quarantine — all in one step, so
       * the three can never disagree.
       */
      postReceipt: (grn) => {
        set((s) => {
          const orders = s.orders.map((po) => {
            if (po.id !== grn.poId) return po
            const lines = po.lines.map((pl) => {
              const gl = grn.lines.find((x) => x.poLineId === pl.id)
              if (!gl) return pl
              return {
                ...pl,
                receivedQty: Math.round((pl.receivedQty + gl.qtyAccepted) * 1000) / 1000,
                rejectedQty: Math.round((pl.rejectedQty + gl.qtyRejected) * 1000) / 1000,
              }
            })
            const ordered = lines.reduce((a, l) => a + l.qty, 0)
            const received = lines.reduce((a, l) => a + l.receivedQty, 0)
            const status: PurchaseOrder['status'] =
              received <= 0 ? po.status : received + 0.001 < ordered ? 'PARTIALLY_RECEIVED' : 'RECEIVED'
            return { ...po, lines, status }
          })

          const newMovements: StockMovement[] = []
          grn.lines.forEach((gl) => {
            const item = s.items.find((i) => i.id === gl.itemId)
            if (gl.qtyAccepted > 0) {
              newMovements.push({
                id: uid('mov'),
                at: grn.receivedAt,
                type: 'RECEIPT',
                itemId: gl.itemId,
                warehouseId: grn.warehouseId,
                binCode: gl.binCode,
                qty: gl.qtyAccepted,
                uom: gl.uom,
                unitCost: item?.standardCost ?? 0,
                batchNo: gl.batchNo,
                refType: 'Goods receipt',
                refCode: grn.code,
                projectId: grn.projectId,
                actorName: grn.receivedByName,
              })
            }
            if (gl.qtyRejected > 0) {
              newMovements.push({
                id: uid('mov'),
                at: grn.receivedAt,
                type: 'RECEIPT',
                itemId: gl.itemId,
                warehouseId: 'wh_qrn',
                qty: gl.qtyRejected,
                uom: gl.uom,
                unitCost: item?.standardCost ?? 0,
                batchNo: gl.batchNo,
                refType: 'Goods receipt — rejected',
                refCode: grn.code,
                projectId: grn.projectId,
                actorName: grn.qcByName,
                note: `Failed inspection on arrival: ${gl.rejectReason ?? 'rejected'}.`,
              })
            }
          })

          return {
            orders,
            receipts: upsert(s.receipts, { ...grn, posted: true }),
            movements: [...newMovements, ...s.movements],
          }
        })
        get().log('post', 'Goods receipt', `${grn.code} against ${grn.poCode}`)
      },
      removeReceipts: (ids) => {
        set((s) => ({
          receipts: s.receipts.filter((g) => !ids.includes(g.id)),
          movements: s.movements.filter((m) => !ids.some((id) => m.refCode === s.receipts.find((g) => g.id === id)?.code)),
        }))
        get().log('delete', 'Goods receipt', `${ids.length} records`)
      },

      /* ---------------- inventory ---------------- */

      upsertTransfer: (t) => {
        set((s) => ({ transfers: upsert(s.transfers, t) }))
        get().log('save', 'Stock transfer', t.code)
      },
      receiveTransfer: (id) => {
        set((s) => {
          const t = s.transfers.find((x) => x.id === id)
          if (!t) return {}
          const at = new Date().toISOString()
          const moves: StockMovement[] = t.lines.map((tl) => ({
            id: uid('mov'),
            at,
            type: 'TRANSFER_IN',
            itemId: tl.itemId,
            warehouseId: t.toWarehouseId,
            qty: tl.qty,
            uom: tl.uom,
            unitCost: s.items.find((i) => i.id === tl.itemId)?.standardCost ?? 0,
            refType: 'Stock transfer',
            refCode: t.code,
            projectId: t.projectId,
            actorName: actor(),
          }))
          return {
            transfers: s.transfers.map((x) =>
              x.id === id
                ? { ...x, status: 'RECEIVED', receivedAt: at, lines: x.lines.map((l) => ({ ...l, receivedQty: l.qty })) }
                : x,
            ),
            movements: [...moves, ...s.movements],
          }
        })
        get().log('receive', 'Stock transfer', get().transfers.find((t) => t.id === id)?.code ?? id)
      },
      removeTransfers: (ids) => {
        set((s) => ({ transfers: s.transfers.filter((t) => !ids.includes(t.id)) }))
        get().log('delete', 'Stock transfer', `${ids.length} records`)
      },

      upsertCount: (c) => {
        set((s) => ({ counts: upsert(s.counts, c) }))
        get().log('save', 'Stock count', c.code)
      },
      postCount: (id) => {
        set((s) => {
          const count = s.counts.find((c) => c.id === id)
          if (!count) return {}
          const at = new Date().toISOString()
          const moves: StockMovement[] = count.lines
            .filter((l) => Math.abs(l.countedQty - l.systemQty) > 0.0001)
            .map((l) => ({
              id: uid('mov'),
              at,
              type: 'ADJUSTMENT',
              itemId: l.itemId,
              warehouseId: count.warehouseId,
              qty: Math.round((l.countedQty - l.systemQty) * 1000) / 1000,
              uom: s.items.find((i) => i.id === l.itemId)?.uom ?? 'PCS',
              unitCost: s.items.find((i) => i.id === l.itemId)?.standardCost ?? 0,
              refType: 'Stock count',
              refCode: count.code,
              actorName: actor(),
              note: l.countedQty < l.systemQty ? 'Counted short.' : 'Counted over.',
            }))
          return {
            counts: s.counts.map((c) => (c.id === id ? { ...c, status: 'POSTED', postedAt: at } : c)),
            movements: [...moves, ...s.movements],
          }
        })
        get().log('post', 'Stock count', get().counts.find((c) => c.id === id)?.code ?? id)
      },
      removeCounts: (ids) => {
        set((s) => ({ counts: s.counts.filter((c) => !ids.includes(c.id)) }))
        get().log('delete', 'Stock count', `${ids.length} records`)
      },

      addMovement: (m) => {
        set((s) => ({ movements: [m, ...s.movements] }))
        get().log('save', 'Stock movement', `${m.refType} ${m.refCode}`)
      },
      removeMovements: (ids) => {
        set((s) => ({ movements: s.movements.filter((m) => !ids.includes(m.id)) }))
        get().log('delete', 'Stock movement', `${ids.length} records`)
      },

      /* ---------------- production & export ---------------- */

      upsertWorkOrder: (w) => {
        set((s) => ({ workOrders: upsert(s.workOrders, w) }))
        get().log('save', 'Work order', w.code)
      },
      removeWorkOrders: (ids) => {
        set((s) => ({ workOrders: s.workOrders.filter((w) => !ids.includes(w.id)) }))
        get().log('delete', 'Work order', `${ids.length} records`)
      },

      upsertShipment: (sh) => {
        set((s) => ({ shipments: upsert(s.shipments, sh) }))
        get().log('save', 'Shipment', sh.code)
      },
      removeShipments: (ids) => {
        set((s) => ({ shipments: s.shipments.filter((x) => !ids.includes(x.id)) }))
        get().log('delete', 'Shipment', `${ids.length} records`)
      },

      /* ---------------- finance ---------------- */

      upsertBill: (b) => {
        set((s) => ({ bills: upsert(s.bills, b) }))
        get().log('save', 'Supplier bill', b.code)
      },
      removeBills: (ids) => {
        set((s) => ({ bills: s.bills.filter((b) => !ids.includes(b.id)) }))
        get().log('delete', 'Supplier bill', `${ids.length} records`)
      },
      approveBill: (id) => {
        set((s) => ({
          bills: s.bills.map((b) => (b.id === id ? { ...b, status: 'APPROVED', approvedByName: actor() } : b)),
        }))
        get().log('approve', 'Supplier bill', get().bills.find((b) => b.id === id)?.code ?? id)
      },

      upsertInvoice: (i) => {
        set((s) => ({ invoices: upsert(s.invoices, i) }))
        get().log('save', 'Sales invoice', i.code)
      },
      removeInvoices: (ids) => {
        set((s) => ({ invoices: s.invoices.filter((i) => !ids.includes(i.id)) }))
        get().log('delete', 'Sales invoice', `${ids.length} records`)
      },

      upsertPayment: (p) => {
        set((s) => ({ payments: upsert(s.payments, p) }))
        get().log('save', 'Payment', p.code)
      },
      removePayments: (ids) => {
        set((s) => ({ payments: s.payments.filter((p) => !ids.includes(p.id)) }))
        get().log('delete', 'Payment', `${ids.length} records`)
      },

      upsertAccount: (a) => {
        set((s) => ({ accounts: upsert(s.accounts, a) }))
        get().log('save', 'Account', `${a.code} — ${a.name}`)
      },
      removeAccounts: (ids) => {
        set((s) => ({ accounts: s.accounts.filter((a) => !ids.includes(a.id)) }))
        get().log('delete', 'Account', `${ids.length} records`)
      },

      upsertJournal: (j) => {
        set((s) => ({ journal: upsert(s.journal, j) }))
        get().log('save', 'Journal entry', j.code)
      },
      removeJournal: (ids) => {
        set((s) => ({ journal: s.journal.filter((j) => !ids.includes(j.id)) }))
        get().log('delete', 'Journal entry', `${ids.length} records`)
      },

      /* ---------------- settings ---------------- */

      updateCompany: (patch) => {
        set((s) => ({ company: { ...s.company, ...patch } }))
        get().log('save', 'Company profile', Object.keys(patch).join(', '))
      },
      updateSettings: (patch) => {
        set((s) => ({ settings: { ...s.settings, ...patch } }))
        get().log('save', 'Settings', Object.keys(patch).join(', '))
      },
      clearActivity: () => set({ activity: [] }),
      resetDemoData: () => set({ ...seedState() }),
    }),
    { name: 'kriyanusa-erp', version: 1 },
  ),
)

/* ---------------- selectors that every page wants ---------------- */

export const useItemLookup = () => {
  const items = useErp((s) => s.items)
  return (id?: string) => items.find((i) => i.id === id)
}

export const useWarehouseLookup = () => {
  const warehouses = useErp((s) => s.warehouses)
  return (id?: string) => warehouses.find((w) => w.id === id)
}
