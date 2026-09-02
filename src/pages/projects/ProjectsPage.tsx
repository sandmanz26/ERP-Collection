import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarClock, ClipboardList, Eye, Pencil, Plus, Trash2, TrendingUp, Users } from 'lucide-react'
import type { Project } from '@/data/types'
import { PROJECT_STATUSES, SERVICE_TYPES, serviceLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { FulfilmentBar } from '@/components/shared/FulfilmentBar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { useToast } from '@/components/ui/toast'
import { ProjectForm } from './ProjectForm'
import { fmtCurrency, fmtDate } from '@/lib/format'
import {
  contractValue, daysUntil, deployedHeadcount, fulfilment, isLiveProject, isStaffedProject,
  monthlyMargin, monthlyValue, periodProgress, periodState, requiredHeadcount, serviceTypesOf,
} from '@/lib/domain'

export function ProjectsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const { projects, clients, buildings, positions, removeProjects } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Project | null>(null)
  const [deleting, setDeleting] = React.useState<Project | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [client, setClient] = React.useState<string[]>([])
  const [service, setService] = React.useState<string[]>([])
  const [period, setPeriod] = React.useState<string[]>([])
  const [gapOnly, setGapOnly] = React.useState(false)

  const clientOf = (p: Project) => clients.find((c) => c.id === p.clientId)
  const buildingOf = (p: Project) => buildings.find((b) => b.id === p.buildingId)

  const live = projects.filter(isLiveProject)
  const staffed = projects.filter(isStaffedProject)
  const totalRequired = staffed.reduce((a, p) => a + requiredHeadcount(p), 0)
  const totalDeployed = staffed.reduce((a, p) => a + deployedHeadcount(p), 0)
  const monthlyTotal = live.reduce((a, p) => a + monthlyValue(p), 0)
  const endingSoon = live.filter((p) => periodState(p) === 'ENDING_SOON')

  const visible = gapOnly ? projects.filter((p) => isStaffedProject(p) && fulfilment(p).gap > 0) : projects

  const columns: Column<Project>[] = [
    {
      key: 'code', header: 'Code', width: 'w-[120px]', pinned: true, sortable: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.code}</span>,
    },
    {
      key: 'name', header: 'Project', width: 'w-[230px] max-w-[230px]', sortable: true,
      sortValue: (r) => r.name, exportValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.name}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{buildingOf(r)?.name ?? 'Building removed'}</p>
        </div>
      ),
    },
    {
      key: 'client', header: 'Client', width: 'w-[150px] max-w-[150px]', sortable: true,
      sortValue: (r) => clientOf(r)?.legalName ?? '', exportValue: (r) => clientOf(r)?.legalName ?? '',
      cell: (r) => {
        const c = clientOf(r)
        if (!c) return <span className="text-[12.5px] text-danger">Client removed</span>
        return (
          <Link to={`/clients/${c.id}`} onClick={(e) => e.stopPropagation()} className="text-[12.5px] font-medium text-primary hover:underline">
            {c.brandName || c.legalName}
          </Link>
        )
      },
    },
    {
      key: 'services', header: 'Services', width: 'w-[148px]', sortable: true,
      sortValue: (r) => serviceTypesOf(r, positions).join(','),
      exportValue: (r) => serviceTypesOf(r, positions).map(serviceLabel).join(' / '),
      cell: (r) => {
        const types = serviceTypesOf(r, positions)
        return (
          <div className="flex flex-wrap gap-1">
            {types.slice(0, 2).map((t) => (
              <Badge key={t} tone="outline" size="sm">{serviceLabel(t)}</Badge>
            ))}
            {types.length > 2 && <Badge tone="neutral" size="sm">+{types.length - 2}</Badge>}
          </div>
        )
      },
    },
    {
      key: 'status', header: 'Status', width: 'w-[132px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge value={r.status} size="sm" />
          {isLiveProject(r) && periodState(r) === 'ENDING_SOON' && (
            <Tooltip content={`Ends in ${daysUntil(r.periodEnd)} days`}>
              <span>
                <StatusBadge value="ENDING_SOON" size="sm" />
              </span>
            </Tooltip>
          )}
          {isLiveProject(r) && periodState(r) === 'EXPIRED' && <StatusBadge value="EXPIRED" size="sm" />}
        </div>
      ),
    },
    {
      key: 'period', header: 'Period', width: 'w-[172px]', sortable: true,
      sortValue: (r) => r.periodEnd, exportValue: (r) => `${r.periodStart.slice(0, 10)} → ${r.periodEnd.slice(0, 10)}`,
      cell: (r) => {
        const days = daysUntil(r.periodEnd)
        return (
          <div className="min-w-0">
            <p className="tnum text-[12px] text-fg">
              {fmtDate(r.periodStart)} – {fmtDate(r.periodEnd)}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <div className="h-1 w-[86px] overflow-hidden rounded-full bg-neutral-soft">
                <div className="h-full rounded-full bg-primary/70" style={{ width: `${periodProgress(r)}%` }} />
              </div>
              <span className={`tnum text-[11px] ${days < 0 ? 'text-danger' : days <= 60 ? 'text-warning' : 'text-fg-subtle'}`}>
                {days < 0 ? `${Math.abs(days)}d over` : `${days}d left`}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      key: 'fulfilment', header: 'Fulfilment', width: 'w-[158px]', sortable: true,
      sortValue: (r) => fulfilment(r).pct, exportValue: (r) => `${fulfilment(r).deployed}/${fulfilment(r).required}`,
      headerHint: 'Deployed against contracted headcount',
      cell: (r) => {
        const f = fulfilment(r)
        /* A finished or cancelled contract owes nobody a post, so it gets no bar to fail. */
        if (r.status === 'COMPLETED' || r.status === 'TERMINATED') {
          return <span className="text-[12px] text-fg-subtle">Closed · {f.required} posts</span>
        }
        if (!isStaffedProject(r)) {
          return <span className="text-[12px] text-fg-subtle">Planned · {f.required} posts</span>
        }
        return <FulfilmentBar deployed={f.deployed} required={f.required} />
      },
    },
    {
      key: 'headcount', header: 'Headcount', width: 'w-[108px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => requiredHeadcount(r), exportValue: (r) => requiredHeadcount(r),
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{requiredHeadcount(r)}</span>,
    },
    {
      key: 'monthly', header: 'Monthly value', width: 'w-[152px]', align: 'right', sortable: true,
      sortValue: (r) => monthlyValue(r), exportValue: (r) => monthlyValue(r),
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{fmtCurrency(monthlyValue(r), 'IDR', { compact: true })}</span>,
    },
    {
      key: 'margin', header: 'Margin', width: 'w-[132px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => monthlyMargin(r).pct, exportValue: (r) => monthlyMargin(r).margin,
      cell: (r) => {
        const m = monthlyMargin(r)
        return (
          <div className="text-right">
            <p className="tnum text-[12.5px] font-medium text-fg">{fmtCurrency(m.margin, 'IDR', { compact: true })}</p>
            <p className="tnum text-[11px] text-fg-subtle">{m.pct.toFixed(1)}%</p>
          </div>
        )
      },
    },
    {
      key: 'contractValue', header: 'Contract value', width: 'w-[152px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => contractValue(r), exportValue: (r) => Math.round(contractValue(r)),
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtCurrency(contractValue(r), 'IDR', { compact: true })}</span>,
    },
    {
      key: 'manager', header: 'Project manager', width: 'w-[168px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.projectManager, exportValue: (r) => r.projectManager,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg">{r.projectManager}</p>
          {r.siteSupervisor && <p className="truncate text-[11px] text-fg-subtle">Site: {r.siteSupervisor}</p>}
        </div>
      ),
    },
    {
      key: 'renewal', header: 'Renewal', width: 'w-[132px]', sortable: true, defaultHidden: true,
      sortValue: (r) => (r.autoRenew ? 0 : 1), exportValue: (r) => (r.autoRenew ? 'AUTO' : 'MANUAL'),
      cell: (r) => (
        <span className="text-[12px] text-fg-muted">{r.autoRenew ? `Auto · ${r.renewalNoticeDays}d notice` : `Manual · ${r.renewalNoticeDays}d notice`}</span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Projects"
        description="Each contract covers one building for one period, and lists the positions and headcount it has to keep on site."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus /> New project
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Running contracts"
          value={live.length}
          icon={<ClipboardList />}
          accent="primary"
          sub={`${projects.filter((p) => p.status === 'PENDING_APPROVAL').length} awaiting approval · ${projects.length} total`}
        />
        <KpiCard
          label="Fulfilment"
          value={totalRequired ? `${Math.round((totalDeployed / totalRequired) * 100)}%` : '—'}
          icon={<Users />}
          accent={totalDeployed >= totalRequired ? 'success' : 'warning'}
          sub={`${totalDeployed.toLocaleString('en-US')} of ${totalRequired.toLocaleString('en-US')} posts filled`}
          onClick={() => setGapOnly((v) => !v)}
        />
        <KpiCard
          label="Ending within 60 days"
          value={endingSoon.length}
          icon={<CalendarClock />}
          accent={endingSoon.length ? 'warning' : 'success'}
          sub={endingSoon.length ? endingSoon.slice(0, 2).map((p) => p.code).join(', ') + (endingSoon.length > 2 ? '…' : '') : 'Nothing expiring soon'}
        />
        <KpiCard label="Monthly value" value={fmtCurrency(monthlyTotal, 'IDR', { compact: true })} icon={<TrendingUp />} accent="purple" sub="running contracts, before PPN" />
      </div>

      <DataTable
        data={visible}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.code} — ${r.name}`}
        entityLabel="project"
        storageKey="projects"
        exportName="tata-gemilang-projects"
        searchText={(r) =>
          [r.code, r.name, r.contractNo, r.projectManager, r.siteSupervisor, clientOf(r)?.legalName, clientOf(r)?.brandName, buildingOf(r)?.name, buildingOf(r)?.city]
            .filter(Boolean)
            .join(' ')
        }
        initialSort={{ key: 'code', dir: 'asc' }}
        onRowClick={(r) => nav(`/projects/${r.id}`)}
        rowTone={(r) => (isStaffedProject(r) && fulfilment(r).pct < 90 ? 'bg-danger-soft/20' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: PROJECT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'client', label: 'Client', values: client, onChange: setClient,
            options: clients.map((c) => ({ value: c.id, label: c.brandName || c.legalName })),
            match: (r, v) => v.includes(r.clientId),
          },
          {
            key: 'service', label: 'Service line', values: service, onChange: setService,
            options: SERVICE_TYPES.map((s) => ({ value: s.value, label: s.label })),
            match: (r, v) => serviceTypesOf(r, positions).some((t) => v.includes(t)),
          },
          {
            key: 'period', label: 'Contract period', values: period, onChange: setPeriod,
            options: [
              { value: 'RUNNING', label: 'Running' },
              { value: 'ENDING_SOON', label: 'Ending within 60 days' },
              { value: 'NOT_STARTED', label: 'Not started' },
              { value: 'EXPIRED', label: 'Past its end date' },
            ],
            match: (r, v) => v.includes(periodState(r)),
          },
        ]}
        toolbarLeft={
          <Button variant={gapOnly ? 'subtle' : 'secondary'} size="md" onClick={() => setGapOnly((v) => !v)}>
            <Users /> {gapOnly ? 'Showing gaps only' : 'Gaps only'}
          </Button>
        }
        onDelete={(ids) => {
          removeProjects(ids)
          toast.push({ tone: 'success', title: `${ids.length} project${ids.length === 1 ? '' : 's'} deleted` })
        }}
        cascadeWarning={(rows) => {
          const lines = rows.reduce((a, r) => a + r.requirements.length, 0)
          const people = rows.reduce((a, r) => a + requiredHeadcount(r), 0)
          return lines ? [`${lines} manpower lines covering ${people} contracted personnel are deleted with them`] : []
        }}
        rowActions={(r) => (
          <>
            <Tooltip content="Open record">
              <Button variant="ghost" size="iconXs" onClick={() => nav(`/projects/${r.id}`)}>
                <Eye />
              </Button>
            </Tooltip>
            <Tooltip content="Edit">
              <Button
                variant="ghost"
                size="iconXs"
                onClick={() => {
                  setEditing(r)
                  setFormOpen(true)
                }}
              >
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
          const required = rows.reduce((a, r) => a + requiredHeadcount(r), 0)
          const deployed = rows.reduce((a, r) => a + deployedHeadcount(r), 0)
          return (
            <span className="tnum">
              {deployed.toLocaleString('en-US')} / {required.toLocaleString('en-US')} personnel ·{' '}
              {fmtCurrency(rows.reduce((a, r) => a + monthlyValue(r), 0), 'IDR', { compact: true })} per month in this view
            </span>
          )
        }}
        emptyTitle="No projects yet"
        emptyDescription="Create a project against one of your clients' buildings."
        emptyAction={
          <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
            <Plus /> New project
          </Button>
        }
      />

      <ProjectForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="project"
        items={deleting ? [`${deleting.code} — ${deleting.name}`] : []}
        cascade={deleting ? [`${deleting.requirements.length} manpower lines covering ${requiredHeadcount(deleting)} personnel`] : []}
        onConfirm={() => {
          if (deleting) {
            removeProjects([deleting.id])
            toast.push({ tone: 'success', title: 'Project deleted', description: deleting.code })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
