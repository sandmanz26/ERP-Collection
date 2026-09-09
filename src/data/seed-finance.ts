/**
 * Finance — an Indonesian-shaped chart of accounts for a manufacturer that
 * imports, a posted ledger, and the receivables and payables behind it.
 *
 * The chart deliberately separates the three inventory stages, splits cost of
 * sales into material, labour and overhead, and gives purchase price variance
 * and material usage variance accounts of their own — because a variance that
 * has nowhere to be posted is a variance nobody ever explains.
 */

import type { Account, Invoice, JournalEntry, JournalLine } from './types'
import { d } from './clock'

const A = (code: string, name: string, type: Account['type'], normalBalance: Account['normalBalance'], parentCode?: string, description?: string): Account => ({
  id: `acc_${code}`, code, name, type, normalBalance, parentCode, active: true, description,
})

export const accounts: Account[] = [
  /* ---------- assets ---------- */
  A('1000', 'Aset Lancar', 'ASSET', 'DEBIT'),
  A('1100', 'Kas dan Bank', 'ASSET', 'DEBIT', '1000'),
  A('1110', 'Kas kecil', 'ASSET', 'DEBIT', '1100'),
  A('1120', 'Bank BNI — operasional IDR', 'ASSET', 'DEBIT', '1100'),
  A('1130', 'Bank BNI — valas USD', 'ASSET', 'DEBIT', '1100', 'Import settlement account. Revalued at each period close.'),
  A('1140', 'Bank Mandiri — valas EUR', 'ASSET', 'DEBIT', '1100'),
  A('1200', 'Piutang Usaha', 'ASSET', 'DEBIT', '1000'),
  A('1210', 'Piutang dagang', 'ASSET', 'DEBIT', '1200'),
  A('1290', 'Cadangan kerugian piutang', 'ASSET', 'CREDIT', '1200'),
  A('1300', 'Persediaan', 'ASSET', 'DEBIT', '1000'),
  A('1310', 'Persediaan bahan baku', 'ASSET', 'DEBIT', '1300', 'Timber, panel, hardware, chemistry, upholstery — at landed cost.'),
  A('1315', 'Persediaan bahan dalam perjalanan', 'ASSET', 'DEBIT', '1300', 'Goods in transit: title has passed, the container has not landed.'),
  A('1320', 'Persediaan barang dalam proses', 'ASSET', 'DEBIT', '1300'),
  A('1330', 'Persediaan barang jadi', 'ASSET', 'DEBIT', '1300'),
  A('1340', 'Persediaan bahan pembantu dan kemasan', 'ASSET', 'DEBIT', '1300'),
  A('1400', 'Pajak Dibayar di Muka', 'ASSET', 'DEBIT', '1000'),
  A('1410', 'PPN masukan', 'ASSET', 'DEBIT', '1400', 'Creditable import and domestic input VAT. Never inventory cost.'),
  A('1420', 'PPh 22 impor dibayar di muka', 'ASSET', 'DEBIT', '1400', 'A prepayment of corporate income tax, not a cost of the goods.'),
  A('1430', 'PPh 23 dibayar di muka', 'ASSET', 'DEBIT', '1400'),
  A('1500', 'Uang Muka', 'ASSET', 'DEBIT', '1000'),
  A('1510', 'Uang muka pembelian impor', 'ASSET', 'DEBIT', '1500', 'T/T in advance and L/C margin deposits.'),
  A('1520', 'Uang muka bea masuk dan PDRI', 'ASSET', 'DEBIT', '1500'),
  A('1600', 'Aset Tetap', 'ASSET', 'DEBIT'),
  A('1610', 'Mesin dan peralatan produksi', 'ASSET', 'DEBIT', '1600'),
  A('1620', 'Bangunan pabrik', 'ASSET', 'DEBIT', '1600'),
  A('1690', 'Akumulasi penyusutan', 'ASSET', 'CREDIT', '1600'),

  /* ---------- liabilities ---------- */
  A('2000', 'Kewajiban Lancar', 'LIABILITY', 'CREDIT'),
  A('2100', 'Utang Usaha', 'LIABILITY', 'CREDIT', '2000'),
  A('2110', 'Utang dagang lokal', 'LIABILITY', 'CREDIT', '2100'),
  A('2120', 'Utang dagang impor', 'LIABILITY', 'CREDIT', '2100'),
  A('2130', 'Utang L/C usance', 'LIABILITY', 'CREDIT', '2100'),
  A('2200', 'Utang Pajak', 'LIABILITY', 'CREDIT', '2000'),
  A('2210', 'PPN keluaran', 'LIABILITY', 'CREDIT', '2200'),
  A('2220', 'PPh 21 karyawan', 'LIABILITY', 'CREDIT', '2200'),
  A('2230', 'PPh 23 terutang', 'LIABILITY', 'CREDIT', '2200'),
  A('2300', 'Uang Muka Pelanggan', 'LIABILITY', 'CREDIT', '2000', 'Customer deposits on made-to-order work.'),
  A('2400', 'Biaya Yang Masih Harus Dibayar', 'LIABILITY', 'CREDIT', '2000'),
  A('2410', 'Akrual biaya impor', 'LIABILITY', 'CREDIT', '2400', 'Freight, clearance and trucking accrued before the vendor invoice lands.'),

  /* ---------- equity ---------- */
  A('3000', 'Ekuitas', 'EQUITY', 'CREDIT'),
  A('3100', 'Modal disetor', 'EQUITY', 'CREDIT', '3000'),
  A('3200', 'Laba ditahan', 'EQUITY', 'CREDIT', '3000'),

  /* ---------- revenue ---------- */
  A('4000', 'Pendapatan', 'REVENUE', 'CREDIT'),
  A('4100', 'Penjualan — retail dan dealer', 'REVENUE', 'CREDIT', '4000'),
  A('4200', 'Penjualan — kontrak dan FF&E', 'REVENUE', 'CREDIT', '4000'),
  A('4300', 'Penjualan — ekspor', 'REVENUE', 'CREDIT', '4000'),
  A('4900', 'Potongan penjualan dan retur', 'REVENUE', 'DEBIT', '4000'),

  /* ---------- cost of sales ---------- */
  A('5000', 'Harga Pokok Penjualan', 'COGS', 'DEBIT'),
  A('5100', 'HPP — bahan baku', 'COGS', 'DEBIT', '5000'),
  A('5200', 'HPP — tenaga kerja langsung', 'COGS', 'DEBIT', '5000'),
  A('5300', 'HPP — overhead pabrik dibebankan', 'COGS', 'DEBIT', '5000'),
  A('5400', 'HPP — subkontrak (makloon)', 'COGS', 'DEBIT', '5000'),
  A('5500', 'Selisih harga pembelian', 'COGS', 'DEBIT', '5000', 'Purchase price variance: landed cost against standard.'),
  A('5510', 'Selisih pemakaian bahan', 'COGS', 'DEBIT', '5000', 'Material usage variance: issued against BOM standard.'),
  A('5520', 'Selisih efisiensi tenaga kerja', 'COGS', 'DEBIT', '5000'),
  A('5600', 'Biaya scrap dan rework', 'COGS', 'DEBIT', '5000'),

  /* ---------- expense ---------- */
  A('6000', 'Beban Usaha', 'EXPENSE', 'DEBIT'),
  A('6100', 'Beban gaji dan tunjangan', 'EXPENSE', 'DEBIT', '6000'),
  A('6200', 'Beban penjualan dan pemasaran', 'EXPENSE', 'DEBIT', '6000'),
  A('6300', 'Beban umum dan administrasi', 'EXPENSE', 'DEBIT', '6000'),
  A('6400', 'Beban penyusutan', 'EXPENSE', 'DEBIT', '6000'),
  A('6500', 'Demurrage dan detention', 'EXPENSE', 'DEBIT', '6000', 'Kept out of inventory cost deliberately: it is a decision, not a cost of the goods.'),
  A('6600', 'Beban perizinan dan sertifikasi', 'EXPENSE', 'DEBIT', '6000', 'SVLK, IP-B2, DIPK filings, SNI and FSC surveillance.'),
  A('6700', 'Selisih kurs', 'EXPENSE', 'DEBIT', '6000', 'Including the gap between NDPBM and the rate the invoice is settled at.'),
  A('6800', 'Beban bunga dan bank', 'EXPENSE', 'DEBIT', '6000'),
]

/* ==================================================================
   Journal
   ================================================================== */

let jlSeq = 0
const JL = (accountCode: string, description: string, debit: number, credit: number, extra: Partial<JournalLine> = {}): JournalLine => ({
  id: `jl_${++jlSeq}`, accountCode, description, debit, credit, ...extra,
})

const JE = (
  id: string, code: string, date: string, memo: string,
  source: JournalEntry['source'], lines: JournalLine[], reference?: string,
): JournalEntry => ({
  id, code, date, memo, source, status: 'POSTED', lines,
  postedBy: 'Ayu Lestari', postedAt: date, reference,
})

export const journal: JournalEntry[] = [
  JE('je_0221', 'JV-2026-0221', d(-42), 'Goods receipt IMP-2026-0058 — Baillie oak and walnut, landed', 'GOODS_RECEIPT', [
    JL('1310', 'Raw material at landed cost — 36 m³ oak, 12 m³ walnut', 1_379_520_000, 0, { shipmentId: 'shp_0058' }),
    JL('1410', 'PPN impor, creditable', 154_105_000, 0, { shipmentId: 'shp_0058' }),
    JL('1420', 'PPh 22 impor, prepayment', 35_024_000, 0, { shipmentId: 'shp_0058' }),
    JL('1315', 'Release goods in transit', 0, 1_279_269_000),
    JL('2120', 'Import payable and duty settlement', 0, 289_380_000),
  ], 'IMP-2026-0058'),

  JE('je_0224', 'JV-2026-0224', d(-42), 'Demurrage on IMP-2026-0058 — four days past free time', 'AP_BILL', [
    JL('6500', 'Demurrage, MSC — 4 days on MSCU7418823', 5_800_000, 0, { shipmentId: 'shp_0058' }),
    JL('1410', 'PPN masukan', 638_000, 0),
    JL('2110', 'PT Samudera Lintas Benua', 0, 6_438_000),
  ], 'IMP-2026-0058'),

  JE('je_0238', 'JV-2026-0238', d(-30), 'Landed cost finalisation IMP-2026-0058 — allocation against provisional', 'LANDED_COST', [
    JL('1310', 'Freight, clearance, THC and trucking allocated to lots', 84_950_000, 0, { shipmentId: 'shp_0058' }),
    JL('5500', 'Purchase price variance — landed above standard on oak', 12_408_000, 0, { shipmentId: 'shp_0058' }),
    JL('2410', 'Reverse import cost accrual', 0, 97_358_000),
  ], 'IMP-2026-0058'),

  JE('je_0252', 'JV-2026-0252', d(-22), 'Goods receipt IMP-2026-0061 — DTC hardware and surfaces', 'GOODS_RECEIPT', [
    JL('1310', 'Hardware, HPL and edge banding at landed cost', 452_186_000, 0, { shipmentId: 'shp_0061' }),
    JL('1410', 'PPN impor, creditable', 45_216_000, 0, { shipmentId: 'shp_0061' }),
    JL('1420', 'PPh 22 impor, prepayment', 10_277_000, 0, { shipmentId: 'shp_0061' }),
    JL('1315', 'Release goods in transit', 0, 395_281_000),
    JL('2120', 'Import payable and duty settlement', 0, 112_398_000),
  ], 'IMP-2026-0061'),

  JE('je_0266', 'JV-2026-0266', d(-24), 'Goods receipt IMP-2026-0063 — Hettich runners', 'GOODS_RECEIPT', [
    JL('1310', '900 pairs Quadro V6 at landed cost', 267_426_000, 0, { shipmentId: 'shp_0063' }),
    JL('1410', 'PPN impor, creditable', 31_722_000, 0, { shipmentId: 'shp_0063' }),
    JL('1420', 'PPh 22 impor, prepayment', 7_210_000, 0, { shipmentId: 'shp_0063' }),
    JL('2130', 'L/C at sight settled', 0, 306_358_000),
  ], 'IMP-2026-0063'),

  JE('je_0274', 'JV-2026-0274', d(-16), 'Goods receipt IMP-2026-0065 — Bison panels and foam', 'GOODS_RECEIPT', [
    JL('1310', 'MDF, particle board and foam at landed cost', 668_442_000, 0, { shipmentId: 'shp_0065' }),
    JL('1410', 'PPN impor, creditable', 90_140_000, 0, { shipmentId: 'shp_0065' }),
    JL('1420', 'PPh 22 impor, prepayment', 20_486_000, 0, { shipmentId: 'shp_0065' }),
    JL('1315', 'Release goods in transit', 0, 620_260_000),
    JL('2130', 'L/C usance 90 days accepted', 0, 158_808_000),
  ], 'IMP-2026-0065'),

  JE('je_0281', 'JV-2026-0281', d(-14), 'Material issue to work orders, week 36', 'MATERIAL_ISSUE', [
    JL('1320', 'Work in progress', 986_420_000, 0),
    JL('1310', 'Raw material consumed', 0, 941_180_000),
    JL('5510', 'Material usage variance — timber yield below standard at rough mill', 0, 45_240_000),
  ]),

  JE('je_0286', 'JV-2026-0286', d(-11), 'Scrap at sanding — WO-2026-4402, three nightstand tops sanded through', 'SCRAP', [
    JL('5600', 'Scrap: material plus operations already spent', 4_610_000, 0, { workOrderId: 'wo_4402' }),
    JL('1320', 'Work in progress written down', 0, 4_610_000),
  ], 'QC-2026-0114'),

  JE('je_0290', 'JV-2026-0290', d(-9), 'Production output to finished goods, week 36', 'PRODUCTION_OUTPUT', [
    JL('1330', 'Finished goods at standard', 742_180_000, 0),
    JL('1320', 'Work in progress released', 0, 718_940_000),
    JL('5520', 'Labour efficiency variance — favourable at assembly', 0, 23_240_000),
  ]),

  JE('je_0294', 'JV-2026-0294', d(-8), 'Sales invoice INV-2026-0418 — Informa, 60 nightstands', 'AR_INVOICE', [
    JL('1210', 'PT Home Center Indonesia', 254_412_000, 0, { salesOrderId: 'so_0028' }),
    JL('4100', 'Retail and dealer revenue', 0, 229_200_000, { salesOrderId: 'so_0028' }),
    JL('2210', 'PPN keluaran 11%', 0, 25_212_000),
  ], 'INV-2026-0418'),

  JE('je_0295', 'JV-2026-0295', d(-8), 'Cost of sales on INV-2026-0418', 'PRODUCTION_OUTPUT', [
    JL('5100', 'Material', 108_640_000, 0),
    JL('5200', 'Direct labour', 28_940_000, 0),
    JL('5300', 'Factory overhead absorbed', 22_180_000, 0),
    JL('1330', 'Finished goods relieved', 0, 159_760_000),
  ], 'INV-2026-0418'),

  JE('je_0298', 'JV-2026-0298', d(-42), 'Customer deposit — Alila Ubud Ridge, 30% on SO-2026-0031', 'PAYMENT', [
    JL('1120', 'Bank BNI operasional', 2_968_800_000, 0),
    JL('2300', 'Customer deposit held against SO-2026-0031', 0, 2_968_800_000, { salesOrderId: 'so_0031' }),
  ], 'SO-2026-0031'),

  JE('je_0302', 'JV-2026-0302', d(-6), 'Rework order WO-2026-4419 raised — fish eye on 34 desk tops', 'VARIANCE', [
    JL('5600', 'Rework: strip, flat back and refinish', 41_800_000, 0, { workOrderId: 'wo_4419' }),
    JL('1320', 'Work in progress', 0, 41_800_000),
  ], 'QC-2026-0118'),

  JE('je_0305', 'JV-2026-0305', d(-4), 'Duty and PDRI paid on PIB 000812 — IMP-2026-0069', 'PAYMENT', [
    JL('1520', 'Bea masuk and PDRI advanced', 44_812_000, 0, { shipmentId: 'shp_0069' }),
    JL('1410', 'PPN impor, creditable', 60_534_000, 0, { shipmentId: 'shp_0069' }),
    JL('1420', 'PPh 22 impor, prepayment', 13_758_000, 0, { shipmentId: 'shp_0069' }),
    JL('1120', 'Bank BNI operasional', 0, 119_104_000),
  ], 'IMP-2026-0069'),

  JE('je_0308', 'JV-2026-0308', d(-2), 'FX revaluation — EUR payables at month-end NDPBM gap', 'FX_REVALUATION', [
    JL('6700', 'Selisih kurs on EUR import payables', 18_420_000, 0),
    JL('2120', 'Import payable revalued', 0, 18_420_000),
  ]),
]

/* ==================================================================
   Invoices
   ================================================================== */

const IL = (id: string, description: string, quantity: number, unitPrice: number, taxable = true) => ({
  id, description, quantity, unitPrice, amount: quantity * unitPrice, taxable,
})

const inv = (
  x: Omit<Invoice, 'subtotal' | 'vat' | 'total'> & { vatRate?: number },
): Invoice => {
  const subtotal = x.lines.reduce((a, l) => a + l.amount, 0)
  const vat = Math.round(x.lines.filter((l) => l.taxable).reduce((a, l) => a + l.amount, 0) * ((x.vatRate ?? 11) / 100))
  return { ...x, subtotal, vat, total: subtotal + vat }
}

export const invoices: Invoice[] = [
  /* ---------- receivables ---------- */
  inv({
    id: 'inv_0418', code: 'INV-2026-0418', kind: 'AR', status: 'ISSUED', partyId: 'cus_informa',
    partyName: 'PT Home Center Indonesia (Informa)', issueDate: d(-8), dueDate: d(37),
    currency: 'IDR', fxRate: 1, paidAmount: 0, salesOrderId: 'so_0028',
    lines: [IL('il_1', 'Larasati Nightstand 500 — first release', 60, 3_820_000)],
  }),
  inv({
    id: 'inv_0402', code: 'INV-2026-0402', kind: 'AR', status: 'PAID', partyId: 'cus_informa',
    partyName: 'PT Home Center Indonesia (Informa)', issueDate: d(-34), dueDate: d(11),
    currency: 'IDR', fxRate: 1, paidAmount: 879_120_000, salesOrderId: 'so_0025',
    lines: [IL('il_2', 'Larasati Sideboard 1800', 60, 13_200_000)],
  }),
  inv({
    id: 'inv_0388', code: 'INV-2026-0388', kind: 'AR', status: 'OVERDUE', partyId: 'cus_grandwhiz',
    partyName: 'PT Graha Whiz Perkasa', issueDate: d(-124), dueDate: d(-94),
    currency: 'IDR', fxRate: 1, paidAmount: 0,
    lines: [IL('il_3', 'Contract FF&E — Whiz Prime Surabaya, phase 2', 1, 986_400_000)],
    note: 'Ninety-four days past due. This is why SO-2026-0041 is not confirmed.',
  }),
  inv({
    id: 'inv_0371', code: 'INV-2026-0371', kind: 'AR', status: 'OVERDUE', partyId: 'cus_grandwhiz',
    partyName: 'PT Graha Whiz Perkasa', issueDate: d(-152), dueDate: d(-122),
    currency: 'IDR', fxRate: 1, paidAmount: 180_000_000,
    lines: [IL('il_4', 'Contract FF&E — Whiz Prime Surabaya, phase 1 balance', 1, 720_000_000)],
  }),
  inv({
    id: 'inv_0409', code: 'INV-2026-0409', kind: 'AR', status: 'PARTIALLY_PAID', partyId: 'cus_vivere',
    partyName: 'PT Vivere Multi Kreasi', issueDate: d(-54), dueDate: d(-24),
    currency: 'IDR', fxRate: 1, paidAmount: 500_000_000, salesOrderId: 'so_0021',
    lines: [IL('il_5', 'Alun Dining Chair', 300, 2_940_000)],
  }),
  inv({
    id: 'inv_0396', code: 'INV-2026-0396', kind: 'AR', status: 'PAID', partyId: 'cus_nordiska',
    partyName: 'Nordiska Hem AB', issueDate: d(-71), dueDate: d(-11),
    currency: 'EUR', fxRate: 17_640, paidAmount: 38_280, salesOrderId: 'so_0018',
    lines: [IL('il_6', 'Prambanan Writing Desk 1400 — export, FOB Semarang', 60, 638, false)],
  }),

  /* ---------- payables ---------- */
  inv({
    id: 'bil_2214', code: 'BILL-2026-2214', kind: 'AP', status: 'ISSUED', partyId: 'sup_bison',
    partyName: 'Bison Panel Sdn Bhd', issueDate: d(-19), dueDate: d(71),
    currency: 'USD', fxRate: 16_380, paidAmount: 0, shipmentId: 'shp_0065', purchaseOrderId: 'po_0156',
    lines: [IL('il_7', 'MDF 18 mm, MDF 9 mm, particle board, PU foam — CFR Semarang', 1, 50_130, false)],
    note: 'L/C usance 90 days accepted; matures in seventy-one.',
  }),
  inv({
    id: 'bil_2231', code: 'BILL-2026-2231', kind: 'AP', status: 'PAID', partyId: 'sup_hettich',
    partyName: 'Hettich Marketing und Vertriebs GmbH', issueDate: d(-27), dueDate: d(-27),
    currency: 'EUR', fxRate: 17_760, paidAmount: 14_516, shipmentId: 'shp_0063', purchaseOrderId: 'po_0159',
    lines: [IL('il_8', 'Quadro V6 soft-close runner 450 mm × 900 pairs — FOB Hamburg', 1, 14_516, false)],
  }),
  inv({
    id: 'bil_2244', code: 'BILL-2026-2244', kind: 'AP', status: 'ISSUED', partyId: 'sup_dtc',
    partyName: 'Guangdong DTC Hardware Co., Ltd', issueDate: d(-29), dueDate: d(1),
    currency: 'USD', fxRate: 16_260, paidAmount: 0, shipmentId: 'shp_0061', purchaseOrderId: 'po_0151',
    lines: [IL('il_9', 'Hinges, handles, castors, connectors, HPL, edge banding — FOB Ningbo', 1, 24_310, false)],
  }),
  inv({
    id: 'bil_2251', code: 'BILL-2026-2251', kind: 'AP', status: 'ISSUED', partyId: 'sup_perhutani',
    partyName: 'Perum Perhutani KPH Randublatung', issueDate: d(-6), dueDate: d(-6),
    currency: 'IDR', fxRate: 1, paidAmount: 0, purchaseOrderId: 'po_0181',
    lines: [IL('il_10', 'Jati Perhutani sawn 32 mm grade A — 16 m³', 16, 28_400_000)],
  }),
  inv({
    id: 'bil_2258', code: 'BILL-2026-2258', kind: 'AP', status: 'OVERDUE', partyId: 'sup_ukirjaya',
    partyName: 'UD Ukir Jaya (makloon ukir)', issueDate: d(-38), dueDate: d(-24),
    currency: 'IDR', fxRate: 1, paidAmount: 0,
    lines: [IL('il_11', 'Hand carving, makloon — Segara outdoor programme, batch 1', 40, 385_000)],
  }),
  inv({
    id: 'bil_2262', code: 'BILL-2026-2262', kind: 'AP', status: 'ISSUED', partyId: 'sup_sayerlack',
    partyName: 'Sayerlack — Sherwin-Williams Italy S.r.l.', issueDate: d(-40), dueDate: d(-40),
    currency: 'EUR', fxRate: 17_840, paidAmount: 27_990, shipmentId: 'shp_0069', purchaseOrderId: 'po_0171',
    lines: [IL('il_12', 'PU sealer, topcoat, thinner and stain — FOB Genoa', 1, 27_990, false)],
    note: 'Paid in advance. The goods are in a red lane and the money has already gone.',
  }),
]
