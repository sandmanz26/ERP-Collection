import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Boxes, Clock, ExternalLink, PackageOpen, Pencil, Plus, Receipt, Trash2, Warehouse,
} from 'lucide-react'
import type { WarehouseReceipt } from '@/data/types'
import { CHARGE_CODES, WAREHOUSES } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { Sheet } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { receiptMetrics, warehouseSummary } from '@/lib/analytics2'
import { fmtCurrency, fmtDate, fmtNumber, pluralDays, titleCase } from '@/lib/format'
import { nextCode, uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

const AGE_TONE: Record<string, 'success' | 'primary' | 'warning' | 'danger'> = {
  FREE: 'success', '1-30': 'primary', '31-60': 'warning', '61-90': 'danger', '90+': 'danger',
}

export function WarehousePage() {
  const nav = useNavigate()
  const toast = useToast()
  const { receipts, customers, projects, removeReceipts, importReceipts, upsertCharge } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<WarehouseReceipt | null>(null)
  const [deleting, setDeleting] = React.useState<WarehouseReceipt | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [warehouse, setWarehouse] = React.useState<string[]>([])

  const summary = warehouseSummary(receipts)
  const customerName = (id: string) => {
    const c = customers.find((x) => x.id === id)
    return c?.tradeName || c?.legalName || '—'
  }
  const projectCode = (id?: string) => projects.find((p) => p.id === id)?.code

  const byWarehouse = WAREHOUSES.map((w) => {
    const rows = receipts.filter((r) => r.warehouseCode === w.code && r.status !== 'RELEASED')
    const m = rows.map((r) => receiptMetrics(r))
    return {
      ...w,
      count: rows.length,
      cbm: m.reduce((a, x) => a + x.cbmOnHand, 0),
      accrued: m.reduce((a, x) => a + x.storageCharge, 0),
    }
  }).filter((w) => w.count > 0)
  const whMax = Math.max(...byWarehouse.map((w) => w.cbm), 1)

  const ageBuckets = ['FREE', '1-30', '31-60', '61-90', '90+'].map((bucket) => {
    const rows = receipts.filter((r) => r.status !== 'RELEASED' && receiptMetrics(r).ageBucket === bucket)
    return { bucket, count: rows.length, cbm: rows.reduce((a, r) => a + receiptMetrics(r).cbmOnHand, 0) }
  })

  const columns: Column<WarehouseReceipt>[] = [
    {
      key: 'number', header: 'Receipt', width: 'w-[142px]', pinned: true, sortable: true,
      sortValue: (r) => r.number, exportValue: (r) => r.number,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12px] font-medium text-fg">{r.number}</p>
          <p className="truncate text-[10.5px] text-fg-subtle">{r.location}</p>
        </div>
      ),
    },
    {
      key: 'warehouse', header: 'Warehouse', width: 'min-w-[190px]', sortable: true,
      sortValue: (r) => r.warehouseName, exportValue: (r) => r.warehouseCode,
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-fg">
          <Warehouse className="size-3.5 text-fg-subtle" /> {r.warehouseName}
        </span>
      ),
    },
    {
      key: 'customer', header: 'Customer', width: 'min-w-[180px]', sortable: true,
      sortValue: (r) => customerName(r.customerId), exportValue: (r) => customerName(r.customerId),
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg">{customerName(r.customerId)}</p>
          {r.projectId && <p className="truncate font-mono text-[11px] text-fg-muted">{projectCode(r.projectId)}</p>}
        </div>
      ),
    },
    {
      key: 'description', header: 'Cargo', width: 'min-w-[250px]', sortable: true,
      sortValue: (r) => r.description, exportValue: (r) => r.description,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg">{r.description}</p>
          <p className="truncate text-[11px] text-fg-muted">
            {r.hsCode && <span className="font-mono">{r.hsCode}</span>}
            {r.poNumber && <span className="ml-1.5">{r.poNumber}</span>}
          </p>
        </div>
      ),
    },
    {
      key: 'onHand', header: 'On hand', width: 'w-[150px]', align: 'right', sortable: true,
      sortValue: (r) => receiptMetrics(r).cbmOnHand,
      exportValue: (r) => receiptMetrics(r).packagesOnHand,
      cell: (r) => {
        const m = receiptMetrics(r)
        return (
          <div>
            <p className="tnum text-[12.5px] font-medium text-fg">{fmtNumber(m.packagesOnHand)} pkg</p>
            <p className="tnum text-[11px] text-fg-muted">
              {fmtNumber(m.cbmOnHand, 2)} m³
              {r.packagesReleased > 0 && ` · ${fmtNumber(r.packagesReleased)} out`}
            </p>
          </div>
        )
      },
    },
    {
      key: 'weight', header: 'Weight', width: 'w-[112px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.weightKg, exportValue: (r) => r.weightKg,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtNumber(r.weightKg)} kg</span>,
    },
    {
      key: 'received', header: 'Received', width: 'w-[118px]', sortable: true,
      sortValue: (r) => r.receivedAt, exportValue: (r) => r.receivedAt.slice(0, 10),
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtDate(r.receivedAt)}</span>,
    },
    {
      key: 'dwell', header: 'Dwell', width: 'w-[150px]', align: 'right', sortable: true,
      sortValue: (r) => receiptMetrics(r).dwellDays, exportValue: (r) => receiptMetrics(r).dwellDays,
      cell: (r) => {
        const m = receiptMetrics(r)
        return (
          <div className="flex items-center justify-end gap-1.5">
            <span className="tnum text-[12.5px] text-fg">{pluralDays(m.dwellDays)}</span>
            <Badge tone={AGE_TONE[m.ageBucket]} size="sm">
              {m.ageBucket === 'FREE' ? 'free' : m.ageBucket}
            </Badge>
          </div>
        )
      },
    },
    {
      key: 'chargeable', header: 'Chargeable', width: 'w-[118px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => receiptMetrics(r).chargeableDays, exportValue: (r) => receiptMetrics(r).chargeableDays,
      cell: (r) => {
        const m = receiptMetrics(r)
        return <span className={`tnum text-[12.5px] ${m.chargeableDays ? 'text-warning' : 'text-fg-subtle'}`}>{m.chargeableDays ? pluralDays(m.chargeableDays) : 'within free time'}</span>
      },
    },
    {
      key: 'storage', header: 'Storage accrued', width: 'w-[160px]', align: 'right', sortable: true,
      sortValue: (r) => receiptMetrics(r).storageCharge, exportValue: (r) => Math.round(receiptMetrics(r).storageCharge),
      cell: (r) => {
        const m = receiptMetrics(r)
        return m.storageCharge ? (
          <span className="tnum text-[12.5px] font-medium text-fg">{fmtCurrency(m.storageCharge, r.currency, { compact: true })}</span>
        ) : (
          <span className="text-fg-subtle">—</span>
        )
      },
    },
    {
      key: 'status', header: 'Status', width: 'w-[168px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
  ]

  return (
    <>
      <PageHeader
        title="Warehouse & CFS"
        description="Cargo we are holding: LCL consolidation, pre-carriage staging and consignment stock. Dwell is measured from receipt, storage is computed from free time rather than typed, and anything sitting past sixty days is usually a dispute forming."
        actions={
          <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus /> New receipt
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Receipts on hand" value={summary.openCount} icon={<PackageOpen />} accent="primary" sub={`${fmtNumber(summary.packagesOnHand)} packages across ${byWarehouse.length} sites`} />
        <KpiCard label="Volume in store" value={`${fmtNumber(summary.cbmOnHand, 1)} m³`} icon={<Boxes />} accent="accent" sub="Excluding released cargo" />
        <KpiCard label="Storage accrued" value={fmtCurrency(summary.storageAccrued, 'IDR', { compact: true })} icon={<Receipt />} accent={summary.storageAccrued > 0 ? 'warning' : 'success'} sub="Beyond free time — bill it or lose it" />
        <KpiCard label="Aged over 60 days" value={summary.aged} icon={<Clock />} accent={summary.aged ? 'danger' : 'success'} sub={`Average dwell ${summary.avgDwell.toFixed(0)} days`} />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Volume by site" description="Where the cargo actually is." />
          <CardBody className="space-y-2.5">
            {byWarehouse.map((w) => (
              <div key={w.code} className="flex items-center gap-3">
                <span className="w-[196px] shrink-0 truncate text-[12.5px] text-fg">{w.name}</span>
                <span className="relative h-5 flex-1 overflow-hidden rounded-md bg-surface-sunken">
                  <span className="absolute inset-y-0 left-0 rounded-md bg-primary/80" style={{ width: `${(w.cbm / whMax) * 100}%` }} />
                </span>
                <span className="tnum w-[70px] shrink-0 text-right text-[12px] text-fg-muted">{fmtNumber(w.cbm, 1)} m³</span>
                <span className="tnum w-[74px] shrink-0 text-right text-[12px] text-fg">{fmtCurrency(w.accrued, 'IDR', { compact: true })}</span>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Stock ageing" description="Cargo that stops moving stops being revenue and starts being risk." />
          <CardBody>
            <div className="grid grid-cols-5 gap-2">
              {ageBuckets.map((b) => (
                <div key={b.bucket} className="rounded-lg border border-border bg-surface-sunken px-2.5 py-2.5 text-center">
                  <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-fg-subtle">
                    {b.bucket === 'FREE' ? 'In free time' : `${b.bucket} d`}
                  </p>
                  <p className={`tnum mt-1.5 text-[17px] font-semibold ${b.count && (b.bucket === '61-90' || b.bucket === '90+') ? 'text-danger' : 'text-fg'}`}>
                    {b.count}
                  </p>
                  <p className="tnum text-[11px] text-fg-muted">{fmtNumber(b.cbm, 1)} m³</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <DataTable
        data={receipts}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.number} — ${r.description}`}
        entityLabel="receipt"
        storageKey="receipts"
        exportName="warehouse-receipts"
        initialSort={{ key: 'dwell', dir: 'desc' }}
        searchText={(r) => [r.number, r.description, r.marks, r.poNumber, r.hsCode, r.warehouseName, r.location, customerName(r.customerId), projectCode(r.projectId)].join(' ')}
        onRowClick={(r) => { setEditing(r); setFormOpen(true) }}
        rowTone={(r) => {
          const m = receiptMetrics(r)
          if (r.status === 'ON_HOLD') return 'bg-danger-soft/20'
          if (m.dwellDays > 60 && r.status !== 'RELEASED') return 'bg-warning-soft/20'
          return undefined
        }}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['IN_STOCK', 'PARTIALLY_RELEASED', 'RELEASED', 'ON_HOLD'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'warehouse', label: 'Warehouse', values: warehouse, onChange: setWarehouse,
            options: WAREHOUSES.map((w) => ({ value: w.code, label: w.name })),
            match: (r, v) => v.includes(r.warehouseCode),
          },
        ]}
        onDelete={(ids) => {
          removeReceipts(ids)
          toast.push({ tone: 'success', title: `${ids.length} receipts removed` })
        }}
        bulkActions={(rows, clear) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              let pushed = 0
              rows.forEach((r) => {
                const m = receiptMetrics(r)
                if (!m.storageCharge || !r.projectId) return
                const meta = CHARGE_CODES.find((c) => c.code === 'STOR')!
                upsertCharge({
                  id: uid('chg'), projectId: r.projectId, chargeCode: 'STOR', costType: 'MASTER',
                  description: `Storage — ${r.number}, ${m.chargeableDays} chargeable days`,
                  category: meta.category, basis: 'PER_CBM', quantity: +r.cbm.toFixed(2),
                  buyRate: r.storageRatePerCbmDay * m.chargeableDays * 0.7,
                  sellRate: r.storageRatePerCbmDay * m.chargeableDays,
                  currency: r.currency, fxRate: 1, vatApplicable: true, whtApplicable: false,
                  freightTerm: 'PREPAID', billable: true, status: 'DRAFT', fromPackage: false,
                  createdAt: new Date().toISOString(),
                })
                pushed++
              })
              toast.push({
                tone: pushed ? 'success' : 'warning',
                title: pushed ? `${pushed} storage charges raised` : 'Nothing to bill',
                description: pushed ? 'Added as draft lines on the linked jobs.' : 'Selected receipts are either within free time or not linked to a job.',
              })
              clear()
            }}
          >
            <Receipt /> Bill storage
          </Button>
        )}
        importFields={[
          { key: 'number', label: 'Receipt number', required: true },
          { key: 'warehouseCode', label: 'Warehouse code', required: true, hint: 'CFS-TPP, WH-SRG …' },
          { key: 'customerCode', label: 'Customer code', required: true },
          { key: 'projectCode', label: 'Project code', hint: 'optional link to a job' },
          { key: 'receivedAt', label: 'Received date', required: true, hint: 'YYYY-MM-DD' },
          { key: 'releasedAt', label: 'Released date' },
          { key: 'location', label: 'Location' },
          { key: 'description', label: 'Cargo description', required: true },
          { key: 'hsCode', label: 'HS code' },
          { key: 'poNumber', label: 'PO number' },
          { key: 'packages', label: 'Packages', required: true },
          { key: 'packagesReleased', label: 'Packages released' },
          { key: 'cbm', label: 'CBM', required: true },
          { key: 'weightKg', label: 'Weight (kg)' },
          { key: 'freeDays', label: 'Free days' },
          { key: 'storageRatePerCbmDay', label: 'Storage rate per CBM/day' },
          { key: 'status', label: 'Status' },
        ]}
        importSample={{
          number: 'WR-2026-0320', warehouseCode: 'CFS-TPP', customerCode: 'CUS-0001', projectCode: '',
          receivedAt: '2026-08-28', releasedAt: '', location: 'A-01-01', description: 'Teak crates',
          hsCode: '9403.60', poNumber: 'PO-90001', packages: '120', packagesReleased: '0', cbm: '44.5',
          weightKg: '6600', freeDays: '7', storageRatePerCbmDay: '8500', status: 'IN_STOCK',
        }}
        toImportRow={(r) => ({
          number: r.number, warehouseCode: r.warehouseCode,
          customerCode: customers.find((c) => c.id === r.customerId)?.code ?? '',
          projectCode: projectCode(r.projectId) ?? '',
          receivedAt: r.receivedAt.slice(0, 10), releasedAt: r.releasedAt?.slice(0, 10) ?? '',
          location: r.location, description: r.description, hsCode: r.hsCode ?? '', poNumber: r.poNumber ?? '',
          packages: r.packages, packagesReleased: r.packagesReleased, cbm: r.cbm, weightKg: r.weightKg,
          freeDays: r.freeDays, storageRatePerCbmDay: r.storageRatePerCbmDay, status: r.status,
        })}
        onImport={(rows) => {
          const mapped = rows
            .map((r) => {
              const cust = customers.find((c) => c.code === r.customerCode)
              const wh = WAREHOUSES.find((w) => w.code === r.warehouseCode)
              if (!cust || !wh) return null
              const existing = receipts.find((x) => x.number === r.number)
              return {
                id: existing?.id ?? uid('wr'),
                number: r.number, warehouseCode: wh.code, warehouseName: wh.name,
                customerId: cust.id,
                projectId: projects.find((p) => p.code === r.projectCode)?.id,
                status: (['IN_STOCK', 'PARTIALLY_RELEASED', 'RELEASED', 'ON_HOLD'].includes(r.status) ? r.status : 'IN_STOCK') as WarehouseReceipt['status'],
                receivedAt: new Date(`${r.receivedAt}T09:00:00Z`).toISOString(),
                releasedAt: r.releasedAt ? new Date(`${r.releasedAt}T09:00:00Z`).toISOString() : undefined,
                location: r.location || '—', description: r.description,
                hsCode: r.hsCode || undefined, poNumber: r.poNumber || undefined,
                packages: Number(r.packages) || 0, packagesReleased: Number(r.packagesReleased) || 0,
                cbm: Number(r.cbm) || 0, weightKg: Number(r.weightKg) || 0,
                freeDays: Number(r.freeDays) || 7,
                storageRatePerCbmDay: Number(r.storageRatePerCbmDay) || 8500,
                currency: existing?.currency ?? 'IDR',
                handlingIn: existing?.handlingIn ?? 0, handlingOut: existing?.handlingOut ?? 0,
                receivedBy: existing?.receivedBy ?? 'Import',
              } as WarehouseReceipt
            })
            .filter(Boolean) as WarehouseReceipt[]
          importReceipts(mapped)
          toast.push({ tone: mapped.length ? 'success' : 'warning', title: mapped.length ? `${mapped.length} receipts imported` : 'Nothing imported' })
        }}
        rowActions={(r) => (
          <>
            {r.projectId && (
              <Tooltip content="Open job">
                <Button variant="ghost" size="iconXs" onClick={() => nav(`/projects/${r.projectId}`)}><ExternalLink /></Button>
              </Tooltip>
            )}
            <Tooltip content="Edit">
              <Button variant="ghost" size="iconXs" onClick={() => { setEditing(r); setFormOpen(true) }}><Pencil /></Button>
            </Tooltip>
            <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}><Trash2 /></Button>
            </Tooltip>
          </>
        )}
        footerSummary={(rows) => (
          <span className="tnum">
            {fmtNumber(rows.reduce((a, r) => a + receiptMetrics(r).cbmOnHand, 0), 1)} m³ on hand · storage{' '}
            <span className="font-semibold text-fg">{fmtCurrency(rows.reduce((a, r) => a + receiptMetrics(r).storageCharge, 0), 'IDR', { compact: true })}</span>
          </span>
        )}
      />

      <ReceiptForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="receipt"
        items={deleting ? [`${deleting.number} — ${deleting.description}`] : []}
        destructiveNote={deleting && deleting.status !== 'RELEASED' ? 'This cargo is still recorded as on hand.' : undefined}
        onConfirm={() => {
          if (deleting) {
            removeReceipts([deleting.id])
            toast.push({ tone: 'success', title: 'Receipt removed' })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}

function ReceiptForm({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (v: boolean) => void; initial?: WarehouseReceipt | null }) {
  const { receipts, customers, projects, upsertReceipt } = useErp()
  const toast = useToast()
  const [draft, setDraft] = React.useState<WarehouseReceipt>(() => blank(receipts))
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank(receipts))
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const set = <K extends keyof WarehouseReceipt>(k: K, v: WarehouseReceipt[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const m = receiptMetrics(draft)

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-2xl"
      eyebrow={<Badge tone={initial ? 'primary' : 'accent'} size="sm">{initial ? initial.number : 'New receipt'}</Badge>}
      title={initial ? initial.description : 'Receive cargo into store'}
      description="Dwell and storage are computed from the received date and the free-time allowance — they are never typed."
      footer={
        <>
          <div className="mr-auto flex items-center gap-3 text-[12px] text-fg-muted">
            <span>Dwell <span className="tnum font-semibold text-fg">{pluralDays(m.dwellDays)}</span></span>
            <span>Chargeable <span className="tnum font-semibold text-fg">{pluralDays(m.chargeableDays)}</span></span>
            <Badge tone={m.storageCharge ? 'warning' : 'success'} size="sm">
              {m.storageCharge ? fmtCurrency(m.storageCharge, draft.currency, { compact: true }) : 'within free time'}
            </Badge>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              const e: Record<string, string> = {}
              if (!draft.description.trim()) e.description = 'Description is required'
              if (!draft.customerId) e.customerId = 'A customer is required'
              if (draft.packagesReleased > draft.packages) e.packagesReleased = 'Cannot release more than was received'
              setErrors(e)
              if (Object.keys(e).length) return
              const status: WarehouseReceipt['status'] =
                draft.status === 'ON_HOLD'
                  ? 'ON_HOLD'
                  : draft.packagesReleased === 0
                    ? 'IN_STOCK'
                    : draft.packagesReleased >= draft.packages
                      ? 'RELEASED'
                      : 'PARTIALLY_RELEASED'
              upsertReceipt({ ...draft, status })
              toast.push({ tone: 'success', title: initial ? 'Receipt updated' : 'Cargo received', description: draft.number })
              onOpenChange(false)
            }}
          >
            {initial ? 'Save receipt' : 'Receive cargo'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Receipt number" required>
          <Input value={draft.number} onChange={(e) => set('number', e.target.value)} className="font-mono" />
        </Field>
        <Field label="Warehouse" required>
          <Select
            value={draft.warehouseCode}
            onChange={(v) => {
              const w = WAREHOUSES.find((x) => x.code === v)!
              setDraft((d) => ({ ...d, warehouseCode: v, warehouseName: w.name }))
            }}
            options={WAREHOUSES.map((w) => ({ value: w.code, label: w.name, description: `${w.code} · ${w.city}` }))}
          />
        </Field>
        <Field label="Customer" required error={errors.customerId}>
          <Select
            searchable
            value={draft.customerId || null}
            onChange={(v) => set('customerId', v)}
            options={customers.map((c) => ({ value: c.id, label: c.tradeName || c.legalName, description: c.code }))}
            invalid={!!errors.customerId}
          />
        </Field>
        <Field label="Linked job" hint="optional" help="Required before storage can be pushed to a charge sheet.">
          <Select
            clearable
            searchable
            value={draft.projectId ?? null}
            onClear={() => set('projectId', undefined)}
            onChange={(v) => set('projectId', v)}
            options={projects.map((p) => ({ value: p.id, label: p.code, description: p.name }))}
            placeholder="Not tied to a job"
          />
        </Field>
        <Field label="Cargo description" required error={errors.description} className="sm:col-span-2">
          <Input value={draft.description} onChange={(e) => set('description', e.target.value)} invalid={!!errors.description} />
        </Field>
        <Field label="HS code">
          <Input value={draft.hsCode ?? ''} onChange={(e) => set('hsCode', e.target.value)} className="font-mono" />
        </Field>
        <Field label="PO number">
          <Input value={draft.poNumber ?? ''} onChange={(e) => set('poNumber', e.target.value)} />
        </Field>
        <Field label="Bin location">
          <Input value={draft.location} onChange={(e) => set('location', e.target.value)} className="font-mono" placeholder="A-04-12" />
        </Field>
        <Field label="Status">
          <Select
            value={draft.status}
            onChange={(v) => set('status', v)}
            options={[
              { value: 'IN_STOCK', label: 'In stock' },
              { value: 'PARTIALLY_RELEASED', label: 'Partially released', description: 'Derived from the released count' },
              { value: 'RELEASED', label: 'Released' },
              { value: 'ON_HOLD', label: 'On hold', description: 'Blocked — raises an exception' },
            ]}
          />
        </Field>
        <Field label="Received">
          <DatePicker value={draft.receivedAt} onChange={(v) => set('receivedAt', v ?? draft.receivedAt)} />
        </Field>
        <Field label="Released" hint="leave empty while in store">
          <DatePicker value={draft.releasedAt} onChange={(v) => set('releasedAt', v ?? undefined)} />
        </Field>
        <Field label="Packages received" required>
          <Input type="number" value={draft.packages} onChange={(e) => set('packages', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Packages released" error={errors.packagesReleased}>
          <Input type="number" value={draft.packagesReleased} onChange={(e) => set('packagesReleased', Number(e.target.value))} className="tnum" invalid={!!errors.packagesReleased} />
        </Field>
        <Field label="Volume (CBM)" required>
          <Input type="number" value={draft.cbm} onChange={(e) => set('cbm', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Weight (kg)">
          <Input type="number" value={draft.weightKg} onChange={(e) => set('weightKg', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Free days" help="Days before storage starts accruing.">
          <Input type="number" value={draft.freeDays} onChange={(e) => set('freeDays', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Storage rate per CBM/day" hint={draft.currency}>
          <Input type="number" value={draft.storageRatePerCbmDay} onChange={(e) => set('storageRatePerCbmDay', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Handling in" hint={draft.currency}>
          <Input type="number" value={draft.handlingIn} onChange={(e) => set('handlingIn', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Handling out" hint={draft.currency}>
          <Input type="number" value={draft.handlingOut} onChange={(e) => set('handlingOut', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Marks and numbers" className="sm:col-span-2">
          <Textarea value={draft.marks ?? ''} onChange={(e) => set('marks', e.target.value)} rows={2} className="font-mono text-[12px]" />
        </Field>
        <Field label="Remarks" className="sm:col-span-2">
          <Textarea value={draft.remarks ?? ''} onChange={(e) => set('remarks', e.target.value)} rows={2} />
        </Field>
      </div>
    </Sheet>
  )
}

function blank(existing: WarehouseReceipt[]): WarehouseReceipt {
  return {
    id: uid('wr'),
    number: nextCode('WR', existing.map((r) => r.number), 4, true),
    warehouseCode: WAREHOUSES[0].code, warehouseName: WAREHOUSES[0].name,
    customerId: '', status: 'IN_STOCK', receivedAt: new Date().toISOString(),
    location: '', description: '', packages: 0, packagesReleased: 0, cbm: 0, weightKg: 0,
    freeDays: 7, storageRatePerCbmDay: 8500, currency: 'IDR', handlingIn: 0, handlingOut: 0,
    receivedBy: 'Elena Marchetti',
  }
}
