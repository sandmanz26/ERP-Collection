import { chapter, h2, h3, callout, stats, chip, table, esc, loc, fmt, ROOT } from './lib.mjs'
import { readFileSync } from 'node:fs'
import {
  TABLES, BY_NAME, RELATIONS, GROUPS, DIAGRAMS, ENUMS, enumValues, renderErd,
} from './schema.mjs'

const r = (id) => `<span class="rule-id">${id}</span>`
const pkg = JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8'))
const ver = (n) => (pkg.dependencies?.[n] ?? pkg.devDependencies?.[n] ?? '').replace(/^[\^~]/, '')

/* =====================================================================
   Bab 9 — Arsitektur dan struktur kode
   ===================================================================== */
export function ch9() {
  const L = {
    pages: loc('src/pages'),
    components: loc('src/components'),
    store: loc('src/store'),
    hooks: loc('src/hooks'),
    lib: loc('src/lib'),
    data: loc('src/data'),
    styles: loc('src/styles'),
    all: loc('src'),
  }
  const layer = (cls, nm, ds, sz) => `<div class="layer ${cls}"><div class="nm">${nm}</div><div class="ds">${ds}</div><div class="sz"><b>${fmt(sz.lines)}</b>${sz.files} berkas</div></div>`

  return chapter('Arsitektur dan Struktur Kode', () => `
    <p class="lead">Aplikasi dibangun sebagai lima lapisan yang masing-masing hanya bergantung ke bawah. Logika bisnis berada di fungsi murni yang dipakai bersama oleh data contoh dan tombol di layar, sehingga keduanya tidak dapat menyimpang.</p>

    ${stats([
      { v: fmt(L.all.lines), l: `baris kode TypeScript, TSX, dan CSS di <code>src/</code>` },
      { v: String(L.all.files), l: 'berkas sumber', c: 'p' },
      { v: '0', l: 'dependensi server — seluruhnya berjalan di peramban', c: 'g' },
      { v: '5', l: 'lapisan, dengan arah ketergantungan satu arah', c: 'a' },
    ])}

    ${h2('Teknologi')}
    ${table(['Lapisan', 'Pilihan', 'Versi', 'Alasan'], [
      ['UI', 'React', ver('react'), 'Komponen dan hook; ekosistem terbesar.'],
      ['Bahasa', 'TypeScript', ver('typescript'), 'Model data adalah tipe; kesalahan field tertangkap saat build.'],
      ['Build', 'Vite', ver('vite'), 'Pengembangan cepat dan keluaran statis yang dapat dihosting di mana saja.'],
      ['Routing', 'React Router', ver('react-router-dom'), 'Rute bersarang dan penjaga rute berbasis privilege.'],
      ['State', 'Zustand + persist', ver('zustand'), 'Satu store per perhatian; tersimpan di peramban dengan versi dan migrasi.'],
      ['Gaya', 'Tailwind CSS', ver('tailwindcss'), 'Token warna tunggal; dua antarmuka lewat atribut <code>data-ui</code>.'],
      ['Primitif', 'Radix UI', 'beberapa paket', 'Dialog, menu, popover, tab: aksesibel sejak awal.'],
      ['Ikon', 'lucide-react', ver('lucide-react'), 'Set ikon konsisten.'],
      ['Lint', 'oxlint', ver('oxlint'), 'Pemeriksaan cepat, termasuk aturan React.'],
      ['Verifikasi', 'Playwright', ver('playwright'), 'Pengecekan peramban pada tata letak dan alur.'],
    ])}

    ${h2('Lima lapisan')}
    <div class="layers">
      ${layer('l1', 'Halaman', '<code>src/pages</code> — satu berkas per layar: register, catatan detail, formulir. Hanya merangkai komponen, store, dan fungsi domain; tidak memuat aturan bisnis sendiri.', L.pages)}
      <div class="arrow-down">memakai ↓</div>
      ${layer('l2', 'Komponen', '<code>src/components</code> — <code>ui</code> (15 primitif: tombol, input, dialog, menu, tab…), <code>data-table</code> (tabel standar, impor, pengalih gaya), <code>layout</code> (shell, navigasi, penjaga rute, palet perintah), <code>shared</code>, <code>settings</code>.', L.components)}
      <div class="arrow-down">membaca dan menulis ↓</div>
      ${layer('l3', 'State', '<code>src/store</code> — <code>useErp</code> (20 koleksi dan aksi), <code>useAuth</code> (sesi dan akun), <code>useTableStyle</code>, <code>useInterface</code> (preferensi tampilan). Aksi memvalidasi lewat fungsi domain sebelum menulis dan mencatat ke log aktivitas.', { lines: L.store.lines + L.hooks.lines, files: L.store.files + L.hooks.files })}
      <div class="arrow-down">memanggil ↓</div>
      ${layer('l4', 'Domain', '<code>src/lib</code> — fungsi murni tanpa efek samping: <code>domain</code> (pemenuhan, margin, stok), <code>procurement</code> (rekap, harga, pemeriksaan akhir), <code>purchasing</code> (PO, penerimaan, pembayaran), <code>finance</code> (invoice, pajak, piutang), <code>access</code> (hak efektif), <code>csv</code>, <code>format</code>, <code>utils</code>.', L.lib)}
      <div class="arrow-down">berdasarkan ↓</div>
      ${layer('l5', 'Data', '<code>src/data</code> — <code>types.ts</code> (model domain, 899 baris), <code>permissions.ts</code> (katalog privilege), <code>reference.ts</code>, dan 11 berkas <code>seed-*</code> yang membangun data contoh dengan fungsi domain yang sama dengan tombol di layar.', L.data)}
    </div>

    ${h2('Struktur direktori')}
<pre class="tree"><span class="d">src/</span>
├─ <span class="d">pages/</span>                       <span class="c">layar, satu berkas per layar atau formulir</span>
│  ├─ DashboardPage.tsx · SettingsPage.tsx
│  ├─ <span class="d">auth/</span>                    <span class="c">login, daftar, lupa dan atur ulang password</span>
│  ├─ <span class="d">clients/</span>                 <span class="c">klien dan gedung (register, detail, formulir)</span>
│  ├─ <span class="d">projects/</span>                <span class="c">proyek, deployment</span>
│  ├─ <span class="d">masters/</span>                 <span class="c">posisi</span>
│  ├─ <span class="d">inventory/</span>               <span class="c">gudang, master barang, stok, perpindahan</span>
│  ├─ <span class="d">procurement/</span>             <span class="c">sesi MR → PR → PO → penerimaan → pembayaran, pemasok, divisi</span>
│  ├─ <span class="d">finance/</span>                 <span class="c">invoice, uang masuk, ringkasan keuangan</span>
│  └─ <span class="d">admin/</span>                   <span class="c">akun, role, privilege</span>
├─ <span class="d">components/</span>
│  ├─ <span class="d">ui/</span>                      <span class="c">button, input, select, dialog, menu, tabs, badge, card, toast…</span>
│  ├─ <span class="d">data-table/</span>              <span class="c">DataTable, ImportDialog, TableStyleSwitcher, types</span>
│  ├─ <span class="d">layout/</span>                  <span class="c">AppShell, nav, CommandPalette, RequireAuth, RequirePermission</span>
│  ├─ <span class="d">shared/</span>                  <span class="c">PageHeader/KpiCard, status, FulfilmentBar</span>
│  └─ <span class="d">settings/</span>                <span class="c">InterfaceChooser</span>
├─ <span class="d">store/</span>                      <span class="c">useErp · useAuth · useTableStyle · useInterface</span>
├─ <span class="d">lib/</span>                        <span class="c">fungsi domain murni: domain, procurement, purchasing, finance, access…</span>
├─ <span class="d">data/</span>                       <span class="c">types.ts · permissions.ts · reference.ts · seed-*.ts</span>
├─ <span class="d">hooks/</span>                      <span class="c">useMediaQuery</span>
├─ <span class="d">styles/</span>                     <span class="c">classic.css — antarmuka kedua</span>
├─ App.tsx · main.tsx · index.css   <span class="c">rute, titik masuk, token desain</span>
<span class="d">docs/</span>
├─ PRD.md                       <span class="c">PRD teks dengan aturan R1–R42</span>
└─ <span class="d">prd/</span>                         <span class="c">pembangkit PDF ini: skema, isi, gaya</span></pre>

    ${h2('Aliran data')}
    <div class="flow">
      <div class="step hi"><div class="who">1 · Aksi pengguna</div><div class="what">Tombol di halaman</div><div class="how">Mis. <i>Lock</i>, <i>Record payment</i>, <i>Issue invoice</i>.</div></div>
      <div class="step"><div class="who">2 · Validasi</div><div class="what">Fungsi domain</div><div class="how"><code>canLockSession</code>, <code>paymentProblem</code>, <code>receiptProblem</code> mengembalikan alasan penolakan.</div></div>
      <div class="step"><div class="who">3 · Penulisan</div><div class="what">Aksi store</div><div class="how">Satu aksi memperbarui beberapa koleksi sekaligus dan menulis log aktivitas.</div></div>
      <div class="step ok"><div class="who">4 · Tampilan</div><div class="what">Nilai diturunkan</div><div class="how">Pemenuhan, status, saldo dihitung ulang oleh fungsi domain; tidak disimpan.</div></div>
    </div>

    ${h2('Pola yang dijaga')}
    <ul>
      <li><b>Satu sumber kebenaran untuk aturan.</b> Data contoh memanggil fungsi yang sama dengan tombol (<code>buildPrLines</code>, <code>buildPurchaseOrders</code>, <code>buildInvoiceLines</code>). Karena itu data awal tidak pernah menyimpang dari apa yang akan dihasilkan aplikasi.</li>
      <li><b>Tiga aksi per entitas</b>: <code>upsert</code>, <code>remove</code>, <code>import</code>. Register menerima impor CSV yang memperbarui berdasarkan kode, bukan menggandakan.</li>
      <li><b>Kontrak kolom tabel</b> (<code>Column&lt;T&gt;</code>): <code>sortValue</code> terpisah dari <code>cell</code> (urutan menurut nilai), <code>exportValue</code> (apa yang diekspor), <code>pinned</code>, <code>defaultHidden</code>, dan <code>primary</code> (kolom yang bertahan di gaya Relaxed). Menambah register berarti mendefinisikan kolom, bukan menulis ulang tabel.</li>
      <li><b>Penegakan izin tiga lapis</b>: <code>NAV</code> memfilter menu dengan <code>useCan</code>; <code>RequirePermission</code> menjaga rute; setiap tombol aksi dirender hanya bila <code>can('modul.aksi')</code>.</li>
      <li><b>Skin lewat atribut</b>: komponen membawa <code>data-slot</code> (button, badge, card, kpi, tabs, sidebar…) sehingga <code>classic.css</code> menarget bagian yang tepat tanpa menyentuh logika.</li>
      <li><b>Persistensi bervesi</b>: store utama memakai <code>version</code> dan <code>migrate</code> yang mengembalikan data awal; perubahan skema data contoh tidak tertahan oleh data lama di peramban.</li>
    </ul>

    ${h2('Kualitas dan verifikasi')}
    ${table(['Pemeriksaan', 'Cara', 'Status'], [
      ['Tipe', '<code>tsc -b</code> mode ketat', chip('lulus', 'g')],
      ['Lint', '<code>oxlint</code> termasuk aturan React; ada peringatan yang diketahui, tidak ada error', chip('lulus', 'g')],
      ['Build produksi', '<code>vite build</code>', chip('lulus', 'g')],
      ['Alur dan tata letak', 'Skrip Playwright ad hoc: login per peran, tangkapan layar, uji lebar 360–1440 px, tidak ada overflow horizontal', chip('dilakukan manual', 'a')],
      ['Skema database vs model', 'Pemeriksaan otomatis saat membangun PDF ini (Bab 10): setiap field interface harus punya kolom', chip('otomatis', 'g')],
      ['Tes unit dan end-to-end otomatis', '<b>Belum ada</b>. Fungsi domain yang murni adalah kandidat pertama.', chip('celah', 'r')],
    ])}

    ${h2('Jalur menuju backend')}
    <p>Karena logika bisnis ada di fungsi murni TypeScript, ia dapat dijalankan ulang di server (Node) di dalam transaksi basis data tanpa ditulis ulang. Setiap aksi store menjadi satu endpoint; yang berubah hanyalah tempat aturan itu dijalankan: dari antarmuka menjadi batas keamanan sebenarnya.</p>
    ${table(['Aksi di store', 'Endpoint yang diusulkan', 'Fungsi domain yang dijalankan ulang di server'], [
      ['<code>submitMrRequest</code> · <code>reviewMrRequest</code>', '<code>POST /mr-requests/{id}/submit</code> · <code>/review</code>', 'validasi baris, <code>requestableItems</code>'],
      ['<code>lockMrSession</code>', '<code>POST /mr-sessions/{id}/lock</code>', '<code>canLockSession</code>, <code>buildPrLines</code>'],
      ['<code>assignPrSupplier</code> · <code>setPrAgreedPrice</code>', '<code>PUT /purchase-requests/{id}/lines/{line}/supplier</code> · <code>/agreed-price</code>', '<code>supplierChoices</code>, <code>prLinePrice</code>'],
      ['<code>setPrStatus</code> (setujui)', '<code>POST /purchase-requests/{id}/approve</code>', '<code>finalCheck</code>'],
      ['<code>issuePurchaseOrders</code>', '<code>POST /purchase-requests/{id}/purchase-orders</code>', '<code>buildPurchaseOrders</code>'],
      ['<code>recordGoodsReceipt</code>', '<code>POST /purchase-orders/{id}/receipts</code>', '<code>acceptsReceipt</code>, <code>stockIn</code>, <code>poStatusAfterReceipt</code>'],
      ['<code>recordPayment</code>', '<code>POST /purchase-orders/{id}/payments</code>', '<code>paymentProblem</code>'],
      ['<code>dispatchTransfer</code> · <code>receiveTransfer</code>', '<code>POST /stock-transfers/{id}/dispatch</code> · <code>/receive</code>', '<code>dispatchProblem</code>, <code>stockOut</code>, <code>stockIn</code>'],
      ['<code>generateInvoices</code>', '<code>POST /invoices:generate</code> (periode)', '<code>billableProjects</code>, <code>buildInvoiceLines</code>'],
      ['<code>issueInvoice</code> · <code>voidInvoice</code>', '<code>POST /invoices/{id}/issue</code> · <code>/void</code>', '<code>invoiceTotals</code>'],
      ['<code>recordClientReceipt</code>', '<code>POST /invoices/{id}/receipts</code>', '<code>receiptProblem</code>, <code>statusAfterReceipt</code>'],
      ['<code>upsert*</code> · <code>remove*</code> · <code>import*</code>', '<code>/clients</code>, <code>/buildings</code>, <code>/projects</code>, … (REST per sumber daya)', 'validasi per entitas, <code>wouldOrphanAdministration</code> untuk akun dan role'],
    ], { cls: 'tight' })}
  `)
}

/* =====================================================================
   Bab 10 — Pemetaan database
   ===================================================================== */
const tags = (c) => [c.pk ? '<span class="tag pk">PK</span>' : '', c.uq ? '<span class="tag uq">UQ</span>' : '', c.fk ? `<span class="tag fk">FK→${c.fk}</span>` : '', c.nullable ? '<span class="tag nl">NULL</span>' : ''].join('')

/** Which model field each child table was split out of, e.g. user_roles ← UserAccount.roleIds. */
const SPLIT_FROM = (() => {
  const m = {}
  TABLES.forEach((t) => Object.entries(t.via ?? {}).forEach(([field, child]) => { (m[child] ??= []).push(`${t.from}.${field}`) }))
  return m
})()

function dictTable(t) {
  const rows = t.columns.map((c) => `<tr><td class="c">${c.name}</td><td class="t">${c.type}</td><td class="k">${tags(c)}${c.def ? `<span class="small"> =${esc(c.def)}</span>` : ''}</td><td class="n">${esc(c.note)}</td></tr>`).join('')
  const badge = t.recommended ? ' <span class="chip a">rekomendasi</span>' : ''
  const from = t.from ? `← ${t.from}`
    : SPLIT_FROM[t.name] ? `← ${SPLIT_FROM[t.name].join(', ')}`
    : t.name === 'audit_log' ? '← ActivityLog (store)'
    : t.name === 'branches' ? 'tambahan · normalisasi'
    : 'tambahan'
  return `<div class="dict"><div class="dict-head"><span class="nm">${t.name}</span>${badge}<span class="fr">${from}</span></div><div class="dict-desc">${esc(t.desc)}</div><table class="cols"><thead><tr><th>Kolom</th><th>Tipe</th><th>Kunci</th><th>Keterangan</th></tr></thead><tbody>${rows}</tbody></table></div>`
}

export function ch10() {
  const fromModel = TABLES.filter((t) => t.from).length
  const junction = TABLES.filter((t) => t.extra && !t.recommended && t.name !== 'branches' && t.name !== 'audit_log').length
  const nCols = TABLES.reduce((a, t) => a + t.columns.length, 0)

  const constraints = [
    ['<code>ux_projects_live_building</code>', '<code>UNIQUE (building_id) WHERE status IN (\'PENDING_APPROVAL\',\'ACTIVE\')</code>', 'R1', 'indeks unik parsial'],
    ['<code>ck_requirement_deployed</code>', '<code>CHECK (deployed BETWEEN 0 AND headcount)</code>', 'R3', 'check'],
    ['<code>ux_stock_line</code>', '<code>UNIQUE (warehouse_id, item_id, COALESCE(batch_no, \'\'))</code>', 'R6', 'indeks unik'],
    ['<code>ck_stock_nonneg</code>', '<code>CHECK (qty_on_hand &gt;= 0 AND qty_reserved &gt;= 0)</code>', 'R7', 'check'],
    ['<code>ux_mr_sessions_period</code>', '<code>UNIQUE (period_year, period_month)</code>', 'R13', 'unik'],
    ['<code>ux_mr_requests_division</code>', '<code>UNIQUE (session_id, division_id)</code>', 'R14', 'unik'],
    ['<code>ux_mr_lines_item</code>', '<code>UNIQUE (request_id, item_id)</code>', 'R14', 'unik'],
    ['<code>ux_pr_session</code>', '<code>UNIQUE (session_id)</code> pada purchase_requests', 'R18', 'unik (1:1)'],
    ['<code>ux_pr_lines_item</code>', '<code>UNIQUE (request_id, item_id)</code>', 'R19', 'unik'],
    ['<code>trg_pr_line_qty</code>', 'qty = Σ pr_line_sources.qty, dievaluasi di akhir transaksi', 'R19', 'trigger tertunda'],
    ['<code>ck_po_line_received</code>', '<code>CHECK (qty_received &lt;= qty)</code>', 'R26', 'check'],
    ['<code>trg_grn_line_cap</code>', 'diterima + ditolak ≤ qty PO − Σ penerimaan sebelumnya', 'R26', 'trigger'],
    ['<code>trg_payment_cap</code>', 'Σ supplier_payments.amount ≤ total PO', 'R31', 'trigger'],
    ['<code>ux_invoice_period</code>', '<code>UNIQUE (project_id, period_year, period_month) WHERE status &lt;&gt; \'VOID\'</code>', 'R35', 'indeks unik parsial'],
    ['<code>ck_deduction_sign</code>', '<code>CHECK (kind &lt;&gt; \'DEDUCTION\' OR amount &lt;= 0)</code>', 'R36', 'check'],
    ['<code>trg_receipt_cap</code>', 'Σ client_receipts.amount ≤ total tagihan', 'R41', 'trigger'],
    ['<code>ux_client_primary</code>', '<code>UNIQUE (client_id) WHERE is_primary</code>', '—', 'indeks unik parsial'],
    ['<code>ck_company_single</code>', '<code>CHECK (id = 1)</code> pada company_profile', '—', 'check'],
    ['<code>fk_user_roles_role</code>', '<code>ON DELETE RESTRICT</code>: role yang dipakai tidak bisa dihapus', 'R12', 'FK'],
    ['<code>fk_mr_requests_division</code>', '<code>ON DELETE RESTRICT</code>: divisi dengan riwayat tidak bisa dihapus', 'R23', 'FK'],
    ['<code>fk_stock_item</code>', '<code>ON DELETE CASCADE</code>: menghapus master menghapus stoknya', 'R5', 'FK'],
    ['Layanan, bukan DB', 'Setidaknya satu akun aktif memegang <code>users.edit/create</code> dan <code>roles.edit/create</code>', 'R11', 'transaksi + penjaga di layanan'],
  ]

  const indexes = [
    ['<code>purchase_prices (item_id, supplier_id, purchased_at DESC)</code>', 'Harga beli terakhir per barang per pemasok — inti R20 dan R30'],
    ['<code>warehouse_stock (item_id)</code> · <code>(warehouse_id, item_id)</code>', 'Tersedia total per barang; stok per gudang'],
    ['<code>invoices (status, due_at)</code>', 'Piutang menunggak dan ageing'],
    ['<code>project_manpower_requirements (project_id)</code> · <code>(position_id)</code>', 'Register Deployments dan pemenuhan per jabatan'],
    ['<code>mr_requests (session_id)</code> · <code>goods_receipts (po_id)</code> · <code>supplier_payments (po_id)</code> · <code>client_receipts (invoice_id)</code>', 'Dokumen anak per induk'],
    ['<code>audit_log (entity, entity_id, at DESC)</code>', 'Riwayat satu catatan'],
  ]

  const derived = [
    ['Pemenuhan pos', 'Σ deployed ÷ Σ headcount, proyek berjalan saja', '<code>lib/domain</code> · <code>fulfilment</code>'],
    ['Selisih (gap)', 'headcount − deployed', '<code>lib/domain</code>'],
    ['Nilai bulanan · biaya · margin', 'Σ headcount × bill_rate (cost_rate)', '<code>monthlyValue</code> · <code>monthlyCost</code> · <code>monthlyMargin</code>'],
    ['Stok tersedia', 'qty_on_hand − qty_reserved', '<code>availableQty</code>'],
    ['Kesehatan stok · kedaluwarsa', 'banding dengan batas efektif (override gudang atau master)', '<code>stockStatus</code> · <code>expiryStatus</code>'],
    ['Harga baris PR dan dasarnya', 'agreed → terakhir dari pemasok → terakhir siapa pun → perkiraan tertinggi → standar', '<code>prLinePrice</code>'],
    ['Status PO (penerimaan)', 'dari Σ qty_received dan penolakan', '<code>poStatusAfterReceipt</code>'],
    ['Status pembayaran · hari menunggak', 'Σ pembayaran vs total; jam mulai pada penerimaan pertama', '<code>paymentState</code>'],
    ['Total invoice · uang yang ditransfer klien', 'subtotal + PPN − PPh 23', '<code>invoiceTotals</code>'],
    ['Status invoice setelah uang masuk', 'dari saldo', '<code>statusAfterReceipt</code>'],
    ['Eksposur klien · ageing', 'Σ sisa tagihan vs batas kredit; keranjang usia', '<code>clientExposure</code> · <code>ageingBuckets</code>'],
    ['Hak efektif akun', 'union(role aktif) + grant − revoke', '<code>effectivePermissions</code>'],
  ]

  return chapter('Pemetaan Struktur Database', () => `
    <p class="lead">Bab ini memetakan model data aplikasi ke skema relasional (PostgreSQL) yang dapat langsung dijadikan dasar backend: ${TABLES.length} tabel, ${fmt(nCols)} kolom, ${RELATIONS.length} relasi.</p>

    ${callout('warn', 'Ini rancangan, bukan database yang sedang berjalan', '<p>Aplikasi saat ini menyimpan data di peramban. Skema di bawah adalah <b>rancangan target</b>, diturunkan dari <code>src/data/types.ts</code>. Dua hal membuatnya dapat dipercaya: ia diperiksa otomatis terhadap model (setiap field pada setiap interface harus punya kolom dengan status wajib/opsional yang cocok), dan ia membedakan jujur apa yang berasal dari model dan apa yang saya <b>tambahkan</b> (ditandai <i>tambahan</i> atau <i>rekomendasi</i>).</p>')}

    ${stats([
      { v: String(TABLES.length), l: 'tabel di 5 kelompok' },
      { v: String(fromModel), l: 'tabel yang diturunkan langsung dari interface TypeScript', c: 'g' },
      { v: String(junction), l: 'tabel anak/penghubung dari field array (role, override, sertifikasi, …)', c: 'p' },
      { v: '3', l: 'tambahan: <code>branches</code> (normalisasi), <code>audit_log</code> (dari log aktivitas di store), <code>stock_movements</code> (rekomendasi)', c: 'a' },
    ])}

    ${h2('Aturan pemetaan dari model TypeScript')}
    ${table(['Di model TypeScript', 'Di database', 'Contoh'], [
      ['<code>interface Entitas</code>', 'satu tabel; <code>id uuid</code> sebagai kunci utama, <code>code</code> sebagai kunci bisnis unik', '<code>Client</code> → <code>clients</code> (<code>CLT-0001</code>)'],
      ['Field array objek (<code>lines</code>, <code>contacts</code>, <code>requirements</code>)', 'tabel anak dengan FK <code>ON DELETE CASCADE</code>', '<code>Invoice.lines</code> → <code>invoice_lines</code>'],
      ['Field array string (<code>roleIds</code>, <code>categories</code>, <code>certifications</code>)', 'tabel penghubung berkunci majemuk', '<code>UserAccount.roleIds</code> → <code>user_roles</code>'],
      ['Dua array di satu field (<code>grantedPermissions</code>, <code>revokedPermissions</code>)', 'satu tabel dengan kolom <code>effect</code>', '→ <code>user_permission_overrides</code>'],
      ['Union literal (<code>\'ACTIVE\' | \'LOCKED\'</code>)', `tipe <code>ENUM</code> PostgreSQL, nilainya dibaca langsung dari <code>types.ts</code>`, `${ENUMS.length} enum, mis. <code>invoice_status</code>`],
      ['Field opsional <code>?</code>', 'kolom <code>NULL</code>; sisanya <code>NOT NULL</code>', 'diperiksa otomatis'],
      ['Uang (<code>number</code>, rupiah penuh)', '<code>bigint</code>', '<code>unit_price</code>, <code>amount</code>'],
      ['Jumlah barang (<code>number</code>)', '<code>numeric(14,3)</code>', '<code>qty_on_hand</code>'],
      ['Tarif dan persen', '<code>numeric(5,4)</code> / <code>numeric(5,2)</code>', '<code>ppn_rate</code>, <code>management_fee_pct</code>'],
      ['<code>ISODate</code>', '<code>date</code> bila tanggal saja; <code>timestamptz</code> bila ada waktu', '<code>period_start</code> vs <code>created_at</code>'],
      ['ID teks di prototipe (<code>ses_2026_09</code>)', '<code>uuid</code>', 'kode terbaca manusia tetap di <code>code</code>'],
      ['Nama orang disimpan sebagai teks (<code>createdBy</code>)', 'FK ke <code>users</code>', '<code>created_by uuid FK</code>'],
    ], { cls: 'tight' })}

    ${h2('Diagram relasi')}
    <div class="legend"><span><b style="color:#b86a00">PK</b> kunci utama</span><span><b style="color:#1260d4">FK</b> kunci asing</span><span><b style="color:#6542c7">UQ</b> kunci bisnis unik</span><span>kaki gagak = sisi "banyak" (anak); dua garis = sisi "satu" (induk)</span><span>garis putus-putus = FK opsional (NULL)</span><span>kotak kelabu putus-putus = tabel dari diagram lain</span></div>
    ${DIAGRAMS.map((d) => `<div class="keep"><h3>${esc(d.title)}</h3><div class="erd-wrap">${renderErd(d)}</div><p class="small">${esc(d.note)}</p></div>`).join('')}

    ${h2('Constraint yang menegakkan aturan bisnis')}
    <p>Setiap constraint di bawah mewujudkan satu aturan bisnis (R-nomor) di lapisan yang tidak dapat dilewati, sehingga aturan tetap berlaku bahkan bila ada klien API lain.</p>
    ${table(['Nama', 'Definisi', 'Aturan', 'Jenis'], constraints, { cls: 'tight' })}

    ${h3('Indeks utama')}
    ${table(['Indeks', 'Melayani'], indexes, { cls: 'tight' })}

    ${h2('Nilai yang diturunkan, tidak disimpan')}
    <p>Nilai berikut sengaja <b>tidak</b> menjadi kolom; ia dihitung dari fakta di bawahnya, dengan fungsi yang sama dengan yang dipakai aplikasi sekarang. Menyimpannya hanya membuka peluang ia berbeda dari asalnya.</p>
    ${table(['Nilai', 'Rumus', 'Fungsi yang sudah ada'], derived, { cls: 'tight' })}
    <p class="small">Satu pengecualian yang disengaja: <code>purchase_order_lines.qty_received</code> disimpan sebagai cache dari Σ penerimaan agar daftar PO cepat; trigger menjaganya sama dengan jumlah yang sebenarnya.</p>

    ${h2('Enumerasi')}
    <p>Nilai enum dibaca langsung dari <code>src/data/types.ts</code> saat PDF dibangun, sehingga daftar ini tidak dapat tertinggal dari kode.</p>
    ${table(['Enum', 'Nilai'], ENUMS.map((e) => [`<code>${e[0]}</code>`, enumValues(e).map((v) => `<code>${esc(v)}</code>`).join(' ')]), { cls: 'tight' })}

    ${h2('Kamus data')}
    <p>Setiap tabel dengan seluruh kolomnya. <span class="tag pk">PK</span> kunci utama, <span class="tag fk">FK→</span> kunci asing, <span class="tag uq">UQ</span> unik, <span class="tag nl">NULL</span> boleh kosong. Sisanya <code>NOT NULL</code>. Tanda <code>← Tipe</code> menunjuk interface TypeScript asalnya; untuk tabel anak, field array tempat ia dipecah.</p>
    ${GROUPS.map((g) => `${h3(g.title)}${g.tables.map((n) => dictTable(BY_NAME[n])).join('')}`).join('')}

    ${h2('Catatan migrasi dari prototipe')}
    <ul>
      <li><b>ID</b>: dari string yang terbaca manusia (<code>ses_2026_09</code>) menjadi <code>uuid</code>; kode bisnis (<code>MR-2026-09</code>) tetap ada dan unik.</li>
      <li><b>Array tertanam</b> menjadi tabel anak; urutan baris bila penting perlu kolom <code>position</code>.</li>
      <li><b>Password</b>: prototipe menyimpan password di klien hanya untuk demo. Backend menyimpan hash Argon2id dan token reset sebagai hash.</li>
      <li><b>Penomoran dokumen</b> (<code>PO-2026-0001</code>) memerlukan sekuens per jenis dan tahun yang aman terhadap konkurensi; di prototipe ia dihitung di klien.</li>
      <li><b>Waktu</b>: <code>timestamptz</code> dalam UTC, ditampilkan WIB; periode tagihan memakai <code>(tahun, bulan)</code> bukan tanggal.</li>
      <li><b>Cakupan cabang</b>: <code>user_branch_scope</code> menjadi filter wajib di setiap kueri daftar (row-level security atau lapisan kueri).</li>
      <li><b>Data awal</b>: <code>permissions</code> disinkronkan dari kode saat deploy; <code>seed-*</code> hanya untuk lingkungan demo.</li>
    </ul>
  `)
}

/* =====================================================================
   Bab 11 — Keamanan dan non-fungsional
   ===================================================================== */
export function ch11() {
  return chapter('Keamanan, Kepatuhan, dan Persyaratan Non-Fungsional', () => `
    ${h2('Keamanan')}
    ${table(['Area', 'Yang sudah ada di prototipe', 'Yang wajib ada di produksi'], [
      ['Autentikasi', 'Login, registrasi dibatasi domain perusahaan, kebijakan password 10 karakter, kunci akun 5 gagal / 15 menit, reset 30 menit sekali pakai, respons seragam untuk email tak dikenal', 'Verifikasi sisi server, hash Argon2id, pembatasan laju, 2FA sungguhan, SSO'],
      ['Otorisasi', 'Tiga lapis di antarmuka: menu, rute, kontrol; hak efektif dengan sumber terlihat', '<b>Penegakan di server pada setiap endpoint</b>; antarmuka hanya kemudahan'],
      ['Pemisahan data', 'Cakupan cabang pada akun', 'Row-level security atau filter wajib pada kueri'],
      ['Audit', 'Log aktivitas create/update/delete/import; perubahan privilege tercatat sebagai penambahan dan pencabutan', 'Log yang tidak dapat diubah, disimpan di server, dengan retensi'],
      ['Ekspor', 'Ekspor adalah privilege tersendiri karena mengeluarkan data dari sistem', 'Pencatatan setiap ekspor di audit log'],
      ['Pengaman operasional', 'Sistem tidak dapat terkunci dari semua administrator (R11); role terpakai tidak dapat dihapus (R12)', 'Dipertahankan sebagai transaksi di layanan'],
    ], { cls: 'tight' })}
    ${callout('risk', 'Batas keamanan prototipe', '<p>Karena seluruh data dan seluruh pemeriksaan hak akses berada di peramban, <b>prototipe ini bukan batas keamanan</b>. Siapa pun yang mengakses konsol peramban dapat membaca atau mengubah data lokalnya. Ini bukan cacat; ini cakupan fase 1 yang dinyatakan di PRD, dan menjadi syarat nomor satu sebelum data nyata dimasukkan.</p>')}

    ${h2('Kepatuhan dan perpajakan')}
    <ul>
      <li><b>PPN</b> ditambahkan dan <b>PPh 23</b> dipotong klien; tarif disalin ke invoice saat dibuat (R37). Klien non-PPN tidak mendapat baris PPN bernilai nol.</li>
      <li><b>Data pribadi</b>: prototipe hanya memuat kontak bisnis fiktif. Pada saat nama pekerja, sertifikat, dan absensi masuk (fase berikutnya), pengelolaannya harus selaras dengan UU Pelindungan Data Pribadi.</li>
      <li><b>Faktur pajak dan pelaporan</b> berada di luar cakupan fase ini; invoice menyediakan dasar angkanya (DPP, PPN, PPh 23) tetapi belum menerbitkan dokumen pajak.</li>
    </ul>

    ${h2('Persyaratan non-fungsional')}
    ${table(['Kategori', 'Persyaratan', 'Keadaan saat ini'], [
      ['Peramban', 'Peramban modern versi terkini (Chromium, Firefox, Safari)', 'Diverifikasi pada Chromium'],
      ['Responsif', 'Tidak ada overflow horizontal pada halaman mana pun dari 360 px; pengajuan MR memiliki tata letak ponsel khusus', 'Terverifikasi pada 360, 390, 430, 768, 1024, 1280, 1440 px'],
      ['Performa', 'Register 25 baris per halaman dengan pencarian, urut, dan filter tetap responsif pada volume nyata (puluhan ribu baris)', 'Berjalan di klien pada data contoh (≈ 150 baris stok, 136 baris kebutuhan); <b>belum diukur secara formal</b>. Di produksi, pencarian, urut, dan penomoran halaman harus di sisi server'],
      ['Aksesibilitas', 'Ikon-tombol berlabel (<code>aria-label</code>), fokus terlihat, pilihan antarmuka berbentuk radio, kontras label pada Classic dijaga', 'Sebagian; audit aksesibilitas penuh belum dilakukan'],
      ['Lokalisasi', 'Navigasi dan label berbahasa Inggris; isi data berbahasa Indonesia; uang selalu ditulis penuh; tanggal <code>dd MMM yyyy</code>', 'Sesuai'],
      ['Ketersediaan data', 'Data contoh dapat dipulihkan dengan satu tindakan (<i>Reset demo data</i>)', 'Hanya untuk demo'],
      ['Pemeliharaan', 'Model data tunggal; aturan di fungsi murni; skin kedua tanpa menduplikasi halaman', 'Sesuai; belum ada tes otomatis'],
    ], { cls: 'tight' })}
  `)
}

/* =====================================================================
   Bab 12 — Metrik, pilot, roadmap
   ===================================================================== */
export function ch12() {
  return chapter('Metrik, Rencana Pilot, dan Roadmap', () => `
    ${h2('Cara keberhasilan akan dinilai')}
    <p>Karena belum ada pengukuran lapangan, yang ditulis di sini adalah <b>apa yang akan diukur dan bagaimana</b>. Baseline diambil dalam dua minggu sebelum pilot; target adalah usulan yang harus disepakati bersama pengguna, bukan janji.</p>
    ${table(['Metrik', 'Definisi', 'Baseline', 'Usulan target pilot'], [
      ['Waktu dari sesi MR ditutup sampai PO pertama terbit', 'Selisih jam kerja antara kunci dan PO terbit', 'diukur pra-pilot', 'disepakati di awal pilot'],
      ['Porsi baris PR yang harganya berbasis pembelian terakhir', 'Baris dengan dasar "last purchase" ÷ seluruh baris', 'diukur pra-pilot', 'meningkat dari baseline'],
      ['Invoice yang dikoreksi setelah terbit', 'Invoice VOID atau dikoreksi ÷ invoice terbit', 'diukur pra-pilot', 'menurun dari baseline'],
      ['Umur rata-rata piutang (DSO)', 'Rata-rata hari dari terbit sampai lunas', 'diukur pra-pilot', 'menurun dari baseline'],
      ['Pos kosong lebih dari 7 hari', 'Jumlah baris kebutuhan dengan selisih berumur > 7 hari', 'diukur pra-pilot', 'menurun dari baseline'],
      ['Barang ditolak yang tertangkap saat penerimaan', 'Unit ditolak tercatat ÷ unit diterima', 'diukur pra-pilot', 'tercatat 100% (bukan dikurangi)'],
      ['Adopsi', 'Pengguna aktif mingguan per peran; permintaan divisi yang diajukan dari ponsel', 'tidak ada', 'meningkat tiap minggu'],
    ], { cls: 'tight' })}

    ${h2('Rencana pilot')}
    <div class="flow">
      <div class="step"><div class="who">Minggu −2 sampai 0</div><div class="what">Baseline</div><div class="how">Ukur metrik di atas dengan cara kerja saat ini; kumpulkan data nyata untuk impor.</div></div>
      <div class="step hi"><div class="who">Minggu 1–2</div><div class="what">Backend dan impor</div><div class="how">Skema Bab 10; autentikasi; impor klien, gedung, proyek, posisi, barang.</div></div>
      <div class="step hi"><div class="who">Minggu 3–6</div><div class="what">Satu siklus penuh</div><div class="how">Satu sesi MR, satu siklus PR → PO → penerimaan → pembayaran; satu periode invoice.</div></div>
      <div class="step ok"><div class="who">Minggu 7</div><div class="what">Evaluasi</div><div class="how">Bandingkan dengan baseline; putuskan perluasan.</div></div>
    </div>

    ${h2('Roadmap')}
    ${table(['Fase', 'Isi', 'Mengapa urutannya begini'], [
      ['<b>2 · Fondasi produksi</b>', 'Backend dan basis data (Bab 10), autentikasi server dan SSO, penegakan izin di server, notifikasi (batas masa pemberitahuan kontrak, tenggat bayar), tes otomatis untuk fungsi domain', 'Tanpa ini tidak ada data nyata yang boleh masuk.'],
      ['<b>3 · Personel</b>', 'Pekerja bernama, sertifikat dan kedaluwarsanya, penugasan ke baris kebutuhan', 'Mengubah pemenuhan dari angka yang diketik menjadi angka yang dibuktikan.'],
      ['<b>4 · Absensi</b>', 'Konfirmasi pos harian per shift', 'Mengubah pemenuhan dari klaim bulanan menjadi fakta harian dan memberi dasar potongan tingkat layanan.'],
      ['<b>5 · Pengeluaran dan opname</b>', 'Pengeluaran barang ke lokasi dan perhitungan fisik stok; buku besar stok (<code>stock_movements</code>)', 'Menutup tempat terakhir di mana jumlah berubah tanpa dokumen.'],
      ['<b>6 · Buku besar dan pajak</b>', 'Posting ke akuntansi; faktur pajak; rekonsiliasi bank', 'Invoice dan pembayaran kini ada di kedua sisi, tetapi belum diposting ke mana pun.'],
    ], { cls: 'tight' })}

    ${h2('Risiko dan asumsi')}
    ${table(['Risiko / asumsi', 'Dampak', 'Mitigasi'], [
      ['Prototipe disalahartikan sebagai sistem produksi', 'Data nyata masuk tanpa keamanan server', 'Dinyatakan di Bab 1 dan 11; fase 2 sebelum data nyata'],
      ['Aturan bisnis berbeda dari praktik sebenarnya', 'Pengguna merasa dihalangi', 'Aturan bertanda R-nomor dapat ditinjau satu per satu; peringatan dibedakan dari blocker'],
      ['Data awal berkualitas rendah', 'Pemenuhan dan invoice salah sejak hari pertama', 'Impor dengan pemetaan dan validasi per bidang; pratinjau sebelum menerapkan'],
      ['Resistensi pindah dari spreadsheet', 'Adopsi rendah', 'Pengalaman seragam; tata letak ponsel; dua tampilan sesuai kebiasaan; pelatihan per peran'],
      ['Tidak ada tes otomatis', 'Regresi pada aturan bisnis', 'Tes unit pada fungsi domain murni adalah pekerjaan pertama fase 2'],
      ['Asumsi tarif pajak (PPN 11%, PPh 23 2%)', 'Salah bila tarif atau perlakuan klien berubah', 'Tarif per klien dan disalin saat terbit; ditinjau dengan konsultan pajak sebelum produksi'],
    ], { cls: 'tight' })}
  `)
}
