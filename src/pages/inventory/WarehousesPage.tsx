import { Warehouse as WarehouseIcon } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { MetaRow } from '@/components/shared/status'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtNumber, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { useStock, useWarehouseLoads } from '@/hooks/useExceptions'
import { WAREHOUSE_TYPES, uomLabel, warehouseTypeLabel } from '@/data/reference'

export function WarehousesPage() {
  const store = useErp()
  const { rows } = useStock()
  const loads = useWarehouseLoads()

  const totalCbm = loads.reduce((a, l) => a + l.cbm, 0)
  const totalCap = store.warehouses.filter((w) => w.active).reduce((a, w) => a + w.capacityM3, 0)

  return (
    <div className="min-h-0">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Inventory</Badge>}
        title="Warehouses"
        description="Seven places stock can sit, and they are not interchangeable. Timber above twelve per cent moisture cannot leave the kiln store; material at a subcontractor is still ours and still our risk; and nothing in the quarantine bay is available to a work order no matter how badly the floor needs it."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Warehouses" value={String(store.warehouses.filter((w) => w.active).length)} sub={`${new Set(store.warehouses.map((w) => w.city)).size} locations`} icon={<WarehouseIcon />} accent="primary" />
        <KpiCard label="Volume standing" value={`${fmtNumber(totalCbm, 1)} m³`} sub={`of ${fmtNumber(totalCap)} m³ of capacity`} accent="accent" />
        <KpiCard label="Total value" value={fmtCurrency(loads.reduce((a, l) => a + l.value, 0), 'IDR', { compact: true })} sub="at moving average cost" accent="success" />
        <KpiCard
          label="Over 92% full"
          value={String(loads.filter((l) => l.utilisationPct > 92).length)}
          sub={loads.filter((l) => l.utilisationPct > 92).map((l) => l.warehouse.code).join(', ') || 'none'}
          accent={loads.some((l) => l.utilisationPct > 92) ? 'danger' : 'accent'}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {loads.map((l) => {
          const w = l.warehouse
          const contents = rows
            .filter((r) => r.warehouseId === w.id && Math.abs(r.onHand) > 0.001)
            .map((r) => ({ row: r, item: store.items.find((i) => i.id === r.itemId) }))
            .filter((x) => x.item)
            .sort((a, b) => b.row.value - a.row.value)
          const supplier = store.suppliers.find((s) => s.id === w.supplierId)

          return (
            <Card key={w.id} className={cn(w.type === 'QUARANTINE' && 'border-danger/35')}>
              <CardHeader
                icon={<WarehouseIcon />}
                title={
                  <span className="flex items-center gap-2">
                    {w.name}
                    <Badge size="sm" tone={w.type === 'QUARANTINE' ? 'danger' : w.type === 'SUBCON' ? 'purple' : 'neutral'}>
                      {w.code}
                    </Badge>
                  </span>
                }
                description={
                  <Tooltip content={WAREHOUSE_TYPES.find((t) => t.value === w.type)?.hint ?? ''}>
                    <span>{warehouseTypeLabel(w.type)} · {w.city}</span>
                  </Tooltip>
                }
                actions={<span className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(l.value, 'IDR', { compact: true })}</span>}
              />
              <CardBody className="space-y-3 pb-3">
                <UtilisationBar
                  pct={l.utilisationPct}
                  label={`${fmtNumber(l.cbm, 1)} of ${fmtNumber(w.capacityM3)} m³ · ${l.lines} stock lines`}
                />
                <div className="grid grid-cols-2 gap-x-4">
                  <MetaRow label="Manager">{w.managerName}</MetaRow>
                  <MetaRow label="Bins">{w.bins.length}</MetaRow>
                </div>
                {supplier && <MetaRow label="Held at">{supplier.name}</MetaRow>}
                {w.note && <p className="text-[12px] leading-relaxed text-fg-muted">{w.note}</p>}
              </CardBody>

              <div className="border-t border-border">
                <p className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
                  What is standing in it
                </p>
                <div className="scrollbar-thin max-h-[220px] divide-y divide-border overflow-y-auto">
                  {contents.length === 0 && (
                    <p className="px-5 py-8 text-center text-[12.5px] text-fg-muted">Empty.</p>
                  )}
                  {contents.slice(0, 12).map(({ row, item }) => (
                    <div key={`${row.itemId}-${row.warehouseId}`} className="flex items-center justify-between gap-3 px-5 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] text-fg">{item!.name}</p>
                        <p className="tnum truncate text-[11px] text-fg-muted">{item!.sku}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tnum text-[12.5px] font-medium text-fg">
                          {fmtNumber(row.onHand, item!.uom === 'M3' ? 2 : 0)} {uomLabel(item!.uom)}
                        </p>
                        <p className="tnum text-[11px] text-fg-muted">{fmtCurrency(row.value, 'IDR', { compact: true })}</p>
                      </div>
                    </div>
                  ))}
                  {contents.length > 12 && (
                    <p className="px-5 py-2.5 text-[11.5px] text-fg-subtle">
                      and {contents.length - 12} more lines
                    </p>
                  )}
                </div>
              </div>

              <CardBody className="border-t border-border">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">Bins</p>
                <div className="flex flex-wrap gap-1">
                  {w.bins.map((b) => (
                    <Tooltip key={b.code} content={`${b.description} · ${b.capacityM3} m³`}>
                      <span>
                        <Badge size="sm" tone="outline">{b.code}</Badge>
                      </span>
                    </Tooltip>
                  ))}
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>

      <p className="mt-4 text-[12px] leading-relaxed text-fg-subtle">
        Capacity here is volume, not value, because that is what actually runs out. A warehouse showing {titleCase('over ninety per cent')} is
        one where the next delivery gets stacked in the aisle, and stock stacked in an aisle is stock nobody can count.
      </p>
    </div>
  )
}
