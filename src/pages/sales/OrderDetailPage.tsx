import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarCheck, CheckCircle2, Factory, TriangleAlert, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Because, MetaRow, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import { useMrpLines } from '@/hooks/useDerived'
import { availableToPromise } from '@/lib/production'
import { orderMargin } from '@/lib/analytics'
import { customerSegmentLabel, paymentInstrumentLabel } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'
import { daysBetween } from '@/data/clock'

export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const s = useMfg()
  const mrpLines = useMrpLines()

  const order = s.salesOrders.find((o) => o.id === id)
  if (!order) {
    return <EmptyState title="Order not found" description="It may have been removed, or the link is stale." action={<Button onClick={() => navigate('/orders')}>Back to orders</Button>} />
  }

  const customer = s.customers.find((c) => c.id === order.customerId)
  const orders = s.workOrders.filter((w) => w.salesOrderId === order.id)
  const margin = orderMargin(order, s.workOrders, s.products)
  const value = order.lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0) * order.fxRate

  const openAr = s.invoices
    .filter((i) => i.kind === 'AR' && i.partyId === order.customerId && i.status !== 'PAID' && i.status !== 'VOID')
    .reduce((a, i) => a + (i.total - i.paidAmount) * i.fxRate, 0)
  const creditOver = openAr + value - (customer?.creditLimit ?? 0)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={
          <>
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link to="/orders"><ArrowLeft /> Orders</Link>
            </Button>
            <StatusBadge value={order.status} size="sm" />
            {order.priority !== 'STANDARD' && <StatusBadge value={order.priority} size="sm" />}
          </>
        }
        title={`${order.code} · ${customer?.name ?? ''}`}
        description={order.note}
        meta={
          <>
            <span className="text-[12.5px] text-fg-muted">Ordered {fmtDate(order.orderDate)}</span>
            {order.poReference && <span className="text-[12.5px] text-fg-muted">Their ref {order.poReference}</span>}
            <span className="text-[12.5px] text-fg-muted">{order.salesPerson}</span>
          </>
        }
        actions={
          order.status === 'PENDING_CONFIRMATION' ? (
            <Button
              onClick={() => {
                if (creditOver > 0) {
                  toast.push({
                    tone: 'error',
                    title: 'Blocked at the credit gate',
                    description: `This order takes ${customer?.name} ${fmtCurrency(creditOver, 'IDR', { compact: true })} past their limit. Collect, take a deposit, or raise the limit with a decision somebody signs.`,
                  })
                  return
                }
                if (order.depositPercent > 0 && order.depositReceived <= 0) {
                  toast.push({
                    tone: 'error',
                    title: 'Blocked at the deposit gate',
                    description: `${order.depositPercent}% is contracted and nothing has been received. The company does not finance a customer’s imported hardware.`,
                  })
                  return
                }
                order.lines.forEach((l) => s.confirmSalesOrderLine(order.id, l.id, l.atpDate ?? l.requestedDate))
                toast.push({ tone: 'success', title: 'Order confirmed', description: 'Each line was confirmed at the date the plan actually supports.' })
              }}
            >
              <CheckCircle2 /> Confirm order
            </Button>
          ) : undefined
        }
      />

      {/* ---------------- gates ---------------- */}
      {order.status === 'PENDING_CONFIRMATION' && (
        <div className="grid gap-3 md:grid-cols-2">
          <GateCard
            ok={creditOver <= 0}
            title="Credit"
            okText={`${fmtCurrency(openAr, 'IDR', { compact: true })} outstanding against a limit of ${fmtCurrency(customer?.creditLimit ?? 0, 'IDR', { compact: true })}.`}
            failText={`${fmtCurrency(openAr, 'IDR', { compact: true })} already outstanding plus ${fmtCurrency(value, 'IDR', { compact: true })} on this order takes them ${fmtCurrency(creditOver, 'IDR', { compact: true })} past the limit.`}
          />
          <GateCard
            ok={order.depositPercent === 0 || order.depositReceived > 0}
            title="Deposit"
            okText={order.depositPercent === 0 ? 'No deposit contracted on this account.' : `${fmtCurrency(order.depositReceived, 'IDR', { compact: true })} received.`}
            failText={`${order.depositPercent}% is contracted and nothing has arrived. Imported content would be financed by us until the customer pays.`}
          />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          {/* ---------------- lines with the ATP verdict ---------------- */}
          <Card>
            <CardHeader
              icon={<CalendarCheck />}
              title="Lines, and the honest date"
              description="Recomputed now, against today’s stock, today’s shipments and today’s load — not the date the promise was made against."
            />
            <CardBody className="p-0">
              <div className="divide-y divide-border">
                {order.lines.map((line) => {
                  const product = s.products.find((p) => p.id === line.productId)
                  const atp = availableToPromise(line.productId, line.quantity, {
                    boms: s.boms, routings: s.routings, items: s.items, lots: s.lots,
                    kilnBatches: s.kilnBatches, workCentres: s.workCentres, workOrders: s.workOrders,
                    mrpLines, products: s.products,
                  })
                  const promised = line.confirmedDate ?? line.requestedDate
                  const gap = daysBetween(promised, atp.date)
                  return (
                    <div key={line.id} className="px-4 py-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-fg">{line.description}</p>
                          <p className="mt-0.5 font-mono text-[11.5px] text-fg-muted">{product?.sku}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-5 text-right">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.06em] text-fg-subtle">Quantity</p>
                            <p className="tnum text-[13px] font-semibold text-fg">
                              {fmtNumber(line.shippedQuantity)} / {fmtNumber(line.quantity)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.06em] text-fg-subtle">Value</p>
                            <p className="tnum text-[13px] font-semibold text-fg">
                              {fmtCurrency(line.quantity * line.unitPrice, order.currency, { compact: true })}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 rounded-lg border border-border bg-surface-sunken/60 p-3 sm:grid-cols-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.06em] text-fg-subtle">Promised</p>
                          <p className="tnum mt-0.5 text-[13px] font-semibold text-fg">{fmtDate(promised)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.06em] text-fg-subtle">Honest date, today</p>
                          <p className={`tnum mt-0.5 text-[13px] font-semibold ${gap > 0 ? 'text-danger' : 'text-success'}`}>
                            {fmtDate(atp.date)}
                            {gap > 0 && <span className="ml-1.5 text-[11.5px] font-medium">({gap} late)</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.06em] text-fg-subtle">Binding constraint</p>
                          <p className="mt-0.5 text-[13px] font-semibold text-fg">{atp.constraint === 'NONE' ? 'None' : atp.constraint.toLowerCase()}</p>
                        </div>
                        <div className="sm:col-span-3">
                          <Because>{atp.explanation}</Because>
                          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                            {atp.clocks.map((c) => (
                              <span key={c.label} className="text-[11.5px] text-fg-muted">
                                <strong className="font-medium text-fg">{c.label}</strong> · {fmtDate(c.date)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>

          {/* ---------------- work orders ---------------- */}
          <Card>
            <CardHeader icon={<Factory />} title="Work orders raised" description="What the floor is actually building against this order." />
            <CardBody className="p-0">
              {orders.length === 0 && <EmptyState title="No work orders yet" description="Nothing has been planned against this order." />}
              <div className="divide-y divide-border">
                {orders.map((w) => {
                  const product = s.products.find((p) => p.id === w.productId)
                  const done = w.operations.filter((o) => o.status === 'DONE').length
                  const blocked = w.operations.find((o) => o.status === 'BLOCKED')
                  return (
                    <Link key={w.id} to={`/work-orders/${w.id}`} className="block px-4 py-3 transition-colors hover:bg-bg-muted">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-[12.5px] font-semibold text-fg">{w.code}</p>
                          <p className="truncate text-[11.5px] text-fg-muted">{product?.name} × {fmtNumber(w.quantity)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge value={w.status} size="sm" />
                          <span className="tnum text-[11.5px] text-fg-muted">due {fmtDate(w.dueDate)}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress value={(done / w.operations.length) * 100} tone={blocked ? 'danger' : 'primary'} className="flex-1" />
                        <span className="tnum shrink-0 text-[11.5px] text-fg-muted">{done}/{w.operations.length} ops</span>
                      </div>
                      {blocked && (
                        <p className="mt-1.5 text-[11.5px] font-medium text-danger">Blocked at {blocked.name} — {blocked.blockReason}</p>
                      )}
                    </Link>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* ---------------- side ---------------- */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader icon={<Wallet />} title="Commercial" />
            <CardBody className="divide-y divide-border py-0">
              <MetaRow label="Customer">{customer?.name}</MetaRow>
              <MetaRow label="Segment">{customerSegmentLabel(customer?.segment ?? 'DEALER')}</MetaRow>
              <MetaRow label="Currency">{order.currency}{order.currency !== 'IDR' ? ` @ ${fmtNumber(order.fxRate)}` : ''}</MetaRow>
              <MetaRow label="Terms">{customer?.paymentTermDays} days</MetaRow>
              <MetaRow label="Order value">{fmtCurrency(value, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Deposit">
                {order.depositPercent === 0 ? 'None contracted' : `${order.depositPercent}% · ${fmtCurrency(order.depositReceived, 'IDR', { compact: true })} held`}
              </MetaRow>
              {order.incoterm && <MetaRow label="Incoterm">{order.incoterm} {order.destination}</MetaRow>}
              {customer?.latePenaltyPerDay ? (
                <MetaRow label="Late penalty">
                  <span className="text-danger">{fmtCurrency(customer.latePenaltyPerDay, 'IDR', { compact: true })} / day</span>
                </MetaRow>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Wallet />} title="Margin" description="Against the actual cost the floor has spent, where the orders have run." />
            <CardBody className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[12.5px] text-fg-muted">Revenue</span>
                <span className="tnum text-[15px] font-semibold text-fg">{fmtCurrency(margin.revenue, 'IDR', { compact: true })}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[12.5px] text-fg-muted">Standard cost</span>
                <span className="tnum text-[13px] text-fg">{fmtCurrency(margin.standardCost, 'IDR', { compact: true })}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[12.5px] text-fg-muted">Actual cost so far</span>
                <span className="tnum text-[13px] text-fg">{fmtCurrency(margin.actualCost, 'IDR', { compact: true })}</span>
              </div>
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="text-[12.5px] font-medium text-fg">Gross margin</span>
                <span className={`tnum text-[17px] font-semibold ${margin.marginPercent >= (s.settings.kpiTargets.grossMarginPercent) ? 'text-success' : 'text-warning'}`}>
                  {fmtPercent(margin.marginPercent, 1)}
                </span>
              </div>
              <Progress value={Math.max(0, Math.min(100, margin.marginPercent))} tone={margin.marginPercent >= s.settings.kpiTargets.grossMarginPercent ? 'success' : 'warning'} />
              <Because>
                Target is {s.settings.kpiTargets.grossMarginPercent}%. Rework and any demurrage this order caused are already in the actual cost — that is the point of carrying them there.
              </Because>
            </CardBody>
          </Card>

          {customer && (
            <Card>
              <CardHeader icon={<TriangleAlert />} title="Account exposure" />
              <CardBody className="divide-y divide-border py-0">
                <MetaRow label="Credit limit">{fmtCurrency(customer.creditLimit, 'IDR', { compact: true })}</MetaRow>
                <MetaRow label="Outstanding AR">{fmtCurrency(openAr, 'IDR', { compact: true })}</MetaRow>
                <MetaRow label="With this order">
                  <span className={creditOver > 0 ? 'text-danger' : 'text-success'}>
                    {fmtCurrency(openAr + value, 'IDR', { compact: true })}
                  </span>
                </MetaRow>
                <MetaRow label="Status"><StatusBadge value={customer.status} size="sm" /></MetaRow>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Payment & contacts" />
            <CardBody className="space-y-2.5">
              {customer?.contacts.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-fg">{c.name}</p>
                    <p className="truncate text-[11.5px] text-fg-muted">{c.title}</p>
                  </div>
                  {c.primary && <Badge tone="primary" size="sm">Primary</Badge>}
                </div>
              ))}
              <Separator />
              <Because>{paymentInstrumentLabel('OPEN_ACCOUNT')} on {customer?.paymentTermDays}-day terms.</Because>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

function GateCard({ ok, title, okText, failText }: { ok: boolean; title: string; okText: string; failText: string }) {
  return (
    <Card className={ok ? 'border-success/40' : 'border-danger/50'}>
      <CardBody className="flex items-start gap-3">
        {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" />}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-fg">
            {title} gate — {ok ? 'clear' : 'blocked'}
          </p>
          <Because className="mt-1">{ok ? okText : failText}</Because>
        </div>
      </CardBody>
    </Card>
  )
}
