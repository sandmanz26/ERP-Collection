import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, Banknote, CalendarClock, Container as ContainerIcon, FileSignature, Gauge,
  Radio, Ship, TrendingUp, Trophy, Wallet, Warehouse, Anchor, FileStack, PackageCheck, ShieldAlert,
  Repeat,
} from 'lucide-react'
import { useErp } from '@/store/useErp'
import { countryFlag } from '@/data/reference'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState, Progress } from '@/components/ui/misc'
import { StageChip } from '@/components/shared/StageChip'
import { buildExceptions, jobFinancials, pipelineByStage, trialBalance, incomeStatement, arAging, type Exception } from '@/lib/analytics'
import { buildPhase2Exceptions, milestoneHealth, pipelineSummary, warehouseSummary } from '@/lib/analytics2'
import { buildPhase3Exceptions, incidentExposure } from '@/lib/services'
import { buildStuffingExceptions, stuffingMetrics } from '@/lib/stuffing'
import { itemCbm, itemGrossKg, utilisation } from '@/lib/shipping'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent, pluralDays, relativeDays } from '@/lib/format'
import { cn } from '@/lib/utils'

export function DashboardPage() {
  const nav = useNavigate()
  const store = useErp()
  const { projects, containers, documents, charges, customers, invoices, accounts, journal } = store
  const { quotations, partners, milestones, receipts, filings, settings } = store
  const { jobServices, services, incidents, company, stuffingJobs } = store
  const [sev, setSev] = React.useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL')

  const exceptions = React.useMemo(() => {
    const core = buildExceptions({ projects, containers, documents, charges, customers, invoices })
    const extra = buildPhase2Exceptions({ quotations, partners, milestones, receipts, filings, projects, settings })
    const phase3 = buildPhase3Exceptions({ projects, containers, documents, jobServices, services, incidents, company })
    const yard = buildStuffingExceptions({ projects, charges, stuffingJobs })
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 } as const
    return [...core, ...extra, ...phase3, ...yard].sort((a, b) => order[a.severity] - order[b.severity])
  }, [projects, containers, documents, charges, customers, invoices, quotations, partners, milestones, receipts, filings, settings, jobServices, services, incidents, company, stuffingJobs])

  const quotePipeline = pipelineSummary(quotations)
  const tracking = milestoneHealth(milestones)
  const warehouse = warehouseSummary(receipts)
  const claims = incidentExposure(incidents)
  const yard = stuffingMetrics(stuffingJobs)
  const filteredExceptions = sev === 'ALL' ? exceptions : exceptions.filter((e) => e.severity === sev)

  const activeJobs = projects.filter((p) => p.status === 'ACTIVE')
  const pipeline = pipelineByStage(projects)
  const pipelineMax = Math.max(...pipeline.map((p) => p.count), 1)
  const fin = jobFinancials(charges)
  const pl = incomeStatement(trialBalance(accounts, journal))
  const aging = arAging(invoices)
  const overdueAr = aging.filter((b) => b.label !== 'Current').reduce((a, b) => a + b.amount, 0)

  const sailing = activeJobs
    .filter((p) => p.etd && !p.atd)
    .sort((a, b) => (a.etd ?? '').localeCompare(b.etd ?? ''))
    .slice(0, 6)

  const upcomingCutoffs = activeJobs
    .flatMap((p) =>
      [
        { label: 'SI', iso: p.siCutoff },
        { label: 'VGM', iso: p.vgmCutoff },
        { label: 'Gate-in', iso: p.gateInCutoff },
      ]
        .filter((c) => c.iso && relativeDays(c.iso)! >= -1 && relativeDays(c.iso)! <= 7)
        .map((c) => ({ ...c, project: p })),
    )
    .sort((a, b) => (a.iso ?? '').localeCompare(b.iso ?? ''))
    .slice(0, 7)

  const teu = containers.reduce((a, c) => a + (c.type.startsWith('40') || c.type.startsWith('45') ? 2 : c.type === 'LCL' ? 0 : 1), 0)
  const totalCbm = containers.reduce((a, c) => a + c.items.reduce((s, i) => s + itemCbm(i), 0), 0)
  const totalKg = containers.reduce((a, c) => a + c.items.reduce((s, i) => s + itemGrossKg(i), 0), 0)
  const poorlyUsed = containers.filter((c) => {
    const u = utilisation(c.type, c.items, c.tareKg)
    return c.type !== 'LCL' && (u.status === 'LIGHT' || u.status === 'OVERLOADED')
  })

  const consignmentJobs = projects.filter((p) => p.consignment)
  const consignmentUnsold = consignmentJobs.reduce(
    (a, p) => a + (p.consignment!.totalUnitsShipped - p.consignment!.reportedUnitsSold),
    0,
  )

  const critical = exceptions.filter((e) => e.severity === 'CRITICAL').length

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <Badge tone="primary" size="sm" dot>Live</Badge>
            <span className="text-[12px] text-fg-muted">{fmtDate(new Date().toISOString(), 'long')}</span>
          </>
        }
        title="Control Tower"
        description="What needs a decision today, ranked by what it costs to ignore. Everything here is derived from the jobs, containers, documents and charges in the system — not typed in by hand."
        actions={
          <>
            <Button variant="secondary" onClick={() => nav('/projects')}>
              <Ship /> All jobs
            </Button>
            <Button variant="primary" onClick={() => nav('/projects')}>
              <Gauge /> Open the job board <ArrowRight />
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open exceptions"
          value={exceptions.length}
          icon={<AlertTriangle />}
          accent={critical ? 'danger' : exceptions.length ? 'warning' : 'success'}
          sub={`${critical} critical · ${exceptions.filter((e) => e.severity === 'HIGH').length} high`}
        />
        <KpiCard
          label="Active jobs"
          value={activeJobs.length}
          icon={<Ship />}
          accent="primary"
          sub={`${teu} TEU · ${fmtNumber(totalCbm, 0)} m³ under management`}
          onClick={() => nav('/projects')}
        />
        <KpiCard
          label="Gross margin"
          value={fmtCurrency(fin.margin, 'IDR', { compact: true })}
          icon={<TrendingUp />}
          accent={fin.marginPct >= 20 ? 'success' : 'warning'}
          sub={`${fmtPercent(fin.marginPct)} on ${fmtCurrency(fin.revenue, 'IDR', { compact: true })} revenue`}
          onClick={() => nav('/finance/profitability')}
        />
        <KpiCard
          label="Overdue receivables"
          value={fmtCurrency(overdueAr, 'IDR', { compact: true })}
          icon={<Wallet />}
          accent={overdueAr > 0 ? 'danger' : 'success'}
          sub={`${invoices.filter((i) => i.status === 'OVERDUE').length} invoices past due`}
          onClick={() => nav('/finance/invoices')}
        />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open quotations"
          value={fmtCurrency(quotePipeline.openValue, 'IDR', { compact: true })}
          icon={<FileSignature />}
          accent="accent"
          sub={`${quotePipeline.openCount} live · ${fmtCurrency(quotePipeline.weightedValue, 'IDR', { compact: true })} weighted`}
          onClick={() => nav('/quotations')}
        />
        <KpiCard
          label="Win rate"
          value={fmtPercent(quotePipeline.winRatePct, 0)}
          icon={<Trophy />}
          accent={quotePipeline.winRatePct >= 35 ? 'success' : 'warning'}
          sub={`${quotePipeline.won.length} won of ${quotePipeline.decided.length} decided`}
          onClick={() => nav('/quotations')}
        />
        <KpiCard
          label="Milestone punctuality"
          value={fmtPercent(tracking.onTimePct, 0)}
          icon={<Radio />}
          accent={tracking.onTimePct >= 90 ? 'success' : tracking.onTimePct >= 75 ? 'warning' : 'danger'}
          sub={`${tracking.recorded} events recorded · avg slip ${tracking.avgSlipDays.toFixed(1)} d`}
          onClick={() => nav('/tracking')}
        />
        <KpiCard
          label="Cargo in store"
          value={`${fmtNumber(warehouse.cbmOnHand, 1)} m³`}
          icon={<Warehouse />}
          accent={warehouse.aged ? 'warning' : 'primary'}
          sub={`${warehouse.openCount} receipts · ${fmtCurrency(warehouse.storageAccrued, 'IDR', { compact: true })} storage accrued`}
          onClick={() => nav('/warehouse')}
        />
        <KpiCard
          label="Stuffing this week"
          value={yard.thisWeek}
          icon={<PackageCheck />}
          accent={yard.atRisk ? 'danger' : 'primary'}
          sub={
            yard.atRisk
              ? `${yard.atRisk} at risk against the gate-in cut-off`
              : `${yard.today} today · every slot clears its cut-off`
          }
          onClick={() => nav('/stuffing')}
        />
        <KpiCard
          label="Open claims"
          value={claims.open}
          icon={<ShieldAlert />}
          accent={claims.critical ? 'danger' : claims.open ? 'warning' : 'success'}
          sub={`${fmtCurrency(claims.outstanding, 'IDR', { compact: true })} outstanding · ${claims.recoveryRatePct.toFixed(0)}% recovered to date`}
          onClick={() => nav('/incidents')}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              icon={<AlertTriangle />}
              title="Exception queue"
              description="Ranked by what it costs to ignore: missed cut-offs and rejected documents first, then margin and credit."
              actions={
                <Tabs
                  variant="pill"
                  value={sev}
                  onChange={setSev}
                  items={[
                    { value: 'ALL', label: 'All', count: exceptions.length },
                    { value: 'CRITICAL', label: 'Critical', count: exceptions.filter((e) => e.severity === 'CRITICAL').length },
                    { value: 'HIGH', label: 'High', count: exceptions.filter((e) => e.severity === 'HIGH').length },
                  ]}
                />
              }
            />
            {filteredExceptions.length === 0 ? (
              <EmptyState icon={<ShieldAlert />} title="Nothing needs attention" description="Every job is inside its cut-offs with complete documents and healthy margin." />
            ) : (
              <div className="scrollbar-thin max-h-[520px] divide-y divide-border overflow-y-auto">
                {filteredExceptions.map((e) => (
                  <ExceptionRow key={e.id} exception={e} />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader icon={<Gauge />} title="Pipeline by stage" description="Where the book is sitting right now, and how much revenue is behind each stage." />
            <CardBody className="space-y-2.5">
              {pipeline.map((p) => (
                <button
                  key={p.stage.key}
                  onClick={() => nav('/projects')}
                  className="group flex w-full items-center gap-3 text-left"
                >
                  <span className="w-[104px] shrink-0 truncate text-[12.5px] text-fg-muted group-hover:text-fg">{p.stage.short}</span>
                  <span className="relative h-6 flex-1 overflow-hidden rounded-md bg-surface-sunken">
                    <span
                      className="absolute inset-y-0 left-0 rounded-md bg-primary/85 transition-[width] duration-500"
                      style={{ width: `${(p.count / pipelineMax) * 100}%` }}
                    />
                    <span className="absolute inset-y-0 left-2 flex items-center text-[11.5px] font-semibold text-primary-fg mix-blend-luminosity">
                      {p.count > 0 && p.count}
                    </span>
                  </span>
                  <span className="tnum w-[86px] shrink-0 text-right text-[12px] text-fg-muted">
                    {p.value ? fmtCurrency(p.value, 'IDR', { compact: true }) : '—'}
                  </span>
                </button>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader icon={<CalendarClock />} title="Cut-offs in the next 7 days" description="Miss one and the box rolls to the next sailing." />
            {upcomingCutoffs.length === 0 ? (
              <EmptyState icon={<CalendarClock />} title="No cut-offs this week" description="Nothing closes in the next seven days." />
            ) : (
              <div className="divide-y divide-border">
                {upcomingCutoffs.map((c, i) => {
                  const d = relativeDays(c.iso)!
                  return (
                    <Link
                      key={i}
                      to={`/projects/${c.project.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg-muted/60"
                    >
                      <span
                        className={cn(
                          'grid w-11 shrink-0 place-items-center rounded-md py-1 text-[11px] font-semibold',
                          d < 0 ? 'bg-danger-soft text-danger-soft-fg' : d <= 1 ? 'bg-warning-soft text-warning-soft-fg' : 'bg-neutral-soft text-neutral-soft-fg',
                        )}
                      >
                        {d < 0 ? 'late' : d === 0 ? 'today' : `${d}d`}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-fg">
                          {c.label} cut-off · {c.project.code}
                        </span>
                        <span className="block truncate text-[11.5px] text-fg-muted">{c.project.name}</span>
                      </span>
                      <StageChip stage={c.project.stage} />
                    </Link>
                  )
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader icon={<Anchor />} title="Next sailings" description="Jobs with a confirmed ETD that have not departed." />
            {sailing.length === 0 ? (
              <EmptyState icon={<Ship />} title="No sailings scheduled" />
            ) : (
              <div className="divide-y divide-border">
                {sailing.map((p) => (
                  <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg-muted/60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-fg">{p.name}</p>
                      <p className="flex items-center gap-1 truncate text-[11.5px] text-fg-muted">
                        🇮🇩 {p.polName} <ArrowRight className="size-3" /> {countryFlag(p.destCountry)} {p.podName}
                        {p.vessel && <span className="ml-1 text-fg-subtle">· {p.vessel}</span>}
                      </p>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="tnum block text-[12px] font-medium text-fg">{fmtDate(p.etd)}</span>
                      <span className="block text-[11px] text-fg-muted">
                        {relativeDays(p.etd)! > 0 ? `in ${pluralDays(relativeDays(p.etd)!)}` : relativeDays(p.etd) === 0 ? 'today' : 'overdue'}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader icon={<ContainerIcon />} title="Capacity & equipment" />
            <CardBody className="space-y-3">
              <Row label="Units under management" value={`${containers.length} (${teu} TEU)`} />
              <Row label="Volume planned" value={`${fmtNumber(totalCbm, 1)} m³`} />
              <Row label="Gross weight" value={`${fmtNumber(totalKg / 1000, 1)} tonnes`} />
              <Row label="Units needing a re-plan" value={`${poorlyUsed.length}`} tone={poorlyUsed.length ? 'warning' : 'success'} />
              <div className="pt-1">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[11.5px] text-fg-muted">VGM submitted</span>
                  <span className="tnum text-[11.5px] font-medium text-fg">
                    {containers.filter((c) => c.vgmSubmittedAt).length}/{containers.filter((c) => c.type !== 'LCL').length}
                  </span>
                </div>
                <Progress
                  value={
                    (containers.filter((c) => c.vgmSubmittedAt).length /
                      Math.max(1, containers.filter((c) => c.type !== 'LCL').length)) *
                    100
                  }
                  tone="accent"
                />
              </div>
            </CardBody>
          </Card>

          {consignmentJobs.length > 0 && (
            <Card className="border-purple/25">
              <CardHeader icon={<Repeat />} title="Consignment programme" description="Stock sitting at destination that the shipper still owns." className="bg-purple-soft/30" />
              <CardBody className="space-y-3">
                <Row label="Active consignment jobs" value={`${consignmentJobs.length}`} />
                <Row label="Units unsold at destination" value={fmtNumber(consignmentUnsold)} tone={consignmentUnsold > 500 ? 'warning' : undefined} />
                <Row
                  label="Settled to date"
                  value={fmtCurrency(consignmentJobs.reduce((a, p) => a + p.consignment!.settledAmount, 0), consignmentJobs[0].consignment!.currency, { compact: true })}
                />
                {consignmentJobs.map((p) => {
                  const c = p.consignment!
                  const pct = (c.reportedUnitsSold / Math.max(1, c.totalUnitsShipped)) * 100
                  return (
                    <Link key={p.id} to={`/projects/${p.id}`} className="block rounded-lg border border-border bg-surface-sunken px-3 py-2 transition-colors hover:border-border-strong">
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="truncate text-[12px] font-medium text-fg">{p.code}</span>
                        <span className="tnum text-[11.5px] text-fg-muted">
                          {c.reportedUnitsSold}/{c.totalUnitsShipped} sold
                        </span>
                      </div>
                      <Progress value={pct} tone="accent" size="sm" />
                    </Link>
                  )
                })}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader icon={<Banknote />} title="Company P&L snapshot" description="From the posted journal." />
            <CardBody className="space-y-3">
              <Row label="Revenue" value={fmtCurrency(pl.totalRevenue, 'IDR', { compact: true })} />
              <Row label="Cost of service" value={fmtCurrency(pl.totalCogs, 'IDR', { compact: true })} />
              <Row label="Gross profit" value={`${fmtCurrency(pl.grossProfit, 'IDR', { compact: true })} · ${fmtPercent(pl.grossMarginPct)}`} tone="success" />
              <Row label="Operating expense" value={fmtCurrency(pl.totalExpense, 'IDR', { compact: true })} />
              <Row
                label="Operating profit"
                value={`${fmtCurrency(pl.operatingProfit, 'IDR', { compact: true })} · ${fmtPercent(pl.netMarginPct)}`}
                tone={pl.operatingProfit >= 0 ? 'success' : 'danger'}
                strong
              />
              <Button variant="secondary" size="sm" className="w-full" onClick={() => nav('/finance/reports')}>
                <FileStack /> Open the full reports
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}

function ExceptionRow({ exception }: { exception: Exception }) {
  const tone =
    exception.severity === 'CRITICAL'
      ? { chip: 'bg-danger-soft text-danger-soft-fg', dot: 'bg-danger' }
      : exception.severity === 'HIGH'
        ? { chip: 'bg-warning-soft text-warning-soft-fg', dot: 'bg-warning' }
        : { chip: 'bg-neutral-soft text-neutral-soft-fg', dot: 'bg-fg-subtle' }
  return (
    <Link to={exception.link} className="flex gap-3 px-4 py-3 transition-colors hover:bg-bg-muted/60">
      <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', tone.dot)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-medium text-fg">{exception.title}</p>
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', tone.chip)}>
            {exception.severity}
          </span>
          <Badge tone="outline" size="sm">{exception.category.replace(/_/g, ' ').toLowerCase()}</Badge>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{exception.detail}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-primary">
          {exception.action} <ArrowRight className="size-3" />
        </p>
      </div>
    </Link>
  )
}

function Row({
  label,
  value,
  tone,
  strong,
}: {
  label: string
  value: string
  tone?: 'success' | 'warning' | 'danger'
  strong?: boolean
}) {
  const toneCls = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : tone === 'danger' ? 'text-danger' : 'text-fg'
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-fg-muted">{label}</span>
      <span className={cn('tnum text-[12.5px]', strong ? 'font-semibold' : 'font-medium', toneCls)}>{value}</span>
    </div>
  )
}
