import {
  Boxes, Building2, ClipboardList, LayoutDashboard, MapPinned, Package, Settings, Users, Warehouse,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  description: string
  badgeKey?: 'gaps' | 'expiring' | 'approvals' | 'lowStock'
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Fulfilment, contracts and stock at a glance' },
    ],
  },
  {
    label: 'Clients',
    items: [
      { to: '/clients', label: 'Clients', icon: Users, description: 'Companies we serve and their commercial terms' },
      { to: '/buildings', label: 'Buildings', icon: Building2, description: 'Every site a project can be attached to' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/projects', label: 'Projects', icon: ClipboardList, badgeKey: 'approvals', description: 'One contract, one building, one period' },
      { to: '/deployments', label: 'Deployments', icon: MapPinned, badgeKey: 'gaps', description: 'Every manpower line across every project' },
      { to: '/positions', label: 'Positions', icon: Users, description: 'What can be deployed, at what rate' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/inventory/warehouses', label: 'Warehouses', icon: Warehouse, description: 'Where stock is held' },
      { to: '/inventory/items', label: 'Item Master', icon: Package, description: 'The definition of everything we buy' },
      { to: '/inventory/stock', label: 'Warehouse Stock', icon: Boxes, badgeKey: 'lowStock', description: 'Item by item, warehouse by warehouse' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings, description: 'Company profile, accounts and activity' },
    ],
  },
]
