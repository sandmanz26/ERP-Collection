import type { Addon, Announcement, AssetCategory, Building, CannedResponse, Category, Space, Team, User, Vendor } from './types'

export const COMPANY = 'PT Nusantara Manufaktur'
export const SITE = 'Pabrik Cikarang'

export const TEAMS: Team[] = [
  { id: 'tm_mek', name: 'Mekanikal & Utilitas', description: 'Boiler, kompresor, pompa, AC, forklift.' },
  { id: 'tm_elk', name: 'Kelistrikan', description: 'Panel, genset, trafo, penerangan.' },
  { id: 'tm_hk', name: 'Kebersihan & Lingkungan', description: 'Kebersihan, limbah, IPAL, hama.' },
  { id: 'tm_k3', name: 'K3 & Keamanan', description: 'Keselamatan kerja, APAR, hydrant, satpam.' },
  { id: 'tm_it', name: 'IT', description: 'Jaringan, perangkat dan CCTV.' },
  { id: 'tm_ga', name: 'GA & Fasilitas', description: 'Bangunan, reservasi fasilitas, urusan umum.' },
]

export const USERS: User[] = [
  { id: 'u_rina', name: 'Rina Kusuma', email: 'rina.kusuma@nusantara.example', role: 'manager', title: 'Kepala GA & Fasilitas', dept: 'GA', phone: '0811-2000-101', teamId: 'tm_ga' },
  { id: 'u_dimas', name: 'Dimas Prakoso', email: 'dimas.prakoso@nusantara.example', role: 'manager', title: 'Supervisor Maintenance', dept: 'Maintenance', phone: '0811-2000-102', teamId: 'tm_mek' },
  { id: 'u_budi', name: 'Budi Santoso', email: 'budi.santoso@nusantara.example', role: 'agent', title: 'Teknisi Mekanikal', dept: 'Maintenance', phone: '0812-3000-201', teamId: 'tm_mek' },
  { id: 'u_agus', name: 'Agus Salim', email: 'agus.salim@nusantara.example', role: 'agent', title: 'Teknisi Listrik', dept: 'Maintenance', phone: '0812-3000-202', teamId: 'tm_elk' },
  { id: 'u_wayan', name: 'Wayan Sudira', email: 'wayan.sudira@nusantara.example', role: 'agent', title: 'Koordinator Kebersihan', dept: 'GA', phone: '0812-3000-203', teamId: 'tm_hk' },
  { id: 'u_yoga', name: 'Yoga Pratama', email: 'yoga.pratama@nusantara.example', role: 'agent', title: 'Staf IT', dept: 'IT', phone: '0812-3000-204', teamId: 'tm_it' },
  { id: 'u_maya', name: 'Maya Lestari', email: 'maya.lestari@nusantara.example', role: 'agent', title: 'Petugas K3', dept: 'K3', phone: '0812-3000-205', teamId: 'tm_k3' },
  { id: 'u_eko', name: 'Eko Prasetyo', email: 'eko.prasetyo@nusantara.example', role: 'agent', title: 'Admin Fasilitas', dept: 'GA', phone: '0812-3000-206', teamId: 'tm_ga' },
  { id: 'u_anisa', name: 'Anisa Putri', email: 'anisa.putri@nusantara.example', role: 'requester', title: 'Supervisor Produksi Line 1', dept: 'Produksi', phone: '0813-4000-301', homeSpaceId: 'sp_line1' },
  { id: 'u_bayu', name: 'Bayu Anggara', email: 'bayu.anggara@nusantara.example', role: 'requester', title: 'Kepala Gudang', dept: 'Logistik', phone: '0813-4000-302', homeSpaceId: 'sp_gd_jadi' },
  { id: 'u_citra', name: 'Citra Wulandari', email: 'citra.wulandari@nusantara.example', role: 'requester', title: 'HRD', dept: 'HR', phone: '0813-4000-303', homeSpaceId: 'sp_kantor' },
  { id: 'u_dewi', name: 'Dewi Maharani', email: 'dewi.maharani@nusantara.example', role: 'requester', title: 'Manajer Pemasaran', dept: 'Pemasaran', phone: '0813-4000-304', homeSpaceId: 'sp_kantor' },
  { id: 'u_erik', name: 'Erik Hartono', email: 'erik.hartono@nusantara.example', role: 'requester', title: 'Direktur Operasional', dept: 'Direksi', phone: '0813-4000-305', homeSpaceId: 'sp_direksi', vip: true },
  { id: 'u_farah', name: 'Farah Nabila', email: 'farah.nabila@nusantara.example', role: 'requester', title: 'Kepala QC', dept: 'QC', phone: '0813-4000-306', homeSpaceId: 'sp_lab' },
  { id: 'u_galih', name: 'Galih Saputra', email: 'galih.saputra@nusantara.example', role: 'requester', title: 'Operator Line 2', dept: 'Produksi', phone: '0813-4000-307', homeSpaceId: 'sp_line2' },
  { id: 'u_hana', name: 'Hana Pertiwi', email: 'hana.pertiwi@nusantara.example', role: 'requester', title: 'Staf PPIC', dept: 'PPIC', phone: '0813-4000-308', homeSpaceId: 'sp_kantor' },
  { id: 'u_irfan', name: 'Irfan Maulana', email: 'irfan.maulana@nusantara.example', role: 'requester', title: 'Supervisor Packing', dept: 'Produksi', phone: '0813-4000-309', homeSpaceId: 'sp_packing' },
  { id: 'u_jihan', name: 'Jihan Aulia', email: 'jihan.aulia@nusantara.example', role: 'requester', title: 'Purchasing', dept: 'Purchasing', phone: '0813-4000-310', homeSpaceId: 'sp_kantor' },
  { id: 'u_kevin', name: 'Kevin Tanoto', email: 'kevin.tanoto@nusantara.example', role: 'requester', title: 'Staf Ekspor', dept: 'Logistik', phone: '0813-4000-311', homeSpaceId: 'sp_dock' },
  { id: 'u_laras', name: 'Laras Ayu', email: 'laras.ayu@nusantara.example', role: 'requester', title: 'Staf HSE', dept: 'K3', phone: '0813-4000-312', homeSpaceId: 'sp_line3' },
  { id: 'u_guest', name: 'Pelapor (via QR)', email: '', role: 'requester', title: 'Tanpa login', dept: '-', phone: '', system: true },
]

export const BUILDINGS: Building[] = [
  { id: 'b_p1', name: 'Pabrik 1 — Produksi', code: 'P1', description: 'Line produksi 1–3, packing dan lab QC' },
  { id: 'b_gd', name: 'Gudang & Logistik', code: 'GD', description: 'Gudang bahan baku, barang jadi dan loading dock' },
  { id: 'b_ut', name: 'Area Utilitas', code: 'UT', description: 'Boiler, kompresor, genset, pompa dan IPAL' },
  { id: 'b_kt', name: 'Gedung Kantor', code: 'KT', description: 'Kantor, ruang meeting dan training' },
  { id: 'b_fu', name: 'Fasilitas Umum', code: 'FU', description: 'Aula, kantin, lapangan, musholla, parkir' },
]

const sp = (id: string, buildingId: string, name: string, kind: Space['kind'], capacity = 0, rental?: Space['rental']): Space => ({ id, buildingId, name, kind, capacity, rental })

export const ADDONS: Addon[] = [
  { id: 'ad_proyektor', name: 'Proyektor & layar', price: 75_000, per: 'event' },
  { id: 'ad_sound', name: 'Sound system & mic', price: 250_000, per: 'event' },
  { id: 'ad_snack', name: 'Snack box', price: 22_000, per: 'person' },
  { id: 'ad_lunch', name: 'Makan siang', price: 38_000, per: 'person' },
  { id: 'ad_kursi', name: 'Kursi tambahan (50 unit)', price: 200_000, per: 'event' },
  { id: 'ad_ac', name: 'AC di luar jam kerja', price: 120_000, per: 'hour' },
  { id: 'ad_lampu', name: 'Lampu lapangan', price: 150_000, per: 'hour' },
]

export const SPACES: Space[] = [
  sp('sp_line1', 'b_p1', 'Line Produksi 1', 'production', 40),
  sp('sp_line2', 'b_p1', 'Line Produksi 2', 'production', 40),
  sp('sp_line3', 'b_p1', 'Line Produksi 3', 'production', 40),
  sp('sp_packing', 'b_p1', 'Area Packing', 'production', 30),
  sp('sp_lab', 'b_p1', 'Lab QC', 'lab', 10),
  sp('sp_wc_prod', 'b_p1', 'Toilet Produksi', 'restroom'),
  sp('sp_gd_baku', 'b_gd', 'Gudang Bahan Baku', 'warehouse'),
  sp('sp_gd_jadi', 'b_gd', 'Gudang Barang Jadi', 'warehouse'),
  sp('sp_dock', 'b_gd', 'Loading Dock', 'warehouse'),
  sp('sp_boiler', 'b_ut', 'Ruang Boiler', 'utility'),
  sp('sp_kompresor', 'b_ut', 'Ruang Kompresor', 'utility'),
  sp('sp_genset', 'b_ut', 'Ruang Genset & Panel', 'utility'),
  sp('sp_pompa', 'b_ut', 'Pompa & Tandon Air', 'utility'),
  sp('sp_ct', 'b_ut', 'Cooling Tower', 'utility'),
  sp('sp_ipal', 'b_ut', 'IPAL', 'utility'),
  sp('sp_server', 'b_kt', 'Ruang Server', 'utility'),
  sp('sp_kantor', 'b_kt', 'Kantor Admin', 'office', 60),
  sp('sp_direksi', 'b_kt', 'Kantor Direksi', 'office', 10),
  sp('sp_meetA', 'b_kt', 'Ruang Meeting A', 'meeting', 8, { rateExternal: 150_000, rateInternal: 0, needsApproval: false, openHour: 7, closeHour: 18, amenities: ['TV', 'AC', 'Whiteboard'], addonIds: ['ad_proyektor', 'ad_snack', 'ad_lunch'], description: 'Ruang kecil untuk diskusi tim.' }),
  sp('sp_meetB', 'b_kt', 'Ruang Meeting B', 'meeting', 14, { rateExternal: 250_000, rateInternal: 0, needsApproval: false, openHour: 7, closeHour: 18, amenities: ['Proyektor', 'AC', 'Video conference'], addonIds: ['ad_proyektor', 'ad_snack', 'ad_lunch'], description: 'Meeting tim dan tamu, ada video conference.' }),
  sp('sp_rapat', 'b_kt', 'Ruang Rapat Direksi', 'meeting', 20, { rateExternal: 400_000, rateInternal: 0, needsApproval: true, openHour: 8, closeHour: 17, amenities: ['Proyektor', 'AC', 'Video conference', 'Sound'], addonIds: ['ad_proyektor', 'ad_sound', 'ad_snack', 'ad_lunch'], description: 'Rapat direksi dan tamu penting. Perlu persetujuan.' }),
  sp('sp_training', 'b_kt', 'Ruang Training', 'meeting', 30, { rateExternal: 350_000, rateInternal: 0, needsApproval: false, openHour: 7, closeHour: 18, amenities: ['Proyektor', 'AC', 'Whiteboard', 'Meja susun'], addonIds: ['ad_proyektor', 'ad_sound', 'ad_snack', 'ad_lunch', 'ad_ac'], description: 'Pelatihan dan workshop.' }),
  sp('sp_aula', 'b_fu', 'Aula Serbaguna', 'hall', 150, { rateExternal: 750_000, rateInternal: 200_000, needsApproval: true, openHour: 7, closeHour: 21, amenities: ['Panggung', 'AC', 'Parkir luas'], addonIds: ['ad_proyektor', 'ad_sound', 'ad_kursi', 'ad_snack', 'ad_lunch', 'ad_ac'], description: 'Acara besar, seminar, gathering. Perlu persetujuan.' }),
  sp('sp_kantin', 'b_fu', 'Kantin', 'canteen', 120, { rateExternal: 500_000, rateInternal: 0, needsApproval: true, openHour: 13, closeHour: 21, amenities: ['Meja makan', 'Dapur'], addonIds: ['ad_sound', 'ad_kursi'], description: 'Hanya di luar jam makan karyawan (setelah 13:00).' }),
  sp('sp_lapangan', 'b_fu', 'Lapangan Serbaguna', 'field', 60, { rateExternal: 200_000, rateInternal: 0, needsApproval: false, openHour: 6, closeHour: 22, amenities: ['Futsal / voli', 'Lampu malam'], addonIds: ['ad_lampu'], description: 'Futsal, voli, olahraga karyawan.' }),
  sp('sp_musholla', 'b_fu', 'Musholla', 'common', 80),
  sp('sp_parkir', 'b_fu', 'Parkir Utama', 'parking', 200),
  sp('sp_pos', 'b_fu', 'Pos Satpam', 'common'),
]

export const spaceLabel = (s: Space, buildings: Building[] = BUILDINGS) => `${buildings.find((b) => b.id === s.buildingId)?.code ?? ''} · ${s.name}`

const cat = (id: string, name: string, teamId: string, defaultPriority: Category['defaultPriority'], icon: string, description: string): Category => ({ id, name, teamId, defaultPriority, icon, description })

export const CATEGORIES: Category[] = [
  cat('c_listrik', 'Listrik & penerangan', 'tm_elk', 'p3', 'Zap', 'Mati listrik, panel, stop kontak, lampu'),
  cat('c_utilitas', 'Utilitas (boiler, kompresor, steam)', 'tm_mek', 'p2', 'Flame', 'Boiler, kompresor udara, pipa steam, chiller'),
  cat('c_ac', 'AC & pendingin', 'tm_mek', 'p3', 'Snowflake', 'AC tidak dingin, bocor, berisik'),
  cat('c_air', 'Air & plumbing', 'tm_mek', 'p3', 'Droplets', 'Bocor, mampet, pompa air, tandon'),
  cat('c_forklift', 'Forklift & alat angkut', 'tm_mek', 'p2', 'Truck', 'Forklift, hoist, dock leveler'),
  cat('c_sipil', 'Bangunan & sipil', 'tm_ga', 'p3', 'Hammer', 'Atap bocor, lantai rusak, pintu, cat'),
  cat('c_kebersihan', 'Kebersihan & limbah', 'tm_hk', 'p4', 'SprayCan', 'Tumpahan, sampah, toilet, IPAL'),
  cat('c_hama', 'Hama', 'tm_hk', 'p3', 'Bug', 'Tikus, kecoa, serangga'),
  cat('c_k3', 'K3 & keamanan', 'tm_k3', 'p2', 'ShieldAlert', 'Bahaya kerja, APAR, hydrant, pagar, CCTV'),
  cat('c_it', 'IT & jaringan', 'tm_it', 'p3', 'Wifi', 'Jaringan, komputer, printer, CCTV'),
  cat('c_lain', 'Lainnya', 'tm_ga', 'p4', 'CircleHelp', 'Hal lain terkait fasilitas'),
]

export const ASSET_CATEGORIES: AssetCategory[] = [
  { id: 'ac_utilitas', name: 'Utilitas', icon: 'Flame' },
  { id: 'ac_listrik', name: 'Kelistrikan', icon: 'Zap' },
  { id: 'ac_ac', name: 'AC & pendingin', icon: 'Snowflake' },
  { id: 'ac_air', name: 'Air & pompa', icon: 'Droplets' },
  { id: 'ac_k3', name: 'Proteksi kebakaran & K3', icon: 'ShieldAlert' },
  { id: 'ac_angkut', name: 'Forklift & angkut', icon: 'Truck' },
  { id: 'ac_it', name: 'IT & keamanan', icon: 'Wifi' },
  { id: 'ac_gedung', name: 'Bangunan', icon: 'Hammer' },
]

export const VENDORS: Vendor[] = [
  { id: 'v_dingin', name: 'CV Teknik Dingin', trade: 'AC & chiller', contact: 'Hendro', phone: '0812-5555-0101', email: 'service@teknikdingin.example' },
  { id: 'v_daya', name: 'PT Daya Listrik Prima', trade: 'Listrik & genset', contact: 'Sari', phone: '0812-5555-0102', email: 'ops@dayalistrik.example' },
  { id: 'v_boiler', name: 'PT Boiler Service Utama', trade: 'Boiler & kompresor', contact: 'Panji', phone: '0812-5555-0103', email: 'dispatch@boilerutama.example' },
  { id: 'v_fire', name: 'PT Safe Fire Indonesia', trade: 'Proteksi kebakaran', contact: 'Lina', phone: '0812-5555-0104', email: 'cs@safefire.example' },
  { id: 'v_pompa', name: 'PT Pompa Jaya', trade: 'Pompa & plumbing', contact: 'Tono', phone: '0812-5555-0105', email: 'hello@pompajaya.example' },
  { id: 'v_clean', name: 'CV Bersih Lestari', trade: 'Kebersihan', contact: 'Yanti', phone: '0812-5555-0106', email: 'ops@bersihlestari.example' },
  { id: 'v_net', name: 'PT Net Solusi', trade: 'IT & CCTV', contact: 'Rizal', phone: '0812-5555-0107', email: 'support@netsolusi.example' },
  { id: 'v_hama', name: 'PT Hama Tuntas', trade: 'Pest control', contact: 'Gita', phone: '0812-5555-0108', email: 'book@hamatuntas.example' },
  { id: 'v_fork', name: 'PT Forklift Mandiri', trade: 'Forklift', contact: 'Doni', phone: '0812-5555-0109', email: 'service@forkliftmandiri.example' },
]

export const CANNED: CannedResponse[] = [
  { id: 'cr_ack', title: 'Laporan diterima', body: 'Halo {{name}}, laporan Anda sudah kami terima dan sedang ditindaklanjuti. Kami kabari lagi segera.' },
  { id: 'cr_onway', title: 'Teknisi menuju lokasi', body: 'Halo {{name}}, teknisi sedang menuju lokasi. Mohon pastikan area bisa diakses.' },
  { id: 'cr_info', title: 'Minta foto / lokasi', body: 'Halo {{name}}, bisa kirim foto dan lokasi persisnya (area dan nomor tiang/mesin terdekat)? Agar teknisi yang datang tepat sasaran.' },
  { id: 'cr_part', title: 'Menunggu sparepart', body: 'Halo {{name}}, penyebabnya sudah ketemu. Sparepart sedang dipesan; estimasi waktu kami perbarui begitu ada kepastian.' },
  { id: 'cr_done', title: 'Selesai — mohon konfirmasi', body: 'Halo {{name}}, pekerjaan sudah selesai. Mohon dicek; kalau masih ada masalah balas di sini dan kami buka kembali.' },
]

export const ANNOUNCEMENTS: Announcement[] = [
  { id: 'an_1', title: 'Boiler 2 maintenance Sabtu 07:00–15:00', body: 'Steam dari Boiler 1 tetap berjalan. Jadwalkan pekerjaan yang butuh steam tambahan di luar jam tersebut.', tone: 'info', at: new Date().toISOString() },
  { id: 'an_2', title: 'Simulasi evakuasi Rabu depan 10:30', body: 'Titik kumpul di lapangan parkir utama. Semua area wajib ikut.', tone: 'warning', at: new Date().toISOString() },
]
