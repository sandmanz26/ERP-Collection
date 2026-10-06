import type { AssetStatus, Channel, Criticality, Impact, PendingReason, PmFrequency, Priority, SpaceKind, TaskStatus, TaskType, TicketStatus, BookingStatus } from '@/data/types'
import type { BadgeTone } from '@/components/ui/badge'

export const PRIORITY: Record<Priority, { label: string; short: string; tone: BadgeTone; rank: number; hint: string }> = {
  p1: { label: 'Darurat', short: 'P1', tone: 'danger', rank: 1, hint: 'Membahayakan orang atau menghentikan produksi' },
  p2: { label: 'Tinggi', short: 'P2', tone: 'warning', rank: 2, hint: 'Produksi terganggu sebagian atau fasilitas penting mati' },
  p3: { label: 'Sedang', short: 'P3', tone: 'info', rank: 3, hint: 'Mengganggu tapi masih ada jalan lain' },
  p4: { label: 'Rendah', short: 'P4', tone: 'neutral', rank: 4, hint: 'Permintaan biasa atau perbaikan kosmetik' },
}

export const STATUS: Record<TicketStatus, { label: string; tone: BadgeTone; open: boolean; hint: string }> = {
  new: { label: 'Baru', tone: 'primary', open: true, hint: 'Belum ada yang menangani' },
  assigned: { label: 'Ditugaskan', tone: 'info', open: true, hint: 'Sudah ada teknisi, belum mulai' },
  in_progress: { label: 'Dikerjakan', tone: 'accent', open: true, hint: 'Sedang ditangani' },
  pending: { label: 'Menunggu', tone: 'warning', open: true, hint: 'Menunggu sparepart, vendor, atau akses' },
  done: { label: 'Selesai', tone: 'success', open: false, hint: 'Pekerjaan selesai' },
  cancelled: { label: 'Dibatalkan', tone: 'outline', open: false, hint: 'Dibatalkan' },
}

export const STATUS_ORDER: TicketStatus[] = ['new', 'assigned', 'in_progress', 'pending', 'done', 'cancelled']
export const BOARD_COLUMNS: TicketStatus[] = ['new', 'assigned', 'in_progress', 'pending', 'done']

export const PENDING_LABEL: Record<PendingReason, string> = {
  parts: 'Menunggu sparepart',
  vendor: 'Menunggu vendor',
  approval: 'Menunggu persetujuan',
  production: 'Menunggu area dikosongkan',
  requester: 'Menunggu pelapor',
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  portal: 'Aplikasi', qr: 'Scan QR', phone: 'Telepon', whatsapp: 'WhatsApp', walk_in: 'Datang langsung', inspection: 'Inspeksi',
}

export const IMPACT: Record<Impact, { label: string; hint: string; priority: Priority }> = {
  stop: { label: 'Produksi / operasional berhenti', hint: 'Mesin, line, atau fasilitas penting mati total', priority: 'p1' },
  partial: { label: 'Terganggu sebagian', hint: 'Masih jalan tapi lambat, atau sebagian area terdampak', priority: 'p2' },
  none: { label: 'Tidak mengganggu operasional', hint: 'Bisa menunggu beberapa hari', priority: 'p3' },
}

export const TASK_STATUS: Record<TaskStatus, { label: string; tone: BadgeTone }> = {
  open: { label: 'Baru', tone: 'primary' },
  scheduled: { label: 'Terjadwal', tone: 'info' },
  in_progress: { label: 'Dikerjakan', tone: 'accent' },
  on_hold: { label: 'Ditunda', tone: 'warning' },
  completed: { label: 'Selesai', tone: 'success' },
  cancelled: { label: 'Dibatalkan', tone: 'outline' },
}

export const TASK_TYPE: Record<TaskType, { label: string; tone: BadgeTone }> = {
  corrective: { label: 'Perbaikan', tone: 'danger' },
  preventive: { label: 'Berkala', tone: 'success' },
  inspection: { label: 'Inspeksi', tone: 'purple' },
}

export const ASSET_STATUS: Record<AssetStatus, { label: string; tone: BadgeTone }> = {
  operational: { label: 'Normal', tone: 'success' },
  degraded: { label: 'Terganggu', tone: 'warning' },
  down: { label: 'Rusak', tone: 'danger' },
  retired: { label: 'Nonaktif', tone: 'neutral' },
}

export const CRITICALITY: Record<Criticality, { label: string; tone: BadgeTone }> = {
  low: { label: 'Rendah', tone: 'neutral' },
  medium: { label: 'Sedang', tone: 'info' },
  high: { label: 'Tinggi', tone: 'warning' },
  critical: { label: 'Kritis', tone: 'danger' },
}

export const FREQ_LABEL: Record<PmFrequency, string> = {
  daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', quarterly: '3 bulanan', semiannual: '6 bulanan', annual: 'Tahunan',
}

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Menunggu persetujuan', tone: 'warning' },
  approved: { label: 'Disetujui', tone: 'success' },
  rejected: { label: 'Ditolak', tone: 'danger' },
  cancelled: { label: 'Dibatalkan', tone: 'outline' },
}

export const SPACE_KIND: Record<SpaceKind, string> = {
  production: 'Area produksi', warehouse: 'Gudang', utility: 'Utilitas', office: 'Kantor', meeting: 'Ruang meeting', hall: 'Aula', canteen: 'Kantin', field: 'Lapangan',
  parking: 'Parkir', restroom: 'Toilet', common: 'Umum', lab: 'Laboratorium',
}

export const ROLE_LABEL = { requester: 'Karyawan', agent: 'Teknisi', manager: 'Admin' } as const
