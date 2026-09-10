import * as React from 'react'
import { Droplets, Flame, ThermometerSun, TriangleAlert } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import { kilnMetrics } from '@/lib/analytics'
import { MOISTURE_BANDS } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent, relativeLabel } from '@/lib/format'
import { daysBetween, TODAY } from '@/data/clock'

export function KilnPage() {
  const s = useMfg()
  const toast = useToast()
  const metrics = kilnMetrics(s.kilnBatches, s.lots)
  const [selected, setSelected] = React.useState<string>(
    s.kilnBatches.find((b) => b.status === 'DRYING')?.id ?? s.kilnBatches[0]?.id ?? '',
  )
  const batch = s.kilnBatches.find((b) => b.id === selected)

  const running = s.kilnBatches.filter((b) => ['LOADING', 'DRYING', 'CONDITIONING'].includes(b.status))
  const failed = s.kilnBatches.filter((b) => b.status === 'FAILED')

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Kiln drying"
        description="Solid timber cannot be issued to the rough mill until its batch closes inside the target band — 8–12% for indoor, 12–15% for outdoor. This is the gate that prevents the warranty claim eighteen months from now, and it is the only one nobody can hurry."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Batches running" value={fmtNumber(metrics.running)} icon={<Flame />} accent="primary" sub={`${fmtNumber(metrics.chargeVolumeRunning, 1)} m³ in the chambers`} />
        <KpiCard
          label="Closed inside band"
          value={fmtPercent(metrics.inBandPercent, 0)}
          icon={<Droplets />}
          accent={metrics.inBandPercent >= 90 ? 'success' : 'warning'}
          sub={`${metrics.closed} batches on record`}
        />
        <KpiCard
          label="Timber blocked"
          value={`${fmtNumber(metrics.blockedVolume, 1)} m³`}
          icon={<TriangleAlert />}
          accent={metrics.blockedVolume ? 'danger' : 'success'}
          sub={`${fmtCurrency(metrics.blockedValue, 'IDR', { compact: true })} that cannot be cut`}
        />
        <KpiCard label="Average schedule" value={`${fmtNumber(metrics.averageDays, 0)} days`} icon={<ThermometerSun />} accent="accent" sub="start to close, all species" />
      </div>

      {failed.length > 0 && (
        <Card className="border-danger/50">
          <CardBody className="flex flex-wrap items-start gap-4">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-fg">
                {failed.length} batch{failed.length === 1 ? '' : 'es'} closed outside the band
              </p>
              {failed.map((b) => (
                <div key={b.id} className="mt-1.5">
                  <p className="text-[12.5px] text-fg">
                    <span className="font-mono font-semibold">{b.code}</span> — {b.species}, closed at{' '}
                    <span className="font-semibold text-danger">{b.finalMoisturePercent}%</span> against {b.targetMin}–{b.targetMax}%.
                  </p>
                  {b.note && <Because className="mt-0.5">{b.note}</Because>}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <Card>
          <CardHeader icon={<Flame />} title="Batches" description="Chambers, charges and where each one stands." />
          <CardBody className="p-0">
            <div className="divide-y divide-border">
              {s.kilnBatches.map((b) => {
                const elapsed = daysBetween(b.startedAt, b.actualEnd ?? TODAY)
                const total = daysBetween(b.startedAt, b.plannedEnd)
                const outOfBand = b.finalMoisturePercent !== undefined && (b.finalMoisturePercent < b.targetMin || b.finalMoisturePercent > b.targetMax)
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelected(b.id)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-bg-muted ${selected === b.id ? 'bg-primary-soft/40' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{b.code}</p>
                        <p className="truncate text-[11.5px] text-fg-muted">
                          {b.species} · {b.chamber} · {fmtNumber(b.chargeVolumeM3, 1)} m³
                        </p>
                      </div>
                      <StatusBadge value={b.status} size="sm" />
                    </div>
                    {['DRYING', 'CONDITIONING'].includes(b.status) && (
                      <>
                        <Progress className="mt-2" value={total ? (elapsed / total) * 100 : 0} tone="primary" size="sm" />
                        <p className="tnum mt-1 text-[11px] text-fg-muted">
                          day {elapsed} of {total} · closes {fmtDate(b.plannedEnd)} ({relativeLabel(b.plannedEnd)})
                        </p>
                      </>
                    )}
                    {b.finalMoisturePercent !== undefined && (
                      <p className={`tnum mt-1.5 text-[11.5px] font-medium ${outOfBand ? 'text-danger' : 'text-success'}`}>
                        closed at {b.finalMoisturePercent}% · band {b.targetMin}–{b.targetMax}%
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-5">
          {batch && (
            <Card>
              <CardHeader
                icon={<Droplets />}
                title={`${batch.code} — moisture over time`}
                description={`${batch.species}, ${batch.thicknessMm} mm, schedule ${batch.schedule}. The shaded band is where the charge has to finish.`}
                actions={
                  ['DRYING', 'CONDITIONING'].includes(batch.status) ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        const last = batch.readings.at(-1)?.moisturePercent ?? batch.startMoisturePercent
                        const final = Number(Math.max(batch.targetMin - 0.4, last - 1.6).toFixed(1))
                        s.closeKilnBatch(batch.id, final)
                        const ok = final >= batch.targetMin && final <= batch.targetMax
                        toast.push({
                          tone: ok ? 'success' : 'error',
                          title: ok ? `${batch.code} closed in band at ${final}%` : `${batch.code} closed at ${final}% — outside the band`,
                          description: ok
                            ? 'The lots inside it are now available to issue.'
                            : `The band is ${batch.targetMin}–${batch.targetMax}%. The lots stay blocked and the charge goes back in.`,
                        })
                      }}
                    >
                      Close batch
                    </Button>
                  ) : undefined
                }
              />
              <CardBody>
                <MoistureChart batch={batch} />
                <Separator className="my-3" />
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                  <Small label="Start MC" value={`${batch.startMoisturePercent}%`} />
                  <Small label="Latest" value={`${batch.readings.at(-1)?.moisturePercent ?? batch.startMoisturePercent}%`} />
                  <Small label="Target band" value={`${batch.targetMin}–${batch.targetMax}%`} />
                  <Small label="Operator" value={batch.operator} />
                </div>
                <Because className="mt-3">
                  {batch.targetMin >= 12
                    ? MOISTURE_BANDS.OUTDOOR.note
                    : MOISTURE_BANDS.INDOOR.note}
                </Because>
                {batch.note && <Because className="mt-2">{batch.note}</Because>}
              </CardBody>
            </Card>
          )}

          {batch && (
            <Card>
              <CardHeader title="Readings" description="Dry bulb, wet bulb and moisture, as taken." />
              <CardBody className="p-0">
                {batch.readings.length === 0 && <EmptyState title="No readings yet" description="The charge is still being loaded." />}
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                      <th className="py-2 pl-4 font-medium">Taken</th>
                      <th className="px-2 py-2 text-right font-medium">MC</th>
                      <th className="px-2 py-2 text-right font-medium">Dry bulb</th>
                      <th className="px-2 py-2 text-right font-medium">Wet bulb</th>
                      <th className="py-2 pr-4 font-medium">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.readings.map((r) => {
                      const inBand = r.moisturePercent >= batch.targetMin && r.moisturePercent <= batch.targetMax
                      return (
                        <tr key={r.id} className="border-b border-border/70 last:border-0">
                          <td className="py-1.5 pl-4"><span className="tnum text-[12px]">{fmtDate(r.at)}</span></td>
                          <td className="px-2 py-1.5 text-right">
                            <span className={`tnum text-[12.5px] font-semibold ${inBand ? 'text-success' : 'text-fg'}`}>{r.moisturePercent}%</span>
                          </td>
                          <td className="px-2 py-1.5 text-right"><span className="tnum text-[12px] text-fg-muted">{r.dryBulbC} °C</span></td>
                          <td className="px-2 py-1.5 text-right"><span className="tnum text-[12px] text-fg-muted">{r.wetBulbC} °C</span></td>
                          <td className="py-1.5 pr-4"><span className="text-[12px] text-fg-muted">{r.takenBy}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}

          {batch && batch.lotIds.length > 0 && (
            <Card>
              <CardHeader title="Lots in this charge" description="Nothing here may be issued until the batch closes in band." />
              <CardBody className="space-y-2">
                {batch.lotIds.map((lotId) => {
                  const lot = s.lots.find((l) => l.id === lotId)
                  const item = s.items.find((i) => i.id === lot?.itemId)
                  if (!lot) return null
                  return (
                    <div key={lotId} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[12px] font-semibold text-fg">{lot.code}</p>
                        <p className="truncate text-[11.5px] text-fg-muted">{item?.name} · {fmtNumber(lot.quantity, 1)} {item?.uom}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Tooltip content={lot.originCountry ? `Origin ${lot.originCountry}` : ''}>
                          <span className="tnum text-[11.5px] text-fg-muted">{fmtCurrency(lot.quantity * lot.unitCost, 'IDR', { compact: true })}</span>
                        </Tooltip>
                        <StatusBadge value={lot.status} size="sm" />
                      </div>
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          )}

          {running.length > 0 && (
            <Card>
              <CardHeader title="Chamber occupancy" description="Four chambers. A batch is a lead time, not a load." />
              <CardBody className="grid grid-cols-2 gap-3">
                {['Chamber 1', 'Chamber 2', 'Chamber 3', 'Chamber 4'].map((ch) => {
                  const occupant = running.find((b) => b.chamber === ch)
                  return (
                    <div key={ch} className={`rounded-lg border p-3 ${occupant ? 'border-primary/40 bg-primary-soft/25' : 'border-border bg-surface-sunken/40'}`}>
                      <p className="text-[12px] font-semibold text-fg">{ch}</p>
                      {occupant ? (
                        <>
                          <p className="mt-0.5 truncate text-[11.5px] text-fg-muted">{occupant.species}</p>
                          <p className="tnum mt-1 text-[11px] text-fg-muted">
                            {fmtNumber(occupant.chargeVolumeM3, 1)} m³ · closes {fmtDate(occupant.plannedEnd, 'short')}
                          </p>
                        </>
                      ) : (
                        <p className="mt-0.5 text-[11.5px] text-fg-subtle">Empty</p>
                      )}
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function MoistureChart({ batch }: { batch: import('@/data/types').KilnBatch }) {
  const readings = batch.readings
  if (!readings.length) return <EmptyState title="No readings yet" className="py-10" />
  /* scale to the data, not to zero — a charge that runs 31% to 9% is flat against a zero axis */
  const values = [batch.startMoisturePercent, batch.targetMin, batch.targetMax, ...readings.map((r) => r.moisturePercent)]
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = Math.max(1, (hi - lo) * 0.15)
  const max = hi + pad
  const min = Math.max(0, lo - pad)
  const h = 160
  const w = 100
  const scale = (v: number) => h - ((v - min) / (max - min)) * h
  const points = readings.map((r, i) => `${(i / Math.max(1, readings.length - 1)) * w},${scale(r.moisturePercent)}`).join(' ')

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-40 w-full">
        <rect
          x="0"
          y={scale(batch.targetMax)}
          width={w}
          height={Math.max(1, scale(batch.targetMin) - scale(batch.targetMax))}
          className="fill-success/15"
        />
        <line x1="0" x2={w} y1={scale(batch.targetMax)} y2={scale(batch.targetMax)} className="stroke-success/60" strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        <line x1="0" x2={w} y1={scale(batch.targetMin)} y2={scale(batch.targetMin)} className="stroke-success/60" strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        <polyline points={points} fill="none" className="stroke-primary" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {readings.map((r, i) => (
          <circle
            key={r.id}
            cx={(i / Math.max(1, readings.length - 1)) * w}
            cy={scale(r.moisturePercent)}
            r="1.4"
            className={r.moisturePercent >= batch.targetMin && r.moisturePercent <= batch.targetMax ? 'fill-success' : 'fill-primary'}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10.5px] text-fg-subtle">
        <span>{fmtDate(readings[0].at, 'short')} · {readings[0].moisturePercent}%</span>
        <span className="text-success">band {batch.targetMin}–{batch.targetMax}%</span>
        <span>{fmtDate(readings.at(-1)!.at, 'short')} · {readings.at(-1)!.moisturePercent}%</span>
      </div>
    </div>
  )
}

function Small({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">{label}</p>
      <p className="tnum mt-0.5 text-[13px] font-semibold text-fg">{value}</p>
    </div>
  )
}
