/* ==================================================================
   Domain model — Indonesian export freight forwarder
   ================================================================== */

export type ID = string
export type ISODate = string

/* ---------- shared enums ---------- */
export type Currency = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'JPY' | 'CNY' | 'AUD' | 'KRW'

export type Incoterm = 'EXW' | 'FCA' | 'FAS' | 'FOB' | 'CFR' | 'CIF' | 'CPT' | 'CIP' | 'DAP' | 'DPU' | 'DDP'

export type TransportMode = 'FCL' | 'LCL' | 'AIR' | 'BREAKBULK' | 'RORO'

export type ServiceScope = 'PORT_TO_PORT' | 'DOOR_TO_PORT' | 'PORT_TO_DOOR' | 'DOOR_TO_DOOR'

export type PaymentTerm = 'CAD' | 'TT_ADVANCE' | 'NET_7' | 'NET_14' | 'NET_30' | 'NET_45' | 'NET_60' | 'LC_AT_SIGHT' | 'LC_USANCE' | 'CONSIGNMENT_SETTLEMENT'

export type FreightTerm = 'PREPAID' | 'COLLECT'

/* ---------- customers ---------- */
export type PartyRole = 'CLIENT' | 'SHIPPER' | 'CONSIGNEE' | 'NOTIFY' | 'AGENT' | 'VENDOR'
export type CustomerStatus = 'ACTIVE' | 'PROSPECT' | 'ON_HOLD' | 'BLACKLISTED'
export type RiskRating = 'LOW' | 'MEDIUM' | 'HIGH'

export interface Contact {
  id: ID
  name: string
  title?: string
  email?: string
  phone?: string
  isPrimary?: boolean
}

export interface CountryOffice {
  id: ID
  customerId: ID
  name: string
  countryCode: string
  country: string
  city: string
  /** UN/LOCODE of the office's default sea port */
  portCode?: string
  portName?: string
  addressLine: string
  postalCode?: string
  timezone?: string
  /** EORI / customs registration number in that country */
  customsId?: string
  vatNumber?: string
  roles: PartyRole[]
  isHeadquarter: boolean
  isBillingOffice: boolean
  contacts: Contact[]
  notes?: string
  active: boolean
}

export interface Customer {
  id: ID
  code: string
  legalName: string
  tradeName?: string
  /** Indonesian tax id for local parties */
  taxId?: string
  industry: string
  roles: PartyRole[]
  status: CustomerStatus
  riskRating: RiskRating
  creditLimit: number
  creditCurrency: Currency
  creditTermDays: number
  outstandingAr: number
  defaultIncoterm: Incoterm
  defaultPaymentTerm: PaymentTerm
  salesOwner: string
  onboardedAt: ISODate
  website?: string
  notes?: string
  offices: CountryOffice[]
}

/* ---------- pricing packages ---------- */
export type RateBasis = 'PER_CONTAINER' | 'PER_CBM' | 'PER_KG' | 'PER_TON' | 'PER_BL' | 'PER_SHIPMENT' | 'PER_DOCUMENT' | 'PERCENT_OF_VALUE'
export type PackageStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'ARCHIVED'

export interface RateLine {
  id: ID
  chargeCode: string
  description: string
  basis: RateBasis
  containerType?: ContainerType
  buyRate: number
  sellRate: number
  minCharge?: number
  currency: Currency
  vatApplicable: boolean
  mandatory: boolean
}

export interface ServicePackage {
  id: ID
  code: string
  name: string
  mode: TransportMode
  scope: ServiceScope
  originPortCode: string
  originPortName: string
  destPortCode: string
  destPortName: string
  destCountry: string
  incoterm: Incoterm
  currency: Currency
  transitDays: number
  freeTimeDays: number
  validFrom: ISODate
  validTo: ISODate
  status: PackageStatus
  carrier?: string
  inclusions: string[]
  exclusions: string[]
  rateLines: RateLine[]
  usageCount: number
  notes?: string
}

/* ---------- projects (shipment jobs) ---------- */
export type ProjectType = 'FULL_EXPORT' | 'CONSIGNMENT' | 'PARTIAL_LCL' | 'PROJECT_CARGO' | 'TRIANGULAR' | 'CROSS_TRADE'
export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
export type ProjectPriority = 'STANDARD' | 'HIGH' | 'CRITICAL'
export type BLType = 'ORIGINAL_3_3' | 'SEAWAY' | 'TELEX_RELEASE' | 'EXPRESS'
export type BLStatus = 'NOT_ISSUED' | 'DRAFT' | 'APPROVED_BY_SHIPPER' | 'ISSUED' | 'SURRENDERED' | 'RELEASED'

export type StageKey =
  | 'INQUIRY'
  | 'BOOKING'
  | 'CARGO_PLAN'
  | 'DOCUMENTATION'
  | 'STUFFING'
  | 'DEPARTURE'
  | 'ARRIVAL'
  | 'SETTLEMENT'

export interface StageTask {
  id: ID
  label: string
  done: boolean
  blocking: boolean
  owner?: string
  dueAt?: ISODate
  completedAt?: ISODate
  hint?: string
}

export interface ProjectStage {
  key: StageKey
  enteredAt?: ISODate
  completedAt?: ISODate
  tasks: StageTask[]
}

export interface ConsignmentTerms {
  agreementNo: string
  /** goods remain the shipper's property until sold by the consignee */
  titleRetained: boolean
  settlementCycleDays: number
  commissionPct: number
  minimumGuaranteedUnits?: number
  unsoldReturnDays: number
  reportedUnitsSold: number
  totalUnitsShipped: number
  lastSalesReportAt?: ISODate
  settledAmount: number
  currency: Currency
}

export interface TimelineEvent {
  id: ID
  at: ISODate
  type: 'STATUS' | 'DOCUMENT' | 'CUSTOMS' | 'TRANSPORT' | 'FINANCE' | 'NOTE' | 'EXCEPTION'
  title: string
  detail?: string
  actor: string
}

export interface Project {
  id: ID
  code: string
  jobNo: string
  name: string
  type: ProjectType
  status: ProjectStatus
  priority: ProjectPriority
  stage: StageKey
  stages: ProjectStage[]

  clientId: ID
  clientOfficeId: ID
  shipperId: ID
  shipperOfficeId: ID
  consigneeId: ID
  consigneeOfficeId: ID
  notifyPartyId?: ID

  mode: TransportMode
  scope: ServiceScope
  incoterm: Incoterm
  freightTerm: FreightTerm
  paymentTerm: PaymentTerm
  packageId?: ID

  commodity: string
  hsCodes: string[]
  cargoValue: number
  cargoCurrency: Currency
  insured: boolean
  insuranceValue?: number
  dangerousGoods: boolean

  placeOfReceipt?: string
  polCode: string
  polName: string
  podCode: string
  podName: string
  placeOfDelivery?: string
  transhipmentPort?: string
  destCountry: string

  carrier?: string
  vessel?: string
  voyage?: string
  bookingNo?: string
  masterBlNo?: string
  houseBlNo?: string
  blType: BLType
  blStatus: BLStatus

  siCutoff?: ISODate
  vgmCutoff?: ISODate
  gateInCutoff?: ISODate
  etd?: ISODate
  atd?: ISODate
  eta?: ISODate
  ata?: ISODate

  pebNumber?: string
  pebDate?: ISODate
  npeDate?: ISODate
  cooForm?: string
  cooNumber?: string

  currency: Currency
  fxRate: number
  quotedRevenue: number
  consignment?: ConsignmentTerms
  ownerName: string
  /** the operator who runs this job day to day */
  assignedOperatorId?: ID
  /** the hand-over: a job is not worked until an operator has taken it */
  handover?: JobHandover
  createdAt: ISODate
  updatedAt: ISODate
  tags: string[]
  remarks?: string
  timeline: TimelineEvent[]
}

/* ---------- containers ---------- */
export type ContainerType = '20GP' | '40GP' | '40HC' | '45HC' | '20RF' | '40RH' | '20OT' | '40FR' | 'LCL'
export type ContainerStatus = 'PLANNED' | 'BOOKED' | 'AT_DEPOT' | 'STUFFING' | 'STUFFED' | 'GATE_IN' | 'LOADED' | 'IN_TRANSIT' | 'DISCHARGED' | 'DELIVERED' | 'RETURNED'
export type PackageUnit = 'CARTON' | 'PALLET' | 'CRATE' | 'DRUM' | 'BAG' | 'ROLL' | 'BUNDLE' | 'PIECE'

export interface CargoItem {
  id: ID
  containerId: ID
  description: string
  hsCode?: string
  marksAndNumbers?: string
  packageUnit: PackageUnit
  quantity: number
  lengthCm: number
  widthCm: number
  heightCm: number
  grossWeightKg: number
  netWeightKg: number
  stackable: boolean
  unitValue?: number
  poNumber?: string
}

export interface Container {
  id: ID
  projectId: ID
  seq: number
  containerNo?: string
  type: ContainerType
  sealNo?: string
  sealType?: 'BOLT' | 'CABLE' | 'CUSTOMS'
  status: ContainerStatus
  depot?: string
  tareKg?: number
  vgmKg?: number
  vgmMethod?: 'SM1' | 'SM2'
  vgmSubmittedAt?: ISODate
  stuffingDate?: ISODate
  stuffingLocation?: string
  gateInDate?: ISODate
  reeferTempC?: number
  imoClass?: string
  unNumber?: string
  remarks?: string
  items: CargoItem[]
}

/* ---------- the hand-over to an operator ---------- */
export type HandoverStatus = 'OFFERED' | 'ACCEPTED' | 'DECLINED' | 'REASSIGNED'

export interface JobHandover {
  status: HandoverStatus
  /** who put it on the operator's desk */
  offeredBy: string
  offeredAt: ISODate
  respondedAt?: ISODate
  /** required on a decline — an unexplained refusal tells the desk nothing */
  reason?: string
  /** what the operator confirmed they had before taking it on */
  checklist: HandoverCheck[]
}

export interface HandoverCheck {
  key: string
  label: string
  hint: string
  required: boolean
  confirmed: boolean
}

/* ---------- documents ---------- */
export type DocType =
  | 'SHIPPING_INSTRUCTION' | 'DRAFT_BL' | 'MASTER_BL' | 'HOUSE_BL' | 'COMMERCIAL_INVOICE' | 'PACKING_LIST'
  | 'CERTIFICATE_OF_ORIGIN' | 'PEB' | 'NPE' | 'INSURANCE_CERTIFICATE' | 'PHYTOSANITARY' | 'FUMIGATION'
  | 'VGM_CERTIFICATE' | 'DELIVERY_ORDER' | 'LETTER_OF_CREDIT' | 'CONSIGNMENT_AGREEMENT' | 'EXPORT_PERMIT'
  | 'MSDS' | 'BOOKING_CONFIRMATION' | 'ARRIVAL_NOTICE' | 'PROOF_OF_DELIVERY'
  | 'ISPM_15' | 'STUFFING_REPORT' | 'SENDING_DOC' | 'JOB_SHEET' | 'OTHER'

export type DocStatus = 'REQUIRED' | 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'ISSUED' | 'SURRENDERED' | 'REJECTED' | 'EXPIRED'

export interface ShipmentDocument {
  id: ID
  projectId: ID
  type: DocType
  title: string
  docNo?: string
  version: number
  status: DocStatus
  mandatory: boolean
  issuedBy?: string
  issuedAt?: ISODate
  expiresAt?: ISODate
  reviewedBy?: string
  fileName?: string
  fileSizeKb?: number
  stage: StageKey
  remarks?: string
  /** values captured against the document standard for this type */
  fields?: DocFieldValue[]
  updatedAt: ISODate
}

/* ---------- charges ---------- */
export type ChargeStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'INVOICED' | 'PAID' | 'DISPUTED'
export type ChargeCategory = 'FREIGHT' | 'ORIGIN' | 'DESTINATION' | 'CUSTOMS' | 'DOCUMENTATION' | 'TRUCKING' | 'SURCHARGE' | 'INSURANCE' | 'PENALTY' | 'OTHER'

export interface ProjectCharge {
  id: ID
  projectId: ID
  chargeCode: string
  description: string
  category: ChargeCategory
  basis: RateBasis
  quantity: number
  buyRate: number
  sellRate: number
  currency: Currency
  fxRate: number
  vatApplicable: boolean
  whtApplicable: boolean
  vendor?: string
  /** set once the vendor is a managed partner rather than free text */
  partnerId?: ID
  /** how this cost is funded and settled — biaya master / lapangan / reimbursemen */
  costType: CostType
  /** only meaningful on a FIELD cost: the cash advance and what came back */
  settlement?: FieldSettlement
  freightTerm: FreightTerm
  billable: boolean
  status: ChargeStatus
  invoiceNo?: string
  fromPackage: boolean
  containerId?: ID
  remarks?: string
  createdAt: ISODate
}

/* ---------- finance ---------- */
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COGS' | 'EXPENSE'
export type NormalBalance = 'DEBIT' | 'CREDIT'

export interface Account {
  id: ID
  code: string
  name: string
  type: AccountType
  normalBalance: NormalBalance
  parentCode?: string
  isPostable: boolean
  currency: Currency
}

export interface JournalLine {
  id: ID
  accountCode: string
  description?: string
  debit: number
  credit: number
  projectCode?: string
  costCenter?: string
}

export type JournalStatus = 'DRAFT' | 'POSTED' | 'VOID'
export type JournalSource = 'MANUAL' | 'AR_INVOICE' | 'AP_BILL' | 'PAYMENT' | 'RECEIPT' | 'ACCRUAL' | 'FX_REVALUATION' | 'CONSIGNMENT_SETTLEMENT'

export interface JournalEntry {
  id: ID
  entryNo: string
  date: ISODate
  memo: string
  source: JournalSource
  reference?: string
  projectCode?: string
  currency: Currency
  fxRate: number
  status: JournalStatus
  postedBy?: string
  postedAt?: ISODate
  lines: JournalLine[]
}

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID'
export type InvoiceKind = 'AR' | 'AP'

export interface Invoice {
  id: ID
  number: string
  kind: InvoiceKind
  partyName: string
  projectCode?: string
  issueDate: ISODate
  dueDate: ISODate
  currency: Currency
  fxRate: number
  subtotal: number
  vat: number
  wht: number
  total: number
  paid: number
  status: InvoiceStatus
  terms: PaymentTerm
}

/* ==================================================================
   PHASE 2 — commercial front end, partner network, tracking,
   warehouse, customs and platform settings
   ================================================================== */

/* ---------- quotations & sales pipeline ---------- */
export type QuoteStatus = 'DRAFT' | 'SENT' | 'UNDER_NEGOTIATION' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN'
export type QuoteSource = 'INBOUND_RFQ' | 'OUTBOUND' | 'TENDER' | 'RENEWAL' | 'AGENT_NOMINATION'
export type LossReason = 'PRICE' | 'TRANSIT_TIME' | 'SPACE_UNAVAILABLE' | 'SERVICE_SCOPE' | 'CREDIT_TERMS' | 'INCUMBENT_RETAINED' | 'NO_DECISION' | 'CARGO_CANCELLED' | 'OTHER'

export interface QuoteLine {
  id: ID
  chargeCode: string
  description: string
  basis: RateBasis
  quantity: number
  buyRate: number
  sellRate: number
  currency: Currency
  vatApplicable: boolean
  optional: boolean
}

export interface QuoteEvent {
  id: ID
  at: ISODate
  type: 'CREATED' | 'SENT' | 'REVISED' | 'NEGOTIATION' | 'DECIDED' | 'NOTE' | 'CONVERTED'
  note: string
  actor: string
}

export interface Quotation {
  id: ID
  number: string
  version: number
  revisionOfId?: ID
  supersededById?: ID

  customerId: ID
  customerOfficeId: ID
  contactName?: string
  source: QuoteSource
  status: QuoteStatus

  mode: TransportMode
  scope: ServiceScope
  incoterm: Incoterm
  paymentTerm: PaymentTerm
  polCode: string
  polName: string
  podCode: string
  podName: string
  destCountry: string

  commodity: string
  hsCodes: string[]
  equipment: { type: ContainerType; quantity: number }[]
  cargoCbm?: number
  cargoWeightKg?: number
  cargoValue?: number

  packageId?: ID
  currency: Currency
  fxRate: number
  transitDays: number
  freeTimeDays: number
  validFrom: ISODate
  validTo: ISODate

  lines: QuoteLine[]
  terms?: string
  remarks?: string

  probability: number
  expectedCloseAt?: ISODate
  ownerName: string

  sentAt?: ISODate
  decidedAt?: ISODate
  lossReason?: LossReason
  competitorName?: string
  lostToAmount?: number

  convertedProjectId?: ID
  createdAt: ISODate
  updatedAt: ISODate
  events: QuoteEvent[]
}

/* ---------- partners & vendors ---------- */
export type PartnerType =
  | 'CARRIER' | 'OVERSEAS_AGENT' | 'TRUCKING' | 'DEPOT' | 'CUSTOMS_BROKER'
  | 'WAREHOUSE' | 'SURVEYOR' | 'INSURANCE' | 'FUMIGATION' | 'TERMINAL'
export type PartnerStatus = 'ACTIVE' | 'PROSPECT' | 'SUSPENDED'

export interface PartnerScore {
  /** share of milestones this partner was responsible for that landed on time */
  onTimePct: number
  /** share of documents this partner issued that were accepted first time */
  docAccuracyPct: number
  /** average hours to first response on an operational request */
  responseHours: number
  openDisputes: number
  jobsHandled: number
}

export interface Partner {
  id: ID
  code: string
  name: string
  types: PartnerType[]
  status: PartnerStatus
  countryCode: string
  country: string
  city: string
  addressLine?: string
  scac?: string
  taxId?: string
  currency: Currency
  paymentTermDays: number
  contractNo?: string
  contractValidTo?: ISODate
  insuranceValidTo?: ISODate
  services: string[]
  lanes: string[]
  contacts: Contact[]
  score: PartnerScore
  apOutstanding: number
  notes?: string
  onboardedAt: ISODate
}

/* ---------- milestones (UN/EDIFACT IFTSTA shaped) ---------- */
export type MilestoneCode =
  | 'BOOKING_CONFIRMED' | 'EMPTY_RELEASED' | 'CARGO_RECEIVED' | 'STUFFED' | 'VGM_SUBMITTED'
  | 'CUSTOMS_CLEARED_ORIGIN' | 'GATE_IN' | 'LOADED_ON_VESSEL' | 'VESSEL_DEPARTED'
  | 'TRANSHIPMENT_DISCHARGED' | 'TRANSHIPMENT_LOADED' | 'VESSEL_ARRIVED' | 'DISCHARGED'
  | 'CUSTOMS_RELEASED_DEST' | 'GATE_OUT' | 'DELIVERED' | 'EMPTY_RETURNED'

export type MilestoneSource = 'MANUAL' | 'CARRIER_EDI' | 'PORTAL' | 'AGENT'

export interface Milestone {
  id: ID
  projectId: ID
  containerId?: ID
  code: MilestoneCode
  plannedAt?: ISODate
  actualAt?: ISODate
  locationCode?: string
  locationName?: string
  source: MilestoneSource
  vessel?: string
  voyage?: string
  partnerId?: ID
  remarks?: string
  recordedBy: string
  recordedAt: ISODate
}

/* ---------- warehouse & CFS ---------- */
export type ReceiptStatus = 'IN_STOCK' | 'PARTIALLY_RELEASED' | 'RELEASED' | 'ON_HOLD'

export interface WarehouseReceipt {
  id: ID
  number: string
  warehouseCode: string
  warehouseName: string
  customerId: ID
  projectId?: ID
  status: ReceiptStatus
  receivedAt: ISODate
  releasedAt?: ISODate
  location: string
  description: string
  hsCode?: string
  marks?: string
  poNumber?: string
  packages: number
  packagesReleased: number
  cbm: number
  weightKg: number
  freeDays: number
  storageRatePerCbmDay: number
  currency: Currency
  handlingIn: number
  handlingOut: number
  remarks?: string
  receivedBy: string
}

/* ---------- customs filings ---------- */
export type FilingType = 'PEB' | 'NPE' | 'COO' | 'PIB' | 'PPFTZ'
export type FilingStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'AMENDED'
/** Bea Cukai response lane */
export type CustomsChannel = 'PENDING' | 'HIJAU' | 'KUNING' | 'MERAH'

export interface FilingDocument {
  type: DocType
  label: string
  mandatory: boolean
  uploaded: boolean
}

export interface CustomsFiling {
  id: ID
  projectId: ID
  type: FilingType
  regNumber?: string
  regDate?: ISODate
  ceisaRef?: string
  status: FilingStatus
  channel: CustomsChannel
  submittedAt?: ISODate
  respondedAt?: ISODate
  /** in-house PPJK or an appointed broker partner */
  filedByPartnerId?: ID
  filedByName: string
  exporterOfRecord: string
  declaredValue: number
  declaredCurrency: Currency
  officeCode: string
  remarks?: string
  supportingDocs: FilingDocument[]
}

/* ---------- platform settings & audit ---------- */
export interface NumberingSeries {
  key: string
  label: string
  prefix: string
  includeYear: boolean
  padding: number
  nextNumber: number
}

export interface KpiTargets {
  onTimePct: number
  winRatePct: number
  grossMarginPct: number
  dsoDays: number
  utilisationPct: number
  docAccuracyPct: number
}

export interface AppSettings {
  companyName: string
  companyTaxId: string
  baseCurrency: Currency
  fxRates: Record<string, number>
  vatRate: number
  whtRate: number
  chargeApprovalThreshold: number
  billApprovalThreshold: number
  numbering: NumberingSeries[]
  kpiTargets: KpiTargets
  /** HS prefixes that require an export permit (LARTAS) */
  restrictedHsPrefixes: string[]
}

/* ==================================================================
   PHASE 3 — auth, value-added services, incident handling,
   document standards and the forwarder's own company record
   ================================================================== */

/* ---------- authentication ---------- */
export type UserRole =
  | 'ADMIN' | 'OPERATIONS' | 'OPERATOR' | 'SALES' | 'FINANCE' | 'WAREHOUSE' | 'VIEWER'
export type AccountStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'LOCKED' | 'SUSPENDED' | 'INVITED'

export interface UserAccount {
  id: ID
  email: string
  /** demo only — a real build never stores or compares a password client-side */
  password: string
  fullName: string
  jobTitle: string
  role: UserRole
  status: AccountStatus
  branchCode?: string
  phone?: string
  failedAttempts: number
  lockedUntil?: ISODate
  lastLoginAt?: ISODate
  mustChangePassword: boolean
  twoFactorEnabled: boolean
  createdAt: ISODate
}

export interface PasswordResetToken {
  token: string
  email: string
  issuedAt: ISODate
  expiresAt: ISODate
  used: boolean
}

/* ---------- value-added services ---------- */
export type ServiceCategory =
  | 'TREATMENT' | 'PACKING' | 'INSPECTION' | 'INSURANCE' | 'CUSTOMS'
  | 'HANDLING' | 'TRANSPORT' | 'STORAGE' | 'DOCUMENTATION' | 'SPECIAL_CARGO'

export type ServiceTrigger =
  | 'WOODEN_PACKAGING' | 'PLANT_PRODUCT' | 'ANIMAL_PRODUCT' | 'FOOD_GRADE'
  | 'DANGEROUS_GOODS' | 'REEFER' | 'HIGH_VALUE' | 'OUT_OF_GAUGE' | 'FRAGILE'
  | 'DESTINATION_AU' | 'DESTINATION_US' | 'DESTINATION_EU' | 'LCL' | 'ALWAYS'

export interface AdditionalService {
  id: ID
  code: string
  name: string
  category: ServiceCategory
  description: string
  /** what the customer actually gets, in their words */
  deliverable: string
  basis: RateBasis
  buyRate: number
  sellRate: number
  currency: Currency
  leadTimeDays: number
  /** charge code used when this service is pushed onto a job's charge sheet */
  chargeCode: string
  /** document this service produces, if any */
  producesDocument?: DocType
  /** conditions that make this service mandatory rather than optional */
  mandatoryWhen: ServiceTrigger[]
  /** conditions that make it worth offering */
  suggestedWhen: ServiceTrigger[]
  providerPartnerId?: ID
  active: boolean
  notes?: string
}

export type JobServiceStatus = 'PROPOSED' | 'ACCEPTED' | 'DECLINED' | 'BOOKED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

export interface JobService {
  id: ID
  projectId: ID
  serviceId: ID
  code: string
  name: string
  status: JobServiceStatus
  mandatory: boolean
  /** why it is on this job — the rule that fired, or "added by hand" */
  reason: string
  quantity: number
  buyRate: number
  sellRate: number
  currency: Currency
  providerPartnerId?: ID
  scheduledAt?: ISODate
  completedAt?: ISODate
  certificateNo?: string
  chargeId?: ID
  remarks?: string
}

/* ---------- incidents: the negative cases ---------- */
export type IncidentType =
  | 'ROLLOVER' | 'SHORT_SHIPPED' | 'BOOKING_CANCELLED' | 'GATE_REJECTED'
  | 'CUSTOMS_HOLD' | 'DOCUMENT_DISCREPANCY' | 'CARGO_DAMAGE' | 'CARGO_SHORTAGE'
  | 'TEMPERATURE_DEVIATION' | 'DEMURRAGE' | 'DETENTION' | 'VESSEL_OMISSION'
  | 'CUSTOMER_CANCELLED' | 'PAYMENT_DEFAULT' | 'RETURN_TO_ORIGIN' | 'MISDECLARATION'

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'ACTION_TAKEN' | 'AWAITING_PARTY' | 'RESOLVED' | 'WRITTEN_OFF' | 'ESCALATED'
export type LiableParty = 'CARRIER' | 'SHIPPER' | 'CONSIGNEE' | 'FORWARDER' | 'VENDOR' | 'CUSTOMS' | 'INSURER' | 'UNDETERMINED'

export interface IncidentAction {
  id: ID
  at: ISODate
  action: string
  actor: string
  outcome?: string
}

export interface Incident {
  id: ID
  reference: string
  projectId?: ID
  containerId?: ID
  type: IncidentType
  severity: IncidentSeverity
  status: IncidentStatus
  title: string
  detail: string
  detectedAt: ISODate
  resolvedAt?: ISODate
  liableParty: LiableParty
  partnerId?: ID
  /** what it costs us before recovery */
  costImpact: number
  /** what we expect to recover from the liable party or insurer */
  recoveryExpected: number
  recoveryReceived: number
  currency: Currency
  claimRef?: string
  claimFiledAt?: ISODate
  rootCause?: string
  preventiveAction?: string
  owner: string
  actions: IncidentAction[]
}

/* ---------- document standards ---------- */
export interface DocFieldSpec {
  key: string
  label: string
  required: boolean
  hint: string
}

export interface DocFieldValue {
  key: string
  value: string
}

/* ---------- the forwarder's own company record ---------- */
export type LicenceKind =
  | 'FREIGHT_FORWARDING' | 'CUSTOMS_BROKER' | 'NVOCC' | 'IATA_AGENT' | 'AEO'
  | 'BONDED_WAREHOUSE' | 'BUSINESS_REGISTRATION' | 'TAX_REGISTRATION' | 'MEMBERSHIP'

export interface CompanyLicence {
  id: ID
  kind: LicenceKind
  name: string
  number: string
  issuer: string
  issuedAt: ISODate
  expiresAt?: ISODate
  scope?: string
  notes?: string
}

export interface CompanyBranch {
  id: ID
  code: string
  name: string
  city: string
  countryCode: string
  addressLine: string
  phone?: string
  email?: string
  managerName: string
  isHeadOffice: boolean
  servesPorts: string[]
  headcount: number
}

export interface BankAccount {
  id: ID
  label: string
  bankName: string
  accountName: string
  accountNumber: string
  swift?: string
  currency: Currency
  branchCode?: string
  isPrimary: boolean
}

export interface CompanyProfile {
  legalName: string
  tradingName: string
  taxId: string
  registrationNo: string
  foundedYear: number
  addressLine: string
  city: string
  countryCode: string
  phone: string
  email: string
  website: string
  liabilityCoverage: number
  liabilityCurrency: Currency
  liabilityExpiresAt: ISODate
  standardTradingConditions: string
  licences: CompanyLicence[]
  branches: CompanyBranch[]
  bankAccounts: BankAccount[]
}

/* ==================================================================
   PHASE 4 — the stuffing event, and the cost buckets an Indonesian
   forwarding desk actually settles against
   ================================================================== */

/* ---------- stuffing ---------- */
export type StuffingLocationType = 'FACTORY' | 'CFS' | 'DEPOT' | 'WAREHOUSE' | 'PORT_YARD'
export type StuffingShift = 'MORNING' | 'AFTERNOON' | 'NIGHT'
export type StuffingStatus =
  | 'PLANNED' | 'EMPTY_RELEASED' | 'IN_PROGRESS' | 'SEALED' | 'GATE_IN' | 'COMPLETED' | 'CANCELLED'

/**
 * One stuffing event: a container, a date, a place and the people who did it.
 * Kept separate from the container because a container can be re-stuffed after a
 * rejection, and because the yard schedule is worked by date, not by job.
 */
export interface StuffingJob {
  id: ID
  reference: string
  projectId: ID
  containerId?: ID

  /** tanggal stuffing */
  stuffingDate: ISODate
  shift: StuffingShift
  startTime?: string
  endTime?: string

  locationType: StuffingLocationType
  locationName: string
  addressLine?: string

  /** port of loading for this unit — usually the job's, but a feeder can differ */
  polCode: string
  polName: string
  terminal?: string

  /** empty equipment */
  depot?: string
  emptyReleaseDate?: ISODate
  truckPlate?: string
  driverName?: string
  haulierPartnerId?: ID

  /** who was there — the tally is the evidence when a shortage is claimed */
  supervisor: string
  tallyClerk?: string
  labourCount: number

  plannedPackages: number
  stuffedPackages: number
  plannedCbm: number
  stuffedCbm: number

  sealNo?: string
  sealedAt?: ISODate
  photosTaken: number
  tallySheetRef?: string

  gateInCutoff?: ISODate
  gateInAt?: ISODate

  status: StuffingStatus
  remarks?: string
}

/* ---------- cost buckets ---------- */
/**
 * How a cost is funded and settled, not what it is for.
 * MASTER (biaya master)        — contracted centrally, vendor invoices, finance pays on terms.
 * FIELD (biaya lapangan)       — cash spent at the port from an operator's float, settled after.
 * REIMBURSEMENT (reimbursemen) — a disbursement paid on the customer's behalf, re-billed at cost.
 */
export type CostType = 'MASTER' | 'FIELD' | 'REIMBURSEMENT'

export interface FieldSettlement {
  /** cash handed to the operator before the job */
  advanceAmount: number
  advancedAt?: ISODate
  advancedTo?: string
  /** what came back with receipts */
  settledAmount: number
  settledAt?: ISODate
  receiptNo?: string
}
