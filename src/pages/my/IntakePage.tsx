import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CircleCheck, CircleX, Handshake, Info } from 'lucide-react'
import type { Project } from '@/data/types'
import { buildHandoverChecklist } from '@/lib/operator'
import { useOperator } from './useOperator'
import { NothingHere, PhaseIntro } from './shared'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Tooltip } from '@/components/ui/tooltip'
import * as Dialog from '@radix-ui/react-dialog'
import { DialogContent } from '@/components/ui/dialog'
import { countryFlag, stageLabel } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtDateTime, titleCase } from '@/lib/format'
import { useToast } from '@/components/ui/toast'

export function IntakePage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const { store, ctx, board } = useOperator()
  const jobs = board.byPhase.find((p) => p.phase.key === 'INTAKE')?.jobs ?? []

  const focused = params.get('job')
  const [decliningId, setDecliningId] = React.useState<string | null>(null)
  const [reason, setReason] = React.useState('')

  const waiting = jobs.filter((b) => b.project.handover?.status === 'OFFERED')
  const declined = jobs.filter((b) => b.project.handover?.status === 'DECLINED')
  const taken = jobs.filter((b) => b.project.handover?.status === 'ACCEPTED')

  return (
    <>
      <PhaseIntro phase="INTAKE" count={jobs.length} />

      {jobs.length === 0 && (
        <NothingHere
          title="No jobs waiting to be taken on"
          description="A job appears here the moment the commercial team hands it over. Everything you already accepted has moved to Run the job."
        />
      )}

      {waiting.length > 0 && (
        <section className="mb-6 space-y-4">
          <h2 className="text-[14px] font-semibold text-fg">
            Waiting for your answer <Badge tone="primary" size="sm">{waiting.length}</Badge>
          </h2>
          {waiting.map((b) => (
            <HandoverCard
              key={b.project.id}
              project={b.project}
              /* The checklist is the page. Open the one being looked at, or the
                 first in the queue, rather than making the operator click twice. */
              open={focused ? focused === b.project.id : waiting[0]?.project.id === b.project.id}
              onFocus={() => setParams(focused === b.project.id ? {} : { job: b.project.id }, { replace: true })}
              onDecline={() => { setDecliningId(b.project.id); setReason('') }}
              checklist={buildHandoverChecklist(b.project, ctx)}
            />
          ))}
        </section>
      )}

      {declined.length > 0 && (
        <section className="mb-6 space-y-3">
          <h2 className="text-[14px] font-semibold text-fg">
            You sent back <Badge tone="warning" size="sm">{declined.length}</Badge>
          </h2>
          {declined.map((b) => (
            <Card key={b.project.id} className="border-warning/35">
              <CardBody>
                <div className="flex flex-wrap items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-warning-soft text-warning-soft-fg">
                    <CircleX className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-fg">{b.project.name}</p>
                    <p className="mt-0.5 font-mono text-[11.5px] text-fg-subtle">{b.project.code}</p>
                    <p className="mt-2 rounded-lg border-l-2 border-warning/50 bg-warning-soft/40 px-3 py-2 text-[12.5px] leading-relaxed text-fg-muted">
                      {b.project.handover?.reason}
                    </p>
                    <p className="mt-2 text-[11.5px] text-fg-subtle">
                      Sent back {b.project.handover?.respondedAt && fmtDateTime(b.project.handover.respondedAt)}. The
                      commercial team has it; it comes back to you if they resolve it.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      store.acceptJob(b.project.id, b.project.handover?.checklist ?? [])
                      toast.push({ tone: 'success', title: 'Job taken on', description: `${b.project.code} is yours now.` })
                    }}
                  >
                    Take it after all
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </section>
      )}

      {taken.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[14px] font-semibold text-fg">
            Taken on, not started <Badge tone="outline" size="sm">{taken.length}</Badge>
          </h2>
          {taken.map((b) => (
            <Card key={b.project.id}>
              <CardBody className="flex flex-wrap items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-success-soft text-success-soft-fg">
                  <CircleCheck className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-fg">{b.project.name}</p>
                  <p className="mt-0.5 text-[11.5px] text-fg-muted">
                    <span className="font-mono">{b.project.code}</span> · {stageLabel(b.project.stage)} ·{' '}
                    {b.project.polName} → {b.project.podName}
                  </p>
                </div>
                <Button variant="secondary" size="sm" asChild className="shrink-0">
                  <Link to="/my/execute">
                    Start running it <ArrowRight />
                  </Link>
                </Button>
              </CardBody>
            </Card>
          ))}
        </section>
      )}

      <Dialog.Root open={!!decliningId} onOpenChange={(v) => !v && setDecliningId(null)}>
        <DialogContent
          size="md"
          icon={<CircleX />}
          title="Send this job back"
          description="A refusal is a normal answer — but it has to say why, or the commercial desk cannot fix it and it just comes straight back."
          footer={
            <>
              <Button variant="ghost" onClick={() => setDecliningId(null)}>Keep it</Button>
              <Button
                variant="danger"
                disabled={reason.trim().length < 10}
                onClick={() => {
                  if (!decliningId) return
                  store.declineJob(decliningId, reason.trim())
                  toast.push({
                    tone: 'success',
                    title: 'Sent back',
                    description: 'The commercial team has your reason and the job is off your desk.',
                  })
                  setDecliningId(null)
                }}
              >
                Send it back
              </Button>
            </>
          }
        >
          <div className="p-5">
            <Field
              label="Why can you not take this on?"
              required
              help="Be specific. \u201cNo booking yet\u201d can be acted on; \u201cnot ready\u201d cannot."
              error={reason.length > 0 && reason.trim().length < 10 ? 'Give at least a sentence.' : undefined}
            >
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="No booking confirmation yet, so there are no cut-offs to work to and nothing would warn me if it slipped."
              />
            </Field>
          </div>
        </DialogContent>
      </Dialog.Root>

    </>
  )
}

/* ---------------------------------------------------------------- */

function HandoverCard({
  project, checklist, open, onFocus, onDecline,
}: {
  project: Project
  checklist: ReturnType<typeof buildHandoverChecklist>
  open: boolean
  onFocus: () => void
  onDecline: () => void
}) {
  const toast = useToast()
  const store = useErpSafe()
  const stored = project.handover?.checklist ?? []
  const merged = checklist.map((c) => ({
    ...c,
    confirmed: stored.find((s) => s.key === c.key)?.confirmed ?? c.confirmed,
  }))
  const required = merged.filter((c) => c.required)
  const outstanding = required.filter((c) => !c.confirmed)
  const ready = outstanding.length === 0

  return (
    <Card className={ready ? 'border-success/35' : 'border-primary/30'}>
      <CardHeader
        icon={<Handshake />}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {project.name}
            <Badge tone="outline" size="sm">{project.code}</Badge>
            <Badge tone={project.priority === 'CRITICAL' ? 'danger' : project.priority === 'HIGH' ? 'warning' : 'neutral'} size="sm">
              {titleCase(project.priority)}
            </Badge>
          </span>
        }
        description={
          <span>
            Handed to you by {project.handover?.offeredBy} on{' '}
            {project.handover?.offeredAt && fmtDate(project.handover.offeredAt)}. Read it, tick what you have, then
            decide.
          </span>
        }
        actions={
          <Button variant="ghost" size="sm" onClick={onFocus}>
            {open ? 'Collapse' : 'Review'}
          </Button>
        }
      />
      <CardBody className="space-y-4">
        {/* the brief, in one glance */}
        <div className="grid gap-3 rounded-lg border border-border bg-surface-sunken/60 p-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Route">
            {countryFlag('ID')} {project.polName} → {countryFlag(project.destCountry)} {project.podName}
          </Fact>
          <Fact label="Terms">
            {project.incoterm} · freight {project.freightTerm.toLowerCase()} · {titleCase(project.paymentTerm)}
          </Fact>
          <Fact label="Cargo">
            {project.commodity} · {fmtCurrency(project.cargoValue, project.cargoCurrency, { compact: true })}
          </Fact>
          <Fact label="Cut-offs">
            {project.gateInCutoff ? `gate-in ${fmtDate(project.gateInCutoff)}` : 'not set yet'}
            {project.etd && ` · ETD ${fmtDate(project.etd)}`}
          </Fact>
        </div>

        {open && (
          <>
            <div>
              <p className="text-[12.5px] font-semibold text-fg">Before you take it on</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-fg-muted">
                Each line is something that costs money to discover late. Tick what you actually have — not what you
                assume is coming.
              </p>
              <div className="mt-2.5 divide-y divide-border rounded-lg border border-border">
                {merged.map((c) => (
                  <label
                    key={c.key}
                    className="flex cursor-pointer items-start gap-3 px-3.5 py-2.5 transition-colors hover:bg-bg-muted"
                  >
                    <span className="mt-0.5">
                      <Checkbox
                        checked={c.confirmed}
                        onChange={(v) => store.setHandoverCheck(project.id, c.key, v)}
                        aria-label={c.label}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[12.5px] font-medium text-fg">{c.label}</span>
                        {c.required ? (
                          <Badge tone={c.confirmed ? 'success' : 'danger'} size="sm">Required</Badge>
                        ) : (
                          <Badge tone="neutral" size="sm">Optional</Badge>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-relaxed text-fg-muted">{c.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {!ready && (
              <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-3">
                <Info className="mt-0.5 size-4 shrink-0 text-warning-soft-fg" />
                <p className="text-[12.5px] leading-relaxed text-warning-soft-fg">
                  {outstanding.length} required item{outstanding.length === 1 ? '' : 's'} not confirmed:{' '}
                  {outstanding.map((c) => c.label.toLowerCase()).join(', ')}. You can still accept — but then it is
                  yours to chase.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
              <Button variant="outlineDanger" onClick={onDecline}>
                <CircleX /> Send it back
              </Button>
              <Tooltip content={ready ? 'Everything you need is confirmed.' : 'Accepting with gaps makes them yours to chase.'}>
                <Button
                  variant="primary"
                  onClick={() => {
                    store.acceptJob(project.id, merged)
                    toast.push({
                      tone: 'success',
                      title: `${project.code} is yours`,
                      description: ready
                        ? 'Everything checked out. It has moved to Run the job.'
                        : `Accepted with ${outstanding.length} gap${outstanding.length === 1 ? '' : 's'} — chase them before the cut-off.`,
                    })
                  }}
                >
                  <CircleCheck /> Accept this job
                </Button>
              </Tooltip>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{label}</p>
      <p className="mt-1 text-[12.5px] leading-snug text-fg">{children}</p>
    </div>
  )
}

/* the card needs the store but is defined outside the page component */
import { useErp } from '@/store/useErp'
const useErpSafe = () => useErp()
