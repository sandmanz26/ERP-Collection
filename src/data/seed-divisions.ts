import type { Division } from './types'
import { iso } from './seed-util'

/* ------------------------------------------------------------------
   The divisions that raise material requests.

   Each one files at most one request per monthly session, signed off by
   its head — that is why the head is an account here and not just a name.
   ------------------------------------------------------------------ */

export const divisions: Division[] = [
  {
    id: 'div_mgt', code: 'DIV-MGT', name: 'Direksi & Manajemen', headUserId: 'usr_hendra',
    headName: 'Hendra Wijayanto', costCenter: 'CC-1000', branchCode: 'JKT',
    email: 'direksi@tatagemilang.co.id', status: 'ACTIVE', createdAt: iso(-1460),
    notes: 'Jarang mengajukan MR; hanya kebutuhan rapat dan representasi.',
  },
  {
    id: 'div_ops', code: 'DIV-OPS', name: 'Operasional Lapangan', headUserId: 'usr_siti',
    headName: 'Siti Rahmawati', costCenter: 'CC-2100', branchCode: 'JKT',
    email: 'operasional@tatagemilang.co.id', status: 'ACTIVE', createdAt: iso(-1460),
    notes: 'Pengaju terbesar: seragam, atribut dan perlengkapan pos untuk seluruh proyek.',
  },
  {
    id: 'div_hrd', code: 'DIV-HRD', name: 'HRD & Rekrutmen', headUserId: 'usr_dewi',
    headName: 'Dewi Anggraini', costCenter: 'CC-2200', branchCode: 'JKT',
    email: 'hrd@tatagemilang.co.id', status: 'ACTIVE', createdAt: iso(-1460),
    notes: 'Kebutuhan naik saat rekrutmen massal menjelang kontrak baru.',
  },
  {
    id: 'div_wh', code: 'DIV-WH', name: 'Logistik & Gudang', headUserId: 'usr_bayu',
    headName: 'Bayu Setiawan', costCenter: 'CC-2300', branchCode: 'JKT',
    email: 'gudang@tatagemilang.co.id', status: 'ACTIVE', createdAt: iso(-1400),
    notes: 'Mengajukan stok penyangga, bukan kebutuhan pakai sendiri.',
  },
  {
    id: 'div_ga', code: 'DIV-GA', name: 'General Affairs', headUserId: 'usr_yanti',
    headName: 'Yanti Kurniasih', costCenter: 'CC-2400', branchCode: 'JKT',
    email: 'ga@tatagemilang.co.id', status: 'ACTIVE', createdAt: iso(-1300),
    notes: 'Pemegang kebutuhan ATK dan pantry kantor pusat.',
  },
  {
    id: 'div_fin', code: 'DIV-FIN', name: 'Keuangan & Akuntansi', headUserId: 'usr_maya',
    headName: 'Maya Puspita', costCenter: 'CC-3100', branchCode: 'JKT',
    email: 'keuangan@tatagemilang.co.id', status: 'ACTIVE', createdAt: iso(-1460),
  },
  {
    id: 'div_prc', code: 'DIV-PRC', name: 'Pengadaan (Purchasing)', headUserId: 'usr_rizal',
    headName: 'Rizal Maulana', costCenter: 'CC-3200', branchCode: 'JKT',
    email: 'purchasing@tatagemilang.co.id', status: 'ACTIVE', createdAt: iso(-1200),
    notes: 'Menutup sesi MR dan mengunci hasilnya menjadi purchase request.',
  },
  {
    id: 'div_qhse', code: 'DIV-QHSE', name: 'QHSE / K3', headUserId: 'usr_fitri',
    headName: 'Fitri Handayani', costCenter: 'CC-2500', branchCode: 'JKT',
    email: 'qhse@tatagemilang.co.id', status: 'ACTIVE', createdAt: iso(-900),
    notes: 'Mengajukan APD dan perlengkapan keselamatan untuk seluruh site.',
  },
  {
    id: 'div_it', code: 'DIV-IT', name: 'Teknologi Informasi', headUserId: 'usr_dimas',
    headName: 'Dimas Anggara', costCenter: 'CC-3300', branchCode: 'JKT',
    email: 'it@tatagemilang.co.id', status: 'ACTIVE', createdAt: iso(-700),
  },
  {
    id: 'div_trn', code: 'DIV-TRN', name: 'Training Center', headUserId: 'usr_nur',
    headName: 'Nurhayati Dewi', costCenter: 'CC-2600', branchCode: 'BDG',
    email: 'training@tatagemilang.co.id', status: 'ACTIVE', createdAt: iso(-620),
    notes: 'Kebutuhan alat peraga dan ATK pelatihan, ditagih ke cabang Bandung.',
  },
  {
    id: 'div_sby', code: 'DIV-SBY', name: 'Cabang Surabaya', headUserId: 'usr_lina',
    headName: 'Lina Marlina', costCenter: 'CC-2700', branchCode: 'SBY',
    email: 'surabaya@tatagemilang.co.id', status: 'ACTIVE', createdAt: iso(-540),
  },
  {
    id: 'div_mkt', code: 'DIV-MKT', name: 'Marketing & Business Development', headUserId: undefined,
    headName: 'Belum ditunjuk', costCenter: 'CC-4100', branchCode: 'JKT',
    email: 'marketing@tatagemilang.co.id', status: 'INACTIVE', createdAt: iso(-300),
    notes: 'Dibekukan sejak reorganisasi; tidak dapat mengajukan MR sampai kepala divisi ditunjuk.',
  },
]
