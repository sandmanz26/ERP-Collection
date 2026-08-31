import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Eye, Globe2, Pencil, Plus, ShieldAlert, Trash2, TrendingUp } from 'lucide-react'
import type { Customer } from '@/data/types'
import { COUNTRIES, countryFlag } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { CustomerForm } from './CustomerForm'
import { fmtCurrency, fmtDate } from '@/lib/format'
import { uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

export function CustomersPage() {
  const nav = useNavigate()
  const toast = useToast()
  const { customers, projects, removeCustomers, importCustomers } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Customer | null>(null)
  const [deleting, setDeleting] = React.useState<Customer | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [risk, setRisk] = React.useState<string[]>([])
  const [country, setCountry] = React.useState<string[]>([])

  const jobCount = (c: Customer) => projects.filter((p) => p.clientId === c.id || p.shipperId === c.id || p.consigneeId === c.id).length

  const totalExposure = customers.reduce((a, c) => a + c.outstandingAr, 0)
  const overLimit = customers.filter((c) => c.creditLimit > 0 && c.outstandingAr > c.creditLimit)
  const totalOffices = customers.reduce((a, c) => a + c.offices.length, 0)

  const columns: Column<Customer>[] = [
    {
      key: 'code', header: 'Code', width: 'w-[112px]', pinned: true, sortable: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.code}</span>,
    },
    {
      key: 'legalName', header: 'Customer', width: 'min-w-[260px]', sortable: true,
      sortValue: (r) => r.legalName, exportValue: (r) => r.legalName,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.tradeName || r.legalName}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.legalName} · {r.industry}</p>
        </div>
      ),
    },
    {
      key: 'roles', header: 'Acts as', width: 'w-[176px]', sortable: true,
      sortValue: (r) => r.roles.join(','), exportValue: (r) => r.roles.join(' / '),
      cell: (r) => (
        <div className="flex gap-1">
          {r.roles.slice(0, 2).map((x) => (
            <Badge key={x} tone="outline" size="sm">{x.charAt(0) + x.slice(1).toLowerCase()}</Badge>
          ))}
          {r.roles.length > 2 && <Badge tone="neutral" size="sm">+{r.roles.length - 2}</Badge>}
        </div>
      ),
    },
    {
      key: 'offices', header: 'Country offices', width: 'w-[190px]', sortable: true,
      sortValue: (r) => r.offices.length, exportValue: (r) => r.offices.map((o) => `${o.countryCode}:${o.city}`).join(' | '),
      cell: (r) => (
        <div className="flex items-center gap-1.5">
          <span className="flex -space-x-1">
            {r.offices.slice(0, 5).map((o) => (
              <Tooltip key={o.id} content={`${o.name} — ${o.city}, ${o.country}`}>
                <span className="grid size-6 place-items-center rounded-full border border-border bg-surface text-[12px]">
                  {countryFlag(o.countryCode)}
                </span>
              </Tooltip>
            ))}
          </span>
          <span className="tnum text-[12px] text-fg-muted">{r.offices.length}</span>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', width: 'w-[124px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'risk', header: 'Risk', width: 'w-[100px]', sortable: true, defaultHidden: true,
      sortValue: (r) => ({ LOW: 0, MEDIUM: 1, HIGH: 2 })[r.riskRating], exportValue: (r) => r.riskRating,
      cell: (r) => <StatusBadge value={r.riskRating} size="sm" />,
    },
    {
      key: 'credit', header: 'Credit exposure', width: 'w-[190px]', align: 'right', sortable: true,
      sortValue: (r) => (r.creditLimit ? r.outstandingAr / r.creditLimit : 0),
      exportValue: (r) => r.outstandingAr,
      cell: (r) => {
        const pct = r.creditLimit ? (r.outstandingAr / r.creditLimit) * 100 : 0
        const over = pct > 100
        return (
          <div className="ml-auto w-[150px]">
            <div className="flex items-baseline justify-end gap-1.5">
              <span className={`tnum text-[12.5px] font-medium ${over ? 'text-danger' : 'text-fg'}`}>
                {fmtCurrency(r.outstandingAr, 'IDR', { compact: true })}
              </span>
              <span className="tnum text-[11px] text-fg-subtle">/ {fmtCurrency(r.creditLimit, 'IDR', { compact: true })}</span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-soft">
              <div
                className={`h-full rounded-full ${over ? 'bg-danger' : pct > 80 ? 'bg-warning' : 'bg-success'}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      key: 'terms', header: 'Terms', width: 'w-[150px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.creditTermDays, exportValue: (r) => `${r.defaultIncoterm} / ${r.defaultPaymentTerm}`,
      cell: (r) => (
        <span className="text-[12px] text-fg-muted">
          {r.defaultIncoterm} · {r.defaultPaymentTerm.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'jobs', header: 'Jobs', width: 'w-[80px]', align: 'right', sortable: true,
      sortValue: jobCount, exportValue: jobCount,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{jobCount(r)}</span>,
    },
    {
      key: 'owner', header: 'Sales owner', width: 'w-[160px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.salesOwner, exportValue: (r) => r.salesOwner,
      cell: (r) => <span className="text-[12.5px] text-fg-muted">{r.salesOwner}</span>,
    },
    {
      key: 'onboarded', header: 'Since', width: 'w-[110px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.onboardedAt, exportValue: (r) => r.onboardedAt,
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{fmtDate(r.onboardedAt)}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Customers"
        description="Every trading party in one register. A customer can be the client that pays, the shipper that loads, the consignee that receives — or all three — and holds a country office for each market it operates in."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus /> New customer
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Customers" value={customers.length} icon={<Building2 />} accent="primary"
          sub={`${customers.filter((c) => c.status === 'ACTIVE').length} active`} />
        <KpiCard label="Country offices" value={totalOffices} icon={<Globe2 />} accent="accent"
          sub={`${new Set(customers.flatMap((c) => c.offices.map((o) => o.countryCode))).size} countries served`} />
        <KpiCard label="AR exposure" value={fmtCurrency(totalExposure, 'IDR', { compact: true })} icon={<TrendingUp />} accent="warning"
          sub="Outstanding across all customers" />
        <KpiCard label="Over credit limit" value={overLimit.length} icon={<ShieldAlert />} accent={overLimit.length ? 'danger' : 'success'}
          sub={overLimit.length ? overLimit.map((c) => c.code).join(', ') : 'All within limit'} />
      </div>

      <DataTable
        data={customers}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.code} — ${r.legalName}`}
        entityLabel="customer"
        storageKey="customers"
        exportName="customers"
        searchText={(r) =>
          [r.code, r.legalName, r.tradeName, r.industry, r.salesOwner, ...r.offices.map((o) => `${o.name} ${o.city} ${o.country}`)].join(' ')
        }
        initialSort={{ key: 'code', dir: 'asc' }}
        onRowClick={(r) => nav(`/customers/${r.id}`)}
        rowTone={(r) => (r.status === 'BLACKLISTED' ? 'bg-danger-soft/25' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['ACTIVE', 'PROSPECT', 'ON_HOLD', 'BLACKLISTED'].map((v) => ({ value: v, label: v.replace('_', ' ') })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'risk', label: 'Risk rating', values: risk, onChange: setRisk,
            options: ['LOW', 'MEDIUM', 'HIGH'].map((v) => ({ value: v, label: v })),
            match: (r, v) => v.includes(r.riskRating),
          },
          {
            key: 'country', label: 'Has office in', values: country, onChange: setCountry,
            options: COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag}  ${c.name}` })),
            match: (r, v) => r.offices.some((o) => v.includes(o.countryCode)),
          },
        ]}
        onDelete={(ids) => {
          removeCustomers(ids)
          toast.push({ tone: 'success', title: `${ids.length} customers deleted` })
        }}
        cascadeWarning={(rows) => {
          const linked = projects.filter((p) => rows.some((r) => [p.clientId, p.shipperId, p.consigneeId].includes(r.id)))
          return linked.length
            ? [`${linked.length} project${linked.length === 1 ? '' : 's'} reference these customers and will lose their party links: ${linked.slice(0, 4).map((p) => p.code).join(', ')}${linked.length > 4 ? '…' : ''}`]
            : []
        }}
        deleteNote="Deleting a customer does not delete its jobs."
        importFields={[
          { key: 'code', label: 'Customer code', required: true, hint: 'e.g. CUS-0009' },
          { key: 'legalName', label: 'Legal name', required: true },
          { key: 'tradeName', label: 'Trade name' },
          { key: 'taxId', label: 'Tax ID / NPWP' },
          { key: 'industry', label: 'Industry' },
          { key: 'status', label: 'Status', hint: 'ACTIVE / PROSPECT / ON_HOLD / BLACKLISTED' },
          { key: 'riskRating', label: 'Risk rating', hint: 'LOW / MEDIUM / HIGH' },
          { key: 'creditLimit', label: 'Credit limit (IDR)' },
          { key: 'creditTermDays', label: 'Credit term days' },
          { key: 'defaultIncoterm', label: 'Default Incoterm' },
          { key: 'salesOwner', label: 'Sales owner' },
          { key: 'officeCountry', label: 'Head office country', hint: 'ISO-2, e.g. ID' },
          { key: 'officeCity', label: 'Head office city' },
        ]}
        importSample={{
          code: 'CUS-0009', legalName: 'PT Contoh Ekspor Indonesia', tradeName: 'Contoh Ekspor', taxId: '01.111.222.3-014.000',
          industry: 'Furniture & Wood Products', status: 'ACTIVE', riskRating: 'LOW', creditLimit: '1000000000',
          creditTermDays: '30', defaultIncoterm: 'FOB', salesOwner: 'Elena Marchetti', officeCountry: 'ID', officeCity: 'Semarang',
        }}
        toImportRow={(r) => ({
          code: r.code, legalName: r.legalName, tradeName: r.tradeName ?? '', taxId: r.taxId ?? '',
          industry: r.industry, status: r.status, riskRating: r.riskRating, creditLimit: r.creditLimit,
          creditTermDays: r.creditTermDays, defaultIncoterm: r.defaultIncoterm, salesOwner: r.salesOwner,
          officeCountry: r.offices[0]?.countryCode ?? '', officeCity: r.offices[0]?.city ?? '',
        })}
        onImport={(rows) => {
          const mapped: Customer[] = rows.map((r) => {
            const existing = customers.find((c) => c.code === r.code)
            const id = existing?.id ?? uid('cus')
            const cc = (r.officeCountry || 'ID').toUpperCase()
            return {
              ...(existing ?? {}),
              id,
              code: r.code,
              legalName: r.legalName,
              tradeName: r.tradeName || undefined,
              taxId: r.taxId || undefined,
              industry: r.industry || 'Other',
              roles: existing?.roles ?? ['CLIENT', 'SHIPPER'],
              status: (['ACTIVE', 'PROSPECT', 'ON_HOLD', 'BLACKLISTED'].includes(r.status) ? r.status : 'PROSPECT') as Customer['status'],
              riskRating: (['LOW', 'MEDIUM', 'HIGH'].includes(r.riskRating) ? r.riskRating : 'MEDIUM') as Customer['riskRating'],
              creditLimit: Number(r.creditLimit) || 0,
              creditCurrency: existing?.creditCurrency ?? 'IDR',
              creditTermDays: Number(r.creditTermDays) || 30,
              outstandingAr: existing?.outstandingAr ?? 0,
              defaultIncoterm: (r.defaultIncoterm || 'FOB') as Customer['defaultIncoterm'],
              defaultPaymentTerm: existing?.defaultPaymentTerm ?? 'NET_30',
              salesOwner: r.salesOwner || 'Elena Marchetti',
              onboardedAt: existing?.onboardedAt ?? new Date().toISOString().slice(0, 10),
              offices:
                existing?.offices ??
                [
                  {
                    id: uid('off'), customerId: id, name: 'Head Office',
                    countryCode: cc, country: COUNTRIES.find((c) => c.code === cc)?.name ?? cc,
                    city: r.officeCity || '', addressLine: '', roles: ['CLIENT'], isHeadquarter: true,
                    isBillingOffice: true, active: true, contacts: [],
                  },
                ],
            } as Customer
          })
          importCustomers(mapped)
          toast.push({ tone: 'success', title: `${mapped.length} customers imported`, description: 'Existing codes were updated in place.' })
        }}
        rowActions={(r) => (
          <>
            <Tooltip content="Open profile">
              <Button variant="ghost" size="iconXs" onClick={() => nav(`/customers/${r.id}`)}>
                <Eye />
              </Button>
            </Tooltip>
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
            <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}>
                <Trash2 />
              </Button>
            </Tooltip>
          </>
        )}
        emptyTitle="No customers yet"
        emptyDescription="Create your first trading party, or import a list from your existing system."
        emptyAction={
          <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
            <Plus /> New customer
          </Button>
        }
      />

      <CustomerForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="customer"
        items={deleting ? [`${deleting.code} — ${deleting.legalName}`] : []}
        cascade={
          deleting
            ? (() => {
                const linked = projects.filter((p) => [p.clientId, p.shipperId, p.consigneeId].includes(deleting.id))
                return linked.length ? [`${linked.length} projects reference this customer`] : []
              })()
            : []
        }
        onConfirm={() => {
          if (deleting) {
            removeCustomers([deleting.id])
            toast.push({ tone: 'success', title: 'Customer deleted', description: deleting.code })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
