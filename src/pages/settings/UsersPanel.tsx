import { KeyRound, MailCheck, ShieldCheck, UserX, Users } from 'lucide-react'
import type { UserAccount } from '@/data/types'
import { ACCOUNT_STATUSES, AUTH_POLICY, roleLabel } from '@/data/reference'
import { useAuth, useCurrentUser } from '@/store/useAuth'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { fmtDateTime } from '@/lib/format'
import { useToast } from '@/components/ui/toast'

const statusMeta = (s: UserAccount['status']) => ACCOUNT_STATUSES.find((x) => x.value === s)

export function UsersPanel() {
  const toast = useToast()
  const { users, tokens, unlock, verifyEmail } = useAuth()
  const me = useCurrentUser()

  const locked = users.filter((u) => u.status === 'LOCKED')
  const unverified = users.filter((u) => u.status === 'PENDING_VERIFICATION' || u.status === 'INVITED')
  const liveTokens = tokens.filter((t) => !t.used && new Date(t.expiresAt) > new Date())

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader icon={<Users />} title="Accounts" description="Who can open this workspace." />
          <CardBody>
            <p className="tnum text-[26px] font-semibold leading-none text-fg">{users.length}</p>
            <p className="mt-1.5 text-[12px] text-fg-muted">
              {users.filter((u) => u.status === 'ACTIVE').length} active · {unverified.length} awaiting verification
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<KeyRound />} title="Sign-in policy" description="Enforced by the demo sign-in screen." />
          <CardBody className="space-y-1 text-[12.5px] leading-relaxed text-fg-muted">
            <p>Locks after <span className="font-medium text-fg">{AUTH_POLICY.maxFailedAttempts}</span> failed attempts for <span className="font-medium text-fg">{AUTH_POLICY.lockMinutes} minutes</span>.</p>
            <p>Passwords: at least {AUTH_POLICY.minPasswordLength} characters with upper, lower, digit and symbol.</p>
            <p>Reset links expire after {AUTH_POLICY.resetTokenMinutes} minutes and work once.</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<ShieldCheck />} title="Outstanding" description="Things an administrator should clear." />
          <CardBody className="space-y-1 text-[12.5px] leading-relaxed text-fg-muted">
            <p>{locked.length} locked account{locked.length === 1 ? '' : 's'}</p>
            <p>{unverified.length} unverified or invited</p>
            <p>{liveTokens.length} reset link{liveTokens.length === 1 ? '' : 's'} still live</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          icon={<Users />}
          title="User accounts"
          description="Demo credentials live in the browser only. A real deployment authenticates on the server and never holds a password client-side."
        />
        <CardBody className="p-0">
          <div className="divide-y divide-border">
            {users.map((u) => {
              const meta = statusMeta(u.status)
              return (
                <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-[12px] font-semibold text-primary-soft-fg">
                    {u.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-medium text-fg">{u.fullName}</p>
                      {me?.id === u.id && <Badge tone="primary" size="sm">You</Badge>}
                      <Badge tone={(meta?.tone ?? 'neutral') as never} size="sm" dot>{meta?.label ?? u.status}</Badge>
                      {u.twoFactorEnabled && <Badge tone="success" size="sm">2FA</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-[11.5px] text-fg-muted">
                      {u.email} · {u.jobTitle}
                    </p>
                    <p className="mt-0.5 text-[11px] text-fg-subtle">
                      {roleLabel(u.role)}
                      {u.branchCode && ` · ${u.branchCode}`}
                      {u.lastLoginAt ? ` · last signed in ${fmtDateTime(u.lastLoginAt)}` : ' · never signed in'}
                      {u.failedAttempts > 0 && ` · ${u.failedAttempts} failed attempt${u.failedAttempts === 1 ? '' : 's'}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {u.status === 'LOCKED' && (
                      <Tooltip content={meta?.hint ?? ''}>
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => {
                            unlock(u.id)
                            toast.push({ tone: 'success', title: `${u.fullName} released`, description: 'They can sign in again immediately.' })
                          }}
                        >
                          <UserX /> Release lock
                        </Button>
                      </Tooltip>
                    )}
                    {(u.status === 'PENDING_VERIFICATION' || u.status === 'INVITED') && (
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => {
                          verifyEmail(u.email)
                          toast.push({ tone: 'success', title: `${u.email} verified` })
                        }}
                      >
                        <MailCheck /> Verify
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
