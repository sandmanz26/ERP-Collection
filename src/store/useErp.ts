import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Building, Client, ClientReceipt, CompanyProfile, Division, GoodsReceipt, InventoryItem, Invoice,
  MrRequest, MrSession, Position, Project, PurchaseOrder, PurchasePrice, PurchaseRequest, Role,
  StockTransfer, Supplier, SupplierPayment, Warehouse, WarehouseStock,
} from '@/data/types'
import { company as seedCompany, positions as seedPositions } from '@/data/seed-org'
import { buildings as seedBuildings, clients as seedClients } from '@/data/seed-clients'
import { projects as seedProjects } from '@/data/seed-projects'
import { items as seedItems, warehouseStock as seedStock, warehouses as seedWarehouses } from '@/data/seed-inventory'
import { roles as seedRoles } from '@/data/seed-roles'
import { divisions as seedDivisions } from '@/data/seed-divisions'
import { purchasePrices as seedPrices, suppliers as seedSuppliers } from '@/data/seed-suppliers'
import { mrRequests as seedRequests, mrSessions as seedSessions, purchaseRequests as seedPurchaseRequests } from '@/data/seed-procurement'
import { goodsReceipts as seedReceipts, payments as seedPayments, purchaseOrders as seedOrders } from '@/data/seed-purchasing'
import { stockTransfers as seedTransfers } from '@/data/seed-transfers'
import { clientReceipts as seedReceiptsIn, invoices as seedInvoices } from '@/data/seed-finance'
import {
  PPH23_RATE, PPN_RATE as PPN_ON_SALES, billableProjects, buildInvoiceLines, invoiceState,
  invoiceTotals, receiptProblem, statusAfterReceipt,
} from '@/lib/finance'
import { buildPrLines, canLockSession } from '@/lib/procurement'
import {
  PPN_RATE, buildPurchaseOrders, dispatchProblem, paymentProblem, poTotals, stockIn, stockOut,
} from '@/lib/purchasing'
import { uid } from '@/lib/utils'
import { useAuth } from './useAuth'

/**
 * The whole ERP, in the browser. Every module reads and writes here and the
 * state is persisted to localStorage, so a demo survives a reload. There is no
 * API layer: a real deployment would swap this store for server calls without
 * the pages having to change shape.
 */

/** The activity trail records who did it, so it asks the session rather than a constant. */
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

interface ErpState {
  clients: Client[]
  buildings: Building[]
  projects: Project[]
  positions: Position[]
  warehouses: Warehouse[]
  items: InventoryItem[]
  stock: WarehouseStock[]
  roles: Role[]
  divisions: Division[]
  suppliers: Supplier[]
  purchasePrices: PurchasePrice[]
  mrSessions: MrSession[]
  mrRequests: MrRequest[]
  purchaseRequests: PurchaseRequest[]
  purchaseOrders: PurchaseOrder[]
  goodsReceipts: GoodsReceipt[]
  payments: SupplierPayment[]
  stockTransfers: StockTransfer[]
  invoices: Invoice[]
  clientReceipts: ClientReceipt[]
  company: CompanyProfile
  activity: ActivityLog[]

  log: (action: string, entity: string, detail: string) => void

  upsertClient: (row: Client) => void
  removeClients: (ids: string[]) => void
  importClients: (rows: Client[]) => void

  upsertBuilding: (row: Building) => void
  removeBuildings: (ids: string[]) => void
  importBuildings: (rows: Building[]) => void

  upsertProject: (row: Project) => void
  removeProjects: (ids: string[]) => void
  importProjects: (rows: Project[]) => void
  setProjectStatus: (id: string, status: Project['status']) => void

  upsertPosition: (row: Position) => void
  removePositions: (ids: string[]) => void
  importPositions: (rows: Position[]) => void

  upsertWarehouse: (row: Warehouse) => void
  removeWarehouses: (ids: string[]) => void
  importWarehouses: (rows: Warehouse[]) => void

  upsertItem: (row: InventoryItem) => void
  removeItems: (ids: string[]) => void
  importItems: (rows: InventoryItem[]) => void

  upsertStock: (row: WarehouseStock) => void
  removeStock: (ids: string[]) => void
  importStock: (rows: WarehouseStock[]) => void

  upsertRole: (row: Role) => void
  removeRoles: (ids: string[]) => void

  upsertDivision: (row: Division) => void
  removeDivisions: (ids: string[]) => void
  importDivisions: (rows: Division[]) => void

  upsertSupplier: (row: Supplier) => void
  removeSuppliers: (ids: string[]) => void
  importSuppliers: (rows: Supplier[]) => void

  upsertMrSession: (row: MrSession) => void
  setSessionStatus: (id: string, status: MrSession['status']) => void
  /** One way: builds the purchase request and freezes the session. Returns its id, or an error. */
  lockMrSession: (id: string) => { ok: boolean; purchaseRequestId?: string; error?: string }

  upsertMrRequest: (row: MrRequest) => void
  removeMrRequests: (ids: string[]) => void
  submitMrRequest: (id: string) => void
  reviewMrRequest: (id: string, outcome: 'APPROVED' | 'RETURNED', reason?: string) => void

  upsertPurchaseRequest: (row: PurchaseRequest) => void
  assignPrSupplier: (prId: string, lineId: string, supplierId: string | undefined) => void
  setPrAgreedPrice: (prId: string, lineId: string, price: number | undefined) => void
  setPrStatus: (prId: string, status: PurchaseRequest['status']) => void

  /** One order per supplier on an approved request. Returns the codes it created. */
  issuePurchaseOrders: (prId: string, warehouseId: string) => { ok: boolean; codes?: string[]; error?: string }
  upsertPurchaseOrder: (row: PurchaseOrder) => void
  closePurchaseOrder: (id: string, outcome: 'CLOSED' | 'CANCELLED', reason: string) => void

  /** Posts stock into the warehouse and records what was paid for each item. */
  recordGoodsReceipt: (row: GoodsReceipt) => { ok: boolean; error?: string }

  recordPayment: (row: SupplierPayment) => { ok: boolean; error?: string }

  upsertTransfer: (row: StockTransfer) => void
  removeTransfers: (ids: string[]) => void
  /** Stock leaves the source warehouse at this moment. */
  dispatchTransfer: (id: string) => { ok: boolean; error?: string }
  /** Stock arrives at the destination; anything short of what was sent is a variance. */
  receiveTransfer: (id: string, received: Record<string, number>, binLocation: string, reason?: string) => { ok: boolean; error?: string }
  cancelTransfer: (id: string, reason: string) => { ok: boolean; error?: string }

  upsertPurchasePrice: (row: PurchasePrice) => void
  removePurchasePrices: (ids: string[]) => void

  /** Raises one draft invoice per contract that was running in the period. */
  generateInvoices: (month: number, year: number) => { ok: boolean; codes?: string[]; error?: string }
  upsertInvoice: (row: Invoice) => void
  /** Sends it to the client, which starts the payment clock and freezes the lines. */
  issueInvoice: (id: string, issuedAt?: string) => { ok: boolean; error?: string }
  voidInvoice: (id: string, reason: string) => { ok: boolean; error?: string }
  removeInvoices: (ids: string[]) => void
  recordClientReceipt: (row: ClientReceipt) => { ok: boolean; error?: string }

  updateCompany: (patch: Partial<CompanyProfile>) => void
  resetDemoData: () => void
}

const seedState = () => ({
  clients: structuredClone(seedClients),
  buildings: structuredClone(seedBuildings),
  projects: structuredClone(seedProjects),
  positions: structuredClone(seedPositions),
  warehouses: structuredClone(seedWarehouses),
  items: structuredClone(seedItems),
  stock: structuredClone(seedStock),
  roles: structuredClone(seedRoles),
  divisions: structuredClone(seedDivisions),
  suppliers: structuredClone(seedSuppliers),
  purchasePrices: structuredClone(seedPrices),
  mrSessions: structuredClone(seedSessions),
  mrRequests: structuredClone(seedRequests),
  purchaseRequests: structuredClone(seedPurchaseRequests),
  purchaseOrders: structuredClone(seedOrders),
  goodsReceipts: structuredClone(seedReceipts),
  payments: structuredClone(seedPayments),
  stockTransfers: structuredClone(seedTransfers),
  invoices: structuredClone(seedInvoices),
  clientReceipts: structuredClone(seedReceiptsIn),
  company: structuredClone(seedCompany),
  activity: [] as ActivityLog[],
})

/** Replace by id, or prepend when the id is new. */
function upsert<T extends { id: string }>(rows: T[], row: T) {
  return rows.some((r) => r.id === row.id) ? rows.map((r) => (r.id === row.id ? row : r)) : [row, ...rows]
}

/** Merge an imported batch: known ids are updated in place, new ones are appended. */
function merge<T extends { id: string }>(rows: T[], incoming: T[]) {
  const next = [...rows]
  incoming.forEach((row) => {
    const at = next.findIndex((r) => r.id === row.id)
    if (at >= 0) next[at] = row
    else next.push(row)
  })
  return next
}

export const useErp = create<ErpState>()(
  persist(
    (set, get) => ({
      ...seedState(),

      log: (action, entity, detail) =>
        set((s) => ({
          activity: [
            { id: `act_${Math.random().toString(36).slice(2, 9)}`, at: new Date().toISOString(), action, entity, detail, actor: actor() },
            ...s.activity,
          ].slice(0, 300),
        })),

      /* ---------------- clients ---------------- */
      upsertClient: (row) => {
        const exists = get().clients.some((c) => c.id === row.id)
        set((s) => ({ clients: upsert(s.clients, { ...row, updatedAt: new Date().toISOString() }) }))
        get().log(exists ? 'Updated' : 'Created', 'Client', `${row.code} — ${row.legalName}`)
      },
      removeClients: (ids) => {
        const names = get().clients.filter((c) => ids.includes(c.id)).map((c) => c.code)
        set((s) => ({ clients: s.clients.filter((c) => !ids.includes(c.id)) }))
        get().log('Deleted', 'Client', names.join(', '))
      },
      importClients: (rows) => {
        set((s) => ({ clients: merge(s.clients, rows) }))
        get().log('Imported', 'Client', `${rows.length} rows`)
      },

      /* ---------------- buildings ---------------- */
      upsertBuilding: (row) => {
        const exists = get().buildings.some((b) => b.id === row.id)
        set((s) => ({ buildings: upsert(s.buildings, row) }))
        get().log(exists ? 'Updated' : 'Created', 'Building', `${row.code} — ${row.name}`)
      },
      removeBuildings: (ids) => {
        const names = get().buildings.filter((b) => ids.includes(b.id)).map((b) => b.code)
        set((s) => ({ buildings: s.buildings.filter((b) => !ids.includes(b.id)) }))
        get().log('Deleted', 'Building', names.join(', '))
      },
      importBuildings: (rows) => {
        set((s) => ({ buildings: merge(s.buildings, rows) }))
        get().log('Imported', 'Building', `${rows.length} rows`)
      },

      /* ---------------- projects ---------------- */
      upsertProject: (row) => {
        const exists = get().projects.some((p) => p.id === row.id)
        set((s) => ({ projects: upsert(s.projects, { ...row, updatedAt: new Date().toISOString() }) }))
        get().log(exists ? 'Updated' : 'Created', 'Project', `${row.code} — ${row.name}`)
      },
      removeProjects: (ids) => {
        const names = get().projects.filter((p) => ids.includes(p.id)).map((p) => p.code)
        set((s) => ({ projects: s.projects.filter((p) => !ids.includes(p.id)) }))
        get().log('Deleted', 'Project', names.join(', '))
      },
      importProjects: (rows) => {
        set((s) => ({ projects: merge(s.projects, rows) }))
        get().log('Imported', 'Project', `${rows.length} rows`)
      },
      setProjectStatus: (id, status) => {
        const project = get().projects.find((p) => p.id === id)
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p)),
        }))
        if (project) get().log('Status changed', 'Project', `${project.code} → ${status.replace(/_/g, ' ').toLowerCase()}`)
      },

      /* ---------------- positions ---------------- */
      upsertPosition: (row) => {
        const exists = get().positions.some((p) => p.id === row.id)
        set((s) => ({ positions: upsert(s.positions, row) }))
        get().log(exists ? 'Updated' : 'Created', 'Position', `${row.code} — ${row.name}`)
      },
      removePositions: (ids) => {
        const names = get().positions.filter((p) => ids.includes(p.id)).map((p) => p.code)
        set((s) => ({ positions: s.positions.filter((p) => !ids.includes(p.id)) }))
        get().log('Deleted', 'Position', names.join(', '))
      },
      importPositions: (rows) => {
        set((s) => ({ positions: merge(s.positions, rows) }))
        get().log('Imported', 'Position', `${rows.length} rows`)
      },

      /* ---------------- warehouses ---------------- */
      upsertWarehouse: (row) => {
        const exists = get().warehouses.some((w) => w.id === row.id)
        set((s) => ({ warehouses: upsert(s.warehouses, row) }))
        get().log(exists ? 'Updated' : 'Created', 'Warehouse', `${row.code} — ${row.name}`)
      },
      removeWarehouses: (ids) => {
        const names = get().warehouses.filter((w) => ids.includes(w.id)).map((w) => w.code)
        set((s) => ({
          warehouses: s.warehouses.filter((w) => !ids.includes(w.id)),
          /* A warehouse cannot leave its stock behind. */
          stock: s.stock.filter((row) => !ids.includes(row.warehouseId)),
        }))
        get().log('Deleted', 'Warehouse', names.join(', '))
      },
      importWarehouses: (rows) => {
        set((s) => ({ warehouses: merge(s.warehouses, rows) }))
        get().log('Imported', 'Warehouse', `${rows.length} rows`)
      },

      /* ---------------- item master ---------------- */
      upsertItem: (row) => {
        const exists = get().items.some((i) => i.id === row.id)
        set((s) => ({
          items: upsert(s.items, { ...row, updatedAt: new Date().toISOString(), updatedBy: actor() }),
        }))
        get().log(exists ? 'Updated' : 'Created', 'Item master', `${row.sku} — ${row.name}`)
      },
      removeItems: (ids) => {
        const names = get().items.filter((i) => ids.includes(i.id)).map((i) => i.sku)
        set((s) => ({
          items: s.items.filter((i) => !ids.includes(i.id)),
          /* Stock rows point at exactly one master record; without it they mean nothing. */
          stock: s.stock.filter((row) => !ids.includes(row.itemId)),
        }))
        get().log('Deleted', 'Item master', names.join(', '))
      },
      importItems: (rows) => {
        set((s) => ({ items: merge(s.items, rows) }))
        get().log('Imported', 'Item master', `${rows.length} rows`)
      },

      /* ---------------- warehouse inventory ---------------- */
      upsertStock: (row) => {
        const exists = get().stock.some((s) => s.id === row.id)
        set((s) => ({ stock: upsert(s.stock, { ...row, lastMovementAt: new Date().toISOString() }) }))
        const item = get().items.find((i) => i.id === row.itemId)
        const wh = get().warehouses.find((w) => w.id === row.warehouseId)
        get().log(exists ? 'Updated' : 'Created', 'Warehouse stock', `${item?.sku ?? row.itemId} @ ${wh?.code ?? row.warehouseId} · ${row.qtyOnHand}`)
      },
      removeStock: (ids) => {
        set((s) => ({ stock: s.stock.filter((row) => !ids.includes(row.id)) }))
        get().log('Deleted', 'Warehouse stock', `${ids.length} rows`)
      },
      importStock: (rows) => {
        set((s) => ({ stock: merge(s.stock, rows) }))
        get().log('Imported', 'Warehouse stock', `${rows.length} rows`)
      },

      /* ---------------- roles ---------------- */
      upsertRole: (row) => {
        const before = get().roles.find((r) => r.id === row.id)
        set((s) => ({
          roles: upsert(s.roles, { ...row, updatedAt: new Date().toISOString(), updatedBy: actor() }),
        }))
        if (!before) {
          get().log('Created', 'Role', `${row.code} — ${row.permissions.length} privileges`)
        } else {
          /* A privilege change is the thing an auditor comes looking for, so it is
             logged as what changed rather than as "role updated". */
          const added = row.permissions.filter((k) => !before.permissions.includes(k))
          const removed = before.permissions.filter((k) => !row.permissions.includes(k))
          const parts = [
            added.length ? `+${added.length} (${added.slice(0, 3).join(', ')}${added.length > 3 ? '…' : ''})` : '',
            removed.length ? `−${removed.length} (${removed.slice(0, 3).join(', ')}${removed.length > 3 ? '…' : ''})` : '',
          ].filter(Boolean)
          get().log('Updated', 'Role', `${row.code}${parts.length ? ` · ${parts.join(' ')}` : ' · details only'}`)
        }
      },
      removeRoles: (ids) => {
        const names = get().roles.filter((r) => ids.includes(r.id)).map((r) => r.code)
        set((s) => ({ roles: s.roles.filter((r) => !ids.includes(r.id)) }))
        get().log('Deleted', 'Role', names.join(', '))
      },

      /* ---------------- divisions ---------------- */
      upsertDivision: (row) => {
        const exists = get().divisions.some((d) => d.id === row.id)
        set((s) => ({ divisions: upsert(s.divisions, row) }))
        get().log(exists ? 'Updated' : 'Created', 'Division', `${row.code} — ${row.name}`)
      },
      removeDivisions: (ids) => {
        const names = get().divisions.filter((d) => ids.includes(d.id)).map((d) => d.code)
        set((s) => ({ divisions: s.divisions.filter((d) => !ids.includes(d.id)) }))
        get().log('Deleted', 'Division', names.join(', '))
      },
      importDivisions: (rows) => {
        set((s) => ({ divisions: merge(s.divisions, rows) }))
        get().log('Imported', 'Division', `${rows.length} rows`)
      },

      /* ---------------- suppliers ---------------- */
      upsertSupplier: (row) => {
        const exists = get().suppliers.some((x) => x.id === row.id)
        set((s) => ({ suppliers: upsert(s.suppliers, row) }))
        get().log(exists ? 'Updated' : 'Created', 'Supplier', `${row.code} — ${row.legalName}`)
      },
      removeSuppliers: (ids) => {
        const names = get().suppliers.filter((x) => ids.includes(x.id)).map((x) => x.code)
        set((s) => ({
          suppliers: s.suppliers.filter((x) => !ids.includes(x.id)),
          /* A price with no supplier is not evidence of anything. */
          purchasePrices: s.purchasePrices.filter((p) => !ids.includes(p.supplierId)),
          purchaseRequests: s.purchaseRequests.map((pr) => ({
            ...pr,
            lines: pr.lines.map((l) => (l.supplierId && ids.includes(l.supplierId) ? { ...l, supplierId: undefined } : l)),
          })),
        }))
        get().log('Deleted', 'Supplier', names.join(', '))
      },
      importSuppliers: (rows) => {
        set((s) => ({ suppliers: merge(s.suppliers, rows) }))
        get().log('Imported', 'Supplier', `${rows.length} rows`)
      },

      /* ---------------- material request sessions ---------------- */
      upsertMrSession: (row) => {
        const exists = get().mrSessions.some((x) => x.id === row.id)
        set((s) => ({ mrSessions: upsert(s.mrSessions, row) }))
        get().log(exists ? 'Updated' : 'Created', 'MR session', `${row.code} — ${row.title}`)
      },
      setSessionStatus: (id, status) => {
        const session = get().mrSessions.find((x) => x.id === id)
        set((s) => ({ mrSessions: s.mrSessions.map((x) => (x.id === id ? { ...x, status } : x)) }))
        if (session) get().log('Status changed', 'MR session', `${session.code} → ${status.toLowerCase()}`)
      },

      /**
       * Lock: the one irreversible step in the flow. Every submitted division
       * request is merged into one line per item, a purchase request is created
       * in draft, and the session is frozen so the source can still be audited.
       */
      lockMrSession: (id) => {
        const state = get()
        const session = state.mrSessions.find((x) => x.id === id)
        if (!session) return { ok: false, error: 'That session no longer exists.' }

        const check = canLockSession(session, state.mrRequests)
        if (!check.ok) return { ok: false, error: check.reason }

        const sessionRows = state.mrRequests.filter((r) => r.sessionId === id)
        const lines = buildPrLines(sessionRows, state.items)
        const period = `${session.periodYear}-${String(session.periodMonth).padStart(2, '0')}`
        const sequence = state.purchaseRequests.filter((p) => p.code.startsWith(`PR-${period}`)).length + 1
        const prId = `pr_${period.replace('-', '_')}_${sequence}`
        const now = new Date().toISOString()

        const pr: PurchaseRequest = {
          id: prId,
          code: `PR-${period}-${String(sequence).padStart(3, '0')}`,
          sessionId: id,
          status: 'DRAFT',
          lines: lines.map((l) => ({ ...l, id: `${prId}_${l.itemId}` })),
          createdBy: actor(),
          createdAt: now,
          updatedAt: now,
        }

        set((s) => ({
          purchaseRequests: [pr, ...s.purchaseRequests],
          mrSessions: s.mrSessions.map((x) =>
            x.id === id ? { ...x, status: 'LOCKED', lockedAt: now, lockedBy: actor(), purchaseRequestId: prId } : x,
          ),
          /* Submitted requests become approved at the lock: they are now part of a
             purchase request and can no longer be edited by their division. */
          mrRequests: s.mrRequests.map((r) =>
            r.sessionId === id && r.status === 'SUBMITTED'
              ? { ...r, status: 'APPROVED', reviewedBy: actor(), reviewedAt: now, updatedAt: now }
              : r,
          ),
        }))
        get().log(
          'Locked',
          'MR session',
          `${session.code} → ${pr.code} · ${lines.length} merged lines from ${sessionRows.filter((r) => r.status !== 'DRAFT' && r.status !== 'RETURNED').length} divisions`,
        )
        return { ok: true, purchaseRequestId: prId }
      },

      /* ---------------- division requests ---------------- */
      upsertMrRequest: (row) => {
        const exists = get().mrRequests.some((x) => x.id === row.id)
        set((s) => ({ mrRequests: upsert(s.mrRequests, { ...row, updatedAt: new Date().toISOString() }) }))
        get().log(exists ? 'Updated' : 'Created', 'MR request', `${row.code} · ${row.lines.length} lines`)
      },
      removeMrRequests: (ids) => {
        const codes = get().mrRequests.filter((x) => ids.includes(x.id)).map((x) => x.code)
        set((s) => ({ mrRequests: s.mrRequests.filter((x) => !ids.includes(x.id)) }))
        get().log('Deleted', 'MR request', codes.join(', '))
      },
      submitMrRequest: (id) => {
        const request = get().mrRequests.find((x) => x.id === id)
        const now = new Date().toISOString()
        set((s) => ({
          mrRequests: s.mrRequests.map((x) =>
            x.id === id ? { ...x, status: 'SUBMITTED', submittedBy: actor(), submittedAt: now, updatedAt: now, returnReason: undefined } : x,
          ),
        }))
        if (request) get().log('Submitted', 'MR request', `${request.code} · ${request.lines.length} lines`)
      },
      reviewMrRequest: (id, outcome, reason) => {
        const request = get().mrRequests.find((x) => x.id === id)
        const now = new Date().toISOString()
        set((s) => ({
          mrRequests: s.mrRequests.map((x) =>
            x.id === id
              ? { ...x, status: outcome, reviewedBy: actor(), reviewedAt: now, updatedAt: now, returnReason: outcome === 'RETURNED' ? reason : undefined }
              : x,
          ),
        }))
        if (request) get().log(outcome === 'APPROVED' ? 'Approved' : 'Returned', 'MR request', `${request.code}${reason ? ` · ${reason.slice(0, 60)}` : ''}`)
      },

      /* ---------------- purchase requests ---------------- */
      upsertPurchaseRequest: (row) => {
        const exists = get().purchaseRequests.some((x) => x.id === row.id)
        set((s) => ({ purchaseRequests: upsert(s.purchaseRequests, { ...row, updatedAt: new Date().toISOString() }) }))
        get().log(exists ? 'Updated' : 'Created', 'Purchase request', `${row.code} · ${row.lines.length} lines`)
      },
      assignPrSupplier: (prId, lineId, supplierId) => {
        const supplier = get().suppliers.find((x) => x.id === supplierId)
        const pr = get().purchaseRequests.find((x) => x.id === prId)
        const item = get().items.find((i) => i.id === pr?.lines.find((l) => l.id === lineId)?.itemId)
        set((s) => ({
          purchaseRequests: s.purchaseRequests.map((x) => {
            if (x.id !== prId) return x
            /* Changing supplier drops the agreed price: it belonged to the old one. */
            const lines = x.lines.map((l) => (l.id === lineId ? { ...l, supplierId, agreedUnitPrice: undefined } : l))
            /* Draft and assigned are derived, not chosen: a request is assigned
               once every line has a supplier, and falls back the moment one loses it. */
            const complete = lines.every((l) => l.supplierId)
            const status =
              x.status === 'DRAFT' && complete ? 'ASSIGNED' : x.status === 'ASSIGNED' && !complete ? 'DRAFT' : x.status
            return { ...x, status, lines, updatedAt: new Date().toISOString() }
          }),
        }))
        if (pr) get().log('Assigned supplier', 'Purchase request', `${pr.code} · ${item?.sku ?? lineId} → ${supplier?.legalName ?? 'unassigned'}`)
      },
      setPrAgreedPrice: (prId, lineId, price) => {
        set((s) => ({
          purchaseRequests: s.purchaseRequests.map((x) =>
            x.id === prId
              ? { ...x, updatedAt: new Date().toISOString(), lines: x.lines.map((l) => (l.id === lineId ? { ...l, agreedUnitPrice: price } : l)) }
              : x,
          ),
        }))
      },
      setPrStatus: (prId, status) => {
        const pr = get().purchaseRequests.find((x) => x.id === prId)
        const now = new Date().toISOString()
        set((s) => ({
          purchaseRequests: s.purchaseRequests.map((x) =>
            x.id === prId
              ? {
                  ...x,
                  status,
                  updatedAt: now,
                  approvedBy: status === 'APPROVED' ? actor() : x.approvedBy,
                  approvedAt: status === 'APPROVED' ? now : x.approvedAt,
                }
              : x,
          ),
        }))
        if (pr) get().log('Status changed', 'Purchase request', `${pr.code} → ${status.toLowerCase()}`)
      },

      /* ---------------- purchase orders ---------------- */
      /**
       * The split. An approved request names several suppliers at once, which
       * nobody outside the company can act on; one order per supplier is what
       * can actually be sent, delivered against and paid.
       */
      issuePurchaseOrders: (prId, warehouseId) => {
        const state = get()
        const pr = state.purchaseRequests.find((p) => p.id === prId)
        if (!pr) return { ok: false, error: 'That purchase request no longer exists.' }
        if (pr.status !== 'APPROVED') return { ok: false, error: 'Approve the purchase request before issuing orders from it.' }
        if (state.purchaseOrders.some((po) => po.purchaseRequestId === prId)) {
          return { ok: false, error: 'Orders have already been issued from this request.' }
        }
        const unassigned = pr.lines.filter((l) => !l.supplierId).length
        if (unassigned > 0) return { ok: false, error: `${unassigned} lines still have no supplier.` }

        const year = new Date().getFullYear()
        const startNumber =
          state.purchaseOrders.filter((po) => po.code.startsWith(`PO-${year}`)).length + 1
        const orders = buildPurchaseOrders(pr, state.suppliers, state.items, state.purchasePrices, {
          warehouseId,
          orderedAt: new Date().toISOString(),
          createdBy: actor(),
          startNumber,
          taxRate: PPN_RATE,
        })

        set((s) => ({
          purchaseOrders: [...orders, ...s.purchaseOrders],
          purchaseRequests: s.purchaseRequests.map((x) =>
            x.id === prId ? { ...x, status: 'ORDERED', updatedAt: new Date().toISOString() } : x,
          ),
        }))
        get().log(
          'Issued orders',
          'Purchase request',
          `${pr.code} → ${orders.length} orders (${orders.map((o) => o.code).join(', ')})`,
        )
        return { ok: true, codes: orders.map((o) => o.code) }
      },
      upsertPurchaseOrder: (row) => {
        const exists = get().purchaseOrders.some((x) => x.id === row.id)
        set((s) => ({ purchaseOrders: upsert(s.purchaseOrders, { ...row, updatedAt: new Date().toISOString() }) }))
        get().log(exists ? 'Updated' : 'Created', 'Purchase order', `${row.code} · ${row.lines.length} lines`)
      },
      closePurchaseOrder: (id, outcome, reason) => {
        const po = get().purchaseOrders.find((x) => x.id === id)
        const now = new Date().toISOString()
        set((s) => ({
          purchaseOrders: s.purchaseOrders.map((x) =>
            x.id === id ? { ...x, status: outcome, closedAt: now, closeReason: reason, updatedAt: now } : x,
          ),
        }))
        if (po) get().log(outcome === 'CLOSED' ? 'Closed short' : 'Cancelled', 'Purchase order', `${po.code} · ${reason}`)
      },

      /* ---------------- goods receipt ---------------- */
      /**
       * A delivery is the only event that does three things at once: it adds to
       * the order's received total, moves the goods into a warehouse, and turns
       * an agreed price into a price that was actually paid.
       */
      recordGoodsReceipt: (row) => {
        const state = get()
        const po = state.purchaseOrders.find((x) => x.id === row.purchaseOrderId)
        if (!po) return { ok: false, error: 'That purchase order no longer exists.' }
        if (po.status !== 'ISSUED' && po.status !== 'PARTIALLY_RECEIVED') {
          return { ok: false, error: 'This order is not open for delivery.' }
        }
        const posted = row.lines.filter((l) => l.qtyReceived > 0 || l.qtyRejected > 0)
        if (posted.length === 0) return { ok: false, error: 'Record at least one quantity received or rejected.' }

        for (const line of posted) {
          const poLine = po.lines.find((l) => l.id === line.poLineId)
          if (!poLine) return { ok: false, error: 'A line on this delivery is not on the order.' }
          const outstanding = poLine.qty - poLine.qtyReceived
          if (line.qtyReceived > outstanding) {
            const item = state.items.find((i) => i.id === line.itemId)
            return { ok: false, error: `${item?.sku ?? 'A line'} has only ${outstanding} outstanding — ${line.qtyReceived} were entered.` }
          }
        }

        /* Stock first: everything else is bookkeeping about goods that are now here. */
        let stock = state.stock
        posted
          .filter((l) => l.qtyReceived > 0)
          .forEach((line) => {
            stock = stockIn(
              stock,
              {
                warehouseId: row.warehouseId,
                itemId: line.itemId,
                qty: line.qtyReceived,
                unitCost: line.unitCost,
                binLocation: line.binLocation,
                batchNo: line.batchNo,
                expiryDate: line.expiryDate,
                at: row.receivedAt,
              },
              () => uid('stk'),
            )
          })

        /* What was paid, per item — this is what the next request reads as the last price. */
        const prices: PurchasePrice[] = posted
          .filter((l) => l.qtyReceived > 0)
          .map((line) => ({
            id: uid('pp'),
            supplierId: row.supplierId,
            itemId: line.itemId,
            unitPrice: line.unitCost,
            qty: line.qtyReceived,
            poNumber: po.code,
            purchasedAt: row.receivedAt,
            note: `Diterima pada ${row.code}`,
          }))

        const lines = po.lines.map((l) => {
          const received = posted.find((x) => x.poLineId === l.id)?.qtyReceived ?? 0
          return received > 0 ? { ...l, qtyReceived: l.qtyReceived + received } : l
        })
        const complete = lines.every((l) => l.qtyReceived >= l.qty)

        set((s) => ({
          stock,
          purchasePrices: [...prices, ...s.purchasePrices],
          goodsReceipts: [{ ...row, lines: posted }, ...s.goodsReceipts],
          purchaseOrders: s.purchaseOrders.map((x) =>
            x.id === po.id
              ? { ...x, lines, status: complete ? 'RECEIVED' : 'PARTIALLY_RECEIVED', updatedAt: row.receivedAt }
              : x,
          ),
        }))
        const units = posted.reduce((a, l) => a + l.qtyReceived, 0)
        const rejected = posted.reduce((a, l) => a + l.qtyRejected, 0)
        get().log(
          'Received',
          'Goods receipt',
          `${row.code} · ${po.code} · ${units} units in${rejected ? `, ${rejected} rejected` : ''}`,
        )
        return { ok: true }
      },

      /* ---------------- payments ---------------- */
      recordPayment: (row) => {
        const state = get()
        const po = state.purchaseOrders.find((x) => x.id === row.purchaseOrderId)
        if (!po) return { ok: false, error: 'That purchase order no longer exists.' }
        const problem = paymentProblem(po, row.amount, state.payments, state.goodsReceipts)
        if (problem) return { ok: false, error: problem }

        set((s) => ({ payments: [row, ...s.payments] }))
        const { total } = poTotals(po)
        const paid = state.payments.filter((p) => p.purchaseOrderId === po.id).reduce((a, p) => a + p.amount, 0) + row.amount
        get().log(
          'Paid',
          'Purchase order',
          `${po.code} · ${row.code} · ${Math.round(row.amount).toLocaleString('en-US')} of ${Math.round(total).toLocaleString('en-US')}${paid >= total ? ' — settled' : ' — part payment'}`,
        )
        return { ok: true }
      },

      /* ---------------- stock transfers ---------------- */
      upsertTransfer: (row) => {
        const exists = get().stockTransfers.some((x) => x.id === row.id)
        set((s) => ({ stockTransfers: upsert(s.stockTransfers, { ...row, updatedAt: new Date().toISOString() }) }))
        get().log(exists ? 'Updated' : 'Created', 'Stock transfer', `${row.code} · ${row.lines.length} lines`)
      },
      removeTransfers: (ids) => {
        const rows = get().stockTransfers.filter((x) => ids.includes(x.id))
        if (rows.some((r) => r.status === 'IN_TRANSIT')) {
          /* Deleting one in transit would strand the stock: it has left the source
             warehouse and would never arrive anywhere. */
          return
        }
        set((s) => ({ stockTransfers: s.stockTransfers.filter((x) => !ids.includes(x.id)) }))
        get().log('Deleted', 'Stock transfer', rows.map((r) => r.code).join(', '))
      },
      dispatchTransfer: (id) => {
        const state = get()
        const transfer = state.stockTransfers.find((x) => x.id === id)
        if (!transfer) return { ok: false, error: 'That transfer no longer exists.' }
        const problem = dispatchProblem(transfer, state.stock)
        if (problem) return { ok: false, error: problem }

        const now = new Date().toISOString()
        let stock = state.stock
        for (const line of transfer.lines) {
          const result = stockOut(stock, { stockId: line.stockId, qty: line.qty, at: now })
          if (result.error) return { ok: false, error: result.error }
          stock = result.stock
        }

        set((s) => ({
          stock,
          stockTransfers: s.stockTransfers.map((x) =>
            x.id === id ? { ...x, status: 'IN_TRANSIT', dispatchedAt: now, dispatchedBy: actor(), updatedAt: now } : x,
          ),
        }))
        get().log('Dispatched', 'Stock transfer', `${transfer.code} · ${transfer.lines.reduce((a, l) => a + l.qty, 0)} units left the source warehouse`)
        return { ok: true }
      },
      receiveTransfer: (id, received, binLocation, reason) => {
        const state = get()
        const transfer = state.stockTransfers.find((x) => x.id === id)
        if (!transfer) return { ok: false, error: 'That transfer no longer exists.' }
        if (transfer.status !== 'IN_TRANSIT') return { ok: false, error: 'Only a transfer in transit can be received.' }

        const now = new Date().toISOString()
        let stock = state.stock
        const lines = transfer.lines.map((line) => {
          const qty = received[line.id] ?? line.qty
          if (qty > line.qty) return line
          if (qty > 0) {
            stock = stockIn(
              stock,
              {
                warehouseId: transfer.toWarehouseId,
                itemId: line.itemId,
                qty,
                unitCost: line.unitCost,
                binLocation,
                batchNo: line.batchNo,
                expiryDate: line.expiryDate,
                at: now,
              },
              () => uid('stk'),
            )
          }
          return { ...line, qtyReceived: qty, varianceReason: qty < line.qty ? reason : undefined }
        })

        const short = lines.reduce((a, l) => a + (l.qty - (l.qtyReceived ?? l.qty)), 0)
        if (short > 0 && !reason?.trim()) {
          return { ok: false, error: `${short} units are missing against what was sent — say what happened to them before receiving.` }
        }

        set((s) => ({
          stock,
          stockTransfers: s.stockTransfers.map((x) =>
            x.id === id
              ? { ...x, status: 'RECEIVED', lines, receivedAt: now, receivedBy: actor(), toBinLocation: binLocation, updatedAt: now }
              : x,
          ),
        }))
        get().log(
          'Received',
          'Stock transfer',
          `${transfer.code} · ${lines.reduce((a, l) => a + (l.qtyReceived ?? 0), 0)} units arrived${short ? `, ${short} short` : ''}`,
        )
        return { ok: true }
      },
      cancelTransfer: (id, reason) => {
        const state = get()
        const transfer = state.stockTransfers.find((x) => x.id === id)
        if (!transfer) return { ok: false, error: 'That transfer no longer exists.' }
        if (transfer.status === 'RECEIVED') return { ok: false, error: 'It has already arrived — raise a transfer back instead.' }

        const now = new Date().toISOString()
        let stock = state.stock
        /* Goods already dispatched have to go back on the shelf they left. */
        if (transfer.status === 'IN_TRANSIT') {
          transfer.lines.forEach((line) => {
            const source = state.stock.find((s) => s.id === line.stockId)
            stock = stockIn(
              stock,
              {
                warehouseId: transfer.fromWarehouseId,
                itemId: line.itemId,
                qty: line.qty,
                unitCost: line.unitCost,
                binLocation: source?.binLocation ?? 'RAK-RETUR',
                batchNo: line.batchNo,
                expiryDate: line.expiryDate,
                at: now,
              },
              () => uid('stk'),
            )
          })
        }

        set((s) => ({
          stock,
          stockTransfers: s.stockTransfers.map((x) =>
            x.id === id ? { ...x, status: 'CANCELLED', note: reason, updatedAt: now } : x,
          ),
        }))
        get().log('Cancelled', 'Stock transfer', `${transfer.code} · ${reason}`)
        return { ok: true }
      },

      /* ---------------- purchase prices ---------------- */
      upsertPurchasePrice: (row) => {
        const exists = get().purchasePrices.some((x) => x.id === row.id)
        const item = get().items.find((i) => i.id === row.itemId)
        const supplier = get().suppliers.find((s) => s.id === row.supplierId)
        set((s) => ({ purchasePrices: upsert(s.purchasePrices, row) }))
        get().log(
          exists ? 'Updated price' : 'Recorded price',
          'Purchase price',
          `${item?.sku ?? row.itemId} · ${supplier?.legalName ?? row.supplierId} · ${Math.round(row.unitPrice).toLocaleString('en-US')}`,
        )
      },
      removePurchasePrices: (ids) => {
        const rows = get().purchasePrices.filter((x) => ids.includes(x.id))
        set((s) => ({ purchasePrices: s.purchasePrices.filter((x) => !ids.includes(x.id)) }))
        get().log('Deleted', 'Purchase price', rows.map((r) => r.poNumber).join(', '))
      },

      /* ---------------- invoices ---------------- */
      /**
       * One draft per contract that was running in the period and has not been
       * billed for it yet. Drafts rather than issued bills: the coordinator's
       * headcount has to be confirmed before anything goes to a client.
       */
      generateInvoices: (month, year) => {
        const state = get()
        const due = billableProjects(state.projects, state.invoices, month, year)
        if (due.length === 0) {
          return { ok: false, error: 'Every contract that ran in that month has already been billed.' }
        }

        const now = new Date().toISOString()
        const period = `${year}-${String(month).padStart(2, '0')}`
        let sequence = state.invoices.filter((i) => i.code.startsWith(`INV-${period}`)).length

        const created: Invoice[] = due
          .map((project): Invoice | null => {
            const client = state.clients.find((c) => c.id === project.clientId)
            if (!client) return null
            const lines = buildInvoiceLines(project, state.positions)
            if (lines.length === 0) return null
            sequence += 1
            return {
              id: uid('inv'),
              code: `INV-${period}-${String(sequence).padStart(4, '0')}`,
              clientId: client.id,
              projectId: project.id,
              periodMonth: month,
              periodYear: year,
              status: 'DRAFT' as const,
              lines,
              paymentTermDays: project.paymentTermDays || client.paymentTermDays,
              ppnRate: client.ppnApplicable ? PPN_ON_SALES : 0,
              pph23Rate: client.pph23Withheld ? PPH23_RATE : 0,
              createdBy: actor(),
              createdAt: now,
              updatedAt: now,
            }
          })
          .filter((i): i is Invoice => i !== null)

        if (created.length === 0) return { ok: false, error: 'None of those contracts carry a manpower line to bill.' }

        set((s) => ({ invoices: [...created, ...s.invoices] }))
        get().log('Raised', 'Invoices', `${period} · ${created.length} drafts · ${created.map((i) => i.code).join(', ').slice(0, 120)}`)
        return { ok: true, codes: created.map((i) => i.code) }
      },
      upsertInvoice: (row) => {
        const exists = get().invoices.some((x) => x.id === row.id)
        set((s) => ({ invoices: upsert(s.invoices, { ...row, updatedAt: new Date().toISOString() }) }))
        get().log(exists ? 'Updated' : 'Created', 'Invoice', `${row.code} · ${row.lines.length} lines`)
      },
      issueInvoice: (id, issuedAt) => {
        const invoice = get().invoices.find((x) => x.id === id)
        if (!invoice) return { ok: false, error: 'That invoice no longer exists.' }
        if (invoice.status !== 'DRAFT') return { ok: false, error: 'Only a draft invoice can be issued.' }
        if (invoice.lines.length === 0) return { ok: false, error: 'There is nothing on this invoice to bill.' }
        if (invoiceTotals(invoice).due <= 0) {
          return { ok: false, error: 'This invoice comes to nothing once the deductions are applied — nothing to send.' }
        }

        const at = issuedAt ?? new Date().toISOString()
        const dueDate = new Date(at)
        dueDate.setDate(dueDate.getDate() + invoice.paymentTermDays)

        set((s) => ({
          invoices: s.invoices.map((x) =>
            x.id === id
              ? { ...x, status: 'ISSUED', issuedAt: at, dueAt: dueDate.toISOString(), updatedAt: at }
              : x,
          ),
        }))
        get().log(
          'Issued',
          'Invoice',
          `${invoice.code} · ${Math.round(invoiceTotals(invoice).due).toLocaleString('en-US')} due ${dueDate.toISOString().slice(0, 10)}`,
        )
        return { ok: true }
      },
      voidInvoice: (id, reason) => {
        const state = get()
        const invoice = state.invoices.find((x) => x.id === id)
        if (!invoice) return { ok: false, error: 'That invoice no longer exists.' }
        if (state.clientReceipts.some((r) => r.invoiceId === id)) {
          /* Cancelling a bill money has already come in against would leave that
             money pointing at nothing. Refund it outside the system first. */
          return { ok: false, error: 'Money has already been received against this invoice — it cannot be cancelled.' }
        }
        const now = new Date().toISOString()
        set((s) => ({
          invoices: s.invoices.map((x) => (x.id === id ? { ...x, status: 'VOID', voidReason: reason, updatedAt: now } : x)),
        }))
        get().log('Cancelled', 'Invoice', `${invoice.code} · ${reason}`)
        return { ok: true }
      },
      removeInvoices: (ids) => {
        const state = get()
        const rows = state.invoices.filter((x) => ids.includes(x.id))
        /* Only a draft can be deleted outright: an issued bill is a claim the
           client has seen, and withdrawing one is a void with a reason. */
        const deletable = rows.filter((r) => r.status === 'DRAFT').map((r) => r.id)
        if (deletable.length === 0) return
        set((s) => ({ invoices: s.invoices.filter((x) => !deletable.includes(x.id)) }))
        get().log('Deleted', 'Invoice', rows.filter((r) => deletable.includes(r.id)).map((r) => r.code).join(', '))
      },

      /* ---------------- money in ---------------- */
      recordClientReceipt: (row) => {
        const state = get()
        const invoice = state.invoices.find((x) => x.id === row.invoiceId)
        if (!invoice) return { ok: false, error: 'That invoice no longer exists.' }
        const problem = receiptProblem(invoice, row.amount, state.clientReceipts)
        if (problem) return { ok: false, error: problem }

        const receipts = [row, ...state.clientReceipts]
        const status = statusAfterReceipt(invoice, receipts)
        set((s) => ({
          clientReceipts: receipts,
          invoices: s.invoices.map((x) => (x.id === invoice.id ? { ...x, status, updatedAt: row.receivedAt } : x)),
        }))
        const after = invoiceState({ ...invoice, status }, receipts)
        get().log(
          'Received',
          'Client payment',
          `${row.code} · ${invoice.code} · ${Math.round(row.amount).toLocaleString('en-US')}${after.outstanding <= 0 ? ' — settled' : ` — ${Math.round(after.outstanding).toLocaleString('en-US')} left`}`,
        )
        return { ok: true }
      },

      updateCompany: (patch) => {
        set((s) => ({ company: { ...s.company, ...patch } }))
        get().log('Updated', 'Company profile', Object.keys(patch).join(', '))
      },

      resetDemoData: () => set({ ...seedState() }),
    }),
    { name: 'tata-gemilang-erp', version: 5 },
  ),
)
