import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, ShoppingCart, TriangleAlert } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { useMfg } from '@/store/useMfg'
import type { SalesOrder } from '@/data/types'
import { customerSegmentLabel } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'
import { daysBetween, TODAY } from '@/data/clock'

export function OrdersPage() {
  const { salesOrders, customers } = useMfg()
  const navigate = useNavigate()
  const [status, setStatus] = React.useState<string[]>([])
  const [segment, setSegment] = React.useState<string[]>([])

  const customerOf = (o: SalesOrder) => customers.find((c) => c.id === o.customerId)
  const valueOf = (o: SalesOrder) => o.lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0) * o.fxRate
  const overrideDays = (o: SalesOrder) =>
    Math.max(0, ...o.lines.map((l) => (l.confirmedDate && l.atpDate && l.atpDate > l.confirmedDate ? daysBetween(l.confirmedDate, l.atpDate) : 0)))

  const open = salesOrders.filter((o) => !['CLOSED', 'CANCELLED'].includes(o.status))
  const atRisk = open.filter((o) => overrideDays(o) > 0)
  const bookValue = open.reduce((a, o) => a + valueOf(o), 0)
  const penaltyExposure = atRisk.reduce((a, o) => {
    const c = customerOf(o)
    return a + (c?.latePenaltyPerDay ?? 0) * overrideDays(o)
  }, 0)

  const columns: Column<SalesOrder>[] = [
    {
      key: 'code', header: 'Order', width: 'min-w-[190px]', pinned: true, sortable: true,
      sortValue: (o) => o.code,
      cell: (o) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{o.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{customerOf(o)?.name ?? '—'}</p>
        </div>
      ),
      exportValue: (o) => o.code,
    },
    {
      key: 'segment', header: 'Segment', width: 'w-[140px]',
      cell: (o) => <span className="text-[12.5px] text-fg-muted">{customerSegmentLabel(customerOf(o)?.segment ?? 'DEALER')}</span>,
      exportValue: (o) => customerOf(o)?.segment ?? '',
    },
    {
      key: 'status', header: 'Status', width: 'w-[160px]', sortable: true, sortValue: (o) => o.status,
      cell: (o) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge value={o.status} size="sm" />
          {o.priority !== 'STANDARD' && <StatusBadge value={o.priority} size="sm" />}
        </div>
      ),
      exportValue: (o) => o.status,
    },
    {
      key: 'lines', header: 'Lines', align: 'right', width: 'w-[90px]', sortable: true,
      sortValue: (o) => o.lines.length,
      cell: (o) => <span className="tnum text-[12.5px]">{o.lines.length}</span>,
      exportValue: (o) => o.lines.length,
    },
    {
      key: 'units', header: 'Units', align: 'right', width: 'w-[100px]', sortable: true,
      sortValue: (o) => o.lines.reduce((a, l) => a + l.quantity, 0),
      cell: (o) => {
        const total = o.lines.reduce((a, l) => a + l.quantity, 0)
        const shipped = o.lines.reduce((a, l) => a + l.shippedQuantity, 0)
        return (
          <span className="tnum text-[12.5px]">
            {fmtNumber(shipped)}<span className="text-fg-subtle"> / {fmtNumber(total)}</span>
          </span>
        )
      },
      exportValue: (o) => o.lines.reduce((a, l) => a + l.quantity, 0),
    },
    {
      key: 'due', header: 'Due', width: 'w-[130px]', sortable: true,
      sortValue: (o) => o.lines.map((l) => l.confirmedDate ?? l.requestedDate).sort()[0] ?? '',
      cell: (o) => {
        const due = o.lines.map((l) => l.confirmedDate ?? l.requestedDate).sort()[0]
        const late = due && due < TODAY && !['CLOSED', 'CANCELLED', 'SHIPPED'].includes(o.status)
        return <span className={`tnum text-[12.5px] ${late ? 'font-semibold text-danger' : 'text-fg'}`}>{fmtDate(due)}</span>
      },
      exportValue: (o) => o.lines.map((l) => l.confirmedDate ?? l.requestedDate).sort()[0] ?? '',
    },
    {
      key: 'promise', header: 'Promise', width: 'w-[190px]', headerHint: 'Confirmed date against what the three clocks said was honest',
      sortable: true, sortValue: (o) => -overrideDays(o),
      cell: (o) => {
        const days = overrideDays(o)
        if (!days) return <span className="text-[12px] text-success">Supported by the plan</span>
        const line = o.lines.find((l) => l.atpDate && l.confirmedDate && l.atpDate > l.confirmedDate)!
        return (
          <Tooltip content={line.atpNote ?? `Constrained by ${line.atpConstraint?.toLowerCase()}.`}>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-danger">
              <TriangleAlert className="size-3.5" />
              {days} day{days === 1 ? '' : 's'} early · {line.atpConstraint?.toLowerCase()}
            </span>
          </Tooltip>
        )
      },
      exportValue: (o) => overrideDays(o),
    },
    {
      key: 'deposit', header: 'Deposit', align: 'right', width: 'w-[120px]', defaultHidden: true,
      cell: (o) =>
        o.depositPercent === 0 ? (
          <span className="text-[12px] text-fg-subtle">n/a</span>
        ) : (
          <span className={`tnum text-[12.5px] ${o.depositReceived > 0 ? 'text-success' : 'text-danger'}`}>
            {o.depositReceived > 0 ? fmtPercent(o.depositPercent, 0) + ' held' : fmtPercent(o.depositPercent, 0) + ' due'}
          </span>
        ),
      exportValue: (o) => o.depositReceived,
    },
    {
      key: 'value', header: 'Value', align: 'right', width: 'w-[150px]', sortable: true,
      sortValue: (o) => valueOf(o),
      cell: (o) => (
        <div>
          <p className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(valueOf(o), 'IDR', { compact: true })}</p>
          {o.currency !== 'IDR' && (
            <p className="tnum text-[11px] text-fg-muted">
              {fmtCurrency(o.lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0), o.currency, { compact: true })}
            </p>
          )}
        </div>
      ),
      exportValue: (o) => valueOf(o),
    },
    {
      key: 'salesPerson', header: 'Owner', width: 'w-[170px]', defaultHidden: true,
      cell: (o) => <span className="text-[12.5px] text-fg-muted">{o.salesPerson}</span>,
      exportValue: (o) => o.salesPerson,
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><ShoppingCart className="size-3" /> Sales</Badge>}
        title="Sales orders"
        description="The order book, and the honest promise date beside the one that was actually given. Where the two disagree, the difference is shown in days and — where the contract carries a penalty — in money."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open orders" value={fmtNumber(open.length)} icon={<ShoppingCart />} accent="primary" sub={`${salesOrders.length} in the book`} />
        <KpiCard label="Order book value" value={fmtCurrency(bookValue, 'IDR', { compact: true })} icon={<CalendarClock />} accent="accent" sub="open orders at contracted price" />
        <KpiCard
          label="Promised beyond the plan"
          value={fmtNumber(atRisk.length)}
          icon={<TriangleAlert />}
          accent={atRisk.length ? 'danger' : 'success'}
          sub={atRisk.length ? `worst is ${Math.max(...atRisk.map(overrideDays))} days` : 'every date is supported'}
        />
        <KpiCard
          label="Penalty exposure"
          value={fmtCurrency(penaltyExposure, 'IDR', { compact: true })}
          icon={<TriangleAlert />}
          accent={penaltyExposure ? 'danger' : 'success'}
          sub="late-delivery clauses at the current slip"
        />
      </div>

      <DataTable
        data={salesOrders}
        columns={columns}
        getId={(o) => o.id}
        getLabel={(o) => o.code}
        entityLabel="sales order"
        exportName="sales-orders"
        storageKey="orders"
        searchText={(o) => `${o.code} ${customerOf(o)?.name ?? ''} ${o.poReference ?? ''} ${o.salesPerson} ${o.lines.map((l) => l.description).join(' ')}`}
        onRowClick={(o) => navigate(`/orders/${o.id}`)}
        initialSort={{ key: 'due', dir: 'asc' }}
        rowTone={(o) => (overrideDays(o) > 0 ? 'bg-danger-soft/25' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: Array.from(new Set(salesOrders.map((o) => o.status))).map((v) => ({ value: v, label: v.replace(/_/g, ' ') })),
            match: (o, v) => v.includes(o.status),
          },
          {
            key: 'segment', label: 'Segment', values: segment, onChange: setSegment,
            options: Array.from(new Set(customers.map((c) => c.segment))).map((v) => ({ value: v, label: customerSegmentLabel(v) })),
            match: (o, v) => v.includes(customerOf(o)?.segment ?? ''),
          },
        ]}
        emptyTitle="No sales orders"
        emptyDescription="Nothing in the book matches these filters."
      />
    </div>
  )
}
