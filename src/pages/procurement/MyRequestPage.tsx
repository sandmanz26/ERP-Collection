import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, CalendarRange, CheckCircle2, ClipboardList, CornerUpLeft, Package, Plus, Send, Trash2,
} from 'lucide-react'
import type { MrRequest, MrRequestLine } from '@/data/types'
import { monthLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { useCurrentUser } from '@/store/useAuth'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Card, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { uid } from '@/lib/utils'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import { availableQty } from '@/lib/domain'
import { daysUntil } from '@/lib/domain'
import { mrRequestTotal, requestableItems } from '@/lib/procurement'

/**
 * The division head's page. It shows one thing: this division's request in the
 * session that is open right now. Everything else in the module is somebody
 * else's job.
 */
export function MyRequestPage() {
  const toast = useToast()
  const me = useCurrentUser()
  const { mrSessions, mrRequests, divisions, items, stock, upsertMrRequest, submitMrRequest } = useErp()
  const [draft, setDraft] = React.useState<MrRequest | null>(null)

  /* The division this account speaks for: the one it belongs to, or the one it heads. */
  const myDivision = React.useMemo(
    () => divisions.find((d) => d.id === me?.divisionId) ?? divisions.find((d) => d.headUserId === me?.id),
    [divisions, me],
  )
  const session = mrSessions.find((s) => s.status === 'OPEN')
  const existing = React.useMemo(
    () => (session && myDivision ? mrRequests.find((r) => r.sessionId === session.id && r.divisionId === myDivision.id) : undefined),
    [mrRequests, session, myDivision],
  )

  React.useEffect(() => {
    if (!session || !myDivision) {
      setDraft(null)
      return
    }
    setDraft(
      existing
        ? structuredClone(existing)
        : {
            id: uid('mrq'),
            code: `${session.code}/${myDivision.code}`,
            sessionId: session.id,
            divisionId: myDivision.id,
            status: 'DRAFT',
            lines: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
    )
  }, [existing, session, myDivision])

  const catalogue = React.useMemo(() => requestableItems(items, stock), [items, stock])
  const availableOf = (itemId: string) => stock.filter((s) => s.itemId === itemId).reduce((a, s) => a + availableQty(s), 0)

  if (!myDivision) {
    return (
      <EmptyState
        icon={<ClipboardList />}
        title="Your account is not attached to a division"
        description="A material request is filed by a division, so an administrator has to attach your account to one before you can file."
      />
    )
  }

  if (!session) {
    const last = mrSessions[0]
    return (
      <>
        <PageHeader title={`Material request — ${myDivision.name}`} description="Your division's request for the month." />
        <EmptyState
          icon={<CalendarRange />}
          title="No session is open right now"
          description={
            last
              ? `The most recent session, ${last.code}, is ${last.status.toLowerCase()}. Requests can only be filed while a session is open — an administrator opens one each month.`
              : 'Requests can only be filed while a session is open. An administrator opens one each month.'
          }
        />
      </>
    )
  }

  if (!draft) return null

  const locked = draft.status === 'SUBMITTED' || draft.status === 'APPROVED'
  const total = mrRequestTotal(draft, items)
  const daysLeft = daysUntil(session.closesAt)

  const patchLine = (lineId: string, patch: Partial<MrRequestLine>) =>
    setDraft((d) => (d ? { ...d, lines: d.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) } : d))

  const addLine = () => {
    const first = catalogue.find((i) => !draft.lines.some((l) => l.itemId === i.id))
    if (!first) {
      toast.push({ tone: 'warning', title: 'Nothing left to add', description: 'Every item the warehouse holds is already on this request.' })
      return
    }
    setDraft((d) =>
      d ? { ...d, lines: [...d.lines, { id: uid('mrl'), itemId: first.id, qty: 1, purpose: '' }] } : d,
    )
  }

  const validate = () => {
    if (draft.lines.length === 0) return 'Add at least one line before submitting.'
    if (draft.lines.some((l) => l.qty < 1)) return 'Every line needs a quantity of at least one.'
    if (draft.lines.some((l) => !l.purpose.trim())) return 'Every line needs a purpose — purchasing decides on that sentence.'
    const seen = new Set<string>()
    for (const line of draft.lines) {
      if (seen.has(line.itemId)) return 'The same item appears twice. Combine the quantities into one line.'
      seen.add(line.itemId)
    }
    return null
  }

  const save = (andSubmit: boolean) => {
    if (andSubmit) {
      const problem = validate()
      if (problem) {
        toast.push({ tone: 'error', title: 'Cannot submit yet', description: problem })
        return
      }
    }
    upsertMrRequest(draft)
    if (andSubmit) {
      submitMrRequest(draft.id)
      toast.push({
        tone: 'success',
        title: 'Request submitted',
        description: `${draft.lines.length} lines sent to purchasing. You can still be sent back a revision until ${fmtDate(session.closesAt)}.`,
      })
    } else {
      toast.push({ tone: 'success', title: 'Draft saved', description: 'Nobody sees it until you submit.' })
    }
  }

  return (
    <>
      <PageHeader
        title={`Material request — ${myDivision.name}`}
        description="Ask for what your division needs this month. Only items the warehouse already stocks can be requested; the price is an estimate and purchasing prices it properly later."
        meta={
          <>
            <StatusBadge value={draft.status} />
            <span className="font-mono text-[12px] text-fg-subtle">{draft.code}</span>
            <span className="text-[12.5px] text-fg-muted">
              {session.code} · {monthLabel(session.periodMonth)} {session.periodYear}
            </span>
            <span className={`text-[12.5px] ${daysLeft <= 2 ? 'font-medium text-danger' : 'text-fg-muted'}`}>
              Closes {fmtDate(session.closesAt)} · {daysLeft} days left
            </span>
            <span className="text-[12.5px] text-fg-muted">Cost centre {myDivision.costCenter}</span>
          </>
        }
        actions={
          locked ? (
            <Badge tone="success" size="lg">
              <CheckCircle2 className="size-3.5" /> Submitted {draft.submittedAt ? fmtDate(draft.submittedAt) : ''}
            </Badge>
          ) : (
            <>
              <Button variant="secondary" onClick={() => save(false)}>Save draft</Button>
              <Button variant="primary" onClick={() => save(true)}>
                <Send /> Submit to purchasing
              </Button>
            </>
          )
        }
      />

      {draft.status === 'RETURNED' && draft.returnReason && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-soft px-3.5 py-3 text-warning-soft-fg">
          <CornerUpLeft className="mt-px size-4 shrink-0" />
          <p className="text-[12.5px] leading-relaxed">
            <span className="font-semibold">Purchasing sent this back.</span> {draft.returnReason} Revise the lines below and submit again
            before {fmtDate(session.closesAt)}.
          </p>
        </div>
      )}

      {locked && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-border bg-surface-sunken px-3.5 py-3 text-fg-muted">
          <AlertTriangle className="mt-px size-4 shrink-0" />
          <p className="text-[12.5px] leading-relaxed">
            This request is with purchasing and can no longer be edited. If something has to change, ask them to send it back.
          </p>
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Lines" value={draft.lines.length} icon={<ClipboardList />} accent="primary" sub={`${fmtNumber(draft.lines.reduce((a, l) => a + l.qty, 0))} units in total`} />
        <KpiCard label="Estimated value" value={fmtCurrency(total, 'IDR', { compact: true })} icon={<Send />} accent="accent" sub="your estimate, or standard cost" />
        <KpiCard label="Items you can request" value={catalogue.length} icon={<Package />} accent="purple" sub="active master items the warehouse holds" />
        <KpiCard
          label="Session closes"
          value={`${daysLeft}d`}
          icon={<CalendarRange />}
          accent={daysLeft <= 2 ? 'danger' : 'primary'}
          sub={fmtDate(session.closesAt)}
        />
      </div>

      <Card>
        <CardHeader
          title="What your division needs"
          icon={<ClipboardList />}
          description="One line per item. Purchasing merges your line with the other divisions asking for the same thing."
          actions={
            !locked ? (
              <Button variant="secondary" size="sm" onClick={addLine}>
                <Plus /> Add a line
              </Button>
            ) : undefined
          }
        />

        {draft.lines.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title="Nothing requested yet"
            description="Add the items your division needs this month. Only what the warehouse already stocks can be asked for."
            action={!locked ? <Button variant="primary" size="sm" onClick={addLine}><Plus /> Add a line</Button> : undefined}
          />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  {['Item', 'In warehouse', 'Qty', 'Estimate / unit', 'Line value', 'Purpose', ''].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {draft.lines.map((line) => {
                  const item = items.find((i) => i.id === line.itemId)
                  const unit = line.estimatedUnitPrice ?? item?.standardCost ?? 0
                  const onHand = availableOf(line.itemId)
                  return (
                    <tr key={line.id}>
                      <td className="border-b border-border px-3 py-2 align-top">
                        {locked ? (
                          <div className="min-w-0">
                            <p className="max-w-[280px] truncate font-medium text-fg">{item?.name}</p>
                            <p className="font-mono text-[11px] text-fg-subtle">{item?.sku}</p>
                          </div>
                        ) : (
                          <Select
                            size="sm"
                            searchable
                            className="min-w-[260px]"
                            value={line.itemId}
                            onChange={(v) => patchLine(line.id, { itemId: v })}
                            options={catalogue.map((i) => ({
                              value: i.id,
                              label: i.name,
                              description: `${i.sku} · ${i.uom} · ${fmtNumber(availableOf(i.id))} available`,
                              group: i.category.replace(/_/g, ' ').toLowerCase(),
                              disabled: i.id !== line.itemId && draft.lines.some((l) => l.itemId === i.id),
                            }))}
                          />
                        )}
                      </td>
                      <td className="tnum whitespace-nowrap border-b border-border px-3 py-2 align-top text-[12px] text-fg-muted">
                        <Tooltip content="Unreserved quantity across every warehouse">
                          <span>{fmtNumber(onHand)} {item?.uom}</span>
                        </Tooltip>
                      </td>
                      <td className="border-b border-border px-3 py-2 align-top">
                        {locked ? (
                          <span className="tnum font-medium text-fg">{fmtNumber(line.qty)}</span>
                        ) : (
                          <Input
                            type="number"
                            min={1}
                            value={line.qty}
                            onChange={(e) => patchLine(line.id, { qty: Number(e.target.value) })}
                            className="tnum h-8 w-[86px] text-[12.5px]"
                          />
                        )}
                      </td>
                      <td className="border-b border-border px-3 py-2 align-top">
                        {locked ? (
                          <span className="tnum text-fg-muted">{line.estimatedUnitPrice ? fmtCurrency(line.estimatedUnitPrice, 'IDR') : '—'}</span>
                        ) : (
                          <Input
                            type="number"
                            step={1_000}
                            placeholder="optional"
                            value={line.estimatedUnitPrice ?? ''}
                            onChange={(e) => patchLine(line.id, { estimatedUnitPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
                            className="tnum h-8 w-[132px] text-[12.5px]"
                          />
                        )}
                      </td>
                      <td className="tnum whitespace-nowrap border-b border-border px-3 py-2 align-top font-medium text-fg">
                        {fmtCurrency(line.qty * unit, 'IDR', { compact: true })}
                      </td>
                      <td className="border-b border-border px-3 py-2 align-top">
                        {locked ? (
                          <p className="max-w-[280px] text-[12px] text-fg-muted">{line.purpose}</p>
                        ) : (
                          <Input
                            value={line.purpose}
                            onChange={(e) => patchLine(line.id, { purpose: e.target.value })}
                            placeholder="Why it is needed"
                            className="h-8 min-w-[220px] text-[12.5px]"
                          />
                        )}
                      </td>
                      <td className="border-b border-border px-2 py-2 align-top">
                        {!locked && (
                          <Button
                            variant="ghost"
                            size="iconSm"
                            className="text-danger hover:bg-danger-soft"
                            aria-label="Remove line"
                            onClick={() => setDraft((d) => (d ? { ...d, lines: d.lines.filter((l) => l.id !== line.id) } : d))}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <CardFooter className="flex-col items-stretch gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px]">
            <span className="text-fg-muted">
              Lines <span className="tnum ml-1 font-semibold text-fg">{draft.lines.length}</span>
            </span>
            <span className="text-fg-muted">
              Units <span className="tnum ml-1 font-semibold text-fg">{fmtNumber(draft.lines.reduce((a, l) => a + l.qty, 0))}</span>
            </span>
            <span className="text-fg-muted">
              Estimated value <span className="tnum ml-1 font-semibold text-fg">{fmtCurrency(total, 'IDR')}</span>
            </span>
          </div>
          {!locked && (
            <Field label="Note to purchasing" hint="optional">
              <Textarea
                value={draft.note ?? ''}
                onChange={(e) => setDraft((d) => (d ? { ...d, note: e.target.value } : d))}
                rows={2}
                placeholder="Anything purchasing should know — a deadline, a project this is tied to."
              />
            </Field>
          )}
          {locked && draft.note && <p className="text-[12.5px] text-fg-muted">Note: {draft.note}</p>}
        </CardFooter>
      </Card>

      <p className="mt-4 text-[12px] leading-relaxed text-fg-subtle">
        Only items already held in a warehouse can be requested — {catalogue.length} of {items.length} master items qualify. Anything
        genuinely new has to be added to the{' '}
        <Link to="/inventory/items" className="font-medium text-primary hover:underline">item master</Link> first, which is the
        warehouse team's call rather than a request.
      </p>
    </>
  )
}
