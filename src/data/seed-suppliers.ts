import type { PurchasePrice, Supplier } from './types'
import { iso } from './seed-util'
import { items } from './seed-inventory'

/* ------------------------------------------------------------------
   Approved suppliers, and what they have actually charged.

   The price history is the only place a *paid* price exists. A purchase
   request carries a decision; this file carries facts, and "last purchase
   price" is read from here rather than typed by anyone.
   ------------------------------------------------------------------ */

export const suppliers: Supplier[] = [
  {
    id: 'sup_sandang', code: 'SUP-0001', legalName: 'CV Sandang Mandiri', brandName: 'Sandang Mandiri',
    categories: ['UNIFORM'],
    picName: 'Hartono Wijaya', picPhone: '+62 812 9911 0022', picEmail: 'sales@sandangmandiri.co.id',
    address: 'Jl. Industri Tekstil No. 27, Cimahi', city: 'Cimahi', province: 'Jawa Barat',
    npwp: '02.771.334.5-428.000', paymentTermDays: 30, leadTimeDays: 21, minOrderValue: 10_000_000,
    bankName: 'Bank Mandiri', bankAccount: '130-00-4455667-1',
    rating: 4.6, onTimeRate: 94, status: 'ACTIVE', supplierSince: iso(-2100),
    notes: 'Pemasok seragam utama. Ukuran khusus (XXL ke atas) perlu tambahan 7 hari.',
  },
  {
    id: 'sup_kimia', code: 'SUP-0002', legalName: 'PT Kimia Bersih Nusantara', brandName: 'Kimia Bersih',
    categories: ['CLEANING_CHEMICAL'],
    picName: 'Sri Wahyuni', picPhone: '+62 813 5566 7788', picEmail: 'order@kimiabersih.co.id',
    address: 'Kawasan Industri Pulogadung Blok B-12', city: 'Jakarta Timur', province: 'DKI Jakarta',
    npwp: '01.446.882.3-093.000', paymentTermDays: 30, leadTimeDays: 10, minOrderValue: 5_000_000,
    bankName: 'BCA', bankAccount: '208-3344556',
    rating: 4.3, onTimeRate: 91, status: 'ACTIVE', supplierSince: iso(-1800),
    notes: 'Wajib melampirkan MSDS pada setiap pengiriman bahan kimia.',
  },
  {
    id: 'sup_sinar', code: 'SUP-0003', legalName: 'PT Sinar Alat Teknik', brandName: 'Sinar Alat',
    categories: ['CLEANING_TOOL', 'CONSUMABLE'],
    picName: 'Andri Gunawan', picPhone: '+62 815 2233 4455', picEmail: 'andri@sinaralat.co.id',
    address: 'Jl. Raya Bekasi Km. 21 No. 88', city: 'Bekasi', province: 'Jawa Barat',
    npwp: '02.117.556.9-407.000', paymentTermDays: 30, leadTimeDays: 7,
    bankName: 'BNI', bankAccount: '0117-889900',
    rating: 4.1, onTimeRate: 88, status: 'ACTIVE', supplierSince: iso(-1500),
  },
  {
    id: 'sup_garda', code: 'SUP-0004', legalName: 'CV Garda Perkasa Equipment', brandName: 'Garda Perkasa',
    categories: ['SECURITY_EQUIPMENT', 'SPAREPART'],
    picName: 'Bambang Suryo', picPhone: '+62 811 4477 8899', picEmail: 'sales@gardaperkasa.co.id',
    address: 'Jl. Cikini Raya No. 45', city: 'Jakarta Pusat', province: 'DKI Jakarta',
    npwp: '01.223.998.7-071.000', paymentTermDays: 45, leadTimeDays: 30, minOrderValue: 15_000_000,
    bankName: 'Bank Mandiri', bankAccount: '124-00-7788990-2',
    rating: 4.4, onTimeRate: 90, status: 'ACTIVE', supplierSince: iso(-1900),
    notes: 'Handy talky dikirim dengan nomor seri tercatat; izin frekuensi mengikuti gedung klien.',
  },
  {
    id: 'sup_mitra', code: 'SUP-0005', legalName: 'PT Mitra Higienis Indonesia', brandName: 'Mitra Higienis',
    categories: ['CONSUMABLE', 'PPE'],
    picName: 'Ratna Sari', picPhone: '+62 812 6677 2211', picEmail: 'cs@mitrahigienis.co.id',
    address: 'Jl. Daan Mogot Km. 14 No. 5', city: 'Jakarta Barat', province: 'DKI Jakarta',
    npwp: '01.889.223.1-035.000', paymentTermDays: 21, leadTimeDays: 7,
    bankName: 'BCA', bankAccount: '215-7788991',
    rating: 4.7, onTimeRate: 96, status: 'ACTIVE', supplierSince: iso(-1200),
    notes: 'Pengiriman tisu dan galon dua kali seminggu tanpa minimum order.',
  },
  {
    id: 'sup_bumi', code: 'SUP-0006', legalName: 'CV Bumi Safety Utama', brandName: 'Bumi Safety',
    categories: ['PPE', 'UNIFORM'],
    picName: 'Eko Purnomo', picPhone: '+62 878 3311 5566', picEmail: 'order@bumisafety.co.id',
    address: 'Jl. Margomulyo Industri No. 12', city: 'Surabaya', province: 'Jawa Timur',
    npwp: '03.556.117.4-606.000', paymentTermDays: 30, leadTimeDays: 21,
    bankName: 'BRI', bankAccount: '0339-01-556677-53',
    rating: 4.0, onTimeRate: 85, status: 'ACTIVE', supplierSince: iso(-1000),
    notes: 'Harness gondola disertai sertifikat uji; inspeksi ulang enam bulanan ditagih terpisah.',
  },
  {
    id: 'sup_adijaya', code: 'SUP-0007', legalName: 'PT Adijaya Machinery', brandName: 'Adijaya',
    categories: ['CLEANING_MACHINE', 'SPAREPART'],
    picName: 'Christian Halim', picPhone: '+62 811 9900 3344', picEmail: 'sales@adijaya.co.id',
    address: 'Jl. Panjang Arteri No. 100', city: 'Jakarta Barat', province: 'DKI Jakarta',
    npwp: '01.334.667.8-036.000', paymentTermDays: 45, leadTimeDays: 45, minOrderValue: 25_000_000,
    bankName: 'Bank Mandiri', bankAccount: '119-00-2233445-6',
    rating: 4.5, onTimeRate: 89, status: 'ACTIVE', supplierSince: iso(-1600),
    notes: 'Mesin bergaransi 12 bulan; servis berkala termasuk untuk tahun pertama.',
  },
  {
    id: 'sup_nusa', code: 'SUP-0008', legalName: 'PT Nusa Kantor Sejahtera', brandName: 'Nusa Kantor',
    categories: ['OFFICE_SUPPLY'],
    picName: 'Melati Anggraini', picPhone: '+62 813 2200 9911', picEmail: 'order@nusakantor.co.id',
    address: 'Jl. Percetakan Negara No. 62', city: 'Jakarta Pusat', province: 'DKI Jakarta',
    npwp: '01.667.442.2-024.000', paymentTermDays: 14, leadTimeDays: 5,
    bankName: 'BCA', bankAccount: '229-4455667',
    rating: 4.8, onTimeRate: 97, status: 'ACTIVE', supplierSince: iso(-800),
    notes: 'Pemasok ATK seluruh divisi. Pengiriman gratis untuk order di atas Rp 2 juta.',
  },
  {
    id: 'sup_trisula', code: 'SUP-0009', legalName: 'CV Trisula Konveksi', brandName: 'Trisula',
    categories: ['UNIFORM'],
    picName: 'Joko Prabowo', picPhone: '+62 856 1122 3344', picEmail: 'trisula.konveksi@gmail.com',
    address: 'Jl. Cigondewah Raya No. 210', city: 'Bandung', province: 'Jawa Barat',
    paymentTermDays: 30, leadTimeDays: 28,
    rating: 3.4, onTimeRate: 72, status: 'ON_HOLD', supplierSince: iso(-620),
    notes: 'Ditahan sejak dua pengiriman terlambat berturut-turut. Hanya untuk pembanding harga.',
  },
  {
    id: 'sup_prima', code: 'SUP-0010', legalName: 'PT Higienis Prima Sentosa', brandName: 'Higienis Prima',
    categories: ['CLEANING_CHEMICAL', 'CONSUMABLE'],
    picName: 'Yulia Permata', picPhone: '+62 821 7788 1122',
    address: 'Jl. Raya Serpong Km. 8', city: 'Tangerang Selatan', province: 'Banten',
    paymentTermDays: 30, leadTimeDays: 14,
    rating: 2.6, onTimeRate: 58, status: 'BLACKLISTED', supplierSince: iso(-1100),
    notes: 'Dihentikan setelah dua batch disinfektan tidak sesuai spesifikasi pada audit QHSE.',
  },
]

/* ------------------------------------------------------------------
   Price history.

   Written as [supplier, SKU, months ago, unit price, quantity] so the drift
   over time is visible: the most recent row for a pair is what the purchase
   request shows when that supplier is assigned.
   ------------------------------------------------------------------ */

const bySku = new Map(items.map((i) => [i.sku, i.id]))
let seq = 0

function price(supplierId: string, sku: string, monthsAgo: number, unitPrice: number, qty: number, note?: string): PurchasePrice {
  const itemId = bySku.get(sku)
  if (!itemId) throw new Error(`Unknown SKU in price history: ${sku}`)
  seq += 1
  const year = new Date().getFullYear()
  return {
    id: `pp_${String(seq).padStart(3, '0')}`,
    supplierId,
    itemId,
    unitPrice,
    qty,
    poNumber: `PO-${year}-${String(400 + seq).padStart(4, '0')}`,
    purchasedAt: iso(-Math.round(monthsAgo * 30.4)),
    note,
  }
}

export const purchasePrices: PurchasePrice[] = [
  /* ---- uniform: Sandang Mandiri, with Trisula as the cheaper but slower option ---- */
  price('sup_sandang', 'ITM-UNI-0001', 14, 362_000, 240),
  price('sup_sandang', 'ITM-UNI-0001', 7, 375_000, 300),
  price('sup_sandang', 'ITM-UNI-0001', 2, 385_000, 240, 'Kenaikan bahan dasar 3%.'),
  price('sup_sandang', 'ITM-UNI-0002', 15, 418_000, 320),
  price('sup_sandang', 'ITM-UNI-0002', 8, 432_000, 400),
  price('sup_sandang', 'ITM-UNI-0002', 3, 448_000, 320, 'Termasuk bordir atribut proyek baru.'),
  price('sup_sandang', 'ITM-UNI-0004', 9, 82_000, 200),
  price('sup_sandang', 'ITM-UNI-0011', 18, 149_000, 120, 'Pembelian pertama; jahitan bocor, pindah ke Trisula.'),
  price('sup_sandang', 'ITM-UNI-0004', 3, 86_500, 200),
  price('sup_sandang', 'ITM-UNI-0005', 10, 158_000, 160),
  price('sup_sandang', 'ITM-UNI-0005', 4, 166_000, 160),
  price('sup_sandang', 'ITM-UNI-0006', 12, 272_000, 360),
  price('sup_sandang', 'ITM-UNI-0006', 5, 281_000, 360),
  price('sup_sandang', 'ITM-UNI-0006', 1, 288_000, 240),
  price('sup_sandang', 'ITM-UNI-0008', 6, 258_000, 140),
  price('sup_sandang', 'ITM-UNI-0009', 8, 388_000, 70),
  price('sup_sandang', 'ITM-UNI-0012', 4, 34_000, 500),
  price('sup_sandang', 'ITM-UNI-0013', 7, 298_000, 60),
  price('sup_trisula', 'ITM-UNI-0002', 11, 406_000, 200, 'Harga lebih murah, terlambat 12 hari.'),
  price('sup_trisula', 'ITM-UNI-0006', 9, 265_000, 240, 'Terlambat 9 hari; menjadi dasar penahanan supplier.'),
  price('sup_trisula', 'ITM-UNI-0011', 13, 138_000, 150),
  price('sup_trisula', 'ITM-UNI-0011', 4, 142_500, 200, 'Musim hujan; dipesan lebih awal untuk pos luar.'),

  /* ---- alas kaki dan APD ---- */
  price('sup_bumi', 'ITM-UNI-0003', 13, 398_000, 160),
  price('sup_bumi', 'ITM-UNI-0003', 6, 412_000, 160),
  price('sup_bumi', 'ITM-UNI-0007', 10, 236_000, 240),
  price('sup_bumi', 'ITM-UNI-0007', 4, 244_000, 240),
  price('sup_bumi', 'ITM-UNI-0010', 8, 342_000, 120),
  price('sup_bumi', 'ITM-PPE-0003', 9, 124_000, 140),
  price('sup_bumi', 'ITM-PPE-0004', 7, 92_000, 100),
  price('sup_bumi', 'ITM-PPE-0005', 5, 66_000, 200),
  price('sup_bumi', 'ITM-PPE-0006', 6, 52_500, 100),
  price('sup_bumi', 'ITM-PPE-0007', 12, 1_780_000, 12),
  price('sup_bumi', 'ITM-PPE-0007', 3, 1_845_000, 8, 'Termasuk sertifikat uji dan inspeksi awal.'),
  price('sup_bumi', 'ITM-TOL-0007', 7, 74_000, 100),
  price('sup_mitra', 'ITM-PPE-0001', 8, 17_800, 1_200),
  price('sup_mitra', 'ITM-PPE-0001', 2, 18_400, 1_200),
  price('sup_mitra', 'ITM-PPE-0002', 10, 40_500, 300),
  price('sup_mitra', 'ITM-PPE-0002', 4, 41_800, 300),

  /* ---- chemical ---- */
  price('sup_kimia', 'ITM-CHM-0001', 12, 112_000, 240),
  price('sup_kimia', 'ITM-CHM-0001', 6, 115_500, 240),
  price('sup_kimia', 'ITM-CHM-0001', 1, 118_000, 240),
  price('sup_kimia', 'ITM-CHM-0002', 9, 36_500, 300),
  price('sup_kimia', 'ITM-CHM-0002', 3, 37_800, 300),
  price('sup_kimia', 'ITM-CHM-0003', 8, 42_500, 320),
  price('sup_kimia', 'ITM-CHM-0003', 2, 43_800, 320),
  price('sup_kimia', 'ITM-CHM-0004', 7, 158_000, 200),
  price('sup_kimia', 'ITM-CHM-0004', 2, 164_000, 200),
  price('sup_kimia', 'ITM-CHM-0005', 5, 93_500, 240),
  price('sup_kimia', 'ITM-CHM-0006', 6, 278_000, 80),
  price('sup_kimia', 'ITM-CHM-0007', 9, 168_000, 90),
  price('sup_kimia', 'ITM-CHM-0008', 4, 60_500, 220),
  price('sup_prima', 'ITM-CHM-0004', 14, 149_000, 200, 'Batch tidak sesuai spesifikasi; supplier diblacklist.'),
  price('sup_prima', 'ITM-CNS-0001', 13, 27_200, 1_600),

  /* ---- tools, machines, spare parts ---- */
  price('sup_sinar', 'ITM-TOL-0001', 11, 168_000, 160),
  price('sup_sinar', 'ITM-TOL-0001', 4, 174_000, 160),
  price('sup_sinar', 'ITM-TOL-0002', 8, 88_000, 200),
  price('sup_sinar', 'ITM-TOL-0002', 2, 91_500, 200),
  price('sup_sinar', 'ITM-TOL-0003', 7, 114_000, 80),
  price('sup_sinar', 'ITM-TOL-0004', 9, 65_000, 120),
  price('sup_sinar', 'ITM-TOL-0005', 10, 2_380_000, 16),
  price('sup_sinar', 'ITM-TOL-0006', 6, 376_000, 60),
  price('sup_sinar', 'ITM-TOL-0008', 5, 43_500, 160),
  price('sup_sinar', 'ITM-CNS-0005', 6, 44_500, 240),
  price('sup_adijaya', 'ITM-MCH-0001', 15, 14_100_000, 4),
  price('sup_adijaya', 'ITM-MCH-0001', 5, 14_450_000, 4),
  price('sup_adijaya', 'ITM-MCH-0002', 9, 6_720_000, 6),
  price('sup_adijaya', 'ITM-MCH-0003', 11, 3_880_000, 4),
  price('sup_adijaya', 'ITM-MCH-0004', 8, 8_050_000, 4),
  price('sup_adijaya', 'ITM-SPR-0001', 7, 160_000, 80),
  price('sup_adijaya', 'ITM-SPR-0001', 2, 164_500, 80),
  price('sup_adijaya', 'ITM-SPR-0002', 6, 279_000, 40),

  /* ---- security equipment ---- */
  price('sup_garda', 'ITM-SEC-0001', 13, 1_580_000, 40),
  price('sup_garda', 'ITM-SEC-0001', 5, 1_635_000, 40),
  price('sup_garda', 'ITM-SEC-0002', 9, 962_000, 24),
  price('sup_garda', 'ITM-SEC-0003', 7, 228_000, 140),
  price('sup_garda', 'ITM-SEC-0003', 2, 233_000, 140),
  price('sup_garda', 'ITM-SEC-0004', 8, 141_000, 120),
  price('sup_garda', 'ITM-SEC-0005', 10, 655_000, 16),
  price('sup_garda', 'ITM-SEC-0006', 4, 40_500, 240),
  price('sup_garda', 'ITM-SEC-0007', 12, 2_395_000, 8),
  price('sup_garda', 'ITM-SPR-0003', 5, 239_000, 60),

  /* ---- consumables and pantry ---- */
  price('sup_mitra', 'ITM-CNS-0001', 8, 27_600, 1_600),
  price('sup_mitra', 'ITM-CNS-0001', 2, 28_300, 1_600),
  price('sup_mitra', 'ITM-CNS-0002', 6, 66_500, 800),
  price('sup_mitra', 'ITM-CNS-0003', 5, 72_500, 600),
  price('sup_mitra', 'ITM-CNS-0004', 7, 50_800, 300),
  price('sup_mitra', 'ITM-CNS-0006', 3, 21_500, 300),
  price('sup_mitra', 'ITM-CNS-0006', 1, 22_000, 300, 'Kenaikan ongkos antar galon.'),
  price('sup_mitra', 'ITM-CNS-0007', 4, 181_000, 120),

  /* ---- office supplies: the ATK every division asks for ---- */
  price('sup_nusa', 'ITM-OFS-0001', 6, 36_500, 160),
  price('sup_nusa', 'ITM-OFS-0002', 5, 53_000, 120),
  price('sup_nusa', 'ITM-OFS-0003', 9, 39_500, 240),
  price('sup_nusa', 'ITM-OFS-0003', 4, 40_800, 240),
  price('sup_nusa', 'ITM-OFS-0003', 1, 41_500, 240, 'Harga naik tipis, stok aman.'),
  price('sup_nusa', 'ITM-OFS-0004', 8, 58_500, 320),
  price('sup_nusa', 'ITM-OFS-0004', 3, 60_800, 320),
  price('sup_nusa', 'ITM-OFS-0004', 1, 61_500, 320),
  price('sup_nusa', 'ITM-OFS-0005', 7, 30_500, 160),
  price('sup_nusa', 'ITM-OFS-0006', 6, 91_000, 120),
  price('sup_nusa', 'ITM-OFS-0006', 2, 93_500, 120),
  price('sup_nusa', 'ITM-OFS-0007', 9, 74_500, 80),
  price('sup_nusa', 'ITM-OFS-0008', 5, 62_000, 100),
  price('sup_nusa', 'ITM-OFS-0009', 4, 92_500, 90),
  price('sup_nusa', 'ITM-OFS-0010', 6, 22_800, 160),
  price('sup_nusa', 'ITM-OFS-0011', 7, 762_000, 30),
  price('sup_nusa', 'ITM-OFS-0011', 2, 778_000, 30, 'Naik mengikuti kurs; ditinjau tiap kuartal.'),
  price('sup_nusa', 'ITM-OFS-0012', 5, 56_000, 60),
]
