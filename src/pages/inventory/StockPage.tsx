import * as React from 'react'
import { AlertTriangle, Boxes, CalendarClock, Pencil, Plus, Trash2, Warehouse as WarehouseIcon } from 'lucide-react'
import type { WarehouseStock } from '@/data/types'
import { ITEM_CATEGORIES, STOCK_CONDITIONS, itemCategoryLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { useToast } from '@/components/ui/toast'
import { StockForm } from './StockForm'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import { uid } from '@/lib/utils'
import { availableQty, daysUntil, effectiveMin, expiryStatus, stockStatus, stockValue } from '@/lib/domain'

export function StockPage() {
  const toast = useToast()
  const can = useCan()
  const { stock, items, warehouses, removeStock, importStock } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<WarehouseStock | null>(null)
  const [deleting, setDeleting] = React.useState<WarehouseStock | null>(null)
  const [warehouse, setWarehouse] = React.useState<string[]>([])
  const [category, setCategory] = React.useState<string[]>([])
  const [health, setHealth] = React.useState<string[]>([])
  const [condition, setCondition] = React.useState<string[]>([])
  const [expiry, setExpiry] = React.useState<string[]>([])

  const itemOf = (s: WarehouseStock) => items.find((i) => i.id === s.itemId)
  const warehouseOf = (s: WarehouseStock) => warehouses.find((w) => w.id === s.warehouseId)

  const lowLines = stock.filter((s) => ['LOW', 'OUT_OF_STOCK'].includes(stockStatus(s, itemOf(s))))
  const expiringLines = stock.filter((s) => ['EXPIRING', 'EXPIRED'].includes(expiryStatus(s)))
  const totalValue = stock.reduce((a, s) => a + stockValue(s), 0)
  const reservedValue = stock.reduce((a, s) => a + s.qtyReserved * s.unitCost, 0)

  const columns: Column<WarehouseStock>[] = [
    {
      key: 'sku', header: 'SKU', width: 'w-[136px]', pinned: true, sortable: true,
      sortValue: (r) => itemOf(r)?.sku ?? '', exportValue: (r) => itemOf(r)?.sku ?? '',
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{itemOf(r)?.sku ?? '—'}</span>,
    },
    {
      key: 'item', header: 'Item', width: 'w-[250px] max-w-[250px]', sortable: true,
      sortValue: (r) => itemOf(r)?.name ?? '', exportValue: (r) => itemOf(r)?.name ?? '',
      cell: (r) => {
        const item = itemOf(r)
        if (!item) return <span className="text-[12.5px] text-danger">Item removed from the master</span>
        return (
          <div className="min-w-0">
            <p className="truncate font-medium text-fg">{item.name}</p>
            <p className="truncate text-[11.5px] text-fg-muted">
              {itemCategoryLabel(item.category)}
              {item.brand ? ` · ${item.brand}` : ''}
            </p>
          </div>
        )
      },
    },
    {
      key: 'warehouse', header: 'Warehouse', width: 'w-[180px]', sortable: true,
      sortValue: (r) => warehouseOf(r)?.code ?? '', exportValue: (r) => warehouseOf(r)?.code ?? '',
      cell: (r) => {
        const w = warehouseOf(r)
        return (
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-fg">{w?.code ?? '—'}</p>
            <p className="truncate text-[11px] text-fg-subtle">{w?.name}</p>
          </div>
        )
      },
    },
    {
      key: 'bin', header: 'Bin', width: 'w-[126px]', sortable: true,
      sortValue: (r) => r.binLocation, exportValue: (r) => r.binLocation,
      cell: (r) => <span className="font-mono text-[12px] text-fg-muted">{r.binLocation}</span>,
    },
    {
      key: 'onHand', header: 'On hand', width: 'w-[108px]', align: 'right', sortable: true,
      sortValue: (r) => r.qtyOnHand, exportValue: (r) => r.qtyOnHand,
      cell: (r) => (
        <span className="tnum text-[12.5px] font-medium text-fg">
          {fmtNumber(r.qtyOnHand)} <span className="text-[11px] font-normal text-fg-subtle">{itemOf(r)?.uom}</span>
        </span>
      ),
    },
    {
      key: 'reserved', header: 'Reserved', width: 'w-[100px]', align: 'right', sortable: true,
      sortValue: (r) => r.qtyReserved, exportValue: (r) => r.qtyReserved,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtNumber(r.qtyReserved)}</span>,
    },
    {
      key: 'available', header: 'Available', width: 'w-[122px]', align: 'right', sortable: true,
      sortValue: (r) => availableQty(r), exportValue: (r) => availableQty(r),
      headerHint: 'On hand less what is already reserved for a project',
      cell: (r) => {
        const status = stockStatus(r, itemOf(r))
        const tone = status === 'OUT_OF_STOCK' ? 'text-danger' : status === 'LOW' ? 'text-warning' : 'text-fg'
        return <span className={`tnum text-[12.5px] font-semibold ${tone}`}>{fmtNumber(availableQty(r))}</span>
      },
    },
    {
      key: 'health', header: 'Level', width: 'w-[146px]', sortable: true,
      sortValue: (r) => ({ OUT_OF_STOCK: 0, LOW: 1, OVERSTOCK: 2, HEALTHY: 3 })[stockStatus(r, itemOf(r))],
      exportValue: (r) => stockStatus(r, itemOf(r)),
      cell: (r) => {
        const item = itemOf(r)
        return (
          <Tooltip content={`Minimum ${fmtNumber(effectiveMin(r, item))}${r.minStockOverride !== undefined ? ' (warehouse override)' : ''} · maximum ${fmtNumber(item?.maxStock ?? 0)}`}>
            <span>
              <StatusBadge value={stockStatus(r, item)} size="sm" />
            </span>
          </Tooltip>
        )
      },
    },
    {
      key: 'batch', header: 'Batch', width: 'w-[122px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.batchNo ?? '', exportValue: (r) => r.batchNo ?? '',
      cell: (r) => <span className="font-mono text-[12px] text-fg-muted">{r.batchNo ?? '—'}</span>,
    },
    {
      key: 'expiry', header: 'Expiry', width: 'w-[152px]', sortable: true,
      sortValue: (r) => r.expiryDate ?? '9999', exportValue: (r) => r.expiryDate?.slice(0, 10) ?? '',
      cell: (r) => {
        const status = expiryStatus(r)
        if (status === 'NONE') return <span className="text-[12px] text-fg-subtle">—</span>
        const days = daysUntil(r.expiryDate!)
        return (
          <div className="min-w-0">
            <p className={`tnum text-[12.5px] ${status === 'EXPIRED' ? 'font-semibold text-danger' : status === 'EXPIRING' ? 'text-warning' : 'text-fg-muted'}`}>
              {fmtDate(r.expiryDate)}
            </p>
            <p className="text-[11px] text-fg-subtle">{days < 0 ? `${Math.abs(days)} days ago` : `in ${days} days`}</p>
          </div>
        )
      },
    },
    {
      key: 'condition', header: 'Condition', width: 'w-[126px]', sortable: true,
      sortValue: (r) => r.condition, exportValue: (r) => r.condition,
      cell: (r) => <StatusBadge value={r.condition} size="sm" />,
    },
    {
      key: 'unitCost', header: 'Unit cost', width: 'w-[132px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.unitCost, exportValue: (r) => r.unitCost,
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{fmtCurrency(r.unitCost, 'IDR')}</span>,
    },
    {
      key: 'value', header: 'Line value', width: 'w-[142px]', align: 'right', sortable: true,
      sortValue: (r) => stockValue(r), exportValue: (r) => Math.round(stockValue(r)),
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{fmtCurrency(stockValue(r), 'IDR', { compact: true })}</span>,
    },
    {
      key: 'counted', header: 'Last counted', width: 'w-[136px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.lastCountedAt ?? '', exportValue: (r) => r.lastCountedAt?.slice(0, 10) ?? '',
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{r.lastCountedAt ? fmtDate(r.lastCountedAt) : '—'}</span>,
    },
    {
      key: 'movement', header: 'Last movement', width: 'w-[142px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.lastMovementAt ?? '', exportValue: (r) => r.lastMovementAt?.slice(0, 10) ?? '',
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{r.lastMovementAt ? fmtDate(r.lastMovementAt) : '—'}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Warehouse Stock"
        description="One line per item, per warehouse, per bin. Availability is what is on hand less whatever a project has already reserved."
        actions={
          can('stock.create') ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus /> New stock line
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Stock lines"
          value={stock.length}
          icon={<Boxes />}
          accent="primary"
          sub={`${new Set(stock.map((s) => s.itemId)).size} items across ${new Set(stock.map((s) => s.warehouseId)).size} warehouses`}
        />
        <KpiCard
          label="Stock value"
          value={fmtCurrency(totalValue, 'IDR', { compact: true })}
          icon={<WarehouseIcon />}
          accent="purple"
          sub={`${fmtCurrency(reservedValue, 'IDR', { compact: true })} of it already reserved`}
        />
        <KpiCard
          label="Below minimum"
          value={lowLines.length}
          icon={<AlertTriangle />}
          accent={lowLines.length ? 'warning' : 'success'}
          sub={lowLines.length ? `${lowLines.filter((s) => stockStatus(s, itemOf(s)) === 'OUT_OF_STOCK').length} of them out of stock` : 'every line is above its floor'}
          onClick={() => setHealth(['LOW', 'OUT_OF_STOCK'])}
        />
        <KpiCard
          label="Expiry watch"
          value={expiringLines.length}
          icon={<CalendarClock />}
          accent={expiringLines.length ? 'warning' : 'success'}
          sub={expiringLines.length ? `${expiringLines.filter((s) => expiryStatus(s) === 'EXPIRED').length} already past date` : 'nothing expiring within 60 days'}
          onClick={() => setExpiry(['EXPIRING', 'EXPIRED'])}
        />
      </div>

      <DataTable
        data={stock}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${itemOf(r)?.sku ?? 'item'} at ${warehouseOf(r)?.code ?? 'warehouse'}`}
        entityLabel="stock line"
        storageKey="stock"
        allowExport={can('stock.export')}
        exportName="tata-gemilang-warehouse-stock"
        searchText={(r) =>
          [itemOf(r)?.sku, itemOf(r)?.name, itemOf(r)?.brand, warehouseOf(r)?.code, warehouseOf(r)?.name, warehouseOf(r)?.city, r.binLocation, r.batchNo]
            .filter(Boolean)
            .join(' ')
        }
        initialSort={{ key: 'health', dir: 'asc' }}
        pageSize={50}
        compactByDefault
        onRowClick={
          can('stock.edit')
            ? (r) => {
                setEditing(r)
                setFormOpen(true)
              }
            : undefined
        }
        rowTone={(r) => {
          const status = stockStatus(r, itemOf(r))
          if (status === 'OUT_OF_STOCK') return 'bg-danger-soft/25'
          if (status === 'LOW' || expiryStatus(r) === 'EXPIRED') return 'bg-warning-soft/25'
          return undefined
        }}
        filters={[
          {
            key: 'warehouse', label: 'Warehouse', values: warehouse, onChange: setWarehouse,
            options: warehouses.map((w) => ({ value: w.id, label: `${w.code} · ${w.name}` })),
            match: (r, v) => v.includes(r.warehouseId),
          },
          {
            key: 'category', label: 'Category', values: category, onChange: setCategory,
            options: ITEM_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
            match: (r, v) => {
              const item = itemOf(r)
              return !!item && v.includes(item.category)
            },
          },
          {
            key: 'health', label: 'Level', values: health, onChange: setHealth,
            options: [
              { value: 'OUT_OF_STOCK', label: 'Out of stock' },
              { value: 'LOW', label: 'Below minimum' },
              { value: 'HEALTHY', label: 'Healthy' },
              { value: 'OVERSTOCK', label: 'Overstock' },
            ],
            match: (r, v) => v.includes(stockStatus(r, itemOf(r))),
          },
          {
            key: 'expiry', label: 'Expiry', values: expiry, onChange: setExpiry,
            options: [
              { value: 'EXPIRED', label: 'Past its date' },
              { value: 'EXPIRING', label: 'Within 60 days' },
              { value: 'OK', label: 'In date' },
              { value: 'NONE', label: 'No expiry' },
            ],
            match: (r, v) => v.includes(expiryStatus(r)),
          },
          {
            key: 'condition', label: 'Condition', values: condition, onChange: setCondition,
            options: STOCK_CONDITIONS.map((c) => ({ value: c.value, label: c.label })),
            match: (r, v) => v.includes(r.condition),
          },
        ]}
        onDelete={can('stock.delete') ? (ids) => {
          removeStock(ids)
          toast.push({ tone: 'success', title: `${ids.length} stock line${ids.length === 1 ? '' : 's'} deleted` })
        } : undefined}
        importFields={can('stock.import') ? [
          { key: 'warehouseCode', label: 'Warehouse code', required: true, hint: 'must match an existing warehouse, e.g. WH-JKT-01' },
          { key: 'sku', label: 'SKU', required: true, hint: 'must match an item in the master' },
          { key: 'binLocation', label: 'Bin / rack', required: true },
          { key: 'qtyOnHand', label: 'Quantity on hand', required: true },
          { key: 'qtyReserved', label: 'Reserved' },
          { key: 'unitCost', label: 'Unit cost (IDR)' },
          { key: 'batchNo', label: 'Batch number' },
          { key: 'expiryDate', label: 'Expiry date', hint: 'YYYY-MM-DD' },
          { key: 'condition', label: 'Condition', hint: 'GOOD / DAMAGED / QUARANTINE' },
          { key: 'minStockOverride', label: 'Minimum override' },
        ] : undefined}
        importSample={{
          warehouseCode: 'WH-JKT-01', sku: 'ITM-UNI-0002', binLocation: 'RAK-A-01-2', qtyOnHand: '120',
          qtyReserved: '20', unitCost: '445000', batchNo: '', expiryDate: '', condition: 'GOOD', minStockOverride: '',
        }}
        toImportRow={(r) => ({
          warehouseCode: warehouseOf(r)?.code ?? '', sku: itemOf(r)?.sku ?? '', binLocation: r.binLocation,
          qtyOnHand: r.qtyOnHand, qtyReserved: r.qtyReserved, unitCost: r.unitCost, batchNo: r.batchNo ?? '',
          expiryDate: r.expiryDate?.slice(0, 10) ?? '', condition: r.condition,
          minStockOverride: r.minStockOverride ?? '',
        })}
        onImport={can('stock.import') ? (rows) => {
          const usable = rows.filter(
            (row) => warehouses.some((w) => w.code === row.warehouseCode) && items.some((i) => i.sku === row.sku),
          )
          const skipped = rows.length - usable.length
          const mapped: WarehouseStock[] = usable.map((row) => {
            const wh = warehouses.find((w) => w.code === row.warehouseCode)!
            const item = items.find((i) => i.sku === row.sku)!
            const existing = stock.find(
              (s) => s.warehouseId === wh.id && s.itemId === item.id && (s.batchNo ?? '') === (row.batchNo ?? ''),
            )
            return {
              ...(existing ?? {}),
              id: existing?.id ?? uid('stk'),
              warehouseId: wh.id,
              itemId: item.id,
              binLocation: row.binLocation,
              qtyOnHand: Number(row.qtyOnHand) || 0,
              qtyReserved: Number(row.qtyReserved) || 0,
              unitCost: Number(row.unitCost) || item.standardCost,
              batchNo: row.batchNo || undefined,
              expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString() : undefined,
              condition: (['GOOD', 'DAMAGED', 'QUARANTINE'].includes(row.condition) ? row.condition : 'GOOD') as WarehouseStock['condition'],
              minStockOverride: row.minStockOverride ? Number(row.minStockOverride) : undefined,
              lastMovementAt: new Date().toISOString(),
              lastCountedAt: existing?.lastCountedAt,
            } as WarehouseStock
          })
          importStock(mapped)
          toast.push({
            tone: skipped ? 'warning' : 'success',
            title: `${mapped.length} stock line${mapped.length === 1 ? '' : 's'} imported`,
            description: skipped
              ? `${skipped} row${skipped === 1 ? '' : 's'} skipped — the warehouse code or SKU did not match.`
              : 'Lines matching an existing warehouse, item and batch were updated in place.',
          })
        } : undefined}
        rowActions={(r) => (
          <>
            {can('stock.edit') && (
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
            )}
            {can('stock.delete') && (
              <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}>
                <Trash2 />
              </Button>
            </Tooltip>
            )}
          </>
        )}
        footerSummary={(rows) => (
          <span className="tnum">
            {fmtNumber(rows.reduce((a, r) => a + r.qtyOnHand, 0))} units ·{' '}
            {fmtCurrency(rows.reduce((a, r) => a + stockValue(r), 0), 'IDR', { compact: true })} in this view
          </span>
        )}
        toolbarLeft={
          lowLines.length > 0 ? (
            <Badge tone="warning" size="md">
              {lowLines.length} need reordering
            </Badge>
          ) : undefined
        }
        emptyTitle="No stock recorded"
        emptyDescription="Create a stock line against a warehouse and a master item."
        emptyAction={can('stock.create') ? <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
            <Plus /> New stock line
          </Button> : undefined}
      />

      <StockForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="stock line"
        items={deleting ? [`${itemOf(deleting)?.sku} at ${warehouseOf(deleting)?.code} · ${fmtNumber(deleting.qtyOnHand)} ${itemOf(deleting)?.uom}`] : []}
        destructiveNote="Deleting the line writes off the quantity it holds."
        onConfirm={() => {
          if (deleting) {
            removeStock([deleting.id])
            toast.push({ tone: 'success', title: 'Stock line deleted' })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
