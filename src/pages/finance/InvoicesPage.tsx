import * as React from 'react'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Pencil, Trash2, Wallet } from 'lucide-react'
import type { Invoice } from '@/data/types'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { arAging } from '@/lib/analytics'
import { fmtCurrency, fmtDate, pluralDays, relativeDays, titleCase } from '@/lib/format'
import { useToast } from '@/components/ui/toast'

export function InvoicesPage() {
  const toast = useToast()
  const { invoices, removeInvoices, upsertInvoice } = useErp()
  const [deleting, setDeleting] = React.useState<Invoice | null>(null)
  const [kind, setKind] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<string[]>([])

  const ar = invoices.filter((i) => i.kind === 'AR')
  const ap = invoices.filter((i) => i.kind === 'AP')
  const arOpen = ar.reduce((a, i) => a + (i.total - i.paid), 0)
  const apOpen = ap.reduce((a, i) => a + (i.total - i.paid), 0)
  const overdue = ar.filter((i) => i.status === 'OVERDUE')
  const aging = arAging(invoices)
  const agingMax = Math.max(...aging.map((b) => b.amount), 1)

  const columns: Column<Invoice>[] = [
    {
      key: 'number', header: 'Number', width: 'w-[168px]', pinned: true, sortable: true,
      sortValue: (r) => r.number, exportValue: (r) => r.number,
      cell: (r) => (
        <span className="flex items-center gap-1.5">
          {r.kind === 'AR' ? (
            <ArrowDownLeft className="size-3.5 text-success" />
          ) : (
            <ArrowUpRight className="size-3.5 text-warning" />
          )}
          <span className="font-mono text-[12px] font-medium text-fg">{r.number}</span>
        </span>
      ),
    },
    {
      key: 'kind', header: 'Type', width: 'w-[96px]', sortable: true,
      sortValue: (r) => r.kind, exportValue: (r) => r.kind,
      cell: (r) => <Badge tone={r.kind === 'AR' ? 'success' : 'warning'} size="sm">{r.kind}</Badge>,
    },
    {
      key: 'partyName', header: 'Counterparty', width: 'min-w-[240px]', sortable: true,
      sortValue: (r) => r.partyName, exportValue: (r) => r.partyName,
      cell: (r) => <span className="truncate text-fg">{r.partyName}</span>,
    },
    {
      key: 'projectCode', header: 'Job', width: 'w-[150px]', sortable: true,
      sortValue: (r) => r.projectCode ?? '', exportValue: (r) => r.projectCode ?? '',
      cell: (r) => <span className="font-mono text-[11.5px] text-fg-muted">{r.projectCode ?? '—'}</span>,
    },
    {
      key: 'issueDate', header: 'Issued', width: 'w-[112px]', sortable: true,
      sortValue: (r) => r.issueDate, exportValue: (r) => r.issueDate,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtDate(r.issueDate)}</span>,
    },
    {
      key: 'dueDate', header: 'Due', width: 'w-[136px]', sortable: true,
      sortValue: (r) => r.dueDate, exportValue: (r) => r.dueDate,
      cell: (r) => {
        const d = relativeDays(r.dueDate)!
        const settled = r.status === 'PAID' || r.status === 'VOID'
        return (
          <div>
            <p className="tnum text-[12.5px] text-fg">{fmtDate(r.dueDate)}</p>
            {!settled && (
              <p className={`text-[11px] ${d < 0 ? 'text-danger' : d <= 7 ? 'text-warning' : 'text-fg-muted'}`}>
                {d < 0 ? `${pluralDays(d)} overdue` : d === 0 ? 'due today' : `in ${pluralDays(d)}`}
              </p>
            )}
          </div>
        )
      },
    },
    {
      key: 'subtotal', header: 'Subtotal', width: 'w-[142px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.subtotal, exportValue: (r) => r.subtotal,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtCurrency(r.subtotal, r.currency, { compact: true })}</span>,
    },
    {
      key: 'vat', header: 'PPN', width: 'w-[128px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.vat, exportValue: (r) => r.vat,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtCurrency(r.vat, r.currency, { compact: true })}</span>,
    },
    {
      key: 'total', header: 'Total', width: 'w-[148px]', align: 'right', sortable: true,
      sortValue: (r) => r.total, exportValue: (r) => r.total,
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{fmtCurrency(r.total, r.currency, { compact: true })}</span>,
    },
    {
      key: 'outstanding', header: 'Outstanding', width: 'w-[156px]', align: 'right', sortable: true,
      sortValue: (r) => r.total - r.paid, exportValue: (r) => r.total - r.paid,
      cell: (r) => {
        const open = r.total - r.paid
        return (
          <span className={`tnum text-[12.5px] font-medium ${open > 0 ? (r.status === 'OVERDUE' ? 'text-danger' : 'text-fg') : 'text-fg-subtle'}`}>
            {open > 0 ? fmtCurrency(open, r.currency, { compact: true }) : 'settled'}
          </span>
        )
      },
    },
    {
      key: 'status', header: 'Status', width: 'w-[152px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'terms', header: 'Terms', width: 'w-[168px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.terms, exportValue: (r) => r.terms,
      cell: (r) => <span className="text-[12px] text-fg-muted">{titleCase(r.terms)}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Invoices & Bills"
        description="Receivables and payables side by side. Ageing is what decides whether a job that looked profitable actually was — recovery drops sharply once an invoice passes sixty days."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="AR outstanding" value={fmtCurrency(arOpen, 'IDR', { compact: true })} icon={<ArrowDownLeft />} accent="success" sub={`${ar.filter((i) => i.total > i.paid).length} open invoices`} />
        <KpiCard label="AP outstanding" value={fmtCurrency(apOpen, 'IDR', { compact: true })} icon={<ArrowUpRight />} accent="warning" sub={`${ap.filter((i) => i.total > i.paid).length} open bills`} />
        <KpiCard label="Overdue AR" value={fmtCurrency(overdue.reduce((a, i) => a + (i.total - i.paid), 0), 'IDR', { compact: true })} icon={<AlertTriangle />} accent={overdue.length ? 'danger' : 'success'} sub={`${overdue.length} invoices past due`} />
        <KpiCard label="Net working capital" value={fmtCurrency(arOpen - apOpen, 'IDR', { compact: true })} icon={<Wallet />} accent="primary" sub="Receivables less payables" />
      </div>

      <Card className="mb-5">
        <CardHeader title="Receivables ageing" description="Open AR by how long it has been past due." />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-5">
            {aging.map((b) => (
              <div key={b.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-[11.5px] font-medium text-fg-muted">{b.label}</span>
                  <span className="tnum text-[11px] text-fg-subtle">{b.count}</span>
                </div>
                <p className="tnum mb-1.5 text-[15px] font-semibold text-fg">{fmtCurrency(b.amount, 'IDR', { compact: true })}</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-soft">
                  <div
                    className={`h-full rounded-full ${
                      b.label === 'Current' ? 'bg-success' : b.label === '1–30 days' ? 'bg-warning' : 'bg-danger'
                    }`}
                    style={{ width: `${(b.amount / agingMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <DataTable
        data={invoices}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.number} — ${r.partyName}`}
        entityLabel="invoice"
        storageKey="invoices"
        exportName="invoices-and-bills"
        initialSort={{ key: 'dueDate', dir: 'asc' }}
        searchText={(r) => [r.number, r.partyName, r.projectCode, r.status, r.kind].join(' ')}
        rowTone={(r) => (r.status === 'OVERDUE' ? 'bg-danger-soft/25' : undefined)}
        filters={[
          {
            key: 'kind', label: 'Type', values: kind, onChange: setKind,
            options: [
              { value: 'AR', label: 'AR — Receivable' },
              { value: 'AP', label: 'AP — Payable' },
            ],
            match: (r, v) => v.includes(r.kind),
          },
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.status),
          },
        ]}
        onDelete={(ids) => {
          removeInvoices(ids)
          toast.push({ tone: 'success', title: `${ids.length} invoices deleted` })
        }}
        cascadeWarning={(rows) => {
          const settled = rows.filter((r) => r.paid > 0)
          return settled.length ? [`${settled.length} of these carry payments — the ledger entries behind them are not reversed`] : []
        }}
        bulkActions={(rows, clear) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              rows.forEach((r) => upsertInvoice({ ...r, paid: r.total, status: 'PAID' }))
              toast.push({ tone: 'success', title: `${rows.length} invoices marked as settled` })
              clear()
            }}
          >
            Mark as paid
          </Button>
        )}
        rowActions={(r) => (
          <>
            <Tooltip content={r.total > r.paid ? 'Mark as settled' : 'Already settled'}>
              <span>
                <Button
                  variant="ghost"
                  size="iconXs"
                  disabled={r.total <= r.paid}
                  onClick={() => {
                    upsertInvoice({ ...r, paid: r.total, status: 'PAID' })
                    toast.push({ tone: 'success', title: 'Marked as settled', description: r.number })
                  }}
                >
                  <Pencil />
                </Button>
              </span>
            </Tooltip>
            <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}>
                <Trash2 />
              </Button>
            </Tooltip>
          </>
        )}
        footerSummary={(rows) => (
          <span className="tnum">
            Total <span className="font-semibold text-fg">{fmtCurrency(rows.reduce((a, r) => a + r.total, 0), 'IDR', { compact: true })}</span> ·
            Outstanding{' '}
            <span className="font-semibold text-fg">{fmtCurrency(rows.reduce((a, r) => a + (r.total - r.paid), 0), 'IDR', { compact: true })}</span>
          </span>
        )}
      />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="invoice"
        items={deleting ? [`${deleting.number} — ${deleting.partyName}`] : []}
        destructiveNote={deleting && deleting.paid > 0 ? 'This invoice carries a payment.' : undefined}
        onConfirm={() => {
          if (deleting) {
            removeInvoices([deleting.id])
            toast.push({ tone: 'success', title: 'Invoice deleted' })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
