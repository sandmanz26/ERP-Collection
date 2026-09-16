import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSpreadsheet } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column, TableFilter } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/status'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { fmtCurrency, fmtDate, fmtPercent, relativeDays, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { budgetTotal, projectCosting, revenueIdr } from '@/lib/costing'
import { BUDGET_STATUSES } from '@/data/reference'
import type { Budget } from '@/data/types'
import { BudgetPanel } from '@/pages/projects/ProjectDetailPage'

export function BudgetsPage() {
  const navigate = useNavigate()
  const store = useErp()
  const [statuses, setStatuses] = React.useState<string[]>([])
  const [open, setOpen] = React.useState<Budget | null>(null)

  const projectFor = (b: Budget) => store.projects.find((p) => p.id === b.projectId)

  const costingFor = (b: Budget) => {
    const project = projectFor(b)
    if (!project) return null
    return projectCosting(
      project,
      b,
      store.orders.filter((o) => o.projectId === b.projectId),
      (itemId) => {
        const item = store.items.find((i) => i.id === itemId)
        const map: Record<string, string> = {
          TIMBER: 'TIMBER', PANEL: 'PANEL', HARDWARE: 'HARDWARE', FINISHING: 'FINISHING',
          UPHOLSTERY: 'UPHOLSTERY', PACKAGING: 'PACKAGING', COMPONENT: 'SUBCON',
        }
        return (item ? map[item.category] ?? 'OVERHEAD' : 'OVERHEAD') as never
      },
    )
  }

  const filters: TableFilter<Budget>[] = [
    {
      key: 'status',
      label: 'Status',
      options: BUDGET_STATUSES.map((v) => ({ value: v, label: titleCase(v) })),
      values: statuses,
      onChange: setStatuses,
      match: (r, v) => v.includes(r.status),
    },
  ]

  const columns: Column<Budget>[] = [
    {
      key: 'code',
      header: 'Budget',
      width: 'min-w-[190px]',
      pinned: true,
      sortable: true,
      sortValue: (r) => r.code,
      exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">version {r.version} · {r.preparedByName}</p>
        </div>
      ),
    },
    {
      key: 'project',
      header: 'Order',
      width: 'min-w-[220px]',
      sortable: true,
      sortValue: (r) => projectFor(r)?.code ?? '',
      exportValue: (r) => projectFor(r)?.code ?? '',
      cell: (r) => {
        const p = projectFor(r)
        return (
          <div className="min-w-0">
            <p className="truncate font-medium text-fg">{p?.code}</p>
            <p className="truncate text-[11.5px] text-fg-muted">{p?.buyerName} · {p?.name}</p>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[120px]',
      sortable: true,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'cost',
      header: 'Budgeted cost',
      align: 'right',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => budgetTotal(r),
      exportValue: (r) => Math.round(budgetTotal(r)),
      cell: (r) => <span className="tnum font-medium">{fmtCurrency(budgetTotal(r), 'IDR', { compact: true })}</span>,
    },
    {
      key: 'revenue',
      header: 'Order revenue',
      align: 'right',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => {
        const p = projectFor(r)
        return p ? revenueIdr(p) : 0
      },
      exportValue: (r) => {
        const p = projectFor(r)
        return p ? Math.round(revenueIdr(p)) : 0
      },
      cell: (r) => {
        const p = projectFor(r)
        return <span className="tnum text-fg-muted">{p ? fmtCurrency(revenueIdr(p), 'IDR', { compact: true }) : '—'}</span>
      },
    },
    {
      key: 'margin',
      header: 'Margin',
      align: 'right',
      width: 'w-[140px]',
      sortable: true,
      sortValue: (r) => costingFor(r)?.budgetMarginPct ?? -999,
      exportValue: (r) => Math.round((costingFor(r)?.budgetMarginPct ?? 0) * 10) / 10,
      headerHint: 'What the budget leaves, against the target the estimator was working to.',
      cell: (r) => {
        const c = costingFor(r)
        if (!c) return '—'
        return (
          <div className="text-right">
            <Badge
              size="sm"
              tone={c.budgetMarginPct >= r.targetMarginPct ? 'success' : c.budgetMarginPct >= r.targetMarginPct - 4 ? 'warning' : 'danger'}
            >
              {fmtPercent(c.budgetMarginPct, 1)}
            </Badge>
            <p className="tnum mt-1 text-[11px] text-fg-muted">target {r.targetMarginPct}%</p>
          </div>
        )
      },
    },
    {
      key: 'consumed',
      header: 'Committed & received',
      width: 'w-[190px]',
      headerHint: 'How much of the bought-in budget has already been promised to a supplier.',
      cell: (r) => {
        const c = costingFor(r)
        if (!c || !c.budget) return <span className="text-[12px] text-fg-subtle">—</span>
        const purchased = r.lines
          .filter((l) => !['LABOUR', 'OVERHEAD', 'CONTINGENCY'].includes(l.category))
          .reduce((a, l) => a + l.qty * l.unitCost * (1 + l.wastagePct / 100), 0)
        const pct = purchased ? (c.exposure / purchased) * 100 : 0
        return (
          <div>
            <UtilisationBar pct={pct} className="w-32" />
            <p className="tnum text-[11px] text-fg-muted">
              {fmtCurrency(c.exposure, 'IDR', { compact: true })} of {fmtCurrency(purchased, 'IDR', { compact: true })}
            </p>
          </div>
        )
      },
    },
    {
      key: 'prepared',
      header: 'Prepared',
      width: 'w-[130px]',
      sortable: true,
      sortValue: (r) => r.preparedAt,
      exportValue: (r) => r.preparedAt,
      cell: (r) => (
        <div>
          <p className="text-fg-muted">{fmtDate(r.preparedAt)}</p>
          {r.status === 'SUBMITTED' && (
            <p className="text-[11px] text-warning-soft-fg">
              waiting {Math.abs(relativeDays(r.submittedAt) ?? 0)} days
            </p>
          )}
        </div>
      ),
    },
  ]

  const submitted = store.budgets.filter((b) => b.status === 'SUBMITTED')
  const approved = store.budgets.filter((b) => b.status === 'APPROVED')
  const thin = store.budgets.filter((b) => {
    const c = costingFor(b)
    return c && c.budgetMarginPct < b.targetMarginPct - 3
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Costing</Badge>}
        title="Budgets — anggaran belanja"
        description="Every order is costed before anything is bought. The lines are exploded from the bill of materials for the models on the order, priced at standard cost and grossed up for the wastage the estimator expects to lose. What is left after that is the margin, and it is not negotiable with arithmetic."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Budgets" value={String(store.budgets.length)} sub={`${approved.length} approved`} icon={<FileSpreadsheet />} accent="primary" />
        <KpiCard
          label="Waiting for approval"
          value={String(submitted.length)}
          sub={submitted.length ? 'nothing can be ordered until they are signed' : 'nothing outstanding'}
          accent={submitted.length ? 'warning' : 'accent'}
        />
        <KpiCard
          label="Budgeted cost"
          value={fmtCurrency(approved.reduce((a, b) => a + budgetTotal(b), 0), 'IDR', { compact: true })}
          sub="across approved budgets"
          accent="accent"
        />
        <KpiCard
          label="Below target margin"
          value={String(thin.length)}
          sub={thin.map((b) => b.code).join(', ') || 'all on target'}
          accent={thin.length ? 'danger' : 'success'}
        />
      </div>

      <DataTable
        data={store.budgets}
        columns={columns}
        filters={filters}
        getId={(r) => r.id}
        getLabel={(r) => r.code}
        entityLabel="budgets"
        searchText={(r) => `${r.code} ${projectFor(r)?.code ?? ''} ${projectFor(r)?.buyerName ?? ''} ${r.preparedByName}`}
        onRowClick={(r) => setOpen(r)}
        onDelete={store.removeBudgets}
        exportName="kriyanusa-budgets"
        storageKey="budgets"
        initialSort={{ key: 'margin', dir: 'asc' }}
        rowActions={(r) =>
          r.status === 'SUBMITTED' ? (
            <Button size="xs" variant="primary" onClick={() => store.approveBudget(r.id)}>
              Approve
            </Button>
          ) : r.status === 'DRAFT' ? (
            <Button size="xs" onClick={() => store.submitBudget(r.id)}>Submit</Button>
          ) : null
        }
        footerSummary={(rows) => (
          <span className="tnum">
            {rows.length} budgets · {fmtCurrency(rows.reduce((a, r) => a + budgetTotal(r), 0), 'IDR', { compact: true })}
          </span>
        )}
      />

      <Sheet
        open={!!open}
        onOpenChange={(v) => !v && setOpen(null)}
        title={open ? `${open.code} · ${projectFor(open)?.code ?? ''}` : ''}
        description={open ? `${projectFor(open)?.name ?? ''} — prepared by ${open.preparedByName}` : ''}
        width="max-w-4xl"
      >
        {open && (
          <div className="space-y-5 p-5">
            <Button variant="secondary" size="sm" onClick={() => navigate(`/projects/${open.projectId}`)}>
              Open the order
            </Button>
            <BudgetPanel projectId={open.projectId} />
          </div>
        )}
      </Sheet>
    </div>
  )
}
