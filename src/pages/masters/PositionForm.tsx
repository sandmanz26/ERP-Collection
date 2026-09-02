import * as React from 'react'
import { Package, Plus, Trash2 } from 'lucide-react'
import type { Position } from '@/data/types'
import { CERTIFICATIONS, POSITION_GRADES, SERVICE_TYPES, serviceLabel } from '@/data/reference'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { MultiSelect, Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useErp } from '@/store/useErp'
import { uid } from '@/lib/utils'
import { fmtCurrency } from '@/lib/format'

const blank = (): Position => ({
  id: uid('pos'), code: '', name: '', serviceType: 'SECURITY', grade: 'REGULAR', description: '',
  certifications: [], minEducation: 'SMA / sederajat', minExperienceYears: 0,
  baseSalary: 5_400_000, allowance: 700_000, defaultBillRate: 8_700_000, standardIssue: [], status: 'ACTIVE',
})

export function PositionForm({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Position | null
}) {
  const { positions, items, upsertPosition } = useErp()
  const toast = useToast()
  const [draft, setDraft] = React.useState<Position>(blank)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank())
      setErrors({})
    }
  }, [open, initial])

  const set = <K extends keyof Position>(k: K, v: Position[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const cost = Math.round(((draft.baseSalary + draft.allowance) * 1.19) / 1000) * 1000
  const margin = draft.defaultBillRate - cost

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.code.trim()) e.code = 'A position code is required'
    if (positions.some((p) => p.code === draft.code && p.id !== draft.id)) e.code = 'This code is already used'
    if (!draft.name.trim()) e.name = 'The position name is required'
    if (draft.baseSalary <= 0) e.baseSalary = 'Base salary has to be above zero'
    if (draft.defaultBillRate <= cost) e.defaultBillRate = `The rate has to cover the ${fmtCurrency(cost, 'IDR', { compact: true })} monthly cost`
    if (draft.standardIssue.some((s) => !s.sku || s.qtyPerPerson <= 0)) e.issue = 'Every standard issue line needs an item and a quantity'
    setErrors(e)
    if (Object.keys(e).length) return

    upsertPosition(draft)
    toast.push({
      tone: 'success',
      title: initial ? 'Position updated' : 'Position created',
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
          {initial ? `Editing ${initial.code}` : 'New position'}
        </Badge>
      }
      title={initial ? initial.name : 'Create a position'}
      description="A position sets what a project can ask for, what it costs, and what each person is issued."
      footer={
        <>
          <span className="mr-auto text-[12px] text-fg-muted">
            Cost <span className="tnum font-medium text-fg">{fmtCurrency(cost, 'IDR', { compact: true })}</span> · margin{' '}
            <span className={`tnum font-medium ${margin > 0 ? 'text-success' : 'text-danger'}`}>
              {fmtCurrency(margin, 'IDR', { compact: true })}
            </span>
          </span>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save}>
            {initial ? 'Save changes' : 'Create position'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Position code" required error={errors.code}>
          <Input value={draft.code} onChange={(e) => set('code', e.target.value)} className="font-mono" placeholder="POS-SEC-006" invalid={!!errors.code} />
        </Field>
        <Field label="Status">
          <Select
            value={draft.status}
            onChange={(v) => set('status', v)}
            options={[
              { value: 'ACTIVE', label: 'Active', description: 'Can be added to a project' },
              { value: 'INACTIVE', label: 'Inactive', description: 'Kept for history only' },
            ]}
          />
        </Field>
        <Field label="Position name" required error={errors.name} className="sm:col-span-2">
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Anggota Security" invalid={!!errors.name} />
        </Field>
        <Field label="Service line">
          <Select
            value={draft.serviceType}
            onChange={(v) => set('serviceType', v)}
            options={SERVICE_TYPES.map((s) => ({ value: s.value, label: s.label, description: s.indonesian }))}
          />
        </Field>
        <Field label="Grade">
          <Select value={draft.grade} onChange={(v) => set('grade', v)} options={POSITION_GRADES.map((g) => ({ value: g.value, label: g.label }))} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea value={draft.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="Menjaga pos, mengatur akses keluar-masuk, patroli terjadwal." />
        </Field>
        <Field label="Certifications required" className="sm:col-span-2">
          <MultiSelect
            values={draft.certifications}
            onChange={(v) => set('certifications', v)}
            options={CERTIFICATIONS.map((c) => ({ value: c, label: c }))}
            placeholder="None required"
            maxTags={3}
          />
        </Field>
        <Field label="Minimum education">
          <Input value={draft.minEducation} onChange={(e) => set('minEducation', e.target.value)} />
        </Field>
        <Field label="Minimum experience (years)">
          <Input type="number" min={0} value={draft.minExperienceYears} onChange={(e) => set('minExperienceYears', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Base salary (IDR / month)" required error={errors.baseSalary}>
          <Input type="number" step={100_000} value={draft.baseSalary} onChange={(e) => set('baseSalary', Number(e.target.value))} className="tnum" invalid={!!errors.baseSalary} />
        </Field>
        <Field label="Allowance (IDR / month)">
          <Input type="number" step={50_000} value={draft.allowance} onChange={(e) => set('allowance', Number(e.target.value))} className="tnum" />
        </Field>
        <Field
          label="Default bill rate (IDR / month)"
          required
          error={errors.defaultBillRate}
          className="sm:col-span-2"
          help="Suggested when this position is added to a project. A project can still negotiate its own rate."
        >
          <Input
            type="number"
            step={100_000}
            value={draft.defaultBillRate}
            onChange={(e) => set('defaultBillRate', Number(e.target.value))}
            className="tnum"
            invalid={!!errors.defaultBillRate}
          />
        </Field>

        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[12.5px] font-medium text-fg">Standard issue</p>
              <p className="text-[11.5px] text-fg-muted">What every person in this position is given on deployment.</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDraft((d) => ({ ...d, standardIssue: [...d.standardIssue, { sku: items[0]?.sku ?? '', qtyPerPerson: 1 }] }))}
            >
              <Plus /> Add item
            </Button>
          </div>
          {errors.issue && <p className="mb-2 text-[12px] font-medium text-danger">{errors.issue}</p>}
          <div className="space-y-2">
            {draft.standardIssue.length === 0 && (
              <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-[12.5px] text-fg-muted">
                Nothing issued yet. Items added here drive the inventory demand shown on every project.
              </p>
            )}
            {draft.standardIssue.map((line, idx) => (
              <div key={`${line.sku}-${idx}`} className="flex items-center gap-2 rounded-xl border border-border bg-surface-sunken p-2.5">
                <Package className="size-4 shrink-0 text-fg-subtle" />
                <Select
                  searchable
                  size="sm"
                  className="min-w-0 flex-1"
                  value={line.sku}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      standardIssue: d.standardIssue.map((s, i) => (i === idx ? { ...s, sku: v } : s)),
                    }))
                  }
                  options={items
                    .filter((i) => i.status === 'ACTIVE')
                    .map((i) => ({ value: i.sku, label: i.name, description: `${i.sku} · ${i.uom}`, group: serviceLabel(i.serviceTypes[0] ?? 'SECURITY') }))}
                />
                <Input
                  type="number"
                  min={1}
                  value={line.qtyPerPerson}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      standardIssue: d.standardIssue.map((s, i) => (i === idx ? { ...s, qtyPerPerson: Number(e.target.value) } : s)),
                    }))
                  }
                  className="tnum h-8 w-[80px] text-[12.5px]"
                />
                <Button
                  variant="ghost"
                  size="iconSm"
                  className="text-danger hover:bg-danger-soft"
                  aria-label="Remove item"
                  onClick={() => setDraft((d) => ({ ...d, standardIssue: d.standardIssue.filter((_, i) => i !== idx) }))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
