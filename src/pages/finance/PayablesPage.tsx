import * as React from 'react'
import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column, TableFilter } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Tooltip } from '@/components/ui/tooltip'
import { StatusBadge } from '@/components/shared/status'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtDate, relativeDays, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { billOutstanding, billTotal, matchBill, payableAgeing } from '@/lib/procurement'
import type { SupplierBill } from '@/data/types'

export function PayablesPage() {
  const store = useErp()
  const [statuses, setStatuses] = React.useState<string[]>([])
  const [match, setMatch] = React.useState<string[]>([])

  const matchOf = (b: SupplierBill) =>
    matchBill(b, store.orders.find((o) => o.id === b.poId), store.receipts, store.settings.billVarianceTolerancePct)

  const ageing = payableAgeing(store.bills)

  const filters: TableFilter<SupplierBill>[] = [
    {
      key: 'status',
      label: 'Status',
      options: ['DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'DISPUTED', 'VOID'].map((v) => ({ value: v, label: titleCase(v) })),
      values: statuses,
      onChange: setStatuses,
      match: (r, v) => v.includes(r.status),
    },
    {
      key: 'match',
      label: 'Three-way match',
      options: [
        { value: 'MATCHED', label: 'Agrees with the receipt' },
        { value: 'QTY_VARIANCE', label: 'Quantity variance' },
        { value: 'PRICE_VARIANCE', label: 'Price variance' },
        { value: 'NO_RECEIPT', label: 'No goods receipt behind it' },
      ],
      values: match,
      onChange: setMatch,
      match: (r, v) => v.includes(matchOf(r).status),
    },
  ]

  const columns: Column<SupplierBill>[] = [
    {
      key: 'code',
      header: 'Bill',
      width: 'min-w-[180px]',
      pinned: true,
      sortable: true,
      sortValue: (r) => r.code,
      exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.code}</p>
          <p className="tnum truncate text-[11.5px] text-fg-muted">{r.supplierInvoiceNo}</p>
        </div>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      width: 'min-w-[200px]',
      sortable: true,
      sortValue: (r) => r.supplierName,
      exportValue: (r) => r.supplierName,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg">{r.supplierName}</p>
          {r.poId && (
            <Link to={`/purchase-orders/${r.poId}`} className="truncate text-[11.5px] text-fg-muted hover:text-primary">
              {store.orders.find((o) => o.id === r.poId)?.code}
            </Link>
          )}
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
        if (!p) return <Badge size="sm" tone="neutral">Stock</Badge>
        return (
          <Link to={`/projects/${p.id}`} className="text-[12.5px] font-medium text-fg hover:text-primary">
            {p.code}
          </Link>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
      cell: (r) => {
        const late = relativeDays(r.dueAt) ?? 0
        return (
          <div className="space-y-1">
            <StatusBadge value={r.status} size="sm" />
            {late < 0 && r.status !== 'PAID' && <Badge size="sm" tone="danger">{Math.abs(late)}d overdue</Badge>}
          </div>
        )
      },
    },
    {
      key: 'match',
      header: 'Three-way match',
      width: 'w-[180px]',
      headerHint: 'Purchase order, goods receipt and supplier invoice have to agree before finance pays anything.',
      sortable: true,
      sortValue: (r) => matchOf(r).status,
      exportValue: (r) => matchOf(r).status,
      cell: (r) => {
        const m = matchOf(r)
        return (
          <Tooltip content={m.detail}>
            <span>
              <StatusBadge value={m.status} size="sm" />
              {m.status !== 'MATCHED' && (
                <p className="tnum mt-1 text-[11px] text-danger">
                  {fmtCurrency(m.variance, 'IDR', { compact: true })} out
                </p>
              )}
            </span>
          </Tooltip>
        )
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => billTotal(r),
      exportValue: (r) => Math.round(billTotal(r)),
      cell: (r) => (
        <div className="text-right">
          <p className="tnum font-medium text-fg">{fmtCurrency(billTotal(r), 'IDR', { compact: true })}</p>
          <p className="tnum text-[11px] text-fg-muted">{fmtCurrency(r.subtotal, 'IDR', { compact: true })} + VAT</p>
        </div>
      ),
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      width: 'w-[140px]',
      sortable: true,
      sortValue: (r) => billOutstanding(r),
      exportValue: (r) => Math.round(billOutstanding(r)),
      cell: (r) => (
        <span className={cn('tnum font-semibold', billOutstanding(r) > 0 ? 'text-fg' : 'text-fg-subtle')}>
          {billOutstanding(r) > 0 ? fmtCurrency(billOutstanding(r), 'IDR', { compact: true }) : 'settled'}
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
    {
      key: 'issued',
      header: 'Issued',
      width: 'w-[130px]',
      defaultHidden: true,
      sortable: true,
      sortValue: (r) => r.issuedAt,
      exportValue: (r) => r.issuedAt,
      cell: (r) => <span className="text-fg-muted">{fmtDate(r.issuedAt)}</span>,
    },
  ]

  const disputed = store.bills.filter((b) => b.status === 'DISPUTED')
  const mismatched = store.bills.filter((b) => matchOf(b).status !== 'MATCHED' && b.status !== 'PAID')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Finance</Badge>}
        title="Payables"
        description="What suppliers have invoiced, checked against what they actually delivered. A bill is only payable when the order, the goods receipt and the invoice agree — where they do not, the reason matters: a quantity variance is usually a short delivery nobody credited, a price variance is a rate that moved after the order went out."
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Owed to suppliers"
          value={fmtCurrency(store.bills.reduce((a, b) => a + billOutstanding(b), 0), 'IDR', { compact: true })}
          sub={`${store.bills.filter((b) => billOutstanding(b) > 0).length} open bills`}
          icon={<Receipt />}
          accent="primary"
        />
        <KpiCard
          label="Overdue"
          value={fmtCurrency(store.bills.filter((b) => b.status === 'OVERDUE').reduce((a, b) => a + billOutstanding(b), 0), 'IDR', { compact: true })}
          sub="a sawmill that is not paid does not cut"
          accent="danger"
        />
        <KpiCard
          label="Failing the match"
          value={String(mismatched.length)}
          sub={`${disputed.length} formally disputed`}
          accent={mismatched.length ? 'warning' : 'accent'}
        />
        <KpiCard
          label="Waiting for approval"
          value={String(store.bills.filter((b) => b.status === 'AWAITING_APPROVAL').length)}
          sub="not yet released for payment"
          accent="warning"
        />
      </div>

      <Card className="mb-5">
        <CardHeader title="Ageing" description="What is due when, on open bills only." />
        <CardBody className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {ageing.map((b) => (
            <div key={b.key} className={cn('rounded-lg border border-border bg-surface-sunken p-3', b.key === '60+' && b.amount > 0 && 'border-danger/40')}>
              <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-fg-subtle">{b.label}</p>
              <p className="tnum mt-1 text-[17px] font-semibold text-fg">{fmtCurrency(b.amount, 'IDR', { compact: true })}</p>
              <p className="text-[11.5px] text-fg-muted">{b.count} bill{b.count === 1 ? '' : 's'}</p>
            </div>
          ))}
        </CardBody>
      </Card>

      <DataTable
        data={store.bills}
        columns={columns}
        filters={filters}
        getId={(r) => r.id}
        getLabel={(r) => r.code}
        entityLabel="bills"
        searchText={(r) => `${r.code} ${r.supplierInvoiceNo} ${r.supplierName} ${r.disputeReason ?? ''}`}
        onDelete={store.removeBills}
        exportName="kriyanusa-payables"
        storageKey="payables"
        initialSort={{ key: 'due', dir: 'asc' }}
        compactByDefault
        rowActions={(r) =>
          r.status === 'AWAITING_APPROVAL' ? (
            <Button size="xs" variant="primary" onClick={() => store.approveBill(r.id)}>Approve</Button>
          ) : null
        }
        rowTone={(r) =>
          r.status === 'DISPUTED' ? 'bg-danger-soft/25' : r.status === 'OVERDUE' ? 'bg-warning-soft/25' : undefined
        }
        footerSummary={(rows) => (
          <span className="tnum">
            {rows.length} bills · {fmtCurrency(rows.reduce((a, r) => a + billTotal(r), 0), 'IDR', { compact: true })} billed ·{' '}
            {fmtCurrency(rows.reduce((a, r) => a + billOutstanding(r), 0), 'IDR', { compact: true })} outstanding
          </span>
        )}
      />
    </div>
  )
}
