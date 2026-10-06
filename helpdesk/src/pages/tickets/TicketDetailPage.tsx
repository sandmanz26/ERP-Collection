import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Ban, BookOpen, Check, ChevronDown, CircleDot, Clock3, Copy, Flag, Lock, MessageSquare, MoreHorizontal, Paperclip, Pause, Play, RotateCcw, Send, Sparkles, UserPlus, Wrench, CheckCircle2, Zap,
} from 'lucide-react'
import { Avatar, EmptyState, Separator } from '@/components/ui/misc'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/input'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { Icon } from '@/components/shared/icons'
import { PriorityBadge, SlaMeter, StatusBadge, UserChip, WoStatusBadge } from '@/components/shared/badges'
import { Stars } from '@/components/shared/Stars'
import { useLookups, useSpaceLabel } from '@/hooks/useLookups'
import { useMe, useStore } from '@/store/useStore'
import { fmtAgo, fmtDateTime, fmtDuration } from '@/lib/format'
import { CHANNEL_LABEL, PENDING_LABEL, PRIORITY } from '@/lib/labels'
import { isOpenStatus, policyFor } from '@/lib/sla'
import { cn } from '@/lib/utils'
import type { Activity, PendingReason, Priority, Ticket } from '@/data/types'

export function TicketDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const me = useMe()!
  const ticket = useStore((s) => s.tickets.find((t) => t.id === id))
  if (!ticket || (me.role === 'requester' && ticket.requesterId !== me.id)) {
    return <EmptyState icon={<Flag />} title="We cannot find that ticket" description="It may have been removed, or it belongs to someone else." action={<Button variant="secondary" onClick={() => nav(-1)}><ArrowLeft /> Go back</Button>} className="py-24" />
  }
  return me.role === 'requester' ? <RequesterView t={ticket} /> : <StaffView t={ticket} />
}

/* ------------------------------------------------------------------ shared timeline */

function Timeline({ t, staff }: { t: Ticket; staff: boolean }) {
  const { user } = useLookups()
  const items = t.activity.filter((a) => (staff ? true : a.type !== 'note' && a.type !== 'assign' && a.type !== 'workorder' && a.type !== 'priority'))
  return (
    <ol className="space-y-4">
      {items.map((a) => (
        <TimelineItem key={a.id} a={a} t={t} name={(i?: string | null) => (i ? user.get(i)?.name ?? 'Someone' : 'Atrium')} staff={staff} />
      ))}
    </ol>
  )
}

function eventText(a: Activity, name: (i?: string | null) => string) {
  switch (a.type) {
    case 'status': return a.to === 'in_progress' && a.from === 'resolved' ? a.body ?? 'Reopened' : `${name(a.actorId)} changed status to ${a.to?.replace('_', ' ')}${a.body ? ` — ${a.body}` : ''}`
    case 'assign': return `${name(a.actorId)} · ${a.body}`
    case 'priority': return `${name(a.actorId)} changed priority ${a.from?.toUpperCase()} → ${a.to?.toUpperCase()}`
    case 'workorder': return `${name(a.actorId)} · ${a.body}`
    case 'csat': return `${name(a.actorId)} rated the service ${a.to}/5${a.body ? ` — “${a.body}”` : ''}`
    default: return a.body ?? ''
  }
}

function TimelineItem({ a, t, name, staff }: { a: Activity; t: Ticket; name: (i?: string | null) => string; staff: boolean }) {
  const isMsg = a.type === 'comment' || a.type === 'created' || a.type === 'note'
  if (!isMsg) {
    return (
      <li className="flex items-center gap-3 pl-1 text-[12.5px] text-fg-muted">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-neutral-soft text-fg-subtle">
          {a.type === 'status' ? <CircleDot className="size-3.5" /> : a.type === 'assign' ? <UserPlus className="size-3.5" /> : a.type === 'workorder' ? <Wrench className="size-3.5" /> : a.type === 'csat' ? <Sparkles className="size-3.5" /> : <Zap className="size-3.5" />}
        </span>
        <span className="min-w-0 flex-1">{eventText(a, name)}</span>
        <time className="shrink-0 text-[11.5px] text-fg-subtle" title={fmtDateTime(a.at)}>{fmtAgo(a.at)}</time>
      </li>
    )
  }
  const note = a.type === 'note'
  const mine = a.actorId === t.requesterId
  return (
    <li className="flex gap-3">
      <Avatar name={name(a.actorId)} className="mt-0.5 size-8 text-[11px]" />
      <div className={cn('min-w-0 flex-1 rounded-xl border px-3.5 py-2.5', note ? 'border-warning/40 bg-warning-soft/60' : mine ? 'border-border bg-surface' : 'border-primary/20 bg-primary-soft/40')}>
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[13px] font-semibold">{name(a.actorId)}</span>
          {a.type === 'created' && <Badge size="sm" tone="neutral">Opened this ticket</Badge>}
          {note && <Badge size="sm" tone="warning"><Lock className="size-3" /> Internal note</Badge>}
          {staff && !note && !mine && a.type === 'comment' && <Badge size="sm" tone="primary">Reply to requester</Badge>}
          <time className="ml-auto text-[11.5px] text-fg-subtle" title={fmtDateTime(a.at)}>{fmtAgo(a.at)}</time>
        </div>
        <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">{a.body}</p>
        {a.type === 'created' && t.attachments && t.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">{t.attachments.map((f, i) => <span key={i} className="inline-flex items-center gap-1.5 rounded-md bg-neutral-soft px-2 py-1 text-[12px]"><Paperclip className="size-3" />{f}</span>)}</div>
        )}
      </div>
    </li>
  )
}

function Composer({ t, staff }: { t: Ticket; staff: boolean }) {
  const comment = useStore((s) => s.comment)
  const canned = useStore((s) => s.canned)
  const { user } = useLookups()
  const [mode, setMode] = React.useState<'reply' | 'note'>('reply')
  const [text, setText] = React.useState('')
  const toast = useToast()
  const closed = t.status === 'closed' || t.status === 'cancelled'
  if (closed) return <p className="rounded-xl bg-surface-sunken px-4 py-3 text-center text-[13px] text-fg-muted">This ticket is {t.status}. {staff ? 'Reopen it to continue the conversation.' : 'Raise a new request if the problem comes back.'}</p>
  const send = () => {
    if (!text.trim()) return
    comment(t.id, text.trim(), mode === 'note')
    setText('')
    toast.push({ tone: 'success', title: mode === 'note' ? 'Internal note added' : staff ? 'Reply sent' : 'Reply sent to the team' })
  }
  const first = user.get(t.requesterId)?.name.split(' ')[0] ?? 'there'
  return (
    <div className={cn('rounded-xl border bg-surface shadow-card focus-within:ring-[3px] focus-within:ring-primary/16', mode === 'note' ? 'border-warning/50' : 'border-border-strong/70')}>
      {staff && (
        <div className="flex items-center gap-1 border-b border-border px-2 pt-1.5">
          <Tabs value={mode} onChange={setMode} items={[{ value: 'reply', label: 'Reply to requester', icon: <MessageSquare /> }, { value: 'note', label: 'Internal note', icon: <Lock /> }]} className="border-0" />
        </div>
      )}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send() }}
        placeholder={mode === 'note' ? 'Only staff can see this…' : staff ? `Reply to ${first}…` : 'Add a comment or answer a question…'}
        aria-label={mode === 'note' ? 'Internal note' : 'Reply'}
        className="min-h-[88px] resize-none rounded-none border-0 bg-transparent shadow-none focus:ring-0"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-2.5 py-2">
        <div className="flex items-center gap-1">
          {staff && mode === 'reply' && (
            <Menu>
              <MenuTrigger asChild><Button variant="ghost" size="sm"><Sparkles /> Canned reply <ChevronDown className="!size-3" /></Button></MenuTrigger>
              <MenuContent align="start" className="w-72">
                <MenuLabel>Insert a template</MenuLabel>
                {canned.map((c) => <MenuItem key={c.id} onSelect={() => setText((x) => (x ? x + '\n\n' : '') + c.body.replace('{{name}}', first))}>{c.title}</MenuItem>)}
              </MenuContent>
            </Menu>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11.5px] text-fg-subtle sm:inline">⌘↵ to send</span>
          <Button variant="primary" size="sm" onClick={send} disabled={!text.trim()}><Send /> {mode === 'note' ? 'Add note' : 'Send'}</Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ requester */

const STEPS = [
  { key: 'new', label: 'Received' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
]

function RequesterView({ t }: { t: Ticket }) {
  const { category, team } = useLookups()
  const spaceLabel = useSpaceLabel()
  const confirmResolved = useStore((s) => s.confirmResolved)
  const reopen = useStore((s) => s.reopen)
  const setStatus = useStore((s) => s.setStatus)
  const toast = useToast()
  const [score, setScore] = React.useState(0)
  const [fb, setFb] = React.useState('')
  const [reopening, setReopening] = React.useState(false)
  const [why, setWhy] = React.useState('')
  const cat = category.get(t.categoryId)
  const idx = t.status === 'closed' ? 3 : Math.max(0, STEPS.findIndex((s) => s.key === (t.status === 'pending' ? 'in_progress' : t.status)))
  const pol = policyFor(t.priority)

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link to="/requests" className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> My requests</Link>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2"><span className="tnum text-[13px] text-fg-subtle">{t.number}</span><StatusBadge status={t.status} pending={t.pendingReason ? PENDING_LABEL[t.pendingReason] : undefined} /></div>
        <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.025em]">{t.title}</h1>
      </div>

      {t.status !== 'cancelled' && (
        <ol className="grid grid-cols-4 gap-2" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s.key} className="space-y-1.5">
              <div className={cn('h-1.5 rounded-full', i <= idx ? 'bg-primary' : 'bg-neutral-soft')} />
              <p className={cn('text-[12px]', i <= idx ? 'font-semibold text-fg' : 'text-fg-subtle')}>{s.label}</p>
            </li>
          ))}
        </ol>
      )}

      {t.status === 'pending' && t.pendingReason === 'requester' && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-[13.5px] text-warning-soft-fg"><MessageSquare className="mt-0.5 size-4 shrink-0" /><p><strong>We are waiting for your reply.</strong> Answer below and the team will pick it straight back up.</p></div>
      )}

      {t.status === 'resolved' && (
        <Card className="border-success/40">
          <CardBody className="space-y-4">
            <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-success-soft text-success"><CheckCircle2 className="size-5" /></span>
              <div><p className="text-[15px] font-semibold">Is this fixed?</p><p className="mt-0.5 text-[13px] text-fg-muted">{t.resolutionNote ?? 'The team marked this as resolved.'}</p></div></div>
            <Field label="How was the service?"><Stars value={score} onChange={setScore} size="lg" /></Field>
            {score > 0 && <Textarea rows={2} value={fb} onChange={(e) => setFb(e.target.value)} placeholder="Anything we should know? (optional)" />}
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => { confirmResolved(t.id, score ? { score, comment: fb || undefined } : undefined); toast.push({ tone: 'success', title: 'Thanks — ticket closed', description: score ? 'Your rating helps us improve.' : undefined }) }}>Yes, it is fixed</Button>
              <Button variant="secondary" onClick={() => setReopening(true)}><RotateCcw /> Not yet</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <Timeline t={t} staff={false} />
          <Composer t={t} staff={false} />
        </div>
        <aside className="space-y-4">
          <Card>
            <CardBody className="space-y-3.5 text-[13px]">
              <Row k="Category"><span className="inline-flex items-center gap-1.5"><Icon name={cat?.icon ?? ''} className="size-3.5 text-primary" />{cat?.name}</span></Row>
              <Row k="Location">{spaceLabel(t.spaceId)}</Row>
              <Row k="Handled by">{t.assigneeId ? <UserChip id={t.assigneeId} size="sm" /> : <span className="text-fg-muted">{team.get(t.teamId)?.name} — not yet picked up</span>}</Row>
              <Row k="Opened">{fmtDateTime(t.createdAt)}</Row>
              {isOpenStatus(t.status) && <Row k="Expected"><span>First reply within {fmtDuration(pol.responseMin * 60_000)}{pol.calendar === 'business' ? ' (working hours)' : ''}</span></Row>}
              <Row k="Priority"><PriorityBadge priority={t.priority} /></Row>
              {t.csat && <Row k="Your rating"><Stars value={t.csat.score} readOnly size="sm" /></Row>}
            </CardBody>
          </Card>
          {(t.status === 'new' || t.status === 'assigned') && (
            <Button variant="outlineDanger" className="w-full" onClick={() => { setStatus(t.id, 'cancelled', { note: 'Cancelled by requester' }); toast.push({ tone: 'info', title: `${t.number} cancelled` }) }}><Ban /> Cancel this request</Button>
          )}
        </aside>
      </div>

      <Dialog open={reopening} onOpenChange={setReopening}>
        <DialogContent size="sm" title="Tell us what is still wrong" description="We will put it straight back with the team." footer={<><Button variant="ghost" onClick={() => setReopening(false)}>Cancel</Button><Button variant="primary" disabled={!why.trim()} onClick={() => { reopen(t.id, why.trim()); setReopening(false); setWhy('') }}>Reopen</Button></>}>
          <div className="p-5"><Textarea autoFocus rows={4} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="e.g. It was cold again this morning." /></div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const Row = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[88px_1fr] items-start gap-2 text-[13px]"><span className="text-fg-muted">{k}</span><span className="min-w-0 break-words">{children}</span></div>
)

/* ------------------------------------------------------------------ staff */

function StaffView({ t }: { t: Ticket }) {
  const me = useMe()!
  const nav = useNavigate()
  const { user, asset, space, building, team } = useLookups()
  const users = useStore((s) => s.users)
  const tickets = useStore((s) => s.tickets)
  const workOrders = useStore((s) => s.workOrders)
  const kb = useStore((s) => s.kb)
  const { setStatus, assign, setPriority, createWorkOrder, reopen, patchTicket } = useStore.getState()
  const toast = useToast()
  const spaceLabel = useSpaceLabel()
  const [dlg, setDlg] = React.useState<null | 'resolve' | 'pending' | 'cancel' | 'reopen'>(null)
  const [note, setNote] = React.useState('')
  const [reason, setReason] = React.useState<PendingReason>('requester')
  const [tab, setTab] = React.useState<'conversation' | 'related'>('conversation')

  const req = user.get(t.requesterId)
  const a = t.assetId ? asset.get(t.assetId) : undefined
  const wos = workOrders.filter((w) => t.workOrderIds.includes(w.id))
  const sameAsset = tickets.filter((x) => x.assetId && x.assetId === t.assetId && x.id !== t.id).sort((p, q) => q.createdAt.localeCompare(p.createdAt))
  const sameRequester = tickets.filter((x) => x.requesterId === t.requesterId && x.id !== t.id).sort((p, q) => q.createdAt.localeCompare(p.createdAt)).slice(0, 5)
  const suggestedKb = kb.filter((k) => k.categoryId === t.categoryId).slice(0, 2)
  const open = isOpenStatus(t.status)

  const staffUsers = users.filter((u) => u.role !== 'requester')
  const load = (id: string) => tickets.filter((x) => x.assigneeId === id && isOpenStatus(x.status)).length
  const assigneeOptions = [...staffUsers]
    .sort((x, y) => Number(y.teamId === t.teamId) - Number(x.teamId === t.teamId) || load(x.id) - load(y.id))
    .map((u) => ({ value: u.id, label: u.name, description: `${u.title} · ${load(u.id)} open`, group: u.teamId === t.teamId ? `${team.get(t.teamId)?.name} (suggested)` : 'Everyone else' }))

  const doResolve = () => { setStatus(t.id, 'resolved', { note: note.trim() }); setDlg(null); setNote(''); toast.push({ tone: 'success', title: `${t.number} resolved`, description: `${req?.name.split(' ')[0]} will be asked to confirm.` }) }
  const doPending = () => { setStatus(t.id, 'pending', { reason, note: note.trim() || undefined }); setDlg(null); setNote(''); toast.push({ tone: 'info', title: 'SLA clock paused', description: PENDING_LABEL[reason] }) }
  const doWo = () => {
    const wo = createWorkOrder({ title: t.title, ticketId: t.id, priority: t.priority, assigneeId: t.assigneeId ?? me.id })
    toast.push({ tone: 'success', title: `${wo.number} created`, action: { label: 'Open', onClick: () => nav(`/work-orders/${wo.id}`) } })
  }

  const primary =
    t.status === 'new' || t.status === 'assigned' ? <Button variant="primary" onClick={() => { if (!t.assigneeId) assign(t.id, me.id); setStatus(t.id, 'in_progress') }}><Play /> {t.assigneeId && t.assigneeId !== me.id ? 'Start work' : 'Take it & start'}</Button>
    : t.status === 'in_progress' ? <><Button variant="secondary" onClick={() => setDlg('pending')}><Pause /> Pending…</Button><Button variant="primary" onClick={() => setDlg('resolve')}><Check /> Resolve…</Button></>
    : t.status === 'pending' ? <Button variant="primary" onClick={() => setStatus(t.id, 'in_progress')}><Play /> Resume</Button>
    : t.status === 'resolved' ? <><Button variant="secondary" onClick={() => setDlg('reopen')}><RotateCcw /> Reopen</Button><Button variant="primary" onClick={() => setStatus(t.id, 'closed', { note: 'Closed by agent' })}>Close ticket</Button></>
    : <Button variant="secondary" onClick={() => setDlg('reopen')}><RotateCcw /> Reopen</Button>

  return (
    <div className="space-y-5">
      <Link to="/tickets" className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> Tickets</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tnum text-[13px] font-medium text-fg-subtle">{t.number}</span>
            <StatusBadge status={t.status} pending={t.pendingReason ? PENDING_LABEL[t.pendingReason] : undefined} />
            <PriorityBadge priority={t.priority} />
            <Badge tone="outline">{t.kind === 'incident' ? 'Incident' : 'Service request'}</Badge>
            {req?.vip && <Badge tone="purple">VIP</Badge>}
            {t.tags.includes('major-incident') && <Badge tone="danger">Major incident</Badge>}
          </div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.025em] sm:text-[24px]">{t.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {primary}
          <Menu>
            <MenuTrigger asChild><Button variant="secondary" size="icon" aria-label="More actions"><MoreHorizontal /></Button></MenuTrigger>
            <MenuContent>
              <MenuItem icon={<Wrench />} onSelect={doWo}>Create work order</MenuItem>
              <MenuItem icon={<UserPlus />} onSelect={() => assign(t.id, me.id)} disabled={t.assigneeId === me.id}>Assign to me</MenuItem>
              <MenuItem icon={<Copy />} onSelect={() => { void navigator.clipboard?.writeText(window.location.href); toast.push({ tone: 'info', title: 'Link copied' }) }}>Copy link</MenuItem>
              <MenuSeparator />
              <MenuItem icon={<Ban />} danger onSelect={() => setDlg('cancel')} disabled={!open}>Cancel ticket</MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Tabs value={tab} onChange={setTab} items={[{ value: 'conversation', label: 'Conversation', count: t.activity.filter((x) => x.type === 'comment' || x.type === 'note' || x.type === 'created').length }, { value: 'related', label: 'Related', count: sameAsset.length + sameRequester.length }]} />
          {tab === 'conversation' ? (
            <>
              <Timeline t={t} staff />
              <Composer t={t} staff />
            </>
          ) : (
            <div className="space-y-5">
              <RelatedList title={a ? `Other tickets on ${a.name}` : 'Other tickets on this asset'} rows={sameAsset} empty={a ? 'No other tickets on this asset.' : 'No asset linked.'} />
              <RelatedList title={`More from ${req?.name}`} rows={sameRequester} empty="Nothing else from this requester." />
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Service levels" icon={<Clock3 />} />
            <CardBody className="space-y-4">
              <SlaMeter ticket={t} which="response" label="First response" />
              <SlaMeter ticket={t} which="resolve" label="Resolution" />
              {t.pausedAt && <p className="rounded-lg bg-neutral-soft px-3 py-2 text-[12px] text-fg-muted">Clock paused since {fmtAgo(t.pausedAt)} — {t.pendingReason ? PENDING_LABEL[t.pendingReason].toLowerCase() : ''}.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-3.5">
              <Field label="Assignee"><Select value={t.assigneeId} onChange={(v) => assign(t.id, v)} options={assigneeOptions} searchable clearable onClear={() => assign(t.id, undefined)} placeholder="Unassigned" /></Field>
              <Field label="Priority" hint={`SLA ${fmtDuration(policyFor(t.priority).resolveMin * 60_000)}`}>
                <Select value={t.priority} onChange={(v) => setPriority(t.id, v as Priority)} options={(['p1', 'p2', 'p3', 'p4'] as Priority[]).map((p) => ({ value: p, label: `${PRIORITY[p].short} · ${PRIORITY[p].label}`, description: PRIORITY[p].hint }))} />
              </Field>
              <Field label="Category"><Select value={t.categoryId} onChange={(v) => patchTicket(t.id, { categoryId: v })} options={useStore.getState().categories.map((c) => ({ value: c.id, label: c.name }))} searchable /></Field>
              <Separator />
              <Row k="Requester"><span><Link to="#" className="font-medium hover:underline">{req?.name}</Link><span className="block text-[12px] text-fg-muted">{req?.title} · {req?.dept}</span></span></Row>
              <Row k="Team">{team.get(t.teamId)?.name}</Row>
              <Row k="Location">{spaceLabel(t.spaceId)}<span className="block text-[12px] text-fg-muted">{t.spaceId && building.get(space.get(t.spaceId)!.buildingId)?.name}</span></Row>
              <Row k="Asset">{a ? <Link to={`/assets/${a.id}`} className="font-medium text-primary hover:underline">{a.name}<span className="block text-[12px] font-normal text-fg-muted">{a.tag}</span></Link> : <span className="text-fg-muted">None</span>}</Row>
              <Row k="Channel">{CHANNEL_LABEL[t.channel]}</Row>
              <Row k="Opened">{fmtDateTime(t.createdAt)}</Row>
              {t.csat && <Row k="CSAT"><Stars value={t.csat.score} readOnly size="sm" />{t.csat.comment && <span className="mt-1 block text-[12px] text-fg-muted">“{t.csat.comment}”</span>}</Row>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Work orders" icon={<Wrench />} actions={<Button variant="ghost" size="xs" onClick={doWo}>+ Create</Button>} />
            {wos.length === 0 ? <p className="px-4 py-4 text-[13px] text-fg-muted">No work orders. Create one to track parts, time and cost against {a ? a.name : 'this job'}.</p> : (
              <ul className="divide-y divide-border">{wos.map((w) => <li key={w.id}><Link to={`/work-orders/${w.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-bg-muted"><span className="min-w-0"><span className="tnum block text-[12px] text-fg-subtle">{w.number}</span><span className="block truncate text-[13px] font-medium">{w.title}</span></span><WoStatusBadge status={w.status} /></Link></li>)}</ul>
            )}
          </Card>

          {suggestedKb.length > 0 && (
            <Card>
              <CardHeader title="Suggested articles" icon={<BookOpen />} />
              <ul className="divide-y divide-border">{suggestedKb.map((k) => <li key={k.id}><Link to={`/help/${k.id}`} className="block px-4 py-2.5 text-[13px] hover:bg-bg-muted">{k.title}</Link></li>)}</ul>
            </Card>
          )}
        </aside>
      </div>

      <Dialog open={dlg === 'resolve'} onOpenChange={(v) => !v && setDlg(null)}>
        <DialogContent size="sm" title="Resolve this ticket" description="The requester will be asked to confirm. They have 3 working days before it closes by itself." footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button variant="primary" disabled={note.trim().length < 8} onClick={doResolve}>Resolve</Button></>}>
          <div className="space-y-3 p-5">
            <Field label="What was done?" required hint="Shown to the requester"><Textarea autoFocus rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Replaced the faulty thermostat sensor and tested for 30 minutes." /></Field>
            {wos.some((w) => w.status !== 'completed' && w.status !== 'cancelled') && <p className="rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning-soft-fg">A linked work order is still open. You can resolve anyway, but close the work order too so cost and history stay accurate.</p>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dlg === 'pending'} onOpenChange={(v) => !v && setDlg(null)}>
        <DialogContent size="sm" title="Put on hold" description="The SLA clock stops until you resume or the requester replies." footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button variant="primary" onClick={doPending}>Pause SLA clock</Button></>}>
          <div className="space-y-4 p-5">
            <Field label="Waiting on"><Select value={reason} onChange={setReason} options={(Object.keys(PENDING_LABEL) as PendingReason[]).map((r) => ({ value: r, label: PENDING_LABEL[r].replace('Waiting on ', '') }))} /></Field>
            <Field label="Note" hint="optional"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What exactly are you waiting for?" /></Field>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dlg === 'cancel'} onOpenChange={(v) => !v && setDlg(null)}>
        <DialogContent size="sm" title="Cancel this ticket?" description="Use this for duplicates or requests withdrawn by the requester." footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Keep open</Button><Button variant="danger" disabled={note.trim().length < 4} onClick={() => { setStatus(t.id, 'cancelled', { note: note.trim() }); setDlg(null); setNote('') }}>Cancel ticket</Button></>}>
          <div className="p-5"><Field label="Reason" required><Textarea autoFocus rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field></div>
        </DialogContent>
      </Dialog>

      <Dialog open={dlg === 'reopen'} onOpenChange={(v) => !v && setDlg(null)}>
        <DialogContent size="sm" title="Reopen ticket" footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button variant="primary" disabled={note.trim().length < 4} onClick={() => { reopen(t.id, note.trim()); setDlg(null); setNote('') }}>Reopen</Button></>}>
          <div className="p-5"><Field label="Why?" required><Textarea autoFocus rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field></div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RelatedList({ title, rows, empty }: { title: string; rows: Ticket[]; empty: string }) {
  return (
    <Card>
      <CardHeader title={title} />
      {rows.length === 0 ? <p className="px-4 py-5 text-[13px] text-fg-muted">{empty}</p> : (
        <ul className="divide-y divide-border">
          {rows.slice(0, 8).map((r) => (
            <li key={r.id}><Link to={`/tickets/${r.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-muted"><span className="tnum w-16 shrink-0 text-[12px] text-fg-subtle">{r.number}</span><span className="min-w-0 flex-1 truncate text-[13.5px]">{r.title}</span><StatusBadge status={r.status} /></Link></li>
          ))}
        </ul>
      )}
    </Card>
  )
}
