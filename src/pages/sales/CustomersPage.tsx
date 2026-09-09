import * as React from 'react'
import { Building2, Wallet } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { useMfg } from '@/store/useMfg'
import type { Customer } from '@/data/types'
import { countryFlag, countryName, customerSegmentLabel, CUSTOMER_SEGMENTS } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'
import { TODAY } from '@/data/clock'

export function CustomersPage() {
  const { customers, salesOrders, invoices } = useMfg()
  const [segment, setSegment] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<string[]>([])

  const openAr = (c: Customer) =>
    invoices
      .filter((i) => i.kind === 'AR' && i.partyId === c.id && i.status !== 'PAID' && i.status !== 'VOID')
      .reduce((a, i) => a + (i.total - i.paidAmount) * i.fxRate, 0)
  const overdueAr = (c: Customer) =>
    invoices
      .filter((i) => i.kind === 'AR' && i.partyId === c.id && i.status !== 'PAID' && i.status !== 'VOID' && i.dueDate < TODAY)
      .reduce((a, i) => a + (i.total - i.paidAmount) * i.fxRate, 0)
  const bookValue = (c: Customer) =>
    salesOrders
      .filter((o) => o.customerId === c.id && !['CLOSED', 'CANCELLED'].includes(o.status))
      .reduce((a, o) => a + o.lines.reduce((b, l) => b + l.quantity * l.unitPrice, 0) * o.fxRate, 0)

  const totalAr = customers.reduce((a, c) => a + openAr(c), 0)
  const totalOverdue = customers.reduce((a, c) => a + overdueAr(c), 0)

  const columns: Column<Customer>[] = [
    {
      key: 'name', header: 'Customer', width: 'min-w-[260px]', pinned: true, sortable: true, sortValue: (c) => c.name,
      cell: (c) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-fg">{c.name}</p>
          <p className="truncate font-mono text-[11.5px] text-fg-muted">{c.code} · {c.taxId}</p>
        </div>
      ),
      exportValue: (c) => c.name,
    },
    {
      key: 'segment', header: 'Segment', width: 'w-[160px]', sortable: true, sortValue: (c) => c.segment,
      cell: (c) => (
        <Tooltip content={CUSTOMER_SEGMENTS.find((x) => x.value === c.segment)?.hint ?? ''}>
          <span className="text-[12.5px] text-fg">{customerSegmentLabel(c.segment)}</span>
        </Tooltip>
      ),
      exportValue: (c) => c.segment,
    },
    {
      key: 'location', header: 'Location', width: 'w-[190px]',
      cell: (c) => (
        <span className="text-[12.5px] text-fg-muted">
          {countryFlag(c.country)} {c.city}, {countryName(c.country)}
        </span>
      ),
      exportValue: (c) => `${c.city}, ${c.country}`,
    },
    {
      key: 'status', header: 'Status', width: 'w-[130px]', sortable: true, sortValue: (c) => c.status,
      cell: (c) => <StatusBadge value={c.status} size="sm" />,
      exportValue: (c) => c.status,
    },
    {
      key: 'terms', header: 'Terms', width: 'w-[150px]',
      cell: (c) => (
        <span className="text-[12.5px] text-fg-muted">
          {c.paymentTermDays} days{c.depositPercent > 0 ? ` · ${c.depositPercent}% deposit` : ''}
        </span>
      ),
      exportValue: (c) => c.paymentTermDays,
    },
    {
      key: 'book', header: 'Open book', align: 'right', width: 'w-[130px]', sortable: true, sortValue: (c) => bookValue(c),
      cell: (c) => <span className="tnum text-[12.5px]">{fmtCurrency(bookValue(c), 'IDR', { compact: true })}</span>,
      exportValue: (c) => bookValue(c),
    },
    {
      key: 'ar', header: 'Outstanding', align: 'right', width: 'w-[150px]', sortable: true, sortValue: (c) => openAr(c),
      cell: (c) => {
        const ar = openAr(c)
        const od = overdueAr(c)
        return (
          <div>
            <p className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(ar, 'IDR', { compact: true })}</p>
            {od > 0 && <p className="tnum text-[11px] font-medium text-danger">{fmtCurrency(od, 'IDR', { compact: true })} overdue</p>}
          </div>
        )
      },
      exportValue: (c) => openAr(c),
    },
    {
      key: 'headroom', header: 'Credit headroom', align: 'right', width: 'w-[170px]',
      headerHint: 'Limit less what is already outstanding and what is on open order',
      sortable: true, sortValue: (c) => c.creditLimit - openAr(c) - bookValue(c),
      cell: (c) => {
        const room = c.creditLimit - openAr(c) - bookValue(c)
        return (
          <div>
            <p className={`tnum text-[12.5px] font-semibold ${room < 0 ? 'text-danger' : 'text-fg'}`}>
              {fmtCurrency(room, 'IDR', { compact: true })}
            </p>
            <p className="tnum text-[11px] text-fg-muted">limit {fmtCurrency(c.creditLimit, 'IDR', { compact: true })}</p>
          </div>
        )
      },
      exportValue: (c) => c.creditLimit - openAr(c) - bookValue(c),
    },
    {
      key: 'penalty', header: 'Late penalty', align: 'right', width: 'w-[130px]', defaultHidden: true,
      cell: (c) => (c.latePenaltyPerDay ? <span className="tnum text-[12.5px] text-danger">{fmtCurrency(c.latePenaltyPerDay, 'IDR', { compact: true })}/day</span> : <span className="text-[12px] text-fg-subtle">none</span>),
      exportValue: (c) => c.latePenaltyPerDay ?? 0,
    },
    {
      key: 'since', header: 'Customer since', width: 'w-[140px]', defaultHidden: true,
      cell: (c) => <span className="tnum text-[12.5px] text-fg-muted">{fmtDate(c.since)}</span>,
      exportValue: (c) => c.since,
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><Building2 className="size-3" /> Sales</Badge>}
        title="Customers"
        description="Four kinds of buyer with four different tolerances: a retail chain forgives price and never forgives a delivery window, a contract fit-out carries a penalty clause, and an export buyer asks for the harvest country of the timber."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active accounts" value={fmtNumber(customers.filter((c) => c.status === 'ACTIVE').length)} icon={<Building2 />} accent="primary" sub={`${customers.length} on file`} />
        <KpiCard label="Open order book" value={fmtCurrency(customers.reduce((a, c) => a + bookValue(c), 0), 'IDR', { compact: true })} icon={<Wallet />} accent="accent" />
        <KpiCard label="Receivables" value={fmtCurrency(totalAr, 'IDR', { compact: true })} icon={<Wallet />} accent="primary" />
        <KpiCard
          label="Overdue"
          value={fmtCurrency(totalOverdue, 'IDR', { compact: true })}
          icon={<Wallet />}
          accent={totalOverdue > 0 ? 'danger' : 'success'}
          sub={totalAr ? `${fmtPercent((totalOverdue / totalAr) * 100, 0)} of the ledger` : 'nothing past due'}
        />
      </div>

      <DataTable
        data={customers}
        columns={columns}
        getId={(c) => c.id}
        getLabel={(c) => c.name}
        entityLabel="customer"
        exportName="customers"
        storageKey="customers"
        searchText={(c) => `${c.code} ${c.name} ${c.city} ${c.taxId} ${c.contacts.map((x) => x.name).join(' ')}`}
        initialSort={{ key: 'ar', dir: 'desc' }}
        rowTone={(c) => (c.status === 'ON_HOLD' || c.status === 'BLACKLISTED' ? 'bg-danger-soft/25' : undefined)}
        filters={[
          {
            key: 'segment', label: 'Segment', values: segment, onChange: setSegment,
            options: CUSTOMER_SEGMENTS.map((x) => ({ value: x.value, label: x.label })),
            match: (c, v) => v.includes(c.segment),
          },
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: Array.from(new Set(customers.map((c) => c.status))).map((v) => ({ value: v, label: v.replace(/_/g, ' ') })),
            match: (c, v) => v.includes(c.status),
          },
        ]}
        footerSummary={(rows) => (
          <span className="tnum">
            {rows.length} accounts · {fmtCurrency(rows.reduce((a, c) => a + openAr(c), 0), 'IDR', { compact: true })} outstanding
          </span>
        )}
      />
    </div>
  )
}
