import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Mail, Phone, ShieldCheck } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/misc'
import { MetaRow, StatusBadge } from '@/components/shared/status'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent, relativeLabel, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { revenueIdr } from '@/lib/costing'
import { paymentTermLabel, incotermHint } from '@/data/reference'
import { projectCbm } from '@/data/seed-projects'

export function BuyerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const store = useErp()
  const buyer = store.buyers.find((b) => b.id === id)

  if (!buyer) {
    return (
      <EmptyState
        title="No such buyer"
        action={<Button onClick={() => navigate('/buyers')}>Back to buyers</Button>}
      />
    )
  }

  const orders = store.projects.filter((p) => p.buyerId === buyer.id)
  const won = orders.filter((p) => p.status === 'WON' || p.status === 'CLOSED')
  const lost = orders.filter((p) => p.status === 'LOST')
  const invoices = store.invoices.filter((i) => i.buyerId === buyer.id)
  const overdue = invoices.filter((i) => i.status === 'OVERDUE')
  const lifetime = won.reduce((a, p) => a + revenueIdr(p), 0)
  const volume = won.reduce((a, p) => a + projectCbm(p), 0)

  return (
    <div className="min-h-0">
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => navigate('/buyers')}>
        <ArrowLeft /> Buyers
      </Button>

      <PageHeader
        eyebrow={
          <>
            <Badge tone="primary" size="sm">{buyer.code}</Badge>
            <StatusBadge value={buyer.status} size="sm" />
            <span className="text-[12px] text-fg-muted">{titleCase(buyer.segment)}</span>
          </>
        }
        title={buyer.tradingName}
        description={buyer.note ?? buyer.legalName}
        meta={
          <>
            <span className="text-[12.5px] text-fg-muted">
              {buyer.city}, {buyer.countryName} · discharges at {buyer.destinationPort}
            </span>
            <span className="text-[12.5px] text-fg-muted">Customer since {fmtDate(buyer.customerSince)}</span>
            <span className="text-[12.5px] text-fg-muted">Owned by {buyer.ownerName}</span>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Lifetime value" value={fmtCurrency(lifetime, 'IDR', { compact: true })} sub={`${won.length} orders won`} icon={<Building2 />} accent="primary" />
        <KpiCard label="Volume shipped" value={`${fmtNumber(volume, 1)} m³`} sub="finished goods" accent="accent" />
        <KpiCard
          label="Credit used"
          value={fmtPercent(buyer.creditLimit ? (buyer.outstanding / buyer.creditLimit) * 100 : 0, 0)}
          sub={`${fmtCurrency(buyer.outstanding, buyer.currency, { compact: true })} of ${fmtCurrency(buyer.creditLimit, buyer.currency, { compact: true })}`}
          accent={buyer.outstanding > buyer.creditLimit ? 'danger' : 'success'}
        />
        <KpiCard
          label="Overdue"
          value={String(overdue.length)}
          sub={overdue.length ? fmtCurrency(overdue.reduce((a, i) => a + i.amount - i.paidAmount, 0), buyer.currency, { compact: true }) : 'nothing late'}
          accent={overdue.length ? 'danger' : 'accent'}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader title="Trading terms" />
          <CardBody className="divide-y divide-border py-0">
            <MetaRow label="Currency">{buyer.currency}</MetaRow>
            <MetaRow label="Incoterm">
              <span title={incotermHint(buyer.defaultIncoterm)}>{buyer.defaultIncoterm}</span>
            </MetaRow>
            <MetaRow label="Payment">{paymentTermLabel(buyer.paymentTerm)}</MetaRow>
            <MetaRow label="Credit limit">{fmtCurrency(buyer.creditLimit, buyer.currency, { compact: true })}</MetaRow>
            <MetaRow label="Outstanding">
              <span className={buyer.outstanding > buyer.creditLimit ? 'text-danger' : undefined}>
                {fmtCurrency(buyer.outstanding, buyer.currency, { compact: true })}
              </span>
            </MetaRow>
            <MetaRow label="Destination port">{buyer.destinationPort}</MetaRow>
          </CardBody>
          <CardBody className="border-t border-border pt-3">
            <UtilisationBar pct={buyer.creditLimit ? (buyer.outstanding / buyer.creditLimit) * 100 : 0} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<ShieldCheck />} title="What they demand" description="These requirements switch on blocking documents for every order this buyer places." />
          <CardBody className="space-y-3">
            <Requirement on={buyer.requiresFsc} label="FSC certified chain of custody" hint="Every input has to come from a certified supplier, and the claim is carried on the invoice." />
            <Requirement on={buyer.requiresEudrDds} label="EUDR evidence pack" hint="Plot geolocation, supplier declarations and a risk assessment, so the importer can file its due diligence statement." />
            <Requirement on={buyer.requiresLabTest} label="Laboratory testing" hint="Structural or finish testing at a laboratory they nominate." />
            <div className="rounded-lg border border-border bg-surface-sunken p-3">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">Quality standard</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{buyer.qualityStandard}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Contacts" />
          <div className="divide-y divide-border">
            {buyer.contacts.length === 0 && <EmptyState title="No contacts recorded" />}
            {buyer.contacts.map((c) => (
              <div key={c.id} className="px-5 py-3.5">
                <p className="text-[13px] font-medium text-fg">
                  {c.name} {c.primary && <Badge size="sm" tone="primary">primary</Badge>}
                </p>
                <p className="text-[12px] text-fg-muted">{c.role}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-3 text-[12px] text-fg-muted">
                  <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" />{c.email}</span>
                  <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" />{c.phone}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title={`${orders.length} orders`}
          description={lost.length ? `${lost.length} lost — ${lost.map((l) => `${l.code} on ${titleCase(l.lossReason ?? 'unknown')}`).join(', ')}.` : 'Nothing lost with this buyer.'}
        />
        <div className="divide-y divide-border">
          {orders.length === 0 && <EmptyState title="No orders yet" description="A prospect with an enquiry not yet placed." />}
          {orders
            .slice()
            .sort((a, b) => (a.inquiryAt < b.inquiryAt ? 1 : -1))
            .map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-bg-muted/60">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-fg">{p.code} · {p.name}</p>
                  <p className="truncate text-[11.5px] text-fg-muted">
                    Enquiry {fmtDate(p.inquiryAt)} · target ship {fmtDate(p.targetShipAt)} ({relativeLabel(p.targetShipAt)})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={p.stage} size="sm" />
                  <StatusBadge value={p.status} size="sm" />
                  <span className="tnum text-[12.5px] font-medium text-fg">
                    {fmtCurrency(p.contractValue, p.currency, { compact: true })}
                  </span>
                </div>
              </Link>
            ))}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Invoices" description="Deposits and balances, and what is still outstanding." />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[700px] text-[12.5px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                <th className="px-5 py-2.5 font-medium">Invoice</th>
                <th className="px-5 py-2.5 font-medium">Kind</th>
                <th className="px-5 py-2.5 font-medium">Issued</th>
                <th className="px-5 py-2.5 font-medium">Due</th>
                <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                <th className="px-5 py-2.5 text-right font-medium">Outstanding</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-fg-muted">Nothing invoiced yet.</td></tr>
              )}
              {invoices.map((i) => (
                <tr key={i.id} className="hover:bg-bg-muted/50">
                  <td className="px-5 py-3 font-medium text-fg">{i.code}</td>
                  <td className="px-5 py-3"><StatusBadge value={i.kind} size="sm" /></td>
                  <td className="px-5 py-3 text-fg-muted">{fmtDate(i.issuedAt)}</td>
                  <td className="px-5 py-3 text-fg-muted">
                    {fmtDate(i.dueAt)} <span className="text-fg-subtle">({relativeLabel(i.dueAt)})</span>
                  </td>
                  <td className="tnum px-5 py-3 text-right">{fmtCurrency(i.amount, i.currency, { compact: true })}</td>
                  <td className="tnum px-5 py-3 text-right font-medium">
                    {fmtCurrency(i.amount - i.paidAmount, i.currency, { compact: true })}
                  </td>
                  <td className="px-5 py-3"><StatusBadge value={i.status} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function Requirement({ on, label, hint }: { on: boolean; label: string; hint: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-0.5 size-2 shrink-0 rounded-full ${on ? 'bg-danger' : 'bg-border-strong'}`} />
      <div className="min-w-0">
        <p className={`text-[12.5px] font-medium ${on ? 'text-fg' : 'text-fg-subtle line-through'}`}>{label}</p>
        {on && <p className="mt-0.5 text-[11.5px] leading-relaxed text-fg-muted">{hint}</p>}
      </div>
    </div>
  )
}
