import { AlertTriangle, CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import { ASSET_STATUS, CRITICALITY, PENDING_LABEL, PRIORITY, STATUS, TASK_STATUS, TASK_TYPE } from '@/lib/labels'
import { fmtDuration } from '@/lib/format'
import { readSla, worstSla, type SlaState } from '@/lib/sla'
import { useNow } from '@/hooks/useNow'
import { useLookups } from '@/hooks/useLookups'
import type { AssetStatus, Criticality, PendingReason, Priority, TaskStatus, TaskType, Ticket, TicketStatus } from '@/data/types'

export function PriorityBadge({ priority, compact }: { priority: Priority; compact?: boolean }) {
  const p = PRIORITY[priority]
  return <Badge tone={p.tone} dot>{compact ? p.label : `${p.short} · ${p.label}`}</Badge>
}

export function StatusBadge({ status, pending }: { status: TicketStatus; pending?: PendingReason }) {
  const s = STATUS[status]
  return (
    <Badge tone={s.tone} dot>
      {s.label}
      {pending ? <span className="opacity-70">· {PENDING_LABEL[pending].replace('Menunggu ', '')}</span> : null}
    </Badge>
  )
}

export const TaskStatusBadge = ({ status }: { status: TaskStatus }) => <Badge tone={TASK_STATUS[status].tone} dot>{TASK_STATUS[status].label}</Badge>
export const TaskTypeBadge = ({ type }: { type: TaskType }) => <Badge tone={TASK_TYPE[type].tone}>{TASK_TYPE[type].label}</Badge>
export const AssetStatusBadge = ({ status }: { status: AssetStatus }) => <Badge tone={ASSET_STATUS[status].tone} dot>{ASSET_STATUS[status].label}</Badge>
export const CriticalityBadge = ({ level }: { level: Criticality }) => <Badge tone={CRITICALITY[level].tone}>{CRITICALITY[level].label}</Badge>

const slaStyle: Record<SlaState, { cls: string; icon: React.ReactNode }> = {
  ok: { cls: 'text-fg-muted', icon: <Clock /> },
  at_risk: { cls: 'text-warning-soft-fg bg-warning-soft', icon: <AlertTriangle /> },
  breached: { cls: 'text-danger-soft-fg bg-danger-soft', icon: <XCircle /> },
  paused: { cls: 'text-fg-muted', icon: <PauseCircle /> },
  met: { cls: 'text-success', icon: <CheckCircle2 /> },
  missed: { cls: 'text-danger-soft-fg', icon: <XCircle /> },
  'n/a': { cls: 'text-fg-subtle', icon: <Clock /> },
}

/** One-line target status for staff lists. Words and icon, never colour alone. */
export function SlaChip({ ticket }: { ticket: Ticket }) {
  const now = useNow()
  const r = worstSla(ticket, now)
  const label = r.state === 'ok' || r.state === 'at_risk' ? `Target ${fmtDuration(r.remainingMs)} lagi` : r.state === 'breached' ? `Lewat target ${fmtDuration(r.remainingMs)}` : r.state === 'paused' ? 'Target dijeda' : r.state === 'met' ? 'Target tercapai' : r.state === 'missed' ? 'Target terlewat' : '—'
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[12px] font-medium [&_svg]:size-3.5', slaStyle[r.state].cls)}>{slaStyle[r.state].icon}{label}</span>
}

export function SlaMeter({ ticket, which, label }: { ticket: Ticket; which: 'response' | 'resolve'; label: string }) {
  const now = useNow(15_000)
  const r = readSla(ticket, which, now)
  const tone = r.state === 'breached' || r.state === 'missed' ? 'bg-danger' : r.state === 'at_risk' ? 'bg-warning' : r.state === 'paused' ? 'bg-fg-subtle' : 'bg-success'
  const text = r.state === 'met' ? 'Tercapai' : r.state === 'missed' ? 'Terlewat' : r.state === 'paused' ? 'Dijeda' : r.state === 'breached' ? `Lewat ${fmtDuration(r.remainingMs)}` : `${fmtDuration(r.remainingMs)} lagi`
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[12px]"><span className="font-medium text-fg-muted">{label}</span><span className={cn('tnum font-semibold', r.state === 'breached' || r.state === 'missed' ? 'text-danger' : r.state === 'at_risk' ? 'text-warning' : 'text-fg')}>{text}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-soft" role="progressbar" aria-label={`${label}: ${text}`} aria-valuenow={Math.round(Math.min(1, r.used) * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn('h-full rounded-full transition-[width]', tone)} style={{ width: `${Math.min(100, Math.max(3, r.used * 100))}%` }} />
      </div>
    </div>
  )
}

export function UserChip({ id, size = 'md', showTitle, empty = 'Belum ditugaskan' }: { id?: string; size?: 'sm' | 'md'; showTitle?: boolean; empty?: string }) {
  const { user } = useLookups()
  const u = id ? user.get(id) : undefined
  if (!u) return <span className="text-[13px] text-fg-subtle">{empty}</span>
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar name={u.name} className={size === 'sm' ? 'size-5 text-[9px]' : 'size-6 text-[10px]'} />
      <span className="min-w-0"><span className="block truncate text-[13px] text-fg">{u.name}</span>{showTitle && <span className="block truncate text-[11.5px] text-fg-subtle">{u.title}</span>}</span>
    </span>
  )
}
