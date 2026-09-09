/**
 * The import engine.
 *
 * Everything here answers one of three questions: what will this consignment
 * cost, when will it actually be available to issue, and what is stopping it.
 */

import type {
  AllocationBasis, ImportCost, ImportShipment, Item, Permit, PurchaseOrder, ShipmentLine, Supplier,
} from '@/data/types'
import {
  IMPORT_COST_CODES, IMPORT_DOC_TYPES, LARTAS_PERMITS, laneExpectedDays, lartasRequiresPermit,
} from '@/data/reference'
import { addDays, daysBetween, TODAY } from '@/data/clock'

/* ==================================================================
   Values
   ================================================================== */

const cost = (s: ImportShipment, code: ImportCost['code']) =>
  s.costs.filter((c) => c.code === code).reduce((a, c) => a + c.amount * c.fxRate, 0)

/** Goods value in rupiah, at the rate the invoice will actually be settled at. */
export function goodsValueIdr(s: ImportShipment) {
  return s.lines.reduce((a, l) => a + l.quantity * l.unitPriceFob, 0) * s.fxRateAtOrder
}

/**
 * The customs value: cost, insurance and freight, converted at the NDPBM — the
 * Minister of Finance rate in force on the PIB date, which is deliberately not
 * the rate the invoice is paid at.
 */
export function customsValueIdr(s: ImportShipment) {
  const rate = s.ndpbm ?? s.fxRateAtOrder
  const goodsFob = s.lines.reduce((a, l) => a + l.quantity * l.unitPriceFob, 0)
  const freight = s.costs.filter((c) => c.code === 'FREIGHT').reduce((a, c) => a + c.amount * (c.currency === 'IDR' ? 1 : rate), 0)
  const insurance = s.costs.filter((c) => c.code === 'INSURANCE').reduce((a, c) => a + c.amount * (c.currency === 'IDR' ? 1 : rate), 0)
  return goodsFob * rate + freight + insurance
}

/**
 * The gap between the rate duty was computed on and the rate the supplier is
 * actually paid at. It is a real number on a real shipment, and it is invisible
 * in every system that keeps only one rate.
 */
export function ndpbmVariance(s: ImportShipment) {
  if (!s.ndpbm || s.currency === 'IDR') return null
  const goodsFob = s.lines.reduce((a, l) => a + l.quantity * l.unitPriceFob, 0)
  return {
    ndpbm: s.ndpbm,
    settlementRate: s.fxRateAtOrder,
    perUnitGap: s.fxRateAtOrder - s.ndpbm,
    amount: goodsFob * (s.fxRateAtOrder - s.ndpbm),
  }
}

/** Everything that becomes inventory cost — creditable taxes deliberately excluded. */
export function landedCostTotal(s: ImportShipment) {
  return s.costs
    .filter((c) => !c.creditable && IMPORT_COST_CODES.find((m) => m.value === c.code)?.inLandedCost)
    .reduce((a, c) => a + c.amount * c.fxRate, 0)
}

/** Creditable taxes: real cash out, but never part of what the material cost. */
export function creditableTaxes(s: ImportShipment) {
  return { ppn: cost(s, 'PPN'), pph22: cost(s, 'PPH22'), total: cost(s, 'PPN') + cost(s, 'PPH22') }
}

export function dutyTotal(s: ImportShipment) {
  return cost(s, 'DUTY')
}

/* ==================================================================
   Landed cost allocation
   ================================================================== */

export interface AllocatedLine {
  line: ShipmentLine
  itemCode: string
  itemName: string
  customsValue: number
  goodsCost: number
  /** every non-creditable cost that landed on this line, by code */
  allocated: { code: ImportCost['code']; label: string; basis: AllocationBasis; amount: number }[]
  allocatedTotal: number
  landedTotal: number
  landedUnitCost: number
  standardCost: number
  /** landed against the item's standard cost, in money and per cent */
  ppvAmount: number
  ppvPercent: number
}

function basisWeight(l: ShipmentLine, basis: AllocationBasis, rate: number): number {
  switch (basis) {
    case 'GROSS_WEIGHT': return l.grossWeightKg
    case 'VOLUME': return l.volumeCbm
    case 'QUANTITY': return l.quantity
    case 'CUSTOMS_VALUE':
    case 'DIRECT':
    default: return l.quantity * l.unitPriceFob * rate
  }
}

/**
 * Spread every non-creditable cost over the lines on its own basis. Freight goes
 * by volume because a container is bought by the box and consumed by the cubic
 * metre; trucking by weight because that is what a haulier prices; duty by
 * customs value because that is how it was assessed in the first place.
 */
export function allocateLandedCost(s: ImportShipment, items: Item[]): AllocatedLine[] {
  const rate = s.ndpbm ?? s.fxRateAtOrder
  const relevant = s.costs.filter(
    (c) => !c.creditable && c.code !== 'GOODS' && IMPORT_COST_CODES.find((m) => m.value === c.code)?.inLandedCost,
  )

  return s.lines.map((line) => {
    const item = items.find((i) => i.id === line.itemId)
    const customsValue = line.quantity * line.unitPriceFob * rate
    const goodsCost = line.quantity * line.unitPriceFob * s.fxRateAtOrder

    const allocated = relevant.map((c) => {
      const total = s.lines.reduce((a, l) => a + basisWeight(l, c.basis, rate), 0)
      const share = total > 0 ? basisWeight(line, c.basis, rate) / total : 0
      /* duty is assessed per line at that line's own rate, not spread */
      const amount = c.code === 'DUTY'
        ? customsValue * (line.dutyRateApplied / 100)
        : c.amount * c.fxRate * share
      return { code: c.code, label: IMPORT_COST_CODES.find((m) => m.value === c.code)!.label, basis: c.basis, amount }
    })

    const allocatedTotal = allocated.reduce((a, x) => a + x.amount, 0)
    const landedTotal = goodsCost + allocatedTotal
    const landedUnitCost = line.quantity ? landedTotal / line.quantity : 0
    const standardCost = item?.standardCost ?? 0
    const ppvAmount = (landedUnitCost - standardCost) * line.quantity

    return {
      line, itemCode: item?.code ?? line.itemId, itemName: item?.name ?? line.itemId,
      customsValue, goodsCost, allocated, allocatedTotal, landedTotal, landedUnitCost,
      standardCost, ppvAmount,
      ppvPercent: standardCost > 0 ? ((landedUnitCost - standardCost) / standardCost) * 100 : 0,
    }
  })
}

/**
 * What the missing certificate of origin actually costs: duty at the MFN rate
 * against duty at the preferential rate the COO would have bought.
 */
export function preferenceAtRisk(s: ImportShipment, items: Item[]) {
  const coo = s.documents.find((doc) => doc.type === 'COO')
  const cooOnFile = coo?.status === 'VERIFIED' || coo?.status === 'RECEIVED'
  const rate = s.ndpbm ?? s.fxRateAtOrder
  let mfn = 0
  let preferential = 0
  let scheme = ''
  s.lines.forEach((l) => {
    const item = items.find((i) => i.id === l.itemId)
    if (!item || item.dutyRatePreferential === undefined) return
    const cv = l.quantity * l.unitPriceFob * rate
    mfn += cv * (item.dutyRateMfn / 100)
    preferential += cv * (item.dutyRatePreferential / 100)
    scheme = item.preferentialScheme ?? scheme
  })
  const gap = mfn - preferential
  if (gap <= 0) return null
  return { cooOnFile, scheme, mfnDuty: mfn, preferentialDuty: preferential, atRisk: gap }
}

/* ==================================================================
   Time — free time, demurrage, clearance, availability
   ================================================================== */

export interface FreeTimeState {
  running: boolean
  /** the day free time lapses */
  expiresOn?: string
  daysRemaining?: number
  chargeableDays: number
  accrued: number
  perDay: number
}

/** Free time runs from discharge. Nothing else starts that clock. */
export function freeTimeState(s: ImportShipment, asOf = TODAY): FreeTimeState {
  if (!s.dischargedAt || s.status === 'RECEIVED' || s.status === 'CANCELLED') {
    const billed = s.costs.filter((c) => c.code === 'DEMURRAGE' || c.code === 'DETENTION')
      .reduce((a, c) => a + c.amount * c.fxRate, 0)
    return { running: false, chargeableDays: s.demurragePerDay ? Math.round(billed / s.demurragePerDay) : 0, accrued: billed, perDay: s.demurragePerDay }
  }
  const expiresOn = addDays(s.dischargedAt, s.freeTimeDays)
  const over = daysBetween(expiresOn, asOf)
  const chargeableDays = Math.max(0, over)
  return {
    running: true,
    expiresOn,
    daysRemaining: -over,
    chargeableDays,
    accrued: chargeableDays * s.demurragePerDay,
    perDay: s.demurragePerDay,
  }
}

/**
 * How long clearance should take, from this supplier's own record rather than
 * from a constant. Once a lane has actually been assigned, the lane decides.
 */
export function expectedClearanceDays(s: ImportShipment, supplier?: Supplier): number {
  if (s.lane !== 'PENDING') return laneExpectedDays(s.lane)
  if (!supplier) return 4
  const h = supplier.laneHistory
  const n = h.green + h.yellow + h.red
  if (!n) return supplier.avgClearanceDays || 4
  return (h.green * 1 + h.yellow * 4 + h.red * 9) / n
}

export interface AvailabilityEstimate {
  date: string
  /** how the date was arrived at, in a sentence a planner can act on */
  explanation: string
  stage: 'ON_HAND' | 'IN_PRODUCTION' | 'ON_WATER' | 'CLEARING' | 'INLAND' | 'RECEIVED' | 'BLOCKED'
  confident: boolean
}

/**
 * When this consignment becomes available to issue — which is never the ETA.
 * ETA, plus the lane, plus the trucking, plus the day incoming QC takes.
 */
export function availableDate(s: ImportShipment, supplier: Supplier | undefined, items: Item[], asOf = TODAY): AvailabilityEstimate {
  const inlandDays = Math.max(...s.lines.map((l) => items.find((i) => i.id === l.itemId)?.inlandDays ?? 2), 1)
  const clearance = Math.round(expectedClearanceDays(s, supplier))

  if (s.status === 'RECEIVED') {
    return { date: s.receivedAt ?? asOf, explanation: 'Received and available.', stage: 'RECEIVED', confident: true }
  }
  if (s.status === 'CLEARED') {
    const date = addDays(s.sppbDate ?? asOf, inlandDays)
    return { date, explanation: `SPPB issued. ${inlandDays} day${inlandDays === 1 ? '' : 's'} to truck it in and pass incoming inspection.`, stage: 'INLAND', confident: true }
  }
  if (s.status === 'LANE_ASSIGNED' || s.status === 'PIB_SUBMITTED' || s.status === 'ARRIVED') {
    const from = s.pibDate ?? s.dischargedAt ?? asOf
    const date = addDays(from, clearance + inlandDays)
    const laneWord = s.lane === 'PENDING' ? 'expected lane' : `${s.lane.toLowerCase()} lane`
    return {
      date,
      explanation: `PIB ${s.pibNumber ? `${s.pibNumber} ` : ''}in the ${laneWord}: ${clearance} days to SPPB${s.lane === 'PENDING' && supplier ? ` on ${supplier.name.split(' ')[0]}’s own record` : ''}, then ${inlandDays} inland.`,
      stage: 'CLEARING',
      confident: s.lane !== 'PENDING',
    }
  }
  if (s.status === 'ON_WATER' || s.status === 'BOOKED') {
    const eta = s.eta ?? asOf
    const date = addDays(eta, clearance + inlandDays)
    return {
      date,
      explanation: `Berths ${eta}, then ${clearance} days clearance on this supplier’s record and ${inlandDays} inland.`,
      stage: 'ON_WATER',
      confident: s.status === 'ON_WATER',
    }
  }
  if (s.status === 'IN_PRODUCTION' || s.status === 'ORDERED') {
    const eta = s.eta ?? addDays(s.supplierReadyDate ?? asOf, 20)
    const date = addDays(eta, clearance + inlandDays)
    return { date, explanation: `Still at the supplier. Ready ${s.supplierReadyDate ?? '—'}, ETA ${eta}, then ${clearance + inlandDays} days to become issuable.`, stage: 'IN_PRODUCTION', confident: false }
  }
  return {
    date: addDays(s.eta ?? asOf, clearance + inlandDays),
    explanation: 'Blocked before it has even been ordered — nothing here is a date you can plan against.',
    stage: 'BLOCKED',
    confident: false,
  }
}

/* ==================================================================
   Gates
   ================================================================== */

export interface GateResult {
  ok: boolean
  problems: { title: string; detail: string; remedy: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' }[]
}

/**
 * The permit gate. A purchase order carrying a restricted line does not go to
 * the supplier until the permit is on file, covers the HS code and does not
 * lapse before the goods arrive.
 */
export function permitGate(
  s: ImportShipment, items: Item[], permits: Permit[], warningDays = 60, asOf = TODAY,
): GateResult {
  const problems: GateResult['problems'] = []
  const held = permits.filter((p) => s.permitIds.includes(p.id) || p.coversHsCodes.includes('*'))
  const arrival = s.eta ?? asOf

  s.lines.forEach((line) => {
    const item = items.find((i) => i.id === line.itemId)
    if (!item || !lartasRequiresPermit(item.lartas)) return
    const needed = LARTAS_PERMITS[item.lartas]
    needed.forEach((kind) => {
      const match = held.find((p) => p.kind === kind && (p.coversHsCodes.includes(item.hsCode) || p.coversHsCodes.includes('*')))
      if (!match) {
        problems.push({
          title: `${kind.replace(/_/g, ' ')} missing for ${item.code}`,
          detail: `${item.name} is under ${item.lartas.replace(/_/g, ' ')} and nothing on file covers HS ${item.hsCode}.`,
          remedy: 'File it before the consignment is entered. Customs will not channel a declaration without it.',
          severity: 'CRITICAL',
        })
        return
      }
      if (!match.expiresAt) return
      const daysLeft = daysBetween(asOf, match.expiresAt)
      if (daysLeft < 0) {
        problems.push({
          title: `${match.number} expired ${Math.abs(daysLeft)} days ago`,
          detail: `${match.authority}. It covered an earlier consignment; it covers nothing now.`,
          remedy: 'Re-file before the next order under these HS codes is released.',
          severity: 'CRITICAL',
        })
      } else if (match.expiresAt < arrival) {
        problems.push({
          title: `${match.number} lapses before arrival`,
          detail: `Valid until ${match.expiresAt}; the vessel berths ${arrival}. A declaration that has expired by arrival is no declaration at all.`,
          remedy: 'Renew now, or the container sits at the terminal accruing demurrage while it is re-filed.',
          severity: 'CRITICAL',
        })
      } else if (daysLeft <= warningDays) {
        problems.push({
          title: `${match.number} expires in ${daysLeft} days`,
          detail: `${match.authority}. It still covers this consignment, but not the next one.`,
          remedy: 'Start the renewal. These take six weeks and nobody has ever filed one early.',
          severity: 'HIGH',
        })
      }
    })
  })

  /* several lines can sit under one permit — report the permit once, not once per line */
  const seen = new Set<string>()
  const deduped = problems.filter((x) => (seen.has(x.title) ? false : (seen.add(x.title), true)))
  return { ok: deduped.length === 0, problems: deduped }
}

/** A PIB cannot be submitted with a mandatory document missing. */
export function pibGate(s: ImportShipment, items: Item[]): GateResult {
  const problems: GateResult['problems'] = []
  const needsSurvey = s.lines.some((l) => items.find((i) => i.id === l.itemId)?.lartas === 'IP_B2')
  const needsPermit = s.lines.some((l) => lartasRequiresPermit(items.find((i) => i.id === l.itemId)?.lartas ?? 'NONE'))

  s.documents.forEach((doc) => {
    const meta = IMPORT_DOC_TYPES.find((t) => t.value === doc.type)
    const mandatory = doc.mandatory
      || (doc.type === 'SURVEY_REPORT' && needsSurvey)
      || (doc.type === 'PERMIT' && needsPermit)
    if (!mandatory || doc.status === 'NOT_APPLICABLE') return
    if (doc.type === 'SPPB') return
    if (doc.status === 'REQUIRED' || doc.status === 'REJECTED') {
      problems.push({
        title: `${meta?.label ?? doc.type} not on file`,
        detail: doc.note ?? meta?.hint ?? 'Required before the declaration can be lodged.',
        remedy: 'Chase it. Everything downstream of the PIB waits on this one piece of paper.',
        severity: 'CRITICAL',
      })
    }
  })

  return { ok: problems.length === 0, problems }
}

/** How complete the document set is, as a fraction, for a meter. */
export function documentCompleteness(s: ImportShipment) {
  const applicable = s.documents.filter((doc) => doc.status !== 'NOT_APPLICABLE')
  const done = applicable.filter((doc) => doc.status === 'VERIFIED' || doc.status === 'RECEIVED')
  return { done: done.length, total: applicable.length, percent: applicable.length ? (done.length / applicable.length) * 100 : 100 }
}

/** Whether every cost line has stopped moving. Until then, receipts are provisional. */
export function costCompleteness(s: ImportShipment) {
  const actual = s.costs.filter((c) => c.actual).length
  return { actual, total: s.costs.length, percent: s.costs.length ? (actual / s.costs.length) * 100 : 100 }
}

/** Total days from purchase order to available-to-issue — the number every promise rests on. */
export function actualLeadDays(s: ImportShipment, orders: PurchaseOrder[]) {
  const po = orders.find((o) => o.shipmentId === s.id)
  if (!po || !s.receivedAt) return null
  return daysBetween(po.orderDate, s.receivedAt)
}
