/**
 * Kriyanusa Furniture — domain model.
 *
 * The company is an Indonesian furniture manufacturer that exports: it takes a
 * brief from an overseas buyer, argues over price and specification, makes a
 * sample, costs the order into a rupiah budget, buys timber and hardware from a
 * spread of small suppliers, receives that material in whatever order it
 * actually turns up, moves it through four workshops and six warehouses, and
 * finally stuffs a container that cannot legally leave without a V-Legal
 * document behind it.
 *
 * Every type here exists because one of those steps produces a record somebody
 * has to answer for later.
 */

export type ID = string
export type ISODate = string
export type Currency = 'IDR' | 'USD' | 'EUR' | 'AUD' | 'JPY' | 'GBP'

/* ==================================================================
   Shared vocabulary
   ================================================================== */

export type Uom =
  | 'PCS' | 'SET' | 'M3' | 'M2' | 'MTR' | 'KG' | 'LTR' | 'SHEET' | 'ROLL' | 'BOX' | 'HOUR'

export type Incoterm = 'EXW' | 'FOB' | 'FCA' | 'CFR' | 'CIF' | 'DAP' | 'DDP'

export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'

export interface Contact {
  id: ID
  name: string
  role: string
  email: string
  phone: string
  primary?: boolean
}

export interface Money {
  amount: number
  currency: Currency
}

/* ==================================================================
   The company, its people and its licences
   ================================================================== */

export type UserRole =
  | 'ADMIN' | 'SALES' | 'ESTIMATOR' | 'PURCHASING' | 'WAREHOUSE' | 'PRODUCTION' | 'FINANCE'
  | 'EXPORT' | 'VIEWER'

export type AccountStatus =
  | 'ACTIVE' | 'PENDING_VERIFICATION' | 'INVITED' | 'LOCKED' | 'SUSPENDED'

export interface UserAccount {
  id: ID
  email: string
  /** demo only — a real build never stores or compares a password client-side */
  password: string
  fullName: string
  jobTitle: string
  role: UserRole
  status: AccountStatus
  department?: string
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

export type LicenceKind =
  | 'BUSINESS_REGISTRATION' | 'TAX_REGISTRATION' | 'EXPORTER_ID' | 'SVLK' | 'FSC_COC'
  | 'ISPM15_FUMIGATION' | 'INDUSTRIAL_PERMIT' | 'ENVIRONMENTAL' | 'MEMBERSHIP'

export interface CompanyLicence {
  id: ID
  kind: LicenceKind
  reference: string
  issuer: string
  issuedAt: ISODate
  expiresAt: ISODate
  note?: string
}

export interface BankAccount {
  id: ID
  bankName: string
  accountName: string
  accountNo: string
  currency: Currency
  swift?: string
  primary?: boolean
}

export interface CompanyProfile {
  legalName: string
  tradingName: string
  taxId: string
  registrationNo: string
  exporterId: string
  foundedYear: number
  addressLine: string
  city: string
  province: string
  countryCode: string
  phone: string
  email: string
  website: string
  workshopCount: number
  headcount: number
  licences: CompanyLicence[]
  bankAccounts: BankAccount[]
}

/* ==================================================================
   Buyers — the overseas side of the order
   ================================================================== */

export type BuyerStatus = 'PROSPECT' | 'ACTIVE' | 'ON_HOLD' | 'DORMANT' | 'BLACKLISTED'
export type BuyerSegment =
  | 'RETAIL_CHAIN' | 'WHOLESALER' | 'IMPORTER' | 'INTERIOR_STUDIO' | 'HOSPITALITY' | 'ECOMMERCE'

export type PaymentTerm =
  | 'TT_30_70' | 'TT_50_50' | 'TT_100_ADVANCE' | 'LC_AT_SIGHT' | 'LC_60_DAYS'
  | 'DP_60_DAYS' | 'OPEN_ACCOUNT_45'

export interface Buyer {
  id: ID
  code: string
  legalName: string
  tradingName: string
  segment: BuyerSegment
  status: BuyerStatus
  countryCode: string
  countryName: string
  city: string
  addressLine: string
  destinationPort: string
  currency: Currency
  defaultIncoterm: Incoterm
  paymentTerm: PaymentTerm
  creditLimit: number
  /** what they already owe us, in their own currency */
  outstanding: number
  /** hard requirements they impose on every order */
  requiresFsc: boolean
  requiresEudrDds: boolean
  requiresLabTest: boolean
  qualityStandard: string
  customerSince: ISODate
  ownerId: ID
  ownerName: string
  contacts: Contact[]
  note?: string
}

/* ==================================================================
   Suppliers — sawmills, hardware shops and village workshops
   ================================================================== */

export type SupplierType =
  | 'SAWMILL' | 'PANEL' | 'HARDWARE' | 'FINISHING' | 'UPHOLSTERY' | 'PACKAGING'
  | 'SUBCON_WORKSHOP' | 'SERVICE' | 'LOGISTICS'

export type SupplierStatus = 'ACTIVE' | 'PROBATION' | 'ON_HOLD' | 'BLACKLISTED'

export interface Supplier {
  id: ID
  code: string
  name: string
  type: SupplierType
  status: SupplierStatus
  city: string
  province: string
  addressLine: string
  taxId: string
  currency: Currency
  paymentTermDays: number
  leadTimeDays: number
  /** 0–100, all three feed the scorecard */
  qualityScore: number
  onTimeScore: number
  priceScore: number
  /** timber legality — a break anywhere here breaks the V-Legal chain */
  svlkCertified: boolean
  svlkNumber?: string
  svlkExpiresAt?: ISODate
  fscCertified: boolean
  fscNumber?: string
  fscExpiresAt?: ISODate
  bankName?: string
  bankAccountNo?: string
  contacts: Contact[]
  since: ISODate
  note?: string
}

/* ==================================================================
   Item master — raw material through to finished goods
   ================================================================== */

export type ItemCategory =
  | 'TIMBER' | 'PANEL' | 'HARDWARE' | 'FINISHING' | 'UPHOLSTERY' | 'PACKAGING'
  | 'CONSUMABLE' | 'COMPONENT' | 'FINISHED_GOOD'

export type ItemStatus = 'ACTIVE' | 'RESTRICTED' | 'PHASING_OUT' | 'DISCONTINUED'

export type WoodSpecies =
  | 'TEAK' | 'MAHOGANY' | 'ACACIA' | 'MINDI' | 'PINE' | 'RUBBERWOOD' | 'SUAR' | 'NONE'

export interface Item {
  id: ID
  sku: string
  name: string
  category: ItemCategory
  status: ItemStatus
  uom: Uom
  species: WoodSpecies
  grade?: string
  /** m³ per unit — what turns an order into a container count */
  cbmPerUnit: number
  weightKg: number
  standardCost: number
  currency: Currency
  defaultSupplierId?: ID
  leadTimeDays: number
  minStock: number
  reorderPoint: number
  maxStock: number
  hsCode?: string
  /** timber items carry legality upstream; everything else does not */
  legalityControlled: boolean
  note?: string
}

/* ==================================================================
   Warehouses — six of them, and material that lives at a subcontractor
   ================================================================== */

export type WarehouseType =
  | 'RAW_MATERIAL' | 'KILN_DRY' | 'WORK_IN_PROGRESS' | 'FINISHED_GOODS' | 'SUBCON' | 'QUARANTINE'

export interface StorageBin {
  code: string
  zone: string
  description: string
  capacityM3: number
}

export interface Warehouse {
  id: ID
  code: string
  name: string
  type: WarehouseType
  city: string
  addressLine: string
  capacityM3: number
  managerName: string
  /** a subcon warehouse is somebody else's shed holding our material */
  supplierId?: ID
  bins: StorageBin[]
  active: boolean
  note?: string
}

/* ==================================================================
   The project — an inbound enquiry that becomes an export order
   ================================================================== */

export type ProjectStage =
  | 'INQUIRY' | 'NEGOTIATION' | 'SAMPLING' | 'QUOTED' | 'ORDER_CONFIRMED' | 'BUDGETING'
  | 'PROCUREMENT' | 'PRODUCTION' | 'QC_PACKING' | 'SHIPPED' | 'CLOSED'

export type ProjectStatus = 'OPEN' | 'WON' | 'LOST' | 'CANCELLED' | 'CLOSED'

export type LossReason =
  | 'PRICE' | 'LEAD_TIME' | 'CAPACITY' | 'SPECIFICATION' | 'CERTIFICATION' | 'NO_RESPONSE' | 'OTHER'

export type NegotiationSubject =
  | 'PRICE' | 'SPECIFICATION' | 'LEAD_TIME' | 'PAYMENT_TERMS' | 'PACKING' | 'QUANTITY' | 'CERTIFICATION'

export type NegotiationOutcome = 'OPEN' | 'ACCEPTED' | 'COUNTERED' | 'REJECTED' | 'WITHDRAWN'

export interface NegotiationRound {
  id: ID
  round: number
  at: ISODate
  from: 'BUYER' | 'US'
  subject: NegotiationSubject
  /** what the buyer asked for and what we answered, in the order currency */
  buyerValue?: number
  ourValue?: number
  summary: string
  outcome: NegotiationOutcome
  byName: string
  attachment?: string
}

export type DrawingStatus =
  | 'DRAFT' | 'SENT' | 'REVISION_REQUESTED' | 'APPROVED' | 'SUPERSEDED'

export interface Drawing {
  id: ID
  code: string
  title: string
  revision: string
  itemRef: string
  status: DrawingStatus
  sentAt?: ISODate
  respondedAt?: ISODate
  approvedAt?: ISODate
  fileName: string
  /** millimetres, as the buyer reads them */
  lengthMm: number
  widthMm: number
  heightMm: number
  note?: string
}

export type SampleStatus =
  | 'REQUESTED' | 'IN_MAKING' | 'SENT' | 'APPROVED' | 'REVISION_REQUESTED' | 'REJECTED'

export interface Sample {
  id: ID
  code: string
  itemRef: string
  status: SampleStatus
  requestedAt: ISODate
  /** what making and couriering it cost us — recovered only if the order lands */
  costIdr: number
  chargedToBuyer: boolean
  courier?: string
  awb?: string
  sentAt?: ISODate
  decidedAt?: ISODate
  round: number
  feedback?: string
}

export interface ProjectItem {
  id: ID
  lineNo: number
  itemRef: string
  name: string
  species: WoodSpecies
  finish: string
  qty: number
  uom: Uom
  lengthMm: number
  widthMm: number
  heightMm: number
  cbmPerUnit: number
  packingType: 'KNOCK_DOWN' | 'ASSEMBLED' | 'CARTON' | 'CRATE' | 'PALLET'
  targetUnitPrice: number
  agreedUnitPrice: number
  producedQty: number
  packedQty: number
  note?: string
}

export type ComplianceKey =
  | 'SVLK_VLEGAL' | 'EUDR_DDS' | 'FSC_COC' | 'ISPM15' | 'FUMIGATION' | 'COO_FORM'
  | 'LAB_TEST' | 'CARB_TSCA' | 'PEB'

export type ComplianceStatus = 'NOT_REQUIRED' | 'REQUIRED' | 'IN_PROGRESS' | 'SATISFIED' | 'FAILED'

export interface ComplianceItem {
  key: ComplianceKey
  status: ComplianceStatus
  reference?: string
  obtainedAt?: ISODate
  expiresAt?: ISODate
  note?: string
}

export interface Project {
  id: ID
  code: string
  name: string
  buyerId: ID
  buyerName: string
  buyerCountry: string
  stage: ProjectStage
  status: ProjectStatus
  priority: Priority
  currency: Currency
  incoterm: Incoterm
  paymentTerm: PaymentTerm
  destinationPort: string
  destinationCountry: string
  /** the enquiry landed here */
  inquiryAt: ISODate
  quotedAt?: ISODate
  poNumber?: string
  poAt?: ISODate
  targetShipAt: ISODate
  actualShipAt?: ISODate
  contractValue: number
  depositPct: number
  depositReceivedAt?: ISODate
  salesOwnerId: ID
  salesOwnerName: string
  productionOwnerName: string
  exchangeRate: number
  items: ProjectItem[]
  negotiations: NegotiationRound[]
  drawings: Drawing[]
  samples: Sample[]
  compliance: ComplianceItem[]
  lossReason?: LossReason
  lossNote?: string
  competitor?: string
  note?: string
  createdAt: ISODate
  updatedAt: ISODate
}

/* ==================================================================
   The budget — anggaran belanja, the number the order is judged against
   ================================================================== */

export type BudgetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REVISED' | 'REJECTED' | 'CLOSED'

export type CostCategory =
  | 'TIMBER' | 'PANEL' | 'HARDWARE' | 'FINISHING' | 'UPHOLSTERY' | 'PACKAGING'
  | 'LABOUR' | 'SUBCON' | 'OVERHEAD' | 'EXPORT_LOGISTICS' | 'CERTIFICATION' | 'CONTINGENCY'

export interface BudgetLine {
  id: ID
  category: CostCategory
  itemId?: ID
  description: string
  qty: number
  uom: Uom
  unitCost: number
  /** the estimator's own allowance for offcuts and rework, as a percentage */
  wastagePct: number
  supplierId?: ID
  note?: string
}

export interface Budget {
  id: ID
  code: string
  projectId: ID
  version: number
  status: BudgetStatus
  preparedById: ID
  preparedByName: string
  preparedAt: ISODate
  submittedAt?: ISODate
  approvedByName?: string
  approvedAt?: ISODate
  rejectedReason?: string
  /** what the estimator was aiming at before the lines were priced */
  targetMarginPct: number
  lines: BudgetLine[]
  note?: string
}

/* ==================================================================
   Procurement — request, order, and the goods actually turning up
   ================================================================== */

export type PurchaseRequestStatus =
  | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PARTIALLY_ORDERED' | 'ORDERED' | 'CANCELLED'

export interface PurchaseRequestLine {
  id: ID
  itemId: ID
  description: string
  qty: number
  uom: Uom
  estimatedUnitCost: number
  budgetLineId?: ID
  neededBy: ISODate
  orderedQty: number
}

export interface PurchaseRequest {
  id: ID
  code: string
  projectId?: ID
  warehouseId: ID
  status: PurchaseRequestStatus
  requestedById: ID
  requestedByName: string
  requestedAt: ISODate
  approvedByName?: string
  approvedAt?: ISODate
  rejectedReason?: string
  justification: string
  lines: PurchaseRequestLine[]
}

export type PurchaseOrderStatus =
  | 'DRAFT' | 'AWAITING_APPROVAL' | 'APPROVED' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED'
  | 'CLOSED' | 'CANCELLED'

/** Where the supplier is told to put the goods. */
export type DeliveryMode = 'TO_WAREHOUSE' | 'TO_SUBCON' | 'TO_SITE'

export interface PurchaseOrderLine {
  id: ID
  itemId: ID
  description: string
  qty: number
  uom: Uom
  unitPrice: number
  discountPct: number
  taxPct: number
  neededBy: ISODate
  budgetLineId?: ID
  /** filled in by goods receipts, never typed by hand */
  receivedQty: number
  rejectedQty: number
  note?: string
}

export interface PurchaseOrder {
  id: ID
  code: string
  supplierId: ID
  supplierName: string
  projectId?: ID
  status: PurchaseOrderStatus
  orderedAt: ISODate
  expectedAt: ISODate
  currency: Currency
  paymentTermDays: number
  deliveryMode: DeliveryMode
  warehouseId: ID
  /** the buyer explicitly allows the supplier to split the delivery */
  partialAllowed: boolean
  /** how much over the ordered quantity we will still take in, as a percentage */
  overReceiptTolerancePct: number
  raisedById: ID
  raisedByName: string
  approvedByName?: string
  approvedAt?: ISODate
  requiresSvlkDoc: boolean
  lines: PurchaseOrderLine[]
  note?: string
}

export type ReceiptMode =
  /** one delivery, the whole order */
  | 'FULL'
  /** one of several deliveries against the same order */
  | 'PARTIAL'
  /** never touched our gate — dropped straight at a workshop or the port */
  | 'DIRECT'

export type QcResult = 'PENDING' | 'PASSED' | 'PARTIAL' | 'FAILED'

export type RejectReason =
  | 'MOISTURE' | 'DIMENSION' | 'DEFECT' | 'WRONG_ITEM' | 'DAMAGED' | 'SHORT_SHIPPED'
  | 'NO_LEGALITY_DOC' | 'FINISH_QUALITY'

export interface GoodsReceiptLine {
  id: ID
  poLineId: ID
  itemId: ID
  description: string
  uom: Uom
  qtyDelivered: number
  qtyAccepted: number
  qtyRejected: number
  rejectReason?: RejectReason
  binCode?: string
  batchNo?: string
  /** the supplier's own legality document for this batch of timber */
  legalityDocNo?: string
  moisturePct?: number
  note?: string
}

export interface GoodsReceipt {
  id: ID
  code: string
  poId: ID
  poCode: string
  supplierId: ID
  supplierName: string
  projectId?: ID
  mode: ReceiptMode
  sequence: number
  receivedAt: ISODate
  /** the supplier's delivery note — surat jalan */
  deliveryNoteNo: string
  vehicleNo?: string
  driverName?: string
  warehouseId: ID
  /** a DIRECT receipt names where it actually went instead */
  deliveredToName?: string
  qcResult: QcResult
  qcByName: string
  receivedByName: string
  posted: boolean
  lines: GoodsReceiptLine[]
  note?: string
}

/* ==================================================================
   Inventory
   ================================================================== */

export type MovementType =
  | 'RECEIPT' | 'ISSUE_PRODUCTION' | 'RETURN_PRODUCTION' | 'TRANSFER_OUT' | 'TRANSFER_IN'
  | 'ADJUSTMENT' | 'SCRAP' | 'FG_PRODUCED' | 'SHIPMENT_OUT' | 'OPENING'

export interface StockMovement {
  id: ID
  at: ISODate
  type: MovementType
  itemId: ID
  warehouseId: ID
  binCode?: string
  /** signed: positive adds to the warehouse, negative takes away */
  qty: number
  uom: Uom
  unitCost: number
  batchNo?: string
  refType: string
  refCode: string
  projectId?: ID
  actorName: string
  note?: string
}

export type TransferStatus = 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED'

export interface TransferLine {
  id: ID
  itemId: ID
  qty: number
  uom: Uom
  receivedQty: number
}

export interface StockTransfer {
  id: ID
  code: string
  fromWarehouseId: ID
  toWarehouseId: ID
  status: TransferStatus
  issuedAt: ISODate
  expectedAt: ISODate
  receivedAt?: ISODate
  projectId?: ID
  reason: string
  issuedByName: string
  lines: TransferLine[]
}

export type ReservationStatus = 'RESERVED' | 'PICKED' | 'RELEASED' | 'CANCELLED'

/** Material set aside for one project so a later order cannot eat it. */
export interface StockReservation {
  id: ID
  projectId: ID
  itemId: ID
  warehouseId: ID
  qty: number
  status: ReservationStatus
  reservedAt: ISODate
  neededBy: ISODate
}

export type CountStatus = 'DRAFT' | 'COUNTING' | 'REVIEW' | 'POSTED' | 'CANCELLED'

export interface CountLine {
  id: ID
  itemId: ID
  systemQty: number
  countedQty: number
  note?: string
}

/** Stock opname — the count that tells you what the ledger got wrong. */
export interface StockCount {
  id: ID
  code: string
  warehouseId: ID
  status: CountStatus
  countedAt: ISODate
  countedByName: string
  postedAt?: ISODate
  lines: CountLine[]
  note?: string
}

/* ==================================================================
   Production
   ================================================================== */

export type WorkOrderStage =
  | 'QUEUED' | 'CUTTING' | 'ASSEMBLY' | 'SANDING' | 'FINISHING' | 'UPHOLSTERY' | 'PACKING' | 'DONE'

export type WorkOrderStatus = 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

export interface WorkOrder {
  id: ID
  code: string
  projectId: ID
  projectItemId: ID
  itemRef: string
  qty: number
  producedQty: number
  rejectQty: number
  stage: WorkOrderStage
  status: WorkOrderStatus
  /** internal workshop, or a village subcontractor working on borongan terms */
  subconSupplierId?: ID
  workshop: string
  startedAt?: ISODate
  plannedStartAt: ISODate
  dueAt: ISODate
  completedAt?: ISODate
  supervisorName: string
  holdReason?: string
}

/* ==================================================================
   Shipment — the container, and the paperwork it cannot sail without
   ================================================================== */

export type ContainerSize = 'LCL' | '20GP' | '40GP' | '40HC'

export type ShipmentStatus =
  | 'PLANNED' | 'STUFFING' | 'STUFFED' | 'DOCS_IN_PROGRESS' | 'CUSTOMS' | 'SAILED' | 'ARRIVED' | 'CLOSED'

export type ExportDocType =
  | 'COMMERCIAL_INVOICE' | 'PACKING_LIST' | 'VLEGAL' | 'PEB' | 'COO' | 'BILL_OF_LADING'
  | 'FUMIGATION_CERT' | 'ISPM15_CERT' | 'INSURANCE' | 'EUDR_DDS' | 'FSC_CERT'

export type ExportDocStatus = 'REQUIRED' | 'DRAFT' | 'SUBMITTED' | 'ISSUED' | 'REJECTED' | 'NOT_REQUIRED'

export interface ExportDocument {
  id: ID
  type: ExportDocType
  status: ExportDocStatus
  reference?: string
  issuedAt?: ISODate
  issuer?: string
  mandatory: boolean
  note?: string
}

export interface ShipmentContainer {
  id: ID
  size: ContainerSize
  containerNo?: string
  sealNo?: string
  loadedCbm: number
  loadedWeightKg: number
  packages: number
}

export interface Shipment {
  id: ID
  code: string
  projectId: ID
  buyerName: string
  status: ShipmentStatus
  forwarderName: string
  bookingNo?: string
  vesselName?: string
  voyageNo?: string
  polName: string
  podName: string
  stuffingAt?: ISODate
  etd: ISODate
  eta: ISODate
  atd?: ISODate
  incoterm: Incoterm
  invoiceValue: number
  currency: Currency
  containers: ShipmentContainer[]
  documents: ExportDocument[]
  note?: string
}

/* ==================================================================
   Finance
   ================================================================== */

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'

export interface Account {
  id: ID
  code: string
  name: string
  type: AccountType
  group: string
  active: boolean
  description?: string
}

export interface JournalLine {
  id: ID
  accountCode: string
  accountName: string
  debit: number
  credit: number
  memo?: string
  projectId?: ID
}

export type JournalStatus = 'DRAFT' | 'POSTED' | 'VOID'

export interface JournalEntry {
  id: ID
  code: string
  at: ISODate
  status: JournalStatus
  source: string
  refCode?: string
  memo: string
  projectId?: ID
  postedByName: string
  lines: JournalLine[]
}

export type BillStatus =
  | 'DRAFT' | 'AWAITING_APPROVAL' | 'APPROVED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'DISPUTED' | 'VOID'

/** Purchase order, goods receipt and supplier invoice have to agree. */
export type MatchStatus = 'MATCHED' | 'QTY_VARIANCE' | 'PRICE_VARIANCE' | 'NO_RECEIPT' | 'UNMATCHED'

export interface SupplierBill {
  id: ID
  code: string
  supplierInvoiceNo: string
  supplierId: ID
  supplierName: string
  poId?: ID
  receiptIds: ID[]
  projectId?: ID
  status: BillStatus
  issuedAt: ISODate
  dueAt: ISODate
  currency: Currency
  subtotal: number
  taxAmount: number
  paidAmount: number
  approvedByName?: string
  disputeReason?: string
  note?: string
}

export type SalesInvoiceKind = 'PROFORMA' | 'DEPOSIT' | 'FINAL' | 'CREDIT_NOTE'
export type SalesInvoiceStatus =
  | 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID'

export interface SalesInvoice {
  id: ID
  code: string
  kind: SalesInvoiceKind
  projectId: ID
  buyerId: ID
  buyerName: string
  status: SalesInvoiceStatus
  issuedAt: ISODate
  dueAt: ISODate
  currency: Currency
  amount: number
  paidAmount: number
  exchangeRate: number
  note?: string
}

export type PaymentDirection = 'OUT' | 'IN'
export type PaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'LETTER_OF_CREDIT' | 'CHEQUE' | 'PETTY_CASH'

export interface PaymentAllocation {
  id: ID
  /** a supplier bill for OUT, a sales invoice for IN */
  targetId: ID
  targetCode: string
  amount: number
}

export interface Payment {
  id: ID
  code: string
  direction: PaymentDirection
  method: PaymentMethod
  at: ISODate
  counterpartyId: ID
  counterpartyName: string
  currency: Currency
  amount: number
  exchangeRate: number
  bankAccountNo?: string
  reference: string
  projectId?: ID
  allocations: PaymentAllocation[]
  note?: string
}

/* ==================================================================
   Settings
   ================================================================== */

export interface AppSettings {
  baseCurrency: Currency
  fxRates: Record<string, number>
  /** the estimator's default target before an order is priced */
  targetMarginPct: number
  /** a purchase order above this needs a second signature */
  poApprovalThresholdIdr: number
  /** how far a supplier invoice may exceed the order before finance stops it */
  billVarianceTolerancePct: number
  defaultOverReceiptTolerancePct: number
  wastageDefaultPct: number
  certificateWarningDays: number
  slowMovingDays: number
  containerCbm: Record<ContainerSize, number>
  numbering: Record<string, string>
  fiscalYearStartMonth: number
}
