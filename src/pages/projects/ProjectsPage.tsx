import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Ruler } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column, TableFilter } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/status'
import { StageRail } from '@/components/shared/StageChip'
import { Tooltip } from '@/components/ui/tooltip'
import { fmtCurrency, fmtDate, fmtNumber, relativeLabel } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { revenueIdr } from '@/lib/costing'
import { projectCbm } from '@/data/seed-projects'
import { PROJECT_STAGES, complianceSpec, suggestContainers } from '@/data/reference'
import type { Project } from '@/data/types'

export function ProjectsPage() {
  const navigate = useNavigate()
  const { projects, budgets, removeProjects, importProjects } = useErp()
  const [stages, setStages] = React.useState<string[]>([])
  const [statuses, setStatuses] = React.useState<string[]>([])
  const [countries, setCountries] = React.useState<string[]>([])

  const open = projects.filter((p) => p.status === 'OPEN')
  const won = projects.filter((p) => p.status === 'WON' && p.stage !== 'CLOSED')
  const bookValue = won.reduce((a, p) => a + revenueIdr(p), 0)
  const cbm = won.reduce((a, p) => a + projectCbm(p), 0)

  const filters: TableFilter<Project>[] = [
    {
      key: 'stage',
      label: 'Stage',
      options: PROJECT_STAGES.map((s) => ({ value: s.key, label: s.label })),
      values: stages,
      onChange: setStages,
      match: (row, values) => values.includes(row.stage),
    },
    {
      key: 'status',
      label: 'Status',
      options: ['OPEN', 'WON', 'LOST', 'CANCELLED', 'CLOSED'].map((v) => ({ value: v, label: v })),
      values: statuses,
      onChange: setStatuses,
      match: (row, values) => values.includes(row.status),
    },
    {
      key: 'country',
      label: 'Destination',
      options: Array.from(new Set(projects.map((p) => p.destinationCountry))).map((c) => ({ value: c, label: c })),
      values: countries,
      onChange: setCountries,
      match: (row, values) => values.includes(row.destinationCountry),
    },
  ]

  const columns: Column<Project>[] = [
    {
      key: 'code',
      header: 'Order',
      width: 'min-w-[230px]',
      pinned: true,
      sortable: true,
      sortValue: (r) => r.code,
      exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.code}</p>
          <p className="truncate text-[12px] text-fg-muted">{r.name}</p>
        </div>
      ),
    },
    {
      key: 'buyer',
      header: 'Buyer',
      width: 'min-w-[170px]',
      sortable: true,
      sortValue: (r) => r.buyerName,
      exportValue: (r) => r.buyerName,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg">{r.buyerName}</p>
          <p className="truncate text-[12px] text-fg-muted">
            {r.destinationCountry} · {r.destinationPort}
          </p>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      width: 'w-[190px]',
      sortable: true,
      sortValue: (r) => PROJECT_STAGES.findIndex((s) => s.key === r.stage),
      exportValue: (r) => r.stage,
      cell: (r) => (
        <div className="space-y-1.5">
          <StatusBadge value={r.stage} size="sm" />
          <StageRail stage={r.stage} />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Outcome',
      width: 'w-[110px]',
      sortable: true,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
      cell: (r) =>
        r.status === 'LOST' ? (
          <Tooltip content={`${r.lossReason ?? 'Unknown'} — ${r.lossNote ?? ''}`}>
            <span><StatusBadge value="LOST" size="sm" /></span>
          </Tooltip>
        ) : (
          <StatusBadge value={r.status} size="sm" />
        ),
    },
    {
      key: 'value',
      header: 'Order value',
      align: 'right',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => revenueIdr(r),
      exportValue: (r) => r.contractValue,
      cell: (r) => (
        <div className="text-right">
          <p className="tnum font-medium text-fg">{fmtCurrency(r.contractValue, r.currency, { compact: true })}</p>
          <p className="tnum text-[11.5px] text-fg-muted">{fmtCurrency(revenueIdr(r), 'IDR', { compact: true })}</p>
        </div>
      ),
    },
    {
      key: 'margin',
      header: 'Budget margin',
      align: 'right',
      width: 'w-[130px]',
      sortable: true,
      sortValue: (r) => {
        const b = budgets.find((x) => x.projectId === r.id && (x.status === 'APPROVED' || x.status === 'CLOSED'))
        if (!b) return 999
        const cost = b.lines.reduce((a, l) => a + l.qty * l.unitCost * (1 + l.wastagePct / 100), 0)
        const rev = revenueIdr(r)
        return rev ? ((rev - cost) / rev) * 100 : 999
      },
      exportValue: (r) => {
        const b = budgets.find((x) => x.projectId === r.id && (x.status === 'APPROVED' || x.status === 'CLOSED'))
        if (!b) return ''
        const cost = b.lines.reduce((a, l) => a + l.qty * l.unitCost * (1 + l.wastagePct / 100), 0)
        const rev = revenueIdr(r)
        return rev ? Math.round(((rev - cost) / rev) * 1000) / 10 : ''
      },
      cell: (r) => {
        const b = budgets.find((x) => x.projectId === r.id && (x.status === 'APPROVED' || x.status === 'CLOSED'))
        if (!b) return <span className="text-[12px] text-fg-subtle">not costed</span>
        const cost = b.lines.reduce((a, l) => a + l.qty * l.unitCost * (1 + l.wastagePct / 100), 0)
        const rev = revenueIdr(r)
        const pct = rev ? ((rev - cost) / rev) * 100 : 0
        return (
          <Badge size="sm" tone={pct >= b.targetMarginPct ? 'success' : pct >= b.targetMarginPct - 4 ? 'warning' : 'danger'}>
            {pct.toFixed(1)}%
          </Badge>
        )
      },
    },
    {
      key: 'volume',
      header: 'Volume',
      align: 'right',
      width: 'w-[130px]',
      sortable: true,
      sortValue: (r) => projectCbm(r),
      exportValue: (r) => Math.round(projectCbm(r) * 100) / 100,
      headerHint: 'Shipping volume of the finished pieces, and the boxes it implies.',
      cell: (r) => {
        const v = projectCbm(r)
        const plan = suggestContainers(v)
        return (
          <div className="text-right">
            <p className="tnum text-fg">{fmtNumber(v, 1)} m³</p>
            <p className="truncate text-[11.5px] text-fg-muted">
              {plan.map((c) => `${c.count}×${c.size}`).join(' + ') || '—'}
            </p>
          </div>
        )
      },
    },
    {
      key: 'compliance',
      header: 'Compliance',
      width: 'w-[150px]',
      headerHint: 'Blocking certificates this destination forces on the order.',
      cell: (r) => {
        const blocking = r.compliance.filter((c) => complianceSpec(c.key).blocking)
        const done = blocking.filter((c) => c.status === 'SATISFIED').length
        if (!blocking.length) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <Tooltip
            content={blocking
              .map((c) => `${complianceSpec(c.key).label}: ${c.status.toLowerCase().replace('_', ' ')}`)
              .join(' · ')}
          >
            <span>
              <Badge size="sm" tone={done === blocking.length ? 'success' : done === 0 ? 'neutral' : 'warning'}>
                {done}/{blocking.length}
              </Badge>
            </span>
          </Tooltip>
        )
      },
    },
    {
      key: 'ship',
      header: 'Target ship',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => r.targetShipAt,
      exportValue: (r) => r.targetShipAt,
      cell: (r) => (
        <div>
          <p className="text-fg">{fmtDate(r.targetShipAt)}</p>
          <p className="text-[11.5px] text-fg-muted">{relativeLabel(r.targetShipAt)}</p>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Sales owner',
      width: 'w-[140px]',
      defaultHidden: true,
      sortable: true,
      sortValue: (r) => r.salesOwnerName,
      exportValue: (r) => r.salesOwnerName,
      cell: (r) => <span className="text-fg-muted">{r.salesOwnerName}</span>,
    },
    {
      key: 'terms',
      header: 'Terms',
      width: 'w-[130px]',
      defaultHidden: true,
      exportValue: (r) => `${r.incoterm} ${r.paymentTerm}`,
      cell: (r) => (
        <span className="text-[12px] text-fg-muted">
          {r.incoterm} · {r.depositPct}% deposit
        </span>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Commercial</Badge>}
        title="Projects"
        description="Every enquiry that has arrived, from a first email to a container on the water. The record carries the negotiation, the drawings, the samples, the budget and the purchase run — the same record the margin is argued about on when it closes."
        meta={
          <>
            <span className="text-[12.5px] text-fg-muted">{projects.length} in total</span>
            <span className="text-[12.5px] text-fg-muted">{open.length} still being won</span>
            <span className="text-[12.5px] text-fg-muted">{won.length} won and open</span>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Order book" value={fmtCurrency(bookValue, 'IDR', { compact: true })} sub={`${won.length} orders`} icon={<Ruler />} accent="primary" />
        <KpiCard label="Volume to ship" value={`${fmtNumber(cbm, 1)} m³`} sub={`${suggestContainers(cbm).map((c) => `${c.count}×${c.size}`).join(' + ')}`} accent="accent" />
        <KpiCard
          label="Still being won"
          value={fmtCurrency(open.reduce((a, p) => a + revenueIdr(p), 0), 'IDR', { compact: true })}
          sub={`${open.length} enquiries and quotations`}
          accent="warning"
        />
        <KpiCard
          label="Lost this book"
          value={fmtCurrency(projects.filter((p) => p.status === 'LOST').reduce((a, p) => a + revenueIdr(p), 0), 'IDR', { compact: true })}
          sub={projects.filter((p) => p.status === 'LOST').map((p) => p.lossReason).join(', ') || '—'}
          accent="danger"
        />
      </div>

      <DataTable
        data={projects}
        columns={columns}
        filters={filters}
        getId={(r) => r.id}
        getLabel={(r) => r.code}
        entityLabel="orders"
        searchText={(r) => `${r.code} ${r.name} ${r.buyerName} ${r.destinationPort} ${r.poNumber ?? ''} ${r.items.map((i) => i.itemRef).join(' ')}`}
        onRowClick={(r) => navigate(`/projects/${r.id}`)}
        onDelete={removeProjects}
        deleteNote="Deleting an order leaves its budget, purchase orders and stock movements orphaned. In a real build this would be a soft close, not a delete."
        exportName="kriyanusa-orders"
        storageKey="projects"
        initialSort={{ key: 'ship', dir: 'asc' }}
        emptyTitle="No orders match"
        emptyDescription="Clear a filter, or widen the search."
        importFields={[
          { key: 'code', label: 'Order code', required: true },
          { key: 'name', label: 'Name', required: true },
          { key: 'buyerName', label: 'Buyer', required: true },
        ]}
        onImport={(rows) =>
          importProjects(
            rows.map((r, i) => ({
              ...projects[0],
              id: `imp_${Date.now()}_${i}`,
              code: r.code,
              name: r.name,
              buyerName: r.buyerName,
            })) as Project[],
          )
        }
        rowTone={(r) => (r.status === 'LOST' ? 'opacity-60' : undefined)}
        footerSummary={(rows) => (
          <span className="tnum">
            {rows.length} orders · {fmtCurrency(rows.reduce((a, r) => a + revenueIdr(r), 0), 'IDR', { compact: true })} ·{' '}
            {fmtNumber(rows.reduce((a, r) => a + projectCbm(r), 0), 1)} m³
          </span>
        )}
      />
    </div>
  )
}
