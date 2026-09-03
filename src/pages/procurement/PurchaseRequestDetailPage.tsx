import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, Building2, CheckCircle2, History, Layers, ShoppingCart, Store,
  Truck, Wallet, XCircle,
} from 'lucide-react'
import type { PurchaseRequest, PurchaseRequestLine } from '@/data/types'
import { monthLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import {
  linesBySupplier, prLinePrice, prLineTotal, prTotals, priceHistory, suppliersForItem,
  type PriceBasis,
} from '@/lib/procurement'

/** How a unit price was arrived at, said plainly next to the figure. */
const BASIS_LABEL: Record<PriceBasis, string> = {
  AGREED: 'Agreed',
  LAST_FROM_SUPPLIER: 'Last buy',
  LAST_FROM_ANYONE: 'Last buy (other supplier)',
  DIVISION_ESTIMATE: 'Division estimate',
  STANDARD_COST: 'Standard cost',
  NONE: 'No reference',
}

const BASIS_TONE: Record<PriceBasis, 'success' | 'info' | 'warning' | 'neutral'> = {
  AGREED: 'success',
  LAST_FROM_SUPPLIER: 'info',
  LAST_FROM_ANYONE: 'warning',
  DIVISION_ESTIMATE: 'warning',
  STANDARD_COST: 'neutral',
  NONE: 'neutral',
}

const TH = 'whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted'
const TD = 'border-b border-border px-3 py-2.5 align-top'

export function PurchaseRequestDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const can = useCan()
  const {
    purchaseRequests, mrSessions, mrRequests, divisions, items, suppliers, purchasePrices,
    assignPrSupplier, setPrAgreedPrice, setPrStatus,
  } = useErp()

  const [tab, setTab] = React.useState<'lines' | 'suppliers' | 'divisions'>('lines')
  const [history, setHistory] = React.useState<PurchaseRequestLine | null>(null)
  const [confirm, setConfirm] = React.useState<PurchaseRequest['status'] | null>(null)

  const pr = purchaseRequests.find((p) => p.id === id)

  if (!pr) {
    return (
      <EmptyState
        icon={<ShoppingCart />}
        title="This purchase request is no longer in the register"
        description="It may have been deleted. Open the register to find another."
        action={<Button variant="primary" size="sm" onClick={() => nav('/purchase-requests')}>Back to purchase requests</Button>}
      />
    )
  }

  const session = mrSessions.find((s) => s.id === pr.sessionId)
  const totals = prTotals(pr, purchasePrices, items)
  const itemOf = (line: PurchaseRequestLine) => items.find((i) => i.id === line.itemId)
  const divisionName = (divisionId: string) => divisions.find((d) => d.id === divisionId)?.name ?? 'Unknown division'
  const divisionCode = (divisionId: string) => divisions.find((d) => d.id === divisionId)?.code ?? '—'
  const supplierName = (supplierId?: string) => {
    const s = suppliers.find((x) => x.id === supplierId)
    return s ? s.brandName ?? s.legalName : undefined
  }

  /* Editing stops the moment the request is approved: from there it is a record. */
  const editable = can('pr.assign') && (pr.status === 'DRAFT' || pr.status === 'ASSIGNED')
  const buckets = linesBySupplier(pr, purchasePrices, items)

  /* What each division is carrying inside this recap — the way back to the MR. */
  const byDivision = (() => {
    const map = new Map<string, { divisionId: string; lines: number; qty: number; value: number }>()
    pr.lines.forEach((line) => {
      const unit = prLinePrice(line, purchasePrices, items).unitPrice
      line.sources.forEach((src) => {
        const bucket = map.get(src.divisionId) ?? { divisionId: src.divisionId, lines: 0, qty: 0, value: 0 }
        bucket.lines += 1
        bucket.qty += src.qty
        bucket.value += src.qty * unit
        map.set(src.divisionId, bucket)
      })
    })
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
  })()

  const changeStatus = (status: PurchaseRequest['status']) => {
    setPrStatus(pr.id, status)
    setConfirm(null)
    toast.push({
      tone: status === 'CANCELLED' ? 'warning' : 'success',
      title: `${pr.code} → ${status.toLowerCase()}`,
      description:
        status === 'APPROVED'
          ? 'The recap is fixed. Suppliers and prices can no longer be changed here.'
          : status === 'ORDERED'
            ? 'Marked as placed with the assigned suppliers.'
            : 'The request was cancelled; nothing will be ordered from it.',
    })
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <Link to="/purchase-requests" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-fg-muted hover:text-primary">
            <ArrowLeft className="size-3.5" /> Purchase requests
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono">{pr.code}</span>
            <StatusBadge value={pr.status} />
          </span>
        }
        description={
          session
            ? `Locked from ${session.code} — ${monthLabel(session.periodMonth)} ${session.periodYear}. Every line below is the sum of what the divisions asked for.`
            : 'The session this recap came from is no longer in the register.'
        }
        meta={
          <>
            <span className="text-[12px] text-fg-muted">
              Raised {fmtDate(pr.createdAt)} by <span className="font-medium text-fg">{pr.createdBy}</span>
            </span>
            {session && (
              <Link to={`/mr/${session.id}`} className="text-[12px] font-medium text-primary hover:underline">
                Open the source session
              </Link>
            )}
            {pr.approvedAt && (
              <span className="text-[12px] text-fg-muted">
                Approved {fmtDate(pr.approvedAt)} by <span className="font-medium text-fg">{pr.approvedBy}</span>
              </span>
            )}
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {can('pr.approve') && (pr.status === 'DRAFT' || pr.status === 'ASSIGNED') && (
              <>
                <Button variant="secondary" onClick={() => setConfirm('CANCELLED')}>
                  <XCircle /> Cancel
                </Button>
                <Tooltip content={totals.unassigned > 0 ? `${totals.unassigned} lines still have no supplier` : 'Fix the recap and hand it to the suppliers'}>
                  <span>
                    <Button variant="primary" disabled={totals.unassigned > 0} onClick={() => setConfirm('APPROVED')}>
                      <CheckCircle2 /> Approve
                    </Button>
                  </span>
                </Tooltip>
              </>
            )}
            {can('pr.approve') && pr.status === 'APPROVED' && (
              <Button variant="primary" onClick={() => setConfirm('ORDERED')}>
                <Truck /> Mark as ordered
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Merged lines"
          value={totals.lines}
          icon={<Layers />}
          accent="primary"
          sub={`${fmtNumber(totals.qty)} units from ${totals.divisions} divisions`}
        />
        <KpiCard
          label="Assigned to a supplier"
          value={`${totals.assigned} / ${totals.lines}`}
          icon={<Store />}
          accent={totals.unassigned ? 'warning' : 'success'}
          sub={totals.unassigned ? `${totals.unassigned} lines still open` : `across ${totals.suppliers} suppliers`}
        />
        <KpiCard
          label="Agreed prices"
          value={`${totals.priced} / ${totals.lines}`}
          icon={<CheckCircle2 />}
          accent={totals.priced === totals.lines ? 'success' : 'accent'}
          sub="the rest use a reference price"
        />
        <KpiCard
          label="Request value"
          value={fmtCurrency(totals.value, 'IDR', { compact: true })}
          icon={<Wallet />}
          accent="purple"
          sub={fmtCurrency(totals.value, 'IDR')}
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: 'lines', label: 'Lines & suppliers', count: pr.lines.length },
          { value: 'suppliers', label: 'By supplier', count: buckets.length },
          { value: 'divisions', label: 'By division', count: byDivision.length },
        ]}
      />

      {tab === 'lines' && (
        <Card>
          <CardHeader
            title="One line per item"
            description="Assign a supplier and its last purchase price for the item appears straight away. Overwrite it only when a price has actually been agreed."
            icon={<Layers />}
            actions={
              !editable ? (
                <Badge tone="neutral" size="md">
                  {can('pr.assign') ? 'Locked — the request is no longer in draft' : 'Read only'}
                </Badge>
              ) : undefined
            }
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  <th className={TH}>SKU</th>
                  <th className={TH}>Item</th>
                  <th className={`${TH} text-right`}>Qty</th>
                  <th className={TH}>Requested by</th>
                  <th className={TH}>Supplier</th>
                  <th className={TH}>Unit price</th>
                  <th className={`${TH} text-right`}>Line value</th>
                </tr>
              </thead>
              <tbody>
                {pr.lines.map((line) => {
                  const item = itemOf(line)
                  const price = prLinePrice(line, purchasePrices, items)
                  const options = suppliersForItem(line.itemId, items, suppliers)
                  const hasHistory = purchasePrices.some((p) => p.itemId === line.itemId)
                  return (
                    <tr key={line.id} className={line.sources.length > 1 ? 'bg-primary-soft/25' : undefined}>
                      <td className={`${TD} whitespace-nowrap font-mono text-[11.5px] text-fg-muted`}>{item?.sku}</td>
                      <td className={TD}>
                        <p className="max-w-[240px] truncate font-medium text-fg">{item?.name ?? 'Removed item'}</p>
                        <p className="text-[11px] text-fg-subtle">{item?.category.replace(/_/g, ' ').toLowerCase()}</p>
                      </td>
                      <td className={`${TD} tnum whitespace-nowrap text-right font-medium text-fg`}>
                        {fmtNumber(line.qty)} <span className="text-[11px] font-normal text-fg-subtle">{item?.uom}</span>
                      </td>
                      <td className={TD}>
                        <div className="flex max-w-[240px] flex-wrap gap-1">
                          {line.sources.map((src) => (
                            <Tooltip key={`${line.id}_${src.divisionId}`} content={`${divisionName(src.divisionId)} — ${fmtNumber(src.qty)} ${item?.uom ?? ''}`}>
                              <span>
                                <Badge tone="outline" size="sm">
                                  {divisionCode(src.divisionId)} · {fmtNumber(src.qty)}
                                </Badge>
                              </span>
                            </Tooltip>
                          ))}
                        </div>
                      </td>
                      <td className={TD}>
                        {editable ? (
                          <Select
                            value={line.supplierId ?? null}
                            onChange={(v) => {
                              assignPrSupplier(pr.id, line.id, v)
                              const last = priceHistory(line.itemId, v, purchasePrices)[0]
                              toast.push({
                                tone: 'success',
                                title: `${item?.name ?? 'Line'} → ${supplierName(v)}`,
                                description: last
                                  ? `Last bought at ${fmtCurrency(last.unitPrice, 'IDR')} on ${fmtDate(last.purchasedAt)} (${last.poNumber}).`
                                  : 'No purchase history with this supplier for the item yet.',
                              })
                            }}
                            options={options.map((s) => ({
                              value: s.id,
                              label: s.brandName ?? s.legalName,
                              description: (() => {
                                const last = priceHistory(line.itemId, s.id, purchasePrices)[0]
                                return last
                                  ? `last ${fmtCurrency(last.unitPrice, 'IDR')} · ${fmtDate(last.purchasedAt)} · ${s.leadTimeDays}d lead`
                                  : `no history for this item · ${s.leadTimeDays}d lead`
                              })(),
                              disabled: s.status === 'ON_HOLD',
                            }))}
                            placeholder={options.length ? 'Choose a supplier' : 'No approved supplier'}
                            disabled={options.length === 0}
                            searchable
                            clearable
                            onClear={() => assignPrSupplier(pr.id, line.id, undefined)}
                            size="sm"
                            className="w-[200px]"
                          />
                        ) : line.supplierId ? (
                          <Link to="/suppliers" className="text-[12.5px] font-medium text-primary hover:underline">
                            {supplierName(line.supplierId)}
                          </Link>
                        ) : (
                          <span className="text-[12px] text-warning">unassigned</span>
                        )}
                      </td>
                      <td className={TD}>
                        <div className="flex items-center gap-1.5">
                          {editable ? (
                            <Input
                              type="number"
                              min={0}
                              value={line.agreedUnitPrice ?? ''}
                              placeholder={String(Math.round(price.unitPrice))}
                              onChange={(e) =>
                                setPrAgreedPrice(pr.id, line.id, e.target.value === '' ? undefined : Number(e.target.value))
                              }
                              className="tnum w-[132px]"
                              disabled={!line.supplierId}
                            />
                          ) : (
                            <span className="tnum whitespace-nowrap text-[12.5px] font-medium text-fg">
                              {fmtCurrency(price.unitPrice, 'IDR')}
                            </span>
                          )}
                          {hasHistory && (
                            <Tooltip content="Purchase history for this item">
                              <Button variant="ghost" size="iconXs" onClick={() => setHistory(line)}>
                                <History />
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-fg-subtle">
                          <Badge tone={BASIS_TONE[price.basis]} size="sm">{BASIS_LABEL[price.basis]}</Badge>
                          {price.at && <span className="tnum">{fmtDate(price.at)}</span>}
                        </p>
                      </td>
                      <td className={`${TD} tnum whitespace-nowrap text-right font-semibold text-fg`}>
                        {fmtCurrency(prLineTotal(line, purchasePrices, items), 'IDR', { compact: true })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="px-3 py-2.5 text-right text-[12px] font-medium text-fg-muted">
                    {totals.lines} lines · {fmtNumber(totals.qty)} units
                  </td>
                  <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-[13px] font-semibold text-fg">
                    {fmtCurrency(totals.value, 'IDR')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {totals.unassigned > 0 && (
            <CardBody className="flex items-start gap-2 border-t border-border bg-warning-soft/40 text-[12.5px] text-warning-soft-fg">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                {totals.unassigned} line{totals.unassigned === 1 ? '' : 's'} still have no supplier. Until a supplier is
                chosen, the value shown falls back to the last purchase from anyone — or, failing that, the standard cost.
              </span>
            </CardBody>
          )}
        </Card>
      )}

      {tab === 'suppliers' && (
        <div className="space-y-4">
          {buckets.map((bucket) => {
            const supplier = suppliers.find((s) => s.id === bucket.supplierId)
            return (
              <Card key={bucket.supplierId}>
                <CardHeader
                  icon={<Store />}
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      {supplier ? supplier.brandName ?? supplier.legalName : 'Not assigned yet'}
                      {supplier && <Badge tone="outline" size="sm">{supplier.code}</Badge>}
                      {supplier && <StatusBadge value={supplier.status} size="sm" />}
                    </span>
                  }
                  description={
                    supplier
                      ? `${supplier.picName} · ${supplier.picPhone} · ${supplier.paymentTermDays} day terms · ${supplier.leadTimeDays} day lead time`
                      : 'These lines cannot be ordered until a supplier is chosen for them.'
                  }
                  actions={
                    <div className="text-right">
                      <p className="tnum text-[14px] font-semibold text-fg">{fmtCurrency(bucket.value, 'IDR', { compact: true })}</p>
                      <p className="text-[11px] text-fg-subtle">{bucket.lines.length} lines</p>
                    </div>
                  }
                />
                <div className="scrollbar-thin overflow-x-auto">
                  <table className="w-full border-separate border-spacing-0 text-[13px]">
                    <thead>
                      <tr>
                        <th className={TH}>SKU</th>
                        <th className={TH}>Item</th>
                        <th className={`${TH} text-right`}>Qty</th>
                        <th className={`${TH} text-right`}>Unit price</th>
                        <th className={`${TH} text-right`}>Line value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bucket.lines.map((line) => {
                        const item = itemOf(line)
                        const price = prLinePrice(line, purchasePrices, items)
                        return (
                          <tr key={line.id}>
                            <td className={`${TD} whitespace-nowrap font-mono text-[11.5px] text-fg-muted`}>{item?.sku}</td>
                            <td className={TD}>
                              <p className="max-w-[320px] truncate font-medium text-fg">{item?.name ?? 'Removed item'}</p>
                            </td>
                            <td className={`${TD} tnum whitespace-nowrap text-right text-fg`}>
                              {fmtNumber(line.qty)} <span className="text-[11px] text-fg-subtle">{item?.uom}</span>
                            </td>
                            <td className={`${TD} tnum whitespace-nowrap text-right text-fg-muted`}>
                              {fmtCurrency(price.unitPrice, 'IDR')}
                              <span className="ml-1.5 text-[11px] text-fg-subtle">{BASIS_LABEL[price.basis].toLowerCase()}</span>
                            </td>
                            <td className={`${TD} tnum whitespace-nowrap text-right font-medium text-fg`}>
                              {fmtCurrency(prLineTotal(line, purchasePrices, items), 'IDR', { compact: true })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {supplier && supplier.minOrderValue !== undefined && bucket.value < supplier.minOrderValue && (
                  <CardBody className="flex items-start gap-2 border-t border-border bg-warning-soft/40 text-[12.5px] text-warning-soft-fg">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>
                      Below this supplier's minimum order of {fmtCurrency(supplier.minOrderValue, 'IDR')} — move more lines
                      here or expect a surcharge.
                    </span>
                  </CardBody>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'divisions' && (
        <Card>
          <CardHeader
            icon={<Building2 />}
            title="What each division contributed"
            description="The recap read backwards: every division keeps its own quantity inside the merged lines."
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  <th className={TH}>Division</th>
                  <th className={`${TH} text-right`}>Lines</th>
                  <th className={`${TH} text-right`}>Units</th>
                  <th className={`${TH} text-right`}>Share of value</th>
                  <th className={TH}>Source request</th>
                </tr>
              </thead>
              <tbody>
                {byDivision.map((row) => {
                  const request = mrRequests.find((r) => r.sessionId === pr.sessionId && r.divisionId === row.divisionId)
                  const share = totals.value ? Math.round((row.value / totals.value) * 100) : 0
                  return (
                    <tr key={row.divisionId}>
                      <td className={TD}>
                        <p className="font-medium text-fg">{divisionName(row.divisionId)}</p>
                        <p className="text-[11px] text-fg-subtle">{divisionCode(row.divisionId)}</p>
                      </td>
                      <td className={`${TD} tnum text-right text-fg-muted`}>{row.lines}</td>
                      <td className={`${TD} tnum text-right text-fg-muted`}>{fmtNumber(row.qty)}</td>
                      <td className={`${TD} text-right`}>
                        <span className="tnum font-medium text-fg">{fmtCurrency(row.value, 'IDR', { compact: true })}</span>
                        <div className="ml-auto mt-1 h-1 w-[120px] overflow-hidden rounded-full bg-neutral-soft">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                        </div>
                      </td>
                      <td className={TD}>
                        {request ? (
                          <Link to={`/mr/${pr.sessionId}`} className="font-mono text-[12px] font-medium text-primary hover:underline">
                            {request.code}
                          </Link>
                        ) : (
                          <span className="text-[12px] text-fg-subtle">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Purchase history for one item: where the "last price" actually comes from. */}
      <Dialog open={!!history} onOpenChange={(v) => !v && setHistory(null)}>
        <DialogContent
          size="lg"
          icon={<History />}
          title={history ? itemOf(history)?.name ?? 'Purchase history' : 'Purchase history'}
          description="Every purchase of this item on record, newest first. The most recent one from the assigned supplier is what the line is valued at."
          footer={<Button variant="secondary" size="sm" onClick={() => setHistory(null)}>Close</Button>}
        >
          {history && (
            <div className="scrollbar-thin max-h-[420px] overflow-auto">
              <table className="w-full border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr>
                    <th className={TH}>Date</th>
                    <th className={TH}>Supplier</th>
                    <th className={TH}>PO</th>
                    <th className={`${TH} text-right`}>Qty</th>
                    <th className={`${TH} text-right`}>Unit price</th>
                  </tr>
                </thead>
                <tbody>
                  {purchasePrices
                    .filter((p) => p.itemId === history.itemId)
                    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))
                    .map((p) => (
                      <tr key={p.id} className={p.supplierId === history.supplierId ? 'bg-primary-soft/25' : undefined}>
                        <td className={`${TD} tnum whitespace-nowrap text-fg-muted`}>{fmtDate(p.purchasedAt)}</td>
                        <td className={TD}>
                          <span className="font-medium text-fg">{supplierName(p.supplierId)}</span>
                          {p.supplierId === history.supplierId && <Badge tone="primary" size="sm" className="ml-2">assigned</Badge>}
                        </td>
                        <td className={`${TD} whitespace-nowrap font-mono text-[11.5px] text-fg-muted`}>{p.poNumber}</td>
                        <td className={`${TD} tnum text-right text-fg-muted`}>{fmtNumber(p.qty)}</td>
                        <td className={`${TD} tnum whitespace-nowrap text-right font-medium text-fg`}>{fmtCurrency(p.unitPrice, 'IDR')}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <DialogContent
          icon={confirm === 'CANCELLED' ? <XCircle /> : <CheckCircle2 />}
          title={
            confirm === 'APPROVED'
              ? `Approve ${pr.code}?`
              : confirm === 'ORDERED'
                ? `Mark ${pr.code} as ordered?`
                : `Cancel ${pr.code}?`
          }
          description={
            confirm === 'APPROVED'
              ? 'Suppliers and prices are frozen once approved. The recap stays readable, but it can no longer be edited here.'
              : confirm === 'ORDERED'
                ? 'Records that the assigned suppliers have been given the order.'
                : 'Nothing will be ordered from this request. The source session stays locked either way.'
          }
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>Keep as is</Button>
              <Button variant={confirm === 'CANCELLED' ? 'danger' : 'primary'} size="sm" onClick={() => confirm && changeStatus(confirm)}>
                {confirm === 'APPROVED' ? 'Approve' : confirm === 'ORDERED' ? 'Mark as ordered' : 'Cancel the request'}
              </Button>
            </>
          }
        >
          <div className="space-y-2 p-5 text-[13px] text-fg-muted">
            <p>
              {totals.lines} lines · {fmtNumber(totals.qty)} units · {fmtCurrency(totals.value, 'IDR')} across{' '}
              {totals.suppliers} supplier{totals.suppliers === 1 ? '' : 's'}.
            </p>
            {confirm === 'APPROVED' && totals.priced < totals.lines && (
              <p className="text-warning">
                {totals.lines - totals.priced} lines are still valued at a reference price rather than an agreed one.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
