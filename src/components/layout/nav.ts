import {
  Banknote, BookOpen, Boxes, Building2, Container, FileStack, Gauge, Globe2, LineChart,
  Receipt, Ship, Tags, Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  badgeKey?: 'exceptions' | 'projects' | 'overdue'
  description?: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    label: 'Control',
    items: [{ to: '/', label: 'Control Tower', icon: Gauge, description: 'Exceptions, cut-offs and pipeline health' }],
  },
  {
    label: 'Operations',
    items: [
      { to: '/projects', label: 'Projects', icon: Ship, badgeKey: 'projects', description: 'Export jobs from inquiry to settlement' },
      { to: '/containers', label: 'Containers', icon: Container, description: 'Every unit across all jobs' },
      { to: '/documents', label: 'Documents', icon: FileStack, description: 'Document register and compliance' },
      { to: '/charges', label: 'Charges', icon: Receipt, description: 'Buy and sell lines across all jobs' },
    ],
  },
  {
    label: 'Commercial',
    items: [
      { to: '/customers', label: 'Customers', icon: Building2, description: 'Clients, shippers and consignees' },
      { to: '/offices', label: 'Country Offices', icon: Globe2, description: 'Every customer office worldwide' },
      { to: '/packages', label: 'Service Packages', icon: Tags, description: 'Rate cards and tariffs' },
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
]
