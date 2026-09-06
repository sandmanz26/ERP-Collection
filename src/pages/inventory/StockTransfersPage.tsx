import * as React from 'react'
import {
  AlertTriangle, ArrowRight, Ban, Eye, PackageCheck, Plus, Send, Trash2, Truck, Warehouse as WarehouseIcon,
} from 'lucide-react'
import type { StockTransfer, StockTransferLine } from '@/data/types'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, Sheet } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { EmptyState } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { uid } from '@/lib/utils'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import { availableQty } from '@/lib/domain'
import { dispatchProblem, transferQty, transferValue, transferVariance } from '@/lib/purchasing'

const TH = 'whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted'
const TD = 'border-b border-border px-3 py-2.5 align-top'

/* ================================================================
   Raising a transfer
   ================================================================ */

function TransferForm({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: StockTransfer | null
}) {
  const toast = useToast()
  const { warehouses, items, stock, stockTransfers, upsertTransfer } = useErp()
  const [draft, setDraft] = React.useState<StockTransfer | null>(null)
  const [pick, setPick] = React.useState('')
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (!open) return
    setDraft(
      initial
        ? structuredClone(initial)
        : {
            id: uid('trf'),
            code: `TRF-${new Date().getFullYear()}-${String(stockTransfers.length + 1).padStart(4, '0')}`,
            fromWarehouseId: 'wh_jkt',
            toWarehouseId: '',
            status: 'DRAFT',
            lines: [],
            reason: '',
            requestedBy: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
    )
    setPick('')
    setErrors({})
  }, [open, initial, stockTransfers.length])

  if (!draft) return null
  const set = <K extends keyof StockTransfer>(k: K, v: StockTransfer[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))

  /* Only what the source warehouse actually holds can be sent. */
  const sourceLines = stock
    .filter((s) => s.warehouseId === draft.fromWarehouseId && availableQty(s) > 0)
    .filter((s) => !draft.lines.some((l) => l.stockId === s.id))

  const addLine = (stockId: string) => {
    const source = stock.find((s) => s.id === stockId)
    if (!source) return
    const line: StockTransferLine = {
      id: uid('trl'),
      itemId: source.itemId,
      stockId: source.id,
      qty: Math.min(10, availableQty(source)),
      batchNo: source.batchNo,
      expiryDate: source.expiryDate,
      unitCost: source.unitCost,
    }
    set('lines', [...draft.lines, line])
    setPick('')
  }

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.toWarehouseId) e.toWarehouseId = 'Choose where the goods are going'
    if (draft.toWarehouseId === draft.fromWarehouseId) e.toWarehouseId = 'The destination has to be a different warehouse'
    if (!draft.reason.trim()) e.reason = 'Say why the stock is moving — the receiving warehouse will ask'
    if (draft.lines.length === 0) e.lines = 'Add at least one line'
    draft.lines.forEach((line) => {
      const source = stock.find((s) => s.id === line.stockId)
      if (!source) e.lines = 'One of the source stock lines no longer exists'
      else if (line.qty <= 0) e.lines = 'Every line needs a quantity'
      else if (line.qty > availableQty(source)) {
        e.lines = `${items.find((i) => i.id === line.itemId)?.sku}: only ${availableQty(source)} available at the source`
      }
    })
    setErrors(e)
    if (Object.keys(e).length) return

    upsertTransfer(draft)
    toast.push({
      tone: 'success',
      title: initial ? 'Transfer updated' : 'Transfer raised',
      description: `${draft.code} — ${draft.lines.length} lines. Nothing moves until it is dispatched.`,
    })
    onOpenChange(false)
  }

  const fromName = warehouses.find((w) => w.id === draft.fromWarehouseId)?.name

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-3xl"
      eyebrow={<Badge tone={initial ? 'primary' : 'accent'} size="sm">{initial ? `Editing ${initial.code}` : 'New transfer'}</Badge>}
      title={initial ? initial.code : 'Move stock between warehouses'}
      description="A draft moves nothing. Stock leaves the source only when the transfer is dispatched, and arrives only when it is received."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save}>{initial ? 'Save changes' : 'Raise transfer'}</Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="From" required hint="Stock is taken from this warehouse">
          <Select
            value={draft.fromWarehouseId}
            onChange={(v) => setDraft((d) => (d ? { ...d, fromWarehouseId: v, lines: [] } : d))}
            options={warehouses.map((w) => ({ value: w.id, label: w.name, description: `${w.code} · ${w.city}` }))}
          />
        </Field>
        <Field label="To" required error={errors.toWarehouseId}>
          <Select
            value={draft.toWarehouseId || null}
            onChange={(v) => set('toWarehouseId', v)}
            placeholder="Choose a destination"
            invalid={!!errors.toWarehouseId}
            options={warehouses
              .filter((w) => w.id !== draft.fromWarehouseId)
              .map((w) => ({ value: w.id, label: w.name, description: `${w.code} · ${w.city}` }))}
          />
        </Field>
        <Field label="Expected arrival" hint="optional">
          <DatePicker value={draft.expectedAt ?? null} onChange={(v) => set('expectedAt', v ?? undefined)} />
        </Field>
        <Field label="Destination bin" hint="optional — can also be set on arrival">
          <Input value={draft.toBinLocation ?? ''} onChange={(e) => set('toBinLocation', e.target.value.toUpperCase())} placeholder="RAK-A-01-1" />
        </Field>
        <Field label="Reason" required error={errors.reason} className="sm:col-span-2">
          <Textarea value={draft.reason} onChange={(e) => set('reason', e.target.value)} rows={2} placeholder="Penambahan stok seragam untuk proyek yang mulai bulan depan…" invalid={!!errors.reason} />
        </Field>
      </div>

      <div className="border-y border-border">
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <div>
            <p className="text-[13px] font-medium text-fg">What is being sent</p>
            <p className="text-[11.5px] text-fg-subtle">Drawn line by line from {fromName} — the batch and its cost travel with the goods.</p>
          </div>
          <Select
            value={pick || null}
            onChange={addLine}
            placeholder="Add an item"
            searchable
            className="w-[280px]"
            size="sm"
            emptyLabel="Nothing left to send from this warehouse"
            options={sourceLines.map((s) => {
              const item = items.find((i) => i.id === s.itemId)
              return {
                value: s.id,
                label: `${item?.sku} · ${item?.name}`,
                description: `${fmtNumber(availableQty(s))} ${item?.uom} available in ${s.binLocation}${s.batchNo ? ` · batch ${s.batchNo}` : ''}`,
              }
            })}
          />
        </div>

        {draft.lines.length === 0 ? (
          <EmptyState icon={<Truck />} title="Nothing on this transfer yet" description="Pick what the source warehouse should send." />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  <th className={TH}>Item</th>
                  <th className={TH}>Source bin</th>
                  <th className={`${TH} text-right`}>Available</th>
                  <th className={`${TH} text-right`}>Send</th>
                  <th className={`${TH} text-right`}>Value</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody>
                {draft.lines.map((line) => {
                  const item = items.find((i) => i.id === line.itemId)
                  const source = stock.find((s) => s.id === line.stockId)
                  const available = source ? availableQty(source) : 0
                  return (
                    <tr key={line.id}>
                      <td className={TD}>
                        <p className="max-w-[220px] truncate font-medium text-fg">{item?.name}</p>
                        <p className="font-mono text-[11px] text-fg-subtle">{item?.sku}{line.batchNo ? ` · ${line.batchNo}` : ''}</p>
                      </td>
                      <td className={`${TD} font-mono text-[11.5px] text-fg-muted`}>{source?.binLocation ?? '—'}</td>
                      <td className={`${TD} tnum whitespace-nowrap text-right text-fg-muted`}>{fmtNumber(available)}</td>
                      <td className={`${TD} text-right`}>
                        <Input
                          type="number"
                          min={1}
                          max={available}
                          value={line.qty}
                          onChange={(e) =>
                            set('lines', draft.lines.map((l) => (l.id === line.id ? { ...l, qty: Number(e.target.value) } : l)))
                          }
                          invalid={line.qty > available || line.qty <= 0}
                          className="tnum w-[92px]"
                        />
                      </td>
                      <td className={`${TD} tnum whitespace-nowrap text-right text-fg`}>{fmtCurrency(line.qty * line.unitCost, 'IDR', { compact: true })}</td>
                      <td className={`${TD} text-right`}>
                        <Button variant="ghost" size="iconXs" onClick={() => set('lines', draft.lines.filter((l) => l.id !== line.id))}>
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-2 p-5">
        {errors.lines && (
          <p className="flex items-start gap-2 rounded-lg bg-danger-soft/50 px-3 py-2.5 text-[12.5px] text-danger-soft-fg">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {errors.lines}
          </p>
        )}
        <p className="text-[12.5px] text-fg-muted">
          {draft.lines.length} lines · {fmtNumber(transferQty(draft))} units ·{' '}
          <span className="font-medium text-fg">{fmtCurrency(transferValue(draft), 'IDR')}</span>
        </p>
      </div>
    </Sheet>
  )
}

/* ================================================================
   Receiving one
   ================================================================ */

function ReceiveDialog({ transfer, open, onOpenChange }: { transfer: StockTransfer; open: boolean; onOpenChange: (v: boolean) => void }) {
  const toast = useToast()
  const { items, warehouses, receiveTransfer } = useErp()
  const [received, setReceived] = React.useState<Record<string, number>>({})
  const [bin, setBin] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setReceived(Object.fromEntries(transfer.lines.map((l) => [l.id, l.qty])))
    setBin(transfer.toBinLocation ?? 'RAK-TERIMA')
    setReason('')
    setError('')
  }, [open, transfer])

  const short = transfer.lines.reduce((a, l) => a + (l.qty - (received[l.id] ?? l.qty)), 0)

  const save = () => {
    const result = receiveTransfer(transfer.id, received, bin.trim() || 'RAK-TERIMA', reason.trim() || undefined)
    if (!result.ok) {
      setError(result.error ?? 'That transfer could not be received.')
      return
    }
    toast.push({
      tone: short > 0 ? 'warning' : 'success',
      title: `${transfer.code} received`,
      description: short > 0
        ? `${fmtNumber(short)} units short of what was sent — recorded as a variance.`
        : `Everything that was sent arrived at ${warehouses.find((w) => w.id === transfer.toWarehouseId)?.name}.`,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        icon={<PackageCheck />}
        title={`Receive ${transfer.code}`}
        description={`Into ${warehouses.find((w) => w.id === transfer.toWarehouseId)?.name}. Count what actually arrived — anything short of what was sent has to be explained.`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={save}>
              <PackageCheck /> Receive into stock
            </Button>
          </>
        }
      >
        <div className="space-y-4 p-5">
          <Field label="Destination bin" required>
            <Input value={bin} onChange={(e) => setBin(e.target.value.toUpperCase())} className="w-[200px]" />
          </Field>

          <div className="scrollbar-thin max-h-[300px] overflow-auto rounded-lg border border-border">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  <th className={TH}>Item</th>
                  <th className={`${TH} text-right`}>Sent</th>
                  <th className={`${TH} text-right`}>Arrived</th>
                </tr>
              </thead>
              <tbody>
                {transfer.lines.map((line) => {
                  const item = items.find((i) => i.id === line.itemId)
                  const value = received[line.id] ?? line.qty
                  return (
                    <tr key={line.id}>
                      <td className={TD}>
                        <p className="max-w-[240px] truncate font-medium text-fg">{item?.name}</p>
                        <p className="font-mono text-[11px] text-fg-subtle">{item?.sku}{line.batchNo ? ` · ${line.batchNo}` : ''}</p>
                      </td>
                      <td className={`${TD} tnum whitespace-nowrap text-right text-fg-muted`}>
                        {fmtNumber(line.qty)} <span className="text-[11px] text-fg-subtle">{item?.uom}</span>
                      </td>
                      <td className={`${TD} text-right`}>
                        <Input
                          type="number"
                          min={0}
                          max={line.qty}
                          value={value}
                          onChange={(e) => setReceived((r) => ({ ...r, [line.id]: Math.min(line.qty, Number(e.target.value)) }))}
                          invalid={value < line.qty}
                          className="tnum w-[92px]"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {short > 0 && (
            <Field label="What happened to the missing units" required hint={`${fmtNumber(short)} units short of what left the source warehouse`}>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Satu dus rusak terkena air dalam perjalanan…" invalid={!reason.trim()} />
            </Field>
          )}

          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-danger-soft/50 px-3 py-2.5 text-[12.5px] text-danger-soft-fg">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================
   The register
   ================================================================ */

export function StockTransfersPage() {
  const toast = useToast()
  const can = useCan()
  const { stockTransfers, warehouses, items, removeTransfers, dispatchTransfer, cancelTransfer, stock } = useErp()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<StockTransfer | null>(null)
  const [receiving, setReceiving] = React.useState<StockTransfer | null>(null)
  const [viewing, setViewing] = React.useState<StockTransfer | null>(null)
  const [cancelling, setCancelling] = React.useState<StockTransfer | null>(null)
  const [cancelReason, setCancelReason] = React.useState('')
  const [status, setStatus] = React.useState<string[]>([])
  const [route, setRoute] = React.useState<string[]>([])

  const nameOf = (id: string) => warehouses.find((w) => w.id === id)?.name ?? 'Unknown warehouse'
  const codeOf = (id: string) => warehouses.find((w) => w.id === id)?.code ?? '—'

  const inTransit = stockTransfers.filter((t) => t.status === 'IN_TRANSIT')
  const drafts = stockTransfers.filter((t) => t.status === 'DRAFT')
  const variance = stockTransfers.reduce((a, t) => a + transferVariance(t), 0)

  const columns: Column<StockTransfer>[] = [
    {
      key: 'code', header: 'Transfer', width: 'w-[160px]', sortable: true, pinned: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{r.code}</p>
          <p className="truncate text-[11px] text-fg-subtle">{fmtDate(r.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'route', header: 'Route', width: 'w-[268px] max-w-[268px]', sortable: true,
      sortValue: (r) => `${codeOf(r.fromWarehouseId)}→${codeOf(r.toWarehouseId)}`,
      exportValue: (r) => `${codeOf(r.fromWarehouseId)} → ${codeOf(r.toWarehouseId)}`,
      cell: (r) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-mono text-[12px] font-medium text-fg">
            {codeOf(r.fromWarehouseId)}
            <ArrowRight className="size-3.5 shrink-0 text-fg-subtle" />
            {codeOf(r.toWarehouseId)}
          </div>
          <p className="truncate text-[11px] text-fg-subtle">
            {nameOf(r.fromWarehouseId)} → {nameOf(r.toWarehouseId)}
          </p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', width: 'w-[136px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'lines', header: 'Lines', width: 'w-[80px]', align: 'right', sortable: true,
      sortValue: (r) => r.lines.length, exportValue: (r) => r.lines.length,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{r.lines.length}</span>,
    },
    {
      key: 'qty', header: 'Units', width: 'w-[108px]', align: 'right', sortable: true,
      sortValue: (r) => transferQty(r), exportValue: (r) => transferQty(r),
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{fmtNumber(transferQty(r))}</span>,
    },
    {
      key: 'variance', header: 'Short', width: 'w-[96px]', align: 'right', sortable: true,
      sortValue: (r) => transferVariance(r), exportValue: (r) => transferVariance(r),
      headerHint: 'Units that left the source and never arrived',
      cell: (r) => {
        const n = transferVariance(r)
        return n > 0 ? (
          <Tooltip content={r.lines.find((l) => l.varianceReason)?.varianceReason ?? 'Short on arrival'}>
            <span className="tnum text-[12.5px] font-medium text-danger">{fmtNumber(n)}</span>
          </Tooltip>
        ) : (
          <span className="text-[12px] text-fg-subtle">—</span>
        )
      },
    },
    {
      key: 'value', header: 'Value', width: 'w-[140px]', align: 'right', sortable: true,
      sortValue: (r) => transferValue(r), exportValue: (r) => Math.round(transferValue(r)),
      cell: (r) => <span className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(transferValue(r), 'IDR', { compact: true })}</span>,
    },
    {
      key: 'reason', header: 'Reason', width: 'w-[280px] max-w-[280px]', sortable: false,
      exportValue: (r) => r.reason,
      cell: (r) => <p className="truncate text-[12px] text-fg-muted">{r.reason}</p>,
    },
    {
      key: 'dispatched', header: 'Dispatched', width: 'w-[150px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.dispatchedAt ?? '', exportValue: (r) => r.dispatchedAt?.slice(0, 10) ?? '',
      cell: (r) =>
        r.dispatchedAt ? (
          <div className="min-w-0">
            <p className="tnum text-[12px] text-fg-muted">{fmtDate(r.dispatchedAt)}</p>
            <p className="truncate text-[11px] text-fg-subtle">{r.dispatchedBy}</p>
          </div>
        ) : (
          <span className="text-[12px] text-fg-subtle">—</span>
        ),
    },
    {
      key: 'received', header: 'Received', width: 'w-[150px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.receivedAt ?? '', exportValue: (r) => r.receivedAt?.slice(0, 10) ?? '',
      cell: (r) =>
        r.receivedAt ? (
          <div className="min-w-0">
            <p className="tnum text-[12px] text-fg-muted">{fmtDate(r.receivedAt)}</p>
            <p className="truncate text-[11px] text-fg-subtle">{r.receivedBy}</p>
          </div>
        ) : (
          <span className="text-[12px] text-fg-subtle">—</span>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Stock Transfers"
        description="Goods moving between warehouses. Stock leaves the source when the transfer is dispatched and arrives when it is received — in between it belongs to neither, which is what in transit means."
        actions={
          can('transfers.create') ? (
            <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus /> New transfer
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="In transit"
          value={inTransit.length}
          icon={<Truck />}
          accent={inTransit.length ? 'primary' : 'neutral'}
          sub={`${fmtNumber(inTransit.reduce((a, t) => a + transferQty(t), 0))} units on the road`}
        />
        <KpiCard
          label="Value in transit"
          value={fmtCurrency(inTransit.reduce((a, t) => a + transferValue(t), 0), 'IDR', { compact: true })}
          icon={<WarehouseIcon />}
          accent="accent"
          sub="counted in neither warehouse"
        />
        <KpiCard
          label="Drafts"
          value={drafts.length}
          icon={<Send />}
          accent={drafts.length ? 'warning' : 'success'}
          sub={drafts.length ? 'raised but not dispatched' : 'nothing waiting to be sent'}
        />
        <KpiCard
          label="Lost in transit"
          value={fmtNumber(variance)}
          icon={<AlertTriangle />}
          accent={variance ? 'danger' : 'success'}
          sub="units short on arrival, all time"
        />
      </div>

      <DataTable
        data={stockTransfers}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => r.code}
        entityLabel="transfer"
        storageKey="stock-transfers"
        allowExport={can('transfers.export')}
        exportName="tata-gemilang-stock-transfers"
        searchText={(r) =>
          [r.code, r.reason, r.note, r.requestedBy, nameOf(r.fromWarehouseId), nameOf(r.toWarehouseId), r.status]
            .filter(Boolean)
            .join(' ')
        }
        initialSort={{ key: 'code', dir: 'desc' }}
        onRowClick={(r) => setViewing(r)}
        rowTone={(r) => (r.status === 'IN_TRANSIT' ? 'bg-primary-soft/25' : undefined)}
        onDelete={can('transfers.edit') ? (ids) => removeTransfers(ids) : undefined}
        deleteNote="A transfer in transit cannot be deleted: its stock has already left the source warehouse and would be stranded. Cancel it instead, which puts the goods back."
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'].map((v) => ({ value: v, label: v.replace(/_/g, ' ').toLowerCase() })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'route', label: 'Warehouse', values: route, onChange: setRoute,
            options: warehouses.map((w) => ({ value: w.id, label: w.name })),
            match: (r, v) => v.includes(r.fromWarehouseId) || v.includes(r.toWarehouseId),
          },
        ]}
        rowActions={(r) => (
          <>
            <Tooltip content="Open the transfer">
              <Button variant="ghost" size="iconXs" onClick={() => setViewing(r)}>
                <Eye />
              </Button>
            </Tooltip>
            {can('transfers.dispatch') && r.status === 'DRAFT' && (
              <Tooltip content={dispatchProblem(r, stock) || 'Dispatch — stock leaves the source now'}>
                <span>
                  <Button
                    variant="ghost"
                    size="iconXs"
                    disabled={!!dispatchProblem(r, stock)}
                    onClick={() => {
                      const result = dispatchTransfer(r.id)
                      toast.push({
                        tone: result.ok ? 'success' : 'error',
                        title: result.ok ? `${r.code} dispatched` : 'Cannot dispatch',
                        description: result.ok
                          ? `${fmtNumber(transferQty(r))} units left ${nameOf(r.fromWarehouseId)}.`
                          : result.error ?? '',
                      })
                    }}
                  >
                    <Send />
                  </Button>
                </span>
              </Tooltip>
            )}
            {can('transfers.receive') && r.status === 'IN_TRANSIT' && (
              <Tooltip content="Receive into the destination warehouse">
                <Button variant="ghost" size="iconXs" onClick={() => setReceiving(r)}>
                  <PackageCheck />
                </Button>
              </Tooltip>
            )}
            {can('transfers.edit') && (r.status === 'DRAFT' || r.status === 'IN_TRANSIT') && (
              <Tooltip content={r.status === 'IN_TRANSIT' ? 'Cancel — the stock goes back to the source' : 'Cancel this transfer'}>
                <Button variant="ghost" size="iconXs" onClick={() => { setCancelling(r); setCancelReason('') }}>
                  <Ban />
                </Button>
              </Tooltip>
            )}
          </>
        )}
        footerSummary={(rows) => (
          <span className="tnum">
            {fmtNumber(rows.reduce((a, r) => a + transferQty(r), 0))} units ·{' '}
            {fmtCurrency(rows.reduce((a, r) => a + transferValue(r), 0), 'IDR', { compact: true })} in this view
          </span>
        )}
        emptyTitle="No transfers yet"
        emptyDescription="Move stock from the central warehouse to a regional store, or between regions."
      />

      <TransferForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />
      {receiving && <ReceiveDialog transfer={receiving} open={!!receiving} onOpenChange={(v) => !v && setReceiving(null)} />}

      {/* One transfer, read-only */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent
          size="lg"
          icon={<Truck />}
          title={viewing ? `${viewing.code} — ${nameOf(viewing.fromWarehouseId)} → ${nameOf(viewing.toWarehouseId)}` : ''}
          description={viewing?.reason}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setViewing(null)}>Close</Button>
              {viewing && can('transfers.edit') && viewing.status === 'DRAFT' && (
                <Button variant="primary" size="sm" onClick={() => { setEditing(viewing); setViewing(null); setFormOpen(true) }}>
                  Edit
                </Button>
              )}
              {viewing && can('transfers.receive') && viewing.status === 'IN_TRANSIT' && (
                <Button variant="primary" size="sm" onClick={() => { setReceiving(viewing); setViewing(null) }}>
                  <PackageCheck /> Receive
                </Button>
              )}
            </>
          }
        >
          {viewing && (
            <div>
              <div className="flex flex-wrap items-center gap-2 px-5 py-3">
                <StatusBadge value={viewing.status} size="sm" />
                <Badge tone="outline" size="sm">raised by {viewing.requestedBy || '—'}</Badge>
                {viewing.dispatchedAt && <Badge tone="outline" size="sm">dispatched {fmtDate(viewing.dispatchedAt)}</Badge>}
                {viewing.receivedAt && <Badge tone="outline" size="sm">received {fmtDate(viewing.receivedAt)}</Badge>}
                {viewing.expectedAt && !viewing.receivedAt && <Badge tone="outline" size="sm">expected {fmtDate(viewing.expectedAt)}</Badge>}
              </div>
              <div className="scrollbar-thin max-h-[340px] overflow-auto border-t border-border">
                <table className="w-full border-separate border-spacing-0 text-[13px]">
                  <thead>
                    <tr>
                      <th className={TH}>Item</th>
                      <th className={`${TH} text-right`}>Sent</th>
                      <th className={`${TH} text-right`}>Arrived</th>
                      <th className={`${TH} text-right`}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewing.lines.map((line) => {
                      const item = items.find((i) => i.id === line.itemId)
                      const arrived = line.qtyReceived
                      return (
                        <tr key={line.id}>
                          <td className={TD}>
                            <p className="max-w-[240px] truncate font-medium text-fg">{item?.name}</p>
                            <p className="font-mono text-[11px] text-fg-subtle">{item?.sku}{line.batchNo ? ` · ${line.batchNo}` : ''}</p>
                          </td>
                          <td className={`${TD} tnum whitespace-nowrap text-right text-fg`}>
                            {fmtNumber(line.qty)} <span className="text-[11px] text-fg-subtle">{item?.uom}</span>
                          </td>
                          <td className={`${TD} tnum whitespace-nowrap text-right`}>
                            {arrived === undefined ? (
                              <span className="text-[12px] text-fg-subtle">not yet</span>
                            ) : arrived < line.qty ? (
                              <span className="font-medium text-danger">{fmtNumber(arrived)}</span>
                            ) : (
                              <span className="font-medium text-fg">{fmtNumber(arrived)}</span>
                            )}
                            {line.varianceReason && <p className="mt-0.5 max-w-[220px] text-[11px] font-normal text-fg-subtle">{line.varianceReason}</p>}
                          </td>
                          <td className={`${TD} tnum whitespace-nowrap text-right text-fg-muted`}>{fmtCurrency(line.qty * line.unitCost, 'IDR', { compact: true })}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {viewing.note && <p className="px-5 py-3 text-[12.5px] text-fg-muted">{viewing.note}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelling} onOpenChange={(v) => !v && setCancelling(null)}>
        <DialogContent
          icon={<Ban />}
          title={cancelling ? `Cancel ${cancelling.code}?` : ''}
          description={
            cancelling?.status === 'IN_TRANSIT'
              ? 'The goods have already left the source warehouse, so cancelling puts them back on its shelves.'
              : 'Nothing has moved, so cancelling only closes the paperwork.'
          }
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setCancelling(null)}>Keep it</Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!cancelReason.trim()}
                onClick={() => {
                  if (!cancelling) return
                  const result = cancelTransfer(cancelling.id, cancelReason.trim())
                  toast.push({
                    tone: result.ok ? 'warning' : 'error',
                    title: result.ok ? `${cancelling.code} cancelled` : 'Cannot cancel',
                    description: result.ok
                      ? cancelling.status === 'IN_TRANSIT'
                        ? `${fmtNumber(transferQty(cancelling))} units are back at ${nameOf(cancelling.fromWarehouseId)}.`
                        : 'Nothing moved.'
                      : result.error ?? '',
                  })
                  setCancelling(null)
                }}
              >
                Cancel the transfer
              </Button>
            </>
          }
        >
          <div className="p-5">
            <Field label="Reason" required>
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} placeholder="Permintaan ganda — barang sudah dikirim lewat transfer lain…" />
            </Field>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
