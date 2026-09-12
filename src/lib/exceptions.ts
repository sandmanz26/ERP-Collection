/**
 * The exception engine.
 *
 * Every exception has to say four things: what it is, what it means, what to do
 * about it and what it costs if nobody does. A list of red flags without the
 * fourth is a list nobody ranks and nobody works.
 */

import type {
  AppSettings, Claim, CompanyProfile, Customer, Delivery, ImportShipment, Invoice, Item, KilnBatch,
  Lot, MaintenanceOrder, MrpLine, Payment, Permit, PurchaseOrder, PurchaseRequisition, QcRecord,
  Quotation, SalesOrder, SubcontractOrder, Supplier, SystemException, WorkOrder,
} from '@/data/types'
import {
  CLAIM_AGEING_DAYS, CONTAINER_FILL_FLOOR, deliveryCountsAgainstOrder, EXCEPTION_META,
  LICENCE_WARNING_DAYS, OPERATION_SCRAP_TOLERANCE, PRICE_VARIANCE_TOLERANCE, QUARANTINE_SLA_DAYS,
  receiptIsOpen, REMNANT_AGEING_DAYS, REQUISITION_SLA_DAYS, SEVERITY_ORDER, supplierCanOrder,
  SUPPLIER_CERT_WARNING_DAYS,
} from '@/data/reference'
import {
  certificateStates, orderProgress, priceVariance, purchaseOrderIsOpen, receiptState,
  supplierQualification,
} from './receiving'
import { scrapByOperation } from './reporting'
import { conversionIsOpen, conversionYield, remnantState, remnantSummary } from './conversion'
import {
  claimCost, claimIsOpen, deliveryDocGate, deliveryIsOpen, invoiceOutstanding, loadPlan,
  quoteClock, quoteValue,
} from './commerce'
import {
  approvalState, maintenanceIsOpen, maintenanceStatusNow, subcontractIsOpen, subcontractState,
} from './operations'
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
  quotations: Quotation[]
  deliveries: Delivery[]
  claims: Claim[]
  payments: Payment[]
  requisitions: PurchaseRequisition[]
  maintenanceOrders: MaintenanceOrder[]
  subcontractOrders: SubcontractOrder[]
  conversionOrders: import('@/data/types').ConversionOrder[]
  remnants: import('@/data/types').Remnant[]
  goodsReceipts: import('@/data/types').GoodsReceipt[]
  productionEntries: import('@/data/types').ProductionEntry[]
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


  /* ---------------- commercial: the pipeline and what goes back out ---------------- */
  x.quotations.forEach((q) => {
    const clock = quoteClock(q)
    if (!clock.live || (!clock.chasing && !clock.lapsed)) return
    const v = quoteValue(q)
    push({
      id: `ex_quote_${q.id}`, kind: 'QUOTE_EXPIRING', severity: clock.lapsed ? 'HIGH' : 'MEDIUM',
      title: clock.lapsed
        ? `${q.code} lapsed ${Math.abs(clock.daysLeft)} day${Math.abs(clock.daysLeft) === 1 ? '' : 's'} ago`
        : `${q.code} expires in ${clock.daysLeft} day${clock.daysLeft === 1 ? '' : 's'}`,
      detail: `${fmtParty(x.customers, q.customerId) ?? q.enquiryFrom ?? 'Enquiry'} — ${Math.round(v.gross).toLocaleString('en-US')} at ${q.probabilityPercent}% probability, revision ${q.revision}.`,
      remedy: clock.lapsed
        ? 'Re-price before re-sending. The timber cost and the rate have both moved since it went out, so the old number is not ours to honour.'
        : 'Chase it now. A quote that lapses has to be re-priced, and re-pricing upward is how a deal that was winnable becomes one that is not.',
      moneyAtRisk: v.gross,
      link: '/quotations', entityLabel: q.code,
    })
  })

  x.deliveries.filter((dv) => deliveryIsOpen(dv.status)).forEach((dv) => {
    const gate = deliveryDocGate(dv)
    if (!gate.ok && (dv.status === 'PACKED' || dv.status === 'LOADED')) {
      push({
        id: `ex_dvdoc_${dv.id}`, kind: 'DELIVERY_DOCS_MISSING', severity: dv.status === 'LOADED' ? 'CRITICAL' : 'HIGH',
        title: `${dv.code} cannot sail — ${gate.missing.length} document${gate.missing.length === 1 ? '' : 's'} outstanding`,
        detail: `${gate.missing.join(', ')} still to be verified on a ${dv.mode.replace(/_/g, ' ').toLowerCase()} to ${dv.destination}.`,
        remedy: 'Clear the paperwork before the cut-off. A container with an unsubmitted PEB does not get a gate pass, and a missed sailing is a week, not a day.',
        link: '/deliveries', entityLabel: dv.code,
      })
    }
    const lp = loadPlan(dv)
    if (lp.underloaded && (dv.status === 'PACKED' || dv.status === 'LOADED')) {
      push({
        id: `ex_dvfill_${dv.id}`, kind: 'DELIVERY_UNDERLOADED', severity: 'MEDIUM',
        title: `${dv.code} is sailing at ${Math.round(lp.fillPercent)}% of its cube`,
        detail: `${lp.cbm.toFixed(1)} m³ loaded into ${lp.capacityCbm.toFixed(1)} m³. ${dv.lines.filter((l) => l.shortQuantity > 0).map((l) => l.shortReason).filter(Boolean).join(' ')}`,
        remedy: `Fill it or hold it. The freight is the same either way, so below ${Math.round(CONTAINER_FILL_FLOOR * 100)}% every piece on board is carrying the empty space as well as itself.`,
        link: '/deliveries', entityLabel: dv.code,
      })
    }
  })

  x.claims.filter((c) => claimIsOpen(c.status)).forEach((c) => {
    const cost = claimCost(c)
    if (!cost.ageing && c.liability !== 'UNDECIDED') return
    push({
      id: `ex_claim_${c.id}`, kind: 'CLAIM_OPEN',
      severity: cost.ageing ? 'HIGH' : 'MEDIUM',
      title: cost.ageing
        ? `${c.code} has been open ${cost.daysOpen} days`
        : `${c.code} still has nobody carrying it`,
      detail: `${fmtParty(x.customers, c.customerId) ?? ''}: ${c.description}`,
      remedy: c.liability === 'UNDECIDED'
        ? 'Decide liability. Until somebody does it sits on our margin, and a carrier claim goes cold the moment the delivery note stops being fresh.'
        : `Settle it. Past ${CLAIM_AGEING_DAYS} days this stops being a quality problem and becomes a relationship one.`,
      moneyAtRisk: cost.net, daysLate: cost.ageing ? cost.daysOpen - CLAIM_AGEING_DAYS : undefined,
      link: '/claims', entityLabel: c.code,
    })
  })

  /* ---------------- cash ---------------- */
  x.payments.filter((p) => p.status === 'BOUNCED').forEach((p) => {
    push({
      id: `ex_bounce_${p.id}`, kind: 'PAYMENT_OVERDUE', severity: 'CRITICAL',
      title: `${p.code} was returned unpaid`,
      detail: `${p.partyName} — ${Math.round(p.amount * (p.fxRate || 1)).toLocaleString('en-US')}. ${p.reference}`,
      remedy: 'Put the invoice straight back to overdue and stop anything new going out to them until it is settled in cleared funds.',
      moneyAtRisk: p.amount * (p.fxRate || 1),
      link: '/finance/payments', entityLabel: p.code,
    })
  })

  x.payments.filter((p) => p.status === 'PENDING_APPROVAL' && p.direction === 'OUT').forEach((p) => {
    const due = p.allocations
      .map((a) => x.invoices.find((i) => i.id === a.invoiceId))
      .filter((i): i is Invoice => !!i)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
    const late = due ? daysBetween(due.dueDate, TODAY) : 0
    if (late <= 0) return
    push({
      id: `ex_paywait_${p.id}`, kind: 'PAYMENT_OVERDUE', severity: late > 14 ? 'HIGH' : 'MEDIUM',
      title: `${p.code} is ${late} day${late === 1 ? '' : 's'} past due and still unsigned`,
      detail: `${p.partyName} — ${Math.round(p.amount * (p.fxRate || 1)).toLocaleString('en-US')} against ${due?.code}. ${p.note ?? ''}`,
      remedy: 'Release it. A supplier in arrears does not release the next lot, and on a sole-source timber auction that is the whole programme.',
      moneyAtRisk: due ? invoiceOutstanding(due, x.payments) : undefined,
      daysLate: late,
      link: '/finance/payments', entityLabel: p.code,
    })
  })

  /* ---------------- operations ---------------- */
  x.requisitions.forEach((r) => {
    const st = approvalState(r)
    if (!st.breachingSla || !st.waitingOn) return
    push({
      id: `ex_req_${r.id}`, kind: 'REQUISITION_WAITING', severity: st.daysWaiting > 5 ? 'HIGH' : 'MEDIUM',
      title: `${r.code} has been with ${st.waitingOn.approverName} for ${st.daysWaiting} days`,
      detail: `${Math.round(st.value).toLocaleString('en-US')} across ${r.lines.length} line(s). ${r.lines[0]?.justification ?? ''}`,
      remedy: `Sign it or send it back. The service level is ${REQUISITION_SLA_DAYS} days, and every day past it comes off the supplier lead time, not the approval queue.`,
      moneyAtRisk: st.value, daysLate: st.daysWaiting - REQUISITION_SLA_DAYS,
      link: '/requisitions', entityLabel: r.code,
    })
  })

  x.maintenanceOrders.filter(maintenanceIsOpen).forEach((m) => {
    const now = maintenanceStatusNow(m)
    if (now !== 'OVERDUE' && m.status !== 'WAITING_PARTS') return
    const load = loads.find((l) => l.workCentre.id === m.workCentreId)
    push({
      id: `ex_maint_${m.id}`, kind: 'MAINTENANCE_OVERDUE',
      severity: m.status === 'WAITING_PARTS' ? 'CRITICAL' : 'HIGH',
      title: m.status === 'WAITING_PARTS'
        ? `${m.assetName} is stopped waiting on a part`
        : `${m.code} is ${daysBetween(m.dueDate, TODAY)} days overdue`,
      detail: `${m.symptom ?? m.note ?? ''} ${load ? `The centre is loaded to ${Math.round(load.utilisation)}% before the ${m.actualDowntimeHours ?? m.plannedDowntimeHours} hours of downtime come off.` : ''}`.trim(),
      remedy: m.status === 'WAITING_PARTS'
        ? 'Expedite the spare and re-plan the centre around the outage. Nothing else on this machine happens until the part lands.'
        : 'Book the downtime now, while it is still a planned four hours rather than an unplanned two days.',
      daysLate: now === 'OVERDUE' ? daysBetween(m.dueDate, TODAY) : undefined,
      link: '/maintenance', entityLabel: m.code,
    })
  })

  x.subcontractOrders.filter((o) => subcontractIsOpen(o.status)).forEach((o) => {
    const st = subcontractState(o)
    if (!st.overdue && !st.lossBeyondTolerance) return
    push({
      id: `ex_sub_${o.id}`, kind: 'SUBCONTRACT_OVERDUE',
      severity: st.overdue && st.daysLate > 5 ? 'HIGH' : 'MEDIUM',
      title: st.overdue
        ? `${o.code} is ${st.daysLate} day${st.daysLate === 1 ? '' : 's'} past due back`
        : `${o.code} lost ${st.lossPercent.toFixed(1)}% at the subcontractor`,
      detail: `${x.suppliers.find((s) => s.id === o.supplierId)?.name ?? ''} — ${o.service}. ${st.note}`,
      remedy: st.overdue
        ? 'Chase it, and re-sequence the operation behind it. A routing step waiting on somebody else’s floor is a customer date waiting three steps downstream.'
        : 'Take it up on the cutting plan before the next order goes out. Loss at this rate is the subcontractor’s method, not our specification.',
      moneyAtRisk: st.overdue ? st.valueAtSubcontractor : st.loss * (o.materials[0]?.unitValue ?? 0),
      daysLate: st.overdue ? st.daysLate : undefined,
      link: '/subcontract', entityLabel: o.code,
    })
  })


  /* ---------------- conversion and the rack ---------------- */
  x.conversionOrders.forEach((o) => {
    if (o.status === 'COMPLETED') {
      const y = conversionYield(o)
      if (!y.short) return
      push({
        id: `ex_cvy_${o.id}`, kind: 'CONVERSION_YIELD', severity: y.costOfShortfall > 20_000_000 ? 'HIGH' : 'MEDIUM',
        title: `${o.code} came in at ${(y.attainment * 100).toFixed(1)}% of its standard yield`,
        detail: `${o.inputs.map((i) => i.description).join(', ')} → ${o.outputs.find((z) => z.role === 'PRIMARY')?.description ?? ''}. ${o.note ?? ''}`,
        remedy: y.recoveryPercent < 8
          ? 'Check the cutting list and the grade before the next run, and rack what comes off it — less than half the loss on this one came back as anything usable.'
          : 'Check the cutting list and the grade before the next run of the same recipe.',
        moneyAtRisk: y.costOfShortfall,
        link: '/conversion', entityLabel: o.code,
      })
      return
    }
    if (conversionIsOpen(o.status) && o.dueDate < TODAY) {
      const late = daysBetween(o.dueDate, TODAY)
      push({
        id: `ex_cvd_${o.id}`, kind: 'CONVERSION_OVERDUE', severity: o.status === 'AT_SUBCONTRACTOR' ? 'HIGH' : 'MEDIUM',
        title: `${o.code} is ${late} day${late === 1 ? '' : 's'} past due`,
        detail: o.status === 'AT_SUBCONTRACTOR'
          ? `Out at ${x.suppliers.find((sp) => sp.id === o.supplierId)?.name ?? 'a third party'}. The material is ours the whole time it is on their floor.`
          : `Running on ${o.workCentreId ? 'our own floor' : 'no centre'}. ${o.note ?? ''}`,
        remedy: 'The work order behind this cannot start without the output. Chase it or re-sequence what is waiting on it.',
        daysLate: late,
        link: '/conversion', entityLabel: o.code,
      })
    }
  })

  {
    const rack = remnantSummary(x.remnants)
    if (rack.ageing > 0) {
      push({
        id: 'ex_rmn_ageing', kind: 'REMNANT_AGEING', severity: rack.ageingValue > 15_000_000 ? 'MEDIUM' : 'LOW',
        title: `${rack.ageing} offcut${rack.ageing === 1 ? '' : 's'} past ${REMNANT_AGEING_DAYS} days on the rack`,
        detail: rack.oldest
          ? `The oldest has been there ${remnantState(rack.oldest).ageDays} days. ${remnantState(rack.oldest).usableFor}`
          : '',
        remedy: 'Put them into a glue-up now or write them off. A rack nobody clears stops being inventory and becomes a place things go to be forgotten.',
        moneyAtRisk: rack.ageingValue,
        link: '/remnants', entityLabel: `${rack.ageing} pieces`,
      })
    }
  }

  /* ---------------- part-delivered orders ---------------- */
  x.deliveries
    .filter((dv) => deliveryCountsAgainstOrder(dv.purpose) && dv.status !== 'CANCELLED')
    .forEach((dv) => {
      const short = dv.lines.filter((l) => l.shortQuantity > 0)
      if (!short.length) return
      push({
        id: `ex_bo_${dv.id}`, kind: 'ORDER_BACKORDER', severity: 'MEDIUM',
        title: `${dv.code} goes out ${short.reduce((a, l) => a + l.shortQuantity, 0)} units short`,
        detail: short.map((l) => `${l.description}: ${l.quantity} of ${l.orderedQuantity}. ${l.shortReason ?? ''}`).join(' '),
        remedy: 'Tell the customer what is following and on which sailing. A short delivery nobody warned them about is a claim waiting to be raised.',
        link: '/deliveries', entityLabel: dv.code,
      })
    })


  /* ---------------- receiving ---------------- */
  x.goodsReceipts.filter((r) => receiptIsOpen(r.status)).forEach((r) => {
    const st = receiptState(r)
    const supplierName = x.suppliers.find((sp) => sp.id === r.supplierId)?.name ?? 'the supplier'

    if (st.quarantineOverdue) {
      push({
        id: `ex_qtn_${r.id}`, kind: 'RECEIPT_AWAITING_QC', severity: 'HIGH',
        title: `${r.code} has sat in quarantine ${st.quarantineDays} days`,
        detail: `${supplierName} — ${Math.round(st.acceptedValue).toLocaleString('en-US')} of material that is on the books and cannot be issued. ${r.note ?? ''}`,
        remedy: `Inspect it or send it back. Past ${QUARANTINE_SLA_DAYS} days this stops being a quality queue and becomes a planning problem, because MRP counts it as stock and the floor cannot draw it.`,
        moneyAtRisk: st.acceptedValue, daysLate: st.quarantineDays - QUARANTINE_SLA_DAYS,
        link: '/receiving', entityLabel: r.code,
      })
    }

    const bad = r.lines.filter((l) => l.discrepancy !== 'NONE')
    if (bad.length > 0) {
      const worst = bad[0]
      push({
        id: `ex_grn_${r.id}`, kind: 'RECEIPT_DISCREPANCY',
        severity: bad.some((l) => l.discrepancy === 'WRONG_ITEM' || l.discrepancy === 'NO_DOCUMENT') ? 'HIGH' : 'MEDIUM',
        title: `${r.code} does not match its order — ${bad.map((l) => l.discrepancy.toLowerCase().replace(/_/g, ' ')).join(', ')}`,
        detail: `${supplierName}. ${worst.discrepancyNote ?? ''}`,
        remedy: worst.discrepancy === 'SHORT'
          ? 'Raise the shortfall with the supplier today and tell planning — a short receipt is a plan that is short by exactly this, now, and the next MRP run needs to see it.'
          : worst.discrepancy === 'DAMAGED'
            ? 'Note it on the driver’s copy before signing, or it stops being the carrier’s problem and becomes ours.'
            : 'Do not put it away. A wrong or off-specification item racked is a wrong item issued three weeks later, by somebody who had no way of knowing.',
        moneyAtRisk: st.rejectedValue || undefined,
        link: '/receiving', entityLabel: r.code,
      })
    }
  })

  /* ---------------- purchasing ---------------- */
  x.purchaseOrders.filter((po) => purchaseOrderIsOpen(po.status)).forEach((po) => {
    const supplier = x.suppliers.find((sp) => sp.id === po.supplierId)
    const prog = orderProgress(po)

    if (prog.late) {
      push({
        id: `ex_pod_${po.id}`, kind: 'PO_OVERDUE',
        severity: prog.daysLate > 14 ? 'HIGH' : 'MEDIUM',
        title: `${po.code} is ${prog.daysLate} day${prog.daysLate === 1 ? '' : 's'} past its date`,
        detail: `${supplier?.name ?? 'Supplier'} — ${Math.round(prog.outstandingValue).toLocaleString('en-US')} still to arrive against a date of ${prog.nextDue}. ${Math.round(prog.percent)}% received so far.`,
        remedy: 'Chase it and re-promise the date, then let the planner net it again. An order whose date has passed is still counted as supply arriving on that date until somebody moves it.',
        moneyAtRisk: prog.outstandingValue, daysLate: prog.daysLate,
        link: `/purchasing/${po.id}`, entityLabel: po.code,
      })
    }

    if (supplier && !supplierCanOrder(supplier.approvalStatus)) {
      push({
        id: `ex_sup_${po.id}`, kind: 'SUPPLIER_UNAPPROVED', severity: 'HIGH',
        title: `${po.code} is on a supplier who is not clear to be ordered from`,
        detail: `${supplier.name} is ${supplier.approvalStatus.replace(/_/g, ' ').toLowerCase()}. ${supplier.openFinding ?? ''}`,
        remedy: 'Close the finding or move the line to an approved source. An order placed under a suspended qualification is the first thing an export buyer’s own audit finds.',
        moneyAtRisk: prog.outstandingValue,
        link: `/suppliers/${supplier.id}`, entityLabel: supplier.name,
      })
    }

    po.lines.forEach((l) => {
      const v = priceVariance(l, x.items, po.fxRateAtOrder)
      if (!v.beyondTolerance || v.variance <= 0) return
      const exposure = v.variance * l.quantity
      if (exposure < 5_000_000) return
      push({
        id: `ex_ppv_${l.id}`, kind: 'PRICE_VARIANCE',
        severity: exposure > 50_000_000 ? 'HIGH' : 'MEDIUM',
        title: `${po.code} buys ${x.items.find((i) => i.id === l.itemId)?.code ?? 'a line'} ${v.variancePercent.toFixed(1)}% above standard`,
        detail: v.note,
        remedy: `Either re-agree the price or move the standard cost. Beyond ${Math.round(PRICE_VARIANCE_TOLERANCE * 100)}% the product still reports the old figure, so every quotation priced off it is wrong by exactly this much.`,
        moneyAtRisk: exposure,
        link: `/purchasing/${po.id}`, entityLabel: po.code,
      })
    })
  })

  /* ---------------- supplier qualification ---------------- */
  x.suppliers.filter((sp) => sp.active).forEach((sp) => {
    const certs = certificateStates(sp)
    const bad = certs.filter((c) => c.expired || c.expiring)
    if (!bad.length) return
    const qual = supplierQualification(sp)
    const worst = bad[0]
    push({
      id: `ex_cert_${sp.id}`, kind: 'SUPPLIER_CERT_EXPIRING',
      severity: worst.expired ? 'HIGH' : 'MEDIUM',
      title: worst.expired
        ? `${sp.name} — ${worst.certificate.kind.replace(/_/g, ' ')} lapsed ${Math.abs(worst.daysLeft)} days ago`
        : `${sp.name} — ${worst.certificate.kind.replace(/_/g, ' ')} expires in ${worst.daysLeft} days`,
      detail: `${worst.certificate.number}, ${worst.certificate.issuer}. ${qual.verdict}`,
      remedy: `Get the renewal on file before the next order. A certificate that lapses inside ${SUPPLIER_CERT_WARNING_DAYS} days will lapse mid-consignment, and a container bought under a lapsed chain of custody cannot be sold as certified whatever the timber was.`,
      link: `/suppliers/${sp.id}`, entityLabel: sp.name,
    })
  })

  /* ---------------- what the floor is losing ---------------- */
  scrapByOperation(x.productionEntries, x.workOrders)
    .filter((r) => r.scrapPercent > OPERATION_SCRAP_TOLERANCE * 100 && r.value > 1_000_000)
    .forEach((r) => {
      push({
        id: `ex_scrap_${r.workOrderId}_${r.operationNo}`, kind: 'SCRAP_SPIKE',
        severity: r.scrapPercent > OPERATION_SCRAP_TOLERANCE * 200 ? 'HIGH' : 'MEDIUM',
        title: `${r.workOrderCode} is losing ${r.scrapPercent.toFixed(1)}% at operation ${r.operationNo}`,
        detail: `${r.operationName} — ${r.scrap} of ${r.produced} pieces, worth ${Math.round(r.value).toLocaleString('en-US')}.${r.defectCode ? ` Booked as ${r.defectCode.replace(/_/g, ' ').toLowerCase()}.` : ' No defect code was recorded, which makes it a number nobody can act on.'}`,
        remedy: `Tolerance at a single operation is ${Math.round(OPERATION_SCRAP_TOLERANCE * 100)}%. Beyond that it is the process, not the day — stand at that machine tomorrow morning rather than reading the report next month.`,
        moneyAtRisk: r.value,
        link: '/reporting', entityLabel: r.workOrderCode,
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

/** A party name for an exception's detail line, without dragging a whole lookup in. */
function fmtParty(customers: Customer[], id: string) {
  return customers.find((c) => c.id === id)?.name
}

export const exceptionGroup = (kind: SystemException['kind']) => EXCEPTION_META[kind]?.group ?? 'Other'
export const exceptionLabel = (kind: SystemException['kind']) => EXCEPTION_META[kind]?.label ?? kind
