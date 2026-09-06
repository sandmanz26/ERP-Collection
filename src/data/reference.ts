/**
 * Reference data: the vocabulary the system speaks, the rules it enforces and
 * the small lookup tables that keep labels out of the components.
 */
import type {
  AccountStatus, BudgetStatus, BuyerSegment, ComplianceKey, ContainerSize, CostCategory, Currency,
  DeliveryMode, ExportDocType, Incoterm, ItemCategory, MovementType, PaymentTerm, ProjectStage,
  RejectReason, SupplierType, Uom, UserRole, WarehouseType, WoodSpecies, WorkOrderStage,
} from './types'

/* ---------- units and money ---------- */

export const UOMS: { value: Uom; label: string }[] = [
  { value: 'PCS', label: 'pcs' },
  { value: 'SET', label: 'set' },
  { value: 'M3', label: 'm³' },
  { value: 'M2', label: 'm²' },
  { value: 'MTR', label: 'm' },
  { value: 'KG', label: 'kg' },
  { value: 'LTR', label: 'litre' },
  { value: 'SHEET', label: 'sheet' },
  { value: 'ROLL', label: 'roll' },
  { value: 'BOX', label: 'box' },
  { value: 'HOUR', label: 'hour' },
]
export const uomLabel = (u: Uom) => UOMS.find((x) => x.value === u)?.label ?? u

export const CURRENCIES: Currency[] = ['IDR', 'USD', 'EUR', 'AUD', 'JPY', 'GBP']

export const INCOTERMS: { value: Incoterm; label: string; hint: string }[] = [
  { value: 'EXW', label: 'EXW', hint: 'Buyer collects from our yard. We carry nothing past the gate.' },
  { value: 'FCA', label: 'FCA', hint: 'We hand over to the buyer’s carrier at a named place.' },
  { value: 'FOB', label: 'FOB', hint: 'Ours until the goods are on board at Semarang or Surabaya.' },
  { value: 'CFR', label: 'CFR', hint: 'We pay the ocean freight; insurance is the buyer’s.' },
  { value: 'CIF', label: 'CIF', hint: 'Freight and insurance to the destination port are ours.' },
  { value: 'DAP', label: 'DAP', hint: 'Delivered to the buyer’s address, duty unpaid.' },
  { value: 'DDP', label: 'DDP', hint: 'Delivered duty paid — we clear the import too.' },
]
export const incotermHint = (i: Incoterm) => INCOTERMS.find((x) => x.value === i)?.hint ?? ''

export const PAYMENT_TERMS: { value: PaymentTerm; label: string; depositPct: number; netDays: number }[] = [
  { value: 'TT_30_70', label: '30% deposit, 70% against B/L copy', depositPct: 30, netDays: 7 },
  { value: 'TT_50_50', label: '50% deposit, 50% before shipment', depositPct: 50, netDays: 0 },
  { value: 'TT_100_ADVANCE', label: '100% in advance', depositPct: 100, netDays: 0 },
  { value: 'LC_AT_SIGHT', label: 'Irrevocable L/C at sight', depositPct: 0, netDays: 14 },
  { value: 'LC_60_DAYS', label: 'L/C 60 days from B/L date', depositPct: 0, netDays: 60 },
  { value: 'DP_60_DAYS', label: 'Documents against payment, 60 days', depositPct: 0, netDays: 60 },
  { value: 'OPEN_ACCOUNT_45', label: 'Open account, 45 days', depositPct: 0, netDays: 45 },
]
export const paymentTerm = (t: PaymentTerm) => PAYMENT_TERMS.find((x) => x.value === t)
export const paymentTermLabel = (t: PaymentTerm) => paymentTerm(t)?.label ?? t

/* ---------- the pipeline ---------- */

export interface StageSpec {
  key: ProjectStage
  label: string
  /** what an operator is actually doing at this stage */
  hint: string
  group: 'COMMERCIAL' | 'PREPARATION' | 'EXECUTION' | 'CLOSING'
}

export const PROJECT_STAGES: StageSpec[] = [
  { key: 'INQUIRY', label: 'Inquiry', hint: 'A brief has arrived. Read it, log the buyer and decide whether we can make it.', group: 'COMMERCIAL' },
  { key: 'NEGOTIATION', label: 'Negotiation', hint: 'Price, specification, lead time and packing move back and forth until both sides stop.', group: 'COMMERCIAL' },
  { key: 'SAMPLING', label: 'Sampling', hint: 'A drawing goes out, a sample is made, and the buyer signs off the finish.', group: 'COMMERCIAL' },
  { key: 'QUOTED', label: 'Quoted', hint: 'A priced offer is with the buyer and the clock is running on its validity.', group: 'COMMERCIAL' },
  { key: 'ORDER_CONFIRMED', label: 'Order confirmed', hint: 'The purchase order is in and the deposit is being chased.', group: 'PREPARATION' },
  { key: 'BUDGETING', label: 'Budgeting', hint: 'The estimator builds the anggaran belanja and management approves it.', group: 'PREPARATION' },
  { key: 'PROCUREMENT', label: 'Procurement', hint: 'Requests become orders, and material starts arriving in pieces.', group: 'PREPARATION' },
  { key: 'PRODUCTION', label: 'Production', hint: 'Work orders run through cutting, assembly, finishing and upholstery.', group: 'EXECUTION' },
  { key: 'QC_PACKING', label: 'QC & packing', hint: 'Final inspection, packing, and the container loading plan.', group: 'EXECUTION' },
  { key: 'SHIPPED', label: 'Shipped', hint: 'On board, with the export set issued and the balance invoiced.', group: 'CLOSING' },
  { key: 'CLOSED', label: 'Closed', hint: 'Paid, costed and filed. The margin is now a fact rather than a plan.', group: 'CLOSING' },
]

export const stageSpec = (s: ProjectStage) => PROJECT_STAGES.find((x) => x.key === s)!
export const stageIndex = (s: ProjectStage) => PROJECT_STAGES.findIndex((x) => x.key === s)
export const stageLabel = (s: ProjectStage) => stageSpec(s).label

/** Stages where the order is still being won rather than made. */
export const isCommercialStage = (s: ProjectStage) =>
  ['INQUIRY', 'NEGOTIATION', 'SAMPLING', 'QUOTED'].includes(s)

/* ---------- categories ---------- */

export const ITEM_CATEGORIES: { value: ItemCategory; label: string; hint: string }[] = [
  { value: 'TIMBER', label: 'Timber', hint: 'Sawn and kiln-dried wood, sold by the cubic metre and controlled for legality.' },
  { value: 'PANEL', label: 'Panel', hint: 'Plywood, MDF and blockboard, sold by the sheet.' },
  { value: 'HARDWARE', label: 'Hardware', hint: 'Hinges, runners, knock-down fittings, screws.' },
  { value: 'FINISHING', label: 'Finishing', hint: 'Stains, sealers, lacquers, wax and thinner.' },
  { value: 'UPHOLSTERY', label: 'Upholstery', hint: 'Fabric, leather, foam, webbing.' },
  { value: 'PACKAGING', label: 'Packaging', hint: 'Cartons, corner guards, crating timber, stretch film.' },
  { value: 'CONSUMABLE', label: 'Consumable', hint: 'Abrasives, glue, blades — issued but not costed per piece.' },
  { value: 'COMPONENT', label: 'Component', hint: 'Half-made parts, usually back from a subcontractor.' },
  { value: 'FINISHED_GOOD', label: 'Finished good', hint: 'A packed piece waiting on a container.' },
]
export const itemCategoryLabel = (c: ItemCategory) => ITEM_CATEGORIES.find((x) => x.value === c)?.label ?? c

export const SPECIES: { value: WoodSpecies; label: string; note: string }[] = [
  { value: 'TEAK', label: 'Teak (jati)', note: 'Perhutani-graded, the premium line and the one buyers audit hardest.' },
  { value: 'MAHOGANY', label: 'Mahogany (mahoni)', note: 'Community plantation stock, good for painted and stained work.' },
  { value: 'ACACIA', label: 'Acacia', note: 'Fast-grown, dense, common in garden ranges.' },
  { value: 'MINDI', label: 'Mindi', note: 'Light and stable, mostly for painted carcases.' },
  { value: 'PINE', label: 'Pine', note: 'Imported, used for crating and low-cost ranges.' },
  { value: 'RUBBERWOOD', label: 'Rubberwood', note: 'Plantation offcut stock, finger-jointed panels.' },
  { value: 'SUAR', label: 'Suar (trembesi)', note: 'Wide slabs, live-edge tables, heavy and slow to dry.' },
  { value: 'NONE', label: '—', note: 'Not a timber item.' },
]
export const speciesLabel = (s: WoodSpecies) => SPECIES.find((x) => x.value === s)?.label ?? s

export const COST_CATEGORIES: { value: CostCategory; label: string; hint: string }[] = [
  { value: 'TIMBER', label: 'Timber', hint: 'Sawn stock, kiln drying and the wastage allowance on both.' },
  { value: 'PANEL', label: 'Panel', hint: 'Plywood and MDF for backs, bases and drawer bottoms.' },
  { value: 'HARDWARE', label: 'Hardware', hint: 'Fittings, fixings and knock-down connectors.' },
  { value: 'FINISHING', label: 'Finishing', hint: 'Stain, sealer and topcoat, priced per square metre of surface.' },
  { value: 'UPHOLSTERY', label: 'Upholstery', hint: 'Fabric, foam and the trade that applies them.' },
  { value: 'PACKAGING', label: 'Packaging', hint: 'Cartons, crates and everything that keeps the finish intact to Rotterdam.' },
  { value: 'LABOUR', label: 'Labour', hint: 'Our own benches, by the hour.' },
  { value: 'SUBCON', label: 'Subcontract', hint: 'Village workshops paid borongan — a fixed price for a finished quantity.' },
  { value: 'OVERHEAD', label: 'Overhead', hint: 'Power, kiln fuel, factory rent and supervision, absorbed per m³.' },
  { value: 'EXPORT_LOGISTICS', label: 'Export & logistics', hint: 'Trucking, stuffing, forwarding and terminal charges to the ship’s rail.' },
  { value: 'CERTIFICATION', label: 'Certification', hint: 'V-Legal, fumigation, certificate of origin and any lab test the buyer demands.' },
  { value: 'CONTINGENCY', label: 'Contingency', hint: 'The estimator’s own reserve against rework and price movement.' },
]
export const costCategoryLabel = (c: CostCategory) => COST_CATEGORIES.find((x) => x.value === c)?.label ?? c

/** Cost categories that buy physical stock, so a budget line can become a purchase order. */
export const PURCHASABLE_CATEGORIES: CostCategory[] = [
  'TIMBER', 'PANEL', 'HARDWARE', 'FINISHING', 'UPHOLSTERY', 'PACKAGING',
]

export const SUPPLIER_TYPES: { value: SupplierType; label: string; hint: string }[] = [
  { value: 'SAWMILL', label: 'Sawmill', hint: 'Sawn timber and kiln drying. Legality starts here.' },
  { value: 'PANEL', label: 'Panel mill', hint: 'Plywood, MDF, blockboard.' },
  { value: 'HARDWARE', label: 'Hardware', hint: 'Fittings and fixings, mostly imported and held in Surabaya.' },
  { value: 'FINISHING', label: 'Finishing materials', hint: 'Stains, sealers and topcoats.' },
  { value: 'UPHOLSTERY', label: 'Upholstery', hint: 'Fabric, leather and foam.' },
  { value: 'PACKAGING', label: 'Packaging', hint: 'Carton, crate timber and protective material.' },
  { value: 'SUBCON_WORKSHOP', label: 'Subcontract workshop', hint: 'Village benches taking work on borongan terms.' },
  { value: 'SERVICE', label: 'Service', hint: 'Fumigation, laboratory testing, surveying.' },
  { value: 'LOGISTICS', label: 'Logistics', hint: 'Trucking and freight forwarding.' },
]
export const supplierTypeLabel = (t: SupplierType) => SUPPLIER_TYPES.find((x) => x.value === t)?.label ?? t

export const WAREHOUSE_TYPES: { value: WarehouseType; label: string; hint: string }[] = [
  { value: 'RAW_MATERIAL', label: 'Raw material', hint: 'Sawn timber, panel and hardware as delivered.' },
  { value: 'KILN_DRY', label: 'Kiln & dry store', hint: 'Timber under drying, and dried stock waiting on a work order.' },
  { value: 'WORK_IN_PROGRESS', label: 'Work in progress', hint: 'Components between benches.' },
  { value: 'FINISHED_GOODS', label: 'Finished goods', hint: 'Packed pieces allocated to a container.' },
  { value: 'SUBCON', label: 'Subcontractor', hint: 'Our material, somebody else’s shed. Still our stock and our risk.' },
  { value: 'QUARANTINE', label: 'Quarantine', hint: 'Rejected on arrival, awaiting return or concession.' },
]
export const warehouseTypeLabel = (t: WarehouseType) => WAREHOUSE_TYPES.find((x) => x.value === t)?.label ?? t

export const BUYER_SEGMENTS: { value: BuyerSegment; label: string }[] = [
  { value: 'RETAIL_CHAIN', label: 'Retail chain' },
  { value: 'WHOLESALER', label: 'Wholesaler' },
  { value: 'IMPORTER', label: 'Importer / distributor' },
  { value: 'INTERIOR_STUDIO', label: 'Interior studio' },
  { value: 'HOSPITALITY', label: 'Hospitality project' },
  { value: 'ECOMMERCE', label: 'E-commerce' },
]
export const buyerSegmentLabel = (s: BuyerSegment) => BUYER_SEGMENTS.find((x) => x.value === s)?.label ?? s

export const DELIVERY_MODES: { value: DeliveryMode; label: string; hint: string }[] = [
  { value: 'TO_WAREHOUSE', label: 'To our warehouse', hint: 'Received at the gate, inspected, put away and costed into stock.' },
  { value: 'TO_SUBCON', label: 'To a subcontractor', hint: 'Delivered straight to the workshop doing the work. Still our stock — it sits in the subcon warehouse.' },
  { value: 'TO_SITE', label: 'Direct to site', hint: 'Never touches our yard: straight to the packing bay or the forwarder. Received on paper against the delivery note.' },
]
export const deliveryModeLabel = (m: DeliveryMode) => DELIVERY_MODES.find((x) => x.value === m)?.label ?? m

export const REJECT_REASONS: { value: RejectReason; label: string; hint: string }[] = [
  { value: 'MOISTURE', label: 'Moisture out of spec', hint: 'Above 12% and it will move after finishing.' },
  { value: 'DIMENSION', label: 'Dimension out of tolerance', hint: 'Under-thickness stock cannot be machined down to the drawing.' },
  { value: 'DEFECT', label: 'Knots, splits or sapwood', hint: 'Grade below what was ordered.' },
  { value: 'WRONG_ITEM', label: 'Wrong item delivered', hint: 'Not what the order asked for.' },
  { value: 'DAMAGED', label: 'Damaged in transit', hint: 'Handling damage on arrival.' },
  { value: 'SHORT_SHIPPED', label: 'Short shipped', hint: 'Less than the delivery note claims.' },
  { value: 'NO_LEGALITY_DOC', label: 'No legality document', hint: 'Timber without a supplier legality reference cannot enter the V-Legal chain.' },
  { value: 'FINISH_QUALITY', label: 'Finish quality', hint: 'Colour or sheen off the approved sample.' },
]
export const rejectReasonLabel = (r: RejectReason) => REJECT_REASONS.find((x) => x.value === r)?.label ?? r

export const MOVEMENT_TYPES: { value: MovementType; label: string; sign: 1 | -1 | 0 }[] = [
  { value: 'OPENING', label: 'Opening balance', sign: 1 },
  { value: 'RECEIPT', label: 'Goods receipt', sign: 1 },
  { value: 'ISSUE_PRODUCTION', label: 'Issue to production', sign: -1 },
  { value: 'RETURN_PRODUCTION', label: 'Return from production', sign: 1 },
  { value: 'TRANSFER_OUT', label: 'Transfer out', sign: -1 },
  { value: 'TRANSFER_IN', label: 'Transfer in', sign: 1 },
  { value: 'ADJUSTMENT', label: 'Count adjustment', sign: 0 },
  { value: 'SCRAP', label: 'Scrap', sign: -1 },
  { value: 'FG_PRODUCED', label: 'Finished goods produced', sign: 1 },
  { value: 'SHIPMENT_OUT', label: 'Shipped out', sign: -1 },
]
export const movementTypeLabel = (t: MovementType) => MOVEMENT_TYPES.find((x) => x.value === t)?.label ?? t

export const WORK_ORDER_STAGES: { value: WorkOrderStage; label: string; order: number }[] = [
  { value: 'QUEUED', label: 'Queued', order: 0 },
  { value: 'CUTTING', label: 'Cutting & machining', order: 1 },
  { value: 'ASSEMBLY', label: 'Assembly', order: 2 },
  { value: 'SANDING', label: 'Sanding', order: 3 },
  { value: 'FINISHING', label: 'Finishing', order: 4 },
  { value: 'UPHOLSTERY', label: 'Upholstery', order: 5 },
  { value: 'PACKING', label: 'Packing', order: 6 },
  { value: 'DONE', label: 'Done', order: 7 },
]
export const workStageOrder = (s: WorkOrderStage) => WORK_ORDER_STAGES.find((x) => x.value === s)?.order ?? 0
export const workStageLabel = (s: WorkOrderStage) => WORK_ORDER_STAGES.find((x) => x.value === s)?.label ?? s

export const BUDGET_STATUSES: BudgetStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REVISED', 'REJECTED', 'CLOSED']

/* ---------- compliance ----------
   Furniture made of wood cannot leave Indonesia on goodwill. The rules below
   are the ones that actually stop a container, and each is switched on by a
   fact about the order rather than by a checkbox somebody remembered to tick. */

export interface ComplianceSpec {
  key: ComplianceKey
  label: string
  authority: string
  /** why it exists, in one line */
  hint: string
  /** the shipment cannot sail without it once it is required */
  blocking: boolean
  leadTimeDays: number
}

export const COMPLIANCE_SPECS: ComplianceSpec[] = [
  {
    key: 'SVLK_VLEGAL',
    label: 'V-Legal document (SVLK)',
    authority: 'LVLK — accredited legality verification body',
    hint: 'Indonesia’s timber legality assurance system. Every export consignment of timber product carries a V-Legal document, and it can only be issued if the chain from forest to factory holds.',
    blocking: true,
    leadTimeDays: 5,
  },
  {
    key: 'EUDR_DDS',
    label: 'EUDR due diligence statement',
    authority: 'EU TRACES — filed by the importer, evidenced by us',
    hint: 'For the EU market: plot geolocation, supplier declarations and a risk assessment proving the timber is deforestation-free. Large and medium operators are inside the regime from 30 December 2026.',
    blocking: true,
    leadTimeDays: 14,
  },
  {
    key: 'FSC_COC',
    label: 'FSC chain of custody',
    authority: 'FSC-accredited certification body',
    hint: 'Only where the buyer sells the range as certified. The claim has to be carried on the invoice and every input has to be FSC too.',
    blocking: true,
    leadTimeDays: 3,
  },
  {
    key: 'ISPM15',
    label: 'ISPM-15 treated packaging',
    authority: 'Registered heat-treatment provider',
    hint: 'Any solid wood packing — crates, pallets, dunnage — must be heat treated and stamped, or the whole container is refused at the destination.',
    blocking: true,
    leadTimeDays: 2,
  },
  {
    key: 'FUMIGATION',
    label: 'Fumigation certificate',
    authority: 'Licensed fumigation contractor',
    hint: 'Australia and New Zealand demand it seasonally on top of ISPM-15; the certificate has to name the container.',
    blocking: true,
    leadTimeDays: 2,
  },
  {
    key: 'COO_FORM',
    label: 'Certificate of origin',
    authority: 'Ministry of Trade e-SKA',
    hint: 'Form D, Form AK, Form AI or the general form, depending on where the buyer is claiming preference.',
    blocking: false,
    leadTimeDays: 3,
  },
  {
    key: 'LAB_TEST',
    label: 'Laboratory test report',
    authority: 'Buyer-nominated laboratory',
    hint: 'Structural or finish testing a retail chain writes into its own supplier manual.',
    blocking: false,
    leadTimeDays: 10,
  },
  {
    key: 'CARB_TSCA',
    label: 'CARB / TSCA Title VI',
    authority: 'US EPA third-party certifier',
    hint: 'Formaldehyde limits on composite panel going to the United States. It binds the panel supplier, not us — which is exactly why it gets missed.',
    blocking: true,
    leadTimeDays: 7,
  },
  {
    key: 'PEB',
    label: 'Export declaration (PEB)',
    authority: 'Bea Cukai — CEISA',
    hint: 'The customs declaration. The V-Legal number goes on it, so it cannot be filed first.',
    blocking: true,
    leadTimeDays: 2,
  },
]

export const complianceSpec = (k: ComplianceKey) => COMPLIANCE_SPECS.find((s) => s.key === k)!
export const complianceLabel = (k: ComplianceKey) => complianceSpec(k).label

/** EU member states we actually ship to — EUDR turns on this list. */
export const EU_COUNTRIES = ['NL', 'DE', 'FR', 'BE', 'IT', 'ES', 'DK', 'SE', 'PL', 'AT', 'IE', 'FI', 'PT']

/**
 * What an order must satisfy, read off the order itself rather than typed in.
 * Wooden packing implies ISPM-15; an EU destination implies a due diligence
 * statement; Australia adds fumigation; the United States adds panel
 * formaldehyde certification whenever the piece contains panel.
 */
export function requiredCompliance(input: {
  destinationCountry: string
  buyerRequiresFsc: boolean
  buyerRequiresLabTest: boolean
  hasWoodPacking: boolean
  hasPanel: boolean
}): ComplianceKey[] {
  const out: ComplianceKey[] = ['SVLK_VLEGAL', 'PEB', 'COO_FORM']
  if (EU_COUNTRIES.includes(input.destinationCountry)) out.push('EUDR_DDS')
  if (input.buyerRequiresFsc) out.push('FSC_COC')
  if (input.hasWoodPacking) out.push('ISPM15')
  if (['AU', 'NZ'].includes(input.destinationCountry)) out.push('FUMIGATION')
  if (input.destinationCountry === 'US' && input.hasPanel) out.push('CARB_TSCA')
  if (input.buyerRequiresLabTest) out.push('LAB_TEST')
  return out
}

/* ---------- export documents ---------- */

export const EXPORT_DOC_SPECS: { type: ExportDocType; label: string; issuer: string; hint: string }[] = [
  { type: 'COMMERCIAL_INVOICE', label: 'Commercial invoice', issuer: 'Us', hint: 'The value the buyer pays and customs assesses. Must agree with the L/C to the comma.' },
  { type: 'PACKING_LIST', label: 'Packing list', issuer: 'Us', hint: 'Carton by carton, with net and gross weight and the measured volume.' },
  { type: 'VLEGAL', label: 'V-Legal document', issuer: 'LVLK', hint: 'The legality licence. Its number is quoted on the export declaration.' },
  { type: 'PEB', label: 'Export declaration (PEB)', issuer: 'Bea Cukai', hint: 'Filed through CEISA; the response lane decides whether the box is inspected.' },
  { type: 'COO', label: 'Certificate of origin', issuer: 'Ministry of Trade', hint: 'Preference form for the destination trade agreement.' },
  { type: 'BILL_OF_LADING', label: 'Bill of lading', issuer: 'Carrier / forwarder', hint: 'Title to the goods. Released against payment under an L/C.' },
  { type: 'FUMIGATION_CERT', label: 'Fumigation certificate', issuer: 'Fumigation contractor', hint: 'Names the container, the dose and the exposure period.' },
  { type: 'ISPM15_CERT', label: 'ISPM-15 treatment record', issuer: 'Treatment provider', hint: 'Evidence behind the stamp burned into the crating timber.' },
  { type: 'INSURANCE', label: 'Insurance certificate', issuer: 'Insurer', hint: 'Only under CIF and CIP, at 110% of invoice value.' },
  { type: 'EUDR_DDS', label: 'EUDR evidence pack', issuer: 'Us', hint: 'Geolocation, supplier declarations and the risk assessment the importer files on.' },
  { type: 'FSC_CERT', label: 'FSC transfer document', issuer: 'Us', hint: 'Carries the certified claim and percentage onto the invoice.' },
]
export const exportDocLabel = (t: ExportDocType) => EXPORT_DOC_SPECS.find((x) => x.type === t)?.label ?? t
export const exportDocSpec = (t: ExportDocType) => EXPORT_DOC_SPECS.find((x) => x.type === t)

/** The document set implied by an order's compliance requirements. */
export function requiredExportDocs(keys: ComplianceKey[], incoterm: Incoterm): { type: ExportDocType; mandatory: boolean }[] {
  const docs: { type: ExportDocType; mandatory: boolean }[] = [
    { type: 'COMMERCIAL_INVOICE', mandatory: true },
    { type: 'PACKING_LIST', mandatory: true },
    { type: 'VLEGAL', mandatory: true },
    { type: 'PEB', mandatory: true },
    { type: 'BILL_OF_LADING', mandatory: true },
    { type: 'COO', mandatory: keys.includes('COO_FORM') },
  ]
  if (keys.includes('ISPM15')) docs.push({ type: 'ISPM15_CERT', mandatory: true })
  if (keys.includes('FUMIGATION')) docs.push({ type: 'FUMIGATION_CERT', mandatory: true })
  if (keys.includes('EUDR_DDS')) docs.push({ type: 'EUDR_DDS', mandatory: true })
  if (keys.includes('FSC_COC')) docs.push({ type: 'FSC_CERT', mandatory: true })
  if (['CIF', 'CIP', 'DAP', 'DDP'].includes(incoterm)) docs.push({ type: 'INSURANCE', mandatory: true })
  return docs
}

/* ---------- containers ----------
   Furniture is a volume cargo: a 40HC fills up long before it gets heavy, so
   the number that matters is cubic metres, discounted for the fact that
   nothing stacks perfectly. */

export const CONTAINER_SPECS: {
  size: ContainerSize; label: string; internalCbm: number; usableCbm: number; payloadKg: number
}[] = [
  { size: 'LCL', label: 'LCL (groupage)', internalCbm: 0, usableCbm: 0, payloadKg: 0 },
  { size: '20GP', label: "20' general purpose", internalCbm: 33.2, usableCbm: 28, payloadKg: 28200 },
  { size: '40GP', label: "40' general purpose", internalCbm: 67.7, usableCbm: 58, payloadKg: 26700 },
  { size: '40HC', label: "40' high cube", internalCbm: 76.4, usableCbm: 66, payloadKg: 26500 },
]
export const containerSpec = (s: ContainerSize) => CONTAINER_SPECS.find((x) => x.size === s)!

/** Cheapest set of boxes for a volume — furniture almost always fills before it weighs. */
export function suggestContainers(cbm: number): { size: ContainerSize; count: number }[] {
  if (cbm <= 0) return []
  const hc = containerSpec('40HC').usableCbm
  const gp = containerSpec('20GP').usableCbm
  const full = Math.floor(cbm / hc)
  const rest = cbm - full * hc
  const out: { size: ContainerSize; count: number }[] = []
  if (full) out.push({ size: '40HC', count: full })
  if (rest > gp) out.push({ size: '40HC', count: 1 })
  else if (rest > 6) out.push({ size: '20GP', count: 1 })
  else if (rest > 0) out.push({ size: 'LCL', count: 1 })
  return out
}

/* ---------- ports ---------- */

export const ORIGIN_PORTS = [
  { code: 'IDSRG', name: 'Semarang (Tanjung Emas)' },
  { code: 'IDSUB', name: 'Surabaya (Tanjung Perak)' },
  { code: 'IDJKT', name: 'Jakarta (Tanjung Priok)' },
]

/* ---------- access control ---------- */

export const USER_ROLES: { value: UserRole; label: string; hint: string }[] = [
  { value: 'ADMIN', label: 'Administrator', hint: 'Everything, including company settings, numbering and user accounts.' },
  { value: 'SALES', label: 'Sales & export', hint: 'Buyers, inquiries, negotiation, samples and the order book.' },
  { value: 'ESTIMATOR', label: 'Estimator', hint: 'Costs an order into a budget and defends the margin.' },
  { value: 'PURCHASING', label: 'Purchasing', hint: 'Requests, purchase orders, suppliers and the arrival of goods.' },
  { value: 'WAREHOUSE', label: 'Warehouse', hint: 'Receipts, put-away, transfers, counts and issue to production.' },
  { value: 'PRODUCTION', label: 'Production', hint: 'Work orders, workshop progress and subcontractors.' },
  { value: 'FINANCE', label: 'Finance', hint: 'Bills, invoices, payments, the ledger and project profitability.' },
  { value: 'EXPORT', label: 'Export & compliance', hint: 'Shipments, the document set and the legality chain.' },
  { value: 'VIEWER', label: 'Viewer', hint: 'Read-only across the suite.' },
]
export const roleLabel = (r: UserRole) => USER_ROLES.find((x) => x.value === r)?.label ?? r

export const ACCOUNT_STATUSES: { value: AccountStatus; label: string; tone: string; hint: string }[] = [
  { value: 'ACTIVE', label: 'Active', tone: 'success', hint: 'Can sign in normally.' },
  { value: 'PENDING_VERIFICATION', label: 'Pending verification', tone: 'warning', hint: 'Registered but the email link has not been opened.' },
  { value: 'INVITED', label: 'Invited', tone: 'info', hint: 'Invitation sent; the account has never been used.' },
  { value: 'LOCKED', label: 'Locked', tone: 'danger', hint: 'Too many failed sign-in attempts. Unlocks on a timer or by an administrator.' },
  { value: 'SUSPENDED', label: 'Suspended', tone: 'danger', hint: 'Disabled by an administrator — sign-in is refused regardless of the password.' },
]

/** Sign-in hardening rules the demo actually enforces. */
export const AUTH_POLICY = {
  maxFailedAttempts: 5,
  lockMinutes: 15,
  minPasswordLength: 10,
  resetTokenMinutes: 30,
  allowedRegistrationDomains: ['kriyanusa.co.id', 'kriyanusa.com'],
}

/** Returns the reasons a password fails policy; empty means it passes. */
export function passwordProblems(pw: string): string[] {
  const out: string[] = []
  if (pw.length < AUTH_POLICY.minPasswordLength) out.push(`At least ${AUTH_POLICY.minPasswordLength} characters`)
  if (!/[A-Z]/.test(pw)) out.push('One uppercase letter')
  if (!/[a-z]/.test(pw)) out.push('One lowercase letter')
  if (!/[0-9]/.test(pw)) out.push('One digit')
  if (!/[^A-Za-z0-9]/.test(pw)) out.push('One symbol')
  if (/^(?:password|qwerty|123456|welcome|admin)/i.test(pw)) out.push('Not a common password')
  return out
}

/* ---------- defaults ---------- */

export const DEFAULT_SETTINGS = {
  baseCurrency: 'IDR' as Currency,
  fxRates: { IDR: 1, USD: 16450, EUR: 17850, AUD: 10800, JPY: 111, GBP: 20900 },
  targetMarginPct: 22,
  poApprovalThresholdIdr: 75_000_000,
  billVarianceTolerancePct: 3,
  defaultOverReceiptTolerancePct: 5,
  wastageDefaultPct: 12,
  certificateWarningDays: 60,
  slowMovingDays: 120,
  containerCbm: { LCL: 0, '20GP': 28, '40GP': 58, '40HC': 66 } as Record<ContainerSize, number>,
  numbering: {
    project: 'PRJ-{YY}-{####}',
    budget: 'RAB-{YY}-{####}',
    request: 'PR-{YY}-{####}',
    purchaseOrder: 'PO-{YY}-{####}',
    receipt: 'GRN-{YY}-{####}',
    transfer: 'TRF-{YY}-{####}',
    workOrder: 'WO-{YY}-{####}',
    shipment: 'SHP-{YY}-{####}',
    bill: 'BILL-{YY}-{####}',
    invoice: 'INV-{YY}-{####}',
    payment: 'PAY-{YY}-{####}',
  },
  fiscalYearStartMonth: 1,
}
