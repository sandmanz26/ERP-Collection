import { chapter, h2, table, callout, esc, ROOT } from './lib.mjs'
import { readFileSync } from 'node:fs'

/* ---------- Lampiran A: every menu entry, read from the navigation file itself ---------- */
function navRows() {
  const src = readFileSync(`${ROOT}src/components/layout/nav.ts`, 'utf8')
  const re = /\{ to: '([^']+)', label: '([^']+)', icon: \w+, permission: '([^']+)'(?:, badgeKey: '\w+')?, description: '([^']+)' \}/g
  const rows = []
  let m
  while ((m = re.exec(src))) rows.push([esc(m[2]), `<code>${m[1]}</code>`, `<code>${m[3]}</code>`, esc(m[4])])
  return rows
}

export function appendixA() {
  const rows = navRows()
  return chapter('Daftar Layar dan Izin Minimum', () => `
    <p class="lead">Seluruh ${rows.length} entri menu, dibaca langsung dari <code>src/components/layout/nav.ts</code> saat dokumen ini dibangun. Kolom <i>izin minimum</i> adalah privilege yang membuat menu muncul <b>dan</b> rute terbuka.</p>
    ${h2('Menu navigasi')}
    ${table(['Menu', 'Rute', 'Izin minimum', 'Fungsi'], rows, { cls: 'tight' })}
    ${h2('Rute lain')}
    ${table(['Rute', 'Isi', 'Izin'], [
      ['<code>/login</code> · <code>/register</code> · <code>/forgot-password</code> · <code>/reset-password</code>', 'Masuk, daftar dengan email perusahaan, lupa dan atur ulang password', 'publik'],
      ['<code>/clients/:id</code>', 'Catatan klien: gedung, proyek, pemenuhan, nilai', '<code>clients.view</code>'],
      ['<code>/projects/:id</code>', 'Catatan proyek: kebutuhan, margin, kebutuhan inventori', '<code>projects.view</code>'],
      ['<code>/mr/:id</code>', 'Sesi MR untuk pengadaan: permintaan, rekap, kunci', '<code>mr.view</code>'],
      ['<code>/purchase-requests/:id</code>', 'Purchase request: pemasok, harga, pemeriksaan akhir', '<code>pr.view</code>'],
      ['<code>/purchase-orders/:id</code>', 'Purchase order: penerimaan dan pembayaran', '<code>po.view</code>'],
      ['<code>/invoices/:id</code>', 'Invoice: baris tagihan, blok pajak, uang masuk, eksposur klien', '<code>invoices.view</code>'],
    ], { cls: 'tight' })}
  `, { label: 'Lampiran A' })
}

/* ---------- Lampiran B: glossary ---------- */
export function appendixB() {
  return chapter('Glosarium', () => `
    ${table(['Istilah', 'Arti'], [
      ['Pos', 'Satu tempat kerja yang dikontrakkan: jabatan × shift × satu orang. "Pos kosong" adalah pos tanpa orang.'],
      ['Headcount · deployed · gap', 'Jumlah yang dikontrakkan · jumlah yang hadir · selisihnya.'],
      ['Pemenuhan (fulfilment)', 'Σ deployed ÷ Σ headcount pada proyek berjalan.'],
      ['Shift', '<code>PAGI</code>, <code>SIANG</code>, <code>MALAM</code>, atau <code>NON_SHIFT</code>.'],
      ['MR · sesi MR', 'Material Request: permintaan barang satu divisi; sesi adalah jendela bulanan tempat semua divisi mengajukan.'],
      ['PR', 'Purchase Request: rekap satu sesi terkunci, satu baris per barang.'],
      ['PO', 'Purchase Order: pesanan kepada satu pemasok.'],
      ['GRN', 'Goods Receipt Note: catatan satu pengiriman terhadap satu PO.'],
      ['Kunci (lock)', 'Tindakan satu arah yang mengubah sesi MR menjadi PR dan membekukan sumbernya.'],
      ['Blocker · peringatan', 'Hasil pemeriksaan akhir: blocker menahan persetujuan; peringatan hanya ditampilkan.'],
      ['Harga beli terakhir', 'Harga yang tercatat oleh penerimaan barang untuk pasangan pemasok dan barang tertentu.'],
      ['Bin', 'Lokasi rak di dalam gudang.'],
      ['Batch · kedaluwarsa', 'Nomor lot barang dan tanggal habis masa pakainya.'],
      ['UoM', 'Unit of Measure: satuan barang (PCS, SET, PAIR, BOX, PACK, ROLL, LITER, KG, BOTTLE, UNIT).'],
      ['SKU', 'Kode barang unik pada master.'],
      ['DPP', 'Dasar Pengenaan Pajak: subtotal setelah potongan dan penyesuaian.'],
      ['PPN', 'Pajak Pertambahan Nilai (11% di data contoh): <b>ditambahkan</b> pada tagihan.'],
      ['PPh 23', 'Pajak penghasilan yang <b>dipotong klien</b> dari pembayaran jasa (2% di data contoh) dan disetor ke kantor pajak atas nama perusahaan.'],
      ['NPWP', 'Nomor Pokok Wajib Pajak.'],
      ['BPJS · THR', 'Jaminan sosial dan Tunjangan Hari Raya; komponen biaya penuh per orang.'],
      ['Gada Pratama · K3', 'Pelatihan dasar satuan pengamanan · keselamatan dan kesehatan kerja.'],
      ['Ageing', 'Pengelompokan tagihan menurut umur: belum jatuh tempo, 1–30, 31–60, lebih dari 60 hari.'],
      ['Privilege · role', 'Satu izin berbentuk <code>modul.aksi</code> · paket privilege yang diberi nama.'],
      ['Grant · revoke', 'Izin yang diberikan di atas role · izin yang dicabut walau role memberinya (revoke menang).'],
      ['R-nomor', 'ID aturan bisnis (R1–R42) pada <code>docs/PRD.md</code>.'],
    ], { cls: 'tight' })}
  `, { label: 'Lampiran B' })
}

/* ---------- Lampiran C: how to rebuild this file ---------- */
export function appendixC() {
  return chapter('Membangun Ulang Dokumen Ini', () => `
    <p>PDF ini dibangkitkan dari sumber, bukan ditulis tangan, sehingga angka dan skemanya tidak dapat tertinggal dari kode.</p>
    ${table(['Bagian', 'Sumber', 'Pemeriksaan otomatis'], [
      ['Skema, kamus data, ERD', '<code>docs/prd/schema.mjs</code>', 'Setiap field setiap interface di <code>types.ts</code> harus punya kolom dengan wajib/opsional yang cocok; setiap FK menuju tabel yang ada; setiap tipe kolom adalah tipe bawaan atau enum yang dideklarasikan. Build gagal bila ada yang tidak cocok.'],
      ['Nilai enum', '<code>src/data/types.ts</code>', 'Dibaca langsung.'],
      ['Daftar layar dan izin', '<code>src/components/layout/nav.ts</code>', 'Dibaca langsung.'],
      ['Jumlah aturan bisnis · baris kode · versi paket', '<code>docs/PRD.md</code> · <code>src/</code> · <code>package.json</code>', 'Dihitung saat build.'],
      ['Tangkapan layar', '<code>docs/prd/capture.mjs</code>', 'Dijalankan terhadap aplikasi yang berjalan; gambar yang hilang dilaporkan, tidak diam-diam dilewati.'],
    ], { cls: 'tight' })}
<pre class="tree"><span class="c"># 1. jalankan aplikasi, lalu ambil tangkapan layar</span>
npm run dev -- --port 5180
node docs/prd/capture.mjs

<span class="c"># 2. bangun PDF (butuh Playwright, dan PyMuPDF: pip install pymupdf)</span>
node docs/prd/build.mjs        <span class="c"># hasil: docs/PRD-Tata-Gemilang.pdf</span></pre>
  `, { label: 'Lampiran C' })
}
