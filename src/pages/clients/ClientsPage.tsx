import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Eye, HardHat, Pencil, Plus, Trash2, Users } from 'lucide-react'
import type { Client } from '@/data/types'
import { CLIENT_STATUSES, CLIENT_TIERS, INDUSTRIES } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { useToast } from '@/components/ui/toast'
import { ClientForm } from './ClientForm'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate } from '@/lib/format'
import { uid } from '@/lib/utils'
import { deployedHeadcount, isLiveProject, monthlyValue, requiredHeadcount } from '@/lib/domain'

export function ClientsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const can = useCan()
  const { clients, buildings, projects, removeClients, importClients } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Client | null>(null)
  const [deleting, setDeleting] = React.useState<Client | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [tier, setTier] = React.useState<string[]>([])
  const [industry, setIndustry] = React.useState<string[]>([])

  const projectsOf = (c: Client) => projects.filter((p) => p.clientId === c.id)
  const buildingsOf = (c: Client) => buildings.filter((b) => b.clientId === c.id)
  const liveOf = (c: Client) => projectsOf(c).filter(isLiveProject)
  const headcountOf = (c: Client) => liveOf(c).reduce((a, p) => a + requiredHeadcount(p), 0)
  const monthlyOf = (c: Client) => liveOf(c).reduce((a, p) => a + monthlyValue(p), 0)

  const liveProjects = projects.filter(isLiveProject)
  const totalMonthly = liveProjects.reduce((a, p) => a + monthlyValue(p), 0)
  const totalPeople = liveProjects.reduce((a, p) => a + deployedHeadcount(p), 0)

  const columns: Column<Client>[] = [
    {
      key: 'code', header: 'Code', width: 'w-[104px]', pinned: true, sortable: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.code}</span>,
    },
    {
      key: 'name', header: 'Client', width: 'w-[250px] max-w-[250px]', sortable: true,
      sortValue: (r) => r.brandName || r.legalName, exportValue: (r) => r.legalName,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.brandName || r.legalName}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.legalName} · {r.industry}</p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', width: 'w-[126px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'tier', header: 'Tier', width: 'w-[118px]', sortable: true, defaultHidden: true,
      sortValue: (r) => ({ ENTERPRISE: 0, CORPORATE: 1, SME: 2 })[r.tier], exportValue: (r) => r.tier,
      cell: (r) => <StatusBadge value={r.tier} size="sm" />,
    },
    {
      key: 'city', header: 'City', width: 'w-[150px]', sortable: true,
      sortValue: (r) => r.city, exportValue: (r) => `${r.city}, ${r.province}`,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg">{r.city}</p>
          <p className="truncate text-[11px] text-fg-subtle">{r.province}</p>
        </div>
      ),
    },
    {
      key: 'buildings', header: 'Buildings', width: 'w-[104px]', align: 'right', sortable: true,
      sortValue: (r) => buildingsOf(r).length, exportValue: (r) => buildingsOf(r).length,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{buildingsOf(r).length}</span>,
    },
    {
      key: 'projects', header: 'Projects', width: 'w-[124px]', align: 'right', sortable: true,
      sortValue: (r) => liveOf(r).length, exportValue: (r) => projectsOf(r).length,
      cell: (r) => {
        const live = liveOf(r).length
        const total = projectsOf(r).length
        return (
          <span className="tnum text-[12.5px] text-fg">
            {live}
            {total !== live && <span className="text-fg-subtle"> / {total}</span>}
          </span>
        )
      },
      headerHint: 'Running projects, and the total ever signed',
    },
    {
      key: 'headcount', header: 'Headcount', width: 'w-[116px]', align: 'right', sortable: true,
      sortValue: headcountOf, exportValue: headcountOf,
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{headcountOf(r) || '—'}</span>,
    },
    {
      key: 'monthly', header: 'Monthly value', width: 'w-[160px]', align: 'right', sortable: true,
      sortValue: monthlyOf, exportValue: monthlyOf,
      cell: (r) => (
        <span className="tnum text-[12.5px] font-medium text-fg">
          {monthlyOf(r) ? fmtCurrency(monthlyOf(r), 'IDR', { compact: true }) : '—'}
        </span>
      ),
    },
    {
      key: 'terms', header: 'Terms', width: 'w-[136px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.paymentTermDays, exportValue: (r) => `Net ${r.paymentTermDays}`,
      cell: (r) => (
        <span className="text-[12px] text-fg-muted">
          Net {r.paymentTermDays} · inv. day {r.invoiceDay}
        </span>
      ),
    },
    {
      key: 'manager', header: 'Account manager', width: 'w-[168px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.accountManager, exportValue: (r) => r.accountManager,
      cell: (r) => <span className="text-[12.5px] text-fg-muted">{r.accountManager}</span>,
    },
    {
      key: 'since', header: 'Client since', width: 'w-[124px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.clientSince, exportValue: (r) => r.clientSince.slice(0, 10),
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{fmtDate(r.clientSince)}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Clients"
        description="The companies that sign the contracts. Each one can hold as many buildings as it operates, and one project per building."
        actions={
          can('clients.create') ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus /> New client
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Clients"
          value={clients.length}
          icon={<Users />}
          accent="primary"
          sub={`${clients.filter((c) => c.status === 'ACTIVE').length} active · ${clients.filter((c) => c.status === 'PROSPECT').length} prospect`}
        />
        <KpiCard label="Buildings served" value={buildings.length} icon={<Building2 />} accent="accent" sub={`across ${new Set(buildings.map((b) => b.city)).size} cities`} />
        <KpiCard label="Personnel deployed" value={totalPeople.toLocaleString('en-US')} icon={<HardHat />} accent="success" sub="on running contracts today" />
        <KpiCard
          label="Monthly contract value"
          value={fmtCurrency(totalMonthly, 'IDR', { compact: true })}
          icon={<Users />}
          accent="purple"
          sub="before PPN, running contracts only"
        />
      </div>

      <DataTable
        data={clients}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.code} — ${r.legalName}`}
        entityLabel="client"
        storageKey="clients"
        allowExport={can('clients.export')}
        exportName="tata-gemilang-clients"
        searchText={(r) =>
          [r.code, r.legalName, r.brandName, r.industry, r.city, r.province, r.accountManager, r.npwp, ...r.contacts.map((c) => c.name)]
            .filter(Boolean)
            .join(' ')
        }
        initialSort={{ key: 'code', dir: 'asc' }}
        onRowClick={(r) => nav(`/clients/${r.id}`)}
        rowTone={(r) => (r.status === 'ON_HOLD' ? 'bg-warning-soft/25' : r.status === 'CHURNED' ? 'bg-danger-soft/20' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: CLIENT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'tier', label: 'Tier', values: tier, onChange: setTier,
            options: CLIENT_TIERS.map((t) => ({ value: t.value, label: t.label })),
            match: (r, v) => v.includes(r.tier),
          },
          {
            key: 'industry', label: 'Industry', values: industry, onChange: setIndustry,
            options: INDUSTRIES.map((i) => ({ value: i, label: i })),
            match: (r, v) => v.includes(r.industry),
          },
        ]}
        onDelete={can('clients.delete') ? (ids) => {
          removeClients(ids)
          toast.push({ tone: 'success', title: `${ids.length} client${ids.length === 1 ? '' : 's'} deleted` })
        } : undefined}
        cascadeWarning={(rows) => {
          const linkedBuildings = buildings.filter((b) => rows.some((r) => r.id === b.clientId))
          const linkedProjects = projects.filter((p) => rows.some((r) => r.id === p.clientId))
          const warnings: string[] = []
          if (linkedBuildings.length) warnings.push(`${linkedBuildings.length} building${linkedBuildings.length === 1 ? '' : 's'} belong to these clients and will be orphaned`)
          if (linkedProjects.length) warnings.push(`${linkedProjects.length} project${linkedProjects.length === 1 ? '' : 's'} reference them: ${linkedProjects.slice(0, 4).map((p) => p.code).join(', ')}${linkedProjects.length > 4 ? '…' : ''}`)
          return warnings
        }}
        deleteNote="Deleting a client does not delete its buildings or projects."
        importFields={can('clients.import') ? [
          { key: 'code', label: 'Client code', required: true, hint: 'e.g. CLT-0013' },
          { key: 'legalName', label: 'Legal name', required: true },
          { key: 'brandName', label: 'Brand name' },
          { key: 'industry', label: 'Industry' },
          { key: 'tier', label: 'Tier', hint: 'ENTERPRISE / CORPORATE / SME' },
          { key: 'status', label: 'Status', hint: 'ACTIVE / PROSPECT / ON_HOLD / CHURNED' },
          { key: 'npwp', label: 'NPWP' },
          { key: 'address', label: 'Address' },
          { key: 'city', label: 'City', required: true },
          { key: 'province', label: 'Province' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'paymentTermDays', label: 'Payment term (days)' },
          { key: 'invoiceDay', label: 'Invoice day' },
          { key: 'creditLimit', label: 'Credit limit (IDR)' },
          { key: 'accountManager', label: 'Account manager' },
        ] : undefined}
        importSample={{
          code: 'CLT-0013', legalName: 'PT Contoh Sejahtera Indonesia', brandName: 'Contoh Group',
          industry: 'Manufacturing', tier: 'CORPORATE', status: 'PROSPECT', npwp: '01.234.567.8-012.000',
          address: 'Jl. Industri Raya No. 9', city: 'Bekasi', province: 'Jawa Barat', phone: '+62 21 8000 1234',
          email: 'ga@contoh.co.id', paymentTermDays: '30', invoiceDay: '1', creditLimit: '500000000',
          accountManager: 'Siti Rahmawati',
        }}
        toImportRow={(r) => ({
          code: r.code, legalName: r.legalName, brandName: r.brandName ?? '', industry: r.industry, tier: r.tier,
          status: r.status, npwp: r.npwp ?? '', address: r.address, city: r.city, province: r.province,
          phone: r.phone ?? '', email: r.email ?? '', paymentTermDays: r.paymentTermDays, invoiceDay: r.invoiceDay,
          creditLimit: r.creditLimit, accountManager: r.accountManager,
        })}
        onImport={can('clients.import') ? (rows) => {
          const mapped: Client[] = rows.map((row) => {
            const existing = clients.find((c) => c.code === row.code)
            const now = new Date().toISOString()
            return {
              ...(existing ?? {}),
              id: existing?.id ?? uid('clt'),
              code: row.code,
              legalName: row.legalName,
              brandName: row.brandName || undefined,
              industry: row.industry || 'Manufacturing',
              tier: (['ENTERPRISE', 'CORPORATE', 'SME'].includes(row.tier) ? row.tier : 'CORPORATE') as Client['tier'],
              status: (['ACTIVE', 'PROSPECT', 'ON_HOLD', 'CHURNED'].includes(row.status) ? row.status : 'PROSPECT') as Client['status'],
              npwp: row.npwp || undefined,
              address: row.address ?? existing?.address ?? '',
              city: row.city,
              province: row.province || existing?.province || 'DKI Jakarta',
              phone: row.phone || undefined,
              email: row.email || undefined,
              paymentTermDays: Number(row.paymentTermDays) || existing?.paymentTermDays || 30,
              invoiceDay: Number(row.invoiceDay) || existing?.invoiceDay || 1,
              creditLimit: Number(row.creditLimit) || existing?.creditLimit || 0,
              ppnApplicable: existing?.ppnApplicable ?? true,
              pph23Withheld: existing?.pph23Withheld ?? true,
              accountManager: row.accountManager || existing?.accountManager || 'Siti Rahmawati',
              clientSince: existing?.clientSince ?? now,
              contacts: existing?.contacts ?? [],
              createdAt: existing?.createdAt ?? now,
              updatedAt: now,
            } as Client
          })
          importClients(mapped)
          toast.push({
            tone: 'success',
            title: `${mapped.length} client${mapped.length === 1 ? '' : 's'} imported`,
            description: 'Rows whose code already existed were updated in place.',
          })
        } : undefined}
        rowActions={(r) => (
          <>
            <Tooltip content="Open record">
              <Button variant="ghost" size="iconXs" onClick={() => nav(`/clients/${r.id}`)}>
                <Eye />
              </Button>
            </Tooltip>
            {can('clients.edit') && (
              <Tooltip content="Edit">
              <Button
                variant="ghost"
                size="iconXs"
                onClick={() => {
                  setEditing(r)
                  setFormOpen(true)
                }}
              >
                <Pencil />
              </Button>
            </Tooltip>
            )}
            {can('clients.delete') && (
              <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}>
                <Trash2 />
              </Button>
            </Tooltip>
            )}
          </>
        )}
        footerSummary={(rows) => (
          <span className="tnum">
            {rows.reduce((a, r) => a + headcountOf(r), 0).toLocaleString('en-US')} contracted personnel ·{' '}
            {fmtCurrency(rows.reduce((a, r) => a + monthlyOf(r), 0), 'IDR', { compact: true })} per month in this view
          </span>
        )}
        emptyTitle="No clients yet"
        emptyDescription="Create the first client, or import a list exported from your existing system."
        emptyAction={can('clients.create') ? <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
            <Plus /> New client
          </Button> : undefined}
        toolbarLeft={
          <Badge tone="outline" size="md">
            {clients.filter((c) => c.status === 'ON_HOLD').length} on hold
          </Badge>
        }
      />

      <ClientForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="client"
        items={deleting ? [`${deleting.code} — ${deleting.legalName}`] : []}
        cascade={
          deleting
            ? [
                ...(buildingsOf(deleting).length ? [`${buildingsOf(deleting).length} buildings belong to this client`] : []),
                ...(projectsOf(deleting).length ? [`${projectsOf(deleting).length} projects reference it`] : []),
              ]
            : []
        }
        onConfirm={() => {
          if (deleting) {
            removeClients([deleting.id])
            toast.push({ tone: 'success', title: 'Client deleted', description: deleting.code })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
