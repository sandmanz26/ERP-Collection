/**
 * Wanakarya — domain model.
 *
 * A furniture works that builds to order and imports most of what it builds with.
 * The model is shaped around one fact: a material shortage is never a quantity,
 * it is a date — the date a box of runners becomes legally available to issue.
 */

export type ID = string
export type ISODate = string

export type Currency = 'IDR' | 'USD' | 'EUR' | 'CNY' | 'SGD' | 'JPY' | 'MYR'
export type Incoterm = 'EXW' | 'FCA' | 'FOB' | 'CFR' | 'CIF' | 'CPT' | 'CIP' | 'DAP' | 'DDP'
export type PaymentInstrument = 'TT_ADVANCE' | 'TT_30' | 'TT_60' | 'LC_SIGHT' | 'LC_USANCE_90' | 'DP' | 'DA' | 'OPEN_ACCOUNT'

/* ==================================================================
   1 · Customers and the order book
   ================================================================== */

export type CustomerSegment = 'RETAIL_CHAIN' | 'CONTRACT_FFE' | 'EXPORT' | 'ECOMMERCE' | 'DEALER'
export type CustomerStatus = 'ACTIVE' | 'PROSPECT' | 'ON_HOLD' | 'BLACKLISTED'

export interface Contact {
  id: ID
  name: string
  title: string
  email: string
  phone: string
  primary: boolean
}

export interface Customer {
  id: ID
  code: string
  name: string
  segment: CustomerSegment
  status: CustomerStatus
  country: string
  city: string
  address: string
  taxId: string
  currency: Currency
  paymentTermDays: number
  /** deposit demanded before an imported-content order releases its purchase orders */
  depositPercent: number
  creditLimit: number
  /** penalty per day of late delivery, where the contract carries one */
  latePenaltyPerDay?: number
  contacts: Contact[]
  since: ISODate
  note?: string
}

export type SalesOrderStatus = 'DRAFT' | 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'IN_PRODUCTION' | 'PARTIALLY_SHIPPED' | 'SHIPPED' | 'CLOSED' | 'CANCELLED'
export type OrderPriority = 'STANDARD' | 'HIGH' | 'CRITICAL'

export interface SalesOrderLine {
  id: ID
  productId: ID
  description: string
  quantity: number
  unitPrice: number
  /** what the customer asked for */
  requestedDate: ISODate
  /** what we signed up to */
  confirmedDate?: ISODate
  /** what the three clocks said was honest, at the moment of promising */
  atpDate?: ISODate
  /** which clock decided the ATP date */
  atpConstraint?: 'MATERIAL' | 'IMPORT' | 'KILN' | 'CAPACITY' | 'NONE'
  atpNote?: string
  shippedQuantity: number
}

export interface SalesOrder {
  id: ID
  code: string
  customerId: ID
  status: SalesOrderStatus
  priority: OrderPriority
  orderDate: ISODate
  currency: Currency
  fxRate: number
  lines: SalesOrderLine[]
  depositPercent: number
  depositReceived: number
  depositReceivedAt?: ISODate
  poReference?: string
  salesPerson: string
  incoterm?: Incoterm
  destination?: string
  note?: string
}

/* ==================================================================
   2 · Products, bills of material, routings
   ================================================================== */

export type ProductCategory = 'CASE_GOODS' | 'SEATING' | 'TABLES' | 'UPHOLSTERY' | 'OUTDOOR' | 'BEDS' | 'COMPONENT'
export type FinishFamily = 'PU_MATT' | 'PU_GLOSS' | 'NC_LACQUER' | 'WATER_BASED' | 'OIL_WAX' | 'UV_PANEL' | 'RAW'

export interface Product {
  id: ID
  sku: string
  name: string
  collection: string
  category: ProductCategory
  /** a sub-assembly is a BOM node with its own routing, not a catalogue line */
  isSubAssembly: boolean
  finish: FinishFamily
  /** millimetres */
  widthMm: number
  depthMm: number
  heightMm: number
  /** packed carton volume, m³ — drives container planning and freight */
  packedCbm: number
  netWeightKg: number
  listPrice: number
  currency: Currency
  active: boolean
  /** target margin the commercial team prices to */
  targetMarginPercent: number
  note?: string
}

export type BomStatus = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED'

export interface BomLine {
  id: ID
  /** either an item (purchased) or a product marked isSubAssembly */
  componentType: 'ITEM' | 'SUB_ASSEMBLY'
  componentId: ID
  /** what ends up in the finished piece */
  netQuantity: number
  uom: string
  /** how much of what is issued survives to become net quantity, 0–1 */
  yield: number
  /** additional loss beyond yield — offcuts sized to nothing, 0–1 */
  scrapPercent: number
  /** which routing step consumes it */
  operationNo: number
  /** approved substitute when the primary is short */
  alternateItemId?: ID
  note?: string
}

export interface Bom {
  id: ID
  productId: ID
  version: number
  status: BomStatus
  effectiveFrom: ISODate
  lines: BomLine[]
  approvedBy?: string
  note?: string
}

export type WorkCentreKind =
  | 'KILN' | 'ROUGH_MILL' | 'MACHINING' | 'SANDING' | 'ASSEMBLY'
  | 'FINISHING' | 'UPHOLSTERY' | 'PACKING' | 'SUBCONTRACT'

export interface WorkCentre {
  id: ID
  code: string
  name: string
  kind: WorkCentreKind
  /** parallel stations, benches or booths */
  stations: number
  /** productive hours per station per day */
  hoursPerDay: number
  labourRatePerHour: number
  overheadRatePerHour: number
  supervisor: string
  active: boolean
  note?: string
}

export type InspectionPoint = 'NONE' | 'INCOMING' | 'IN_PROCESS' | 'FINAL'

export interface RoutingOperation {
  id: ID
  operationNo: number
  name: string
  workCentreId: ID
  setupMinutes: number
  /** minutes per unit produced */
  runMinutesPerUnit: number
  /** waiting that is physics, not queueing — lacquer curing, glue setting */
  queueHours: number
  subcontracted: boolean
  subcontractorId?: ID
  subcontractCostPerUnit?: number
  inspectionAfter: InspectionPoint
  instruction?: string
}

export interface Routing {
  id: ID
  productId: ID
  version: number
  status: BomStatus
  operations: RoutingOperation[]
}

/* ==================================================================
   3 · Items, suppliers, lots, stock
   ================================================================== */

export type ItemType =
  | 'SOLID_TIMBER' | 'PANEL' | 'VENEER_LAMINATE' | 'HARDWARE' | 'FINISHING_CHEMICAL'
  | 'UPHOLSTERY' | 'PACKAGING' | 'CONSUMABLE' | 'GLASS_STONE'

/** What the Indonesian import regime demands before this item may land. */
export type LartasType = 'NONE' | 'DIPK' | 'IP_B2' | 'SNI' | 'DIPK_AND_SNI'

export type ValuationMethod = 'MOVING_AVERAGE' | 'FIFO' | 'STANDARD'

export interface Item {
  id: ID
  code: string
  name: string
  type: ItemType
  uom: string
  /** timber species, where it matters — traceability runs back to this */
  species?: string
  /** the moisture band this item must be inside before it may be issued */
  targetMoistureMin?: number
  targetMoistureMax?: number
  imported: boolean
  hsCode: string
  /** most-favoured-nation duty rate, % of customs value */
  dutyRateMfn: number
  /** preferential rate under ATIGA / IJEPA / ACFTA when a valid COO is presented */
  dutyRatePreferential?: number
  preferentialScheme?: string
  lartas: LartasType
  primarySupplierId?: ID
  /** days the supplier needs from PO to goods ready */
  supplierLeadDays: number
  /** days on the water, port to port */
  transitDays: number
  /** days from discharge to available-to-issue, before the lane multiplier */
  inlandDays: number
  safetyStock: number
  reorderPoint: number
  minOrderQuantity: number
  standardCost: number
  currency: Currency
  valuation: ValuationMethod
  active: boolean
  note?: string
}

export type SupplierKind = 'LOCAL' | 'OVERSEAS'

export interface Supplier {
  id: ID
  code: string
  name: string
  kind: SupplierKind
  country: string
  city: string
  currency: Currency
  incoterm: Incoterm
  paymentInstrument: PaymentInstrument
  paymentTermDays: number
  leadDays: number
  contact: string
  email: string
  /** how their consignments have historically been channelled, by count */
  laneHistory: { green: number; yellow: number; red: number }
  /** average days from PIB submission to SPPB, by their own record */
  avgClearanceDays: number
  onTimePercent: number
  qualityPercent: number
  documentAccuracyPercent: number
  active: boolean
  note?: string
}

export type WarehouseKind = 'RAW_MATERIAL' | 'KILN_YARD' | 'WIP' | 'FINISHED_GOODS' | 'BONDED' | 'QUARANTINE'

export interface Warehouse {
  id: ID
  code: string
  name: string
  kind: WarehouseKind
  site: string
}

export type LotStatus = 'QUARANTINE' | 'AVAILABLE' | 'BLOCKED_KILN' | 'BLOCKED_QC' | 'CONSUMED' | 'RETURNED'

export interface Lot {
  id: ID
  code: string
  itemId: ID
  warehouseId: ID
  quantity: number
  /** what has been reserved against a released work order */
  reserved: number
  status: LotStatus
  receivedAt: ISODate
  /** unit cost carried by this lot — provisional until the shipment is costed */
  unitCost: number
  costIsProvisional: boolean
  /** where it came from */
  supplierId?: ID
  shipmentId?: ID
  originCountry?: string
  species?: string
  kilnBatchId?: ID
  moisturePercent?: number
  expiryDate?: ISODate
  note?: string
}

export type MovementKind = 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT' | 'SCRAP' | 'PRODUCTION_OUTPUT' | 'RETURN'

export interface StockMovement {
  id: ID
  at: ISODate
  kind: MovementKind
  itemId?: ID
  productId?: ID
  lotId?: ID
  warehouseId: ID
  quantity: number
  unitCost: number
  reference: string
  workOrderId?: ID
  shipmentId?: ID
  actor: string
  note?: string
}

/* ==================================================================
   4 · Purchasing and import
   ================================================================== */

export type PurchaseOrderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'RELEASED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CLOSED' | 'CANCELLED'

export interface PurchaseOrderLine {
  id: ID
  itemId: ID
  quantity: number
  receivedQuantity: number
  unitPrice: number
  uom: string
  /** what the plan needs it by */
  requiredDate: ISODate
  /** what the supplier committed to */
  promisedDate?: ISODate
  /** the MRP shortage that raised this line, when it was raised by a run */
  mrpDemandRef?: string
}

export interface PurchaseOrder {
  id: ID
  code: string
  supplierId: ID
  status: PurchaseOrderStatus
  kind: SupplierKind
  orderDate: ISODate
  currency: Currency
  /** rate at the moment the order was placed — one half of the FX variance */
  fxRateAtOrder: number
  incoterm: Incoterm
  paymentInstrument: PaymentInstrument
  lines: PurchaseOrderLine[]
  shipmentId?: ID
  requestedBy: string
  approvedBy?: string
  approvedAt?: ISODate
  note?: string
}

/** The eleven states an import consignment passes through. */
export type ShipmentStatus =
  | 'PLANNED' | 'PERMIT_PENDING' | 'ORDERED' | 'IN_PRODUCTION' | 'BOOKED' | 'ON_WATER'
  | 'ARRIVED' | 'PIB_SUBMITTED' | 'LANE_ASSIGNED' | 'CLEARED' | 'RECEIVED' | 'CANCELLED'

export type CustomsLane = 'PENDING' | 'GREEN' | 'YELLOW' | 'RED'

export type ImportCostCode =
  | 'GOODS' | 'FREIGHT' | 'INSURANCE' | 'DUTY' | 'PPN' | 'PPH22'
  | 'CLEARANCE_FEE' | 'THC' | 'INLAND_TRUCKING' | 'STORAGE' | 'DEMURRAGE' | 'DETENTION'
  | 'SURVEY' | 'PERMIT_FEE' | 'BANK_CHARGE' | 'OTHER'

/** How a cost is spread over the lines of a shipment. */
export type AllocationBasis = 'CUSTOMS_VALUE' | 'GROSS_WEIGHT' | 'VOLUME' | 'QUANTITY' | 'DIRECT'

export interface ImportCost {
  id: ID
  code: ImportCostCode
  label: string
  amount: number
  currency: Currency
  fxRate: number
  basis: AllocationBasis
  /** creditable taxes are not inventory cost — PPN and PPh 22 sit outside landed cost */
  creditable: boolean
  /** true once the vendor's own invoice has landed and the number stopped moving */
  actual: boolean
  vendor?: string
  note?: string
}

export interface ShipmentLine {
  id: ID
  itemId: ID
  purchaseOrderId: ID
  quantity: number
  uom: string
  unitPriceFob: number
  grossWeightKg: number
  volumeCbm: number
  hsCode: string
  /** duty actually applied — preferential only if the COO is on file */
  dutyRateApplied: number
  /** landed unit cost once the shipment is finalised */
  landedUnitCost?: number
  receivedQuantity: number
  lotId?: ID
  note?: string
}

export type PermitKind = 'DIPK' | 'IP_B2' | 'LS_SURVEY' | 'SNI_CERT' | 'API_P' | 'NIB' | 'COO'

export interface Permit {
  id: ID
  kind: PermitKind
  number: string
  /** who issued it — SILK, Ditjen Daglu, a surveyor, the exporting chamber */
  authority: string
  issuedAt: ISODate
  expiresAt?: ISODate
  /** the HS codes and species this permit actually covers */
  coversHsCodes: string[]
  coversSpecies?: string[]
  shipmentId?: ID
  fileRef: string
  note?: string
}

export type ImportDocType =
  | 'COMMERCIAL_INVOICE' | 'PACKING_LIST' | 'BILL_OF_LADING' | 'COO' | 'INSURANCE_CERT'
  | 'PERMIT' | 'SURVEY_REPORT' | 'MSDS' | 'FUMIGATION_CERT' | 'PIB' | 'SPPB' | 'PAYMENT_PROOF'

export type ImportDocStatus = 'REQUIRED' | 'RECEIVED' | 'VERIFIED' | 'REJECTED' | 'NOT_APPLICABLE'

export interface ImportDocument {
  id: ID
  shipmentId: ID
  type: ImportDocType
  reference: string
  status: ImportDocStatus
  mandatory: boolean
  receivedAt?: ISODate
  note?: string
}

export interface ImportShipment {
  id: ID
  code: string
  supplierId: ID
  status: ShipmentStatus
  incoterm: Incoterm
  currency: Currency
  /** the rate the invoice will actually be paid at */
  fxRateAtOrder: number
  /** the Minister of Finance rate in force on the PIB date — what duty is computed on */
  ndpbm?: number
  lines: ShipmentLine[]
  costs: ImportCost[]
  documents: ImportDocument[]
  permitIds: ID[]

  forwarder?: string
  vessel?: string
  voyage?: string
  containerNo?: string
  containerType?: '20GP' | '40GP' | '40HC' | 'LCL'
  portOfLoading?: string
  portOfDischarge: string
  billOfLadingNo?: string

  supplierReadyDate?: ISODate
  etd?: ISODate
  eta?: ISODate
  /** when it actually came off the ship — the free-time clock starts here */
  dischargedAt?: ISODate
  freeTimeDays: number
  demurragePerDay: number

  /** customs identity */
  pibNumber?: string
  pibDate?: ISODate
  customsOffice?: string
  lane: CustomsLane
  laneAssignedAt?: ISODate
  sppbNumber?: string
  sppbDate?: ISODate
  gateOutAt?: ISODate
  receivedAt?: ISODate

  /** true once every cost line is actual and the allocation has been posted */
  costFinalised: boolean
  costFinalisedAt?: ISODate
  ppjk?: string
  note?: string
}

/* ==================================================================
   5 · Production
   ================================================================== */

export type WorkOrderStatus = 'PLANNED' | 'FIRM' | 'RELEASED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CLOSED' | 'CANCELLED'

export type OperationStatus = 'PENDING' | 'READY' | 'RUNNING' | 'CURING' | 'DONE' | 'BLOCKED'

export interface WorkOrderOperation {
  id: ID
  operationNo: number
  name: string
  workCentreId: ID
  status: OperationStatus
  plannedStart: ISODate
  plannedEnd: ISODate
  actualStart?: ISODate
  actualEnd?: ISODate
  plannedHours: number
  actualHours?: number
  quantityDone: number
  quantityScrapped: number
  operator?: string
  subcontracted: boolean
  blockReason?: string
}

export interface MaterialIssue {
  id: ID
  itemId: ID
  lotId?: ID
  operationNo: number
  /** what the BOM said, grossed up for yield and scrap */
  standardQuantity: number
  issuedQuantity: number
  uom: string
  unitCost: number
  issuedAt?: ISODate
  /** why this line cannot be issued yet, in a sentence a planner can act on */
  shortageNote?: string
}

export interface WorkOrder {
  id: ID
  code: string
  productId: ID
  bomId: ID
  routingId: ID
  status: WorkOrderStatus
  quantity: number
  quantityDone: number
  quantityScrapped: number
  salesOrderId?: ID
  salesOrderLineId?: ID
  /** a rework order points back at the order that failed */
  reworkOfId?: ID
  plannedStart: ISODate
  plannedEnd: ISODate
  actualStart?: ISODate
  actualEnd?: ISODate
  dueDate: ISODate
  priority: OrderPriority
  operations: WorkOrderOperation[]
  materials: MaterialIssue[]
  /** cost roll-up, filled as the order runs */
  standardMaterialCost: number
  standardLabourCost: number
  standardOverheadCost: number
  actualMaterialCost: number
  actualLabourCost: number
  actualOverheadCost: number
  actualSubcontractCost: number
  releasedBy?: string
  note?: string
}

export type KilnBatchStatus = 'LOADING' | 'DRYING' | 'CONDITIONING' | 'COMPLETED' | 'FAILED'

export interface KilnReading {
  id: ID
  at: ISODate
  moisturePercent: number
  dryBulbC: number
  wetBulbC: number
  takenBy: string
}

export interface KilnBatch {
  id: ID
  code: string
  chamber: string
  status: KilnBatchStatus
  species: string
  /** the drying schedule chosen for the species and thickness */
  schedule: string
  chargeVolumeM3: number
  thicknessMm: number
  startedAt: ISODate
  plannedEnd: ISODate
  actualEnd?: ISODate
  startMoisturePercent: number
  targetMin: number
  targetMax: number
  finalMoisturePercent?: number
  readings: KilnReading[]
  lotIds: ID[]
  operator: string
  /** set when a batch came out of band and went back in */
  redryOfId?: ID
  note?: string
}

export type QcPoint = 'INCOMING' | 'IN_PROCESS' | 'FINAL'
export type QcResult = 'PASS' | 'FAIL' | 'CONDITIONAL'
export type QcDisposition = 'ACCEPT' | 'REWORK' | 'DOWNGRADE' | 'SCRAP' | 'RETURN_TO_SUPPLIER' | 'PENDING'

export type DefectCode =
  /* incoming */
  | 'MOISTURE_OUT_OF_BAND' | 'DIMENSION_OUT_OF_TOLERANCE' | 'COLOUR_MISMATCH' | 'HARDWARE_FUNCTION'
  | 'WARP_TWIST' | 'INSECT_DAMAGE' | 'DELAMINATION'
  /* in process */
  | 'JOINT_GAP' | 'OUT_OF_SQUARE' | 'THICKNESS_AFTER_SANDING' | 'GLUE_SQUEEZE_OUT' | 'TEAR_OUT'
  /* finishing */
  | 'ORANGE_PEEL' | 'SAGGING_RUN' | 'DUST_NIB' | 'FISH_EYE' | 'COLOUR_DEVIATION' | 'SHEEN_UNEVEN'
  /* assembly & pack */
  | 'MISSING_HARDWARE' | 'SCRATCH_DENT' | 'PACKAGING_DAMAGE'

export interface QcDefect {
  id: ID
  code: DefectCode
  quantity: number
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL'
  note?: string
}

export interface QcRecord {
  id: ID
  code: string
  point: QcPoint
  at: ISODate
  inspector: string
  workOrderId?: ID
  operationNo?: number
  shipmentId?: ID
  itemId?: ID
  productId?: ID
  lotSize: number
  sampleSize: number
  passedQuantity: number
  failedQuantity: number
  result: QcResult
  disposition: QcDisposition
  defects: QcDefect[]
  reworkWorkOrderId?: ID
  /** money the disposition costs — rework hours, scrapped value, credit claimed */
  costImpact: number
  rootCause?: string
  note?: string
}

/* ==================================================================
   6 · Planning
   ================================================================== */

export interface MrpRun {
  id: ID
  code: string
  at: ISODate
  horizonDays: number
  runBy: string
  /** counts, so the run list reads without recomputing everything */
  shortageCount: number
  plannedPurchaseCount: number
  plannedProductionCount: number
  note?: string
}

/** One netting result for one item — the output a planner actually acts on. */
export interface MrpLine {
  itemId: ID
  itemCode: string
  itemName: string
  imported: boolean
  uom: string
  grossRequirement: number
  onHand: number
  reserved: number
  safetyStock: number
  scheduledReceipts: number
  netRequirement: number
  /** the earliest date the covering supply is available to issue */
  availableDate?: ISODate
  /** the date the plan needs it */
  requiredDate: ISODate
  /** negative means late */
  slackDays: number
  /** which supply is covering it, in a sentence */
  coverage: string
  supplyKind: 'ON_HAND' | 'LOCAL_PO' | 'IMPORT' | 'KILN' | 'NONE'
  shipmentId?: ID
  purchaseOrderId?: ID
  alternateItemId?: ID
  demandFrom: string[]
  suggestedOrderQuantity: number
  suggestedOrderDate?: ISODate
}

/* ==================================================================
   7 · Finance
   ================================================================== */

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COGS' | 'EXPENSE'
export type NormalBalance = 'DEBIT' | 'CREDIT'

export interface Account {
  id: ID
  code: string
  name: string
  type: AccountType
  normalBalance: NormalBalance
  parentCode?: string
  active: boolean
  description?: string
}

export interface JournalLine {
  id: ID
  accountCode: string
  description: string
  debit: number
  credit: number
  workOrderId?: ID
  shipmentId?: ID
  salesOrderId?: ID
}

export type JournalStatus = 'DRAFT' | 'POSTED' | 'VOID'
export type JournalSource =
  | 'MANUAL' | 'GOODS_RECEIPT' | 'MATERIAL_ISSUE' | 'PRODUCTION_OUTPUT' | 'LANDED_COST'
  | 'AR_INVOICE' | 'AP_BILL' | 'PAYMENT' | 'VARIANCE' | 'FX_REVALUATION' | 'SCRAP'

export interface JournalEntry {
  id: ID
  code: string
  date: ISODate
  memo: string
  source: JournalSource
  status: JournalStatus
  lines: JournalLine[]
  postedBy?: string
  postedAt?: ISODate
  reference?: string
}

export type InvoiceKind = 'AR' | 'AP'
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID'

export interface InvoiceLine {
  id: ID
  description: string
  quantity: number
  unitPrice: number
  amount: number
  taxable: boolean
}

export interface Invoice {
  id: ID
  code: string
  kind: InvoiceKind
  status: InvoiceStatus
  partyId: ID
  partyName: string
  issueDate: ISODate
  dueDate: ISODate
  currency: Currency
  fxRate: number
  lines: InvoiceLine[]
  subtotal: number
  vat: number
  total: number
  paidAmount: number
  salesOrderId?: ID
  shipmentId?: ID
  purchaseOrderId?: ID
  note?: string
}

/* ==================================================================
   8 · Company, settings, users
   ================================================================== */

export interface NumberingSeries {
  key: string
  label: string
  prefix: string
  padding: number
  withYear: boolean
  nextNumber: number
}

export interface KpiTargets {
  onTimeDeliveryPercent: number
  firstPassYieldPercent: number
  scrapRatePercent: number
  materialYieldPercent: number
  workCentreUtilisationPercent: number
  importLeadDays: number
  clearanceDaysGreen: number
  clearanceDaysYellow: number
  clearanceDaysRed: number
  grossMarginPercent: number
}

export interface CompanyLicence {
  id: ID
  kind: 'NIB' | 'API_P' | 'SVLK' | 'IP_B2' | 'ISPM15' | 'TAX_PKP' | 'AEO' | 'FSC_COC'
  number: string
  authority: string
  issuedAt: ISODate
  expiresAt?: ISODate
  note?: string
}

export interface CompanyProfile {
  legalName: string
  brandName: string
  taxId: string
  address: string
  city: string
  country: string
  phone: string
  email: string
  website: string
  licences: CompanyLicence[]
}

export interface AppSettings {
  baseCurrency: Currency
  fxRates: Record<string, number>
  /** the Minister of Finance rate used for duty — deliberately not the spot rate */
  ndpbmRates: Record<string, number>
  vatRate: number
  /** 2.5% with an API, 7.5% without */
  pph22Rate: number
  hasApi: boolean
  numbering: NumberingSeries[]
  kpiTargets: KpiTargets
  /** cost variance beyond this fraction raises an exception rather than waiting for month end */
  costVarianceTolerance: number
  /** days before a permit expires at which it starts shouting */
  permitWarningDays: number
  /** planning horizon for the MRP run */
  mrpHorizonDays: number
}

/* ---------- authentication ---------- */

export type UserRole = 'ADMIN' | 'DIRECTOR' | 'PPIC' | 'PURCHASING' | 'PRODUCTION' | 'QC' | 'WAREHOUSE' | 'SALES' | 'FINANCE' | 'VIEWER'
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

/* ---------- the exception engine's output ---------- */

export type ExceptionKind =
  | 'MATERIAL_SHORTAGE' | 'IMPORT_LATE' | 'PERMIT_EXPIRING' | 'PERMIT_MISSING'
  | 'DEMURRAGE_ACCRUING' | 'FREE_TIME_ENDING' | 'PIB_INCOMPLETE' | 'COO_MISSING'
  | 'KILN_OUT_OF_BAND' | 'CAPACITY_OVERLOAD' | 'QC_FAILURE' | 'COST_VARIANCE'
  | 'ORDER_AT_RISK' | 'CREDIT_LIMIT' | 'DEPOSIT_MISSING' | 'COST_NOT_FINALISED'
  | 'REORDER_POINT' | 'LICENCE_EXPIRING'

export type ExceptionSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface SystemException {
  id: string
  kind: ExceptionKind
  severity: ExceptionSeverity
  title: string
  /** what it means, in the words a supervisor would use */
  detail: string
  /** what to do about it */
  remedy: string
  /** what it costs if nobody does */
  moneyAtRisk?: number
  daysLate?: number
  link?: string
  entityLabel?: string
}
