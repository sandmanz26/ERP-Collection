import * as React from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, FileSpreadsheet, LineChart, Wallet } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { useMfg } from '@/store/useMfg'
import type { Account, Invoice, JournalEntry } from '@/data/types'
import { receivablesAgeing } from '@/lib/analytics'
import { workOrderCost } from '@/lib/production'
import { ACCOUNT_TYPE_META } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'
import { TODAY } from '@/data/clock'

/* ==================================================================
   Invoices & bills
   ================================================================== */

export function InvoicesPage() {
  const s = useMfg()
  const [tab, setTab] = React.useState<'AR' | 'AP'>('AR')
  const [status, setStatus] = React.useState<string[]>([])

  const ar = receivablesAgeing(s.invoices, 'AR')
  const ap = receivablesAgeing(s.invoices, 'AP')
  const current = tab === 'AR' ? ar : ap
  const rows = s.invoices.filter((i) => i.kind === tab)

  const columns: Column<Invoice>[] = [
    {
      key: 'code', header: 'Document', width: 'min-w-[200px]', pinned: true, sortable: true, sortValue: (i) => i.code,
      cell: (i) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{i.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{i.partyName}</p>
        </div>
      ),
      exportValue: (i) => i.code,
    },
    {
      key: 'status', header: 'Status', width: 'w-[150px]', sortable: true, sortValue: (i) => i.status,
      cell: (i) => <StatusBadge value={i.status} size="sm" />,
      exportValue: (i) => i.status,
    },
    {
      key: 'issued', header: 'Issued', width: 'w-[120px]', sortable: true, sortValue: (i) => i.issueDate,
      cell: (i) => <span className="tnum text-[12.5px]">{fmtDate(i.issueDate)}</span>,
      exportValue: (i) => i.issueDate,
    },
    {
      key: 'due', header: 'Due', width: 'w-[150px]', sortable: true, sortValue: (i) => i.dueDate,
      cell: (i) => {
        const overdue = i.dueDate < TODAY && i.status !== 'PAID' && i.status !== 'VOID'
        const days = Math.round((new Date(TODAY).getTime() - new Date(i.dueDate).getTime()) / 86_400_000)
        return (
          <div>
            <p className={`tnum text-[12.5px] ${overdue ? 'font-semibold text-danger' : ''}`}>{fmtDate(i.dueDate)}</p>
            {overdue && <p className="tnum text-[11px] text-danger">{days} days past due</p>}
          </div>
        )
      },
      exportValue: (i) => i.dueDate,
    },
    {
      key: 'total', header: 'Total', align: 'right', width: 'w-[150px]', sortable: true, sortValue: (i) => i.total * i.fxRate,
      cell: (i) => (
        <div>
          <p className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(i.total * i.fxRate, 'IDR', { compact: true })}</p>
          {i.currency !== 'IDR' && <p className="tnum text-[11px] text-fg-muted">{fmtCurrency(i.total, i.currency)}</p>}
        </div>
      ),
      exportValue: (i) => i.total,
    },
    {
      key: 'outstanding', header: 'Outstanding', align: 'right', width: 'w-[150px]', sortable: true,
      sortValue: (i) => (i.total - i.paidAmount) * i.fxRate,
      cell: (i) => {
        const out = (i.total - i.paidAmount) * i.fxRate
        return <span className={`tnum text-[12.5px] ${out > 0 ? 'font-semibold text-fg' : 'text-success'}`}>{out > 0 ? fmtCurrency(out, 'IDR', { compact: true }) : 'settled'}</span>
      },
      exportValue: (i) => (i.total - i.paidAmount) * i.fxRate,
    },
    {
      key: 'ref', header: 'Against', width: 'w-[170px]',
      cell: (i) => {
        const so = s.salesOrders.find((o) => o.id === i.salesOrderId)
        const sh = s.shipments.find((x) => x.id === i.shipmentId)
        if (so) return <Link to={`/orders/${so.id}`} className="font-mono text-[12px] font-medium text-primary hover:underline">{so.code}</Link>
        if (sh) return <Link to={`/imports/${sh.id}`} className="font-mono text-[12px] font-medium text-primary hover:underline">{sh.code}</Link>
        return <span className="text-[12px] text-fg-subtle">—</span>
      },
      exportValue: (i) => i.salesOrderId ?? i.shipmentId ?? '',
    },
    {
      key: 'note', header: 'Note', width: 'min-w-[300px]', defaultHidden: true,
      cell: (i) => <p className="text-[12px] text-fg-muted">{i.note ?? '—'}</p>,
      exportValue: (i) => i.note ?? '',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><Wallet className="size-3" /> Finance</Badge>}
        title="Invoices & bills"
        description="Receivables against a customer book that includes one account on hold, and payables against a supplier book where two consignments were paid for before they had cleared."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Receivables" value={fmtCurrency(ar.total, 'IDR', { compact: true })} icon={<Wallet />} accent="primary" />
        <KpiCard label="AR overdue" value={fmtCurrency(ar.overdue, 'IDR', { compact: true })} icon={<Wallet />} accent={ar.overdue ? 'danger' : 'success'} sub={ar.total ? fmtPercent((ar.overdue / ar.total) * 100, 0) + ' of the ledger' : ''} />
        <KpiCard label="Payables" value={fmtCurrency(ap.total, 'IDR', { compact: true })} icon={<Wallet />} accent="accent" />
        <KpiCard label="AP overdue" value={fmtCurrency(ap.overdue, 'IDR', { compact: true })} icon={<Wallet />} accent={ap.overdue ? 'warning' : 'success'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
        <Card>
          <CardHeader title={`${tab === 'AR' ? 'Receivables' : 'Payables'} ageing`} />
          <CardBody className="space-y-3">
            {current.buckets.map((b) => (
              <div key={b.label}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-[12px] text-fg">{b.label} days</span>
                  <span className="tnum text-[11.5px] text-fg-muted">{fmtCurrency(b.value, 'IDR', { compact: true })}</span>
                </div>
                <Progress
                  value={current.total ? (b.value / current.total) * 100 : 0}
                  tone={b.label === '90+' ? 'danger' : b.label === '61–90' ? 'warning' : 'primary'}
                  size="sm"
                />
              </div>
            ))}
            <Separator />
            <Because>
              {tab === 'AR' && ar.buckets.find((b) => b.label === '90+')!.value > 0
                ? 'The 90+ bucket is one account. It is why their next order sits unconfirmed at the credit gate rather than quietly going into production.'
                : 'Ageing that stays in the current bucket is a book that is being worked.'}
            </Because>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          <Tabs
            value={tab}
            onChange={setTab}
            variant="pill"
            items={[
              { value: 'AR', label: 'Receivables', count: s.invoices.filter((i) => i.kind === 'AR').length },
              { value: 'AP', label: 'Payables', count: s.invoices.filter((i) => i.kind === 'AP').length },
            ]}
          />
          <DataTable
            data={rows}
            columns={columns}
            getId={(i) => i.id}
            getLabel={(i) => i.code}
            entityLabel="invoice"
            exportName={tab === 'AR' ? 'receivables' : 'payables'}
            storageKey={`inv-${tab}`}
            searchText={(i) => `${i.code} ${i.partyName} ${i.note ?? ''}`}
            initialSort={{ key: 'due', dir: 'asc' }}
            rowTone={(i) => (i.status === 'OVERDUE' ? 'bg-danger-soft/25' : undefined)}
            filters={[
              {
                key: 'status', label: 'Status', values: status, onChange: setStatus,
                options: Array.from(new Set(rows.map((i) => i.status))).map((v) => ({ value: v, label: v.replace(/_/g, ' ') })),
                match: (i, v) => v.includes(i.status),
              },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

/* ==================================================================
   General ledger
   ================================================================== */

export function LedgerPage() {
  const s = useMfg()
  const [source, setSource] = React.useState<string[]>([])

  const debits = s.journal.flatMap((j) => j.lines).reduce((a, l) => a + l.debit, 0)
  const credits = s.journal.flatMap((j) => j.lines).reduce((a, l) => a + l.credit, 0)

  const columns: Column<JournalEntry>[] = [
    {
      key: 'code', header: 'Entry', width: 'min-w-[160px]', pinned: true, sortable: true, sortValue: (j) => j.code,
      cell: (j) => (
        <div className="min-w-0">
          <p className="font-mono text-[12.5px] font-semibold text-fg">{j.code}</p>
          <p className="tnum text-[11px] text-fg-muted">{fmtDate(j.date)}</p>
        </div>
      ),
      exportValue: (j) => j.code,
    },
    {
      key: 'memo', header: 'Memo', width: 'min-w-[380px]',
      cell: (j) => (
        <div className="min-w-0">
          <p className="text-[12.5px] text-fg">{j.memo}</p>
          {j.reference && <p className="font-mono text-[11px] text-fg-muted">{j.reference}</p>}
        </div>
      ),
      exportValue: (j) => j.memo,
    },
    {
      key: 'source', header: 'Source', width: 'w-[170px]', sortable: true, sortValue: (j) => j.source,
      cell: (j) => <Badge tone="outline" size="sm">{j.source.replace(/_/g, ' ').toLowerCase()}</Badge>,
      exportValue: (j) => j.source,
    },
    {
      key: 'lines', header: 'Lines', width: 'min-w-[420px]',
      cell: (j) => (
        <div className="space-y-0.5">
          {j.lines.map((l) => (
            <div key={l.id} className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[11.5px] text-fg-muted">
                <span className="font-mono text-fg">{l.accountCode}</span> {l.description}
              </span>
              <span className="tnum shrink-0 text-[11.5px]">
                {l.debit ? <span className="text-fg">{fmtCurrency(l.debit, 'IDR', { compact: true })}</span> : null}
                {l.credit ? <span className="text-accent">({fmtCurrency(l.credit, 'IDR', { compact: true })})</span> : null}
              </span>
            </div>
          ))}
        </div>
      ),
      exportValue: (j) => j.lines.map((l) => `${l.accountCode}:${l.debit || -l.credit}`).join(' '),
    },
    {
      key: 'amount', header: 'Amount', align: 'right', width: 'w-[140px]', sortable: true,
      sortValue: (j) => j.lines.reduce((a, l) => a + l.debit, 0),
      cell: (j) => <span className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(j.lines.reduce((a, l) => a + l.debit, 0), 'IDR', { compact: true })}</span>,
      exportValue: (j) => j.lines.reduce((a, l) => a + l.debit, 0),
    },
    {
      key: 'status', header: 'Status', width: 'w-[110px]',
      cell: (j) => <StatusBadge value={j.status} size="sm" />,
      exportValue: (j) => j.status,
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><BookOpen className="size-3" /> Finance</Badge>}
        title="General ledger"
        description="Double entry, with the postings a manufacturer that imports actually makes: goods receipt at landed cost with the creditable taxes kept out of it, a landed-cost finalisation that moves the difference to purchase price variance, and a scrap entry that carries the operations already spent."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Entries posted" value={fmtNumber(s.journal.length)} icon={<BookOpen />} accent="primary" />
        <KpiCard label="Total debits" value={fmtCurrency(debits, 'IDR', { compact: true })} icon={<BookOpen />} accent="accent" />
        <KpiCard label="Total credits" value={fmtCurrency(credits, 'IDR', { compact: true })} icon={<BookOpen />} accent="accent" />
        <KpiCard
          label="Balanced"
          value={Math.abs(debits - credits) < 1 ? 'Yes' : 'No'}
          icon={<BookOpen />}
          accent={Math.abs(debits - credits) < 1 ? 'success' : 'danger'}
          sub={Math.abs(debits - credits) < 1 ? 'every entry balances before it posts' : `out by ${fmtCurrency(Math.abs(debits - credits), 'IDR')}`}
        />
      </div>

      <DataTable
        data={s.journal}
        columns={columns}
        getId={(j) => j.id}
        getLabel={(j) => j.code}
        entityLabel="journal entry"
        exportName="journal"
        storageKey="ledger"
        searchText={(j) => `${j.code} ${j.memo} ${j.reference ?? ''} ${j.lines.map((l) => l.accountCode + l.description).join(' ')}`}
        initialSort={{ key: 'code', dir: 'desc' }}
        filters={[
          {
            key: 'source', label: 'Source', values: source, onChange: setSource,
            options: Array.from(new Set(s.journal.map((j) => j.source))).map((v) => ({ value: v, label: v.replace(/_/g, ' ').toLowerCase() })),
            match: (j, v) => v.includes(j.source),
          },
        ]}
      />
    </div>
  )
}

/* ==================================================================
   Chart of accounts
   ================================================================== */

export function AccountsPage() {
  const s = useMfg()
  const [type, setType] = React.useState<string[]>([])

  const balance = (code: string) =>
    s.journal
      .flatMap((j) => j.lines)
      .filter((l) => l.accountCode === code)
      .reduce((a, l) => a + l.debit - l.credit, 0)

  const columns: Column<Account>[] = [
    {
      key: 'code', header: 'Account', width: 'min-w-[320px]', pinned: true, sortable: true, sortValue: (a) => a.code,
      cell: (a) => (
        <div className="min-w-0" style={{ paddingLeft: a.parentCode ? (a.parentCode.endsWith('00') && a.parentCode.length === 4 && a.parentCode[1] !== '0' ? 28 : 14) : 0 }}>
          <p className="truncate text-[12.5px] text-fg">
            <span className="font-mono font-semibold">{a.code}</span> {a.name}
          </p>
          {a.description && <p className="truncate text-[11px] text-fg-muted">{a.description}</p>}
        </div>
      ),
      exportValue: (a) => a.code,
    },
    {
      key: 'type', header: 'Type', width: 'w-[190px]', sortable: true, sortValue: (a) => a.type,
      cell: (a) => (
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] text-fg-muted">{ACCOUNT_TYPE_META[a.type].label}</span>
          <Badge tone="outline" size="sm">{a.normalBalance === 'DEBIT' ? 'Dr' : 'Cr'}</Badge>
        </div>
      ),
      exportValue: (a) => a.type,
    },
    {
      key: 'group', header: 'Statement', width: 'w-[170px]',
      cell: (a) => <span className="text-[12px] text-fg-muted">{ACCOUNT_TYPE_META[a.type].group === 'BALANCE_SHEET' ? 'Balance sheet' : 'Income statement'}</span>,
      exportValue: (a) => ACCOUNT_TYPE_META[a.type].group,
    },
    {
      key: 'balance', header: 'Movement', align: 'right', width: 'w-[160px]', sortable: true, sortValue: (a) => Math.abs(balance(a.code)),
      headerHint: 'Net of what the seeded journal has posted to this account',
      cell: (a) => {
        const b = balance(a.code)
        if (!b) return <span className="text-[12px] text-fg-subtle">—</span>
        return <span className={`tnum text-[12.5px] font-semibold ${b > 0 ? 'text-fg' : 'text-accent'}`}>{fmtCurrency(Math.abs(b), 'IDR', { compact: true })} {b > 0 ? 'Dr' : 'Cr'}</span>
      },
      exportValue: (a) => balance(a.code),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><FileSpreadsheet className="size-3" /> Finance</Badge>}
        title="Chart of accounts"
        description="Indonesian in shape and manufacturing in structure: three inventory stages kept apart, cost of sales split into material, labour and overhead, PPN masukan and PPh 22 as prepaid tax rather than cost, and named accounts for purchase price and usage variance — because a variance with nowhere to post is a variance nobody explains."
      />

      <DataTable
        data={s.accounts}
        columns={columns}
        getId={(a) => a.id}
        getLabel={(a) => a.name}
        entityLabel="account"
        exportName="chart-of-accounts"
        storageKey="accounts"
        searchText={(a) => `${a.code} ${a.name} ${a.description ?? ''}`}
        initialSort={{ key: 'code', dir: 'asc' }}
        compactByDefault
        pageSize={60}
        filters={[
          {
            key: 'type', label: 'Type', values: type, onChange: setType,
            options: Object.entries(ACCOUNT_TYPE_META).map(([k, v]) => ({ value: k, label: v.label })),
            match: (a, v) => v.includes(a.type),
          },
        ]}
      />
    </div>
  )
}

/* ==================================================================
   Reports
   ================================================================== */

export function ReportsPage() {
  const s = useMfg()
  const [tab, setTab] = React.useState<'trial' | 'pl' | 'bs'>('trial')

  const rows = s.accounts
    .map((a) => {
      const lines = s.journal.flatMap((j) => j.lines).filter((l) => l.accountCode === a.code)
      const debit = lines.reduce((x, l) => x + l.debit, 0)
      const credit = lines.reduce((x, l) => x + l.credit, 0)
      return { account: a, debit, credit, net: debit - credit }
    })
    .filter((r) => r.debit || r.credit)

  const totalDebit = rows.reduce((a, r) => a + r.debit, 0)
  const totalCredit = rows.reduce((a, r) => a + r.credit, 0)

  const group = (types: Account['type'][]) => rows.filter((r) => types.includes(r.account.type))
  const revenue = group(['REVENUE']).reduce((a, r) => a + r.credit - r.debit, 0)
  const cogs = group(['COGS']).reduce((a, r) => a + r.net, 0)
  const expense = group(['EXPENSE']).reduce((a, r) => a + r.net, 0)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><LineChart className="size-3" /> Finance</Badge>}
        title="Financial reports"
        description="Everything below is summed from the journal. Nothing here is entered twice."
        actions={
          <Tabs
            value={tab}
            onChange={setTab}
            variant="pill"
            items={[
              { value: 'trial', label: 'Trial balance' },
              { value: 'pl', label: 'Income statement' },
              { value: 'bs', label: 'Balance sheet' },
            ]}
          />
        }
      />

      {tab === 'trial' && (
        <Card>
          <CardHeader title="Trial balance" description={`${rows.length} accounts with movement.`} />
          <CardBody className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                  <th className="py-2 pl-4 font-medium">Account</th>
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 text-right font-medium">Debit</th>
                  <th className="py-2 pr-4 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.account.id} className="border-b border-border/70 last:border-0">
                    <td className="py-1.5 pl-4">
                      <span className="font-mono text-[12px] font-medium text-fg">{r.account.code}</span>
                      <span className="ml-2 text-[12px] text-fg-muted">{r.account.name}</span>
                    </td>
                    <td className="px-2 py-1.5"><span className="text-[11.5px] text-fg-muted">{ACCOUNT_TYPE_META[r.account.type].label}</span></td>
                    <td className="px-2 py-1.5 text-right"><span className="tnum text-[12px]">{r.debit ? fmtCurrency(r.debit, 'IDR', { compact: true }) : '—'}</span></td>
                    <td className="py-1.5 pr-4 text-right"><span className="tnum text-[12px]">{r.credit ? fmtCurrency(r.credit, 'IDR', { compact: true }) : '—'}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-surface-sunken/60">
                  <td className="py-2.5 pl-4 text-[12.5px] font-semibold text-fg" colSpan={2}>Total</td>
                  <td className="px-2 py-2.5 text-right"><span className="tnum text-[13px] font-semibold text-fg">{fmtCurrency(totalDebit, 'IDR')}</span></td>
                  <td className="py-2.5 pr-4 text-right"><span className="tnum text-[13px] font-semibold text-fg">{fmtCurrency(totalCredit, 'IDR')}</span></td>
                </tr>
              </tfoot>
            </table>
          </CardBody>
          <CardBody className="border-t border-border">
            <Because>
              {Math.abs(totalDebit - totalCredit) < 1
                ? 'Debits equal credits, because the store refuses to post an entry that does not balance.'
                : `Out of balance by ${fmtCurrency(Math.abs(totalDebit - totalCredit), 'IDR')}.`}
            </Because>
          </CardBody>
        </Card>
      )}

      {tab === 'pl' && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader title="Income statement" description="Period to date, from the posted journal." />
            <CardBody className="space-y-1">
              <Section title="Revenue" rows={group(['REVENUE']).map((r) => ({ label: `${r.account.code} ${r.account.name}`, value: r.credit - r.debit }))} total={revenue} />
              <Separator className="my-2" />
              <Section title="Cost of goods sold" rows={group(['COGS']).map((r) => ({ label: `${r.account.code} ${r.account.name}`, value: r.net }))} total={cogs} negative />
              <Separator className="my-2" />
              <Line label="Gross profit" value={revenue - cogs} strong />
              <Separator className="my-2" />
              <Section title="Operating expenses" rows={group(['EXPENSE']).map((r) => ({ label: `${r.account.code} ${r.account.name}`, value: r.net }))} total={expense} negative />
              <Separator className="my-2" />
              <Line label="Operating profit" value={revenue - cogs - expense} strong />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Where the cost sits" />
            <CardBody className="space-y-3">
              {group(['COGS']).sort((a, b) => b.net - a.net).map((r) => (
                <div key={r.account.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="truncate text-[12px] text-fg">{r.account.name}</span>
                    <span className="tnum shrink-0 text-[11.5px] text-fg-muted">{fmtCurrency(r.net, 'IDR', { compact: true })}</span>
                  </div>
                  <Progress value={cogs ? (r.net / cogs) * 100 : 0} tone={r.account.code.startsWith('55') || r.account.code.startsWith('56') ? 'danger' : 'primary'} size="sm" />
                </div>
              ))}
              <Separator />
              <Because>
                The variance and scrap accounts are shown in red deliberately. They are not cost of production — they are the
                cost of the plan being wrong, and keeping them in their own accounts is the only way anyone ever argues about them.
              </Because>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'bs' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Assets" />
            <CardBody className="space-y-1">
              <Section title="" rows={group(['ASSET']).map((r) => ({ label: `${r.account.code} ${r.account.name}`, value: r.net }))} total={group(['ASSET']).reduce((a, r) => a + r.net, 0)} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Liabilities & equity" />
            <CardBody className="space-y-1">
              <Section title="Liabilities" rows={group(['LIABILITY']).map((r) => ({ label: `${r.account.code} ${r.account.name}`, value: r.credit - r.debit }))} total={group(['LIABILITY']).reduce((a, r) => a + r.credit - r.debit, 0)} />
              <Separator className="my-2" />
              <Section title="Equity" rows={group(['EQUITY']).map((r) => ({ label: `${r.account.code} ${r.account.name}`, value: r.credit - r.debit }))} total={group(['EQUITY']).reduce((a, r) => a + r.credit - r.debit, 0)} />
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}

function Section({ title, rows, total, negative }: { title: string; rows: { label: string; value: number }[]; total: number; negative?: boolean }) {
  return (
    <div>
      {title && <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">{title}</p>}
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-3 py-0.5">
          <span className="truncate text-[12px] text-fg-muted">{r.label}</span>
          <span className="tnum shrink-0 text-[12px] text-fg">{fmtCurrency(r.value, 'IDR', { compact: true })}</span>
        </div>
      ))}
      <Line label={title ? `Total ${title.toLowerCase()}` : 'Total'} value={total} negative={negative} />
    </div>
  )
}

function Line({ label, value, strong, negative }: { label: string; value: number; strong?: boolean; negative?: boolean }) {
  return (
    <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-1.5">
      <span className={`text-[12.5px] ${strong ? 'font-semibold text-fg' : 'font-medium text-fg-muted'}`}>{label}</span>
      <span className={`tnum ${strong ? 'text-[14px] font-semibold' : 'text-[12.5px] font-medium'} ${negative ? 'text-fg-muted' : value < 0 ? 'text-danger' : 'text-fg'}`}>
        {negative ? '(' : ''}{fmtCurrency(Math.abs(value), 'IDR', { compact: true })}{negative ? ')' : ''}
      </span>
    </div>
  )
}

/* ==================================================================
   Costing & variance
   ================================================================== */

export function CostingPage() {
  const s = useMfg()
  const orders = s.workOrders.filter((w) => w.status !== 'PLANNED' && w.status !== 'CANCELLED')

  const rows = orders.map((w) => {
    const cost = workOrderCost(w)
    const product = s.products.find((p) => p.id === w.productId)
    const so = s.salesOrders.find((o) => o.id === w.salesOrderId)
    return { w, cost, product, so }
  })

  const totalStandard = rows.reduce((a, r) => a + r.cost.standardTotal, 0)
  const totalActual = rows.reduce((a, r) => a + r.cost.actualTotal, 0)
  const beyondTolerance = rows.filter((r) => Math.abs(r.cost.variancePercent) > s.settings.costVarianceTolerance * 100)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><Wallet className="size-3" /> Finance</Badge>}
        title="Costing & variance"
        description="Standard against actual, decomposed rather than netted. A variance explained six weeks later at month end is a variance nobody can act on, so anything beyond tolerance raises an exception the day it happens."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Standard cost, open book" value={fmtCurrency(totalStandard, 'IDR', { compact: true })} icon={<Wallet />} accent="primary" sub={`${rows.length} work orders`} />
        <KpiCard label="Actual to date" value={fmtCurrency(totalActual, 'IDR', { compact: true })} icon={<Wallet />} accent="accent" />
        <KpiCard
          label="Beyond tolerance"
          value={fmtNumber(beyondTolerance.length)}
          icon={<Wallet />}
          accent={beyondTolerance.length ? 'warning' : 'success'}
          sub={`tolerance ${fmtPercent(s.settings.costVarianceTolerance * 100, 0)}`}
        />
        <KpiCard
          label="Largest single variance"
          value={beyondTolerance.length ? fmtCurrency(Math.max(...beyondTolerance.map((r) => Math.abs(r.cost.totalVariance))), 'IDR', { compact: true }) : '—'}
          icon={<Wallet />}
          accent="danger"
          sub={beyondTolerance.sort((a, b) => Math.abs(b.cost.totalVariance) - Math.abs(a.cost.totalVariance))[0]?.w.code}
        />
      </div>

      <Card>
        <CardHeader title="Work orders, standard against actual" description="Material, labour and overhead kept apart, because they are three different conversations." />
        <CardBody className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                <th className="py-2 pl-4 font-medium">Work order</th>
                <th className="px-2 py-2 text-right font-medium">Standard</th>
                <th className="px-2 py-2 text-right font-medium">Actual</th>
                <th className="px-2 py-2 text-right font-medium">Material</th>
                <th className="px-2 py-2 text-right font-medium">Labour</th>
                <th className="px-2 py-2 text-right font-medium">Overhead</th>
                <th className="py-2 pr-4 text-right font-medium">Variance</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .sort((a, b) => Math.abs(b.cost.totalVariance) - Math.abs(a.cost.totalVariance))
                .map(({ w, cost, product, so }) => {
                  const bad = Math.abs(cost.variancePercent) > s.settings.costVarianceTolerance * 100
                  return (
                    <tr key={w.id} className={`border-b border-border/70 last:border-0 ${bad ? 'bg-warning-soft/20' : ''}`}>
                      <td className="py-2 pl-4">
                        <Link to={`/work-orders/${w.id}`} className="font-mono text-[12px] font-semibold text-fg hover:text-primary hover:underline">
                          {w.code}
                        </Link>
                        <p className="truncate text-[11px] text-fg-muted">{product?.name}{so ? ` · ${so.code}` : ''}</p>
                      </td>
                      <td className="px-2 py-2 text-right"><span className="tnum text-[12px]">{fmtCurrency(cost.standardTotal, 'IDR', { compact: true })}</span></td>
                      <td className="px-2 py-2 text-right"><span className="tnum text-[12px] font-semibold text-fg">{fmtCurrency(cost.actualTotal, 'IDR', { compact: true })}</span></td>
                      <td className="px-2 py-2 text-right">
                        <Tooltip content="Issued against the bill, at the landed cost the material actually carries.">
                          <span className={`tnum text-[12px] ${cost.materialVariance > 0 ? 'text-danger' : 'text-success'}`}>
                            {fmtCurrency(cost.materialVariance, 'IDR', { compact: true })}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className={`tnum text-[12px] ${cost.labourVariance > 0 ? 'text-danger' : 'text-success'}`}>
                          {fmtCurrency(cost.labourVariance, 'IDR', { compact: true })}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className={`tnum text-[12px] ${cost.overheadVariance > 0 ? 'text-danger' : 'text-success'}`}>
                          {fmtCurrency(cost.overheadVariance, 'IDR', { compact: true })}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <Tooltip content={cost.driver}>
                          <span className={`tnum text-[12.5px] font-semibold ${bad ? (cost.variancePercent > 0 ? 'text-danger' : 'text-success') : 'text-fg-muted'}`}>
                            {cost.variancePercent > 0 ? '+' : ''}{fmtPercent(cost.variancePercent, 1)}
                          </span>
                        </Tooltip>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  )
}
