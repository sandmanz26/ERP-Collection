import * as React from 'react'
import { Building2, Globe2, Plus, Trash2, User } from 'lucide-react'
import type { Contact, CountryOffice, Customer } from '@/data/types'
import { COUNTRIES, PORTS } from '@/data/reference'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Checkbox, Switch } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { nextCode, uid } from '@/lib/utils'
import { fmtCurrency } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { useToast } from '@/components/ui/toast'

const INDUSTRIES = ['Furniture & Wood Products', 'Rubber & Commodities', 'Handicraft & Home Decor', 'Agriculture & F&B', 'Apparel & Textile', 'Electronics Manufacturing', 'Construction Materials', 'Frozen Seafood', 'Chemicals', 'Automotive Parts', 'Other']

const emptyOffice = (customerId: string): CountryOffice => ({
  id: uid('off'), customerId, name: '', countryCode: 'ID', country: 'Indonesia', city: '',
  addressLine: '', roles: ['CONSIGNEE'], isHeadquarter: false, isBillingOffice: false, active: true, contacts: [],
})

export function CustomerForm({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Customer | null
}) {
  const { customers, upsertCustomer } = useErp()
  const toast = useToast()
  const [tab, setTab] = React.useState<'profile' | 'commercial' | 'offices'>('profile')
  const [draft, setDraft] = React.useState<Customer>(() => blank(customers))
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank(customers))
      setTab('profile')
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const set = <K extends keyof Customer>(k: K, v: Customer[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!draft.legalName.trim()) e.legalName = 'Legal name is required'
    if (!draft.code.trim()) e.code = 'Code is required'
    if (customers.some((c) => c.code === draft.code && c.id !== draft.id)) e.code = 'This code is already used'
    if (draft.offices.length === 0) e.offices = 'At least one country office is required'
    if (draft.offices.some((o) => !o.name.trim() || !o.city.trim())) e.offices = 'Every office needs a name and a city'
    if (draft.offices.filter((o) => o.isHeadquarter).length > 1) e.offices = 'Only one office can be the headquarters'
    setErrors(e)
    if (e.offices) setTab('offices')
    else if (e.legalName || e.code) setTab('profile')
    return Object.keys(e).length === 0
  }

  const save = () => {
    if (!validate()) return
    upsertCustomer(draft)
    toast.push({ tone: 'success', title: initial ? 'Customer updated' : 'Customer created', description: `${draft.code} — ${draft.legalName}` })
    onOpenChange(false)
  }

  const addOffice = () => {
    setDraft((d) => ({ ...d, offices: [...d.offices, { ...emptyOffice(d.id), name: `Office ${d.offices.length + 1}` }] }))
    setTab('offices')
  }

  const patchOffice = (id: string, patch: Partial<CountryOffice>) =>
    setDraft((d) => ({ ...d, offices: d.offices.map((o) => (o.id === id ? { ...o, ...patch } : o)) }))

  const utilisationPct = draft.creditLimit ? Math.min(200, (draft.outstandingAr / draft.creditLimit) * 100) : 0

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-3xl"
      eyebrow={
        <Badge tone={initial ? 'primary' : 'accent'} size="sm">
          {initial ? `Editing ${initial.code}` : 'New customer'}
        </Badge>
      }
      title={initial ? initial.legalName : 'Create a customer'}
      description="A customer can act as client, shipper or consignee, and can hold as many country offices as it operates."
      footer={
        <>
          <span className="mr-auto text-[12px] text-fg-muted">
            {draft.offices.length} office{draft.offices.length === 1 ? '' : 's'} ·{' '}
            {draft.offices.reduce((a, o) => a + o.contacts.length, 0)} contacts
          </span>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save}>
            {initial ? 'Save changes' : 'Create customer'}
          </Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        className="px-5"
        items={[
          { value: 'profile', label: 'Profile', icon: <Building2 /> },
          { value: 'commercial', label: 'Commercial terms', icon: <User /> },
          { value: 'offices', label: 'Country offices', icon: <Globe2 />, count: draft.offices.length },
        ]}
      />

      {tab === 'profile' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Customer code" required error={errors.code} className="sm:col-span-1">
            <Input value={draft.code} onChange={(e) => set('code', e.target.value)} className="font-mono" invalid={!!errors.code} />
          </Field>
          <Field label="Status">
            <Select
              value={draft.status}
              onChange={(v) => set('status', v)}
              options={[
                { value: 'ACTIVE', label: 'Active', description: 'Trading normally' },
                { value: 'PROSPECT', label: 'Prospect', description: 'Quoted, not yet trading' },
                { value: 'ON_HOLD', label: 'On hold', description: 'New bookings blocked' },
                { value: 'BLACKLISTED', label: 'Blacklisted', description: 'No trading permitted' },
              ]}
            />
          </Field>
          <Field label="Legal name" required error={errors.legalName} className="sm:col-span-2">
            <Input value={draft.legalName} onChange={(e) => set('legalName', e.target.value)} invalid={!!errors.legalName} placeholder="PT Contoh Ekspor Indonesia" />
          </Field>
          <Field label="Trade name" hint="optional">
            <Input value={draft.tradeName ?? ''} onChange={(e) => set('tradeName', e.target.value)} />
          </Field>
          <Field label="Tax ID (NPWP)" help="Used on the commercial invoice and PEB for Indonesian parties.">
            <Input value={draft.taxId ?? ''} onChange={(e) => set('taxId', e.target.value)} className="font-mono" placeholder="00.000.000.0-000.000" />
          </Field>
          <Field label="Industry">
            <Select
              searchable
              value={draft.industry}
              onChange={(v) => set('industry', v)}
              options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
            />
          </Field>
          <Field label="Sales owner">
            <Select
              value={draft.salesOwner}
              onChange={(v) => set('salesOwner', v)}
              options={['Elena Marchetti', 'Marcus Bell', 'Sofia Reyes', 'David Chen', 'Priya Nair', 'Tomas Weber'].map((t) => ({ value: t, label: t }))}
            />
          </Field>
          <Field label="Trading roles" help="What this party can be on a job. A customer is often both the client who pays and the shipper." className="sm:col-span-2">
            <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
              {(['CLIENT', 'SHIPPER', 'CONSIGNEE', 'NOTIFY', 'AGENT', 'VENDOR'] as const).map((r) => (
                <Checkbox
                  key={r}
                  checked={draft.roles.includes(r)}
                  onChange={(on) => set('roles', on ? [...draft.roles, r] : draft.roles.filter((x) => x !== r))}
                  label={r.charAt(0) + r.slice(1).toLowerCase()}
                />
              ))}
            </div>
          </Field>
          <Field label="Notes" className="sm:col-span-2" hint="Shown on every job for this customer">
            <Textarea value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={3} />
          </Field>
        </div>
      )}

      {tab === 'commercial' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Credit limit" help="Jobs are blocked at the inquiry gate when outstanding AR exceeds this limit.">
            <Input
              type="number"
              value={draft.creditLimit}
              onChange={(e) => set('creditLimit', Number(e.target.value))}
              className="tnum"
            />
          </Field>
          <Field label="Credit currency">
            <Select
              value={draft.creditCurrency}
              onChange={(v) => set('creditCurrency', v)}
              options={(['IDR', 'USD', 'EUR', 'SGD', 'AUD'] as const).map((c) => ({ value: c, label: c }))}
            />
          </Field>
          <Field label="Payment term days">
            <Input type="number" value={draft.creditTermDays} onChange={(e) => set('creditTermDays', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Default payment term">
            <Select
              value={draft.defaultPaymentTerm}
              onChange={(v) => set('defaultPaymentTerm', v)}
              options={[
                { value: 'TT_ADVANCE', label: 'TT in advance', description: 'Cash before booking' },
                { value: 'CAD', label: 'Cash against documents' },
                { value: 'NET_7', label: 'Net 7 days' },
                { value: 'NET_14', label: 'Net 14 days' },
                { value: 'NET_30', label: 'Net 30 days' },
                { value: 'NET_45', label: 'Net 45 days' },
                { value: 'NET_60', label: 'Net 60 days' },
                { value: 'LC_AT_SIGHT', label: 'L/C at sight', description: 'Documents must comply strictly' },
                { value: 'LC_USANCE', label: 'L/C usance' },
                { value: 'CONSIGNMENT_SETTLEMENT', label: 'Consignment settlement', description: 'Paid as the consignee sells' },
              ]}
            />
          </Field>
          <Field label="Default Incoterm 2020">
            <Select
              value={draft.defaultIncoterm}
              onChange={(v) => set('defaultIncoterm', v)}
              options={(['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'] as const).map((i) => ({ value: i, label: i }))}
            />
          </Field>
          <Field label="Risk rating">
            <Select
              value={draft.riskRating}
              onChange={(v) => set('riskRating', v)}
              options={[
                { value: 'LOW', label: 'Low', description: 'Long track record, pays on time' },
                { value: 'MEDIUM', label: 'Medium', description: 'Watch the ageing' },
                { value: 'HIGH', label: 'High', description: 'Secure payment before booking' },
              ]}
            />
          </Field>
          <Field label="Outstanding AR" hint="read-only in this build" className="sm:col-span-2">
            <div className="rounded-lg border border-border bg-surface-sunken px-3.5 py-3">
              <div className="flex items-baseline justify-between">
                <span className="tnum text-[16px] font-semibold text-fg">{fmtCurrency(draft.outstandingAr, 'IDR')}</span>
                <span className="text-[12px] text-fg-muted">of {fmtCurrency(draft.creditLimit, draft.creditCurrency)}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-soft">
                <div
                  className={`h-full rounded-full ${utilisationPct > 100 ? 'bg-danger' : utilisationPct > 80 ? 'bg-warning' : 'bg-success'}`}
                  style={{ width: `${Math.min(100, utilisationPct)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11.5px] text-fg-muted">
                {utilisationPct > 100
                  ? `Over limit by ${fmtCurrency(draft.outstandingAr - draft.creditLimit, 'IDR')} — new jobs will be gated.`
                  : `${utilisationPct.toFixed(0)}% of the credit line is in use.`}
              </p>
            </div>
          </Field>
        </div>
      )}

      {tab === 'offices' && (
        <div className="space-y-3 p-5">
          {errors.offices && <p className="text-[12.5px] font-medium text-danger">{errors.offices}</p>}
          {draft.offices.map((o, i) => (
            <OfficeEditor
              key={o.id}
              office={o}
              index={i}
              onChange={(patch) => patchOffice(o.id, patch)}
              onRemove={() => setDraft((d) => ({ ...d, offices: d.offices.filter((x) => x.id !== o.id) }))}
            />
          ))}
          <Button variant="secondary" size="sm" onClick={addOffice} className="w-full">
            <Plus /> Add a country office
          </Button>
        </div>
      )}
    </Sheet>
  )
}

function OfficeEditor({
  office,
  index,
  onChange,
  onRemove,
}: {
  office: CountryOffice
  index: number
  onChange: (patch: Partial<CountryOffice>) => void
  onRemove: () => void
}) {
  const [open, setOpen] = React.useState(index === 0)
  const country = COUNTRIES.find((c) => c.code === office.countryCode)
  const ports = PORTS.filter((p) => p.country === office.countryCode)

  const addContact = () =>
    onChange({
      contacts: [...office.contacts, { id: uid('c'), name: '', title: '', email: '', phone: '', isPrimary: office.contacts.length === 0 }],
    })
  const patchContact = (id: string, patch: Partial<Contact>) =>
    onChange({ contacts: office.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) })

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-bg-muted/60"
      >
        <span className="text-[18px] leading-none">{country?.flag ?? '🏳️'}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-fg">{office.name || 'Untitled office'}</span>
          <span className="block truncate text-[11.5px] text-fg-muted">
            {office.city || 'no city'}, {country?.name} · {office.roles.join(', ') || 'no role'}
          </span>
        </span>
        {office.isHeadquarter && <Badge tone="primary" size="sm">HQ</Badge>}
        {office.isBillingOffice && <Badge tone="accent" size="sm">Billing</Badge>}
        {!office.active && <Badge tone="neutral" size="sm">Inactive</Badge>}
        <span className="text-[11.5px] text-fg-subtle">{open ? 'Hide' : 'Edit'}</span>
      </button>

      {open && (
        <div className="grid gap-3.5 border-t border-border bg-surface-sunken/50 p-3.5 sm:grid-cols-2">
          <Field label="Office name" required>
            <Input value={office.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Rotterdam Distribution" />
          </Field>
          <Field label="Country" required>
            <Select
              searchable
              value={office.countryCode}
              onChange={(v) => {
                const c = COUNTRIES.find((x) => x.code === v)!
                onChange({ countryCode: v, country: c.name, portCode: undefined, portName: undefined })
              }}
              options={COUNTRIES.map((c) => ({ value: c.code, label: c.name, description: c.region, icon: <span className="text-[15px]">{c.flag}</span> }))}
            />
          </Field>
          <Field label="City" required>
            <Input value={office.city} onChange={(e) => onChange({ city: e.target.value })} />
          </Field>
          <Field label="Default sea port" help="The port this office normally ships to or from — pre-fills new jobs.">
            <Select
              clearable
              searchable
              value={office.portCode ?? null}
              onClear={() => onChange({ portCode: undefined, portName: undefined })}
              onChange={(v) => {
                const p = PORTS.find((x) => x.code === v)!
                onChange({ portCode: v, portName: p.name })
              }}
              options={ports.map((p) => ({ value: p.code, label: p.name, description: p.code }))}
              placeholder={ports.length ? 'Select a port' : 'No ports on file for this country'}
              emptyLabel="No ports on file"
            />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={office.addressLine} onChange={(e) => onChange({ addressLine: e.target.value })} />
          </Field>
          <Field label="Customs / EORI number" help="Required on the entry summary declaration at most destinations.">
            <Input value={office.customsId ?? ''} onChange={(e) => onChange({ customsId: e.target.value })} className="font-mono" />
          </Field>
          <Field label="VAT number">
            <Input value={office.vatNumber ?? ''} onChange={(e) => onChange({ vatNumber: e.target.value })} className="font-mono" />
          </Field>
          <Field label="Roles at this office" className="sm:col-span-2">
            <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
              {(['CLIENT', 'SHIPPER', 'CONSIGNEE', 'NOTIFY', 'AGENT'] as const).map((r) => (
                <Checkbox
                  key={r}
                  checked={office.roles.includes(r)}
                  onChange={(on) => onChange({ roles: on ? [...office.roles, r] : office.roles.filter((x) => x !== r) })}
                  label={r.charAt(0) + r.slice(1).toLowerCase()}
                />
              ))}
            </div>
          </Field>
          <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
            <label className="flex items-center gap-2 text-[12.5px] text-fg">
              <Switch checked={office.isHeadquarter} onChange={(v) => onChange({ isHeadquarter: v })} size="sm" /> Headquarters
            </label>
            <label className="flex items-center gap-2 text-[12.5px] text-fg">
              <Switch checked={office.isBillingOffice} onChange={(v) => onChange({ isBillingOffice: v })} size="sm" /> Billing office
            </label>
            <label className="flex items-center gap-2 text-[12.5px] text-fg">
              <Switch checked={office.active} onChange={(v) => onChange({ active: v })} size="sm" /> Active
            </label>
            <div className="flex-1" />
            <Button variant="dangerGhost" size="sm" onClick={onRemove}>
              <Trash2 /> Remove office
            </Button>
          </div>

          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12.5px] font-medium text-fg-muted">Contacts</p>
              <Button variant="ghost" size="xs" onClick={addContact}>
                <Plus /> Add contact
              </Button>
            </div>
            <div className="space-y-2">
              {office.contacts.length === 0 && (
                <p className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center text-[12px] text-fg-subtle">
                  No contacts yet — arrival notices will have nowhere to go.
                </p>
              )}
              {office.contacts.map((c) => (
                <div key={c.id} className="grid gap-2 rounded-lg border border-border bg-surface p-2.5 sm:grid-cols-4">
                  <Input value={c.name} onChange={(e) => patchContact(c.id, { name: e.target.value })} placeholder="Name" />
                  <Input value={c.title ?? ''} onChange={(e) => patchContact(c.id, { title: e.target.value })} placeholder="Title" />
                  <Input value={c.email ?? ''} onChange={(e) => patchContact(c.id, { email: e.target.value })} placeholder="Email" />
                  <div className="flex gap-2">
                    <Input value={c.phone ?? ''} onChange={(e) => patchContact(c.id, { phone: e.target.value })} placeholder="Phone" />
                    <Button
                      variant="dangerGhost"
                      size="iconSm"
                      onClick={() => onChange({ contacts: office.contacts.filter((x) => x.id !== c.id) })}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function blank(existing: Customer[]): Customer {
  const id = uid('cus')
  return {
    id,
    code: nextCode('CUS', existing.map((c) => c.code)),
    legalName: '', tradeName: '', industry: 'Other', roles: ['CLIENT', 'SHIPPER'], status: 'PROSPECT',
    riskRating: 'MEDIUM', creditLimit: 0, creditCurrency: 'IDR', creditTermDays: 30, outstandingAr: 0,
    defaultIncoterm: 'FOB', defaultPaymentTerm: 'NET_30', salesOwner: 'Elena Marchetti',
    onboardedAt: new Date().toISOString().slice(0, 10), notes: '',
    offices: [{ ...emptyOffice(id), name: 'Head Office', isHeadquarter: true, isBillingOffice: true, roles: ['CLIENT', 'SHIPPER'] }],
  }
}
