import * as React from 'react'
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column, TableFilter } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtDateTime, fmtNumber } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { MOVEMENT_TYPES, movementTypeLabel, uomLabel } from '@/data/reference'
import type { StockMovement } from '@/data/types'

export function MovementsPage() {
  const store = useErp()
  const [types, setTypes] = React.useState<string[]>([])
  const [warehouses, setWarehouses] = React.useState<string[]>([])
  const [direction, setDirection] = React.useState<string[]>([])

  const itemOf = (id: string) => store.items.find((i) => i.id === id)
  const warehouseOf = (id: string) => store.warehouses.find((w) => w.id === id)

  const filters: TableFilter<StockMovement>[] = [
    {
      key: 'type',
      label: 'Movement',
      options: MOVEMENT_TYPES.map((t) => ({ value: t.value, label: t.label })),
      values: types,
      onChange: setTypes,
      match: (r, v) => v.includes(r.type),
    },
    {
      key: 'warehouse',
      label: 'Warehouse',
      options: store.warehouses.map((w) => ({ value: w.id, label: w.name })),
      values: warehouses,
      onChange: setWarehouses,
      match: (r, v) => v.includes(r.warehouseId),
    },
    {
      key: 'direction',
      label: 'Direction',
      options: [
        { value: 'IN', label: 'Into stock' },
        { value: 'OUT', label: 'Out of stock' },
      ],
      values: direction,
      onChange: setDirection,
      match: (r, v) => v.some((x) => (x === 'IN' ? r.qty > 0 : r.qty < 0)),
    },
  ]

  const columns: Column<StockMovement>[] = [
    {
      key: 'at',
      header: 'When',
      width: 'w-[160px]',
      pinned: true,
      sortable: true,
      sortValue: (r) => r.at,
      exportValue: (r) => r.at,
      cell: (r) => <span className="tnum text-fg-muted">{fmtDateTime(r.at)}</span>,
    },
    {
      key: 'type',
      header: 'Movement',
      width: 'w-[180px]',
      sortable: true,
      sortValue: (r) => r.type,
      exportValue: (r) => r.type,
      cell: (r) => (
        <Badge
          size="sm"
          tone={
            r.type === 'RECEIPT' || r.type === 'FG_PRODUCED' || r.type === 'TRANSFER_IN' ? 'success'
              : r.type === 'SCRAP' ? 'danger'
                : r.type === 'ADJUSTMENT' ? 'warning'
                  : r.qty < 0 ? 'info' : 'neutral'
          }
        >
          {movementTypeLabel(r.type)}
        </Badge>
      ),
    },
    {
      key: 'item',
      header: 'Item',
      width: 'min-w-[240px]',
      sortable: true,
      sortValue: (r) => itemOf(r.itemId)?.name ?? '',
      exportValue: (r) => itemOf(r.itemId)?.sku ?? '',
      cell: (r) => {
        const item = itemOf(r.itemId)
        return (
          <div className="min-w-0">
            <p className="truncate text-fg">{item?.name}</p>
            <p className="tnum truncate text-[11.5px] text-fg-muted">
              {item?.sku}
              {r.batchNo ? ` · batch ${r.batchNo}` : ''}
            </p>
          </div>
        )
      },
    },
    {
      key: 'qty',
      header: 'Quantity',
      align: 'right',
      width: 'w-[130px]',
      sortable: true,
      sortValue: (r) => r.qty,
      exportValue: (r) => r.qty,
      cell: (r) => (
        <span className={cn('tnum font-semibold', r.qty > 0 ? 'text-success' : r.qty < 0 ? 'text-danger' : 'text-fg-muted')}>
          {r.qty > 0 ? '+' : ''}
          {fmtNumber(r.qty, 2)} {uomLabel(r.uom)}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      width: 'w-[130px]',
      sortable: true,
      sortValue: (r) => Math.abs(r.qty * r.unitCost),
      exportValue: (r) => Math.round(r.qty * r.unitCost),
      cell: (r) => <span className="tnum text-fg-muted">{fmtCurrency(Math.abs(r.qty * r.unitCost), 'IDR', { compact: true })}</span>,
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      width: 'w-[190px]',
      sortable: true,
      sortValue: (r) => warehouseOf(r.warehouseId)?.name ?? '',
      exportValue: (r) => warehouseOf(r.warehouseId)?.code ?? '',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg-muted">{warehouseOf(r.warehouseId)?.name}</p>
          {r.binCode && <p className="tnum truncate text-[11px] text-fg-subtle">bin {r.binCode}</p>}
        </div>
      ),
    },
    {
      key: 'ref',
      header: 'Source',
      width: 'min-w-[190px]',
      sortable: true,
      sortValue: (r) => r.refCode,
      exportValue: (r) => `${r.refType} ${r.refCode}`,
      headerHint: 'What created this movement. Every quantity in the system traces back to one of these.',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium text-fg">{r.refCode}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.refType}</p>
        </div>
      ),
    },
    {
      key: 'project',
      header: 'Order',
      width: 'w-[130px]',
      exportValue: (r) => store.projects.find((p) => p.id === r.projectId)?.code ?? '',
      cell: (r) => {
        const p = store.projects.find((x) => x.id === r.projectId)
        if (!p) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <Link to={`/projects/${p.id}`} className="text-[12.5px] font-medium text-fg hover:text-primary">
            {p.code}
          </Link>
        )
      },
    },
    {
      key: 'actor',
      header: 'By',
      width: 'w-[150px]',
      defaultHidden: true,
      exportValue: (r) => r.actorName,
      cell: (r) => <span className="text-[12px] text-fg-muted">{r.actorName}</span>,
    },
    {
      key: 'note',
      header: 'Note',
      width: 'min-w-[240px]',
      defaultHidden: true,
      exportValue: (r) => r.note ?? '',
      cell: (r) => <span className="text-[12px] text-fg-muted">{r.note ?? '—'}</span>,
    },
  ]

  const inQty = store.movements.filter((m) => m.qty > 0)
  const outQty = store.movements.filter((m) => m.qty < 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Inventory</Badge>}
        title="Stock ledger"
        description="Every movement that ever made a balance. A goods receipt, an issue to a work order, a transfer between stores, a count adjustment, a piece scrapped at final inspection — each one is a row here, and the on-hand figure on every other screen is the sum of them."
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Movements" value={fmtNumber(store.movements.length)} sub="since the opening balance" icon={<BookOpen />} accent="primary" />
        <KpiCard
          label="Into stock"
          value={fmtCurrency(inQty.reduce((a, m) => a + m.qty * m.unitCost, 0), 'IDR', { compact: true })}
          sub={`${inQty.length} movements`}
          accent="success"
        />
        <KpiCard
          label="Out of stock"
          value={fmtCurrency(Math.abs(outQty.reduce((a, m) => a + m.qty * m.unitCost, 0)), 'IDR', { compact: true })}
          sub={`${outQty.length} movements`}
          accent="warning"
        />
        <KpiCard
          label="Scrapped"
          value={fmtCurrency(Math.abs(store.movements.filter((m) => m.type === 'SCRAP').reduce((a, m) => a + m.qty * m.unitCost, 0)), 'IDR', { compact: true })}
          sub="written off at inspection"
          accent="danger"
        />
      </div>

      <DataTable
        data={store.movements}
        columns={columns}
        filters={filters}
        getId={(r) => r.id}
        getLabel={(r) => `${r.refCode} · ${itemOf(r.itemId)?.sku ?? ''}`}
        entityLabel="movements"
        searchText={(r) => `${r.refCode} ${r.refType} ${itemOf(r.itemId)?.sku ?? ''} ${itemOf(r.itemId)?.name ?? ''} ${r.actorName} ${r.batchNo ?? ''} ${r.note ?? ''}`}
        onDelete={store.removeMovements}
        deleteNote="Deleting a movement changes a balance that a goods receipt or a work order created. In a real build the ledger is append-only."
        exportName="kriyanusa-stock-ledger"
        storageKey="movements"
        initialSort={{ key: 'at', dir: 'desc' }}
        compactByDefault
        pageSize={50}
        footerSummary={(rows) => (
          <span className="tnum">
            {rows.length} movements · net {fmtNumber(rows.reduce((a, r) => a + r.qty, 0), 2)} units ·{' '}
            {fmtCurrency(rows.reduce((a, r) => a + r.qty * r.unitCost, 0), 'IDR', { compact: true })}
          </span>
        )}
      />
    </div>
  )
}
