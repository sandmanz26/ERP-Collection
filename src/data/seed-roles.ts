import type { Role } from './types'
import { PERMISSION_KEYS, permissionsOf } from './permissions'
import { iso } from './seed-util'

/* ------------------------------------------------------------------
   Roles as the company actually runs them.

   System roles ship with the product and cannot be deleted, because an
   account with no valid role is an account nobody can fix. Super
   Administrator cannot be edited either — it is the way back in when a
   custom role has been mis-configured.
   ------------------------------------------------------------------ */

/** Every permission of a module, e.g. all of `clients.*`. */
const all = (...modules: Parameters<typeof permissionsOf>[0][]) =>
  modules.flatMap((m) => permissionsOf(m).map((p) => p.key))

/** Read-only access to a module: open it and take a copy. */
const read = (...modules: Parameters<typeof permissionsOf>[0][]) =>
  modules.flatMap((m) => permissionsOf(m).filter((p) => ['view', 'export'].includes(p.action)).map((p) => p.key))

const ADMIN = 'Hendra Wijayanto'

export const roles: Role[] = [
  {
    id: 'rol_super', code: 'SUPER_ADMIN', name: 'Super Administrator',
    description: 'Every privilege in the system, including user and role administration. Kept for one or two people — it is the way back in when something is mis-configured.',
    permissions: [...PERMISSION_KEYS],
    isSystem: true, status: 'ACTIVE',
    createdAt: iso(-1460), updatedAt: iso(-1460), updatedBy: 'System',
  },
  {
    id: 'rol_director', code: 'DIRECTOR', name: 'Director',
    description: 'Sees and approves everything operational, and can administer accounts — but cannot delete accounts or roles, so the audit trail cannot be tidied away.',
    permissions: [
      ...all('dashboard', 'clients', 'buildings', 'projects', 'deployments', 'positions', 'warehouses', 'items', 'stock', 'settings', 'audit'),
      ...all('divisions', 'suppliers'),
      'mr.view', 'mr.create', 'mr.review', 'mr.submit',
      'pr.view', 'pr.export', 'pr.approve',
      'users.view', 'users.create', 'users.edit', 'users.manage',
      'roles.view', 'roles.create', 'roles.edit',
    ],
    isSystem: true, status: 'ACTIVE',
    createdAt: iso(-1460), updatedAt: iso(-320), updatedBy: ADMIN,
  },
  {
    id: 'rol_ops_manager', code: 'OPERATION_MANAGER', name: 'Operation Manager',
    description: 'Owns the contract book: creates and edits projects, approves them, and manages clients, buildings and positions. Reads inventory but does not change it.',
    permissions: [
      'dashboard.view',
      ...all('clients', 'buildings', 'projects', 'deployments', 'positions'),
      ...read('warehouses', 'items', 'stock'),
      'divisions.view', 'divisions.edit', 'suppliers.view',
      'mr.view', 'mr.create', 'mr.submit', 'mr.review',
      'pr.view', 'pr.export',
      'settings.view', 'audit.view', 'users.view',
    ],
    isSystem: true, status: 'ACTIVE',
    createdAt: iso(-1460), updatedAt: iso(-210), updatedBy: ADMIN,
  },
  {
    id: 'rol_area_coord', code: 'AREA_COORDINATOR', name: 'Area Coordinator',
    description: 'Runs the sites in one area. Keeps deployment numbers current on existing projects, but cannot sign a new contract, approve one, or delete anything.',
    permissions: [
      'dashboard.view',
      'clients.view', 'clients.export',
      'buildings.view', 'buildings.edit', 'buildings.export',
      'projects.view', 'projects.edit', 'projects.export',
      'deployments.view', 'deployments.export',
      'positions.view',
      ...read('warehouses', 'items', 'stock'),
      'divisions.view', 'mr.view', 'mr.submit',
    ],
    isSystem: true, status: 'ACTIVE',
    createdAt: iso(-1460), updatedAt: iso(-95), updatedBy: ADMIN,
  },
  {
    id: 'rol_hr', code: 'HR_RECRUITMENT', name: 'HR & Recruitment',
    description: 'Works the gaps: reads every deployment line and the positions behind them, and updates deployed counts as people are placed.',
    permissions: [
      'dashboard.view',
      'projects.view', 'projects.edit',
      'deployments.view', 'deployments.export',
      ...all('positions'),
      'clients.view', 'buildings.view',
      'divisions.view', 'mr.view', 'mr.submit',
      'users.view',
    ],
    isSystem: true, status: 'ACTIVE',
    createdAt: iso(-1460), updatedAt: iso(-140), updatedBy: ADMIN,
  },
  {
    id: 'rol_warehouse', code: 'WAREHOUSE_ADMIN', name: 'Warehouse Admin',
    description: 'Owns the three inventory sub-modules end to end. Reads projects and positions, because that is what the stock is for.',
    permissions: [
      'dashboard.view',
      ...all('warehouses', 'items', 'stock'),
      'projects.view', 'positions.view', 'clients.view', 'buildings.view',
      'divisions.view', 'suppliers.view', 'suppliers.export',
      'mr.view', 'mr.submit', 'pr.view', 'pr.export',
      'audit.view',
    ],
    isSystem: true, status: 'ACTIVE',
    createdAt: iso(-1460), updatedAt: iso(-260), updatedBy: ADMIN,
  },
  {
    id: 'rol_finance', code: 'FINANCE', name: 'Finance & Billing',
    description: 'Reads everything that carries a number and can export all of it, but changes only the commercial terms on a client.',
    permissions: [
      'dashboard.view',
      'clients.view', 'clients.edit', 'clients.export',
      'buildings.view', 'buildings.export',
      'projects.view', 'projects.export',
      'deployments.view', 'deployments.export',
      'positions.view', 'positions.export',
      ...read('warehouses', 'items', 'stock'),
      'divisions.view', 'suppliers.view', 'suppliers.export',
      'mr.view', 'mr.submit', 'pr.view', 'pr.export',
      'settings.view', 'audit.view',
    ],
    isSystem: true, status: 'ACTIVE',
    createdAt: iso(-1460), updatedAt: iso(-180), updatedBy: ADMIN,
  },
  {
    id: 'rol_viewer', code: 'VIEWER', name: 'Viewer',
    description: 'Read-only across the operational modules. Given to auditors and to new joiners during their first week.',
    permissions: [
      'dashboard.view',
      ...read('clients', 'buildings', 'projects', 'deployments', 'positions', 'warehouses', 'items', 'stock').filter(
        (k) => !k.endsWith('.export'),
      ),
    ],
    isSystem: true, status: 'ACTIVE',
    createdAt: iso(-1460), updatedAt: iso(-1460), updatedBy: 'System',
  },
  {
    id: 'rol_purchasing', code: 'PURCHASING_MANAGER', name: 'Purchasing Manager',
    description: 'Kepala pengadaan: reads every division request in a session, sends back what does not belong there, locks the session into a purchase request, and assigns each line to a supplier.',
    permissions: [
      'dashboard.view',
      'mr.view', 'mr.create', 'mr.submit', 'mr.review', 'mr.lock',
      ...all('pr'),
      ...all('suppliers'),
      'divisions.view',
      'items.view', 'items.export', 'stock.view', 'stock.export', 'warehouses.view',
      'projects.view', 'positions.view', 'clients.view',
      'audit.view',
    ],
    isSystem: true, status: 'ACTIVE',
    createdAt: iso(-1200), updatedAt: iso(-60), updatedBy: ADMIN,
  },
  {
    id: 'rol_division_head', code: 'DIVISION_HEAD', name: 'Division Head',
    description: 'Kepala divisi: files and submits the material request for their own division, and can look up what the warehouse holds before asking for it. Sees no other division request.',
    permissions: [
      'dashboard.view',
      'mr.view', 'mr.submit',
      'items.view', 'stock.view',
      'divisions.view',
    ],
    isSystem: true, status: 'ACTIVE',
    createdAt: iso(-1200), updatedAt: iso(-45), updatedBy: ADMIN,
  },
  {
    id: 'rol_site_spv', code: 'SITE_SUPERVISOR', name: 'Site Supervisor (custom)',
    description: 'Built for supervisors who sit inside a client building: they keep the site store and the deployment numbers, and see nothing commercial.',
    permissions: [
      'dashboard.view',
      'projects.view', 'projects.edit',
      'deployments.view',
      'positions.view',
      'buildings.view',
      'warehouses.view',
      'items.view',
      'stock.view', 'stock.edit', 'stock.export',
    ],
    isSystem: false, status: 'ACTIVE',
    createdAt: iso(-120), updatedAt: iso(-38), updatedBy: 'Siti Rahmawati',
  },
  {
    id: 'rol_auditor', code: 'EXTERNAL_AUDITOR', name: 'External Auditor (custom)',
    description: 'Created for the annual audit and switched off between engagements. Reads the operational registers and the activity log, exports nothing.',
    permissions: [
      'dashboard.view',
      'clients.view', 'buildings.view', 'projects.view', 'deployments.view', 'positions.view',
      'warehouses.view', 'items.view', 'stock.view',
      'audit.view',
    ],
    isSystem: false, status: 'INACTIVE',
    createdAt: iso(-400), updatedAt: iso(-300), updatedBy: 'Hendra Wijayanto',
  },
]
