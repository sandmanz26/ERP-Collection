import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, Building2, CheckCircle2, ClipboardCheck, History, Layers, Plus, Receipt,
  ShieldAlert, ShoppingCart, Store, Truck, Wallet, XCircle,
} from 'lucide-react'
import type { ItemCategory, PurchaseRequest, PurchaseRequestLine, Supplier } from '@/data/types'
import { ITEM_CATEGORIES, PROVINCES, itemCategoryLabel, monthLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { SwitchField } from '@/components/ui/checkbox'
import { uid } from '@/lib/utils'
import { Input, Textarea } from '@/components/ui/input'
import { MultiSelect, Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import {
  divisionsBehind, finalCheck, isApprovedFor, linesBySupplier, prLinePrice, prLineTotal, prTotals,
  priceHistory, supplierChoices, type PriceBasis,
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

/* ================================================================
   Registering a supplier without leaving the request

   An item nobody is approved for would otherwise be unbuyable, which is a
   dead end rather than a rule. Purchasing can pick a supplier from outside
   the approved list — deliberately, with the category added to their record —
   or register a new one here and assign it in the same step.
   ================================================================ */

function QuickSupplierDialog({
  open,
  onOpenChange,
  category,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  category?: ItemCategory
  onCreated: (supplier: Supplier) => void
}) {
  const { suppliers, upsertSupplier } = useErp()
  const toast = useToast()
  const [draft, setDraft] = React.useState<Supplier | null>(null)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (!open) return
    const next = suppliers.length + 1
    setDraft({
      id: uid('sup'),
      code: `SUP-${String(next).padStart(4, '0')}`,
      legalName: '',
      brandName: '',
      categories: category ? [category] : [],
      picName: '',
      picPhone: '',
      picEmail: '',
      address: '',
      city: '',
      province: 'DKI Jakarta',
      npwp: '',
      paymentTermDays: 30,
      leadTimeDays: 14,
      bankName: '',
      bankAccount: '',
      rating: 3,
      onTimeRate: 0,
      status: 'ACTIVE',
      supplierSince: new Date().toISOString(),
      notes: '',
    })
    setErrors({})
  }, [open, category, suppliers.length])

  if (!draft) return null
  const set = <K extends keyof Supplier>(k: K, v: Supplier[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.code.trim()) e.code = 'A supplier code is required'
    if (suppliers.some((s) => s.code === draft.code)) e.code = 'This code is already used'
    if (!draft.legalName.trim()) e.legalName = 'The legal name is required'
    if (draft.categories.length === 0) e.categories = 'Name at least one category'
    if (!draft.picName.trim()) e.picName = 'Name the contact person'
    setErrors(e)
    if (Object.keys(e).length) return

    upsertSupplier(draft)
    onCreated(draft)
    toast.push({
      tone: 'success',
      title: `${draft.legalName} registered`,
      description: 'Their terms and lead time carry onto any order raised from this request. Fill in the rest on the supplier record.',
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        icon={<Store />}
        title="Register a supplier"
        description="Just enough to place an order. Everything else — bank details, NPWP, rating — is filled in on the supplier record afterwards."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={save}>Register and assign</Button>
          </>
        }
      >
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Supplier code" required error={errors.code}>
            <Input value={draft.code} onChange={(e) => set('code', e.target.value.toUpperCase())} className="font-mono" invalid={!!errors.code} />
          </Field>
          <Field label="Trading name" hint="What everyone actually calls them">
            <Input value={draft.brandName ?? ''} onChange={(e) => set('brandName', e.target.value)} />
          </Field>
          <Field label="Legal name" required error={errors.legalName} className="sm:col-span-2">
            <Input value={draft.legalName} onChange={(e) => set('legalName', e.target.value)} placeholder="PT …" invalid={!!errors.legalName} />
          </Field>
          <Field label="Approved for" required error={errors.categories} className="sm:col-span-2" hint="Which purchase request lines they can be assigned to">
            <MultiSelect
              values={draft.categories}
              onChange={(v) => set('categories', v as ItemCategory[])}
              options={ITEM_CATEGORIES.map((c) => ({ value: c.value, label: c.label, description: c.description }))}
              placeholder="Choose at least one"
            />
          </Field>
          <Field label="Contact person" required error={errors.picName}>
            <Input value={draft.picName} onChange={(e) => set('picName', e.target.value)} invalid={!!errors.picName} />
          </Field>
          <Field label="Phone">
            <Input value={draft.picPhone} onChange={(e) => set('picPhone', e.target.value)} placeholder="+62 …" />
          </Field>
          <Field label="City">
            <Input value={draft.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="Province">
            <Select value={draft.province} onChange={(v) => set('province', v)} options={PROVINCES.map((p) => ({ value: p, label: p }))} searchable />
          </Field>
          <Field label="Payment term" hint="days">
            <Input type="number" min={0} value={draft.paymentTermDays} onChange={(e) => set('paymentTermDays', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Lead time" hint="days from order to delivery">
            <Input type="number" min={0} value={draft.leadTimeDays} onChange={(e) => set('leadTimeDays', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Note" className="sm:col-span-2" hint="optional">
            <Textarea value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Kenapa supplier ini dipakai untuk permintaan ini…" />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  )
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
    purchaseOrders, warehouses, assignPrSupplier, setPrAgreedPrice, setPrStatus, issuePurchaseOrders,
    upsertSupplier,
  } = useErp()

  const [tab, setTab] = React.useState<'lines' | 'check' | 'suppliers' | 'divisions'>('lines')
  const [history, setHistory] = React.useState<PurchaseRequestLine | null>(null)
  const [confirm, setConfirm] = React.useState<PurchaseRequest['status'] | null>(null)
  const [issuing, setIssuing] = React.useState(false)
  const [issueWarehouse, setIssueWarehouse] = React.useState('wh_jkt')
  const [registering, setRegistering] = React.useState<PurchaseRequestLine | null>(null)
  const [offCategory, setOffCategory] = React.useState<{ line: PurchaseRequestLine; supplier: Supplier } | null>(null)
  const [widenCategory, setWidenCategory] = React.useState(true)

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
  const issuedOrders = purchaseOrders.filter((po) => po.purchaseRequestId === pr.id)
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
  /* The list purchasing has to satisfy itself about before any of this becomes
     an order somebody outside the company can act on. */
  const review = finalCheck(pr, purchasePrices, items, suppliers)

  /* What each division is carrying inside this recap — the way back to the MR. */
  const byDivision = divisionsBehind(pr.lines, purchasePrices, items)

  /** What is worth knowing about a supplier at the moment of choosing one. */
  const supplierHint = (itemId: string, supplier: Supplier) => {
    const last = priceHistory(itemId, supplier.id, purchasePrices)[0]
    const price = last ? `last ${fmtCurrency(last.unitPrice, 'IDR')} · ${fmtDate(last.purchasedAt)}` : 'no history for this item'
    return `${price} · ${supplier.leadTimeDays}d lead${supplier.status === 'ON_HOLD' ? ' · on hold' : ''}`
  }

  /** Assigning, with the toast that tells purchasing what price it just inherited. */
  const assign = (line: PurchaseRequestLine, supplierId: string) => {
    assignPrSupplier(pr.id, line.id, supplierId)
    const last = priceHistory(line.itemId, supplierId, purchasePrices)[0]
    toast.push({
      tone: 'success',
      title: `${itemOf(line)?.name ?? 'Line'} → ${supplierName(supplierId)}`,
      description: last
        ? `Last bought at ${fmtCurrency(last.unitPrice, 'IDR')} on ${fmtDate(last.purchasedAt)} (${last.poNumber}).`
        : 'No purchase history with this supplier for the item yet.',
    })
  }

  /** Picking somebody outside the approved list is allowed, but never by accident. */
  const pickSupplier = (line: PurchaseRequestLine, supplierId: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId)
    if (supplier && !isApprovedFor(supplier, itemOf(line))) {
      setWidenCategory(true)
      setOffCategory({ line, supplier })
      return
    }
    assign(line, supplierId)
  }

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
                <Tooltip
                  content={
                    review.blockers.length
                      ? `${review.blockers.length} thing${review.blockers.length === 1 ? '' : 's'} still to fix before this can be approved`
                      : 'Run the final check and approve the request'
                  }
                >
                  <span>
                    <Button variant="primary" disabled={!review.ok} onClick={() => setConfirm('APPROVED')}>
                      <ClipboardCheck /> Final check
                      {review.blockers.length > 0 && (
                        <Badge tone="danger" size="sm">{review.blockers.length}</Badge>
                      )}
                    </Button>
                  </span>
                </Tooltip>
              </>
            )}
            {can('po.create') && pr.status === 'APPROVED' && issuedOrders.length === 0 && (
              <Button variant="primary" onClick={() => setIssuing(true)}>
                <Truck /> Next — issue purchase orders
              </Button>
            )}
            {issuedOrders.length > 0 && (
              <Button variant="secondary" onClick={() => nav(`/purchase-orders?pr=${pr.code}`)}>
                <Receipt /> {issuedOrders.length} orders issued
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
          sub={totals.priced === totals.lines ? 'every line has a quoted price' : 'the rest use a reference price'}
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
          {
            value: 'check',
            label: 'Final check',
            count: review.blockers.length ? undefined : review.checks.length,
            badge: review.blockers.length ? (
              <Badge tone="danger" size="sm">{review.blockers.length}</Badge>
            ) : undefined,
          },
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
                  const options = supplierChoices(line.itemId, items, suppliers)
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
                            onChange={(v) => pickSupplier(line, v)}
                            options={[
                              ...options.approved.map((s) => ({
                                value: s.id,
                                label: s.brandName ?? s.legalName,
                                description: supplierHint(line.itemId, s),
                                group: 'Approved for this category',
                                disabled: s.status === 'ON_HOLD',
                              })),
                              ...options.others.map((s) => ({
                                value: s.id,
                                label: s.brandName ?? s.legalName,
                                description: supplierHint(line.itemId, s),
                                group: 'Not approved for this category',
                                disabled: s.status === 'ON_HOLD',
                              })),
                            ]}
                            placeholder="Choose a supplier"
                            searchable
                            clearable
                            onClear={() => assignPrSupplier(pr.id, line.id, undefined)}
                            size="sm"
                            className="w-[200px]"
                            footer={
                              <button
                                onClick={() => setRegistering(line)}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium text-primary hover:bg-primary-soft/50"
                              >
                                <Plus className="size-3.5" /> Register a new supplier
                              </button>
                            }
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

      {tab === 'check' && (
        <div className="space-y-4">
          <Card>
            <CardHeader
              icon={<ClipboardCheck />}
              title="Purchasing's final check"
              description="Everything worth knowing before this request becomes orders. Blockers stop the approval; warnings are judgement calls that should at least be seen."
              actions={
                <div className="flex items-center gap-2">
                  <Badge tone={review.blockers.length ? 'danger' : 'success'} size="md">
                    {review.blockers.length} blocker{review.blockers.length === 1 ? '' : 's'}
                  </Badge>
                  <Badge tone={review.warnings.length ? 'warning' : 'neutral'} size="md">
                    {review.warnings.length} warning{review.warnings.length === 1 ? '' : 's'}
                  </Badge>
                </div>
              }
            />
            {review.checks.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 />}
                title="Nothing to query"
                description="Every line has an approved supplier at a price with a purchase behind it. This request is ready to become orders."
              />
            ) : (
              <CardBody className="space-y-2">
                {[...review.blockers, ...review.warnings].map((check, index) => (
                  <div
                    key={`${check.lineId ?? check.supplierId}_${index}`}
                    className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 ${
                      check.severity === 'BLOCKER' ? 'bg-danger-soft/40' : 'bg-warning-soft/40'
                    }`}
                  >
                    {check.severity === 'BLOCKER' ? (
                      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-danger" />
                    ) : (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-fg">{check.label}</p>
                      <p className="text-[12px] text-fg-muted">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </CardBody>
            )}
            {pr.status === 'APPROVED' && (
              <CardFooter>
                <span className="text-[12px] text-fg-muted">
                  Checked and approved{pr.approvedAt ? ` on ${fmtDate(pr.approvedAt)} by ${pr.approvedBy}` : ''}.
                </span>
                {can('po.create') && issuedOrders.length === 0 && (
                  <Button variant="primary" size="sm" onClick={() => setIssuing(true)}>
                    <Truck /> Next — issue purchase orders
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>

          <Card>
            <CardHeader
              icon={<Building2 />}
              title="Divisions behind this request"
              description="Who asked for what is on it. Information only — an order is placed with a supplier, not with a division."
            />
            <CardBody className="flex flex-wrap gap-2">
              {byDivision.map((row) => (
                <Badge key={row.divisionId} tone="outline" size="md">
                  {divisionCode(row.divisionId)} · {row.lines} lines · {fmtCurrency(row.value, 'IDR', { compact: true })}
                </Badge>
              ))}
            </CardBody>
          </Card>
        </div>
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

      <QuickSupplierDialog
        open={!!registering}
        onOpenChange={(v) => !v && setRegistering(null)}
        category={registering ? itemOf(registering)?.category : undefined}
        onCreated={(supplier) => {
          if (registering) assign(registering, supplier.id)
          setRegistering(null)
        }}
      />

      {/* Buying outside the approved list: allowed, but said out loud. */}
      <Dialog open={!!offCategory} onOpenChange={(v) => !v && setOffCategory(null)}>
        <DialogContent
          icon={<ShieldAlert />}
          title={offCategory ? `${offCategory.supplier.brandName ?? offCategory.supplier.legalName} is not approved for this category` : ''}
          description={
            offCategory
              ? `They were vetted for ${offCategory.supplier.categories.map((c) => itemCategoryLabel(c)).join(', ')} — not ${itemCategoryLabel(itemOf(offCategory.line)?.category ?? 'CONSUMABLE')}. They can still take the line; it is a decision, not an error.`
              : ''
          }
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setOffCategory(null)}>Pick somebody else</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!offCategory) return
                  const category = itemOf(offCategory.line)?.category
                  if (widenCategory && category) {
                    upsertSupplier({
                      ...offCategory.supplier,
                      categories: [...offCategory.supplier.categories, category],
                    })
                  }
                  assign(offCategory.line, offCategory.supplier.id)
                  setOffCategory(null)
                }}
              >
                Assign anyway
              </Button>
            </>
          }
        >
          <div className="space-y-3 p-5">
            <p className="text-[13px] text-fg-muted">
              {offCategory && itemOf(offCategory.line)?.name} would be bought from them on this request.
            </p>
            <SwitchField
              label="Add the category to their record"
              description={
                offCategory
                  ? `${itemCategoryLabel(itemOf(offCategory.line)?.category ?? 'CONSUMABLE')} becomes part of what they are approved for, so the next request does not ask again. Leave it off to keep this a one-off.`
                  : ''
              }
              checked={widenCategory}
              onChange={setWidenCategory}
            />
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Splitting the recap into documents suppliers can actually act on. */}
      <Dialog open={issuing} onOpenChange={setIssuing}>
        <DialogContent
          size="lg"
          icon={<Truck />}
          title={`Issue ${buckets.filter((b) => b.supplierId !== '__unassigned').length} purchase orders`}
          description="One order per supplier, priced at what this request settled on. From there each supplier delivers and invoices on its own."
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setIssuing(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const result = issuePurchaseOrders(pr.id, issueWarehouse)
                  if (!result.ok) {
                    toast.push({ tone: 'error', title: 'Nothing was issued', description: result.error ?? '' })
                    return
                  }
                  setIssuing(false)
                  toast.push({
                    tone: 'success',
                    title: `${result.codes?.length} orders issued`,
                    description: `${result.codes?.join(', ')} — deliveries and payments are recorded against them.`,
                  })
                  nav('/purchase-orders')
                }}
              >
                <Truck /> Issue the orders
              </Button>
            </>
          }
        >
          <div className="space-y-4 p-5">
            <Field label="Deliver to" required hint="Where the suppliers should send everything. A delivery can still name a different warehouse when it arrives.">
              <Select
                value={issueWarehouse}
                onChange={setIssueWarehouse}
                options={warehouses.map((w) => ({ value: w.id, label: w.name, description: `${w.code} · ${w.city}` }))}
              />
            </Field>
            <div className="rounded-lg border border-border">
              {buckets
                .filter((b) => b.supplierId !== '__unassigned')
                .map((bucket) => {
                  const supplier = suppliers.find((s) => s.id === bucket.supplierId)
                  return (
                    <div key={bucket.supplierId} className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-fg">{supplier?.brandName ?? supplier?.legalName}</p>
                        <p className="text-[11px] text-fg-subtle">
                          {bucket.lines.length} lines · {supplier?.leadTimeDays} day lead · {supplier?.paymentTermDays} day terms
                        </p>
                      </div>
                      <span className="tnum shrink-0 text-[12.5px] font-semibold text-fg">
                        {fmtCurrency(bucket.value, 'IDR', { compact: true })}
                      </span>
                    </div>
                  )
                })}
            </div>
            <p className="text-[12.5px] text-fg-muted">
              Each order carries the supplier's own lead time and payment terms, copied at issue so a later renegotiation cannot
              move an old due date. PPN is added on the order, not here.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <DialogContent
          icon={confirm === 'CANCELLED' ? <XCircle /> : <CheckCircle2 />}
          title={
            confirm === 'APPROVED'
              ? `Final check — approve ${pr.code}?`
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
                {confirm === 'APPROVED' ? 'Checked — approve' : confirm === 'ORDERED' ? 'Mark as ordered' : 'Cancel the request'}
              </Button>
            </>
          }
        >
          <div className="space-y-3 p-5 text-[13px] text-fg-muted">
            <p>
              {totals.lines} lines · {fmtNumber(totals.qty)} units · {fmtCurrency(totals.value, 'IDR')} across{' '}
              {totals.suppliers} supplier{totals.suppliers === 1 ? '' : 's'}, for {totals.divisions} divisions.
            </p>
            {confirm === 'APPROVED' && review.warnings.length > 0 && (
              <div className="space-y-1.5 rounded-lg bg-warning-soft/40 px-3 py-2.5">
                <p className="text-[12.5px] font-medium text-warning-soft-fg">
                  {review.warnings.length} thing{review.warnings.length === 1 ? '' : 's'} worth a second look before this goes out:
                </p>
                <ul className="space-y-1">
                  {review.warnings.slice(0, 5).map((check, index) => (
                    <li key={index} className="text-[12px] text-warning-soft-fg">· {check.label}</li>
                  ))}
                  {review.warnings.length > 5 && (
                    <li className="text-[12px] text-warning-soft-fg">· and {review.warnings.length - 5} more on the final check tab</li>
                  )}
                </ul>
              </div>
            )}
            {confirm === 'APPROVED' && review.warnings.length === 0 && (
              <p className="flex items-center gap-2 rounded-lg bg-success-soft/40 px-3 py-2.5 text-[12.5px] text-success-soft-fg">
                <CheckCircle2 className="size-4 shrink-0" /> Every line has an approved supplier at a price with a purchase behind it.
              </p>
            )}
            {confirm === 'APPROVED' && (
              <p>Approving freezes the recap. The next step is issuing one purchase order per supplier.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
