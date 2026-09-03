import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Boxes, Pencil, Plus, Trash2, Warehouse as WarehouseIcon } from 'lucide-react'
import type { Warehouse } from '@/data/types'
import { PROVINCES, WAREHOUSE_TYPES, warehouseTypeLabel } from '@/data/reference'
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
import { WarehouseForm } from './WarehouseForm'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import { uid } from '@/lib/utils'
import { stockValue, warehouseTotals } from '@/lib/domain'

export function WarehousesPage() {
  const nav = useNavigate()
  const toast = useToast()
  const can = useCan()
  const { warehouses, stock, items, removeWarehouses, importWarehouses } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Warehouse | null>(null)
  const [deleting, setDeleting] = React.useState<Warehouse | null>(null)
  const [type, setType] = React.useState<string[]>([])
  const [province, setProvince] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<string[]>([])

  const totals = (w: Warehouse) => warehouseTotals(w.id, stock, items)
  const grandValue = stock.reduce((a, s) => a + stockValue(s), 0)
  const lowLines = warehouses.reduce((a, w) => a + totals(w).low + totals(w).out, 0)

  const columns: Column<Warehouse>[] = [
    {
      key: 'code', header: 'Code', width: 'w-[124px]', pinned: true, sortable: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.code}</span>,
    },
    {
      key: 'name', header: 'Warehouse', width: 'w-[230px] max-w-[230px]', sortable: true,
      sortValue: (r) => r.name, exportValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.name}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.address}</p>
        </div>
      ),
    },
    {
      key: 'type', header: 'Type', width: 'w-[128px]', sortable: true,
      sortValue: (r) => r.type, exportValue: (r) => r.type,
      cell: (r) => <Badge tone="outline" size="sm">{warehouseTypeLabel(r.type)}</Badge>,
    },
    {
      key: 'city', header: 'Location', width: 'w-[168px]', sortable: true,
      sortValue: (r) => r.city, exportValue: (r) => `${r.city}, ${r.province}`,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg">{r.city}</p>
          <p className="truncate text-[11px] text-fg-subtle">{r.province}</p>
        </div>
      ),
    },
    {
      key: 'skus', header: 'SKUs', width: 'w-[92px]', align: 'right', sortable: true,
      sortValue: (r) => totals(r).skus, exportValue: (r) => totals(r).skus,
      cell: (r) => <span className="tnum text-[12.5px] text-fg">{totals(r).skus}</span>,
    },
    {
      key: 'lines', header: 'Stock lines', width: 'w-[110px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => totals(r).lines, exportValue: (r) => totals(r).lines,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{totals(r).lines}</span>,
    },
    {
      key: 'units', header: 'Units on hand', width: 'w-[132px]', align: 'right', sortable: true,
      sortValue: (r) => totals(r).onHand, exportValue: (r) => totals(r).onHand,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtNumber(totals(r).onHand)}</span>,
    },
    {
      key: 'value', header: 'Stock value', width: 'w-[148px]', align: 'right', sortable: true,
      sortValue: (r) => totals(r).value, exportValue: (r) => Math.round(totals(r).value),
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{fmtCurrency(totals(r).value, 'IDR', { compact: true })}</span>,
    },
    {
      key: 'alerts', header: 'Attention', width: 'w-[168px]', sortable: true,
      sortValue: (r) => totals(r).out * 10 + totals(r).low,
      exportValue: (r) => `${totals(r).out} out / ${totals(r).low} low / ${totals(r).expiring} expiring`,
      cell: (r) => {
        const t = totals(r)
        if (!t.out && !t.low && !t.expiring) return <span className="text-[12px] text-success">Healthy</span>
        return (
          <div className="flex flex-wrap gap-1">
            {t.out > 0 && <Badge tone="danger" size="sm">{t.out} out</Badge>}
            {t.low > 0 && <Badge tone="warning" size="sm">{t.low} low</Badge>}
            {t.expiring > 0 && <Badge tone="purple" size="sm">{t.expiring} expiry</Badge>}
          </div>
        )
      },
    },
    {
      key: 'manager', header: 'Manager', width: 'w-[168px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.managerName, exportValue: (r) => `${r.managerName} ${r.phone}`,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg">{r.managerName}</p>
          <p className="truncate text-[11px] text-fg-subtle">{r.phone}</p>
        </div>
      ),
    },
    {
      key: 'capacity', header: 'Capacity', width: 'w-[116px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.capacitySqm, exportValue: (r) => r.capacitySqm,
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{fmtNumber(r.capacitySqm)} m²</span>,
    },
    {
      key: 'opened', header: 'Opened', width: 'w-[124px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.openedAt, exportValue: (r) => r.openedAt.slice(0, 10),
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{fmtDate(r.openedAt)}</span>,
    },
    {
      key: 'status', header: 'Status', width: 'w-[110px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
  ]

  return (
    <>
      <PageHeader
        title="Warehouses"
        description="Where uniforms, chemicals and equipment are held before they reach a site. Stock levels themselves live in warehouse stock."
        actions={
          <>
            <Button variant="secondary" onClick={() => nav('/inventory/stock')}>
              <Boxes /> Open stock
            </Button>
            {can('warehouses.create') && (
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus /> New warehouse
            </Button>
            )}
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Warehouses"
          value={warehouses.length}
          icon={<WarehouseIcon />}
          accent="primary"
          sub={`${warehouses.filter((w) => w.status === 'ACTIVE').length} active · ${new Set(warehouses.map((w) => w.city)).size} cities`}
        />
        <KpiCard label="Stock lines" value={stock.length} icon={<Boxes />} accent="accent" sub={`${new Set(stock.map((s) => s.itemId)).size} distinct items held`} />
        <KpiCard label="Stock value" value={fmtCurrency(grandValue, 'IDR', { compact: true })} icon={<Boxes />} accent="purple" sub="at the cost each bin was bought for" />
        <KpiCard
          label="Lines needing action"
          value={lowLines}
          icon={<AlertTriangle />}
          accent={lowLines ? 'warning' : 'success'}
          sub={lowLines ? 'below minimum or out of stock' : 'every level is healthy'}
          onClick={() => nav('/inventory/stock')}
        />
      </div>

      <DataTable
        data={warehouses}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.code} — ${r.name}`}
        entityLabel="warehouse"
        storageKey="warehouses"
        allowExport={can('warehouses.export')}
        exportName="tata-gemilang-warehouses"
        searchText={(r) => [r.code, r.name, r.city, r.province, r.address, r.managerName, r.notes].filter(Boolean).join(' ')}
        initialSort={{ key: 'code', dir: 'asc' }}
        onRowClick={
          can('warehouses.edit')
            ? (r) => {
                setEditing(r)
                setFormOpen(true)
              }
            : undefined
        }
        rowTone={(r) => (r.status === 'INACTIVE' ? 'bg-bg-muted/60' : undefined)}
        filters={[
          {
            key: 'type', label: 'Type', values: type, onChange: setType,
            options: WAREHOUSE_TYPES.map((t) => ({ value: t.value, label: t.label })),
            match: (r, v) => v.includes(r.type),
          },
          {
            key: 'province', label: 'Province', values: province, onChange: setProvince,
            options: PROVINCES.map((p) => ({ value: p, label: p })),
            match: (r, v) => v.includes(r.province),
          },
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: [
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ],
            match: (r, v) => v.includes(r.status),
          },
        ]}
        onDelete={can('warehouses.delete') ? (ids) => {
          removeWarehouses(ids)
          toast.push({ tone: 'success', title: `${ids.length} warehouse${ids.length === 1 ? '' : 's'} deleted` })
        } : undefined}
        cascadeWarning={(rows) => {
          const lines = stock.filter((s) => rows.some((r) => r.id === s.warehouseId))
          return lines.length ? [`${lines.length} stock lines worth ${fmtCurrency(lines.reduce((a, s) => a + stockValue(s), 0), 'IDR', { compact: true })} are deleted with them`] : []
        }}
        deleteNote="Stock held in a deleted warehouse is removed with it — there is nowhere left for it to sit."
        importFields={can('warehouses.import') ? [
          { key: 'code', label: 'Warehouse code', required: true, hint: 'e.g. WH-SMG-07' },
          { key: 'name', label: 'Name', required: true },
          { key: 'type', label: 'Type', hint: 'CENTRAL / REGIONAL / SITE' },
          { key: 'address', label: 'Address' },
          { key: 'city', label: 'City', required: true },
          { key: 'province', label: 'Province' },
          { key: 'managerName', label: 'Manager' },
          { key: 'phone', label: 'Phone' },
          { key: 'capacitySqm', label: 'Capacity (m²)' },
        ] : undefined}
        importSample={{
          code: 'WH-SMG-07', name: 'Gudang Regional Semarang', type: 'REGIONAL', address: 'Jl. Kaligawe Raya No. 12',
          city: 'Semarang', province: 'Jawa Tengah', managerName: 'Rudi Prasetyo', phone: '+62 24 6500 220',
          capacitySqm: '540',
        }}
        toImportRow={(r) => ({
          code: r.code, name: r.name, type: r.type, address: r.address, city: r.city, province: r.province,
          managerName: r.managerName, phone: r.phone, capacitySqm: r.capacitySqm,
        })}
        onImport={can('warehouses.import') ? (rows) => {
          const mapped: Warehouse[] = rows.map((row) => {
            const existing = warehouses.find((w) => w.code === row.code)
            return {
              ...(existing ?? {}),
              id: existing?.id ?? uid('wh'),
              code: row.code,
              name: row.name,
              type: (['CENTRAL', 'REGIONAL', 'SITE'].includes(row.type) ? row.type : 'REGIONAL') as Warehouse['type'],
              address: row.address ?? '',
              city: row.city,
              province: row.province || 'DKI Jakarta',
              managerName: row.managerName ?? '',
              phone: row.phone ?? '',
              capacitySqm: Number(row.capacitySqm) || 0,
              status: existing?.status ?? 'ACTIVE',
              openedAt: existing?.openedAt ?? new Date().toISOString(),
            } as Warehouse
          })
          importWarehouses(mapped)
          toast.push({ tone: 'success', title: `${mapped.length} warehouse${mapped.length === 1 ? '' : 's'} imported` })
        } : undefined}
        rowActions={(r) => (
          <>
            {can('warehouses.edit') && (
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
            {can('warehouses.delete') && (
              <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}>
                <Trash2 />
              </Button>
            </Tooltip>
            )}
          </>
        )}
        footerSummary={(rows) => (
          <span className="tnum">{fmtCurrency(rows.reduce((a, r) => a + totals(r).value, 0), 'IDR', { compact: true })} held in this view</span>
        )}
        emptyTitle="No warehouses yet"
        emptyDescription="Create the first warehouse before recording any stock."
      />

      <WarehouseForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="warehouse"
        items={deleting ? [`${deleting.code} — ${deleting.name}`] : []}
        cascade={deleting ? [`${totals(deleting).lines} stock lines worth ${fmtCurrency(totals(deleting).value, 'IDR', { compact: true })}`] : []}
        onConfirm={() => {
          if (deleting) {
            removeWarehouses([deleting.id])
            toast.push({ tone: 'success', title: 'Warehouse deleted', description: deleting.code })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
