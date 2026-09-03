import type {
  InventoryItem, ItemCategory, ServiceType, StockCondition, Uom, Warehouse, WarehouseStock,
} from './types'
import { iso } from './seed-util'

export const warehouses: Warehouse[] = [
  {
    id: 'wh_jkt', code: 'WH-JKT-01', name: 'Gudang Pusat Cakung', type: 'CENTRAL',
    address: 'Jl. Raya Cakung Cilincing Km. 3 No. 18', city: 'Jakarta Timur', province: 'DKI Jakarta',
    managerName: 'Bayu Setiawan', phone: '+62 21 4600 3390', capacitySqm: 2_400, status: 'ACTIVE',
    openedAt: iso(-3200), notes: 'Menerima seluruh pembelian seragam dan chemical, lalu mendistribusikan ke gudang regional.',
  },
  {
    id: 'wh_bks', code: 'WH-BKS-02', name: 'Gudang Regional Bekasi', type: 'REGIONAL',
    address: 'Kawasan Industri MM2100 Blok J-4', city: 'Bekasi', province: 'Jawa Barat',
    managerName: 'Ari Nugraha', phone: '+62 21 8998 4411', capacitySqm: 900, status: 'ACTIVE',
    openedAt: iso(-1400), notes: 'Melayani proyek Bekasi, Cikarang dan Karawang.',
  },
  {
    id: 'wh_bdg', code: 'WH-BDG-03', name: 'Gudang Regional Bandung', type: 'REGIONAL',
    address: 'Jl. Soekarno Hatta No. 512', city: 'Bandung', province: 'Jawa Barat',
    managerName: 'Asep Kurnia', phone: '+62 22 7530 220', capacitySqm: 620, status: 'ACTIVE',
    openedAt: iso(-980),
  },
  {
    id: 'wh_sby', code: 'WH-SBY-04', name: 'Gudang Regional Surabaya', type: 'REGIONAL',
    address: 'Jl. Rungkut Industri III No. 27', city: 'Surabaya', province: 'Jawa Timur',
    managerName: 'Eko Prasetyo', phone: '+62 31 8430 990', capacitySqm: 780, status: 'ACTIVE',
    openedAt: iso(-820),
  },
  {
    id: 'wh_site_cpi', code: 'WH-SITE-05', name: 'Site Store Menara Cakrawala', type: 'SITE',
    address: 'Menara Cakrawala Basement 2, Jl. TB Simatupang No. 88', city: 'Jakarta Selatan', province: 'DKI Jakarta',
    managerName: 'Hendra Kurniawan', phone: '+62 811 1234 8899', capacitySqm: 85, status: 'ACTIVE',
    openedAt: iso(-1300), notes: 'Stok harian di dalam gedung klien. Diisi ulang dua minggu sekali dari Cakung.',
  },
  {
    id: 'wh_bpn', code: 'WH-BPN-06', name: 'Gudang Regional Balikpapan', type: 'REGIONAL',
    address: 'Jl. MT Haryono No. 88', city: 'Balikpapan', province: 'Kalimantan Timur',
    managerName: 'Andi Saputra', phone: '+62 542 7311 400', capacitySqm: 340, status: 'INACTIVE',
    openedAt: iso(-60), notes: 'Disiapkan untuk proyek Khatulistiwa; belum aktif sampai kontrak disetujui.',
  },
]

/* ------------------------------------------------------------------
   Master data inventory. One record per thing the company buys — the
   definition only. How many there are, and where, lives in warehouse
   inventory below.
   ------------------------------------------------------------------ */

const ADMIN = 'Bayu Setiawan'

function item(
  sku: string,
  name: string,
  category: ItemCategory,
  uom: Uom,
  standardCost: number,
  levels: [min: number, max: number, reorderPoint: number, reorderQty: number],
  serviceTypes: ServiceType[],
  extra: Partial<InventoryItem> = {},
): InventoryItem {
  const [minStock, maxStock, reorderPoint, reorderQty] = levels
  return {
    id: `itm_${sku.slice(4).toLowerCase().replace('-', '_')}`,
    sku, name, category, uom, standardCost,
    minStock, maxStock, reorderPoint, reorderQty,
    trackBatch: false, hasExpiry: false, hazardous: false,
    leadTimeDays: 14, serviceTypes, status: 'ACTIVE',
    createdAt: iso(-900), updatedAt: iso(-30), updatedBy: ADMIN,
    ...extra,
  }
}

const OFS: ServiceType[] = ['OFFICE_SUPPORT']
const SEC: ServiceType[] = ['SECURITY']
const CLN: ServiceType[] = ['CLEANING']
const ALL: ServiceType[] = ['SECURITY', 'CLEANING', 'OFFICE_SUPPORT', 'DRIVER', 'PARKING', 'GARDENING', 'RECEPTIONIST', 'TECHNICIAN', 'PEST_CONTROL']

export const items: InventoryItem[] = [
  /* ---------- uniform ---------- */
  item('ITM-UNI-0001', 'Seragam Security PDH Lengan Pendek', 'UNIFORM', 'SET', 385_000, [60, 600, 120, 240], SEC, {
    subCategory: 'Seragam Security', brand: 'Sandang Mandiri', variant: 'Biru tua, S–XXL',
    description: 'Pakaian Dinas Harian lengkap dengan atribut dada dan lengan.',
    defaultSupplier: 'CV Sandang Mandiri', leadTimeDays: 21, barcode: '8991002110011',
  }),
  item('ITM-UNI-0002', 'Seragam Security PDL Lengan Panjang', 'UNIFORM', 'SET', 445_000, [80, 800, 160, 320], SEC, {
    subCategory: 'Seragam Security', brand: 'Sandang Mandiri', variant: 'Biru tua, S–XXL',
    description: 'Pakaian Dinas Lapangan untuk pos luar dan patroli.',
    defaultSupplier: 'CV Sandang Mandiri', leadTimeDays: 21, barcode: '8991002110028',
  }),
  item('ITM-UNI-0003', 'Sepatu PDL Security', 'UNIFORM', 'PAIR', 415_000, [40, 400, 80, 160], SEC, {
    subCategory: 'Alas Kaki', brand: 'Garda Perkasa', variant: 'Hitam, 38–45',
    defaultSupplier: 'CV Garda Perkasa Equipment', leadTimeDays: 28,
  }),
  item('ITM-UNI-0004', 'Topi / Baret Security', 'UNIFORM', 'PCS', 85_000, [50, 500, 100, 200], SEC, {
    subCategory: 'Atribut', defaultSupplier: 'CV Sandang Mandiri',
  }),
  item('ITM-UNI-0005', 'Kopel Rim & Sabuk Security', 'UNIFORM', 'SET', 165_000, [40, 400, 80, 160], SEC, {
    subCategory: 'Atribut', defaultSupplier: 'CV Sandang Mandiri',
  }),
  item('ITM-UNI-0006', 'Seragam Cleaning Service', 'UNIFORM', 'SET', 285_000, [100, 900, 180, 360], CLN, {
    subCategory: 'Seragam Cleaning', brand: 'Sandang Mandiri', variant: 'Hijau tosca, S–XXL',
    defaultSupplier: 'CV Sandang Mandiri', leadTimeDays: 21, barcode: '8991002110066',
  }),
  item('ITM-UNI-0007', 'Sepatu Kerja Anti Slip', 'UNIFORM', 'PAIR', 245_000, [60, 500, 120, 240], ['CLEANING', 'OFFICE_SUPPORT'], {
    subCategory: 'Alas Kaki', brand: 'Bumi Safety', variant: 'Hitam, 36–45',
    defaultSupplier: 'CV Bumi Safety Utama', leadTimeDays: 21,
  }),
  item('ITM-UNI-0008', 'Seragam Office Boy / Girl', 'UNIFORM', 'SET', 265_000, [40, 300, 70, 140], ['OFFICE_SUPPORT'], {
    subCategory: 'Seragam Support', defaultSupplier: 'CV Sandang Mandiri',
  }),
  item('ITM-UNI-0009', 'Seragam Resepsionis', 'UNIFORM', 'SET', 395_000, [20, 150, 35, 70], ['RECEPTIONIST'], {
    subCategory: 'Seragam Support', defaultSupplier: 'CV Sandang Mandiri', leadTimeDays: 28,
  }),
  item('ITM-UNI-0010', 'Wearpack Teknisi / Lapangan', 'UNIFORM', 'SET', 355_000, [30, 250, 60, 120], ['TECHNICIAN', 'GARDENING', 'PEST_CONTROL', 'CLEANING'], {
    subCategory: 'Seragam Support', defaultSupplier: 'CV Bumi Safety Utama',
  }),
  item('ITM-UNI-0011', 'Jas Hujan Security', 'UNIFORM', 'SET', 145_000, [40, 300, 70, 140], ['SECURITY', 'PARKING'], {
    subCategory: 'Atribut', defaultSupplier: 'CV Garda Perkasa Equipment',
  }),
  item('ITM-UNI-0012', 'Name Tag & ID Card Holder', 'UNIFORM', 'SET', 35_000, [150, 1_200, 250, 500], ALL, {
    subCategory: 'Atribut', defaultSupplier: 'CV Sandang Mandiri', leadTimeDays: 7,
  }),
  item('ITM-UNI-0013', 'Seragam Driver', 'UNIFORM', 'SET', 305_000, [15, 120, 30, 60], ['DRIVER'], {
    subCategory: 'Seragam Support', defaultSupplier: 'CV Sandang Mandiri',
  }),

  /* ---------- PPE ---------- */
  item('ITM-PPE-0001', 'Sarung Tangan Karet', 'PPE', 'PAIR', 18_500, [300, 2_500, 600, 1_200], ['CLEANING', 'GARDENING', 'PEST_CONTROL', 'OFFICE_SUPPORT'], {
    subCategory: 'Pelindung Tangan', brand: 'Higienis', defaultSupplier: 'PT Mitra Higienis Indonesia', leadTimeDays: 7,
  }),
  item('ITM-PPE-0002', 'Masker Medis 3 Ply (isi 50)', 'PPE', 'BOX', 42_000, [80, 600, 150, 300], ['CLEANING', 'PEST_CONTROL'], {
    subCategory: 'Pelindung Pernapasan', hasExpiry: true, shelfLifeDays: 1_095, trackBatch: true,
    defaultSupplier: 'PT Mitra Higienis Indonesia', leadTimeDays: 7,
  }),
  item('ITM-PPE-0003', 'Sepatu Boot Karet', 'PPE', 'PAIR', 128_000, [40, 300, 70, 140], ['CLEANING', 'GARDENING'], {
    subCategory: 'Alas Kaki', defaultSupplier: 'CV Bumi Safety Utama',
  }),
  item('ITM-PPE-0004', 'Helm Safety', 'PPE', 'PCS', 95_000, [30, 200, 50, 100], ['TECHNICIAN', 'CLEANING'], {
    subCategory: 'Pelindung Kepala', defaultSupplier: 'CV Bumi Safety Utama',
  }),
  item('ITM-PPE-0005', 'Rompi Reflektif', 'PPE', 'PCS', 68_000, [50, 400, 100, 200], ['PARKING', 'SECURITY', 'TECHNICIAN'], {
    subCategory: 'Pakaian Pelindung', defaultSupplier: 'CV Bumi Safety Utama',
  }),
  item('ITM-PPE-0006', 'Kacamata Safety', 'PPE', 'PCS', 54_000, [30, 200, 50, 100], ['TECHNICIAN', 'CLEANING'], {
    subCategory: 'Pelindung Mata', defaultSupplier: 'CV Bumi Safety Utama',
  }),
  item('ITM-PPE-0007', 'Full Body Harness Gondola', 'PPE', 'UNIT', 1_850_000, [6, 30, 10, 12], CLN, {
    subCategory: 'Pelindung Jatuh', brand: 'Bumi Safety', hazardous: false, trackBatch: true,
    description: 'Wajib inspeksi enam bulanan; unit yang gagal inspeksi masuk karantina.',
    defaultSupplier: 'CV Bumi Safety Utama', leadTimeDays: 45,
  }),

  /* ---------- cleaning chemical ---------- */
  item('ITM-CHM-0001', 'Floor Cleaner Konsentrat 5L', 'CLEANING_CHEMICAL', 'BOTTLE', 118_000, [60, 500, 120, 240], CLN, {
    subCategory: 'Pembersih Lantai', brand: 'Kimia Bersih', hasExpiry: true, shelfLifeDays: 730, trackBatch: true,
    hazardous: true, defaultSupplier: 'PT Kimia Bersih Nusantara', leadTimeDays: 10,
  }),
  item('ITM-CHM-0002', 'Glass Cleaner 1L', 'CLEANING_CHEMICAL', 'BOTTLE', 38_000, [80, 600, 150, 300], CLN, {
    subCategory: 'Pembersih Kaca', brand: 'Kimia Bersih', hasExpiry: true, shelfLifeDays: 730, trackBatch: true,
    defaultSupplier: 'PT Kimia Bersih Nusantara', leadTimeDays: 10,
  }),
  item('ITM-CHM-0003', 'Toilet Bowl Cleaner 1L', 'CLEANING_CHEMICAL', 'BOTTLE', 44_000, [80, 700, 160, 320], CLN, {
    subCategory: 'Pembersih Toilet', brand: 'Kimia Bersih', hasExpiry: true, shelfLifeDays: 730, trackBatch: true,
    hazardous: true, defaultSupplier: 'PT Kimia Bersih Nusantara', leadTimeDays: 10,
  }),
  item('ITM-CHM-0004', 'Disinfektan Multi Surface 5L', 'CLEANING_CHEMICAL', 'BOTTLE', 165_000, [50, 400, 100, 200], CLN, {
    subCategory: 'Disinfektan', brand: 'Kimia Bersih', hasExpiry: true, shelfLifeDays: 545, trackBatch: true,
    hazardous: true, defaultSupplier: 'PT Kimia Bersih Nusantara', leadTimeDays: 10,
  }),
  item('ITM-CHM-0005', 'Hand Soap Refill 5L', 'CLEANING_CHEMICAL', 'BOTTLE', 96_000, [60, 500, 120, 240], CLN, {
    subCategory: 'Sabun Tangan', hasExpiry: true, shelfLifeDays: 730, trackBatch: true,
    defaultSupplier: 'PT Kimia Bersih Nusantara', leadTimeDays: 10,
  }),
  item('ITM-CHM-0006', 'Marble Polish 5L', 'CLEANING_CHEMICAL', 'BOTTLE', 285_000, [20, 150, 40, 80], CLN, {
    subCategory: 'Perawatan Lantai', hasExpiry: true, shelfLifeDays: 730, trackBatch: true, hazardous: true,
    defaultSupplier: 'PT Kimia Bersih Nusantara', leadTimeDays: 14,
  }),
  item('ITM-CHM-0007', 'Degreaser Dapur 5L', 'CLEANING_CHEMICAL', 'BOTTLE', 175_000, [25, 180, 45, 90], CLN, {
    subCategory: 'Pembersih Dapur', hasExpiry: true, shelfLifeDays: 545, trackBatch: true, hazardous: true,
    defaultSupplier: 'PT Kimia Bersih Nusantara', leadTimeDays: 14,
  }),
  item('ITM-CHM-0008', 'Pengharum Ruangan Refill 1L', 'CLEANING_CHEMICAL', 'BOTTLE', 62_000, [60, 480, 110, 220], CLN, {
    subCategory: 'Pengharum', hasExpiry: true, shelfLifeDays: 730, trackBatch: true,
    defaultSupplier: 'PT Kimia Bersih Nusantara', leadTimeDays: 10,
  }),

  /* ---------- cleaning tools ---------- */
  item('ITM-TOL-0001', 'Mop Set Lengkap', 'CLEANING_TOOL', 'SET', 175_000, [40, 350, 80, 160], CLN, {
    subCategory: 'Alat Pel', defaultSupplier: 'PT Sinar Alat Teknik',
  }),
  item('ITM-TOL-0002', 'Kain Microfiber (isi 12)', 'CLEANING_TOOL', 'PACK', 92_000, [50, 400, 100, 200], CLN, {
    subCategory: 'Lap & Kain', defaultSupplier: 'PT Sinar Alat Teknik', leadTimeDays: 7,
  }),
  item('ITM-TOL-0003', 'Wiper Kaca 45 cm', 'CLEANING_TOOL', 'PCS', 118_000, [20, 160, 40, 80], CLN, {
    subCategory: 'Alat Kaca', defaultSupplier: 'PT Sinar Alat Teknik',
  }),
  item('ITM-TOL-0004', 'Sikat Lantai Bertangkai', 'CLEANING_TOOL', 'PCS', 68_000, [30, 240, 60, 120], CLN, {
    subCategory: 'Sikat', defaultSupplier: 'PT Sinar Alat Teknik',
  }),
  item('ITM-TOL-0005', 'Trolley Cleaning Service', 'CLEANING_TOOL', 'UNIT', 2_450_000, [8, 60, 12, 16], CLN, {
    subCategory: 'Trolley', defaultSupplier: 'PT Sinar Alat Teknik', leadTimeDays: 30,
  }),
  item('ITM-TOL-0006', 'Ember Pel Ganda 20L', 'CLEANING_TOOL', 'UNIT', 385_000, [15, 120, 30, 60], CLN, {
    subCategory: 'Ember', defaultSupplier: 'PT Sinar Alat Teknik',
  }),
  item('ITM-TOL-0007', 'Safety Cone "Lantai Licin"', 'CLEANING_TOOL', 'PCS', 78_000, [30, 200, 50, 100], CLN, {
    subCategory: 'Rambu', defaultSupplier: 'CV Bumi Safety Utama',
  }),
  item('ITM-TOL-0008', 'Sapu Lidi & Serok', 'CLEANING_TOOL', 'SET', 45_000, [40, 300, 80, 160], ['CLEANING', 'GARDENING'], {
    subCategory: 'Sapu', defaultSupplier: 'PT Sinar Alat Teknik', leadTimeDays: 7,
  }),

  /* ---------- cleaning machines ---------- */
  item('ITM-MCH-0001', 'Mesin Poles Lantai 17"', 'CLEANING_MACHINE', 'UNIT', 14_500_000, [3, 24, 5, 4], CLN, {
    subCategory: 'Mesin Lantai', brand: 'Adijaya', defaultSupplier: 'PT Adijaya Machinery', leadTimeDays: 45,
    description: 'Servis berkala tiap 400 jam operasi. Pad diganti terpisah.',
  }),
  item('ITM-MCH-0002', 'Vacuum Wet & Dry 30L', 'CLEANING_MACHINE', 'UNIT', 6_850_000, [4, 30, 6, 6], CLN, {
    subCategory: 'Vacuum', brand: 'Adijaya', defaultSupplier: 'PT Adijaya Machinery', leadTimeDays: 30,
  }),
  item('ITM-MCH-0003', 'Blower Pengering Karpet', 'CLEANING_MACHINE', 'UNIT', 3_950_000, [3, 20, 5, 4], CLN, {
    subCategory: 'Blower', defaultSupplier: 'PT Adijaya Machinery', leadTimeDays: 30,
  }),
  item('ITM-MCH-0004', 'High Pressure Cleaner 120 bar', 'CLEANING_MACHINE', 'UNIT', 8_200_000, [2, 16, 4, 4], CLN, {
    subCategory: 'Jet Cleaner', defaultSupplier: 'PT Adijaya Machinery', leadTimeDays: 45,
  }),

  /* ---------- security equipment ---------- */
  item('ITM-SEC-0001', 'Handy Talky VHF', 'SECURITY_EQUIPMENT', 'UNIT', 1_650_000, [20, 160, 35, 40], SEC, {
    subCategory: 'Komunikasi', brand: 'Garda Perkasa', defaultSupplier: 'CV Garda Perkasa Equipment', leadTimeDays: 30,
    description: 'Izin frekuensi mengikuti izin gedung klien; nomor seri dicatat saat serah terima.',
  }),
  item('ITM-SEC-0002', 'Metal Detector Genggam', 'SECURITY_EQUIPMENT', 'UNIT', 985_000, [10, 80, 20, 24], SEC, {
    subCategory: 'Pemeriksaan', defaultSupplier: 'CV Garda Perkasa Equipment', leadTimeDays: 30,
  }),
  item('ITM-SEC-0003', 'Senter LED Isi Ulang', 'SECURITY_EQUIPMENT', 'UNIT', 235_000, [40, 320, 70, 140], SEC, {
    subCategory: 'Penerangan', defaultSupplier: 'CV Garda Perkasa Equipment',
  }),
  item('ITM-SEC-0004', 'Tongkat Patroli', 'SECURITY_EQUIPMENT', 'PCS', 145_000, [30, 240, 60, 120], SEC, {
    subCategory: 'Perlengkapan Pos', defaultSupplier: 'CV Garda Perkasa Equipment',
  }),
  item('ITM-SEC-0005', 'Cermin Pemeriksa Kolong Kendaraan', 'SECURITY_EQUIPMENT', 'UNIT', 675_000, [8, 60, 15, 16], SEC, {
    subCategory: 'Pemeriksaan', defaultSupplier: 'CV Garda Perkasa Equipment', leadTimeDays: 30,
  }),
  item('ITM-SEC-0006', 'Buku Mutasi & Log Patroli', 'SECURITY_EQUIPMENT', 'PCS', 42_000, [60, 500, 120, 240], SEC, {
    subCategory: 'Administrasi Pos', defaultSupplier: 'CV Garda Perkasa Equipment', leadTimeDays: 7,
  }),
  item('ITM-SEC-0007', 'Guard Tour Patrol Recorder', 'SECURITY_EQUIPMENT', 'UNIT', 2_450_000, [4, 30, 8, 8], SEC, {
    subCategory: 'Patroli', defaultSupplier: 'CV Garda Perkasa Equipment', leadTimeDays: 45,
  }),

  /* ---------- consumables ---------- */
  item('ITM-CNS-0001', 'Tisu Toilet Jumbo Roll', 'CONSUMABLE', 'ROLL', 28_500, [400, 3_000, 800, 1_600], CLN, {
    subCategory: 'Tisu', defaultSupplier: 'PT Mitra Higienis Indonesia', leadTimeDays: 7,
  }),
  item('ITM-CNS-0002', 'Kantong Sampah 90×120 (isi 25)', 'CONSUMABLE', 'PACK', 68_000, [200, 1_600, 400, 800], CLN, {
    subCategory: 'Kantong Sampah', defaultSupplier: 'PT Mitra Higienis Indonesia', leadTimeDays: 7,
  }),
  item('ITM-CNS-0003', 'Tisu Tangan Interfold (isi 20)', 'CONSUMABLE', 'PACK', 74_000, [150, 1_200, 300, 600], CLN, {
    subCategory: 'Tisu', defaultSupplier: 'PT Mitra Higienis Indonesia', leadTimeDays: 7,
  }),
  item('ITM-CNS-0004', 'Kamper Toilet (isi 50)', 'CONSUMABLE', 'PACK', 52_000, [80, 600, 150, 300], CLN, {
    subCategory: 'Pengharum', hasExpiry: true, shelfLifeDays: 545, trackBatch: true,
    defaultSupplier: 'PT Mitra Higienis Indonesia',
  }),
  item('ITM-CNS-0005', 'Baterai AA Alkaline (isi 10)', 'CONSUMABLE', 'PACK', 46_000, [60, 400, 120, 240], ['SECURITY', 'TECHNICIAN'], {
    subCategory: 'Baterai', hasExpiry: true, shelfLifeDays: 1_460, trackBatch: true,
    defaultSupplier: 'PT Sinar Alat Teknik', leadTimeDays: 7,
  }),

  /* ---------- office supply ---------- */
  item('ITM-OFS-0001', 'Buku Tamu', 'OFFICE_SUPPLY', 'PCS', 38_000, [40, 300, 80, 160], ['RECEPTIONIST', 'SECURITY'], {
    subCategory: 'Administrasi', defaultSupplier: 'PT Sinar Alat Teknik', leadTimeDays: 7,
  }),
  item('ITM-OFS-0002', 'Formulir Checklist Kebersihan (isi 100)', 'OFFICE_SUPPLY', 'PACK', 55_000, [30, 240, 60, 120], CLN, {
    subCategory: 'Administrasi', defaultSupplier: 'PT Sinar Alat Teknik', leadTimeDays: 7,
  }),

  item('ITM-OFS-0003', 'Bolpoint Standar Hitam (isi 12)', 'OFFICE_SUPPLY', 'PACK', 42_000, [60, 480, 120, 240], OFS, {
    subCategory: 'Alat Tulis', brand: 'Nusa Kantor', defaultSupplier: 'PT Nusa Kantor Sejahtera', leadTimeDays: 5,
    description: 'Dipakai seluruh divisi; permintaan paling sering muncul di sesi MR bulanan.',
  }),
  item('ITM-OFS-0004', 'Kertas HVS A4 80gr (rim)', 'OFFICE_SUPPLY', 'PACK', 62_000, [80, 700, 160, 320], OFS, {
    subCategory: 'Kertas', brand: 'Nusa Kantor', defaultSupplier: 'PT Nusa Kantor Sejahtera', leadTimeDays: 5,
  }),
  item('ITM-OFS-0005', 'Map Ordner Folio', 'OFFICE_SUPPLY', 'PCS', 32_000, [40, 320, 80, 160], OFS, {
    subCategory: 'Arsip', defaultSupplier: 'PT Nusa Kantor Sejahtera', leadTimeDays: 7,
  }),
  item('ITM-OFS-0006', 'Tinta Printer Refill Hitam', 'OFFICE_SUPPLY', 'BOTTLE', 95_000, [30, 220, 60, 120], OFS, {
    subCategory: 'Printer', defaultSupplier: 'PT Nusa Kantor Sejahtera', leadTimeDays: 7,
  }),
  item('ITM-OFS-0007', 'Stapler Besar & Isi Staples', 'OFFICE_SUPPLY', 'SET', 78_000, [20, 160, 40, 80], OFS, {
    subCategory: 'Alat Tulis', defaultSupplier: 'PT Nusa Kantor Sejahtera', leadTimeDays: 7,
  }),
  item('ITM-OFS-0008', 'Amplop Kop Perusahaan (isi 100)', 'OFFICE_SUPPLY', 'PACK', 65_000, [25, 200, 50, 100], OFS, {
    subCategory: 'Cetakan', defaultSupplier: 'PT Nusa Kantor Sejahtera', leadTimeDays: 14,
  }),
  item('ITM-OFS-0009', 'Spidol Whiteboard (isi 12)', 'OFFICE_SUPPLY', 'PACK', 96_000, [20, 180, 45, 90], OFS, {
    subCategory: 'Alat Tulis', defaultSupplier: 'PT Nusa Kantor Sejahtera', leadTimeDays: 5,
  }),
  item('ITM-OFS-0010', 'Buku Nota Serah Terima', 'OFFICE_SUPPLY', 'PCS', 24_000, [40, 320, 80, 160], ['OFFICE_SUPPORT', 'SECURITY'], {
    subCategory: 'Administrasi', defaultSupplier: 'PT Nusa Kantor Sejahtera', leadTimeDays: 7,
  }),
  item('ITM-OFS-0011', 'Toner Cartridge Printer Laser', 'OFFICE_SUPPLY', 'UNIT', 785_000, [10, 80, 20, 30], OFS, {
    subCategory: 'Printer', defaultSupplier: 'PT Nusa Kantor Sejahtera', leadTimeDays: 14,
    description: 'Harga per unit tinggi; selalu dinegosiasi ulang saat perakapan PR.',
  }),
  item('ITM-OFS-0012', 'Label Barcode Aset (isi 100)', 'OFFICE_SUPPLY', 'PACK', 58_000, [15, 120, 30, 60], OFS, {
    subCategory: 'Administrasi', defaultSupplier: 'PT Nusa Kantor Sejahtera', leadTimeDays: 14,
  }),
  item('ITM-CNS-0006', 'Air Minum Galon 19L', 'CONSUMABLE', 'UNIT', 22_000, [80, 600, 150, 300], ['OFFICE_SUPPORT', 'CLEANING'], {
    subCategory: 'Pantry', defaultSupplier: 'PT Mitra Higienis Indonesia', leadTimeDays: 3,
  }),
  item('ITM-CNS-0007', 'Paket Kopi & Teh Pantry', 'CONSUMABLE', 'PACK', 185_000, [30, 240, 60, 120], ['OFFICE_SUPPORT'], {
    subCategory: 'Pantry', defaultSupplier: 'PT Mitra Higienis Indonesia', leadTimeDays: 5,
  }),

  /* ---------- spare parts ---------- */
  item('ITM-SPR-0001', 'Pad Mesin Poles 17"', 'SPAREPART', 'PCS', 165_000, [20, 160, 40, 80], CLN, {
    subCategory: 'Suku Cadang Mesin', defaultSupplier: 'PT Adijaya Machinery', leadTimeDays: 21,
  }),
  item('ITM-SPR-0002', 'Filter HEPA Vacuum', 'SPAREPART', 'PCS', 285_000, [10, 80, 20, 40], CLN, {
    subCategory: 'Suku Cadang Mesin', defaultSupplier: 'PT Adijaya Machinery', leadTimeDays: 21,
  }),
  item('ITM-SPR-0003', 'Baterai Handy Talky Ni-MH', 'SPAREPART', 'UNIT', 245_000, [15, 120, 30, 60], SEC, {
    subCategory: 'Suku Cadang HT', defaultSupplier: 'CV Garda Perkasa Equipment', leadTimeDays: 21,
  }),
  item('ITM-UNI-0014', 'Seragam Security PDL (model lama)', 'UNIFORM', 'SET', 395_000, [0, 0, 0, 0], SEC, {
    subCategory: 'Seragam Security', status: 'DISCONTINUED',
    description: 'Digantikan ITM-UNI-0002 sejak perubahan atribut 2025. Sisa stok dihabiskan lebih dulu.',
    defaultSupplier: 'CV Sandang Mandiri', updatedAt: iso(-240),
  }),
]

const itemBySku = new Map(items.map((i) => [i.sku, i]))

/* ------------------------------------------------------------------
   Warehouse inventory. One row = one item, in one warehouse, in one
   bin. A warehouse holds many rows; every row points at exactly one
   master item.
   ------------------------------------------------------------------ */

let stockSeq = 0

function stock(
  warehouseId: string,
  sku: string,
  binLocation: string,
  qtyOnHand: number,
  qtyReserved: number,
  extra: Partial<WarehouseStock> = {},
): WarehouseStock {
  const master = itemBySku.get(sku)
  if (!master) throw new Error(`Unknown SKU ${sku}`)
  stockSeq += 1
  return {
    id: `stk_${String(stockSeq).padStart(3, '0')}`,
    warehouseId,
    itemId: master.id,
    binLocation,
    qtyOnHand,
    qtyReserved,
    unitCost: master.standardCost,
    /* Only the central warehouse runs to the company-wide floor; a regional or site
       store keeps its own, smaller level unless the row states otherwise. */
    minStockOverride: warehouseId === 'wh_jkt' ? undefined : Math.max(1, Math.round(master.minStock * 0.3)),
    condition: 'GOOD' as StockCondition,
    lastCountedAt: iso(-34),
    lastMovementAt: iso(-4),
    ...extra,
  }
}

export const warehouseStock: WarehouseStock[] = [
  /* ---------------- Gudang Pusat Cakung ---------------- */
  stock('wh_jkt', 'ITM-UNI-0001', 'RAK-A-01-1', 340, 60),
  stock('wh_jkt', 'ITM-UNI-0002', 'RAK-A-01-2', 512, 180),
  stock('wh_jkt', 'ITM-UNI-0003', 'RAK-A-02-1', 268, 40),
  stock('wh_jkt', 'ITM-UNI-0004', 'RAK-A-02-2', 410, 30),
  stock('wh_jkt', 'ITM-UNI-0005', 'RAK-A-02-3', 296, 25),
  stock('wh_jkt', 'ITM-UNI-0006', 'RAK-A-03-1', 604, 210),
  stock('wh_jkt', 'ITM-UNI-0007', 'RAK-A-03-2', 318, 55),
  stock('wh_jkt', 'ITM-UNI-0008', 'RAK-A-04-1', 142, 20),
  stock('wh_jkt', 'ITM-UNI-0009', 'RAK-A-04-2', 68, 12),
  stock('wh_jkt', 'ITM-UNI-0010', 'RAK-A-04-3', 96, 18),
  stock('wh_jkt', 'ITM-UNI-0011', 'RAK-A-05-1', 184, 10),
  stock('wh_jkt', 'ITM-UNI-0012', 'RAK-A-05-2', 880, 150),
  stock('wh_jkt', 'ITM-UNI-0013', 'RAK-A-05-3', 42, 6),
  stock('wh_jkt', 'ITM-UNI-0014', 'RAK-Z-01-1', 38, 0, { condition: 'QUARANTINE', lastMovementAt: iso(-210) }),
  stock('wh_jkt', 'ITM-PPE-0001', 'RAK-B-01-1', 1_450, 300),
  stock('wh_jkt', 'ITM-PPE-0002', 'RAK-B-01-2', 268, 40, { batchNo: 'MSK-2508', expiryDate: iso(560) }),
  stock('wh_jkt', 'ITM-PPE-0003', 'RAK-B-02-1', 148, 20),
  stock('wh_jkt', 'ITM-PPE-0004', 'RAK-B-02-2', 92, 12),
  stock('wh_jkt', 'ITM-PPE-0005', 'RAK-B-02-3', 216, 40),
  stock('wh_jkt', 'ITM-PPE-0006', 'RAK-B-03-1', 104, 15),
  stock('wh_jkt', 'ITM-PPE-0007', 'RAK-B-03-2', 5, 4, { batchNo: 'HRN-2412', lastCountedAt: iso(-6) }),
  stock('wh_jkt', 'ITM-PPE-0007', 'RAK-Z-01-2', 2, 0, { batchNo: 'HRN-2301', condition: 'QUARANTINE', lastMovementAt: iso(-70) }),
  stock('wh_jkt', 'ITM-CHM-0001', 'RAK-C-01-1', 246, 60, { batchNo: 'FC-2604', expiryDate: iso(430) }),
  stock('wh_jkt', 'ITM-CHM-0002', 'RAK-C-01-2', 318, 50, { batchNo: 'GC-2603', expiryDate: iso(395) }),
  stock('wh_jkt', 'ITM-CHM-0003', 'RAK-C-01-3', 292, 55, { batchNo: 'TB-2602', expiryDate: iso(365) }),
  stock('wh_jkt', 'ITM-CHM-0004', 'RAK-C-02-1', 186, 40, { batchNo: 'DS-2601', expiryDate: iso(288) }),
  stock('wh_jkt', 'ITM-CHM-0005', 'RAK-C-02-2', 212, 45, { batchNo: 'HS-2605', expiryDate: iso(470) }),
  stock('wh_jkt', 'ITM-CHM-0006', 'RAK-C-02-3', 74, 10, { batchNo: 'MP-2512', expiryDate: iso(215) }),
  stock('wh_jkt', 'ITM-CHM-0007', 'RAK-C-03-1', 88, 12, { batchNo: 'DG-2511', expiryDate: iso(44) }),
  stock('wh_jkt', 'ITM-CHM-0008', 'RAK-C-03-2', 196, 30, { batchNo: 'PR-2604', expiryDate: iso(420) }),
  stock('wh_jkt', 'ITM-TOL-0001', 'RAK-D-01-1', 168, 30),
  stock('wh_jkt', 'ITM-TOL-0002', 'RAK-D-01-2', 224, 45),
  stock('wh_jkt', 'ITM-TOL-0003', 'RAK-D-01-3', 86, 12),
  stock('wh_jkt', 'ITM-TOL-0004', 'RAK-D-02-1', 132, 20),
  stock('wh_jkt', 'ITM-TOL-0005', 'RAK-D-02-2', 26, 6),
  stock('wh_jkt', 'ITM-TOL-0006', 'RAK-D-02-3', 64, 10),
  stock('wh_jkt', 'ITM-TOL-0007', 'RAK-D-03-1', 118, 16),
  stock('wh_jkt', 'ITM-TOL-0008', 'RAK-D-03-2', 176, 24),
  stock('wh_jkt', 'ITM-MCH-0001', 'AREA-MESIN-1', 11, 3),
  stock('wh_jkt', 'ITM-MCH-0002', 'AREA-MESIN-2', 14, 4),
  stock('wh_jkt', 'ITM-MCH-0003', 'AREA-MESIN-3', 8, 2),
  stock('wh_jkt', 'ITM-MCH-0004', 'AREA-MESIN-4', 5, 1),
  stock('wh_jkt', 'ITM-SEC-0001', 'RAK-E-01-1', 78, 24),
  stock('wh_jkt', 'ITM-SEC-0002', 'RAK-E-01-2', 34, 8),
  stock('wh_jkt', 'ITM-SEC-0003', 'RAK-E-01-3', 162, 40),
  stock('wh_jkt', 'ITM-SEC-0004', 'RAK-E-02-1', 128, 20),
  stock('wh_jkt', 'ITM-SEC-0005', 'RAK-E-02-2', 22, 4),
  stock('wh_jkt', 'ITM-SEC-0006', 'RAK-E-02-3', 214, 36),
  stock('wh_jkt', 'ITM-SEC-0007', 'RAK-E-03-1', 12, 4),
  stock('wh_jkt', 'ITM-CNS-0001', 'RAK-F-01-1', 1_640, 420),
  stock('wh_jkt', 'ITM-CNS-0002', 'RAK-F-01-2', 880, 240),
  stock('wh_jkt', 'ITM-CNS-0003', 'RAK-F-02-1', 640, 180),
  stock('wh_jkt', 'ITM-CNS-0004', 'RAK-F-02-2', 268, 60, { batchNo: 'KP-2602', expiryDate: iso(310) }),
  stock('wh_jkt', 'ITM-CNS-0005', 'RAK-F-03-1', 184, 30, { batchNo: 'BT-2509', expiryDate: iso(720) }),
  stock('wh_jkt', 'ITM-OFS-0001', 'RAK-G-01-1', 148, 20),
  stock('wh_jkt', 'ITM-OFS-0002', 'RAK-G-01-2', 96, 14),
  stock('wh_jkt', 'ITM-OFS-0003', 'RAK-G-02-1', 184, 36),
  stock('wh_jkt', 'ITM-OFS-0004', 'RAK-G-02-2', 246, 60),
  stock('wh_jkt', 'ITM-OFS-0005', 'RAK-G-02-3', 132, 18),
  stock('wh_jkt', 'ITM-OFS-0006', 'RAK-G-03-1', 74, 16),
  stock('wh_jkt', 'ITM-OFS-0007', 'RAK-G-03-2', 46, 8),
  stock('wh_jkt', 'ITM-OFS-0008', 'RAK-G-03-3', 58, 10),
  stock('wh_jkt', 'ITM-OFS-0009', 'RAK-G-04-1', 62, 12),
  stock('wh_jkt', 'ITM-OFS-0010', 'RAK-G-04-2', 118, 24),
  stock('wh_jkt', 'ITM-OFS-0011', 'RAK-G-04-3', 14, 4),
  stock('wh_jkt', 'ITM-OFS-0012', 'RAK-G-05-1', 34, 6),
  stock('wh_jkt', 'ITM-CNS-0006', 'AREA-PANTRY-1', 210, 48),
  stock('wh_jkt', 'ITM-CNS-0007', 'AREA-PANTRY-2', 76, 18),
  stock('wh_jkt', 'ITM-SPR-0001', 'RAK-H-01-1', 74, 12),
  stock('wh_jkt', 'ITM-SPR-0002', 'RAK-H-01-2', 28, 6),
  stock('wh_jkt', 'ITM-SPR-0003', 'RAK-H-01-3', 46, 8),

  /* ---------------- Gudang Regional Bekasi ---------------- */
  stock('wh_bks', 'ITM-UNI-0002', 'RAK-A-01-1', 96, 40),
  stock('wh_bks', 'ITM-UNI-0003', 'RAK-A-01-2', 38, 12, { minStockOverride: 30 }),
  stock('wh_bks', 'ITM-UNI-0004', 'RAK-A-01-3', 74, 10),
  stock('wh_bks', 'ITM-UNI-0005', 'RAK-A-02-1', 52, 8),
  stock('wh_bks', 'ITM-UNI-0006', 'RAK-A-02-2', 128, 45),
  stock('wh_bks', 'ITM-UNI-0007', 'RAK-A-02-3', 64, 14),
  stock('wh_bks', 'ITM-UNI-0011', 'RAK-A-03-1', 0, 0, { lastMovementAt: iso(-11) }),
  stock('wh_bks', 'ITM-UNI-0012', 'RAK-A-03-2', 210, 40),
  stock('wh_bks', 'ITM-PPE-0001', 'RAK-B-01-1', 380, 90),
  stock('wh_bks', 'ITM-PPE-0002', 'RAK-B-01-2', 58, 15, { batchNo: 'MSK-2412', expiryDate: iso(38) }),
  stock('wh_bks', 'ITM-PPE-0005', 'RAK-B-02-1', 46, 10),
  stock('wh_bks', 'ITM-CHM-0001', 'RAK-C-01-1', 58, 20, { batchNo: 'FC-2602', expiryDate: iso(280) }),
  stock('wh_bks', 'ITM-CHM-0002', 'RAK-C-01-2', 62, 18, { batchNo: 'GC-2601', expiryDate: iso(240) }),
  stock('wh_bks', 'ITM-CHM-0003', 'RAK-C-01-3', 46, 20, { batchNo: 'TB-2512', expiryDate: iso(180) }),
  stock('wh_bks', 'ITM-CHM-0005', 'RAK-C-02-1', 54, 16, { batchNo: 'HS-2603', expiryDate: iso(330) }),
  stock('wh_bks', 'ITM-TOL-0001', 'RAK-D-01-1', 42, 12),
  stock('wh_bks', 'ITM-TOL-0002', 'RAK-D-01-2', 68, 20),
  stock('wh_bks', 'ITM-TOL-0007', 'RAK-D-02-1', 34, 6),
  stock('wh_bks', 'ITM-SEC-0001', 'RAK-E-01-1', 22, 10),
  stock('wh_bks', 'ITM-SEC-0003', 'RAK-E-01-2', 44, 14),
  stock('wh_bks', 'ITM-SEC-0006', 'RAK-E-01-3', 62, 12),
  stock('wh_bks', 'ITM-CNS-0001', 'RAK-F-01-1', 420, 140),
  stock('wh_bks', 'ITM-CNS-0002', 'RAK-F-01-2', 236, 80),
  stock('wh_bks', 'ITM-CNS-0003', 'RAK-F-02-1', 168, 60),

  /* ---------------- Gudang Regional Bandung ---------------- */
  stock('wh_bdg', 'ITM-UNI-0002', 'RAK-A-01-1', 34, 18, { minStockOverride: 40 }),
  stock('wh_bdg', 'ITM-UNI-0006', 'RAK-A-01-2', 46, 24),
  stock('wh_bdg', 'ITM-UNI-0007', 'RAK-A-01-3', 28, 14),
  stock('wh_bdg', 'ITM-UNI-0012', 'RAK-A-02-1', 96, 20),
  stock('wh_bdg', 'ITM-PPE-0001', 'RAK-B-01-1', 240, 60),
  stock('wh_bdg', 'ITM-PPE-0003', 'RAK-B-01-2', 22, 6, { minStockOverride: 30 }),
  stock('wh_bdg', 'ITM-CHM-0001', 'RAK-C-01-1', 24, 14, { batchNo: 'FC-2512', expiryDate: iso(150) }),
  stock('wh_bdg', 'ITM-CHM-0002', 'RAK-C-01-2', 18, 12, { batchNo: 'GC-2511', expiryDate: iso(120) }),
  stock('wh_bdg', 'ITM-CHM-0004', 'RAK-C-01-3', 12, 8, { batchNo: 'DS-2510', expiryDate: iso(-12) }),
  stock('wh_bdg', 'ITM-TOL-0001', 'RAK-D-01-1', 26, 10),
  stock('wh_bdg', 'ITM-TOL-0002', 'RAK-D-01-2', 38, 12),
  stock('wh_bdg', 'ITM-CNS-0001', 'RAK-F-01-1', 180, 70),
  stock('wh_bdg', 'ITM-CNS-0002', 'RAK-F-01-2', 96, 40),
  stock('wh_bdg', 'ITM-OFS-0003', 'RAK-G-01-1', 26, 8),
  stock('wh_bdg', 'ITM-OFS-0004', 'RAK-G-01-2', 34, 12),
  stock('wh_bdg', 'ITM-MCH-0002', 'AREA-MESIN-1', 3, 1),

  /* ---------------- Gudang Regional Surabaya ---------------- */
  stock('wh_sby', 'ITM-UNI-0001', 'RAK-A-01-1', 86, 30),
  stock('wh_sby', 'ITM-UNI-0002', 'RAK-A-01-2', 148, 60),
  stock('wh_sby', 'ITM-UNI-0003', 'RAK-A-01-3', 72, 24),
  stock('wh_sby', 'ITM-UNI-0004', 'RAK-A-02-1', 104, 20),
  stock('wh_sby', 'ITM-UNI-0006', 'RAK-A-02-2', 196, 80),
  stock('wh_sby', 'ITM-UNI-0007', 'RAK-A-02-3', 88, 30),
  stock('wh_sby', 'ITM-UNI-0012', 'RAK-A-03-1', 268, 60),
  stock('wh_sby', 'ITM-PPE-0001', 'RAK-B-01-1', 520, 150),
  stock('wh_sby', 'ITM-PPE-0002', 'RAK-B-01-2', 96, 30, { batchNo: 'MSK-2601', expiryDate: iso(640) }),
  stock('wh_sby', 'ITM-PPE-0005', 'RAK-B-02-1', 78, 20),
  stock('wh_sby', 'ITM-CHM-0001', 'RAK-C-01-1', 84, 34, { batchNo: 'FC-2603', expiryDate: iso(360) }),
  stock('wh_sby', 'ITM-CHM-0002', 'RAK-C-01-2', 92, 30, { batchNo: 'GC-2602', expiryDate: iso(320) }),
  stock('wh_sby', 'ITM-CHM-0003', 'RAK-C-01-3', 78, 40, { batchNo: 'TB-2601', expiryDate: iso(300) }),
  stock('wh_sby', 'ITM-CHM-0008', 'RAK-C-02-1', 64, 24, { batchNo: 'PR-2602', expiryDate: iso(340) }),
  stock('wh_sby', 'ITM-TOL-0001', 'RAK-D-01-1', 58, 20),
  stock('wh_sby', 'ITM-TOL-0002', 'RAK-D-01-2', 82, 30),
  stock('wh_sby', 'ITM-TOL-0005', 'RAK-D-02-1', 12, 4),
  stock('wh_sby', 'ITM-TOL-0007', 'RAK-D-02-2', 44, 10),
  stock('wh_sby', 'ITM-SEC-0001', 'RAK-E-01-1', 34, 16),
  stock('wh_sby', 'ITM-SEC-0002', 'RAK-E-01-2', 14, 6),
  stock('wh_sby', 'ITM-SEC-0003', 'RAK-E-01-3', 66, 24),
  stock('wh_sby', 'ITM-CNS-0001', 'RAK-F-01-1', 720, 260),
  stock('wh_sby', 'ITM-CNS-0002', 'RAK-F-01-2', 380, 140),
  stock('wh_sby', 'ITM-CNS-0003', 'RAK-F-02-1', 264, 90),
  stock('wh_sby', 'ITM-MCH-0001', 'AREA-MESIN-1', 4, 2),
  stock('wh_sby', 'ITM-MCH-0002', 'AREA-MESIN-2', 5, 2),
  stock('wh_sby', 'ITM-SPR-0001', 'RAK-H-01-1', 18, 6),
  stock('wh_sby', 'ITM-OFS-0003', 'RAK-G-01-1', 48, 14),
  stock('wh_sby', 'ITM-OFS-0004', 'RAK-G-01-2', 62, 20),
  stock('wh_sby', 'ITM-OFS-0011', 'RAK-G-02-1', 6, 2),
  stock('wh_sby', 'ITM-CNS-0006', 'AREA-PANTRY-1', 88, 24),

  /* ---------------- Site Store Menara Cakrawala ---------------- */
  stock('wh_site_cpi', 'ITM-CHM-0001', 'BIN-01', 14, 6, { batchNo: 'FC-2604', expiryDate: iso(430), lastMovementAt: iso(-1) }),
  stock('wh_site_cpi', 'ITM-CHM-0002', 'BIN-02', 22, 8, { batchNo: 'GC-2603', expiryDate: iso(395), lastMovementAt: iso(-1) }),
  stock('wh_site_cpi', 'ITM-CHM-0003', 'BIN-03', 18, 10, { batchNo: 'TB-2602', expiryDate: iso(365), lastMovementAt: iso(-2) }),
  stock('wh_site_cpi', 'ITM-CHM-0005', 'BIN-04', 12, 6, { batchNo: 'HS-2605', expiryDate: iso(470) }),
  stock('wh_site_cpi', 'ITM-CHM-0006', 'BIN-05', 6, 4, { batchNo: 'MP-2512', expiryDate: iso(215) }),
  stock('wh_site_cpi', 'ITM-CNS-0001', 'BIN-06', 240, 120, { lastMovementAt: iso(0) }),
  stock('wh_site_cpi', 'ITM-CNS-0002', 'BIN-07', 96, 60, { lastMovementAt: iso(0) }),
  stock('wh_site_cpi', 'ITM-CNS-0003', 'BIN-08', 88, 40),
  stock('wh_site_cpi', 'ITM-TOL-0002', 'BIN-09', 24, 12),
  stock('wh_site_cpi', 'ITM-TOL-0007', 'BIN-10', 16, 4),
  stock('wh_site_cpi', 'ITM-PPE-0001', 'BIN-11', 140, 60),
  stock('wh_site_cpi', 'ITM-UNI-0012', 'BIN-12', 34, 10),
  stock('wh_site_cpi', 'ITM-SPR-0001', 'BIN-13', 8, 4, { minStockOverride: 10 }),
]
