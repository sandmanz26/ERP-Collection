/**
 * The conversion engine.
 *
 * Between "we bought a cubic metre of oak" and "we built a wardrobe" there is a
 * step every real works runs and most systems skip: the material changes shape,
 * loses some of itself, and comes out as something with a different name, a
 * different unit and a different cost. This is that step — plus the part of it
 * that falls on the floor and is still worth money.
 */

import type {
  ConversionOrder, Item, Lot, Remnant, WorkCentre, WorkOrder,
} from '@/data/types'
import {
  CONVERSION_YIELD_TOLERANCE, conversionKindMeta, REMNANT_AGEING_DAYS, REMNANT_MIN_LENGTH_MM,
} from '@/data/reference'
import { daysBetween, TODAY } from '@/data/clock'

/* ==================================================================
   Cost and yield
   ================================================================== */

export interface ConversionCost {
  /** what went in, at the cost the lots carried */
  inputValue: number
  /** hours on our own floor, at the centre's labour and overhead rate */
  conversionCost: number
  /** what an outside workshop charged */
  serviceCost: number
  /** everything the run cost, before anything is credited back */
  totalCost: number
  /** the value credited to the offcuts, which comes off the primary output */
  byProductCredit: number
  /** what the primary output has to carry */
  netCostToPrimary: number
  /** and therefore what a unit of it costs */
  outputUnitCost: number
}

export function conversionCost(o: ConversionOrder, workCentres: WorkCentre[]): ConversionCost {
  const inputValue = o.inputs.reduce((a, i) => a + (i.issuedQuantity || i.plannedQuantity) * i.unitCost, 0)
  const centre = workCentres.find((w) => w.id === o.workCentreId)
  const conversion = o.route === 'IN_HOUSE' && centre
    ? o.labourHours * (centre.labourRatePerHour + centre.overheadRatePerHour)
    : 0
  const totalCost = inputValue + conversion + o.serviceCost

  /* An offcut is credited at a fraction of the material it came from, and that
     credit has to come off the primary output — otherwise the offcuts are free
     and the components look cheaper than they are. */
  const primaryUnitInput = o.inputs.length ? o.inputs[0].unitCost : 0
  const byProductCredit = o.outputs
    .filter((x) => x.role === 'BY_PRODUCT')
    .reduce((a, x) => a + (x.producedQuantity || x.plannedQuantity) * primaryUnitInput * x.valueFactor, 0)

  const primary = o.outputs.find((x) => x.role === 'PRIMARY')
  const primaryQty = primary ? primary.producedQuantity || primary.plannedQuantity : 0
  const netCostToPrimary = Math.max(0, totalCost - byProductCredit)

  return {
    inputValue,
    conversionCost: conversion,
    serviceCost: o.serviceCost,
    totalCost,
    byProductCredit,
    netCostToPrimary,
    outputUnitCost: primaryQty > 0 ? netCostToPrimary / primaryQty : 0,
  }
}

export interface ConversionYield {
  /**
   * Output per unit of input the recipe expects. For a breakdown run that is a
   * fraction (0.62 m³ of blank per m³ of board); for a nested cut it is a count
   * (8.6 parts per sheet). The units on the two sides of a conversion are not
   * the same, so a bare percentage of one over the other is meaningless.
   */
  standard: number
  /** what this run actually got, in the same output-per-input terms */
  actual: number
  /**
   * Actual against standard. This is the number that compares across every kind
   * of conversion, and the one a plant manager means by "we hit 98%".
   */
  attainment: number
  variance: number
  /** below standard by more than the tolerance */
  short: boolean
  /** the material the shortfall represents, in money */
  costOfShortfall: number
  /**
   * Of the material value that went in, how much came back out as usable offcut
   * rather than dust. Measured in money because the units never agree.
   */
  recoveryPercent: number
  note: string
}

export function conversionYield(o: ConversionOrder): ConversionYield {
  /* The first input is the one the recipe is written against — the board, the
     sheet, the blank. Anything after it is a consumable of the process (glue,
     veneer) and does not belong in the denominator. */
  const driver = o.inputs[0]
  const issued = driver ? driver.issuedQuantity || driver.plannedQuantity : 0
  const primary = o.outputs.find((x) => x.role === 'PRIMARY')
  const produced = primary ? primary.producedQuantity || primary.plannedQuantity : 0

  const actual = issued > 0 ? produced / issued : 0
  const standard = o.standardYield || conversionKindMeta(o.kind)?.typicalYield || 0.9
  const attainment = standard > 0 ? actual / standard : 0
  const variance = attainment - 1
  const short = variance < -CONVERSION_YIELD_TOLERANCE

  const unit = driver?.unitCost ?? 0
  const inputValue = issued * unit
  /* the material the shortfall represents: the input that would have been needed
     to make up the missing output, at the standard rate */
  const shortfallInput = short && standard > 0 ? (standard * issued - produced) / standard : 0
  const byProductCredit = o.outputs
    .filter((x) => x.role === 'BY_PRODUCT')
    .reduce((a, x) => a + (x.producedQuantity || x.plannedQuantity) * unit * x.valueFactor, 0)

  const outUnit = primary?.uom ?? ''
  const inUnit = driver?.uom ?? ''
  const rate = (n: number) => `${n.toFixed(n < 10 ? 2 : 1)} ${outUnit} per ${inUnit}`

  return {
    standard,
    actual,
    attainment,
    variance,
    short,
    costOfShortfall: short ? shortfallInput * unit : 0,
    recoveryPercent: inputValue > 0 ? (byProductCredit / inputValue) * 100 : 0,
    note: short
      ? `${rate(actual)} against a standard of ${rate(standard)} — ${(attainment * 100).toFixed(1)}% of standard. Making up the shortfall would take another ${shortfallInput.toFixed(2)} ${inUnit}, worth ${Math.round(shortfallInput * unit).toLocaleString('en-US')}.`
      : byProductCredit > 0
        ? `${rate(actual)} against a standard of ${rate(standard)}, and ${Math.round((byProductCredit / inputValue) * 100)}% of the material value came back as usable offcut rather than dust.`
        : `${rate(actual)} against a standard of ${rate(standard)}.`,
  }
}

export const conversionIsOpen = (s: ConversionOrder['status']) =>
  !['COMPLETED', 'CANCELLED'].includes(s)

/** Material that has left the store and not yet come back as output. */
export function conversionWip(orders: ConversionOrder[], workCentres: WorkCentre[]): number {
  return orders
    .filter((o) => ['MATERIAL_ISSUED', 'IN_PROGRESS', 'AT_SUBCONTRACTOR'].includes(o.status))
    .reduce((a, o) => a + conversionCost(o, workCentres).inputValue, 0)
}

export interface ConversionSummary {
  open: number
  wipValue: number
  atSubcontractor: number
  overdue: number
  belowYield: number
  yieldLossValue: number
  /** average attainment against standard, not a raw output-over-input ratio */
  averageYieldPercent: number
  /** of everything that did not become primary output, how much came back as usable offcut */
  recoveryPercent: number
}

export function conversionSummary(orders: ConversionOrder[], workCentres: WorkCentre[]): ConversionSummary {
  const open = orders.filter((o) => conversionIsOpen(o.status))
  const done = orders.filter((o) => o.status === 'COMPLETED')
  const yields = done.map((o) => conversionYield(o))
  /* recovery is measured in money on both sides, because the units never agree */
  const inputValue = done.reduce((a, o) => a + conversionCost(o, workCentres).inputValue, 0)
  const recoveredValue = done.reduce((a, o) => a + conversionCost(o, workCentres).byProductCredit, 0)
  return {
    open: open.length,
    wipValue: conversionWip(orders, workCentres),
    atSubcontractor: open.filter((o) => o.status === 'AT_SUBCONTRACTOR').length,
    overdue: open.filter((o) => o.dueDate < TODAY).length,
    belowYield: yields.filter((y) => y.short).length,
    yieldLossValue: yields.reduce((a, y) => a + y.costOfShortfall, 0),
    averageYieldPercent: yields.length ? (yields.reduce((a, y) => a + y.attainment, 0) / yields.length) * 100 : 0,
    recoveryPercent: inputValue > 0 ? (recoveredValue / inputValue) * 100 : 0,
  }
}

/* ==================================================================
   Remnants
   ================================================================== */

export const remnantValue = (r: Remnant) => r.quantity * r.parentUnitCost * r.valueFactor
export const remnantAge = (r: Remnant) => daysBetween(r.createdAt, r.consumedAt ?? r.writtenOffAt ?? TODAY)

export interface RemnantState {
  value: number
  ageDays: number
  /** old enough that nobody is going to use it now */
  ageing: boolean
  /** too small to be worth the rack space in the first place */
  belowMinimum: boolean
  /** in words: what this piece is still good for */
  usableFor: string
}

/**
 * What a piece is still good for, from its size. A remnant register that only
 * records that something exists is a register nobody picks from — the whole
 * value of it is being able to see, at the rack, that this board makes drawer
 * sides and that one does not.
 */
export function remnantState(r: Remnant): RemnantState {
  const ageDays = remnantAge(r)
  const len = r.lengthMm ?? 0
  const wid = r.widthMm ?? 0
  const belowMinimum = len > 0 && len < REMNANT_MIN_LENGTH_MM

  /*
   * What a piece is good for depends on what kind of thing it is before it
   * depends on how long it is. A 1.2 m sheet drop does not make drawer sides;
   * it makes drawer bottoms. Getting that the wrong way round is how a remnant
   * register stops being believed.
   */
  const thick = r.thicknessMm ?? 0
  const isVeneer = thick > 0 && thick <= 3
  const isSheet = !isVeneer && (r.uom === 'm2' || r.uom === 'sheet')
  const areaM2 = isSheet && len > 0 && wid > 0 ? (len * wid) / 1_000_000 : 0

  let usableFor: string
  if (isVeneer) {
    usableFor = 'Veneer trim. Only matches while the flitch it came from is still being worked — after that it is decorative firewood.'
  } else if (isSheet) {
    usableFor = areaM2 >= 0.5
      ? 'Sheet drop over half a square metre — drawer bottoms, back panels and dust boards, without opening a new sheet.'
      : 'Small sheet drop. Jigs, templates and packing; rarely worth the rack bay it sits in.'
  } else if (belowMinimum) {
    usableFor = 'Too short to rack. Jigs, packing blocks or the boiler.'
  } else if (len >= 1800) {
    usableFor = 'Full-length rails, stiles and bed side rails — as good as new stock for anything under this length.'
  } else if (len >= 1000) {
    usableFor = 'Drawer sides, door stiles and table aprons.'
  } else if (len >= 600) {
    usableFor = 'Drawer fronts, short rails and nightstand components.'
  } else if (len > 0) {
    usableFor = 'Small parts, and edge glue-ups where the width matters more than the length.'
  } else {
    usableFor = 'Blend back into the next batch of the same material.'
  }

  return {
    value: remnantValue(r),
    ageDays,
    ageing: r.status === 'AVAILABLE' && ageDays > REMNANT_AGEING_DAYS,
    belowMinimum,
    usableFor,
  }
}

export interface RemnantSummary {
  available: number
  availableValue: number
  reserved: number
  ageing: number
  ageingValue: number
  writtenOffValue: number
  consumedValue: number
  /** what share of everything ever racked actually got used — the number that justifies the rack */
  recoveryRatePercent: number
  oldest?: Remnant
}

export function remnantSummary(remnants: Remnant[]): RemnantSummary {
  const available = remnants.filter((r) => r.status === 'AVAILABLE')
  const consumed = remnants.filter((r) => r.status === 'CONSUMED')
  const writtenOff = remnants.filter((r) => r.status === 'WRITTEN_OFF')
  const ageing = available.filter((r) => remnantState(r).ageing)
  const settled = consumed.length + writtenOff.length
  return {
    available: available.length,
    availableValue: available.reduce((a, r) => a + remnantValue(r), 0),
    reserved: remnants.filter((r) => r.status === 'RESERVED').length,
    ageing: ageing.length,
    ageingValue: ageing.reduce((a, r) => a + remnantValue(r), 0),
    writtenOffValue: writtenOff.reduce((a, r) => a + remnantValue(r), 0),
    consumedValue: consumed.reduce((a, r) => a + remnantValue(r), 0),
    recoveryRatePercent: settled > 0 ? (consumed.length / settled) * 100 : 0,
    oldest: available.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0],
  }
}

/**
 * Remnants that could cover a requirement for an item, biggest first. This is
 * what turns the rack from a graveyard into stock: before a full board is
 * opened, the planner is shown what is already cut.
 */
export function remnantsFor(remnants: Remnant[], itemId: string): Remnant[] {
  return remnants
    .filter((r) => r.itemId === itemId && r.status === 'AVAILABLE')
    .sort((a, b) => (b.lengthMm ?? 0) - (a.lengthMm ?? 0))
}

/** Remnant cover, in the item's own unit, netted before any purchase is suggested. */
export const remnantCover = (remnants: Remnant[], itemId: string) =>
  remnantsFor(remnants, itemId).reduce((a, r) => a + r.quantity, 0)

/* ==================================================================
   The chain, for the flow map
   ================================================================== */

export interface FlowNode {
  key: string
  label: string
  sub: string
  count: number
  value: number
  link: string
  /** what is stuck here, if anything */
  blocked?: string
  /** why the box is legitimately empty, when it is */
  empty?: string
  /** a second figure in the node's own unit, where money is not the whole story */
  aside?: string
}

/**
 * The material chain, end to end, with what is standing at each node right now.
 * Six boxes and five arrows is the whole business — and being able to see where
 * the value is standing is worth more than any single page in the suite.
 */
export function materialFlow(input: {
  lots: Lot[]
  items: Item[]
  remnants: Remnant[]
  conversions: ConversionOrder[]
  workOrders: WorkOrder[]
  workCentres: WorkCentre[]
  shipmentsInTransit: { count: number; value: number }
  finishedGoods: { count: number; value: number }
  outboundOpen: { count: number; value: number; cbm: number }
}): FlowNode[] {
  const lotValue = (filter: (l: Lot) => boolean) =>
    input.lots.filter(filter).reduce((a, l) => a + l.quantity * l.unitCost, 0)

  const itemType = (id: string) => input.items.find((i) => i.id === id)?.type
  const rawLots = input.lots.filter(
    (l) => l.status === 'AVAILABLE' && itemType(l.itemId) !== 'SEMI_FINISHED' && itemType(l.itemId) !== 'OFFCUT',
  )
  const semiLots = input.lots.filter((l) => l.status === 'AVAILABLE' && itemType(l.itemId) === 'SEMI_FINISHED')
  const blockedLots = input.lots.filter((l) => l.status === 'BLOCKED_KILN' || l.status === 'BLOCKED_QC')
  const openConversions = input.conversions.filter((o) => conversionIsOpen(o.status))
  const openWorkOrders = input.workOrders.filter((w) => !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(w.status))
  const availableRemnants = input.remnants.filter((r) => r.status === 'AVAILABLE')

  return [
    {
      key: 'inbound', label: 'On the water & inbound', sub: 'bought, not landed',
      count: input.shipmentsInTransit.count, value: input.shipmentsInTransit.value,
      link: '/imports',
    },
    {
      key: 'raw', label: 'Raw material', sub: 'landed, cleared, issuable',
      count: rawLots.length, value: lotValue((l) => rawLots.includes(l)),
      link: '/inventory',
      blocked: blockedLots.length
        ? `${blockedLots.length} lot${blockedLots.length === 1 ? '' : 's'} blocked at the kiln or QC gate, worth ${Math.round(lotValue((l) => blockedLots.includes(l))).toLocaleString('en-US')}`
        : undefined,
    },
    {
      key: 'conversion', label: 'In conversion', sub: 'shape changing, ours or theirs',
      count: openConversions.length, value: conversionWip(input.conversions, input.workCentres),
      link: '/conversion',
      blocked: openConversions.filter((o) => o.status === 'AT_SUBCONTRACTOR').length
        ? `${openConversions.filter((o) => o.status === 'AT_SUBCONTRACTOR').length} out at a third party`
        : undefined,
    },
    {
      key: 'semi', label: 'Semi-finished', sub: 'made, waiting to be built with',
      count: semiLots.length, value: lotValue((l) => semiLots.includes(l)),
      link: '/inventory',
    },
    {
      key: 'remnant', label: 'Offcuts on the rack', sub: 'already cut, already paid for',
      count: availableRemnants.length,
      value: availableRemnants.reduce((a, r) => a + remnantValue(r), 0),
      link: '/remnants',
      blocked: availableRemnants.filter((r) => remnantState(r).ageing).length
        ? `${availableRemnants.filter((r) => remnantState(r).ageing).length} past ${REMNANT_AGEING_DAYS} days and heading for a write-off`
        : undefined,
    },
    {
      key: 'wip', label: 'Work in progress', sub: 'on the floor, part built',
      count: openWorkOrders.length,
      value: openWorkOrders.reduce((a, w) => a + w.actualMaterialCost + w.actualLabourCost + w.actualOverheadCost, 0),
      link: '/work-orders',
      blocked: openWorkOrders.filter((w) => w.operations.some((o) => o.status === 'BLOCKED')).length
        ? `${openWorkOrders.filter((w) => w.operations.some((o) => o.status === 'BLOCKED')).length} blocked on a gate`
        : undefined,
    },
    {
      key: 'finished', label: 'Finished goods', sub: 'built, not yet gone',
      count: input.finishedGoods.count, value: input.finishedGoods.value,
      link: '/work-orders',
      empty: input.finishedGoods.count === 0
        ? 'Nothing standing. This is a make-to-order works — what comes off the packing bench is already allocated to a load, so finished stock is a symptom rather than a target.'
        : undefined,
    },
    {
      key: 'outbound', label: 'Out for delivery', sub: 'packed, loaded, in transit',
      count: input.outboundOpen.count, value: input.outboundOpen.value,
      link: '/deliveries',
      aside: input.outboundOpen.cbm > 0 ? `${input.outboundOpen.cbm.toFixed(1)} m³ of cube` : undefined,
    },
  ]
}
