import * as React from 'react'
import {
  Award, Building, Handshake, Pencil, Plus, ShieldAlert, Trash2, TriangleAlert, Truck,
} from 'lucide-react'
import type { Partner, PartnerType } from '@/data/types'
import { COUNTRIES, PARTNER_TYPES, countryFlag } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { Sheet } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select, MultiSelect } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Progress } from '@/components/ui/misc'
import { partnerGrade, partnerOverall, partnerSpend } from '@/lib/analytics2'
import { fmtCurrency, fmtDate, pluralDays, relativeDays, titleCase } from '@/lib/format'
import { nextCode, uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

export function PartnersPage() {
  const toast = useToast()
  const { partners, charges, removePartners, importPartners, upsertPartner } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Partner | null>(null)
  const [deleting, setDeleting] = React.useState<Partner | null>(null)
  const [type, setType] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<string[]>([])
  const [country, setCountry] = React.useState<string[]>([])

  const active = partners.filter((p) => p.status === 'ACTIVE')
  const apTotal = partners.reduce((a, p) => a + p.apOutstanding, 0)
  const expiring = partners.filter((p) => {
    const d = relativeDays(p.contractValidTo)
    return d !== null && d >= 0 && d <= 45
  })
  const watchlist = partners.filter((p) => {
    const s = partnerOverall(p)
    return s !== null && s < 78
  })

  const columns: Column<Partner>[] = [
    {
      key: 'code', header: 'Code', width: 'w-[112px]', pinned: true, sortable: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.code}</span>,
    },
    {
      key: 'name', header: 'Partner', width: 'min-w-[240px]', sortable: true,
      sortValue: (r) => r.name, exportValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.name}</p>
          <p className="truncate text-[11px] text-fg-muted">
            {r.city}, {r.country}
            {r.scac && <span className="ml-1.5 font-mono">{r.scac}</span>}
          </p>
        </div>
      ),
    },
    {
      key: 'types', header: 'Role', width: 'min-w-[210px]', sortable: true,
      sortValue: (r) => r.types.join(','), exportValue: (r) => r.types.join('|'),
      cell: (r) => (
        <div className="flex gap-1">
          {r.types.slice(0, 2).map((t) => (
            <Badge key={t} tone="outline" size="sm">{PARTNER_TYPES.find((x) => x.value === t)?.label ?? titleCase(t)}</Badge>
          ))}
          {r.types.length > 2 && <Badge tone="neutral" size="sm">+{r.types.length - 2}</Badge>}
        </div>
      ),
    },
    {
      key: 'country', header: 'Country', width: 'w-[150px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.country, exportValue: (r) => r.countryCode,
      cell: (r) => (
        <span className="flex items-center gap-1.5 text-[12.5px] text-fg">
          <span className="text-[15px]">{countryFlag(r.countryCode)}</span> {r.country}
        </span>
      ),
    },
    {
      key: 'score', header: 'Scorecard', width: 'w-[180px]', sortable: true,
      sortValue: (r) => partnerOverall(r) ?? -1,
      exportValue: (r) => partnerOverall(r)?.toFixed(0) ?? '',
      cell: (r) => {
        const s = partnerOverall(r)
        const grade = partnerGrade(s)
        if (s === null) return <Badge tone="neutral" size="sm">Unrated</Badge>
        return (
          <div className="flex items-center gap-2">
            <Progress value={s} tone={s >= 90 ? 'success' : s >= 78 ? 'primary' : s >= 65 ? 'warning' : 'danger'} className="w-[70px]" />
            <span className="tnum text-[12px] font-medium text-fg">{s.toFixed(0)}</span>
            <Badge tone={grade.tone} size="sm">{grade.label}</Badge>
          </div>
        )
      },
    },
    {
      key: 'onTime', header: 'On time', width: 'w-[96px]', align: 'right', sortable: true,
      sortValue: (r) => r.score.onTimePct, exportValue: (r) => r.score.onTimePct,
      cell: (r) => (r.score.jobsHandled ? <span className={`tnum text-[12.5px] ${r.score.onTimePct >= 90 ? 'text-success' : r.score.onTimePct >= 80 ? 'text-warning' : 'text-danger'}`}>{r.score.onTimePct}%</span> : <span className="text-fg-subtle">—</span>),
    },
    {
      key: 'docAccuracy', header: 'Doc accuracy', width: 'w-[128px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.score.docAccuracyPct, exportValue: (r) => r.score.docAccuracyPct,
      cell: (r) => (r.score.jobsHandled ? <span className="tnum text-[12.5px] text-fg-muted">{r.score.docAccuracyPct}%</span> : <span className="text-fg-subtle">—</span>),
    },
    {
      key: 'jobs', header: 'Jobs', width: 'w-[84px]', align: 'right', sortable: true,
      sortValue: (r) => r.score.jobsHandled, exportValue: (r) => r.score.jobsHandled,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{r.score.jobsHandled}</span>,
    },
    {
      key: 'disputes', header: 'Disputes', width: 'w-[104px]', align: 'right', sortable: true,
      sortValue: (r) => r.score.openDisputes, exportValue: (r) => r.score.openDisputes,
      cell: (r) => (r.score.openDisputes ? <Badge tone="danger" size="sm">{r.score.openDisputes}</Badge> : <span className="text-fg-subtle">—</span>),
    },
    {
      key: 'spend', header: 'Spend', width: 'w-[140px]', align: 'right', sortable: true,
      sortValue: (r) => partnerSpend(r, charges).cost, exportValue: (r) => Math.round(partnerSpend(r, charges).cost),
      cell: (r) => {
        const s = partnerSpend(r, charges)
        return s.cost ? <span className="tnum text-[12.5px] text-fg">{fmtCurrency(s.cost, 'IDR', { compact: true })}</span> : <span className="text-fg-subtle">—</span>
      },
    },
    {
      key: 'ap', header: 'AP open', width: 'w-[136px]', align: 'right', sortable: true,
      sortValue: (r) => r.apOutstanding, exportValue: (r) => r.apOutstanding,
      cell: (r) => (r.apOutstanding ? <span className="tnum text-[12.5px] text-warning">{fmtCurrency(r.apOutstanding, 'IDR', { compact: true })}</span> : <span className="text-fg-subtle">—</span>),
    },
    {
      key: 'contract', header: 'Contract to', width: 'w-[148px]', sortable: true,
      sortValue: (r) => r.contractValidTo ?? '9999', exportValue: (r) => r.contractValidTo ?? '',
      cell: (r) => {
        if (!r.contractValidTo) return <span className="text-fg-subtle">no contract</span>
        const d = relativeDays(r.contractValidTo)!
        return (
          <div>
            <p className="tnum text-[12.5px] text-fg">{fmtDate(r.contractValidTo)}</p>
            <p className={`text-[11px] ${d < 0 ? 'text-danger' : d <= 45 ? 'text-warning' : 'text-fg-muted'}`}>
              {d < 0 ? 'expired' : `${pluralDays(d)} left`}
            </p>
          </div>
        )
      },
    },
    {
      key: 'status', header: 'Status', width: 'w-[120px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
  ]

  return (
    <>
      <PageHeader
        title="Partners & Vendors"
        description="A forwarder's cost base is its vendors, and the overseas agent decides whether the destination leg succeeds. Every carrier, agent, trucker, depot and broker is a managed counterparty here — with a contract, a scorecard and an AP position, not a name typed onto a charge line."
        actions={
          <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus /> New partner
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Partners" value={partners.length} icon={<Handshake />} accent="primary" sub={`${active.length} active · ${partners.filter((p) => p.status === 'SUSPENDED').length} suspended`} />
        <KpiCard label="AP exposure" value={fmtCurrency(apTotal, 'IDR', { compact: true })} icon={<Building />} accent="warning" sub="Open across the network" />
        <KpiCard label="Contracts expiring ≤45 days" value={expiring.length} icon={<TriangleAlert />} accent={expiring.length ? 'warning' : 'success'} sub={expiring.length ? expiring.map((p) => p.name.split(' ')[0]).join(', ') : 'Nothing to renegotiate'} />
        <KpiCard label="On the watchlist" value={watchlist.length} icon={<ShieldAlert />} accent={watchlist.length ? 'danger' : 'success'} sub="Below the approved score" />
      </div>

      <DataTable
        data={partners}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.code} — ${r.name}`}
        entityLabel="partner"
        storageKey="partners"
        exportName="partners"
        initialSort={{ key: 'score', dir: 'desc' }}
        searchText={(r) => [r.code, r.name, r.city, r.country, r.scac, r.contractNo, ...r.types, ...r.services, ...r.lanes].join(' ')}
        onRowClick={(r) => { setEditing(r); setFormOpen(true) }}
        rowTone={(r) => (r.status === 'SUSPENDED' ? 'bg-danger-soft/20' : undefined)}
        filters={[
          {
            key: 'type', label: 'Role', values: type, onChange: setType,
            options: PARTNER_TYPES.map((t) => ({ value: t.value, label: t.label })),
            match: (r, v) => r.types.some((t) => v.includes(t)),
          },
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['ACTIVE', 'PROSPECT', 'SUSPENDED'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'country', label: 'Country', values: country, onChange: setCountry,
            options: Array.from(new Set(partners.map((p) => p.countryCode))).map((c) => ({ value: c, label: `${countryFlag(c)}  ${COUNTRIES.find((x) => x.code === c)?.name ?? c}` })),
            match: (r, v) => v.includes(r.countryCode),
          },
        ]}
        onDelete={(ids) => {
          const used = partners.filter((p) => ids.includes(p.id) && charges.some((c) => c.partnerId === p.id || c.vendor === p.name))
          if (used.length) {
            toast.push({
              tone: 'error',
              title: 'Cannot delete a partner in use',
              description: `${used.map((p) => p.name).join(', ')} ${used.length === 1 ? 'appears' : 'appear'} on charge lines. Suspend ${used.length === 1 ? 'it' : 'them'} instead so the history stays intact.`,
            })
            return
          }
          removePartners(ids)
          toast.push({ tone: 'success', title: `${ids.length} partners deleted` })
        }}
        cascadeWarning={(rows) => {
          const used = rows.filter((p) => charges.some((c) => c.partnerId === p.id || c.vendor === p.name))
          return used.length
            ? [`${used.map((p) => p.name).join(', ')} ${used.length === 1 ? 'is' : 'are'} referenced by charge lines — deletion will be refused. Suspend instead.`]
            : []
        }}
        bulkActions={(rows, clear) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              rows.forEach((r) => upsertPartner({ ...r, status: 'SUSPENDED' }))
              toast.push({ tone: 'success', title: `${rows.length} partners suspended`, description: 'They can no longer be selected on a new charge line.' })
              clear()
            }}
          >
            Suspend
          </Button>
        )}
        importFields={[
          { key: 'code', label: 'Partner code', required: true },
          { key: 'name', label: 'Partner name', required: true },
          { key: 'types', label: 'Roles', required: true, hint: 'Pipe separated: CARRIER|TRUCKING' },
          { key: 'countryCode', label: 'Country code', required: true, hint: 'ISO-2' },
          { key: 'city', label: 'City' },
          { key: 'scac', label: 'SCAC' },
          { key: 'currency', label: 'Currency' },
          { key: 'paymentTermDays', label: 'Payment term days' },
          { key: 'contractNo', label: 'Contract number' },
          { key: 'contractValidTo', label: 'Contract valid to', hint: 'YYYY-MM-DD' },
          { key: 'services', label: 'Services', hint: 'Pipe separated' },
          { key: 'lanes', label: 'Lanes', hint: 'Pipe separated' },
          { key: 'status', label: 'Status' },
          { key: 'onTimePct', label: 'On-time %' },
          { key: 'docAccuracyPct', label: 'Doc accuracy %' },
          { key: 'jobsHandled', label: 'Jobs handled' },
        ]}
        importSample={{
          code: 'VND-0015', name: 'Evergreen Line Indonesia', types: 'CARRIER', countryCode: 'ID', city: 'Jakarta',
          scac: 'EGLV', currency: 'USD', paymentTermDays: '30', contractNo: 'EGLV-2026-01', contractValidTo: '2027-01-31',
          services: 'Ocean freight|Reefer', lanes: 'IDMAK→KRPUS', status: 'ACTIVE', onTimePct: '90',
          docAccuracyPct: '95', jobsHandled: '6',
        }}
        toImportRow={(r) => ({
          code: r.code, name: r.name, types: r.types.join('|'), countryCode: r.countryCode, city: r.city,
          scac: r.scac ?? '', currency: r.currency, paymentTermDays: r.paymentTermDays,
          contractNo: r.contractNo ?? '', contractValidTo: r.contractValidTo ?? '',
          services: r.services.join('|'), lanes: r.lanes.join('|'), status: r.status,
          onTimePct: r.score.onTimePct, docAccuracyPct: r.score.docAccuracyPct, jobsHandled: r.score.jobsHandled,
        })}
        onImport={(rows) => {
          const mapped = rows.map((r) => {
            const existing = partners.find((p) => p.code === r.code)
            const cc = (r.countryCode || 'ID').toUpperCase()
            return {
              ...(existing ?? {}),
              id: existing?.id ?? uid('ptr'),
              code: r.code, name: r.name,
              types: (r.types ? r.types.split('|') : ['CARRIER']) as PartnerType[],
              status: (['ACTIVE', 'PROSPECT', 'SUSPENDED'].includes(r.status) ? r.status : 'ACTIVE') as Partner['status'],
              countryCode: cc, country: COUNTRIES.find((c) => c.code === cc)?.name ?? cc,
              city: r.city || '', scac: r.scac || undefined,
              currency: (r.currency || 'IDR') as Partner['currency'],
              paymentTermDays: Number(r.paymentTermDays) || 30,
              contractNo: r.contractNo || undefined, contractValidTo: r.contractValidTo || undefined,
              services: r.services ? r.services.split('|') : [],
              lanes: r.lanes ? r.lanes.split('|') : [],
              contacts: existing?.contacts ?? [],
              score: {
                onTimePct: Number(r.onTimePct) || 0,
                docAccuracyPct: Number(r.docAccuracyPct) || 0,
                responseHours: existing?.score.responseHours ?? 6,
                openDisputes: existing?.score.openDisputes ?? 0,
                jobsHandled: Number(r.jobsHandled) || 0,
              },
              apOutstanding: existing?.apOutstanding ?? 0,
              onboardedAt: existing?.onboardedAt ?? new Date().toISOString().slice(0, 10),
            } as Partner
          })
          importPartners(mapped)
          toast.push({ tone: 'success', title: `${mapped.length} partners imported` })
        }}
        rowActions={(r) => (
          <>
            <Tooltip content="Edit">
              <Button variant="ghost" size="iconXs" onClick={() => { setEditing(r); setFormOpen(true) }}><Pencil /></Button>
            </Tooltip>
            <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}><Trash2 /></Button>
            </Tooltip>
          </>
        )}
        footerSummary={(rows) => (
          <span className="tnum">
            Spend <span className="font-semibold text-fg">{fmtCurrency(rows.reduce((a, r) => a + partnerSpend(r, charges).cost, 0), 'IDR', { compact: true })}</span> · AP{' '}
            <span className="font-semibold text-fg">{fmtCurrency(rows.reduce((a, r) => a + r.apOutstanding, 0), 'IDR', { compact: true })}</span>
          </span>
        )}
      />

      <PartnerForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="partner"
        items={deleting ? [`${deleting.code} — ${deleting.name}`] : []}
        cascade={
          deleting && charges.some((c) => c.partnerId === deleting.id || c.vendor === deleting.name)
            ? ['This partner appears on charge lines — deletion will be refused. Suspend them instead.']
            : []
        }
        onConfirm={() => {
          if (!deleting) return
          if (charges.some((c) => c.partnerId === deleting.id || c.vendor === deleting.name)) {
            toast.push({ tone: 'error', title: 'Deletion refused', description: `${deleting.name} is referenced by charge lines.` })
          } else {
            removePartners([deleting.id])
            toast.push({ tone: 'success', title: 'Partner deleted' })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}

function PartnerForm({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (v: boolean) => void; initial?: Partner | null }) {
  const { partners, upsertPartner } = useErp()
  const toast = useToast()
  const [draft, setDraft] = React.useState<Partner>(() => blank(partners))
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank(partners))
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const set = <K extends keyof Partner>(k: K, v: Partner[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const overall = partnerOverall(draft)
  const grade = partnerGrade(overall)

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.name.trim()) e.name = 'Name is required'
    if (!draft.code.trim()) e.code = 'Code is required'
    if (partners.some((p) => p.code === draft.code && p.id !== draft.id)) e.code = 'Code already exists'
    if (draft.types.length === 0) e.types = 'Pick at least one role'
    setErrors(e)
    if (Object.keys(e).length) return
    upsertPartner(draft)
    toast.push({ tone: 'success', title: initial ? 'Partner updated' : 'Partner created', description: `${draft.code} — ${draft.name}` })
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-3xl"
      eyebrow={<Badge tone={initial ? 'primary' : 'accent'} size="sm">{initial ? `Editing ${initial.code}` : 'New partner'}</Badge>}
      title={initial ? initial.name : 'Add a partner'}
      description="Carriers, overseas agents, truckers, depots and brokers. What they do, what we pay them, and how well they perform."
      footer={
        <>
          <div className="mr-auto flex items-center gap-2 text-[12px] text-fg-muted">
            Scorecard
            <Badge tone={grade.tone} size="sm">{overall === null ? 'Unrated' : `${overall.toFixed(0)} · ${grade.label}`}</Badge>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save}>{initial ? 'Save partner' : 'Create partner'}</Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Partner code" required error={errors.code}>
          <Input value={draft.code} onChange={(e) => set('code', e.target.value)} className="font-mono" invalid={!!errors.code} />
        </Field>
        <Field label="Status" help="A suspended partner cannot be selected on a new charge line.">
          <Select
            value={draft.status}
            onChange={(v) => set('status', v)}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'PROSPECT', label: 'Prospect', description: 'Quoted, no jobs yet' },
              { value: 'SUSPENDED', label: 'Suspended', description: 'Blocked from new work' },
            ]}
          />
        </Field>
        <Field label="Legal name" required error={errors.name} className="sm:col-span-2">
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} />
        </Field>
        <Field label="Roles" required error={errors.types} className="sm:col-span-2" help="What this partner is allowed to be nominated for.">
          <MultiSelect
            values={draft.types}
            onChange={(v) => set('types', v as PartnerType[])}
            options={PARTNER_TYPES.map((t) => ({ value: t.value, label: t.label, description: t.hint }))}
            placeholder="Select one or more roles"
            maxTags={3}
          />
        </Field>
        <Field label="Country" required>
          <Select
            searchable
            value={draft.countryCode}
            onChange={(v) => {
              const c = COUNTRIES.find((x) => x.code === v)!
              setDraft((d) => ({ ...d, countryCode: v, country: c.name }))
            }}
            options={COUNTRIES.map((c) => ({ value: c.code, label: c.name, description: c.region, icon: <span className="text-[15px]">{c.flag}</span> }))}
          />
        </Field>
        <Field label="City">
          <Input value={draft.city} onChange={(e) => set('city', e.target.value)} />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input value={draft.addressLine ?? ''} onChange={(e) => set('addressLine', e.target.value)} />
        </Field>
        <Field label="SCAC" help="Standard Carrier Alpha Code — carriers only.">
          <Input value={draft.scac ?? ''} onChange={(e) => set('scac', e.target.value.toUpperCase())} className="font-mono uppercase" />
        </Field>
        <Field label="Tax ID">
          <Input value={draft.taxId ?? ''} onChange={(e) => set('taxId', e.target.value)} className="font-mono" />
        </Field>
        <Field label="Currency">
          <Select
            value={draft.currency}
            onChange={(v) => set('currency', v)}
            options={(['IDR', 'USD', 'EUR', 'SGD', 'AUD', 'JPY', 'CNY'] as const).map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Field label="Payment term days">
          <Input type="number" value={draft.paymentTermDays} onChange={(e) => set('paymentTermDays', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Contract number">
          <Input value={draft.contractNo ?? ''} onChange={(e) => set('contractNo', e.target.value)} className="font-mono" />
        </Field>
        <Field label="Contract valid to" help="Raises an exception 45 days before it lapses.">
          <DatePicker value={draft.contractValidTo} onChange={(v) => set('contractValidTo', v ?? undefined)} />
        </Field>
        <Field label="Insurance valid to" help="A subcontractor without cover transfers their risk to us.">
          <DatePicker value={draft.insuranceValidTo} onChange={(v) => set('insuranceValidTo', v ?? undefined)} />
        </Field>
        <Field label="AP outstanding" hint="IDR">
          <Input type="number" value={draft.apOutstanding} onChange={(e) => set('apOutstanding', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Services offered" className="sm:col-span-2" help="Comma separated — shown when nominating on a charge line.">
          <Input
            value={draft.services.join(', ')}
            onChange={(e) => set('services', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            placeholder="Ocean freight, Origin THC, VGM submission"
          />
        </Field>
        <Field label="Lanes served" className="sm:col-span-2" help="Comma separated, e.g. IDSRG→NLRTM.">
          <Input
            value={draft.lanes.join(', ')}
            onChange={(e) => set('lanes', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          />
        </Field>
      </div>

      <div className="border-t border-border bg-surface-sunken/50 p-5">
        <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-fg">
          <Award className="size-4 text-fg-muted" /> Scorecard
          <span className="font-normal text-fg-muted">— measured from job outcomes, editable while the feed is manual</span>
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="On-time %" hint={`${draft.score.onTimePct}%`}>
            <Input type="number" value={draft.score.onTimePct} onChange={(e) => set('score', { ...draft.score, onTimePct: Number(e.target.value) })} className="tnum" />
          </Field>
          <Field label="Document accuracy %">
            <Input type="number" value={draft.score.docAccuracyPct} onChange={(e) => set('score', { ...draft.score, docAccuracyPct: Number(e.target.value) })} className="tnum" />
          </Field>
          <Field label="Avg response (hours)">
            <Input type="number" value={draft.score.responseHours} onChange={(e) => set('score', { ...draft.score, responseHours: Number(e.target.value) })} className="tnum" />
          </Field>
          <Field label="Open disputes">
            <Input type="number" value={draft.score.openDisputes} onChange={(e) => set('score', { ...draft.score, openDisputes: Number(e.target.value) })} className="tnum" />
          </Field>
          <Field label="Jobs handled">
            <Input type="number" value={draft.score.jobsHandled} onChange={(e) => set('score', { ...draft.score, jobsHandled: Number(e.target.value) })} className="tnum" />
          </Field>
          <div className="flex flex-col justify-end">
            <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.07em] text-fg-subtle">Overall</p>
              <p className="tnum mt-1 text-[18px] font-semibold text-fg">{overall === null ? '—' : overall.toFixed(0)}</p>
              <p className="text-[11px] text-fg-muted">45% on-time · 30% docs · 25% responsiveness, less disputes</p>
            </div>
          </div>
        </div>
        <Field label="Notes" className="mt-4">
          <Textarea value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={3} />
        </Field>
      </div>
    </Sheet>
  )
}

function blank(existing: Partner[]): Partner {
  return {
    id: uid('ptr'),
    code: nextCode('VND', existing.map((p) => p.code)),
    name: '', types: [], status: 'PROSPECT',
    countryCode: 'ID', country: 'Indonesia', city: '',
    currency: 'IDR', paymentTermDays: 30,
    services: [], lanes: [], contacts: [],
    score: { onTimePct: 0, docAccuracyPct: 0, responseHours: 6, openDisputes: 0, jobsHandled: 0 },
    apOutstanding: 0, onboardedAt: new Date().toISOString().slice(0, 10),
  }
}

export { Truck }
