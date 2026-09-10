import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Route as RouteIcon, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Because } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/misc'
import { useMfg } from '@/store/useMfg'
import { materialFlow } from '@/lib/conversion'
import { deliveryIsOpen, loadPlan } from '@/lib/commerce'
import { shipmentIsOpen } from '@/data/reference'
import { goodsValueIdr } from '@/lib/importing'
import { workOrderCost } from '@/lib/production'
import { fmtCurrency, fmtNumber } from '@/lib/format'

/** The five transformations between the eight places value can be standing. */
const ARROWS: { after: string; label: string; detail: string }[] = [
  { after: 'inbound', label: 'clears customs', detail: 'PIB, lane, SPPB and the trucking. Arrival is not availability.' },
  { after: 'raw', label: 'is converted', detail: 'Ripped, nested, pressed or dried — on our floor or somebody else’s.' },
  { after: 'conversion', label: 'splits three ways', detail: 'The output that was wanted, the offcut that is still worth money, and the dust that is not.' },
  { after: 'semi', label: 'is built with', detail: 'A work order draws raw and semi-finished together against the bill.' },
  { after: 'remnant', label: 'goes back in', detail: 'An offcut re-enters as material — the only step on this chain that costs nothing.' },
  { after: 'wip', label: 'is finished', detail: 'Through the booth, the cure hall and final inspection.' },
  { after: 'finished', label: 'is delivered', detail: 'A surat jalan, and only then does an order line move.' },
]

export function FlowPage() {
  const s = useMfg()

  const nodes = React.useMemo(() => {
    const inTransit = s.shipments.filter((x) => shipmentIsOpen(x.status))
    const finishedWos = s.workOrders.filter((w) => w.status === 'COMPLETED')
    const openDeliveries = s.deliveries.filter((d) => deliveryIsOpen(d.status))
    return materialFlow({
      lots: s.lots,
      items: s.items,
      remnants: s.remnants,
      conversions: s.conversionOrders,
      workOrders: s.workOrders,
      workCentres: s.workCentres,
      shipmentsInTransit: {
        count: inTransit.length,
        value: inTransit.reduce((a, x) => a + goodsValueIdr(x), 0),
      },
      finishedGoods: {
        count: finishedWos.length,
        value: finishedWos.reduce((a, w) => a + workOrderCost(w).standardTotal, 0),
      },
      outboundOpen: {
        count: openDeliveries.length,
        /* what the load is worth to the order book, not what it measures */
        value: openDeliveries.reduce(
          (a, d) =>
            a
            + d.lines.reduce((x, l) => {
              const order = s.salesOrders.find((o) => o.id === l.salesOrderId)
              const line = order?.lines.find((ol) => ol.id === l.salesOrderLineId)
              return x + (line ? line.unitPrice * (order!.fxRate || 1) * l.quantity : 0)
            }, 0),
          0,
        ),
        cbm: openDeliveries.reduce((a, d) => a + loadPlan(d).cbm, 0),
      },
    })
  }, [s.lots, s.items, s.remnants, s.conversionOrders, s.workOrders, s.workCentres, s.shipments, s.deliveries, s.salesOrders])

  const total = nodes.reduce((a, n) => a + n.value, 0)
  const blocked = nodes.filter((n) => n.blocked)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Material flow"
        description="Eight places value can be standing, and the seven things that move it between them. Every figure here is the same one the module behind it reports — this page exists so that the shape of the business fits on one screen."
      />

      <Card>
        <CardBody className="flex flex-wrap items-baseline gap-x-6 gap-y-2 py-3">
          <p className="text-[12.5px] text-fg">
            <span className="tnum font-semibold">{fmtCurrency(total, 'IDR', { compact: true })}</span>{' '}
            <span className="text-fg-muted">standing across the chain right now.</span>
          </p>
          {blocked.length > 0 && (
            <p className="text-[12.5px] text-fg">
              <span className="font-semibold text-danger">{blocked.length}</span>{' '}
              <span className="text-fg-muted">of the eight have something stuck in them.</span>
            </p>
          )}
        </CardBody>
      </Card>

      {/* The chain. It wraps into a grid rather than scrolling sideways, so it reads on a phone too. */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {nodes.map((n, i) => {
          const arrow = ARROWS.find((a) => a.after === n.key)
          return (
            <div key={n.key} className="relative flex">
              <Link
                to={n.link}
                className="group flex min-w-0 flex-1 flex-col rounded-xl border border-border bg-surface p-4 shadow-card transition-shadow hover:border-border-strong hover:shadow-pop"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="tnum grid size-6 shrink-0 place-items-center rounded-md bg-neutral-soft text-[11px] font-semibold text-neutral-soft-fg">
                    {i + 1}
                  </span>
                  {n.blocked && (
                    <Badge tone="danger" size="sm">
                      <TriangleAlert className="size-3" /> stuck
                    </Badge>
                  )}
                </div>
                <p className="mt-2.5 text-[13px] font-semibold leading-snug text-fg group-hover:text-primary">{n.label}</p>
                <p className="text-[11.5px] text-fg-muted">{n.sub}</p>
                <p className={`tnum mt-3 text-[19px] font-semibold leading-none tracking-[-0.02em] ${n.empty ? 'text-fg-subtle' : 'text-fg'}`}>
                  {n.empty ? 'Empty' : fmtCurrency(n.value, 'IDR', { compact: true })}
                </p>
                {!n.empty && (
                  <p className="tnum mt-1.5 text-[11.5px] text-fg-muted">
                    {fmtNumber(n.count)} {n.key === 'raw' || n.key === 'semi' ? 'lots' : n.key === 'remnant' ? 'pieces' : n.key === 'inbound' ? 'consignments' : n.key === 'outbound' ? 'loads' : 'orders'}
                    {n.aside && ` · ${n.aside}`}
                  </p>
                )}
                {n.empty && <p className="mt-2 text-[11px] leading-snug text-fg-muted">{n.empty}</p>}
                {n.blocked && <p className="mt-2 text-[11px] leading-snug text-danger">{n.blocked}</p>}
                {arrow && (
                  <p className="mt-auto pt-3 text-[11px] text-fg-subtle">
                    <ArrowRight className="mr-1 inline size-3" />
                    {arrow.label}
                  </p>
                )}
              </Link>
            </div>
          )
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            icon={<RouteIcon />}
            title="What happens between the boxes"
            description="Seven transformations. Each one changes the unit, the value or the owner — and every one of them is somewhere a plan goes wrong."
          />
          <CardBody className="space-y-3">
            {ARROWS.map((a, i) => (
              <div key={a.after}>
                <div className="flex items-baseline gap-2">
                  <span className="tnum text-[11px] font-semibold text-fg-subtle">{i + 1} →</span>
                  <span className="text-[12.5px] font-medium text-fg">{a.label}</span>
                </div>
                <p className="mt-0.5 pl-6 text-[12px] leading-relaxed text-fg-muted">{a.detail}</p>
                {i < ARROWS.length - 1 && <Separator className="mt-2.5" />}
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Why it is drawn this way" description="Three things about this chain that a stock report cannot show you." />
          <CardBody className="space-y-3">
            <div>
              <p className="text-[12.5px] font-semibold text-fg">The units change three times</p>
              <Because className="mt-0.5">
                Timber is bought in cubic metres, cut into blanks counted in pieces, and what falls off the end is racked in cubic metres again. A system that carries one unit per item cannot describe that, which is why conversion has orders of its own rather than being an adjustment.
              </Because>
            </div>
            <Separator />
            <div>
              <p className="text-[12.5px] font-semibold text-fg">Two of the boxes are not on our floor</p>
              <Because className="mt-0.5">
                What is on the water and what is at a subcontractor are both our inventory and our risk, and neither appears in a warehouse report. Together they are usually the largest single number on this page.
              </Because>
            </div>
            <Separator />
            <div>
              <p className="text-[12.5px] font-semibold text-fg">One arrow points backwards</p>
              <Because className="mt-0.5">
                The offcut rack feeds material back into conversion. It is the only step in the chain that costs nothing — and the only one that quietly stops working the moment nobody looks at it.
              </Because>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
