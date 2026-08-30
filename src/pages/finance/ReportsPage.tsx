import * as React from 'react'
import { Download, FileSpreadsheet, LineChart, Scale, Wallet } from 'lucide-react'
import { useErp } from '@/store/useErp'
import { ACCOUNT_TYPE_META } from '@/data/reference'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Segmented } from '@/components/ui/checkbox'
import { balanceSheet, incomeStatement, trialBalance } from '@/lib/analytics'
import { fmtCurrency, fmtPercent } from '@/lib/format'
import { exportCsv } from '@/lib/csv'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

type Report = 'pl' | 'bs' | 'tb'

export function ReportsPage() {
  const toast = useToast()
  const { accounts, journal } = useErp()
  const [report, setReport] = React.useState<Report>('pl')
  const [basis, setBasis] = React.useState<'posted' | 'all'>('posted')

  const balances = React.useMemo(() => trialBalance(accounts, journal, basis === 'posted'), [accounts, journal, basis])
  const pl = incomeStatement(balances)
  const bs = balanceSheet(balances, pl.operatingProfit)
  const totalDebits = balances.reduce((a, b) => a + b.debit, 0)
  const totalCredits = balances.reduce((a, b) => a + b.credit, 0)

  const exportReport = () => {
    if (report === 'tb') {
      exportCsv(
        'trial-balance',
        balances.map((b) => ({ code: b.account.code, name: b.account.name, type: b.account.type, debit: Math.round(b.debit), credit: Math.round(b.credit), balance: Math.round(b.balance) })),
        [
          { key: 'code', header: 'Account code' }, { key: 'name', header: 'Account name' }, { key: 'type', header: 'Type' },
          { key: 'debit', header: 'Debit' }, { key: 'credit', header: 'Credit' }, { key: 'balance', header: 'Balance' },
        ],
      )
    } else if (report === 'pl') {
      exportCsv(
        'income-statement',
        [...pl.revenue, ...pl.cogs, ...pl.expense].map((b) => ({ section: ACCOUNT_TYPE_META[b.account.type].label, code: b.account.code, name: b.account.name, amount: Math.round(b.balance) })),
        [{ key: 'section', header: 'Section' }, { key: 'code', header: 'Account code' }, { key: 'name', header: 'Account name' }, { key: 'amount', header: 'Amount (IDR)' }],
      )
    } else {
      exportCsv(
        'balance-sheet',
        [...bs.assets, ...bs.liabilities, ...bs.equity].map((b) => ({ section: ACCOUNT_TYPE_META[b.account.type].label, code: b.account.code, name: b.account.name, amount: Math.round(b.balance) })),
        [{ key: 'section', header: 'Section' }, { key: 'code', header: 'Account code' }, { key: 'name', header: 'Account name' }, { key: 'amount', header: 'Amount (IDR)' }],
      )
    }
    toast.push({ tone: 'success', title: 'Report exported', description: 'CSV downloaded to your device.' })
  }

  return (
    <>
      <PageHeader
        title="Financial Reports"
        description="Trial balance, profit and loss, and balance sheet built live from the journal. Draft entries can be included to see where the month lands before everything is posted."
        actions={
          <>
            <Segmented
              value={basis}
              onChange={setBasis}
              options={[
                { value: 'posted', label: 'Posted only' },
                { value: 'all', label: 'Include drafts' },
              ]}
            />
            <Button variant="secondary" onClick={exportReport}>
              <Download /> Export CSV
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue" value={fmtCurrency(pl.totalRevenue, 'IDR', { compact: true })} icon={<LineChart />} accent="success" sub="Freight, handling and documentation" />
        <KpiCard label="Gross profit" value={fmtCurrency(pl.grossProfit, 'IDR', { compact: true })} icon={<Wallet />} accent="primary" sub={`${fmtPercent(pl.grossMarginPct)} gross margin`} />
        <KpiCard label="Operating profit" value={fmtCurrency(pl.operatingProfit, 'IDR', { compact: true })} icon={<FileSpreadsheet />} accent={pl.operatingProfit >= 0 ? 'success' : 'danger'} sub={`${fmtPercent(pl.netMarginPct)} net margin`} />
        <KpiCard
          label="Trial balance"
          value={Math.abs(totalDebits - totalCredits) < 1 ? 'In balance' : 'Out of balance'}
          icon={<Scale />}
          accent={Math.abs(totalDebits - totalCredits) < 1 ? 'success' : 'danger'}
          sub={`Dr ${fmtCurrency(totalDebits, 'IDR', { compact: true })} = Cr ${fmtCurrency(totalCredits, 'IDR', { compact: true })}`}
        />
      </div>

      <Tabs
        value={report}
        onChange={setReport}
        variant="pill"
        className="mb-4"
        items={[
          { value: 'pl', label: 'Income statement' },
          { value: 'bs', label: 'Balance sheet' },
          { value: 'tb', label: 'Trial balance' },
        ]}
      />

      {report === 'pl' && (
        <Card>
          <CardHeader title="Income statement" description="Period to date, in IDR." />
          <CardBody className="p-0">
            <Section title="Revenue" rows={pl.revenue} total={pl.totalRevenue} tone="success" />
            <Section title="Cost of service" rows={pl.cogs} total={pl.totalCogs} tone="danger" negative />
            <SummaryRow label="Gross profit" value={pl.grossProfit} sub={fmtPercent(pl.grossMarginPct)} strong />
            <Section title="Operating expenses" rows={pl.expense} total={pl.totalExpense} tone="danger" negative />
            <SummaryRow label="Operating profit" value={pl.operatingProfit} sub={fmtPercent(pl.netMarginPct)} strong highlight />
          </CardBody>
        </Card>
      )}

      {report === 'bs' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Assets" description="What the business owns." />
            <CardBody className="p-0">
              <Section title="Assets" rows={bs.assets} total={bs.totalAssets} tone="info" hideTitle />
              <SummaryRow label="Total assets" value={bs.totalAssets} strong highlight />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Liabilities & equity" description="What it owes and what is left over." />
            <CardBody className="p-0">
              <Section title="Liabilities" rows={bs.liabilities} total={bs.totalLiabilities} tone="warning" />
              <Section title="Equity" rows={bs.equity} total={bs.totalEquity - pl.operatingProfit} tone="purple" />
              <div className="flex items-center justify-between px-4 py-2 text-[12.5px]">
                <span className="text-fg-muted">Profit for the period</span>
                <span className="tnum font-medium text-fg">{fmtCurrency(pl.operatingProfit, 'IDR')}</span>
              </div>
              <SummaryRow label="Total liabilities & equity" value={bs.totalLiabilities + bs.totalEquity} strong highlight />
              {Math.abs(bs.difference) > 1 && (
                <p className="border-t border-border bg-danger-soft px-4 py-2.5 text-[12px] font-medium text-danger-soft-fg">
                  Balance sheet does not tie — assets differ from liabilities and equity by {fmtCurrency(Math.abs(bs.difference), 'IDR')}.
                  Check for unbalanced journal entries.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {report === 'tb' && (
        <Card>
          <CardHeader title="Trial balance" description="Every account with movement, in account-code order." />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-sunken text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Code</th>
                  <th className="px-4 py-2 text-left font-semibold">Account</th>
                  <th className="px-4 py-2 text-left font-semibold">Type</th>
                  <th className="px-4 py-2 text-right font-semibold">Debit</th>
                  <th className="px-4 py-2 text-right font-semibold">Credit</th>
                  <th className="px-4 py-2 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {balances.map((b) => (
                  <tr key={b.account.id} className="hover:bg-bg-muted/60">
                    <td className="px-4 py-2 font-mono text-[11.5px] text-fg-muted">{b.account.code}</td>
                    <td className="px-4 py-2 text-fg">{b.account.name}</td>
                    <td className="px-4 py-2">
                      <Badge tone="outline" size="sm">{ACCOUNT_TYPE_META[b.account.type].label}</Badge>
                    </td>
                    <td className="tnum px-4 py-2 text-right text-fg-muted">{b.debit ? fmtCurrency(b.debit, 'IDR') : '—'}</td>
                    <td className="tnum px-4 py-2 text-right text-fg-muted">{b.credit ? fmtCurrency(b.credit, 'IDR') : '—'}</td>
                    <td className="tnum px-4 py-2 text-right font-medium text-fg">{fmtCurrency(b.balance, 'IDR')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-strong bg-surface-sunken font-semibold">
                  <td className="px-4 py-2.5" colSpan={3}>
                    Totals
                  </td>
                  <td className="tnum px-4 py-2.5 text-right text-fg">{fmtCurrency(totalDebits, 'IDR')}</td>
                  <td className="tnum px-4 py-2.5 text-right text-fg">{fmtCurrency(totalCredits, 'IDR')}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Badge tone={Math.abs(totalDebits - totalCredits) < 1 ? 'success' : 'danger'} size="sm">
                      {Math.abs(totalDebits - totalCredits) < 1 ? 'Balanced' : fmtCurrency(totalDebits - totalCredits, 'IDR')}
                    </Badge>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}

const DOT_TONE: Record<string, string> = {
  success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info', purple: 'bg-purple',
}

/** Cost and expense lines print in brackets; a credit balance on those lines is a gain, so it prints plain. */
function signed(value: number, negativeSection?: boolean) {
  if (!negativeSection) return fmtCurrency(value, 'IDR')
  return value >= 0 ? `(${fmtCurrency(value, 'IDR')})` : fmtCurrency(-value, 'IDR')
}

function Section({
  title,
  rows,
  total,
  tone,
  negative,
  hideTitle,
}: {
  title: string
  rows: ReturnType<typeof trialBalance>
  total: number
  tone: string
  negative?: boolean
  hideTitle?: boolean
}) {
  if (!rows.length) return null
  return (
    <div className="border-b border-border last:border-b-0">
      {!hideTitle && (
        <div className="flex items-center gap-2 bg-surface-sunken/70 px-4 py-2">
          <span className={cn('size-1.5 rounded-full', DOT_TONE[tone] ?? 'bg-fg-subtle')} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-muted">{title}</p>
        </div>
      )}
      {rows.map((b) => (
        <div key={b.account.id} className="flex items-center justify-between gap-4 px-4 py-1.5 hover:bg-bg-muted/50">
          <span className="min-w-0 truncate text-[12.5px] text-fg">
            <span className="mr-2 font-mono text-[11px] text-fg-subtle">{b.account.code}</span>
            {b.account.name}
          </span>
          <span className="tnum shrink-0 text-[12.5px] text-fg-muted">{signed(b.balance, negative)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-2">
        <span className="text-[12.5px] font-medium text-fg-muted">Total {title.toLowerCase()}</span>
        <span className="tnum text-[13px] font-semibold text-fg">{signed(total, negative)}</span>
      </div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  sub,
  strong,
  highlight,
}: {
  label: string
  value: number
  sub?: string
  strong?: boolean
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 border-b border-border px-4 py-2.5 last:border-b-0',
        highlight && 'bg-primary-soft/50',
      )}
    >
      <span className={cn('text-[13px]', strong ? 'font-semibold text-fg' : 'text-fg-muted')}>{label}</span>
      <span className="flex items-baseline gap-2">
        {sub && <span className="tnum text-[11.5px] text-fg-muted">{sub}</span>}
        <span className={cn('tnum text-[14px]', strong ? 'font-semibold' : '', value < 0 ? 'text-danger' : 'text-fg')}>
          {fmtCurrency(value, 'IDR')}
        </span>
      </span>
    </div>
  )
}
