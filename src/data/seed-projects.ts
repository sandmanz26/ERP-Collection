/**
 * The order book — fifteen projects spread from a brief that arrived last week
 * to a container that sailed two months ago.
 *
 * Each project carries the conversation that produced it: the rounds of
 * haggling, the drawings that went out and came back marked up, the samples
 * that were made and couriered, and the compliance set implied by where it is
 * going and what it is made of.
 */
import type {
  ComplianceItem, ComplianceKey, ComplianceStatus, Drawing, NegotiationRound, Project, ProjectItem,
  ProjectStage, Sample, WoodSpecies,
} from './types'
import { day, intBetween, pick, rng, round, stamp } from './clock'
import { buyers, items as itemMaster } from './seed-master'
import { requiredCompliance, stageIndex } from './reference'

/* ---------- line building ---------- */

interface LineSpec {
  ref: string
  name: string
  species: WoodSpecies
  finish: string
  qty: number
  l: number
  w: number
  h: number
  cbm: number
  packing: ProjectItem['packingType']
  target: number
  agreed: number
}

const line = (i: number, s: LineSpec, produced: number, packed: number): ProjectItem => ({
  id: `pi_${s.ref.toLowerCase()}_${i}`,
  lineNo: i + 1,
  itemRef: s.ref,
  name: s.name,
  species: s.species,
  finish: s.finish,
  qty: s.qty,
  uom: 'PCS',
  lengthMm: s.l,
  widthMm: s.w,
  heightMm: s.h,
  cbmPerUnit: s.cbm,
  packingType: s.packing,
  targetUnitPrice: s.target,
  agreedUnitPrice: s.agreed,
  producedQty: produced,
  packedQty: packed,
})

/* A catalogue of the pieces the factory actually makes, so an order is
   assembled from real models rather than invented ones. */
const MODELS: Record<string, Omit<LineSpec, 'qty' | 'target' | 'agreed'>> = {
  'DIN-TBL-200': { ref: 'DIN-TBL-200', name: 'Rengging dining table 2000×1000', species: 'TEAK', finish: 'Natural teak, 20% matt', l: 2000, w: 1000, h: 760, cbm: 0.62, packing: 'KNOCK_DOWN' },
  'DIN-TBL-180': { ref: 'DIN-TBL-180', name: 'Rengging dining table 1800×900', species: 'TEAK', finish: 'Walnut stain, 20% matt', l: 1800, w: 900, h: 760, cbm: 0.52, packing: 'KNOCK_DOWN' },
  'DIN-CHR-STD': { ref: 'DIN-CHR-STD', name: 'Rengging dining chair, upholstered seat', species: 'TEAK', finish: 'Natural teak + linen seat', l: 460, w: 520, h: 880, cbm: 0.14, packing: 'CARTON' },
  'SIDE-6DR': { ref: 'SIDE-6DR', name: 'Pecangaan sideboard, six drawer', species: 'MAHOGANY', finish: 'Walnut stain, closed pore', l: 1800, w: 450, h: 800, cbm: 0.78, packing: 'ASSEMBLED' },
  'LNG-BCL': { ref: 'LNG-BCL', name: 'Bangsri lounge chair, bouclé', species: 'ACACIA', finish: 'Oiled, bouclé upholstery', l: 780, w: 820, h: 720, cbm: 0.31, packing: 'CARTON' },
  'GRD-BNC-160': { ref: 'GRD-BNC-160', name: 'Tahunan garden bench 1600mm', species: 'TEAK', finish: 'Danish oil, exterior', l: 1600, w: 620, h: 880, cbm: 0.35, packing: 'KNOCK_DOWN' },
  'SLB-TBL-240': { ref: 'SLB-TBL-240', name: 'Suar slab table 2400×900, live edge', species: 'SUAR', finish: 'Natural, hard wax oil', l: 2400, w: 900, h: 760, cbm: 0.96, packing: 'CRATE' },
  'BED-KING': { ref: 'BED-KING', name: 'Mulyoharjo bed frame, king', species: 'TEAK', finish: 'Natural teak, carved headboard', l: 2100, w: 1900, h: 1200, cbm: 0.54, packing: 'KNOCK_DOWN' },
  'CAB-TV-180': { ref: 'CAB-TV-180', name: 'Kedungleper TV cabinet 1800mm', species: 'MINDI', finish: 'White lacquer, oak top', l: 1800, w: 420, h: 520, cbm: 0.46, packing: 'ASSEMBLED' },
  'CST-CONSOLE': { ref: 'CST-CONSOLE', name: 'Custom console, brass inlay', species: 'TEAK', finish: 'Fumed teak, aged brass', l: 1400, w: 380, h: 820, cbm: 0.38, packing: 'CRATE' },
  'HOT-DESK': { ref: 'HOT-DESK', name: 'Contract writing desk 1200mm', species: 'MAHOGANY', finish: 'Dark walnut, leather inlay', l: 1200, w: 600, h: 750, cbm: 0.33, packing: 'ASSEMBLED' },
  'HOT-WRD-2D': { ref: 'HOT-WRD-2D', name: 'Contract wardrobe, two door', species: 'MINDI', finish: 'Satin white', l: 1000, w: 600, h: 2000, cbm: 1.24, packing: 'KNOCK_DOWN' },
}

/* ---------- the conversation ---------- */

const PRICE_TALK = [
  'Buyer opened at their landed target working back from a shelf price, which leaves us under cost on the chair.',
  'We held the table price and moved on the chair by absorbing the seat fabric into the carcase cost.',
  'Buyer pushed for a five per cent reduction across the range against a repeat order next season.',
  'Countered at three per cent on the understanding the order quantity rises to a full high-cube.',
  'Timber moved eleven per cent since the last quotation; the increase was shown line by line and accepted.',
  'Agreed to hold the price for ninety days provided the deposit lands within a fortnight.',
]
const SPEC_TALK = [
  'Buyer asked for a 40mm top instead of 30mm; the extra timber is 6% on the piece and was quoted separately.',
  'Finish changed from lacquer to hard wax oil after the first sample photographed too yellow.',
  'Requested a mortise-and-tenon frame rather than dowelled, which adds a bench hour per chair.',
  'Drawer bottoms moved from 6mm ply to 9mm after the buyer’s own drop test.',
  'Buyer accepted our alternative to a solid back panel; the veneered panel saves 4% and passes their standard.',
]
const LEAD_TALK = [
  'Buyer wanted eight weeks; the kiln alone takes three on this species. Offered eleven and explained why.',
  'Delivery window moved forward two weeks to catch their catalogue drop; overtime priced in.',
  'Agreed a split shipment: the first container against the original date, the balance four weeks later.',
]
const TERMS_TALK = [
  'Buyer proposed open account at 60 days. Countered with 30/70 against B/L copy, which they took.',
  'L/C wording checked before issue — the description had to match the invoice exactly or the bank would refuse it.',
  'Deposit raised from 20% to 30% because the timber for this range has to be bought outright.',
]
const PACK_TALK = [
  'Knock-down agreed for the tables, which takes the container count from three to two.',
  'Buyer supplies their own carton artwork; plates paid for once and amortised over the season.',
  'Crating agreed for the slab tops after a corner arrived crushed on the last shipment.',
]
const CERT_TALK = [
  'Buyer will not accept an FSC Mixed claim and wants FSC 100%; our current certificate cannot carry that.',
  'EUDR evidence pack agreed: plot geolocation from the sawmill, supplier declarations and our own risk assessment.',
  'Confirmed the crating timber is heat treated and stamped, with the treatment record filed against the container.',
]
const QTY_TALK = [
  'Quantity cut by a fifth after their own forecast came down; the price was re-cut against the smaller run.',
  'Buyer added a second model to fill the container rather than pay for the air.',
]

const TALK: Record<NegotiationRound['subject'], string[]> = {
  PRICE: PRICE_TALK, SPECIFICATION: SPEC_TALK, LEAD_TIME: LEAD_TALK,
  PAYMENT_TERMS: TERMS_TALK, PACKING: PACK_TALK, CERTIFICATION: CERT_TALK, QUANTITY: QTY_TALK,
}

function buildNegotiations(seed: number, count: number, startDay: number, contractValue: number, resolved: boolean): NegotiationRound[] {
  const r = rng(seed)
  const subjects: NegotiationRound['subject'][] = ['PRICE', 'SPECIFICATION', 'LEAD_TIME', 'PACKING', 'PAYMENT_TERMS', 'CERTIFICATION', 'QUANTITY']
  const out: NegotiationRound[] = []
  let cursor = startDay
  for (let i = 0; i < count; i++) {
    const subject = i === 0 ? 'PRICE' : pick(r, subjects)
    const fromBuyer = i % 2 === 0
    const gap = 1 - (i + 1) * 0.018
    cursor += intBetween(r, 2, 6)
    const last = i === count - 1
    out.push({
      id: `neg_${seed}_${i}`,
      round: i + 1,
      at: stamp(cursor, 10 + (i % 6)),
      from: fromBuyer ? 'BUYER' : 'US',
      subject,
      buyerValue: subject === 'PRICE' ? round(contractValue * gap * 0.94, 0) : undefined,
      ourValue: subject === 'PRICE' ? round(contractValue * gap, 0) : undefined,
      summary: pick(r, TALK[subject]),
      outcome: last ? (resolved ? 'ACCEPTED' : 'OPEN') : fromBuyer ? 'COUNTERED' : 'COUNTERED',
      byName: fromBuyer ? 'Buyer' : pick(r, ['Sari Wulandari', 'Dimas Prasetyo']),
    })
  }
  return out
}

function buildDrawings(seed: number, lines: ProjectItem[], stage: ProjectStage, startDay: number): Drawing[] {
  const r = rng(seed + 77)
  const idx = stageIndex(stage)
  return lines.slice(0, 3).map((l, i) => {
    const sentAt = startDay + 4 + i * 3
    const revisions = intBetween(r, 0, 2)
    const revision = String.fromCharCode(65 + revisions)
    let status: Drawing['status'] = 'SENT'
    let approvedAt: string | undefined
    let respondedAt: string | undefined
    if (idx >= stageIndex('ORDER_CONFIRMED')) {
      status = 'APPROVED'
      respondedAt = stamp(sentAt + intBetween(r, 2, 6), 11)
      approvedAt = respondedAt
    } else if (idx >= stageIndex('SAMPLING')) {
      status = revisions > 0 && i === 0 ? 'REVISION_REQUESTED' : 'APPROVED'
      respondedAt = stamp(sentAt + intBetween(r, 3, 9), 14)
      if (status === 'APPROVED') approvedAt = respondedAt
    }
    return {
      id: `drw_${seed}_${i}`,
      code: `DWG-${l.itemRef}-${String(i + 1).padStart(2, '0')}`,
      title: `${l.name} — general arrangement`,
      revision,
      itemRef: l.itemRef,
      status,
      sentAt: stamp(sentAt, 9),
      respondedAt,
      approvedAt,
      fileName: `${l.itemRef}_rev${revision}.pdf`,
      lengthMm: l.lengthMm,
      widthMm: l.widthMm,
      heightMm: l.heightMm,
      note:
        status === 'REVISION_REQUESTED'
          ? 'Buyer marked up the apron height and asked for the leg taper to start 120mm lower.'
          : undefined,
    }
  })
}

const SAMPLE_FEEDBACK = [
  'Colour approved. Sheen a touch high — hold at 20% matt for production.',
  'Approved as made. Keep this sample as the golden reference for the whole order.',
  'Seat height 20mm too low against the drawing. Remake before we sign anything off.',
  'Grain match on the top is inconsistent; the buyer wants boards sorted before glue-up.',
  'Approved subject to the handle changing to the aged brass shown in the second photograph.',
]

function buildSamples(seed: number, lines: ProjectItem[], stage: ProjectStage, startDay: number): Sample[] {
  const idx = stageIndex(stage)
  if (idx < stageIndex('SAMPLING')) return []
  const r = rng(seed + 131)
  const count = Math.min(lines.length, intBetween(r, 1, 2))
  const out: Sample[] = []
  for (let i = 0; i < count; i++) {
    const l = lines[i]
    const requested = startDay + 10 + i * 4
    const rounds = idx >= stageIndex('ORDER_CONFIRMED') ? intBetween(r, 1, 2) : 1
    for (let round1 = 1; round1 <= rounds; round1++) {
      const sentAt = requested + round1 * 12
      const finalRound = round1 === rounds
      let status: Sample['status'] = 'SENT'
      if (idx >= stageIndex('ORDER_CONFIRMED')) status = finalRound ? 'APPROVED' : 'REVISION_REQUESTED'
      else if (idx >= stageIndex('QUOTED')) status = 'SENT'
      out.push({
        id: `smp_${seed}_${i}_${round1}`,
        code: `SMP-${l.itemRef}-R${round1}`,
        itemRef: l.itemRef,
        status,
        requestedAt: stamp(requested, 9),
        costIdr: round(l.cbmPerUnit * 9_400_000 + 1_850_000, -3),
        chargedToBuyer: round1 > 1,
        courier: 'DHL Express',
        awb: `4${seed}${i}${round1}0 7712`,
        sentAt: stamp(sentAt, 16),
        decidedAt: status === 'SENT' ? undefined : stamp(sentAt + intBetween(r, 3, 8), 13),
        round: round1,
        feedback: status === 'SENT' ? undefined : pick(r, SAMPLE_FEEDBACK),
      })
    }
  }
  return out
}

function buildCompliance(
  keys: ComplianceKey[], stage: ProjectStage, seed: number, targetShipDay: number,
): ComplianceItem[] {
  const r = rng(seed + 909)
  const idx = stageIndex(stage)
  return keys.map((key) => {
    let status: ComplianceStatus = 'REQUIRED'
    let obtainedAt: string | undefined
    let reference: string | undefined
    if (idx >= stageIndex('SHIPPED')) {
      status = 'SATISFIED'
      obtainedAt = stamp(targetShipDay - intBetween(r, 3, 10), 11)
      reference = `${key.slice(0, 3)}/${2026}/${intBetween(r, 1000, 9999)}`
    } else if (idx >= stageIndex('QC_PACKING')) {
      status = r() > 0.35 ? 'IN_PROGRESS' : 'SATISFIED'
      if (status === 'SATISFIED') {
        obtainedAt = stamp(-intBetween(r, 1, 8), 11)
        reference = `${key.slice(0, 3)}/${2026}/${intBetween(r, 1000, 9999)}`
      }
    } else if (idx >= stageIndex('PRODUCTION')) {
      status = r() > 0.7 ? 'IN_PROGRESS' : 'REQUIRED'
    }
    return { key, status, reference, obtainedAt }
  })
}

/* ---------- the projects ---------- */

interface ProjectSpec {
  code: string
  name: string
  buyerId: string
  stage: ProjectStage
  status: Project['status']
  priority: Project['priority']
  inquiryDay: number
  targetShipDay: number
  actualShipDay?: number
  lines: { model: string; qty: number; target: number; agreed: number }[]
  negotiationRounds: number
  depositDay?: number
  note?: string
  lossReason?: Project['lossReason']
  lossNote?: string
  competitor?: string
  salesOwnerId?: string
  productionOwner?: string
}

const SPECS: ProjectSpec[] = [
  {
    code: 'PRJ-26-0029', name: 'Harborline spring dining programme', buyerId: 'buy_02',
    stage: 'CLOSED', status: 'CLOSED', priority: 'NORMAL',
    inquiryDay: -230, targetShipDay: -96, actualShipDay: -94, depositDay: -186,
    lines: [
      { model: 'DIN-TBL-180', qty: 60, target: 620, agreed: 638 },
      { model: 'DIN-CHR-STD', qty: 360, target: 133, agreed: 137 },
    ],
    negotiationRounds: 5, salesOwnerId: 'usr_03',
    note: 'Closed and paid. The margin came in three points under budget because the fabric arrived late and the seats were finished on overtime.',
  },
  {
    code: 'PRJ-26-0031', name: 'Nordwerk autumn living range', buyerId: 'buy_01',
    stage: 'SHIPPED', status: 'WON', priority: 'NORMAL',
    inquiryDay: -190, targetShipDay: -42, actualShipDay: -40, depositDay: -152,
    lines: [
      { model: 'SIDE-6DR', qty: 48, target: 735, agreed: 754 },
      { model: 'CAB-TV-180', qty: 60, target: 320, agreed: 328 },
    ],
    negotiationRounds: 6,
    note: 'Sailed. Balance invoiced against the B/L copy and due in eleven days.',
  },
  {
    code: 'PRJ-26-0033', name: 'Gulf Interiors hotel fit-out — Phase 2', buyerId: 'buy_12',
    stage: 'QUOTED', status: 'LOST', priority: 'NORMAL',
    inquiryDay: -168, targetShipDay: -30,
    lines: [
      { model: 'HOT-DESK', qty: 120, target: 350, agreed: 350 },
      { model: 'HOT-WRD-2D', qty: 120, target: 608, agreed: 608 },
    ],
    negotiationRounds: 4, salesOwnerId: 'usr_03',
    lossReason: 'PRICE', competitor: 'Vinh Phat Furniture (Vietnam)',
    lossNote: 'Lost on price by roughly nine per cent. The competitor quoted rubberwood against our mindi and the buyer accepted the substitution.',
  },
  {
    code: 'PRJ-26-0034', name: 'Harborline coastal collection', buyerId: 'buy_02',
    stage: 'PRODUCTION', status: 'WON', priority: 'HIGH',
    inquiryDay: -142, targetShipDay: 26, depositDay: -104,
    lines: [
      { model: 'DIN-TBL-200', qty: 72, target: 780, agreed: 801 },
      { model: 'DIN-CHR-STD', qty: 432, target: 137, agreed: 141 },
      { model: 'CAB-TV-180', qty: 40, target: 350, agreed: 360 },
    ],
    negotiationRounds: 7, salesOwnerId: 'usr_03',
    note: 'The biggest order on the floor. Under an L/C, so every document has to match the credit exactly.',
  },
  {
    code: 'PRJ-26-0036', name: 'Maison Cotier atelier series', buyerId: 'buy_03',
    stage: 'QC_PACKING', status: 'WON', priority: 'HIGH',
    inquiryDay: -128, targetShipDay: 9, depositDay: -96,
    lines: [
      { model: 'SLB-TBL-240', qty: 12, target: 828, agreed: 850 },
      { model: 'LNG-BCL', qty: 48, target: 198, agreed: 203 },
    ],
    negotiationRounds: 5,
    note: 'Slab tops crated individually after the last shipment arrived with a crushed corner.',
  },
  {
    code: 'PRJ-26-0038', name: 'Southern Cross outdoor season', buyerId: 'buy_04',
    stage: 'PROCUREMENT', status: 'WON', priority: 'CRITICAL',
    inquiryDay: -96, targetShipDay: 41, depositDay: -64,
    lines: [
      { model: 'GRD-BNC-160', qty: 180, target: 404, agreed: 414 },
      { model: 'DIN-TBL-180', qty: 36, target: 938, agreed: 962 },
    ],
    negotiationRounds: 4, salesOwnerId: 'usr_03',
    note: 'Lands inside the Australian brown marmorated stink bug season, so the container needs a fumigation certificate naming it.',
  },
  {
    code: 'PRJ-26-0039', name: 'Aurora Home flat-pack range', buyerId: 'buy_06',
    stage: 'PRODUCTION', status: 'WON', priority: 'NORMAL',
    inquiryDay: -88, targetShipDay: 33, depositDay: -58,
    lines: [
      { model: 'CAB-TV-180', qty: 150, target: 304, agreed: 311 },
      { model: 'BED-KING', qty: 60, target: 684, agreed: 700 },
    ],
    negotiationRounds: 6, salesOwnerId: 'usr_03',
    note: 'Everything flat-packed with the fittings bagged per carton. Their build test is the acceptance criterion.',
  },
  {
    code: 'PRJ-26-0040', name: 'Takumi Kagu precision line', buyerId: 'buy_05',
    stage: 'BUDGETING', status: 'WON', priority: 'NORMAL',
    inquiryDay: -74, targetShipDay: 62, depositDay: -38,
    lines: [
      { model: 'DIN-TBL-180', qty: 24, target: 96_000, agreed: 98_600 },
      { model: 'DIN-CHR-STD', qty: 96, target: 20_800, agreed: 21_300 },
    ],
    negotiationRounds: 8,
    note: 'Tolerances at ±1mm and moisture 8–10% on arrival. The budget carries a heavier QC allowance than anything else in the book.',
  },
  {
    code: 'PRJ-26-0041', name: 'Kensington & Rowe hotel programme', buyerId: 'buy_08',
    stage: 'ORDER_CONFIRMED', status: 'WON', priority: 'HIGH',
    inquiryDay: -62, targetShipDay: 78,
    lines: [
      { model: 'HOT-DESK', qty: 96, target: 276, agreed: 283 },
      { model: 'HOT-WRD-2D', qty: 96, target: 478, agreed: 491 },
      { model: 'LNG-BCL', qty: 64, target: 168, agreed: 172 },
    ],
    negotiationRounds: 6, salesOwnerId: 'usr_03',
    note: 'Tied to a hotel handover date. Deposit agreed but not yet received — nothing may be ordered against it until it lands.',
  },
  {
    code: 'PRJ-26-0042', name: 'Nordwerk spring 2027 preview', buyerId: 'buy_01',
    stage: 'PROCUREMENT', status: 'WON', priority: 'HIGH',
    inquiryDay: -55, targetShipDay: 88, depositDay: -24,
    lines: [
      { model: 'DIN-TBL-200', qty: 84, target: 688, agreed: 701 },
      { model: 'SIDE-6DR', qty: 54, target: 710, agreed: 725 },
      { model: 'DIN-CHR-STD', qty: 336, target: 121, agreed: 124 },
    ],
    negotiationRounds: 7,
    note: 'Sold as FSC certified. Every input on this order has to come from a certified supplier or the claim collapses.',
  },
  {
    code: 'PRJ-26-0043', name: 'Villa Moderna live-edge commission', buyerId: 'buy_11',
    stage: 'SAMPLING', status: 'OPEN', priority: 'NORMAL',
    inquiryDay: -38, targetShipDay: 112,
    lines: [
      { model: 'SLB-TBL-240', qty: 8, target: 855, agreed: 855 },
      { model: 'CST-CONSOLE', qty: 10, target: 505, agreed: 505 },
    ],
    negotiationRounds: 3,
    note: 'Slabs graded by photograph before anything is cut. Suar takes twelve weeks in the kiln, which is most of the lead time.',
  },
  {
    code: 'PRJ-26-0044', name: 'Fjordhus certified range trial', buyerId: 'buy_09',
    stage: 'NEGOTIATION', status: 'OPEN', priority: 'HIGH',
    inquiryDay: -26, targetShipDay: 140,
    lines: [
      { model: 'DIN-TBL-180', qty: 40, target: 582, agreed: 582 },
      { model: 'DIN-CHR-STD', qty: 240, target: 126, agreed: 126 },
    ],
    negotiationRounds: 4,
    note: 'They will only buy against an FSC 100% claim. Our certificate is Mixed and expires in seven weeks, so this order is blocked on our own paperwork.',
  },
  {
    code: 'PRJ-26-0045', name: 'Pacific Rim replenishment Q1', buyerId: 'buy_10',
    stage: 'QUOTED', status: 'OPEN', priority: 'NORMAL',
    inquiryDay: -21, targetShipDay: 96,
    lines: [
      { model: 'GRD-BNC-160', qty: 72, target: 414, agreed: 414 },
      { model: 'LNG-BCL', qty: 40, target: 326, agreed: 326 },
    ],
    negotiationRounds: 2, salesOwnerId: 'usr_03',
    note: 'Quotation valid for thirty days. No response in eleven days.',
  },
  {
    code: 'PRJ-26-0046', name: 'Casa Verde summer terrace', buyerId: 'buy_07',
    stage: 'INQUIRY', status: 'OPEN', priority: 'LOW',
    inquiryDay: -12, targetShipDay: 150,
    lines: [{ model: 'GRD-BNC-160', qty: 120, target: 251, agreed: 251 }],
    negotiationRounds: 1,
    note: 'Buyer is over their credit limit and forty days past due. Nothing goes further than an indicative price until finance clears them.',
  },
  {
    code: 'PRJ-26-0047', name: 'Aurora Home bedroom extension', buyerId: 'buy_06',
    stage: 'INQUIRY', status: 'OPEN', priority: 'NORMAL',
    inquiryDay: -5, targetShipDay: 168,
    lines: [
      { model: 'BED-KING', qty: 80, target: 700, agreed: 700 },
      { model: 'CAB-TV-180', qty: 80, target: 311, agreed: 311 },
    ],
    negotiationRounds: 1, salesOwnerId: 'usr_03',
    note: 'Arrived last week off the back of the flat-pack range selling through. Drawings not yet issued.',
  },
]

function buildProject(spec: ProjectSpec, seed: number): Project {
  const buyer = buyers.find((b) => b.id === spec.buyerId)!
  const idx = stageIndex(spec.stage)
  const r = rng(seed)

  const lines = spec.lines.map((l, i) => {
    const model = MODELS[l.model]
    const progress =
      idx >= stageIndex('SHIPPED') ? 1
        : idx >= stageIndex('QC_PACKING') ? 0.94
          : idx >= stageIndex('PRODUCTION') ? 0.38 + r() * 0.34
            : 0
    const produced = Math.round(l.qty * progress)
    const packed = idx >= stageIndex('QC_PACKING') ? Math.round(produced * (idx >= stageIndex('SHIPPED') ? 1 : 0.72)) : 0
    return line(i, { ...model, qty: l.qty, target: l.target, agreed: l.agreed }, produced, packed)
  })

  const contractValue = lines.reduce((a, l) => a + l.qty * l.agreedUnitPrice, 0)
  const hasWoodPacking = lines.some((l) => l.packingType === 'CRATE' || l.packingType === 'PALLET')
  const hasPanel = lines.some((l) => ['CAB-TV-180', 'HOT-WRD-2D', 'SIDE-6DR', 'HOT-DESK'].includes(l.itemRef))

  const keys = requiredCompliance({
    destinationCountry: buyer.countryCode,
    buyerRequiresFsc: buyer.requiresFsc,
    buyerRequiresLabTest: buyer.requiresLabTest,
    hasWoodPacking,
    hasPanel,
  })

  const term = buyer.paymentTerm
  const depositPct = term === 'TT_50_50' ? 50 : term === 'TT_30_70' ? 30 : term === 'TT_100_ADVANCE' ? 100 : 0
  const fx = { IDR: 1, USD: 16450, EUR: 17850, AUD: 10800, JPY: 111, GBP: 20900 }[buyer.currency]

  return {
    id: `prj_${spec.code.slice(-4)}`,
    code: spec.code,
    name: spec.name,
    buyerId: buyer.id,
    buyerName: buyer.tradingName,
    buyerCountry: buyer.countryCode,
    stage: spec.stage,
    status: spec.status,
    priority: spec.priority,
    currency: buyer.currency,
    incoterm: buyer.defaultIncoterm,
    paymentTerm: term,
    destinationPort: buyer.destinationPort,
    destinationCountry: buyer.countryCode,
    inquiryAt: stamp(spec.inquiryDay, 8, 30),
    quotedAt: idx >= stageIndex('QUOTED') ? stamp(spec.inquiryDay + 24, 15) : undefined,
    poNumber: idx >= stageIndex('ORDER_CONFIRMED') ? `${buyer.code.slice(-4)}-PO-${8100 + seed}` : undefined,
    poAt: idx >= stageIndex('ORDER_CONFIRMED') ? stamp(spec.inquiryDay + 34, 10) : undefined,
    targetShipAt: day(spec.targetShipDay),
    actualShipAt: spec.actualShipDay !== undefined ? day(spec.actualShipDay) : undefined,
    contractValue: round(contractValue, 0),
    depositPct,
    depositReceivedAt: spec.depositDay !== undefined ? day(spec.depositDay) : undefined,
    salesOwnerId: spec.salesOwnerId ?? buyer.ownerId,
    salesOwnerName: spec.salesOwnerId === 'usr_03' ? 'Dimas Prasetyo' : buyer.ownerName,
    productionOwnerName: spec.productionOwner ?? 'Tri Handoko',
    exchangeRate: fx,
    items: lines,
    negotiations: buildNegotiations(seed, spec.negotiationRounds, spec.inquiryDay, contractValue, idx >= stageIndex('ORDER_CONFIRMED')),
    drawings: idx >= stageIndex('NEGOTIATION') ? buildDrawings(seed, lines, spec.stage, spec.inquiryDay) : [],
    samples: buildSamples(seed, lines, spec.stage, spec.inquiryDay),
    compliance: buildCompliance(keys, spec.stage, seed, spec.targetShipDay),
    lossReason: spec.lossReason,
    lossNote: spec.lossNote,
    competitor: spec.competitor,
    note: spec.note,
    createdAt: stamp(spec.inquiryDay, 8, 30),
    updatedAt: stamp(-intBetween(r, 0, 6), 16),
  }
}

export const projects: Project[] = SPECS.map((s, i) => buildProject(s, 101 + i * 7))

export const projectById = (id?: string) => projects.find((p) => p.id === id)
export const projectCode = (id?: string) => projectById(id)?.code ?? '—'

/** Total volume of an order, which is what decides how many boxes it needs. */
export const projectCbm = (p: Project) => p.items.reduce((a, l) => a + l.qty * l.cbmPerUnit, 0)

export { itemMaster }
