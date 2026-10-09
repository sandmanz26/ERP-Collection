import { chapter, h2, h3, callout, stats, chip, table, dot, esc } from './lib.mjs'
import { RULE_COUNT } from './content-a.mjs'

const r = (id) => `<span class="rule-id">${id}</span>`

/* =====================================================================
   Bab 6 — Aturan bisnis dan kontrol
   ===================================================================== */
export function ch6() {
  const rows = [
    ['R1', 'Satu proyek melayani tepat satu gedung. Klien yang menambah gedung menandatangani proyek kedua.', 'Tipe data (<code>buildingId</code> tunggal) dan formulir proyek', 'Kontrak, tarif, dan tenggat bayar melekat pada satu lokasi.'],
    ['R3', 'Jumlah ditempatkan tidak boleh melebihi jumlah dikontrakkan.', 'Validasi simpan', 'Kelebihan penempatan adalah urusan penagihan, bukan entri data.'],
    ['R4', 'Hanya kontrak berjalan yang dapat kekurangan orang.', '<code>lib/domain</code>: <code>isLiveProject</code>', 'Kontrak ditangguhkan tidak berutang pos; menghitungnya menekan angka perusahaan.'],
    ['R5', 'Master barang tanpa jumlah; baris stok tanpa definisi. Menghapus master menghapus stoknya.', 'Model data dan aksi hapus', 'Jumlah tanpa definisi tidak berarti.'],
    ['R6', 'Satu baris stok per gudang, barang, dan batch.', 'Formulir stok', 'Baris kedua menghitung stok ganda.'],
    ['R9', 'Hak efektif = union(role aktif) + grant − revoke; revoke menang.', '<code>lib/access</code>: <code>effectivePermissions</code>', 'Pengecualian yang bisa dibatalkan diam-diam oleh perubahan role bukanlah pengecualian.'],
    ['R11', 'Sistem tidak pernah boleh terkunci dari semua orang.', '<code>wouldOrphanAdministration</code>, sebelum penulisan', 'Tanpa administrator aktif tidak ada yang dapat memperbaiki akses.'],
    ['R13', 'Satu sesi MR per periode.', 'Formulir sesi', 'Dua sesi untuk bulan yang sama memecah permintaan dan rekap menjadi kurang dari semestinya.'],
    ['R14', 'Satu divisi mengajukan tepat satu permintaan per sesi; satu barang satu baris.', 'Halaman permintaan', 'Tidak ada dua versi yang harus direkonsiliasi.'],
    ['R15', 'Hanya barang yang sudah disimpan gudang yang dapat diminta.', '<code>requestableItems</code>', 'Barang baru adalah keputusan master barang, bukan sesuatu yang dapat diciptakan permintaan.'],
    ['R17', 'Kunci ditolak selama ada permintaan masih draf.', '<code>canLockSession</code> dan dialog kunci', 'Mengunci akan membuang draf tanpa ada yang memutuskan.'],
    ['R18', 'Kunci satu arah dan membekukan sumbernya.', 'Aksi <code>lockMrSession</code>', 'Rekap selalu dapat dibaca balik ke permintaan asalnya.'],
    ['R19', 'Rekap menggabungkan per barang dan menyimpan setiap sumber.', '<code>buildPrLines</code>', 'Penggabungan bukan penjumlahan yang kehilangan bagiannya.'],
    ['R20', 'Setiap harga menyatakan dasarnya, berurutan dari yang paling berwibawa.', '<code>prLinePrice</code>', 'Angka referensi yang tampak seperti penawaran lebih buruk daripada tanpa angka.'],
    ['R21b', 'Persetujuan = pemeriksaan akhir: blocker menahan, peringatan ditampilkan.', '<code>finalCheck</code>', 'Kriteria tertulis, bukan firasat.'],
    ['R24', 'Satu pemasok satu PO; pemecahan hanya sekali dan hanya bila semua baris bersupplier.', 'Aksi <code>issuePurchaseOrders</code>', 'Sebagian kebutuhan tidak boleh diam-diam tidak pernah dipesan.'],
    ['R25', 'Syarat dan pajak disalin ke PO saat terbit.', 'Aksi terbit', 'Renegosiasi bulan depan tidak boleh menggeser jatuh tempo pesanan bulan lalu.'],
    ['R26', 'Penerimaan tidak boleh melebihi sisa pesanan; status PO diturunkan dari total.', '<code>acceptsReceipt</code>', 'Beberapa pengiriman itu normal; status yang dipilih manusia itu rawan.'],
    ['R29', 'Barang yang datang bergabung ke baris stok yang sama dengan biaya rata-rata tertimbang.', '<code>stockIn</code>', 'Satu bin dengan dua pembelian hanya dapat dijelaskan jujur oleh satu angka.'],
    ['R30', 'Harga beli terakhir dibaca dari penerimaan, bukan dari harga yang diketik di request.', '<code>lastPurchase</code>', 'Harga di request adalah keputusan; harga di penerimaan adalah fakta.'],
    ['R31', 'Pembayaran tidak boleh melebihi sisa tagihan; uang muka ditandai.', '<code>paymentProblem</code>', 'Membayar di muka adalah keputusan yang harus disengaja.'],
    ['R32', 'Tenggat bayar berjalan sejak pengiriman pertama.', '<code>paymentState</code>', 'Pemasok yang belum mengirim belum memulai jam.'],
    ['R33–34', 'Stok keluar saat kirim, masuk saat terima; kekurangan harus dijelaskan.', '<code>dispatchProblem</code>, aksi terima', 'Selisih tersimpan sebagai varians, bukan diratakan.'],
    ['R35', 'Satu proyek, satu bulan, satu invoice; pembatalan membebaskan periode.', '<code>billableProjects</code>, <code>coversPeriod</code>', 'Itulah satuan yang ditagih.'],
    ['R36', 'Invoice menagih kontrak, lalu memotong pos yang tidak dipenuhi pada tarif yang sama.', '<code>buildInvoiceLines</code>', 'Klien akan bertanya mana yang mana; biaya manajemen tidak dihitung dua kali.'],
    ['R37', 'PPN ditambah; PPh 23 dipotong klien; tarif disalin saat tagihan dibuat.', '<code>invoiceTotals</code>', 'Perubahan syarat tidak boleh menyatakan ulang tagihan yang sudah keluar.'],
    ['R41', 'Uang masuk tidak melebihi sisa; status invoice diturunkan dari saldo.', '<code>receiptProblem</code>, <code>statusAfterReceipt</code>', 'Status yang diturunkan tidak dapat salah dipilih.'],
    ['R42', 'Batas kredit bersifat penasihat dan terlihat; tidak memblokir.', '<code>clientExposure</code>', 'Menolak menagih pekerjaan yang sudah dilakukan tidak menolong siapa pun.'],
  ]
  return chapter('Aturan Bisnis dan Kontrol', () => `
    <p class="lead">Sistem ini memuat <b>${RULE_COUNT} aturan bisnis tertulis</b>. Yang penting bukan jumlahnya, melainkan <i>di mana</i> aturan itu ditegakkan: di titik input atau di fungsi domain yang dipakai bersama, bukan di rapat evaluasi bulan berikutnya.</p>
    ${callout('info', 'Cara membaca tabel', '<p>Setiap aturan memiliki ID (R1–R42) yang sama dengan <code>docs/PRD.md</code>. Kolom <i>ditegakkan di</i> menyebut berkas dan fungsi sungguhan; kolom <i>alasan</i> menyebut mengapa aturan itu ada. Hanya aturan yang paling menentukan yang dimuat di sini; daftar lengkapnya ada di PRD sumber.</p>')}
    ${h2('Aturan yang paling menentukan')}
    ${table(['ID', 'Aturan', 'Ditegakkan di', 'Alasan bisnis'], rows, { cls: 'tight' })}
    ${h2('Prinsip yang berulang di balik aturan-aturan itu')}
    <div class="cols3">
      <div class="card"><h4>Diturunkan, bukan dipilih</h4><p style="font-size:8.3pt">Status PO, status invoice, DRAFT/ASSIGNED pada request, kesehatan stok, dan pemenuhan dihitung dari fakta di bawahnya. Tidak ada tombol "ubah status" yang bisa salah ditekan.</p></div>
      <div class="card"><h4>Disalin saat terbit</h4><p style="font-size:8.3pt">Tenggat bayar, tarif PPN, dan PPh 23 disalin ke dokumen ketika terbit. Dokumen lama tidak bergeser ketika kontrak atau kebijakan berubah.</p></div>
      <div class="card"><h4>Asal-usul tidak hilang</h4><p style="font-size:8.3pt">Baris gabungan menyimpan sumbernya; PO merujuk ke baris request; penerimaan merujuk ke baris PO; potongan merujuk ke baris kebutuhan. Setiap angka dapat ditelusuri mundur.</p></div>
    </div>
  `)
}

/* =====================================================================
   Bab 7 — Sistem dalam praktik
   ===================================================================== */
export function ch7() {
  const sc = (title, who, items, out) => `
    <div class="scenario">
      <div class="hd"><span class="t">${title}</span><span class="w">${who}</span></div>
      <div class="bd"><ul class="tl">${items.map(([tm, txt]) => `<li><span class="tm">${tm}</span><p>${txt}</p></li>`).join('')}</ul></div>
      <div class="out"><b>Hasilnya.</b> ${out}</div>
    </div>`
  return chapter('Sistem dalam Praktik', () => `
    <p class="lead">Bayangkan sistem ini sudah dipakai sehari-hari. Lima skenario berikut dibangun dari data contoh yang sebenarnya ada di aplikasi — nama, angka, dan dokumen yang sama dengan tangkapan layar — tetapi alurnya adalah <b>ilustrasi penggunaan</b>, bukan hasil pengamatan lapangan.</p>
    ${callout('warn', 'Ilustrasi, bukan bukti', '<p>Tokoh dan perusahaan di bawah ini fiktif. Skenario menunjukkan apa yang dapat dilakukan sistem pada data seperti ini; waktu tempuh dan penghematan sebenarnya tidak diklaim di sini karena belum diukur (Bab 12).</p>')}

    ${sc('1 · Pagi di ruang direksi', 'Hendra Wijayanto · Direktur Operasional', [
      ['Pukul pertama', 'Membuka Dashboard. Tile pertama menjawab pertanyaan yang biasanya butuh telepon ke tiga koordinator: <b>642 dari 685 pos terisi — 94%</b>.'],
      ['Satu layar berikutnya', 'Panel <i>Needs attention</i> mengurutkan menurut tingkat keparahan; teratas <b>PRJ-2026-0005 kurang 7 orang</b> di RS Graha Medika (56 dari 63, 89%) — setiap pos kosong di sana adalah pelanggaran tingkat layanan. Di sampingnya, lini layanan Parkir ada di 87% (merah), Keamanan 94% dan Kebersihan 93% (amber).'],
      ['Tindak lanjut', 'Mengklik peringatan membuka catatan proyek. <b>Deployments</b>, diurutkan menurut selisih, menjadi daftar prioritas rekrutmen yang diteruskan ke Dewi Anggraini (HR) — alih-alih prioritas menurut siapa yang paling sering menelepon.'],
      ['Sebelum rapat', 'Kontrak yang berakhir dalam 60 hari ikut muncul sebagai peringatan (tinggi bila ≤ 30 hari) dengan catatan apakah diperpanjang otomatis atau butuh surat perpanjangan, sehingga surat dapat disiapkan sebelum masa pemberitahuan lewat.'],
    ], 'Pertanyaan pertama pagi dijawab dari satu layar, dan prioritas rekrutmen didasarkan pada selisih yang terhitung, bukan pada volume keluhan.')}

    ${sc('2 · Mengajukan kebutuhan dari ponsel', 'Nurhayati Dewi · Kepala Training Center', [
      ['Di ruang penyimpanan', 'Membuka sistem di ponsel. Ia hanya melihat <b>permintaan divisinya</b> pada sesi MR yang sedang terbuka; menu keluar dari laci.'],
      ['Baris pertama', 'Menyaring barang dengan kategori, memilih <i>Spidol Whiteboard (isi 12)</i>, jumlah 18 pack. Sistem menampilkan stok tersedia di gudang dan biaya standar sebagai perkiraan, berlabel <i>standard cost</i> karena ia tidak mengisi harga.'],
      ['Baris kedua', '<i>Kertas HVS A4 80gr</i>, 25 pack, tujuan "Kertas modul". Tidak bisa memasukkan barang yang sama dua kali; kuantitas digabung pada satu baris.'],
      ['Menutup', 'Total berjalan <b>IDR 3,278,000</b> terlihat di bar bawah. <i>Save draft</i> bila belum yakin; <i>Submit</i> bila siap. Setelah dikirim, formulir hanya-baca sampai pengadaan mengembalikannya.'],
    ], 'Tanpa berpindah ke laptop dan tanpa file yang harus dikirim lewat pesan; permintaan masuk ke sesi yang sama dengan divisi lain dan sudah berformat sama.')}

    ${sc('3 · Dari sesi terkunci sampai PO', 'Rizal Maulana · Kepala Pengadaan', [
      ['Meninjau sesi', 'Pada sesi September yang masih terbuka ia melihat 5 dari 11 divisi telah mengajukan, 2 masih draf, 1 dikembalikan, 3 belum mengajukan. Tombol <i>Lock</i> menolak dengan alasan; ia mengembalikan satu permintaan dengan catatan, sehingga pengecualian tercatat dan disengaja.'],
      ['Mengunci', 'Dialog kunci menyatakan lebih dulu apa yang akan terjadi. Hasilnya, pada contoh sesi Agustus: <b>38 baris dari 9 divisi menjadi 30 baris</b> (6 di antaranya digabung dari lebih dari satu divisi), 3,705 unit, nilai IDR 355,049,000. Setelah dikunci, sumber dibekukan.'],
      ['Memilih pemasok', 'Per baris ia memilih pemasok; sistem menampilkan <b>harga beli terakhir dari pemasok itu beserta tanggalnya</b> dan riwayat barangnya. Untuk baris tanpa pemasok yang cocok, ia mendaftarkan pemasok baru langsung dari baris itu.'],
      ['Pemeriksaan akhir', 'Pada draf PR Agustus, 12 dari 30 baris belum bersupplier: <b>12 blocker menahan persetujuan</b>. Peringatan (harga lebih dari 10% di atas pembelian terakhir, di bawah nilai pesanan minimum) ditampilkan tetapi tidak menghalangi.'],
      ['Menerbitkan', 'Setelah disetujui, satu aksi memecah request menjadi <b>satu PO per pemasok</b>. Setiap PO membawa syarat bayar dan PPN yang disalin saat itu juga.'],
    ], 'Permintaan seluruh divisi menjadi pesanan per pemasok dengan harga yang menyebut dasarnya; setiap PO terbaca balik ke divisi yang menunggu.')}

    ${sc('4 · Barang datang sebagian, sebagian ditolak', 'Lina Marlina · Admin Gudang Surabaya', [
      ['Truk datang', 'Membuka PO-2026-0007 (Sandang Mandiri, IDR 81,163,200). Dari 360 unit, pengiriman pertama berisi 180: ia mencatat surat jalan, kendaraan, bin, batch, dan kedaluwarsa. PO kini <i>Partially Received</i>, kemajuan 50%.'],
      ['Ada yang rusak', 'Unit yang ditolak diisi jumlah dan alasannya. <b>Unit itu tidak masuk stok dan tetap terutang pada PO</b>; sistem tidak mengizinkan penerimaan melebihi sisa pesanan.'],
      ['Stok dan harga', 'Satu penerimaan sekaligus menambah total diterima, memasukkan barang ke bin, dan menulis harga yang dibayar. Bila bin yang sama sudah berisi batch itu, biaya digabung rata-rata tertimbang (<i>contoh hitung:</i> 100 unit @ IDR 10,000 + 50 unit @ IDR 13,000 = 150 unit @ IDR 11,000).'],
      ['Memindahkan stok', 'Mengirim barang ke gudang lain: stok keluar saat dikirim dan berstatus <i>In transit</i> — bukan milik gudang mana pun. Bila tiba kurang dari yang dikirim, penerima <b>tidak dapat menyelesaikan</b> sebelum mengisi alasan; selisih tersimpan.'],
    ], 'Setiap perubahan jumlah punya dokumen di belakangnya; selisih ditemukan saat terjadi, bukan saat opname.')}

    ${sc('5 · Akhir bulan di keuangan', 'Maya Puspita · Finance & Billing', [
      ['Membuat tagihan', 'Memilih periode dan menjalankan satu aksi: pada data contoh terbentuk <b>12–14 draf invoice</b> (satu per proyek yang berjalan pada bulan itu). Bukan terbit — jumlah orang di baliknya masih harus dikonfirmasi koordinator.'],
      ['Memeriksa satu invoice', 'INV-2026-06-0011 untuk Sentosa Mall Surabaya: layanan sesuai kontrak, lalu <b>baris potongan untuk 11 pos yang kosong</b> senilai IDR 91,200,000. Blok pajak: subtotal IDR 984,200,000 + PPN 11% − PPh 23 2% = <b>IDR 1,072,778,000</b> yang benar-benar ditransfer klien.'],
      ['Melihat risikonya', 'Panel samping menunjukkan klien ini berutang IDR 4,291,112,000, di antaranya IDR 3,218,334,000 menunggak — <b>153% dari batas kredit</b>. Sistem tidak memblokir tagihan (aturan R42), tetapi peringatan ada di tempat keputusan diambil.'],
      ['Uang masuk', 'Pembayaran sebagian dicatat dengan referensi dan rekening; status invoice bergeser dari <i>Issued</i> ke <i>Partially paid</i> dengan sendirinya.'],
    ], 'Tagihan memotong pos kosong dengan sendirinya dan menyatakan pajaknya langkah demi langkah; keputusan menagih lebih dulu didukung angka eksposur, bukan ingatan.')}
  `)
}

/* =====================================================================
   Bab 8 — Mengapa lebih baik
   ===================================================================== */
export function ch8() {
  const row = (label, a, b, c) => {
    const cell = ([k, t], us = false) => `<td class="c ${us ? 'us' : ''}">${dot(k)}<span class="mx" style="display:inline">${t}</span></td>`
    return `<tr><td class="k" style="white-space:normal">${label}</td>${cell(a)}${cell(b)}${cell(c, true)}</tr>`
  }
  const matrix = `
    <table class="tbl matrix">
      <thead><tr><th style="width:30%">Kemampuan</th><th class="c">Spreadsheet + pesan</th><th class="c">ERP / modul generik</th><th class="c us">Sistem ini</th></tr></thead>
      <tbody>
        ${row('Pemenuhan pos seluruh perusahaan (dikontrakkan vs terisi)', ['none', 'dirakit manual'], ['half', 'perlu laporan kustom'], ['full', 'layar pertama'])}
        ${row('Kebutuhan per jabatan × shift, jumlah ≤ kontrak', ['half', 'kolom bebas'], ['half', 'modul proyek generik'], ['full', 'tipe data utama'])}
        ${row('Potongan otomatis untuk pos kosong di tagihan', ['none', 'dihitung tangan'], ['half', 'nota kredit manual'], ['full', 'baris DEDUCTION'])}
        ${row('PPN ditambah dan PPh 23 dipotong, diurai per langkah', ['half', 'sheet terpisah'], ['half', 'tergantung konfigurasi'], ['full', 'blok pajak'])}
        ${row('Konsolidasi permintaan divisi dengan sumber tersimpan', ['none', 'salin-tempel'], ['half', 'penggabungan butuh proses sendiri'], ['full', 'kunci satu arah'])}
        ${row('Harga beli terakhir sebagai fakta dari penerimaan', ['none', 'dari ingatan / nota'], ['full', 'umumnya tersedia'], ['full', 'ditulis penerimaan'])}
        ${row('Pemeriksaan sebelum memesan (blocker / peringatan tertulis)', ['none', 'tidak ada'], ['half', 'alur persetujuan generik'], ['full', 'finalCheck'])}
        ${row('PO per pemasok, penerimaan parsial, barang ditolak tetap terutang', ['none', 'manual'], ['full', 'standar'], ['full', 'standar'])}
        ${row('Hak akses berlapis, sumber izin terlihat, anti-terkunci', ['none', 'berbagi berkas'], ['half', 'RBAC umum'], ['full', '3 lapis + R11'])}
        ${row('Perilaku seragam di semua register (filter, impor, ekspor, jumlah baris)', ['half', 'bervariasi'], ['half', 'bervariasi per modul'], ['full', 'satu komponen'])}
        ${row('Ponsel untuk kepala divisi', ['half', 'lewat pesan'], ['half', 'responsif generik'], ['full', 'tata letak khusus'])}
        ${row('Kecocokan dengan bisnis outsourcing tanpa kustomisasi', ['half', 'fleksibel, tanpa aturan'], ['none', 'kustomisasi berat'], ['full', 'model data dari domain'])}
        ${row('Buku besar akuntansi, penggajian, absensi', ['none', 'tidak ada'], ['full', 'tersedia'], ['none', 'di luar cakupan'])}
        ${row('Integrasi bank, faktur pajak, SSO', ['none', 'tidak ada'], ['full', 'umumnya tersedia'], ['none', 'fase berikutnya'])}
        ${row('Siap dipakai di produksi hari ini', ['full', 'sudah dipakai'], ['full', 'ya'], ['half', 'front-end + data contoh'])}
      </tbody>
    </table>
    <div class="legend"><span><span class="dot full"></span>kuat / bawaan</span><span><span class="dot half"></span>sebagian / perlu konfigurasi</span><span><span class="dot none"></span>tidak ada / manual</span></div>`

  return chapter('Mengapa Lebih Baik dan Lebih Efisien', () => `
    <p class="lead">Pertanyaannya bukan apakah sistem ini lebih <i>besar</i> daripada ERP umum — ia jelas lebih kecil. Pertanyaannya: untuk <b>bisnis ini</b>, apa yang membuat orang bekerja lebih sedikit dan keliru lebih jarang?</p>

    ${h2('Perbandingan berbasis desain')}
    <p>Tabel berikut membandingkan tiga cara menjalankan bisnis ini. Penilaiannya adalah <b>penilaian atas desain</b>, bukan benchmark atau hasil uji produk tertentu; "ERP generik" di sini berarti modul standar yang umum, bukan produk bernama. Baris di mana sistem ini lebih lemah sengaja ditampilkan.</p>
    ${matrix}
    ${callout('info', 'Kesimpulan yang dapat dipertanggungjawabkan', '<p>Sistem ini menang pada <b>kecocokan dengan domain</b> dan pada <b>aturan yang ditegakkan di titik input</b>; ia kalah pada cakupan (akuntansi, penggajian, integrasi) dan pada kesiapan produksi. Itu bukan kelemahan yang disembunyikan, melainkan batas fase: Bab 12 menjadwalkannya.</p>')}

    ${h2('Efisiensi yang dapat dihitung dari data contoh')}
    <p>Angka berikut dihitung langsung dari data contoh yang sama dengan tangkapan layar. Mereka menunjukkan <i>mekanisme</i> penghematan; besaran di lapangan bergantung pada volume nyata.</p>
    ${stats([
      { v: '86 → 72', l: 'baris permintaan divisi menjadi baris pembelian di 3 purchase request; 14 baris tidak perlu dihargai dan dipesan dua kali', c: 'g' },
      { v: '11', l: 'barang yang diminta lebih dari satu divisi dan dibeli sebagai satu pesanan', c: 'g' },
      { v: '175 pos', l: 'kosong yang otomatis dipotong dari tagihan: IDR 1,482,900,000 pada 135 baris potongan', c: 'a' },
      { v: '12–14 / aksi', l: 'draf invoice (satu per proyek berjalan) dibuat sekaligus untuk satu periode; 52 invoice untuk 4 bulan', c: '' },
    ])}
    ${stats([
      { v: '5 dari 11', l: 'divisi sudah mengajukan pada sesi September; 3 belum mengajukan, terlihat selagi jendela masih terbuka', c: 'p' },
      { v: '12 blocker', l: 'baris tanpa pemasok tertangkap sebelum persetujuan pada PR Agustus; request tidak dapat disetujui, apalagi dipecah menjadi PO, selama masih ada', c: 'r' },
      { v: '153%', l: 'eksposur klien terhadap batas kredit tampil di invoice, tempat keputusan diambil', c: 'r' },
      { v: '107', l: 'baris riwayat harga beli dari 10 pemasok yang menjadi dasar harga, bukan ingatan staf', c: '' },
    ])}

    ${h2('Kegiatan manual yang digantikan')}
    <p>Tabel ini menggambarkan <b>praktik umum</b> pada pendekatan spreadsheet dan pesan; ini gambaran proses, bukan hasil pengamatan di Tata Gemilang.</p>
    ${table(['Kegiatan', 'Praktik umum', 'Di sistem ini'], [
      ['Menggabungkan permintaan bulanan', 'Mengumpulkan berkas atau pesan dari tiap divisi, menyalin ke satu lembar, mencari duplikat per barang, menjumlahkan; siapa meminta berapa sering hilang.', 'Divisi mengisi langsung; kunci menggabungkan dan menyimpan sumber; pratinjau rekap tersedia sebelum dikunci.'],
      ['Mencari harga', 'Membuka nota atau bertanya ke staf yang ingat.', 'Harga terakhir pemasok terpilih dan tanggalnya muncul di baris; riwayat barang satu klik.'],
      ['Menyusun PO per pemasok', 'Memilah baris per pemasok, menyalin ke dokumen PO, menghitung total dan pajak.', 'Satu aksi memecah request menjadi PO per pemasok dengan syarat tersalin.'],
      ['Mencocokkan kiriman', 'Mencatat di surat jalan, lalu memperbarui lembar stok dan lembar PO terpisah.', 'Satu penerimaan memperbarui PO, stok, dan harga bersamaan.'],
      ['Menghitung tagihan bulanan', 'Menyalin jumlah orang dari berbagai sumber, menghitung potongan dan pajak di lembar tersendiri.', 'Draf per proyek dengan potongan dan pajak terhitung; koordinator mengonfirmasi, finance menerbitkan.'],
      ['Menjawab "siapa boleh apa"', 'Membaca konfigurasi atau bertanya ke administrator.', 'Tab akses efektif pada akun menunjukkan setiap izin beserta sumbernya.'],
    ])}

    ${h2('Enam prinsip desain')}
    <div class="cols3">
      <div class="card"><h4>1 · Angka bisnis di layar pertama</h4><p style="font-size:8.3pt">Pemenuhan pos bukan laporan; ia tipe data, filter, peringatan, dan baris di tagihan.</p></div>
      <div class="card"><h4>2 · Aturan di titik input</h4><p style="font-size:8.3pt">Kesalahan ditolak ketika diketik, dengan alasan dan jalan keluarnya, bukan ditemukan saat audit.</p></div>
      <div class="card"><h4>3 · Diturunkan, bukan dipilih</h4><p style="font-size:8.3pt">Status dihitung dari fakta; tidak ada tombol yang dapat membuatnya berbohong.</p></div>
      <div class="card"><h4>4 · Menyalin, bukan membaca ulang</h4><p style="font-size:8.3pt">Syarat dan pajak dibekukan pada dokumen saat terbit; masa lalu tidak berubah karena masa kini.</p></div>
      <div class="card"><h4>5 · Pengecualian terlihat</h4><p style="font-size:8.3pt">Peringatan, override, dan revoke ditampilkan di tempat keputusan, tidak disembunyikan di pengaturan.</p></div>
      <div class="card"><h4>6 · Satu pola, banyak layar</h4><p style="font-size:8.3pt">Satu komponen tabel dan satu kamus komponen; yang dipelajari sekali berlaku di mana saja.</p></div>
    </div>

    ${h2('Batas klaim')}
    ${callout('warn', 'Yang belum dapat dinyatakan', `
      <ul style="margin:0">
        <li>Belum ada pengukuran waktu atau biaya di lapangan. Efisiensi di atas adalah <b>mekanisme yang terbukti pada data contoh</b>, bukan persentase penghematan.</li>
        <li>Perbandingan dengan ERP generik berlaku untuk modul standar, bukan produk tertentu, dan merupakan penilaian desain.</li>
        <li>Seluruh isi aplikasi ada di peramban: tidak ada keamanan sisi server, dan beberapa kontrol (mis. hak akses) bersifat antarmuka sampai backend dibangun.</li>
      </ul>`)}
  `)
}
