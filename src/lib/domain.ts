import type {
  Building, Client, InventoryItem, ManpowerRequirement, Position, Project, ServiceType,
  Warehouse, WarehouseStock,
} from '@/data/types'

/* ------------------------------------------------------------------
   Everything the modules compute rather than store.

   Two numbers drive this business and both live here: how much of the
   contracted headcount is actually standing on site, and how much of the
   stock a project will consume is actually in a warehouse.
   ------------------------------------------------------------------ */

export const DAY_MS = 86_400_000

export function daysBetween(from: string, to: string) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY_MS)
}

export function daysUntil(iso: string, from = new Date()) {
  return Math.round((new Date(iso).getTime() - from.getTime()) / DAY_MS)
}

/* ================================================================
   Projects
   ================================================================ */

/** Contract months, rounded up — a 45-day contract still bills twice. */
export function contractMonths(project: Pick<Project, 'periodStart' | 'periodEnd'>) {
  const days = daysBetween(project.periodStart, project.periodEnd)
  return Math.max(1, Math.round((days / 365.25) * 12 * 10) / 10)
}

export function requiredHeadcount(project: Pick<Project, 'requirements'>) {
  return project.requirements.reduce((a, r) => a + r.headcount, 0)
}

export function deployedHeadcount(project: Pick<Project, 'requirements'>) {
  return project.requirements.reduce((a, r) => a + Math.min(r.deployed, r.headcount), 0)
}

/** The signature number of the suite: contracted versus actually on site. */
export function fulfilment(project: Pick<Project, 'requirements'>) {
  const required = requiredHeadcount(project)
  const deployed = deployedHeadcount(project)
  const gap = Math.max(0, required - deployed)
  return { required, deployed, gap, pct: required === 0 ? 0 : Math.round((deployed / required) * 100) }
}

export type FulfilmentTone = 'success' | 'warning' | 'danger' | 'neutral'

export function fulfilmentTone(pct: number, required: number): FulfilmentTone {
  if (required === 0) return 'neutral'
  if (pct >= 100) return 'success'
  if (pct >= 90) return 'warning'
  return 'danger'
}

/** Billed to the client each month, before tax. */
export function monthlyValue(project: Pick<Project, 'requirements'>) {
  return project.requirements.reduce((a, r) => a + r.headcount * r.billRate, 0)
}

/** What the personnel on this project cost us each month. */
export function monthlyCost(project: Pick<Project, 'requirements'>) {
  return project.requirements.reduce((a, r) => a + r.headcount * r.costRate, 0)
}

export function monthlyMargin(project: Pick<Project, 'requirements'>) {
  const value = monthlyValue(project)
  const cost = monthlyCost(project)
  return { value, cost, margin: value - cost, pct: value === 0 ? 0 : ((value - cost) / value) * 100 }
}

export function contractValue(project: Pick<Project, 'requirements' | 'periodStart' | 'periodEnd'>) {
  return monthlyValue(project) * contractMonths(project)
}

export function serviceTypesOf(project: Pick<Project, 'requirements'>, positions: Position[]): ServiceType[] {
  const set = new Set<ServiceType>()
  project.requirements.forEach((r) => {
    const p = positions.find((x) => x.id === r.positionId)
    if (p) set.add(p.serviceType)
  })
  return Array.from(set)
}

export type PeriodState = 'NOT_STARTED' | 'RUNNING' | 'ENDING_SOON' | 'EXPIRED'

/** Where the contract sits against today, independent of its workflow status. */
export function periodState(project: Pick<Project, 'periodStart' | 'periodEnd'>, warnDays = 60): PeriodState {
  const toStart = daysUntil(project.periodStart)
  const toEnd = daysUntil(project.periodEnd)
  if (toStart > 0) return 'NOT_STARTED'
  if (toEnd < 0) return 'EXPIRED'
  if (toEnd <= warnDays) return 'ENDING_SOON'
  return 'RUNNING'
}

/** How far through its period a running contract is, 0–100. */
export function periodProgress(project: Pick<Project, 'periodStart' | 'periodEnd'>) {
  const total = daysBetween(project.periodStart, project.periodEnd)
  if (total <= 0) return 100
  const done = daysBetween(project.periodStart, new Date().toISOString())
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)))
}

/** In the running book: still on the shelf, whether or not people are on site today. */
export const isLiveProject = (p: Project) => p.status === 'ACTIVE' || p.status === 'SUSPENDED'

/** Actually deploying people today. A suspended contract owes nobody a post, so it is
 *  never counted as a shortfall — it would otherwise drag fulfilment down for good. */
export const isStaffedProject = (p: Project) => p.status === 'ACTIVE'

/** One project per building — the rule the project form enforces. */
export function buildingIsTaken(buildingId: string, projects: Project[], exceptProjectId?: string) {
  return projects.find(
    (p) => p.buildingId === buildingId && p.id !== exceptProjectId && (p.status === 'ACTIVE' || p.status === 'PENDING_APPROVAL'),
  )
}

/* ================================================================
   Inventory
   ================================================================ */

export const availableQty = (s: WarehouseStock) => Math.max(0, s.qtyOnHand - s.qtyReserved)
export const stockValue = (s: WarehouseStock) => s.qtyOnHand * s.unitCost

/** The warehouse's own level wins over the master's when it is set. */
export const effectiveMin = (s: WarehouseStock, item?: InventoryItem) =>
  s.minStockOverride ?? item?.minStock ?? 0

export type StockStatus = 'OUT_OF_STOCK' | 'LOW' | 'HEALTHY' | 'OVERSTOCK'

/**
 * Judged on what is physically in the bin, not on what is left after reservations —
 * reserved stock is still in the building, and a reorder decision is about the shelf.
 * The floor is the line's own override where the warehouse runs to its own plan,
 * and the master's company-wide level otherwise.
 */
export function stockStatus(s: WarehouseStock, item?: InventoryItem): StockStatus {
  if (s.qtyOnHand <= 0) return 'OUT_OF_STOCK'
  if (s.qtyOnHand <= effectiveMin(s, item)) return 'LOW'
  if (item && item.maxStock > 0 && s.qtyOnHand > item.maxStock) return 'OVERSTOCK'
  return 'HEALTHY'
}

export type ExpiryStatus = 'NONE' | 'OK' | 'EXPIRING' | 'EXPIRED'

export function expiryStatus(s: WarehouseStock, warnDays = 60): ExpiryStatus {
  if (!s.expiryDate) return 'NONE'
  const days = daysUntil(s.expiryDate)
  if (days < 0) return 'EXPIRED'
  if (days <= warnDays) return 'EXPIRING'
  return 'OK'
}

/** Total of one item across every warehouse. */
export function itemTotals(itemId: string, stock: WarehouseStock[]) {
  const rows = stock.filter((s) => s.itemId === itemId)
  return {
    rows: rows.length,
    warehouses: new Set(rows.map((r) => r.warehouseId)).size,
    onHand: rows.reduce((a, r) => a + r.qtyOnHand, 0),
    reserved: rows.reduce((a, r) => a + r.qtyReserved, 0),
    available: rows.reduce((a, r) => a + availableQty(r), 0),
    value: rows.reduce((a, r) => a + stockValue(r), 0),
  }
}

export function warehouseTotals(warehouseId: string, stock: WarehouseStock[], items: InventoryItem[]) {
  const rows = stock.filter((s) => s.warehouseId === warehouseId)
  const byStatus = (st: StockStatus) =>
    rows.filter((r) => stockStatus(r, items.find((i) => i.id === r.itemId)) === st).length
  return {
    lines: rows.length,
    skus: new Set(rows.map((r) => r.itemId)).size,
    onHand: rows.reduce((a, r) => a + r.qtyOnHand, 0),
    value: rows.reduce((a, r) => a + stockValue(r), 0),
    low: byStatus('LOW'),
    out: byStatus('OUT_OF_STOCK'),
    expiring: rows.filter((r) => expiryStatus(r) === 'EXPIRING' || expiryStatus(r) === 'EXPIRED').length,
  }
}

/**
 * What a project's contracted headcount will consume, from the standard
 * issue held on each position — the link that makes the inventory module
 * answer an operational question instead of a bookkeeping one.
 */
export function projectIssueDemand(project: Project, positions: Position[]) {
  const demand = new Map<string, number>()
  project.requirements.forEach((r) => {
    const position = positions.find((p) => p.id === r.positionId)
    position?.standardIssue.forEach((issue) => {
      demand.set(issue.sku, (demand.get(issue.sku) ?? 0) + issue.qtyPerPerson * r.headcount)
    })
  })
  return demand
}

/* ================================================================
   Attention — what the dashboard and the header bell both read
   ================================================================ */

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM'

export interface Alert {
  id: string
  severity: Severity
  title: string
  detail: string
  link: string
}

export function buildAlerts(input: {
  projects: Project[]
  clients: Client[]
  buildings: Building[]
  positions: Position[]
  items: InventoryItem[]
  stock: WarehouseStock[]
  warehouses: Warehouse[]
}): Alert[] {
  const { projects, clients, buildings, items, stock, warehouses } = input
  const alerts: Alert[] = []
  const clientName = (id: string) => clients.find((c) => c.id === id)?.brandName ?? clients.find((c) => c.id === id)?.legalName ?? 'Unknown client'

  projects.filter(isStaffedProject).forEach((p) => {
    const f = fulfilment(p)
    if (f.gap > 0) {
      alerts.push({
        id: `gap-${p.id}`,
        severity: f.pct < 90 ? 'CRITICAL' : 'HIGH',
        title: `${p.code} is ${f.gap} short of contracted headcount`,
        detail: `${clientName(p.clientId)} · ${f.deployed} of ${f.required} deployed (${f.pct}%). Every empty post is a service-level breach.`,
        link: `/projects/${p.id}`,
      })
    }
    const toEnd = daysUntil(p.periodEnd)
    if (toEnd >= 0 && toEnd <= 60) {
      alerts.push({
        id: `end-${p.id}`,
        severity: toEnd <= 30 ? 'HIGH' : 'MEDIUM',
        title: `${p.code} ends in ${toEnd} day${toEnd === 1 ? '' : 's'}`,
        detail: p.autoRenew
          ? `${clientName(p.clientId)} · renews automatically, notice period ${p.renewalNoticeDays} days.`
          : `${clientName(p.clientId)} · no auto-renewal. Send the extension letter before the notice period closes.`,
        link: `/projects/${p.id}`,
      })
    }
    if (toEnd < 0 && p.status === 'ACTIVE') {
      alerts.push({
        id: `expired-${p.id}`,
        severity: 'CRITICAL',
        title: `${p.code} is active past its end date`,
        detail: `${clientName(p.clientId)} · the period closed ${Math.abs(toEnd)} days ago but personnel are still being billed. Close it or extend it.`,
        link: `/projects/${p.id}`,
      })
    }
  })

  projects
    .filter((p) => p.status === 'PENDING_APPROVAL')
    .forEach((p) =>
      alerts.push({
        id: `approve-${p.id}`,
        severity: 'MEDIUM',
        title: `${p.code} is waiting for approval`,
        detail: `${clientName(p.clientId)} · ${buildings.find((b) => b.id === p.buildingId)?.name ?? 'building'} · nothing can be deployed until it is approved.`,
        link: `/projects/${p.id}`,
      }),
    )

  stock.forEach((s) => {
    const item = items.find((i) => i.id === s.itemId)
    if (!item) return
    const status = stockStatus(s, item)
    const wh = warehouses.find((w) => w.id === s.warehouseId)
    if (status === 'OUT_OF_STOCK' || status === 'LOW') {
      alerts.push({
        id: `stock-${s.id}`,
        severity: status === 'OUT_OF_STOCK' ? 'HIGH' : 'MEDIUM',
        title: `${item.name} is ${status === 'OUT_OF_STOCK' ? 'out of stock' : 'below its minimum'} at ${wh?.code ?? 'a warehouse'}`,
        detail: `${s.qtyOnHand} ${item.uom} on the shelf against a floor of ${effectiveMin(s, item)}, ${availableQty(s)} of it unreserved. Reorder quantity is ${item.reorderQty} ${item.uom}, lead time ${item.leadTimeDays} days.`,
        link: '/inventory/stock',
      })
    }
    const exp = expiryStatus(s)
    if (exp === 'EXPIRED' || exp === 'EXPIRING') {
      alerts.push({
        id: `exp-${s.id}`,
        severity: exp === 'EXPIRED' ? 'HIGH' : 'MEDIUM',
        title: `${item.name} batch ${s.batchNo ?? ''} ${exp === 'EXPIRED' ? 'has expired' : 'expires soon'}`.trim(),
        detail: `${wh?.name ?? 'Warehouse'} · bin ${s.binLocation} · ${s.qtyOnHand} ${item.uom} valued at IDR ${Math.round(stockValue(s)).toLocaleString('en-US')}.`,
        link: '/inventory/stock',
      })
    }
  })

  const order: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 }
  return alerts.sort((a, b) => order[a.severity] - order[b.severity])
}

/** Requirement lines flattened across every project — the deployment register. */
export interface DeploymentRow {
  id: string
  requirement: ManpowerRequirement
  project: Project
  client?: Client
  building?: Building
  position?: Position
}

export function deploymentRows(
  projects: Project[],
  clients: Client[],
  buildings: Building[],
  positions: Position[],
): DeploymentRow[] {
  return projects.flatMap((project) =>
    project.requirements.map((requirement) => ({
      id: requirement.id,
      requirement,
      project,
      client: clients.find((c) => c.id === project.clientId),
      building: buildings.find((b) => b.id === project.buildingId),
      position: positions.find((p) => p.id === requirement.positionId),
    })),
  )
}
