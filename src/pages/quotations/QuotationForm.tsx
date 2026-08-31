import * as React from 'react'
import { Calculator, FileText, Info, Package, Plus, Route, Trash2 } from 'lucide-react'
import type { ContainerType, QuoteLine, Quotation } from '@/data/types'
import { CHARGE_CODES, CONTAINER_TYPES, HS_CODES, INCOTERMS, PORTS, TEAM, countryFlag } from '@/data/reference'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/checkbox'
import { uid } from '@/lib/utils'
import { fmtCurrency, fmtMoney, fmtPercent, titleCase } from '@/lib/format'
import { quoteTotals } from '@/lib/analytics2'
import { useErp } from '@/store/useErp'
import { useToast } from '@/components/ui/toast'

export function QuotationForm({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Quotation | null
}) {
  const { quotations, customers, packages, settings, upsertQuotation } = useErp()
  const toast = useToast()
  const [tab, setTab] = React.useState<'brief' | 'pricing' | 'terms'>('brief')
  const [draft, setDraft] = React.useState<Quotation>(() => blank(quotations, settings.numbering))
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank(quotations, settings.numbering))
      setTab('brief')
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const set = <K extends keyof Quotation>(k: K, v: Quotation[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const customer = customers.find((c) => c.id === draft.customerId)
  const totals = quoteTotals(draft)
  const incoterm = INCOTERMS.find((i) => i.code === draft.incoterm)

  const overLimit = customer && customer.creditLimit > 0 && customer.outstandingAr > customer.creditLimit

  const patchLine = (id: string, patch: Partial<QuoteLine>) =>
    setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))

  const applyPackage = (packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId)
    if (!pkg) return
    setDraft((d) => ({
      ...d,
      packageId,
      currency: pkg.currency,
      incoterm: pkg.incoterm,
      scope: pkg.scope,
      mode: pkg.mode,
      polCode: pkg.originPortCode,
      polName: pkg.originPortName,
      podCode: pkg.destPortCode,
      podName: pkg.destPortName,
      destCountry: pkg.destCountry,
      transitDays: pkg.transitDays,
      freeTimeDays: pkg.freeTimeDays,
      lines: pkg.rateLines.map((l) => ({
        id: uid('ql'), chargeCode: l.chargeCode, description: l.description, basis: l.basis,
        quantity: 1, buyRate: l.buyRate, sellRate: l.sellRate, currency: l.currency,
        vatApplicable: l.vatApplicable, optional: !l.mandatory,
      })),
    }))
    toast.push({ tone: 'success', title: `Priced from ${pkg.code}`, description: `${pkg.rateLines.length} lines copied — set the quantities from the equipment list.` })
  }

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.customerId) e.customerId = 'A customer is required'
    if (!draft.commodity.trim()) e.commodity = 'Commodity is required'
    if (draft.polCode === draft.podCode) e.podCode = 'Origin and destination must differ'
    if (new Date(draft.validTo) <= new Date(draft.validFrom)) e.validTo = 'Validity must end after it starts'
    if (draft.lines.length === 0) e.lines = 'A quotation needs at least one line'
    if (draft.lines.some((l) => l.sellRate < l.buyRate)) e.lines = 'One or more lines sell below cost'
    setErrors(e)
    if (e.lines) setTab('pricing')
    else if (e.validTo) setTab('terms')
    else if (Object.keys(e).length) setTab('brief')
    if (Object.keys(e).length) return
    upsertQuotation(draft)
    toast.push({ tone: 'success', title: initial ? 'Quotation updated' : 'Quotation created', description: `${draft.number} v${draft.version}` })
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-4xl"
      eyebrow={
        <div className="flex items-center gap-2">
          <Badge tone={initial ? 'primary' : 'accent'} size="sm">
            {initial ? `${initial.number} · v${initial.version}` : 'New quotation'}
          </Badge>
          {draft.revisionOfId && <Badge tone="warning" size="sm">Revision</Badge>}
        </div>
      }
      title={initial ? `${draft.commodity.slice(0, 60)}` : 'Quote an enquiry'}
      description="Price it from a rate card, keep the buy rate visible, and record what it is worth before it is sent."
      footer={
        <>
          <div className="mr-auto flex items-center gap-3 text-[12px]">
            <span className="text-fg-muted">
              Sell <span className="tnum font-semibold text-fg">{draft.currency} {fmtMoney(totals.revenue, draft.currency)}</span>
            </span>
            <span className="text-fg-muted">
              Margin <span className="tnum font-semibold text-fg">{fmtMoney(totals.margin, draft.currency)}</span>
            </span>
            <Badge tone={totals.marginPct >= 20 ? 'success' : totals.marginPct >= 12 ? 'warning' : 'danger'} size="sm">
              {fmtPercent(totals.marginPct)}
            </Badge>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save}>{initial ? 'Save quotation' : 'Create quotation'}</Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        className="px-5"
        items={[
          { value: 'brief', label: 'Enquiry brief', icon: <FileText /> },
          { value: 'pricing', label: 'Pricing', icon: <Calculator />, count: draft.lines.length },
          { value: 'terms', label: 'Terms & pipeline', icon: <Route /> },
        ]}
      />

      {tab === 'brief' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Quotation number" required>
            <Input value={draft.number} onChange={(e) => set('number', e.target.value)} className="font-mono" />
          </Field>
          <Field label="Enquiry source" help="Where the opportunity came from — feeds the channel mix report.">
            <Select
              value={draft.source}
              onChange={(v) => set('source', v)}
              options={[
                { value: 'INBOUND_RFQ', label: 'Inbound RFQ', description: 'Client asked us to quote' },
                { value: 'OUTBOUND', label: 'Outbound approach', description: 'We went after it' },
                { value: 'TENDER', label: 'Tender', description: 'Formal multi-lane bid' },
                { value: 'RENEWAL', label: 'Renewal', description: 'Existing lane, new period' },
                { value: 'AGENT_NOMINATION', label: 'Agent nomination', description: 'Routed to us by an overseas agent' },
              ]}
            />
          </Field>
          <Field label="Customer" required error={errors.customerId}>
            <Select
              searchable
              value={draft.customerId || null}
              onChange={(v) => {
                const c = customers.find((x) => x.id === v)!
                setDraft((d) => ({
                  ...d, customerId: v,
                  customerOfficeId: c.offices.find((o) => o.isBillingOffice)?.id ?? c.offices[0]?.id ?? '',
                  contactName: c.offices[0]?.contacts[0]?.name,
                  incoterm: c.defaultIncoterm, paymentTerm: c.defaultPaymentTerm,
                }))
              }}
              options={customers.map((c) => ({
                value: c.id, label: c.tradeName || c.legalName,
                description: `${c.code}${c.status !== 'ACTIVE' ? ` · ${titleCase(c.status)}` : ''}`,
                disabled: c.status === 'BLACKLISTED',
              }))}
              invalid={!!errors.customerId}
            />
          </Field>
          <Field label="Contact">
            <Select
              clearable
              value={draft.contactName ?? null}
              onClear={() => set('contactName', undefined)}
              onChange={(v) => set('contactName', v)}
              options={(customer?.offices ?? []).flatMap((o) => o.contacts.map((c) => ({ value: c.name, label: c.name, description: `${c.title ?? ''} · ${o.name}` })))}
              placeholder={customer ? 'Select a contact' : 'Pick a customer first'}
              disabled={!customer}
            />
          </Field>
          {overLimit && (
            <div className="sm:col-span-2 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-warning-soft-fg">
              <span className="font-semibold">{customer!.tradeName ?? customer!.legalName} is over their credit limit</span> by{' '}
              {fmtCurrency(customer!.outstandingAr - customer!.creditLimit, 'IDR')}. Quote if you must, but the job will be gated
              at booking unless a director releases it or the terms change.
            </div>
          )}
          <Field label="Commodity" required error={errors.commodity} className="sm:col-span-2">
            <Input value={draft.commodity} onChange={(e) => set('commodity', e.target.value)} placeholder="Teak dining sets, knock-down" invalid={!!errors.commodity} />
          </Field>
          <Field label="HS codes" help="Drives duty treatment and the LARTAS restriction check.">
            <Input
              value={draft.hsCodes.join(', ')}
              onChange={(e) => set('hsCodes', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              className="font-mono"
              placeholder="9403.60"
            />
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
          <Field label="Port of loading" required>
            <Select
              searchable
              value={draft.polCode}
              onChange={(v) => {
                const p = PORTS.find((x) => x.code === v)!
                setDraft((d) => ({ ...d, polCode: v, polName: p.name }))
              }}
              options={PORTS.map((p) => ({ value: p.code, label: p.name, description: `${p.city} · ${p.code}`, icon: <span className="text-[14px]">{countryFlag(p.country)}</span>, group: p.country === 'ID' ? 'Indonesia' : 'Overseas' }))}
            />
          </Field>
          <Field label="Port of discharge" required error={errors.podCode}>
            <Select
              searchable
              value={draft.podCode}
              onChange={(v) => {
                const p = PORTS.find((x) => x.code === v)!
                setDraft((d) => ({ ...d, podCode: v, podName: p.name, destCountry: p.country }))
              }}
              options={PORTS.map((p) => ({ value: p.code, label: p.name, description: `${p.city} · ${p.code}`, icon: <span className="text-[14px]">{countryFlag(p.country)}</span> }))}
              invalid={!!errors.podCode}
            />
          </Field>
          <Field label="Cargo volume (CBM)">
            <Input type="number" value={draft.cargoCbm ?? 0} onChange={(e) => set('cargoCbm', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Cargo weight (kg)">
            <Input type="number" value={draft.cargoWeightKg ?? 0} onChange={(e) => set('cargoWeightKg', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Cargo value" hint={draft.currency}>
            <Input type="number" value={draft.cargoValue ?? 0} onChange={(e) => set('cargoValue', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Owner">
            <Select value={draft.ownerName} onChange={(v) => set('ownerName', v)} options={TEAM.map((t) => ({ value: t, label: t }))} />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Equipment requested" help="Quantities here can be pushed straight onto per-container rate lines.">
              <div className="space-y-2 rounded-lg border border-border bg-surface-sunken p-3">
                {draft.equipment.length === 0 && (
                  <p className="text-[12px] text-fg-subtle">No equipment listed — normal for LCL, air and breakbulk.</p>
                )}
                {draft.equipment.map((eq, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      size="sm"
                      className="max-w-[220px]"
                      value={eq.type}
                      onChange={(v) =>
                        setDraft((d) => ({ ...d, equipment: d.equipment.map((x, xi) => (xi === i ? { ...x, type: v as ContainerType } : x)) }))
                      }
                      options={CONTAINER_TYPES.map((t) => ({ value: t, label: t }))}
                    />
                    <Input
                      type="number"
                      className="tnum h-8 w-24 text-[12.5px]"
                      value={eq.quantity}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, equipment: d.equipment.map((x, xi) => (xi === i ? { ...x, quantity: Number(e.target.value) } : x)) }))
                      }
                    />
                    <span className="text-[12px] text-fg-muted">units</span>
                    <div className="flex-1" />
                    <Button
                      variant="dangerGhost"
                      size="iconXs"
                      onClick={() => setDraft((d) => ({ ...d, equipment: d.equipment.filter((_, xi) => xi !== i) }))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setDraft((d) => ({ ...d, equipment: [...d.equipment, { type: '40HC', quantity: 1 }] }))}
                >
                  <Plus /> Add equipment
                </Button>
              </div>
            </Field>
          </div>
        </div>
      )}

      {tab === 'pricing' && (
        <div className="p-5">
          <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface-sunken px-3.5 py-3">
            <Field label="Price from a service package" className="min-w-[280px] flex-1">
              <Select
                clearable
                searchable
                value={draft.packageId ?? null}
                onClear={() => set('packageId', undefined)}
                onChange={applyPackage}
                options={packages.map((p) => ({
                  value: p.id, label: p.name,
                  description: `${p.code} · ${p.originPortName} → ${p.destPortName} · ${titleCase(p.status)}`,
                  disabled: p.status === 'EXPIRED' || p.status === 'ARCHIVED',
                }))}
                placeholder="Price this quotation by hand"
              />
            </Field>
            {draft.equipment.length > 0 && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  const total = draft.equipment.reduce((a, e) => a + e.quantity, 0)
                  setDraft((d) => ({
                    ...d,
                    lines: d.lines.map((l) => (l.basis === 'PER_CONTAINER' ? { ...l, quantity: total } : l)),
                  }))
                  toast.push({ tone: 'success', title: `Per-container lines set to ${total}`, description: 'From the equipment list on the brief.' })
                }}
              >
                <Package /> Apply equipment count
              </Button>
            )}
          </div>

          {errors.lines && <p className="mb-3 text-[12.5px] font-medium text-danger">{errors.lines}</p>}

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[1.5fr_1.1fr_0.7fr_0.8fr_0.8fr_0.6fr_0.6fr_36px] gap-2 border-b border-border bg-surface-sunken px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
              <span>Charge</span><span>Basis</span><span className="text-right">Qty</span>
              <span className="text-right">Buy</span><span className="text-right">Sell</span>
              <span className="text-right">Margin</span><span className="text-center">Opt.</span><span />
            </div>
            <div className="divide-y divide-border">
              {draft.lines.map((l) => {
                const m = l.sellRate ? ((l.sellRate - l.buyRate) / l.sellRate) * 100 : 0
                return (
                  <div key={l.id} className={`grid grid-cols-[1.5fr_1.1fr_0.7fr_0.8fr_0.8fr_0.6fr_0.6fr_36px] items-center gap-2 px-3 py-2 ${l.optional ? 'opacity-70' : ''}`}>
                    <Select
                      size="sm"
                      searchable
                      value={l.chargeCode}
                      onChange={(v) => {
                        const meta = CHARGE_CODES.find((c) => c.code === v)!
                        patchLine(l.id, { chargeCode: v, description: meta.name, basis: meta.basis, vatApplicable: meta.vat })
                      }}
                      options={CHARGE_CODES.map((c) => ({ value: c.code, label: c.name, description: c.code, group: titleCase(c.category) }))}
                    />
                    <Select
                      size="sm"
                      value={l.basis}
                      onChange={(v) => patchLine(l.id, { basis: v })}
                      options={(['PER_CONTAINER', 'PER_CBM', 'PER_KG', 'PER_TON', 'PER_BL', 'PER_SHIPMENT', 'PER_DOCUMENT', 'PERCENT_OF_VALUE'] as const).map((b) => ({ value: b, label: titleCase(b) }))}
                    />
                    <Input type="number" className="tnum h-8 text-right text-[12.5px]" value={l.quantity} onChange={(e) => patchLine(l.id, { quantity: Number(e.target.value) })} />
                    <Input type="number" className="tnum h-8 text-right text-[12.5px]" value={l.buyRate} onChange={(e) => patchLine(l.id, { buyRate: Number(e.target.value) })} />
                    <Input type="number" className="tnum h-8 text-right text-[12.5px]" value={l.sellRate} onChange={(e) => patchLine(l.id, { sellRate: Number(e.target.value) })} invalid={l.sellRate < l.buyRate} />
                    <span className={`tnum text-right text-[12px] font-medium ${m < 0 ? 'text-danger' : m < 10 ? 'text-warning' : 'text-success'}`}>{fmtPercent(m, 0)}</span>
                    <span className="flex justify-center">
                      <Switch size="sm" checked={l.optional} onChange={(v) => patchLine(l.id, { optional: v })} />
                    </span>
                    <Button variant="dangerGhost" size="iconXs" onClick={() => setDraft((d) => ({ ...d, lines: d.lines.filter((x) => x.id !== l.id) }))}>
                      <Trash2 />
                    </Button>
                  </div>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-sunken px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    lines: [...d.lines, { id: uid('ql'), chargeCode: 'OFR', description: 'Ocean Freight', basis: 'PER_CONTAINER', quantity: 1, buyRate: 0, sellRate: 0, currency: d.currency, vatApplicable: false, optional: false }],
                  }))
                }
              >
                <Plus /> Add line
              </Button>
              <div className="flex items-center gap-4 text-[12px]">
                <span className="text-fg-muted">Buy <span className="tnum font-semibold text-fg">{fmtMoney(totals.cost, draft.currency)}</span></span>
                <span className="text-fg-muted">Sell <span className="tnum font-semibold text-fg">{fmtMoney(totals.revenue, draft.currency)}</span></span>
                {totals.optional > 0 && (
                  <span className="text-fg-subtle">+{fmtMoney(totals.optional, draft.currency)} optional</span>
                )}
                <Badge tone={totals.marginPct >= 20 ? 'success' : totals.marginPct >= 12 ? 'warning' : 'danger'} size="sm">
                  {fmtPercent(totals.marginPct)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2.5 rounded-lg border border-border bg-surface-sunken px-3.5 py-2.5">
            <Info className="mt-px size-4 shrink-0 text-fg-muted" />
            <p className="text-[12px] leading-relaxed text-fg-muted">
              Optional lines are shown to the client but excluded from the headline price and the margin. On conversion,
              only the non-optional lines become charge lines on the job.
            </p>
          </div>
        </div>
      )}

      {tab === 'terms' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Incoterm 2020" help={incoterm ? `Risk passes at: ${incoterm.transferPoint}` : undefined}>
            <Select
              searchable
              value={draft.incoterm}
              onChange={(v) => set('incoterm', v)}
              options={INCOTERMS.map((i) => ({ value: i.code, label: `${i.code} — ${i.label}`, description: i.transferPoint }))}
            />
          </Field>
          <Field label="Service scope">
            <Select
              value={draft.scope}
              onChange={(v) => set('scope', v)}
              options={[
                { value: 'PORT_TO_PORT', label: 'Port to port' },
                { value: 'DOOR_TO_PORT', label: 'Door to port' },
                { value: 'PORT_TO_DOOR', label: 'Port to door' },
                { value: 'DOOR_TO_DOOR', label: 'Door to door' },
              ]}
            />
          </Field>
          <Field label="Payment term">
            <Select
              value={draft.paymentTerm}
              onChange={(v) => set('paymentTerm', v)}
              options={[
                { value: 'TT_ADVANCE', label: 'TT in advance' },
                { value: 'CAD', label: 'Cash against documents' },
                { value: 'NET_7', label: 'Net 7' }, { value: 'NET_14', label: 'Net 14' },
                { value: 'NET_30', label: 'Net 30' }, { value: 'NET_45', label: 'Net 45' },
                { value: 'NET_60', label: 'Net 60' },
                { value: 'LC_AT_SIGHT', label: 'L/C at sight' }, { value: 'LC_USANCE', label: 'L/C usance' },
                { value: 'CONSIGNMENT_SETTLEMENT', label: 'Consignment settlement' },
              ]}
            />
          </Field>
          <Field label="Quoting currency">
            <Select
              value={draft.currency}
              onChange={(v) => set('currency', v)}
              options={(['USD', 'IDR', 'EUR', 'SGD', 'AUD', 'JPY', 'CNY'] as const).map((c) => ({ value: c, label: c }))}
            />
          </Field>
          <Field label="FX rate to IDR">
            <Input type="number" value={draft.fxRate} onChange={(e) => set('fxRate', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Transit days">
            <Input type="number" value={draft.transitDays} onChange={(e) => set('transitDays', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Free time (days)">
            <Input type="number" value={draft.freeTimeDays} onChange={(e) => set('freeTimeDays', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Status">
            <Select
              value={draft.status}
              onChange={(v) => set('status', v)}
              options={[
                { value: 'DRAFT', label: 'Draft', description: 'Not sent yet' },
                { value: 'SENT', label: 'Sent to client' },
                { value: 'UNDER_NEGOTIATION', label: 'Under negotiation' },
                { value: 'WITHDRAWN', label: 'Withdrawn' },
              ]}
            />
          </Field>
          <Field label="Valid from">
            <DatePicker value={draft.validFrom} onChange={(v) => set('validFrom', v ?? draft.validFrom)} />
          </Field>
          <Field label="Valid to" error={errors.validTo} help="Past this date the quotation counts as expired wherever it appears.">
            <DatePicker value={draft.validTo} onChange={(v) => set('validTo', v ?? draft.validTo)} />
          </Field>
          <Field label="Probability" hint={`${draft.probability}%`} help="Used for the weighted pipeline figure.">
            <Input
              type="range"
              min={0}
              max={100}
              step={5}
              value={draft.probability}
              onChange={(e) => set('probability', Number(e.target.value))}
              className="h-9 cursor-pointer px-0 accent-[hsl(var(--primary))]"
            />
          </Field>
          <Field label="Expected close">
            <DatePicker value={draft.expectedCloseAt} onChange={(v) => set('expectedCloseAt', v ?? undefined)} />
          </Field>
          <Field label="Terms shown to the client" className="sm:col-span-2">
            <Textarea value={draft.terms ?? ''} onChange={(e) => set('terms', e.target.value)} rows={3} placeholder="Validity, exclusions, space and equipment caveats…" />
          </Field>
          <Field label="Internal remarks" className="sm:col-span-2" hint="never shown to the client">
            <Textarea value={draft.remarks ?? ''} onChange={(e) => set('remarks', e.target.value)} rows={3} />
          </Field>
        </div>
      )}
    </Sheet>
  )
}

function blank(existing: Quotation[], numbering: { key: string; prefix: string; padding: number; nextNumber: number; includeYear: boolean }[]): Quotation {
  const series = numbering.find((n) => n.key === 'quotation')
  const year = new Date().getFullYear()
  const head = series ? `${series.prefix}-${series.includeYear ? `${year}-` : ''}` : 'QT-'
  const max = existing
    .map((q) => parseInt(q.number.slice(head.length), 10))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => Math.max(a, b), series?.nextNumber ? series.nextNumber - 1 : 0)
  const now = new Date().toISOString()
  const validTo = new Date()
  validTo.setDate(validTo.getDate() + 30)
  return {
    id: uid('qt'),
    number: `${head}${String(max + 1).padStart(series?.padding ?? 4, '0')}`,
    version: 1,
    customerId: '', customerOfficeId: '',
    source: 'INBOUND_RFQ', status: 'DRAFT',
    mode: 'FCL', scope: 'PORT_TO_PORT', incoterm: 'FOB', paymentTerm: 'NET_30',
    polCode: 'IDTPP', polName: 'Tanjung Priok', podCode: 'SGSIN', podName: 'Singapore', destCountry: 'SG',
    commodity: '', hsCodes: [], equipment: [{ type: '40HC', quantity: 1 }],
    currency: 'USD', fxRate: 16250, transitDays: 14, freeTimeDays: 7,
    validFrom: now.slice(0, 10), validTo: validTo.toISOString().slice(0, 10),
    lines: [], probability: 50, ownerName: 'Rina Wulandari',
    createdAt: now, updatedAt: now,
    events: [{ id: uid('qe'), at: now, type: 'CREATED', note: 'Quotation opened.', actor: 'Rina Wulandari' }],
  }
}

export { HS_CODES }
