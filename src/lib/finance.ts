import type {
  Client, ClientReceipt, Invoice, InvoiceLine, Position, Project,
} from '@/data/types'
import { contractMonths } from './domain'

/* ------------------------------------------------------------------
   Billing the client.

   The company's one number is deployed ÷ contracted. Everything upstream
   measures it; this file is where it finally costs somebody money. An
   invoice bills the contracted headcount and then deducts the posts that
   were not filled, so a gap on the deployment board and a smaller payment
   into the bank are the same fact seen twice.

   Two Indonesian mechanics:

     PPN 11%   added to what the client owes.
     PPh 23 2% withheld by the client from the service value and paid to the
               tax office on our behalf — it never reaches our account.

   So:  subtotal = services − deductions ± adjustments
        total    = subtotal + PPN
        due      = total − PPh 23        ← what actually arrives
   ------------------------------------------------------------------ */

export const PPN_RATE = 0.11
export const PPH23_RATE = 0.02

/* ================================================================
   What can be billed
   ================================================================ */

/** Whether a contract was running during that month at all. */
export function coversPeriod(project: Project, month: number, year: number) {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const last = new Date(Date.UTC(year, month, 0))
  return new Date(project.periodStart) <= last && new Date(project.periodEnd) >= first
}

/**
 * Projects that can be billed for a period: a live contract that covered the
 * month and has no invoice for it yet. A cancelled invoice frees the period
 * again — that is the point of voiding one.
 */
export function billableProjects(projects: Project[], invoices: Invoice[], month: number, year: number) {
  return projects.filter((p) => {
    if (p.status !== 'ACTIVE' && p.status !== 'COMPLETED') return false
    if (!coversPeriod(p, month, year)) return false
    return !invoices.some(
      (i) => i.projectId === p.id && i.periodMonth === month && i.periodYear === year && i.status !== 'VOID',
    )
  })
}

/* ================================================================
   Building one
   ================================================================ */

const SHIFT_LABEL: Record<string, string> = {
  PAGI: 'shift pagi', SIANG: 'shift siang', MALAM: 'shift malam', NON_SHIFT: 'non-shift',
}

/**
 * The lines of one month's bill, straight off the contract.
 *
 * A service line is the contracted headcount at the contracted rate. Where
 * fewer people stood on site than the contract calls for, a deduction line
 * follows it at the same rate — a month of an unfilled post is a month the
 * client did not receive what it is paying for. The two are kept apart rather
 * than netted, because the client's own finance team will ask which is which.
 *
 * The management fee is *not* a separate line: the bill rate is already the
 * client's price, and the fee is the margin inside it.
 */
export function buildInvoiceLines(project: Project, positions: Position[]): InvoiceLine[] {
  const lines: InvoiceLine[] = []

  project.requirements.forEach((req) => {
    const position = positions.find((p) => p.id === req.positionId)
    const name = position?.name ?? 'Posisi'
    const shift = SHIFT_LABEL[req.shift] ?? req.shift.toLowerCase()

    lines.push({
      id: `inl_${req.id}_svc`,
      kind: 'SERVICE',
      requirementId: req.id,
      positionId: req.positionId,
      shift: req.shift,
      description: `${name} — ${shift}`,
      qty: req.headcount,
      unitPrice: req.billRate,
      amount: req.headcount * req.billRate,
    })

    const unfilled = Math.max(0, req.headcount - req.deployed)
    if (unfilled > 0) {
      lines.push({
        id: `inl_${req.id}_ded`,
        kind: 'DEDUCTION',
        requirementId: req.id,
        positionId: req.positionId,
        shift: req.shift,
        description: `Potongan pos tidak terisi — ${name}, ${shift}`,
        qty: unfilled,
        unitPrice: req.billRate,
        amount: -(unfilled * req.billRate),
        note: `${unfilled} of ${req.headcount} posts unfilled`,
      })
    }
  })

  return lines
}

/* ================================================================
   The arithmetic on one invoice
   ================================================================ */

export function invoiceTotals(invoice: Invoice) {
  const services = invoice.lines.filter((l) => l.kind === 'SERVICE').reduce((a, l) => a + l.amount, 0)
  /* Deductions are already negative, so this comes out as a negative number. */
  const deductions = invoice.lines.filter((l) => l.kind === 'DEDUCTION').reduce((a, l) => a + l.amount, 0)
  const adjustments = invoice.lines.filter((l) => l.kind === 'ADJUSTMENT').reduce((a, l) => a + l.amount, 0)

  const subtotal = services + deductions + adjustments
  const ppn = Math.round(subtotal * invoice.ppnRate)
  const pph23 = Math.round(subtotal * invoice.pph23Rate)
  const total = subtotal + ppn

  return {
    services,
    deductions,
    adjustments,
    subtotal,
    ppn,
    pph23,
    total,
    /** What the client actually transfers, once it has withheld PPh 23. */
    due: total - pph23,
  }
}

/** How much of the contracted value survived the deductions. */
export function billedShare(invoice: Invoice) {
  const { services, subtotal } = invoiceTotals(invoice)
  return services === 0 ? 0 : (subtotal / services) * 100
}

/* ================================================================
   Money in
   ================================================================ */

export const receiptsOf = (invoiceId: string, receipts: ClientReceipt[]) =>
  receipts.filter((r) => r.invoiceId === invoiceId).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))

/**
 * Where one invoice stands. An invoice not yet issued owes nothing: a draft is
 * a working paper, and nobody can be late paying a bill they have not been sent.
 */
export function invoiceState(invoice: Invoice, receipts: ClientReceipt[], on = new Date()) {
  const rows = receiptsOf(invoice.id, receipts)
  const received = rows.reduce((a, r) => a + r.amount, 0)
  const { due } = invoiceTotals(invoice)
  const outstanding = invoice.status === 'VOID' ? 0 : Math.max(0, due - received)

  const live = invoice.status !== 'DRAFT' && invoice.status !== 'VOID'
  const daysOverdue =
    live && invoice.dueAt && outstanding > 0
      ? Math.max(0, Math.floor((on.getTime() - new Date(invoice.dueAt).getTime()) / 86_400_000))
      : 0

  return {
    receipts: rows,
    received,
    due,
    outstanding,
    live,
    daysOverdue,
    overdue: daysOverdue > 0,
    pct: due === 0 ? 0 : Math.min(100, Math.round((received / due) * 100)),
  }
}

/** The status an invoice should carry, given what has been received against it. */
export function statusAfterReceipt(invoice: Invoice, receipts: ClientReceipt[]): Invoice['status'] {
  if (invoice.status === 'DRAFT' || invoice.status === 'VOID') return invoice.status
  const { outstanding, received } = invoiceState(invoice, receipts)
  if (outstanding <= 0) return 'PAID'
  return received > 0 ? 'PARTIALLY_PAID' : 'ISSUED'
}

/** Why money cannot be recorded against this invoice, or nothing when it can. */
export function receiptProblem(invoice: Invoice, amount: number, receipts: ClientReceipt[]) {
  if (invoice.status === 'VOID') return 'This invoice was cancelled — nothing is owed on it.'
  if (invoice.status === 'DRAFT') return 'Issue the invoice to the client before recording a payment against it.'
  if (!(amount > 0)) return 'Enter an amount greater than zero.'
  const { outstanding } = invoiceState(invoice, receipts)
  if (outstanding <= 0) return 'This invoice is already settled in full.'
  if (amount > outstanding) {
    return `That is more than the ${Math.round(outstanding).toLocaleString('en-US')} still outstanding.`
  }
  return ''
}

/* ================================================================
   Receivables, across every invoice
   ================================================================ */

export function receivableSummary(invoices: Invoice[], receipts: ClientReceipt[]) {
  const live = invoices.filter((i) => i.status !== 'DRAFT' && i.status !== 'VOID')
  let outstanding = 0
  let overdue = 0
  let overdueCount = 0
  live.forEach((invoice) => {
    const state = invoiceState(invoice, receipts)
    outstanding += state.outstanding
    if (state.overdue) {
      overdue += state.outstanding
      overdueCount += 1
    }
  })
  return {
    invoices: live.length,
    billed: live.reduce((a, i) => a + invoiceTotals(i).due, 0),
    received: receipts.reduce((a, r) => a + r.amount, 0),
    outstanding,
    overdue,
    overdueCount,
    drafts: invoices.filter((i) => i.status === 'DRAFT').length,
  }
}

/** What one client owes right now — measured against the credit limit on its record. */
export function clientExposure(client: Client, invoices: Invoice[], receipts: ClientReceipt[]) {
  const rows = invoices.filter((i) => i.clientId === client.id)
  const outstanding = rows.reduce((a, i) => a + invoiceState(i, receipts).outstanding, 0)
  const overdue = rows.reduce((a, i) => {
    const state = invoiceState(i, receipts)
    return a + (state.overdue ? state.outstanding : 0)
  }, 0)
  return {
    invoices: rows.length,
    outstanding,
    overdue,
    limit: client.creditLimit,
    /** Over 100% means the client owes more than it was ever meant to. */
    usedPct: client.creditLimit > 0 ? (outstanding / client.creditLimit) * 100 : 0,
    overLimit: client.creditLimit > 0 && outstanding > client.creditLimit,
  }
}

export const AGE_BUCKETS = [
  { label: 'Not due yet', from: -Infinity, to: 0 },
  { label: '1–30 days', from: 1, to: 30 },
  { label: '31–60 days', from: 31, to: 60 },
  { label: 'Over 60 days', from: 61, to: Infinity },
]

/** The usual receivables ageing: how long the unpaid money has been late. */
export function ageingBuckets(invoices: Invoice[], receipts: ClientReceipt[]) {
  return AGE_BUCKETS.map((bucket) => {
    const rows = invoices.filter((invoice) => {
      const state = invoiceState(invoice, receipts)
      if (!state.live || state.outstanding <= 0) return false
      return state.daysOverdue >= bucket.from && state.daysOverdue <= bucket.to
    })
    return {
      ...bucket,
      count: rows.length,
      value: rows.reduce((a, i) => a + invoiceState(i, receipts).outstanding, 0),
    }
  })
}

/* ================================================================
   The month, both directions
   ================================================================ */

export interface CashPeriod {
  month: number
  year: number
  /** Invoiced to clients, net of what the client withholds. */
  billed: number
  received: number
  /** Paid out to suppliers in the same month. */
  paidOut: number
}

/** Money in against money out, month by month — the shape of the year. */
export function cashByMonth(
  invoices: Invoice[],
  receipts: ClientReceipt[],
  supplierPayments: { paidAt: string; amount: number }[],
  months = 6,
): CashPeriod[] {
  const out: CashPeriod[] = []
  const now = new Date()

  for (let back = months - 1; back >= 0; back -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1)
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    const inMonth = (iso?: string) => {
      if (!iso) return false
      const at = new Date(iso)
      return at.getMonth() + 1 === month && at.getFullYear() === year
    }

    out.push({
      month,
      year,
      billed: invoices
        .filter((i) => i.status !== 'DRAFT' && i.status !== 'VOID' && inMonth(i.issuedAt))
        .reduce((a, i) => a + invoiceTotals(i).due, 0),
      received: receipts.filter((r) => inMonth(r.receivedAt)).reduce((a, r) => a + r.amount, 0),
      paidOut: supplierPayments.filter((p) => inMonth(p.paidAt)).reduce((a, p) => a + p.amount, 0),
    })
  }
  return out
}

/** Contracted value still to be invoiced over the remaining life of the book. */
export function orderBook(projects: Project[]) {
  return projects
    .filter((p) => p.status === 'ACTIVE')
    .reduce((a, p) => {
      const monthly = p.requirements.reduce((x, r) => x + r.headcount * r.billRate, 0)
      const left = Math.max(0, contractMonths(p) - monthsElapsed(p))
      return a + monthly * left
    }, 0)
}

function monthsElapsed(project: Project) {
  const start = new Date(project.periodStart)
  const now = new Date()
  if (now <= start) return 0
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
}
