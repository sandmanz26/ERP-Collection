import {
  ArrowLeftRight, Banknote, BookOpen, Boxes, Building2, ClipboardList, Container, FileSpreadsheet,
  Factory, Gauge, Handshake, LineChart, Package, PackageCheck, Receipt, Ruler, Settings, ShoppingCart,
  Trees, Warehouse, Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  badgeKey?:
    | 'exceptions' | 'projects' | 'inquiries' | 'budgets' | 'requests' | 'orders' | 'receipts'
    | 'reorder' | 'production' | 'shipments' | 'payables' | 'receivables'
  description?: string
  /** matched as a prefix, for detail routes */
  end?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    label: 'Control',
    items: [
      { to: '/', label: 'Control Tower', icon: Gauge, badgeKey: 'exceptions', end: true, description: 'Everything about to go wrong, ranked' },
    ],
  },
  {
    label: 'Commercial',
    items: [
      { to: '/projects', label: 'Projects', icon: Ruler, badgeKey: 'projects', description: 'Inquiry, negotiation, drawings, samples, order' },
      { to: '/pipeline', label: 'Pipeline', icon: LineChart, badgeKey: 'inquiries', description: 'The order book by stage' },
      { to: '/buyers', label: 'Buyers', icon: Building2, description: 'Overseas customers, terms and credit' },
    ],
  },
  {
    label: 'Costing',
    items: [
      { to: '/budgets', label: 'Budgets (RAB)', icon: FileSpreadsheet, badgeKey: 'budgets', description: 'Anggaran belanja, approval and variance' },
      { to: '/profitability', label: 'Profitability', icon: LineChart, description: 'Budget against committed, actual and margin' },
    ],
  },
  {
    label: 'Procurement',
    items: [
      { to: '/requests', label: 'Purchase Requests', icon: ClipboardList, badgeKey: 'requests', description: 'What production is asking for' },
      { to: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, badgeKey: 'orders', description: 'Placed, open and overdue' },
      { to: '/receipts', label: 'Goods Receipts', icon: PackageCheck, badgeKey: 'receipts', description: 'Full, partial and direct deliveries' },
      { to: '/suppliers', label: 'Suppliers', icon: Handshake, description: 'Sawmills, workshops and their certificates' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/inventory', label: 'Stock on Hand', icon: Boxes, badgeKey: 'reorder', description: 'Item by warehouse, with what is spoken for' },
      { to: '/items', label: 'Item Master', icon: Package, description: 'Timber, panel, hardware, finished goods' },
      { to: '/warehouses', label: 'Warehouses', icon: Warehouse, description: 'Seven locations and how full they are' },
      { to: '/movements', label: 'Stock Ledger', icon: BookOpen, description: 'Every movement that made a balance' },
      { to: '/transfers', label: 'Transfers & Counts', icon: ArrowLeftRight, description: 'Between warehouses, and stock opname' },
    ],
  },
  {
    label: 'Make & ship',
    items: [
      { to: '/production', label: 'Work Orders', icon: Factory, badgeKey: 'production', description: 'The floor, stage by stage' },
      { to: '/shipments', label: 'Shipments & Docs', icon: Container, badgeKey: 'shipments', description: 'Containers, V-Legal, PEB, EUDR' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/payables', label: 'Payables', icon: Receipt, badgeKey: 'payables', description: 'Supplier bills and the three-way match' },
      { to: '/receivables', label: 'Receivables', icon: Banknote, badgeKey: 'receivables', description: 'Deposits, balances and what is late' },
      { to: '/payments', label: 'Payments', icon: Wallet, description: 'Money in and money out' },
      { to: '/ledger', label: 'General Ledger', icon: BookOpen, description: 'Journal and chart of accounts' },
    ],
  },
  {
    label: 'Insight',
    items: [
      { to: '/analytics', label: 'Analytics', icon: LineChart, description: 'Win rate, spend, punctuality, margin' },
      { to: '/settings', label: 'Settings & Audit', icon: Settings, description: 'Company, licences, thresholds, activity' },
    ],
  },
]

export const BRAND_ICON = Trees
