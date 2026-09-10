/**
 * The commercial book — the order pipeline before it is an order, the containers
 * going the other way, the claims that come back, and the money.
 *
 * Every row here is written to make a rule fire: a quote lapsing on Friday with
 * the timber price already moved under it, a forty-foot container sailing two
 * thirds full because one line missed the kiln, a carving claim nobody has
 * decided liability on, and a receipt from a customer who paid the wrong amount.
 */

import type {
  BankAccount, Claim, Delivery, DeliveryLine, PackedUnit, Payment, Quotation, QuotationLine,
} from './types'
import { d } from './clock'
import { products, workCentres } from './seed-master'
import { routings } from './seed-engineering'
import { salesOrders, standardMaterialCost } from './seed-production'

const product = (id: string) => products.find((p) => p.id === id)!

/**
 * Standard cost at quoting time: material exploded off the bill with its yields,
 * plus labour and overhead run out over the routing. It is the same figure the
 * product catalogue shows, which is the point — a quote priced on anything else
 * is a quote whose margin nobody can check afterwards.
 */
const stdCost = (productId: string) => {
  const routing = routings.find((r) => r.productId === productId)
  const conversion = routing
    ? routing.operations.reduce((acc, op) => {
        if (op.subcontracted) return acc + (op.subcontractCostPerUnit ?? 0)
        const wc = workCentres.find((w) => w.id === op.workCentreId)
        const hours = (op.setupMinutes / 20 + op.runMinutesPerUnit) / 60
        return acc + hours * ((wc?.labourRatePerHour ?? 0) + (wc?.overheadRatePerHour ?? 0))
      }, 0)
    : 0
  return Math.round(standardMaterialCost(productId) + conversion)
}

let qlSeq = 0
const QL = (
  productId: string, quantity: number, unitPrice: number, discountPercent: number,
  leadTimeDays: number, note?: string,
): QuotationLine => ({
  id: `ql_${++qlSeq}`,
  productId,
  description: product(productId).name,
  quantity,
  unitPrice,
  discountPercent,
  standardCostAtQuote: stdCost(productId),
  leadTimeDays,
  note,
})

/* ==================================================================
   Quotations — the pipeline
   ================================================================== */

export const quotations: Quotation[] = [
  {
    id: 'qt_0088', code: 'QT-2026-0088', customerId: 'cus_alila', status: 'NEGOTIATING',
    issueDate: d(-11), validUntil: d(3), currency: 'IDR', fxRate: 1,
    logisticsAllowance: 168_000_000, destination: 'Labuan Bajo, NTT',
    salesPerson: 'Nadia Kusumawardhani', probabilityPercent: 65, revision: 3,
    note: 'Their second property. Revision 3 already gives away eleven points; anything more and the walnut lines go under the floor.',
    lines: [
      QL('pr_wardrobe', 74, 24_100_000, 0.15, 62, 'Walnut. The runner lead time is the whole date.'),
      QL('pr_nightstand', 148, 3_640_000, 0.09, 48),
      QL('pr_desk', 74, 10_900_000, 0.08, 55),
    ],
  },
  {
    id: 'qt_0091', code: 'QT-2026-0091', customerId: 'cus_nordiska', status: 'SENT',
    issueDate: d(-6), validUntil: d(9), currency: 'EUR', fxRate: 17_920,
    logisticsAllowance: 96_000_000, incoterm: 'FOB', destination: 'Rotterdam',
    salesPerson: 'Bagas Prasetyo', probabilityPercent: 55, revision: 1,
    note: 'Water-based only, FSC chain of custody named on the invoice. Priced at the September euro; the quote is only good while that holds.',
    lines: [
      QL('pr_desk', 180, 628, 0.04, 71, 'FSC oak. The certified supply is the constraint, not the machine.'),
      QL('pr_coffee', 120, 402, 0.04, 64),
    ],
  },
  {
    id: 'qt_0093', code: 'QT-2026-0093', customerId: 'cus_grandwhiz', status: 'WITHDRAWN',
    issueDate: d(-9), validUntil: d(21), currency: 'IDR', fxRate: 1,
    logisticsAllowance: 42_000_000, destination: 'Whiz Prime Bandung',
    salesPerson: 'Nadia Kusumawardhani', probabilityPercent: 0, revision: 1,
    decidedAt: d(-4),
    note: 'Pulled by us. Rp 1,62 miliar is still outstanding on the last two projects and finance would not carry a third.',
    lines: [QL('pr_bed', 96, 14_800_000, 0.06, 74)],
  },
  {
    id: 'qt_0095', code: 'QT-2026-0095', customerId: 'cus_kanso', status: 'SENT',
    issueDate: d(-3), validUntil: d(27), currency: 'JPY', fxRate: 110,
    logisticsAllowance: 74_000_000, incoterm: 'FOB', destination: 'Osaka',
    salesPerson: 'Bagas Prasetyo', probabilityPercent: 40, revision: 1,
    note: 'Sampling turned into a programme enquiry. They want the walnut under IJEPA, which means a Form JIEPA on every container.',
    lines: [
      QL('pr_sideboard', 60, 142_000, 0.05, 78),
      QL('pr_nightstand', 120, 39_800, 0.05, 66),
    ],
  },
  {
    id: 'qt_0096', code: 'QT-2026-0096', customerId: 'cus_vivere', status: 'SENT',
    issueDate: d(-2), validUntil: d(28), currency: 'IDR', fxRate: 1,
    logisticsAllowance: 18_000_000, salesPerson: 'Nadia Kusumawardhani',
    probabilityPercent: 70, revision: 1,
    lines: [
      QL('pr_dining', 24, 20_900_000, 0.02, 52),
      QL('pr_chair', 96, 2_910_000, 0.02, 44),
    ],
  },
  {
    id: 'qt_0097', code: 'QT-2026-0097', customerId: 'cus_dekoruma', status: 'DRAFT',
    issueDate: d(0), validUntil: d(30), currency: 'IDR', fxRate: 1,
    logisticsAllowance: 22_000_000, salesPerson: 'Bagas Prasetyo',
    probabilityPercent: 45, revision: 1,
    note: 'Being priced against the new teak cost. The old quote used the pre-auction figure and would have gone out eight points light.',
    lines: [QL('pr_coffee', 80, 7_240_000, 0.06, 38)],
  },
  {
    id: 'qt_0084', code: 'QT-2026-0084', customerId: 'cus_wovn', status: 'WON',
    issueDate: d(-44), validUntil: d(-14), currency: 'USD', fxRate: 16_480,
    logisticsAllowance: 88_000_000, incoterm: 'FOB', destination: 'Melbourne',
    salesPerson: 'Bagas Prasetyo', probabilityPercent: 100, revision: 2,
    decidedAt: d(-36), salesOrderId: 'so_0035',
    lines: [QL('pr_outdoor', 40, 1_178, 0.07, 58)],
  },
  {
    id: 'qt_0079', code: 'QT-2026-0079', customerId: 'cus_informa', status: 'WON',
    issueDate: d(-62), validUntil: d(-32), currency: 'IDR', fxRate: 1,
    logisticsAllowance: 34_000_000, salesPerson: 'Nadia Kusumawardhani',
    probabilityPercent: 100, revision: 1, decidedAt: d(-58), salesOrderId: 'so_0028',
    lines: [
      QL('pr_nightstand', 200, 3_820_000, 0.04, 46),
      QL('pr_sideboard', 80, 13_400_000, 0.04, 52),
    ],
  },
  {
    id: 'qt_0081', code: 'QT-2026-0081', customerId: 'cus_alila', status: 'WON',
    issueDate: d(-52), validUntil: d(-22), currency: 'IDR', fxRate: 1,
    logisticsAllowance: 210_000_000, destination: 'Ubud, Bali',
    salesPerson: 'Nadia Kusumawardhani', probabilityPercent: 100, revision: 4,
    decidedAt: d(-46), salesOrderId: 'so_0031',
    lines: [
      QL('pr_wardrobe', 120, 26_900_000, 0.05, 64),
      QL('pr_nightstand', 120, 3_980_000, 0.03, 52),
      QL('pr_desk', 60, 11_900_000, 0.03, 58),
    ],
  },
  {
    id: 'qt_0086', code: 'QT-2026-0086', customerId: 'cus_dekoruma', status: 'LOST',
    issueDate: d(-38), validUntil: d(-8), currency: 'IDR', fxRate: 1,
    logisticsAllowance: 26_000_000, salesPerson: 'Bagas Prasetyo',
    probabilityPercent: 0, revision: 2, decidedAt: d(-19),
    lostReason: 'LEAD_TIME', lostToCompetitor: 'Olympic Furniture',
    note: 'Eleven weeks against their seven. The eleven was honest — the hinges were on a boat — but honest does not win it.',
    lines: [QL('pr_sideboard', 140, 12_900_000, 0.1, 77)],
  },
  {
    id: 'qt_0080', code: 'QT-2026-0080', customerId: 'cus_grandwhiz', status: 'LOST',
    issueDate: d(-71), validUntil: d(-41), currency: 'IDR', fxRate: 1,
    logisticsAllowance: 58_000_000, salesPerson: 'Nadia Kusumawardhani',
    probabilityPercent: 0, revision: 3, decidedAt: d(-49),
    lostReason: 'PRICE', lostToCompetitor: 'CV Mitra Kayu Sejahtera',
    note: 'Beaten by nineteen points. At that number they are not buying kiln-dried timber, and the property will find out in a wet season.',
    lines: [QL('pr_wardrobe', 60, 23_400_000, 0.18, 68)],
  },
  {
    id: 'qt_0075', code: 'QT-2026-0075', customerId: 'cus_kanso', status: 'EXPIRED',
    issueDate: d(-96), validUntil: d(-66), currency: 'JPY', fxRate: 112,
    logisticsAllowance: 40_000_000, incoterm: 'FOB', destination: 'Osaka',
    salesPerson: 'Bagas Prasetyo', probabilityPercent: 0, revision: 1,
    note: 'They never came back inside the window. The walnut has moved nine percent since, so it cannot simply be re-sent.',
    lines: [QL('pr_coffee', 48, 61_400, 0.03, 70)],
  },
  {
    id: 'qt_0083', code: 'QT-2026-0083', customerId: 'cus_wovn', status: 'LOST',
    issueDate: d(-58), validUntil: d(-28), currency: 'USD', fxRate: 16_390,
    logisticsAllowance: 30_000_000, incoterm: 'FOB', destination: 'Sydney',
    salesPerson: 'Bagas Prasetyo', probabilityPercent: 0, revision: 1,
    decidedAt: d(-34), lostReason: 'SPECIFICATION',
    note: 'They wanted a ten-year outdoor warranty on akasia. We would give five on teak and nothing on akasia, so it went elsewhere.',
    lines: [QL('pr_outdoor', 30, 1_090, 0.02, 60)],
  },
]

/* ==================================================================
   Deliveries — the container going the other way
   ================================================================== */

let dlSeq = 0
/** The order line is looked up rather than typed, so a delivery can never cite a line that is not on the order. */
const DL = (salesOrderId: string, productId: string, quantity: number, shortReason?: string): DeliveryLine => {
  const order = salesOrders.find((o) => o.id === salesOrderId)!
  const line = order.lines.find((l) => l.productId === productId)!
  return {
    id: `dl_${++dlSeq}`,
    salesOrderId,
    salesOrderLineId: line.id,
    productId,
    description: product(productId).name,
    orderedQuantity: line.quantity,
    quantity,
    shortQuantity: line.quantity - quantity,
    shortReason,
  }
}

let puSeq = 0
const PU = (mark: string, productId: string, quantity: number, cartons: number, lotIds: string[] = [], note?: string): PackedUnit => {
  const p = product(productId)
  return {
    id: `pu_${++puSeq}`,
    mark,
    productId,
    quantity,
    cartons,
    grossWeightKg: Math.round(p.netWeightKg * quantity * 1.12),
    cbm: Number((p.packedCbm * quantity).toFixed(2)),
    lotIds,
    note,
  }
}

const DOC = (
  type: Delivery['documents'][number]['type'],
  status: Delivery['documents'][number]['status'],
  reference?: string,
) => ({ id: `dvd_${type}_${Math.random().toString(36).slice(2, 7)}`, type, status, reference })

export const deliveries: Delivery[] = [
  {
    id: 'dv_0311', code: 'DO-2026-0311', suratJalanNo: 'SJ/2026/IX/0311',
    customerId: 'cus_informa', status: 'DELIVERED', mode: 'LOCAL_TRUCK', containerType: 'NONE',
    plannedDate: d(-9), dispatchedAt: d(-9), deliveredAt: d(-8), receivedBy: 'Suryanto — DC Cikarang',
    carrier: 'PT Lintas Jawa Logistik', vehicleOrVessel: 'H 9184 KZ', driver: 'Wahyudi',
    destination: 'Informa DC, Cikarang', freightCost: 6_400_000,
    lines: [DL('so_0028', 'pr_nightstand', 60)],
    units: [PU('WNK/INF/0311/1-30', 'pr_nightstand', 60, 30, ['lot_oak_b'])],
    documents: [DOC('DELIVERY_NOTE', 'VERIFIED', 'SJ/2026/IX/0311'), DOC('PACKING_LIST', 'VERIFIED')],
    note: 'First release against the Informa order. Signed clean.',
  },
  {
    id: 'dv_0318', code: 'DO-2026-0318', suratJalanNo: 'SJ/2026/IX/0318',
    customerId: 'cus_nordiska', status: 'LOADED', mode: 'EXPORT_FCL', containerType: 'FORTY_GP',
    containerNo: 'MSKU 7719420', sealNo: 'ID-SEG-448170',
    plannedDate: d(1), carrier: 'Maersk / PT Samudera Agencies', vehicleOrVessel: 'MV Maersk Cabo Verde',
    destination: 'Rotterdam', incoterm: 'FOB', freightCost: 0,
    lines: [DL('so_0033', 'pr_desk', 62, 'Twenty-eight desks are behind the FSC oak — the certified lot is still in chamber 2.')],
    units: [PU('WNK/NH/0318/1-62', 'pr_desk', 62, 62, ['lot_oak_b'], 'Sixty-two of ninety. The balance follows on the next sailing.')],
    documents: [
      DOC('DELIVERY_NOTE', 'VERIFIED', 'SJ/2026/IX/0318'),
      DOC('PACKING_LIST', 'VERIFIED'),
      DOC('COMMERCIAL_INVOICE', 'VERIFIED', 'INV-2026-0421'),
      DOC('PEB', 'SUBMITTED', 'BC30-2026-118842'),
      DOC('BL_AWB', 'REQUIRED'),
      DOC('COO_FORM', 'REQUIRED'),
      DOC('FUMIGATION', 'VERIFIED', 'ISPM15/JTG/2026/4471'),
      DOC('INSURANCE', 'NOT_APPLICABLE'),
    ],
    note: 'Booked as a forty-foot box for the whole ninety desks, which would have filled three-fifths of it. With twenty-eight still in the kiln it sails at two-fifths, for exactly the same freight — this load should have been consolidated with the Osaka enquiry rather than sent on its own.',
  },
  {
    id: 'dv_0319', code: 'DO-2026-0319', suratJalanNo: 'SJ/2026/IX/0319',
    customerId: 'cus_wovn', status: 'PACKED', mode: 'EXPORT_FCL', containerType: 'FORTY_HC',
    plannedDate: d(4), carrier: 'ONE / PT Jasa Kirim Semarang', destination: 'Melbourne', incoterm: 'FOB',
    freightCost: 0,
    lines: [DL('so_0035', 'pr_outdoor', 34, 'Six sets are still at the carver. At 1.94 m³ a set the fortieth would not have fitted in this box in any case.')],
    units: [PU('WNK/WG/0319/1-34', 'pr_outdoor', 34, 34, ['lot_teak_a'], 'Thirty-four sets fills the high cube to 87%. The last six sail separately.')],
    documents: [
      DOC('DELIVERY_NOTE', 'VERIFIED', 'SJ/2026/IX/0319'),
      DOC('PACKING_LIST', 'VERIFIED'),
      DOC('COMMERCIAL_INVOICE', 'SUBMITTED'),
      DOC('PEB', 'REQUIRED'),
      DOC('BL_AWB', 'REQUIRED'),
      DOC('COO_FORM', 'SUBMITTED', 'IACEPA Form AI, applied'),
      DOC('FUMIGATION', 'REQUIRED'),
      DOC('INSURANCE', 'NOT_APPLICABLE'),
    ],
    note: 'Australia refuses anything with untreated solid-wood packing at the border. The fumigation certificate is the gate, not a formality.',
  },
  {
    id: 'dv_0316', code: 'DO-2026-0316', suratJalanNo: 'SJ/2026/IX/0316',
    customerId: 'cus_vivere', status: 'PARTIALLY_ACCEPTED', mode: 'LOCAL_TRUCK', containerType: 'NONE',
    plannedDate: d(-5), dispatchedAt: d(-5), deliveredAt: d(-4), receivedBy: 'Rahmawati — Vivere Alam Sutera',
    carrier: 'PT Lintas Jawa Logistik', vehicleOrVessel: 'B 9702 SFU', driver: 'Kurniawan',
    destination: 'Vivere, Alam Sutera', freightCost: 4_100_000,
    lines: [DL('so_0021', 'pr_chair', 60)],
    units: [PU('WNK/VIV/0316/1-15', 'pr_chair', 60, 15, ['lot_mah_a'])],
    documents: [DOC('DELIVERY_NOTE', 'VERIFIED', 'SJ/2026/IX/0316'), DOC('PACKING_LIST', 'VERIFIED')],
    note: 'Four chairs marked scuffed on the note at the gate. That annotation is the only thing that makes the carrier claim collectable.',
  },
  {
    id: 'dv_0320', code: 'DO-2026-0320', suratJalanNo: 'SJ/2026/IX/0320',
    customerId: 'cus_alila', status: 'PLANNED', mode: 'DOMESTIC_LCL', containerType: 'TWENTY_GP',
    plannedDate: d(12), carrier: 'PT Meratus Line', destination: 'Benoa, Bali', freightCost: 21_800_000,
    lines: [
      DL('so_0031', 'pr_wardrobe', 40, 'First of three loads. The runners for the rest are still on the water.'),
      DL('so_0031', 'pr_nightstand', 60),
    ],
    units: [],
    documents: [DOC('DELIVERY_NOTE', 'REQUIRED'), DOC('PACKING_LIST', 'REQUIRED')],
    note: 'Ninety keys, three loads. The opening date does not move, so this one leaves whether or not the wardrobes are all finished.',
  },
  {
    id: 'dv_0305', code: 'DO-2026-0305', suratJalanNo: 'SJ/2026/VIII/0305',
    customerId: 'cus_nordiska', status: 'DELIVERED', mode: 'EXPORT_FCL', containerType: 'FORTY_HC',
    containerNo: 'HLXU 4418073', sealNo: 'ID-SEG-441088',
    plannedDate: d(-63), dispatchedAt: d(-62), deliveredAt: d(-31), receivedBy: 'Nordiska Hem, Rotterdam DC',
    carrier: 'Hapag-Lloyd', vehicleOrVessel: 'MV Vienna Express', destination: 'Rotterdam', incoterm: 'FOB',
    freightCost: 0,
    lines: [DL('so_0018', 'pr_desk', 60)],
    units: [PU('WNK/NH/0305/1-60', 'pr_desk', 60, 60, [])],
    documents: [
      DOC('DELIVERY_NOTE', 'VERIFIED'), DOC('PACKING_LIST', 'VERIFIED'),
      DOC('COMMERCIAL_INVOICE', 'VERIFIED', 'INV-2026-0396'), DOC('PEB', 'VERIFIED', 'BC30-2026-109914'),
      DOC('BL_AWB', 'VERIFIED', 'HLCUJKT2607ATRQ4'), DOC('COO_FORM', 'VERIFIED', 'EUR.1 replaced by REX'),
      DOC('FUMIGATION', 'VERIFIED'), DOC('INSURANCE', 'NOT_APPLICABLE'),
    ],
  },
  {
    id: 'dv_0308', code: 'DO-2026-0308', suratJalanNo: 'SJ/2026/VIII/0308',
    customerId: 'cus_informa', status: 'DELIVERED', mode: 'LOCAL_TRUCK', containerType: 'NONE',
    plannedDate: d(-44), dispatchedAt: d(-44), deliveredAt: d(-43), receivedBy: 'Suryanto — DC Cikarang',
    carrier: 'PT Lintas Jawa Logistik', vehicleOrVessel: 'H 9184 KZ', driver: 'Wahyudi',
    destination: 'Informa DC, Cikarang', freightCost: 7_900_000,
    lines: [DL('so_0025', 'pr_sideboard', 60)],
    units: [PU('WNK/INF/0308/1-60', 'pr_sideboard', 60, 60, [])],
    documents: [DOC('DELIVERY_NOTE', 'VERIFIED'), DOC('PACKING_LIST', 'VERIFIED')],
  },
]

/* ==================================================================
   Claims — what comes back
   ================================================================== */

export const claims: Claim[] = [
  {
    id: 'cl_0042', code: 'CLM-2026-0042', kind: 'TRANSIT_DAMAGE', status: 'INVESTIGATING',
    customerId: 'cus_vivere', salesOrderId: 'so_0021', deliveryId: 'dv_0316', productId: 'pr_chair',
    quantity: 4, raisedAt: d(-4), claimWindowDays: 7, reportedBy: 'Rahmawati — Vivere Alam Sutera',
    description: 'Four chairs scuffed through the finish on the front rail. Noted on the surat jalan at the gate before signing.',
    defectCode: 'SCRATCH_DENT', liability: 'CARRIER', remedy: 'REPAIR_ON_SITE',
    claimedAmount: 11_760_000, settledAmount: 2_840_000, recoveredAmount: 0,
    rootCause: 'Stacked without corner protectors on the top tier. The load plan called for them and the crew did not fit them.',
    owner: 'Nadia Kusumawardhani',
    note: 'They claimed the full sale value of four chairs; a finisher travelling to Alam Sutera costs Rp 2,84 juta, and that is what a repair actually settles at. The annotation on the delivery note is what makes even that collectable from Lintas Jawa.',
  },
  {
    id: 'cl_0041', code: 'CLM-2026-0041', kind: 'FINISH_DEFECT', status: 'IN_REWORK',
    customerId: 'cus_informa', salesOrderId: 'so_0025', deliveryId: 'dv_0308', productId: 'pr_sideboard',
    quantity: 7, raisedAt: d(-26), claimWindowDays: 30, reportedBy: 'QC Informa DC',
    description: 'Sheen drift across seven tops — noticeably flatter than the signed sample under their showroom lighting.',
    defectCode: 'SHEEN_UNEVEN', liability: 'OURS', remedy: 'RETURN_AND_REWORK',
    claimedAmount: 92_400_000, settledAmount: 18_480_000, recoveredAmount: 0,
    workOrderId: 'wo_4419',
    rootCause: 'Topcoat from a batch mixed at the end of a shift; the gloss meter reading was taken before the flash-off, not after.',
    correctiveAction: 'Gloss check moved to twenty minutes after flash-off, and the reading now goes on the QC record rather than a clipboard.',
    owner: 'Ir. Gunawan Setiadi',
    note: 'They kept them in the warehouse rather than putting them on the floor, which is the only reason this is a rework at Rp 2,64 juta a top and not a credit at Rp 13,2 juta.',
  },
  {
    id: 'cl_0039', code: 'CLM-2026-0039', kind: 'MANUFACTURING_DEFECT', status: 'CREDITED',
    customerId: 'cus_nordiska', salesOrderId: 'so_0018', deliveryId: 'dv_0305', productId: 'pr_desk',
    quantity: 3, raisedAt: d(-24), claimWindowDays: 30, reportedBy: 'Nordiska Hem QA',
    description: 'Three desks with a drawer front out of parallel by more than 2 mm across the opening.',
    defectCode: 'OUT_OF_SQUARE', liability: 'OURS', remedy: 'CREDIT_NOTE',
    claimedAmount: 34_020_000, settledAmount: 34_020_000, recoveredAmount: 0,
    rootCause: 'Carcass clamped before the glue had reached its open time on a humid afternoon.',
    correctiveAction: 'Clamp dwell raised from 25 to 40 minutes on the assembly routing where relative humidity is over 80%.',
    closedAt: d(-12), owner: 'Ir. Gunawan Setiadi',
    note: 'Credited rather than replaced — the freight back to Rotterdam was more than the desks.',
  },
  {
    id: 'cl_0043', code: 'CLM-2026-0043', kind: 'SHORT_SHIPMENT', status: 'LOGGED',
    customerId: 'cus_informa', salesOrderId: 'so_0028', deliveryId: 'dv_0311', productId: 'pr_nightstand',
    quantity: 2, raisedAt: d(-2), claimWindowDays: 7, reportedBy: 'Suryanto — DC Cikarang',
    description: 'Their count says fifty-eight against sixty on the packing list. Two cartons unaccounted for.',
    liability: 'UNDECIDED', remedy: 'PENDING',
    claimedAmount: 7_640_000, recoveredAmount: 0,
    owner: 'Nadia Kusumawardhani',
    note: 'Gate CCTV shows thirty cartons loaded. Either their count is wrong or two went astray at the DC — the tally sheet decides it.',
  },
  {
    id: 'cl_0038', code: 'CLM-2026-0038', kind: 'WARRANTY', status: 'CLOSED',
    customerId: 'cus_alila', productId: 'pr_wardrobe', quantity: 2,
    raisedAt: d(-58), claimWindowDays: 365, reportedBy: 'Alila Ubud engineering',
    description: 'Two soft-close runners failed inside four months in a wet-season villa block.',
    defectCode: 'HARDWARE_FUNCTION', liability: 'SUPPLIER', remedy: 'REPLACE',
    claimedAmount: 4_400_000, settledAmount: 4_400_000, recoveredAmount: 4_400_000,
    rootCause: 'A runner batch outside the salt-spray specification. Hettich accepted it against the batch number on the box.',
    correctiveAction: 'Batch numbers now recorded on the incoming QC record for every runner delivery, not just the first of a shipment.',
    closedAt: d(-31), owner: 'Ir. Gunawan Setiadi',
    note: 'Recovered in full from the supplier, and it went on their scorecard.',
  },
  {
    id: 'cl_0037', code: 'CLM-2026-0037', kind: 'SPECIFICATION_DISPUTE', status: 'REJECTED',
    customerId: 'cus_grandwhiz', productId: 'pr_bed', quantity: 12,
    raisedAt: d(-77), claimWindowDays: 14, reportedBy: 'Graha Whiz project office',
    description: 'They say the headboard fabric is the wrong grade. The signed sample says otherwise.',
    liability: 'CUSTOMER', remedy: 'NO_REMEDY',
    claimedAmount: 62_400_000, settledAmount: 0, recoveredAmount: 0,
    rootCause: 'Their specification changed after the sample was signed off and the change never reached us in writing.',
    closedAt: d(-52), owner: 'Nadia Kusumawardhani',
    note: 'Declined, and raised ninety-one days after delivery in any case — well outside a fourteen-day window.',
  },
]

/* ==================================================================
   Cash — the bank, and the money moving through it
   ================================================================== */

export const bankAccounts: BankAccount[] = [
  {
    id: 'bank_bni_idr', name: 'BNI — operasional', bank: 'Bank Negara Indonesia', accountNo: '0114-5528-91',
    currency: 'IDR', accountCode: '1120', openingBalance: 3_820_000_000, active: true,
    note: 'Payroll, local suppliers and everything domestic.',
  },
  {
    id: 'bank_bni_usd', name: 'BNI — valas USD', bank: 'Bank Negara Indonesia', accountNo: '0114-5528-USD',
    currency: 'USD', accountCode: '1130', openingBalance: 412_000_000, active: true,
    note: 'Import settlement and L/C margin. Revalued at the close, which is where the FX difference comes from.',
  },
  {
    id: 'bank_mandiri_eur', name: 'Mandiri — valas EUR', bank: 'Bank Mandiri', accountNo: '1370-0099-4412',
    currency: 'EUR', accountCode: '1140', openingBalance: 268_000_000, active: true,
  },
  {
    id: 'bank_cash', name: 'Kas kecil', bank: 'Petty cash — Terboyo', accountNo: '—',
    currency: 'IDR', accountCode: '1110', openingBalance: 48_000_000, active: true,
  },
]

let paSeq = 0
const PA = (amount: number, memo: string, extra: Partial<import('./types').PaymentAllocation> = {}) => ({
  id: `pal_${++paSeq}`, amount, memo, ...extra,
})

export const payments: Payment[] = [
  /* ---------- receipts ---------- */
  {
    id: 'pay_0221', code: 'RCP-2026-0221', direction: 'IN', status: 'CLEARED', method: 'BANK_TRANSFER',
    bankAccountId: 'bank_bni_idr', partyId: 'cus_alila', partyName: 'PT Alila Hospitality Indonesia',
    date: d(-42), currency: 'IDR', fxRate: 1, amount: 2_968_800_000,
    withholdingTax: 0, bankCharge: 15_000, fxDifference: 0, reference: 'TRF/BNI/2026/884120',
    isAdvance: true,
    allocations: [PA(2_968_800_000, 'Thirty per cent deposit on the Ubud Ridge order', { salesOrderId: 'so_0031' })],
    note: 'The deposit that released the walnut and the runner orders. Nothing on that project would have been bought without it.',
  },
  {
    id: 'pay_0229', code: 'RCP-2026-0229', direction: 'IN', status: 'CLEARED', method: 'BANK_TRANSFER',
    bankAccountId: 'bank_bni_idr', partyId: 'cus_informa', partyName: 'PT Home Center Indonesia (Informa)',
    date: d(-11), currency: 'IDR', fxRate: 1, amount: 879_120_000,
    withholdingTax: 0, bankCharge: 15_000, fxDifference: 0, reference: 'TRF/BCA/2026/117740',
    isAdvance: false,
    allocations: [PA(879_120_000, 'INV-2026-0402 in full', { invoiceId: 'inv_0402' })],
  },
  {
    id: 'pay_0233', code: 'RCP-2026-0233', direction: 'IN', status: 'CLEARED', method: 'LC_SETTLEMENT',
    bankAccountId: 'bank_mandiri_eur', partyId: 'cus_nordiska', partyName: 'Nordiska Hem AB',
    date: d(-9), currency: 'EUR', fxRate: 17_880, amount: 38_280,
    withholdingTax: 0, bankCharge: 4_120_000, fxDifference: -9_187_200, reference: 'LC/MDR/2026/EUR/0441',
    isAdvance: false,
    allocations: [PA(684_446_400, 'INV-2026-0396 settled against the L/C', { invoiceId: 'inv_0396' })],
    note: 'Invoiced at 17.640, settled at 17.880 — the euro moved our way by Rp 9,2 juta between the two.',
  },
  {
    id: 'pay_0235', code: 'RCP-2026-0235', direction: 'IN', status: 'CLEARED', method: 'BANK_TRANSFER',
    bankAccountId: 'bank_bni_idr', partyId: 'cus_vivere', partyName: 'PT Vivere Multi Kreasi',
    date: d(-21), currency: 'IDR', fxRate: 1, amount: 500_000_000,
    withholdingTax: 0, bankCharge: 15_000, fxDifference: 0, reference: 'TRF/BNI/2026/902118',
    isAdvance: false,
    allocations: [PA(500_000_000, 'Part payment against INV-2026-0409', { invoiceId: 'inv_0409' })],
    note: 'Rp 382 juta still outstanding on this one, and it went past due three weeks ago.',
  },
  {
    id: 'pay_0237', code: 'RCP-2026-0237', direction: 'IN', status: 'CLEARED', method: 'BANK_TRANSFER',
    bankAccountId: 'bank_bni_usd', partyId: 'cus_wovn', partyName: 'Wovn Group Pty Ltd',
    date: d(-33), currency: 'USD', fxRate: 16_480, amount: 5_720,
    withholdingTax: 0, bankCharge: 1_240_000, fxDifference: 0, reference: 'TT/BNI/2026/USD/4471',
    isAdvance: true,
    allocations: [PA(94_240_000, 'Twenty per cent deposit, Melbourne outdoor programme', { salesOrderId: 'so_0035' })],
  },
  {
    id: 'pay_0239', code: 'RCP-2026-0239', direction: 'IN', status: 'BOUNCED', method: 'CHEQUE',
    bankAccountId: 'bank_bni_idr', partyId: 'cus_grandwhiz', partyName: 'PT Graha Whiz Perkasa',
    date: d(-16), currency: 'IDR', fxRate: 1, amount: 300_000_000,
    withholdingTax: 0, bankCharge: 250_000, fxDifference: 0, reference: 'GIRO BNI 004417 — returned, insufficient funds',
    isAdvance: false,
    allocations: [PA(300_000_000, 'Was against INV-2026-0388', { invoiceId: 'inv_0388' })],
    note: 'Returned unpaid. The invoice went straight back to overdue and the new quotation was withdrawn the same week.',
  },
  {
    id: 'pay_0241', code: 'RCP-2026-0241', direction: 'IN', status: 'CLEARED', method: 'BANK_TRANSFER',
    bankAccountId: 'bank_bni_idr', partyId: 'cus_dekoruma', partyName: 'PT Dekoruma Inovasi Lestari',
    date: d(-3), currency: 'IDR', fxRate: 1, amount: 120_000_000,
    withholdingTax: 0, bankCharge: 15_000, fxDifference: 0, reference: 'TRF/BCA/2026/119042',
    isAdvance: true,
    allocations: [],
    note: 'Arrived with no invoice reference and no order it obviously belongs to. Unapplied until somebody works out what it is for.',
  },

  /* ---------- payments out ---------- */
  {
    id: 'pay_0244', code: 'PAY-2026-0244', direction: 'OUT', status: 'CLEARED', method: 'BANK_TRANSFER',
    bankAccountId: 'bank_mandiri_eur', partyId: 'sup_hettich', partyName: 'Hettich Marketing und Vertriebs GmbH',
    date: d(-27), currency: 'EUR', fxRate: 17_760, amount: 14_516,
    withholdingTax: 0, bankCharge: 3_800_000, fxDifference: 0, reference: 'TT/MDR/2026/EUR/1180',
    isAdvance: false, approvedBy: 'Rizky Pratama',
    allocations: [PA(257_804_160, 'BILL-2026-2231 in full', { invoiceId: 'bil_2231' })],
  },
  {
    id: 'pay_0246', code: 'PAY-2026-0246', direction: 'OUT', status: 'CLEARED', method: 'BANK_TRANSFER',
    bankAccountId: 'bank_mandiri_eur', partyId: 'sup_sayerlack', partyName: 'Sayerlack — Sherwin-Williams Italy S.r.l.',
    date: d(-40), currency: 'EUR', fxRate: 17_840, amount: 27_990,
    withholdingTax: 0, bankCharge: 3_800_000, fxDifference: 0, reference: 'TT/MDR/2026/EUR/1144',
    isAdvance: true, approvedBy: 'Rizky Pratama',
    allocations: [PA(499_341_600, 'BILL-2026-2262, paid in advance of shipment', { invoiceId: 'bil_2262' })],
    note: 'Paid before the goods left Genoa. They are now in a red lane accruing demurrage, with the money already gone.',
  },
  {
    id: 'pay_0249', code: 'PAY-2026-0249', direction: 'OUT', status: 'CLEARED', method: 'BANK_TRANSFER',
    bankAccountId: 'bank_bni_idr', partyId: 'sup_ukirjaya', partyName: 'UD Ukir Jaya (makloon ukir)',
    date: d(-52), currency: 'IDR', fxRate: 1, amount: 18_480_000,
    withholdingTax: 369_600, bankCharge: 6_500, fxDifference: 0, reference: 'TRF/BNI/2026/887201',
    isAdvance: false, approvedBy: 'Sri Handayani',
    allocations: [PA(18_480_000, 'Carving service, batch 0 — SC-2026-0074', { purchaseOrderId: 'po_0194' })],
    note: 'PPh 23 at 2% kept back. It is a prepayment they reclaim, not a discount we won.',
  },
  {
    id: 'pay_0252', code: 'PAY-2026-0252', direction: 'OUT', status: 'PENDING_APPROVAL', method: 'BANK_TRANSFER',
    bankAccountId: 'bank_bni_idr', partyId: 'sup_perhutani', partyName: 'Perum Perhutani KPH Randublatung',
    date: d(0), currency: 'IDR', fxRate: 1, amount: 454_400_000,
    withholdingTax: 0, bankCharge: 6_500, fxDifference: 0, reference: 'Draft — awaiting director release',
    isAdvance: false,
    allocations: [PA(454_400_000, 'BILL-2026-2251, sixteen cubic metres of jati', { invoiceId: 'bil_2251' })],
    note: 'Six days past its due date and still waiting on a signature. Perhutani do not release the next auction lot to anybody in arrears.',
  },
  {
    id: 'pay_0254', code: 'PAY-2026-0254', direction: 'OUT', status: 'CLEARED', method: 'BANK_TRANSFER',
    bankAccountId: 'bank_bni_idr', partyId: 'sup_kemasan', partyName: 'PT Kemasan Prima Nusantara',
    date: d(-6), currency: 'IDR', fxRate: 1, amount: 88_400_000,
    withholdingTax: 0, bankCharge: 6_500, fxDifference: 0, reference: 'TRF/BNI/2026/912004',
    isAdvance: false, approvedBy: 'Sri Handayani',
    allocations: [PA(88_400_000, 'Cartons, EPE and corner protectors — PO-2026-0196', { purchaseOrderId: 'po_0196' })],
  },
  {
    id: 'pay_0256', code: 'PAY-2026-0256', direction: 'OUT', status: 'CLEARED', method: 'BANK_TRANSFER',
    bankAccountId: 'bank_bni_idr', partyId: 'sup_jasa_forwarder', partyName: 'PT Prima Cargo Nusantara (PPJK)',
    date: d(-2), currency: 'IDR', fxRate: 1, amount: 128_600_000,
    withholdingTax: 2_572_000, bankCharge: 6_500, fxDifference: 0, reference: 'TRF/BNI/2026/918841',
    isAdvance: false, approvedBy: 'Sri Handayani',
    allocations: [PA(128_600_000, 'Clearance, trucking and the demurrage on IMP-2026-0058', {})],
    note: 'Rp 5,8 juta of this is demurrage. None of it is recoverable and none of it goes into the cost of the goods.',
  },
]
