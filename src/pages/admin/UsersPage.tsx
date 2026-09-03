import * as React from 'react'
import { KeyRound, Lock, LockOpen, MoreHorizontal, Pencil, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react'
import type { UserAccount } from '@/data/types'
import { PERMISSIONS, ADMINISTRATIVE_KEYS } from '@/data/permissions'
import { BRANCHES } from '@/data/reference'
import { useAuth, useCurrentUser } from '@/store/useAuth'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { ConfirmDelete } from '@/components/ui/confirm'
import { useToast } from '@/components/ui/toast'
import { UserForm } from './UserForm'
import { fmtDateTime } from '@/lib/format'
import { uid } from '@/lib/utils'
import { effectivePermissions, rolesOf, useCan, wouldOrphanAdministration } from '@/lib/access'

export function UsersPage() {
  const toast = useToast()
  const can = useCan()
  const me = useCurrentUser()
  const { users, upsertUser, removeUsers, setUserStatus, unlock, forcePasswordReset } = useAuth()
  const roles = useErp((s) => s.roles)
  const log = useErp((s) => s.log)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<UserAccount | null>(null)
  const [deleting, setDeleting] = React.useState<UserAccount | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [role, setRole] = React.useState<string[]>([])
  const [branch, setBranch] = React.useState<string[]>([])

  const permsOf = (u: UserAccount) => effectivePermissions(u, roles)
  const isAdmin = (u: UserAccount) => {
    const keys = permsOf(u)
    return u.status === 'ACTIVE' && ADMINISTRATIVE_KEYS.some((k) => keys.has(k))
  }
  const administrators = users.filter(isAdmin)
  const needAttention = users.filter((u) => ['LOCKED', 'PENDING_VERIFICATION', 'INVITED'].includes(u.status))

  /** Refuses the change and says why, rather than letting the system be locked shut. */
  const guard = (user: UserAccount, change: (u: UserAccount) => UserAccount, selfMessage: string) => {
    if (user.id === me?.id) return selfMessage
    return wouldOrphanAdministration(users, roles, (u) => (u.id === user.id ? change(u) : u))
  }

  const columns: Column<UserAccount>[] = [
    {
      key: 'name', header: 'Account', width: 'w-[240px] max-w-[240px]', pinned: true, sortable: true,
      sortValue: (r) => r.fullName, exportValue: (r) => r.fullName,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">
            {r.fullName}
            {r.id === me?.id && <span className="ml-1.5 text-[11px] font-normal text-fg-subtle">(you)</span>}
          </p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.jobTitle}</p>
        </div>
      ),
    },
    {
      key: 'email', header: 'Email', width: 'w-[220px] max-w-[220px]', sortable: true,
      sortValue: (r) => r.email, exportValue: (r) => r.email,
      cell: (r) => <p className="truncate text-[12.5px] text-fg-muted">{r.email}</p>,
    },
    {
      key: 'roles', header: 'Roles', width: 'w-[190px] max-w-[190px]', sortable: true,
      sortValue: (r) => rolesOf(r, roles).map((x) => x.name).join(','),
      exportValue: (r) => rolesOf(r, roles).map((x) => x.code).join(' | '),
      cell: (r) => {
        const held = rolesOf(r, roles)
        if (!held.length) return <Badge tone="warning" size="sm">No role</Badge>
        return (
          <div className="flex flex-wrap gap-1">
            {held.slice(0, 2).map((x) => (
              <Badge key={x.id} tone={x.status === 'ACTIVE' ? 'primary' : 'neutral'} size="sm">
                {x.name.replace(' (custom)', '')}
              </Badge>
            ))}
            {held.length > 2 && <Badge tone="neutral" size="sm">+{held.length - 2}</Badge>}
          </div>
        )
      },
    },
    {
      key: 'privileges', header: 'Privileges', width: 'w-[136px]', align: 'right', sortable: true,
      sortValue: (r) => permsOf(r).size, exportValue: (r) => permsOf(r).size,
      headerHint: 'Effective: roles plus grants, less revocations',
      cell: (r) => {
        const size = permsOf(r).size
        const overrides = r.grantedPermissions.length + r.revokedPermissions.length
        return (
          <div className="text-right">
            <p className="tnum text-[12.5px] font-medium text-fg">
              {size}
              <span className="text-fg-subtle"> / {PERMISSIONS.length}</span>
            </p>
            {overrides > 0 && <p className="tnum text-[11px] text-warning-soft-fg">{overrides} override{overrides === 1 ? '' : 's'}</p>}
          </div>
        )
      },
    },
    {
      key: 'admin', header: 'Administrator', width: 'w-[118px]', align: 'center', sortable: true,
      sortValue: (r) => (isAdmin(r) ? 0 : 1), exportValue: (r) => (isAdmin(r) ? 'yes' : 'no'),
      headerHint: 'Can hand out privileges to others',
      cell: (r) =>
        isAdmin(r) ? (
          <Tooltip content="Can create or edit accounts and roles">
            <span>
              <Badge tone="purple" size="sm">
                <ShieldCheck className="size-3" /> Admin
              </Badge>
            </span>
          </Tooltip>
        ) : (
          <span className="text-[12px] text-fg-subtle">—</span>
        ),
    },
    {
      key: 'branch', header: 'Branch / scope', width: 'w-[148px]', sortable: true,
      sortValue: (r) => r.branchCode ?? '', exportValue: (r) => `${r.branchCode ?? ''} (${r.branchScope.join('/') || 'all'})`,
      cell: (r) => (
        <div className="min-w-0">
          <p className="text-[12.5px] text-fg">{r.branchCode ?? '—'}</p>
          <p className="truncate text-[11px] text-fg-subtle">
            {r.branchScope.length ? `sees ${r.branchScope.join(', ')}` : 'sees every branch'}
          </p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', width: 'w-[164px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge value={r.status} size="sm" />
          {r.mustChangePassword && (
            <Tooltip content="Must set a new password at next sign-in">
              <span>
                <Badge tone="warning" size="sm">Reset</Badge>
              </span>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      key: 'twoFactor', header: '2FA', width: 'w-[86px]', align: 'center', sortable: true, defaultHidden: true,
      sortValue: (r) => (r.twoFactorEnabled ? 0 : 1), exportValue: (r) => (r.twoFactorEnabled ? 'on' : 'off'),
      cell: (r) => (r.twoFactorEnabled ? <Badge tone="success" size="sm">On</Badge> : <span className="text-[12px] text-fg-subtle">Off</span>),
    },
    {
      key: 'lastLogin', header: 'Last sign-in', width: 'w-[164px]', sortable: true,
      sortValue: (r) => r.lastLoginAt ?? '', exportValue: (r) => r.lastLoginAt ?? 'never',
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{r.lastLoginAt ? fmtDateTime(r.lastLoginAt) : 'never'}</span>,
    },
    {
      key: 'created', header: 'Created', width: 'w-[130px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.createdAt, exportValue: (r) => r.createdAt.slice(0, 10),
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{fmtDateTime(r.createdAt)}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Users"
        description="Every account that can sign in, the roles it holds, and the privileges those roles add up to."
        actions={
          can('users.create') ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <UserPlus /> New account
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Accounts"
          value={users.length}
          icon={<Users />}
          accent="primary"
          sub={`${users.filter((u) => u.status === 'ACTIVE').length} active`}
        />
        <KpiCard
          label="Administrators"
          value={administrators.length}
          icon={<ShieldCheck />}
          accent={administrators.length > 3 ? 'warning' : 'purple'}
          sub={administrators.length > 3 ? 'more than three is worth reviewing' : 'can hand out privileges'}
        />
        <KpiCard
          label="Need attention"
          value={needAttention.length}
          icon={<Lock />}
          accent={needAttention.length ? 'warning' : 'success'}
          sub={needAttention.length ? 'locked, invited or unverified' : 'nothing waiting'}
        />
        <KpiCard
          label="With overrides"
          value={users.filter((u) => u.grantedPermissions.length + u.revokedPermissions.length > 0).length}
          icon={<KeyRound />}
          accent="accent"
          sub="privileges set outside their roles"
        />
      </div>

      <DataTable
        data={users}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.fullName} (${r.email})`}
        entityLabel="account"
        storageKey="users"
        exportName="tata-gemilang-users"
        searchText={(r) =>
          [r.fullName, r.email, r.jobTitle, r.branchCode, r.status, ...rolesOf(r, roles).map((x) => x.name)].filter(Boolean).join(' ')
        }
        initialSort={{ key: 'name', dir: 'asc' }}
        onRowClick={can('users.edit') ? (r) => { setEditing(r); setFormOpen(true) } : undefined}
        rowTone={(r) => (r.status === 'LOCKED' || r.status === 'SUSPENDED' ? 'bg-danger-soft/20' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['ACTIVE', 'INVITED', 'PENDING_VERIFICATION', 'LOCKED', 'SUSPENDED'].map((v) => ({
              value: v, label: v.replace(/_/g, ' ').toLowerCase(),
            })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'role', label: 'Role', values: role, onChange: setRole,
            options: roles.map((x) => ({ value: x.id, label: x.name })),
            match: (r, v) => r.roleIds.some((id) => v.includes(id)),
          },
          {
            key: 'branch', label: 'Branch', values: branch, onChange: setBranch,
            options: BRANCHES.map((b) => ({ value: b.code, label: b.label })),
            match: (r, v) => v.includes(r.branchCode ?? ''),
          },
        ]}
        onDelete={
          can('users.delete')
            ? (ids) => {
                const blocked = ids
                  .map((id) => users.find((u) => u.id === id))
                  .filter((u): u is UserAccount => !!u)
                  .map((u) => ({ user: u, reason: guard(u, (x) => ({ ...x, status: 'SUSPENDED' }), 'You cannot delete your own account.') }))
                  .filter((x) => x.reason)
                if (blocked.length) {
                  toast.push({ tone: 'error', title: 'Deletion refused', description: blocked[0].reason ?? undefined })
                  return
                }
                removeUsers(ids)
                log('Deleted', 'User', `${ids.length} account(s)`)
                toast.push({ tone: 'success', title: `${ids.length} account${ids.length === 1 ? '' : 's'} deleted` })
              }
            : undefined
        }
        deleteNote="An account cannot be recovered. Suspending it keeps the history and blocks sign-in."
        rowActions={(r) => (
          <>
            {can('users.manage') && (
              /* The account lifecycle sits in a menu: four inline buttons per row
                 crowds out the columns that matter. */
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="ghost" size="iconXs" aria-label={`Manage ${r.fullName}`}>
                    <MoreHorizontal />
                  </Button>
                </MenuTrigger>
                <MenuContent align="end" className="w-60">
                  <MenuLabel>{r.fullName}</MenuLabel>
                  {r.status === 'LOCKED' && (
                    <MenuItem
                      icon={<LockOpen />}
                      onSelect={() => {
                        unlock(r.id)
                        log('Unlocked', 'User', r.email)
                        toast.push({ tone: 'success', title: 'Account released', description: r.email })
                      }}
                    >
                      Release the lock
                    </MenuItem>
                  )}
                  {r.status === 'ACTIVE' && r.id !== me?.id && (
                    <MenuItem
                      icon={<Lock />}
                      onSelect={() => {
                        const reason = guard(r, (u) => ({ ...u, status: 'SUSPENDED' }), 'You cannot suspend your own account.')
                        if (reason) {
                          toast.push({ tone: 'error', title: 'Suspension refused', description: reason })
                          return
                        }
                        setUserStatus(r.id, 'SUSPENDED')
                        log('Suspended', 'User', r.email)
                        toast.push({ tone: 'success', title: 'Account suspended', description: r.email })
                      }}
                    >
                      Suspend this account
                    </MenuItem>
                  )}
                  {(r.status === 'SUSPENDED' || r.status === 'PENDING_VERIFICATION' || r.status === 'INVITED') && (
                    <MenuItem
                      icon={<LockOpen />}
                      onSelect={() => {
                        setUserStatus(r.id, 'ACTIVE')
                        log('Activated', 'User', r.email)
                        toast.push({ tone: 'success', title: 'Account activated', description: r.email })
                      }}
                    >
                      Activate this account
                    </MenuItem>
                  )}
                  <MenuSeparator />
                  <MenuItem
                    icon={<KeyRound />}
                    onSelect={() => {
                      const temp = forcePasswordReset(r.id)
                      log('Password reset', 'User', r.email)
                      toast.push({
                        tone: 'success',
                        title: 'Temporary password issued',
                        description: `${r.email} — ${temp}. They must change it at next sign-in.`,
                      })
                    }}
                  >
                    Issue a temporary password
                  </MenuItem>
                </MenuContent>
              </Menu>
            )}
            {can('users.edit') && (
              <Tooltip content="Edit account">
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
            )}
            {can('users.delete') && (
              <Tooltip content="Delete account">
                <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}>
                  <Trash2 />
                </Button>
              </Tooltip>
            )}
          </>
        )}
        importFields={
          can('users.create')
            ? [
                { key: 'email', label: 'Email', required: true },
                { key: 'fullName', label: 'Full name', required: true },
                { key: 'jobTitle', label: 'Job title' },
                { key: 'roleCodes', label: 'Role codes', hint: 'separated by |, e.g. AREA_COORDINATOR|SITE_SUPERVISOR' },
                { key: 'branchCode', label: 'Home branch', hint: 'JKT / BDG / SBY / BPN' },
                { key: 'branchScope', label: 'Data scope', hint: 'separated by |, empty means every branch' },
                { key: 'status', label: 'Status', hint: 'ACTIVE / INVITED / SUSPENDED' },
              ]
            : undefined
        }
        importSample={{
          email: 'nama.baru@tatagemilang.co.id', fullName: 'Nama Baru', jobTitle: 'Koordinator Area',
          roleCodes: 'AREA_COORDINATOR', branchCode: 'BDG', branchScope: 'BDG', status: 'INVITED',
        }}
        toImportRow={(r) => ({
          email: r.email, fullName: r.fullName, jobTitle: r.jobTitle,
          roleCodes: rolesOf(r, roles).map((x) => x.code).join('|'),
          branchCode: r.branchCode ?? '', branchScope: r.branchScope.join('|'), status: r.status,
        })}
        onImport={
          can('users.create')
            ? (rows) => {
                let skipped = 0
                rows.forEach((row) => {
                  const email = (row.email ?? '').trim().toLowerCase()
                  if (!email) {
                    skipped += 1
                    return
                  }
                  const existing = users.find((u) => u.email.toLowerCase() === email)
                  const roleIds = (row.roleCodes ?? '')
                    .split('|')
                    .map((c) => roles.find((x) => x.code === c.trim())?.id)
                    .filter((id): id is string => !!id)
                  upsertUser({
                    ...(existing ?? {}),
                    id: existing?.id ?? uid('usr'),
                    email,
                    /* Imported accounts never carry a password from the file. */
                    password: existing?.password ?? `Tg-${Math.random().toString(36).slice(2, 8)}!2026`,
                    fullName: row.fullName || existing?.fullName || email,
                    jobTitle: row.jobTitle || existing?.jobTitle || 'Team member',
                    status: (['ACTIVE', 'INVITED', 'SUSPENDED', 'PENDING_VERIFICATION', 'LOCKED'].includes(row.status)
                      ? row.status
                      : 'INVITED') as UserAccount['status'],
                    roleIds: roleIds.length ? roleIds : existing?.roleIds ?? [],
                    grantedPermissions: existing?.grantedPermissions ?? [],
                    revokedPermissions: existing?.revokedPermissions ?? [],
                    branchScope: row.branchScope ? row.branchScope.split('|').map((b) => b.trim()).filter(Boolean) : existing?.branchScope ?? [],
                    branchCode: row.branchCode || existing?.branchCode,
                    failedAttempts: existing?.failedAttempts ?? 0,
                    mustChangePassword: existing?.mustChangePassword ?? true,
                    twoFactorEnabled: existing?.twoFactorEnabled ?? false,
                    createdAt: existing?.createdAt ?? new Date().toISOString(),
                  } as UserAccount)
                })
                log('Imported', 'User', `${rows.length - skipped} account(s)`)
                toast.push({
                  tone: 'success',
                  title: `${rows.length - skipped} account${rows.length - skipped === 1 ? '' : 's'} imported`,
                  description: 'Imported accounts start with a temporary password and must change it at first sign-in.',
                })
              }
            : undefined
        }
        footerSummary={(rows) => (
          <span className="tnum">
            {rows.filter((r) => r.status === 'ACTIVE').length} active · {rows.filter(isAdmin).length} administrator
            {rows.filter(isAdmin).length === 1 ? '' : 's'} in this view
          </span>
        )}
        emptyTitle="No accounts"
        emptyDescription="Create the first account, or import a list from your HR system."
      />

      <UserForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="account"
        items={deleting ? [`${deleting.fullName} — ${deleting.email}`] : []}
        cascade={
          deleting
            ? [
                `${effectivePermissions(deleting, roles).size} privileges are removed with it`,
                ...(isAdmin(deleting) ? ['This account can currently administer users and roles'] : []),
              ]
            : []
        }
        destructiveNote="Suspending keeps the account and its history; deleting does not."
        onConfirm={() => {
          if (!deleting) return
          const reason = guard(deleting, (u) => ({ ...u, status: 'SUSPENDED' }), 'You cannot delete your own account.')
          if (reason) {
            toast.push({ tone: 'error', title: 'Deletion refused', description: reason })
            setDeleting(null)
            return
          }
          removeUsers([deleting.id])
          log('Deleted', 'User', deleting.email)
          toast.push({ tone: 'success', title: 'Account deleted', description: deleting.email })
          setDeleting(null)
        }}
      />
    </>
  )
}
