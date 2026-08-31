import * as React from 'react'
import { Boxes, FlaskConical, Pencil, Plus, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react'
import type { AdditionalService, RateBasis, ServiceCategory, ServiceTrigger } from '@/data/types'
import {
  DOC_TYPES, SERVICE_CATEGORIES, SERVICE_TRIGGERS, docTypeLabel, serviceCategoryLabel, serviceTriggerLabel,
} from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { Sheet } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select, MultiSelect } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { fmtCurrency, pluralDays, titleCase } from '@/lib/format'
import { uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

const BASES: RateBasis[] = ['PER_CONTAINER', 'PER_CBM', 'PER_KG', 'PER_TON', 'PER_BL', 'PER_SHIPMENT', 'PER_DOCUMENT', 'PERCENT_OF_VALUE']

const marginPct = (s: AdditionalService) => (s.sellRate ? ((s.sellRate - s.buyRate) / s.sellRate) * 100 : 0)

export function ServicesPage() {
  const toast = useToast()
  const { services, jobServices, removeServices, importServices, upsertService } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<AdditionalService | null>(null)
  const [deleting, setDeleting] = React.useState<AdditionalService | null>(null)
  const [category, setCategory] = React.useState<string[]>([])
  const [trigger, setTrigger] = React.useState<string[]>([])
  const [state, setState] = React.useState<string[]>([])

  const usage = React.useMemo(() => {
    const m = new Map<string, number>()
    jobServices.forEach((j) => m.set(j.serviceId, (m.get(j.serviceId) ?? 0) + 1))
    return m
  }, [jobServices])

  const gated = services.filter((s) => s.mandatoryWhen.length > 0)
  const sold = jobServices.filter((j) => ['ACCEPTED', 'BOOKED', 'IN_PROGRESS', 'COMPLETED'].includes(j.status))
  const soldValue = sold.reduce((a, j) => a + (j.sellRate - j.buyRate) * j.quantity, 0)
  const refused = jobServices.filter((j) => j.status === 'DECLINED' && j.mandatory)

  const columns: Column<AdditionalService>[] = [
    {
      key: 'code', header: 'Code', width: 'w-[112px]', pinned: true, sortable: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.code}</span>,
    },
    {
      key: 'name', header: 'Service', width: 'min-w-[280px]', sortable: true,
      sortValue: (r) => r.name, exportValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.name}</p>
          <p className="truncate text-[11px] text-fg-muted">{r.deliverable}</p>
        </div>
      ),
    },
    {
      key: 'category', header: 'Category', width: 'w-[142px]', sortable: true,
      sortValue: (r) => r.category, exportValue: (r) => r.category,
      cell: (r) => <Badge tone="outline" size="sm">{serviceCategoryLabel(r.category)}</Badge>,
    },
    {
      key: 'rules', header: 'When it applies', width: 'min-w-[260px]',
      sortable: true, sortValue: (r) => r.mandatoryWhen.length,
      exportValue: (r) => `mandatory:${r.mandatoryWhen.join('|')} suggested:${r.suggestedWhen.join('|')}`,
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.mandatoryWhen.map((t) => (
            <Badge key={t} tone="danger" size="sm">{serviceTriggerLabel(t)}</Badge>
          ))}
          {r.suggestedWhen.slice(0, 2).map((t) => (
            <Badge key={t} tone="neutral" size="sm">{serviceTriggerLabel(t)}</Badge>
          ))}
          {r.suggestedWhen.length > 2 && <Badge tone="neutral" size="sm">+{r.suggestedWhen.length - 2}</Badge>}
          {!r.mandatoryWhen.length && !r.suggestedWhen.length && <span className="text-fg-subtle">on request</span>}
        </div>
      ),
    },
    {
      key: 'basis', header: 'Basis', width: 'w-[136px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.basis, exportValue: (r) => r.basis,
      cell: (r) => <span className="text-[12.5px] text-fg-muted">{titleCase(r.basis)}</span>,
    },
    {
      key: 'buy', header: 'Buy', width: 'w-[128px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.buyRate, exportValue: (r) => r.buyRate,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{r.basis === 'PERCENT_OF_VALUE' ? `${r.buyRate}%` : fmtCurrency(r.buyRate, r.currency, { compact: true })}</span>,
    },
    {
      key: 'sell', header: 'Sell', width: 'w-[128px]', align: 'right', sortable: true,
      sortValue: (r) => r.sellRate, exportValue: (r) => r.sellRate,
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{r.basis === 'PERCENT_OF_VALUE' ? `${r.sellRate}%` : fmtCurrency(r.sellRate, r.currency, { compact: true })}</span>,
    },
    {
      key: 'margin', header: 'Margin', width: 'w-[104px]', align: 'right', sortable: true,
      sortValue: (r) => marginPct(r), exportValue: (r) => marginPct(r).toFixed(1),
      cell: (r) => {
        const m = marginPct(r)
        return <span className={`tnum text-[12.5px] ${m >= 35 ? 'text-success' : m >= 20 ? 'text-fg' : 'text-warning'}`}>{m.toFixed(0)}%</span>
      },
    },
    {
      key: 'lead', header: 'Lead time', width: 'w-[118px]', align: 'right', sortable: true,
      sortValue: (r) => r.leadTimeDays, exportValue: (r) => r.leadTimeDays,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{r.leadTimeDays ? pluralDays(r.leadTimeDays) : 'same day'}</span>,
    },
    {
      key: 'document', header: 'Produces', width: 'w-[176px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.producesDocument ?? '', exportValue: (r) => r.producesDocument ?? '',
      cell: (r) => (r.producesDocument ? <Badge tone="info" size="sm">{docTypeLabel(r.producesDocument)}</Badge> : <span className="text-fg-subtle">—</span>),
    },
    {
      key: 'usage', header: 'On jobs', width: 'w-[96px]', align: 'right', sortable: true,
      sortValue: (r) => usage.get(r.id) ?? 0, exportValue: (r) => usage.get(r.id) ?? 0,
      cell: (r) => {
        const n = usage.get(r.id) ?? 0
        return n ? <span className="tnum text-[12.5px] text-fg">{n}</span> : <span className="text-fg-subtle">—</span>
      },
    },
    {
      key: 'active', header: 'State', width: 'w-[104px]', sortable: true,
      sortValue: (r) => (r.active ? 'ACTIVE' : 'RETIRED'), exportValue: (r) => (r.active ? 'ACTIVE' : 'RETIRED'),
      cell: (r) => <Badge tone={r.active ? 'success' : 'neutral'} size="sm" dot>{r.active ? 'Active' : 'Retired'}</Badge>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Additional Services"
        description="Freight is the smallest part of the invoice on a job that needs treating, crating, surveying or insuring. Each entry carries the rule that puts it on a job — furniture on timber pallets pulls in ISPM-15 fumigation, an Australian destination pulls in seasonal BMSB treatment — so the desk sells the right scope without remembering the regulation."
        actions={
          <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus /> New service
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Catalogue" value={services.length} icon={<Boxes />} accent="primary" sub={`${services.filter((s) => s.active).length} active · ${gated.length} rule-driven`} />
        <KpiCard label="Attached to live jobs" value={jobServices.length} icon={<FlaskConical />} accent="accent" sub={`${sold.length} accepted or beyond`} />
        <KpiCard label="Service margin booked" value={fmtCurrency(soldValue, 'IDR', { compact: true })} icon={<ShieldCheck />} accent="success" sub="Sell less buy on accepted services" />
        <KpiCard
          label="Mandatory but refused"
          value={refused.length}
          icon={<TriangleAlert />}
          accent={refused.length ? 'danger' : 'success'}
          sub={refused.length ? 'Jobs blocked until resolved' : 'Nothing outstanding'}
        />
      </div>

      <DataTable
        data={services}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.code} — ${r.name}`}
        entityLabel="service"
        storageKey="services"
        exportName="additional-services"
        initialSort={{ key: 'category', dir: 'asc' }}
        searchText={(r) => [r.code, r.name, r.description, r.deliverable, r.category, r.chargeCode, ...r.mandatoryWhen, ...r.suggestedWhen].join(' ')}
        onRowClick={(r) => { setEditing(r); setFormOpen(true) }}
        rowTone={(r) => (!r.active ? 'opacity-60' : undefined)}
        filters={[
          {
            key: 'category', label: 'Category', values: category, onChange: setCategory,
            options: SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
            match: (r, v) => v.includes(r.category),
          },
          {
            key: 'trigger', label: 'Trigger', values: trigger, onChange: setTrigger,
            options: SERVICE_TRIGGERS.map((t) => ({ value: t.value, label: t.label })),
            match: (r, v) => [...r.mandatoryWhen, ...r.suggestedWhen].some((t) => v.includes(t)),
          },
          {
            key: 'state', label: 'State', values: state, onChange: setState,
            options: [{ value: 'ACTIVE', label: 'Active' }, { value: 'RETIRED', label: 'Retired' }, { value: 'MANDATORY', label: 'Has a mandatory rule' }],
            match: (r, v) =>
              (v.includes('ACTIVE') && r.active) ||
              (v.includes('RETIRED') && !r.active) ||
              (v.includes('MANDATORY') && r.mandatoryWhen.length > 0),
          },
        ]}
        onDelete={(ids) => {
          const used = services.filter((s) => ids.includes(s.id) && (usage.get(s.id) ?? 0) > 0)
          if (used.length) {
            toast.push({
              tone: 'error',
              title: 'Cannot delete a service that is on a job',
              description: `${used.map((s) => s.code).join(', ')} ${used.length === 1 ? 'is' : 'are'} referenced by live job services. Retire ${used.length === 1 ? 'it' : 'them'} so the history survives.`,
            })
            return
          }
          removeServices(ids)
          toast.push({ tone: 'success', title: `${ids.length} services deleted` })
        }}
        cascadeWarning={(rows) => {
          const used = rows.filter((s) => (usage.get(s.id) ?? 0) > 0)
          return used.length
            ? [`${used.map((s) => s.code).join(', ')} ${used.length === 1 ? 'is' : 'are'} attached to jobs — deletion will be refused. Retire instead.`]
            : []
        }}
        bulkActions={(rows, clear) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              rows.forEach((r) => upsertService({ ...r, active: false }))
              toast.push({ tone: 'success', title: `${rows.length} services retired`, description: 'They stop being suggested on new jobs but stay on the ones that bought them.' })
              clear()
            }}
          >
            Retire
          </Button>
        )}
        importFields={[
          { key: 'code', label: 'Service code', required: true },
          { key: 'name', label: 'Service name', required: true },
          { key: 'category', label: 'Category', required: true, hint: 'TREATMENT, PACKING, INSPECTION…' },
          { key: 'description', label: 'Description' },
          { key: 'deliverable', label: 'Deliverable' },
          { key: 'basis', label: 'Rate basis', hint: 'PER_CONTAINER, PER_CBM…' },
          { key: 'buyRate', label: 'Buy rate' },
          { key: 'sellRate', label: 'Sell rate' },
          { key: 'currency', label: 'Currency' },
          { key: 'leadTimeDays', label: 'Lead time (days)' },
          { key: 'chargeCode', label: 'Charge code' },
          { key: 'producesDocument', label: 'Produces document' },
          { key: 'mandatoryWhen', label: 'Mandatory when', hint: 'Pipe separated triggers' },
          { key: 'suggestedWhen', label: 'Suggested when', hint: 'Pipe separated triggers' },
          { key: 'active', label: 'Active', hint: 'true / false' },
        ]}
        importSample={{
          code: 'SHRINK', name: 'Pallet shrink wrapping', category: 'PACKING',
          description: 'Machine shrink wrap with corner boards.', deliverable: 'Wrapped pallets ready for stuffing.',
          basis: 'PER_CBM', buyRate: '18000', sellRate: '32000', currency: 'IDR', leadTimeDays: '1',
          chargeCode: 'STUFF', producesDocument: '', mandatoryWhen: '', suggestedWhen: 'FRAGILE|LCL', active: 'true',
        }}
        toImportRow={(r) => ({
          code: r.code, name: r.name, category: r.category, description: r.description, deliverable: r.deliverable,
          basis: r.basis, buyRate: r.buyRate, sellRate: r.sellRate, currency: r.currency,
          leadTimeDays: r.leadTimeDays, chargeCode: r.chargeCode, producesDocument: r.producesDocument ?? '',
          mandatoryWhen: r.mandatoryWhen.join('|'), suggestedWhen: r.suggestedWhen.join('|'), active: String(r.active),
        })}
        onImport={(rows) => {
          const mapped = rows.map((r) => {
            const existing = services.find((s) => s.code === r.code)
            return {
              ...(existing ?? {}),
              id: existing?.id ?? uid('svc'),
              code: r.code, name: r.name,
              category: (SERVICE_CATEGORIES.some((c) => c.value === r.category) ? r.category : 'HANDLING') as ServiceCategory,
              description: r.description || '', deliverable: r.deliverable || '',
              basis: (BASES.includes(r.basis as RateBasis) ? r.basis : 'PER_SHIPMENT') as RateBasis,
              buyRate: Number(r.buyRate) || 0, sellRate: Number(r.sellRate) || 0,
              currency: (r.currency || 'IDR') as AdditionalService['currency'],
              leadTimeDays: Number(r.leadTimeDays) || 0,
              chargeCode: r.chargeCode || 'ADMIN',
              producesDocument: (r.producesDocument || undefined) as AdditionalService['producesDocument'],
              mandatoryWhen: (r.mandatoryWhen ? r.mandatoryWhen.split('|') : []) as ServiceTrigger[],
              suggestedWhen: (r.suggestedWhen ? r.suggestedWhen.split('|') : []) as ServiceTrigger[],
              active: r.active !== 'false',
            } as AdditionalService
          })
          importServices(mapped)
          toast.push({ tone: 'success', title: `${mapped.length} services imported` })
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
            Average margin{' '}
            <span className="font-semibold text-fg">
              {rows.length ? (rows.reduce((a, r) => a + marginPct(r), 0) / rows.length).toFixed(0) : 0}%
            </span>{' '}
            across {rows.length} services
          </span>
        )}
      />

      <ServiceForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="service"
        items={deleting ? [`${deleting.code} — ${deleting.name}`] : []}
        cascade={deleting && (usage.get(deleting.id) ?? 0) > 0 ? [`Attached to ${usage.get(deleting.id)} job(s) — deletion will be refused.`] : undefined}
        onConfirm={() => {
          if (!deleting) return
          if ((usage.get(deleting.id) ?? 0) > 0) {
            toast.push({ tone: 'error', title: 'Deletion refused', description: 'Retire the service instead so the jobs that bought it keep their record.' })
          } else {
            removeServices([deleting.id])
            toast.push({ tone: 'success', title: 'Service deleted' })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}

/* ---------------------------------------------------------------- */

function ServiceForm({
  open, onOpenChange, initial,
}: { open: boolean; onOpenChange: (v: boolean) => void; initial: AdditionalService | null }) {
  const toast = useToast()
  const { upsertService, services } = useErp()
  const blank = (): AdditionalService => ({
    id: uid('svc'), code: '', name: '', category: 'HANDLING', description: '', deliverable: '',
    basis: 'PER_CONTAINER', buyRate: 0, sellRate: 0, currency: 'IDR', leadTimeDays: 1,
    chargeCode: 'ADMIN', mandatoryWhen: [], suggestedWhen: [], active: true,
  })
  const [form, setForm] = React.useState<AdditionalService>(initial ?? blank())
  React.useEffect(() => setForm(initial ? structuredClone(initial) : blank()), [initial, open])
  const set = <K extends keyof AdditionalService>(k: K, v: AdditionalService[K]) => setForm((f) => ({ ...f, [k]: v }))

  const duplicate = services.some((s) => s.code.toUpperCase() === form.code.trim().toUpperCase() && s.id !== form.id)
  const margin = marginPct(form)

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? `Edit ${initial.code}` : 'New additional service'}
      description="A service without a trigger is only ever sold by memory. Give it the conditions that should put it on a job."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!form.code.trim() || !form.name.trim() || duplicate}
            onClick={() => {
              upsertService(form)
              toast.push({ tone: 'success', title: initial ? 'Service updated' : 'Service added' })
              onOpenChange(false)
            }}
          >
            {initial ? 'Save changes' : 'Add service'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Code" required error={duplicate ? 'Already used by another service.' : undefined}>
            <Input value={form.code} invalid={duplicate} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="FUMI-MB" />
          </Field>
          <Field label="Name" required className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Methyl bromide fumigation (ISPM-15)" />
          </Field>
        </div>

        <Field label="Category" required>
          <Select
            value={form.category}
            onChange={(v) => set('category', v)}
            options={SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label, description: c.hint }))}
          />
        </Field>

        <Field label="What we do" help="Internal wording — how the desk briefs the provider.">
          <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
        </Field>

        <Field label="What the customer gets" help="This is the line the client reads on the quotation.">
          <Textarea value={form.deliverable} onChange={(e) => set('deliverable', e.target.value)} rows={2} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mandatory when" help="If any of these fire, the job cannot ship without the service.">
            <MultiSelect
              values={form.mandatoryWhen}
              onChange={(v) => set('mandatoryWhen', v as ServiceTrigger[])}
              options={SERVICE_TRIGGERS.map((t) => ({ value: t.value, label: t.label, description: t.detectedFrom }))}
              placeholder="No mandatory rule"
            />
          </Field>
          <Field label="Suggested when" help="Offered, not enforced — the desk decides.">
            <MultiSelect
              values={form.suggestedWhen}
              onChange={(v) => set('suggestedWhen', v as ServiceTrigger[])}
              options={SERVICE_TRIGGERS.map((t) => ({ value: t.value, label: t.label, description: t.detectedFrom }))}
              placeholder="Never suggested"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Basis" required>
            <Select value={form.basis} onChange={(v) => set('basis', v)} options={BASES.map((b) => ({ value: b, label: titleCase(b) }))} />
          </Field>
          <Field label="Buy rate">
            <Input type="number" value={form.buyRate} onChange={(e) => set('buyRate', Number(e.target.value))} />
          </Field>
          <Field label="Sell rate" error={form.sellRate > 0 && form.sellRate < form.buyRate ? 'Selling below cost.' : undefined}>
            <Input type="number" value={form.sellRate} invalid={form.sellRate > 0 && form.sellRate < form.buyRate} onChange={(e) => set('sellRate', Number(e.target.value))} />
          </Field>
          <Field label="Margin" hint={`${margin.toFixed(0)}%`}>
            <div className="flex h-9 items-center rounded-lg border border-border bg-bg-muted px-3">
              <span className={`tnum text-[13px] font-medium ${margin >= 30 ? 'text-success' : margin >= 15 ? 'text-fg' : 'text-warning'}`}>
                {form.basis === 'PERCENT_OF_VALUE' ? `${(form.sellRate - form.buyRate).toFixed(2)} pts` : fmtCurrency(form.sellRate - form.buyRate, form.currency, { compact: true })}
              </span>
            </div>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Currency">
            <Select
              value={form.currency}
              onChange={(v) => set('currency', v)}
              options={(['IDR', 'USD', 'EUR', 'SGD'] as const).map((c) => ({ value: c, label: c }))}
            />
          </Field>
          <Field label="Lead time (days)" help="How early the desk has to book it before the cut-off.">
            <Input type="number" value={form.leadTimeDays} onChange={(e) => set('leadTimeDays', Number(e.target.value))} />
          </Field>
          <Field label="Charge code" help="Where the cost lands on the job's charge sheet.">
            <Input value={form.chargeCode} onChange={(e) => set('chargeCode', e.target.value.toUpperCase())} />
          </Field>
        </div>

        <Field label="Produces document" help="The certificate this service returns, so the document register can expect it.">
          <Select
            value={form.producesDocument ?? null}
            onChange={(v) => set('producesDocument', v)}
            clearable
            onClear={() => set('producesDocument', undefined)}
            searchable
            placeholder="No document"
            options={DOC_TYPES.map((d) => ({ value: d.type, label: d.label }))}
          />
        </Field>

        <Field label="Notes" help="The consequence of skipping it — this is what the desk quotes back to a client who refuses.">
          <Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={2} />
        </Field>

        <Checkbox checked={form.active} onChange={(v) => set('active', v)} label="Active — offer this on new jobs" />
      </div>
    </Sheet>
  )
}
