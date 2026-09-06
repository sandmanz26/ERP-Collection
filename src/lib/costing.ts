/**
 * Costing.
 *
 * A budget is a plan; a purchase order is a commitment; a goods receipt is a
 * cost. Keeping the three apart is the whole point — an order can look
 * comfortably inside budget right up to the moment somebody notices that the
 * committed column already ate the remaining allowance.
 */
import type {
  Budget, BudgetLine, CostCategory, GoodsReceipt, Project, PurchaseOrder, SalesInvoice, SupplierBill,
} from '@/data/types'
import { COST_CATEGORIES } from '@/data/reference'

/** What a budget line is expected to cost once wastage is allowed for. */
export const lineBudget = (l: BudgetLine) => l.qty * l.unitCost * (1 + l.wastagePct / 100)

/** The whole budget, in rupiah. */
export const budgetTotal = (b?: Budget) => (b ? b.lines.reduce((a, l) => a + lineBudget(l), 0) : 0)

/** Order value converted to rupiah at the rate the order was taken on. */
export const revenueIdr = (p: Project) => p.contractValue * p.exchangeRate

export interface CategoryRoll {
  category: CostCategory
  label: string
  budget: number
  /** ordered but not yet received */
  committed: number
  /** received, whether or not the supplier has invoiced */
  actual: number
  variance: number
  variancePct: number
}

/**
 * Budget against reality, category by category.
 *
 * "Committed" is the open balance on approved purchase orders — quantity
 * ordered less quantity received, at the order price. "Actual" is what has
 * actually been received, at the order price, because that is the moment the
 * cost becomes ours whether or not the invoice has turned up.
 */
export function categoryRoll(
  budget: Budget | undefined,
  orders: PurchaseOrder[],
  categoryOf: (itemId: string) => CostCategory | undefined,
): CategoryRoll[] {
  const rows = new Map<CostCategory, CategoryRoll>()
  const ensure = (c: CostCategory) => {
    if (!rows.has(c)) {
      rows.set(c, {
        category: c,
        label: COST_CATEGORIES.find((x) => x.value === c)?.label ?? c,
        budget: 0, committed: 0, actual: 0, variance: 0, variancePct: 0,
      })
    }
    return rows.get(c)!
  }

  budget?.lines.forEach((l) => {
    ensure(l.category).budget += lineBudget(l)
  })

  orders
    .filter((po) => !['DRAFT', 'CANCELLED'].includes(po.status))
    .forEach((po) => {
      po.lines.forEach((pl) => {
        const budgetLine = budget?.lines.find((b) => b.id === pl.budgetLineId)
        const category = budgetLine?.category ?? categoryOf(pl.itemId) ?? 'OVERHEAD'
        const row = ensure(category)
        const net = pl.unitPrice * (1 - pl.discountPct / 100)
        row.actual += pl.receivedQty * net
        row.committed += Math.max(0, pl.qty - pl.receivedQty) * net
      })
    })

  return Array.from(rows.values())
    .map((r) => {
      const spent = r.actual + r.committed
      return { ...r, variance: r.budget - spent, variancePct: r.budget ? ((r.budget - spent) / r.budget) * 100 : 0 }
    })
    .sort((a, b) => b.budget - a.budget)
}

export interface ProjectCosting {
  revenue: number
  budget: number
  committed: number
  actual: number
  /** committed plus actual — everything already promised to somebody */
  exposure: number
  remaining: number
  budgetMarginPct: number
  /** margin if the exposure is all that is ever spent */
  projectedMarginPct: number
  targetMarginPct: number
  overCommitted: boolean
  rows: CategoryRoll[]
}

export function projectCosting(
  project: Project,
  budget: Budget | undefined,
  orders: PurchaseOrder[],
  categoryOf: (itemId: string) => CostCategory | undefined,
): ProjectCosting {
  const rows = categoryRoll(budget, orders, categoryOf)
  const revenue = revenueIdr(project)
  const total = budgetTotal(budget)
  const committed = rows.reduce((a, r) => a + r.committed, 0)
  const actual = rows.reduce((a, r) => a + r.actual, 0)
  const exposure = committed + actual
  /* Budget covers material and services bought in; labour, overhead and the
     rest are budgeted but never appear on a purchase order, so the projection
     is the budget for those plus the exposure for what is bought. */
  const nonPurchased = budget
    ? budget.lines
        .filter((l) => ['LABOUR', 'OVERHEAD', 'CONTINGENCY'].includes(l.category))
        .reduce((a, l) => a + lineBudget(l), 0)
    : 0
  const projectedCost = exposure + nonPurchased
  return {
    revenue,
    budget: total,
    committed,
    actual,
    exposure,
    remaining: total - exposure,
    budgetMarginPct: revenue ? ((revenue - total) / revenue) * 100 : 0,
    projectedMarginPct: revenue ? ((revenue - projectedCost) / revenue) * 100 : 0,
    targetMarginPct: budget?.targetMarginPct ?? 0,
    overCommitted: total > 0 && exposure > total,
    rows,
  }
}

/**
 * What the order actually earned, once the money is in and the bills are paid.
 * Only meaningful on a closed job; before that it is a forecast wearing a
 * different hat.
 */
export function realisedMargin(
  project: Project,
  invoices: SalesInvoice[],
  bills: SupplierBill[],
  receipts: GoodsReceipt[],
  orders: PurchaseOrder[],
) {
  const billed = invoices
    .filter((i) => i.projectId === project.id && i.status !== 'VOID' && i.kind !== 'PROFORMA')
    .reduce((a, i) => a + i.amount * i.exchangeRate, 0)
  const supplierCost = bills
    .filter((b) => b.projectId === project.id && b.status !== 'VOID')
    .reduce((a, b) => a + b.subtotal, 0)
  const receivedCost = receipts
    .filter((g) => g.projectId === project.id)
    .reduce((a, g) => {
      const po = orders.find((p) => p.id === g.poId)
      return a + g.lines.reduce((la, gl) => {
        const pl = po?.lines.find((x) => x.id === gl.poLineId)
        return la + gl.qtyAccepted * (pl?.unitPrice ?? 0)
      }, 0)
    }, 0)
  return { billed, supplierCost, receivedCost, margin: billed - supplierCost, marginPct: billed ? ((billed - supplierCost) / billed) * 100 : 0 }
}

/**
 * The FOB cost sheet — the same numbers as the budget, arranged the way an
 * export costing is read: per piece and per cubic metre, because furniture is
 * sold by the piece and shipped by the metre.
 */
export function fobSheet(project: Project, budget: Budget | undefined) {
  const cbm = project.items.reduce((a, i) => a + i.qty * i.cbmPerUnit, 0)
  const pieces = project.items.reduce((a, i) => a + i.qty, 0)
  const cost = budgetTotal(budget)
  const revenue = revenueIdr(project)
  return {
    cbm,
    pieces,
    costPerPiece: pieces ? cost / pieces : 0,
    costPerCbm: cbm ? cost / cbm : 0,
    revenuePerPiece: pieces ? revenue / pieces : 0,
    revenuePerCbm: cbm ? revenue / cbm : 0,
    marginPerCbm: cbm ? (revenue - cost) / cbm : 0,
  }
}

/** Cost of every sample made for an order, and how much of it we got back. */
export function sampleCost(project: Project) {
  const total = project.samples.reduce((a, s) => a + s.costIdr, 0)
  const recovered = project.samples.filter((s) => s.chargedToBuyer).reduce((a, s) => a + s.costIdr, 0)
  return { total, recovered, absorbed: total - recovered, count: project.samples.length }
}
