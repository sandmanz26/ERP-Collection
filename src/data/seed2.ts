import type {
  AppSettings, CustomsFiling, Milestone, Partner, Quotation, QuoteLine, WarehouseReceipt,
} from './types'
import {
  CHARGE_CODES, CUSTOMS_OFFICES, FX_RATES, KPI_TARGETS_DEFAULT, MILESTONES, PEB_SUPPORTING_DOCS,
  RESTRICTED_HS_PREFIXES, TEAM, WAREHOUSES, stageIndex,
} from './reference'
import { projects, containers, packages, charges } from './seed'

let seed = 77004411
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min
const day = (offset: number, hour = 9) => {
  const d = new Date('2026-08-30T00:00:00Z')
  d.setDate(d.getDate() + offset)
  d.setUTCHours(hour, int(0, 59), 0, 0)
  return d.toISOString()
}
const iso = (offset: number) => day(offset).slice(0, 10)

/* ================================================================
   PARTNERS — the cost side of the business
   ================================================================ */
const score = (onTime: number, doc: number, hrs: number, disputes: number, jobs: number) => ({
  onTimePct: onTime, docAccuracyPct: doc, responseHours: hrs, openDisputes: disputes, jobsHandled: jobs,
})

export const partners: Partner[] = [
  {
    id: 'ptr_1', code: 'VND-0001', name: 'Maersk Line Indonesia', types: ['CARRIER'], status: 'ACTIVE',
    countryCode: 'ID', country: 'Indonesia', city: 'Jakarta', addressLine: 'Menara Astra Lt. 32, Jl. Jend. Sudirman Kav. 5-6',
    scac: 'MAEU', taxId: '01.061.234.5-054.000', currency: 'USD', paymentTermDays: 30,
    contractNo: 'MAEU-ID-2026-1187', contractValidTo: '2026-12-31',
    services: ['Ocean freight', 'Origin THC', 'VGM submission', 'Reefer'],
    lanes: ['IDSRG→NLRTM', 'IDTPP→NLRTM', 'IDSUB→DEHAM'],
    contacts: [{ id: 'pc1', name: 'Andi Kurniawan', title: 'Key Account Manager', email: 'andi.k@maersk.com', phone: '+62 21 5099 1200', isPrimary: true }],
    score: score(94, 98, 3.2, 0, 41), apOutstanding: 125_002_000, onboardedAt: '2019-02-11',
    notes: 'Annual contract with protected space on the Java–North Europe string. Rate review every quarter.',
  },
  {
    id: 'ptr_2', code: 'VND-0002', name: 'Ocean Network Express (ONE)', types: ['CARRIER'], status: 'ACTIVE',
    countryCode: 'SG', country: 'Singapore', city: 'Singapore', scac: 'ONEY', currency: 'USD', paymentTermDays: 30,
    contractNo: 'ONEY-SEA-2026-0442', contractValidTo: '2026-09-30',
    services: ['Ocean freight', 'Origin THC', 'Transhipment via SGSIN'],
    lanes: ['IDBLW→JPYOK', 'IDBLW→KRPUS'],
    contacts: [{ id: 'pc2', name: 'Melissa Tan', title: 'Trade Manager', email: 'melissa.tan@one-line.com', phone: '+65 6220 4400', isPrimary: true }],
    score: score(89, 96, 5.1, 1, 28), apOutstanding: 0, onboardedAt: '2020-06-03',
    notes: 'Contract expires in a month — start the renegotiation now or the Japan lane reverts to spot.',
  },
  {
    id: 'ptr_3', code: 'VND-0003', name: 'Hapag-Lloyd Indonesia', types: ['CARRIER'], status: 'ACTIVE',
    countryCode: 'ID', country: 'Indonesia', city: 'Jakarta', scac: 'HLCU', currency: 'USD', paymentTermDays: 30,
    contractNo: 'HLCU-ID-2026-0771', contractValidTo: '2026-10-31',
    services: ['Ocean freight', 'ISF filing', 'AMS filing'], lanes: ['IDTPP→USSAV', 'IDTPP→USLAX'],
    contacts: [{ id: 'pc3', name: 'Robert Silalahi', title: 'Sales Manager', email: 'robert.s@hlag.com', phone: '+62 21 2358 4000', isPrimary: true }],
    score: score(91, 94, 4.4, 1, 19), apOutstanding: 0, onboardedAt: '2021-01-19',
    notes: 'Strong on the US East Coast. Two days of demurrage at Savannah in dispute on PRJ-2026-0038.',
  },
  {
    id: 'ptr_4', code: 'VND-0004', name: 'PT Pelindo Terminal Petikemas', types: ['TERMINAL'], status: 'ACTIVE',
    countryCode: 'ID', country: 'Indonesia', city: 'Jakarta', taxId: '01.001.643.2-051.000', currency: 'IDR',
    paymentTermDays: 14, services: ['Terminal handling', 'Lift on / lift off', 'Gate operations'],
    lanes: ['IDTPP', 'IDSUB', 'IDSRG'],
    contacts: [{ id: 'pc4', name: 'Nur Halimah', title: 'Commercial', email: 'nur.h@pelindo.co.id', phone: '+62 21 4301 080', isPrimary: true }],
    score: score(88, 92, 8.0, 0, 63), apOutstanding: 47_286_000, onboardedAt: '2018-04-02',
  },
  {
    id: 'ptr_5', code: 'VND-0005', name: 'PT Trans Logistik Jaya', types: ['TRUCKING'], status: 'ACTIVE',
    countryCode: 'ID', country: 'Indonesia', city: 'Semarang', taxId: '02.334.556.7-503.000', currency: 'IDR',
    paymentTermDays: 21, services: ['Container haulage', 'Side loader', 'Escort for out-of-gauge'],
    lanes: ['Jepara→IDSRG', 'Bandung→IDTPP', 'Surabaya→IDSUB'],
    contacts: [{ id: 'pc5', name: 'Slamet Riyadi', title: 'Operations Head', email: 'slamet@translogjaya.co.id', phone: '+62 24 7601 220', isPrimary: true }],
    score: score(82, 90, 2.1, 2, 57), apOutstanding: 68_400_000, onboardedAt: '2020-09-14',
    notes: 'Cheapest haulage in Central Java but the weakest on-time score in the network. Two open damage disputes.',
  },
  {
    id: 'ptr_6', code: 'VND-0006', name: 'Depo Graha Segara', types: ['DEPOT'], status: 'ACTIVE',
    countryCode: 'ID', country: 'Indonesia', city: 'Jakarta', currency: 'IDR', paymentTermDays: 14,
    services: ['Empty release', 'Stuffing yard', 'Container washing', 'Reefer plug'],
    lanes: ['IDTPP'],
    contacts: [{ id: 'pc6', name: 'Yanto Wijaya', title: 'Yard Supervisor', email: 'yanto@grahasegara.co.id', phone: '+62 21 4393 7788', isPrimary: true }],
    score: score(90, 88, 1.5, 0, 44), apOutstanding: 12_800_000, onboardedAt: '2019-11-05',
  },
  {
    id: 'ptr_7', code: 'VND-0007', name: 'Rotterdam Cargo Services BV', types: ['OVERSEAS_AGENT', 'CUSTOMS_BROKER'], status: 'ACTIVE',
    countryCode: 'NL', country: 'Netherlands', city: 'Rotterdam', addressLine: 'Albert Plesmanweg 61, 3088 GB Rotterdam',
    currency: 'EUR', paymentTermDays: 30, contractNo: 'AGT-NL-2024-08', contractValidTo: '2027-03-31',
    services: ['Import clearance', 'Delivery order release', 'Trucking to consignee', 'Bonded storage'],
    lanes: ['NLRTM', 'BEANR'],
    contacts: [{ id: 'pc7', name: 'Sander Bakker', title: 'Import Manager', email: 's.bakker@rcs-rotterdam.nl', phone: '+31 10 495 6600', isPrimary: true }],
    score: score(96, 99, 2.8, 0, 33), apOutstanding: 0, onboardedAt: '2021-07-22',
    notes: 'Best-performing agent in the network. Handles the EU entry summary and EORI validation for our consignees.',
  },
  {
    id: 'ptr_8', code: 'VND-0008', name: 'Yokohama Kaiun Agency KK', types: ['OVERSEAS_AGENT'], status: 'ACTIVE',
    countryCode: 'JP', country: 'Japan', city: 'Yokohama', currency: 'JPY', paymentTermDays: 45,
    contractNo: 'AGT-JP-2023-02', contractValidTo: '2026-09-30',
    services: ['Import clearance', 'Devanning', 'Domestic delivery'], lanes: ['JPYOK', 'JPUKB'],
    contacts: [{ id: 'pc8', name: 'Hiroshi Nakamura', title: 'General Manager', email: 'h.nakamura@ykagency.co.jp', phone: '+81 45 201 3300', isPrimary: true }],
    score: score(97, 98, 6.5, 0, 22), apOutstanding: 0, onboardedAt: '2020-02-17',
    notes: 'Agency agreement expires in a month. Renew before the September rubber shipments.',
  },
  {
    id: 'ptr_9', code: 'VND-0009', name: 'Sydney Freight Partners Pty', types: ['OVERSEAS_AGENT', 'WAREHOUSE'], status: 'ACTIVE',
    countryCode: 'AU', country: 'Australia', city: 'Sydney', currency: 'AUD', paymentTermDays: 30,
    services: ['AQIS coordination', 'Devanning', 'Showroom delivery', 'Consignment stock holding'],
    lanes: ['AUSYD', 'AUMEL'],
    contacts: [{ id: 'pc9', name: 'Nicole Barrett', title: 'Operations', email: 'nicole@sydneyfreight.com.au', phone: '+61 2 9666 4400', isPrimary: true }],
    score: score(85, 93, 9.2, 1, 12), apOutstanding: 0, onboardedAt: '2023-03-08',
    notes: 'Holds the Bali Craft consignment stock. Slow to report sales — chase before every settlement cycle.',
  },
  {
    id: 'ptr_10', code: 'VND-0010', name: 'PT Sarana Bandar Nasional', types: ['CUSTOMS_BROKER'], status: 'ACTIVE',
    countryCode: 'ID', country: 'Indonesia', city: 'Jakarta', taxId: '01.552.331.9-092.000', currency: 'IDR',
    paymentTermDays: 14, services: ['PEB filing', 'PIB filing', 'CEISA 4.0 document upload', 'NPE follow-up'],
    lanes: ['IDTPP', 'IDSUB'],
    contacts: [{ id: 'pc10', name: 'Eko Nugroho', title: 'PPJK Lead', email: 'eko@saranabandar.co.id', phone: '+62 21 4390 1122', isPrimary: true }],
    score: score(93, 91, 3.0, 0, 51), apOutstanding: 9_400_000, onboardedAt: '2019-05-30',
    notes: 'Licensed PPJK. Since 3 Aug 2026 they upload every PEB supporting document through CEISA 4.0 on our behalf.',
  },
  {
    id: 'ptr_11', code: 'VND-0011', name: 'PT Prima Fumigasi Indonesia', types: ['FUMIGATION'], status: 'ACTIVE',
    countryCode: 'ID', country: 'Indonesia', city: 'Semarang', currency: 'IDR', paymentTermDays: 14,
    insuranceValidTo: '2026-09-20',
    services: ['ISPM-15 heat treatment', 'Methyl bromide fumigation', 'Certificate issuance'],
    lanes: ['IDSRG', 'IDSUB'],
    contacts: [{ id: 'pc11', name: 'Dedi Kurnia', title: 'Technical', email: 'dedi@fumigasinusantara.co.id', phone: '+62 24 8442 900', isPrimary: true }],
    score: score(95, 97, 4.0, 0, 26), apOutstanding: 4_200_000, onboardedAt: '2021-08-12',
    notes: 'Operating licence insurance lapses in three weeks — chase the renewal certificate.',
  },
  {
    id: 'ptr_12', code: 'VND-0012', name: 'Asuransi Samudra Lintas', types: ['INSURANCE'], status: 'ACTIVE',
    countryCode: 'ID', country: 'Indonesia', city: 'Jakarta', currency: 'IDR', paymentTermDays: 30,
    services: ['Marine cargo open policy', 'Certificate issuance', 'Claims handling'],
    lanes: ['All'],
    contacts: [{ id: 'pc12', name: 'Ratih Puspita', title: 'Underwriter', email: 'ratih@samudralintas.co.id', phone: '+62 21 5290 8800', isPrimary: true }],
    score: score(99, 96, 12.0, 0, 30), apOutstanding: 0, onboardedAt: '2018-10-01',
    notes: 'Open policy covers 110% of CIF automatically. Claims over IDR 500 M need a surveyor report.',
  },
  {
    id: 'ptr_13', code: 'VND-0013', name: 'Global Marine Surveyors', types: ['SURVEYOR'], status: 'PROSPECT',
    countryCode: 'ID', country: 'Indonesia', city: 'Surabaya', currency: 'USD', paymentTermDays: 30,
    services: ['Lashing survey', 'Draft survey', 'Damage inspection'], lanes: ['IDSUB'],
    contacts: [{ id: 'pc13', name: 'Bayu Anggara', title: 'Principal Surveyor', email: 'bayu@gmsurveyors.com', phone: '+62 31 5030 220', isPrimary: true }],
    score: score(0, 0, 0, 0, 0), apOutstanding: 0, onboardedAt: '2026-08-11',
    notes: 'Quoted for the Jebel Ali breakbulk trial. No jobs handled yet.',
  },
  {
    id: 'ptr_14', code: 'VND-0014', name: 'Cepat Trans Kargo', types: ['TRUCKING'], status: 'SUSPENDED',
    countryCode: 'ID', country: 'Indonesia', city: 'Bandung', currency: 'IDR', paymentTermDays: 14,
    services: ['Container haulage'], lanes: ['Bandung→IDTPP'],
    contacts: [{ id: 'pc14', name: 'Herman Susanto', title: 'Owner', email: 'herman@cepattranskargo.com', phone: '+62 22 6031 400', isPrimary: true }],
    score: score(61, 74, 18.0, 3, 14), apOutstanding: 0, onboardedAt: '2022-04-25',
    notes: 'SUSPENDED — three cargo damage claims in six months and a missed gate-in that rolled a sailing.',
  },
]

/* Link the seeded charge lines to the partner records so spend, AP and
   scorecards are derived rather than typed. */
charges.forEach((c) => {
  const vendor = c.vendor
  if (!vendor) return
  const match = partners.find((p) => p.name === vendor || p.name.startsWith(vendor.split(' ')[0]))
  if (match) c.partnerId = match.id
})

/* ================================================================
   QUOTATIONS — the commercial front end
   ================================================================ */
const qline = (id: string, code: string, qty: number, buy: number, sell: number, currency: QuoteLine['currency'], optional = false): QuoteLine => {
  const meta = CHARGE_CODES.find((c) => c.code === code)
  return {
    id, chargeCode: code, description: meta?.name ?? code, basis: meta?.basis ?? 'PER_SHIPMENT',
    quantity: qty, buyRate: buy, sellRate: sell, currency, vatApplicable: meta?.vat ?? false, optional,
  }
}

const qevent = (id: string, offset: number, type: Quotation['events'][number]['type'], note: string, actor: string) => ({
  id, at: day(offset), type, note, actor,
})

export const quotations: Quotation[] = [
  {
    id: 'qt_1', number: 'QT-2026-0087', version: 2, revisionOfId: 'qt_1_v1',
    customerId: 'cus_1', customerOfficeId: 'off_1', contactName: 'Budi Santoso',
    source: 'INBOUND_RFQ', status: 'UNDER_NEGOTIATION',
    mode: 'FCL', scope: 'PORT_TO_PORT', incoterm: 'FOB', paymentTerm: 'NET_30',
    polCode: 'IDSRG', polName: 'Tanjung Emas', podCode: 'NLRTM', podName: 'Rotterdam', destCountry: 'NL',
    commodity: 'Teak dining and bedroom sets, knock-down', hsCodes: ['9403.60'],
    equipment: [{ type: '40HC', quantity: 4 }], cargoCbm: 268, cargoWeightKg: 23_800, cargoValue: 312_000,
    packageId: 'pkg_1', currency: 'USD', fxRate: 16250, transitDays: 32, freeTimeDays: 14,
    validFrom: iso(-6), validTo: iso(9),
    lines: [
      qline('ql_1', 'OFR', 4, 1180, 1420, 'USD'),
      qline('ql_2', 'BAF', 4, 145, 175, 'USD'),
      qline('ql_3', 'THC-O', 4, 155, 195, 'USD'),
      qline('ql_4', 'DOC', 1, 35, 65, 'USD'),
      qline('ql_5', 'VGM', 4, 12, 25, 'USD'),
      qline('ql_6', 'FUMI', 4, 45, 85, 'USD'),
      qline('ql_7', 'PEB', 1, 18, 45, 'USD', true),
    ],
    terms: 'Rate valid for shipment on or before the validity end date. Subject to space and equipment availability. Excludes destination THC, duty and VAT.',
    remarks: 'Client pushed back on v1 by USD 60 per box. v2 shaves the ocean freight and moves PEB to optional. Decision expected this week.',
    probability: 70, expectedCloseAt: iso(4), ownerName: 'Elena Marchetti',
    sentAt: day(-2), createdAt: day(-6), updatedAt: day(-2),
    events: [
      qevent('qe_1', -6, 'CREATED', 'RFQ received for four 40HC to Rotterdam, weekly through Q4.', 'Elena Marchetti'),
      qevent('qe_2', -5, 'SENT', 'v1 sent at USD 1,480 per box all-in.', 'Elena Marchetti'),
      qevent('qe_3', -3, 'NEGOTIATION', 'Budi: competitor quoted USD 1,420. Asked us to match or explain.', 'Elena Marchetti'),
      qevent('qe_4', -2, 'REVISED', 'v2 issued at USD 1,420 with PEB made optional to hold the margin.', 'Elena Marchetti'),
    ].reverse(),
  },
  {
    id: 'qt_2', number: 'QT-2026-0091', version: 1,
    customerId: 'cus_7', customerOfficeId: 'off_17', contactName: 'Omar Al Falasi',
    source: 'OUTBOUND', status: 'SENT',
    mode: 'BREAKBULK', scope: 'PORT_TO_PORT', incoterm: 'CFR', paymentTerm: 'TT_ADVANCE',
    polCode: 'IDSUB', polName: 'Tanjung Perak', podCode: 'AEJEA', podName: 'Jebel Ali', destCountry: 'AE',
    commodity: 'Marble slabs on A-frame cradles', hsCodes: ['2515.11'],
    equipment: [], cargoCbm: 96, cargoWeightKg: 184_000, cargoValue: 142_000,
    packageId: 'pkg_7', currency: 'USD', fxRate: 16250, transitDays: 22, freeTimeDays: 5,
    validFrom: iso(-3), validTo: iso(11),
    lines: [
      qline('ql_8', 'OFR', 184, 78, 112, 'USD'),
      qline('ql_9', 'STUFF', 184, 14, 26, 'USD'),
      qline('ql_10', 'DOC', 1, 45, 90, 'USD'),
      qline('ql_11', 'INS', 142000, 0.0012, 0.0022, 'USD', true),
    ],
    terms: 'Full payment by telegraphic transfer before booking — no credit line is in place. Lashing survey at owner’s account.',
    remarks: 'First trial with a prospect met at the Dubai trade mission. Surveyor quote still outstanding, so the lashing line carries risk.',
    probability: 40, expectedCloseAt: iso(8), ownerName: 'Marcus Bell',
    sentAt: day(-3), createdAt: day(-4), updatedAt: day(-3),
    events: [
      qevent('qe_5', -4, 'CREATED', 'Built from the draft breakbulk package after the Dubai mission.', 'Marcus Bell'),
      qevent('qe_6', -3, 'SENT', 'Quote sent with TT-advance terms because no credit line exists.', 'Marcus Bell'),
    ].reverse(),
  },
  {
    id: 'qt_3', number: 'QT-2026-0084', version: 1,
    customerId: 'cus_4', customerOfficeId: 'off_10', contactName: 'Ratna Sari',
    source: 'RENEWAL', status: 'ACCEPTED',
    mode: 'FCL', scope: 'PORT_TO_PORT', incoterm: 'FOB', paymentTerm: 'NET_30',
    polCode: 'IDSUB', polName: 'Tanjung Perak', podCode: 'NLRTM', podName: 'Rotterdam', destCountry: 'NL',
    commodity: 'Robusta green coffee, 60 kg bags', hsCodes: ['0901.11'],
    equipment: [{ type: '40HC', quantity: 2 }], cargoCbm: 132, cargoWeightKg: 38_400, cargoValue: 152_400,
    packageId: 'pkg_1', currency: 'USD', fxRate: 16250, transitDays: 32, freeTimeDays: 14,
    validFrom: iso(-14), validTo: iso(16),
    lines: [
      qline('ql_12', 'OFR', 2, 1180, 1480, 'USD'),
      qline('ql_13', 'THC-O', 2, 155, 195, 'USD'),
      qline('ql_14', 'DOC', 1, 35, 65, 'USD'),
      qline('ql_15', 'PHYTO', 1, 40, 85, 'USD'),
      qline('ql_16', 'VGM', 2, 12, 25, 'USD'),
    ],
    terms: 'Renewal of the Q3 rate on the same terms. Phytosanitary certificate included.',
    remarks: 'Accepted without negotiation — the phytosanitary handling is what keeps this account.',
    probability: 100, expectedCloseAt: iso(-10), ownerName: 'Priya Nair',
    sentAt: day(-13), decidedAt: day(-10), convertedProjectId: 'prj_12',
    createdAt: day(-14), updatedAt: day(-10),
    events: [
      qevent('qe_7', -14, 'CREATED', 'Q4 renewal prepared from the Q3 rate card.', 'Priya Nair'),
      qevent('qe_8', -13, 'SENT', 'Sent to Ratna with the same all-in rate as Q3.', 'Priya Nair'),
      qevent('qe_9', -10, 'DECIDED', 'Accepted by email. Converted to PRJ-2026-0050.', 'Priya Nair'),
      qevent('qe_10', -10, 'CONVERTED', 'Job opened with five charge lines copied from the quotation.', 'Priya Nair'),
    ].reverse(),
  },
  {
    id: 'qt_4', number: 'QT-2026-0079', version: 3, revisionOfId: 'qt_4_v2',
    customerId: 'cus_5', customerOfficeId: 'off_12', contactName: 'Angela Reyes',
    source: 'INBOUND_RFQ', status: 'REJECTED',
    mode: 'FCL', scope: 'PORT_TO_PORT', incoterm: 'FOB', paymentTerm: 'NET_45',
    polCode: 'IDTPP', polName: 'Tanjung Priok', podCode: 'USLAX', podName: 'Los Angeles', destCountry: 'US',
    commodity: 'Knitted cotton T-shirts, cartons', hsCodes: ['6109.10'],
    equipment: [{ type: '40HC', quantity: 6 }], cargoCbm: 402, cargoWeightKg: 41_200, cargoValue: 164_200,
    packageId: 'pkg_4', currency: 'USD', fxRate: 16250, transitDays: 26, freeTimeDays: 10,
    validFrom: iso(-30), validTo: iso(-9),
    lines: [
      qline('ql_17', 'OFR', 6, 2380, 2790, 'USD'),
      qline('ql_18', 'THC-O', 6, 165, 205, 'USD'),
      qline('ql_19', 'AMS', 1, 30, 55, 'USD'),
      qline('ql_20', 'DOC', 1, 35, 70, 'USD'),
    ],
    terms: 'Net 45 requested by the client; approved only against a director release.',
    remarks: 'Lost on credit terms, not price. The client is already over their limit with us by IDR 118.5 M — finance would not extend to net 45.',
    probability: 0, expectedCloseAt: iso(-12), ownerName: 'David Chen',
    sentAt: day(-26), decidedAt: day(-12), lossReason: 'CREDIT_TERMS', competitorName: 'Pacific Rim Logistics',
    createdAt: day(-30), updatedAt: day(-12),
    events: [
      qevent('qe_11', -30, 'CREATED', 'RFQ for six 40HC monthly to Los Angeles.', 'David Chen'),
      qevent('qe_12', -26, 'SENT', 'v1 at net 30.', 'David Chen'),
      qevent('qe_13', -20, 'REVISED', 'v2 with a small rate reduction after pushback.', 'David Chen'),
      qevent('qe_14', -16, 'REVISED', 'v3 — client asked for net 45; sent pending a director release.', 'David Chen'),
      qevent('qe_15', -12, 'DECIDED', 'Lost. Finance declined net 45 while the account is over its limit.', 'David Chen'),
    ].reverse(),
  },
  {
    id: 'qt_5', number: 'QT-2026-0090', version: 1,
    customerId: 'cus_6', customerOfficeId: 'off_14', contactName: 'Rizky Hidayat',
    source: 'INBOUND_RFQ', status: 'SENT',
    mode: 'AIR', scope: 'DOOR_TO_DOOR', incoterm: 'DAP', paymentTerm: 'NET_14',
    polCode: 'IDTPP', polName: 'Soekarno-Hatta (CGK)', podCode: 'CNSHA', podName: 'Pudong (PVG)', destCountry: 'CN',
    commodity: 'Automotive wire harness assemblies — AOG replenishment', hsCodes: ['8544.42'],
    equipment: [], cargoCbm: 6.4, cargoWeightKg: 780, cargoValue: 88_600,
    packageId: 'pkg_5', currency: 'USD', fxRate: 16250, transitDays: 3, freeTimeDays: 3,
    validFrom: iso(-1), validTo: iso(13),
    lines: [
      qline('ql_21', 'OFR', 1067, 3.4, 4.7, 'USD'),
      qline('ql_22', 'CLR', 1, 65, 120, 'USD'),
      qline('ql_23', 'TRUCK', 1, 90, 160, 'USD'),
      qline('ql_24', 'DOC', 1, 25, 55, 'USD'),
    ],
    terms: 'Chargeable weight on the IATA volumetric divisor of 6000; 1,067 kg chargeable against 780 kg actual.',
    remarks: 'Standing air rate for line-stop replenishment. Volumetric weight is the driver — confirm carton dimensions before booking.',
    probability: 65, expectedCloseAt: iso(3), ownerName: 'Tomas Weber',
    sentAt: day(-1), createdAt: day(-1), updatedAt: day(-1),
    events: [
      qevent('qe_16', -1, 'CREATED', 'Rizky flagged a Shanghai line-stop risk; quoted same day.', 'Tomas Weber'),
      qevent('qe_17', -1, 'SENT', 'Sent with the volumetric calculation shown so the buyer can sanity-check it.', 'Tomas Weber'),
    ].reverse(),
  },
  {
    id: 'qt_6', number: 'QT-2026-0075', version: 1,
    customerId: 'cus_8', customerOfficeId: 'off_18', contactName: 'Andi Pratama',
    source: 'OUTBOUND', status: 'EXPIRED',
    mode: 'FCL', scope: 'PORT_TO_PORT', incoterm: 'CIF', paymentTerm: 'NET_30',
    polCode: 'IDMAK', polName: 'Makassar', podCode: 'JPYOK', podName: 'Yokohama', destCountry: 'JP',
    commodity: 'Frozen tuna loin, -18 °C', hsCodes: ['0306.17'],
    equipment: [{ type: '40RH', quantity: 1 }], cargoCbm: 58, cargoWeightKg: 24_000, cargoValue: 198_000,
    currency: 'USD', fxRate: 16250, transitDays: 20, freeTimeDays: 7,
    validFrom: iso(-45), validTo: iso(-15),
    lines: [
      qline('ql_25', 'OFR', 1, 2650, 3180, 'USD'),
      qline('ql_26', 'THC-O', 1, 210, 265, 'USD'),
      qline('ql_27', 'PHYTO', 1, 40, 85, 'USD'),
      qline('ql_28', 'INS', 198000, 0.0012, 0.002, 'USD'),
    ],
    terms: 'Reefer set point -18 °C with pre-trip inspection. Plug-in at destination beyond 7 days at consignee’s account.',
    remarks: 'Expired without a decision — the Japanese buyer deferred the season. Worth re-quoting for the October window.',
    probability: 0, ownerName: 'Sofia Reyes',
    sentAt: day(-44), createdAt: day(-45), updatedAt: day(-15),
    events: [
      qevent('qe_18', -45, 'CREATED', 'Proactive quote ahead of the tuna season.', 'Sofia Reyes'),
      qevent('qe_19', -44, 'SENT', 'Sent to Andi with a 30-day validity.', 'Sofia Reyes'),
      qevent('qe_20', -15, 'NOTE', 'Validity lapsed with no decision — buyer deferred the season.', 'Sofia Reyes'),
    ].reverse(),
  },
  {
    id: 'qt_7', number: 'QT-2026-0092', version: 1,
    customerId: 'cus_3', customerOfficeId: 'off_7', contactName: 'Clara Lim',
    source: 'RENEWAL', status: 'DRAFT',
    mode: 'LCL', scope: 'DOOR_TO_DOOR', incoterm: 'DAP', paymentTerm: 'CONSIGNMENT_SETTLEMENT',
    polCode: 'IDSUB', polName: 'Tanjung Perak', podCode: 'AUSYD', podName: 'Sydney', destCountry: 'AU',
    commodity: 'Rattan homeware and ceramic tableware — consignment cycle 9', hsCodes: ['9403.60'],
    equipment: [], cargoCbm: 84, cargoWeightKg: 9_600, cargoValue: 71_200,
    packageId: 'pkg_3', currency: 'AUD', fxRate: 10650, transitDays: 21, freeTimeDays: 7,
    validFrom: iso(0), validTo: iso(30),
    lines: [
      qline('ql_29', 'CFS', 84, 26, 44, 'AUD'),
      qline('ql_30', 'OFR', 84, 58, 86, 'AUD'),
      qline('ql_31', 'TRUCK', 1, 380, 560, 'AUD'),
      qline('ql_32', 'FUMI', 1, 120, 210, 'AUD'),
      qline('ql_33', 'DOC', 1, 40, 80, 'AUD'),
      qline('ql_34', 'ADMIN', 1, 0, 150, 'AUD', true),
    ],
    terms: 'Logistics package invoiced on shipment. Goods settle on the consignment cycle, 30 days, 22% commission.',
    remarks: 'Draft for cycle 9. Hold until cycle 8 sells through — 41 units from cycle 6 are still unsold at day 96 of 120.',
    probability: 80, expectedCloseAt: iso(12), ownerName: 'Sofia Reyes',
    createdAt: day(0), updatedAt: day(0),
    events: [qevent('qe_21', 0, 'CREATED', 'Cycle 9 drafted from the standing consignment package.', 'Sofia Reyes')],
  },
]

/* ================================================================
   MILESTONES — planned from the schedule, actuals where they landed
   ================================================================ */
export const milestones: Milestone[] = []
let mIdx = 0
for (const p of projects) {
  if (!p.etd) continue
  const etdDate = new Date(p.etd)
  const stage = stageIndex(p.stage)
  const transhipping = !!p.transhipmentPort
  const applicable = MILESTONES.filter((m) => (transhipping ? true : !m.code.startsWith('TRANSHIPMENT')))
  /* how far along the milestone chain this job has actually got */
  const reached = stage <= 1 ? 1 : stage === 2 ? 3 : stage === 3 ? 4 : stage === 4 ? 7 : stage === 5 ? 9 : stage === 6 ? 13 : applicable.length

  applicable.forEach((meta, i) => {
    mIdx++
    const planned = new Date(etdDate)
    planned.setDate(planned.getDate() + meta.offsetFromEtd)
    const isPast = i < reached
    /* most events land on time, a few slip — that is what makes the KPI worth reading */
    const slip = rnd() < 0.22 ? int(1, 3) : rnd() < 0.35 ? -1 : 0
    const actual = new Date(planned)
    actual.setDate(actual.getDate() + slip)
    const originLeg = meta.leg === 'ORIGIN'
    milestones.push({
      id: `ms_${mIdx}`,
      projectId: p.id,
      code: meta.code,
      plannedAt: planned.toISOString(),
      actualAt: isPast ? actual.toISOString() : undefined,
      locationCode: originLeg ? p.polCode : meta.leg === 'MAIN' ? p.polCode : p.podCode,
      locationName: originLeg ? p.polName : meta.leg === 'MAIN' ? p.polName : p.podName,
      source: isPast ? (rnd() < 0.55 ? 'CARRIER_EDI' : rnd() < 0.6 ? 'PORTAL' : rnd() < 0.7 ? 'AGENT' : 'MANUAL') : 'MANUAL',
      vessel: meta.leg === 'MAIN' ? p.vessel : undefined,
      voyage: meta.leg === 'MAIN' ? p.voyage : undefined,
      partnerId: meta.leg === 'DESTINATION' ? pick(['ptr_7', 'ptr_8', 'ptr_9']) : meta.code === 'GATE_IN' ? 'ptr_4' : undefined,
      recordedBy: pick(TEAM),
      recordedAt: isPast ? actual.toISOString() : day(0),
    })
  })
}

/* ================================================================
   WAREHOUSE RECEIPTS
   ================================================================ */
export const warehouseReceipts: WarehouseReceipt[] = [
  {
    id: 'wr_1', number: 'WR-2026-0311', warehouseCode: 'CFS-SUB', warehouseName: 'CFS Tanjung Perak',
    customerId: 'cus_3', projectId: 'prj_11', status: 'IN_STOCK', receivedAt: day(-9), location: 'A-04-12',
    description: 'Rattan dining sets, knocked down — consignment cycle 8', hsCode: '9403.60',
    marks: 'BALI CRAFT / SYD / C-NO 1-180', poNumber: 'PO-88214',
    packages: 180, packagesReleased: 0, cbm: 46.2, weightKg: 4_320, freeDays: 7,
    storageRatePerCbmDay: 8500, currency: 'IDR', handlingIn: 1_850_000, handlingOut: 1_850_000,
    receivedBy: 'David Chen', remarks: 'Awaiting CFS consolidation with the ceramics lot before gate-in.',
  },
  {
    id: 'wr_2', number: 'WR-2026-0312', warehouseCode: 'CFS-SUB', warehouseName: 'CFS Tanjung Perak',
    customerId: 'cus_3', projectId: 'prj_11', status: 'IN_STOCK', receivedAt: day(-6), location: 'A-04-15',
    description: 'Ceramic tableware, 12-piece sets', hsCode: '6912.00',
    marks: 'BALI CRAFT / SYD / C-NO 181-300', poNumber: 'PO-88215',
    packages: 120, packagesReleased: 0, cbm: 18.9, weightKg: 2_640, freeDays: 7,
    storageRatePerCbmDay: 8500, currency: 'IDR', handlingIn: 980_000, handlingOut: 980_000,
    receivedBy: 'David Chen',
  },
  {
    id: 'wr_3', number: 'WR-2026-0298', warehouseCode: 'WH-SRG', warehouseName: 'Semarang Consolidation Hub',
    customerId: 'cus_1', projectId: 'prj_14', status: 'PARTIALLY_RELEASED', receivedAt: day(-22), location: 'B-02-03',
    description: 'Teak bedroom sets, knocked down, crated', hsCode: '9403.60',
    marks: 'JATI MAKMUR / RTM / C-NO 1-240', poNumber: 'PO-77120',
    packages: 240, packagesReleased: 160, cbm: 92.4, weightKg: 17_760, freeDays: 10,
    storageRatePerCbmDay: 7200, currency: 'IDR', handlingIn: 3_400_000, handlingOut: 2_260_000,
    receivedBy: 'Elena Marchetti', remarks: '160 crates stuffed into the first 40HC. Balance waits for the second unit.',
  },
  {
    id: 'wr_4', number: 'WR-2026-0264', warehouseCode: 'WH-DPS', warehouseName: 'Denpasar Buying Warehouse',
    customerId: 'cus_3', status: 'IN_STOCK', receivedAt: day(-104), location: 'C-01-08',
    description: 'Carved teak wall panels — returned from Sydney showroom, cycle 6 unsold', hsCode: '4407.29',
    marks: 'BALI CRAFT / RETURN / C-NO 1-41', packages: 41, packagesReleased: 0, cbm: 11.2, weightKg: 902,
    freeDays: 14, storageRatePerCbmDay: 6800, currency: 'IDR', handlingIn: 620_000, handlingOut: 620_000,
    receivedBy: 'Sofia Reyes',
    remarks: 'Cycle 6 unsold stock at day 96 of the 120-day return window. Decide: re-consign, discount or write down.',
  },
  {
    id: 'wr_5', number: 'WR-2026-0305', warehouseCode: 'CFS-TPP', warehouseName: 'CFS Tanjung Priok',
    customerId: 'cus_6', projectId: 'prj_13', status: 'RELEASED', receivedAt: day(-16), releasedAt: day(-11),
    location: 'D-03-01', description: 'Electronic connectors, reel packed, anti-static', hsCode: '8544.42',
    marks: 'CAKRA / SGN / C-NO 1-96', poNumber: 'PO-45990',
    packages: 96, packagesReleased: 96, cbm: 5.8, weightKg: 1_536, freeDays: 5,
    storageRatePerCbmDay: 9200, currency: 'IDR', handlingIn: 1_120_000, handlingOut: 1_120_000,
    receivedBy: 'Tomas Weber',
  },
  {
    id: 'wr_6', number: 'WR-2026-0288', warehouseCode: 'CS-MAK', warehouseName: 'Makassar Cold Store',
    customerId: 'cus_8', projectId: 'prj_6', status: 'ON_HOLD', receivedAt: day(-12), location: 'FRZ-02',
    description: 'Frozen vannamei shrimp, block frozen -18 °C', hsCode: '0306.17',
    marks: 'SAMUDRA / PUS / MC 1-2400', poNumber: 'PO-31007',
    packages: 2400, packagesReleased: 0, cbm: 72.0, weightKg: 24_960, freeDays: 5,
    storageRatePerCbmDay: 21000, currency: 'IDR', handlingIn: 8_400_000, handlingOut: 8_400_000,
    receivedBy: 'Sofia Reyes',
    remarks: 'ON HOLD pending the health certificate from the fisheries authority. Cold-store storage is the expensive kind.',
  },
  {
    id: 'wr_7', number: 'WR-2026-0270', warehouseCode: 'WH-SRG', warehouseName: 'Semarang Consolidation Hub',
    customerId: 'cus_1', status: 'IN_STOCK', receivedAt: day(-61), location: 'B-05-11',
    description: 'Teak occasional tables — buyer rejected finish, awaiting instruction', hsCode: '9403.60',
    marks: 'JATI MAKMUR / HOLD', packages: 64, packagesReleased: 0, cbm: 24.6, weightKg: 3_072,
    freeDays: 10, storageRatePerCbmDay: 7200, currency: 'IDR', handlingIn: 1_240_000, handlingOut: 1_240_000,
    receivedBy: 'Elena Marchetti',
    remarks: 'Sitting 61 days. Storage now exceeds the freight it would have earned — escalate to the client.',
  },
]

/* ================================================================
   CUSTOMS FILINGS — CEISA 4.0 era
   ================================================================ */
const supportingDocs = (uploaded: string[]) =>
  PEB_SUPPORTING_DOCS.map((d) => ({ type: d.type, label: d.label, mandatory: d.mandatory, uploaded: uploaded.includes(d.type) }))

export const customsFilings: CustomsFiling[] = [
  {
    id: 'cf_1', projectId: 'prj_1', type: 'PEB', regNumber: '000412-2026-SRG', regDate: iso(-10),
    ceisaRef: 'CEISA/2026/SRG/0004128', status: 'APPROVED', channel: 'HIJAU',
    submittedAt: day(-10), respondedAt: day(-10, 15), filedByPartnerId: 'ptr_10', filedByName: 'PT Sarana Bandar Nasional',
    exporterOfRecord: 'PT Jati Makmur Furniture', declaredValue: 284_500, declaredCurrency: 'USD',
    officeCode: '060200', remarks: 'Green lane, released same day. NPE issued two days later.',
    supportingDocs: supportingDocs(['COMMERCIAL_INVOICE', 'PACKING_LIST', 'DRAFT_BL', 'CERTIFICATE_OF_ORIGIN']),
  },
  {
    id: 'cf_2', projectId: 'prj_2', type: 'PEB', regNumber: '000297-2026-BLW', regDate: iso(0),
    ceisaRef: 'CEISA/2026/BLW/0002971', status: 'UNDER_REVIEW', channel: 'KUNING',
    submittedAt: day(0, 8), filedByName: 'In-house customs desk — Meridian Freight',
    exporterOfRecord: 'PT Anugerah Rubber Industries', declaredValue: 412_000, declaredCurrency: 'USD',
    officeCode: '070100',
    remarks: 'Yellow lane — Bea Cukai querying the weight declared against the packing list. Expect 1–2 days; VGM cut-off is in two.',
    supportingDocs: supportingDocs(['COMMERCIAL_INVOICE', 'PACKING_LIST', 'DRAFT_BL']),
  },
  {
    id: 'cf_3', projectId: 'prj_4', type: 'PEB', regNumber: '000501-2026-SUB', regDate: iso(1),
    status: 'DRAFT', channel: 'PENDING', filedByPartnerId: 'ptr_10', filedByName: 'PT Sarana Bandar Nasional',
    exporterOfRecord: 'PT Sinar Kopi Sejahtera', declaredValue: 198_000, declaredCurrency: 'USD',
    officeCode: '050100',
    remarks: 'Cannot submit: the phytosanitary certificate was rejected by Karantina and CEISA 4.0 requires it uploaded for coffee.',
    supportingDocs: supportingDocs(['COMMERCIAL_INVOICE', 'PACKING_LIST']),
  },
  {
    id: 'cf_4', projectId: 'prj_8', type: 'PEB', regNumber: '000355-2026-TPP', regDate: iso(-59),
    ceisaRef: 'CEISA/2026/TPP/0003551', status: 'APPROVED', channel: 'MERAH',
    submittedAt: day(-59), respondedAt: day(-57), filedByPartnerId: 'ptr_10', filedByName: 'PT Sarana Bandar Nasional',
    exporterOfRecord: 'PT Jati Makmur Furniture', declaredValue: 246_800, declaredCurrency: 'USD',
    officeCode: '040300',
    remarks: 'Red lane — physical inspection of the timber packaging. Two days lost, which is where the Savannah demurrage started.',
    supportingDocs: supportingDocs(['COMMERCIAL_INVOICE', 'PACKING_LIST', 'DRAFT_BL', 'CERTIFICATE_OF_ORIGIN', 'PHYTOSANITARY']),
  },
  {
    id: 'cf_5', projectId: 'prj_13', type: 'PEB', regNumber: '000517-2026-TPP', regDate: iso(2),
    ceisaRef: 'CEISA/2026/TPP/0005170', status: 'SUBMITTED', channel: 'PENDING',
    submittedAt: day(2), filedByName: 'In-house customs desk — Meridian Freight',
    exporterOfRecord: 'PT Cakra Elektronik Komponen', declaredValue: 118_900, declaredCurrency: 'USD',
    officeCode: '040300', remarks: 'Form D claimed under ATIGA — invoice value must match the COO exactly.',
    supportingDocs: supportingDocs(['COMMERCIAL_INVOICE', 'PACKING_LIST', 'DRAFT_BL', 'CERTIFICATE_OF_ORIGIN']),
  },
  {
    id: 'cf_6', projectId: 'prj_9', type: 'PEB', regNumber: '000241-2026-BLW', regDate: iso(-75),
    ceisaRef: 'CEISA/2026/BLW/0002410', status: 'APPROVED', channel: 'HIJAU',
    submittedAt: day(-75), respondedAt: day(-75, 14), filedByName: 'In-house customs desk — Meridian Freight',
    exporterOfRecord: 'PT Anugerah Rubber Industries', declaredValue: 388_000, declaredCurrency: 'USD',
    officeCode: '070100', remarks: 'Clean filing. Form AK issued for the Korean buyer’s duty preference.',
    supportingDocs: supportingDocs(['COMMERCIAL_INVOICE', 'PACKING_LIST', 'DRAFT_BL', 'CERTIFICATE_OF_ORIGIN']),
  },
  {
    id: 'cf_7', projectId: 'prj_1', type: 'NPE', regNumber: 'NPE-000412-2026', regDate: iso(-8),
    status: 'APPROVED', channel: 'HIJAU', submittedAt: day(-8), respondedAt: day(-8, 11),
    filedByPartnerId: 'ptr_10', filedByName: 'PT Sarana Bandar Nasional',
    exporterOfRecord: 'PT Jati Makmur Furniture', declaredValue: 284_500, declaredCurrency: 'USD',
    officeCode: '060200', remarks: 'Export approval note issued — gate-in permitted.',
    supportingDocs: [],
  },
  {
    id: 'cf_8', projectId: 'prj_6', type: 'PEB', status: 'DRAFT', channel: 'PENDING',
    filedByName: 'In-house customs desk — Meridian Freight', exporterOfRecord: 'PT Samudra Beku Seafood',
    declaredValue: 356_000, declaredCurrency: 'USD', officeCode: '080100',
    remarks: 'Held: shrimp is a LARTAS commodity and the health certificate is still with the fisheries authority.',
    supportingDocs: supportingDocs(['COMMERCIAL_INVOICE', 'PACKING_LIST']),
  },
]

/* ================================================================
   SETTINGS
   ================================================================ */
export const defaultSettings: AppSettings = {
  companyName: 'Meridian Freight International',
  companyTaxId: '01.234.567.8-051.000',
  baseCurrency: 'IDR',
  fxRates: { ...FX_RATES },
  vatRate: 11,
  whtRate: 2,
  chargeApprovalThreshold: 50_000_000,
  billApprovalThreshold: 100_000_000,
  numbering: [
    { key: 'quotation', label: 'Quotation', prefix: 'QT', includeYear: true, padding: 4, nextNumber: 93 },
    { key: 'project', label: 'Project / job', prefix: 'PRJ', includeYear: true, padding: 4, nextNumber: 53 },
    { key: 'customer', label: 'Customer', prefix: 'CUS', includeYear: false, padding: 4, nextNumber: 9 },
    { key: 'partner', label: 'Partner / vendor', prefix: 'VND', includeYear: false, padding: 4, nextNumber: 15 },
    { key: 'package', label: 'Service package', prefix: 'PKG', includeYear: false, padding: 3, nextNumber: 9 },
    { key: 'receipt', label: 'Warehouse receipt', prefix: 'WR', includeYear: true, padding: 4, nextNumber: 313 },
    { key: 'journal', label: 'Journal entry', prefix: 'JV', includeYear: true, padding: 4, nextNumber: 475 },
    { key: 'invoice', label: 'Sales invoice', prefix: 'INV/AR', includeYear: true, padding: 4, nextNumber: 1245 },
  ],
  kpiTargets: { ...KPI_TARGETS_DEFAULT },
  restrictedHsPrefixes: [...RESTRICTED_HS_PREFIXES],
}

/* keep the seeded package list referenced so the module graph is explicit */
export const seededPackageCount = packages.length
export const seededContainerCount = containers.length
export const CUSTOMS_OFFICE_LIST = CUSTOMS_OFFICES
export const WAREHOUSE_LIST = WAREHOUSES
