import * as React from 'react'
import { Check, KeyRound, Minus, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { PermissionDef } from '@/data/types'
import { ACTION_ORDER, MODULES, PERMISSIONS, moduleLabel } from '@/data/permissions'
import { useAuth } from '@/store/useAuth'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { effectivePermissions } from '@/lib/access'

/**
 * The privilege catalogue as a matrix: every privilege the application defines,
 * which roles grant it, and how many accounts end up holding it. Read-only by
 * design — a privilege is granted by editing a role, and this page is where you
 * come to find out which role that is.
 */
export function PrivilegesPage() {
  const roles = useErp((s) => s.roles)
  const users = useAuth((s) => s.users)
  const [module, setModule] = React.useState<string[]>([])
  const [risk, setRisk] = React.useState<string[]>([])
  const [byRole, setByRole] = React.useState<string[]>([])
  const [coverage, setCoverage] = React.useState<string[]>([])

  const holdersOf = React.useMemo(() => {
    const map = new Map<string, number>()
    users
      .filter((u) => u.status === 'ACTIVE')
      .forEach((u) => effectivePermissions(u, roles).forEach((k) => map.set(k, (map.get(k) ?? 0) + 1)))
    return map
  }, [users, roles])

  const rolesGranting = (key: string) => roles.filter((r) => r.permissions.includes(key))
  const ungranted = PERMISSIONS.filter((p) => rolesGranting(p.key).length === 0)

  const columns: Column<PermissionDef>[] = [
    {
      key: 'key', header: 'Privilege', width: 'w-[210px] max-w-[210px]', pinned: true, sortable: true,
      sortValue: (r) => r.key, exportValue: (r) => r.key,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12px] font-medium text-fg">{r.key}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.label}</p>
        </div>
      ),
    },
    {
      key: 'module', header: 'Module', width: 'w-[150px]', sortable: true,
      sortValue: (r) => r.module, exportValue: (r) => moduleLabel(r.module),
      cell: (r) => <Badge tone="outline" size="sm">{moduleLabel(r.module)}</Badge>,
    },
    {
      key: 'action', header: 'Action', width: 'w-[104px]', sortable: true,
      sortValue: (r) => ACTION_ORDER.indexOf(r.action), exportValue: (r) => r.action,
      cell: (r) => <span className="text-[12.5px] text-fg-muted">{r.action}</span>,
    },
    {
      key: 'risk', header: 'Risk', width: 'w-[100px]', sortable: true,
      sortValue: (r) => ({ HIGH: 0, MEDIUM: 1, LOW: 2 })[r.risk], exportValue: (r) => r.risk,
      cell: (r) => (
        <Badge tone={r.risk === 'HIGH' ? 'danger' : r.risk === 'MEDIUM' ? 'warning' : 'neutral'} size="sm">
          {r.risk.toLowerCase()}
        </Badge>
      ),
    },
    {
      key: 'description', header: 'What it allows', width: 'w-[340px] max-w-[340px]', sortable: false, defaultHidden: true,
      exportValue: (r) => r.description,
      cell: (r) => <p className="truncate text-[12px] text-fg-muted">{r.description}</p>,
    },
    {
      key: 'grantedBy', header: 'Roles', width: 'w-[96px]', align: 'right', sortable: true,
      sortValue: (r) => rolesGranting(r.key).length, exportValue: (r) => rolesGranting(r.key).map((x) => x.code).join(' | '),
      cell: (r) => {
        const list = rolesGranting(r.key)
        if (!list.length) return <Badge tone="warning" size="sm">none</Badge>
        return (
          <Tooltip content={list.map((x) => x.name).join(', ')}>
            <span className="tnum text-[12.5px] font-medium text-fg">{list.length}</span>
          </Tooltip>
        )
      },
    },
    {
      key: 'accounts', header: 'Accounts', width: 'w-[104px]', align: 'right', sortable: true,
      sortValue: (r) => holdersOf.get(r.key) ?? 0, exportValue: (r) => holdersOf.get(r.key) ?? 0,
      headerHint: 'Active accounts whose effective privileges include this one',
      cell: (r) => {
        const n = holdersOf.get(r.key) ?? 0
        return (
          <span className={`tnum text-[12.5px] ${n === 0 ? 'text-fg-subtle' : r.risk === 'HIGH' ? 'font-semibold text-danger' : 'text-fg'}`}>
            {n}
          </span>
        )
      },
    },
    /* One column per role: the matrix people actually come here to read. */
    ...roles.map<Column<PermissionDef>>((role) => ({
      key: `role-${role.id}`,
      header: role.name.replace(' (custom)', ''),
      width: 'w-[126px]',
      align: 'center',
      sortable: true,
      defaultHidden: role.status !== 'ACTIVE',
      sortValue: (r) => (role.permissions.includes(r.key) ? 0 : 1),
      exportValue: (r) => (role.permissions.includes(r.key) ? 'yes' : ''),
      cell: (r) =>
        role.permissions.includes(r.key) ? (
          <Tooltip content={`${role.name} grants ${r.key}`}>
            <span className="inline-grid size-5 place-items-center rounded-md bg-primary-soft text-primary-soft-fg">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          </Tooltip>
        ) : (
          <Minus className="mx-auto size-3.5 text-fg-subtle/50" />
        ),
    })),
  ]

  const highRisk = PERMISSIONS.filter((p) => p.risk === 'HIGH')

  return (
    <>
      <PageHeader
        title="Privileges"
        description="Every privilege the application defines, and which role grants it. Privileges are part of the software; roles decide who gets them."
        meta={
          <>
            <span className="text-[12.5px] text-fg-muted">
              {PERMISSIONS.length} privileges · {MODULES.length} modules · {roles.length} roles
            </span>
            <span className="text-[12.5px] text-fg-subtle">Read-only — grant a privilege by editing a role</span>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Privileges" value={PERMISSIONS.length} icon={<KeyRound />} accent="primary" sub={`across ${MODULES.length} modules`} />
        <KpiCard
          label="High risk"
          value={highRisk.length}
          icon={<ShieldAlert />}
          accent="danger"
          sub="delete, approve and account admin"
        />
        <KpiCard
          label="Granted by no role"
          value={ungranted.length}
          icon={<ShieldCheck />}
          accent={ungranted.length ? 'warning' : 'success'}
          sub={ungranted.length ? 'nobody in the company can do these' : 'every privilege is reachable'}
          onClick={() => setCoverage(['NONE'])}
        />
        <KpiCard
          label="Held most widely"
          value={
            PERMISSIONS.slice().sort((a, b) => (holdersOf.get(b.key) ?? 0) - (holdersOf.get(a.key) ?? 0))[0]?.key ?? '—'
          }
          icon={<KeyRound />}
          accent="accent"
          sub={`${Math.max(0, ...PERMISSIONS.map((p) => holdersOf.get(p.key) ?? 0))} active accounts`}
        />
      </div>

      <DataTable
        data={PERMISSIONS}
        columns={columns}
        getId={(r) => r.key}
        getLabel={(r) => r.key}
        entityLabel="privilege"
        storageKey="privileges"
        exportName="tata-gemilang-privileges"
        searchText={(r) => [r.key, r.label, r.description, moduleLabel(r.module), r.risk].join(' ')}
        initialSort={{ key: 'key', dir: 'asc' }}
        pageSize={50}
        compactByDefault
        rowTone={(r) => (rolesGranting(r.key).length === 0 ? 'bg-warning-soft/25' : undefined)}
        filters={[
          {
            key: 'module', label: 'Module', values: module, onChange: setModule,
            options: MODULES.map((m) => ({ value: m.key, label: m.label })),
            match: (r, v) => v.includes(r.module),
          },
          {
            key: 'risk', label: 'Risk', values: risk, onChange: setRisk,
            options: [
              { value: 'HIGH', label: 'High' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'LOW', label: 'Low' },
            ],
            match: (r, v) => v.includes(r.risk),
          },
          {
            key: 'byRole', label: 'Granted by', values: byRole, onChange: setByRole,
            options: roles.map((x) => ({ value: x.id, label: x.name })),
            match: (r, v) => v.some((id) => roles.find((x) => x.id === id)?.permissions.includes(r.key)),
          },
          {
            key: 'coverage', label: 'Coverage', values: coverage, onChange: setCoverage,
            options: [
              { value: 'NONE', label: 'No role grants it' },
              { value: 'ONE', label: 'Exactly one role' },
              { value: 'MANY', label: 'Two or more roles' },
            ],
            match: (r, v) => {
              const n = rolesGranting(r.key).length
              return (v.includes('NONE') && n === 0) || (v.includes('ONE') && n === 1) || (v.includes('MANY') && n > 1)
            },
          },
        ]}
        footerSummary={(rows) => (
          <span className="tnum">
            {rows.filter((r) => r.risk === 'HIGH').length} high risk ·{' '}
            {rows.filter((r) => rolesGranting(r.key).length === 0).length} granted by no role, in this view
          </span>
        )}
        emptyTitle="No privileges match"
        emptyDescription="Widen the filters to see the rest of the catalogue."
      />
    </>
  )
}
