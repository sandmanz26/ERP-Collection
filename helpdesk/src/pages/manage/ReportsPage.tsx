import * as React from 'react'
import { Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Segmented } from '@/components/ui/checkbox'
import { BarChart, HBars } from '@/components/charts/charts'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { Stars } from '@/components/shared/Stars'
import { useLookups } from '@/hooks/useLookups'
import { useStore } from '@/store/useStore'
import { avgFirstResponseMs, csat, DAY, inRange, mttrMs, slaCompliance, woCost } from '@/lib/metrics'
import { downloadCsv } from '@/lib/csv'
import { fmtDuration, fmtMoney, pct } from '@/lib/format'
import { PRIORITY } from '@/lib/labels'
import { addDays, format, startOfDay, startOfWeek } from 'date-fns'
import type { Priority } from '@/data/types'
import { CheckCircle2, Clock, Inbox, MessageSquareReply, Timer, Wrench } from 'lucide-react'

export function ReportsPage() {
  const tickets = useStore((s) => s.tickets)
  const wos = useStore((s) => s.workOrders)
  const teams = useStore((s) => s.teams)
  const [days, setDays] = React.useState<'7' | '30' | '90'>('30')
  const { category, asset, assetCategory } = useLookups()
  const n = +days
  const now = Date.now()
  const from = now - n * DAY
  const prevFrom = from - n * DAY

  const created = tickets.filter((t) => inRange(t.createdAt, from, now))
  const prevCreated = tickets.filter((t) => inRange(t.createdAt, prevFrom, from))
  const resolved = tickets.filter((t) => inRange(t.resolvedAt, from, now))
  const sla = slaCompliance(tickets, from, now)
  const prevSla = slaCompliance(tickets, prevFrom, from)
  const frt = avgFirstResponseMs(tickets, from, now)
  const prevFrt = avgFirstResponseMs(tickets, prevFrom, from)
  const mttr = mttrMs(tickets, from, now)
  const cs = csat(tickets, from, now)

  const series = React.useMemo(() => {
    if (n <= 30) {
      return Array.from({ length: n }, (_, i) => {
        const d = addDays(startOfDay(new Date()), -(n - 1 - i))
        const a = d.getTime(), b = addDays(d, 1).getTime()
        return { label: format(d, n > 14 ? 'd' : 'EEE d'), values: { created: tickets.filter((t) => inRange(t.createdAt, a, b)).length, resolved: tickets.filter((t) => inRange(t.resolvedAt, a, b)).length } }
      })
    }
    const w0 = startOfWeek(new Date(from), { weekStartsOn: 1 })
    return Array.from({ length: Math.ceil(n / 7) + 1 }, (_, i) => {
      const d = addDays(w0, i * 7)
      const a = d.getTime(), b = addDays(d, 7).getTime()
      return { label: format(d, 'd MMM'), values: { created: tickets.filter((t) => inRange(t.createdAt, a, b)).length, resolved: tickets.filter((t) => inRange(t.resolvedAt, a, b)).length } }
    })
  }, [tickets, n, from])

  const byPriority = (['p1', 'p2', 'p3', 'p4'] as Priority[]).map((p) => ({ p, ...slaCompliance(tickets.filter((t) => t.priority === p), from, now) }))
  const byCat = Object.entries(created.reduce<Record<string, number>>((m, t) => ((m[t.categoryId] = (m[t.categoryId] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const byAsset = Object.entries(created.filter((t) => t.assetId).reduce<Record<string, number>>((m, t) => ((m[t.assetId!] = (m[t.assetId!] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const costByCat = Object.entries(wos.filter((w) => w.assetId && inRange(w.createdAt, from, now)).reduce<Record<string, number>>((m, w) => { const c = asset.get(w.assetId!)?.categoryId ?? 'x'; m[c] = (m[c] ?? 0) + woCost(w).total; return m }, {})).sort((a, b) => b[1] - a[1])
  const preventive = wos.filter((w) => inRange(w.createdAt, from, now) && w.type === 'preventive').reduce((t, w) => t + woCost(w).total, 0)
  const corrective = wos.filter((w) => inRange(w.createdAt, from, now) && w.type === 'corrective').reduce((t, w) => t + woCost(w).total, 0)

  const delta = (cur: number, prev: number, invert = false) => {
    if (!prev) return {}
    const d = ((cur - prev) / prev) * 100
    const good = invert ? d <= 0 : d >= 0
    return { delta: `${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(0)}%`, deltaTone: (good ? 'up' : 'down') as 'up' | 'down' }
  }

  const exportAll = () => downloadCsv(`report-${days}d.csv`, [['Number', 'Title', 'Category', 'Priority', 'Status', 'Created', 'Resolved'], ...created.map((t) => [t.number, t.title, category.get(t.categoryId)?.name, t.priority, t.status, t.createdAt, t.resolvedAt])])

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="How the service is performing — and where the building is costing us." actions={<><Segmented value={days} onChange={setDays} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} /><Button variant="secondary" onClick={exportAll}><Download /> Export CSV</Button></>} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Tickets created" value={created.length} {...delta(created.length, prevCreated.length, true)} sub="vs previous period" icon={<Inbox />} accent="primary" />
        <KpiCard label="Resolved" value={resolved.length} icon={<CheckCircle2 />} accent="success" />
        <KpiCard label="SLA met" value={pct(sla.rate)} {...(prevSla.total ? { delta: `${sla.rate >= prevSla.rate ? '▲' : '▼'} ${Math.abs((sla.rate - prevSla.rate) * 100).toFixed(1)} pts`, deltaTone: (sla.rate >= prevSla.rate ? 'up' : 'down') as 'up' | 'down' } : {})} icon={<Timer />} accent={sla.rate > 0.9 ? 'success' : 'warning'} />
        <KpiCard label="First response" value={fmtDuration(frt)} {...delta(frt, prevFrt, true)} sub="average" icon={<Clock />} accent="accent" />
        <KpiCard label="Time to resolve" value={fmtDuration(mttr)} sub="average, excl. paused" icon={<Wrench />} accent="primary" />
        <KpiCard label="CSAT" value={cs.n ? cs.avg.toFixed(2) : '—'} sub={`${cs.n} ratings`} icon={<MessageSquareReply />} accent="purple" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card><CardHeader title="Created vs resolved" description={n > 30 ? 'Per week' : 'Per day'} /><CardBody><BarChart height={220} data={series} series={[{ key: 'created', label: 'Created', color: 'var(--series-1)' }, { key: 'resolved', label: 'Resolved', color: 'var(--series-3)' }]} /></CardBody></Card>
        <Card>
          <CardHeader title="SLA met by priority" description="Share of tickets that hit both targets" />
          <CardBody>
            <ul className="space-y-3">{byPriority.map((r) => <li key={r.p} className="flex items-center gap-3"><Badge tone={PRIORITY[r.p].tone} className="w-[84px] justify-center">{PRIORITY[r.p].short} {PRIORITY[r.p].label}</Badge><div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-soft"><div className="h-full rounded-full bg-primary" style={{ width: `${r.rate * 100}%` }} /></div><span className="tnum w-24 text-right text-[12.5px]"><strong>{pct(r.rate)}</strong> <span className="text-fg-subtle">of {r.total}</span></span></li>)}</ul>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card><CardHeader title="What people report" description="Top categories" /><CardBody><HBars rows={byCat.map(([id, v]) => ({ label: category.get(id)?.name ?? id, value: v }))} /></CardBody></Card>
        <Card><CardHeader title="Repeat offenders" description="Assets with the most tickets — candidates for replacement" /><CardBody>{byAsset.length ? <HBars color="var(--series-2)" rows={byAsset.map(([id, v]) => ({ label: asset.get(id)?.name ?? id, value: v, sub: asset.get(id)?.tag }))} /> : <p className="text-[13px] text-fg-muted">No asset-linked tickets in this period.</p>}</CardBody></Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="By team" />
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-[13px]"><thead className="border-b border-border bg-surface-sunken text-[11px] uppercase tracking-[0.06em] text-fg-subtle"><tr>{['Team', 'Created', 'Resolved', 'Open now', 'SLA met', 'First response', 'CSAT'].map((h, i) => <th key={h} className={`px-4 py-2.5 font-semibold ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">{teams.map((tm) => { const tt = tickets.filter((t) => t.teamId === tm.id); const s = slaCompliance(tt, from, now); const c = csat(tt, from, now); return <tr key={tm.id}><td className="px-4 py-2.5 font-medium">{tm.name}</td><td className="tnum px-4 py-2.5 text-right">{tt.filter((t) => inRange(t.createdAt, from, now)).length}</td><td className="tnum px-4 py-2.5 text-right">{tt.filter((t) => inRange(t.resolvedAt, from, now)).length}</td><td className="tnum px-4 py-2.5 text-right">{tt.filter((t) => !['resolved', 'closed', 'cancelled'].includes(t.status)).length}</td><td className="tnum px-4 py-2.5 text-right">{s.total ? pct(s.rate) : '—'}</td><td className="tnum px-4 py-2.5 text-right">{fmtDuration(avgFirstResponseMs(tt, from, now))}</td><td className="px-4 py-2.5 text-right">{c.n ? <span className="inline-flex items-center gap-2"><Stars value={Math.round(c.avg)} readOnly size="sm" /><span className="tnum w-8">{c.avg.toFixed(1)}</span></span> : '—'}</td></tr> })}</tbody></table></div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Maintenance spend" description={`Created in the last ${days} days · labour at Rp 85,000/h`} />
          <CardBody className="space-y-5">
            <div className="grid grid-cols-2 gap-3"><div className="rounded-lg bg-surface-sunken p-3"><p className="text-[12px] text-fg-muted">Corrective (reactive)</p><p className="tnum mt-1 text-[20px] font-semibold">{fmtMoney(corrective)}</p></div><div className="rounded-lg bg-surface-sunken p-3"><p className="text-[12px] text-fg-muted">Preventive (planned)</p><p className="tnum mt-1 text-[20px] font-semibold">{fmtMoney(preventive)}</p></div></div>
            <HBars color="var(--series-4)" format={fmtMoney} rows={costByCat.map(([id, v]) => ({ label: assetCategory.get(id)?.name ?? 'Other', value: v }))} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Satisfaction" description={`${cs.n} ratings`} />
          <CardBody>
            {cs.n === 0 ? <p className="text-[13px] text-fg-muted">No ratings in this period.</p> : <HBars color="var(--series-3)" max={Math.max(...cs.dist)} rows={[5, 4, 3, 2, 1].map((s) => ({ label: <span className="inline-flex items-center gap-2"><Stars value={s} readOnly size="sm" /></span>, value: cs.dist[s - 1] }))} />}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
