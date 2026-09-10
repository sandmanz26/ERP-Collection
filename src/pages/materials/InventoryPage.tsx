import * as React from 'react'
import { ArrowDownUp, Boxes, TriangleAlert } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { useMfg } from '@/store/useMfg'
import type { Lot, StockMovement } from '@/data/types'
import { kilnGate } from '@/lib/production'
import { inventoryValue } from '@/lib/analytics'
import { countryFlag, itemTypeLabel, WAREHOUSE_KINDS } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtDateTime, fmtNumber, fmtPercent } from '@/lib/format'

export function InventoryPage() {
  const s = useMfg()
  const [tab, setTab] = React.useState<'lots' | 'movements'>('lots')
  const [status, setStatus] = React.useState<string[]>([])
  const [wh, setWh] = React.useState<string[]>([])
  const [kind, setKind] = React.useState<string[]>([])

  const value = inventoryValue(s.lots, s.items)
  const blocked = s.lots.filter((l) => l.status !== 'AVAILABLE' && l.status !== 'CONSUMED')
  const provisional = s.lots.filter((l) => l.costIsProvisional)

  const lotColumns: Column<Lot>[] = [
    {
      key: 'code', header: 'Lot', width: 'min-w-[220px]', pinned: true, sortable: true, sortValue: (l) => l.code,
      cell: (l) => {
        const item = s.items.find((i) => i.id === l.itemId)
        return (
          <div className="min-w-0">
            <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{l.code}</p>
            <p className="truncate text-[11.5px] text-fg-muted">{item?.name}</p>
          </div>
        )
      },
      exportValue: (l) => l.code,
    },
    {
      key: 'type', header: 'Type', width: 'w-[150px]',
      cell: (l) => <span className="text-[12.5px] text-fg-muted">{itemTypeLabel(s.items.find((i) => i.id === l.itemId)?.type ?? 'CONSUMABLE')}</span>,
      exportValue: (l) => s.items.find((i) => i.id === l.itemId)?.type ?? '',
    },
    {
      key: 'warehouse', header: 'Where', width: 'w-[190px]', sortable: true, sortValue: (l) => l.warehouseId,
      cell: (l) => {
        const w = s.warehouses.find((x) => x.id === l.warehouseId)
        return (
          <Tooltip content={WAREHOUSE_KINDS.find((k) => k.value === w?.kind)?.hint ?? ''}>
            <span className="text-[12.5px] text-fg">{w?.name}</span>
          </Tooltip>
        )
      },
      exportValue: (l) => s.warehouses.find((x) => x.id === l.warehouseId)?.code ?? '',
    },
    {
      key: 'qty', header: 'Quantity', align: 'right', width: 'w-[130px]', sortable: true, sortValue: (l) => l.quantity,
      cell: (l) => {
        const item = s.items.find((i) => i.id === l.itemId)
        return (
          <div>
            <p className="tnum text-[12.5px] font-semibold text-fg">
              {fmtNumber(l.quantity, l.quantity < 10 ? 2 : 0)} <span className="text-[10.5px] font-normal text-fg-subtle">{item?.uom}</span>
            </p>
            {l.reserved > 0 && <p className="tnum text-[10.5px] text-fg-muted">{fmtNumber(l.reserved)} reserved</p>}
          </div>
        )
      },
      exportValue: (l) => l.quantity,
    },
    {
      key: 'status', header: 'Status', width: 'w-[160px]', sortable: true, sortValue: (l) => l.status,
      cell: (l) => <StatusBadge value={l.status} size="sm" />,
      exportValue: (l) => l.status,
    },
    {
      key: 'gate', header: 'Why it is blocked', width: 'min-w-[330px]',
      cell: (l) => {
        const item = s.items.find((i) => i.id === l.itemId)
        if (l.status === 'AVAILABLE') return <span className="text-[12px] text-success">Available to issue</span>
        if (item?.type === 'SOLID_TIMBER') {
          const gate = kilnGate(l, s.kilnBatches, item)
          return <p className="text-[12px] leading-relaxed text-danger">{gate.message}</p>
        }
        return <p className="text-[12px] leading-relaxed text-warning">{l.note ?? 'Held pending a disposition.'}</p>
      },
      exportValue: (l) => l.status,
    },
    {
      key: 'origin', header: 'Traceability', width: 'w-[210px]',
      headerHint: 'What an export customer’s compliance desk asks for by name',
      cell: (l) => (
        <div className="min-w-0">
          {l.originCountry && (
            <p className="truncate text-[12px] text-fg">
              {countryFlag(l.originCountry)} {l.species ?? s.suppliers.find((x) => x.id === l.supplierId)?.name}
            </p>
          )}
          {l.shipmentId && (
            <p className="truncate font-mono text-[10.5px] text-fg-muted">
              {s.shipments.find((x) => x.id === l.shipmentId)?.code}
            </p>
          )}
          {!l.originCountry && <span className="text-[12px] text-fg-subtle">—</span>}
        </div>
      ),
      exportValue: (l) => `${l.originCountry ?? ''} ${l.species ?? ''}`,
    },
    {
      key: 'mc', header: 'Moisture', align: 'right', width: 'w-[110px]',
      cell: (l) => {
        if (l.moisturePercent === undefined) return <span className="text-[12px] text-fg-subtle">—</span>
        const item = s.items.find((i) => i.id === l.itemId)
        const inBand = item?.targetMoistureMin !== undefined
          && l.moisturePercent >= item.targetMoistureMin
          && l.moisturePercent <= (item.targetMoistureMax ?? 99)
        return <span className={`tnum text-[12.5px] font-semibold ${inBand ? 'text-success' : 'text-danger'}`}>{l.moisturePercent}%</span>
      },
      exportValue: (l) => l.moisturePercent ?? '',
    },
    {
      key: 'cost', header: 'Unit cost', align: 'right', width: 'w-[140px]', sortable: true, sortValue: (l) => l.unitCost,
      cell: (l) => (
        <div>
          <p className="tnum text-[12.5px]">{fmtCurrency(l.unitCost, 'IDR', { compact: true })}</p>
          {l.costIsProvisional && <Badge tone="warning" size="sm">provisional</Badge>}
        </div>
      ),
      exportValue: (l) => l.unitCost,
    },
    {
      key: 'value', header: 'Value', align: 'right', width: 'w-[140px]', sortable: true, sortValue: (l) => l.quantity * l.unitCost,
      cell: (l) => <span className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(l.quantity * l.unitCost, 'IDR', { compact: true })}</span>,
      exportValue: (l) => l.quantity * l.unitCost,
    },
    {
      key: 'received', header: 'Received', width: 'w-[120px]', defaultHidden: true, sortable: true, sortValue: (l) => l.receivedAt,
      cell: (l) => <span className="tnum text-[12.5px]">{fmtDate(l.receivedAt)}</span>,
      exportValue: (l) => l.receivedAt,
    },
  ]

  const movementColumns: Column<StockMovement>[] = [
    {
      key: 'at', header: 'When', width: 'w-[160px]', pinned: true, sortable: true, sortValue: (m) => m.at,
      cell: (m) => <span className="tnum text-[12.5px]">{m.at.includes('T') ? fmtDateTime(m.at) : fmtDate(m.at)}</span>,
      exportValue: (m) => m.at,
    },
    {
      key: 'kind', header: 'Movement', width: 'w-[170px]', sortable: true, sortValue: (m) => m.kind,
      cell: (m) => <StatusBadge value={m.kind} size="sm" />,
      exportValue: (m) => m.kind,
    },
    {
      key: 'what', header: 'What moved', width: 'min-w-[250px]',
      cell: (m) => {
        const item = s.items.find((i) => i.id === m.itemId)
        const product = s.products.find((p) => p.id === m.productId)
        return (
          <div className="min-w-0">
            <p className="truncate text-[12.5px] text-fg">{item?.name ?? product?.name ?? '—'}</p>
            <p className="truncate font-mono text-[11px] text-fg-muted">{item?.code ?? product?.sku ?? ''}</p>
          </div>
        )
      },
      exportValue: (m) => s.items.find((i) => i.id === m.itemId)?.code ?? '',
    },
    {
      key: 'qty', header: 'Quantity', align: 'right', width: 'w-[120px]', sortable: true, sortValue: (m) => m.quantity,
      cell: (m) => (
        <span className={`tnum text-[12.5px] font-semibold ${m.quantity < 0 ? 'text-danger' : 'text-success'}`}>
          {m.quantity > 0 ? '+' : ''}{fmtNumber(m.quantity, Math.abs(m.quantity) < 10 ? 2 : 0)}
        </span>
      ),
      exportValue: (m) => m.quantity,
    },
    {
      key: 'value', header: 'Value', align: 'right', width: 'w-[130px]', sortable: true, sortValue: (m) => Math.abs(m.quantity * m.unitCost),
      cell: (m) => <span className="tnum text-[12.5px]">{fmtCurrency(Math.abs(m.quantity * m.unitCost), 'IDR', { compact: true })}</span>,
      exportValue: (m) => Math.abs(m.quantity * m.unitCost),
    },
    {
      key: 'where', header: 'Warehouse', width: 'w-[180px]',
      cell: (m) => <span className="text-[12.5px] text-fg-muted">{s.warehouses.find((w) => w.id === m.warehouseId)?.name ?? '—'}</span>,
      exportValue: (m) => m.warehouseId,
    },
    {
      key: 'ref', header: 'Reference', width: 'min-w-[280px]',
      cell: (m) => <span className="text-[12px] text-fg-muted">{m.reference}</span>,
      exportValue: (m) => m.reference,
    },
    {
      key: 'actor', header: 'By', width: 'w-[150px]', defaultHidden: true,
      cell: (m) => <span className="text-[12px] text-fg-muted">{m.actor}</span>,
      exportValue: (m) => m.actor,
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Inventory & lots"
        description="Stock is held as lots, not as a number, because the questions that matter are about a particular consignment: which flitch, which dye lot, which kiln batch, and which country the tree came from."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Stock at cost" value={fmtCurrency(value.total, 'IDR', { compact: true })} icon={<Boxes />} accent="primary" sub={`${s.lots.length} lots`} />
        <KpiCard
          label="Blocked stock"
          value={fmtCurrency(blocked.reduce((a, l) => a + l.quantity * l.unitCost, 0), 'IDR', { compact: true })}
          icon={<TriangleAlert />}
          accent={blocked.length ? 'danger' : 'success'}
          sub={`${blocked.length} lots that cannot be issued`}
        />
        <KpiCard
          label="At provisional cost"
          value={fmtCurrency(value.provisional, 'IDR', { compact: true })}
          icon={<TriangleAlert />}
          accent={value.provisional ? 'warning' : 'success'}
          sub={provisional.length ? 'every product using them is priced on a guess' : 'everything is finally costed'}
        />
        <KpiCard label="Movements recorded" value={fmtNumber(s.movements.length)} icon={<ArrowDownUp />} accent="accent" sub="every quantity change in the book" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)]">
        <Card>
          <CardHeader title="Where the value sits" description="By material type, at the cost each lot actually carries." />
          <CardBody className="space-y-3">
            {value.byType.map((t) => (
              <div key={t.type}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[12px] text-fg">{itemTypeLabel(t.type as never)}</span>
                  <span className="tnum shrink-0 text-[11.5px] text-fg-muted">
                    {fmtPercent((t.value / value.total) * 100, 0)}
                  </span>
                </div>
                <Progress value={(t.value / value.total) * 100} tone="primary" size="sm" />
                <p className="tnum mt-0.5 text-[11px] text-fg-subtle">{fmtCurrency(t.value, 'IDR', { compact: true })}</p>
              </div>
            ))}
            <Because>
              Solid timber dominates because it is the one material that has to be bought long before it can be used, and then
              sit in a kiln for a fortnight before it counts as stock at all.
            </Because>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          <Tabs
            value={tab}
            onChange={setTab}
            variant="pill"
            items={[
              { value: 'lots', label: 'Lots', count: s.lots.length },
              { value: 'movements', label: 'Movements', count: s.movements.length },
            ]}
          />
          {tab === 'lots' ? (
            <DataTable
              data={s.lots}
              columns={lotColumns}
              getId={(l) => l.id}
              getLabel={(l) => l.code}
              entityLabel="lot"
              exportName="lots"
              storageKey="lots"
              searchText={(l) => `${l.code} ${s.items.find((i) => i.id === l.itemId)?.name ?? ''} ${l.species ?? ''} ${l.note ?? ''}`}
              initialSort={{ key: 'value', dir: 'desc' }}
              compactByDefault
              rowTone={(l) => (l.status === 'BLOCKED_KILN' || l.status === 'BLOCKED_QC' ? 'bg-danger-soft/25' : undefined)}
              filters={[
                {
                  key: 'status', label: 'Status', values: status, onChange: setStatus,
                  options: Array.from(new Set(s.lots.map((l) => l.status))).map((v) => ({ value: v, label: v.replace(/_/g, ' ') })),
                  match: (l, v) => v.includes(l.status),
                },
                {
                  key: 'wh', label: 'Warehouse', values: wh, onChange: setWh,
                  options: s.warehouses.map((w) => ({ value: w.id, label: w.name })),
                  match: (l, v) => v.includes(l.warehouseId),
                },
              ]}
            />
          ) : (
            <DataTable
              data={s.movements}
              columns={movementColumns}
              getId={(m) => m.id}
              getLabel={(m) => m.reference}
              entityLabel="movement"
              exportName="stock-movements"
              storageKey="movements"
              searchText={(m) => `${m.reference} ${m.kind} ${s.items.find((i) => i.id === m.itemId)?.code ?? ''}`}
              initialSort={{ key: 'at', dir: 'desc' }}
              compactByDefault
              pageSize={40}
              filters={[
                {
                  key: 'kind', label: 'Movement', values: kind, onChange: setKind,
                  options: Array.from(new Set(s.movements.map((m) => m.kind))).map((v) => ({ value: v, label: v.replace(/_/g, ' ') })),
                  match: (m, v) => v.includes(m.kind),
                },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  )
}
