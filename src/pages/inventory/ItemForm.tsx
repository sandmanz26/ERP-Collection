import * as React from 'react'
import { Boxes, Ruler, Truck } from 'lucide-react'
import type { InventoryItem } from '@/data/types'
import { ITEM_CATEGORIES, SERVICE_TYPES, SUPPLIERS, UOMS } from '@/data/reference'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { MultiSelect, Select } from '@/components/ui/select'
import { SwitchField } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { useErp } from '@/store/useErp'
import { uid } from '@/lib/utils'
import { fmtCurrency, fmtDateTime } from '@/lib/format'

const blank = (): InventoryItem => ({
  id: uid('itm'), sku: '', name: '', description: '', category: 'CONSUMABLE', subCategory: '', uom: 'PCS',
  brand: '', variant: '', barcode: '', standardCost: 0,
  minStock: 0, maxStock: 0, reorderPoint: 0, reorderQty: 0,
  trackBatch: false, hasExpiry: false, hazardous: false,
  defaultSupplier: '', leadTimeDays: 14, serviceTypes: ['CLEANING'], status: 'ACTIVE',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: '',
})

export function ItemForm({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: InventoryItem | null
}) {
  const { items, upsertItem } = useErp()
  const toast = useToast()
  const [tab, setTab] = React.useState<'identity' | 'planning' | 'handling'>('identity')
  const [draft, setDraft] = React.useState<InventoryItem>(blank)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank())
      setTab('identity')
      setErrors({})
    }
  }, [open, initial])

  const set = <K extends keyof InventoryItem>(k: K, v: InventoryItem[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.sku.trim()) e.sku = 'An SKU is required'
    if (items.some((i) => i.sku === draft.sku && i.id !== draft.id)) e.sku = 'This SKU is already used'
    if (!draft.name.trim()) e.name = 'The item name is required'
    if (draft.standardCost < 0) e.standardCost = 'Cost cannot be negative'
    if (draft.maxStock > 0 && draft.maxStock < draft.minStock) e.maxStock = 'Maximum has to be at least the minimum'
    if (draft.reorderPoint > 0 && draft.reorderPoint < draft.minStock) e.reorderPoint = 'Reorder point sits at or above the minimum, or stock runs out while the order is in transit'
    if (draft.hasExpiry && !draft.shelfLifeDays) e.shelfLifeDays = 'Give the shelf life in days'
    if (draft.serviceTypes.length === 0) e.serviceTypes = 'Name at least one service line that uses this item'
    setErrors(e)
    if (e.shelfLifeDays) setTab('handling')
    else if (e.maxStock || e.reorderPoint) setTab('planning')
    else if (Object.keys(e).length) setTab('identity')
    if (Object.keys(e).length) return

    upsertItem(draft)
    toast.push({
      tone: 'success',
      title: initial ? 'Item updated' : 'Item created',
      description: `${draft.sku} — ${draft.name}`,
    })
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-3xl"
      eyebrow={
        <Badge tone={initial ? 'primary' : 'accent'} size="sm">
          {initial ? `Editing ${initial.sku}` : 'New item'}
        </Badge>
      }
      title={initial ? initial.name : 'Create a master item'}
      description="The definition of a thing, held once. Quantities belong to warehouse stock, never here."
      footer={
        <>
          {initial && (
            <span className="mr-auto text-[11.5px] text-fg-subtle">
              Last updated {fmtDateTime(initial.updatedAt)} by {initial.updatedBy || 'unknown'}
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save}>
            {initial ? 'Save changes' : 'Create item'}
          </Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        className="px-5"
        items={[
          { value: 'identity', label: 'Identity', icon: <Boxes /> },
          { value: 'planning', label: 'Planning levels', icon: <Ruler /> },
          { value: 'handling', label: 'Handling & supply', icon: <Truck /> },
        ]}
      />

      {tab === 'identity' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="SKU" required error={errors.sku} help="Use the pattern ITM-<group>-<number>, e.g. ITM-UNI-0015.">
            <Input value={draft.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} className="font-mono" placeholder="ITM-UNI-0015" invalid={!!errors.sku} />
          </Field>
          <Field label="Status">
            <Select
              value={draft.status}
              onChange={(v) => set('status', v)}
              options={[
                { value: 'ACTIVE', label: 'Active', description: 'Can be bought and issued' },
                { value: 'DISCONTINUED', label: 'Discontinued', description: 'Existing stock is used up, no reordering' },
              ]}
            />
          </Field>
          <Field label="Item name" required error={errors.name} className="sm:col-span-2">
            <Input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Seragam Security PDL Lengan Panjang" invalid={!!errors.name} />
          </Field>
          <Field label="Category">
            <Select
              searchable
              value={draft.category}
              onChange={(v) => set('category', v)}
              options={ITEM_CATEGORIES.map((c) => ({ value: c.value, label: c.label, description: c.description }))}
            />
          </Field>
          <Field label="Sub-category" hint="optional">
            <Input value={draft.subCategory ?? ''} onChange={(e) => set('subCategory', e.target.value)} placeholder="Seragam Security" />
          </Field>
          <Field label="Unit of measure" help="The unit stock is counted and issued in.">
            <Select value={draft.uom} onChange={(v) => set('uom', v)} options={UOMS.map((u) => ({ value: u.value, label: u.label }))} />
          </Field>
          <Field label="Standard cost (IDR)" required error={errors.standardCost} hint={fmtCurrency(draft.standardCost, 'IDR')}>
            <Input type="number" min={0} step={1_000} value={draft.standardCost} onChange={(e) => set('standardCost', Number(e.target.value))} className="tnum" invalid={!!errors.standardCost} />
          </Field>
          <Field label="Brand" hint="optional">
            <Input value={draft.brand ?? ''} onChange={(e) => set('brand', e.target.value)} />
          </Field>
          <Field label="Variant" hint="size range, colour">
            <Input value={draft.variant ?? ''} onChange={(e) => set('variant', e.target.value)} placeholder="Biru tua, S–XXL" />
          </Field>
          <Field label="Barcode" hint="optional">
            <Input value={draft.barcode ?? ''} onChange={(e) => set('barcode', e.target.value)} className="font-mono" />
          </Field>
          <Field label="Used by service lines" required error={errors.serviceTypes}>
            <MultiSelect
              values={draft.serviceTypes}
              onChange={(v) => set('serviceTypes', v)}
              options={SERVICE_TYPES.map((s) => ({ value: s.value, label: s.label }))}
              placeholder="Pick at least one"
              maxTags={2}
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea value={draft.description ?? ''} onChange={(e) => set('description', e.target.value)} rows={2} />
          </Field>
        </div>
      )}

      {tab === 'planning' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Minimum stock" help="Company-wide floor. A warehouse can hold a tighter override on its own line.">
            <Input type="number" min={0} value={draft.minStock} onChange={(e) => set('minStock', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Maximum stock" error={errors.maxStock}>
            <Input type="number" min={0} value={draft.maxStock} onChange={(e) => set('maxStock', Number(e.target.value))} className="tnum" invalid={!!errors.maxStock} />
          </Field>
          <Field label="Reorder point" error={errors.reorderPoint} help="Available quantity that triggers a purchase order.">
            <Input type="number" min={0} value={draft.reorderPoint} onChange={(e) => set('reorderPoint', Number(e.target.value))} className="tnum" invalid={!!errors.reorderPoint} />
          </Field>
          <Field label="Reorder quantity">
            <Input type="number" min={0} value={draft.reorderQty} onChange={(e) => set('reorderQty', Number(e.target.value))} className="tnum" />
          </Field>
          <div className="sm:col-span-2 rounded-xl border border-border bg-surface-sunken px-3.5 py-3 text-[12px] leading-relaxed text-fg-muted">
            With a {draft.leadTimeDays}-day lead time, ordering {draft.reorderQty} {draft.uom} once availability reaches{' '}
            {draft.reorderPoint} {draft.uom} keeps roughly {Math.max(0, draft.reorderPoint - draft.minStock)} {draft.uom} of cover
            above the minimum while the order is in transit.
          </div>
        </div>
      )}

      {tab === 'handling' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Default supplier">
            <Select
              searchable
              clearable
              value={draft.defaultSupplier || null}
              onChange={(v) => set('defaultSupplier', v)}
              onClear={() => set('defaultSupplier', '')}
              options={SUPPLIERS.map((s) => ({ value: s, label: s }))}
              placeholder="Not set"
            />
          </Field>
          <Field label="Lead time (days)">
            <Input type="number" min={0} value={draft.leadTimeDays} onChange={(e) => set('leadTimeDays', Number(e.target.value))} className="tnum" />
          </Field>
          {draft.hasExpiry && (
            <Field label="Shelf life (days)" required error={errors.shelfLifeDays}>
              <Input
                type="number"
                min={1}
                value={draft.shelfLifeDays ?? 0}
                onChange={(e) => set('shelfLifeDays', Number(e.target.value))}
                className="tnum"
                invalid={!!errors.shelfLifeDays}
              />
            </Field>
          )}
          <div className="sm:col-span-2 space-y-3.5 rounded-xl border border-border bg-surface-sunken p-3.5">
            <SwitchField
              checked={draft.trackBatch}
              onChange={(v) => set('trackBatch', v)}
              label="Track by batch"
              description="Stock lines carry a batch number so a recall or a bad delivery can be traced."
            />
            <SwitchField
              checked={draft.hasExpiry}
              onChange={(v) => set('hasExpiry', v)}
              label="Has an expiry date"
              description="Warehouse stock warns 60 days out and flags anything already past its date."
            />
            <SwitchField
              checked={draft.hazardous}
              onChange={(v) => set('hazardous', v)}
              label="Hazardous material"
              description="Needs segregated storage and a safety data sheet on site."
            />
          </div>
        </div>
      )}
    </Sheet>
  )
}
