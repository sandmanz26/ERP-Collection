import type {
  Account, Container, Customer, Invoice, JournalEntry, Project, ProjectCharge, ProjectStage,
  ServicePackage, ShipmentDocument, StageKey, StageTask, TimelineEvent,
} from './types'
import { CHARGE_CODES, DOC_TYPES, STAGES, TEAM, stageIndex } from './reference'
import { CONTAINER_SPECS } from '@/lib/shipping'

/* deterministic pseudo-random so the demo dataset is stable across reloads */
let seed = 20260830
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min
const day = (offset: number) => {
  const d = new Date('2026-08-30T08:00:00Z')
  d.setDate(d.getDate() + offset)
  return d.toISOString()
}

/* ================================================================
   CUSTOMERS
   ================================================================ */
export const customers: Customer[] = [
  {
    id: 'cus_1', code: 'CUS-0001', legalName: 'PT Jati Makmur Furniture', tradeName: 'Jati Makmur',
    taxId: '01.234.567.8-013.000', industry: 'Furniture & Wood Products', roles: ['CLIENT', 'SHIPPER'],
    status: 'ACTIVE', riskRating: 'LOW', creditLimit: 3_500_000_000, creditCurrency: 'IDR', creditTermDays: 30,
    outstandingAr: 842_300_000, defaultIncoterm: 'FOB', defaultPaymentTerm: 'NET_30', salesOwner: 'Elena Marchetti',
    onboardedAt: '2021-03-14', website: 'jatimakmur.co.id',
    notes: 'Largest export account. Weekly sailings to Europe and the US. Always requires ISPM-15 fumigation.',
    offices: [
      { id: 'off_1', customerId: 'cus_1', name: 'Jepara Factory & HQ', countryCode: 'ID', country: 'Indonesia', city: 'Jepara', portCode: 'IDSRG', portName: 'Tanjung Emas', addressLine: 'Jl. Raya Jepara–Kudus KM 9, Jepara 59452', postalCode: '59452', timezone: 'Asia/Jakarta', customsId: 'NIB 9120004512345', roles: ['SHIPPER'], isHeadquarter: true, isBillingOffice: true, active: true, contacts: [{ id: 'c1', name: 'Budi Santoso', title: 'Export Manager', email: 'budi@jatimakmur.co.id', phone: '+62 812 2345 6789', isPrimary: true }] },
      { id: 'off_2', customerId: 'cus_1', name: 'Rotterdam Distribution', countryCode: 'NL', country: 'Netherlands', city: 'Rotterdam', portCode: 'NLRTM', portName: 'Rotterdam', addressLine: 'Waalhaven Zuidzijde 21, 3089 JH Rotterdam', postalCode: '3089 JH', timezone: 'Europe/Amsterdam', customsId: 'NL8123456789', vatNumber: 'NL812345678B01', roles: ['CONSIGNEE'], isHeadquarter: false, isBillingOffice: false, active: true, contacts: [{ id: 'c2', name: 'Marieke de Vries', title: 'Logistics Lead', email: 'm.devries@jatimakmur.eu', phone: '+31 10 244 1180', isPrimary: true }] },
      { id: 'off_3', customerId: 'cus_1', name: 'Savannah Warehouse', countryCode: 'US', country: 'United States', city: 'Savannah', portCode: 'USSAV', portName: 'Savannah', addressLine: '1200 Bourne Ave, Savannah, GA 31408', timezone: 'America/New_York', customsId: 'EIN 58-1234567', roles: ['CONSIGNEE', 'NOTIFY'], isHeadquarter: false, isBillingOffice: false, active: true, contacts: [{ id: 'c3', name: 'Daniel Cross', title: 'Warehouse Manager', email: 'dcross@jatimakmur.us', phone: '+1 912 555 0142', isPrimary: true }] },
    ],
  },
  {
    id: 'cus_2', code: 'CUS-0002', legalName: 'PT Anugerah Rubber Industries', tradeName: 'Anugerah Rubber',
    taxId: '02.345.678.9-021.000', industry: 'Rubber & Commodities', roles: ['CLIENT', 'SHIPPER'],
    status: 'ACTIVE', riskRating: 'LOW', creditLimit: 5_000_000_000, creditCurrency: 'IDR', creditTermDays: 45,
    outstandingAr: 1_920_400_000, defaultIncoterm: 'CIF', defaultPaymentTerm: 'LC_AT_SIGHT', salesOwner: 'Marcus Bell',
    onboardedAt: '2019-08-02', website: 'anugerahrubber.com',
    notes: 'Ships TSNR 20 to tyre plants in Japan and Korea. All shipments under L/C at sight — document accuracy is critical.',
    offices: [
      { id: 'off_4', customerId: 'cus_2', name: 'Medan Head Office', countryCode: 'ID', country: 'Indonesia', city: 'Medan', portCode: 'IDBLW', portName: 'Belawan', addressLine: 'Jl. Putri Hijau No. 10, Medan 20111', timezone: 'Asia/Jakarta', customsId: 'NIB 8120009988776', roles: ['SHIPPER'], isHeadquarter: true, isBillingOffice: true, active: true, contacts: [{ id: 'c4', name: 'Hendra Wijaya', title: 'Director of Exports', email: 'hendra@anugerahrubber.com', phone: '+62 61 4567 890', isPrimary: true }] },
      { id: 'off_5', customerId: 'cus_2', name: 'Yokohama Liaison', countryCode: 'JP', country: 'Japan', city: 'Yokohama', portCode: 'JPYOK', portName: 'Yokohama', addressLine: '2-3-1 Minatomirai, Nishi-ku, Yokohama 220-0012', timezone: 'Asia/Tokyo', customsId: 'JP-CUS-778812', roles: ['CONSIGNEE'], isHeadquarter: false, isBillingOffice: false, active: true, contacts: [{ id: 'c5', name: 'Kenji Tanaka', title: 'Procurement', email: 'k.tanaka@nusantara.jp', phone: '+81 45 222 8811', isPrimary: true }] },
      { id: 'off_6', customerId: 'cus_2', name: 'Busan Office', countryCode: 'KR', country: 'South Korea', city: 'Busan', portCode: 'KRPUS', portName: 'Busan', addressLine: '55 Jungang-daero, Jung-gu, Busan 48939', timezone: 'Asia/Seoul', customsId: 'KR-1208812345', roles: ['CONSIGNEE'], isHeadquarter: false, isBillingOffice: false, active: true, contacts: [{ id: 'c6', name: 'Ji-woo Park', title: 'Supply Chain', email: 'jw.park@nusantara.kr', phone: '+82 51 441 2200', isPrimary: true }] },
    ],
  },
  {
    id: 'cus_3', code: 'CUS-0003', legalName: 'Bali Craft Collective Pte Ltd', tradeName: 'Bali Craft',
    industry: 'Handicraft & Home Decor', roles: ['CLIENT', 'CONSIGNEE'], status: 'ACTIVE', riskRating: 'MEDIUM',
    creditLimit: 900_000_000, creditCurrency: 'IDR', creditTermDays: 14, outstandingAr: 312_000_000,
    defaultIncoterm: 'EXW', defaultPaymentTerm: 'CONSIGNMENT_SETTLEMENT', salesOwner: 'Sofia Reyes',
    onboardedAt: '2023-01-20', website: 'balicraft.sg',
    notes: 'Consignment model — goods remain the shipper\'s property until sold in the destination showroom. Settlement every 30 days.',
    offices: [
      { id: 'off_7', customerId: 'cus_3', name: 'Singapore HQ', countryCode: 'SG', country: 'Singapore', city: 'Singapore', portCode: 'SGSIN', portName: 'Singapore', addressLine: '8 Marina View, Asia Square Tower 1, #23-01', timezone: 'Asia/Singapore', customsId: 'UEN 202301234K', roles: ['CLIENT', 'CONSIGNEE'], isHeadquarter: true, isBillingOffice: true, active: true, contacts: [{ id: 'c7', name: 'Clara Lim', title: 'Managing Director', email: 'clara@balicraft.sg', phone: '+65 6812 4400', isPrimary: true }] },
      { id: 'off_8', customerId: 'cus_3', name: 'Sydney Showroom', countryCode: 'AU', country: 'Australia', city: 'Sydney', portCode: 'AUSYD', portName: 'Sydney', addressLine: '42 Bourke Street, Woolloomooloo NSW 2011', timezone: 'Australia/Sydney', customsId: 'ABN 51 824 753 556', roles: ['CONSIGNEE'], isHeadquarter: false, isBillingOffice: false, active: true, contacts: [{ id: 'c8', name: 'Owen Hart', title: 'Retail Ops', email: 'owen@balicraft.au', phone: '+61 2 9331 8800', isPrimary: true }] },
      { id: 'off_9', customerId: 'cus_3', name: 'Denpasar Buying Office', countryCode: 'ID', country: 'Indonesia', city: 'Denpasar', portCode: 'IDSUB', portName: 'Tanjung Perak', addressLine: 'Jl. Sunset Road No. 88, Kuta, Badung 80361', timezone: 'Asia/Makassar', roles: ['SHIPPER'], isHeadquarter: false, isBillingOffice: false, active: true, contacts: [{ id: 'c9', name: 'Made Suardana', title: 'Sourcing Head', email: 'made@balicraft.sg', phone: '+62 361 847 2200', isPrimary: true }] },
    ],
  },
  {
    id: 'cus_4', code: 'CUS-0004', legalName: 'PT Sinar Kopi Sejahtera', tradeName: 'Sinar Kopi',
    taxId: '03.456.789.0-055.000', industry: 'Agriculture & F&B', roles: ['CLIENT', 'SHIPPER'], status: 'ACTIVE',
    riskRating: 'LOW', creditLimit: 1_800_000_000, creditCurrency: 'IDR', creditTermDays: 30, outstandingAr: 465_800_000,
    defaultIncoterm: 'FOB', defaultPaymentTerm: 'NET_30', salesOwner: 'Priya Nair', onboardedAt: '2022-06-11',
    notes: 'Specialty green coffee. Every shipment needs a phytosanitary certificate and ICO marks on the packing list.',
    offices: [
      { id: 'off_10', customerId: 'cus_4', name: 'Surabaya Processing Plant', countryCode: 'ID', country: 'Indonesia', city: 'Surabaya', portCode: 'IDSUB', portName: 'Tanjung Perak', addressLine: 'Kawasan Industri SIER Blok J-12, Surabaya', timezone: 'Asia/Jakarta', customsId: 'NIB 8120001122334', roles: ['SHIPPER'], isHeadquarter: true, isBillingOffice: true, active: true, contacts: [{ id: 'c10', name: 'Ratna Sari', title: 'Export Admin', email: 'ratna@sinarkopi.co.id', phone: '+62 31 8412 900', isPrimary: true }] },
      { id: 'off_11', customerId: 'cus_4', name: 'Hamburg Trading Desk', countryCode: 'DE', country: 'Germany', city: 'Hamburg', portCode: 'DEHAM', portName: 'Hamburg', addressLine: 'Grosse Elbstrasse 145, 22767 Hamburg', timezone: 'Europe/Berlin', customsId: 'DE812345678', vatNumber: 'DE812345678', roles: ['CONSIGNEE'], isHeadquarter: false, isBillingOffice: false, active: true, contacts: [{ id: 'c11', name: 'Lukas Brandt', title: 'Green Coffee Buyer', email: 'l.brandt@sinarkopi.de', phone: '+49 40 380 2200', isPrimary: true }] },
    ],
  },
  {
    id: 'cus_5', code: 'CUS-0005', legalName: 'Pacific Textile Trading LLC', tradeName: 'Pacific Textile',
    industry: 'Apparel & Textile', roles: ['CLIENT', 'CONSIGNEE'], status: 'ON_HOLD', riskRating: 'HIGH',
    creditLimit: 600_000_000, creditCurrency: 'IDR', creditTermDays: 30, outstandingAr: 718_500_000,
    defaultIncoterm: 'FOB', defaultPaymentTerm: 'NET_30', salesOwner: 'David Chen', onboardedAt: '2024-02-05',
    notes: 'CREDIT HOLD — AR exceeds the approved limit by IDR 118.5 M. New bookings need a director release.',
    offices: [
      { id: 'off_12', customerId: 'cus_5', name: 'Los Angeles Office', countryCode: 'US', country: 'United States', city: 'Los Angeles', portCode: 'USLAX', portName: 'Los Angeles', addressLine: '888 S Figueroa St Suite 1200, Los Angeles, CA 90017', timezone: 'America/Los_Angeles', customsId: 'EIN 95-7654321', roles: ['CLIENT', 'CONSIGNEE'], isHeadquarter: true, isBillingOffice: true, active: true, contacts: [{ id: 'c12', name: 'Angela Reyes', title: 'Import Manager', email: 'angela@pactextile.com', phone: '+1 213 555 0180', isPrimary: true }] },
      { id: 'off_13', customerId: 'cus_5', name: 'Bandung Sourcing', countryCode: 'ID', country: 'Indonesia', city: 'Bandung', portCode: 'IDTPP', portName: 'Tanjung Priok', addressLine: 'Jl. Soekarno-Hatta No. 452, Bandung 40266', timezone: 'Asia/Jakarta', roles: ['SHIPPER'], isHeadquarter: false, isBillingOffice: false, active: true, contacts: [{ id: 'c13', name: 'Fitri Amelia', title: 'Coordinator', email: 'fitri@pactextile.com', phone: '+62 22 750 2211', isPrimary: true }] },
    ],
  },
  {
    id: 'cus_6', code: 'CUS-0006', legalName: 'PT Cakra Elektronik Komponen', tradeName: 'Cakra Elektronik',
    taxId: '04.567.890.1-072.000', industry: 'Electronics Manufacturing', roles: ['CLIENT', 'SHIPPER'], status: 'ACTIVE',
    riskRating: 'MEDIUM', creditLimit: 2_200_000_000, creditCurrency: 'IDR', creditTermDays: 30, outstandingAr: 288_100_000,
    defaultIncoterm: 'FCA', defaultPaymentTerm: 'NET_14', salesOwner: 'Tomas Weber', onboardedAt: '2023-09-18',
    notes: 'High-value wire harnesses. Mixed air and sea; air is used when the plant in Shanghai runs short.',
    offices: [
      { id: 'off_14', customerId: 'cus_6', name: 'Batam Plant', countryCode: 'ID', country: 'Indonesia', city: 'Batam', portCode: 'IDTPP', portName: 'Tanjung Priok', addressLine: 'Kawasan Industri Batamindo Blok 7, Batam 29433', timezone: 'Asia/Jakarta', customsId: 'NIB 8120005566778', roles: ['SHIPPER'], isHeadquarter: true, isBillingOffice: true, active: true, contacts: [{ id: 'c14', name: 'Rizky Hidayat', title: 'Logistics Supervisor', email: 'rizky@cakraelektronik.co.id', phone: '+62 778 611 2200', isPrimary: true }] },
      { id: 'off_15', customerId: 'cus_6', name: 'Shanghai Plant', countryCode: 'CN', country: 'China', city: 'Shanghai', portCode: 'CNSHA', portName: 'Shanghai', addressLine: 'No. 1289 Jinshajiang Rd, Putuo District, Shanghai', timezone: 'Asia/Shanghai', customsId: 'CN-3101-889977', roles: ['CONSIGNEE'], isHeadquarter: false, isBillingOffice: false, active: true, contacts: [{ id: 'c15', name: 'Wei Zhang', title: 'Inbound Logistics', email: 'wei.zhang@cakra.cn', phone: '+86 21 6288 4400', isPrimary: true }] },
      { id: 'off_16', customerId: 'cus_6', name: 'Ho Chi Minh Plant', countryCode: 'VN', country: 'Vietnam', city: 'Ho Chi Minh City', portCode: 'VNSGN', portName: 'Cat Lai', addressLine: 'Lot B-2, Tan Thuan EPZ, District 7, HCMC', timezone: 'Asia/Ho_Chi_Minh', customsId: 'VN-0312445566', roles: ['CONSIGNEE'], isHeadquarter: false, isBillingOffice: false, active: true, contacts: [{ id: 'c16', name: 'Tran Minh', title: 'Plant Logistics', email: 'minh.tran@cakra.vn', phone: '+84 28 3770 1122', isPrimary: true }] },
    ],
  },
  {
    id: 'cus_7', code: 'CUS-0007', legalName: 'Emirates Stone & Marble FZE', tradeName: 'Emirates Stone',
    industry: 'Construction Materials', roles: ['CLIENT', 'CONSIGNEE'], status: 'PROSPECT', riskRating: 'MEDIUM',
    creditLimit: 0, creditCurrency: 'USD', creditTermDays: 0, outstandingAr: 0, defaultIncoterm: 'CFR',
    defaultPaymentTerm: 'TT_ADVANCE', salesOwner: 'Marcus Bell', onboardedAt: '2026-07-02',
    notes: 'Prospect from the Dubai trade mission. First trial shipment of marble slabs quoted, awaiting acceptance.',
    offices: [
      { id: 'off_17', customerId: 'cus_7', name: 'Jebel Ali Free Zone', countryCode: 'AE', country: 'United Arab Emirates', city: 'Dubai', portCode: 'AEJEA', portName: 'Jebel Ali', addressLine: 'JAFZA South, Warehouse ZC-14, Dubai', timezone: 'Asia/Dubai', customsId: 'AE-JAFZA-99120', roles: ['CLIENT', 'CONSIGNEE'], isHeadquarter: true, isBillingOffice: true, active: true, contacts: [{ id: 'c17', name: 'Omar Al Falasi', title: 'Procurement Head', email: 'omar@emiratesstone.ae', phone: '+971 4 881 2200', isPrimary: true }] },
    ],
  },
  {
    id: 'cus_8', code: 'CUS-0008', legalName: 'PT Samudra Beku Seafood', tradeName: 'Samudra Beku',
    taxId: '05.678.901.2-088.000', industry: 'Frozen Seafood', roles: ['CLIENT', 'SHIPPER'], status: 'ACTIVE',
    riskRating: 'MEDIUM', creditLimit: 1_200_000_000, creditCurrency: 'IDR', creditTermDays: 21, outstandingAr: 397_600_000,
    defaultIncoterm: 'CIF', defaultPaymentTerm: 'NET_21' as never, salesOwner: 'Sofia Reyes', onboardedAt: '2022-11-30',
    notes: 'Reefer cargo at -18 °C. Temperature deviation on any leg voids the buyer\'s acceptance — monitor pre-trip inspection.',
    offices: [
      { id: 'off_18', customerId: 'cus_8', name: 'Makassar Cold Storage', countryCode: 'ID', country: 'Indonesia', city: 'Makassar', portCode: 'IDMAK', portName: 'Makassar', addressLine: 'Jl. Nusantara No. 15, Makassar 90173', timezone: 'Asia/Makassar', customsId: 'NIB 8120007788990', roles: ['SHIPPER'], isHeadquarter: true, isBillingOffice: true, active: true, contacts: [{ id: 'c18', name: 'Andi Pratama', title: 'Export Manager', email: 'andi@samudrabeku.co.id', phone: '+62 411 322 4400', isPrimary: true }] },
      { id: 'off_19', customerId: 'cus_8', name: 'Tokyo Buyer Office', countryCode: 'JP', country: 'Japan', city: 'Tokyo', portCode: 'JPYOK', portName: 'Yokohama', addressLine: '3-2-1 Toyosu, Koto-ku, Tokyo 135-0061', timezone: 'Asia/Tokyo', customsId: 'JP-CUS-441100', roles: ['CONSIGNEE'], isHeadquarter: false, isBillingOffice: false, active: true, contacts: [{ id: 'c19', name: 'Yuki Sato', title: 'Import Buyer', email: 'y.sato@samudra.jp', phone: '+81 3 6220 1100', isPrimary: true }] },
    ],
  },
]

/* ================================================================
   SERVICE PACKAGES
   ================================================================ */
const rate = (id: string, chargeCode: string, basis: ServicePackage['rateLines'][number]['basis'], buy: number, sell: number, currency: ServicePackage['currency'], mandatory = true, containerType?: Container['type']) => {
  const meta = CHARGE_CODES.find((c) => c.code === chargeCode)
  return {
    id, chargeCode, description: meta?.name ?? chargeCode, basis, buyRate: buy, sellRate: sell, currency,
    vatApplicable: meta?.vat ?? false, mandatory, containerType,
  }
}

export const packages: ServicePackage[] = [
  {
    id: 'pkg_1', code: 'PKG-EU-FCL-01', name: 'Java → North Europe FCL Weekly', mode: 'FCL', scope: 'PORT_TO_PORT',
    originPortCode: 'IDSRG', originPortName: 'Tanjung Emas', destPortCode: 'NLRTM', destPortName: 'Rotterdam', destCountry: 'NL',
    incoterm: 'FOB', currency: 'USD', transitDays: 32, freeTimeDays: 14, validFrom: '2026-07-01', validTo: '2026-09-30',
    status: 'ACTIVE', carrier: 'Maersk Line', usageCount: 24,
    inclusions: ['Ocean freight', 'Origin THC', 'B/L issuance', 'Standard bolt seal', 'VGM submission'],
    exclusions: ['Destination THC', 'Customs duty & VAT at destination', 'Demurrage beyond 14 free days', 'Fumigation'],
    rateLines: [
      rate('rl_1', 'OFR', 'PER_CONTAINER', 1180, 1480, 'USD', true, '40HC'),
      rate('rl_2', 'OFR', 'PER_CONTAINER', 890, 1120, 'USD', true, '20GP'),
      rate('rl_3', 'BAF', 'PER_CONTAINER', 145, 175, 'USD', true, '40HC'),
      rate('rl_4', 'LSS', 'PER_CONTAINER', 48, 60, 'USD'),
      rate('rl_5', 'THC-O', 'PER_CONTAINER', 155, 195, 'USD'),
      rate('rl_6', 'DOC', 'PER_BL', 35, 65, 'USD'),
      rate('rl_7', 'SEAL', 'PER_CONTAINER', 6, 12, 'USD'),
      rate('rl_8', 'VGM', 'PER_CONTAINER', 12, 25, 'USD'),
      rate('rl_9', 'PEB', 'PER_DOCUMENT', 18, 45, 'USD', false),
    ],
    notes: 'Space protected under the Maersk annual contract MAEU-ID-2026-1187. Rate is subject to a PSS in peak season.',
  },
  {
    id: 'pkg_2', code: 'PKG-JP-FCL-02', name: 'Belawan → Japan Rubber Service', mode: 'FCL', scope: 'PORT_TO_PORT',
    originPortCode: 'IDBLW', originPortName: 'Belawan', destPortCode: 'JPYOK', destPortName: 'Yokohama', destCountry: 'JP',
    incoterm: 'CIF', currency: 'USD', transitDays: 16, freeTimeDays: 10, validFrom: '2026-06-15', validTo: '2026-09-14',
    status: 'EXPIRING', carrier: 'Ocean Network Express', usageCount: 41,
    inclusions: ['Ocean freight', 'Origin THC', 'Marine insurance 110% CIF', 'B/L issuance'],
    exclusions: ['Destination handling', 'Japanese import clearance', 'Detention after 10 days'],
    rateLines: [
      rate('rl_10', 'OFR', 'PER_CONTAINER', 620, 810, 'USD', true, '20GP'),
      rate('rl_11', 'THC-O', 'PER_CONTAINER', 140, 180, 'USD'),
      rate('rl_12', 'INS', 'PERCENT_OF_VALUE', 0.08, 0.14, 'USD'),
      rate('rl_13', 'DOC', 'PER_BL', 35, 60, 'USD'),
      rate('rl_14', 'COO', 'PER_DOCUMENT', 25, 55, 'USD'),
      rate('rl_15', 'VGM', 'PER_CONTAINER', 12, 25, 'USD'),
    ],
    notes: 'IJEPA Form JIEPA gives the buyer a duty preference — the COO must be issued before the vessel departs.',
  },
  {
    id: 'pkg_3', code: 'PKG-AU-CNS-03', name: 'Bali → Sydney Consignment Programme', mode: 'LCL', scope: 'DOOR_TO_DOOR',
    originPortCode: 'IDSUB', originPortName: 'Tanjung Perak', destPortCode: 'AUSYD', destPortName: 'Sydney', destCountry: 'AU',
    incoterm: 'DAP', currency: 'AUD', transitDays: 21, freeTimeDays: 7, validFrom: '2026-01-01', validTo: '2026-12-31',
    status: 'ACTIVE', carrier: 'CMA CGM', usageCount: 12,
    inclusions: ['Pickup from Denpasar', 'CFS consolidation', 'Ocean freight', 'AQIS inspection coordination', 'Delivery to showroom'],
    exclusions: ['AQIS treatment if the container fails inspection', 'Australian GST', 'Storage beyond 7 days'],
    rateLines: [
      rate('rl_16', 'CFS', 'PER_CBM', 26, 44, 'AUD'),
      rate('rl_17', 'OFR', 'PER_CBM', 58, 86, 'AUD'),
      rate('rl_18', 'TRUCK', 'PER_SHIPMENT', 380, 560, 'AUD'),
      rate('rl_19', 'FUMI', 'PER_SHIPMENT', 120, 210, 'AUD'),
      rate('rl_20', 'DOC', 'PER_BL', 40, 80, 'AUD'),
      rate('rl_21', 'ADMIN', 'PER_SHIPMENT', 0, 150, 'AUD', false),
    ],
    notes: 'Consignment: forwarder invoices only the logistics package. Goods are settled by the showroom every 30 days.',
  },
  {
    id: 'pkg_4', code: 'PKG-US-FCL-04', name: 'Java → US East Coast Direct', mode: 'FCL', scope: 'DOOR_TO_PORT',
    originPortCode: 'IDTPP', originPortName: 'Tanjung Priok', destPortCode: 'USSAV', destPortName: 'Savannah', destCountry: 'US',
    incoterm: 'FOB', currency: 'USD', transitDays: 38, freeTimeDays: 10, validFrom: '2026-08-01', validTo: '2026-10-31',
    status: 'ACTIVE', carrier: 'Hapag-Lloyd', usageCount: 9,
    inclusions: ['Factory pickup within Jabodetabek', 'Ocean freight', 'ISF 10+2 filing', 'AMS filing'],
    exclusions: ['US customs bond', 'Chassis and drayage at destination', 'Duty and MPF'],
    rateLines: [
      rate('rl_22', 'OFR', 'PER_CONTAINER', 2380, 2820, 'USD', true, '40HC'),
      rate('rl_23', 'THC-O', 'PER_CONTAINER', 165, 205, 'USD'),
      rate('rl_24', 'AMS', 'PER_BL', 30, 55, 'USD'),
      rate('rl_25', 'TRUCK', 'PER_CONTAINER', 210, 320, 'USD'),
      rate('rl_26', 'DOC', 'PER_BL', 35, 70, 'USD'),
      rate('rl_27', 'PSS', 'PER_CONTAINER', 200, 240, 'USD', false, '40HC'),
    ],
    notes: 'ISF must be filed 24 hours before loading — a late filing draws a USD 5,000 penalty from CBP.',
  },
  {
    id: 'pkg_5', code: 'PKG-CN-AIR-05', name: 'Batam → Shanghai Air Express', mode: 'AIR', scope: 'DOOR_TO_DOOR',
    originPortCode: 'IDTPP', originPortName: 'Soekarno-Hatta (CGK)', destPortCode: 'CNSHA', destPortName: 'Pudong (PVG)', destCountry: 'CN',
    incoterm: 'DAP', currency: 'USD', transitDays: 3, freeTimeDays: 3, validFrom: '2026-05-01', validTo: '2026-11-30',
    status: 'ACTIVE', carrier: 'Garuda Cargo / China Eastern', usageCount: 17,
    inclusions: ['Airport-to-door delivery', 'Export clearance', 'Security screening'],
    exclusions: ['Dangerous goods handling', 'Chinese import duty', 'Remote area surcharge'],
    rateLines: [
      rate('rl_28', 'OFR', 'PER_KG', 3.4, 4.9, 'USD'),
      rate('rl_29', 'DOC', 'PER_BL', 25, 55, 'USD'),
      rate('rl_30', 'CLR', 'PER_SHIPMENT', 65, 120, 'USD'),
      rate('rl_31', 'TRUCK', 'PER_SHIPMENT', 90, 160, 'USD'),
    ],
    notes: 'Chargeable weight uses the IATA volumetric divisor of 6000. Minimum chargeable weight is 45 kg.',
  },
  {
    id: 'pkg_6', code: 'PKG-KR-REF-06', name: 'Makassar → Busan Reefer Seafood', mode: 'FCL', scope: 'PORT_TO_PORT',
    originPortCode: 'IDMAK', originPortName: 'Makassar', destPortCode: 'KRPUS', destPortName: 'Busan', destCountry: 'KR',
    incoterm: 'CIF', currency: 'USD', transitDays: 18, freeTimeDays: 7, validFrom: '2026-04-01', validTo: '2026-09-30',
    status: 'ACTIVE', carrier: 'Evergreen Line', usageCount: 6,
    inclusions: ['Reefer ocean freight at -18 °C', 'Pre-trip inspection', 'Genset during inland move', 'Insurance 110%'],
    exclusions: ['Plug-in charges at destination beyond 7 days', 'Korean quarantine inspection fee'],
    rateLines: [
      rate('rl_32', 'OFR', 'PER_CONTAINER', 2450, 2980, 'USD', true, '40RH'),
      rate('rl_33', 'THC-O', 'PER_CONTAINER', 210, 265, 'USD'),
      rate('rl_34', 'INS', 'PERCENT_OF_VALUE', 0.12, 0.2, 'USD'),
      rate('rl_35', 'VGM', 'PER_CONTAINER', 12, 25, 'USD'),
      rate('rl_36', 'PHYTO', 'PER_DOCUMENT', 40, 85, 'USD'),
    ],
    notes: 'Reefer plug availability at Makassar is limited — book the depot slot at least 5 days before stuffing.',
  },
  {
    id: 'pkg_7', code: 'PKG-AE-BBK-07', name: 'Surabaya → Jebel Ali Breakbulk Trial', mode: 'BREAKBULK', scope: 'PORT_TO_PORT',
    originPortCode: 'IDSUB', originPortName: 'Tanjung Perak', destPortCode: 'AEJEA', destPortName: 'Jebel Ali', destCountry: 'AE',
    incoterm: 'CFR', currency: 'USD', transitDays: 22, freeTimeDays: 5, validFrom: '2026-08-15', validTo: '2026-10-15',
    status: 'DRAFT', carrier: 'PIL', usageCount: 0,
    inclusions: ['Ocean freight per revenue tonne', 'Lashing and securing', 'Survey report'],
    exclusions: ['Heavy lift crane at destination', 'Stevedoring at destination'],
    rateLines: [
      rate('rl_37', 'OFR', 'PER_TON', 78, 112, 'USD'),
      rate('rl_38', 'STUFF', 'PER_TON', 14, 26, 'USD'),
      rate('rl_39', 'DOC', 'PER_BL', 45, 90, 'USD'),
    ],
    notes: 'Draft pending the marine surveyor quote for lashing on marble slab cradles.',
  },
  {
    id: 'pkg_8', code: 'PKG-EU-FCL-00', name: 'Java → North Europe FCL (Q2 legacy)', mode: 'FCL', scope: 'PORT_TO_PORT',
    originPortCode: 'IDSRG', originPortName: 'Tanjung Emas', destPortCode: 'NLRTM', destPortName: 'Rotterdam', destCountry: 'NL',
    incoterm: 'FOB', currency: 'USD', transitDays: 34, freeTimeDays: 14, validFrom: '2026-04-01', validTo: '2026-06-30',
    status: 'EXPIRED', carrier: 'Maersk Line', usageCount: 31,
    inclusions: ['Ocean freight', 'Origin THC', 'B/L issuance'],
    exclusions: ['Destination THC', 'Fumigation'],
    rateLines: [
      rate('rl_40', 'OFR', 'PER_CONTAINER', 1090, 1360, 'USD', true, '40HC'),
      rate('rl_41', 'THC-O', 'PER_CONTAINER', 148, 188, 'USD'),
      rate('rl_42', 'DOC', 'PER_BL', 35, 65, 'USD'),
    ],
    notes: 'Superseded by PKG-EU-FCL-01. Kept for the audit trail of Q2 jobs.',
  },
]

/* ================================================================
   PROJECT STAGE TEMPLATES
   ================================================================ */
const STAGE_TASKS: Record<StageKey, { label: string; blocking: boolean; hint?: string }[]> = {
  INQUIRY: [
    { label: 'Requirement captured (commodity, volume, terms)', blocking: true },
    { label: 'Service package selected and priced', blocking: true, hint: 'Links the rate card that drives the charge sheet.' },
    { label: 'Quotation sent to client', blocking: true },
    { label: 'Credit check against limit and outstanding AR', blocking: true, hint: 'Blocks the job when the client is over their limit.' },
    { label: 'Client acceptance received in writing', blocking: true },
  ],
  BOOKING: [
    { label: 'Space booked with carrier', blocking: true },
    { label: 'Booking confirmation received', blocking: true },
    { label: 'Vessel, voyage and ETD confirmed', blocking: true },
    { label: 'Cut-off calendar recorded (SI / VGM / gate-in)', blocking: true, hint: 'Every downstream alert is derived from these dates.' },
    { label: 'Empty container release order issued', blocking: false },
  ],
  CARGO_PLAN: [
    { label: 'Cargo list received from shipper', blocking: true },
    { label: 'Cargo allocated to containers', blocking: true },
    { label: 'Volume and payload validated against container specs', blocking: true, hint: 'Overloaded containers are rejected at the gate.' },
    { label: 'Dangerous goods classification checked', blocking: false },
    { label: 'Stuffing schedule agreed with the depot', blocking: false },
  ],
  DOCUMENTATION: [
    { label: 'Shipping Instruction filed before SI cut-off', blocking: true },
    { label: 'Commercial invoice and packing list received', blocking: true },
    { label: 'PEB submitted via CEISA', blocking: true, hint: 'Indonesian export declaration.' },
    { label: 'Certificate of Origin applied for', blocking: false },
    { label: 'Draft B/L approved by the shipper', blocking: true },
  ],
  STUFFING: [
    { label: 'Container stuffed and sealed', blocking: true },
    { label: 'VGM weighed and submitted before cut-off', blocking: true, hint: 'SOLAS: no VGM, no loading.' },
    { label: 'NPE issued by Customs', blocking: true },
    { label: 'Container gated in before the CY cut-off', blocking: true },
  ],
  DEPARTURE: [
    { label: 'Loaded on board confirmed', blocking: true },
    { label: 'B/L issued and released per instruction', blocking: true },
    { label: 'Shipping advice sent to consignee', blocking: false },
    { label: 'Tracking milestones subscribed', blocking: false },
  ],
  ARRIVAL: [
    { label: 'Arrival notice sent to the consignee', blocking: true },
    { label: 'Original B/L surrendered or telex released', blocking: true },
    { label: 'Delivery order released', blocking: true },
    { label: 'Proof of delivery collected', blocking: false },
  ],
  SETTLEMENT: [
    { label: 'All charges approved and locked', blocking: true },
    { label: 'Sales invoice issued to the client', blocking: true },
    { label: 'Vendor bills matched and posted', blocking: true },
    { label: 'Consignment sales report reconciled', blocking: false, hint: 'Consignment jobs only.' },
    { label: 'Job costing reviewed and closed', blocking: true },
  ],
}

function buildStages(current: StageKey, progressInCurrent: number, offsetDays: number): ProjectStage[] {
  const currentIdx = stageIndex(current)
  return STAGES.map((s, idx) => {
    const template = STAGE_TASKS[s.key]
    const past = idx < currentIdx
    const isCurrent = idx === currentIdx
    const tasks: StageTask[] = template.map((t, ti) => {
      const done = past || (isCurrent && ti < Math.round(template.length * progressInCurrent))
      return {
        id: `tsk_${s.key}_${ti}`,
        label: t.label,
        blocking: t.blocking,
        hint: t.hint,
        done,
        owner: TEAM[(ti + idx) % TEAM.length],
        dueAt: day(offsetDays + idx * 3 + ti),
        completedAt: done ? day(offsetDays + idx * 3 + ti - 1) : undefined,
      }
    })
    return {
      key: s.key,
      enteredAt: idx <= currentIdx ? day(offsetDays + idx * 3) : undefined,
      completedAt: past ? day(offsetDays + idx * 3 + template.length) : undefined,
      tasks,
    }
  })
}

function buildTimeline(code: string, stage: StageKey, offsetDays: number): TimelineEvent[] {
  const idx = stageIndex(stage)
  const events: TimelineEvent[] = [
    { id: `${code}_t0`, at: day(offsetDays), type: 'STATUS', title: 'Job created', detail: `${code} opened from the client inquiry.`, actor: pick(TEAM) },
  ]
  const script: { i: number; type: TimelineEvent['type']; title: string; detail: string }[] = [
    { i: 1, type: 'STATUS', title: 'Quotation accepted', detail: 'Client confirmed the rate and service scope in writing.' },
    { i: 1, type: 'TRANSPORT', title: 'Carrier booking confirmed', detail: 'Space secured; cut-off calendar recorded.' },
    { i: 2, type: 'NOTE', title: 'Cargo list received', detail: 'Shipper sent the packing breakdown for container allocation.' },
    { i: 3, type: 'DOCUMENT', title: 'Shipping Instruction filed', detail: 'SI submitted to the carrier ahead of cut-off.' },
    { i: 3, type: 'CUSTOMS', title: 'PEB submitted', detail: 'Export declaration lodged through CEISA.' },
    { i: 4, type: 'TRANSPORT', title: 'Containers stuffed and sealed', detail: 'Stuffing completed at the shipper facility.' },
    { i: 4, type: 'DOCUMENT', title: 'VGM submitted', detail: 'Verified gross mass filed under SOLAS method SM2.' },
    { i: 5, type: 'TRANSPORT', title: 'Loaded on board', detail: 'Confirmed on board; sailing on schedule.' },
    { i: 5, type: 'DOCUMENT', title: 'B/L issued', detail: 'House B/L released to the shipper.' },
    { i: 6, type: 'TRANSPORT', title: 'Arrival notice sent', detail: 'Consignee notified with the ETA and charges.' },
    { i: 7, type: 'FINANCE', title: 'Sales invoice issued', detail: 'Charge sheet locked and invoiced to the client.' },
  ]
  script.filter((s) => s.i <= idx).forEach((s, i) => {
    events.push({ id: `${code}_t${i + 1}`, at: day(offsetDays + s.i * 3 + i), type: s.type, title: s.title, detail: s.detail, actor: pick(TEAM) })
  })
  return events.reverse()
}

/* ================================================================
   PROJECTS
   ================================================================ */
type ProjSpec = Partial<Project> & { id: string; code: string; name: string; stage: StageKey }

const projSpecs: ProjSpec[] = [
  {
    id: 'prj_1', code: 'PRJ-2026-0041', jobNo: 'JKT/EXP/26/0841', name: 'Jati Makmur — Rotterdam Furniture W35', type: 'FULL_EXPORT',
    stage: 'DEPARTURE', status: 'ACTIVE', priority: 'HIGH', clientId: 'cus_1', clientOfficeId: 'off_1', shipperId: 'cus_1', shipperOfficeId: 'off_1',
    consigneeId: 'cus_1', consigneeOfficeId: 'off_2', mode: 'FCL', scope: 'PORT_TO_PORT', incoterm: 'FOB', freightTerm: 'PREPAID',
    paymentTerm: 'NET_30', packageId: 'pkg_1', commodity: 'Teak dining sets, knock-down', hsCodes: ['9403.60'], cargoValue: 284_500,
    cargoCurrency: 'USD', insured: true, insuranceValue: 312_950, dangerousGoods: false, polCode: 'IDSRG', polName: 'Tanjung Emas',
    podCode: 'NLRTM', podName: 'Rotterdam', destCountry: 'NL', carrier: 'Maersk Line', vessel: 'Maersk Semarang', voyage: '634W',
    bookingNo: 'MAEU-BK-8827194', masterBlNo: 'MAEU221847390', houseBlNo: 'MFI/RTM/26/0841', blType: 'ORIGINAL_3_3', blStatus: 'ISSUED',
    siCutoff: day(-9), vgmCutoff: day(-8), gateInCutoff: day(-7), etd: day(-5), atd: day(-5), eta: day(27),
    pebNumber: '000412-2026-SRG', pebDate: day(-10), npeDate: day(-8), cooForm: 'EUR.1 / Form A', cooNumber: 'SKA/26/117844',
    currency: 'USD', fxRate: 16250, quotedRevenue: 9_640, ownerName: 'Elena Marchetti', tags: ['europe', 'furniture', 'fumigation'],
    remarks: 'Three units of 40HC. Fumigation certificate issued for the wooden crating.',
  },
  {
    id: 'prj_2', code: 'PRJ-2026-0042', jobNo: 'MES/EXP/26/0233', name: 'Anugerah Rubber — Yokohama TSNR20 Aug', type: 'FULL_EXPORT',
    stage: 'STUFFING', status: 'ACTIVE', priority: 'CRITICAL', clientId: 'cus_2', clientOfficeId: 'off_4', shipperId: 'cus_2', shipperOfficeId: 'off_4',
    consigneeId: 'cus_2', consigneeOfficeId: 'off_5', mode: 'FCL', scope: 'PORT_TO_PORT', incoterm: 'CIF', freightTerm: 'PREPAID',
    paymentTerm: 'LC_AT_SIGHT', packageId: 'pkg_2', commodity: 'TSNR 20 natural rubber bales', hsCodes: ['4001.22'], cargoValue: 412_000,
    cargoCurrency: 'USD', insured: true, insuranceValue: 453_200, dangerousGoods: false, polCode: 'IDBLW', polName: 'Belawan',
    podCode: 'JPYOK', podName: 'Yokohama', destCountry: 'JP', carrier: 'Ocean Network Express', vessel: 'ONE Competence', voyage: '112N',
    bookingNo: 'ONEY-BK-5518822', blType: 'ORIGINAL_3_3', blStatus: 'DRAFT', siCutoff: day(1), vgmCutoff: day(2), gateInCutoff: day(2),
    etd: day(4), eta: day(20), pebNumber: '000297-2026-BLW', pebDate: day(0), cooForm: 'Form JIEPA',
    currency: 'USD', fxRate: 16250, quotedRevenue: 12_180, ownerName: 'Marcus Bell', tags: ['japan', 'lc', 'rubber'],
    remarks: 'L/C at sight — every document must match the credit exactly, no discrepancies allowed. COO must be dated before ETD.',
  },
  {
    id: 'prj_3', code: 'PRJ-2026-0043', jobNo: 'DPS/CNS/26/0072', name: 'Bali Craft — Sydney Consignment Cycle 7', type: 'CONSIGNMENT',
    stage: 'ARRIVAL', status: 'ACTIVE', priority: 'STANDARD', clientId: 'cus_3', clientOfficeId: 'off_7', shipperId: 'cus_3', shipperOfficeId: 'off_9',
    consigneeId: 'cus_3', consigneeOfficeId: 'off_8', mode: 'LCL', scope: 'DOOR_TO_DOOR', incoterm: 'DAP', freightTerm: 'PREPAID',
    paymentTerm: 'CONSIGNMENT_SETTLEMENT', packageId: 'pkg_3', commodity: 'Rattan homeware, carved teak decor', hsCodes: ['9403.60', '4407.29'],
    cargoValue: 96_400, cargoCurrency: 'AUD', insured: true, insuranceValue: 106_040, dangerousGoods: false, polCode: 'IDSUB', polName: 'Tanjung Perak',
    podCode: 'AUSYD', podName: 'Sydney', destCountry: 'AU', carrier: 'CMA CGM', vessel: 'CMA CGM Coral', voyage: '0AB2W',
    bookingNo: 'CMDU-BK-3391027', houseBlNo: 'MFI/SYD/26/0072', blType: 'SEAWAY', blStatus: 'RELEASED',
    siCutoff: day(-26), vgmCutoff: day(-25), gateInCutoff: day(-24), etd: day(-22), atd: day(-22), eta: day(-1), ata: day(-1),
    pebNumber: '000188-2026-SUB', pebDate: day(-27), cooForm: 'Form AANZFTA',
    currency: 'AUD', fxRate: 10650, quotedRevenue: 14_820, ownerName: 'Sofia Reyes', tags: ['consignment', 'australia', 'aqis'],
    remarks: 'Consignment cycle 7. Title stays with the shipper until the showroom sells. AQIS inspection passed on arrival.',
    consignment: {
      agreementNo: 'CNS-BALI-2026-07', titleRetained: true, settlementCycleDays: 30, commissionPct: 22,
      minimumGuaranteedUnits: 400, unsoldReturnDays: 120, reportedUnitsSold: 268, totalUnitsShipped: 640,
      lastSalesReportAt: day(-4), settledAmount: 38_400, currency: 'AUD',
    },
  },
  {
    id: 'prj_4', code: 'PRJ-2026-0044', jobNo: 'SUB/EXP/26/0419', name: 'Sinar Kopi — Hamburg Specialty Green W36', type: 'FULL_EXPORT',
    stage: 'DOCUMENTATION', status: 'ACTIVE', priority: 'HIGH', clientId: 'cus_4', clientOfficeId: 'off_10', shipperId: 'cus_4', shipperOfficeId: 'off_10',
    consigneeId: 'cus_4', consigneeOfficeId: 'off_11', mode: 'FCL', scope: 'PORT_TO_PORT', incoterm: 'FOB', freightTerm: 'PREPAID',
    paymentTerm: 'NET_30', packageId: 'pkg_1', commodity: 'Arabica green coffee, 60 kg jute bags', hsCodes: ['0901.11'], cargoValue: 198_000,
    cargoCurrency: 'USD', insured: false, dangerousGoods: false, polCode: 'IDSUB', polName: 'Tanjung Perak', podCode: 'DEHAM', podName: 'Hamburg',
    destCountry: 'DE', carrier: 'Hapag-Lloyd', vessel: 'Hamburg Bay', voyage: '228W', bookingNo: 'HLCU-BK-7712430',
    blType: 'TELEX_RELEASE', blStatus: 'NOT_ISSUED', siCutoff: day(2), vgmCutoff: day(3), gateInCutoff: day(4), etd: day(6), eta: day(38),
    pebNumber: '000501-2026-SUB', pebDate: day(1), cooForm: 'Form A',
    currency: 'USD', fxRate: 16250, quotedRevenue: 6_290, ownerName: 'Priya Nair', tags: ['coffee', 'europe', 'phyto'],
    remarks: 'Phytosanitary certificate is still with Karantina — it must be in hand before the SI cut-off in two days.',
  },
  {
    id: 'prj_5', code: 'PRJ-2026-0045', jobNo: 'BTM/AIR/26/0158', name: 'Cakra Elektronik — Shanghai Harness AOG', type: 'PARTIAL_LCL',
    stage: 'CARGO_PLAN', status: 'ACTIVE', priority: 'CRITICAL', clientId: 'cus_6', clientOfficeId: 'off_14', shipperId: 'cus_6', shipperOfficeId: 'off_14',
    consigneeId: 'cus_6', consigneeOfficeId: 'off_15', mode: 'AIR', scope: 'DOOR_TO_DOOR', incoterm: 'DAP', freightTerm: 'PREPAID',
    paymentTerm: 'NET_14', packageId: 'pkg_5', commodity: 'Automotive wire harness assemblies', hsCodes: ['8544.42'], cargoValue: 88_600,
    cargoCurrency: 'USD', insured: true, insuranceValue: 97_460, dangerousGoods: false, polCode: 'IDTPP', polName: 'Soekarno-Hatta (CGK)',
    podCode: 'CNSHA', podName: 'Pudong (PVG)', destCountry: 'CN', carrier: 'China Eastern', blType: 'EXPRESS', blStatus: 'NOT_ISSUED',
    siCutoff: day(1), etd: day(2), eta: day(4), currency: 'USD', fxRate: 16250, quotedRevenue: 4_760, ownerName: 'Tomas Weber',
    tags: ['air', 'urgent', 'china'],
    remarks: 'Line-stop risk at the Shanghai plant. Chargeable weight is volumetric — confirm the final carton dimensions today.',
  },
  {
    id: 'prj_6', code: 'PRJ-2026-0046', jobNo: 'MAK/EXP/26/0061', name: 'Samudra Beku — Busan Frozen Shrimp Sep', type: 'FULL_EXPORT',
    stage: 'BOOKING', status: 'ACTIVE', priority: 'HIGH', clientId: 'cus_8', clientOfficeId: 'off_18', shipperId: 'cus_8', shipperOfficeId: 'off_18',
    consigneeId: 'cus_8', consigneeOfficeId: 'off_19', mode: 'FCL', scope: 'PORT_TO_PORT', incoterm: 'CIF', freightTerm: 'PREPAID',
    paymentTerm: 'NET_30', packageId: 'pkg_6', commodity: 'Frozen vannamei shrimp, block frozen -18 °C', hsCodes: ['0306.17'],
    cargoValue: 356_000, cargoCurrency: 'USD', insured: true, insuranceValue: 391_600, dangerousGoods: false, polCode: 'IDMAK',
    polName: 'Makassar', podCode: 'KRPUS', podName: 'Busan', destCountry: 'KR', carrier: 'Evergreen Line', vessel: 'Ever Lambent',
    voyage: '0918E', bookingNo: 'EGLV-BK-2274118', blType: 'ORIGINAL_3_3', blStatus: 'NOT_ISSUED',
    siCutoff: day(8), vgmCutoff: day(9), gateInCutoff: day(9), etd: day(12), eta: day(30),
    currency: 'USD', fxRate: 16250, quotedRevenue: 7_420, ownerName: 'Sofia Reyes', tags: ['reefer', 'korea', 'seafood'],
    remarks: 'Reefer plug at the depot confirmed for the 9th. Pre-trip inspection report must be attached before stuffing.',
  },
  {
    id: 'prj_7', code: 'PRJ-2026-0047', jobNo: 'JKT/EXP/26/0855', name: 'Emirates Stone — Jebel Ali Marble Trial', type: 'PROJECT_CARGO',
    stage: 'INQUIRY', status: 'DRAFT', priority: 'STANDARD', clientId: 'cus_7', clientOfficeId: 'off_17', shipperId: 'cus_7', shipperOfficeId: 'off_17',
    consigneeId: 'cus_7', consigneeOfficeId: 'off_17', mode: 'BREAKBULK', scope: 'PORT_TO_PORT', incoterm: 'CFR', freightTerm: 'PREPAID',
    paymentTerm: 'TT_ADVANCE', packageId: 'pkg_7', commodity: 'Marble slabs on A-frame cradles', hsCodes: ['2515.11'], cargoValue: 142_000,
    cargoCurrency: 'USD', insured: false, dangerousGoods: false, polCode: 'IDSUB', polName: 'Tanjung Perak', podCode: 'AEJEA',
    podName: 'Jebel Ali', destCountry: 'AE', blType: 'ORIGINAL_3_3', blStatus: 'NOT_ISSUED', currency: 'USD', fxRate: 16250,
    quotedRevenue: 5_180, ownerName: 'Marcus Bell', tags: ['prospect', 'breakbulk', 'middle-east'],
    remarks: 'Prospect trial. Quote is valid for 14 days; TT advance in full is required before booking because there is no credit line.',
  },
  {
    id: 'prj_8', code: 'PRJ-2026-0038', jobNo: 'JKT/EXP/26/0798', name: 'Jati Makmur — Savannah Furniture W29', type: 'FULL_EXPORT',
    stage: 'SETTLEMENT', status: 'ACTIVE', priority: 'STANDARD', clientId: 'cus_1', clientOfficeId: 'off_1', shipperId: 'cus_1', shipperOfficeId: 'off_1',
    consigneeId: 'cus_1', consigneeOfficeId: 'off_3', mode: 'FCL', scope: 'DOOR_TO_PORT', incoterm: 'FOB', freightTerm: 'PREPAID',
    paymentTerm: 'NET_30', packageId: 'pkg_4', commodity: 'Teak outdoor furniture', hsCodes: ['9403.60'], cargoValue: 246_800,
    cargoCurrency: 'USD', insured: true, insuranceValue: 271_480, dangerousGoods: false, polCode: 'IDTPP', polName: 'Tanjung Priok',
    podCode: 'USSAV', podName: 'Savannah', destCountry: 'US', carrier: 'Hapag-Lloyd', vessel: 'Chicago Express', voyage: '412W',
    bookingNo: 'HLCU-BK-7698210', masterBlNo: 'HLCUJK2026114', houseBlNo: 'MFI/SAV/26/0798', blType: 'TELEX_RELEASE', blStatus: 'SURRENDERED',
    siCutoff: day(-58), vgmCutoff: day(-57), gateInCutoff: day(-56), etd: day(-53), atd: day(-53), eta: day(-15), ata: day(-13),
    pebNumber: '000355-2026-TPP', pebDate: day(-59), npeDate: day(-57), cooForm: 'Form A', cooNumber: 'SKA/26/109221',
    currency: 'USD', fxRate: 16100, quotedRevenue: 11_320, ownerName: 'Elena Marchetti', tags: ['usa', 'furniture'],
    remarks: 'Delivered. Two days of demurrage at Savannah are in dispute with the client — evidence pack sent.',
  },
  {
    id: 'prj_9', code: 'PRJ-2026-0039', jobNo: 'MES/EXP/26/0228', name: 'Anugerah Rubber — Busan TSNR20 Jul', type: 'FULL_EXPORT',
    stage: 'SETTLEMENT', status: 'COMPLETED', priority: 'STANDARD', clientId: 'cus_2', clientOfficeId: 'off_4', shipperId: 'cus_2', shipperOfficeId: 'off_4',
    consigneeId: 'cus_2', consigneeOfficeId: 'off_6', mode: 'FCL', scope: 'PORT_TO_PORT', incoterm: 'CIF', freightTerm: 'PREPAID',
    paymentTerm: 'LC_AT_SIGHT', packageId: 'pkg_2', commodity: 'TSNR 20 natural rubber bales', hsCodes: ['4001.22'], cargoValue: 388_000,
    cargoCurrency: 'USD', insured: true, insuranceValue: 426_800, dangerousGoods: false, polCode: 'IDBLW', polName: 'Belawan',
    podCode: 'KRPUS', podName: 'Busan', destCountry: 'KR', carrier: 'Ocean Network Express', vessel: 'ONE Cygnus', voyage: '108N',
    bookingNo: 'ONEY-BK-5498103', masterBlNo: 'ONEYBLWA1188', houseBlNo: 'MFI/PUS/26/0228', blType: 'ORIGINAL_3_3', blStatus: 'SURRENDERED',
    etd: day(-72), atd: day(-72), eta: day(-54), ata: day(-53), pebNumber: '000241-2026-BLW', pebDate: day(-75), cooForm: 'Form AK',
    cooNumber: 'SKA/26/104417', currency: 'USD', fxRate: 16050, quotedRevenue: 10_940, ownerName: 'Marcus Bell', tags: ['korea', 'rubber', 'closed'],
    remarks: 'Closed and fully settled. L/C proceeds received without discrepancy.',
  },
  {
    id: 'prj_10', code: 'PRJ-2026-0048', jobNo: 'BDG/EXP/26/0311', name: 'Pacific Textile — LA Apparel W36', type: 'FULL_EXPORT',
    stage: 'INQUIRY', status: 'ON_HOLD', priority: 'HIGH', clientId: 'cus_5', clientOfficeId: 'off_12', shipperId: 'cus_5', shipperOfficeId: 'off_13',
    consigneeId: 'cus_5', consigneeOfficeId: 'off_12', mode: 'FCL', scope: 'PORT_TO_PORT', incoterm: 'FOB', freightTerm: 'COLLECT',
    paymentTerm: 'NET_30', packageId: 'pkg_4', commodity: 'Knitted cotton T-shirts, cartons', hsCodes: ['6109.10'], cargoValue: 164_200,
    cargoCurrency: 'USD', insured: false, dangerousGoods: false, polCode: 'IDTPP', polName: 'Tanjung Priok', podCode: 'USLAX',
    podName: 'Los Angeles', destCountry: 'US', blType: 'ORIGINAL_3_3', blStatus: 'NOT_ISSUED', currency: 'USD', fxRate: 16250,
    quotedRevenue: 8_450, ownerName: 'David Chen', tags: ['credit-hold', 'usa', 'apparel'],
    remarks: 'ON HOLD — client is over their credit limit by IDR 118.5 M. Booking is blocked until the overdue invoice is settled or a director releases it.',
  },
  {
    id: 'prj_11', code: 'PRJ-2026-0049', jobNo: 'DPS/CNS/26/0078', name: 'Bali Craft — Sydney Consignment Cycle 8', type: 'CONSIGNMENT',
    stage: 'CARGO_PLAN', status: 'ACTIVE', priority: 'STANDARD', clientId: 'cus_3', clientOfficeId: 'off_7', shipperId: 'cus_3', shipperOfficeId: 'off_9',
    consigneeId: 'cus_3', consigneeOfficeId: 'off_8', mode: 'LCL', scope: 'DOOR_TO_DOOR', incoterm: 'DAP', freightTerm: 'PREPAID',
    paymentTerm: 'CONSIGNMENT_SETTLEMENT', packageId: 'pkg_3', commodity: 'Rattan furniture, ceramic tableware', hsCodes: ['9403.60'],
    cargoValue: 74_800, cargoCurrency: 'AUD', insured: true, insuranceValue: 82_280, dangerousGoods: false, polCode: 'IDSUB',
    polName: 'Tanjung Perak', podCode: 'AUSYD', podName: 'Sydney', destCountry: 'AU', carrier: 'CMA CGM', blType: 'SEAWAY',
    blStatus: 'NOT_ISSUED', siCutoff: day(6), vgmCutoff: day(7), gateInCutoff: day(7), etd: day(10), eta: day(31),
    currency: 'AUD', fxRate: 10650, quotedRevenue: 11_640, ownerName: 'Sofia Reyes', tags: ['consignment', 'australia'],
    remarks: 'Cycle 8. Unsold stock from cycle 6 must be returned within 120 days — 41 units are at day 96.',
    consignment: {
      agreementNo: 'CNS-BALI-2026-08', titleRetained: true, settlementCycleDays: 30, commissionPct: 22,
      minimumGuaranteedUnits: 350, unsoldReturnDays: 120, reportedUnitsSold: 0, totalUnitsShipped: 480,
      settledAmount: 0, currency: 'AUD',
    },
  },
  {
    id: 'prj_12', code: 'PRJ-2026-0050', jobNo: 'SUB/EXP/26/0424', name: 'Sinar Kopi — Rotterdam Robusta W38', type: 'FULL_EXPORT',
    stage: 'INQUIRY', status: 'ACTIVE', priority: 'STANDARD', clientId: 'cus_4', clientOfficeId: 'off_10', shipperId: 'cus_4', shipperOfficeId: 'off_10',
    consigneeId: 'cus_4', consigneeOfficeId: 'off_11', mode: 'FCL', scope: 'PORT_TO_PORT', incoterm: 'FOB', freightTerm: 'PREPAID',
    paymentTerm: 'NET_30', packageId: 'pkg_1', commodity: 'Robusta green coffee, 60 kg bags', hsCodes: ['0901.11'], cargoValue: 152_400,
    cargoCurrency: 'USD', insured: false, dangerousGoods: false, polCode: 'IDSUB', polName: 'Tanjung Perak', podCode: 'NLRTM',
    podName: 'Rotterdam', destCountry: 'NL', blType: 'TELEX_RELEASE', blStatus: 'NOT_ISSUED', etd: day(24), eta: day(56),
    currency: 'USD', fxRate: 16250, quotedRevenue: 5_980, ownerName: 'Priya Nair', tags: ['coffee', 'europe'],
    remarks: 'Quote issued, awaiting the buyer contract. Booking window opens once the client confirms the sailing week.',
  },
  {
    id: 'prj_13', code: 'PRJ-2026-0051', jobNo: 'BTM/EXP/26/0162', name: 'Cakra Elektronik — Ho Chi Minh Components', type: 'FULL_EXPORT',
    stage: 'DOCUMENTATION', status: 'ACTIVE', priority: 'STANDARD', clientId: 'cus_6', clientOfficeId: 'off_14', shipperId: 'cus_6', shipperOfficeId: 'off_14',
    consigneeId: 'cus_6', consigneeOfficeId: 'off_16', mode: 'FCL', scope: 'PORT_TO_DOOR', incoterm: 'CIP', freightTerm: 'PREPAID',
    paymentTerm: 'NET_14', commodity: 'Electronic connectors and cable assemblies', hsCodes: ['8544.42'], cargoValue: 118_900,
    cargoCurrency: 'USD', insured: true, insuranceValue: 130_790, dangerousGoods: false, polCode: 'IDTPP', polName: 'Tanjung Priok',
    podCode: 'VNSGN', podName: 'Cat Lai', destCountry: 'VN', carrier: 'SITC Line', vessel: 'SITC Hakata', voyage: '2612S',
    bookingNo: 'SAMU-BK-1129004', blType: 'SEAWAY', blStatus: 'DRAFT', siCutoff: day(3), vgmCutoff: day(4), gateInCutoff: day(4),
    etd: day(7), eta: day(13), pebNumber: '000517-2026-TPP', pebDate: day(2), cooForm: 'Form D',
    currency: 'USD', fxRate: 16250, quotedRevenue: 3_940, ownerName: 'Tomas Weber', tags: ['asean', 'electronics'],
    remarks: 'Form D under ATIGA gives the consignee a 0% duty — the invoice value must match the COO exactly.',
  },
  {
    id: 'prj_14', code: 'PRJ-2026-0052', jobNo: 'JKT/EXP/26/0860', name: 'Jati Makmur — Rotterdam Furniture W38', type: 'FULL_EXPORT',
    stage: 'BOOKING', status: 'ACTIVE', priority: 'STANDARD', clientId: 'cus_1', clientOfficeId: 'off_1', shipperId: 'cus_1', shipperOfficeId: 'off_1',
    consigneeId: 'cus_1', consigneeOfficeId: 'off_2', mode: 'FCL', scope: 'PORT_TO_PORT', incoterm: 'FOB', freightTerm: 'PREPAID',
    paymentTerm: 'NET_30', packageId: 'pkg_1', commodity: 'Teak bedroom sets, knock-down', hsCodes: ['9403.60'], cargoValue: 221_600,
    cargoCurrency: 'USD', insured: true, insuranceValue: 243_760, dangerousGoods: false, polCode: 'IDSRG', polName: 'Tanjung Emas',
    podCode: 'NLRTM', podName: 'Rotterdam', destCountry: 'NL', carrier: 'Maersk Line', vessel: 'Maersk Batam', voyage: '638W',
    bookingNo: 'MAEU-BK-8841266', blType: 'ORIGINAL_3_3', blStatus: 'NOT_ISSUED', siCutoff: day(11), vgmCutoff: day(12),
    gateInCutoff: day(12), etd: day(16), eta: day(48), currency: 'USD', fxRate: 16250, quotedRevenue: 7_240,
    ownerName: 'Elena Marchetti', tags: ['europe', 'furniture'], remarks: 'Two units of 40HC booked. Fumigation slot to be reserved.',
  },
]

export const projects: Project[] = projSpecs.map((spec, i) => {
  const offset = -60 + i * 4
  const progress = [0.6, 0.75, 0.5, 0.6, 0.4, 0.8, 0.6, 0.6, 1, 0.2, 0.35, 0.4, 0.6, 0.8][i] ?? 0.5
  return {
    notifyPartyId: undefined,
    placeOfReceipt: undefined,
    transhipmentPort: undefined,
    ...spec,
    stages: buildStages(spec.stage, progress, offset),
    timeline: buildTimeline(spec.code, spec.stage, offset),
    createdAt: day(offset),
    updatedAt: day(offset + 20),
  } as Project
})

/* ================================================================
   CONTAINERS + CARGO
   ================================================================ */
const cargoDefs: Record<string, { desc: string; hs: string; unit: Container['items'][number]['packageUnit']; l: number; w: number; h: number; kg: number }[]> = {
  prj_1: [
    { desc: 'Teak dining table 180x90, knock-down', hs: '9403.60', unit: 'CRATE', l: 190, w: 100, h: 28, kg: 62 },
    { desc: 'Teak dining chair, stacked 4/crate', hs: '9403.60', unit: 'CRATE', l: 120, w: 60, h: 110, kg: 48 },
    { desc: 'Teak sideboard 160x45', hs: '9403.60', unit: 'CRATE', l: 170, w: 55, h: 90, kg: 78 },
  ],
  prj_2: [{ desc: 'TSNR 20 rubber bale 35 kg, palletised', hs: '4001.22', unit: 'PALLET', l: 110, w: 110, h: 120, kg: 1120 }],
  prj_3: [
    { desc: 'Rattan lounge chair', hs: '9403.60', unit: 'CARTON', l: 90, w: 85, h: 95, kg: 14 },
    { desc: 'Carved teak wall panel 120x60', hs: '4407.29', unit: 'CRATE', l: 130, w: 70, h: 12, kg: 22 },
    { desc: 'Ceramic tableware set, 12 pcs', hs: '9403.60', unit: 'CARTON', l: 50, w: 40, h: 35, kg: 11 },
  ],
  prj_4: [{ desc: 'Arabica green coffee, 60 kg jute bag', hs: '0901.11', unit: 'BAG', l: 90, w: 55, h: 25, kg: 60 }],
  prj_5: [{ desc: 'Wire harness assembly, anti-static carton', hs: '8544.42', unit: 'CARTON', l: 60, w: 40, h: 35, kg: 12 }],
  prj_6: [{ desc: 'Frozen vannamei shrimp, 10 kg master carton', hs: '0306.17', unit: 'CARTON', l: 50, w: 30, h: 20, kg: 10.4 }],
  prj_8: [
    { desc: 'Teak outdoor bench, knock-down', hs: '9403.60', unit: 'CRATE', l: 180, w: 70, h: 40, kg: 55 },
    { desc: 'Teak parasol base', hs: '9403.60', unit: 'PALLET', l: 110, w: 110, h: 60, kg: 420 },
  ],
  prj_9: [{ desc: 'TSNR 20 rubber bale 35 kg, palletised', hs: '4001.22', unit: 'PALLET', l: 110, w: 110, h: 120, kg: 1120 }],
  prj_11: [
    { desc: 'Rattan dining set, 5 pcs', hs: '9403.60', unit: 'CARTON', l: 120, w: 90, h: 80, kg: 26 },
    { desc: 'Ceramic vase, large', hs: '9403.60', unit: 'CARTON', l: 45, w: 45, h: 70, kg: 9 },
  ],
  prj_13: [{ desc: 'Electronic connector, reel packed', hs: '8544.42', unit: 'CARTON', l: 45, w: 45, h: 30, kg: 16 }],
  prj_14: [
    { desc: 'Teak bed frame 200x180, knock-down', hs: '9403.60', unit: 'CRATE', l: 210, w: 60, h: 35, kg: 74 },
    { desc: 'Teak nightstand', hs: '9403.60', unit: 'CARTON', l: 60, w: 50, h: 60, kg: 21 },
  ],
}

const containerPlan: { projectId: string; type: Container['type']; status: Container['status']; count: number }[] = [
  { projectId: 'prj_1', type: '40HC', status: 'LOADED', count: 3 },
  { projectId: 'prj_2', type: '20GP', status: 'STUFFED', count: 4 },
  { projectId: 'prj_3', type: 'LCL', status: 'DISCHARGED', count: 1 },
  { projectId: 'prj_4', type: '40HC', status: 'AT_DEPOT', count: 2 },
  { projectId: 'prj_5', type: 'LCL', status: 'PLANNED', count: 1 },
  { projectId: 'prj_6', type: '40RH', status: 'BOOKED', count: 2 },
  { projectId: 'prj_8', type: '40HC', status: 'RETURNED', count: 2 },
  { projectId: 'prj_9', type: '20GP', status: 'RETURNED', count: 4 },
  { projectId: 'prj_11', type: 'LCL', status: 'PLANNED', count: 1 },
  { projectId: 'prj_13', type: '40GP', status: 'AT_DEPOT', count: 1 },
  { projectId: 'prj_14', type: '40HC', status: 'PLANNED', count: 2 },
]

const CONTAINER_PREFIX = ['MSKU', 'TGHU', 'CMAU', 'HLXU', 'ONEU', 'EGHU', 'CSNU']

/** Build a container number with a correct ISO 6346 check digit. */
const LETTER_VALUE: Record<string, number> = (() => {
  const t: Record<string, number> = {}
  let v = 10
  for (let i = 0; i < 26; i++) {
    if (v % 11 === 0) v++
    t[String.fromCharCode(65 + i)] = v
    v++
  }
  return t
})()
function containerNumber(prefix: string, serial: number) {
  const body = `${prefix}${String(serial).padStart(6, '0')}`
  let total = 0
  for (let i = 0; i < 10; i++) {
    const ch = body[i]
    total += (i < 4 ? LETTER_VALUE[ch] : Number(ch)) * 2 ** i
  }
  return `${body}${(total % 11) % 10}`
}
let cIdx = 0
export const containers: Container[] = []
for (const plan of containerPlan) {
  for (let s = 1; s <= plan.count; s++) {
    cIdx++
    const id = `ctn_${cIdx}`
    const spec = CONTAINER_SPECS[plan.type]
    const defs = cargoDefs[plan.projectId] ?? cargoDefs.prj_1
    const stuffed = ['STUFFED', 'GATE_IN', 'LOADED', 'IN_TRANSIT', 'DISCHARGED', 'DELIVERED', 'RETURNED'].includes(plan.status)
    const items = defs.map((d, di) => {
      const perCbm = (d.l * d.w * d.h) / 1_000_000
      const targetCbm = (spec.capacityCbm || 22) * (plan.type === 'LCL' ? 0.35 : 0.86)
      const qty = Math.max(1, Math.round((targetCbm / defs.length) / perCbm))
      return {
        id: `${id}_i${di}`, containerId: id, description: d.desc, hsCode: d.hs,
        marksAndNumbers: `MFI/${plan.projectId.toUpperCase()}\nC/NO. 1-${qty}\nMADE IN INDONESIA`,
        packageUnit: d.unit, quantity: qty, lengthCm: d.l, widthCm: d.w, heightCm: d.h,
        grossWeightKg: d.kg, netWeightKg: +(d.kg * 0.92).toFixed(1), stackable: d.unit !== 'CRATE',
        unitValue: int(40, 400), poNumber: `PO-${int(10000, 99999)}`,
      }
    })
    const grossKg = items.reduce((a, it) => a + it.grossWeightKg * it.quantity, 0)
    containers.push({
      id, projectId: plan.projectId, seq: s, type: plan.type, status: plan.status,
      containerNo: plan.status === 'PLANNED' || plan.type === 'LCL' ? undefined : containerNumber(pick(CONTAINER_PREFIX), int(100000, 999999)),
      sealNo: stuffed ? `ID${int(100000, 999999)}` : undefined,
      sealType: stuffed ? 'BOLT' : undefined,
      depot: pick(['Depo Graha Segara', 'Depo MAL Priok', 'Depo Sarana Bandar', 'Depo Multi Terminal']),
      tareKg: spec.tareKg || undefined,
      vgmKg: stuffed ? Math.round(grossKg + spec.tareKg) : undefined,
      vgmMethod: stuffed ? 'SM2' : undefined,
      vgmSubmittedAt: stuffed ? day(-int(3, 30)) : undefined,
      stuffingDate: stuffed ? day(-int(4, 32)) : undefined,
      stuffingLocation: 'Shipper factory',
      gateInDate: ['GATE_IN', 'LOADED', 'IN_TRANSIT', 'DISCHARGED', 'DELIVERED', 'RETURNED'].includes(plan.status) ? day(-int(2, 28)) : undefined,
      reeferTempC: spec.reefer ? -18 : undefined,
      remarks: plan.type === '40RH' ? 'Pre-trip inspection passed; set point -18 °C, ventilation closed.' : undefined,
      items,
    })
  }
}
/* one unit is keyed in with a typo so the ISO 6346 check-digit guard has something to catch */
const typo = containers.find((c) => c.projectId === 'prj_2' && c.seq === 3)
if (typo?.containerNo) typo.containerNo = `${typo.containerNo.slice(0, 10)}${(Number(typo.containerNo[10]) + 1) % 10}`

/* deliberately leave one container over-planned so the utilisation guard has something to catch */
const overloaded = containers.find((c) => c.projectId === 'prj_4')
if (overloaded) overloaded.items.forEach((i) => (i.quantity = Math.round(i.quantity * 1.24)))

/* ================================================================
   DOCUMENTS
   ================================================================ */
export const documents: ShipmentDocument[] = []
let dIdx = 0
for (const p of projects) {
  const idx = stageIndex(p.stage)
  const wanted = DOC_TYPES.filter((d) => {
    if (['OTHER', 'MASTER_BL'].includes(d.type)) return false
    if (d.type === 'CONSIGNMENT_AGREEMENT') return p.type === 'CONSIGNMENT'
    if (d.type === 'LETTER_OF_CREDIT') return p.paymentTerm === 'LC_AT_SIGHT'
    if (d.type === 'PHYTOSANITARY') return p.hsCodes.some((h) => h.startsWith('0901') || h.startsWith('1801'))
    if (d.type === 'FUMIGATION') return p.tags.includes('fumigation') || p.destCountry === 'AU'
    if (d.type === 'MSDS') return p.dangerousGoods
    if (d.type === 'EXPORT_PERMIT') return false
    return true
  })
  for (const d of wanted) {
    dIdx++
    const dStage = stageIndex(d.stage)
    let status: ShipmentDocument['status'] = 'REQUIRED'
    if (dStage < idx) status = d.type.includes('BL') ? 'ISSUED' : 'APPROVED'
    else if (dStage === idx) status = pick(['DRAFT', 'PENDING_REVIEW', 'APPROVED'] as const)
    if (p.stage === 'SETTLEMENT') status = d.type === 'DRAFT_BL' ? 'SURRENDERED' : 'APPROVED'
    const issued = status !== 'REQUIRED'
    documents.push({
      id: `doc_${dIdx}`, projectId: p.id, type: d.type, title: d.label,
      docNo: issued ? `${d.type.slice(0, 3)}-${p.code.slice(-4)}-${String(dIdx).padStart(3, '0')}` : undefined,
      version: issued ? int(1, 3) : 1, status, mandatory: d.mandatoryDefault, stage: d.stage,
      issuedBy: issued ? pick(['Meridian Freight', 'Shipper', 'Bea Cukai', 'Kadin Indonesia', 'Karantina Pertanian', 'Carrier']) : undefined,
      issuedAt: issued ? day(-int(1, 40)) : undefined,
      expiresAt: d.type === 'CERTIFICATE_OF_ORIGIN' ? day(int(30, 120)) : undefined,
      reviewedBy: status === 'APPROVED' || status === 'ISSUED' ? pick(TEAM) : undefined,
      fileName: issued ? `${d.type.toLowerCase()}_${p.code}.pdf` : undefined,
      fileSizeKb: issued ? int(80, 2400) : undefined,
      remarks: d.hint, updatedAt: day(-int(0, 20)),
    })
  }
}
/* a rejected document so the exception feed has a real blocker */
const rejectMe = documents.find((d) => d.projectId === 'prj_4' && d.type === 'PHYTOSANITARY')
if (rejectMe) {
  rejectMe.status = 'REJECTED'
  rejectMe.remarks = 'Karantina rejected v1: the lot number on the certificate does not match the packing list.'
}

/* ================================================================
   CHARGES
   ================================================================ */
export const charges: ProjectCharge[] = []
let chIdx = 0
for (const p of projects) {
  const pkg = packages.find((k) => k.id === p.packageId)
  const boxes = containers.filter((c) => c.projectId === p.id)
  const idx = stageIndex(p.stage)
  const lines = pkg?.rateLines ?? [
    { id: 'x', chargeCode: 'OFR', description: 'Ocean Freight', basis: 'PER_CONTAINER' as const, buyRate: 900, sellRate: 1150, currency: 'USD' as const, vatApplicable: false, mandatory: true },
    { id: 'y', chargeCode: 'DOC', description: 'Documentation Fee', basis: 'PER_BL' as const, buyRate: 35, sellRate: 70, currency: 'USD' as const, vatApplicable: true, mandatory: true },
  ]
  for (const line of lines) {
    if (line.containerType && !boxes.some((b) => b.type === line.containerType)) continue
    chIdx++
    const meta = CHARGE_CODES.find((c) => c.code === line.chargeCode)
    let qty = 1
    if (line.basis === 'PER_CONTAINER') qty = line.containerType ? boxes.filter((b) => b.type === line.containerType).length : boxes.length || 1
    if (line.basis === 'PER_CBM') qty = +boxes.reduce((a, b) => a + b.items.reduce((s, i) => s + (i.lengthCm * i.widthCm * i.heightCm * i.quantity) / 1e6, 0), 0).toFixed(2)
    if (line.basis === 'PER_KG') qty = Math.round(boxes.reduce((a, b) => a + b.items.reduce((s, i) => s + i.grossWeightKg * i.quantity, 0), 0))
    if (line.basis === 'PERCENT_OF_VALUE') qty = p.cargoValue
    if (line.basis === 'PER_TON') qty = Math.round(boxes.reduce((a, b) => a + b.items.reduce((s, i) => s + i.grossWeightKg * i.quantity, 0), 0) / 1000) || 12
    const status: ProjectCharge['status'] = idx >= 7 ? (p.status === 'COMPLETED' ? 'PAID' : 'INVOICED') : idx >= 5 ? 'APPROVED' : idx >= 2 ? 'PENDING_APPROVAL' : 'DRAFT'
    charges.push({
      id: `chg_${chIdx}`, projectId: p.id, chargeCode: line.chargeCode, description: line.description,
      category: meta?.category ?? 'OTHER', basis: line.basis, quantity: qty,
      buyRate: line.basis === 'PERCENT_OF_VALUE' ? line.buyRate / 100 : line.buyRate,
      sellRate: line.basis === 'PERCENT_OF_VALUE' ? line.sellRate / 100 : line.sellRate,
      currency: line.currency, fxRate: line.currency === 'IDR' ? 1 : line.currency === 'AUD' ? 10650 : 16250,
      vatApplicable: line.vatApplicable, whtApplicable: meta?.category === 'TRUCKING' || meta?.category === 'CUSTOMS',
      vendor: pick(['Maersk Line', 'PT Pelindo Terminal', 'PT Sarana Bandar Nasional', 'PT Trans Logistik Jaya', 'Bea Cukai', 'Kadin Indonesia']),
      freightTerm: p.freightTerm, billable: true, status, fromPackage: !!pkg,
      invoiceNo: status === 'INVOICED' || status === 'PAID' ? `INV/AR/26/${1200 + chIdx}` : undefined,
      createdAt: day(-int(5, 50)),
    })
  }
}
/* an unbudgeted demurrage charge in dispute — the classic margin killer */
charges.push({
  id: 'chg_dem_1', projectId: 'prj_8', chargeCode: 'DEM', description: 'Demurrage — 2 days beyond free time at Savannah',
  category: 'PENALTY', basis: 'PER_CONTAINER', quantity: 4, buyRate: 165, sellRate: 165, currency: 'USD', fxRate: 16100,
  vatApplicable: false, whtApplicable: false, vendor: 'Hapag-Lloyd', freightTerm: 'PREPAID', billable: true,
  status: 'DISPUTED', fromPackage: false, remarks: 'Client disputes liability — consignee collected the D/O two days late. Evidence pack sent 12 Aug.',
  createdAt: day(-18),
})

/* ================================================================
   FINANCE — chart of accounts, ledger, invoices
   ================================================================ */
export const accounts: Account[] = [
  { id: 'a1', code: '1-1100', name: 'Cash on Hand', type: 'ASSET', normalBalance: 'DEBIT', parentCode: '1-1000', isPostable: true, currency: 'IDR' },
  { id: 'a2', code: '1-1200', name: 'Bank — BCA IDR Operating', type: 'ASSET', normalBalance: 'DEBIT', parentCode: '1-1000', isPostable: true, currency: 'IDR' },
  { id: 'a3', code: '1-1210', name: 'Bank — BCA USD Account', type: 'ASSET', normalBalance: 'DEBIT', parentCode: '1-1000', isPostable: true, currency: 'USD' },
  { id: 'a4', code: '1-1300', name: 'Accounts Receivable — Trade', type: 'ASSET', normalBalance: 'DEBIT', parentCode: '1-1000', isPostable: true, currency: 'IDR' },
  { id: 'a5', code: '1-1400', name: 'Unbilled Revenue (WIP)', type: 'ASSET', normalBalance: 'DEBIT', parentCode: '1-1000', isPostable: true, currency: 'IDR' },
  { id: 'a6', code: '1-1500', name: 'Prepaid Freight & Deposits', type: 'ASSET', normalBalance: 'DEBIT', parentCode: '1-1000', isPostable: true, currency: 'IDR' },
  { id: 'a7', code: '1-1600', name: 'VAT Input (PPN Masukan)', type: 'ASSET', normalBalance: 'DEBIT', parentCode: '1-1000', isPostable: true, currency: 'IDR' },
  { id: 'a8', code: '1-1700', name: 'Consignment Inventory in Transit', type: 'ASSET', normalBalance: 'DEBIT', parentCode: '1-1000', isPostable: true, currency: 'IDR' },
  { id: 'a9', code: '2-2100', name: 'Accounts Payable — Vendors', type: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2-2000', isPostable: true, currency: 'IDR' },
  { id: 'a10', code: '2-2200', name: 'Accrued Shipment Cost', type: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2-2000', isPostable: true, currency: 'IDR' },
  { id: 'a11', code: '2-2300', name: 'VAT Output (PPN Keluaran)', type: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2-2000', isPostable: true, currency: 'IDR' },
  { id: 'a12', code: '2-2400', name: 'Withholding Tax Payable (PPh 23)', type: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2-2000', isPostable: true, currency: 'IDR' },
  { id: 'a13', code: '2-2500', name: 'Customer Deposits / Advances', type: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2-2000', isPostable: true, currency: 'IDR' },
  { id: 'a14', code: '2-2600', name: 'Consignment Settlement Payable', type: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2-2000', isPostable: true, currency: 'IDR' },
  { id: 'a15', code: '3-3100', name: 'Share Capital', type: 'EQUITY', normalBalance: 'CREDIT', parentCode: '3-3000', isPostable: true, currency: 'IDR' },
  { id: 'a16', code: '3-3200', name: 'Retained Earnings', type: 'EQUITY', normalBalance: 'CREDIT', parentCode: '3-3000', isPostable: true, currency: 'IDR' },
  { id: 'a17', code: '4-4100', name: 'Freight Revenue — Ocean', type: 'REVENUE', normalBalance: 'CREDIT', parentCode: '4-4000', isPostable: true, currency: 'IDR' },
  { id: 'a18', code: '4-4200', name: 'Freight Revenue — Air', type: 'REVENUE', normalBalance: 'CREDIT', parentCode: '4-4000', isPostable: true, currency: 'IDR' },
  { id: 'a19', code: '4-4300', name: 'Handling & Origin Charges Revenue', type: 'REVENUE', normalBalance: 'CREDIT', parentCode: '4-4000', isPostable: true, currency: 'IDR' },
  { id: 'a20', code: '4-4400', name: 'Documentation & Customs Revenue', type: 'REVENUE', normalBalance: 'CREDIT', parentCode: '4-4000', isPostable: true, currency: 'IDR' },
  { id: 'a21', code: '4-4900', name: 'Other Operating Income', type: 'REVENUE', normalBalance: 'CREDIT', parentCode: '4-4000', isPostable: true, currency: 'IDR' },
  { id: 'a22', code: '5-5100', name: 'Ocean Freight Cost', type: 'COGS', normalBalance: 'DEBIT', parentCode: '5-5000', isPostable: true, currency: 'IDR' },
  { id: 'a23', code: '5-5200', name: 'Air Freight Cost', type: 'COGS', normalBalance: 'DEBIT', parentCode: '5-5000', isPostable: true, currency: 'IDR' },
  { id: 'a24', code: '5-5300', name: 'Terminal & Handling Cost', type: 'COGS', normalBalance: 'DEBIT', parentCode: '5-5000', isPostable: true, currency: 'IDR' },
  { id: 'a25', code: '5-5400', name: 'Trucking & Inland Cost', type: 'COGS', normalBalance: 'DEBIT', parentCode: '5-5000', isPostable: true, currency: 'IDR' },
  { id: 'a26', code: '5-5500', name: 'Customs & Documentation Cost', type: 'COGS', normalBalance: 'DEBIT', parentCode: '5-5000', isPostable: true, currency: 'IDR' },
  { id: 'a27', code: '5-5900', name: 'Demurrage & Detention Cost', type: 'COGS', normalBalance: 'DEBIT', parentCode: '5-5000', isPostable: true, currency: 'IDR' },
  { id: 'a28', code: '6-6100', name: 'Salaries & Employee Benefits', type: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '6-6000', isPostable: true, currency: 'IDR' },
  { id: 'a29', code: '6-6200', name: 'Office Rent & Utilities', type: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '6-6000', isPostable: true, currency: 'IDR' },
  { id: 'a30', code: '6-6300', name: 'IT & Communication', type: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '6-6000', isPostable: true, currency: 'IDR' },
  { id: 'a31', code: '6-6400', name: 'Travel & Entertainment', type: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '6-6000', isPostable: true, currency: 'IDR' },
  { id: 'a32', code: '6-6900', name: 'FX Gain / (Loss)', type: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '6-6000', isPostable: true, currency: 'IDR' },
]

const je = (
  no: string, date: string, memo: string, source: JournalEntry['source'], projectCode: string | undefined,
  lines: [string, number, number, string?][], status: JournalEntry['status'] = 'POSTED', reference?: string,
): JournalEntry => ({
  id: `je_${no}`, entryNo: no, date, memo, source, projectCode, currency: 'IDR', fxRate: 1, status,
  postedBy: status === 'POSTED' ? pick(TEAM) : undefined, postedAt: status === 'POSTED' ? date : undefined, reference,
  lines: lines.map((l, i) => ({ id: `${no}_l${i}`, accountCode: l[0], debit: l[1], credit: l[2], description: l[3], projectCode })),
})

export const journal: JournalEntry[] = [
  je('JV-2026-0301', '2026-06-01', 'Opening balances brought forward FY2026', 'MANUAL', undefined, [
    ['1-1200', 4_820_000_000, 0, 'Operating bank'],
    ['1-1210', 2_640_000_000, 0, 'USD account translated'],
    ['1-1300', 3_986_700_000, 0, 'Trade receivables'],
    ['2-2100', 0, 2_140_000_000, 'Vendor payables'],
    ['3-3100', 0, 5_000_000_000, 'Share capital'],
    ['3-3200', 0, 4_306_700_000, 'Retained earnings'],
  ]),
  je('JV-2026-0388', '2026-07-04', 'AR invoice INV/AR/26/1188 — Anugerah Rubber PRJ-2026-0039', 'AR_INVOICE', 'PRJ-2026-0039', [
    ['1-1300', 176_182_000, 0, 'Receivable incl. VAT'],
    ['4-4100', 0, 140_000_000, 'Ocean freight revenue'],
    ['4-4300', 0, 18_600_000, 'Origin handling revenue'],
    ['4-4400', 0, 4_900_000, 'Documentation revenue'],
    ['2-2300', 0, 12_682_000, 'VAT output 11%'],
  ], 'POSTED', 'INV/AR/26/1188'),
  je('JV-2026-0389', '2026-07-05', 'Vendor bill ONE — ocean freight PRJ-2026-0039', 'AP_BILL', 'PRJ-2026-0039', [
    ['5-5100', 108_600_000, 0, 'Ocean freight cost'],
    ['5-5300', 14_200_000, 0, 'Terminal handling'],
    ['1-1600', 1_562_000, 0, 'VAT input'],
    ['2-2100', 0, 124_362_000, 'Payable to ONE'],
  ], 'POSTED', 'BILL/ONE/26/4471'),
  je('JV-2026-0402', '2026-07-22', 'Receipt from Anugerah Rubber — L/C proceeds', 'RECEIPT', 'PRJ-2026-0039', [
    ['1-1210', 176_182_000, 0, 'USD account'],
    ['1-1300', 0, 176_182_000, 'Clear receivable'],
  ], 'POSTED', 'RCP/26/0771'),
  je('JV-2026-0417', '2026-07-30', 'AR invoice INV/AR/26/1204 — Jati Makmur PRJ-2026-0038', 'AR_INVOICE', 'PRJ-2026-0038', [
    ['1-1300', 202_296_800, 0, 'Receivable incl. VAT'],
    ['4-4100', 0, 152_300_000, 'Ocean freight revenue'],
    ['4-4300', 0, 21_400_000, 'Origin handling revenue'],
    ['4-4400', 0, 8_300_000, 'Documentation revenue'],
    ['2-2300', 0, 20_296_800, 'VAT output 11%'],
  ], 'POSTED', 'INV/AR/26/1204'),
  je('JV-2026-0418', '2026-07-31', 'Vendor bill Hapag-Lloyd — PRJ-2026-0038', 'AP_BILL', 'PRJ-2026-0038', [
    ['5-5100', 128_400_000, 0, 'Ocean freight cost'],
    ['5-5300', 16_800_000, 0, 'Terminal handling'],
    ['5-5400', 13_600_000, 0, 'Inland trucking'],
    ['1-1600', 3_344_000, 0, 'VAT input'],
    ['2-2100', 0, 162_144_000, 'Payable'],
  ], 'POSTED', 'BILL/HLC/26/8812'),
  je('JV-2026-0433', '2026-08-12', 'Demurrage accrual PRJ-2026-0038 — 2 days, in dispute', 'ACCRUAL', 'PRJ-2026-0038', [
    ['5-5900', 10_626_000, 0, 'Demurrage 4x2 days'],
    ['2-2200', 0, 10_626_000, 'Accrued cost'],
  ], 'POSTED', 'ACC/26/0091'),
  je('JV-2026-0441', '2026-08-14', 'Monthly payroll August 2026', 'MANUAL', undefined, [
    ['6-6100', 486_000_000, 0, 'Salaries'],
    ['2-2400', 0, 24_300_000, 'PPh 21 withheld'],
    ['1-1200', 0, 461_700_000, 'Bank transfer'],
  ]),
  je('JV-2026-0442', '2026-08-14', 'Office rent, utilities and IT — August 2026', 'MANUAL', undefined, [
    ['6-6200', 96_000_000, 0, 'Rent & utilities'],
    ['6-6300', 34_500_000, 0, 'Systems & connectivity'],
    ['1-1200', 0, 130_500_000, 'Bank transfer'],
  ]),
  je('JV-2026-0455', '2026-08-20', 'AR invoice INV/AR/26/1231 — Bali Craft consignment cycle 7 logistics', 'AR_INVOICE', 'PRJ-2026-0043', [
    ['1-1300', 175_213_800, 0, 'Receivable incl. VAT'],
    ['4-4100', 0, 94_600_000, 'LCL freight revenue'],
    ['4-4300', 0, 48_200_000, 'CFS & handling revenue'],
    ['4-4400', 0, 15_050_000, 'Documentation revenue'],
    ['2-2300', 0, 17_363_800, 'VAT output 11%'],
  ], 'POSTED', 'INV/AR/26/1231'),
  je('JV-2026-0456', '2026-08-21', 'Consignment settlement cycle 7 — 268 units reported sold', 'CONSIGNMENT_SETTLEMENT', 'PRJ-2026-0043', [
    ['1-1700', 0, 318_720_000, 'Release consignment inventory'],
    ['2-2600', 318_720_000, 0, 'Settle to principal'],
  ], 'POSTED', 'CNS/26/0007'),
  je('JV-2026-0461', '2026-08-25', 'Accrue unbilled revenue — jobs in transit at month end', 'ACCRUAL', undefined, [
    ['1-1400', 412_800_000, 0, 'WIP revenue'],
    ['4-4100', 0, 412_800_000, 'Accrued freight revenue'],
  ]),
  je('JV-2026-0468', '2026-08-27', 'FX revaluation of the USD bank account at 16,250', 'FX_REVALUATION', undefined, [
    ['1-1210', 68_400_000, 0, 'Unrealised gain'],
    ['6-6900', 0, 68_400_000, 'FX gain'],
  ]),
  je('JV-2026-0470', '2026-08-28', 'AR invoice INV/AR/26/1244 — Jati Makmur PRJ-2026-0041', 'AR_INVOICE', 'PRJ-2026-0041', [
    ['1-1300', 173_838_600, 0, 'Receivable incl. VAT'],
    ['4-4100', 0, 128_400_000, 'Ocean freight revenue'],
    ['4-4300', 0, 24_900_000, 'Origin handling revenue'],
    ['4-4400', 0, 3_200_000, 'Documentation revenue'],
    ['2-2300', 0, 17_338_600, 'VAT output 11%'],
  ], 'POSTED', 'INV/AR/26/1244'),
  je('JV-2026-0474', '2026-08-29', 'Vendor bill Maersk — PRJ-2026-0041 (pending approval)', 'AP_BILL', 'PRJ-2026-0041', [
    ['5-5100', 104_800_000, 0, 'Ocean freight cost'],
    ['5-5300', 18_200_000, 0, 'Terminal handling'],
    ['1-1600', 2_002_000, 0, 'VAT input'],
    ['2-2100', 0, 125_002_000, 'Payable to Maersk'],
  ], 'DRAFT', 'BILL/MAE/26/9930'),
]

export const invoices: Invoice[] = [
  { id: 'inv_1', number: 'INV/AR/26/1188', kind: 'AR', partyName: 'PT Anugerah Rubber Industries', projectCode: 'PRJ-2026-0039', issueDate: '2026-07-04', dueDate: '2026-08-18', currency: 'IDR', fxRate: 1, subtotal: 163_500_000, vat: 17_985_000, wht: 5_303_000, total: 176_182_000, paid: 176_182_000, status: 'PAID', terms: 'LC_AT_SIGHT' },
  { id: 'inv_2', number: 'INV/AR/26/1204', kind: 'AR', partyName: 'PT Jati Makmur Furniture', projectCode: 'PRJ-2026-0038', issueDate: '2026-07-30', dueDate: '2026-08-29', currency: 'IDR', fxRate: 1, subtotal: 182_000_000, vat: 20_020_000, wht: 0, total: 202_020_000, paid: 100_000_000, status: 'PARTIALLY_PAID', terms: 'NET_30' },
  { id: 'inv_3', number: 'INV/AR/26/1231', kind: 'AR', partyName: 'Bali Craft Collective Pte Ltd', projectCode: 'PRJ-2026-0043', issueDate: '2026-08-20', dueDate: '2026-09-03', currency: 'IDR', fxRate: 1, subtotal: 157_850_000, vat: 17_363_800, wht: 0, total: 175_213_800, paid: 0, status: 'ISSUED', terms: 'NET_14' },
  { id: 'inv_4', number: 'INV/AR/26/1244', kind: 'AR', partyName: 'PT Jati Makmur Furniture', projectCode: 'PRJ-2026-0041', issueDate: '2026-08-28', dueDate: '2026-09-27', currency: 'IDR', fxRate: 1, subtotal: 156_500_000, vat: 17_338_600, wht: 0, total: 173_838_600, paid: 0, status: 'ISSUED', terms: 'NET_30' },
  { id: 'inv_5', number: 'INV/AR/26/1149', kind: 'AR', partyName: 'Pacific Textile Trading LLC', projectCode: 'PRJ-2026-0031', issueDate: '2026-06-18', dueDate: '2026-07-18', currency: 'IDR', fxRate: 1, subtotal: 148_600_000, vat: 16_346_000, wht: 0, total: 164_946_000, paid: 0, status: 'OVERDUE', terms: 'NET_30' },
  { id: 'inv_6', number: 'INV/AR/26/1162', kind: 'AR', partyName: 'Pacific Textile Trading LLC', projectCode: 'PRJ-2026-0034', issueDate: '2026-06-30', dueDate: '2026-07-30', currency: 'IDR', fxRate: 1, subtotal: 121_400_000, vat: 13_354_000, wht: 0, total: 134_754_000, paid: 0, status: 'OVERDUE', terms: 'NET_30' },
  { id: 'inv_7', number: 'INV/AR/26/1210', kind: 'AR', partyName: 'PT Sinar Kopi Sejahtera', projectCode: 'PRJ-2026-0040', issueDate: '2026-08-04', dueDate: '2026-09-03', currency: 'IDR', fxRate: 1, subtotal: 88_300_000, vat: 9_713_000, wht: 0, total: 98_013_000, paid: 0, status: 'ISSUED', terms: 'NET_30' },
  { id: 'inv_8', number: 'BILL/HLC/26/8812', kind: 'AP', partyName: 'Hapag-Lloyd Indonesia', projectCode: 'PRJ-2026-0038', issueDate: '2026-07-31', dueDate: '2026-08-30', currency: 'IDR', fxRate: 1, subtotal: 158_800_000, vat: 3_344_000, wht: 272_000, total: 162_144_000, paid: 162_144_000, status: 'PAID', terms: 'NET_30' },
  { id: 'inv_9', number: 'BILL/ONE/26/4471', kind: 'AP', partyName: 'Ocean Network Express', projectCode: 'PRJ-2026-0039', issueDate: '2026-07-05', dueDate: '2026-08-04', currency: 'IDR', fxRate: 1, subtotal: 122_800_000, vat: 1_562_000, wht: 0, total: 124_362_000, paid: 124_362_000, status: 'PAID', terms: 'NET_30' },
  { id: 'inv_10', number: 'BILL/MAE/26/9930', kind: 'AP', partyName: 'Maersk Line Indonesia', projectCode: 'PRJ-2026-0041', issueDate: '2026-08-29', dueDate: '2026-09-28', currency: 'IDR', fxRate: 1, subtotal: 123_000_000, vat: 2_002_000, wht: 0, total: 125_002_000, paid: 0, status: 'DRAFT', terms: 'NET_30' },
  { id: 'inv_11', number: 'BILL/PEL/26/2214', kind: 'AP', partyName: 'PT Pelindo Terminal Petikemas', projectCode: 'PRJ-2026-0041', issueDate: '2026-08-22', dueDate: '2026-09-21', currency: 'IDR', fxRate: 1, subtotal: 42_600_000, vat: 4_686_000, wht: 0, total: 47_286_000, paid: 0, status: 'ISSUED', terms: 'NET_30' },
]
