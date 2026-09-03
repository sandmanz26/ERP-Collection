import type { PermissionDef, PermissionModule, PermissionRisk } from './types'

/* ------------------------------------------------------------------
   The privilege catalogue.

   Permissions are defined in code, never in data. A role is a bundle of
   these keys and lives in the database; the keys themselves are part of
   the application, because every one of them corresponds to a control
   the interface either shows or hides. Adding a permission is a code
   change; granting one is an administrator's decision.

   Key format: `<module>.<action>`.
   ------------------------------------------------------------------ */

export const MODULES: { key: PermissionModule; label: string; description: string; group: string }[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'The company overview and its attention queue', group: 'Overview' },
  { key: 'clients', label: 'Clients', description: 'Client register and commercial terms', group: 'Clients' },
  { key: 'buildings', label: 'Buildings', description: 'Sites a project can be attached to', group: 'Clients' },
  { key: 'projects', label: 'Projects', description: 'Contracts, periods and manpower requirement lines', group: 'Operations' },
  { key: 'deployments', label: 'Deployments', description: 'Every manpower line across the company', group: 'Operations' },
  { key: 'positions', label: 'Positions', description: 'Position master, rates and standard issue', group: 'Operations' },
  { key: 'warehouses', label: 'Warehouses', description: 'Where stock is held', group: 'Inventory' },
  { key: 'items', label: 'Item Master', description: 'The definition of everything the company buys', group: 'Inventory' },
  { key: 'stock', label: 'Warehouse Stock', description: 'Quantities per item, per warehouse, per bin', group: 'Inventory' },
  { key: 'users', label: 'Users', description: 'Accounts that can sign in', group: 'Administration' },
  { key: 'roles', label: 'Roles', description: 'Bundles of privileges assigned to accounts', group: 'Administration' },
  { key: 'settings', label: 'Settings', description: 'Company profile and system preferences', group: 'Administration' },
  { key: 'audit', label: 'Activity log', description: 'The record of who changed what', group: 'Administration' },
]

export const moduleLabel = (key: PermissionModule) => MODULES.find((m) => m.key === key)?.label ?? key

/** How much damage the privilege can do if it is handed out carelessly. */
const RISK: Record<string, PermissionRisk> = {
  view: 'LOW', export: 'LOW', create: 'MEDIUM', edit: 'MEDIUM', import: 'MEDIUM',
  delete: 'HIGH', approve: 'HIGH', manage: 'HIGH',
}

/** Wording that says what the privilege lets a person do, not what it is called. */
const VERB: Record<string, string> = {
  view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', import: 'Import',
  export: 'Export', approve: 'Approve', manage: 'Manage',
}

function perm(module: PermissionModule, action: string, description: string): PermissionDef {
  const label = MODULES.find((m) => m.key === module)?.label ?? module
  return {
    key: `${module}.${action}`,
    module,
    action,
    label: `${VERB[action] ?? action} ${label.toLowerCase()}`,
    description,
    risk: RISK[action] ?? 'MEDIUM',
  }
}

export const PERMISSIONS: PermissionDef[] = [
  perm('dashboard', 'view', 'Open the dashboard and see company-wide fulfilment, contracts and stock health.'),

  perm('clients', 'view', 'Open the client register and any client record.'),
  perm('clients', 'create', 'Add a new client.'),
  perm('clients', 'edit', 'Change client details, commercial terms and contacts.'),
  perm('clients', 'delete', 'Remove a client. Its buildings and projects are left orphaned.'),
  perm('clients', 'import', 'Load clients from a CSV file, updating existing codes in place.'),
  perm('clients', 'export', 'Download the client register as CSV or JSON.'),

  perm('buildings', 'view', 'Open the building register.'),
  perm('buildings', 'create', 'Add a building to a client.'),
  perm('buildings', 'edit', 'Change a building, its coverage hours and access rules.'),
  perm('buildings', 'delete', 'Remove a building. Any project pointing at it loses its site.'),
  perm('buildings', 'import', 'Load buildings from a CSV file.'),
  perm('buildings', 'export', 'Download the building register.'),

  perm('projects', 'view', 'Open the project register and any project record.'),
  perm('projects', 'create', 'Create a project against a client building.'),
  perm('projects', 'edit', 'Change a contract, its period and its manpower lines.'),
  perm('projects', 'delete', 'Remove a project and every manpower line on it.'),
  perm('projects', 'import', 'Load projects from a CSV file.'),
  perm('projects', 'export', 'Download the project register.'),
  perm('projects', 'approve', 'Approve, suspend, complete or terminate a contract. This is what puts people on site and starts the billing.'),

  perm('deployments', 'view', 'Open the company-wide deployment register.'),
  perm('deployments', 'export', 'Download deployment lines, including rates.'),

  perm('positions', 'view', 'Open the position master.'),
  perm('positions', 'create', 'Add a position with its rate and standard issue.'),
  perm('positions', 'edit', 'Change a position, including its salary and bill rate.'),
  perm('positions', 'delete', 'Remove a position. Manpower lines using it lose their rate reference.'),
  perm('positions', 'import', 'Load positions from a rate card.'),
  perm('positions', 'export', 'Download the position master with its rates.'),

  perm('warehouses', 'view', 'Open the warehouse register.'),
  perm('warehouses', 'create', 'Add a warehouse.'),
  perm('warehouses', 'edit', 'Change a warehouse.'),
  perm('warehouses', 'delete', 'Remove a warehouse and everything stored in it.'),
  perm('warehouses', 'import', 'Load warehouses from a CSV file.'),
  perm('warehouses', 'export', 'Download the warehouse register.'),

  perm('items', 'view', 'Open the item master.'),
  perm('items', 'create', 'Define a new item.'),
  perm('items', 'edit', 'Change an item definition, its cost and its planning levels.'),
  perm('items', 'delete', 'Remove an item definition and every stock line holding it.'),
  perm('items', 'import', 'Load item definitions from a CSV file.'),
  perm('items', 'export', 'Download the item master.'),

  perm('stock', 'view', 'Open warehouse stock.'),
  perm('stock', 'create', 'Record a new stock line.'),
  perm('stock', 'edit', 'Change quantities, reservations, bins, batches and conditions.'),
  perm('stock', 'delete', 'Delete a stock line, writing off the quantity it holds.'),
  perm('stock', 'import', 'Load stock counts from a CSV file.'),
  perm('stock', 'export', 'Download stock with its valuation.'),

  perm('users', 'view', 'See the account register and what each account can do.'),
  perm('users', 'create', 'Invite a new account.'),
  perm('users', 'edit', 'Change an account, its roles and its individual privilege overrides.'),
  perm('users', 'delete', 'Remove an account permanently.'),
  perm('users', 'manage', 'Release a locked account, suspend or restore one, and force a password reset.'),

  perm('roles', 'view', 'See roles and the privileges each one grants.'),
  perm('roles', 'create', 'Create a role.'),
  perm('roles', 'edit', 'Change what a role grants. This changes what every account holding it can do.'),
  perm('roles', 'delete', 'Delete a role that no account is using.'),

  perm('settings', 'view', 'Open settings and the company profile.'),
  perm('settings', 'edit', 'Change the company profile and reset the demo data.'),

  perm('audit', 'view', 'Read the activity log of who changed what.'),
]

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key)
export const permissionByKey = new Map(PERMISSIONS.map((p) => [p.key, p]))
export const permissionsOf = (module: PermissionModule) => PERMISSIONS.filter((p) => p.module === module)

/** Every action used anywhere, in the order a permission matrix should show them. */
export const ACTION_ORDER = ['view', 'create', 'edit', 'delete', 'import', 'export', 'approve', 'manage']

/**
 * Privileges that can hand out further privileges. An account holding any of
 * these can, directly or indirectly, grant itself everything else — which is
 * why the interface refuses to let the last holder of them be removed.
 */
export const ADMINISTRATIVE_KEYS = ['users.edit', 'roles.edit', 'users.create', 'roles.create']
