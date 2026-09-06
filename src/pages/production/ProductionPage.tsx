import * as React from 'react'
import { Link } from 'react-router-dom'
import { Factory } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column, TableFilter } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { StatusBadge } from '@/components/shared/status'
import { cn } from '@/lib/utils'
import { fmtDate, fmtNumber, fmtPercent, relativeLabel, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { productionLoad } from '@/lib/analytics'
import { WORK_ORDER_STAGES, workStageLabel, workStageOrder } from '@/data/reference'
import type { WorkOrder } from '@/data/types'

export function ProductionPage() {
  const store = useErp()
  const [stages, setStages] = React.useState<string[]>([])
  const [statuses, setStatuses] = React.useState<string[]>([])
  const [where, setWhere] = React.useState<string[]>([])

  const load = productionLoad(store.workOrders)
  const projectOf = (id: string) => store.projects.find((p) => p.id === id)

  const filters: TableFilter<WorkOrder>[] = [
    {
      key: 'stage',
      label: 'Stage',
      options: WORK_ORDER_STAGES.map((s) => ({ value: s.value, label: s.label })),
      values: stages,
      onChange: setStages,
      match: (r, v) => v.includes(r.stage),
    },
    {
      key: 'status',
      label: 'Status',
      options: ['PLANNED', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'].map((v) => ({ value: v, label: titleCase(v) })),
      values: statuses,
      onChange: setStatuses,
      match: (r, v) => v.includes(r.status),
    },
    {
      key: 'where',
      label: 'Where',
      options: [
        { value: 'INTERNAL', label: 'Our own benches' },
        { value: 'SUBCON', label: 'A village workshop' },
        { value: 'LATE', label: 'Past its due date' },
      ],
      values: where,
      onChange: setWhere,
      match: (r, v) =>
        v.some((x) =>
          x === 'SUBCON' ? !!r.subconSupplierId
            : x === 'INTERNAL' ? !r.subconSupplierId
              : r.status !== 'COMPLETED' && new Date(r.dueAt) < new Date(),
        ),
    },
  ]

  const columns: Column<WorkOrder>[] = [
    {
      key: 'code',
      header: 'Work order',
      width: 'min-w-[170px]',
      pinned: true,
      sortable: true,
      sortValue: (r) => r.code,
      exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.itemRef}</p>
        </div>
      ),
    },
    {
      key: 'project',
      header: 'Order',
      width: 'min-w-[190px]',
      sortable: true,
      sortValue: (r) => projectOf(r.projectId)?.code ?? '',
      exportValue: (r) => projectOf(r.projectId)?.code ?? '',
      cell: (r) => {
        const p = projectOf(r.projectId)
        return (
          <div className="min-w-0">
            <Link to={`/projects/${p?.id}`} className="truncate font-medium text-fg hover:text-primary">{p?.code}</Link>
            <p className="truncate text-[11.5px] text-fg-muted">{p?.buyerName}</p>
          </div>
        )
      },
    },
    {
      key: 'workshop',
      header: 'Workshop',
      width: 'min-w-[190px]',
      sortable: true,
      sortValue: (r) => r.workshop,
      exportValue: (r) => r.workshop,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg-muted">{r.workshop}</p>
          {r.subconSupplierId && <Badge size="sm" tone="purple">subcontract</Badge>}
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      width: 'w-[160px]',
      sortable: true,
      sortValue: (r) => workStageOrder(r.stage),
      exportValue: (r) => r.stage,
      cell: (r) => <StatusBadge value={r.stage} size="sm" />,
    },
    {
      key: 'progress',
      header: 'Made',
      width: 'w-[170px]',
      sortable: true,
      sortValue: (r) => r.producedQty / Math.max(1, r.qty),
      exportValue: (r) => r.producedQty,
      cell: (r) => (
        <div>
          <Progress value={(r.producedQty / Math.max(1, r.qty)) * 100} className="w-32" />
          <p className="tnum mt-1 text-[11px] text-fg-muted">
            {fmtNumber(r.producedQty)} of {fmtNumber(r.qty)}
            {r.rejectQty > 0 && <span className="text-danger"> · {r.rejectQty} rejected</span>}
          </p>
        </div>
      ),
    },
    {
      key: 'due',
      header: 'Due',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => r.dueAt,
      exportValue: (r) => r.dueAt,
      cell: (r) => {
        const late = r.status !== 'COMPLETED' && new Date(r.dueAt) < new Date()
        return (
          <div>
            <p className={cn(late ? 'font-medium text-danger' : 'text-fg-muted')}>{fmtDate(r.dueAt)}</p>
            <p className="text-[11px] text-fg-subtle">{relativeLabel(r.dueAt)}</p>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: 'min-w-[200px]',
      sortable: true,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
      cell: (r) => (
        <div className="min-w-0">
          <StatusBadge value={r.status} size="sm" />
          {r.holdReason && (
            <Tooltip content={r.holdReason}>
              <p className="mt-1 truncate text-[11.5px] leading-relaxed text-warning-soft-fg">{r.holdReason}</p>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      key: 'supervisor',
      header: 'Supervisor',
      width: 'w-[150px]',
      defaultHidden: true,
      exportValue: (r) => r.supervisorName,
      cell: (r) => <span className="text-[12px] text-fg-muted">{r.supervisorName}</span>,
    },
  ]

  /* the floor, by stage */
  const byStage = WORK_ORDER_STAGES.map((s) => ({
    stage: s,
    orders: store.workOrders.filter((w) => w.stage === s.value && !['COMPLETED', 'CANCELLED'].includes(w.status)),
  })).filter((g) => g.orders.length > 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Make & ship</Badge>}
        title="Work orders"
        description="One work order per model on an order, split when the run is bigger than a bench can hold. This is the hinge between the budget and the warehouse: a work order is what draws material out of stock and what puts finished pieces back in."
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open work orders" value={String(load.open)} sub={`${fmtNumber(load.pieces)} pieces on the floor`} icon={<Factory />} accent="primary" />
        <KpiCard label="Made so far" value={fmtPercent(load.completionPct, 0)} sub={`${fmtNumber(load.produced)} of ${fmtNumber(load.pieces)}`} accent="accent" />
        <KpiCard label="Past due" value={String(load.late)} sub={load.late ? 'the ship date does not move for us' : 'nothing overdue'} accent={load.late ? 'danger' : 'success'} />
        <KpiCard label="On hold" value={String(load.onHold)} sub={load.onHold ? 'waiting on material or a decision' : 'nothing stopped'} accent={load.onHold ? 'warning' : 'accent'} />
      </div>

      <Card className="mb-5">
        <CardHeader title="Where the floor is" description="Open work orders by the stage they are sitting at right now." />
        <CardBody className="scrollbar-thin flex gap-3 overflow-x-auto">
          {byStage.map((g) => (
            <div key={g.stage.value} className="w-[210px] shrink-0 rounded-lg border border-border bg-surface-sunken p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[12.5px] font-semibold text-fg">{workStageLabel(g.stage.value)}</p>
                <Badge size="sm" tone="primary">{g.orders.length}</Badge>
              </div>
              <p className="tnum mt-0.5 text-[11.5px] text-fg-muted">
                {fmtNumber(g.orders.reduce((a, w) => a + w.qty, 0))} pieces
              </p>
              <div className="mt-2 space-y-1.5">
                {g.orders.slice(0, 4).map((w) => (
                  <div key={w.id} className="rounded border border-border bg-surface px-2 py-1.5">
                    <p className="truncate text-[11.5px] font-medium text-fg">{w.itemRef}</p>
                    <p className="truncate text-[11px] text-fg-muted">{projectOf(w.projectId)?.code}</p>
                  </div>
                ))}
                {g.orders.length > 4 && <p className="text-[11px] text-fg-subtle">and {g.orders.length - 4} more</p>}
              </div>
            </div>
          ))}
          {byStage.length === 0 && <p className="py-6 text-[12.5px] text-fg-muted">Nothing open on the floor.</p>}
        </CardBody>
      </Card>

      <DataTable
        data={store.workOrders}
        columns={columns}
        filters={filters}
        getId={(r) => r.id}
        getLabel={(r) => r.code}
        entityLabel="work orders"
        searchText={(r) => `${r.code} ${r.itemRef} ${r.workshop} ${r.supervisorName} ${projectOf(r.projectId)?.code ?? ''}`}
        onDelete={store.removeWorkOrders}
        exportName="kriyanusa-work-orders"
        storageKey="production"
        initialSort={{ key: 'due', dir: 'asc' }}
        rowTone={(r) =>
          r.status === 'ON_HOLD' ? 'bg-warning-soft/30'
            : r.status !== 'COMPLETED' && new Date(r.dueAt) < new Date() ? 'bg-danger-soft/25'
              : undefined
        }
        footerSummary={(rows) => (
          <span className="tnum">
            {rows.length} work orders · {fmtNumber(rows.reduce((a, r) => a + r.qty, 0))} pieces ·{' '}
            {fmtNumber(rows.reduce((a, r) => a + r.producedQty, 0))} made
          </span>
        )}
      />
    </div>
  )
}
