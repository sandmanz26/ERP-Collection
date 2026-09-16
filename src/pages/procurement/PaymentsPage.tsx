import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Banknote, Eye, Receipt, Wallet } from 'lucide-react'
import type { PurchaseOrder, SupplierPayment } from '@/data/types'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate } from '@/lib/format'
import { payableSummary, paymentState, poTotals } from '@/lib/purchasing'

const TH = 'whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted'
const TD = 'border-b border-border px-3 py-2.5 align-top'

/**
 * Money out, and money still owed. Two views of the same fact: the payments
 * that have been made, and the orders those payments have not finished.
 */
export function PaymentsPage() {
  const nav = useNavigate()
  const can = useCan()
  const { payments, purchaseOrders, suppliers, goodsReceipts } = useErp()
  const [tab, setTab] = React.useState<'paid' | 'outstanding'>('paid')
  const [supplierFilter, setSupplierFilter] = React.useState<string[]>([])
  const [methodFilter, setMethodFilter] = React.useState<string[]>([])

  const orderOf = (p: SupplierPayment) => purchaseOrders.find((o) => o.id === p.purchaseOrderId)
  const supplierName = (supplierId: string) => {
    const s = suppliers.find((x) => x.id === supplierId)
    return s?.brandName ?? s?.legalName ?? 'Unknown supplier'
  }
  const stateOf = React.useCallback(
    (po: PurchaseOrder) => paymentState(po, payments, goodsReceipts),
    [payments, goodsReceipts],
  )

  /**
   * What a payment did to the order's balance, judged by everything paid on or
   * before it. A payment for less than the order can still be the one that
   * settles it — the balance after a deposit usually is.
   */
  const kindOf = (p: SupplierPayment) => {
    const po = orderOf(p)
    if (!po) return { label: 'Payment', tone: 'neutral' as const, rank: 0 }
    const total = Math.round(poTotals(po).total)
    const earlier = payments
      .filter((x) => x.purchaseOrderId === p.purchaseOrderId && (x.paidAt < p.paidAt || (x.paidAt === p.paidAt && x.code <= p.code)))
      .reduce((a, x) => a + x.amount, 0)
    if (Math.round(earlier) >= total) {
      return Math.round(p.amount) >= total
        ? { label: 'In full', tone: 'success' as const, rank: 3 }
        : { label: 'Settles order', tone: 'success' as const, rank: 2 }
    }
    return earlier === p.amount
      ? { label: 'Deposit', tone: 'info' as const, rank: 1 }
      : { label: 'Part payment', tone: 'warning' as const, rank: 1 }
  }

  const payable = payableSummary(purchaseOrders, payments, goodsReceipts)

  /* Orders that still owe something, worst first: that is the queue finance works. */
  const outstanding = purchaseOrders
    .filter((po) => po.status !== 'CANCELLED' && po.status !== 'DRAFT' && stateOf(po).outstanding > 0)
    .map((po) => ({ po, state: stateOf(po) }))
    .sort((a, b) => b.state.daysOverdue - a.state.daysOverdue || b.state.outstanding - a.state.outstanding)

  /** How much of the outstanding sits in each age bucket — the usual AP ageing. */
  const ageing = [
    { label: 'Not due yet', match: (d: number) => d <= 0, tone: 'text-fg' },
    { label: '1–30 days over', match: (d: number) => d > 0 && d <= 30, tone: 'text-warning' },
    { label: '31–60 days over', match: (d: number) => d > 30 && d <= 60, tone: 'text-danger' },
    { label: 'Over 60 days', match: (d: number) => d > 60, tone: 'text-danger' },
  ].map((bucket) => ({
    ...bucket,
    value: outstanding.filter((r) => bucket.match(r.state.daysOverdue)).reduce((a, r) => a + r.state.outstanding, 0),
    count: outstanding.filter((r) => bucket.match(r.state.daysOverdue)).length,
  }))

  const columns: Column<SupplierPayment>[] = [
    {
      key: 'code', primary: true, header: 'Payment', width: 'w-[160px]', sortable: true, pinned: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{r.code}</p>
          <p className="truncate font-mono text-[11px] text-fg-subtle">{r.reference ?? 'no reference'}</p>
        </div>
      ),
    },
    {
      key: 'order', primary: true, header: 'Order', width: 'w-[150px]', sortable: true,
      sortValue: (r) => orderOf(r)?.code ?? '', exportValue: (r) => orderOf(r)?.code ?? '',
      cell: (r) => {
        const po = orderOf(r)
        if (!po) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <button
            onClick={(e) => { e.stopPropagation(); nav(`/purchase-orders/${po.id}`) }}
            className="font-mono text-[12px] font-medium text-primary hover:underline"
          >
            {po.code}
          </button>
        )
      },
    },
    {
      key: 'supplier', primary: true, header: 'Supplier', width: 'w-[210px] max-w-[210px]', sortable: true,
      sortValue: (r) => supplierName(r.supplierId), exportValue: (r) => supplierName(r.supplierId),
      cell: (r) => <p className="truncate text-[12.5px] font-medium text-fg">{supplierName(r.supplierId)}</p>,
    },
    {
      key: 'paidAt', primary: true, header: 'Paid', width: 'w-[150px]', sortable: true,
      sortValue: (r) => r.paidAt, exportValue: (r) => r.paidAt.slice(0, 10),
      cell: (r) => (
        <div className="min-w-0">
          <p className="tnum text-[12.5px] text-fg">{fmtDate(r.paidAt)}</p>
          <p className="truncate text-[11px] text-fg-subtle">{r.paidBy}</p>
        </div>
      ),
    },
    {
      key: 'method', header: 'Method', width: 'w-[116px]', sortable: true,
      sortValue: (r) => r.method, exportValue: (r) => r.method,
      cell: (r) => <Badge tone="outline" size="sm">{r.method.toLowerCase()}</Badge>,
    },
    {
      key: 'kind', header: 'Kind', width: 'w-[132px]', sortable: true,
      sortValue: (r) => kindOf(r).rank, exportValue: (r) => kindOf(r).label,
      headerHint: 'What this payment did to the balance: opened it, chipped at it, or settled it',
      cell: (r) => {
        const kind = kindOf(r)
        return <Badge tone={kind.tone} size="sm">{kind.label}</Badge>
      },
    },
    {
      key: 'amount', primary: true, header: 'Amount', width: 'w-[150px]', align: 'right', sortable: true,
      sortValue: (r) => r.amount, exportValue: (r) => Math.round(r.amount),
      cell: (r) => <span className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(r.amount, 'IDR')}</span>,
    },
    {
      key: 'account', header: 'To account', width: 'w-[170px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.bankAccount ?? '', exportValue: (r) => r.bankAccount ?? '',
      cell: (r) => <span className="font-mono text-[11.5px] text-fg-muted">{r.bankAccount ?? '—'}</span>,
    },
    {
      key: 'note', header: 'Note', width: 'w-[260px] max-w-[260px]', sortable: false, defaultHidden: true,
      exportValue: (r) => r.note ?? '',
      cell: (r) => <p className="truncate text-[12px] text-fg-muted">{r.note ?? '—'}</p>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Payments"
        description="What has been paid to suppliers, and what each order still owes. A payment can settle an order outright or chip away at it — a deposit before delivery is ordinary here."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Paid to date"
          value={fmtCurrency(payable.paid, 'IDR', { compact: true })}
          icon={<Banknote />}
          accent="success"
          sub={`${payments.length} payment${payments.length === 1 ? '' : 's'} recorded`}
        />
        <KpiCard
          label="Outstanding"
          value={fmtCurrency(payable.outstanding, 'IDR', { compact: true })}
          icon={<Wallet />}
          accent={payable.outstanding ? 'warning' : 'success'}
          sub={`${outstanding.length} order${outstanding.length === 1 ? '' : 's'} not settled`}
        />
        <KpiCard
          label="Overdue"
          value={fmtCurrency(payable.overdue, 'IDR', { compact: true })}
          icon={<AlertTriangle />}
          accent={payable.overdue ? 'danger' : 'success'}
          sub={payable.overdueCount ? `${payable.overdueCount} order${payable.overdueCount === 1 ? ' is' : 's are'} past term` : 'nothing past its term'}
          onClick={payable.overdueCount ? () => setTab('outstanding') : undefined}
        />
        <KpiCard
          label="Live orders"
          value={payable.orders}
          icon={<Receipt />}
          accent="primary"
          sub="issued and not cancelled"
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: 'paid', label: 'Payments made', count: payments.length },
          { value: 'outstanding', label: 'Still owed', count: outstanding.length },
        ]}
      />

      {tab === 'paid' && (
        <DataTable
          data={payments}
          columns={columns}
          getId={(r) => r.id}
          getLabel={(r) => r.code}
          entityLabel="payment"
          storageKey="supplier-payments"
          allowExport={can('payments.export')}
          exportName="tata-gemilang-payments"
          searchText={(r) => [r.code, r.reference, r.note, r.paidBy, r.method, orderOf(r)?.code, supplierName(r.supplierId)].filter(Boolean).join(' ')}
          initialSort={{ key: 'paidAt', dir: 'desc' }}
          onRowClick={(r) => nav(`/purchase-orders/${r.purchaseOrderId}`)}
          filters={[
            {
              key: 'supplier', label: 'Supplier', values: supplierFilter, onChange: setSupplierFilter,
              options: suppliers.map((s) => ({ value: s.id, label: s.brandName ?? s.legalName })),
              match: (r, v) => v.includes(r.supplierId),
            },
            {
              key: 'method', label: 'Method', values: methodFilter, onChange: setMethodFilter,
              options: ['TRANSFER', 'GIRO', 'CHEQUE', 'CASH'].map((m) => ({ value: m, label: m.toLowerCase() })),
              match: (r, v) => v.includes(r.method),
            },
          ]}
          rowActions={(r) => (
            <Tooltip content="Open the order this paid">
              <Button variant="ghost" size="iconXs" onClick={() => nav(`/purchase-orders/${r.purchaseOrderId}`)}>
                <Eye />
              </Button>
            </Tooltip>
          )}
          footerSummary={(rows) => (
            <span className="tnum">{fmtCurrency(rows.reduce((a, r) => a + r.amount, 0), 'IDR')} paid in this view</span>
          )}
          emptyTitle="Nothing has been paid yet"
          emptyDescription="Payments are recorded against a purchase order."
        />
      )}

      {tab === 'outstanding' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Ageing" description="How long the unpaid balance has been sitting past its term." icon={<AlertTriangle />} />
            <div className="grid gap-px bg-border sm:grid-cols-4">
              {ageing.map((bucket) => (
                <div key={bucket.label} className="bg-surface p-4">
                  <p className="text-[11px] uppercase tracking-[0.055em] text-fg-subtle">{bucket.label}</p>
                  <p className={`tnum mt-1 text-[17px] font-semibold ${bucket.value ? bucket.tone : 'text-fg-subtle'}`}>
                    {fmtCurrency(bucket.value, 'IDR', { compact: true })}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-fg-subtle">{bucket.count} order{bucket.count === 1 ? '' : 's'}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Orders still owed"
              description="Worst first. The term runs from the first delivery — an order nothing has arrived against has not fallen due."
              icon={<Wallet />}
            />
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr>
                    <th className={TH}>Order</th>
                    <th className={TH}>Supplier</th>
                    <th className={TH}>State</th>
                    <th className={`${TH} text-right`}>Order value</th>
                    <th className={`${TH} text-right`}>Paid</th>
                    <th className={`${TH} text-right`}>Outstanding</th>
                    <th className={TH}>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {outstanding.map(({ po, state }) => (
                    <tr
                      key={po.id}
                      onClick={() => nav(`/purchase-orders/${po.id}`)}
                      className={`cursor-pointer hover:bg-surface-sunken/60 ${state.overdue ? 'bg-danger-soft/20' : ''}`}
                    >
                      <td className={`${TD} whitespace-nowrap font-mono text-[12px] font-medium text-primary`}>{po.code}</td>
                      <td className={TD}>
                        <p className="max-w-[220px] truncate font-medium text-fg">{supplierName(po.supplierId)}</p>
                      </td>
                      <td className={TD}><StatusBadge value={state.state} size="sm" /></td>
                      <td className={`${TD} tnum whitespace-nowrap text-right text-fg-muted`}>{fmtCurrency(state.total, 'IDR', { compact: true })}</td>
                      <td className={`${TD} tnum whitespace-nowrap text-right text-fg-muted`}>{fmtCurrency(state.paid, 'IDR', { compact: true })}</td>
                      <td className={`${TD} tnum whitespace-nowrap text-right font-semibold ${state.overdue ? 'text-danger' : 'text-fg'}`}>
                        {fmtCurrency(state.outstanding, 'IDR', { compact: true })}
                      </td>
                      <td className={TD}>
                        {state.started ? (
                          <>
                            <p className={`tnum text-[12px] ${state.overdue ? 'font-medium text-danger' : 'text-fg-muted'}`}>{fmtDate(state.dueAt)}</p>
                            {state.overdue && <p className="text-[11px] text-danger">{state.daysOverdue} days over</p>}
                          </>
                        ) : (
                          <span className="text-[12px] text-fg-subtle">not delivered yet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="px-3 py-2.5 text-right text-[12px] font-medium text-fg-muted">
                      {outstanding.length} orders outstanding
                    </td>
                    <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-[13px] font-semibold text-fg">
                      {fmtCurrency(payable.outstanding, 'IDR')}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
