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

export const TEAM = ['Rina Wulandari', 'Ahmad Fauzi', 'Dewi Kartika', 'Bagus Prasetyo', 'Siti Nurhaliza', 'Yoga Pratama']

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
