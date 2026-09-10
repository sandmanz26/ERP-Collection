import * as React from 'react'
import { CircleAlert, HandCoins, Scale, Undo2 } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import type { Claim } from '@/data/types'
import { claimCost, claimIsOpen, claimSummary, claimsByLiability } from '@/lib/commerce'
import { CLAIM_AGEING_DAYS, CLAIM_KINDS, CLAIM_LIABILITIES, CLAIM_REMEDIES, defectLabel } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'

export function ClaimsPage() {
  const { claims, customers, products, deliveries, salesOrders, settleClaim, closeClaim } = useMfg()
  const toast = useToast()
  const [kind, setKind] = React.useState<string[]>([])
  const [liability, setLiability] = React.useState<string[]>([])

  const s = claimSummary(claims, deliveries, salesOrders)
  const byLiability = claimsByLiability(claims)
  const totalLiability = byLiability.reduce((a, r) => a + r.value, 0)
  const customer = (id: string) => customers.find((c) => c.id === id)

  const columns: Column<Claim>[] = [
    {
      key: 'code', header: 'Claim', width: 'min-w-[240px]', pinned: true, sortable: true, sortValue: (c) => c.code,
      cell: (c) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{c.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">
            {customer(c.customerId)?.name} · {fmtNumber(c.quantity)} × {products.find((p) => p.id === c.productId)?.name}
          </p>
        </div>
      ),
      exportValue: (c) => c.code,
    },
    {
      key: 'kind', header: 'What happened', width: 'min-w-[280px]',
      cell: (c) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tooltip content={CLAIM_KINDS.find((k) => k.value === c.kind)?.hint ?? ''}>
              <span><Badge tone="neutral" size="sm">{CLAIM_KINDS.find((k) => k.value === c.kind)?.label}</Badge></span>
            </Tooltip>
            {c.defectCode && <Badge tone="warning" size="sm">{defectLabel(c.defectCode)}</Badge>}
          </div>
          <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-fg-muted">{c.description}</p>
        </div>
      ),
      exportValue: (c) => c.description,
    },
    {
      key: 'status', header: 'Status', width: 'w-[150px]', sortable: true, sortValue: (c) => c.status,
      cell: (c) => <StatusBadge value={c.status} size="sm" />,
      exportValue: (c) => c.status,
    },
    {
      key: 'liability', header: 'Liability', width: 'w-[140px]', sortable: true, sortValue: (c) => c.liability,
      headerHint: 'Who caused it. A supplier’s share is chargeable back and belongs on their scorecard; a carrier’s is only collectable if it was noted on the delivery note.',
      cell: (c) => (
        <Tooltip content={CLAIM_LIABILITIES.find((l) => l.value === c.liability)?.hint ?? ''}>
          <span><StatusBadge value={c.liability} size="sm" /></span>
        </Tooltip>
      ),
      exportValue: (c) => c.liability,
    },
    {
      key: 'remedy', header: 'Remedy', width: 'w-[160px]',
      cell: (c) => (
        <Tooltip content={CLAIM_REMEDIES.find((r) => r.value === c.remedy)?.hint ?? ''}>
          <span className="text-[12.5px] text-fg">{CLAIM_REMEDIES.find((r) => r.value === c.remedy)?.label}</span>
        </Tooltip>
      ),
      exportValue: (c) => c.remedy,
    },
    {
      key: 'cost', header: 'Cost to us', align: 'right', width: 'w-[150px]', sortable: true,
      headerHint: 'What we settled at, less anything charged back to the carrier or the supplier who caused it.',
      sortValue: (c) => claimCost(c).net,
      cell: (c) => {
        const cost = claimCost(c)
        return (
          <div>
            <p className={`tnum text-[12.5px] font-semibold ${cost.net > 0 ? 'text-danger' : 'text-success'}`}>{fmtCurrency(cost.net, 'IDR', { compact: true })}</p>
            {cost.recovered > 0 && <p className="tnum text-[11px] text-success">{fmtCurrency(cost.recovered, 'IDR', { compact: true })} recovered</p>}
            {cost.settled !== cost.claimed && cost.recovered === 0 && (
              <p className="tnum text-[11px] text-fg-muted">claimed {fmtCurrency(cost.claimed, 'IDR', { compact: true })}</p>
            )}
          </div>
        )
      },
      exportValue: (c) => Math.round(claimCost(c).net),
    },
    {
      key: 'age', header: 'Open for', align: 'right', width: 'w-[125px]', sortable: true,
      sortValue: (c) => (claimIsOpen(c.status) ? claimCost(c).daysOpen : -1),
      cell: (c) => {
        const cost = claimCost(c)
        if (!claimIsOpen(c.status)) return <span className="text-[12px] text-fg-subtle">closed {fmtDate(c.closedAt, 'short')}</span>
        return (
          <div>
            <p className={`tnum text-[12.5px] font-semibold ${cost.ageing ? 'text-danger' : 'text-fg'}`}>{cost.daysOpen} d</p>
            {cost.ageing && <p className="text-[11px] text-danger">past {CLAIM_AGEING_DAYS}</p>}
          </div>
        )
      },
      exportValue: (c) => claimCost(c).daysOpen,
    },
    {
      key: 'do', header: '', align: 'right', width: 'w-[130px]',
      cell: (c) => {
        if (!claimIsOpen(c.status)) return null
        if (c.remedy === 'PENDING') {
          return (
            <Button
              size="xs" variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                settleClaim(c.id, 'CREDIT_NOTE', c.liability === 'UNDECIDED' ? 'OURS' : c.liability, c.claimedAmount)
                toast.push({ title: `${c.code} settled`, description: 'Credited at the amount claimed. Change the remedy on the row if a repair is cheaper.', tone: 'info' })
              }}
            >
              Settle
            </Button>
          )
        }
        return (
          <Button
            size="xs" variant="ghost"
            onClick={(e) => { e.stopPropagation(); closeClaim(c.id); toast.push({ title: `${c.code} closed`, tone: 'success' }) }}
          >
            Close
          </Button>
        )
      },
      exportValue: () => '',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Returns & claims"
        description="What comes back after the gate. Final inspection catches what it catches; this page is the cost of everything it did not, plus the part of it somebody else has to pay for."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open claims"
          value={fmtNumber(s.open)}
          icon={<Undo2 />} accent={s.open ? 'warning' : 'success'}
          sub={s.ageing ? `${fmtNumber(s.ageing)} open past ${CLAIM_AGEING_DAYS} days` : 'none ageing'}
        />
        <KpiCard
          label="Cost of poor quality"
          value={fmtCurrency(s.costOfPoorQuality, 'IDR', { compact: true })}
          icon={<HandCoins />} accent="danger"
          sub="last ninety days, net of recoveries"
        />
        <KpiCard
          label="Claim rate"
          value={fmtPercent(s.claimRatePercent, 2)}
          icon={<Scale />} accent={s.claimRatePercent > 2 ? 'danger' : s.claimRatePercent > 1 ? 'warning' : 'success'}
          sub="claims raised in ninety days over what was signed for in the same ninety"
        />
        <KpiCard
          label="Recovered"
          value={fmtCurrency(s.recovered, 'IDR', { compact: true })}
          icon={<CircleAlert />} accent="accent"
          sub={s.averageDaysToClose ? `${fmtNumber(s.averageDaysToClose, 0)} days to close, on average` : ''}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <DataTable
          data={claims}
          columns={columns}
          getId={(c) => c.id}
          getLabel={(c) => c.code}
          entityLabel="claim"
          exportName="claims"
          storageKey="claims"
          searchText={(c) => `${c.code} ${customer(c.customerId)?.name ?? ''} ${c.description} ${c.rootCause ?? ''} ${c.owner}`}
          initialSort={{ key: 'age', dir: 'desc' }}
          rowTone={(c) => (claimIsOpen(c.status) && claimCost(c).ageing ? 'bg-danger-soft/25' : undefined)}
          filters={[
            {
              key: 'kind', label: 'Kind', values: kind, onChange: setKind,
              options: CLAIM_KINDS.map((x) => ({ value: x.value, label: x.label })),
              match: (c, v) => v.includes(c.kind),
            },
            {
              key: 'liability', label: 'Liability', values: liability, onChange: setLiability,
              options: CLAIM_LIABILITIES.map((x) => ({ value: x.value, label: x.label })),
              match: (c, v) => v.includes(c.liability),
            },
          ]}
        />

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader icon={<Scale />} title="Who caused it" description="By settled value. Anything not marked ours is money somebody else should be carrying." />
            <CardBody className="space-y-3">
              {byLiability.map((row) => {
                const meta = CLAIM_LIABILITIES.find((l) => l.value === row.liability)
                return (
                  <div key={row.liability}>
                    <div className="flex items-baseline justify-between gap-3">
                      <Tooltip content={meta?.hint ?? ''}>
                        <span className="text-[12.5px] font-medium text-fg">{meta?.label ?? row.liability}</span>
                      </Tooltip>
                      <span className="tnum shrink-0 text-[12px] text-fg-muted">{fmtCurrency(row.value, 'IDR', { compact: true })} · {row.count}</span>
                    </div>
                    <Progress
                      className="mt-1.5"
                      value={totalLiability > 0 ? (row.value / totalLiability) * 100 : 0}
                      tone={row.liability === 'OURS' ? 'danger' : row.liability === 'UNDECIDED' ? 'warning' : 'primary'}
                      size="sm"
                    />
                  </div>
                )
              })}
              <Because className="border-t border-border pt-3">
                Undecided liability is not neutral — everything in it sits on our books until somebody decides otherwise, and a carrier claim goes cold the moment the delivery note stops being fresh.
              </Because>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<CircleAlert />} title="What we changed" description="A claim that closes without a corrective action is a claim that comes back." />
            <CardBody className="space-y-3">
              {claims.filter((c) => c.correctiveAction).slice(0, 4).map((c) => (
                <div key={c.id}>
                  <p className="font-mono text-[11.5px] font-semibold text-fg">{c.code}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-fg-muted">{c.correctiveAction}</p>
                  <Separator className="mt-2.5" />
                </div>
              ))}
              {claims.filter((c) => claimIsOpen(c.status) && !c.rootCause).length > 0 && (
                <Because>
                  {claims.filter((c) => claimIsOpen(c.status) && !c.rootCause).length} open claim(s) still have no root cause recorded. Until one is, nothing stops it happening again.
                </Because>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
