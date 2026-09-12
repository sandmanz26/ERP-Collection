import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Banknote, Eye, FileText, TrendingUp, Wallet } from 'lucide-react'
import type { ClientReceipt } from '@/data/types'
import { monthLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate } from '@/lib/format'
import { daysBetween } from '@/lib/domain'
import { invoiceTotals, receivableSummary } from '@/lib/finance'

/**
 * Money in, as a register in its own right. An invoice says what is owed; this
 * says what actually arrived, and how long the client took over it.
 */
export function ClientReceiptsPage() {
  const nav = useNavigate()
  const can = useCan()
  const { clientReceipts, invoices, clients, projects } = useErp()
  const [clientFilter, setClientFilter] = React.useState<string[]>([])
  const [methodFilter, setMethodFilter] = React.useState<string[]>([])
  const [timing, setTiming] = React.useState<string[]>([])

  const invoiceOf = (r: ClientReceipt) => invoices.find((i) => i.id === r.invoiceId)
  const clientName = (clientId: string) => {
    const c = clients.find((x) => x.id === clientId)
    return c?.brandName ?? c?.legalName ?? 'Unknown client'
  }

  /** How many days after the due date the money landed. Negative is early. */
  const lateness = (r: ClientReceipt) => {
    const invoice = invoiceOf(r)
    if (!invoice?.dueAt) return 0
    return Math.round(daysBetween(invoice.dueAt, r.receivedAt))
  }

  const ar = receivableSummary(invoices, clientReceipts)
  const thisMonth = clientReceipts.filter((r) => {
    const at = new Date(r.receivedAt)
    const now = new Date()
    return at.getMonth() === now.getMonth() && at.getFullYear() === now.getFullYear()
  })
  const late = clientReceipts.filter((r) => lateness(r) > 0)
  const avgDays = clientReceipts.length
    ? Math.round(clientReceipts.reduce((a, r) => a + lateness(r), 0) / clientReceipts.length)
    : 0

  const columns: Column<ClientReceipt>[] = [
    {
      key: 'code', header: 'Receipt', width: 'w-[168px]', sortable: true, pinned: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{r.code}</p>
          <p className="truncate font-mono text-[11px] text-fg-subtle">{r.reference ?? 'no reference'}</p>
        </div>
      ),
    },
    {
      key: 'invoice', header: 'Invoice', width: 'w-[168px]', sortable: true,
      sortValue: (r) => invoiceOf(r)?.code ?? '', exportValue: (r) => invoiceOf(r)?.code ?? '',
      cell: (r) => {
        const invoice = invoiceOf(r)
        if (!invoice) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <button
            onClick={(e) => { e.stopPropagation(); nav(`/invoices/${invoice.id}`) }}
            className="min-w-0 text-left"
          >
            <span className="block truncate font-mono text-[12px] font-medium text-primary hover:underline">{invoice.code}</span>
            <span className="block text-[11px] text-fg-subtle">{monthLabel(invoice.periodMonth)} {invoice.periodYear}</span>
          </button>
        )
      },
    },
    {
      key: 'client', header: 'Client', width: 'w-[210px] max-w-[210px]', sortable: true,
      sortValue: (r) => clientName(r.clientId), exportValue: (r) => clientName(r.clientId),
      cell: (r) => <p className="truncate text-[12.5px] font-medium text-fg">{clientName(r.clientId)}</p>,
    },
    {
      key: 'project', header: 'Project', width: 'w-[200px] max-w-[200px]', sortable: true, defaultHidden: true,
      sortValue: (r) => projects.find((p) => p.id === invoiceOf(r)?.projectId)?.name ?? '',
      exportValue: (r) => projects.find((p) => p.id === invoiceOf(r)?.projectId)?.code ?? '',
      cell: (r) => {
        const project = projects.find((p) => p.id === invoiceOf(r)?.projectId)
        return <p className="truncate text-[12px] text-fg-muted">{project?.name ?? '—'}</p>
      },
    },
    {
      key: 'receivedAt', header: 'Received', width: 'w-[150px]', sortable: true,
      sortValue: (r) => r.receivedAt, exportValue: (r) => r.receivedAt.slice(0, 10),
      cell: (r) => (
        <div className="min-w-0">
          <p className="tnum text-[12.5px] text-fg">{fmtDate(r.receivedAt)}</p>
          <p className="truncate text-[11px] text-fg-subtle">{r.recordedBy}</p>
        </div>
      ),
    },
    {
      key: 'timing', header: 'Against term', width: 'w-[132px]', sortable: true,
      sortValue: (r) => lateness(r), exportValue: (r) => lateness(r),
      headerHint: 'Days after the due date the money arrived; a negative number means early',
      cell: (r) => {
        const days = lateness(r)
        if (days > 0) return <Badge tone="warning" size="sm">{days}d late</Badge>
        if (days < 0) return <Badge tone="success" size="sm">{Math.abs(days)}d early</Badge>
        return <Badge tone="neutral" size="sm">on the day</Badge>
      },
    },
    {
      key: 'method', header: 'Method', width: 'w-[112px]', sortable: true,
      sortValue: (r) => r.method, exportValue: (r) => r.method,
      cell: (r) => <Badge tone="outline" size="sm">{r.method.toLowerCase()}</Badge>,
    },
    {
      key: 'kind', header: 'Kind', width: 'w-[124px]', sortable: true, defaultHidden: true,
      sortValue: (r) => {
        const invoice = invoiceOf(r)
        return invoice && Math.round(r.amount) >= Math.round(invoiceTotals(invoice).due) ? 1 : 0
      },
      exportValue: (r) => {
        const invoice = invoiceOf(r)
        return invoice && Math.round(r.amount) >= Math.round(invoiceTotals(invoice).due) ? 'FULL' : 'PART'
      },
      cell: (r) => {
        const invoice = invoiceOf(r)
        const full = invoice ? Math.round(r.amount) >= Math.round(invoiceTotals(invoice).due) : false
        return <Badge tone={full ? 'success' : 'warning'} size="sm">{full ? 'In full' : 'Part payment'}</Badge>
      },
    },
    {
      key: 'amount', header: 'Amount', width: 'w-[156px]', align: 'right', sortable: true,
      sortValue: (r) => r.amount, exportValue: (r) => Math.round(r.amount),
      cell: (r) => <span className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(r.amount, 'IDR')}</span>,
    },
    {
      key: 'account', header: 'Into account', width: 'w-[180px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.bankAccount ?? '', exportValue: (r) => r.bankAccount ?? '',
      cell: (r) => <span className="font-mono text-[11.5px] text-fg-muted">{r.bankAccount ?? '—'}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Client Receipts"
        description="Every payment a client has made against an invoice, and how it sat against the term that was agreed."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Collected"
          value={fmtCurrency(ar.received, 'IDR', { compact: true })}
          icon={<Banknote />}
          accent="success"
          sub={`${clientReceipts.length} payment${clientReceipts.length === 1 ? '' : 's'} recorded`}
        />
        <KpiCard
          label="This month"
          value={fmtCurrency(thisMonth.reduce((a, r) => a + r.amount, 0), 'IDR', { compact: true })}
          icon={<TrendingUp />}
          accent="primary"
          sub={`${thisMonth.length} payment${thisMonth.length === 1 ? '' : 's'} in`}
        />
        <KpiCard
          label="Still owed"
          value={fmtCurrency(ar.outstanding, 'IDR', { compact: true })}
          icon={<Wallet />}
          accent={ar.outstanding ? 'warning' : 'success'}
          sub={ar.overdueCount ? `${ar.overdueCount} invoice${ar.overdueCount === 1 ? '' : 's'} past term` : 'nothing past its term'}
          onClick={can('invoices.view') ? () => nav('/invoices') : undefined}
        />
        <KpiCard
          label="Average settlement"
          value={avgDays > 0 ? `${avgDays} days late` : avgDays < 0 ? `${Math.abs(avgDays)} days early` : 'on the day'}
          icon={<FileText />}
          accent={avgDays > 0 ? 'warning' : 'success'}
          sub={`${late.length} of ${clientReceipts.length} arrived after the due date`}
        />
      </div>

      <DataTable
        data={clientReceipts}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => r.code}
        entityLabel="receipt"
        storageKey="client-receipts"
        allowExport={can('receipts.export')}
        exportName="tata-gemilang-client-receipts"
        searchText={(r) => [r.code, r.reference, r.note, r.recordedBy, r.method, invoiceOf(r)?.code, clientName(r.clientId)].filter(Boolean).join(' ')}
        initialSort={{ key: 'receivedAt', dir: 'desc' }}
        onRowClick={(r) => nav(`/invoices/${r.invoiceId}`)}
        rowTone={(r) => (lateness(r) > 30 ? 'bg-warning-soft/25' : undefined)}
        filters={[
          {
            key: 'client', label: 'Client', values: clientFilter, onChange: setClientFilter,
            options: clients.map((c) => ({ value: c.id, label: c.brandName ?? c.legalName })),
            match: (r, v) => v.includes(r.clientId),
          },
          {
            key: 'method', label: 'Method', values: methodFilter, onChange: setMethodFilter,
            options: ['TRANSFER', 'GIRO', 'CHEQUE', 'CASH'].map((m) => ({ value: m, label: m.toLowerCase() })),
            match: (r, v) => v.includes(r.method),
          },
          {
            key: 'timing', label: 'Timing', values: timing, onChange: setTiming,
            options: [
              { value: 'EARLY', label: 'early or on time' },
              { value: 'LATE', label: 'late' },
              { value: 'VERY_LATE', label: 'over 30 days late' },
            ],
            match: (r, v) => {
              const days = lateness(r)
              return (
                (v.includes('EARLY') && days <= 0) ||
                (v.includes('LATE') && days > 0) ||
                (v.includes('VERY_LATE') && days > 30)
              )
            },
          },
        ]}
        rowActions={(r) => (
          <Tooltip content="Open the invoice this paid">
            <Button variant="ghost" size="iconXs" onClick={() => nav(`/invoices/${r.invoiceId}`)}>
              <Eye />
            </Button>
          </Tooltip>
        )}
        footerSummary={(rows) => (
          <span className="tnum">{fmtCurrency(rows.reduce((a, r) => a + r.amount, 0), 'IDR')} received in this view</span>
        )}
        emptyTitle="Nothing received yet"
        emptyDescription="Payments are recorded against an invoice."
      />
    </>
  )
}
