import { BarChart3, Flame, Ship, ShieldCheck, TrendingUp } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useMfg } from '@/store/useMfg'
import {
  clearanceByLane, demurrageExposure, importLeadTime, kilnMetrics, materialYield, onTimeDelivery,
  promiseAccuracy, qualityMetrics, scrapRate, supplierScorecards, utilisation,
} from '@/lib/analytics'
import { fmtCurrency, fmtNumber, fmtPercent } from '@/lib/format'

export function AnalyticsPage() {
  const s = useMfg()
  const targets = s.settings.kpiTargets

  const otd = onTimeDelivery(s.salesOrders)
  const promise = promiseAccuracy(s.salesOrders)
  const quality = qualityMetrics(s.qcRecords)
  const yieldStat = materialYield(s.workOrders, s.items)
  const scrap = scrapRate(s.workOrders, s.qcRecords)
  const util = utilisation(s.workCentres, s.workOrders)
  const lanes = clearanceByLane(s.shipments)
  const lead = importLeadTime(s.shipments, s.purchaseOrders)
  const dem = demurrageExposure(s.shipments)
  const kiln = kilnMetrics(s.kilnBatches, s.lots)
  const scores = supplierScorecards(s.suppliers, s.shipments, s.purchaseOrders)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Operations analytics"
        description="Twelve numbers the director keeps. Each one is computed from the book — and each one is here because it changes a decision, not because it fills a tile."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="On-time delivery"
          value={fmtPercent(otd.percent, 0)}
          icon={<TrendingUp />}
          accent={otd.percent >= targets.onTimeDeliveryPercent ? 'success' : 'danger'}
          sub={`target ${targets.onTimeDeliveryPercent}% · ${otd.onTime} of ${otd.total} lines`}
        />
        <KpiCard
          label="First-pass yield"
          value={fmtPercent(quality.firstPassYield, 1)}
          icon={<ShieldCheck />}
          accent={quality.firstPassYield >= targets.firstPassYieldPercent ? 'success' : 'warning'}
          sub={`target ${targets.firstPassYieldPercent}%`}
        />
        <KpiCard
          label="Import lead time, actual"
          value={`${fmtNumber(lead.averageTotal, 0)} days`}
          icon={<Ship />}
          accent={lead.averageTotal <= targets.importLeadDays ? 'success' : 'warning'}
          sub={`target ${targets.importLeadDays} · PO to available-to-issue`}
        />
        <KpiCard
          label="Work-centre utilisation"
          value={fmtPercent(util.overall, 0)}
          icon={<BarChart3 />}
          accent={util.overall > 95 ? 'danger' : util.overall >= targets.workCentreUtilisationPercent ? 'success' : 'primary'}
          sub={`target ${targets.workCentreUtilisationPercent}%`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* ---------------- import lead time decomposed ---------------- */}
        <Card>
          <CardHeader
            icon={<Ship />}
            title="Where the import lead time actually goes"
            description="Averaged over every received consignment. The clearance segment is the one that is usually treated as noise and is in fact the most predictable of the four."
          />
          <CardBody className="space-y-4">
            {[
              { label: 'At the supplier', value: lead.averageSupplier, tone: 'primary' as const, note: 'From purchase order to goods ready.' },
              { label: 'On the water', value: lead.averageTransit, tone: 'accent' as const, note: 'ETD to discharge. The only segment nobody argues about.' },
              { label: 'In clearance', value: lead.averageClearance, tone: 'warning' as const, note: 'PIB to SPPB. Varies from one day to eleven, entirely by lane.' },
              { label: 'Inland & incoming QC', value: lead.averageInland, tone: 'success' as const, note: 'SPPB to available-to-issue.' },
            ].map((seg) => (
              <div key={seg.label}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-[12.5px] font-medium text-fg">{seg.label}</span>
                  <span className="tnum text-[12px] text-fg-muted">{fmtNumber(seg.value, 1)} days</span>
                </div>
                <Progress value={lead.averageTotal ? (seg.value / lead.averageTotal) * 100 : 0} tone={seg.tone} size="sm" />
                <Because className="mt-0.5 text-[11px]">{seg.note}</Because>
              </div>
            ))}
            <Separator />
            <Because>
              Total {fmtNumber(lead.averageTotal, 0)} days across {lead.rows.length} received consignments. Every promise date in
              the order book is built on this number, which is why it is measured rather than assumed.
            </Because>
          </CardBody>
        </Card>

        {/* ---------------- clearance by lane ---------------- */}
        <Card>
          <CardHeader
            icon={<Ship />}
            title="Clearance by lane"
            description="Turning “customs is slow” into a planning parameter."
          />
          <CardBody className="space-y-4">
            {lanes.map((l) => (
              <div key={l.lane}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <StatusBadge value={l.lane} size="sm" />
                  <span className="tnum text-[12px] text-fg-muted">
                    {fmtNumber(l.averageDays, 1)} days average · worst {l.worstDays} · {l.count} consignments
                  </span>
                </div>
                <Progress
                  value={Math.min(100, (l.averageDays / 12) * 100)}
                  tone={l.lane === 'GREEN' ? 'success' : l.lane === 'YELLOW' ? 'warning' : 'danger'}
                  size="sm"
                />
              </div>
            ))}
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.06em] text-fg-subtle">Demurrage paid</p>
                <p className="tnum mt-1 text-[17px] font-semibold text-fg">{fmtCurrency(dem.paid, 'IDR', { compact: true })}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.06em] text-fg-subtle">Accruing now</p>
                <p className={`tnum mt-1 text-[17px] font-semibold ${dem.accruing ? 'text-danger' : 'text-success'}`}>
                  {fmtCurrency(dem.accruing, 'IDR', { compact: true })}
                </p>
              </div>
            </div>
            <Because>Demurrage buys nothing at all. It is the one cost in the book that is always somebody’s decision.</Because>
          </CardBody>
        </Card>

        {/* ---------------- promise accuracy ---------------- */}
        <Card>
          <CardHeader
            icon={<TrendingUp />}
            title="Promise accuracy"
            description="How often sales overrode the system, and which clock they overrode."
          />
          <CardBody className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[12.5px] text-fg-muted">Dates the plan supported</span>
              <span className="tnum text-[17px] font-semibold text-fg">{fmtPercent(promise.percent, 0)}</span>
            </div>
            <Progress value={promise.percent} tone={promise.percent >= 85 ? 'success' : 'warning'} />
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <p className="text-[11px] uppercase tracking-[0.06em] text-fg-subtle">Overridden</p>
                <p className="tnum mt-1 text-[15px] font-semibold text-fg">{promise.overridden} of {promise.total}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.06em] text-fg-subtle">Average override</p>
                <p className="tnum mt-1 text-[15px] font-semibold text-danger">{fmtNumber(promise.averageOverrideDays, 1)} days</p>
              </div>
            </div>
            <Separator />
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Which clock was overridden</p>
            {promise.byConstraint.map((c) => (
              <div key={c.constraint} className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-fg">{c.constraint.toLowerCase()}</span>
                <span className="tnum text-[12px] font-medium text-fg-muted">{c.count}</span>
              </div>
            ))}
            <Because>
              A promise the plan never supported is a different failure from one the plan lost, and the two need different
              conversations. This is the number that starts the first one.
            </Because>
          </CardBody>
        </Card>

        {/* ---------------- material and scrap ---------------- */}
        <Card>
          <CardHeader
            icon={<ShieldCheck />}
            title="Material, scrap and quality"
            description="Where the material money goes when it does not go into a piece of furniture."
          />
          <CardBody className="space-y-3">
            <Metric
              label="Material usage against the bill"
              value={`${yieldStat.variancePercent > 0 ? '+' : ''}${fmtPercent(yieldStat.variancePercent, 1)}`}
              sub={`${fmtCurrency(yieldStat.varianceValue, 'IDR', { compact: true })} on timber and panel alone`}
              bad={yieldStat.variancePercent > 3}
            />
            <Metric
              label="Scrap rate"
              value={fmtPercent(scrap.percent, 2)}
              sub={`${scrap.scrapped} units, ${fmtCurrency(scrap.cost, 'IDR', { compact: true })} — material plus every operation already spent`}
              bad={scrap.percent > targets.scrapRatePercent}
            />
            <Metric
              label="Cost of quality"
              value={fmtCurrency(quality.costOfQuality, 'IDR', { compact: true })}
              sub={`${quality.reworked} reworked, ${quality.scrapped} scrapped, ${quality.inspected} inspected`}
              bad={quality.costOfQuality > 50_000_000}
            />
            <Separator />
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Failure rate by inspection point</p>
            {quality.byPoint.map((p) => (
              <div key={p.point}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-[12px] text-fg">{p.point.replace('_', ' ').toLowerCase()}</span>
                  <span className="tnum text-[11.5px] text-fg-muted">{fmtPercent(p.failRate, 1)}</span>
                </div>
                <Progress value={Math.min(100, p.failRate * 5)} tone={p.failRate > 10 ? 'danger' : 'primary'} size="sm" />
              </div>
            ))}
          </CardBody>
        </Card>

        {/* ---------------- kiln ---------------- */}
        <Card>
          <CardHeader icon={<Flame />} title="Kiln performance" description="The gate nobody can hurry, measured." />
          <CardBody className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Metric label="Closed inside band" value={fmtPercent(kiln.inBandPercent, 0)} sub={`${kiln.closed} batches on record`} bad={kiln.inBandPercent < 90} />
            <Metric label="Average schedule" value={`${fmtNumber(kiln.averageDays, 0)} days`} sub="start to close, all species" />
            <Metric label="Running now" value={fmtNumber(kiln.running)} sub={`${fmtNumber(kiln.chargeVolumeRunning, 1)} m³ in the chambers`} />
            <Metric label="Blocked at the gate" value={fmtCurrency(kiln.blockedValue, 'IDR', { compact: true })} sub={`${fmtNumber(kiln.blockedVolume, 1)} m³ that cannot be cut`} bad={kiln.blockedVolume > 0} />
          </CardBody>
        </Card>

        {/* ---------------- suppliers ---------------- */}
        <Card>
          <CardHeader icon={<Ship />} title="Supplier scorecards" description="On-time 30%, quality 30%, document accuracy 25%, green-lane share 15%." />
          <CardBody className="space-y-3">
            {scores.slice(0, 8).map((sc) => (
              <div key={sc.supplier.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[12px] text-fg">{sc.supplier.name}</span>
                  <Tooltip content={`${fmtNumber(sc.clearanceDays, 1)} days average clearance · ${fmtPercent(sc.redLanePercent, 0)} red lanes`}>
                    <span className={`tnum shrink-0 text-[12px] font-semibold ${sc.score >= 90 ? 'text-success' : sc.score >= 80 ? 'text-fg' : 'text-danger'}`}>
                      {sc.score}
                    </span>
                  </Tooltip>
                </div>
                <Progress value={sc.score} tone={sc.score >= 90 ? 'success' : sc.score >= 80 ? 'primary' : 'danger'} size="sm" />
              </div>
            ))}
            <Separator />
            <Because>
              The score is not for a wall chart. The lane share inside it is the number the MRP run uses to work out the day a
              container becomes issuable, and a supplier who draws red twice as often has to be ordered from a week earlier.
            </Because>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function Metric({ label, value, sub, bad }: { label: string; value: string; sub: string; bad?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.06em] text-fg-subtle">{label}</p>
      <p className={`tnum mt-1 text-[17px] font-semibold leading-none tracking-[-0.02em] ${bad ? 'text-danger' : 'text-fg'}`}>{value}</p>
      <p className="mt-1 text-[11.5px] leading-snug text-fg-muted">{sub}</p>
    </div>
  )
}
