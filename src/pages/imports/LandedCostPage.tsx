import * as React from 'react'
import { Link } from 'react-router-dom'
import { Receipt, TriangleAlert, Wallet } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import {
  allocateLandedCost, costCompleteness, creditableTaxes, customsValueIdr, landedCostTotal, ndpbmVariance,
} from '@/lib/importing'
import { landedCostSummary } from '@/lib/analytics'
import { ALLOCATION_BASES, importCostLabel, IMPORT_COST_CODES } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'

export function LandedCostPage() {
  const s = useMfg()
  const toast = useToast()
  const costed = s.shipments.filter((x) => x.status !== 'PLANNED' && x.status !== 'CANCELLED')
  const [shipmentId, setShipmentId] = React.useState(costed[0]?.id ?? '')
  const sh = s.shipments.find((x) => x.id === shipmentId)

  const summary = landedCostSummary(s.shipments)
  const provisionalLots = s.lots.filter((l) => l.costIsProvisional)
  const allocation = sh ? allocateLandedCost(sh, s.items) : []
  const ppvTotal = allocation.reduce((a, x) => a + x.ppvAmount, 0)
  const fx = sh ? ndpbmVariance(sh) : null
  const taxes = sh ? creditableTaxes(sh) : { ppn: 0, pph22: 0, total: 0 }
  const completeness = sh ? costCompleteness(sh) : { actual: 0, total: 0, percent: 0 }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Landed cost"
        description="Goods, freight, duty, clearance and inland, spread over the lines on the basis each cost actually behaves on. Creditable taxes are deliberately excluded — putting PPN into inventory is the commonest way a furniture works over-states its material cost by fourteen per cent."
        actions={
          <Select
            value={shipmentId}
            onChange={setShipmentId}
            options={costed.map((x) => ({ value: x.id, label: `${x.code} · ${s.suppliers.find((sp) => sp.id === x.supplierId)?.name ?? ''}` }))}
            className="w-[360px]"
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Finalised" value={fmtCurrency(summary.finalisedValue, 'IDR', { compact: true })} icon={<Receipt />} accent="success" sub={`${summary.finalisedCount} consignments closed`} />
        <KpiCard label="Still open" value={fmtCurrency(summary.openValue, 'IDR', { compact: true })} icon={<Wallet />} accent="warning" sub={`${summary.openCount} consignments in flight`} />
        <KpiCard
          label="Lots at provisional cost"
          value={fmtNumber(provisionalLots.length)}
          icon={<TriangleAlert />}
          accent={provisionalLots.length ? 'warning' : 'success'}
          sub={provisionalLots.length ? 'every product using them is priced on a guess' : 'everything is finally costed'}
        />
        <KpiCard
          label="Purchase price variance"
          value={fmtCurrency(ppvTotal, 'IDR', { compact: true })}
          icon={<Wallet />}
          accent={Math.abs(ppvTotal) > 20_000_000 ? 'danger' : 'primary'}
          sub="this consignment, landed against standard"
        />
      </div>

      {!sh && <EmptyState title="No consignment selected" />}

      {sh && (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader
                icon={<Receipt />}
                title={`${sh.code} — allocation`}
                description="Each cost lands on the lines by its own basis. Duty is not spread at all: it is assessed per line at that line’s own rate."
                actions={
                  sh.costFinalised ? (
                    <Badge tone="success" size="sm">finalised {fmtDate(sh.costFinalisedAt)}</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        const map = Object.fromEntries(allocation.map((a) => [a.line.id, Math.round(a.landedUnitCost)]))
                        s.finaliseLandedCost(sh.id, map)
                        toast.push({
                          tone: 'success',
                          title: 'Allocation posted',
                          description: `Lots revalued from provisional. ${fmtCurrency(Math.abs(ppvTotal), 'IDR', { compact: true })} posts as purchase price variance.`,
                        })
                      }}
                    >
                      Finalise & post
                    </Button>
                  )
                }
              />
              <CardBody className="p-0">
                <div className="divide-y divide-border">
                  {allocation.map((a) => (
                    <div key={a.line.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-fg">{a.itemName}</p>
                          <p className="font-mono text-[11.5px] text-fg-muted">
                            {a.itemCode} · {fmtNumber(a.line.quantity, a.line.quantity < 10 ? 2 : 0)} {a.line.uom} ·{' '}
                            {fmtNumber(a.line.grossWeightKg)} kg · {fmtNumber(a.line.volumeCbm, 1)} m³
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">Landed per {a.line.uom}</p>
                          <p className="tnum text-[15px] font-semibold text-fg">{fmtCurrency(a.landedUnitCost, 'IDR')}</p>
                          <p className={`tnum text-[11.5px] font-medium ${a.ppvAmount > 0 ? 'text-danger' : 'text-success'}`}>
                            {a.ppvPercent > 0 ? '+' : ''}{fmtPercent(a.ppvPercent, 1)} against standard {fmtCurrency(a.standardCost, 'IDR', { compact: true })}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 space-y-1.5">
                        <Bar label="Goods (FOB)" amount={a.goodsCost} total={a.landedTotal} tone="primary" hint="At the rate the invoice will actually be settled." />
                        {a.allocated
                          .filter((x) => x.amount > 0)
                          .sort((x, y) => y.amount - x.amount)
                          .map((x) => (
                            <Bar
                              key={x.code}
                              label={x.label}
                              amount={x.amount}
                              total={a.landedTotal}
                              tone={x.code === 'DUTY' ? 'danger' : x.code === 'DEMURRAGE' ? 'danger' : 'accent'}
                              hint={
                                x.code === 'DUTY'
                                  ? `Assessed per line at ${a.line.dutyRateApplied}% of its own customs value.`
                                  : `${ALLOCATION_BASES.find((b) => b.value === x.basis)?.label ?? ''} — ${ALLOCATION_BASES.find((b) => b.value === x.basis)?.hint ?? ''}`
                              }
                            />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
              <CardBody className="border-t border-border">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="text-[13px] font-semibold text-fg">Total landed into inventory</span>
                  <span className="tnum text-[17px] font-semibold text-fg">{fmtCurrency(landedCostTotal(sh), 'IDR')}</span>
                </div>
                <Separator className="my-2.5" />
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="text-[12.5px] text-fg-muted">Creditable taxes, kept out of inventory</span>
                  <span className="tnum text-[13px] text-fg-muted">{fmtCurrency(taxes.total, 'IDR')}</span>
                </div>
                <Because className="mt-2">
                  PPN impor {fmtCurrency(taxes.ppn, 'IDR', { compact: true })} is creditable input VAT, and PPh 22{' '}
                  {fmtCurrency(taxes.pph22, 'IDR', { compact: true })} is a prepayment of corporate income tax at 2.5% because
                  the company holds an API-P. Neither is a cost of the goods, and a system that treats them as one prices every
                  product built from this consignment fourteen per cent too high.
                </Because>
              </CardBody>
            </Card>

            <div className="flex flex-col gap-5">
              <Card>
                <CardHeader title="Cost completeness" description="Until every line is actual, the receipt is provisional." />
                <CardBody className="space-y-3">
                  <Progress value={completeness.percent} tone={completeness.percent === 100 ? 'success' : 'warning'} size="lg" />
                  <p className="tnum text-[12.5px] text-fg-muted">{completeness.actual} of {completeness.total} cost lines confirmed</p>
                  {sh.costs.filter((c) => !c.actual).map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="truncate text-fg-muted">{importCostLabel(c.code)}</span>
                      <span className="tnum shrink-0 text-warning">{fmtCurrency(c.amount * c.fxRate, 'IDR', { compact: true })} est.</span>
                    </div>
                  ))}
                  {completeness.percent === 100 && <Because>Every vendor invoice has landed. The number has stopped moving.</Because>}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Values" />
                <CardBody className="divide-y divide-border py-0">
                  <Row label="Customs value (CIF)" value={fmtCurrency(customsValueIdr(sh), 'IDR', { compact: true })} />
                  <Row label="Landed into inventory" value={fmtCurrency(landedCostTotal(sh), 'IDR', { compact: true })} />
                  <Row label="Creditable taxes" value={fmtCurrency(taxes.total, 'IDR', { compact: true })} />
                  <Row label="Purchase price variance" value={fmtCurrency(ppvTotal, 'IDR', { compact: true })} tone={ppvTotal > 0 ? 'danger' : 'success'} />
                  {fx && <Row label="FX variance (NDPBM gap)" value={fmtCurrency(fx.amount, 'IDR', { compact: true })} tone={fx.amount > 0 ? 'danger' : 'success'} />}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="How each cost spreads" description="Chosen per cost, because a haulier does not care what the box is worth." />
                <CardBody className="space-y-2">
                  {IMPORT_COST_CODES.filter((c) => c.inLandedCost).slice(0, 9).map((c) => (
                    <Tooltip key={c.value} content={c.hint}>
                      <div className="flex items-center justify-between gap-3 border-b border-border pb-1.5 last:border-0">
                        <span className="truncate text-[12px] text-fg">{c.label}</span>
                        <span className="shrink-0 text-[11px] text-fg-muted">{ALLOCATION_BASES.find((b) => b.value === c.basis)?.label}</span>
                      </div>
                    </Tooltip>
                  ))}
                </CardBody>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader icon={<Wallet />} title="Every consignment, costed" description="Landed cost, taxes, and whether the number has stopped moving." />
            <CardBody className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                    <th className="py-2 pl-4 font-medium">Shipment</th>
                    <th className="px-2 py-2 font-medium">State</th>
                    <th className="px-2 py-2 text-right font-medium">Customs value</th>
                    <th className="px-2 py-2 text-right font-medium">Landed</th>
                    <th className="px-2 py-2 text-right font-medium">Taxes (creditable)</th>
                    <th className="px-2 py-2 text-right font-medium">Costs actual</th>
                    <th className="py-2 pr-4 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {costed.map((x) => {
                    const c = costCompleteness(x)
                    const t = creditableTaxes(x)
                    return (
                      <tr key={x.id} className="border-b border-border/70 last:border-0 hover:bg-bg-muted/60">
                        <td className="py-2 pl-4">
                          <Link to={`/imports/${x.id}`} className="font-mono text-[12px] font-semibold text-fg hover:text-primary hover:underline">
                            {x.code}
                          </Link>
                          <p className="truncate text-[11px] text-fg-muted">{s.suppliers.find((sp) => sp.id === x.supplierId)?.name}</p>
                        </td>
                        <td className="px-2 py-2"><StatusBadge value={x.status} size="sm" /></td>
                        <td className="px-2 py-2 text-right"><span className="tnum text-[12px]">{fmtCurrency(customsValueIdr(x), 'IDR', { compact: true })}</span></td>
                        <td className="px-2 py-2 text-right"><span className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(landedCostTotal(x), 'IDR', { compact: true })}</span></td>
                        <td className="px-2 py-2 text-right"><span className="tnum text-[12px] text-fg-muted">{fmtCurrency(t.total, 'IDR', { compact: true })}</span></td>
                        <td className="px-2 py-2 text-right"><span className="tnum text-[12px]">{fmtPercent(c.percent, 0)}</span></td>
                        <td className="py-2 pr-4 text-right">
                          {x.costFinalised ? <Badge tone="success" size="sm">final</Badge> : <Badge tone="warning" size="sm">provisional</Badge>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}

function Bar({ label, amount, total, tone, hint }: { label: string; amount: number; total: number; tone: 'primary' | 'accent' | 'danger'; hint: string }) {
  const pct = total ? (amount / total) * 100 : 0
  return (
    <Tooltip content={hint}>
      <div>
        <div className="mb-0.5 flex items-baseline justify-between gap-3">
          <span className="truncate text-[11.5px] text-fg-muted">{label}</span>
          <span className="tnum shrink-0 text-[11.5px] text-fg">
            {fmtCurrency(amount, 'IDR', { compact: true })} <span className="text-fg-subtle">({fmtPercent(pct, 0)})</span>
          </span>
        </div>
        <Progress value={pct} tone={tone} size="sm" />
      </div>
    </Tooltip>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'success' }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-[12px] text-fg-muted">{label}</span>
      <span className={`tnum text-[12.5px] font-semibold ${tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-fg'}`}>{value}</span>
    </div>
  )
}
