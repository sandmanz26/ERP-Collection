import * as React from 'react'
import { Copy, Pencil, Plus, ShieldAlert, ShieldCheck, Trash2, Users } from 'lucide-react'
import type { Role } from '@/data/types'
import { MODULES, PERMISSIONS, permissionByKey } from '@/data/permissions'
import { useAuth } from '@/store/useAuth'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { useToast } from '@/components/ui/toast'
import { RoleForm } from './RoleForm'
import { fmtDateTime } from '@/lib/format'
import { uid } from '@/lib/utils'
import { roleSummary, useCan, usersOfRole } from '@/lib/access'

export function RolesPage() {
  const toast = useToast()
  const can = useCan()
  const { roles, upsertRole, removeRoles } = useErp()
  const users = useAuth((s) => s.users)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Role | null>(null)
  const [deleting, setDeleting] = React.useState<Role | null>(null)
  const [kind, setKind] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<string[]>([])
  const [module, setModule] = React.useState<string[]>([])

  const holders = (r: Role) => usersOfRole(r.id, users)
  const unused = roles.filter((r) => holders(r).length === 0)

  const columns: Column<Role>[] = [
    {
      key: 'code', header: 'Code', width: 'w-[186px] max-w-[186px]', pinned: true, sortable: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.code}</span>,
    },
    {
      key: 'name', header: 'Role', width: 'w-[280px] max-w-[280px]', sortable: true,
      sortValue: (r) => r.name, exportValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-medium text-fg">
            {r.name}
            {r.isSystem && <Badge tone="neutral" size="sm">System</Badge>}
          </p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.description}</p>
        </div>
      ),
    },
    {
      key: 'holders', header: 'Accounts', width: 'w-[112px]', align: 'right', sortable: true,
      sortValue: (r) => holders(r).length, exportValue: (r) => holders(r).length,
      cell: (r) => {
        const list = holders(r)
        if (!list.length) return <span className="text-[12px] text-fg-subtle">none</span>
        return (
          <Tooltip content={list.map((u) => u.fullName).join(', ')}>
            <span className="tnum text-[12.5px] font-medium text-fg">{list.length}</span>
          </Tooltip>
        )
      },
    },
    {
      key: 'privileges', header: 'Privileges', width: 'w-[168px]', align: 'right', sortable: true,
      sortValue: (r) => r.permissions.length, exportValue: (r) => r.permissions.length,
      cell: (r) => {
        const s = roleSummary(r)
        return (
          <div className="ml-auto w-[140px]">
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="tnum text-[12.5px] font-medium text-fg">{s.total}</span>
              <span className="tnum text-[11px] text-fg-subtle">/ {PERMISSIONS.length}</span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-soft">
              <div className={`h-full rounded-full ${s.pct > 80 ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        )
      },
    },
    {
      key: 'risk', header: 'High risk', width: 'w-[116px]', align: 'right', sortable: true,
      sortValue: (r) => roleSummary(r).byRisk.HIGH, exportValue: (r) => roleSummary(r).byRisk.HIGH,
      headerHint: 'Delete, approve and account administration privileges',
      cell: (r) => {
        const n = roleSummary(r).byRisk.HIGH
        if (!n) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <Badge tone={n > 6 ? 'danger' : 'warning'} size="sm">
            <ShieldAlert className="size-3" /> {n}
          </Badge>
        )
      },
    },
    {
      key: 'modules', header: 'Modules', width: 'w-[220px] max-w-[220px]', sortable: true, defaultHidden: true,
      sortValue: (r) => roleSummary(r).modules,
      exportValue: (r) => Array.from(new Set(r.permissions.map((k) => permissionByKey.get(k)?.module))).join(' | '),
      cell: (r) => {
        const mods = Array.from(new Set(r.permissions.map((k) => permissionByKey.get(k)?.module).filter(Boolean)))
        return (
          <div className="flex flex-wrap gap-1">
            {mods.slice(0, 3).map((m) => (
              <Badge key={m} tone="outline" size="sm">{MODULES.find((x) => x.key === m)?.label ?? m}</Badge>
            ))}
            {mods.length > 3 && <Badge tone="neutral" size="sm">+{mods.length - 3}</Badge>}
          </div>
        )
      },
    },
    {
      key: 'status', header: 'Status', width: 'w-[124px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'updated', header: 'Last changed', width: 'w-[178px]', sortable: true,
      sortValue: (r) => r.updatedAt, exportValue: (r) => r.updatedAt.slice(0, 10),
      cell: (r) => (
        <div className="min-w-0">
          <p className="tnum text-[12px] text-fg-muted">{fmtDateTime(r.updatedAt)}</p>
          <p className="truncate text-[11px] text-fg-subtle">{r.updatedBy}</p>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Roles"
        description="A role is a named bundle of privileges. Changing one changes what every account holding it can do, immediately."
        actions={
          can('roles.create') ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus /> New role
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Roles"
          value={roles.length}
          icon={<ShieldCheck />}
          accent="primary"
          sub={`${roles.filter((r) => r.isSystem).length} system · ${roles.filter((r) => !r.isSystem).length} custom`}
        />
        <KpiCard label="Privileges defined" value={PERMISSIONS.length} icon={<ShieldCheck />} accent="accent" sub={`across ${MODULES.length} modules`} />
        <KpiCard
          label="Unused roles"
          value={unused.length}
          icon={<Users />}
          accent={unused.length ? 'warning' : 'success'}
          sub={unused.length ? unused.slice(0, 2).map((r) => r.code).join(', ') : 'every role is in use'}
        />
        <KpiCard
          label="Widest role"
          value={roles.slice().sort((a, b) => b.permissions.length - a.permissions.length)[0]?.name ?? '—'}
          icon={<ShieldAlert />}
          accent="purple"
          sub={`${roles.slice().sort((a, b) => b.permissions.length - a.permissions.length)[0]?.permissions.length ?? 0} privileges`}
        />
      </div>

      <DataTable
        data={roles}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.code} — ${r.name}`}
        entityLabel="role"
        storageKey="roles"
        exportName="tata-gemilang-roles"
        searchText={(r) => [r.code, r.name, r.description, ...r.permissions].join(' ')}
        initialSort={{ key: 'privileges', dir: 'desc' }}
        onRowClick={can('roles.view') ? (r) => { setEditing(r); setFormOpen(true) } : undefined}
        rowTone={(r) => (r.status === 'INACTIVE' ? 'bg-bg-muted/60' : undefined)}
        filters={[
          {
            key: 'kind', label: 'Kind', values: kind, onChange: setKind,
            options: [
              { value: 'SYSTEM', label: 'System role' },
              { value: 'CUSTOM', label: 'Custom role' },
            ],
            match: (r, v) => v.includes(r.isSystem ? 'SYSTEM' : 'CUSTOM'),
          },
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: [
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ],
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'module', label: 'Grants access to', values: module, onChange: setModule,
            options: MODULES.map((m) => ({ value: m.key, label: m.label })),
            match: (r, v) => r.permissions.some((k) => v.includes(permissionByKey.get(k)?.module ?? '')),
          },
        ]}
        onDelete={
          can('roles.delete')
            ? (ids) => {
                const blocked = ids
                  .map((id) => roles.find((r) => r.id === id))
                  .filter((r): r is Role => !!r)
                  .filter((r) => r.isSystem || holders(r).length > 0)
                if (blocked.length) {
                  toast.push({
                    tone: 'error',
                    title: 'Deletion refused',
                    description: blocked[0].isSystem
                      ? `${blocked[0].name} is a system role and cannot be deleted.`
                      : `${blocked[0].name} is still held by ${holders(blocked[0]).length} account(s). Reassign them first.`,
                  })
                  return
                }
                removeRoles(ids)
                toast.push({ tone: 'success', title: `${ids.length} role${ids.length === 1 ? '' : 's'} deleted` })
              }
            : undefined
        }
        deleteNote="A role can only be deleted once no account holds it."
        rowActions={(r) => (
          <>
            {can('roles.create') && (
              <Tooltip content="Duplicate as a starting point">
                <Button
                  variant="ghost"
                  size="iconXs"
                  onClick={() => {
                    const copy: Role = {
                      ...structuredClone(r),
                      id: uid('rol'),
                      code: `${r.code}_COPY`,
                      name: `${r.name.replace(' (custom)', '')} (copy)`,
                      isSystem: false,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    }
                    upsertRole(copy)
                    setEditing(copy)
                    setFormOpen(true)
                    toast.push({ tone: 'success', title: 'Role duplicated', description: 'Rename it and trim the privileges it does not need.' })
                  }}
                >
                  <Copy />
                </Button>
              </Tooltip>
            )}
            <Tooltip content={can('roles.edit') ? 'Edit privileges' : 'View privileges'}>
              <Button
                variant="ghost"
                size="iconXs"
                onClick={() => {
                  setEditing(r)
                  setFormOpen(true)
                }}
              >
                <Pencil />
              </Button>
            </Tooltip>
            {can('roles.delete') && (
              <Tooltip content={r.isSystem ? 'System roles cannot be deleted' : 'Delete role'}>
                <span>
                  <Button
                    variant="ghost"
                    size="iconXs"
                    className="text-danger hover:bg-danger-soft"
                    disabled={r.isSystem}
                    onClick={() => setDeleting(r)}
                  >
                    <Trash2 />
                  </Button>
                </span>
              </Tooltip>
            )}
          </>
        )}
        footerSummary={(rows) => (
          <span className="tnum">
            {rows.reduce((a, r) => a + holders(r).length, 0)} role assignments across {users.length} accounts
          </span>
        )}
        emptyTitle="No roles"
        emptyDescription="Create a role before inviting anyone — an account with no role can sign in and do nothing."
      />

      <RoleForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="role"
        items={deleting ? [`${deleting.code} — ${deleting.name}`] : []}
        cascade={deleting ? [`${deleting.permissions.length} privileges are removed with it`] : []}
        onConfirm={() => {
          if (!deleting) return
          if (deleting.isSystem || holders(deleting).length > 0) {
            toast.push({
              tone: 'error',
              title: 'Deletion refused',
              description: deleting.isSystem ? 'System roles cannot be deleted.' : 'Reassign the accounts holding it first.',
            })
            setDeleting(null)
            return
          }
          removeRoles([deleting.id])
          toast.push({ tone: 'success', title: 'Role deleted', description: deleting.code })
          setDeleting(null)
        }}
      />
    </>
  )
}
