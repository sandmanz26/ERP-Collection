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
  /** floor the person normally sits on — used to pre-fill location */
  homeSpaceId?: string
  vip?: boolean
}

export interface Team {
  id: string
  name: string
  description: string
  /** the queue that new tickets in these categories land in */
  domain: 'facilities' | 'it' | 'security' | 'workplace'
}

/* ---------- locations ---------- */

export interface Building {
  id: string
  name: string
  code: string
  address: string
  floors: number
}

export type SpaceKind = 'meeting' | 'office' | 'common' | 'pantry' | 'technical' | 'lobby' | 'parking' | 'restroom'

export interface Space {
  id: string
  buildingId: string
  floor: number
  name: string
  kind: SpaceKind
  capacity: number
  bookable: boolean
  amenities: string[]
}

/* ---------- catalogue ---------- */

export type Priority = 'p1' | 'p2' | 'p3' | 'p4'
export type TicketKind = 'incident' | 'request'

export interface Category {
  id: string
  name: string
  domain: Team['domain']
  teamId: string
  parentId?: string
  kind: TicketKind
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
  startMin: number // minutes from midnight
  endMin: number
  holidays: string[] // yyyy-MM-dd
}

/* ---------- tickets ---------- */

export type TicketStatus = 'new' | 'assigned' | 'in_progress' | 'pending' | 'resolved' | 'closed' | 'cancelled'
export type PendingReason = 'requester' | 'vendor' | 'parts' | 'approval'
export type Channel = 'portal' | 'email' | 'phone' | 'walk_in' | 'qr' | 'inspection'

export type ActivityType = 'created' | 'comment' | 'note' | 'status' | 'assign' | 'priority' | 'workorder' | 'system' | 'csat'

export interface Activity {
  id: string
  at: string
  actorId: string | null // null = system
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
  kind: TicketKind
  categoryId: string
  priority: Priority
  status: TicketStatus
  pendingReason?: PendingReason
  requesterId: string
  assigneeId?: string
  teamId: string
  spaceId?: string
  assetId?: string
  channel: Channel
  createdAt: string
  updatedAt: string
  firstResponseAt?: string
  resolvedAt?: string
  closedAt?: string
  /** SLA clock stops while pending */
  pausedAt?: string
  pausedMs: number
  dueResponseAt: string
  dueResolveAt: string
  tags: string[]
  workOrderIds: string[]
  attachments?: string[]
  csat?: { score: number; comment?: string; at: string }
  resolutionNote?: string
  activity: Activity[]
  /** unread by the requester */
  unreadForRequester?: boolean
}

/* ---------- assets, work, PM ---------- */

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

export type WorkOrderType = 'corrective' | 'preventive' | 'inspection'
export type WorkOrderStatus = 'open' | 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
  note?: string
}

export interface WorkOrder {
  id: string
  number: string
  title: string
  description?: string
  type: WorkOrderType
  status: WorkOrderStatus
  priority: Priority
  assetId?: string
  spaceId?: string
  ticketId?: string
  pmId?: string
  assigneeId?: string
  vendorId?: string
  createdAt: string
  scheduledFor?: string
  dueAt: string
  startedAt?: string
  completedAt?: string
  checklist: ChecklistItem[]
  timeLogs: { id: string; userId: string; minutes: number; at: string; note?: string }[]
  materials: { id: string; name: string; qty: number; unitCost: number }[]
  vendorCost?: number
  completionNote?: string
}

export type PmFrequency = 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'

export interface PmSchedule {
  id: string
  name: string
  assetId: string
  frequency: PmFrequency
  nextDueAt: string
  lastDoneAt?: string
  checklist: string[]
  teamId: string
  vendorId?: string
  active: boolean
  estMinutes: number
}

/* ---------- vendors ---------- */

export interface Vendor {
  id: string
  name: string
  trade: string
  contact: string
  phone: string
  email: string
  rating: number
  responseHours: number
}

export interface Contract {
  id: string
  vendorId: string
  title: string
  startsAt: string
  endsAt: string
  annualValue: number
  scope: string
  autoRenew: boolean
}

/* ---------- workplace ---------- */

export interface Booking {
  id: string
  spaceId: string
  userId: string
  title: string
  start: string
  end: string
  attendees: number
  status: 'confirmed' | 'cancelled'
  catering?: boolean
}

export type VisitorStatus = 'expected' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'

export interface Visitor {
  id: string
  name: string
  company: string
  email: string
  hostId: string
  purpose: string
  expectedAt: string
  status: VisitorStatus
  checkedInAt?: string
  checkedOutAt?: string
  passCode: string
  vehicle?: string
  ndaSigned?: boolean
}

export interface KbArticle {
  id: string
  title: string
  categoryId: string
  summary: string
  body: string[] // paragraphs; lines starting with "- " render as bullets, "## " as a heading
  views: number
  helpful: number
  notHelpful: number
  updatedAt: string
  authorId: string
  audience: 'everyone' | 'staff'
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
  buildingId?: string
}
