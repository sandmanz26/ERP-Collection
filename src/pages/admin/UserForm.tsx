import * as React from 'react'
import { AlertTriangle, KeyRound, ShieldCheck, UserRound } from 'lucide-react'
import type { UserAccount } from '@/data/types'
import { ACTION_ORDER, MODULES, PERMISSIONS, permissionsOf } from '@/data/permissions'
import { BRANCHES } from '@/data/reference'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { MultiSelect, Select } from '@/components/ui/select'
import { Checkbox, Segmented, SwitchField } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useAuth, useCurrentUser } from '@/store/useAuth'
import { useErp } from '@/store/useErp'
import { cn, uid } from '@/lib/utils'
import { effectivePermissions, permissionSource, roleSummary, wouldOrphanAdministration } from '@/lib/access'

type Override = 'DEFAULT' | 'GRANT' | 'REVOKE'

const blank = (): UserAccount => ({
  id: uid('usr'), email: '', password: '', fullName: '', jobTitle: '', status: 'INVITED',
  roleIds: [], grantedPermissions: [], revokedPermissions: [], branchScope: [],
  branchCode: 'JKT', phone: '', failedAttempts: 0, mustChangePassword: true, twoFactorEnabled: false,
  createdAt: new Date().toISOString(),
})

const temporaryPassword = () => `Tg-${Math.random().toString(36).slice(2, 8)}!${new Date().getFullYear()}`

export function UserForm({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: UserAccount | null
}) {
  const { users, upsertUser } = useAuth()
  const roles = useErp((s) => s.roles)
  const log = useErp((s) => s.log)
  const me = useCurrentUser()
  const toast = useToast()
  const [tab, setTab] = React.useState<'account' | 'roles' | 'effective'>('account')
  const [draft, setDraft] = React.useState<UserAccount>(blank)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [expanded, setExpanded] = React.useState<string[]>([])

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank())
      setTab('account')
      setErrors({})
      setExpanded([])
    }
  }, [open, initial])

  const set = <K extends keyof UserAccount>(k: K, v: UserAccount[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const effective = React.useMemo(() => effectivePermissions(draft, roles), [draft, roles])
  const isSelf = me?.id === draft.id

  const overrideOf = (key: string): Override => {
    if (draft.revokedPermissions.includes(key)) return 'REVOKE'
    if (draft.grantedPermissions.includes(key)) return 'GRANT'
    return 'DEFAULT'
  }

  const setOverride = (key: string, next: Override) =>
    setDraft((d) => ({
      ...d,
      grantedPermissions: next === 'GRANT' ? [...new Set([...d.grantedPermissions, key])] : d.grantedPermissions.filter((k) => k !== key),
      revokedPermissions: next === 'REVOKE' ? [...new Set([...d.revokedPermissions, key])] : d.revokedPermissions.filter((k) => k !== key),
    }))

  const toggleRole = (roleId: string) =>
    setDraft((d) => ({
      ...d,
      roleIds: d.roleIds.includes(roleId) ? d.roleIds.filter((r) => r !== roleId) : [...d.roleIds, roleId],
    }))

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.fullName.trim()) e.fullName = 'The full name is required'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email.trim())) e.email = 'That does not look like an email address'
    if (users.some((u) => u.email.toLowerCase() === draft.email.trim().toLowerCase() && u.id !== draft.id)) {
      e.email = 'Another account already uses this address'
    }
    if (draft.roleIds.length === 0) e.roles = 'Give the account at least one role — an account with none can sign in and do nothing'

    /* The check that stops the system being locked against everyone. */
    const orphan = wouldOrphanAdministration(
      initial ? users : [...users, draft],
      roles,
      (u) => (u.id === draft.id ? draft : u),
    )
    if (orphan) e.roles = orphan

    setErrors(e)
    if (e.roles) setTab('roles')
    else if (Object.keys(e).length) setTab('account')
    if (Object.keys(e).length) return

    const password = draft.password || temporaryPassword()
    upsertUser({ ...draft, email: draft.email.trim().toLowerCase(), password })
    log(initial ? 'Updated' : 'Created', 'User', `${draft.email} · ${draft.roleIds.length} role(s), ${effective.size} privileges`)
    toast.push({
      tone: 'success',
      title: initial ? 'Account updated' : 'Account created',
      description: initial
        ? `${draft.fullName} now holds ${effective.size} privileges.`
        : `Temporary password: ${password} — the account must change it at first sign-in.`,
    })
    onOpenChange(false)
  }

  const overrideCount = draft.grantedPermissions.length + draft.revokedPermissions.length

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-3xl"
      eyebrow={
        <Badge tone={initial ? 'primary' : 'accent'} size="sm">
          {initial ? `Editing ${initial.email}` : 'New account'}
        </Badge>
      }
      title={initial ? initial.fullName : 'Create an account'}
      description="Roles carry the policy; the overrides carry the exception. What the account can actually do is on the effective access tab."
      footer={
        <>
          <span className="mr-auto text-[12px] text-fg-muted">
            <span className="tnum font-medium text-fg">{effective.size}</span> of {PERMISSIONS.length} privileges
            {overrideCount > 0 && <span className="text-warning-soft-fg"> · {overrideCount} override{overrideCount === 1 ? '' : 's'}</span>}
          </span>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save}>
            {initial ? 'Save changes' : 'Create account'}
          </Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        className="px-5"
        items={[
          { value: 'account', label: 'Account', icon: <UserRound /> },
          { value: 'roles', label: 'Roles & overrides', icon: <ShieldCheck />, count: draft.roleIds.length },
          { value: 'effective', label: 'Effective access', icon: <KeyRound />, count: effective.size },
        ]}
      />

      {tab === 'account' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Full name" required error={errors.fullName}>
            <Input value={draft.fullName} onChange={(e) => set('fullName', e.target.value)} invalid={!!errors.fullName} />
          </Field>
          <Field label="Job title">
            <Input value={draft.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} placeholder="Koordinator Area" />
          </Field>
          <Field label="Email address" required error={errors.email} className="sm:col-span-2">
            <Input
              type="email"
              value={draft.email}
              onChange={(e) => set('email', e.target.value)}
              invalid={!!errors.email}
              placeholder="nama@tatagemilang.co.id"
            />
          </Field>
          <Field label="Phone">
            <Input value={draft.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Home branch">
            <Select
              value={draft.branchCode ?? 'JKT'}
              onChange={(v) => set('branchCode', v)}
              options={BRANCHES.map((b) => ({ value: b.code, label: b.label }))}
            />
          </Field>
          <Field
            label="Status"
            help={isSelf ? 'You cannot suspend or lock your own account from here.' : undefined}
          >
            <Select
              value={draft.status}
              onChange={(v) => set('status', v)}
              disabled={isSelf}
              options={[
                { value: 'ACTIVE', label: 'Active', description: 'Can sign in and use its privileges' },
                { value: 'INVITED', label: 'Invited', description: 'Waiting for the invitation to be accepted' },
                { value: 'PENDING_VERIFICATION', label: 'Pending verification', description: 'Email address not verified yet' },
                { value: 'LOCKED', label: 'Locked', description: 'Too many failed sign-in attempts' },
                { value: 'SUSPENDED', label: 'Suspended', description: 'Disabled by an administrator' },
              ]}
            />
          </Field>
          <Field
            label="Data scope"
            className="sm:col-span-2"
            help="Branches whose data this account may work with. Leave empty for the whole company."
          >
            <MultiSelect
              values={draft.branchScope}
              onChange={(v) => set('branchScope', v)}
              options={BRANCHES.map((b) => ({ value: b.code, label: b.label }))}
              placeholder="Every branch"
              maxTags={4}
            />
          </Field>
          <div className="sm:col-span-2 space-y-3.5 rounded-xl border border-border bg-surface-sunken p-3.5">
            <SwitchField
              checked={draft.mustChangePassword}
              onChange={(v) => set('mustChangePassword', v)}
              label="Must change password at next sign-in"
              description="Set automatically for a new account or after an administrator resets the password."
            />
            <SwitchField
              checked={draft.twoFactorEnabled}
              onChange={(v) => set('twoFactorEnabled', v)}
              label="Two-factor authentication enabled"
              description="Recorded here; the demo build does not challenge for a second factor."
            />
          </div>
        </div>
      )}

      {tab === 'roles' && (
        <div className="space-y-5 p-5">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[12.5px] font-medium text-fg">Roles</p>
              <p className="text-[11.5px] text-fg-muted">An account may hold several; the privileges add up.</p>
            </div>
            {errors.roles && (
              <p className="mb-2 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-[12px] leading-relaxed text-danger-soft-fg">
                <AlertTriangle className="mt-px size-3.5 shrink-0" />
                {errors.roles}
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {roles.map((role) => {
                const on = draft.roleIds.includes(role.id)
                const summary = roleSummary(role)
                return (
                  /* A label, not a button: the checkbox inside is the control, and a
                     button inside a button is invalid markup. */
                  <label
                    key={role.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-left transition-colors',
                      on ? 'border-primary bg-primary-soft/50' : 'border-border bg-surface hover:border-border-strong',
                    )}
                  >
                    <Checkbox checked={on} onChange={() => toggleRole(role.id)} aria-label={role.name} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-fg">{role.name}</span>
                        {role.isSystem && <Badge tone="neutral" size="sm">System</Badge>}
                        {role.status !== 'ACTIVE' && <Badge tone="warning" size="sm">Inactive</Badge>}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-fg-muted">{role.description}</span>
                      <span className="tnum mt-1.5 block text-[11px] text-fg-subtle">
                        {summary.total} privileges · {summary.byRisk.HIGH} high risk
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[12.5px] font-medium text-fg">Privilege overrides</p>
              <p className="text-[11.5px] text-fg-muted">Exceptions for this person only. Revoked always wins.</p>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {MODULES.map((module) => {
                const perms = permissionsOf(module.key).sort(
                  (a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action),
                )
                const isOpen = expanded.includes(module.key)
                const granted = perms.filter((p) => effective.has(p.key)).length
                const overrides = perms.filter((p) => overrideOf(p.key) !== 'DEFAULT').length
                return (
                  <div key={module.key}>
                    <button
                      type="button"
                      onClick={() => setExpanded((x) => (isOpen ? x.filter((k) => k !== module.key) : [...x, module.key]))}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-bg-muted/70"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-fg">{module.label}</span>
                        <span className="block truncate text-[11px] text-fg-subtle">{module.description}</span>
                      </span>
                      {overrides > 0 && <Badge tone="warning" size="sm">{overrides} override{overrides === 1 ? '' : 's'}</Badge>}
                      <span className="tnum shrink-0 text-[11.5px] text-fg-muted">
                        {granted}/{perms.length}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="space-y-1.5 bg-surface-sunken px-3.5 py-3">
                        {perms.map((p) => {
                          const { source, roles: from } = permissionSource(draft, roles, p.key)
                          const value = overrideOf(p.key)
                          return (
                            <div key={p.key} className="flex items-center gap-3">
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5">
                                  <span className="truncate text-[12.5px] text-fg">{p.label}</span>
                                  {p.risk === 'HIGH' && (
                                    <Tooltip content="High-risk privilege">
                                      <span>
                                        <Badge tone="danger" size="sm">High</Badge>
                                      </span>
                                    </Tooltip>
                                  )}
                                </span>
                                <span className="block truncate font-mono text-[10.5px] text-fg-subtle">{p.key}</span>
                              </span>
                              <span className="w-[128px] shrink-0 text-right text-[11px] text-fg-muted">
                                {from.length > 0 ? `from ${from[0].name}${from.length > 1 ? ` +${from.length - 1}` : ''}` : 'not in any role'}
                              </span>
                              <Segmented
                                size="sm"
                                value={value}
                                onChange={(v) => setOverride(p.key, v as Override)}
                                options={[
                                  { value: 'DEFAULT', label: 'Default' },
                                  { value: 'GRANT', label: 'Grant' },
                                  { value: 'REVOKE', label: 'Revoke' },
                                ]}
                              />
                              <span
                                className={cn(
                                  'w-3 shrink-0 rounded-full',
                                  source === 'NONE' || source === 'REVOKED' ? 'h-3 bg-border-strong' : 'h-3 bg-success',
                                )}
                                aria-hidden
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'effective' && (
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-surface-sunken px-3.5 py-3 text-[12px]">
            <span className="text-fg-muted">
              Total <span className="tnum ml-1 font-semibold text-fg">{effective.size}</span>
            </span>
            <span className="text-fg-muted">
              From roles{' '}
              <span className="tnum ml-1 font-semibold text-fg">
                {PERMISSIONS.filter((p) => permissionSource(draft, roles, p.key).source === 'ROLE').length}
              </span>
            </span>
            <span className="text-fg-muted">
              Granted directly <span className="tnum ml-1 font-semibold text-accent-soft-fg">{draft.grantedPermissions.length}</span>
            </span>
            <span className="text-fg-muted">
              Revoked <span className="tnum ml-1 font-semibold text-danger">{draft.revokedPermissions.length}</span>
            </span>
          </div>

          {MODULES.map((module) => {
            const perms = permissionsOf(module.key).filter((p) => effective.has(p.key))
            if (perms.length === 0) return null
            return (
              <div key={module.key}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">{module.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {perms.map((p) => {
                    const { source } = permissionSource(draft, roles, p.key)
                    return (
                      <Tooltip key={p.key} content={`${p.description} (${source === 'GRANTED' ? 'granted directly' : 'from a role'})`}>
                        <span>
                          <Badge tone={source === 'GRANTED' ? 'accent' : 'primary'} size="sm">
                            {p.action}
                          </Badge>
                        </span>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {draft.revokedPermissions.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-danger">Revoked despite a role granting it</p>
              <div className="flex flex-wrap gap-1.5">
                {draft.revokedPermissions.map((k) => (
                  <Badge key={k} tone="danger" size="sm">{k}</Badge>
                ))}
              </div>
            </div>
          )}

          {effective.size === 0 && (
            <p className="rounded-xl border border-dashed border-border-strong px-4 py-8 text-center text-[12.5px] text-fg-muted">
              This account can sign in and see nothing. Give it a role.
            </p>
          )}
        </div>
      )}
    </Sheet>
  )
}
