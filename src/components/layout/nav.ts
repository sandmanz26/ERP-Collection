import {
  Boxes, Building2, CalendarRange, ClipboardList, KeyRound, LayoutDashboard, MapPinned, Network,
  Package, Settings, ShieldCheck, ShoppingCart, Store, Users, UsersRound, Warehouse,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  description: string
  /** The privilege that opens this page. No privilege, no menu entry, no route. */
  permission: string
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
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view', description: 'Fulfilment, contracts and stock at a glance' },
    ],
  },
  {
    label: 'Clients',
    items: [
      { to: '/clients', label: 'Clients', icon: Users, permission: 'clients.view', description: 'Companies we serve and their commercial terms' },
      { to: '/buildings', label: 'Buildings', icon: Building2, permission: 'buildings.view', description: 'Every site a project can be attached to' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/projects', label: 'Projects', icon: ClipboardList, permission: 'projects.view', badgeKey: 'approvals', description: 'One contract, one building, one period' },
      { to: '/deployments', label: 'Deployments', icon: MapPinned, permission: 'deployments.view', badgeKey: 'gaps', description: 'Every manpower line across every project' },
      { to: '/positions', label: 'Positions', icon: Users, permission: 'positions.view', description: 'What can be deployed, at what rate' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/inventory/warehouses', label: 'Warehouses', icon: Warehouse, permission: 'warehouses.view', description: 'Where stock is held' },
      { to: '/inventory/items', label: 'Item Master', icon: Package, permission: 'items.view', description: 'The definition of everything we buy' },
      { to: '/inventory/stock', label: 'Warehouse Stock', icon: Boxes, permission: 'stock.view', badgeKey: 'lowStock', description: 'Item by item, warehouse by warehouse' },
    ],
  },
  {
    label: 'Procurement',
    items: [
      { to: '/mr', label: 'Material Requests', icon: CalendarRange, permission: 'mr.view', description: 'The monthly session every division files into' },
      { to: '/mr/my', label: 'My Division Request', icon: ClipboardList, permission: 'mr.submit', description: 'What this division is asking for this month' },
      { to: '/purchase-requests', label: 'Purchase Requests', icon: ShoppingCart, permission: 'pr.view', description: 'The locked recap, split across suppliers' },
      { to: '/suppliers', label: 'Suppliers', icon: Store, permission: 'suppliers.view', description: 'Who we buy from, and at what price last time' },
      { to: '/divisions', label: 'Divisions', icon: Network, permission: 'divisions.view', description: 'The cost centres that can raise a request' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/admin/users', label: 'Users', icon: UsersRound, permission: 'users.view', description: 'Accounts, their roles and their overrides' },
      { to: '/admin/roles', label: 'Roles', icon: ShieldCheck, permission: 'roles.view', description: 'Bundles of privileges assigned to accounts' },
      { to: '/admin/privileges', label: 'Privileges', icon: KeyRound, permission: 'roles.view', description: 'Every privilege, and which role grants it' },
      { to: '/settings', label: 'Settings', icon: Settings, permission: 'settings.view', description: 'Company profile and activity log' },
    ],
  },
]

/** The privilege a path needs, for the route guard. */
export const permissionForPath = (path: string) =>
  NAV.flatMap((g) => g.items).find((i) => i.to === path)?.permission
