import type { ClientReceipt, Invoice, PaymentMethod } from './types'
import { iso } from './seed-util'
import { clients } from './seed-clients'
import { projects } from './seed-projects'
import { positions } from './seed-org'
import { PPH23_RATE, PPN_RATE, buildInvoiceLines, coversPeriod, invoiceTotals } from '@/lib/finance'

/* ------------------------------------------------------------------
   The billing book.

   Four months of invoices raised from the contracts that were running in
   each one, with the same buildInvoiceLines() the Raise button calls — so a
   bill in this file and a bill made by pressing the button are identical,
   deductions included.

   The collection pattern is deliberately uneven, because it always is: the
   oldest months are settled, last month is half collected, this month has
   only just gone out, and two clients are late — one of them badly.
   ------------------------------------------------------------------ */

const FINANCE = 'Maya Puspita'

/** Periods, oldest first. Today is inside the last one. */
const PERIODS: { month: number; year: number; issuedDaysAgo: number }[] = [
  { month: 6, year: 2026, issuedDaysAgo: 98 },
  { month: 7, year: 2026, issuedDaysAgo: 68 },
  { month: 8, year: 2026, issuedDaysAgo: 37 },
  { month: 9, year: 2026, issuedDaysAgo: 6 },
]

/** Clients that pay slowly, and the one whose invoices have stopped being paid at all. */
const SLOW = new Set(['clt_nam', 'clt_gms'])
const STOPPED = 'clt_rsi'

let invSeq = 0
let rcpSeq = 0

export const invoices: Invoice[] = []
export const clientReceipts: ClientReceipt[] = []

function bill(projectId: string, month: number, year: number, issuedDaysAgo: number): Invoice | null {
  const project = projects.find((p) => p.id === projectId)
  if (!project) return null
  const client = clients.find((c) => c.id === project.clientId)
  if (!client) return null

  const lines = buildInvoiceLines(project, positions)
  if (lines.length === 0) return null

  invSeq += 1
  const issuedAt = iso(-issuedDaysAgo)
  const termDays = project.paymentTermDays || client.paymentTermDays
  const due = new Date(issuedAt)
  due.setDate(due.getDate() + termDays)

  return {
    id: `inv_${year}_${String(month).padStart(2, '0')}_${String(invSeq).padStart(3, '0')}`,
    code: `INV-${year}-${String(month).padStart(2, '0')}-${String(invSeq).padStart(4, '0')}`,
    clientId: client.id,
    projectId: project.id,
    periodMonth: month,
    periodYear: year,
    status: 'ISSUED',
    lines,
    poNumber: `PO-${client.code.replace('CLT-', '')}/${year}/${String(month).padStart(2, '0')}`,
    issuedAt,
    dueAt: due.toISOString(),
    paymentTermDays: termDays,
    ppnRate: client.ppnApplicable ? PPN_RATE : 0,
    pph23Rate: client.pph23Withheld ? PPH23_RATE : 0,
    createdBy: FINANCE,
    createdAt: issuedAt,
    updatedAt: issuedAt,
  }
}

function collect(
  invoice: Invoice,
  daysAfterIssue: number,
  portion: number | 'FULL',
  extra: { method?: PaymentMethod; note?: string } = {},
): ClientReceipt {
  rcpSeq += 1
  const { due } = invoiceTotals(invoice)
  const already = clientReceipts.filter((r) => r.invoiceId === invoice.id).reduce((a, r) => a + r.amount, 0)
  const amount = portion === 'FULL' ? due - already : Math.round(due * portion)
  const at = new Date(invoice.issuedAt!)
  at.setDate(at.getDate() + daysAfterIssue)

  return {
    id: `rcp_${String(rcpSeq).padStart(3, '0')}`,
    code: `RCP-2026-${String(rcpSeq).padStart(4, '0')}`,
    invoiceId: invoice.id,
    clientId: invoice.clientId,
    amount,
    method: extra.method ?? 'TRANSFER',
    receivedAt: at.toISOString(),
    reference: `TRF/IN/${invoice.code.slice(-8).replace('-', '')}`,
    bankAccount: 'BCA 206-3001-4455',
    recordedBy: FINANCE,
    createdAt: at.toISOString(),
    note: extra.note,
  }
}

/* ---------------- raise the book ---------------- */

PERIODS.forEach(({ month, year, issuedDaysAgo }, periodIndex) => {
  const billable = projects.filter((p) => (p.status === 'ACTIVE' || p.status === 'COMPLETED') && coversPeriod(p, month, year))

  billable.forEach((project, index) => {
    const invoice = bill(project.id, month, year, issuedDaysAgo - (index % 3))
    if (!invoice) return

    const current = periodIndex === PERIODS.length - 1
    const slow = SLOW.has(invoice.clientId)
    const stopped = invoice.clientId === STOPPED

    /* This month's bills for two of the sites are still being checked internally. */
    if (current && index % 5 === 0) {
      invoice.status = 'DRAFT'
      invoice.issuedAt = undefined
      invoice.dueAt = undefined
      invoice.note = 'Menunggu konfirmasi absensi dari koordinator sebelum diterbitkan.'
    }

    invoices.push(invoice)
    if (invoice.status === 'DRAFT' || stopped) return

    if (periodIndex <= 1) {
      /* The two oldest months are closed, one of them after a nudge. */
      clientReceipts.push(collect(invoice, slow ? invoice.paymentTermDays + 12 : invoice.paymentTermDays - 3, 'FULL'))
    } else if (periodIndex === 2) {
      if (slow) {
        /* Last month: a part payment and a promise. */
        clientReceipts.push(
          collect(invoice, invoice.paymentTermDays + 4, 0.5, { note: 'Pembayaran sebagian; sisanya menunggu approval klien.' }),
        )
      } else if (index % 4 !== 0) {
        clientReceipts.push(collect(invoice, invoice.paymentTermDays - 1, 'FULL'))
      }
      /* Every fourth one is simply not paid yet, and is now past its term. */
    } else if (index % 3 === 0) {
      /* This month: a few clients have paid early. */
      clientReceipts.push(collect(invoice, 4, 'FULL', { note: 'Dibayar lebih cepat dari termin.' }))
    }
  })
})

/* Status follows the money, exactly as the runtime derives it. */
invoices.forEach((invoice) => {
  if (invoice.status === 'DRAFT') return
  const received = clientReceipts.filter((r) => r.invoiceId === invoice.id).reduce((a, r) => a + r.amount, 0)
  const { due } = invoiceTotals(invoice)
  invoice.status = received <= 0 ? 'ISSUED' : received >= due ? 'PAID' : 'PARTIALLY_PAID'
})

/* One bill was raised against the wrong contract and withdrawn — the period was
   then billed again, which is what voiding is for. */
const mistake = invoices.find((i) => i.periodMonth === 8 && i.status === 'PAID')
if (mistake) {
  invSeq += 1
  const voided: Invoice = {
    ...structuredClone(mistake),
    id: `${mistake.id}_void`,
    code: `INV-2026-08-${String(invSeq).padStart(4, '0')}`,
    status: 'VOID',
    voidReason: 'Salah kontrak — nomor PO klien milik proyek lain. Diterbitkan ulang dengan nomor baru.',
    note: undefined,
  }
  invoices.push(voided)
}
