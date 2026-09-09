/**
 * Demo accounts. Passwords are stored in the clear here because there is no
 * server — the sign-in flow exists to exercise lockouts, unverified accounts
 * and expired reset links, not to protect anything.
 *
 * Everyone signs in with `Wanakarya#2026`. Three accounts deliberately fail so
 * those paths can be walked without breaking the demo.
 */

import type { PasswordResetToken, UserAccount } from './types'
import { d, dt } from './clock'

const PW = 'Wanakarya#2026'

const u = (x: Partial<UserAccount> & Pick<UserAccount, 'id' | 'email' | 'fullName' | 'jobTitle' | 'role'>): UserAccount => ({
  password: PW, status: 'ACTIVE', failedAttempts: 0,
  mustChangePassword: false, twoFactorEnabled: false, createdAt: d(-600), ...x,
})

export const users: UserAccount[] = [
  u({
    id: 'usr_rizky', email: 'rizky.pratama@wanakarya.co.id', fullName: 'Rizky Pratama',
    jobTitle: 'Direktur Operasi', role: 'DIRECTOR', phone: '+62 811 2740 118',
    lastLoginAt: dt(0, 7, 12), twoFactorEnabled: true, createdAt: d(-1840),
  }),
  u({
    id: 'usr_yuni', email: 'yuni.hastuti@wanakarya.co.id', fullName: 'Yuni Hastuti',
    jobTitle: 'Kepala PPIC', role: 'PPIC', phone: '+62 812 2884 097',
    lastLoginAt: dt(0, 6, 48), createdAt: d(-1420),
  }),
  u({
    id: 'usr_dwi', email: 'dwi.anggraini@wanakarya.co.id', fullName: 'Dwi Anggraini',
    jobTitle: 'Purchasing & Import Supervisor', role: 'PURCHASING', phone: '+62 813 9014 772',
    lastLoginAt: dt(0, 7, 34), createdAt: d(-1180),
  }),
  u({
    id: 'usr_agus', email: 'agus.purnomo@wanakarya.co.id', fullName: 'Agus Purnomo',
    jobTitle: 'Kepala Finishing', role: 'PRODUCTION', phone: '+62 878 3311 204',
    lastLoginAt: dt(-1, 16, 5), createdAt: d(-960),
  }),
  u({
    id: 'usr_ratih', email: 'ratih.puspitasari@wanakarya.co.id', fullName: 'Ratih Puspitasari',
    jobTitle: 'Quality Control Lead', role: 'QC', phone: '+62 851 4477 118',
    lastLoginAt: dt(0, 8, 2), createdAt: d(-880),
  }),
  u({
    id: 'usr_slamet', email: 'slamet.widodo@wanakarya.co.id', fullName: 'Slamet Widodo',
    jobTitle: 'Kepala Gudang', role: 'WAREHOUSE', phone: '+62 856 2201 449',
    lastLoginAt: dt(0, 7, 55), createdAt: d(-1520),
  }),
  u({
    id: 'usr_nadia', email: 'nadia.kusumawardhani@wanakarya.co.id', fullName: 'Nadia Kusumawardhani',
    jobTitle: 'Sales Manager', role: 'SALES', phone: '+62 811 3388 470',
    lastLoginAt: dt(-1, 17, 22), createdAt: d(-1290),
  }),
  u({
    id: 'usr_ayu', email: 'ayu.lestari@wanakarya.co.id', fullName: 'Ayu Lestari',
    jobTitle: 'Cost Accountant', role: 'FINANCE', phone: '+62 812 7719 003',
    lastLoginAt: dt(0, 8, 40), createdAt: d(-1050),
  }),
  u({
    id: 'usr_admin', email: 'admin@wanakarya.co.id', fullName: 'Bayu Setiawan',
    jobTitle: 'IT & Systems', role: 'ADMIN', phone: '+62 821 4400 118',
    lastLoginAt: dt(0, 6, 15), twoFactorEnabled: true, createdAt: d(-1840),
  }),

  /* ---- the three that deliberately fail ---- */
  u({
    id: 'usr_hendra', email: 'hendra.wijaya@wanakarya.co.id', fullName: 'Hendra Wijaya',
    jobTitle: 'Kepala Machining', role: 'PRODUCTION', status: 'PENDING_VERIFICATION',
    createdAt: d(-4), phone: '+62 819 2277 108',
  }),
  u({
    id: 'usr_dedi', email: 'dedi.kurniawan@wanakarya.co.id', fullName: 'Dedi Kurniawan',
    jobTitle: 'QC Inspector', role: 'QC', status: 'LOCKED', failedAttempts: 5,
    lockedUntil: dt(0, 23, 30), createdAt: d(-410), phone: '+62 877 1140 992',
  }),
  u({
    id: 'usr_former', email: 'ilham.saputra@wanakarya.co.id', fullName: 'Ilham Saputra',
    jobTitle: 'Purchasing (former)', role: 'PURCHASING', status: 'SUSPENDED',
    createdAt: d(-1620), lastLoginAt: dt(-64, 11, 8),
  }),
  u({
    id: 'usr_invited', email: 'sari.wulandari@wanakarya.co.id', fullName: 'Sari Wulandari',
    jobTitle: 'Planner', role: 'PPIC', status: 'INVITED', password: '', createdAt: d(-2),
  }),
]

export const resetTokens: PasswordResetToken[] = [
  { token: 'wk-expired-2f81', email: 'dedi.kurniawan@wanakarya.co.id', issuedAt: dt(-2, 9), expiresAt: dt(-2, 9, 30), used: false },
  { token: 'wk-used-9a04', email: 'agus.purnomo@wanakarya.co.id', issuedAt: dt(-9, 14), expiresAt: dt(-9, 14, 30), used: true },
]
