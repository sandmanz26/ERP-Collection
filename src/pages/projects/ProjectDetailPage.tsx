import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Boxes, ClipboardCheck, Container, FileSpreadsheet, Factory, Handshake, Package,
  PencilRuler, ShieldCheck, ShoppingCart,
} from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Stepper } from '@/components/shared/Stepper'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState, Progress } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { MetaRow, StatusBadge } from '@/components/shared/status'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtDate, fmtDateTime, fmtNumber, fmtPercent, relativeLabel, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { useStock } from '@/hooks/useExceptions'
import { fobSheet, lineBudget, projectCosting, revenueIdr, sampleCost } from '@/lib/costing'
import { materialGaps } from '@/lib/inventory'
import { orderProgress } from '@/lib/procurement'
import {
  COST_CATEGORIES, PROJECT_STAGES, complianceSpec, costCategoryLabel, exportDocLabel, incotermHint,
  paymentTermLabel, stageIndex, suggestContainers, uomLabel,
} from '@/data/reference'
import { projectCbm } from '@/data/seed-projects'
import type { ProjectStage } from '@/data/types'

type Tab = 'overview' | 'items' | 'negotiation' | 'design' | 'budget' | 'procurement' | 'production' | 'shipment'

export function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const store = useErp()
  const { positions } = useStock()
  const [tab, setTab] = React.useState<Tab>('overview')
  const [stagePeek, setStagePeek] = React.useState<ProjectStage | null>(null)

  const project = store.projects.find((p) => p.id === id)
  if (!project) {
    return (
      <EmptyState
        title="That order is not here"
        description="It may have been deleted from this browser's copy of the data."
        action={<Button onClick={() => navigate('/projects')}>Back to the order book</Button>}
      />
    )
  }

  const budget = store.budgets
    .filter((b) => b.projectId === project.id)
    .sort((a, b) => b.version - a.version)[0]
  const approved = store.budgets.find(
    (b) => b.projectId === project.id && (b.status === 'APPROVED' || b.status === 'CLOSED'),
  )
  const orders = store.orders.filter((o) => o.projectId === project.id)
  const receipts = store.receipts.filter((g) => g.projectId === project.id)
  const workOrders = store.workOrders.filter((w) => w.projectId === project.id)
  const shipment = store.shipments.find((s) => s.projectId === project.id)
  const invoices = store.invoices.filter((i) => i.projectId === project.id)
  const bills = store.bills.filter((b) => b.projectId === project.id)
  const buyer = store.buyers.find((b) => b.id === project.buyerId)

  const costing = projectCosting(project, approved, orders, (itemId) => {
    const item = store.items.find((i) => i.id === itemId)
    if (!item) return undefined
    const map: Record<string, string> = {
      TIMBER: 'TIMBER', PANEL: 'PANEL', HARDWARE: 'HARDWARE', FINISHING: 'FINISHING',
      UPHOLSTERY: 'UPHOLSTERY', PACKAGING: 'PACKAGING', COMPONENT: 'SUBCON',
    }
    return (map[item.category] ?? 'OVERHEAD') as never
  })
  const samples = sampleCost(project)
  const gaps = materialGaps(project, positions, store.reservations)
  const cbm = projectCbm(project)
  const boxes = suggestContainers(cbm)

  const produced = project.items.reduce((a, i) => a + i.producedQty, 0)
  const ordered = project.items.reduce((a, i) => a + i.qty, 0)

  const TABS: { value: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { value: 'overview', label: 'Overview', icon: <ClipboardCheck /> },
    { value: 'items', label: 'Order lines', icon: <Package />, count: project.items.length },
    { value: 'negotiation', label: 'Negotiation', icon: <Handshake />, count: project.negotiations.length },
    { value: 'design', label: 'Drawings & samples', icon: <PencilRuler />, count: project.drawings.length + project.samples.length },
    { value: 'budget', label: 'Budget (RAB)', icon: <FileSpreadsheet />, count: budget?.lines.length },
    { value: 'procurement', label: 'Procurement', icon: <ShoppingCart />, count: orders.length },
    { value: 'production', label: 'Production', icon: <Factory />, count: workOrders.length },
    { value: 'shipment', label: 'Shipment & docs', icon: <Container />, count: shipment?.documents.length },
  ]

  return (
    <div className="min-h-0">
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => navigate('/projects')}>
        <ArrowLeft /> Order book
      </Button>

      <PageHeader
        eyebrow={
          <>
            <Badge tone="primary" size="sm">{project.code}</Badge>
            <StatusBadge value={project.status} size="sm" />
            <StatusBadge value={project.priority} size="sm" />
            {project.poNumber && <span className="text-[12px] text-fg-muted">Buyer PO {project.poNumber}</span>}
          </>
        }
        title={project.name}
        description={project.note}
        meta={
          <>
            <MetaChip label="Buyer">
              <Link to={`/buyers/${project.buyerId}`} className="text-primary hover:underline">
                {project.buyerName}
              </Link>
            </MetaChip>
            <MetaChip label="Destination">{project.destinationPort}, {project.destinationCountry}</MetaChip>
            <MetaChip label="Terms">
              <Tooltip content={incotermHint(project.incoterm)}>
                <span>{project.incoterm}</span>
              </Tooltip>{' '}
              · {paymentTermLabel(project.paymentTerm)}
            </MetaChip>
            <MetaChip label="Target ship">
              {fmtDate(project.targetShipAt)} <span className="text-fg-subtle">({relativeLabel(project.targetShipAt)})</span>
            </MetaChip>
          </>
        }
        actions={
          <>
            {stageIndex(project.stage) < PROJECT_STAGES.length - 1 && project.status !== 'LOST' && (
              <Button
                variant="primary"
                onClick={() => store.advanceStage(project.id, PROJECT_STAGES[stageIndex(project.stage) + 1].key)}
              >
                Move to {PROJECT_STAGES[stageIndex(project.stage) + 1].label}
              </Button>
            )}
          </>
        }
      />

      <div data-tour="stage">
        <Stepper
          project={project}
          selected={stagePeek ?? project.stage}
          onSelect={(s) => setStagePeek(s)}
          className="mb-1"
        />
        <p className="mb-6 px-1 text-[12.5px] leading-relaxed text-fg-muted">
          {PROJECT_STAGES.find((s) => s.key === (stagePeek ?? project.stage))!.hint}
        </p>
      </div>

      <div data-tour="tabs" className="mb-5">
        <Tabs value={tab} onChange={setTab} items={TABS} />
      </div>

      {/* ================= OVERVIEW ================= */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Order value"
              value={fmtCurrency(project.contractValue, project.currency, { compact: true })}
              sub={`${fmtCurrency(revenueIdr(project), 'IDR', { compact: true })} at ${fmtNumber(project.exchangeRate)}`}
              accent="primary"
              icon={<Boxes />}
            />
            <KpiCard
              label="Budget margin"
              value={approved ? fmtPercent(costing.budgetMarginPct, 1) : '—'}
              delta={approved ? `target ${costing.targetMarginPct}%` : 'not costed'}
              deltaTone={approved && costing.budgetMarginPct >= costing.targetMarginPct ? 'up' : 'down'}
              accent={approved && costing.budgetMarginPct >= costing.targetMarginPct ? 'success' : 'warning'}
              icon={<FileSpreadsheet />}
              onClick={() => setTab('budget')}
            />
            <KpiCard
              label="Committed to suppliers"
              value={fmtCurrency(costing.exposure, 'IDR', { compact: true })}
              sub={`${fmtCurrency(costing.actual, 'IDR', { compact: true })} already received`}
              accent={costing.overCommitted ? 'danger' : 'accent'}
              icon={<ShoppingCart />}
              onClick={() => setTab('procurement')}
            />
            <KpiCard
              label="Made"
              value={`${fmtNumber(produced)} / ${fmtNumber(ordered)}`}
              sub={`${fmtNumber(cbm, 1)} m³ · ${boxes.map((b) => `${b.count}×${b.size}`).join(' + ') || 'LCL'}`}
              accent="accent"
              icon={<Factory />}
              onClick={() => setTab('production')}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card>
              <CardHeader title="The order" description="What was agreed, and with whom." />
              <CardBody className="divide-y divide-border py-0">
                <MetaRow label="Buyer">{project.buyerName}</MetaRow>
                <MetaRow label="Segment">{buyer ? titleCase(buyer.segment) : '—'}</MetaRow>
                <MetaRow label="Enquiry received">{fmtDate(project.inquiryAt)}</MetaRow>
                <MetaRow label="Quoted">{project.quotedAt ? fmtDate(project.quotedAt) : 'not yet'}</MetaRow>
                <MetaRow label="Purchase order">{project.poNumber ?? 'not yet'}</MetaRow>
                <MetaRow label="Deposit">
                  {project.depositPct > 0 ? (
                    project.depositReceivedAt ? (
                      <span className="text-success">{project.depositPct}% received {fmtDate(project.depositReceivedAt)}</span>
                    ) : (
                      <span className="text-danger">{project.depositPct}% outstanding</span>
                    )
                  ) : (
                    'none — L/C or open account'
                  )}
                </MetaRow>
                <MetaRow label="Sales owner">{project.salesOwnerName}</MetaRow>
                <MetaRow label="Production owner">{project.productionOwnerName}</MetaRow>
                <MetaRow label="Exchange rate">{fmtNumber(project.exchangeRate)} IDR / {project.currency}</MetaRow>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                icon={<ShieldCheck />}
                title="Compliance"
                description="Read off the destination and what the pieces are made of — not a checklist somebody ticked."
              />
              <div className="divide-y divide-border">
                {project.compliance.map((c) => {
                  const spec = complianceSpec(c.key)
                  return (
                    <div key={c.key} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium text-fg">{spec.label}</p>
                          <p className="truncate text-[11.5px] text-fg-subtle">{spec.authority}</p>
                        </div>
                        <StatusBadge value={c.status} size="sm" />
                      </div>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-fg-muted">{spec.hint}</p>
                      {c.reference && (
                        <p className="tnum mt-1 text-[11.5px] text-fg-subtle">
                          {c.reference} · issued {fmtDate(c.obtainedAt)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader title="Material availability" description="What the remaining production still needs, against what is actually there." />
                <div className="scrollbar-thin max-h-[260px] divide-y divide-border overflow-y-auto">
                  {gaps.length === 0 && <EmptyState title="Nothing outstanding" description="Everything on this order has been made." />}
                  {gaps.slice(0, 10).map((g) => {
                    const item = store.items.find((i) => i.id === g.itemId)
                    if (!item) return null
                    return (
                      <div key={g.itemId} className="flex items-center gap-3 px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-medium text-fg">{item.name}</p>
                          <p className="tnum truncate text-[11.5px] text-fg-muted">
                            needs {fmtNumber(g.required, 2)} · available {fmtNumber(g.available, 2)} · on order {fmtNumber(g.onOrder, 2)} {uomLabel(item.uom)}
                          </p>
                        </div>
                        {g.covered ? (
                          <Badge size="sm" tone="success">covered</Badge>
                        ) : (
                          <Badge size="sm" tone="danger">short {fmtNumber(g.shortfall, 2)}</Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>

              <Card>
                <CardHeader title="Money" description="What has been invoiced to the buyer and billed by suppliers." />
                <CardBody className="divide-y divide-border py-0">
                  <MetaRow label="Invoiced to buyer">
                    {fmtCurrency(invoices.reduce((a, i) => a + i.amount, 0), project.currency, { compact: true })}
                  </MetaRow>
                  <MetaRow label="Received from buyer">
                    {fmtCurrency(invoices.reduce((a, i) => a + i.paidAmount, 0), project.currency, { compact: true })}
                  </MetaRow>
                  <MetaRow label="Billed by suppliers">
                    {fmtCurrency(bills.reduce((a, b) => a + b.subtotal, 0), 'IDR', { compact: true })}
                  </MetaRow>
                  <MetaRow label="Sample cost">
                    {fmtCurrency(samples.total, 'IDR', { compact: true })}
                    {samples.absorbed > 0 && (
                      <span className="ml-1 text-fg-subtle">({fmtCurrency(samples.absorbed, 'IDR', { compact: true })} absorbed)</span>
                    )}
                  </MetaRow>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ================= ORDER LINES ================= */}
      {tab === 'items' && (
        <Card>
          <CardHeader
            title="What was ordered"
            description="Dimensions in millimetres as the buyer reads them; volume per piece is what turns the order into a container count."
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[980px] text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                  <th className="px-5 py-2.5 font-medium">Model</th>
                  <th className="px-5 py-2.5 font-medium">Species & finish</th>
                  <th className="px-5 py-2.5 font-medium">Dimensions</th>
                  <th className="px-5 py-2.5 font-medium">Packing</th>
                  <th className="px-5 py-2.5 text-right font-medium">Qty</th>
                  <th className="px-5 py-2.5 text-right font-medium">m³ each</th>
                  <th className="px-5 py-2.5 text-right font-medium">Total m³</th>
                  <th className="px-5 py-2.5 text-right font-medium">Target</th>
                  <th className="px-5 py-2.5 text-right font-medium">Agreed</th>
                  <th className="px-5 py-2.5 text-right font-medium">Line value</th>
                  <th className="px-5 py-2.5 font-medium">Made</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {project.items.map((it) => (
                  <tr key={it.id} className="hover:bg-bg-muted/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-fg">{it.itemRef}</p>
                      <p className="text-[11.5px] text-fg-muted">{it.name}</p>
                    </td>
                    <td className="px-5 py-3 text-fg-muted">
                      {titleCase(it.species)}
                      <br />
                      <span className="text-[11.5px]">{it.finish}</span>
                    </td>
                    <td className="tnum px-5 py-3 text-fg-muted">
                      {it.lengthMm} × {it.widthMm} × {it.heightMm}
                    </td>
                    <td className="px-5 py-3">
                      <Badge size="sm" tone="neutral">{titleCase(it.packingType)}</Badge>
                    </td>
                    <td className="tnum px-5 py-3 text-right">{fmtNumber(it.qty)}</td>
                    <td className="tnum px-5 py-3 text-right text-fg-muted">{fmtNumber(it.cbmPerUnit, 2)}</td>
                    <td className="tnum px-5 py-3 text-right">{fmtNumber(it.qty * it.cbmPerUnit, 1)}</td>
                    <td className="tnum px-5 py-3 text-right text-fg-muted">
                      {fmtMoneyShort(it.targetUnitPrice, project.currency)}
                    </td>
                    <td className="tnum px-5 py-3 text-right font-medium">
                      {fmtMoneyShort(it.agreedUnitPrice, project.currency)}
                    </td>
                    <td className="tnum px-5 py-3 text-right font-semibold">
                      {fmtCurrency(it.qty * it.agreedUnitPrice, project.currency, { compact: true })}
                    </td>
                    <td className="px-5 py-3">
                      <Progress value={(it.producedQty / it.qty) * 100} className="w-[90px]" />
                      <span className="tnum text-[11px] text-fg-muted">
                        {fmtNumber(it.producedQty)} made · {fmtNumber(it.packedQty)} packed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-surface-sunken text-[12.5px] font-semibold">
                  <td className="px-5 py-3" colSpan={4}>
                    {project.items.length} lines
                  </td>
                  <td className="tnum px-5 py-3 text-right">{fmtNumber(ordered)}</td>
                  <td />
                  <td className="tnum px-5 py-3 text-right">{fmtNumber(cbm, 1)}</td>
                  <td colSpan={2} />
                  <td className="tnum px-5 py-3 text-right">
                    {fmtCurrency(project.contractValue, project.currency, { compact: true })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <CardBody className="border-t border-border">
            <p className="text-[12.5px] leading-relaxed text-fg-muted">
              {fmtNumber(cbm, 1)} m³ of finished goods. At the usable volume of a high cube that is{' '}
              <strong className="font-semibold text-fg">{boxes.map((b) => `${b.count} × ${b.size}`).join(' + ') || 'a groupage consignment'}</strong>.
              Furniture fills a box long before it gets heavy, so the volume — not the weight — is what the freight is
              priced on and what the packing method has to fight.
            </p>
          </CardBody>
        </Card>
      )}

      {/* ================= NEGOTIATION ================= */}
      {tab === 'negotiation' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader
              title={`${project.negotiations.length} rounds`}
              description="Everything that moved between the first enquiry and the order. Kept because the reason a price is what it is stops being obvious about four weeks later."
            />
            <div className="divide-y divide-border">
              {project.negotiations.map((n) => (
                <div key={n.id} className="flex gap-3 px-5 py-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        'grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
                        n.from === 'BUYER' ? 'bg-info-soft text-info-soft-fg' : 'bg-primary-soft text-primary-soft-fg',
                      )}
                    >
                      {n.round}
                    </span>
                    <span className="mt-1 w-px flex-1 bg-border" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge size="sm" tone={n.from === 'BUYER' ? 'info' : 'primary'}>
                        {n.from === 'BUYER' ? project.buyerName : n.byName}
                      </Badge>
                      <Badge size="sm" tone="neutral">{titleCase(n.subject)}</Badge>
                      <StatusBadge value={n.outcome} size="sm" />
                      <span className="text-[11.5px] text-fg-subtle">{fmtDateTime(n.at)}</span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-fg">{n.summary}</p>
                    {n.ourValue !== undefined && (
                      <p className="tnum mt-1.5 text-[12px] text-fg-muted">
                        Their number {fmtCurrency(n.buyerValue ?? 0, project.currency, { compact: true })} · ours{' '}
                        {fmtCurrency(n.ourValue, project.currency, { compact: true })} ·{' '}
                        <span className={cn((n.ourValue - (n.buyerValue ?? 0)) > 0 ? 'text-warning' : 'text-success')}>
                          gap {fmtCurrency(n.ourValue - (n.buyerValue ?? 0), project.currency, { compact: true })}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="self-start">
            <CardHeader title="How hard it was to win" />
            <CardBody className="divide-y divide-border py-0">
              <MetaRow label="Rounds">{project.negotiations.length}</MetaRow>
              <MetaRow label="Subjects argued">
                {Array.from(new Set(project.negotiations.map((n) => titleCase(n.subject)))).join(', ')}
              </MetaRow>
              <MetaRow label="Days from enquiry to order">
                {project.poAt
                  ? Math.round((new Date(project.poAt).getTime() - new Date(project.inquiryAt).getTime()) / 86_400_000)
                  : 'still open'}
              </MetaRow>
              <MetaRow label="Samples made">{project.samples.length}</MetaRow>
              <MetaRow label="Sample cost absorbed">{fmtCurrency(samples.absorbed, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Drawing revisions">
                {project.drawings.reduce((a, d) => a + (d.revision.charCodeAt(0) - 65), 0)}
              </MetaRow>
              {project.status === 'LOST' && (
                <>
                  <MetaRow label="Lost on">{titleCase(project.lossReason ?? 'unknown')}</MetaRow>
                  <MetaRow label="To">{project.competitor ?? '—'}</MetaRow>
                </>
              )}
            </CardBody>
            {project.lossNote && (
              <CardBody className="border-t border-border">
                <p className="text-[12.5px] leading-relaxed text-fg-muted">{project.lossNote}</p>
              </CardBody>
            )}
          </Card>
        </div>
      )}

      {/* ================= DRAWINGS & SAMPLES ================= */}
      {tab === 'design' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader
              icon={<PencilRuler />}
              title="Drawings"
              description="What went to the buyer and what came back marked up. A revision letter is a week of somebody's life."
            />
            <div className="divide-y divide-border">
              {project.drawings.length === 0 && <EmptyState title="No drawings issued yet" />}
              {project.drawings.map((d) => (
                <div key={d.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-fg">
                        {d.code} <span className="text-fg-subtle">rev {d.revision}</span>
                      </p>
                      <p className="truncate text-[12px] text-fg-muted">{d.title}</p>
                    </div>
                    <StatusBadge value={d.status} size="sm" />
                  </div>
                  <p className="tnum mt-1.5 text-[11.5px] text-fg-subtle">
                    {d.lengthMm} × {d.widthMm} × {d.heightMm} mm · {d.fileName}
                  </p>
                  <p className="mt-1 text-[11.5px] text-fg-muted">
                    Sent {fmtDate(d.sentAt)}
                    {d.respondedAt ? ` · answered ${fmtDate(d.respondedAt)}` : ' · no answer yet'}
                    {d.approvedAt ? ` · approved ${fmtDate(d.approvedAt)}` : ''}
                  </p>
                  {d.note && <p className="mt-1.5 text-[12px] leading-relaxed text-warning-soft-fg">{d.note}</p>}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={<Package />}
              title="Samples"
              description={`${samples.count} made, ${fmtCurrency(samples.total, 'IDR', { compact: true })} spent, ${fmtCurrency(samples.absorbed, 'IDR', { compact: true })} of it never recovered.`}
            />
            <div className="divide-y divide-border">
              {project.samples.length === 0 && <EmptyState title="No samples on this order" description="Either a repeat model, or the buyer approved from photographs." />}
              {project.samples.map((s) => (
                <div key={s.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-fg">
                        {s.code} <span className="text-fg-subtle">round {s.round}</span>
                      </p>
                      <p className="truncate text-[12px] text-fg-muted">{s.itemRef}</p>
                    </div>
                    <StatusBadge value={s.status} size="sm" />
                  </div>
                  <p className="tnum mt-1.5 text-[11.5px] text-fg-subtle">
                    {fmtCurrency(s.costIdr, 'IDR', { compact: true })} ·{' '}
                    {s.chargedToBuyer ? 'charged to the buyer' : 'absorbed by us'}
                    {s.awb ? ` · ${s.courier} ${s.awb}` : ''}
                  </p>
                  <p className="mt-1 text-[11.5px] text-fg-muted">
                    Requested {fmtDate(s.requestedAt)}
                    {s.sentAt ? ` · sent ${fmtDate(s.sentAt)}` : ''}
                    {s.decidedAt ? ` · decided ${fmtDate(s.decidedAt)}` : ' · no decision yet'}
                  </p>
                  {s.feedback && (
                    <p className="mt-1.5 border-l-2 border-border-strong pl-2.5 text-[12px] leading-relaxed text-fg-muted">
                      “{s.feedback}”
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ================= BUDGET ================= */}
      {tab === 'budget' && (
        <BudgetPanel projectId={project.id} />
      )}

      {/* ================= PROCUREMENT ================= */}
      {tab === 'procurement' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Orders placed" value={String(orders.length)} sub={`${orders.filter((o) => o.status === 'PARTIALLY_RECEIVED').length} part delivered`} accent="primary" />
            <KpiCard label="Committed" value={fmtCurrency(costing.committed, 'IDR', { compact: true })} sub="ordered, not yet delivered" accent="warning" />
            <KpiCard label="Received" value={fmtCurrency(costing.actual, 'IDR', { compact: true })} sub={`${receipts.length} deliveries`} accent="success" />
            <KpiCard
              label="Against budget"
              value={approved ? fmtCurrency(costing.remaining, 'IDR', { compact: true }) : '—'}
              sub={costing.overCommitted ? 'over budget' : 'still available'}
              accent={costing.overCommitted ? 'danger' : 'accent'}
            />
          </div>

          <Card>
            <CardHeader title="Purchase orders" description="Placed against this order's budget lines." />
            <div className="divide-y divide-border">
              {orders.length === 0 && <EmptyState title="Nothing ordered yet" description="No purchase order has been raised against this job." />}
              {orders.map((o) => {
                const p = orderProgress(o, store.receipts)
                return (
                  <Link key={o.id} to={`/purchase-orders/${o.id}`} className="block px-5 py-3.5 transition-colors hover:bg-bg-muted/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-fg">
                          {o.code} <span className="text-fg-muted">· {o.supplierName}</span>
                        </p>
                        <p className="tnum truncate text-[11.5px] text-fg-muted">
                          {o.lines.length} lines · expected {fmtDate(o.expectedAt)} · {p.deliveries} deliver{p.deliveries === 1 ? 'y' : 'ies'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge value={o.status} size="sm" />
                        {p.overdue && <Badge size="sm" tone="danger">{p.daysLate}d late</Badge>}
                        <UtilisationBar pct={p.receivedPct} className="w-24" label={`${p.receivedPct.toFixed(0)}% in`} />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Deliveries"
              description="Full, partial, or direct. The order's open balance is the sum of these, never a number typed on the order."
            />
            <div className="divide-y divide-border">
              {receipts.length === 0 && <EmptyState title="Nothing has arrived yet" />}
              {receipts.map((g) => (
                <Link key={g.id} to={`/receipts/${g.id}`} className="block px-5 py-3.5 transition-colors hover:bg-bg-muted/60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-fg">
                        {g.code} <span className="text-fg-muted">· {g.supplierName}</span>
                      </p>
                      <p className="truncate text-[11.5px] text-fg-muted">
                        {fmtDate(g.receivedAt)} · delivery note {g.deliveryNoteNo}
                        {g.deliveredToName ? ` · ${g.deliveredToName}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge size="sm" tone={g.mode === 'FULL' ? 'success' : g.mode === 'DIRECT' ? 'purple' : 'warning'}>
                        {titleCase(g.mode)} #{g.sequence}
                      </Badge>
                      <StatusBadge value={g.qcResult} size="sm" />
                    </div>
                  </div>
                  {g.note && <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">{g.note}</p>}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ================= PRODUCTION ================= */}
      {tab === 'production' && (
        <Card>
          <CardHeader
            title="Work orders"
            description="One per model, split when the run is bigger than a bench can hold. This is what consumes material and produces finished goods."
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[880px] text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                  <th className="px-5 py-2.5 font-medium">Work order</th>
                  <th className="px-5 py-2.5 font-medium">Model</th>
                  <th className="px-5 py-2.5 font-medium">Workshop</th>
                  <th className="px-5 py-2.5 font-medium">Stage</th>
                  <th className="px-5 py-2.5 text-right font-medium">Qty</th>
                  <th className="px-5 py-2.5 font-medium">Progress</th>
                  <th className="px-5 py-2.5 font-medium">Due</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {workOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-fg-muted">
                      Nothing released to the floor yet.
                    </td>
                  </tr>
                )}
                {workOrders.map((w) => (
                  <tr key={w.id} className="hover:bg-bg-muted/50">
                    <td className="px-5 py-3 font-medium text-fg">{w.code}</td>
                    <td className="px-5 py-3 text-fg-muted">{w.itemRef}</td>
                    <td className="px-5 py-3 text-fg-muted">{w.workshop}</td>
                    <td className="px-5 py-3"><StatusBadge value={w.stage} size="sm" /></td>
                    <td className="tnum px-5 py-3 text-right">{fmtNumber(w.qty)}</td>
                    <td className="px-5 py-3">
                      <Progress value={(w.producedQty / w.qty) * 100} className="w-[110px]" />
                      <span className="tnum text-[11px] text-fg-muted">
                        {fmtNumber(w.producedQty)} made{w.rejectQty ? ` · ${w.rejectQty} rejected` : ''}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-fg-muted">
                      {fmtDate(w.dueAt, 'short')}
                      <span className="block text-[11px] text-fg-subtle">{relativeLabel(w.dueAt)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge value={w.status} size="sm" />
                      {w.holdReason && (
                        <p className="mt-1 max-w-[220px] text-[11.5px] leading-relaxed text-warning-soft-fg">{w.holdReason}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ================= SHIPMENT ================= */}
      {tab === 'shipment' && (
        <div className="space-y-5">
          {!shipment && (
            <EmptyState
              title="No shipment planned yet"
              description="A shipment record appears once the order reaches QC and packing — that is when the container plan and the document set become real."
            />
          )}
          {shipment && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Shipment" value={shipment.code} sub={`${shipment.polName} → ${shipment.podName}`} accent="primary" icon={<Container />} />
                <KpiCard label="Status" value={titleCase(shipment.status)} sub={shipment.vesselName ? `${shipment.vesselName} ${shipment.voyageNo}` : 'no vessel booked'} accent="accent" />
                <KpiCard label="ETD" value={fmtDate(shipment.etd)} sub={relativeLabel(shipment.etd)} accent="warning" />
                <KpiCard
                  label="Documents issued"
                  value={`${shipment.documents.filter((d) => d.status === 'ISSUED').length} / ${shipment.documents.length}`}
                  sub={`${shipment.documents.filter((d) => d.mandatory && d.status !== 'ISSUED').length} mandatory outstanding`}
                  accent={shipment.documents.some((d) => d.mandatory && d.status !== 'ISSUED') ? 'danger' : 'success'}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Card>
                  <CardHeader title="Containers" description="Volume loaded against the usable volume of the box." />
                  <div className="divide-y divide-border">
                    {shipment.containers.map((c) => {
                      const usable = { LCL: 1, '20GP': 28, '40GP': 58, '40HC': 66 }[c.size]
                      return (
                        <div key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-fg">
                              {c.containerNo ?? <span className="text-fg-subtle">number not allocated</span>}{' '}
                              <Badge size="sm" tone="neutral">{c.size}</Badge>
                            </p>
                            <p className="tnum truncate text-[11.5px] text-fg-muted">
                              {fmtNumber(c.loadedCbm, 1)} m³ · {fmtNumber(c.loadedWeightKg)} kg · {c.packages} packages
                              {c.sealNo ? ` · seal ${c.sealNo}` : ''}
                            </p>
                          </div>
                          <UtilisationBar pct={(c.loadedCbm / usable) * 100} lowIsBad className="w-24 shrink-0" />
                        </div>
                      )
                    })}
                  </div>
                </Card>

                <Card>
                  <CardHeader
                    title="Export document set"
                    description="Derived from the order's compliance requirements. The export declaration quotes the V-Legal number, so it cannot be filed first."
                  />
                  <div className="divide-y divide-border">
                    {shipment.documents.map((d) => (
                      <div key={d.id} className="px-5 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[12.5px] font-medium text-fg">
                              {exportDocLabel(d.type)}
                              {d.mandatory && <span className="ml-1.5 text-[11px] font-normal text-danger">required</span>}
                            </p>
                            <p className="truncate text-[11.5px] text-fg-subtle">{d.issuer}</p>
                          </div>
                          <StatusBadge value={d.status} size="sm" />
                        </div>
                        {d.reference && (
                          <p className="tnum mt-1 text-[11.5px] text-fg-muted">
                            {d.reference} · issued {fmtDate(d.issuedAt)}
                          </p>
                        )}
                        <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">{d.note}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------- helpers ---------------- */

function MetaChip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="text-[12.5px] text-fg-muted">
      <span className="text-fg-subtle">{label}:</span> <span className="font-medium text-fg">{children}</span>
    </span>
  )
}

function fmtMoneyShort(value: number, currency: string) {
  return `${currency} ${new Intl.NumberFormat('en-US', { maximumFractionDigits: currency === 'JPY' || currency === 'IDR' ? 0 : 2 }).format(value)}`
}

/** The budget panel, shared with the budgets page. */
export function BudgetPanel({ projectId }: { projectId: string }) {
  const store = useErp()
  const project = store.projects.find((p) => p.id === projectId)!
  const versions = store.budgets.filter((b) => b.projectId === projectId).sort((a, b) => b.version - a.version)
  const [versionId, setVersionId] = React.useState(versions[0]?.id)
  const budget = versions.find((b) => b.id === versionId) ?? versions[0]
  const orders = store.orders.filter((o) => o.projectId === projectId)

  if (!budget) {
    return (
      <EmptyState
        title="This order has not been costed"
        description="Until an estimator builds the anggaran belanja and management approves it, nothing should be ordered against the job."
      />
    )
  }

  const costing = projectCosting(project, budget, orders, (itemId) => {
    const item = store.items.find((i) => i.id === itemId)
    const map: Record<string, string> = {
      TIMBER: 'TIMBER', PANEL: 'PANEL', HARDWARE: 'HARDWARE', FINISHING: 'FINISHING',
      UPHOLSTERY: 'UPHOLSTERY', PACKAGING: 'PACKAGING', COMPONENT: 'SUBCON',
    }
    return (item ? map[item.category] ?? 'OVERHEAD' : 'OVERHEAD') as never
  })
  const fob = fobSheet(project, budget)
  const total = budget.lines.reduce((a, l) => a + lineBudget(l), 0)

  const byCategory = COST_CATEGORIES.map((c) => ({
    category: c,
    lines: budget.lines.filter((l) => l.category === c.value),
  })).filter((g) => g.lines.length > 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => setVersionId(v.id)}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
                v.id === budget.id ? 'border-primary bg-primary-soft text-primary-soft-fg' : 'border-border text-fg-muted hover:text-fg',
              )}
            >
              {v.code} · v{v.version} <StatusBadge value={v.status} size="sm" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {budget.status === 'DRAFT' && (
            <Button size="sm" onClick={() => store.submitBudget(budget.id)}>Submit for approval</Button>
          )}
          {budget.status === 'SUBMITTED' && (
            <>
              <Button size="sm" variant="primary" onClick={() => store.approveBudget(budget.id)}>Approve</Button>
              <Button size="sm" variant="outlineDanger" onClick={() => store.rejectBudget(budget.id, 'Margin below the target and the buyer will not move.')}>
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {budget.note && (
        <p className="rounded-lg border border-border bg-surface-sunken px-3.5 py-2.5 text-[12.5px] leading-relaxed text-fg-muted">
          {budget.note}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Budgeted cost" value={fmtCurrency(total, 'IDR', { compact: true })} sub={`${budget.lines.length} lines`} accent="primary" />
        <KpiCard label="Order revenue" value={fmtCurrency(revenueIdr(project), 'IDR', { compact: true })} sub={fmtCurrency(project.contractValue, project.currency, { compact: true })} accent="accent" />
        <KpiCard
          label="Budget margin"
          value={fmtPercent(costing.budgetMarginPct, 1)}
          delta={`target ${budget.targetMarginPct}%`}
          deltaTone={costing.budgetMarginPct >= budget.targetMarginPct ? 'up' : 'down'}
          accent={costing.budgetMarginPct >= budget.targetMarginPct ? 'success' : 'warning'}
        />
        <KpiCard label="Cost per m³" value={fmtCurrency(fob.costPerCbm, 'IDR', { compact: true })} sub={`${fmtNumber(fob.cbm, 1)} m³ shipped`} accent="accent" />
        <KpiCard label="Cost per piece" value={fmtCurrency(fob.costPerPiece, 'IDR', { compact: true })} sub={`${fmtNumber(fob.pieces)} pieces`} accent="accent" />
      </div>

      <Card>
        <CardHeader
          title="Budget against reality"
          description="Committed is ordered and not yet delivered. Actual is delivered, whether or not the supplier has invoiced — that is the moment the cost becomes ours."
        />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[760px] text-[12.5px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                <th className="px-5 py-2.5 font-medium">Category</th>
                <th className="px-5 py-2.5 text-right font-medium">Budget</th>
                <th className="px-5 py-2.5 text-right font-medium">Committed</th>
                <th className="px-5 py-2.5 text-right font-medium">Received</th>
                <th className="px-5 py-2.5 text-right font-medium">Variance</th>
                <th className="px-5 py-2.5 font-medium">Consumed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {costing.rows.map((r) => {
                const spent = r.actual + r.committed
                return (
                  <tr key={r.category} className="hover:bg-bg-muted/50">
                    <td className="px-5 py-3 font-medium text-fg">{r.label}</td>
                    <td className="tnum px-5 py-3 text-right">{fmtCurrency(r.budget, 'IDR', { compact: true })}</td>
                    <td className="tnum px-5 py-3 text-right text-warning-soft-fg">{r.committed ? fmtCurrency(r.committed, 'IDR', { compact: true }) : '—'}</td>
                    <td className="tnum px-5 py-3 text-right text-accent-soft-fg">{r.actual ? fmtCurrency(r.actual, 'IDR', { compact: true }) : '—'}</td>
                    <td className={cn('tnum px-5 py-3 text-right font-medium', r.variance < 0 ? 'text-danger' : 'text-fg')}>
                      {r.budget ? fmtCurrency(r.variance, 'IDR', { compact: true }) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {r.budget ? <UtilisationBar pct={(spent / r.budget) * 100} className="w-24" /> : <span className="text-fg-subtle">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-surface-sunken font-semibold">
                <td className="px-5 py-3">Total</td>
                <td className="tnum px-5 py-3 text-right">{fmtCurrency(total, 'IDR', { compact: true })}</td>
                <td className="tnum px-5 py-3 text-right">{fmtCurrency(costing.committed, 'IDR', { compact: true })}</td>
                <td className="tnum px-5 py-3 text-right">{fmtCurrency(costing.actual, 'IDR', { compact: true })}</td>
                <td className={cn('tnum px-5 py-3 text-right', costing.overCommitted && 'text-danger')}>
                  {fmtCurrency(costing.remaining, 'IDR', { compact: true })}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="The lines"
          description="Exploded from the bill of materials for the models on the order, priced at standard cost and grossed up for the wastage the estimator expects to lose."
        />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[900px] text-[12.5px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                <th className="px-5 py-2.5 font-medium">Description</th>
                <th className="px-5 py-2.5 text-right font-medium">Qty</th>
                <th className="px-5 py-2.5 font-medium">Unit</th>
                <th className="px-5 py-2.5 text-right font-medium">Unit cost</th>
                <th className="px-5 py-2.5 text-right font-medium">Wastage</th>
                <th className="px-5 py-2.5 text-right font-medium">Budget</th>
                <th className="px-5 py-2.5 font-medium">Supplier</th>
              </tr>
            </thead>
            <tbody>
              {byCategory.map((group) => (
                <React.Fragment key={group.category.value}>
                  <tr className="border-y border-border bg-surface-sunken">
                    <td colSpan={7} className="px-5 py-2.5">
                      <span className="text-[12px] font-semibold text-fg">{group.category.label}</span>
                      <span className="ml-2 text-[11.5px] text-fg-muted">{group.category.hint}</span>
                    </td>
                  </tr>
                  {group.lines.map((l) => (
                    <tr key={l.id} className="border-b border-border hover:bg-bg-muted/50">
                      <td className="px-5 py-2.5 text-fg">
                        {l.description}
                        {l.note && <p className="text-[11.5px] text-fg-muted">{l.note}</p>}
                      </td>
                      <td className="tnum px-5 py-2.5 text-right">{fmtNumber(l.qty, l.qty < 10 ? 2 : 0)}</td>
                      <td className="px-5 py-2.5 text-fg-muted">{uomLabel(l.uom)}</td>
                      <td className="tnum px-5 py-2.5 text-right">{fmtCurrency(l.unitCost, 'IDR', { compact: true })}</td>
                      <td className="tnum px-5 py-2.5 text-right text-fg-muted">{l.wastagePct ? `${l.wastagePct}%` : '—'}</td>
                      <td className="tnum px-5 py-2.5 text-right font-medium">{fmtCurrency(lineBudget(l), 'IDR', { compact: true })}</td>
                      <td className="px-5 py-2.5 text-fg-muted">
                        {store.suppliers.find((s) => s.id === l.supplierId)?.name ?? '—'}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <CardBody className="border-t border-border">
          <p className="text-[12.5px] leading-relaxed text-fg-muted">
            Prepared by {budget.preparedByName} on {fmtDate(budget.preparedAt)}
            {budget.approvedByName ? `, approved by ${budget.approvedByName} on ${fmtDate(budget.approvedAt)}` : ', not yet approved'}.
            The wastage percentages are not padding: eighteen per cent on timber is what actually disappears between a
            sawn board and a finished component, and an estimator who leaves it out loses the margin twice.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}

export { costCategoryLabel }
