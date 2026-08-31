/* ------------------------------------------------------------------
   Phase 2 analytics — pipeline, partner scoring, milestone punctuality,
   warehouse dwell, customs risk and the operations KPI set.
   ------------------------------------------------------------------ */
import type {
  Customer, CustomsFiling, Invoice, Milestone, Partner, Project, ProjectCharge, Quotation,
  ShipmentDocument, WarehouseReceipt, Container, AppSettings,
} from '@/data/types'
import { MILESTONES, milestoneIndex } from '@/data/reference'
import { relativeDays } from './format'
import { chargeTotals, jobFinancials, type Exception } from './analytics'
import { itemCbm, utilisation } from './shipping'

/* ================= quotations ================= */
export const OPEN_QUOTE_STATUSES = ['DRAFT', 'SENT', 'UNDER_NEGOTIATION'] as const
export const DECIDED_QUOTE_STATUSES = ['ACCEPTED', 'REJECTED'] as const

export function quoteTotals(q: Quotation) {
  let revenue = 0
  let cost = 0
  for (const l of q.lines) {
    if (l.optional) continue
    revenue += l.quantity * l.sellRate
    cost += l.quantity * l.buyRate
  }
  const optional = q.lines.filter((l) => l.optional).reduce((a, l) => a + l.quantity * l.sellRate, 0)
  const margin = revenue - cost
  return {
    revenue,
    cost,
    margin,
    marginPct: revenue ? (margin / revenue) * 100 : 0,
    optional,
    revenueIdr: revenue * q.fxRate,
    marginIdr: margin * q.fxRate,
  }
}

export const isQuoteOpen = (q: Quotation) => (OPEN_QUOTE_STATUSES as readonly string[]).includes(q.status)

/** A quotation past its validity is expired whether or not anyone changed the status. */
export function effectiveQuoteStatus(q: Quotation): Quotation['status'] {
  if (isQuoteOpen(q) && (relativeDays(q.validTo) ?? 0) < 0) return 'EXPIRED'
  return q.status
}

export function pipelineSummary(quotations: Quotation[]) {
  const live = quotations.filter((q) => isQuoteOpen(q) && effectiveQuoteStatus(q) !== 'EXPIRED')
  const decided = quotations.filter((q) => (DECIDED_QUOTE_STATUSES as readonly string[]).includes(q.status))
  const won = decided.filter((q) => q.status === 'ACCEPTED')
  const openValue = live.reduce((a, q) => a + quoteTotals(q).revenueIdr, 0)
  const weighted = live.reduce((a, q) => a + (quoteTotals(q).revenueIdr * q.probability) / 100, 0)
  const wonValue = won.reduce((a, q) => a + quoteTotals(q).revenueIdr, 0)
  return {
    live,
    decided,
    won,
    openCount: live.length,
    openValue,
    weightedValue: weighted,
    wonValue,
    winRatePct: decided.length ? (won.length / decided.length) * 100 : 0,
    winRateByValue: decided.length
      ? (wonValue / decided.reduce((a, q) => a + quoteTotals(q).revenueIdr, 0)) * 100
      : 0,
    avgMarginPct: live.length ? live.reduce((a, q) => a + quoteTotals(q).marginPct, 0) / live.length : 0,
  }
}

export function lossReasonBreakdown(quotations: Quotation[]) {
  const lost = quotations.filter((q) => q.status === 'REJECTED')
  const map = new Map<string, { reason: string; count: number; value: number }>()
  lost.forEach((q) => {
    const key = q.lossReason ?? 'OTHER'
    const cur = map.get(key) ?? { reason: key, count: 0, value: 0 }
    cur.count++
    cur.value += quoteTotals(q).revenueIdr
    map.set(key, cur)
  })
  return Array.from(map.values()).sort((a, b) => b.value - a.value)
}

export function pipelineByStatus(quotations: Quotation[]) {
  const order = ['DRAFT', 'SENT', 'UNDER_NEGOTIATION', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN']
  return order.map((status) => {
    const rows = quotations.filter((q) => effectiveQuoteStatus(q) === status)
    return { status, count: rows.length, value: rows.reduce((a, q) => a + quoteTotals(q).revenueIdr, 0) }
  })
}

/* ================= milestones ================= */
export interface MilestoneHealth {
  total: number
  recorded: number
  onTime: number
  late: number
  onTimePct: number
  avgSlipDays: number
  next?: Milestone
  lastRecorded?: Milestone
  progressPct: number
}

export const milestoneVariance = (m: Milestone) => {
  if (!m.plannedAt || !m.actualAt) return null
  return Math.round((new Date(m.actualAt).getTime() - new Date(m.plannedAt).getTime()) / 86_400_000)
}

export function milestoneHealth(rows: Milestone[]): MilestoneHealth {
  const ordered = rows.slice().sort((a, b) => milestoneIndex(a.code) - milestoneIndex(b.code))
  const recorded = ordered.filter((m) => m.actualAt)
  const variances = recorded.map(milestoneVariance).filter((v): v is number => v !== null)
  const onTime = variances.filter((v) => v <= 0).length
  return {
    total: ordered.length,
    recorded: recorded.length,
    onTime,
    late: variances.length - onTime,
    onTimePct: variances.length ? (onTime / variances.length) * 100 : 100,
    avgSlipDays: variances.length ? variances.reduce((a, v) => a + v, 0) / variances.length : 0,
    next: ordered.find((m) => !m.actualAt),
    lastRecorded: recorded.at(-1),
    progressPct: ordered.length ? (recorded.length / ordered.length) * 100 : 0,
  }
}

/** Planned milestones regenerated from the job's own schedule. */
export function plannedMilestonesFor(project: Project) {
  if (!project.etd) return []
  const etd = new Date(project.etd)
  return MILESTONES.filter((m) => (project.transhipmentPort ? true : !m.code.startsWith('TRANSHIPMENT'))).map((m) => {
    const d = new Date(etd)
    d.setDate(d.getDate() + m.offsetFromEtd)
    return { code: m.code, plannedAt: d.toISOString() }
  })
}

/* ================= warehouse ================= */
export interface ReceiptMetrics {
  dwellDays: number
  chargeableDays: number
  storageCharge: number
  packagesOnHand: number
  cbmOnHand: number
  ageBucket: 'FREE' | '1-30' | '31-60' | '61-90' | '90+'
}

export function receiptMetrics(r: WarehouseReceipt, today = new Date()): ReceiptMetrics {
  const from = new Date(r.receivedAt)
  const to = r.releasedAt ? new Date(r.releasedAt) : today
  const dwellDays = Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000))
  const chargeableDays = Math.max(0, dwellDays - r.freeDays)
  const share = r.packages ? (r.packages - r.packagesReleased) / r.packages : 0
  const cbmOnHand = r.cbm * share
  return {
    dwellDays,
    chargeableDays,
    storageCharge: chargeableDays * r.cbm * r.storageRatePerCbmDay,
    packagesOnHand: r.packages - r.packagesReleased,
    cbmOnHand,
    ageBucket: dwellDays <= r.freeDays ? 'FREE' : dwellDays <= 30 ? '1-30' : dwellDays <= 60 ? '31-60' : dwellDays <= 90 ? '61-90' : '90+',
  }
}

export function warehouseSummary(receipts: WarehouseReceipt[]) {
  const open = receipts.filter((r) => r.status !== 'RELEASED')
  const metrics = open.map((r) => receiptMetrics(r))
  return {
    openCount: open.length,
    cbmOnHand: metrics.reduce((a, m) => a + m.cbmOnHand, 0),
    packagesOnHand: metrics.reduce((a, m) => a + m.packagesOnHand, 0),
    storageAccrued: metrics.reduce((a, m) => a + m.storageCharge, 0),
    avgDwell: metrics.length ? metrics.reduce((a, m) => a + m.dwellDays, 0) / metrics.length : 0,
    aged: open.filter((_, i) => metrics[i].dwellDays > 60).length,
  }
}

/* ================= customs ================= */
export function filingReadiness(f: CustomsFiling) {
  const mandatory = f.supportingDocs.filter((d) => d.mandatory)
  const uploaded = mandatory.filter((d) => d.uploaded)
  return {
    mandatoryCount: mandatory.length,
    uploadedCount: uploaded.length,
    pct: mandatory.length ? (uploaded.length / mandatory.length) * 100 : 100,
    missing: mandatory.filter((d) => !d.uploaded).map((d) => d.label),
    canSubmit: mandatory.every((d) => d.uploaded),
  }
}

/** HS codes on a job that fall under Indonesian export restriction. */
export function lartasHits(hsCodes: string[], prefixes: string[]) {
  return hsCodes.filter((hs) => prefixes.some((p) => hs.replace('.', '').startsWith(p)))
}

/* ================= partner scoring ================= */
export function partnerOverall(p: Partner) {
  if (!p.score.jobsHandled) return null
  const responsiveness = Math.max(0, 100 - p.score.responseHours * 4)
  const disputePenalty = p.score.openDisputes * 6
  return Math.max(0, Math.min(100, p.score.onTimePct * 0.45 + p.score.docAccuracyPct * 0.3 + responsiveness * 0.25 - disputePenalty))
}

export function partnerGrade(score: number | null) {
  if (score === null) return { label: 'Unrated', tone: 'neutral' as const }
  if (score >= 90) return { label: 'Preferred', tone: 'success' as const }
  if (score >= 78) return { label: 'Approved', tone: 'info' as const }
  if (score >= 65) return { label: 'Watch', tone: 'warning' as const }
  return { label: 'Review', tone: 'danger' as const }
}

export function partnerSpend(partner: Partner, charges: ProjectCharge[]) {
  const mine = charges.filter((c) => c.partnerId === partner.id || c.vendor === partner.name)
  return {
    lines: mine.length,
    cost: mine.reduce((a, c) => a + chargeTotals(c).cost, 0),
    jobs: new Set(mine.map((c) => c.projectId)).size,
  }
}

/* ================= company KPI set ================= */
export interface Kpi {
  key: string
  label: string
  value: number
  unit: '%' | 'days' | 'idr' | 'count' | 'cbm'
  target?: number
  /** true when higher is better */
  higherIsBetter: boolean
  detail: string
}

export function companyKpis(input: {
  projects: Project[]
  charges: ProjectCharge[]
  containers: Container[]
  documents: ShipmentDocument[]
  milestones: Milestone[]
  quotations: Quotation[]
  invoices: Invoice[]
  receipts: WarehouseReceipt[]
  settings: AppSettings
}): Kpi[] {
  const { projects, charges, containers, documents, milestones, quotations, invoices, receipts, settings } = input
  const t = settings.kpiTargets

  const health = milestoneHealth(milestones)
  const pipeline = pipelineSummary(quotations)
  const fin = jobFinancials(charges)
  const shipped = projects.filter((p) => p.atd).length || 1

  const boxes = containers.filter((c) => c.type !== 'LCL')
  const utilPcts = boxes.map((c) => {
    const u = utilisation(c.type, c.items, c.tareKg)
    return Math.max(u.volumePct, u.weightPct)
  })
  const avgUtil = utilPcts.length ? utilPcts.reduce((a, v) => a + v, 0) / utilPcts.length : 0

  const arOpen = invoices.filter((i) => i.kind === 'AR' && i.status !== 'PAID' && i.status !== 'VOID')
  const arValue = arOpen.reduce((a, i) => a + (i.total - i.paid), 0)
  const arRevenue = invoices.filter((i) => i.kind === 'AR').reduce((a, i) => a + i.total, 0)
  const dso = arRevenue ? (arValue / arRevenue) * 90 : 0

  const reissued = documents.filter((d) => d.status === 'REJECTED' || d.version > 1).length
  const docAccuracy = documents.length ? ((documents.length - reissued) / documents.length) * 100 : 100

  const openReceipts = receipts.filter((r) => r.status !== 'RELEASED')
  const avgDwell = openReceipts.length
    ? openReceipts.reduce((a, r) => a + receiptMetrics(r).dwellDays, 0) / openReceipts.length
    : 0

  const deliveredOnTime = projects.filter((p) => p.ata && p.eta && new Date(p.ata) <= new Date(p.eta)).length
  const deliveredTotal = projects.filter((p) => p.ata).length

  return [
    {
      key: 'onTime', label: 'Milestone punctuality', value: health.onTimePct, unit: '%', target: t.onTimePct,
      higherIsBetter: true,
      detail: `${health.onTime} of ${health.onTime + health.late} recorded events landed on or before plan. Average slip ${health.avgSlipDays.toFixed(1)} days.`,
    },
    {
      key: 'etaHit', label: 'Delivered by ETA', value: deliveredTotal ? (deliveredOnTime / deliveredTotal) * 100 : 0,
      unit: '%', target: t.onTimePct, higherIsBetter: true,
      detail: `${deliveredOnTime} of ${deliveredTotal} arrived jobs berthed on or before the quoted ETA.`,
    },
    {
      key: 'winRate', label: 'Quote win rate', value: pipeline.winRatePct, unit: '%', target: t.winRatePct,
      higherIsBetter: true,
      detail: `${pipeline.won.length} won of ${pipeline.decided.length} decided quotations. By value, ${pipeline.winRateByValue.toFixed(0)}%.`,
    },
    {
      key: 'margin', label: 'Gross margin', value: fin.marginPct, unit: '%', target: t.grossMarginPct,
      higherIsBetter: true,
      detail: `Margin of ${Math.round(fin.margin / 1e6)} M on revenue of ${Math.round(fin.revenue / 1e6)} M across the charge book.`,
    },
    {
      key: 'revPerShipment', label: 'Revenue per shipment', value: fin.revenue / shipped, unit: 'idr',
      higherIsBetter: true,
      detail: `Across ${shipped} departed jobs.`,
    },
    {
      key: 'costPerShipment', label: 'Cost per shipment', value: fin.cost / shipped, unit: 'idr',
      higherIsBetter: false,
      detail: `Direct cost only — vendor bills and accruals, excluding overhead.`,
    },
    {
      key: 'dso', label: 'Days sales outstanding', value: dso, unit: 'days', target: t.dsoDays,
      higherIsBetter: false,
      detail: `${Math.round(arValue / 1e6)} M of receivables open against a 90-day revenue base.`,
    },
    {
      key: 'utilisation', label: 'Container utilisation', value: avgUtil, unit: '%', target: t.utilisationPct,
      higherIsBetter: true,
      detail: `${utilPcts.filter((v) => v < 65).length} of ${boxes.length} units are below 65% — that is freight paid for air.`,
    },
    {
      key: 'dwell', label: 'Average warehouse dwell', value: avgDwell, unit: 'days',
      higherIsBetter: false,
      detail: `${openReceipts.length} receipts on hand. Anything past free time is either revenue or a dispute.`,
    },
    {
      key: 'docAccuracy', label: 'Document accuracy', value: docAccuracy, unit: '%', target: t.docAccuracyPct,
      higherIsBetter: true,
      detail: `${reissued} of ${documents.length} documents were rejected or re-issued.`,
    },
  ]
}

export function customerProfitability(projects: Project[], charges: ProjectCharge[], customers: Customer[]) {
  return customers
    .map((c) => {
      const jobs = projects.filter((p) => p.clientId === c.id)
      const fin = jobFinancials(charges.filter((ch) => jobs.some((j) => j.id === ch.projectId)))
      return { customer: c, jobs: jobs.length, ...fin }
    })
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
}

/* ================= phase 2 exceptions ================= */
export function buildPhase2Exceptions(input: {
  quotations: Quotation[]
  partners: Partner[]
  milestones: Milestone[]
  receipts: WarehouseReceipt[]
  filings: CustomsFiling[]
  projects: Project[]
  settings: AppSettings
}): Exception[] {
  const out: Exception[] = []
  const { quotations, partners, milestones, receipts, filings, projects, settings } = input
  const proj = (id: string) => projects.find((p) => p.id === id)

  /* quotations about to lapse */
  quotations.filter(isQuoteOpen).forEach((q) => {
    const d = relativeDays(q.validTo)
    if (d === null) return
    if (d < 0) {
      out.push({
        id: `${q.id}_expired`, severity: 'MEDIUM', category: 'FINANCE',
        title: `${q.number} lapsed without a decision`,
        detail: `Quotation to ${q.commodity.split(',')[0]} on ${q.polName} → ${q.podName} passed its validity ${Math.abs(d)} days ago. Re-quote or mark it lost so the pipeline stays honest.`,
        link: '/quotations', action: 'Re-quote or close',
      })
    } else if (d <= 3) {
      out.push({
        id: `${q.id}_expiring`, severity: 'HIGH', category: 'FINANCE',
        title: `${q.number} expires in ${d === 0 ? 'under a day' : `${d} day${d === 1 ? '' : 's'}`}`,
        detail: `${q.probability}% probability, ${Math.round((quoteTotals(q).revenueIdr) / 1e6)} M at stake. Chase the decision before the rate lapses.`,
        link: '/quotations', action: 'Chase the client',
      })
    }
  })

  /* partner contracts and cover */
  partners.forEach((p) => {
    const contract = relativeDays(p.contractValidTo)
    if (contract !== null && contract >= 0 && contract <= 45 && p.status === 'ACTIVE') {
      out.push({
        id: `${p.id}_contract`, severity: contract <= 14 ? 'HIGH' : 'MEDIUM', category: 'CREDIT',
        title: `${p.name} contract expires in ${contract} days`,
        detail: `Contract ${p.contractNo ?? ''} covers ${p.lanes.slice(0, 2).join(', ')}. Without a renewal those lanes revert to spot pricing.`,
        link: '/partners', action: 'Start the renegotiation',
      })
    }
    const insurance = relativeDays(p.insuranceValidTo)
    if (insurance !== null && insurance >= 0 && insurance <= 30) {
      out.push({
        id: `${p.id}_insurance`, severity: 'MEDIUM', category: 'COMPLIANCE',
        title: `${p.name} cover lapses in ${insurance} days`,
        detail: 'An uninsured subcontractor on a job transfers their risk to us. Get the renewal certificate on file.',
        link: '/partners', action: 'Request the certificate',
      })
    }
    if (p.score.openDisputes >= 2 && p.status === 'ACTIVE') {
      out.push({
        id: `${p.id}_disputes`, severity: 'MEDIUM', category: 'CREDIT',
        title: `${p.name} has ${p.score.openDisputes} open disputes`,
        detail: `On-time ${p.score.onTimePct}% across ${p.score.jobsHandled} jobs. Review before the next nomination.`,
        link: '/partners', action: 'Review the partner',
      })
    }
  })

  /* milestone slippage on live jobs */
  const byProject = new Map<string, Milestone[]>()
  milestones.forEach((m) => {
    const list = byProject.get(m.projectId) ?? []
    list.push(m)
    byProject.set(m.projectId, list)
  })
  byProject.forEach((rows, projectId) => {
    const p = proj(projectId)
    if (!p || p.status === 'COMPLETED' || p.status === 'CANCELLED') return
    const overdue = rows.filter((m) => !m.actualAt && m.plannedAt && (relativeDays(m.plannedAt) ?? 0) < -1)
    if (overdue.length) {
      const worst = overdue.sort((a, b) => (a.plannedAt ?? '').localeCompare(b.plannedAt ?? ''))[0]
      const late = Math.abs(relativeDays(worst.plannedAt) ?? 0)
      out.push({
        id: `${projectId}_milestone_overdue`, severity: late > 5 ? 'CRITICAL' : 'HIGH', category: 'CUT_OFF',
        title: `${overdue.length} milestone${overdue.length === 1 ? '' : 's'} overdue on ${p.code}`,
        detail: `"${MILESTONES.find((x) => x.code === worst.code)?.label}" was due ${late} days ago and has no actual. Either it happened and nobody recorded it, or the job is slipping.`,
        projectId, projectCode: p.code, link: `/projects/${projectId}?tab=tracking`, action: 'Confirm with the carrier',
      })
    }
  })

  /* warehouse ageing */
  receipts.filter((r) => r.status !== 'RELEASED').forEach((r) => {
    const m = receiptMetrics(r)
    if (m.dwellDays > 60) {
      out.push({
        id: `${r.id}_aged`, severity: m.dwellDays > 90 ? 'HIGH' : 'MEDIUM', category: 'FINANCE',
        title: `${r.number} has been in store ${m.dwellDays} days`,
        detail: `${m.packagesOnHand} packages, ${m.cbmOnHand.toFixed(1)} m³ at ${r.warehouseName}. Storage accrued is ${Math.round(m.storageCharge / 1e6)} M and nobody has been billed.`,
        link: '/warehouse', action: 'Bill it or move it',
      })
    }
    if (r.status === 'ON_HOLD') {
      out.push({
        id: `${r.id}_hold`, severity: 'HIGH', category: 'COMPLIANCE',
        title: `${r.number} is on hold at ${r.warehouseName}`,
        detail: r.remarks ?? 'Cargo cannot be released. Storage accrues while it waits.',
        link: '/warehouse', action: 'Clear the hold',
      })
    }
  })

  /* customs filings */
  filings.forEach((f) => {
    const p = proj(f.projectId)
    const readiness = filingReadiness(f)
    if (f.status === 'DRAFT' && !readiness.canSubmit) {
      out.push({
        id: `${f.id}_docs`, severity: 'HIGH', category: 'COMPLIANCE',
        title: `${f.type} for ${p?.code ?? 'a job'} cannot be submitted`,
        detail: `CEISA 4.0 requires every mandatory supporting document uploaded before submission. Missing: ${readiness.missing.join(', ')}.`,
        projectId: f.projectId, projectCode: p?.code, link: `/projects/${f.projectId}?tab=customs`,
        action: 'Upload the missing documents',
      })
    }
    if (f.channel === 'MERAH' && f.status !== 'APPROVED') {
      out.push({
        id: `${f.id}_merah`, severity: 'CRITICAL', category: 'COMPLIANCE',
        title: `${f.type} on ${p?.code ?? 'a job'} drew Jalur Merah`,
        detail: 'Red lane means a physical inspection — expect three to five days and a demurrage exposure at the terminal.',
        projectId: f.projectId, projectCode: p?.code, link: `/projects/${f.projectId}?tab=customs`,
        action: 'Attend the inspection',
      })
    }
    if (f.channel === 'KUNING' && f.status === 'UNDER_REVIEW') {
      out.push({
        id: `${f.id}_kuning`, severity: 'HIGH', category: 'COMPLIANCE',
        title: `${f.type} on ${p?.code ?? 'a job'} is in Jalur Kuning`,
        detail: f.remarks ?? 'Yellow lane document check. Answer the query the same day or the cut-off is at risk.',
        projectId: f.projectId, projectCode: p?.code, link: `/projects/${f.projectId}?tab=customs`,
        action: 'Answer the query',
      })
    }
    if (p && p.status !== 'COMPLETED' && p.status !== 'CANCELLED') {
      const hits = lartasHits(p.hsCodes, settings.restrictedHsPrefixes)
      if (hits.length && f.type === 'PEB' && !f.supportingDocs.some((d) => d.type === 'EXPORT_PERMIT' && d.uploaded)) {
        out.push({
          id: `${f.id}_lartas`, severity: 'HIGH', category: 'COMPLIANCE',
          title: `LARTAS commodity on ${p.code} without an export permit`,
          detail: `HS ${hits.join(', ')} falls under export restriction. The permit must be uploaded with the PEB.`,
          projectId: p.id, projectCode: p.code, link: `/projects/${p.id}?tab=customs`,
          action: 'Obtain the export permit',
        })
      }
    }
  })

  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 } as const
  return out.sort((a, b) => order[a.severity] - order[b.severity])
}

/** total CBM helper shared by warehouse and container views */
export const totalCbm = (items: Parameters<typeof itemCbm>[0][]) => items.reduce((a, i) => a + itemCbm(i), 0)
