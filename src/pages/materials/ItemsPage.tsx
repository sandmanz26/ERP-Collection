import * as React from 'react'
import { Boxes, Ship, TriangleAlert } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { useMfg } from '@/store/useMfg'
import type { Item } from '@/data/types'
import { stockPosition } from '@/lib/mrp'
import { hsMeta, ITEM_TYPES, itemTypeLabel, lartasMeta } from '@/data/reference'
import { fmtCurrency, fmtNumber, fmtPercent } from '@/lib/format'

export function ItemsPage() {
  const { items, lots, kilnBatches, suppliers } = useMfg()
  const [type, setType] = React.useState<string[]>([])
  const [origin, setOrigin] = React.useState<string[]>([])
  const [lartas, setLartas] = React.useState<string[]>([])

  const imported = items.filter((i) => i.imported)
  const restricted = items.filter((i) => i.lartas !== 'NONE')
  const stockValue = lots.reduce((a, l) => a + l.quantity * l.unitCost, 0)

  const columns: Column<Item>[] = [
    {
      key: 'code', header: 'Item', width: 'min-w-[280px]', pinned: true, sortable: true, sortValue: (i) => i.code,
      cell: (i) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold text-fg">{i.name}</p>
          <p className="truncate font-mono text-[11px] text-fg-muted">
            {i.code}
            {i.species && ` · ${i.species}`}
          </p>
        </div>
      ),
      exportValue: (i) => i.code,
    },
    {
      key: 'type', header: 'Type', width: 'w-[160px]', sortable: true, sortValue: (i) => i.type,
      cell: (i) => (
        <Tooltip content={ITEM_TYPES.find((t) => t.value === i.type)?.hint ?? ''}>
          <span className="text-[12.5px] text-fg">{itemTypeLabel(i.type)}</span>
        </Tooltip>
      ),
      exportValue: (i) => i.type,
    },
    {
      key: 'origin', header: 'Origin', width: 'w-[190px]', sortable: true, sortValue: (i) => (i.imported ? 1 : 0),
      cell: (i) => {
        const sup = suppliers.find((sx) => sx.id === i.primarySupplierId)
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {i.imported ? <Badge tone="info" size="sm"><Ship className="size-3" /> imported</Badge> : <Badge tone="neutral" size="sm">local</Badge>}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-fg-muted">{sup?.name ?? '—'}</p>
          </div>
        )
      },
      exportValue: (i) => (i.imported ? 'imported' : 'local'),
    },
    {
      key: 'hs', header: 'HS & duty', width: 'w-[200px]',
      headerHint: 'Preferential rate applies only where a valid certificate of origin is presented',
      cell: (i) => {
        if (!i.imported) return <span className="text-[12px] text-fg-subtle">—</span>
        const meta = hsMeta(i.hsCode)
        return (
          <Tooltip content={meta?.description ?? ''}>
            <div>
              <p className="font-mono text-[11.5px] text-fg">{i.hsCode}</p>
              <p className="tnum text-[11px] text-fg-muted">
                MFN {i.dutyRateMfn}%
                {i.dutyRatePreferential !== undefined && (
                  <span className="text-success"> · {i.preferentialScheme} {i.dutyRatePreferential}%</span>
                )}
              </p>
            </div>
          </Tooltip>
        )
      },
      exportValue: (i) => i.hsCode,
    },
    {
      key: 'lartas', header: 'Restriction', width: 'w-[200px]', sortable: true, sortValue: (i) => i.lartas,
      cell: (i) => {
        if (i.lartas === 'NONE') return <span className="text-[12px] text-fg-subtle">none</span>
        const meta = lartasMeta(i.lartas)
        return (
          <Tooltip content={meta.hint}>
            <Badge tone="warning" size="sm">{meta.label}</Badge>
          </Tooltip>
        )
      },
      exportValue: (i) => i.lartas,
    },
    {
      key: 'lead', header: 'Lead time', align: 'right', width: 'w-[150px]', sortable: true,
      headerHint: 'Supplier days plus transit plus expected clearance plus inland — the number every promise rests on',
      sortValue: (i) => i.supplierLeadDays + i.transitDays + i.inlandDays,
      cell: (i) => {
        const total = i.supplierLeadDays + i.transitDays + i.inlandDays
        return (
          <Tooltip content={`${i.supplierLeadDays} at the supplier, ${i.transitDays} on the water, ${i.inlandDays} inland.`}>
            <div>
              <p className="tnum text-[12.5px] font-semibold text-fg">{total} days</p>
              {i.imported && <p className="tnum text-[10.5px] text-fg-muted">{i.supplierLeadDays}+{i.transitDays}+{i.inlandDays}</p>}
            </div>
          </Tooltip>
        )
      },
      exportValue: (i) => i.supplierLeadDays + i.transitDays + i.inlandDays,
    },
    {
      key: 'stock', header: 'Available', align: 'right', width: 'w-[140px]', sortable: true,
      sortValue: (i) => stockPosition(i.id, lots, kilnBatches).available,
      cell: (i) => {
        const pos = stockPosition(i.id, lots, kilnBatches)
        const low = pos.available < i.reorderPoint
        return (
          <div>
            <p className={`tnum text-[12.5px] ${low ? 'font-semibold text-danger' : 'text-fg'}`}>
              {fmtNumber(pos.available, pos.available < 10 ? 2 : 0)} <span className="text-[10.5px] text-fg-subtle">{i.uom}</span>
            </p>
            {pos.blocked > 0 && <p className="tnum text-[10.5px] text-warning">{fmtNumber(pos.blocked, 1)} blocked</p>}
          </div>
        )
      },
      exportValue: (i) => stockPosition(i.id, lots, kilnBatches).available,
    },
    {
      key: 'rop', header: 'ROP / safety', align: 'right', width: 'w-[130px]', defaultHidden: true,
      cell: (i) => (
        <span className="tnum text-[12px] text-fg-muted">
          {fmtNumber(i.reorderPoint)} / {fmtNumber(i.safetyStock)}
        </span>
      ),
      exportValue: (i) => i.reorderPoint,
    },
    {
      key: 'cost', header: 'Standard cost', align: 'right', width: 'w-[140px]', sortable: true, sortValue: (i) => i.standardCost,
      cell: (i) => (
        <div>
          <p className="tnum text-[12.5px]">{fmtCurrency(i.standardCost, 'IDR', { compact: true })}</p>
          <p className="text-[10.5px] text-fg-subtle">per {i.uom}</p>
        </div>
      ),
      exportValue: (i) => i.standardCost,
    },
    {
      key: 'value', header: 'Stock value', align: 'right', width: 'w-[140px]', sortable: true,
      sortValue: (i) => lots.filter((l) => l.itemId === i.id).reduce((a, l) => a + l.quantity * l.unitCost, 0),
      cell: (i) => {
        const v = lots.filter((l) => l.itemId === i.id).reduce((a, l) => a + l.quantity * l.unitCost, 0)
        return <span className="tnum text-[12.5px] font-semibold text-fg">{v ? fmtCurrency(v, 'IDR', { compact: true }) : '—'}</span>
      },
      exportValue: (i) => lots.filter((l) => l.itemId === i.id).reduce((a, l) => a + l.quantity * l.unitCost, 0),
    },
    {
      key: 'moisture', header: 'Moisture band', width: 'w-[140px]', defaultHidden: true,
      cell: (i) =>
        i.targetMoistureMin !== undefined ? (
          <span className="tnum text-[12px] text-fg-muted">{i.targetMoistureMin}–{i.targetMoistureMax}%</span>
        ) : (
          <span className="text-[12px] text-fg-subtle">n/a</span>
        ),
      exportValue: (i) => (i.targetMoistureMin !== undefined ? `${i.targetMoistureMin}-${i.targetMoistureMax}` : ''),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><Boxes className="size-3" /> Materials</Badge>}
        title="Item master"
        description="Every purchased material with its import identity attached: HS heading, the duty a certificate of origin is worth, the permit regime it falls under, and the lead time broken into the four things it is actually made of."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Items" value={fmtNumber(items.length)} icon={<Boxes />} accent="primary" sub={`${imported.length} imported`} />
        <KpiCard
          label="Under a restriction"
          value={fmtNumber(restricted.length)}
          icon={<TriangleAlert />}
          accent="warning"
          sub="DIPK, IP-B2 or mandatory SNI"
        />
        <KpiCard
          label="Longest lead time"
          value={`${Math.max(...items.map((i) => i.supplierLeadDays + i.transitDays + i.inlandDays))} days`}
          icon={<Ship />}
          accent="accent"
          sub={items.slice().sort((a, b) => (b.supplierLeadDays + b.transitDays + b.inlandDays) - (a.supplierLeadDays + a.transitDays + a.inlandDays))[0]?.code}
        />
        <KpiCard label="Stock at cost" value={fmtCurrency(stockValue, 'IDR', { compact: true })} icon={<Boxes />} accent="primary" sub={`${fmtPercent((imported.length / items.length) * 100, 0)} of the list is imported`} />
      </div>

      <DataTable
        data={items}
        columns={columns}
        getId={(i) => i.id}
        getLabel={(i) => i.name}
        entityLabel="item"
        exportName="items"
        storageKey="items"
        searchText={(i) => `${i.code} ${i.name} ${i.hsCode} ${i.species ?? ''} ${i.type}`}
        initialSort={{ key: 'value', dir: 'desc' }}
        compactByDefault
        pageSize={40}
        rowTone={(i) => (stockPosition(i.id, lots, kilnBatches).available < i.reorderPoint ? 'bg-warning-soft/25' : undefined)}
        filters={[
          {
            key: 'type', label: 'Type', values: type, onChange: setType,
            options: ITEM_TYPES.map((t) => ({ value: t.value, label: t.label })),
            match: (i, v) => v.includes(i.type),
          },
          {
            key: 'origin', label: 'Origin', values: origin, onChange: setOrigin,
            options: [{ value: 'IMPORTED', label: 'Imported' }, { value: 'LOCAL', label: 'Local' }],
            match: (i, v) => v.includes(i.imported ? 'IMPORTED' : 'LOCAL'),
          },
          {
            key: 'lartas', label: 'Restriction', values: lartas, onChange: setLartas,
            options: [
              { value: 'DIPK', label: 'Forestry (DIPK)' },
              { value: 'IP_B2', label: 'Hazardous (IP-B2)' },
              { value: 'SNI', label: 'Mandatory SNI' },
              { value: 'DIPK_AND_SNI', label: 'DIPK + SNI' },
              { value: 'NONE', label: 'Unrestricted' },
            ],
            match: (i, v) => v.includes(i.lartas),
          },
        ]}
      />
    </div>
  )
}
