import { Link } from 'react-router-dom'
import { ArrowRight, CircleCheck, Receipt, Wallet } from 'lucide-react'
import { useOperator } from './useOperator'
import { ActionRow, NothingHere, PhaseIntro } from './shared'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/misc'
import { jobSheet } from '@/lib/stuffing'
import { costTypeMeta } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtPercent } from '@/lib/format'
import { useToast } from '@/components/ui/toast'

export function ClosingPage() {
  const toast = useToast()
  const { store, board } = useOperator()
  const jobs = board.byPhase.find((p) => p.phase.key === 'CLOSING')?.jobs ?? []

  return (
    <>
      <PhaseIntro phase="CLOSING" count={jobs.length} />

      {jobs.length === 0 && (
        <NothingHere
          title="Nothing waiting to be closed"
          description="A job arrives here once the cargo is at destination. Closing it means every charge is on the sheet, the field cash is settled and finance has the job sheet."
        />
      )}

      <div className="space-y-4">
        {jobs.map((b) => {
          const p = b.project
          const rows = store.charges.filter((c) => c.projectId === p.id)
          const sheet = jobSheet(rows)
          const readyToClose = b.actions.length === 0 && p.status !== 'COMPLETED'

          return (
            <Card key={p.id} className={b.blocking ? 'border-danger/35' : undefined}>
              <CardHeader
                icon={<Receipt />}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {p.name}
                    <Badge tone="outline" size="sm">{p.code}</Badge>
                    {p.status === 'COMPLETED' && <Badge tone="success" size="sm">Closed</Badge>}
                  </span>
                }
                description={`${p.polName} → ${p.podName}${p.ata ? ` · arrived ${fmtDate(p.ata)}` : p.eta ? ` · ETA ${fmtDate(p.eta)}` : ''}`}
                actions={
                  <Button variant="secondary" size="sm" asChild>
                    <Link to={`/projects/${p.id}?tab=jobsheet`}>
                      Full job sheet <ArrowRight />
                    </Link>
                  </Button>
                }
              />
              <CardBody className="space-y-4">
                {/* -------- the money, in one line -------- */}
                <div className="grid gap-3 sm:grid-cols-4">
                  <Figure label="Billed" value={fmtCurrency(sheet.revenue, 'IDR', { compact: true })} />
                  <Figure label="Cost" value={fmtCurrency(sheet.cost, 'IDR', { compact: true })} />
                  <Figure
                    label="Margin"
                    value={fmtCurrency(sheet.margin, 'IDR', { compact: true })}
                    sub={fmtPercent(sheet.marginPct, 1)}
                    tone={sheet.margin > 0 ? 'success' : 'danger'}
                  />
                  <Figure
                    label="Field cash out"
                    value={fmtCurrency(sheet.unsettledField, 'IDR', { compact: true })}
                    sub={sheet.unsettledField > 0 ? 'no receipts back' : 'all settled'}
                    tone={sheet.unsettledField > 0 ? 'warning' : 'success'}
                  />
                </div>

                {/* -------- cost buckets -------- */}
                <div className="space-y-2 rounded-lg border border-border p-3.5">
                  <p className="text-[12px] font-semibold text-fg">Where the cost sits</p>
                  {sheet.buckets.map((bucket) => {
                    const meta = costTypeMeta(bucket.type)!
                    const pct = sheet.cost ? (bucket.cost / sheet.cost) * 100 : 0
                    return (
                      <div key={bucket.type} className="flex items-center gap-3">
                        <span className="w-[132px] shrink-0 text-[11.5px] text-fg-muted">
                          {meta.label}
                          <span className="ml-1 italic text-fg-subtle">{meta.local}</span>
                        </span>
                        <Progress
                          value={pct}
                          tone={bucket.type === 'MASTER' ? 'primary' : bucket.type === 'FIELD' ? 'warning' : 'accent'}
                          className="flex-1"
                        />
                        <span className="tnum w-[74px] shrink-0 text-right text-[11.5px] text-fg">
                          {fmtCurrency(bucket.cost, 'IDR', { compact: true })}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* -------- unsettled field cash, by name -------- */}
                {sheet.unsettledLines.length > 0 && (
                  <div className="rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-3">
                    <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-warning-soft-fg">
                      <Wallet className="size-3.5" />
                      Cash still out at the port
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {sheet.unsettledLines.map((c) => (
                        <li key={c.id} className="text-[11.5px] leading-relaxed text-warning-soft-fg/90">
                          {c.chargeCode} — {fmtCurrency(c.settlement?.advanceAmount ?? 0, 'IDR', { compact: true })} with{' '}
                          {c.settlement?.advancedTo ?? 'unknown'}
                          {c.settlement?.advancedAt && `, advanced ${fmtDate(c.settlement.advancedAt)}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* -------- what to do -------- */}
                {b.actions.length > 0 ? (
                  <div className="divide-y divide-border border-t border-border">
                    {b.actions.map((a) => (
                      <ActionRow key={a.id} action={a} />
                    ))}
                  </div>
                ) : p.status === 'COMPLETED' ? (
                  <p className="text-[12.5px] text-fg-muted">
                    This job is closed. The job sheet is with finance and the ledger carries the result.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/30 bg-success-soft px-3.5 py-3">
                    <p className="flex items-center gap-1.5 text-[12.5px] text-success-soft-fg">
                      <CircleCheck className="size-4" />
                      Everything is billed and settled. This job is ready to close.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!readyToClose}
                      onClick={() => {
                        store.upsertProject({ ...p, status: 'COMPLETED' })
                        toast.push({
                          tone: 'success',
                          title: `${p.code} closed`,
                          description: 'The job sheet is with finance and the job is off your desk.',
                        })
                      }}
                    >
                      Close the job
                    </Button>
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

function Figure({
  label, value, sub, tone = 'neutral',
}: { label: string; value: string; sub?: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const tones = {
    neutral: 'text-fg',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  }
  return (
    <div className="rounded-lg border border-border bg-surface-sunken/60 p-3">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{label}</p>
      <p className={`tnum mt-1.5 text-[18px] font-semibold leading-none ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-fg-muted">{sub}</p>}
    </div>
  )
}
