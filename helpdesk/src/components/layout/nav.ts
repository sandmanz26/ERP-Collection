import { Boxes, CalendarCheck, CalendarClock, Cog, Home, Inbox, PlusCircle, BarChart3, type LucideIcon } from 'lucide-react'
import type { Role } from '@/data/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badgeKey?: 'unassigned' | 'myOpen' | 'overdueTask' | 'pendingBookings'
  keywords?: string
}
export interface NavGroup { label?: string; items: NavItem[] }

const requester: NavGroup[] = [
  {
    items: [
      { to: '/', label: 'Beranda', icon: Home, end: true },
      { to: '/lapor', label: 'Lapor masalah', icon: PlusCircle, keywords: 'buat tiket rusak bocor mati' },
      { to: '/laporan-saya', label: 'Laporan saya', icon: Inbox, badgeKey: 'myOpen', keywords: 'status tiket' },
    ],
  },
  { label: 'Fasilitas', items: [{ to: '/reservasi', label: 'Reservasi fasilitas', icon: CalendarCheck, badgeKey: 'pendingBookings', keywords: 'sewa meeting aula lapangan kantin' }] },
]

const staff = (manager: boolean): NavGroup[] => [
  {
    items: [
      { to: '/', label: 'Beranda', icon: Home, end: true },
      { to: '/tiket', label: 'Tiket', icon: Inbox, badgeKey: 'unassigned', keywords: 'laporan masalah antrean' },
      { to: '/jadwal', label: 'Jadwal maintenance', icon: CalendarClock, badgeKey: 'overdueTask', keywords: 'perawatan berkala tugas' },
      { to: '/aset', label: 'Aset', icon: Boxes, keywords: 'peralatan mesin daftar' },
    ],
  },
  {
    label: 'Fasilitas',
    items: [{ to: '/reservasi', label: 'Reservasi & sewa', icon: CalendarCheck, badgeKey: 'pendingBookings', keywords: 'meeting aula lapangan kantin penyewa' }],
  },
  ...(manager ? [{ label: 'Kelola', items: [{ to: '/laporan', label: 'Laporan', icon: BarChart3 }, { to: '/pengaturan', label: 'Pengaturan', icon: Cog, keywords: 'lokasi kategori pengguna tarif' }] }] : []),
]

export const navFor = (role: Role): NavGroup[] => (role === 'requester' ? requester : staff(role === 'manager'))

export const BRAND = { name: 'Atrium', tagline: 'Fasilitas & maintenance pabrik' }

