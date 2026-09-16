import * as React from 'react'
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column, TableFilter } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { Sheet } from '@/components/ui/dialog'
import { StatusBadge, MetaRow } from '@/components/shared/status'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtDate, fmtDateTime, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import type { Account, JournalEntry } from '@/data/types'

export function LedgerPage() {
  const store = useErp()
  const [view, setView] = React.useState<'journal' | 'accounts' | 'trial'>('journal')
  const [sources, setSources] = React.useState<string[]>([])
  const [statuses, setStatuses] = React.useState<string[]>([])
  const [open, setOpen] = React.useState<JournalEntry | null>(null)

  const entryTotal = (e: JournalEntry) => e.lines.reduce((a, l) => a + l.debit, 0)

  /* balances folded out of the posted journal, so the trial balance cannot drift */
  const balances = React.useMemo(() => {
    const map = new Map<string, { debit: number; credit: number }>()
    store.journal
      .filter((e) => e.status === 'POSTED')
      .forEach((e) =>
        e.lines.forEach((l) => {
          const row = map.get(l.accountCode) ?? { debit: 0, credit: 0 }
          row.debit += l.debit
          row.credit += l.credit
          map.set(l.accountCode, row)
        }),
      )
    return map
  }, [store.journal])

  const balanceOf = (a: Account) => {
    const row = balances.get(a.code) ?? { debit: 0, credit: 0 }
    const natural = a.type === 'ASSET' || a.type === 'EXPENSE' ? 1 : -1
    return (row.debit - row.credit) * natural
  }

  const journalFilters: TableFilter<JournalEntry>[] = [
    {
      key: 'source',
      label: 'Source',
      options: Array.from(new Set(store.journal.map((e) => e.source))).map((s) => ({ value: s, label: s })),
      values: sources,
      onChange: setSources,
      match: (r, v) => v.includes(r.source),
    },
    {
      key: 'status',
      label: 'Status',
      options: ['POSTED', 'DRAFT', 'VOID'].map((v) => ({ value: v, label: titleCase(v) })),
      values: statuses,
      onChange: setStatuses,
      match: (r, v) => v.includes(r.status),
    },
  ]

  const journalColumns: Column<JournalEntry>[] = [
    {
      key: 'code',
      header: 'Entry',
      width: 'w-[150px]',
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
      key: 'memo',
      header: 'Memo',
      width: 'min-w-[300px]',
      sortable: true,
      sortValue: (r) => r.memo,
      exportValue: (r) => r.memo,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg">{r.memo}</p>
          <p className="truncate text-[11.5px] text-fg-muted">
            {r.source}
            {r.refCode ? ` · ${r.refCode}` : ''}
          </p>
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
      key: 'lines',
      header: 'Lines',
      align: 'right',
      width: 'w-[80px]',
      exportValue: (r) => r.lines.length,
      cell: (r) => <span className="tnum text-fg-muted">{r.lines.length}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => entryTotal(r),
      exportValue: (r) => Math.round(entryTotal(r)),
      cell: (r) => <span className="tnum font-medium">{fmtCurrency(entryTotal(r), 'IDR', { compact: true })}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[110px]',
      sortable: true,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'by',
      header: 'Posted by',
      width: 'w-[150px]',
      defaultHidden: true,
      exportValue: (r) => r.postedByName,
      cell: (r) => <span className="text-[12px] text-fg-muted">{r.postedByName}</span>,
    },
  ]

  const accountColumns: Column<Account>[] = [
    {
      key: 'code',
      header: 'Code',
      width: 'w-[110px]',
      pinned: true,
      sortable: true,
      sortValue: (r) => r.code,
      exportValue: (r) => r.code,
      cell: (r) => <span className="tnum font-medium text-fg">{r.code}</span>,
    },
    {
      key: 'name',
      header: 'Account',
      width: 'min-w-[280px]',
      sortable: true,
      sortValue: (r) => r.name,
      exportValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg">{r.name}</p>
          {r.description && <p className="truncate text-[11.5px] text-fg-muted">{r.description}</p>}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: 'w-[130px]',
      sortable: true,
      sortValue: (r) => r.type,
      exportValue: (r) => r.type,
      cell: (r) => <Badge size="sm" tone="neutral">{titleCase(r.type)}</Badge>,
    },
    {
      key: 'group',
      header: 'Group',
      width: 'w-[160px]',
      sortable: true,
      sortValue: (r) => r.group,
      exportValue: (r) => r.group,
      cell: (r) => <span className="text-fg-muted">{r.group}</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      width: 'w-[170px]',
      sortable: true,
      sortValue: (r) => balanceOf(r),
      exportValue: (r) => Math.round(balanceOf(r)),
      headerHint: 'Folded out of the posted journal, in the account’s natural direction.',
      cell: (r) => {
        const b = balanceOf(r)
        if (!balances.has(r.code)) return <span className="text-[12px] text-fg-subtle">no movement</span>
        return <span className={cn('tnum font-medium', b < 0 ? 'text-danger' : 'text-fg')}>{fmtCurrency(b, 'IDR', { compact: true })}</span>
      },
    },
  ]

  const posted = store.journal.filter((e) => e.status === 'POSTED')
  const totalDebit = posted.reduce((a, e) => a + e.lines.reduce((x, l) => x + l.debit, 0), 0)
  const totalCredit = posted.reduce((a, e) => a + e.lines.reduce((x, l) => x + l.credit, 0), 0)

  const trialGroups = Array.from(new Set(store.accounts.map((a) => a.group)))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Finance</Badge>}
        title="General ledger"
        description="Supplier bills, sales invoices and payments post themselves; the manual entries are the ones nobody has automated yet. Account balances are folded out of the posted journal every time this page renders, so a trial balance cannot quietly drift out of agreement with the entries behind it."
        actions={
          <Tabs
            variant="pill"
            value={view}
            onChange={setView}
            items={[
              { value: 'journal', label: 'Journal', count: store.journal.length },
              { value: 'accounts', label: 'Chart of accounts', count: store.accounts.length },
              { value: 'trial', label: 'Trial balance' },
            ]}
          />
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Entries" value={String(store.journal.length)} sub={`${posted.length} posted`} icon={<BookOpen />} accent="primary" />
        <KpiCard label="Total debits" value={fmtCurrency(totalDebit, 'IDR', { compact: true })} sub="posted entries only" accent="accent" />
        <KpiCard label="Total credits" value={fmtCurrency(totalCredit, 'IDR', { compact: true })} sub="posted entries only" accent="accent" />
        <KpiCard
          label="Out of balance"
          value={fmtCurrency(Math.abs(totalDebit - totalCredit), 'IDR', { compact: true })}
          sub={Math.abs(totalDebit - totalCredit) < 1 ? 'the ledger balances' : 'an entry does not balance'}
          accent={Math.abs(totalDebit - totalCredit) < 1 ? 'success' : 'danger'}
        />
      </div>

      {view === 'journal' && (
        <DataTable
          data={store.journal}
          columns={journalColumns}
          filters={journalFilters}
          getId={(r) => r.id}
          getLabel={(r) => r.code}
          entityLabel="entries"
          searchText={(r) => `${r.code} ${r.memo} ${r.source} ${r.refCode ?? ''} ${r.lines.map((l) => l.accountName).join(' ')}`}
          onRowClick={(r) => setOpen(r)}
          onDelete={store.removeJournal}
          exportName="kriyanusa-journal"
          storageKey="journal"
          initialSort={{ key: 'code', dir: 'desc' }}
          compactByDefault
        />
      )}

      {view === 'accounts' && (
        <DataTable
          data={store.accounts}
          columns={accountColumns}
          getId={(r) => r.id}
          getLabel={(r) => `${r.code} ${r.name}`}
          entityLabel="accounts"
          searchText={(r) => `${r.code} ${r.name} ${r.type} ${r.group} ${r.description ?? ''}`}
          onDelete={store.removeAccounts}
          exportName="kriyanusa-chart-of-accounts"
          storageKey="accounts"
          initialSort={{ key: 'code', dir: 'asc' }}
          compactByDefault
        />
      )}

      {view === 'trial' && (
        <div className="space-y-5">
          {trialGroups.map((group) => {
            const accounts = store.accounts.filter((a) => a.group === group && balances.has(a.code))
            if (!accounts.length) return null
            const groupTotal = accounts.reduce((a, x) => a + balanceOf(x), 0)
            return (
              <Card key={group}>
                <CardHeader
                  title={group}
                  actions={<span className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(groupTotal, 'IDR', { compact: true })}</span>}
                />
                <table className="w-full text-[12.5px]">
                  <tbody className="divide-y divide-border">
                    {accounts.map((a) => {
                      const row = balances.get(a.code)!
                      return (
                        <tr key={a.id} className="hover:bg-bg-muted/50">
                          <td className="w-[110px] px-5 py-2.5 tnum text-fg-muted">{a.code}</td>
                          <td className="px-5 py-2.5 text-fg">{a.name}</td>
                          <td className="tnum w-[150px] px-5 py-2.5 text-right text-fg-muted">{fmtCurrency(row.debit, 'IDR', { compact: true })}</td>
                          <td className="tnum w-[150px] px-5 py-2.5 text-right text-fg-muted">{fmtCurrency(row.credit, 'IDR', { compact: true })}</td>
                          <td className="tnum w-[160px] px-5 py-2.5 text-right font-medium text-fg">{fmtCurrency(balanceOf(a), 'IDR', { compact: true })}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Card>
            )
          })}
        </div>
      )}

      <Sheet
        open={!!open}
        onOpenChange={(v) => !v && setOpen(null)}
        title={open ? `${open.code} · ${open.source}` : ''}
        description={open?.memo}
        width="max-w-2xl"
      >
        {open && (
          <div className="space-y-5 p-5">
            <Card>
              <CardHeader title="Entry" />
              <CardBody className="divide-y divide-border py-0">
                <MetaRow label="Posted">{fmtDateTime(open.at)}</MetaRow>
                <MetaRow label="Status"><StatusBadge value={open.status} size="sm" /></MetaRow>
                <MetaRow label="Source">{open.source}</MetaRow>
                <MetaRow label="Reference">{open.refCode ?? '—'}</MetaRow>
                <MetaRow label="Posted by">{open.postedByName}</MetaRow>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Lines" />
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                    <th className="px-5 py-2.5 font-medium">Account</th>
                    <th className="px-5 py-2.5 text-right font-medium">Debit</th>
                    <th className="px-5 py-2.5 text-right font-medium">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {open.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-5 py-2.5">
                        <p className="text-fg">
                          <span className="tnum text-fg-muted">{l.accountCode}</span> {l.accountName}
                        </p>
                        {l.memo && <p className="text-[11.5px] text-fg-muted">{l.memo}</p>}
                      </td>
                      <td className="tnum px-5 py-2.5 text-right">{l.debit ? fmtCurrency(l.debit, 'IDR', { compact: true }) : '—'}</td>
                      <td className="tnum px-5 py-2.5 text-right">{l.credit ? fmtCurrency(l.credit, 'IDR', { compact: true }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-surface-sunken font-semibold">
                    <td className="px-5 py-2.5">Total</td>
                    <td className="tnum px-5 py-2.5 text-right">{fmtCurrency(open.lines.reduce((a, l) => a + l.debit, 0), 'IDR', { compact: true })}</td>
                    <td className="tnum px-5 py-2.5 text-right">{fmtCurrency(open.lines.reduce((a, l) => a + l.credit, 0), 'IDR', { compact: true })}</td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          </div>
        )}
      </Sheet>
    </div>
  )
}
