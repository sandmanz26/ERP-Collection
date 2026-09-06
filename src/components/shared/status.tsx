import { Badge, type BadgeTone } from '@/components/ui/badge'
import { titleCase } from '@/lib/format'

/**
 * One place that decides what colour a status is. Every status string in the
 * system passes through here, so a stage never means one thing on one screen
 * and something else on another.
 */
const TONES: Record<string, BadgeTone> = {
  /* generic */
  ACTIVE: 'success', DRAFT: 'neutral', CANCELLED: 'danger', CLOSED: 'neutral', OPEN: 'info',
  COMPLETED: 'success', REJECTED: 'danger', APPROVED: 'success', SUBMITTED: 'info',
  AWAITING_APPROVAL: 'warning', PENDING: 'warning', REVISED: 'purple',

  /* priority */
  LOW: 'neutral', NORMAL: 'neutral', HIGH: 'warning', CRITICAL: 'danger', MEDIUM: 'info',

  /* buyer & supplier */
  PROSPECT: 'info', ON_HOLD: 'warning', DORMANT: 'neutral', BLACKLISTED: 'danger', PROBATION: 'warning',

  /* project stage */
  INQUIRY: 'neutral', NEGOTIATION: 'info', SAMPLING: 'purple', QUOTED: 'info',
  ORDER_CONFIRMED: 'accent', BUDGETING: 'purple', PROCUREMENT: 'warning', PRODUCTION: 'primary',
  QC_PACKING: 'accent', SHIPPED: 'success', WON: 'success', LOST: 'danger',

  /* drawings & samples */
  SENT: 'info', REVISION_REQUESTED: 'warning', SUPERSEDED: 'neutral', REQUESTED: 'neutral',
  IN_MAKING: 'purple',

  /* purchase orders and receipts */
  PARTIALLY_RECEIVED: 'warning', RECEIVED: 'success', FULL: 'success', PARTIAL: 'warning',
  DIRECT: 'purple', PASSED: 'success', FAILED: 'danger', PARTIALLY_ORDERED: 'warning',
  ORDERED: 'success',

  /* inventory */
  IN_TRANSIT: 'warning', COUNTING: 'warning', REVIEW: 'info', POSTED: 'success',
  RESERVED: 'info', PICKED: 'accent', RELEASED: 'success',

  /* production */
  PLANNED: 'neutral', QUEUED: 'neutral', CUTTING: 'info', ASSEMBLY: 'info', SANDING: 'purple',
  FINISHING: 'primary', UPHOLSTERY: 'purple', PACKING: 'accent', DONE: 'success',
  IN_PROGRESS: 'primary',

  /* shipment & documents */
  STUFFING: 'warning', STUFFED: 'accent', DOCS_IN_PROGRESS: 'warning', CUSTOMS: 'info',
  SAILED: 'primary', ARRIVED: 'success', ISSUED: 'success', REQUIRED: 'neutral',
  NOT_REQUIRED: 'neutral', SATISFIED: 'success',

  /* finance */
  PAID: 'success', PARTIALLY_PAID: 'warning', OVERDUE: 'danger', DISPUTED: 'danger', VOID: 'neutral',
  MATCHED: 'success', QTY_VARIANCE: 'warning', PRICE_VARIANCE: 'warning', NO_RECEIPT: 'danger',
  UNMATCHED: 'danger', PROFORMA: 'neutral', DEPOSIT: 'info', FINAL: 'primary', CREDIT_NOTE: 'purple',
}

export function StatusBadge({ value, size = 'md' }: { value: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Badge tone={TONES[value] ?? 'neutral'} size={size} dot>
      {titleCase(value)}
    </Badge>
  )
}

export const toneFor = (value: string): BadgeTone => TONES[value] ?? 'neutral'

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
