import * as React from 'react'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { titleCase } from '@/lib/format'

const TONES: Record<string, BadgeTone> = {
  /* generic */
  ACTIVE: 'success', PROSPECT: 'info', ON_HOLD: 'warning', BLACKLISTED: 'danger',
  DRAFT: 'neutral', CANCELLED: 'danger', CLOSED: 'success', COMPLETED: 'success',
  STANDARD: 'neutral', HIGH: 'warning', CRITICAL: 'danger', LOW: 'success', MEDIUM: 'warning',

  /* sales orders */
  PENDING_CONFIRMATION: 'warning', CONFIRMED: 'info', IN_PRODUCTION: 'primary',
  PARTIALLY_SHIPPED: 'accent', SHIPPED: 'accent',

  /* work orders */
  PLANNED: 'neutral', FIRM: 'info', RELEASED: 'primary', IN_PROGRESS: 'accent',

  /* operations */
  PENDING: 'neutral', READY: 'info', RUNNING: 'accent', CURING: 'purple', DONE: 'success', BLOCKED: 'danger',

  /* purchase orders */
  PENDING_APPROVAL: 'warning', APPROVED: 'info', PARTIALLY_RECEIVED: 'accent', RECEIVED: 'success',

  /* import shipment states */
  PERMIT_PENDING: 'danger', ORDERED: 'info', BOOKED: 'info', ON_WATER: 'primary',
  ARRIVED: 'warning', PIB_SUBMITTED: 'warning', LANE_ASSIGNED: 'warning', CLEARED: 'accent',

  /* customs lanes */
  GREEN: 'success', YELLOW: 'warning', RED: 'danger',

  /* documents */
  REQUIRED: 'danger', VERIFIED: 'success', REJECTED: 'danger', NOT_APPLICABLE: 'neutral',

  /* lots */
  QUARANTINE: 'warning', AVAILABLE: 'success', BLOCKED_KILN: 'danger', BLOCKED_QC: 'danger',
  CONSUMED: 'neutral', RETURNED: 'neutral',

  /* kiln */
  LOADING: 'info', DRYING: 'primary', CONDITIONING: 'accent', FAILED: 'danger',

  /* quality */
  PASS: 'success', FAIL: 'danger', CONDITIONAL: 'warning',
  ACCEPT: 'success', REWORK: 'warning', DOWNGRADE: 'warning', SCRAP: 'danger', RETURN_TO_SUPPLIER: 'danger',

  /* finance */
  ISSUED: 'primary', PARTIALLY_PAID: 'warning', PAID: 'success', OVERDUE: 'danger',
  POSTED: 'success', VOID: 'danger',

  /* bom / routing */
  SUPERSEDED: 'neutral',
}

export function StatusBadge({ value, size = 'md' }: { value: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Badge tone={TONES[value] ?? 'neutral'} size={size} dot>
      {titleCase(value)}
    </Badge>
  )
}

export function ToneDot({ tone }: { tone: BadgeTone }) {
  const map: Record<string, string> = {
    neutral: 'bg-fg-subtle', primary: 'bg-primary', accent: 'bg-accent', success: 'bg-success',
    warning: 'bg-warning', danger: 'bg-danger', info: 'bg-info', purple: 'bg-purple', outline: 'bg-border-strong',
  }
  return <span className={`size-1.5 rounded-full ${map[tone]}`} />
}

export function MetaRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-start justify-between gap-4 py-1.5 ${className ?? ''}`}>
      <span className="shrink-0 text-[12px] text-fg-muted">{label}</span>
      <span className="min-w-0 text-right text-[12.5px] font-medium text-fg">{children}</span>
    </div>
  )
}

/** A number that reads as good or bad on sight — negative slack, a variance, a margin. */
export function Delta({
  value, suffix = '', invert = false, digits = 0, zeroLabel = '—',
}: { value: number | undefined | null; suffix?: string; invert?: boolean; digits?: number; zeroLabel?: string }) {
  if (value === undefined || value === null || Number.isNaN(value)) return <span className="text-fg-subtle">{zeroLabel}</span>
  const good = invert ? value <= 0 : value >= 0
  return (
    <span className={`tnum font-semibold ${value === 0 ? 'text-fg-muted' : good ? 'text-success' : 'text-danger'}`}>
      {value > 0 ? '+' : ''}
      {value.toFixed(digits)}
      {suffix}
    </span>
  )
}

/** A short line of prose that explains a number, in the voice the shop floor uses. */
export function Because({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[12px] leading-relaxed text-fg-muted ${className ?? ''}`}>{children}</p>
}
