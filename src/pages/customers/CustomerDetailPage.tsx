import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Building2, CreditCard, Globe2, Mail, MapPin, Pencil, Phone, Ship, ShieldAlert, Star,
} from 'lucide-react'
import { useErp } from '@/store/useErp'
import { countryFlag } from '@/data/reference'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge, MetaRow } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { CustomerForm } from './CustomerForm'
import { fmtCurrency, fmtDate, titleCase } from '@/lib/format'
import { jobFinancials } from '@/lib/analytics'
import { StageChip } from '@/components/shared/StageChip'

export function CustomerDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { customers, projects, charges } = useErp()
  const [edit, setEdit] = React.useState(false)
  const customer = customers.find((c) => c.id === id)

  if (!customer)
    return (
      <EmptyState
        icon={<Building2 />}
        title="Customer not found"
        description="It may have been deleted from this workspace."
        action={
          <Button variant="secondary" size="sm" onClick={() => nav('/customers')}>
            Back to customers
          </Button>
        }
      />
    )

  const related = projects.filter((p) => [p.clientId, p.shipperId, p.consigneeId].includes(customer.id))
  const revenue = related.reduce((a, p) => a + jobFinancials(charges.filter((c) => c.projectId === p.id)).revenue, 0)
  const utilPct = customer.creditLimit ? (customer.outstandingAr / customer.creditLimit) * 100 : 0
  const over = utilPct > 100

  return (
    <>
      <Button variant="ghost" size="sm" className="-ml-2 mb-2 w-fit" onClick={() => nav('/customers')}>
        <ArrowLeft /> Customers
      </Button>

      <PageHeader
        eyebrow={
          <>
            <span className="font-mono text-[12px] text-fg-muted">{customer.code}</span>
            <StatusBadge value={customer.status} size="sm" />
            <StatusBadge value={customer.riskRating} size="sm" />
          </>
        }
        title={customer.tradeName || customer.legalName}
        description={customer.notes}
        meta={
          <>
            <span className="text-[12.5px] text-fg-muted">
              <span className="text-fg-subtle">Legal name</span> · {customer.legalName}
            </span>
            <span className="text-[12.5px] text-fg-muted">
              <span className="text-fg-subtle">Industry</span> · {customer.industry}
            </span>
            <span className="text-[12.5px] text-fg-muted">
              <span className="text-fg-subtle">Owner</span> · {customer.salesOwner}
            </span>
            <span className="text-[12.5px] text-fg-muted">
              <span className="text-fg-subtle">Since</span> · {fmtDate(customer.onboardedAt)}
            </span>
          </>
        }
        actions={
          <Button variant="secondary" onClick={() => setEdit(true)}>
            <Pencil /> Edit customer
          </Button>
        }
      />

      {over && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3">
          <ShieldAlert className="mt-0.5 size-[18px] shrink-0 text-danger" />
          <div className="text-[12.5px] leading-relaxed text-danger-soft-fg">
            <p className="font-semibold">Credit limit exceeded by {fmtCurrency(customer.outstandingAr - customer.creditLimit, 'IDR')}</p>
            <p>
              New jobs for this customer are gated at the inquiry stage until the overdue balance is settled or a director
              releases the hold.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              icon={<Globe2 />}
              title={`Country offices (${customer.offices.length})`}
              description="One customer, many markets. Each office carries its own port, customs identity and contacts."
            />
            <div className="divide-y divide-border">
              {customer.offices.map((o) => (
                <div key={o.id} className="flex gap-3.5 px-4 py-3.5">
                  <span className="mt-0.5 text-[22px] leading-none">{countryFlag(o.countryCode)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-semibold text-fg">{o.name}</p>
                      {o.isHeadquarter && (
                        <Badge tone="primary" size="sm">
                          <Star className="size-2.5" /> HQ
                        </Badge>
                      )}
                      {o.isBillingOffice && <Badge tone="accent" size="sm">Billing</Badge>}
                      {!o.active && <Badge tone="neutral" size="sm">Inactive</Badge>}
                      {o.roles.map((r) => (
                        <Badge key={r} tone="outline" size="sm">{titleCase(r)}</Badge>
                      ))}
                    </div>
                    <p className="mt-1 flex items-start gap-1.5 text-[12px] text-fg-muted">
                      <MapPin className="mt-px size-3.5 shrink-0" />
                      {o.addressLine || '—'}, {o.city}, {o.country}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] text-fg-muted">
                      {o.portName && (
                        <span>
                          <span className="text-fg-subtle">Port</span> · {o.portName} ({o.portCode})
                        </span>
                      )}
                      {o.customsId && (
                        <span>
                          <span className="text-fg-subtle">Customs ID</span> · <span className="font-mono">{o.customsId}</span>
                        </span>
                      )}
                      {o.vatNumber && (
                        <span>
                          <span className="text-fg-subtle">VAT</span> · <span className="font-mono">{o.vatNumber}</span>
                        </span>
                      )}
                    </div>
                    {o.contacts.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {o.contacts.map((c) => (
                          <div key={c.id} className="rounded-lg border border-border bg-surface-sunken px-2.5 py-1.5">
                            <p className="text-[12px] font-medium text-fg">
                              {c.name}
                              {c.title && <span className="font-normal text-fg-muted"> · {c.title}</span>}
                            </p>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-fg-muted">
                              {c.email && (
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="size-3" /> {c.email}
                                </span>
                              )}
                              {c.phone && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="size-3" /> {c.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={<Ship />}
              title={`Jobs (${related.length})`}
              description="Every project where this party is the client, the shipper or the consignee."
            />
            {related.length === 0 ? (
              <EmptyState icon={<Ship />} title="No jobs yet" description="Jobs created for this customer will appear here." />
            ) : (
              <div className="divide-y divide-border">
                {related
                  .slice()
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((p) => {
                    const role = [
                      p.clientId === customer.id && 'Client',
                      p.shipperId === customer.id && 'Shipper',
                      p.consigneeId === customer.id && 'Consignee',
                    ].filter(Boolean) as string[]
                    return (
                      <Link
                        key={p.id}
                        to={`/projects/${p.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-muted/60"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-fg">{p.name}</p>
                          <p className="truncate text-[11.5px] text-fg-muted">
                            <span className="font-mono">{p.code}</span> · {p.polName} → {p.podName} · {role.join(' + ')}
                          </p>
                        </div>
                        <StageChip stage={p.stage} />
                        <StatusBadge value={p.status} size="sm" />
                      </Link>
                    )
                  })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader icon={<CreditCard />} title="Credit & terms" />
            <CardBody className="space-y-3">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[12px] text-fg-muted">Credit utilisation</span>
                  <span className={`tnum text-[12.5px] font-semibold ${over ? 'text-danger' : 'text-fg'}`}>
                    {utilPct.toFixed(0)}%
                  </span>
                </div>
                <Progress value={Math.min(100, utilPct)} tone={over ? 'danger' : utilPct > 80 ? 'warning' : 'success'} />
                <p className="mt-1.5 text-[11.5px] text-fg-muted">
                  {fmtCurrency(customer.outstandingAr, 'IDR')} of {fmtCurrency(customer.creditLimit, customer.creditCurrency)}
                </p>
              </div>
              <Separator />
              <div className="divide-y divide-border">
                <MetaRow label="Payment term">{titleCase(customer.defaultPaymentTerm)}</MetaRow>
                <MetaRow label="Term days">{customer.creditTermDays} days</MetaRow>
                <MetaRow label="Default Incoterm">{customer.defaultIncoterm}</MetaRow>
                <MetaRow label="Risk rating">
                  <StatusBadge value={customer.riskRating} size="sm" />
                </MetaRow>
                {customer.taxId && (
                  <MetaRow label="Tax ID">
                    <span className="font-mono text-[12px]">{customer.taxId}</span>
                  </MetaRow>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Ship />} title="Account activity" />
            <CardBody className="divide-y divide-border">
              <MetaRow label="Total jobs">{related.length}</MetaRow>
              <MetaRow label="Active jobs">{related.filter((p) => p.status === 'ACTIVE').length}</MetaRow>
              <MetaRow label="Lifetime revenue">{fmtCurrency(revenue, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Markets served">
                {new Set(related.map((p) => p.destCountry)).size || customer.offices.length}
              </MetaRow>
              <MetaRow label="Consignment jobs">{related.filter((p) => p.type === 'CONSIGNMENT').length}</MetaRow>
            </CardBody>
          </Card>
        </div>
      </div>

      <CustomerForm open={edit} onOpenChange={setEdit} initial={customer} />
    </>
  )
}
