/* ------------------------------------------------------------------
   Domain calculations that make this an operations system, not a CRUD app.
   ------------------------------------------------------------------ */
import type { CargoItem, ContainerType } from '@/data/types'

/** ISO 6346 container number check-digit validation (e.g. MSKU 663621 5). */
export function validateContainerNo(raw: string): { valid: boolean; reason?: string } {
  const value = raw.replace(/[\s-]/g, '').toUpperCase()
  if (!/^[A-Z]{4}\d{7}$/.test(value)) return { valid: false, reason: 'Format must be 4 letters + 7 digits (ISO 6346)' }
  if (!['U', 'J', 'Z', 'R'].includes(value[3])) return { valid: false, reason: 'Category identifier must be U, J, Z or R' }
  // A=10, skipping multiples of 11
  const letterValue = (c: string) => {
    const base = c.charCodeAt(0) - 55 // A -> 10
    return base + Math.floor((base - 10) / 10) + (base >= 11 ? Math.floor((base - 11) / 10) : 0)
  }
  const table: Record<string, number> = {}
  let v = 10
  for (let i = 0; i < 26; i++) {
    if (v % 11 === 0) v++
    table[String.fromCharCode(65 + i)] = v
    v++
  }
  void letterValue
  let total = 0
  for (let i = 0; i < 10; i++) {
    const ch = value[i]
    const num = i < 4 ? table[ch] : Number(ch)
    total += num * 2 ** i
  }
  const check = (total % 11) % 10
  if (check !== Number(value[10])) return { valid: false, reason: `Check digit should be ${check}` }
  return { valid: true }
}

export const CONTAINER_SPECS: Record<ContainerType, { label: string; teu: number; capacityCbm: number; maxPayloadKg: number; tareKg: number; reefer?: boolean }> = {
  '20GP': { label: "20' General Purpose", teu: 1, capacityCbm: 33.2, maxPayloadKg: 28200, tareKg: 2200 },
  '40GP': { label: "40' General Purpose", teu: 2, capacityCbm: 67.7, maxPayloadKg: 26700, tareKg: 3750 },
  '40HC': { label: "40' High Cube", teu: 2, capacityCbm: 76.4, maxPayloadKg: 26460, tareKg: 3940 },
  '45HC': { label: "45' High Cube", teu: 2.25, capacityCbm: 86.0, maxPayloadKg: 25600, tareKg: 4800 },
  '20RF': { label: "20' Reefer", teu: 1, capacityCbm: 28.3, maxPayloadKg: 27400, tareKg: 3000, reefer: true },
  '40RH': { label: "40' Reefer High Cube", teu: 2, capacityCbm: 67.3, maxPayloadKg: 29520, tareKg: 4800, reefer: true },
  '20OT': { label: "20' Open Top", teu: 1, capacityCbm: 32.5, maxPayloadKg: 28100, tareKg: 2250 },
  '40FR': { label: "40' Flat Rack", teu: 2, capacityCbm: 0, maxPayloadKg: 39500, tareKg: 5700 },
  LCL: { label: 'LCL / Consolidated', teu: 0, capacityCbm: 0, maxPayloadKg: 0, tareKg: 0 },
}

export function itemCbm(item: Pick<CargoItem, 'lengthCm' | 'widthCm' | 'heightCm' | 'quantity'>) {
  const { lengthCm = 0, widthCm = 0, heightCm = 0, quantity = 0 } = item
  return (lengthCm * widthCm * heightCm * quantity) / 1_000_000
}

export function itemGrossKg(item: Pick<CargoItem, 'grossWeightKg' | 'quantity'>) {
  return (item.grossWeightKg || 0) * (item.quantity || 0)
}

/** Sea freight chargeable weight: 1 CBM = 1000 kg revenue tonne. */
export function chargeableWeightTon(cbm: number, grossKg: number) {
  return Math.max(cbm, grossKg / 1000)
}

/** Air freight volumetric weight (IATA divisor 6000). */
export function volumetricWeightKg(cbm: number) {
  return (cbm * 1_000_000) / 6000
}

export type Utilisation = {
  usedCbm: number
  usedKg: number
  capacityCbm: number
  maxPayloadKg: number
  volumePct: number
  weightPct: number
  vgmKg: number
  status: 'EMPTY' | 'LIGHT' | 'HEALTHY' | 'TIGHT' | 'OVERLOADED'
  bottleneck: 'VOLUME' | 'WEIGHT' | 'NONE'
}

export function utilisation(type: ContainerType, items: CargoItem[], tareOverrideKg?: number): Utilisation {
  const spec = CONTAINER_SPECS[type]
  const usedCbm = items.reduce((a, i) => a + itemCbm(i), 0)
  const usedKg = items.reduce((a, i) => a + itemGrossKg(i), 0)
  const capacityCbm = spec.capacityCbm || 0
  const maxPayloadKg = spec.maxPayloadKg || 0
  const volumePct = capacityCbm ? (usedCbm / capacityCbm) * 100 : 0
  const weightPct = maxPayloadKg ? (usedKg / maxPayloadKg) * 100 : 0
  const peak = Math.max(volumePct, weightPct)
  const status: Utilisation['status'] =
    peak > 100 ? 'OVERLOADED' : peak >= 92 ? 'TIGHT' : peak >= 65 ? 'HEALTHY' : peak > 0 ? 'LIGHT' : 'EMPTY'
  return {
    usedCbm,
    usedKg,
    capacityCbm,
    maxPayloadKg,
    volumePct,
    weightPct,
    vgmKg: usedKg + (tareOverrideKg ?? spec.tareKg),
    status,
    bottleneck: peak === 0 ? 'NONE' : volumePct >= weightPct ? 'VOLUME' : 'WEIGHT',
  }
}

/** Suggest the cheapest container mix for a loose cargo pool. */
export function suggestLoadPlan(totalCbm: number, totalKg: number) {
  const options: ContainerType[] = ['40HC', '40GP', '20GP']
  const plan: { type: ContainerType; count: number }[] = []
  let cbm = totalCbm
  let kg = totalKg
  for (const type of options) {
    const spec = CONTAINER_SPECS[type]
    const usableCbm = spec.capacityCbm * 0.92
    const usableKg = spec.maxPayloadKg * 0.95
    while (cbm > usableCbm || kg > usableKg) {
      const existing = plan.find((p) => p.type === type)
      if (existing) existing.count++
      else plan.push({ type, count: 1 })
      cbm -= usableCbm
      kg -= usableKg
      if (plan.reduce((a, p) => a + p.count, 0) > 60) break
    }
  }
  if (cbm > 0 || kg > 0) {
    const fit = options
      .slice()
      .reverse()
      .find((t) => cbm <= CONTAINER_SPECS[t].capacityCbm * 0.92 && kg <= CONTAINER_SPECS[t].maxPayloadKg * 0.95)
    const type = fit ?? '40HC'
    const existing = plan.find((p) => p.type === type)
    if (existing) existing.count++
    else plan.push({ type, count: 1 })
  }
  return plan
}

/** Indonesian tax defaults. */
export const TAX = { vatRate: 11, whtServiceRate: 2 }

export function lineTotals(input: {
  quantity: number
  sellRate: number
  buyRate: number
  fxRate: number
  vatApplicable: boolean
  vatRate?: number
}) {
  const revenue = input.quantity * input.sellRate * input.fxRate
  const cost = input.quantity * input.buyRate * input.fxRate
  const vat = input.vatApplicable ? (revenue * (input.vatRate ?? TAX.vatRate)) / 100 : 0
  const margin = revenue - cost
  return { revenue, cost, vat, margin, marginPct: revenue ? (margin / revenue) * 100 : 0 }
}
