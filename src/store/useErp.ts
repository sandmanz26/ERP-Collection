import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Building, Client, CompanyProfile, Division, InventoryItem, MrRequest, MrSession, Position, Project,
  PurchasePrice, PurchaseRequest, Role, Supplier, Warehouse, WarehouseStock,
} from '@/data/types'
import { company as seedCompany, positions as seedPositions } from '@/data/seed-org'
import { buildings as seedBuildings, clients as seedClients } from '@/data/seed-clients'
import { projects as seedProjects } from '@/data/seed-projects'
import { items as seedItems, warehouseStock as seedStock, warehouses as seedWarehouses } from '@/data/seed-inventory'
import { roles as seedRoles } from '@/data/seed-roles'
import { divisions as seedDivisions } from '@/data/seed-divisions'
import { purchasePrices as seedPrices, suppliers as seedSuppliers } from '@/data/seed-suppliers'
import { mrRequests as seedRequests, mrSessions as seedSessions, purchaseRequests as seedPurchaseRequests } from '@/data/seed-procurement'
import { buildPrLines, canLockSession } from '@/lib/procurement'
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

      updateCompany: (patch) => {
        set((s) => ({ company: { ...s.company, ...patch } }))
        get().log('Updated', 'Company profile', Object.keys(patch).join(', '))
      },

      resetDemoData: () => set({ ...seedState() }),
    }),
    { name: 'tata-gemilang-erp', version: 3 },
  ),
)
