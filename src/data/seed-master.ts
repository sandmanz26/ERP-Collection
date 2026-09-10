/**
 * Master data — the things that change slowly: the company itself, its
 * warehouses and work centres, who it buys from, what it buys, who it sells
 * to and what it makes.
 */

import type {
  AppSettings, CompanyProfile, Customer, Item, Product, Supplier, Warehouse, WorkCentre,
} from './types'
import { FX_RATES, KPI_TARGETS_DEFAULT, NDPBM_RATES } from './reference'
import { d } from './clock'

export const company: CompanyProfile = {
  legalName: 'PT Candra Wana Nusantara',
  brandName: 'Wanakarya',
  taxId: '01.284.771.9-503.000',
  address: 'Jl. Raya Semarang–Demak KM 11, Kawasan Industri Terboyo Blok C7–C11',
  city: 'Semarang, Jawa Tengah',
  country: 'ID',
  phone: '+62 24 6580 4412',
  email: 'operations@wanakarya.co.id',
  website: 'wanakarya.co.id',
  licences: [
    { id: 'lic_nib', kind: 'NIB', number: '8120004471209', authority: 'OSS — Kementerian Investasi', issuedAt: d(-1580), note: 'Base business identity; KBLI 31001 furniture from wood.' },
    { id: 'lic_api', kind: 'API_P', number: 'API-P 0331/2022', authority: 'OSS', issuedAt: d(-1410), note: 'Producer importer. This is what keeps PPh 22 at 2.5% instead of 7.5% on every consignment.' },
    { id: 'lic_svlk', kind: 'SVLK', number: 'LVLK-011-IDN/2.4/0917', authority: 'PT Trustindo Prima Karya', issuedAt: d(-690), expiresAt: d(405), note: 'Timber legality certificate. Without it the export line has no market in the EU.' },
    { id: 'lic_b2', kind: 'IP_B2', number: 'IP-B2 214/DAGLU/2026', authority: 'Ditjen Daglu — Kemendag', issuedAt: d(-240), expiresAt: d(41), note: 'Approval to import B2 chemistry for our own finishing line. Renewal takes six weeks and is already late.' },
    { id: 'lic_ispm', kind: 'ISPM15', number: 'ID-031-HT', authority: 'Barantan', issuedAt: d(-820), expiresAt: d(280), note: 'Heat-treatment mark for our own export packing.' },
    { id: 'lic_pkp', kind: 'TAX_PKP', number: 'PEM-00417/WPJ.10/KP.0303/2019', authority: 'DJP', issuedAt: d(-2410), note: 'Taxable entrepreneur — lets us credit PPN masukan.' },
    { id: 'lic_fsc', kind: 'FSC_COC', number: 'SGSCH-COC-009214', authority: 'SGS', issuedAt: d(-430), expiresAt: d(665), note: 'Chain of custody for the certified oak programme.' },
  ],
}

export const defaultSettings: AppSettings = {
  baseCurrency: 'IDR',
  fxRates: { ...FX_RATES },
  ndpbmRates: { ...NDPBM_RATES },
  vatRate: 11,
  pph22Rate: 2.5,
  hasApi: true,
  costVarianceTolerance: 0.05,
  permitWarningDays: 60,
  mrpHorizonDays: 90,
  kpiTargets: { ...KPI_TARGETS_DEFAULT },
  numbering: [
    { key: 'salesOrder', label: 'Sales order', prefix: 'SO', padding: 4, withYear: true, nextNumber: 1 },
    { key: 'workOrder', label: 'Work order', prefix: 'WO', padding: 4, withYear: true, nextNumber: 1 },
    { key: 'purchaseOrder', label: 'Purchase order', prefix: 'PO', padding: 4, withYear: true, nextNumber: 1 },
    { key: 'shipment', label: 'Import shipment', prefix: 'IMP', padding: 4, withYear: true, nextNumber: 1 },
    { key: 'kilnBatch', label: 'Kiln batch', prefix: 'KLN', padding: 3, withYear: true, nextNumber: 1 },
    { key: 'qc', label: 'QC record', prefix: 'QC', padding: 4, withYear: true, nextNumber: 1 },
    { key: 'invoice', label: 'Invoice', prefix: 'INV', padding: 4, withYear: true, nextNumber: 1 },
    { key: 'journal', label: 'Journal entry', prefix: 'JV', padding: 4, withYear: true, nextNumber: 1 },
  ],
}

/* ==================================================================
   Warehouses and work centres
   ================================================================== */

export const warehouses: Warehouse[] = [
  { id: 'wh_raw', code: 'GD-BB', name: 'Gudang Bahan Baku', kind: 'RAW_MATERIAL', site: 'Terboyo C7' },
  { id: 'wh_kiln', code: 'GD-KD', name: 'Kiln Yard & Timber Store', kind: 'KILN_YARD', site: 'Terboyo C9' },
  { id: 'wh_wip', code: 'GD-WIP', name: 'Work in Progress', kind: 'WIP', site: 'Terboyo C8' },
  { id: 'wh_fg', code: 'GD-BJ', name: 'Gudang Barang Jadi', kind: 'FINISHED_GOODS', site: 'Terboyo C11' },
  { id: 'wh_qr', code: 'GD-KR', name: 'Karantina / Incoming QC', kind: 'QUARANTINE', site: 'Terboyo C7 mezzanine' },
  { id: 'wh_bond', code: 'GD-BND', name: 'Bonded Store', kind: 'BONDED', site: 'Terboyo C10' },
]

export const workCentres: WorkCentre[] = [
  { id: 'wc_kiln', code: 'KD', name: 'Kiln Chambers', kind: 'KILN', stations: 4, hoursPerDay: 24, labourRatePerHour: 26_000, overheadRatePerHour: 148_000, supervisor: 'Suparman', active: true, note: 'Four chambers, 42 m³ each. Days, not hours — the plan treats a batch as a lead time, not a load.' },
  { id: 'wc_rough', code: 'RM', name: 'Rough Mill', kind: 'ROUGH_MILL', stations: 3, hoursPerDay: 8, labourRatePerHour: 34_000, overheadRatePerHour: 61_000, supervisor: 'Bambang Sutrisno', active: true, note: 'Cross-cut, rip and glue-up. The timber yield is decided here and nowhere else.' },
  { id: 'wc_cnc', code: 'MC', name: 'Machining & CNC', kind: 'MACHINING', stations: 4, hoursPerDay: 8, labourRatePerHour: 42_000, overheadRatePerHour: 96_000, supervisor: 'Hendra Wijaya', active: true, note: 'Moulder, CNC router, tenoner, multi-boring.' },
  { id: 'wc_sand', code: 'SD', name: 'Sanding', kind: 'SANDING', stations: 3, hoursPerDay: 8, labourRatePerHour: 31_000, overheadRatePerHour: 44_000, supervisor: 'Wagimin', active: true },
  { id: 'wc_asm', code: 'AS', name: 'Assembly', kind: 'ASSEMBLY', stations: 6, hoursPerDay: 8, labourRatePerHour: 36_000, overheadRatePerHour: 38_000, supervisor: 'Slamet Riyadi', active: true },
  { id: 'wc_fin', code: 'FN', name: 'Finishing — Booth & Cure', kind: 'FINISHING', stations: 2, hoursPerDay: 8, labourRatePerHour: 46_000, overheadRatePerHour: 132_000, supervisor: 'Agus Purnomo', active: true, note: 'Two booths and a cure hall. This is the bottleneck and everybody knows it.' },
  { id: 'wc_uph', code: 'UP', name: 'Upholstery', kind: 'UPHOLSTERY', stations: 4, hoursPerDay: 8, labourRatePerHour: 44_000, overheadRatePerHour: 41_000, supervisor: 'Ibu Ratna', active: true },
  { id: 'wc_pack', code: 'PK', name: 'Packing', kind: 'PACKING', stations: 3, hoursPerDay: 8, labourRatePerHour: 28_000, overheadRatePerHour: 27_000, supervisor: 'Joko Mulyanto', active: true },
  { id: 'wc_sub', code: 'SC', name: 'Subcontract — Carving & Plating', kind: 'SUBCONTRACT', stations: 1, hoursPerDay: 8, labourRatePerHour: 0, overheadRatePerHour: 0, supervisor: 'Purchasing desk', active: true, note: 'Work that leaves the building. The lead time is the supplier’s, and it always comes back later than promised.' },
]

/* ==================================================================
   Suppliers
   ================================================================== */

export const suppliers: Supplier[] = [
  {
    id: 'sup_hettich', code: 'SUP-1001', name: 'Hettich Marketing und Vertriebs GmbH', kind: 'OVERSEAS',
    country: 'DE', city: 'Kirchlengern', currency: 'EUR', incoterm: 'FOB', paymentInstrument: 'LC_SIGHT',
    paymentTermDays: 0, leadDays: 35, contact: 'Anke Brinkmann', email: 'export@hettich.example',
    laneHistory: { green: 14, yellow: 3, red: 1 }, avgClearanceDays: 2.4,
    onTimePercent: 96, qualityPercent: 99, documentAccuracyPercent: 98, active: true,
    note: 'Never short-ships, never mis-declares. The premium runners and lift systems.',
  },
  {
    id: 'sup_dtc', code: 'SUP-1002', name: 'Guangdong DTC Hardware Co., Ltd', kind: 'OVERSEAS',
    country: 'CN', city: 'Foshan', currency: 'USD', incoterm: 'FOB', paymentInstrument: 'TT_30',
    paymentTermDays: 30, leadDays: 28, contact: 'Vicky Lam', email: 'sales@dtc.example',
    laneHistory: { green: 9, yellow: 8, red: 4 }, avgClearanceDays: 5.8,
    onTimePercent: 84, qualityPercent: 93, documentAccuracyPercent: 79, active: true,
    note: 'Cheaper hardware, and the reason we know what a yellow lane feels like — their invoice and packing list disagree about half the time.',
  },
  {
    id: 'sup_bison', code: 'SUP-1003', name: 'Bison Panel Sdn Bhd', kind: 'OVERSEAS',
    country: 'MY', city: 'Port Klang', currency: 'USD', incoterm: 'CFR', paymentInstrument: 'LC_USANCE_90',
    paymentTermDays: 90, leadDays: 21, contact: 'Lim Wei Sheng', email: 'export@bisonpanel.example',
    laneHistory: { green: 11, yellow: 5, red: 2 }, avgClearanceDays: 3.6,
    onTimePercent: 91, qualityPercent: 95, documentAccuracyPercent: 92, active: true,
    note: 'MDF and particle board under ATIGA. The Form D is worth 10% of the invoice, so it is checked twice.',
  },
  {
    id: 'sup_baillie', code: 'SUP-1004', name: 'Baillie Lumber Co.', kind: 'OVERSEAS',
    country: 'US', city: 'Hamburg, New York', currency: 'USD', incoterm: 'CIF', paymentInstrument: 'LC_SIGHT',
    paymentTermDays: 0, leadDays: 42, contact: 'Ryan Kessler', email: 'export@baillie.example',
    laneHistory: { green: 6, yellow: 4, red: 3 }, avgClearanceDays: 6.9,
    onTimePercent: 88, qualityPercent: 97, documentAccuracyPercent: 94, active: true,
    note: 'American white oak and black walnut. Forestry lines, so every consignment needs a DIPK through SILK — and they draw red more often than anyone.',
  },
  {
    id: 'sup_sayerlack', code: 'SUP-1005', name: 'Sayerlack — Sherwin-Williams Italy S.r.l.', kind: 'OVERSEAS',
    country: 'IT', city: 'Pianoro', currency: 'EUR', incoterm: 'FOB', paymentInstrument: 'TT_ADVANCE',
    paymentTermDays: 0, leadDays: 38, contact: 'Giulia Ferrari', email: 'export@sayerlack.example',
    laneHistory: { green: 3, yellow: 6, red: 5 }, avgClearanceDays: 8.2,
    onTimePercent: 79, qualityPercent: 98, documentAccuracyPercent: 88, active: true,
    note: 'PU and water-based finishing systems. B2 chemistry, so an IP-B2 and a Laporan Surveyor on every consignment, and a red lane more often than not.',
  },
  {
    id: 'sup_foshanfab', code: 'SUP-1006', name: 'Foshan Yinlong Textile Co., Ltd', kind: 'OVERSEAS',
    country: 'CN', city: 'Foshan', currency: 'CNY', incoterm: 'FOB', paymentInstrument: 'TT_30',
    paymentTermDays: 30, leadDays: 24, contact: 'Chen Hui', email: 'export@yinlong.example',
    laneHistory: { green: 7, yellow: 4, red: 1 }, avgClearanceDays: 3.9,
    onTimePercent: 89, qualityPercent: 91, documentAccuracyPercent: 86, active: true,
    note: 'Upholstery fabric. Colour lots drift between shipments, which is an incoming-QC problem every time.',
  },
  {
    id: 'sup_perhutani', code: 'SUP-2001', name: 'Perum Perhutani KPH Randublatung', kind: 'LOCAL',
    country: 'ID', city: 'Blora', currency: 'IDR', incoterm: 'EXW', paymentInstrument: 'TT_ADVANCE',
    paymentTermDays: 0, leadDays: 14, contact: 'Pak Darmawan', email: 'penjualan@perhutani.example',
    laneHistory: { green: 0, yellow: 0, red: 0 }, avgClearanceDays: 0,
    onTimePercent: 82, qualityPercent: 96, documentAccuracyPercent: 99, active: true,
    note: 'Teak, with the SVLK chain of custody that is the whole reason the export line exists.',
  },
  {
    id: 'sup_jatimakmur', code: 'SUP-2002', name: 'CV Jati Makmur Sentosa', kind: 'LOCAL',
    country: 'ID', city: 'Jepara', currency: 'IDR', incoterm: 'DAP', paymentInstrument: 'OPEN_ACCOUNT',
    paymentTermDays: 30, leadDays: 10, contact: 'Pak Sugiyanto', email: 'sales@jatimakmur.example',
    laneHistory: { green: 0, yellow: 0, red: 0 }, avgClearanceDays: 0,
    onTimePercent: 74, qualityPercent: 88, documentAccuracyPercent: 84, active: true,
    note: 'Mahogany, sungkai and acacia from community forest. Cheap and close, but the moisture content on arrival is anybody’s guess.',
  },
  {
    id: 'sup_kemasan', code: 'SUP-2003', name: 'PT Indo Karton Prima', kind: 'LOCAL',
    country: 'ID', city: 'Ungaran', currency: 'IDR', incoterm: 'DAP', paymentInstrument: 'OPEN_ACCOUNT',
    paymentTermDays: 45, leadDays: 7, contact: 'Ibu Yuliana', email: 'order@indokarton.example',
    laneHistory: { green: 0, yellow: 0, red: 0 }, avgClearanceDays: 0,
    onTimePercent: 97, qualityPercent: 94, documentAccuracyPercent: 96, active: true,
    note: 'Carton, corner board and EPE. Seven-day lead time, so it never appears in an MRP shortage.',
  },
  {
    id: 'sup_ukirjaya', code: 'SUP-2004', name: 'UD Ukir Jaya (makloon ukir)', kind: 'LOCAL',
    country: 'ID', city: 'Jepara', currency: 'IDR', incoterm: 'EXW', paymentInstrument: 'OPEN_ACCOUNT',
    paymentTermDays: 14, leadDays: 12, contact: 'Pak Marno', email: '—',
    laneHistory: { green: 0, yellow: 0, red: 0 }, avgClearanceDays: 0,
    onTimePercent: 68, qualityPercent: 92, documentAccuracyPercent: 60, active: true,
    note: 'Hand carving, subcontracted. Sixty-eight per cent on time, and every late piece stops an assembly line.',
  },
  {
    id: 'sup_kacapratama', code: 'SUP-2005', name: 'PT Kaca Pratama Nusantara', kind: 'LOCAL',
    country: 'ID', city: 'Semarang', currency: 'IDR', incoterm: 'DAP', paymentInstrument: 'TT_30',
    paymentTermDays: 30, leadDays: 12, contact: 'Pak Iwan', email: 'sales@kacapratama.example',
    laneHistory: { green: 0, yellow: 0, red: 0 }, avgClearanceDays: 0,
    onTimePercent: 90, qualityPercent: 93, documentAccuracyPercent: 91, active: true,
    note: 'Tempered glass and mirror, cut to our sizes. Breakage in transit is a standing 2% allowance.',
  },
]

/* ==================================================================
   Items — what we buy
   ================================================================== */

const item = (x: Partial<Item> & Pick<Item, 'id' | 'code' | 'name' | 'type' | 'uom' | 'standardCost'>): Item => ({
  imported: false, hsCode: '', dutyRateMfn: 0, lartas: 'NONE',
  supplierLeadDays: 14, transitDays: 0, inlandDays: 1,
  safetyStock: 0, reorderPoint: 0, minOrderQuantity: 1,
  currency: 'IDR', valuation: 'MOVING_AVERAGE', active: true,
  ...x,
})

export const items: Item[] = [
  /* ---------- solid timber ---------- */
  item({
    id: 'it_oak26', code: 'TMB-OAK-26', name: 'American white oak, sawn 26 mm, FAS', type: 'SOLID_TIMBER', uom: 'm3',
    species: 'American white oak', targetMoistureMin: 8, targetMoistureMax: 12,
    imported: true, hsCode: '4407.99.90', dutyRateMfn: 5, lartas: 'DIPK',
    primarySupplierId: 'sup_baillie', supplierLeadDays: 42, transitDays: 34, inlandDays: 2,
    safetyStock: 12, reorderPoint: 26, minOrderQuantity: 24,
    standardCost: 21_400_000, currency: 'IDR', valuation: 'MOVING_AVERAGE',
    note: 'Arrives kiln-dried at 7% and re-conditioned here, because 7% in Semarang is 11% within a fortnight.',
  }),
  item({
    id: 'it_wal26', code: 'TMB-WAL-26', name: 'American black walnut, sawn 26 mm, FAS 1F', type: 'SOLID_TIMBER', uom: 'm3',
    species: 'American black walnut', targetMoistureMin: 8, targetMoistureMax: 12,
    imported: true, hsCode: '4407.99.90', dutyRateMfn: 5, lartas: 'DIPK',
    primarySupplierId: 'sup_baillie', supplierLeadDays: 42, transitDays: 34, inlandDays: 2,
    safetyStock: 6, reorderPoint: 12, minOrderQuantity: 12,
    standardCost: 46_800_000,
    note: 'The premium line. Colour matching across a batch is the single largest final-QC risk.',
  }),
  item({
    id: 'it_teak32', code: 'TMB-JAT-32', name: 'Jati Perhutani, sawn 32 mm, grade A', type: 'SOLID_TIMBER', uom: 'm3',
    species: 'Jati (teak)', targetMoistureMin: 8, targetMoistureMax: 12,
    primarySupplierId: 'sup_perhutani', supplierLeadDays: 14, inlandDays: 1,
    safetyStock: 8, reorderPoint: 18, minOrderQuantity: 10,
    standardCost: 28_900_000,
    note: 'SVLK chain of custody carried on the delivery note; without it the export line cannot use the lot.',
  }),
  item({
    id: 'it_mah25', code: 'TMB-MAH-25', name: 'Mahoni, sawn 25 mm, grade B', type: 'SOLID_TIMBER', uom: 'm3',
    species: 'Mahoni (mahogany)', targetMoistureMin: 8, targetMoistureMax: 12,
    primarySupplierId: 'sup_jatimakmur', supplierLeadDays: 10,
    safetyStock: 10, reorderPoint: 22, minOrderQuantity: 12, standardCost: 11_600_000,
  }),
  item({
    id: 'it_aka30', code: 'TMB-AKA-30', name: 'Akasia, sawn 30 mm, outdoor grade', type: 'SOLID_TIMBER', uom: 'm3',
    species: 'Akasia (acacia)', targetMoistureMin: 12, targetMoistureMax: 15,
    primarySupplierId: 'sup_jatimakmur', supplierLeadDays: 10,
    safetyStock: 9, reorderPoint: 20, minOrderQuantity: 15, standardCost: 8_450_000,
    note: 'Outdoor band. Dried below 12% it swells in the first wet season and the joints split.',
  }),
  item({
    id: 'it_sun25', code: 'TMB-SUN-25', name: 'Sungkai, sawn 25 mm', type: 'SOLID_TIMBER', uom: 'm3',
    species: 'Sungkai', targetMoistureMin: 8, targetMoistureMax: 12,
    primarySupplierId: 'sup_jatimakmur', supplierLeadDays: 10,
    safetyStock: 6, reorderPoint: 14, minOrderQuantity: 10, standardCost: 7_200_000,
    note: 'Takes stain unevenly. Every batch is colour-checked against the master panel before it goes near a booth.',
  }),

  /* ---------- panels ---------- */
  item({
    id: 'it_mdf18', code: 'PNL-MDF-18', name: 'MDF E1, 18 mm, 1220 × 2440', type: 'PANEL', uom: 'sheet',
    imported: true, hsCode: '4411.14.00', dutyRateMfn: 10, dutyRatePreferential: 0, preferentialScheme: 'ATIGA',
    lartas: 'DIPK_AND_SNI', primarySupplierId: 'sup_bison', supplierLeadDays: 21, transitDays: 9, inlandDays: 2,
    safetyStock: 300, reorderPoint: 700, minOrderQuantity: 1200, standardCost: 289_000,
    note: 'The Form D is worth 10% of the invoice. Lose it and the duty jumps from nothing to ten per cent.',
  }),
  item({
    id: 'it_mdf9', code: 'PNL-MDF-09', name: 'MDF E1, 9 mm, 1220 × 2440', type: 'PANEL', uom: 'sheet',
    imported: true, hsCode: '4411.13.00', dutyRateMfn: 10, dutyRatePreferential: 0, preferentialScheme: 'ATIGA',
    lartas: 'DIPK_AND_SNI', primarySupplierId: 'sup_bison', supplierLeadDays: 21, transitDays: 9, inlandDays: 2,
    safetyStock: 200, reorderPoint: 450, minOrderQuantity: 800, standardCost: 168_000,
  }),
  item({
    id: 'it_pb16', code: 'PNL-PB-16', name: 'Particle board, 16 mm, 1220 × 2440', type: 'PANEL', uom: 'sheet',
    imported: true, hsCode: '4410.11.00', dutyRateMfn: 10, dutyRatePreferential: 0, preferentialScheme: 'ATIGA',
    lartas: 'DIPK', primarySupplierId: 'sup_bison', supplierLeadDays: 21, transitDays: 9, inlandDays: 2,
    safetyStock: 250, reorderPoint: 500, minOrderQuantity: 900, standardCost: 178_000,
  }),
  item({
    id: 'it_ply12', code: 'PNL-PLY-12', name: 'Plywood meranti, 12 mm, 1220 × 2440', type: 'PANEL', uom: 'sheet',
    hsCode: '4412.33.00', primarySupplierId: 'sup_jatimakmur', supplierLeadDays: 8,
    safetyStock: 120, reorderPoint: 260, minOrderQuantity: 300, standardCost: 224_000,
  }),

  /* ---------- veneer and laminate ---------- */
  item({
    id: 'it_venoak', code: 'VNR-OAK-06', name: 'Sliced oak veneer, 0.6 mm, crown cut', type: 'VENEER_LAMINATE', uom: 'm2',
    imported: true, hsCode: '4408.90.00', dutyRateMfn: 5, dutyRatePreferential: 0, preferentialScheme: 'ATIGA',
    lartas: 'DIPK', primarySupplierId: 'sup_bison', supplierLeadDays: 24, transitDays: 9, inlandDays: 2,
    safetyStock: 900, reorderPoint: 2100, minOrderQuantity: 3000, standardCost: 41_500,
    note: 'Segregated by flitch on receipt — mixing two flitches in one door front is a guaranteed colour-mismatch claim.',
  }),
  item({
    id: 'it_hpl', code: 'LAM-HPL-08', name: 'HPL 0.8 mm, matt, 1220 × 2440', type: 'VENEER_LAMINATE', uom: 'sheet',
    imported: true, hsCode: '4823.90.99', dutyRateMfn: 10, dutyRatePreferential: 5, preferentialScheme: 'ACFTA',
    primarySupplierId: 'sup_dtc', supplierLeadDays: 24, transitDays: 16, inlandDays: 2,
    safetyStock: 150, reorderPoint: 340, minOrderQuantity: 500, standardCost: 213_000,
  }),
  item({
    id: 'it_edge', code: 'LAM-EDG-22', name: 'PVC edge banding, 22 × 1 mm', type: 'VENEER_LAMINATE', uom: 'm',
    primarySupplierId: 'sup_dtc', imported: true, hsCode: '4823.90.99', dutyRateMfn: 10, dutyRatePreferential: 5,
    preferentialScheme: 'ACFTA', supplierLeadDays: 24, transitDays: 16, inlandDays: 2,
    safetyStock: 8000, reorderPoint: 16000, minOrderQuantity: 24000, standardCost: 2_150,
  }),

  /* ---------- hardware ---------- */
  item({
    id: 'it_runner', code: 'HDW-RUN-450', name: 'Hettich Quadro V6 soft-close runner, 450 mm', type: 'HARDWARE', uom: 'pair',
    imported: true, hsCode: '8302.42.90', dutyRateMfn: 12.5, lartas: 'NONE',
    primarySupplierId: 'sup_hettich', supplierLeadDays: 35, transitDays: 31, inlandDays: 2,
    safetyStock: 400, reorderPoint: 900, minOrderQuantity: 1000, standardCost: 268_000,
    note: 'The single longest lead time on the hardware list, and in every case-goods BOM we sell.',
  }),
  item({
    id: 'it_hinge', code: 'HDW-HNG-110', name: 'DTC clip-on hinge 110°, soft close', type: 'HARDWARE', uom: 'pc',
    imported: true, hsCode: '8302.10.00', dutyRateMfn: 12.5, dutyRatePreferential: 0, preferentialScheme: 'ACFTA',
    primarySupplierId: 'sup_dtc', supplierLeadDays: 28, transitDays: 16, inlandDays: 2,
    safetyStock: 1200, reorderPoint: 2600, minOrderQuantity: 4000, standardCost: 18_900,
  }),
  item({
    id: 'it_lift', code: 'HDW-LFT-AV', name: 'Hettich Aventos-type lift system, medium', type: 'HARDWARE', uom: 'set',
    imported: true, hsCode: '8302.42.90', dutyRateMfn: 12.5,
    primarySupplierId: 'sup_hettich', supplierLeadDays: 35, transitDays: 31, inlandDays: 2,
    safetyStock: 60, reorderPoint: 140, minOrderQuantity: 200, standardCost: 742_000,
  }),
  item({
    id: 'it_handle', code: 'HDW-HDL-160', name: 'Solid brass bar handle, 160 mm c/c, antique', type: 'HARDWARE', uom: 'pc',
    imported: true, hsCode: '8302.42.90', dutyRateMfn: 12.5, dutyRatePreferential: 0, preferentialScheme: 'ACFTA',
    primarySupplierId: 'sup_dtc', supplierLeadDays: 28, transitDays: 16, inlandDays: 2,
    safetyStock: 600, reorderPoint: 1400, minOrderQuantity: 2000, standardCost: 34_600,
  }),
  item({
    id: 'it_castor', code: 'HDW-CST-50', name: 'Twin-wheel castor 50 mm, braked', type: 'HARDWARE', uom: 'pc',
    imported: true, hsCode: '8302.20.00', dutyRateMfn: 10, dutyRatePreferential: 0, preferentialScheme: 'ACFTA',
    primarySupplierId: 'sup_dtc', supplierLeadDays: 28, transitDays: 16, inlandDays: 2,
    safetyStock: 400, reorderPoint: 900, minOrderQuantity: 1200, standardCost: 12_400,
  }),
  item({
    id: 'it_conn', code: 'HDW-CON-KD', name: 'Knock-down cam and dowel connector set', type: 'HARDWARE', uom: 'set',
    imported: true, hsCode: '8302.42.90', dutyRateMfn: 12.5, dutyRatePreferential: 0, preferentialScheme: 'ACFTA',
    primarySupplierId: 'sup_dtc', supplierLeadDays: 28, transitDays: 16, inlandDays: 2,
    safetyStock: 900, reorderPoint: 2000, minOrderQuantity: 3000, standardCost: 6_800,
  }),

  /* ---------- finishing chemistry ---------- */
  item({
    id: 'it_sealer', code: 'FIN-SEA-PU', name: 'Sayerlack PU sealer, clear', type: 'FINISHING_CHEMICAL', uom: 'L',
    imported: true, hsCode: '3208.20.90', dutyRateMfn: 10, lartas: 'IP_B2',
    primarySupplierId: 'sup_sayerlack', supplierLeadDays: 38, transitDays: 32, inlandDays: 3,
    safetyStock: 400, reorderPoint: 900, minOrderQuantity: 1000, standardCost: 168_000,
    note: 'B2 chemistry. Needs the IP-B2 on file and a Laporan Surveyor on every consignment.',
  }),
  item({
    id: 'it_topcoat', code: 'FIN-TOP-PU-M', name: 'Sayerlack PU topcoat, matt 20 gloss', type: 'FINISHING_CHEMICAL', uom: 'L',
    imported: true, hsCode: '3208.20.90', dutyRateMfn: 10, lartas: 'IP_B2',
    primarySupplierId: 'sup_sayerlack', supplierLeadDays: 38, transitDays: 32, inlandDays: 3,
    safetyStock: 350, reorderPoint: 800, minOrderQuantity: 1000, standardCost: 214_000,
  }),
  item({
    id: 'it_thinner', code: 'FIN-THN-PU', name: 'PU thinner (toluene / xylene blend)', type: 'FINISHING_CHEMICAL', uom: 'L',
    imported: true, hsCode: '3814.00.00', dutyRateMfn: 5, lartas: 'IP_B2',
    primarySupplierId: 'sup_sayerlack', supplierLeadDays: 38, transitDays: 32, inlandDays: 3,
    safetyStock: 500, reorderPoint: 1100, minOrderQuantity: 1500, standardCost: 46_000,
    note: 'The toluene and xylene are what make this B2. It is also 40% of every litre sprayed.',
  }),
  item({
    id: 'it_stain', code: 'FIN-STN-WAL', name: 'Wiping stain, walnut medium', type: 'FINISHING_CHEMICAL', uom: 'L',
    imported: true, hsCode: '3208.20.90', dutyRateMfn: 10, lartas: 'IP_B2',
    primarySupplierId: 'sup_sayerlack', supplierLeadDays: 38, transitDays: 32, inlandDays: 3,
    safetyStock: 120, reorderPoint: 280, minOrderQuantity: 400, standardCost: 196_000,
  }),
  item({
    id: 'it_wbtop', code: 'FIN-TOP-WB', name: 'Water-based topcoat, matt', type: 'FINISHING_CHEMICAL', uom: 'L',
    imported: true, hsCode: '3208.20.90', dutyRateMfn: 10, lartas: 'IP_B2',
    primarySupplierId: 'sup_sayerlack', supplierLeadDays: 38, transitDays: 32, inlandDays: 3,
    safetyStock: 200, reorderPoint: 450, minOrderQuantity: 600, standardCost: 268_000,
    note: 'What the European buyers specify. Cures slowly in Semarang humidity, which costs booth time.',
  }),

  /* ---------- upholstery ---------- */
  item({
    id: 'it_foam32', code: 'UPH-FOM-32', name: 'PU foam sheet, density 32 kg/m³, 100 mm', type: 'UPHOLSTERY', uom: 'sheet',
    imported: true, hsCode: '3921.13.00', dutyRateMfn: 10, dutyRatePreferential: 0, preferentialScheme: 'ATIGA',
    primarySupplierId: 'sup_bison', supplierLeadDays: 18, transitDays: 9, inlandDays: 2,
    safetyStock: 80, reorderPoint: 180, minOrderQuantity: 250, standardCost: 612_000,
  }),
  item({
    id: 'it_fabric', code: 'UPH-FAB-PLY', name: 'Woven polyester upholstery fabric, 340 gsm', type: 'UPHOLSTERY', uom: 'm',
    imported: true, hsCode: '5407.61.90', dutyRateMfn: 15, dutyRatePreferential: 5, preferentialScheme: 'ACFTA',
    primarySupplierId: 'sup_foshanfab', supplierLeadDays: 24, transitDays: 16, inlandDays: 2,
    safetyStock: 700, reorderPoint: 1600, minOrderQuantity: 2000, standardCost: 96_000,
    note: 'Colour lots drift between shipments. Two lots in one sofa is a claim.',
  }),
  item({
    id: 'it_webbing', code: 'UPH-WEB-50', name: 'Elastic webbing, 50 mm', type: 'UPHOLSTERY', uom: 'm',
    primarySupplierId: 'sup_jatimakmur', supplierLeadDays: 10,
    safetyStock: 900, reorderPoint: 1800, minOrderQuantity: 2000, standardCost: 8_900,
  }),

  /* ---------- glass ---------- */
  item({
    id: 'it_glass6', code: 'GLS-TMP-06', name: 'Tempered clear glass, 6 mm, cut to size', type: 'GLASS_STONE', uom: 'm2',
    hsCode: '7005.29.90', lartas: 'SNI', primarySupplierId: 'sup_kacapratama', supplierLeadDays: 12,
    safetyStock: 20, reorderPoint: 45, minOrderQuantity: 50, standardCost: 412_000,
    note: 'Mandatory SNI. A standing 2% breakage allowance between the cutter and our bench.',
  }),

  /* ---------- consumables and packaging ---------- */
  item({ id: 'it_glue', code: 'CON-ADH-PVA', name: 'PVAc D3 wood adhesive', type: 'CONSUMABLE', uom: 'kg', primarySupplierId: 'sup_jatimakmur', supplierLeadDays: 7, safetyStock: 300, reorderPoint: 600, minOrderQuantity: 500, standardCost: 34_500 }),
  item({ id: 'it_abrasive', code: 'CON-ABR-240', name: 'Abrasive belt & sheet assortment, P120–P320', type: 'CONSUMABLE', uom: 'pack', primarySupplierId: 'sup_jatimakmur', supplierLeadDays: 7, safetyStock: 60, reorderPoint: 130, minOrderQuantity: 150, standardCost: 189_000 }),
  item({ id: 'it_screw', code: 'CON-SCR-ASS', name: 'Screw and staple assortment', type: 'CONSUMABLE', uom: 'kg', primarySupplierId: 'sup_jatimakmur', supplierLeadDays: 7, safetyStock: 150, reorderPoint: 300, minOrderQuantity: 250, standardCost: 41_000 }),
  item({ id: 'it_carton', code: 'PKG-CTN-5L', name: 'Corrugated carton, 5-ply, made to size', type: 'PACKAGING', uom: 'pc', primarySupplierId: 'sup_kemasan', supplierLeadDays: 7, safetyStock: 800, reorderPoint: 1600, minOrderQuantity: 2000, standardCost: 38_500 }),
  item({ id: 'it_epe', code: 'PKG-EPE-05', name: 'EPE foam sheet, 5 mm', type: 'PACKAGING', uom: 'm2', primarySupplierId: 'sup_kemasan', supplierLeadDays: 7, safetyStock: 1200, reorderPoint: 2400, minOrderQuantity: 3000, standardCost: 6_400 }),
  item({ id: 'it_corner', code: 'PKG-COR-EG', name: 'Edge corner protector, 50 × 50 × 5 mm', type: 'PACKAGING', uom: 'm', primarySupplierId: 'sup_kemasan', supplierLeadDays: 7, safetyStock: 2000, reorderPoint: 4000, minOrderQuantity: 5000, standardCost: 3_900 }),

  /* ---------- semi-finished: what conversion produces, not what purchasing buys ---------- */
  item({
    id: 'it_sf_oakblank', code: 'SFG-BLK-OAK', name: 'Oak component blank, ripped & docked, S4S', type: 'SEMI_FINISHED', uom: 'pc',
    species: 'American white oak', targetMoistureMin: 8, targetMoistureMax: 12,
    supplierLeadDays: 3, safetyStock: 400, reorderPoint: 900, standardCost: 96_000,
    note: 'Made on our own rough mill from TMB-OAK-26. Nobody sells this — it comes out of a conversion order or it does not exist.',
  }),
  item({
    id: 'it_sf_walblank', code: 'SFG-BLK-WAL', name: 'Walnut component blank, ripped & docked, S4S', type: 'SEMI_FINISHED', uom: 'pc',
    species: 'American black walnut', targetMoistureMin: 8, targetMoistureMax: 12,
    supplierLeadDays: 3, safetyStock: 200, reorderPoint: 450, standardCost: 214_000,
  }),
  item({
    id: 'it_sf_teakblank', code: 'SFG-BLK-JAT', name: 'Jati component blank, ripped & docked, S4S', type: 'SEMI_FINISHED', uom: 'pc',
    species: 'Jati', targetMoistureMin: 8, targetMoistureMax: 12,
    supplierLeadDays: 3, safetyStock: 250, reorderPoint: 500, standardCost: 168_000,
  }),
  item({
    id: 'it_sf_venpanel', code: 'SFG-PNL-VEN', name: 'Oak-veneered MDF panel, 18 mm, both faces', type: 'SEMI_FINISHED', uom: 'sheet',
    supplierLeadDays: 2, safetyStock: 60, reorderPoint: 140, standardCost: 612_000,
    note: 'MDF plus sliced veneer plus a press cycle. Buying it ready-made costs 40% more and loses the flitch traceability an export desk asks for.',
  }),
  item({
    id: 'it_sf_nested', code: 'SFG-PRT-NST', name: 'Nested panel parts, cut & edge-banded', type: 'SEMI_FINISHED', uom: 'pc',
    supplierLeadDays: 2, safetyStock: 800, reorderPoint: 1800, standardCost: 78_000,
  }),
  item({
    id: 'it_sf_glued', code: 'SFG-PNL-GLU', name: 'Edge-glued solid panel, 26 mm', type: 'SEMI_FINISHED', uom: 'm2',
    supplierLeadDays: 4, safetyStock: 40, reorderPoint: 90, standardCost: 1_180_000,
    note: 'The panel that lets a short offcut stop being an offcut — narrow stock edge-glued into a table top.',
  }),

  /* ---------- offcuts: the leftover that is still worth something ---------- */
  item({
    id: 'it_oc_solid', code: 'OFC-SLD-MIX', name: 'Solid timber offcut, racked by species and length', type: 'OFFCUT', uom: 'm3',
    supplierLeadDays: 0, standardCost: 0,
    note: 'Not bought and not sold. Carried at a fraction of the board it came off, and worth exactly as much as somebody remembers to look at the rack.',
  }),
  item({
    id: 'it_oc_sheet', code: 'OFC-SHT-MIX', name: 'Sheet drop, racked by size', type: 'OFFCUT', uom: 'm2',
    supplierLeadDays: 0, standardCost: 0,
  }),
]

/* ==================================================================
   Customers
   ================================================================== */

export const customers: Customer[] = [
  {
    id: 'cus_informa', code: 'CUS-1001', name: 'PT Home Center Indonesia (Informa)', segment: 'RETAIL_CHAIN',
    status: 'ACTIVE', country: 'ID', city: 'Jakarta Selatan', address: 'Jl. Puri Indah Raya Blok U1, Kembangan',
    taxId: '01.318.223.4-054.000', currency: 'IDR', paymentTermDays: 45, depositPercent: 0,
    creditLimit: 6_500_000_000, since: d(-2190),
    contacts: [
      { id: 'ct_inf1', name: 'Ratna Dewi Kusuma', title: 'Merchandising Manager', email: 'ratna.kusuma@informa.example', phone: '+62 811 9002 441', primary: true },
      { id: 'ct_inf2', name: 'Bayu Ardiansyah', title: 'Supply Planner', email: 'bayu.a@informa.example', phone: '+62 812 8811 207', primary: false },
    ],
    note: 'Programme buying against a rolling forecast. Forgiving on price, unforgiving on the delivery window.',
  },
  {
    id: 'cus_alila', code: 'CUS-1002', name: 'Alila Hospitality Group — Ubud Ridge Project', segment: 'CONTRACT_FFE',
    status: 'ACTIVE', country: 'ID', city: 'Denpasar', address: 'Jl. Bypass Ngurah Rai 88, Sanur',
    taxId: '02.771.409.2-901.000', currency: 'IDR', paymentTermDays: 30, depositPercent: 30,
    creditLimit: 4_200_000_000, latePenaltyPerDay: 9_500_000, since: d(-420),
    contacts: [
      { id: 'ct_ali1', name: 'Made Wirawan', title: 'Project Procurement Lead', email: 'made.wirawan@alila.example', phone: '+62 813 3877 512', primary: true },
    ],
    note: 'A dated fit-out with a penalty clause of Rp 9.5 juta a day. The opening date does not move because we are late.',
  },
  {
    id: 'cus_nordiska', code: 'CUS-1003', name: 'Nordiska Hem AB', segment: 'EXPORT',
    status: 'ACTIVE', country: 'NL', city: 'Rotterdam', address: 'Waalhaven Oostzijde 81, 3087 BM Rotterdam',
    taxId: 'NL8234.11.902.B01', currency: 'EUR', paymentTermDays: 60, depositPercent: 0,
    creditLimit: 1_100_000_000, since: d(-980),
    contacts: [
      { id: 'ct_nor1', name: 'Sanne de Vries', title: 'Sourcing Director', email: 's.devries@nordiskahem.example', phone: '+31 6 2144 9083', primary: true },
    ],
    note: 'Water-based finish and full species traceability on every line — their compliance desk asks for the harvest country by name.',
  },
  {
    id: 'cus_vivere', code: 'CUS-1004', name: 'PT Vivere Multi Kreasi', segment: 'DEALER',
    status: 'ACTIVE', country: 'ID', city: 'Jakarta Timur', address: 'Jl. Raya Bekasi KM 21, Pulogadung',
    taxId: '01.907.336.7-092.000', currency: 'IDR', paymentTermDays: 30, depositPercent: 0,
    creditLimit: 1_800_000_000, since: d(-1620),
    contacts: [{ id: 'ct_viv1', name: 'Andrianto Halim', title: 'Purchasing Head', email: 'andrianto@vivere.example', phone: '+62 812 1099 774', primary: true }],
  },
  {
    id: 'cus_dekoruma', code: 'CUS-1005', name: 'PT Dekoruma Inovasi Lestari', segment: 'ECOMMERCE',
    status: 'ACTIVE', country: 'ID', city: 'Jakarta Selatan', address: 'Jl. TB Simatupang 41, Cilandak',
    taxId: '80.114.226.5-013.000', currency: 'IDR', paymentTermDays: 21, depositPercent: 0,
    creditLimit: 900_000_000, since: d(-760),
    contacts: [{ id: 'ct_dek1', name: 'Nabila Rahmawati', title: 'Category Manager', email: 'nabila.r@dekoruma.example', phone: '+62 878 4411 209', primary: true }],
    note: 'Small orders against finished stock, packed to survive a courier rather than a container.',
  },
  {
    id: 'cus_wovn', code: 'CUS-1006', name: 'Woven & Grain Ltd', segment: 'EXPORT',
    status: 'ACTIVE', country: 'AU', city: 'Melbourne', address: '14 Bertie Street, Port Melbourne VIC 3207',
    taxId: 'ABN 61 224 771 903', currency: 'USD', paymentTermDays: 45, depositPercent: 20,
    creditLimit: 750_000_000, since: d(-540),
    contacts: [{ id: 'ct_wov1', name: 'Elise Kavanagh', title: 'Buying Manager', email: 'elise@wovenandgrain.example', phone: '+61 4 1188 2270', primary: true }],
    note: 'Outdoor programme in acacia. Every consignment needs the ISPM-15 mark on the packing timber.',
  },
  {
    id: 'cus_grandwhiz', code: 'CUS-1007', name: 'PT Graha Whiz Perkasa', segment: 'CONTRACT_FFE',
    status: 'ON_HOLD', country: 'ID', city: 'Surabaya', address: 'Jl. Basuki Rahmat 106, Genteng',
    taxId: '03.221.884.9-604.000', currency: 'IDR', paymentTermDays: 30, depositPercent: 30,
    creditLimit: 1_400_000_000, since: d(-1180),
    contacts: [{ id: 'ct_gwz1', name: 'Fitri Handayani', title: 'Procurement', email: 'fitri.h@grahawhiz.example', phone: '+62 811 3477 905', primary: true }],
    note: 'On hold: Rp 1.62 miliar outstanding past 90 days on the last two projects. Nothing new releases until it clears.',
  },
  {
    id: 'cus_kanso', code: 'CUS-1008', name: 'Kanso Living GK', segment: 'EXPORT',
    status: 'PROSPECT', country: 'JP', city: 'Osaka', address: '2-4-11 Minamisenba, Chuo-ku, Osaka 542-0081',
    taxId: 'JP7120001099224', currency: 'JPY', paymentTermDays: 30, depositPercent: 0,
    creditLimit: 400_000_000, since: d(-90),
    contacts: [{ id: 'ct_kan1', name: 'Haruto Ishikawa', title: 'Product Sourcing', email: 'h.ishikawa@kanso.example', phone: '+81 6 6120 4471', primary: true }],
    note: 'Sampling stage. Wants the walnut line under IJEPA preference, which needs a Form JIEPA on every shipment.',
  },
]

/* ==================================================================
   Products — what we make
   ================================================================== */

const prod = (x: Partial<Product> & Pick<Product, 'id' | 'sku' | 'name' | 'collection' | 'category' | 'listPrice'>): Product => ({
  isSubAssembly: false, finish: 'PU_MATT', widthMm: 0, depthMm: 0, heightMm: 0,
  packedCbm: 0, netWeightKg: 0, currency: 'IDR', active: true, targetMarginPercent: 32,
  ...x,
})

export const products: Product[] = [
  /* ---------- Larasati — case goods, walnut and oak ---------- */
  prod({
    id: 'pr_wardrobe', sku: 'LRS-WD-2400', name: 'Larasati Three-Door Wardrobe 2400', collection: 'Larasati',
    category: 'CASE_GOODS', finish: 'PU_MATT', widthMm: 2400, depthMm: 620, heightMm: 2200,
    packedCbm: 1.42, netWeightKg: 186, listPrice: 28_400_000, targetMarginPercent: 34,
    note: 'The contract line’s workhorse. Six drawers, so six pairs of the longest-lead-time runner we buy.',
  }),
  prod({
    id: 'pr_sideboard', sku: 'LRS-SB-1800', name: 'Larasati Sideboard 1800', collection: 'Larasati',
    category: 'CASE_GOODS', finish: 'PU_MATT', widthMm: 1800, depthMm: 450, heightMm: 780,
    packedCbm: 0.72, netWeightKg: 74, listPrice: 14_900_000, targetMarginPercent: 33,
  }),
  prod({
    id: 'pr_nightstand', sku: 'LRS-NS-500', name: 'Larasati Nightstand 500', collection: 'Larasati',
    category: 'CASE_GOODS', finish: 'PU_MATT', widthMm: 500, depthMm: 420, heightMm: 560,
    packedCbm: 0.16, netWeightKg: 18, listPrice: 4_250_000, targetMarginPercent: 36,
  }),

  /* ---------- Prambanan — tables ---------- */
  prod({
    id: 'pr_dining', sku: 'PRB-DT-2200', name: 'Prambanan Dining Table 2200', collection: 'Prambanan',
    category: 'TABLES', finish: 'OIL_WAX', widthMm: 2200, depthMm: 1000, heightMm: 760,
    packedCbm: 0.68, netWeightKg: 92, listPrice: 22_600_000, targetMarginPercent: 35,
    note: 'Solid teak top. Flatness after finishing is the whole quality argument.',
  }),
  prod({
    id: 'pr_coffee', sku: 'PRB-CT-1200', name: 'Prambanan Coffee Table 1200', collection: 'Prambanan',
    category: 'TABLES', finish: 'OIL_WAX', widthMm: 1200, depthMm: 600, heightMm: 400,
    packedCbm: 0.31, netWeightKg: 34, listPrice: 8_150_000,
  }),
  prod({
    id: 'pr_desk', sku: 'PRB-DK-1400', name: 'Prambanan Writing Desk 1400', collection: 'Prambanan',
    category: 'TABLES', finish: 'WATER_BASED', widthMm: 1400, depthMm: 700, heightMm: 750,
    packedCbm: 0.44, netWeightKg: 46, listPrice: 12_800_000,
    note: 'Nordiska’s line. Water-based only, and the oak has to be traceable to a harvest country.',
  }),

  /* ---------- Alun — seating ---------- */
  prod({
    id: 'pr_chair', sku: 'ALN-CH-01', name: 'Alun Dining Chair', collection: 'Alun',
    category: 'SEATING', finish: 'PU_MATT', widthMm: 480, depthMm: 530, heightMm: 830,
    packedCbm: 0.12, netWeightKg: 7.4, listPrice: 3_180_000, targetMarginPercent: 38,
  }),
  prod({
    id: 'pr_armchair', sku: 'ALN-AC-02', name: 'Alun Lounge Armchair', collection: 'Alun',
    category: 'UPHOLSTERY', finish: 'PU_MATT', widthMm: 760, depthMm: 800, heightMm: 790,
    packedCbm: 0.49, netWeightKg: 22, listPrice: 9_650_000,
  }),

  /* ---------- Nirmala — upholstery ---------- */
  prod({
    id: 'pr_sofa', sku: 'NRM-SF-3S', name: 'Nirmala Three-Seat Sofa', collection: 'Nirmala',
    category: 'UPHOLSTERY', finish: 'RAW', widthMm: 2100, depthMm: 900, heightMm: 820,
    packedCbm: 1.68, netWeightKg: 68, listPrice: 24_900_000, targetMarginPercent: 30,
  }),

  /* ---------- Segara — outdoor ---------- */
  prod({
    id: 'pr_outdoor', sku: 'SGR-OD-SET', name: 'Segara Outdoor Dining Set (table + 6)', collection: 'Segara',
    category: 'OUTDOOR', finish: 'OIL_WAX', widthMm: 1800, depthMm: 900, heightMm: 750,
    packedCbm: 1.94, netWeightKg: 124, listPrice: 19_400_000, targetMarginPercent: 29,
    note: 'Acacia, 12–15% moisture band. Dried to the indoor band it splits in the first wet season in Melbourne.',
  }),
  prod({
    id: 'pr_bed', sku: 'LRS-BD-160', name: 'Larasati Bed Frame 160 × 200', collection: 'Larasati',
    category: 'BEDS', finish: 'PU_MATT', widthMm: 1680, depthMm: 2120, heightMm: 1100,
    packedCbm: 0.86, netWeightKg: 88, listPrice: 16_700_000,
  }),

  /* ---------- Sub-assemblies: BOM nodes with their own routing ---------- */
  prod({
    id: 'sa_drawer', sku: 'SUB-DRW-450', name: 'Drawer Box 450, dovetail', collection: 'Sub-assembly',
    category: 'COMPONENT', isSubAssembly: true, finish: 'RAW', widthMm: 400, depthMm: 450, heightMm: 150,
    packedCbm: 0, netWeightKg: 2.6, listPrice: 0,
    note: 'Used in the wardrobe, the sideboard, the nightstand and the desk. Change it and four products move.',
  }),
  prod({
    id: 'sa_doorfront', sku: 'SUB-DRF-600', name: 'Veneered Door Front 600 × 2000', collection: 'Sub-assembly',
    category: 'COMPONENT', isSubAssembly: true, finish: 'RAW', widthMm: 600, depthMm: 18, heightMm: 2000,
    packedCbm: 0, netWeightKg: 11.2, listPrice: 0,
    note: 'One flitch per batch. Two flitches in one wardrobe is a colour-mismatch claim, so lots are segregated on receipt.',
  }),
  prod({
    id: 'sa_seatframe', sku: 'SUB-SFR-01', name: 'Seat Frame, webbed', collection: 'Sub-assembly',
    category: 'COMPONENT', isSubAssembly: true, finish: 'RAW', widthMm: 700, depthMm: 700, heightMm: 200,
    packedCbm: 0, netWeightKg: 5.8, listPrice: 0,
  }),
]
