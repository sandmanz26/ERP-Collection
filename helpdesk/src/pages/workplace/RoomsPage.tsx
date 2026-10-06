import * as React from 'react'
import { addDays, format, isSameDay, startOfDay } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Coffee, Monitor, Presentation, Users, Video, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Checkbox, Segmented } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { UserChip } from '@/components/shared/badges'
import { EmptyState } from '@/components/ui/misc'
import { useLookups } from '@/hooks/useLookups'
import { useNow } from '@/hooks/useNow'
import { useMe, useStore } from '@/store/useStore'
import { fmtSmart } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Booking, Space } from '@/data/types'

const START_H = 8
const END_H = 19
const SLOTS = (END_H - START_H) * 2
const AMEN: Record<string, React.ReactNode> = { Display: <Monitor className="size-3.5" />, 'Video call': <Video className="size-3.5" />, Whiteboard: <Presentation className="size-3.5" />, Catering: <Coffee className="size-3.5" /> }

const slotTime = (day: Date, slot: number) => { const d = new Date(day); d.setHours(START_H + Math.floor(slot / 2), slot % 2 ? 30 : 0, 0, 0); return d }

export function RoomsPage() {
  const me = useMe()!
  const toast = useToast()
  const spaces = useStore((s) => s.spaces)
  const bookings = useStore((s) => s.bookings)
  const create = useStore((s) => s.createBooking)
  const cancel = useStore((s) => s.cancelBooking)
  const { building } = useLookups()
  const buildings = useStore((s) => s.buildings)
  const now = useNow(60_000)
  const [day, setDay] = React.useState(() => startOfDay(new Date()))
  const [bid, setBid] = React.useState<string>('all')
  const [minCap, setMinCap] = React.useState('0')
  const [need, setNeed] = React.useState<string[]>([])
  const [dlg, setDlg] = React.useState<{ space: Space; slot: number } | null>(null)
  const [detail, setDetail] = React.useState<Booking | null>(null)
  const [form, setForm] = React.useState({ title: '', dur: '60', attendees: '4', catering: false, startSlot: 0 })
  const [err, setErr] = React.useState('')

  const rooms = React.useMemo(
    () =>
      spaces
        .filter((s) => s.bookable && (bid === 'all' || s.buildingId === bid) && s.capacity >= +minCap && need.every((n) => s.amenities.includes(n)))
        .sort((a, b) => a.buildingId.localeCompare(b.buildingId) || b.capacity - a.capacity),
    [spaces, bid, minCap, need],
  )
  const dayBookings = React.useMemo(() => bookings.filter((b) => b.status === 'confirmed' && isSameDay(new Date(b.start), day)), [bookings, day])
  /** A slot counts as taken if any booking overlaps any part of it. */
  const taken = (spaceId: string, slot: number) => {
    const a = slotTime(day, slot).getTime(), z = a + 30 * 60_000
    return dayBookings.some((b) => b.spaceId === spaceId && new Date(b.start).getTime() < z && new Date(b.end).getTime() > a)
  }
  const mine = React.useMemo(() => bookings.filter((b) => b.userId === me.id && b.status === 'confirmed' && new Date(b.end).getTime() > now).sort((a, b) => a.start.localeCompare(b.start)), [bookings, me.id, now])
  const isToday = isSameDay(day, new Date())
  const nowPct = isToday ? ((now - slotTime(day, 0).getTime()) / (SLOTS * 30 * 60_000)) * 100 : -1

  /** Minutes the room stays free from a slot, up to closing time. */
  const gapFrom = (spaceId: string, slot: number) => {
    let m = 0
    for (let i = slot; i < SLOTS; i++) {
      if (taken(spaceId, i)) break
      m += 30
    }
    return m
  }
  const open = (space: Space, slot: number) => {
    setErr('')
    setForm({ title: '', dur: String(Math.min(60, gapFrom(space.id, slot))), attendees: String(Math.min(4, space.capacity)), catering: false, startSlot: slot })
    setDlg({ space, slot })
  }
  const submit = () => {
    if (!dlg) return
    const start = slotTime(day, form.startSlot)
    const end = new Date(start.getTime() + +form.dur * 60_000)
    if (end.getHours() > END_H || (end.getHours() === END_H && end.getMinutes() > 0)) return setErr(`Rooms close at ${END_H}:00 — shorten the booking.`)
    if (+form.attendees > dlg.space.capacity) return setErr(`${dlg.space.name} holds ${dlg.space.capacity} people.`)
    const r = create({ spaceId: dlg.space.id, userId: me.id, title: form.title.trim() || 'Meeting', start: start.toISOString(), end: end.toISOString(), attendees: +form.attendees, catering: form.catering })
    if (!r.ok) return setErr(r.error)
    toast.push({ tone: 'success', title: `${dlg.space.name} booked`, description: `${format(start, 'EEE d MMM, HH:mm')}–${format(end, 'HH:mm')}` })
    setDlg(null)
  }
  const freeSlots = (space: Space) => {
    let free = 0
    for (let i = 0; i < SLOTS; i++) {
      const t = slotTime(day, i).getTime()
      if (isToday && t + 30 * 60_000 < now) continue
      if (!taken(space.id, i)) free++
    }
    return free / 2
  }
  const allNeeds = ['Display', 'Video call', 'Whiteboard', 'Catering']

  return (
    <div className="space-y-5">
      <PageHeader title="Rooms" description="Pick a free slot on the grid to book. Rooms release automatically if nobody checks in within 15 minutes." />
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-lg border border-border bg-surface shadow-card">
          <Button variant="ghost" size="icon" aria-label="Previous day" onClick={() => setDay((d) => addDays(d, -1))}><ChevronLeft /></Button>
          <button className="px-2 text-[13.5px] font-semibold tabular-nums" onClick={() => setDay(startOfDay(new Date()))} title="Jump to today">{isToday ? 'Today · ' : ''}{format(day, 'EEE d MMM')}</button>
          <Button variant="ghost" size="icon" aria-label="Next day" onClick={() => setDay((d) => addDays(d, 1))}><ChevronRight /></Button>
        </div>
        <DatePicker value={format(day, 'yyyy-MM-dd')} onChange={(v) => v && setDay(startOfDay(new Date(v + 'T00:00')))} clearable={false} className="w-40" />
        <Segmented value={bid} onChange={setBid} options={[{ value: 'all', label: 'All' }, ...buildings.map((b) => ({ value: b.id, label: b.code }))]} />
        <Select className="w-[150px]" value={minCap} onChange={setMinCap} options={[{ value: '0', label: 'Any size' }, { value: '6', label: '6+ people' }, { value: '10', label: '10+ people' }, { value: '16', label: '16+ people' }]} />
        <div className="flex flex-wrap items-center gap-1.5">
          {allNeeds.map((n) => { const on = need.includes(n); return <button key={n} aria-pressed={on} onClick={() => setNeed((x) => (on ? x.filter((y) => y !== n) : [...x, n]))} className={cn('inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors', on ? 'border-primary bg-primary-soft text-primary-soft-fg' : 'border-border bg-surface text-fg-muted hover:border-border-strong')}>{AMEN[n]}{n}</button> })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="min-w-0 overflow-hidden">
          {rooms.length === 0 ? <EmptyState icon={<CalendarDays />} title="No rooms match" description="Loosen the size or equipment filters." action={<Button variant="secondary" onClick={() => { setNeed([]); setMinCap('0'); setBid('all') }}>Reset filters</Button>} /> : (
            <div className="scrollbar-thin overflow-x-auto">
              <div className="min-w-[860px] sm:min-w-[980px]">
                <div className="grid grid-cols-[124px_1fr] sm:grid-cols-[200px_1fr] border-b border-border bg-surface-sunken text-[11px] font-medium text-fg-subtle">
                  <div className="px-3 py-2">{rooms.length} rooms</div>
                  <div className="relative grid" style={{ gridTemplateColumns: `repeat(${END_H - START_H}, 1fr)` }}>{Array.from({ length: END_H - START_H }, (_, i) => <span key={i} className="border-l border-border px-1.5 py-2 tnum">{String(START_H + i).padStart(2, '0')}:00</span>)}</div>
                </div>
                {rooms.map((r) => (
                  <div key={r.id} className="grid grid-cols-[124px_1fr] sm:grid-cols-[200px_1fr] border-b border-border last:border-0">
                    <div className="sticky left-0 z-[2] border-r border-border bg-surface px-3 py-2.5">
                      <p className="truncate text-[13.5px] font-semibold">{r.name}</p>
                      <p className="flex items-center gap-1.5 text-[11.5px] text-fg-muted"><Users className="size-3" />{r.capacity} · {building.get(r.buildingId)?.code} L{r.floor}</p>
                      <p className="mt-0.5 text-[11px] text-fg-subtle">{freeSlots(r)}h free</p>
                    </div>
                    <div className="relative h-[66px]">
                      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${SLOTS}, 1fr)` }}>
                        {Array.from({ length: SLOTS }, (_, i) => {
                          const t = slotTime(day, i).getTime()
                          const past = t + 30 * 60_000 <= now && isToday
                          const busy = taken(r.id, i)
                          return <button key={i} disabled={past || busy} onClick={() => open(r, i)} aria-label={`Book ${r.name} at ${format(slotTime(day, i), 'HH:mm')}`} className={cn('border-l first:border-l-0 transition-colors', i % 2 ? 'border-border/40' : 'border-border', past ? 'bg-neutral-soft/60' : !busy && 'hover:bg-primary-soft/70')} />
                        })}
                      </div>
                      {dayBookings.filter((b) => b.spaceId === r.id).map((b) => {
                        const s = new Date(b.start), e = new Date(b.end)
                        const left = ((s.getTime() - slotTime(day, 0).getTime()) / (SLOTS * 30 * 60_000)) * 100
                        const width = ((e.getTime() - s.getTime()) / (SLOTS * 30 * 60_000)) * 100
                        const own = b.userId === me.id
                        return <button key={b.id} onClick={() => setDetail(b)} style={{ left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)` }} className={cn('absolute inset-y-1.5 overflow-hidden rounded-md px-2 py-1 text-left text-[11.5px] leading-tight shadow-card transition-transform hover:z-[1] hover:-translate-y-px', own ? 'bg-primary text-primary-fg' : 'bg-info-soft text-info-soft-fg ring-1 ring-inset ring-info/20')}><span className="block truncate font-semibold">{b.title}</span><span className="block truncate opacity-80">{format(s, 'HH:mm')}–{format(e, 'HH:mm')}</span></button>
                      })}
                      {nowPct >= 0 && nowPct <= 100 && <span aria-hidden className="pointer-events-none absolute inset-y-0 z-[1] w-px bg-danger" style={{ left: `${nowPct}%` }} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="My bookings" description={mine.length ? `${mine.length} upcoming` : undefined} />
            {mine.length === 0 ? <p className="px-4 py-5 text-[13px] text-fg-muted">You have nothing booked. Click a free slot to reserve a room.</p> : (
              <ul className="divide-y divide-border">
                {mine.slice(0, 6).map((b) => (
                  <li key={b.id} className="flex items-start justify-between gap-2 px-4 py-3">
                    <div className="min-w-0"><p className="truncate text-[13.5px] font-medium">{b.title}</p><p className="text-[12px] text-fg-muted">{spaces.find((s) => s.id === b.spaceId)?.name} · {fmtSmart(b.start)}</p></div>
                    <Button variant="ghost" size="iconXs" aria-label={`Cancel ${b.title}`} onClick={() => { cancel(b.id); toast.push({ tone: 'info', title: 'Booking cancelled', description: 'The room is free for others.' }) }}><X /></Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-4 text-[12.5px] leading-relaxed text-fg-muted"><p className="mb-1.5 font-semibold text-fg">Legend</p><p className="flex items-center gap-2"><span className="size-3 rounded-sm bg-primary" /> Your booking</p><p className="flex items-center gap-2"><span className="size-3 rounded-sm bg-info-soft ring-1 ring-info/30" /> Booked by someone else</p><p className="flex items-center gap-2"><span className="size-3 rounded-sm bg-neutral-soft" /> Passed</p></Card>
        </aside>
      </div>

      <Dialog open={!!dlg} onOpenChange={(v) => !v && setDlg(null)}>
        {dlg && (
          <DialogContent size="sm" title={`Book ${dlg.space.name}`} description={`${format(day, 'EEEE d MMMM')} · seats ${dlg.space.capacity}`} footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button variant="primary" onClick={submit}>Book room</Button></>}>
            <div className="space-y-4 p-5">
              <Field label="Meeting title"><Input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sprint planning" onKeyDown={(e) => e.key === 'Enter' && submit()} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts"><Select value={String(form.startSlot)} onChange={(v) => setForm({ ...form, startSlot: +v, dur: String(Math.min(+form.dur, gapFrom(dlg.space.id, +v))) })} options={Array.from({ length: SLOTS }, (_, i) => ({ value: String(i), label: format(slotTime(day, i), 'HH:mm'), disabled: gapFrom(dlg.space.id, i) === 0 || (isToday && slotTime(day, i).getTime() + 30 * 60_000 <= now) }))} /></Field>
                <Field label="Length" hint={`free for ${gapFrom(dlg.space.id, form.startSlot) >= 60 ? `${gapFrom(dlg.space.id, form.startSlot) / 60}h` : `${gapFrom(dlg.space.id, form.startSlot)}m`}`}><Select value={form.dur} onChange={(v) => setForm({ ...form, dur: v })} options={[30, 60, 90, 120, 180].map((m) => ({ value: String(m), label: m < 60 ? `${m} min` : `${m / 60} h`, disabled: m > gapFrom(dlg.space.id, form.startSlot) }))} /></Field>
              </div>
              <Field label="People" hint={`max ${dlg.space.capacity}`}><Input type="number" min={1} max={dlg.space.capacity} value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })} /></Field>
              {dlg.space.amenities.includes('Catering') && <Checkbox checked={form.catering} onChange={(v) => setForm({ ...form, catering: v })} label="Add catering (we will confirm the menu by email)" />}
              <div className="flex flex-wrap gap-1.5">{dlg.space.amenities.map((a) => <Badge key={a} tone="neutral">{a}</Badge>)}</div>
              {err && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] font-medium text-danger-soft-fg">{err}</p>}
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        {detail && (
          <DialogContent size="sm" title={detail.title} description={`${spaces.find((s) => s.id === detail.spaceId)?.name} · ${format(new Date(detail.start), 'EEE d MMM, HH:mm')}–${format(new Date(detail.end), 'HH:mm')}`} footer={<><Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>{(detail.userId === me.id || me.role !== 'requester') && <Button variant="outlineDanger" onClick={() => { cancel(detail.id); setDetail(null); toast.push({ tone: 'info', title: 'Booking cancelled' }) }}>Cancel booking</Button>}</>}>
            <div className="space-y-3 p-5 text-[13px]"><div className="flex justify-between"><span className="text-fg-muted">Organiser</span><UserChip id={detail.userId} size="sm" /></div><div className="flex justify-between"><span className="text-fg-muted">People</span><span>{detail.attendees}</span></div>{detail.catering && <div className="flex justify-between"><span className="text-fg-muted">Catering</span><Badge tone="accent">Requested</Badge></div>}</div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
