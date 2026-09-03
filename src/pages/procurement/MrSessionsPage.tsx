import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarRange, CheckCircle2, Eye, Lock, Plus, Send, Users } from 'lucide-react'
import type { MrSession } from '@/data/types'
import { MONTHS, monthLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { uid } from '@/lib/utils'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate } from '@/lib/format'
import { daysUntil } from '@/lib/domain'
import { sessionStats } from '@/lib/procurement'

const nextPeriod = (sessions: MrSession[]) => {
  const now = new Date()
  let month = now.getMonth() + 1
  let year = now.getFullYear()
  while (sessions.some((s) => s.periodMonth === month && s.periodYear === year)) {
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return { month, year }
}

function SessionForm({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: MrSession | null
}) {
  const { mrSessions, upsertMrSession } = useErp()
  const toast = useToast()
  const [draft, setDraft] = React.useState<MrSession | null>(null)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (!open) return
    if (initial) {
      setDraft(structuredClone(initial))
    } else {
      const { month, year } = nextPeriod(mrSessions)
      const opens = new Date(year, month - 1, 1, 8)
      const closes = new Date(year, month - 1, 10, 17)
      setDraft({
        id: uid('ses'),
        code: `MR-${year}-${String(month).padStart(2, '0')}`,
        title: `Material Request ${year}-${String(month).padStart(2, '0')}`,
        periodMonth: month,
        periodYear: year,
        opensAt: opens.toISOString(),
        closesAt: closes.toISOString(),
        status: 'DRAFT',
        createdBy: '',
        createdAt: new Date().toISOString(),
      })
    }
    setErrors({})
  }, [open, initial, mrSessions])

  if (!draft) return null
  const set = <K extends keyof MrSession>(k: K, v: MrSession[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.code.trim()) e.code = 'A session code is required'
    if (mrSessions.some((s) => s.code === draft.code && s.id !== draft.id)) e.code = 'This code is already used'
    if (mrSessions.some((s) => s.periodMonth === draft.periodMonth && s.periodYear === draft.periodYear && s.id !== draft.id)) {
      e.period = 'A session already exists for that month. One session per period, so requests cannot be split across two.'
    }
    if (new Date(draft.closesAt) <= new Date(draft.opensAt)) e.window = 'The closing date has to fall after the opening date'
    setErrors(e)
    if (Object.keys(e).length) return
    upsertMrSession(draft)
    toast.push({
      tone: 'success',
      title: initial ? 'Session updated' : 'Session created',
      description: `${draft.code} — divisions can file between ${fmtDate(draft.opensAt)} and ${fmtDate(draft.closesAt)}.`,
    })
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-2xl"
      eyebrow={<Badge tone={initial ? 'primary' : 'accent'} size="sm">{initial ? `Editing ${initial.code}` : 'New session'}</Badge>}
      title={initial ? initial.title : 'Open a material request session'}
      description="One session per month. Divisions file inside the window; purchasing closes it and locks it into a purchase request."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save}>{initial ? 'Save changes' : 'Create session'}</Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Session code" required error={errors.code}>
          <Input value={draft.code} onChange={(e) => set('code', e.target.value.toUpperCase())} className="font-mono" invalid={!!errors.code} />
        </Field>
        <Field label="Status">
          <Select
            value={draft.status}
            onChange={(v) => set('status', v)}
            disabled={initial?.status === 'LOCKED'}
            options={[
              { value: 'DRAFT', label: 'Draft', description: 'Prepared; divisions cannot file yet' },
              { value: 'OPEN', label: 'Open', description: 'Divisions can file and submit' },
              { value: 'CLOSED', label: 'Closed', description: 'No more filing; waiting to be locked' },
              { value: 'CANCELLED', label: 'Cancelled', description: 'Abandoned without a purchase request' },
            ]}
          />
        </Field>
        <Field label="Title" className="sm:col-span-2">
          <Input value={draft.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Period month" required error={errors.period}>
          <Select
            value={String(draft.periodMonth)}
            onChange={(v) => set('periodMonth', Number(v))}
            options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
          />
        </Field>
        <Field label="Period year">
          <Input type="number" value={draft.periodYear} onChange={(e) => set('periodYear', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Opens" required error={errors.window}>
          <DatePicker value={draft.opensAt} onChange={(v) => set('opensAt', v ?? draft.opensAt)} quickRanges={false} />
        </Field>
        <Field label="Closes" required help="After this date the divisions can no longer submit; purchasing takes over.">
          <DatePicker value={draft.closesAt} onChange={(v) => set('closesAt', v ?? draft.closesAt)} min={draft.opensAt} quickRanges={false} />
        </Field>
        <Field label="Note" className="sm:col-span-2">
          <Textarea value={draft.note ?? ''} onChange={(e) => set('note', e.target.value)} rows={2} placeholder="Anything the divisions should know before they file." />
        </Field>
      </div>
    </Sheet>
  )
}

export function MrSessionsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const can = useCan()
  const { mrSessions, mrRequests, divisions, items, purchaseRequests, setSessionStatus } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<MrSession | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [year, setYear] = React.useState<string[]>([])

  const statsOf = (s: MrSession) => sessionStats(s, mrRequests, divisions, items)
  const openSession = mrSessions.find((s) => s.status === 'OPEN')
  const openStats = openSession ? statsOf(openSession) : null

  const columns: Column<MrSession>[] = [
    {
      key: 'code', header: 'Session', width: 'w-[150px]', pinned: true, sortable: true,
      sortValue: (r) => `${r.periodYear}${String(r.periodMonth).padStart(2, '0')}`, exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-mono text-[12px] font-medium text-fg">{r.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{monthLabel(r.periodMonth)} {r.periodYear}</p>
        </div>
      ),
    },
    {
      key: 'window', header: 'Filing window', width: 'w-[196px]', sortable: true,
      sortValue: (r) => r.closesAt, exportValue: (r) => `${r.opensAt.slice(0, 10)} → ${r.closesAt.slice(0, 10)}`,
      cell: (r) => {
        const left = daysUntil(r.closesAt)
        return (
          <div className="min-w-0">
            <p className="tnum text-[12.5px] text-fg">{fmtDate(r.opensAt)} – {fmtDate(r.closesAt)}</p>
            {r.status === 'OPEN' && (
              <p className={`tnum text-[11px] ${left <= 2 ? 'text-danger' : 'text-warning'}`}>
                {left < 0 ? `closed ${Math.abs(left)}d ago` : `${left} days left to file`}
              </p>
            )}
          </div>
        )
      },
    },
    {
      key: 'status', header: 'Status', width: 'w-[124px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" tone={r.status === 'LOCKED' ? 'purple' : undefined} />,
    },
    {
      key: 'divisions', header: 'Divisions filed', width: 'w-[172px]', sortable: true,
      sortValue: (r) => statsOf(r).submitted, exportValue: (r) => `${statsOf(r).submitted}/${statsOf(r).eligibleDivisions}`,
      headerHint: 'Submitted, against the divisions that could file',
      cell: (r) => {
        const s = statsOf(r)
        const pct = s.eligibleDivisions ? Math.round((s.submitted / s.eligibleDivisions) * 100) : 0
        return (
          <div className="w-[144px]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="tnum text-[12.5px] font-medium text-fg">{s.submitted}<span className="text-fg-subtle"> / {s.eligibleDivisions}</span></span>
              {s.drafts > 0 && <span className="tnum text-[11px] text-warning">{s.drafts} draft</span>}
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-soft">
              <div className={`h-full rounded-full ${pct === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    },
    {
      key: 'lines', header: 'Lines', width: 'w-[92px]', align: 'right', sortable: true,
      sortValue: (r) => statsOf(r).lines, exportValue: (r) => statsOf(r).lines,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{statsOf(r).lines}</span>,
    },
    {
      key: 'merged', header: 'Merges to', width: 'w-[116px]', align: 'right', sortable: true,
      sortValue: (r) => statsOf(r).mergedItems, exportValue: (r) => statsOf(r).mergedItems,
      headerHint: 'Distinct items once every division request is merged',
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{statsOf(r).mergedItems} items</span>,
    },
    {
      key: 'estimate', header: 'Estimated value', width: 'w-[160px]', align: 'right', sortable: true,
      sortValue: (r) => statsOf(r).estimate, exportValue: (r) => Math.round(statsOf(r).estimate),
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{fmtCurrency(statsOf(r).estimate, 'IDR', { compact: true })}</span>,
    },
    {
      key: 'pr', header: 'Purchase request', width: 'w-[168px]', sortable: true,
      sortValue: (r) => r.purchaseRequestId ?? 'zzz', exportValue: (r) => purchaseRequests.find((p) => p.id === r.purchaseRequestId)?.code ?? '',
      cell: (r) => {
        const pr = purchaseRequests.find((p) => p.id === r.purchaseRequestId)
        if (!pr) return <span className="text-[12px] text-fg-subtle">not locked yet</span>
        return (
          <button
            onClick={(e) => {
              e.stopPropagation()
              nav(`/purchase-requests/${pr.id}`)
            }}
            className="min-w-0 text-left"
          >
            <span className="block truncate font-mono text-[12px] font-medium text-primary hover:underline">{pr.code}</span>
            <span className="block text-[11px] text-fg-subtle">{pr.status.toLowerCase()}</span>
          </button>
        )
      },
    },
    {
      key: 'locked', header: 'Locked', width: 'w-[160px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.lockedAt ?? '', exportValue: (r) => r.lockedAt?.slice(0, 10) ?? '',
      cell: (r) =>
        r.lockedAt ? (
          <div className="min-w-0">
            <p className="tnum text-[12px] text-fg-muted">{fmtDate(r.lockedAt)}</p>
            <p className="truncate text-[11px] text-fg-subtle">{r.lockedBy}</p>
          </div>
        ) : (
          <span className="text-[12px] text-fg-subtle">—</span>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Material Requests"
        description="One session per month. Divisions file what they need, purchasing reviews every request, then locks the session into a single purchase request."
        actions={
          can('mr.create') ? (
            <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus /> New session
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open session"
          value={openSession ? openSession.code : 'None'}
          icon={<CalendarRange />}
          accent={openSession ? 'primary' : 'neutral'}
          sub={openSession ? `closes ${fmtDate(openSession.closesAt)} · ${daysUntil(openSession.closesAt)} days left` : 'no session is accepting requests'}
          onClick={openSession ? () => nav(`/mr/${openSession.id}`) : undefined}
        />
        <KpiCard
          label="Divisions filed"
          value={openStats ? `${openStats.submitted} / ${openStats.eligibleDivisions}` : '—'}
          icon={<Users />}
          accent={openStats && openStats.submitted === openStats.eligibleDivisions ? 'success' : 'warning'}
          sub={openStats ? `${openStats.drafts} still in draft · ${openStats.notFiled} not started` : 'no open session'}
        />
        <KpiCard
          label="Estimated value"
          value={openStats ? fmtCurrency(openStats.estimate, 'IDR', { compact: true }) : '—'}
          icon={<Send />}
          accent="accent"
          sub={openStats ? `${openStats.qty} units across ${openStats.mergedItems} items` : 'nothing submitted yet'}
        />
        <KpiCard
          label="Locked this year"
          value={mrSessions.filter((s) => s.status === 'LOCKED' && s.periodYear === new Date().getFullYear()).length}
          icon={<Lock />}
          accent="purple"
          sub={`${purchaseRequests.length} purchase requests raised`}
        />
      </div>

      <DataTable
        data={mrSessions}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => r.code}
        entityLabel="session"
        storageKey="mr-sessions"
        allowExport={can('mr.view')}
        exportName="tata-gemilang-mr-sessions"
        searchText={(r) => [r.code, r.title, monthLabel(r.periodMonth), String(r.periodYear), r.note, r.lockedBy].filter(Boolean).join(' ')}
        initialSort={{ key: 'code', dir: 'desc' }}
        onRowClick={(r) => nav(`/mr/${r.id}`)}
        rowTone={(r) => (r.status === 'OPEN' ? 'bg-primary-soft/30' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['DRAFT', 'OPEN', 'CLOSED', 'LOCKED', 'CANCELLED'].map((v) => ({ value: v, label: v.toLowerCase() })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'year', label: 'Year', values: year, onChange: setYear,
            options: Array.from(new Set(mrSessions.map((s) => String(s.periodYear)))).map((y) => ({ value: y, label: y })),
            match: (r, v) => v.includes(String(r.periodYear)),
          },
        ]}
        rowActions={(r) => (
          <>
            <Tooltip content="Open the session">
              <Button variant="ghost" size="iconXs" onClick={() => nav(`/mr/${r.id}`)}>
                <Eye />
              </Button>
            </Tooltip>
            {can('mr.create') && r.status === 'DRAFT' && (
              <Tooltip content="Open for filing">
                <Button
                  variant="ghost"
                  size="iconXs"
                  onClick={() => {
                    setSessionStatus(r.id, 'OPEN')
                    toast.push({ tone: 'success', title: `${r.code} is open`, description: 'Divisions can file until the closing date.' })
                  }}
                >
                  <Send />
                </Button>
              </Tooltip>
            )}
            {can('mr.review') && r.status === 'OPEN' && (
              <Tooltip content="Close for filing">
                <Button
                  variant="ghost"
                  size="iconXs"
                  onClick={() => {
                    setSessionStatus(r.id, 'CLOSED')
                    toast.push({ tone: 'success', title: `${r.code} closed`, description: 'No further requests can be submitted. Review, then lock it.' })
                  }}
                >
                  <CheckCircle2 />
                </Button>
              </Tooltip>
            )}
          </>
        )}
        footerSummary={(rows) => (
          <span className="tnum">
            {fmtCurrency(rows.reduce((a, r) => a + statsOf(r).estimate, 0), 'IDR', { compact: true })} requested in this view
          </span>
        )}
        emptyTitle="No sessions yet"
        emptyDescription="Open the first monthly session so divisions can start filing."
      />

      <SessionForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />
    </>
  )
}
