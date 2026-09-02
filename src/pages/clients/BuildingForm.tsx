import * as React from 'react'
import type { Building } from '@/data/types'
import { BUILDING_TYPES, OPERATING_HOURS, PROVINCES, SHIFT_PATTERNS } from '@/data/reference'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { nextCode, uid } from '@/lib/utils'
import { fmtNumber } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { useToast } from '@/components/ui/toast'

const blank = (existing: Building[], clientId: string): Building => ({
  id: uid('bld'),
  code: nextCode('BLD', existing.map((b) => b.code)),
  clientId,
  name: '', type: 'OFFICE_TOWER', address: '', city: '', province: 'DKI Jakarta', postalCode: '',
  floors: 1, areaSqm: 0, operatingHours: 'OFFICE_HOURS', shiftPattern: 'NON_SHIFT',
  picName: '', picPhone: '', picEmail: '', accessNote: '', status: 'ACTIVE',
  createdAt: new Date().toISOString(),
})

export function BuildingForm({
  open,
  onOpenChange,
  initial,
  defaultClientId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Building | null
  defaultClientId?: string
}) {
  const { buildings, clients, upsertBuilding } = useErp()
  const toast = useToast()
  const [draft, setDraft] = React.useState<Building>(() => blank(buildings, defaultClientId ?? clients[0]?.id ?? ''))
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank(buildings, defaultClientId ?? clients[0]?.id ?? ''))
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, defaultClientId])

  const set = <K extends keyof Building>(k: K, v: Building[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.code.trim()) e.code = 'A building code is required'
    if (buildings.some((b) => b.code === draft.code && b.id !== draft.id)) e.code = 'This code is already used'
    if (!draft.name.trim()) e.name = 'The building name is required'
    if (!draft.clientId) e.clientId = 'Pick the client that operates this building'
    if (!draft.city.trim()) e.city = 'City is required'
    if (!draft.picName.trim()) e.picName = 'Name the site contact'
    if (draft.floors < 1) e.floors = 'At least one floor'
    if (draft.areaSqm < 0) e.areaSqm = 'Area cannot be negative'
    setErrors(e)
    if (Object.keys(e).length) return

    upsertBuilding(draft)
    toast.push({
      tone: 'success',
      title: initial ? 'Building updated' : 'Building created',
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
          {initial ? `Editing ${initial.code}` : 'New building'}
        </Badge>
      }
      title={initial ? initial.name : 'Create a building'}
      description="A building belongs to one client and can carry one running project at a time."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save}>
            {initial ? 'Save changes' : 'Create building'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Building code" required error={errors.code}>
          <Input value={draft.code} onChange={(e) => set('code', e.target.value)} className="font-mono" invalid={!!errors.code} />
        </Field>
        <Field label="Status">
          <Select
            value={draft.status}
            onChange={(v) => set('status', v)}
            options={[
              { value: 'ACTIVE', label: 'Active', description: 'Can carry a project' },
              { value: 'INACTIVE', label: 'Inactive', description: 'No longer served' },
            ]}
          />
        </Field>
        <Field label="Client" required error={errors.clientId} className="sm:col-span-2">
          <Select
            searchable
            value={draft.clientId}
            onChange={(v) => set('clientId', v)}
            invalid={!!errors.clientId}
            options={clients.map((c) => ({
              value: c.id,
              label: c.brandName || c.legalName,
              description: `${c.code} · ${c.city}`,
            }))}
            placeholder="Pick a client"
          />
        </Field>
        <Field label="Building name" required error={errors.name} className="sm:col-span-2">
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Menara Contoh" invalid={!!errors.name} />
        </Field>
        <Field label="Type">
          <Select value={draft.type} onChange={(v) => set('type', v)} options={BUILDING_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
        </Field>
        <Field label="Floors" required error={errors.floors}>
          <Input type="number" min={1} value={draft.floors} onChange={(e) => set('floors', Number(e.target.value))} className="tnum" invalid={!!errors.floors} />
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
        <Field label="Gross area" hint={`${fmtNumber(draft.areaSqm)} m²`} error={errors.areaSqm}>
          <Input type="number" min={0} value={draft.areaSqm} onChange={(e) => set('areaSqm', Number(e.target.value))} className="tnum" invalid={!!errors.areaSqm} />
        </Field>
        <Field label="Postal code">
          <Input value={draft.postalCode ?? ''} onChange={(e) => set('postalCode', e.target.value)} className="tnum" />
        </Field>
        <Field label="Operating hours" help="Drives how many shifts a project on this building has to cover.">
          <Select
            value={draft.operatingHours}
            onChange={(v) => set('operatingHours', v)}
            options={OPERATING_HOURS.map((o) => ({ value: o.value, label: o.label, description: o.description }))}
          />
        </Field>
        <Field label="Shift pattern">
          <Select value={draft.shiftPattern} onChange={(v) => set('shiftPattern', v)} options={SHIFT_PATTERNS.map((s) => ({ value: s.value, label: s.label }))} />
        </Field>
        <Field label="Site contact" required error={errors.picName}>
          <Input value={draft.picName} onChange={(e) => set('picName', e.target.value)} invalid={!!errors.picName} />
        </Field>
        <Field label="Contact phone">
          <Input value={draft.picPhone} onChange={(e) => set('picPhone', e.target.value)} placeholder="+62 8xx xxxx xxxx" />
        </Field>
        <Field label="Contact email" className="sm:col-span-2">
          <Input type="email" value={draft.picEmail ?? ''} onChange={(e) => set('picEmail', e.target.value)} />
        </Field>
        <Field
          label="Access notes"
          className="sm:col-span-2"
          hint="Induction rules, restricted floors, gate to use"
        >
          <Textarea value={draft.accessNote ?? ''} onChange={(e) => set('accessNote', e.target.value)} rows={3} />
        </Field>
      </div>
    </Sheet>
  )
}
