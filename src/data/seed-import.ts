/**
 * The import book — permits, purchase orders and the ten consignments that are
 * live at this moment, spread across every state of the machine so each rule in
 * the PRD has something real to fire on.
 */

import type { ImportCost, ImportDocument, ImportShipment, Permit, PurchaseOrder, ShipmentLine } from './types'
import { d } from './clock'

/* ==================================================================
   Permits
   ================================================================== */

export const permits: Permit[] = [
  {
    id: 'pmt_api', kind: 'API_P', number: 'API-P 0331/2022', authority: 'OSS',
    issuedAt: d(-1410), coversHsCodes: ['*'], fileRef: 'legal/api-p-0331.pdf',
    note: 'Company-wide. Without it every consignment pays 7.5% PPh 22 instead of 2.5%.',
  },
  {
    id: 'pmt_b2', kind: 'IP_B2', number: 'IP-B2 214/DAGLU/2026', authority: 'Ditjen Daglu — Kemendag',
    issuedAt: d(-240), expiresAt: d(41), coversHsCodes: ['3208.20.90', '3814.00.00'],
    fileRef: 'permits/ip-b2-214-2026.pdf',
    note: 'Renewal takes six weeks and has not been filed. Forty-one days left, and the next chemistry order is already blocked behind it.',
  },
  {
    id: 'pmt_dipk_69', kind: 'DIPK', number: 'DIPK/2026/09/00417', authority: 'SILK — Kementerian Kehutanan',
    issuedAt: d(-58), expiresAt: d(32), coversHsCodes: ['4411.13.00', '4411.14.00', '4410.11.00', '4408.90.00'],
    coversSpecies: ['Rubberwood', 'Mixed tropical hardwood'], shipmentId: 'shp_0072',
    fileRef: 'permits/dipk-00417.pdf',
  },
  {
    id: 'pmt_dipk_74', kind: 'DIPK', number: 'DIPK/2026/08/00392', authority: 'SILK — Kementerian Kehutanan',
    issuedAt: d(-74), expiresAt: d(19), coversHsCodes: ['4407.99.90'],
    coversSpecies: ['American white oak', 'American black walnut'], shipmentId: 'shp_0076',
    fileRef: 'permits/dipk-00392.pdf',
    note: 'Expires nineteen days from now. The vessel it covers berths in twenty-four. A declaration that has lapsed by arrival is no declaration at all.',
  },
  {
    id: 'pmt_dipk_58', kind: 'DIPK', number: 'DIPK/2026/06/00281', authority: 'SILK — Kementerian Kehutanan',
    issuedAt: d(-132), expiresAt: d(-42), coversHsCodes: ['4407.99.90'],
    coversSpecies: ['American white oak'], shipmentId: 'shp_0058', fileRef: 'permits/dipk-00281.pdf',
  },
  {
    id: 'pmt_ls_69', kind: 'LS_SURVEY', number: 'LS/SUCOFINDO/2026/11284', authority: 'PT Sucofindo',
    issuedAt: d(-12), coversHsCodes: ['3208.20.90', '3814.00.00'], shipmentId: 'shp_0069',
    fileRef: 'permits/ls-11284.pdf',
    note: 'Issued at load port, but the original has not reached the broker — which is exactly why the PIB is sitting incomplete.',
  },
  {
    id: 'pmt_sni_mdf', kind: 'SNI_CERT', number: 'SNI 01-4449-2006/LSPro-004/2025', authority: 'LSPro Kemenperin',
    issuedAt: d(-320), expiresAt: d(410), coversHsCodes: ['4411.13.00', '4411.14.00'],
    fileRef: 'permits/sni-mdf.pdf',
  },
  {
    id: 'pmt_sni_glass', kind: 'SNI_CERT', number: 'SNI 15-0047-2005/LSPro-118/2024', authority: 'LSPro BSN',
    issuedAt: d(-540), expiresAt: d(190), coversHsCodes: ['7005.29.90'], fileRef: 'permits/sni-glass.pdf',
  },
]

/* ==================================================================
   Helpers
   ================================================================== */

let lineSeq = 0
const SL = (
  itemId: string, purchaseOrderId: string, quantity: number, uom: string,
  unitPriceFob: number, grossWeightKg: number, volumeCbm: number, hsCode: string,
  dutyRateApplied: number, extra: Partial<ShipmentLine> = {},
): ShipmentLine => ({
  id: `sl_${++lineSeq}`, itemId, purchaseOrderId, quantity, uom, unitPriceFob,
  grossWeightKg, volumeCbm, hsCode, dutyRateApplied, receivedQuantity: 0, ...extra,
})

let costSeq = 0
const C = (
  code: ImportCost['code'], amount: number, currency: ImportCost['currency'], fxRate: number,
  basis: ImportCost['basis'], extra: Partial<ImportCost> = {},
): ImportCost => ({
  id: `ic_${++costSeq}`, code, label: code, amount, currency, fxRate, basis,
  creditable: code === 'PPN' || code === 'PPH22', actual: true, ...extra,
})

let docSeq = 0
const DOC = (
  shipmentId: string, type: ImportDocument['type'], reference: string,
  status: ImportDocument['status'], mandatory = true, note?: string,
): ImportDocument => ({ id: `id_${++docSeq}`, shipmentId, type, reference, status, mandatory, note })

/* ==================================================================
   Purchase orders
   ================================================================== */

let poLineSeq = 0
const POL = (itemId: string, quantity: number, unitPrice: number, uom: string, requiredDate: string, extra = {}) => ({
  id: `pol_${++poLineSeq}`, itemId, quantity, receivedQuantity: 0, unitPrice, uom, requiredDate, ...extra,
})

export const purchaseOrders: PurchaseOrder[] = [
  /* ---- closed and received ---- */
  {
    id: 'po_0142', code: 'PO-2026-0142', supplierId: 'sup_baillie', status: 'CLOSED', kind: 'OVERSEAS',
    orderDate: d(-118), currency: 'USD', fxRateAtOrder: 16_190, incoterm: 'CIF', paymentInstrument: 'LC_SIGHT',
    shipmentId: 'shp_0058', requestedBy: 'Dwi Anggraini', approvedBy: 'Rizky Pratama', approvedAt: d(-117),
    lines: [
      POL('it_oak26', 36, 1_286, 'm3', d(-48), { receivedQuantity: 36, promisedDate: d(-52) }),
      POL('it_wal26', 12, 2_810, 'm3', d(-48), { receivedQuantity: 12, promisedDate: d(-52) }),
    ],
  },
  {
    id: 'po_0151', code: 'PO-2026-0151', supplierId: 'sup_dtc', status: 'CLOSED', kind: 'OVERSEAS',
    orderDate: d(-84), currency: 'USD', fxRateAtOrder: 16_260, incoterm: 'FOB', paymentInstrument: 'TT_30',
    shipmentId: 'shp_0061', requestedBy: 'Dwi Anggraini', approvedBy: 'Rizky Pratama', approvedAt: d(-83),
    lines: [
      POL('it_hinge', 6000, 1.02, 'pc', d(-26), { receivedQuantity: 6000, promisedDate: d(-30) }),
      POL('it_handle', 2400, 1.87, 'pc', d(-26), { receivedQuantity: 2400, promisedDate: d(-30) }),
      POL('it_castor', 1600, 0.67, 'pc', d(-26), { receivedQuantity: 1600, promisedDate: d(-30) }),
      POL('it_conn', 4000, 0.37, 'set', d(-26), { receivedQuantity: 4000, promisedDate: d(-30) }),
      POL('it_hpl', 600, 11.55, 'sheet', d(-26), { receivedQuantity: 600, promisedDate: d(-30) }),
      POL('it_edge', 30000, 0.116, 'm', d(-26), { receivedQuantity: 30000, promisedDate: d(-30) }),
    ],
  },
  {
    id: 'po_0156', code: 'PO-2026-0156', supplierId: 'sup_bison', status: 'CLOSED', kind: 'OVERSEAS',
    orderDate: d(-62), currency: 'USD', fxRateAtOrder: 16_380, incoterm: 'CFR', paymentInstrument: 'LC_USANCE_90',
    shipmentId: 'shp_0065', requestedBy: 'Dwi Anggraini', approvedBy: 'Rizky Pratama', approvedAt: d(-61),
    lines: [
      POL('it_mdf18', 1200, 17.6, 'sheet', d(-16), { receivedQuantity: 1200, promisedDate: d(-20) }),
      POL('it_mdf9', 800, 10.2, 'sheet', d(-16), { receivedQuantity: 800, promisedDate: d(-20) }),
      POL('it_pb16', 900, 10.8, 'sheet', d(-16), { receivedQuantity: 900, promisedDate: d(-20) }),
      POL('it_foam32', 250, 37.2, 'sheet', d(-16), { receivedQuantity: 250, promisedDate: d(-20) }),
    ],
  },
  {
    id: 'po_0159', code: 'PO-2026-0159', supplierId: 'sup_hettich', status: 'CLOSED', kind: 'OVERSEAS',
    orderDate: d(-96), currency: 'EUR', fxRateAtOrder: 17_760, incoterm: 'FOB', paymentInstrument: 'LC_SIGHT',
    shipmentId: 'shp_0063', requestedBy: 'Dwi Anggraini', approvedBy: 'Rizky Pratama', approvedAt: d(-95),
    lines: [POL('it_runner', 900, 14.2, 'pair', d(-24), { receivedQuantity: 900, promisedDate: d(-28) })],
  },

  /* ---- live ---- */
  {
    id: 'po_0171', code: 'PO-2026-0171', supplierId: 'sup_sayerlack', status: 'RELEASED', kind: 'OVERSEAS',
    orderDate: d(-52), currency: 'EUR', fxRateAtOrder: 17_840, incoterm: 'FOB', paymentInstrument: 'TT_ADVANCE',
    shipmentId: 'shp_0069', requestedBy: 'Dwi Anggraini', approvedBy: 'Rizky Pratama', approvedAt: d(-51),
    lines: [
      POL('it_sealer', 1000, 8.9, 'L', d(-4), { promisedDate: d(-8) }),
      POL('it_topcoat', 1000, 11.4, 'L', d(-4), { promisedDate: d(-8) }),
      POL('it_thinner', 1500, 2.42, 'L', d(-4), { promisedDate: d(-8) }),
      POL('it_stain', 400, 10.4, 'L', d(-4), { promisedDate: d(-8) }),
    ],
    note: 'Sitting in a red lane with the surveyor’s original still in Italy.',
  },
  {
    id: 'po_0176', code: 'PO-2026-0176', supplierId: 'sup_bison', status: 'RELEASED', kind: 'OVERSEAS',
    orderDate: d(-34), currency: 'USD', fxRateAtOrder: 16_420, incoterm: 'CFR', paymentInstrument: 'LC_USANCE_90',
    shipmentId: 'shp_0072', requestedBy: 'Dwi Anggraini', approvedBy: 'Rizky Pratama', approvedAt: d(-33),
    lines: [
      POL('it_mdf18', 1200, 17.9, 'sheet', d(1), { promisedDate: d(-1) }),
      POL('it_venoak', 3000, 2.61, 'm2', d(1), { promisedDate: d(-1) }),
    ],
  },
  {
    id: 'po_0188', code: 'PO-2026-0188', supplierId: 'sup_hettich', status: 'RELEASED', kind: 'OVERSEAS',
    orderDate: d(-40), currency: 'EUR', fxRateAtOrder: 17_890, incoterm: 'FOB', paymentInstrument: 'LC_SIGHT',
    shipmentId: 'shp_0074', requestedBy: 'Dwi Anggraini', approvedBy: 'Rizky Pratama', approvedAt: d(-39),
    lines: [
      POL('it_runner', 1600, 14.4, 'pair', d(6), { promisedDate: d(-5), mrpDemandRef: 'SO-2026-0031 · Larasati wardrobe' }),
      POL('it_lift', 200, 39.8, 'set', d(6), { promisedDate: d(-5) }),
    ],
    note: 'The order the Alila project hangs on. Ready on time, but nine days still on the water.',
  },
  {
    id: 'po_0191', code: 'PO-2026-0191', supplierId: 'sup_baillie', status: 'RELEASED', kind: 'OVERSEAS',
    orderDate: d(-38), currency: 'USD', fxRateAtOrder: 16_450, incoterm: 'CIF', paymentInstrument: 'LC_SIGHT',
    shipmentId: 'shp_0076', requestedBy: 'Dwi Anggraini', approvedBy: 'Rizky Pratama', approvedAt: d(-37),
    lines: [
      POL('it_oak26', 42, 1_312, 'm3', d(28), { promisedDate: d(-2) }),
      POL('it_wal26', 14, 2_890, 'm3', d(28), { promisedDate: d(-2) }),
    ],
  },
  {
    id: 'po_0194', code: 'PO-2026-0194', supplierId: 'sup_foshanfab', status: 'RELEASED', kind: 'OVERSEAS',
    orderDate: d(-18), currency: 'CNY', fxRateAtOrder: 2_272, incoterm: 'FOB', paymentInstrument: 'TT_30',
    shipmentId: 'shp_0078', requestedBy: 'Dwi Anggraini', approvedBy: 'Rizky Pratama', approvedAt: d(-17),
    lines: [POL('it_fabric', 2000, 29.4, 'm', d(34), { promisedDate: d(6) })],
  },
  {
    id: 'po_0198', code: 'PO-2026-0198', supplierId: 'sup_sayerlack', status: 'PENDING_APPROVAL', kind: 'OVERSEAS',
    orderDate: d(-3), currency: 'EUR', fxRateAtOrder: 17_920, incoterm: 'FOB', paymentInstrument: 'TT_ADVANCE',
    shipmentId: 'shp_0080', requestedBy: 'Dwi Anggraini',
    lines: [
      POL('it_topcoat', 1000, 11.6, 'L', d(52)),
      POL('it_thinner', 1500, 2.48, 'L', d(52)),
      POL('it_wbtop', 600, 14.1, 'L', d(52)),
    ],
    note: 'Cannot be released: the IP-B2 that covers these HS codes expires before this consignment could arrive.',
  },

  /* ---- local ---- */
  {
    id: 'po_0181', code: 'PO-2026-0181', supplierId: 'sup_perhutani', status: 'PARTIALLY_RECEIVED', kind: 'LOCAL',
    orderDate: d(-22), currency: 'IDR', fxRateAtOrder: 1, incoterm: 'EXW', paymentInstrument: 'TT_ADVANCE',
    requestedBy: 'Dwi Anggraini', approvedBy: 'Rizky Pratama', approvedAt: d(-21),
    lines: [POL('it_teak32', 24, 28_400_000, 'm3', d(-4), { receivedQuantity: 16, promisedDate: d(-6) })],
    note: 'Sixteen of twenty-four cubic metres delivered. The rest is waiting on a Perhutani auction lot.',
  },
  {
    id: 'po_0185', code: 'PO-2026-0185', supplierId: 'sup_jatimakmur', status: 'RELEASED', kind: 'LOCAL',
    orderDate: d(-11), currency: 'IDR', fxRateAtOrder: 1, incoterm: 'DAP', paymentInstrument: 'OPEN_ACCOUNT',
    requestedBy: 'Dwi Anggraini', approvedBy: 'Rizky Pratama', approvedAt: d(-11),
    lines: [
      POL('it_aka30', 30, 8_380_000, 'm3', d(3), { promisedDate: d(2) }),
      POL('it_mah25', 18, 11_500_000, 'm3', d(3), { promisedDate: d(2) }),
    ],
  },
  {
    id: 'po_0196', code: 'PO-2026-0196', supplierId: 'sup_kemasan', status: 'RELEASED', kind: 'LOCAL',
    orderDate: d(-6), currency: 'IDR', fxRateAtOrder: 1, incoterm: 'DAP', paymentInstrument: 'OPEN_ACCOUNT',
    requestedBy: 'Joko Mulyanto', approvedBy: 'Rizky Pratama', approvedAt: d(-6),
    lines: [
      POL('it_carton', 2000, 38_200, 'pc', d(4), { promisedDate: d(3) }),
      POL('it_epe', 3000, 6_350, 'm2', d(4), { promisedDate: d(3) }),
      POL('it_corner', 5000, 3_850, 'm', d(4), { promisedDate: d(3) }),
    ],
  },
  {
    id: 'po_0199', code: 'PO-2026-0199', supplierId: 'sup_kacapratama', status: 'APPROVED', kind: 'LOCAL',
    orderDate: d(-2), currency: 'IDR', fxRateAtOrder: 1, incoterm: 'DAP', paymentInstrument: 'TT_30',
    requestedBy: 'Dwi Anggraini', approvedBy: 'Rizky Pratama', approvedAt: d(-1),
    lines: [POL('it_glass6', 50, 408_000, 'm2', d(14))],
  },
]

/* ==================================================================
   Import shipments
   ================================================================== */

const eur = 17_920, eurN = 17_740, usdN = 16_310

export const shipments: ImportShipment[] = [
  /* ---------------- 1 · Baillie oak, received and costed, red lane ---------------- */
  {
    id: 'shp_0058', code: 'IMP-2026-0058', supplierId: 'sup_baillie', status: 'RECEIVED',
    incoterm: 'CIF', currency: 'USD', fxRateAtOrder: 16_190, ndpbm: 16_240,
    forwarder: 'PT Samudera Lintas Benua', vessel: 'MV Ever Lambent', voyage: '0142E',
    containerNo: 'MSCU7418823', containerType: '40HC',
    portOfLoading: 'USSAV', portOfDischarge: 'IDSRG', billOfLadingNo: 'MSCUSA4471209',
    supplierReadyDate: d(-96), etd: d(-90), eta: d(-56), dischargedAt: d(-55),
    freeTimeDays: 7, demurragePerDay: 1_450_000,
    pibNumber: '000418', pibDate: d(-54), customsOffice: '040300',
    lane: 'RED', laneAssignedAt: d(-53), sppbNumber: 'SPPB-040300-0221', sppbDate: d(-44),
    gateOutAt: d(-43), receivedAt: d(-42), costFinalised: true, costFinalisedAt: d(-30),
    ppjk: 'PT Bhakti Kepabeanan Utama', permitIds: ['pmt_dipk_58'],
    note: 'Eleven days from PIB to SPPB and four days of demurrage. This one consignment is why Baillie’s clearance average is seven days and not two.',
    lines: [
      SL('it_oak26', 'po_0142', 36, 'm3', 1_286, 24_840, 36, '4407.99.90', 5, { receivedQuantity: 36, landedUnitCost: 22_186_000, lotId: 'lot_oak_a' }),
      SL('it_wal26', 'po_0142', 12, 'm3', 2_810, 8_280, 12, '4407.99.90', 5, { receivedQuantity: 12, landedUnitCost: 48_402_000, lotId: 'lot_wal_a' }),
    ],
    costs: [
      C('GOODS', 79_016, 'USD', 16_190, 'DIRECT'),
      C('FREIGHT', 3_180, 'USD', 16_240, 'VOLUME'),
      C('INSURANCE', 632, 'USD', 16_240, 'CUSTOMS_VALUE'),
      C('DUTY', 67_002_000, 'IDR', 1, 'CUSTOMS_VALUE'),
      C('PPN', 154_105_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true }),
      C('PPH22', 35_024_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true }),
      C('CLEARANCE_FEE', 8_400_000, 'IDR', 1, 'CUSTOMS_VALUE', { vendor: 'PT Bhakti Kepabeanan Utama' }),
      C('THC', 4_950_000, 'IDR', 1, 'QUANTITY'),
      C('DEMURRAGE', 5_800_000, 'IDR', 1, 'GROSS_WEIGHT', { note: 'Four days past free time while the red-lane inspection was queued.' }),
      C('INLAND_TRUCKING', 6_200_000, 'IDR', 1, 'GROSS_WEIGHT'),
      C('PERMIT_FEE', 1_750_000, 'IDR', 1, 'CUSTOMS_VALUE', { note: 'DIPK filing through SILK.' }),
    ],
    documents: [
      DOC('shp_0058', 'COMMERCIAL_INVOICE', 'BL-2026-04471', 'VERIFIED'),
      DOC('shp_0058', 'PACKING_LIST', 'BL-2026-04471-PL', 'VERIFIED'),
      DOC('shp_0058', 'BILL_OF_LADING', 'MSCUSA4471209', 'VERIFIED'),
      DOC('shp_0058', 'INSURANCE_CERT', 'AXA-MC-2026-88214', 'VERIFIED'),
      DOC('shp_0058', 'PERMIT', 'DIPK/2026/06/00281', 'VERIFIED'),
      DOC('shp_0058', 'PIB', '000418', 'VERIFIED'),
      DOC('shp_0058', 'SPPB', 'SPPB-040300-0221', 'VERIFIED', false),
      DOC('shp_0058', 'PAYMENT_PROOF', 'BNI-2026-0918442', 'VERIFIED'),
      DOC('shp_0058', 'COO', '—', 'NOT_APPLICABLE', false, 'No preference available on US-origin sawn timber.'),
    ],
  },

  /* ---------------- 2 · DTC hardware, received and costed, yellow lane ---------------- */
  {
    id: 'shp_0061', code: 'IMP-2026-0061', supplierId: 'sup_dtc', status: 'RECEIVED',
    incoterm: 'FOB', currency: 'USD', fxRateAtOrder: 16_260, ndpbm: 16_290,
    forwarder: 'PT Cakrawala Logistik', vessel: 'MV Wan Hai 613', voyage: 'W142',
    containerNo: 'WHLU5182047', containerType: '40GP',
    portOfLoading: 'CNNGB', portOfDischarge: 'IDSRG', billOfLadingNo: 'WHLNGB2260118',
    supplierReadyDate: d(-52), etd: d(-46), eta: d(-30), dischargedAt: d(-30),
    freeTimeDays: 10, demurragePerDay: 1_150_000,
    pibNumber: '000622', pibDate: d(-29), customsOffice: '040300',
    lane: 'YELLOW', laneAssignedAt: d(-28), sppbNumber: 'SPPB-040300-0318', sppbDate: d(-23),
    gateOutAt: d(-23), receivedAt: d(-22), costFinalised: true, costFinalisedAt: d(-14),
    ppjk: 'PT Bhakti Kepabeanan Utama', permitIds: [],
    note: 'Yellow, as usual — their invoice showed 6,000 hinges and the packing list 6,200. Five days to reconcile two hundred hinges.',
    lines: [
      SL('it_hinge', 'po_0151', 6000, 'pc', 1.02, 1_860, 4.2, '8302.10.00', 0, { receivedQuantity: 6000, landedUnitCost: 19_240, lotId: 'lot_hinge_a' }),
      SL('it_handle', 'po_0151', 2400, 'pc', 1.87, 640, 1.4, '8302.42.90', 0, { receivedQuantity: 2400, landedUnitCost: 34_180, lotId: 'lot_handle_a' }),
      SL('it_castor', 'po_0151', 1600, 'pc', 0.67, 288, 1.1, '8302.20.00', 0, { receivedQuantity: 1600, landedUnitCost: 12_620, lotId: 'lot_castor_a' }),
      SL('it_conn', 'po_0151', 4000, 'set', 0.37, 420, 1.6, '8302.42.90', 0, { receivedQuantity: 4000, landedUnitCost: 6_940, lotId: 'lot_conn_a' }),
      SL('it_hpl', 'po_0151', 600, 'sheet', 11.55, 3_240, 3.6, '4823.90.99', 5, { receivedQuantity: 600, landedUnitCost: 216_400, lotId: 'lot_hpl_a' }),
      SL('it_edge', 'po_0151', 30000, 'm', 0.116, 690, 1.8, '4823.90.99', 5, { receivedQuantity: 30000, landedUnitCost: 2_198, lotId: 'lot_edge_a' }),
    ],
    costs: [
      C('GOODS', 24_310, 'USD', 16_260, 'DIRECT'),
      C('FREIGHT', 1_420, 'USD', 16_290, 'VOLUME'),
      C('INSURANCE', 182, 'USD', 16_290, 'CUSTOMS_VALUE'),
      C('DUTY', 8_912_000, 'IDR', 1, 'CUSTOMS_VALUE', { note: 'Form E honoured on hinges, handles, castors and connectors; only the HPL and edge banding paid the 5% ACFTA rate.' }),
      C('PPN', 45_216_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true }),
      C('PPH22', 10_277_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true }),
      C('CLEARANCE_FEE', 7_200_000, 'IDR', 1, 'CUSTOMS_VALUE'),
      C('THC', 4_100_000, 'IDR', 1, 'QUANTITY'),
      C('INLAND_TRUCKING', 3_400_000, 'IDR', 1, 'GROSS_WEIGHT'),
      C('BANK_CHARGE', 1_150_000, 'IDR', 1, 'CUSTOMS_VALUE'),
    ],
    documents: [
      DOC('shp_0061', 'COMMERCIAL_INVOICE', 'DTC-26-0448', 'VERIFIED'),
      DOC('shp_0061', 'PACKING_LIST', 'DTC-26-0448-PL', 'VERIFIED', true, 'Amended once — the hinge count did not agree with the invoice.'),
      DOC('shp_0061', 'BILL_OF_LADING', 'WHLNGB2260118', 'VERIFIED'),
      DOC('shp_0061', 'COO', 'E26 4400114823', 'VERIFIED', false, 'Form E. Worth Rp 41 juta of duty on this consignment alone.'),
      DOC('shp_0061', 'INSURANCE_CERT', 'AXA-MC-2026-90118', 'VERIFIED'),
      DOC('shp_0061', 'PIB', '000622', 'VERIFIED'),
      DOC('shp_0061', 'SPPB', 'SPPB-040300-0318', 'VERIFIED', false),
      DOC('shp_0061', 'PAYMENT_PROOF', 'BNI-2026-0941780', 'VERIFIED'),
    ],
  },

  /* ---------------- 3 · Hettich runners, received, green lane ---------------- */
  {
    id: 'shp_0063', code: 'IMP-2026-0063', supplierId: 'sup_hettich', status: 'RECEIVED',
    incoterm: 'FOB', currency: 'EUR', fxRateAtOrder: 17_760, ndpbm: 17_690,
    forwarder: 'PT Samudera Lintas Benua', vessel: 'MV CMA CGM Loire', voyage: '0388W',
    containerNo: 'CMAU4471902', containerType: 'LCL',
    portOfLoading: 'DEHAM', portOfDischarge: 'IDSRG', billOfLadingNo: 'CMAHAM2601447',
    supplierReadyDate: d(-61), etd: d(-58), eta: d(-27), dischargedAt: d(-27),
    freeTimeDays: 7, demurragePerDay: 980_000,
    pibNumber: '000651', pibDate: d(-26), customsOffice: '040300',
    lane: 'GREEN', laneAssignedAt: d(-26), sppbNumber: 'SPPB-040300-0334', sppbDate: d(-25),
    gateOutAt: d(-25), receivedAt: d(-24), costFinalised: true, costFinalisedAt: d(-19),
    ppjk: 'PT Bhakti Kepabeanan Utama', permitIds: [],
    note: 'Green, cleared in a day. Hettich’s paperwork has never once been queried.',
    lines: [SL('it_runner', 'po_0159', 900, 'pair', 14.2, 1_980, 5.4, '8302.42.90', 12.5, { receivedQuantity: 900, landedUnitCost: 297_140, lotId: 'lot_runner_a' })],
    costs: [
      C('GOODS', 12_780, 'EUR', 17_760, 'DIRECT'),
      C('FREIGHT', 1_640, 'EUR', 17_690, 'VOLUME'),
      C('INSURANCE', 96, 'EUR', 17_690, 'CUSTOMS_VALUE'),
      C('DUTY', 32_022_000, 'IDR', 1, 'CUSTOMS_VALUE'),
      C('PPN', 31_722_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true }),
      C('PPH22', 7_210_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true }),
      C('CLEARANCE_FEE', 5_600_000, 'IDR', 1, 'CUSTOMS_VALUE'),
      C('THC', 2_800_000, 'IDR', 1, 'QUANTITY'),
      C('INLAND_TRUCKING', 1_900_000, 'IDR', 1, 'GROSS_WEIGHT'),
      C('BANK_CHARGE', 3_400_000, 'IDR', 1, 'CUSTOMS_VALUE', { note: 'L/C opening commission.' }),
    ],
    documents: [
      DOC('shp_0063', 'COMMERCIAL_INVOICE', 'HET-2026-11842', 'VERIFIED'),
      DOC('shp_0063', 'PACKING_LIST', 'HET-2026-11842-PL', 'VERIFIED'),
      DOC('shp_0063', 'BILL_OF_LADING', 'CMAHAM2601447', 'VERIFIED'),
      DOC('shp_0063', 'INSURANCE_CERT', 'AXA-MC-2026-90440', 'VERIFIED'),
      DOC('shp_0063', 'PIB', '000651', 'VERIFIED'),
      DOC('shp_0063', 'SPPB', 'SPPB-040300-0334', 'VERIFIED', false),
      DOC('shp_0063', 'PAYMENT_PROOF', 'BNI-2026-0952011', 'VERIFIED'),
      DOC('shp_0063', 'COO', '—', 'NOT_APPLICABLE', false, 'No preferential scheme with the EU on this heading.'),
    ],
  },

  /* ---------------- 4 · Bison panels, received, green lane ---------------- */
  {
    id: 'shp_0065', code: 'IMP-2026-0065', supplierId: 'sup_bison', status: 'RECEIVED',
    incoterm: 'CFR', currency: 'USD', fxRateAtOrder: 16_380, ndpbm: 16_340,
    forwarder: 'PT Cakrawala Logistik', vessel: 'MV Bunga Raya 7', voyage: 'BR118',
    containerNo: 'TGHU8820114', containerType: '40HC',
    portOfLoading: 'MYPKG', portOfDischarge: 'IDSRG', billOfLadingNo: 'PKGSRG26011884',
    supplierReadyDate: d(-32), etd: d(-28), eta: d(-19), dischargedAt: d(-19),
    freeTimeDays: 10, demurragePerDay: 1_150_000,
    pibNumber: '000704', pibDate: d(-18), customsOffice: '040300',
    lane: 'GREEN', laneAssignedAt: d(-18), sppbNumber: 'SPPB-040300-0361', sppbDate: d(-17),
    gateOutAt: d(-17), receivedAt: d(-16), costFinalised: true, costFinalisedAt: d(-9),
    ppjk: 'PT Bhakti Kepabeanan Utama', permitIds: ['pmt_sni_mdf'],
    note: 'Form D on file, so the panels came in at nil duty instead of ten per cent — a Rp 78 juta piece of paper.',
    lines: [
      SL('it_mdf18', 'po_0156', 1200, 'sheet', 17.6, 39_600, 47.5, '4411.14.00', 0, { receivedQuantity: 1200, landedUnitCost: 301_900, lotId: 'lot_mdf18_a' }),
      SL('it_mdf9', 'po_0156', 800, 'sheet', 10.2, 13_200, 15.8, '4411.13.00', 0, { receivedQuantity: 800, landedUnitCost: 175_600, lotId: 'lot_mdf9_a' }),
      SL('it_pb16', 'po_0156', 900, 'sheet', 10.8, 26_100, 31.4, '4410.11.00', 0, { receivedQuantity: 900, landedUnitCost: 186_200, lotId: 'lot_pb16_a' }),
      SL('it_foam32', 'po_0156', 250, 'sheet', 37.2, 1_950, 30.5, '3921.13.00', 0, { receivedQuantity: 250, landedUnitCost: 634_800, lotId: 'lot_foam_a' }),
    ],
    costs: [
      C('GOODS', 48_150, 'USD', 16_380, 'DIRECT'),
      C('FREIGHT', 1_980, 'USD', 16_340, 'VOLUME', { note: 'Included in the CFR price; shown separately for the customs value.' }),
      C('INSURANCE', 240, 'USD', 16_340, 'CUSTOMS_VALUE'),
      C('DUTY', 0, 'IDR', 1, 'CUSTOMS_VALUE', { note: 'Nil under ATIGA. Without the Form D this line would have been Rp 78,4 juta.' }),
      C('PPN', 90_140_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true }),
      C('PPH22', 20_486_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true }),
      C('CLEARANCE_FEE', 6_800_000, 'IDR', 1, 'CUSTOMS_VALUE'),
      C('THC', 4_950_000, 'IDR', 1, 'QUANTITY'),
      C('INLAND_TRUCKING', 8_900_000, 'IDR', 1, 'GROSS_WEIGHT'),
      C('PERMIT_FEE', 1_750_000, 'IDR', 1, 'CUSTOMS_VALUE'),
    ],
    documents: [
      DOC('shp_0065', 'COMMERCIAL_INVOICE', 'BPS-26-0771', 'VERIFIED'),
      DOC('shp_0065', 'PACKING_LIST', 'BPS-26-0771-PL', 'VERIFIED'),
      DOC('shp_0065', 'BILL_OF_LADING', 'PKGSRG26011884', 'VERIFIED'),
      DOC('shp_0065', 'COO', 'D2026MY0114822', 'VERIFIED', false, 'Form D under ATIGA.'),
      DOC('shp_0065', 'INSURANCE_CERT', 'AXA-MC-2026-91302', 'VERIFIED'),
      DOC('shp_0065', 'PERMIT', 'DIPK/2026/07/00344', 'VERIFIED'),
      DOC('shp_0065', 'PIB', '000704', 'VERIFIED'),
      DOC('shp_0065', 'SPPB', 'SPPB-040300-0361', 'VERIFIED', false),
      DOC('shp_0065', 'PAYMENT_PROOF', 'BNI-2026-0968214', 'VERIFIED'),
    ],
  },

  /* ---------------- 5 · Sayerlack chemistry — RED lane, free time almost gone ---------------- */
  {
    id: 'shp_0069', code: 'IMP-2026-0069', supplierId: 'sup_sayerlack', status: 'LANE_ASSIGNED',
    incoterm: 'FOB', currency: 'EUR', fxRateAtOrder: 17_840, ndpbm: eurN,
    forwarder: 'PT Samudera Lintas Benua', vessel: 'MV MSC Positano', voyage: '0221W',
    containerNo: 'MSCU9014772', containerType: '20GP',
    portOfLoading: 'ITGOA', portOfDischarge: 'IDSRG', billOfLadingNo: 'MSCGOA2604418',
    supplierReadyDate: d(-40), etd: d(-38), eta: d(-7), dischargedAt: d(-6),
    freeTimeDays: 7, demurragePerDay: 1_566_000,
    pibNumber: '000812', pibDate: d(-4), customsOffice: '040300',
    lane: 'RED', laneAssignedAt: d(-3),
    costFinalised: false, ppjk: 'PT Bhakti Kepabeanan Utama', permitIds: ['pmt_b2', 'pmt_ls_69'],
    note: 'Red lane on B2 chemistry, and the surveyor’s original is still in Italy. Free time runs out tomorrow and demurrage starts at Rp 1,57 juta a day.',
    lines: [
      SL('it_sealer', 'po_0171', 1000, 'L', 8.9, 1_060, 1.2, '3208.20.90', 10),
      SL('it_topcoat', 'po_0171', 1000, 'L', 11.4, 1_060, 1.2, '3208.20.90', 10),
      SL('it_thinner', 'po_0171', 1500, 'L', 2.42, 1_320, 1.7, '3814.00.00', 5),
      SL('it_stain', 'po_0171', 400, 'L', 10.4, 424, 0.5, '3208.20.90', 10),
    ],
    costs: [
      C('GOODS', 27_990, 'EUR', 17_840, 'DIRECT'),
      C('FREIGHT', 2_240, 'EUR', eurN, 'VOLUME'),
      C('INSURANCE', 224, 'EUR', eurN, 'CUSTOMS_VALUE'),
      C('DUTY', 44_812_000, 'IDR', 1, 'CUSTOMS_VALUE'),
      C('PPN', 60_534_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true }),
      C('PPH22', 13_758_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true }),
      C('CLEARANCE_FEE', 9_200_000, 'IDR', 1, 'CUSTOMS_VALUE', { actual: false, note: 'Broker’s estimate; the red-lane handling fee is not billed yet.' }),
      C('SURVEY', 6_400_000, 'IDR', 1, 'CUSTOMS_VALUE', { actual: false }),
      C('THC', 3_100_000, 'IDR', 1, 'QUANTITY'),
      C('INLAND_TRUCKING', 2_800_000, 'IDR', 1, 'GROSS_WEIGHT', { actual: false }),
    ],
    documents: [
      DOC('shp_0069', 'COMMERCIAL_INVOICE', 'SAY-2026-4471', 'VERIFIED'),
      DOC('shp_0069', 'PACKING_LIST', 'SAY-2026-4471-PL', 'VERIFIED'),
      DOC('shp_0069', 'BILL_OF_LADING', 'MSCGOA2604418', 'VERIFIED'),
      DOC('shp_0069', 'INSURANCE_CERT', 'AXA-MC-2026-93118', 'VERIFIED'),
      DOC('shp_0069', 'PERMIT', 'IP-B2 214/DAGLU/2026', 'VERIFIED'),
      DOC('shp_0069', 'SURVEY_REPORT', 'LS/SUCOFINDO/2026/11284', 'REQUIRED', true, 'Scanned copy received; customs wants the original, which is still with the surveyor in Genoa.'),
      DOC('shp_0069', 'MSDS', 'SAY-MSDS-PU-2026', 'VERIFIED', false),
      DOC('shp_0069', 'PIB', '000812', 'RECEIVED'),
      DOC('shp_0069', 'PAYMENT_PROOF', 'BNI-2026-0991044', 'VERIFIED'),
      DOC('shp_0069', 'COO', '—', 'NOT_APPLICABLE', false),
    ],
  },

  /* ---------------- 6 · Bison MDF and veneer — PIB in, Form D missing ---------------- */
  {
    id: 'shp_0072', code: 'IMP-2026-0072', supplierId: 'sup_bison', status: 'PIB_SUBMITTED',
    incoterm: 'CFR', currency: 'USD', fxRateAtOrder: 16_420, ndpbm: usdN,
    forwarder: 'PT Cakrawala Logistik', vessel: 'MV Bunga Raya 9', voyage: 'BR131',
    containerNo: 'TGHU9014477', containerType: '40HC',
    portOfLoading: 'MYPKG', portOfDischarge: 'IDSRG', billOfLadingNo: 'PKGSRG26012440',
    supplierReadyDate: d(-14), etd: d(-11), eta: d(-2), dischargedAt: d(-2),
    freeTimeDays: 10, demurragePerDay: 1_150_000,
    pibNumber: '000841', pibDate: d(-1), customsOffice: '040300',
    lane: 'PENDING', costFinalised: false, ppjk: 'PT Bhakti Kepabeanan Utama',
    permitIds: ['pmt_dipk_69', 'pmt_sni_mdf'],
    note: 'The Form D was couriered to the wrong office in Klang. Until it arrives the duty stands at the MFN rate, and the difference is real money.',
    lines: [
      SL('it_mdf18', 'po_0176', 1200, 'sheet', 17.9, 39_600, 47.5, '4411.14.00', 10, { note: 'Should be nil under ATIGA. Charged at 10% because the Form D is not on file.' }),
      SL('it_venoak', 'po_0176', 3000, 'm2', 2.61, 2_640, 6.2, '4408.90.00', 5, { note: 'Should be nil under ATIGA.' }),
    ],
    costs: [
      C('GOODS', 29_310, 'USD', 16_420, 'DIRECT'),
      C('FREIGHT', 2_040, 'USD', usdN, 'VOLUME'),
      C('INSURANCE', 156, 'USD', usdN, 'CUSTOMS_VALUE'),
      C('DUTY', 44_186_000, 'IDR', 1, 'CUSTOMS_VALUE', { note: 'MFN rates. With the Form D this line is nil.' }),
      C('PPN', 58_640_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true }),
      C('PPH22', 13_327_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true }),
      C('CLEARANCE_FEE', 6_800_000, 'IDR', 1, 'CUSTOMS_VALUE', { actual: false }),
      C('THC', 4_950_000, 'IDR', 1, 'QUANTITY'),
      C('INLAND_TRUCKING', 8_900_000, 'IDR', 1, 'GROSS_WEIGHT', { actual: false }),
    ],
    documents: [
      DOC('shp_0072', 'COMMERCIAL_INVOICE', 'BPS-26-0918', 'VERIFIED'),
      DOC('shp_0072', 'PACKING_LIST', 'BPS-26-0918-PL', 'VERIFIED'),
      DOC('shp_0072', 'BILL_OF_LADING', 'PKGSRG26012440', 'VERIFIED'),
      DOC('shp_0072', 'COO', 'awaiting Form D', 'REQUIRED', false, 'Couriered to the wrong office in Klang. Re-issue takes four working days.'),
      DOC('shp_0072', 'INSURANCE_CERT', 'AXA-MC-2026-94210', 'VERIFIED'),
      DOC('shp_0072', 'PERMIT', 'DIPK/2026/09/00417', 'VERIFIED'),
      DOC('shp_0072', 'PIB', '000841', 'RECEIVED'),
      DOC('shp_0072', 'PAYMENT_PROOF', 'BNI-2026-1004118', 'RECEIVED'),
    ],
  },

  /* ---------------- 7 · Hettich runners — on the water, the Alila order hangs on it ---------------- */
  {
    id: 'shp_0074', code: 'IMP-2026-0074', supplierId: 'sup_hettich', status: 'ON_WATER',
    incoterm: 'FOB', currency: 'EUR', fxRateAtOrder: 17_890,
    forwarder: 'PT Samudera Lintas Benua', vessel: 'MV CMA CGM Rhône', voyage: '0402W',
    containerNo: 'CMAU5218840', containerType: 'LCL',
    portOfLoading: 'DEHAM', portOfDischarge: 'IDSRG', billOfLadingNo: 'CMAHAM2602118',
    supplierReadyDate: d(-5), etd: d(-3), eta: d(9),
    freeTimeDays: 7, demurragePerDay: 980_000,
    lane: 'PENDING', costFinalised: false, ppjk: 'PT Bhakti Kepabeanan Utama', permitIds: [],
    note: 'Two days early out of Hamburg. Berths in nine days, and on Hettich’s record it clears in two — which still leaves the wardrobe line five days short.',
    lines: [
      SL('it_runner', 'po_0188', 1600, 'pair', 14.4, 3_520, 9.6, '8302.42.90', 12.5),
      SL('it_lift', 'po_0188', 200, 'set', 39.8, 940, 2.4, '8302.42.90', 12.5),
    ],
    costs: [
      C('GOODS', 30_000, 'EUR', 17_890, 'DIRECT'),
      C('FREIGHT', 2_880, 'EUR', eurN, 'VOLUME', { actual: false }),
      C('INSURANCE', 216, 'EUR', eurN, 'CUSTOMS_VALUE', { actual: false }),
      C('DUTY', 68_402_000, 'IDR', 1, 'CUSTOMS_VALUE', { actual: false, note: 'Estimated at 12.5% MFN; no preference applies to German origin here.' }),
      C('PPN', 67_820_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true, actual: false }),
      C('PPH22', 15_414_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true, actual: false }),
      C('CLEARANCE_FEE', 5_600_000, 'IDR', 1, 'CUSTOMS_VALUE', { actual: false }),
      C('THC', 2_800_000, 'IDR', 1, 'QUANTITY', { actual: false }),
      C('INLAND_TRUCKING', 1_900_000, 'IDR', 1, 'GROSS_WEIGHT', { actual: false }),
    ],
    documents: [
      DOC('shp_0074', 'COMMERCIAL_INVOICE', 'HET-2026-12904', 'VERIFIED'),
      DOC('shp_0074', 'PACKING_LIST', 'HET-2026-12904-PL', 'VERIFIED'),
      DOC('shp_0074', 'BILL_OF_LADING', 'CMAHAM2602118', 'RECEIVED'),
      DOC('shp_0074', 'INSURANCE_CERT', 'AXA-MC-2026-95004', 'RECEIVED'),
      DOC('shp_0074', 'PIB', '—', 'REQUIRED'),
      DOC('shp_0074', 'PAYMENT_PROOF', '—', 'REQUIRED'),
      DOC('shp_0074', 'COO', '—', 'NOT_APPLICABLE', false),
    ],
  },

  /* ---------------- 8 · Baillie timber — booked, and the DIPK lapses before it lands ---------------- */
  {
    id: 'shp_0076', code: 'IMP-2026-0076', supplierId: 'sup_baillie', status: 'BOOKED',
    incoterm: 'CIF', currency: 'USD', fxRateAtOrder: 16_450,
    forwarder: 'PT Samudera Lintas Benua', vessel: 'MV Ever Lucent', voyage: '0166E',
    containerNo: 'MSCU8811047', containerType: '40HC',
    portOfLoading: 'USSAV', portOfDischarge: 'IDSRG', billOfLadingNo: undefined,
    supplierReadyDate: d(-2), etd: d(3), eta: d(24),
    freeTimeDays: 7, demurragePerDay: 1_450_000,
    lane: 'PENDING', costFinalised: false, ppjk: 'PT Bhakti Kepabeanan Utama', permitIds: ['pmt_dipk_74'],
    note: 'The DIPK covering this consignment expires in nineteen days. The vessel berths in twenty-four. A lapsed declaration is no declaration, and re-filing through SILK takes eleven working days.',
    lines: [
      SL('it_oak26', 'po_0191', 42, 'm3', 1_312, 28_980, 42, '4407.99.90', 5),
      SL('it_wal26', 'po_0191', 14, 'm3', 2_890, 9_660, 14, '4407.99.90', 5),
    ],
    costs: [
      C('GOODS', 95_564, 'USD', 16_450, 'DIRECT'),
      C('FREIGHT', 3_640, 'USD', usdN, 'VOLUME', { actual: false }),
      C('INSURANCE', 764, 'USD', usdN, 'CUSTOMS_VALUE', { actual: false }),
      C('DUTY', 81_120_000, 'IDR', 1, 'CUSTOMS_VALUE', { actual: false }),
      C('PPN', 186_570_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true, actual: false }),
      C('PPH22', 42_402_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true, actual: false }),
      C('CLEARANCE_FEE', 8_400_000, 'IDR', 1, 'CUSTOMS_VALUE', { actual: false }),
      C('THC', 4_950_000, 'IDR', 1, 'QUANTITY', { actual: false }),
      C('INLAND_TRUCKING', 7_100_000, 'IDR', 1, 'GROSS_WEIGHT', { actual: false }),
      C('PERMIT_FEE', 1_750_000, 'IDR', 1, 'CUSTOMS_VALUE', { actual: false }),
    ],
    documents: [
      DOC('shp_0076', 'COMMERCIAL_INVOICE', 'BL-2026-05188', 'RECEIVED'),
      DOC('shp_0076', 'PACKING_LIST', 'BL-2026-05188-PL', 'RECEIVED'),
      DOC('shp_0076', 'BILL_OF_LADING', '—', 'REQUIRED'),
      DOC('shp_0076', 'INSURANCE_CERT', '—', 'REQUIRED'),
      DOC('shp_0076', 'PERMIT', 'DIPK/2026/08/00392', 'RECEIVED', true, 'Valid today, expired by arrival.'),
      DOC('shp_0076', 'PIB', '—', 'REQUIRED'),
      DOC('shp_0076', 'PAYMENT_PROOF', '—', 'REQUIRED'),
      DOC('shp_0076', 'COO', '—', 'NOT_APPLICABLE', false),
    ],
  },

  /* ---------------- 9 · Foshan fabric — still in production ---------------- */
  {
    id: 'shp_0078', code: 'IMP-2026-0078', supplierId: 'sup_foshanfab', status: 'IN_PRODUCTION',
    incoterm: 'FOB', currency: 'CNY', fxRateAtOrder: 2_272,
    portOfLoading: 'CNNGB', portOfDischarge: 'IDSRG',
    supplierReadyDate: d(6), etd: d(10), eta: d(26),
    freeTimeDays: 10, demurragePerDay: 1_150_000,
    lane: 'PENDING', costFinalised: false, permitIds: [],
    note: 'Dye lot confirmed against our master. If they run a second lot to make quantity, incoming QC will reject it.',
    lines: [SL('it_fabric', 'po_0194', 2000, 'm', 29.4, 720, 4.2, '5407.61.90', 5)],
    costs: [
      C('GOODS', 58_800, 'CNY', 2_272, 'DIRECT'),
      C('FREIGHT', 1_100, 'USD', usdN, 'VOLUME', { actual: false }),
      C('DUTY', 6_722_000, 'IDR', 1, 'CUSTOMS_VALUE', { actual: false, note: 'ACFTA preferential 5%, subject to the Form E arriving.' }),
      C('PPN', 15_420_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true, actual: false }),
      C('PPH22', 3_505_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true, actual: false }),
      C('CLEARANCE_FEE', 5_200_000, 'IDR', 1, 'CUSTOMS_VALUE', { actual: false }),
      C('INLAND_TRUCKING', 1_600_000, 'IDR', 1, 'GROSS_WEIGHT', { actual: false }),
    ],
    documents: [
      DOC('shp_0078', 'COMMERCIAL_INVOICE', '—', 'REQUIRED'),
      DOC('shp_0078', 'PACKING_LIST', '—', 'REQUIRED'),
      DOC('shp_0078', 'BILL_OF_LADING', '—', 'REQUIRED'),
      DOC('shp_0078', 'COO', '—', 'REQUIRED', false, 'Form E. Ten per cent of the invoice rides on it.'),
      DOC('shp_0078', 'INSURANCE_CERT', '—', 'REQUIRED'),
      DOC('shp_0078', 'PIB', '—', 'REQUIRED'),
      DOC('shp_0078', 'PAYMENT_PROOF', '—', 'REQUIRED'),
    ],
  },

  /* ---------------- 10 · Sayerlack second order — blocked at the permit gate ---------------- */
  {
    id: 'shp_0080', code: 'IMP-2026-0080', supplierId: 'sup_sayerlack', status: 'PERMIT_PENDING',
    incoterm: 'FOB', currency: 'EUR', fxRateAtOrder: eur,
    portOfLoading: 'ITGOA', portOfDischarge: 'IDSRG',
    etd: d(46), eta: d(78), freeTimeDays: 7, demurragePerDay: 1_566_000,
    lane: 'PENDING', costFinalised: false, permitIds: ['pmt_b2'],
    note: 'Blocked. The IP-B2 that covers these HS codes expires in forty-one days; this consignment could not berth before the seventy-eighth. Renewal has to be filed this week or the finishing line runs dry in November.',
    lines: [
      SL('it_topcoat', 'po_0198', 1000, 'L', 11.6, 1_060, 1.2, '3208.20.90', 10),
      SL('it_thinner', 'po_0198', 1500, 'L', 2.48, 1_320, 1.7, '3814.00.00', 5),
      SL('it_wbtop', 'po_0198', 600, 'L', 14.1, 648, 0.8, '3208.20.90', 10),
    ],
    costs: [
      C('GOODS', 23_780, 'EUR', eur, 'DIRECT', { actual: false }),
      C('FREIGHT', 2_240, 'EUR', eurN, 'VOLUME', { actual: false }),
      C('DUTY', 38_640_000, 'IDR', 1, 'CUSTOMS_VALUE', { actual: false }),
      C('PPN', 52_180_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true, actual: false }),
      C('PPH22', 11_859_000, 'IDR', 1, 'CUSTOMS_VALUE', { creditable: true, actual: false }),
      C('SURVEY', 6_400_000, 'IDR', 1, 'CUSTOMS_VALUE', { actual: false }),
    ],
    documents: [
      DOC('shp_0080', 'COMMERCIAL_INVOICE', '—', 'REQUIRED'),
      DOC('shp_0080', 'PACKING_LIST', '—', 'REQUIRED'),
      DOC('shp_0080', 'BILL_OF_LADING', '—', 'REQUIRED'),
      DOC('shp_0080', 'INSURANCE_CERT', '—', 'REQUIRED'),
      DOC('shp_0080', 'PERMIT', 'IP-B2 renewal not filed', 'REQUIRED', true, 'Expires in 41 days. Six weeks to renew, so it is already late.'),
      DOC('shp_0080', 'SURVEY_REPORT', '—', 'REQUIRED'),
      DOC('shp_0080', 'MSDS', 'SAY-MSDS-PU-2026', 'VERIFIED', false),
      DOC('shp_0080', 'PIB', '—', 'REQUIRED'),
      DOC('shp_0080', 'PAYMENT_PROOF', '—', 'REQUIRED'),
    ],
  },
]
