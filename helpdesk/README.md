# Atrium — Fasilitas & Maintenance Pabrik

Prototipe **front-end saja** (tanpa backend, semua data contoh disimpan di browser) untuk kebutuhan klien pabrik:

| # | Kebutuhan klien | Di mana |
|---|---|---|
| 1 | Kelola **penyewaan** ruang meeting dan fasilitas lain | **Reservasi & sewa** — jadwal per hari/bulan, persetujuan, penyewa internal/eksternal, tarif, tambahan, bukti reservasi |
| 2 | Masalah **fasilitas pabrik** | **Lapor masalah** (1 halaman), **Lapor cepat via QR tanpa login**, dampak ke produksi + penanda K3 |
| 3 | **Tiket** sederhana | **Tiket** — daftar + **papan kanban** (tarik untuk ubah status) |
| 4 | **Aset** sederhana + info maintenance | **Aset** — tambah/ubah, **impor Excel/CSV**, kartu "servis terakhir / berikutnya / garansi / biaya", label QR |
| 5 | **Jadwal building maintenance** | **Jadwal maintenance** — buat jadwal (per aset atau per area), daftar terlambat→nanti, **kalender bulan**, **"Sudah dikerjakan"** satu langkah |
| 6 | **Assign, ETA, status** | Panel **Teknisi · Estimasi selesai · Status** di setiap tiket dan tugas, bisa diubah dari daftar, papan, dan beranda |

```bash
cd helpdesk
npm install
npm run dev      # http://localhost:5173
npm run build
```

Masuk sebagai **Anisa** (Karyawan), **Budi** (Teknisi) atau **Rina** (Admin) — ganti kapan saja dari menu akun. Lihat `docs/ROAST-v1.md` untuk kritik terhadap versi pertama yang melatarbelakangi desain ini.

## Cara kerja inti

**Satu panel untuk tiga pertanyaan.** Semua orang bertanya *siapa yang pegang, kapan selesai, sekarang statusnya apa*. Di halaman tiket ketiganya berdampingan di atas percakapan. Karyawan melihatnya (read-only), teknisi/admin bisa mengubah masing-masing satu klik:

- **Tugaskan** → pilih teknisi (disarankan: tim terkait, urutkan yang paling sedikit beban) + estimasi selesai sekaligus.
- **ETA** → pilihan cepat (+1 jam, besok 10:00, …) atau pilih sendiri. Mengubah ETA yang sudah ada meminta alasan, dan pelapor diberi tahu. ETA yang lewat ditandai merah; tugas tanpa ETA ditandai kuning.
- **Status** → Baru → Ditugaskan → Dikerjakan → Menunggu → Selesai. "Mulai kerja" menanyakan ETA, "Tunda" menanyakan apa yang ditunggu (sparepart/vendor/persetujuan/area dikosongkan), "Selesai" meminta catatan apa yang dikerjakan.

**Tiket vs tugas maintenance.** Tiket = laporan dan janji ke pelapor. Tugas (work order) = pekerjaan berchecklist dengan waktu, material, dan biaya; berasal dari jadwal berkala atau dibuat dari tiket. Teknisi yang hanya ingin menandai "sudah dikerjakan" tidak perlu membuka tugas.

**Penyewaan.** Fasilitas bertanda "bisa disewa" (di Pengaturan) punya jam buka, tarif karyawan dan pihak luar, tambahan (proyektor, snack, kursi, lampu lapangan), dan aturan persetujuan. Karyawan memesan ruang kecil langsung; aula, rapat direksi dan semua penyewa eksternal masuk status *Menunggu* dan **menahan slot** sampai admin menyetujui atau menolak (dengan alasan). Bentrok dicegah secara langsung, biaya dihitung otomatis, admin bisa menutup fasilitas untuk maintenance.

**Lapor tanpa login.** `/lapor-cepat?aset=<id>` adalah yang dibuka stiker QR pada mesin: lokasi dan jenis masalah terisi dari aset, pelapor cukup isi nama dan judul. Form juga memperingatkan jika sudah ada laporan terbuka untuk aset/area yang sama.

## Peta halaman

```
Karyawan                         Teknisi / Admin
/            Beranda             /               Beranda (teknisi: tugas hari ini · admin: ringkasan)
/lapor       Lapor masalah       /tiket          Daftar + papan, tab: tugas saya / belum ditugaskan / perlu perhatian
/laporan-saya                    /tiket/:id      Penanganan · percakapan · detail
/tiket/:id   Detail + ETA        /jadwal         Daftar · kalender bulan · semua tugas
/reservasi   Jadwal · pengajuan  /tugas/:id      Checklist, waktu, material, biaya
             · fasilitas & tarif /aset  /aset/:id  Daftar, impor, kartu maintenance, jadwal, riwayat
/lapor-cepat (tanpa login)       /reservasi      + persetujuan, tutup fasilitas, ekspor
                                 /laporan        (admin) kinerja, biaya, pemakaian fasilitas
                                 /pengaturan     (admin) lokasi & tarif, kategori, pengguna, vendor, target waktu
```

## Data contoh

`src/data/seed.ts` membuat ±218 tiket 90 hari terakhir, 42 aset pabrik (boiler, kompresor, genset, forklift, APAR…), 18 jadwal berkala, ±120 tugas, ±294 reservasi (termasuk pengajuan menunggu, ditolak, penyewa eksternal), dan notifikasi. Waktu dibuat relatif terhadap *sekarang* agar ETA dan jadwal selalu terasa hidup. **Reset data demo** ada di menu akun.

## Peta kode

```
src/data/        types, referensi (lokasi, fasilitas, kategori, vendor), aset, generator seed
src/store/       satu Zustand store dengan semua aksi domain (createTicket, setEta, requestBooking, …)
src/lib/         sla (jam kerja, jeda), rental (hitung biaya), metrics, labels (Indonesia), format
src/components/  ui/ layout/ shared/ (ETA, badge, rating) tickets/ (TicketFlow) charts/
src/pages/       auth, dashboard, tickets, assets (+ jadwal, tugas), rental, manage
```

## Langkah menuju produksi

1. API + database dengan nama aksi yang sama; pengatur waktu SLA di server dan kalender hari libur.
2. SSO dan hak akses per peran; log audit.
3. Notifikasi WhatsApp/email (ETA berubah, persetujuan reservasi, jadwal jatuh tempo).
4. Foto/lampiran sungguhan; QR sungguhan (kode di label mengarah ke `/lapor-cepat?aset=`).
5. Invoice penyewaan dan integrasi keuangan; reservasi berulang.
