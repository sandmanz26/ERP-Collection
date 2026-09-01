import * as React from 'react'
import { useErp } from '@/store/useErp'
import { useCurrentUser } from '@/store/useAuth'
import { operatorBoard, operatorJobs, type OperatorContext } from '@/lib/operator'

/**
 * Everything an operator page needs, assembled once.
 * A supervisor or an administrator looking at the workspace sees every job
 * rather than an empty desk — the view is about the work, not the person.
 */
export function useOperator() {
  const store = useErp()
  const user = useCurrentUser()

  const ctx: OperatorContext = React.useMemo(
    () => ({
      containers: store.containers,
      documents: store.documents,
      charges: store.charges,
      stuffingJobs: store.stuffingJobs,
      milestones: store.milestones,
      filings: store.filings,
      jobServices: store.jobServices,
    }),
    [store.containers, store.documents, store.charges, store.stuffingJobs, store.milestones, store.filings, store.jobServices],
  )

  const mine = React.useMemo(() => {
    const assigned = operatorJobs(store.projects, user)
    if (assigned.length > 0 || user?.role === 'OPERATOR') return assigned
    return store.projects.filter((p) => p.status !== 'CANCELLED')
  }, [store.projects, user])

  const board = React.useMemo(() => operatorBoard(mine, ctx), [mine, ctx])

  return { store, user, ctx, mine, board, viewingAll: user?.role !== 'OPERATOR' }
}
