import type {
  BuildingType, ClientStatus, ClientTier, ItemCategory, OperatingHours, PositionGrade,
  ProjectStatus, ServiceType, Shift, ShiftPattern, StockCondition, Uom, WarehouseType,
} from './types'

/* ------------------------------------------------------------------
   Labels and catalogues.

   Navigation and field labels are English; the operating vocabulary of
   the business (shift names, position titles, item names) stays
   Indonesian, because that is what a coordinator says on the radio.
   ------------------------------------------------------------------ */

export const SERVICE_TYPES: { value: ServiceType; label: string; indonesian: string }[] = [
  { value: 'SECURITY', label: 'Security', indonesian: 'Satuan Pengamanan' },
  { value: 'CLEANING', label: 'Cleaning Service', indonesian: 'Kebersihan' },
  { value: 'OFFICE_SUPPORT', label: 'Office Support', indonesian: 'Office Boy / Girl' },
  { value: 'DRIVER', label: 'Driver', indonesian: 'Pengemudi' },
  { value: 'PARKING', label: 'Parking', indonesian: 'Juru Parkir' },
  { value: 'GARDENING', label: 'Gardening', indonesian: 'Pertamanan' },
  { value: 'RECEPTIONIST', label: 'Receptionist', indonesian: 'Resepsionis' },
  { value: 'TECHNICIAN', label: 'Technician', indonesian: 'Teknisi ME' },
  { value: 'PEST_CONTROL', label: 'Pest Control', indonesian: 'Pengendalian Hama' },
]

export const serviceLabel = (v: ServiceType) => SERVICE_TYPES.find((s) => s.value === v)?.label ?? v

export const BUILDING_TYPES: { value: BuildingType; label: string }[] = [
  { value: 'OFFICE_TOWER', label: 'Office tower' },
  { value: 'FACTORY', label: 'Factory' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'MALL', label: 'Shopping mall' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'CAMPUS', label: 'Campus' },
  { value: 'BANK_BRANCH', label: 'Bank branch' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'DATA_CENTER', label: 'Data centre' },
]
export const buildingTypeLabel = (v: BuildingType) => BUILDING_TYPES.find((b) => b.value === v)?.label ?? v

export const OPERATING_HOURS: { value: OperatingHours; label: string; description: string }[] = [
  { value: 'H24', label: '24/7', description: 'Covered around the clock, every day' },
  { value: 'EXTENDED', label: 'Extended', description: '06:00–22:00, seven days' },
  { value: 'OFFICE_HOURS', label: 'Office hours', description: '08:00–17:00, Monday to Friday' },
]
export const operatingHoursLabel = (v: OperatingHours) => OPERATING_HOURS.find((o) => o.value === v)?.label ?? v

export const SHIFT_PATTERNS: { value: ShiftPattern; label: string }[] = [
  { value: 'THREE_SHIFT', label: '3 shifts' },
  { value: 'TWO_SHIFT', label: '2 shifts' },
  { value: 'NON_SHIFT', label: 'Non shift' },
]
export const shiftPatternLabel = (v: ShiftPattern) => SHIFT_PATTERNS.find((s) => s.value === v)?.label ?? v

export const SHIFTS: { value: Shift; label: string; hours: string }[] = [
  { value: 'PAGI', label: 'Pagi', hours: '07:00–15:00' },
  { value: 'SIANG', label: 'Siang', hours: '15:00–23:00' },
  { value: 'MALAM', label: 'Malam', hours: '23:00–07:00' },
  { value: 'NON_SHIFT', label: 'Non shift', hours: '08:00–17:00' },
]
export const shiftLabel = (v: Shift) => SHIFTS.find((s) => s.value === v)?.label ?? v
export const shiftHours = (v: Shift) => SHIFTS.find((s) => s.value === v)?.hours ?? ''

export const PROJECT_STATUSES: { value: ProjectStatus; label: string; description: string }[] = [
  { value: 'DRAFT', label: 'Draft', description: 'Being prepared, not yet submitted' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval', description: 'Waiting on the operations manager' },
  { value: 'ACTIVE', label: 'Active', description: 'Running on site' },
  { value: 'SUSPENDED', label: 'Suspended', description: 'Paused — no deployment, no billing' },
  { value: 'COMPLETED', label: 'Completed', description: 'Ran to the end of its period' },
  { value: 'TERMINATED', label: 'Terminated', description: 'Ended before the period closed' },
]

export const CLIENT_STATUSES: { value: ClientStatus; label: string; description: string }[] = [
  { value: 'ACTIVE', label: 'Active', description: 'Holds at least one running contract' },
  { value: 'PROSPECT', label: 'Prospect', description: 'Quoted, not yet signed' },
  { value: 'ON_HOLD', label: 'On hold', description: 'New projects blocked' },
  { value: 'CHURNED', label: 'Churned', description: 'No longer a client' },
]

export const CLIENT_TIERS: { value: ClientTier; label: string; description: string }[] = [
  { value: 'ENTERPRISE', label: 'Enterprise', description: 'Multi-site, 200+ personnel' },
  { value: 'CORPORATE', label: 'Corporate', description: 'One to three sites' },
  { value: 'SME', label: 'SME', description: 'Single site, small headcount' },
]

export const INDUSTRIES = [
  'Manufacturing', 'Banking & Finance', 'Healthcare', 'Retail & Mall', 'Property Management',
  'Logistics & Distribution', 'Education', 'Energy & Mining', 'Hospitality', 'Technology',
  'Government & Public Sector', 'Food & Beverage',
]

export const PROVINCES = [
  'DKI Jakarta', 'Jawa Barat', 'Banten', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur',
  'Bali', 'Sumatera Utara', 'Sumatera Selatan', 'Kalimantan Timur', 'Sulawesi Selatan', 'Kepulauan Riau',
]

export const POSITION_GRADES: { value: PositionGrade; label: string }[] = [
  { value: 'CHIEF', label: 'Chief' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'LEADER', label: 'Leader' },
  { value: 'SENIOR', label: 'Senior' },
  { value: 'REGULAR', label: 'Regular' },
]

export const CERTIFICATIONS = [
  'Gada Pratama', 'Gada Madya', 'Gada Utama', 'KTA Satpam', 'K3 Umum', 'Pemadam Kebakaran Kelas D',
  'PPGD / First Aid', 'Sertifikat Gondola', 'Pest Control Operator', 'SIM A', 'SIM B1', 'Food Handling',
]

export const ITEM_CATEGORIES: { value: ItemCategory; label: string; description: string }[] = [
  { value: 'UNIFORM', label: 'Uniform', description: 'Seragam and its attributes' },
  { value: 'PPE', label: 'PPE', description: 'Alat pelindung diri' },
  { value: 'CLEANING_CHEMICAL', label: 'Cleaning chemical', description: 'Bahan kimia pembersih' },
  { value: 'CLEANING_TOOL', label: 'Cleaning tool', description: 'Alat kebersihan manual' },
  { value: 'CLEANING_MACHINE', label: 'Cleaning machine', description: 'Mesin poles, vacuum, blower' },
  { value: 'SECURITY_EQUIPMENT', label: 'Security equipment', description: 'Perlengkapan pengamanan' },
  { value: 'CONSUMABLE', label: 'Consumable', description: 'Habis pakai, dibeli berulang' },
  { value: 'OFFICE_SUPPLY', label: 'Office supply', description: 'Administrasi lapangan' },
  { value: 'SPAREPART', label: 'Spare part', description: 'Suku cadang mesin' },
]
export const itemCategoryLabel = (v: ItemCategory) => ITEM_CATEGORIES.find((c) => c.value === v)?.label ?? v

export const UOMS: { value: Uom; label: string }[] = [
  { value: 'PCS', label: 'PCS — piece' },
  { value: 'SET', label: 'SET — set' },
  { value: 'PAIR', label: 'PAIR — pair' },
  { value: 'BOX', label: 'BOX — box' },
  { value: 'PACK', label: 'PACK — pack' },
  { value: 'ROLL', label: 'ROLL — roll' },
  { value: 'LITER', label: 'LITER — litre' },
  { value: 'KG', label: 'KG — kilogram' },
  { value: 'BOTTLE', label: 'BOTTLE — bottle' },
  { value: 'UNIT', label: 'UNIT — unit' },
]

export const WAREHOUSE_TYPES: { value: WarehouseType; label: string; description: string }[] = [
  { value: 'CENTRAL', label: 'Central', description: 'Receives from suppliers, supplies the regions' },
  { value: 'REGIONAL', label: 'Regional', description: 'Serves the projects of one area' },
  { value: 'SITE', label: 'Site store', description: 'Held inside a client building' },
]
export const warehouseTypeLabel = (v: WarehouseType) => WAREHOUSE_TYPES.find((w) => w.value === v)?.label ?? v

export const STOCK_CONDITIONS: { value: StockCondition; label: string }[] = [
  { value: 'GOOD', label: 'Good' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'QUARANTINE', label: 'Quarantine' },
]

export const SUPPLIERS = [
  'CV Sandang Mandiri', 'PT Kimia Bersih Nusantara', 'PT Sinar Alat Teknik', 'CV Garda Perkasa Equipment',
  'PT Mitra Higienis Indonesia', 'CV Bumi Safety Utama', 'PT Adijaya Machinery',
]

/* ---------------- authentication policy ---------------- */

/** Branches the company operates from; an account may be scoped to some of them. */
export const BRANCHES = [
  { code: 'JKT', label: 'Jakarta (pusat)' },
  { code: 'BDG', label: 'Bandung' },
  { code: 'SBY', label: 'Surabaya' },
  { code: 'BPN', label: 'Balikpapan' },
]

export const AUTH_POLICY = {
  minPasswordLength: 10,
  maxFailedAttempts: 5,
  lockMinutes: 15,
  resetTokenMinutes: 30,
  allowedRegistrationDomains: ['tatagemilang.co.id'],
}

/** Everything a password is missing, phrased so it can be listed back to the person. */
export function passwordProblems(password: string): string[] {
  const problems: string[] = []
  if (password.length < AUTH_POLICY.minPasswordLength) problems.push(`At least ${AUTH_POLICY.minPasswordLength} characters`)
  if (!/[A-Z]/.test(password)) problems.push('One capital letter')
  if (!/[a-z]/.test(password)) problems.push('One lower-case letter')
  if (!/[0-9]/.test(password)) problems.push('One number')
  if (!/[^A-Za-z0-9]/.test(password)) problems.push('One symbol')
  return problems
}

export function passwordStrength(password: string) {
  const passed = 5 - passwordProblems(password).length
  const score = Math.max(0, Math.min(5, passed + (password.length >= 16 ? 1 : 0)))
  if (!password) return { score: 0, label: 'Empty', tone: 'neutral' as const }
  if (score <= 2) return { score, label: 'Weak', tone: 'danger' as const }
  if (score <= 4) return { score, label: 'Fair', tone: 'warning' as const }
  return { score, label: 'Strong', tone: 'success' as const }
}
