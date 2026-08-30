import * as React from 'react'
import { Anchor, Boxes, Building2, CalendarClock, HandCoins, Info, Repeat } from 'lucide-react'
import type { Project } from '@/data/types'
import { CARRIERS, INCOTERMS, PORTS, countryFlag, TEAM } from '@/data/reference'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Switch } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { nextCode, uid } from '@/lib/utils'
import { fmtCurrency, relativeDays } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { useToast } from '@/components/ui/toast'
import { STAGE_TEMPLATE } from './stageTemplate'

export function ProjectForm({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Project | null
}) {
  const { projects, customers, packages, upsertProject, upsertCharge } = useErp()
  const toast = useToast()
  const [tab, setTab] = React.useState<'job' | 'parties' | 'route' | 'commercial' | 'consignment'>('job')
  const [draft, setDraft] = React.useState<Project>(() => blank(projects))
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [applyPackageRates, setApplyPackageRates] = React.useState(!initial)

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank(projects))
      setTab('job')
      setErrors({})
      setApplyPackageRates(!initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const set = <K extends keyof Project>(k: K, v: Project[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const client = customers.find((c) => c.id === draft.clientId)
  const shipper = customers.find((c) => c.id === draft.shipperId)
  const consignee = customers.find((c) => c.id === draft.consigneeId)
  const pkg = packages.find((p) => p.id === draft.packageId)
  const incoterm = INCOTERMS.find((i) => i.code === draft.incoterm)

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.tradeName || c.legalName,
    description: `${c.code} · ${c.offices.length} offices${c.status !== 'ACTIVE' ? ` · ${c.status.replace('_', ' ')}` : ''}`,
    disabled: c.status === 'BLACKLISTED',
  }))
  const officeOptions = (customerId: string) =>
    (customers.find((c) => c.id === customerId)?.offices ?? []).map((o) => ({
      value: o.id,
      label: o.name,
      description: `${o.city}, ${o.country}${o.portName ? ` · ${o.portName}` : ''}`,
      icon: <span className="text-[14px]">{countryFlag(o.countryCode)}</span>,
    }))

  const creditWarning =
    client && client.creditLimit > 0 && client.outstandingAr > client.creditLimit
      ? `${client.tradeName ?? client.legalName} is over their credit limit by ${fmtCurrency(client.outstandingAr - client.creditLimit, 'IDR')}. This job will be gated at the inquiry stage.`
      : client?.status === 'ON_HOLD'
        ? `${client.tradeName ?? client.legalName} is on hold. A director release is required before booking.`
        : null

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.name.trim()) e.name = 'Job name is required'
    if (!draft.code.trim()) e.code = 'Code is required'
    if (projects.some((p) => p.code === draft.code && p.id !== draft.id)) e.code = 'Code already exists'
    if (!draft.clientId) e.clientId = 'A paying client is required'
    if (!draft.shipperId) e.shipperId = 'A shipper is required'
    if (!draft.consigneeId) e.consigneeId = 'A consignee is required'
    if (draft.polCode === draft.podCode) e.podCode = 'Origin and destination must differ'
    if (draft.etd && draft.eta && new Date(draft.eta) < new Date(draft.etd)) e.eta = 'ETA cannot be before ETD'
    if (draft.type === 'CONSIGNMENT' && !draft.consignment?.agreementNo) e.agreementNo = 'A consignment agreement number is required'
    setErrors(e)
    if (e.clientId || e.shipperId || e.consigneeId) setTab('parties')
    else if (e.podCode || e.eta) setTab('route')
    else if (e.agreementNo) setTab('consignment')
    else if (Object.keys(e).length) setTab('job')
    if (Object.keys(e).length) return

    upsertProject(draft)

    if (applyPackageRates && pkg) {
      pkg.rateLines
        .filter((l) => l.mandatory)
        .forEach((l) =>
          upsertCharge({
            id: uid('chg'), projectId: draft.id, chargeCode: l.chargeCode, description: l.description,
            category: 'FREIGHT', basis: l.basis, quantity: 1, buyRate: l.buyRate, sellRate: l.sellRate,
            currency: l.currency, fxRate: draft.fxRate, vatApplicable: l.vatApplicable, whtApplicable: false,
            freightTerm: draft.freightTerm, billable: true, status: 'DRAFT', fromPackage: true,
            createdAt: new Date().toISOString(),
          }),
        )
    }

    toast.push({
      tone: 'success',
      title: initial ? 'Job updated' : 'Job created',
      description: applyPackageRates && pkg ? `${draft.code} — ${pkg.rateLines.filter((l) => l.mandatory).length} charge lines copied from ${pkg.code}` : draft.code,
    })
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-4xl"
      eyebrow={<Badge tone={initial ? 'primary' : 'accent'} size="sm">{initial ? `Editing ${initial.code}` : 'New export job'}</Badge>}
      title={initial ? initial.name : 'Open an export job'}
      description="A job carries the commercial terms, the parties, the route and the cut-off calendar. Containers, documents and charges hang off it."
      footer={
        <>
          {creditWarning && <span className="mr-auto max-w-md text-[11.5px] leading-snug text-warning">{creditWarning}</span>}
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save}>{initial ? 'Save changes' : 'Create job'}</Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        className="px-5"
        items={[
          { value: 'job', label: 'Job', icon: <Boxes /> },
          { value: 'parties', label: 'Parties', icon: <Building2 /> },
          { value: 'route', label: 'Route & schedule', icon: <Anchor /> },
          { value: 'commercial', label: 'Commercial', icon: <HandCoins /> },
          ...(draft.type === 'CONSIGNMENT' ? [{ value: 'consignment' as const, label: 'Consignment', icon: <Repeat /> }] : []),
        ]}
      />

      {tab === 'job' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Project code" required error={errors.code}>
            <Input value={draft.code} onChange={(e) => set('code', e.target.value)} className="font-mono" invalid={!!errors.code} />
          </Field>
          <Field label="Job number" help="Your internal operations reference, printed on the file cover.">
            <Input value={draft.jobNo} onChange={(e) => set('jobNo', e.target.value)} className="font-mono" />
          </Field>
          <Field label="Job name" required error={errors.name} className="sm:col-span-2">
            <Input value={draft.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} placeholder="Jati Makmur — Rotterdam Furniture W38" />
          </Field>
          <Field label="Job type" help="Consignment jobs keep title with the shipper until the consignee sells.">
            <Select
              value={draft.type}
              onChange={(v) => {
                set('type', v)
                if (v === 'CONSIGNMENT' && !draft.consignment)
                  set('consignment', {
                    agreementNo: '', titleRetained: true, settlementCycleDays: 30, commissionPct: 20,
                    unsoldReturnDays: 120, reportedUnitsSold: 0, totalUnitsShipped: 0, settledAmount: 0,
                    currency: draft.currency,
                  })
              }}
              options={[
                { value: 'FULL_EXPORT', label: 'Full export', description: 'Straight sale, title passes per Incoterm' },
                { value: 'CONSIGNMENT', label: 'Consignment', description: 'Title retained until sold at destination' },
                { value: 'PARTIAL_LCL', label: 'Partial / LCL', description: 'Consolidated with other shippers' },
                { value: 'PROJECT_CARGO', label: 'Project cargo', description: 'Out-of-gauge or breakbulk' },
                { value: 'TRIANGULAR', label: 'Triangular', description: 'Billed to a third country' },
                { value: 'CROSS_TRADE', label: 'Cross trade', description: 'Neither origin nor destination is Indonesia' },
              ]}
            />
          </Field>
          <Field label="Priority">
            <Select
              value={draft.priority}
              onChange={(v) => set('priority', v)}
              options={[
                { value: 'STANDARD', label: 'Standard' },
                { value: 'HIGH', label: 'High', description: 'Watch the cut-offs daily' },
                { value: 'CRITICAL', label: 'Critical', description: 'Line-stop or L/C risk' },
              ]}
            />
          </Field>
          <Field label="Status">
            <Select
              value={draft.status}
              onChange={(v) => set('status', v)}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'ON_HOLD', label: 'On hold' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </Field>
          <Field label="Operations owner">
            <Select value={draft.ownerName} onChange={(v) => set('ownerName', v)} options={TEAM.map((t) => ({ value: t, label: t }))} />
          </Field>
          <Field label="Commodity" required className="sm:col-span-2">
            <Input value={draft.commodity} onChange={(e) => set('commodity', e.target.value)} placeholder="Teak dining sets, knock-down" />
          </Field>
          <Field label="HS codes" help="Comma separated. Drives duty treatment and any restricted-goods checks.">
            <Input
              value={draft.hsCodes.join(', ')}
              onChange={(e) => set('hsCodes', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              className="font-mono"
              placeholder="9403.60, 4407.29"
            />
          </Field>
          <Field label="Dangerous goods">
            <div className="flex h-9 items-center gap-2.5">
              <Switch checked={draft.dangerousGoods} onChange={(v) => set('dangerousGoods', v)} />
              <span className="text-[12.5px] text-fg-muted">
                {draft.dangerousGoods ? 'IMDG declaration and MSDS required' : 'General cargo'}
              </span>
            </div>
          </Field>
          <Field label="Remarks" className="sm:col-span-2">
            <Textarea value={draft.remarks ?? ''} onChange={(e) => set('remarks', e.target.value)} rows={2} />
          </Field>
        </div>
      )}

      {tab === 'parties' && (
        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-border bg-surface-sunken p-3.5">
            <p className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold text-fg">
              <Info className="size-4 text-fg-muted" />
              A customer can play more than one role. The client pays; the shipper loads; the consignee receives.
            </p>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Client (bill to)" required error={errors.clientId}>
                <Select
                  searchable
                  value={draft.clientId || null}
                  onChange={(v) => {
                    const c = customers.find((x) => x.id === v)!
                    set('clientId', v)
                    set('clientOfficeId', c.offices.find((o) => o.isBillingOffice)?.id ?? c.offices[0]?.id ?? '')
                    if (!initial) {
                      set('paymentTerm', c.defaultPaymentTerm)
                      set('incoterm', c.defaultIncoterm)
                    }
                  }}
                  options={customerOptions}
                  placeholder="Select the paying party"
                  invalid={!!errors.clientId}
                />
              </Field>
              <Field label="Billing office">
                <Select
                  value={draft.clientOfficeId || null}
                  onChange={(v) => set('clientOfficeId', v)}
                  options={officeOptions(draft.clientId)}
                  placeholder={client ? 'Select an office' : 'Pick a client first'}
                  disabled={!client}
                />
              </Field>
              <Field label="Shipper" required error={errors.shipperId}>
                <Select
                  searchable
                  value={draft.shipperId || null}
                  onChange={(v) => {
                    const c = customers.find((x) => x.id === v)!
                    set('shipperId', v)
                    const off = c.offices.find((o) => o.roles.includes('SHIPPER')) ?? c.offices[0]
                    set('shipperOfficeId', off?.id ?? '')
                    if (off?.portCode) {
                      set('polCode', off.portCode)
                      set('polName', off.portName ?? off.portCode)
                    }
                  }}
                  options={customerOptions}
                  invalid={!!errors.shipperId}
                />
              </Field>
              <Field label="Shipper office (loading)">
                <Select
                  value={draft.shipperOfficeId || null}
                  onChange={(v) => {
                    set('shipperOfficeId', v)
                    const off = shipper?.offices.find((o) => o.id === v)
                    if (off?.portCode) {
                      set('polCode', off.portCode)
                      set('polName', off.portName ?? off.portCode)
                    }
                  }}
                  options={officeOptions(draft.shipperId)}
                  disabled={!shipper}
                />
              </Field>
              <Field label="Consignee" required error={errors.consigneeId}>
                <Select
                  searchable
                  value={draft.consigneeId || null}
                  onChange={(v) => {
                    const c = customers.find((x) => x.id === v)!
                    set('consigneeId', v)
                    const off = c.offices.find((o) => o.roles.includes('CONSIGNEE') && o.countryCode !== 'ID') ?? c.offices[0]
                    set('consigneeOfficeId', off?.id ?? '')
                    if (off?.portCode) {
                      set('podCode', off.portCode)
                      set('podName', off.portName ?? off.portCode)
                      set('destCountry', off.countryCode)
                    }
                  }}
                  options={customerOptions}
                  invalid={!!errors.consigneeId}
                />
              </Field>
              <Field label="Consignee office (delivery)">
                <Select
                  value={draft.consigneeOfficeId || null}
                  onChange={(v) => {
                    set('consigneeOfficeId', v)
                    const off = consignee?.offices.find((o) => o.id === v)
                    if (off) {
                      set('destCountry', off.countryCode)
                      if (off.portCode) {
                        set('podCode', off.portCode)
                        set('podName', off.portName ?? off.portCode)
                      }
                    }
                  }}
                  options={officeOptions(draft.consigneeId)}
                  disabled={!consignee}
                />
              </Field>
              <Field label="Notify party" hint="optional" className="sm:col-span-2">
                <Select
                  clearable
                  searchable
                  value={draft.notifyPartyId ?? null}
                  onClear={() => set('notifyPartyId', undefined)}
                  onChange={(v) => set('notifyPartyId', v)}
                  options={customerOptions}
                  placeholder="Same as consignee"
                />
              </Field>
            </div>
          </div>
          {creditWarning && (
            <div className="rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-3 text-[12.5px] leading-relaxed text-warning-soft-fg">
              {creditWarning}
            </div>
          )}
        </div>
      )}

      {tab === 'route' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
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
          <Field label="Place of receipt" hint="optional">
            <Input value={draft.placeOfReceipt ?? ''} onChange={(e) => set('placeOfReceipt', e.target.value)} placeholder="Shipper factory, Jepara" />
          </Field>
          <Field label="Place of delivery" hint="optional">
            <Input value={draft.placeOfDelivery ?? ''} onChange={(e) => set('placeOfDelivery', e.target.value)} />
          </Field>
          <Field label="Port of loading" required>
            <Select
              searchable
              value={draft.polCode}
              onChange={(v) => {
                const p = PORTS.find((x) => x.code === v)!
                set('polCode', v)
                set('polName', p.name)
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
                set('podCode', v)
                set('podName', p.name)
                set('destCountry', p.country)
              }}
              options={PORTS.map((p) => ({ value: p.code, label: p.name, description: `${p.city} · ${p.code}`, icon: <span className="text-[14px]">{countryFlag(p.country)}</span> }))}
              invalid={!!errors.podCode}
            />
          </Field>
          <Field label="Transhipment port" hint="optional">
            <Input value={draft.transhipmentPort ?? ''} onChange={(e) => set('transhipmentPort', e.target.value)} placeholder="Singapore" />
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
          <Field label="Vessel">
            <Input value={draft.vessel ?? ''} onChange={(e) => set('vessel', e.target.value)} />
          </Field>
          <Field label="Voyage">
            <Input value={draft.voyage ?? ''} onChange={(e) => set('voyage', e.target.value)} className="font-mono" />
          </Field>
          <Field label="Booking number">
            <Input value={draft.bookingNo ?? ''} onChange={(e) => set('bookingNo', e.target.value)} className="font-mono" />
          </Field>
          <Field label="B/L type" help="Original 3/3 must be couriered and surrendered; telex and seaway release without paper.">
            <Select
              value={draft.blType}
              onChange={(v) => set('blType', v)}
              options={[
                { value: 'ORIGINAL_3_3', label: 'Original B/L (3/3)', description: 'Paper set couriered to the consignee' },
                { value: 'TELEX_RELEASE', label: 'Telex release', description: 'Surrendered at origin' },
                { value: 'SEAWAY', label: 'Sea waybill', description: 'Non-negotiable, no surrender' },
                { value: 'EXPRESS', label: 'Express release' },
              ]}
            />
          </Field>

          <div className="sm:col-span-2">
            <p className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-fg">
              <CalendarClock className="size-4 text-fg-muted" /> Cut-off calendar
              <span className="font-normal text-fg-muted">— every operational alert is derived from these dates</span>
            </p>
            <div className="grid gap-3.5 rounded-xl border border-border bg-surface-sunken p-3.5 sm:grid-cols-3">
              <Field label="SI cut-off" hint={hint(draft.siCutoff)}>
                <DatePicker value={draft.siCutoff} onChange={(v) => set('siCutoff', v ?? undefined)} size="sm" />
              </Field>
              <Field label="VGM cut-off" hint={hint(draft.vgmCutoff)}>
                <DatePicker value={draft.vgmCutoff} onChange={(v) => set('vgmCutoff', v ?? undefined)} size="sm" />
              </Field>
              <Field label="Gate-in cut-off" hint={hint(draft.gateInCutoff)}>
                <DatePicker value={draft.gateInCutoff} onChange={(v) => set('gateInCutoff', v ?? undefined)} size="sm" />
              </Field>
              <Field label="ETD">
                <DatePicker value={draft.etd} onChange={(v) => set('etd', v ?? undefined)} size="sm" />
              </Field>
              <Field label="ETA" error={errors.eta}>
                <DatePicker value={draft.eta} onChange={(v) => set('eta', v ?? undefined)} size="sm" />
              </Field>
              <Field label="Actual departure">
                <DatePicker value={draft.atd} onChange={(v) => set('atd', v ?? undefined)} size="sm" />
              </Field>
            </div>
          </div>

          <div className="sm:col-span-2 grid gap-3.5 sm:grid-cols-3">
            <Field label="PEB number" help="Indonesian export declaration filed through CEISA.">
              <Input value={draft.pebNumber ?? ''} onChange={(e) => set('pebNumber', e.target.value)} className="font-mono" />
            </Field>
            <Field label="COO form" help="Form D (ATIGA), Form E (ACFTA), Form AK (AKFTA), JIEPA, EUR.1…">
              <Input value={draft.cooForm ?? ''} onChange={(e) => set('cooForm', e.target.value)} />
            </Field>
            <Field label="COO number">
              <Input value={draft.cooNumber ?? ''} onChange={(e) => set('cooNumber', e.target.value)} className="font-mono" />
            </Field>
          </div>
        </div>
      )}

      {tab === 'commercial' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Service package" help="Applying a package copies its mandatory rate lines onto the job's charge sheet." className="sm:col-span-2">
            <Select
              clearable
              searchable
              value={draft.packageId ?? null}
              onClear={() => set('packageId', undefined)}
              onChange={(v) => {
                set('packageId', v)
                const p = packages.find((x) => x.id === v)
                if (p) {
                  set('currency', p.currency)
                  set('incoterm', p.incoterm)
                  set('scope', p.scope)
                  setApplyPackageRates(true)
                }
              }}
              options={packages.map((p) => ({
                value: p.id,
                label: p.name,
                description: `${p.code} · ${p.originPortName} → ${p.destPortName} · ${p.status}`,
                disabled: p.status === 'EXPIRED' || p.status === 'ARCHIVED',
              }))}
              placeholder="Price this job manually"
            />
          </Field>
          {pkg && (
            <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary-soft/50 px-3.5 py-2.5">
              <div className="text-[12px] leading-relaxed text-primary-soft-fg">
                <p className="font-semibold">{pkg.rateLines.filter((l) => l.mandatory).length} mandatory rate lines available</p>
                <p>Copy them to the charge sheet now, or add charges by hand later.</p>
              </div>
              <Switch checked={applyPackageRates} onChange={setApplyPackageRates} />
            </div>
          )}
          <Field label="Incoterm 2020" help={incoterm ? `Risk passes at: ${incoterm.transferPoint}` : undefined}>
            <Select
              searchable
              value={draft.incoterm}
              onChange={(v) => set('incoterm', v)}
              options={INCOTERMS.map((i) => ({ value: i.code, label: `${i.code} — ${i.label}`, description: i.transferPoint }))}
            />
          </Field>
          <Field label="Freight term">
            <Select
              value={draft.freightTerm}
              onChange={(v) => set('freightTerm', v)}
              options={[
                { value: 'PREPAID', label: 'Prepaid', description: 'Freight billed at origin' },
                { value: 'COLLECT', label: 'Collect', description: 'Freight billed at destination' },
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
                { value: 'NET_7', label: 'Net 7' },
                { value: 'NET_14', label: 'Net 14' },
                { value: 'NET_30', label: 'Net 30' },
                { value: 'NET_45', label: 'Net 45' },
                { value: 'NET_60', label: 'Net 60' },
                { value: 'LC_AT_SIGHT', label: 'L/C at sight' },
                { value: 'LC_USANCE', label: 'L/C usance' },
                { value: 'CONSIGNMENT_SETTLEMENT', label: 'Consignment settlement' },
              ]}
            />
          </Field>
          <Field label="Job currency">
            <Select
              value={draft.currency}
              onChange={(v) => set('currency', v)}
              options={(['USD', 'IDR', 'EUR', 'SGD', 'AUD', 'JPY', 'CNY'] as const).map((c) => ({ value: c, label: c }))}
            />
          </Field>
          <Field label="FX rate to IDR" help="Rate used to translate the charge sheet into the ledger.">
            <Input type="number" value={draft.fxRate} onChange={(e) => set('fxRate', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Quoted revenue" hint={draft.currency}>
            <Input type="number" value={draft.quotedRevenue} onChange={(e) => set('quotedRevenue', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Cargo value" hint={draft.cargoCurrency}>
            <Input type="number" value={draft.cargoValue} onChange={(e) => set('cargoValue', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Insured" help="CIF and CIP oblige the seller to insure at 110% of the invoice value.">
            <div className="flex h-9 items-center gap-2.5">
              <Switch
                checked={draft.insured}
                onChange={(v) => {
                  set('insured', v)
                  if (v) set('insuranceValue', Math.round(draft.cargoValue * 1.1))
                }}
              />
              <span className="text-[12.5px] text-fg-muted">
                {draft.insured ? `Cover ${fmtCurrency(draft.insuranceValue ?? 0, draft.cargoCurrency)}` : 'Not insured'}
                {incoterm?.sellerInsures && !draft.insured && <span className="ml-1 text-warning">— {draft.incoterm} requires cover</span>}
              </span>
            </div>
          </Field>
          <Field label="Tags" help="Free labels used for filtering — e.g. europe, lc, reefer.">
            <Input
              value={draft.tags.join(', ')}
              onChange={(e) => set('tags', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            />
          </Field>
        </div>
      )}

      {tab === 'consignment' && draft.consignment && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-xl border border-purple/25 bg-purple-soft/50 px-3.5 py-3 text-[12.5px] leading-relaxed text-purple-soft-fg">
            Under consignment the goods stay the shipper's property until the consignee sells them. The forwarder bills the
            logistics package immediately; the goods are settled on a reporting cycle, and unsold stock returns after the
            agreed window.
          </div>
          <Field label="Agreement number" required error={errors.agreementNo}>
            <Input
              value={draft.consignment.agreementNo}
              onChange={(e) => set('consignment', { ...draft.consignment!, agreementNo: e.target.value })}
              className="font-mono"
              invalid={!!errors.agreementNo}
              placeholder="CNS-BALI-2026-09"
            />
          </Field>
          <Field label="Settlement cycle (days)">
            <Input
              type="number"
              value={draft.consignment.settlementCycleDays}
              onChange={(e) => set('consignment', { ...draft.consignment!, settlementCycleDays: Number(e.target.value) })}
              className="tnum"
            />
          </Field>
          <Field label="Commission to consignee (%)">
            <Input
              type="number"
              value={draft.consignment.commissionPct}
              onChange={(e) => set('consignment', { ...draft.consignment!, commissionPct: Number(e.target.value) })}
              className="tnum"
            />
          </Field>
          <Field label="Unsold return window (days)" help="After this, unsold stock must be returned or bought out.">
            <Input
              type="number"
              value={draft.consignment.unsoldReturnDays}
              onChange={(e) => set('consignment', { ...draft.consignment!, unsoldReturnDays: Number(e.target.value) })}
              className="tnum"
            />
          </Field>
          <Field label="Units shipped">
            <Input
              type="number"
              value={draft.consignment.totalUnitsShipped}
              onChange={(e) => set('consignment', { ...draft.consignment!, totalUnitsShipped: Number(e.target.value) })}
              className="tnum"
            />
          </Field>
          <Field label="Minimum guaranteed units" hint="optional">
            <Input
              type="number"
              value={draft.consignment.minimumGuaranteedUnits ?? 0}
              onChange={(e) => set('consignment', { ...draft.consignment!, minimumGuaranteedUnits: Number(e.target.value) })}
              className="tnum"
            />
          </Field>
          <Field label="Units reported sold">
            <Input
              type="number"
              value={draft.consignment.reportedUnitsSold}
              onChange={(e) => set('consignment', { ...draft.consignment!, reportedUnitsSold: Number(e.target.value) })}
              className="tnum"
            />
          </Field>
          <Field label="Last sales report">
            <DatePicker
              value={draft.consignment.lastSalesReportAt}
              onChange={(v) => set('consignment', { ...draft.consignment!, lastSalesReportAt: v ?? undefined })}
            />
          </Field>
        </div>
      )}
    </Sheet>
  )
}

const hint = (iso?: string) => {
  const d = relativeDays(iso)
  if (d === null) return undefined
  return d < 0 ? `${Math.abs(d)} d ago` : `in ${d} d`
}

function blank(existing: Project[]): Project {
  const now = new Date().toISOString()
  return {
    id: uid('prj'),
    code: nextCode('PRJ', existing.map((p) => p.code), 4, true),
    jobNo: `JKT/EXP/${String(new Date().getFullYear()).slice(-2)}/${String(existing.length + 1).padStart(4, '0')}`,
    name: '', type: 'FULL_EXPORT', status: 'DRAFT', priority: 'STANDARD', stage: 'INQUIRY',
    stages: STAGE_TEMPLATE(),
    clientId: '', clientOfficeId: '', shipperId: '', shipperOfficeId: '', consigneeId: '', consigneeOfficeId: '',
    mode: 'FCL', scope: 'PORT_TO_PORT', incoterm: 'FOB', freightTerm: 'PREPAID', paymentTerm: 'NET_30',
    commodity: '', hsCodes: [], cargoValue: 0, cargoCurrency: 'USD', insured: false, dangerousGoods: false,
    polCode: 'IDTPP', polName: 'Tanjung Priok', podCode: 'SGSIN', podName: 'Singapore', destCountry: 'SG',
    blType: 'ORIGINAL_3_3', blStatus: 'NOT_ISSUED',
    currency: 'USD', fxRate: 16250, quotedRevenue: 0, ownerName: 'Rina Wulandari',
    createdAt: now, updatedAt: now, tags: [], timeline: [
      { id: uid('tl'), at: now, type: 'STATUS', title: 'Job created', actor: 'Rina Wulandari' },
    ],
  }
}
