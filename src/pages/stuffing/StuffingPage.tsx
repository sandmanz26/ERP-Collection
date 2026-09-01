import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Boxes, CalendarClock, ClipboardCheck, PackageCheck, Pencil, Plus, Trash2, TriangleAlert, Users,
} from 'lucide-react'
import type { Project, StuffingJob, StuffingLocationType, StuffingShift, StuffingStatus } from '@/data/types'
import {
  PORTS, STUFFING_LOCATION_TYPES, STUFFING_SHIFTS, STUFFING_STATUSES,
  shiftWindow, stuffingIsOpen, stuffingLocationLabel, stuffingStatusMeta,
} from '@/data/reference'
import { useErp } from '@/store/useErp'
import { checkStuffing, stuffingMetrics, stuffingSchedule } from '@/lib/stuffing'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { Sheet } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState, Progress } from '@/components/ui/misc'
import { fmtDate, fmtNumber, pluralDays, titleCase } from '@/lib/format'
import { nextCode, uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

export function StuffingPage({ project, scoped }: { project?: Project; scoped?: boolean } = {}) {
  const nav = useNavigate()
  const toast = useToast()
  const store = useErp()
  const { stuffingJobs, projects, containers, removeStuffing, importStuffing } = store
  const [view, setView] = React.useState<'schedule' | 'register'>(scoped ? 'register' : 'schedule')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<StuffingJob | null>(null)
  const [deleting, setDeleting] = React.useState<StuffingJob | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [location, setLocation] = React.useState<string[]>([])
  const [pol, setPol] = React.useState<string[]>([])

  const data = scoped && project ? stuffingJobs.filter((j) => j.projectId === project.id) : stuffingJobs
  const metrics = stuffingMetrics(data)
  const schedule = stuffingSchedule(data)
  const projectOf = (j: StuffingJob) => projects.find((p) => p.id === j.projectId)
  const containerOf = (j: StuffingJob) => containers.find((c) => c.id === j.containerId)

  const columns: Column<StuffingJob>[] = [
    {
      key: 'reference', header: 'Reference', width: 'w-[132px]', pinned: true, sortable: true,
      sortValue: (r) => r.reference, exportValue: (r) => r.reference,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.reference}</span>,
    },
    {
      key: 'date', header: 'Stuffing date', width: 'w-[164px]', sortable: true,
      sortValue: (r) => r.stuffingDate, exportValue: (r) => r.stuffingDate.slice(0, 10),
      cell: (r) => {
        const check = checkStuffing(r)
        return (
          <div>
            <p className="tnum text-[12.5px] font-medium text-fg">{fmtDate(r.stuffingDate)}</p>
            <p className={`text-[11px] ${check.afterCutoff ? 'text-danger' : 'text-fg-muted'}`}>
              {titleCase(r.shift)} · {shiftWindow(r.shift)}
            </p>
          </div>
        )
      },
    },
    ...(!scoped
      ? [
          {
            key: 'project', header: 'Job', width: 'min-w-[180px]', sortable: true,
            sortValue: (r: StuffingJob) => projectOf(r)?.code ?? '',
            exportValue: (r: StuffingJob) => projectOf(r)?.code ?? '',
            cell: (r: StuffingJob) => (
              <div className="min-w-0">
                <p className="truncate font-mono text-[11.5px] text-fg">{projectOf(r)?.code}</p>
                <p className="truncate text-[11px] text-fg-muted">{projectOf(r)?.name}</p>
              </div>
            ),
          } as Column<StuffingJob>,
        ]
      : []),
    {
      key: 'container', header: 'Container', width: 'w-[156px]', sortable: true,
      sortValue: (r) => containerOf(r)?.containerNo ?? '', exportValue: (r) => containerOf(r)?.containerNo ?? '',
      cell: (r) => {
        const c = containerOf(r)
        if (!c) return <span className="text-fg-subtle">unassigned</span>
        return (
          <div>
            <p className="font-mono text-[11.5px] text-fg">{c.containerNo ?? `Unit ${c.seq}`}</p>
            <p className="text-[11px] text-fg-muted">{c.type}</p>
          </div>
        )
      },
    },
    {
      key: 'location', header: 'Where', width: 'min-w-[210px]', sortable: true,
      sortValue: (r) => r.locationName, exportValue: (r) => `${r.locationType}: ${r.locationName}`,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg">{r.locationName}</p>
          <p className="truncate text-[11px] text-fg-muted">{stuffingLocationLabel(r.locationType)}</p>
        </div>
      ),
    },
    {
      key: 'pol', header: 'Port of loading', width: 'w-[178px]', sortable: true,
      sortValue: (r) => r.polName, exportValue: (r) => r.polCode,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg">{r.polName}</p>
          <p className="truncate font-mono text-[11px] text-fg-muted">
            {r.polCode}
            {r.terminal && <span className="ml-1.5 font-sans">{r.terminal}</span>}
          </p>
        </div>
      ),
    },
    {
      key: 'cutoff', header: 'Cut-off slack', width: 'w-[150px]', sortable: true,
      sortValue: (r) => checkStuffing(r).slackDays ?? 999,
      exportValue: (r) => checkStuffing(r).slackDays ?? '',
      cell: (r) => {
        const { slackDays, afterCutoff } = checkStuffing(r)
        if (slackDays === null) return <span className="text-fg-subtle">no cut-off</span>
        return (
          <Tooltip content={r.gateInCutoff ? `Gate-in cut-off ${fmtDate(r.gateInCutoff)}` : ''}>
            <span className={`tnum text-[12.5px] ${afterCutoff ? 'font-semibold text-danger' : slackDays < 1 ? 'text-warning' : 'text-fg-muted'}`}>
              {afterCutoff ? `${Math.abs(slackDays)} d late` : slackDays === 0 ? 'same day' : `${pluralDays(slackDays)}`}
            </span>
          </Tooltip>
        )
      },
    },
    {
      key: 'tally', header: 'Tally', width: 'w-[168px]', sortable: true,
      sortValue: (r) => -checkStuffing(r).shortPackages,
      exportValue: (r) => `${r.stuffedPackages}/${r.plannedPackages}`,
      cell: (r) => {
        const { shortPackages } = checkStuffing(r)
        const done = r.stuffedPackages > 0
        if (!done) return <span className="text-[12px] text-fg-subtle">{fmtNumber(r.plannedPackages)} planned</span>
        const pct = (r.stuffedPackages / Math.max(1, r.plannedPackages)) * 100
        return (
          <Tooltip content={shortPackages ? `${shortPackages} packages short of the packing list` : 'Tally matches the packing list'}>
            <div className="flex items-center gap-2">
              <Progress value={pct} tone={shortPackages ? 'danger' : 'success'} className="w-[52px]" />
              <span className={`tnum text-[12px] ${shortPackages ? 'font-semibold text-danger' : 'text-fg-muted'}`}>
                {fmtNumber(r.stuffedPackages)}/{fmtNumber(r.plannedPackages)}
              </span>
            </div>
          </Tooltip>
        )
      },
    },
    {
      key: 'cbm', header: 'CBM', width: 'w-[112px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.plannedCbm, exportValue: (r) => r.plannedCbm,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtNumber(r.stuffedCbm || r.plannedCbm, 1)} m³</span>,
    },
    {
      key: 'crew', header: 'Crew', width: 'min-w-[168px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.supervisor, exportValue: (r) => r.supervisor,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg">{r.supervisor}</p>
          <p className="truncate text-[11px] text-fg-muted">
            {r.labourCount} labour{r.tallyClerk && ` · tally ${r.tallyClerk}`}
          </p>
        </div>
      ),
    },
    {
      key: 'seal', header: 'Seal', width: 'w-[130px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.sealNo ?? '', exportValue: (r) => r.sealNo ?? '',
      cell: (r) => {
        const { missingSeal } = checkStuffing(r)
        if (missingSeal) return <Badge tone="danger" size="sm">missing</Badge>
        return r.sealNo ? <span className="font-mono text-[11.5px] text-fg-muted">{r.sealNo}</span> : <span className="text-fg-subtle">—</span>
      },
    },
    {
      key: 'evidence', header: 'Evidence', width: 'w-[124px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.photosTaken, exportValue: (r) => `${r.photosTaken} photos ${r.tallySheetRef ?? ''}`.trim(),
      cell: (r) => {
        const { missingEvidence } = checkStuffing(r)
        if (missingEvidence) return <Badge tone="warning" size="sm">none</Badge>
        return r.photosTaken ? <span className="tnum text-[12px] text-fg-muted">{r.photosTaken} photos</span> : <span className="text-fg-subtle">—</span>
      },
    },
    {
      key: 'status', header: 'Status', width: 'w-[144px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => {
        const m = stuffingStatusMeta(r.status)
        return (
          <Tooltip content={m?.hint ?? ''}>
            <Badge tone={(m?.tone ?? 'neutral') as never} size="sm" dot>{m?.label ?? titleCase(r.status)}</Badge>
          </Tooltip>
        )
      },
    },
  ]

  return (
    <>
      {!scoped && (
        <>
          <PageHeader
            title="Stuffing Schedule"
            description="The yard's working week. Every unit gets a date, a shift, a place and a named supervisor — and the plan is checked against the terminal's gate-in cut-off before anyone books a crew, because a container stuffed after the cut-off is a container that rolls."
            actions={
              <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
                <Plus /> Schedule stuffing
              </Button>
            }
          />

          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="On the schedule"
              value={metrics.open}
              icon={<CalendarClock />}
              accent="primary"
              sub={`${metrics.today} today · ${metrics.thisWeek} within seven days`}
            />
            <KpiCard
              label="At risk"
              value={metrics.atRisk}
              icon={<TriangleAlert />}
              accent={metrics.atRisk ? 'danger' : 'success'}
              sub={metrics.atRisk ? 'Booked past a cut-off or sealed without a seal' : 'Every slot clears its cut-off'}
            />
            <KpiCard
              label="Tally shortages"
              value={metrics.shortages}
              icon={<PackageCheck />}
              accent={metrics.shortages ? 'warning' : 'success'}
              sub={metrics.shortPackages ? `${fmtNumber(metrics.shortPackages)} packages short of the packing list` : 'Every tally matched'}
            />
            <KpiCard
              label="Volume actually loaded"
              value={`${metrics.fillRatePct.toFixed(1)}%`}
              icon={<Boxes />}
              accent={metrics.fillRatePct >= 99 ? 'success' : 'warning'}
              sub={`${metrics.evidenceGaps} stuffings with no tally or photographs`}
            />
          </div>

          <Tabs
            value={view}
            onChange={setView}
            variant="pill"
            className="mb-4"
            items={[
              { value: 'schedule', label: 'Yard schedule', icon: <CalendarClock />, count: schedule.length },
              { value: 'register', label: 'Register', icon: <ClipboardCheck />, count: data.length },
            ]}
          />
        </>
      )}

      {view === 'schedule' && !scoped && (
        <div className="space-y-3">
          {schedule.length === 0 && (
            <Card>
              <CardBody className="py-10">
                <EmptyState
                  icon={<CalendarClock />}
                  title="Nothing on the schedule"
                  description="Every stuffing has been completed or cancelled."
                />
              </CardBody>
            </Card>
          )}
          {schedule.map((day) => {
            const overdue = day.date < new Date().toISOString().slice(0, 10)
            return (
            <Card key={day.date} className={overdue ? 'border-warning/40' : undefined}>
              <CardHeader
                icon={<CalendarClock />}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {fmtDate(day.date)}
                    {overdue && <Badge tone="warning" size="sm">Past — still open</Badge>}
                  </span>
                }
                description={`${day.rows.length} unit${day.rows.length === 1 ? '' : 's'} · ${fmtNumber(day.packages)} packages · ${fmtNumber(day.cbm, 1)} m³ · ${day.labour} labour booked${
                  overdue ? ' · scheduled for a date already past and not yet gated in' : ''
                }`}
              />
              <CardBody className="p-0">
                <div className="divide-y divide-border">
                  {day.rows.map((j) => {
                    const check = checkStuffing(j)
                    const p = projectOf(j)
                    const c = containerOf(j)
                    const m = stuffingStatusMeta(j.status)
                    return (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => { setEditing(j); setFormOpen(true) }}
                        className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-muted"
                      >
                        <span className="w-[92px] shrink-0">
                          <span className="block text-[12px] font-semibold text-fg">{titleCase(j.shift)}</span>
                          <span className="block text-[11px] text-fg-subtle">{shiftWindow(j.shift)}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11.5px] text-fg-subtle">{j.reference}</span>
                            <span className="text-[13px] font-medium text-fg">{j.locationName}</span>
                            <Badge tone="outline" size="sm">{stuffingLocationLabel(j.locationType)}</Badge>
                            {check.blockers.length > 0 && <Badge tone="danger" size="sm">At risk</Badge>}
                          </div>
                          <p className="mt-0.5 truncate text-[11.5px] text-fg-muted">
                            {p?.code} · {c?.containerNo ?? c?.type ?? 'no container'} → {j.polName}
                            {j.terminal && ` · ${j.terminal}`} · {j.supervisor}, {j.labourCount} labour
                          </p>
                          {check.blockers[0] && (
                            <p className="mt-1 text-[11.5px] leading-relaxed text-danger">{check.blockers[0]}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="tnum block text-[12.5px] font-medium text-fg">{fmtNumber(j.plannedPackages)} pkg</span>
                          <span className="tnum block text-[11px] text-fg-subtle">{fmtNumber(j.plannedCbm, 1)} m³</span>
                        </div>
                        <Badge tone={(m?.tone ?? 'neutral') as never} size="sm" dot className="shrink-0">
                          {m?.label}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </CardBody>
            </Card>
            )
          })}
        </div>
      )}

      {(view === 'register' || scoped) && (
        <DataTable
          data={data}
          columns={columns}
          getId={(r) => r.id}
          getLabel={(r) => `${r.reference} — ${r.locationName}`}
          entityLabel="stuffing"
          storageKey={scoped ? 'stuffing-scoped' : 'stuffing'}
          exportName="stuffing"
          initialSort={{ key: 'date', dir: 'asc' }}
          searchText={(r) => [r.reference, r.locationName, r.polName, r.polCode, r.supervisor, r.tallyClerk, r.sealNo, r.truckPlate, projectOf(r)?.code].join(' ')}
          onRowClick={(r) => { setEditing(r); setFormOpen(true) }}
          rowTone={(r) => (checkStuffing(r).blockers.length && stuffingIsOpen(r.status) ? 'bg-danger-soft/20' : undefined)}
          filters={[
            {
              key: 'status', label: 'Status', values: status, onChange: setStatus,
              options: STUFFING_STATUSES.map((s) => ({ value: s.value, label: s.label })),
              match: (r, v) => v.includes(r.status),
            },
            {
              key: 'location', label: 'Where', values: location, onChange: setLocation,
              options: STUFFING_LOCATION_TYPES.map((l) => ({ value: l.value, label: l.label })),
              match: (r, v) => v.includes(r.locationType),
            },
            {
              key: 'pol', label: 'Port of loading', values: pol, onChange: setPol,
              options: Array.from(new Set(data.map((r) => r.polCode))).map((c) => ({
                value: c, label: `${c} — ${PORTS.find((p) => p.code === c)?.name ?? c}`,
              })),
              match: (r, v) => v.includes(r.polCode),
            },
          ]}
          onDelete={(ids) => {
            removeStuffing(ids)
            toast.push({ tone: 'success', title: `${ids.length} stuffings deleted`, description: 'The containers keep the seal and date already written onto them.' })
          }}
          cascadeWarning={(rows) => {
            const evidenced = rows.filter((r) => r.tallySheetRef || r.photosTaken > 0)
            return evidenced.length
              ? [`${evidenced.length} of these carry a tally sheet or photographs — that evidence is the defence on a shortage claim.`]
              : []
          }}
          bulkActions={(rows, clear) => (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                rows.forEach((r) => store.upsertStuffing({ ...r, status: 'COMPLETED' }))
                toast.push({ tone: 'success', title: `${rows.length} stuffings closed` })
                clear()
              }}
            >
              Mark completed
            </Button>
          )}
          importFields={[
            { key: 'reference', label: 'Reference', required: true },
            { key: 'projectCode', label: 'Job code', required: true },
            { key: 'containerNo', label: 'Container number' },
            { key: 'stuffingDate', label: 'Stuffing date', required: true, hint: 'YYYY-MM-DD' },
            { key: 'shift', label: 'Shift', hint: 'MORNING / AFTERNOON / NIGHT' },
            { key: 'locationType', label: 'Location type', hint: 'FACTORY / CFS / DEPOT / WAREHOUSE / PORT_YARD' },
            { key: 'locationName', label: 'Location name', required: true },
            { key: 'addressLine', label: 'Address' },
            { key: 'polCode', label: 'Port of loading', required: true, hint: 'UN/LOCODE' },
            { key: 'terminal', label: 'Terminal' },
            { key: 'depot', label: 'Empty depot' },
            { key: 'truckPlate', label: 'Truck plate' },
            { key: 'driverName', label: 'Driver' },
            { key: 'supervisor', label: 'Supervisor', required: true },
            { key: 'tallyClerk', label: 'Tally clerk' },
            { key: 'labourCount', label: 'Labour count' },
            { key: 'plannedPackages', label: 'Planned packages' },
            { key: 'stuffedPackages', label: 'Stuffed packages' },
            { key: 'plannedCbm', label: 'Planned CBM' },
            { key: 'stuffedCbm', label: 'Stuffed CBM' },
            { key: 'sealNo', label: 'Seal number' },
            { key: 'photosTaken', label: 'Photographs' },
            { key: 'tallySheetRef', label: 'Tally sheet ref' },
            { key: 'gateInCutoff', label: 'Gate-in cut-off', hint: 'YYYY-MM-DD' },
            { key: 'status', label: 'Status' },
          ]}
          importSample={{
            reference: 'STF-2026-0099', projectCode: 'PRJ-2026-0041', containerNo: 'MSKU1234565',
            stuffingDate: '2026-09-04', shift: 'MORNING', locationType: 'FACTORY',
            locationName: 'Shipper factory', addressLine: 'Kawasan Industri Jababeka II, Cikarang',
            polCode: 'IDTPP', terminal: 'JICT Terminal 2', depot: 'Depo Graha Segara',
            truckPlate: 'B 9214 KZU', driverName: 'Slamet Riyadi', supervisor: 'Tomas Weber',
            tallyClerk: 'Sari Melati', labourCount: '8', plannedPackages: '240', stuffedPackages: '0',
            plannedCbm: '58.4', stuffedCbm: '0', sealNo: '', photosTaken: '0', tallySheetRef: '',
            gateInCutoff: '2026-09-06', status: 'PLANNED',
          }}
          toImportRow={(r) => ({
            reference: r.reference, projectCode: projectOf(r)?.code ?? '',
            containerNo: containerOf(r)?.containerNo ?? '',
            stuffingDate: r.stuffingDate.slice(0, 10), shift: r.shift, locationType: r.locationType,
            locationName: r.locationName, addressLine: r.addressLine ?? '', polCode: r.polCode,
            terminal: r.terminal ?? '', depot: r.depot ?? '', truckPlate: r.truckPlate ?? '',
            driverName: r.driverName ?? '', supervisor: r.supervisor, tallyClerk: r.tallyClerk ?? '',
            labourCount: r.labourCount, plannedPackages: r.plannedPackages, stuffedPackages: r.stuffedPackages,
            plannedCbm: r.plannedCbm, stuffedCbm: r.stuffedCbm, sealNo: r.sealNo ?? '',
            photosTaken: r.photosTaken, tallySheetRef: r.tallySheetRef ?? '',
            gateInCutoff: r.gateInCutoff?.slice(0, 10) ?? '', status: r.status,
          })}
          onImport={(rows) => {
            const mapped = rows.map((r) => {
              const existing = stuffingJobs.find((s) => s.reference === r.reference)
              const p = projects.find((x) => x.code === r.projectCode)
              const c = containers.find((x) => x.containerNo === r.containerNo)
              const port = PORTS.find((x) => x.code === r.polCode)
              return {
                ...(existing ?? {}),
                id: existing?.id ?? uid('stf'),
                reference: r.reference,
                projectId: p?.id ?? existing?.projectId ?? projects[0].id,
                containerId: c?.id ?? existing?.containerId,
                stuffingDate: r.stuffingDate ? new Date(r.stuffingDate).toISOString() : new Date().toISOString(),
                shift: (STUFFING_SHIFTS.some((s) => s.value === r.shift) ? r.shift : 'MORNING') as StuffingShift,
                locationType: (STUFFING_LOCATION_TYPES.some((l) => l.value === r.locationType) ? r.locationType : 'FACTORY') as StuffingLocationType,
                locationName: r.locationName || 'Shipper factory',
                addressLine: r.addressLine || undefined,
                polCode: r.polCode || p?.polCode || 'IDTPP',
                polName: port?.name ?? p?.polName ?? r.polCode,
                terminal: r.terminal || undefined,
                depot: r.depot || undefined,
                truckPlate: r.truckPlate || undefined,
                driverName: r.driverName || undefined,
                supervisor: r.supervisor || 'Unassigned',
                tallyClerk: r.tallyClerk || undefined,
                labourCount: Number(r.labourCount) || 0,
                plannedPackages: Number(r.plannedPackages) || 0,
                stuffedPackages: Number(r.stuffedPackages) || 0,
                plannedCbm: Number(r.plannedCbm) || 0,
                stuffedCbm: Number(r.stuffedCbm) || 0,
                sealNo: r.sealNo || undefined,
                photosTaken: Number(r.photosTaken) || 0,
                tallySheetRef: r.tallySheetRef || undefined,
                gateInCutoff: r.gateInCutoff ? new Date(r.gateInCutoff).toISOString() : existing?.gateInCutoff,
                status: (STUFFING_STATUSES.some((s) => s.value === r.status) ? r.status : 'PLANNED') as StuffingStatus,
              } as StuffingJob
            })
            importStuffing(mapped)
            toast.push({ tone: 'success', title: `${mapped.length} stuffings imported` })
          }}
          rowActions={(r) => (
            <>
              <Tooltip content="Open">
                <Button variant="ghost" size="iconXs" onClick={() => { setEditing(r); setFormOpen(true) }}><Pencil /></Button>
              </Tooltip>
              {!scoped && (
                <Tooltip content="Open the job">
                  <Button variant="ghost" size="iconXs" onClick={() => nav(`/projects/${r.projectId}`)}><Users /></Button>
                </Tooltip>
              )}
              <Tooltip content="Delete">
                <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}><Trash2 /></Button>
              </Tooltip>
            </>
          )}
          footerSummary={(rows) => (
            <span className="tnum">
              <span className="font-semibold text-fg">{fmtNumber(rows.reduce((a, r) => a + r.plannedPackages, 0))}</span> packages ·{' '}
              <span className="font-semibold text-fg">{fmtNumber(rows.reduce((a, r) => a + r.plannedCbm, 0), 1)} m³</span> ·{' '}
              <span className="font-semibold text-fg">{rows.reduce((a, r) => a + r.labourCount, 0)}</span> labour booked
            </span>
          )}
        />
      )}

      <StuffingForm open={formOpen} onOpenChange={setFormOpen} initial={editing} project={project} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="stuffing"
        items={deleting ? [`${deleting.reference} — ${deleting.locationName}`] : []}
        cascade={
          deleting && (deleting.tallySheetRef || deleting.photosTaken > 0)
            ? ['This record carries the tally sheet and photographs — the evidence on a shortage claim goes with it.']
            : undefined
        }
        onConfirm={() => {
          if (!deleting) return
          removeStuffing([deleting.id])
          toast.push({ tone: 'success', title: 'Stuffing deleted' })
          setDeleting(null)
        }}
      />
    </>
  )
}

/* ---------------------------------------------------------------- */

function StuffingForm({
  open, onOpenChange, initial, project,
}: { open: boolean; onOpenChange: (v: boolean) => void; initial: StuffingJob | null; project?: Project }) {
  const toast = useToast()
  const store = useErp()
  const { stuffingJobs, projects, containers, partners, upsertStuffing } = store

  const blank = (): StuffingJob => {
    const p = project ?? projects[0]
    return {
      id: uid('stf'),
      reference: nextCode('STF-2026-', stuffingJobs.map((s) => s.reference), 4),
      projectId: p.id,
      stuffingDate: new Date().toISOString(),
      shift: 'MORNING',
      locationType: 'FACTORY',
      locationName: 'Shipper factory',
      polCode: p.polCode,
      polName: p.polName,
      supervisor: '',
      labourCount: 6,
      plannedPackages: 0,
      stuffedPackages: 0,
      plannedCbm: 0,
      stuffedCbm: 0,
      photosTaken: 0,
      gateInCutoff: p.gateInCutoff,
      status: 'PLANNED',
    }
  }
  const [form, setForm] = React.useState<StuffingJob>(initial ?? blank())
  React.useEffect(() => setForm(initial ? structuredClone(initial) : blank()), [initial, open])
  const set = <K extends keyof StuffingJob>(k: K, v: StuffingJob[K]) => setForm((f) => ({ ...f, [k]: v }))

  const check = checkStuffing(form)
  const job = projects.find((p) => p.id === form.projectId)
  const jobContainers = containers.filter((c) => c.projectId === form.projectId)
  const sealRequired = ['SEALED', 'GATE_IN', 'COMPLETED'].includes(form.status)

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-3xl"
      eyebrow={job ? <Badge tone="outline" size="sm">{job.code}</Badge> : undefined}
      title={initial ? initial.reference : 'Schedule a stuffing'}
      description="The date, the place and the people. Everything else on the job keys off this — the VGM, the gate-in and the tally that answers a shortage claim."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!form.supervisor.trim() || !form.locationName.trim() || (sealRequired && !form.sealNo?.trim())}
            onClick={() => {
              upsertStuffing(form)
              toast.push({
                tone: 'success',
                title: initial ? 'Stuffing updated' : 'Stuffing scheduled',
                description: check.blockers.length ? check.blockers[0] : `${form.locationName}, ${fmtDate(form.stuffingDate)}.`,
              })
              onOpenChange(false)
            }}
          >
            {initial ? 'Save changes' : 'Schedule it'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        {(check.blockers.length > 0 || check.warnings.length > 0) && (
          <div
            className={`rounded-lg border px-3.5 py-3 ${
              check.blockers.length ? 'border-danger/30 bg-danger-soft' : 'border-warning/30 bg-warning-soft'
            }`}
          >
            <p className={`text-[12.5px] font-semibold ${check.blockers.length ? 'text-danger-soft-fg' : 'text-warning-soft-fg'}`}>
              {check.blockers.length ? 'This plan will not work' : 'Worth checking before you book the crew'}
            </p>
            <ul className="mt-1.5 space-y-1">
              {[...check.blockers, ...check.warnings].map((m) => (
                <li key={m} className={`text-[12px] leading-relaxed ${check.blockers.length ? 'text-danger-soft-fg/90' : 'text-warning-soft-fg/90'}`}>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Reference" required>
            <Input value={form.reference} onChange={(e) => set('reference', e.target.value)} className="font-mono" />
          </Field>
          <Field label="Job" required className="sm:col-span-2">
            <Select
              value={form.projectId}
              searchable
              onChange={(v) => {
                const p = projects.find((x) => x.id === v)
                setForm((f) => ({
                  ...f, projectId: v, containerId: undefined,
                  polCode: p?.polCode ?? f.polCode, polName: p?.polName ?? f.polName,
                  gateInCutoff: p?.gateInCutoff ?? f.gateInCutoff,
                }))
              }}
              options={projects.map((p) => ({ value: p.id, label: p.code, description: p.name }))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Stuffing date" required help="Tanggal stuffing — the day the crew and the box have to be in the same place.">
            <DatePicker
              value={form.stuffingDate.slice(0, 10)}
              onChange={(v) => set('stuffingDate', v ? new Date(v).toISOString() : form.stuffingDate)}
            />
          </Field>
          <Field label="Shift" required hint={shiftWindow(form.shift)}>
            <Select
              value={form.shift}
              onChange={(v) => set('shift', v)}
              options={STUFFING_SHIFTS.map((s) => ({ value: s.value, label: s.label, description: s.window }))}
            />
          </Field>
          <Field
            label="Gate-in cut-off"
            help="Copied from the job's booking. The stuffing has to finish before it."
            error={check.afterCutoff ? 'Stuffing is booked after the cut-off.' : undefined}
          >
            <DatePicker
              value={form.gateInCutoff?.slice(0, 10) ?? null}
              onChange={(v) => set('gateInCutoff', v ? new Date(v).toISOString() : undefined)}
            />
          </Field>
        </div>

        <Field label="Container" help="Leave empty for an LCL consolidation that has not been assigned a unit yet.">
          <Select
            value={form.containerId ?? null}
            onChange={(v) => set('containerId', v)}
            clearable searchable
            onClear={() => set('containerId', undefined)}
            placeholder="Not yet assigned"
            options={jobContainers.map((c) => ({
              value: c.id, label: c.containerNo ?? `Unit ${c.seq}`, description: `${c.type} · ${c.status}`,
            }))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Where" required>
            <Select
              value={form.locationType}
              onChange={(v) => set('locationType', v)}
              options={STUFFING_LOCATION_TYPES.map((l) => ({ value: l.value, label: l.label, description: l.hint }))}
            />
          </Field>
          <Field label="Location name" required>
            <Input value={form.locationName} onChange={(e) => set('locationName', e.target.value)} />
          </Field>
        </div>

        <Field label="Address">
          <Textarea value={form.addressLine ?? ''} onChange={(e) => set('addressLine', e.target.value || undefined)} rows={2} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Port of loading" required help="Usually the job's POL, but a feeder leg can load somewhere else.">
            <Select
              value={form.polCode}
              searchable
              onChange={(v) => {
                const port = PORTS.find((p) => p.code === v)
                setForm((f) => ({ ...f, polCode: v, polName: port?.name ?? v }))
              }}
              options={PORTS.map((p) => ({ value: p.code, label: `${p.code} — ${p.name}`, description: p.city }))}
            />
          </Field>
          <Field label="Terminal">
            <Input value={form.terminal ?? ''} onChange={(e) => set('terminal', e.target.value || undefined)} placeholder="JICT Terminal 2" />
          </Field>
          <Field label="Empty pick-up depot">
            <Input value={form.depot ?? ''} onChange={(e) => set('depot', e.target.value || undefined)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Empty released">
            <DatePicker
              value={form.emptyReleaseDate?.slice(0, 10) ?? null}
              onChange={(v) => set('emptyReleaseDate', v ? new Date(v).toISOString() : undefined)}
            />
          </Field>
          <Field label="Truck plate">
            <Input value={form.truckPlate ?? ''} onChange={(e) => set('truckPlate', e.target.value.toUpperCase() || undefined)} className="font-mono" />
          </Field>
          <Field label="Driver">
            <Input value={form.driverName ?? ''} onChange={(e) => set('driverName', e.target.value || undefined)} />
          </Field>
        </div>

        <Field label="Haulier" help="A managed partner rather than a name typed onto the line.">
          <Select
            value={form.haulierPartnerId ?? null}
            onChange={(v) => set('haulierPartnerId', v)}
            clearable searchable
            onClear={() => set('haulierPartnerId', undefined)}
            placeholder="Not a managed partner"
            options={partners
              .filter((p) => p.types.includes('TRUCKING'))
              .map((p) => ({ value: p.id, label: p.name, description: p.status }))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Supervisor" required help="A named person. A tally nobody signed is not evidence.">
            <Input value={form.supervisor} onChange={(e) => set('supervisor', e.target.value)} />
          </Field>
          <Field label="Tally clerk">
            <Input value={form.tallyClerk ?? ''} onChange={(e) => set('tallyClerk', e.target.value || undefined)} />
          </Field>
          <Field label="Labour booked">
            <Input type="number" value={form.labourCount} onChange={(e) => set('labourCount', Number(e.target.value))} className="tnum" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Planned packages">
            <Input type="number" value={form.plannedPackages} onChange={(e) => set('plannedPackages', Number(e.target.value))} className="tnum" />
          </Field>
          <Field
            label="Stuffed packages"
            error={check.shortPackages > 0 ? `${check.shortPackages} short.` : undefined}
            help="What the tally counted, not what the packing list says."
          >
            <Input
              type="number"
              value={form.stuffedPackages}
              invalid={check.shortPackages > 0}
              onChange={(e) => set('stuffedPackages', Number(e.target.value))}
              className="tnum"
            />
          </Field>
          <Field label="Planned CBM">
            <Input type="number" step="0.01" value={form.plannedCbm} onChange={(e) => set('plannedCbm', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Stuffed CBM">
            <Input type="number" step="0.01" value={form.stuffedCbm} onChange={(e) => set('stuffedCbm', Number(e.target.value))} className="tnum" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field
            label="Seal number"
            required={sealRequired}
            error={sealRequired && !form.sealNo?.trim() ? 'A sealed unit needs its seal number.' : undefined}
          >
            <Input
              value={form.sealNo ?? ''}
              invalid={sealRequired && !form.sealNo?.trim()}
              onChange={(e) => set('sealNo', e.target.value.toUpperCase() || undefined)}
              className="font-mono"
            />
          </Field>
          <Field label="Photographs" help="Empty, part-loaded, full, doors closed, seal fitted.">
            <Input type="number" value={form.photosTaken} onChange={(e) => set('photosTaken', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Tally sheet ref">
            <Input value={form.tallySheetRef ?? ''} onChange={(e) => set('tallySheetRef', e.target.value || undefined)} className="font-mono" />
          </Field>
          <Field label="Status" required>
            <Select
              value={form.status}
              onChange={(v) => set('status', v)}
              options={STUFFING_STATUSES.map((s) => ({ value: s.value, label: s.label, description: s.hint }))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Started">
            <Input value={form.startTime ?? ''} onChange={(e) => set('startTime', e.target.value || undefined)} placeholder="08:15" className="tnum" />
          </Field>
          <Field label="Finished">
            <Input value={form.endTime ?? ''} onChange={(e) => set('endTime', e.target.value || undefined)} placeholder="12:40" className="tnum" />
          </Field>
        </div>

        <Field label="Remarks">
          <Textarea value={form.remarks ?? ''} onChange={(e) => set('remarks', e.target.value || undefined)} rows={2} />
        </Field>
      </div>
    </Sheet>
  )
}
