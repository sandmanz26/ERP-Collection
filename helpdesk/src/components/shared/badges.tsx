import { AlertTriangle, CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import { ASSET_STATUS, CRITICALITY, PRIORITY, STATUS, WO_STATUS, WO_TYPE } from '@/lib/labels'
import { fmtDuration } from '@/lib/format'
import { readSla, worstSla, type SlaState } from '@/lib/sla'
import { useNow } from '@/hooks/useNow'
import { useLookups } from '@/hooks/useLookups'
import type { AssetStatus, Criticality, Priority, Ticket, TicketStatus, WorkOrderStatus, WorkOrderType } from '@/data/types'

export function PriorityBadge({ priority, compact }: { priority: Priority; compact?: boolean }) {
  const p = PRIORITY[priority]
  return (
    <Badge tone={p.tone} dot>
      {compact ? p.short : `${p.short} · ${p.label}`}
    </Badge>
  )
}

export function StatusBadge({ status, pending }: { status: TicketStatus; pending?: string }) {
  const s = STATUS[status]
  return (
    <Badge tone={s.tone} dot>
      {s.label}
      {pending ? <span className="opacity-70">· {pending}</span> : null}
    </Badge>
  )
}

export const WoStatusBadge = ({ status }: { status: WorkOrderStatus }) => <Badge tone={WO_STATUS[status].tone} dot>{WO_STATUS[status].label}</Badge>
export const WoTypeBadge = ({ type }: { type: WorkOrderType }) => <Badge tone={WO_TYPE[type].tone}>{WO_TYPE[type].label}</Badge>
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

/** One-line SLA status for lists. Colour is never the only signal — icon + words too. */
export function SlaChip({ ticket }: { ticket: Ticket }) {
  const now = useNow()
  const r = worstSla(ticket, now)
  const label =
    r.state === 'ok' || r.state === 'at_risk'
      ? `${fmtDuration(r.remainingMs)} left`
      : r.state === 'breached'
        ? `${fmtDuration(r.remainingMs)} overdue`
        : r.state === 'paused'
          ? 'Clock paused'
          : r.state === 'met'
            ? 'SLA met'
            : r.state === 'missed'
              ? 'SLA missed'
              : '—'
  const what = r.which === 'response' && (r.state === 'ok' || r.state === 'at_risk' || r.state === 'breached') ? 'reply' : ''
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[12px] font-medium [&_svg]:size-3.5', slaStyle[r.state].cls)}>
      {slaStyle[r.state].icon}
      {label}
      {what && <span className="opacity-70">({what})</span>}
    </span>
  )
}

/** Large version with a progress bar, used in the ticket detail sidebar. */
export function SlaMeter({ ticket, which, label }: { ticket: Ticket; which: 'response' | 'resolve'; label: string }) {
  const now = useNow(15_000)
  const r = readSla(ticket, which, now)
  const tone = r.state === 'breached' || r.state === 'missed' ? 'bg-danger' : r.state === 'at_risk' ? 'bg-warning' : r.state === 'paused' ? 'bg-fg-subtle' : 'bg-success'
  const text =
    r.state === 'met' ? 'Met' : r.state === 'missed' ? 'Missed' : r.state === 'paused' ? 'Paused' : r.state === 'breached' ? `${fmtDuration(r.remainingMs)} overdue` : `${fmtDuration(r.remainingMs)} left`
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-fg-muted">{label}</span>
        <span className={cn('tnum font-semibold', r.state === 'breached' || r.state === 'missed' ? 'text-danger' : r.state === 'at_risk' ? 'text-warning' : 'text-fg')}>{text}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-soft" role="progressbar" aria-label={`${label}: ${text}`} aria-valuenow={Math.round(Math.min(1, r.used) * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn('h-full rounded-full transition-[width]', tone)} style={{ width: `${Math.min(100, Math.max(3, r.used * 100))}%` }} />
      </div>
      <p className="text-[11.5px] text-fg-subtle">Due {r.dueAt.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  )
}

export function UserChip({ id, size = 'md', showTitle }: { id?: string; size?: 'sm' | 'md'; showTitle?: boolean }) {
  const { user } = useLookups()
  const u = id ? user.get(id) : undefined
  if (!u) return <span className="text-[13px] text-fg-subtle">Unassigned</span>
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar name={u.name} className={size === 'sm' ? 'size-5 text-[9px]' : 'size-6 text-[10px]'} />
      <span className="min-w-0">
        <span className="block truncate text-[13px] text-fg">{u.name}</span>
        {showTitle && <span className="block truncate text-[11.5px] text-fg-subtle">{u.title}</span>}
      </span>
    </span>
  )
}
