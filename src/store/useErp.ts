import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Account, Container, Customer, Invoice, JournalEntry, Project, ProjectCharge,
  ServicePackage, ShipmentDocument, StageKey,
} from '@/data/types'
import { accounts as seedAccounts, charges as seedCharges, containers as seedContainers, customers as seedCustomers, documents as seedDocuments, invoices as seedInvoices, journal as seedJournal, packages as seedPackages, projects as seedProjects } from '@/data/seed'
import { uid } from '@/lib/utils'

export type EntityKey = 'customers' | 'packages' | 'projects' | 'containers' | 'documents' | 'charges' | 'accounts' | 'journal' | 'invoices'

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
            { id: uid('log'), at: new Date().toISOString(), action, entity, detail, actor: 'Rina Wulandari' },
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
        }))
        get().log('delete', 'Project', `${ids.length} jobs and their containers, documents and charges`)
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
                    { id: uid('tl'), at: new Date().toISOString(), type: 'STATUS' as const, title: `Moved to ${to.replace(/_/g, ' ').toLowerCase()}`, actor: 'Rina Wulandari' },
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

      resetDemoData: () => {
        set({ ...seedState() })
      },
    }),
    { name: 'nusantara-freight-erp', version: 3 },
  ),
)
