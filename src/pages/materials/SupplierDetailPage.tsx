import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, BadgeCheck, ClipboardCheck, PackageSearch, ShieldAlert, Tag, Truck,
} from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, MetaRow, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useMfg } from '@/store/useMfg'
import {
  certificateStates, orderProgress, purchaseOrderIsOpen, purchaseOrderValue,
  supplierPriceRows, supplierQualification, supplierReceiptRecord,
} from '@/lib/receiving'
import { subcontractState } from '@/lib/operations'
import { claimCost } from '@/lib/commerce'
import {
  certKindMeta, countryFlag, countryName, paymentInstrumentLabel, SUPPLIER_CERT_WARNING_DAYS,
  supplierApprovalMeta,
} from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'

export function SupplierDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const s = useMfg()

  const supplier = s.suppliers.find((x) => x.id === id)
  if (!supplier) {
    return (
      <EmptyState
        title="Supplier not found"
        description="It may have been removed, or the link is stale."
        action={<Button onClick={() => navigate('/suppliers')}>Back to suppliers</Button>}
      />
    )
  }

  const qual = supplierQualification(supplier)
  const certs = certificateStates(supplier)
  const record = supplierReceiptRecord(supplier.id, s.goodsReceipts)
  const prices = supplierPriceRows(supplier.id, s.supplierItems, s.items)
  const orders = s.purchaseOrders.filter((p) => p.supplierId === supplier.id)
  const openOrders = orders.filter((p) => purchaseOrderIsOpen(p.status))
  const claims = s.claims.filter((c) => c.liability === 'SUPPLIER')
  const subcontracts = s.subcontractOrders.filter((o) => o.supplierId === supplier.id)
  const approval = supplierApprovalMeta(supplier.approvalStatus)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <Link to="/suppliers" className="inline-flex items-center gap-1 text-[13px] font-normal text-fg-muted hover:text-fg">
              <ArrowLeft className="size-4" /> Suppliers
            </Link>
            <span className="text-fg-subtle">·</span>
            {supplier.name}
          </span>
        }
        description={`${countryFlag(supplier.country)} ${supplier.city}, ${countryName(supplier.country)} · ${supplier.code} · ${paymentInstrumentLabel(supplier.paymentInstrument)}`}
        actions={<Badge tone={(approval?.tone ?? 'neutral') as never} size="lg">{approval?.label}</Badge>}
      />

      <Card className={qual.canOrder ? undefined : 'border-danger/50'}>
        <CardBody className="py-3">
          <p className="text-[12.5px] leading-relaxed text-fg">
            <span className={`font-semibold ${qual.canOrder ? 'text-success' : 'text-danger'}`}>
              {qual.canOrder ? 'Clear to order.' : 'Not clear to order.'}
            </span>{' '}
            <span className="text-fg-muted">{qual.verdict}</span>
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open orders"
          value={fmtNumber(openOrders.length)}
          icon={<PackageSearch />} accent="primary"
          sub={`${fmtCurrency(openOrders.reduce((a, p) => a + purchaseOrderValue(p), 0), 'IDR', { compact: true })} on order`}
        />
        <KpiCard
          label="Acceptance rate"
          value={fmtPercent(record.acceptanceRatePercent, 1)}
          icon={<ClipboardCheck />}
          accent={record.acceptanceRatePercent >= 98 ? 'success' : 'warning'}
          sub={`${fmtNumber(record.receipts)} receipt(s), ${fmtNumber(record.discrepancyReceipts)} with a discrepancy`}
        />
        <KpiCard
          label="On time"
          value={fmtPercent(supplier.onTimePercent, 0)}
          icon={<Truck />}
          accent={supplier.onTimePercent >= 90 ? 'success' : supplier.onTimePercent >= 80 ? 'warning' : 'danger'}
          sub={`document accuracy ${fmtPercent(supplier.documentAccuracyPercent, 0)}`}
        />
        <KpiCard
          label="Certificates"
          value={fmtNumber(certs.length)}
          icon={<BadgeCheck />}
          accent={qual.expiredCertificates ? 'danger' : qual.expiringCertificates ? 'warning' : 'success'}
          sub={
            qual.expiredCertificates
              ? `${fmtNumber(qual.expiredCertificates)} lapsed`
              : qual.expiringCertificates
                ? `${fmtNumber(qual.expiringCertificates)} expiring inside ${SUPPLIER_CERT_WARNING_DAYS} days`
                : 'all current'
          }
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader
              icon={<Tag />}
              title="The agreed price list"
              description="What we agreed to pay, against the standard cost the bill of material is costed at. The gap between them is where a quotation's margin goes."
            />
            <CardBody className="p-0">
              {prices.length === 0 && <EmptyState title="No agreed prices on file" description="Everything bought from them is priced order by order, which is how a price drifts without anybody noticing." />}
              <div className="divide-y divide-border">
                {prices.map(({ row, item, variance, lapsed, driftPercent }) => (
                  <div key={row.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold text-fg">{item?.name ?? row.itemId}</p>
                        <p className="truncate font-mono text-[11px] text-fg-muted">
                          {item?.code}
                          {row.supplierPartNo && ` · their ${row.supplierPartNo}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tnum text-[12.5px] font-semibold text-fg">
                          {fmtCurrency(row.agreedPrice, row.currency, { compact: true })}
                        </p>
                        <p className="tnum text-[11px] text-fg-muted">per {item?.uom}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <Tooltip content={variance.note}>
                        <span>
                          <Badge tone={variance.beyondTolerance ? (variance.variance > 0 ? 'danger' : 'success') : 'neutral'} size="sm">
                            {variance.comparable
                              ? `${variance.variance > 0 ? '+' : ''}${fmtPercent(variance.variancePercent, 1)} on standard`
                              : 'FOB — not comparable'}
                          </Badge>
                        </span>
                      </Tooltip>
                      {!row.preferred && <Badge tone="warning" size="sm">alternate</Badge>}
                      {lapsed && (
                        <Tooltip content="The price list has run out. Anything quoted on this figure is a guess until it is re-agreed.">
                          <span><Badge tone="danger" size="sm">price lapsed</Badge></span>
                        </Tooltip>
                      )}
                      {!lapsed && row.priceValidUntil && (
                        <span className="tnum text-[11px] text-fg-muted">valid to {fmtDate(row.priceValidUntil, 'short')}</span>
                      )}
                      {Math.abs(driftPercent) > 1 && (
                        <span className={`tnum text-[11px] ${driftPercent > 0 ? 'text-warning' : 'text-success'}`}>
                          last paid {driftPercent > 0 ? '+' : ''}{fmtPercent(driftPercent, 1)}
                        </span>
                      )}
                      <span className="tnum text-[11px] text-fg-muted">
                        MOQ {fmtNumber(row.minimumOrderQuantity)} · {row.quotedLeadDays} d quoted
                      </span>
                    </div>
                    {row.note && <Because className="mt-1.5 text-[11px]">{row.note}</Because>}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<PackageSearch />} title="Orders" description="Open first, then what has closed." />
            <CardBody className="p-0">
              {orders.length === 0 && <EmptyState title="Nothing has been ordered from them" />}
              <div className="divide-y divide-border">
                {orders
                  .slice()
                  .sort((a, b) => Number(purchaseOrderIsOpen(b.status)) - Number(purchaseOrderIsOpen(a.status)) || b.orderDate.localeCompare(a.orderDate))
                  .slice(0, 8)
                  .map((p) => {
                    const prog = orderProgress(p)
                    return (
                      <Link key={p.id} to={`/purchasing/${p.id}`} className="block px-4 py-3 transition-colors hover:bg-bg-muted">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-[12.5px] font-semibold text-fg">{p.code}</p>
                            <p className="truncate text-[11.5px] text-fg-muted">
                              {fmtDate(p.orderDate, 'short')} · {p.lines.length} line{p.lines.length === 1 ? '' : 's'} · {fmtCurrency(purchaseOrderValue(p), 'IDR', { compact: true })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {prog.late && <Badge tone="danger" size="sm">{prog.daysLate}d late</Badge>}
                            <StatusBadge value={p.status} size="sm" />
                          </div>
                        </div>
                        {purchaseOrderIsOpen(p.status) && (
                          <Progress className="mt-2" value={prog.percent} tone={prog.late ? 'danger' : 'accent'} size="sm" />
                        )}
                      </Link>
                    )
                  })}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader
              icon={<BadgeCheck />}
              title="Qualification"
              description="What an export buyer's own compliance desk will ask us for, by name."
            />
            <CardBody className="divide-y divide-border py-0">
              <MetaRow label="Approval">{approval?.label}</MetaRow>
              {supplier.approvedAt && <MetaRow label="Approved">{fmtDate(supplier.approvedAt)}</MetaRow>}
              {supplier.lastAuditAt && <MetaRow label="Last audited">{fmtDate(supplier.lastAuditAt)}</MetaRow>}
              {supplier.nextAuditDue && (
                <MetaRow label="Next audit">
                  <span className={qual.auditOverdue ? 'text-danger' : undefined}>
                    {fmtDate(supplier.nextAuditDue)}
                    {qual.auditOverdue && ` · ${qual.auditDaysOverdue}d overdue`}
                  </span>
                </MetaRow>
              )}
              {supplier.taxId && <MetaRow label="Tax ID">{supplier.taxId}</MetaRow>}
              {supplier.bankName && <MetaRow label="Bank">{supplier.bankName}</MetaRow>}
              {supplier.bankAccountNo && <MetaRow label="Account">{supplier.bankAccountNo}</MetaRow>}
            </CardBody>
            {supplier.openFinding && (
              <CardBody className="border-t border-border">
                <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-warning">Open finding</p>
                <Because className="mt-1">{supplier.openFinding}</Because>
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader icon={<ShieldAlert />} title="Certificates" description="A lapsed certificate makes every order under it challengeable at somebody else's audit." />
            <CardBody className="space-y-2.5">
              {certs.length === 0 && (
                <Because>
                  None on file. For a timber line that is not an administrative gap — without SVLK in the chain there is no V-Legal document, and without that no container of wood leaves the country.
                </Because>
              )}
              {certs.map(({ certificate, daysLeft, expired, expiring }) => {
                const meta = certKindMeta(certificate.kind)
                return (
                  <div key={certificate.id}>
                    <div className="flex items-start justify-between gap-3">
                      <Tooltip content={meta?.hint ?? ''}>
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium text-fg">{meta?.label ?? certificate.kind}</p>
                          <p className="truncate font-mono text-[11px] text-fg-muted">{certificate.number}</p>
                        </div>
                      </Tooltip>
                      <div className="shrink-0 text-right">
                        <Badge tone={expired ? 'danger' : expiring ? 'warning' : 'success'} size="sm">
                          {expired ? `lapsed ${Math.abs(daysLeft)}d ago` : `${daysLeft}d left`}
                        </Badge>
                        <p className="mt-0.5 text-[11px] text-fg-muted">{certificate.issuer}</p>
                      </div>
                    </div>
                    {certificate.note && <Because className="mt-1 text-[11px]">{certificate.note}</Because>}
                    <Separator className="mt-2.5" />
                  </div>
                )
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<ClipboardCheck />} title="What they actually deliver" description="From the receipts, not from a stored score." />
            <CardBody>
              <MetaRow label="Receipts">{fmtNumber(record.receipts)}</MetaRow>
              <MetaRow label="Accepted">{fmtPercent(record.acceptanceRatePercent, 1)}</MetaRow>
              {record.lastReceivedAt && <MetaRow label="Last delivery">{fmtDate(record.lastReceivedAt)}</MetaRow>}
              {record.topDiscrepancies.length > 0 && (
                <>
                  <Separator className="my-2.5" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">What goes wrong, most often first</p>
                  <div className="mt-1.5 space-y-1">
                    {record.topDiscrepancies.map((d) => (
                      <div key={d.kind} className="flex items-baseline justify-between gap-3">
                        <span className="text-[12px] text-fg">{d.label}</span>
                        <span className="tnum text-[12px] text-fg-muted">{d.count}×</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {supplier.kind === 'OVERSEAS' && (
                <>
                  <Separator className="my-2.5" />
                  <MetaRow label="Clearance">{fmtNumber(supplier.avgClearanceDays, 1)} days average</MetaRow>
                  <MetaRow label="Lane history">
                    {supplier.laneHistory.green}G · {supplier.laneHistory.yellow}Y · {supplier.laneHistory.red}R
                  </MetaRow>
                </>
              )}
            </CardBody>
          </Card>

          {(claims.length > 0 || subcontracts.length > 0) && (
            <Card>
              <CardHeader title="Charged back and sent out" />
              <CardBody className="space-y-2">
                {claims.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-3">
                    <Link to="/claims" className="min-w-0 truncate font-mono text-[11.5px] text-primary hover:underline">{c.code}</Link>
                    <span className="tnum shrink-0 text-[11.5px] text-success">
                      {fmtCurrency(claimCost(c).recovered, 'IDR', { compact: true })} recovered
                    </span>
                  </div>
                ))}
                {subcontracts.map((o) => {
                  const st = subcontractState(o)
                  return (
                    <div key={o.id} className="flex items-start justify-between gap-3">
                      <Link to="/subcontract" className="min-w-0 truncate font-mono text-[11.5px] text-primary hover:underline">{o.code}</Link>
                      <span className={`tnum shrink-0 text-[11.5px] ${st.overdue ? 'text-danger' : 'text-fg-muted'}`}>
                        {st.overdue ? `${st.daysLate}d late` : o.status.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          )}

          {supplier.note && (
            <Card>
              <CardBody><Because>{supplier.note}</Because></CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
