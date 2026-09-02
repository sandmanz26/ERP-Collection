import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Boxes, Layers, Package, Pencil, Plus, Trash2 } from 'lucide-react'
import type { InventoryItem } from '@/data/types'
import { ITEM_CATEGORIES, SERVICE_TYPES, SUPPLIERS, UOMS, itemCategoryLabel, serviceLabel } from '@/data/reference'
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
import { ItemForm } from './ItemForm'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import { uid } from '@/lib/utils'
import { itemTotals } from '@/lib/domain'

export function ItemsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const { items, stock, positions, removeItems, importItems } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<InventoryItem | null>(null)
  const [deleting, setDeleting] = React.useState<InventoryItem | null>(null)
  const [category, setCategory] = React.useState<string[]>([])
  const [service, setService] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<string[]>([])
  const [handling, setHandling] = React.useState<string[]>([])

  const totalsOf = (i: InventoryItem) => itemTotals(i.id, stock)
  const issuedBy = (i: InventoryItem) => positions.filter((p) => p.standardIssue.some((s) => s.sku === i.sku))
  const belowMin = items.filter((i) => i.status === 'ACTIVE' && totalsOf(i).available < i.minStock)
  const stockValueTotal = items.reduce((a, i) => a + totalsOf(i).value, 0)

  const columns: Column<InventoryItem>[] = [
    {
      key: 'sku', header: 'SKU', width: 'w-[136px]', pinned: true, sortable: true,
      sortValue: (r) => r.sku, exportValue: (r) => r.sku,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.sku}</span>,
    },
    {
      key: 'name', header: 'Item', width: 'w-[270px] max-w-[270px]', sortable: true,
      sortValue: (r) => r.name, exportValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.name}</p>
          <p className="truncate text-[11.5px] text-fg-muted">
            {[r.brand, r.variant, r.subCategory].filter(Boolean).join(' · ') || r.description || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'category', header: 'Category', width: 'w-[164px]', sortable: true,
      sortValue: (r) => r.category, exportValue: (r) => r.category,
      cell: (r) => <Badge tone="outline" size="sm">{itemCategoryLabel(r.category)}</Badge>,
    },
    {
      key: 'uom', header: 'UoM', width: 'w-[84px]', sortable: true,
      sortValue: (r) => r.uom, exportValue: (r) => r.uom,
      cell: (r) => <span className="text-[12px] font-medium text-fg-muted">{r.uom}</span>,
    },
    {
      key: 'cost', header: 'Standard cost', width: 'w-[142px]', align: 'right', sortable: true,
      sortValue: (r) => r.standardCost, exportValue: (r) => r.standardCost,
      cell: (r) => <span className="tnum text-[12.5px] text-fg">{fmtCurrency(r.standardCost, 'IDR')}</span>,
    },
    {
      key: 'onHand', header: 'On hand', width: 'w-[126px]', align: 'right', sortable: true,
      sortValue: (r) => totalsOf(r).onHand, exportValue: (r) => totalsOf(r).onHand,
      headerHint: 'Summed across every warehouse',
      cell: (r) => {
        const t = totalsOf(r)
        return (
          <div className="text-right">
            <p className="tnum text-[12.5px] font-medium text-fg">{fmtNumber(t.onHand)}</p>
            <p className="tnum text-[11px] text-fg-subtle">{t.warehouses} warehouse{t.warehouses === 1 ? '' : 's'}</p>
          </div>
        )
      },
    },
    {
      key: 'available', header: 'Available', width: 'w-[132px]', align: 'right', sortable: true,
      sortValue: (r) => totalsOf(r).available, exportValue: (r) => totalsOf(r).available,
      cell: (r) => {
        const t = totalsOf(r)
        const low = r.status === 'ACTIVE' && t.available < r.minStock
        return (
          <div className="text-right">
            <p className={`tnum text-[12.5px] font-medium ${low ? 'text-danger' : 'text-fg'}`}>{fmtNumber(t.available)}</p>
            <p className="tnum text-[11px] text-fg-subtle">{fmtNumber(t.reserved)} reserved</p>
          </div>
        )
      },
    },
    {
      key: 'levels', header: 'Min / max', width: 'w-[128px]', align: 'right', sortable: true,
      sortValue: (r) => r.minStock, exportValue: (r) => `${r.minStock}/${r.maxStock}`,
      cell: (r) => (
        <span className="tnum text-[12px] text-fg-muted">
          {fmtNumber(r.minStock)} / {fmtNumber(r.maxStock)}
        </span>
      ),
    },
    {
      key: 'reorder', header: 'Reorder', width: 'w-[142px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.reorderPoint, exportValue: (r) => `${r.reorderPoint} → ${r.reorderQty}`,
      cell: (r) => (
        <span className="tnum text-[12px] text-fg-muted">
          at {fmtNumber(r.reorderPoint)} order {fmtNumber(r.reorderQty)}
        </span>
      ),
    },
    {
      key: 'value', header: 'Stock value', width: 'w-[146px]', align: 'right', sortable: true,
      sortValue: (r) => totalsOf(r).value, exportValue: (r) => Math.round(totalsOf(r).value),
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtCurrency(totalsOf(r).value, 'IDR', { compact: true })}</span>,
    },
    {
      key: 'service', header: 'Service lines', width: 'w-[166px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.serviceTypes.join(','), exportValue: (r) => r.serviceTypes.join(' | '),
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.serviceTypes.slice(0, 2).map((s) => (
            <Badge key={s} tone="neutral" size="sm">{serviceLabel(s)}</Badge>
          ))}
          {r.serviceTypes.length > 2 && <Badge tone="neutral" size="sm">+{r.serviceTypes.length - 2}</Badge>}
        </div>
      ),
    },
    {
      key: 'issue', header: 'Issued to', width: 'w-[136px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => issuedBy(r).length,
      exportValue: (r) => issuedBy(r).map((p) => p.code).join(' | '),
      cell: (r) => {
        const list = issuedBy(r)
        if (!list.length) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <Tooltip content={list.map((p) => p.name).join(', ')}>
            <span className="tnum text-[12px] text-fg-muted">{list.length} position{list.length === 1 ? '' : 's'}</span>
          </Tooltip>
        )
      },
    },
    {
      key: 'handling', header: 'Handling', width: 'w-[150px]', sortable: true, defaultHidden: true,
      sortValue: (r) => `${r.hazardous ? 'a' : 'z'}${r.hasExpiry ? 'a' : 'z'}`,
      exportValue: (r) => [r.trackBatch ? 'batch' : '', r.hasExpiry ? 'expiry' : '', r.hazardous ? 'hazardous' : ''].filter(Boolean).join(' | '),
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.trackBatch && <Badge tone="neutral" size="sm">Batch</Badge>}
          {r.hasExpiry && <Badge tone="purple" size="sm">Expiry</Badge>}
          {r.hazardous && <Badge tone="warning" size="sm">Hazardous</Badge>}
          {!r.trackBatch && !r.hasExpiry && !r.hazardous && <span className="text-[12px] text-fg-subtle">Standard</span>}
        </div>
      ),
    },
    {
      key: 'supplier', header: 'Supplier', width: 'w-[190px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.defaultSupplier ?? '', exportValue: (r) => r.defaultSupplier ?? '',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg-muted">{r.defaultSupplier || '—'}</p>
          <p className="tnum text-[11px] text-fg-subtle">{r.leadTimeDays} day lead time</p>
        </div>
      ),
    },
    {
      key: 'updated', header: 'Last updated', width: 'w-[150px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.updatedAt, exportValue: (r) => r.updatedAt.slice(0, 10),
      cell: (r) => (
        <div className="min-w-0">
          <p className="tnum text-[12px] text-fg-muted">{fmtDate(r.updatedAt)}</p>
          <p className="truncate text-[11px] text-fg-subtle">{r.updatedBy}</p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', width: 'w-[132px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
  ]

  return (
    <>
      <PageHeader
        title="Item Master"
        description="Every item the company buys, defined once: SKU, unit, cost, planning levels and how it has to be handled. Quantities live in warehouse stock."
        actions={
          <>
            <Button variant="secondary" onClick={() => nav('/inventory/stock')}>
              <Boxes /> Open stock
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus /> New item
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Master items"
          value={items.length}
          icon={<Package />}
          accent="primary"
          sub={`${items.filter((i) => i.status === 'ACTIVE').length} active · ${items.filter((i) => i.status === 'DISCONTINUED').length} discontinued`}
        />
        <KpiCard label="Categories" value={new Set(items.map((i) => i.category)).size} icon={<Layers />} accent="accent" sub={`${new Set(items.map((i) => i.defaultSupplier).filter(Boolean)).size} suppliers`} />
        <KpiCard label="Stock value" value={fmtCurrency(stockValueTotal, 'IDR', { compact: true })} icon={<Boxes />} accent="purple" sub="held against these definitions" />
        <KpiCard
          label="Below minimum"
          value={belowMin.length}
          icon={<AlertTriangle />}
          accent={belowMin.length ? 'warning' : 'success'}
          sub={belowMin.length ? belowMin.slice(0, 2).map((i) => i.sku).join(', ') + (belowMin.length > 2 ? '…' : '') : 'every item is above its floor'}
        />
      </div>

      <DataTable
        data={items}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.sku} — ${r.name}`}
        entityLabel="item"
        storageKey="items"
        exportName="tata-gemilang-item-master"
        searchText={(r) => [r.sku, r.name, r.description, r.brand, r.variant, r.subCategory, r.barcode, r.defaultSupplier, itemCategoryLabel(r.category)].filter(Boolean).join(' ')}
        initialSort={{ key: 'sku', dir: 'asc' }}
        onRowClick={(r) => {
          setEditing(r)
          setFormOpen(true)
        }}
        rowTone={(r) => (r.status === 'DISCONTINUED' ? 'bg-bg-muted/60' : undefined)}
        pageSize={50}
        filters={[
          {
            key: 'category', label: 'Category', values: category, onChange: setCategory,
            options: ITEM_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
            match: (r, v) => v.includes(r.category),
          },
          {
            key: 'service', label: 'Service line', values: service, onChange: setService,
            options: SERVICE_TYPES.map((s) => ({ value: s.value, label: s.label })),
            match: (r, v) => r.serviceTypes.some((s) => v.includes(s)),
          },
          {
            key: 'handling', label: 'Handling', values: handling, onChange: setHandling,
            options: [
              { value: 'BATCH', label: 'Batch tracked' },
              { value: 'EXPIRY', label: 'Has expiry' },
              { value: 'HAZARDOUS', label: 'Hazardous' },
            ],
            match: (r, v) =>
              (v.includes('BATCH') && r.trackBatch) || (v.includes('EXPIRY') && r.hasExpiry) || (v.includes('HAZARDOUS') && r.hazardous),
          },
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: [
              { value: 'ACTIVE', label: 'Active' },
              { value: 'DISCONTINUED', label: 'Discontinued' },
            ],
            match: (r, v) => v.includes(r.status),
          },
        ]}
        onDelete={(ids) => {
          removeItems(ids)
          toast.push({ tone: 'success', title: `${ids.length} item${ids.length === 1 ? '' : 's'} deleted` })
        }}
        cascadeWarning={(rows) => {
          const lines = stock.filter((s) => rows.some((r) => r.id === s.itemId))
          const issue = positions.filter((p) => p.standardIssue.some((s) => rows.some((r) => r.sku === s.sku)))
          const warnings: string[] = []
          if (lines.length) warnings.push(`${lines.length} warehouse stock lines point at these items and are deleted with them`)
          if (issue.length) warnings.push(`${issue.length} positions issue them as standard kit and will reference a missing SKU`)
          return warnings
        }}
        deleteNote="Warehouse stock exists only against a master item, so its lines go too."
        importFields={[
          { key: 'sku', label: 'SKU', required: true, hint: 'e.g. ITM-UNI-0015' },
          { key: 'name', label: 'Item name', required: true },
          { key: 'category', label: 'Category', hint: 'UNIFORM / PPE / CLEANING_CHEMICAL …' },
          { key: 'subCategory', label: 'Sub-category' },
          { key: 'uom', label: 'Unit of measure', hint: 'PCS / SET / BOX / LITER …' },
          { key: 'brand', label: 'Brand' },
          { key: 'variant', label: 'Variant' },
          { key: 'barcode', label: 'Barcode' },
          { key: 'standardCost', label: 'Standard cost (IDR)', required: true },
          { key: 'minStock', label: 'Minimum stock' },
          { key: 'maxStock', label: 'Maximum stock' },
          { key: 'reorderPoint', label: 'Reorder point' },
          { key: 'reorderQty', label: 'Reorder quantity' },
          { key: 'leadTimeDays', label: 'Lead time (days)' },
          { key: 'defaultSupplier', label: 'Default supplier' },
          { key: 'serviceTypes', label: 'Service lines', hint: 'separated by |' },
          { key: 'trackBatch', label: 'Track batch', hint: 'yes / no' },
          { key: 'hasExpiry', label: 'Has expiry', hint: 'yes / no' },
          { key: 'hazardous', label: 'Hazardous', hint: 'yes / no' },
        ]}
        importSample={{
          sku: 'ITM-UNI-0015', name: 'Rompi Supervisor', category: 'UNIFORM', subCategory: 'Atribut', uom: 'PCS',
          brand: 'Sandang Mandiri', variant: 'Abu-abu, M–XL', barcode: '8991002110099', standardCost: '175000',
          minStock: '20', maxStock: '160', reorderPoint: '40', reorderQty: '80', leadTimeDays: '21',
          defaultSupplier: 'CV Sandang Mandiri', serviceTypes: 'SECURITY|CLEANING', trackBatch: 'no',
          hasExpiry: 'no', hazardous: 'no',
        }}
        toImportRow={(r) => ({
          sku: r.sku, name: r.name, category: r.category, subCategory: r.subCategory ?? '', uom: r.uom,
          brand: r.brand ?? '', variant: r.variant ?? '', barcode: r.barcode ?? '', standardCost: r.standardCost,
          minStock: r.minStock, maxStock: r.maxStock, reorderPoint: r.reorderPoint, reorderQty: r.reorderQty,
          leadTimeDays: r.leadTimeDays, defaultSupplier: r.defaultSupplier ?? '', serviceTypes: r.serviceTypes.join('|'),
          trackBatch: r.trackBatch ? 'yes' : 'no', hasExpiry: r.hasExpiry ? 'yes' : 'no', hazardous: r.hazardous ? 'yes' : 'no',
        })}
        onImport={(rows) => {
          const yes = (v: string) => ['yes', 'true', '1', 'y'].includes((v ?? '').toLowerCase())
          const mapped: InventoryItem[] = rows.map((row) => {
            const existing = items.find((i) => i.sku === row.sku)
            const now = new Date().toISOString()
            return {
              ...(existing ?? {}),
              id: existing?.id ?? uid('itm'),
              sku: row.sku,
              name: row.name,
              category: (ITEM_CATEGORIES.some((c) => c.value === row.category) ? row.category : 'CONSUMABLE') as InventoryItem['category'],
              subCategory: row.subCategory || undefined,
              uom: (UOMS.some((u) => u.value === row.uom) ? row.uom : 'PCS') as InventoryItem['uom'],
              brand: row.brand || undefined,
              variant: row.variant || undefined,
              barcode: row.barcode || undefined,
              standardCost: Number(row.standardCost) || 0,
              minStock: Number(row.minStock) || 0,
              maxStock: Number(row.maxStock) || 0,
              reorderPoint: Number(row.reorderPoint) || 0,
              reorderQty: Number(row.reorderQty) || 0,
              leadTimeDays: Number(row.leadTimeDays) || 14,
              defaultSupplier: row.defaultSupplier || undefined,
              serviceTypes: row.serviceTypes
                ? (row.serviceTypes.split('|').map((s) => s.trim()).filter((s) => SERVICE_TYPES.some((x) => x.value === s)) as InventoryItem['serviceTypes'])
                : existing?.serviceTypes ?? ['CLEANING'],
              trackBatch: row.trackBatch !== undefined ? yes(row.trackBatch) : existing?.trackBatch ?? false,
              hasExpiry: row.hasExpiry !== undefined ? yes(row.hasExpiry) : existing?.hasExpiry ?? false,
              hazardous: row.hazardous !== undefined ? yes(row.hazardous) : existing?.hazardous ?? false,
              status: existing?.status ?? 'ACTIVE',
              createdAt: existing?.createdAt ?? now,
              updatedAt: now,
              updatedBy: existing?.updatedBy ?? 'Import',
            } as InventoryItem
          })
          importItems(mapped)
          toast.push({
            tone: 'success',
            title: `${mapped.length} item${mapped.length === 1 ? '' : 's'} imported`,
            description: 'Rows whose SKU already existed were updated in place.',
          })
        }}
        rowActions={(r) => (
          <>
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
            <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}>
                <Trash2 />
              </Button>
            </Tooltip>
          </>
        )}
        footerSummary={(rows) => (
          <span className="tnum">{fmtCurrency(rows.reduce((a, r) => a + totalsOf(r).value, 0), 'IDR', { compact: true })} of stock in this view</span>
        )}
        toolbarLeft={<Badge tone="outline" size="md">{SUPPLIERS.length} approved suppliers</Badge>}
        emptyTitle="No items yet"
        emptyDescription="Define an item before recording any stock against it."
      />

      <ItemForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="item"
        items={deleting ? [`${deleting.sku} — ${deleting.name}`] : []}
        cascade={
          deleting
            ? (() => {
                const lines = stock.filter((s) => s.itemId === deleting.id)
                const list: string[] = []
                if (lines.length) list.push(`${lines.length} warehouse stock lines holding ${fmtNumber(lines.reduce((a, s) => a + s.qtyOnHand, 0))} ${deleting.uom}`)
                const issue = issuedBy(deleting)
                if (issue.length) list.push(`${issue.length} positions issue it as standard kit`)
                return list
              })()
            : []
        }
        onConfirm={() => {
          if (deleting) {
            removeItems([deleting.id])
            toast.push({ tone: 'success', title: 'Item deleted', description: deleting.sku })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
