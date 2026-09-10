/**
 * Conversion and the rack of offcuts.
 *
 * This is the part of the book that answers "where did the cubic metre go".
 * A board is bought in cubic metres, cut into blanks counted in pieces, and what
 * falls off the end is racked in cubic metres again at a fraction of its cost.
 * Three units, one piece of timber, and a yield figure that decides whether the
 * job made money before anybody touched a machine.
 */

import type { ConversionOrder, Lot, Remnant } from './types'
import { d } from './clock'

/**
 * The standard is written as output per unit of the driving input, in whatever
 * units those two happen to be. A breakdown run gets 0.62 m³ of blank out of a
 * m³ of board; a nested cut gets 8.6 parts out of a sheet. Comparing the two as
 * bare percentages is how a nesting job ends up reporting an 868% yield.
 */

/* ==================================================================
   Conversion orders
   ================================================================== */

export const conversionOrders: ConversionOrder[] = [
  {
    id: 'cv_0311', code: 'CV-2026-0311', kind: 'BREAKDOWN', route: 'IN_HOUSE', status: 'COMPLETED',
    workCentreId: 'wc_rough', workOrderId: 'wo_4412',
    plannedStart: d(-16), dueDate: d(-14), actualStart: d(-16), completedAt: d(-14),
    standardYield: 0.62, labourHours: 46, serviceCost: 0, wasteQuantity: 1.9,
    operator: 'Bambang Sutrisno',
    inputs: [
      {
        id: 'cvi_1', itemId: 'it_wal26', description: 'American black walnut, sawn 26 mm, FAS 1F',
        plannedQuantity: 7.2, issuedQuantity: 7.6, uom: 'm3',
        lotIds: ['lot_wal_a'], remnantIds: [], unitCost: 6_368_684,
      },
    ],
    outputs: [
      {
        id: 'cvo_1', itemId: 'it_sf_walblank', description: 'Walnut component blank, ripped & docked, S4S',
        plannedQuantity: 4.46, producedQuantity: 4.32, uom: 'm3', role: 'PRIMARY', valueFactor: 1,
      },
      {
        id: 'cvo_2', itemId: 'it_oc_solid', description: 'Walnut offcut, 400–900 mm clears',
        plannedQuantity: 1.1, producedQuantity: 1.38, uom: 'm3', role: 'BY_PRODUCT', valueFactor: 0.6,
      },
    ],
    note: 'Came in at 56.8% against a 62% standard. Six boards of the FAS 1F lot carried more sapwood than the grade allows, and nobody stopped the run to say so.',
  },
  {
    id: 'cv_0318', code: 'CV-2026-0318', kind: 'BREAKDOWN', route: 'IN_HOUSE', status: 'IN_PROGRESS',
    workCentreId: 'wc_rough', workOrderId: 'wo_4413',
    plannedStart: d(-1), dueDate: d(2), actualStart: d(-1),
    standardYield: 0.62, labourHours: 18, serviceCost: 0, wasteQuantity: 0,
    operator: 'Bambang Sutrisno',
    inputs: [
      {
        id: 'cvi_2', itemId: 'it_oak26', description: 'American white oak, sawn 26 mm, FAS',
        plannedQuantity: 4.8, issuedQuantity: 4.8, uom: 'm3',
        lotIds: ['lot_oak_b'], remnantIds: ['rmn_0044'], unitCost: 2_238_776,
      },
    ],
    outputs: [
      {
        id: 'cvo_3', itemId: 'it_sf_oakblank', description: 'Oak component blank, ripped & docked, S4S',
        plannedQuantity: 2.98, producedQuantity: 0, uom: 'm3', role: 'PRIMARY', valueFactor: 1,
      },
      {
        id: 'cvo_4', itemId: 'it_oc_solid', description: 'Oak offcut, racked by length',
        plannedQuantity: 0.72, producedQuantity: 0, uom: 'm3', role: 'BY_PRODUCT', valueFactor: 0.6,
      },
    ],
    note: 'Two long offcuts off the rack went into this run alongside the boards — 0.31 m³ of oak that was already cut and already paid for.',
  },
  {
    id: 'cv_0320', code: 'CV-2026-0320', kind: 'LAMINATION', route: 'IN_HOUSE', status: 'MATERIAL_ISSUED',
    workCentreId: 'wc_cnc', workOrderId: 'wo_4405',
    plannedStart: d(0), dueDate: d(3),
    standardYield: 0.94, labourHours: 0, serviceCost: 0, wasteQuantity: 0,
    operator: 'Hendra Wijaya',
    inputs: [
      {
        id: 'cvi_3', itemId: 'it_mdf18', description: 'MDF E1, 18 mm, 1220 × 2440',
        plannedQuantity: 120, issuedQuantity: 120, uom: 'sheet',
        lotIds: ['lot_mdf18_a'], remnantIds: [], unitCost: 412_000,
      },
      {
        id: 'cvi_4', itemId: 'it_venoak', description: 'Sliced oak veneer, 0.6 mm, crown cut',
        plannedQuantity: 620, issuedQuantity: 620, uom: 'm2',
        lotIds: ['lot_ven_a'], remnantIds: [], unitCost: 148_000,
      },
    ],
    outputs: [
      {
        id: 'cvo_5', itemId: 'it_sf_venpanel', description: 'Oak-veneered MDF panel, 18 mm, both faces',
        plannedQuantity: 113, producedQuantity: 0, uom: 'sheet', role: 'PRIMARY', valueFactor: 1,
      },
      {
        id: 'cvo_6', itemId: 'it_oc_sheet', description: 'Veneer trim, one flitch',
        plannedQuantity: 42, producedQuantity: 0, uom: 'm2', role: 'BY_PRODUCT', valueFactor: 0.4,
      },
    ],
    note: 'Two inputs, one output. One flitch per press batch and the flitch number goes on the output lot — Nordiska’s compliance desk asks for it by name.',
  },
  {
    id: 'cv_0321', code: 'CV-2026-0321', kind: 'PANEL_CUT', route: 'IN_HOUSE', status: 'COMPLETED',
    workCentreId: 'wc_cnc', workOrderId: 'wo_4402',
    plannedStart: d(-9), dueDate: d(-8), actualStart: d(-9), completedAt: d(-8),
    standardYield: 8.6, labourHours: 14, serviceCost: 0, wasteQuantity: 3.4,
    operator: 'Hendra Wijaya',
    inputs: [
      {
        id: 'cvi_5', itemId: 'it_mdf9', description: 'MDF E1, 9 mm, 1220 × 2440',
        plannedQuantity: 180, issuedQuantity: 180, uom: 'sheet',
        lotIds: ['lot_mdf9_a'], remnantIds: [], unitCost: 268_000,
      },
    ],
    outputs: [
      {
        id: 'cvo_7', itemId: 'it_sf_nested', description: 'Nested panel parts, cut & edge-banded',
        plannedQuantity: 1_548, producedQuantity: 1_562, uom: 'pc', role: 'PRIMARY', valueFactor: 1,
      },
      {
        id: 'cvo_8', itemId: 'it_oc_sheet', description: 'Sheet drop over 0.5 m²',
        plannedQuantity: 58, producedQuantity: 71, uom: 'm2', role: 'BY_PRODUCT', valueFactor: 0.75,
      },
    ],
    note: 'A better nest than the standard, and 71 m² of drop big enough to rack rather than burn. This is what a good cutting list looks like.',
  },
  {
    id: 'cv_0323', code: 'CV-2026-0323', kind: 'MOULDING', route: 'SUBCONTRACT', status: 'AT_SUBCONTRACTOR',
    supplierId: 'sup_ukirjaya', subcontractOrderId: 'sc_0081', workOrderId: 'wo_4410',
    plannedStart: d(-21), dueDate: d(-3), actualStart: d(-21),
    standardYield: 0.88, labourHours: 0, serviceCost: 15_400_000, wasteQuantity: 0,
    operator: 'Purchasing desk',
    inputs: [
      {
        id: 'cvi_6', itemId: 'it_sf_teakblank', description: 'Jati apron and leg blanks, machined and sanded to P180',
        plannedQuantity: 240, issuedQuantity: 240, uom: 'pc',
        lotIds: ['lot_teak_a'], remnantIds: [], unitCost: 168_000,
      },
    ],
    outputs: [
      {
        id: 'cvo_9', itemId: 'it_sf_teakblank', description: 'Carved jati aprons and legs, Segara profile',
        plannedQuantity: 211, producedQuantity: 168, uom: 'pc', role: 'PRIMARY', valueFactor: 1,
      },
    ],
    note: 'Out at Ukir Jaya under SC-2026-0081 and three days past due. The material is ours the whole time it is on their floor, and it is not in any warehouse report.',
  },
  {
    id: 'cv_0324', code: 'CV-2026-0324', kind: 'GLUE_UP', route: 'IN_HOUSE', status: 'PLANNED',
    workCentreId: 'wc_asm',
    plannedStart: d(3), dueDate: d(6),
    standardYield: 35, labourHours: 0, serviceCost: 0, wasteQuantity: 0,
    operator: 'Slamet Riyadi',
    inputs: [
      {
        id: 'cvi_7', itemId: 'it_oc_solid', description: 'Oak and mahoni offcuts, 600–1200 mm, off the rack',
        plannedQuantity: 2.4, issuedQuantity: 0, uom: 'm3',
        lotIds: [], remnantIds: ['rmn_0038', 'rmn_0039', 'rmn_0041', 'rmn_0046'], unitCost: 1_343_265,
      },
    ],
    outputs: [
      {
        id: 'cvo_10', itemId: 'it_sf_glued', description: 'Edge-glued solid panel, 26 mm',
        plannedQuantity: 84, producedQuantity: 0, uom: 'm2', role: 'PRIMARY', valueFactor: 1,
      },
    ],
    note: 'The run that empties the rack. Four remnants that have been sitting for two to three months, edge-glued into table tops at 60% of what new boards would cost.',
  },
  {
    id: 'cv_0308', code: 'CV-2026-0308', kind: 'RESAW', route: 'IN_HOUSE', status: 'COMPLETED',
    workCentreId: 'wc_rough',
    plannedStart: d(-30), dueDate: d(-29), actualStart: d(-30), completedAt: d(-29),
    standardYield: 0.78, labourHours: 9, serviceCost: 0, wasteQuantity: 0.42,
    operator: 'Bambang Sutrisno',
    inputs: [
      {
        id: 'cvi_8', itemId: 'it_teak32', description: 'Jati Perhutani, sawn 32 mm, grade A',
        plannedQuantity: 3.1, issuedQuantity: 3.1, uom: 'm3',
        lotIds: ['lot_teak_b'], remnantIds: [], unitCost: 28_400_000,
      },
    ],
    outputs: [
      {
        id: 'cvo_11', itemId: 'it_sf_teakblank', description: 'Jati blanks resawn to 15 mm',
        plannedQuantity: 2.42, producedQuantity: 2.46, uom: 'm3', role: 'PRIMARY', valueFactor: 1,
      },
      {
        id: 'cvo_12', itemId: 'it_oc_solid', description: 'Jati offcut, short clears',
        plannedQuantity: 0.26, producedQuantity: 0.22, uom: 'm3', role: 'BY_PRODUCT', valueFactor: 0.6,
      },
    ],
    note: 'Resawing the auction lot rather than buying 15 mm saved Rp 34 juta, at the cost of a saw kerf every pass.',
  },
]

/* ==================================================================
   The rack
   ================================================================== */

let rmnSeq = 30
const R = (x: Partial<Remnant> & Pick<Remnant, 'id' | 'itemId' | 'quantity' | 'uom' | 'parentUnitCost' | 'valueFactor' | 'createdAt'>): Remnant => ({
  code: `RMN-2026-${String(++rmnSeq).padStart(4, '0')}`,
  offcutItemId: x.uom === 'm3' ? 'it_oc_solid' : 'it_oc_sheet',
  warehouseId: 'wh_raw',
  status: 'AVAILABLE',
  ...x,
})

export const remnants: Remnant[] = [
  /* ---- long clears: as good as new stock for anything under their length ---- */
  R({
    id: 'rmn_0038', itemId: 'it_oak26', sourceConversionId: 'cv_0321', sourceLotId: 'lot_oak_b',
    createdAt: d(-74), species: 'American white oak',
    lengthMm: 1_240, widthMm: 168, thicknessMm: 26,
    quantity: 0.62, uom: 'm3', parentUnitCost: 2_238_776, valueFactor: 0.85,
    status: 'RESERVED', reservedForConversionId: 'cv_0324',
    note: 'Ten clears off the wardrobe run. Long enough for drawer sides, which is why they were kept.',
  }),
  R({
    id: 'rmn_0039', itemId: 'it_mah25', sourceWorkOrderId: 'wo_4402',
    createdAt: d(-68), species: 'Mahoni',
    lengthMm: 1_050, widthMm: 142, thicknessMm: 25,
    quantity: 0.48, uom: 'm3', parentUnitCost: 4_180_000, valueFactor: 0.85,
    status: 'RESERVED', reservedForConversionId: 'cv_0324',
  }),
  R({
    id: 'rmn_0041', itemId: 'it_oak26', sourceConversionId: 'cv_0311',
    createdAt: d(-61), species: 'American white oak',
    lengthMm: 820, widthMm: 155, thicknessMm: 26,
    quantity: 0.71, uom: 'm3', parentUnitCost: 2_238_776, valueFactor: 0.6,
    status: 'RESERVED', reservedForConversionId: 'cv_0324',
  }),
  R({
    id: 'rmn_0046', itemId: 'it_mah25', sourceWorkOrderId: 'wo_4405',
    createdAt: d(-44), species: 'Mahoni',
    lengthMm: 940, widthMm: 130, thicknessMm: 25,
    quantity: 0.59, uom: 'm3', parentUnitCost: 4_180_000, valueFactor: 0.6,
    status: 'RESERVED', reservedForConversionId: 'cv_0324',
  }),

  /* ---- available, and worth looking at before a full board is opened ---- */
  R({
    id: 'rmn_0044', itemId: 'it_oak26', sourceConversionId: 'cv_0311',
    createdAt: d(-52), species: 'American white oak',
    lengthMm: 2_140, widthMm: 190, thicknessMm: 26,
    quantity: 0.31, uom: 'm3', parentUnitCost: 2_238_776, valueFactor: 0.85,
    note: 'Two full-length clears. These went into CV-2026-0321 instead of opening a new board — 0.31 m³ of oak nobody had to buy twice.',
  }),
  R({
    id: 'rmn_0049', itemId: 'it_wal26', sourceConversionId: 'cv_0311', sourceLotId: 'lot_wal_a',
    createdAt: d(-14), species: 'American black walnut',
    lengthMm: 1_680, widthMm: 176, thicknessMm: 26,
    quantity: 1.38, uom: 'm3', parentUnitCost: 6_368_684, valueFactor: 0.85,
    note: 'The 1.38 m³ that came off the poor-yield walnut run. At Rp 5,4 juta a cubic metre this rack is not a scrap pile, it is a bank account.',
  }),
  R({
    id: 'rmn_0050', itemId: 'it_mdf9', sourceConversionId: 'cv_0321',
    createdAt: d(-8),
    lengthMm: 1_180, widthMm: 610, thicknessMm: 9,
    quantity: 71, uom: 'm2', parentUnitCost: 90_000, valueFactor: 0.75,
    note: 'Drop off the nested cut, all over half a square metre. Drawer bottoms and back panels come out of this without touching a new sheet.',
  }),
  R({
    id: 'rmn_0051', itemId: 'it_teak32', sourceConversionId: 'cv_0308', sourceLotId: 'lot_teak_b',
    createdAt: d(-29), species: 'Jati',
    lengthMm: 760, widthMm: 148, thicknessMm: 15,
    quantity: 0.22, uom: 'm3', parentUnitCost: 28_400_000, valueFactor: 0.6,
    note: 'Jati at Rp 28,4 juta a cubic metre. Even at 60% this is Rp 3,7 juta on a rack, and the auction lot it came from is the one the plan is short of.',
  }),
  R({
    id: 'rmn_0052', itemId: 'it_sun25', sourceWorkOrderId: 'wo_4408',
    createdAt: d(-19), species: 'Sungkai',
    lengthMm: 640, widthMm: 120, thicknessMm: 25,
    quantity: 0.34, uom: 'm3', parentUnitCost: 3_240_000, valueFactor: 0.6,
  }),

  /* ---- ageing: nobody has looked at these, and they are heading for a write-off ---- */
  R({
    id: 'rmn_0021', itemId: 'it_aka30', sourceWorkOrderId: 'wo_4410',
    createdAt: d(-131), species: 'Akasia',
    lengthMm: 980, widthMm: 138, thicknessMm: 30,
    quantity: 0.44, uom: 'm3', parentUnitCost: 2_960_000, valueFactor: 0.6,
    note: 'Four months on the rack. Outdoor grade akasia, and the only outdoor programme running is already cut.',
  }),
  R({
    id: 'rmn_0024', itemId: 'it_ply12', sourceConversionId: 'cv_0308',
    createdAt: d(-118),
    lengthMm: 700, widthMm: 480, thicknessMm: 12,
    quantity: 26, uom: 'm2', parentUnitCost: 128_000, valueFactor: 0.35,
    note: 'Under half a square metre a piece. Worth a third of a sheet and taking up a whole rack bay.',
  }),
  R({
    id: 'rmn_0027', itemId: 'it_venoak', sourceConversionId: 'cv_0320',
    createdAt: d(-104),
    lengthMm: 900, widthMm: 240, thicknessMm: 1,
    quantity: 38, uom: 'm2', parentUnitCost: 148_000, valueFactor: 0.4,
    note: 'Veneer trim only matches while the flitch is still being worked. That flitch closed in June, so this is now decorative firewood.',
  }),

  /* ---- settled, so the recovery rate has something to stand on ---- */
  R({
    id: 'rmn_0012', itemId: 'it_oak26', sourceConversionId: 'cv_0308',
    createdAt: d(-96), consumedAt: d(-63), status: 'CONSUMED', species: 'American white oak',
    lengthMm: 1_420, widthMm: 180, thicknessMm: 26,
    quantity: 0.84, uom: 'm3', parentUnitCost: 2_238_776, valueFactor: 0.85,
  }),
  R({
    id: 'rmn_0015', itemId: 'it_mdf18', sourceConversionId: 'cv_0321',
    createdAt: d(-88), consumedAt: d(-55), status: 'CONSUMED',
    lengthMm: 1_100, widthMm: 720, thicknessMm: 18,
    quantity: 44, uom: 'm2', parentUnitCost: 412_000, valueFactor: 0.75,
  }),
  R({
    id: 'rmn_0017', itemId: 'it_mah25', sourceWorkOrderId: 'wo_4402',
    createdAt: d(-92), consumedAt: d(-41), status: 'CONSUMED', species: 'Mahoni',
    lengthMm: 1_320, widthMm: 150, thicknessMm: 25,
    quantity: 0.66, uom: 'm3', parentUnitCost: 4_180_000, valueFactor: 0.85,
  }),
  R({
    id: 'rmn_0009', itemId: 'it_pb16', sourceConversionId: 'cv_0321',
    createdAt: d(-152), writtenOffAt: d(-31), status: 'WRITTEN_OFF',
    lengthMm: 420, widthMm: 310, thicknessMm: 16,
    quantity: 18, uom: 'm2', parentUnitCost: 196_000, valueFactor: 0.35,
    note: 'Written off at five months. Particle board drop under half a square metre was never going to be picked, and racking it cost more than the board.',
  }),
]

/**
 * The semi-finished stock the completed conversions produced. These are lots like
 * any other — they can be issued, reserved and traced — but nobody bought them.
 */
export const semiFinishedLots: Lot[] = [
  {
    id: 'lot_sf_wal', code: 'LOT-SFG-WAL-2609', itemId: 'it_sf_walblank', warehouseId: 'wh_wip',
    quantity: 4.32, reserved: 4.32, status: 'AVAILABLE', receivedAt: d(-14),
    unitCost: 10_984_000, costIsProvisional: false, species: 'American black walnut',
    moisturePercent: 10.4,
    note: 'Out of CV-2026-0311. The unit cost carries the poor yield on that run — 56.8% against a 62% standard — which is exactly where it should land.',
  },
  {
    id: 'lot_sf_nested', code: 'LOT-SFG-NST-2609', itemId: 'it_sf_nested', warehouseId: 'wh_wip',
    quantity: 1_562, reserved: 900, status: 'AVAILABLE', receivedAt: d(-8),
    unitCost: 29_700, costIsProvisional: false,
    note: 'Out of CV-2026-0321, credited with 71 m² of usable drop. A good nest makes the parts cheaper as well as the rack fuller.',
  },
  {
    id: 'lot_sf_teak', code: 'LOT-SFG-JAT-2608', itemId: 'it_sf_teakblank', warehouseId: 'wh_wip',
    quantity: 2.46, reserved: 1.2, status: 'AVAILABLE', receivedAt: d(-29),
    unitCost: 36_240_000, costIsProvisional: false, species: 'Jati', moisturePercent: 9.6,
    note: 'Resawn from the 32 mm auction lot rather than bought as 15 mm.',
  },
]
