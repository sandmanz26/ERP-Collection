import * as React from 'react'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { titleCase } from '@/lib/format'

const TONES: Record<string, BadgeTone> = {
  /* customer */
  ACTIVE: 'success', PROSPECT: 'info', ON_HOLD: 'warning', BLACKLISTED: 'danger',
  LOW: 'success', MEDIUM: 'warning', HIGH: 'danger',
  /* package */
  DRAFT: 'neutral', EXPIRING: 'warning', EXPIRED: 'danger', ARCHIVED: 'neutral',
  /* project */
  COMPLETED: 'success', CANCELLED: 'danger',
  STANDARD: 'neutral', CRITICAL: 'danger',
  /* container */
  PLANNED: 'neutral', BOOKED: 'info', AT_DEPOT: 'info', STUFFING: 'warning', STUFFED: 'accent',
  GATE_IN: 'accent', LOADED: 'primary', IN_TRANSIT: 'primary', DISCHARGED: 'accent',
  DELIVERED: 'success', RETURNED: 'success',
  /* documents */
  REQUIRED: 'neutral', PENDING_REVIEW: 'warning', APPROVED: 'success', ISSUED: 'primary',
  SURRENDERED: 'accent', REJECTED: 'danger',
  /* charges */
  PENDING_APPROVAL: 'warning', INVOICED: 'primary', PAID: 'success', DISPUTED: 'danger',
  /* finance */
  POSTED: 'success', VOID: 'danger', PARTIALLY_PAID: 'warning', OVERDUE: 'danger',
  /* bl */
  NOT_ISSUED: 'neutral', APPROVED_BY_SHIPPER: 'info', RELEASED: 'success',
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
