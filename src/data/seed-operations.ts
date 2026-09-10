/**
 * The operations book — the three things that quietly decide whether a plan
 * survives the week.
 *
 * A requisition sitting on a desk is lead time being spent for nothing. A spray
 * booth in pieces is capacity the plan already promised away. And a pallet of
 * carved legs at a workshop in Jepara is our inventory, our risk and our
 * shortage — on somebody else's floor.
 */

import type { MaintenanceOrder, PurchaseRequisition, SubcontractOrder } from './types'
import { d } from './clock'
import { buildApprovals } from '@/lib/operations'

/* ==================================================================
   Purchase requisitions
   ================================================================== */

/** Signatures already given are stamped onto the ladder the value demands. */
const approvals = (value: number, decided: { level: number; at: string; by: string; comment?: string }[], rejected?: { level: number; at: string; by: string; comment: string }) =>
  buildApprovals(value).map((a) => {
    const yes = decided.find((x) => x.level === a.level)
    const no = rejected && rejected.level === a.level ? rejected : undefined
    if (no) return { ...a, decision: 'REJECTED' as const, decidedAt: no.at, approverName: no.by, comment: no.comment }
    if (yes) return { ...a, decision: 'APPROVED' as const, decidedAt: yes.at, approverName: yes.by, comment: yes.comment }
    return a
  })

export const requisitions: PurchaseRequisition[] = [
  {
    id: 'pr_0212', code: 'PR-2026-0212', status: 'PENDING_APPROVAL', origin: 'MRP',
    requestedBy: 'Dwi Agustina', department: 'PPIC', raisedAt: d(-4), neededBy: d(26),
    note: 'Four days on a desk against a fifty-two day lead time. Every day here comes straight off the Ubud opening date.',
    lines: [
      {
        id: 'prl_1', itemId: 'it_runner', description: 'Hettich Quadro V6 soft-close runner, 450 mm',
        quantity: 1_400, uom: 'pair', estimatedUnitCost: 214_000, currency: 'IDR', requiredDate: d(26),
        justification: 'Nothing covers 1,240 pairs. At 52 days total lead time an order placed today lands after the Ubud confirmed date.',
        suggestedSupplierId: 'sup_hettich',
      },
      {
        id: 'prl_2', itemId: 'it_hinge', description: 'DTC clip-on hinge 110°, soft close',
        quantity: 4_800, uom: 'pc', estimatedUnitCost: 27_400, currency: 'IDR', requiredDate: d(31),
        justification: 'Covered to day 24 by IMP-2026-0072; short 3,900 after that against the Vivere and Dekoruma orders.',
        suggestedSupplierId: 'sup_dtc',
      },
    ],
    approvals: approvals(1_400 * 214_000 + 4_800 * 27_400, [
      { level: 1, at: d(-4), by: 'Dwi Agustina', comment: 'Netting checked against the run of the same morning.' },
      { level: 2, at: d(-3), by: 'Sri Handayani' },
    ]),
  },
  {
    id: 'pr_0215', code: 'PR-2026-0215', status: 'PENDING_APPROVAL', origin: 'MAINTENANCE',
    requestedBy: 'Slamet Riyadi', department: 'MAINTENANCE', raisedAt: d(-2), neededBy: d(5),
    maintenanceOrderId: 'mo_0088',
    note: 'The booth is down until this lands, and finishing is the centre that decides the plan.',
    lines: [
      {
        id: 'prl_3', description: 'Membrane pump repair kit and regulator, Wagner GM 5000EAC',
        quantity: 2, uom: 'set', estimatedUnitCost: 18_400_000, currency: 'IDR', requiredDate: d(5),
        justification: 'Booth 2 is in pieces waiting on it. Six shifts of finishing capacity a week sit behind this part.',
        suggestedSupplierId: 'sup_jatimakmur',
      },
    ],
    approvals: approvals(2 * 18_400_000, [{ level: 1, at: d(-2), by: 'Dwi Agustina' }]),
  },
  {
    id: 'pr_0208', code: 'PR-2026-0208', status: 'APPROVED', origin: 'REORDER_POINT',
    requestedBy: 'Yulianto', department: 'WAREHOUSE', raisedAt: d(-9), neededBy: d(4),
    lines: [
      {
        id: 'prl_4', itemId: 'it_glue', description: 'PVAc D3 wood adhesive',
        quantity: 900, uom: 'kg', estimatedUnitCost: 34_500, currency: 'IDR', requiredDate: d(4),
        justification: 'Fell through its reorder point of 600 kg with 410 kg on hand and seven days of lead time.',
        suggestedSupplierId: 'sup_jatimakmur',
      },
      {
        id: 'prl_5', itemId: 'it_abrasive', description: 'Abrasive belt & sheet assortment, P120–P320',
        quantity: 180, uom: 'pack', estimatedUnitCost: 189_000, currency: 'IDR', requiredDate: d(4),
        justification: 'Below reorder point. Sanding runs three shifts on the Ubud programme.',
        suggestedSupplierId: 'sup_jatimakmur',
      },
    ],
    approvals: approvals(900 * 34_500 + 180 * 189_000, [{ level: 1, at: d(-8), by: 'Dwi Agustina' }]),
  },
  {
    id: 'pr_0203', code: 'PR-2026-0203', status: 'CONVERTED', origin: 'MRP',
    requestedBy: 'Dwi Agustina', department: 'PPIC', raisedAt: d(-24), neededBy: d(-2),
    lines: [
      {
        id: 'prl_6', itemId: 'it_teak32', description: 'Jati Perhutani, sawn 32 mm, grade A',
        quantity: 16, uom: 'm3', estimatedUnitCost: 28_400_000, currency: 'IDR', requiredDate: d(-2),
        justification: 'Prambanan dining programme. Perhutani release by auction lot, so the date is theirs, not ours.',
        suggestedSupplierId: 'sup_perhutani', purchaseOrderId: 'po_0181',
      },
    ],
    approvals: approvals(16 * 28_400_000, [
      { level: 1, at: d(-24), by: 'Dwi Agustina' },
      { level: 2, at: d(-23), by: 'Sri Handayani' },
      { level: 3, at: d(-22), by: 'Ratna Dewi Anggraini' },
    ]),
  },
  {
    id: 'pr_0210', code: 'PR-2026-0210', status: 'REJECTED', origin: 'MANUAL',
    requestedBy: 'Bagas Prasetyo', department: 'SALES', raisedAt: d(-13), neededBy: d(9),
    rejectedReason: 'Sampling for a quote that was withdrawn on credit the same week. Nothing to sample for.',
    lines: [
      {
        id: 'prl_7', itemId: 'it_fabric', description: 'Woven polyester upholstery fabric, 340 gsm — sample range',
        quantity: 60, uom: 'm', estimatedUnitCost: 168_000, currency: 'IDR', requiredDate: d(9),
        justification: 'Sample panels for the Graha Whiz Bandung enquiry.',
        suggestedSupplierId: 'sup_jatimakmur',
      },
    ],
    approvals: approvals(60 * 168_000, [], { level: 1, at: d(-11), by: 'Dwi Agustina', comment: 'QT-2026-0093 was withdrawn on credit. Re-raise if it comes back.' }),
  },
  {
    id: 'pr_0216', code: 'PR-2026-0216', status: 'SUBMITTED', origin: 'WORK_ORDER',
    requestedBy: 'Ir. Gunawan Setiadi', department: 'PRODUCTION', raisedAt: d(0), neededBy: d(8),
    workOrderId: 'wo_4419',
    lines: [
      {
        id: 'prl_8', itemId: 'it_topcoat', description: 'Sayerlack PU topcoat, matt 20 gloss',
        quantity: 120, uom: 'L', estimatedUnitCost: 486_000, currency: 'IDR', requiredDate: d(8),
        justification: 'The rework order on the Informa sideboards needs a full re-coat, and the shipment covering it is in a red lane.',
        suggestedSupplierId: 'sup_sayerlack',
      },
    ],
    approvals: approvals(120 * 486_000, []),
  },
  {
    id: 'pr_0214', code: 'PR-2026-0214', status: 'DRAFT', origin: 'SAMPLE',
    requestedBy: 'Bagas Prasetyo', department: 'SALES', raisedAt: d(-1), neededBy: d(20),
    lines: [
      {
        id: 'prl_9', itemId: 'it_wbtop', description: 'Water-based topcoat, matt — for the Nordiska FSC sample',
        quantity: 40, uom: 'L', estimatedUnitCost: 512_000, currency: 'IDR', requiredDate: d(20),
        justification: 'Sample panels for QT-2026-0091. They will not price without seeing the water-based finish on certified oak.',
        suggestedSupplierId: 'sup_sayerlack',
      },
    ],
    approvals: approvals(40 * 512_000, []),
  },
]

/* ==================================================================
   Maintenance
   ================================================================== */

export const maintenanceOrders: MaintenanceOrder[] = [
  {
    id: 'mo_0088', code: 'MO-2026-0088', kind: 'BREAKDOWN', status: 'WAITING_PARTS',
    workCentreId: 'wc_fin', assetName: 'Spray booth 2 — Wagner GM 5000EAC', assetSerial: 'WGN-5000-118472',
    dueDate: d(-2), startedAt: d(-2), plannedDowntimeHours: 16, actualDowntimeHours: 48,
    technician: 'Slamet Riyadi',
    partsUsed: [{ id: 'mp_1', description: 'Membrane pump repair kit and regulator', quantity: 2, cost: 36_800_000 }],
    labourCost: 4_200_000, externalCost: 0,
    symptom: 'Pressure dropping mid-pass, leaving a light band down the middle of every panel.',
    rootCause: 'Membrane split. It had run 2,100 hours against a 1,500-hour service interval that was skipped twice.',
    requisitionId: 'pr_0215',
    note: 'Finishing is the constraint on this plant. Forty-eight hours of booth 2 is a week of the schedule.',
  },
  {
    id: 'mo_0091', code: 'MO-2026-0091', kind: 'PREVENTIVE', status: 'OVERDUE',
    workCentreId: 'wc_cnc', assetName: 'CNC nesting router — Biesse Rover A', assetSerial: 'BSS-RVA-2211',
    intervalDays: 90, lastDoneAt: d(-104), dueDate: d(-14), plannedDowntimeHours: 8,
    technician: 'Slamet Riyadi', partsUsed: [], labourCost: 2_400_000, externalCost: 6_800_000,
    note: 'Fourteen days over. Spindle bearing service and rack lubrication — the two things that turn into a breakdown if left.',
  },
  {
    id: 'mo_0093', code: 'MO-2026-0093', kind: 'CALIBRATION', status: 'DUE',
    workCentreId: 'wc_kiln', assetName: 'Kiln chamber 2 — moisture probes and wet-bulb sensors',
    intervalDays: 60, lastDoneAt: d(-57), dueDate: d(3), plannedDowntimeHours: 4,
    technician: 'Bambang Wijaya', partsUsed: [], labourCost: 1_600_000, externalCost: 3_400_000,
    note: 'Chamber 2 closed a batch at 13.4% against an 8–12% band. Either the timber was wet or the probe is lying, and this is how we find out which.',
  },
  {
    id: 'mo_0090', code: 'MO-2026-0090', kind: 'PREVENTIVE', status: 'SCHEDULED',
    workCentreId: 'wc_sand', assetName: 'Wide-belt sander — SCM Sandya 10', assetSerial: 'SCM-SDY-9041',
    intervalDays: 45, lastDoneAt: d(-31), dueDate: d(14), plannedDowntimeHours: 6,
    technician: 'Slamet Riyadi', partsUsed: [], labourCost: 1_800_000, externalCost: 0,
  },
  {
    id: 'mo_0094', code: 'MO-2026-0094', kind: 'SAFETY_INSPECTION', status: 'SCHEDULED',
    workCentreId: 'wc_rough', assetName: 'Dust extraction plant and cyclone', intervalDays: 180,
    lastDoneAt: d(-166), dueDate: d(14), plannedDowntimeHours: 5,
    technician: 'Depnaker-appointed inspector', partsUsed: [], labourCost: 0, externalCost: 12_500_000,
    note: 'Statutory. A lapsed certificate is an argument with the labour inspectorate, not an internal matter.',
  },
  {
    id: 'mo_0086', code: 'MO-2026-0086', kind: 'CORRECTIVE', status: 'IN_PROGRESS',
    workCentreId: 'wc_asm', assetName: 'Case clamp 3 — hydraulic', dueDate: d(0), startedAt: d(0),
    plannedDowntimeHours: 6, actualDowntimeHours: 6, technician: 'Slamet Riyadi',
    partsUsed: [{ id: 'mp_2', description: 'Hydraulic seal kit', quantity: 1, cost: 3_100_000 }],
    labourCost: 900_000, externalCost: 0,
    symptom: 'Clamp pressure bleeding off over a forty-minute dwell — exactly the dwell the humid-weather glue rule now demands.',
    note: 'Found through the corrective action on claim CLM-2026-0039. A quality finding turned into a maintenance job, which is how it should work.',
  },
  {
    id: 'mo_0079', code: 'MO-2026-0079', kind: 'PREVENTIVE', status: 'COMPLETED',
    workCentreId: 'wc_fin', assetName: 'Spray booth 1 — filters and airflow', intervalDays: 30,
    lastDoneAt: d(-33), dueDate: d(-33), completedAt: d(-33), plannedDowntimeHours: 4, actualDowntimeHours: 3,
    technician: 'Slamet Riyadi',
    partsUsed: [{ id: 'mp_3', description: 'Booth filter set', quantity: 1, cost: 2_800_000 }],
    labourCost: 700_000, externalCost: 0,
  },
  {
    id: 'mo_0082', code: 'MO-2026-0082', kind: 'PREVENTIVE', status: 'COMPLETED',
    workCentreId: 'wc_pack', assetName: 'Strapping and carton former', intervalDays: 120,
    lastDoneAt: d(-48), dueDate: d(-48), completedAt: d(-47), plannedDowntimeHours: 3, actualDowntimeHours: 4,
    technician: 'Slamet Riyadi', partsUsed: [], labourCost: 600_000, externalCost: 0,
  },
]

/* ==================================================================
   Subcontracting
   ================================================================== */

export const subcontractOrders: SubcontractOrder[] = [
  {
    id: 'sc_0081', code: 'SC-2026-0081', status: 'IN_PROGRESS', supplierId: 'sup_ukirjaya',
    workOrderId: 'wo_4410', operationNo: 40, productId: 'pr_outdoor',
    service: 'Hand carving, Segara apron and leg detail',
    quantity: 40, unitRate: 385_000, currency: 'IDR', withholdingRate: 0.02,
    issuedAt: d(-24), sentAt: d(-21), dueBack: d(-3),
    deliveryNoteNo: 'SJ-MKL/2026/IX/0081',
    materials: [
      {
        id: 'scm_1', productId: 'pr_outdoor', description: 'Segara table aprons and legs, machined and sanded to P180',
        sentQuantity: 40, uom: 'set', returnedQuantity: 28, lossQuantity: 1, unitValue: 2_840_000,
        lotIds: ['lot_teak_a'],
      },
    ],
    note: 'Three days past the date it was due back, and WO-2026-4410 is on hold behind it. Melbourne sails whether or not the last eleven arrive.',
  },
  {
    id: 'sc_0084', code: 'SC-2026-0084', status: 'MATERIAL_SENT', supplierId: 'sup_kacapratama',
    workOrderId: 'wo_4414', operationNo: 60, productId: 'pr_desk',
    service: 'Tempered glass cut, polish and drill to template',
    quantity: 60, unitRate: 268_000, currency: 'IDR', withholdingRate: 0.02,
    issuedAt: d(-6), sentAt: d(-4), dueBack: d(4),
    deliveryNoteNo: 'SJ-MKL/2026/IX/0084',
    materials: [
      {
        id: 'scm_2', itemId: 'it_glass6', description: 'Tempered clear glass, 6 mm, cut to size',
        sentQuantity: 74, uom: 'm2', returnedQuantity: 0, lossQuantity: 0, unitValue: 412_000,
        lotIds: ['lot_glass_a'],
      },
    ],
    note: 'Rp 30,5 juta of glass sitting at their premises. It is still our inventory, still our risk and still uninsured beyond the gate.',
  },
  {
    id: 'sc_0086', code: 'SC-2026-0086', status: 'ISSUED', supplierId: 'sup_ukirjaya',
    productId: 'pr_dining', service: 'Hand carving, Prambanan pedestal detail',
    quantity: 24, unitRate: 420_000, currency: 'IDR', withholdingRate: 0.02,
    issuedAt: d(-1), dueBack: d(21),
    materials: [
      {
        id: 'scm_3', itemId: 'it_teak32', description: 'Jati pedestal blanks, glued and squared',
        sentQuantity: 0, uom: 'pc', returnedQuantity: 0, lossQuantity: 0, unitValue: 1_940_000, lotIds: [],
      },
    ],
    note: 'Issued but nothing sent — the teak it is cut from is the same auction lot the Perhutani bill is holding up.',
  },
  {
    id: 'sc_0074', code: 'SC-2026-0074', status: 'CLOSED', supplierId: 'sup_ukirjaya',
    productId: 'pr_outdoor', service: 'Hand carving, Segara apron and leg detail — batch 0',
    quantity: 48, unitRate: 385_000, currency: 'IDR', withholdingRate: 0.02,
    issuedAt: d(-62), sentAt: d(-58), dueBack: d(-44), returnedAt: d(-46),
    deliveryNoteNo: 'SJ-MKL/2026/VII/0074', invoiceId: 'bil_2258',
    materials: [
      {
        id: 'scm_4', productId: 'pr_outdoor', description: 'Segara aprons and legs, batch 0',
        sentQuantity: 48, uom: 'set', returnedQuantity: 48, lossQuantity: 0, unitValue: 2_840_000, lotIds: [],
      },
    ],
    note: 'Back two days early with nothing lost. It is why they still get the work despite SC-2026-0081.',
  },
  {
    id: 'sc_0078', code: 'SC-2026-0078', status: 'CLOSED', supplierId: 'sup_foshanfab',
    productId: 'pr_sofa', service: 'Cut and sew, Nirmala three-seat covers',
    quantity: 30, unitRate: 1_120_000, currency: 'IDR', withholdingRate: 0.02,
    issuedAt: d(-88), sentAt: d(-84), dueBack: d(-64), returnedAt: d(-66),
    materials: [
      {
        id: 'scm_5', itemId: 'it_fabric', description: 'Woven polyester upholstery fabric, 340 gsm',
        sentQuantity: 420, uom: 'm', returnedQuantity: 402, lossQuantity: 18, unitValue: 168_000, lotIds: [],
      },
    ],
    note: 'Eighteen metres lost on a 420-metre issue — 4.3%, against a 2% tolerance. Their cutting plan, not our specification.',
  },
]
