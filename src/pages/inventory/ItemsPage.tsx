import * as React from 'react'
import { Package } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column, TableFilter } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { StatusBadge } from '@/components/shared/status'
import { fmtCurrency, fmtNumber, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { useStock } from '@/hooks/useExceptions'
import { ITEM_CATEGORIES, SPECIES, itemCategoryLabel, speciesLabel, uomLabel } from '@/data/reference'
import { RECIPES } from '@/data/bom'
import type { Item } from '@/data/types'

export function ItemsPage() {
  const store = useErp()
  const { positions } = useStock()
  const [categories, setCategories] = React.useState<string[]>([])
  const [species, setSpecies] = React.useState<string[]>([])
  const [legality, setLegality] = React.useState<string[]>([])

  const positionOf = (id: string) => positions.find((p) => p.item.id === id)
  const usedIn = (id: string) => RECIPES.filter((r) => r.lines.some((l) => l.itemId === id)).map((r) => r.model)

  const filters: TableFilter<Item>[] = [
    {
      key: 'category',
      label: 'Category',
      options: ITEM_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
      values: categories,
      onChange: setCategories,
      match: (r, v) => v.includes(r.category),
    },
    {
      key: 'species',
      label: 'Species',
      options: SPECIES.filter((s) => s.value !== 'NONE').map((s) => ({ value: s.value, label: s.label })),
      values: species,
      onChange: setSpecies,
      match: (r, v) => v.includes(r.species),
    },
    {
      key: 'legality',
      label: 'Legality',
      options: [
        { value: 'YES', label: 'Legality controlled' },
        { value: 'NO', label: 'Not controlled' },
      ],
      values: legality,
      onChange: setLegality,
      match: (r, v) => v.some((x) => (x === 'YES' ? r.legalityControlled : !r.legalityControlled)),
    },
  ]

  const columns: Column<Item>[] = [
    {
      key: 'sku',
      header: 'Item',
      width: 'min-w-[250px]',
      pinned: true,
      sortable: true,
      sortValue: (r) => r.sku,
      exportValue: (r) => r.sku,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.name}</p>
          <p className="tnum truncate text-[11.5px] text-fg-muted">{r.sku}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => r.category,
      exportValue: (r) => r.category,
      cell: (r) => (
        <Tooltip content={ITEM_CATEGORIES.find((c) => c.value === r.category)?.hint ?? ''}>
          <span><Badge size="sm" tone="neutral">{itemCategoryLabel(r.category)}</Badge></span>
        </Tooltip>
      ),
    },
    {
      key: 'species',
      header: 'Species',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => r.species,
      exportValue: (r) => r.species,
      cell: (r) =>
        r.species === 'NONE' ? (
          <span className="text-[12px] text-fg-subtle">—</span>
        ) : (
          <Tooltip content={SPECIES.find((s) => s.value === r.species)?.note ?? ''}>
            <span className="text-fg-muted">{speciesLabel(r.species)}</span>
          </Tooltip>
        ),
    },
    {
      key: 'uom',
      header: 'Unit',
      width: 'w-[90px]',
      exportValue: (r) => r.uom,
      cell: (r) => <span className="text-fg-muted">{uomLabel(r.uom)}</span>,
    },
    {
      key: 'cost',
      header: 'Standard cost',
      align: 'right',
      width: 'w-[140px]',
      sortable: true,
      sortValue: (r) => r.standardCost,
      exportValue: (r) => r.standardCost,
      cell: (r) => <span className="tnum font-medium">{fmtCurrency(r.standardCost, 'IDR', { compact: true })}</span>,
    },
    {
      key: 'stock',
      header: 'Available',
      align: 'right',
      width: 'w-[130px]',
      sortable: true,
      sortValue: (r) => positionOf(r.id)?.available ?? 0,
      exportValue: (r) => positionOf(r.id)?.available ?? 0,
      cell: (r) => {
        const p = positionOf(r.id)
        if (!p) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <span className={`tnum ${p.belowReorder ? 'font-semibold text-warning-soft-fg' : 'text-fg'}`}>
            {fmtNumber(p.available, r.uom === 'M3' ? 2 : 0)}
          </span>
        )
      },
    },
    {
      key: 'levels',
      header: 'Min / reorder / max',
      align: 'right',
      width: 'w-[170px]',
      exportValue: (r) => `${r.minStock}/${r.reorderPoint}/${r.maxStock}`,
      cell: (r) => (
        <span className="tnum text-[12px] text-fg-muted">
          {fmtNumber(r.minStock)} · {fmtNumber(r.reorderPoint)} · {fmtNumber(r.maxStock)}
        </span>
      ),
    },
    {
      key: 'lead',
      header: 'Lead time',
      align: 'right',
      width: 'w-[100px]',
      sortable: true,
      sortValue: (r) => r.leadTimeDays,
      exportValue: (r) => r.leadTimeDays,
      cell: (r) => <span className="tnum text-fg-muted">{r.leadTimeDays}d</span>,
    },
    {
      key: 'supplier',
      header: 'Default supplier',
      width: 'min-w-[190px]',
      exportValue: (r) => store.suppliers.find((s) => s.id === r.defaultSupplierId)?.name ?? '',
      cell: (r) => (
        <span className="truncate text-[12px] text-fg-muted">
          {store.suppliers.find((s) => s.id === r.defaultSupplierId)?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'usedIn',
      header: 'Used in',
      width: 'min-w-[170px]',
      headerHint: 'Which models this item appears in, straight from the bill of materials.',
      exportValue: (r) => usedIn(r.id).join(' '),
      cell: (r) => {
        const models = usedIn(r.id)
        if (!models.length) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <Tooltip content={models.join(' · ')}>
            <span><Badge size="sm" tone="accent">{models.length} model{models.length > 1 ? 's' : ''}</Badge></span>
          </Tooltip>
        )
      },
    },
    {
      key: 'cbm',
      header: 'm³ each',
      align: 'right',
      width: 'w-[100px]',
      defaultHidden: true,
      exportValue: (r) => r.cbmPerUnit,
      cell: (r) => <span className="tnum text-fg-muted">{r.cbmPerUnit ? fmtNumber(r.cbmPerUnit, 3) : '—'}</span>,
    },
    {
      key: 'hs',
      header: 'HS code',
      width: 'w-[120px]',
      defaultHidden: true,
      exportValue: (r) => r.hsCode ?? '',
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{r.hsCode ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[110px]',
      defaultHidden: true,
      exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
  ]

  const controlled = store.items.filter((i) => i.legalityControlled)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Inventory</Badge>}
        title="Item master"
        description="Everything the factory buys, makes or ships. The legality flag is the one that matters most: a controlled item cannot enter a finished piece unless the batch it came from carries a supplier legality reference all the way back to the forest."
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Items" value={String(store.items.length)} sub={`${new Set(store.items.map((i) => i.category)).size} categories`} icon={<Package />} accent="primary" />
        <KpiCard label="Legality controlled" value={String(controlled.length)} sub="timber, panel and components" accent="accent" />
        <KpiCard label="Finished goods" value={String(store.items.filter((i) => i.category === 'FINISHED_GOOD').length)} sub="models with an HS code" accent="accent" />
        <KpiCard
          label="Below reorder point"
          value={String(positions.filter((p) => p.belowReorder).length)}
          sub="see stock on hand for the detail"
          accent={positions.some((p) => p.belowReorder && p.onOrder <= 0) ? 'danger' : 'warning'}
        />
      </div>

      <DataTable
        data={store.items}
        columns={columns}
        filters={filters}
        getId={(r) => r.id}
        getLabel={(r) => r.name}
        entityLabel="items"
        searchText={(r) => `${r.sku} ${r.name} ${r.category} ${r.species} ${r.grade ?? ''} ${r.hsCode ?? ''}`}
        onDelete={store.removeItems}
        cascadeWarning={(rows) =>
          rows
            .map((r) => {
              const models = usedIn(r.id)
              return models.length ? `${r.sku} is in the bill of materials for ${models.join(', ')}` : ''
            })
            .filter(Boolean)
        }
        exportName="kriyanusa-items"
        storageKey="items"
        initialSort={{ key: 'sku', dir: 'asc' }}
        compactByDefault
        importFields={[
          { key: 'sku', label: 'SKU', required: true },
          { key: 'name', label: 'Name', required: true },
          { key: 'standardCost', label: 'Standard cost' },
        ]}
        onImport={(rows) =>
          store.importItems(
            rows.map((r, i) => ({
              ...store.items[0],
              id: `imp_i_${Date.now()}_${i}`,
              sku: r.sku,
              name: r.name,
              standardCost: Number(r.standardCost ?? 0),
            })) as Item[],
          )
        }
        footerSummary={(rows) => <span className="tnum">{rows.length} items · {titleCase('item master')}</span>}
      />
    </div>
  )
}
