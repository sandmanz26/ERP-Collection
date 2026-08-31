import type {
  AdditionalService, CompanyProfile, Container, DocFieldSpec, Incident, JobService,
  Project, ServiceTrigger, ShipmentDocument,
} from '@/data/types'
import { ADDITIONAL_SERVICES, LICENCE_WARNING_DAYS, docFieldSpecs, incidentStatusOpen, serviceTriggerLabel } from '@/data/reference'

/* ================================================================
   Service triggers — read off the job, never typed in by hand
   ================================================================ */

const EU_UK = ['NL', 'DE', 'BE', 'IT', 'ES', 'FR', 'GB', 'PL', 'SE', 'DK', 'FI', 'PT', 'AT', 'IE']
const FRAGILE_WORDS = ['glass', 'ceramic', 'marble', 'stone', 'porcelain', 'electronic', 'component', 'harness', 'tile']
const WOOD_UNITS = ['PALLET', 'CRATE', 'BUNDLE']
const HIGH_VALUE_USD = 100_000

const hsChapter = (hs: string) => Number(hs.slice(0, 2))

/** Everything about this job that could switch a service on. */
export function detectTriggers(project: Project, containers: Container[]): ServiceTrigger[] {
  const found = new Set<ServiceTrigger>(['ALWAYS'])
  const own = containers.filter((c) => c.projectId === project.id)
  const items = own.flatMap((c) => c.items)

  if (items.some((i) => WOOD_UNITS.includes(i.packageUnit))) found.add('WOODEN_PACKAGING')

  const chapters = [...project.hsCodes, ...items.map((i) => i.hsCode ?? '')]
    .filter(Boolean)
    .map(hsChapter)
    .filter((n) => !Number.isNaN(n))
  if (chapters.some((c) => (c >= 6 && c <= 14) || c === 44)) found.add('PLANT_PRODUCT')
  if (chapters.some((c) => (c >= 1 && c <= 5) || c === 16)) found.add('ANIMAL_PRODUCT')
  if (chapters.some((c) => c === 4 || (c >= 7 && c <= 22))) found.add('FOOD_GRADE')

  if (project.dangerousGoods || own.some((c) => c.imoClass)) found.add('DANGEROUS_GOODS')
  if (own.some((c) => c.type === '20RF' || c.type === '40RH')) found.add('REEFER')
  if (own.some((c) => c.type === '40FR' || c.type === '20OT')) found.add('OUT_OF_GAUGE')
  if (own.some((c) => c.type === 'LCL') || project.type === 'PARTIAL_LCL') found.add('LCL')

  const valueUsd = project.cargoCurrency === 'USD' ? project.cargoValue : project.cargoValue / (project.fxRate || 1)
  if (valueUsd >= HIGH_VALUE_USD) found.add('HIGH_VALUE')

  const haystack = `${project.commodity} ${items.map((i) => i.description).join(' ')}`.toLowerCase()
  if (FRAGILE_WORDS.some((w) => haystack.includes(w))) found.add('FRAGILE')

  if (['AU', 'NZ'].includes(project.destCountry)) found.add('DESTINATION_AU')
  if (['US', 'CA'].includes(project.destCountry)) found.add('DESTINATION_US')
  if (EU_UK.includes(project.destCountry)) found.add('DESTINATION_EU')

  return [...found]
}

export interface ServiceRecommendation {
  service: AdditionalService
  mandatory: boolean
  /** the triggers that actually fired, in plain words */
  reasons: string[]
  /** already on the job? */
  attachedStatus?: JobService['status']
}

/**
 * What this job should be buying. Mandatory rules win over suggestions, and a
 * service already on the job is returned with its status rather than hidden —
 * an operator needs to see a declined mandatory service, not lose it.
 */
export function recommendServices(
  project: Project,
  containers: Container[],
  attached: JobService[],
  catalogue: AdditionalService[] = ADDITIONAL_SERVICES,
): ServiceRecommendation[] {
  const triggers = detectTriggers(project, containers)
  const out: ServiceRecommendation[] = []
  for (const service of catalogue) {
    if (!service.active) continue
    const mand = service.mandatoryWhen.filter((t) => triggers.includes(t))
    const sugg = service.suggestedWhen.filter((t) => triggers.includes(t) && t !== 'ALWAYS')
    const always = service.suggestedWhen.includes('ALWAYS')
    if (!mand.length && !sugg.length && !always) continue
    const fired = mand.length ? mand : sugg
    out.push({
      service,
      mandatory: mand.length > 0,
      reasons: fired.length ? fired.map(serviceTriggerLabel) : ['Standard scope'],
      attachedStatus: attached.find((a) => a.serviceId === service.id)?.status,
    })
  }
  return out.sort((a, b) => Number(b.mandatory) - Number(a.mandatory) || a.service.name.localeCompare(b.service.name))
}

/** Mandatory services the client refused, or that failed — these hold a job up. */
export function serviceBlockers(recs: ServiceRecommendation[], attached: JobService[]): string[] {
  const out: string[] = []
  for (const r of recs.filter((x) => x.mandatory)) {
    const job = attached.find((a) => a.serviceId === r.service.id)
    if (!job) out.push(`${r.service.name} is mandatory here (${r.reasons.join(', ')}) and has not been added.`)
    else if (job.status === 'DECLINED') out.push(`${r.service.name} was declined by the client, but the destination requires it.`)
    else if (job.status === 'FAILED') out.push(`${r.service.name} failed — the cargo cannot ship until it is repeated and passed.`)
  }
  return out
}

export function serviceFinancials(services: JobService[]) {
  const buy = services.reduce((a, s) => a + s.buyRate * s.quantity, 0)
  const sell = services.reduce((a, s) => a + s.sellRate * s.quantity, 0)
  return { buy, sell, margin: sell - buy, marginPct: sell ? ((sell - buy) / sell) * 100 : 0 }
}

/* ================================================================
   Document standards
   ================================================================ */

export interface DocCompleteness {
  specs: DocFieldSpec[]
  filled: number
  requiredTotal: number
  missing: DocFieldSpec[]
  pct: number
  /** a standard exists for this type at all */
  governed: boolean
}

export function documentStandard(doc: ShipmentDocument): DocCompleteness {
  const specs = docFieldSpecs(doc.type)
  const required = specs.filter((s) => s.required)
  const values = new Map((doc.fields ?? []).map((f) => [f.key, f.value.trim()]))
  const missing = required.filter((s) => !values.get(s.key))
  const filled = required.length - missing.length
  return {
    specs,
    filled,
    requiredTotal: required.length,
    missing,
    pct: required.length ? (filled / required.length) * 100 : 100,
    governed: specs.length > 0,
  }
}

/** Documents that claim to be issued or approved while their standard is incomplete. */
export function documentStandardBreaches(docs: ShipmentDocument[]) {
  const settled = ['APPROVED', 'ISSUED', 'SURRENDERED']
  return docs
    .filter((d) => settled.includes(d.status))
    .map((d) => ({ doc: d, check: documentStandard(d) }))
    .filter((x) => x.check.governed && x.check.missing.length > 0)
}

/* ================================================================
   Incidents
   ================================================================ */

export function incidentExposure(incidents: Incident[]) {
  const open = incidents.filter((i) => incidentStatusOpen(i.status))
  const cost = incidents.reduce((a, i) => a + i.costImpact, 0)
  const expected = incidents.reduce((a, i) => a + i.recoveryExpected, 0)
  const received = incidents.reduce((a, i) => a + i.recoveryReceived, 0)
  return {
    total: incidents.length,
    open: open.length,
    critical: open.filter((i) => i.severity === 'CRITICAL').length,
    cost,
    expected,
    received,
    outstanding: expected - received,
    /** what we actually absorbed */
    netLoss: cost - received,
    recoveryRatePct: cost ? (received / cost) * 100 : 0,
  }
}

export function incidentsByType(incidents: Incident[]) {
  const map = new Map<string, { type: string; count: number; cost: number; netLoss: number }>()
  for (const i of incidents) {
    const row = map.get(i.type) ?? { type: i.type, count: 0, cost: 0, netLoss: 0 }
    row.count++
    row.cost += i.costImpact
    row.netLoss += i.costImpact - i.recoveryReceived
    map.set(i.type, row)
  }
  return [...map.values()].sort((a, b) => b.netLoss - a.netLoss)
}

export function incidentsByLiability(incidents: Incident[]) {
  const map = new Map<string, { party: string; count: number; cost: number; recovered: number }>()
  for (const i of incidents) {
    const row = map.get(i.liableParty) ?? { party: i.liableParty, count: 0, cost: 0, recovered: 0 }
    row.count++
    row.cost += i.costImpact
    row.recovered += i.recoveryReceived
    map.set(i.liableParty, row)
  }
  return [...map.values()].sort((a, b) => b.cost - a.cost)
}

/* ================================================================
   The forwarder's own compliance
   ================================================================ */

export interface LicenceAlert {
  licenceId: string
  name: string
  number: string
  expiresAt: string
  daysLeft: number
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
}

export function licenceAlerts(company: CompanyProfile, now = new Date()): LicenceAlert[] {
  const out: LicenceAlert[] = []
  for (const l of company.licences) {
    if (!l.expiresAt) continue
    const daysLeft = Math.round((new Date(l.expiresAt).getTime() - now.getTime()) / 86_400_000)
    if (daysLeft > LICENCE_WARNING_DAYS) continue
    out.push({
      licenceId: l.id,
      name: l.name,
      number: l.number,
      expiresAt: l.expiresAt,
      daysLeft,
      severity: daysLeft < 0 ? 'CRITICAL' : daysLeft <= 30 ? 'HIGH' : 'MEDIUM',
    })
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft)
}

/** Liability cover expiry is its own alarm — trading without it is uninsured trading. */
export function liabilityAlert(company: CompanyProfile, now = new Date()) {
  const daysLeft = Math.round((new Date(company.liabilityExpiresAt).getTime() - now.getTime()) / 86_400_000)
  if (daysLeft > LICENCE_WARNING_DAYS) return null
  return { daysLeft, expiresAt: company.liabilityExpiresAt, expired: daysLeft < 0 }
}

/* ================================================================
   Phase 3 exceptions — services refused, incidents open, licences
   lapsing and documents that do not meet their own standard
   ================================================================ */

import type { Exception } from './analytics'
import { incidentTypeLabel } from '@/data/reference'

export function buildPhase3Exceptions(input: {
  projects: Project[]
  containers: Container[]
  documents: ShipmentDocument[]
  jobServices: JobService[]
  services: AdditionalService[]
  incidents: Incident[]
  company: CompanyProfile
}): Exception[] {
  const out: Exception[] = []
  const { projects, containers, documents, jobServices, services, incidents, company } = input
  const live = projects.filter((p) => p.status === 'ACTIVE' || p.status === 'DRAFT')

  /* --- a mandatory service missing, declined or failed on a live job --- */
  for (const p of live) {
    const attached = jobServices.filter((j) => j.projectId === p.id)
    const recs = recommendServices(p, containers, attached, services)
    for (const blocker of serviceBlockers(recs, attached)) {
      out.push({
        id: `${p.id}_svc_${blocker.slice(0, 24)}`,
        severity: 'CRITICAL',
        category: 'COMPLIANCE',
        title: `${p.code} — required service not in place`,
        detail: `${blocker} The destination authority will not accept the cargo without it, and the cost of a refusal at the border is many times the service.`,
        projectId: p.id,
        projectCode: p.code,
        link: `/projects/${p.id}`,
        action: 'Add or re-book the service',
      })
    }
  }

  /* --- critical incidents still open --- */
  for (const i of incidents) {
    if (!incidentStatusOpen(i.status)) continue
    if (i.severity !== 'CRITICAL' && i.severity !== 'HIGH') continue
    const project = projects.find((p) => p.id === i.projectId)
    out.push({
      id: `${i.id}_open`,
      severity: i.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      category: 'COMPLIANCE',
      title: `${i.reference} — ${incidentTypeLabel(i.type)} still open`,
      detail: `${i.title}. ${
        i.recoveryExpected > i.recoveryReceived
          ? `${Math.round((i.recoveryExpected - i.recoveryReceived) / 1e6)} M still to recover from the ${i.liableParty.toLowerCase()}.`
          : 'No recovery expected — this one lands on us.'
      } Owned by ${i.owner}.`,
      projectId: i.projectId,
      projectCode: project?.code,
      link: '/incidents',
      action: 'Work the claim',
    })
  }

  /* --- our own licences --- */
  for (const alert of licenceAlerts(company)) {
    out.push({
      id: `lic_${alert.licenceId}`,
      severity: alert.severity === 'CRITICAL' ? 'CRITICAL' : alert.severity,
      category: 'COMPLIANCE',
      title:
        alert.daysLeft < 0
          ? `${alert.name} has lapsed`
          : `${alert.name} expires in ${alert.daysLeft} day${alert.daysLeft === 1 ? '' : 's'}`,
      detail:
        alert.daysLeft < 0
          ? `Licence ${alert.number} expired ${Math.abs(alert.daysLeft)} days ago. Any filing made under it can be challenged.`
          : `Licence ${alert.number} needs renewing. Renewals take longer than the notice period suggests — start now.`,
      link: '/settings',
      action: 'Renew the licence',
    })
  }

  const liability = liabilityAlert(company)
  if (liability) {
    out.push({
      id: 'liability_cover',
      severity: liability.expired ? 'CRITICAL' : 'HIGH',
      category: 'COMPLIANCE',
      title: liability.expired ? 'Freight liability cover has expired' : `Freight liability cover expires in ${liability.daysLeft} days`,
      detail: liability.expired
        ? 'We are trading uninsured. Every job accepted from here carries the full exposure on our own balance sheet.'
        : 'Renew before it lapses — an overseas agent will refuse to release cargo to an uninsured forwarder.',
      link: '/settings',
      action: 'Renew the cover',
    })
  }

  /* --- documents claiming to be issued while failing their own standard --- */
  for (const { doc, check } of documentStandardBreaches(documents)) {
    const project = projects.find((p) => p.id === doc.projectId)
    out.push({
      id: `${doc.id}_standard`,
      severity: doc.mandatory ? 'HIGH' : 'MEDIUM',
      category: 'DOCUMENT',
      title: `${doc.title} is short of ${check.missing.length} mandatory field${check.missing.length === 1 ? '' : 's'}`,
      detail: `Marked ${doc.status.toLowerCase()} but missing ${check.missing.map((m) => m.label).join(', ')}. A bank or customs office checks exactly these.`,
      projectId: doc.projectId,
      projectCode: project?.code,
      link: '/documents',
      action: 'Complete the document',
    })
  }

  return out
}
