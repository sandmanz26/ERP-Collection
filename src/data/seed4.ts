/**
 * Realistic document contents.
 *
 * Every governed document gets field values computed from the job itself, so the
 * figures reconcile the way a real set does: the packing list's gross weight is
 * the sum of what is actually in the containers, the B/L quotes the same weight,
 * the VGM adds the tare, and the invoice value matches the PEB. A document set
 * that does not tie out is exactly what a bank rejects, so a demo whose numbers
 * disagree teaches the wrong thing.
 */
import type { Container, Project, ShipmentDocument } from './types'
import { docFieldSpecs } from './reference'
import { containers, customers, documents, projects } from './seed'
import { stuffingJobs } from './seed3'
import { buyers, buyerForCountry } from './buyers'
import { CONTAINER_SPECS } from '@/lib/shipping'

/* ================================================================
   Make the trade parties realistic before anything reads them.

   The base seed consigned every job back to one of the shipper's own
   offices, and marked overseas offices as SHIPPER. Both are corrected
   here: a job is consigned to a real buyer in its destination country,
   and an office abroad is a consignee, not a shipper.
   ================================================================ */

for (const b of buyers) if (!customers.some((c) => c.id === b.id)) customers.push(b)

for (const c of customers) {
  if (buyers.some((b) => b.id === c.id)) continue
  for (const o of c.offices) {
    if (o.countryCode === 'ID') continue
    /* an office outside Indonesia on an Indonesian exporter's book receives
       cargo; it does not ship it */
    o.roles = ['CONSIGNEE', 'NOTIFY']
  }
}

for (const p of projects) {
  const b = buyerForCountry(p.destCountry)
  if (!b || p.type === 'CONSIGNMENT') continue
  /* a consignment stays with the customer's own showroom — title has not passed,
     so the goods really are still theirs at the destination */
  p.consigneeId = b.id
  p.consigneeOfficeId = b.offices[0].id
  p.notifyPartyId = b.id
}

/* A verified gross mass is weighed when the box is packed, not weeks earlier.
   The base seed picked a random past date; anchor it to the job's own VGM
   cut-off so the certificate reads against the deadline it was filed for. */
for (const c of containers) {
  if (!c.vgmSubmittedAt) continue
  const p = projects.find((x) => x.id === c.projectId)
  const deadline = p?.vgmCutoff ?? p?.gateInCutoff
  if (!deadline) continue
  const d = new Date(deadline)
  d.setDate(d.getDate() - ((c.containerNo?.charCodeAt(4) ?? 1) % 3) - 1)
  c.vgmSubmittedAt = d.toISOString()
}

let seed = 90210
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min

const n0 = (v: number) => v.toLocaleString('en-GB', { maximumFractionDigits: 0 })
const n2 = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money = (v: number, ccy: string) => `${ccy} ${n2(v)}`
const dtLong = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

/* ---------------------------------------------------------------- */

interface Facts {
  p: Project
  own: Container[]
  shipper: string
  shipperAddr: string
  shipperSigner: string
  consignee: string
  consigneeAddr: string
  notify: string
  packages: number
  packageUnits: string
  unitSingular: string
  netKg: number
  grossKg: number
  cbm: number
  unitCount: number
  equipment: string
  containerSeals: string
  containerList: string
  firstContainer?: Container
  marks: string
  hs: string
  hs8: string
  invoiceNo: string
  unitPrice: string
  fob: number
  vesselVoyage: string
  polPod: string
  blNo: string
  lcNo: string
  npwp: string
}

/* a deadline the carrier has not advised yet is stated as such — a blank in a
   cut-off line reads as "no deadline", which is the opposite of the truth */
const cutoffLine = (f: Facts) =>
  [
    ['SI', f.p.siCutoff],
    ['VGM', f.p.vgmCutoff],
    ['gate-in', f.p.gateInCutoff],
  ]
    .map(([k, v]) => `${k} ${dtLong(v as string | undefined) || 'not yet advised'}`)
    .join(' · ')

const partyLine = (customerId: string, officeId: string) => {
  const c = customers.find((x) => x.id === customerId)
  const o = c?.offices.find((x) => x.id === officeId) ?? c?.offices[0]
  const contact = o?.contacts.find((x) => x.isPrimary) ?? o?.contacts[0]
  return {
    name: c?.legalName ?? 'Unknown party',
    addr: o ? `${o.addressLine}, ${o.city}, ${o.country}` : '',
    tax: o?.customsId ?? c?.taxId ?? '',
    signer: contact ? `${contact.name}${contact.title ? `, ${contact.title}` : ''}` : 'Authorised signatory',
  }
}

function factsFor(p: Project): Facts {
  const own = containers.filter((c) => c.projectId === p.id)
  const items = own.flatMap((c) => c.items)
  const shipper = partyLine(p.shipperId, p.shipperOfficeId)
  const consignee = partyLine(p.consigneeId, p.consigneeOfficeId)
  const notify = p.notifyPartyId ? partyLine(p.notifyPartyId, p.consigneeOfficeId) : consignee

  const packages = items.reduce((a, i) => a + i.quantity, 0)
  const grossKg = items.reduce((a, i) => a + i.grossWeightKg * i.quantity, 0)
  const netKg = items.reduce((a, i) => a + i.netWeightKg * i.quantity, 0)
  const cbm = items.reduce((a, i) => a + ((i.lengthCm * i.widthCm * i.heightCm) / 1e6) * i.quantity, 0)
  const plural = (u: string) => (u.endsWith('s') ? u : u === 'box' ? 'boxes' : `${u}s`)
  const rawUnits = [...new Set(items.map((i) => i.packageUnit.toLowerCase()))]
  const units = rawUnits.map(plural).join(' / ') || 'packages'
  const unitSingular = rawUnits[0] ?? 'package'

  const equipmentGroups = own.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1
    return acc
  }, {})
  const equipment = Object.entries(equipmentGroups).map(([t, n]) => `${n} × ${t}`).join(', ') || 'to be confirmed'

  const withNo = own.filter((c) => c.containerNo)
  const containerSeals = withNo.length
    ? withNo.map((c) => `${c.containerNo} / seal ${c.sealNo ?? 'pending'}`).join('; ')
    : 'container and seal not yet allocated'
  const containerList = withNo.length ? withNo.map((c) => c.containerNo).join(', ') : 'pending allocation'

  /* the shipper's own document series — the packing list has to quote the
     same invoice number the invoice carries, or the bank rejects the set */
  const initials = shipper.name.replace(/^PT /, '').split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase()

  const hs = p.hsCodes[0] ?? items[0]?.hsCode ?? '9999.99'
  const value = p.cargoValue
  const perUnit = packages ? value / packages : value

  return {
    p, own,
    shipper: shipper.name, shipperAddr: shipper.addr, shipperSigner: shipper.signer,
    consignee: consignee.name, consigneeAddr: consignee.addr,
    notify: notify.name,
    packages, packageUnits: units, unitSingular,
    netKg: Math.round(netKg), grossKg: Math.round(grossKg), cbm: +cbm.toFixed(3),
    unitCount: own.length, equipment,
    containerSeals, containerList,
    firstContainer: withNo[0] ?? own[0],
    marks: `${p.code.replace('PRJ-', 'MFI/')}\nC/NO. 1-${packages || 1}\n${p.podName.toUpperCase()}\nMADE IN INDONESIA`,
    hs, hs8: `${hs}.00`,
    invoiceNo: `${initials}/INV/26/${p.jobNo.split('/').pop() ?? '0001'}`,
    unitPrice: `${money(perUnit, p.cargoCurrency)} per ${unitSingular} × ${n0(packages)} = ${money(value, p.cargoCurrency)}`,
    fob: value,
    vesselVoyage: p.vessel ? `${p.vessel} ${p.voyage ?? ''}`.trim() : 'to be nominated',
    polPod: `${p.polName} (${p.polCode}) → ${p.podName} (${p.podCode})`,
    blNo: p.houseBlNo ?? p.masterBlNo ?? `${p.code.replace('PRJ-', 'MFI/')}`,
    lcNo: `LC/${p.destCountry}/26/${p.jobNo.split('/').pop() ?? '0001'}`,
    npwp: shipper.tax || '01.884.552.3-092.000',
  }
}

/* ---------------------------------------------------------------- */
/* One entry per field key that appears in any document standard.     */

const FIELD: Record<string, (f: Facts, d: ShipmentDocument) => string> = {
  /* parties */
  shipper: (f) => `${f.shipper}\n${f.shipperAddr}`,
  consignee: (f) => `${f.consignee}\n${f.consigneeAddr}`,
  notifyParty: (f) =>
    f.notify === f.consignee ? 'SAME AS CONSIGNEE' : `${f.notify}\n${f.consigneeAddr}`,
  exporter: (f) => `${f.shipper}\n${f.shipperAddr}`,

  /* commercial invoice */
  invoiceNo: (f, d) => `${d.docNo ?? f.invoiceNo} dated ${dtLong(d.issuedAt ?? f.p.createdAt)}`,
  incoterm: (f) => `${f.p.incoterm} ${f.p.polName} (Incoterms® 2020)`,
  description: (f) => `${f.p.commodity}\nPacked in ${n0(f.packages)} ${f.packageUnits}`,
  hsCode: (f) => `${f.hs} — ${f.p.commodity.split(',')[0]}`,
  unitPrice: (f) => f.unitPrice,
  currency: (f) => `${f.p.cargoCurrency} — invoice, PEB and B/L all in ${f.p.cargoCurrency}`,
  paymentTerms: (f) =>
    f.p.paymentTerm === 'LC_AT_SIGHT'
      ? 'Irrevocable L/C at sight, confirmed'
      : f.p.paymentTerm.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
  originCountry: () => 'Indonesia',
  /* the invoice is signed by the exporter; a B/L is signed in a stated capacity */
  signature: (f, d) =>
    d.type === 'HOUSE_BL'
      ? 'Meridian Freight Indonesia — signed as agent for the carrier'
      : `Manually signed for and on behalf of ${f.shipper} — ${f.shipperSigner}`,

  /* packing list */
  invoiceRef: (f) => f.invoiceNo,
  marks: (f) => f.marks,
  packages: (f) => `${n0(f.packages)} ${f.packageUnits} in ${f.unitCount} container${f.unitCount === 1 ? '' : 's'}`,
  netWeight: (f) => `${n0(f.netKg)} KGS`,
  grossWeight: (f) => `${n0(f.grossKg)} KGS`,
  measurement: (f) => `${n2(f.cbm)} CBM`,
  containerSeal: (f) => f.containerSeals,

  /* shipping instruction */
  bookingNo: (f) => f.p.bookingNo ?? 'awaiting carrier confirmation',
  polPod: (f) => f.polPod,
  blType: (f) =>
    f.p.blType === 'SEAWAY'
      ? 'Seaway bill — no originals, release against identity at destination'
      : f.p.blType === 'TELEX_RELEASE'
        ? 'Original B/L, telex release requested once payment clears'
        : f.p.blType === 'EXPRESS'
          ? 'Express release — no document travels with the cargo'
          : 'Original B/L — 3/3 originals to be issued',
  freightTerm: (f) => `Freight ${f.p.freightTerm.toLowerCase()}`,
  cutoff: (f) =>
    cutoffLine(f),

  /* bills of lading */
  blNo: (f, d) => d.docNo ?? f.blNo,
  vesselVoyage: (f) => f.vesselVoyage,
  packagesWeight: (f) => `${n0(f.packages)} ${f.packageUnits} · ${n0(f.grossKg)} KGS · ${n2(f.cbm)} CBM`,
  freightClause: (f) => (f.p.freightTerm === 'PREPAID' ? 'FREIGHT PREPAID AS ARRANGED' : 'FREIGHT COLLECT'),
  shipperApproval: (f) => `Approved by ${f.shipper.replace(/^PT /, '')} — corrections closed`,
  originals: () => '3/3 originals issued, none surrendered at origin',
  onBoardDate: (f) => (f.p.atd ? `SHIPPED ON BOARD ${dtLong(f.p.atd)}` : 'pending loading confirmation'),
  placeOfIssue: (f) => `Jakarta, Indonesia — ${dtLong(f.p.atd ?? f.p.etd)}`,
  terms: () => 'Subject to ALFI Standard Trading Conditions; liability limited to SDR 2/kg or SDR 666.67/package',

  /* certificate of origin */
  form: (f) =>
    ({ CN: 'Form E (ACFTA)', KR: 'Form AK (AKFTA)', JP: 'Form JIEPA', SG: 'Form D (ATIGA)', MY: 'Form D (ATIGA)', VN: 'Form D (ATIGA)' } as Record<string, string>)[
      f.p.destCountry
    ] ?? 'Non-preferential COO (Kadin / Ministry of Trade)',
  certNo: (_f, d) => d.docNo ?? `SKA/26/${int(10000, 99999)}`,
  originCriterion: (f) => (f.hs.startsWith('09') || f.hs.startsWith('40') ? 'WO — wholly obtained in Indonesia' : 'RVC 40% — regional value content'),
  issuer: () => 'Ministry of Trade, Directorate of Export Facilitation — stamped and signed',

  /* PEB */
  pebNo: (f) => (f.p.pebNumber ? `${f.p.pebNumber} registered ${dtLong(f.p.pebDate)}` : 'not yet registered'),
  exporterNpwp: (f) => f.npwp,
  customsOffice: (f) =>
    ({ IDTPP: '040300 — KPU Bea Cukai Tanjung Priok', IDSUB: '050100 — KPPBC Tanjung Perak', IDBLW: '070100 — KPPBC Belawan', IDSRG: '060200 — KPPBC Tanjung Emas', IDMAK: '080100 — KPPBC Makassar' } as Record<string, string>)[
      f.p.polCode
    ] ?? '040300 — KPU Bea Cukai Tanjung Priok',
  fobValue: (f) => `${money(f.fob, f.p.cargoCurrency)} FOB · NDPBM IDR ${n0(f.p.fxRate)}/${f.p.cargoCurrency}`,
  supportingDocs: (f) =>
    `Commercial invoice, packing list, B/L uploaded to CEISA 4.0${f.p.cooForm ? `, ${f.p.cooForm}` : ''}`,
  lartas: (f) =>
    ['4407', '4403', '2601', '1511'].some((x) => f.hs.startsWith(x))
      ? 'SVLK timber legality certificate attached'
      : 'Not a restricted commodity',

  /* NPE */
  npeNo: (f) => (f.p.npeDate ? `NPE issued ${dtLong(f.p.npeDate)}` : 'awaiting customs response'),
  pebRef: (f) => f.p.pebNumber ?? 'PEB not yet registered',
  channel: (f) => (f.p.destCountry === 'DE' ? 'MERAH — physical inspection ordered' : 'HIJAU — released without inspection'),
  containerList: (f) => f.containerList,

  /* VGM */
  containerNo: (f) => f.firstContainer?.containerNo ?? 'not yet allocated',
  vgmKg: (f) => {
    const c = f.firstContainer
    if (!c?.vgmKg) return 'not yet weighed'
    const tare = c.tareKg ?? CONTAINER_SPECS[c.type]?.tareKg ?? 0
    return `${n0(c.vgmKg)} KGS (cargo ${n0(c.vgmKg - tare)} + tare ${n0(tare)})`
  },
  method: (f) => (f.firstContainer?.vgmMethod === 'SM1' ? 'Method 1 — weighbridge, sealed unit' : 'Method 2 — calculated from certified item weights'),
  weighDate: (f) => `${dtLong(f.firstContainer?.vgmSubmittedAt)} at ${f.p.polName}`,
  authorised: () => 'Tomas Weber, Warehouse Supervisor — authorised signatory under SOLAS VI/2',
  submittedBefore: (f) => `Submitted ${dtLong(f.firstContainer?.vgmSubmittedAt)}, cut-off ${dtLong(f.p.vgmCutoff)}`,

  /* fumigation & ISPM */
  treatment: (f) => (f.p.destCountry === 'AU' ? 'Methyl bromide + BMSB seasonal treatment' : 'Methyl bromide fumigation to ISPM-15'),
  dosage: () => '48 g/m³ for 24 hours at 21 °C, under sheet',
  treatmentDate: (f) => dtLong(f.firstContainer?.stuffingDate ?? f.p.etd),
  provider: () => 'PT Prima Fumigasi Indonesia — Karantina reg. no. 0421/KT/2024',
  treatmentMark: () => 'ID-0421 HT — heat treated, stencilled on every piece',
  woodType: () => 'Timber pallets and plywood crates; hardwood dunnage',
  producer: () => 'PT Prima Fumigasi Indonesia, registered producer ID-0421',
  declaration: () => 'The wood packaging material has been treated and marked in accordance with ISPM-15.',

  /* phytosanitary */
  botanicalName: (f) =>
    f.hs.startsWith('09') ? 'Coffea canephora (robusta green beans)'
      : f.hs.startsWith('40') ? 'Hevea brasiliensis (natural rubber)'
        : f.hs.startsWith('44') ? 'Tectona grandis (teak)'
          : 'Not a plant product',
  declaredQty: (f) => `${n0(f.packages)} ${f.packageUnits}, ${n0(f.netKg)} KGS net`,
  treatmentDetail: () => 'Fumigated with methyl bromide, 48 g/m³, 24 h at 21 °C',
  additionalDecl: (f) => `Consignment free from quarantine pests of ${f.p.podName}`,
  inspector: () => 'Balai Karantina Pertanian — inspector signature and stamp affixed',

  /* insurance */
  assured: (f) => (f.p.incoterm.startsWith('C') ? `${f.consignee} — assured under CIF terms` : `${f.shipper} — for account of whom it may concern`),
  insuredValue: (f) => `${money(f.fob * 1.1, f.p.cargoCurrency)} (110% of CIF value)`,
  clauses: () => 'Institute Cargo Clauses (A) 1/1/09, plus War and Strikes',
  coverage: (f) => `Warehouse to warehouse, ${f.p.polName} to ${f.p.placeOfDelivery ?? f.p.podName}`,
  claimsAgent: (f) => `Appointed surveyor at ${f.p.podName} — contact on the certificate face`,

  /* booking confirmation */
  equipment: (f) => f.equipment,
  cutoffs: (f) => cutoffLine(f),
  emptyPickup: (f) => {
    const s = stuffingJobs.find((x) => x.projectId === f.p.id)
    if (!s?.depot) return 'depot to be nominated'
    const rel = dtLong(s.emptyReleaseDate)
    return rel ? `${s.depot}, empty released ${rel}` : `${s.depot}, empty release not yet booked`
  },

  /* dangerous goods */
  unNumber: () => 'UN3481',
  imoClass: () => 'Class 9, packing group II',
  properName: () => 'LITHIUM ION BATTERIES CONTAINED IN EQUIPMENT',
  flashPoint: () => 'Not applicable — solid article',
  emergency: () => '+62 21 5099 1200 (24 h), Meridian Freight DG desk',
  revisionDate: () => 'Revision 4, dated 2025-11-18',

  /* export permit */
  permitNo: (f) => `${f.p.code.replace('PRJ', 'PE')}/DAGLU/2026`,
  quotaBalance: (f) => `${n0(f.netKg)} KGS drawn against a 500,000 KGS annual allocation`,
  validity: () => 'Valid 01 Jan 2026 – 31 Dec 2026',

  /* letter of credit */
  lcNo: (f) => f.lcNo,
  expiry: (f) => `${dtLong(f.p.eta)} at the counters of the negotiating bank`,
  latestShipment: (f) => dtLong(f.p.etd),
  presentation: () => '21 days after the on-board date, within L/C validity',
  docsRequired: () => 'Signed invoice ×3, packing list ×3, full set 3/3 originals B/L, COO, insurance certificate',
  partialTranship: () => 'Partial shipment not allowed; transhipment allowed',

  /* consignment */
  parties: (f) => `${f.shipper} (consignor) → ${f.consignee} (consignee)`,
  titleRetention: () => 'Title remains with the consignor until the goods are sold to an end buyer',
  settlementCycle: (f) => `${f.p.consignment?.settlementCycleDays ?? 30}-day cycle on units reported sold`,
  commission: (f) => `${f.p.consignment?.commissionPct ?? 12}% of net sales value`,
  unsoldReturn: (f) => `Unsold stock returned or marked down after ${f.p.consignment?.unsoldReturnDays ?? 120} days`,
  insurance: () => 'Consignee insures the stock at destination for its full replacement value',

  /* arrival & delivery */
  blRef: (f) => f.blNo,
  eta: (f) => `${dtLong(f.p.eta)} at ${f.p.podName}`,
  freeTime: (f) => `14 days from discharge, expiring ${dtLong(f.p.eta)}`,
  chargesDue: () => 'Destination THC, D/O fee and any demurrage payable before release',
  doNo: (f) => `DO/${f.p.podCode}/26/${int(1000, 9999)}, valid 7 days from issue`,
  blSurrender: () => 'Telex release received from origin; originals retained by the shipper',
  releaseTo: (f) => `${f.consignee}'s nominated haulier, vehicle plate recorded at the gate`,
  chargesSettled: () => 'All destination charges settled prior to release',
  receivedBy: (f) => `${f.consignee} — warehouse supervisor, signed and stamped`,
  deliveryDate: (f) => `${dtLong(f.p.ata ?? f.p.eta)}, 14:20 local time`,
  condition: () => 'Received in apparent good order and condition; seal intact on arrival',
  packagesReceived: (f) => `${n0(f.packages)} ${f.packageUnits} received against ${n0(f.packages)} on the packing list`,

  /* stuffing */
  stuffingDate: (f) => {
    const s = stuffingJobs.find((x) => x.projectId === f.p.id)
    return s ? `${dtLong(s.stuffingDate)} at ${s.locationName}` : dtLong(f.firstContainer?.stuffingDate)
  },
  tally: (f) => `${n0(f.packages)} ${f.packageUnits} counted in, matching the packing list`,
  supervisor: (f) => stuffingJobs.find((x) => x.projectId === f.p.id)?.supervisor ?? 'Tomas Weber',
  photos: () => 'Empty, part-loaded, full, doors closed and seal fitted — 12 photographs on file',

  /* sending doc */
  sentTo: (f) => `${f.consignee}\n${f.consigneeAddr}`,
  contents: () => 'Signed commercial invoice ×3, packing list ×3, 3/3 original B/L, COO, insurance certificate',
  courierAwb: () => `DHL AWB ${int(1000000000, 9999999999)}`,
  sentAt: (f) => dtLong(f.p.atd ?? f.p.etd),

  /* job sheet */
  jobNo: (f) => f.p.jobNo,
  revenue: (f) => money(f.p.quotedRevenue, 'IDR'),
  masterCost: (f) => money(f.p.quotedRevenue * 0.74, 'IDR'),
  fieldCost: (f) => money(f.p.quotedRevenue * 0.03, 'IDR'),
  reimbursement: (f) => money(f.p.quotedRevenue * 0.04, 'IDR'),
  margin: (f) => `${money(f.p.quotedRevenue * 0.19, 'IDR')} (19.0%)`,
  preparedBy: () => 'Rizky Pratama, Export Operator — checked by Marcus Bell',
}

/* ---------------------------------------------------------------- */

/**
 * Document numbers in the series their issuer would really use: the shipper's own
 * invoice series, the carrier's B/L series, the customs registration number.
 * A system-generated id on the face of a commercial invoice fools nobody.
 */
const docNumber = (type: ShipmentDocument['type'], f: Facts, seq: number): string | undefined => {
  const initials = f.shipper.replace(/^PT /, '').split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase()
  const yr = '26'
  const tail = f.p.jobNo.split('/').pop() ?? String(1000 + seq)
  switch (type) {
    case 'COMMERCIAL_INVOICE': return f.invoiceNo
    case 'PACKING_LIST': return `${initials}/PL/${yr}/${tail}`
    case 'SHIPPING_INSTRUCTION': return `MFI/SI/${yr}/${tail}`
    case 'DRAFT_BL':
    case 'MASTER_BL': return f.p.masterBlNo ?? `${(f.p.carrier ?? 'CAR').slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '')}${yr}${tail}`
    case 'HOUSE_BL': return f.p.houseBlNo ?? `MFI/${yr}/${tail}`
    case 'CERTIFICATE_OF_ORIGIN': return f.p.cooNumber ?? `SKA/${yr}/${tail}`
    case 'PEB': return f.p.pebNumber
    case 'NPE': return f.p.pebNumber ? `NPE-${f.p.pebNumber.split('/').pop()}` : undefined
    case 'VGM_CERTIFICATE': return `VGM/${yr}/${tail}`
    case 'FUMIGATION': return `FMG/${yr}/${tail}`
    case 'ISPM_15': return `ISPM/${yr}/${tail}`
    case 'PHYTOSANITARY': return `PC/${yr}/${tail}`
    case 'INSURANCE_CERTIFICATE': return `ASL/MC/${yr}/${tail}`
    case 'BOOKING_CONFIRMATION':
      return f.p.bookingNo ?? `${(f.p.carrier ?? 'CAR').slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '')}-BK-${tail}${seq}`
    case 'EXPORT_PERMIT': return `PE/${yr}/${tail}`
    case 'LETTER_OF_CREDIT': return f.lcNo
    case 'ARRIVAL_NOTICE': return `AN/${f.p.podCode}/${yr}/${tail}`
    case 'DELIVERY_ORDER': return `DO/${f.p.podCode}/${yr}/${tail}`
    case 'PROOF_OF_DELIVERY': return `POD/${yr}/${tail}`
    case 'STUFFING_REPORT': return `TLY/${yr}/${tail}`
    case 'SENDING_DOC': return `MFI/SD/${yr}/${tail}`
    case 'JOB_SHEET': return f.p.jobNo
    case 'MSDS': return `MSDS/${yr}/${tail}`
    case 'CONSIGNMENT_AGREEMENT': return f.p.consignment?.agreementNo
    default: return undefined
  }
}

/** Issuing authority per document type, so "issued by" is not guesswork either. */
const ISSUER: Partial<Record<ShipmentDocument['type'], string>> = {
  COMMERCIAL_INVOICE: 'Shipper', PACKING_LIST: 'Shipper',
  SHIPPING_INSTRUCTION: 'Meridian Freight', DRAFT_BL: 'Carrier', MASTER_BL: 'Carrier',
  HOUSE_BL: 'Meridian Freight', CERTIFICATE_OF_ORIGIN: 'Ministry of Trade',
  PEB: 'Bea Cukai (CEISA 4.0)', NPE: 'Bea Cukai',
  INSURANCE_CERTIFICATE: 'Asuransi Samudra Lintas', PHYTOSANITARY: 'Balai Karantina Pertanian',
  FUMIGATION: 'PT Prima Fumigasi Indonesia', ISPM_15: 'PT Prima Fumigasi Indonesia',
  VGM_CERTIFICATE: 'Meridian Freight', BOOKING_CONFIRMATION: 'Carrier',
  EXPORT_PERMIT: 'Ministry of Trade', LETTER_OF_CREDIT: 'Issuing bank',
  ARRIVAL_NOTICE: 'Destination agent', DELIVERY_ORDER: 'Destination agent',
  PROOF_OF_DELIVERY: 'Consignee', STUFFING_REPORT: 'Meridian Freight',
  SENDING_DOC: 'Meridian Freight', JOB_SHEET: 'Meridian Freight',
  MSDS: 'Shipper', CONSIGNMENT_AGREEMENT: 'Meridian Freight',
}

/* A handful of settled documents are deliberately left short of their standard —
   a gap on an issued document is what a bank or a customs office rejects, and the
   completeness check needs something real to catch. */
const SETTLED = ['APPROVED', 'ISSUED', 'SURRENDERED']
const shortlist = new Set(
  documents
    .filter((d) => SETTLED.includes(d.status) && docFieldSpecs(d.type).length > 0)
    .filter((_, i) => i % 19 === 3)
    .map((d) => d.id),
)

let docSeq = 0
const factsCache = new Map<string, Facts>()
const factsOf = (p: Project) => {
  if (!factsCache.has(p.id)) factsCache.set(p.id, factsFor(p))
  return factsCache.get(p.id)!
}

for (const doc of documents) {
  const specs = docFieldSpecs(doc.type)
  const p = projects.find((x) => x.id === doc.projectId)
  if (!p) continue
  const f = factsOf(p)

  const numbered = docNumber(doc.type, f, docSeq++)
  if (numbered && doc.status !== 'REQUIRED') doc.docNo = numbered

  /* file names read like something an operator would actually attach */
  if (!doc.fileName && doc.status !== 'REQUIRED') {
    doc.fileName = `${doc.type.toLowerCase().replace(/_/g, '-')}_${p.code}.pdf`
    doc.fileSizeKb = int(84, 2400)
  }
  /* Who issues a document is a fact about its type — a packing list is never
     issued by the quarantine office — so this overwrites rather than fills in. */
  if (ISSUER[doc.type]) {
    const who = ISSUER[doc.type]!
    doc.issuedBy = who === 'Shipper' ? f.shipper : who === 'Carrier' ? (p.carrier ?? 'Carrier') : who
  }

  if (!specs.length || doc.status === 'REQUIRED') continue

  const required = specs.filter((s) => s.required)
  const skip = shortlist.has(doc.id) ? new Set(required.slice(-2).map((s) => s.key)) : new Set<string>()

  doc.fields = specs
    .filter((s) => !skip.has(s.key))
    .filter((s) => s.required || doc.status !== 'DRAFT')
    .map((s) => ({ key: s.key, value: FIELD[s.key] ? FIELD[s.key](f, doc) : '' }))
    .filter((v) => v.value !== '')
}

export const documentFactsReady = true
