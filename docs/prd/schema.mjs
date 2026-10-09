/* ------------------------------------------------------------------
   The database mapping for the PRD — written once, used three ways:

     1. checked against src/data/types.ts, so a field the TypeScript model has
        and the schema forgot is caught at build time rather than in review;
     2. rendered as the data dictionary;
     3. drawn as the entity-relationship diagrams.

   Columns are a small DSL, one per line:

       name  type[?]  [PK] [UQ] [FK:table] [DEF=value]  | note

   A trailing `?` on the type means the column is nullable. Everything else is
   NOT NULL, which is how the TypeScript model reads (an optional field is `?`).
   ------------------------------------------------------------------ */

const T = (name, from, desc, cols, opts = {}) => ({ name, from, desc, cols, ...opts })

/* ================= tables ================= */

export const TABLES = [
  /* ---------- A. Akses & identitas ---------- */
  T('permissions', 'PermissionDef', 'Katalog privilege. Didefinisikan di kode (data/permissions.ts) dan disalin ke tabel ini saat deploy sebagai referensi hanya-baca; tidak pernah dibuat pengguna.', `
    key text PK | <modul>.<aksi>, mis. projects.approve
    module permission_module | Satu dari 24 modul
    action text
    label text
    description text
    risk permission_risk | LOW / MEDIUM / HIGH — dasar peringatan di editor role
  `),
  T('roles', 'Role', 'Paket privilege yang diberi nama. Role adalah data; privilege di dalamnya bukan.', `
    id uuid PK
    code text UQ | mis. OPERATION_MANAGER
    name text
    description text
    is_system boolean DEF=false | Role bawaan: tidak bisa dihapus (R11)
    status active_status | Role INACTIVE tidak memberi apa pun (R10)
    created_at timestamptz
    updated_at timestamptz
    updated_by uuid FK:users
  `, { via: { permissions: 'role_permissions' } }),
  T('role_permissions', null, 'Isi sebuah role. Role hanya memberi (grant), tidak pernah menolak.', `
    role_id uuid PK FK:roles
    permission_key text PK FK:permissions
  `, { extra: true }),
  T('users', 'UserAccount', 'Akun yang dapat masuk. Hak akses efektif = union(role aktif) + grant − revoke (R9).', `
    id uuid PK
    email citext UQ | Huruf kecil, dibatasi domain perusahaan saat registrasi
    password_hash text | Argon2id. Prototipe menyimpan password di klien hanya untuk demo
    full_name text
    job_title text
    status user_status
    division_id uuid? FK:divisions | Halaman pengajuan MR hanya menampilkan divisi ini
    branch_code text? FK:branches
    phone text?
    failed_attempts smallint DEF=0 | 5 gagal → terkunci 15 menit
    locked_until timestamptz?
    must_change_password boolean DEF=false
    two_factor_enabled boolean DEF=false
    last_login_at timestamptz?
    created_at timestamptz
  `, { alias: { password: 'password_hash' }, via: { roleIds: 'user_roles', grantedPermissions: 'user_permission_overrides', revokedPermissions: 'user_permission_overrides', branchScope: 'user_branch_scope' } }),
  T('user_roles', null, 'Role yang dipegang sebuah akun (satu akun boleh banyak role).', `
    user_id uuid PK FK:users
    role_id uuid PK FK:roles | ON DELETE RESTRICT — role yang masih dipakai tidak bisa dihapus (R12)
  `, { extra: true }),
  T('user_permission_overrides', null, 'Lapisan pengecualian per orang. REVOKE menang atas GRANT dan atas role.', `
    user_id uuid PK FK:users
    permission_key text PK FK:permissions
    effect override_effect | GRANT = diberikan di atas role; REVOKE = dicabut walau role memberi
  `, { extra: true }),
  T('user_branch_scope', null, 'Cabang yang datanya boleh dilihat akun. Tanpa baris = semua cabang.', `
    user_id uuid PK FK:users
    branch_code text PK FK:branches
  `, { extra: true }),
  T('branches', null, 'Referensi cabang (JKT, BDG, SBY, …). Di prototipe berupa string bebas; di basis data dijadikan tabel agar tidak ada kode cabang yatim.', `
    code text PK | JKT, BDG, SBY
    name text
  `, { extra: true }),
  T('password_reset_tokens', 'PasswordResetToken', 'Tautan atur-ulang password: berlaku 30 menit, sekali pakai.', `
    token_hash text PK | Yang disimpan hash-nya, bukan token yang dikirim ke email
    user_id uuid FK:users
    issued_at timestamptz
    expires_at timestamptz
    used boolean DEF=false
  `, { alias: { token: 'token_hash', email: 'user_id' } }),
  T('audit_log', null, 'Jejak audit: setiap create, update, delete, import. Perubahan privilege dicatat sebagai apa yang ditambah dan dicabut.', `
    id uuid PK
    at timestamptz
    actor_id uuid? FK:users | Kosong untuk aksi sistem
    action text | Created / Updated / Deleted / Imported
    entity text
    entity_id uuid?
    detail text
  `, { alias: { actor: 'actor_id' }, extra: true, from: null }),

  /* ---------- B. Klien, gedung, proyek, posisi ---------- */
  T('clients', 'Client', 'Perusahaan yang menandatangani dan membayar. Syarat komersial disimpan sekali dan diwariskan ke proyek baru.', `
    id uuid PK
    code text UQ | CLT-0001
    legal_name text
    brand_name text?
    industry text
    tier client_tier
    status client_status
    npwp text?
    address text
    city text
    province text
    postal_code text?
    phone text?
    email text?
    website text?
    payment_term_days smallint | Jatuh tempo invoice; disalin ke invoice saat diterbitkan (R37)
    invoice_day smallint | Tanggal tagih tiap bulan
    ppn_applicable boolean
    pph23_withheld boolean
    credit_limit bigint | IDR; penasihat, tidak memblokir invoice (R42)
    account_manager text
    client_since date
    notes text?
    created_at timestamptz
    updated_at timestamptz
  `, { via: { contacts: 'client_contacts' } }),
  T('client_contacts', 'Contact', 'Orang yang dihubungi di klien. Tepat satu yang primary (partial unique index).', `
    id uuid PK
    client_id uuid FK:clients | ON DELETE CASCADE
    name text
    position text
    email text
    phone text
    is_primary boolean DEF=false
  `, { alias: {} }),
  T('buildings', 'Building', 'Lokasi fisik yang dilayani proyek. Satu klien banyak gedung.', `
    id uuid PK
    code text UQ | BLD-0001
    client_id uuid FK:clients
    name text
    type building_type
    address text
    city text
    province text
    postal_code text?
    floors smallint
    area_sqm numeric(10,2)
    operating_hours operating_hours
    shift_pattern shift_pattern
    pic_name text
    pic_phone text
    pic_email text?
    access_note text?
    status active_status
    created_at timestamptz
  `),
  T('positions', 'Position', 'Master apa yang bisa ditempatkan: jabatan, tarif gaji, dan tarif tagih default.', `
    id uuid PK
    code text UQ | POS-SEC-001
    name text
    service_type service_type
    grade position_grade
    description text
    min_education text
    min_experience_years smallint
    base_salary bigint | IDR per bulan
    allowance bigint
    default_bill_rate bigint | Harus melebihi biaya penuh (gaji + tunjangan + BPJS + THR)
    status active_status
  `, { via: { certifications: 'position_certifications', standardIssue: 'position_standard_issue' } }),
  T('position_certifications', null, 'Sertifikasi yang disyaratkan jabatan (Gada Pratama, K3 Umum, SIM A, …).', `
    position_id uuid PK FK:positions
    certification text PK
  `, { extra: true }),
  T('position_standard_issue', 'StandardIssue', 'Perlengkapan standar yang diterima setiap orang saat ditempatkan.', `
    position_id uuid PK FK:positions
    item_id uuid PK FK:items | Prototipe menyimpan SKU; basis data memakai kunci asing
    qty_per_person numeric(10,2)
  `, { alias: { sku: 'item_id' } }),
  T('projects', 'Project', 'Satu kontrak untuk satu gedung dan satu periode. Penghasilan = headcount × tarif.', `
    id uuid PK
    code text UQ | PRJ-2026-0001
    name text
    client_id uuid FK:clients
    building_id uuid FK:buildings | Tepat satu gedung (R1)
    contract_no text
    status project_status
    period_start date
    period_end date
    project_manager text
    site_supervisor text?
    payment_term_days smallint
    management_fee_pct numeric(5,2) | Sudah terkandung di tarif tagih; bukan baris invoice sendiri (R36)
    auto_renew boolean
    renewal_notice_days smallint
    notes text?
    created_at timestamptz
    updated_at timestamptz
  `, { via: { requirements: 'project_manpower_requirements' } }),
  T('project_manpower_requirements', 'ManpowerRequirement', 'Satu baris kebutuhan: jabatan × shift × jumlah orang. Selisih headcount − deployed adalah angka yang dijalankan bisnis.', `
    id uuid PK
    project_id uuid FK:projects | ON DELETE CASCADE
    position_id uuid FK:positions
    headcount smallint | Dikontrakkan
    deployed smallint | Hadir di lokasi; CHECK deployed ≤ headcount (R3)
    shift shift
    work_days_per_week smallint
    hours_per_shift smallint
    bill_rate bigint | Per orang per bulan
    cost_rate bigint
    note text?
  `),

  /* ---------- C. Inventori ---------- */
  T('items', 'InventoryItem', 'Master barang: definisi sebuah benda, disimpan sekali, tanpa jumlah. Jumlah ada di warehouse_stock (R5).', `
    id uuid PK
    sku text UQ | ITM-UNI-0001
    name text
    description text?
    category item_category
    sub_category text?
    uom uom
    brand text?
    variant text?
    barcode text?
    standard_cost bigint | IDR; dasar penilaian stok
    min_stock numeric(14,3)
    max_stock numeric(14,3)
    reorder_point numeric(14,3)
    reorder_qty numeric(14,3)
    track_batch boolean
    has_expiry boolean
    shelf_life_days smallint?
    hazardous boolean
    default_supplier_id uuid? FK:suppliers
    lead_time_days smallint
    status item_status
    created_at timestamptz
    updated_at timestamptz
    updated_by uuid FK:users
  `, { alias: { defaultSupplier: 'default_supplier_id' }, via: { serviceTypes: 'item_service_types' } }),
  T('item_service_types', null, 'Lini layanan yang memakai barang ini.', `
    item_id uuid PK FK:items
    service_type service_type PK
  `, { extra: true }),
  T('warehouses', 'Warehouse', 'Tempat stok disimpan: pusat, regional, atau gudang lokasi.', `
    id uuid PK
    code text UQ | WH-JKT-01
    name text
    type warehouse_type
    address text
    city text
    province text
    manager_name text
    phone text
    capacity_sqm numeric(10,2)
    status active_status
    opened_at date
    notes text?
  `),
  T('warehouse_stock', 'WarehouseStock', 'Satu barang, di satu gudang, di satu bin. Memuat jumlah, bukan definisi.', `
    id uuid PK
    warehouse_id uuid FK:warehouses | ON DELETE CASCADE
    item_id uuid FK:items | ON DELETE CASCADE — jumlah tanpa definisi tidak berarti (R5)
    bin_location text
    qty_on_hand numeric(14,3) | CHECK ≥ 0
    qty_reserved numeric(14,3) | Sudah dijanjikan ke proyek; tersedia = on_hand − reserved (R7)
    min_stock_override numeric(14,3)? | Menimpa batas master untuk gudang ini (R8)
    batch_no text?
    expiry_date date?
    unit_cost bigint | Biaya rata-rata tertimbang (R29)
    condition stock_condition
    last_counted_at timestamptz?
    last_movement_at timestamptz?
  `),
  T('stock_movements', null, 'REKOMENDASI — belum ada di prototipe. Buku besar stok yang tidak bisa diubah: setiap perubahan jumlah punya dokumen di belakangnya (penerimaan, transfer, penyesuaian). Menjadi dasar audit dan rekonsiliasi.', `
    id uuid PK
    stock_id uuid FK:warehouse_stock
    warehouse_id uuid FK:warehouses
    item_id uuid FK:items
    movement_type text | RECEIPT, REJECT, TRANSFER_OUT, TRANSFER_IN, ADJUST
    qty_delta numeric(14,3) | Positif masuk, negatif keluar
    unit_cost bigint
    source_type text | goods_receipts / stock_transfers / …
    source_id uuid
    at timestamptz
    actor_id uuid FK:users
  `, { extra: true, recommended: true }),
  T('stock_transfers', 'StockTransfer', 'Perpindahan barang antar gudang. Di perjalanan, barang bukan milik gudang mana pun (R33).', `
    id uuid PK
    code text UQ | TRF-2026-0001
    from_warehouse_id uuid FK:warehouses
    to_warehouse_id uuid FK:warehouses
    status transfer_status
    reason text
    requested_by uuid FK:users
    created_at timestamptz
    updated_at timestamptz
    dispatched_at timestamptz?
    dispatched_by uuid? FK:users
    expected_at date?
    received_at timestamptz?
    received_by uuid? FK:users
    to_bin_location text?
    note text?
  `, { via: { lines: 'stock_transfer_lines' } }),
  T('stock_transfer_lines', 'StockTransferLine', 'Baris sumber yang persis: batch dan biaya ikut berpindah bersama barang.', `
    id uuid PK
    transfer_id uuid FK:stock_transfers | ON DELETE CASCADE
    item_id uuid FK:items
    stock_id uuid FK:warehouse_stock | Baris stok asal
    qty numeric(14,3)
    qty_received numeric(14,3)? | Kurang dari qty = selisih yang wajib dijelaskan (R34)
    variance_reason text?
    batch_no text?
    expiry_date date?
    unit_cost bigint
    note text?
  `, { alias: { transferId: 'transfer_id' }, columnOnly: ['transfer_id'] }),

  /* ---------- D. Pengadaan ---------- */
  T('divisions', 'Division', 'Pusat biaya yang boleh mengajukan permintaan. Divisi dengan riwayat permintaan tidak bisa dihapus (R23).', `
    id uuid PK
    code text UQ | DIV-OPS
    name text
    head_user_id uuid? FK:users | Akun yang bertanggung jawab atas anggaran
    head_name text
    cost_center text
    branch_code text FK:branches
    email text?
    status active_status
    notes text?
    created_at timestamptz
  `),
  T('suppliers', 'Supplier', 'Pemasok beserta syarat dan kinerja: peringkat, ketepatan waktu, status.', `
    id uuid PK
    code text UQ | SUP-0001
    legal_name text
    brand_name text?
    pic_name text
    pic_phone text
    pic_email text?
    address text
    city text
    province text
    npwp text?
    payment_term_days smallint
    lead_time_days smallint
    min_order_value bigint?
    bank_name text?
    bank_account text?
    rating numeric(2,1) | 1–5, diisi pembelian setelah tiap pengiriman
    on_time_rate numeric(5,2) | % pengiriman tepat waktu
    status supplier_status | BLACKLISTED tidak pernah ditawarkan; ON_HOLD tidak bisa dipilih (R21)
    supplier_since date
    notes text?
  `, { via: { categories: 'supplier_categories' } }),
  T('supplier_categories', null, 'Kategori barang yang disetujui untuk pemasok. Memilih di luar kategori boleh, tetapi tidak pernah diam-diam (R21).', `
    supplier_id uuid PK FK:suppliers
    category item_category PK
  `, { extra: true }),
  T('purchase_prices', 'PurchasePrice', 'Harga yang benar-benar dibayar, per pemasok per barang per PO. Satu-satunya sumber "harga beli terakhir": fakta, bukan keputusan (R30).', `
    id uuid PK
    supplier_id uuid FK:suppliers
    item_id uuid FK:items
    unit_price bigint
    qty numeric(14,3)
    po_number text | Tidak selalu PO di sistem — harga lama bisa dimasukkan manual
    purchased_at date
    note text?
  `),
  T('mr_sessions', 'MrSession', 'Jendela bulanan tempat divisi mengajukan. Dikunci satu arah menjadi satu purchase request (R18).', `
    id uuid PK
    code text UQ | MR-2026-09
    title text
    period_month smallint
    period_year smallint | UNIQUE (period_year, period_month) — satu sesi per periode (R13)
    opens_at date
    closes_at date
    status mr_session_status
    created_by uuid FK:users
    created_at timestamptz
    locked_at timestamptz?
    locked_by uuid? FK:users
    purchase_request_id uuid? FK:purchase_requests | Terisi saat sesi dikunci
    note text?
  `),
  T('mr_requests', 'MrRequest', 'Permintaan satu divisi dalam satu sesi. Satu divisi, satu permintaan (R14).', `
    id uuid PK
    code text UQ | MR-2026-09/DIV-GA
    session_id uuid FK:mr_sessions
    division_id uuid FK:divisions
    status mr_request_status
    submitted_by uuid? FK:users
    submitted_at timestamptz?
    reviewed_by uuid? FK:users
    reviewed_at timestamptz?
    return_reason text? | Mengapa dikembalikan, agar divisi tahu apa yang diubah
    note text?
    created_at timestamptz
    updated_at timestamptz
  `, { via: { lines: 'mr_request_lines' } }),
  T('mr_request_lines', 'MrRequestLine', 'Satu baris = satu barang. Hanya barang yang sudah ada di master dan disimpan di gudang (R15).', `
    id uuid PK
    request_id uuid FK:mr_requests | ON DELETE CASCADE
    item_id uuid FK:items
    qty numeric(14,3) | CHECK > 0
    estimated_unit_price bigint? | Opsional; bila kosong, standard cost dipakai dan diberi label (R16)
    purpose text | Pembelian memutuskan berdasarkan kalimat ini
    note text?
  `, { alias: { requestId: 'request_id' }, columnOnly: ['request_id'] }),
  T('purchase_requests', 'PurchaseRequest', 'Rekap satu sesi terkunci: satu baris per barang, siapa pun yang meminta. Dibuat oleh kunci, tidak pernah manual.', `
    id uuid PK
    code text UQ | PR-2026-09-001
    session_id uuid UQ FK:mr_sessions | 1:1 dengan sesi (R18)
    status purchase_request_status | DRAFT↔ASSIGNED diturunkan dari kelengkapan pemasok (R22)
    created_by uuid FK:users
    created_at timestamptz
    updated_at timestamptz
    approved_by uuid? FK:users
    approved_at timestamptz?
    note text?
  `, { via: { lines: 'purchase_request_lines' } }),
  T('purchase_request_lines', 'PurchaseRequestLine', 'Satu baris per barang. qty = Σ sumber (R19). Memuat pemasok dan harga yang disepakati.', `
    id uuid PK
    request_id uuid FK:purchase_requests | ON DELETE CASCADE
    item_id uuid FK:items
    qty numeric(14,3) | Σ pr_line_sources.qty
    supplier_id uuid? FK:suppliers | Menentukan harga beli terakhir yang muncul
    agreed_unit_price bigint? | Menimpa harga terakhir; dikosongkan saat pemasok diganti (R21)
    note text?
  `, { alias: { requestId: 'request_id' }, columnOnly: ['request_id'], via: { sources: 'pr_line_sources' } }),
  T('pr_line_sources', 'PrLineSource', 'Jejak balik ke peminta: divisi mana meminta berapa untuk baris gabungan ini. Penggabungan tidak pernah menjadi jumlah yang kehilangan bagiannya.', `
    pr_line_id uuid PK FK:purchase_request_lines | ON DELETE CASCADE
    request_id uuid PK FK:mr_requests
    division_id uuid FK:divisions
    qty numeric(14,3)
    estimated_unit_price bigint?
  `),
  T('purchase_orders', 'PurchaseOrder', 'Satu pemasok, satu PO — dokumen yang diberikan ke pemasok dan menjadi dasar tagihannya.', `
    id uuid PK
    code text UQ | PO-2026-0001
    supplier_id uuid FK:suppliers
    purchase_request_id uuid? FK:purchase_requests | Sumber pemecahan
    session_id uuid? FK:mr_sessions
    status purchase_order_status | Diturunkan dari total penerimaan, tidak dipilih (R26)
    warehouse_id uuid FK:warehouses
    ordered_at date
    expected_at date | ordered_at + lead time pemasok; ukuran "terlambat"
    payment_term_days smallint | Disalin saat terbit (R25)
    tax_rate numeric(5,4) | PPN, disalin saat terbit (R25)
    created_by uuid FK:users
    created_at timestamptz
    updated_at timestamptz
    closed_at timestamptz?
    close_reason text?
    note text?
  `, { via: { lines: 'purchase_order_lines' } }),
  T('purchase_order_lines', 'PurchaseOrderLine', 'Barang yang dipesan, harga saat dipesan, dan total diterima berjalan.', `
    id uuid PK
    po_id uuid FK:purchase_orders | ON DELETE CASCADE
    item_id uuid FK:items
    qty numeric(14,3)
    unit_price bigint | Dicatat penerimaan sebagai harga yang benar-benar dibayar
    qty_received numeric(14,3) | Cache dari Σ penerimaan; CHECK ≤ qty (R26)
    pr_line_id uuid? FK:purchase_request_lines | Agar PO terbaca balik ke divisi peminta
    note text?
  `, { alias: { poId: 'po_id' }, columnOnly: ['po_id'] }),
  T('goods_receipts', 'GoodsReceipt', 'Satu pengiriman terhadap satu PO. Beberapa pengiriman sebagian itu normal.', `
    id uuid PK
    code text UQ | GRN-2026-0001
    po_id uuid FK:purchase_orders
    supplier_id uuid FK:suppliers
    warehouse_id uuid FK:warehouses | Boleh berbeda dari gudang tujuan PO
    received_at date
    delivery_note text? | Nomor surat jalan
    vehicle_no text?
    received_by uuid FK:users
    on_time boolean | Dinilai saat penerimaan terhadap expected_at
    created_at timestamptz
    note text?
  `, { alias: { purchaseOrderId: 'po_id' }, via: { lines: 'goods_receipt_lines' } }),
  T('goods_receipt_lines', 'GoodsReceiptLine', 'Yang masuk gudang dan yang ditolak. Barang ditolak tidak masuk stok dan tetap terutang (R27).', `
    id uuid PK
    receipt_id uuid FK:goods_receipts | ON DELETE CASCADE
    po_line_id uuid FK:purchase_order_lines
    item_id uuid FK:items
    qty_received numeric(14,3) | CHECK diterima + ditolak ≤ sisa pesanan (R26)
    qty_rejected numeric(14,3)
    reject_reason text?
    bin_location text
    batch_no text? | Wajib bila master mensyaratkan batch/kedaluwarsa
    expiry_date date?
    unit_cost bigint | Disalin dari baris PO agar biaya stok = harga yang dibayar
  `, { alias: { receiptId: 'receipt_id' }, columnOnly: ['receipt_id'] }),
  T('supplier_payments', 'SupplierPayment', 'Uang keluar terhadap satu PO — penuh atau sebagian. Uang muka sebelum barang datang diperbolehkan dan ditandai (R31).', `
    id uuid PK
    code text UQ | PAY-2026-0001
    po_id uuid FK:purchase_orders
    supplier_id uuid FK:suppliers
    amount bigint | Σ pembayaran ≤ total PO (R31)
    method payment_method
    paid_at date
    reference text? | Nomor bukti transfer / nomor cek
    bank_account text?
    paid_by uuid FK:users
    created_at timestamptz
    note text?
  `, { alias: { purchaseOrderId: 'po_id' } }),

  /* ---------- E. Keuangan ---------- */
  T('invoices', 'Invoice', 'Satu proyek, satu bulan, satu tagihan (R35). Syarat dan tarif pajak disalin saat dibuat agar tagihan lama tidak berubah.', `
    id uuid PK
    code text UQ | INV-2026-09-0001
    client_id uuid FK:clients
    project_id uuid FK:projects | UNIQUE (project_id, period_year, period_month) WHERE status <> 'VOID'
    period_month smallint
    period_year smallint
    status invoice_status | Diturunkan dari penerimaan: ISSUED → PARTIALLY_PAID → PAID (R41)
    po_number text? | PO milik klien, dikutip kembali
    issued_at date?
    due_at date? | issued_at + payment_term_days; draft tidak punya jatuh tempo (R39)
    payment_term_days smallint
    ppn_rate numeric(5,4) | Ditambahkan (R37)
    pph23_rate numeric(5,4) | Dipotong klien (R37)
    created_by uuid FK:users
    created_at timestamptz
    updated_at timestamptz
    void_reason text?
    note text?
  `, { via: { lines: 'invoice_lines' } }),
  T('invoice_lines', 'InvoiceLine', 'SERVICE = tenaga kerja sesuai kontrak. DEDUCTION = pos kosong yang tidak perlu dibayar klien (amount negatif). ADJUSTMENT = hasil negosiasi.', `
    id uuid PK
    invoice_id uuid FK:invoices | ON DELETE CASCADE
    kind invoice_line_kind
    requirement_id uuid? FK:project_manpower_requirements
    position_id uuid? FK:positions
    shift shift?
    description text
    qty numeric(10,2) | Headcount (SERVICE) atau pos kosong (DEDUCTION)
    unit_price bigint
    amount bigint | Negatif pada DEDUCTION, sehingga baris selalu berjumlah subtotal (R36)
    note text?
  `, { alias: { invoiceId: 'invoice_id' }, columnOnly: ['invoice_id'] }),
  T('client_receipts', 'ClientReceipt', 'Uang masuk terhadap satu invoice. Pembayaran sebagian itu biasa; tidak boleh melebihi sisa tagihan (R41).', `
    id uuid PK
    code text UQ | RCP-2026-0001
    invoice_id uuid FK:invoices
    client_id uuid FK:clients
    amount bigint
    method payment_method
    received_at date
    reference text?
    bank_account text? | Rekening kita yang menerima
    recorded_by uuid FK:users
    created_at timestamptz
    note text?
  `),
  T('company_profile', 'CompanyProfile', 'Satu baris. Dicetak di setiap kontrak dan invoice; rekening bank = tujuan pembayaran klien.', `
    id smallint PK DEF=1 | CHECK id = 1 — hanya satu baris
    legal_name text
    brand_name text
    registration_no text
    npwp text
    address text
    city text
    province text
    phone text
    email text
    website text
    director text
    licence_no text
    founded_year smallint
    bank_name text?
    bank_account text?
    bank_account_name text?
  `),
]

/* ================= parsing ================= */

export function parseCols(src) {
  return src
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [left, note = ''] = line.split(' | ')
      const tokens = left.trim().split(/\s+/)
      const [name, rawType, ...flags] = tokens
      const nullable = rawType.endsWith('?')
      const type = nullable ? rawType.slice(0, -1) : rawType
      const col = { name, type, nullable, pk: false, uq: false, fk: null, def: null, note: note.trim() }
      flags.forEach((f) => {
        if (f === 'PK') col.pk = true
        else if (f === 'UQ') col.uq = true
        else if (f.startsWith('FK:')) col.fk = f.slice(3)
        else if (f.startsWith('DEF=')) col.def = f.slice(4)
      })
      return col
    })
}

TABLES.forEach((t) => {
  t.columns = parseCols(t.cols).filter((c) => !(t.dropCols ?? []).includes(c.name))
})
export const BY_NAME = Object.fromEntries(TABLES.map((t) => [t.name, t]))

/** Every FK as an edge, child → parent. */
export const RELATIONS = TABLES.flatMap((t) =>
  t.columns.filter((c) => c.fk).map((c) => ({ child: t.name, parent: c.fk, column: c.name, nullable: c.nullable, unique: c.uq || (c.pk && t.columns.filter((x) => x.pk).length === 1) })),
)

/* ================= enumerations (read from types.ts) ================= */

import { readFileSync } from 'node:fs'
const TYPES_SRC = readFileSync(new URL('../../src/data/types.ts', import.meta.url), 'utf8')

const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()

/** type UserStatus = 'A' | 'B' …, single- or multi-line. */
export function readUnions() {
  const out = {}
  const re = /export type (\w+) =\s*\|?\s*((?:'[^']+'\s*\|?\s*)+)/g
  let m
  while ((m = re.exec(TYPES_SRC))) {
    const values = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1])
    if (values.length) out[m[1]] = values
  }
  return out
}

/** The enum each column type names, mapped to the TypeScript union it comes from. */
export const ENUMS = [
  ['user_status', 'UserStatus'], ['override_effect', null, ['GRANT', 'REVOKE']], ['active_status', null, ['ACTIVE', 'INACTIVE']],
  ['permission_module', 'PermissionModule'], ['permission_risk', 'PermissionRisk'],
  ['client_status', 'ClientStatus'], ['client_tier', 'ClientTier'],
  ['building_type', 'BuildingType'], ['operating_hours', 'OperatingHours'], ['shift_pattern', 'ShiftPattern'],
  ['service_type', 'ServiceType'], ['position_grade', 'PositionGrade'],
  ['project_status', 'ProjectStatus'], ['shift', 'Shift'],
  ['item_category', 'ItemCategory'], ['uom', 'Uom'], ['item_status', null, ['ACTIVE', 'DISCONTINUED']],
  ['warehouse_type', 'WarehouseType'], ['stock_condition', 'StockCondition'], ['transfer_status', 'StockTransferStatus'],
  ['supplier_status', 'SupplierStatus'],
  ['mr_session_status', 'MrSessionStatus'], ['mr_request_status', 'MrRequestStatus'],
  ['purchase_request_status', 'PurchaseRequestStatus'], ['purchase_order_status', 'PurchaseOrderStatus'],
  ['payment_method', 'PaymentMethod'],
  ['invoice_status', 'InvoiceStatus'], ['invoice_line_kind', 'InvoiceLineKind'],
]

/* ================= integrity check against types.ts ================= */

function interfaceFields(name) {
  const m = new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`).exec(TYPES_SRC)
  if (!m) return null
  const fields = []
  m[1].split('\n').forEach((line) => {
    const f = /^ {2}(\w+)(\?)?:/.exec(line)
    if (f) fields.push({ name: f[1], optional: !!f[2] })
  })
  return fields
}

/** Returns a list of human-readable problems; empty means the mapping is complete. */
export function checkAgainstModel() {
  const problems = []
  const unions = readUnions()

  TABLES.forEach((t) => {
    if (!t.from) return
    const fields = interfaceFields(t.from)
    if (!fields) { problems.push(`${t.name}: interface ${t.from} not found in types.ts`); return }
    const cols = Object.fromEntries(t.columns.map((c) => [c.name, c]))
    fields.forEach((f) => {
      if (t.via?.[f.name]) {
        if (!BY_NAME[t.via[f.name]]) problems.push(`${t.name}: field ${f.name} maps to missing table ${t.via[f.name]}`)
        return
      }
      const colName = t.alias?.[f.name] ?? snake(f.name)
      const col = cols[colName]
      if (!col) { problems.push(`${t.name}: ${t.from}.${f.name} has no column "${colName}"`); return }
      if (!t.alias?.[f.name] && f.optional !== col.nullable && !col.pk) {
        problems.push(`${t.name}.${colName}: model says ${f.optional ? 'optional' : 'required'}, column says ${col.nullable ? 'nullable' : 'NOT NULL'}`)
      }
    })
  })

  // the audit log's shape lives in the store rather than in types.ts
  const store = readFileSync(new URL('../../src/store/useErp.ts', import.meta.url), 'utf8')
  const log = /export interface ActivityLog \{([\s\S]*?)\n\}/.exec(store)
  if (!log) problems.push('audit_log: ActivityLog not found in useErp.ts')
  else {
    const have = new Set(BY_NAME.audit_log.columns.map((c) => c.name))
    const alias = { actor: 'actor_id' }
    log[1].split('\n').forEach((line) => {
      const f = /^ {2}(\w+)\??:/.exec(line)
      if (f && !have.has(alias[f[1]] ?? snake(f[1]))) problems.push(`audit_log: ActivityLog.${f[1]} has no column`)
    })
  }

  // every FK must point at a table that exists
  RELATIONS.forEach((r) => { if (!BY_NAME[r.parent]) problems.push(`${r.child}.${r.column}: FK to unknown table ${r.parent}`) })

  // every enum a column names must be defined
  const known = new Set(ENUMS.map((e) => e[0]))
  const builtin = new Set(['uuid', 'text', 'citext', 'boolean', 'smallint', 'bigint', 'date', 'timestamptz'])
  TABLES.forEach((t) => t.columns.forEach((c) => {
    if (builtin.has(c.type) || c.type.startsWith('numeric')) return
    if (!known.has(c.type)) problems.push(`${t.name}.${c.name}: type "${c.type}" is not a builtin or a declared enum`)
  }))

  // every union in types.ts that a column uses must match the declared values
  ENUMS.forEach(([pg, ts]) => { if (ts && !unions[ts]) problems.push(`enum ${pg}: union ${ts} not found in types.ts`) })

  return problems
}

export function enumValues(entry) {
  const [, ts, literal] = entry
  return literal ?? readUnions()[ts]
}

/* ================= grouping for the document ================= */

export const GROUPS = [
  { id: 'access', title: 'A. Akses dan identitas', tables: ['permissions', 'role_permissions', 'roles', 'users', 'user_roles', 'user_permission_overrides', 'user_branch_scope', 'branches', 'password_reset_tokens', 'audit_log'] },
  { id: 'client', title: 'B. Klien, gedung, proyek dan posisi', tables: ['clients', 'client_contacts', 'buildings', 'positions', 'position_certifications', 'position_standard_issue', 'projects', 'project_manpower_requirements'] },
  { id: 'inventory', title: 'C. Inventori', tables: ['items', 'item_service_types', 'warehouses', 'warehouse_stock', 'stock_movements', 'stock_transfers', 'stock_transfer_lines'] },
  { id: 'procurement', title: 'D. Pengadaan dan pembelian', tables: ['divisions', 'suppliers', 'supplier_categories', 'purchase_prices', 'mr_sessions', 'mr_requests', 'mr_request_lines', 'purchase_requests', 'purchase_request_lines', 'pr_line_sources', 'purchase_orders', 'purchase_order_lines', 'goods_receipts', 'goods_receipt_lines', 'supplier_payments'] },
  { id: 'finance', title: 'E. Keuangan', tables: ['invoices', 'invoice_lines', 'client_receipts', 'company_profile'] },
]

/* ================= ERD layout ================= */

/**
 * Each diagram is a grid. A name prefixed with `~` is a table that belongs to
 * another diagram, drawn as a header only so the lines have somewhere to land.
 * `skip` lists edges that are real but would cross the picture; the data
 * dictionary still carries them.
 */
export const DIAGRAMS = [
  {
    id: 'erd-access',
    title: 'Gambar 10.1 — Akses dan identitas',
    rows: [
      ['permissions', 'role_permissions', 'roles'],
      ['user_permission_overrides', 'users', 'user_roles'],
      ['password_reset_tokens', 'user_branch_scope', 'branches'],
      ['audit_log', null, null],
    ],
    skip: ['audit_log>users', 'users>divisions', 'roles>users'],
    note: 'Tidak digambar: FK ke users dari audit_log dan roles (updated_by), serta users.division_id.',
  },
  {
    id: 'erd-client',
    title: 'Gambar 10.2 — Klien, gedung, proyek dan posisi',
    rows: [
      ['client_contacts', 'clients', 'buildings'],
      [null, 'projects', null],
      ['positions', 'project_manpower_requirements', null],
      ['position_certifications', 'position_standard_issue', '~items'],
    ],
    skip: [],
    note: 'buildings.client_id dan projects.client_id keduanya menuju clients; satu proyek mengikat tepat satu gedung (R1).',
  },
  {
    id: 'erd-inventory',
    title: 'Gambar 10.3 — Inventori',
    rows: [
      ['items', 'warehouse_stock', 'warehouses'],
      ['item_service_types', 'stock_movements', 'stock_transfers'],
      [null, null, 'stock_transfer_lines'],
    ],
    skip: ['stock_transfer_lines>items'],
    note: 'stock_transfers memiliki dua FK ke warehouses (asal dan tujuan). Tidak digambar: FK ke users dan items.default_supplier_id.',
  },
  {
    id: 'erd-mr',
    title: 'Gambar 10.4 — Dari permintaan divisi ke purchase request',
    rows: [
      ['divisions', 'mr_requests', 'mr_sessions'],
      ['pr_line_sources', 'mr_request_lines', 'purchase_requests'],
      [null, 'purchase_request_lines', '~suppliers'],
    ],
    skip: ['mr_sessions>purchase_requests'],
    note: 'Setiap baris merujuk items (tidak digambar). mr_sessions.purchase_request_id menunjuk balik ke purchase_requests (1:1) dan tidak digambar agar tidak berputar.',
  },
  {
    id: 'erd-po',
    title: 'Gambar 10.5 — Dari PO ke penerimaan dan pembayaran',
    rows: [
      ['supplier_categories', 'suppliers', 'purchase_prices'],
      ['supplier_payments', 'purchase_orders', 'purchase_order_lines'],
      ['~warehouses', 'goods_receipts', 'goods_receipt_lines'],
    ],
    skip: ['goods_receipts>suppliers', 'supplier_payments>suppliers', 'purchase_orders>warehouses'],
    note: 'Setiap penerimaan menulis purchase_prices dan menambah stok. Tidak digambar: FK ke items, users, mr_sessions, purchase_requests dan purchase_request_lines.',
  },
  {
    id: 'erd-finance',
    title: 'Gambar 10.6 — Keuangan',
    rows: [
      ['~clients', 'invoices', '~projects'],
      ['client_receipts', 'invoice_lines', '~project_manpower_requirements'],
      [null, 'company_profile', '~positions'],
    ],
    skip: ['client_receipts>clients', 'invoice_lines>positions'],
    note: 'company_profile berdiri sendiri (satu baris): rekening banknya dicetak di setiap invoice.',
  },
]

/* ================= ERD rendering ================= */

const BOX_W = 196
const ROW_H = 15
const HEAD_H = 24
const GAP_X = 30
const GAP_Y = 26
const PAD = 12

function keyRows(t) {
  const rows = t.columns.filter((c) => c.pk || c.fk || c.uq)
  const shown = rows.slice(0, 8)
  const hidden = t.columns.length - shown.length
  return { shown, hidden }
}

function boxHeight(name, ext) {
  if (ext) return HEAD_H + 6
  const { shown, hidden } = keyRows(BY_NAME[name])
  return HEAD_H + 6 + (shown.length + (hidden > 0 ? 1 : 0)) * ROW_H
}

export function renderErd(d) {
  // positions
  const boxes = {}
  let y = PAD
  d.rows.forEach((row) => {
    const rowH = Math.max(...row.map((n) => (n ? boxHeight(n.replace('~', ''), n.startsWith('~')) : 0)), 0)
    row.forEach((n, i) => {
      if (!n) return
      const ext = n.startsWith('~')
      const name = n.replace('~', '')
      boxes[name] = { name, ext, x: PAD + i * (BOX_W + GAP_X), y, w: BOX_W, h: boxHeight(name, ext), col: i }
    })
    y += rowH + GAP_Y
  })
  const width = PAD * 2 + d.rows[0].length * BOX_W + (d.rows[0].length - 1) * GAP_X
  const height = y - GAP_Y + PAD

  // edges
  const skip = new Set(d.skip ?? [])
  const edges = RELATIONS.filter((r) => boxes[r.child] && boxes[r.parent] && r.child !== r.parent && !skip.has(`${r.child}>${r.parent}`))
    .filter((r, i, all) => all.findIndex((x) => x.child === r.child && x.parent === r.parent && x.column === r.column) === i)

  // sides
  const center = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
  edges.forEach((e) => {
    const c = boxes[e.child], p = boxes[e.parent]
    const cc = center(c), pc = center(p)
    const dx = pc.x - cc.x, dy = pc.y - cc.y
    const sameCol = Math.abs(dx) < BOX_W * 0.6
    if (sameCol) { e.cs = dy > 0 ? 'bottom' : 'top'; e.ps = dy > 0 ? 'top' : 'bottom' }
    else { e.cs = dx > 0 ? 'right' : 'left'; e.ps = dx > 0 ? 'left' : 'right' }
  })

  // spread anchors along each side
  const slots = {}
  const reg = (box, side, e, end) => { (slots[`${box}|${side}`] ??= []).push({ e, end }) }
  edges.forEach((e) => { reg(e.child, e.cs, e, 'c'); reg(e.parent, e.ps, e, 'p') })
  Object.entries(slots).forEach(([key, list]) => {
    const [name, side] = key.split('|')
    const b = boxes[name]
    const horiz = side === 'top' || side === 'bottom'
    const span = horiz ? b.w : b.h
    const other = (s) => { const o = s.end === 'c' ? boxes[s.e.parent] : boxes[s.e.child]; return horiz ? o.x : o.y }
    list.sort((a, c) => other(a) - other(c))
    list.forEach((s, i) => {
      const t = (i + 1) / (list.length + 1)
      const lo = b.y + (b.ext ? 6 : HEAD_H + 4)
      const hi = b.y + b.h - 6
      const off = horiz ? b.x + span * (0.18 + 0.64 * t) : lo + (hi - lo) * t
      const pt = side === 'top' ? { x: off, y: b.y } : side === 'bottom' ? { x: off, y: b.y + b.h } : side === 'left' ? { x: b.x, y: off } : { x: b.x + b.w, y: off }
      s.e[s.end === 'c' ? 'cp' : 'pp'] = pt
    })
  })

  const mark = (pt, side, kind) => {
    const n = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }[side]
    const t = [-n[1], n[0]] // tangent
    const at = (a, b) => `${pt.x + n[0] * a + t[0] * b},${pt.y + n[1] * a + t[1] * b}`
    if (kind === 'one') return `<path d="M${at(8, -5)} L${at(8, 5)}" class="erd-mark"/><path d="M${at(12, -5)} L${at(12, 5)}" class="erd-mark"/>`
    return `<path d="M${at(0, -5)} L${at(10, 0)} L${at(0, 5)} M${at(0, 0)} L${at(10, 0)}" class="erd-mark"/>`
  }

  const lines = edges.map((e, i) => {
    const a = e.cp, b = e.pp
    const shift = (i % 3) * 5 - 5
    let path
    if (e.cs === 'left' || e.cs === 'right') {
      const xm = (a.x + b.x) / 2 + shift
      path = `M${a.x},${a.y} H${xm} V${b.y} H${b.x}`
    } else {
      const ym = (a.y + b.y) / 2 + shift
      path = `M${a.x},${a.y} V${ym} H${b.x} V${b.y}`
    }
    const optional = e.nullable ? ' erd-optional' : ''
    return `<path d="${path}" class="erd-line${optional}"/>${mark(a, e.cs, e.unique ? 'one' : 'many')}${mark(b, e.ps, 'one')}`
  })

  const boxSvg = Object.values(boxes).map((b) => {
    const t = BY_NAME[b.name]
    let rows = ''
    if (!b.ext) {
      const { shown, hidden } = keyRows(t)
      rows = shown.map((c, i) => {
        const tag = c.pk ? 'PK' : c.fk ? 'FK' : 'UQ'
        const cls = c.pk ? 'erd-pk' : c.fk ? 'erd-fk' : 'erd-uq'
        const yy = b.y + HEAD_H + 6 + i * ROW_H + 10
        return `<text x="${b.x + 8}" y="${yy}" class="erd-tag ${cls}">${tag}</text><text x="${b.x + 28}" y="${yy}" class="erd-col">${c.name}</text><text x="${b.x + b.w - 8}" y="${yy}" class="erd-type" text-anchor="end">${c.type}</text>`
      }).join('')
      if (hidden > 0) rows += `<text x="${b.x + 8}" y="${b.y + HEAD_H + 6 + shown.length * ROW_H + 10}" class="erd-more">+ ${hidden} kolom lain</text>`
    }
    const cls = b.ext ? 'erd-box erd-ext' : t.recommended ? 'erd-box erd-rec' : 'erd-box'
    return `<g><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="4" class="${cls}"/><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${HEAD_H}" rx="4" class="erd-head${b.ext ? ' erd-head-ext' : ''}"/><rect x="${b.x}" y="${b.y + HEAD_H - 4}" width="${b.w}" height="4" class="erd-head${b.ext ? ' erd-head-ext' : ''}"/><text x="${b.x + 8}" y="${b.y + 16}" class="erd-name">${b.name}</text>${rows}</g>`
  }).join('')

  return `<svg class="erd" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${d.title}">${lines.join('')}${boxSvg}</svg>`
}
