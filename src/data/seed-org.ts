import type { CompanyProfile, PasswordResetToken, Position, UserAccount } from './types'
import { iso } from './seed-util'

export const company: CompanyProfile = {
  legalName: 'PT Tata Gemilang Nusantara',
  brandName: 'Tata Gemilang',
  registrationNo: 'AHU-0043215.AH.01.02.TAHUN 2009',
  npwp: '02.114.556.7-054.000',
  address: 'Jl. Raya Cakung Cilincing Km. 3 No. 18, Cakung',
  city: 'Jakarta Timur',
  province: 'DKI Jakarta',
  phone: '+62 21 4600 3388',
  email: 'operasional@tatagemilang.co.id',
  website: 'www.tatagemilang.co.id',
  director: 'Hendra Wijayanto',
  licenceNo: 'SIO Satpam: 1424/XI/2024/Baharkam',
  foundedYear: 2009,
}

/* ------------------------------------------------------------------
   Demo accounts. Password for every seeded account: Gemilang#2026

   Three of them fail deliberately, so the sign-in screen can be walked
   through its unhappy paths without breaking anything:
     · budi.santoso@   — never verified the email address
     · rina.kusuma@    — locked after five failed attempts
     · yusuf.ramdani@  — suspended by an administrator
   ------------------------------------------------------------------ */

const PASSWORD = 'Gemilang#2026'

export const users: UserAccount[] = [
  {
    id: 'usr_hendra', email: 'hendra.wijayanto@tatagemilang.co.id', password: PASSWORD,
    fullName: 'Hendra Wijayanto', jobTitle: 'Direktur Operasional', role: 'DIRECTOR', status: 'ACTIVE',
    branchCode: 'JKT', phone: '+62 811 1900 221', failedAttempts: 0, mustChangePassword: false,
    twoFactorEnabled: true, lastLoginAt: iso(-1, 7), createdAt: iso(-1460),
  },
  {
    id: 'usr_siti', email: 'siti.rahmawati@tatagemilang.co.id', password: PASSWORD,
    fullName: 'Siti Rahmawati', jobTitle: 'Operation Manager', role: 'OPERATION_MANAGER', status: 'ACTIVE',
    branchCode: 'JKT', phone: '+62 812 8877 4410', failedAttempts: 0, mustChangePassword: false,
    twoFactorEnabled: true, lastLoginAt: iso(0, 6), createdAt: iso(-1180),
  },
  {
    id: 'usr_agus', email: 'agus.pratama@tatagemilang.co.id', password: PASSWORD,
    fullName: 'Agus Pratama', jobTitle: 'Koordinator Area Jakarta', role: 'AREA_COORDINATOR', status: 'ACTIVE',
    branchCode: 'JKT', phone: '+62 813 1122 9080', failedAttempts: 0, mustChangePassword: false,
    twoFactorEnabled: false, lastLoginAt: iso(0, 5), createdAt: iso(-940),
  },
  {
    id: 'usr_dewi', email: 'dewi.anggraini@tatagemilang.co.id', password: PASSWORD,
    fullName: 'Dewi Anggraini', jobTitle: 'HR & Recruitment Lead', role: 'HR_RECRUITMENT', status: 'ACTIVE',
    branchCode: 'JKT', phone: '+62 815 6600 1274', failedAttempts: 0, mustChangePassword: false,
    twoFactorEnabled: false, lastLoginAt: iso(-2, 9), createdAt: iso(-760),
  },
  {
    id: 'usr_bayu', email: 'bayu.setiawan@tatagemilang.co.id', password: PASSWORD,
    fullName: 'Bayu Setiawan', jobTitle: 'Kepala Gudang Pusat', role: 'WAREHOUSE_ADMIN', status: 'ACTIVE',
    branchCode: 'JKT', phone: '+62 812 9034 5511', failedAttempts: 0, mustChangePassword: false,
    twoFactorEnabled: false, lastLoginAt: iso(-1, 8), createdAt: iso(-620),
  },
  {
    id: 'usr_maya', email: 'maya.puspita@tatagemilang.co.id', password: PASSWORD,
    fullName: 'Maya Puspita', jobTitle: 'Finance & Billing', role: 'FINANCE', status: 'ACTIVE',
    branchCode: 'JKT', phone: '+62 816 4455 7788', failedAttempts: 0, mustChangePassword: false,
    twoFactorEnabled: true, lastLoginAt: iso(-3, 10), createdAt: iso(-540),
  },
  {
    id: 'usr_budi', email: 'budi.santoso@tatagemilang.co.id', password: PASSWORD,
    fullName: 'Budi Santoso', jobTitle: 'Koordinator Area Bandung', role: 'AREA_COORDINATOR',
    status: 'PENDING_VERIFICATION', branchCode: 'BDG', phone: '+62 878 2200 3311', failedAttempts: 0,
    mustChangePassword: false, twoFactorEnabled: false, createdAt: iso(-9),
  },
  {
    id: 'usr_rina', email: 'rina.kusuma@tatagemilang.co.id', password: PASSWORD,
    fullName: 'Rina Kusuma', jobTitle: 'Admin Proyek', role: 'VIEWER', status: 'LOCKED',
    branchCode: 'SBY', phone: '+62 857 1200 6644', failedAttempts: 5, lockedUntil: iso(0, 23),
    mustChangePassword: false, twoFactorEnabled: false, createdAt: iso(-310),
  },
  {
    id: 'usr_yusuf', email: 'yusuf.ramdani@tatagemilang.co.id', password: PASSWORD,
    fullName: 'Yusuf Ramdani', jobTitle: 'Koordinator Area (nonaktif)', role: 'AREA_COORDINATOR',
    status: 'SUSPENDED', branchCode: 'BDG', failedAttempts: 0, mustChangePassword: false,
    twoFactorEnabled: false, lastLoginAt: iso(-120), createdAt: iso(-880),
  },
]

export const resetTokens: PasswordResetToken[] = [
  {
    token: 'TG-RESET-EXPIRED', email: 'agus.pratama@tatagemilang.co.id',
    issuedAt: iso(-2), expiresAt: iso(-2, 9), used: false,
  },
  {
    token: 'TG-RESET-USED', email: 'maya.puspita@tatagemilang.co.id',
    issuedAt: iso(-5), expiresAt: iso(-5, 9), used: true,
  },
]

/* ------------------------------------------------------------------
   Position master — what can be deployed, what it costs, what it is
   issued. The standard issue is what ties a headcount number to the
   warehouse: 40 guards is 80 sets of PDL and 40 pairs of boots.
   ------------------------------------------------------------------ */

export const positions: Position[] = [
  {
    id: 'pos_sec_chief', code: 'POS-SEC-001', name: 'Chief Security', serviceType: 'SECURITY', grade: 'CHIEF',
    description: 'Memimpin seluruh anggota di satu lokasi, memegang komunikasi dengan manajemen gedung.',
    certifications: ['Gada Madya', 'K3 Umum', 'KTA Satpam'], minEducation: 'SMA / sederajat',
    minExperienceYears: 8, baseSalary: 8_500_000, allowance: 1_600_000, defaultBillRate: 14_200_000,
    standardIssue: [
      { sku: 'ITM-UNI-0001', qtyPerPerson: 2 }, { sku: 'ITM-UNI-0002', qtyPerPerson: 2 },
      { sku: 'ITM-UNI-0003', qtyPerPerson: 1 }, { sku: 'ITM-UNI-0004', qtyPerPerson: 1 },
      { sku: 'ITM-UNI-0005', qtyPerPerson: 1 }, { sku: 'ITM-UNI-0012', qtyPerPerson: 1 },
      { sku: 'ITM-SEC-0001', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_sec_danru', code: 'POS-SEC-002', name: 'Danru (Komandan Regu)', serviceType: 'SECURITY', grade: 'LEADER',
    description: 'Memimpin satu regu per shift, membuat laporan mutasi dan mengatur rotasi pos.',
    certifications: ['Gada Pratama', 'KTA Satpam', 'PPGD / First Aid'], minEducation: 'SMA / sederajat',
    minExperienceYears: 4, baseSalary: 6_400_000, allowance: 1_000_000, defaultBillRate: 10_400_000,
    standardIssue: [
      { sku: 'ITM-UNI-0002', qtyPerPerson: 2 }, { sku: 'ITM-UNI-0003', qtyPerPerson: 1 },
      { sku: 'ITM-UNI-0004', qtyPerPerson: 1 }, { sku: 'ITM-UNI-0005', qtyPerPerson: 1 },
      { sku: 'ITM-UNI-0012', qtyPerPerson: 1 }, { sku: 'ITM-SEC-0001', qtyPerPerson: 1 },
      { sku: 'ITM-SEC-0003', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_sec_anggota', code: 'POS-SEC-003', name: 'Anggota Security', serviceType: 'SECURITY', grade: 'REGULAR',
    description: 'Menjaga pos, mengatur akses keluar-masuk, patroli terjadwal.',
    certifications: ['Gada Pratama', 'KTA Satpam'], minEducation: 'SMA / sederajat',
    minExperienceYears: 1, baseSalary: 5_400_000, allowance: 750_000, defaultBillRate: 8_700_000,
    standardIssue: [
      { sku: 'ITM-UNI-0002', qtyPerPerson: 2 }, { sku: 'ITM-UNI-0003', qtyPerPerson: 1 },
      { sku: 'ITM-UNI-0004', qtyPerPerson: 1 }, { sku: 'ITM-UNI-0005', qtyPerPerson: 1 },
      { sku: 'ITM-UNI-0012', qtyPerPerson: 1 }, { sku: 'ITM-SEC-0003', qtyPerPerson: 1 },
      { sku: 'ITM-SEC-0006', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_sec_wanita', code: 'POS-SEC-004', name: 'Security Wanita', serviceType: 'SECURITY', grade: 'REGULAR',
    description: 'Pemeriksaan tamu wanita, penempatan lobby dan area retail.',
    certifications: ['Gada Pratama', 'KTA Satpam'], minEducation: 'SMA / sederajat',
    minExperienceYears: 1, baseSalary: 5_400_000, allowance: 750_000, defaultBillRate: 8_700_000,
    standardIssue: [
      { sku: 'ITM-UNI-0001', qtyPerPerson: 2 }, { sku: 'ITM-UNI-0003', qtyPerPerson: 1 },
      { sku: 'ITM-UNI-0004', qtyPerPerson: 1 }, { sku: 'ITM-UNI-0012', qtyPerPerson: 1 },
      { sku: 'ITM-SEC-0002', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_sec_cctv', code: 'POS-SEC-005', name: 'Operator CCTV', serviceType: 'SECURITY', grade: 'SENIOR',
    description: 'Memantau ruang kontrol, merekam kejadian dan menerbitkan laporan harian.',
    certifications: ['Gada Pratama', 'K3 Umum'], minEducation: 'SMA / SMK',
    minExperienceYears: 2, baseSalary: 5_900_000, allowance: 850_000, defaultBillRate: 9_400_000,
    standardIssue: [
      { sku: 'ITM-UNI-0001', qtyPerPerson: 2 }, { sku: 'ITM-UNI-0012', qtyPerPerson: 1 },
      { sku: 'ITM-SEC-0001', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_cln_spv', code: 'POS-CLN-001', name: 'Supervisor Cleaning', serviceType: 'CLEANING', grade: 'SUPERVISOR',
    description: 'Mengatur jadwal area, kualitas hasil dan pemakaian bahan kimia.',
    certifications: ['K3 Umum'], minEducation: 'SMA / sederajat',
    minExperienceYears: 5, baseSalary: 6_800_000, allowance: 1_000_000, defaultBillRate: 10_900_000,
    standardIssue: [
      { sku: 'ITM-UNI-0006', qtyPerPerson: 2 }, { sku: 'ITM-UNI-0007', qtyPerPerson: 1 },
      { sku: 'ITM-UNI-0012', qtyPerPerson: 1 }, { sku: 'ITM-OFS-0002', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_cln_leader', code: 'POS-CLN-002', name: 'Leader Cleaning', serviceType: 'CLEANING', grade: 'LEADER',
    description: 'Memimpin tim per lantai atau per zona, memegang kunci ruang alat.',
    certifications: [], minEducation: 'SMA / sederajat',
    minExperienceYears: 3, baseSalary: 5_800_000, allowance: 800_000, defaultBillRate: 9_100_000,
    standardIssue: [
      { sku: 'ITM-UNI-0006', qtyPerPerson: 2 }, { sku: 'ITM-UNI-0007', qtyPerPerson: 1 },
      { sku: 'ITM-PPE-0001', qtyPerPerson: 4 }, { sku: 'ITM-UNI-0012', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_cln_reguler', code: 'POS-CLN-003', name: 'Cleaning Service', serviceType: 'CLEANING', grade: 'REGULAR',
    description: 'Pembersihan area umum, lantai, kaca dan pengangkutan sampah.',
    certifications: [], minEducation: 'SMP / SMA',
    minExperienceYears: 0, baseSalary: 5_100_000, allowance: 650_000, defaultBillRate: 8_000_000,
    standardIssue: [
      { sku: 'ITM-UNI-0006', qtyPerPerson: 2 }, { sku: 'ITM-UNI-0007', qtyPerPerson: 1 },
      { sku: 'ITM-PPE-0001', qtyPerPerson: 4 }, { sku: 'ITM-PPE-0002', qtyPerPerson: 1 },
      { sku: 'ITM-UNI-0012', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_cln_toilet', code: 'POS-CLN-004', name: 'Toilet Attendant', serviceType: 'CLEANING', grade: 'REGULAR',
    description: 'Menjaga kebersihan toilet lantai tinggi dan area publik sepanjang jam operasional.',
    certifications: [], minEducation: 'SMP / SMA',
    minExperienceYears: 0, baseSalary: 5_100_000, allowance: 650_000, defaultBillRate: 8_000_000,
    standardIssue: [
      { sku: 'ITM-UNI-0006', qtyPerPerson: 2 }, { sku: 'ITM-UNI-0007', qtyPerPerson: 1 },
      { sku: 'ITM-PPE-0001', qtyPerPerson: 6 }, { sku: 'ITM-PPE-0003', qtyPerPerson: 1 },
      { sku: 'ITM-UNI-0012', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_cln_gondola', code: 'POS-CLN-005', name: 'High-Rise / Gondola Cleaner', serviceType: 'CLEANING', grade: 'SENIOR',
    description: 'Pembersihan fasad gedung tinggi dengan gondola atau tali temali.',
    certifications: ['Sertifikat Gondola', 'K3 Umum'], minEducation: 'SMA / SMK',
    minExperienceYears: 3, baseSalary: 7_200_000, allowance: 1_400_000, defaultBillRate: 12_300_000,
    standardIssue: [
      { sku: 'ITM-UNI-0010', qtyPerPerson: 2 }, { sku: 'ITM-PPE-0007', qtyPerPerson: 1 },
      { sku: 'ITM-PPE-0004', qtyPerPerson: 1 }, { sku: 'ITM-PPE-0006', qtyPerPerson: 1 },
      { sku: 'ITM-UNI-0012', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_ofs_ob', code: 'POS-OFS-001', name: 'Office Boy / Girl', serviceType: 'OFFICE_SUPPORT', grade: 'REGULAR',
    description: 'Pantry, penggandaan dokumen dan kebutuhan harian kantor klien.',
    certifications: [], minEducation: 'SMP / SMA',
    minExperienceYears: 0, baseSalary: 5_100_000, allowance: 600_000, defaultBillRate: 7_900_000,
    standardIssue: [
      { sku: 'ITM-UNI-0008', qtyPerPerson: 2 }, { sku: 'ITM-UNI-0007', qtyPerPerson: 1 },
      { sku: 'ITM-PPE-0001', qtyPerPerson: 2 }, { sku: 'ITM-UNI-0012', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_drv', code: 'POS-DRV-001', name: 'Driver Operasional', serviceType: 'DRIVER', grade: 'REGULAR',
    description: 'Mengemudikan kendaraan operasional klien, termasuk perawatan harian.',
    certifications: ['SIM A', 'PPGD / First Aid'], minEducation: 'SMA / sederajat',
    minExperienceYears: 2, baseSalary: 5_900_000, allowance: 900_000, defaultBillRate: 9_500_000,
    standardIssue: [
      { sku: 'ITM-UNI-0013', qtyPerPerson: 2 }, { sku: 'ITM-UNI-0012', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_prk', code: 'POS-PRK-001', name: 'Petugas Parkir', serviceType: 'PARKING', grade: 'REGULAR',
    description: 'Mengatur lalu lintas kendaraan di area parkir dan drop-off.',
    certifications: ['Gada Pratama'], minEducation: 'SMA / sederajat',
    minExperienceYears: 0, baseSalary: 5_200_000, allowance: 700_000, defaultBillRate: 8_200_000,
    standardIssue: [
      { sku: 'ITM-PPE-0005', qtyPerPerson: 2 }, { sku: 'ITM-UNI-0004', qtyPerPerson: 1 },
      { sku: 'ITM-UNI-0011', qtyPerPerson: 1 }, { sku: 'ITM-UNI-0012', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_grd', code: 'POS-GRD-001', name: 'Petugas Taman', serviceType: 'GARDENING', grade: 'REGULAR',
    description: 'Perawatan taman, tanaman dalam ruang dan area hijau.',
    certifications: [], minEducation: 'SMP / SMA',
    minExperienceYears: 1, baseSalary: 5_100_000, allowance: 600_000, defaultBillRate: 7_900_000,
    standardIssue: [
      { sku: 'ITM-UNI-0010', qtyPerPerson: 2 }, { sku: 'ITM-PPE-0003', qtyPerPerson: 1 },
      { sku: 'ITM-PPE-0001', qtyPerPerson: 4 }, { sku: 'ITM-UNI-0012', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_rcp', code: 'POS-RCP-001', name: 'Resepsionis', serviceType: 'RECEPTIONIST', grade: 'REGULAR',
    description: 'Menerima tamu, mengelola buku tamu dan panggilan masuk.',
    certifications: [], minEducation: 'D3 / SMA',
    minExperienceYears: 1, baseSalary: 5_800_000, allowance: 900_000, defaultBillRate: 9_300_000,
    standardIssue: [
      { sku: 'ITM-UNI-0009', qtyPerPerson: 2 }, { sku: 'ITM-UNI-0012', qtyPerPerson: 1 },
      { sku: 'ITM-OFS-0001', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_tec', code: 'POS-TEC-001', name: 'Teknisi ME', serviceType: 'TECHNICIAN', grade: 'SENIOR',
    description: 'Perawatan mekanikal dan elektrikal ringan: pompa, genset, penerangan.',
    certifications: ['K3 Umum', 'Pemadam Kebakaran Kelas D'], minEducation: 'SMK Teknik',
    minExperienceYears: 3, baseSalary: 6_900_000, allowance: 1_200_000, defaultBillRate: 11_400_000,
    standardIssue: [
      { sku: 'ITM-UNI-0010', qtyPerPerson: 2 }, { sku: 'ITM-PPE-0004', qtyPerPerson: 1 },
      { sku: 'ITM-PPE-0006', qtyPerPerson: 1 }, { sku: 'ITM-UNI-0012', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pos_pst', code: 'POS-PST-001', name: 'Petugas Pest Control', serviceType: 'PEST_CONTROL', grade: 'REGULAR',
    description: 'Pengendalian hama terjadwal, pencatatan titik umpan dan pelaporan.',
    certifications: ['Pest Control Operator', 'K3 Umum'], minEducation: 'SMA / SMK',
    minExperienceYears: 2, baseSalary: 5_700_000, allowance: 900_000, defaultBillRate: 9_200_000,
    standardIssue: [
      { sku: 'ITM-UNI-0010', qtyPerPerson: 2 }, { sku: 'ITM-PPE-0002', qtyPerPerson: 2 },
      { sku: 'ITM-PPE-0001', qtyPerPerson: 4 }, { sku: 'ITM-UNI-0012', qtyPerPerson: 1 },
    ],
    status: 'ACTIVE',
  },
]
