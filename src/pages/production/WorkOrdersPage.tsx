import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Factory, TriangleAlert, Wallet } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useMfg } from '@/store/useMfg'
import type { WorkOrder } from '@/data/types'
import { workOrderCost, workOrderProgress } from '@/lib/production'
import { WORK_ORDER_STATUSES, workOrderIsOpen } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'
import { TODAY } from '@/data/clock'

export function WorkOrdersPage() {
  const { workOrders, products, salesOrders, workCentres, settings } = useMfg()
  const navigate = useNavigate()
  const [status, setStatus] = React.useState<string[]>([])
  const [flag, setFlag] = React.useState<string[]>([])

  const open = workOrders.filter((w) => workOrderIsOpen(w.status))
  const blocked = open.filter((w) => w.operations.some((o) => o.status === 'BLOCKED'))
  const late = open.filter((w) => w.dueDate < TODAY)
  const overVariance = workOrders.filter((w) => Math.abs(workOrderCost(w).variancePercent) > settings.costVarianceTolerance * 100 && w.status !== 'PLANNED')

  const columns: Column<WorkOrder>[] = [
    {
      key: 'code', header: 'Work order', width: 'min-w-[230px]', pinned: true, sortable: true, sortValue: (w) => w.code,
      cell: (w) => {
        const product = products.find((p) => p.id === w.productId)
        const so = salesOrders.find((o) => o.id === w.salesOrderId)
        return (
          <div className="min-w-0">
            <p className="truncate font-mono text-[12.5px] font-semibold text-fg">
              {w.code}
              {w.reworkOfId && <Badge tone="warning" size="sm" className="ml-2">rework</Badge>}
            </p>
            <p className="truncate text-[11.5px] text-fg-muted">
              {product?.name}
              {so && ` · ${so.code}`}
            </p>
          </div>
        )
      },
      exportValue: (w) => w.code,
    },
    {
      key: 'status', header: 'Status', width: 'w-[150px]', sortable: true, sortValue: (w) => w.status,
      cell: (w) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge value={w.status} size="sm" />
          {w.priority !== 'STANDARD' && <StatusBadge value={w.priority} size="sm" />}
        </div>
      ),
      exportValue: (w) => w.status,
    },
    {
      key: 'qty', header: 'Quantity', align: 'right', width: 'w-[120px]', sortable: true, sortValue: (w) => w.quantity,
      cell: (w) => (
        <div>
          <p className="tnum text-[12.5px] font-semibold text-fg">{fmtNumber(w.quantity)}</p>
          <p className="tnum text-[11px] text-fg-muted">
            {fmtNumber(w.quantityDone)} done{w.quantityScrapped > 0 && <span className="text-danger"> · {w.quantityScrapped} scrap</span>}
          </p>
        </div>
      ),
      exportValue: (w) => w.quantity,
    },
    {
      key: 'progress', header: 'Progress', width: 'min-w-[220px]',
      sortable: true, sortValue: (w) => workOrderProgress(w).percent,
      cell: (w) => {
        const p = workOrderProgress(w)
        return (
          <div>
            <div className="flex items-center gap-2">
              <Progress value={p.percent} tone={p.blocked ? 'danger' : p.percent === 100 ? 'success' : 'primary'} className="flex-1" size="sm" />
              <span className="tnum shrink-0 text-[11px] text-fg-muted">{p.done}/{p.total}</span>
            </div>
            <p className="mt-1 truncate text-[11px] text-fg-muted">
              {p.blocked
                ? <span className="font-medium text-danger">Blocked at {p.blocked.name}</span>
                : p.current
                  ? `${p.current.status === 'CURING' ? 'Curing at' : 'At'} ${workCentres.find((c) => c.id === p.current!.workCentreId)?.name ?? ''}`
                  : 'Not started'}
            </p>
          </div>
        )
      },
      exportValue: (w) => `${workOrderProgress(w).done}/${w.operations.length}`,
    },
    {
      key: 'dates', header: 'Dates', width: 'w-[170px]', sortable: true, sortValue: (w) => w.dueDate,
      cell: (w) => {
        const overdue = workOrderIsOpen(w.status) && w.dueDate < TODAY
        return (
          <div>
            <p className="tnum text-[12px] text-fg-muted">starts {fmtDate(w.plannedStart, 'short')}</p>
            <p className={`tnum text-[12.5px] ${overdue ? 'font-semibold text-danger' : 'text-fg'}`}>due {fmtDate(w.dueDate)}</p>
          </div>
        )
      },
      exportValue: (w) => w.dueDate,
    },
    {
      key: 'shortages', header: 'Blocked on', width: 'min-w-[260px]',
      cell: (w) => {
        const shorts = w.materials.filter((m) => m.shortageNote)
        if (!shorts.length) return <span className="text-[12px] text-success">Nothing outstanding</span>
        return (
          <div className="space-y-0.5">
            {shorts.slice(0, 2).map((m) => (
              <p key={m.id} className="line-clamp-2 text-[11.5px] leading-snug text-danger">{m.shortageNote}</p>
            ))}
          </div>
        )
      },
      exportValue: (w) => w.materials.filter((m) => m.shortageNote).map((m) => m.shortageNote).join(' | '),
    },
    {
      key: 'stdCost', header: 'Standard', align: 'right', width: 'w-[130px]', sortable: true, defaultHidden: true,
      sortValue: (w) => workOrderCost(w).standardTotal,
      cell: (w) => <span className="tnum text-[12.5px]">{fmtCurrency(workOrderCost(w).standardTotal, 'IDR', { compact: true })}</span>,
      exportValue: (w) => workOrderCost(w).standardTotal,
    },
    {
      key: 'variance', header: 'Variance', align: 'right', width: 'w-[130px]', sortable: true,
      headerHint: 'Actual against standard, scaled to how far the order has run',
      sortValue: (w) => workOrderCost(w).variancePercent,
      cell: (w) => {
        const c = workOrderCost(w)
        if (w.status === 'PLANNED' || w.status === 'FIRM') return <span className="text-[12px] text-fg-subtle">—</span>
        const bad = Math.abs(c.variancePercent) > settings.costVarianceTolerance * 100
        return (
          <Tooltip content={c.driver}>
            <div>
              <p className={`tnum text-[12.5px] font-semibold ${bad ? (c.variancePercent > 0 ? 'text-danger' : 'text-success') : 'text-fg-muted'}`}>
                {c.variancePercent > 0 ? '+' : ''}{fmtPercent(c.variancePercent, 1)}
              </p>
              <p className="tnum text-[11px] text-fg-muted">{fmtCurrency(c.totalVariance, 'IDR', { compact: true })}</p>
            </div>
          </Tooltip>
        )
      },
      exportValue: (w) => workOrderCost(w).variancePercent,
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><Factory className="size-3" /> Production</Badge>}
        title="Work orders"
        description="What the floor is building, how far each one has got, and what is stopping the ones that have stopped. A block here always names the supply and the date, never just the shortage."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open orders" value={fmtNumber(open.length)} icon={<Factory />} accent="primary" sub={`${fmtNumber(open.reduce((a, w) => a + w.quantity, 0))} units`} />
        <KpiCard label="Blocked" value={fmtNumber(blocked.length)} icon={<TriangleAlert />} accent={blocked.length ? 'danger' : 'success'} sub={blocked.length ? blocked[0].code : 'nothing waiting on a gate'} />
        <KpiCard label="Past due" value={fmtNumber(late.length)} icon={<TriangleAlert />} accent={late.length ? 'danger' : 'success'} />
        <KpiCard
          label="Beyond cost tolerance"
          value={fmtNumber(overVariance.length)}
          icon={<Wallet />}
          accent={overVariance.length ? 'warning' : 'success'}
          sub={`tolerance ${fmtPercent(settings.costVarianceTolerance * 100, 0)}`}
        />
      </div>

      <DataTable
        data={workOrders}
        columns={columns}
        getId={(w) => w.id}
        getLabel={(w) => w.code}
        entityLabel="work order"
        exportName="work-orders"
        storageKey="work-orders"
        searchText={(w) => `${w.code} ${products.find((p) => p.id === w.productId)?.name ?? ''} ${salesOrders.find((o) => o.id === w.salesOrderId)?.code ?? ''}`}
        onRowClick={(w) => navigate(`/work-orders/${w.id}`)}
        initialSort={{ key: 'dates', dir: 'asc' }}
        rowTone={(w) => (w.operations.some((o) => o.status === 'BLOCKED') ? 'bg-danger-soft/25' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: WORK_ORDER_STATUSES.map((x) => ({ value: x.value, label: x.label })),
            match: (w, v) => v.includes(w.status),
          },
          {
            key: 'flag', label: 'Show', values: flag, onChange: setFlag,
            options: [
              { value: 'BLOCKED', label: 'Blocked' },
              { value: 'LATE', label: 'Past due' },
              { value: 'REWORK', label: 'Rework orders' },
              { value: 'OPEN', label: 'Open only' },
            ],
            match: (w, v) =>
              (!v.includes('BLOCKED') || w.operations.some((o) => o.status === 'BLOCKED'))
              && (!v.includes('LATE') || (workOrderIsOpen(w.status) && w.dueDate < TODAY))
              && (!v.includes('REWORK') || !!w.reworkOfId)
              && (!v.includes('OPEN') || workOrderIsOpen(w.status)),
          },
        ]}
      />
    </div>
  )
}
