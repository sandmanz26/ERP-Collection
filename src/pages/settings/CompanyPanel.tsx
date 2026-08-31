import * as React from 'react'
import {
  Building2, CreditCard, Landmark, MapPin, Pencil, Plus, ScrollText, ShieldCheck, Trash2, TriangleAlert,
} from 'lucide-react'
import type { BankAccount, CompanyBranch, CompanyLicence, LicenceKind } from '@/data/types'
import { COUNTRIES, LICENCE_KINDS, PORTS, countryFlag, licenceKindLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { licenceAlerts, liabilityAlert } from '@/lib/services'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select, MultiSelect } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet } from '@/components/ui/dialog'
import { ConfirmDelete } from '@/components/ui/confirm'
import { Tooltip } from '@/components/ui/tooltip'
import { fmtCurrency, fmtDate, pluralDays } from '@/lib/format'
import { uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

export function CompanyPanel() {
  const toast = useToast()
  const { company, updateCompany } = useErp()
  const [licence, setLicence] = React.useState<CompanyLicence | null>(null)
  const [licenceOpen, setLicenceOpen] = React.useState(false)
  const [branch, setBranch] = React.useState<CompanyBranch | null>(null)
  const [branchOpen, setBranchOpen] = React.useState(false)
  const [bank, setBank] = React.useState<BankAccount | null>(null)
  const [bankOpen, setBankOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<{ kind: 'licence' | 'branch' | 'bank'; id: string; label: string } | null>(null)

  const alerts = licenceAlerts(company)
  const liability = liabilityAlert(company)
  const alertFor = (id: string) => alerts.find((a) => a.licenceId === id)

  const set = <K extends keyof typeof company>(k: K, v: (typeof company)[K]) => updateCompany({ [k]: v } as never)

  return (
    <div className="space-y-4">
      {(alerts.length > 0 || liability) && (
        <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3.5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-warning-soft-fg">
            <TriangleAlert className="size-4" />
            Our own compliance needs attention
          </p>
          <ul className="mt-2 space-y-1.5">
            {liability && (
              <li className="text-[12.5px] leading-relaxed text-warning-soft-fg/90">
                {liability.expired
                  ? `Freight liability cover expired ${fmtDate(liability.expiresAt)} — every job accepted since then is uninsured.`
                  : `Freight liability cover expires in ${pluralDays(liability.daysLeft)} (${fmtDate(liability.expiresAt)}).`}
              </li>
            )}
            {alerts.map((a) => (
              <li key={a.licenceId} className="text-[12.5px] leading-relaxed text-warning-soft-fg/90">
                {a.daysLeft < 0
                  ? `${a.name} lapsed ${Math.abs(a.daysLeft)} days ago — filings made under it can be challenged.`
                  : `${a.name} expires in ${pluralDays(a.daysLeft)}.`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<Building2 />} title="Legal entity" description="What appears on our bills of lading, quotations and customs filings." />
          <CardBody className="grid gap-4">
            <Field label="Registered legal name">
              <Input value={company.legalName} onChange={(e) => set('legalName', e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Trading name">
                <Input value={company.tradingName} onChange={(e) => set('tradingName', e.target.value)} />
              </Field>
              <Field label="Founded">
                <Input type="number" value={company.foundedYear} onChange={(e) => set('foundedYear', Number(e.target.value))} className="tnum" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tax ID (NPWP)">
                <Input value={company.taxId} onChange={(e) => set('taxId', e.target.value)} className="font-mono" />
              </Field>
              <Field label="Business registration (NIB)">
                <Input value={company.registrationNo} onChange={(e) => set('registrationNo', e.target.value)} className="font-mono" />
              </Field>
            </div>
            <Field label="Registered address">
              <Textarea value={company.addressLine} onChange={(e) => set('addressLine', e.target.value)} rows={2} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City">
                <Input value={company.city} onChange={(e) => set('city', e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input value={company.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label="Website">
                <Input value={company.website} onChange={(e) => set('website', e.target.value)} />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={<ShieldCheck />}
            title="Liability & trading conditions"
            description="The limit of what we owe when a shipment goes wrong — and the cover behind it."
          />
          <CardBody className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Cover"
                className="sm:col-span-2"
                hint={fmtCurrency(company.liabilityCoverage, company.liabilityCurrency, { compact: true })}
              >
                <Input
                  type="number"
                  value={company.liabilityCoverage}
                  onChange={(e) => set('liabilityCoverage', Number(e.target.value))}
                  className="tnum"
                />
              </Field>
              <Field label="Currency">
                <Select
                  value={company.liabilityCurrency}
                  onChange={(v) => set('liabilityCurrency', v)}
                  options={(['USD', 'IDR', 'EUR', 'SGD'] as const).map((c) => ({ value: c, label: c }))}
                />
              </Field>
            </div>
            <Field
              label="Cover expires"
              error={liability?.expired ? 'Expired — we are trading uninsured.' : undefined}
              hint={liability && !liability.expired ? `${pluralDays(liability.daysLeft)} left` : undefined}
            >
              <DatePicker value={company.liabilityExpiresAt} onChange={(v) => set('liabilityExpiresAt', v ?? company.liabilityExpiresAt)} />
            </Field>
            <Field label="Standard trading conditions" help="Quoted back at a claimant — it is the sentence that caps our exposure.">
              <Textarea value={company.standardTradingConditions} onChange={(e) => set('standardTradingConditions', e.target.value)} rows={5} />
            </Field>
            <div className="rounded-lg border border-border bg-surface-sunken px-3.5 py-3 text-[12px] leading-relaxed text-fg-muted">
              Cover of{' '}
              <span className="font-semibold text-fg">{fmtCurrency(company.liabilityCoverage, company.liabilityCurrency, { compact: true })}</span>{' '}
              against a package limitation of SDR 666.67. A single high-value claim can exceed both — this is why cargo
              insurance is offered on every job rather than only on request.
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ---------------- licences ---------------- */}
      <Card>
        <CardHeader
          icon={<ScrollText />}
          title="Licences & accreditations"
          description="What we are legally allowed to do. Each one raises an exception before it lapses, because a renewal takes longer than the notice period suggests."
          actions={
            <Button size="sm" variant="secondary" onClick={() => { setLicence(null); setLicenceOpen(true) }}>
              <Plus /> Add licence
            </Button>
          }
        />
        <CardBody className="p-0">
          <div className="divide-y divide-border">
            {company.licences.map((l) => {
              const a = alertFor(l.id)
              return (
                <div key={l.id} className="flex flex-wrap items-start gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-medium text-fg">{l.name}</p>
                      <Badge tone="outline" size="sm">{licenceKindLabel(l.kind)}</Badge>
                      {a && (
                        <Badge tone={a.daysLeft < 0 ? 'danger' : a.daysLeft <= 30 ? 'warning' : 'neutral'} size="sm">
                          {a.daysLeft < 0 ? 'Lapsed' : `${a.daysLeft} d left`}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[11.5px] text-fg-muted">{l.number}</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-fg-subtle">
                      {l.issuer}
                      {l.scope && ` · ${l.scope}`}
                    </p>
                    {l.notes && <p className="mt-1 text-[11.5px] italic leading-relaxed text-fg-muted">{l.notes}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tnum text-[12px] text-fg-muted">{fmtDate(l.issuedAt)}</p>
                    <p className={`tnum text-[11.5px] ${a?.daysLeft !== undefined && a.daysLeft < 0 ? 'text-danger' : 'text-fg-subtle'}`}>
                      {l.expiresAt ? `to ${fmtDate(l.expiresAt)}` : 'no expiry'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Tooltip content="Edit">
                      <Button variant="ghost" size="iconXs" onClick={() => { setLicence(l); setLicenceOpen(true) }}><Pencil /></Button>
                    </Tooltip>
                    <Tooltip content="Delete">
                      <Button
                        variant="ghost"
                        size="iconXs"
                        className="text-danger hover:bg-danger-soft"
                        onClick={() => setDeleting({ kind: 'licence', id: l.id, label: `${l.name} — ${l.number}` })}
                      >
                        <Trash2 />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {/* ---------------- branches ---------------- */}
      <Card>
        <CardHeader
          icon={<MapPin />}
          title="Branches"
          description="Which office covers which port. Job numbers and bank floats are keyed off the branch that owns the job."
          actions={
            <Button size="sm" variant="secondary" onClick={() => { setBranch(null); setBranchOpen(true) }}>
              <Plus /> Add branch
            </Button>
          }
        />
        <CardBody className="p-0">
          <div className="divide-y divide-border">
            {company.branches.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11.5px] text-fg-subtle">{b.code}</span>
                    <p className="text-[13px] font-medium text-fg">{b.name}</p>
                    {b.isHeadOffice && <Badge tone="primary" size="sm">Head office</Badge>}
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">{b.addressLine}</p>
                  <p className="mt-0.5 text-[11.5px] text-fg-subtle">
                    {b.managerName} · {b.headcount} staff
                    {b.servesPorts.length > 0 && ` · serves ${b.servesPorts.join(', ')}`}
                  </p>
                </div>
                <span className="shrink-0 text-[15px]">{countryFlag(b.countryCode)}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <Tooltip content="Edit">
                    <Button variant="ghost" size="iconXs" onClick={() => { setBranch(b); setBranchOpen(true) }}><Pencil /></Button>
                  </Tooltip>
                  <Tooltip content={b.isHeadOffice ? 'The head office cannot be deleted' : 'Delete'}>
                    <span>
                      <Button
                        variant="ghost"
                        size="iconXs"
                        disabled={b.isHeadOffice}
                        className="text-danger hover:bg-danger-soft"
                        onClick={() => setDeleting({ kind: 'branch', id: b.id, label: `${b.code} — ${b.name}` })}
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* ---------------- banks ---------------- */}
      <Card>
        <CardHeader
          icon={<Landmark />}
          title="Bank accounts"
          description="Printed on the invoice in the currency it is raised in — a USD invoice quoting an IDR account is the commonest reason a payment goes astray."
          actions={
            <Button size="sm" variant="secondary" onClick={() => { setBank(null); setBankOpen(true) }}>
              <Plus /> Add account
            </Button>
          }
        />
        <CardBody className="p-0">
          <div className="divide-y divide-border">
            {company.bankAccounts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-bg-muted text-fg-muted">
                  <CreditCard className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-medium text-fg">{a.label}</p>
                    <Badge tone={a.isPrimary ? 'primary' : 'outline'} size="sm">{a.currency}</Badge>
                    {a.isPrimary && <Badge tone="success" size="sm">Primary</Badge>}
                  </div>
                  <p className="mt-1 text-[11.5px] text-fg-muted">
                    {a.bankName} · <span className="font-mono">{a.accountNumber}</span>
                    {a.swift && <span className="font-mono"> · {a.swift}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Tooltip content="Edit">
                    <Button variant="ghost" size="iconXs" onClick={() => { setBank(a); setBankOpen(true) }}><Pencil /></Button>
                  </Tooltip>
                  <Tooltip content="Delete">
                    <Button
                      variant="ghost"
                      size="iconXs"
                      className="text-danger hover:bg-danger-soft"
                      onClick={() => setDeleting({ kind: 'bank', id: a.id, label: `${a.label} — ${a.accountNumber}` })}
                    >
                      <Trash2 />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <LicenceForm open={licenceOpen} onOpenChange={setLicenceOpen} initial={licence} />
      <BranchForm open={branchOpen} onOpenChange={setBranchOpen} initial={branch} />
      <BankForm open={bankOpen} onOpenChange={setBankOpen} initial={bank} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel={deleting?.kind ?? 'record'}
        items={deleting ? [deleting.label] : []}
        cascade={
          deleting?.kind === 'licence'
            ? ['Removing a licence removes the renewal alarm with it — the expiry stops being tracked.']
            : deleting?.kind === 'bank'
              ? ['Invoices already issued keep the account details printed on them.']
              : undefined
        }
        onConfirm={() => {
          if (!deleting) return
          if (deleting.kind === 'licence') updateCompany({ licences: company.licences.filter((l) => l.id !== deleting.id) })
          if (deleting.kind === 'branch') updateCompany({ branches: company.branches.filter((b) => b.id !== deleting.id) })
          if (deleting.kind === 'bank') updateCompany({ bankAccounts: company.bankAccounts.filter((a) => a.id !== deleting.id) })
          toast.push({ tone: 'success', title: `${deleting.kind} deleted` })
          setDeleting(null)
        }}
      />
    </div>
  )
}

/* ---------------------------------------------------------------- */

function LicenceForm({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (v: boolean) => void; initial: CompanyLicence | null }) {
  const toast = useToast()
  const { company, updateCompany } = useErp()
  const blank = (): CompanyLicence => ({
    id: uid('lic'), kind: 'FREIGHT_FORWARDING', name: '', number: '', issuer: '',
    issuedAt: new Date().toISOString().slice(0, 10),
  })
  const [form, setForm] = React.useState<CompanyLicence>(initial ?? blank())
  React.useEffect(() => setForm(initial ? structuredClone(initial) : blank()), [initial, open])
  const set = <K extends keyof CompanyLicence>(k: K, v: CompanyLicence[K]) => setForm((f) => ({ ...f, [k]: v }))

  const backdated = !!form.expiresAt && form.expiresAt < form.issuedAt

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? `Edit ${initial.name}` : 'Add a licence'}
      description="A licence without an expiry never raises an alarm — record one wherever the document has one."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!form.name.trim() || !form.number.trim() || backdated}
            onClick={() => {
              const exists = company.licences.some((l) => l.id === form.id)
              updateCompany({
                licences: exists ? company.licences.map((l) => (l.id === form.id ? form : l)) : [...company.licences, form],
              })
              toast.push({ tone: 'success', title: exists ? 'Licence updated' : 'Licence added' })
              onOpenChange(false)
            }}
          >
            {initial ? 'Save changes' : 'Add licence'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Kind" required>
          <Select
            value={form.kind}
            onChange={(v) => set('kind', v as LicenceKind)}
            options={LICENCE_KINDS.map((k) => ({ value: k.value, label: k.label, description: k.hint }))}
          />
        </Field>
        <Field label="Name as printed" required>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Customs Broker Registration (PPJK)" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Number" required>
            <Input value={form.number} onChange={(e) => set('number', e.target.value)} className="font-mono" />
          </Field>
          <Field label="Issuing authority" required>
            <Input value={form.issuer} onChange={(e) => set('issuer', e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Issued" required>
            <DatePicker value={form.issuedAt} onChange={(v) => set('issuedAt', v ?? form.issuedAt)} />
          </Field>
          <Field label="Expires" error={backdated ? 'Expiry cannot precede the issue date.' : undefined} help="Leave empty for a perpetual registration.">
            <DatePicker value={form.expiresAt ?? null} onChange={(v) => set('expiresAt', v ?? undefined)} />
          </Field>
        </div>
        <Field label="Scope" help="What it actually permits — ports, commodities, filing types.">
          <Input value={form.scope ?? ''} onChange={(e) => set('scope', e.target.value || undefined)} />
        </Field>
        <Field label="Notes">
          <Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} rows={2} />
        </Field>
      </div>
    </Sheet>
  )
}

function BranchForm({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (v: boolean) => void; initial: CompanyBranch | null }) {
  const toast = useToast()
  const { company, updateCompany } = useErp()
  const blank = (): CompanyBranch => ({
    id: uid('brn'), code: '', name: '', city: '', countryCode: 'ID', addressLine: '',
    managerName: '', isHeadOffice: false, servesPorts: [], headcount: 1,
  })
  const [form, setForm] = React.useState<CompanyBranch>(initial ?? blank())
  React.useEffect(() => setForm(initial ? structuredClone(initial) : blank()), [initial, open])
  const set = <K extends keyof CompanyBranch>(k: K, v: CompanyBranch[K]) => setForm((f) => ({ ...f, [k]: v }))

  const duplicate = company.branches.some((b) => b.code.toUpperCase() === form.code.trim().toUpperCase() && b.id !== form.id)

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? `Edit ${initial.name}` : 'Add a branch'}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!form.code.trim() || !form.name.trim() || duplicate}
            onClick={() => {
              const exists = company.branches.some((b) => b.id === form.id)
              let next = exists ? company.branches.map((b) => (b.id === form.id ? form : b)) : [...company.branches, form]
              /* only one head office — promoting one demotes the rest */
              if (form.isHeadOffice) next = next.map((b) => (b.id === form.id ? b : { ...b, isHeadOffice: false }))
              updateCompany({ branches: next })
              toast.push({ tone: 'success', title: exists ? 'Branch updated' : 'Branch added' })
              onOpenChange(false)
            }}
          >
            {initial ? 'Save changes' : 'Add branch'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Code" required error={duplicate ? 'Already used.' : undefined}>
            <Input value={form.code} invalid={duplicate} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="BR-SUB" />
          </Field>
          <Field label="Name" required className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Surabaya Branch" />
          </Field>
        </div>
        <Field label="Address">
          <Textarea value={form.addressLine} onChange={(e) => set('addressLine', e.target.value)} rows={2} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" required>
            <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="Country" required>
            <Select
              value={form.countryCode}
              searchable
              onChange={(v) => set('countryCode', v)}
              options={COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag}  ${c.name}` }))}
            />
          </Field>
          <Field label="Headcount">
            <Input type="number" value={form.headcount} onChange={(e) => set('headcount', Number(e.target.value))} className="tnum" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Branch manager" required>
            <Input value={form.managerName} onChange={(e) => set('managerName', e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value || undefined)} />
          </Field>
        </div>
        <Field label="Ports served" help="Jobs loading at these ports default to this branch.">
          <MultiSelect
            values={form.servesPorts}
            onChange={(v) => set('servesPorts', v)}
            options={PORTS.map((p) => ({ value: p.code, label: `${p.code} — ${p.name}`, description: p.city }))}
            placeholder="No port assigned"
          />
        </Field>
        <Checkbox checked={form.isHeadOffice} onChange={(v) => set('isHeadOffice', v)} label="This is the head office" />
      </div>
    </Sheet>
  )
}

function BankForm({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (v: boolean) => void; initial: BankAccount | null }) {
  const toast = useToast()
  const { company, updateCompany } = useErp()
  const blank = (): BankAccount => ({
    id: uid('bnk'), label: '', bankName: '', accountName: company.legalName, accountNumber: '',
    currency: 'IDR', isPrimary: false,
  })
  const [form, setForm] = React.useState<BankAccount>(initial ?? blank())
  React.useEffect(() => setForm(initial ? structuredClone(initial) : blank()), [initial, open])
  const set = <K extends keyof BankAccount>(k: K, v: BankAccount[K]) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? `Edit ${initial.label}` : 'Add a bank account'}
      description="One account per currency we invoice in. A payment sent to the wrong-currency account costs a conversion and a fortnight."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!form.label.trim() || !form.accountNumber.trim()}
            onClick={() => {
              const exists = company.bankAccounts.some((a) => a.id === form.id)
              let next = exists ? company.bankAccounts.map((a) => (a.id === form.id ? form : a)) : [...company.bankAccounts, form]
              if (form.isPrimary) next = next.map((a) => (a.id === form.id ? a : { ...a, isPrimary: false }))
              updateCompany({ bankAccounts: next })
              toast.push({ tone: 'success', title: exists ? 'Account updated' : 'Account added' })
              onOpenChange(false)
            }}
          >
            {initial ? 'Save changes' : 'Add account'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Label" required help="How the desk refers to it — not the bank's own wording.">
          <Input value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="Collections — USD" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bank" required>
            <Input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} />
          </Field>
          <Field label="Account name" required>
            <Input value={form.accountName} onChange={(e) => set('accountName', e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Account number" required className="sm:col-span-2">
            <Input value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} className="font-mono" />
          </Field>
          <Field label="Currency" required>
            <Select
              value={form.currency}
              onChange={(v) => set('currency', v)}
              options={(['IDR', 'USD', 'EUR', 'SGD', 'AUD', 'JPY'] as const).map((c) => ({ value: c, label: c }))}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SWIFT / BIC" help="Required for any inbound payment from abroad.">
            <Input value={form.swift ?? ''} onChange={(e) => set('swift', e.target.value.toUpperCase() || undefined)} className="font-mono" />
          </Field>
          <Field label="Branch" help="Which of our offices operates this account.">
            <Select
              value={form.branchCode ?? null}
              onChange={(v) => set('branchCode', v)}
              clearable
              onClear={() => set('branchCode', undefined)}
              placeholder="Group account"
              options={company.branches.map((b) => ({ value: b.code, label: `${b.code} — ${b.name}` }))}
            />
          </Field>
        </div>
        <Checkbox checked={form.isPrimary} onChange={(v) => set('isPrimary', v)} label="Primary account — printed by default on invoices" />
      </div>
    </Sheet>
  )
}
