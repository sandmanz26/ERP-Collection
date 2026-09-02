/* ------------------------------------------------------------------
   PT Tata Gemilang — domain model.

   The business: an Indonesian outsourcing company that places security
   and cleaning personnel (plus supporting roles) inside its clients'
   buildings under fixed-term contracts.

   The spine of the model is deliberately narrow:

       Client ──1:N──> Building
         │                │
         └──1:N──> Project ──1:1──> Building        (one project, one building)
                      │
                      └──1:N──> ManpowerRequirement ──N:1──> Position

       Warehouse ──1:N──> WarehouseStock ──N:1──> InventoryItem

   A project can only ever serve one building. A client that wants a
   second building signs a second project — that rule is enforced in the
   type (a single `buildingId`) and in the project form, not by convention.
   ------------------------------------------------------------------ */

export type ISODate = string

/* ================================================================
   People and access
   ================================================================ */

export type UserRole =
  | 'DIRECTOR'
  | 'OPERATION_MANAGER'
  | 'AREA_COORDINATOR'
  | 'HR_RECRUITMENT'
  | 'WAREHOUSE_ADMIN'
  | 'FINANCE'
  | 'VIEWER'

export type UserStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'INVITED' | 'LOCKED' | 'SUSPENDED'

export interface UserAccount {
  id: string
  email: string
  /** Demo only. A real deployment never holds a password in the client. */
  password: string
  fullName: string
  jobTitle: string
  role: UserRole
  status: UserStatus
  /** Branch the person works out of, e.g. JKT, BDG, SBY. */
  branchCode?: string
  phone?: string
  failedAttempts: number
  lockedUntil?: ISODate
  mustChangePassword: boolean
  twoFactorEnabled: boolean
  lastLoginAt?: ISODate
  createdAt: ISODate
}

export interface PasswordResetToken {
  token: string
  email: string
  issuedAt: ISODate
  expiresAt: ISODate
  used: boolean
}

/** A named person at a client or a building — the one you call when a guard does not turn up. */
export interface Contact {
  id: string
  name: string
  position: string
  email: string
  phone: string
  isPrimary: boolean
}

/* ================================================================
   Clients
   ================================================================ */

export type ClientStatus = 'ACTIVE' | 'PROSPECT' | 'ON_HOLD' | 'CHURNED'
export type ClientTier = 'ENTERPRISE' | 'CORPORATE' | 'SME'

export interface Client {
  id: string
  /** CLT-0001 */
  code: string
  legalName: string
  brandName?: string
  industry: string
  tier: ClientTier
  status: ClientStatus

  npwp?: string
  address: string
  city: string
  province: string
  postalCode?: string
  phone?: string
  email?: string
  website?: string

  /** Commercial terms carried onto every project unless the project overrides them. */
  paymentTermDays: number
  /** Day of month the invoice is raised. */
  invoiceDay: number
  ppnApplicable: boolean
  pph23Withheld: boolean
  creditLimit: number

  accountManager: string
  clientSince: ISODate
  contacts: Contact[]
  notes?: string
  createdAt: ISODate
  updatedAt: ISODate
}

/* ================================================================
   Buildings — the physical site a project serves
   ================================================================ */

export type BuildingType =
  | 'OFFICE_TOWER'
  | 'FACTORY'
  | 'WAREHOUSE'
  | 'MALL'
  | 'HOSPITAL'
  | 'CAMPUS'
  | 'BANK_BRANCH'
  | 'APARTMENT'
  | 'HOTEL'
  | 'DATA_CENTER'

export type OperatingHours = 'H24' | 'EXTENDED' | 'OFFICE_HOURS'
export type ShiftPattern = 'THREE_SHIFT' | 'TWO_SHIFT' | 'NON_SHIFT'

export interface Building {
  id: string
  /** BLD-0001 */
  code: string
  clientId: string
  name: string
  type: BuildingType

  address: string
  city: string
  province: string
  postalCode?: string

  floors: number
  areaSqm: number
  operatingHours: OperatingHours
  shiftPattern: ShiftPattern

  picName: string
  picPhone: string
  picEmail?: string
  accessNote?: string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: ISODate
}

/* ================================================================
   Positions — the master of what can be deployed
   ================================================================ */

export type ServiceType =
  | 'SECURITY'
  | 'CLEANING'
  | 'OFFICE_SUPPORT'
  | 'DRIVER'
  | 'PARKING'
  | 'GARDENING'
  | 'RECEPTIONIST'
  | 'TECHNICIAN'
  | 'PEST_CONTROL'

export type PositionGrade = 'CHIEF' | 'SUPERVISOR' | 'LEADER' | 'SENIOR' | 'REGULAR'

/** What every person in this position is issued when they are deployed. */
export interface StandardIssue {
  sku: string
  qtyPerPerson: number
}

export interface Position {
  id: string
  /** POS-SEC-001 */
  code: string
  name: string
  serviceType: ServiceType
  grade: PositionGrade
  description: string
  /** Gada Pratama, K3 Umum, SIM A … */
  certifications: string[]
  minEducation: string
  minExperienceYears: number
  /** Monthly, in IDR. Cost is what we pay; bill is the list rate charged to a client. */
  baseSalary: number
  allowance: number
  defaultBillRate: number
  standardIssue: StandardIssue[]
  status: 'ACTIVE' | 'INACTIVE'
}

/* ================================================================
   Projects
   ================================================================ */

export type ProjectStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'COMPLETED'
  | 'TERMINATED'

export type Shift = 'PAGI' | 'SIANG' | 'MALAM' | 'NON_SHIFT'

/** One line of "what we need and how many" on a project. */
export interface ManpowerRequirement {
  id: string
  positionId: string
  /** How many people the contract calls for. */
  headcount: number
  /** How many are actually on site today. The gap is the number the business runs on. */
  deployed: number
  shift: Shift
  workDaysPerWeek: number
  hoursPerShift: number
  /** Per person per month. */
  billRate: number
  costRate: number
  note?: string
}

export interface Project {
  id: string
  /** PRJ-2026-0001 */
  code: string
  name: string
  clientId: string
  /** Exactly one building. Multi-building clients need one project per building. */
  buildingId: string
  contractNo: string
  status: ProjectStatus

  periodStart: ISODate
  periodEnd: ISODate

  requirements: ManpowerRequirement[]

  projectManager: string
  siteSupervisor?: string
  paymentTermDays: number
  /** Percentage added on top of personnel cost — how the company earns. */
  managementFeePct: number
  autoRenew: boolean
  renewalNoticeDays: number
  notes?: string
  createdAt: ISODate
  updatedAt: ISODate
}

/* ================================================================
   Inventory
   ================================================================ */

export type ItemCategory =
  | 'UNIFORM'
  | 'PPE'
  | 'CLEANING_CHEMICAL'
  | 'CLEANING_TOOL'
  | 'CLEANING_MACHINE'
  | 'SECURITY_EQUIPMENT'
  | 'CONSUMABLE'
  | 'OFFICE_SUPPLY'
  | 'SPAREPART'

export type Uom = 'PCS' | 'SET' | 'PAIR' | 'BOX' | 'PACK' | 'ROLL' | 'LITER' | 'KG' | 'BOTTLE' | 'UNIT'

/** Master data inventory — the definition of a thing, held once, never per warehouse. */
export interface InventoryItem {
  id: string
  /** ITM-UNI-0001 */
  sku: string
  name: string
  description?: string
  category: ItemCategory
  subCategory?: string
  uom: Uom
  brand?: string
  variant?: string
  barcode?: string

  /** Standard cost used to value stock, in IDR. */
  standardCost: number
  /** Company-wide planning levels; a warehouse may hold a tighter override. */
  minStock: number
  maxStock: number
  reorderPoint: number
  reorderQty: number

  trackBatch: boolean
  hasExpiry: boolean
  shelfLifeDays?: number
  hazardous: boolean

  defaultSupplier?: string
  leadTimeDays: number
  /** Which service lines consume this item. */
  serviceTypes: ServiceType[]

  status: 'ACTIVE' | 'DISCONTINUED'
  createdAt: ISODate
  updatedAt: ISODate
  updatedBy: string
}

export type WarehouseType = 'CENTRAL' | 'REGIONAL' | 'SITE'

export interface Warehouse {
  id: string
  /** WH-JKT-01 */
  code: string
  name: string
  type: WarehouseType
  address: string
  city: string
  province: string
  managerName: string
  phone: string
  capacitySqm: number
  status: 'ACTIVE' | 'INACTIVE'
  openedAt: ISODate
  notes?: string
}

export type StockCondition = 'GOOD' | 'DAMAGED' | 'QUARANTINE'

/**
 * Warehouse inventory — one item, in one warehouse, in one bin.
 * A warehouse holds many of these; each one points at exactly one master item.
 */
export interface WarehouseStock {
  id: string
  warehouseId: string
  itemId: string
  binLocation: string
  qtyOnHand: number
  /** Already promised to a project; not available to anyone else. */
  qtyReserved: number
  /** Overrides the master's level when this warehouse runs to a different plan. */
  minStockOverride?: number
  batchNo?: string
  expiryDate?: ISODate
  /** Actual purchase cost of what is in this bin — may drift from standard cost. */
  unitCost: number
  condition: StockCondition
  lastCountedAt?: ISODate
  lastMovementAt?: ISODate
}

/* ================================================================
   Company profile
   ================================================================ */

export interface CompanyProfile {
  legalName: string
  brandName: string
  registrationNo: string
  npwp: string
  address: string
  city: string
  province: string
  phone: string
  email: string
  website: string
  director: string
  licenceNo: string
  foundedYear: number
}
