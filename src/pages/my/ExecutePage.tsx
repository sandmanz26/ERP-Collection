import { Link } from 'react-router-dom'
import { ArrowRight, Container as ContainerIcon, PackageCheck, Radio, Ship } from 'lucide-react'
import { useOperator } from './useOperator'
import { ActionRow, NothingHere, PhaseIntro } from './shared'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { checkStuffing } from '@/lib/stuffing'
import { stuffingStatusMeta } from '@/data/reference'
import { fmtDate, fmtNumber, pluralDays } from '@/lib/format'
import { utilisation } from '@/lib/shipping'

export function ExecutePage() {
  const { store, board } = useOperator()
  const jobs = board.byPhase.find((p) => p.phase.key === 'EXECUTION')?.jobs ?? []

  return (
    <>
      <PhaseIntro phase="EXECUTION" count={jobs.length} />

      {jobs.length === 0 && (
        <NothingHere
          title="Nothing to run right now"
          description="Jobs land here once you accept them and stay until the vessel sails. Anything already departed is under Get the papers right or Close it out."
        />
      )}

      <div className="space-y-4">
        {jobs.map((b) => {
          const p = b.project
          const containers = store.containers.filter((c) => c.projectId === p.id)
          const stuffings = store.stuffingJobs.filter((s) => s.projectId === p.id)
          const gatedIn = containers.filter((c) => c.gateInDate).length
          const withVgm = containers.filter((c) => c.vgmKg).length

          return (
            <Card key={p.id} className={b.blocking ? 'border-danger/35' : undefined}>
              <CardHeader
                icon={<Ship />}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {p.name}
                    <Badge tone="outline" size="sm">{p.code}</Badge>
                  </span>
                }
                description={`${p.polName} → ${p.podName}${p.vessel ? ` · ${p.vessel} ${p.voyage ?? ''}` : ''}${
                  p.etd ? ` · ETD ${fmtDate(p.etd)}` : ''
                }`}
                actions={
                  <Button variant="secondary" size="sm" asChild>
                    <Link to={`/projects/${p.id}`}>
                      Open the job <ArrowRight />
                    </Link>
                  </Button>
                }
              />
              <CardBody className="space-y-4">
                {/* -------- where the boxes are -------- */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric
                    icon={<ContainerIcon />}
                    label="Containers planned"
                    value={`${containers.length}`}
                    sub={
                      containers.length
                        ? `${fmtNumber(containers.reduce((a, c) => a + utilisation(c.type, c.items, c.tareKg).usedCbm, 0), 1)} m³ loaded`
                        : 'nothing planned yet'
                    }
                    tone={containers.length ? 'neutral' : 'danger'}
                  />
                  <Metric
                    icon={<PackageCheck />}
                    label="VGM submitted"
                    value={`${withVgm}/${containers.length || 0}`}
                    sub={withVgm < containers.length ? 'no VGM, no loading' : 'every unit cleared'}
                    tone={containers.length && withVgm < containers.length ? 'warning' : 'success'}
                  />
                  <Metric
                    icon={<Radio />}
                    label="Gated in"
                    value={`${gatedIn}/${containers.length || 0}`}
                    sub={
                      p.gateInCutoff
                        ? `cut-off ${fmtDate(p.gateInCutoff)}`
                        : 'no cut-off recorded'
                    }
                    tone={containers.length && gatedIn < containers.length ? 'warning' : 'success'}
                  />
                </div>

                {/* -------- the stuffing slots -------- */}
                {stuffings.length > 0 && (
                  <div className="rounded-lg border border-border">
                    <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
                      <p className="text-[12.5px] font-semibold text-fg">Stuffing slots</p>
                      <Button variant="ghost" size="xs" asChild>
                        <Link to={`/projects/${p.id}?tab=stuffing`}>Manage</Link>
                      </Button>
                    </div>
                    <div className="divide-y divide-border">
                      {stuffings.map((s) => {
                        const check = checkStuffing(s)
                        const meta = stuffingStatusMeta(s.status)
                        return (
                          <div key={s.id} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
                            <span className="w-[86px] shrink-0">
                              <span className="tnum block text-[12px] font-medium text-fg">{fmtDate(s.stuffingDate)}</span>
                              <span className="block text-[10.5px] text-fg-subtle">{s.shift.toLowerCase()}</span>
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12.5px] text-fg">{s.locationName}</p>
                              <p className="truncate text-[11px] text-fg-muted">
                                {s.supervisor} · {s.labourCount} labour · {s.polName}
                              </p>
                              {check.blockers[0] && (
                                <p className="mt-1 text-[11.5px] leading-relaxed text-danger">{check.blockers[0]}</p>
                              )}
                            </div>
                            <Tooltip content={check.slackDays !== null ? `Gate-in cut-off ${s.gateInCutoff ? fmtDate(s.gateInCutoff) : 'not set'}` : ''}>
                              <span
                                className={`tnum shrink-0 text-[11.5px] ${
                                  check.afterCutoff ? 'font-semibold text-danger' : 'text-fg-subtle'
                                }`}
                              >
                                {check.slackDays === null
                                  ? '—'
                                  : check.afterCutoff
                                    ? `${Math.abs(check.slackDays)} d late`
                                    : `${pluralDays(check.slackDays)} slack`}
                              </span>
                            </Tooltip>
                            <Badge tone={(meta?.tone ?? 'neutral') as never} size="sm" dot className="shrink-0">
                              {meta?.label}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* -------- what to do -------- */}
                {b.actions.length > 0 ? (
                  <div className="divide-y divide-border border-t border-border">
                    {b.actions.map((a) => (
                      <ActionRow key={a.id} action={a} />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success-soft px-3.5 py-2.5">
                    <Progress value={100} tone="success" className="w-16" />
                    <p className="text-[12.5px] text-success-soft-fg">
                      Nothing outstanding on this job. Keep an eye on the cut-off and let it sail.
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          )
        })}
      </div>
    </>
  )
}

function Metric({
  icon, label, value, sub, tone,
}: { icon: React.ReactNode; label: string; value: string; sub: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const tones = {
    neutral: 'bg-bg-muted text-fg-muted',
    success: 'bg-success-soft text-success-soft-fg',
    warning: 'bg-warning-soft text-warning-soft-fg',
    danger: 'bg-danger-soft text-danger-soft-fg',
  }
  return (
    <div className="rounded-lg border border-border bg-surface-sunken/60 p-3">
      <div className="flex items-center gap-2">
        <span className={`grid size-6 place-items-center rounded ${tones[tone]} [&_svg]:size-3.5`}>{icon}</span>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{label}</p>
      </div>
      <p className="tnum mt-1.5 text-[18px] font-semibold leading-none text-fg">{value}</p>
      <p className="mt-1 text-[11px] text-fg-muted">{sub}</p>
    </div>
  )
}
