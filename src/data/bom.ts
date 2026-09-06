/**
 * The bill of materials, one recipe per model the factory makes.
 *
 * This is the bridge between an order and everything downstream: the budget is
 * costed from it, the purchase requests are raised from it, and the material a
 * work order consumes is issued against it. Quantities are per finished piece,
 * before wastage.
 */
import type { CostCategory, ID, Uom } from './types'
import { itemById } from './seed-master'

export interface BomLine {
  itemId: ID
  qtyPerUnit: number
  category: CostCategory
  /** what this allowance covers, when it is not obvious from the item name */
  note?: string
}

export interface BomRecipe {
  model: string
  lines: BomLine[]
  /** our own bench hours per piece */
  labourHours: number
  /** paid to a village workshop per piece, on borongan terms */
  subconIdrPerUnit: number
  subconNote?: string
}

const l = (itemId: string, qtyPerUnit: number, category: CostCategory, note?: string): BomLine =>
  ({ itemId, qtyPerUnit, category, note })

export const RECIPES: BomRecipe[] = [
  {
    model: 'DIN-TBL-200',
    labourHours: 9.5,
    subconIdrPerUnit: 0,
    lines: [
      l('itm_t01', 0.26, 'TIMBER', 'Top, apron and legs in A-grade teak.'),
      l('itm_h03', 12, 'HARDWARE', 'Knock-down bolts — the table ships flat.'),
      l('itm_h05', 4, 'HARDWARE'),
      l('itm_f03', 0.9, 'FINISHING'),
      l('itm_f04', 0.7, 'FINISHING'),
      l('itm_f02', 0.4, 'FINISHING'),
      l('itm_c03', 0.35, 'PACKAGING', 'Glue, absorbed with the packing allowance.'),
      l('itm_k01', 1, 'PACKAGING'),
      l('itm_k03', 6, 'PACKAGING'),
      l('itm_k05', 8, 'PACKAGING'),
      l('itm_k04', 0.15, 'PACKAGING'),
    ],
  },
  {
    model: 'DIN-TBL-180',
    labourHours: 8.4,
    subconIdrPerUnit: 0,
    lines: [
      l('itm_t01', 0.21, 'TIMBER'),
      l('itm_h03', 12, 'HARDWARE'),
      l('itm_h05', 4, 'HARDWARE'),
      l('itm_f03', 0.8, 'FINISHING'),
      l('itm_f04', 0.6, 'FINISHING'),
      l('itm_f01', 0.35, 'FINISHING'),
      l('itm_k01', 1, 'PACKAGING'),
      l('itm_k03', 6, 'PACKAGING'),
      l('itm_k05', 7, 'PACKAGING'),
      l('itm_k04', 0.13, 'PACKAGING'),
    ],
  },
  {
    model: 'DIN-CHR-STD',
    labourHours: 3.2,
    subconIdrPerUnit: 46_000,
    subconNote: 'Leg turning and frame assembly at Mulyo Karya.',
    lines: [
      l('itm_t02', 0.045, 'TIMBER'),
      l('itm_u01', 0.8, 'UPHOLSTERY'),
      l('itm_u03', 0.06, 'UPHOLSTERY'),
      l('itm_u04', 3, 'UPHOLSTERY'),
      l('itm_h07', 0.02, 'HARDWARE'),
      l('itm_h06', 0.012, 'HARDWARE'),
      l('itm_f03', 0.28, 'FINISHING'),
      l('itm_f04', 0.22, 'FINISHING'),
      l('itm_f02', 0.12, 'FINISHING'),
      l('itm_k02', 0.5, 'PACKAGING', 'Two chairs to a carton.'),
      l('itm_k05', 3, 'PACKAGING'),
    ],
  },
  {
    model: 'SIDE-6DR',
    labourHours: 16,
    subconIdrPerUnit: 0,
    lines: [
      l('itm_t04', 0.34, 'TIMBER'),
      l('itm_p01', 2, 'PANEL', 'Back panel and drawer bottoms.'),
      l('itm_p02', 1, 'PANEL'),
      l('itm_x03', 6, 'SUBCON', 'Drawer boxes come in assembled from Mulyo Karya.'),
      l('itm_h02', 6, 'HARDWARE'),
      l('itm_h04', 6, 'HARDWARE'),
      l('itm_h01', 2, 'HARDWARE'),
      l('itm_f03', 1.6, 'FINISHING'),
      l('itm_f04', 1.2, 'FINISHING'),
      l('itm_f01', 0.7, 'FINISHING'),
      l('itm_k01', 1, 'PACKAGING'),
      l('itm_k03', 8, 'PACKAGING'),
      l('itm_k05', 12, 'PACKAGING'),
      l('itm_k04', 0.2, 'PACKAGING'),
    ],
  },
  {
    model: 'LNG-BCL',
    labourHours: 5.5,
    subconIdrPerUnit: 88_000,
    subconNote: 'Upholstery cut and cover at CV Finishing Mandiri when our own bench is full.',
    lines: [
      l('itm_t06', 0.09, 'TIMBER'),
      l('itm_u02', 3.2, 'UPHOLSTERY'),
      l('itm_u03', 0.35, 'UPHOLSTERY'),
      l('itm_u04', 6, 'UPHOLSTERY'),
      l('itm_f05', 0.35, 'FINISHING'),
      l('itm_h06', 0.02, 'HARDWARE'),
      l('itm_k01', 1, 'PACKAGING'),
      l('itm_k05', 6, 'PACKAGING'),
    ],
  },
  {
    model: 'GRD-BNC-160',
    labourHours: 4.2,
    subconIdrPerUnit: 0,
    lines: [
      l('itm_t02', 0.11, 'TIMBER'),
      l('itm_h03', 8, 'HARDWARE'),
      l('itm_f05', 0.5, 'FINISHING', 'Exterior Danish oil — no film finish on garden stock.'),
      l('itm_k01', 1, 'PACKAGING'),
      l('itm_k03', 4, 'PACKAGING'),
      l('itm_k05', 5, 'PACKAGING'),
    ],
  },
  {
    model: 'SLB-TBL-240',
    labourHours: 22,
    subconIdrPerUnit: 0,
    lines: [
      l('itm_t08', 0.42, 'TIMBER', 'One slab per top, graded by photograph before cutting.'),
      l('itm_f05', 0.8, 'FINISHING'),
      l('itm_f06', 0.4, 'FINISHING'),
      l('itm_h05', 4, 'HARDWARE'),
      l('itm_k06', 1, 'PACKAGING', 'Individually crated — a crushed corner on a slab is a total loss.'),
      l('itm_k05', 14, 'PACKAGING'),
    ],
  },
  {
    model: 'BED-KING',
    labourHours: 14,
    subconIdrPerUnit: 0,
    lines: [
      l('itm_t01', 0.24, 'TIMBER'),
      l('itm_p01', 1, 'PANEL'),
      l('itm_x01', 1, 'SUBCON', 'Carved headboard panel from Sanggar Ukir Wijaya.'),
      l('itm_h03', 16, 'HARDWARE'),
      l('itm_f03', 1.2, 'FINISHING'),
      l('itm_f04', 0.9, 'FINISHING'),
      l('itm_f02', 0.5, 'FINISHING'),
      l('itm_k01', 2, 'PACKAGING'),
      l('itm_k03', 8, 'PACKAGING'),
      l('itm_k04', 0.25, 'PACKAGING'),
    ],
  },
  {
    model: 'CAB-TV-180',
    labourHours: 8.5,
    subconIdrPerUnit: 0,
    lines: [
      l('itm_t07', 0.12, 'TIMBER'),
      l('itm_p03', 2.5, 'PANEL', 'CARB Phase 2 MDF — the American orders depend on this being certified.'),
      l('itm_p01', 1, 'PANEL'),
      l('itm_h02', 2, 'HARDWARE'),
      l('itm_h01', 4, 'HARDWARE'),
      l('itm_h04', 4, 'HARDWARE'),
      l('itm_h08', 24, 'HARDWARE'),
      l('itm_f03', 0.8, 'FINISHING'),
      l('itm_f04', 0.6, 'FINISHING'),
      l('itm_k01', 1, 'PACKAGING'),
      l('itm_k03', 8, 'PACKAGING'),
      l('itm_k05', 10, 'PACKAGING'),
    ],
  },
  {
    model: 'CST-CONSOLE',
    labourHours: 12,
    subconIdrPerUnit: 120_000,
    subconNote: 'Brass inlay laid by hand at Sanggar Ukir Wijaya.',
    lines: [
      l('itm_t01', 0.16, 'TIMBER'),
      l('itm_h04', 2, 'HARDWARE'),
      l('itm_f03', 0.6, 'FINISHING'),
      l('itm_f04', 0.5, 'FINISHING'),
      l('itm_k06', 1, 'PACKAGING'),
      l('itm_k05', 9, 'PACKAGING'),
    ],
  },
  {
    model: 'HOT-DESK',
    labourHours: 9,
    subconIdrPerUnit: 0,
    lines: [
      l('itm_t04', 0.14, 'TIMBER'),
      l('itm_p02', 1, 'PANEL'),
      l('itm_u05', 0.25, 'UPHOLSTERY', 'Leather writing inlay.'),
      l('itm_h02', 2, 'HARDWARE'),
      l('itm_h04', 2, 'HARDWARE'),
      l('itm_f03', 0.7, 'FINISHING'),
      l('itm_f04', 0.5, 'FINISHING'),
      l('itm_f01', 0.3, 'FINISHING'),
      l('itm_k01', 1, 'PACKAGING'),
      l('itm_k05', 8, 'PACKAGING'),
    ],
  },
  {
    model: 'HOT-WRD-2D',
    labourHours: 13,
    subconIdrPerUnit: 0,
    lines: [
      l('itm_t07', 0.18, 'TIMBER'),
      l('itm_p03', 4, 'PANEL'),
      l('itm_p01', 2, 'PANEL'),
      l('itm_h01', 6, 'HARDWARE'),
      l('itm_h04', 2, 'HARDWARE'),
      l('itm_h02', 1, 'HARDWARE'),
      l('itm_h03', 20, 'HARDWARE'),
      l('itm_h08', 30, 'HARDWARE'),
      l('itm_f03', 1.2, 'FINISHING'),
      l('itm_f04', 0.9, 'FINISHING'),
      l('itm_k01', 2, 'PACKAGING'),
      l('itm_k03', 10, 'PACKAGING'),
      l('itm_k04', 0.3, 'PACKAGING'),
    ],
  },
]

export const recipeFor = (model: string) => RECIPES.find((r) => r.model === model)

/** Bench rate per hour, fully burdened. */
export const LABOUR_RATE_IDR = 28_000
/** Factory overhead absorbed against the volume actually shipped. */
export const OVERHEAD_PER_CBM_IDR = 1_850_000
/** Trucking, stuffing, terminal handling and forwarding, per cubic metre. */
export const EXPORT_LOGISTICS_PER_CBM_IDR = 620_000

/** What a model costs in material alone, at standard cost and before wastage. */
export function materialCostPerUnit(model: string): number {
  const recipe = recipeFor(model)
  if (!recipe) return 0
  return recipe.lines.reduce((total, bl) => {
    const it = itemById(bl.itemId)
    return total + (it ? it.standardCost * bl.qtyPerUnit : 0)
  }, 0)
}

/** Material demand for a quantity of one model, item by item. */
export function explodeBom(model: string, qty: number): { itemId: ID; qty: number; uom: Uom; category: CostCategory }[] {
  const recipe = recipeFor(model)
  if (!recipe) return []
  return recipe.lines.map((bl) => ({
    itemId: bl.itemId,
    qty: bl.qtyPerUnit * qty,
    uom: itemById(bl.itemId)?.uom ?? 'PCS',
    category: bl.category,
  }))
}
