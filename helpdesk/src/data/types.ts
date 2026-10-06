export type Role = 'requester' | 'agent' | 'manager'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  title: string
  dept: string
  phone: string
  teamId?: string
  /** area the person normally works in — pre-fills "lokasi" when reporting */
  homeSpaceId?: string
  vip?: boolean
  /** hidden from sign-in lists (e.g. anonymous QR reporter) */
  system?: boolean
}

export interface Team {
  id: string
  name: string
  description: string
}

/* ---------- locations & facilities ---------- */

export interface Building {
  id: string
  name: string
  code: string
  description: string
}

export type SpaceKind =
  | 'production' | 'warehouse' | 'utility' | 'office' | 'meeting' | 'hall' | 'canteen' | 'field' | 'parking' | 'restroom' | 'common' | 'lab'

export interface Addon {
  id: string
  name: string
  price: number
  per: 'event' | 'hour' | 'person'
}

/** Present only on spaces that can be rented / reserved. */
export interface Rental {
  /** Rp per hour for external renters; internal departments are free unless set */
  rateExternal: number
  rateInternal: number
  /** internal bookings also wait for approval */
  needsApproval: boolean
  openHour: number
  closeHour: number
  amenities: string[]
  addonIds: string[]
  description?: string
}

export interface Space {
  id: string
  buildingId: string
  name: string
  kind: SpaceKind
  capacity: number
  rental?: Rental
}

/* ---------- catalogue ---------- */

export type Priority = 'p1' | 'p2' | 'p3' | 'p4'

export interface Category {
  id: string
  name: string
  teamId: string
  defaultPriority: Priority
  icon: string
  description: string
}

export interface SlaPolicy {
  priority: Priority
  label: string
  responseMin: number
  resolveMin: number
  calendar: '24x7' | 'business'
}

export interface BusinessHours {
  days: number[] // 0 Sun … 6 Sat
  startMin: number
  endMin: number
  holidays: string[]
}

/* ---------- tickets ---------- */

export type TicketStatus = 'new' | 'assigned' | 'in_progress' | 'pending' | 'done' | 'cancelled'
export type PendingReason = 'parts' | 'vendor' | 'approval' | 'production' | 'requester'
export type Channel = 'portal' | 'qr' | 'phone' | 'whatsapp' | 'walk_in' | 'inspection'
export type Impact = 'stop' | 'partial' | 'none'

export type ActivityType = 'created' | 'comment' | 'note' | 'status' | 'assign' | 'priority' | 'eta' | 'task' | 'system' | 'rating'

export interface Activity {
  id: string
  at: string
  actorId: string | null
  type: ActivityType
  body?: string
  from?: string
  to?: string
}

export interface Ticket {
  id: string
  number: string
  title: string
  description: string
  categoryId: string
  priority: Priority
  status: TicketStatus
  pendingReason?: PendingReason
  requesterId: string
  /** for anonymous reports from a QR code */
  reporterName?: string
  reporterPhone?: string
  assigneeId?: string
  teamId: string
  spaceId?: string
  assetId?: string
  channel: Channel
  impact?: Impact
  hazard?: boolean
  createdAt: string
  updatedAt: string
  /** technician's promised finish time — the number the requester actually cares about */
  etaAt?: string
  firstResponseAt?: string
  resolvedAt?: string
  confirmedAt?: string
  pausedAt?: string
  pausedMs: number
  dueResponseAt: string
  dueResolveAt: string
  tags: string[]
  taskIds: string[]
  attachments?: string[]
  rating?: { score: number; comment?: string; at: string }
  resolutionNote?: string
  activity: Activity[]
  unreadForRequester?: boolean
}

/* ---------- assets & maintenance ---------- */

export type AssetStatus = 'operational' | 'degraded' | 'down' | 'retired'
export type Criticality = 'low' | 'medium' | 'high' | 'critical'

export interface AssetCategory {
  id: string
  name: string
  icon: string
}

export interface Asset {
  id: string
  tag: string
  name: string
  categoryId: string
  spaceId: string
  vendorId?: string
  manufacturer: string
  model: string
  serial: string
  status: AssetStatus
  criticality: Criticality
  installedAt: string
  warrantyUntil?: string
  lastServiceAt?: string
  purchaseCost: number
  notes?: string
}

export type TaskType = 'corrective' | 'preventive' | 'inspection'
export type TaskStatus = 'open' | 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
  note?: string
}

/** A maintenance task ("work order"): scheduled preventive job, inspection round, or planned repair. */
export interface Task {
  id: string
  number: string
  title: string
  description?: string
  type: TaskType
  status: TaskStatus
  priority: Priority
  assetId?: string
  spaceId?: string
  ticketId?: string
  pmId?: string
  assigneeId?: string
  vendorId?: string
  createdAt: string
  scheduledFor?: string
  /** target selesai / ETA */
  dueAt: string
  startedAt?: string
  completedAt?: string
  checklist: ChecklistItem[]
  timeLogs: { id: string; userId: string; minutes: number; at: string; note?: string }[]
  materials: { id: string; name: string; qty: number; unitCost: number }[]
  vendorCost?: number
  completionNote?: string
}

export type PmFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'

export interface PmSchedule {
  id: string
  name: string
  assetId?: string
  spaceId?: string
  frequency: PmFrequency
  nextDueAt: string
  lastDoneAt?: string
  checklist: string[]
  teamId: string
  assigneeId?: string
  vendorId?: string
  active: boolean
  estMinutes: number
  notes?: string
}

export interface Vendor {
  id: string
  name: string
  trade: string
  contact: string
  phone: string
  email: string
}

/* ---------- rental ---------- */

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface Booking {
  id: string
  number: string
  spaceId: string
  /** 'block' = closed for maintenance / internal use, not a rental */
  kind: 'booking' | 'block'
  /** who entered it */
  userId: string
  renterType: 'internal' | 'external'
  renterName: string
  company?: string
  phone?: string
  title: string
  start: string
  end: string
  attendees: number
  addonIds: string[]
  fee: number
  status: BookingStatus
  note?: string
  createdAt: string
  decidedBy?: string
  decidedAt?: string
  rejectReason?: string
}

export interface Notification {
  id: string
  userId: string
  text: string
  at: string
  read: boolean
  to?: string
  tone?: 'info' | 'warning' | 'success' | 'danger'
}

export interface CannedResponse {
  id: string
  title: string
  body: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  tone: 'info' | 'warning'
  at: string
}
