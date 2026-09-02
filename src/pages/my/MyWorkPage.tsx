import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CircleCheck, Inbox, TriangleAlert } from 'lucide-react'
import { useOperator } from './useOperator'
import { JobCard, NothingHere, PHASE_TONE } from './shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const PHASE_ROUTE: Record<string, string> = {
  INTAKE: '/my/intake',
  EXECUTION: '/my/execute',
  DOCUMENTS: '/my/documents',
  CLOSING: '/my/closing',
}

export function MyWorkPage() {
  const nav = useNavigate()
  const { user, board, mine, viewingAll } = useOperator()

  const blocking = board.briefs.flatMap((b) => b.actions.filter((a) => a.urgency === 'BLOCKING'))
  const firstName = (user?.fullName ?? 'there').split(' ')[0]

  return (
    <>
      <div className="pb-5">
        <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.022em] text-fg">
          Good day, {firstName}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-fg-muted">
          {viewingAll
            ? 'You are seeing every job in the workspace, laid out the way an operator works it. An operator sees only their own.'
            : `You have ${mine.length} job${mine.length === 1 ? '' : 's'}. They move through four phases — take it on, run it, paper it, close it — and each one tells you what it needs next.`}
        </p>
      </div>

      {/* -------- the one thing that matters most -------- */}
      {blocking.length > 0 ? (
        <Card className="mb-5 border-danger/35" data-tour="my-blocking">
          <CardBody>
            <div className="flex flex-wrap items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger-soft-fg">
                <TriangleAlert className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-fg">
                  {blocking.length} thing{blocking.length === 1 ? '' : 's'} will stop a shipment if left
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">
                  These are not reminders. Each one blocks a container, a document or an invoice until it is dealt with.
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-border pt-3">
              {blocking.slice(0, 4).map((a) => (
                <Link
                  key={a.id}
                  to={a.link}
                  className="flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-bg-muted"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium text-fg">{a.title}</span>
                    <span className="block text-[11.5px] leading-relaxed text-fg-muted">{a.because}</span>
                  </span>
                  <ArrowRight className="mt-1 size-3.5 shrink-0 text-fg-subtle" />
                </Link>
              ))}
              {blocking.length > 4 && (
                <p className="px-2 text-[11.5px] text-fg-subtle">and {blocking.length - 4} more across your jobs</p>
              )}
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card className="mb-5 border-success/30" data-tour="my-blocking">
          <CardBody className="flex flex-wrap items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success-soft text-success-soft-fg">
              <CircleCheck className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-fg">Nothing is blocked right now</p>
              <p className="mt-0.5 text-[12.5px] text-fg-muted">
                No cut-off, document or container on your desk is holding a shipment up. Work the due items below.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* -------- the four phases -------- */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-tour="my-phases">
        {board.byPhase.map(({ phase, count, blocking: blocked }, i) => {
          const tone = PHASE_TONE[phase.key]
          return (
            <button
              key={phase.key}
              type="button"
              onClick={() => nav(PHASE_ROUTE[phase.key])}
              className={cn(
                'rounded-xl border bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-px hover:shadow-pop',
                blocked > 0 ? 'border-danger/35' : 'border-border',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className={cn('grid size-7 place-items-center rounded-lg text-[12px] font-semibold', tone.chip)}>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-fg">{phase.label}</p>
                  <p className="truncate text-[10.5px] italic text-fg-subtle">{phase.local}</p>
                </div>
              </div>
              <p className="tnum mt-3 text-[26px] font-semibold leading-none text-fg">{count}</p>
              <p className="mt-1.5 text-[11.5px] text-fg-muted">
                {blocked > 0 ? (
                  <span className="font-medium text-danger">{blocked} blocking</span>
                ) : count ? (
                  'nothing blocked'
                ) : (
                  'no jobs here'
                )}
                {phase.key === 'DOCUMENTS' && count > 0 && (
                  <span className="block text-fg-subtle">across every phase</span>
                )}
              </p>
            </button>
          )
        })}
      </div>

      {/* -------- jobs, in phase order -------- */}
      {board.byPhase.map(({ phase, jobs }) =>
        jobs.length === 0 ? null : (
          <section key={phase.key} className="mb-6" data-tour="my-jobs">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-fg">
                {phase.label}
                <span className="text-[12px] font-normal italic text-fg-subtle">{phase.local}</span>
                <Badge tone="outline" size="sm">{jobs.length}</Badge>
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to={PHASE_ROUTE[phase.key]}>
                  Open the phase <ArrowRight />
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {jobs.map((b) => (
                <JobCard key={b.project.id} brief={b} phaseLink={PHASE_ROUTE[phase.key]} />
              ))}
            </div>
          </section>
        ),
      )}

      {mine.length === 0 && (
        <NothingHere
          title="No jobs on your desk"
          description="When the commercial team hands a job over it appears here first, in Take the job on."
        />
      )}

      {board.awaitingAcceptance > 0 && (
        <Card className="border-primary/30">
          <CardBody className="flex flex-wrap items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-fg">
              <Inbox className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-fg">
                {board.awaitingAcceptance} job{board.awaitingAcceptance === 1 ? '' : 's'} waiting to be accepted
              </p>
              <p className="mt-0.5 text-[12.5px] text-fg-muted">
                Until you accept, nobody is watching the cut-offs on them.
              </p>
            </div>
            <Button variant="primary" size="sm" asChild>
              <Link to="/my/intake">
                Review the hand-over <ArrowRight />
              </Link>
            </Button>
          </CardBody>
        </Card>
      )}
    </>
  )
}
