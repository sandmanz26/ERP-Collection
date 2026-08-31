import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, ExternalLink, FileCheck2, Pencil, Plus, ShieldAlert, Trash2, Upload,
} from 'lucide-react'
import type { CustomsFiling, Project } from '@/data/types'
import { CUSTOMS_CHANNELS, CUSTOMS_OFFICES, PEB_SUPPORTING_DOCS } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { Sheet } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/misc'
import { filingReadiness, lartasHits } from '@/lib/analytics2'
import { fmtCurrency, fmtDate, titleCase } from '@/lib/format'
import { uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

export function CustomsTable({ project, scoped }: { project?: Project; scoped?: boolean }) {
  const nav = useNavigate()
  const toast = useToast()
  const { filings, projects, partners, settings, removeFilings, importFilings, upsertFiling } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CustomsFiling | null>(null)
  const [deleting, setDeleting] = React.useState<CustomsFiling | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [channel, setChannel] = React.useState<string[]>([])

  const data = scoped && project ? filings.filter((f) => f.projectId === project.id) : filings
  const projectOf = (f: CustomsFiling) => projects.find((p) => p.id === f.projectId)
  const restricted = project ? lartasHits(project.hsCodes, settings.restrictedHsPrefixes) : []

  const columns: Column<CustomsFiling>[] = [
    {
      key: 'type', header: 'Filing', width: 'w-[150px]', pinned: true, sortable: true,
      sortValue: (r) => `${r.type}-${r.regNumber ?? ''}`, exportValue: (r) => r.type,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold text-fg">{r.type}</p>
          <p className="truncate font-mono text-[10.5px] text-fg-subtle">{r.regNumber ?? 'not registered'}</p>
        </div>
      ),
    },
    ...(!scoped
      ? [
          {
            key: 'project', header: 'Job', width: 'min-w-[180px]', sortable: true,
            sortValue: (r: CustomsFiling) => projectOf(r)?.code ?? '',
            exportValue: (r: CustomsFiling) => projectOf(r)?.code ?? '',
            cell: (r: CustomsFiling) => (
              <div className="min-w-0">
                <p className="truncate font-mono text-[11.5px] text-fg">{projectOf(r)?.code}</p>
                <p className="truncate text-[11px] text-fg-muted">{projectOf(r)?.name}</p>
              </div>
            ),
          } as Column<CustomsFiling>,
        ]
      : []),
    {
      key: 'exporter', header: 'Exporter of record', width: 'min-w-[220px]', sortable: true,
      sortValue: (r) => r.exporterOfRecord, exportValue: (r) => r.exporterOfRecord,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg">{r.exporterOfRecord}</p>
          <p className="truncate text-[11px] text-fg-muted">filed by {r.filedByName}</p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', width: 'w-[152px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'channel', header: 'Response lane', width: 'w-[176px]', sortable: true,
      sortValue: (r) => r.channel, exportValue: (r) => r.channel,
      cell: (r) => {
        const meta = CUSTOMS_CHANNELS.find((c) => c.value === r.channel)!
        return (
          <Tooltip content={meta.hint}>
            <Badge tone={meta.tone as BadgeTone} size="sm" dot>{meta.label}</Badge>
          </Tooltip>
        )
      },
    },
    {
      key: 'docs', header: 'CEISA 4.0 documents', width: 'w-[200px]', sortable: true,
      sortValue: (r) => filingReadiness(r).pct,
      exportValue: (r) => `${filingReadiness(r).uploadedCount}/${filingReadiness(r).mandatoryCount}`,
      cell: (r) => {
        const rd = filingReadiness(r)
        if (!rd.mandatoryCount) return <span className="text-fg-subtle">n/a</span>
        return (
          <div className="flex items-center gap-2">
            <Progress value={rd.pct} tone={rd.canSubmit ? 'success' : 'warning'} className="w-[86px]" />
            <span className="tnum text-[11.5px] text-fg-muted">{rd.uploadedCount}/{rd.mandatoryCount}</span>
            {rd.canSubmit ? <CheckCircle2 className="size-3.5 text-success" /> : <ShieldAlert className="size-3.5 text-warning" />}
          </div>
        )
      },
    },
    {
      key: 'value', header: 'Declared value', width: 'w-[156px]', align: 'right', sortable: true,
      sortValue: (r) => r.declaredValue, exportValue: (r) => r.declaredValue,
      cell: (r) => <span className="tnum text-[12.5px] text-fg">{r.declaredCurrency} {r.declaredValue.toLocaleString('en-US')}</span>,
    },
    {
      key: 'regDate', header: 'Registered', width: 'w-[118px]', sortable: true,
      sortValue: (r) => r.regDate ?? '', exportValue: (r) => r.regDate ?? '',
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtDate(r.regDate)}</span>,
    },
    {
      key: 'office', header: 'Customs office', width: 'min-w-[210px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.officeCode, exportValue: (r) => r.officeCode,
      cell: (r) => <span className="text-[12px] text-fg-muted">{CUSTOMS_OFFICES.find((o) => o.code === r.officeCode)?.name ?? r.officeCode}</span>,
    },
    {
      key: 'ceisa', header: 'CEISA reference', width: 'w-[210px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.ceisaRef ?? '', exportValue: (r) => r.ceisaRef ?? '',
      cell: (r) => <span className="font-mono text-[11.5px] text-fg-muted">{r.ceisaRef ?? '—'}</span>,
    },
  ]

  return (
    <>
      {scoped && project && restricted.length > 0 && (
        <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning-soft-fg" />
          <div className="text-[12.5px] leading-relaxed text-warning-soft-fg">
            <p className="font-semibold">LARTAS commodity — HS {restricted.join(', ')}</p>
            <p>
              This job carries goods under Indonesian export restriction. An export permit must be uploaded with the PEB
              before the documentation gate will open.
            </p>
          </div>
        </div>
      )}

      <DataTable
        data={data}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.type} ${r.regNumber ?? ''} — ${projectOf(r)?.code ?? ''}`}
        entityLabel="filing"
        storageKey={scoped ? 'project-filings' : 'filings'}
        exportName={scoped && project ? `customs-${project.code}` : 'customs-filings'}
        initialSort={{ key: 'regDate', dir: 'desc' }}
        searchText={(r) => [r.type, r.regNumber, r.ceisaRef, r.exporterOfRecord, r.filedByName, r.remarks, projectOf(r)?.code].join(' ')}
        onRowClick={(r) => { setEditing(r); setFormOpen(true) }}
        rowTone={(r) => (r.channel === 'MERAH' ? 'bg-danger-soft/20' : r.channel === 'KUNING' ? 'bg-warning-soft/20' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'AMENDED'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'channel', label: 'Response lane', values: channel, onChange: setChannel,
            options: CUSTOMS_CHANNELS.map((c) => ({ value: c.value, label: c.label })),
            match: (r, v) => v.includes(r.channel),
          },
        ]}
        toolbarRight={
          project && (
            <Button variant="primary" size="md" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus /> New filing
            </Button>
          )
        }
        onDelete={(ids) => {
          removeFilings(ids)
          toast.push({ tone: 'success', title: `${ids.length} filings removed` })
        }}
        cascadeWarning={(rows) => {
          const approved = rows.filter((r) => r.status === 'APPROVED')
          return approved.length
            ? [`${approved.length} of these are approved filings — they are the supporting document for output VAT in Coretax`]
            : []
        }}
        bulkActions={(rows, clear) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              let done = 0
              rows.forEach((r) => {
                if (!filingReadiness(r).canSubmit || r.status !== 'DRAFT') return
                upsertFiling({ ...r, status: 'SUBMITTED', submittedAt: new Date().toISOString(), channel: 'PENDING' })
                done++
              })
              toast.push({
                tone: done ? 'success' : 'warning',
                title: done ? `${done} filings submitted` : 'Nothing submitted',
                description: done ? 'Awaiting the Bea Cukai response lane.' : 'Selected filings are either not drafts or still missing a mandatory CEISA 4.0 upload.',
              })
              clear()
            }}
          >
            <Upload /> Submit to CEISA
          </Button>
        )}
        importFields={[
          { key: 'projectCode', label: 'Project code', required: !scoped, hint: scoped ? `defaults to ${project?.code}` : undefined },
          { key: 'type', label: 'Filing type', required: true, hint: 'PEB / NPE / COO / PIB' },
          { key: 'regNumber', label: 'Registration number' },
          { key: 'regDate', label: 'Registration date', hint: 'YYYY-MM-DD' },
          { key: 'ceisaRef', label: 'CEISA reference' },
          { key: 'status', label: 'Status' },
          { key: 'channel', label: 'Response lane', hint: 'PENDING / HIJAU / KUNING / MERAH' },
          { key: 'filedByName', label: 'Filed by' },
          { key: 'exporterOfRecord', label: 'Exporter of record', required: true },
          { key: 'declaredValue', label: 'Declared value' },
          { key: 'declaredCurrency', label: 'Declared currency' },
          { key: 'officeCode', label: 'Customs office code' },
          { key: 'remarks', label: 'Remarks' },
        ]}
        importSample={{
          projectCode: project?.code ?? 'PRJ-2026-0041', type: 'PEB', regNumber: '000600-2026-TPP',
          regDate: '2026-09-02', ceisaRef: 'CEISA/2026/TPP/0006001', status: 'SUBMITTED', channel: 'PENDING',
          filedByName: 'In-house customs desk — Meridian Freight', exporterOfRecord: 'PT Jati Makmur Furniture',
          declaredValue: '284500', declaredCurrency: 'USD', officeCode: '040300', remarks: '',
        }}
        toImportRow={(r) => ({
          projectCode: projectOf(r)?.code ?? '', type: r.type, regNumber: r.regNumber ?? '',
          regDate: r.regDate ?? '', ceisaRef: r.ceisaRef ?? '', status: r.status, channel: r.channel,
          filedByName: r.filedByName, exporterOfRecord: r.exporterOfRecord,
          declaredValue: r.declaredValue, declaredCurrency: r.declaredCurrency,
          officeCode: r.officeCode, remarks: r.remarks ?? '',
        })}
        onImport={(rows) => {
          const mapped = rows
            .map((r) => {
              const proj = scoped && project ? project : projects.find((p) => p.code === r.projectCode)
              if (!proj) return null
              const existing = filings.find((f) => f.projectId === proj.id && f.type === r.type && f.regNumber === r.regNumber)
              return {
                id: existing?.id ?? uid('cf'),
                projectId: proj.id,
                type: (['PEB', 'NPE', 'COO', 'PIB', 'PPFTZ'].includes(r.type) ? r.type : 'PEB') as CustomsFiling['type'],
                regNumber: r.regNumber || undefined,
                regDate: r.regDate || undefined,
                ceisaRef: r.ceisaRef || undefined,
                status: (['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'AMENDED'].includes(r.status) ? r.status : 'DRAFT') as CustomsFiling['status'],
                channel: (['PENDING', 'HIJAU', 'KUNING', 'MERAH'].includes(r.channel) ? r.channel : 'PENDING') as CustomsFiling['channel'],
                filedByName: r.filedByName || 'In-house customs desk — Meridian Freight',
                exporterOfRecord: r.exporterOfRecord,
                declaredValue: Number(r.declaredValue) || 0,
                declaredCurrency: (r.declaredCurrency || 'USD') as CustomsFiling['declaredCurrency'],
                officeCode: r.officeCode || '040300',
                remarks: r.remarks || undefined,
                supportingDocs: existing?.supportingDocs ?? PEB_SUPPORTING_DOCS.map((d) => ({ ...d, uploaded: false })),
              } as CustomsFiling
            })
            .filter(Boolean) as CustomsFiling[]
          importFilings(mapped)
          toast.push({ tone: mapped.length ? 'success' : 'warning', title: mapped.length ? `${mapped.length} filings imported` : 'Nothing imported' })
        }}
        rowActions={(r) => (
          <>
            {!scoped && (
              <Tooltip content="Open job">
                <Button variant="ghost" size="iconXs" onClick={() => nav(`/projects/${r.projectId}?tab=customs`)}><ExternalLink /></Button>
              </Tooltip>
            )}
            <Tooltip content="Edit">
              <Button variant="ghost" size="iconXs" onClick={() => { setEditing(r); setFormOpen(true) }}><Pencil /></Button>
            </Tooltip>
            <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}><Trash2 /></Button>
            </Tooltip>
          </>
        )}
        emptyTitle="No customs filings"
        emptyDescription="Record the PEB and its supporting-document uploads here — CEISA 4.0 requires them before submission."
        emptyAction={
          project && (
            <Button variant="primary" size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus /> New filing
            </Button>
          )
        }
      />

      {(project || editing) && (
        <FilingForm
          open={formOpen}
          onOpenChange={setFormOpen}
          project={project ?? projects.find((p) => p.id === editing?.projectId)!}
          initial={editing}
          brokers={partners.filter((p) => p.types.includes('CUSTOMS_BROKER'))}
        />
      )}

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="filing"
        items={deleting ? [`${deleting.type} ${deleting.regNumber ?? ''}`] : []}
        destructiveNote={deleting?.status === 'APPROVED' ? 'An approved PEB is the supporting document for output VAT in Coretax.' : undefined}
        onConfirm={() => {
          if (deleting) {
            removeFilings([deleting.id])
            toast.push({ tone: 'success', title: 'Filing removed' })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}

function FilingForm({
  open, onOpenChange, project, initial, brokers,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  project: Project
  initial?: CustomsFiling | null
  brokers: { id: string; name: string; code: string }[]
}) {
  const { upsertFiling, customers } = useErp()
  const toast = useToast()
  const [draft, setDraft] = React.useState<CustomsFiling>(() => blank(project, customers))

  React.useEffect(() => {
    if (open) setDraft(initial ? structuredClone(initial) : blank(project, customers))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const set = <K extends keyof CustomsFiling>(k: K, v: CustomsFiling[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const readiness = filingReadiness(draft)
  const channelMeta = CUSTOMS_CHANNELS.find((c) => c.value === draft.channel)!

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-2xl"
      eyebrow={
        <div className="flex items-center gap-2">
          <Badge tone="outline" size="sm">{project.code}</Badge>
          <Badge tone={channelMeta.tone as BadgeTone} size="sm">{channelMeta.label}</Badge>
        </div>
      }
      title={initial ? `${draft.type} ${draft.regNumber ?? ''}` : 'Record a customs filing'}
      description="Since KEP-163/BC/2026, supporting documents must be uploaded through CEISA 4.0 before a PEB can be submitted. The exporter stays responsible for the data even when a PPJK files it."
      footer={
        <>
          <div className="mr-auto flex items-center gap-2 text-[12px] text-fg-muted">
            <FileCheck2 className="size-4" />
            {readiness.mandatoryCount ? (
              <>
                {readiness.uploadedCount}/{readiness.mandatoryCount} mandatory uploads
                <Badge tone={readiness.canSubmit ? 'success' : 'warning'} size="sm">
                  {readiness.canSubmit ? 'Ready to submit' : 'Blocked'}
                </Badge>
              </>
            ) : (
              'No upload requirement for this filing type'
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          {draft.status === 'DRAFT' && (
            <Tooltip content={readiness.canSubmit ? 'Submit through CEISA 4.0' : `Missing: ${readiness.missing.join(', ')}`}>
              <span>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!readiness.canSubmit}
                  onClick={() => {
                    upsertFiling({ ...draft, status: 'SUBMITTED', submittedAt: new Date().toISOString(), channel: 'PENDING' })
                    toast.push({ tone: 'success', title: 'Filing submitted', description: 'Awaiting the Bea Cukai response lane.' })
                    onOpenChange(false)
                  }}
                >
                  <Upload /> Submit
                </Button>
              </span>
            </Tooltip>
          )}
          <Button
            variant={draft.status === 'DRAFT' ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => {
              upsertFiling(draft)
              toast.push({ tone: 'success', title: initial ? 'Filing updated' : 'Filing recorded' })
              onOpenChange(false)
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Filing type" required>
          <Select
            value={draft.type}
            onChange={(v) => {
              set('type', v)
              set('supportingDocs', v === 'PEB' ? PEB_SUPPORTING_DOCS.map((d) => ({ ...d, uploaded: false })) : [])
            }}
            options={[
              { value: 'PEB', label: 'PEB — Export declaration', description: 'Filed through CEISA 4.0' },
              { value: 'NPE', label: 'NPE — Export approval note', description: 'Permits gate-in' },
              { value: 'COO', label: 'COO / SKA', description: 'Preferential origin certificate' },
              { value: 'PIB', label: 'PIB — Import declaration' },
              { value: 'PPFTZ', label: 'PPFTZ — Free trade zone' },
            ]}
          />
        </Field>
        <Field label="Status">
          <Select
            value={draft.status}
            onChange={(v) => set('status', v)}
            options={[
              { value: 'DRAFT', label: 'Draft', description: 'Not yet submitted' },
              { value: 'SUBMITTED', label: 'Submitted' },
              { value: 'UNDER_REVIEW', label: 'Under review', description: 'Query raised by Customs' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'AMENDED', label: 'Amended' },
            ]}
          />
        </Field>
        <Field label="Registration number">
          <Input value={draft.regNumber ?? ''} onChange={(e) => set('regNumber', e.target.value)} className="font-mono" placeholder="000412-2026-SRG" />
        </Field>
        <Field label="Registration date">
          <DatePicker value={draft.regDate} onChange={(v) => set('regDate', v ?? undefined)} />
        </Field>
        <Field label="CEISA reference" className="sm:col-span-2">
          <Input value={draft.ceisaRef ?? ''} onChange={(e) => set('ceisaRef', e.target.value)} className="font-mono" placeholder="CEISA/2026/SRG/0004128" />
        </Field>
        <Field label="Response lane" help="Green releases without inspection; yellow is a document check; red is a physical inspection with a demurrage exposure.">
          <Select
            value={draft.channel}
            onChange={(v) => set('channel', v)}
            options={CUSTOMS_CHANNELS.map((c) => ({ value: c.value as CustomsFiling['channel'], label: c.label, description: c.hint }))}
          />
        </Field>
        <Field label="Responded at">
          <DatePicker value={draft.respondedAt} onChange={(v) => set('respondedAt', v ?? undefined)} />
        </Field>
        <Field label="Customs office">
          <Select
            searchable
            value={draft.officeCode}
            onChange={(v) => set('officeCode', v)}
            options={CUSTOMS_OFFICES.map((o) => ({ value: o.code, label: o.name, description: o.code }))}
          />
        </Field>
        <Field label="Filed by" help="An appointed PPJK files on our behalf; responsibility for data accuracy stays with the exporter.">
          <Select
            clearable
            value={draft.filedByPartnerId ?? null}
            onClear={() => setDraft((d) => ({ ...d, filedByPartnerId: undefined, filedByName: 'In-house customs desk — Meridian Freight' }))}
            onChange={(v) => {
              const b = brokers.find((x) => x.id === v)
              setDraft((d) => ({ ...d, filedByPartnerId: v, filedByName: b?.name ?? d.filedByName }))
            }}
            options={brokers.map((b) => ({ value: b.id, label: b.name, description: b.code }))}
            placeholder="In-house PPJK"
          />
        </Field>
        <Field label="Exporter of record" required className="sm:col-span-2">
          <Input value={draft.exporterOfRecord} onChange={(e) => set('exporterOfRecord', e.target.value)} />
        </Field>
        <Field label="Declared value" help="Reconciled against the commercial invoice on the job.">
          <Input type="number" value={draft.declaredValue} onChange={(e) => set('declaredValue', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Declared currency">
          <Select
            value={draft.declaredCurrency}
            onChange={(v) => set('declaredCurrency', v)}
            options={(['USD', 'IDR', 'EUR', 'SGD', 'AUD', 'JPY', 'CNY'] as const).map((c) => ({ value: c, label: c }))}
          />
        </Field>
        {Math.abs(draft.declaredValue - project.cargoValue) > 1 && project.cargoValue > 0 && (
          <div className="sm:col-span-2 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-warning-soft-fg">
            Declared value differs from the job's cargo value of{' '}
            {fmtCurrency(project.cargoValue, project.cargoCurrency)}. Customs and the commercial invoice must agree, or the
            filing draws a query.
          </div>
        )}
        <Field label="Remarks" className="sm:col-span-2">
          <Textarea value={draft.remarks ?? ''} onChange={(e) => set('remarks', e.target.value)} rows={3} />
        </Field>
      </div>

      {draft.supportingDocs.length > 0 && (
        <div className="border-t border-border bg-surface-sunken/50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
              <Upload className="size-4 text-fg-muted" /> CEISA 4.0 supporting documents
            </p>
            <Badge tone={readiness.canSubmit ? 'success' : 'warning'} size="md">
              {readiness.uploadedCount}/{readiness.mandatoryCount} mandatory
            </Badge>
          </div>
          <p className="mb-3 text-[12px] leading-relaxed text-fg-muted">
            Since 3 August 2026 (KEP-163/BC/2026) these must be uploaded with the declaration. A PEB cannot be submitted
            while a mandatory document is missing.
          </p>
          <div className="space-y-1.5">
            {draft.supportingDocs.map((d, i) => (
              <div
                key={d.type}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                  d.mandatory && !d.uploaded ? 'border-warning/30 bg-warning-soft/40' : 'border-border bg-surface'
                }`}
              >
                <Checkbox
                  checked={d.uploaded}
                  onChange={(v) =>
                    setDraft((dr) => ({ ...dr, supportingDocs: dr.supportingDocs.map((x, xi) => (xi === i ? { ...x, uploaded: v } : x)) }))
                  }
                />
                <span className="flex-1 text-[12.5px] text-fg">{d.label}</span>
                {d.mandatory ? (
                  <Badge tone={d.uploaded ? 'success' : 'warning'} size="sm">{d.uploaded ? 'Uploaded' : 'Required'}</Badge>
                ) : (
                  <Badge tone="neutral" size="sm">Conditional</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  )
}

function blank(project: Project, customers: { id: string; legalName: string }[]): CustomsFiling {
  const exporter = customers.find((c) => c.id === project.shipperId)?.legalName ?? ''
  return {
    id: uid('cf'), projectId: project.id, type: 'PEB', status: 'DRAFT', channel: 'PENDING',
    filedByName: 'In-house customs desk — Meridian Freight', exporterOfRecord: exporter,
    declaredValue: project.cargoValue, declaredCurrency: project.cargoCurrency,
    officeCode: CUSTOMS_OFFICES[0].code,
    supportingDocs: PEB_SUPPORTING_DOCS.map((d) => ({ ...d, uploaded: false })),
  }
}
