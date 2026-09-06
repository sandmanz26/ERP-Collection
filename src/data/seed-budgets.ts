/**
 * Anggaran belanja — the spending budget an order is judged against.
 *
 * Nothing here is back-solved from a margin. Each budget is exploded from the
 * bill of materials for the models on the order, priced at standard cost,
 * grossed up for the wastage the estimator expects, and then carried through
 * labour, subcontract, overhead, export logistics and the certificates the
 * destination forces on us. The margin is whatever is left, which is the
 * number management actually argues about.
 */
import type { Budget, BudgetLine, CostCategory, Project } from './types'
import { day, intBetween, rng, round, stamp } from './clock'
import { itemById } from './seed-master'
import {
  EXPORT_LOGISTICS_PER_CBM_IDR, LABOUR_RATE_IDR, OVERHEAD_PER_CBM_IDR, explodeBom, recipeFor,
} from './bom'
import { projects } from './seed-projects'
import { stageIndex } from './reference'

/** How much of each category the estimator expects to lose to offcuts and rework. */
export const WASTAGE: Record<CostCategory, number> = {
  TIMBER: 18, PANEL: 8, HARDWARE: 2, FINISHING: 10, UPHOLSTERY: 6, PACKAGING: 3,
  LABOUR: 0, SUBCON: 0, OVERHEAD: 0, EXPORT_LOGISTICS: 0, CERTIFICATION: 0, CONTINGENCY: 0,
}

/** What each certificate costs to obtain, and which orders have to pay for it. */
const CERT_COSTS: { key: string; label: string; idr: number }[] = [
  { key: 'SVLK_VLEGAL', label: 'V-Legal document and legality verification', idr: 4_200_000 },
  { key: 'COO_FORM', label: 'Certificate of origin (e-SKA)', idr: 850_000 },
  { key: 'PEB', label: 'Export declaration and broker fee', idr: 1_450_000 },
  { key: 'FUMIGATION', label: 'Fumigation and treatment certificate', idr: 3_800_000 },
  { key: 'ISPM15', label: 'ISPM-15 heat treatment record', idr: 1_200_000 },
  { key: 'EUDR_DDS', label: 'EUDR evidence pack — geolocation and risk assessment', idr: 6_500_000 },
  { key: 'FSC_COC', label: 'FSC transfer documentation and audit share', idr: 2_900_000 },
  { key: 'LAB_TEST', label: 'Laboratory testing at the buyer’s nominated lab', idr: 5_500_000 },
  { key: 'CARB_TSCA', label: 'CARB / TSCA Title VI panel declaration', idr: 1_900_000 },
]

function budgetLines(project: Project, seed: number): BudgetLine[] {
  const r = rng(seed)
  const out: BudgetLine[] = []
  let n = 0
  const id = () => `bl_${project.id}_${++n}`

  /* ---- material, exploded from the bill of materials ---- */
  const demand = new Map<string, { qty: number; category: CostCategory }>()
  project.items.forEach((pi) => {
    explodeBom(pi.itemRef, pi.qty).forEach((d) => {
      const prev = demand.get(d.itemId)
      demand.set(d.itemId, { qty: (prev?.qty ?? 0) + d.qty, category: prev?.category ?? d.category })
    })
  })

  Array.from(demand.entries())
    .sort((a, b) => a[1].category.localeCompare(b[1].category))
    .forEach(([itemId, d]) => {
      const item = itemById(itemId)
      if (!item) return
      /* the estimator prices a little off standard where the market has moved */
      const drift = 1 + (r() - 0.42) * 0.09
      out.push({
        id: id(),
        category: d.category,
        itemId,
        description: item.name,
        qty: round(d.qty, 3),
        uom: item.uom,
        unitCost: round(item.standardCost * drift, 0),
        wastagePct: WASTAGE[d.category] ?? 0,
        supplierId: item.defaultSupplierId,
      })
    })

  /* ---- our own benches ---- */
  const labourHours = project.items.reduce((a, pi) => a + (recipeFor(pi.itemRef)?.labourHours ?? 0) * pi.qty, 0)
  out.push({
    id: id(),
    category: 'LABOUR',
    description: 'Bench hours — cutting, assembly, sanding, finishing and packing',
    qty: round(labourHours, 1),
    uom: 'HOUR',
    unitCost: LABOUR_RATE_IDR,
    wastagePct: 0,
    note: 'Fully burdened rate. Overtime is not in here — it lands in the variance.',
  })

  /* ---- village workshops on borongan terms ---- */
  const subconTotal = project.items.reduce((a, pi) => a + (recipeFor(pi.itemRef)?.subconIdrPerUnit ?? 0) * pi.qty, 0)
  if (subconTotal > 0) {
    const notes = project.items.map((pi) => recipeFor(pi.itemRef)?.subconNote).filter(Boolean)
    out.push({
      id: id(),
      category: 'SUBCON',
      description: 'Subcontract labour, fixed price per piece',
      qty: 1,
      uom: 'PCS',
      unitCost: round(subconTotal, 0),
      wastagePct: 0,
      supplierId: 'sup_14',
      note: notes[0] ?? undefined,
    })
  }

  /* ---- absorbed cost, against the volume actually shipped ---- */
  const cbm = project.items.reduce((a, pi) => a + pi.qty * pi.cbmPerUnit, 0)
  out.push({
    id: id(),
    category: 'OVERHEAD',
    description: 'Factory overhead absorbed per cubic metre shipped',
    qty: round(cbm, 2),
    uom: 'M3',
    unitCost: OVERHEAD_PER_CBM_IDR,
    wastagePct: 0,
    note: 'Power, kiln fuel, rent, supervision and depreciation.',
  })
  out.push({
    id: id(),
    category: 'EXPORT_LOGISTICS',
    description: 'Trucking to Tanjung Emas, stuffing, terminal handling and forwarding',
    qty: round(cbm, 2),
    uom: 'M3',
    unitCost: EXPORT_LOGISTICS_PER_CBM_IDR,
    wastagePct: 0,
    supplierId: 'sup_18',
  })

  /* ---- certificates the destination forces on us ---- */
  project.compliance.forEach((c) => {
    const cost = CERT_COSTS.find((x) => x.key === c.key)
    if (!cost) return
    out.push({
      id: id(),
      category: 'CERTIFICATION',
      description: cost.label,
      qty: 1,
      uom: 'PCS',
      unitCost: cost.idr,
      wastagePct: 0,
    })
  })

  /* ---- the estimator's own reserve ---- */
  const subtotal = out.reduce((a, bl) => a + bl.qty * bl.unitCost * (1 + bl.wastagePct / 100), 0)
  out.push({
    id: id(),
    category: 'CONTINGENCY',
    description: 'Contingency against rework and timber price movement',
    qty: 1,
    uom: 'PCS',
    unitCost: round(subtotal * 0.025, -3),
    wastagePct: 0,
    note: 'Two and a half per cent. Anything above this is a variance somebody has to explain.',
  })

  return out
}

const PREPARERS = [
  { id: 'usr_04', name: 'Ika Puspitasari' },
  { id: 'usr_14', name: 'Citra Halim' },
]

export const budgets: Budget[] = projects
  .filter((p) => stageIndex(p.stage) >= stageIndex('BUDGETING') || p.code === 'PRJ-26-0041')
  .flatMap((p, i) => {
    const seed = 4001 + i * 13
    const r = rng(seed)
    const idx = stageIndex(p.stage)
    const preparer = PREPARERS[i % 2]
    const preparedDay = -Math.max(6, Math.round((new Date(p.targetShipAt).getTime() - Date.now()) / 86_400_000) * -0.15 - 10)

    const base: Budget = {
      id: `bdg_${p.id}`,
      code: `RAB-26-${String(1200 + i * 7).padStart(4, '0')}`,
      projectId: p.id,
      version: 1,
      status: 'APPROVED',
      preparedById: preparer.id,
      preparedByName: preparer.name,
      preparedAt: stamp(preparedDay, 11),
      submittedAt: stamp(preparedDay + 1, 15),
      approvedByName: 'Rahmat Nugroho',
      approvedAt: stamp(preparedDay + intBetween(r, 2, 5), 9),
      targetMarginPct: 18 + Math.round(r() * 6),
      lines: budgetLines(p, seed),
    }

    /* An order still being costed has a budget nobody has signed yet, and the
       one order where the timber price moved has a second version. */
    if (p.stage === 'BUDGETING') {
      return [{ ...base, status: 'SUBMITTED' as const, approvedByName: undefined, approvedAt: undefined }]
    }
    if (p.stage === 'ORDER_CONFIRMED') {
      return [{ ...base, status: 'DRAFT' as const, submittedAt: undefined, approvedByName: undefined, approvedAt: undefined }]
    }
    if (p.code === 'PRJ-26-0042') {
      const v1: Budget = {
        ...base,
        id: `${base.id}_v1`,
        code: `${base.code}`,
        version: 1,
        status: 'REVISED',
        note: 'Superseded. Teak moved eleven per cent between costing and the first purchase order.',
      }
      const v2: Budget = {
        ...base,
        id: `${base.id}_v2`,
        code: `${base.code}-R1`,
        version: 2,
        status: 'APPROVED',
        preparedAt: stamp(preparedDay + 12, 10),
        submittedAt: stamp(preparedDay + 12, 16),
        approvedAt: stamp(preparedDay + 15, 9),
        lines: base.lines.map((bl) =>
          bl.category === 'TIMBER' ? { ...bl, unitCost: round(bl.unitCost * 1.11, 0) } : bl,
        ),
        note: 'Reissued with the timber lines repriced. The margin fell two and a half points and was accepted rather than reopened with the buyer.',
      }
      return [v1, v2]
    }
    if (idx >= stageIndex('SHIPPED')) return [{ ...base, status: 'CLOSED' as const }]
    return [base]
  })

export const budgetForProject = (projectId: string) =>
  budgets.filter((b) => b.projectId === projectId).sort((a, b) => b.version - a.version)[0]

export const approvedBudget = (projectId: string) =>
  budgets.find((b) => b.projectId === projectId && (b.status === 'APPROVED' || b.status === 'CLOSED'))

export { day as budgetDay }
