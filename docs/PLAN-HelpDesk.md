# Draft Plan — Help Desk & Building Management System

> Status: **DRAFT v0.3** — front-end prototype in [`/helpdesk`](../helpdesk/README.md), re-scoped to the client's six needs after [`ROAST-v1`](../helpdesk/docs/ROAST-v1.md)
> Status (original): **DRAFT v0.1** · Branch: `claude/help-desk-system` · Bahasa: Indonesia
> Dokumen ini adalah rencana awal untuk didiskusikan, bukan spesifikasi final. Hal yang belum pasti ditandai **[TBD]**.

---

## 1. Latar Belakang & Tujuan

Perusahaan perlu satu sistem untuk dua kebutuhan yang saling berkaitan:

1. **Help Desk** — karyawan/tenant melaporkan masalah atau meminta layanan (IT, HR, GA, fasilitas), dan tim support menyelesaikannya dengan SLA yang terukur.
2. **Building Management** — mengelola gedung/kantor: aset & peralatan, ruangan, pemeliharaan rutin, vendor, kontraktor, tamu, dan akses area.

Keduanya digabung karena **banyak tiket help desk sebenarnya pekerjaan gedung** ("AC ruang rapat bocor", "lampu lobi mati") dan setiap pekerjaan gedung butuh jejak tiket, SLA, dan biaya.

### Tujuan terukur
| Tujuan | Indikator keberhasilan (target awal, **[TBD]** disepakati) |
|---|---|
| Semua permintaan tercatat di satu tempat | 100% request lewat sistem, bukan WhatsApp/email pribadi |
| Respon cepat dan terukur | ≥ 90% tiket memenuhi SLA respon pertama |
| Perawatan preventif berjalan | ≥ 95% jadwal PM terlaksana tepat waktu |
| Transparansi biaya perawatan | Biaya per aset / per lantai / per vendor terlihat di dashboard |
| Mengurangi masalah berulang | Tiket berulang per aset turun setiap kuartal |

### Di luar cakupan (fase awal)
Integrasi IoT/BMS (HVAC, CCTV), pembayaran sewa tenant, akuntansi penuh, aplikasi native mobile. Dicatat sebagai fase lanjutan.

---

## 2. Pengguna & Peran (Role)

| Role | Kebutuhan utama |
|---|---|
| **Requester** (karyawan/tenant) | Buat tiket, pantau status, beri rating, booking ruangan, daftarkan tamu |
| **Agent / Teknisi** | Antrean tugas, update progres, catat material & waktu, foto before/after |
| **Supervisor / Koordinator** | Assign & re-assign, monitor SLA, approve eskalasi |
| **Building Manager / GA** | Dashboard gedung, aset, jadwal PM, vendor, anggaran |
| **Vendor / Kontraktor** | Lihat pekerjaan yang di-assign, upload laporan (portal terbatas) |
| **Security / Resepsionis** | Check-in tamu, log akses, laporan insiden |
| **Admin** | Master data, role & izin, SLA, kategori, audit log |
| **Manajemen** | Laporan ringkas KPI (read-only) |

---

## 3. Lingkup Fungsional

### 3.1 Modul Help Desk
- **Tiket**: buat via portal / email / form cepat (scan QR di aset atau ruangan). Field: kategori, subkategori, prioritas, lokasi, aset terkait, lampiran foto.
- **Siklus status**: `Baru → Ditugaskan → Dikerjakan → Menunggu (requester/vendor/material) → Selesai → Ditutup` (+ `Dibatalkan`, `Dibuka kembali`).
- **Routing otomatis**: kategori + lokasi → tim/antrean; aturan round-robin / beban kerja.
- **SLA**: target respon & penyelesaian per prioritas dan kategori; jam kerja & hari libur; pause saat "Menunggu"; peringatan mendekati breach; eskalasi otomatis.
- **Komunikasi**: komentar publik vs catatan internal, @mention, notifikasi (in-app + email; WhatsApp **[TBD]**).
- **Canned response & template tiket**, merge tiket duplikat, parent/child ticket.
- **Knowledge base**: artikel self-service, saran artikel saat mengetik tiket.
- **Survey kepuasan (CSAT)** setelah tiket selesai.
- **Katalog layanan** (service request): permintaan standar dengan form & alur approval (mis. akses ruang server, pindah meja).

### 3.2 Modul Building Management
- **Struktur lokasi**: Gedung → Lantai → Zona → Ruangan (hirarki), denah/floor plan sederhana.
- **Registri aset**: kode aset + QR, kategori (HVAC, listrik, lift, APAR, genset, dll.), lokasi, vendor, tanggal beli, garansi, status, riwayat servis, dokumen/manual.
- **Preventive Maintenance (PM)**: jadwal berbasis waktu (harian/mingguan/bulanan) atau meter; checklist; pembuatan work order otomatis.
- **Work Order (WO)**: korektif (dari tiket) dan preventif; assign teknisi/vendor; material terpakai; waktu kerja; biaya; tanda tangan selesai.
- **Inspeksi & patrol**: checklist rutin (kebersihan, keamanan, safety) dengan foto & temuan yang bisa jadi tiket.
- **Vendor & kontrak**: daftar vendor, kontrak/SLA vendor, masa berlaku & pengingat perpanjangan.
- **Inventaris suku cadang**: stok minimum, penggunaan per WO, permintaan pembelian sederhana.
- **Booking ruangan & fasilitas**: kalender, aturan durasi, approval opsional, anti-bentrok.
- **Manajemen tamu**: undangan tamu, pre-registration, check-in/out, badge/QR, log kunjungan.
- **Parkir & loker** **[TBD, opsional]**.
- **Keselamatan & kepatuhan**: sertifikat (APAR, lift, K3), jadwal drill evakuasi, laporan insiden.
- **Utilitas** (listrik, air) — pencatatan meter manual & tren **[fase lanjut]**.

### 3.3 Dashboard & Pelaporan
- **Operasional**: tiket terbuka, berdasarkan prioritas/lokasi, SLA berisiko, beban kerja agent.
- **Gedung**: aset bermasalah, WO terlambat, kepatuhan PM, kontrak akan habis.
- **Analitik**: MTTR/MTBF, tiket berulang per aset, biaya perawatan, top kategori, CSAT.
- Ekspor CSV/PDF.

### 3.4 Administrasi
Master data (kategori, SLA, lokasi, vendor), manajemen user/role/izin, template notifikasi, jam kerja & hari libur, **audit log**.

---

## 4. Model Data (Garis Besar)

```
Building ─< Floor ─< Zone ─< Room
Asset (→ Room, → Vendor, → AssetCategory)
Ticket (→ Requester, → Category, → Room?, → Asset?, → Assignee/Team, → SLAPolicy)
  ├─< TicketComment / Attachment / StatusHistory
  └─< WorkOrder
WorkOrder (→ Ticket?, → PMSchedule?, → Asset, → Assignee/Vendor)
  ├─< WOTask (checklist) / MaterialUsage / TimeLog / CostEntry
PMSchedule (→ Asset, frekuensi, checklist template)
Vendor ─< Contract
Booking (→ Room/Facility, → User)
Visitor (→ Host, → Visit)
Inspection (→ Template, → Room) ─< Finding (→ Ticket?)
SparePart ─< StockMovement
KBArticle, SLAPolicy, Team, User, Role, AuditLog
```

Entitas inti fase 1: **User, Role, Team, Building/Floor/Room, Asset, Category, SLAPolicy, Ticket, Comment, Attachment, StatusHistory, WorkOrder, Vendor**.

---

## 5. Pendekatan Teknis

Mengikuti repo ini (`ERP-Collection`) yang saat ini *front-end only*:

| Aspek | Usulan |
|---|---|
| UI | React 19 + TypeScript + Vite + Tailwind + Radix UI (stack yang sama dengan Meridian Freight Suite) |
| State | Zustand + `localStorage` untuk **prototipe fase 1** (data seed realistis) |
| Routing | `react-router-dom` — modul di bawah `src/pages/helpdesk/` dan `src/pages/building/` |
| Komponen | Pakai ulang `components/ui`, `data-table`, `layout`, `onboarding` yang sudah ada |
| Mobile | Responsif (teknisi bekerja di ponsel/tablet); pertimbangkan PWA + scan QR |
| Backend | **Belum ada.** Fase 3: API (Node/NestJS atau sejenis **[TBD]**) + PostgreSQL, auth SSO, penyimpanan file, antrean notifikasi |

**Keputusan arsitektur yang perlu dikonfirmasi [TBD]**: (a) Apakah help desk berdiri sendiri sebagai app baru atau menjadi modul di dalam suite yang sudah ada? (b) Apakah prototipe front-end-only cukup untuk validasi, atau backend langsung dibangun? (c) SSO/identitas perusahaan (Google Workspace / Azure AD / lainnya).

Non-fungsional: audit log setiap perubahan status, akses berbasis role, lampiran maks. ukuran dibatasi, penanganan zona waktu (WIB), aksesibilitas dasar, bahasa **ID + EN** **[TBD]**.

---

## 6. Fase & Roadmap

| Fase | Fokus | Hasil utama | Estimasi kasar* |
|---|---|---|---|
| **0 — Discovery** | Wawancara pengguna, daftar kategori & SLA, inventaris aset awal, keputusan arsitektur | PRD final, backlog, desain alur | 1–2 minggu |
| **1 — Help Desk inti** | Auth & role, portal requester, antrean agent, siklus tiket, kategori, SLA dasar, komentar, notifikasi in-app, dashboard dasar | Tiket end-to-end dengan data seed | 3–4 minggu |
| **2 — Building core** | Hirarki lokasi, registri aset + QR, work order korektif (dari tiket), vendor, material | Tiket → WO → selesai, dengan biaya | 3–4 minggu |
| **3 — Preventif & SLA lanjut** | Jadwal PM, checklist, eskalasi SLA, jam kerja/libur, inspeksi, knowledge base, CSAT | Pemeliharaan terjadwal berjalan | 3–4 minggu |
| **4 — Fasilitas & tamu** | Booking ruangan, manajemen tamu, kontrak vendor & pengingat, inventaris suku cadang | Pengalaman penghuni gedung lengkap | 3 minggu |
| **5 — Backend & integrasi** | API + database, SSO, email-to-ticket, WhatsApp/Teams, ekspor laporan, hardening | Siap produksi | 4–6 minggu |
| **6 — Lanjutan** | Utilitas/energi, IoT/BMS, portal vendor penuh, prediksi kerusakan | Optimasi | **[TBD]** |

\*Estimasi sangat kasar untuk tim kecil (2–3 dev); akan direvisi setelah Discovery.

### MVP yang disarankan
Fase 1 + sebagian Fase 2: **tiket + aset + work order sederhana + dashboard SLA**. Ini sudah menjawab 80% nilai harian.

---

## 7. Alur Kerja Utama (Ringkas)

**Alur A — Perbaikan korektif**
1. Karyawan scan QR di AC ruang rapat → form tiket terisi lokasi & aset.
2. Sistem routing ke tim Fasilitas, SLA mulai dihitung.
3. Supervisor menugaskan teknisi (atau vendor jika di luar kemampuan).
4. Teknisi membuat WO, mencatat material & foto, status → Selesai.
5. Requester konfirmasi & mengisi CSAT → tiket Ditutup.
6. Riwayat servis aset & biaya terupdate otomatis.

**Alur B — Preventive maintenance**
1. Jadwal PM jatuh tempo → WO dibuat otomatis dengan checklist.
2. Teknisi mengisi checklist; temuan abnormal otomatis membuat tiket korektif.
3. WO selesai → jadwal berikutnya dihitung.

**Alur C — Tamu**
Karyawan mendaftarkan tamu → tamu menerima QR → resepsionis check-in → host dinotifikasi → check-out tercatat.

---

## 8. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Data aset awal tidak lengkap | Mulai dari aset kritis (lift, genset, HVAC, APAR); impor CSV bertahap; QR untuk pendataan lapangan |
| Adopsi rendah (orang tetap pakai WhatsApp) | Form super singkat + QR; dukungan email/WhatsApp-to-ticket; sosialisasi & champion per lantai |
| Cakupan membengkak | Pegang MVP; fitur lain masuk backlog bertahap |
| SLA tidak realistis | Mulai longgar, ukur 1–2 bulan, lalu perketat berdasar data |
| Prototipe lokal tidak mewakili produksi | Pisahkan lapisan data (service layer) sejak awal agar mudah diganti API |
| Data sensitif (akses, tamu) | Role & audit log; retensi data tamu **[TBD]** |

---

## 9. Pertanyaan Terbuka

1. Berapa jumlah gedung/lantai, karyawan, dan tenant (jika ada tenant eksternal)?
2. Siapa saja tim penyelesai (IT, GA, engineering, kebersihan, security) dan apakah ada vendor outsourcing?
3. Apakah help desk mencakup **IT dan HR**, atau hanya fasilitas/gedung?
4. Sistem eksisting yang harus diintegrasikan (HRIS, SSO, email, akses kontrol)?
5. Kanal notifikasi yang wajib: email, WhatsApp, Teams/Slack?
6. Kebutuhan bahasa (ID saja atau ID + EN)?
7. Prototipe front-end dulu, atau langsung dengan backend?
8. Target go-live dan anggaran?

---

## 10. Langkah Berikutnya

1. Review draft ini & jawab pertanyaan terbuka (§9).
2. Finalkan PRD (format sama seperti `docs/PRD.md`) dan daftar kategori/SLA awal.
3. Buat struktur folder & model data fase 1, lalu seed data realistis.
4. Mulai Fase 1 (Help Desk inti).
