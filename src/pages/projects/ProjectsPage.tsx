import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Container as ContainerIcon, Eye, Pencil, Plus, Ship, Timer, Trash2, TrendingUp,
} from 'lucide-react'
import type { Project } from '@/data/types'
import { STAGES, countryFlag, stageIndex } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { StageChip } from '@/components/shared/StageChip'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { ProjectForm } from './ProjectForm'
import { fmtCurrency, fmtDate, pluralDays, relativeDays, titleCase } from '@/lib/format'
import { buildExceptions, jobFinancials } from '@/lib/analytics'
import { useToast } from '@/components/ui/toast'
import { uid } from '@/lib/utils'
import { STAGE_TEMPLATE } from './stageTemplate'

export function ProjectsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const store = useErp()
  const { projects, customers, containers, documents, charges, invoices, removeProjects, importProjects, upsertProject } = store
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Project | null>(null)
  const [deleting, setDeleting] = React.useState<Project | null>(null)
  const [stage, setStage] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<string[]>([])
  const [type, setType] = React.useState<string[]>([])
  const [priority, setPriority] = React.useState<string[]>([])

  const exceptions = React.useMemo(
    () => buildExceptions({ projects, containers, documents, charges, customers, invoices }),
    [projects, containers, documents, charges, customers, invoices],
  )
  const exceptionsByProject = React.useMemo(() => {
    const m = new Map<string, number>()
    exceptions.forEach((e) => e.projectId && m.set(e.projectId, (m.get(e.projectId) ?? 0) + 1))
    return m
  }, [exceptions])

  const activeJobs = projects.filter((p) => p.status === 'ACTIVE')
  const pipelineValue = activeJobs.reduce((a, p) => a + p.quotedRevenue * p.fxRate, 0)
  const atRisk = projects.filter((p) => (exceptionsByProject.get(p.id) ?? 0) > 0 && p.status === 'ACTIVE')
  const teuInPlay = containers
    .filter((c) => activeJobs.some((p) => p.id === c.projectId))
    .reduce((a, c) => a + (c.type.startsWith('40') || c.type.startsWith('45') ? 2 : c.type === 'LCL' ? 0 : 1), 0)

  const partyName = (id: string) => {
    const c = customers.find((x) => x.id === id)
    return c?.tradeName || c?.legalName || '—'
  }

  const columns: Column<Project>[] = [
    {
      key: 'code', header: 'Job', width: 'w-[150px]', pinned: true, sortable: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12px] font-medium text-fg">{r.code}</p>
          <p className="truncate font-mono text-[10.5px] text-fg-subtle">{r.jobNo}</p>
        </div>
      ),
    },
    {
      key: 'name', header: 'Description', width: 'min-w-[250px]', sortable: true,
      sortValue: (r) => r.name, exportValue: (r) => r.name,
      cell: (r) => {
        const ex = exceptionsByProject.get(r.id) ?? 0
        return (
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-medium text-fg">
              {ex > 0 && (
                <Tooltip content={`${ex} open exception${ex === 1 ? '' : 's'}`}>
                  <AlertTriangle className="size-3.5 shrink-0 text-warning" />
                </Tooltip>
              )}
              <span className="truncate">{r.name}</span>
            </p>
            <p className="truncate text-[11.5px] text-fg-muted">{r.commodity}</p>
          </div>
        )
      },
    },
    {
      key: 'client', header: 'Client', width: 'min-w-[170px]', sortable: true,
      sortValue: (r) => partyName(r.clientId), exportValue: (r) => partyName(r.clientId),
      cell: (r) => <span className="truncate text-[12.5px] text-fg">{partyName(r.clientId)}</span>,
    },
    {
      key: 'route', header: 'Route', width: 'min-w-[240px]', sortable: true,
      sortValue: (r) => `${r.polName}-${r.podName}`, exportValue: (r) => `${r.polCode} → ${r.podCode}`,
      cell: (r) => (
        <span className="flex items-center gap-1.5 text-[12px]">
          <span className="text-[13px]">🇮🇩</span>
          <span className="text-fg">{r.polName}</span>
          <span className="text-fg-subtle">→</span>
          <span className="text-[13px]">{countryFlag(r.destCountry)}</span>
          <span className="text-fg">{r.podName}</span>
        </span>
      ),
    },
    {
      key: 'type', header: 'Type', width: 'w-[130px]', sortable: true,
      sortValue: (r) => r.type, exportValue: (r) => r.type,
      cell: (r) => (
        <Badge tone={r.type === 'CONSIGNMENT' ? 'purple' : r.type === 'PROJECT_CARGO' ? 'warning' : 'outline'} size="sm">
          {titleCase(r.type)}
        </Badge>
      ),
    },
    {
      key: 'stage', header: 'Stage', width: 'w-[168px]', sortable: true,
      sortValue: (r) => stageIndex(r.stage), exportValue: (r) => r.stage,
      cell: (r) => <StageChip stage={r.stage} />,
    },
    {
      key: 'mode', header: 'Mode', width: 'w-[86px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.mode, exportValue: (r) => r.mode,
      cell: (r) => <Badge tone="outline" size="sm">{r.mode}</Badge>,
    },
    {
      key: 'incoterm', header: 'Terms', width: 'w-[120px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.incoterm, exportValue: (r) => `${r.incoterm} ${r.freightTerm}`,
      cell: (r) => (
        <span className="text-[12px] text-fg-muted">
          {r.incoterm} · {titleCase(r.freightTerm)}
        </span>
      ),
    },
    {
      key: 'containers', header: 'Units', width: 'w-[92px]', align: 'right', sortable: true,
      sortValue: (r) => containers.filter((c) => c.projectId === r.id).length,
      exportValue: (r) => containers.filter((c) => c.projectId === r.id).length,
      cell: (r) => {
        const n = containers.filter((c) => c.projectId === r.id)
        return (
          <span className="tnum inline-flex items-center gap-1 text-[12.5px] text-fg-muted">
            <ContainerIcon className="size-3.5 text-fg-subtle" />
            {n.length}
          </span>
        )
      },
    },
    {
      key: 'etd', header: 'ETD', width: 'w-[128px]', sortable: true,
      sortValue: (r) => r.etd ?? '9999', exportValue: (r) => r.etd ?? '',
      cell: (r) => {
        const d = relativeDays(r.etd)
        return (
          <div>
            <p className="tnum text-[12.5px] text-fg">{fmtDate(r.etd)}</p>
            {d !== null && (
              <p className={`text-[11px] ${d < 0 ? 'text-fg-subtle' : d <= 3 ? 'text-warning' : 'text-fg-muted'}`}>
                {d < 0 ? 'sailed' : d === 0 ? 'today' : `in ${pluralDays(d)}`}
              </p>
            )}
          </div>
        )
      },
    },
    {
      key: 'cutoff', header: 'Next cut-off', width: 'w-[150px]', sortable: true,
      sortValue: (r) => nextCutoff(r)?.iso ?? '9999',
      exportValue: (r) => nextCutoff(r)?.iso ?? '',
      cell: (r) => {
        const c = nextCutoff(r)
        if (!c) return <span className="text-fg-subtle">—</span>
        const d = relativeDays(c.iso)!
        return (
          <div>
            <p className="text-[12px] text-fg">{c.label}</p>
            <p className={`tnum text-[11px] font-medium ${d < 0 ? 'text-danger' : d <= 2 ? 'text-warning' : 'text-fg-muted'}`}>
              {d < 0 ? `missed ${pluralDays(d)} ago` : d === 0 ? 'today' : `in ${pluralDays(d)}`}
            </p>
          </div>
        )
      },
    },
    {
      key: 'revenue', header: 'Revenue', width: 'w-[136px]', align: 'right', sortable: true,
      sortValue: (r) => jobFinancials(charges.filter((c) => c.projectId === r.id)).revenue,
      exportValue: (r) => Math.round(jobFinancials(charges.filter((c) => c.projectId === r.id)).revenue),
      cell: (r) => (
        <span className="tnum text-[12.5px] font-medium text-fg">
          {fmtCurrency(jobFinancials(charges.filter((c) => c.projectId === r.id)).revenue, 'IDR', { compact: true })}
        </span>
      ),
    },
    {
      key: 'margin', header: 'Margin', width: 'w-[104px]', align: 'right', sortable: true,
      sortValue: (r) => jobFinancials(charges.filter((c) => c.projectId === r.id)).marginPct,
      exportValue: (r) => jobFinancials(charges.filter((c) => c.projectId === r.id)).marginPct.toFixed(1),
      cell: (r) => {
        const m = jobFinancials(charges.filter((c) => c.projectId === r.id)).marginPct
        if (!charges.some((c) => c.projectId === r.id)) return <span className="text-fg-subtle">—</span>
        return <Badge tone={m >= 20 ? 'success' : m >= 10 ? 'warning' : 'danger'} size="sm">{m.toFixed(0)}%</Badge>
      },
    },
    {
      key: 'status', header: 'Status', width: 'w-[124px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'owner', header: 'Owner', width: 'w-[150px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.ownerName, exportValue: (r) => r.ownerName,
      cell: (r) => <span className="text-[12.5px] text-fg-muted">{r.ownerName}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Projects"
        description="Every export job, from the first inquiry to the closing entry. Each job runs through an eight-stage workflow with blocking checks, so nothing sails without a VGM and nothing is invoiced with an unapproved charge."
        actions={
          <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus /> New job
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active jobs" value={activeJobs.length} icon={<Ship />} accent="primary" sub={`${projects.length} total in the register`} />
        <KpiCard label="Pipeline value" value={fmtCurrency(pipelineValue, 'IDR', { compact: true })} icon={<TrendingUp />} accent="success" sub="Quoted revenue on active jobs" />
        <KpiCard label="TEU in play" value={teuInPlay} icon={<ContainerIcon />} accent="accent" sub={`${containers.length} units across all jobs`} />
        <KpiCard label="Jobs with exceptions" value={atRisk.length} icon={<Timer />} accent={atRisk.length ? 'danger' : 'success'} sub={atRisk.length ? 'Needs an operator today' : 'Nothing at risk'} />
      </div>

      <DataTable
        data={projects}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.code} — ${r.name}`}
        entityLabel="job"
        storageKey="projects"
        exportName="projects"
        initialSort={{ key: 'etd', dir: 'asc' }}
        pageSize={25}
        searchText={(r) =>
          [r.code, r.jobNo, r.name, r.commodity, r.polName, r.podName, r.vessel, r.bookingNo, r.houseBlNo, partyName(r.clientId), ...r.tags].join(' ')
        }
        onRowClick={(r) => nav(`/projects/${r.id}`)}
        rowTone={(r) =>
          r.status === 'ON_HOLD' ? 'bg-warning-soft/25' : r.status === 'CANCELLED' ? 'opacity-55' : undefined
        }
        filters={[
          {
            key: 'stage', label: 'Stage', values: stage, onChange: setStage,
            options: STAGES.map((s) => ({ value: s.key, label: s.label })),
            match: (r, v) => v.includes(r.stage),
          },
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'type', label: 'Job type', values: type, onChange: setType,
            options: ['FULL_EXPORT', 'CONSIGNMENT', 'PARTIAL_LCL', 'PROJECT_CARGO', 'TRIANGULAR', 'CROSS_TRADE'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.type),
          },
          {
            key: 'priority', label: 'Priority', values: priority, onChange: setPriority,
            options: ['STANDARD', 'HIGH', 'CRITICAL'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.priority),
          },
        ]}
        onDelete={(ids) => {
          removeProjects(ids)
          toast.push({ tone: 'success', title: `${ids.length} jobs deleted`, description: 'Containers, documents and charges were removed with them.' })
        }}
        cascadeWarning={(rows) => {
          const ids = rows.map((r) => r.id)
          const c = containers.filter((x) => ids.includes(x.projectId)).length
          const d = documents.filter((x) => ids.includes(x.projectId)).length
          const ch = charges.filter((x) => ids.includes(x.projectId)).length
          const out: string[] = []
          if (c) out.push(`${c} containers and all their cargo lines`)
          if (d) out.push(`${d} documents`)
          if (ch) out.push(`${ch} charge lines`)
          return out
        }}
        deleteNote="Deleting a job cascades to everything hanging off it:"
        bulkActions={(rows, clear) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              rows.forEach((r) => upsertProject({ ...r, status: 'ON_HOLD' }))
              toast.push({ tone: 'success', title: `${rows.length} jobs put on hold` })
              clear()
            }}
          >
            Put on hold
          </Button>
        )}
        importFields={[
          { key: 'code', label: 'Project code', required: true },
          { key: 'jobNo', label: 'Job number' },
          { key: 'name', label: 'Job name', required: true },
          { key: 'type', label: 'Job type', hint: 'FULL_EXPORT / CONSIGNMENT / …' },
          { key: 'clientCode', label: 'Client customer code', required: true },
          { key: 'shipperCode', label: 'Shipper customer code' },
          { key: 'consigneeCode', label: 'Consignee customer code' },
          { key: 'commodity', label: 'Commodity' },
          { key: 'polCode', label: 'POL code', required: true },
          { key: 'podCode', label: 'POD code', required: true },
          { key: 'incoterm', label: 'Incoterm' },
          { key: 'mode', label: 'Mode' },
          { key: 'etd', label: 'ETD', hint: 'YYYY-MM-DD' },
          { key: 'eta', label: 'ETA', hint: 'YYYY-MM-DD' },
          { key: 'quotedRevenue', label: 'Quoted revenue' },
          { key: 'currency', label: 'Currency' },
        ]}
        importSample={{
          code: 'PRJ-2026-0060', jobNo: 'JKT/EXP/26/0900', name: 'Sample — Hamburg Coffee W40', type: 'FULL_EXPORT',
          clientCode: 'CUS-0004', shipperCode: 'CUS-0004', consigneeCode: 'CUS-0004', commodity: 'Green coffee',
          polCode: 'IDSUB', podCode: 'DEHAM', incoterm: 'FOB', mode: 'FCL', etd: '2026-10-02', eta: '2026-11-05',
          quotedRevenue: '6200', currency: 'USD',
        }}
        toImportRow={(r) => ({
          code: r.code, jobNo: r.jobNo, name: r.name, type: r.type,
          clientCode: customers.find((c) => c.id === r.clientId)?.code ?? '',
          shipperCode: customers.find((c) => c.id === r.shipperId)?.code ?? '',
          consigneeCode: customers.find((c) => c.id === r.consigneeId)?.code ?? '',
          commodity: r.commodity, polCode: r.polCode, podCode: r.podCode, incoterm: r.incoterm,
          mode: r.mode, etd: r.etd?.slice(0, 10) ?? '', eta: r.eta?.slice(0, 10) ?? '',
          quotedRevenue: r.quotedRevenue, currency: r.currency,
        })}
        onImport={(rows) => {
          const findByCode = (code: string) => customers.find((c) => c.code === code)
          const mapped = rows.map((r) => {
            const existing = projects.find((p) => p.code === r.code)
            const cl = findByCode(r.clientCode)
            const sh = findByCode(r.shipperCode) ?? cl
            const cn = findByCode(r.consigneeCode) ?? cl
            return {
              ...(existing ?? {}),
              id: existing?.id ?? uid('prj'),
              code: r.code,
              jobNo: r.jobNo || r.code,
              name: r.name,
              type: (r.type || 'FULL_EXPORT') as Project['type'],
              status: existing?.status ?? 'DRAFT',
              priority: existing?.priority ?? 'STANDARD',
              stage: existing?.stage ?? 'INQUIRY',
              stages: existing?.stages ?? STAGE_TEMPLATE(),
              clientId: cl?.id ?? '', clientOfficeId: cl?.offices[0]?.id ?? '',
              shipperId: sh?.id ?? '', shipperOfficeId: sh?.offices[0]?.id ?? '',
              consigneeId: cn?.id ?? '', consigneeOfficeId: cn?.offices.at(-1)?.id ?? '',
              mode: (r.mode || 'FCL') as Project['mode'],
              scope: existing?.scope ?? 'PORT_TO_PORT',
              incoterm: (r.incoterm || 'FOB') as Project['incoterm'],
              freightTerm: existing?.freightTerm ?? 'PREPAID',
              paymentTerm: existing?.paymentTerm ?? 'NET_30',
              commodity: r.commodity || '',
              hsCodes: existing?.hsCodes ?? [],
              cargoValue: existing?.cargoValue ?? 0,
              cargoCurrency: existing?.cargoCurrency ?? 'USD',
              insured: existing?.insured ?? false,
              dangerousGoods: existing?.dangerousGoods ?? false,
              polCode: r.polCode, polName: existing?.polName ?? r.polCode,
              podCode: r.podCode, podName: existing?.podName ?? r.podCode,
              destCountry: existing?.destCountry ?? r.podCode.slice(0, 2),
              blType: existing?.blType ?? 'ORIGINAL_3_3',
              blStatus: existing?.blStatus ?? 'NOT_ISSUED',
              etd: r.etd || undefined, eta: r.eta || undefined,
              currency: (r.currency || 'USD') as Project['currency'],
              fxRate: existing?.fxRate ?? 16250,
              quotedRevenue: Number(r.quotedRevenue) || 0,
              ownerName: existing?.ownerName ?? 'Elena Marchetti',
              createdAt: existing?.createdAt ?? new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              tags: existing?.tags ?? [],
              timeline: existing?.timeline ?? [{ id: uid('tl'), at: new Date().toISOString(), type: 'STATUS' as const, title: 'Imported from CSV', actor: 'Import' }],
            } as Project
          })
          importProjects(mapped)
          toast.push({ tone: 'success', title: `${mapped.length} jobs imported` })
        }}
        rowActions={(r) => (
          <>
            <Tooltip content="Open job">
              <Button variant="ghost" size="iconXs" onClick={() => nav(`/projects/${r.id}`)}>
                <Eye />
              </Button>
            </Tooltip>
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
        footerSummary={(rows) => {
          const fin = rows.map((r) => jobFinancials(charges.filter((c) => c.projectId === r.id)))
          const rev = fin.reduce((a, f) => a + f.revenue, 0)
          const mar = fin.reduce((a, f) => a + f.margin, 0)
          return (
            <span className="tnum">
              Revenue <span className="font-semibold text-fg">{fmtCurrency(rev, 'IDR', { compact: true })}</span> · Margin{' '}
              <span className="font-semibold text-fg">{fmtCurrency(mar, 'IDR', { compact: true })}</span>
              {rev > 0 && <span className="text-fg-subtle"> ({((mar / rev) * 100).toFixed(1)}%)</span>}
            </span>
          )
        }}
      />

      <ProjectForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="job"
        items={deleting ? [`${deleting.code} — ${deleting.name}`] : []}
        cascade={
          deleting
            ? [
                `${containers.filter((c) => c.projectId === deleting.id).length} containers`,
                `${documents.filter((d) => d.projectId === deleting.id).length} documents`,
                `${charges.filter((c) => c.projectId === deleting.id).length} charge lines`,
              ]
            : []
        }
        destructiveNote="Deleting this job also removes:"
        requireTypedConfirmation
        onConfirm={() => {
          if (deleting) {
            removeProjects([deleting.id])
            toast.push({ tone: 'success', title: 'Job deleted', description: deleting.code })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}

function nextCutoff(p: Project) {
  /* once the containers are gated in the cut-off calendar is history, not a to-do */
  if (stageIndex(p.stage) > 4 || p.status === 'COMPLETED' || p.status === 'CANCELLED') return null
  const list = [
    { label: 'SI', iso: p.siCutoff },
    { label: 'VGM', iso: p.vgmCutoff },
    { label: 'Gate-in', iso: p.gateInCutoff },
  ].filter((x) => x.iso) as { label: string; iso: string }[]
  if (!list.length) return null
  const future = list.filter((x) => relativeDays(x.iso)! >= 0).sort((a, b) => a.iso.localeCompare(b.iso))
  if (future.length) return future[0]
  return list.sort((a, b) => b.iso.localeCompare(a.iso))[0]
}
