import type { AccountType, ChargeCategory, ContainerType, DocType, Incoterm, RateBasis, StageKey } from './types'

export const COUNTRIES = [
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', region: 'ASEAN', currency: 'IDR' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', region: 'ASEAN', currency: 'SGD' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', region: 'ASEAN', currency: 'MYR' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', region: 'ASEAN', currency: 'VND' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', region: 'ASEAN', currency: 'THB' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', region: 'ASEAN', currency: 'PHP' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'North Asia', currency: 'JPY' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', region: 'North Asia', currency: 'KRW' },
  { code: 'CN', name: 'China', flag: '🇨🇳', region: 'North Asia', currency: 'CNY' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', region: 'North Asia', currency: 'TWD' },
  { code: 'IN', name: 'India', flag: '🇮🇳', region: 'South Asia', currency: 'INR' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', region: 'Middle East', currency: 'AED' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', region: 'Middle East', currency: 'SAR' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', region: 'Europe', currency: 'EUR' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', region: 'Europe', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', region: 'Europe', currency: 'EUR' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', region: 'Europe', currency: 'EUR' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', region: 'Europe', currency: 'EUR' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe', currency: 'GBP' },
  { code: 'US', name: 'United States', flag: '🇺🇸', region: 'Americas', currency: 'USD' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'Americas', currency: 'CAD' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', region: 'Americas', currency: 'BRL' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'Oceania', currency: 'AUD' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', region: 'Oceania', currency: 'NZD' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'Africa', currency: 'ZAR' },
]

export const countryName = (code: string) => COUNTRIES.find((c) => c.code === code)?.name ?? code
export const countryFlag = (code: string) => COUNTRIES.find((c) => c.code === code)?.flag ?? '🏳️'

export const PORTS = [
  { code: 'IDTPP', name: 'Tanjung Priok', city: 'Jakarta', country: 'ID' },
  { code: 'IDSUB', name: 'Tanjung Perak', city: 'Surabaya', country: 'ID' },
  { code: 'IDBLW', name: 'Belawan', city: 'Medan', country: 'ID' },
  { code: 'IDSRG', name: 'Tanjung Emas', city: 'Semarang', country: 'ID' },
  { code: 'IDPNK', name: 'Panjang', city: 'Lampung', country: 'ID' },
  { code: 'IDMAK', name: 'Makassar', city: 'Makassar', country: 'ID' },
  { code: 'SGSIN', name: 'Singapore', city: 'Singapore', country: 'SG' },
  { code: 'MYPKG', name: 'Port Klang', city: 'Klang', country: 'MY' },
  { code: 'VNSGN', name: 'Cat Lai', city: 'Ho Chi Minh', country: 'VN' },
  { code: 'JPYOK', name: 'Yokohama', city: 'Yokohama', country: 'JP' },
  { code: 'JPUKB', name: 'Kobe', city: 'Kobe', country: 'JP' },
  { code: 'KRPUS', name: 'Busan', city: 'Busan', country: 'KR' },
  { code: 'CNSHA', name: 'Shanghai', city: 'Shanghai', country: 'CN' },
  { code: 'CNNGB', name: 'Ningbo', city: 'Ningbo', country: 'CN' },
  { code: 'TWKHH', name: 'Kaohsiung', city: 'Kaohsiung', country: 'TW' },
  { code: 'INNSA', name: 'Nhava Sheva', city: 'Mumbai', country: 'IN' },
  { code: 'AEJEA', name: 'Jebel Ali', city: 'Dubai', country: 'AE' },
  { code: 'NLRTM', name: 'Rotterdam', city: 'Rotterdam', country: 'NL' },
  { code: 'DEHAM', name: 'Hamburg', city: 'Hamburg', country: 'DE' },
  { code: 'BEANR', name: 'Antwerp', city: 'Antwerp', country: 'BE' },
  { code: 'ITGOA', name: 'Genoa', city: 'Genoa', country: 'IT' },
  { code: 'GBFXT', name: 'Felixstowe', city: 'Felixstowe', country: 'GB' },
  { code: 'USLAX', name: 'Los Angeles', city: 'Los Angeles', country: 'US' },
  { code: 'USNYC', name: 'New York', city: 'New York', country: 'US' },
  { code: 'USSAV', name: 'Savannah', city: 'Savannah', country: 'US' },
  { code: 'AUSYD', name: 'Sydney', city: 'Sydney', country: 'AU' },
  { code: 'AUMEL', name: 'Melbourne', city: 'Melbourne', country: 'AU' },
  { code: 'BRSSZ', name: 'Santos', city: 'Santos', country: 'BR' },
]

export const portLabel = (code: string) => {
  const p = PORTS.find((x) => x.code === code)
  return p ? `${p.name} (${p.code})` : code
}

export const CARRIERS = [
  { scac: 'MAEU', name: 'Maersk Line' },
  { scac: 'MSCU', name: 'MSC' },
  { scac: 'CMDU', name: 'CMA CGM' },
  { scac: 'HLCU', name: 'Hapag-Lloyd' },
  { scac: 'ONEY', name: 'Ocean Network Express' },
  { scac: 'EGLV', name: 'Evergreen Line' },
  { scac: 'COSU', name: 'COSCO Shipping' },
  { scac: 'PILU', name: 'Pacific International Lines' },
  { scac: 'SAMU', name: 'SITC Line' },
]

export const INCOTERMS: { code: Incoterm; label: string; transferPoint: string; sellerPaysFreight: boolean; sellerInsures: boolean }[] = [
  { code: 'EXW', label: 'Ex Works', transferPoint: "Seller's premises", sellerPaysFreight: false, sellerInsures: false },
  { code: 'FCA', label: 'Free Carrier', transferPoint: 'Named place / carrier', sellerPaysFreight: false, sellerInsures: false },
  { code: 'FAS', label: 'Free Alongside Ship', transferPoint: 'Alongside vessel at POL', sellerPaysFreight: false, sellerInsures: false },
  { code: 'FOB', label: 'Free On Board', transferPoint: 'On board at POL', sellerPaysFreight: false, sellerInsures: false },
  { code: 'CFR', label: 'Cost and Freight', transferPoint: 'On board at POL', sellerPaysFreight: true, sellerInsures: false },
  { code: 'CIF', label: 'Cost, Insurance and Freight', transferPoint: 'On board at POL', sellerPaysFreight: true, sellerInsures: true },
  { code: 'CPT', label: 'Carriage Paid To', transferPoint: 'First carrier', sellerPaysFreight: true, sellerInsures: false },
  { code: 'CIP', label: 'Carriage and Insurance Paid To', transferPoint: 'First carrier', sellerPaysFreight: true, sellerInsures: true },
  { code: 'DAP', label: 'Delivered At Place', transferPoint: 'Named destination', sellerPaysFreight: true, sellerInsures: false },
  { code: 'DPU', label: 'Delivered at Place Unloaded', transferPoint: 'Unloaded at destination', sellerPaysFreight: true, sellerInsures: false },
  { code: 'DDP', label: 'Delivered Duty Paid', transferPoint: 'Destination, duties paid', sellerPaysFreight: true, sellerInsures: true },
]

export const CHARGE_CODES: { code: string; name: string; category: ChargeCategory; basis: RateBasis; vat: boolean }[] = [
  { code: 'OFR', name: 'Ocean Freight', category: 'FREIGHT', basis: 'PER_CONTAINER', vat: false },
  { code: 'BAF', name: 'Bunker Adjustment Factor', category: 'SURCHARGE', basis: 'PER_CONTAINER', vat: false },
  { code: 'CAF', name: 'Currency Adjustment Factor', category: 'SURCHARGE', basis: 'PER_CONTAINER', vat: false },
  { code: 'LSS', name: 'Low Sulphur Surcharge', category: 'SURCHARGE', basis: 'PER_CONTAINER', vat: false },
  { code: 'PSS', name: 'Peak Season Surcharge', category: 'SURCHARGE', basis: 'PER_CONTAINER', vat: false },
  { code: 'THC-O', name: 'Terminal Handling — Origin', category: 'ORIGIN', basis: 'PER_CONTAINER', vat: true },
  { code: 'THC-D', name: 'Terminal Handling — Destination', category: 'DESTINATION', basis: 'PER_CONTAINER', vat: false },
  { code: 'DOC', name: 'Documentation Fee', category: 'DOCUMENTATION', basis: 'PER_BL', vat: true },
  { code: 'BL', name: 'Bill of Lading Fee', category: 'DOCUMENTATION', basis: 'PER_BL', vat: true },
  { code: 'SEAL', name: 'Container Seal', category: 'ORIGIN', basis: 'PER_CONTAINER', vat: true },
  { code: 'VGM', name: 'VGM Weighing & Submission', category: 'ORIGIN', basis: 'PER_CONTAINER', vat: true },
  { code: 'LOLO', name: 'Lift On / Lift Off', category: 'ORIGIN', basis: 'PER_CONTAINER', vat: true },
  { code: 'TRUCK', name: 'Inland Trucking', category: 'TRUCKING', basis: 'PER_CONTAINER', vat: true },
  { code: 'STUFF', name: 'Stuffing / Labour', category: 'ORIGIN', basis: 'PER_CONTAINER', vat: true },
  { code: 'CFS', name: 'CFS Handling (LCL)', category: 'ORIGIN', basis: 'PER_CBM', vat: true },
  { code: 'PEB', name: 'Export Declaration (PEB)', category: 'CUSTOMS', basis: 'PER_DOCUMENT', vat: true },
  { code: 'CLR', name: 'Customs Clearance Handling', category: 'CUSTOMS', basis: 'PER_SHIPMENT', vat: true },
  { code: 'COO', name: 'Certificate of Origin / SKA', category: 'CUSTOMS', basis: 'PER_DOCUMENT', vat: true },
  { code: 'FUMI', name: 'Fumigation', category: 'ORIGIN', basis: 'PER_CONTAINER', vat: true },
  { code: 'PHYTO', name: 'Phytosanitary Certificate', category: 'CUSTOMS', basis: 'PER_DOCUMENT', vat: true },
  { code: 'INS', name: 'Marine Cargo Insurance', category: 'INSURANCE', basis: 'PERCENT_OF_VALUE', vat: false },
  { code: 'DEM', name: 'Demurrage', category: 'PENALTY', basis: 'PER_CONTAINER', vat: false },
  { code: 'DET', name: 'Detention', category: 'PENALTY', basis: 'PER_CONTAINER', vat: false },
  { code: 'STOR', name: 'Storage / Warehousing', category: 'PENALTY', basis: 'PER_CBM', vat: true },
  { code: 'DO', name: 'Delivery Order Release', category: 'DESTINATION', basis: 'PER_BL', vat: false },
  { code: 'AMS', name: 'AMS / ENS Filing', category: 'DOCUMENTATION', basis: 'PER_BL', vat: false },
  { code: 'ADMIN', name: 'Agency & Admin Fee', category: 'OTHER', basis: 'PER_SHIPMENT', vat: true },
]

export const DOC_TYPES: { type: DocType; label: string; stage: StageKey; mandatoryDefault: boolean; hint: string }[] = [
  { type: 'BOOKING_CONFIRMATION', label: 'Booking Confirmation', stage: 'BOOKING', mandatoryDefault: true, hint: 'Carrier booking with vessel, voyage and cut-offs.' },
  { type: 'SHIPPING_INSTRUCTION', label: 'Shipping Instruction (SI)', stage: 'DOCUMENTATION', mandatoryDefault: true, hint: 'Must be filed before the SI cut-off.' },
  { type: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice', stage: 'DOCUMENTATION', mandatoryDefault: true, hint: 'Values must match PEB and BL.' },
  { type: 'PACKING_LIST', label: 'Packing List', stage: 'DOCUMENTATION', mandatoryDefault: true, hint: 'Marks, numbers and weights per package.' },
  { type: 'PEB', label: 'PEB — Export Declaration', stage: 'DOCUMENTATION', mandatoryDefault: true, hint: 'Filed via CEISA; required for all Indonesian exports.' },
  { type: 'NPE', label: 'NPE — Export Approval Note', stage: 'STUFFING', mandatoryDefault: true, hint: 'Issued by Customs; required for gate-in.' },
  { type: 'VGM_CERTIFICATE', label: 'VGM Certificate', stage: 'STUFFING', mandatoryDefault: true, hint: 'SOLAS requirement, before VGM cut-off.' },
  { type: 'DRAFT_BL', label: 'Draft Bill of Lading', stage: 'DOCUMENTATION', mandatoryDefault: true, hint: 'Shipper approval required before issuance.' },
  { type: 'HOUSE_BL', label: 'House Bill of Lading', stage: 'DEPARTURE', mandatoryDefault: true, hint: 'Issued by the forwarder to the shipper.' },
  { type: 'MASTER_BL', label: 'Master Bill of Lading', stage: 'DEPARTURE', mandatoryDefault: false, hint: 'Issued by the carrier to the forwarder.' },
  { type: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin / SKA', stage: 'DOCUMENTATION', mandatoryDefault: false, hint: 'Form D/E/AK/AI depending on the FTA used.' },
  { type: 'INSURANCE_CERTIFICATE', label: 'Marine Insurance Certificate', stage: 'DOCUMENTATION', mandatoryDefault: false, hint: 'Mandatory under CIF and CIP.' },
  { type: 'PHYTOSANITARY', label: 'Phytosanitary Certificate', stage: 'DOCUMENTATION', mandatoryDefault: false, hint: 'Plant-based commodities, issued by Karantina.' },
  { type: 'FUMIGATION', label: 'Fumigation Certificate', stage: 'STUFFING', mandatoryDefault: false, hint: 'Required for wooden packaging (ISPM-15).' },
  { type: 'MSDS', label: 'Material Safety Data Sheet', stage: 'CARGO_PLAN', mandatoryDefault: false, hint: 'Mandatory for dangerous goods.' },
  { type: 'EXPORT_PERMIT', label: 'Export Permit / Licence', stage: 'INQUIRY', mandatoryDefault: false, hint: 'Restricted commodities (LARTAS).' },
  { type: 'LETTER_OF_CREDIT', label: 'Letter of Credit', stage: 'INQUIRY', mandatoryDefault: false, hint: 'Documents must comply strictly with L/C terms.' },
  { type: 'CONSIGNMENT_AGREEMENT', label: 'Consignment Agreement', stage: 'INQUIRY', mandatoryDefault: false, hint: 'Defines title retention and settlement cycle.' },
  { type: 'ARRIVAL_NOTICE', label: 'Arrival Notice', stage: 'ARRIVAL', mandatoryDefault: false, hint: 'Sent to consignee before ETA.' },
  { type: 'DELIVERY_ORDER', label: 'Delivery Order', stage: 'ARRIVAL', mandatoryDefault: false, hint: 'Released after BL surrender / telex.' },
  { type: 'PROOF_OF_DELIVERY', label: 'Proof of Delivery', stage: 'SETTLEMENT', mandatoryDefault: false, hint: 'Signed POD closes the transport leg.' },
  { type: 'OTHER', label: 'Other Document', stage: 'DOCUMENTATION', mandatoryDefault: false, hint: '' },
]

export const docTypeLabel = (t: DocType) => DOC_TYPES.find((d) => d.type === t)?.label ?? t

/** Destination-specific compliance rules — drives the document completeness engine. */
export const COUNTRY_DOC_RULES: Record<string, { required: DocType[]; note: string }> = {
  AU: { required: ['FUMIGATION', 'PHYTOSANITARY'], note: 'AQIS requires treatment certificates for timber and plant products.' },
  US: { required: ['CERTIFICATE_OF_ORIGIN'], note: 'ISF 10+2 must be filed 24h before vessel loading.' },
  NL: { required: ['CERTIFICATE_OF_ORIGIN'], note: 'EU requires EORI number of the consignee on the entry summary.' },
  DE: { required: ['CERTIFICATE_OF_ORIGIN'], note: 'EU requires EORI number of the consignee on the entry summary.' },
  JP: { required: ['CERTIFICATE_OF_ORIGIN'], note: 'IJEPA Form JIEPA gives preferential duty for Indonesian origin.' },
  KR: { required: ['CERTIFICATE_OF_ORIGIN'], note: 'AK Form under the ASEAN–Korea FTA.' },
  CN: { required: ['CERTIFICATE_OF_ORIGIN'], note: 'Form E under ACFTA; consignee must match the invoice exactly.' },
  SG: { required: [], note: 'Form D under ATIGA where preferential treatment is claimed.' },
  AE: { required: ['CERTIFICATE_OF_ORIGIN'], note: 'Legalised COO by chamber of commerce is commonly requested.' },
}

export const STAGES: { key: StageKey; label: string; short: string; description: string }[] = [
  { key: 'INQUIRY', label: 'Inquiry & Quotation', short: 'Inquiry', description: 'Capture the requirement, price it from a package, get the client to accept.' },
  { key: 'BOOKING', label: 'Carrier Booking', short: 'Booking', description: 'Secure space with the carrier and lock the cut-off calendar.' },
  { key: 'CARGO_PLAN', label: 'Cargo & Container Plan', short: 'Cargo Plan', description: 'Allocate cargo into containers and validate volume and payload.' },
  { key: 'DOCUMENTATION', label: 'Documentation & Customs', short: 'Documents', description: 'File SI, invoice, packing list, PEB and origin certificates.' },
  { key: 'STUFFING', label: 'Stuffing & Gate-in', short: 'Stuffing', description: 'Stuff, seal, weigh (VGM) and gate the containers in before cut-off.' },
  { key: 'DEPARTURE', label: 'Departure & Transit', short: 'Departure', description: 'Confirm loading, issue the B/L and track the vessel.' },
  { key: 'ARRIVAL', label: 'Arrival & Delivery', short: 'Arrival', description: 'Arrival notice, B/L release, delivery order and proof of delivery.' },
  { key: 'SETTLEMENT', label: 'Billing & Settlement', short: 'Settlement', description: 'Invoice the client, settle vendor bills and close the job.' },
]

export const stageIndex = (key: StageKey) => STAGES.findIndex((s) => s.key === key)
export const stageLabel = (key: StageKey) => STAGES.find((s) => s.key === key)?.label ?? key

export const CONTAINER_TYPES: ContainerType[] = ['20GP', '40GP', '40HC', '45HC', '20RF', '40RH', '20OT', '40FR', 'LCL']

export const HS_CODES = [
  { code: '4407.29', description: 'Sawn tropical hardwood, thickness > 6 mm' },
  { code: '9403.60', description: 'Wooden furniture, other' },
  { code: '4001.22', description: 'Technically specified natural rubber (TSNR)' },
  { code: '1511.10', description: 'Crude palm oil' },
  { code: '0901.11', description: 'Coffee, not roasted, not decaffeinated' },
  { code: '1801.00', description: 'Cocoa beans, whole or broken' },
  { code: '6109.10', description: 'T-shirts of cotton, knitted' },
  { code: '6403.99', description: 'Footwear with outer soles of rubber' },
  { code: '8544.42', description: 'Electric conductors fitted with connectors' },
  { code: '4011.10', description: 'New pneumatic tyres, motor cars' },
  { code: '0306.17', description: 'Frozen shrimps and prawns' },
  { code: '2515.11', description: 'Marble and travertine, crude' },
]

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; group: 'BALANCE_SHEET' | 'INCOME_STATEMENT'; tone: string }> = {
  ASSET: { label: 'Assets', group: 'BALANCE_SHEET', tone: 'info' },
  LIABILITY: { label: 'Liabilities', group: 'BALANCE_SHEET', tone: 'warning' },
  EQUITY: { label: 'Equity', group: 'BALANCE_SHEET', tone: 'purple' },
  REVENUE: { label: 'Revenue', group: 'INCOME_STATEMENT', tone: 'success' },
  COGS: { label: 'Cost of Service', group: 'INCOME_STATEMENT', tone: 'danger' },
  EXPENSE: { label: 'Operating Expense', group: 'INCOME_STATEMENT', tone: 'danger' },
}

export const FX_RATES: Record<string, number> = { IDR: 1, USD: 16250, EUR: 17600, SGD: 12050, JPY: 108, CNY: 2240, AUD: 10650, KRW: 11.7 }

export const TEAM = ['Elena Marchetti', 'Marcus Bell', 'Sofia Reyes', 'David Chen', 'Priya Nair', 'Tomas Weber']

/* ==================================================================
   PHASE 2 reference data
   ================================================================== */
import type { LossReason, MilestoneCode, PartnerType, QuoteStatus } from './types'

export const QUOTE_STATUS_FLOW: { status: QuoteStatus; label: string; open: boolean }[] = [
  { status: 'DRAFT', label: 'Draft', open: true },
  { status: 'SENT', label: 'Sent to client', open: true },
  { status: 'UNDER_NEGOTIATION', label: 'Under negotiation', open: true },
  { status: 'ACCEPTED', label: 'Accepted', open: false },
  { status: 'REJECTED', label: 'Lost', open: false },
  { status: 'EXPIRED', label: 'Expired', open: false },
  { status: 'WITHDRAWN', label: 'Withdrawn', open: false },
]

export const LOSS_REASONS: { value: LossReason; label: string; hint: string }[] = [
  { value: 'PRICE', label: 'Price', hint: 'Beaten on the all-in rate.' },
  { value: 'TRANSIT_TIME', label: 'Transit time', hint: 'A faster routing won it.' },
  { value: 'SPACE_UNAVAILABLE', label: 'Space unavailable', hint: 'No allocation on the sailing the client needed.' },
  { value: 'SERVICE_SCOPE', label: 'Service scope', hint: 'Client wanted a leg we did not quote.' },
  { value: 'CREDIT_TERMS', label: 'Credit terms', hint: 'Client wanted longer terms than we grant.' },
  { value: 'INCUMBENT_RETAINED', label: 'Incumbent retained', hint: 'Client stayed with their existing forwarder.' },
  { value: 'NO_DECISION', label: 'No decision', hint: 'Enquiry went quiet — cargo may not have moved.' },
  { value: 'CARGO_CANCELLED', label: 'Cargo cancelled', hint: 'The underlying sale fell through.' },
  { value: 'OTHER', label: 'Other', hint: '' },
]

export const PARTNER_TYPES: { value: PartnerType; label: string; hint: string }[] = [
  { value: 'CARRIER', label: 'Ocean / air carrier', hint: 'Owns the vessel or aircraft space.' },
  { value: 'OVERSEAS_AGENT', label: 'Overseas agent', hint: 'Handles the destination leg on our behalf.' },
  { value: 'TRUCKING', label: 'Trucking / haulage', hint: 'Inland move between factory, depot and port.' },
  { value: 'DEPOT', label: 'Container depot', hint: 'Empty release, stuffing yard, repairs.' },
  { value: 'CUSTOMS_BROKER', label: 'Customs broker (PPJK)', hint: 'Files PEB and PIB on our behalf.' },
  { value: 'WAREHOUSE', label: 'Warehouse / CFS', hint: 'Consolidation and storage.' },
  { value: 'SURVEYOR', label: 'Surveyor', hint: 'Draft survey, lashing, damage inspection.' },
  { value: 'INSURANCE', label: 'Marine insurance', hint: 'Cargo cover and claims.' },
  { value: 'FUMIGATION', label: 'Fumigation / treatment', hint: 'ISPM-15 and quarantine treatment.' },
  { value: 'TERMINAL', label: 'Port terminal', hint: 'THC, lift on/off, gate operations.' },
]

/** Journey milestones, modelled on the UN/EDIFACT IFTSTA status set. */
export const MILESTONES: { code: MilestoneCode; label: string; leg: 'ORIGIN' | 'MAIN' | 'DESTINATION'; hint: string; offsetFromEtd: number }[] = [
  { code: 'BOOKING_CONFIRMED', label: 'Booking confirmed', leg: 'ORIGIN', hint: 'Carrier accepted the booking and released the reference.', offsetFromEtd: -18 },
  { code: 'EMPTY_RELEASED', label: 'Empty container released', leg: 'ORIGIN', hint: 'Equipment picked up from the depot.', offsetFromEtd: -10 },
  { code: 'CARGO_RECEIVED', label: 'Cargo received', leg: 'ORIGIN', hint: 'Cargo in our custody at the factory or CFS.', offsetFromEtd: -8 },
  { code: 'STUFFED', label: 'Stuffed and sealed', leg: 'ORIGIN', hint: 'Loading into the unit complete.', offsetFromEtd: -6 },
  { code: 'VGM_SUBMITTED', label: 'VGM submitted', leg: 'ORIGIN', hint: 'SOLAS verified gross mass filed with the carrier.', offsetFromEtd: -5 },
  { code: 'CUSTOMS_CLEARED_ORIGIN', label: 'Export customs cleared', leg: 'ORIGIN', hint: 'NPE issued against the PEB.', offsetFromEtd: -4 },
  { code: 'GATE_IN', label: 'Gated in at terminal', leg: 'ORIGIN', hint: 'Unit accepted at the container yard.', offsetFromEtd: -3 },
  { code: 'LOADED_ON_VESSEL', label: 'Loaded on board', leg: 'MAIN', hint: 'Confirmed on the loading list.', offsetFromEtd: -1 },
  { code: 'VESSEL_DEPARTED', label: 'Vessel departed', leg: 'MAIN', hint: 'Actual time of departure from the POL.', offsetFromEtd: 0 },
  { code: 'TRANSHIPMENT_DISCHARGED', label: 'Discharged at transhipment', leg: 'MAIN', hint: 'Only where the routing transships.', offsetFromEtd: 8 },
  { code: 'TRANSHIPMENT_LOADED', label: 'Loaded on connecting vessel', leg: 'MAIN', hint: 'Connection made at the hub.', offsetFromEtd: 10 },
  { code: 'VESSEL_ARRIVED', label: 'Vessel arrived', leg: 'DESTINATION', hint: 'Actual time of arrival at the POD.', offsetFromEtd: 30 },
  { code: 'DISCHARGED', label: 'Discharged', leg: 'DESTINATION', hint: 'Unit off the vessel.', offsetFromEtd: 31 },
  { code: 'CUSTOMS_RELEASED_DEST', label: 'Import customs released', leg: 'DESTINATION', hint: 'Destination authority released the cargo.', offsetFromEtd: 33 },
  { code: 'GATE_OUT', label: 'Gated out', leg: 'DESTINATION', hint: 'Unit left the terminal for delivery.', offsetFromEtd: 34 },
  { code: 'DELIVERED', label: 'Delivered', leg: 'DESTINATION', hint: 'Proof of delivery obtained.', offsetFromEtd: 36 },
  { code: 'EMPTY_RETURNED', label: 'Empty returned', leg: 'DESTINATION', hint: 'Equipment back at the depot — detention stops here.', offsetFromEtd: 40 },
]

export const milestoneMeta = (code: MilestoneCode) => MILESTONES.find((m) => m.code === code)
export const milestoneIndex = (code: MilestoneCode) => MILESTONES.findIndex((m) => m.code === code)

export const MILESTONE_SOURCES: { value: string; label: string; hint: string }[] = [
  { value: 'CARRIER_EDI', label: 'Carrier EDI', hint: 'IFTSTA status message from the carrier.' },
  { value: 'PORTAL', label: 'Carrier portal', hint: 'Read from the line’s tracking page.' },
  { value: 'AGENT', label: 'Overseas agent', hint: 'Reported by the destination agent.' },
  { value: 'MANUAL', label: 'Keyed manually', hint: 'Typed by an operator — weakest evidence.' },
]

export const WAREHOUSES = [
  { code: 'CFS-TPP', name: 'CFS Tanjung Priok', city: 'Jakarta' },
  { code: 'CFS-SUB', name: 'CFS Tanjung Perak', city: 'Surabaya' },
  { code: 'WH-SRG', name: 'Semarang Consolidation Hub', city: 'Semarang' },
  { code: 'WH-DPS', name: 'Denpasar Buying Warehouse', city: 'Denpasar' },
  { code: 'CS-MAK', name: 'Makassar Cold Store', city: 'Makassar' },
]

export const CUSTOMS_OFFICES = [
  { code: '040300', name: 'KPU Bea Cukai Tanjung Priok' },
  { code: '050100', name: 'KPPBC Tanjung Perak' },
  { code: '070100', name: 'KPPBC Belawan' },
  { code: '060200', name: 'KPPBC Tanjung Emas' },
  { code: '080100', name: 'KPPBC Makassar' },
]

export const CUSTOMS_CHANNELS: { value: string; label: string; tone: string; hint: string }[] = [
  { value: 'PENDING', label: 'Awaiting response', tone: 'neutral', hint: 'Filed, no channel assigned yet.' },
  { value: 'HIJAU', label: 'Jalur Hijau', tone: 'success', hint: 'Green lane — released without inspection.' },
  { value: 'KUNING', label: 'Jalur Kuning', tone: 'warning', hint: 'Yellow lane — document check, expect 1–2 days.' },
  { value: 'MERAH', label: 'Jalur Merah', tone: 'danger', hint: 'Red lane — physical inspection, expect 3–5 days and demurrage risk.' },
]

/** Supporting documents CEISA 4.0 requires to be uploaded with a PEB (KEP-163/BC/2026). */
export const PEB_SUPPORTING_DOCS: { type: DocType; label: string; mandatory: boolean }[] = [
  { type: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice', mandatory: true },
  { type: 'PACKING_LIST', label: 'Packing List', mandatory: true },
  { type: 'DRAFT_BL', label: 'Bill of Lading / AWB', mandatory: true },
  { type: 'EXPORT_PERMIT', label: 'Export Permit (LARTAS commodities)', mandatory: false },
  { type: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin / SKA', mandatory: false },
  { type: 'PHYTOSANITARY', label: 'Quarantine / Phytosanitary Certificate', mandatory: false },
]

/** HS prefixes under Indonesian export restriction (LARTAS) — illustrative subset. */
export const RESTRICTED_HS_PREFIXES = ['4407', '4403', '2601', '2603', '7204', '1511', '0306', '4001']

export const KPI_TARGETS_DEFAULT = {
  onTimePct: 92,
  winRatePct: 35,
  grossMarginPct: 20,
  dsoDays: 45,
  utilisationPct: 80,
  docAccuracyPct: 97,
}

/* ==================================================================
   PHASE 3 reference data — services, incidents, document standards,
   access control and the forwarder's own licences
   ================================================================== */
import type {
  AccountStatus, AdditionalService, DocFieldSpec, IncidentSeverity, IncidentStatus,
  IncidentType, JobServiceStatus, LiableParty, LicenceKind, ServiceCategory,
  ServiceTrigger, UserRole,
} from './types'

/* ---------- additional services ---------- */

export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string; hint: string }[] = [
  { value: 'TREATMENT', label: 'Treatment', hint: 'Fumigation, heat treatment and quarantine compliance.' },
  { value: 'PACKING', label: 'Packing', hint: 'Export crating, palletising, shrink and edge protection.' },
  { value: 'INSPECTION', label: 'Inspection', hint: 'Pre-shipment survey, loading supervision, tally.' },
  { value: 'INSURANCE', label: 'Insurance', hint: 'All-risk marine cover arranged on the client’s behalf.' },
  { value: 'CUSTOMS', label: 'Customs', hint: 'Permits, certificates and origin documentation.' },
  { value: 'HANDLING', label: 'Handling', hint: 'Lashing, dunnage, heavy lift and special equipment.' },
  { value: 'TRANSPORT', label: 'Transport', hint: 'Escorted, oversize or temperature-controlled moves.' },
  { value: 'STORAGE', label: 'Storage', hint: 'Buffer storage before the vessel cut-off.' },
  { value: 'DOCUMENTATION', label: 'Documentation', hint: 'Legalisation, courier of originals, telex release.' },
  { value: 'SPECIAL_CARGO', label: 'Special cargo', hint: 'Dangerous goods, reefer and high-value protocols.' },
]

export const serviceCategoryLabel = (c: ServiceCategory) =>
  SERVICE_CATEGORIES.find((x) => x.value === c)?.label ?? c

/**
 * Conditions that switch a service on. Each one is derived from the job itself —
 * commodity, HS code, packaging, container type, value or destination — so the
 * operator never has to remember the rule.
 */
export const SERVICE_TRIGGERS: { value: ServiceTrigger; label: string; detectedFrom: string }[] = [
  { value: 'WOODEN_PACKAGING', label: 'Wooden packaging', detectedFrom: 'Cargo packed in pallets, crates or bundles.' },
  { value: 'PLANT_PRODUCT', label: 'Plant product', detectedFrom: 'HS chapters 06–14 or 44 — timber, coffee, spices, rattan.' },
  { value: 'ANIMAL_PRODUCT', label: 'Animal product', detectedFrom: 'HS chapters 01–05 and 16 — seafood, hides, processed meat.' },
  { value: 'FOOD_GRADE', label: 'Food grade', detectedFrom: 'HS chapters 04, 07–22 — anything for human consumption.' },
  { value: 'DANGEROUS_GOODS', label: 'Dangerous goods', detectedFrom: 'Job flagged DG, or a container carries an IMO class.' },
  { value: 'REEFER', label: 'Reefer', detectedFrom: 'A 20RF or 40RH container is on the plan.' },
  { value: 'HIGH_VALUE', label: 'High value', detectedFrom: 'Declared cargo value above USD 100,000.' },
  { value: 'OUT_OF_GAUGE', label: 'Out of gauge', detectedFrom: 'Flat rack or open top equipment on the plan.' },
  { value: 'FRAGILE', label: 'Fragile', detectedFrom: 'Commodity contains glass, ceramic, marble or electronics.' },
  { value: 'DESTINATION_AU', label: 'To Australia / NZ', detectedFrom: 'Destination country AU or NZ.' },
  { value: 'DESTINATION_US', label: 'To United States', detectedFrom: 'Destination country US or CA.' },
  { value: 'DESTINATION_EU', label: 'To Europe', detectedFrom: 'Destination in the EU or United Kingdom.' },
  { value: 'LCL', label: 'LCL consolidation', detectedFrom: 'Cargo moves as LCL rather than a full container.' },
  { value: 'ALWAYS', label: 'Every shipment', detectedFrom: 'Offered on every job as part of the standard scope.' },
]

export const serviceTriggerLabel = (t: ServiceTrigger) =>
  SERVICE_TRIGGERS.find((x) => x.value === t)?.label ?? t

/** The catalogue an operations desk actually sells alongside freight. */
export const ADDITIONAL_SERVICES: AdditionalService[] = [
  {
    id: 'svc_fumi_mb', code: 'FUMI-MB', name: 'Methyl bromide fumigation (ISPM-15)',
    category: 'TREATMENT',
    description: 'Chamber or under-sheet fumigation of wooden packaging and the cargo itself, carried out by a Karantina-registered provider.',
    deliverable: 'Stamped ISPM-15 mark on every wooden piece plus a numbered fumigation certificate naming the vessel and container.',
    basis: 'PER_CONTAINER', buyRate: 1_450_000, sellRate: 2_200_000, currency: 'IDR',
    leadTimeDays: 2, chargeCode: 'FUMI', producesDocument: 'FUMIGATION',
    mandatoryWhen: ['WOODEN_PACKAGING', 'DESTINATION_AU'],
    suggestedWhen: ['PLANT_PRODUCT', 'DESTINATION_US'],
    active: true,
    notes: 'Australia and New Zealand reject untreated timber at the border — the container is returned at the shipper’s cost.',
  },
  {
    id: 'svc_heat_treat', code: 'HT-ISPM', name: 'Heat treatment (HT 56°C / 30 min)',
    category: 'TREATMENT',
    description: 'Kiln heat treatment of pallets and crates. Preferred where the destination restricts methyl bromide, and for food-grade cargo.',
    deliverable: 'HT stamp with the treatment provider’s registration number and a treatment certificate.',
    basis: 'PER_CBM', buyRate: 85_000, sellRate: 135_000, currency: 'IDR',
    leadTimeDays: 3, chargeCode: 'FUMI', producesDocument: 'FUMIGATION',
    mandatoryWhen: [], suggestedWhen: ['WOODEN_PACKAGING', 'FOOD_GRADE', 'DESTINATION_EU'],
    active: true,
    notes: 'The EU discourages methyl bromide; quote HT first for European destinations.',
  },
  {
    id: 'svc_phyto', code: 'PHYTO', name: 'Phytosanitary certificate handling',
    category: 'CUSTOMS',
    description: 'Sampling, inspection booking and certificate collection from the agricultural quarantine office at the port of loading.',
    deliverable: 'Original phytosanitary certificate matching the invoice, packing list and B/L exactly.',
    basis: 'PER_DOCUMENT', buyRate: 750_000, sellRate: 1_250_000, currency: 'IDR',
    leadTimeDays: 3, chargeCode: 'PHYTO', producesDocument: 'PHYTOSANITARY',
    mandatoryWhen: ['PLANT_PRODUCT'], suggestedWhen: ['FOOD_GRADE'],
    active: true,
    notes: 'Certificate is invalid if the vessel changes after issuance — re-issue costs the same again.',
  },
  {
    id: 'svc_export_crate', code: 'CRATE', name: 'Export crating & case making',
    category: 'PACKING',
    description: 'Purpose-built plywood or timber cases with internal bracing, built at the factory or at our CFS.',
    deliverable: 'Sealed export cases with marks, numbers and handling symbols stencilled per the packing list.',
    basis: 'PER_CBM', buyRate: 320_000, sellRate: 480_000, currency: 'IDR',
    leadTimeDays: 4, chargeCode: 'STUFF',
    mandatoryWhen: [], suggestedWhen: ['FRAGILE', 'HIGH_VALUE', 'OUT_OF_GAUGE'],
    active: true,
  },
  {
    id: 'svc_vacuum', code: 'VACPACK', name: 'Vacuum barrier bagging with desiccant',
    category: 'PACKING',
    description: 'Aluminium barrier bag, vacuum seal and calculated desiccant load to hold cargo below 60% RH for the voyage.',
    deliverable: 'Sealed barrier bags with humidity indicator cards and a desiccant calculation sheet.',
    basis: 'PER_CONTAINER', buyRate: 3_100_000, sellRate: 4_600_000, currency: 'IDR',
    leadTimeDays: 2, chargeCode: 'STUFF',
    mandatoryWhen: [], suggestedWhen: ['HIGH_VALUE', 'FRAGILE', 'DESTINATION_EU'],
    active: true,
    notes: 'Sells itself on long-haul lanes — container rain is the single most common cargo damage claim.',
  },
  {
    id: 'svc_lashing', code: 'LASH', name: 'Lashing, dunnage & securing',
    category: 'HANDLING',
    description: 'Cargo securing to CTU Code standards with certified webbing, chocks and airbags, supervised by a lashing surveyor.',
    deliverable: 'Lashing certificate and stow photographs filed against the container record.',
    basis: 'PER_CONTAINER', buyRate: 900_000, sellRate: 1_500_000, currency: 'IDR',
    leadTimeDays: 1, chargeCode: 'STUFF',
    mandatoryWhen: ['OUT_OF_GAUGE'], suggestedWhen: ['HIGH_VALUE', 'FRAGILE'],
    active: true,
  },
  {
    id: 'svc_survey', code: 'LOADSUP', name: 'Loading supervision & tally',
    category: 'INSPECTION',
    description: 'Independent surveyor attends the stuffing, counts every package, photographs the stow and witnesses the seal.',
    deliverable: 'Tally sheet, stuffing photo set and a signed container sealing report.',
    basis: 'PER_CONTAINER', buyRate: 1_200_000, sellRate: 1_900_000, currency: 'IDR',
    leadTimeDays: 1, chargeCode: 'STUFF',
    mandatoryWhen: [], suggestedWhen: ['HIGH_VALUE', 'FRAGILE', 'DESTINATION_US'],
    active: true,
    notes: 'The cheapest defence against a shortage claim — without a tally the forwarder carries the loss.',
  },
  {
    id: 'svc_psi', code: 'PSI', name: 'Pre-shipment inspection (buyer mandated)',
    category: 'INSPECTION',
    description: 'Third-party inspection to the buyer’s specification, booked and coordinated before the container is sealed.',
    deliverable: 'Inspection report and, where the buyer’s L/C requires it, a clean report of findings.',
    basis: 'PER_SHIPMENT', buyRate: 6_500_000, sellRate: 9_000_000, currency: 'IDR',
    leadTimeDays: 5, chargeCode: 'ADMIN',
    mandatoryWhen: [], suggestedWhen: ['HIGH_VALUE', 'FOOD_GRADE'],
    active: true,
    notes: 'Where an L/C calls for a clean report of findings, shipping without it means the bank refuses the documents.',
  },
  {
    id: 'svc_insurance', code: 'ICC-A', name: 'All-risk marine cargo insurance (ICC A)',
    category: 'INSURANCE',
    description: 'Institute Cargo Clauses (A) cover at 110% of CIF value, placed under our open policy, warehouse to warehouse.',
    deliverable: 'Insurance certificate naming the assured and the claims agent at destination.',
    basis: 'PERCENT_OF_VALUE', buyRate: 0.12, sellRate: 0.22, currency: 'USD',
    leadTimeDays: 1, chargeCode: 'INS', producesDocument: 'INSURANCE_CERTIFICATE',
    mandatoryWhen: [], suggestedWhen: ['HIGH_VALUE', 'FRAGILE', 'ALWAYS'],
    active: true,
    notes: 'Mandatory under CIF and CIP — the seller is contractually obliged to insure.',
  },
  {
    id: 'svc_dg', code: 'DG-DEC', name: 'Dangerous goods declaration & segregation',
    category: 'SPECIAL_CARGO',
    description: 'IMDG classification review, DG declaration preparation, placarding and segregation check against the stow plan.',
    deliverable: 'Signed multimodal dangerous goods form, placards fitted and an MSDS pack lodged with the carrier.',
    basis: 'PER_CONTAINER', buyRate: 1_800_000, sellRate: 2_900_000, currency: 'IDR',
    leadTimeDays: 3, chargeCode: 'DOC', producesDocument: 'MSDS',
    mandatoryWhen: ['DANGEROUS_GOODS'], suggestedWhen: [],
    active: true,
    notes: 'Misdeclared DG is the one error that voids the carrier’s liability entirely.',
  },
  {
    id: 'svc_reefer_mon', code: 'REEF-MON', name: 'Reefer pre-trip inspection & monitoring',
    category: 'SPECIAL_CARGO',
    description: 'PTI at the depot, set-point verification at gate-in and daily temperature readouts pulled from the carrier for the whole voyage.',
    deliverable: 'PTI report plus a temperature log covering gate-in to discharge.',
    basis: 'PER_CONTAINER', buyRate: 1_100_000, sellRate: 1_800_000, currency: 'IDR',
    leadTimeDays: 1, chargeCode: 'ADMIN',
    mandatoryWhen: ['REEFER'], suggestedWhen: ['FOOD_GRADE'],
    active: true,
  },
  {
    id: 'svc_coo_legal', code: 'COO-LEG', name: 'Certificate of origin legalisation',
    category: 'DOCUMENTATION',
    description: 'Chamber of commerce endorsement and, where required, embassy legalisation of the origin certificate and invoice.',
    deliverable: 'Legalised original set, couriered to the consignee with a tracked airway bill.',
    basis: 'PER_DOCUMENT', buyRate: 1_600_000, sellRate: 2_600_000, currency: 'IDR',
    leadTimeDays: 5, chargeCode: 'COO', producesDocument: 'CERTIFICATE_OF_ORIGIN',
    mandatoryWhen: [], suggestedWhen: ['DESTINATION_EU', 'DESTINATION_US'],
    active: true,
    notes: 'Middle East consignees commonly require embassy legalisation — allow a full working week.',
  },
  {
    id: 'svc_courier', code: 'COURIER', name: 'Original document courier',
    category: 'DOCUMENTATION',
    description: 'Door-to-door courier of the original B/L set and commercial documents, with the tracking number recorded on the job.',
    deliverable: 'Courier airway bill and a signed receipt from the consignee’s bank or office.',
    basis: 'PER_SHIPMENT', buyRate: 650_000, sellRate: 1_100_000, currency: 'IDR',
    leadTimeDays: 3, chargeCode: 'DOC',
    mandatoryWhen: [], suggestedWhen: ['ALWAYS'],
    active: true,
  },
  {
    id: 'svc_buffer', code: 'BUFFER', name: 'Pre-cut-off buffer storage',
    category: 'STORAGE',
    description: 'Covered storage at our CFS between factory release and the stuffing date, so the factory is not held to the vessel calendar.',
    deliverable: 'Warehouse receipt per lot, with free time and a daily storage rate after it.',
    basis: 'PER_CBM', buyRate: 22_000, sellRate: 40_000, currency: 'IDR',
    leadTimeDays: 0, chargeCode: 'STOR',
    mandatoryWhen: [], suggestedWhen: ['LCL'],
    active: true,
  },
  {
    id: 'svc_escort', code: 'ESCORT', name: 'Escorted oversize road move',
    category: 'TRANSPORT',
    description: 'Route survey, police escort and permits for cargo over legal road dimensions between the factory and the port.',
    deliverable: 'Road permit, escort schedule and a confirmed delivery window at the terminal gate.',
    basis: 'PER_CONTAINER', buyRate: 7_800_000, sellRate: 11_500_000, currency: 'IDR',
    leadTimeDays: 7, chargeCode: 'TRUCK',
    mandatoryWhen: ['OUT_OF_GAUGE'], suggestedWhen: [],
    active: true,
  },
  {
    id: 'svc_isf', code: 'ISF', name: 'ISF 10+2 filing (United States)',
    category: 'CUSTOMS',
    description: 'Importer Security Filing lodged with US CBP no later than 24 hours before the vessel loads at origin.',
    deliverable: 'ISF transaction number returned by CBP and filed against the job.',
    basis: 'PER_BL', buyRate: 350_000, sellRate: 750_000, currency: 'IDR',
    leadTimeDays: 1, chargeCode: 'AMS',
    mandatoryWhen: ['DESTINATION_US'], suggestedWhen: [],
    active: true,
    notes: 'A late or missing ISF draws a USD 5,000 penalty per shipment, charged to the importer of record.',
  },
  {
    id: 'svc_ens', code: 'ENS', name: 'ENS / ICS2 filing (European Union)',
    category: 'CUSTOMS',
    description: 'Entry summary declaration into ICS2 for the EU leg, filed against the master B/L before loading.',
    deliverable: 'MRN reference confirmed by the first EU office of entry.',
    basis: 'PER_BL', buyRate: 300_000, sellRate: 650_000, currency: 'IDR',
    leadTimeDays: 1, chargeCode: 'AMS',
    mandatoryWhen: ['DESTINATION_EU'], suggestedWhen: [],
    active: true,
  },
  {
    id: 'svc_afas', code: 'AU-BMSB', name: 'Australia BMSB seasonal treatment',
    category: 'TREATMENT',
    description: 'Brown marmorated stink bug treatment for shipments departing between 1 September and 30 April, applied offshore by an approved provider.',
    deliverable: 'Treatment certificate from an Australian-approved offshore treatment provider.',
    basis: 'PER_CONTAINER', buyRate: 2_400_000, sellRate: 3_500_000, currency: 'IDR',
    leadTimeDays: 4, chargeCode: 'FUMI', producesDocument: 'FUMIGATION',
    mandatoryWhen: ['DESTINATION_AU'], suggestedWhen: [],
    active: true,
    notes: 'Seasonal window only. Untreated containers are directed offshore or destroyed on arrival.',
  },
]

export const JOB_SERVICE_STATUSES: { value: JobServiceStatus; label: string; tone: string; hint: string }[] = [
  { value: 'PROPOSED', label: 'Proposed', tone: 'neutral', hint: 'Rule fired or the desk added it — the client has not answered yet.' },
  { value: 'ACCEPTED', label: 'Accepted', tone: 'info', hint: 'Client agreed to the charge; book the provider.' },
  { value: 'DECLINED', label: 'Declined', tone: 'warning', hint: 'Client refused. Keep the record — it is the evidence if it goes wrong.' },
  { value: 'BOOKED', label: 'Booked', tone: 'info', hint: 'Provider confirmed a slot.' },
  { value: 'IN_PROGRESS', label: 'In progress', tone: 'info', hint: 'Work started at the yard, factory or chamber.' },
  { value: 'COMPLETED', label: 'Completed', tone: 'success', hint: 'Done and, where applicable, certificate received.' },
  { value: 'FAILED', label: 'Failed', tone: 'danger', hint: 'Treatment or inspection failed — the cargo cannot ship as it stands.' },
]

/* ---------- incidents ---------- */

export const INCIDENT_TYPES: {
  value: IncidentType; label: string; defaultSeverity: IncidentSeverity
  defaultLiable: LiableParty; group: 'CARRIER' | 'CUSTOMS' | 'CARGO' | 'COMMERCIAL'; playbook: string
}[] = [
  { value: 'ROLLOVER', label: 'Container rolled over', defaultSeverity: 'HIGH', defaultLiable: 'CARRIER', group: 'CARRIER', playbook: 'Get the next confirmed sailing in writing, tell the client the same day, and check whether the L/C latest shipment date still holds.' },
  { value: 'VESSEL_OMISSION', label: 'Vessel omitted the port', defaultSeverity: 'HIGH', defaultLiable: 'CARRIER', group: 'CARRIER', playbook: 'Confirm the discharge port actually used, arrange the on-carriage and claim the extra cost from the carrier.' },
  { value: 'BOOKING_CANCELLED', label: 'Booking cancelled by carrier', defaultSeverity: 'HIGH', defaultLiable: 'CARRIER', group: 'CARRIER', playbook: 'Re-book on an alternative service before releasing the empty; hold the stuffing crew rather than stuffing into nothing.' },
  { value: 'SHORT_SHIPPED', label: 'Short shipped', defaultSeverity: 'HIGH', defaultLiable: 'CARRIER', group: 'CARRIER', playbook: 'Split the B/L, amend the PEB for the quantity actually exported and re-plan the balance.' },
  { value: 'GATE_REJECTED', label: 'Rejected at the terminal gate', defaultSeverity: 'MEDIUM', defaultLiable: 'FORWARDER', group: 'CARRIER', playbook: 'Identify the reason — VGM, seal, damage, missing NPE — fix it and re-gate before the cut-off.' },
  { value: 'CUSTOMS_HOLD', label: 'Customs hold / red lane', defaultSeverity: 'HIGH', defaultLiable: 'CUSTOMS', group: 'CUSTOMS', playbook: 'Attend the physical inspection, supply the supporting file the same day and log the demurrage exposure from day one.' },
  { value: 'DOCUMENT_DISCREPANCY', label: 'Document discrepancy', defaultSeverity: 'MEDIUM', defaultLiable: 'FORWARDER', group: 'CUSTOMS', playbook: 'Correct at source, re-issue every downstream document, and check the L/C before the bank does.' },
  { value: 'MISDECLARATION', label: 'Cargo misdeclaration', defaultSeverity: 'CRITICAL', defaultLiable: 'SHIPPER', group: 'CUSTOMS', playbook: 'Stop the shipment, correct the declaration and disclose voluntarily — a discovered misdeclaration voids the carrier’s liability and ours.' },
  { value: 'CARGO_DAMAGE', label: 'Cargo damage', defaultSeverity: 'HIGH', defaultLiable: 'UNDETERMINED', group: 'CARGO', playbook: 'Survey within 3 days, photograph before anything moves, notify the carrier in writing and open the insurance claim.' },
  { value: 'CARGO_SHORTAGE', label: 'Cargo shortage', defaultSeverity: 'HIGH', defaultLiable: 'UNDETERMINED', group: 'CARGO', playbook: 'Pull the tally sheet and seal record; without a tally the shortage lands on the forwarder.' },
  { value: 'TEMPERATURE_DEVIATION', label: 'Reefer temperature deviation', defaultSeverity: 'CRITICAL', defaultLiable: 'CARRIER', group: 'CARGO', playbook: 'Pull the data logger, get the carrier’s reefer log and have the cargo surveyed before it is released.' },
  { value: 'RETURN_TO_ORIGIN', label: 'Returned to origin', defaultSeverity: 'CRITICAL', defaultLiable: 'SHIPPER', group: 'CARGO', playbook: 'Quote the return leg, storage and re-export before agreeing; abandonment at destination is the more expensive outcome.' },
  { value: 'DEMURRAGE', label: 'Demurrage incurred', defaultSeverity: 'MEDIUM', defaultLiable: 'UNDETERMINED', group: 'COMMERCIAL', playbook: 'Establish who caused the delay before accepting the invoice; carrier-caused delay is waivable.' },
  { value: 'DETENTION', label: 'Detention incurred', defaultSeverity: 'MEDIUM', defaultLiable: 'CONSIGNEE', group: 'COMMERCIAL', playbook: 'Chase the empty return, ask the carrier for a detention waiver in writing and re-bill the party at fault.' },
  { value: 'CUSTOMER_CANCELLED', label: 'Cancelled by the customer', defaultSeverity: 'MEDIUM', defaultLiable: 'SHIPPER', group: 'COMMERCIAL', playbook: 'Cancel the booking before the empty is released, then bill the costs already committed.' },
  { value: 'PAYMENT_DEFAULT', label: 'Payment default', defaultSeverity: 'HIGH', defaultLiable: 'CONSIGNEE', group: 'COMMERCIAL', playbook: 'Hold the original B/L, stop new bookings for the account and escalate before the free time at destination runs out.' },
]

export const incidentTypeLabel = (t: IncidentType) =>
  INCIDENT_TYPES.find((x) => x.value === t)?.label ?? t
export const incidentPlaybook = (t: IncidentType) =>
  INCIDENT_TYPES.find((x) => x.value === t)?.playbook ?? ''

export const INCIDENT_STATUSES: { value: IncidentStatus; label: string; tone: string; open: boolean; hint: string }[] = [
  { value: 'OPEN', label: 'Open', tone: 'danger', open: true, hint: 'Logged, nobody has picked it up yet.' },
  { value: 'INVESTIGATING', label: 'Investigating', tone: 'warning', open: true, hint: 'Gathering evidence — surveys, logs, photographs.' },
  { value: 'ACTION_TAKEN', label: 'Action taken', tone: 'info', open: true, hint: 'Remedy in motion; watching whether it holds.' },
  { value: 'AWAITING_PARTY', label: 'Awaiting party', tone: 'warning', open: true, hint: 'Waiting on the carrier, insurer, customs or the client.' },
  { value: 'ESCALATED', label: 'Escalated', tone: 'danger', open: true, hint: 'Above the desk — management, legal or the insurer’s adjuster.' },
  { value: 'RESOLVED', label: 'Resolved', tone: 'success', open: false, hint: 'Closed with the cost recovered or absorbed knowingly.' },
  { value: 'WRITTEN_OFF', label: 'Written off', tone: 'neutral', open: false, hint: 'Recovery abandoned; the cost stays with us.' },
]

export const incidentStatusOpen = (s: IncidentStatus) =>
  INCIDENT_STATUSES.find((x) => x.value === s)?.open ?? true

export const INCIDENT_SEVERITIES: { value: IncidentSeverity; label: string; tone: string }[] = [
  { value: 'LOW', label: 'Low', tone: 'neutral' },
  { value: 'MEDIUM', label: 'Medium', tone: 'info' },
  { value: 'HIGH', label: 'High', tone: 'warning' },
  { value: 'CRITICAL', label: 'Critical', tone: 'danger' },
]

export const LIABLE_PARTIES: { value: LiableParty; label: string }[] = [
  { value: 'CARRIER', label: 'Carrier' },
  { value: 'SHIPPER', label: 'Shipper' },
  { value: 'CONSIGNEE', label: 'Consignee' },
  { value: 'FORWARDER', label: 'Us (forwarder)' },
  { value: 'VENDOR', label: 'Vendor / subcontractor' },
  { value: 'CUSTOMS', label: 'Customs authority' },
  { value: 'INSURER', label: 'Insurer' },
  { value: 'UNDETERMINED', label: 'Undetermined' },
]

/* ---------- document standards ----------
   What each document must carry to be accepted by a bank, a customs office
   or a carrier. These drive the per-document completeness check. */

const COMMON_HEADER: DocFieldSpec[] = [
  { key: 'shipper', label: 'Shipper (full legal name & address)', required: true, hint: 'Must match the exporter of record on the PEB.' },
  { key: 'consignee', label: 'Consignee (full legal name & address)', required: true, hint: 'Under an L/C, "to order" is only valid if the credit says so.' },
  { key: 'notifyParty', label: 'Notify party', required: false, hint: 'Usually the consignee or their broker at destination.' },
]

export const DOC_FIELD_SPECS: Partial<Record<DocType, DocFieldSpec[]>> = {
  COMMERCIAL_INVOICE: [
    ...COMMON_HEADER,
    { key: 'invoiceNo', label: 'Invoice number & date', required: true, hint: 'Referenced by the PEB, the B/L and the L/C.' },
    { key: 'incoterm', label: 'Incoterm 2020 + named place', required: true, hint: 'e.g. FOB Tanjung Priok — the place is part of the term.' },
    { key: 'description', label: 'Goods description', required: true, hint: 'Must read the same on invoice, packing list and B/L.' },
    { key: 'hsCode', label: 'HS code per line', required: true, hint: 'Six digits minimum; the destination may need eight.' },
    { key: 'unitPrice', label: 'Unit price & extended value', required: true, hint: 'Arithmetic must foot exactly — banks reject on rounding.' },
    { key: 'currency', label: 'Currency', required: true, hint: 'Same currency as the L/C where one applies.' },
    { key: 'paymentTerms', label: 'Payment terms', required: true, hint: 'T/T, L/C at sight, D/P, open account.' },
    { key: 'originCountry', label: 'Country of origin', required: true, hint: 'Origin, not the port of loading.' },
    { key: 'signature', label: 'Authorised signature', required: true, hint: 'Some destinations require a manual, not printed, signature.' },
  ],
  PACKING_LIST: [
    ...COMMON_HEADER,
    { key: 'invoiceRef', label: 'Matching invoice number', required: true, hint: 'Ties the packing list to the invoice.' },
    { key: 'marks', label: 'Marks & numbers', required: true, hint: 'Must match the stencilling on the packages.' },
    { key: 'packages', label: 'Package count & type', required: true, hint: 'e.g. 240 cartons on 12 pallets.' },
    { key: 'netWeight', label: 'Net weight (kg)', required: true, hint: 'Excludes packaging.' },
    { key: 'grossWeight', label: 'Gross weight (kg)', required: true, hint: 'Must reconcile with the VGM.' },
    { key: 'measurement', label: 'Measurement (CBM)', required: true, hint: 'Drives freight on LCL and the stow plan on FCL.' },
    { key: 'containerSeal', label: 'Container & seal numbers', required: false, hint: 'Added once the container is sealed.' },
  ],
  SHIPPING_INSTRUCTION: [
    ...COMMON_HEADER,
    { key: 'bookingNo', label: 'Carrier booking number', required: true, hint: 'Without it the carrier cannot match the SI.' },
    { key: 'polPod', label: 'Port of loading / discharge', required: true, hint: 'UN/LOCODE plus the plain name.' },
    { key: 'blType', label: 'B/L type requested', required: true, hint: 'Original, seaway bill, or telex release.' },
    { key: 'freightTerm', label: 'Freight prepaid / collect', required: true, hint: 'Must agree with the Incoterm.' },
    { key: 'description', label: 'Cargo description for the B/L', required: true, hint: 'This text is printed on the B/L verbatim.' },
    { key: 'cutoff', label: 'SI cut-off acknowledged', required: true, hint: 'A late SI means a rolled container, not a late B/L.' },
  ],
  DRAFT_BL: [
    ...COMMON_HEADER,
    { key: 'blNo', label: 'B/L number', required: true, hint: 'Carrier or house series.' },
    { key: 'vesselVoyage', label: 'Vessel & voyage', required: true, hint: 'Must match the booking confirmation.' },
    { key: 'polPod', label: 'Port of loading / discharge', required: true, hint: '' },
    { key: 'description', label: 'Description of goods', required: true, hint: 'Identical wording to the invoice.' },
    { key: 'packagesWeight', label: 'Packages, gross weight, measurement', required: true, hint: 'Reconciles to the packing list.' },
    { key: 'containerSeal', label: 'Container & seal numbers', required: true, hint: '' },
    { key: 'freightClause', label: 'Freight prepaid / collect clause', required: true, hint: '' },
    { key: 'shipperApproval', label: 'Shipper approval of the draft', required: true, hint: 'Correcting an issued B/L costs an amendment fee and a day.' },
  ],
  HOUSE_BL: [
    ...COMMON_HEADER,
    { key: 'blNo', label: 'House B/L number', required: true, hint: 'Our own series.' },
    { key: 'originals', label: 'Number of originals issued', required: true, hint: 'Typically 3/3 originals, or 0/3 for a seaway bill.' },
    { key: 'onBoardDate', label: 'Shipped on board date', required: true, hint: 'An L/C almost always requires an on-board notation.' },
    { key: 'placeOfIssue', label: 'Place & date of issue', required: true, hint: '' },
    { key: 'terms', label: 'Standard trading conditions referenced', required: true, hint: 'Limits our liability to the agreed package limitation.' },
    { key: 'signature', label: 'Signed as carrier or as agent', required: true, hint: 'The capacity must be stated on the face of the B/L.' },
  ],
  MASTER_BL: [
    { key: 'blNo', label: 'Master B/L number', required: true, hint: 'Carrier’s own series.' },
    { key: 'shipper', label: 'Shipper (us or our agent)', required: true, hint: 'On a house/master structure the forwarder is the shipper.' },
    { key: 'consignee', label: 'Consignee (destination agent)', required: true, hint: '' },
    { key: 'vesselVoyage', label: 'Vessel & voyage', required: true, hint: '' },
    { key: 'onBoardDate', label: 'Shipped on board date', required: true, hint: '' },
  ],
  CERTIFICATE_OF_ORIGIN: [
    { key: 'form', label: 'Form type', required: true, hint: 'Form D (ATIGA), Form E (ACFTA), AK (AKFTA), AI, JIEPA or a non-preferential COO.' },
    { key: 'certNo', label: 'Certificate number', required: true, hint: '' },
    { key: 'exporter', label: 'Exporter details', required: true, hint: 'Must match the invoice exactly.' },
    { key: 'consignee', label: 'Consignee details', required: true, hint: 'A mismatch here is the most common reason a preference is refused.' },
    { key: 'originCriterion', label: 'Origin criterion', required: true, hint: 'WO, PE, RVC or CTC — as claimed under the agreement.' },
    { key: 'hsCode', label: 'HS code (6 digits)', required: true, hint: 'Must agree with the destination’s tariff classification.' },
    { key: 'issuer', label: 'Issuing authority & stamp', required: true, hint: 'Ministry of Trade or an appointed chamber.' },
  ],
  PEB: [
    { key: 'pebNo', label: 'PEB registration number & date', required: true, hint: 'Issued by CEISA on acceptance.' },
    { key: 'exporterNpwp', label: 'Exporter tax ID (NPWP)', required: true, hint: '' },
    { key: 'customsOffice', label: 'Customs office of loading', required: true, hint: '' },
    { key: 'hsCode', label: 'HS code per item', required: true, hint: 'Eight digits under the Indonesian tariff book.' },
    { key: 'fobValue', label: 'FOB value', required: true, hint: 'Converted at the published customs exchange rate (NDPBM).' },
    { key: 'netWeight', label: 'Net weight', required: true, hint: '' },
    { key: 'supportingDocs', label: 'Supporting documents uploaded', required: true, hint: 'Invoice, packing list and B/L are mandatory uploads under KEP-163/BC/2026.' },
    { key: 'lartas', label: 'Restriction (LARTAS) permit where applicable', required: false, hint: 'Timber, minerals, scrap metal, CPO and live seafood.' },
  ],
  NPE: [
    { key: 'npeNo', label: 'NPE number & date', required: true, hint: 'Export approval note — no gate-in without it.' },
    { key: 'pebRef', label: 'Related PEB number', required: true, hint: '' },
    { key: 'channel', label: 'Assigned channel', required: true, hint: 'Green, yellow or red lane.' },
    { key: 'containerList', label: 'Container numbers covered', required: true, hint: 'The terminal checks these at the gate.' },
  ],
  VGM_CERTIFICATE: [
    { key: 'containerNo', label: 'Container number', required: true, hint: 'ISO 6346 with a valid check digit.' },
    { key: 'vgmKg', label: 'Verified gross mass (kg)', required: true, hint: 'Cargo, dunnage and tare together.' },
    { key: 'method', label: 'Weighing method', required: true, hint: 'Method 1 (weighbridge) or Method 2 (calculated).' },
    { key: 'weighDate', label: 'Date & place of weighing', required: true, hint: '' },
    { key: 'authorised', label: 'Authorised person', required: true, hint: 'Named individual, not just a company — SOLAS requires it.' },
    { key: 'submittedBefore', label: 'Submitted before the VGM cut-off', required: true, hint: 'No VGM, no loading. There is no discretion here.' },
  ],
  FUMIGATION: [
    { key: 'certNo', label: 'Certificate number', required: true, hint: '' },
    { key: 'treatment', label: 'Treatment type', required: true, hint: 'MB fumigation, heat treatment or BMSB seasonal treatment.' },
    { key: 'dosage', label: 'Dosage / temperature & duration', required: true, hint: 'e.g. 48 g/m³ for 24 h at 21°C.' },
    { key: 'treatmentDate', label: 'Treatment date', required: true, hint: 'Must precede stuffing; some destinations cap the age at 21 days.' },
    { key: 'provider', label: 'Registered provider & registration number', required: true, hint: 'Must be approved by the destination authority.' },
    { key: 'containerNo', label: 'Container or package identification', required: true, hint: '' },
  ],
  PHYTOSANITARY: [
    { key: 'certNo', label: 'Certificate number', required: true, hint: '' },
    { key: 'botanicalName', label: 'Botanical name of the product', required: true, hint: 'Latin name, not the trade name.' },
    { key: 'declaredQty', label: 'Declared quantity', required: true, hint: 'Must match the packing list.' },
    { key: 'treatmentDetail', label: 'Disinfestation treatment detail', required: false, hint: 'Completed where the destination requires treatment.' },
    { key: 'additionalDecl', label: 'Additional declaration', required: false, hint: 'Destination-specific wording — get it from the buyer in writing.' },
    { key: 'inspector', label: 'Inspector signature & stamp', required: true, hint: 'Issued by the agricultural quarantine office.' },
  ],
  INSURANCE_CERTIFICATE: [
    { key: 'certNo', label: 'Certificate number', required: true, hint: '' },
    { key: 'assured', label: 'Assured party', required: true, hint: 'Under CIF the buyer must be able to claim.' },
    { key: 'insuredValue', label: 'Insured value', required: true, hint: 'Normally 110% of CIF value.' },
    { key: 'clauses', label: 'Clauses', required: true, hint: 'ICC A, B or C, plus war and strikes where added.' },
    { key: 'coverage', label: 'Coverage period', required: true, hint: 'Warehouse to warehouse.' },
    { key: 'claimsAgent', label: 'Claims agent at destination', required: true, hint: 'A certificate without a claims agent is hard to use.' },
  ],
  BOOKING_CONFIRMATION: [
    { key: 'bookingNo', label: 'Booking number', required: true, hint: '' },
    { key: 'vesselVoyage', label: 'Vessel & voyage', required: true, hint: '' },
    { key: 'equipment', label: 'Equipment type & count', required: true, hint: '' },
    { key: 'cutoffs', label: 'SI, VGM and gate-in cut-offs', required: true, hint: 'Copy these onto the job the day the booking lands.' },
    { key: 'emptyPickup', label: 'Empty pick-up depot & release date', required: true, hint: '' },
  ],
  MSDS: [
    { key: 'unNumber', label: 'UN number', required: true, hint: '' },
    { key: 'imoClass', label: 'IMDG class & packing group', required: true, hint: '' },
    { key: 'properName', label: 'Proper shipping name', required: true, hint: 'The IMDG name, not the commercial name.' },
    { key: 'flashPoint', label: 'Flash point', required: false, hint: 'Required for flammable liquids.' },
    { key: 'emergency', label: 'Emergency contact (24h)', required: true, hint: '' },
    { key: 'revisionDate', label: 'Revision date', required: true, hint: 'Carriers reject sheets older than three years.' },
  ],
  EXPORT_PERMIT: [
    { key: 'permitNo', label: 'Permit number', required: true, hint: '' },
    { key: 'issuer', label: 'Issuing ministry or agency', required: true, hint: '' },
    { key: 'hsCode', label: 'HS codes covered', required: true, hint: '' },
    { key: 'quotaBalance', label: 'Quota / volume balance', required: false, hint: 'Where the permit is volume-capped, track what is left.' },
    { key: 'validity', label: 'Validity period', required: true, hint: 'The permit must be valid on the PEB registration date.' },
  ],
  LETTER_OF_CREDIT: [
    { key: 'lcNo', label: 'L/C number & issuing bank', required: true, hint: '' },
    { key: 'expiry', label: 'Expiry date & place', required: true, hint: '' },
    { key: 'latestShipment', label: 'Latest shipment date', required: true, hint: 'A rollover past this date breaks the credit.' },
    { key: 'presentation', label: 'Presentation period', required: true, hint: 'Usually 21 days after the on-board date.' },
    { key: 'docsRequired', label: 'Documents required', required: true, hint: 'List them on the job so nothing is discovered late.' },
    { key: 'partialTranship', label: 'Partial shipment / transhipment allowed', required: true, hint: 'Decides whether a split shipment is even possible.' },
  ],
  CONSIGNMENT_AGREEMENT: [
    { key: 'parties', label: 'Consignor & consignee', required: true, hint: '' },
    { key: 'titleRetention', label: 'Title retention clause', required: true, hint: 'Title stays with the consignor until sale.' },
    { key: 'settlementCycle', label: 'Settlement cycle', required: true, hint: 'Monthly or on sale — drives when we can invoice.' },
    { key: 'commission', label: 'Commission / margin split', required: true, hint: '' },
    { key: 'unsoldReturn', label: 'Treatment of unsold stock', required: true, hint: 'Return, markdown or destruction — agree it before shipping.' },
    { key: 'insurance', label: 'Who insures the stock at destination', required: true, hint: 'Commonly missed; the gap only shows after a loss.' },
  ],
  ARRIVAL_NOTICE: [
    { key: 'blRef', label: 'B/L reference', required: true, hint: '' },
    { key: 'eta', label: 'ETA & discharge terminal', required: true, hint: '' },
    { key: 'freeTime', label: 'Free time expiry', required: true, hint: 'The clock that turns into demurrage.' },
    { key: 'chargesDue', label: 'Charges due before release', required: true, hint: '' },
  ],
  DELIVERY_ORDER: [
    { key: 'doNo', label: 'D/O number & validity', required: true, hint: 'A D/O that expires before pick-up has to be re-issued.' },
    { key: 'blSurrender', label: 'B/L surrendered or telex released', required: true, hint: 'No release against an unsurrendered original.' },
    { key: 'releaseTo', label: 'Released to (party & vehicle)', required: true, hint: '' },
    { key: 'chargesSettled', label: 'Destination charges settled', required: true, hint: '' },
  ],
  PROOF_OF_DELIVERY: [
    { key: 'receivedBy', label: 'Received by (name & signature)', required: true, hint: '' },
    { key: 'deliveryDate', label: 'Delivery date & time', required: true, hint: '' },
    { key: 'condition', label: 'Condition on delivery', required: true, hint: 'Any exception must be noted here, not later.' },
    { key: 'packagesReceived', label: 'Packages received', required: true, hint: 'Counted against the packing list.' },
  ],
}

export const docFieldSpecs = (t: DocType): DocFieldSpec[] => DOC_FIELD_SPECS[t] ?? []

/* ---------- access control ---------- */

export const USER_ROLES: { value: UserRole; label: string; hint: string }[] = [
  { value: 'ADMIN', label: 'Administrator', hint: 'Everything, including company settings, numbering and user accounts.' },
  { value: 'OPERATIONS', label: 'Operations', hint: 'Jobs, containers, documents, services, incidents and tracking.' },
  { value: 'SALES', label: 'Sales', hint: 'Customers, quotations, packages and the pipeline.' },
  { value: 'FINANCE', label: 'Finance', hint: 'Charges, invoices, the ledger and financial reports.' },
  { value: 'WAREHOUSE', label: 'Warehouse', hint: 'Receipts, cargo intake and stuffing.' },
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
  allowedRegistrationDomains: ['meridianfreight.com', 'meridian-freight.com'],
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

/* ---------- the forwarder's own licences ---------- */

export const LICENCE_KINDS: { value: LicenceKind; label: string; hint: string }[] = [
  { value: 'FREIGHT_FORWARDING', label: 'Freight forwarding licence', hint: 'Permits us to trade as a forwarder (JPT / NIB scope).' },
  { value: 'CUSTOMS_BROKER', label: 'Customs broker (PPJK)', hint: 'Lets us file PEB and PIB in our own name.' },
  { value: 'NVOCC', label: 'NVOCC registration', hint: 'Required to issue our own house bills of lading.' },
  { value: 'IATA_AGENT', label: 'IATA cargo agent', hint: 'Air freight accreditation and the CASS settlement account.' },
  { value: 'AEO', label: 'Authorised Economic Operator', hint: 'Priority customs treatment and mutual recognition abroad.' },
  { value: 'BONDED_WAREHOUSE', label: 'Bonded warehouse licence', hint: 'Duty-suspended storage under customs supervision.' },
  { value: 'BUSINESS_REGISTRATION', label: 'Business registration', hint: 'The company’s base registration number.' },
  { value: 'TAX_REGISTRATION', label: 'Tax registration', hint: 'Taxable-entrepreneur status for issuing VAT invoices.' },
  { value: 'MEMBERSHIP', label: 'Association membership', hint: 'FIATA, ALFI and similar — often demanded by overseas agents.' },
]

export const licenceKindLabel = (k: LicenceKind) => LICENCE_KINDS.find((x) => x.value === k)?.label ?? k

/** Days before expiry at which a licence starts raising an exception. */
export const LICENCE_WARNING_DAYS = 60
