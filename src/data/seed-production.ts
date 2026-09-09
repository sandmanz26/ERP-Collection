/**
 * The production book — the order book, what is in stock, what is in the kiln,
 * what is on the floor and what quality found.
 *
 * Work orders are generated from the real routings and bills of material rather
 * than typed out, so a standard cost on a work order always agrees with the BOM
 * it came from.
 */

import type {
  KilnBatch, Lot, MaterialIssue, QcRecord, SalesOrder, StockMovement, WorkOrder, WorkOrderOperation,
} from './types'
import { boms, routings } from './seed-engineering'
import { items, products, workCentres } from './seed-master'
import { addDays, d } from './clock'

/* ==================================================================
   Sales orders
   ================================================================== */

let solSeq = 0
const SOL = (
  productId: string, quantity: number, unitPrice: number, requestedDate: string,
  extra: Partial<SalesOrder['lines'][number]> = {},
) => ({
  id: `sol_${++solSeq}`, productId, description: products.find((p) => p.id === productId)?.name ?? productId,
  quantity, unitPrice, requestedDate, shippedQuantity: 0, ...extra,
})

export const salesOrders: SalesOrder[] = [
  {
    id: 'so_0031', code: 'SO-2026-0031', customerId: 'cus_alila', status: 'IN_PRODUCTION',
    priority: 'CRITICAL', orderDate: d(-46), currency: 'IDR', fxRate: 1,
    depositPercent: 30, depositReceived: 2_968_800_000, depositReceivedAt: d(-42),
    poReference: 'ALL-URP-FF&E-2026-118', salesPerson: 'Nadia Kusumawardhani',
    destination: 'Ubud, Bali',
    note: 'Ubud Ridge, ninety keys. The opening date does not move because we are late, and the penalty is Rp 9,5 juta a day.',
    lines: [
      SOL('pr_wardrobe', 120, 26_900_000, d(34), { confirmedDate: d(34), atpDate: d(39), atpConstraint: 'IMPORT', atpNote: 'The runners berth in nine days and clear in two. Sales committed to the customer’s date anyway.' }),
      SOL('pr_nightstand', 120, 3_980_000, d(34), { confirmedDate: d(34), atpDate: d(31), atpConstraint: 'CAPACITY' }),
      SOL('pr_desk', 60, 11_900_000, d(41), { confirmedDate: d(41), atpDate: d(38), atpConstraint: 'CAPACITY' }),
    ],
  },
  {
    id: 'so_0028', code: 'SO-2026-0028', customerId: 'cus_informa', status: 'IN_PRODUCTION',
    priority: 'HIGH', orderDate: d(-58), currency: 'IDR', fxRate: 1,
    depositPercent: 0, depositReceived: 0, poReference: 'HCI-PO-2026-77412',
    salesPerson: 'Nadia Kusumawardhani',
    lines: [
      SOL('pr_nightstand', 200, 3_820_000, d(12), { confirmedDate: d(12), atpDate: d(11), atpConstraint: 'NONE', shippedQuantity: 60 }),
      SOL('pr_sideboard', 80, 13_400_000, d(19), { confirmedDate: d(19), atpDate: d(18), atpConstraint: 'CAPACITY' }),
    ],
  },
  {
    id: 'so_0033', code: 'SO-2026-0033', customerId: 'cus_nordiska', status: 'IN_PRODUCTION',
    priority: 'HIGH', orderDate: d(-40), currency: 'EUR', fxRate: 17_920,
    depositPercent: 0, depositReceived: 0, poReference: 'NH-2026-0442',
    salesPerson: 'Bagas Prasetyo', incoterm: 'FOB', destination: 'Rotterdam',
    note: 'Water-based finish only, and their compliance desk wants the harvest country of the oak named on every line.',
    lines: [SOL('pr_desk', 90, 642, d(27), { confirmedDate: d(27), atpDate: d(24), atpConstraint: 'MATERIAL' })],
  },
  {
    id: 'so_0035', code: 'SO-2026-0035', customerId: 'cus_wovn', status: 'IN_PRODUCTION',
    priority: 'HIGH', orderDate: d(-36), currency: 'USD', fxRate: 16_480,
    depositPercent: 20, depositReceived: 94_240_000, depositReceivedAt: d(-33),
    poReference: 'WG-2026-0118', salesPerson: 'Bagas Prasetyo', incoterm: 'FOB', destination: 'Melbourne',
    lines: [SOL('pr_outdoor', 40, 1_178, d(22), { confirmedDate: d(22), atpDate: d(26), atpConstraint: 'CAPACITY', atpNote: 'The carving subcontract is the constraint, and it is already three days over.' })],
  },
  {
    id: 'so_0036', code: 'SO-2026-0036', customerId: 'cus_vivere', status: 'CONFIRMED',
    priority: 'STANDARD', orderDate: d(-20), currency: 'IDR', fxRate: 1,
    depositPercent: 0, depositReceived: 0, poReference: 'VMK-2026-3318',
    salesPerson: 'Nadia Kusumawardhani',
    lines: [
      SOL('pr_dining', 60, 21_400_000, d(44), { confirmedDate: d(44), atpDate: d(44), atpConstraint: 'MATERIAL', atpNote: 'Teak is eight cubic metres short until the Perhutani auction lot lands.' }),
      SOL('pr_chair', 240, 2_980_000, d(44), { confirmedDate: d(44), atpDate: d(41), atpConstraint: 'CAPACITY' }),
    ],
  },
  {
    id: 'so_0038', code: 'SO-2026-0038', customerId: 'cus_dekoruma', status: 'CONFIRMED',
    priority: 'STANDARD', orderDate: d(-14), currency: 'IDR', fxRate: 1,
    depositPercent: 0, depositReceived: 0, poReference: 'DKR-2026-9014',
    salesPerson: 'Bagas Prasetyo',
    lines: [
      SOL('pr_coffee', 40, 7_680_000, d(30), { confirmedDate: d(30), atpDate: d(28), atpConstraint: 'NONE' }),
      SOL('pr_nightstand', 60, 3_890_000, d(30), { confirmedDate: d(30), atpDate: d(29), atpConstraint: 'CAPACITY' }),
    ],
  },
  {
    id: 'so_0040', code: 'SO-2026-0040', customerId: 'cus_informa', status: 'CONFIRMED',
    priority: 'STANDARD', orderDate: d(-8), currency: 'IDR', fxRate: 1,
    depositPercent: 0, depositReceived: 0, poReference: 'HCI-PO-2026-78810',
    salesPerson: 'Nadia Kusumawardhani',
    lines: [SOL('pr_bed', 120, 15_600_000, d(56), { confirmedDate: d(56), atpDate: d(52), atpConstraint: 'IMPORT' })],
  },
  {
    id: 'so_0041', code: 'SO-2026-0041', customerId: 'cus_grandwhiz', status: 'PENDING_CONFIRMATION',
    priority: 'HIGH', orderDate: d(-5), currency: 'IDR', fxRate: 1,
    depositPercent: 30, depositReceived: 0, poReference: 'GWP-2026-0221',
    salesPerson: 'Nadia Kusumawardhani',
    note: 'Held. Rp 1,62 miliar outstanding past ninety days on their last two projects, and no deposit on this one.',
    lines: [SOL('pr_wardrobe', 80, 25_800_000, d(62), { atpDate: d(58), atpConstraint: 'IMPORT' })],
  },
  {
    id: 'so_0042', code: 'SO-2026-0042', customerId: 'cus_kanso', status: 'DRAFT',
    priority: 'STANDARD', orderDate: d(-2), currency: 'JPY', fxRate: 110,
    depositPercent: 0, depositReceived: 0, salesPerson: 'Bagas Prasetyo',
    destination: 'Osaka',
    note: 'Sampling. They want the walnut line under IJEPA preference, which needs a Form JIEPA on every shipment.',
    lines: [SOL('pr_sideboard', 4, 148_000, d(75))],
  },
  /* ---- history, so the on-time and margin numbers have something to stand on ---- */
  {
    id: 'so_0025', code: 'SO-2026-0025', customerId: 'cus_informa', status: 'CLOSED',
    priority: 'STANDARD', orderDate: d(-118), currency: 'IDR', fxRate: 1,
    depositPercent: 0, depositReceived: 0, poReference: 'HCI-PO-2026-74118',
    salesPerson: 'Nadia Kusumawardhani',
    lines: [SOL('pr_sideboard', 60, 13_200_000, d(-32), { confirmedDate: d(-32), atpDate: d(-34), atpConstraint: 'NONE', shippedQuantity: 60 })],
  },
  {
    id: 'so_0021', code: 'SO-2026-0021', customerId: 'cus_vivere', status: 'CLOSED',
    priority: 'STANDARD', orderDate: d(-146), currency: 'IDR', fxRate: 1,
    depositPercent: 0, depositReceived: 0, poReference: 'VMK-2026-2904',
    salesPerson: 'Nadia Kusumawardhani',
    lines: [SOL('pr_chair', 300, 2_940_000, d(-54), { confirmedDate: d(-54), atpDate: d(-56), atpConstraint: 'NONE', shippedQuantity: 300 })],
  },
  {
    id: 'so_0018', code: 'SO-2026-0018', customerId: 'cus_nordiska', status: 'CLOSED',
    priority: 'HIGH', orderDate: d(-172), currency: 'EUR', fxRate: 17_640,
    depositPercent: 0, depositReceived: 0, poReference: 'NH-2026-0311',
    salesPerson: 'Bagas Prasetyo', incoterm: 'FOB', destination: 'Rotterdam',
    note: 'Shipped nine days late — the water-based topcoat was in a red lane for eleven days. It is why the reorder point on that item was doubled.',
    lines: [SOL('pr_desk', 60, 638, d(-71), { confirmedDate: d(-71), atpDate: d(-71), atpConstraint: 'IMPORT', shippedQuantity: 60 })],
  },
]

/* ==================================================================
   Stock — lots
   ================================================================== */

const lot = (
  id: string, code: string, itemId: string, warehouseId: string, quantity: number,
  unitCost: number, extra: Partial<Lot> = {},
): Lot => ({
  id, code, itemId, warehouseId, quantity, reserved: 0, status: 'AVAILABLE',
  receivedAt: d(-20), unitCost, costIsProvisional: false, ...extra,
})

export const lots: Lot[] = [
  /* ---- timber ---- */
  lot('lot_oak_a', 'LOT-OAK-2609A', 'it_oak26', 'wh_kiln', 21.4, 22_186_000, {
    receivedAt: d(-42), supplierId: 'sup_baillie', shipmentId: 'shp_0058', originCountry: 'US',
    species: 'American white oak', kilnBatchId: 'kln_041', status: 'BLOCKED_KILN', moisturePercent: 13.4,
    note: 'Blocked. Batch KLN-2026-041 closed at 13.4%, outside the 8–12% band, and this is the lot the Larasati wardrobe’s solid edges come from.',
  }),
  lot('lot_oak_b', 'LOT-OAK-2607B', 'it_oak26', 'wh_raw', 9.8, 21_940_000, {
    receivedAt: d(-68), supplierId: 'sup_baillie', originCountry: 'US', species: 'American white oak',
    kilnBatchId: 'kln_036', moisturePercent: 10.2,
  }),
  lot('lot_wal_a', 'LOT-WAL-2609A', 'it_wal26', 'wh_raw', 7.6, 48_402_000, {
    receivedAt: d(-42), supplierId: 'sup_baillie', shipmentId: 'shp_0058', originCountry: 'US',
    species: 'American black walnut', kilnBatchId: 'kln_040', moisturePercent: 9.6,
  }),
  lot('lot_teak_a', 'LOT-JAT-2609A', 'it_teak32', 'wh_kiln', 16, 28_400_000, {
    receivedAt: d(-6), supplierId: 'sup_perhutani', originCountry: 'ID', species: 'Jati (teak)',
    kilnBatchId: 'kln_046', status: 'BLOCKED_KILN', moisturePercent: 18.7,
    note: 'In chamber 2, six days to go. Green off the auction lot at 31%; it cannot be cut at any price before the batch closes.',
  }),
  lot('lot_teak_b', 'LOT-JAT-2608B', 'it_teak32', 'wh_raw', 5.2, 28_100_000, {
    receivedAt: d(-34), supplierId: 'sup_perhutani', originCountry: 'ID', species: 'Jati (teak)',
    kilnBatchId: 'kln_037', moisturePercent: 9.8,
  }),
  lot('lot_mah_a', 'LOT-MAH-2609A', 'it_mah25', 'wh_raw', 14.6, 11_600_000, {
    receivedAt: d(-24), supplierId: 'sup_jatimakmur', originCountry: 'ID', species: 'Mahoni (mahogany)',
    kilnBatchId: 'kln_039', moisturePercent: 10.8,
  }),
  lot('lot_aka_a', 'LOT-AKA-2609A', 'it_aka30', 'wh_raw', 11.2, 8_450_000, {
    receivedAt: d(-18), supplierId: 'sup_jatimakmur', originCountry: 'ID', species: 'Akasia (acacia)',
    kilnBatchId: 'kln_038', moisturePercent: 13.6,
  }),
  lot('lot_sun_a', 'LOT-SUN-2609A', 'it_sun25', 'wh_raw', 8.4, 7_200_000, {
    receivedAt: d(-26), supplierId: 'sup_jatimakmur', originCountry: 'ID', species: 'Sungkai',
    kilnBatchId: 'kln_038', moisturePercent: 11.1,
  }),

  /* ---- panels and surfaces ---- */
  lot('lot_mdf18_a', 'LOT-MDF18-2609', 'it_mdf18', 'wh_raw', 742, 301_900, { receivedAt: d(-16), supplierId: 'sup_bison', shipmentId: 'shp_0065', originCountry: 'MY' }),
  lot('lot_mdf9_a', 'LOT-MDF09-2609', 'it_mdf9', 'wh_raw', 514, 175_600, { receivedAt: d(-16), supplierId: 'sup_bison', shipmentId: 'shp_0065', originCountry: 'MY' }),
  lot('lot_pb16_a', 'LOT-PB16-2609', 'it_pb16', 'wh_raw', 688, 186_200, { receivedAt: d(-16), supplierId: 'sup_bison', shipmentId: 'shp_0065', originCountry: 'MY' }),
  lot('lot_ply_a', 'LOT-PLY12-2608', 'it_ply12', 'wh_raw', 196, 224_000, { receivedAt: d(-30), supplierId: 'sup_jatimakmur', originCountry: 'ID' }),
  lot('lot_ven_a', 'LOT-VEN-F4471', 'it_venoak', 'wh_raw', 640, 41_500, {
    receivedAt: d(-52), supplierId: 'sup_bison', originCountry: 'MY',
    note: 'Flitch 4471. Never mixed with another flitch inside one wardrobe — two flitches in one piece is a colour-mismatch claim.',
  }),
  lot('lot_hpl_a', 'LOT-HPL-2609', 'it_hpl', 'wh_raw', 428, 216_400, { receivedAt: d(-22), supplierId: 'sup_dtc', shipmentId: 'shp_0061', originCountry: 'CN' }),
  lot('lot_edge_a', 'LOT-EDG-2609', 'it_edge', 'wh_raw', 21_400, 2_198, { receivedAt: d(-22), supplierId: 'sup_dtc', shipmentId: 'shp_0061', originCountry: 'CN' }),

  /* ---- hardware ---- */
  lot('lot_runner_a', 'LOT-RUN-2608', 'it_runner', 'wh_raw', 380, 297_140, {
    receivedAt: d(-24), supplierId: 'sup_hettich', shipmentId: 'shp_0063', originCountry: 'DE',
    note: 'Three hundred and eighty pairs against a released demand of one thousand and eighty. The rest is on a ship.',
  }),
  lot('lot_hinge_a', 'LOT-HNG-2609', 'it_hinge', 'wh_raw', 4_180, 19_240, { receivedAt: d(-22), supplierId: 'sup_dtc', shipmentId: 'shp_0061', originCountry: 'CN' }),
  lot('lot_handle_a', 'LOT-HDL-2609', 'it_handle', 'wh_raw', 1_640, 34_180, { receivedAt: d(-22), supplierId: 'sup_dtc', shipmentId: 'shp_0061', originCountry: 'CN' }),
  lot('lot_castor_a', 'LOT-CST-2609', 'it_castor', 'wh_raw', 1_204, 12_620, { receivedAt: d(-22), supplierId: 'sup_dtc', shipmentId: 'shp_0061', originCountry: 'CN' }),
  lot('lot_conn_a', 'LOT-CON-2609', 'it_conn', 'wh_raw', 2_880, 6_940, { receivedAt: d(-22), supplierId: 'sup_dtc', shipmentId: 'shp_0061', originCountry: 'CN' }),
  lot('lot_lift_a', 'LOT-LFT-2607', 'it_lift', 'wh_raw', 48, 738_000, { receivedAt: d(-64), supplierId: 'sup_hettich', originCountry: 'DE' }),

  /* ---- finishing chemistry: the line that runs dry if the red lane holds ---- */
  lot('lot_sealer_a', 'LOT-SEA-2608', 'it_sealer', 'wh_raw', 214, 171_400, {
    receivedAt: d(-56), supplierId: 'sup_sayerlack', originCountry: 'IT',
    note: 'Two hundred and fourteen litres. The booth uses about ninety a week at the current release rate.',
  }),
  lot('lot_topcoat_a', 'LOT-TOP-2608', 'it_topcoat', 'wh_raw', 186, 218_600, { receivedAt: d(-56), supplierId: 'sup_sayerlack', originCountry: 'IT' }),
  lot('lot_thinner_a', 'LOT-THN-2608', 'it_thinner', 'wh_raw', 288, 47_200, { receivedAt: d(-56), supplierId: 'sup_sayerlack', originCountry: 'IT' }),
  lot('lot_stain_a', 'LOT-STN-2608', 'it_stain', 'wh_raw', 74, 199_800, { receivedAt: d(-56), supplierId: 'sup_sayerlack', originCountry: 'IT' }),
  lot('lot_wbtop_a', 'LOT-WBT-2607', 'it_wbtop', 'wh_raw', 132, 271_400, { receivedAt: d(-88), supplierId: 'sup_sayerlack', originCountry: 'IT' }),

  /* ---- upholstery, glass, consumables, packaging ---- */
  lot('lot_foam_a', 'LOT-FOM-2609', 'it_foam32', 'wh_raw', 182, 634_800, { receivedAt: d(-16), supplierId: 'sup_bison', shipmentId: 'shp_0065', originCountry: 'MY' }),
  lot('lot_fabric_a', 'LOT-FAB-L2214', 'it_fabric', 'wh_raw', 640, 98_400, {
    receivedAt: d(-44), supplierId: 'sup_foshanfab', originCountry: 'CN',
    note: 'Dye lot 2214. Reserved whole against the Nirmala sofas — a second lot inside one sofa is a claim.',
  }),
  lot('lot_web_a', 'LOT-WEB-2608', 'it_webbing', 'wh_raw', 2_140, 8_900, { receivedAt: d(-38), supplierId: 'sup_jatimakmur' }),
  lot('lot_glass_a', 'LOT-GLS-2609', 'it_glass6', 'wh_qr', 18, 412_000, {
    receivedAt: d(-3), supplierId: 'sup_kacapratama', status: 'BLOCKED_QC',
    note: 'Two of twenty sheets arrived chipped on the long edge. Held until the incoming inspection is dispositioned.',
  }),
  lot('lot_glue_a', 'LOT-ADH-2609', 'it_glue', 'wh_raw', 486, 34_500, { receivedAt: d(-12) }),
  lot('lot_abr_a', 'LOT-ABR-2609', 'it_abrasive', 'wh_raw', 118, 189_000, { receivedAt: d(-12) }),
  lot('lot_scr_a', 'LOT-SCR-2609', 'it_screw', 'wh_raw', 264, 41_000, { receivedAt: d(-12) }),
  lot('lot_ctn_a', 'LOT-CTN-2609', 'it_carton', 'wh_raw', 1_240, 38_500, { receivedAt: d(-9) }),
  lot('lot_epe_a', 'LOT-EPE-2609', 'it_epe', 'wh_raw', 3_180, 6_400, { receivedAt: d(-9) }),
  lot('lot_cor_a', 'LOT-COR-2609', 'it_corner', 'wh_raw', 4_620, 3_900, { receivedAt: d(-9) }),
]

/* ==================================================================
   Kiln batches
   ================================================================== */

const readings = (startMc: number, endMc: number, days: number, from: number, taker: string) => {
  const out = []
  const steps = Math.min(days, 7)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    out.push({
      id: `kr_${taker}_${i}`,
      at: d(from + Math.round(t * days)),
      moisturePercent: Number((startMc + (endMc - startMc) * t).toFixed(1)),
      dryBulbC: Number((52 + t * 14).toFixed(1)),
      wetBulbC: Number((47 + t * 6).toFixed(1)),
      takenBy: taker,
    })
  }
  return out
}

export const kilnBatches: KilnBatch[] = [
  {
    id: 'kln_041', code: 'KLN-2026-041', chamber: 'Chamber 1', status: 'FAILED',
    species: 'American white oak', schedule: 'OAK-26', chargeVolumeM3: 38.4, thicknessMm: 26,
    startedAt: d(-24), plannedEnd: d(-10), actualEnd: d(-9),
    startMoisturePercent: 24.6, targetMin: 8, targetMax: 12, finalMoisturePercent: 13.4,
    readings: readings(24.6, 13.4, 15, -24, 'Suparman'), lotIds: ['lot_oak_a'], operator: 'Suparman',
    note: 'Closed at 13.4%, one and a half points outside the band. The chamber’s wet-bulb probe was reading two degrees low and nobody calibrated it. The whole charge is blocked and going back in.',
  },
  {
    id: 'kln_045', code: 'KLN-2026-045', chamber: 'Chamber 1', status: 'DRYING',
    species: 'American white oak', schedule: 'OAK-26', chargeVolumeM3: 38.4, thicknessMm: 26,
    startedAt: d(-6), plannedEnd: d(4), startMoisturePercent: 13.4, targetMin: 8, targetMax: 12,
    readings: readings(13.4, 10.9, 6, -6, 'Suparman'), lotIds: ['lot_oak_a'], operator: 'Suparman',
    redryOfId: 'kln_041',
    note: 'The re-dry. Ten days instead of fourteen because it starts at 13.4% rather than green, and the probe has been recalibrated.',
  },
  {
    id: 'kln_046', code: 'KLN-2026-046', chamber: 'Chamber 2', status: 'DRYING',
    species: 'Jati (teak)', schedule: 'T10-32', chargeVolumeM3: 41.2, thicknessMm: 32,
    startedAt: d(-8), plannedEnd: d(6), startMoisturePercent: 31.2, targetMin: 8, targetMax: 12,
    readings: readings(31.2, 18.7, 8, -8, 'Wagimin'), lotIds: ['lot_teak_a'], operator: 'Wagimin',
    note: 'Green off the Perhutani auction lot at 31%. Fourteen days, and the Prambanan dining tables cannot start before it closes.',
  },
  {
    id: 'kln_047', code: 'KLN-2026-047', chamber: 'Chamber 3', status: 'LOADING',
    species: 'Akasia (acacia)', schedule: 'AKA-30', chargeVolumeM3: 36.8, thicknessMm: 30,
    startedAt: d(0), plannedEnd: d(11), startMoisturePercent: 28.4, targetMin: 12, targetMax: 15,
    readings: [], lotIds: [], operator: 'Suparman',
    note: 'Outdoor band, 12–15%. Dried to the indoor band it swells in a Melbourne winter and the joints split.',
  },
  {
    id: 'kln_039', code: 'KLN-2026-039', chamber: 'Chamber 4', status: 'COMPLETED',
    species: 'Mahoni (mahogany)', schedule: 'M8-25', chargeVolumeM3: 32.6, thicknessMm: 25,
    startedAt: d(-38), plannedEnd: d(-28), actualEnd: d(-28),
    startMoisturePercent: 26.1, targetMin: 8, targetMax: 12, finalMoisturePercent: 10.8,
    readings: readings(26.1, 10.8, 10, -38, 'Wagimin'), lotIds: ['lot_mah_a'], operator: 'Wagimin',
  },
  {
    id: 'kln_038', code: 'KLN-2026-038', chamber: 'Chamber 3', status: 'COMPLETED',
    species: 'Akasia (acacia)', schedule: 'AKA-30', chargeVolumeM3: 34.2, thicknessMm: 30,
    startedAt: d(-30), plannedEnd: d(-19), actualEnd: d(-19),
    startMoisturePercent: 27.8, targetMin: 12, targetMax: 15, finalMoisturePercent: 13.6,
    readings: readings(27.8, 13.6, 11, -30, 'Suparman'), lotIds: ['lot_aka_a', 'lot_sun_a'], operator: 'Suparman',
  },
  {
    id: 'kln_040', code: 'KLN-2026-040', chamber: 'Chamber 2', status: 'COMPLETED',
    species: 'American black walnut', schedule: 'WAL-26', chargeVolumeM3: 12.4, thicknessMm: 26,
    startedAt: d(-40), plannedEnd: d(-27), actualEnd: d(-26),
    startMoisturePercent: 15.2, targetMin: 8, targetMax: 12, finalMoisturePercent: 9.6,
    readings: readings(15.2, 9.6, 14, -40, 'Suparman'), lotIds: ['lot_wal_a'], operator: 'Suparman',
    note: 'Arrived from Baillie at 7%, which is too dry for here. Conditioned up rather than dried down.',
  },
  {
    id: 'kln_037', code: 'KLN-2026-037', chamber: 'Chamber 1', status: 'COMPLETED',
    species: 'Jati (teak)', schedule: 'T10-32', chargeVolumeM3: 28.9, thicknessMm: 32,
    startedAt: d(-52), plannedEnd: d(-34), actualEnd: d(-34),
    startMoisturePercent: 29.4, targetMin: 8, targetMax: 12, finalMoisturePercent: 9.8,
    readings: readings(29.4, 9.8, 18, -52, 'Wagimin'), lotIds: ['lot_teak_b'], operator: 'Wagimin',
  },
  {
    id: 'kln_036', code: 'KLN-2026-036', chamber: 'Chamber 4', status: 'COMPLETED',
    species: 'American white oak', schedule: 'OAK-26', chargeVolumeM3: 22.4, thicknessMm: 26,
    startedAt: d(-82), plannedEnd: d(-68), actualEnd: d(-68),
    startMoisturePercent: 16.8, targetMin: 8, targetMax: 12, finalMoisturePercent: 10.2,
    readings: readings(16.8, 10.2, 14, -82, 'Suparman'), lotIds: ['lot_oak_b'], operator: 'Suparman',
  },
]

/* ==================================================================
   Work orders — generated from the real routings and BOMs
   ================================================================== */

interface WoSpec {
  id: string
  code: string
  productId: string
  quantity: number
  status: WorkOrder['status']
  start: number
  due: number
  salesOrderId?: string
  salesOrderLineId?: string
  priority?: WorkOrder['priority']
  /** how many operations are finished; the next one is running */
  opsDone: number
  quantityDone?: number
  quantityScrapped?: number
  blockAt?: { operationNo: number; reason: string }
  shortages?: { itemId: string; note: string }[]
  reworkOfId?: string
  note?: string
  actualCostFactor?: number
}

const bomFor = (productId: string) => boms.find((b) => b.productId === productId)
const routingFor = (productId: string) => routings.find((r) => r.productId === productId)
const itemById = (id: string) => items.find((i) => i.id === id)
const wcById = (id: string) => workCentres.find((w) => w.id === id)

/** Standard cost of one unit, exploded one level with yield and scrap applied. */
export function standardMaterialCost(productId: string, depth = 0): number {
  const b = bomFor(productId)
  if (!b || depth > 4) return 0
  return b.lines.reduce((sum, line) => {
    const gross = (line.netQuantity / (line.yield || 1)) * (1 + line.scrapPercent)
    if (line.componentType === 'SUB_ASSEMBLY') return sum + gross * standardMaterialCost(line.componentId, depth + 1)
    return sum + gross * (itemById(line.componentId)?.standardCost ?? 0)
  }, 0)
}

function conversionCost(productId: string, quantity: number, depth = 0): { labour: number; overhead: number; subcontract: number; hours: number } {
  const r = routingFor(productId)
  const out = { labour: 0, overhead: 0, subcontract: 0, hours: 0 }
  if (!r || depth > 4) return out
  r.operations.forEach((op) => {
    if (op.subcontracted) {
      out.subcontract += (op.subcontractCostPerUnit ?? 0) * quantity
      return
    }
    const wc = wcById(op.workCentreId)
    const hours = (op.setupMinutes + op.runMinutesPerUnit * quantity) / 60
    out.hours += hours
    out.labour += hours * (wc?.labourRatePerHour ?? 0)
    out.overhead += hours * (wc?.overheadRatePerHour ?? 0)
  })
  /* sub-assemblies made in-house carry their own conversion */
  const b = bomFor(productId)
  b?.lines.filter((l) => l.componentType === 'SUB_ASSEMBLY').forEach((l) => {
    const sub = conversionCost(l.componentId, l.netQuantity * quantity, depth + 1)
    out.labour += sub.labour
    out.overhead += sub.overhead
    out.subcontract += sub.subcontract
    out.hours += sub.hours
  })
  return out
}

function buildWorkOrder(spec: WoSpec): WorkOrder {
  const routing = routingFor(spec.productId)!
  const bom = bomFor(spec.productId)!
  const totalMinutes = routing.operations.reduce((a, op) => a + op.setupMinutes + op.runMinutesPerUnit * spec.quantity, 0)
  const totalQueue = routing.operations.reduce((a, op) => a + op.queueHours, 0)
  const spanDays = Math.max(1, Math.ceil(totalMinutes / (60 * 8) + totalQueue / 24))
  const startDate = d(spec.start)

  let cursor = 0
  const operations: WorkOrderOperation[] = routing.operations.map((op, i) => {
    const opMinutes = op.setupMinutes + op.runMinutesPerUnit * spec.quantity
    const opDays = Math.max(1, Math.ceil(opMinutes / (60 * 8) + op.queueHours / 24))
    const plannedStart = addDays(startDate, cursor)
    cursor += opDays
    const plannedEnd = addDays(startDate, cursor)
    const done = i < spec.opsDone
    const running = i === spec.opsDone && (spec.status === 'IN_PROGRESS' || spec.status === 'ON_HOLD')
    const blocked = spec.blockAt?.operationNo === op.operationNo
    return {
      id: `wop_${spec.id}_${op.operationNo}`,
      operationNo: op.operationNo,
      name: op.name,
      workCentreId: op.workCentreId,
      status: blocked ? 'BLOCKED' : done ? 'DONE' : running ? (op.queueHours > 12 ? 'CURING' : 'RUNNING') : i === spec.opsDone ? 'READY' : 'PENDING',
      plannedStart,
      plannedEnd,
      actualStart: done || running ? plannedStart : undefined,
      actualEnd: done ? plannedEnd : undefined,
      plannedHours: Number((opMinutes / 60).toFixed(2)),
      actualHours: done ? Number(((opMinutes / 60) * (spec.actualCostFactor ?? 1.04)).toFixed(2)) : undefined,
      quantityDone: done ? spec.quantity - (spec.quantityScrapped ?? 0) : running ? Math.round(spec.quantity * 0.4) : 0,
      quantityScrapped: done && i === 2 ? (spec.quantityScrapped ?? 0) : 0,
      operator: done || running ? wcById(op.workCentreId)?.supervisor : undefined,
      subcontracted: op.subcontracted,
      blockReason: blocked ? spec.blockAt?.reason : undefined,
    }
  })

  const materials: MaterialIssue[] = bom.lines.map((line, i) => {
    const gross = (line.netQuantity / (line.yield || 1)) * (1 + line.scrapPercent) * spec.quantity
    const unitCost = line.componentType === 'SUB_ASSEMBLY'
      ? standardMaterialCost(line.componentId)
      : (itemById(line.componentId)?.standardCost ?? 0)
    const shortage = spec.shortages?.find((s) => s.itemId === line.componentId)
    const issued = shortage ? 0 : spec.opsDone > 0 && line.operationNo <= (routing.operations[spec.opsDone - 1]?.operationNo ?? 0)
      ? Number((gross * (spec.actualCostFactor ?? 1.04)).toFixed(3))
      : 0
    return {
      id: `mi_${spec.id}_${i}`,
      itemId: line.componentId,
      lotId: undefined,
      operationNo: line.operationNo,
      standardQuantity: Number(gross.toFixed(3)),
      issuedQuantity: issued,
      uom: line.uom,
      unitCost,
      issuedAt: issued > 0 ? d(spec.start) : undefined,
      shortageNote: shortage?.note,
    }
  })

  const stdMaterial = standardMaterialCost(spec.productId) * spec.quantity
  const conv = conversionCost(spec.productId, spec.quantity)
  const factor = spec.actualCostFactor ?? 1.04
  const progress = spec.opsDone / routing.operations.length

  return {
    id: spec.id,
    code: spec.code,
    productId: spec.productId,
    bomId: bom.id,
    routingId: routing.id,
    status: spec.status,
    quantity: spec.quantity,
    quantityDone: spec.quantityDone ?? (spec.status === 'COMPLETED' || spec.status === 'CLOSED' ? spec.quantity - (spec.quantityScrapped ?? 0) : 0),
    quantityScrapped: spec.quantityScrapped ?? 0,
    salesOrderId: spec.salesOrderId,
    salesOrderLineId: spec.salesOrderLineId,
    reworkOfId: spec.reworkOfId,
    plannedStart: startDate,
    plannedEnd: addDays(startDate, spanDays),
    actualStart: spec.opsDone > 0 ? startDate : undefined,
    actualEnd: spec.status === 'COMPLETED' || spec.status === 'CLOSED' ? addDays(startDate, spanDays) : undefined,
    dueDate: d(spec.due),
    priority: spec.priority ?? 'STANDARD',
    operations,
    materials,
    standardMaterialCost: Math.round(stdMaterial),
    standardLabourCost: Math.round(conv.labour),
    standardOverheadCost: Math.round(conv.overhead),
    actualMaterialCost: Math.round(stdMaterial * progress * factor),
    actualLabourCost: Math.round(conv.labour * progress * factor),
    actualOverheadCost: Math.round(conv.overhead * progress),
    actualSubcontractCost: Math.round(conv.subcontract * progress),
    releasedBy: spec.status === 'PLANNED' || spec.status === 'FIRM' ? undefined : 'Yuni Hastuti',
    note: spec.note,
  }
}

const woSpecs: WoSpec[] = [
  {
    id: 'wo_4412', code: 'WO-2026-4412', productId: 'pr_wardrobe', quantity: 120, status: 'IN_PROGRESS',
    start: -4, due: 30, salesOrderId: 'so_0031', salesOrderLineId: 'sol_1', priority: 'CRITICAL',
    opsDone: 1,
    blockAt: { operationNo: 40, reason: 'Six pairs of Hettich Quadro runners per carcass, 720 needed, 380 in store. IMP-2026-0074 berths in nine days and clears in two on this supplier’s record — available in eleven, needed in six. Five days late.' },
    shortages: [
      { itemId: 'it_runner', note: 'Short 340 pairs. Covered by IMP-2026-0074 (on the water, ETA in 9 days, +2 clearance) — available in 11 days against a need in 6.' },
      { itemId: 'it_oak26', note: 'Lot LOT-OAK-2609A is blocked: kiln batch KLN-2026-041 closed at 13.4%, outside the 8–12% band. The re-dry KLN-2026-045 closes in 4 days.' },
    ],
    note: 'The Alila order. Two shortages and both of them are dates, not quantities.',
  },
  {
    id: 'wo_4413', code: 'WO-2026-4413', productId: 'pr_nightstand', quantity: 120, status: 'IN_PROGRESS',
    start: -6, due: 30, salesOrderId: 'so_0031', salesOrderLineId: 'sol_2', priority: 'CRITICAL', opsDone: 3,
  },
  {
    id: 'wo_4414', code: 'WO-2026-4414', productId: 'pr_desk', quantity: 60, status: 'RELEASED',
    start: 2, due: 37, salesOrderId: 'so_0031', salesOrderLineId: 'sol_3', priority: 'CRITICAL', opsDone: 0,
  },
  {
    id: 'wo_4402', code: 'WO-2026-4402', productId: 'pr_nightstand', quantity: 200, status: 'IN_PROGRESS',
    start: -18, due: 8, salesOrderId: 'so_0028', salesOrderLineId: 'sol_4', priority: 'HIGH',
    opsDone: 4, quantityDone: 60, quantityScrapped: 3,
    note: 'Sixty shipped against the first release. Three carcasses scrapped at sanding — the wide belt was set too aggressive and went through the veneer.',
  },
  {
    id: 'wo_4405', code: 'WO-2026-4405', productId: 'pr_sideboard', quantity: 80, status: 'IN_PROGRESS',
    start: -9, due: 15, salesOrderId: 'so_0028', salesOrderLineId: 'sol_5', priority: 'HIGH', opsDone: 2,
  },
  {
    id: 'wo_4408', code: 'WO-2026-4408', productId: 'pr_desk', quantity: 90, status: 'IN_PROGRESS',
    start: -12, due: 23, salesOrderId: 'so_0033', salesOrderLineId: 'sol_6', priority: 'HIGH',
    opsDone: 4, quantityScrapped: 0,
    note: 'Thirty-four came out of the booth with fish eye — silicone in the air line. The rework order is WO-2026-4419.',
  },
  {
    id: 'wo_4419', code: 'WO-2026-4419', productId: 'pr_desk', quantity: 34, status: 'RELEASED',
    start: 1, due: 20, salesOrderId: 'so_0033', reworkOfId: 'wo_4408', priority: 'HIGH', opsDone: 0,
    note: 'Rework. Strip, flat back and refinish thirty-four desk tops. The air line has been drained and the filters changed.',
  },
  {
    id: 'wo_4410', code: 'WO-2026-4410', productId: 'pr_outdoor', quantity: 40, status: 'ON_HOLD',
    start: -16, due: 18, salesOrderId: 'so_0035', salesOrderLineId: 'sol_7', priority: 'HIGH',
    opsDone: 3, blockAt: { operationNo: 35, reason: 'Carving out at UD Ukir Jaya since day -16, promised back three days ago. Nothing downstream can start, and this supplier hits their promised date sixty-eight per cent of the time.' },
    note: 'Held at the subcontract gate. The oil finish behind it needs forty-eight hours of cure, so every day out is a day off the sailing.',
  },
  {
    id: 'wo_4415', code: 'WO-2026-4415', productId: 'pr_dining', quantity: 60, status: 'FIRM',
    start: 7, due: 40, salesOrderId: 'so_0036', salesOrderLineId: 'sol_8', opsDone: 0,
    shortages: [{ itemId: 'it_teak32', note: 'Teak is short: 5.2 m³ available against 19.0 m³ of gross requirement. Lot LOT-JAT-2609A (16 m³) is in kiln batch KLN-2026-046, which closes in 6 days.' }],
    note: 'Cannot be released. Sixteen of the twenty-four cubic metres are in a kiln chamber and the other eight are still on a Perhutani auction floor.',
  },
  {
    id: 'wo_4416', code: 'WO-2026-4416', productId: 'pr_chair', quantity: 240, status: 'PLANNED',
    start: 12, due: 40, salesOrderId: 'so_0036', salesOrderLineId: 'sol_9', opsDone: 0,
  },
  {
    id: 'wo_4417', code: 'WO-2026-4417', productId: 'pr_coffee', quantity: 40, status: 'PLANNED',
    start: 9, due: 26, salesOrderId: 'so_0038', salesOrderLineId: 'sol_10', opsDone: 0,
  },
  {
    id: 'wo_4418', code: 'WO-2026-4418', productId: 'pr_nightstand', quantity: 60, status: 'PLANNED',
    start: 11, due: 26, salesOrderId: 'so_0038', salesOrderLineId: 'sol_11', opsDone: 0,
  },
  {
    id: 'wo_4420', code: 'WO-2026-4420', productId: 'pr_bed', quantity: 120, status: 'PLANNED',
    start: 20, due: 52, salesOrderId: 'so_0040', salesOrderLineId: 'sol_12', opsDone: 0,
  },
  {
    id: 'wo_4421', code: 'WO-2026-4421', productId: 'pr_sofa', quantity: 24, status: 'RELEASED',
    start: 3, due: 34, opsDone: 0,
    note: 'Made to stock against the Nirmala forecast. Dye lot 2214 is reserved whole.',
  },
  /* ---- closed, so costing and yield have history ---- */
  {
    id: 'wo_4391', code: 'WO-2026-4391', productId: 'pr_sideboard', quantity: 60, status: 'CLOSED',
    start: -74, due: -34, salesOrderId: 'so_0025', opsDone: 6, quantityScrapped: 1, actualCostFactor: 1.03,
  },
  {
    id: 'wo_4386', code: 'WO-2026-4386', productId: 'pr_chair', quantity: 300, status: 'CLOSED',
    start: -96, due: -56, salesOrderId: 'so_0021', opsDone: 7, quantityScrapped: 7, actualCostFactor: 1.07,
    note: 'Seven frames failed the rack test at assembly. The jig had drifted and nobody checked it for a fortnight.',
  },
  {
    id: 'wo_4372', code: 'WO-2026-4372', productId: 'pr_desk', quantity: 60, status: 'CLOSED',
    start: -122, due: -73, salesOrderId: 'so_0018', opsDone: 6, quantityScrapped: 2, actualCostFactor: 1.12,
    note: 'Shipped nine days late. The water-based topcoat sat eleven days in a red lane and the whole order waited on it.',
  },
]

export const workOrders: WorkOrder[] = woSpecs.map(buildWorkOrder)

/* ==================================================================
   Quality
   ================================================================== */

export const qcRecords: QcRecord[] = [
  {
    id: 'qc_0118', code: 'QC-2026-0118', point: 'FINAL', at: d(-3), inspector: 'Ratih Puspitasari',
    workOrderId: 'wo_4408', operationNo: 50, productId: 'pr_desk',
    lotSize: 90, sampleSize: 90, passedQuantity: 56, failedQuantity: 34,
    result: 'FAIL', disposition: 'REWORK', reworkWorkOrderId: 'wo_4419', costImpact: 41_800_000,
    defects: [
      { id: 'qd_1', code: 'FISH_EYE', quantity: 34, severity: 'MAJOR', note: 'Craters across the whole top face, consistent across two booth loads.' },
      { id: 'qd_2', code: 'DUST_NIB', quantity: 9, severity: 'MINOR' },
    ],
    rootCause: 'Silicone contamination in the compressed air line. The desiccant on the booth’s air dryer had not been changed since March and an operator had used a silicone-based release agent on an adjacent bench.',
    note: 'Thirty-four tops to strip and refinish. Two full booth days that the Alila wardrobes needed.',
  },
  {
    id: 'qc_0121', code: 'QC-2026-0121', point: 'INCOMING', at: d(-3), inspector: 'Ratih Puspitasari',
    itemId: 'it_glass6', lotSize: 20, sampleSize: 20, passedQuantity: 18, failedQuantity: 2,
    result: 'CONDITIONAL', disposition: 'PENDING', costImpact: 824_000,
    defects: [{ id: 'qd_3', code: 'DIMENSION_OUT_OF_TOLERANCE', quantity: 2, severity: 'MAJOR', note: 'Chipped along the long edge — handling at the cutter, not in transit; the crate was intact.' }],
    note: 'Within the standing 2% breakage allowance, but the allowance has now been used twice this month.',
  },
  {
    id: 'qc_0119', code: 'QC-2026-0119', point: 'INCOMING', at: d(-9), inspector: 'Ratih Puspitasari',
    itemId: 'it_oak26', lotSize: 21, sampleSize: 21, passedQuantity: 0, failedQuantity: 21,
    result: 'FAIL', disposition: 'REWORK', costImpact: 6_400_000,
    defects: [{ id: 'qd_4', code: 'MOISTURE_OUT_OF_BAND', quantity: 21, severity: 'CRITICAL', note: 'Batch mean 13.4% against a band of 8–12%. Nine readings taken across the charge; the highest was 14.1%.' }],
    rootCause: 'Chamber 1’s wet-bulb probe was reading two degrees low, so the schedule ran wetter than the controller believed. Calibration was eleven months overdue.',
    note: 'The whole charge is blocked and back in for a ten-day re-dry. This is the constraint on the Alila wardrobe’s solid edges.',
  },
  {
    id: 'qc_0114', code: 'QC-2026-0114', point: 'IN_PROCESS', at: d(-11), inspector: 'Dedi Kurniawan',
    workOrderId: 'wo_4402', operationNo: 30, productId: 'pr_nightstand',
    lotSize: 200, sampleSize: 32, passedQuantity: 29, failedQuantity: 3,
    result: 'FAIL', disposition: 'SCRAP', costImpact: 4_610_000,
    defects: [{ id: 'qd_5', code: 'THICKNESS_AFTER_SANDING', quantity: 3, severity: 'CRITICAL', note: 'Sanded through the veneer on three tops. Nothing to be done with them.' }],
    rootCause: 'Wide-belt set 0.4 mm too aggressive after a belt change, and the first-off was not measured.',
  },
  {
    id: 'qc_0116', code: 'QC-2026-0116', point: 'IN_PROCESS', at: d(-7), inspector: 'Dedi Kurniawan',
    workOrderId: 'wo_4405', operationNo: 30, productId: 'pr_sideboard',
    lotSize: 80, sampleSize: 20, passedQuantity: 20, failedQuantity: 0,
    result: 'PASS', disposition: 'ACCEPT', costImpact: 0, defects: [],
  },
  {
    id: 'qc_0112', code: 'QC-2026-0112', point: 'INCOMING', at: d(-22), inspector: 'Ratih Puspitasari',
    shipmentId: 'shp_0061', itemId: 'it_hinge', lotSize: 6000, sampleSize: 80,
    passedQuantity: 78, failedQuantity: 2, result: 'CONDITIONAL', disposition: 'ACCEPT', costImpact: 0,
    defects: [{ id: 'qd_6', code: 'HARDWARE_FUNCTION', quantity: 2, severity: 'MINOR', note: 'Two hinges failed the 20,000-cycle sample. Inside the AQL, so accepted.' }],
  },
  {
    id: 'qc_0108', code: 'QC-2026-0108', point: 'INCOMING', at: d(-44), inspector: 'Ratih Puspitasari',
    itemId: 'it_fabric', lotSize: 700, sampleSize: 700, passedQuantity: 640, failedQuantity: 60,
    result: 'FAIL', disposition: 'RETURN_TO_SUPPLIER', costImpact: 5_904_000,
    defects: [{ id: 'qd_7', code: 'COLOUR_MISMATCH', quantity: 60, severity: 'MAJOR', note: 'Sixty metres from a second dye lot mixed into the roll to make quantity. Rejected outright.' }],
    rootCause: 'The mill ran short and topped the order up from a later lot without telling anyone.',
    note: 'Why the fabric line now carries a dye-lot check on every roll before cutting.',
  },
  {
    id: 'qc_0104', code: 'QC-2026-0104', point: 'FINAL', at: d(-58), inspector: 'Ratih Puspitasari',
    workOrderId: 'wo_4391', operationNo: 50, productId: 'pr_sideboard',
    lotSize: 60, sampleSize: 60, passedQuantity: 59, failedQuantity: 1,
    result: 'CONDITIONAL', disposition: 'REWORK', costImpact: 1_240_000,
    defects: [{ id: 'qd_8', code: 'SAGGING_RUN', quantity: 1, severity: 'MINOR' }],
  },
  {
    id: 'qc_0096', code: 'QC-2026-0096', point: 'IN_PROCESS', at: d(-84), inspector: 'Dedi Kurniawan',
    workOrderId: 'wo_4386', operationNo: 40, productId: 'pr_chair',
    lotSize: 300, sampleSize: 40, passedQuantity: 33, failedQuantity: 7,
    result: 'FAIL', disposition: 'SCRAP', costImpact: 3_780_000,
    defects: [{ id: 'qd_9', code: 'OUT_OF_SQUARE', quantity: 7, severity: 'MAJOR' }],
    rootCause: 'Assembly jig had drifted 3 mm and was not checked for a fortnight. Now on a daily first-off check.',
  },
]

/* ==================================================================
   Stock movements — every quantity change in the book
   ================================================================== */

let mvSeq = 0
const MV = (
  kind: StockMovement['kind'], at: string, itemId: string, warehouseId: string,
  quantity: number, unitCost: number, reference: string, extra: Partial<StockMovement> = {},
): StockMovement => ({
  id: `mv_${++mvSeq}`, at, kind, itemId, warehouseId, quantity, unitCost, reference,
  actor: 'Slamet Widodo', ...extra,
})

const receipts: StockMovement[] = lots.map((l) =>
  MV('RECEIPT', l.receivedAt, l.itemId, l.warehouseId, l.quantity, l.unitCost,
    l.shipmentId ? `Goods receipt — ${l.code} · ${l.shipmentId}` : `Goods receipt — ${l.code}`,
    { lotId: l.id, shipmentId: l.shipmentId }),
)

const issues: StockMovement[] = workOrders
  .filter((w) => w.status === 'IN_PROGRESS' || w.status === 'ON_HOLD' || w.status === 'COMPLETED' || w.status === 'CLOSED')
  .flatMap((w) =>
    w.materials
      .filter((m) => m.issuedQuantity > 0)
      .slice(0, 6)
      .map((m) => MV('ISSUE', m.issuedAt ?? w.plannedStart, m.itemId, 'wh_wip', -m.issuedQuantity, m.unitCost,
        `Material issue — ${w.code}`, { workOrderId: w.id, actor: 'Slamet Widodo' })),
  )

const outputs: StockMovement[] = workOrders
  .filter((w) => w.quantityDone > 0)
  .map((w) => MV('PRODUCTION_OUTPUT', w.actualEnd ?? d(-1), '', 'wh_fg', w.quantityDone,
    Math.round((w.standardMaterialCost + w.standardLabourCost + w.standardOverheadCost) / w.quantity),
    `Production output — ${w.code}`, { productId: w.productId, itemId: undefined, workOrderId: w.id }))

const scraps: StockMovement[] = qcRecords
  .filter((q) => q.disposition === 'SCRAP')
  .map((q) => MV('SCRAP', q.at, q.itemId ?? '', 'wh_wip', -q.failedQuantity, q.costImpact / Math.max(1, q.failedQuantity),
    `Scrapped at ${q.point.toLowerCase().replace('_', ' ')} — ${q.code}`, { workOrderId: q.workOrderId, actor: q.inspector }))

export const stockMovements: StockMovement[] = [...receipts, ...issues, ...outputs, ...scraps]
  .sort((a, b) => (a.at < b.at ? 1 : -1))
