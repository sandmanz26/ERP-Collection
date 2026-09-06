import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Eye, PackageCheck, ShoppingCart, Truck, Wallet } from 'lucide-react'
import type { PurchaseOrder } from '@/data/types'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import { daysLate, payableSummary, paymentState, poTotals, receiptProgress } from '@/lib/purchasing'

/**
 * Every order the company has placed. One supplier per order — that is what
 * makes it a document a supplier can deliver against and invoice.
 */
export function PurchaseOrdersPage() {
  const nav = useNavigate()
  const can = useCan()
  const { purchaseOrders, suppliers, warehouses, payments, goodsReceipts, purchaseRequests } = useErp()
  const [status, setStatus] = React.useState<string[]>([])
  const [supplierFilter, setSupplierFilter] = React.useState<string[]>([])
  const [payFilter, setPayFilter] = React.useState<string[]>([])

  const supplierOf = (po: PurchaseOrder) => suppliers.find((s) => s.id === po.supplierId)
  const payOf = React.useCallback(
    (po: PurchaseOrder) => paymentState(po, payments, goodsReceipts),
    [payments, goodsReceipts],
  )

  const payable = payableSummary(purchaseOrders, payments, goodsReceipts)
  const awaiting = purchaseOrders.filter((po) => po.status === 'ISSUED' || po.status === 'PARTIALLY_RECEIVED')
  const late = awaiting.filter((po) => daysLate(po) > 0)

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'code', header: 'Order', width: 'w-[176px]', sortable: true, pinned: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => {
        const pr = purchaseRequests.find((p) => p.id === r.purchaseRequestId)
        return (
          <div className="min-w-0">
            <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{r.code}</p>
            <p className="truncate text-[11px] text-fg-subtle">{pr ? `from ${pr.code}` : 'raised directly'}</p>
          </div>
        )
      },
    },
    {
      key: 'supplier', header: 'Supplier', width: 'w-[220px] max-w-[220px]', sortable: true,
      sortValue: (r) => supplierOf(r)?.legalName ?? '', exportValue: (r) => supplierOf(r)?.legalName ?? '',
      cell: (r) => {
        const s = supplierOf(r)
        return (
          <div className="min-w-0">
            <p className="truncate font-medium text-fg">{s?.brandName ?? s?.legalName ?? 'Unknown supplier'}</p>
            <p className="truncate text-[11px] text-fg-subtle">{s?.code} · {s?.picName}</p>
          </div>
        )
      },
    },
    {
      key: 'status', header: 'Status', width: 'w-[150px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge value={r.status} size="sm" tone={r.status === 'CLOSED' ? 'neutral' : undefined} />
          {daysLate(r) > 0 && <span className="text-[11px] font-medium text-danger">{daysLate(r)} days late</span>}
        </div>
      ),
    },
    {
      key: 'delivery', header: 'Delivered', width: 'w-[184px]', sortable: true,
      sortValue: (r) => receiptProgress(r).pct,
      exportValue: (r) => `${receiptProgress(r).received}/${receiptProgress(r).ordered}`,
      headerHint: 'Units actually received against units ordered',
      cell: (r) => {
        const p = receiptProgress(r)
        return (
          <div className="w-[156px]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="tnum text-[12.5px] font-medium text-fg">
                {fmtNumber(p.received)}<span className="text-fg-subtle"> / {fmtNumber(p.ordered)}</span>
              </span>
              <span className="tnum text-[11px] text-fg-subtle">{p.pct}%</span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-soft">
              <div className={`h-full rounded-full ${p.pct === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${p.pct}%` }} />
            </div>
          </div>
        )
      },
    },
    {
      key: 'total', header: 'Order value', width: 'w-[150px]', align: 'right', sortable: true,
      sortValue: (r) => poTotals(r).total, exportValue: (r) => Math.round(poTotals(r).total),
      headerHint: 'Including PPN',
      cell: (r) => (
        <span className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(poTotals(r).total, 'IDR', { compact: true })}</span>
      ),
    },
    {
      key: 'payment', header: 'Payment', width: 'w-[168px]', sortable: true,
      sortValue: (r) => payOf(r).paid / (poTotals(r).total || 1),
      exportValue: (r) => payOf(r).state,
      headerHint: 'Paid against the order value, and whether the term has run out',
      cell: (r) => {
        const p = payOf(r)
        const pct = p.total ? Math.round((p.paid / p.total) * 100) : 0
        return (
          <div className="w-[144px]">
            <div className="flex items-center justify-between gap-2">
              <StatusBadge value={p.state} size="sm" />
              <span className="tnum text-[11px] text-fg-subtle">{pct}%</span>
            </div>
            {p.outstanding > 0 && (
              <p className={`mt-1 tnum text-[11px] ${p.overdue ? 'font-medium text-danger' : 'text-fg-subtle'}`}>
                {fmtCurrency(p.outstanding, 'IDR', { compact: true })} {p.overdue ? `· ${p.daysOverdue}d overdue` : 'left'}
              </p>
            )}
          </div>
        )
      },
    },
    {
      key: 'orderedAt', header: 'Ordered', width: 'w-[124px]', sortable: true,
      sortValue: (r) => r.orderedAt, exportValue: (r) => r.orderedAt.slice(0, 10),
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{fmtDate(r.orderedAt)}</span>,
    },
    {
      key: 'expectedAt', header: 'Expected', width: 'w-[124px]', sortable: true,
      sortValue: (r) => r.expectedAt, exportValue: (r) => r.expectedAt.slice(0, 10),
      cell: (r) => (
        <span className={`tnum text-[12px] ${daysLate(r) > 0 ? 'font-medium text-danger' : 'text-fg-muted'}`}>
          {fmtDate(r.expectedAt)}
        </span>
      ),
    },
    {
      key: 'due', header: 'Payment due', width: 'w-[140px]', sortable: true, defaultHidden: true,
      sortValue: (r) => payOf(r).dueAt, exportValue: (r) => payOf(r).dueAt.slice(0, 10),
      headerHint: 'The term runs from the first delivery, not from the order date',
      cell: (r) => {
        const p = payOf(r)
        return (
          <div className="min-w-0">
            <p className={`tnum text-[12px] ${p.overdue && p.outstanding > 0 ? 'font-medium text-danger' : 'text-fg-muted'}`}>{fmtDate(p.dueAt)}</p>
            <p className="text-[11px] text-fg-subtle">{p.started ? `${r.paymentTermDays} day terms` : 'not delivered yet'}</p>
          </div>
        )
      },
    },
    {
      key: 'warehouse', header: 'Deliver to', width: 'w-[150px]', sortable: true, defaultHidden: true,
      sortValue: (r) => warehouses.find((w) => w.id === r.warehouseId)?.code ?? '',
      exportValue: (r) => warehouses.find((w) => w.id === r.warehouseId)?.code ?? '',
      cell: (r) => <span className="text-[12px] text-fg-muted">{warehouses.find((w) => w.id === r.warehouseId)?.name ?? '—'}</span>,
    },
    {
      key: 'lines', header: 'Lines', width: 'w-[80px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.lines.length, exportValue: (r) => r.lines.length,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{r.lines.length}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        description="One order per supplier, split from an approved purchase request. Deliveries and payments are recorded against the order, both of them a part at a time."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Awaiting delivery"
          value={awaiting.length}
          icon={<Truck />}
          accent={awaiting.length ? 'primary' : 'neutral'}
          sub={`${fmtNumber(awaiting.reduce((a, po) => a + receiptProgress(po).outstanding, 0))} units still owed`}
        />
        <KpiCard
          label="Late deliveries"
          value={late.length}
          icon={<AlertTriangle />}
          accent={late.length ? 'danger' : 'success'}
          sub={late.length ? `worst is ${Math.max(...late.map((po) => daysLate(po)))} days past` : 'nothing past its promised date'}
        />
        <KpiCard
          label="Outstanding to suppliers"
          value={fmtCurrency(payable.outstanding, 'IDR', { compact: true })}
          icon={<Wallet />}
          accent={payable.outstanding ? 'warning' : 'success'}
          sub={`across ${payable.orders} live orders`}
        />
        <KpiCard
          label="Overdue"
          value={fmtCurrency(payable.overdue, 'IDR', { compact: true })}
          icon={<PackageCheck />}
          accent={payable.overdue ? 'danger' : 'success'}
          sub={payable.overdueCount ? `${payable.overdueCount} order${payable.overdueCount === 1 ? ' is' : 's are'} past term` : 'nothing past its term'}
        />
      </div>

      <DataTable
        data={purchaseOrders}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => r.code}
        entityLabel="purchase order"
        storageKey="purchase-orders"
        allowExport={can('po.export')}
        exportName="tata-gemilang-purchase-orders"
        searchText={(r) =>
          [r.code, r.status, supplierOf(r)?.legalName, supplierOf(r)?.brandName, r.note, r.createdBy].filter(Boolean).join(' ')
        }
        initialSort={{ key: 'orderedAt', dir: 'desc' }}
        onRowClick={(r) => nav(`/purchase-orders/${r.id}`)}
        rowTone={(r) => (daysLate(r) > 0 ? 'bg-danger-soft/25' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED'].map((v) => ({
              value: v, label: v.replace(/_/g, ' ').toLowerCase(),
            })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'supplier', label: 'Supplier', values: supplierFilter, onChange: setSupplierFilter,
            options: suppliers.map((s) => ({ value: s.id, label: s.brandName ?? s.legalName })),
            match: (r, v) => v.includes(r.supplierId),
          },
          {
            key: 'payment', label: 'Payment', values: payFilter, onChange: setPayFilter,
            options: [
              { value: 'UNPAID', label: 'unpaid' },
              { value: 'PARTIAL', label: 'part paid' },
              { value: 'PAID', label: 'settled' },
              { value: 'OVERDUE', label: 'overdue' },
            ],
            match: (r, v) => {
              const p = payOf(r)
              return v.includes(p.state) || (v.includes('OVERDUE') && p.overdue && p.outstanding > 0)
            },
          },
        ]}
        rowActions={(r) => (
          <Tooltip content="Open the order">
            <Button variant="ghost" size="iconXs" onClick={() => nav(`/purchase-orders/${r.id}`)}>
              <Eye />
            </Button>
          </Tooltip>
        )}
        footerSummary={(rows) => (
          <span className="tnum">
            {fmtCurrency(rows.reduce((a, r) => a + poTotals(r).total, 0), 'IDR', { compact: true })} ordered ·{' '}
            {fmtCurrency(rows.reduce((a, r) => a + payOf(r).outstanding, 0), 'IDR', { compact: true })} still to pay
          </span>
        )}
        emptyTitle="No purchase orders yet"
        emptyDescription="Approve a purchase request and issue its orders — one per supplier."
        emptyAction={
          <Button variant="primary" size="sm" onClick={() => nav('/purchase-requests')}>
            <ShoppingCart /> Go to purchase requests
          </Button>
        }
      />
    </>
  )
}
