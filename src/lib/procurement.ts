import type {
  Division, InventoryItem, MrRequest, MrSession, PrLineSource, PurchasePrice, PurchaseRequest,
  PurchaseRequestLine, Supplier, WarehouseStock,
} from '@/data/types'

/* ------------------------------------------------------------------
   Material request → purchase request.

   The shape of the month:

     1. An administrator opens a session for the period.
     2. Each division files one request; its head submits it.
     3. Purchasing reviews every request and sends back what it disagrees with.
     4. Purchasing locks the session. The submitted lines are merged, one line
        per item, into a purchase request in draft — and the requests are frozen.
     5. Each purchase request line is assigned to a supplier, which brings that
        supplier's last purchase price with it.

   Everything below is the arithmetic behind those five steps. The seed data
   builds its purchase requests with the same functions the application uses,
   so a recap in the file and a recap made by pressing Lock cannot drift apart.
   ------------------------------------------------------------------ */

/** Only what the warehouse already knows: an active master item with a stock line. */
export function requestableItems(items: InventoryItem[], stock: WarehouseStock[]) {
  const held = new Set(stock.map((s) => s.itemId))
  return items.filter((i) => i.status === 'ACTIVE' && held.has(i.id))
}

export const isRequestable = (itemId: string, items: InventoryItem[], stock: WarehouseStock[]) =>
  requestableItems(items, stock).some((i) => i.id === itemId)

/* ================================================================
   Material requests
   ================================================================ */

/** A division's own estimate, falling back to the item's standard cost. */
export function mrLineValue(line: { itemId: string; qty: number; estimatedUnitPrice?: number }, items: InventoryItem[]) {
  const item = items.find((i) => i.id === line.itemId)
  const unit = line.estimatedUnitPrice ?? item?.standardCost ?? 0
  return line.qty * unit
}

export const mrRequestTotal = (request: MrRequest, items: InventoryItem[]) =>
  request.lines.reduce((a, l) => a + mrLineValue(l, items), 0)

export const mrRequestQty = (request: MrRequest) => request.lines.reduce((a, l) => a + l.qty, 0)

/** A request counts towards the recap once its division has submitted it. */
export const isCountedInRecap = (r: MrRequest) => r.status === 'SUBMITTED' || r.status === 'APPROVED'

export function sessionRequests(sessionId: string, requests: MrRequest[]) {
  return requests.filter((r) => r.sessionId === sessionId)
}

export function sessionStats(session: MrSession, requests: MrRequest[], divisions: Division[], items: InventoryItem[]) {
  const rows = sessionRequests(session.id, requests)
  const eligible = divisions.filter((d) => d.status === 'ACTIVE')
  const counted = rows.filter(isCountedInRecap)
  return {
    requests: rows.length,
    eligibleDivisions: eligible.length,
    submitted: counted.length,
    drafts: rows.filter((r) => r.status === 'DRAFT').length,
    returned: rows.filter((r) => r.status === 'RETURNED').length,
    notFiled: eligible.filter((d) => !rows.some((r) => r.divisionId === d.id)).length,
    lines: rows.reduce((a, r) => a + r.lines.length, 0),
    qty: counted.reduce((a, r) => a + mrRequestQty(r), 0),
    estimate: counted.reduce((a, r) => a + mrRequestTotal(r, items), 0),
    /** Distinct items once the merge is done — the width of the future purchase request. */
    mergedItems: new Set(counted.flatMap((r) => r.lines.map((l) => l.itemId))).size,
  }
}

/**
 * Whether the session can be locked, and why not when it cannot.
 * Drafts left open are the usual reason: locking would silently drop them.
 */
export function canLockSession(session: MrSession, requests: MrRequest[]) {
  const rows = sessionRequests(session.id, requests)
  const counted = rows.filter(isCountedInRecap)
  if (session.status === 'LOCKED') return { ok: false, reason: 'This session is already locked.' }
  if (session.status === 'CANCELLED') return { ok: false, reason: 'This session was cancelled.' }
  if (session.status === 'DRAFT') return { ok: false, reason: 'Open the session before locking it — nobody has been able to file yet.' }
  if (counted.length === 0) return { ok: false, reason: 'No division has submitted a request, so there is nothing to recap.' }
  const drafts = rows.filter((r) => r.status === 'DRAFT')
  if (drafts.length > 0) {
    return {
      ok: false,
      reason: `${drafts.length} division request${drafts.length === 1 ? ' is' : 's are'} still in draft. Locking now would leave them out — ask them to submit, or return the request so it is deliberate.`,
    }
  }
  return { ok: true, reason: '' }
}

/* ================================================================
   The recap: many division requests, one line per item
   ================================================================ */

/**
 * Merge every submitted request into one line per item, keeping each division's
 * quantity as a source. Division A asking for 10 pens and division B for 5
 * becomes one line of 15 that can still be read back to both of them.
 */
export function buildPrLines(requests: MrRequest[], items: InventoryItem[]): PurchaseRequestLine[] {
  const byItem = new Map<string, PurchaseRequestLine>()

  requests
    .filter(isCountedInRecap)
    .forEach((request) =>
      request.lines.forEach((line) => {
        const existing = byItem.get(line.itemId)
        const source: PrLineSource = {
          requestId: request.id,
          divisionId: request.divisionId,
          qty: line.qty,
          estimatedUnitPrice: line.estimatedUnitPrice,
        }
        if (existing) {
          existing.qty += line.qty
          existing.sources.push(source)
        } else {
          byItem.set(line.itemId, {
            id: `prl_${line.itemId}`,
            itemId: line.itemId,
            qty: line.qty,
            sources: [source],
          })
        }
      }),
    )

  /* Widest demand first: that is the order purchasing negotiates in. */
  return Array.from(byItem.values()).sort((a, b) => {
    const av = a.qty * (items.find((i) => i.id === a.itemId)?.standardCost ?? 0)
    const bv = b.qty * (items.find((i) => i.id === b.itemId)?.standardCost ?? 0)
    return bv - av
  })
}

/* ================================================================
   Prices
   ================================================================ */

/** The most recent purchase of this item from this supplier. */
export function lastPurchase(itemId: string, supplierId: string, prices: PurchasePrice[]) {
  return prices
    .filter((p) => p.itemId === itemId && p.supplierId === supplierId)
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))[0]
}

/** The most recent purchase of this item from anyone, for when no supplier is assigned yet. */
export function lastPurchaseAnywhere(itemId: string, prices: PurchasePrice[]) {
  return prices.filter((p) => p.itemId === itemId).sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))[0]
}

/** Every price this supplier has charged for this item, newest first. */
export const priceHistory = (itemId: string, supplierId: string, prices: PurchasePrice[]) =>
  prices
    .filter((p) => p.itemId === itemId && p.supplierId === supplierId)
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))

export type PriceBasis = 'AGREED' | 'LAST_FROM_SUPPLIER' | 'LAST_FROM_ANYONE' | 'DIVISION_ESTIMATE' | 'STANDARD_COST' | 'NONE'

/**
 * What a line is worth, and on what authority — in descending order of how much
 * the number can be trusted. The basis is shown next to the figure so nobody
 * mistakes a standard cost for a quoted price.
 */
export function prLinePrice(
  line: PurchaseRequestLine,
  prices: PurchasePrice[],
  items: InventoryItem[],
): { unitPrice: number; basis: PriceBasis; at?: string } {
  if (line.agreedUnitPrice !== undefined) return { unitPrice: line.agreedUnitPrice, basis: 'AGREED' }

  if (line.supplierId) {
    const last = lastPurchase(line.itemId, line.supplierId, prices)
    if (last) return { unitPrice: last.unitPrice, basis: 'LAST_FROM_SUPPLIER', at: last.purchasedAt }
  }
  const anywhere = lastPurchaseAnywhere(line.itemId, prices)
  if (anywhere) return { unitPrice: anywhere.unitPrice, basis: 'LAST_FROM_ANYONE', at: anywhere.purchasedAt }

  const estimates = line.sources.map((s) => s.estimatedUnitPrice).filter((n): n is number => n !== undefined)
  if (estimates.length) return { unitPrice: Math.max(...estimates), basis: 'DIVISION_ESTIMATE' }

  const item = items.find((i) => i.id === line.itemId)
  if (item) return { unitPrice: item.standardCost, basis: 'STANDARD_COST' }
  return { unitPrice: 0, basis: 'NONE' }
}

export const prLineTotal = (line: PurchaseRequestLine, prices: PurchasePrice[], items: InventoryItem[]) =>
  line.qty * prLinePrice(line, prices, items).unitPrice

export function prTotals(pr: PurchaseRequest, prices: PurchasePrice[], items: InventoryItem[]) {
  const value = pr.lines.reduce((a, l) => a + prLineTotal(l, prices, items), 0)
  const assigned = pr.lines.filter((l) => l.supplierId).length
  const priced = pr.lines.filter((l) => l.agreedUnitPrice !== undefined).length
  return {
    value,
    lines: pr.lines.length,
    qty: pr.lines.reduce((a, l) => a + l.qty, 0),
    assigned,
    unassigned: pr.lines.length - assigned,
    priced,
    divisions: new Set(pr.lines.flatMap((l) => l.sources.map((s) => s.divisionId))).size,
    suppliers: new Set(pr.lines.map((l) => l.supplierId).filter(Boolean)).size,
  }
}

/** Suppliers approved for the category this item belongs to, best rating first. */
export function suppliersForItem(itemId: string, items: InventoryItem[], suppliers: Supplier[]) {
  const item = items.find((i) => i.id === itemId)
  if (!item) return []
  return suppliers
    .filter((s) => s.status !== 'BLACKLISTED' && s.categories.includes(item.category))
    .sort((a, b) => b.rating - a.rating)
}

/** Lines grouped by the supplier they were assigned to — how the order is actually placed. */
export function linesBySupplier(pr: PurchaseRequest, prices: PurchasePrice[], items: InventoryItem[]) {
  const map = new Map<string, { supplierId: string; lines: PurchaseRequestLine[]; value: number }>()
  pr.lines.forEach((line) => {
    const key = line.supplierId ?? '__unassigned'
    const bucket = map.get(key) ?? { supplierId: key, lines: [], value: 0 }
    bucket.lines.push(line)
    bucket.value += prLineTotal(line, prices, items)
    map.set(key, bucket)
  })
  return Array.from(map.values()).sort((a, b) => b.value - a.value)
}
