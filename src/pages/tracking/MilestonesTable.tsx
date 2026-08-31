import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Anchor, CheckCircle2, ExternalLink, Pencil, Plus, RefreshCw, Radio, Trash2,
} from 'lucide-react'
import type { Milestone, MilestoneCode, Project } from '@/data/types'
import { MILESTONES, MILESTONE_SOURCES, PORTS, milestoneIndex, milestoneMeta } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
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
import { milestoneHealth, milestoneVariance, plannedMilestonesFor } from '@/lib/analytics2'
import { fmtDate, fmtPercent, pluralDays, relativeDays, titleCase } from '@/lib/format'
import { uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

const SOURCE_TONE: Record<string, 'success' | 'info' | 'accent' | 'neutral'> = {
  CARRIER_EDI: 'success', PORTAL: 'info', AGENT: 'accent', MANUAL: 'neutral',
}

export function MilestonesTable({ project, scoped }: { project?: Project; scoped?: boolean }) {
  const nav = useNavigate()
  const toast = useToast()
  const { milestones, projects, partners, containers, removeMilestones, importMilestones, upsertMilestone, syncPlannedMilestones } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Milestone | null>(null)
  const [deleting, setDeleting] = React.useState<Milestone | null>(null)
  const [state, setState] = React.useState<string[]>([])
  const [source, setSource] = React.useState<string[]>([])

  const data = scoped && project ? milestones.filter((m) => m.projectId === project.id) : milestones
  const projectOf = (m: Milestone) => projects.find((p) => p.id === m.projectId)
  const health = milestoneHealth(data)

  const columns: Column<Milestone>[] = [
    {
      key: 'code', header: 'Milestone', width: 'min-w-[240px]', pinned: true, sortable: true,
      sortValue: (r) => milestoneIndex(r.code), exportValue: (r) => r.code,
      cell: (r) => {
        const meta = milestoneMeta(r.code)
        return (
          <div className="flex items-center gap-2">
            <span
              className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                r.actualAt ? 'bg-success text-white' : 'border border-border-strong bg-surface text-fg-subtle'
              }`}
            >
              {r.actualAt ? <CheckCircle2 className="size-3" strokeWidth={3} /> : milestoneIndex(r.code) + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-fg">{meta?.label ?? titleCase(r.code)}</p>
              <p className="truncate text-[11px] text-fg-muted">{titleCase(meta?.leg ?? '')} leg</p>
            </div>
          </div>
        )
      },
    },
    ...(!scoped
      ? [
          {
            key: 'project', header: 'Job', width: 'min-w-[180px]', sortable: true,
            sortValue: (r: Milestone) => projectOf(r)?.code ?? '',
            exportValue: (r: Milestone) => projectOf(r)?.code ?? '',
            cell: (r: Milestone) => (
              <div className="min-w-0">
                <p className="truncate font-mono text-[11.5px] text-fg">{projectOf(r)?.code}</p>
                <p className="truncate text-[11px] text-fg-muted">{projectOf(r)?.name}</p>
              </div>
            ),
          } as Column<Milestone>,
        ]
      : []),
    {
      key: 'planned', header: 'Planned', width: 'w-[126px]', sortable: true,
      sortValue: (r) => r.plannedAt ?? '9999', exportValue: (r) => r.plannedAt?.slice(0, 10) ?? '',
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtDate(r.plannedAt)}</span>,
    },
    {
      key: 'actual', header: 'Actual', width: 'w-[138px]', sortable: true,
      sortValue: (r) => r.actualAt ?? '9999', exportValue: (r) => r.actualAt?.slice(0, 10) ?? '',
      cell: (r) => {
        if (r.actualAt) return <span className="tnum text-[12.5px] font-medium text-fg">{fmtDate(r.actualAt)}</span>
        const due = relativeDays(r.plannedAt)
        if (due === null) return <span className="text-fg-subtle">—</span>
        return (
          <span className={`text-[12px] ${due < 0 ? 'font-medium text-danger' : due <= 2 ? 'text-warning' : 'text-fg-subtle'}`}>
            {due < 0 ? `overdue ${pluralDays(due)}` : due === 0 ? 'due today' : `due in ${pluralDays(due)}`}
          </span>
        )
      },
    },
    {
      key: 'variance', header: 'Variance', width: 'w-[118px]', align: 'right', sortable: true,
      sortValue: (r) => milestoneVariance(r) ?? -999,
      exportValue: (r) => milestoneVariance(r) ?? '',
      cell: (r) => {
        const v = milestoneVariance(r)
        if (v === null) return <span className="text-fg-subtle">—</span>
        return (
          <Badge tone={v <= 0 ? 'success' : v <= 2 ? 'warning' : 'danger'} size="sm">
            {v === 0 ? 'on time' : v > 0 ? `+${v}d late` : `${Math.abs(v)}d early`}
          </Badge>
        )
      },
    },
    {
      key: 'location', header: 'Location', width: 'min-w-[170px]', sortable: true,
      sortValue: (r) => r.locationName ?? '', exportValue: (r) => r.locationCode ?? '',
      cell: (r) =>
        r.locationName ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-fg">
            <Anchor className="size-3.5 text-fg-subtle" />
            {r.locationName}
            <span className="font-mono text-[10.5px] text-fg-subtle">{r.locationCode}</span>
          </span>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      key: 'source', header: 'Source', width: 'w-[142px]', sortable: true,
      sortValue: (r) => r.source, exportValue: (r) => r.source,
      cell: (r) => (
        <Tooltip content={MILESTONE_SOURCES.find((s) => s.value === r.source)?.hint ?? ''}>
          <Badge tone={SOURCE_TONE[r.source]} size="sm" dot>
            {MILESTONE_SOURCES.find((s) => s.value === r.source)?.label ?? titleCase(r.source)}
          </Badge>
        </Tooltip>
      ),
    },
    {
      key: 'vessel', header: 'Vessel', width: 'w-[170px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.vessel ?? '', exportValue: (r) => r.vessel ?? '',
      cell: (r) => <span className="text-[12px] text-fg-muted">{r.vessel ? `${r.vessel} ${r.voyage ?? ''}` : '—'}</span>,
    },
    {
      key: 'partner', header: 'Handled by', width: 'w-[190px]', sortable: true, defaultHidden: true,
      sortValue: (r) => partners.find((p) => p.id === r.partnerId)?.name ?? '',
      exportValue: (r) => partners.find((p) => p.id === r.partnerId)?.code ?? '',
      cell: (r) => <span className="text-[12px] text-fg-muted">{partners.find((p) => p.id === r.partnerId)?.name ?? '—'}</span>,
    },
  ]

  return (
    <>
      {scoped && project && (
        <div className="mb-3 grid gap-3 rounded-xl border border-border bg-surface-sunken px-4 py-3 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <p className="text-[12.5px] font-semibold text-fg">
                Journey progress
                <span className="ml-2 font-normal text-fg-muted">
                  {health.recorded} of {health.total} events recorded
                  {health.next && ` · next: ${milestoneMeta(health.next.code)?.label}`}
                </span>
              </p>
              <span className="tnum text-[12.5px] font-semibold text-fg">{health.progressPct.toFixed(0)}%</span>
            </div>
            <Progress value={health.progressPct} tone="primary" />
            <p className="mt-2 text-[11.5px] text-fg-muted">
              {health.onTime} of {health.onTime + health.late} recorded events landed on or before plan
              {health.avgSlipDays !== 0 && ` · average slip ${health.avgSlipDays.toFixed(1)} days`}.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <Badge tone={health.onTimePct >= 90 ? 'success' : health.onTimePct >= 75 ? 'warning' : 'danger'} size="lg">
              {fmtPercent(health.onTimePct, 0)} on time
            </Badge>
            <Tooltip content="Rebuild planned dates from the job's ETD and transit time. Recorded actuals are kept.">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const planned = plannedMilestonesFor(project)
                  if (!planned.length) {
                    toast.push({ tone: 'warning', title: 'No ETD on this job', description: 'Set an ETD before the milestone plan can be generated.' })
                    return
                  }
                  syncPlannedMilestones(project.id, planned)
                  toast.push({ tone: 'success', title: 'Milestone plan rebuilt', description: `${planned.length} events planned from the schedule.` })
                }}
              >
                <RefreshCw /> Rebuild plan
              </Button>
            </Tooltip>
          </div>
        </div>
      )}

      <DataTable
        data={data}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${projectOf(r)?.code ?? ''} ${milestoneMeta(r.code)?.label ?? r.code}`}
        entityLabel="milestone"
        storageKey={scoped ? 'project-milestones' : 'milestones'}
        exportName={scoped && project ? `milestones-${project.code}` : 'milestones'}
        initialSort={{ key: 'code', dir: 'asc' }}
        compactByDefault
        pageSize={50}
        searchText={(r) => [r.code, r.locationName, r.vessel, r.remarks, projectOf(r)?.code, milestoneMeta(r.code)?.label].join(' ')}
        onRowClick={(r) => { setEditing(r); setFormOpen(true) }}
        rowTone={(r) => {
          const v = milestoneVariance(r)
          if (v !== null && v > 2) return 'bg-danger-soft/20'
          if (!r.actualAt && (relativeDays(r.plannedAt) ?? 1) < 0) return 'bg-warning-soft/20'
          return undefined
        }}
        filters={[
          {
            key: 'state', label: 'State', values: state, onChange: setState,
            options: [
              { value: 'RECORDED', label: 'Recorded' },
              { value: 'PENDING', label: 'Not yet recorded' },
              { value: 'OVERDUE', label: 'Overdue' },
              { value: 'LATE', label: 'Landed late' },
            ],
            match: (r, v) => {
              const overdue = !r.actualAt && (relativeDays(r.plannedAt) ?? 1) < 0
              const variance = milestoneVariance(r)
              return v.some((x) =>
                x === 'RECORDED' ? !!r.actualAt : x === 'PENDING' ? !r.actualAt : x === 'OVERDUE' ? overdue : variance !== null && variance > 0,
              )
            },
          },
          {
            key: 'source', label: 'Source', values: source, onChange: setSource,
            options: MILESTONE_SOURCES.map((s) => ({ value: s.value, label: s.label })),
            match: (r, v) => v.includes(r.source),
          },
        ]}
        toolbarRight={
          project && (
            <Button variant="primary" size="md" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus /> Record event
            </Button>
          )
        }
        onDelete={(ids) => {
          removeMilestones(ids)
          toast.push({ tone: 'success', title: `${ids.length} events removed` })
        }}
        bulkActions={(rows, clear) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const now = new Date().toISOString()
              rows.filter((r) => !r.actualAt).forEach((r) => upsertMilestone({ ...r, actualAt: now, source: 'MANUAL', recordedAt: now, recordedBy: 'Rina Wulandari' }))
              toast.push({ tone: 'success', title: `${rows.filter((r) => !r.actualAt).length} events marked as happened today`, description: 'Recorded as manual — weaker evidence than a carrier feed.' })
              clear()
            }}
          >
            <CheckCircle2 /> Mark as happened
          </Button>
        )}
        importFields={[
          { key: 'projectCode', label: 'Project code', required: !scoped, hint: scoped ? `defaults to ${project?.code}` : undefined },
          { key: 'code', label: 'Event code', required: true, hint: 'GATE_IN, VESSEL_DEPARTED …' },
          { key: 'plannedAt', label: 'Planned date', hint: 'YYYY-MM-DD' },
          { key: 'actualAt', label: 'Actual date', hint: 'YYYY-MM-DD' },
          { key: 'locationCode', label: 'Location UN/LOCODE' },
          { key: 'source', label: 'Source', hint: 'CARRIER_EDI / PORTAL / AGENT / MANUAL' },
          { key: 'vessel', label: 'Vessel' },
          { key: 'voyage', label: 'Voyage' },
          { key: 'remarks', label: 'Remarks' },
        ]}
        importSample={{
          projectCode: project?.code ?? 'PRJ-2026-0041', code: 'GATE_IN', plannedAt: '2026-08-27',
          actualAt: '2026-08-27', locationCode: 'IDSRG', source: 'CARRIER_EDI', vessel: 'Maersk Semarang',
          voyage: '634W', remarks: 'IFTSTA event 34 received from the carrier.',
        }}
        toImportRow={(r) => ({
          projectCode: projectOf(r)?.code ?? '', code: r.code,
          plannedAt: r.plannedAt?.slice(0, 10) ?? '', actualAt: r.actualAt?.slice(0, 10) ?? '',
          locationCode: r.locationCode ?? '', source: r.source, vessel: r.vessel ?? '',
          voyage: r.voyage ?? '', remarks: r.remarks ?? '',
        })}
        onImport={(rows) => {
          const mapped = rows
            .map((r) => {
              const proj = scoped && project ? project : projects.find((p) => p.code === r.projectCode)
              if (!proj || !MILESTONES.some((m) => m.code === r.code)) return null
              const port = PORTS.find((p) => p.code === r.locationCode)
              const existing = milestones.find((m) => m.projectId === proj.id && m.code === r.code)
              return {
                id: existing?.id ?? uid('ms'),
                projectId: proj.id,
                code: r.code as MilestoneCode,
                plannedAt: r.plannedAt ? new Date(`${r.plannedAt}T09:00:00Z`).toISOString() : existing?.plannedAt,
                actualAt: r.actualAt ? new Date(`${r.actualAt}T09:00:00Z`).toISOString() : undefined,
                locationCode: r.locationCode || undefined,
                locationName: port?.name ?? existing?.locationName,
                source: (MILESTONE_SOURCES.some((s) => s.value === r.source) ? r.source : 'MANUAL') as Milestone['source'],
                vessel: r.vessel || undefined, voyage: r.voyage || undefined,
                remarks: r.remarks || undefined,
                recordedBy: 'Import', recordedAt: new Date().toISOString(),
              } as Milestone
            })
            .filter(Boolean) as Milestone[]
          importMilestones(mapped)
          toast.push({
            tone: mapped.length ? 'success' : 'warning',
            title: mapped.length ? `${mapped.length} events imported` : 'Nothing imported',
            description: mapped.length ? 'This is the same shape a carrier IFTSTA feed would land in.' : 'No rows matched a project code and a known event code.',
          })
        }}
        rowActions={(r) => (
          <>
            {!scoped && (
              <Tooltip content="Open job">
                <Button variant="ghost" size="iconXs" onClick={() => nav(`/projects/${r.projectId}?tab=tracking`)}><ExternalLink /></Button>
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
        emptyTitle="No milestones planned"
        emptyDescription="Rebuild the plan from the job's schedule, or record the first event by hand."
        footerSummary={(rows) => {
          const h = milestoneHealth(rows)
          return (
            <span className="tnum">
              {h.recorded}/{h.total} recorded ·{' '}
              <span className={`font-semibold ${h.onTimePct >= 90 ? 'text-success' : h.onTimePct >= 75 ? 'text-warning' : 'text-danger'}`}>
                {fmtPercent(h.onTimePct, 0)} on time
              </span>
            </span>
          )
        }}
      />

      {(project || editing) && (
        <MilestoneForm
          open={formOpen}
          onOpenChange={setFormOpen}
          project={project ?? projects.find((p) => p.id === editing?.projectId)!}
          initial={editing}
          containerOptions={containers.filter((c) => c.projectId === (project?.id ?? editing?.projectId))}
        />
      )}

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="milestone"
        items={deleting ? [`${projectOf(deleting)?.code ?? ''} — ${milestoneMeta(deleting.code)?.label}`] : []}
        destructiveNote={deleting?.actualAt ? 'This event has a recorded actual — removing it changes the on-time statistic.' : undefined}
        onConfirm={() => {
          if (deleting) {
            removeMilestones([deleting.id])
            toast.push({ tone: 'success', title: 'Event removed' })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}

function MilestoneForm({
  open, onOpenChange, project, initial, containerOptions,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  project: Project
  initial?: Milestone | null
  containerOptions: { id: string; seq: number; containerNo?: string }[]
}) {
  const { upsertMilestone, partners } = useErp()
  const toast = useToast()
  const [draft, setDraft] = React.useState<Milestone>(() => blank(project))

  React.useEffect(() => {
    if (open) setDraft(initial ? structuredClone(initial) : blank(project))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const set = <K extends keyof Milestone>(k: K, v: Milestone[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const meta = milestoneMeta(draft.code)
  const variance = milestoneVariance(draft)

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-xl"
      eyebrow={
        <div className="flex items-center gap-2">
          <Badge tone="outline" size="sm">{project.code}</Badge>
          <Badge tone={SOURCE_TONE[draft.source]} size="sm">{MILESTONE_SOURCES.find((s) => s.value === draft.source)?.label}</Badge>
        </div>
      }
      title={meta?.label ?? 'Record a transport event'}
      description={meta?.hint}
      footer={
        <>
          {variance !== null && (
            <Badge tone={variance <= 0 ? 'success' : variance <= 2 ? 'warning' : 'danger'} size="sm" className="mr-auto">
              {variance === 0 ? 'On time' : variance > 0 ? `${variance} day${variance === 1 ? '' : 's'} late` : `${Math.abs(variance)} day${Math.abs(variance) === 1 ? '' : 's'} early`}
            </Badge>
          )}
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              upsertMilestone({ ...draft, recordedAt: new Date().toISOString() })
              toast.push({ tone: 'success', title: initial ? 'Event updated' : 'Event recorded', description: meta?.label })
              onOpenChange(false)
            }}
          >
            {initial ? 'Save event' : 'Record event'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Event" required className="sm:col-span-2">
          <Select
            searchable
            value={draft.code}
            onChange={(v) => set('code', v)}
            options={MILESTONES.map((m) => ({ value: m.code, label: m.label, description: m.hint, group: `${titleCase(m.leg)} leg` }))}
          />
        </Field>
        <Field label="Planned" help="Normally generated from the job's schedule.">
          <DatePicker value={draft.plannedAt} onChange={(v) => set('plannedAt', v ?? undefined)} />
        </Field>
        <Field label="Actual" help="Leave empty until the event genuinely happened.">
          <DatePicker value={draft.actualAt} onChange={(v) => set('actualAt', v ?? undefined)} />
        </Field>
        <Field label="Source" required help="Provenance matters: a manually keyed 'delivered' is not evidence.">
          <Select
            value={draft.source}
            onChange={(v) => set('source', v)}
            options={MILESTONE_SOURCES.map((s) => ({ value: s.value as Milestone['source'], label: s.label, description: s.hint }))}
          />
        </Field>
        <Field label="Location">
          <Select
            clearable
            searchable
            value={draft.locationCode ?? null}
            onClear={() => setDraft((d) => ({ ...d, locationCode: undefined, locationName: undefined }))}
            onChange={(v) => {
              const port = PORTS.find((p) => p.code === v)
              setDraft((d) => ({ ...d, locationCode: v, locationName: port?.name }))
            }}
            options={PORTS.map((p) => ({ value: p.code, label: p.name, description: `${p.city} · ${p.code}` }))}
          />
        </Field>
        {containerOptions.length > 0 && (
          <Field label="Container" hint="optional" help="Units on one booking can gate in on different days.">
            <Select
              clearable
              value={draft.containerId ?? null}
              onClear={() => set('containerId', undefined)}
              onChange={(v) => set('containerId', v)}
              options={containerOptions.map((c) => ({ value: c.id, label: c.containerNo ?? `Unit #${c.seq}` }))}
              placeholder="Applies to the whole job"
            />
          </Field>
        )}
        <Field label="Handled by" hint="optional" help="Attributes the event to a partner's scorecard.">
          <Select
            clearable
            searchable
            value={draft.partnerId ?? null}
            onClear={() => set('partnerId', undefined)}
            onChange={(v) => set('partnerId', v)}
            options={partners.filter((p) => p.status !== 'SUSPENDED').map((p) => ({ value: p.id, label: p.name, description: p.code }))}
          />
        </Field>
        <Field label="Vessel">
          <Input value={draft.vessel ?? ''} onChange={(e) => set('vessel', e.target.value)} />
        </Field>
        <Field label="Voyage">
          <Input value={draft.voyage ?? ''} onChange={(e) => set('voyage', e.target.value)} className="font-mono" />
        </Field>
        <Field label="Remarks" className="sm:col-span-2">
          <Textarea value={draft.remarks ?? ''} onChange={(e) => set('remarks', e.target.value)} rows={2} />
        </Field>
      </div>
    </Sheet>
  )
}

function blank(project: Project): Milestone {
  return {
    id: uid('ms'), projectId: project.id, code: 'BOOKING_CONFIRMED', source: 'MANUAL',
    locationCode: project.polCode, locationName: project.polName,
    recordedBy: 'Rina Wulandari', recordedAt: new Date().toISOString(),
  }
}

export { Radio }
