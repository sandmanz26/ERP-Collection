import * as React from 'react'
import type { Role, UserAccount } from '@/data/types'
import { ADMINISTRATIVE_KEYS, PERMISSIONS, permissionByKey } from '@/data/permissions'
import { useCurrentUser } from '@/store/useAuth'
import { useErp } from '@/store/useErp'

/* ------------------------------------------------------------------
   Access control.

       effective = union(active roles) + granted − revoked

   Three deliberate choices:
   · A role only ever grants. Denial lives on the account, so a role can
     be read as a policy without having to hold every exception in mind.
   · Revoked always wins. An exception that a role change can silently
     undo is not an exception.
   · An inactive role grants nothing, so an engagement can be switched
     off without unpicking who held it.
   ------------------------------------------------------------------ */

export type PermissionSource = 'ROLE' | 'GRANTED' | 'REVOKED' | 'NONE'

export function rolesOf(user: UserAccount | null | undefined, roles: Role[]) {
  if (!user) return []
  return user.roleIds.map((id) => roles.find((r) => r.id === id)).filter((r): r is Role => !!r)
}

/** Roles that are switched on. An inactive role is kept for the record but grants nothing. */
export const activeRolesOf = (user: UserAccount | null | undefined, roles: Role[]) =>
  rolesOf(user, roles).filter((r) => r.status === 'ACTIVE')

export function effectivePermissions(user: UserAccount | null | undefined, roles: Role[]): Set<string> {
  if (!user) return new Set()
  const keys = new Set<string>()
  activeRolesOf(user, roles).forEach((role) => role.permissions.forEach((k) => keys.add(k)))
  user.grantedPermissions.forEach((k) => keys.add(k))
  user.revokedPermissions.forEach((k) => keys.delete(k))
  return keys
}

/**
 * Where a privilege came from, so an administrator debugging "why can this
 * person do that" gets an answer instead of a checkbox.
 */
export function permissionSource(user: UserAccount, roles: Role[], key: string): { source: PermissionSource; roles: Role[] } {
  const fromRoles = activeRolesOf(user, roles).filter((r) => r.permissions.includes(key))
  if (user.revokedPermissions.includes(key)) return { source: 'REVOKED', roles: fromRoles }
  if (fromRoles.length) return { source: 'ROLE', roles: fromRoles }
  if (user.grantedPermissions.includes(key)) return { source: 'GRANTED', roles: [] }
  return { source: 'NONE', roles: [] }
}

/** A signed-out or non-active account can do nothing, whatever its roles say. */
export function can(user: UserAccount | null | undefined, roles: Role[], key: string) {
  if (!user || user.status !== 'ACTIVE') return false
  return effectivePermissions(user, roles).has(key)
}

/** The privilege check every page and every control uses. */
export function useCan() {
  const user = useCurrentUser()
  const roles = useErp((s) => s.roles)
  return React.useMemo(() => {
    const keys = user?.status === 'ACTIVE' ? effectivePermissions(user, roles) : new Set<string>()
    return (key: string) => keys.has(key)
  }, [user, roles])
}

/** The account's own privilege set, for the pages that display it. */
export function useMyPermissions() {
  const user = useCurrentUser()
  const roles = useErp((s) => s.roles)
  return React.useMemo(() => effectivePermissions(user, roles), [user, roles])
}

export const usersOfRole = (roleId: string, users: UserAccount[]) => users.filter((u) => u.roleIds.includes(roleId))

/** The role shown next to a person's name — the first one they hold. */
export function primaryRoleName(user: UserAccount | null | undefined, roles: Role[]) {
  const list = rolesOf(user, roles)
  if (!list.length) return 'No role'
  return list[0].name
}

/* ================================================================
   Guard rails

   Every one of these exists because the alternative is a system that
   can be locked so that nobody, including the person who did it, can
   put it right.
   ================================================================ */

/** Accounts that can still hand out privileges, ignoring one that is about to change. */
function administratorsAfter(users: UserAccount[], roles: Role[], change: (u: UserAccount) => UserAccount) {
  return users
    .map((u) => change(u))
    .filter((u) => u.status === 'ACTIVE')
    .filter((u) => {
      const keys = effectivePermissions(u, roles)
      return ADMINISTRATIVE_KEYS.some((k) => keys.has(k))
    })
}

/**
 * Would this edit leave nobody able to administer accounts and roles?
 * Returns the reason to refuse, or null when the change is safe.
 */
export function wouldOrphanAdministration(
  users: UserAccount[],
  roles: Role[],
  change: (u: UserAccount) => UserAccount,
): string | null {
  const left = administratorsAfter(users, roles, change)
  if (left.length > 0) return null
  return 'This would leave no active account able to administer users and roles. Give someone else those privileges first.'
}

/** The same question, asked about a change to a role rather than to an account. */
export function wouldOrphanAdministrationByRole(
  users: UserAccount[],
  roles: Role[],
  nextRole: Role,
): string | null {
  const patched = roles.map((r) => (r.id === nextRole.id ? nextRole : r))
  const left = users
    .filter((u) => u.status === 'ACTIVE')
    .filter((u) => {
      const keys = effectivePermissions(u, patched)
      return ADMINISTRATIVE_KEYS.some((k) => keys.has(k))
    })
  if (left.length > 0) return null
  return 'Every account able to administer users and roles gets that from this role. Grant it elsewhere before taking it away here.'
}

/** Privileges an account cannot request for itself during self-registration. */
export const isAdministrativeRole = (role: Role) => role.permissions.some((k) => ADMINISTRATIVE_KEYS.includes(k))

/** Summary counts for a role, used on the role register and in the editor. */
export function roleSummary(role: Role) {
  const byRisk = { LOW: 0, MEDIUM: 0, HIGH: 0 }
  role.permissions.forEach((k) => {
    const def = permissionByKey.get(k)
    if (def) byRisk[def.risk] += 1
  })
  return {
    total: role.permissions.length,
    of: PERMISSIONS.length,
    pct: Math.round((role.permissions.length / PERMISSIONS.length) * 100),
    byRisk,
    modules: new Set(role.permissions.map((k) => permissionByKey.get(k)?.module).filter(Boolean)).size,
  }
}
