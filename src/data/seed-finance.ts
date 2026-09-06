/**
 * Finance — the chart of accounts, what suppliers have invoiced us, what we
 * have invoiced buyers, the money that has actually moved, and the ledger that
 * ties the three together.
 *
 * Supplier bills are raised from goods receipts, not from orders, so the
 * three-way match has something real to fail on.
 */
import type {
  Account, JournalEntry, JournalLine, Payment, PaymentAllocation, SalesInvoice, SupplierBill,
} from './types'
import { day, intBetween, pick, rng, round, stamp } from './clock'
import { buyers, suppliers } from './seed-master'
import { goodsReceipts, purchaseOrders } from './seed-procurement'
import { projects } from './seed-projects'
import { paymentTerm, stageIndex } from './reference'

/* ==================================================================
   Chart of accounts
   ================================================================== */

const acc = (code: string, name: string, type: Account['type'], group: string, description?: string): Account =>
  ({ id: `acc_${code}`, code, name, type, group, active: true, description })

export const accounts: Account[] = [
  acc('1000', 'Cash on hand', 'ASSET', 'Cash & bank'),
  acc('1010', 'Bank — Mandiri IDR', 'ASSET', 'Cash & bank'),
  acc('1020', 'Bank — Mandiri USD', 'ASSET', 'Cash & bank', 'Export receipts land here before conversion.'),
  acc('1030', 'Bank — BNI EUR', 'ASSET', 'Cash & bank'),
  acc('1100', 'Accounts receivable — export', 'ASSET', 'Receivables'),
  acc('1110', 'Advances to suppliers', 'ASSET', 'Receivables', 'Deposits paid before a sawmill will cut.'),
  acc('1200', 'Inventory — raw material', 'ASSET', 'Inventory'),
  acc('1210', 'Inventory — work in progress', 'ASSET', 'Inventory'),
  acc('1220', 'Inventory — finished goods', 'ASSET', 'Inventory'),
  acc('1230', 'Inventory — goods at subcontractors', 'ASSET', 'Inventory', 'Our material, in somebody else’s shed.'),
  acc('1300', 'Prepaid expenses', 'ASSET', 'Other current'),
  acc('1400', 'VAT input', 'ASSET', 'Tax'),
  acc('1500', 'Machinery & equipment', 'ASSET', 'Fixed assets'),
  acc('1510', 'Accumulated depreciation', 'ASSET', 'Fixed assets'),
  acc('2000', 'Accounts payable — trade', 'LIABILITY', 'Payables'),
  acc('2010', 'Accrued expenses', 'LIABILITY', 'Payables'),
  acc('2020', 'Customer deposits', 'LIABILITY', 'Payables', 'Deposits received against orders not yet shipped.'),
  acc('2100', 'VAT output', 'LIABILITY', 'Tax'),
  acc('2110', 'Income tax payable', 'LIABILITY', 'Tax'),
  acc('2200', 'Bank loan — working capital', 'LIABILITY', 'Borrowings'),
  acc('3000', 'Share capital', 'EQUITY', 'Equity'),
  acc('3100', 'Retained earnings', 'EQUITY', 'Equity'),
  acc('4000', 'Export sales', 'REVENUE', 'Revenue'),
  acc('4100', 'Sample income', 'REVENUE', 'Revenue', 'Sample costs re-charged from the second round onwards.'),
  acc('4900', 'Foreign exchange gain', 'REVENUE', 'Other income'),
  acc('5000', 'Material — timber', 'EXPENSE', 'Cost of sales'),
  acc('5010', 'Material — panel', 'EXPENSE', 'Cost of sales'),
  acc('5020', 'Material — hardware', 'EXPENSE', 'Cost of sales'),
  acc('5030', 'Material — finishing', 'EXPENSE', 'Cost of sales'),
  acc('5040', 'Material — upholstery', 'EXPENSE', 'Cost of sales'),
  acc('5050', 'Material — packaging', 'EXPENSE', 'Cost of sales'),
  acc('5100', 'Direct labour', 'EXPENSE', 'Cost of sales'),
  acc('5110', 'Subcontract labour', 'EXPENSE', 'Cost of sales'),
  acc('5200', 'Factory overhead', 'EXPENSE', 'Cost of sales'),
  acc('5300', 'Export logistics', 'EXPENSE', 'Cost of sales'),
  acc('5310', 'Certification & compliance', 'EXPENSE', 'Cost of sales'),
  acc('5400', 'Inventory write-off', 'EXPENSE', 'Cost of sales'),
  acc('6000', 'Salaries — administration', 'EXPENSE', 'Operating'),
  acc('6100', 'Selling & marketing', 'EXPENSE', 'Operating'),
  acc('6200', 'Sample & prototype cost', 'EXPENSE', 'Operating'),
  acc('6300', 'Professional fees', 'EXPENSE', 'Operating'),
  acc('6400', 'Bank charges', 'EXPENSE', 'Operating'),
  acc('6900', 'Foreign exchange loss', 'EXPENSE', 'Operating'),
]

const accountName = (code: string) => accounts.find((a) => a.code === code)?.name ?? code

/* ==================================================================
   Supplier bills — raised against what was received
   ================================================================== */

const bills: SupplierBill[] = []
let billSeq = 0

goodsReceipts
  .filter((g) => g.posted && g.lines.some((l) => l.qtyAccepted > 0))
  .forEach((grn, i) => {
    const r = rng(81_000 + i * 13)
    const po = purchaseOrders.find((p) => p.id === grn.poId)
    if (!po) return
    const supplier = suppliers.find((s) => s.id === grn.supplierId)!

    const subtotal = grn.lines.reduce((a, gl) => {
      const pl = po.lines.find((x) => x.id === gl.poLineId)
      return a + gl.qtyAccepted * (pl?.unitPrice ?? 0)
    }, 0)
    if (subtotal <= 0) return

    /* most suppliers invoice what they delivered; a few invoice the order */
    const overbill = r() > 0.86 ? 1 + 0.04 + r() * 0.05 : 1
    const gross = round(subtotal * overbill, 0)
    const issuedDay = Math.round((new Date(grn.receivedAt).getTime() - Date.now()) / 86_400_000) + intBetween(r, 1, 6)
    const dueDay = issuedDay + supplier.paymentTermDays

    let status: SupplierBill['status']
    if (overbill > 1) status = 'DISPUTED'
    else if (dueDay < -3) status = r() > 0.78 ? 'OVERDUE' : 'PAID'
    else if (r() > 0.55) status = 'PAID'
    else if (r() > 0.3) status = 'APPROVED'
    else status = 'AWAITING_APPROVAL'

    const paid = status === 'PAID' ? gross * 1.11 : 0

    bills.push({
      id: `bill_${grn.id}`,
      code: `BILL-26-${String(++billSeq + 600).padStart(4, '0')}`,
      supplierInvoiceNo: `INV/${supplier.code.slice(-4)}/${intBetween(r, 1000, 9999)}`,
      supplierId: grn.supplierId,
      supplierName: grn.supplierName,
      poId: po.id,
      receiptIds: [grn.id],
      projectId: grn.projectId,
      status,
      issuedAt: day(issuedDay),
      dueAt: day(dueDay),
      currency: 'IDR',
      subtotal: gross,
      taxAmount: round(gross * 0.11, 0),
      paidAmount: round(paid, 0),
      approvedByName: ['AWAITING_APPROVAL'].includes(status) ? undefined : 'Lestari Wijaya',
      disputeReason:
        status === 'DISPUTED'
          ? `Invoiced ${Math.round((overbill - 1) * 100)}% above the goods receipt. The supplier billed the ordered quantity rather than the quantity we accepted.`
          : undefined,
    })
  })

/* one bill with no receipt behind it at all — the classic */
bills.push({
  id: 'bill_orphan',
  code: `BILL-26-${String(++billSeq + 600).padStart(4, '0')}`,
  supplierInvoiceNo: 'INV/1017/4471',
  supplierId: 'sup_17',
  supplierName: 'PT Fumigasi Nusantara',
  receiptIds: [],
  projectId: 'prj_0038',
  status: 'AWAITING_APPROVAL',
  issuedAt: day(-5),
  dueAt: day(9),
  currency: 'IDR',
  subtotal: 3_800_000,
  taxAmount: 418_000,
  paidAmount: 0,
  note: 'A service, so there is nothing to receive against it. Finance approves it on the certificate rather than a goods receipt.',
})

/* ==================================================================
   Sales invoices — deposit, then the balance
   ================================================================== */

const salesInvoices: SalesInvoice[] = []
let invSeq = 0

projects
  .filter((p) => p.status !== 'LOST' && stageIndex(p.stage) >= stageIndex('ORDER_CONFIRMED'))
  .forEach((project, i) => {
    const r = rng(91_000 + i * 17)
    const buyer = buyers.find((b) => b.id === project.buyerId)!
    const term = paymentTerm(project.paymentTerm)
    const idx = stageIndex(project.stage)

    if (project.depositPct > 0) {
      const amount = round(project.contractValue * (project.depositPct / 100), 2)
      const received = !!project.depositReceivedAt
      const issuedDay = Math.round((new Date(project.poAt ?? project.inquiryAt).getTime() - Date.now()) / 86_400_000) + 2
      salesInvoices.push({
        id: `inv_${project.id}_dep`,
        code: `INV-26-${String(++invSeq + 700).padStart(4, '0')}`,
        kind: 'DEPOSIT',
        projectId: project.id,
        buyerId: buyer.id,
        buyerName: buyer.tradingName,
        status: received ? 'PAID' : issuedDay + 14 < 0 ? 'OVERDUE' : 'ISSUED',
        issuedAt: day(issuedDay),
        dueAt: day(issuedDay + 14),
        currency: project.currency,
        amount,
        paidAmount: received ? amount : 0,
        exchangeRate: project.exchangeRate,
        note: `${project.depositPct}% deposit. Nothing is bought against this order until it clears.`,
      })
    }

    if (idx >= stageIndex('SHIPPED')) {
      const amount = round(project.contractValue * (1 - project.depositPct / 100), 2)
      const shipDay = Math.round((new Date(project.actualShipAt ?? project.targetShipAt).getTime() - Date.now()) / 86_400_000)
      const dueDay = shipDay + (term?.netDays ?? 30)
      const paid = idx >= stageIndex('CLOSED') ? amount : r() > 0.5 ? amount : 0
      salesInvoices.push({
        id: `inv_${project.id}_fin`,
        code: `INV-26-${String(++invSeq + 700).padStart(4, '0')}`,
        kind: 'FINAL',
        projectId: project.id,
        buyerId: buyer.id,
        buyerName: buyer.tradingName,
        status: paid >= amount ? 'PAID' : dueDay < 0 ? 'OVERDUE' : 'ISSUED',
        issuedAt: day(shipDay + 1),
        dueAt: day(dueDay),
        currency: project.currency,
        amount,
        paidAmount: paid,
        exchangeRate: project.exchangeRate,
        note: 'Balance against the bill of lading copy.',
      })
    } else if (idx >= stageIndex('QC_PACKING')) {
      salesInvoices.push({
        id: `inv_${project.id}_pro`,
        code: `INV-26-${String(++invSeq + 700).padStart(4, '0')}`,
        kind: 'PROFORMA',
        projectId: project.id,
        buyerId: buyer.id,
        buyerName: buyer.tradingName,
        status: 'DRAFT',
        issuedAt: day(-2),
        dueAt: day(20),
        currency: project.currency,
        amount: round(project.contractValue * (1 - project.depositPct / 100), 2),
        paidAmount: 0,
        exchangeRate: project.exchangeRate,
        note: 'Proforma for the balance, issued so the buyer can open the transfer before the container sails.',
      })
    }
  })

/* Casa Verde's two overdue invoices, which are why they are on hold */
salesInvoices.push(
  {
    id: 'inv_cv_1', code: `INV-26-${String(++invSeq + 700).padStart(4, '0')}`, kind: 'FINAL',
    projectId: 'prj_0046', buyerId: 'buy_07', buyerName: 'Casa Verde', status: 'OVERDUE',
    issuedAt: day(-88), dueAt: day(-43), currency: 'EUR', amount: 84_200, paidAmount: 0, exchangeRate: 17_850,
    note: 'Forty-three days past due. The reason nothing new may be quoted to this buyer.',
  },
  {
    id: 'inv_cv_2', code: `INV-26-${String(++invSeq + 700).padStart(4, '0')}`, kind: 'FINAL',
    projectId: 'prj_0046', buyerId: 'buy_07', buyerName: 'Casa Verde', status: 'OVERDUE',
    issuedAt: day(-64), dueAt: day(-19), currency: 'EUR', amount: 74_100, paidAmount: 0, exchangeRate: 17_850,
  },
)

/* ==================================================================
   Payments
   ================================================================== */

const payments: Payment[] = []
let paySeq = 0

bills
  .filter((b) => b.paidAmount > 0)
  .forEach((bill, i) => {
    const r = rng(101_000 + i * 7)
    const alloc: PaymentAllocation[] = [{ id: `pa_${bill.id}`, targetId: bill.id, targetCode: bill.code, amount: bill.paidAmount }]
    payments.push({
      id: `pay_out_${bill.id}`,
      code: `PAY-26-${String(++paySeq + 800).padStart(4, '0')}`,
      direction: 'OUT',
      method: bill.paidAmount > 20_000_000 ? 'BANK_TRANSFER' : pick(r, ['BANK_TRANSFER', 'CASH'] as Payment['method'][]),
      at: day(Math.round((new Date(bill.dueAt).getTime() - Date.now()) / 86_400_000) - intBetween(r, 0, 5)),
      counterpartyId: bill.supplierId,
      counterpartyName: bill.supplierName,
      currency: 'IDR',
      amount: bill.paidAmount,
      exchangeRate: 1,
      bankAccountNo: '136-00-0918442-7',
      reference: `Settlement of ${bill.supplierInvoiceNo}`,
      projectId: bill.projectId,
      allocations: alloc,
    })
  })

salesInvoices
  .filter((iv) => iv.paidAmount > 0)
  .forEach((iv, i) => {
    const r = rng(111_000 + i * 5)
    payments.push({
      id: `pay_in_${iv.id}`,
      code: `PAY-26-${String(++paySeq + 800).padStart(4, '0')}`,
      direction: 'IN',
      method: iv.currency === 'USD' ? 'LETTER_OF_CREDIT' : 'BANK_TRANSFER',
      at: day(Math.round((new Date(iv.dueAt).getTime() - Date.now()) / 86_400_000) - intBetween(r, 0, 8)),
      counterpartyId: iv.buyerId,
      counterpartyName: iv.buyerName,
      currency: iv.currency,
      amount: iv.paidAmount,
      exchangeRate: iv.exchangeRate,
      bankAccountNo: iv.currency === 'EUR' ? '0771 448 926' : '136-00-0918450-1',
      reference: `Against ${iv.code} — ${iv.kind.toLowerCase()}`,
      projectId: iv.projectId,
      allocations: [{ id: `pa_${iv.id}`, targetId: iv.id, targetCode: iv.code, amount: iv.paidAmount }],
    })
  })

/* ==================================================================
   The ledger
   ================================================================== */

const journal: JournalEntry[] = []
let jeSeq = 0

const jl = (accountCode: string, debit: number, credit: number, memo?: string, projectId?: string): JournalLine => ({
  id: `jl_${accountCode}_${Math.round(debit + credit)}_${Math.random().toString(36).slice(2, 6)}`,
  accountCode,
  accountName: accountName(accountCode),
  debit: round(debit, 0),
  credit: round(credit, 0),
  memo,
  projectId,
})

const post = (e: Omit<JournalEntry, 'id' | 'code'>) => {
  journal.push({ id: `je_${++jeSeq}`, code: `JE-26-${String(jeSeq + 1000).padStart(4, '0')}`, ...e })
}

/** Which cost-of-sales account a supplier's trade lands in. */
const EXPENSE_BY_TYPE: Record<string, string> = {
  SAWMILL: '5000', PANEL: '5010', HARDWARE: '5020', FINISHING: '5030', UPHOLSTERY: '5040',
  PACKAGING: '5050', SUBCON_WORKSHOP: '5110', SERVICE: '5310', LOGISTICS: '5300',
}

bills.slice(0, 26).forEach((bill) => {
  const supplier = suppliers.find((s) => s.id === bill.supplierId)!
  const expense = EXPENSE_BY_TYPE[supplier.type] ?? '5000'
  post({
    at: stamp(Math.round((new Date(bill.issuedAt).getTime() - Date.now()) / 86_400_000), 16),
    status: 'POSTED',
    source: 'Supplier bill',
    refCode: bill.code,
    memo: `${bill.supplierName} — ${bill.supplierInvoiceNo}`,
    projectId: bill.projectId,
    postedByName: 'Lestari Wijaya',
    lines: [
      jl(expense, bill.subtotal, 0, 'Goods and services received', bill.projectId),
      jl('1400', bill.taxAmount, 0, 'VAT input'),
      jl('2000', 0, bill.subtotal + bill.taxAmount, 'Trade payable'),
    ],
  })
})

salesInvoices.slice(0, 18).forEach((iv) => {
  const idr = iv.amount * iv.exchangeRate
  post({
    at: stamp(Math.round((new Date(iv.issuedAt).getTime() - Date.now()) / 86_400_000), 15),
    status: 'POSTED',
    source: iv.kind === 'DEPOSIT' ? 'Deposit invoice' : 'Sales invoice',
    refCode: iv.code,
    memo: `${iv.buyerName} — ${iv.kind.toLowerCase()} against ${iv.projectId}`,
    projectId: iv.projectId,
    postedByName: 'Lestari Wijaya',
    lines:
      iv.kind === 'DEPOSIT'
        ? [jl('1100', idr, 0, 'Receivable', iv.projectId), jl('2020', 0, idr, 'Customer deposit held', iv.projectId)]
        : [
            jl('1100', idr, 0, 'Receivable', iv.projectId),
            jl('4000', 0, idr, 'Export sales', iv.projectId),
          ],
  })
})

payments.slice(0, 30).forEach((p) => {
  const idr = p.amount * p.exchangeRate
  post({
    at: stamp(Math.round((new Date(p.at).getTime() - Date.now()) / 86_400_000), 11),
    status: 'POSTED',
    source: p.direction === 'IN' ? 'Customer receipt' : 'Supplier payment',
    refCode: p.code,
    memo: p.reference,
    projectId: p.projectId,
    postedByName: 'Lestari Wijaya',
    lines:
      p.direction === 'IN'
        ? [jl(p.currency === 'IDR' ? '1010' : p.currency === 'EUR' ? '1030' : '1020', idr, 0, 'Funds received'), jl('1100', 0, idr, 'Receivable cleared', p.projectId)]
        : [jl('2000', idr, 0, 'Payable settled', p.projectId), jl('1010', 0, idr, 'Bank')],
  })
})

/* a handful of entries nobody automated */
post({
  at: stamp(-3, 17),
  status: 'POSTED',
  source: 'Manual',
  memo: 'Monthly depreciation — machinery and kiln plant',
  postedByName: 'Lestari Wijaya',
  lines: [jl('5200', 118_400_000, 0, 'Absorbed into factory overhead'), jl('1510', 0, 118_400_000)],
})
post({
  at: stamp(-2, 16, 30),
  status: 'POSTED',
  source: 'Manual',
  memo: 'Sample costs written to expense for the quarter',
  postedByName: 'Lestari Wijaya',
  lines: [jl('6200', 42_600_000, 0, 'Samples made and couriered'), jl('1220', 0, 42_600_000)],
})
post({
  at: stamp(-1, 9),
  status: 'DRAFT',
  source: 'Manual',
  memo: 'Revaluation of the USD and EUR accounts at the month-end rate — not yet reviewed',
  postedByName: 'Lestari Wijaya',
  lines: [jl('1020', 0, 61_200_000), jl('6900', 61_200_000, 0, 'Unrealised loss on the USD balance')],
})

journal.sort((a, b) => (a.at < b.at ? 1 : -1))

export { bills, salesInvoices, payments, journal }
