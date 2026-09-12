/**
 * Receiving, the agreed price list, and what the floor actually booked.
 *
 * The book is written so that every rule on these three screens has something
 * real to fire on: a consignment of mahoni that landed at 17% moisture against a
 * 12% band, a fabric delivery whose colour lot drifted for the third time, a
 * hardware order invoiced before anything arrived, and a sanding operation
 * losing four per cent when the tolerance is three.
 */

import type {
  GoodsReceipt, GoodsReceiptLine, MaterialReturn, ProductionEntry, SupplierItem,
} from './types'
import { d } from './clock'
import { items } from './seed-master'
import { workOrders } from './seed-production'

const item = (id: string) => items.find((i) => i.id === id)!

let grlSeq = 0
const L = (
  itemId: string,
  ordered: number,
  delivered: number,
  accepted: number,
  orderUnitPrice: number,
  extra: Partial<GoodsReceiptLine> = {},
): GoodsReceiptLine => ({
  id: `grl_${++grlSeq}`,
  itemId,
  description: item(itemId).name,
  orderedQuantity: ordered,
  previouslyReceived: 0,
  deliveredQuantity: delivered,
  acceptedQuantity: accepted,
  rejectedQuantity: delivered - accepted,
  discrepancy: 'NONE',
  uom: item(itemId).uom,
  orderUnitPrice,
  ...extra,
})

/**
 * `orderUnitPrice` is always carried in base currency, whatever the order was
 * placed in. A receipt matched against a foreign-currency order at the order's
 * own unit price and then converted again is how a three-way match reports a
 * container as costing sixteen thousand times what it did.
 */

/* ==================================================================
   Goods receipts
   ================================================================== */

export const goodsReceipts: GoodsReceipt[] = [
  /* ---- at the gate right now ---- */
  {
    id: 'gr_0418', code: 'GR-2026-0418', status: 'COUNTING',
    purchaseOrderId: 'po_0185', supplierId: 'sup_jatimakmur',
    supplierDeliveryNote: 'SJ-JMS/2026/IX/1184',
    receivedAt: d(0), receivedBy: 'Yulianto', warehouseId: 'wh_qr',
    qcRequired: true,
    lines: [
      L('it_mah25', 18, 18, 0, 4_180_000, {
        discrepancy: 'WRONG_SPEC', moisturePercent: 17.2,
        discrepancyNote: 'Meter reads 17.2% against an 8–12% band. Air-dried, not kiln-dried, whatever the delivery note says — it either goes into a chamber at our cost or it goes back on the lorry.',
      }),
      L('it_sun25', 9, 9, 9, 3_240_000, { moisturePercent: 10.8 }),
    ],
    note: 'Community-forest timber from a supplier still pending its qualification audit. This is the third delivery in a row where the moisture on arrival is anybody’s guess.',
  },
  {
    id: 'gr_0419', code: 'GR-2026-0419', status: 'AWAITING_QC',
    purchaseOrderId: 'po_0194', shipmentId: 'shp_0078', supplierId: 'sup_foshanfab',
    supplierDeliveryNote: 'FYT-DN-2026-4471',
    receivedAt: d(-5), receivedBy: 'Yulianto', warehouseId: 'wh_qr',
    qcRequired: true,
    lines: [
      L('it_fabric', 2_000, 900, 900, 168_000, {
        discrepancy: 'WRONG_SPEC', supplierBatchNo: 'FYT-LOT-2609-B',
        discrepancyNote: 'Colour lot drifted again — third consecutive shipment outside the agreed Delta-E. Held in quarantine pending a decision from the upholstery desk.',
      }),
    ],
    note: 'Five days in quarantine against a three-day service level. It counts as inventory, it cannot be issued, and the sofa programme behind it has not started.',
  },
  {
    id: 'gr_0420', code: 'GR-2026-0420', status: 'AWAITING_QC',
    purchaseOrderId: 'po_0188', shipmentId: 'shp_0074', supplierId: 'sup_hettich',
    supplierDeliveryNote: 'HET-DN-2026-88104',
    receivedAt: d(-1), receivedBy: 'Yulianto', warehouseId: 'wh_qr',
    qcRequired: true,
    lines: [
      L('it_runner', 1_600, 900, 900, 214_000, { supplierBatchNo: 'HET-Q6-2608-441' }),
      L('it_lift', 200, 120, 120, 486_000, { supplierBatchNo: 'HET-AV-2608-118' }),
    ],
    note: 'The first of two consignments against PO-2026-0188 — the order the Ubud programme hangs on. Nine hundred pairs of the sixteen hundred, sitting in quarantine while the wardrobes wait. Runner batch numbers are recorded on the line, which is the corrective action that came out of CLM-2026-0038.',
  },

  /* ---- put away, and therefore actually stock ---- */
  {
    id: 'gr_0414', code: 'GR-2026-0414', status: 'PUT_AWAY',
    purchaseOrderId: 'po_0181', supplierId: 'sup_perhutani',
    supplierDeliveryNote: 'PHT-RDB/2026/0884',
    receivedAt: d(-6), receivedBy: 'Yulianto', warehouseId: 'wh_kiln',
    qcRequired: true, qcPassedAt: d(-6), putAwayAt: d(-5), invoiceId: 'bil_2251',
    lines: [
      L('it_teak32', 24, 16, 16, 28_400_000, {
        discrepancy: 'SHORT', moisturePercent: 11.4, supplierBatchNo: 'AUCTION-RDB-2609-04',
        discrepancyNote: 'Sixteen of twenty-four cubic metres. Perhutani release by auction lot and the lot was not fully drawn — the balance waits for the next auction, which is why the Prambanan dining programme is short.',
        warehouseId: 'wh_kiln', lotId: 'lot_teak_b',
      }),
    ],
    note: 'Eight cubic metres short, and that shortfall is the single line holding the Vivere dining order.',
  },
  {
    id: 'gr_0410', code: 'GR-2026-0410', status: 'PUT_AWAY',
    purchaseOrderId: 'po_0196', supplierId: 'sup_kemasan',
    supplierDeliveryNote: 'IKP-2026-7714',
    receivedAt: d(-9), receivedBy: 'Yulianto', warehouseId: 'wh_raw',
    qcRequired: false, putAwayAt: d(-9),
    lines: [
      L('it_carton', 2_400, 2_520, 2_520, 38_500, {
        discrepancy: 'OVER', warehouseId: 'wh_raw', lotId: 'lot_ctn_a',
        discrepancyNote: 'Five per cent over, which is exactly the tolerance and how corrugated always arrives — the die cuts what it cuts.',
      }),
      L('it_epe', 3_000, 3_000, 3_000, 6_400, { warehouseId: 'wh_raw', lotId: 'lot_epe_a' }),
      L('it_corner', 5_000, 5_000, 5_000, 3_900, { warehouseId: 'wh_raw', lotId: 'lot_cor_a' }),
    ],
  },
  {
    id: 'gr_0406', code: 'GR-2026-0406', status: 'PUT_AWAY',
    purchaseOrderId: 'po_0156', shipmentId: 'shp_0065', supplierId: 'sup_bison',
    supplierDeliveryNote: 'BPS-DN-2026-1184',
    receivedAt: d(-19), receivedBy: 'Yulianto', warehouseId: 'wh_raw',
    qcRequired: true, qcPassedAt: d(-18), putAwayAt: d(-18), invoiceId: 'bil_2214',
    lines: [
      L('it_mdf18', 1_200, 420, 416, 412_000, {
        previouslyReceived: 780, discrepancy: 'DAMAGED', warehouseId: 'wh_raw', lotId: 'lot_mdf18_a',
        discrepancyNote: 'Four sheets with crushed corners on the top tier, noted on the driver’s copy before signing. Charged back against the carrier, not Bison.',
      }),
      L('it_mdf9', 800, 300, 300, 268_000, { previouslyReceived: 500, warehouseId: 'wh_raw', lotId: 'lot_mdf9_a' }),
      L('it_pb16', 900, 240, 240, 196_000, { previouslyReceived: 660, warehouseId: 'wh_raw', lotId: 'lot_pb16_a' }),
    ],
    note: 'ATIGA Form D presented and accepted, so this landed at 0% duty rather than 15%. The document was worth Rp 120 juta on this consignment alone.',
  },
  {
    id: 'gr_0402', code: 'GR-2026-0402', status: 'PUT_AWAY',
    purchaseOrderId: 'po_0151', shipmentId: 'shp_0061', supplierId: 'sup_dtc',
    supplierDeliveryNote: 'DTC-PL-2026-9041',
    receivedAt: d(-27), receivedBy: 'Yulianto', warehouseId: 'wh_raw',
    qcRequired: true, qcPassedAt: d(-26), putAwayAt: d(-26), invoiceId: 'bil_2244',
    lines: [
      L('it_hinge', 6_000, 4_800, 4_776, 27_400, {
        previouslyReceived: 1_200, discrepancy: 'DAMAGED', warehouseId: 'wh_raw', lotId: 'lot_hinge_a',
        discrepancyNote: 'Twenty-four with bent cup arms. Written off rather than claimed — the freight on a claim of Rp 658.000 costs more than the hinges.',
      }),
      L('it_handle', 2_400, 1_800, 1_800, 92_000, { previouslyReceived: 600, warehouseId: 'wh_raw', lotId: 'lot_handle_a' }),
      L('it_castor', 1_600, 940, 940, 38_000, {
        previouslyReceived: 640, discrepancy: 'SHORT', warehouseId: 'wh_raw', lotId: 'lot_castor_a',
        discrepancyNote: 'Twenty short against the packing list. DTC’s packing list and invoice disagree about half the time, which is exactly the open finding on their file.',
      }),
      L('it_conn', 4_000, 2_400, 2_400, 41_000, { previouslyReceived: 1_600, warehouseId: 'wh_raw', lotId: 'lot_conn_a' }),
    ],
    note: 'Counted line by line rather than sampled, because their approval is conditional on precisely this.',
  },
  {
    id: 'gr_0398', code: 'GR-2026-0398', status: 'PUT_AWAY',
    purchaseOrderId: 'po_0142', shipmentId: 'shp_0058', supplierId: 'sup_baillie',
    supplierDeliveryNote: 'BLC-2026-4418',
    receivedAt: d(-42), receivedBy: 'Yulianto', warehouseId: 'wh_kiln',
    qcRequired: true, qcPassedAt: d(-41), putAwayAt: d(-41),
    lines: [
      L('it_oak26', 36, 24, 24, 21_400_000, {
        previouslyReceived: 12, warehouseId: 'wh_kiln', lotId: 'lot_oak_a', moisturePercent: 13.8, supplierBatchNo: 'BLC-FAS-2607-A',
        discrepancy: 'WRONG_SPEC',
        discrepancyNote: 'Landed at 13.8% after thirty-four days on the water. Kiln-dried at origin to 7%, and 7% does not survive a container crossing the equator — this is why every American board goes straight into a chamber here.',
      }),
      L('it_wal26', 12, 7.6, 7.6, 48_400_000, {
        previouslyReceived: 4, warehouseId: 'wh_raw', lotId: 'lot_wal_a', moisturePercent: 10.2, supplierBatchNo: 'BLC-FAS1F-2607-C',
        discrepancy: 'SHORT',
        discrepancyNote: 'Measured 7.6 m³ against 8.0 on the invoice. Hardwood is sold by the board foot and tallied on arrival; a 5% tally difference is normal and is settled on the invoice, not argued about.',
      }),
    ],
    note: 'DIPK presented through SILK. The tally difference was settled against the invoice rather than raised as a claim, which is how the trade works.',
  },

  /* ---- refused ---- */
  {
    id: 'gr_0412', code: 'GR-2026-0412', status: 'REJECTED',
    purchaseOrderId: 'po_0199', supplierId: 'sup_kacapratama',
    supplierDeliveryNote: 'KPN-2026-3318',
    receivedAt: d(-11), receivedBy: 'Yulianto', warehouseId: 'wh_qr',
    qcRequired: true,
    lines: [
      L('it_glass6', 74, 74, 0, 412_000, {
        discrepancy: 'DAMAGED',
        discrepancyNote: 'Eleven of thirty-four panes cracked in transit and the rest were cut 4 mm oversize on the long edge. Refused in full and sent back on the same lorry.',
      }),
    ],
    note: 'Refused at the gate. A standing 2% breakage allowance does not cover a third of the load, and oversize glass cannot be trimmed once it is tempered.',
  },
]

/* ==================================================================
   The agreed price list
   ================================================================== */

let siSeq = 0
const SI = (
  supplierId: string, itemId: string, agreedPrice: number,
  extra: Partial<SupplierItem> = {},
): SupplierItem => ({
  id: `si_${++siSeq}`,
  supplierId,
  itemId,
  agreedPrice,
  currency: 'IDR',
  minimumOrderQuantity: item(itemId).minOrderQuantity,
  quotedLeadDays: item(itemId).supplierLeadDays,
  preferred: true,
  ...extra,
})

export const supplierItems: SupplierItem[] = [
  /* ---- Baillie: American hardwood ---- */
  SI('sup_baillie', 'it_oak26', 21_400_000, {
    supplierPartNo: 'WO-4/4-FAS', priceValidUntil: d(48), lastPurchasePrice: 21_940_000, lastPurchasedAt: d(-42),
    note: 'Quoted per m³ converted from board feet at the day’s rate. The 2.5% drift since the last purchase is the dollar, not the timber.',
  }),
  SI('sup_baillie', 'it_wal26', 48_400_000, {
    supplierPartNo: 'BW-4/4-FAS1F', priceValidUntil: d(48), lastPurchasePrice: 52_180_000, lastPurchasedAt: d(-42),
    note: 'Walnut has moved 7.8% since this price was agreed and the list lapses in seven weeks. Anything quoted on the old figure loses the difference.',
  }),

  /* ---- Perhutani: teak, by auction ---- */
  SI('sup_perhutani', 'it_teak32', 28_400_000, {
    supplierPartNo: 'JATI-A-32', priceValidUntil: d(-4), lastPurchasePrice: 28_400_000, lastPurchasedAt: d(-6),
    note: 'The price list lapsed four days ago. Perhutani reprice by auction round, so the next lot is whatever the auction says — the standard cost behind every teak quotation is now a guess.',
  }),

  /* ---- Bison: panel under ATIGA ---- */
  SI('sup_bison', 'it_mdf18', 412_000, { supplierPartNo: 'MDF-E1-18-1224', priceValidUntil: d(96), lastPurchasePrice: 412_000, lastPurchasedAt: d(-19) }),
  SI('sup_bison', 'it_mdf9', 268_000, { supplierPartNo: 'MDF-E1-09-1224', priceValidUntil: d(96), lastPurchasePrice: 268_000, lastPurchasedAt: d(-19) }),
  SI('sup_bison', 'it_pb16', 196_000, { supplierPartNo: 'PB-16-1224', priceValidUntil: d(96), lastPurchasePrice: 196_000, lastPurchasedAt: d(-19) }),
  SI('sup_bison', 'it_foam32', 284_000, { supplierPartNo: 'PU-D32-100', priceValidUntil: d(96) }),

  /* ---- Hettich against DTC: the same function at two prices ---- */
  SI('sup_hettich', 'it_runner', 214_000, {
    supplierPartNo: '9257518', priceValidUntil: d(128), lastPurchasePrice: 214_000, lastPurchasedAt: d(-1),
    note: 'Quadro V6. Never short-ships and never mis-declares, and the price says so.',
  }),
  SI('sup_hettich', 'it_lift', 486_000, { supplierPartNo: '372618', priceValidUntil: d(128), lastPurchasePrice: 486_000, lastPurchasedAt: d(-1) }),
  SI('sup_dtc', 'it_runner', 149_000, {
    supplierPartNo: 'DTC-SC450', priceValidUntil: d(74), preferred: false,
    note: 'Thirty per cent under Hettich for the same stated function. It is also the runner batch that failed salt spray inside four months on the Ubud villas, and that claim cost more than the saving.',
  }),
  SI('sup_dtc', 'it_hinge', 27_400, { supplierPartNo: 'DTC-C80-110', priceValidUntil: d(74), lastPurchasePrice: 27_400, lastPurchasedAt: d(-27) }),
  SI('sup_dtc', 'it_handle', 92_000, { supplierPartNo: 'DTC-BH160-AB', priceValidUntil: d(74), lastPurchasePrice: 94_800, lastPurchasedAt: d(-27) }),
  SI('sup_dtc', 'it_castor', 38_000, { supplierPartNo: 'DTC-TW50-BR', priceValidUntil: d(74), lastPurchasePrice: 38_000, lastPurchasedAt: d(-27) }),
  SI('sup_dtc', 'it_conn', 41_000, { supplierPartNo: 'DTC-KD-SET', priceValidUntil: d(74), lastPurchasePrice: 41_000, lastPurchasedAt: d(-27) }),

  /* ---- Sayerlack: the chemistry ---- */
  SI('sup_sayerlack', 'it_sealer', 398_000, { supplierPartNo: 'AF-1240/00', priceValidUntil: d(62), lastPurchasePrice: 412_000, lastPurchasedAt: d(-40) }),
  SI('sup_sayerlack', 'it_topcoat', 486_000, { supplierPartNo: 'TU-159/20', priceValidUntil: d(62), lastPurchasePrice: 508_000, lastPurchasedAt: d(-40) }),
  SI('sup_sayerlack', 'it_wbtop', 512_000, { supplierPartNo: 'AQ-2440/20', priceValidUntil: d(62) }),

  /* ---- local ---- */
  SI('sup_jatimakmur', 'it_mah25', 4_180_000, {
    priceValidUntil: d(30), lastPurchasePrice: 4_180_000, lastPurchasedAt: d(0),
    note: 'Cheap and close. Every delivery so far has arrived above the moisture band, and the kiln time to fix that is not in this price.',
  }),
  SI('sup_jatimakmur', 'it_sun25', 3_240_000, { priceValidUntil: d(30), lastPurchasePrice: 3_240_000, lastPurchasedAt: d(0) }),
  SI('sup_jatimakmur', 'it_aka30', 2_960_000, { priceValidUntil: d(30) }),
  SI('sup_jatimakmur', 'it_glue', 34_500, { priceValidUntil: d(120) }),
  SI('sup_jatimakmur', 'it_abrasive', 189_000, { priceValidUntil: d(120) }),
  SI('sup_kemasan', 'it_carton', 38_500, { priceValidUntil: d(150), lastPurchasePrice: 38_500, lastPurchasedAt: d(-9) }),
  SI('sup_kemasan', 'it_epe', 6_400, { priceValidUntil: d(150), lastPurchasePrice: 6_400, lastPurchasedAt: d(-9) }),
  SI('sup_kemasan', 'it_corner', 3_900, { priceValidUntil: d(150), lastPurchasePrice: 3_900, lastPurchasedAt: d(-9) }),
  SI('sup_kacapratama', 'it_glass6', 412_000, { priceValidUntil: d(88), lastPurchasePrice: 412_000, lastPurchasedAt: d(-11) }),
  SI('sup_foshanfab', 'it_fabric', 168_000, {
    priceValidUntil: d(54), lastPurchasePrice: 168_000, lastPurchasedAt: d(-5),
    note: 'On probation. The price has held; the colour lot has not.',
  }),
]

/* ==================================================================
   What the floor booked
   ================================================================== */

let peSeq = 400

/**
 * Hours are derived from the routing rather than typed, at an efficiency factor
 * per booking. Typing them invites exactly the mistake this page exists to
 * catch: an efficiency figure in the hundreds of per cent because the actual
 * hours and the standard were never on the same basis.
 */
const P = (
  workOrderId: string, operationNo: number, at: number,
  good: number, scrap: number, rework: number,
  /** 1.0 is exactly standard; above 1 took longer than the routing says */
  efficiency: number,
  operator: string, shift: ProductionEntry['shift'],
  extra: Partial<ProductionEntry> = {},
): ProductionEntry => {
  const wo = workOrders.find((w) => w.id === workOrderId)
  const op = wo?.operations.find((o) => o.operationNo === operationNo)
  /* the centre comes off the routing too — a booking that names a different
     machine from the operation it is against is a booking nobody can trust */
  const workCentreId = op?.workCentreId ?? ''
  const produced = good + scrap + rework
  const standard = wo && op && wo.quantity > 0 ? (op.plannedHours / wo.quantity) * produced : 0
  return {
    id: `pe_${++peSeq}`,
    code: `PR-2026-${peSeq}`,
    workOrderId, operationNo, workCentreId,
    kind: 'OUTPUT',
    at: d(at), shift, operator,
    goodQuantity: good, scrapQuantity: scrap, reworkQuantity: rework,
    labourHours: Number((standard * efficiency).toFixed(1)), downtimeHours: 0,
    ...extra,
  }
}

export const productionEntries: ProductionEntry[] = [
  /* ---- WO-2026-4412, the Ubud wardrobes: the order everything else waits on ---- */
  P('wo_4412', 10, -14, 120, 0, 0, 0.96, 'Bambang Sutrisno', 'PAGI'),
  P('wo_4412', 20, -12, 118, 2, 0, 1.08, 'Hendra Wijaya', 'PAGI', {
    defectCode: 'TEAR_OUT',
    note: 'Two carcass sides torn out on the crown-cut face. The cutter was past its change interval and nobody had booked a tool change.',
  }),
  P('wo_4412', 20, -12, 0, 0, 0, 0, 'Hendra Wijaya', 'PAGI', {
    kind: 'DOWNTIME', downtimeHours: 1.5, downtimeReason: 'Tool change',
    note: 'The change that should have happened before the two sides were scrapped, not after.',
  }),
  P('wo_4412', 30, -9, 116, 0, 2, 1.02, 'Slamet Riyadi', 'PAGI', {
    defectCode: 'OUT_OF_SQUARE',
    note: 'Two carcasses out of square beyond 1 mm across the diagonals. Going back through the clamp, not scrapped.',
  }),
  P('wo_4412', 40, -6, 112, 4, 0, 1.14, 'Wagimin', 'SIANG', {
    defectCode: 'THICKNESS_AFTER_SANDING',
    note: 'Four sanded through the veneer. Four per cent at one operation against a three per cent tolerance — the belt pressure has not been reset since the sander was serviced.',
  }),
  P('wo_4412', 50, -3, 74, 0, 0, 1.05, 'Agus Purnomo', 'PAGI'),
  P('wo_4412', 50, -2, 0, 0, 0, 0, 'Agus Purnomo', 'PAGI', {
    kind: 'DOWNTIME', downtimeHours: 16, downtimeReason: 'Machine breakdown',
    note: 'Booth 2 membrane pump. This is the same sixteen hours MO-2026-0088 is carrying, seen from the floor rather than from maintenance.',
  }),

  /* ---- WO-2026-4402, the Informa nightstands ---- */
  P('wo_4402', 10, -22, 200, 0, 0, 0.94, 'Bambang Sutrisno', 'PAGI'),
  P('wo_4402', 20, -20, 200, 0, 0, 0.98, 'Hendra Wijaya', 'SIANG'),
  P('wo_4402', 30, -17, 197, 3, 0, 1.03, 'Slamet Riyadi', 'PAGI', { defectCode: 'JOINT_GAP' }),
  P('wo_4402', 40, -14, 197, 0, 0, 0.97, 'Wagimin', 'PAGI'),
  P('wo_4402', 50, -10, 190, 2, 5, 1.11, 'Agus Purnomo', 'SIANG', {
    defectCode: 'DUST_NIB',
    note: 'Five going back for a flat and re-coat, two scrapped. The booth filter was three days past its change when this ran.',
  }),
  P('wo_4402', 60, -8, 190, 0, 0, 0.99, 'Joko Mulyanto', 'PAGI'),

  /* ---- WO-2026-4405, the Informa sideboards, and the sheen claim behind them ---- */
  P('wo_4405', 10, -26, 80, 0, 0, 0.95, 'Bambang Sutrisno', 'PAGI'),
  P('wo_4405', 20, -24, 80, 0, 0, 1.01, 'Hendra Wijaya', 'PAGI'),
  P('wo_4405', 30, -21, 80, 0, 0, 1.0, 'Slamet Riyadi', 'SIANG'),
  P('wo_4405', 40, -18, 80, 0, 0, 0.98, 'Wagimin', 'PAGI'),
  P('wo_4405', 50, -15, 73, 0, 7, 1.16, 'Agus Purnomo', 'MALAM', {
    defectCode: 'SHEEN_UNEVEN',
    note: 'Seven tops flat against the signed sample. Mixed at the end of a night shift and the gloss reading was taken before the flash-off — the seven that became CLM-2026-0041.',
  }),

  /* ---- WO-2026-4408, the Nordiska desks on water-based ---- */
  P('wo_4408', 10, -19, 90, 0, 0, 0.97, 'Bambang Sutrisno', 'SIANG'),
  P('wo_4408', 20, -17, 90, 0, 0, 1.0, 'Hendra Wijaya', 'PAGI'),
  P('wo_4408', 30, -13, 87, 0, 3, 1.06, 'Slamet Riyadi', 'PAGI', { defectCode: 'GLUE_SQUEEZE_OUT' }),
  P('wo_4408', 30, -13, 0, 0, 0, 0, 'Slamet Riyadi', 'PAGI', {
    kind: 'DOWNTIME', downtimeHours: 3.5, downtimeReason: 'Waiting on a QC decision',
  }),
  P('wo_4408', 40, -11, 87, 0, 0, 0.96, 'Wagimin', 'SIANG'),

  /* ---- WO-2026-4410, the Melbourne outdoor sets, stopped behind the carver ---- */
  P('wo_4410', 10, -28, 40, 0, 0, 1.02, 'Bambang Sutrisno', 'PAGI'),
  P('wo_4410', 20, -25, 40, 0, 0, 1.04, 'Hendra Wijaya', 'PAGI'),
  P('wo_4410', 30, -4, 0, 0, 0, 0, 'Slamet Riyadi', 'PAGI', {
    kind: 'DOWNTIME', downtimeHours: 24, downtimeReason: 'Waiting on the previous operation',
    note: 'Four days standing still waiting on eleven carved sets that are still at Ukir Jaya. The hours are real whether or not anything was produced in them.',
  }),

  /* ---- WO-2026-4413, running now ---- */
  P('wo_4413', 10, -2, 120, 0, 0, 0.93, 'Bambang Sutrisno', 'PAGI'),
  P('wo_4413', 20, 0, 64, 1, 0, 1.01, 'Hendra Wijaya', 'PAGI', { defectCode: 'DIMENSION_OUT_OF_TOLERANCE' }),
]

/* ==================================================================
   Material that went back to the store
   ================================================================== */

let mrSeq = 80
const MR = (
  workOrderId: string, materialIssueId: string, itemId: string, quantity: number,
  unitCost: number, reason: MaterialReturn['reason'], at: number,
  extra: Partial<MaterialReturn> = {},
): MaterialReturn => ({
  id: `mr_${++mrSeq}`,
  code: `MRT-2026-${mrSeq}`,
  workOrderId, materialIssueId, itemId,
  description: item(itemId).name,
  quantity, uom: item(itemId).uom, unitCost, reason,
  asRemnant: false, warehouseId: 'wh_raw',
  at: d(at), returnedBy: 'Yulianto',
  ...extra,
})

export const materialReturns: MaterialReturn[] = [
  MR('wo_4402', 'mi_4402_1', 'it_mdf9', 14, 268_000, 'OVER_ISSUED', -13, {
    note: 'Fourteen sheets drawn and never opened. The picking list was built on the old BOM revision, before the back panel went from 9 mm to 6 mm.',
  }),
  MR('wo_4405', 'mi_4405_1', 'it_edge', 240, 4_800, 'SURPLUS_AT_CLOSE', -14, {
    note: 'Edge banding left on the reel at the close of the job. Full reel, so it goes back as stock rather than onto the rack.',
  }),
  MR('wo_4410', 'mi_4410_1', 'it_aka30', 0.44, 2_960_000, 'ORDER_CANCELLED', -20, {
    asRemnant: true,
    note: 'Cut stock from the outdoor order when it went on hold. Already docked, so it went on the offcut rack — and it is the akasia that has been sitting there four months since.',
  }),
  MR('wo_4408', 'mi_4408_1', 'it_wbtop', 18, 512_000, 'OVER_ISSUED', -10, {
    note: 'Eighteen litres of water-based topcoat back in the store. It was drawn for ninety desks and only sixty-two got finished before the oak ran out.',
  }),
  MR('wo_4412', 'mi_4412_1', 'it_screw', 8, 41_000, 'SURPLUS_AT_CLOSE', -5),
]
