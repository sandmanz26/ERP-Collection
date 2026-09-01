import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CircleAlert, CircleCheck, CircleDashed, CircleX, FileStack } from 'lucide-react'
import { documentChecklist } from '@/lib/operator'
import { useOperator } from './useOperator'
import { ActionRow, NothingHere, PhaseIntro } from './shared'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { Segmented } from '@/components/ui/checkbox'
import { stageLabel } from '@/data/reference'
import { titleCase } from '@/lib/format'
import { cn } from '@/lib/utils'

type Row = ReturnType<typeof documentChecklist>[number]

const STATE: Record<Row['state'], { label: string; tone: 'success' | 'danger' | 'warning' | 'neutral'; icon: React.ReactNode; hint: string }> = {
  DONE: { label: 'Done', tone: 'success', icon: <CircleCheck />, hint: 'Issued and complete to its standard.' },
  INCOMPLETE: { label: 'Incomplete', tone: 'danger', icon: <CircleAlert />, hint: 'Marked issued but missing mandatory fields — this is what gets rejected.' },
  REJECTED: { label: 'Rejected', tone: 'danger', icon: <CircleX />, hint: 'Came back rejected. Nothing downstream can be issued until it is corrected.' },
  IN_PROGRESS: { label: 'In progress', tone: 'warning', icon: <CircleDashed />, hint: 'Started but not yet issued.' },
  MISSING: { label: 'Not started', tone: 'neutral', icon: <CircleDashed />, hint: 'No record exists yet.' },
}

export function MyDocumentsPage() {
  const [params, setParams] = useSearchParams()
  const { store, board, mine } = useOperator()
  const [scope, setScope] = React.useState<'needed' | 'all'>('needed')

  /* Documents run alongside everything, so this phase shows every job that
     still has paperwork outstanding — not only the ones at the documents stage. */
  const jobs = React.useMemo(() => {
    const focused = params.get('job')
    const withDocs = board.briefs.filter((b) => {
      const rows = documentChecklist(b.project, store.documents)
      return rows.some((r) => r.mandatory && r.state !== 'DONE')
    })
    const list = withDocs.length > 0 || scope === 'all' ? (scope === 'all' ? board.briefs : withDocs) : withDocs
    return focused ? list.filter((b) => b.project.id === focused) : list
  }, [board.briefs, store.documents, params, scope])

  const focusedJob = params.get('job')

  return (
    <>
      <PhaseIntro phase="DOCUMENTS" count={jobs.length} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={scope}
          onChange={(v) => setScope(v as 'needed' | 'all')}
          options={[
            { value: 'needed', label: 'Needs work' },
            { value: 'all', label: `All my jobs (${mine.length})` },
          ]}
        />
        {focusedJob && (
          <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
            Show every job
          </Button>
        )}
      </div>

      {jobs.length === 0 && (
        <NothingHere
          title="Every mandatory document is in order"
          description="Nothing on your desk is missing paperwork. When a job reaches the documentation stage its checklist appears here."
        />
      )}

      <div className="space-y-4">
        {jobs.map((b) => {
          const rows = documentChecklist(b.project, store.documents)
          const mandatory = rows.filter((r) => r.mandatory)
          const done = mandatory.filter((r) => r.state === 'DONE').length
          const problems = rows.filter((r) => r.state === 'REJECTED' || r.state === 'INCOMPLETE')
          const shown = scope === 'all' ? rows : rows.filter((r) => r.mandatory || r.doc)
          const docActions = b.actions.filter((a) =>
            /document|rejected|declaration|instruction|delivery/i.test(a.title),
          )

          return (
            <Card key={b.project.id} className={problems.length ? 'border-danger/35' : undefined}>
              <CardHeader
                icon={<FileStack />}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {b.project.name}
                    <Badge tone="outline" size="sm">{b.project.code}</Badge>
                    <Badge tone="neutral" size="sm">{stageLabel(b.project.stage)}</Badge>
                  </span>
                }
                description={`${b.project.polName} → ${b.project.podName} · ${b.project.incoterm} · ${titleCase(b.project.paymentTerm)}`}
                actions={
                  <div className="flex items-center gap-2.5">
                    <Progress
                      value={(done / Math.max(1, mandatory.length)) * 100}
                      tone={problems.length ? 'danger' : done === mandatory.length ? 'success' : 'warning'}
                      className="w-20"
                    />
                    <span className="tnum text-[12px] font-medium text-fg">
                      {done}/{mandatory.length}
                    </span>
                  </div>
                }
              />
              <CardBody className="space-y-4">
                {docActions.length > 0 && (
                  <div className="divide-y divide-border rounded-lg border border-border px-3.5">
                    {docActions.map((a) => (
                      <ActionRow key={a.id} action={a} compact />
                    ))}
                  </div>
                )}

                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border bg-surface-sunken/60 px-3.5 py-2">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Document</p>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">State</p>
                  </div>
                  <div className="divide-y divide-border">
                    {shown.map((r) => {
                      const st = STATE[r.state]
                      return (
                        <div key={r.type} className="grid grid-cols-[1fr_auto] items-center gap-3 px-3.5 py-2.5">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={cn(
                                  'text-[12.5px]',
                                  r.mandatory ? 'font-medium text-fg' : 'text-fg-muted',
                                )}
                              >
                                {r.label}
                              </span>
                              {r.mandatory && <Badge tone="outline" size="sm">Required</Badge>}
                              {r.doc?.docNo && (
                                <span className="font-mono text-[11px] text-fg-subtle">{r.doc.docNo}</span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">
                              {r.state === 'INCOMPLETE' && r.check
                                ? `Missing ${r.check.missing.map((m) => m.label).join(', ')}.`
                                : r.state === 'REJECTED'
                                  ? (r.doc?.remarks ?? 'Rejected — correct it and re-issue.')
                                  : r.hint}
                            </p>
                          </div>
                          <Tooltip content={st.hint}>
                            <span className="shrink-0">
                              <Badge tone={st.tone} size="sm" dot>{st.label}</Badge>
                            </span>
                          </Tooltip>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="secondary" size="sm" asChild>
                    <Link to={`/projects/${b.project.id}?tab=documents`}>
                      Open the document register <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </>
  )
}
