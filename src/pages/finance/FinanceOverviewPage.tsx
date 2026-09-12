import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, FileText, Scale, TrendingUp, Wallet,
} from 'lucide-react'
import { monthLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MetaRow } from '@/components/shared/status'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate, fmtPercent } from '@/lib/format'
import { isStaffedProject, monthlyMargin } from '@/lib/domain'
import { payableSummary } from '@/lib/purchasing'
import {
  ageingBuckets, cashByMonth, clientExposure, invoiceState, orderBook, receivableSummary,
} from '@/lib/finance'

const TH = 'whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted'
const TD = 'border-b border-border px-3 py-2.5 align-top'

/**
 * Both directions of the money in one place: what clients owe us, what we owe
 * suppliers, and whether the month covered itself.
 */
export function FinanceOverviewPage() {
  const nav = useNavigate()
  const can = useCan()
  const {
    invoices, clientReceipts, clients, projects, purchaseOrders, payments, goodsReceipts,
  } = useErp()

  const ar = receivableSummary(invoices, clientReceipts)
  const ap = payableSummary(purchaseOrders, payments, goodsReceipts)
  const ageing = ageingBuckets(invoices, clientReceipts)
  /* Six months back, minus the leading months where nothing happened at all —
     a row of empty bars says nothing except that the book is young. */
  const cashAll = cashByMonth(invoices, clientReceipts, payments, 6)
  const firstActive = cashAll.findIndex((c) => c.billed > 0 || c.received > 0 || c.paidOut > 0)
  const cash = firstActive < 0 ? cashAll.slice(-1) : cashAll.slice(firstActive)
  const thisMonth = cash[cash.length - 1]

  /* Contracted margin: what the book earns each month before anything else. */
  const live = projects.filter(isStaffedProject)
  const contracted = live.reduce((a, p) => a + monthlyMargin(p).value, 0)
  const cost = live.reduce((a, p) => a + monthlyMargin(p).cost, 0)
  const margin = contracted - cost

  const worstClients = clients
    .map((client) => ({ client, ...clientExposure(client, invoices, clientReceipts) }))
    .filter((row) => row.overdue > 0)
    .sort((a, b) => b.overdue - a.overdue)
    .slice(0, 5)

  /* What is due to go out and come in next, so nobody is surprised by a Friday. */
  const upcoming = invoices
    .map((invoice) => ({ invoice, state: invoiceState(invoice, clientReceipts) }))
    .filter((row) => row.state.live && row.state.outstanding > 0)
    .sort((a, b) => (a.invoice.dueAt ?? '').localeCompare(b.invoice.dueAt ?? ''))
    .slice(0, 6)

  const peak = Math.max(1, ...cash.flatMap((c) => [c.received, c.paidOut, c.billed]))
  const netPosition = ar.outstanding - ap.outstanding

  return (
    <>
      <PageHeader
        title="Finance"
        description="What the contracts earn, what clients still owe, and what the company owes its suppliers — the two sides of the same month."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Contracted margin"
          value={fmtCurrency(margin, 'IDR', { compact: true })}
          icon={<TrendingUp />}
          accent="primary"
          sub={`${fmtPercent(contracted ? (margin / contracted) * 100 : 0)} of ${fmtCurrency(contracted, 'IDR', { compact: true })} billed monthly`}
        />
        <KpiCard
          label="Owed by clients"
          value={fmtCurrency(ar.outstanding, 'IDR', { compact: true })}
          icon={<Banknote />}
          accent={ar.overdue ? 'warning' : 'success'}
          sub={ar.overdue ? `${fmtCurrency(ar.overdue, 'IDR', { compact: true })} of it overdue` : 'nothing past its term'}
          onClick={can('invoices.view') ? () => nav('/invoices') : undefined}
        />
        <KpiCard
          label="Owed to suppliers"
          value={fmtCurrency(ap.outstanding, 'IDR', { compact: true })}
          icon={<Wallet />}
          accent={ap.overdue ? 'warning' : 'success'}
          sub={ap.overdue ? `${fmtCurrency(ap.overdue, 'IDR', { compact: true })} of it overdue` : 'nothing past its term'}
          onClick={can('payments.view') ? () => nav('/payments') : undefined}
        />
        <KpiCard
          label="Net position"
          value={fmtCurrency(netPosition, 'IDR', { compact: true })}
          icon={<Scale />}
          accent={netPosition >= 0 ? 'success' : 'danger'}
          sub={netPosition >= 0 ? 'more is owed to us than by us' : 'the company owes more than it is owed'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              icon={<ArrowUpRight />}
              title="Money in and out"
              description="Collected from clients against paid to suppliers, month by month. Billed is what went out as invoices in that month."
            />
            <CardBody>
              <div className="space-y-3">
                {cash.map((row) => (
                  <div key={`${row.year}-${row.month}`}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="text-[12.5px] font-medium text-fg">
                        {monthLabel(row.month)} <span className="font-normal text-fg-subtle">{row.year}</span>
                      </span>
                      <span className="tnum text-[11.5px] text-fg-subtle">
                        billed {fmtCurrency(row.billed, 'IDR', { compact: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-4 flex-1 items-center gap-1">
                        <div className="h-full rounded-sm bg-success/80" style={{ width: `${(row.received / peak) * 100}%` }} />
                        <span className="tnum whitespace-nowrap text-[11px] text-success">
                          {row.received ? fmtCurrency(row.received, 'IDR', { compact: true }) : ''}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex h-4 flex-1 items-center gap-1">
                        <div className="h-full rounded-sm bg-danger/70" style={{ width: `${(row.paidOut / peak) * 100}%` }} />
                        <span className="tnum whitespace-nowrap text-[11px] text-danger">
                          {row.paidOut ? fmtCurrency(row.paidOut, 'IDR', { compact: true }) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-[11.5px] text-fg-muted">
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-success/80" /> received from clients</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-danger/70" /> paid to suppliers</span>
              </div>
            </CardBody>
            <CardBody className="border-t border-border">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.055em] text-fg-subtle">This month in</p>
                  <p className="tnum mt-1 text-[16px] font-semibold text-success">{fmtCurrency(thisMonth?.received ?? 0, 'IDR', { compact: true })}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.055em] text-fg-subtle">This month out</p>
                  <p className="tnum mt-1 text-[16px] font-semibold text-danger">{fmtCurrency(thisMonth?.paidOut ?? 0, 'IDR', { compact: true })}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.055em] text-fg-subtle">Net</p>
                  <p className={`tnum mt-1 text-[16px] font-semibold ${(thisMonth?.received ?? 0) >= (thisMonth?.paidOut ?? 0) ? 'text-fg' : 'text-danger'}`}>
                    {fmtCurrency((thisMonth?.received ?? 0) - (thisMonth?.paidOut ?? 0), 'IDR', { compact: true })}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={<AlertTriangle />}
              title="Receivables ageing"
              description="How long what clients owe has been sitting past its term."
            />
            <div className="grid gap-px bg-border sm:grid-cols-4">
              {ageing.map((bucket) => (
                <div key={bucket.label} className="bg-surface p-4">
                  <p className="text-[11px] uppercase tracking-[0.055em] text-fg-subtle">{bucket.label}</p>
                  <p
                    className={`tnum mt-1 text-[16px] font-semibold ${
                      !bucket.value ? 'text-fg-subtle' : bucket.from > 30 ? 'text-danger' : bucket.from > 0 ? 'text-warning' : 'text-fg'
                    }`}
                  >
                    {fmtCurrency(bucket.value, 'IDR', { compact: true })}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-fg-subtle">{bucket.count} invoice{bucket.count === 1 ? '' : 's'}</p>
                </div>
              ))}
            </div>
          </Card>

          {upcoming.length > 0 && (
            <Card>
              <CardHeader icon={<FileText />} title="Next to collect" description="Soonest first, whether or not it has already fallen due." />
              <div className="scrollbar-thin overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-[13px]">
                  <thead>
                    <tr>
                      <th className={TH}>Invoice</th>
                      <th className={TH}>Client</th>
                      <th className={TH}>Due</th>
                      <th className={`${TH} text-right`}>Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map(({ invoice, state }) => (
                      <tr
                        key={invoice.id}
                        onClick={() => nav(`/invoices/${invoice.id}`)}
                        className={`cursor-pointer hover:bg-surface-sunken/60 ${state.overdue ? 'bg-danger-soft/20' : ''}`}
                      >
                        <td className={`${TD} whitespace-nowrap font-mono text-[12px] font-medium text-primary`}>{invoice.code}</td>
                        <td className={TD}>
                          <p className="max-w-[220px] truncate text-fg">
                            {clients.find((c) => c.id === invoice.clientId)?.brandName ?? '—'}
                          </p>
                        </td>
                        <td className={TD}>
                          <span className={`tnum text-[12px] ${state.overdue ? 'font-medium text-danger' : 'text-fg-muted'}`}>
                            {invoice.dueAt ? fmtDate(invoice.dueAt) : '—'}
                          </span>
                          {state.overdue && <span className="ml-1.5 text-[11px] text-danger">{state.daysOverdue}d</span>}
                        </td>
                        <td className={`${TD} tnum whitespace-nowrap text-right font-semibold text-fg`}>
                          {fmtCurrency(state.outstanding, 'IDR', { compact: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader icon={<FileText />} title="The billing book" />
            <CardBody className="divide-y divide-border">
              <MetaRow label="Invoices issued">{ar.invoices}</MetaRow>
              <MetaRow label="Still in draft">
                {ar.drafts > 0 ? (
                  <Link to="/invoices" className="font-medium text-primary hover:underline">{ar.drafts} waiting</Link>
                ) : (
                  'none'
                )}
              </MetaRow>
              <MetaRow label="Billed">{fmtCurrency(ar.billed, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Collected">{fmtCurrency(ar.received, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Collection rate">
                {ar.billed ? fmtPercent((ar.received / ar.billed) * 100) : '—'}
              </MetaRow>
              <MetaRow label="Order book">{fmtCurrency(orderBook(projects), 'IDR', { compact: true })}</MetaRow>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<ArrowDownRight />} title="Supplier side" />
            <CardBody className="divide-y divide-border">
              <MetaRow label="Live orders">{ap.orders}</MetaRow>
              <MetaRow label="Paid to date">{fmtCurrency(ap.paid, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Outstanding">{fmtCurrency(ap.outstanding, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Overdue">
                <span className={ap.overdue ? 'text-danger' : undefined}>{fmtCurrency(ap.overdue, 'IDR', { compact: true })}</span>
              </MetaRow>
            </CardBody>
          </Card>

          {worstClients.length > 0 && (
            <Card>
              <CardHeader icon={<AlertTriangle />} title="Chase these first" description="Clients with money past its term." />
              <CardBody className="space-y-3">
                {worstClients.map((row) => (
                  <div key={row.client.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-fg">{row.client.brandName ?? row.client.legalName}</p>
                      <p className="text-[11px] text-fg-subtle">{row.client.accountManager}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-[12.5px] font-semibold text-danger">{fmtCurrency(row.overdue, 'IDR', { compact: true })}</p>
                      {row.overLimit && <Badge tone="danger" size="sm">over limit</Badge>}
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
