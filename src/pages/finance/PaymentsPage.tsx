import * as React from 'react'
import { Link } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column, TableFilter } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtDate, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { cashPosition } from '@/lib/analytics'
import type { Payment } from '@/data/types'

export function PaymentsPage() {
  const store = useErp()
  const [directions, setDirections] = React.useState<string[]>([])
  const [methods, setMethods] = React.useState<string[]>([])

  const cash = cashPosition(store.invoices, store.bills)
  const inflow = store.payments.filter((p) => p.direction === 'IN')
  const outflow = store.payments.filter((p) => p.direction === 'OUT')

  const filters: TableFilter<Payment>[] = [
    {
      key: 'direction',
      label: 'Direction',
      options: [
        { value: 'IN', label: 'Money in' },
        { value: 'OUT', label: 'Money out' },
      ],
      values: directions,
      onChange: setDirections,
      match: (r, v) => v.includes(r.direction),
    },
    {
      key: 'method',
      label: 'Method',
      options: ['BANK_TRANSFER', 'CASH', 'LETTER_OF_CREDIT', 'CHEQUE', 'PETTY_CASH'].map((v) => ({ value: v, label: titleCase(v) })),
      values: methods,
      onChange: setMethods,
      match: (r, v) => v.includes(r.method),
    },
  ]

  const columns: Column<Payment>[] = [
    {
      key: 'code',
      header: 'Payment',
      width: 'min-w-[160px]',
      pinned: true,
      sortable: true,
      sortValue: (r) => r.code,
      exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{fmtDate(r.at)}</p>
        </div>
      ),
    },
    {
      key: 'direction',
      header: 'Direction',
      width: 'w-[120px]',
      sortable: true,
      sortValue: (r) => r.direction,
      exportValue: (r) => r.direction,
      cell: (r) => (
        <Badge size="sm" tone={r.direction === 'IN' ? 'success' : 'warning'}>
          {r.direction === 'IN' ? 'Money in' : 'Money out'}
        </Badge>
      ),
    },
    {
      key: 'counterparty',
      header: 'Counterparty',
      width: 'min-w-[210px]',
      sortable: true,
      sortValue: (r) => r.counterpartyName,
      exportValue: (r) => r.counterpartyName,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg">{r.counterpartyName}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.reference}</p>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      width: 'w-[160px]',
      exportValue: (r) => r.method,
      cell: (r) => <span className="text-[12px] text-fg-muted">{titleCase(r.method)}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      width: 'w-[170px]',
      sortable: true,
      sortValue: (r) => r.amount * r.exchangeRate * (r.direction === 'IN' ? 1 : -1),
      exportValue: (r) => r.amount,
      cell: (r) => (
        <div className="text-right">
          <p className={cn('tnum font-semibold', r.direction === 'IN' ? 'text-success' : 'text-danger')}>
            {r.direction === 'IN' ? '+' : '−'}
            {fmtCurrency(r.amount, r.currency, { compact: true })}
          </p>
          {r.currency !== 'IDR' && (
            <p className="tnum text-[11px] text-fg-muted">{fmtCurrency(r.amount * r.exchangeRate, 'IDR', { compact: true })}</p>
          )}
        </div>
      ),
    },
    {
      key: 'allocations',
      header: 'Applied to',
      width: 'min-w-[180px]',
      exportValue: (r) => r.allocations.map((a) => a.targetCode).join(' '),
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.allocations.map((a) => (
            <Badge key={a.id} size="sm" tone="neutral">{a.targetCode}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'project',
      header: 'Order',
      width: 'w-[130px]',
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
      key: 'bank',
      header: 'Account',
      width: 'w-[170px]',
      defaultHidden: true,
      exportValue: (r) => r.bankAccountNo ?? '',
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{r.bankAccountNo ?? '—'}</span>,
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Finance</Badge>}
        title="Payments"
        description="Money that actually moved, and what each transfer was applied to. An export business lives on the gap between the deposit landing and the sawmill wanting paying, so both sides are on one screen."
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Received"
          value={fmtCurrency(inflow.reduce((a, p) => a + p.amount * p.exchangeRate, 0), 'IDR', { compact: true })}
          sub={`${inflow.length} receipts`}
          icon={<Wallet />}
          accent="success"
        />
        <KpiCard
          label="Paid out"
          value={fmtCurrency(outflow.reduce((a, p) => a + p.amount * p.exchangeRate, 0), 'IDR', { compact: true })}
          sub={`${outflow.length} payments`}
          accent="warning"
        />
        <KpiCard
          label="Still owed to us"
          value={fmtCurrency(cash.receivable, 'IDR', { compact: true })}
          delta={cash.overdueIn > 0 ? `${fmtCurrency(cash.overdueIn, 'IDR', { compact: true })} late` : undefined}
          deltaTone="down"
          accent="primary"
        />
        <KpiCard
          label="Working capital gap"
          value={fmtCurrency(cash.net, 'IDR', { compact: true })}
          sub="receivables less payables"
          accent={cash.net >= 0 ? 'success' : 'danger'}
        />
      </div>

      <DataTable
        data={store.payments}
        columns={columns}
        filters={filters}
        getId={(r) => r.id}
        getLabel={(r) => r.code}
        entityLabel="payments"
        searchText={(r) => `${r.code} ${r.counterpartyName} ${r.reference} ${r.allocations.map((a) => a.targetCode).join(' ')}`}
        onDelete={store.removePayments}
        exportName="kriyanusa-payments"
        storageKey="payments"
        initialSort={{ key: 'code', dir: 'desc' }}
        compactByDefault
        footerSummary={(rows) => {
          const net = rows.reduce((a, r) => a + r.amount * r.exchangeRate * (r.direction === 'IN' ? 1 : -1), 0)
          return (
            <span className="tnum">
              {rows.length} payments · net {fmtCurrency(net, 'IDR', { compact: true })}
            </span>
          )
        }}
      />
    </div>
  )
}
