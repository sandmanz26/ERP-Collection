import * as React from 'react'
import { AlertTriangle } from 'lucide-react'
import type { WarehouseStock } from '@/data/types'
import { STOCK_CONDITIONS, itemCategoryLabel } from '@/data/reference'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import { useToast } from '@/components/ui/toast'
import { useErp } from '@/store/useErp'
import { uid } from '@/lib/utils'
import { fmtCurrency, fmtNumber } from '@/lib/format'
import { availableQty, effectiveMin, stockStatus } from '@/lib/domain'

const blank = (warehouseId: string, itemId: string): WarehouseStock => ({
  id: uid('stk'), warehouseId, itemId, binLocation: '', qtyOnHand: 0, qtyReserved: 0,
  unitCost: 0, condition: 'GOOD', lastCountedAt: new Date().toISOString(), lastMovementAt: new Date().toISOString(),
})

export function StockForm({
  open,
  onOpenChange,
  initial,
  defaultWarehouseId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: WarehouseStock | null
  defaultWarehouseId?: string
}) {
  const { stock, warehouses, items, upsertStock } = useErp()
  const toast = useToast()
  const [draft, setDraft] = React.useState<WarehouseStock>(() =>
    blank(defaultWarehouseId ?? warehouses[0]?.id ?? '', items[0]?.id ?? ''),
  )
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank(defaultWarehouseId ?? warehouses[0]?.id ?? '', items[0]?.id ?? ''))
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, defaultWarehouseId])

  const set = <K extends keyof WarehouseStock>(k: K, v: WarehouseStock[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const item = items.find((i) => i.id === draft.itemId)
  const warehouse = warehouses.find((w) => w.id === draft.warehouseId)
  const duplicate = stock.find(
    (s) => s.id !== draft.id && s.warehouseId === draft.warehouseId && s.itemId === draft.itemId && (s.batchNo ?? '') === (draft.batchNo ?? ''),
  )
  const status = stockStatus(draft, item)

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.warehouseId) e.warehouseId = 'Pick the warehouse holding this stock'
    if (!draft.itemId) e.itemId = 'A stock line points at exactly one master item'
    if (!draft.binLocation.trim()) e.binLocation = 'Give the bin or rack it sits in'
    if (draft.qtyOnHand < 0) e.qtyOnHand = 'Quantity cannot be negative'
    if (draft.qtyReserved < 0) e.qtyReserved = 'Reserved cannot be negative'
    if (draft.qtyReserved > draft.qtyOnHand) e.qtyReserved = 'More is reserved than is on hand'
    if (draft.unitCost < 0) e.unitCost = 'Unit cost cannot be negative'
    if (item?.trackBatch && !draft.batchNo?.trim()) e.batchNo = `${item.name} is batch tracked — record the batch number`
    if (item?.hasExpiry && !draft.expiryDate) e.expiryDate = `${item.name} carries an expiry date`
    if (duplicate) e.itemId = `${warehouse?.code} already holds this item in bin ${duplicate.binLocation}. Edit that line instead.`
    setErrors(e)
    if (Object.keys(e).length) return

    upsertStock(draft)
    toast.push({
      tone: 'success',
      title: initial ? 'Stock line updated' : 'Stock line created',
      description: `${item?.sku ?? ''} at ${warehouse?.code ?? ''} · ${fmtNumber(draft.qtyOnHand)} ${item?.uom ?? ''}`,
    })
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-2xl"
      eyebrow={
        <Badge tone={initial ? 'primary' : 'accent'} size="sm">
          {initial ? 'Editing stock line' : 'New stock line'}
        </Badge>
      }
      title={item ? item.name : 'Record stock'}
      description="One line holds one item, in one warehouse, in one bin."
      footer={
        <>
          <span className="mr-auto text-[12px] text-fg-muted">
            Available <span className="tnum font-medium text-fg">{fmtNumber(availableQty(draft))}</span> ·{' '}
            value <span className="tnum font-medium text-fg">{fmtCurrency(draft.qtyOnHand * draft.unitCost, 'IDR', { compact: true })}</span>
          </span>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save}>
            {initial ? 'Save changes' : 'Create stock line'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Warehouse" required error={errors.warehouseId}>
          <Select
            searchable
            value={draft.warehouseId}
            onChange={(v) => set('warehouseId', v)}
            invalid={!!errors.warehouseId}
            options={warehouses.map((w) => ({ value: w.id, label: w.name, description: `${w.code} · ${w.city}`, disabled: w.status === 'INACTIVE' }))}
          />
        </Field>
        <Field label="Bin / rack" required error={errors.binLocation}>
          <Input value={draft.binLocation} onChange={(e) => set('binLocation', e.target.value)} className="font-mono" placeholder="RAK-A-01-1" invalid={!!errors.binLocation} />
        </Field>
        <Field
          label="Master item"
          required
          error={errors.itemId}
          className="sm:col-span-2"
          help="Every stock line refers to exactly one item in the master; the item's unit, cost and handling rules follow from it."
        >
          <Select
            searchable
            value={draft.itemId}
            onChange={(v) => {
              const picked = items.find((i) => i.id === v)
              setDraft((d) => ({ ...d, itemId: v, unitCost: d.unitCost || picked?.standardCost || 0 }))
            }}
            invalid={!!errors.itemId}
            options={items.map((i) => ({
              value: i.id,
              label: i.name,
              description: `${i.sku} · ${i.uom} · ${fmtCurrency(i.standardCost, 'IDR')}`,
              group: itemCategoryLabel(i.category),
              disabled: i.status === 'DISCONTINUED' && !initial,
            }))}
          />
        </Field>

        {item && (
          <div className="sm:col-span-2 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-surface-sunken px-3.5 py-3 text-[12px] text-fg-muted">
            <span className="font-mono text-fg">{item.sku}</span>
            <span>Unit: {item.uom}</span>
            <span>Standard cost {fmtCurrency(item.standardCost, 'IDR')}</span>
            <span>Company minimum {fmtNumber(item.minStock)}</span>
            {item.trackBatch && <Badge tone="neutral" size="sm">Batch tracked</Badge>}
            {item.hasExpiry && <Badge tone="purple" size="sm">Expiry</Badge>}
            {item.hazardous && <Badge tone="warning" size="sm">Hazardous</Badge>}
          </div>
        )}

        <Field label="Quantity on hand" required error={errors.qtyOnHand}>
          <Input type="number" min={0} value={draft.qtyOnHand} onChange={(e) => set('qtyOnHand', Number(e.target.value))} className="tnum" invalid={!!errors.qtyOnHand} />
        </Field>
        <Field label="Reserved" error={errors.qtyReserved} help="Already promised to a project; not available to anyone else.">
          <Input type="number" min={0} value={draft.qtyReserved} onChange={(e) => set('qtyReserved', Number(e.target.value))} className="tnum" invalid={!!errors.qtyReserved} />
        </Field>
        <Field label="Unit cost (IDR)" required error={errors.unitCost} help="What this bin actually cost, which may differ from the master's standard cost.">
          <Input type="number" min={0} step={1_000} value={draft.unitCost} onChange={(e) => set('unitCost', Number(e.target.value))} className="tnum" invalid={!!errors.unitCost} />
        </Field>
        <Field label="Condition">
          <Select value={draft.condition} onChange={(v) => set('condition', v)} options={STOCK_CONDITIONS.map((c) => ({ value: c.value, label: c.label }))} />
        </Field>
        <Field label="Batch number" error={errors.batchNo} hint={item?.trackBatch ? 'required for this item' : 'optional'}>
          <Input value={draft.batchNo ?? ''} onChange={(e) => set('batchNo', e.target.value)} className="font-mono" invalid={!!errors.batchNo} />
        </Field>
        <Field label="Expiry date" error={errors.expiryDate} hint={item?.hasExpiry ? 'required for this item' : 'optional'}>
          <DatePicker value={draft.expiryDate ?? null} onChange={(v) => set('expiryDate', v ?? undefined)} quickRanges={false} />
        </Field>
        <Field label="Minimum override" help="Leave empty to follow the master's minimum. Set it when this warehouse runs to a different plan.">
          <Input
            type="number"
            min={0}
            value={draft.minStockOverride ?? ''}
            onChange={(e) => set('minStockOverride', e.target.value === '' ? undefined : Number(e.target.value))}
            className="tnum"
            placeholder={item ? String(item.minStock) : ''}
          />
        </Field>
        <Field label="Last counted">
          <DatePicker value={draft.lastCountedAt ?? null} onChange={(v) => set('lastCountedAt', v ?? undefined)} quickRanges={false} />
        </Field>

        <div className="sm:col-span-2 rounded-xl border border-border bg-surface px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px]">
            <span className="text-fg-muted">
              Available <span className="tnum font-semibold text-fg">{fmtNumber(availableQty(draft))}</span> {item?.uom}
            </span>
            <span className="text-fg-muted">
              Against minimum <span className="tnum font-semibold text-fg">{fmtNumber(effectiveMin(draft, item))}</span>
            </span>
            <span className="text-fg-muted">
              Value <span className="tnum font-semibold text-fg">{fmtCurrency(draft.qtyOnHand * draft.unitCost, 'IDR')}</span>
            </span>
            <Badge tone={status === 'OUT_OF_STOCK' ? 'danger' : status === 'LOW' ? 'warning' : status === 'OVERSTOCK' ? 'purple' : 'success'} size="md">
              {status.replace(/_/g, ' ').toLowerCase()}
            </Badge>
          </div>
          {duplicate && (
            <p className="mt-2 flex items-start gap-2 text-[12px] leading-relaxed text-warning-soft-fg">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              This warehouse already holds that item{draft.batchNo ? ` in batch ${draft.batchNo}` : ''}. Two lines for the same
              item and batch would double-count the stock.
            </p>
          )}
        </div>
      </div>
    </Sheet>
  )
}
