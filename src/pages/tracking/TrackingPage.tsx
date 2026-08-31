import * as React from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, Anchor, Radio, Ship, Timer } from 'lucide-react'
import { useErp } from '@/store/useErp'
import { MILESTONES, countryFlag, milestoneMeta } from '@/data/reference'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState, Progress } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { MilestonesTable } from './MilestonesTable'
import { milestoneHealth, milestoneVariance } from '@/lib/analytics2'
import { fmtDate, fmtPercent, pluralDays, relativeDays } from '@/lib/format'
import { cn } from '@/lib/utils'

export function TrackingPage() {
  const { milestones, projects } = useErp()
  const [tab, setTab] = React.useState<'board' | 'events'>('board')

  const live = projects.filter((p) => p.status === 'ACTIVE' || p.status === 'ON_HOLD')
  const health = milestoneHealth(milestones)
  const overdue = milestones.filter((m) => !m.actualAt && (relativeDays(m.plannedAt) ?? 1) < 0)
  const bySource = ['CARRIER_EDI', 'PORTAL', 'AGENT', 'MANUAL'].map((s) => ({
    source: s,
    count: milestones.filter((m) => m.actualAt && m.source === s).length,
  }))
  const recordedTotal = bySource.reduce((a, s) => a + s.count, 0) || 1

  const board = live
    .map((p) => {
      const rows = milestones.filter((m) => m.projectId === p.id)
      const h = milestoneHealth(rows)
      const nextDue = h.next?.plannedAt ? relativeDays(h.next.plannedAt) : null
      return { project: p, health: h, nextDue, overdue: rows.filter((m) => !m.actualAt && (relativeDays(m.plannedAt) ?? 1) < 0).length }
    })
    .filter((r) => r.health.total > 0)
    .sort((a, b) => b.overdue - a.overdue || (a.nextDue ?? 999) - (b.nextDue ?? 999))

  return (
    <>
      <PageHeader
        title="Shipment Tracking"
        description="Every job against a standard milestone set modelled on the UN/EDIFACT IFTSTA status message — booked, stuffed, gated in, loaded, departed, arrived, discharged, delivered. Planned dates come from the job's own schedule, so punctuality is measured rather than claimed."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Milestone punctuality"
          value={fmtPercent(health.onTimePct, 0)}
          icon={<Timer />}
          accent={health.onTimePct >= 90 ? 'success' : health.onTimePct >= 75 ? 'warning' : 'danger'}
          sub={`${health.onTime} on time of ${health.onTime + health.late} recorded`}
        />
        <KpiCard label="Events recorded" value={health.recorded} icon={<Activity />} accent="primary" sub={`of ${health.total} planned across the book`} />
        <KpiCard label="Overdue events" value={overdue.length} icon={<AlertTriangle />} accent={overdue.length ? 'danger' : 'success'} sub={overdue.length ? 'Either unrecorded or genuinely slipping' : 'Nothing past its planned date'} />
        <KpiCard
          label="Average slip"
          value={`${health.avgSlipDays > 0 ? '+' : ''}${health.avgSlipDays.toFixed(1)} d`}
          icon={<Ship />}
          accent={health.avgSlipDays <= 0 ? 'success' : health.avgSlipDays <= 1 ? 'warning' : 'danger'}
          sub="Actual against plan, all recorded events"
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        variant="pill"
        className="mb-4"
        items={[
          { value: 'board', label: 'Live board', icon: <Ship />, count: board.length },
          { value: 'events', label: 'Event log', icon: <Radio />, count: milestones.length },
        ]}
      />

      {tab === 'board' && (
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader
              icon={<Ship />}
              title="Jobs in flight"
              description="Sorted by risk: overdue events first, then whatever is due soonest."
            />
            {board.length === 0 ? (
              <EmptyState icon={<Ship />} title="Nothing in flight" description="Active jobs with a milestone plan will appear here." />
            ) : (
              <div className="divide-y divide-border">
                {board.map(({ project: p, health: h, nextDue, overdue: late }) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}?tab=tracking`}
                    className="block px-4 py-3 transition-colors hover:bg-bg-muted/60"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="font-mono text-[11.5px] text-fg-muted">{p.code}</span>
                      <span className="text-[13px] font-medium text-fg">{p.name}</span>
                      {late > 0 && <Badge tone="danger" size="sm">{late} overdue</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-fg-muted">
                      <span className="flex items-center gap-1">
                        🇮🇩 {p.polName} <span className="text-fg-subtle">→</span> {countryFlag(p.destCountry)} {p.podName}
                      </span>
                      {p.vessel && <span className="text-fg-subtle">· {p.vessel} {p.voyage}</span>}
                    </div>

                    <div className="mt-2.5 flex items-center gap-3">
                      <MilestoneRail projectMilestones={h} />
                      <span className="tnum shrink-0 text-[11.5px] text-fg-muted">
                        {h.recorded}/{h.total}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]">
                      {h.next ? (
                        <span className="text-fg-muted">
                          <span className="text-fg-subtle">Next</span>{' '}
                          <span className="font-medium text-fg">{milestoneMeta(h.next.code)?.label}</span>
                          {nextDue !== null && (
                            <span className={cn('ml-1.5', nextDue < 0 ? 'font-medium text-danger' : nextDue <= 2 ? 'text-warning' : 'text-fg-muted')}>
                              {nextDue < 0 ? `overdue ${pluralDays(nextDue)}` : nextDue === 0 ? 'due today' : `due in ${pluralDays(nextDue)}`}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-success">Journey complete</span>
                      )}
                      {h.lastRecorded && (
                        <span className="text-fg-muted">
                          <span className="text-fg-subtle">Last</span> {milestoneMeta(h.lastRecorded.code)?.label} ·{' '}
                          {fmtDate(h.lastRecorded.actualAt)}
                        </span>
                      )}
                      <Badge tone={h.onTimePct >= 90 ? 'success' : h.onTimePct >= 75 ? 'warning' : 'danger'} size="sm">
                        {fmtPercent(h.onTimePct, 0)} on time
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader icon={<Radio />} title="Where events come from" description="Provenance decides how much a milestone is worth as evidence." />
              <CardBody className="space-y-3">
                {bySource.map((s) => (
                  <div key={s.source}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-[12.5px] text-fg">
                        {s.source === 'CARRIER_EDI' ? 'Carrier EDI (IFTSTA)' : s.source === 'PORTAL' ? 'Carrier portal' : s.source === 'AGENT' ? 'Overseas agent' : 'Keyed manually'}
                      </span>
                      <span className="tnum text-[12px] text-fg-muted">{((s.count / recordedTotal) * 100).toFixed(0)}%</span>
                    </div>
                    <Progress
                      value={(s.count / recordedTotal) * 100}
                      tone={s.source === 'CARRIER_EDI' ? 'success' : s.source === 'MANUAL' ? 'warning' : 'primary'}
                      size="sm"
                    />
                  </div>
                ))}
                <p className="pt-1 text-[11.5px] leading-relaxed text-fg-muted">
                  A carrier EDI feed is authoritative. Anything keyed by hand is a claim, and a shipper querying a service
                  credit will treat it that way.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader icon={<Anchor />} title="Punctuality by event" description="Which step in the journey actually slips." />
              <CardBody className="space-y-2">
                {MILESTONES.map((meta) => {
                  const rows = milestones.filter((m) => m.code === meta.code && m.actualAt)
                  if (!rows.length) return null
                  const variances = rows.map(milestoneVariance).filter((v): v is number => v !== null)
                  const onTime = variances.filter((v) => v <= 0).length
                  const pct = variances.length ? (onTime / variances.length) * 100 : 100
                  return (
                    <Tooltip key={meta.code} content={`${onTime} of ${variances.length} on time`}>
                      <div className="flex items-center gap-2.5">
                        <span className="w-[152px] shrink-0 truncate text-[11.5px] text-fg-muted">{meta.label}</span>
                        <Progress value={pct} tone={pct >= 90 ? 'success' : pct >= 70 ? 'warning' : 'danger'} size="sm" />
                        <span className="tnum w-9 shrink-0 text-right text-[11px] text-fg-muted">{pct.toFixed(0)}%</span>
                      </div>
                    </Tooltip>
                  )
                })}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {tab === 'events' && <MilestonesTable />}
    </>
  )
}

function MilestoneRail({ projectMilestones }: { projectMilestones: ReturnType<typeof milestoneHealth> }) {
  const { total, recorded, onTimePct } = projectMilestones
  return (
    <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-soft">
      <span
        className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-500', onTimePct >= 90 ? 'bg-success' : onTimePct >= 75 ? 'bg-primary' : 'bg-warning')}
        style={{ width: `${total ? (recorded / total) * 100 : 0}%` }}
      />
    </span>
  )
}
