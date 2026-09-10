/**
 * The commercial engine — what a quotation is really worth, whether a container
 * is worth sailing, what a claim costs once it is settled, and where the cash is.
 *
 * The theme is the same one that runs through the rest of the book: every number
 * here is derived from something real, and every figure that looks bad says why.
 */

import type {
  Claim, Currency, Delivery, Invoice, Payment, Product, Quotation, SalesOrder,
} from '@/data/types'
import {
  CLAIM_AGEING_DAYS, CONTAINER_FILL_FLOOR, CONTAINER_SPECS, DELIVERY_DOC_TYPES,
  QUOTE_CHASE_DAYS, QUOTE_MARGIN_FLOOR_PERCENT,
} from '@/data/reference'
import { daysBetween, TODAY } from '@/data/clock'

/* ==================================================================
   Quotations
   ================================================================== */

export interface QuoteValue {
  /** everything the customer would pay, in base currency */
  gross: number
  /** what the discounts already conceded have cost us */
  discountGiven: number
  /** standard cost of the whole quote, frozen at pricing time */
  cost: number
  /** gross less cost less the logistics the quote absorbed */
  contribution: number
  marginPercent: number
  /** the quote weighted by the desk's own probability — this is the forecast */
  weighted: number
  /** below the floor, a quote needs a signature it has not necessarily got */
  belowFloor: boolean
  /** the longest lead time on any line: the date the quote is really promising */
  leadTimeDays: number
}

export function quoteValue(q: Quotation): QuoteValue {
  const rate = q.fxRate || 1
  let gross = 0
  let list = 0
  let cost = 0
  let leadTimeDays = 0
  q.lines.forEach((l) => {
    gross += l.unitPrice * l.quantity * rate
    list += (l.discountPercent < 1 ? l.unitPrice / (1 - l.discountPercent) : l.unitPrice) * l.quantity * rate
    cost += l.standardCostAtQuote * l.quantity
    leadTimeDays = Math.max(leadTimeDays, l.leadTimeDays)
  })
  const contribution = gross - cost - q.logisticsAllowance
  const marginPercent = gross > 0 ? (contribution / gross) * 100 : 0
  return {
    gross,
    discountGiven: list - gross,
    cost,
    contribution,
    marginPercent,
    weighted: gross * (q.probabilityPercent / 100),
    belowFloor: marginPercent < QUOTE_MARGIN_FLOOR_PERCENT,
    leadTimeDays,
  }
}

export const quoteIsLive = (s: Quotation['status']) => s === 'DRAFT' || s === 'SENT' || s === 'NEGOTIATING'

/** Where a live quote stands against its own validity date. */
export function quoteClock(q: Quotation): { live: boolean; daysLeft: number; chasing: boolean; lapsed: boolean } {
  const daysLeft = daysBetween(TODAY, q.validUntil)
  const live = quoteIsLive(q.status)
  return {
    live,
    daysLeft,
    chasing: live && daysLeft >= 0 && daysLeft <= QUOTE_CHASE_DAYS,
    lapsed: live && daysLeft < 0,
  }
}

export interface PipelineSummary {
  live: number
  liveValue: number
  weightedValue: number
  wonValue: number
  lostValue: number
  /** by value, not by count — a win rate on counts flatters a desk that wins small */
  winRatePercent: number
  averageDecisionDays: number
  belowFloor: number
  lapsing: number
}

export function pipeline(quotations: Quotation[]): PipelineSummary {
  const live = quotations.filter((q) => quoteIsLive(q.status))
  const won = quotations.filter((q) => q.status === 'WON')
  const lost = quotations.filter((q) => q.status === 'LOST' || q.status === 'EXPIRED')
  const value = (rows: Quotation[]) => rows.reduce((a, q) => a + quoteValue(q).gross, 0)
  const decided = [...won, ...lost].filter((q) => q.decidedAt)
  const wonValue = value(won)
  const lostValue = value(lost)
  return {
    live: live.length,
    liveValue: value(live),
    weightedValue: live.reduce((a, q) => a + quoteValue(q).weighted, 0),
    wonValue,
    lostValue,
    winRatePercent: wonValue + lostValue > 0 ? (wonValue / (wonValue + lostValue)) * 100 : 0,
    averageDecisionDays: decided.length
      ? decided.reduce((a, q) => a + daysBetween(q.issueDate, q.decidedAt!), 0) / decided.length
      : 0,
    belowFloor: live.filter((q) => quoteValue(q).belowFloor).length,
    lapsing: live.filter((q) => quoteClock(q).chasing || quoteClock(q).lapsed).length,
  }
}

/** Why we lose, by value — the only version of this table worth reading. */
export function lossReasons(quotations: Quotation[]) {
  const lost = quotations.filter((q) => q.status === 'LOST' && q.lostReason)
  const total = lost.reduce((a, q) => a + quoteValue(q).gross, 0)
  const map = new Map<string, { reason: string; count: number; value: number }>()
  lost.forEach((q) => {
    const key = q.lostReason!
    const row = map.get(key) ?? { reason: key, count: 0, value: 0 }
    row.count += 1
    row.value += quoteValue(q).gross
    map.set(key, row)
  })
  return [...map.values()]
    .map((r) => ({ ...r, sharePercent: total > 0 ? (r.value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
}

/* ==================================================================
   Deliveries and the container going out
   ================================================================== */

export interface LoadPlan {
  cbm: number
  weightKg: number
  cartons: number
  capacityCbm: number
  capacityKg: number
  fillPercent: number
  weightPercent: number
  /** a container is either cube-out or weight-out; furniture is almost always cube-out */
  limitedBy: 'CUBE' | 'WEIGHT' | 'NONE'
  underloaded: boolean
  /** the cube the empty space is costing, in words */
  note: string
}

export function loadPlan(delivery: Delivery): LoadPlan {
  const cbm = delivery.units.reduce((a, u) => a + u.cbm, 0)
  const weightKg = delivery.units.reduce((a, u) => a + u.grossWeightKg, 0)
  const cartons = delivery.units.reduce((a, u) => a + u.cartons, 0)
  const spec = CONTAINER_SPECS[delivery.containerType]
  const fillPercent = spec.cbm > 0 ? (cbm / spec.cbm) * 100 : 0
  const weightPercent = spec.payloadKg > 0 ? (weightKg / spec.payloadKg) * 100 : 0
  const containerised = delivery.containerType !== 'NONE'
  const underloaded = containerised && fillPercent < CONTAINER_FILL_FLOOR * 100
  return {
    cbm,
    weightKg,
    cartons,
    capacityCbm: spec.cbm,
    capacityKg: spec.payloadKg,
    fillPercent,
    weightPercent,
    limitedBy: !containerised ? 'NONE' : fillPercent >= weightPercent ? 'CUBE' : 'WEIGHT',
    underloaded,
    note: !containerised
      ? 'Not containerised — freight is by the trip, so the cube does not price it.'
      : underloaded
        ? `${(spec.cbm - cbm).toFixed(1)} m³ of paid space is sailing empty. The freight is the same whether it is full or not.`
        : `${fillPercent.toFixed(0)}% of the cube used. ${weightPercent > 90 ? 'Close to the payload limit, so check the axle weights before it leaves.' : 'Cube-out before weight-out, which is normal for furniture.'}`,
  }
}

/** Documents an export cannot leave without, and which of them are missing. */
export function deliveryDocGate(delivery: Delivery): { ok: boolean; missing: string[]; required: number; done: number } {
  const isExport = delivery.mode === 'EXPORT_FCL' || delivery.mode === 'EXPORT_LCL'
  const needed = delivery.documents.filter((doc) => {
    if (doc.status === 'NOT_APPLICABLE') return false
    const meta = DELIVERY_DOC_TYPES.find((t) => t.value === doc.type)
    return meta ? !meta.exportOnly || isExport : true
  })
  const missing = needed
    .filter((doc) => doc.status !== 'VERIFIED')
    .map((doc) => DELIVERY_DOC_TYPES.find((t) => t.value === doc.type)?.label ?? doc.type)
  return { ok: missing.length === 0, missing, required: needed.length, done: needed.length - missing.length }
}

export const deliveryIsOpen = (s: Delivery['status']) =>
  !['DELIVERED', 'CANCELLED'].includes(s)

/**
 * What a sales order still owes, after everything already dispatched against it.
 * The order line carries `shippedQuantity`, but the deliveries are the audit trail.
 */
export function outstandingByLine(order: SalesOrder, deliveries: Delivery[]) {
  return order.lines.map((line) => {
    const shipped = deliveries
      .filter((dv) => dv.status !== 'CANCELLED')
      .flatMap((dv) => dv.lines)
      .filter((dl) => dl.salesOrderLineId === line.id)
      .reduce((a, dl) => a + dl.quantity, 0)
    const delivered = Math.max(shipped, line.shippedQuantity)
    return { line, delivered, outstanding: Math.max(0, line.quantity - delivered) }
  })
}

/* ==================================================================
   Claims — the cost of poor quality after the goods have gone
   ================================================================== */

export interface ClaimCost {
  /** what the customer asked for */
  claimed: number
  /** what we agreed, or the claim as it stands if it is not settled */
  settled: number
  /** charged back to a carrier or a supplier */
  recovered: number
  /** what actually lands on our margin */
  net: number
  daysOpen: number
  ageing: boolean
  /** whether it was raised inside the window the contract allows */
  inWindow: boolean
}

export function claimCost(claim: Claim): ClaimCost {
  const settled = claim.settledAmount ?? claim.claimedAmount
  const end = claim.closedAt ?? TODAY
  const daysOpen = daysBetween(claim.raisedAt, end)
  const raisedAfterDelivery = claim.deliveryId ? daysOpen : 0
  return {
    claimed: claim.claimedAmount,
    settled,
    recovered: claim.recoveredAmount,
    net: Math.max(0, settled - claim.recoveredAmount),
    daysOpen,
    ageing: !claim.closedAt && daysOpen > CLAIM_AGEING_DAYS,
    inWindow: raisedAfterDelivery <= claim.claimWindowDays,
  }
}

export const claimIsOpen = (s: Claim['status']) => !['CLOSED', 'REJECTED', 'CREDITED'].includes(s)

export interface ClaimSummary {
  open: number
  openValue: number
  /** everything we bore in the last ninety days, whatever the remedy */
  costOfPoorQuality: number
  recovered: number
  /** claims as a share of what we delivered — the number that says whether it is getting worse */
  claimRatePercent: number
  averageDaysToClose: number
  ours: number
  ageing: number
}

export function claimSummary(claims: Claim[], deliveries: Delivery[], orders: SalesOrder[]): ClaimSummary {
  const recent = claims.filter((c) => daysBetween(c.raisedAt, TODAY) <= 90)
  const closed = claims.filter((c) => c.closedAt)
  const deliveredValue = deliveries
    .filter((dv) => dv.status === 'DELIVERED' || dv.status === 'PARTIALLY_ACCEPTED')
    .flatMap((dv) => dv.lines)
    .reduce((a, dl) => {
      const order = orders.find((o) => o.id === dl.salesOrderId)
      const line = order?.lines.find((l) => l.id === dl.salesOrderLineId)
      return a + (line ? line.unitPrice * (order!.fxRate || 1) * dl.quantity : 0)
    }, 0)
  const open = claims.filter((c) => claimIsOpen(c.status))
  const cost = recent.reduce((a, c) => a + claimCost(c).net, 0)
  return {
    open: open.length,
    openValue: open.reduce((a, c) => a + claimCost(c).settled, 0),
    costOfPoorQuality: cost,
    recovered: recent.reduce((a, c) => a + c.recoveredAmount, 0),
    claimRatePercent: deliveredValue > 0 ? (cost / deliveredValue) * 100 : 0,
    averageDaysToClose: closed.length
      ? closed.reduce((a, c) => a + daysBetween(c.raisedAt, c.closedAt!), 0) / closed.length
      : 0,
    ours: open.filter((c) => c.liability === 'OURS').length,
    ageing: open.filter((c) => claimCost(c).ageing).length,
  }
}

/** Who caused what, by value. A supplier's share belongs on their scorecard. */
export function claimsByLiability(claims: Claim[]) {
  const map = new Map<string, { liability: string; count: number; value: number }>()
  claims.forEach((c) => {
    const row = map.get(c.liability) ?? { liability: c.liability, count: 0, value: 0 }
    row.count += 1
    row.value += claimCost(c).settled
    map.set(c.liability, row)
  })
  return [...map.values()].sort((a, b) => b.value - a.value)
}

/* ==================================================================
   Cash — receipts, payments and what is left in the bank
   ================================================================== */

export const paymentIsCash = (p: Payment) => p.status === 'CLEARED' && p.method !== 'OFFSET'

/** Net amount that actually moved through the bank, in base currency. */
export function paymentNet(p: Payment): number {
  const rate = p.fxRate || 1
  const gross = p.amount * rate
  return p.direction === 'IN'
    ? gross - p.withholdingTax - p.bankCharge
    : -(gross - p.withholdingTax + p.bankCharge)
}

export function bankBalance(accountId: string, openingBalance: number, payments: Payment[]): number {
  return payments
    .filter((p) => p.bankAccountId === accountId && paymentIsCash(p))
    .reduce((a, p) => a + paymentNet(p), openingBalance)
}

/** What is still owed on an invoice once every allocation against it is counted. */
export function invoiceOutstanding(invoice: Invoice, payments: Payment[]): number {
  const allocated = payments
    .filter((p) => p.status === 'CLEARED')
    .flatMap((p) => p.allocations)
    .filter((a) => a.invoiceId === invoice.id)
    .reduce((a, x) => a + x.amount, 0)
  return Math.max(0, invoice.total - Math.max(invoice.paidAmount, allocated))
}

export interface CashPosition {
  balance: number
  receivedThisMonth: number
  paidThisMonth: number
  /** cash promised in by due date over the next fortnight, less cash promised out */
  forecastFourteenDays: number
  receivable: number
  payable: number
  /** money held back at source that we get to reclaim, not lose */
  withheldThisYear: number
  unapplied: number
}

export function cashPosition(
  accounts: { id: string; openingBalance: number }[],
  payments: Payment[],
  invoices: Invoice[],
): CashPosition {
  const balance = accounts.reduce((a, acc) => a + bankBalance(acc.id, acc.openingBalance, payments), 0)
  const monthStart = `${TODAY.slice(0, 7)}-01`
  const cleared = payments.filter(paymentIsCash)
  const horizon = 14
  const dueIn = invoices
    .filter((i) => i.kind === 'AR' && i.status !== 'PAID' && i.status !== 'VOID')
    .filter((i) => daysBetween(TODAY, i.dueDate) <= horizon)
    .reduce((a, i) => a + invoiceOutstanding(i, payments), 0)
  const dueOut = invoices
    .filter((i) => i.kind === 'AP' && i.status !== 'PAID' && i.status !== 'VOID')
    .filter((i) => daysBetween(TODAY, i.dueDate) <= horizon)
    .reduce((a, i) => a + invoiceOutstanding(i, payments), 0)
  return {
    balance,
    receivedThisMonth: cleared.filter((p) => p.direction === 'IN' && p.date >= monthStart).reduce((a, p) => a + paymentNet(p), 0),
    paidThisMonth: cleared.filter((p) => p.direction === 'OUT' && p.date >= monthStart).reduce((a, p) => a - paymentNet(p), 0),
    forecastFourteenDays: balance + dueIn - dueOut,
    receivable: invoices.filter((i) => i.kind === 'AR').reduce((a, i) => a + invoiceOutstanding(i, payments), 0),
    payable: invoices.filter((i) => i.kind === 'AP').reduce((a, i) => a + invoiceOutstanding(i, payments), 0),
    withheldThisYear: payments.filter((p) => p.status === 'CLEARED' && p.date >= `${TODAY.slice(0, 4)}-01-01`).reduce((a, p) => a + p.withholdingTax, 0),
    unapplied: cleared
      .filter((p) => p.direction === 'IN')
      .reduce((a, p) => a + Math.max(0, p.amount * (p.fxRate || 1) - p.allocations.reduce((x, al) => x + al.amount, 0)), 0),
  }
}

/** Money in and out by week, so the forecast is a shape rather than a single figure. */
export function cashByWeek(payments: Payment[], weeks = 8) {
  const out: { week: string; from: string; inflow: number; outflow: number; net: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(TODAY)
    end.setDate(end.getDate() - i * 7)
    const start = new Date(end)
    start.setDate(start.getDate() - 6)
    const from = start.toISOString().slice(0, 10)
    const to = end.toISOString().slice(0, 10)
    const rows = payments.filter((p) => paymentIsCash(p) && p.date >= from && p.date <= to)
    const inflow = rows.filter((p) => p.direction === 'IN').reduce((a, p) => a + paymentNet(p), 0)
    const outflow = rows.filter((p) => p.direction === 'OUT').reduce((a, p) => a - paymentNet(p), 0)
    out.push({ week: to.slice(5), from, inflow, outflow, net: inflow - outflow })
  }
  return out
}

/** A deposit is a receipt with nowhere to go yet — it belongs to an order, not an invoice. */
export function depositCoverage(order: SalesOrder, payments: Payment[], products: Product[]): {
  required: number
  received: number
  shortfall: number
  covered: boolean
} {
  const rate = order.fxRate || 1
  const value = order.lines.reduce((a, l) => a + l.unitPrice * l.quantity * rate, 0)
  void products
  const required = (value * order.depositPercent) / 100
  const received = Math.max(
    order.depositReceived,
    payments
      .filter((p) => p.status === 'CLEARED' && p.direction === 'IN')
      .flatMap((p) => p.allocations.map((a) => ({ a, rate: p.fxRate || 1 })))
      .filter((x) => x.a.salesOrderId === order.id)
      .reduce((a, x) => a + x.a.amount, 0),
  )
  return { required, received, shortfall: Math.max(0, required - received), covered: received >= required - 1 }
}

export const asCurrency = (c: Currency) => c
