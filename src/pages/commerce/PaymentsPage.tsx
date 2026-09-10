import * as React from 'react'
import { ArrowDownLeft, ArrowUpRight, Building, Landmark, Wallet } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, MetaRow, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import type { Payment } from '@/data/types'
import { bankBalance, cashByWeek, cashPosition, paymentNet } from '@/lib/commerce'
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'

export function PaymentsPage() {
  const { payments, invoices, bankAccounts, clearPayment } = useMfg()
  const toast = useToast()
  const [direction, setDirection] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<string[]>([])

  const cash = cashPosition(bankAccounts, payments, invoices)
  const weeks = cashByWeek(payments)
  const peak = Math.max(1, ...weeks.map((w) => Math.max(w.inflow, w.outflow)))
  const waiting = payments.filter((p) => p.status === 'PENDING_APPROVAL')
  const bounced = payments.filter((p) => p.status === 'BOUNCED')

  const columns: Column<Payment>[] = [
    {
      key: 'code', header: 'Reference', width: 'min-w-[240px]', pinned: true, sortable: true, sortValue: (p) => p.code,
      cell: (p) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-mono text-[12.5px] font-semibold text-fg">
            {p.direction === 'IN' ? <ArrowDownLeft className="size-3.5 shrink-0 text-success" /> : <ArrowUpRight className="size-3.5 shrink-0 text-danger" />}
            {p.code}
          </p>
          <p className="truncate text-[11.5px] text-fg-muted">{p.partyName}</p>
        </div>
      ),
      exportValue: (p) => p.code,
    },
    {
      key: 'status', header: 'Status', width: 'w-[165px]', sortable: true, sortValue: (p) => p.status,
      cell: (p) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge value={p.status} size="sm" />
          {p.isAdvance && <Badge tone="info" size="sm">advance</Badge>}
        </div>
      ),
      exportValue: (p) => p.status,
    },
    {
      key: 'method', header: 'Method', width: 'w-[150px]',
      cell: (p) => (
        <Tooltip content={PAYMENT_METHODS.find((m) => m.value === p.method)?.hint ?? ''}>
          <span className="text-[12.5px] text-fg-muted">{PAYMENT_METHODS.find((m) => m.value === p.method)?.label}</span>
        </Tooltip>
      ),
      exportValue: (p) => p.method,
    },
    {
      key: 'amount', header: 'Amount', align: 'right', width: 'w-[165px]', sortable: true,
      sortValue: (p) => Math.abs(paymentNet(p)),
      cell: (p) => (
        <div>
          <p className={`tnum text-[12.5px] font-semibold ${p.direction === 'IN' ? 'text-success' : 'text-fg'}`}>
            {fmtCurrency(Math.abs(paymentNet(p)), 'IDR', { compact: true })}
          </p>
          {p.currency !== 'IDR' && (
            <p className="tnum text-[11px] text-fg-muted">{fmtNumber(p.amount)} {p.currency} at {fmtNumber(p.fxRate)}</p>
          )}
        </div>
      ),
      exportValue: (p) => Math.round(Math.abs(paymentNet(p))),
    },
    {
      key: 'deductions', header: 'Withheld & charges', align: 'right', width: 'w-[170px]', defaultHidden: true,
      headerHint: 'Withholding tax is a prepayment the other side reclaims, not a discount we won. Bank charges are simply gone.',
      cell: (p) => (
        <div>
          <p className="tnum text-[12px]">{p.withholdingTax ? fmtCurrency(p.withholdingTax, 'IDR', { compact: true }) : '—'}</p>
          <p className="tnum text-[11px] text-fg-muted">{fmtCurrency(p.bankCharge, 'IDR', { compact: true })} charges</p>
        </div>
      ),
      exportValue: (p) => p.withholdingTax,
    },
    {
      key: 'fx', header: 'FX difference', align: 'right', width: 'w-[145px]', defaultHidden: true,
      headerHint: 'The gap between the rate the invoice was raised at and the rate it settled at.',
      cell: (p) => (p.fxDifference
        ? <span className={`tnum text-[12.5px] font-semibold ${p.fxDifference > 0 ? 'text-danger' : 'text-success'}`}>{fmtCurrency(Math.abs(p.fxDifference), 'IDR', { compact: true })}</span>
        : <span className="text-[12px] text-fg-subtle">—</span>),
      exportValue: (p) => p.fxDifference,
    },
    {
      key: 'against', header: 'Applied to', width: 'min-w-[240px]',
      cell: (p) => {
        if (!p.allocations.length) {
          return <span className="text-[12px] font-medium text-warning">Unapplied — nothing says what it is for</span>
        }
        return (
          <div className="space-y-0.5">
            {p.allocations.map((a) => (
              <p key={a.id} className="line-clamp-1 text-[11.5px] text-fg-muted">{a.memo}</p>
            ))}
          </div>
        )
      },
      exportValue: (p) => p.allocations.map((a) => a.memo).join(' | '),
    },
    {
      key: 'date', header: 'Date', width: 'w-[125px]', sortable: true, sortValue: (p) => p.date,
      cell: (p) => <span className="tnum text-[12.5px]">{fmtDate(p.date)}</span>,
      exportValue: (p) => p.date,
    },
    {
      key: 'do', header: '', align: 'right', width: 'w-[110px]',
      cell: (p) => (p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT'
        ? (
          <Button
            size="xs" variant="primary"
            onClick={(e) => { e.stopPropagation(); clearPayment(p.id); toast.push({ title: `${p.code} released`, description: 'The allocations were applied to the invoices behind it.', tone: 'success' }) }}
          >
            Release
          </Button>
        )
        : null),
      exportValue: () => '',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Receipts & payments"
        description="Where the cash actually is, as opposed to where the invoices say it should be. A receipt with no allocation is not revenue collected — it is money sitting in a bank account that nobody can match to anything."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="In the bank"
          value={fmtCurrency(cash.balance, 'IDR', { compact: true })}
          icon={<Landmark />} accent="primary"
          sub={`${bankAccounts.filter((b) => b.active).length} accounts, all currencies at today’s rate`}
        />
        <KpiCard
          label="Fourteen-day forecast"
          value={fmtCurrency(cash.forecastFourteenDays, 'IDR', { compact: true })}
          icon={<Wallet />}
          accent={cash.forecastFourteenDays < 0 ? 'danger' : cash.forecastFourteenDays < cash.balance ? 'warning' : 'success'}
          sub="balance plus what falls due in, less what falls due out"
        />
        <KpiCard
          label="Received this month"
          value={fmtCurrency(cash.receivedThisMonth, 'IDR', { compact: true })}
          icon={<ArrowDownLeft />} accent="success"
          sub={`against ${fmtCurrency(cash.paidThisMonth, 'IDR', { compact: true })} paid out`}
        />
        <KpiCard
          label="Unapplied receipts"
          value={fmtCurrency(cash.unapplied, 'IDR', { compact: true })}
          icon={<ArrowUpRight />}
          accent={cash.unapplied > 0 ? 'warning' : 'success'}
          sub={cash.unapplied > 0 ? 'money in with nothing it obviously belongs to' : 'everything is matched'}
        />
      </div>

      {(waiting.length > 0 || bounced.length > 0) && (
        <Card>
          <CardBody className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
            {waiting.length > 0 && (
              <p className="text-[12.5px] text-fg">
                <span className="font-semibold text-warning">{waiting.length}</span> payment{waiting.length === 1 ? '' : 's'} waiting on a signature, worth {fmtCurrency(waiting.reduce((a, p) => a + p.amount * (p.fxRate || 1), 0), 'IDR', { compact: true })}.{' '}
                <span className="text-fg-muted">A supplier in arrears does not release the next lot.</span>
              </p>
            )}
            {bounced.length > 0 && (
              <p className="text-[12.5px] text-fg">
                <span className="font-semibold text-danger">{bounced.length}</span> returned unpaid.{' '}
                <span className="text-fg-muted">The invoice behind each one went straight back to overdue.</span>
              </p>
            )}
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <DataTable
          data={payments}
          columns={columns}
          getId={(p) => p.id}
          getLabel={(p) => p.code}
          entityLabel="payment"
          exportName="payments"
          storageKey="payments"
          searchText={(p) => `${p.code} ${p.partyName} ${p.reference} ${p.allocations.map((a) => a.memo).join(' ')}`}
          initialSort={{ key: 'date', dir: 'desc' }}
          rowTone={(p) => (p.status === 'BOUNCED' ? 'bg-danger-soft/25' : p.allocations.length === 0 ? 'bg-warning-soft/20' : undefined)}
          filters={[
            {
              key: 'direction', label: 'Direction', values: direction, onChange: setDirection,
              options: [{ value: 'IN', label: 'Received' }, { value: 'OUT', label: 'Paid' }],
              match: (p, v) => v.includes(p.direction),
            },
            {
              key: 'status', label: 'Status', values: status, onChange: setStatus,
              options: PAYMENT_STATUSES.map((x) => ({ value: x.value, label: x.label })),
              match: (p, v) => v.includes(p.status),
            },
          ]}
        />

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader icon={<Building />} title="The bank" description="Every account at today’s rate. The foreign ones are revalued at the close, which is where the FX difference comes from." />
            <CardBody className="space-y-2.5">
              {bankAccounts.filter((b) => b.active).map((b) => (
                <div key={b.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-fg">{b.name}</p>
                      <p className="truncate font-mono text-[11px] text-fg-muted">{b.bank} · {b.accountNo}</p>
                    </div>
                    <span className="tnum shrink-0 text-[12.5px] font-semibold text-fg">
                      {fmtCurrency(bankBalance(b.id, b.openingBalance, payments), 'IDR', { compact: true })}
                    </span>
                  </div>
                  {b.note && <Because className="mt-1 text-[11px]">{b.note}</Because>}
                  <Separator className="mt-2.5" />
                </div>
              ))}
              <MetaRow label="Receivable">{fmtCurrency(cash.receivable, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Payable">{fmtCurrency(cash.payable, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Withheld this year">{fmtCurrency(cash.withheldThisYear, 'IDR', { compact: true })}</MetaRow>
              <Because className="pt-1">
                Withholding is a prepayment of the other side’s income tax, reclaimable against their own liability. It is never a saving on our side of the deal.
              </Because>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Wallet />} title="Cash by week" description="Eight weeks of what actually cleared the bank, in against out." />
            <CardBody>
              <div className="space-y-2">
                {weeks.map((w) => (
                  <div key={w.from}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="tnum text-[11.5px] text-fg-muted">{w.week}</span>
                      <span className={`tnum text-[11.5px] font-semibold ${w.net >= 0 ? 'text-success' : 'text-danger'}`}>
                        {w.net >= 0 ? '+' : '−'}{fmtCurrency(Math.abs(w.net), 'IDR', { compact: true })}
                      </span>
                    </div>
                    <div className="mt-1 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-bg-muted">
                      <div className="h-full rounded-l-full bg-success" style={{ width: `${(w.inflow / peak) * 50}%` }} />
                      <div className="h-full rounded-r-full bg-danger" style={{ width: `${(w.outflow / peak) * 50}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
