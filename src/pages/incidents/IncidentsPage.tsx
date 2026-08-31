import * as React from 'react'
import {
  ClipboardList, HandCoins, Pencil, Plus, ShieldAlert, Trash2, TriangleAlert,
} from 'lucide-react'
import type { Incident, IncidentSeverity, IncidentStatus, IncidentType, LiableParty } from '@/data/types'
import {
  INCIDENT_SEVERITIES, INCIDENT_STATUSES, INCIDENT_TYPES, LIABLE_PARTIES,
  incidentPlaybook, incidentStatusOpen, incidentTypeLabel,
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
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Progress } from '@/components/ui/misc'
import { incidentExposure, incidentsByLiability, incidentsByType } from '@/lib/services'
import { fmtCurrency, fmtDate, fmtDateTime, titleCase } from '@/lib/format'
import { nextCode, uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

const sevTone = (s: IncidentSeverity) => INCIDENT_SEVERITIES.find((x) => x.value === s)?.tone ?? 'neutral'
const statusMeta = (s: IncidentStatus) => INCIDENT_STATUSES.find((x) => x.value === s)

export function IncidentsPage() {
  const toast = useToast()
  const { incidents, projects, partners, removeIncidents, importIncidents, upsertIncident } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Incident | null>(null)
  const [deleting, setDeleting] = React.useState<Incident | null>(null)
  const [type, setType] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<string[]>([])
  const [severity, setSeverity] = React.useState<string[]>([])
  const [liable, setLiable] = React.useState<string[]>([])

  const exposure = incidentExposure(incidents)
  const worst = incidentsByType(incidents)[0]
  const byParty = incidentsByLiability(incidents)
  const ours = byParty.find((p) => p.party === 'FORWARDER')

  const jobCode = (id?: string) => projects.find((p) => p.id === id)?.code ?? '—'
  const partnerName = (id?: string) => partners.find((p) => p.id === id)?.name

  const columns: Column<Incident>[] = [
    {
      key: 'reference', header: 'Reference', width: 'w-[142px]', pinned: true, sortable: true,
      sortValue: (r) => r.reference, exportValue: (r) => r.reference,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.reference}</span>,
    },
    {
      key: 'title', header: 'Incident', width: 'min-w-[320px]', sortable: true,
      sortValue: (r) => r.title, exportValue: (r) => r.title,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.title}</p>
          <p className="truncate text-[11px] text-fg-muted">
            {incidentTypeLabel(r.type)} · {jobCode(r.projectId)}
          </p>
        </div>
      ),
    },
    {
      key: 'severity', header: 'Severity', width: 'w-[112px]', sortable: true,
      sortValue: (r) => ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].indexOf(r.severity),
      exportValue: (r) => r.severity,
      cell: (r) => <Badge tone={sevTone(r.severity) as never} size="sm" dot>{titleCase(r.severity)}</Badge>,
    },
    {
      key: 'status', header: 'Status', width: 'w-[150px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => {
        const m = statusMeta(r.status)
        return (
          <Tooltip content={m?.hint ?? ''}>
            <Badge tone={(m?.tone ?? 'neutral') as never} size="sm" dot>{m?.label ?? titleCase(r.status)}</Badge>
          </Tooltip>
        )
      },
    },
    {
      key: 'liable', header: 'Liable party', width: 'w-[168px]', sortable: true,
      sortValue: (r) => r.liableParty, exportValue: (r) => r.liableParty,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg">{LIABLE_PARTIES.find((p) => p.value === r.liableParty)?.label ?? titleCase(r.liableParty)}</p>
          {partnerName(r.partnerId) && <p className="truncate text-[11px] text-fg-muted">{partnerName(r.partnerId)}</p>}
        </div>
      ),
    },
    {
      key: 'detected', header: 'Detected', width: 'w-[124px]', sortable: true,
      sortValue: (r) => r.detectedAt, exportValue: (r) => r.detectedAt.slice(0, 10),
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtDate(r.detectedAt)}</span>,
    },
    {
      key: 'cost', header: 'Cost impact', width: 'w-[142px]', align: 'right', sortable: true,
      sortValue: (r) => r.costImpact, exportValue: (r) => r.costImpact,
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{fmtCurrency(r.costImpact, r.currency, { compact: true })}</span>,
    },
    {
      key: 'recovery', header: 'Recovery', width: 'w-[176px]', align: 'right', sortable: true,
      sortValue: (r) => (r.recoveryExpected ? r.recoveryReceived / r.recoveryExpected : -1),
      exportValue: (r) => `${r.recoveryReceived}/${r.recoveryExpected}`,
      cell: (r) => {
        if (!r.recoveryExpected) return <span className="text-fg-subtle">not recoverable</span>
        const pct = (r.recoveryReceived / r.recoveryExpected) * 100
        return (
          <div className="flex items-center justify-end gap-2">
            <Progress value={pct} tone={pct >= 100 ? 'success' : pct > 0 ? 'warning' : 'danger'} className="w-[56px]" />
            <span className="tnum text-[12px] text-fg-muted">
              {fmtCurrency(r.recoveryReceived, r.currency, { compact: true })}
            </span>
          </div>
        )
      },
    },
    {
      key: 'net', header: 'Net loss', width: 'w-[136px]', align: 'right', sortable: true,
      sortValue: (r) => r.costImpact - r.recoveryReceived, exportValue: (r) => r.costImpact - r.recoveryReceived,
      cell: (r) => {
        const net = r.costImpact - r.recoveryReceived
        return <span className={`tnum text-[12.5px] ${net > 0 ? 'text-danger' : 'text-success'}`}>{fmtCurrency(net, r.currency, { compact: true })}</span>
      },
    },
    {
      key: 'claim', header: 'Claim', width: 'w-[150px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.claimRef ?? '', exportValue: (r) => r.claimRef ?? '',
      cell: (r) => (r.claimRef ? <span className="font-mono text-[11.5px] text-fg-muted">{r.claimRef}</span> : <span className="text-fg-subtle">—</span>),
    },
    {
      key: 'owner', header: 'Owner', width: 'w-[150px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.owner, exportValue: (r) => r.owner,
      cell: (r) => <span className="text-[12.5px] text-fg-muted">{r.owner}</span>,
    },
    {
      key: 'actions', header: 'Actions logged', width: 'w-[128px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.actions.length, exportValue: (r) => r.actions.length,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{r.actions.length}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Incidents & Claims"
        description="Shipments go wrong in a small number of predictable ways. Each one is logged against the job with what it cost, who is liable, what was done and what stops it recurring — so a rollover, a red-lane hold or a reefer deviation produces a claim and a preventive action, not an email thread."
        actions={
          <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus /> Log incident
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open incidents"
          value={exposure.open}
          icon={<TriangleAlert />}
          accent={exposure.critical ? 'danger' : exposure.open ? 'warning' : 'success'}
          sub={`${exposure.critical} critical · ${exposure.total} logged in total`}
        />
        <KpiCard
          label="Cost impact"
          value={fmtCurrency(exposure.cost, 'IDR', { compact: true })}
          icon={<HandCoins />}
          accent="warning"
          sub={`${fmtCurrency(exposure.outstanding, 'IDR', { compact: true })} still to recover`}
        />
        <KpiCard
          label="Recovery rate"
          value={`${exposure.recoveryRatePct.toFixed(0)}%`}
          icon={<ClipboardList />}
          accent={exposure.recoveryRatePct >= 60 ? 'success' : 'warning'}
          sub={`Net loss ${fmtCurrency(exposure.netLoss, 'IDR', { compact: true })}`}
        />
        <KpiCard
          label="Our own fault"
          value={ours ? fmtCurrency(ours.cost, 'IDR', { compact: true }) : fmtCurrency(0, 'IDR', { compact: true })}
          icon={<ShieldAlert />}
          accent={ours && ours.cost > 0 ? 'danger' : 'success'}
          sub={worst ? `Worst category: ${incidentTypeLabel(worst.type as IncidentType)}` : 'Nothing attributable to us'}
        />
      </div>

      <DataTable
        data={incidents}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.reference} — ${r.title}`}
        entityLabel="incident"
        storageKey="incidents"
        exportName="incidents"
        initialSort={{ key: 'detected', dir: 'desc' }}
        searchText={(r) => [r.reference, r.title, r.detail, r.type, r.status, r.owner, r.claimRef, r.rootCause, jobCode(r.projectId)].join(' ')}
        onRowClick={(r) => { setEditing(r); setFormOpen(true) }}
        rowTone={(r) => (r.severity === 'CRITICAL' && incidentStatusOpen(r.status) ? 'bg-danger-soft/20' : undefined)}
        filters={[
          {
            key: 'type', label: 'Type', values: type, onChange: setType,
            options: INCIDENT_TYPES.map((t) => ({ value: t.value, label: t.label })),
            match: (r, v) => v.includes(r.type),
          },
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: [{ value: 'OPEN_ANY', label: 'Anything still open' }, ...INCIDENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))],
            match: (r, v) => (v.includes('OPEN_ANY') && incidentStatusOpen(r.status)) || v.includes(r.status),
          },
          {
            key: 'severity', label: 'Severity', values: severity, onChange: setSeverity,
            options: INCIDENT_SEVERITIES.map((s) => ({ value: s.value, label: s.label })),
            match: (r, v) => v.includes(r.severity),
          },
          {
            key: 'liable', label: 'Liable', values: liable, onChange: setLiable,
            options: LIABLE_PARTIES.map((p) => ({ value: p.value, label: p.label })),
            match: (r, v) => v.includes(r.liableParty),
          },
        ]}
        onDelete={(ids) => {
          removeIncidents(ids)
          toast.push({ tone: 'success', title: `${ids.length} incidents deleted`, description: 'The cost they carried is no longer counted against the jobs.' })
        }}
        cascadeWarning={(rows) => {
          const openOnes = rows.filter((r) => incidentStatusOpen(r.status) && r.recoveryExpected > r.recoveryReceived)
          return openOnes.length
            ? [`${openOnes.length} of these still have money to recover — deleting loses the claim reference and the evidence trail.`]
            : []
        }}
        bulkActions={(rows, clear) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              rows.forEach((r) => upsertIncident({ ...r, status: 'RESOLVED', resolvedAt: new Date().toISOString() }))
              toast.push({ tone: 'success', title: `${rows.length} incidents closed` })
              clear()
            }}
          >
            Mark resolved
          </Button>
        )}
        importFields={[
          { key: 'reference', label: 'Reference', required: true },
          { key: 'type', label: 'Type', required: true, hint: 'ROLLOVER, CUSTOMS_HOLD…' },
          { key: 'title', label: 'Title', required: true },
          { key: 'detail', label: 'Detail' },
          { key: 'projectCode', label: 'Job code' },
          { key: 'severity', label: 'Severity', hint: 'LOW / MEDIUM / HIGH / CRITICAL' },
          { key: 'status', label: 'Status' },
          { key: 'liableParty', label: 'Liable party' },
          { key: 'detectedAt', label: 'Detected at', hint: 'YYYY-MM-DD' },
          { key: 'costImpact', label: 'Cost impact' },
          { key: 'recoveryExpected', label: 'Recovery expected' },
          { key: 'recoveryReceived', label: 'Recovery received' },
          { key: 'currency', label: 'Currency' },
          { key: 'claimRef', label: 'Claim reference' },
          { key: 'rootCause', label: 'Root cause' },
          { key: 'preventiveAction', label: 'Preventive action' },
          { key: 'owner', label: 'Owner' },
        ]}
        importSample={{
          reference: 'INC-2026-0042', type: 'DEMURRAGE', title: 'Three days demurrage at Jebel Ali',
          detail: 'Consignee delayed collection.', projectCode: 'PRJ-2026-0047', severity: 'MEDIUM', status: 'OPEN',
          liableParty: 'CONSIGNEE', detectedAt: '2026-08-28', costImpact: '9000000', recoveryExpected: '9000000',
          recoveryReceived: '0', currency: 'IDR', claimRef: '', rootCause: '', preventiveAction: '', owner: 'Marcus Bell',
        }}
        toImportRow={(r) => ({
          reference: r.reference, type: r.type, title: r.title, detail: r.detail,
          projectCode: jobCode(r.projectId), severity: r.severity, status: r.status, liableParty: r.liableParty,
          detectedAt: r.detectedAt.slice(0, 10), costImpact: r.costImpact, recoveryExpected: r.recoveryExpected,
          recoveryReceived: r.recoveryReceived, currency: r.currency, claimRef: r.claimRef ?? '',
          rootCause: r.rootCause ?? '', preventiveAction: r.preventiveAction ?? '', owner: r.owner,
        })}
        onImport={(rows) => {
          const mapped = rows.map((r) => {
            const existing = incidents.find((i) => i.reference === r.reference)
            const meta = INCIDENT_TYPES.find((t) => t.value === r.type)
            return {
              ...(existing ?? {}),
              id: existing?.id ?? uid('inc'),
              reference: r.reference,
              type: (meta ? r.type : 'DOCUMENT_DISCREPANCY') as IncidentType,
              title: r.title, detail: r.detail || '',
              projectId: projects.find((p) => p.code === r.projectCode)?.id,
              severity: (INCIDENT_SEVERITIES.some((s) => s.value === r.severity) ? r.severity : meta?.defaultSeverity ?? 'MEDIUM') as IncidentSeverity,
              status: (INCIDENT_STATUSES.some((s) => s.value === r.status) ? r.status : 'OPEN') as IncidentStatus,
              liableParty: (LIABLE_PARTIES.some((p) => p.value === r.liableParty) ? r.liableParty : meta?.defaultLiable ?? 'UNDETERMINED') as LiableParty,
              detectedAt: r.detectedAt ? new Date(r.detectedAt).toISOString() : new Date().toISOString(),
              costImpact: Number(r.costImpact) || 0,
              recoveryExpected: Number(r.recoveryExpected) || 0,
              recoveryReceived: Number(r.recoveryReceived) || 0,
              currency: (r.currency || 'IDR') as Incident['currency'],
              claimRef: r.claimRef || undefined,
              rootCause: r.rootCause || undefined,
              preventiveAction: r.preventiveAction || undefined,
              owner: r.owner || 'Marcus Bell',
              actions: existing?.actions ?? [],
            } as Incident
          })
          importIncidents(mapped)
          toast.push({ tone: 'success', title: `${mapped.length} incidents imported` })
        }}
        rowActions={(r) => (
          <>
            <Tooltip content="Open">
              <Button variant="ghost" size="iconXs" onClick={() => { setEditing(r); setFormOpen(true) }}><Pencil /></Button>
            </Tooltip>
            <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}><Trash2 /></Button>
            </Tooltip>
          </>
        )}
        footerSummary={(rows) => (
          <span className="tnum">
            Cost <span className="font-semibold text-fg">{fmtCurrency(rows.reduce((a, r) => a + r.costImpact, 0), 'IDR', { compact: true })}</span> · Recovered{' '}
            <span className="font-semibold text-fg">{fmtCurrency(rows.reduce((a, r) => a + r.recoveryReceived, 0), 'IDR', { compact: true })}</span> · Net{' '}
            <span className="font-semibold text-danger">{fmtCurrency(rows.reduce((a, r) => a + r.costImpact - r.recoveryReceived, 0), 'IDR', { compact: true })}</span>
          </span>
        )}
      />

      <IncidentForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="incident"
        items={deleting ? [`${deleting.reference} — ${deleting.title}`] : []}
        cascade={
          deleting && deleting.recoveryExpected > deleting.recoveryReceived
            ? [`${fmtCurrency(deleting.recoveryExpected - deleting.recoveryReceived, deleting.currency)} is still outstanding on this claim.`]
            : undefined
        }
        onConfirm={() => {
          if (!deleting) return
          removeIncidents([deleting.id])
          toast.push({ tone: 'success', title: 'Incident deleted' })
          setDeleting(null)
        }}
      />
    </>
  )
}

/* ---------------------------------------------------------------- */

function IncidentForm({
  open, onOpenChange, initial,
}: { open: boolean; onOpenChange: (v: boolean) => void; initial: Incident | null }) {
  const toast = useToast()
  const { upsertIncident, incidents, projects, partners, containers } = useErp()

  const blank = (): Incident => ({
    id: uid('inc'),
    reference: nextCode('INC-2026-', incidents.map((i) => i.reference), 4),
    type: 'ROLLOVER', severity: 'HIGH', status: 'OPEN', title: '', detail: '',
    detectedAt: new Date().toISOString(), liableParty: 'CARRIER',
    costImpact: 0, recoveryExpected: 0, recoveryReceived: 0, currency: 'IDR',
    owner: 'Marcus Bell', actions: [],
  })
  const [form, setForm] = React.useState<Incident>(initial ?? blank())
  const [newAction, setNewAction] = React.useState('')
  React.useEffect(() => setForm(initial ? structuredClone(initial) : blank()), [initial, open])
  const set = <K extends keyof Incident>(k: K, v: Incident[K]) => setForm((f) => ({ ...f, [k]: v }))

  const meta = INCIDENT_TYPES.find((t) => t.value === form.type)
  const net = form.costImpact - form.recoveryReceived
  const overRecovered = form.recoveryReceived > form.recoveryExpected && form.recoveryExpected > 0
  const closing = !incidentStatusOpen(form.status)
  const closingWithoutCause = closing && !form.rootCause?.trim()

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-3xl"
      title={initial ? initial.reference : 'Log an incident'}
      description={meta?.playbook}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!form.title.trim() || closingWithoutCause}
            onClick={() => {
              upsertIncident({
                ...form,
                resolvedAt: closing ? form.resolvedAt ?? new Date().toISOString() : undefined,
              })
              toast.push({ tone: 'success', title: initial ? 'Incident updated' : 'Incident logged' })
              onOpenChange(false)
            }}
          >
            {initial ? 'Save changes' : 'Log incident'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {meta && (
          <div className="rounded-lg border border-info/25 bg-info-soft px-3.5 py-3">
            <p className="text-[12px] font-semibold text-info-soft-fg">Playbook — {meta.label}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-info-soft-fg/85">{incidentPlaybook(form.type)}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Reference" required>
            <Input value={form.reference} onChange={(e) => set('reference', e.target.value)} />
          </Field>
          <Field label="Type" required className="sm:col-span-2">
            <Select
              value={form.type}
              searchable
              onChange={(v) => {
                const m = INCIDENT_TYPES.find((t) => t.value === v)
                setForm((f) => ({
                  ...f, type: v,
                  severity: initial ? f.severity : m?.defaultSeverity ?? f.severity,
                  liableParty: initial ? f.liableParty : m?.defaultLiable ?? f.liableParty,
                }))
              }}
              options={INCIDENT_TYPES.map((t) => ({ value: t.value, label: t.label, group: titleCase(t.group), description: t.playbook }))}
            />
          </Field>
        </div>

        <Field label="What happened" required>
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Two 40HC rolled from the Hamburg sailing" />
        </Field>

        <Field label="Detail" help="Facts only — this is what a carrier or insurer reads back to you.">
          <Textarea value={form.detail} onChange={(e) => set('detail', e.target.value)} rows={3} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Severity" required>
            <Select value={form.severity} onChange={(v) => set('severity', v)} options={INCIDENT_SEVERITIES.map((s) => ({ value: s.value, label: s.label }))} />
          </Field>
          <Field label="Status" required>
            <Select value={form.status} onChange={(v) => set('status', v)} options={INCIDENT_STATUSES.map((s) => ({ value: s.value, label: s.label, description: s.hint }))} />
          </Field>
          <Field label="Detected" required>
            <DatePicker value={form.detectedAt.slice(0, 10)} onChange={(v) => set('detectedAt', v ? new Date(v).toISOString() : form.detectedAt)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Job" help="Leave empty for something that is not tied to one shipment.">
            <Select
              value={form.projectId ?? null}
              onChange={(v) => set('projectId', v)}
              clearable searchable
              onClear={() => set('projectId', undefined)}
              placeholder="Not job specific"
              options={projects.map((p) => ({ value: p.id, label: p.code, description: p.name }))}
            />
          </Field>
          <Field label="Container" help="Where the incident sits on one unit rather than the whole job.">
            <Select
              value={form.containerId ?? null}
              onChange={(v) => set('containerId', v)}
              clearable searchable
              onClear={() => set('containerId', undefined)}
              placeholder="Whole shipment"
              options={containers
                .filter((c) => !form.projectId || c.projectId === form.projectId)
                .map((c) => ({ value: c.id, label: c.containerNo ?? `Unit ${c.seq}`, description: c.type }))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Liable party" required>
            <Select value={form.liableParty} onChange={(v) => set('liableParty', v)} options={LIABLE_PARTIES.map((p) => ({ value: p.value, label: p.label }))} />
          </Field>
          <Field label="Counterparty" help="The managed partner on the hook, where there is one.">
            <Select
              value={form.partnerId ?? null}
              onChange={(v) => set('partnerId', v)}
              clearable searchable
              onClear={() => set('partnerId', undefined)}
              placeholder="Not a managed partner"
              options={partners.map((p) => ({ value: p.id, label: p.name, description: p.types.join(', ') }))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Cost impact" required>
            <Input type="number" value={form.costImpact} onChange={(e) => set('costImpact', Number(e.target.value))} />
          </Field>
          <Field label="Recovery expected">
            <Input type="number" value={form.recoveryExpected} onChange={(e) => set('recoveryExpected', Number(e.target.value))} />
          </Field>
          <Field label="Recovery received" error={overRecovered ? 'More received than expected — check the figures.' : undefined}>
            <Input type="number" value={form.recoveryReceived} invalid={overRecovered} onChange={(e) => set('recoveryReceived', Number(e.target.value))} />
          </Field>
          <Field label="Net loss">
            <div className="flex h-9 items-center rounded-lg border border-border bg-bg-muted px-3">
              <span className={`tnum text-[13px] font-medium ${net > 0 ? 'text-danger' : 'text-success'}`}>
                {fmtCurrency(net, form.currency, { compact: true })}
              </span>
            </div>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Currency">
            <Select value={form.currency} onChange={(v) => set('currency', v)} options={(['IDR', 'USD', 'EUR', 'SGD'] as const).map((c) => ({ value: c, label: c }))} />
          </Field>
          <Field label="Claim reference">
            <Input value={form.claimRef ?? ''} onChange={(e) => set('claimRef', e.target.value || undefined)} placeholder="CL/MSK/26/0146" />
          </Field>
          <Field label="Owner" required>
            <Input value={form.owner} onChange={(e) => set('owner', e.target.value)} />
          </Field>
        </div>

        <Field
          label="Root cause"
          required={closing}
          error={closingWithoutCause ? 'An incident cannot be closed without a root cause — that is how it happens again.' : undefined}
          help="Why it happened, not what happened."
        >
          <Textarea value={form.rootCause ?? ''} invalid={closingWithoutCause} onChange={(e) => set('rootCause', e.target.value)} rows={2} />
        </Field>

        <Field label="Preventive action" help="The change that stops a repeat. This is the only part that has lasting value.">
          <Textarea value={form.preventiveAction ?? ''} onChange={(e) => set('preventiveAction', e.target.value)} rows={2} />
        </Field>

        {/* -------- action log -------- */}
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <p className="text-[12.5px] font-semibold text-fg">Action log</p>
            <span className="text-[11.5px] text-fg-subtle">{form.actions.length} entries</span>
          </div>
          <div className="scrollbar-thin max-h-56 overflow-y-auto">
            {form.actions.length === 0 && (
              <p className="px-3.5 py-4 text-[12.5px] text-fg-subtle">Nothing recorded yet. The log is the evidence trail on a claim.</p>
            )}
            {form.actions.map((a) => (
              <div key={a.id} className="border-b border-border/60 px-3.5 py-2.5 last:border-0">
                <p className="text-[12.5px] leading-snug text-fg">{a.action}</p>
                <p className="mt-0.5 text-[11px] text-fg-subtle">
                  {a.actor} · {fmtDateTime(a.at)}
                  {a.outcome && <span className="text-fg-muted"> — {a.outcome}</span>}
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-border px-3.5 py-2.5">
            <Input
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              placeholder="Record what was done…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newAction.trim()) {
                  e.preventDefault()
                  set('actions', [...form.actions, { id: uid('iac'), at: new Date().toISOString(), action: newAction.trim(), actor: form.owner }])
                  setNewAction('')
                }
              }}
            />
            <Button
              variant="secondary"
              disabled={!newAction.trim()}
              onClick={() => {
                set('actions', [...form.actions, { id: uid('iac'), at: new Date().toISOString(), action: newAction.trim(), actor: form.owner }])
                setNewAction('')
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
