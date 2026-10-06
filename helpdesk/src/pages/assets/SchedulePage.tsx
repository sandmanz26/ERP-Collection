import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { addDays, addMonths, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { AlertTriangle, CalendarClock, CheckCheck, ChevronLeft, ChevronRight, Clock, MoreHorizontal, Pencil, Plus, Trash2, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Segmented } from '@/components/ui/checkbox'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { EmptyState } from '@/components/ui/misc'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { TaskStatusBadge, TaskTypeBadge, UserChip, PriorityBadge } from '@/components/shared/badges'
import { useLookups, useSpaceLabel } from '@/hooks/useLookups'
import { useMe, useStore } from '@/store/useStore'
import { format, fmtDate, fmtSmart } from '@/lib/format'
import { FREQ_LABEL } from '@/lib/labels'
import { FREQ_DAYS } from '@/lib/pm'
import { cn } from '@/lib/utils'
import { ScheduleFormDialog, useCompleteSchedule } from './forms'
import type { PmSchedule, Task } from '@/data/types'

const startOfToday = () => startOfDay(new Date())

/** Occurrences of a routine inside [from, to) projected from its next due date. */
function occurrences(p: PmSchedule, from: Date, to: Date) {
  const out: Date[] = []
  const step = FREQ_DAYS[p.frequency]
  let d = new Date(p.nextDueAt)
  if (d < from) { // overdue items show on "today", not on every missed day
    if (d < startOfToday() && from <= startOfToday() && startOfToday() < to) out.push(startOfToday())
    const skip = Math.ceil((from.getTime() - d.getTime()) / (step * 86_400_000))
    d = addDays(d, skip * step)
  }
  for (let i = 0; i < 400 && d < to; i++, d = addDays(d, step)) if (d >= from) out.push(d)
  return out
}

export function SchedulePage() {
  const me = useMe()!
  const nav = useNavigate()
  const toast = useToast()
  const [sp, setSp] = useSearchParams()
  const pms = useStore((s) => s.pmSchedules)
  const tasks = useStore((s) => s.tasks)
  const users = useStore((s) => s.users)
  const { generatePm, updateSchedule, removeSchedule } = useStore.getState()
  const { asset, vendor, team } = useLookups()
  const spaceLabel = useSpaceLabel()
  const done = useCompleteSchedule()
  const view = (sp.get('tampilan') as 'daftar' | 'kalender' | 'tugas') || 'daftar'
  const [month, setMonth] = React.useState(startOfMonth(new Date()))
  const [pickDay, setPickDay] = React.useState<Date | null>(startOfToday())
  const [who, setWho] = React.useState<string | undefined>(me.role === 'agent' ? me.id : undefined)
  const [form, setForm] = React.useState<{ open: boolean; id?: string }>({ open: false })
  const now = Date.now()
  const manage = me.role !== 'requester'

  const active = React.useMemo(() => pms.filter((p) => p.active && (!who || p.assigneeId === who)).sort((a, b) => a.nextDueAt.localeCompare(b.nextDueAt)), [pms, who])
  const day0 = startOfToday()
  const bucket = (p: PmSchedule) => {
    const d = new Date(p.nextDueAt)
    if (d < day0) return 'late'
    if (isSameDay(d, day0)) return 'today'
    if (d < addDays(day0, 8)) return 'week'
    if (d < addDays(day0, 31)) return 'month'
    return 'later'
  }
  const groups: [string, string, PmSchedule[]][] = [
    ['late', 'Terlambat', active.filter((p) => bucket(p) === 'late')],
    ['today', 'Hari ini', active.filter((p) => bucket(p) === 'today')],
    ['week', '7 hari ke depan', active.filter((p) => bucket(p) === 'week')],
    ['month', 'Bulan ini', active.filter((p) => bucket(p) === 'month')],
    ['later', 'Lebih lama', active.filter((p) => bucket(p) === 'later')],
  ]
  const lateN = groups[0][2].length
  const target = (p: PmSchedule) => (p.assetId ? asset.get(p.assetId)?.name : spaceLabel(p.spaceId))
  const owner = (p: PmSchedule) => (p.assigneeId ? users.find((u) => u.id === p.assigneeId)?.name : p.vendorId ? vendor.get(p.vendorId)?.name : team.get(p.teamId)?.name)
  const openTask = (p: PmSchedule) => { const t = generatePm(p.id); if (t) nav(`/tugas/${t.id}`) }

  const row = (p: PmSchedule) => {
    const late = new Date(p.nextDueAt).getTime() < now
    return (
      <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', late ? 'bg-danger-soft text-danger-soft-fg' : 'bg-primary-soft text-primary-soft-fg')}><CalendarClock className="size-[18px]" /></span>
        <div className="min-w-0 flex-1 basis-[240px]"><p className="truncate text-[13.5px] font-medium">{p.name}</p><p className="truncate text-[12px] text-fg-muted">{p.assetId ? <Link to={`/aset/${p.assetId}`} className="hover:underline">{target(p)}</Link> : target(p)} · {FREQ_LABEL[p.frequency]} · {owner(p)}</p></div>
        <div className="w-36 text-[12.5px]"><p className={cn('font-medium', late ? 'text-danger' : 'text-fg')}>{late ? 'Lewat · ' : ''}{fmtDate(p.nextDueAt)}</p><p className="text-fg-subtle">Terakhir {fmtDate(p.lastDoneAt)}</p></div>
        {manage && <div className="flex items-center gap-1.5">
          <Button variant={late ? 'primary' : 'secondary'} size="sm" onClick={() => done.open(p)}><CheckCheck /> Sudah dikerjakan</Button>
          <Menu><MenuTrigger asChild><Button variant="ghost" size="iconSm" aria-label={`Aksi ${p.name}`}><MoreHorizontal /></Button></MenuTrigger>
            <MenuContent><MenuItem icon={<Wrench />} onSelect={() => openTask(p)}>Buka tugas (checklist rinci)</MenuItem><MenuItem icon={<Pencil />} onSelect={() => setForm({ open: true, id: p.id })}>Ubah jadwal</MenuItem><MenuItem onSelect={() => { updateSchedule(p.id, { active: false }); toast.push({ tone: 'info', title: 'Jadwal dijeda' }) }}>Jeda jadwal</MenuItem><MenuSeparator /><MenuItem icon={<Trash2 />} danger onSelect={() => { removeSchedule(p.id); toast.push({ tone: 'info', title: 'Jadwal dihapus' }) }}>Hapus</MenuItem></MenuContent></Menu>
        </div>}
      </li>
    )
  }

  /* kalender */
  const gridStart = startOfWeek(month, { weekStartsOn: 1 })
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const itemsOn = (d: Date) => {
    const from = startOfDay(d), to = addDays(from, 1)
    const s = pms.filter((p) => p.active && (!who || p.assigneeId === who)).flatMap((p) => occurrences(p, from, to).map(() => p))
    const t = tasks.filter((w) => w.type !== 'preventive' && w.status !== 'completed' && w.status !== 'cancelled' && new Date(w.dueAt) >= from && new Date(w.dueAt) < to && (!who || w.assigneeId === who))
    return { s, t }
  }
  const pickItems = pickDay ? itemsOn(pickDay) : null

  /* tugas */
  const taskList = React.useMemo(() => tasks.filter((w) => !who || w.assigneeId === who).sort((a, b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0) || a.dueAt.localeCompare(b.dueAt)), [tasks, who])

  return (
    <div className="space-y-5">
      <PageHeader title="Jadwal maintenance" description="Perawatan berkala gedung dan aset — siapa yang bertanggung jawab, kapan jatuh tempo, dan sudah dikerjakan atau belum."
        actions={<>
          <Segmented value={view} onChange={(v) => { const n = new URLSearchParams(sp); n.set('tampilan', v); setSp(n, { replace: true }) }} options={[{ value: 'daftar', label: 'Daftar' }, { value: 'kalender', label: 'Kalender' }, { value: 'tugas', label: 'Semua tugas' }]} />
          {manage && <Button variant="primary" onClick={() => setForm({ open: true })}><Plus /> Tambah jadwal</Button>}
        </>} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Terlambat" value={lateN} sub="perlu dikerjakan sekarang" icon={<AlertTriangle />} accent={lateN ? 'danger' : 'success'} onClick={() => { const n = new URLSearchParams(sp); n.set('tampilan', 'daftar'); setSp(n) }} />
        <KpiCard label="Hari ini" value={groups[1][2].length} icon={<Clock />} accent="warning" />
        <KpiCard label="7 hari ke depan" value={groups[2][2].length} icon={<CalendarClock />} accent="accent" />
        <KpiCard label="Jadwal aktif" value={pms.filter((p) => p.active).length} sub={`${new Set(pms.filter((p) => p.assetId).map((p) => p.assetId)).size} aset tercakup`} icon={<Wrench />} accent="primary" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select className="w-[250px]" value={who} onChange={setWho} clearable onClear={() => setWho(undefined)} placeholder="Semua penanggung jawab" searchable options={users.filter((u) => u.role !== 'requester').map((u) => ({ value: u.id, label: u.name, description: u.title }))} />
        {me.role === 'agent' && who !== me.id && <Button variant="ghost" size="sm" onClick={() => setWho(me.id)}>Hanya milik saya</Button>}
      </div>

      {view === 'daftar' && (
        active.length === 0 ? <Card><EmptyState icon={<CalendarClock />} title="Belum ada jadwal" description="Tambahkan perawatan rutin: servis mesin, uji APAR, pembersihan tandon, pest control." action={manage ? <Button variant="primary" onClick={() => setForm({ open: true })}>Tambah jadwal</Button> : undefined} /></Card> : (
          <div className="space-y-5">{groups.filter(([, , l]) => l.length).map(([key, label, list]) => (
            <Card key={key} className={cn('overflow-hidden', key === 'late' && 'border-danger/40')}>
              <CardHeader title={<span className="flex items-center gap-2">{label}<Badge tone={key === 'late' ? 'danger' : 'neutral'} size="sm">{list.length}</Badge></span>} />
              <ul className="divide-y divide-border">{list.map(row)}</ul>
            </Card>
          ))}</div>
        )
      )}

      {view === 'kalender' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card>
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-[15px] font-semibold capitalize">{format(month, 'MMMM yyyy')}</h2>
              <div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label="Bulan sebelumnya" onClick={() => setMonth((m) => addMonths(m, -1))}><ChevronLeft /></Button><Button variant="secondary" size="sm" onClick={() => { setMonth(startOfMonth(new Date())); setPickDay(startOfToday()) }}>Hari ini</Button><Button variant="ghost" size="icon" aria-label="Bulan berikutnya" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight /></Button></div>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-7 gap-1.5 pb-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">{['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => <span key={d}>{d}</span>)}</div>
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((d) => {
                  const { s: all, t } = itemsOn(d)
                  const s = all.filter((p) => p.frequency !== 'daily')
                  const dailyN = all.length - s.length
                  const today = isSameDay(d, new Date())
                  const inMonth = isSameMonth(d, month)
                  const lateHere = today ? s.filter((p) => new Date(p.nextDueAt) < startOfToday()).length : 0
                  const total = all.length + t.length
                  const on = pickDay && isSameDay(d, pickDay)
                  return (
                    <button key={d.toISOString()} onClick={() => setPickDay(d)} aria-label={`${format(d, 'd MMMM')}: ${total} pekerjaan`} aria-pressed={!!on}
                      className={cn('flex min-h-[78px] flex-col rounded-lg border p-1.5 text-left transition-colors sm:min-h-[92px]', on ? 'border-primary bg-primary-soft/50' : today ? 'border-primary/50 bg-primary-soft/20' : 'border-border bg-surface hover:border-border-strong', !inMonth && 'opacity-45')}>
                      <span className={cn('text-[12px]', today ? 'font-bold text-primary' : 'text-fg-muted')}>{format(d, 'd')}</span>
                      <span className="mt-1 hidden flex-1 flex-col gap-0.5 sm:flex">
                        {s.slice(0, 2).map((p, i) => <span key={i} className={cn('truncate rounded px-1 text-[10.5px] font-medium leading-[16px]', new Date(p.nextDueAt) < startOfToday() && today ? 'bg-danger-soft text-danger-soft-fg' : 'bg-primary-soft text-primary-soft-fg')}>{p.name.split(' ').slice(0, 3).join(' ')}</span>)}
                        {(s.length > 2 || dailyN > 0) && <span className="px-1 text-[10.5px] text-fg-subtle">{s.length > 2 ? `+${s.length - 2} · ` : ''}{dailyN > 0 ? `${dailyN} rutin harian` : ''}</span>}
                      </span>
                      {total > 0 && <span className="mt-auto flex items-center gap-1 sm:hidden"><span className={cn('size-1.5 rounded-full', lateHere ? 'bg-danger' : 'bg-primary')} /><span className="text-[10.5px] text-fg-muted">{total}</span></span>}
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 text-[12px] text-fg-subtle">Jadwal berulang diproyeksikan dari jatuh tempo berikutnya. Item yang terlambat ditampilkan di hari ini.</p>
            </div>
          </Card>
          <Card className="self-start">
            <CardHeader title={pickDay ? format(pickDay, 'EEEE, d MMMM yyyy') : 'Pilih tanggal'} description={pickItems ? `${pickItems.s.length + pickItems.t.length} pekerjaan` : undefined} />
            {!pickItems || pickItems.s.length + pickItems.t.length === 0 ? <p className="px-4 py-6 text-[13px] text-fg-muted">Tidak ada pekerjaan terjadwal.</p> : (
              <ul className="divide-y divide-border">
                {[...new Map(pickItems.s.map((p) => [p.id, p])).values()].map((p) => <li key={p.id} className="space-y-2 px-4 py-3"><p className="text-[13.5px] font-medium">{p.name}</p><p className="text-[12px] text-fg-muted">{target(p)} · {owner(p)}</p>{manage && <div className="flex gap-1.5"><Button size="sm" variant="primary" onClick={() => done.open(p)}><CheckCheck /> Sudah dikerjakan</Button><Button size="sm" variant="ghost" onClick={() => openTask(p)}>Buka tugas</Button></div>}</li>)}
                {pickItems.t.map((w) => <li key={w.id}><Link to={`/tugas/${w.id}`} className="block space-y-1 px-4 py-3 hover:bg-bg-muted"><div className="flex items-center gap-2"><TaskTypeBadge type={w.type} /><span className="tnum text-[12px] text-fg-subtle">{w.number}</span></div><p className="text-[13.5px] font-medium">{w.title}</p></Link></li>)}
              </ul>
            )}
          </Card>
        </div>
      )}

      {view === 'tugas' && (
        <Card className="overflow-hidden">
          <CardHeader title="Semua tugas maintenance" description="Perbaikan dari tiket, pekerjaan berkala dan inspeksi." actions={manage && <Button variant="secondary" size="sm" onClick={() => nav('/tugas/baru')}><Plus /> Tugas baru</Button>} />
          {taskList.length === 0 ? <EmptyState title="Belum ada tugas" /> : (
            <ul className="divide-y divide-border">
              {taskList.slice(0, 60).map((w: Task) => {
                const over = w.status !== 'completed' && w.status !== 'cancelled' && new Date(w.dueAt).getTime() < now
                return (
                  <li key={w.id}><Link to={`/tugas/${w.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-bg-muted">
                    <PriorityBadge priority={w.priority} compact />
                    <span className="min-w-0 flex-1 basis-[240px]"><span className="block truncate text-[13.5px] font-medium"><span className="tnum mr-2 text-[12px] font-normal text-fg-subtle">{w.number}</span>{w.title}</span><span className="block truncate text-[12px] text-fg-muted">{w.assetId ? asset.get(w.assetId)?.name : spaceLabel(w.spaceId)}</span></span>
                    <TaskTypeBadge type={w.type} /><TaskStatusBadge status={w.status} />
                    <span className={cn('w-36 text-[12.5px]', over ? 'font-semibold text-danger' : 'text-fg-muted')}>{w.status === 'completed' ? `Selesai ${fmtSmart(w.completedAt)}` : `${over ? 'Lewat · ' : 'Target '}${fmtSmart(w.dueAt)}`}</span>
                    <span className="w-36"><UserChip id={w.assigneeId} size="sm" empty={w.vendorId ? vendor.get(w.vendorId)?.name ?? 'Vendor' : 'Belum ditugaskan'} /></span>
                  </Link></li>
                )
              })}
            </ul>
          )}
        </Card>
      )}

      <ScheduleFormDialog open={form.open} onOpenChange={(v) => setForm((f) => ({ ...f, open: v }))} schedule={pms.find((p) => p.id === form.id)} />
      {done.node}
    </div>
  )
}
