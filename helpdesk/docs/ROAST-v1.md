# Roast v1 — Atrium vs kebutuhan klien

Dinilai terhadap 6 kebutuhan yang disebut klien. Skor = seberapa nyata bisa dipakai besok pagi di pabrik.

| # | Kebutuhan klien | Skor v1 | Kenapa |
|---|---|---|---|
| 1 | Penyewaan meeting room & fasilitas lain | **3/10** | Yang dibangun adalah *booking ruang meeting kantor*, bukan *penyewaan*. Tidak ada penyewa eksternal, tidak ada persetujuan, tarif, tambahan (proyektor, catering), atau status pengajuan. Fasilitas lain (aula, lapangan, mess) tidak ada sama sekali. |
| 2 | Masalah seputar fasilitas pabrik | **3/10** | Seluruh data bertema *menara kantor* (lift, chiller di atap, lantai 1–12). Pabrik punya area produksi, gudang, utilitas (boiler, kompresor, genset), K3. Form tidak menanyakan "apakah menghentikan produksi?" atau "apakah berbahaya?". |
| 3 | Tiket sederhana | **5/10** | Tidak sederhana: P1–P4, SLA jam kerja, pause reason, CSAT bintang, 7 status, dua konsep (tiket + work order), 3 langkah form. Operator di HP akan menyerah di langkah 2. Pelapor wajib login — QR di mesin tidak berguna kalau harus login dulu. |
| 4 | Aset sederhana + info maintenance | **4/10** | **Tidak bisa menambah aset.** Tidak ada form tambah/ubah, tidak ada impor dari Excel — padahal klien pasti punya daftar aset di spreadsheet. Info maintenance (terakhir, berikutnya, jadwal, vendor) tersebar di 3 tab. |
| 5 | Jadwal building maintenance | **4/10** | Jadwal hanya bisa *dibuat dari data seed*; tidak bisa membuat/ubah jadwal. Kalender hanya 4 minggu, tidak ada tampilan bulan. Harus "Generate job" → buka WO → centang → "Complete" — terlalu banyak langkah untuk menandai "sudah dikerjakan". Tidak ada jadwal non-aset (bersih tandon, pest control, uji hydrant). |
| 6 | Assign, ETA, status | **4/10** | **Tidak ada ETA sama sekali.** Assign dan status ada tapi tersebar (dropdown di sidebar, tombol di header, dialog). Pelapor tidak pernah melihat "kapan selesai". Tidak ada papan (kanban), tidak ada cara cepat melihat siapa mengerjakan apa. |

## Dosa produk

1. **Scope creep.** Knowledge base, manajemen tamu (visitor), kontrak vendor, CSAT, laporan SLA per prioritas — tidak ada satu pun diminta klien. Semua itu menambah menu, menambah hal yang harus dipelajari, dan mengurangi fokus.
2. **Bahasa Inggris.** Pengguna pabrik Indonesia. "Pending", "Resolve", "Assignee", "Canned reply" bukan bahasa operator lapangan.
3. **Dibangun untuk orang kantor.** Font kecil, filter berlapis, tabel padat. Teknisi butuh tombol besar: *Mulai · Atur ETA · Selesai*.
4. **Data demo menipu.** Menara kantor dengan 12 lantai membuat demo terlihat seperti produk lain; klien tidak bisa membayangkan pabrik mereka di dalamnya.
5. **Read-mostly.** Banyak hal bisa dilihat tapi tidak bisa diubah: aset, lokasi, kategori, jadwal, fasilitas. Aplikasi yang tidak bisa diisi data sendiri bukan aplikasi.

## Dosa UI

- Navigasi 12+ menu untuk teknisi; yang dicari 3 menu.
- Halaman detail tiket: SLA, detail, work order, artikel — **status/assign/ETA tidak berada dalam satu tempat**.
- Dashboard manajer penuh KPI (CSAT, first response) yang tidak ditanyakan siapa pun; tidak menjawab "siapa mengerjakan apa dan kapan selesai".
- Reservasi hanya grid jam; tidak ada tampilan bulan untuk aula/lapangan, tidak ada daftar pengajuan yang menunggu persetujuan.
- Tidak ada papan status; tidak ada aksi cepat di baris daftar.
- Tidak ada layar *tanpa login* untuk lapor cepat dari QR.

## Yang sudah benar dan dipertahankan

Mesin SLA (jam kerja, pause), pemetaan kategori → tim, peran, notifikasi, QR aset, deteksi bentrok jadwal, mobile-friendly, dark mode, semua data tetap disimpan lokal.

## Rencana perbaikan (v2)

1. Re-base ke **pabrik** (area, utilitas, gudang, kantin, aula, lapangan, mess).
2. **ETA** di tiket dan tugas maintenance, terlihat oleh pelapor; panel "Penanganan" tunggal: **Teknisi · ETA · Status**.
3. Status disederhanakan: Baru → Ditugaskan → Dikerjakan → Menunggu → Selesai (+ Batal).
4. Form lapor **satu halaman**, "dampak ke produksi" + "berbahaya (K3)", dan **/lapor tanpa login** untuk QR.
5. **Papan kanban** dengan drag & drop selain daftar.
6. **Aset**: tambah/ubah/pensiun, **impor CSV**, kartu info maintenance (terakhir, berikutnya, vendor, garansi).
7. **Jadwal maintenance**: buat/ubah jadwal (harian–tahunan, per aset atau per area), tampilan **bulan**, tandai selesai dalam satu langkah.
8. **Penyewaan**: penyewa internal/eksternal, persetujuan, tarif per jam, tambahan, blok maintenance, daftar pengajuan, bukti reservasi, tampilan hari + bulan.
9. Hapus: knowledge base, visitor, kontrak vendor; CSAT jadi satu tap.
10. Seluruh UI **Bahasa Indonesia**.
