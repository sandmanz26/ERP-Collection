import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleDollarSign, FileText, Percent, TrendingDown, Trophy } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import type { Quotation } from '@/data/types'
import { lossReasons, pipeline, quoteClock, quoteIsLive, quoteValue } from '@/lib/commerce'
import { LOST_REASONS, QUOTATION_STATUSES, QUOTE_MARGIN_FLOOR_PERCENT } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'

export function QuotationsPage() {
  const { quotations, customers, convertQuotation, sendQuotation, decideQuotation } = useMfg()
  const toast = useToast()
  const navigate = useNavigate()
  const [status, setStatus] = React.useState<string[]>([])
  const [flag, setFlag] = React.useState<string[]>([])

  const p = pipeline(quotations)
  const losses = lossReasons(quotations)
  const customer = (id: string) => customers.find((c) => c.id === id)

  const columns: Column<Quotation>[] = [
    {
      key: 'code', header: 'Quotation', width: 'min-w-[250px]', pinned: true, sortable: true, sortValue: (q) => q.code,
      cell: (q) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">
            {q.code}
            {q.revision > 1 && <span className="ml-1.5 font-sans text-[11px] font-normal text-fg-muted">rev {q.revision}</span>}
          </p>
          <p className="truncate text-[11.5px] text-fg-muted">{customer(q.customerId)?.name ?? q.enquiryFrom}</p>
        </div>
      ),
      exportValue: (q) => q.code,
    },
    {
      key: 'status', header: 'Status', width: 'w-[150px]', sortable: true, sortValue: (q) => q.status,
      cell: (q) => <StatusBadge value={q.status} size="sm" />,
      exportValue: (q) => q.status,
    },
    {
      key: 'value', header: 'Value', align: 'right', width: 'w-[145px]', sortable: true,
      sortValue: (q) => quoteValue(q).gross,
      cell: (q) => {
        const v = quoteValue(q)
        return (
          <div>
            <p className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(v.gross, 'IDR', { compact: true })}</p>
            {v.discountGiven > 0 && (
              <p className="tnum text-[11px] text-fg-muted">less {fmtCurrency(v.discountGiven, 'IDR', { compact: true })} given</p>
            )}
          </div>
        )
      },
      exportValue: (q) => Math.round(quoteValue(q).gross),
    },
    {
      key: 'margin', header: 'Margin', align: 'right', width: 'w-[135px]', sortable: true,
      headerHint: `Contribution over factory standard cost: gross less the material, labour and overhead frozen at pricing time, less the logistics the quote absorbed. It still has to carry selling, admin and finance, which is why the floor sits at ${QUOTE_MARGIN_FLOOR_PERCENT}%.`,
      sortValue: (q) => quoteValue(q).marginPercent,
      cell: (q) => {
        const v = quoteValue(q)
        return (
          <Tooltip content={`${fmtCurrency(v.contribution, 'IDR', { compact: true })} of contribution on ${fmtCurrency(v.cost, 'IDR', { compact: true })} of standard cost.`}>
            <div>
              <p className={`tnum text-[12.5px] font-semibold ${v.belowFloor ? 'text-danger' : 'text-success'}`}>{fmtPercent(v.marginPercent, 1)}</p>
              {v.belowFloor && <p className="text-[11px] text-danger">below the floor</p>}
            </div>
          </Tooltip>
        )
      },
      exportValue: (q) => quoteValue(q).marginPercent,
    },
    {
      key: 'weighted', header: 'Weighted', align: 'right', width: 'w-[135px]', sortable: true,
      headerHint: 'The value multiplied by the desk’s own probability. This column, summed, is the forecast.',
      sortValue: (q) => quoteValue(q).weighted,
      cell: (q) => (
        <div>
          <p className="tnum text-[12.5px]">{quoteIsLive(q.status) ? fmtCurrency(quoteValue(q).weighted, 'IDR', { compact: true }) : <span className="text-fg-subtle">—</span>}</p>
          {quoteIsLive(q.status) && <p className="tnum text-[11px] text-fg-muted">at {q.probabilityPercent}%</p>}
        </div>
      ),
      exportValue: (q) => Math.round(quoteValue(q).weighted),
    },
    {
      key: 'validity', header: 'Validity', width: 'w-[185px]', sortable: true, sortValue: (q) => q.validUntil,
      cell: (q) => {
        const c = quoteClock(q)
        if (!c.live) {
          return (
            <div>
              <p className="tnum text-[12px] text-fg-muted">{q.decidedAt ? `decided ${fmtDate(q.decidedAt, 'short')}` : `lapsed ${fmtDate(q.validUntil, 'short')}`}</p>
              {q.lostReason && <p className="text-[11px] text-danger">{LOST_REASONS.find((r) => r.value === q.lostReason)?.label}</p>}
            </div>
          )
        }
        return (
          <div>
            <p className="tnum text-[12.5px] text-fg">to {fmtDate(q.validUntil)}</p>
            <p className={`text-[11px] ${c.lapsed ? 'font-semibold text-danger' : c.chasing ? 'text-warning' : 'text-fg-muted'}`}>
              {c.lapsed
                ? `lapsed ${Math.abs(c.daysLeft)} day${Math.abs(c.daysLeft) === 1 ? '' : 's'} ago`
                : `${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'} left`}
            </p>
          </div>
        )
      },
      exportValue: (q) => q.validUntil,
    },
    {
      key: 'lead', header: 'Promised in', align: 'right', width: 'w-[125px]', sortable: true,
      headerHint: 'The longest lead time on any line — the date the quote is really promising.',
      sortValue: (q) => quoteValue(q).leadTimeDays,
      cell: (q) => <span className="tnum text-[12.5px]">{quoteValue(q).leadTimeDays} d</span>,
      exportValue: (q) => quoteValue(q).leadTimeDays,
    },
    {
      key: 'owner', header: 'Sales', width: 'w-[170px]', defaultHidden: true,
      cell: (q) => <span className="truncate text-[12px] text-fg-muted">{q.salesPerson}</span>,
      exportValue: (q) => q.salesPerson,
    },
    {
      key: 'do', header: '', width: 'w-[150px]', align: 'right',
      cell: (q) => {
        if (q.status === 'DRAFT') {
          return (
            <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); sendQuotation(q.id); toast.push({ title: `${q.code} sent`, description: `Valid to ${fmtDate(q.validUntil)}.`, tone: 'success' }) }}>
              Send
            </Button>
          )
        }
        if (q.status === 'SENT' || q.status === 'NEGOTIATING') {
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                size="xs" variant="primary"
                onClick={(e) => {
                  e.stopPropagation()
                  convertQuotation(q.id)
                  toast.push({ title: `${q.code} won`, description: 'A sales order was raised at the prices it was won at.', tone: 'success', action: { label: 'Open orders', onClick: () => navigate('/orders') } })
                }}
              >
                Won
              </Button>
              <Button
                size="xs" variant="ghost"
                onClick={(e) => { e.stopPropagation(); decideQuotation(q.id, 'LOST', 'PRICE'); toast.push({ title: `${q.code} closed`, description: 'Recorded as lost on price — change the reason on the row if that is wrong.', tone: 'info' }) }}
              >
                Lost
              </Button>
            </div>
          )
        }
        return q.salesOrderId ? <span className="text-[11.5px] text-success">order raised</span> : null
      },
      exportValue: () => '',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Quotations"
        description="The order book before it is an order. Every quote here carries the standard cost it was priced on, frozen at the moment it went out — which is the only way to know afterwards whether a win was worth having."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Live pipeline"
          value={fmtCurrency(p.liveValue, 'IDR', { compact: true })}
          icon={<FileText />} accent="primary"
          sub={`${fmtNumber(p.live)} open quotation${p.live === 1 ? '' : 's'}`}
        />
        <KpiCard
          label="Weighted forecast"
          value={fmtCurrency(p.weightedValue, 'IDR', { compact: true })}
          icon={<CircleDollarSign />} accent="accent"
          sub="each quote at the desk’s own probability"
        />
        <KpiCard
          label="Win rate by value"
          value={fmtPercent(p.winRatePercent, 0)}
          icon={<Trophy />} accent={p.winRatePercent >= 45 ? 'success' : 'warning'}
          sub={p.averageDecisionDays ? `${fmtNumber(p.averageDecisionDays, 0)} days to a decision` : ''}
        />
        <KpiCard
          label="Priced below the floor"
          value={fmtNumber(p.belowFloor)}
          icon={<Percent />} accent={p.belowFloor ? 'danger' : 'success'}
          sub={p.belowFloor ? `under ${QUOTE_MARGIN_FLOOR_PERCENT}% contribution and needing a signature` : `every live quote clears the ${QUOTE_MARGIN_FLOOR_PERCENT}% floor`}
        />
      </div>

      {(p.lapsing > 0 || p.belowFloor > 0) && (
        <Card>
          <CardBody className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
            {p.lapsing > 0 && (
              <p className="text-[12.5px] text-fg">
                <span className="font-semibold text-warning">{p.lapsing}</span> live quotation{p.lapsing === 1 ? '' : 's'} inside the last week of validity.{' '}
                <span className="text-fg-muted">A lapsed quote cannot simply be re-sent — the timber and the rate have both moved under it.</span>
              </p>
            )}
            {p.belowFloor > 0 && (
              <p className="text-[12.5px] text-fg">
                <span className="font-semibold text-danger">{p.belowFloor}</span> priced under the {QUOTE_MARGIN_FLOOR_PERCENT}% contribution floor.{' '}
                <span className="text-fg-muted">At that level the order is not carrying its share of selling and admin — check the standard cost behind it before conceding anything else.</span>
              </p>
            )}
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DataTable
          data={quotations}
          columns={columns}
          getId={(q) => q.id}
          getLabel={(q) => q.code}
          entityLabel="quotation"
          exportName="quotations"
          storageKey="quotations"
          searchText={(q) => `${q.code} ${customer(q.customerId)?.name ?? ''} ${q.salesPerson} ${q.destination ?? ''}`}
          initialSort={{ key: 'validity', dir: 'asc' }}
          rowTone={(q) => (quoteClock(q).lapsed ? 'bg-danger-soft/25' : quoteValue(q).belowFloor && quoteIsLive(q.status) ? 'bg-warning-soft/20' : undefined)}
          filters={[
            {
              key: 'status', label: 'Status', values: status, onChange: setStatus,
              options: QUOTATION_STATUSES.map((x) => ({ value: x.value, label: x.label })),
              match: (q, v) => v.includes(q.status),
            },
            {
              key: 'flag', label: 'Show', values: flag, onChange: setFlag,
              options: [
                { value: 'LIVE', label: 'Live only' },
                { value: 'FLOOR', label: 'Below margin floor' },
                { value: 'LAPSING', label: 'Lapsing or lapsed' },
              ],
              match: (q, v) =>
                (!v.includes('LIVE') || quoteIsLive(q.status))
                && (!v.includes('FLOOR') || quoteValue(q).belowFloor)
                && (!v.includes('LAPSING') || quoteClock(q).chasing || quoteClock(q).lapsed),
            },
          ]}
        />

        <Card className="h-fit">
          <CardHeader
            icon={<TrendingDown />}
            title="Why we lose"
            description="By value, not by count. A win rate counted on quotations flatters a desk that wins small ones."
          />
          <CardBody className="space-y-3">
            {losses.length === 0 && <Because>Nothing closed against us in the book yet.</Because>}
            {losses.map((row) => {
              const meta = LOST_REASONS.find((r) => r.value === row.reason)
              return (
                <div key={row.reason}>
                  <div className="flex items-baseline justify-between gap-3">
                    <Tooltip content={meta?.hint ?? ''}>
                      <span className="text-[12.5px] font-medium text-fg">{meta?.label ?? row.reason}</span>
                    </Tooltip>
                    <span className="tnum shrink-0 text-[12px] text-fg-muted">
                      {fmtCurrency(row.value, 'IDR', { compact: true })} · {row.count}
                    </span>
                  </div>
                  <Progress className="mt-1.5" value={row.sharePercent} tone={row.reason === 'PRICE' ? 'warning' : row.reason === 'LEAD_TIME' ? 'danger' : 'primary'} size="sm" />
                </div>
              )
            })}
            {losses.some((r) => r.reason === 'LEAD_TIME') && (
              <Because className="border-t border-border pt-3">
                Losing on lead time is the import clock showing up in the order book. It is the one reason on this list that a longer purchase-order horizon actually fixes.
              </Because>
            )}
          </CardBody>
          <CardBody className="border-t border-border">
            <div className="flex flex-wrap gap-1.5">
              {QUOTATION_STATUSES.map((s) => (
                <Tooltip key={s.value} content={s.hint}>
                  <span><Badge tone="neutral" size="sm">{s.label}</Badge></span>
                </Tooltip>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
