/**
 * Master data — the company, its people, its buyers, its suppliers, the item
 * catalogue and the seven places stock can sit.
 *
 * These are the records a user reads rather than scrolls past, so they are
 * written out rather than generated.
 */
import type {
  BankAccount, Buyer, CompanyLicence, CompanyProfile, Contact, Item, PasswordResetToken, Supplier,
  UserAccount, Warehouse,
} from './types'
import { day, stamp } from './clock'

const DEMO_PASSWORD = 'Kriyanusa#2026'

/* ==================================================================
   The company
   ================================================================== */

const licences: CompanyLicence[] = [
  { id: 'lic_nib', kind: 'BUSINESS_REGISTRATION', reference: 'NIB 0220 4102 8871', issuer: 'OSS RBA', issuedAt: day(-2190), expiresAt: day(1460), note: 'KBLI 31001 — wooden furniture manufacturing.' },
  { id: 'lic_npwp', kind: 'TAX_REGISTRATION', reference: '01.884.512.3-506.000', issuer: 'DJP Kanwil Jateng I', issuedAt: day(-4380), expiresAt: day(3650) },
  { id: 'lic_eksp', kind: 'EXPORTER_ID', reference: 'API-P 092107 / NIK 33.20.1.31001', issuer: 'Kementerian Perdagangan', issuedAt: day(-1825), expiresAt: day(540) },
  { id: 'lic_svlk', kind: 'SVLK', reference: 'LVLK-011/SVLK/2024/0387', issuer: 'PT Mutuagung Lestari (LVLK)', issuedAt: day(-620), expiresAt: day(475), note: 'Surveillance audit due nine months before expiry.' },
  { id: 'lic_fsc', kind: 'FSC_COC', reference: 'FSC-C168420 (CoC, Mixed Credit)', issuer: 'SGS', issuedAt: day(-410), expiresAt: day(48), note: 'Renewal audit not yet booked — three buyers sell this range as certified.' },
  { id: 'lic_ispm', kind: 'ISPM15_FUMIGATION', reference: 'ID-3320-HT-0114', issuer: 'Barantan (registered HT provider)', issuedAt: day(-300), expiresAt: day(430) },
  { id: 'lic_iui', kind: 'INDUSTRIAL_PERMIT', reference: 'IUI 503/1147/2021', issuer: 'DPMPTSP Kabupaten Jepara', issuedAt: day(-1550), expiresAt: day(920) },
  { id: 'lic_ling', kind: 'ENVIRONMENTAL', reference: 'PKKPR-UKL/UPL 660.1/288', issuer: 'DLH Kabupaten Jepara', issuedAt: day(-1100), expiresAt: day(365) },
  { id: 'lic_asmindo', kind: 'MEMBERSHIP', reference: 'ASMINDO Jateng 33.20.0412', issuer: 'ASMINDO', issuedAt: day(-1900), expiresAt: day(210) },
]

const bankAccounts: BankAccount[] = [
  { id: 'bank_1', bankName: 'Bank Mandiri KCP Jepara', accountName: 'PT Kriyanusa Jati Lestari', accountNo: '136-00-0918442-7', currency: 'IDR', primary: true },
  { id: 'bank_2', bankName: 'Bank Mandiri KCP Jepara', accountName: 'PT Kriyanusa Jati Lestari', accountNo: '136-00-0918450-1', currency: 'USD', swift: 'BMRIIDJA' },
  { id: 'bank_3', bankName: 'BNI Semarang Trade Centre', accountName: 'PT Kriyanusa Jati Lestari', accountNo: '0771 448 926', currency: 'EUR', swift: 'BNINIDJA' },
]

export const company: CompanyProfile = {
  legalName: 'PT Kriyanusa Jati Lestari',
  tradingName: 'Kriyanusa Furniture',
  taxId: '01.884.512.3-506.000',
  registrationNo: 'NIB 0220 4102 8871',
  exporterId: 'API-P 092107',
  foundedYear: 2006,
  addressLine: 'Jl. Raya Jepara–Kudus KM 9, Desa Rengging, Pecangaan',
  city: 'Jepara',
  province: 'Jawa Tengah',
  countryCode: 'ID',
  phone: '+62 291 755 4120',
  email: 'export@kriyanusa.co.id',
  website: 'kriyanusa.co.id',
  workshopCount: 4,
  headcount: 218,
  licences,
  bankAccounts,
}

/* ==================================================================
   People
   ================================================================== */

const user = (
  id: string, fullName: string, email: string, jobTitle: string,
  role: UserAccount['role'], department: string,
  extra: Partial<UserAccount> = {},
): UserAccount => ({
  id,
  email,
  password: DEMO_PASSWORD,
  fullName,
  jobTitle,
  role,
  status: 'ACTIVE',
  department,
  phone: '+62 291 755 41' + id.slice(-2),
  failedAttempts: 0,
  mustChangePassword: false,
  twoFactorEnabled: role === 'ADMIN' || role === 'FINANCE',
  lastLoginAt: stamp(-1, 8, 12),
  createdAt: stamp(-900, 9),
  ...extra,
})

export const users: UserAccount[] = [
  user('usr_01', 'Rahmat Nugroho', 'rahmat.nugroho@kriyanusa.co.id', 'Managing director', 'ADMIN', 'Board'),
  user('usr_02', 'Sari Wulandari', 'sari.wulandari@kriyanusa.co.id', 'Export sales manager', 'SALES', 'Commercial'),
  user('usr_03', 'Dimas Prasetyo', 'dimas.prasetyo@kriyanusa.co.id', 'Export sales executive', 'SALES', 'Commercial'),
  user('usr_04', 'Ika Puspitasari', 'ika.puspitasari@kriyanusa.co.id', 'Senior estimator', 'ESTIMATOR', 'Costing'),
  user('usr_05', 'Bagas Setiawan', 'bagas.setiawan@kriyanusa.co.id', 'Purchasing manager', 'PURCHASING', 'Supply chain'),
  user('usr_06', 'Nur Aini', 'nur.aini@kriyanusa.co.id', 'Purchasing officer', 'PURCHASING', 'Supply chain'),
  user('usr_07', 'Yusuf Maulana', 'yusuf.maulana@kriyanusa.co.id', 'Warehouse supervisor', 'WAREHOUSE', 'Logistics'),
  user('usr_08', 'Tri Handoko', 'tri.handoko@kriyanusa.co.id', 'Production manager', 'PRODUCTION', 'Manufacturing'),
  user('usr_09', 'Lestari Wijaya', 'lestari.wijaya@kriyanusa.co.id', 'Finance manager', 'FINANCE', 'Finance'),
  user('usr_10', 'Fajar Ramadhan', 'fajar.ramadhan@kriyanusa.co.id', 'Export & compliance officer', 'EXPORT', 'Commercial'),
  user('usr_11', 'Anita Kusuma', 'anita.kusuma@kriyanusa.co.id', 'QC inspector', 'PRODUCTION', 'Manufacturing', {
    status: 'PENDING_VERIFICATION', lastLoginAt: undefined, createdAt: stamp(-4, 10),
  }),
  user('usr_12', 'Gilang Saputra', 'gilang.saputra@kriyanusa.co.id', 'Warehouse clerk', 'WAREHOUSE', 'Logistics', {
    status: 'LOCKED', failedAttempts: 5, lockedUntil: stamp(0, 23, 30),
  }),
  user('usr_13', 'Bambang Riyadi', 'bambang.riyadi@kriyanusa.co.id', 'Former purchasing officer', 'PURCHASING', 'Supply chain', {
    status: 'SUSPENDED', lastLoginAt: stamp(-92, 15),
  }),
  user('usr_14', 'Citra Halim', 'citra.halim@kriyanusa.co.id', 'Junior estimator', 'ESTIMATOR', 'Costing', {
    status: 'INVITED', lastLoginAt: undefined, createdAt: stamp(-9, 11),
  }),
  user('usr_15', 'Ratna Dewi', 'ratna.dewi@kriyanusa.co.id', 'Auditor (read only)', 'VIEWER', 'Board'),
]

export const resetTokens: PasswordResetToken[] = [
  { token: 'KRN-2F41-9C08', email: 'yusuf.maulana@kriyanusa.co.id', issuedAt: stamp(0, 7, 40), expiresAt: stamp(0, 23, 59), used: false },
  { token: 'KRN-77A2-1D5E', email: 'lestari.wijaya@kriyanusa.co.id', issuedAt: stamp(-3, 14), expiresAt: stamp(-3, 14, 30), used: false },
  { token: 'KRN-B103-44FF', email: 'dimas.prasetyo@kriyanusa.co.id', issuedAt: stamp(-11, 9), expiresAt: stamp(-11, 9, 30), used: true },
]

export const demoPassword = DEMO_PASSWORD

/* ==================================================================
   Warehouses
   ================================================================== */

const bins = (zone: string, count: number, cap: number) =>
  Array.from({ length: count }, (_, i) => ({
    code: `${zone}-${String(i + 1).padStart(2, '0')}`,
    zone,
    description: `${zone} rack ${i + 1}`,
    capacityM3: cap,
  }))

export const warehouses: Warehouse[] = [
  {
    id: 'wh_rm', code: 'WH-RM', name: 'Gudang Bahan Baku', type: 'RAW_MATERIAL',
    city: 'Jepara', addressLine: 'Blok A — Jl. Raya Jepara–Kudus KM 9', capacityM3: 1400,
    managerName: 'Yusuf Maulana', bins: [...bins('A', 8, 90), ...bins('B', 6, 70)], active: true,
    note: 'Sawn timber as delivered, panel, and everything waiting on the kiln.',
  },
  {
    id: 'wh_kd', code: 'WH-KD', name: 'Kiln & Dry Store', type: 'KILN_DRY',
    city: 'Jepara', addressLine: 'Blok B — kiln chambers 1–4', capacityM3: 640,
    managerName: 'Yusuf Maulana', bins: [...bins('K', 4, 80), ...bins('D', 6, 55)], active: true,
    note: 'Four chambers. Nothing leaves above 12% moisture.',
  },
  {
    id: 'wh_wip', code: 'WH-WIP', name: 'Workshop WIP Store', type: 'WORK_IN_PROGRESS',
    city: 'Jepara', addressLine: 'Blok C — between machining and finishing', capacityM3: 380,
    managerName: 'Tri Handoko', bins: bins('C', 10, 34), active: true,
    note: 'Components between benches, held against a work order.',
  },
  {
    id: 'wh_fg', code: 'WH-FG', name: 'Gudang Barang Jadi', type: 'FINISHED_GOODS',
    city: 'Jepara', addressLine: 'Blok D — packing hall and loading bay', capacityM3: 900,
    managerName: 'Yusuf Maulana', bins: [...bins('F', 12, 60), ...bins('L', 4, 45)], active: true,
    note: 'Packed goods, allocated by container.',
  },
  {
    id: 'wh_srg', code: 'WH-SRG', name: 'Semarang Staging Depot', type: 'FINISHED_GOODS',
    city: 'Semarang', addressLine: 'Kawasan Industri Terboyo Blok J-4', capacityM3: 420,
    managerName: 'Gilang Saputra', bins: bins('S', 6, 65), active: true,
    note: 'Rented bay near Tanjung Emas for consolidating part loads before stuffing.',
  },
  {
    id: 'wh_sub', code: 'WH-SUB', name: 'Subcon — Mulyo Karya', type: 'SUBCON',
    city: 'Bangsri', addressLine: 'Desa Kedungleper RT 03 / RW 02', capacityM3: 220,
    managerName: 'Sutrisno (Mulyo Karya)', supplierId: 'sup_14', bins: bins('M', 4, 50), active: true,
    note: 'Our timber, their shed. Carving and assembly on borongan terms.',
  },
  {
    id: 'wh_qrn', code: 'WH-QRN', name: 'Quarantine Bay', type: 'QUARANTINE',
    city: 'Jepara', addressLine: 'Blok A — fenced bay beside the gate', capacityM3: 120,
    managerName: 'Anita Kusuma', bins: bins('Q', 3, 40), active: true,
    note: 'Rejected on arrival. Nothing here is available to a work order.',
  },
]

export const warehouseById = (id: string) => warehouses.find((w) => w.id === id)
export const warehouseName = (id: string) => warehouseById(id)?.name ?? '—'
export const warehouseCode = (id: string) => warehouseById(id)?.code ?? '—'

/* ==================================================================
   Suppliers
   ================================================================== */

const contact = (id: string, name: string, role: string, email: string, phone: string, primary = true): Contact =>
  ({ id, name, role, email, phone, primary })

const supplier = (
  id: string, code: string, name: string, type: Supplier['type'], city: string,
  o: Partial<Supplier> = {},
): Supplier => ({
  id, code, name, type, status: 'ACTIVE', city, province: 'Jawa Tengah',
  addressLine: `Jl. Industri Raya, ${city}`, taxId: '02.' + code.slice(-3) + '.771.4-506.000',
  currency: 'IDR', paymentTermDays: 30, leadTimeDays: 10,
  qualityScore: 82, onTimeScore: 84, priceScore: 78,
  svlkCertified: false, fscCertified: false,
  bankName: 'Bank Mandiri', bankAccountNo: '136-00-' + code.slice(-6) + '-1',
  contacts: [contact(`${id}_c1`, 'Purchasing desk', 'Sales', `sales@${code.toLowerCase()}.co.id`, '+62 291 59' + code.slice(-4))],
  since: day(-1400),
  ...o,
})

export const suppliers: Supplier[] = [
  supplier('sup_01', 'SUP-1001', 'CV Jati Makmur Sejahtera', 'SAWMILL', 'Jepara', {
    leadTimeDays: 14, paymentTermDays: 30, qualityScore: 91, onTimeScore: 88, priceScore: 72,
    svlkCertified: true, svlkNumber: 'LVLK-006/SVLK/0921', svlkExpiresAt: day(298),
    fscCertified: true, fscNumber: 'FSC-C142880', fscExpiresAt: day(210),
    contacts: [contact('sup_01_c1', 'Hendra Kusnadi', 'Owner', 'hendra@jatimakmur.co.id', '+62 812 2544 1180')],
    note: 'Perhutani-graded teak. The only sawmill we buy A-grade from, and the reason the FSC claim survives an audit.',
    since: day(-3200),
  }),
  supplier('sup_02', 'SUP-1002', 'UD Rimba Karya Utama', 'SAWMILL', 'Blora', {
    leadTimeDays: 18, qualityScore: 78, onTimeScore: 64, priceScore: 91,
    svlkCertified: true, svlkNumber: 'LVLK-014/SVLK/1188', svlkExpiresAt: day(41),
    note: 'Cheapest teak in the book and the most trouble. SVLK expires inside two months — nothing may be ordered against it after that.',
    since: day(-2100),
  }),
  supplier('sup_03', 'SUP-1003', 'PT Mahoni Nusantara', 'SAWMILL', 'Pati', {
    leadTimeDays: 12, qualityScore: 86, onTimeScore: 90, priceScore: 80,
    svlkCertified: true, svlkNumber: 'LVLK-009/SVLK/0455', svlkExpiresAt: day(520),
    contacts: [contact('sup_03_c1', 'Widodo Santoso', 'Sales manager', 'widodo@mahoninusantara.co.id', '+62 295 381 7742')],
    note: 'Community-plantation mahogany and mindi, kiln dried on site.',
  }),
  supplier('sup_04', 'SUP-1004', 'CV Akasia Prima', 'SAWMILL', 'Wonogiri', {
    leadTimeDays: 16, qualityScore: 74, onTimeScore: 71, priceScore: 88,
    svlkCertified: true, svlkNumber: 'LVLK-021/SVLK/2043', svlkExpiresAt: day(640),
    status: 'PROBATION',
    note: 'Two moisture rejections in the last quarter. On probation until three clean deliveries land.',
  }),
  supplier('sup_05', 'SUP-1005', 'PT Panel Andalan Indonesia', 'PANEL', 'Semarang', {
    leadTimeDays: 8, paymentTermDays: 45, qualityScore: 88, onTimeScore: 92, priceScore: 76,
    svlkCertified: true, svlkNumber: 'LVLK-003/SVLK/0072', svlkExpiresAt: day(710),
    note: 'Plywood and MDF. Holds the CARB Phase 2 / TSCA Title VI certification the US buyers ask for.',
  }),
  supplier('sup_06', 'SUP-1006', 'PT Hardware Sentosa Jaya', 'HARDWARE', 'Surabaya', {
    leadTimeDays: 21, paymentTermDays: 45, province: 'Jawa Timur', qualityScore: 90, onTimeScore: 79, priceScore: 70,
    contacts: [contact('sup_06_c1', 'Michael Tanuwijaya', 'Account manager', 'michael@hardwaresentosa.co.id', '+62 31 749 2210')],
    note: 'Imported Blum and Hettich equivalents. Long lead time because the stock sits in a bonded warehouse.',
  }),
  supplier('sup_07', 'SUP-1007', 'CV Logam Mandiri', 'HARDWARE', 'Kudus', {
    leadTimeDays: 7, qualityScore: 71, onTimeScore: 86, priceScore: 93,
    note: 'Local brackets, screws, knock-down fittings. Fine for the painted ranges.',
  }),
  supplier('sup_08', 'SUP-1008', 'PT Propan Warna Sejahtera', 'FINISHING', 'Semarang', {
    leadTimeDays: 6, paymentTermDays: 30, qualityScore: 93, onTimeScore: 94, priceScore: 68,
    contacts: [contact('sup_08_c1', 'Ratna Sulistyowati', 'Technical sales', 'ratna@propanwarna.co.id', '+62 24 761 8890')],
    note: 'Water-based sealers and topcoats. Their technician colour-matches every buyer sample.',
  }),
  supplier('sup_09', 'SUP-1009', 'UD Warna Abadi', 'FINISHING', 'Jepara', {
    leadTimeDays: 3, qualityScore: 69, onTimeScore: 88, priceScore: 90,
    note: 'Thinner, wax and solvent-based stain for the domestic range.',
  }),
  supplier('sup_10', 'SUP-1010', 'PT Tekstil Interior Nusantara', 'UPHOLSTERY', 'Bandung', {
    leadTimeDays: 24, paymentTermDays: 45, province: 'Jawa Barat', qualityScore: 87, onTimeScore: 73, priceScore: 74,
    note: 'Fabric by the roll, cut to the buyer’s own shade card. Late more often than not.',
  }),
  supplier('sup_11', 'SUP-1011', 'CV Busa Sentosa', 'UPHOLSTERY', 'Semarang', {
    leadTimeDays: 9, qualityScore: 80, onTimeScore: 89, priceScore: 85,
    note: 'Foam and webbing, cut to size.',
  }),
  supplier('sup_12', 'SUP-1012', 'PT Karton Prima Kemasan', 'PACKAGING', 'Demak', {
    leadTimeDays: 10, qualityScore: 84, onTimeScore: 91, priceScore: 82,
    note: 'Five-ply export carton printed with the buyer’s own artwork.',
  }),
  supplier('sup_13', 'SUP-1013', 'UD Peti Kayu Jaya', 'PACKAGING', 'Jepara', {
    leadTimeDays: 5, qualityScore: 79, onTimeScore: 87, priceScore: 88,
    svlkCertified: true, svlkNumber: 'LVLK-018/SVLK/1620', svlkExpiresAt: day(390),
    note: 'Crating timber, heat treated and ISPM-15 stamped in their own chamber.',
  }),
  supplier('sup_14', 'SUP-1014', 'Mulyo Karya (Sutrisno)', 'SUBCON_WORKSHOP', 'Bangsri', {
    leadTimeDays: 20, paymentTermDays: 14, qualityScore: 92, onTimeScore: 81, priceScore: 86,
    contacts: [contact('sup_14_c1', 'Sutrisno', 'Owner', 'sutrisno.mulyokarya@gmail.com', '+62 813 2677 4109')],
    note: 'Eleven benches doing carving and assembly on borongan terms. Holds our timber in their own shed.',
    since: day(-2600),
  }),
  supplier('sup_15', 'SUP-1015', 'Sanggar Ukir Wijaya', 'SUBCON_WORKSHOP', 'Mulyoharjo', {
    leadTimeDays: 28, paymentTermDays: 14, qualityScore: 95, onTimeScore: 62, priceScore: 71,
    note: 'The best carvers we have and the slowest. Only used on pieces that justify it.',
  }),
  supplier('sup_16', 'SUP-1016', 'CV Finishing Mandiri', 'SUBCON_WORKSHOP', 'Tahunan', {
    leadTimeDays: 12, paymentTermDays: 21, qualityScore: 77, onTimeScore: 85, priceScore: 89,
    note: 'Spray booth overflow when our own finishing line is full.',
  }),
  supplier('sup_17', 'SUP-1017', 'PT Fumigasi Nusantara', 'SERVICE', 'Semarang', {
    leadTimeDays: 3, paymentTermDays: 14, qualityScore: 90, onTimeScore: 95, priceScore: 72,
    note: 'Methyl bromide and heat treatment, certificate issued against the container number.',
  }),
  supplier('sup_18', 'SUP-1018', 'PT Trans Jateng Logistik', 'LOGISTICS', 'Semarang', {
    leadTimeDays: 2, paymentTermDays: 21, qualityScore: 83, onTimeScore: 88, priceScore: 80,
    note: 'Trailers between Jepara and Tanjung Emas, and stuffing labour at the depot.',
  }),
]

export const supplierById = (id?: string) => suppliers.find((s) => s.id === id)
export const supplierName = (id?: string) => supplierById(id)?.name ?? '—'

/* ==================================================================
   Buyers
   ================================================================== */

const buyer = (
  id: string, code: string, legalName: string, tradingName: string,
  countryCode: string, countryName: string, city: string, port: string,
  o: Partial<Buyer> = {},
): Buyer => ({
  id, code, legalName, tradingName, segment: 'IMPORTER', status: 'ACTIVE',
  countryCode, countryName, city, addressLine: `${city}`, destinationPort: port,
  currency: 'USD', defaultIncoterm: 'FOB', paymentTerm: 'TT_30_70',
  creditLimit: 250_000, outstanding: 0,
  requiresFsc: false, requiresEudrDds: false, requiresLabTest: false,
  qualityStandard: 'Buyer’s own AQL 2.5 inspection on 100% of the first container.',
  customerSince: day(-1500), ownerId: 'usr_02', ownerName: 'Sari Wulandari',
  contacts: [],
  ...o,
})

export const buyers: Buyer[] = [
  buyer('buy_01', 'BUY-2001', 'Nordwerk Wonen B.V.', 'Nordwerk', 'NL', 'Netherlands', 'Rotterdam', 'Rotterdam', {
    segment: 'RETAIL_CHAIN', currency: 'EUR', paymentTerm: 'TT_30_70', creditLimit: 420_000, outstanding: 168_400,
    requiresFsc: true, requiresEudrDds: true, requiresLabTest: true,
    qualityStandard: 'Nordwerk supplier manual v7 — AQL 2.5 major / 4.0 minor, plus EN 12520 seat strength on every new model.',
    customerSince: day(-2600), ownerName: 'Sari Wulandari',
    contacts: [
      contact('buy_01_c1', 'Marijke de Vries', 'Sourcing manager', 'm.devries@nordwerk.nl', '+31 10 442 8817'),
      contact('buy_01_c2', 'Tom Bakker', 'Quality & compliance', 't.bakker@nordwerk.nl', '+31 10 442 8823', false),
    ],
    note: 'Largest buyer by volume and the strictest on paperwork. Their EUDR pack has to be complete before the invoice goes out.',
  }),
  buyer('buy_02', 'BUY-2002', 'Harborline Furniture LLC', 'Harborline', 'US', 'United States', 'Savannah', 'Savannah', {
    segment: 'WHOLESALER', currency: 'USD', paymentTerm: 'LC_AT_SIGHT', creditLimit: 500_000, outstanding: 214_900,
    requiresLabTest: true,
    qualityStandard: 'Third-party pre-shipment inspection at 100% cartons; CARB Phase 2 declaration on every panel component.',
    customerSince: day(-2200), ownerId: 'usr_03', ownerName: 'Dimas Prasetyo',
    contacts: [contact('buy_02_c1', 'Karen Whitfield', 'VP Sourcing', 'kwhitfield@harborline.com', '+1 912 447 2210')],
    note: 'Opens an L/C for every order. A discrepancy in the document set costs us two weeks.',
  }),
  buyer('buy_03', 'BUY-2003', 'Maison Cotier SARL', 'Maison Cotier', 'FR', 'France', 'Marseille', 'Fos-sur-Mer', {
    segment: 'INTERIOR_STUDIO', currency: 'EUR', paymentTerm: 'TT_50_50', creditLimit: 180_000, outstanding: 41_200,
    requiresEudrDds: true, requiresFsc: true,
    qualityStandard: 'Sample-matched finish, 0 tolerance on colour drift between containers.',
    customerSince: day(-980), ownerName: 'Sari Wulandari',
    contacts: [contact('buy_03_c1', 'Élodie Rambert', 'Founder', 'elodie@maisoncotier.fr', '+33 4 91 22 07 55')],
  }),
  buyer('buy_04', 'BUY-2004', 'Southern Cross Living Pty Ltd', 'Southern Cross', 'AU', 'Australia', 'Melbourne', 'Melbourne', {
    segment: 'RETAIL_CHAIN', currency: 'AUD', paymentTerm: 'TT_30_70', creditLimit: 300_000, outstanding: 96_700,
    qualityStandard: 'AS/NZS 4688 for outdoor ranges; BMSB seasonal treatment mandatory September to April.',
    customerSince: day(-1750), ownerId: 'usr_03', ownerName: 'Dimas Prasetyo',
    contacts: [contact('buy_04_c1', 'Daniel Okafor', 'Category buyer', 'daniel.o@southerncrossliving.com.au', '+61 3 9420 7781')],
    note: 'Their season runs against ours. Anything landing between September and April needs a fumigation certificate naming the container.',
  }),
  buyer('buy_05', 'BUY-2005', 'Takumi Kagu Trading K.K.', 'Takumi Kagu', 'JP', 'Japan', 'Yokohama', 'Yokohama', {
    segment: 'IMPORTER', currency: 'JPY', paymentTerm: 'DP_60_DAYS', creditLimit: 40_000_000, outstanding: 8_900_000,
    qualityStandard: 'Dimensional tolerance ±1mm, moisture 8–10% on arrival, no visible glue line.',
    customerSince: day(-3100), ownerName: 'Sari Wulandari',
    contacts: [contact('buy_05_c1', 'Hiroshi Tanabe', 'Import manager', 'tanabe@takumi-kagu.co.jp', '+81 45 663 2214')],
    note: 'Smallest volumes, tightest tolerances, and never late paying.',
  }),
  buyer('buy_06', 'BUY-2006', 'Aurora Home GmbH', 'Aurora Home', 'DE', 'Germany', 'Hamburg', 'Hamburg', {
    segment: 'ECOMMERCE', currency: 'EUR', paymentTerm: 'TT_30_70', creditLimit: 260_000, outstanding: 132_500,
    requiresEudrDds: true,
    qualityStandard: 'Flat-pack only. Assembly instructions and fittings bagged per carton, verified on a build test.',
    customerSince: day(-720), ownerId: 'usr_03', ownerName: 'Dimas Prasetyo',
    contacts: [contact('buy_06_c1', 'Lena Brandt', 'Head of supply', 'l.brandt@aurorahome.de', '+49 40 5578 3390')],
  }),
  buyer('buy_07', 'BUY-2007', 'Casa Verde Iberica S.L.', 'Casa Verde', 'ES', 'Spain', 'Valencia', 'Valencia', {
    segment: 'WHOLESALER', currency: 'EUR', paymentTerm: 'OPEN_ACCOUNT_45', creditLimit: 150_000, outstanding: 158_300,
    requiresEudrDds: true,
    status: 'ON_HOLD',
    qualityStandard: 'Standard export packing, AQL 4.0.',
    customerSince: day(-1300), ownerName: 'Sari Wulandari',
    contacts: [contact('buy_07_c1', 'Javier Ortega', 'Purchasing', 'j.ortega@casaverde.es', '+34 96 331 4402')],
    note: 'On hold: over the credit limit and forty days past due on two invoices.',
  }),
  buyer('buy_08', 'BUY-2008', 'Kensington & Rowe Ltd', 'Kensington & Rowe', 'GB', 'United Kingdom', 'London', 'Felixstowe', {
    segment: 'HOSPITALITY', currency: 'GBP', paymentTerm: 'TT_50_50', creditLimit: 220_000, outstanding: 55_800,
    requiresFsc: true, requiresLabTest: true,
    qualityStandard: 'Contract-grade: BS 5852 upholstery ignition source 5, and a load test certificate per model.',
    customerSince: day(-640), ownerId: 'usr_03', ownerName: 'Dimas Prasetyo',
    contacts: [contact('buy_08_c1', 'Priya Raghunathan', 'Procurement lead', 'praghunathan@kensingtonrowe.co.uk', '+44 20 7583 9910')],
    note: 'Hotel fit-outs. Delivery windows are tied to a handover date, so a week late is worse than a price rise.',
  }),
  buyer('buy_09', 'BUY-2009', 'Fjordhus Møbler AS', 'Fjordhus', 'DK', 'Denmark', 'Aarhus', 'Aarhus', {
    segment: 'RETAIL_CHAIN', currency: 'EUR', paymentTerm: 'TT_30_70', creditLimit: 190_000, outstanding: 0,
    requiresFsc: true, requiresEudrDds: true,
    qualityStandard: 'FSC 100% claim on the whole range — no mixed credit accepted.',
    customerSince: day(-140), ownerName: 'Sari Wulandari', status: 'PROSPECT',
    contacts: [contact('buy_09_c1', 'Anders Holm', 'Buyer', 'anders@fjordhus.dk', '+45 86 12 44 90')],
    note: 'First enquiry still open. Will not accept an FSC Mixed claim, which our current certificate is.',
  }),
  buyer('buy_10', 'BUY-2010', 'Pacific Rim Interiors Ltd', 'Pacific Rim', 'NZ', 'New Zealand', 'Auckland', 'Auckland', {
    segment: 'IMPORTER', currency: 'AUD', paymentTerm: 'TT_30_70', creditLimit: 120_000, outstanding: 18_400,
    qualityStandard: 'MPI biosecurity clean container; no soil, bark or live pest.',
    customerSince: day(-1900), ownerId: 'usr_03', ownerName: 'Dimas Prasetyo',
    contacts: [contact('buy_10_c1', 'Grace Milburn', 'Director', 'grace@pacificriminteriors.co.nz', '+64 9 302 7714')],
  }),
  buyer('buy_11', 'BUY-2011', 'Villa Moderna SRL', 'Villa Moderna', 'IT', 'Italy', 'Milan', 'Genoa', {
    segment: 'INTERIOR_STUDIO', currency: 'EUR', paymentTerm: 'TT_50_50', creditLimit: 90_000, outstanding: 12_100,
    requiresEudrDds: true,
    qualityStandard: 'Live-edge slabs graded by photograph before shipment.',
    customerSince: day(-460), ownerName: 'Sari Wulandari',
    contacts: [contact('buy_11_c1', 'Francesca Lombardi', 'Owner', 'f.lombardi@villamoderna.it', '+39 02 4471 2280')],
  }),
  buyer('buy_12', 'BUY-2012', 'Gulf Interiors Trading LLC', 'Gulf Interiors', 'AE', 'United Arab Emirates', 'Dubai', 'Jebel Ali', {
    segment: 'HOSPITALITY', currency: 'USD', paymentTerm: 'LC_60_DAYS', creditLimit: 340_000, outstanding: 0,
    status: 'DORMANT',
    qualityStandard: 'Contract grade, project-specific.',
    customerSince: day(-2400), ownerId: 'usr_03', ownerName: 'Dimas Prasetyo',
    contacts: [contact('buy_12_c1', 'Omar Al-Fahim', 'Project procurement', 'omar@gulfinteriors.ae', '+971 4 883 5510')],
    note: 'No order in fourteen months. Their last project finished and nothing replaced it.',
  }),
]

export const buyerById = (id?: string) => buyers.find((b) => b.id === id)
export const buyerName = (id?: string) => buyerById(id)?.tradingName ?? '—'

/* ==================================================================
   Item master
   ================================================================== */

const item = (
  id: string, sku: string, name: string, category: Item['category'], uom: Item['uom'],
  standardCost: number, o: Partial<Item> = {},
): Item => ({
  id, sku, name, category, status: 'ACTIVE', uom, species: 'NONE', cbmPerUnit: 0, weightKg: 0,
  standardCost, currency: 'IDR', leadTimeDays: 10, minStock: 0, reorderPoint: 0, maxStock: 0,
  legalityControlled: false,
  ...o,
})

export const items: Item[] = [
  /* ---- timber ---- */
  item('itm_t01', 'TMB-TEAK-A', 'Teak sawn, A grade, KD', 'TIMBER', 'M3', 24_500_000, {
    species: 'TEAK', grade: 'A / FEQ', cbmPerUnit: 1, weightKg: 660, defaultSupplierId: 'sup_01',
    leadTimeDays: 14, minStock: 8, reorderPoint: 14, maxStock: 45, legalityControlled: true,
    note: 'The grade the European ranges are built from. Priced per cubic metre and audited to the log.',
  }),
  item('itm_t02', 'TMB-TEAK-B', 'Teak sawn, B grade, KD', 'TIMBER', 'M3', 17_800_000, {
    species: 'TEAK', grade: 'B', cbmPerUnit: 1, weightKg: 655, defaultSupplierId: 'sup_02',
    leadTimeDays: 18, minStock: 6, reorderPoint: 12, maxStock: 40, legalityControlled: true,
  }),
  item('itm_t03', 'TMB-TEAK-AD', 'Teak sawn, air dried, unsorted', 'TIMBER', 'M3', 13_200_000, {
    species: 'TEAK', grade: 'AD', cbmPerUnit: 1, weightKg: 720, defaultSupplierId: 'sup_02',
    leadTimeDays: 18, minStock: 4, reorderPoint: 10, maxStock: 30, legalityControlled: true,
    note: 'Goes into the kiln before it goes anywhere near a machine.',
  }),
  item('itm_t04', 'TMB-MAH-A', 'Mahogany sawn, A grade, KD', 'TIMBER', 'M3', 9_400_000, {
    species: 'MAHOGANY', grade: 'A', cbmPerUnit: 1, weightKg: 590, defaultSupplierId: 'sup_03',
    leadTimeDays: 12, minStock: 10, reorderPoint: 18, maxStock: 55, legalityControlled: true,
  }),
  item('itm_t05', 'TMB-MAH-B', 'Mahogany sawn, B grade, KD', 'TIMBER', 'M3', 7_100_000, {
    species: 'MAHOGANY', grade: 'B', cbmPerUnit: 1, weightKg: 585, defaultSupplierId: 'sup_03',
    leadTimeDays: 12, minStock: 8, reorderPoint: 15, maxStock: 40, legalityControlled: true,
  }),
  item('itm_t06', 'TMB-ACA-A', 'Acacia sawn, KD', 'TIMBER', 'M3', 6_600_000, {
    species: 'ACACIA', grade: 'A', cbmPerUnit: 1, weightKg: 640, defaultSupplierId: 'sup_04',
    leadTimeDays: 16, minStock: 6, reorderPoint: 12, maxStock: 35, legalityControlled: true,
  }),
  item('itm_t07', 'TMB-MIN-A', 'Mindi sawn, KD', 'TIMBER', 'M3', 5_200_000, {
    species: 'MINDI', grade: 'A', cbmPerUnit: 1, weightKg: 480, defaultSupplierId: 'sup_03',
    leadTimeDays: 12, minStock: 5, reorderPoint: 10, maxStock: 28, legalityControlled: true,
  }),
  item('itm_t08', 'TMB-SUAR-SLAB', 'Suar slab, live edge, 60–80mm', 'TIMBER', 'M3', 15_900_000, {
    species: 'SUAR', grade: 'Slab', cbmPerUnit: 1, weightKg: 700, defaultSupplierId: 'sup_04',
    leadTimeDays: 30, minStock: 1, reorderPoint: 3, maxStock: 12, legalityControlled: true,
    note: 'Bought by the piece and graded by photograph. Twelve weeks in the kiln before it is stable.',
  }),
  item('itm_t09', 'TMB-RBW-FJ', 'Rubberwood finger-joint board 18mm', 'TIMBER', 'M3', 4_800_000, {
    species: 'RUBBERWOOD', grade: 'FJ', cbmPerUnit: 1, weightKg: 620, defaultSupplierId: 'sup_04',
    leadTimeDays: 14, minStock: 3, reorderPoint: 7, maxStock: 20, legalityControlled: true,
  }),
  item('itm_t10', 'TMB-PINE-CRT', 'Pine crating timber, HT stamped', 'TIMBER', 'M3', 3_900_000, {
    species: 'PINE', grade: 'Crating', cbmPerUnit: 1, weightKg: 480, defaultSupplierId: 'sup_13',
    leadTimeDays: 5, minStock: 4, reorderPoint: 8, maxStock: 22, legalityControlled: true,
    note: 'Heat treated and stamped by the supplier. Without the stamp the whole container is refused.',
  }),

  /* ---- panel ---- */
  item('itm_p01', 'PNL-PLY-9', 'Plywood 9mm, 1220×2440, E0', 'PANEL', 'SHEET', 268_000, {
    cbmPerUnit: 0.027, weightKg: 17.5, defaultSupplierId: 'sup_05', leadTimeDays: 8,
    minStock: 60, reorderPoint: 120, maxStock: 400, legalityControlled: true,
  }),
  item('itm_p02', 'PNL-PLY-15', 'Plywood 15mm, 1220×2440, E0', 'PANEL', 'SHEET', 412_000, {
    cbmPerUnit: 0.045, weightKg: 29, defaultSupplierId: 'sup_05', leadTimeDays: 8,
    minStock: 40, reorderPoint: 90, maxStock: 300, legalityControlled: true,
  }),
  item('itm_p03', 'PNL-MDF-18', 'MDF 18mm, 1220×2440, CARB P2', 'PANEL', 'SHEET', 356_000, {
    cbmPerUnit: 0.054, weightKg: 39, defaultSupplierId: 'sup_05', leadTimeDays: 10,
    minStock: 30, reorderPoint: 70, maxStock: 240, legalityControlled: true,
    note: 'Carries the CARB Phase 2 / TSCA Title VI declaration the American buyers demand.',
  }),
  item('itm_p04', 'PNL-BLK-18', 'Blockboard 18mm, 1220×2440', 'PANEL', 'SHEET', 318_000, {
    cbmPerUnit: 0.054, weightKg: 31, defaultSupplierId: 'sup_05', leadTimeDays: 10,
    minStock: 20, reorderPoint: 45, maxStock: 160, legalityControlled: true,
  }),
  item('itm_p05', 'PNL-VEN-TEAK', 'Teak veneer 0.5mm', 'PANEL', 'M2', 78_000, {
    species: 'TEAK', cbmPerUnit: 0.0005, weightKg: 0.4, defaultSupplierId: 'sup_05', leadTimeDays: 12,
    minStock: 200, reorderPoint: 450, maxStock: 1600, legalityControlled: true,
  }),

  /* ---- hardware ---- */
  item('itm_h01', 'HDW-HNG-SC', 'Soft-close concealed hinge 110°', 'HARDWARE', 'PCS', 27_500, {
    weightKg: 0.09, defaultSupplierId: 'sup_06', leadTimeDays: 21,
    minStock: 800, reorderPoint: 1800, maxStock: 6000,
  }),
  item('itm_h02', 'HDW-RNR-450', 'Ball-bearing drawer runner 450mm', 'HARDWARE', 'SET', 68_000, {
    weightKg: 0.62, defaultSupplierId: 'sup_06', leadTimeDays: 21,
    minStock: 400, reorderPoint: 900, maxStock: 3200,
  }),
  item('itm_h03', 'HDW-KD-BOLT', 'Knock-down bolt & barrel nut M6', 'HARDWARE', 'SET', 4_200, {
    weightKg: 0.03, defaultSupplierId: 'sup_07', leadTimeDays: 7,
    minStock: 3000, reorderPoint: 6000, maxStock: 24000,
  }),
  item('itm_h04', 'HDW-HNDL-BR', 'Solid brass handle 128mm, aged', 'HARDWARE', 'PCS', 92_000, {
    weightKg: 0.14, defaultSupplierId: 'sup_06', leadTimeDays: 24,
    minStock: 300, reorderPoint: 700, maxStock: 2500,
  }),
  item('itm_h05', 'HDW-LEV-ADJ', 'Adjustable levelling foot M8', 'HARDWARE', 'PCS', 9_800, {
    weightKg: 0.05, defaultSupplierId: 'sup_07', leadTimeDays: 7,
    minStock: 1200, reorderPoint: 2500, maxStock: 9000,
  }),
  item('itm_h06', 'HDW-SCR-40', 'Wood screw 4×40mm (box 1000)', 'HARDWARE', 'BOX', 118_000, {
    weightKg: 4.2, defaultSupplierId: 'sup_07', leadTimeDays: 5,
    minStock: 20, reorderPoint: 40, maxStock: 160,
  }),
  item('itm_h07', 'HDW-DOWEL-8', 'Beech dowel 8×40mm (bag 500)', 'HARDWARE', 'BOX', 86_000, {
    weightKg: 1.6, defaultSupplierId: 'sup_07', leadTimeDays: 6,
    minStock: 30, reorderPoint: 60, maxStock: 200,
  }),
  item('itm_h08', 'HDW-CAM-15', 'Cam lock & dowel, 15mm', 'HARDWARE', 'SET', 3_600, {
    weightKg: 0.02, defaultSupplierId: 'sup_07', leadTimeDays: 7,
    minStock: 4000, reorderPoint: 8000, maxStock: 30000,
  }),

  /* ---- finishing ---- */
  item('itm_f01', 'FIN-STAIN-WAL', 'Water-based stain — walnut', 'FINISHING', 'LTR', 148_000, {
    weightKg: 1.05, defaultSupplierId: 'sup_08', leadTimeDays: 6,
    minStock: 80, reorderPoint: 160, maxStock: 600,
  }),
  item('itm_f02', 'FIN-STAIN-NAT', 'Water-based stain — natural teak', 'FINISHING', 'LTR', 148_000, {
    weightKg: 1.05, defaultSupplierId: 'sup_08', leadTimeDays: 6,
    minStock: 80, reorderPoint: 160, maxStock: 600,
  }),
  item('itm_f03', 'FIN-SEAL-WB', 'Water-based sanding sealer', 'FINISHING', 'LTR', 121_000, {
    weightKg: 1.02, defaultSupplierId: 'sup_08', leadTimeDays: 6,
    minStock: 120, reorderPoint: 240, maxStock: 900,
  }),
  item('itm_f04', 'FIN-TOP-MATT', 'Water-based topcoat, 20% matt', 'FINISHING', 'LTR', 176_000, {
    weightKg: 1.04, defaultSupplierId: 'sup_08', leadTimeDays: 6,
    minStock: 100, reorderPoint: 220, maxStock: 800,
  }),
  item('itm_f05', 'FIN-OIL-DAN', 'Danish oil, exterior grade', 'FINISHING', 'LTR', 132_000, {
    weightKg: 0.92, defaultSupplierId: 'sup_09', leadTimeDays: 3,
    minStock: 60, reorderPoint: 130, maxStock: 450,
  }),
  item('itm_f06', 'FIN-WAX-CLR', 'Furniture wax, clear', 'FINISHING', 'KG', 94_000, {
    weightKg: 1, defaultSupplierId: 'sup_09', leadTimeDays: 3,
    minStock: 40, reorderPoint: 80, maxStock: 300,
  }),
  item('itm_f07', 'FIN-THIN-WB', 'Water-based thinner', 'FINISHING', 'LTR', 38_000, {
    weightKg: 1, defaultSupplierId: 'sup_09', leadTimeDays: 3,
    minStock: 100, reorderPoint: 200, maxStock: 700,
  }),

  /* ---- upholstery ---- */
  item('itm_u01', 'UPH-FAB-LIN', 'Linen-blend upholstery fabric 140cm', 'UPHOLSTERY', 'MTR', 156_000, {
    weightKg: 0.42, defaultSupplierId: 'sup_10', leadTimeDays: 24,
    minStock: 150, reorderPoint: 320, maxStock: 1200,
  }),
  item('itm_u02', 'UPH-FAB-BCL', 'Bouclé upholstery fabric 145cm', 'UPHOLSTERY', 'MTR', 214_000, {
    weightKg: 0.55, defaultSupplierId: 'sup_10', leadTimeDays: 26,
    minStock: 100, reorderPoint: 220, maxStock: 800,
  }),
  item('itm_u03', 'UPH-FOAM-32', 'Foam sheet D32, 100×200×5cm', 'UPHOLSTERY', 'SHEET', 288_000, {
    cbmPerUnit: 0.1, weightKg: 3.2, defaultSupplierId: 'sup_11', leadTimeDays: 9,
    minStock: 30, reorderPoint: 70, maxStock: 240,
  }),
  item('itm_u04', 'UPH-WEB-ELS', 'Elastic webbing 50mm', 'UPHOLSTERY', 'MTR', 12_400, {
    weightKg: 0.05, defaultSupplierId: 'sup_11', leadTimeDays: 9,
    minStock: 400, reorderPoint: 850, maxStock: 3000,
  }),
  item('itm_u05', 'UPH-LTR-FUL', 'Full-grain leather hide, 4.5m²', 'UPHOLSTERY', 'SHEET', 2_950_000, {
    weightKg: 5.4, defaultSupplierId: 'sup_10', leadTimeDays: 30,
    minStock: 8, reorderPoint: 18, maxStock: 60,
  }),

  /* ---- packaging ---- */
  item('itm_k01', 'PKG-CTN-5P-L', 'Export carton 5-ply, large', 'PACKAGING', 'PCS', 42_500, {
    cbmPerUnit: 0.012, weightKg: 1.9, defaultSupplierId: 'sup_12', leadTimeDays: 10,
    minStock: 300, reorderPoint: 700, maxStock: 2500,
  }),
  item('itm_k02', 'PKG-CTN-5P-M', 'Export carton 5-ply, medium', 'PACKAGING', 'PCS', 31_000, {
    cbmPerUnit: 0.008, weightKg: 1.3, defaultSupplierId: 'sup_12', leadTimeDays: 10,
    minStock: 400, reorderPoint: 900, maxStock: 3200,
  }),
  item('itm_k03', 'PKG-CORNER', 'Cardboard corner guard 1m', 'PACKAGING', 'PCS', 6_200, {
    weightKg: 0.18, defaultSupplierId: 'sup_12', leadTimeDays: 8,
    minStock: 1500, reorderPoint: 3200, maxStock: 12000,
  }),
  item('itm_k04', 'PKG-FILM-STR', 'Stretch film 500mm × 300m', 'PACKAGING', 'ROLL', 148_000, {
    weightKg: 3.1, defaultSupplierId: 'sup_12', leadTimeDays: 8,
    minStock: 40, reorderPoint: 90, maxStock: 320,
  }),
  item('itm_k05', 'PKG-FOAM-WRP', 'Polyfoam wrap 2mm × 1m', 'PACKAGING', 'MTR', 4_800, {
    weightKg: 0.03, defaultSupplierId: 'sup_12', leadTimeDays: 8,
    minStock: 2000, reorderPoint: 4500, maxStock: 16000,
  }),
  item('itm_k06', 'PKG-CRATE-KIT', 'Crate kit, HT stamped, per m³ of goods', 'PACKAGING', 'PCS', 385_000, {
    cbmPerUnit: 0.06, weightKg: 22, defaultSupplierId: 'sup_13', leadTimeDays: 5,
    minStock: 20, reorderPoint: 45, maxStock: 160,
    note: 'ISPM-15 stamp is on the timber, and the treatment record has to reach the export file.',
  }),
  item('itm_k07', 'PKG-DESICC', 'Container desiccant bag 1kg', 'PACKAGING', 'PCS', 34_000, {
    weightKg: 1, defaultSupplierId: 'sup_12', leadTimeDays: 8,
    minStock: 80, reorderPoint: 180, maxStock: 600,
  }),

  /* ---- consumables ---- */
  item('itm_c01', 'CNS-ABR-120', 'Abrasive belt 120 grit', 'CONSUMABLE', 'PCS', 38_000, {
    defaultSupplierId: 'sup_09', leadTimeDays: 5, minStock: 100, reorderPoint: 220, maxStock: 800,
  }),
  item('itm_c02', 'CNS-ABR-180', 'Abrasive sheet 180 grit', 'CONSUMABLE', 'PCS', 6_400, {
    defaultSupplierId: 'sup_09', leadTimeDays: 5, minStock: 600, reorderPoint: 1300, maxStock: 5000,
  }),
  item('itm_c03', 'CNS-GLU-PVA', 'PVA D3 wood glue', 'CONSUMABLE', 'KG', 46_000, {
    defaultSupplierId: 'sup_09', leadTimeDays: 5, minStock: 80, reorderPoint: 170, maxStock: 600,
  }),
  item('itm_c04', 'CNS-BLD-TCT', 'TCT saw blade 305mm', 'CONSUMABLE', 'PCS', 720_000, {
    defaultSupplierId: 'sup_07', leadTimeDays: 12, minStock: 6, reorderPoint: 12, maxStock: 40,
  }),

  /* ---- components (back from a subcontractor) ---- */
  item('itm_x01', 'CMP-CARV-PNL', 'Carved panel, Jepara motif, 400×600', 'COMPONENT', 'PCS', 385_000, {
    species: 'TEAK', cbmPerUnit: 0.008, weightKg: 3.4, defaultSupplierId: 'sup_15', leadTimeDays: 28,
    legalityControlled: true,
  }),
  item('itm_x02', 'CMP-LEG-TURN', 'Turned leg 720mm', 'COMPONENT', 'PCS', 96_000, {
    species: 'TEAK', cbmPerUnit: 0.004, weightKg: 1.8, defaultSupplierId: 'sup_14', leadTimeDays: 20,
    legalityControlled: true,
  }),
  item('itm_x03', 'CMP-DRWR-BOX', 'Drawer box, assembled, 450mm', 'COMPONENT', 'PCS', 212_000, {
    cbmPerUnit: 0.018, weightKg: 4.1, defaultSupplierId: 'sup_14', leadTimeDays: 18,
    legalityControlled: true,
  }),

  /* ---- finished goods ---- */
  item('itm_g01', 'FG-DIN-TBL-200', 'Rengging dining table 2000×1000', 'FINISHED_GOOD', 'PCS', 5_850_000, {
    species: 'TEAK', cbmPerUnit: 0.62, weightKg: 74, hsCode: '9403.60.90', legalityControlled: true, leadTimeDays: 45,
  }),
  item('itm_g02', 'FG-DIN-CHR-STD', 'Rengging dining chair, upholstered seat', 'FINISHED_GOOD', 'PCS', 1_240_000, {
    species: 'TEAK', cbmPerUnit: 0.14, weightKg: 9.4, hsCode: '9401.61.00', legalityControlled: true, leadTimeDays: 45,
  }),
  item('itm_g03', 'FG-SIDE-6DR', 'Pecangaan sideboard, six drawer', 'FINISHED_GOOD', 'PCS', 7_420_000, {
    species: 'MAHOGANY', cbmPerUnit: 0.78, weightKg: 92, hsCode: '9403.60.90', legalityControlled: true, leadTimeDays: 50,
  }),
  item('itm_g04', 'FG-LNG-2ST', 'Bangsri lounge chair, bouclé', 'FINISHED_GOOD', 'PCS', 3_180_000, {
    species: 'ACACIA', cbmPerUnit: 0.31, weightKg: 21, hsCode: '9401.61.00', legalityControlled: true, leadTimeDays: 40,
  }),
  item('itm_g05', 'FG-GRD-BNC', 'Tahunan garden bench 1600mm', 'FINISHED_GOOD', 'PCS', 2_640_000, {
    species: 'TEAK', cbmPerUnit: 0.35, weightKg: 34, hsCode: '9403.60.10', legalityControlled: true, leadTimeDays: 35,
  }),
  item('itm_g06', 'FG-SLB-TBL-240', 'Suar slab table 2400×900, live edge', 'FINISHED_GOOD', 'PCS', 14_900_000, {
    species: 'SUAR', cbmPerUnit: 0.96, weightKg: 148, hsCode: '9403.60.90', legalityControlled: true, leadTimeDays: 70,
  }),
  item('itm_g07', 'FG-BED-KING', 'Mulyoharjo bed frame, king', 'FINISHED_GOOD', 'PCS', 8_960_000, {
    species: 'TEAK', cbmPerUnit: 0.54, weightKg: 88, hsCode: '9403.50.00', legalityControlled: true, leadTimeDays: 55,
  }),
  item('itm_g08', 'FG-CAB-TV-180', 'Kedungleper TV cabinet 1800mm', 'FINISHED_GOOD', 'PCS', 4_380_000, {
    species: 'MINDI', cbmPerUnit: 0.46, weightKg: 51, hsCode: '9403.60.90', legalityControlled: true, leadTimeDays: 42,
  }),
]

export const itemById = (id?: string) => items.find((i) => i.id === id)
export const itemName = (id?: string) => itemById(id)?.name ?? '—'
export const itemSku = (id?: string) => itemById(id)?.sku ?? '—'
