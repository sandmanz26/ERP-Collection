import * as React from 'react'
import { Calculator, Info, ListChecks, Plus, Route, Trash2 } from 'lucide-react'
import type { ContainerType, RateLine, ServicePackage } from '@/data/types'
import { CARRIERS, CHARGE_CODES, PORTS, countryFlag } from '@/data/reference'
import { CONTAINER_SPECS } from '@/lib/shipping'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { Tooltip } from '@/components/ui/tooltip'
import { nextCode, uid } from '@/lib/utils'
import { fmtMoney, fmtPercent } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { useToast } from '@/components/ui/toast'

const BASES = [
  { value: 'PER_CONTAINER', label: 'Per container', description: 'Multiplied by the number of units of that type' },
  { value: 'PER_CBM', label: 'Per CBM', description: 'LCL and breakbulk volume' },
  { value: 'PER_KG', label: 'Per kg', description: 'Air freight chargeable weight' },
  { value: 'PER_TON', label: 'Per revenue tonne', description: 'Breakbulk, whichever is greater of W/M' },
  { value: 'PER_BL', label: 'Per B/L', description: 'One charge per bill of lading' },
  { value: 'PER_SHIPMENT', label: 'Per shipment', description: 'Flat, once per job' },
  { value: 'PER_DOCUMENT', label: 'Per document', description: 'Per certificate issued' },
  { value: 'PERCENT_OF_VALUE', label: '% of cargo value', description: 'Insurance and ad-valorem charges' },
] as const

export function PackageForm({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: ServicePackage | null
}) {
  const { packages, upsertPackage } = useErp()
  const toast = useToast()
  const [tab, setTab] = React.useState<'route' | 'rates' | 'scope'>('route')
  const [draft, setDraft] = React.useState<ServicePackage>(() => blank(packages))
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank(packages))
      setTab('route')
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const set = <K extends keyof ServicePackage>(k: K, v: ServicePackage[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const totals = draft.rateLines.reduce(
    (a, l) => ({ buy: a.buy + l.buyRate, sell: a.sell + l.sellRate }),
    { buy: 0, sell: 0 },
  )
  const marginPct = totals.sell ? ((totals.sell - totals.buy) / totals.sell) * 100 : 0

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.code.trim()) e.code = 'Code is required'
    if (packages.some((p) => p.code === draft.code && p.id !== draft.id)) e.code = 'Code already exists'
    if (!draft.name.trim()) e.name = 'Name is required'
    if (draft.rateLines.length === 0) e.rates = 'A package needs at least one rate line'
    if (draft.rateLines.some((l) => l.sellRate < l.buyRate)) e.rates = 'One or more lines sell below cost'
    if (new Date(draft.validTo) <= new Date(draft.validFrom)) e.validTo = 'Validity end must be after the start'
    setErrors(e)
    if (e.rates) setTab('rates')
    else if (Object.keys(e).length) setTab('route')
    if (Object.keys(e).length) return
    upsertPackage(draft)
    toast.push({ tone: 'success', title: initial ? 'Package updated' : 'Package created', description: `${draft.code} — ${draft.name}` })
    onOpenChange(false)
  }

  const addLine = () =>
    setDraft((d) => ({
      ...d,
      rateLines: [
        ...d.rateLines,
        {
          id: uid('rl'), chargeCode: 'OFR', description: 'Ocean Freight', basis: 'PER_CONTAINER',
          buyRate: 0, sellRate: 0, currency: d.currency, vatApplicable: false, mandatory: true,
        },
      ],
    }))

  const patchLine = (id: string, patch: Partial<RateLine>) =>
    setDraft((d) => ({ ...d, rateLines: d.rateLines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-4xl"
      eyebrow={<Badge tone={initial ? 'primary' : 'accent'} size="sm">{initial ? `Editing ${initial.code}` : 'New package'}</Badge>}
      title={initial ? initial.name : 'Create a service package'}
      description="A package is the priced product you sell on a lane: buying rates, selling rates, what is included and what is not."
      footer={
        <>
          <div className="mr-auto flex items-center gap-3 text-[12px]">
            <span className="text-fg-muted">
              Buy <span className="tnum font-semibold text-fg">{fmtMoney(totals.buy, draft.currency)}</span>
            </span>
            <span className="text-fg-muted">
              Sell <span className="tnum font-semibold text-fg">{fmtMoney(totals.sell, draft.currency)}</span>
            </span>
            <Badge tone={marginPct >= 20 ? 'success' : marginPct >= 10 ? 'warning' : 'danger'} size="sm">
              {fmtPercent(marginPct)} margin
            </Badge>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save}>{initial ? 'Save changes' : 'Create package'}</Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        className="px-5"
        items={[
          { value: 'route', label: 'Lane & validity', icon: <Route /> },
          { value: 'rates', label: 'Rate card', icon: <Calculator />, count: draft.rateLines.length },
          { value: 'scope', label: 'Inclusions', icon: <ListChecks /> },
        ]}
      />

      {tab === 'route' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Package code" required error={errors.code}>
            <Input value={draft.code} onChange={(e) => set('code', e.target.value)} className="font-mono" invalid={!!errors.code} />
          </Field>
          <Field label="Status">
            <Select
              value={draft.status}
              onChange={(v) => set('status', v)}
              options={[
                { value: 'DRAFT', label: 'Draft', description: 'Not yet quotable' },
                { value: 'ACTIVE', label: 'Active', description: 'Available on new jobs' },
                { value: 'EXPIRING', label: 'Expiring', description: 'Renegotiate before validity ends' },
                { value: 'EXPIRED', label: 'Expired' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
            />
          </Field>
          <Field label="Package name" required error={errors.name} className="sm:col-span-2">
            <Input value={draft.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} placeholder="Java → North Europe FCL Weekly" />
          </Field>
          <Field label="Transport mode">
            <Select
              value={draft.mode}
              onChange={(v) => set('mode', v)}
              options={[
                { value: 'FCL', label: 'FCL — Full container' },
                { value: 'LCL', label: 'LCL — Consolidated' },
                { value: 'AIR', label: 'Air freight' },
                { value: 'BREAKBULK', label: 'Breakbulk' },
                { value: 'RORO', label: 'RoRo' },
              ]}
            />
          </Field>
          <Field label="Service scope" help="How far the price reaches on each end of the move.">
            <Select
              value={draft.scope}
              onChange={(v) => set('scope', v)}
              options={[
                { value: 'PORT_TO_PORT', label: 'Port to port' },
                { value: 'DOOR_TO_PORT', label: 'Door to port', description: 'Includes origin pickup' },
                { value: 'PORT_TO_DOOR', label: 'Port to door', description: 'Includes destination delivery' },
                { value: 'DOOR_TO_DOOR', label: 'Door to door' },
              ]}
            />
          </Field>
          <Field label="Origin port" required>
            <Select
              searchable
              value={draft.originPortCode}
              onChange={(v) => {
                const p = PORTS.find((x) => x.code === v)!
                set('originPortCode', v)
                set('originPortName', p.name)
              }}
              options={PORTS.map((p) => ({
                value: p.code, label: p.name, description: `${p.city} · ${p.code}`,
                group: p.country === 'ID' ? 'Indonesia' : 'International',
                icon: <span className="text-[14px]">{countryFlag(p.country)}</span>,
              }))}
            />
          </Field>
          <Field label="Destination port" required>
            <Select
              searchable
              value={draft.destPortCode}
              onChange={(v) => {
                const p = PORTS.find((x) => x.code === v)!
                set('destPortCode', v)
                set('destPortName', p.name)
                set('destCountry', p.country)
              }}
              options={PORTS.filter((p) => p.country !== 'ID').map((p) => ({
                value: p.code, label: p.name, description: `${p.city} · ${p.code}`,
                icon: <span className="text-[14px]">{countryFlag(p.country)}</span>,
              }))}
            />
          </Field>
          <Field label="Carrier">
            <Select
              clearable
              searchable
              value={draft.carrier ?? null}
              onClear={() => set('carrier', undefined)}
              onChange={(v) => set('carrier', v)}
              options={CARRIERS.map((c) => ({ value: c.name, label: c.name, description: c.scac }))}
            />
          </Field>
          <Field label="Default Incoterm">
            <Select
              value={draft.incoterm}
              onChange={(v) => set('incoterm', v)}
              options={(['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'] as const).map((i) => ({ value: i, label: i }))}
            />
          </Field>
          <Field label="Quoting currency">
            <Select
              value={draft.currency}
              onChange={(v) => set('currency', v)}
              options={(['USD', 'IDR', 'EUR', 'SGD', 'AUD', 'JPY', 'CNY'] as const).map((c) => ({ value: c, label: c }))}
            />
          </Field>
          <Field label="Transit days" help="Port-to-port sailing time used to project the ETA.">
            <Input type="number" value={draft.transitDays} onChange={(e) => set('transitDays', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Free time (days)" help="Combined free days at destination before demurrage starts.">
            <Input type="number" value={draft.freeTimeDays} onChange={(e) => set('freeTimeDays', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Valid from">
            <DatePicker value={draft.validFrom} onChange={(v) => set('validFrom', v ?? draft.validFrom)} />
          </Field>
          <Field label="Valid to" error={errors.validTo}>
            <DatePicker value={draft.validTo} onChange={(v) => set('validTo', v ?? draft.validTo)} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Contract reference, space commitments, surcharge conditions…" />
          </Field>
        </div>
      )}

      {tab === 'rates' && (
        <div className="p-5">
          {errors.rates && <p className="mb-3 text-[12.5px] font-medium text-danger">{errors.rates}</p>}
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[1.6fr_1.3fr_0.9fr_0.8fr_0.8fr_0.7fr_36px] gap-2 border-b border-border bg-surface-sunken px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
              <span>Charge</span>
              <span>Basis</span>
              <span>Unit</span>
              <span className="text-right">Buy</span>
              <span className="text-right">Sell</span>
              <span className="text-right">Margin</span>
              <span />
            </div>
            <div className="divide-y divide-border">
              {draft.rateLines.map((l) => {
                const m = l.sellRate ? ((l.sellRate - l.buyRate) / l.sellRate) * 100 : 0
                return (
                  <div key={l.id} className="grid grid-cols-[1.6fr_1.3fr_0.9fr_0.8fr_0.8fr_0.7fr_36px] items-center gap-2 px-3 py-2">
                    <Select
                      size="sm"
                      searchable
                      value={l.chargeCode}
                      onChange={(v) => {
                        const meta = CHARGE_CODES.find((c) => c.code === v)!
                        patchLine(l.id, { chargeCode: v, description: meta.name, basis: meta.basis, vatApplicable: meta.vat })
                      }}
                      options={CHARGE_CODES.map((c) => ({ value: c.code, label: c.name, description: c.code, group: c.category }))}
                    />
                    <Select
                      size="sm"
                      value={l.basis}
                      onChange={(v) => patchLine(l.id, { basis: v })}
                      options={BASES.map((b) => ({ value: b.value, label: b.label, description: b.description }))}
                    />
                    <Select
                      size="sm"
                      clearable
                      value={l.containerType ?? null}
                      onClear={() => patchLine(l.id, { containerType: undefined })}
                      onChange={(v) => patchLine(l.id, { containerType: v })}
                      placeholder="All"
                      options={(Object.keys(CONTAINER_SPECS) as ContainerType[]).map((k) => ({ value: k, label: k, description: CONTAINER_SPECS[k].label }))}
                    />
                    <Input
                      className="tnum h-8 text-right text-[12.5px]"
                      type="number"
                      value={l.buyRate}
                      onChange={(e) => patchLine(l.id, { buyRate: Number(e.target.value) })}
                    />
                    <Input
                      className="tnum h-8 text-right text-[12.5px]"
                      type="number"
                      value={l.sellRate}
                      onChange={(e) => patchLine(l.id, { sellRate: Number(e.target.value) })}
                      invalid={l.sellRate < l.buyRate}
                    />
                    <span className={`tnum text-right text-[12px] font-medium ${m < 0 ? 'text-danger' : m < 10 ? 'text-warning' : 'text-success'}`}>
                      {fmtPercent(m, 0)}
                    </span>
                    <Button variant="dangerGhost" size="iconXs" onClick={() => setDraft((d) => ({ ...d, rateLines: d.rateLines.filter((x) => x.id !== l.id) }))}>
                      <Trash2 />
                    </Button>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-sunken px-3 py-2">
              <Button variant="ghost" size="sm" onClick={addLine}>
                <Plus /> Add rate line
              </Button>
              <div className="flex items-center gap-4 text-[12px]">
                <span className="text-fg-muted">
                  Buy <span className="tnum font-semibold text-fg">{fmtMoney(totals.buy, draft.currency)}</span>
                </span>
                <span className="text-fg-muted">
                  Sell <span className="tnum font-semibold text-fg">{fmtMoney(totals.sell, draft.currency)}</span>
                </span>
                <Badge tone={marginPct >= 20 ? 'success' : marginPct >= 10 ? 'warning' : 'danger'} size="sm">
                  {fmtPercent(marginPct)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2.5 rounded-lg border border-border bg-surface-sunken px-3.5 py-2.5">
            <Info className="mt-px size-4 shrink-0 text-fg-muted" />
            <p className="text-[12px] leading-relaxed text-fg-muted">
              These lines are copied onto a job when the package is applied. Rates stay editable per job so a negotiated
              exception never rewrites the tariff — the job records what was actually charged.
            </p>
          </div>
        </div>
      )}

      {tab === 'scope' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <ListEditor
            label="Included in the price"
            tone="success"
            items={draft.inclusions}
            onChange={(v) => set('inclusions', v)}
            placeholder="Ocean freight"
          />
          <ListEditor
            label="Explicitly excluded"
            tone="danger"
            items={draft.exclusions}
            onChange={(v) => set('exclusions', v)}
            placeholder="Destination THC"
          />
          <div className="sm:col-span-2">
            <Field label="Mandatory lines" help="Mandatory lines are always copied to the job; optional lines are offered but can be dropped.">
              <div className="space-y-1.5 rounded-lg border border-border bg-surface-sunken p-3">
                {draft.rateLines.map((l) => (
                  <Checkbox
                    key={l.id}
                    checked={l.mandatory}
                    onChange={(v) => patchLine(l.id, { mandatory: v })}
                    label={
                      <span className="text-[12.5px]">
                        <span className="font-mono text-fg-muted">{l.chargeCode}</span> {l.description}
                      </span>
                    }
                  />
                ))}
              </div>
            </Field>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function ListEditor({
  label,
  items,
  onChange,
  tone,
  placeholder,
}: {
  label: string
  items: string[]
  onChange: (v: string[]) => void
  tone: 'success' | 'danger'
  placeholder: string
}) {
  const [text, setText] = React.useState('')
  return (
    <Field label={label}>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim()) {
                onChange([...items, text.trim()])
                setText('')
              }
            }}
          />
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              if (text.trim()) {
                onChange([...items, text.trim()])
                setText('')
              }
            }}
          >
            <Plus />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <Tooltip key={i} content="Click to remove">
              <button
                onClick={() => onChange(items.filter((_, x) => x !== i))}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] ${
                  tone === 'success' ? 'bg-success-soft text-success-soft-fg' : 'bg-danger-soft text-danger-soft-fg'
                }`}
              >
                {it}
                <Trash2 className="size-3 opacity-60" />
              </button>
            </Tooltip>
          ))}
          {items.length === 0 && <p className="text-[12px] text-fg-subtle">Nothing listed yet.</p>}
        </div>
      </div>
    </Field>
  )
}

function blank(existing: ServicePackage[]): ServicePackage {
  const today = new Date()
  const end = new Date()
  end.setMonth(end.getMonth() + 3)
  return {
    id: uid('pkg'),
    code: nextCode('PKG', existing.map((p) => p.code), 3),
    name: '', mode: 'FCL', scope: 'PORT_TO_PORT',
    originPortCode: 'IDTPP', originPortName: 'Tanjung Priok',
    destPortCode: 'SGSIN', destPortName: 'Singapore', destCountry: 'SG',
    incoterm: 'FOB', currency: 'USD', transitDays: 14, freeTimeDays: 7,
    validFrom: today.toISOString().slice(0, 10), validTo: end.toISOString().slice(0, 10),
    status: 'DRAFT', inclusions: [], exclusions: [], rateLines: [], usageCount: 0,
  }
}
