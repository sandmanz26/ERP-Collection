/**
 * Engineering — the bills of material and the routings.
 *
 * Every BOM line carries a yield, because a bill without one silently
 * under-orders every material it touches: solid timber runs 62–72% from rough
 * sawn, panel goods about 85% after cutting optimisation, veneer 88%.
 */

import type { Bom, BomLine, Routing, RoutingOperation } from './types'
import { d } from './clock'

let lineSeq = 0
const L = (
  componentId: string,
  netQuantity: number,
  uom: string,
  yieldPct: number,
  operationNo: number,
  extra: Partial<BomLine> = {},
): BomLine => ({
  id: `bl_${++lineSeq}`,
  componentType: componentId.startsWith('sa_') ? 'SUB_ASSEMBLY' : 'ITEM',
  componentId,
  netQuantity,
  uom,
  yield: yieldPct,
  scrapPercent: 0.02,
  operationNo,
  ...extra,
})

let opSeq = 0
const OP = (
  operationNo: number,
  name: string,
  workCentreId: string,
  setupMinutes: number,
  runMinutesPerUnit: number,
  extra: Partial<RoutingOperation> = {},
): RoutingOperation => ({
  id: `op_${++opSeq}`,
  operationNo,
  name,
  workCentreId,
  setupMinutes,
  runMinutesPerUnit,
  queueHours: 0,
  subcontracted: false,
  inspectionAfter: 'NONE',
  ...extra,
})

const bom = (id: string, productId: string, lines: BomLine[], note?: string): Bom => ({
  id, productId, version: 2, status: 'ACTIVE', effectiveFrom: d(-180), lines,
  approvedBy: 'Hendra Wijaya', note,
})

const routing = (id: string, productId: string, operations: RoutingOperation[]): Routing => ({
  id, productId, version: 2, status: 'ACTIVE', operations,
})

/* ==================================================================
   Sub-assemblies first — they are components of everything else
   ================================================================== */

export const boms: Bom[] = [
  bom('bom_drawer', 'sa_drawer', [
    L('it_sun25', 0.0072, 'm3', 0.66, 10, { note: 'Drawer sides and back. 66% yield after defecting and docking.' }),
    L('it_ply12', 0.34, 'sheet', 0.88, 10, { note: 'Drawer bottom, grooved in.' }),
    L('it_glue', 0.09, 'kg', 0.95, 30),
    L('it_screw', 0.04, 'kg', 0.98, 30),
  ], 'Dovetailed sungkai box. The cheapest place in the range to lose a point of yield.'),

  bom('bom_doorfront', 'sa_doorfront', [
    L('it_mdf18', 0.52, 'sheet', 0.86, 10, { note: 'Cut from a 1220 × 2440 sheet with the nesting optimiser.' }),
    L('it_venoak', 2.7, 'm2', 0.88, 20, { note: 'Both faces plus a balancing back veneer. One flitch per batch, never two.' }),
    L('it_edge', 5.4, 'm', 0.94, 20),
    L('it_glue', 0.22, 'kg', 0.95, 20),
  ], 'Veneered on both faces — a single-sided panel cups within a month in this humidity.'),

  bom('bom_seatframe', 'sa_seatframe', [
    L('it_mah25', 0.0094, 'm3', 0.64, 10),
    L('it_webbing', 6.2, 'm', 0.93, 30),
    L('it_glue', 0.11, 'kg', 0.95, 30),
    L('it_screw', 0.06, 'kg', 0.98, 30),
  ]),

  /* ---------- Case goods ---------- */
  bom('bom_wardrobe', 'pr_wardrobe', [
    L('it_mdf18', 4.8, 'sheet', 0.85, 10, { note: 'Carcass, shelves and back rails.' }),
    L('it_mdf9', 1.6, 'sheet', 0.87, 10, { note: 'Back panel.' }),
    L('it_oak26', 0.086, 'm3', 0.68, 10, { note: 'Solid edges, plinth and top rail. Blocked until its kiln batch closes in band.' }),
    L('sa_doorfront', 3, 'pc', 1, 40),
    L('sa_drawer', 6, 'pc', 1, 40),
    L('it_runner', 6, 'pair', 1, 40, { note: 'Six pairs. Thirty-five days at the supplier and thirty-one on the water.' }),
    L('it_hinge', 12, 'pc', 1, 40),
    L('it_handle', 9, 'pc', 1, 40),
    L('it_conn', 24, 'set', 1, 40),
    L('it_edge', 46, 'm', 0.94, 20),
    L('it_sealer', 1.4, 'L', 0.82, 50, { note: 'Overspray is real: 82% of what leaves the gun lands on the piece.' }),
    L('it_topcoat', 1.9, 'L', 0.8, 50),
    L('it_thinner', 1.35, 'L', 1, 50),
    L('it_stain', 0.5, 'L', 0.86, 50),
    L('it_abrasive', 0.42, 'pack', 1, 30),
    L('it_glue', 1.1, 'kg', 0.95, 40),
    L('it_carton', 4, 'pc', 1, 60),
    L('it_epe', 9.4, 'm2', 0.96, 60),
    L('it_corner', 12, 'm', 0.96, 60),
  ], 'Six drawers and three doors — the most hardware-dependent product in the catalogue, and the one that stalls first when a container is late.'),

  bom('bom_sideboard', 'pr_sideboard', [
    L('it_mdf18', 2.4, 'sheet', 0.85, 10),
    L('it_mdf9', 0.8, 'sheet', 0.87, 10),
    L('it_oak26', 0.041, 'm3', 0.68, 10),
    L('sa_doorfront', 2, 'pc', 1, 40),
    L('sa_drawer', 3, 'pc', 1, 40),
    L('it_runner', 3, 'pair', 1, 40),
    L('it_hinge', 8, 'pc', 1, 40),
    L('it_handle', 5, 'pc', 1, 40),
    L('it_conn', 14, 'set', 1, 40),
    L('it_edge', 24, 'm', 0.94, 20),
    L('it_sealer', 0.8, 'L', 0.82, 50),
    L('it_topcoat', 1.05, 'L', 0.8, 50),
    L('it_thinner', 0.74, 'L', 1, 50),
    L('it_stain', 0.28, 'L', 0.86, 50),
    L('it_abrasive', 0.24, 'pack', 1, 30),
    L('it_glue', 0.6, 'kg', 0.95, 40),
    L('it_carton', 2, 'pc', 1, 60),
    L('it_epe', 5.1, 'm2', 0.96, 60),
    L('it_corner', 7, 'm', 0.96, 60),
  ]),

  bom('bom_nightstand', 'pr_nightstand', [
    L('it_mdf18', 0.72, 'sheet', 0.85, 10),
    L('it_oak26', 0.011, 'm3', 0.68, 10),
    L('sa_drawer', 2, 'pc', 1, 40),
    L('it_runner', 2, 'pair', 1, 40, { alternateItemId: 'it_castor', note: 'No true alternate; the castor line is here only so the alternates path is exercised.' }),
    L('it_handle', 2, 'pc', 1, 40),
    L('it_conn', 6, 'set', 1, 40),
    L('it_edge', 8.4, 'm', 0.94, 20),
    L('it_sealer', 0.22, 'L', 0.82, 50),
    L('it_topcoat', 0.3, 'L', 0.8, 50),
    L('it_thinner', 0.21, 'L', 1, 50),
    L('it_abrasive', 0.08, 'pack', 1, 30),
    L('it_carton', 1, 'pc', 1, 60),
    L('it_epe', 1.8, 'm2', 0.96, 60),
  ]),

  bom('bom_bed', 'pr_bed', [
    L('it_mdf18', 1.9, 'sheet', 0.85, 10),
    L('it_oak26', 0.074, 'm3', 0.68, 10),
    L('it_ply12', 2.2, 'sheet', 0.88, 10, { note: 'Slat base.' }),
    L('it_conn', 18, 'set', 1, 40),
    L('it_edge', 14, 'm', 0.94, 20),
    L('it_sealer', 0.9, 'L', 0.82, 50),
    L('it_topcoat', 1.2, 'L', 0.8, 50),
    L('it_thinner', 0.85, 'L', 1, 50),
    L('it_stain', 0.32, 'L', 0.86, 50),
    L('it_abrasive', 0.3, 'pack', 1, 30),
    L('it_glue', 0.7, 'kg', 0.95, 40),
    L('it_carton', 3, 'pc', 1, 60),
    L('it_epe', 6.2, 'm2', 0.96, 60),
    L('it_corner', 9, 'm', 0.96, 60),
  ]),

  /* ---------- Tables ---------- */
  bom('bom_dining', 'pr_dining', [
    L('it_teak32', 0.196, 'm3', 0.62, 10, { note: 'Solid teak top, staved and glued. 62% — the lowest yield in the book, and the highest material value.' }),
    L('it_glue', 1.6, 'kg', 0.95, 10),
    L('it_conn', 8, 'set', 1, 40),
    L('it_abrasive', 0.55, 'pack', 1, 30),
    L('it_sealer', 0.6, 'L', 0.84, 50, { note: 'Oil and wax, not a film build — far less material, far more cure time.' }),
    L('it_carton', 2, 'pc', 1, 60),
    L('it_epe', 7.4, 'm2', 0.96, 60),
    L('it_corner', 10, 'm', 0.96, 60),
  ], 'Flatness after finishing is the entire quality argument, and it is decided at glue-up.'),

  bom('bom_coffee', 'pr_coffee', [
    L('it_teak32', 0.068, 'm3', 0.62, 10),
    L('it_glue', 0.6, 'kg', 0.95, 10),
    L('it_conn', 4, 'set', 1, 40),
    L('it_abrasive', 0.22, 'pack', 1, 30),
    L('it_sealer', 0.26, 'L', 0.84, 50),
    L('it_carton', 1, 'pc', 1, 60),
    L('it_epe', 3.1, 'm2', 0.96, 60),
  ]),

  bom('bom_desk', 'pr_desk', [
    L('it_oak26', 0.062, 'm3', 0.68, 10),
    L('it_mdf18', 1.1, 'sheet', 0.85, 10),
    L('it_venoak', 3.4, 'm2', 0.88, 20),
    L('sa_drawer', 2, 'pc', 1, 40),
    L('it_runner', 2, 'pair', 1, 40),
    L('it_handle', 2, 'pc', 1, 40),
    L('it_conn', 8, 'set', 1, 40),
    L('it_edge', 11, 'm', 0.94, 20),
    L('it_wbtop', 1.1, 'L', 0.8, 50, { note: 'Water-based, because Nordiska will not take a solvent finish.' }),
    L('it_abrasive', 0.26, 'pack', 1, 30),
    L('it_glue', 0.5, 'kg', 0.95, 40),
    L('it_carton', 2, 'pc', 1, 60),
    L('it_epe', 4.2, 'm2', 0.96, 60),
  ]),

  /* ---------- Seating and upholstery ---------- */
  bom('bom_chair', 'pr_chair', [
    L('it_mah25', 0.0165, 'm3', 0.64, 10),
    L('it_glue', 0.14, 'kg', 0.95, 30),
    L('it_screw', 0.05, 'kg', 0.98, 30),
    L('it_foam32', 0.06, 'sheet', 0.9, 45),
    L('it_fabric', 0.72, 'm', 0.84, 45, { note: 'Pattern matching costs the difference between 84% and 95%.' }),
    L('it_sealer', 0.18, 'L', 0.8, 50),
    L('it_topcoat', 0.24, 'L', 0.78, 50),
    L('it_thinner', 0.17, 'L', 1, 50),
    L('it_abrasive', 0.07, 'pack', 1, 30),
    L('it_carton', 1, 'pc', 1, 60),
    L('it_epe', 1.4, 'm2', 0.96, 60),
  ]),

  bom('bom_armchair', 'pr_armchair', [
    L('sa_seatframe', 1, 'pc', 1, 40),
    L('it_mah25', 0.0142, 'm3', 0.64, 10),
    L('it_foam32', 0.42, 'sheet', 0.9, 45),
    L('it_fabric', 3.6, 'm', 0.84, 45),
    L('it_castor', 4, 'pc', 1, 45),
    L('it_sealer', 0.2, 'L', 0.8, 50),
    L('it_topcoat', 0.26, 'L', 0.78, 50),
    L('it_thinner', 0.18, 'L', 1, 50),
    L('it_carton', 1, 'pc', 1, 60),
    L('it_epe', 3.4, 'm2', 0.96, 60),
  ]),

  bom('bom_sofa', 'pr_sofa', [
    L('sa_seatframe', 3, 'pc', 1, 40),
    L('it_mah25', 0.048, 'm3', 0.64, 10),
    L('it_ply12', 1.4, 'sheet', 0.88, 10),
    L('it_foam32', 2.6, 'sheet', 0.9, 45),
    L('it_fabric', 14.5, 'm', 0.82, 45, { note: 'One dye lot per sofa. Two lots in one piece is a claim, so the lot is reserved whole.' }),
    L('it_webbing', 22, 'm', 0.93, 45),
    L('it_screw', 0.3, 'kg', 0.98, 40),
    L('it_carton', 3, 'pc', 1, 60),
    L('it_epe', 11.2, 'm2', 0.96, 60),
    L('it_corner', 8, 'm', 0.96, 60),
  ]),

  /* ---------- Outdoor ---------- */
  bom('bom_outdoor', 'pr_outdoor', [
    L('it_aka30', 0.284, 'm3', 0.65, 10, { note: '12–15% moisture band. Anything drier swells in a Melbourne winter.' }),
    L('it_glue', 1.9, 'kg', 0.95, 30),
    L('it_screw', 0.85, 'kg', 0.98, 30),
    L('it_conn', 12, 'set', 1, 40),
    L('it_abrasive', 0.68, 'pack', 1, 30),
    L('it_sealer', 1.1, 'L', 0.84, 50, { note: 'Penetrating oil for outdoor; twenty-four hours between coats.' }),
    L('it_carton', 5, 'pc', 1, 60),
    L('it_epe', 12.6, 'm2', 0.96, 60),
    L('it_corner', 18, 'm', 0.96, 60),
  ]),
]

/* ==================================================================
   Routings
   ================================================================== */

export const routings: Routing[] = [
  routing('rt_drawer', 'sa_drawer', [
    OP(10, 'Rip, dock and defect', 'wc_rough', 25, 7),
    OP(20, 'Dovetail and groove', 'wc_cnc', 35, 9),
    OP(30, 'Assemble and clamp', 'wc_asm', 10, 8, { queueHours: 2, inspectionAfter: 'IN_PROCESS', instruction: 'Squareness across both diagonals within 1 mm before the clamps come off.' }),
    OP(40, 'Sand to P180', 'wc_sand', 8, 5),
  ]),

  routing('rt_doorfront', 'sa_doorfront', [
    OP(10, 'Cut panel to size (nested)', 'wc_rough', 20, 4),
    OP(20, 'Veneer press, both faces', 'wc_cnc', 45, 11, { queueHours: 4, instruction: 'One flitch per batch. Log the flitch number against the lot.' }),
    OP(30, 'Calibrate and sand to P220', 'wc_sand', 15, 7, { inspectionAfter: 'IN_PROCESS', instruction: 'Check thickness after sanding — sanding through the veneer scraps the panel.' }),
    OP(40, 'Edge band and trim', 'wc_cnc', 15, 6),
  ]),

  routing('rt_seatframe', 'sa_seatframe', [
    OP(10, 'Rip and dock', 'wc_rough', 20, 6),
    OP(20, 'Tenon and mortise', 'wc_cnc', 30, 11),
    OP(30, 'Assemble, glue and web', 'wc_asm', 12, 16, { queueHours: 3, inspectionAfter: 'IN_PROCESS' }),
  ]),

  routing('rt_wardrobe', 'pr_wardrobe', [
    OP(10, 'Panel cut and solid rip', 'wc_rough', 45, 46),
    OP(20, 'Edge band, bore and groove', 'wc_cnc', 60, 68),
    OP(30, 'Calibrate and sand', 'wc_sand', 20, 42, { inspectionAfter: 'IN_PROCESS' }),
    OP(40, 'Carcass assembly and hardware fit', 'wc_asm', 30, 96, { queueHours: 2 }),
    OP(50, 'Finish: stain, sealer, two topcoats', 'wc_fin', 40, 118, { queueHours: 18, inspectionAfter: 'FINAL', instruction: 'Six hours cure between coats. Do not stack the cure hall past two batches — the second one always picks up dust.' }),
    OP(60, 'Knock down, pack and label', 'wc_pack', 15, 38),
  ]),

  routing('rt_sideboard', 'pr_sideboard', [
    OP(10, 'Panel cut and solid rip', 'wc_rough', 35, 24),
    OP(20, 'Edge band, bore and groove', 'wc_cnc', 45, 36),
    OP(30, 'Calibrate and sand', 'wc_sand', 15, 22, { inspectionAfter: 'IN_PROCESS' }),
    OP(40, 'Assembly and hardware fit', 'wc_asm', 25, 54, { queueHours: 2 }),
    OP(50, 'Finish: stain, sealer, two topcoats', 'wc_fin', 35, 66, { queueHours: 18, inspectionAfter: 'FINAL' }),
    OP(60, 'Pack and label', 'wc_pack', 12, 22),
  ]),

  routing('rt_nightstand', 'pr_nightstand', [
    OP(10, 'Panel cut and solid rip', 'wc_rough', 20, 9),
    OP(20, 'Edge band and bore', 'wc_cnc', 25, 14),
    OP(30, 'Sand', 'wc_sand', 10, 8, { inspectionAfter: 'IN_PROCESS' }),
    OP(40, 'Assembly and hardware fit', 'wc_asm', 12, 21),
    OP(50, 'Finish: sealer and two topcoats', 'wc_fin', 25, 26, { queueHours: 14, inspectionAfter: 'FINAL' }),
    OP(60, 'Pack and label', 'wc_pack', 8, 9),
  ]),

  routing('rt_bed', 'pr_bed', [
    OP(10, 'Panel cut and solid rip', 'wc_rough', 35, 31),
    OP(20, 'Machine rails and slats', 'wc_cnc', 40, 38),
    OP(30, 'Sand', 'wc_sand', 15, 26, { inspectionAfter: 'IN_PROCESS' }),
    OP(40, 'Assembly and fitting trial', 'wc_asm', 25, 44),
    OP(50, 'Finish: stain, sealer, two topcoats', 'wc_fin', 35, 72, { queueHours: 18, inspectionAfter: 'FINAL' }),
    OP(60, 'Knock down and pack', 'wc_pack', 12, 24),
  ]),

  routing('rt_dining', 'pr_dining', [
    OP(10, 'Defect, rip and stave glue-up', 'wc_rough', 50, 74, { queueHours: 6, instruction: 'Six hours in the clamps. Releasing early is how a 2.2 m top ends up with a crown.' }),
    OP(20, 'Machine top and leg joinery', 'wc_cnc', 45, 52),
    OP(30, 'Wide-belt and hand sand to P240', 'wc_sand', 25, 64, { inspectionAfter: 'IN_PROCESS', instruction: 'Straight-edge the top in both directions. Flatness is decided here, not at finishing.' }),
    OP(40, 'Dry assembly and fitting', 'wc_asm', 20, 34),
    OP(50, 'Oil and wax, two coats', 'wc_fin', 25, 58, { queueHours: 48, inspectionAfter: 'FINAL', instruction: 'Twenty-four hours between coats. This is the longest cure in the works and it cannot be shortened.' }),
    OP(60, 'Pack knocked down', 'wc_pack', 15, 26),
  ]),

  routing('rt_coffee', 'pr_coffee', [
    OP(10, 'Defect, rip and glue-up', 'wc_rough', 30, 28, { queueHours: 6 }),
    OP(20, 'Machine top and legs', 'wc_cnc', 25, 21),
    OP(30, 'Sand to P240', 'wc_sand', 15, 24, { inspectionAfter: 'IN_PROCESS' }),
    OP(40, 'Assembly', 'wc_asm', 12, 16),
    OP(50, 'Oil and wax, two coats', 'wc_fin', 20, 24, { queueHours: 48, inspectionAfter: 'FINAL' }),
    OP(60, 'Pack', 'wc_pack', 8, 11),
  ]),

  routing('rt_desk', 'pr_desk', [
    OP(10, 'Panel and solid cut', 'wc_rough', 30, 22),
    OP(20, 'Veneer, edge and bore', 'wc_cnc', 40, 34, { queueHours: 4 }),
    OP(30, 'Sand to P220', 'wc_sand', 15, 19, { inspectionAfter: 'IN_PROCESS' }),
    OP(40, 'Assembly and drawer fit', 'wc_asm', 20, 38),
    OP(50, 'Water-based finish, three coats', 'wc_fin', 35, 64, { queueHours: 24, inspectionAfter: 'FINAL', instruction: 'Water-based cures slowly in local humidity. Do not schedule against a same-day booth slot.' }),
    OP(60, 'Pack and label', 'wc_pack', 10, 16),
  ]),

  routing('rt_chair', 'pr_chair', [
    OP(10, 'Rip, dock and defect', 'wc_rough', 20, 11),
    OP(20, 'Tenon, mortise and shape', 'wc_cnc', 35, 19),
    OP(30, 'Sand components', 'wc_sand', 10, 13),
    OP(40, 'Frame assembly and clamp', 'wc_asm', 12, 22, { queueHours: 3, inspectionAfter: 'IN_PROCESS', instruction: 'Rack test across the frame before the clamps come off.' }),
    OP(45, 'Upholster seat pad', 'wc_uph', 10, 17),
    OP(50, 'Finish: sealer and two topcoats', 'wc_fin', 25, 21, { queueHours: 12, inspectionAfter: 'FINAL' }),
    OP(60, 'Pack', 'wc_pack', 8, 7),
  ]),

  routing('rt_armchair', 'pr_armchair', [
    OP(10, 'Rip and dock', 'wc_rough', 20, 14),
    OP(20, 'Machine show wood', 'wc_cnc', 25, 18),
    OP(30, 'Sand show wood', 'wc_sand', 10, 12),
    OP(40, 'Frame assembly', 'wc_asm', 15, 26, { queueHours: 3 }),
    OP(45, 'Foam, wadding and cover', 'wc_uph', 15, 74, { inspectionAfter: 'IN_PROCESS' }),
    OP(50, 'Finish show wood', 'wc_fin', 20, 18, { queueHours: 12, inspectionAfter: 'FINAL' }),
    OP(60, 'Pack', 'wc_pack', 8, 12),
  ]),

  routing('rt_sofa', 'pr_sofa', [
    OP(10, 'Rip, dock and panel cut', 'wc_rough', 30, 34),
    OP(40, 'Frame build and webbing', 'wc_asm', 20, 78, { queueHours: 3, inspectionAfter: 'IN_PROCESS' }),
    OP(45, 'Foam, wadding and cover', 'wc_uph', 25, 186, { inspectionAfter: 'FINAL', instruction: 'One dye lot per sofa. Check the lot number on every roll before cutting.' }),
    OP(60, 'Pack', 'wc_pack', 12, 26),
  ]),

  routing('rt_outdoor', 'pr_outdoor', [
    OP(10, 'Defect, rip and glue-up', 'wc_rough', 45, 96, { queueHours: 6 }),
    OP(20, 'Machine slats, rails and legs', 'wc_cnc', 50, 88),
    OP(30, 'Sand to P180', 'wc_sand', 20, 62, { inspectionAfter: 'IN_PROCESS' }),
    OP(35, 'Hand carving, subcontracted', 'wc_sub', 0, 0, {
      subcontracted: true, subcontractorId: 'sup_ukirjaya', subcontractCostPerUnit: 385_000, queueHours: 96,
      instruction: 'Twelve days out and back, and they hit their promised date sixty-eight per cent of the time.',
    }),
    OP(40, 'Assembly and fitting', 'wc_asm', 25, 84),
    OP(50, 'Penetrating oil, two coats', 'wc_fin', 25, 66, { queueHours: 48, inspectionAfter: 'FINAL' }),
    OP(60, 'Knock down and pack', 'wc_pack', 18, 46),
  ]),
]
