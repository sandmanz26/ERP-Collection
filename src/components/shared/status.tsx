import * as React from 'react'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { titleCase } from '@/lib/format'

/** One tone per status value, so a status reads the same on every page. */
const TONES: Record<string, BadgeTone> = {
  /* client */
  ACTIVE: 'success', PROSPECT: 'info', ON_HOLD: 'warning', CHURNED: 'danger', INACTIVE: 'neutral',
  ENTERPRISE: 'purple', CORPORATE: 'info', SME: 'neutral',
  /* project */
  DRAFT: 'neutral', PENDING_APPROVAL: 'warning', SUSPENDED: 'warning', COMPLETED: 'info', TERMINATED: 'danger',
  /* contract period */
  NOT_STARTED: 'neutral', RUNNING: 'success', ENDING_SOON: 'warning', EXPIRED: 'danger',
  /* stock */
  HEALTHY: 'success', LOW: 'warning', OUT_OF_STOCK: 'danger', OVERSTOCK: 'purple',
  GOOD: 'success', DAMAGED: 'danger', QUARANTINE: 'warning',
  EXPIRING: 'warning', OK: 'success', NONE: 'neutral',
  /* item master */
  DISCONTINUED: 'neutral',
  /* accounts */
  PENDING_VERIFICATION: 'warning', LOCKED: 'danger', INVITED: 'info',
  /* shifts */
  PAGI: 'info', SIANG: 'warning', MALAM: 'purple', NON_SHIFT: 'neutral',
}

export function StatusBadge({ value, size = 'md' }: { value: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Badge tone={TONES[value] ?? 'neutral'} size={size} dot>
      {titleCase(value)}
    </Badge>
  )
}

export function MetaRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-start justify-between gap-4 py-1.5 ${className ?? ''}`}>
      <span className="shrink-0 text-[12px] text-fg-muted">{label}</span>
      <span className="min-w-0 text-right text-[12.5px] font-medium text-fg">{children}</span>
    </div>
  )
}
