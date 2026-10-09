import { chapter, h2, h3, callout, stats, chip, table, shot, phones, esc, loc, fmt } from './lib.mjs'
import { readFileSync } from 'node:fs'
import { ROOT } from './lib.mjs'

const r = (id) => `<span class="rule-id">${id}</span>`

/** Counted from the written PRD so the number can never drift from the rules. */
export const RULE_COUNT = (() => {
  const src = readFileSync(`${ROOT}docs/PRD.md`, 'utf8')
  return new Set([...src.matchAll(/\*\*R(\d+[a-z]?) —/g)].map((m) => m[1])).size
})()

/* =====================================================================
   Bab 1 — Ringkasan eksekutif
   ===================================================================== */
export function ch1() {
  return chapter('Ringkasan Eksekutif', () => `
    <p class="lead">PT Tata Gemilang menjual satu hal: orang yang berdiri di pos yang tepat, pada shift yang tepat, di gedung milik klien. Sistem ini membuat jumlah orang itu terlihat, terhitung, dan tertagih — dari kontrak, perlengkapan, pengadaan, sampai uang masuk.</p>

    ${stats([
      { v: '642 / 685', l: 'pos terisi dari yang dikontrakkan — <b>94%</b>, tampil di layar pertama tanpa filter', c: '' },
      { v: '175', l: 'pos kosong yang otomatis dipotong dari tagihan: <b>IDR 1,482,900,000</b>', c: 'a' },
      { v: '86 → 72', l: 'baris permintaan divisi yang digabung menjadi baris pembelian; 11 barang diminta lebih dari satu divisi', c: 'g' },
      { v: '106', l: 'privilege di 24 modul, dengan sumber setiap izin dapat ditelusuri', c: 'p' },
    ])}

    ${h2('Apa ini')}
    <p>Sebuah sistem manajemen operasional untuk perusahaan outsourcing tenaga pengamanan dan kebersihan. Ia mencakup <b>25 layar kerja</b> di 7 kelompok menu: klien dan gedung, proyek dan penempatan, inventori, pengadaan, pembelian, keuangan, serta administrasi akses. Seluruhnya berjalan di peramban dengan data fiktif yang dirancang agar realistis, termasuk celah yang disengaja — shift malam rumah sakit yang kosong, kontrak yang hampir berakhir tanpa perpanjangan otomatis, satu batch masker yang lewat masa pakai — karena demo yang serba hijau tidak membuktikan apa-apa.</p>

    ${h2('Mengapa berbeda')}
    <ul>
      <li><b>Dibangun di sekitar satu angka.</b> Selisih antara pos yang dikontrakkan dan pos yang terisi adalah angka yang menggerakkan bisnis ini. Sistem umum memperlakukannya sebagai laporan; di sini ia adalah tipe data, tombol filter, peringatan, dan baris potongan di invoice.</li>
      <li><b>Aturan ditegakkan di titik input, bukan di rapat evaluasi.</b> ${RULE_COUNT} aturan bisnis tertulis (R1–R42): satu proyek hanya satu gedung, penerimaan tidak boleh melebihi pesanan, pembayaran tidak boleh melebihi tagihan, penguncian sesi tidak bisa dibatalkan, dan seterusnya.</li>
      <li><b>Setiap angka punya asal-usul.</b> Baris pembelian gabungan menyimpan divisi mana meminta berapa. Harga beli terakhir berasal dari penerimaan barang, bukan dari harga yang diketik di formulir. Syarat dan pajak disalin ke dokumen saat terbit, sehingga renegosiasi tidak mengubah tagihan lama.</li>
      <li><b>Dipakai di tempat orang bekerja.</b> Kepala divisi mengajukan permintaan dari ponsel dengan tata letak khusus; analis membaca register rapat; manajer memilih tampilan tabel yang lapang. Dua tampilan antarmuka, dua gaya tabel, satu data.</li>
    </ul>

    ${h2('Status dan batas klaim')}
    ${callout('warn', 'Baca ini dulu', `
      <p>Yang sudah ada adalah <b>front-end lengkap dengan data contoh di peramban</b> (React, TypeScript, tanpa server). Yang belum ada: basis data sungguhan, autentikasi sisi server, dan integrasi ke sistem akuntansi atau perpajakan. Bab 10 memuat <b>rancangan</b> skema database yang diturunkan satu-satu dari model data aplikasi dan diperiksa otomatis terhadapnya; itu rancangan target, bukan database yang sedang berjalan.</p>
      <p>Perbandingan di Bab 8 adalah penilaian desain, bukan hasil benchmark. Angka kinerja operasional (waktu, biaya) baru dapat diklaim setelah pilot; Bab 12 menyebut cara mengukurnya.</p>`)}
  `)
}

/* =====================================================================
   Bab 2 — Latar belakang dan masalah
   ===================================================================== */
export function ch2() {
  return chapter('Latar Belakang dan Masalah', () => `
    <p class="lead">Pendapatan perusahaan ini adalah <b>jumlah orang × tarif</b>. Risikonya adalah <b>pos kosong</b>: pelanggaran tingkat layanan, potongan tagihan, dan akhirnya kontrak yang tidak diperpanjang.</p>

    ${h2('Cara bisnis ini bekerja')}
    <p>Tata Gemilang menandatangani kontrak <b>per gedung</b> untuk periode tertentu. Kontrak menyebut berapa orang dari jabatan apa harus hadir pada shift apa. Perusahaan merekrut dan menempatkan mereka, membekalinya dari gudang sendiri (seragam, alat pelindung, bahan kimia, peralatan), dan menagih setiap bulan. Setelah gaji, perlengkapan adalah biaya terbesar kedua.</p>

    ${h2('Tiga pertanyaan yang tidak bisa dijawab cepat')}
    <p>Buku operasi berada di spreadsheet dan pesan singkat. Tiga pertanyaan ini mahal ketika terlambat dijawab:</p>
    ${table(['Pertanyaan', 'Mengapa sulit tanpa sistem', 'Akibatnya'], [
      ['Berapa pos yang benar-benar terisi sekarang, dan di mana celahnya?', 'Koordinator hanya tahu lokasinya sendiri. Gambaran seluruh perusahaan harus dirakit manual setiap kali ditanya.', 'Rekrutmen diprioritaskan oleh siapa yang paling lantang, bukan oleh celah terbesar.'],
      ['Kontrak mana yang akan berakhir, dan mana yang butuh surat perpanjangan?', 'Tanggal berakhir tersebar di berkas kontrak; masa pemberitahuan tidak diingatkan siapa pun.', 'Kontrak tanpa perpanjangan otomatis yang melewati masa pemberitahuan sama dengan kontrak yang hilang.'],
      ['Apakah gudang bisa membekali orang yang sudah kita janjikan?', 'Kebutuhan perlengkapan adalah fungsi jumlah orang, tetapi direncanakan terpisah dari kontrak yang melahirkannya.', 'Penempatan menunggu barang yang tidak pernah dipesan.'],
    ])}

    ${h2('Tiga masalah yang muncul setelah pengadaan dan penagihan ikut dibahas')}
    ${table(['Area', 'Pola yang umum terjadi', 'Yang diperlukan'], [
      ['Permintaan barang bulanan', 'Setiap divisi mengirim daftarnya sendiri lewat berkas atau pesan. Pembelian menggabungkan manual, mencari duplikat, dan kehilangan jejak siapa meminta apa.', 'Satu jendela per bulan, satu permintaan per divisi, penggabungan yang menyimpan asalnya.'],
      ['Harga dan pemasok', 'Harga dicari dari ingatan atau dari nota lama. Tidak ada satu tempat yang mencatat harga yang <i>benar-benar</i> dibayar.', 'Harga beli terakhir per pemasok per barang, ditulis oleh penerimaan barang.'],
      ['Penagihan', 'Pos yang kosong sebulan penuh tetap tertagih atau dikoreksi setelah klien protes. Pajak dihitung di sheet terpisah.', 'Tagihan yang sudah memotong pos kosong, dengan PPN dan PPh 23 yang dinyatakan langkah demi langkah.'],
    ])}

    ${callout('info', 'Dasar proyek', '<p>Dokumen ini menyatakan kondisi awal sebagai <b>buku operasi di spreadsheet</b>, sebagaimana tertulis pada PRD fase 1. Tidak ada pengukuran baseline kuantitatif yang tersedia saat ini; pengukurannya dijadwalkan sebelum pilot (Bab 12).</p>')}
  `)
}

/* =====================================================================
   Bab 3 — Tujuan, pengguna, cakupan
   ===================================================================== */
export function ch3() {
  const P = (ini, name, role, goal, uses, code) => `
    <div class="persona"><div class="avatar">${ini}</div><div>
      <div class="nm">${name}</div><div class="rl">${role} · role ${chip(code, 'b')}</div>
      <p><b>Ingin:</b> ${goal}</p><p><b>Memakai:</b> ${uses}</p></div></div>`
  return chapter('Tujuan, Pengguna, dan Cakupan', () => `
    ${h2('Tujuan')}
    ${table(['#', 'Tujuan produk', 'Ukuran keberhasilan'], [
      ['1', 'Membuat selisih pos (dikontrakkan − terisi) terlihat dalam satu layar, per proyek, per shift, per jabatan.', 'Dashboard menjawabnya tanpa filter; Deployments mengurutkan menurut selisih.'],
      ['2', 'Menutup rantai dari permintaan divisi sampai pembayaran pemasok dengan dokumen yang saling merujuk.', 'Setiap PO terbaca balik ke divisi peminta; setiap penerimaan menulis harga dan stok.'],
      ['3', 'Menagih apa yang benar-benar diserahkan, dengan pajak yang transparan.', 'Setiap invoice memuat baris potongan untuk pos kosong dan blok pajak yang diurai.'],
      ['4', 'Memberi setiap orang hanya akses yang ia perlukan, dan menjelaskan mengapa.', 'Sumber setiap privilege (role, grant, atau revoke) terlihat di akun.'],
      ['5', 'Menjadi satu pola kerja: pelajari satu tabel, kuasai semuanya.', 'Semua register memakai komponen tabel yang sama.'],
    ])}

    ${h2('Bukan tujuan (fase ini)')}
    <p>Ditulis sebagai keputusan, bukan kelalaian: buku besar akuntansi dan faktur pajak, penggajian, absensi harian, data pribadi pekerja bernama, dokumen kontrak dan tanda tangan elektronik, tender dan kontrak payung pemasok, dan autentikasi di sisi server. Rinciannya di Bab 12.</p>

    ${h2('Pengguna dan peran')}
    <p>Sistem membedakan <b>12 role</b> (10 bawaan, 2 kustom). Tokoh di bawah memakai data contoh fiktif yang sama dengan yang ada di aplikasi, dan akan muncul kembali pada skenario di Bab 7.</p>
    <div class="cols2">
      <div>
        ${P('HW', 'Hendra Wijayanto', 'Direktur Operasional', 'satu angka perusahaan pagi ini, dan apa yang paling merugikan bila dibiarkan', 'Dashboard, Projects, Finance', 'SUPER_ADMIN')}
        ${P('SR', 'Siti Rahmawati', 'Operation Manager', 'tahu proyek mana kekurangan orang dan kontrak mana habis', 'Deployments, Projects, Clients', 'OPERATION_MANAGER')}
        ${P('AP', 'Agus Pratama', 'Koordinator Area Jakarta', 'mengisi jumlah orang yang hadir di lokasi wilayahnya', 'Deployments, Buildings', 'AREA_COORDINATOR')}
        ${P('DA', 'Dewi Anggraini', 'HR & Recruitment Lead', 'merekrut untuk posisi yang celahnya terbesar', 'Deployments, Positions', 'HR_RECRUITMENT')}
        ${P('LM', 'Lina Marlina', 'Admin Gudang Surabaya', 'menerima barang, memindahkan stok, tanpa selisih yang tak terjelaskan', 'Stock, Transfers, Goods Receipt', 'WAREHOUSE_ADMIN')}
      </div>
      <div>
        ${P('RM', 'Rizal Maulana', 'Kepala Pengadaan', 'mengubah permintaan seluruh divisi menjadi pesanan per pemasok dengan harga yang bisa dipertanggungjawabkan', 'Material Requests, Purchase Requests, Purchase Orders, Suppliers', 'PURCHASING_MANAGER')}
        ${P('MP', 'Maya Puspita', 'Finance & Billing', 'menagih tepat, menagih tepat waktu, dan tahu klien mana yang menunggak', 'Invoices, Receipts, Finance, Payments', 'FINANCE')}
        ${P('YK', 'Yanti Kurniasih · Nurhayati Dewi', 'Kepala General Affairs · Kepala Training Center', 'mengajukan kebutuhan divisinya dari mana pun, termasuk dari ponsel', 'My Division Request (hanya divisinya)', 'DIVISION_HEAD')}
        ${P('EA', 'Auditor eksternal', 'Peran kustom, sementara', 'melihat tanpa mengubah, dan bisa dimatikan tanpa membongkar siapa yang memegangnya', 'Semua register, hanya-baca', 'EXTERNAL_AUDITOR')}
      </div>
    </div>
  `)
}

/* =====================================================================
   Bab 4 — Fitur produk
   ===================================================================== */
export function ch4() {
  const mod = table(['Kelompok', 'Menu', 'Fungsi utama'], [
    ['Overview', 'Dashboard', 'Pemenuhan pos, kontrak, stok; peringatan yang diurutkan menurut kerugian'],
    ['Clients', 'Clients · Buildings', 'Perusahaan klien, syarat komersial, kontak; gedung yang dilayani'],
    ['Operations', 'Projects · Deployments · Positions', 'Kontrak per gedung, kebutuhan per jabatan dan shift, register seluruh pos, master jabatan'],
    ['Inventory', 'Warehouses · Item Master · Warehouse Stock · Stock Transfers', 'Gudang, definisi barang, jumlah per gudang dan batch, perpindahan antar gudang'],
    ['Procurement', 'Material Requests · My Division Request · Purchase Requests · Purchase Orders · Goods Receipt · Payments · Suppliers · Divisions', 'Permintaan bulanan, rekap, PO per pemasok, penerimaan, pembayaran, harga beli terakhir'],
    ['Finance', 'Overview · Invoices · Client Receipts', 'Invoice bulanan per proyek, uang masuk, piutang, posisi kas'],
    ['Administration', 'Users · Roles · Privileges · Settings', 'Akun, bundel privilege, katalog privilege, profil perusahaan, jejak aktivitas, pilihan antarmuka'],
  ])

  return chapter('Fitur Produk', () => `
    <p class="lead">Bab ini menjelaskan apa yang dapat dilakukan setiap modul, aturan yang dijaganya, dan tampilannya yang sebenarnya.</p>

    ${h2('Peta modul')}
    ${mod}

    ${h2('Dashboard dan peringatan')}
    <p>Layar pertama menjawab pertanyaan pagi: <b>berapa pos terisi, di mana kosong, dan apa yang paling mahal bila dibiarkan</b>. Panel <i>Needs attention</i> mengurutkan masalah menurut tingkat keparahan (kritis, tinggi, sedang), bukan menurut abjad atau tanggal; di sebelahnya, pemenuhan per lini layanan memperlihatkan di mana satu jenis layanan tertinggal dari yang lain.</p>
    <ul>
      <li>Empat angka utama: pemenuhan (642 dari 685 pos), pos terbuka (43 di 5 kontrak yang kekurangan orang), nilai bulanan kontrak berjalan, nilai stok.</li>
      <li>Peringatan otomatis: proyek kekurangan orang (kritis bila pemenuhan di bawah 90%), kontrak yang berakhir dalam 60 hari (tinggi bila ≤ 30 hari; teks peringatan menyebut apakah diperpanjang otomatis atau perlu surat perpanjangan), kontrak aktif yang melewati tanggal berakhir, proyek menunggu persetujuan, stok habis atau di bawah batas, dan batch yang kedaluwarsa atau hampir kedaluwarsa.</li>
      <li>Setiap peringatan adalah tautan ke catatan yang bersangkutan.</li>
    </ul>
    ${shot('dashboard', '<b>Gambar 4.1 — Dashboard.</b> Pemenuhan pos, peringatan yang diurutkan menurut tingkat keparahan, dan pemenuhan per lini layanan. Data fiktif.', { sidebar: true, h: '112mm' })}

    ${h2('Klien dan gedung')}
    <ul>
      <li><b>Klien</b>: identitas (nama hukum, merek, NPWP, industri, tingkat), alamat, kontak dengan satu kontak utama, dan <b>syarat komersial</b> — tenggat bayar, tanggal tagih, PPN, PPh 23, batas kredit — yang disimpan sekali dan diwarisi proyek baru.</li>
      <li><b>Gedung</b> milik satu klien: tipe (menara, pabrik, rumah sakit, mal, kampus, pusat data, dan seterusnya), luas, jam operasi, pola shift, kontak lokasi, aturan akses. Register menandai gedung yang belum dilayani proyek mana pun.</li>
      <li>Catatan klien menampilkan gedung, proyek, pemenuhan, nilai bulanan, dan margin dalam satu tempat.</li>
    </ul>

    ${h2('Proyek dan deployment')}
    <p>Satu proyek adalah <b>satu kontrak untuk satu gedung dalam satu periode</b> ${r('R1')}. Klien yang menambah gedung menandatangani proyek kedua. Aturan ini ditegakkan di tipe data dan di formulir: daftar gedung disaring ke klien terpilih, dan gedung yang sudah dipegang proyek aktif atau menunggu persetujuan dinonaktifkan dengan menyebut proyek yang memegangnya.</p>
    <ul>
      <li><b>Baris kebutuhan</b>: jabatan × shift × jumlah orang, hari kerja, jam per shift, tarif tagih dan biaya per orang. Cakupan 24 jam adalah tiga baris, bukan satu baris dengan catatan ${r('R2')}.</li>
      <li><b>Alur status</b>: <code>DRAFT → PENDING_APPROVAL → ACTIVE → (SUSPENDED ⇄ ACTIVE) → COMPLETED | TERMINATED</code>.</li>
      <li><b>Dihitung dan ditampilkan</b>: pemenuhan, selisih per shift, nilai bulanan, biaya bulanan, margin, nilai kontrak, progres periode, sisa hari, dan kebutuhan inventori terhadap stok yang tersedia.</li>
      <li><b>Deployments</b> meratakan seluruh baris kebutuhan perusahaan dalam satu register, diurutkan menurut selisih — itulah daftar prioritas rekrutmen.</li>
    </ul>
    ${callout('ok', 'Aturan yang menjaga angkanya jujur', `<p>${r('R3')} jumlah ditempatkan tidak boleh melebihi yang dikontrakkan (ditolak saat simpan). ${r('R4')} hanya kontrak berjalan yang dapat kekurangan orang: draf, selesai, dan dihentikan tidak dihitung; kontrak ditangguhkan tidak berutang pos pada siapa pun, sehingga menghitungnya sebagai kekurangan akan menekan angka perusahaan secara permanen dan menyembunyikan celah yang nyata.</p>`)}
    ${shot('project-detail', '<b>Gambar 4.2 — Catatan proyek.</b> Kebutuhan per jabatan dan shift, ditempatkan terhadap dikontrakkan, nilai dan margin.', { h: '100mm' })}

    ${h2('Posisi')}
    <p>Master jabatan: lini layanan, tingkat, sertifikasi (Gada Pratama, K3 Umum, SIM A…), pendidikan dan pengalaman minimum, gaji, tunjangan, tarif tagih default, dan <b>perlengkapan standar</b> (SKU × jumlah per orang). Tarif tagih harus melampaui biaya penuh (gaji + tunjangan + BPJS + provisi THR); formulir menolak sebaliknya. Perlengkapan standar inilah yang menghubungkan jumlah orang di kontrak dengan kebutuhan stok.</p>

    ${h2('Inventori')}
    <ul>
      <li><b>Gudang</b>: pusat, regional, lokasi — kode, kapasitas, pengelola, status.</li>
      <li><b>Master barang</b> (definisi tanpa jumlah) ${r('R5')}: SKU, kategori, satuan, biaya standar, batas min/maks, titik pesan ulang, pelacakan batch dan kedaluwarsa, penanda bahan berbahaya, pemasok, lead time, lini layanan.</li>
      <li><b>Stok gudang</b> (jumlah tanpa definisi): satu baris per gudang, barang, dan batch ${r('R6')}; tersedia = ada − dipesan ${r('R7')}; batas per gudang dapat menimpa batas master ${r('R8')}. Status kesehatan stok dan kedaluwarsa dihitung, dan peringatan muncul di dashboard.</li>
      <li><b>Perpindahan antar gudang</b>: draf → kirim → terima, dengan batal sebelum tiba. Barang meninggalkan gudang asal saat dikirim dan masuk gudang tujuan saat diterima; di antaranya ia bukan milik gudang mana pun (<code>IN_TRANSIT</code>) ${r('R33')}. Penerimaan yang kurang dari kiriman ditolak sampai ada alasan, dan selisihnya disimpan sebagai varians, bukan menyesuaikan jumlah diam-diam ${r('R34')}.</li>
    </ul>
    ${shot('stock-transfers', '<b>Gambar 4.3 — Perpindahan antar gudang.</b> Dua selesai (satu kurang saat tiba), satu di perjalanan, satu draf, satu batal.', { h: '88mm' })}

    ${h2('Pengadaan: dari permintaan divisi menjadi purchase request')}
    <p>Setiap bulan administrator membuka <b>sesi MR</b> (Material Request). Setiap divisi mengajukan <b>satu permintaan</b> ${r('R14')}, hanya untuk barang yang sudah ada di master dan disimpan di gudang ${r('R15')}. Pengadaan meninjau tiap permintaan (setujui atau kembalikan dengan alasan), lalu <b>mengunci</b> sesi — satu arah ${r('R18')} — yang menghasilkan <b>satu purchase request</b>.</p>
    <div class="cols2">
      <div>
        <h4>Halaman kepala divisi</h4>
        <ul>
          <li>Hanya menampilkan permintaan divisinya pada sesi yang terbuka.</li>
          <li>Pilihan barang dapat disaring per <b>kategori</b>; 70 barang adalah pencarian, bukan gulungan.</li>
          <li>Harga perkiraan opsional; bila kosong, biaya standar dipakai dan diberi label ${r('R16')}.</li>
          <li>Setelah dikirim, formulir hanya-baca sampai dikembalikan.</li>
        </ul>
      </div>
      <div>
        <h4>Halaman sesi untuk pengadaan</h4>
        <ul>
          <li>Seluruh permintaan berdampingan, divisi yang belum mengajukan, pratinjau rekap persis seperti yang akan dibangun kunci.</li>
          <li>Kunci ditolak selama ada permintaan masih draf ${r('R17')}; pengadaan menunggu atau mengembalikannya, sehingga pengecualian disengaja dan tercatat.</li>
          <li>Dialog kunci menyebut: berapa permintaan menjadi berapa baris, berapa baris yang menggabungkan lebih dari satu divisi.</li>
        </ul>
      </div>
    </div>
    ${shot('mr-session', '<b>Gambar 4.4 — Sesi MR September.</b> 5 dari 11 divisi telah mengajukan; 30 baris akan menjadi 19 baris. Tombol <i>Lock</i> menolak karena 2 permintaan masih draf (R17).', { h: '104mm' })}

    ${h3('Purchase request: pemasok, harga, dan pemeriksaan akhir')}
    <p>Rekap menggabungkan menurut barang: <code>qty = Σ sumber</code>, dengan setiap divisi, jumlah, dan perkiraannya tetap melekat pada baris ${r('R19')}. Pengadaan menetapkan pemasok per baris; sistem menampilkan <b>harga beli terakhir pemasok itu beserta tanggal</b> dan riwayat lengkap barangnya. Harga yang dipakai selalu menyebut dasarnya, berurutan dari yang paling berwibawa: disepakati pada request ini → pembelian terakhir dari pemasok terpilih → pembelian terakhir dari siapa pun → perkiraan divisi tertinggi → biaya standar ${r('R20')}.</p>
    <ul>
      <li>Pemasok di luar kategori yang disetujui boleh dipilih, tetapi tidak diam-diam: pemilih memisahkan yang disetujui dari yang lain dan menawarkan menambah kategori ${r('R21')}. Pemasok yang masuk daftar hitam tidak pernah ditawarkan; yang ditahan tidak dapat dipilih.</li>
      <li>Baris tanpa pemasok yang cocok bukan jalan buntu: pemasok baru dapat didaftarkan dari baris itu dan langsung dipilih ${r('R21a')}.</li>
      <li>Persetujuan adalah <b>pemeriksaan akhir dengan kriteria tertulis</b> ${r('R21b')}: <i>blocker</i> menghentikan (baris tanpa pemasok; pemasok ditahan atau diblokir); <i>peringatan</i> hanya ditampilkan (di luar kategori, harga tanpa pembelian pendukung, harga lebih dari 10% di atas pembelian terakhir, kelompok di bawah nilai pesanan minimum).</li>
    </ul>
    ${shot('pr-finalcheck', '<b>Gambar 4.5 — Pemeriksaan akhir pengadaan.</b> PR Agustus: 12 dari 30 baris belum bersupplier, sehingga 12 blocker menahan persetujuan. Tidak ada yang dapat dipesan dari baris yang belum diminta kepada siapa pun.', { h: '104mm' })}
    ${phones(['phone-top', 'phone-lines', 'phone-drawer'], '<b>Gambar 4.6 — Pengajuan MR dari ponsel.</b> Di bawah 768 px halaman ini punya tata letak sendiri: satu kartu per baris, tombol Save draft dan Submit tertambat di bawah layar bersama total berjalan, dan menu sebagai laci.')}

    ${h2('Pembelian, penerimaan, dan pembayaran')}
    <p>Purchase request yang disetujui adalah daftar belanja perusahaan; pemasok tidak dapat bertindak atasnya. Karena itu ia <b>dipecah menjadi satu PO per pemasok</b> ${r('R24')}, hanya sekali, dan hanya bila setiap baris punya pemasok.</p>
    <div class="cols3">
      <div class="card"><h4>Purchase order</h4><p style="font-size:8.2pt">Baris, harga, total diterima berjalan, divisi yang menunggu (informasi), gudang tujuan, tanggal pesan dan perkiraan tiba. Tenggat bayar dan PPN <b>disalin saat terbit</b> ${r('R25')}. Dapat ditutup kurang atau dibatalkan dengan alasan.</p></div>
      <div class="card"><h4>Penerimaan barang</h4><p style="font-size:8.2pt">Per pengiriman: gudang, surat jalan, kendaraan, dan per baris jumlah diterima, <b>ditolak + alasan</b>, bin, batch, kedaluwarsa. Tidak boleh melebihi sisa pesanan ${r('R26')}; yang ditolak tidak masuk stok dan tetap terutang ${r('R27')}.</p></div>
      <div class="card"><h4>Pembayaran</h4><p style="font-size:8.2pt">Per PO, penuh atau sebagian, dengan metode, referensi, dan rekening. Tidak boleh melebihi sisa tagihan ${r('R31')}. Tenggat berjalan <b>sejak pengiriman pertama</b>; PO tanpa barang tidak pernah menunggak ${r('R32')}.</p></div>
    </div>
    <p style="margin-top:8pt">Satu penerimaan melakukan <b>tiga hal sekaligus</b> ${r('R28')}: menambah total diterima pada PO, memasukkan barang ke gudang, dan menulis harga yang dibayar. Barang yang masuk bergabung ke baris stok yang sama (gudang, barang, batch) dengan <b>biaya rata-rata tertimbang</b> ${r('R29')}, karena satu bin yang berisi dua pembelian hanya dapat dijelaskan jujur oleh satu angka. Itulah sebabnya <b>harga beli terakhir adalah fakta, bukan keputusan</b> ${r('R30')}.</p>
    ${shot('po-detail', '<b>Gambar 4.7 — Detail PO.</b> Kemajuan penerimaan 180 dari 360, divisi yang menunggu, dan status pembayaran.', { h: '90mm' })}

    ${h2('Keuangan')}
    <ul>
      <li><b>Invoice</b>: satu proyek, satu bulan, satu tagihan ${r('R35')}. Seluruh periode dapat dibuat sekaligus; hasilnya <b>selalu draf</b> karena jumlah orang di baliknya harus dikonfirmasi koordinator dulu ${r('R38')}.</li>
      <li><b>Baris tagihan</b>: <code>SERVICE</code> (kontrak apa adanya), <code>DEDUCTION</code> (setiap pos yang kosong, pada tarif yang sama, negatif), <code>ADJUSTMENT</code> (hasil negosiasi). Potongan dipisah, tidak dinetto, karena klien akan bertanya yang mana ${r('R36')}. Biaya manajemen tidak pernah menjadi baris sendiri: tarif tagih sudah memuatnya.</li>
      <li><b>Pajak</b>: PPN ditambahkan, PPh 23 dipotong klien. <code>total = subtotal + PPN</code>; yang benar-benar ditransfer klien <code>= total − PPh 23</code> ${r('R37')}. Blok pajak menyatakan setiap langkah, bukan hanya jawabannya.</li>
      <li><b>Uang masuk</b>: penuh atau sebagian, tidak boleh melebihi sisa ${r('R41')}; status invoice diturunkan dari saldo: terbit → dibayar sebagian → lunas. Draf tidak berutang dan tidak dapat menunggak ${r('R39')}.</li>
      <li><b>Piutang</b>: ageing empat keranjang, eksposur per klien terhadap batas kredit (penasihat dan terlihat di tempat keputusan, tetapi tidak memblokir ${r('R42')}), dan berapa hari lebih awal atau terlambat setiap pembayaran.</li>
    </ul>
    ${shot('invoice-detail', '<b>Gambar 4.8 — Invoice.</b> Layanan sesuai kontrak, lalu baris potongan untuk setiap pos yang kosong (oranye). Di kanan, eksposur klien: 153% dari batas kredit.', { h: '108mm' })}
    ${shot('finance', '<b>Gambar 4.9 — Ringkasan keuangan.</b> Piutang, utang pemasok, posisi bersih, serta uang masuk dan keluar per bulan.', { h: '102mm' })}

    ${h2('Administrasi dan kontrol akses')}
    <ul>
      <li><b>Privilege</b> didefinisikan di kode sebagai <code>&lt;modul&gt;.&lt;aksi&gt;</code> dengan tingkat risiko, karena masing-masing sesuai dengan satu kontrol yang ditampilkan atau disembunyikan antarmuka: <b>106 privilege, 24 modul, 20 berisiko tinggi</b>.</li>
      <li><b>Role</b> adalah paket privilege. Sepuluh bawaan tidak dapat dihapus; role kustom dibuat administrator dan dapat diduplikasi sebagai titik awal. Editor berbentuk matriks modul × aksi dan menyebut berapa akun yang terpengaruh <i>sebelum</i> disimpan.</li>
      <li><b>Akun</b> memegang satu atau lebih role plus dua daftar pengecualian dan cakupan data per cabang. Hak efektif <code>= union(role aktif) + grant − revoke</code> ${r('R9')}; revoke selalu menang.</li>
      <li><b>Penegakan tiga lapis</b>: menu menyembunyikan yang tidak dapat dibuka; penjaga rute menolaknya dengan menyebut privilege yang kurang; setiap kontrol buat, ubah, hapus, impor, dan ekspor hanya dirender bagi yang memegang privilege-nya.</li>
      <li><b>Pengaman</b>: sistem tidak pernah bisa terkunci dari semua orang ${r('R11')}; role yang masih dipakai tidak dapat dihapus ${r('R12')}; role nonaktif tidak memberi apa pun ${r('R10')}. Perubahan privilege dicatat sebagai apa yang ditambah dan dicabut, bukan "diperbarui".</li>
    </ul>
    <div class="cols2">
      ${shot('roles', '<b>Gambar 4.10 — Role.</b> Bundel privilege dengan jumlah akun yang memegangnya.', { h: '74mm', sidebar: false })}
      ${shot('users', '<b>Gambar 4.11 — Akun.</b> Role, cakupan cabang, dan status per akun.', { h: '74mm', sidebar: false })}
    </div>

    ${h2('Pengalaman pengguna lintas modul')}
    <h3>Standar tabel — satu komponen untuk semua register</h3>
    <p>Setiap register memakai komponen tabel yang sama, sehingga satu hal yang dipelajari berlaku di mana pun: <b>kolom dapat diurutkan</b> (menurut nilai, bukan teks yang tampil, sehingga uang dan tanggal terurut sebagai angka); <b>pencarian</b> di seluruh bidang baris; <b>filter</b> multi-pilih per kolom; <b>impor</b> CSV dengan pemetaan, validasi per bidang, pratinjau, dan berkas contoh; <b>ekspor</b> CSV/JSON untuk tampilan tersaring, pilihan, atau semua, ditambah berkas yang dapat diimpor kembali; <b>jumlah baris total yang selalu terlihat</b> (<code>1–25 dari 136</code>); tampil/sembunyi kolom; kepadatan; pilihan massal dengan peringatan dampak sebelum hapus.</p>
    <div class="cols3">
      <div class="card tint"><h4>Dua gaya tabel</h4><p style="font-size:8.2pt"><b>Detailed</b>: semua kolom, untuk merekonsiliasi sebulan. <b>Relaxed</b>: hanya kolom yang menentukan; sisanya terlipat di balik panah per baris. Mengubah gaya tidak mengubah apa yang dicari, diurutkan, atau diekspor. Pengalih mengambang dapat diseret ke mana saja dan diingat.</p></div>
      <div class="card tint"><h4>Dua antarmuka</h4><p style="font-size:8.2pt"><b>Modern</b> dan <b>Classic</b> (gaya admin Bootstrap 2017: sidebar gelap, bar biru, tabel bergaris). Dipilih di Settings → Interface, atau dari menu akun bagi role tanpa akses Settings. Data dan izin identik.</p></div>
      <div class="card tint"><h4>Konvensi uang dan bahasa</h4><p style="font-size:8.2pt">Uang selalu ditulis penuh — <code>IDR 111,949,605</code> — tanpa singkatan K atau M. Navigasi dan label berbahasa Inggris; isi data (nama shift, jabatan, barang) berbahasa Indonesia.</p></div>
    </div>
    ${shot('po-relaxed', '<b>Gambar 4.12 — Register PO, gaya Relaxed.</b> Lima kolom yang menentukan; sisanya dilipat di balik panah pada tiap baris dan terbuka sebagai panel berlabel.', { h: '86mm' })}
    ${shot('settings-interface', '<b>Gambar 4.13 — Settings → Interface.</b> Pratinjau digambar dengan warna tetap, sehingga tiap pilihan tetap tampak seperti dirinya setelah yang lain dipilih.', { h: '94mm', sidebar: false })}
    ${shot('classic-po', '<b>Gambar 4.14 — Antarmuka Classic.</b> Halaman yang sama dengan Gambar 4.12, dengan data yang sama, dalam gaya admin Bootstrap 2017.', { sidebar: true, h: '100mm' })}
  `)
}

/* =====================================================================
   Bab 5 — Alur proses
   ===================================================================== */
export function ch5() {
  const step = (who, what, how, kind = '') => `<div class="step ${kind}"><div class="who">${who}</div><div class="what">${what}</div><div class="how">${how}</div></div>`
  return chapter('Alur Proses End-to-End', () => `
    <p class="lead">Dua rantai menjalankan perusahaan ini: <b>dari kontrak sampai uang masuk</b>, dan <b>dari permintaan divisi sampai pembayaran pemasok</b>. Dokumen di setiap mata rantai merujuk ke dokumen sebelumnya.</p>

    ${h2('Dari kontrak sampai uang masuk')}
    <div class="flow">
      ${step('Account manager', 'Klien dan gedung', 'Syarat komersial dicatat sekali, diwarisi proyek.')}
      ${step('Operation manager', 'Proyek dan kebutuhan', 'Satu gedung, periode, jabatan × shift × jumlah. Diajukan untuk persetujuan.', 'hi')}
      ${step('Direktur', 'Disetujui → ACTIVE', 'Hanya kontrak berjalan yang dihitung dalam pemenuhan.')}
      ${step('Koordinator area', 'Penempatan', 'Mengisi jumlah hadir; tidak boleh melebihi kontrak.')}
    </div>
    <div class="flow">
      ${step('Sistem', 'Selisih terlihat', 'Dashboard, Deployments diurutkan menurut selisih, peringatan.', 'warn')}
      ${step('Gudang', 'Perlengkapan', 'Kebutuhan = orang × perlengkapan standar, dibandingkan stok tersedia.')}
      ${step('Finance', 'Invoice bulanan', 'Satu aksi membuat draf seluruh proyek. SERVICE + DEDUCTION untuk pos kosong.', 'hi')}
      ${step('Finance', 'Terbit', 'PPN ditambah, PPh 23 dipotong; tenggat berjalan dari tanggal terbit.')}
    </div>
    <div class="flow">
      ${step('Finance', 'Uang masuk', 'Penuh atau sebagian; status invoice diturunkan dari saldo.', 'ok')}
      ${step('Finance', 'Piutang dan ageing', 'Empat keranjang usia; eksposur klien terhadap batas kredit.', 'ok')}
      ${step('Direktur', 'Keputusan', 'Siapa yang ditagih lebih dulu; kontrak mana yang diperpanjang.', 'ok')}
    </div>

    ${h2('Dari permintaan divisi sampai pembayaran pemasok')}
    <div class="flow">
      ${step('Administrator', 'Sesi MR dibuka', 'Satu sesi per periode; jendela pengajuan ditetapkan.')}
      ${step('Kepala divisi', 'Mengajukan', 'Satu permintaan per divisi; dari ponsel bila perlu.', 'hi')}
      ${step('Pengadaan', 'Tinjau', 'Setujui, atau kembalikan dengan alasan.')}
      ${step('Pengadaan', 'Kunci → PR', 'Satu arah. Gabung per barang; sumber tetap melekat.', 'warn')}
    </div>
    <div class="flow">
      ${step('Pengadaan', 'Pemasok dan harga', 'Harga beli terakhir dan tanggalnya tampil per baris.', 'hi')}
      ${step('Pengadaan', 'Pemeriksaan akhir', 'Blocker menahan; peringatan hanya ditampilkan.', 'warn')}
      ${step('Pengadaan', 'Terbitkan PO', 'Satu PO per pemasok; syarat disalin saat terbit.')}
      ${step('Gudang', 'Penerimaan', 'Parsial dibolehkan; ditolak tetap terutang; stok dan harga ditulis.', 'hi')}
    </div>
    <div class="flow">
      ${step('Finance', 'Pembayaran', 'Penuh atau sebagian; tenggat dari pengiriman pertama.', 'ok')}
      ${step('Sistem', 'Harga beli terakhir', 'Pembelian berikutnya mulai dari fakta ini.', 'ok')}
    </div>

    ${h2('Mesin status')}
    <p>Status yang <b>diturunkan</b> tidak pernah dipilih orang; itu menutup satu jenis kesalahan sepenuhnya.</p>
    ${table(['Dokumen', 'Alur status', 'Siapa yang menggerakkan', 'Dipilih / diturunkan'], [
      ['Proyek', 'DRAFT → PENDING_APPROVAL → ACTIVE ⇄ SUSPENDED → COMPLETED | TERMINATED', 'Pengelola proyek dan yang menyetujui', 'Dipilih (dengan izin)'],
      ['Sesi MR', 'DRAFT → OPEN → CLOSED → LOCKED (atau CANCELLED)', 'Administrator, lalu pengadaan', 'Dipilih; LOCKED satu arah'],
      ['Permintaan divisi', 'DRAFT → SUBMITTED → APPROVED (atau RETURNED → SUBMITTED)', 'Kepala divisi; pengadaan meninjau', 'Dipilih'],
      ['Purchase request', 'DRAFT ⇄ ASSIGNED → APPROVED → ORDERED (atau CANCELLED)', 'Pengadaan', 'DRAFT/ASSIGNED <b>diturunkan</b> dari kelengkapan pemasok'],
      ['Purchase order', 'DRAFT → ISSUED → PARTIALLY_RECEIVED → RECEIVED → CLOSED (atau CANCELLED)', 'Pengadaan; gudang lewat penerimaan', 'Penerimaan <b>diturunkan</b> dari total diterima'],
      ['Perpindahan stok', 'DRAFT → IN_TRANSIT → RECEIVED (atau CANCELLED)', 'Gudang asal mengirim; gudang tujuan menerima', 'Dipilih'],
      ['Invoice', 'DRAFT → ISSUED → PARTIALLY_PAID → PAID (atau VOID)', 'Finance; uang masuk menggeser status', 'Pembayaran <b>diturunkan</b> dari saldo'],
    ])}
  `)
}
