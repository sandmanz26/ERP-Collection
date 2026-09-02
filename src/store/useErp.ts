import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Account, AdditionalService, AppSettings, CompanyProfile, Container, Customer, CustomsFiling,
  Incident, Invoice, JobService, JournalEntry, Milestone, Partner, Project, ProjectCharge, Quotation,
  HandoverCheck, ServicePackage, ShipmentDocument, StageKey, StuffingJob, WarehouseReceipt,
} from '@/data/types'
import { accounts as seedAccounts, charges as seedCharges, containers as seedContainers, customers as seedCustomers, documents as seedDocuments, invoices as seedInvoices, journal as seedJournal, packages as seedPackages, projects as seedProjects } from '@/data/seed'
import {
  customsFilings as seedFilings, defaultSettings, milestones as seedMilestones, partners as seedPartners,
  quotations as seedQuotations, warehouseReceipts as seedReceipts,
} from '@/data/seed2'
import {
  company as seedCompany, incidents as seedIncidents, jobServices as seedJobServices,
  stuffingJobs as seedStuffing,
} from '@/data/seed3'
import { ADDITIONAL_SERVICES } from '@/data/reference'
/* fills every document's fields with values computed from its own job */
import '@/data/seed4'
import { uid } from '@/lib/utils'
import { useAuth } from './useAuth'

/** The audit trail records who did it, so it has to ask the session, not a constant. */
const actor = () => {
  const { users, currentUserId } = useAuth.getState()
  return users.find((u) => u.id === currentUserId)?.fullName ?? 'System'
}

export type EntityKey =
  | 'customers' | 'packages' | 'projects' | 'containers' | 'documents' | 'charges' | 'accounts'
  | 'journal' | 'invoices' | 'quotations' | 'partners' | 'milestones' | 'receipts' | 'filings'
  | 'services' | 'jobServices' | 'incidents' | 'stuffingJobs'

export interface ActivityLog {
  id: string
  at: string
  action: string
  entity: string
  detail: string
  actor: string
}

interface ErpState {
  customers: Customer[]
  packages: ServicePackage[]
  projects: Project[]
  containers: Container[]
  documents: ShipmentDocument[]
  charges: ProjectCharge[]
  accounts: Account[]
  journal: JournalEntry[]
  invoices: Invoice[]
  quotations: Quotation[]
  partners: Partner[]
  milestones: Milestone[]
  receipts: WarehouseReceipt[]
  filings: CustomsFiling[]
  services: AdditionalService[]
  jobServices: JobService[]
  incidents: Incident[]
  stuffingJobs: StuffingJob[]
  company: CompanyProfile
  settings: AppSettings
  activity: ActivityLog[]

  log: (action: string, entity: string, detail: string) => void

  upsertCustomer: (c: Customer) => void
  removeCustomers: (ids: string[]) => void
  importCustomers: (rows: Customer[]) => void

  upsertPackage: (p: ServicePackage) => void
  removePackages: (ids: string[]) => void
  importPackages: (rows: ServicePackage[]) => void

  upsertProject: (p: Project) => void
  removeProjects: (ids: string[]) => void
  importProjects: (rows: Project[]) => void
  toggleStageTask: (projectId: string, stage: StageKey, taskId: string) => void
  advanceStage: (projectId: string, to: StageKey) => void

  upsertContainer: (c: Container) => void
  removeContainers: (ids: string[]) => void
  importContainers: (rows: Container[]) => void

  upsertDocument: (d: ShipmentDocument) => void
  removeDocuments: (ids: string[]) => void
  importDocuments: (rows: ShipmentDocument[]) => void

  upsertCharge: (c: ProjectCharge) => void
  removeCharges: (ids: string[]) => void
  importCharges: (rows: ProjectCharge[]) => void

  upsertJournal: (j: JournalEntry) => void
  removeJournal: (ids: string[]) => void
  importJournal: (rows: JournalEntry[]) => void

  upsertAccount: (a: Account) => void
  removeAccounts: (ids: string[]) => void
  importAccounts: (rows: Account[]) => void

  upsertInvoice: (i: Invoice) => void
  removeInvoices: (ids: string[]) => void

  upsertQuotation: (q: Quotation) => void
  removeQuotations: (ids: string[]) => void
  importQuotations: (rows: Quotation[]) => void
  reviseQuotation: (id: string) => Quotation | undefined
  decideQuotation: (id: string, outcome: 'ACCEPTED' | 'REJECTED', payload?: { lossReason?: Quotation['lossReason']; competitorName?: string; note?: string }) => void
  convertQuotation: (id: string, project: Project, charges: ProjectCharge[]) => void

  upsertPartner: (p: Partner) => void
  removePartners: (ids: string[]) => void
  importPartners: (rows: Partner[]) => void

  upsertMilestone: (m: Milestone) => void
  removeMilestones: (ids: string[]) => void
  importMilestones: (rows: Milestone[]) => void
  syncPlannedMilestones: (projectId: string, planned: { code: Milestone['code']; plannedAt: string }[]) => void

  upsertReceipt: (r: WarehouseReceipt) => void
  removeReceipts: (ids: string[]) => void
  importReceipts: (rows: WarehouseReceipt[]) => void

  upsertFiling: (f: CustomsFiling) => void
  removeFilings: (ids: string[]) => void
  importFilings: (rows: CustomsFiling[]) => void

  upsertService: (s: AdditionalService) => void
  removeServices: (ids: string[]) => void
  importServices: (rows: AdditionalService[]) => void

  upsertJobService: (s: JobService) => void
  removeJobServices: (ids: string[]) => void
  importJobServices: (rows: JobService[]) => void
  attachServices: (projectId: string, rows: JobService[]) => void
  pushServiceToCharges: (jobServiceId: string) => void

  upsertIncident: (i: Incident) => void
  removeIncidents: (ids: string[]) => void
  importIncidents: (rows: Incident[]) => void

  acceptJob: (projectId: string, checklist: HandoverCheck[]) => void
  declineJob: (projectId: string, reason: string) => void
  reassignJob: (projectId: string, operatorId: string) => void
  setHandoverCheck: (projectId: string, key: string, confirmed: boolean) => void

  upsertStuffing: (j: StuffingJob) => void
  removeStuffing: (ids: string[]) => void
  importStuffing: (rows: StuffingJob[]) => void

  updateCompany: (patch: Partial<CompanyProfile>) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  clearActivity: () => void

  resetDemoData: () => void
}

const seedState = () => ({
  customers: seedCustomers,
  packages: seedPackages,
  projects: seedProjects,
  containers: seedContainers,
  documents: seedDocuments,
  charges: seedCharges,
  accounts: seedAccounts,
  journal: seedJournal,
  invoices: seedInvoices,
  quotations: seedQuotations,
  partners: seedPartners,
  milestones: seedMilestones,
  receipts: seedReceipts,
  filings: seedFilings,
  services: ADDITIONAL_SERVICES,
  jobServices: seedJobServices,
  incidents: seedIncidents,
  stuffingJobs: seedStuffing,
  company: structuredClone(seedCompany),
  settings: structuredClone(defaultSettings),
  activity: [] as ActivityLog[],
})

const upsert = <T extends { id: string }>(list: T[], item: T) => {
  const idx = list.findIndex((x) => x.id === item.id)
  if (idx === -1) return [item, ...list]
  const next = list.slice()
  next[idx] = item
  return next
}

export const useErp = create<ErpState>()(
  persist(
    (set, get) => ({
      ...seedState(),

      log: (action, entity, detail) =>
        set((s) => ({
          activity: [
            { id: uid('log'), at: new Date().toISOString(), action, entity, detail, actor: actor() },
            ...s.activity,
          ].slice(0, 200),
        })),

      upsertCustomer: (c) => {
        set((s) => ({ customers: upsert(s.customers, c) }))
        get().log('save', 'Customer', `${c.code} — ${c.legalName}`)
      },
      removeCustomers: (ids) => {
        const names = get().customers.filter((c) => ids.includes(c.id)).map((c) => c.code)
        set((s) => ({ customers: s.customers.filter((c) => !ids.includes(c.id)) }))
        get().log('delete', 'Customer', names.join(', '))
      },
      importCustomers: (rows) => {
        set((s) => {
          let list = s.customers
          rows.forEach((r) => (list = upsert(list, r)))
          return { customers: list }
        })
        get().log('import', 'Customer', `${rows.length} records`)
      },

      upsertPackage: (p) => {
        set((s) => ({ packages: upsert(s.packages, p) }))
        get().log('save', 'Package', `${p.code} — ${p.name}`)
      },
      removePackages: (ids) => {
        set((s) => ({ packages: s.packages.filter((p) => !ids.includes(p.id)) }))
        get().log('delete', 'Package', `${ids.length} records`)
      },
      importPackages: (rows) => {
        set((s) => {
          let list = s.packages
          rows.forEach((r) => (list = upsert(list, r)))
          return { packages: list }
        })
        get().log('import', 'Package', `${rows.length} records`)
      },

      upsertProject: (p) => {
        set((s) => ({ projects: upsert(s.projects, { ...p, updatedAt: new Date().toISOString() }) }))
        get().log('save', 'Project', `${p.code} — ${p.name}`)
      },
      removeProjects: (ids) => {
        set((s) => ({
          projects: s.projects.filter((p) => !ids.includes(p.id)),
          containers: s.containers.filter((c) => !ids.includes(c.projectId)),
          documents: s.documents.filter((d) => !ids.includes(d.projectId)),
          charges: s.charges.filter((c) => !ids.includes(c.projectId)),
          milestones: s.milestones.filter((m) => !ids.includes(m.projectId)),
          filings: s.filings.filter((f) => !ids.includes(f.projectId)),
        }))
        get().log('delete', 'Project', `${ids.length} jobs with their containers, documents, charges, milestones and customs filings`)
      },
      importProjects: (rows) => {
        set((s) => {
          let list = s.projects
          rows.forEach((r) => (list = upsert(list, r)))
          return { projects: list }
        })
        get().log('import', 'Project', `${rows.length} records`)
      },
      toggleStageTask: (projectId, stage, taskId) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p
            return {
              ...p,
              updatedAt: new Date().toISOString(),
              stages: p.stages.map((st) =>
                st.key !== stage
                  ? st
                  : {
                      ...st,
                      tasks: st.tasks.map((t) =>
                        t.id !== taskId ? t : { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : undefined },
                      ),
                    },
              ),
            }
          }),
        })),
      advanceStage: (projectId, to) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== projectId
              ? p
              : {
                  ...p,
                  stage: to,
                  updatedAt: new Date().toISOString(),
                  stages: p.stages.map((st) => (st.key === to && !st.enteredAt ? { ...st, enteredAt: new Date().toISOString() } : st)),
                  timeline: [
                    { id: uid('tl'), at: new Date().toISOString(), type: 'STATUS' as const, title: `Moved to ${to.replace(/_/g, ' ').toLowerCase()}`, actor: 'Elena Marchetti' },
                    ...p.timeline,
                  ],
                },
          ),
        }))
        get().log('stage', 'Project', `advanced to ${to}`)
      },

      upsertContainer: (c) => {
        set((s) => ({ containers: upsert(s.containers, c) }))
        get().log('save', 'Container', c.containerNo ?? `unit #${c.seq}`)
      },
      removeContainers: (ids) => {
        set((s) => ({ containers: s.containers.filter((c) => !ids.includes(c.id)) }))
        get().log('delete', 'Container', `${ids.length} units`)
      },
      importContainers: (rows) => {
        set((s) => {
          let list = s.containers
          rows.forEach((r) => (list = upsert(list, r)))
          return { containers: list }
        })
        get().log('import', 'Container', `${rows.length} records`)
      },

      upsertDocument: (d) => {
        set((s) => ({ documents: upsert(s.documents, { ...d, updatedAt: new Date().toISOString() }) }))
        get().log('save', 'Document', d.title)
      },
      removeDocuments: (ids) => {
        set((s) => ({ documents: s.documents.filter((d) => !ids.includes(d.id)) }))
        get().log('delete', 'Document', `${ids.length} documents`)
      },
      importDocuments: (rows) => {
        set((s) => {
          let list = s.documents
          rows.forEach((r) => (list = upsert(list, r)))
          return { documents: list }
        })
        get().log('import', 'Document', `${rows.length} records`)
      },

      upsertCharge: (c) => {
        set((s) => ({ charges: upsert(s.charges, c) }))
        get().log('save', 'Charge', `${c.chargeCode} — ${c.description}`)
      },
      removeCharges: (ids) => {
        set((s) => ({ charges: s.charges.filter((c) => !ids.includes(c.id)) }))
        get().log('delete', 'Charge', `${ids.length} lines`)
      },
      importCharges: (rows) => {
        set((s) => {
          let list = s.charges
          rows.forEach((r) => (list = upsert(list, r)))
          return { charges: list }
        })
        get().log('import', 'Charge', `${rows.length} records`)
      },

      upsertJournal: (j) => {
        set((s) => ({ journal: upsert(s.journal, j) }))
        get().log('save', 'Journal', `${j.entryNo} — ${j.memo}`)
      },
      removeJournal: (ids) => {
        set((s) => ({ journal: s.journal.filter((j) => !ids.includes(j.id)) }))
        get().log('delete', 'Journal', `${ids.length} entries`)
      },
      importJournal: (rows) => {
        set((s) => {
          let list = s.journal
          rows.forEach((r) => (list = upsert(list, r)))
          return { journal: list }
        })
        get().log('import', 'Journal', `${rows.length} records`)
      },

      upsertAccount: (a) => {
        set((s) => ({ accounts: upsert(s.accounts, a) }))
        get().log('save', 'Account', `${a.code} — ${a.name}`)
      },
      removeAccounts: (ids) => {
        set((s) => ({ accounts: s.accounts.filter((a) => !ids.includes(a.id)) }))
        get().log('delete', 'Account', `${ids.length} accounts`)
      },
      importAccounts: (rows) => {
        set((s) => {
          let list = s.accounts
          rows.forEach((r) => (list = upsert(list, r)))
          return { accounts: list }
        })
        get().log('import', 'Account', `${rows.length} records`)
      },

      upsertInvoice: (i) => {
        set((s) => ({ invoices: upsert(s.invoices, i) }))
        get().log('save', 'Invoice', i.number)
      },
      removeInvoices: (ids) => {
        set((s) => ({ invoices: s.invoices.filter((i) => !ids.includes(i.id)) }))
        get().log('delete', 'Invoice', `${ids.length} invoices`)
      },

      upsertQuotation: (q) => {
        set((s) => ({ quotations: upsert(s.quotations, { ...q, updatedAt: new Date().toISOString() }) }))
        get().log('save', 'Quotation', `${q.number} v${q.version}`)
      },
      removeQuotations: (ids) => {
        set((s) => ({ quotations: s.quotations.filter((q) => !ids.includes(q.id)) }))
        get().log('delete', 'Quotation', `${ids.length} quotations`)
      },
      importQuotations: (rows) => {
        set((s) => {
          let list = s.quotations
          rows.forEach((r) => (list = upsert(list, r)))
          return { quotations: list }
        })
        get().log('import', 'Quotation', `${rows.length} records`)
      },
      reviseQuotation: (id) => {
        const source = get().quotations.find((q) => q.id === id)
        if (!source) return undefined
        const now = new Date().toISOString()
        const revision: Quotation = {
          ...structuredClone(source),
          id: uid('qt'),
          version: source.version + 1,
          revisionOfId: source.id,
          supersededById: undefined,
          status: 'DRAFT',
          sentAt: undefined,
          decidedAt: undefined,
          lossReason: undefined,
          createdAt: now,
          updatedAt: now,
          events: [
            { id: uid('qe'), at: now, type: 'REVISED', note: `Revision ${source.version + 1} opened from ${source.number} v${source.version}.`, actor: 'Elena Marchetti' },
            ...source.events,
          ],
        }
        set((s) => ({
          quotations: [revision, ...s.quotations.map((q) => (q.id === id ? { ...q, supersededById: revision.id, status: 'WITHDRAWN' as const } : q))],
        }))
        get().log('revise', 'Quotation', `${source.number} → v${revision.version}`)
        return revision
      },
      decideQuotation: (id, outcome, payload) => {
        const now = new Date().toISOString()
        set((s) => ({
          quotations: s.quotations.map((q) =>
            q.id !== id
              ? q
              : {
                  ...q,
                  status: outcome,
                  decidedAt: now,
                  probability: outcome === 'ACCEPTED' ? 100 : 0,
                  lossReason: outcome === 'REJECTED' ? payload?.lossReason : undefined,
                  competitorName: outcome === 'REJECTED' ? payload?.competitorName : undefined,
                  updatedAt: now,
                  events: [
                    {
                      id: uid('qe'), at: now, type: 'DECIDED' as const,
                      note: payload?.note ?? (outcome === 'ACCEPTED' ? 'Accepted by the client.' : 'Lost.'),
                      actor: 'Elena Marchetti',
                    },
                    ...q.events,
                  ],
                },
          ),
        }))
        get().log('decide', 'Quotation', `${outcome.toLowerCase()}`)
      },
      convertQuotation: (id, project, charges) => {
        const now = new Date().toISOString()
        set((s) => ({
          projects: [project, ...s.projects],
          charges: [...charges, ...s.charges],
          quotations: s.quotations.map((q) =>
            q.id !== id
              ? q
              : {
                  ...q,
                  status: 'ACCEPTED' as const,
                  decidedAt: q.decidedAt ?? now,
                  probability: 100,
                  convertedProjectId: project.id,
                  updatedAt: now,
                  events: [
                    { id: uid('qe'), at: now, type: 'CONVERTED' as const, note: `Converted to job ${project.code} with ${charges.length} charge lines.`, actor: 'Elena Marchetti' },
                    ...q.events,
                  ],
                },
          ),
        }))
        get().log('convert', 'Quotation', `→ ${project.code}`)
      },

      upsertPartner: (p) => {
        set((s) => ({ partners: upsert(s.partners, p) }))
        get().log('save', 'Partner', `${p.code} — ${p.name}`)
      },
      removePartners: (ids) => {
        set((s) => ({ partners: s.partners.filter((p) => !ids.includes(p.id)) }))
        get().log('delete', 'Partner', `${ids.length} partners`)
      },
      importPartners: (rows) => {
        set((s) => {
          let list = s.partners
          rows.forEach((r) => (list = upsert(list, r)))
          return { partners: list }
        })
        get().log('import', 'Partner', `${rows.length} records`)
      },

      upsertMilestone: (m) => {
        set((s) => ({ milestones: upsert(s.milestones, m) }))
        get().log('save', 'Milestone', m.code)
      },
      removeMilestones: (ids) => {
        set((s) => ({ milestones: s.milestones.filter((m) => !ids.includes(m.id)) }))
        get().log('delete', 'Milestone', `${ids.length} events`)
      },
      importMilestones: (rows) => {
        set((s) => {
          let list = s.milestones
          rows.forEach((r) => (list = upsert(list, r)))
          return { milestones: list }
        })
        get().log('import', 'Milestone', `${rows.length} records`)
      },
      syncPlannedMilestones: (projectId, planned) => {
        set((s) => {
          const existing = s.milestones.filter((m) => m.projectId === projectId)
          const kept = existing.filter((m) => m.actualAt)
          const now = new Date().toISOString()
          const rebuilt = planned.map((p) => {
            const prior = existing.find((m) => m.code === p.code)
            if (prior?.actualAt) return { ...prior, plannedAt: p.plannedAt }
            return (
              prior
                ? { ...prior, plannedAt: p.plannedAt }
                : {
                    id: uid('ms'), projectId, code: p.code, plannedAt: p.plannedAt,
                    source: 'MANUAL' as const, recordedBy: 'Elena Marchetti', recordedAt: now,
                  }
            )
          })
          void kept
          return { milestones: [...s.milestones.filter((m) => m.projectId !== projectId), ...rebuilt] }
        })
        get().log('sync', 'Milestone', 'planned dates regenerated from the job schedule')
      },

      upsertReceipt: (r) => {
        set((s) => ({ receipts: upsert(s.receipts, r) }))
        get().log('save', 'Warehouse receipt', r.number)
      },
      removeReceipts: (ids) => {
        set((s) => ({ receipts: s.receipts.filter((r) => !ids.includes(r.id)) }))
        get().log('delete', 'Warehouse receipt', `${ids.length} receipts`)
      },
      importReceipts: (rows) => {
        set((s) => {
          let list = s.receipts
          rows.forEach((r) => (list = upsert(list, r)))
          return { receipts: list }
        })
        get().log('import', 'Warehouse receipt', `${rows.length} records`)
      },

      upsertFiling: (f) => {
        set((s) => ({ filings: upsert(s.filings, f) }))
        get().log('save', 'Customs filing', `${f.type} ${f.regNumber ?? ''}`)
      },
      removeFilings: (ids) => {
        set((s) => ({ filings: s.filings.filter((f) => !ids.includes(f.id)) }))
        get().log('delete', 'Customs filing', `${ids.length} filings`)
      },
      importFilings: (rows) => {
        set((s) => {
          let list = s.filings
          rows.forEach((r) => (list = upsert(list, r)))
          return { filings: list }
        })
        get().log('import', 'Customs filing', `${rows.length} records`)
      },

      upsertService: (svc) => {
        set((st) => ({ services: upsert(st.services, svc) }))
        get().log('save', 'Service', `${svc.code} — ${svc.name}`)
      },
      removeServices: (ids) => {
        const inUse = get().jobServices.filter((j) => ids.includes(j.serviceId))
        if (inUse.length) {
          get().log('refused', 'Service', `${inUse.length} job service(s) still reference this catalogue entry`)
          return
        }
        set((st) => ({ services: st.services.filter((x) => !ids.includes(x.id)) }))
        get().log('delete', 'Service', `${ids.length} catalogue entries`)
      },
      importServices: (rows) => {
        set((st) => {
          let list = st.services
          rows.forEach((r) => (list = upsert(list, r)))
          return { services: list }
        })
        get().log('import', 'Service', `${rows.length} records`)
      },

      upsertJobService: (svc) => {
        set((st) => ({ jobServices: upsert(st.jobServices, svc) }))
        get().log('save', 'Job service', `${svc.code} on ${svc.projectId}`)
      },
      removeJobServices: (ids) => {
        set((st) => ({ jobServices: st.jobServices.filter((x) => !ids.includes(x.id)) }))
        get().log('delete', 'Job service', `${ids.length} records`)
      },
      importJobServices: (rows) => {
        set((st) => {
          let list = st.jobServices
          rows.forEach((r) => (list = upsert(list, r)))
          return { jobServices: list }
        })
        get().log('import', 'Job service', `${rows.length} records`)
      },
      attachServices: (projectId, rows) => {
        set((st) => {
          let list = st.jobServices
          rows.forEach((r) => (list = upsert(list, r)))
          return { jobServices: list }
        })
        get().log('save', 'Job service', `${rows.length} service(s) added to ${projectId}`)
      },
      /** Turn a completed service into a billable line so nothing is done for free. */
      pushServiceToCharges: (jobServiceId) => {
        const st = get()
        const js = st.jobServices.find((x) => x.id === jobServiceId)
        if (!js || js.chargeId) return
        const cat = st.services.find((x) => x.id === js.serviceId)
        const charge: ProjectCharge = {
          id: uid('chg'),
          projectId: js.projectId,
          chargeCode: cat?.chargeCode ?? 'ADMIN',
          description: js.name,
          category: 'ORIGIN',
          basis: cat?.basis ?? 'PER_SHIPMENT',
          quantity: js.quantity,
          buyRate: js.buyRate,
          sellRate: js.sellRate,
          currency: js.currency,
          fxRate: 1,
          vatApplicable: true,
          whtApplicable: false,
          vendor: undefined,
          partnerId: js.providerPartnerId,
          status: 'DRAFT',
          billable: true,
          freightTerm: 'PREPAID',
          remarks: `Raised from additional service ${js.code}.`,
        } as ProjectCharge
        set((state) => ({
          charges: [charge, ...state.charges],
          jobServices: state.jobServices.map((x) => (x.id === jobServiceId ? { ...x, chargeId: charge.id } : x)),
        }))
        get().log('save', 'Charge', `${js.code} billed to the job from the service record`)
      },

      upsertIncident: (i) => {
        set((st) => ({ incidents: upsert(st.incidents, i) }))
        get().log('save', 'Incident', `${i.reference} — ${i.title}`)
      },
      removeIncidents: (ids) => {
        set((st) => ({ incidents: st.incidents.filter((x) => !ids.includes(x.id)) }))
        get().log('delete', 'Incident', `${ids.length} records`)
      },
      importIncidents: (rows) => {
        set((st) => {
          let list = st.incidents
          rows.forEach((r) => (list = upsert(list, r)))
          return { incidents: list }
        })
        get().log('import', 'Incident', `${rows.length} records`)
      },

      /* The hand-over. A job nobody has accepted is a job nobody is watching,
         so acceptance is a state on the record rather than an assumption. */
      acceptJob: (projectId, checklist) => {
        const now = new Date().toISOString()
        set((st) => ({
          projects: st.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  handover: {
                    ...(p.handover ?? { offeredBy: 'Unassigned', offeredAt: now, checklist: [] }),
                    status: 'ACCEPTED' as const,
                    respondedAt: now,
                    reason: undefined,
                    checklist,
                  },
                  updatedAt: now,
                }
              : p,
          ),
        }))
        const p = get().projects.find((x) => x.id === projectId)
        get().log('accept', 'Job', `${p?.code} accepted`)
      },
      declineJob: (projectId, reason) => {
        const now = new Date().toISOString()
        set((st) => ({
          projects: st.projects.map((p) =>
            p.id === projectId && p.handover
              ? { ...p, handover: { ...p.handover, status: 'DECLINED' as const, respondedAt: now, reason }, updatedAt: now }
              : p,
          ),
        }))
        const p = get().projects.find((x) => x.id === projectId)
        get().log('decline', 'Job', `${p?.code} declined — ${reason.slice(0, 80)}`)
      },
      reassignJob: (projectId, operatorId) => {
        const now = new Date().toISOString()
        set((st) => ({
          projects: st.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  assignedOperatorId: operatorId,
                  handover: p.handover
                    ? { ...p.handover, status: 'OFFERED' as const, offeredAt: now, respondedAt: undefined, reason: undefined }
                    : undefined,
                  updatedAt: now,
                }
              : p,
          ),
        }))
        get().log('reassign', 'Job', `${projectId} handed to another operator`)
      },
      setHandoverCheck: (projectId, key, confirmed) =>
        set((st) => ({
          projects: st.projects.map((p) =>
            p.id === projectId && p.handover
              ? {
                  ...p,
                  handover: {
                    ...p.handover,
                    checklist: p.handover.checklist.map((c) => (c.key === key ? { ...c, confirmed } : c)),
                  },
                }
              : p,
          ),
        })),

      /* Sealing a stuffing job writes the seal and the date back onto the
         container, so the two records cannot drift apart. */
      upsertStuffing: (j) => {
        set((st) => ({
          stuffingJobs: upsert(st.stuffingJobs, j),
          containers: j.containerId
            ? st.containers.map((c) =>
                c.id === j.containerId
                  ? {
                      ...c,
                      sealNo: j.sealNo ?? c.sealNo,
                      stuffingDate: j.stuffingDate,
                      stuffingLocation: j.locationName,
                      gateInDate: j.gateInAt ?? c.gateInDate,
                    }
                  : c,
              )
            : st.containers,
        }))
        get().log('save', 'Stuffing', `${j.reference} — ${j.locationName}`)
      },
      removeStuffing: (ids) => {
        set((st) => ({ stuffingJobs: st.stuffingJobs.filter((x) => !ids.includes(x.id)) }))
        get().log('delete', 'Stuffing', `${ids.length} records`)
      },
      importStuffing: (rows) => {
        set((st) => {
          let list = st.stuffingJobs
          rows.forEach((r) => (list = upsert(list, r)))
          return { stuffingJobs: list }
        })
        get().log('import', 'Stuffing', `${rows.length} records`)
      },

      updateCompany: (patch) => {
        set((st) => ({ company: { ...st.company, ...patch } }))
        get().log('save', 'Company profile', Object.keys(patch).join(', '))
      },

      updateSettings: (patch) => {
        set((s) => ({ settings: { ...s.settings, ...patch } }))
        get().log('save', 'Settings', Object.keys(patch).join(', '))
      },
      clearActivity: () => set({ activity: [] }),

      resetDemoData: () => {
        set({ ...seedState() })
      },
    }),
    { name: 'meridian-freight-erp', version: 9 },
  ),
)
