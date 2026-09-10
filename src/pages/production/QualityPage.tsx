import * as React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, TriangleAlert, Wrench } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { useMfg } from '@/store/useMfg'
import type { QcRecord } from '@/data/types'
import { defectLabel, defectMeta, QC_POINTS } from '@/data/reference'
import { defectPareto, qualityMetrics } from '@/lib/analytics'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'

export function QualityPage() {
  const s = useMfg()
  const toast = useToast()
  const [point, setPoint] = React.useState<string[]>([])
  const [result, setResult] = React.useState<string[]>([])

  const metrics = qualityMetrics(s.qcRecords)
  const pareto = defectPareto(s.qcRecords)
  const pending = s.qcRecords.filter((q) => q.disposition === 'PENDING')
  const noRootCause = s.qcRecords.filter((q) => q.result === 'FAIL' && !q.rootCause)

  const columns: Column<QcRecord>[] = [
    {
      key: 'code', header: 'Inspection', width: 'min-w-[210px]', pinned: true, sortable: true, sortValue: (q) => q.code,
      cell: (q) => {
        const wo = s.workOrders.find((w) => w.id === q.workOrderId)
        const item = s.items.find((i) => i.id === q.itemId)
        const product = s.products.find((p) => p.id === q.productId)
        return (
          <div className="min-w-0">
            <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{q.code}</p>
            <p className="truncate text-[11.5px] text-fg-muted">{product?.name ?? item?.name ?? wo?.code ?? '—'}</p>
          </div>
        )
      },
      exportValue: (q) => q.code,
    },
    {
      key: 'point', header: 'Point', width: 'w-[130px]', sortable: true, sortValue: (q) => q.point,
      cell: (q) => (
        <Tooltip content={QC_POINTS.find((x) => x.value === q.point)?.hint ?? ''}>
          <span className="text-[12.5px] text-fg">{QC_POINTS.find((x) => x.value === q.point)?.label}</span>
        </Tooltip>
      ),
      exportValue: (q) => q.point,
    },
    {
      key: 'at', header: 'Date', width: 'w-[120px]', sortable: true, sortValue: (q) => q.at,
      cell: (q) => <span className="tnum text-[12.5px]">{fmtDate(q.at)}</span>,
      exportValue: (q) => q.at,
    },
    {
      key: 'sample', header: 'Sample', align: 'right', width: 'w-[120px]',
      cell: (q) => (
        <span className="tnum text-[12.5px] text-fg-muted">
          {fmtNumber(q.sampleSize)} of {fmtNumber(q.lotSize)}
        </span>
      ),
      exportValue: (q) => q.sampleSize,
    },
    {
      key: 'result', header: 'Result', width: 'w-[170px]', sortable: true, sortValue: (q) => q.result,
      cell: (q) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge value={q.result} size="sm" />
          <span className="tnum text-[11.5px] text-fg-muted">{q.failedQuantity} failed</span>
        </div>
      ),
      exportValue: (q) => q.result,
    },
    {
      key: 'defects', header: 'Defects', width: 'min-w-[240px]',
      cell: (q) => (
        <div className="flex flex-wrap gap-1">
          {q.defects.map((d) => (
            <Tooltip key={d.id} content={`${defectMeta(d.code)?.typicalCause ?? ''} ${d.note ?? ''}`}>
              <Badge tone={d.severity === 'CRITICAL' ? 'danger' : d.severity === 'MAJOR' ? 'warning' : 'neutral'} size="sm">
                {defectLabel(d.code)} × {d.quantity}
              </Badge>
            </Tooltip>
          ))}
          {q.defects.length === 0 && <span className="text-[12px] text-success">Clean</span>}
        </div>
      ),
      exportValue: (q) => q.defects.map((d) => `${d.code}:${d.quantity}`).join(' '),
    },
    {
      key: 'disposition', header: 'Disposition', width: 'w-[180px]', sortable: true, sortValue: (q) => q.disposition,
      cell: (q) =>
        q.disposition === 'PENDING' ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation()
              s.dispositionQc(q.id, 'ACCEPT', q.rootCause ?? 'Within the standing allowance.')
              toast.push({ tone: 'success', title: 'Dispositioned', description: `${q.code} accepted; any blocked lot is released.` })
            }}
          >
            Disposition
          </Button>
        ) : (
          <StatusBadge value={q.disposition} size="sm" />
        ),
      exportValue: (q) => q.disposition,
    },
    {
      key: 'cost', header: 'Cost impact', align: 'right', width: 'w-[130px]', sortable: true, sortValue: (q) => q.costImpact,
      cell: (q) => (
        <span className={`tnum text-[12.5px] ${q.costImpact > 10_000_000 ? 'font-semibold text-danger' : 'text-fg'}`}>
          {q.costImpact ? fmtCurrency(q.costImpact, 'IDR', { compact: true }) : '—'}
        </span>
      ),
      exportValue: (q) => q.costImpact,
    },
    {
      key: 'rootCause', header: 'Root cause', width: 'min-w-[320px]', defaultHidden: true,
      cell: (q) =>
        q.rootCause ? (
          <p className="text-[12px] leading-relaxed text-fg-muted">{q.rootCause}</p>
        ) : q.result === 'FAIL' ? (
          <span className="text-[12px] font-medium text-danger">Not recorded — a failure without one repeats</span>
        ) : (
          <span className="text-[12px] text-fg-subtle">—</span>
        ),
      exportValue: (q) => q.rootCause ?? '',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Quality"
        description="Three inspection points, because the three failures are different animals: a wet lot on receipt, a jig that has drifted mid-process, and fish eye on a finished top. Each is dispositioned, and rework spawns a real order that consumes real hours."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="First-pass yield"
          value={fmtPercent(metrics.firstPassYield, 1)}
          icon={<ShieldCheck />}
          accent={metrics.firstPassYield >= s.settings.kpiTargets.firstPassYieldPercent ? 'success' : 'warning'}
          sub={`target ${s.settings.kpiTargets.firstPassYieldPercent}%`}
        />
        <KpiCard label="Cost of quality" value={fmtCurrency(metrics.costOfQuality, 'IDR', { compact: true })} icon={<Wrench />} accent="warning" sub={`${metrics.reworked} reworked, ${metrics.scrapped} scrapped`} />
        <KpiCard label="Awaiting disposition" value={fmtNumber(pending.length)} icon={<TriangleAlert />} accent={pending.length ? 'danger' : 'success'} sub="stock nobody can plan around" />
        <KpiCard label="Fails with no root cause" value={fmtNumber(noRootCause.length)} icon={<TriangleAlert />} accent={noRootCause.length ? 'warning' : 'success'} sub="a failure without one repeats" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Defect Pareto" description="Ranked by quantity, with the running share. The first two or three are where the money is." />
          <CardBody className="space-y-3">
            {pareto.slice(0, 9).map((d) => (
              <div key={d.code}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[12px] text-fg">{defectLabel(d.code as never)}</span>
                  <span className="tnum shrink-0 text-[11.5px] text-fg-muted">
                    {fmtNumber(d.quantity)} · {fmtPercent(d.cumulative, 0)} cum.
                  </span>
                </div>
                <Progress value={d.share} tone={d.cumulative <= 80 ? 'danger' : 'primary'} size="sm" />
              </div>
            ))}
            <Separator />
            <Because>
              {pareto[0]
                ? `${defectLabel(pareto[0].code as never)} leads. ${defectMeta(pareto[0].code as never)?.typicalCause ?? ''} ${defectMeta(pareto[0].code as never)?.typicalDisposition ?? ''}`
                : 'Nothing recorded yet.'}
            </Because>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="By inspection point" description="Where the failures are found, and what each one costs." />
          <CardBody className="space-y-4">
            {metrics.byPoint.map((p) => (
              <div key={p.point}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-[12.5px] font-medium text-fg">{QC_POINTS.find((x) => x.value === p.point)?.label}</span>
                  <span className="tnum text-[12px] text-fg-muted">
                    {fmtPercent(p.failRate, 1)} fail · {fmtCurrency(p.cost, 'IDR', { compact: true })}
                  </span>
                </div>
                <Progress value={Math.min(100, p.failRate * 5)} tone={p.failRate > 10 ? 'danger' : p.failRate > 4 ? 'warning' : 'success'} size="sm" />
                <Because className="mt-1 text-[11px]">{QC_POINTS.find((x) => x.value === p.point)?.hint}</Because>
              </div>
            ))}
            <Separator />
            <Because>
              Rework at finishing is the most expensive rework there is: the piece has already carried every operation before it,
              and stripping a top takes a booth slot the next order was counting on.
            </Because>
            {s.qcRecords.some((q) => q.reworkWorkOrderId) && (
              <div className="rounded-lg border border-warning/40 bg-warning-soft/30 p-3">
                <p className="text-[12.5px] font-semibold text-fg">Open rework</p>
                {s.qcRecords
                  .filter((q) => q.reworkWorkOrderId)
                  .map((q) => {
                    const wo = s.workOrders.find((w) => w.id === q.reworkWorkOrderId)
                    return (
                      <p key={q.id} className="mt-1 text-[12px] text-fg-muted">
                        <Link to={`/work-orders/${wo?.id}`} className="font-mono font-medium text-primary hover:underline">
                          {wo?.code}
                        </Link>{' '}
                        — {q.failedQuantity} units from {q.code}, {fmtCurrency(q.costImpact, 'IDR', { compact: true })}
                      </p>
                    )
                  })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <DataTable
        data={s.qcRecords}
        columns={columns}
        getId={(q) => q.id}
        getLabel={(q) => q.code}
        entityLabel="inspection"
        exportName="quality"
        storageKey="quality"
        searchText={(q) => `${q.code} ${q.inspector} ${q.rootCause ?? ''} ${q.defects.map((d) => d.code).join(' ')}`}
        initialSort={{ key: 'at', dir: 'desc' }}
        rowTone={(q) => (q.disposition === 'PENDING' ? 'bg-warning-soft/30' : q.result === 'FAIL' ? 'bg-danger-soft/20' : undefined)}
        filters={[
          {
            key: 'point', label: 'Point', values: point, onChange: setPoint,
            options: QC_POINTS.map((x) => ({ value: x.value, label: x.label })),
            match: (q, v) => v.includes(q.point),
          },
          {
            key: 'result', label: 'Result', values: result, onChange: setResult,
            options: [
              { value: 'PASS', label: 'Pass' },
              { value: 'CONDITIONAL', label: 'Conditional' },
              { value: 'FAIL', label: 'Fail' },
            ],
            match: (q, v) => v.includes(q.result),
          },
        ]}
      />
    </div>
  )
}
