import * as React from 'react'
import { Building2, Plus, Trash2, Wallet } from 'lucide-react'
import type { Client, Contact } from '@/data/types'
import { CLIENT_STATUSES, CLIENT_TIERS, INDUSTRIES, PROVINCES } from '@/data/reference'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SwitchField } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { DatePicker } from '@/components/ui/date-picker'
import { nextCode, uid } from '@/lib/utils'
import { fmtCurrency } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { useToast } from '@/components/ui/toast'

const blank = (existing: Client[]): Client => ({
  id: uid('clt'),
  code: nextCode('CLT', existing.map((c) => c.code)),
  legalName: '', brandName: '', industry: INDUSTRIES[0], tier: 'CORPORATE', status: 'PROSPECT',
  npwp: '', address: '', city: '', province: 'DKI Jakarta', postalCode: '', phone: '', email: '', website: '',
  paymentTermDays: 30, invoiceDay: 1, ppnApplicable: true, pph23Withheld: true, creditLimit: 500_000_000,
  accountManager: '', clientSince: new Date().toISOString(), contacts: [],
  notes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
})

const emptyContact = (): Contact => ({
  id: uid('ct'), name: '', position: '', email: '', phone: '', isPrimary: false,
})

export function ClientForm({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Client | null
}) {
  const { clients, upsertClient } = useErp()
  const toast = useToast()
  const [tab, setTab] = React.useState<'profile' | 'terms' | 'contacts'>('profile')
  const [draft, setDraft] = React.useState<Client>(() => blank(clients))
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank(clients))
      setTab('profile')
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const set = <K extends keyof Client>(k: K, v: Client[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!draft.code.trim()) e.code = 'A client code is required'
    if (clients.some((c) => c.code === draft.code && c.id !== draft.id)) e.code = 'This code is already used'
    if (!draft.legalName.trim()) e.legalName = 'The legal name is required'
    if (!draft.city.trim()) e.city = 'City is required'
    if (!draft.accountManager.trim()) e.accountManager = 'Name the account manager who owns this client'
    if (draft.paymentTermDays < 0 || draft.paymentTermDays > 180) e.paymentTermDays = 'Between 0 and 180 days'
    if (draft.invoiceDay < 1 || draft.invoiceDay > 28) e.invoiceDay = 'Pick a day between 1 and 28'
    if (draft.contacts.some((c) => !c.name.trim())) e.contacts = 'Every contact needs a name'
    if (draft.contacts.filter((c) => c.isPrimary).length > 1) e.contacts = 'Only one contact can be the primary'
    setErrors(e)
    if (e.contacts) setTab('contacts')
    else if (e.paymentTermDays || e.invoiceDay) setTab('terms')
    else if (Object.keys(e).length) setTab('profile')
    return Object.keys(e).length === 0
  }

  const save = () => {
    if (!validate()) return
    upsertClient(draft)
    toast.push({
      tone: 'success',
      title: initial ? 'Client updated' : 'Client created',
      description: `${draft.code} — ${draft.legalName}`,
    })
    onOpenChange(false)
  }

  const patchContact = (id: string, patch: Partial<Contact>) =>
    setDraft((d) => ({ ...d, contacts: d.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-3xl"
      eyebrow={
        <Badge tone={initial ? 'primary' : 'accent'} size="sm">
          {initial ? `Editing ${initial.code}` : 'New client'}
        </Badge>
      }
      title={initial ? initial.legalName : 'Create a client'}
      description="A client is the company that signs and pays. Its buildings and projects are added separately."
      footer={
        <>
          <span className="mr-auto text-[12px] text-fg-muted">
            {draft.contacts.length} contact{draft.contacts.length === 1 ? '' : 's'}
          </span>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save}>
            {initial ? 'Save changes' : 'Create client'}
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
          { value: 'terms', label: 'Commercial terms', icon: <Wallet /> },
          { value: 'contacts', label: 'Contacts', count: draft.contacts.length },
        ]}
      />

      {tab === 'profile' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Client code" required error={errors.code}>
            <Input value={draft.code} onChange={(e) => set('code', e.target.value)} className="font-mono" invalid={!!errors.code} />
          </Field>
          <Field label="Status">
            <Select
              value={draft.status}
              onChange={(v) => set('status', v)}
              options={CLIENT_STATUSES.map((s) => ({ value: s.value, label: s.label, description: s.description }))}
            />
          </Field>
          <Field label="Legal name" required error={errors.legalName} className="sm:col-span-2">
            <Input
              value={draft.legalName}
              onChange={(e) => set('legalName', e.target.value)}
              placeholder="PT Contoh Sejahtera Indonesia"
              invalid={!!errors.legalName}
            />
          </Field>
          <Field label="Brand name" hint="optional">
            <Input value={draft.brandName ?? ''} onChange={(e) => set('brandName', e.target.value)} placeholder="Contoh Group" />
          </Field>
          <Field label="NPWP" help="Printed on the invoice and used for PPh 23 withholding.">
            <Input value={draft.npwp ?? ''} onChange={(e) => set('npwp', e.target.value)} className="font-mono" placeholder="00.000.000.0-000.000" />
          </Field>
          <Field label="Industry">
            <Select searchable value={draft.industry} onChange={(v) => set('industry', v)} options={INDUSTRIES.map((i) => ({ value: i, label: i }))} />
          </Field>
          <Field label="Tier" help="Sets the service review cadence, not the price.">
            <Select
              value={draft.tier}
              onChange={(v) => set('tier', v)}
              options={CLIENT_TIERS.map((t) => ({ value: t.value, label: t.label, description: t.description }))}
            />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={draft.address} onChange={(e) => set('address', e.target.value)} placeholder="Jl. Jenderal Sudirman Kav. 1" />
          </Field>
          <Field label="City" required error={errors.city}>
            <Input value={draft.city} onChange={(e) => set('city', e.target.value)} invalid={!!errors.city} />
          </Field>
          <Field label="Province">
            <Select searchable value={draft.province} onChange={(v) => set('province', v)} options={PROVINCES.map((p) => ({ value: p, label: p }))} />
          </Field>
          <Field label="Phone">
            <Input value={draft.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="+62 21 000 0000" />
          </Field>
          <Field label="Email">
            <Input type="email" value={draft.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Notes" className="sm:col-span-2" hint="Site rules, screening requirements, anything a coordinator must know">
            <Textarea value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={3} />
          </Field>
        </div>
      )}

      {tab === 'terms' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Account manager" required error={errors.accountManager}>
            <Input value={draft.accountManager} onChange={(e) => set('accountManager', e.target.value)} invalid={!!errors.accountManager} />
          </Field>
          <Field label="Client since">
            <DatePicker value={draft.clientSince} onChange={(v) => set('clientSince', v ?? draft.clientSince)} quickRanges={false} />
          </Field>
          <Field label="Payment term (days)" required error={errors.paymentTermDays} help="Carried onto every new project as the default.">
            <Input
              type="number"
              value={draft.paymentTermDays}
              onChange={(e) => set('paymentTermDays', Number(e.target.value))}
              invalid={!!errors.paymentTermDays}
            />
          </Field>
          <Field label="Invoice day of month" error={errors.invoiceDay}>
            <Input type="number" min={1} max={28} value={draft.invoiceDay} onChange={(e) => set('invoiceDay', Number(e.target.value))} invalid={!!errors.invoiceDay} />
          </Field>
          <Field label="Credit limit (IDR)" hint={fmtCurrency(draft.creditLimit, 'IDR', { compact: true })} className="sm:col-span-2">
            <Input type="number" value={draft.creditLimit} onChange={(e) => set('creditLimit', Number(e.target.value))} className="tnum" />
          </Field>
          <div className="sm:col-span-2 space-y-3 rounded-xl border border-border bg-surface-sunken p-3.5">
            <SwitchField
              checked={draft.ppnApplicable}
              onChange={(v) => set('ppnApplicable', v)}
              label="PPN applies"
              description="Value-added tax is added to the invoice."
            />
            <SwitchField
              checked={draft.pph23Withheld}
              onChange={(v) => set('pph23Withheld', v)}
              label="PPh 23 withheld by the client"
              description="The client withholds income tax on the service fee and issues the slip."
            />
          </div>
        </div>
      )}

      {tab === 'contacts' && (
        <div className="space-y-3 p-5">
          {errors.contacts && <p className="text-[12px] font-medium text-danger">{errors.contacts}</p>}
          {draft.contacts.length === 0 && (
            <p className="rounded-xl border border-dashed border-border-strong px-4 py-8 text-center text-[12.5px] text-fg-muted">
              No contacts yet. Add the person a coordinator calls when a post is empty.
            </p>
          )}
          {draft.contacts.map((contact) => (
            <div key={contact.id} className="grid gap-3 rounded-xl border border-border bg-surface-sunken p-3.5 sm:grid-cols-2">
              <Field label="Name">
                <Input value={contact.name} onChange={(e) => patchContact(contact.id, { name: e.target.value })} />
              </Field>
              <Field label="Position">
                <Input value={contact.position} onChange={(e) => patchContact(contact.id, { position: e.target.value })} placeholder="General Affairs Manager" />
              </Field>
              <Field label="Email">
                <Input type="email" value={contact.email} onChange={(e) => patchContact(contact.id, { email: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={contact.phone} onChange={(e) => patchContact(contact.id, { phone: e.target.value })} />
              </Field>
              <div className="flex items-center justify-between sm:col-span-2">
                <SwitchField
                  checked={contact.isPrimary}
                  onChange={(v) => patchContact(contact.id, { isPrimary: v })}
                  label="Primary contact"
                />
                <Button
                  variant="dangerGhost"
                  size="sm"
                  onClick={() => setDraft((d) => ({ ...d, contacts: d.contacts.filter((c) => c.id !== contact.id) }))}
                >
                  <Trash2 /> Remove
                </Button>
              </div>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setDraft((d) => ({ ...d, contacts: [...d.contacts, emptyContact()] }))}>
            <Plus /> Add contact
          </Button>
        </div>
      )}
    </Sheet>
  )
}
