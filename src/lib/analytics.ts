import type {
  Account, Container, Customer, Invoice, JournalEntry, Project, ProjectCharge, ServicePackage, ShipmentDocument,
} from '@/data/types'
import { COUNTRY_DOC_RULES, STAGES, stageIndex } from '@/data/reference'
import { pluralDays, relativeDays } from './format'
import { utilisation } from './shipping'

/* ---------------- job financials ---------------- */
export interface JobFinancials {
  revenue: number
  cost: number
  margin: number
  marginPct: number
  vat: number
  wht: number
  invoiced: number
  disputed: number
  unapproved: number
}

export function chargeTotals(c: ProjectCharge) {
  const revenue = c.quantity * c.sellRate * c.fxRate
  const cost = c.quantity * c.buyRate * c.fxRate
  return {
    revenue,
    cost,
    margin: revenue - cost,
    vat: c.vatApplicable ? revenue * 0.11 : 0,
    wht: c.whtApplicable ? revenue * 0.02 : 0,
  }
}

export function jobFinancials(charges: ProjectCharge[]): JobFinancials {
  let revenue = 0, cost = 0, vat = 0, wht = 0, invoiced = 0, disputed = 0, unapproved = 0
  for (const c of charges) {
    const t = chargeTotals(c)
    if (c.billable) revenue += t.revenue
    cost += t.cost
    vat += t.vat
    wht += t.wht
    if (c.status === 'INVOICED' || c.status === 'PAID') invoiced += t.revenue
    if (c.status === 'DISPUTED') disputed += t.revenue
    if (c.status === 'DRAFT' || c.status === 'PENDING_APPROVAL') unapproved += t.revenue
  }
  const margin = revenue - cost
  return { revenue, cost, margin, marginPct: revenue ? (margin / revenue) * 100 : 0, vat, wht, invoiced, disputed, unapproved }
}

/* ---------------- stage gating ---------------- */
export interface GateResult {
  canAdvance: boolean
  blockers: string[]
  warnings: string[]
  progressPct: number
}

export function evaluateStageGate(
  project: Project,
  containers: Container[],
  documents: ShipmentDocument[],
  customer?: Customer,
  extra?: { filings?: { type: string; status: string; channel: string; supportingDocs: { mandatory: boolean; uploaded: boolean; label: string }[] }[] },
): GateResult {
  const stage = project.stages.find((s) => s.key === project.stage)
  const blockers: string[] = []
  const warnings: string[] = []
  const tasks = stage?.tasks ?? []
  const openBlocking = tasks.filter((t) => t.blocking && !t.done)
  openBlocking.forEach((t) => blockers.push(t.label))

  if (project.stage === 'INQUIRY' && customer) {
    if (customer.status === 'ON_HOLD' || customer.status === 'BLACKLISTED')
      blockers.push(`Client is ${customer.status.replace('_', ' ').toLowerCase()} — a director release is required`)
    if (customer.outstandingAr > customer.creditLimit && customer.creditLimit > 0)
      blockers.push(
        `Outstanding AR exceeds the credit limit by IDR ${Math.round((customer.outstandingAr - customer.creditLimit) / 1e6)} M`,
      )
    if (!project.packageId) warnings.push('No service package applied — charges will have to be keyed by hand')
  }

  if (project.stage === 'BOOKING') {
    if (!project.bookingNo) blockers.push('Carrier booking number not recorded')
    if (!project.etd) blockers.push('ETD not confirmed')
    if (!project.siCutoff || !project.vgmCutoff) warnings.push('Cut-off calendar is incomplete — alerts cannot be raised')
  }

  if (project.stage === 'CARGO_PLAN') {
    if (containers.length === 0) blockers.push('No containers planned for this job')
    containers.forEach((c) => {
      const u = utilisation(c.type, c.items, c.tareKg)
      if (u.status === 'OVERLOADED')
        blockers.push(`Unit #${c.seq} exceeds capacity (${u.volumePct.toFixed(0)}% volume, ${u.weightPct.toFixed(0)}% payload)`)
      else if (u.status === 'LIGHT' && c.type !== 'LCL')
        warnings.push(`Unit #${c.seq} is only ${Math.max(u.volumePct, u.weightPct).toFixed(0)}% used — consider downsizing`)
    })
  }

  if (project.stage === 'DOCUMENTATION' || stageIndex(project.stage) > 3) {
    const missing = documents.filter((d) => d.mandatory && ['REQUIRED', 'REJECTED'].includes(d.status))
    missing.forEach((d) => blockers.push(`${d.title} is ${d.status === 'REJECTED' ? 'rejected' : 'still outstanding'}`))
  }

  if (project.stage === 'DOCUMENTATION') {
    const peb = extra?.filings?.find((f) => f.type === 'PEB')
    if (peb) {
      const missing = peb.supportingDocs.filter((d) => d.mandatory && !d.uploaded)
      if (peb.status === 'DRAFT' && missing.length)
        blockers.push(`PEB cannot be submitted — CEISA 4.0 is missing ${missing.map((d) => d.label).join(', ')}`)
      if (peb.channel === 'MERAH' && peb.status !== 'APPROVED')
        blockers.push('PEB drew Jalur Merah — the physical inspection must clear before the cargo can gate in')
      if (peb.channel === 'KUNING' && peb.status === 'UNDER_REVIEW')
        warnings.push('PEB is in Jalur Kuning — answer the document query before the cut-off')
    } else {
      warnings.push('No PEB filing recorded for this job')
    }
  }

  if (project.stage === 'STUFFING') {
    containers
      .filter((c) => c.type !== 'LCL' && !c.vgmSubmittedAt)
      .forEach((c) => blockers.push(`VGM not submitted for unit #${c.seq} — SOLAS blocks loading`))
    const gateIn = relativeDays(project.gateInCutoff)
    if (gateIn !== null && gateIn < 0) blockers.push('Gate-in cut-off has already passed')
  }

  if (project.stage === 'SETTLEMENT') {
    if (project.type === 'CONSIGNMENT' && project.consignment && project.consignment.reportedUnitsSold === 0)
      warnings.push('No consignment sales reported yet — settlement cannot be reconciled')
  }

  const done = tasks.filter((t) => t.done).length
  return {
    canAdvance: blockers.length === 0 && stageIndex(project.stage) < STAGES.length - 1,
    blockers,
    warnings,
    progressPct: tasks.length ? (done / tasks.length) * 100 : 0,
  }
}

/* ---------------- document compliance ---------------- */
export function documentCompliance(project: Project, documents: ShipmentDocument[]) {
  const rule = COUNTRY_DOC_RULES[project.destCountry]
  const required = documents.filter((d) => d.mandatory)
  const satisfied = required.filter((d) => ['APPROVED', 'ISSUED', 'SURRENDERED'].includes(d.status))
  const missingCountryDocs = (rule?.required ?? []).filter((t) => !documents.some((d) => d.type === t && d.status !== 'REQUIRED'))
  const expiring = documents.filter((d) => {
    const days = relativeDays(d.expiresAt)
    return days !== null && days <= 30 && days >= 0
  })
  const rejected = documents.filter((d) => d.status === 'REJECTED')
  return {
    pct: required.length ? (satisfied.length / required.length) * 100 : 100,
    requiredCount: required.length,
    satisfiedCount: satisfied.length,
    missingCountryDocs,
    countryNote: rule?.note,
    expiring,
    rejected,
  }
}

/* ---------------- exception engine ---------------- */
export type ExceptionSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM'
export interface Exception {
  id: string
  severity: ExceptionSeverity
  category: 'CUT_OFF' | 'DOCUMENT' | 'CAPACITY' | 'CREDIT' | 'FINANCE' | 'CONSIGNMENT' | 'COMPLIANCE'
  title: string
  detail: string
  projectId?: string
  projectCode?: string
  link: string
  action: string
}

export function buildExceptions(input: {
  projects: Project[]
  containers: Container[]
  documents: ShipmentDocument[]
  charges: ProjectCharge[]
  customers: Customer[]
  invoices: Invoice[]
}): Exception[] {
  const out: Exception[] = []
  const { projects, containers, documents, charges, customers, invoices } = input

  for (const p of projects) {
    if (p.status === 'COMPLETED' || p.status === 'CANCELLED') continue
    const boxes = containers.filter((c) => c.projectId === p.id)
    const docs = documents.filter((d) => d.projectId === p.id)

    /* cut-off risk */
    const cutoffs: [string, string | undefined][] = [
      ['SI cut-off', p.siCutoff],
      ['VGM cut-off', p.vgmCutoff],
      ['Gate-in cut-off', p.gateInCutoff],
    ]
    for (const [label, iso] of cutoffs) {
      const days = relativeDays(iso)
      if (days === null) continue
      const stageDone = stageIndex(p.stage) >= 5
      if (days < 0 && !stageDone) {
        out.push({
          id: `${p.id}_${label}_missed`, severity: 'CRITICAL', category: 'CUT_OFF',
          title: `${label} missed on ${p.code}`,
          detail: `${label} passed ${pluralDays(days)} ago and the job is still at ${p.stage.replace(/_/g, ' ').toLowerCase()}. Space may be rolled to the next sailing.`,
          projectId: p.id, projectCode: p.code, link: `/projects/${p.id}`, action: 'Contact the carrier and re-plan',
        })
      } else if (days !== null && days >= 0 && days <= 2 && !stageDone) {
        out.push({
          id: `${p.id}_${label}_near`, severity: days === 0 ? 'CRITICAL' : 'HIGH', category: 'CUT_OFF',
          title: `${label} in ${days === 0 ? 'under a day' : pluralDays(days)} — ${p.code}`,
          detail: `${p.name}. Everything the cut-off depends on must be filed before it closes.`,
          projectId: p.id, projectCode: p.code, link: `/projects/${p.id}`, action: 'Chase the outstanding filing',
        })
      }
    }

    /* rejected or missing mandatory documents */
    docs.filter((d) => d.status === 'REJECTED').forEach((d) =>
      out.push({
        id: `${d.id}_rejected`, severity: 'CRITICAL', category: 'DOCUMENT',
        title: `${d.title} rejected on ${p.code}`,
        detail: d.remarks ?? 'The issuing authority rejected this document. A corrected version is required.',
        projectId: p.id, projectCode: p.code, link: `/projects/${p.id}?tab=documents`, action: 'Re-issue the document',
      }),
    )
    const comp = documentCompliance(p, docs)
    if (comp.missingCountryDocs.length && stageIndex(p.stage) >= 3) {
      out.push({
        id: `${p.id}_country_docs`, severity: 'HIGH', category: 'COMPLIANCE',
        title: `Destination rules unmet for ${p.destCountry} — ${p.code}`,
        detail: `${comp.countryNote ?? 'Destination customs requires additional documents.'} Missing: ${comp.missingCountryDocs.join(', ')}.`,
        projectId: p.id, projectCode: p.code, link: `/projects/${p.id}?tab=documents`, action: 'Raise the missing certificates',
      })
    }

    /* capacity */
    boxes.forEach((c) => {
      const u = utilisation(c.type, c.items, c.tareKg)
      if (u.status === 'OVERLOADED')
        out.push({
          id: `${c.id}_overload`, severity: 'CRITICAL', category: 'CAPACITY',
          title: `Unit #${c.seq} over capacity on ${p.code}`,
          detail: `${u.volumePct.toFixed(0)}% of volume and ${u.weightPct.toFixed(0)}% of payload. The terminal will refuse the gate-in.`,
          projectId: p.id, projectCode: p.code, link: `/projects/${p.id}?tab=containers`, action: 'Re-plan the stuffing',
        })
      if (u.status === 'LIGHT' && c.type !== 'LCL' && ['PLANNED', 'BOOKED'].includes(c.status))
        out.push({
          id: `${c.id}_light`, severity: 'MEDIUM', category: 'CAPACITY',
          title: `Unit #${c.seq} only ${Math.max(u.volumePct, u.weightPct).toFixed(0)}% used — ${p.code}`,
          detail: `A ${c.type} is being paid for at partial load. Consolidating or downsizing recovers margin.`,
          projectId: p.id, projectCode: p.code, link: `/projects/${p.id}?tab=containers`, action: 'Review the load plan',
        })
    })

    /* margin erosion */
    const jc = charges.filter((c) => c.projectId === p.id)
    const fin = jobFinancials(jc)
    if (fin.revenue > 0 && fin.marginPct < 8) {
      out.push({
        id: `${p.id}_margin`, severity: fin.marginPct < 0 ? 'CRITICAL' : 'HIGH', category: 'FINANCE',
        title: `Margin at ${fin.marginPct.toFixed(1)}% on ${p.code}`,
        detail: `Cost is running at IDR ${Math.round(fin.cost / 1e6)} M against IDR ${Math.round(fin.revenue / 1e6)} M of revenue. Unbudgeted charges are the usual cause.`,
        projectId: p.id, projectCode: p.code, link: `/projects/${p.id}?tab=charges`, action: 'Review the charge sheet',
      })
    }
    if (fin.disputed > 0) {
      out.push({
        id: `${p.id}_disputed`, severity: 'HIGH', category: 'FINANCE',
        title: `Disputed charges on ${p.code}`,
        detail: `IDR ${Math.round(fin.disputed / 1e6)} M is in dispute with the client. Unresolved disputes age into write-offs.`,
        projectId: p.id, projectCode: p.code, link: `/projects/${p.id}?tab=charges`, action: 'Settle or write off',
      })
    }

    /* consignment ageing */
    if (p.consignment) {
      const cns = p.consignment
      const unsold = cns.totalUnitsShipped - cns.reportedUnitsSold
      const daysSinceReport = relativeDays(cns.lastSalesReportAt)
      if (daysSinceReport !== null && Math.abs(daysSinceReport) > cns.settlementCycleDays) {
        out.push({
          id: `${p.id}_cns_report`, severity: 'HIGH', category: 'CONSIGNMENT',
          title: `Consignment sales report overdue — ${p.code}`,
          detail: `Last report was ${pluralDays(daysSinceReport)} ago against a ${cns.settlementCycleDays}-day cycle. ${unsold} units remain unsold.`,
          projectId: p.id, projectCode: p.code, link: `/projects/${p.id}`, action: 'Request the sales report',
        })
      }
      if (cns.minimumGuaranteedUnits && cns.reportedUnitsSold < cns.minimumGuaranteedUnits && stageIndex(p.stage) >= 6) {
        out.push({
          id: `${p.id}_cns_min`, severity: 'MEDIUM', category: 'CONSIGNMENT',
          title: `Minimum guarantee not met — ${p.code}`,
          detail: `${cns.reportedUnitsSold} of ${cns.minimumGuaranteedUnits} guaranteed units sold. The shortfall is billable under the agreement.`,
          projectId: p.id, projectCode: p.code, link: `/projects/${p.id}`, action: 'Invoice the shortfall',
        })
      }
    }
  }

  /* credit exposure */
  customers.forEach((c) => {
    if (c.creditLimit > 0 && c.outstandingAr > c.creditLimit) {
      out.push({
        id: `${c.id}_credit`, severity: 'HIGH', category: 'CREDIT',
        title: `${c.tradeName ?? c.legalName} is over their credit limit`,
        detail: `Outstanding IDR ${Math.round(c.outstandingAr / 1e6)} M against a limit of IDR ${Math.round(c.creditLimit / 1e6)} M. New bookings should be blocked.`,
        link: `/customers/${c.id}`, action: 'Escalate to collections',
      })
    }
  })

  /* overdue AR */
  invoices
    .filter((i) => i.kind === 'AR' && i.status === 'OVERDUE')
    .forEach((i) => {
      const days = Math.abs(relativeDays(i.dueDate) ?? 0)
      out.push({
        id: `${i.id}_overdue`, severity: days > 45 ? 'CRITICAL' : 'HIGH', category: 'FINANCE',
        title: `${i.number} is ${pluralDays(days)} overdue`,
        detail: `${i.partyName} owes IDR ${Math.round(i.total / 1e6)} M. Recovery rates fall sharply past 60 days.`,
        link: '/finance/invoices', action: 'Chase payment',
      })
    })

  const order: Record<ExceptionSeverity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 }
  return out.sort((a, b) => order[a.severity] - order[b.severity])
}

/* ---------------- finance reporting ---------------- */
export interface LedgerBalance {
  account: Account
  debit: number
  credit: number
  balance: number
}

export function trialBalance(accounts: Account[], journal: JournalEntry[], onlyPosted = true): LedgerBalance[] {
  const map = new Map<string, { debit: number; credit: number }>()
  journal
    .filter((j) => (onlyPosted ? j.status === 'POSTED' : j.status !== 'VOID'))
    .forEach((j) =>
      j.lines.forEach((l) => {
        const cur = map.get(l.accountCode) ?? { debit: 0, credit: 0 }
        cur.debit += l.debit
        cur.credit += l.credit
        map.set(l.accountCode, cur)
      }),
    )
  return accounts
    .map((a) => {
      const m = map.get(a.code) ?? { debit: 0, credit: 0 }
      const balance = a.normalBalance === 'DEBIT' ? m.debit - m.credit : m.credit - m.debit
      return { account: a, debit: m.debit, credit: m.credit, balance }
    })
    .filter((r) => r.debit !== 0 || r.credit !== 0)
}

export function incomeStatement(balances: LedgerBalance[]) {
  const pick = (t: Account['type']) => balances.filter((b) => b.account.type === t)
  const revenue = pick('REVENUE')
  const cogs = pick('COGS')
  const expense = pick('EXPENSE')
  const totalRevenue = revenue.reduce((a, b) => a + b.balance, 0)
  const totalCogs = cogs.reduce((a, b) => a + b.balance, 0)
  const totalExpense = expense.reduce((a, b) => a + b.balance, 0)
  const gross = totalRevenue - totalCogs
  return {
    revenue, cogs, expense, totalRevenue, totalCogs, totalExpense,
    grossProfit: gross,
    grossMarginPct: totalRevenue ? (gross / totalRevenue) * 100 : 0,
    operatingProfit: gross - totalExpense,
    netMarginPct: totalRevenue ? ((gross - totalExpense) / totalRevenue) * 100 : 0,
  }
}

export function balanceSheet(balances: LedgerBalance[], netProfit: number) {
  const assets = balances.filter((b) => b.account.type === 'ASSET')
  const liabilities = balances.filter((b) => b.account.type === 'LIABILITY')
  const equity = balances.filter((b) => b.account.type === 'EQUITY')
  const totalAssets = assets.reduce((a, b) => a + b.balance, 0)
  const totalLiabilities = liabilities.reduce((a, b) => a + b.balance, 0)
  const totalEquity = equity.reduce((a, b) => a + b.balance, 0) + netProfit
  return {
    assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity,
    difference: totalAssets - (totalLiabilities + totalEquity),
  }
}

export function arAging(invoices: Invoice[]) {
  const buckets = [
    { label: 'Current', min: -9999, max: 0 },
    { label: '1–30 days', min: 1, max: 30 },
    { label: '31–60 days', min: 31, max: 60 },
    { label: '61–90 days', min: 61, max: 90 },
    { label: '90+ days', min: 91, max: 99999 },
  ]
  return buckets.map((b) => {
    const rows = invoices.filter((i) => {
      if (i.kind !== 'AR' || i.status === 'PAID' || i.status === 'VOID') return false
      const overdue = -(relativeDays(i.dueDate) ?? 0)
      return overdue >= b.min && overdue <= b.max
    })
    return { ...b, count: rows.length, amount: rows.reduce((a, i) => a + (i.total - i.paid), 0) }
  })
}

export function journalIsBalanced(j: JournalEntry) {
  const d = j.lines.reduce((a, l) => a + l.debit, 0)
  const c = j.lines.reduce((a, l) => a + l.credit, 0)
  return { debit: d, credit: c, balanced: Math.abs(d - c) < 0.5, difference: d - c }
}

/* ---------------- package usage ---------------- */
export function packageMargin(pkg: ServicePackage) {
  const buy = pkg.rateLines.reduce((a, l) => a + l.buyRate, 0)
  const sell = pkg.rateLines.reduce((a, l) => a + l.sellRate, 0)
  return { buy, sell, margin: sell - buy, marginPct: sell ? ((sell - buy) / sell) * 100 : 0 }
}

export function pipelineByStage(projects: Project[]) {
  return STAGES.map((s) => {
    const rows = projects.filter((p) => p.stage === s.key && p.status !== 'CANCELLED')
    return { stage: s, count: rows.length, value: rows.reduce((a, p) => a + p.quotedRevenue * p.fxRate, 0) }
  })
}
