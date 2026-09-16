import * as React from 'react'
import { Link } from 'react-router-dom'
import { Boxes, TriangleAlert } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column, TableFilter } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtNumber, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { useStock, useWarehouseLoads } from '@/hooks/useExceptions'
import { inventoryValue, slowMoving } from '@/lib/inventory'
import type { ItemPosition } from '@/lib/inventory'
import { ITEM_CATEGORIES, itemCategoryLabel, uomLabel } from '@/data/reference'

export function InventoryPage() {
  const store = useErp()
  const { rows, positions } = useStock()
  const loads = useWarehouseLoads()
  const [categories, setCategories] = React.useState<string[]>([])
  const [flags, setFlags] = React.useState<string[]>([])

  const live = positions.filter((p) => p.onHand !== 0 || p.item.reorderPoint > 0)
  const slow = slowMoving(positions, store.settings.slowMovingDays)
  const shortages = positions.filter((p) => p.belowReorder && p.onOrder <= 0)

  const filters: TableFilter<ItemPosition>[] = [
    {
      key: 'category',
      label: 'Category',
      options: ITEM_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
      values: categories,
      onChange: setCategories,
      match: (r, v) => v.includes(r.item.category),
    },
    {
      key: 'flags',
      label: 'Attention',
      options: [
        { value: 'REORDER', label: 'Below reorder point' },
        { value: 'NOTHING_ON_ORDER', label: 'Short with nothing on order' },
        { value: 'QUARANTINE', label: 'Something in quarantine' },
        { value: 'SLOW', label: 'Not moved in months' },
        { value: 'RESERVED', label: 'Reserved to an order' },
      ],
      values: flags,
      onChange: setFlags,
      match: (r, v) =>
        v.some((x) =>
          x === 'REORDER' ? r.belowReorder
            : x === 'NOTHING_ON_ORDER' ? r.belowReorder && r.onOrder <= 0
              : x === 'QUARANTINE' ? r.quarantined > 0
                : x === 'SLOW' ? r.daysSinceMovement >= store.settings.slowMovingDays && r.onHand > 0
                  : r.reserved > 0,
        ),
    },
  ]

  const perWarehouse = (itemId: string) =>
    rows
      .filter((r) => r.itemId === itemId && Math.abs(r.onHand) > 0.001)
      .map((r) => ({ warehouse: store.warehouses.find((w) => w.id === r.warehouseId), qty: r.onHand }))

  const columns: Column<ItemPosition>[] = [
    {
      key: 'item',
      header: 'Item',
      width: 'min-w-[236px]',
      pinned: true,
      tour: 'stock',
      sortable: true,
      sortValue: (r) => r.item.sku,
      exportValue: (r) => r.item.sku,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.item.name}</p>
          <p className="tnum truncate text-[11.5px] text-fg-muted">
            {r.item.sku} · {itemCategoryLabel(r.item.category)}
            {r.item.legalityControlled && <span className="ml-1.5 text-accent">legality controlled</span>}
          </p>
        </div>
      ),
    },
    {
      key: 'onHand',
      header: 'On hand',
      align: 'right',
      width: 'w-[120px]',
      sortable: true,
      sortValue: (r) => r.onHand,
      exportValue: (r) => r.onHand,
      cell: (r) => (
        <div className="text-right">
          <p className="tnum font-medium text-fg">{fmtNumber(r.onHand, r.item.uom === 'M3' ? 2 : 0)}</p>
          <p className="text-[11px] text-fg-muted">{uomLabel(r.item.uom)}</p>
        </div>
      ),
    },
    {
      key: 'available',
      header: 'Available',
      align: 'right',
      width: 'w-[140px]',
      sortable: true,
      sortValue: (r) => r.available,
      exportValue: (r) => r.available,
      headerHint: 'On hand, less what is in quarantine, less what is already reserved for an order.',
      cell: (r) => (
        <div className="text-right">
          <p className={cn('tnum font-semibold', r.available <= 0 ? 'text-danger' : r.belowReorder ? 'text-warning-soft-fg' : 'text-fg')}>
            {fmtNumber(r.available, r.item.uom === 'M3' ? 2 : 0)}
          </p>
          {(r.reserved > 0 || r.quarantined > 0) && (
            <p className="tnum text-[11px] text-fg-muted">
              {r.reserved > 0 && `${fmtNumber(r.reserved, 1)} reserved`}
              {r.reserved > 0 && r.quarantined > 0 && ' · '}
              {r.quarantined > 0 && `${fmtNumber(r.quarantined, 1)} quarantined`}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'where',
      header: 'Where it is',
      width: 'min-w-[196px]',
      exportValue: (r) => perWarehouse(r.item.id).map((w) => `${w.warehouse?.code}:${w.qty}`).join(' '),
      cell: (r) => {
        const spread = perWarehouse(r.item.id)
        if (!spread.length) return <span className="text-[12px] text-fg-subtle">nothing on hand</span>
        return (
          <div className="flex flex-wrap gap-1">
            {spread.map((w) => (
              <Tooltip key={w.warehouse?.id} content={`${w.warehouse?.name} — ${fmtNumber(w.qty, 2)} ${uomLabel(r.item.uom)}`}>
                <span>
                  <Badge size="sm" tone={w.warehouse?.type === 'QUARANTINE' ? 'danger' : w.warehouse?.type === 'SUBCON' ? 'purple' : 'neutral'}>
                    {w.warehouse?.code} {fmtNumber(w.qty, r.item.uom === 'M3' ? 1 : 0)}
                  </Badge>
                </span>
              </Tooltip>
            ))}
          </div>
        )
      },
    },
    {
      key: 'cover',
      header: 'Against reorder point',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => (r.item.reorderPoint ? r.available / r.item.reorderPoint : 99),
      exportValue: (r) => r.item.reorderPoint,
      headerHint: 'Available stock as a share of the point at which purchasing is supposed to act.',
      cell: (r) => {
        if (!r.item.reorderPoint) return <span className="text-[12px] text-fg-subtle">no reorder point</span>
        const pct = (r.available / r.item.reorderPoint) * 100
        return (
          <div>
            <UtilisationBar pct={Math.min(140, pct)} lowIsBad className="w-32" label={`${fmtNumber(r.item.reorderPoint)} point`} />
          </div>
        )
      },
    },
    {
      key: 'onOrder',
      header: 'On order',
      align: 'right',
      width: 'w-[110px]',
      sortable: true,
      sortValue: (r) => r.onOrder,
      exportValue: (r) => r.onOrder,
      cell: (r) =>
        r.onOrder > 0 ? (
          <span className="tnum text-accent-soft-fg">{fmtNumber(r.onOrder, 2)}</span>
        ) : r.belowReorder ? (
          <Badge size="sm" tone="danger">nothing</Badge>
        ) : (
          <span className="text-[12px] text-fg-subtle">—</span>
        ),
    },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      width: 'w-[140px]',
      sortable: true,
      sortValue: (r) => r.value,
      exportValue: (r) => Math.round(r.value),
      cell: (r) => (
        <div className="text-right">
          <p className="tnum font-medium text-fg">{fmtCurrency(r.value, 'IDR', { compact: true })}</p>
          <p className="tnum text-[11px] text-fg-muted">{fmtCurrency(r.item.standardCost, 'IDR', { compact: true })} each</p>
        </div>
      ),
    },
    {
      key: 'idle',
      header: 'Last moved',
      align: 'right',
      width: 'w-[120px]',
      sortable: true,
      sortValue: (r) => r.daysSinceMovement,
      exportValue: (r) => r.daysSinceMovement,
      cell: (r) =>
        r.daysSinceMovement > 9000 ? (
          <span className="text-[12px] text-fg-subtle">never</span>
        ) : (
          <span className={cn('tnum', r.daysSinceMovement >= store.settings.slowMovingDays ? 'text-warning-soft-fg' : 'text-fg-muted')}>
            {r.daysSinceMovement}d ago
          </span>
        ),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Inventory</Badge>}
        title="Stock on hand"
        description="There is no balance table in this system. Every quantity here is the sum of the movements that produced it, which is the only way a warehouse figure and a goods receipt can never disagree. Available is what is left once quarantine and other people's reservations are taken out."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Stock at cost" value={fmtCurrency(inventoryValue(rows), 'IDR', { compact: true })} sub={`${live.length} items with a position`} icon={<Boxes />} accent="primary" />
        <KpiCard
          label="Below reorder point"
          value={String(positions.filter((p) => p.belowReorder).length)}
          sub={`${shortages.length} with nothing on order`}
          icon={<TriangleAlert />}
          accent={shortages.length ? 'danger' : 'warning'}
        />
        <KpiCard
          label="In quarantine"
          value={fmtCurrency(rows.filter((r) => r.warehouseId === 'wh_qrn').reduce((a, r) => a + r.value, 0), 'IDR', { compact: true })}
          sub="rejected on arrival, still on the books"
          accent="danger"
        />
        <KpiCard
          label="Not moved in months"
          value={fmtCurrency(slow.reduce((a, p) => a + p.value, 0), 'IDR', { compact: true })}
          sub={`${slow.length} items idle over ${store.settings.slowMovingDays} days`}
          accent="warning"
        />
      </div>

      <Card className="mb-5">
        <CardHeader title="By warehouse" description="What is standing in each store, by volume and by value." />
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loads
            .filter((l) => l.warehouse.active)
            .map((l) => (
              <Link
                key={l.warehouse.id}
                to="/warehouses"
                className="rounded-lg border border-border bg-surface-sunken p-3 transition-colors hover:border-border-strong"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold text-fg">{l.warehouse.name}</p>
                    <p className="truncate text-[11px] text-fg-muted">{titleCase(l.warehouse.type)}</p>
                  </div>
                  <Badge size="sm" tone={l.utilisationPct > 92 ? 'danger' : 'neutral'}>{l.lines} lines</Badge>
                </div>
                <p className="tnum mt-2 text-[13px] font-semibold text-fg">{fmtCurrency(l.value, 'IDR', { compact: true })}</p>
                <UtilisationBar pct={l.utilisationPct} className="mt-1.5" label={`${fmtNumber(l.cbm, 1)} of ${fmtNumber(l.warehouse.capacityM3)} m³`} />
              </Link>
            ))}
        </CardBody>
      </Card>

      <DataTable
        data={live}
        columns={columns}
        filters={filters}
        getId={(r) => r.item.id}
        getLabel={(r) => r.item.name}
        entityLabel="stock lines"
        searchText={(r) => `${r.item.sku} ${r.item.name} ${r.item.category} ${r.item.species}`}
        exportName="kriyanusa-stock-on-hand"
        storageKey="inventory"
        initialSort={{ key: 'value', dir: 'desc' }}
        compactByDefault
        rowTone={(r) => (r.belowReorder && r.onOrder <= 0 ? 'bg-danger-soft/25' : r.belowReorder ? 'bg-warning-soft/25' : undefined)}
        footerSummary={(shown) => (
          <span className="tnum">
            {shown.length} items · {fmtCurrency(shown.reduce((a, r) => a + r.value, 0), 'IDR', { compact: true })} at cost
          </span>
        )}
      />
    </div>
  )
}
