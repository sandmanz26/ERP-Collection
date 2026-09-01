import {
  Banknote, BarChart3, BookOpen, Boxes, Building2, Container, FileSignature, FileStack, Gauge,
  Globe2, Handshake, LineChart, Radio, Receipt, Settings, Ship, ShieldAlert, SprayCan, Stamp, Tags,
  LayoutList, PackageCheck, Wallet, Warehouse,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  badgeKey?:
    | 'exceptions' | 'projects' | 'overdue' | 'quotes' | 'customs' | 'incidents' | 'stuffing'
    | 'myBlocking' | 'myIntake' | 'myExecute' | 'myDocs' | 'myClosing'
  description?: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * The operator's navigation. Four phases instead of twenty menu items, because
 * an operator does not browse the system — they work a job from one end to the
 * other and need to know what it wants next.
 */
export const OPERATOR_NAV: NavGroup[] = [
  {
    label: 'My work',
    items: [
      { to: '/my', label: 'My jobs', icon: LayoutList, badgeKey: 'myBlocking', description: 'Everything on your desk, by phase' },
    ],
  },
  {
    label: 'A job, end to end',
    items: [
      { to: '/my/intake', label: '1 · Take it on', icon: Handshake, badgeKey: 'myIntake', description: 'Menerima project — read the brief and accept' },
      { to: '/my/execute', label: '2 · Run it', icon: Ship, badgeKey: 'myExecute', description: 'Execute project — containers, stuffing, gate-in' },
      { to: '/my/documents', label: '3 · Paper it', icon: FileStack, badgeKey: 'myDocs', description: 'Pengaturan dokumen — the full checklist' },
      { to: '/my/closing', label: '4 · Close it', icon: Receipt, badgeKey: 'myClosing', description: 'Penutup — charges, settlement, job sheet' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { to: '/tracking', label: 'Tracking', icon: Radio, description: 'Milestones and punctuality' },
      { to: '/stuffing', label: 'Yard schedule', icon: PackageCheck, description: 'Every stuffing slot by day' },
      { to: '/incidents', label: 'Incidents', icon: ShieldAlert, description: 'Log what went wrong' },
    ],
  },
]

export const NAV: NavGroup[] = [
  {
    label: 'Control',
    items: [{ to: '/', label: 'Control Tower', icon: Gauge, description: 'Exceptions, cut-offs and pipeline health' }],
  },
  {
    label: 'Commercial',
    items: [
      { to: '/quotations', label: 'Quotations', icon: FileSignature, badgeKey: 'quotes', description: 'Pipeline, revisions, win and loss' },
      { to: '/customers', label: 'Customers', icon: Building2, description: 'Clients, shippers and consignees' },
      { to: '/offices', label: 'Country Offices', icon: Globe2, description: 'Every customer office worldwide' },
      { to: '/packages', label: 'Service Packages', icon: Tags, description: 'Rate cards and tariffs' },
      { to: '/partners', label: 'Partners & Vendors', icon: Handshake, description: 'Carriers, agents, truckers, brokers' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/projects', label: 'Projects', icon: Ship, badgeKey: 'projects', description: 'Export jobs from inquiry to settlement' },
      { to: '/tracking', label: 'Tracking', icon: Radio, description: 'Milestones, punctuality, event log' },
      { to: '/containers', label: 'Containers', icon: Container, description: 'Every unit across all jobs' },
      { to: '/stuffing', label: 'Stuffing', icon: PackageCheck, badgeKey: 'stuffing', description: 'Yard schedule, tally and gate-in' },
      { to: '/documents', label: 'Documents', icon: FileStack, description: 'Document register and compliance' },
      { to: '/customs', label: 'Customs', icon: Stamp, badgeKey: 'customs', description: 'PEB filings, CEISA 4.0, LARTAS' },
      { to: '/warehouse', label: 'Warehouse & CFS', icon: Warehouse, description: 'Receipts, dwell and storage' },
      { to: '/services', label: 'Additional Services', icon: SprayCan, description: 'Fumigation, crating, survey, insurance' },
      { to: '/incidents', label: 'Incidents & Claims', icon: ShieldAlert, badgeKey: 'incidents', description: 'Rollovers, holds, damage, demurrage' },
      { to: '/charges', label: 'Charges', icon: Receipt, description: 'Buy and sell lines across all jobs' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/finance/ledger', label: 'General Ledger', icon: BookOpen, description: 'Double-entry journal' },
      { to: '/finance/accounts', label: 'Chart of Accounts', icon: Boxes, description: 'Account structure' },
      { to: '/finance/invoices', label: 'Invoices & Bills', icon: Wallet, badgeKey: 'overdue', description: 'AR and AP' },
      { to: '/finance/reports', label: 'Financial Reports', icon: LineChart, description: 'P&L, balance sheet, trial balance' },
      { to: '/finance/profitability', label: 'Job Profitability', icon: Banknote, description: 'Margin per project' },
    ],
  },
  {
    label: 'Insight',
    items: [
      { to: '/analytics', label: 'Operations Analytics', icon: BarChart3, description: 'On-time, win rate, DSO, utilisation' },
      { to: '/settings', label: 'Settings & Audit', icon: Settings, description: 'Rates, tax, numbering, audit trail' },
    ],
  },
]
