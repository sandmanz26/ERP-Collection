import type {
  CompanyProfile, Incident, IncidentAction, JobService, PasswordResetToken, StuffingJob,
  StuffingLocationType, StuffingStatus, UserAccount,
} from './types'
import { ADDITIONAL_SERVICES, docFieldSpecs } from './reference'
import { charges, containers, customers, documents, projects } from './seed'
import { recommendServices } from '@/lib/services'

let seed = 31415926
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min
const day = (offset: number, hour = 9) => {
  const d = new Date('2026-08-30T00:00:00Z')
  d.setDate(d.getDate() + offset)
  d.setUTCHours(hour, int(0, 59), 0, 0)
  return d.toISOString()
}

/* ================================================================
   USERS
   ----------------------------------------------------------------
   DEMO ONLY. Passwords are stored in clear text because this build has
   no backend and the sign-in screen has to be usable by whoever opens
   the demo. A real deployment authenticates on the server and never
   holds a credential in the browser.
   ================================================================ */

export const users: UserAccount[] = [
  {
    id: 'usr_1', email: 'elena.marchetti@meridianfreight.com', password: 'Meridian#2026',
    fullName: 'Elena Marchetti', jobTitle: 'Managing Director', role: 'ADMIN', status: 'ACTIVE',
    branchCode: 'HO-JKT', phone: '+62 21 5099 1200', failedAttempts: 0,
    lastLoginAt: day(-1, 7), mustChangePassword: false, twoFactorEnabled: true, createdAt: day(-980),
  },
  {
    id: 'usr_2', email: 'marcus.bell@meridianfreight.com', password: 'Meridian#2026',
    fullName: 'Marcus Bell', jobTitle: 'Head of Operations', role: 'OPERATIONS', status: 'ACTIVE',
    branchCode: 'HO-JKT', phone: '+62 21 5099 1211', failedAttempts: 0,
    lastLoginAt: day(0, 6), mustChangePassword: false, twoFactorEnabled: true, createdAt: day(-870),
  },
  {
    id: 'usr_3', email: 'sofia.reyes@meridianfreight.com', password: 'Meridian#2026',
    fullName: 'Sofia Reyes', jobTitle: 'Commercial Manager', role: 'SALES', status: 'ACTIVE',
    branchCode: 'HO-JKT', phone: '+62 21 5099 1222', failedAttempts: 0,
    lastLoginAt: day(0, 8), mustChangePassword: false, twoFactorEnabled: false, createdAt: day(-720),
  },
  {
    id: 'usr_4', email: 'david.chen@meridianfreight.com', password: 'Meridian#2026',
    fullName: 'David Chen', jobTitle: 'Finance Controller', role: 'FINANCE', status: 'ACTIVE',
    branchCode: 'HO-JKT', phone: '+62 21 5099 1233', failedAttempts: 0,
    lastLoginAt: day(-2, 10), mustChangePassword: false, twoFactorEnabled: true, createdAt: day(-640),
  },
  {
    id: 'usr_5', email: 'priya.nair@meridianfreight.com', password: 'Meridian#2026',
    fullName: 'Priya Nair', jobTitle: 'Documentation Supervisor', role: 'OPERATIONS', status: 'ACTIVE',
    branchCode: 'BR-SUB', phone: '+62 31 3300 4455', failedAttempts: 2,
    lastLoginAt: day(-1, 9), mustChangePassword: false, twoFactorEnabled: false, createdAt: day(-410),
  },
  {
    id: 'usr_6', email: 'tomas.weber@meridianfreight.com', password: 'Meridian#2026',
    fullName: 'Tomas Weber', jobTitle: 'Warehouse Supervisor', role: 'WAREHOUSE', status: 'ACTIVE',
    branchCode: 'BR-DPS', phone: '+62 361 720 1188', failedAttempts: 0,
    lastLoginAt: day(-3, 7), mustChangePassword: false, twoFactorEnabled: false, createdAt: day(-300),
  },
  /* --- the negative cases the sign-in screen has to handle --- */
  {
    id: 'usr_7', email: 'hana.suzuki@meridianfreight.com', password: 'Meridian#2026',
    fullName: 'Hana Suzuki', jobTitle: 'Customer Service Officer', role: 'OPERATIONS',
    status: 'PENDING_VERIFICATION', branchCode: 'HO-JKT', failedAttempts: 0,
    mustChangePassword: true, twoFactorEnabled: false, createdAt: day(-6),
  },
  {
    id: 'usr_8', email: 'liam.okoro@meridianfreight.com', password: 'Meridian#2026',
    fullName: 'Liam Okoro', jobTitle: 'Export Documentation Officer', role: 'OPERATIONS',
    status: 'LOCKED', branchCode: 'BR-MES', failedAttempts: 5, lockedUntil: day(0, 21),
    lastLoginAt: day(-9, 8), mustChangePassword: false, twoFactorEnabled: false, createdAt: day(-220),
  },
  {
    id: 'usr_9', email: 'nadia.haddad@meridianfreight.com', password: 'Meridian#2026',
    fullName: 'Nadia Haddad', jobTitle: 'Former Sales Executive', role: 'SALES', status: 'SUSPENDED',
    branchCode: 'HO-JKT', failedAttempts: 0, lastLoginAt: day(-64, 11),
    mustChangePassword: false, twoFactorEnabled: false, createdAt: day(-540),
  },
  {
    id: 'usr_10', email: 'auditor@meridianfreight.com', password: 'Meridian#2026',
    fullName: 'External Auditor', jobTitle: 'Statutory Audit (read only)', role: 'VIEWER',
    status: 'INVITED', failedAttempts: 0, mustChangePassword: true, twoFactorEnabled: false, createdAt: day(-2),
  },
]

export const resetTokens: PasswordResetToken[] = [
  { token: 'MF-RESET-EXPIRED-01', email: 'liam.okoro@meridianfreight.com', issuedAt: day(-2, 10), expiresAt: day(-2, 11), used: false },
  { token: 'MF-RESET-USED-02', email: 'priya.nair@meridianfreight.com', issuedAt: day(-8, 14), expiresAt: day(-8, 15), used: true },
]

/* ================================================================
   THE FORWARDER'S OWN RECORD
   ================================================================ */

export const company: CompanyProfile = {
  legalName: 'PT Meridian Freight International',
  tradingName: 'Meridian Freight',
  taxId: '01.884.552.3-092.000',
  registrationNo: 'NIB 9120401772345',
  foundedYear: 2009,
  addressLine: 'Meridian Tower, 12th Floor, Jl. Yos Sudarso Kav. 88, Tanjung Priok',
  city: 'Jakarta Utara',
  countryCode: 'ID',
  phone: '+62 21 5099 1200',
  email: 'export@meridianfreight.com',
  website: 'www.meridianfreight.com',
  liabilityCoverage: 2_000_000,
  liabilityCurrency: 'USD',
  liabilityExpiresAt: day(41).slice(0, 10),
  standardTradingConditions:
    'All business is undertaken subject to the Standard Trading Conditions of the Indonesian Logistics and Forwarders Association (ALFI), which limit our liability to SDR 2 per kilogramme of gross weight, or SDR 666.67 per package, whichever is the higher.',
  licences: [
    { id: 'lic_1', kind: 'BUSINESS_REGISTRATION', name: 'Business Identification Number (NIB)', number: '9120401772345', issuer: 'OSS — Ministry of Investment', issuedAt: '2019-03-14', scope: 'KBLI 52291 — freight forwarding', notes: 'Perpetual, revalidated on any change of shareholding.' },
    { id: 'lic_2', kind: 'FREIGHT_FORWARDING', name: 'Freight Forwarding Business Licence (JPT)', number: 'AL.108/9/14/DJPL-24', issuer: 'Directorate General of Sea Transportation', issuedAt: '2024-02-01', expiresAt: '2029-01-31', scope: 'Sea and multimodal freight forwarding, nationwide.' },
    { id: 'lic_3', kind: 'CUSTOMS_BROKER', name: 'Customs Broker Registration (PPJK)', number: 'NP-01234/KM.4/2023', issuer: 'Directorate General of Customs & Excise', issuedAt: '2023-05-18', expiresAt: day(23).slice(0, 10), scope: 'PEB and PIB filing at Tanjung Priok, Tanjung Perak and Belawan.', notes: 'Renewal requires a refreshed customs guarantee — start 60 days out.' },
    { id: 'lic_4', kind: 'NVOCC', name: 'NVOCC / house B/L registration', number: 'NVOCC-ID-0448', issuer: 'Directorate General of Sea Transportation', issuedAt: '2022-08-09', expiresAt: '2027-08-08', scope: 'Issue of house bills of lading under the MFI series.' },
    { id: 'lic_5', kind: 'AEO', name: 'Authorised Economic Operator', number: 'AEO-ID-000217', issuer: 'Directorate General of Customs & Excise', issuedAt: '2023-11-02', expiresAt: '2028-11-01', scope: 'Exporter and customs broker, mutual recognition with JP, KR, AU.' },
    { id: 'lic_6', kind: 'IATA_AGENT', name: 'IATA Cargo Agent accreditation', number: 'IATA 15-3-9942', issuer: 'IATA', issuedAt: '2021-06-30', expiresAt: day(-12).slice(0, 10), scope: 'Air freight, CASS-ID settlement.', notes: 'Lapsed — air bookings currently route through a partner agent.' },
    { id: 'lic_7', kind: 'BONDED_WAREHOUSE', name: 'Bonded logistics centre licence (PLB)', number: 'KEP-118/WBC.07/2024', issuer: 'Customs Regional Office Jakarta', issuedAt: '2024-04-22', expiresAt: '2029-04-21', scope: 'Cikarang facility, 4,200 m².' },
    { id: 'lic_8', kind: 'TAX_REGISTRATION', name: 'Taxable entrepreneur (PKP) confirmation', number: 'PEM-00412/WPJ.21/KP.0403/2019', issuer: 'Directorate General of Taxes', issuedAt: '2019-04-02', scope: 'VAT invoicing at 11%.' },
    { id: 'lic_9', kind: 'MEMBERSHIP', name: 'FIATA membership', number: 'FIATA-ID-0227', issuer: 'FIATA via ALFI', issuedAt: '2020-01-15', expiresAt: day(118).slice(0, 10), scope: 'FIATA FBL issuance and the overseas agent network.' },
    { id: 'lic_10', kind: 'MEMBERSHIP', name: 'ALFI membership', number: 'ALFI/DKI/1188', issuer: 'Indonesian Logistics & Forwarders Association', issuedAt: '2019-05-20', expiresAt: '2027-05-19', scope: 'Standard trading conditions and tariff reference.' },
  ],
  branches: [
    { id: 'brn_1', code: 'HO-JKT', name: 'Jakarta Head Office', city: 'Jakarta', countryCode: 'ID', addressLine: 'Meridian Tower 12F, Jl. Yos Sudarso Kav. 88, Tanjung Priok', phone: '+62 21 5099 1200', email: 'jakarta@meridianfreight.com', managerName: 'Elena Marchetti', isHeadOffice: true, servesPorts: ['IDTPP'], headcount: 46 },
    { id: 'brn_2', code: 'BR-SUB', name: 'Surabaya Branch', city: 'Surabaya', countryCode: 'ID', addressLine: 'Jl. Perak Timur 212, Blok C, Surabaya 60165', phone: '+62 31 3300 4455', email: 'surabaya@meridianfreight.com', managerName: 'Priya Nair', isHeadOffice: false, servesPorts: ['IDSUB', 'IDSRG'], headcount: 18 },
    { id: 'brn_3', code: 'BR-MES', name: 'Medan Branch', city: 'Medan', countryCode: 'ID', addressLine: 'Jl. Yos Sudarso KM 8.5, Belawan, Medan 20411', phone: '+62 61 6941 2200', email: 'medan@meridianfreight.com', managerName: 'Liam Okoro', isHeadOffice: false, servesPorts: ['IDBLW'], headcount: 11 },
    { id: 'brn_4', code: 'BR-DPS', name: 'Denpasar Branch', city: 'Denpasar', countryCode: 'ID', addressLine: 'Jl. By Pass Ngurah Rai 455, Sanur, Denpasar 80228', phone: '+62 361 720 1188', email: 'bali@meridianfreight.com', managerName: 'Tomas Weber', isHeadOffice: false, servesPorts: ['IDTPP'], headcount: 9 },
    { id: 'brn_5', code: 'BR-MAK', name: 'Makassar Desk', city: 'Makassar', countryCode: 'ID', addressLine: 'Jl. Nusantara 15, Makassar 90173', phone: '+62 411 322 4400', email: 'makassar@meridianfreight.com', managerName: 'Marcus Bell', isHeadOffice: false, servesPorts: ['IDMAK'], headcount: 6 },
  ],
  bankAccounts: [
    { id: 'bnk_1', label: 'Operating account — IDR', bankName: 'Bank Mandiri', accountName: 'PT Meridian Freight International', accountNumber: '122-00-4471882-3', swift: 'BMRIIDJA', currency: 'IDR', branchCode: 'HO-JKT', isPrimary: true },
    { id: 'bnk_2', label: 'Collections — USD', bankName: 'Bank Mandiri', accountName: 'PT Meridian Freight International', accountNumber: '122-00-4471883-1', swift: 'BMRIIDJA', currency: 'USD', branchCode: 'HO-JKT', isPrimary: false },
    { id: 'bnk_3', label: 'Collections — EUR', bankName: 'Bank Central Asia', accountName: 'PT Meridian Freight International', accountNumber: '206-311-9080', swift: 'CENAIDJA', currency: 'EUR', branchCode: 'HO-JKT', isPrimary: false },
    { id: 'bnk_4', label: 'Surabaya operating float', bankName: 'Bank Negara Indonesia', accountName: 'PT Meridian Freight International', accountNumber: '088-774-2210', swift: 'BNINIDJA', currency: 'IDR', branchCode: 'BR-SUB', isPrimary: false },
  ],
}

/* ================================================================
   JOB SERVICES — what each live job actually bought
   ================================================================ */

/** Jobs where the client refused, or the treatment failed, so the gate has teeth. */
const OVERRIDES: Record<string, { code: string; status: JobService['status']; remarks: string }[]> = {
  prj_14: [{ code: 'FUMI-MB', status: 'DECLINED', remarks: 'Shipper refused the treatment to save cost, insisting the crates are heat-treated already. No HT stamp is visible in the warehouse photographs — escalated to the commercial manager, and the refusal is on the record.' }],
  prj_4: [{ code: 'PHYTO', status: 'DECLINED', remarks: 'Shipper wanted to use their own quarantine agent. Reinstated after the agent missed the sampling window.' }],
  prj_11: [{ code: 'AU-BMSB', status: 'FAILED', remarks: 'First treatment failed the post-treatment inspection; provider re-booked for the following morning.' }],
  prj_5: [{ code: 'ICC-A', status: 'DECLINED', remarks: 'Client carries its own open policy and supplied the certificate directly.' }],
}

const STATUS_BY_STAGE: Record<string, JobService['status']> = {
  INQUIRY: 'PROPOSED', BOOKING: 'ACCEPTED', CARGO_PLAN: 'BOOKED', DOCUMENTATION: 'IN_PROGRESS',
  STUFFING: 'COMPLETED', DEPARTURE: 'COMPLETED', ARRIVAL: 'COMPLETED', SETTLEMENT: 'COMPLETED',
}

export const jobServices: JobService[] = []
let sIdx = 0
for (const p of projects) {
  const recs = recommendServices(p, containers, [])
  const overrides = OVERRIDES[p.id] ?? []
  /* mandatory always lands on the job; suggestions land on about half of them */
  const take = recs.filter((r) => r.mandatory || overrides.some((o) => o.code === r.service.code) || rnd() < 0.45)
  for (const r of take) {
    sIdx++
    const o = overrides.find((x) => x.code === r.service.code)
    const status = o?.status ?? STATUS_BY_STAGE[p.stage] ?? 'PROPOSED'
    const done = status === 'COMPLETED'
    const own = containers.filter((c) => c.projectId === p.id)
    const qty = r.service.basis === 'PER_CONTAINER' ? Math.max(1, own.length)
      : r.service.basis === 'PER_CBM' ? Math.max(1, Math.round(own.length * 24))
      : r.service.basis === 'PERCENT_OF_VALUE' ? p.cargoValue / 100
      : 1
    jobServices.push({
      id: `jsv_${sIdx}`,
      projectId: p.id,
      serviceId: r.service.id,
      code: r.service.code,
      name: r.service.name,
      status,
      mandatory: r.mandatory,
      reason: r.mandatory ? `Required: ${r.reasons.join(', ')}` : `Offered: ${r.reasons.join(', ')}`,
      quantity: qty,
      buyRate: r.service.buyRate,
      sellRate: r.service.sellRate,
      currency: r.service.currency,
      providerPartnerId: r.service.providerPartnerId,
      scheduledAt: status === 'PROPOSED' ? undefined : day(-int(2, 26)),
      completedAt: done ? day(-int(1, 20)) : undefined,
      certificateNo: done && r.service.producesDocument ? `${r.service.code}/26/${int(1000, 9999)}` : undefined,
      remarks: o?.remarks,
    })
  }
}

/* ================================================================
   INCIDENTS — the negative cases, with what was done about them
   ================================================================ */

const act = (n: number, at: number, action: string, actor: string, outcome?: string): IncidentAction => ({
  id: `iac_${n}`, at: day(at, 10), action, actor, outcome,
})

export const incidents: Incident[] = [
  {
    id: 'inc_1', reference: 'INC-2026-0041', projectId: 'prj_4', type: 'ROLLOVER',
    severity: 'HIGH', status: 'ACTION_TAKEN',
    title: 'Two 40HC rolled from CMA CGM Lyra 0034W',
    detail: 'Carrier confirmed the allocation was cut on the day of the cut-off. Both containers were already gated in and sat at the terminal awaiting the next service.',
    detectedAt: day(-6, 15), liableParty: 'CARRIER', partnerId: 'ptr_3',
    costImpact: 18_400_000, recoveryExpected: 12_000_000, recoveryReceived: 0, currency: 'IDR',
    claimRef: 'CL/CMA/26/0117', claimFiledAt: day(-4),
    rootCause: 'Carrier overbooked the Hamburg string during the peak season window.',
    preventiveAction: 'Move Hamburg volume to a second carrier and stop accepting a single-carrier allocation above 4 TEU per sailing.',
    owner: 'Marcus Bell',
    actions: [
      act(1, -6, 'Carrier confirmed the rollover in writing and offered the following week’s sailing.', 'Marcus Bell', 'Next sailing secured, ETD +7 days.'),
      act(2, -5, 'Client notified with the revised ETA and the L/C latest shipment date checked.', 'Sofia Reyes', 'L/C expires after the revised ETD — no amendment needed.'),
      act(3, -4, 'Storage and re-gate charges claimed from the carrier.', 'David Chen', 'Claim acknowledged, under review.'),
    ],
  },
  {
    id: 'inc_2', reference: 'INC-2026-0040', projectId: 'prj_2', containerId: 'ctn_7', type: 'GATE_REJECTED',
    severity: 'MEDIUM', status: 'RESOLVED',
    title: 'Gate-in refused — container number mismatch on the VGM submission',
    detail: 'The container number keyed onto the VGM carried a transposed check digit, so the terminal system found no matching VGM against the unit presented at the gate.',
    detectedAt: day(-12, 6), resolvedAt: day(-12, 11), liableParty: 'FORWARDER',
    costImpact: 2_100_000, recoveryExpected: 0, recoveryReceived: 0, currency: 'IDR',
    rootCause: 'Container number transcribed by hand from a depot slip without a check-digit validation.',
    preventiveAction: 'The container register now rejects any ISO 6346 number that fails the check digit before it can be saved.',
    owner: 'Priya Nair',
    actions: [
      act(4, -12, 'Corrected the container number and re-submitted the VGM.', 'Priya Nair', 'Accepted by the terminal 40 minutes later.'),
      act(5, -12, 'Truck re-gated within the same cut-off window.', 'Tomas Weber', 'No rollover — one truck waiting charge absorbed.'),
    ],
  },
  {
    id: 'inc_3', reference: 'INC-2026-0039', projectId: 'prj_1', type: 'CUSTOMS_HOLD',
    severity: 'HIGH', status: 'AWAITING_PARTY',
    title: 'Jalur merah — physical inspection ordered on the Rotterdam furniture consignment',
    detail: 'PEB assigned to the red lane. Customs asked for the timber legality certificate (SVLK) alongside the invoice and packing list before releasing the NPE.',
    detectedAt: day(-3, 9), liableParty: 'CUSTOMS',
    costImpact: 9_600_000, recoveryExpected: 0, recoveryReceived: 0, currency: 'IDR',
    rootCause: 'HS 4407 sits under LARTAS; the shipper supplied the SVLK document late.',
    preventiveAction: 'LARTAS commodities now require the permit uploaded at the inquiry stage, before a booking is placed.',
    owner: 'Marcus Bell',
    actions: [
      act(6, -3, 'Inspection attended and the container opened under supervision.', 'Marcus Bell', 'Physical count matched the packing list.'),
      act(7, -2, 'SVLK certificate obtained from the shipper and lodged with the customs office.', 'Priya Nair', 'Awaiting the release decision.'),
      act(8, -1, 'Demurrage exposure logged against the job from day one of the hold.', 'David Chen'),
    ],
  },
  {
    id: 'inc_4', reference: 'INC-2026-0038', projectId: 'prj_9', containerId: 'ctn_18', type: 'CARGO_DAMAGE',
    severity: 'HIGH', status: 'ESCALATED',
    title: 'Water staining on 140 bales of TSNR20 discharged at Busan',
    detail: 'The consignee reported staining on the top tier at devanning. The container passed a pre-stuffing inspection; the roof was found to have a repaired puncture that reopened in transit.',
    detectedAt: day(-22, 14), liableParty: 'CARRIER', partnerId: 'ptr_2',
    costImpact: 214_000_000, recoveryExpected: 190_000_000, recoveryReceived: 60_000_000, currency: 'IDR',
    claimRef: 'CL/ONE/26/0092', claimFiledAt: day(-20),
    rootCause: 'Container supplied with a substandard roof repair; the pre-stuffing check did not include a light test.',
    preventiveAction: 'A light test is now mandatory on every empty accepted for cargo that cannot get wet, and the result is recorded on the container.',
    owner: 'Marcus Bell',
    actions: [
      act(9, -22, 'Notice of loss served on the carrier within 3 days of discharge.', 'Marcus Bell', 'Time bar preserved.'),
      act(10, -21, 'Independent survey commissioned at the destination.', 'Sofia Reyes', 'Survey confirmed water ingress through the roof.'),
      act(11, -14, 'Insurance claim filed under the open policy.', 'David Chen', 'Interim payment of IDR 60,000,000 received.'),
      act(12, -6, 'Carrier disputed liability citing the package limitation.', 'Elena Marchetti', 'Escalated to the insurer’s recovery agent.'),
    ],
  },
  {
    id: 'inc_5', reference: 'INC-2026-0037', projectId: 'prj_6', containerId: 'ctn_14', type: 'TEMPERATURE_DEVIATION',
    severity: 'CRITICAL', status: 'INVESTIGATING',
    title: 'Reefer set point drifted to -12 °C for 9 hours in transit',
    detail: 'The carrier’s reefer log shows the unit ran at -12 °C between the Singapore transhipment and re-plugging on the connecting vessel. Frozen shrimp must be held at -18 °C.',
    detectedAt: day(-4, 8), liableParty: 'CARRIER', partnerId: 'ptr_1',
    costImpact: 96_000_000, recoveryExpected: 96_000_000, recoveryReceived: 0, currency: 'IDR',
    claimRef: 'CL/MSK/26/0146', claimFiledAt: day(-3),
    rootCause: 'Under investigation — the unit appears to have been off-power on the transhipment quay for longer than the carrier’s own plug-in window allows.',
    owner: 'Marcus Bell',
    actions: [
      act(13, -4, 'Full reefer data log requested from the carrier.', 'Priya Nair', 'Log received; deviation confirmed.'),
      act(14, -3, 'Buyer notified and a destination survey arranged before release.', 'Sofia Reyes', 'Buyer agreed not to break the seal until the survey.'),
      act(15, -2, 'Claim registered with the carrier and the cargo insurer in parallel.', 'David Chen'),
    ],
  },
  {
    id: 'inc_6', reference: 'INC-2026-0036', projectId: 'prj_8', type: 'DEMURRAGE',
    severity: 'MEDIUM', status: 'AWAITING_PARTY',
    title: 'Six days demurrage at Savannah disputed with the carrier',
    detail: 'Free time expired while the consignee’s broker waited on a corrected commercial invoice. The carrier invoiced 6 days; 2 of those fell inside a terminal closure.',
    detectedAt: day(-31, 16), liableParty: 'CONSIGNEE',
    costImpact: 34_800_000, recoveryExpected: 11_600_000, recoveryReceived: 0, currency: 'IDR',
    claimRef: 'WAIVER/HL/26/0031',
    rootCause: 'Invoice value did not match the PEB, so the broker could not file the entry.',
    preventiveAction: 'The invoice value is now reconciled against the PEB before the documents are couriered.',
    owner: 'David Chen',
    actions: [
      act(16, -30, 'Waiver requested for the two terminal-closure days.', 'David Chen', 'Carrier reviewing.'),
      act(17, -28, 'Remaining four days re-billed to the consignee.', 'Sofia Reyes', 'Accepted by the consignee.'),
    ],
  },
  {
    id: 'inc_7', reference: 'INC-2026-0035', projectId: 'prj_12', type: 'DOCUMENT_DISCREPANCY',
    severity: 'MEDIUM', status: 'RESOLVED',
    title: 'Bank refused documents — description on the B/L did not match the L/C',
    detail: 'The L/C called for "Robusta green coffee beans, grade 4, crop 2026". The B/L read "green coffee". The presenting bank raised a discrepancy and held payment.',
    detectedAt: day(-17, 11), resolvedAt: day(-13, 15), liableParty: 'FORWARDER',
    costImpact: 7_400_000, recoveryExpected: 0, recoveryReceived: 0, currency: 'IDR',
    rootCause: 'The shipping instruction carried an abbreviated description that nobody checked against the credit.',
    preventiveAction: 'Where an L/C is on the job, its required description is copied onto the shipping instruction and locked.',
    owner: 'Priya Nair',
    actions: [
      act(18, -17, 'Discrepancy notice received from the negotiating bank.', 'David Chen'),
      act(19, -16, 'Carrier amendment requested to correct the description.', 'Priya Nair', 'Amended B/L issued against an amendment fee.'),
      act(20, -13, 'Documents re-presented and accepted.', 'David Chen', 'Payment received on the corrected presentation.'),
    ],
  },
  {
    id: 'inc_8', reference: 'INC-2026-0034', projectId: 'prj_3', type: 'PAYMENT_DEFAULT',
    severity: 'HIGH', status: 'ESCALATED',
    title: 'Consignment settlement overdue 58 days on the Sydney cycle',
    detail: 'The consignment agreement settles monthly on stock sold. Two cycles have passed with no remittance and no sales report from the destination agent.',
    detectedAt: day(-58, 9), liableParty: 'CONSIGNEE',
    costImpact: 148_000_000, recoveryExpected: 148_000_000, recoveryReceived: 42_000_000, currency: 'IDR',
    rootCause: 'Consignment stock was released to the retailer without a countersigned settlement schedule.',
    preventiveAction: 'No further consignment stock ships until the outstanding cycle is settled; the customer credit limit is now enforced at the booking gate.',
    owner: 'Elena Marchetti',
    actions: [
      act(21, -40, 'Statement of account and a settlement demand sent.', 'David Chen', 'Partial payment of IDR 42,000,000 received.'),
      act(22, -20, 'New bookings for the account suspended.', 'Sofia Reyes', 'Credit hold applied.'),
      act(23, -5, 'Referred to the overseas agent for local recovery.', 'Elena Marchetti', 'Agent engaged; unsold stock to be recalled.'),
    ],
  },
  {
    id: 'inc_9', reference: 'INC-2026-0033', projectId: 'prj_10', type: 'SHORT_SHIPPED',
    severity: 'HIGH', status: 'RESOLVED',
    title: 'One of three containers left behind at Tanjung Priok',
    detail: 'The third unit missed the loading list after a last-minute stow change. The B/L was split and the PEB amended for the quantity actually exported.',
    detectedAt: day(-9, 20), resolvedAt: day(-2, 12), liableParty: 'CARRIER', partnerId: 'ptr_1',
    costImpact: 22_500_000, recoveryExpected: 15_000_000, recoveryReceived: 15_000_000, currency: 'IDR',
    claimRef: 'CL/MSK/26/0138',
    rootCause: 'Carrier stow change on sailing day with no notification to the booking party.',
    preventiveAction: 'The loading list is now confirmed against the booking on the morning of departure and the difference raised immediately.',
    owner: 'Marcus Bell',
    actions: [
      act(24, -9, 'Short shipment confirmed against the carrier’s loading list.', 'Marcus Bell'),
      act(25, -8, 'B/L split and the PEB amended for the shipped quantity.', 'Priya Nair', 'Amended PEB accepted by customs.'),
      act(26, -6, 'Balance container re-booked on the next sailing.', 'Marcus Bell', 'Shipped 5 days later.'),
      act(27, -2, 'Carrier credited the re-handling and re-gate costs.', 'David Chen', 'IDR 15,000,000 credited.'),
    ],
  },
  {
    id: 'inc_10', reference: 'INC-2026-0032', projectId: 'prj_7', type: 'CARGO_SHORTAGE',
    severity: 'MEDIUM', status: 'WRITTEN_OFF',
    title: 'Two marble slabs short on the Jebel Ali trial shipment',
    detail: 'The consignee counted 38 slabs against 40 on the packing list. No loading tally was taken, so there is no evidence of what was actually stuffed.',
    detectedAt: day(-26, 13), resolvedAt: day(-11, 16), liableParty: 'FORWARDER',
    costImpact: 31_000_000, recoveryExpected: 0, recoveryReceived: 0, currency: 'IDR',
    rootCause: 'Stuffing went ahead without a supervised tally to save a supervision fee on a trial shipment.',
    preventiveAction: 'Loading supervision is now mandatory on any job over USD 50,000 in declared value, trial or not.',
    owner: 'Marcus Bell',
    actions: [
      act(28, -26, 'Seal integrity checked — the seal was intact on arrival.', 'Marcus Bell', 'Points to a stuffing shortage, not pilferage.'),
      act(29, -20, 'Claim against the carrier declined for want of evidence.', 'David Chen', 'No tally sheet, no case.'),
      act(30, -11, 'Credited to the client as a goodwill settlement and written off.', 'Elena Marchetti', 'Relationship preserved; loss absorbed.'),
    ],
  },
  {
    id: 'inc_11', reference: 'INC-2026-0031', projectId: 'prj_13', type: 'BOOKING_CANCELLED',
    severity: 'MEDIUM', status: 'RESOLVED',
    title: 'Carrier cancelled the Ho Chi Minh booking three days before the cut-off',
    detail: 'Service withdrawn for the week. The empty had already been released and positioned at the shipper’s factory.',
    detectedAt: day(-14, 10), resolvedAt: day(-12, 17), liableParty: 'CARRIER', partnerId: 'ptr_2',
    costImpact: 4_200_000, recoveryExpected: 4_200_000, recoveryReceived: 4_200_000, currency: 'IDR',
    rootCause: 'Carrier blank sailing announced after the booking was confirmed.',
    preventiveAction: 'Empties are no longer released before the booking is re-confirmed 72 hours out.',
    owner: 'Marcus Bell',
    actions: [
      act(31, -14, 'Alternative service secured with a second carrier at the same rate.', 'Marcus Bell', 'ETD held within the client’s window.'),
      act(32, -12, 'Empty repositioning cost recovered from the original carrier.', 'David Chen', 'Credited in full.'),
    ],
  },
  {
    id: 'inc_12', reference: 'INC-2026-0030', projectId: 'prj_11', type: 'CUSTOMER_CANCELLED',
    severity: 'LOW', status: 'RESOLVED',
    title: 'Consignment cycle 8 cut from 40 CBM to 22 CBM after the booking',
    detail: 'The retailer reduced the order after the LCL slot was booked. The consolidation was re-cut and the balance held in the warehouse for the next cycle.',
    detectedAt: day(-7, 11), resolvedAt: day(-5, 14), liableParty: 'SHIPPER',
    costImpact: 3_800_000, recoveryExpected: 3_800_000, recoveryReceived: 3_800_000, currency: 'IDR',
    rootCause: 'Order confirmed by the retailer verbally and revised two days later.',
    preventiveAction: 'Consignment cycles are only booked against a written purchase order.',
    owner: 'Sofia Reyes',
    actions: [
      act(33, -7, 'Consolidation re-cut and the CFS slot reduced.', 'Tomas Weber', 'No dead freight charged.'),
      act(34, -5, 'Storage for the balance re-billed to the shipper.', 'David Chen', 'Accepted and paid.'),
    ],
  },
  {
    id: 'inc_13', reference: 'INC-2026-0029', projectId: 'prj_5', type: 'MISDECLARATION',
    severity: 'CRITICAL', status: 'RESOLVED',
    title: 'Lithium cells found in a consignment declared as passive components',
    detail: 'A pre-stuffing inspection found lithium-ion cells inside cartons declared as connectors and harnesses. The shipment would have travelled as undeclared dangerous goods.',
    detectedAt: day(-19, 9), resolvedAt: day(-15, 12), liableParty: 'SHIPPER',
    costImpact: 12_600_000, recoveryExpected: 12_600_000, recoveryReceived: 12_600_000, currency: 'IDR',
    rootCause: 'Shipper’s packing list was generated from a sales order, not from what was actually packed.',
    preventiveAction: 'Electronics shippers must supply an MSDS and a UN38.3 test summary at the booking stage.',
    owner: 'Marcus Bell',
    actions: [
      act(35, -19, 'Stuffing stopped and the cargo quarantined at the CFS.', 'Tomas Weber', 'Nothing shipped undeclared.'),
      act(36, -18, 'Shipper required to reclassify and provide the DG declaration and MSDS.', 'Priya Nair', 'UN3481 declared, class 9.'),
      act(37, -15, 'Re-booked on a DG-accepting service; the re-work cost was billed to the shipper.', 'Marcus Bell', 'Paid in full.'),
    ],
  },
  {
    id: 'inc_14', reference: 'INC-2026-0028', projectId: 'prj_1', type: 'DETENTION',
    severity: 'LOW', status: 'OPEN',
    title: 'Empty return running two days past free time at Rotterdam',
    detail: 'The consignee’s haulier has not returned two empties. Detention accrues at EUR 45 per container per day after the fifth day.',
    detectedAt: day(-1, 16), liableParty: 'CONSIGNEE',
    costImpact: 1_600_000, recoveryExpected: 1_600_000, recoveryReceived: 0, currency: 'IDR',
    owner: 'Sofia Reyes',
    actions: [act(38, -1, 'Destination agent asked to chase the empty return daily.', 'Sofia Reyes')],
  },
  {
    id: 'inc_15', reference: 'INC-2026-0027', projectId: 'prj_14', type: 'VESSEL_OMISSION',
    severity: 'HIGH', status: 'INVESTIGATING',
    title: 'Vessel omitted Tanjung Priok and will load at Singapore instead',
    detail: 'The carrier announced a port omission after the booking was confirmed. The containers must now be feedered to Singapore, which moves the cut-offs forward by four days.',
    detectedAt: day(-2, 12), liableParty: 'CARRIER', partnerId: 'ptr_3',
    costImpact: 26_000_000, recoveryExpected: 18_000_000, recoveryReceived: 0, currency: 'IDR',
    rootCause: 'Schedule recovery after a typhoon delay on the North Asia leg.',
    owner: 'Marcus Bell',
    actions: [
      act(39, -2, 'Revised cut-offs pushed onto the job and the shipper warned.', 'Marcus Bell', 'Stuffing brought forward by three days.'),
      act(40, -1, 'Feeder cost quoted and lodged with the carrier for recovery.', 'David Chen'),
    ],
  },
  {
    id: 'inc_16', reference: 'INC-2026-0026', projectId: 'prj_3', type: 'RETURN_TO_ORIGIN',
    severity: 'CRITICAL', status: 'RESOLVED',
    title: 'Untreated timber packaging refused entry in Australia',
    detail: 'Australian biosecurity found untreated timber dunnage inside a consignment declared as plastic-packed. The container was directed offshore for treatment and re-export.',
    detectedAt: day(-46, 7), resolvedAt: day(-28, 15), liableParty: 'SHIPPER',
    costImpact: 118_000_000, recoveryExpected: 118_000_000, recoveryReceived: 88_000_000, currency: 'IDR',
    rootCause: 'The shipper substituted timber dunnage at the last minute without telling the desk, so no ISPM-15 treatment was booked.',
    preventiveAction: 'Fumigation is now a mandatory, non-removable service on every Australian and New Zealand destination, and the packaging declaration is checked at the stuffing supervision.',
    owner: 'Elena Marchetti',
    actions: [
      act(41, -46, 'Biosecurity direction received; options costed — treat offshore, destroy, or return.', 'Marcus Bell', 'Offshore treatment chosen as the cheapest lawful route.'),
      act(42, -40, 'Container returned to origin, treated and re-exported.', 'Marcus Bell', 'Cleared on the second presentation.'),
      act(43, -28, 'Cost recovered from the shipper less a commercial contribution.', 'Elena Marchetti', 'IDR 88,000,000 recovered; the balance absorbed to keep the account.'),
    ],
  },
]

/* ================================================================
   DOCUMENT STANDARD VALUES
   ----------------------------------------------------------------
   Fill the governed fields on every document that has progressed past
   draft, leaving deliberate gaps on a few so the completeness check
   has something real to report.
   ================================================================ */

const SAMPLE: Record<string, (docNo: string) => string> = {
  invoiceNo: (d) => `${d || 'INV/26/0000'} · 2026-08-14`,
  incoterm: () => 'FOB Tanjung Priok (Incoterms 2020)',
  currency: () => 'USD',
  paymentTerms: () => 'Irrevocable L/C at sight',
  originCountry: () => 'Indonesia',
  signature: () => 'Signed — Elena Marchetti, Managing Director',
  freightTerm: () => 'Freight prepaid',
  freightClause: () => 'Freight prepaid as arranged',
  blType: () => 'Original 3/3, shipper approval on file',
  originals: () => '3/3 originals issued',
  method: () => 'Method 2 — calculated',
  terms: () => 'Subject to ALFI Standard Trading Conditions',
}

const genericValue = (key: string, docNo: string) =>
  SAMPLE[key] ? SAMPLE[key](docNo) : `Captured from the job file (${docNo || 'draft'})`

/* Some documents are deliberately left short of their own standard — and they
   are chosen from among the ones already marked approved or issued, because a
   gap on a draft is just work in progress, while a gap on an issued document
   is what a bank or a customs office rejects. */
const SETTLED = ['APPROVED', 'ISSUED', 'SURRENDERED']
const shortlist = new Set(
  documents
    .filter((d) => SETTLED.includes(d.status) && docFieldSpecs(d.type).length > 0)
    .filter((_, i) => i % 19 === 3)
    .map((d) => d.id),
)

for (const doc of documents) {
  const specs = docFieldSpecs(doc.type)
  if (!specs.length) continue
  if (doc.status === 'REQUIRED') continue
  const short = shortlist.has(doc.id)
  const required = specs.filter((s) => s.required)
  /* on a shorted document, drop the last two mandatory fields */
  const skip = short ? new Set(required.slice(-2).map((s) => s.key)) : new Set<string>()
  doc.fields = specs
    .filter((s) => !skip.has(s.key))
    .filter((s) => s.required || doc.status !== 'DRAFT')
    .map((s) => ({ key: s.key, value: genericValue(s.key, doc.docNo ?? '') }))
}

export const SERVICE_CATALOGUE = ADDITIONAL_SERVICES

/* ================================================================
   STUFFING — one event per container that has one, plus the ones
   still on the schedule ahead
   ================================================================ */

const STUFF_SUPERVISORS = ['Tomas Weber', 'Agus Setiawan', 'Rina Hartati', 'Bayu Nugroho', 'Dewi Kartika']
const TALLY_CLERKS = ['Hendra Wijaya', 'Sari Melati', 'Joko Prasetyo', 'Lina Kusuma']
const HAULIERS = ['B 9214 KZU', 'L 8877 UGF', 'BK 1042 XN', 'DK 7731 AB', 'B 9508 TRP']
const DRIVERS = ['Slamet Riyadi', 'Ujang Suherman', 'Marno Hadi', 'Wayan Sudira', 'Iwan Setiabudi']

const LOCATION_FOR: Record<string, { type: StuffingLocationType; address: string }> = {
  FACTORY: { type: 'FACTORY', address: 'Kawasan Industri Jababeka II, Blok C, Cikarang' },
  CFS: { type: 'CFS', address: 'Jl. Raya Cakung Cilincing KM 3, Jakarta Utara' },
  DEPOT: { type: 'DEPOT', address: 'Jl. Yos Sudarso Kav. 22, Tanjung Priok' },
  WAREHOUSE: { type: 'WAREHOUSE', address: 'Jl. Rungkut Industri III/44, Surabaya' },
}

/** The place a crew is actually sent to, named so a driver could find it. */
const locationName = (type: StuffingLocationType, shipperName: string, city: string) => {
  const shipper = shipperName.replace(/^PT /, '').split(' ').slice(0, 2).join(' ')
  switch (type) {
    case 'FACTORY': return `${shipper} — ${city} plant`
    case 'CFS': return 'Meridian CFS Cakung'
    case 'DEPOT': return 'Depo Graha Segara'
    case 'WAREHOUSE': return `${shipper} — ${city} warehouse`
    default: return `${city} port yard`
  }
}

/** Container status tells us how far the stuffing got. */
const STUFF_STATUS_BY_CONTAINER: Record<string, StuffingStatus> = {
  PLANNED: 'PLANNED',
  BOOKED: 'PLANNED',
  AT_DEPOT: 'EMPTY_RELEASED',
  STUFFED: 'SEALED',
  GATE_IN: 'GATE_IN',
  LOADED: 'COMPLETED',
  IN_TRANSIT: 'COMPLETED',
  DISCHARGED: 'COMPLETED',
  DELIVERED: 'COMPLETED',
  RETURNED: 'COMPLETED',
}

export const stuffingJobs: StuffingJob[] = []
let stfIdx = 0

for (const c of containers) {
  const p = projects.find((x) => x.id === c.projectId)
  if (!p) continue
  stfIdx++

  const status = STUFF_STATUS_BY_CONTAINER[c.status] ?? 'PLANNED'
  const done = ['SEALED', 'GATE_IN', 'COMPLETED'].includes(status)

  /* LCL consolidates at our own CFS; a full container usually goes to the shipper */
  const locKey = c.type === 'LCL' ? 'CFS' : p.polCode === 'IDSUB' ? 'WAREHOUSE' : rnd() < 0.7 ? 'FACTORY' : 'DEPOT'
  const loc = LOCATION_FOR[locKey]
  const shipper = customers.find((x) => x.id === p.shipperId)
  const office = shipper?.offices.find((o) => o.id === p.shipperOfficeId)

  const packages = c.items.reduce((a, i) => a + i.quantity, 0)
  const cbm = c.items.reduce((a, i) => a + ((i.lengthCm * i.widthCm * i.heightCm) / 1_000_000) * i.quantity, 0)

  /* two units come up short against the packing list — that is what a tally is for */
  const shortBy = stfIdx === 6 ? 14 : stfIdx === 19 ? 3 : 0

  /* Work that has happened keeps the container's own date. Work that has not
     is scheduled ahead — a container waiting to be stuffed cannot have a date
     three weeks in the past and still be waiting. */
  const stuffedAt = done
    ? status === 'SEALED'
      /* Sealed but not yet gated in: this only makes sense as recent work —
         a box sealed a month ago and still sitting is a different problem. */
      ? day(-int(0, 3))
      : (c.stuffingDate ?? day(-int(2, 20)))
    : day(int(1, 13))
  /* A stuffing that already happened was, by definition, done before its own
     cut-off — otherwise the box would not be on the water. Anything still open
     keeps the job's real cut-off so the check has something to bite on. */
  const jobCutoff = p.gateInCutoff ?? day(int(2, 14), 16)
  const cutoff = done
    ? new Date(new Date(stuffedAt).getTime() + int(1, 3) * 86_400_000).toISOString()
    : jobCutoff

  stuffingJobs.push({
    id: `stf_${stfIdx}`,
    reference: `STF-2026-${String(1000 + stfIdx).slice(1)}`,
    projectId: p.id,
    containerId: c.id,
    stuffingDate: stuffedAt,
    shift: (['MORNING', 'AFTERNOON', 'NIGHT'] as const)[int(0, 2)],
    startTime: done ? '08:15' : undefined,
    endTime: done ? '12:40' : undefined,
    locationType: loc.type,
    locationName: locationName(loc.type, shipper?.legalName ?? 'Shipper', office?.city ?? p.polName),
    addressLine: loc.address,
    polCode: p.polCode,
    polName: p.polName,
    terminal: p.polCode === 'IDTPP' ? 'JICT Terminal 2' : p.polCode === 'IDSUB' ? 'TPS Terminal' : undefined,
    depot: c.depot,
    emptyReleaseDate: status === 'PLANNED' ? undefined : day(-int(1, 3)),
    truckPlate: status === 'PLANNED' ? undefined : HAULIERS[int(0, HAULIERS.length - 1)],
    driverName: status === 'PLANNED' ? undefined : DRIVERS[int(0, DRIVERS.length - 1)],
    supervisor: STUFF_SUPERVISORS[int(0, STUFF_SUPERVISORS.length - 1)],
    tallyClerk: done ? TALLY_CLERKS[int(0, TALLY_CLERKS.length - 1)] : undefined,
    labourCount: c.type === 'LCL' ? int(3, 5) : int(6, 10),
    plannedPackages: packages,
    stuffedPackages: done ? packages - shortBy : 0,
    plannedCbm: +cbm.toFixed(2),
    stuffedCbm: done ? +(cbm - shortBy * 0.35).toFixed(2) : 0,
    sealNo: c.sealNo,
    sealedAt: done ? stuffedAt : undefined,
    photosTaken: done ? int(6, 14) : 0,
    tallySheetRef: done ? `TLY/26/${int(1000, 9999)}` : undefined,
    gateInCutoff: cutoff,
    gateInAt: c.gateInDate,
    status,
    remarks:
      shortBy > 0
        ? `Tally came up ${shortBy} packages short of the packing list. Stuffing held while the shipper recounted; the balance was never produced.`
        : loc.type === 'FACTORY' && status === 'PLANNED'
          ? 'Shipper has not confirmed the loading bay slot — chase the day before.'
          : undefined,
  })
}

/* one job is scheduled after its own gate-in cut-off, which should never pass review */
const tooLate = stuffingJobs.find((s) => s.status === 'PLANNED')
if (tooLate?.gateInCutoff) {
  const d = new Date(tooLate.gateInCutoff)
  d.setDate(d.getDate() + 1)
  tooLate.stuffingDate = d.toISOString()
  tooLate.remarks = 'Booked into the yard a day after the terminal cut-off — needs re-planning or the box will roll.'
}

/* ================================================================
   FIELD COST SETTLEMENTS
   Cash advanced to the operators, and what came back with receipts.
   ================================================================ */
for (const c of charges) {
  if (c.costType !== 'FIELD') continue
  /* Field cash is handed over in rupiah at the port, whatever currency the
     line is quoted in — so the advance is the IDR equivalent, not the figure. */
  const cost = c.buyRate * c.quantity * (c.fxRate || 1)
  /* most are settled; a few are still out, which is what finance chases */
  const outstanding = charges.indexOf(c) % 7 === 2
  c.settlement = {
    advanceAmount: Math.round((cost * 1.1) / 1000) * 1000,
    advancedAt: day(-int(4, 20)),
    advancedTo: STUFF_SUPERVISORS[int(0, STUFF_SUPERVISORS.length - 1)],
    settledAmount: outstanding ? 0 : Math.round(cost / 1000) * 1000,
    settledAt: outstanding ? undefined : day(-int(1, 10)),
    receiptNo: outstanding ? undefined : `KW/26/${int(1000, 9999)}`,
  }
}
