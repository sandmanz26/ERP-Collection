import type {
  Container, CustomsFiling, HandoverCheck, JobService, Milestone, Project, ProjectCharge,
  ShipmentDocument, StageKey, StuffingJob, UserAccount,
} from '@/data/types'
import { DOC_TYPES, stageIndex } from '@/data/reference'
import { documentStandard } from './services'
import { checkStuffing, jobSheet } from './stuffing'
import { filingReadiness } from './analytics2'

/* ================================================================
   The operator's four phases
   ----------------------------------------------------------------
   The eight-stage stepper is the right model for a job. It is the
   wrong model for the person working it, who thinks in four:
   take it on, run it, paper it, close it.
   ================================================================ */

export type OperatorPhase = 'INTAKE' | 'EXECUTION' | 'DOCUMENTS' | 'CLOSING'

export const OPERATOR_PHASES: {
  key: OperatorPhase
  label: string
  local: string
  short: string
  question: string
  description: string
  stages: StageKey[]
}[] = [
  {
    key: 'INTAKE',
    label: 'Take the job on',
    local: 'Menerima project',
    short: 'Intake',
    question: 'Can I actually run this?',
    description:
      'A job lands on your desk. Read the brief, check you have what you need to start, then accept it — or say why you cannot. Nothing moves until someone owns it.',
    stages: ['INQUIRY', 'BOOKING'],
  },
  {
    key: 'EXECUTION',
    label: 'Run the job',
    local: 'Execute project',
    short: 'Execute',
    question: 'Will the box make the vessel?',
    description:
      'The physical work: plan the cargo into containers, book the stuffing, seal it, gate it in before the cut-off and watch it sail. This is where a job is won or rolled.',
    stages: ['CARGO_PLAN', 'STUFFING', 'DEPARTURE'],
  },
  {
    key: 'DOCUMENTS',
    label: 'Get the papers right',
    local: 'Pengaturan dokumen',
    short: 'Documents',
    question: 'Would a bank or customs accept this?',
    description:
      'Every document the shipment needs, complete to its own standard and issued in the right order. A wrong description or a missing field costs a re-presentation, or the sailing.',
    stages: ['DOCUMENTATION'],
  },
  {
    key: 'CLOSING',
    label: 'Close it out',
    local: 'Penutup',
    short: 'Closing',
    question: 'Is everything billed and settled?',
    description:
      'Delivery confirmed, every charge on the sheet, the field cash settled against receipts, and the job sheet handed to finance. A job is not finished when the box arrives.',
    stages: ['ARRIVAL', 'SETTLEMENT'],
  },
]

export const phaseMeta = (p: OperatorPhase) => OPERATOR_PHASES.find((x) => x.key === p)!

/** Which phase a job sits in, from its stage — and its hand-over state. */
export function phaseOf(project: Project): OperatorPhase {
  if (project.handover && project.handover.status !== 'ACCEPTED') return 'INTAKE'
  const found = OPERATOR_PHASES.find((p) => p.stages.includes(project.stage))
  return found?.key ?? 'INTAKE'
}

/** Jobs this operator is responsible for, newest work first. */
export function operatorJobs(projects: Project[], user: UserAccount | null) {
  if (!user) return []
  return projects
    .filter((p) => p.assignedOperatorId === user.id && p.status !== 'CANCELLED')
    .sort((a, b) => stageIndex(a.stage) - stageIndex(b.stage))
}

/* ================================================================
   What to do next
   ----------------------------------------------------------------
   Every item says what to do, why it matters and what it costs to
   leave — an operator should never have to infer urgency.
   ================================================================ */

export type ActionUrgency = 'BLOCKING' | 'DUE' | 'NEXT'

export interface NextAction {
  id: string
  projectId: string
  phase: OperatorPhase
  urgency: ActionUrgency
  title: string
  /** the consequence of not doing it */
  because: string
  link: string
  cta: string
}

export interface OperatorContext {
  containers: Container[]
  documents: ShipmentDocument[]
  charges: ProjectCharge[]
  stuffingJobs: StuffingJob[]
  milestones: Milestone[]
  filings: CustomsFiling[]
  jobServices: JobService[]
}

const daysUntil = (iso?: string) =>
  iso ? Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000) : null

export function nextActions(project: Project, ctx: OperatorContext): NextAction[] {
  const out: NextAction[] = []
  const phase = phaseOf(project)
  const add = (a: Omit<NextAction, 'projectId' | 'phase'>) =>
    out.push({ ...a, projectId: project.id, phase })

  /* ---------- intake ---------- */
  if (project.handover && project.handover.status === 'OFFERED') {
    const missing = project.handover.checklist.filter((c) => c.required && !c.confirmed)
    add({
      id: `${project.id}_accept`,
      urgency: 'BLOCKING',
      title: 'Accept this job, or say why you cannot',
      because: missing.length
        ? missing.length === 1
          ? `One thing you need is not confirmed yet: ${missing[0].label.toLowerCase()}. Taking it on without that means finding out later, when it costs more.`
          : `${missing.length} things you need are not confirmed yet. Taking it on without them means finding out later, when it costs more.`
        : 'Until someone owns it, nobody is watching the cut-offs on this job.',
      link: `/my/intake?job=${project.id}`,
      cta: 'Open the hand-over',
    })
    return out
  }

  /* ---------- execution ---------- */
  const own = ctx.containers.filter((c) => c.projectId === project.id)
  const stuffings = ctx.stuffingJobs.filter((s) => s.projectId === project.id)

  if (phase === 'EXECUTION' || phase === 'DOCUMENTS') {
    if (own.length === 0) {
      add({
        id: `${project.id}_plan`,
        urgency: 'BLOCKING',
        title: 'Plan the cargo into containers',
        because: 'Nothing else can be booked until the equipment and the volume are known.',
        link: `/projects/${project.id}?tab=containers`,
        cta: 'Plan the cargo',
      })
    }

    const unscheduled = own.filter((c) => !stuffings.some((s) => s.containerId === c.id))
    if (own.length > 0 && unscheduled.length > 0) {
      add({
        id: `${project.id}_stuff`,
        urgency: 'DUE',
        title: `Book stuffing for ${unscheduled.length} container${unscheduled.length === 1 ? '' : 's'}`,
        because: 'A crew and a slot need at least two days. Left late it becomes a scramble, and a scramble misses cut-offs.',
        link: `/projects/${project.id}?tab=stuffing`,
        cta: 'Schedule stuffing',
      })
    }

    for (const s of stuffings) {
      const check = checkStuffing(s)
      for (const blocker of check.blockers) {
        add({
          id: `${s.id}_blocked`,
          urgency: 'BLOCKING',
          title: `${s.reference} cannot go ahead as planned`,
          because: blocker,
          link: `/projects/${project.id}?tab=stuffing`,
          cta: 'Fix the slot',
        })
      }
    }

    const gate = daysUntil(project.gateInCutoff)
    if (gate !== null && gate >= 0 && gate <= 2 && own.some((c) => !c.gateInDate)) {
      add({
        id: `${project.id}_gate`,
        urgency: 'BLOCKING',
        title: gate === 0 ? 'Gate-in cut-off is today' : `Gate-in cut-off in ${gate} day${gate === 1 ? '' : 's'}`,
        because: `${own.filter((c) => !c.gateInDate).length} unit(s) are not at the terminal yet. After the cut-off the carrier rolls them to the next sailing.`,
        link: `/projects/${project.id}?tab=containers`,
        cta: 'Check the units',
      })
    }

    const noVgm = own.filter((c) => c.stuffingDate && !c.vgmKg)
    if (noVgm.length > 0) {
      add({
        id: `${project.id}_vgm`,
        urgency: 'BLOCKING',
        title: `Submit VGM for ${noVgm.length} container${noVgm.length === 1 ? '' : 's'}`,
        because: 'SOLAS is absolute: no verified gross mass, no loading. There is no discretion at the terminal.',
        link: `/projects/${project.id}?tab=containers`,
        cta: 'Submit the VGM',
      })
    }
  }

  /* ---------- documents ---------- */
  const docs = ctx.documents.filter((d) => d.projectId === project.id)
  const rejected = docs.filter((d) => d.status === 'REJECTED')
  if (rejected.length > 0) {
    add({
      id: `${project.id}_rejected`,
      urgency: 'BLOCKING',
      title: `${rejected.length} document${rejected.length === 1 ? '' : 's'} rejected`,
      because: `${rejected.map((d) => d.title).join(', ')} came back rejected. Nothing downstream can be issued until they are corrected.`,
      link: `/my/documents?job=${project.id}`,
      cta: 'Correct them',
    })
  }

  const outstanding = docs.filter((d) => d.mandatory && ['REQUIRED', 'DRAFT'].includes(d.status))
  if (outstanding.length > 0 && stageIndex(project.stage) >= stageIndex('DOCUMENTATION')) {
    add({
      id: `${project.id}_docs`,
      urgency: 'DUE',
      title: `${outstanding.length} mandatory document${outstanding.length === 1 ? '' : 's'} outstanding`,
      because: `${outstanding.slice(0, 3).map((d) => d.title).join(', ')}${outstanding.length > 3 ? ' and more' : ''} are still to be issued.`,
      link: `/my/documents?job=${project.id}`,
      cta: 'Work the checklist',
    })
  }

  const short = docs
    .filter((d) => ['APPROVED', 'ISSUED', 'SURRENDERED'].includes(d.status))
    .map((d) => ({ doc: d, check: documentStandard(d) }))
    .filter((x) => x.check.governed && x.check.missing.length > 0)
  if (short.length > 0) {
    add({
      id: `${project.id}_short`,
      urgency: 'DUE',
      title: `${short.length} issued document${short.length === 1 ? '' : 's'} incomplete`,
      because: `${short[0].doc.title} is missing ${short[0].check.missing.map((m) => m.label).join(', ')}. A bank or a customs officer checks exactly these.`,
      link: `/my/documents?job=${project.id}`,
      cta: 'Complete the fields',
    })
  }

  const filing = ctx.filings.find((f) => f.projectId === project.id && f.status === 'DRAFT')
  if (filing) {
    const readiness = filingReadiness(filing)
    if (!readiness.canSubmit) {
      add({
        id: `${project.id}_peb`,
        urgency: 'BLOCKING',
        title: 'Export declaration cannot be submitted yet',
        because: `${readiness.missing.length} mandatory upload(s) missing from the CEISA filing. Customs will not register the PEB without them, and without a PEB there is no NPE and no gate-in.`,
        link: `/projects/${project.id}?tab=customs`,
        cta: 'Upload the file',
      })
    }
  }

  const si = daysUntil(project.siCutoff)
  if (si !== null && si >= 0 && si <= 2 && !docs.some((d) => d.type === 'SHIPPING_INSTRUCTION' && d.status !== 'REQUIRED')) {
    add({
      id: `${project.id}_si`,
      urgency: 'BLOCKING',
      title: si === 0 ? 'Shipping instruction due today' : `Shipping instruction due in ${si} day${si === 1 ? '' : 's'}`,
      because: 'A late SI does not mean a late B/L — it means the carrier drops the booking.',
      link: `/my/documents?job=${project.id}`,
      cta: 'File the SI',
    })
  }

  /* ---------- closing ---------- */
  if (phase === 'CLOSING') {
    const rows = ctx.charges.filter((c) => c.projectId === project.id)
    const sheet = jobSheet(rows)

    if (sheet.unbilled.length > 0) {
      add({
        id: `${project.id}_unbilled`,
        urgency: 'DUE',
        title: `${sheet.unbilled.length} charge line${sheet.unbilled.length === 1 ? '' : 's'} still in draft`,
        because: 'A draft line never reaches the invoice. Whatever is left in draft when the job closes is money written off without anyone deciding to.',
        link: `/my/closing?job=${project.id}`,
        cta: 'Approve the lines',
      })
    }
    if (sheet.unsettledLines.length > 0) {
      add({
        id: `${project.id}_field`,
        urgency: 'DUE',
        title: 'Field cash not settled',
        because: `Cash was advanced for ${sheet.unsettledLines.map((c) => c.chargeCode).join(', ')} and no receipts have come back. Until they do the job's cost is understated.`,
        link: `/my/closing?job=${project.id}`,
        cta: 'Settle the advance',
      })
    }
    if (!docs.some((d) => d.type === 'PROOF_OF_DELIVERY' && ['ISSUED', 'APPROVED'].includes(d.status))) {
      add({
        id: `${project.id}_pod`,
        urgency: 'NEXT',
        title: 'No proof of delivery on file',
        because: 'The signed POD is what closes the transport leg. Without it a claim of non-delivery has nothing to answer it.',
        link: `/my/documents?job=${project.id}`,
        cta: 'Chase the POD',
      })
    }
  }

  return out
}

/* ================================================================
   Roll-ups for the operator's home board
   ================================================================ */

export interface JobBrief {
  project: Project
  phase: OperatorPhase
  actions: NextAction[]
  blocking: number
  /** the single most urgent thing, or undefined when the job is clear */
  top?: NextAction
  progressPct: number
  nextCutoff?: { label: string; at: string; days: number }
}

const URGENCY_RANK: Record<ActionUrgency, number> = { BLOCKING: 0, DUE: 1, NEXT: 2 }

export function jobBrief(project: Project, ctx: OperatorContext): JobBrief {
  const actions = nextActions(project, ctx).sort(
    (a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency],
  )
  const cutoffs = [
    { label: 'SI cut-off', at: project.siCutoff },
    { label: 'VGM cut-off', at: project.vgmCutoff },
    { label: 'Gate-in cut-off', at: project.gateInCutoff },
    { label: 'ETD', at: project.etd },
  ]
    .filter((c): c is { label: string; at: string } => !!c.at)
    .map((c) => ({ ...c, days: daysUntil(c.at)! }))
    .filter((c) => c.days >= 0)
    .sort((a, b) => a.days - b.days)

  return {
    project,
    phase: phaseOf(project),
    actions,
    blocking: actions.filter((a) => a.urgency === 'BLOCKING').length,
    top: actions[0],
    progressPct: ((stageIndex(project.stage) + 1) / 8) * 100,
    nextCutoff: cutoffs[0],
  }
}

export function operatorBoard(projects: Project[], ctx: OperatorContext) {
  const briefs = projects.map((p) => jobBrief(p, ctx))

  /* Paperwork does not wait for the documentation stage — a job at stuffing can
     already have a rejected certificate. So the documents phase counts every job
     with mandatory paperwork outstanding, while the job cards below stay grouped
     by stage so a job appears exactly once. */
  const needsPaperwork = briefs.filter((b) =>
    documentChecklist(b.project, ctx.documents).some((r) => r.mandatory && r.state !== 'DONE'),
  )

  return {
    briefs,
    needsPaperwork,
    byPhase: OPERATOR_PHASES.map((phase) => ({
      phase,
      jobs: briefs.filter((b) => b.phase === phase.key),
      /** what the phase card should show — documents span every stage */
      count: phase.key === 'DOCUMENTS' ? needsPaperwork.length : briefs.filter((b) => b.phase === phase.key).length,
      blocking:
        phase.key === 'DOCUMENTS'
          ? needsPaperwork.reduce((a, b) => a + b.blocking, 0)
          : briefs.filter((b) => b.phase === phase.key).reduce((a, b) => a + b.blocking, 0),
    })),
    blocking: briefs.reduce((a, b) => a + b.blocking, 0),
    clear: briefs.filter((b) => b.actions.length === 0).length,
    awaitingAcceptance: briefs.filter((b) => b.project.handover?.status === 'OFFERED').length,
  }
}

/* ================================================================
   The hand-over checklist
   ================================================================ */

/** What an operator should have in hand before accepting a job. */
export function buildHandoverChecklist(project: Project, ctx: OperatorContext): HandoverCheck[] {
  const docs = ctx.documents.filter((d) => d.projectId === project.id)
  const has = (t: string) => docs.some((d) => d.type === t && d.status !== 'REQUIRED')
  return [
    {
      key: 'parties',
      label: 'Shipper, consignee and notify party confirmed',
      hint: 'A consignee corrected after the B/L is issued costs an amendment fee and a re-presentation.',
      required: true,
      confirmed: !!project.consigneeId && !!project.shipperId,
    },
    {
      key: 'route',
      label: 'Route, Incoterm and freight term agreed',
      hint: `${project.incoterm} ${project.polName} → ${project.podName}, freight ${project.freightTerm.toLowerCase()}.`,
      required: true,
      confirmed: !!project.polCode && !!project.podCode && !!project.incoterm,
    },
    {
      key: 'booking',
      label: 'Carrier booking and cut-off calendar received',
      hint: 'Every alert on this job derives from the cut-offs. Without them nothing warns you.',
      required: true,
      confirmed: !!project.bookingNo && !!project.gateInCutoff,
    },
    {
      key: 'cargo',
      label: 'Cargo description and HS codes supplied',
      hint: 'The description on the B/L must match the invoice word for word, and under an L/C, the credit too.',
      required: true,
      confirmed: !!project.commodity && project.hsCodes.length > 0,
    },
    {
      key: 'rates',
      label: 'Charge sheet priced',
      hint: 'Work started before the rates are agreed is work you may not be paid for.',
      required: true,
      confirmed: ctx.charges.some((c) => c.projectId === project.id),
    },
    {
      key: 'special',
      label: 'Special requirements identified',
      hint: 'Treatment, insurance, DG, reefer set point, inspection — anything the destination demands.',
      required: false,
      confirmed: ctx.jobServices.some((s) => s.projectId === project.id),
    },
    {
      key: 'lc',
      label: 'Letter of credit terms read, where one applies',
      hint: 'The latest shipment date and the required documents come from the credit, not from us.',
      required: project.paymentTerm === 'LC_AT_SIGHT',
      confirmed: project.paymentTerm !== 'LC_AT_SIGHT' || has('LETTER_OF_CREDIT'),
    },
  ]
}

/** Documents a job should have, whether or not a record exists yet. */
export function documentChecklist(project: Project, docs: ShipmentDocument[]) {
  const own = docs.filter((d) => d.projectId === project.id)
  return DOC_TYPES.filter((t) => t.type !== 'OTHER').map((t) => {
    const doc = own.find((d) => d.type === t.type)
    const check = doc ? documentStandard(doc) : undefined
    return {
      type: t.type,
      label: t.label,
      hint: t.hint,
      stage: t.stage,
      mandatory: doc?.mandatory ?? t.mandatoryDefault,
      doc,
      check,
      state: !doc
        ? ('MISSING' as const)
        : doc.status === 'REJECTED'
          ? ('REJECTED' as const)
          : ['ISSUED', 'APPROVED', 'SURRENDERED'].includes(doc.status)
            ? check && check.missing.length > 0
              ? ('INCOMPLETE' as const)
              : ('DONE' as const)
            : ('IN_PROGRESS' as const),
    }
  })
}
