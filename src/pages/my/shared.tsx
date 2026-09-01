import { Link } from 'react-router-dom'
import { ArrowRight, CircleCheck, Clock3, TriangleAlert } from 'lucide-react'
import type { JobBrief, NextAction, OperatorPhase } from '@/lib/operator'
import { phaseMeta } from '@/lib/operator'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/misc'
import { countryFlag, stageLabel } from '@/data/reference'
import { fmtDate, pluralDays } from '@/lib/format'

export const PHASE_TONE: Record<OperatorPhase, { chip: string; bar: 'primary' | 'accent' | 'success' }> = {
  INTAKE: { chip: 'bg-primary-soft text-primary-soft-fg', bar: 'primary' },
  EXECUTION: { chip: 'bg-accent-soft text-accent-soft-fg', bar: 'accent' },
  DOCUMENTS: { chip: 'bg-purple-soft text-purple-soft-fg', bar: 'accent' },
  CLOSING: { chip: 'bg-success-soft text-success-soft-fg', bar: 'success' },
}

const URGENCY: Record<NextAction['urgency'], { label: string; tone: 'danger' | 'warning' | 'neutral' }> = {
  BLOCKING: { label: 'Blocking', tone: 'danger' },
  DUE: { label: 'Due now', tone: 'warning' },
  NEXT: { label: 'Next up', tone: 'neutral' },
}

/** One thing to do, with the reason it matters said out loud. */
export function ActionRow({ action, compact }: { action: NextAction; compact?: boolean }) {
  const u = URGENCY[action.urgency]
  return (
    <div className={cn('flex flex-wrap items-start gap-3', compact ? 'py-2.5' : 'py-3.5')}>
      <span
        className={cn(
          'mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg [&_svg]:size-3.5',
          action.urgency === 'BLOCKING'
            ? 'bg-danger-soft text-danger-soft-fg'
            : action.urgency === 'DUE'
              ? 'bg-warning-soft text-warning-soft-fg'
              : 'bg-bg-muted text-fg-muted',
        )}
      >
        {action.urgency === 'BLOCKING' ? <TriangleAlert /> : <Clock3 />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-medium text-fg">{action.title}</p>
          <Badge tone={u.tone} size="sm">{u.label}</Badge>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">{action.because}</p>
      </div>
      <Button variant={action.urgency === 'BLOCKING' ? 'primary' : 'secondary'} size="sm" asChild className="shrink-0">
        <Link to={action.link}>
          {action.cta} <ArrowRight />
        </Link>
      </Button>
    </div>
  )
}

/** A job as the operator sees it: where it is, what is next, when it bites. */
export function JobCard({ brief, phaseLink }: { brief: JobBrief; phaseLink?: string }) {
  const { project: p } = brief
  const tone = PHASE_TONE[brief.phase]
  return (
    <div
      className={cn(
        'rounded-xl border bg-surface p-4 shadow-card transition-colors',
        brief.blocking > 0 ? 'border-danger/35' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11.5px] text-fg-subtle">{p.code}</span>
            <Badge tone="outline" size="sm">{stageLabel(p.stage)}</Badge>
            {brief.blocking > 0 && (
              <Badge tone="danger" size="sm">
                {brief.blocking} blocking
              </Badge>
            )}
            {brief.actions.length === 0 && (
              <Badge tone="success" size="sm">
                <CircleCheck className="size-3" /> Nothing outstanding
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-[14px] font-semibold leading-tight text-fg">{p.name}</p>
          <p className="mt-1 text-[12px] text-fg-muted">
            <span className="mr-1">{countryFlag('ID')}</span>
            {p.polName} <ArrowRight className="inline size-3" />{' '}
            <span className="mx-1">{countryFlag(p.destCountry)}</span>
            {p.podName}
            {p.vessel && ` · ${p.vessel}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {brief.nextCutoff ? (
            <>
              <p
                className={cn(
                  'tnum text-[13px] font-semibold',
                  brief.nextCutoff.days <= 1 ? 'text-danger' : brief.nextCutoff.days <= 3 ? 'text-warning' : 'text-fg',
                )}
              >
                {brief.nextCutoff.days === 0 ? 'today' : pluralDays(brief.nextCutoff.days)}
              </p>
              <p className="text-[11px] text-fg-subtle">
                {brief.nextCutoff.label} · {fmtDate(brief.nextCutoff.at)}
              </p>
            </>
          ) : (
            <p className="text-[11.5px] text-fg-subtle">no cut-off ahead</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <Progress value={brief.progressPct} tone={tone.bar} className="flex-1" />
        <span className="tnum shrink-0 text-[11px] text-fg-subtle">{Math.round(brief.progressPct)}%</span>
      </div>

      {brief.top && (
        <div className="mt-3 border-t border-border pt-1">
          <ActionRow action={brief.top} compact />
          {brief.actions.length > 1 && (
            <p className="pb-1 text-[11.5px] text-fg-subtle">
              and {brief.actions.length - 1} more on this job
            </p>
          )}
        </div>
      )}

      {!brief.top && (
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <p className="text-[12px] text-fg-muted">Everything on this job is up to date.</p>
          <Button variant="ghost" size="sm" asChild>
            <Link to={phaseLink ?? `/projects/${p.id}`}>
              Open <ArrowRight />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}

/** The banner every phase page opens with — what this phase is for. */
export function PhaseIntro({ phase, count }: { phase: OperatorPhase; count: number }) {
  const meta = phaseMeta(phase)
  const tone = PHASE_TONE[phase]
  const index = ['INTAKE', 'EXECUTION', 'DOCUMENTS', 'CLOSING'].indexOf(phase) + 1
  return (
    <div className="mb-5 rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start gap-4">
        <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl text-[15px] font-semibold', tone.chip)}>
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-fg">{meta.label}</h1>
            <span className="text-[13px] italic text-fg-subtle">{meta.local}</span>
          </div>
          <p className="mt-1 text-[13px] font-medium text-primary">{meta.question}</p>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-fg-muted">{meta.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tnum text-[26px] font-semibold leading-none text-fg">{count}</p>
          <p className="mt-1 text-[11.5px] text-fg-subtle">job{count === 1 ? '' : 's'} here</p>
        </div>
      </div>
    </div>
  )
}

export function NothingHere({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-surface-sunken/50 px-6 py-12 text-center">
      <span className="mx-auto grid size-10 place-items-center rounded-full bg-success-soft text-success-soft-fg">
        <CircleCheck className="size-5" />
      </span>
      <p className="mt-3 text-[14px] font-semibold text-fg">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-fg-muted">{description}</p>
    </div>
  )
}
