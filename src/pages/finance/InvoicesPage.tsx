import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Banknote, Eye, FilePlus2, FileText, Send, Wallet } from 'lucide-react'
import type { Invoice } from '@/data/types'
import { MONTHS, monthLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate } from '@/lib/format'
import {
  ageingBuckets, billableProjects, billedShare, clientExposure, invoiceState, invoiceTotals,
  receivableSummary,
} from '@/lib/finance'

const TH = 'whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted'
const TD = 'border-b border-border px-3 py-2.5 align-top'

/**
 * Every bill the company has raised. One project, one month, one invoice —
 * because one project is one contract for one building with its own term.
 */
export function InvoicesPage() {
  const nav = useNavigate()
  const toast = useToast()
  const can = useCan()
  const { invoices, clientReceipts, clients, projects, generateInvoices } = useErp()

  const [tab, setTab] = React.useState<'all' | 'ageing'>('all')
  const [raising, setRaising] = React.useState(false)
  const now = new Date()
  const [month, setMonth] = React.useState(String(now.getMonth() + 1))
  const [year, setYear] = React.useState(String(now.getFullYear()))
  const [status, setStatus] = React.useState<string[]>([])
  const [clientFilter, setClientFilter] = React.useState<string[]>([])
  const [periodFilter, setPeriodFilter] = React.useState<string[]>([])

  const clientOf = (i: Invoice) => clients.find((c) => c.id === i.clientId)
  const projectOf = (i: Invoice) => projects.find((p) => p.id === i.projectId)
  const stateOf = React.useCallback((i: Invoice) => invoiceState(i, clientReceipts), [clientReceipts])

  const ar = receivableSummary(invoices, clientReceipts)
  const ageing = ageingBuckets(invoices, clientReceipts)

  /* Who owes the most, and who has gone past the limit they were given. */
  const exposure = clients
    .map((client) => ({ client, ...clientExposure(client, invoices, clientReceipts) }))
    .filter((row) => row.outstanding > 0)
    .sort((a, b) => b.overdue - a.overdue || b.outstanding - a.outstanding)

  const pending = billableProjects(projects, invoices, Number(month), Number(year))

  const columns: Column<Invoice>[] = [
    {
      key: 'code', header: 'Invoice', width: 'w-[180px]', sortable: true, pinned: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{r.code}</p>
          <p className="truncate text-[11px] text-fg-subtle">{r.poNumber ?? 'no client PO'}</p>
        </div>
      ),
    },
    {
      key: 'client', header: 'Client', width: 'w-[210px] max-w-[210px]', sortable: true,
      sortValue: (r) => clientOf(r)?.legalName ?? '', exportValue: (r) => clientOf(r)?.legalName ?? '',
      cell: (r) => {
        const client = clientOf(r)
        return (
          <div className="min-w-0">
            <p className="truncate font-medium text-fg">{client?.brandName ?? client?.legalName}</p>
            <p className="truncate text-[11px] text-fg-subtle">{client?.code}</p>
          </div>
        )
      },
    },
    {
      key: 'project', header: 'Project', width: 'w-[220px] max-w-[220px]', sortable: true,
      sortValue: (r) => projectOf(r)?.name ?? '', exportValue: (r) => projectOf(r)?.code ?? '',
      cell: (r) => {
        const project = projectOf(r)
        return (
          <div className="min-w-0">
            <p className="truncate text-[12.5px] text-fg">{project?.name ?? 'Removed project'}</p>
            <p className="truncate font-mono text-[11px] text-fg-subtle">{project?.code}</p>
          </div>
        )
      },
    },
    {
      key: 'period', header: 'Period', width: 'w-[116px]', sortable: true,
      sortValue: (r) => r.periodYear * 100 + r.periodMonth,
      exportValue: (r) => `${monthLabel(r.periodMonth)} ${r.periodYear}`,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium text-fg">{monthLabel(r.periodMonth)}</p>
          <p className="tnum text-[11px] text-fg-subtle">{r.periodYear}</p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', width: 'w-[140px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => {
        const state = stateOf(r)
        return (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge value={r.status} size="sm" />
            {state.overdue && <span className="text-[11px] font-medium text-danger">{state.daysOverdue} days over</span>}
          </div>
        )
      },
    },
    {
      key: 'billed', header: 'Billed of contract', width: 'w-[164px]', sortable: true, defaultHidden: true,
      sortValue: (r) => billedShare(r), exportValue: (r) => `${billedShare(r).toFixed(1)}%`,
      headerHint: 'What survived the deductions for posts that were not filled',
      cell: (r) => {
        const pct = billedShare(r)
        return (
          <span className={`tnum text-[12.5px] ${pct < 100 ? 'font-medium text-warning' : 'text-fg-muted'}`}>
            {pct.toFixed(1)}%
          </span>
        )
      },
    },
    {
      key: 'due', header: 'Amount due', width: 'w-[152px]', align: 'right', sortable: true,
      sortValue: (r) => invoiceTotals(r).due, exportValue: (r) => Math.round(invoiceTotals(r).due),
      headerHint: 'After PPN is added and PPh 23 is withheld — what the client actually transfers',
      cell: (r) => <span className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(invoiceTotals(r).due, 'IDR', { compact: true })}</span>,
    },
    {
      key: 'collected', header: 'Collected', width: 'w-[164px]', sortable: true,
      sortValue: (r) => stateOf(r).pct, exportValue: (r) => Math.round(stateOf(r).received),
      cell: (r) => {
        const state = stateOf(r)
        if (r.status === 'DRAFT') return <span className="text-[12px] text-fg-subtle">not issued</span>
        if (r.status === 'VOID') return <span className="text-[12px] text-fg-subtle">cancelled</span>
        return (
          <div className="w-[140px]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="tnum text-[12.5px] font-medium text-fg">{fmtCurrency(state.received, 'IDR', { compact: true })}</span>
              <span className="tnum text-[11px] text-fg-subtle">{state.pct}%</span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-soft">
              <div
                className={`h-full rounded-full ${state.pct === 100 ? 'bg-success' : state.overdue ? 'bg-danger' : 'bg-primary'}`}
                style={{ width: `${state.pct}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      key: 'outstanding', header: 'Outstanding', width: 'w-[150px]', align: 'right', sortable: true,
      sortValue: (r) => stateOf(r).outstanding, exportValue: (r) => Math.round(stateOf(r).outstanding),
      cell: (r) => {
        const state = stateOf(r)
        if (state.outstanding <= 0) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <span className={`tnum text-[12.5px] font-semibold ${state.overdue ? 'text-danger' : 'text-fg'}`}>
            {fmtCurrency(state.outstanding, 'IDR', { compact: true })}
          </span>
        )
      },
    },
    {
      key: 'issuedAt', header: 'Issued', width: 'w-[124px]', sortable: true,
      sortValue: (r) => r.issuedAt ?? '', exportValue: (r) => r.issuedAt?.slice(0, 10) ?? '',
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{r.issuedAt ? fmtDate(r.issuedAt) : '—'}</span>,
    },
    {
      key: 'dueAt', header: 'Due', width: 'w-[124px]', sortable: true,
      sortValue: (r) => r.dueAt ?? '', exportValue: (r) => r.dueAt?.slice(0, 10) ?? '',
      cell: (r) => {
        const state = stateOf(r)
        return (
          <span className={`tnum text-[12px] ${state.overdue ? 'font-medium text-danger' : 'text-fg-muted'}`}>
            {r.dueAt ? fmtDate(r.dueAt) : '—'}
          </span>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="Invoices"
        description="One project, one month, one bill — contracted headcount at the contracted rate, less the posts that were not filled. PPN is added; PPh 23 is withheld by the client."
        actions={
          can('invoices.create') ? (
            <Button variant="primary" onClick={() => setRaising(true)}>
              <FilePlus2 /> Raise for a period
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Billed"
          value={fmtCurrency(ar.billed, 'IDR', { compact: true })}
          icon={<FileText />}
          accent="primary"
          sub={`${ar.invoices} issued · ${ar.drafts} still in draft`}
        />
        <KpiCard
          label="Collected"
          value={fmtCurrency(ar.received, 'IDR', { compact: true })}
          icon={<Banknote />}
          accent="success"
          sub={ar.billed ? `${Math.round((ar.received / ar.billed) * 100)}% of what was billed` : 'nothing billed yet'}
        />
        <KpiCard
          label="Outstanding"
          value={fmtCurrency(ar.outstanding, 'IDR', { compact: true })}
          icon={<Wallet />}
          accent={ar.outstanding ? 'warning' : 'success'}
          sub="owed by clients right now"
        />
        <KpiCard
          label="Overdue"
          value={fmtCurrency(ar.overdue, 'IDR', { compact: true })}
          icon={<AlertTriangle />}
          accent={ar.overdue ? 'danger' : 'success'}
          sub={ar.overdueCount ? `${ar.overdueCount} invoice${ar.overdueCount === 1 ? ' is' : 's are'} past term` : 'nothing past its term'}
          onClick={ar.overdueCount ? () => setTab('ageing') : undefined}
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: 'all', label: 'All invoices', count: invoices.length },
          { value: 'ageing', label: 'Who owes what', count: exposure.length },
        ]}
      />

      {tab === 'all' && (
        <DataTable
          data={invoices}
          columns={columns}
          getId={(r) => r.id}
          getLabel={(r) => r.code}
          entityLabel="invoice"
          storageKey="invoices"
          allowExport={can('invoices.export')}
          exportName="tata-gemilang-invoices"
          searchText={(r) =>
            [r.code, r.poNumber, r.status, r.note, clientOf(r)?.legalName, clientOf(r)?.brandName, projectOf(r)?.name, projectOf(r)?.code]
              .filter(Boolean)
              .join(' ')
          }
          initialSort={{ key: 'code', dir: 'desc' }}
          onRowClick={(r) => nav(`/invoices/${r.id}`)}
          rowTone={(r) => (stateOf(r).overdue ? 'bg-danger-soft/25' : r.status === 'DRAFT' ? 'bg-primary-soft/20' : undefined)}
          filters={[
            {
              key: 'status', label: 'Status', values: status, onChange: setStatus,
              options: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID'].map((v) => ({
                value: v, label: v.replace(/_/g, ' ').toLowerCase(),
              })),
              match: (r, v) => v.includes(r.status),
            },
            {
              key: 'client', label: 'Client', values: clientFilter, onChange: setClientFilter,
              options: clients.map((c) => ({ value: c.id, label: c.brandName ?? c.legalName })),
              match: (r, v) => v.includes(r.clientId),
            },
            {
              key: 'period', label: 'Period', values: periodFilter, onChange: setPeriodFilter,
              options: Array.from(new Set(invoices.map((i) => `${i.periodYear}-${String(i.periodMonth).padStart(2, '0')}`)))
                .sort()
                .reverse()
                .map((p) => ({ value: p, label: p })),
              match: (r, v) => v.includes(`${r.periodYear}-${String(r.periodMonth).padStart(2, '0')}`),
            },
          ]}
          rowActions={(r) => (
            <Tooltip content="Open the invoice">
              <Button variant="ghost" size="iconXs" onClick={() => nav(`/invoices/${r.id}`)}>
                <Eye />
              </Button>
            </Tooltip>
          )}
          footerSummary={(rows) => (
            <span className="tnum">
              {fmtCurrency(rows.reduce((a, r) => a + invoiceTotals(r).due, 0), 'IDR', { compact: true })} billed ·{' '}
              {fmtCurrency(rows.reduce((a, r) => a + stateOf(r).outstanding, 0), 'IDR', { compact: true })} still owed
            </span>
          )}
          emptyTitle="No invoices yet"
          emptyDescription="Raise a period and every contract that was running in it gets a draft bill."
        />
      )}

      {tab === 'ageing' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Ageing" description="How long the unpaid money has been sitting past its term." icon={<AlertTriangle />} />
            <div className="grid gap-px bg-border sm:grid-cols-4">
              {ageing.map((bucket) => (
                <div key={bucket.label} className="bg-surface p-4">
                  <p className="text-[11px] uppercase tracking-[0.055em] text-fg-subtle">{bucket.label}</p>
                  <p
                    className={`tnum mt-1 text-[17px] font-semibold ${
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

          <Card>
            <CardHeader
              icon={<Wallet />}
              title="What each client owes"
              description="Measured against the credit limit on the client record — over the limit is a conversation, not a rounding error."
            />
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr>
                    <th className={TH}>Client</th>
                    <th className={`${TH} text-right`}>Invoices</th>
                    <th className={`${TH} text-right`}>Outstanding</th>
                    <th className={`${TH} text-right`}>Overdue</th>
                    <th className={TH}>Against credit limit</th>
                  </tr>
                </thead>
                <tbody>
                  {exposure.map((row) => (
                    <tr key={row.client.id} className={row.overLimit ? 'bg-danger-soft/20' : undefined}>
                      <td className={TD}>
                        <p className="max-w-[260px] truncate font-medium text-fg">{row.client.brandName ?? row.client.legalName}</p>
                        <p className="text-[11px] text-fg-subtle">{row.client.code} · {row.client.accountManager}</p>
                      </td>
                      <td className={`${TD} tnum text-right text-fg-muted`}>{row.invoices}</td>
                      <td className={`${TD} tnum whitespace-nowrap text-right font-semibold text-fg`}>
                        {fmtCurrency(row.outstanding, 'IDR', { compact: true })}
                      </td>
                      <td className={`${TD} tnum whitespace-nowrap text-right`}>
                        {row.overdue > 0 ? (
                          <span className="font-medium text-danger">{fmtCurrency(row.overdue, 'IDR', { compact: true })}</span>
                        ) : (
                          <span className="text-fg-subtle">—</span>
                        )}
                      </td>
                      <td className={TD}>
                        <div className="w-[200px]">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="tnum text-[11.5px] text-fg-muted">{fmtCurrency(row.limit, 'IDR', { compact: true })}</span>
                            <span className={`tnum text-[11px] ${row.overLimit ? 'font-medium text-danger' : 'text-fg-subtle'}`}>
                              {Math.round(row.usedPct)}%
                            </span>
                          </div>
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-soft">
                            <div
                              className={`h-full rounded-full ${row.overLimit ? 'bg-danger' : row.usedPct > 70 ? 'bg-warning' : 'bg-primary'}`}
                              style={{ width: `${Math.min(100, row.usedPct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className="px-3 py-2.5 text-right text-[12px] font-medium text-fg-muted">
                      {exposure.length} client{exposure.length === 1 ? '' : 's'} owing
                    </td>
                    <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-[13px] font-semibold text-fg">
                      {fmtCurrency(ar.outstanding, 'IDR', { compact: true })}
                    </td>
                    <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-[13px] font-semibold text-danger">
                      {fmtCurrency(ar.overdue, 'IDR', { compact: true })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Raising a month's bills from the contracts that ran in it. */}
      <Dialog open={raising} onOpenChange={setRaising}>
        <DialogContent
          icon={<FilePlus2 />}
          title="Raise the invoices for a period"
          description="One draft per contract that was running in the month and has not been billed for it. Nothing is sent until each one is issued."
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setRaising(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                disabled={pending.length === 0}
                onClick={() => {
                  const result = generateInvoices(Number(month), Number(year))
                  if (!result.ok) {
                    toast.push({ tone: 'error', title: 'Nothing was raised', description: result.error ?? '' })
                    return
                  }
                  setRaising(false)
                  toast.push({
                    tone: 'success',
                    title: `${result.codes?.length} drafts raised`,
                    description: `${monthLabel(Number(month))} ${year} — check the headcount, then issue each one.`,
                  })
                }}
              >
                <Send /> Raise {pending.length} draft{pending.length === 1 ? '' : 's'}
              </Button>
            </>
          }
        >
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Month" required>
                <Select value={month} onChange={setMonth} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
              </Field>
              <Field label="Year" required>
                <Select
                  value={year}
                  onChange={setYear}
                  options={[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => ({
                    value: String(y), label: String(y),
                  }))}
                />
              </Field>
            </div>

            {pending.length === 0 ? (
              <p className="rounded-lg bg-surface-sunken px-3 py-2.5 text-[12.5px] text-fg-muted">
                Every contract that ran in {monthLabel(Number(month))} {year} has already been billed. Cancel an invoice to bill
                that period again.
              </p>
            ) : (
              <div className="max-h-[240px] overflow-auto rounded-lg border border-border">
                {pending.map((project) => {
                  const client = clients.find((c) => c.id === project.clientId)
                  const gaps = project.requirements.reduce((a, r) => a + Math.max(0, r.headcount - r.deployed), 0)
                  return (
                    <div key={project.id} className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-fg">{project.name}</p>
                        <p className="truncate text-[11px] text-fg-subtle">{client?.brandName ?? client?.legalName} · {project.code}</p>
                      </div>
                      {gaps > 0 && <Badge tone="warning" size="sm">{gaps} posts to deduct</Badge>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
