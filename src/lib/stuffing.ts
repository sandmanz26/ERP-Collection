import type { Container, CostType, Project, ProjectCharge, StuffingJob, StuffingStatus } from '@/data/types'
import { FIELD_SETTLEMENT_DAYS, STUFFING_LEAD_DAYS, stuffingIsOpen } from '@/data/reference'
import type { Exception } from './analytics'

const DAY = 86_400_000
const days = (from: string, to: string) => Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY)

/* ================================================================
   The stuffing event
   ================================================================ */

export interface StuffingCheck {
  /** packages counted short against the packing list */
  shortPackages: number
  shortCbm: number
  /** stuffing booked at or after the terminal cut-off */
  afterCutoff: boolean
  /** hours of slack between finishing and the cut-off */
  slackDays: number | null
  /** sealed with no seal number recorded */
  missingSeal: boolean
  /** stuffed but no tally or photographs — no defence against a shortage claim */
  missingEvidence: boolean
  /** booked with less notice than a crew can realistically be arranged */
  shortNotice: boolean
  blockers: string[]
  warnings: string[]
}

export function checkStuffing(job: StuffingJob, now = new Date()): StuffingCheck {
  const done = ['SEALED', 'GATE_IN', 'COMPLETED'].includes(job.status)
  const shortPackages = done ? Math.max(0, job.plannedPackages - job.stuffedPackages) : 0
  const shortCbm = done ? Math.max(0, +(job.plannedCbm - job.stuffedCbm).toFixed(2)) : 0

  const slackDays = job.gateInCutoff ? days(job.stuffingDate, job.gateInCutoff) : null
  /* Once the unit is gated in or the job is closed the cut-off is history — the
     warning is only useful while the slot can still be moved. */
  const stillMovable = !['GATE_IN', 'COMPLETED', 'CANCELLED'].includes(job.status)
  const afterCutoff = stillMovable && slackDays !== null && slackDays < 0
  const missingSeal = ['SEALED', 'GATE_IN', 'COMPLETED'].includes(job.status) && !job.sealNo
  const missingEvidence = done && (job.photosTaken === 0 || !job.tallySheetRef)
  const shortNotice =
    job.status === 'PLANNED' && days(now.toISOString(), job.stuffingDate) < STUFFING_LEAD_DAYS

  const blockers: string[] = []
  const warnings: string[] = []

  if (afterCutoff) {
    blockers.push(
      `Stuffing is booked ${Math.abs(slackDays!)} day${Math.abs(slackDays!) === 1 ? '' : 's'} after the terminal gate-in cut-off — the container cannot make this sailing as planned.`,
    )
  }
  if (shortPackages > 0) {
    blockers.push(
      `${shortPackages} package${shortPackages === 1 ? '' : 's'} short of the packing list. The invoice, packing list and B/L all have to be amended to what actually shipped.`,
    )
  }
  if (missingSeal) {
    blockers.push('Marked sealed with no seal number recorded — the terminal will refuse the unit at the gate.')
  }
  if (missingEvidence) {
    warnings.push('No tally sheet or stow photographs on file. Without them a shortage claim lands on us.')
  }
  if (shortNotice) {
    warnings.push(`Less than ${STUFFING_LEAD_DAYS} days' notice — confirm the crew and the equipment today.`)
  }
  if (slackDays !== null && slackDays >= 0 && slackDays < 1 && job.status !== 'GATE_IN' && job.status !== 'COMPLETED') {
    warnings.push('Stuffing and the gate-in cut-off fall on the same day. There is no room for a delay at the yard.')
  }

  return { shortPackages, shortCbm, afterCutoff, slackDays, missingSeal, missingEvidence, shortNotice, blockers, warnings }
}

export function stuffingMetrics(jobs: StuffingJob[], now = new Date()) {
  const today = now.toISOString().slice(0, 10)
  const weekEnd = new Date(now.getTime() + 7 * DAY).toISOString().slice(0, 10)
  const open = jobs.filter((j) => stuffingIsOpen(j.status))
  const checks = jobs.map((j) => ({ job: j, check: checkStuffing(j, now) }))

  const stuffedTotal = jobs.filter((j) => j.stuffedPackages > 0)
  const shortages = checks.filter((c) => c.check.shortPackages > 0)

  return {
    total: jobs.length,
    open: open.length,
    today: jobs.filter((j) => j.stuffingDate.slice(0, 10) === today).length,
    thisWeek: open.filter((j) => j.stuffingDate.slice(0, 10) <= weekEnd).length,
    atRisk: checks.filter((c) => stuffingIsOpen(c.job.status) && c.check.blockers.length > 0).length,
    shortages: shortages.length,
    shortPackages: shortages.reduce((a, c) => a + c.check.shortPackages, 0),
    /** how much of the planned volume actually went in, across everything stuffed */
    fillRatePct: stuffedTotal.length
      ? (stuffedTotal.reduce((a, j) => a + j.stuffedCbm, 0) / stuffedTotal.reduce((a, j) => a + j.plannedCbm, 0)) * 100
      : 100,
    evidenceGaps: checks.filter((c) => c.check.missingEvidence).length,
  }
}

/**
 * The yard's week: work still to do, bucketed by date, earliest first.
 * A sealed unit stays on the board until it is gated in — that is the last
 * thing anyone has to chase before the cut-off.
 */
const AWAITING_YARD: StuffingStatus[] = ['PLANNED', 'EMPTY_RELEASED', 'IN_PROGRESS', 'SEALED']

export function stuffingSchedule(jobs: StuffingJob[]) {
  const map = new Map<string, StuffingJob[]>()
  for (const j of jobs.filter((x) => AWAITING_YARD.includes(x.status))) {
    const key = j.stuffingDate.slice(0, 10)
    map.set(key, [...(map.get(key) ?? []), j])
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => ({
      date,
      rows: rows.sort((a, b) => a.shift.localeCompare(b.shift)),
      packages: rows.reduce((a, r) => a + r.plannedPackages, 0),
      cbm: +rows.reduce((a, r) => a + r.plannedCbm, 0).toFixed(2),
      labour: rows.reduce((a, r) => a + r.labourCount, 0),
    }))
}

/** A container is only ready to gate in once its stuffing is sealed and evidenced. */
export function containerStuffingState(container: Container, jobs: StuffingJob[]) {
  const job = jobs.find((j) => j.containerId === container.id)
  if (!job) return { job: undefined, check: undefined, ready: false, reason: 'No stuffing has been scheduled for this unit.' }
  const check = checkStuffing(job)
  const ready = ['SEALED', 'GATE_IN', 'COMPLETED'].includes(job.status) && check.blockers.length === 0
  return { job, check, ready, reason: ready ? '' : (check.blockers[0] ?? 'Stuffing is not finished.') }
}

/* ================================================================
   The job sheet — what operations hands finance before a job closes
   ================================================================ */

export interface CostBucket {
  type: CostType
  cost: number
  revenue: number
  lines: number
  /** FIELD only: cash out against receipts back */
  advanced: number
  settled: number
}

export interface JobSheet {
  buckets: CostBucket[]
  revenue: number
  cost: number
  margin: number
  marginPct: number
  /** field cash advanced and not yet accounted for */
  unsettledField: number
  unsettledLines: ProjectCharge[]
  /** reimbursements should pass through at cost — anything else is a markup on a disbursement */
  markedUpReimbursements: ProjectCharge[]
  unbilled: ProjectCharge[]
}

const idr = (c: ProjectCharge, v: number) => v * c.quantity * (c.fxRate || 1)

export function jobSheet(charges: ProjectCharge[], now = new Date()): JobSheet {
  const types: CostType[] = ['MASTER', 'FIELD', 'REIMBURSEMENT']
  const buckets = types.map<CostBucket>((type) => {
    const rows = charges.filter((c) => c.costType === type)
    return {
      type,
      cost: rows.reduce((a, c) => a + idr(c, c.buyRate), 0),
      revenue: rows.filter((c) => c.billable).reduce((a, c) => a + idr(c, c.sellRate), 0),
      lines: rows.length,
      advanced: rows.reduce((a, c) => a + (c.settlement?.advanceAmount ?? 0), 0),
      settled: rows.reduce((a, c) => a + (c.settlement?.settledAmount ?? 0), 0),
    }
  })

  const revenue = buckets.reduce((a, b) => a + b.revenue, 0)
  const cost = buckets.reduce((a, b) => a + b.cost, 0)

  const unsettledLines = charges.filter(
    (c) =>
      c.costType === 'FIELD' &&
      c.settlement &&
      c.settlement.settledAmount === 0 &&
      c.settlement.advancedAt !== undefined &&
      days(c.settlement.advancedAt, now.toISOString()) > FIELD_SETTLEMENT_DAYS,
  )

  return {
    buckets,
    revenue,
    cost,
    margin: revenue - cost,
    marginPct: revenue ? ((revenue - cost) / revenue) * 100 : 0,
    /* Only cash with nothing back against it. Where an operator settled and
       returned the unspent balance, the float is square — that is not exposure. */
    unsettledField: charges
      .filter((c) => c.costType === 'FIELD' && c.settlement && c.settlement.settledAmount === 0)
      .reduce((a, c) => a + (c.settlement!.advanceAmount ?? 0), 0),
    unsettledLines,
    markedUpReimbursements: charges.filter(
      (c) => c.costType === 'REIMBURSEMENT' && c.billable && c.sellRate > c.buyRate * 1.02,
    ),
    unbilled: charges.filter((c) => c.billable && c.status === 'DRAFT'),
  }
}

/* ================================================================
   Exceptions
   ================================================================ */

export function buildStuffingExceptions(input: {
  projects: Project[]
  charges: ProjectCharge[]
  stuffingJobs: StuffingJob[]
}): Exception[] {
  const out: Exception[] = []
  const { projects, charges, stuffingJobs } = input
  const proj = (id: string) => projects.find((p) => p.id === id)

  for (const job of stuffingJobs) {
    if (!stuffingIsOpen(job.status) && job.status !== 'COMPLETED') continue
    const check = checkStuffing(job)
    const p = proj(job.projectId)

    for (const blocker of check.blockers) {
      out.push({
        id: `${job.id}_${blocker.slice(0, 20)}`,
        severity: check.afterCutoff || check.shortPackages > 0 ? 'CRITICAL' : 'HIGH',
        category: check.afterCutoff ? 'CUT_OFF' : 'CAPACITY',
        title: `${job.reference} — ${check.afterCutoff ? 'stuffing falls after the cut-off' : check.shortPackages > 0 ? 'stuffed short of the packing list' : 'sealed without a seal number'}`,
        detail: `${blocker} ${job.locationName}, ${job.polName}. Supervised by ${job.supervisor}.`,
        projectId: job.projectId,
        projectCode: p?.code,
        link: '/stuffing',
        action: check.afterCutoff ? 'Re-plan the slot' : 'Reconcile the tally',
      })
    }
    for (const warning of check.warnings) {
      out.push({
        id: `${job.id}_w_${warning.slice(0, 20)}`,
        severity: 'MEDIUM',
        category: 'CAPACITY',
        title: `${job.reference} — ${check.missingEvidence ? 'no tally or photographs on file' : 'stuffing needs confirming'}`,
        detail: `${warning} Scheduled ${job.stuffingDate.slice(0, 10)} at ${job.locationName}.`,
        projectId: job.projectId,
        projectCode: p?.code,
        link: '/stuffing',
        action: check.missingEvidence ? 'Upload the evidence' : 'Confirm the slot',
      })
    }
  }

  /* field cash that went out and has not come back */
  const sheet = jobSheet(charges)
  const byProject = new Map<string, ProjectCharge[]>()
  for (const c of sheet.unsettledLines) byProject.set(c.projectId, [...(byProject.get(c.projectId) ?? []), c])
  for (const [projectId, rows] of byProject) {
    const p = proj(projectId)
    const amount = rows.reduce((a, c) => a + (c.settlement?.advanceAmount ?? 0), 0)
    out.push({
      id: `${projectId}_field_unsettled`,
      severity: 'MEDIUM',
      category: 'FINANCE',
      title: `${p?.code ?? projectId} — field cash unsettled past ${FIELD_SETTLEMENT_DAYS} days`,
      detail: `IDR ${Math.round(amount / 1e6)} M advanced across ${rows.length} line${rows.length === 1 ? '' : 's'} with no receipts back. Until it is settled the job's cost is understated and the float is short.`,
      projectId,
      projectCode: p?.code,
      link: `/projects/${projectId}?tab=jobsheet`,
      action: 'Chase the receipts',
    })
  }

  return out
}
