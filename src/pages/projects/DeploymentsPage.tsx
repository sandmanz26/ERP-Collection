import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Eye, MapPinned, UserCheck, Users } from 'lucide-react'
import { PROJECT_STATUSES, SERVICE_TYPES, SHIFTS, serviceLabel, shiftHours } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { FulfilmentBar } from '@/components/shared/FulfilmentBar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { useCan } from '@/lib/access'
import { fmtCurrency } from '@/lib/format'
import { deploymentRows, isStaffedProject } from '@/lib/domain'
import type { DeploymentRow } from '@/lib/domain'

/**
 * Every manpower line in the company, flattened. The project record answers
 * "is this contract staffed"; this register answers "where are all the gaps,
 * and which position do we need to recruit for first".
 */
export function DeploymentsPage() {
  const nav = useNavigate()
  const can = useCan()
  const { projects, clients, buildings, positions } = useErp()
  const [service, setService] = React.useState<string[]>([])
  const [shift, setShift] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<string[]>([])
  const [client, setClient] = React.useState<string[]>([])
  const [gapOnly, setGapOnly] = React.useState(false)

  const all = React.useMemo(
    () => deploymentRows(projects, clients, buildings, positions),
    [projects, clients, buildings, positions],
  )
  const liveRows = all.filter((r) => isStaffedProject(r.project))
  const rows = gapOnly ? all.filter((r) => r.requirement.headcount > r.requirement.deployed && isStaffedProject(r.project)) : all

  const required = liveRows.reduce((a, r) => a + r.requirement.headcount, 0)
  const deployed = liveRows.reduce((a, r) => a + Math.min(r.requirement.deployed, r.requirement.headcount), 0)
  const openPosts = liveRows.filter((r) => r.requirement.deployed < r.requirement.headcount)

  /* Which position is costing the most empty posts — the recruiter's queue. */
  const worstPosition = React.useMemo(() => {
    const map = new Map<string, number>()
    openPosts.forEach((r) => {
      const key = r.position?.name ?? 'Unknown position'
      map.set(key, (map.get(key) ?? 0) + (r.requirement.headcount - r.requirement.deployed))
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0]
  }, [openPosts])

  const columns: Column<DeploymentRow>[] = [
    {
      key: 'project', header: 'Project', width: 'w-[190px] max-w-[190px]', pinned: true, sortable: true,
      sortValue: (r) => r.project.code, exportValue: (r) => r.project.code,
      cell: (r) => (
        <div className="min-w-0">
          <Link
            to={`/projects/${r.project.id}`}
            onClick={(e) => e.stopPropagation()}
            className="block truncate font-mono text-[12px] font-medium text-primary hover:underline"
          >
            {r.project.code}
          </Link>
          <p className="truncate text-[11.5px] text-fg-muted">{r.project.name}</p>
        </div>
      ),
    },
    {
      key: 'client', header: 'Client', width: 'w-[140px] max-w-[140px]', sortable: true,
      sortValue: (r) => r.client?.legalName ?? '', exportValue: (r) => r.client?.legalName ?? '',
      cell: (r) => <p className="truncate text-[12.5px] text-fg">{r.client?.brandName ?? r.client?.legalName ?? '—'}</p>,
    },
    {
      key: 'building', header: 'Building', width: 'w-[160px] max-w-[160px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.building?.name ?? '', exportValue: (r) => r.building?.name ?? '',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg">{r.building?.name ?? '—'}</p>
          <p className="truncate text-[11px] text-fg-subtle">{r.building?.city}</p>
        </div>
      ),
    },
    {
      key: 'position', header: 'Position', width: 'w-[170px] max-w-[170px]', sortable: true,
      sortValue: (r) => r.position?.name ?? '', exportValue: (r) => r.position?.name ?? '',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.position?.name ?? 'Position removed'}</p>
          <p className="truncate text-[11px] text-fg-subtle">{r.position?.code}</p>
        </div>
      ),
    },
    {
      key: 'service', header: 'Service', width: 'w-[152px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.position?.serviceType ?? '', exportValue: (r) => (r.position ? serviceLabel(r.position.serviceType) : ''),
      cell: (r) => (r.position ? <Badge tone="outline" size="sm">{serviceLabel(r.position.serviceType)}</Badge> : null),
    },
    {
      key: 'shift', header: 'Shift', width: 'w-[132px]', sortable: true,
      sortValue: (r) => ({ PAGI: 0, SIANG: 1, MALAM: 2, NON_SHIFT: 3 })[r.requirement.shift],
      exportValue: (r) => r.requirement.shift,
      cell: (r) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge value={r.requirement.shift} size="sm" />
          <span className="text-[11px] text-fg-subtle">{shiftHours(r.requirement.shift)}</span>
        </div>
      ),
    },
    {
      key: 'needed', header: 'Needed', width: 'w-[92px]', align: 'right', sortable: true,
      sortValue: (r) => r.requirement.headcount, exportValue: (r) => r.requirement.headcount,
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{r.requirement.headcount}</span>,
    },
    {
      key: 'deployed', header: 'Deployed', width: 'w-[98px]', align: 'right', sortable: true,
      sortValue: (r) => r.requirement.deployed, exportValue: (r) => r.requirement.deployed,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{r.requirement.deployed}</span>,
    },
    {
      key: 'gap', header: 'Gap', width: 'w-[84px]', align: 'right', sortable: true,
      sortValue: (r) => (isStaffedProject(r.project) ? r.requirement.headcount - r.requirement.deployed : -1),
      exportValue: (r) => (isStaffedProject(r.project) ? Math.max(0, r.requirement.headcount - r.requirement.deployed) : 0),
      cell: (r) => {
        /* Only a contract that is running today can be short of people. */
        if (!isStaffedProject(r.project)) return <span className="text-[12px] text-fg-subtle">n/a</span>
        const gap = r.requirement.headcount - r.requirement.deployed
        if (gap <= 0) return <span className="text-[12.5px] text-success">—</span>
        return (
          <span className="tnum inline-flex items-center gap-1 text-[12.5px] font-semibold text-danger">
            <AlertTriangle className="size-3" />
            {gap}
          </span>
        )
      },
    },
    {
      key: 'fulfilment', header: 'Fulfilment', width: 'w-[142px]', sortable: true,
      sortValue: (r) => (isStaffedProject(r.project) && r.requirement.headcount ? r.requirement.deployed / r.requirement.headcount : 2),
      exportValue: (r) => `${Math.round((r.requirement.deployed / Math.max(1, r.requirement.headcount)) * 100)}%`,
      cell: (r) =>
        isStaffedProject(r.project) ? (
          <FulfilmentBar deployed={r.requirement.deployed} required={r.requirement.headcount} width="w-[118px]" showNumbers={false} />
        ) : (
          <span className="text-[12px] text-fg-subtle">{r.project.status.replace(/_/g, ' ').toLowerCase()}</span>
        ),
    },
    {
      key: 'schedule', header: 'Schedule', width: 'w-[124px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.requirement.workDaysPerWeek,
      exportValue: (r) => `${r.requirement.workDaysPerWeek}d × ${r.requirement.hoursPerShift}h`,
      cell: (r) => (
        <span className="tnum text-[12px] text-fg-muted">
          {r.requirement.workDaysPerWeek}d × {r.requirement.hoursPerShift}h
        </span>
      ),
    },
    {
      key: 'billRate', header: 'Bill / person', width: 'w-[136px]', align: 'right', sortable: true,
      sortValue: (r) => r.requirement.billRate, exportValue: (r) => r.requirement.billRate,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtCurrency(r.requirement.billRate, 'IDR', { compact: true })}</span>,
    },
    {
      key: 'lineValue', header: 'Line value', width: 'w-[136px]', align: 'right', sortable: true,
      sortValue: (r) => r.requirement.billRate * r.requirement.headcount,
      exportValue: (r) => r.requirement.billRate * r.requirement.headcount,
      cell: (r) => (
        <span className="tnum text-[12.5px] font-medium text-fg">
          {fmtCurrency(r.requirement.billRate * r.requirement.headcount, 'IDR', { compact: true })}
        </span>
      ),
    },
    {
      key: 'projectStatus', header: 'Project status', width: 'w-[144px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.project.status, exportValue: (r) => r.project.status,
      cell: (r) => <StatusBadge value={r.project.status} size="sm" />,
    },
    {
      key: 'note', header: 'Note', width: 'w-[220px] max-w-[220px]', sortable: false, defaultHidden: true,
      exportValue: (r) => r.requirement.note ?? '',
      cell: (r) => <span className="text-[12px] leading-snug text-fg-muted">{r.requirement.note ?? '—'}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Deployments"
        description="Every manpower line in the company, across every project. Sort by gap to see who to recruit for first."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Manpower lines" value={all.length} icon={<MapPinned />} accent="primary" sub={`${liveRows.length} on running contracts`} />
        <KpiCard
          label="Deployed"
          value={deployed.toLocaleString('en-US')}
          icon={<UserCheck />}
          accent="success"
          sub={`of ${required.toLocaleString('en-US')} contracted posts`}
        />
        <KpiCard
          label="Open posts"
          value={required - deployed}
          icon={<AlertTriangle />}
          accent={required - deployed > 0 ? 'danger' : 'success'}
          sub={`${openPosts.length} line${openPosts.length === 1 ? '' : 's'} understaffed`}
          onClick={() => setGapOnly((v) => !v)}
        />
        <KpiCard
          label="Hardest to fill"
          value={worstPosition ? worstPosition[0] : '—'}
          icon={<Users />}
          accent="warning"
          sub={worstPosition ? `${worstPosition[1]} open posts across all sites` : 'Every post is filled'}
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.project.code} · ${r.position?.name ?? 'line'}`}
        entityLabel="deployment line"
        storageKey="deployments"
        allowExport={can('deployments.export')}
        exportName="tata-gemilang-deployments"
        searchText={(r) =>
          [r.project.code, r.project.name, r.client?.legalName, r.client?.brandName, r.building?.name, r.building?.city, r.position?.name, r.position?.code, r.requirement.note]
            .filter(Boolean)
            .join(' ')
        }
        initialSort={{ key: 'gap', dir: 'desc' }}
        onRowClick={(r) => nav(`/projects/${r.project.id}`)}
        rowTone={(r) => (r.requirement.deployed < r.requirement.headcount && isStaffedProject(r.project) ? 'bg-danger-soft/20' : undefined)}
        pageSize={50}
        compactByDefault
        filters={[
          {
            key: 'service', label: 'Service line', values: service, onChange: setService,
            options: SERVICE_TYPES.map((s) => ({ value: s.value, label: s.label })),
            match: (r, v) => !!r.position && v.includes(r.position.serviceType),
          },
          {
            key: 'shift', label: 'Shift', values: shift, onChange: setShift,
            options: SHIFTS.map((s) => ({ value: s.value, label: `${s.label} · ${s.hours}` })),
            match: (r, v) => v.includes(r.requirement.shift),
          },
          {
            key: 'client', label: 'Client', values: client, onChange: setClient,
            options: clients.map((c) => ({ value: c.id, label: c.brandName || c.legalName })),
            match: (r, v) => v.includes(r.project.clientId),
          },
          {
            key: 'status', label: 'Project status', values: status, onChange: setStatus,
            options: PROJECT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            match: (r, v) => v.includes(r.project.status),
          },
        ]}
        toolbarLeft={
          <Button variant={gapOnly ? 'subtle' : 'secondary'} size="md" onClick={() => setGapOnly((v) => !v)}>
            <AlertTriangle /> {gapOnly ? 'Showing open posts' : 'Open posts only'}
          </Button>
        }
        rowActions={(r) => (
          <Tooltip content="Open the project">
            <Button variant="ghost" size="iconXs" onClick={() => nav(`/projects/${r.project.id}`)}>
              <Eye />
            </Button>
          </Tooltip>
        )}
        footerSummary={(visible) => {
          const need = visible.reduce((a, r) => a + r.requirement.headcount, 0)
          const have = visible.reduce((a, r) => a + Math.min(r.requirement.deployed, r.requirement.headcount), 0)
          return (
            <span className="tnum">
              {have.toLocaleString('en-US')} / {need.toLocaleString('en-US')} personnel ·{' '}
              <span className={need - have > 0 ? 'font-semibold text-danger' : 'text-success'}>{need - have} open</span> in this view
            </span>
          )
        }}
        emptyTitle="No deployment lines"
        emptyDescription="Manpower lines appear here as soon as a project lists what it needs."
      />
    </>
  )
}
