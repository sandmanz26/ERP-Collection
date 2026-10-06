import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import { CalendarClock, CheckCircle2, Clock, AlertTriangle, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Segmented } from '@/components/ui/checkbox'
import { Meter } from '@/components/charts/charts'
import { useToast } from '@/components/ui/toast'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { useLookups } from '@/hooks/useLookups'
import { useStore } from '@/store/useStore'
import { fmtDate, pct } from '@/lib/format'
import { FREQ_LABEL } from '@/lib/pm'
import { cn } from '@/lib/utils'
import type { PmSchedule } from '@/data/types'

export function MaintenancePage() {
  const nav = useNavigate()
  const toast = useToast()
  const pms = useStore((s) => s.pmSchedules)
  const wos = useStore((s) => s.workOrders)
  const generate = useStore((s) => s.generatePm)
  const { asset, team, vendor } = useLookups()
  const [view, setView] = React.useState<'list' | 'calendar'>('list')
  const now = Date.now()

  const rows = React.useMemo(() => [...pms].filter((p) => p.active).sort((a, b) => a.nextDueAt.localeCompare(b.nextDueAt)), [pms])
  const overdue = rows.filter((p) => new Date(p.nextDueAt).getTime() < now)
  const week = rows.filter((p) => { const t = new Date(p.nextDueAt).getTime(); return t >= now && t < now + 7 * 86_400_000 })
  const pmWos = wos.filter((w) => w.type === 'preventive' && w.status === 'completed' && w.completedAt && new Date(w.completedAt).getTime() > now - 120 * 86_400_000)
  const onTime = pmWos.filter((w) => new Date(w.completedAt!).getTime() <= new Date(w.dueAt).getTime() + 86_400_000)
  const compliance = pmWos.length ? onTime.length / pmWos.length : 1
  const openFor = (p: PmSchedule) => wos.find((w) => w.pmId === p.id && w.status !== 'completed' && w.status !== 'cancelled')

  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  const days = Array.from({ length: 28 }, (_, i) => addDays(start, i))

  const act = (p: PmSchedule) => {
    const wo = generate(p.id)
    if (wo) { toast.push({ tone: 'success', title: `${wo.number} ready`, description: p.name }); nav(`/work-orders/${wo.id}`) }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Preventive maintenance" description="Servicing on a schedule so equipment is looked after before it fails. Jobs are generated from here and tracked as work orders." actions={<Segmented value={view} onChange={setView} options={[{ value: 'list', label: 'Schedule' }, { value: 'calendar', label: 'Calendar' }]} />} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="On-time compliance" value={pct(compliance)} sub={`last 120 days · ${pmWos.length} jobs`} icon={<CheckCircle2 />} accent={compliance > 0.9 ? 'success' : 'warning'} />
        <KpiCard label="Overdue" value={overdue.length} sub="needs scheduling now" icon={<AlertTriangle />} accent={overdue.length ? 'danger' : 'success'} />
        <KpiCard label="Due in 7 days" value={week.length} icon={<Clock />} accent="accent" />
        <KpiCard label="Active schedules" value={rows.length} sub={`${new Set(rows.map((r) => r.assetId)).size} assets covered`} icon={<CalendarClock />} accent="primary" />
      </div>

      {view === 'list' ? (
        <Card className="overflow-hidden">
          <CardHeader title="Schedule" description="Soonest first" />
          <ul className="divide-y divide-border">
            {rows.map((p) => {
              const a = asset.get(p.assetId)
              const due = new Date(p.nextDueAt)
              const late = due.getTime() < now
              const wo = openFor(p)
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', late ? 'bg-danger-soft text-danger-soft-fg' : 'bg-primary-soft text-primary-soft-fg')}><CalendarClock className="size-[18px]" /></span>
                  <div className="min-w-0 flex-1 basis-[260px]">
                    <p className="truncate text-[13.5px] font-medium">{p.name}</p>
                    <p className="truncate text-[12px] text-fg-muted"><Link to={`/assets/${p.assetId}`} className="hover:underline">{a?.name}</Link> · {FREQ_LABEL[p.frequency]} · {p.vendorId ? vendor.get(p.vendorId)?.name : team.get(p.teamId)?.name}</p>
                  </div>
                  <div className="w-36 text-[12.5px]"><p className={cn('font-medium', late ? 'text-danger' : 'text-fg')}>{late ? 'Overdue · ' : ''}{fmtDate(p.nextDueAt)}</p><p className="text-fg-subtle">Last {fmtDate(p.lastDoneAt)}</p></div>
                  {wo ? <Button variant="secondary" size="sm" asChild><Link to={`/work-orders/${wo.id}`}><Wrench /> {wo.number}</Link></Button> : <Button variant={late ? 'primary' : 'secondary'} size="sm" onClick={() => act(p)}><Wrench /> Generate job</Button>}
                </li>
              )
            })}
          </ul>
        </Card>
      ) : (
        <Card>
          <CardHeader title={`${format(start, 'd MMM')} – ${format(addDays(start, 27), 'd MMM yyyy')}`} description="Next four weeks. Overdue items are shown on today." />
          <CardBody>
            <div className="grid grid-cols-7 gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d} className="px-1.5">{d}</span>)}</div>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5">
              {days.map((d) => {
                const today = isSameDay(d, new Date())
                const items = rows.filter((p) => isSameDay(new Date(p.nextDueAt), d) || (today && new Date(p.nextDueAt).getTime() < now && !isSameDay(new Date(p.nextDueAt), d)))
                return (
                  <div key={d.toISOString()} className={cn('min-h-[92px] rounded-lg border p-1.5', today ? 'border-primary bg-primary-soft/40' : 'border-border bg-surface-sunken/50', d < addDays(new Date(), -1) && !today && 'opacity-60')}>
                    <p className={cn('mb-1 text-[11.5px]', today ? 'font-bold text-primary' : 'text-fg-muted')}>{format(d, 'd')}{today && ' · today'}</p>
                    <div className="space-y-1">
                      {items.slice(0, 3).map((p) => {
                        const late = new Date(p.nextDueAt).getTime() < now
                        return <button key={p.id} onClick={() => act(p)} title={`${p.name} — ${asset.get(p.assetId)?.name}`} className={cn('block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium', late ? 'bg-danger-soft text-danger-soft-fg' : 'bg-primary-soft text-primary-soft-fg')}>{p.name.split(' ').slice(0, 3).join(' ')}</button>
                      })}
                      {items.length > 3 && <span className="block px-1 text-[11px] text-fg-subtle">+{items.length - 3} more</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Compliance by team" description="Completed on or before the due date" />
        <CardBody className="space-y-3.5">
          {[...new Set(pms.map((p) => p.teamId))].map((tid) => {
            const mine = pms.filter((p) => p.teamId === tid)
            const lateN = mine.filter((p) => new Date(p.nextDueAt).getTime() < now).length
            const ok = Math.round(((mine.length - lateN) / mine.length) * 100)
            return (
              <div key={tid}>
                <div className="mb-1 flex items-center justify-between text-[13px]"><span>{team.get(tid)?.name}</span><span className="tnum text-fg-muted">{mine.length - lateN}/{mine.length} schedules current {lateN > 0 && <Badge tone="danger" size="sm">{lateN} late</Badge>}</span></div>
                <Meter value={ok} tone={ok === 100 ? 'success' : ok > 70 ? 'warning' : 'danger'} />
              </div>
            )
          })}
        </CardBody>
      </Card>
      <p className="text-[12px] text-fg-subtle">Completing a preventive work order automatically schedules the next one from the completion date.</p>
    </div>
  )
}
