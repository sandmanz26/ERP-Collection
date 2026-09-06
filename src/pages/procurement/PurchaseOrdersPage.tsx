import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column, TableFilter } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { StatusBadge } from '@/components/shared/status'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { fmtCurrency, fmtDate, fmtNumber, relativeLabel, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { orderProgress, orderValue } from '@/lib/procurement'
import { DELIVERY_MODES, deliveryModeLabel } from '@/data/reference'
import type { PurchaseOrder } from '@/data/types'

export function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const store = useErp()
  const [statuses, setStatuses] = React.useState<string[]>([])
  const [modes, setModes] = React.useState<string[]>([])
  const [flags, setFlags] = React.useState<string[]>([])

  const progressOf = (o: PurchaseOrder) => orderProgress(o, store.receipts)

  const filters: TableFilter<PurchaseOrder>[] = [
    {
      key: 'status',
      label: 'Status',
      options: ['DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED'].map((v) => ({ value: v, label: titleCase(v) })),
      values: statuses,
      onChange: setStatuses,
      match: (r, v) => v.includes(r.status),
    },
    {
      key: 'mode',
      label: 'Delivery',
      options: DELIVERY_MODES.map((m) => ({ value: m.value, label: m.label })),
      values: modes,
      onChange: setModes,
      match: (r, v) => v.includes(r.deliveryMode),
    },
    {
      key: 'flags',
      label: 'Attention',
      options: [
        { value: 'LATE', label: 'Past the expected date' },
        { value: 'PARTIAL', label: 'Part delivered' },
        { value: 'APPROVAL', label: 'Waiting for approval' },
        { value: 'SVLK', label: 'Needs a legality document' },
      ],
      values: flags,
      onChange: setFlags,
      match: (r, v) => {
        const p = progressOf(r)
        return v.some((x) =>
          x === 'LATE' ? p.overdue
            : x === 'PARTIAL' ? r.status === 'PARTIALLY_RECEIVED'
              : x === 'APPROVAL' ? r.status === 'AWAITING_APPROVAL'
                : r.requiresSvlkDoc,
        )
      },
    },
  ]

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'code',
      header: 'Order',
      width: 'min-w-[180px]',
      pinned: true,
      sortable: true,
      sortValue: (r) => r.code,
      exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{fmtDate(r.orderedAt)} · {r.raisedByName}</p>
        </div>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      width: 'min-w-[200px]',
      sortable: true,
      sortValue: (r) => r.supplierName,
      exportValue: (r) => r.supplierName,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg">{r.supplierName}</p>
          <p className="truncate text-[11.5px] text-fg-muted">
            {r.lines.length} line{r.lines.length > 1 ? 's' : ''} · {r.paymentTermDays}d terms
          </p>
        </div>
      ),
    },
    {
      key: 'project',
      header: 'For',
      width: 'w-[160px]',
      exportValue: (r) => store.projects.find((p) => p.id === r.projectId)?.code ?? 'stock',
      cell: (r) => {
        const p = store.projects.find((x) => x.id === r.projectId)
        if (!p) return <Badge size="sm" tone="neutral">Stock</Badge>
        return (
          <Link to={`/projects/${p.id}`} className="truncate text-[12.5px] font-medium text-fg hover:text-primary">
            {p.code}
          </Link>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
      cell: (r) => {
        const p = progressOf(r)
        return (
          <div className="space-y-1">
            <StatusBadge value={r.status} size="sm" />
            {p.overdue && <Badge size="sm" tone="danger">{p.daysLate}d late</Badge>}
          </div>
        )
      },
    },
    {
      key: 'delivery',
      header: 'Delivery',
      width: 'w-[160px]',
      headerHint: 'Where the supplier was told to put the goods. Direct never touches our gate.',
      exportValue: (r) => r.deliveryMode,
      cell: (r) => (
        <Tooltip content={DELIVERY_MODES.find((m) => m.value === r.deliveryMode)?.hint ?? ''}>
          <span>
            <Badge size="sm" tone={r.deliveryMode === 'TO_SITE' ? 'purple' : r.deliveryMode === 'TO_SUBCON' ? 'info' : 'neutral'}>
              {deliveryModeLabel(r.deliveryMode)}
            </Badge>
          </span>
        </Tooltip>
      ),
    },
    {
      key: 'progress',
      header: 'Received',
      width: 'w-[170px]',
      sortable: true,
      sortValue: (r) => progressOf(r).receivedPct,
      exportValue: (r) => Math.round(progressOf(r).receivedPct),
      headerHint: 'Computed from the goods receipts, never typed on the order.',
      cell: (r) => {
        const p = progressOf(r)
        return (
          <div>
            <UtilisationBar pct={p.receivedPct} className="w-32" label={`${p.receivedPct.toFixed(0)}% · ${p.deliveries} deliver${p.deliveries === 1 ? 'y' : 'ies'}`} />
          </div>
        )
      },
    },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => orderValue(r),
      exportValue: (r) => Math.round(orderValue(r)),
      cell: (r) => {
        const p = progressOf(r)
        return (
          <div className="text-right">
            <p className="tnum font-medium text-fg">{fmtCurrency(orderValue(r), 'IDR', { compact: true })}</p>
            <p className="tnum text-[11px] text-fg-muted">{fmtCurrency(p.openValue, 'IDR', { compact: true })} open</p>
          </div>
        )
      },
    },
    {
      key: 'expected',
      header: 'Expected',
      width: 'w-[140px]',
      sortable: true,
      sortValue: (r) => r.expectedAt,
      exportValue: (r) => r.expectedAt,
      cell: (r) => (
        <div>
          <p className="text-fg-muted">{fmtDate(r.expectedAt)}</p>
          <p className="text-[11px] text-fg-subtle">{relativeLabel(r.expectedAt)}</p>
        </div>
      ),
    },
    {
      key: 'legality',
      header: 'Legality doc',
      width: 'w-[120px]',
      defaultHidden: true,
      exportValue: (r) => (r.requiresSvlkDoc ? 'required' : ''),
      cell: (r) => (r.requiresSvlkDoc ? <Badge size="sm" tone="warning">required</Badge> : <span className="text-[12px] text-fg-subtle">—</span>),
    },
  ]

  const open = store.orders.filter((o) => ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'].includes(o.status))
  const late = store.orders.filter((o) => progressOf(o).overdue)
  const awaiting = store.orders.filter((o) => o.status === 'AWAITING_APPROVAL')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Procurement</Badge>}
        title="Purchase orders"
        description="What has been promised to suppliers. The received column is folded out of the goods receipts, so an order that says eighty per cent delivered is eighty per cent delivered — there is no separate number anybody can update by hand."
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open orders" value={String(open.length)} sub={`${store.orders.length} in total`} icon={<ShoppingCart />} accent="primary" />
        <KpiCard
          label="Open commitment"
          value={fmtCurrency(store.orders.reduce((a, o) => a + progressOf(o).openValue, 0), 'IDR', { compact: true })}
          sub="ordered and not yet delivered"
          accent="warning"
        />
        <KpiCard label="Late" value={String(late.length)} sub={late.length ? `worst is ${Math.max(...late.map((o) => progressOf(o).daysLate))} days` : 'nothing overdue'} accent={late.length ? 'danger' : 'accent'} />
        <KpiCard label="Waiting for approval" value={String(awaiting.length)} sub={fmtCurrency(awaiting.reduce((a, o) => a + orderValue(o), 0), 'IDR', { compact: true })} accent={awaiting.length ? 'warning' : 'accent'} />
      </div>

      <DataTable
        data={store.orders}
        columns={columns}
        filters={filters}
        getId={(r) => r.id}
        getLabel={(r) => r.code}
        entityLabel="purchase orders"
        searchText={(r) => `${r.code} ${r.supplierName} ${r.lines.map((l) => l.description).join(' ')} ${store.projects.find((p) => p.id === r.projectId)?.code ?? ''}`}
        onRowClick={(r) => navigate(`/purchase-orders/${r.id}`)}
        onDelete={store.removeOrders}
        deleteNote="Deleting an order does not remove the goods receipts raised against it."
        exportName="kriyanusa-purchase-orders"
        storageKey="orders"
        initialSort={{ key: 'expected', dir: 'asc' }}
        rowActions={(r) =>
          r.status === 'AWAITING_APPROVAL' ? (
            <Button size="xs" variant="primary" onClick={() => store.approveOrder(r.id)}>Approve</Button>
          ) : null
        }
        rowTone={(r) => (progressOf(r).overdue ? 'bg-danger-soft/25' : undefined)}
        footerSummary={(rows) => (
          <span className="tnum">
            {rows.length} orders · {fmtCurrency(rows.reduce((a, r) => a + orderValue(r), 0), 'IDR', { compact: true })} ordered ·{' '}
            {fmtCurrency(rows.reduce((a, r) => a + progressOf(r).openValue, 0), 'IDR', { compact: true })} still open ·{' '}
            {fmtNumber(rows.reduce((a, r) => a + progressOf(r).deliveries, 0))} deliveries
          </span>
        )}
      />
    </div>
  )
}
