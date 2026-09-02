import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Boxes, Building2, CalendarRange, CheckCircle2, ClipboardList, PauseCircle, Pencil,
  PlayCircle, SendHorizontal, Users, Wallet,
} from 'lucide-react'
import type { Project } from '@/data/types'
import { serviceLabel, shiftHours, shiftLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { MetaRow, StatusBadge } from '@/components/shared/status'
import { FulfilmentBar } from '@/components/shared/FulfilmentBar'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { ProjectForm } from './ProjectForm'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import {
  contractMonths, contractValue, daysUntil, fulfilment, isLiveProject, isStaffedProject, itemTotals,
  monthlyMargin, periodProgress, periodState, projectIssueDemand, requiredHeadcount,
} from '@/lib/domain'

/** The status moves an operations manager actually makes, in the order they make them. */
function nextStatuses(status: Project['status']): { to: Project['status']; label: string; icon: React.ReactNode }[] {
  switch (status) {
    case 'DRAFT':
      return [{ to: 'PENDING_APPROVAL', label: 'Submit for approval', icon: <SendHorizontal /> }]
    case 'PENDING_APPROVAL':
      return [
        { to: 'ACTIVE', label: 'Approve and activate', icon: <CheckCircle2 /> },
        { to: 'DRAFT', label: 'Send back to draft', icon: <ArrowLeft /> },
      ]
    case 'ACTIVE':
      return [
        { to: 'SUSPENDED', label: 'Suspend', icon: <PauseCircle /> },
        { to: 'COMPLETED', label: 'Mark completed', icon: <CheckCircle2 /> },
        { to: 'TERMINATED', label: 'Terminate early', icon: <PauseCircle /> },
      ]
    case 'SUSPENDED':
      return [
        { to: 'ACTIVE', label: 'Resume', icon: <PlayCircle /> },
        { to: 'TERMINATED', label: 'Terminate', icon: <PauseCircle /> },
      ]
    default:
      return []
  }
}

export function ProjectDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { projects, clients, buildings, positions, items, stock, setProjectStatus } = useErp()
  const [tab, setTab] = React.useState<'overview' | 'manpower' | 'inventory'>('overview')
  const [editOpen, setEditOpen] = React.useState(false)

  const project = projects.find((p) => p.id === id)

  if (!project) {
    return (
      <EmptyState
        icon={<ClipboardList />}
        title="This project is no longer in the register"
        description="It may have been deleted. Open the project list to find another."
        action={
          <Button variant="primary" size="sm" onClick={() => nav('/projects')}>
            Back to projects
          </Button>
        }
      />
    )
  }

  const client = clients.find((c) => c.id === project.clientId)
  const building = buildings.find((b) => b.id === project.buildingId)
  const f = fulfilment(project)
  const margin = monthlyMargin(project)
  const months = contractMonths(project)
  const state = periodState(project)
  const daysLeft = daysUntil(project.periodEnd)
  /* Only a running contract owes posts today, so only a running one can be short. */
  const staffed = isStaffedProject(project)
  const closed = project.status === 'COMPLETED' || project.status === 'TERMINATED'

  /* Manpower rolled up by shift, which is how a coordinator plans a day. */
  const byShift = ['PAGI', 'SIANG', 'MALAM', 'NON_SHIFT'].map((shift) => {
    const lines = project.requirements.filter((r) => r.shift === shift)
    return {
      shift,
      lines,
      required: lines.reduce((a, r) => a + r.headcount, 0),
      deployed: lines.reduce((a, r) => a + Math.min(r.deployed, r.headcount), 0),
    }
  }).filter((s) => s.lines.length > 0)

  /* What the contracted headcount will draw from the warehouse. */
  const demand = Array.from(projectIssueDemand(project, positions).entries())
    .map(([sku, qty]) => {
      const item = items.find((i) => i.sku === sku)
      const totals = item ? itemTotals(item.id, stock) : null
      return { sku, qty, item, available: totals?.available ?? 0 }
    })
    .sort((a, b) => (a.item?.name ?? a.sku).localeCompare(b.item?.name ?? b.sku))
  const shortages = demand.filter((d) => d.available < d.qty)

  return (
    <>
      <PageHeader
        eyebrow={
          <Link to="/projects" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-fg-muted hover:text-fg">
            <ArrowLeft className="size-3.5" /> Projects
          </Link>
        }
        title={project.name}
        description={
          client && building
            ? `${client.brandName || client.legalName} · ${building.name}, ${building.city}`
            : 'A referenced client or building is missing from the register.'
        }
        meta={
          <>
            <StatusBadge value={project.status} />
            {isLiveProject(project) && state !== 'RUNNING' && <StatusBadge value={state} />}
            <span className="font-mono text-[12px] text-fg-subtle">{project.code}</span>
            <span className="text-[12.5px] text-fg-muted">Contract {project.contractNo || '—'}</span>
            <span className="text-[12.5px] text-fg-muted">
              {fmtDate(project.periodStart)} – {fmtDate(project.periodEnd)} · {months} months
            </span>
          </>
        }
        actions={
          <>
            {nextStatuses(project.status).map((action) => (
              <Button
                key={action.to}
                variant={action.to === 'ACTIVE' ? 'primary' : 'secondary'}
                onClick={() => {
                  setProjectStatus(project.id, action.to)
                  toast.push({ tone: 'success', title: `${project.code} is now ${action.to.replace(/_/g, ' ').toLowerCase()}` })
                }}
              >
                {action.icon} {action.label}
              </Button>
            ))}
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Fulfilment"
          value={staffed ? `${f.pct}%` : closed ? 'Closed' : 'Not started'}
          icon={<Users />}
          accent={!staffed ? 'neutral' : f.gap === 0 ? 'success' : f.pct >= 90 ? 'warning' : 'danger'}
          sub={
            !staffed
              ? `${f.required} posts contracted, none deployed under this status`
              : f.gap === 0
                ? `All ${f.required} posts filled`
                : `${f.gap} post${f.gap === 1 ? '' : 's'} unfilled`
          }
        />
        <KpiCard
          label="Contract period"
          value={closed ? 'Ended' : daysLeft < 0 ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d left`}
          icon={<CalendarRange />}
          accent={closed ? 'neutral' : daysLeft < 0 ? 'danger' : daysLeft <= 60 ? 'warning' : 'primary'}
          sub={
            closed
              ? `Closed on ${fmtDate(project.periodEnd)}`
              : `${periodProgress(project)}% elapsed · ${project.autoRenew ? 'auto-renews' : 'manual renewal'}`
          }
        />
        <KpiCard label="Monthly value" value={fmtCurrency(margin.value, 'IDR', { compact: true })} icon={<Wallet />} accent="accent" sub={`${fmtCurrency(contractValue(project), 'IDR', { compact: true })} over the period`} />
        <KpiCard
          label="Monthly margin"
          value={fmtCurrency(margin.margin, 'IDR', { compact: true })}
          icon={<Wallet />}
          accent={margin.pct >= 12 ? 'success' : 'warning'}
          sub={`${margin.pct.toFixed(1)}% of billed value · fee ${project.managementFeePct}%`}
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: 'overview', label: 'Overview' },
          { value: 'manpower', label: 'Manpower', count: project.requirements.length },
          { value: 'inventory', label: 'Inventory demand', count: demand.length, badge: shortages.length ? <Badge tone="warning" size="sm">{shortages.length} short</Badge> : undefined },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader title="Contract" icon={<CalendarRange />} />
            <CardBody className="divide-y divide-border py-1">
              <MetaRow label="Contract number">
                <span className="font-mono">{project.contractNo || '—'}</span>
              </MetaRow>
              <MetaRow label="Period">
                {fmtDate(project.periodStart)} – {fmtDate(project.periodEnd)}
              </MetaRow>
              <MetaRow label="Duration">{months} months</MetaRow>
              <MetaRow label="Renewal">{project.autoRenew ? `Automatic · ${project.renewalNoticeDays} days notice` : `Manual · ${project.renewalNoticeDays} days notice`}</MetaRow>
              <MetaRow label="Payment term">Net {project.paymentTermDays} days</MetaRow>
              <MetaRow label="Project manager">{project.projectManager}</MetaRow>
              <MetaRow label="Site supervisor">{project.siteSupervisor || '—'}</MetaRow>
              <div className="pt-3">
                <div className="mb-1.5 flex items-center justify-between text-[11.5px] text-fg-muted">
                  <span>Period elapsed</span>
                  <span className="tnum">{periodProgress(project)}%</span>
                </div>
                <Progress value={periodProgress(project)} tone={daysLeft <= 60 ? 'warning' : 'primary'} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Building served" icon={<Building2 />} description="One project, one building." />
            {building ? (
              <CardBody className="divide-y divide-border py-1">
                <MetaRow label="Building">{building.name}</MetaRow>
                <MetaRow label="Code">
                  <span className="font-mono">{building.code}</span>
                </MetaRow>
                <MetaRow label="Address">
                  <span className="block max-w-[220px] text-right">{building.address}</span>
                </MetaRow>
                <MetaRow label="City">{building.city}, {building.province}</MetaRow>
                <MetaRow label="Size">{fmtNumber(building.areaSqm)} m² · {building.floors} floors</MetaRow>
                <MetaRow label="Site contact">{building.picName}</MetaRow>
                <MetaRow label="Phone">{building.picPhone}</MetaRow>
                {building.accessNote && (
                  <div className="pt-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Access notes</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">{building.accessNote}</p>
                  </div>
                )}
              </CardBody>
            ) : (
              <CardBody>
                <p className="text-[12.5px] text-danger">The building this project serves is no longer in the register.</p>
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader title="Coverage by shift" icon={<Users />} description="Where the gap actually sits." />
            <CardBody className="space-y-3.5">
              {byShift.map((s) => (
                <div key={s.shift}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] font-medium text-fg">
                      {shiftLabel(s.shift as 'PAGI')} <span className="text-fg-subtle">{shiftHours(s.shift as 'PAGI')}</span>
                    </span>
                    <span className="tnum text-[11.5px] text-fg-muted">{s.lines.length} line{s.lines.length === 1 ? '' : 's'}</span>
                  </div>
                  {staffed ? (
                    <FulfilmentBar deployed={s.deployed} required={s.required} width="w-full" />
                  ) : (
                    <p className="tnum text-[12px] text-fg-subtle">{s.required} posts contracted</p>
                  )}
                </div>
              ))}
              {project.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Notes</p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">{project.notes}</p>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'manpower' && (
        <Card>
          <CardHeader
            title="Manpower requirement"
            icon={<Users />}
            description="What the contract calls for, and how many of those posts are filled today."
            actions={
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil /> Edit lines
              </Button>
            }
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  {['Position', 'Service', 'Shift', 'Days', 'Needed', 'Deployed', 'Fulfilment', 'Bill / person', 'Line value'].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {project.requirements.map((line) => {
                  const position = positions.find((p) => p.id === line.positionId)
                  const gap = Math.max(0, line.headcount - line.deployed)
                  return (
                    <tr key={line.id} className={gap > 0 ? 'bg-warning-soft/25' : undefined}>
                      <td className="border-b border-border px-3 py-2.5">
                        <p className="font-medium text-fg">{position?.name ?? 'Position removed'}</p>
                        {position && <p className="text-[11px] text-fg-subtle">{position.code} · {position.grade.toLowerCase()}</p>}
                        {line.note && <p className="mt-1 max-w-[320px] text-[11.5px] leading-snug text-warning-soft-fg">{line.note}</p>}
                      </td>
                      <td className="border-b border-border px-3 py-2.5">
                        {position && <Badge tone="outline" size="sm">{serviceLabel(position.serviceType)}</Badge>}
                      </td>
                      <td className="whitespace-nowrap border-b border-border px-3 py-2.5">
                        <StatusBadge value={line.shift} size="sm" />
                        <span className="ml-1.5 text-[11px] text-fg-subtle">{shiftHours(line.shift)}</span>
                      </td>
                      <td className="tnum border-b border-border px-3 py-2.5 text-fg-muted">{line.workDaysPerWeek}/wk</td>
                      <td className="tnum border-b border-border px-3 py-2.5 font-medium text-fg">{line.headcount}</td>
                      <td className="tnum border-b border-border px-3 py-2.5">
                        <span className={gap > 0 ? 'font-medium text-warning-soft-fg' : 'text-fg'}>{line.deployed}</span>
                      </td>
                      <td className="border-b border-border px-3 py-2.5">
                        <FulfilmentBar deployed={line.deployed} required={line.headcount} width="w-[112px]" size="sm" />
                      </td>
                      <td className="tnum whitespace-nowrap border-b border-border px-3 py-2.5 text-right text-fg-muted">
                        {fmtCurrency(line.billRate, 'IDR', { compact: true })}
                      </td>
                      <td className="tnum whitespace-nowrap border-b border-border px-3 py-2.5 text-right font-medium text-fg">
                        {fmtCurrency(line.billRate * line.headcount, 'IDR', { compact: true })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="px-3 py-2.5 text-[12px] font-semibold text-fg-muted">
                    {project.requirements.length} lines
                  </td>
                  <td className="tnum px-3 py-2.5 font-semibold text-fg">{f.required}</td>
                  <td className="tnum px-3 py-2.5 font-semibold text-fg">{f.deployed}</td>
                  <td className="px-3 py-2.5">
                    <FulfilmentBar deployed={f.deployed} required={f.required} width="w-[112px]" size="sm" />
                  </td>
                  <td />
                  <td className="tnum whitespace-nowrap px-3 py-2.5 text-right font-semibold text-fg">
                    {fmtCurrency(margin.value, 'IDR', { compact: true })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {project.requirements.length === 0 && (
            <EmptyState icon={<Users />} title="No manpower lines" description="Add the positions this contract has to keep on site." />
          )}
        </Card>
      )}

      {tab === 'inventory' && (
        <Card>
          <CardHeader
            title="Inventory demand"
            icon={<Boxes />}
            description={`Standard issue for ${requiredHeadcount(project)} contracted personnel, checked against what is available across every warehouse.`}
            actions={
              shortages.length > 0 ? (
                <Badge tone="warning" size="md">{shortages.length} item{shortages.length === 1 ? '' : 's'} short</Badge>
              ) : (
                <Badge tone="success" size="md">Fully covered</Badge>
              )
            }
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  {['SKU', 'Item', 'Category', 'Required', 'Available', 'Cover', 'Value at standard cost'].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {demand.map((d) => {
                  const short = d.available < d.qty
                  return (
                    <tr key={d.sku} className={short ? 'bg-warning-soft/25' : undefined}>
                      <td className="border-b border-border px-3 py-2.5 font-mono text-[12px] text-fg-muted">{d.sku}</td>
                      <td className="border-b border-border px-3 py-2.5">
                        <p className="font-medium text-fg">{d.item?.name ?? 'Not in the item master'}</p>
                        {d.item?.brand && <p className="text-[11px] text-fg-subtle">{d.item.brand}</p>}
                      </td>
                      <td className="border-b border-border px-3 py-2.5 text-[12px] text-fg-muted">
                        {d.item ? d.item.category.replace(/_/g, ' ').toLowerCase() : '—'}
                      </td>
                      <td className="tnum border-b border-border px-3 py-2.5 font-medium text-fg">
                        {fmtNumber(d.qty)} {d.item?.uom ?? ''}
                      </td>
                      <td className="tnum border-b border-border px-3 py-2.5 text-fg-muted">{fmtNumber(d.available)}</td>
                      <td className="border-b border-border px-3 py-2.5">
                        {short ? (
                          <Tooltip content={`Short by ${fmtNumber(d.qty - d.available)} ${d.item?.uom ?? ''}`}>
                            <span>
                              <Badge tone="warning" size="sm">Short {fmtNumber(d.qty - d.available)}</Badge>
                            </span>
                          </Tooltip>
                        ) : (
                          <Badge tone="success" size="sm">Covered</Badge>
                        )}
                      </td>
                      <td className="tnum whitespace-nowrap border-b border-border px-3 py-2.5 text-right text-fg-muted">
                        {d.item ? fmtCurrency(d.item.standardCost * d.qty, 'IDR', { compact: true }) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {demand.length === 0 && (
            <EmptyState
              icon={<Boxes />}
              title="No standard issue defined"
              description="The positions on this project do not list any standard issue items yet. Set them on the position master."
              action={
                <Button variant="secondary" size="sm" onClick={() => nav('/positions')}>
                  Open positions
                </Button>
              }
            />
          )}
          <div className="border-t border-border bg-surface-sunken/60 px-4 py-3 text-[12px] text-fg-muted">
            Availability counts stock on hand less what is already reserved, across{' '}
            {new Set(stock.map((s) => s.warehouseId)).size} warehouses. Reserving against this project is a warehouse
            action, not a project one — see{' '}
            <Link to="/inventory/stock" className="font-medium text-primary hover:underline">
              warehouse stock
            </Link>
            . Total of {demand.reduce((a, d) => a + (d.item ? d.item.standardCost * d.qty : 0), 0).toLocaleString('en-US')} IDR at standard cost.
          </div>
        </Card>
      )}

      <ProjectForm open={editOpen} onOpenChange={setEditOpen} initial={project} />
    </>
  )
}
