import { useErp } from '@/store/useErp'
import { useExceptions } from '@/hooks/useExceptions'

/**
 * Everything a shell needs that is derived rather than drawn: the counts on the
 * navigation items and the ranked exception list behind the bell. Both the
 * modern and the classic shell read it, so the two can never disagree.
 */
export function useNavBadges() {
  const store = useErp()
  const { exceptions, positions } = useExceptions()
  const critical = exceptions.filter((e) => e.severity === 'CRITICAL').length

  const badges: Record<string, number> = {
    exceptions: critical,
    projects: store.projects.filter((p) => p.status === 'WON' && p.stage !== 'CLOSED').length,
    inquiries: store.projects.filter((p) => p.status === 'OPEN').length,
    budgets: store.budgets.filter((b) => b.status === 'SUBMITTED').length,
    requests: store.requests.filter((r) => r.status === 'SUBMITTED').length,
    orders: store.orders.filter((o) => o.status === 'AWAITING_APPROVAL' || o.status === 'PARTIALLY_RECEIVED').length,
    receipts: store.receipts.filter((g) => g.qcResult === 'FAILED' || g.qcResult === 'PARTIAL').length,
    reorder: positions.filter((p) => p.belowReorder && p.onOrder <= 0).length,
    production: store.workOrders.filter((w) => w.status === 'ON_HOLD' || (w.status !== 'COMPLETED' && new Date(w.dueAt) < new Date())).length,
    shipments: store.shipments.filter((s) => !['SAILED', 'ARRIVED', 'CLOSED'].includes(s.status)).length,
    payables: store.bills.filter((b) => b.status === 'OVERDUE' || b.status === 'DISPUTED').length,
    receivables: store.invoices.filter((i) => i.status === 'OVERDUE').length,
  }

  return { badges, exceptions, critical, topExceptions: exceptions.slice(0, 6) }
}
