/**
 * The exception engine.
 *
 * Every exception has to say four things: what it is, what it means, what to do
 * about it and what it costs if nobody does. A list of red flags without the
 * fourth is a list nobody ranks and nobody works.
 */

import type {
  AppSettings, CompanyProfile, Customer, ImportShipment, Invoice, Item, KilnBatch, Lot, MrpLine,
  Permit, PurchaseOrder, QcRecord, SalesOrder, Supplier, SystemException, WorkOrder,
} from '@/data/types'
import { EXCEPTION_META, LICENCE_WARNING_DAYS, SEVERITY_ORDER } from '@/data/reference'
import { daysBetween, TODAY } from '@/data/clock'
import { freeTimeState, permitGate, pibGate, preferenceAtRisk } from './importing'
import { belowReorderPoint } from './mrp'
import { capacityLoad, kilnExceptions, workOrderCost } from './production'
import type { CentreLoad } from './production'

export interface ExceptionInput {
  shipments: ImportShipment[]
  purchaseOrders: PurchaseOrder[]
  suppliers: Supplier[]
  permits: Permit[]
  items: Item[]
  lots: Lot[]
  kilnBatches: KilnBatch[]
  workOrders: WorkOrder[]
  workCentres: import('@/data/types').WorkCentre[]
  qcRecords: QcRecord[]
  salesOrders: SalesOrder[]
  customers: Customer[]
  invoices: Invoice[]
  mrpLines: MrpLine[]
  company: CompanyProfile
  settings: AppSettings
}

export function buildExceptions(x: ExceptionInput): SystemException[] {
  const out: SystemException[] = []
  const push = (e: SystemException) => out.push(e)

  /* ---------------- import: free time, demurrage, lanes ---------------- */
  x.shipments.forEach((s) => {
    const ft = freeTimeState(s)

    if (ft.running && ft.chargeableDays > 0) {
      push({
        id: `ex_dem_${s.id}`, kind: 'DEMURRAGE_ACCRUING', severity: 'CRITICAL',
        title: `${s.code} is ${ft.chargeableDays} day${ft.chargeableDays === 1 ? '' : 's'} past free time`,
        detail: `Container ${s.containerNo ?? '—'} discharged ${s.dischargedAt} with ${s.freeTimeDays} days free. Demurrage has been running since ${ft.expiresOn} at ${Math.round(s.demurragePerDay).toLocaleString('en-US')} a day.`,
        remedy: s.lane === 'RED'
          ? 'The red-lane inspection is the blocker. Escalate at the KPPBC and get the missing document to the broker today — every further day is pure loss.'
          : 'Clear it or move it to a bonded store. Nothing about this charge is recoverable.',
        moneyAtRisk: ft.accrued, daysLate: ft.chargeableDays,
        link: `/imports/${s.id}`, entityLabel: s.code,
      })
    } else if (ft.running && (ft.daysRemaining ?? 99) <= 2) {
      push({
        id: `ex_ft_${s.id}`, kind: 'FREE_TIME_ENDING', severity: 'HIGH',
        title: `${s.code} has ${ft.daysRemaining} day${ft.daysRemaining === 1 ? '' : 's'} of free time left`,
        detail: `Free time lapses ${ft.expiresOn}. After that the carrier charges ${Math.round(s.demurragePerDay).toLocaleString('en-US')} a day on ${s.containerNo ?? 'the unit'}.`,
        remedy: 'Clear it before the deadline, or accept the charge and say so out loud rather than discovering it on the invoice.',
        moneyAtRisk: s.demurragePerDay * 5,
        link: `/imports/${s.id}`, entityLabel: s.code,
      })
    }

    /* PIB completeness */
    if (['ARRIVED', 'PIB_SUBMITTED', 'LANE_ASSIGNED'].includes(s.status)) {
      const gate = pibGate(s, x.items)
      gate.problems.forEach((p, i) => {
        push({
          id: `ex_pib_${s.id}_${i}`, kind: 'PIB_INCOMPLETE', severity: 'CRITICAL',
          title: `${s.code}: ${p.title}`,
          detail: p.detail, remedy: p.remedy,
          moneyAtRisk: ft.running ? s.demurragePerDay * Math.max(1, (ft.daysRemaining ?? 0) < 0 ? 3 : 3) : undefined,
          link: `/imports/${s.id}`, entityLabel: s.code,
        })
      })
    }

    /* permits */
    if (!['RECEIVED', 'CANCELLED'].includes(s.status)) {
      const gate = permitGate(s, x.items, x.permits, x.settings.permitWarningDays)
      gate.problems.forEach((p, i) => {
        push({
          id: `ex_pmt_${s.id}_${i}`, kind: p.severity === 'CRITICAL' ? 'PERMIT_MISSING' : 'PERMIT_EXPIRING',
          severity: p.severity,
          title: `${s.code}: ${p.title}`, detail: p.detail, remedy: p.remedy,
          link: `/customs`, entityLabel: s.code,
        })
      })
    }

    /* preferential origin */
    const pref = preferenceAtRisk(s, x.items)
    if (pref && !pref.cooOnFile && !['RECEIVED', 'CANCELLED', 'PLANNED'].includes(s.status)) {
      push({
        id: `ex_coo_${s.id}`, kind: 'COO_MISSING', severity: 'HIGH',
        title: `${s.code} is paying MFN duty for want of a certificate of origin`,
        detail: `Under ${pref.scheme || 'the applicable scheme'} this consignment attracts ${Math.round(pref.preferentialDuty).toLocaleString('en-US')} of duty. Without the certificate it attracts ${Math.round(pref.mfnDuty).toLocaleString('en-US')}.`,
        remedy: 'Get the certificate re-issued and lodge a correction before the declaration is final. After that the money is gone.',
        moneyAtRisk: pref.atRisk,
        link: `/imports/${s.id}`, entityLabel: s.code,
      })
    }

    /* landed cost still provisional long after receipt */
    if (s.status === 'RECEIVED' && !s.costFinalised) {
      push({
        id: `ex_cost_${s.id}`, kind: 'COST_NOT_FINALISED', severity: 'MEDIUM',
        title: `${s.code} received but never costed`,
        detail: `The lots are valued at a provisional cost, so every product using them is priced on a guess.`,
        remedy: 'Chase the outstanding vendor invoices, then finalise and post the allocation.',
        link: `/landed-cost`, entityLabel: s.code,
      })
    }

    /* running late against its own ETA */
    if (s.status === 'ON_WATER' && s.eta && s.eta < TODAY) {
      push({
        id: `ex_late_${s.id}`, kind: 'IMPORT_LATE', severity: 'HIGH',
        title: `${s.code} has not berthed`,
        detail: `${s.vessel ?? 'The vessel'} was due ${s.eta} and is ${daysBetween(s.eta, TODAY)} days over.`,
        remedy: 'Get a revised ETA from the forwarder and re-run the plan against it before the shop floor finds out the hard way.',
        daysLate: daysBetween(s.eta, TODAY),
        link: `/imports/${s.id}`, entityLabel: s.code,
      })
    }
  })

  /* ---------------- material shortages ---------------- */
  x.mrpLines
    .filter((l) => l.slackDays < 0 && l.grossRequirement > 0)
    .slice(0, 12)
    .forEach((l) => {
      const late = l.slackDays === -999 ? undefined : -l.slackDays
      push({
        id: `ex_short_${l.itemId}`, kind: 'MATERIAL_SHORTAGE',
        severity: late === undefined || late > 5 ? 'CRITICAL' : 'HIGH',
        title: late === undefined
          ? `${l.itemCode}: ${Number(l.netRequirement.toFixed(2))} ${l.uom} that nothing covers`
          : `${l.itemCode} lands ${late} day${late === 1 ? '' : 's'} after it is needed`,
        detail: `${l.itemName}. Needed ${l.requiredDate} for ${l.demandFrom.slice(0, 2).join('; ')}${l.demandFrom.length > 2 ? ` and ${l.demandFrom.length - 2} more` : ''}. ${l.coverage}`,
        remedy: late === undefined
          ? `Raise a purchase order for ${Number(l.suggestedOrderQuantity.toFixed(2))} ${l.uom} today — nothing on order or in stock reaches this.`
          : l.supplyKind === 'IMPORT'
          ? 'Re-sequence the work order around the operation that needs it, split the release, or air-freight the balance and price the difference honestly.'
          : l.supplyKind === 'KILN'
            ? 'Nothing to be done but wait for the batch to close in band. Move the operation, not the timber.'
            : `Raise a purchase order for ${l.suggestedOrderQuantity} ${l.uom} today.`,
        daysLate: late,
        link: '/mrp', entityLabel: l.itemCode,
      })
    })

  /* ---------------- reorder points ---------------- */
  belowReorderPoint(x.items, x.lots, x.kilnBatches).slice(0, 5).forEach((r) => {
    push({
      id: `ex_rop_${r.item.id}`, kind: 'REORDER_POINT', severity: r.available <= 0 ? 'HIGH' : 'MEDIUM',
      title: `${r.item.code} below reorder point`,
      detail: `${Math.round(r.available)} ${r.item.uom} available against a reorder point of ${r.item.reorderPoint} and a safety stock of ${r.item.safetyStock}.`,
      remedy: `Total lead time is ${r.item.supplierLeadDays + r.item.transitDays + r.item.inlandDays} days. An order placed today is the earliest cover there is.`,
      link: '/items', entityLabel: r.item.code,
    })
  })

  /* ---------------- kiln ---------------- */
  kilnExceptions(x.kilnBatches).forEach((b) => {
    const outOfBand = b.finalMoisturePercent !== undefined && (b.finalMoisturePercent < b.targetMin || b.finalMoisturePercent > b.targetMax)
    push({
      id: `ex_kiln_${b.id}`, kind: 'KILN_OUT_OF_BAND', severity: 'HIGH',
      title: outOfBand
        ? `${b.code} closed at ${b.finalMoisturePercent}%, outside ${b.targetMin}–${b.targetMax}%`
        : `${b.code} is past its planned close`,
      detail: b.note ?? `${b.species}, ${b.chargeVolumeM3} m³ in ${b.chamber}. ${b.lotIds.length} lot${b.lotIds.length === 1 ? '' : 's'} blocked behind it.`,
      remedy: outOfBand
        ? 'Re-dry the charge and calibrate the chamber before it is loaded again. Issuing wet timber buys a warranty claim eighteen months from now.'
        : 'Take a reading and either close the batch or extend the schedule — an open batch blocks every lot inside it.',
      link: '/kiln', entityLabel: b.code,
    })
  })

  /* ---------------- capacity ---------------- */
  const loads: CentreLoad[] = capacityLoad(x.workCentres, x.workOrders)
  loads.filter((l) => l.utilisation > 100).forEach((l) => {
    push({
      id: `ex_cap_${l.workCentre.id}`, kind: 'CAPACITY_OVERLOAD',
      severity: l.utilisation > 130 ? 'HIGH' : 'MEDIUM',
      title: `${l.workCentre.name} loaded to ${Math.round(l.utilisation)}%`,
      detail: `${Math.round(l.loadedHours)} hours queued against ${Math.round(l.availableHours)} available over the next fortnight, across ${l.openOperations} operations.`,
      remedy: `Add a shift, move work to another centre, or re-promise. ${l.workCentre.kind === 'FINISHING' ? 'A booth plus a cure time is a serial constraint — overtime buys less here than anywhere else.' : 'Re-sequence before the dates start slipping on their own.'}`,
      link: '/capacity', entityLabel: l.workCentre.code,
    })
  })

  /* ---------------- work orders blocked ---------------- */
  x.workOrders.forEach((w) => {
    const blocked = w.operations.find((o) => o.status === 'BLOCKED')
    if (blocked) {
      push({
        id: `ex_wo_${w.id}`, kind: 'ORDER_AT_RISK', severity: w.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        title: `${w.code} blocked at operation ${blocked.operationNo} — ${blocked.name}`,
        detail: blocked.blockReason ?? 'Blocked with no reason recorded.',
        remedy: 'Clear the block or re-plan the order. Everything downstream is standing still.',
        daysLate: Math.max(0, daysBetween(w.dueDate, TODAY)),
        link: `/work-orders/${w.id}`, entityLabel: w.code,
      })
    } else if (!['COMPLETED', 'CLOSED', 'CANCELLED'].includes(w.status) && w.dueDate < TODAY) {
      push({
        id: `ex_wolate_${w.id}`, kind: 'ORDER_AT_RISK', severity: 'HIGH',
        title: `${w.code} is past due`,
        detail: `Due ${w.dueDate}, ${daysBetween(w.dueDate, TODAY)} days ago, and ${w.quantityDone} of ${w.quantity} are done.`,
        remedy: 'Re-date it and tell the customer, or expedite it. Leaving a past-due date on the board tells nobody anything.',
        daysLate: daysBetween(w.dueDate, TODAY),
        link: `/work-orders/${w.id}`, entityLabel: w.code,
      })
    }

    /* cost variance beyond tolerance */
    const c = workOrderCost(w)
    if (['IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(w.status) && Math.abs(c.variancePercent) > x.settings.costVarianceTolerance * 100) {
      push({
        id: `ex_var_${w.id}`, kind: 'COST_VARIANCE', severity: Math.abs(c.variancePercent) > 12 ? 'HIGH' : 'MEDIUM',
        title: `${w.code} running ${c.variancePercent > 0 ? 'over' : 'under'} standard by ${Math.abs(c.variancePercent).toFixed(1)}%`,
        detail: `${c.driver} is the largest driver, at ${Math.round(Math.abs(c.materialVariance)).toLocaleString('en-US')} on material alone.`,
        remedy: 'Find it now rather than at month end. A variance explained six weeks later is a variance nobody can act on.',
        moneyAtRisk: Math.abs(c.totalVariance),
        link: `/work-orders/${w.id}`, entityLabel: w.code,
      })
    }
  })

  /* ---------------- quality ---------------- */
  x.qcRecords.filter((q) => q.result === 'FAIL' && q.disposition === 'PENDING').forEach((q) => {
    push({
      id: `ex_qc_${q.id}`, kind: 'QC_FAILURE', severity: 'HIGH',
      title: `${q.code} failed with no disposition`,
      detail: `${q.failedQuantity} of ${q.lotSize} failed at ${q.point.toLowerCase().replace('_', ' ')} inspection.`,
      remedy: 'Disposition it — accept, rework, downgrade, scrap or return. Stock held without a decision is stock nobody can plan around.',
      moneyAtRisk: q.costImpact, link: '/quality', entityLabel: q.code,
    })
  })
  x.qcRecords
    .filter((q) => q.result === 'FAIL' && q.disposition !== 'PENDING' && daysBetween(q.at, TODAY) <= 14 && q.costImpact > 10_000_000)
    .forEach((q) => {
      push({
        id: `ex_qccost_${q.id}`, kind: 'QC_FAILURE', severity: 'MEDIUM',
        title: `${q.code}: ${q.failedQuantity} failed, ${q.disposition.toLowerCase().replace(/_/g, ' ')}`,
        detail: q.rootCause ?? q.note ?? 'Root cause not recorded.',
        remedy: q.rootCause ? 'Root cause is recorded. Check the corrective action actually happened.' : 'Record the root cause before this closes — a failure without one repeats.',
        moneyAtRisk: q.costImpact, link: '/quality', entityLabel: q.code,
      })
    })

  /* ---------------- commercial ---------------- */
  x.salesOrders.forEach((so) => {
    const customer = x.customers.find((c) => c.id === so.customerId)
    if (!customer) return

    if (so.status === 'PENDING_CONFIRMATION') {
      const openAr = x.invoices
        .filter((i) => i.kind === 'AR' && i.partyId === customer.id && i.status !== 'PAID' && i.status !== 'VOID')
        .reduce((a, i) => a + (i.total - i.paidAmount), 0)
      const orderValue = so.lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0)
      if (openAr + orderValue > customer.creditLimit) {
        push({
          id: `ex_credit_${so.id}`, kind: 'CREDIT_LIMIT', severity: 'HIGH',
          title: `${so.code} would take ${customer.name} past their credit limit`,
          detail: `${Math.round(openAr).toLocaleString('en-US')} already outstanding plus ${Math.round(orderValue).toLocaleString('en-US')} on this order against a limit of ${Math.round(customer.creditLimit).toLocaleString('en-US')}.`,
          remedy: 'Collect, take a deposit, or raise the limit with a decision somebody signs. Do not simply confirm it.',
          moneyAtRisk: openAr + orderValue - customer.creditLimit,
          link: `/orders/${so.id}`, entityLabel: so.code,
        })
      }
      if (so.depositPercent > 0 && so.depositReceived <= 0) {
        push({
          id: `ex_dep_${so.id}`, kind: 'DEPOSIT_MISSING', severity: 'MEDIUM',
          title: `${so.code} has no deposit against ${so.depositPercent}% contracted`,
          detail: `Imported content on this order would have to be financed by us until the customer pays.`,
          remedy: 'Hold the purchase orders until the deposit lands. The company does not finance a customer’s hardware.',
          moneyAtRisk: orderValue * (so.depositPercent / 100),
          link: `/orders/${so.id}`, entityLabel: so.code,
        })
      }
    }

    /* promised earlier than the system said was honest */
    so.lines.forEach((line) => {
      if (!line.confirmedDate || !line.atpDate) return
      if (line.atpDate > line.confirmedDate) {
        const days = daysBetween(line.confirmedDate, line.atpDate)
        push({
          id: `ex_atp_${line.id}`, kind: 'ORDER_AT_RISK',
          severity: customer.latePenaltyPerDay ? 'CRITICAL' : 'HIGH',
          title: `${so.code} promised ${days} day${days === 1 ? '' : 's'} earlier than the plan supports`,
          detail: `${line.description}: confirmed ${line.confirmedDate}, honest date ${line.atpDate}, constrained by ${line.atpConstraint?.toLowerCase()}. ${line.atpNote ?? ''}`,
          remedy: customer.latePenaltyPerDay
            ? `Re-plan or re-negotiate now. The contract carries ${Math.round(customer.latePenaltyPerDay).toLocaleString('en-US')} a day, so ${days} days is ${Math.round(customer.latePenaltyPerDay * days).toLocaleString('en-US')}.`
            : 'Re-plan or tell the customer. A date nobody believes is worse than a later date everybody does.',
          moneyAtRisk: customer.latePenaltyPerDay ? customer.latePenaltyPerDay * days : undefined,
          daysLate: days,
          link: `/orders/${so.id}`, entityLabel: so.code,
        })
      }
    })
  })

  /* ---------------- compliance ---------------- */
  x.company.licences.forEach((l) => {
    if (!l.expiresAt) return
    const days = daysBetween(TODAY, l.expiresAt)
    if (days > LICENCE_WARNING_DAYS) return
    push({
      id: `ex_lic_${l.id}`, kind: 'LICENCE_EXPIRING', severity: days < 0 ? 'CRITICAL' : days < 30 ? 'HIGH' : 'MEDIUM',
      title: days < 0 ? `${l.kind.replace(/_/g, ' ')} has expired` : `${l.kind.replace(/_/g, ' ')} expires in ${days} days`,
      detail: `${l.number}, ${l.authority}. ${l.note ?? ''}`,
      remedy: 'Renew it. Every filing made under a lapsed licence is challengeable, and the renewals all take longer than anybody plans for.',
      link: '/settings', entityLabel: l.number,
    })
  })

  return out.sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (s !== 0) return s
    return (b.moneyAtRisk ?? 0) - (a.moneyAtRisk ?? 0)
  })
}

export const exceptionGroup = (kind: SystemException['kind']) => EXCEPTION_META[kind]?.group ?? 'Other'
export const exceptionLabel = (kind: SystemException['kind']) => EXCEPTION_META[kind]?.label ?? kind
