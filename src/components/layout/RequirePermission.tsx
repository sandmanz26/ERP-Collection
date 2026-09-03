import { Link, Outlet } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { rolesOf, useCan } from '@/lib/access'
import { useCurrentUser } from '@/store/useAuth'
import { useErp } from '@/store/useErp'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/misc'
import { Badge } from '@/components/ui/badge'

/**
 * A route the account has no privilege for. It says which privilege is missing
 * and who to ask, because "access denied" with no next step is a support ticket.
 */
export function NoAccess({ permission }: { permission: string }) {
  const user = useCurrentUser()
  const roles = useErp((s) => s.roles)
  const held = rolesOf(user, roles)

  return (
    <EmptyState
      className="my-auto"
      icon={<Lock />}
      title="You do not have access to this page"
      description={`Opening it needs the “${permission}” privilege. Your roles do not grant it.`}
      action={
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-[12px] text-fg-muted">You hold:</span>
            {held.length === 0 && <Badge tone="warning" size="sm">No role</Badge>}
            {held.map((r) => (
              <Badge key={r.id} tone={r.status === 'ACTIVE' ? 'primary' : 'neutral'} size="sm">
                {r.name}
                {r.status !== 'ACTIVE' && ' · inactive'}
              </Badge>
            ))}
          </div>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/">Back to somewhere you can work</Link>
          </Button>
        </div>
      }
    />
  )
}

/**
 * Wraps a route: the privilege decides whether the page renders at all.
 * The refusal is shown in place rather than redirected, so the address bar keeps
 * the page that was asked for and the reason is on screen next to it.
 */
export function RequirePermission({ permission }: { permission: string }) {
  const can = useCan()
  return can(permission) ? <Outlet /> : <NoAccess permission={permission} />
}
