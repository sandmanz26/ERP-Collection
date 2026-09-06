/**
 * Roll-ups for the control tower and the analytics page. Every figure is folded
 * out of the records; none of them is stored.
 */
import type {
  Budget, Buyer, GoodsReceipt, Item, Project, ProjectStage, PurchaseOrder, SalesInvoice, Supplier,
  SupplierBill, WorkOrder,
} from '@/data/types'
import { PROJECT_STAGES, isCommercialStage, stageIndex } from '@/data/reference'
import { budgetTotal, revenueIdr } from './costing'
import { orderProgress, orderValue } from './procurement'

const DAY = 86_400_000
const daysUntil = (iso?: string) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / DAY) : 0)

/** The order book by stage, which is the shape of the pipeline. */
export function pipeline(projects: Project[]) {
  return PROJECT_STAGES.map((s) => {
    const rows = projects.filter((p) => p.stage === s.key && p.status !== 'LOST' && p.status !== 'CANCELLED')
    return {
      stage: s,
      count: rows.length,
      valueIdr: rows.reduce((a, p) => a + revenueIdr(p), 0),
      projects: rows,
    }
  })
}

/** Won, lost and still open, with the money attached. */
export function winLoss(projects: Project[]) {
  const decided = projects.filter((p) => p.status === 'WON' || p.status === 'LOST' || p.status === 'CLOSED')
  const won = decided.filter((p) => p.status !== 'LOST')
  const lost = decided.filter((p) => p.status === 'LOST')
  const open = projects.filter((p) => p.status === 'OPEN')
  return {
    won: won.length,
    lost: lost.length,
    open: open.length,
    winRatePct: decided.length ? (won.length / decided.length) * 100 : 0,
    wonValue: won.reduce((a, p) => a + revenueIdr(p), 0),
    lostValue: lost.reduce((a, p) => a + revenueIdr(p), 0),
    openValue: open.reduce((a, p) => a + revenueIdr(p), 0),
    lossReasons: lost.reduce<Record<string, number>>((acc, p) => {
      const key = p.lossReason ?? 'OTHER'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {}),
  }
}

/** Order book by destination country — where the money actually comes from. */
export function byCountry(projects: Project[], buyers: Buyer[]) {
  const map = new Map<string, { code: string; name: string; count: number; valueIdr: number }>()
  projects
    .filter((p) => p.status === 'WON' || p.status === 'CLOSED')
    .forEach((p) => {
      const buyer = buyers.find((b) => b.id === p.buyerId)
      const key = p.destinationCountry
      const row = map.get(key) ?? { code: key, name: buyer?.countryName ?? key, count: 0, valueIdr: 0 }
      row.count += 1
      row.valueIdr += revenueIdr(p)
      map.set(key, row)
    })
  return Array.from(map.values()).sort((a, b) => b.valueIdr - a.valueIdr)
}

/** Every won order, with the margin its budget promises. */
export function marginByProject(projects: Project[], budgets: Budget[]) {
  return projects
    .filter((p) => p.status === 'WON' || p.status === 'CLOSED')
    .map((p) => {
      const budget = budgets.find((b) => b.projectId === p.id && (b.status === 'APPROVED' || b.status === 'CLOSED'))
      const revenue = revenueIdr(p)
      const cost = budgetTotal(budget)
      return {
        project: p,
        budget,
        revenue,
        cost,
        margin: revenue - cost,
        marginPct: revenue && cost ? ((revenue - cost) / revenue) * 100 : 0,
        targetPct: budget?.targetMarginPct ?? 0,
      }
    })
    .sort((a, b) => a.marginPct - b.marginPct)
}

/** Spend by supplier, on what has actually been received. */
export function spendBySupplier(orders: PurchaseOrder[], receipts: GoodsReceipt[], suppliers: Supplier[]) {
  return suppliers
    .map((s) => {
      const mine = orders.filter((o) => o.supplierId === s.id)
      const received = mine.reduce((a, o) => a + orderProgress(o, receipts).receivedValue, 0)
      const open = mine.reduce((a, o) => a + orderProgress(o, receipts).openValue, 0)
      return { supplier: s, orders: mine.length, ordered: mine.reduce((a, o) => a + orderValue(o), 0), received, open }
    })
    .filter((r) => r.orders > 0)
    .sort((a, b) => b.received - a.received)
}

/** Spend by cost category, from the budget lines the orders were raised against. */
export function spendByCategory(orders: PurchaseOrder[], budgets: Budget[], itemOf: (id: string) => Item | undefined) {
  const map = new Map<string, { category: string; ordered: number; received: number }>()
  orders
    .filter((o) => !['DRAFT', 'CANCELLED'].includes(o.status))
    .forEach((o) => {
      o.lines.forEach((l) => {
        const budgetLine = budgets.flatMap((b) => b.lines).find((b) => b.id === l.budgetLineId)
        const category = budgetLine?.category ?? itemOf(l.itemId)?.category ?? 'OTHER'
        const net = l.unitPrice * (1 - l.discountPct / 100)
        const row = map.get(category) ?? { category, ordered: 0, received: 0 }
        row.ordered += l.qty * net
        row.received += l.receivedQty * net
        map.set(category, row)
      })
    })
  return Array.from(map.values()).sort((a, b) => b.ordered - a.ordered)
}

/** Deliveries that arrived on or before the date the order promised. */
export function deliveryPunctuality(orders: PurchaseOrder[], receipts: GoodsReceipt[]) {
  const rows = receipts.map((r) => {
    const po = orders.find((o) => o.id === r.poId)
    const late = po ? Math.floor((new Date(r.receivedAt).getTime() - new Date(po.expectedAt).getTime()) / DAY) : 0
    return { receipt: r, po, daysLate: late, onTime: late <= 0 }
  })
  const onTime = rows.filter((r) => r.onTime).length
  return {
    rows,
    total: rows.length,
    onTime,
    onTimePct: rows.length ? (onTime / rows.length) * 100 : 0,
    averageDaysLate: rows.length ? rows.reduce((a, r) => a + Math.max(0, r.daysLate), 0) / rows.length : 0,
  }
}

/** Orders whose ship date is close, ordered by how close. */
export function shipCalendar(projects: Project[], withinDays = 60) {
  return projects
    .filter((p) => p.status === 'WON' && p.stage !== 'CLOSED' && !p.actualShipAt)
    .map((p) => ({ project: p, daysToShip: daysUntil(p.targetShipAt) }))
    .filter((r) => r.daysToShip <= withinDays)
    .sort((a, b) => a.daysToShip - b.daysToShip)
}

/** What the factory is holding right now, and how much of it is late. */
export function productionLoad(workOrders: WorkOrder[]) {
  const live = workOrders.filter((w) => !['COMPLETED', 'CANCELLED'].includes(w.status))
  return {
    open: live.length,
    onHold: live.filter((w) => w.status === 'ON_HOLD').length,
    late: live.filter((w) => new Date(w.dueAt) < new Date()).length,
    pieces: live.reduce((a, w) => a + w.qty, 0),
    produced: live.reduce((a, w) => a + w.producedQty, 0),
    completionPct: (() => {
      const q = live.reduce((a, w) => a + w.qty, 0)
      return q ? (live.reduce((a, w) => a + w.producedQty, 0) / q) * 100 : 0
    })(),
  }
}

/** Cash position: what is owed to us, what we owe, and the gap. */
export function cashPosition(invoices: SalesInvoice[], bills: SupplierBill[]) {
  const receivable = invoices
    .filter((i) => ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status))
    .reduce((a, i) => a + (i.amount - i.paidAmount) * i.exchangeRate, 0)
  const overdueIn = invoices
    .filter((i) => i.status === 'OVERDUE')
    .reduce((a, i) => a + (i.amount - i.paidAmount) * i.exchangeRate, 0)
  const payable = bills
    .filter((b) => ['APPROVED', 'AWAITING_APPROVAL', 'PARTIALLY_PAID', 'OVERDUE', 'DISPUTED'].includes(b.status))
    .reduce((a, b) => a + (b.subtotal + b.taxAmount - b.paidAmount), 0)
  const overdueOut = bills
    .filter((b) => b.status === 'OVERDUE')
    .reduce((a, b) => a + (b.subtotal + b.taxAmount - b.paidAmount), 0)
  return { receivable, overdueIn, payable, overdueOut, net: receivable - payable }
}

/** Value of orders by month of target ship date, for the next half year. */
export function shipmentForecast(projects: Project[], months = 6) {
  const out: { key: string; label: string; valueIdr: number; count: number }[] = []
  const now = new Date()
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    out.push({ key, label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), valueIdr: 0, count: 0 })
  }
  projects
    .filter((p) => p.status === 'WON' && p.stage !== 'CLOSED')
    .forEach((p) => {
      const d = new Date(p.targetShipAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const row = out.find((x) => x.key === key)
      if (row) {
        row.valueIdr += revenueIdr(p)
        row.count += 1
      }
    })
  return out
}

/** How long an order spends being argued about before it becomes an order. */
export function negotiationEffort(projects: Project[]) {
  return projects
    .filter((p) => p.negotiations.length > 0)
    .map((p) => {
      const first = p.negotiations[0]
      const last = p.negotiations[p.negotiations.length - 1]
      const days = Math.round((new Date(last.at).getTime() - new Date(first.at).getTime()) / DAY)
      const opened = p.negotiations.find((n) => n.subject === 'PRICE' && n.ourValue)
      const closed = [...p.negotiations].reverse().find((n) => n.subject === 'PRICE' && n.ourValue)
      const movement = opened && closed && opened.ourValue ? ((closed.ourValue! - opened.ourValue) / opened.ourValue) * 100 : 0
      return {
        project: p,
        rounds: p.negotiations.length,
        days,
        priceMovementPct: movement,
        samples: p.samples.length,
        drawingRevisions: p.drawings.reduce((a, d) => a + (d.revision.charCodeAt(0) - 65), 0),
      }
    })
    .sort((a, b) => b.rounds - a.rounds)
}

export const openProjects = (projects: Project[]) =>
  projects.filter((p) => p.status === 'OPEN' || (p.status === 'WON' && p.stage !== 'CLOSED'))

export const commercialProjects = (projects: Project[]) =>
  projects.filter((p) => isCommercialStage(p.stage) && p.status === 'OPEN')

export const inFactory = (projects: Project[]) =>
  projects.filter((p) => stageIndex(p.stage) >= stageIndex('PRODUCTION') && stageIndex(p.stage) < stageIndex('SHIPPED'))

export const stageGroupOf = (stage: ProjectStage) => PROJECT_STAGES.find((s) => s.key === stage)?.group ?? 'COMMERCIAL'
