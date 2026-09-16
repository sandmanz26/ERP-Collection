import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column, TableFilter } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/status'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { fmtCurrency, fmtDate, fmtNumber, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { revenueIdr } from '@/lib/costing'
import { BUYER_SEGMENTS, paymentTermLabel } from '@/data/reference'
import type { Buyer } from '@/data/types'

export function BuyersPage() {
  const navigate = useNavigate()
  const { buyers, projects, invoices, removeBuyers, importBuyers } = useErp()
  const [statuses, setStatuses] = React.useState<string[]>([])
  const [segments, setSegments] = React.useState<string[]>([])
  const [requirements, setRequirements] = React.useState<string[]>([])

  const ordersFor = (id: string) => projects.filter((p) => p.buyerId === id)
  const valueFor = (id: string) => ordersFor(id).filter((p) => p.status !== 'LOST').reduce((a, p) => a + revenueIdr(p), 0)

  const filters: TableFilter<Buyer>[] = [
    {
      key: 'status',
      label: 'Status',
      options: ['ACTIVE', 'PROSPECT', 'ON_HOLD', 'DORMANT', 'BLACKLISTED'].map((v) => ({ value: v, label: titleCase(v) })),
      values: statuses,
      onChange: setStatuses,
      match: (r, v) => v.includes(r.status),
    },
    {
      key: 'segment',
      label: 'Segment',
      options: BUYER_SEGMENTS.map((s) => ({ value: s.value, label: s.label })),
      values: segments,
      onChange: setSegments,
      match: (r, v) => v.includes(r.segment),
    },
    {
      key: 'requires',
      label: 'Demands',
      options: [
        { value: 'FSC', label: 'FSC certified' },
        { value: 'EUDR', label: 'EUDR evidence' },
        { value: 'LAB', label: 'Laboratory testing' },
      ],
      values: requirements,
      onChange: setRequirements,
      match: (r, v) =>
        v.some((x) => (x === 'FSC' && r.requiresFsc) || (x === 'EUDR' && r.requiresEudrDds) || (x === 'LAB' && r.requiresLabTest)),
    },
  ]

  const columns: Column<Buyer>[] = [
    {
      key: 'name',
      header: 'Buyer',
      width: 'min-w-[230px]',
      pinned: true,
      sortable: true,
      sortValue: (r) => r.tradingName,
      exportValue: (r) => r.legalName,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.tradingName}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.code} · {r.legalName}</p>
        </div>
      ),
    },
    {
      key: 'country',
      header: 'Where',
      width: 'w-[170px]',
      sortable: true,
      sortValue: (r) => r.countryName,
      exportValue: (r) => r.countryName,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg">{r.countryName}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.city} · {r.destinationPort}</p>
        </div>
      ),
    },
    {
      key: 'segment',
      header: 'Segment',
      width: 'w-[140px]',
      sortable: true,
      sortValue: (r) => r.segment,
      exportValue: (r) => r.segment,
      cell: (r) => <Badge size="sm" tone="neutral">{titleCase(r.segment)}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[110px]',
      sortable: true,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'terms',
      header: 'Terms',
      width: 'min-w-[200px]',
      exportValue: (r) => `${r.defaultIncoterm} ${r.paymentTerm}`,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg">{r.defaultIncoterm} · {r.currency}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{paymentTermLabel(r.paymentTerm)}</p>
        </div>
      ),
    },
    {
      key: 'credit',
      header: 'Credit used',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => (r.creditLimit ? r.outstanding / r.creditLimit : 0),
      exportValue: (r) => r.outstanding,
      headerHint: 'Outstanding against the limit. Over 100% is why an order gets stopped.',
      cell: (r) => (
        <div>
          <UtilisationBar pct={r.creditLimit ? (r.outstanding / r.creditLimit) * 100 : 0} className="w-28" />
          <p className="tnum text-[11px] text-fg-muted">
            {fmtCurrency(r.outstanding, r.currency, { compact: true })} / {fmtCurrency(r.creditLimit, r.currency, { compact: true })}
          </p>
        </div>
      ),
    },
    {
      key: 'demands',
      header: 'Demands',
      width: 'w-[160px]',
      headerHint: 'Requirements this buyer puts on every order, which flow into the compliance set.',
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.requiresFsc && <Badge size="sm" tone="accent">FSC</Badge>}
          {r.requiresEudrDds && <Badge size="sm" tone="purple">EUDR</Badge>}
          {r.requiresLabTest && <Badge size="sm" tone="info">Lab test</Badge>}
          {!r.requiresFsc && !r.requiresEudrDds && !r.requiresLabTest && <span className="text-[12px] text-fg-subtle">—</span>}
        </div>
      ),
    },
    {
      key: 'book',
      header: 'Order book',
      align: 'right',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => valueFor(r.id),
      exportValue: (r) => Math.round(valueFor(r.id)),
      cell: (r) => (
        <div className="text-right">
          <p className="tnum font-medium text-fg">{fmtCurrency(valueFor(r.id), 'IDR', { compact: true })}</p>
          <p className="tnum text-[11.5px] text-fg-muted">{ordersFor(r.id).length} orders</p>
        </div>
      ),
    },
    {
      key: 'since',
      header: 'Customer since',
      width: 'w-[130px]',
      defaultHidden: true,
      sortable: true,
      sortValue: (r) => r.customerSince,
      exportValue: (r) => r.customerSince,
      cell: (r) => <span className="text-fg-muted">{fmtDate(r.customerSince)}</span>,
    },
    {
      key: 'owner',
      header: 'Owner',
      width: 'w-[140px]',
      defaultHidden: true,
      exportValue: (r) => r.ownerName,
      cell: (r) => <span className="text-fg-muted">{r.ownerName}</span>,
    },
  ]

  const overLimit = buyers.filter((b) => b.outstanding > b.creditLimit)
  const receivable = invoices
    .filter((i) => ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status))
    .reduce((a, i) => a + (i.amount - i.paidAmount) * i.exchangeRate, 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Commercial</Badge>}
        title="Buyers"
        description="Who we sell to, on what terms, and what they demand before they will take a container. The certification columns are not decoration — an FSC or EUDR requirement here becomes a blocking document on every order that buyer places."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Buyers" value={String(buyers.length)} sub={`${buyers.filter((b) => b.status === 'ACTIVE').length} active`} icon={<Building2 />} accent="primary" />
        <KpiCard label="Countries" value={String(new Set(buyers.map((b) => b.countryCode)).size)} sub="destinations served" accent="accent" />
        <KpiCard label="Owed to us" value={fmtCurrency(receivable, 'IDR', { compact: true })} sub="across all open invoices" accent="success" />
        <KpiCard
          label="Over credit limit"
          value={String(overLimit.length)}
          sub={overLimit.map((b) => b.tradingName).join(', ') || 'nobody'}
          accent={overLimit.length ? 'danger' : 'accent'}
        />
      </div>

      <DataTable
        data={buyers}
        columns={columns}
        filters={filters}
        getId={(r) => r.id}
        getLabel={(r) => r.tradingName}
        entityLabel="buyers"
        searchText={(r) => `${r.code} ${r.legalName} ${r.tradingName} ${r.countryName} ${r.city} ${r.destinationPort} ${r.ownerName}`}
        onRowClick={(r) => navigate(`/buyers/${r.id}`)}
        onDelete={removeBuyers}
        cascadeWarning={(rows) =>
          rows
            .map((r) => {
              const n = projects.filter((p) => p.buyerId === r.id).length
              return n ? `${r.tradingName} has ${n} order${n > 1 ? 's' : ''} attached` : ''
            })
            .filter(Boolean)
        }
        exportName="kriyanusa-buyers"
        storageKey="buyers"
        initialSort={{ key: 'book', dir: 'desc' }}
        importFields={[
          { key: 'code', label: 'Code', required: true },
          { key: 'tradingName', label: 'Trading name', required: true },
          { key: 'countryName', label: 'Country', required: true },
        ]}
        onImport={(rows) =>
          importBuyers(rows.map((r, i) => ({ ...buyers[0], id: `imp_b_${Date.now()}_${i}`, ...r })) as Buyer[])
        }
        footerSummary={(rows) => (
          <span className="tnum">
            {rows.length} buyers · {fmtNumber(rows.reduce((a, r) => a + ordersFor(r.id).length, 0))} orders ·{' '}
            {fmtCurrency(rows.reduce((a, r) => a + valueFor(r.id), 0), 'IDR', { compact: true })}
          </span>
        )}
      />
    </div>
  )
}

