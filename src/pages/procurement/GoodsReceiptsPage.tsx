import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Eye, PackageCheck, Timer, Truck } from 'lucide-react'
import type { GoodsReceipt } from '@/data/types'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tooltip } from '@/components/ui/tooltip'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import { daysBetween } from '@/lib/domain'

const TH = 'whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted'
const TD = 'border-b border-border px-3 py-2.5 align-top'

const receiptUnits = (g: GoodsReceipt) => g.lines.reduce((a, l) => a + l.qtyReceived, 0)
const receiptRejected = (g: GoodsReceipt) => g.lines.reduce((a, l) => a + l.qtyRejected, 0)
const receiptValue = (g: GoodsReceipt) => g.lines.reduce((a, l) => a + l.qtyReceived * l.unitCost, 0)

/**
 * Everything that has physically arrived. A receipt is the only document in the
 * system that adds stock from outside the company, which is why it is kept as a
 * register in its own right rather than only inside its order.
 */
export function GoodsReceiptsPage() {
  const nav = useNavigate()
  const can = useCan()
  const { goodsReceipts, purchaseOrders, suppliers, warehouses, items } = useErp()
  const [open, setOpen] = React.useState<GoodsReceipt | null>(null)
  const [warehouseFilter, setWarehouseFilter] = React.useState<string[]>([])
  const [supplierFilter, setSupplierFilter] = React.useState<string[]>([])
  const [timing, setTiming] = React.useState<string[]>([])

  const orderOf = (g: GoodsReceipt) => purchaseOrders.find((p) => p.id === g.purchaseOrderId)
  const supplierOf = (g: GoodsReceipt) => suppliers.find((s) => s.id === g.supplierId)
  const warehouseOf = (g: GoodsReceipt) => warehouses.find((w) => w.id === g.warehouseId)

  const last30 = goodsReceipts.filter((g) => daysBetween(g.receivedAt, new Date().toISOString()) <= 30)
  const late = goodsReceipts.filter((g) => !g.onTime)
  const rejected = goodsReceipts.reduce((a, g) => a + receiptRejected(g), 0)

  const columns: Column<GoodsReceipt>[] = [
    {
      key: 'code', primary: true, header: 'Receipt', width: 'w-[168px]', sortable: true, pinned: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{r.code}</p>
          <p className="truncate text-[11px] text-fg-subtle">{r.deliveryNote ?? 'no delivery note'}</p>
        </div>
      ),
    },
    {
      key: 'order', primary: true, header: 'Order', width: 'w-[150px]', sortable: true,
      sortValue: (r) => orderOf(r)?.code ?? '', exportValue: (r) => orderOf(r)?.code ?? '',
      cell: (r) => {
        const po = orderOf(r)
        if (!po) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <button
            onClick={(e) => { e.stopPropagation(); nav(`/purchase-orders/${po.id}`) }}
            className="font-mono text-[12px] font-medium text-primary hover:underline"
          >
            {po.code}
          </button>
        )
      },
    },
    {
      key: 'supplier', primary: true, header: 'Supplier', width: 'w-[200px] max-w-[200px]', sortable: true,
      sortValue: (r) => supplierOf(r)?.legalName ?? '', exportValue: (r) => supplierOf(r)?.legalName ?? '',
      cell: (r) => <p className="truncate text-[12.5px] font-medium text-fg">{supplierOf(r)?.brandName ?? supplierOf(r)?.legalName}</p>,
    },
    {
      key: 'receivedAt', primary: true, header: 'Received', width: 'w-[150px]', sortable: true,
      sortValue: (r) => r.receivedAt, exportValue: (r) => r.receivedAt.slice(0, 10),
      cell: (r) => (
        <div className="min-w-0">
          <p className="tnum text-[12.5px] text-fg">{fmtDate(r.receivedAt)}</p>
          <p className="truncate text-[11px] text-fg-subtle">{r.receivedBy}</p>
        </div>
      ),
    },
    {
      key: 'timing', primary: true, header: 'Timing', width: 'w-[108px]', sortable: true,
      sortValue: (r) => (r.onTime ? 1 : 0), exportValue: (r) => (r.onTime ? 'ON_TIME' : 'LATE'),
      cell: (r) => <Badge tone={r.onTime ? 'success' : 'warning'} size="sm" dot>{r.onTime ? 'On time' : 'Late'}</Badge>,
    },
    {
      key: 'warehouse', header: 'Into', width: 'w-[180px] max-w-[180px]', sortable: true,
      sortValue: (r) => warehouseOf(r)?.code ?? '', exportValue: (r) => warehouseOf(r)?.code ?? '',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg">{warehouseOf(r)?.name}</p>
          <p className="font-mono text-[11px] text-fg-subtle">{warehouseOf(r)?.code}</p>
        </div>
      ),
    },
    {
      key: 'lines', header: 'Lines', width: 'w-[80px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.lines.length, exportValue: (r) => r.lines.length,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{r.lines.length}</span>,
    },
    {
      key: 'units', header: 'Units in', width: 'w-[108px]', align: 'right', sortable: true,
      sortValue: (r) => receiptUnits(r), exportValue: (r) => receiptUnits(r),
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{fmtNumber(receiptUnits(r))}</span>,
    },
    {
      key: 'rejected', header: 'Rejected', width: 'w-[104px]', align: 'right', sortable: true,
      sortValue: (r) => receiptRejected(r), exportValue: (r) => receiptRejected(r),
      headerHint: 'Sent back at the gate. It never entered stock and stays owed on the order.',
      cell: (r) => {
        const n = receiptRejected(r)
        return n > 0 ? (
          <span className="tnum text-[12.5px] font-medium text-danger">{fmtNumber(n)}</span>
        ) : (
          <span className="text-[12px] text-fg-subtle">—</span>
        )
      },
    },
    {
      key: 'value', header: 'Value in', width: 'w-[140px]', align: 'right', sortable: true,
      sortValue: (r) => receiptValue(r), exportValue: (r) => Math.round(receiptValue(r)),
      cell: (r) => <span className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(receiptValue(r), 'IDR', { compact: true })}</span>,
    },
    {
      key: 'vehicle', header: 'Vehicle', width: 'w-[112px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.vehicleNo ?? '', exportValue: (r) => r.vehicleNo ?? '',
      cell: (r) => <span className="font-mono text-[11.5px] text-fg-muted">{r.vehicleNo ?? '—'}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Goods Receipt"
        description="Every delivery that has arrived against a purchase order. Receiving is what moves stock into a warehouse and turns an agreed price into the last price actually paid."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Deliveries recorded"
          value={goodsReceipts.length}
          icon={<PackageCheck />}
          accent="primary"
          sub={`${last30.length} in the last 30 days`}
        />
        <KpiCard
          label="Units received"
          value={fmtNumber(goodsReceipts.reduce((a, g) => a + receiptUnits(g), 0))}
          icon={<Truck />}
          accent="accent"
          sub={fmtCurrency(goodsReceipts.reduce((a, g) => a + receiptValue(g), 0), 'IDR', { compact: true })}
        />
        <KpiCard
          label="Late deliveries"
          value={late.length}
          icon={<Timer />}
          accent={late.length ? 'warning' : 'success'}
          sub={goodsReceipts.length ? `${Math.round(((goodsReceipts.length - late.length) / goodsReceipts.length) * 100)}% arrived on time` : 'nothing received yet'}
        />
        <KpiCard
          label="Units rejected"
          value={fmtNumber(rejected)}
          icon={<AlertTriangle />}
          accent={rejected ? 'danger' : 'success'}
          sub="sent back at the gate, still owed"
        />
      </div>

      <DataTable
        data={goodsReceipts}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => r.code}
        entityLabel="goods receipt"
        storageKey="goods-receipts"
        allowExport={can('grn.export')}
        exportName="tata-gemilang-goods-receipts"
        searchText={(r) =>
          [r.code, r.deliveryNote, r.vehicleNo, r.receivedBy, r.note, orderOf(r)?.code, supplierOf(r)?.legalName, warehouseOf(r)?.name]
            .filter(Boolean)
            .join(' ')
        }
        initialSort={{ key: 'receivedAt', dir: 'desc' }}
        onRowClick={(r) => setOpen(r)}
        rowTone={(r) => (receiptRejected(r) > 0 ? 'bg-danger-soft/20' : undefined)}
        filters={[
          {
            key: 'warehouse', label: 'Warehouse', values: warehouseFilter, onChange: setWarehouseFilter,
            options: warehouses.map((w) => ({ value: w.id, label: w.name })),
            match: (r, v) => v.includes(r.warehouseId),
          },
          {
            key: 'supplier', label: 'Supplier', values: supplierFilter, onChange: setSupplierFilter,
            options: suppliers.map((s) => ({ value: s.id, label: s.brandName ?? s.legalName })),
            match: (r, v) => v.includes(r.supplierId),
          },
          {
            key: 'timing', label: 'Timing', values: timing, onChange: setTiming,
            options: [
              { value: 'ON_TIME', label: 'on time' },
              { value: 'LATE', label: 'late' },
              { value: 'REJECTED', label: 'has rejections' },
            ],
            match: (r, v) =>
              (v.includes('ON_TIME') && r.onTime) ||
              (v.includes('LATE') && !r.onTime) ||
              (v.includes('REJECTED') && receiptRejected(r) > 0),
          },
        ]}
        rowActions={(r) => (
          <Tooltip content="Open the delivery">
            <Button variant="ghost" size="iconXs" onClick={() => setOpen(r)}>
              <Eye />
            </Button>
          </Tooltip>
        )}
        footerSummary={(rows) => (
          <span className="tnum">
            {fmtNumber(rows.reduce((a, r) => a + receiptUnits(r), 0))} units ·{' '}
            {fmtCurrency(rows.reduce((a, r) => a + receiptValue(r), 0), 'IDR', { compact: true })} in this view
          </span>
        )}
        emptyTitle="Nothing has been received yet"
        emptyDescription="Deliveries are recorded against a purchase order — open one that is awaiting delivery."
        emptyAction={
          <Button variant="primary" size="sm" onClick={() => nav('/purchase-orders')}>
            <Truck /> Go to purchase orders
          </Button>
        }
      />

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent
          size="lg"
          icon={<PackageCheck />}
          title={open ? `${open.code} — ${supplierOf(open)?.brandName ?? supplierOf(open)?.legalName}` : ''}
          description={
            open
              ? `${fmtDate(open.receivedAt)} into ${warehouseOf(open)?.name} · received by ${open.receivedBy || '—'}${open.deliveryNote ? ` · ${open.deliveryNote}` : ''}${open.vehicleNo ? ` · ${open.vehicleNo}` : ''}`
              : ''
          }
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setOpen(null)}>Close</Button>
              {open && orderOf(open) && (
                <Button variant="primary" size="sm" onClick={() => nav(`/purchase-orders/${open.purchaseOrderId}`)}>
                  Open {orderOf(open)?.code}
                </Button>
              )}
            </>
          }
        >
          {open && (
            <div className="scrollbar-thin max-h-[420px] overflow-auto">
              <table className="w-full border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr>
                    <th className={TH}>Item</th>
                    <th className={`${TH} text-right`}>Received</th>
                    <th className={`${TH} text-right`}>Rejected</th>
                    <th className={TH}>Bin / batch</th>
                    <th className={`${TH} text-right`}>Unit cost</th>
                  </tr>
                </thead>
                <tbody>
                  {open.lines.map((line) => {
                    const item = items.find((i) => i.id === line.itemId)
                    return (
                      <tr key={line.id}>
                        <td className={TD}>
                          <p className="max-w-[240px] truncate font-medium text-fg">{item?.name}</p>
                          <p className="font-mono text-[11px] text-fg-subtle">{item?.sku}</p>
                        </td>
                        <td className={`${TD} tnum whitespace-nowrap text-right font-medium text-fg`}>
                          {fmtNumber(line.qtyReceived)} <span className="text-[11px] font-normal text-fg-subtle">{item?.uom}</span>
                        </td>
                        <td className={`${TD} tnum whitespace-nowrap text-right`}>
                          {line.qtyRejected > 0 ? (
                            <span className="font-medium text-danger">{fmtNumber(line.qtyRejected)}</span>
                          ) : (
                            <span className="text-fg-subtle">—</span>
                          )}
                          {line.rejectReason && <p className="mt-0.5 max-w-[200px] text-[11px] font-normal text-fg-subtle">{line.rejectReason}</p>}
                        </td>
                        <td className={`${TD} font-mono text-[11.5px] text-fg-muted`}>
                          {line.binLocation}
                          {line.batchNo && <span className="block text-[11px] text-fg-subtle">{line.batchNo}</span>}
                          {line.expiryDate && <span className="block text-[11px] text-fg-subtle">exp {fmtDate(line.expiryDate)}</span>}
                        </td>
                        <td className={`${TD} tnum whitespace-nowrap text-right text-fg-muted`}>{fmtCurrency(line.unitCost, 'IDR')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {open.note && <p className="px-3 py-3 text-[12.5px] text-fg-muted">{open.note}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
