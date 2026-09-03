import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, ArrowRight, CalendarRange, CheckCircle2, CornerUpLeft, Layers, Lock,
  Send, Users,
} from 'lucide-react'
import type { MrRequest } from '@/data/types'
import { monthLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/input'
import { EmptyState, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate, fmtDateTime, fmtNumber } from '@/lib/format'
import { daysUntil } from '@/lib/domain'
import {
  buildPrLines, canLockSession, mrRequestQty, mrRequestTotal, sessionRequests,
  sessionStats,
} from '@/lib/procurement'

export function MrSessionDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const can = useCan()
  const store = useErp()
  const { mrSessions, mrRequests, divisions, items, purchaseRequests, setSessionStatus, reviewMrRequest, lockMrSession } = store
  const [tab, setTab] = React.useState<'divisions' | 'recap'>('divisions')
  const [returning, setReturning] = React.useState<MrRequest | null>(null)
  const [reason, setReason] = React.useState('')
  const [lockOpen, setLockOpen] = React.useState(false)

  const session = mrSessions.find((s) => s.id === id)

  if (!session) {
    return (
      <EmptyState
        icon={<CalendarRange />}
        title="This session is no longer in the register"
        description="It may have been deleted. Open the session list to find another."
        action={<Button variant="primary" size="sm" onClick={() => nav('/mr')}>Back to sessions</Button>}
      />
    )
  }

  const rows = sessionRequests(session.id, mrRequests)
  const stats = sessionStats(session, mrRequests, divisions, items)
  const lockCheck = canLockSession(session, mrRequests)
  const pr = purchaseRequests.find((p) => p.id === session.purchaseRequestId)
  const divisionOf = (r: MrRequest) => divisions.find((d) => d.id === r.divisionId)
  /* The recap exactly as the Lock button would build it. */
  const recap = buildPrLines(rows, items)
  const notFiled = divisions.filter((d) => d.status === 'ACTIVE' && !rows.some((r) => r.divisionId === d.id))

  return (
    <>
      <PageHeader
        eyebrow={
          <Link to="/mr" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-fg-muted hover:text-fg">
            <ArrowLeft className="size-3.5" /> Material requests
          </Link>
        }
        title={session.title}
        description={session.note}
        meta={
          <>
            <StatusBadge value={session.status} tone={session.status === 'LOCKED' ? 'purple' : undefined} />
            <span className="font-mono text-[12px] text-fg-subtle">{session.code}</span>
            <span className="text-[12.5px] text-fg-muted">{monthLabel(session.periodMonth)} {session.periodYear}</span>
            <span className="text-[12.5px] text-fg-muted">
              Filing {fmtDate(session.opensAt)} – {fmtDate(session.closesAt)}
              {session.status === 'OPEN' && ` · ${daysUntil(session.closesAt)} days left`}
            </span>
            {session.lockedAt && (
              <span className="text-[12.5px] text-fg-muted">Locked {fmtDateTime(session.lockedAt)} by {session.lockedBy}</span>
            )}
          </>
        }
        actions={
          <>
            {can('mr.review') && session.status === 'OPEN' && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSessionStatus(session.id, 'CLOSED')
                  toast.push({ tone: 'success', title: `${session.code} closed`, description: 'Divisions can no longer submit. Review the requests, then lock.' })
                }}
              >
                <CheckCircle2 /> Close for filing
              </Button>
            )}
            {can('mr.lock') && session.status !== 'LOCKED' && session.status !== 'CANCELLED' && (
              <Tooltip content={lockCheck.ok ? 'Merge every submitted request into a purchase request' : lockCheck.reason}>
                <span>
                  <Button variant="primary" disabled={!lockCheck.ok} onClick={() => setLockOpen(true)}>
                    <Lock /> Lock into a purchase request
                  </Button>
                </span>
              </Tooltip>
            )}
            {pr && (
              <Button variant="primary" onClick={() => nav(`/purchase-requests/${pr.id}`)}>
                Open {pr.code} <ArrowRight />
              </Button>
            )}
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Divisions submitted"
          value={`${stats.submitted} / ${stats.eligibleDivisions}`}
          icon={<Users />}
          accent={stats.drafts > 0 ? 'warning' : stats.submitted === stats.eligibleDivisions ? 'success' : 'primary'}
          sub={`${stats.drafts} in draft · ${stats.returned} returned · ${stats.notFiled} not filed`}
        />
        <KpiCard label="Request lines" value={stats.lines} icon={<Layers />} accent="accent" sub={`${fmtNumber(stats.qty)} units requested`} />
        <KpiCard
          label="Merges into"
          value={`${recap.length} lines`}
          icon={<Layers />}
          accent="purple"
          sub="one line per item after the merge"
          onClick={() => setTab('recap')}
        />
        <KpiCard label="Estimated value" value={fmtCurrency(stats.estimate, 'IDR', { compact: true })} icon={<Send />} accent="primary" sub="division estimates, or standard cost" />
      </div>

      {!lockCheck.ok && session.status !== 'LOCKED' && session.status !== 'CANCELLED' && can('mr.lock') && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-soft px-3.5 py-3 text-warning-soft-fg">
          <AlertTriangle className="mt-px size-4 shrink-0" />
          <p className="text-[12.5px] leading-relaxed">
            <span className="font-semibold">Cannot lock yet.</span> {lockCheck.reason}
          </p>
        </div>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: 'divisions', label: 'By division', count: rows.length },
          { value: 'recap', label: 'Recap preview', count: recap.length },
        ]}
      />

      {tab === 'divisions' && (
        <div className="space-y-4">
          {rows.length === 0 && (
            <Card>
              <EmptyState icon={<Users />} title="No division has filed yet" description="Requests appear here as soon as a division head starts one." />
            </Card>
          )}

          {rows.map((request) => {
            const division = divisionOf(request)
            return (
              <Card key={request.id}>
                <CardHeader
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      {division?.name ?? 'Unknown division'}
                      <Badge tone="outline" size="sm">{division?.code}</Badge>
                      <StatusBadge value={request.status} size="sm" />
                    </span>
                  }
                  description={
                    request.status === 'RETURNED' && request.returnReason
                      ? `Returned: ${request.returnReason}`
                      : `${request.lines.length} lines · ${fmtNumber(mrRequestQty(request))} units · ${fmtCurrency(mrRequestTotal(request, items), 'IDR', { compact: true })}` +
                        (request.submittedAt ? ` · submitted ${fmtDate(request.submittedAt)} by ${request.submittedBy}` : '')
                  }
                  actions={
                    /* A draft can be sent back too: that is how purchasing clears a
                       division that never filed, so the lock leaves nothing out by accident. */
                    can('mr.review') && session.status !== 'LOCKED' && request.status !== 'RETURNED' ? (
                      <div className="flex gap-1.5">
                        {request.status === 'SUBMITTED' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              reviewMrRequest(request.id, 'APPROVED')
                              toast.push({ tone: 'success', title: 'Request approved', description: `${division?.code} — included in the recap.` })
                            }}
                          >
                            <CheckCircle2 /> Approve
                          </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => { setReturning(request); setReason('') }}>
                          <CornerUpLeft /> Return
                        </Button>
                      </div>
                    ) : undefined
                  }
                />
                <div className="scrollbar-thin overflow-x-auto">
                  <table className="w-full border-separate border-spacing-0 text-[13px]">
                    <thead>
                      <tr>
                        {['SKU', 'Item', 'Qty', 'Estimate / unit', 'Line value', 'Purpose'].map((h) => (
                          <th key={h} className="whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {request.lines.map((line) => {
                        const item = items.find((i) => i.id === line.itemId)
                        const unit = line.estimatedUnitPrice ?? item?.standardCost ?? 0
                        return (
                          <tr key={line.id}>
                            <td className="whitespace-nowrap border-b border-border px-3 py-2 font-mono text-[11.5px] text-fg-muted">{item?.sku}</td>
                            <td className="border-b border-border px-3 py-2">
                              <p className="max-w-[280px] truncate font-medium text-fg">{item?.name ?? 'Removed item'}</p>
                            </td>
                            <td className="tnum whitespace-nowrap border-b border-border px-3 py-2 font-medium text-fg">
                              {fmtNumber(line.qty)} <span className="text-[11px] font-normal text-fg-subtle">{item?.uom}</span>
                            </td>
                            <td className="tnum whitespace-nowrap border-b border-border px-3 py-2 text-fg-muted">
                              {line.estimatedUnitPrice ? (
                                fmtCurrency(line.estimatedUnitPrice, 'IDR')
                              ) : (
                                <Tooltip content="No estimate given — the item's standard cost is used instead">
                                  <span className="text-fg-subtle">{fmtCurrency(unit, 'IDR')} *</span>
                                </Tooltip>
                              )}
                            </td>
                            <td className="tnum whitespace-nowrap border-b border-border px-3 py-2 font-medium text-fg">{fmtCurrency(line.qty * unit, 'IDR', { compact: true })}</td>
                            <td className="border-b border-border px-3 py-2">
                              <p className="max-w-[320px] truncate text-[12px] text-fg-muted">{line.purpose}</p>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {request.note && (
                  <div className="border-t border-border bg-surface-sunken/60 px-4 py-2.5 text-[12px] text-fg-muted">{request.note}</div>
                )}
              </Card>
            )
          })}

          {notFiled.length > 0 && (
            <Card>
              <CardHeader title="Not filed yet" description="Active divisions that have not started a request in this session." />
              <CardBody className="flex flex-wrap gap-2">
                {notFiled.map((d) => (
                  <Badge key={d.id} tone="neutral" size="md">{d.code} · {d.name}</Badge>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {tab === 'recap' && (
        <Card>
          <CardHeader
            title="Recap preview"
            description="What locking produces: one line per item, with every division that asked for it kept as a source."
            icon={<Layers />}
            actions={<Badge tone="primary" size="md">{recap.length} lines from {stats.submitted} divisions</Badge>}
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  {['SKU', 'Item', 'Total qty', 'Requested by', 'Estimated value'].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recap.map((line) => {
                  const item = items.find((i) => i.id === line.itemId)
                  const value = line.sources.reduce(
                    (a, srcs) => a + srcs.qty * (srcs.estimatedUnitPrice ?? item?.standardCost ?? 0),
                    0,
                  )
                  return (
                    <tr key={line.id} className={line.sources.length > 1 ? 'bg-primary-soft/25' : undefined}>
                      <td className="whitespace-nowrap border-b border-border px-3 py-2.5 font-mono text-[11.5px] text-fg-muted">{item?.sku}</td>
                      <td className="border-b border-border px-3 py-2.5">
                        <p className="max-w-[260px] truncate font-medium text-fg">{item?.name ?? 'Removed item'}</p>
                        <p className="text-[11px] text-fg-subtle">{item?.category.replace(/_/g, ' ').toLowerCase()}</p>
                      </td>
                      <td className="tnum whitespace-nowrap border-b border-border px-3 py-2.5 font-semibold text-fg">
                        {fmtNumber(line.qty)} <span className="text-[11px] font-normal text-fg-subtle">{item?.uom}</span>
                      </td>
                      <td className="border-b border-border px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {line.sources.map((src) => {
                            const division = divisions.find((d) => d.id === src.divisionId)
                            return (
                              <Tooltip key={`${src.requestId}-${src.divisionId}`} content={`${division?.name}: ${src.qty} ${item?.uom}`}>
                                <span>
                                  <Badge tone={line.sources.length > 1 ? 'primary' : 'outline'} size="sm">
                                    {division?.code.replace('DIV-', '')} {src.qty}
                                  </Badge>
                                </span>
                              </Tooltip>
                            )
                          })}
                        </div>
                      </td>
                      <td className="tnum whitespace-nowrap border-b border-border px-3 py-2.5 text-right font-medium text-fg">
                        {fmtCurrency(value, 'IDR', { compact: true })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border bg-surface-sunken/60 px-4 py-3 text-[12px] text-fg-muted">
            <span>
              <span className="tnum font-semibold text-fg">{recap.filter((l) => l.sources.length > 1).length}</span> lines merge more than one division
            </span>
            <Separator vertical className="h-4" />
            <span>
              <span className="tnum font-semibold text-fg">{stats.lines}</span> request lines become{' '}
              <span className="tnum font-semibold text-fg">{recap.length}</span> purchase lines
            </span>
            <Separator vertical className="h-4" />
            <span>Highlighted rows are the merges.</span>
          </div>
        </Card>
      )}

      {/* ---------------- return a request ---------------- */}
      <Dialog open={!!returning} onOpenChange={(v) => !v && setReturning(null)}>
        <DialogContent
          size="md"
          title={`Return ${divisionOf(returning ?? ({} as MrRequest))?.name ?? ''}'s request`}
          description="It goes back to the division as returned, and stays out of the recap until they resubmit."
          icon={<CornerUpLeft />}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setReturning(null)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!reason.trim()}
                onClick={() => {
                  if (!returning) return
                  reviewMrRequest(returning.id, 'RETURNED', reason.trim())
                  toast.push({ tone: 'success', title: 'Request returned', description: 'The division can revise and submit again before the session closes.' })
                  setReturning(null)
                }}
              >
                Return the request
              </Button>
            </>
          }
        >
          <div className="p-5">
            <p className="mb-2 text-[12.5px] font-medium text-fg">Why is it going back?</p>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Say what has to change. The division sees this sentence and nothing else."
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ---------------- lock ---------------- */}
      <Dialog open={lockOpen} onOpenChange={setLockOpen}>
        <DialogContent
          size="md"
          title={`Lock ${session.code}`}
          description="This is one way. The submitted requests are frozen and merged into a purchase request in draft."
          icon={<Lock />}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setLockOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const result = lockMrSession(session.id)
                  setLockOpen(false)
                  if (!result.ok) {
                    toast.push({ tone: 'error', title: 'Lock refused', description: result.error })
                    return
                  }
                  toast.push({
                    tone: 'success',
                    title: 'Session locked',
                    description: `${recap.length} merged lines are now a purchase request in draft. Assign each line to a supplier next.`,
                  })
                  if (result.purchaseRequestId) nav(`/purchase-requests/${result.purchaseRequestId}`)
                }}
              >
                <Lock /> Lock and create the purchase request
              </Button>
            </>
          }
        >
          <div className="space-y-3 p-5 text-[13px] leading-relaxed text-fg-muted">
            <p>What happens when you lock:</p>
            <ul className="space-y-1.5">
              {[
                `${stats.submitted} division requests are merged into ${recap.length} purchase request lines.`,
                `${recap.filter((l) => l.sources.length > 1).length} of those lines combine more than one division, and keep each division's quantity as a source.`,
                'Every submitted request becomes approved and can no longer be edited by its division.',
                `${stats.drafts} draft and ${stats.returned} returned requests are left out.`,
                'The purchase request starts in draft, with no supplier assigned and no price agreed.',
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
