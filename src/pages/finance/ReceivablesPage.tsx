import * as React from 'react'
import { Link } from 'react-router-dom'
import { Banknote } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column, TableFilter } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtDate, relativeDays, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import type { SalesInvoice } from '@/data/types'

export function ReceivablesPage() {
  const store = useErp()
  const [statuses, setStatuses] = React.useState<string[]>([])
  const [kinds, setKinds] = React.useState<string[]>([])

  const outstanding = (i: SalesInvoice) => i.amount - i.paidAmount
  const idr = (i: SalesInvoice) => outstanding(i) * i.exchangeRate

  const filters: TableFilter<SalesInvoice>[] = [
    {
      key: 'status',
      label: 'Status',
      options: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'].map((v) => ({ value: v, label: titleCase(v) })),
      values: statuses,
      onChange: setStatuses,
      match: (r, v) => v.includes(r.status),
    },
    {
      key: 'kind',
      label: 'Kind',
      options: ['PROFORMA', 'DEPOSIT', 'FINAL', 'CREDIT_NOTE'].map((v) => ({ value: v, label: titleCase(v) })),
      values: kinds,
      onChange: setKinds,
      match: (r, v) => v.includes(r.kind),
    },
  ]

  const columns: Column<SalesInvoice>[] = [
    {
      key: 'code',
      header: 'Invoice',
      width: 'min-w-[160px]',
      pinned: true,
      sortable: true,
      sortValue: (r) => r.code,
      exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{fmtDate(r.issuedAt)}</p>
        </div>
      ),
    },
    {
      key: 'buyer',
      header: 'Buyer',
      width: 'min-w-[190px]',
      sortable: true,
      sortValue: (r) => r.buyerName,
      exportValue: (r) => r.buyerName,
      cell: (r) => (
        <Link to={`/buyers/${r.buyerId}`} className="truncate text-fg hover:text-primary">
          {r.buyerName}
        </Link>
      ),
    },
    {
      key: 'project',
      header: 'Order',
      width: 'w-[140px]',
      exportValue: (r) => store.projects.find((p) => p.id === r.projectId)?.code ?? '',
      cell: (r) => {
        const p = store.projects.find((x) => x.id === r.projectId)
        if (!p) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <Link to={`/projects/${p.id}`} className="text-[12.5px] font-medium text-fg hover:text-primary">
            {p.code}
          </Link>
        )
      },
    },
    {
      key: 'kind',
      header: 'Kind',
      width: 'w-[120px]',
      sortable: true,
      sortValue: (r) => r.kind,
      exportValue: (r) => r.kind,
      cell: (r) => <StatusBadge value={r.kind} size="sm" />,
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
      cell: (r) => {
        const days = relativeDays(r.dueAt) ?? 0
        return (
          <div className="space-y-1">
            <StatusBadge value={r.status} size="sm" />
            {days < 0 && r.status !== 'PAID' && <Badge size="sm" tone="danger">{Math.abs(days)}d overdue</Badge>}
          </div>
        )
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      width: 'w-[160px]',
      sortable: true,
      sortValue: (r) => r.amount * r.exchangeRate,
      exportValue: (r) => r.amount,
      cell: (r) => (
        <div className="text-right">
          <p className="tnum font-medium text-fg">{fmtCurrency(r.amount, r.currency, { compact: true })}</p>
          <p className="tnum text-[11px] text-fg-muted">{fmtCurrency(r.amount * r.exchangeRate, 'IDR', { compact: true })}</p>
        </div>
      ),
    },
    {
      key: 'paid',
      header: 'Received',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => (r.amount ? r.paidAmount / r.amount : 0),
      exportValue: (r) => r.paidAmount,
      cell: (r) => <UtilisationBar pct={r.amount ? (r.paidAmount / r.amount) * 100 : 0} className="w-28" label={fmtCurrency(r.paidAmount, r.currency, { compact: true })} />,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => idr(r),
      exportValue: (r) => Math.round(idr(r)),
      cell: (r) => (
        <span className={cn('tnum font-semibold', outstanding(r) > 0 ? 'text-fg' : 'text-fg-subtle')}>
          {outstanding(r) > 0 ? fmtCurrency(outstanding(r), r.currency, { compact: true }) : 'settled'}
        </span>
      ),
    },
    {
      key: 'due',
      header: 'Due',
      width: 'w-[140px]',
      sortable: true,
      sortValue: (r) => r.dueAt,
      exportValue: (r) => r.dueAt,
      cell: (r) => {
        const days = relativeDays(r.dueAt) ?? 0
        return (
          <div>
            <p className={cn(days < 0 && r.status !== 'PAID' ? 'font-medium text-danger' : 'text-fg-muted')}>{fmtDate(r.dueAt)}</p>
            <p className="text-[11px] text-fg-subtle">{days < 0 ? `${Math.abs(days)} days ago` : `in ${days} days`}</p>
          </div>
        )
      },
    },
  ]

  const open = store.invoices.filter((i) => ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status))
  const overdue = store.invoices.filter((i) => i.status === 'OVERDUE')
  const deposits = store.invoices.filter((i) => i.kind === 'DEPOSIT' && i.status !== 'PAID')

  /* by currency, because the exposure is not all in rupiah */
  const byCurrency = Array.from(
    open.reduce((map, i) => {
      map.set(i.currency, (map.get(i.currency) ?? 0) + outstanding(i))
      return map
    }, new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Finance</Badge>}
        title="Receivables"
        description="Deposits and balances against export orders. A deposit is not a formality: nothing is bought for an order until it clears, because the timber for a teak range has to be paid for outright long before the container sails."
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Owed to us"
          value={fmtCurrency(open.reduce((a, i) => a + idr(i), 0), 'IDR', { compact: true })}
          sub={`${open.length} open invoices`}
          icon={<Banknote />}
          accent="primary"
        />
        <KpiCard
          label="Overdue"
          value={fmtCurrency(overdue.reduce((a, i) => a + idr(i), 0), 'IDR', { compact: true })}
          sub={overdue.map((i) => i.buyerName).filter((v, x, arr) => arr.indexOf(v) === x).join(', ') || 'nothing late'}
          accent={overdue.length ? 'danger' : 'accent'}
        />
        <KpiCard
          label="Deposits outstanding"
          value={fmtCurrency(deposits.reduce((a, i) => a + idr(i), 0), 'IDR', { compact: true })}
          sub={`${deposits.length} orders waiting to start`}
          accent={deposits.length ? 'warning' : 'accent'}
        />
        <KpiCard
          label="Collected this book"
          value={fmtCurrency(store.invoices.reduce((a, i) => a + i.paidAmount * i.exchangeRate, 0), 'IDR', { compact: true })}
          sub="against all invoices"
          accent="success"
        />
      </div>

      <Card className="mb-5">
        <CardHeader title="Exposure by currency" description="What is outstanding, in the currency it will actually arrive in." />
        <CardBody className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {byCurrency.map(([currency, amount]) => (
            <div key={currency} className="rounded-lg border border-border bg-surface-sunken p-3">
              <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-fg-subtle">{currency}</p>
              <p className="tnum mt-1 text-[17px] font-semibold text-fg">{fmtCurrency(amount, currency, { compact: true })}</p>
              <p className="tnum text-[11.5px] text-fg-muted">
                {fmtCurrency(amount * (store.settings.fxRates[currency] ?? 1), 'IDR', { compact: true })}
              </p>
            </div>
          ))}
          {byCurrency.length === 0 && <p className="text-[12.5px] text-fg-muted">Nothing outstanding.</p>}
        </CardBody>
      </Card>

      <DataTable
        data={store.invoices}
        columns={columns}
        filters={filters}
        getId={(r) => r.id}
        getLabel={(r) => r.code}
        entityLabel="invoices"
        searchText={(r) => `${r.code} ${r.buyerName} ${r.kind} ${r.note ?? ''}`}
        onDelete={store.removeInvoices}
        exportName="kriyanusa-receivables"
        storageKey="receivables"
        initialSort={{ key: 'due', dir: 'asc' }}
        rowTone={(r) => (r.status === 'OVERDUE' ? 'bg-danger-soft/25' : undefined)}
        footerSummary={(rows) => (
          <span className="tnum">
            {rows.length} invoices · {fmtCurrency(rows.reduce((a, r) => a + r.amount * r.exchangeRate, 0), 'IDR', { compact: true })} billed ·{' '}
            {fmtCurrency(rows.reduce((a, r) => a + idr(r), 0), 'IDR', { compact: true })} outstanding
          </span>
        )}
      />
    </div>
  )
}
