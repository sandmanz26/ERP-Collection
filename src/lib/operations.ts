/**
 * The operations engine — the three things that quietly decide whether the plan
 * survives contact with the week: a signature nobody has given, a machine that
 * is down, and work that has left the building and not come back.
 */

import type {
  Item, MaintenanceOrder, PurchaseRequisition, RequisitionApproval, SubcontractOrder,
  Supplier, WorkCentre,
} from '@/data/types'
import {
  APPROVAL_LADDER, PPH23_RATE, REQUISITION_SLA_DAYS, SUBCONTRACT_LOSS_TOLERANCE,
} from '@/data/reference'
import { daysBetween, TODAY } from '@/data/clock'

/* ==================================================================
   Requisitions
   ================================================================== */

export const requisitionValue = (r: PurchaseRequisition) =>
  r.lines.reduce((a, l) => a + l.estimatedUnitCost * l.quantity, 0)

/**
 * Which rungs of the ladder a requisition has to clear. Anything at or below the
 * first limit needs one signature; a container of walnut needs all four. This is
 * the rule that turns "waiting for approval" into a name and a number.
 */
export function requiredApprovals(value: number): typeof APPROVAL_LADDER {
  const needed = APPROVAL_LADDER.filter((_rung, i) => i === 0 || APPROVAL_LADDER[i - 1].limit < value)
  return needed.length ? needed : [APPROVAL_LADDER[0]]
}

export interface ApprovalState {
  value: number
  required: number
  given: number
  /** the person the requisition is actually sitting with right now */
  waitingOn?: RequisitionApproval
  rejected?: RequisitionApproval
  complete: boolean
  daysWaiting: number
  /** past the service level the plan was built assuming */
  breachingSla: boolean
  /** how much lead time the wait has already spent */
  leadTimeLost: string
}

export function approvalState(r: PurchaseRequisition): ApprovalState {
  const value = requisitionValue(r)
  const rejected = r.approvals.find((a) => a.decision === 'REJECTED')
  const pending = r.approvals.filter((a) => a.decision === 'PENDING').sort((a, b) => a.level - b.level)
  const given = r.approvals.filter((a) => a.decision === 'APPROVED').length
  const daysWaiting = ['SUBMITTED', 'PENDING_APPROVAL'].includes(r.status) ? daysBetween(r.raisedAt, TODAY) : 0
  const earliestNeed = r.lines.reduce((a, l) => (a && a < l.requiredDate ? a : l.requiredDate), r.neededBy)
  return {
    value,
    required: r.approvals.length,
    given,
    waitingOn: rejected ? undefined : pending[0],
    rejected,
    complete: !rejected && pending.length === 0 && r.approvals.length > 0,
    daysWaiting,
    breachingSla: daysWaiting > REQUISITION_SLA_DAYS,
    leadTimeLost: daysWaiting > 0
      ? `${daysWaiting} day${daysWaiting === 1 ? '' : 's'} on a desk, against a need date of ${earliestNeed}. Lead time spent waiting is lead time gone.`
      : 'Nothing lost yet.',
  }
}

export const requisitionIsOpen = (s: PurchaseRequisition['status']) =>
  !['CONVERTED', 'REJECTED', 'CANCELLED'].includes(s)

/** Build the approval ladder a requisition of this value needs, all still pending. */
export function buildApprovals(value: number): RequisitionApproval[] {
  return requiredApprovals(value).map((rung, i) => ({
    id: `apr_${rung.level}_${i}`,
    level: rung.level,
    role: rung.role,
    approverName: rung.title,
    limit: rung.limit,
    decision: 'PENDING' as const,
  }))
}

/* ==================================================================
   Maintenance — hours the plan never gets
   ================================================================== */

export function maintenanceStatusNow(m: MaintenanceOrder): MaintenanceOrder['status'] {
  if (m.status === 'COMPLETED' || m.status === 'CANCELLED' || m.status === 'IN_PROGRESS' || m.status === 'WAITING_PARTS') return m.status
  const days = daysBetween(TODAY, m.dueDate)
  if (days < 0) return 'OVERDUE'
  if (days <= 7) return 'DUE'
  return 'SCHEDULED'
}

export const maintenanceIsOpen = (m: MaintenanceOrder) =>
  !['COMPLETED', 'CANCELLED'].includes(m.status)

export const maintenanceCost = (m: MaintenanceOrder) =>
  m.labourCost + m.externalCost + m.partsUsed.reduce((a, p) => a + p.cost, 0)

/**
 * Hours a work centre loses over a window. Capacity that ignores this is
 * capacity that promises a spray booth which is in pieces on Thursday.
 *
 * Work that is already running, waiting on a part, or simply overdue counts
 * whatever its due date says — a machine that stopped last Tuesday is not
 * outside the window, it is in the middle of it.
 */
export function downtimeHours(
  orders: MaintenanceOrder[], workCentreId: string, from = TODAY, days = 14,
): number {
  const to = new Date(from)
  to.setDate(to.getDate() + days)
  const toIso = to.toISOString().slice(0, 10)
  return orders
    .filter((m) => m.workCentreId === workCentreId && maintenanceIsOpen(m))
    .filter((m) => {
      if (m.status === 'IN_PROGRESS' || m.status === 'WAITING_PARTS') return true
      if (m.dueDate < from) return true /* overdue, and still eating the calendar */
      return m.dueDate <= toIso
    })
    .reduce((a, m) => a + (m.actualDowntimeHours ?? m.plannedDowntimeHours), 0)
}

export interface MaintenanceSummary {
  open: number
  overdue: number
  down: number
  downtimeHours: number
  costThisQuarter: number
  /** planned as a share of all maintenance work, by count — the health number */
  preventiveSharePercent: number
  waitingParts: number
  nextDue?: MaintenanceOrder
}

export function maintenanceSummary(orders: MaintenanceOrder[]): MaintenanceSummary {
  const open = orders.filter(maintenanceIsOpen)
  const quarterStart = new Date(TODAY)
  quarterStart.setDate(quarterStart.getDate() - 90)
  const recent = orders.filter((m) => m.dueDate >= quarterStart.toISOString().slice(0, 10))
  const planned = recent.filter((m) => m.kind === 'PREVENTIVE' || m.kind === 'CALIBRATION' || m.kind === 'SAFETY_INSPECTION')
  return {
    open: open.length,
    overdue: open.filter((m) => maintenanceStatusNow(m) === 'OVERDUE').length,
    down: open.filter((m) => m.status === 'IN_PROGRESS' || m.status === 'WAITING_PARTS').length,
    downtimeHours: open.reduce((a, m) => a + (m.actualDowntimeHours ?? m.plannedDowntimeHours), 0),
    costThisQuarter: recent.reduce((a, m) => a + maintenanceCost(m), 0),
    preventiveSharePercent: recent.length ? (planned.length / recent.length) * 100 : 0,
    waitingParts: open.filter((m) => m.status === 'WAITING_PARTS').length,
    nextDue: open.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0],
  }
}

/** Availability per centre — the number an OEE conversation actually starts from. */
export function centreAvailability(centre: WorkCentre, orders: MaintenanceOrder[], days = 14) {
  const scheduled = centre.stations * centre.hoursPerDay * days * (5 / 7)
  const lost = downtimeHours(orders, centre.id, TODAY, days)
  return {
    scheduledHours: scheduled,
    downtimeHours: lost,
    availableHours: Math.max(0, scheduled - lost),
    availabilityPercent: scheduled > 0 ? ((scheduled - lost) / scheduled) * 100 : 100,
  }
}

/* ==================================================================
   Subcontracting — value standing at somebody else's premises
   ================================================================== */

export const subcontractIsOpen = (s: SubcontractOrder['status']) =>
  !['CLOSED', 'CANCELLED', 'DRAFT'].includes(s)

export interface SubcontractState {
  /** goods still physically out — our inventory, their floor */
  valueAtSubcontractor: number
  sent: number
  returned: number
  loss: number
  lossPercent: number
  lossBeyondTolerance: boolean
  /** the service, before withholding */
  serviceValue: number
  withheld: number
  payable: number
  daysOut: number
  daysLate: number
  overdue: boolean
  note: string
}

export function subcontractState(o: SubcontractOrder): SubcontractState {
  const sent = o.materials.reduce((a, m) => a + m.sentQuantity, 0)
  const returned = o.materials.reduce((a, m) => a + m.returnedQuantity, 0)
  const loss = o.materials.reduce((a, m) => a + m.lossQuantity, 0)
  const outstandingValue = o.materials.reduce(
    (a, m) => a + Math.max(0, m.sentQuantity - m.returnedQuantity - m.lossQuantity) * m.unitValue, 0,
  )
  const serviceValue = o.quantity * o.unitRate
  const withheld = serviceValue * o.withholdingRate
  const daysOut = o.sentAt ? daysBetween(o.sentAt, o.returnedAt ?? TODAY) : 0
  const daysLate = subcontractIsOpen(o.status) ? Math.max(0, daysBetween(o.dueBack, TODAY)) : 0
  const lossPercent = sent > 0 ? (loss / sent) * 100 : 0
  return {
    valueAtSubcontractor: subcontractIsOpen(o.status) ? outstandingValue : 0,
    sent,
    returned,
    loss,
    lossPercent,
    lossBeyondTolerance: lossPercent > SUBCONTRACT_LOSS_TOLERANCE * 100,
    serviceValue,
    withheld,
    payable: serviceValue - withheld,
    daysOut,
    daysLate,
    overdue: daysLate > 0,
    note: daysLate > 0
      ? `${daysLate} day${daysLate === 1 ? '' : 's'} past the date it was due back, and the operation behind it cannot start until it is.`
      : o.returnedAt
        ? `Back in ${daysOut} days.`
        : `Out ${daysOut} days, due back ${o.dueBack}.`,
  }
}

export interface SubcontractSummary {
  open: number
  valueOut: number
  overdue: number
  lossValue: number
  withheldThisYear: number
  averageTurnDays: number
  worstSupplier?: { supplier: Supplier; lateOrders: number }
}

export function subcontractSummary(orders: SubcontractOrder[], suppliers: Supplier[]): SubcontractSummary {
  const open = orders.filter((o) => subcontractIsOpen(o.status))
  const closed = orders.filter((o) => o.returnedAt && o.sentAt)
  const late = new Map<string, number>()
  open.forEach((o) => {
    if (subcontractState(o).overdue) late.set(o.supplierId, (late.get(o.supplierId) ?? 0) + 1)
  })
  const worst = [...late.entries()].sort((a, b) => b[1] - a[1])[0]
  return {
    open: open.length,
    valueOut: open.reduce((a, o) => a + subcontractState(o).valueAtSubcontractor, 0),
    overdue: open.filter((o) => subcontractState(o).overdue).length,
    lossValue: orders.reduce((a, o) => a + o.materials.reduce((x, m) => x + m.lossQuantity * m.unitValue, 0), 0),
    withheldThisYear: orders
      .filter((o) => o.issuedAt >= `${TODAY.slice(0, 4)}-01-01`)
      .reduce((a, o) => a + subcontractState(o).withheld, 0),
    averageTurnDays: closed.length
      ? closed.reduce((a, o) => a + daysBetween(o.sentAt!, o.returnedAt!), 0) / closed.length
      : 0,
    worstSupplier: worst
      ? { supplier: suppliers.find((s) => s.id === worst[0])!, lateOrders: worst[1] }
      : undefined,
  }
}

/** PPh 23 is kept back, not saved — it is a prepayment the supplier reclaims. */
export const withholdingOn = (serviceValue: number) => serviceValue * PPH23_RATE

/** Spares a maintenance order is waiting on, matched back to the item master. */
export function partsShortage(orders: MaintenanceOrder[], items: Item[]) {
  return orders
    .filter((m) => m.status === 'WAITING_PARTS')
    .flatMap((m) =>
      m.partsUsed.map((p) => ({
        order: m,
        part: p,
        item: items.find((i) => i.id === p.itemId),
      })),
    )
}
