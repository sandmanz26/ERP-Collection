import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useMe } from '@/store/useStore'

export function RequireAuth() {
  const me = useMe()
  const loc = useLocation()
  if (!me) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <Outlet />
}

/** Staff-only routes bounce employees to their home instead of a dead end. */
export function RequireRole({ roles }: { roles: ('requester' | 'agent' | 'manager')[] }) {
  const me = useMe()
  if (!me || !roles.includes(me.role)) return <Navigate to="/" replace />
  return <Outlet />
}
