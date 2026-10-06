import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { addDays, addMonths, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { Ban, CalendarDays, Check, ChevronLeft, ChevronRight, Download, FileText, Lock, Plus, Printer, Search, Users, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Segmented } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/misc'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { UserChip } from '@/components/shared/badges'
import { useLookups } from '@/hooks/useLookups'
import { useNow } from '@/hooks/useNow'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useMe, useStore } from '@/store/useStore'
import { downloadCsv } from '@/lib/csv'
import { format, fmtDateTime, fmtMoneyFull, fmtSmart } from '@/lib/format'
import { BOOKING_STATUS } from '@/lib/labels'
import { quote } from '@/lib/rental'
import { cn } from '@/lib/utils'
import { BookingDialog, type BookingPreset } from './BookingDialog'
import type { Booking, BookingStatus, Space } from '@/data/types'

const hhmm = (d: Date) => format(d, 'HH:mm')
const live = (b: Booking) => b.status === 'approved' || b.status === 'pending'

export function ReservasiPage() {
  const me = useMe()!
  const [sp, setSp] = useSearchParams()
  const bookings = useStore((s) => s.bookings)
  const tab = (sp.get('tab') as 'jadwal' | 'daftar' | 'fasilitas') || 'jadwal'
  const staff = me.role !== 'requester'
  const pendingN = bookings.filter((b) => b.status === 'pending' && (staff || b.userId === me.id)).length
  const [dlg, setDlg] = React.useState<{ open: boolean; preset?: BookingPreset }>({ open: false })
  const openBooking = (preset?: BookingPreset) => setDlg({ open: true, preset })
  const go = (t: string) => { const n = new URLSearchParams(sp); n.set('tab', t); setSp(n, { replace: true }) }

  return (
    <div className="space-y-5">
      <PageHeader title="Reservasi & sewa fasilitas" description="Ruang meeting, ruang training, aula, kantin dan lapangan — untuk karyawan maupun pihak luar. Pengajuan yang perlu persetujuan ditahan sampai diputuskan." actions={<Button variant="primary" onClick={() => openBooking()}><Plus /> {staff ? 'Reservasi baru' : 'Ajukan reservasi'}</Button>} />
      <Tabs value={tab} onChange={go} items={[{ value: 'jadwal', label: 'Jadwal', icon: <CalendarDays /> }, { value: 'daftar', label: staff ? 'Semua pengajuan' : 'Pengajuan saya', count: pendingN || undefined, icon: <FileText /> }, { value: 'fasilitas', label: 'Fasilitas & tarif', icon: <Users /> }]} />
      {tab === 'jadwal' && <ScheduleTab openBooking={openBooking} />}
      {tab === 'daftar' && <ListTab openBooking={openBooking} />}
      {tab === 'fasilitas' && <CatalogTab openBooking={openBooking} />}
      <BookingDialog open={dlg.open} onOpenChange={(v) => setDlg((d) => ({ ...d, open: v }))} preset={dlg.preset} />
    </div>
  )
}

/* ------------------------------------------------------------------ jadwal */

function ScheduleTab({ openBooking }: { openBooking: (p?: BookingPreset) => void }) {
  const me = useMe()!
  const spaces = useStore((s) => s.spaces).filter((s) => s.rental)
  const bookings = useStore((s) => s.bookings)
  const { building } = useLookups()
  const now = useNow(60_000)
  const phone = useMediaQuery('(max-width: 639px)')
  const [pick, setPick] = React.useState<'hari' | 'bulan' | null>(null)
  const mode = pick ?? (phone ? 'bulan' : 'hari')
  const setMode = setPick
  const [day, setDay] = React.useState(startOfDay(new Date()))
  const [month, setMonth] = React.useState(startOfMonth(new Date()))
  const [fid, setFid] = React.useState<string>(spaces[0]?.id ?? '')
  const [detail, setDetail] = React.useState<Booking | null>(null)
  const isToday = isSameDay(day, new Date())
  const staff = me.role !== 'requester'

  const dayBookings = React.useMemo(() => bookings.filter((b) => live(b) && isSameDay(new Date(b.start), day)), [bookings, day])
  const START = 7, END = 21, SLOTS = (END - START) * 2
  const slotTime = (d: Date, i: number) => { const x = new Date(d); x.setHours(START + Math.floor(i / 2), i % 2 ? 30 : 0, 0, 0); return x }
  const taken = (spaceId: string, i: number) => { const a = slotTime(day, i).getTime(), z = a + 30 * 60_000; return dayBookings.some((b) => b.spaceId === spaceId && new Date(b.start).getTime() < z && new Date(b.end).getTime() > a) }
  const nowPct = isToday ? ((now - slotTime(day, 0).getTime()) / (SLOTS * 30 * 60_000)) * 100 : -1
  const pos = (d: Date) => ((d.getTime() - slotTime(day, 0).getTime()) / (SLOTS * 30 * 60_000)) * 100

  const gridStart = startOfWeek(month, { weekStartsOn: 1 })
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const facility = spaces.find((s) => s.id === fid) ?? spaces[0]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={mode} onChange={setMode} options={[{ value: 'hari', label: 'Per hari' }, { value: 'bulan', label: 'Per bulan' }]} />
        {mode === 'hari' ? (
          <>
            <div className="inline-flex items-center rounded-lg border border-border bg-surface shadow-card"><Button variant="ghost" size="icon" aria-label="Hari sebelumnya" onClick={() => setDay((d) => addDays(d, -1))}><ChevronLeft /></Button><button className="px-2 text-[13.5px] font-semibold" onClick={() => setDay(startOfDay(new Date()))} title="Ke hari ini">{isToday ? 'Hari ini · ' : ''}{format(day, 'EEE d MMM')}</button><Button variant="ghost" size="icon" aria-label="Hari berikutnya" onClick={() => setDay((d) => addDays(d, 1))}><ChevronRight /></Button></div>
            <DatePicker value={format(day, 'yyyy-MM-dd')} onChange={(v) => v && setDay(startOfDay(new Date(`${v}T00:00`)))} clearable={false} className="w-40" />
          </>
        ) : (
          <>
            <Select className="w-[230px]" value={fid} onChange={setFid} options={spaces.map((s) => ({ value: s.id, label: s.name }))} />
            <div className="inline-flex items-center rounded-lg border border-border bg-surface shadow-card"><Button variant="ghost" size="icon" aria-label="Bulan sebelumnya" onClick={() => setMonth((m) => addMonths(m, -1))}><ChevronLeft /></Button><button className="min-w-32 px-2 text-center text-[13.5px] font-semibold capitalize" onClick={() => setMonth(startOfMonth(new Date()))}>{format(month, 'MMMM yyyy')}</button><Button variant="ghost" size="icon" aria-label="Bulan berikutnya" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight /></Button></div>
          </>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-3 text-[12px] text-fg-muted"><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm bg-primary" />Milik Anda</span><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm bg-info-soft ring-1 ring-info/30" />Disetujui</span><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm border border-dashed border-warning bg-warning-soft" />Menunggu</span><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm bg-neutral-soft ring-1 ring-border-strong [background-image:repeating-linear-gradient(45deg,transparent,transparent_2px,hsl(var(--border-strong))_2px,hsl(var(--border-strong))_3px)]" />Ditutup</span></div>
      </div>

      {mode === 'hari' ? (
        <Card className="overflow-hidden">
          <div className="scrollbar-thin overflow-x-auto">
            <div className="min-w-[1320px]">
              <div className="grid grid-cols-[170px_1fr] border-b border-border bg-surface-sunken text-[11px] font-medium text-fg-subtle sm:grid-cols-[210px_1fr]"><div className="px-3 py-2">{spaces.length} fasilitas</div><div className="grid" style={{ gridTemplateColumns: `repeat(${END - START}, 1fr)` }}>{Array.from({ length: END - START }, (_, i) => <span key={i} className="tnum border-l border-border px-1.5 py-2">{String(START + i).padStart(2, '0')}:00</span>)}</div></div>
              {spaces.map((r) => {
                const rent = r.rental!
                return (
                  <div key={r.id} className="grid grid-cols-[170px_1fr] border-b border-border last:border-0 sm:grid-cols-[210px_1fr]">
                    <div className="sticky left-0 z-[2] border-r border-border bg-surface px-3 py-2.5"><p className="truncate text-[13.5px] font-semibold">{r.name}</p><p className="flex items-center gap-1.5 text-[11.5px] text-fg-muted"><Users className="size-3" />{r.capacity} · {building.get(r.buildingId)?.code}</p><p className="text-[11px] text-fg-subtle">{rent.needsApproval ? 'Perlu persetujuan' : 'Langsung'}</p></div>
                    <div className="relative h-[68px]">
                      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${SLOTS}, 1fr)` }}>
                        {Array.from({ length: SLOTS }, (_, i) => {
                          const t = slotTime(day, i)
                          const h = t.getHours() + t.getMinutes() / 60
                          const closed = h < rent.openHour || h >= rent.closeHour
                          const past = isToday && t.getTime() + 30 * 60_000 <= now || t.getTime() + 30 * 60_000 < Date.now() - 86_400_000
                          const busy = taken(r.id, i)
                          return <button key={i} disabled={closed || past || busy} onClick={() => openBooking({ spaceId: r.id, date: format(day, 'yyyy-MM-dd'), start: h })} aria-label={`Pesan ${r.name} pukul ${hhmm(t)}`} className={cn('border-l first:border-l-0 transition-colors', i % 2 ? 'border-border/40' : 'border-border', closed ? 'bg-neutral-soft/70 [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,hsl(var(--border)/0.6)_4px,hsl(var(--border)/0.6)_5px)]' : past ? 'bg-neutral-soft/40' : !busy && 'hover:bg-primary-soft/70')} />
                        })}
                      </div>
                      {dayBookings.filter((b) => b.spaceId === r.id).map((b) => {
                        const s = new Date(b.start), e = new Date(b.end)
                        const own = b.userId === me.id
                        return (
                          <button key={b.id} onClick={() => setDetail(b)} style={{ left: `calc(${pos(s)}% + 2px)`, width: `calc(${pos(e) - pos(s)}% - 4px)` }}
                            title={`${b.title} · ${hhmm(s)}–${hhmm(e)} · ${b.renterName}`} className={cn('absolute inset-y-1.5 overflow-hidden rounded-md px-2 py-1 text-left text-[11.5px] leading-tight shadow-card transition-transform hover:z-[1] hover:-translate-y-px', b.kind === 'block' ? 'bg-neutral-soft text-fg-muted ring-1 ring-border-strong' : b.status === 'pending' ? 'border border-dashed border-warning bg-warning-soft text-warning-soft-fg' : own ? 'bg-primary text-primary-fg' : 'bg-info-soft text-info-soft-fg ring-1 ring-inset ring-info/20')}>
                            <span className="flex items-center gap-1 font-semibold">{b.kind === 'block' && <Lock className="size-3 shrink-0" />}<span className="truncate">{b.title}</span></span><span className="block truncate opacity-80">{hhmm(s)}–{hhmm(e)}{b.renterType === 'external' ? ' · eksternal' : ''}</span>
                          </button>
                        )
                      })}
                      {nowPct >= 0 && nowPct <= 100 && <span aria-hidden className="pointer-events-none absolute inset-y-0 z-[1] w-px bg-danger" style={{ left: `${nowPct}%` }} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card><CardBody className="p-3">
            <div className="grid grid-cols-7 gap-1.5 pb-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">{['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => <span key={d}>{d}</span>)}</div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((d) => {
                const list = bookings.filter((b) => live(b) && b.spaceId === facility.id && isSameDay(new Date(b.start), d)).sort((a, b) => a.start.localeCompare(b.start))
                const hours = list.reduce((t, b) => t + (new Date(b.end).getTime() - new Date(b.start).getTime()) / 3_600_000, 0)
                const total = facility.rental!.closeHour - facility.rental!.openHour
                const full = hours / total
                const isPast = d < startOfDay(new Date())
                const on = isSameDay(d, day)
                return (
                  <button key={d.toISOString()} onClick={() => setDay(startOfDay(d))} aria-pressed={on} aria-label={`${format(d, 'd MMMM')}: ${list.length} reservasi`}
                    className={cn('flex min-h-[78px] flex-col rounded-lg border p-1.5 text-left transition-colors sm:min-h-[92px]', on ? 'border-primary bg-primary-soft/50' : 'border-border bg-surface hover:border-border-strong', !isSameMonth(d, month) && 'opacity-40', isPast && 'bg-surface-sunken')}>
                    <span className="flex items-center justify-between"><span className={cn('text-[12px]', isSameDay(d, new Date()) ? 'font-bold text-primary' : 'text-fg-muted')}>{format(d, 'd')}</span>{list.length > 0 && <span className={cn('size-2 rounded-full', full > 0.7 ? 'bg-danger' : full > 0.3 ? 'bg-warning' : 'bg-success')} aria-label={full > 0.7 ? 'Hampir penuh' : 'Sebagian terpakai'} />}</span>
                    <span className="mt-1 hidden flex-col gap-0.5 sm:flex">{list.slice(0, 2).map((b) => <span key={b.id} className={cn('truncate rounded px-1 text-[10.5px] font-medium leading-[16px]', b.status === 'pending' ? 'bg-warning-soft text-warning-soft-fg' : b.kind === 'block' ? 'bg-neutral-soft text-fg-muted' : 'bg-info-soft text-info-soft-fg')}>{hhmm(new Date(b.start))} {b.title}</span>)}{list.length > 2 && <span className="px-1 text-[10.5px] text-fg-subtle">+{list.length - 2} lagi</span>}</span>
                    {list.length > 0 && <span className="mt-auto text-[10.5px] text-fg-muted sm:hidden">{list.length}×</span>}
                  </button>
                )
              })}
            </div>
          </CardBody></Card>
          <Card className="self-start">
            <div className="border-b border-border px-4 py-3"><h3 className="text-[14px] font-semibold capitalize">{format(day, 'EEEE, d MMMM')}</h3><p className="text-[12px] text-fg-muted">{facility.name} · buka {facility.rental!.openHour}:00–{facility.rental!.closeHour}:00</p></div>
            {(() => { const list = bookings.filter((b) => live(b) && b.spaceId === facility.id && isSameDay(new Date(b.start), day)).sort((a, b) => a.start.localeCompare(b.start)); return list.length === 0 ? <p className="px-4 py-5 text-[13px] text-fg-muted">Belum ada reservasi — tersedia sepanjang hari.</p> : <ul className="divide-y divide-border">{list.map((b) => <li key={b.id}><button onClick={() => setDetail(b)} className="block w-full px-4 py-3 text-left hover:bg-bg-muted"><div className="flex items-center justify-between gap-2"><span className="tnum text-[12.5px] font-semibold">{hhmm(new Date(b.start))}–{hhmm(new Date(b.end))}</span><Badge tone={BOOKING_STATUS[b.status].tone} size="sm">{BOOKING_STATUS[b.status].label}</Badge></div><p className="mt-0.5 text-[13.5px] font-medium">{b.title}</p><p className="text-[12px] text-fg-muted">{b.renterName}{b.company ? ` · ${b.company}` : ''}</p></button></li>)}</ul> })()}
            <div className="border-t border-border p-3"><Button variant="primary" className="w-full" onClick={() => openBooking({ spaceId: facility.id, date: format(day, 'yyyy-MM-dd') })}><Plus /> Pesan di tanggal ini</Button>{staff && <BlockButton spaceId={facility.id} date={day} />}</div>
          </Card>
        </div>
      )}
      <DetailDialog booking={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

function BlockButton({ spaceId, date }: { spaceId: string; date: Date }) {
  const createBlock = useStore((s) => s.createBlock)
  const toast = useToast()
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [from, setFrom] = React.useState('08:00')
  const [to, setTo] = React.useState('17:00')
  const [err, setErr] = React.useState('')
  return (
    <>
      <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => { setOpen(true); setErr('') }}><Lock /> Tutup untuk maintenance</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm" title="Tutup fasilitas" description={`${format(date, 'EEEE, d MMMM')} — tidak bisa dipesan selama waktu ini.`} footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button variant="primary" disabled={title.trim().length < 3} onClick={() => { const d = format(date, 'yyyy-MM-dd'); const r = createBlock(spaceId, new Date(`${d}T${from}`).toISOString(), new Date(`${d}T${to}`).toISOString(), title.trim()); if (!r.ok) return setErr(r.error); toast.push({ tone: 'success', title: 'Fasilitas ditutup' }); setOpen(false); setTitle('') }}>Tutup</Button></>}>
          <div className="space-y-3 p-5"><Field label="Alasan" required><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Servis AC, renovasi lantai" autoFocus /></Field><div className="grid grid-cols-2 gap-3"><Field label="Dari"><Input type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="Sampai"><Input type="time" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>{err && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] font-medium text-danger-soft-fg">{err}</p>}</div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ------------------------------------------------------------------ rincian + bukti */

function useActions() {
  const me = useMe()!
  const { decideBooking, cancelBooking } = useStore.getState()
  const toast = useToast()
  const [rej, setRej] = React.useState<Booking | null>(null)
  const [why, setWhy] = React.useState('')
  const approve = (b: Booking) => { decideBooking(b.id, true); toast.push({ tone: 'success', title: `${b.number} disetujui`, description: 'Pemohon sudah diberi tahu.' }) }
  const cancel = (b: Booking) => { cancelBooking(b.id); toast.push({ tone: 'info', title: `${b.number} dibatalkan`, description: 'Slot kembali tersedia.' }) }
  const node = (
    <Dialog open={!!rej} onOpenChange={(v) => !v && setRej(null)}>
      {rej && <DialogContent size="sm" title="Tolak pengajuan" description={`${rej.number} · ${rej.title}`} footer={<><Button variant="ghost" onClick={() => setRej(null)}>Batal</Button><Button variant="danger" disabled={why.trim().length < 4} onClick={() => { decideBooking(rej.id, false, why.trim()); toast.push({ tone: 'info', title: `${rej.number} ditolak` }); setRej(null); setWhy('') }}>Tolak</Button></>}><div className="p-5"><Field label="Alasan" required hint="dilihat pemohon"><Textarea autoFocus rows={3} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="mis. Bentrok dengan audit pelanggan" /></Field></div></DialogContent>}
    </Dialog>
  )
  return { approve, cancel, reject: setRej, node, canDecide: me.role !== 'requester' }
}

function DetailDialog({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  const me = useMe()!
  const spaces = useStore((s) => s.spaces)
  const addons = useStore((s) => s.addons)
  const live = useStore((s) => s.bookings.find((b) => b.id === booking?.id)) ?? booking
  const act = useActions()
  const [proof, setProof] = React.useState(false)
  const space = spaces.find((s) => s.id === live?.spaceId)
  if (!live || !space) return null
  const mine = live.userId === me.id
  const q = quote(space, live.renterType, new Date(live.start), new Date(live.end), live.addonIds, live.attendees, addons)
  const future = new Date(live.end).getTime() > Date.now()
  return (
    <>
      <Dialog open={!!booking} onOpenChange={(v) => !v && onClose()}>
        <DialogContent size="md" title={live.title} description={`${space.name} · ${fmtSmart(live.start)}–${hhmm(new Date(live.end))}`}
          footer={<>
            <Button variant="ghost" onClick={onClose}>Tutup</Button>
            {live.status === 'approved' && live.kind === 'booking' && <Button variant="secondary" onClick={() => setProof(true)}><Printer /> Bukti reservasi</Button>}
            {live.status === 'pending' && act.canDecide && <><Button variant="outlineDanger" onClick={() => act.reject(live)}>Tolak</Button><Button variant="primary" onClick={() => { act.approve(live); onClose() }}><Check /> Setujui</Button></>}
            {(live.status === 'approved' || live.status === 'pending') && future && (mine || act.canDecide) && <Button variant="outlineDanger" onClick={() => { act.cancel(live); onClose() }}>{live.kind === 'block' ? 'Buka kembali' : 'Batalkan'}</Button>}
          </>}>
          <div className="space-y-3 p-5 text-[13px]">
            <div className="flex items-center gap-2"><Badge tone={BOOKING_STATUS[live.status].tone} dot>{BOOKING_STATUS[live.status].label}</Badge><Badge tone={live.renterType === 'external' ? 'purple' : 'neutral'}>{live.kind === 'block' ? 'Ditutup' : live.renterType === 'external' ? 'Eksternal' : 'Internal'}</Badge><span className="tnum text-fg-subtle">{live.number}</span></div>
            {([['Penyewa', `${live.renterName}${live.company ? ` — ${live.company}` : ''}`], ['Kontak', live.phone ?? '—'], ['Peserta', live.kind === 'block' ? '—' : `${live.attendees} orang`], ['Tambahan', live.addonIds.length ? addons.filter((a) => live.addonIds.includes(a.id)).map((a) => a.name).join(', ') : '—'], ['Catatan', live.note ?? '—'], ['Biaya', live.kind === 'block' ? '—' : live.fee > 0 ? fmtMoneyFull(live.fee) : 'Gratis'], ['Diajukan', fmtDateTime(live.createdAt)]] as [string, string][]).map(([k, v]) => <div key={k} className="grid grid-cols-[90px_1fr] gap-2"><span className="text-fg-muted">{k}</span><span className="break-words">{v}</span></div>)}
            {live.decidedAt && <div className="grid grid-cols-[90px_1fr] gap-2"><span className="text-fg-muted">Keputusan</span><span><UserChip id={live.decidedBy} size="sm" /> <span className="text-fg-muted">· {fmtDateTime(live.decidedAt)}</span></span></div>}
            {live.rejectReason && <p className="rounded-lg bg-danger-soft px-3 py-2 text-danger-soft-fg"><strong>Alasan penolakan:</strong> {live.rejectReason}</p>}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={proof} onOpenChange={setProof}>
        <DialogContent size="md" title="Bukti reservasi" footer={<><Button variant="ghost" onClick={() => setProof(false)}>Tutup</Button><Button variant="primary" onClick={() => window.print()}><Printer /> Cetak</Button></>}>
          <div className="bg-surface-sunken p-5"><div className="mx-auto max-w-md space-y-4 rounded-xl border border-border bg-white p-6 text-slate-900"><div className="flex items-start justify-between border-b border-slate-200 pb-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Bukti reservasi</p><p className="text-[18px] font-bold">{live.number}</p></div><p className="text-right text-[12px] text-slate-500">PT Nusantara Manufaktur<br />Pabrik Cikarang</p></div>
            <dl className="space-y-1.5 text-[13px]">{([['Fasilitas', space.name], ['Acara', live.title], ['Tanggal', format(new Date(live.start), 'EEEE, d MMMM yyyy')], ['Waktu', `${hhmm(new Date(live.start))}–${hhmm(new Date(live.end))}`], ['Penyewa', `${live.renterName}${live.company ? `, ${live.company}` : ''}`], ['Peserta', `${live.attendees} orang`]] as [string, string][]).map(([k, v]) => <div key={k} className="grid grid-cols-[90px_1fr]"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
            <div className="space-y-1 border-t border-slate-200 pt-3 text-[13px]"><div className="flex justify-between"><span className="text-slate-500">Sewa ({q.hours} jam)</span><span>{q.base ? fmtMoneyFull(q.base) : 'Gratis'}</span></div>{q.addons.map((x) => <div key={x.addon.id} className="flex justify-between"><span className="text-slate-500">{x.addon.name}</span><span>{fmtMoneyFull(x.amount)}</span></div>)}<div className="flex justify-between pt-1 text-[15px] font-bold"><span>Total</span><span>{fmtMoneyFull(live.fee)}</span></div></div>
            <p className="rounded bg-slate-100 px-3 py-2 text-[12px] text-slate-600">Disetujui oleh {useStore.getState().users.find((u) => u.id === live.decidedBy)?.name ?? 'Sistem'}{live.decidedAt ? `, ${fmtDateTime(live.decidedAt)}` : ''}. Tunjukkan bukti ini ke petugas satpam saat tiba.</p></div></div>
        </DialogContent>
      </Dialog>
      {act.node}
    </>
  )
}

/* ------------------------------------------------------------------ daftar */

function ListTab({ openBooking }: { openBooking: (p?: BookingPreset) => void }) {
  const me = useMe()!
  const toast = useToast()
  const bookings = useStore((s) => s.bookings)
  const spaces = useStore((s) => s.spaces)
  const [status, setStatus] = React.useState<BookingStatus | 'all'>(me.role === 'requester' ? 'all' : 'pending')
  const [fid, setFid] = React.useState<string>()
  const [q, setQ] = React.useState('')
  const [scope, setScope] = React.useState<'upcoming' | 'past'>('upcoming')
  const [detail, setDetail] = React.useState<Booking | null>(null)
  const act = useActions()
  const staff = me.role !== 'requester'
  const mineOnly = !staff
  const base = bookings.filter((b) => b.kind === 'booking' && (!mineOnly || b.userId === me.id))
  const rows = base.filter((b) => (status === 'all' || b.status === status) && (!fid || b.spaceId === fid) && (scope === 'upcoming' ? new Date(b.end).getTime() >= Date.now() || b.status === 'pending' : new Date(b.end).getTime() < Date.now() && b.status !== 'pending') && (!q || `${b.number} ${b.title} ${b.renterName} ${b.company ?? ''}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (scope === 'upcoming' ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start)))
  const count = (s: BookingStatus) => base.filter((b) => b.status === s && (new Date(b.end).getTime() >= Date.now() || s === 'pending')).length
  const sp = (id: string) => spaces.find((s) => s.id === id)
  const revenue = rows.filter((b) => b.status === 'approved' && b.renterType === 'external').reduce((t, b) => t + b.fee, 0)

  return (
    <div className="space-y-4">
      {staff && count('pending') > 0 && status !== 'pending' && <button onClick={() => setStatus('pending')} className="flex w-full items-center gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-left text-[13.5px] text-warning-soft-fg"><FileText className="size-5 shrink-0" /><span><strong>{count('pending')} pengajuan menunggu keputusan Anda.</strong> Klik untuk melihat.</span></button>}
      <div className="flex flex-wrap items-center gap-2">
        <Tabs variant="pill" value={status} onChange={setStatus} items={[{ value: 'all', label: 'Semua' }, { value: 'pending', label: 'Menunggu', count: count('pending') }, { value: 'approved', label: 'Disetujui' }, { value: 'rejected', label: 'Ditolak' }, { value: 'cancelled', label: 'Dibatalkan' }]} />
        <Segmented size="sm" value={scope} onChange={setScope} options={[{ value: 'upcoming', label: 'Mendatang' }, { value: 'past', label: 'Riwayat' }]} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64"><Input leading={<Search className="size-4 text-fg-subtle" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nomor, acara, penyewa" aria-label="Cari reservasi" /></div>
        <Select className="w-[200px]" value={fid} onChange={setFid} clearable onClear={() => setFid(undefined)} placeholder="Semua fasilitas" options={spaces.filter((s) => s.rental).map((s) => ({ value: s.id, label: s.name }))} />
        {staff && <Button variant="secondary" size="sm" className="ml-auto" onClick={() => { downloadCsv('reservasi.csv', [['Nomor', 'Fasilitas', 'Acara', 'Penyewa', 'Jenis', 'Mulai', 'Selesai', 'Biaya', 'Status'], ...rows.map((b) => [b.number, sp(b.spaceId)?.name, b.title, `${b.renterName}${b.company ? ` (${b.company})` : ''}`, b.renterType, b.start, b.end, b.fee, BOOKING_STATUS[b.status].label])]); toast.push({ tone: 'success', title: `${rows.length} reservasi diekspor` }) }}><Download /> Ekspor</Button>}
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? <EmptyState icon={<CalendarDays />} title="Tidak ada reservasi" description={status === 'pending' ? 'Tidak ada pengajuan yang menunggu.' : 'Coba ubah filter, atau buat reservasi baru.'} action={<Button variant="primary" onClick={() => openBooking()}>Ajukan reservasi</Button>} /> : (
          <ul className="divide-y divide-border">
            {rows.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                <button onClick={() => setDetail(b)} className="flex min-w-0 flex-1 basis-[260px] items-start gap-3 text-left">
                  <span className="grid w-14 shrink-0 place-items-center rounded-lg bg-surface-sunken py-1.5 text-center"><span className="text-[10.5px] font-semibold uppercase text-fg-subtle">{format(new Date(b.start), 'MMM')}</span><span className="tnum text-[18px] font-bold leading-none">{format(new Date(b.start), 'd')}</span></span>
                  <span className="min-w-0"><span className="block truncate text-[14px] font-medium">{b.title}</span><span className="block truncate text-[12.5px] text-fg-muted">{sp(b.spaceId)?.name} · {hhmm(new Date(b.start))}–{hhmm(new Date(b.end))} · {b.attendees} orang</span><span className="block truncate text-[12px] text-fg-subtle">{b.renterName}{b.company ? ` — ${b.company}` : ''} · <span className="tnum">{b.number}</span></span></span>
                </button>
                <div className="flex flex-wrap items-center gap-2"><Badge tone={b.renterType === 'external' ? 'purple' : 'neutral'}>{b.renterType === 'external' ? 'Eksternal' : 'Internal'}</Badge><span className="tnum w-24 text-right text-[13px] font-medium">{b.fee > 0 ? fmtMoneyFull(b.fee) : 'Gratis'}</span><Badge tone={BOOKING_STATUS[b.status].tone} dot>{BOOKING_STATUS[b.status].label}</Badge></div>
                <div className="flex items-center gap-1.5">
                  {b.status === 'pending' && act.canDecide && <><Button variant="primary" size="sm" onClick={() => act.approve(b)}><Check /> Setujui</Button><Button variant="outlineDanger" size="sm" onClick={() => act.reject(b)}><X /> Tolak</Button></>}
                  {(b.status === 'pending' || b.status === 'approved') && new Date(b.end).getTime() > Date.now() && (b.userId === me.id) && <Button variant="ghost" size="sm" onClick={() => act.cancel(b)}><Ban /> Batalkan</Button>}
                  <Button variant="ghost" size="sm" onClick={() => setDetail(b)}>Detail</Button>
                </div>
                {b.status === 'rejected' && b.rejectReason && <p className="w-full rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] text-danger-soft-fg"><strong>Ditolak:</strong> {b.rejectReason}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {staff && revenue > 0 && <p className="text-[12.5px] text-fg-muted">Pendapatan sewa eksternal yang disetujui pada daftar ini: <strong className="tnum text-fg">{fmtMoneyFull(revenue)}</strong></p>}
      <DetailDialog booking={detail} onClose={() => setDetail(null)} />
      {act.node}
    </div>
  )
}

/* ------------------------------------------------------------------ katalog */

function CatalogTab({ openBooking }: { openBooking: (p?: BookingPreset) => void }) {
  const spaces = useStore((s) => s.spaces).filter((s): s is Space & { rental: NonNullable<Space['rental']> } => !!s.rental)
  const addons = useStore((s) => s.addons)
  const { building } = useLookups()
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {spaces.map((s) => (
        <Card key={s.id}><CardBody className="flex h-full flex-col gap-3 p-4">
          <div><div className="flex items-start justify-between gap-2"><h3 className="text-[15px] font-semibold">{s.name}</h3><Badge tone={s.rental.needsApproval ? 'warning' : 'success'} size="sm">{s.rental.needsApproval ? 'Perlu persetujuan' : 'Langsung'}</Badge></div><p className="text-[12.5px] text-fg-muted">{building.get(s.buildingId)?.name} · {s.capacity} orang · buka {s.rental.openHour}:00–{s.rental.closeHour}:00</p></div>
          {s.rental.description && <p className="text-[13px] text-fg-muted">{s.rental.description}</p>}
          <div className="flex flex-wrap gap-1">{s.rental.amenities.map((a) => <Badge key={a} tone="neutral" size="sm">{a}</Badge>)}</div>
          <dl className="grid grid-cols-2 gap-2 rounded-lg bg-surface-sunken p-2.5 text-center"><div><dt className="text-[11px] text-fg-subtle">Karyawan</dt><dd className="tnum text-[14px] font-semibold">{s.rental.rateInternal ? `${fmtMoneyFull(s.rental.rateInternal)}/jam` : 'Gratis'}</dd></div><div><dt className="text-[11px] text-fg-subtle">Pihak luar</dt><dd className="tnum text-[14px] font-semibold">{fmtMoneyFull(s.rental.rateExternal)}/jam</dd></div></dl>
          {s.rental.addonIds.length > 0 && <p className="text-[12px] text-fg-muted"><span className="font-medium text-fg">Tambahan:</span> {addons.filter((a) => s.rental.addonIds.includes(a.id)).map((a) => a.name).join(', ')}</p>}
          <Button variant="primary" className="mt-auto w-full" onClick={() => openBooking({ spaceId: s.id })}><Plus /> Pesan</Button>
        </CardBody></Card>
      ))}
    </div>
  )
}
