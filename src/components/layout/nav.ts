import {
  Banknote, BarChart3, BookOpen, Boxes, Building2, CalendarRange, ClipboardCheck, ClipboardList,
  Combine, Container, Factory, FileSpreadsheet, FileText, Flame, Gauge, GitBranch, HandCoins,
  Handshake, Layers, LineChart, Package, PackageSearch, Receipt, Route, Settings, ShieldCheck,
  Ship, ShoppingCart, Stamp, Truck, Undo2, Warehouse, Wallet, Workflow, Wrench, Recycle,
  ClipboardPen, PackageCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  badgeKey?:
    | 'exceptions' | 'shortages' | 'workOrders' | 'imports' | 'customs' | 'qc' | 'kiln'
    | 'orders' | 'overdue' | 'capacity' | 'quotations' | 'deliveries' | 'claims'
    | 'requisitions' | 'maintenance' | 'subcontract' | 'payments' | 'conversion' | 'remnants'
    | 'receiving' | 'reporting'
  description?: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    label: 'Control',
    items: [
      { to: '/', label: 'Control Tower', icon: Gauge, badgeKey: 'exceptions', description: 'Three clocks, every exception, ranked by money' },
      { to: '/flow', label: 'Material Flow', icon: Workflow, description: 'Where the value is standing, from the water to the gate' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/quotations', label: 'Quotations', icon: FileText, badgeKey: 'quotations', description: 'The pipeline, weighted, and why we lose' },
      { to: '/orders', label: 'Sales Orders', icon: ShoppingCart, badgeKey: 'orders', description: 'The order book and the honest promise date' },
      { to: '/deliveries', label: 'Deliveries & Packing', icon: Container, badgeKey: 'deliveries', description: 'Surat jalan, packing list and container fill' },
      { to: '/claims', label: 'Returns & Claims', icon: Undo2, badgeKey: 'claims', description: 'What comes back, who pays and what it costs' },
      { to: '/customers', label: 'Customers', icon: Building2, description: 'Retail, contract, dealer and export' },
    ],
  },
  {
    label: 'Engineering',
    items: [
      { to: '/products', label: 'Products', icon: Package, description: 'Catalogue, standard cost, margin at list' },
      { to: '/bom', label: 'Bills of Material', icon: GitBranch, description: 'Multi-level tree, yield, alternates, where-used' },
      { to: '/routings', label: 'Routings & Work Centres', icon: Route, badgeKey: 'capacity', description: 'Operations, rates and the bottleneck' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { to: '/planning', label: 'Master Schedule', icon: CalendarRange, description: 'Demand against capacity, week by week' },
      { to: '/mrp', label: 'MRP Run', icon: Combine, badgeKey: 'shortages', description: 'Netting, shortages with dates and causes' },
      { to: '/capacity', label: 'Capacity & Load', icon: Layers, badgeKey: 'capacity', description: 'Load per work centre per fortnight' },
    ],
  },
  {
    label: 'Production',
    items: [
      { to: '/work-orders', label: 'Work Orders', icon: Factory, badgeKey: 'workOrders', description: 'Release, progress by operation, cost' },
      { to: '/shopfloor', label: 'Shop Floor', icon: ClipboardCheck, description: 'One board per work centre' },
      { to: '/reporting', label: 'Production Reporting', icon: ClipboardPen, badgeKey: 'reporting', description: 'Lapor produksi — output, scrap, hours, returns' },
      { to: '/kiln', label: 'Kiln Drying', icon: Flame, badgeKey: 'kiln', description: 'Batches, readings and the moisture gate' },
      { to: '/subcontract', label: 'Subcontracting', icon: Handshake, badgeKey: 'subcontract', description: 'Work that left the building, and the value with it' },
      { to: '/maintenance', label: 'Maintenance', icon: Wrench, badgeKey: 'maintenance', description: 'Downtime the plan has to net off before it promises' },
      { to: '/quality', label: 'Quality', icon: ShieldCheck, badgeKey: 'qc', description: 'Inspections, defect Pareto, dispositions' },
    ],
  },
  {
    label: 'Materials & Import',
    items: [
      { to: '/items', label: 'Item Master', icon: Boxes, description: 'Every material with its import identity' },
      { to: '/inventory', label: 'Inventory & Lots', icon: Warehouse, description: 'On hand, reserved, blocked, traceability' },
      { to: '/conversion', label: 'Material Conversion', icon: Layers, badgeKey: 'conversion', description: 'Raw into semi-finished, ours or theirs' },
      { to: '/remnants', label: 'Offcuts & Remnants', icon: Recycle, badgeKey: 'remnants', description: 'Bahan sisa — already cut, already paid for' },
      { to: '/suppliers', label: 'Suppliers', icon: Truck, description: 'Scorecards and lane history' },
      { to: '/requisitions', label: 'Requisitions', icon: ClipboardList, badgeKey: 'requisitions', description: 'The ask, the ladder and the days it costs' },
      { to: '/purchasing', label: 'Purchase Orders', icon: PackageSearch, description: 'Local and import, with the LARTAS gate' },
      { to: '/receiving', label: 'Goods Receipt', icon: PackageCheck, badgeKey: 'receiving', description: 'Penerimaan barang — count, inspect, put away' },
      { to: '/imports', label: 'Import Shipments', icon: Ship, badgeKey: 'imports', description: 'Eleven states, free time, demurrage accruing' },
      { to: '/customs', label: 'Customs & Permits', icon: Stamp, badgeKey: 'customs', description: 'PIB, CEISA lane, SPPB, permit expiry' },
      { to: '/landed-cost', label: 'Landed Cost', icon: Receipt, description: 'Allocation, provisional against final' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/finance/costing', label: 'Costing & Variance', icon: Banknote, description: 'Standard against actual per work order' },
      { to: '/finance/invoices', label: 'Invoices & Bills', icon: Wallet, badgeKey: 'overdue', description: 'AR and AP with ageing' },
      { to: '/finance/payments', label: 'Receipts & Payments', icon: HandCoins, badgeKey: 'payments', description: 'Cash in, cash out, and what is left in the bank' },
      { to: '/finance/ledger', label: 'General Ledger', icon: BookOpen, description: 'Double-entry journal' },
      { to: '/finance/accounts', label: 'Chart of Accounts', icon: FileSpreadsheet, description: 'Account structure' },
      { to: '/finance/reports', label: 'Financial Reports', icon: LineChart, description: 'Trial balance, P&L, balance sheet' },
    ],
  },
  {
    label: 'Insight',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart3, description: 'On-time, yield, scrap, lead time, variance' },
      { to: '/settings', label: 'Settings & Audit', icon: Settings, description: 'Tax, tolerances, licences, activity trail' },
    ],
  },
]
