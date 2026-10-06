import * as React from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Box, Check, CheckCircle2, Clock, Pause, Play, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { PriorityBadge, UserChip, WoStatusBadge, WoTypeBadge } from '@/components/shared/badges'
import { PageHeader } from '@/components/shared/PageHeader'
import { useLookups, useSpaceLabel } from '@/hooks/useLookups'
import { useMe, useStore } from '@/store/useStore'
import { woCost } from '@/lib/metrics'
import { fmtDateTime, fmtMoneyFull, fmtSmart } from '@/lib/format'
import { cn } from '@/lib/utils'
import { woOverdue, woProgress } from './WorkOrdersPage'
import type { Priority } from '@/data/types'

export function WorkOrderDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const wo = useStore((s) => s.workOrders.find((w) => w.id === id))
  if (id === 'new') return <NewWorkOrder />
  if (!wo) return <EmptyState title="Work order not found" action={<Button variant="secondary" onClick={() => nav('/work-orders')}><ArrowLeft /> Back</Button>} className="py-24" />
  return <Detail id={wo.id} />
}

function Detail({ id }: { id: string }) {
  const me = useMe()!
  const wo = useStore((s) => s.workOrders.find((w) => w.id === id))!
  const s = useStore()
  const { asset, vendor } = useLookups()
  const spaceLabel = useSpaceLabel()
  const toast = useToast()
  const ticket = wo.ticketId ? s.tickets.find((t) => t.id === wo.ticketId) : undefined
  const a = wo.assetId ? asset.get(wo.assetId) : undefined
  const cost = woCost(wo)
  const done = wo.status === 'completed' || wo.status === 'cancelled'
  const [dlg, setDlg] = React.useState<'complete' | 'time' | 'material' | null>(null)
  const [note, setNote] = React.useState('')
  const [mins, setMins] = React.useState('30')
  const [mat, setMat] = React.useState({ name: '', qty: '1', cost: '' })
  const allChecked = wo.checklist.every((c) => c.done)
  const over = woOverdue(wo)

  return (
    <div className="space-y-5">
      <Link to="/work-orders" className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> Work orders</Link>
      <PageHeader
        eyebrow={<><span className="tnum text-[13px] font-medium text-fg-subtle">{wo.number}</span><WoStatusBadge status={wo.status} /><WoTypeBadge type={wo.type} /><PriorityBadge priority={wo.priority} compact />{over && <Badge tone="danger">Overdue</Badge>}</>}
        title={wo.title}
        description={wo.description}
        actions={
          done ? (
            wo.status === 'completed' && <Button variant="secondary" onClick={() => s.setWoStatus(wo.id, 'in_progress')}>Reopen</Button>
          ) : (
            <>
              {wo.status === 'in_progress' ? <Button variant="secondary" onClick={() => s.setWoStatus(wo.id, 'on_hold')}><Pause /> Put on hold</Button> : <Button variant="secondary" onClick={() => { if (!wo.assigneeId) s.patchWorkOrder(wo.id, { assigneeId: me.id }); s.setWoStatus(wo.id, 'in_progress') }}><Play /> {wo.status === 'on_hold' ? 'Resume' : 'Start'}</Button>}
              <Button variant="primary" onClick={() => setDlg('complete')}><Check /> Complete…</Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Checklist" description={`${wo.checklist.filter((c) => c.done).length} of ${wo.checklist.length} steps done`} actions={<span className="w-28"><Progress value={woProgress(wo)} tone={woProgress(wo) === 100 ? 'success' : 'primary'} /></span>} />
            <ul className="divide-y divide-border">
              {wo.checklist.map((c) => (
                <li key={c.id} className="space-y-2 px-4 py-3">
                  <Checkbox checked={c.done} onChange={() => !done && s.toggleCheck(wo.id, c.id)} disabled={done} label={<span className={cn('text-[13.5px]', c.done && 'text-fg-muted line-through')}>{c.text}</span>} />
                  {(c.note || !done) && <Input value={c.note ?? ''} onChange={(e) => s.noteCheck(wo.id, c.id, e.target.value)} disabled={done} placeholder="Add a finding or reading…" className="h-8 text-[12.5px]" aria-label={`Note for ${c.text}`} />}
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Time" icon={<Clock />} actions={!done && <Button variant="ghost" size="xs" onClick={() => setDlg('time')}><Plus /> Log time</Button>} />
              {wo.timeLogs.length === 0 ? <p className="px-4 py-5 text-[13px] text-fg-muted">No time logged yet.</p> : (
                <ul className="divide-y divide-border">{wo.timeLogs.map((l) => <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]"><span className="min-w-0"><UserChip id={l.userId} size="sm" />{l.note && <span className="block truncate text-[12px] text-fg-muted">{l.note}</span>}</span><span className="tnum shrink-0 font-semibold">{Math.floor(l.minutes / 60)}h {l.minutes % 60}m</span></li>)}</ul>
              )}
            </Card>
            <Card>
              <CardHeader title="Parts & materials" icon={<Box />} actions={!done && <Button variant="ghost" size="xs" onClick={() => setDlg('material')}><Plus /> Add</Button>} />
              {wo.materials.length === 0 ? <p className="px-4 py-5 text-[13px] text-fg-muted">No parts used.</p> : (
                <ul className="divide-y divide-border">{wo.materials.map((m) => <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]"><span className="truncate">{m.qty}× {m.name}</span><span className="tnum shrink-0 text-fg-muted">{fmtMoneyFull(m.qty * m.unitCost)}</span></li>)}</ul>
              )}
            </Card>
          </div>

          {wo.completionNote && <Card className="border-success/40"><CardBody className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /><div><p className="text-[13px] font-semibold">Completion note</p><p className="mt-1 text-[13.5px] text-fg-muted">{wo.completionNote}</p></div></CardBody></Card>}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-3.5 text-[13px]">
              {([
                ['Asset', a ? <Link to={`/assets/${a.id}`} className="font-medium text-primary hover:underline">{a.name}</Link> : '—'],
                ['Location', spaceLabel(wo.spaceId ?? a?.spaceId)],
                ['Ticket', ticket ? <Link to={`/tickets/${ticket.id}`} className="font-medium text-primary hover:underline">{ticket.number}</Link> : wo.pmId ? 'Preventive schedule' : '—'],
                ['Assignee', <UserChip key="a" id={wo.assigneeId} size="sm" />],
                ['Vendor', wo.vendorId ? vendor.get(wo.vendorId)?.name : 'In-house'],
                ['Scheduled', fmtSmart(wo.scheduledFor)],
                ['Due', <span key="d" className={over ? 'font-semibold text-danger' : ''}>{fmtDateTime(wo.dueAt)}</span>],
                ['Started', fmtDateTime(wo.startedAt)],
                ['Completed', fmtDateTime(wo.completedAt)],
              ] as [string, React.ReactNode][]).map(([k, v]) => <div key={k} className="grid grid-cols-[84px_1fr] gap-2"><span className="text-fg-muted">{k}</span><span className="min-w-0 break-words">{v}</span></div>)}
              {!done && <><Separator /><Field label="Reassign"><Select value={wo.assigneeId} onChange={(v) => s.patchWorkOrder(wo.id, { assigneeId: v })} searchable options={s.users.filter((u) => u.role !== 'requester').map((u) => ({ value: u.id, label: u.name, description: u.title }))} /></Field></>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Cost" />
            <CardBody className="space-y-2 text-[13px]">
              {[['Labour', cost.labor], ['Materials', cost.mats], ['Vendor invoice', cost.vendor]].map(([k, v]) => <div key={k as string} className="flex justify-between"><span className="text-fg-muted">{k}</span><span className="tnum">{fmtMoneyFull(v as number)}</span></div>)}
              <Separator />
              <div className="flex justify-between text-[14px] font-semibold"><span>Total</span><span className="tnum">{fmtMoneyFull(cost.total)}</span></div>
              <p className="text-[11.5px] text-fg-subtle">Labour at Rp 85,000 / hour.</p>
            </CardBody>
          </Card>
        </aside>
      </div>

      <Dialog open={dlg === 'complete'} onOpenChange={(v) => !v && setDlg(null)}>
        <DialogContent size="sm" title={`Complete ${wo.number}`} description="Everything is recorded against the asset's service history." footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button variant="primary" disabled={note.trim().length < 5} onClick={() => { s.setWoStatus(wo.id, 'completed', note.trim()); setDlg(null); setNote(''); toast.push({ tone: 'success', title: `${wo.number} completed`, description: wo.pmId ? 'Next preventive date has been scheduled.' : ticket ? `${ticket.number} is ready to resolve.` : undefined }) }}>Mark complete</Button></>}>
          <div className="space-y-3 p-5">
            {!allChecked && <p className="rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning-soft-fg">{wo.checklist.filter((c) => !c.done).length} checklist step(s) are not ticked. They will be marked done when you complete.</p>}
            <Field label="Completion note" required><Textarea autoFocus rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was done and found? Anything to watch next time?" /></Field>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={dlg === 'time'} onOpenChange={(v) => !v && setDlg(null)}>
        <DialogContent size="sm" title="Log time" footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button variant="primary" disabled={!(+mins > 0)} onClick={() => { s.logTime(wo.id, +mins); setDlg(null) }}>Add</Button></>}>
          <div className="p-5"><Field label="Minutes worked"><Input type="number" min={5} step={5} value={mins} onChange={(e) => setMins(e.target.value)} autoFocus /></Field></div>
        </DialogContent>
      </Dialog>
      <Dialog open={dlg === 'material'} onOpenChange={(v) => !v && setDlg(null)}>
        <DialogContent size="sm" title="Add part or material" footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button variant="primary" disabled={!mat.name.trim() || !(+mat.qty > 0)} onClick={() => { s.addMaterial(wo.id, mat.name.trim(), +mat.qty, +mat.cost || 0); setMat({ name: '', qty: '1', cost: '' }); setDlg(null) }}>Add</Button></>}>
          <div className="space-y-3 p-5">
            <Field label="Item"><Input value={mat.name} onChange={(e) => setMat({ ...mat, name: e.target.value })} autoFocus placeholder="e.g. Fan capacitor 35µF" /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Quantity"><Input type="number" min={1} value={mat.qty} onChange={(e) => setMat({ ...mat, qty: e.target.value })} /></Field><Field label="Unit cost (Rp)"><Input type="number" min={0} value={mat.cost} onChange={(e) => setMat({ ...mat, cost: e.target.value })} /></Field></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NewWorkOrder() {
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const create = useStore((s) => s.createWorkOrder)
  const assets = useStore((s) => s.assets)
  const users = useStore((s) => s.users)
  const me = useMe()!
  const [title, setTitle] = React.useState('')
  const [assetId, setAssetId] = React.useState<string | undefined>(sp.get('asset') ?? undefined)
  const [priority, setPriority] = React.useState<Priority>('p3')
  const [assignee, setAssignee] = React.useState<string>(me.id)
  const [due, setDue] = React.useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 16))
  const [desc, setDesc] = React.useState('')
  const { asset } = useLookups()
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to="/work-orders" className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> Work orders</Link>
      <PageHeader title="New work order" description="For jobs that did not start as a ticket — a walk-round finding, a request from a vendor, or planned works." />
      <Card>
        <CardBody className="space-y-4 p-5">
          <Field label="What needs doing?" required><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="e.g. Replace worn belts on AHU L5" /></Field>
          <Field label="Details"><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Asset"><Select value={assetId} onChange={setAssetId} searchable clearable onClear={() => setAssetId(undefined)} placeholder="Optional" options={assets.map((a) => ({ value: a.id, label: a.name, description: a.tag }))} /></Field>
            <Field label="Priority"><Select value={priority} onChange={setPriority} options={[{ value: 'p1', label: 'P1 · Critical' }, { value: 'p2', label: 'P2 · High' }, { value: 'p3', label: 'P3 · Medium' }, { value: 'p4', label: 'P4 · Low' }]} /></Field>
            <Field label="Assignee"><Select value={assignee} onChange={setAssignee} searchable options={users.filter((u) => u.role !== 'requester').map((u) => ({ value: u.id, label: u.name, description: u.title }))} /></Field>
            <Field label="Due"><Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
          </div>
        </CardBody>
        <div className="flex justify-end gap-2 border-t border-border bg-surface-sunken/60 px-5 py-3.5">
          <Button variant="ghost" onClick={() => nav('/work-orders')}>Cancel</Button>
          <Button variant="primary" disabled={title.trim().length < 4} onClick={() => { const w = create({ title: title.trim(), description: desc || undefined, assetId, priority, assigneeId: assignee, dueAt: new Date(due).toISOString(), spaceId: assetId ? asset.get(assetId)?.spaceId : undefined }); nav(`/work-orders/${w.id}`) }}>Create work order</Button>
        </div>
      </Card>
    </div>
  )
}
