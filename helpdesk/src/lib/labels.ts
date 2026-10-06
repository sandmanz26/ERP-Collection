import type { AssetStatus, Channel, Criticality, PendingReason, Priority, TicketStatus, VisitorStatus, WorkOrderStatus, WorkOrderType } from '@/data/types'
import type { BadgeTone } from '@/components/ui/badge'

export const PRIORITY: Record<Priority, { label: string; short: string; tone: BadgeTone; rank: number; hint: string }> = {
  p1: { label: 'Critical', short: 'P1', tone: 'danger', rank: 1, hint: 'Safety risk or a whole floor/service down' },
  p2: { label: 'High', short: 'P2', tone: 'warning', rank: 2, hint: 'A team cannot work, or a key facility is unavailable' },
  p3: { label: 'Medium', short: 'P3', tone: 'info', rank: 3, hint: 'Individual impact, workaround exists' },
  p4: { label: 'Low', short: 'P4', tone: 'neutral', rank: 4, hint: 'Question, request or cosmetic issue' },
}

export const STATUS: Record<TicketStatus, { label: string; tone: BadgeTone; open: boolean }> = {
  new: { label: 'New', tone: 'primary', open: true },
  assigned: { label: 'Assigned', tone: 'info', open: true },
  in_progress: { label: 'In progress', tone: 'accent', open: true },
  pending: { label: 'Pending', tone: 'warning', open: true },
  resolved: { label: 'Resolved', tone: 'success', open: false },
  closed: { label: 'Closed', tone: 'neutral', open: false },
  cancelled: { label: 'Cancelled', tone: 'outline', open: false },
}

export const STATUS_ORDER: TicketStatus[] = ['new', 'assigned', 'in_progress', 'pending', 'resolved', 'closed', 'cancelled']

export const PENDING_LABEL: Record<PendingReason, string> = {
  requester: 'Waiting on requester',
  vendor: 'Waiting on vendor',
  parts: 'Waiting on parts',
  approval: 'Waiting on approval',
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  portal: 'Portal', email: 'Email', phone: 'Phone', walk_in: 'Walk-in', qr: 'QR scan', inspection: 'Inspection',
}

export const WO_STATUS: Record<WorkOrderStatus, { label: string; tone: BadgeTone }> = {
  open: { label: 'Open', tone: 'primary' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'accent' },
  on_hold: { label: 'On hold', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'outline' },
}

export const WO_TYPE: Record<WorkOrderType, { label: string; tone: BadgeTone }> = {
  corrective: { label: 'Corrective', tone: 'danger' },
  preventive: { label: 'Preventive', tone: 'success' },
  inspection: { label: 'Inspection', tone: 'purple' },
}

export const ASSET_STATUS: Record<AssetStatus, { label: string; tone: BadgeTone }> = {
  operational: { label: 'Operational', tone: 'success' },
  degraded: { label: 'Degraded', tone: 'warning' },
  down: { label: 'Down', tone: 'danger' },
  retired: { label: 'Retired', tone: 'neutral' },
}

export const CRITICALITY: Record<Criticality, { label: string; tone: BadgeTone }> = {
  low: { label: 'Low', tone: 'neutral' },
  medium: { label: 'Medium', tone: 'info' },
  high: { label: 'High', tone: 'warning' },
  critical: { label: 'Critical', tone: 'danger' },
}

export const VISITOR_STATUS: Record<VisitorStatus, { label: string; tone: BadgeTone }> = {
  expected: { label: 'Expected', tone: 'info' },
  checked_in: { label: 'On site', tone: 'success' },
  checked_out: { label: 'Left', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'outline' },
  no_show: { label: 'No show', tone: 'warning' },
}
