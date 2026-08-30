import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, ExternalLink, FileCheck2, FileStack, Pencil, Plus, ShieldAlert, Trash2, Upload,
} from 'lucide-react'
import type { DocStatus, DocType, Project, ShipmentDocument } from '@/data/types'
import { COUNTRY_DOC_RULES, DOC_TYPES, docTypeLabel, stageIndex } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { Sheet } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Switch } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/misc'
import { documentCompliance } from '@/lib/analytics'
import { fmtDate, pluralDays, relativeDays, titleCase } from '@/lib/format'
import { uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

export function DocumentsTable({ project, scoped }: { project?: Project; scoped?: boolean }) {
  const nav = useNavigate()
  const toast = useToast()
  const { documents, projects, removeDocuments, importDocuments, upsertDocument } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ShipmentDocument | null>(null)
  const [deleting, setDeleting] = React.useState<ShipmentDocument | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [type, setType] = React.useState<string[]>([])

  const data = scoped && project ? documents.filter((d) => d.projectId === project.id) : documents
  const projectOf = (d: ShipmentDocument) => projects.find((p) => p.id === d.projectId)
  const compliance = project ? documentCompliance(project, data) : null
  const rule = project ? COUNTRY_DOC_RULES[project.destCountry] : undefined

  const columns: Column<ShipmentDocument>[] = [
    {
      key: 'title', header: 'Document', width: 'min-w-[240px]', pinned: true, sortable: true,
      sortValue: (r) => r.title, exportValue: (r) => r.title,
      cell: (r) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-medium text-fg">
            {r.mandatory && (
              <Tooltip content="Mandatory for this shipment">
                <span className="size-1.5 shrink-0 rounded-full bg-danger" />
              </Tooltip>
            )}
            <span className="truncate">{r.title}</span>
          </p>
          <p className="truncate font-mono text-[11px] text-fg-muted">{r.docNo ?? 'not issued'}</p>
        </div>
      ),
    },
    ...(!scoped
      ? [
          {
            key: 'project', header: 'Job', width: 'min-w-[170px]', sortable: true,
            sortValue: (r: ShipmentDocument) => projectOf(r)?.code ?? '',
            exportValue: (r: ShipmentDocument) => projectOf(r)?.code ?? '',
            cell: (r: ShipmentDocument) => (
              <div className="min-w-0">
                <p className="truncate font-mono text-[11.5px] text-fg">{projectOf(r)?.code}</p>
                <p className="truncate text-[11px] text-fg-muted">{projectOf(r)?.name}</p>
              </div>
            ),
          } as Column<ShipmentDocument>,
        ]
      : []),
    {
      key: 'type', header: 'Type', width: 'w-[180px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.type, exportValue: (r) => r.type,
      cell: (r) => <span className="text-[12px] text-fg-muted">{docTypeLabel(r.type)}</span>,
    },
    {
      key: 'stage', header: 'Needed at', width: 'w-[136px]', sortable: true,
      sortValue: (r) => stageIndex(r.stage), exportValue: (r) => r.stage,
      cell: (r) => <Badge tone="outline" size="sm">{titleCase(r.stage)}</Badge>,
    },
    {
      key: 'status', header: 'Status', width: 'w-[150px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'version', header: 'Ver.', width: 'w-[74px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.version, exportValue: (r) => r.version,
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">v{r.version}</span>,
    },
    {
      key: 'issuedBy', header: 'Issued by', width: 'w-[170px]', sortable: true,
      sortValue: (r) => r.issuedBy ?? '', exportValue: (r) => r.issuedBy ?? '',
      cell: (r) => <span className="text-[12.5px] text-fg-muted">{r.issuedBy ?? '—'}</span>,
    },
    {
      key: 'issuedAt', header: 'Issued', width: 'w-[112px]', sortable: true,
      sortValue: (r) => r.issuedAt ?? '', exportValue: (r) => r.issuedAt ?? '',
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{fmtDate(r.issuedAt)}</span>,
    },
    {
      key: 'expiresAt', header: 'Expires', width: 'w-[130px]', sortable: true,
      sortValue: (r) => r.expiresAt ?? '9999', exportValue: (r) => r.expiresAt ?? '',
      cell: (r) => {
        if (!r.expiresAt) return <span className="text-fg-subtle">—</span>
        const d = relativeDays(r.expiresAt)!
        return (
          <div>
            <p className="tnum text-[12px] text-fg">{fmtDate(r.expiresAt)}</p>
            <p className={`text-[11px] ${d < 0 ? 'text-danger' : d <= 30 ? 'text-warning' : 'text-fg-muted'}`}>
              {d < 0 ? 'expired' : `${pluralDays(d)} left`}
            </p>
          </div>
        )
      },
    },
    {
      key: 'file', header: 'File', width: 'w-[164px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.fileName ?? '', exportValue: (r) => r.fileName ?? '',
      cell: (r) =>
        r.fileName ? (
          <span className="truncate font-mono text-[11px] text-fg-muted">{r.fileName}</span>
        ) : (
          <span className="text-[11.5px] text-fg-subtle">no attachment</span>
        ),
    },
  ]

  return (
    <>
      {compliance && project && (
        <div className="mb-3 grid gap-3 rounded-xl border border-border bg-surface-sunken px-4 py-3 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <p className="text-[12.5px] font-semibold text-fg">
                Document completeness
                <span className="ml-2 font-normal text-fg-muted">
                  {compliance.satisfiedCount} of {compliance.requiredCount} mandatory documents approved
                </span>
              </p>
              <span className="tnum text-[12.5px] font-semibold text-fg">{compliance.pct.toFixed(0)}%</span>
            </div>
            <Progress value={compliance.pct} tone={compliance.pct === 100 ? 'success' : compliance.pct > 60 ? 'primary' : 'warning'} />
            {rule && (
              <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-fg-muted">
                <ShieldAlert className="mt-px size-3.5 shrink-0 text-warning" />
                <span>
                  <span className="font-medium text-fg">{project.destCountry} rule:</span> {rule.note}
                  {compliance.missingCountryDocs.length > 0 && (
                    <span className="text-danger"> Missing: {compliance.missingCountryDocs.map(docTypeLabel).join(', ')}.</span>
                  )}
                </span>
              </p>
            )}
          </div>
          <div className="flex items-end gap-2">
            {compliance.rejected.length > 0 && (
              <Badge tone="danger" size="lg">{compliance.rejected.length} rejected</Badge>
            )}
            {compliance.expiring.length > 0 && (
              <Badge tone="warning" size="lg">{compliance.expiring.length} expiring</Badge>
            )}
          </div>
        </div>
      )}

      <DataTable
        data={data}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${projectOf(r)?.code ?? ''} ${r.title}${r.docNo ? ` (${r.docNo})` : ''}`}
        entityLabel="document"
        storageKey={scoped ? 'project-documents' : 'documents'}
        exportName={scoped && project ? `documents-${project.code}` : 'documents'}
        initialSort={{ key: 'stage', dir: 'asc' }}
        searchText={(r) => [r.title, r.docNo, r.type, r.issuedBy, r.remarks, projectOf(r)?.code].join(' ')}
        onRowClick={(r) => { setEditing(r); setFormOpen(true) }}
        rowTone={(r) => (r.status === 'REJECTED' ? 'bg-danger-soft/25' : r.mandatory && r.status === 'REQUIRED' ? 'bg-warning-soft/20' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['REQUIRED', 'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ISSUED', 'SURRENDERED', 'REJECTED', 'EXPIRED'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'type', label: 'Document type', values: type, onChange: setType,
            options: DOC_TYPES.map((d) => ({ value: d.type, label: d.label })),
            match: (r, v) => v.includes(r.type),
          },
        ]}
        toolbarRight={
          project && (
            <Button variant="primary" size="md" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus /> Add document
            </Button>
          )
        }
        onDelete={(ids) => {
          removeDocuments(ids)
          toast.push({ tone: 'success', title: `${ids.length} documents removed` })
        }}
        cascadeWarning={(rows) => {
          const mandatory = rows.filter((r) => r.mandatory)
          return mandatory.length
            ? [`${mandatory.length} of these are mandatory — the job will fail its documentation gate without them`]
            : []
        }}
        bulkActions={(rows, clear) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              rows.forEach((r) => upsertDocument({ ...r, status: 'APPROVED', reviewedBy: 'Rina Wulandari' }))
              toast.push({ tone: 'success', title: `${rows.length} documents approved` })
              clear()
            }}
          >
            <CheckCircle2 /> Approve
          </Button>
        )}
        importFields={[
          { key: 'projectCode', label: 'Project code', required: !scoped, hint: scoped ? `defaults to ${project?.code}` : undefined },
          { key: 'type', label: 'Document type', required: true, hint: 'PACKING_LIST, PEB, HOUSE_BL …' },
          { key: 'title', label: 'Title' },
          { key: 'docNo', label: 'Document number' },
          { key: 'status', label: 'Status', hint: 'REQUIRED / DRAFT / APPROVED / ISSUED …' },
          { key: 'mandatory', label: 'Mandatory', hint: 'true / false' },
          { key: 'issuedBy', label: 'Issued by' },
          { key: 'issuedAt', label: 'Issue date', hint: 'YYYY-MM-DD' },
          { key: 'expiresAt', label: 'Expiry date' },
          { key: 'remarks', label: 'Remarks' },
        ]}
        importSample={{
          projectCode: project?.code ?? 'PRJ-2026-0041', type: 'CERTIFICATE_OF_ORIGIN', title: 'Certificate of Origin / SKA',
          docNo: 'SKA/26/118002', status: 'ISSUED', mandatory: 'true', issuedBy: 'Kadin Indonesia',
          issuedAt: '2026-08-25', expiresAt: '2026-11-25', remarks: 'Form EUR.1',
        }}
        toImportRow={(r) => ({
          projectCode: projectOf(r)?.code ?? '', type: r.type, title: r.title, docNo: r.docNo ?? '',
          status: r.status, mandatory: String(r.mandatory), issuedBy: r.issuedBy ?? '',
          issuedAt: r.issuedAt?.slice(0, 10) ?? '', expiresAt: r.expiresAt?.slice(0, 10) ?? '',
          remarks: r.remarks ?? '',
        })}
        onImport={(rows) => {
          const mapped = rows
            .map((r) => {
              const proj = scoped && project ? project : projects.find((p) => p.code === r.projectCode)
              if (!proj) return null
              const meta = DOC_TYPES.find((d) => d.type === r.type)
              return {
                id: uid('doc'), projectId: proj.id,
                type: (meta ? r.type : 'OTHER') as DocType,
                title: r.title || meta?.label || 'Document',
                docNo: r.docNo || undefined,
                version: 1,
                status: (r.status || 'REQUIRED') as DocStatus,
                mandatory: r.mandatory ? r.mandatory.toLowerCase() === 'true' : (meta?.mandatoryDefault ?? false),
                issuedBy: r.issuedBy || undefined,
                issuedAt: r.issuedAt || undefined,
                expiresAt: r.expiresAt || undefined,
                stage: meta?.stage ?? 'DOCUMENTATION',
                remarks: r.remarks || undefined,
                updatedAt: new Date().toISOString(),
              } as ShipmentDocument
            })
            .filter(Boolean) as ShipmentDocument[]
          importDocuments(mapped)
          toast.push({
            tone: mapped.length ? 'success' : 'warning',
            title: mapped.length ? `${mapped.length} documents imported` : 'Nothing imported',
          })
        }}
        rowActions={(r) => (
          <>
            {!scoped && (
              <Tooltip content="Open job">
                <Button variant="ghost" size="iconXs" onClick={() => nav(`/projects/${r.projectId}?tab=documents`)}>
                  <ExternalLink />
                </Button>
              </Tooltip>
            )}
            <Tooltip content="Edit">
              <Button variant="ghost" size="iconXs" onClick={() => { setEditing(r); setFormOpen(true) }}>
                <Pencil />
              </Button>
            </Tooltip>
            <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}>
                <Trash2 />
              </Button>
            </Tooltip>
          </>
        )}
        emptyTitle="No documents on file"
        emptyDescription="Add the document register for this job — the completeness meter and the destination rules run off it."
        emptyAction={
          project && (
            <Button variant="primary" size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus /> Add document
            </Button>
          )
        }
      />

      {(project || editing) && (
        <DocumentForm
          open={formOpen}
          onOpenChange={setFormOpen}
          project={project ?? projects.find((p) => p.id === editing?.projectId)!}
          initial={editing}
        />
      )}

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="document"
        items={deleting ? [deleting.title + (deleting.docNo ? ` (${deleting.docNo})` : '')] : []}
        destructiveNote={deleting?.mandatory ? 'This document is mandatory for the shipment.' : undefined}
        onConfirm={() => {
          if (deleting) {
            removeDocuments([deleting.id])
            toast.push({ tone: 'success', title: 'Document removed' })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}

function DocumentForm({
  open,
  onOpenChange,
  project,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  project: Project
  initial?: ShipmentDocument | null
}) {
  const { upsertDocument } = useErp()
  const toast = useToast()
  const [draft, setDraft] = React.useState<ShipmentDocument>(() => blank(project))

  React.useEffect(() => {
    if (open) setDraft(initial ? structuredClone(initial) : blank(project))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const set = <K extends keyof ShipmentDocument>(k: K, v: ShipmentDocument[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const meta = DOC_TYPES.find((d) => d.type === draft.type)

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-xl"
      eyebrow={<Badge tone="outline" size="sm">{project.code}</Badge>}
      title={initial ? draft.title : 'Add a document'}
      description={meta?.hint}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              upsertDocument(draft)
              toast.push({ tone: 'success', title: initial ? 'Document updated' : 'Document added', description: draft.title })
              onOpenChange(false)
            }}
          >
            {initial ? 'Save' : 'Add document'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Document type" required className="sm:col-span-2">
          <Select
            searchable
            value={draft.type}
            onChange={(v) => {
              const m = DOC_TYPES.find((d) => d.type === v)!
              setDraft((d) => ({ ...d, type: v, title: m.label, stage: m.stage, mandatory: m.mandatoryDefault, remarks: m.hint }))
            }}
            options={DOC_TYPES.map((d) => ({ value: d.type, label: d.label, description: d.hint, group: titleCase(d.stage) }))}
          />
        </Field>
        <Field label="Title" required className="sm:col-span-2">
          <Input value={draft.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Document number">
          <Input value={draft.docNo ?? ''} onChange={(e) => set('docNo', e.target.value)} className="font-mono" />
        </Field>
        <Field label="Version">
          <Input type="number" value={draft.version} onChange={(e) => set('version', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Status">
          <Select
            value={draft.status}
            onChange={(v) => set('status', v)}
            options={[
              { value: 'REQUIRED', label: 'Required', description: 'Known to be needed, not started' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'PENDING_REVIEW', label: 'Pending review' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'ISSUED', label: 'Issued' },
              { value: 'SURRENDERED', label: 'Surrendered', description: 'B/L released against surrender' },
              { value: 'REJECTED', label: 'Rejected', description: 'Blocks the documentation gate' },
              { value: 'EXPIRED', label: 'Expired' },
            ]}
          />
        </Field>
        <Field label="Mandatory">
          <div className="flex h-9 items-center gap-2.5">
            <Switch checked={draft.mandatory} onChange={(v) => set('mandatory', v)} />
            <span className="text-[12.5px] text-fg-muted">
              {draft.mandatory ? 'Blocks the job if outstanding' : 'Optional for this shipment'}
            </span>
          </div>
        </Field>
        <Field label="Issued by">
          <Input value={draft.issuedBy ?? ''} onChange={(e) => set('issuedBy', e.target.value)} placeholder="Kadin Indonesia" />
        </Field>
        <Field label="Reviewed by">
          <Input value={draft.reviewedBy ?? ''} onChange={(e) => set('reviewedBy', e.target.value)} />
        </Field>
        <Field label="Issue date">
          <DatePicker value={draft.issuedAt} onChange={(v) => set('issuedAt', v ?? undefined)} />
        </Field>
        <Field label="Expiry date">
          <DatePicker value={draft.expiresAt} onChange={(v) => set('expiresAt', v ?? undefined)} />
        </Field>
        <Field label="Attachment" className="sm:col-span-2" hint="file metadata only in this build">
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface-sunken px-3.5 py-3">
            <Upload className="size-4 text-fg-subtle" />
            <Input
              value={draft.fileName ?? ''}
              onChange={(e) => set('fileName', e.target.value)}
              placeholder="coo_PRJ-2026-0041.pdf"
              className="h-8 font-mono text-[12px]"
            />
          </div>
        </Field>
        <Field label="Remarks" className="sm:col-span-2">
          <Textarea value={draft.remarks ?? ''} onChange={(e) => set('remarks', e.target.value)} rows={3} />
        </Field>
      </div>
    </Sheet>
  )
}

function blank(project: Project): ShipmentDocument {
  return {
    id: uid('doc'), projectId: project.id, type: 'COMMERCIAL_INVOICE', title: 'Commercial Invoice',
    version: 1, status: 'REQUIRED', mandatory: true, stage: 'DOCUMENTATION', updatedAt: new Date().toISOString(),
  }
}

export { FileStack, FileCheck2 }
