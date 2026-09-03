import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Building, Client, CompanyProfile, InventoryItem, Position, Project, Role, Warehouse, WarehouseStock,
} from '@/data/types'
import { company as seedCompany, positions as seedPositions } from '@/data/seed-org'
import { buildings as seedBuildings, clients as seedClients } from '@/data/seed-clients'
import { projects as seedProjects } from '@/data/seed-projects'
import { items as seedItems, warehouseStock as seedStock, warehouses as seedWarehouses } from '@/data/seed-inventory'
import { roles as seedRoles } from '@/data/seed-roles'
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

      updateCompany: (patch) => {
        set((s) => ({ company: { ...s.company, ...patch } }))
        get().log('Updated', 'Company profile', Object.keys(patch).join(', '))
      },

      resetDemoData: () => set({ ...seedState() }),
    }),
    { name: 'tata-gemilang-erp', version: 2 },
  ),
)
