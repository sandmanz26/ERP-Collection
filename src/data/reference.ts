/**
 * Reference data — the constants a furniture works that imports actually runs on.
 * Duty rates, permit regimes, defect codes, kiln schedules and the shipment state
 * machine all live here so the rules in `src/lib` have one source to read from.
 */

import type {
  AccountType, AllocationBasis, CustomerSegment, CustomsLane, DefectCode, ExceptionKind, FinishFamily,
  ImportCostCode, ImportDocType, InspectionPoint, ItemType, KpiTargets, LartasType, PaymentInstrument,
  PermitKind, ProductCategory, QcPoint, ShipmentStatus, SupplierKind, UserRole, WarehouseKind,
  WorkCentreKind, WorkOrderStatus,
} from './types'

/* ==================================================================
   Geography and trade
   ================================================================== */

export const COUNTRIES = [
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
]

export const countryName = (code: string) => COUNTRIES.find((c) => c.code === code)?.name ?? code
export const countryFlag = (code: string) => COUNTRIES.find((c) => c.code === code)?.flag ?? '🏳️'

export const PORTS = [
  { code: 'IDSRG', name: 'Tanjung Emas, Semarang', country: 'ID' },
  { code: 'IDTPP', name: 'Tanjung Priok, Jakarta', country: 'ID' },
  { code: 'IDSUB', name: 'Tanjung Perak, Surabaya', country: 'ID' },
  { code: 'CNSHA', name: 'Shanghai', country: 'CN' },
  { code: 'CNNGB', name: 'Ningbo', country: 'CN' },
  { code: 'CNFOC', name: 'Fuzhou', country: 'CN' },
  { code: 'DEHAM', name: 'Hamburg', country: 'DE' },
  { code: 'NLRTM', name: 'Rotterdam', country: 'NL' },
  { code: 'USSAV', name: 'Savannah', country: 'US' },
  { code: 'USLGB', name: 'Long Beach', country: 'US' },
  { code: 'MYPKG', name: 'Port Klang', country: 'MY' },
  { code: 'THLCH', name: 'Laem Chabang', country: 'TH' },
  { code: 'VNSGN', name: 'Ho Chi Minh City', country: 'VN' },
  { code: 'SGSIN', name: 'Singapore', country: 'SG' },
  { code: 'ITGOA', name: 'Genoa', country: 'IT' },
]

export const portLabel = (code?: string) => {
  const p = PORTS.find((x) => x.code === code)
  return p ? `${p.name} (${p.code})` : (code ?? '—')
}

export const INCOTERM_HINTS: Record<string, string> = {
  EXW: 'We collect from the supplier’s door and pay everything after it.',
  FCA: 'Supplier hands over at their carrier; export clearance is theirs, freight is ours.',
  FOB: 'Supplier pays to get it on board; freight, insurance and duty are ours.',
  CFR: 'Supplier pays freight; insurance and duty are ours.',
  CIF: 'Supplier pays freight and insurance; duty and everything inland are ours.',
  CPT: 'Carriage paid to the named place; risk passes at first carrier.',
  CIP: 'Carriage and insurance paid; risk still passes at first carrier.',
  DAP: 'Delivered to us unloaded; import duty and clearance remain ours.',
  DDP: 'Delivered duty paid — the supplier carries the whole import.',
}

export const PAYMENT_INSTRUMENTS: { value: PaymentInstrument; label: string; hint: string }[] = [
  { value: 'TT_ADVANCE', label: 'T/T in advance', hint: 'Wire before production. Cheapest, and all the risk is ours.' },
  { value: 'TT_30', label: 'T/T 30 days', hint: 'Wire 30 days after B/L date.' },
  { value: 'TT_60', label: 'T/T 60 days', hint: 'Wire 60 days after B/L date.' },
  { value: 'LC_SIGHT', label: 'L/C at sight', hint: 'Bank pays on compliant documents. Costs a fee, removes the risk.' },
  { value: 'LC_USANCE_90', label: 'L/C usance 90 days', hint: 'Acceptance now, payment in 90 days — the working-capital instrument.' },
  { value: 'DP', label: 'Documents against payment', hint: 'The bank releases documents when we pay.' },
  { value: 'DA', label: 'Documents against acceptance', hint: 'Documents released on our acceptance of the draft.' },
  { value: 'OPEN_ACCOUNT', label: 'Open account', hint: 'Trust, earned over years. Local suppliers mostly.' },
]

export const paymentInstrumentLabel = (p: PaymentInstrument) =>
  PAYMENT_INSTRUMENTS.find((x) => x.value === p)?.label ?? p

/* ==================================================================
   Items, HS codes and the import regime
   ================================================================== */

export const ITEM_TYPES: { value: ItemType; label: string; local: string; hint: string }[] = [
  { value: 'SOLID_TIMBER', label: 'Solid timber', local: 'kayu solid', hint: 'Sawn hardwood. Cannot be issued until its kiln batch closes inside the moisture band.' },
  { value: 'PANEL', label: 'Panel board', local: 'papan olahan', hint: 'MDF, particle board, plywood, blockboard — the knock-down carcass material.' },
  { value: 'VENEER_LAMINATE', label: 'Veneer & laminate', local: 'veneer / HPL', hint: 'Decorative surface over panel: sliced veneer, HPL, melamine foil.' },
  { value: 'HARDWARE', label: 'Hardware', local: 'aksesoris', hint: 'Hinges, runners, lift systems, handles, connectors, castors.' },
  { value: 'FINISHING_CHEMICAL', label: 'Finishing chemical', local: 'bahan finishing', hint: 'Sealer, stain, lacquer, thinner, hardener. Toluene and xylene make these B2.' },
  { value: 'UPHOLSTERY', label: 'Upholstery', local: 'bahan jok', hint: 'Foam, webbing, fabric, leather, wadding.' },
  { value: 'PACKAGING', label: 'Packaging', local: 'kemasan', hint: 'Carton, corner board, EPE foam, stretch film, pallet.' },
  { value: 'CONSUMABLE', label: 'Consumable', local: 'bahan habis', hint: 'Abrasives, adhesive, screws, staples, masking.' },
  { value: 'GLASS_STONE', label: 'Glass & stone', local: 'kaca / batu', hint: 'Tempered glass, mirror, marble and sintered tops.' },
]

export const itemTypeMeta = (t: ItemType) => ITEM_TYPES.find((x) => x.value === t)
export const itemTypeLabel = (t: ItemType) => itemTypeMeta(t)?.label ?? t

/**
 * The permit regimes this shopping list runs into. Forestry products go through
 * SILK under SVLK; the solvent in the finishing line is a controlled hazardous
 * material and needs a producer-importer approval plus a surveyor's report on
 * every consignment.
 */
export const LARTAS_TYPES: {
  value: LartasType; label: string; authority: string; hint: string; requiresPerConsignment: boolean
}[] = [
  { value: 'NONE', label: 'Not restricted', authority: '—', hint: 'Ordinary import. Duty and PDRI only.', requiresPerConsignment: false },
  {
    value: 'DIPK', label: 'Forestry import declaration (DIPK)', authority: 'SILK — Kementerian Kehutanan',
    hint: 'A declaration naming exporter, country, species, wood origin, net weight and value, filed through the SILK portal under SVLK before the goods may be entered.',
    requiresPerConsignment: true,
  },
  {
    value: 'IP_B2', label: 'Hazardous material (IP-B2 + LS)', authority: 'Ditjen Daglu — Kemendag',
    hint: 'A producer-importer approval for B2 chemistry, and a Laporan Surveyor on every consignment. Toluene and xylene put most thinners here.',
    requiresPerConsignment: true,
  },
  {
    value: 'SNI', label: 'Mandatory SNI', authority: 'BSN / Kemenperin',
    hint: 'A product certificate against the Indonesian national standard, checked at entry.',
    requiresPerConsignment: false,
  },
  {
    value: 'DIPK_AND_SNI', label: 'DIPK + mandatory SNI', authority: 'SILK and BSN',
    hint: 'Both regimes apply — a forestry declaration for the consignment and a product certificate for the item.',
    requiresPerConsignment: true,
  },
]

export const lartasMeta = (t: LartasType) => LARTAS_TYPES.find((x) => x.value === t)!
export const lartasRequiresPermit = (t: LartasType) => t !== 'NONE'

/** Which permit kinds satisfy which regime. */
export const LARTAS_PERMITS: Record<LartasType, PermitKind[]> = {
  NONE: [],
  DIPK: ['DIPK'],
  IP_B2: ['IP_B2', 'LS_SURVEY'],
  SNI: ['SNI_CERT'],
  DIPK_AND_SNI: ['DIPK', 'SNI_CERT'],
}

export const PERMIT_KINDS: { value: PermitKind; label: string; authority: string; hint: string }[] = [
  { value: 'DIPK', label: 'Deklarasi Impor Produk Kehutanan', authority: 'SILK', hint: 'Per consignment. Names species and origin of the wood.' },
  { value: 'IP_B2', label: 'Importir Produsen B2', authority: 'Ditjen Daglu', hint: 'Annual approval to import hazardous material for our own production.' },
  { value: 'LS_SURVEY', label: 'Laporan Surveyor', authority: 'Appointed surveyor', hint: 'Per consignment inspection report for B2 goods.' },
  { value: 'SNI_CERT', label: 'Sertifikat SNI', authority: 'BSN / LSPro', hint: 'Product certificate against the mandatory national standard.' },
  { value: 'API_P', label: 'Angka Pengenal Importir Produsen', authority: 'OSS', hint: 'Producer importer identity. Without it PPh 22 is 7.5% instead of 2.5%.' },
  { value: 'NIB', label: 'Nomor Induk Berusaha', authority: 'OSS', hint: 'The company’s base business identity.' },
  { value: 'COO', label: 'Certificate of Origin', authority: 'Exporting chamber', hint: 'Form E, Form AK, IJEPA or ATIGA — what buys the preferential duty rate.' },
]

export const permitKindLabel = (k: PermitKind) => PERMIT_KINDS.find((x) => x.value === k)?.label ?? k

/** HS headings this works imports under, with the rates that apply to them. */
export const HS_CODES: {
  code: string; description: string; itemType: ItemType; mfn: number
  preferential?: number; scheme?: string; lartas: LartasType
}[] = [
  { code: '4407.99.90', description: 'Sawn hardwood, other species, over 6 mm', itemType: 'SOLID_TIMBER', mfn: 5, lartas: 'DIPK' },
  { code: '4407.11.00', description: 'Sawn coniferous timber, pine', itemType: 'SOLID_TIMBER', mfn: 5, lartas: 'DIPK' },
  { code: '4408.90.00', description: 'Sliced veneer sheets, other', itemType: 'VENEER_LAMINATE', mfn: 5, preferential: 0, scheme: 'ATIGA', lartas: 'DIPK' },
  { code: '4411.13.00', description: 'MDF, thickness over 5 mm but not over 9 mm', itemType: 'PANEL', mfn: 10, preferential: 0, scheme: 'ATIGA', lartas: 'DIPK_AND_SNI' },
  { code: '4411.14.00', description: 'MDF, thickness over 9 mm', itemType: 'PANEL', mfn: 10, preferential: 0, scheme: 'ATIGA', lartas: 'DIPK_AND_SNI' },
  { code: '4410.11.00', description: 'Particle board of wood', itemType: 'PANEL', mfn: 10, preferential: 0, scheme: 'ATIGA', lartas: 'DIPK' },
  { code: '4412.33.00', description: 'Plywood with at least one outer ply of non-coniferous wood', itemType: 'PANEL', mfn: 10, lartas: 'DIPK' },
  { code: '4823.90.99', description: 'High pressure laminate sheet', itemType: 'VENEER_LAMINATE', mfn: 10, preferential: 5, scheme: 'ACFTA', lartas: 'NONE' },
  { code: '8302.10.00', description: 'Hinges of base metal', itemType: 'HARDWARE', mfn: 12.5, preferential: 0, scheme: 'ACFTA', lartas: 'NONE' },
  { code: '8302.42.90', description: 'Mountings and fittings for furniture, other', itemType: 'HARDWARE', mfn: 12.5, preferential: 0, scheme: 'ACFTA', lartas: 'NONE' },
  { code: '8302.20.00', description: 'Castors with mountings of base metal', itemType: 'HARDWARE', mfn: 10, preferential: 0, scheme: 'ACFTA', lartas: 'NONE' },
  { code: '3208.20.90', description: 'Paints and varnishes based on acrylic polymers, other', itemType: 'FINISHING_CHEMICAL', mfn: 10, lartas: 'IP_B2' },
  { code: '3814.00.00', description: 'Organic composite solvents and thinners', itemType: 'FINISHING_CHEMICAL', mfn: 5, lartas: 'IP_B2' },
  { code: '3506.91.00', description: 'Adhesives based on polymers or rubber', itemType: 'CONSUMABLE', mfn: 5, preferential: 0, scheme: 'ATIGA', lartas: 'NONE' },
  { code: '3921.13.00', description: 'Cellular polyurethane foam sheet', itemType: 'UPHOLSTERY', mfn: 10, preferential: 0, scheme: 'ATIGA', lartas: 'NONE' },
  { code: '4107.11.00', description: 'Full grain bovine leather, unsplit', itemType: 'UPHOLSTERY', mfn: 10, lartas: 'NONE' },
  { code: '5407.61.90', description: 'Woven fabric of polyester filament, other', itemType: 'UPHOLSTERY', mfn: 15, preferential: 5, scheme: 'ACFTA', lartas: 'NONE' },
  { code: '6805.20.00', description: 'Abrasive powder on a base of paper or paperboard', itemType: 'CONSUMABLE', mfn: 10, lartas: 'NONE' },
  { code: '7005.29.90', description: 'Float glass, non-wired, other', itemType: 'GLASS_STONE', mfn: 15, preferential: 5, scheme: 'ACFTA', lartas: 'SNI' },
  { code: '4819.10.00', description: 'Cartons and cases of corrugated paper', itemType: 'PACKAGING', mfn: 12.5, lartas: 'NONE' },
]

export const hsMeta = (code: string) => HS_CODES.find((h) => h.code === code)

/** Timber species this works buys, with the traceability question each one raises. */
export const SPECIES = [
  { name: 'Jati (teak)', origin: 'ID', density: 660, note: 'Perhutani-sourced; SVLK chain of custody is the whole value.' },
  { name: 'Mahoni (mahogany)', origin: 'ID', density: 590, note: 'Community forest; DKP declaration from the supplier.' },
  { name: 'American white oak', origin: 'US', density: 755, note: 'Imported kiln-dried, but re-conditioned here for local humidity.' },
  { name: 'American black walnut', origin: 'US', density: 660, note: 'The premium line. Colour matching across a batch is the QC risk.' },
  { name: 'European ash', origin: 'DE', density: 710, note: 'Bends well; used for the seating frames.' },
  { name: 'Radiata pine', origin: 'NZ', density: 500, note: 'Cheap carcass and drawer sides. Moves badly if dried carelessly.' },
  { name: 'Sungkai', origin: 'ID', density: 630, note: 'Local, pale, takes stain unevenly — colour deviation shows up at final QC.' },
  { name: 'Akasia (acacia)', origin: 'ID', density: 640, note: 'Plantation grown, the outdoor line’s workhorse.' },
]

/* ==================================================================
   Products and finishing
   ================================================================== */

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string; hint: string }[] = [
  { value: 'CASE_GOODS', label: 'Case goods', hint: 'Wardrobes, sideboards, cabinets — panel-heavy and hardware-heavy.' },
  { value: 'SEATING', label: 'Seating', hint: 'Chairs and stools. Frame joinery is the quality risk.' },
  { value: 'TABLES', label: 'Tables', hint: 'Dining, coffee and desks. Top flatness and finish are everything.' },
  { value: 'UPHOLSTERY', label: 'Upholstery', hint: 'Sofas and armchairs. Foam and fabric dominate the cost.' },
  { value: 'OUTDOOR', label: 'Outdoor', hint: 'Acacia and teak, a wider moisture band and a weather-grade finish.' },
  { value: 'BEDS', label: 'Beds', hint: 'Headboards and frames — bulky to pack, awkward to ship.' },
  { value: 'COMPONENT', label: 'Sub-assembly', hint: 'A BOM node with its own routing: drawer boxes, door fronts, seat frames.' },
]

export const FINISH_FAMILIES: { value: FinishFamily; label: string; coats: number; cureHours: number; hint: string }[] = [
  { value: 'PU_MATT', label: 'PU matt', coats: 3, cureHours: 6, hint: 'Sealer, stain, two topcoats. The volume finish.' },
  { value: 'PU_GLOSS', label: 'PU gloss', coats: 4, cureHours: 10, hint: 'More coats, longer cure, and every dust nib shows.' },
  { value: 'NC_LACQUER', label: 'NC lacquer', coats: 3, cureHours: 3, hint: 'Fast, repairable, less durable. Thinner-heavy, so B2-heavy.' },
  { value: 'WATER_BASED', label: 'Water based', coats: 3, cureHours: 8, hint: 'What the European buyers ask for. Slower to cure in local humidity.' },
  { value: 'OIL_WAX', label: 'Oil & wax', coats: 2, cureHours: 24, hint: 'Outdoor and Scandinavian lines. Long cure, minimal booth time.' },
  { value: 'UV_PANEL', label: 'UV panel', coats: 1, cureHours: 0, hint: 'Cured on the line. Panel only.' },
  { value: 'RAW', label: 'Unfinished', coats: 0, cureHours: 0, hint: 'Component or knock-down part finished elsewhere.' },
]

export const finishMeta = (f: FinishFamily) => FINISH_FAMILIES.find((x) => x.value === f)!

/* ==================================================================
   Work centres, routings and production
   ================================================================== */

export const WORK_CENTRE_KINDS: { value: WorkCentreKind; label: string; local: string; hint: string }[] = [
  { value: 'KILN', label: 'Kiln drying', local: 'pengeringan', hint: 'Chambers. Days, not hours — and the gate no timber gets past wet.' },
  { value: 'ROUGH_MILL', label: 'Rough mill', local: 'pemotongan', hint: 'Cross-cut, rip, glue-up. Where the timber yield is won or lost.' },
  { value: 'MACHINING', label: 'Machining', local: 'pembentukan', hint: 'Moulder, CNC, tenoner, boring. Component forming.' },
  { value: 'SANDING', label: 'Sanding', local: 'pengamplasan', hint: 'Wide-belt and hand. Thickness after sanding is an in-process check.' },
  { value: 'ASSEMBLY', label: 'Assembly', local: 'perakitan', hint: 'Joints and clamping. Weak here and the piece fails at the customer.' },
  { value: 'FINISHING', label: 'Finishing', local: 'finishing', hint: 'Spray booth plus cure. The bottleneck, nearly always.' },
  { value: 'UPHOLSTERY', label: 'Upholstery', local: 'jok', hint: 'Foam, webbing and cover. Skilled and hard to flex.' },
  { value: 'PACKING', label: 'Packing', local: 'pengepakan', hint: 'Carton, corner protection, label, palletise.' },
  { value: 'SUBCONTRACT', label: 'Subcontract', local: 'makloon', hint: 'Work that leaves the building — carving, polishing, plating — and has to come back.' },
]

export const workCentreKindLabel = (k: WorkCentreKind) => WORK_CENTRE_KINDS.find((x) => x.value === k)?.label ?? k

export const WORK_ORDER_STATUSES: { value: WorkOrderStatus; label: string; open: boolean; tone: string }[] = [
  { value: 'PLANNED', label: 'Planned', open: true, tone: 'neutral' },
  { value: 'FIRM', label: 'Firm', open: true, tone: 'info' },
  { value: 'RELEASED', label: 'Released', open: true, tone: 'primary' },
  { value: 'IN_PROGRESS', label: 'In progress', open: true, tone: 'accent' },
  { value: 'ON_HOLD', label: 'On hold', open: true, tone: 'warning' },
  { value: 'COMPLETED', label: 'Completed', open: false, tone: 'success' },
  { value: 'CLOSED', label: 'Closed', open: false, tone: 'success' },
  { value: 'CANCELLED', label: 'Cancelled', open: false, tone: 'danger' },
]

export const workOrderIsOpen = (s: WorkOrderStatus) => WORK_ORDER_STATUSES.find((x) => x.value === s)?.open ?? true

export const INSPECTION_POINTS: { value: InspectionPoint; label: string }[] = [
  { value: 'NONE', label: 'No inspection' },
  { value: 'INCOMING', label: 'Incoming inspection' },
  { value: 'IN_PROCESS', label: 'In-process check' },
  { value: 'FINAL', label: 'Final inspection' },
]

/* ==================================================================
   Kiln
   ================================================================== */

/** Drying schedules by species and thickness — days is what the plan cares about. */
export const KILN_SCHEDULES = [
  { code: 'T10-25', species: 'Jati (teak)', thicknessMm: 25, days: 12, targetMin: 8, targetMax: 12 },
  { code: 'T10-45', species: 'Jati (teak)', thicknessMm: 45, days: 18, targetMin: 8, targetMax: 12 },
  { code: 'M8-25', species: 'Mahoni (mahogany)', thicknessMm: 25, days: 10, targetMin: 8, targetMax: 12 },
  { code: 'OAK-26', species: 'American white oak', thicknessMm: 26, days: 14, targetMin: 8, targetMax: 12 },
  { code: 'WAL-26', species: 'American black walnut', thicknessMm: 26, days: 13, targetMin: 8, targetMax: 12 },
  { code: 'ASH-32', species: 'European ash', thicknessMm: 32, days: 15, targetMin: 8, targetMax: 12 },
  { code: 'PIN-25', species: 'Radiata pine', thicknessMm: 25, days: 7, targetMin: 8, targetMax: 12 },
  { code: 'AKA-30', species: 'Akasia (acacia)', thicknessMm: 30, days: 11, targetMin: 12, targetMax: 15 },
  { code: 'SUN-25', species: 'Sungkai', thicknessMm: 25, days: 9, targetMin: 8, targetMax: 12 },
]

export const kilnSchedule = (code: string) => KILN_SCHEDULES.find((k) => k.code === code)

/** Indoor pieces move if the wood is wet; outdoor pieces crack if it is too dry. */
export const MOISTURE_BANDS = {
  INDOOR: { min: 8, max: 12, note: 'Indoor furniture in an air-conditioned home. Above 12% the joints open within a year.' },
  OUTDOOR: { min: 12, max: 15, note: 'Outdoor furniture. Dried below 12% it takes up moisture and swells in the first wet season.' },
}

/* ==================================================================
   Quality
   ================================================================== */

export const QC_POINTS: { value: QcPoint; label: string; hint: string }[] = [
  { value: 'INCOMING', label: 'Incoming', hint: 'On goods receipt: moisture, dimension, colour match against the master panel, hardware function.' },
  { value: 'IN_PROCESS', label: 'In process', hint: 'Between operations: squareness, joint gap, thickness after sanding.' },
  { value: 'FINAL', label: 'Final', hint: 'Before packing: finishing defects, hardware operation, colour against the approved sample.' },
]

export const DEFECT_CODES: {
  value: DefectCode; label: string; point: QcPoint; typicalCause: string; typicalDisposition: string
}[] = [
  { value: 'MOISTURE_OUT_OF_BAND', label: 'Moisture out of band', point: 'INCOMING', typicalCause: 'Kiln schedule cut short, or the lot re-absorbed in the yard.', typicalDisposition: 'Re-dry — the lot stays blocked.' },
  { value: 'DIMENSION_OUT_OF_TOLERANCE', label: 'Dimension out of tolerance', point: 'INCOMING', typicalCause: 'Supplier sawing tolerance, or panel thickness variation.', typicalDisposition: 'Accept with rework allowance, or claim.' },
  { value: 'COLOUR_MISMATCH', label: 'Colour mismatch', point: 'INCOMING', typicalCause: 'Veneer from a different log or flitch.', typicalDisposition: 'Segregate by batch so one piece is never mixed.' },
  { value: 'HARDWARE_FUNCTION', label: 'Hardware fails function test', point: 'INCOMING', typicalCause: 'Counterfeit or B-grade runners in an unbranded carton.', typicalDisposition: 'Return to supplier.' },
  { value: 'WARP_TWIST', label: 'Warp or twist', point: 'INCOMING', typicalCause: 'Stacked without stickers, or dried too fast.', typicalDisposition: 'Downgrade to short components.' },
  { value: 'INSECT_DAMAGE', label: 'Insect damage', point: 'INCOMING', typicalCause: 'Untreated timber, or storage in a damp yard.', typicalDisposition: 'Scrap and fumigate the yard.' },
  { value: 'DELAMINATION', label: 'Delamination', point: 'INCOMING', typicalCause: 'Panel pressed with cold glue or over-humid core.', typicalDisposition: 'Return to supplier.' },
  { value: 'JOINT_GAP', label: 'Joint gap', point: 'IN_PROCESS', typicalCause: 'Tenon fit, or clamping pressure released too early.', typicalDisposition: 'Rework at assembly.' },
  { value: 'OUT_OF_SQUARE', label: 'Out of square', point: 'IN_PROCESS', typicalCause: 'Assembly jig drift.', typicalDisposition: 'Rework; re-set the jig.' },
  { value: 'THICKNESS_AFTER_SANDING', label: 'Thickness after sanding', point: 'IN_PROCESS', typicalCause: 'Wide-belt set too aggressive; the veneer is sanded through.', typicalDisposition: 'Scrap the panel.' },
  { value: 'GLUE_SQUEEZE_OUT', label: 'Glue squeeze-out', point: 'IN_PROCESS', typicalCause: 'Too much adhesive; it seals the grain and the stain will not take.', typicalDisposition: 'Rework — sand back before finishing.' },
  { value: 'TEAR_OUT', label: 'Tear-out at machining', point: 'IN_PROCESS', typicalCause: 'Blunt tooling or feeding against the grain.', typicalDisposition: 'Rework or scrap the component.' },
  { value: 'ORANGE_PEEL', label: 'Orange peel', point: 'FINAL', typicalCause: 'Viscosity too high or gun pressure too low.', typicalDisposition: 'Flat back and recoat.' },
  { value: 'SAGGING_RUN', label: 'Sagging or run', point: 'FINAL', typicalCause: 'Coat applied too heavy on a vertical face.', typicalDisposition: 'Flat back and recoat.' },
  { value: 'DUST_NIB', label: 'Dust nib', point: 'FINAL', typicalCause: 'Booth filters overdue, or traffic through the drying area.', typicalDisposition: 'Denib and polish.' },
  { value: 'FISH_EYE', label: 'Fish eye', point: 'FINAL', typicalCause: 'Silicone or oil contamination in the air line.', typicalDisposition: 'Strip and refinish — the expensive one.' },
  { value: 'COLOUR_DEVIATION', label: 'Colour deviation', point: 'FINAL', typicalCause: 'Stain batch difference, or an uneven-taking species like sungkai.', typicalDisposition: 'Re-stain, or downgrade to a second-line channel.' },
  { value: 'SHEEN_UNEVEN', label: 'Uneven sheen', point: 'FINAL', typicalCause: 'Topcoat not stirred, or overlap of a partially cured film.', typicalDisposition: 'Recoat the whole face.' },
  { value: 'MISSING_HARDWARE', label: 'Missing hardware', point: 'FINAL', typicalCause: 'Fitting pack short at packing.', typicalDisposition: 'Complete before dispatch.' },
  { value: 'SCRATCH_DENT', label: 'Scratch or dent', point: 'FINAL', typicalCause: 'Handling between finishing and packing.', typicalDisposition: 'Touch up, or refinish the face.' },
  { value: 'PACKAGING_DAMAGE', label: 'Packaging damage', point: 'FINAL', typicalCause: 'Carton crushed in the finished-goods store.', typicalDisposition: 'Repack.' },
]

export const defectMeta = (c: DefectCode) => DEFECT_CODES.find((d) => d.value === c)
export const defectLabel = (c: DefectCode) => defectMeta(c)?.label ?? c

/* ==================================================================
   Import: the state machine, the lanes, the costs
   ================================================================== */

export const SHIPMENT_STATES: {
  value: ShipmentStatus; label: string; short: string; gate: string; open: boolean
}[] = [
  { value: 'PLANNED', label: 'Planned', short: 'Plan', gate: 'An approved purchase order exists.', open: true },
  { value: 'PERMIT_PENDING', label: 'Awaiting permits', short: 'Permit', gate: 'Every LARTAS permit the lines need is on file, matches their HS codes and does not expire before arrival.', open: true },
  { value: 'ORDERED', label: 'Ordered', short: 'Order', gate: 'Proforma confirmed and the payment instrument opened.', open: true },
  { value: 'IN_PRODUCTION', label: 'In production at supplier', short: 'Making', gate: 'The supplier’s ready date is recorded — the ETA is built from it.', open: true },
  { value: 'BOOKED', label: 'Booked', short: 'Booked', gate: 'Vessel, voyage, ETD, ETA and free time recorded.', open: true },
  { value: 'ON_WATER', label: 'On the water', short: 'Sailing', gate: 'B/L issued. The ETA is now the date every plan hangs on.', open: true },
  { value: 'ARRIVED', label: 'Arrived', short: 'Arrived', gate: 'Discharged. The free-time clock is running from here.', open: true },
  { value: 'PIB_SUBMITTED', label: 'PIB submitted', short: 'PIB', gate: 'Every mandatory document present, duty and PDRI self-assessed and paid.', open: true },
  { value: 'LANE_ASSIGNED', label: 'Lane assigned', short: 'Lane', gate: 'Hijau, kuning or merah — each with its own expected days.', open: true },
  { value: 'CLEARED', label: 'Cleared', short: 'SPPB', gate: 'SPPB issued; the goods may leave the port.', open: true },
  { value: 'RECEIVED', label: 'Received', short: 'Received', gate: 'Trucked, receipted, incoming QC done and the landed cost finalised.', open: false },
  { value: 'CANCELLED', label: 'Cancelled', short: 'Cancelled', gate: '—', open: false },
]

export const shipmentStateIndex = (s: ShipmentStatus) => SHIPMENT_STATES.findIndex((x) => x.value === s)
export const shipmentStateMeta = (s: ShipmentStatus) => SHIPMENT_STATES.find((x) => x.value === s)
export const shipmentIsOpen = (s: ShipmentStatus) => shipmentStateMeta(s)?.open ?? true

export const CUSTOMS_LANES: {
  value: CustomsLane; label: string; local: string; tone: string; expectedDays: number; hint: string
}[] = [
  { value: 'PENDING', label: 'Not yet assigned', local: '—', tone: 'neutral', expectedDays: 0, hint: 'The PIB has not been channelled yet.' },
  { value: 'GREEN', label: 'Green', local: 'jalur hijau', tone: 'success', expectedDays: 1, hint: 'No inspection. SPPB follows payment almost immediately.' },
  { value: 'YELLOW', label: 'Yellow', local: 'jalur kuning', tone: 'warning', expectedDays: 4, hint: 'Document examination. Any discrepancy in the invoice, packing list or COO stops it here.' },
  { value: 'RED', label: 'Red', local: 'jalur merah', tone: 'danger', expectedDays: 9, hint: 'Physical inspection. The container is moved, opened and tallied — and the free time keeps running.' },
]

export const laneMeta = (l: CustomsLane) => CUSTOMS_LANES.find((x) => x.value === l)!
export const laneExpectedDays = (l: CustomsLane) => laneMeta(l).expectedDays

export const CUSTOMS_OFFICES = [
  { code: '040300', name: 'KPPBC Tanjung Emas, Semarang' },
  { code: '051000', name: 'KPPBC Tanjung Priok, Jakarta' },
  { code: '070300', name: 'KPPBC Tanjung Perak, Surabaya' },
]

/** Documents a PIB cannot be submitted without, and the ones that only sometimes apply. */
export const IMPORT_DOC_TYPES: {
  value: ImportDocType; label: string; mandatory: boolean; hint: string
}[] = [
  { value: 'COMMERCIAL_INVOICE', label: 'Commercial invoice', mandatory: true, hint: 'The customs value starts here. A discrepancy against the packing list is the commonest yellow-lane hold.' },
  { value: 'PACKING_LIST', label: 'Packing list', mandatory: true, hint: 'Gross and net weight per package, which is what a red-lane tally is checked against.' },
  { value: 'BILL_OF_LADING', label: 'Bill of lading', mandatory: true, hint: 'Title to the goods; the original or a telex release is needed to take delivery.' },
  { value: 'COO', label: 'Certificate of origin', mandatory: false, hint: 'Form E, Form AK, IJEPA or ATIGA. Without it the preferential rate is lost and duty reverts to MFN.' },
  { value: 'INSURANCE_CERT', label: 'Insurance certificate', mandatory: true, hint: 'Part of the CIF customs value where the Incoterm does not already include it.' },
  { value: 'PERMIT', label: 'Import permit (LARTAS)', mandatory: false, hint: 'DIPK, IP-B2 or an SNI certificate, depending on what is in the box.' },
  { value: 'SURVEY_REPORT', label: 'Laporan Surveyor', mandatory: false, hint: 'Required on every B2 consignment.' },
  { value: 'MSDS', label: 'Material safety data sheet', mandatory: false, hint: 'Chemistry only. Also what the yard needs before it will store it.' },
  { value: 'FUMIGATION_CERT', label: 'Fumigation certificate', mandatory: false, hint: 'Solid wood packing material, under ISPM-15.' },
  { value: 'PIB', label: 'PIB (BC 2.0)', mandatory: true, hint: 'The declaration itself, filed through CEISA 4.0 with duty and PDRI self-assessed.' },
  { value: 'SPPB', label: 'SPPB', mandatory: false, hint: 'The release order. It exists only after the lane has been satisfied.' },
  { value: 'PAYMENT_PROOF', label: 'Proof of duty payment', mandatory: true, hint: 'The bank receipt for BM, PPN and PPh 22.' },
]

export const importDocLabel = (t: ImportDocType) => IMPORT_DOC_TYPES.find((x) => x.value === t)?.label ?? t

export const IMPORT_COST_CODES: {
  value: ImportCostCode; label: string; basis: AllocationBasis; creditable: boolean; inLandedCost: boolean; hint: string
}[] = [
  { value: 'GOODS', label: 'Goods value (FOB)', basis: 'DIRECT', creditable: false, inLandedCost: true, hint: 'What the supplier invoiced, before anything else.' },
  { value: 'FREIGHT', label: 'Ocean freight', basis: 'VOLUME', creditable: false, inLandedCost: true, hint: 'Spread by volume — a container is sold by the box, but consumed by the cubic metre.' },
  { value: 'INSURANCE', label: 'Marine insurance', basis: 'CUSTOMS_VALUE', creditable: false, inLandedCost: true, hint: 'Premium on the insured value; part of CIF.' },
  { value: 'DUTY', label: 'Bea masuk', basis: 'CUSTOMS_VALUE', creditable: false, inLandedCost: true, hint: 'Per-line HS rate on the customs value. Real cost — it never comes back.' },
  { value: 'PPN', label: 'PPN impor', basis: 'CUSTOMS_VALUE', creditable: true, inLandedCost: false, hint: 'Creditable input VAT. Putting it in inventory over-states material cost by 11%.' },
  { value: 'PPH22', label: 'PPh 22 impor', basis: 'CUSTOMS_VALUE', creditable: true, inLandedCost: false, hint: 'A prepayment of corporate income tax, not a cost. 2.5% with an API, 7.5% without.' },
  { value: 'CLEARANCE_FEE', label: 'Clearance & PPJK fee', basis: 'CUSTOMS_VALUE', creditable: false, inLandedCost: true, hint: 'The broker’s handling of the PIB.' },
  { value: 'THC', label: 'Terminal handling', basis: 'QUANTITY', creditable: false, inLandedCost: true, hint: 'Charged per container at the discharge terminal.' },
  { value: 'INLAND_TRUCKING', label: 'Inland trucking', basis: 'GROSS_WEIGHT', creditable: false, inLandedCost: true, hint: 'Port to factory. Weight is what the haulier prices.' },
  { value: 'STORAGE', label: 'Port storage', basis: 'GROSS_WEIGHT', creditable: false, inLandedCost: true, hint: 'Charged once the free storage period lapses.' },
  { value: 'DEMURRAGE', label: 'Demurrage', basis: 'GROSS_WEIGHT', creditable: false, inLandedCost: true, hint: 'Container held at the terminal past free time. Pure loss, and always someone’s decision.' },
  { value: 'DETENTION', label: 'Detention', basis: 'GROSS_WEIGHT', creditable: false, inLandedCost: true, hint: 'Empty returned late to the depot.' },
  { value: 'SURVEY', label: 'Surveyor fee', basis: 'CUSTOMS_VALUE', creditable: false, inLandedCost: true, hint: 'The Laporan Surveyor on a B2 consignment.' },
  { value: 'PERMIT_FEE', label: 'Permit fee', basis: 'CUSTOMS_VALUE', creditable: false, inLandedCost: true, hint: 'Filing the DIPK or renewing the IP-B2.' },
  { value: 'BANK_CHARGE', label: 'Bank & L/C charges', basis: 'CUSTOMS_VALUE', creditable: false, inLandedCost: true, hint: 'Opening commission, amendment fees, telex.' },
  { value: 'OTHER', label: 'Other', basis: 'CUSTOMS_VALUE', creditable: false, inLandedCost: true, hint: 'Anything the shipment caused that has nowhere else to go.' },
]

export const importCostMeta = (c: ImportCostCode) => IMPORT_COST_CODES.find((x) => x.value === c)!
export const importCostLabel = (c: ImportCostCode) => importCostMeta(c).label

export const ALLOCATION_BASES: { value: AllocationBasis; label: string; hint: string }[] = [
  { value: 'CUSTOMS_VALUE', label: 'By customs value', hint: 'The expensive lines carry more of it. Right for anything priced on value.' },
  { value: 'GROSS_WEIGHT', label: 'By gross weight', hint: 'Right for trucking and handling — a haulier does not care what it is worth.' },
  { value: 'VOLUME', label: 'By volume', hint: 'Right for ocean freight. A container is bought by the box and consumed by the cubic metre.' },
  { value: 'QUANTITY', label: 'By quantity', hint: 'Flat per unit. Rarely correct, but honest for per-container charges split evenly.' },
  { value: 'DIRECT', label: 'Direct to the line', hint: 'Already known per line; nothing to spread.' },
]

/* ==================================================================
   Finance
   ================================================================== */

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; group: 'BALANCE_SHEET' | 'INCOME_STATEMENT' }> = {
  ASSET: { label: 'Asset', group: 'BALANCE_SHEET' },
  LIABILITY: { label: 'Liability', group: 'BALANCE_SHEET' },
  EQUITY: { label: 'Equity', group: 'BALANCE_SHEET' },
  REVENUE: { label: 'Revenue', group: 'INCOME_STATEMENT' },
  COGS: { label: 'Cost of goods sold', group: 'INCOME_STATEMENT' },
  EXPENSE: { label: 'Operating expense', group: 'INCOME_STATEMENT' },
}

/** Spot rates — what an invoice is actually settled at. */
export const FX_RATES: Record<string, number> = { IDR: 1, USD: 16480, EUR: 17920, CNY: 2285, SGD: 12240, JPY: 110, MYR: 3720 }

/**
 * NDPBM — the Minister of Finance rate used to compute duty and PDRI on the PIB
 * date. Deliberately not the spot rate: the gap between the two is a real
 * variance that lands on the shipment.
 */
export const NDPBM_RATES: Record<string, number> = { IDR: 1, USD: 16310, EUR: 17740, CNY: 2261, SGD: 12115, JPY: 108.6, MYR: 3684 }

export const CUSTOMER_SEGMENTS: { value: CustomerSegment; label: string; hint: string }[] = [
  { value: 'RETAIL_CHAIN', label: 'Retail chain', hint: 'Repeat programmes, forecast-driven, unforgiving on delivery windows.' },
  { value: 'CONTRACT_FFE', label: 'Contract / FF&E', hint: 'Hotel and office fit-out. Big, dated, and carrying a penalty clause.' },
  { value: 'EXPORT', label: 'Export', hint: 'Overseas buyers. Species and legality documentation matter as much as the piece.' },
  { value: 'ECOMMERCE', label: 'E-commerce', hint: 'Small orders against stock, packed to survive a courier.' },
  { value: 'DEALER', label: 'Dealer', hint: 'Independent stores buying at a trade discount.' },
]

export const customerSegmentLabel = (s: CustomerSegment) => CUSTOMER_SEGMENTS.find((x) => x.value === s)?.label ?? s

export const WAREHOUSE_KINDS: { value: WarehouseKind; label: string; hint: string }[] = [
  { value: 'RAW_MATERIAL', label: 'Raw material store', hint: 'Panels, hardware, chemistry, upholstery.' },
  { value: 'KILN_YARD', label: 'Kiln yard', hint: 'Green and drying timber. Nothing here may be issued.' },
  { value: 'WIP', label: 'Work in progress', hint: 'Between operations, on the floor.' },
  { value: 'FINISHED_GOODS', label: 'Finished goods', hint: 'Packed and awaiting dispatch.' },
  { value: 'BONDED', label: 'Bonded store', hint: 'Duty-suspended, under customs supervision.' },
  { value: 'QUARANTINE', label: 'Quarantine', hint: 'Received but not yet passed by incoming QC.' },
]

export const SUPPLIER_KINDS: { value: SupplierKind; label: string }[] = [
  { value: 'LOCAL', label: 'Local' },
  { value: 'OVERSEAS', label: 'Overseas' },
]

/* ==================================================================
   Exceptions
   ================================================================== */

export const EXCEPTION_META: Record<ExceptionKind, { label: string; group: string }> = {
  MATERIAL_SHORTAGE: { label: 'Material shortage', group: 'Planning' },
  IMPORT_LATE: { label: 'Import running late', group: 'Import' },
  PERMIT_EXPIRING: { label: 'Permit expiring', group: 'Import' },
  PERMIT_MISSING: { label: 'Permit missing', group: 'Import' },
  DEMURRAGE_ACCRUING: { label: 'Demurrage accruing', group: 'Import' },
  FREE_TIME_ENDING: { label: 'Free time ending', group: 'Import' },
  PIB_INCOMPLETE: { label: 'PIB incomplete', group: 'Import' },
  COO_MISSING: { label: 'Certificate of origin missing', group: 'Import' },
  KILN_OUT_OF_BAND: { label: 'Kiln batch out of band', group: 'Production' },
  CAPACITY_OVERLOAD: { label: 'Work centre overloaded', group: 'Planning' },
  QC_FAILURE: { label: 'Quality failure', group: 'Quality' },
  COST_VARIANCE: { label: 'Cost variance', group: 'Finance' },
  ORDER_AT_RISK: { label: 'Order at risk', group: 'Commercial' },
  CREDIT_LIMIT: { label: 'Credit limit exceeded', group: 'Commercial' },
  DEPOSIT_MISSING: { label: 'Deposit not received', group: 'Commercial' },
  COST_NOT_FINALISED: { label: 'Landed cost still provisional', group: 'Finance' },
  REORDER_POINT: { label: 'Below reorder point', group: 'Planning' },
  LICENCE_EXPIRING: { label: 'Company licence expiring', group: 'Compliance' },
}

export const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const

/* ==================================================================
   Targets, users, policy
   ================================================================== */

export const KPI_TARGETS_DEFAULT: KpiTargets = {
  onTimeDeliveryPercent: 94,
  firstPassYieldPercent: 92,
  scrapRatePercent: 3,
  materialYieldPercent: 68,
  workCentreUtilisationPercent: 82,
  importLeadDays: 52,
  clearanceDaysGreen: 1,
  clearanceDaysYellow: 4,
  clearanceDaysRed: 9,
  grossMarginPercent: 32,
}

export const USER_ROLES: { value: UserRole; label: string; hint: string }[] = [
  { value: 'ADMIN', label: 'Administrator', hint: 'Everything, including settings, numbering and user accounts.' },
  { value: 'DIRECTOR', label: 'Direktur Operasi', hint: 'The Control Tower and every report beneath it.' },
  { value: 'PPIC', label: 'PPIC planner', hint: 'Master schedule, MRP, capacity and work-order release.' },
  { value: 'PURCHASING', label: 'Purchasing & import', hint: 'Suppliers, purchase orders, shipments, permits and customs.' },
  { value: 'PRODUCTION', label: 'Kepala produksi', hint: 'Shop floor, work orders and the kiln.' },
  { value: 'QC', label: 'Quality control', hint: 'Inspections, defects and dispositions.' },
  { value: 'WAREHOUSE', label: 'Gudang', hint: 'Receipts, issues, transfers and stock counts.' },
  { value: 'SALES', label: 'Sales', hint: 'Customers, orders and the promise date.' },
  { value: 'FINANCE', label: 'Finance', hint: 'Costing, landed cost, invoices and the ledger.' },
  { value: 'VIEWER', label: 'Viewer', hint: 'Read-only across the suite.' },
]

export const roleLabel = (r: UserRole) => USER_ROLES.find((x) => x.value === r)?.label ?? r

export const ACCOUNT_STATUSES: { value: string; label: string; tone: string; hint: string }[] = [
  { value: 'ACTIVE', label: 'Active', tone: 'success', hint: 'Can sign in normally.' },
  { value: 'PENDING_VERIFICATION', label: 'Pending verification', tone: 'warning', hint: 'Registered but the email link has not been opened.' },
  { value: 'INVITED', label: 'Invited', tone: 'info', hint: 'Invitation sent; the account has never been used.' },
  { value: 'LOCKED', label: 'Locked', tone: 'danger', hint: 'Too many failed sign-in attempts. Unlocks on a timer or by an administrator.' },
  { value: 'SUSPENDED', label: 'Suspended', tone: 'danger', hint: 'Disabled by an administrator — sign-in is refused regardless of the password.' },
]

export const AUTH_POLICY = {
  maxFailedAttempts: 5,
  lockMinutes: 15,
  minPasswordLength: 10,
  resetTokenMinutes: 30,
  allowedRegistrationDomains: ['wanakarya.co.id', 'candrawana.co.id'],
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

export const LICENCE_WARNING_DAYS = 60
