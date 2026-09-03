import * as React from 'react'
import { AlertTriangle, KeyRound, ShieldCheck } from 'lucide-react'
import type { Role } from '@/data/types'
import { ACTION_ORDER, MODULES, PERMISSIONS, permissionsOf } from '@/data/permissions'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/store/useAuth'
import { useErp } from '@/store/useErp'
import { cn, uid } from '@/lib/utils'
import { roleSummary, usersOfRole, wouldOrphanAdministrationByRole } from '@/lib/access'

const blank = (): Role => ({
  id: uid('rol'), code: '', name: '', description: '', permissions: [], isSystem: false,
  status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: '',
})

export function RoleForm({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Role | null
}) {
  const { roles, upsertRole } = useErp()
  const users = useAuth((s) => s.users)
  const toast = useToast()
  const [draft, setDraft] = React.useState<Role>(blank)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank())
      setErrors({})
    }
  }, [open, initial])

  const set = <K extends keyof Role>(k: K, v: Role[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const has = (key: string) => draft.permissions.includes(key)
  const summary = roleSummary(draft)
  const holders = initial ? usersOfRole(initial.id, users) : []
  /* Super Administrator is the way back in when a role has been mis-configured,
     so the interface never lets it be edited. */
  const locked = !!initial?.isSystem && initial.code === 'SUPER_ADMIN'

  const toggle = (key: string) =>
    setDraft((d) => ({
      ...d,
      permissions: d.permissions.includes(key) ? d.permissions.filter((k) => k !== key) : [...d.permissions, key],
    }))

  const toggleModule = (moduleKey: string) => {
    const keys = permissionsOf(moduleKey as never).map((p) => p.key)
    const allOn = keys.every((k) => draft.permissions.includes(k))
    setDraft((d) => ({
      ...d,
      permissions: allOn ? d.permissions.filter((k) => !keys.includes(k)) : [...new Set([...d.permissions, ...keys])],
    }))
  }

  const toggleAction = (action: string) => {
    const keys = PERMISSIONS.filter((p) => p.action === action).map((p) => p.key)
    const allOn = keys.every((k) => draft.permissions.includes(k))
    setDraft((d) => ({
      ...d,
      permissions: allOn ? d.permissions.filter((k) => !keys.includes(k)) : [...new Set([...d.permissions, ...keys])],
    }))
  }

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.code.trim()) e.code = 'A role code is required'
    if (roles.some((r) => r.code === draft.code && r.id !== draft.id)) e.code = 'This code is already used'
    if (!draft.name.trim()) e.name = 'The role name is required'
    if (draft.permissions.length === 0) e.permissions = 'A role that grants nothing is not a role'

    if (initial) {
      const orphan = wouldOrphanAdministrationByRole(users, roles, draft)
      if (orphan) e.permissions = orphan
    }
    setErrors(e)
    if (Object.keys(e).length) return

    upsertRole(draft)
    toast.push({
      tone: 'success',
      title: initial ? 'Role updated' : 'Role created',
      description: holders.length
        ? `${draft.name} — ${draft.permissions.length} privileges, affecting ${holders.length} account${holders.length === 1 ? '' : 's'} immediately.`
        : `${draft.name} — ${draft.permissions.length} privileges.`,
    })
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-4xl"
      eyebrow={
        <div className="flex items-center gap-1.5">
          <Badge tone={initial ? 'primary' : 'accent'} size="sm">{initial ? `Editing ${initial.code}` : 'New role'}</Badge>
          {initial?.isSystem && <Badge tone="neutral" size="sm">System role</Badge>}
        </div>
      }
      title={initial ? initial.name : 'Create a role'}
      description={
        locked
          ? 'Super Administrator is fixed: it is the account that can put right a role someone else has broken.'
          : 'A role grants privileges. It never denies them — an exception for one person belongs on their account.'
      }
      footer={
        <>
          <span className="mr-auto text-[12px] text-fg-muted">
            <span className="tnum font-medium text-fg">{summary.total}</span> of {PERMISSIONS.length} privileges
            {holders.length > 0 && <span> · {holders.length} account{holders.length === 1 ? '' : 's'} affected</span>}
          </span>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={locked}>
            {initial ? 'Save changes' : 'Create role'}
          </Button>
        </>
      }
    >
      <div className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role code" required error={errors.code}>
            <Input
              value={draft.code}
              onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              className="font-mono"
              placeholder="SITE_SUPERVISOR"
              disabled={locked || !!initial?.isSystem}
              invalid={!!errors.code}
            />
          </Field>
          <Field label="Status" help="An inactive role grants nothing, without having to unassign it from anyone.">
            <Select
              value={draft.status}
              onChange={(v) => set('status', v)}
              disabled={locked}
              options={[
                { value: 'ACTIVE', label: 'Active', description: 'Grants its privileges' },
                { value: 'INACTIVE', label: 'Inactive', description: 'Kept on the account but grants nothing' },
              ]}
            />
          </Field>
          <Field label="Role name" required error={errors.name} className="sm:col-span-2">
            <Input value={draft.name} onChange={(e) => set('name', e.target.value)} disabled={locked} invalid={!!errors.name} />
          </Field>
          <Field label="Description" className="sm:col-span-2" hint="Who this is for, in one sentence">
            <Textarea value={draft.description} onChange={(e) => set('description', e.target.value)} rows={2} disabled={locked} />
          </Field>
        </div>

        <div className="grid gap-3 rounded-xl border border-border bg-surface-sunken p-3.5 sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Coverage</p>
            <p className="tnum mt-1 text-[18px] font-semibold text-fg">{summary.pct}%</p>
            <Progress className="mt-1.5" value={summary.pct} tone={summary.pct > 80 ? 'warning' : 'primary'} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Modules</p>
            <p className="tnum mt-1 text-[18px] font-semibold text-fg">{summary.modules} / {MODULES.length}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">High risk</p>
            <p className={cn('tnum mt-1 text-[18px] font-semibold', summary.byRisk.HIGH ? 'text-danger' : 'text-fg')}>
              {summary.byRisk.HIGH}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Accounts holding it</p>
            <p className="tnum mt-1 text-[18px] font-semibold text-fg">{holders.length}</p>
          </div>
        </div>

        {errors.permissions && (
          <p className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-[12px] leading-relaxed text-danger-soft-fg">
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            {errors.permissions}
          </p>
        )}

        {holders.length > 0 && !locked && (
          <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-[12px] leading-relaxed text-warning-soft-fg">
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            {holders.length} account{holders.length === 1 ? '' : 's'} hold{holders.length === 1 ? 's' : ''} this role — {holders.slice(0, 3).map((u) => u.fullName).join(', ')}
            {holders.length > 3 ? ` and ${holders.length - 3} more` : ''}. What you change here changes what they can do, at their next action.
          </p>
        )}

        {/* ---------- the privilege matrix ---------- */}
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted">
                    Module
                  </th>
                  {ACTION_ORDER.map((action) => (
                    <th
                      key={action}
                      className="whitespace-nowrap border-b border-border bg-surface-sunken px-2 py-2 text-center text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted"
                    >
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => toggleAction(action)}
                        className="transition-colors hover:text-fg disabled:pointer-events-none"
                        title={`Toggle ${action} everywhere it exists`}
                      >
                        {action}
                      </button>
                    </th>
                  ))}
                  <th className="whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-right text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted">
                    All
                  </th>
                </tr>
              </thead>
              <tbody>
                {MODULES.map((module) => {
                  const perms = permissionsOf(module.key)
                  const on = perms.filter((p) => has(p.key)).length
                  return (
                    <tr key={module.key} className={on > 0 ? 'bg-primary-soft/25' : undefined}>
                      <td className="sticky left-0 z-10 border-b border-border bg-inherit px-3 py-2">
                        <p className="whitespace-nowrap text-[12.5px] font-medium text-fg">{module.label}</p>
                        <p className="tnum text-[11px] text-fg-subtle">{on} of {perms.length}</p>
                      </td>
                      {ACTION_ORDER.map((action) => {
                        const def = perms.find((p) => p.action === action)
                        if (!def) {
                          return <td key={action} className="border-b border-border px-2 py-2 text-center text-fg-subtle/40">·</td>
                        }
                        return (
                          <td key={action} className="border-b border-border px-2 py-2 text-center">
                            <Tooltip content={`${def.key} — ${def.description}`}>
                              <span className="inline-flex">
                                <Checkbox
                                  checked={has(def.key)}
                                  disabled={locked}
                                  onChange={() => toggle(def.key)}
                                  aria-label={def.label}
                                  className={def.risk === 'HIGH' && has(def.key) ? 'border-danger bg-danger' : undefined}
                                />
                              </span>
                            </Tooltip>
                          </td>
                        )
                      })}
                      <td className="border-b border-border px-3 py-2 text-right">
                        <Button variant="ghost" size="xs" disabled={locked} onClick={() => toggleModule(module.key)}>
                          {on === perms.length ? 'None' : 'All'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-surface-sunken/60 px-3.5 py-2.5 text-[11.5px] text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Column headers toggle that action across every module.
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-[4px] bg-danger" /> High-risk privilege — delete, approve, or account administration.
            </span>
            <span className="inline-flex items-center gap-1.5">
              <KeyRound className="size-3.5" /> Hover any box for what it actually allows.
            </span>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
