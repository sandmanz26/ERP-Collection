import * as React from 'react'
import type { Warehouse } from '@/data/types'
import { PROVINCES, WAREHOUSE_TYPES } from '@/data/reference'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import { useToast } from '@/components/ui/toast'
import { useErp } from '@/store/useErp'
import { uid } from '@/lib/utils'

const blank = (): Warehouse => ({
  id: uid('wh'), code: '', name: '', type: 'REGIONAL', address: '', city: '', province: 'DKI Jakarta',
  managerName: '', phone: '', capacitySqm: 0, status: 'ACTIVE', openedAt: new Date().toISOString(), notes: '',
})

export function WarehouseForm({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Warehouse | null
}) {
  const { warehouses, upsertWarehouse } = useErp()
  const toast = useToast()
  const [draft, setDraft] = React.useState<Warehouse>(blank)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank())
      setErrors({})
    }
  }, [open, initial])

  const set = <K extends keyof Warehouse>(k: K, v: Warehouse[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.code.trim()) e.code = 'A warehouse code is required'
    if (warehouses.some((w) => w.code === draft.code && w.id !== draft.id)) e.code = 'This code is already used'
    if (!draft.name.trim()) e.name = 'The warehouse name is required'
    if (!draft.city.trim()) e.city = 'City is required'
    if (!draft.managerName.trim()) e.managerName = 'Name the person responsible for this stock'
    setErrors(e)
    if (Object.keys(e).length) return

    upsertWarehouse(draft)
    toast.push({
      tone: 'success',
      title: initial ? 'Warehouse updated' : 'Warehouse created',
      description: `${draft.code} — ${draft.name}`,
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
          {initial ? `Editing ${initial.code}` : 'New warehouse'}
        </Badge>
      }
      title={initial ? initial.name : 'Create a warehouse'}
      description="A warehouse holds many stock lines; each line points at one item in the master."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save}>
            {initial ? 'Save changes' : 'Create warehouse'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Warehouse code" required error={errors.code}>
          <Input value={draft.code} onChange={(e) => set('code', e.target.value)} className="font-mono" placeholder="WH-JKT-07" invalid={!!errors.code} />
        </Field>
        <Field label="Status">
          <Select
            value={draft.status}
            onChange={(v) => set('status', v)}
            options={[
              { value: 'ACTIVE', label: 'Active', description: 'Receiving and issuing stock' },
              { value: 'INACTIVE', label: 'Inactive', description: 'Closed or not yet opened' },
            ]}
          />
        </Field>
        <Field label="Warehouse name" required error={errors.name} className="sm:col-span-2">
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Gudang Regional Semarang" invalid={!!errors.name} />
        </Field>
        <Field label="Type" help="Central receives from suppliers; regional serves an area; a site store sits inside a client building.">
          <Select
            value={draft.type}
            onChange={(v) => set('type', v)}
            options={WAREHOUSE_TYPES.map((t) => ({ value: t.value, label: t.label, description: t.description }))}
          />
        </Field>
        <Field label="Capacity (m²)">
          <Input type="number" min={0} value={draft.capacitySqm} onChange={(e) => set('capacitySqm', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input value={draft.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="City" required error={errors.city}>
          <Input value={draft.city} onChange={(e) => set('city', e.target.value)} invalid={!!errors.city} />
        </Field>
        <Field label="Province">
          <Select searchable value={draft.province} onChange={(v) => set('province', v)} options={PROVINCES.map((p) => ({ value: p, label: p }))} />
        </Field>
        <Field label="Warehouse manager" required error={errors.managerName}>
          <Input value={draft.managerName} onChange={(e) => set('managerName', e.target.value)} invalid={!!errors.managerName} />
        </Field>
        <Field label="Phone">
          <Input value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Opened">
          <DatePicker value={draft.openedAt} onChange={(v) => set('openedAt', v ?? draft.openedAt)} quickRanges={false} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={2} />
        </Field>
      </div>
    </Sheet>
  )
}
