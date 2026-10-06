import * as React from 'react'
import { addDays, format as dfFormat } from 'date-fns'
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox, Segmented } from '@/components/ui/checkbox'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useMe, useStore } from '@/store/useStore'
import { quote } from '@/lib/rental'
import { fmtMoneyFull, format } from '@/lib/format'
import { cn } from '@/lib/utils'

const hhmm = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`

export interface BookingPreset { spaceId?: string; date?: string; start?: number }

export function BookingDialog({ open, onOpenChange, preset }: { open: boolean; onOpenChange: (v: boolean) => void; preset?: BookingPreset }) {
  const me = useMe()!
  const spaces = useStore((s) => s.spaces).filter((s) => s.rental)
  const addons = useStore((s) => s.addons)
  const bookings = useStore((s) => s.bookings)
  const request = useStore((s) => s.requestBooking)
  const toast = useToast()
  const staff = me.role !== 'requester'
  const today = dfFormat(new Date(), 'yyyy-MM-dd')
  const [f, setF] = React.useState({ spaceId: '', date: today, start: 9, end: 10, type: 'internal' as 'internal' | 'external', name: '', company: '', phone: '', title: '', attendees: '5', addons: [] as string[], note: '', auto: true })
  const [err, setErr] = React.useState('')
  const [done, setDone] = React.useState<{ number: string; status: string } | null>(null)

  React.useEffect(() => {
    if (!open) return
    setErr(''); setDone(null)
    const sp = spaces.find((s) => s.id === preset?.spaceId) ?? spaces[0]
    const start = preset?.start ?? Math.max(sp.rental!.openHour, 9)
    setF({ spaceId: sp.id, date: preset?.date ?? today, start, end: Math.min(start + 1, sp.rental!.closeHour), type: 'internal', name: me.name, company: '', phone: me.phone, title: '', attendees: String(Math.min(5, sp.capacity)), addons: [], note: '', auto: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preset])

  const space = spaces.find((s) => s.id === f.spaceId)
  const r = space?.rental
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setErr('') }

  const startD = React.useMemo(() => { const d = new Date(`${f.date}T00:00`); d.setHours(Math.floor(f.start), (f.start % 1) * 60, 0, 0); return d }, [f.date, f.start])
  const endD = React.useMemo(() => { const d = new Date(`${f.date}T00:00`); d.setHours(Math.floor(f.end), (f.end % 1) * 60, 0, 0); return d }, [f.date, f.end])
  const q = space ? quote(space, f.type, startD, endD, f.addons, Number(f.attendees) || 0, addons) : null
  const clash = space ? bookings.find((b) => b.spaceId === space.id && (b.status === 'approved' || b.status === 'pending') && new Date(b.start) < endD && new Date(b.end) > startD) : undefined
  const needs = !!r && (r.needsApproval || f.type === 'external')
  const slots: number[] = []
  if (r) for (let h = r.openHour; h <= r.closeHour; h += 0.5) slots.push(h)

  const submit = () => {
    if (!space) return
    if (f.title.trim().length < 3) return setErr('Isi nama acara / keperluan.')
    if (f.type === 'external' && (f.name.trim().length < 2 || f.phone.trim().length < 6)) return setErr('Isi nama dan nomor HP penyewa eksternal.')
    const res = request({ spaceId: space.id, renterType: f.type, renterName: f.type === 'external' ? f.name.trim() : me.name, company: f.company.trim() || undefined, phone: f.phone.trim() || undefined, title: f.title.trim(), start: startD.toISOString(), end: endD.toISOString(), attendees: Number(f.attendees) || 1, addonIds: f.addons, note: f.note.trim() || undefined, autoApprove: staff && f.auto })
    if (!res.ok) return setErr(res.error)
    setDone({ number: res.booking.number, status: res.booking.status })
    toast.push({ tone: res.booking.status === 'approved' ? 'success' : 'info', title: res.booking.status === 'approved' ? `${space.name} dipesan` : 'Pengajuan terkirim', description: res.booking.status === 'approved' ? `${format(startD, 'EEE d MMM')}, ${hhmm(f.start)}–${hhmm(f.end)}` : 'Admin fasilitas akan memberi kabar.' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" title={done ? 'Reservasi dicatat' : staff ? 'Reservasi / sewa fasilitas' : 'Ajukan reservasi'} description={done ? undefined : 'Pilih fasilitas dan waktu. Biaya dihitung otomatis.'}
        footer={done ? <Button variant="primary" onClick={() => onOpenChange(false)}>Selesai</Button> : <><Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button><Button variant="primary" disabled={!!clash} onClick={submit}>{needs && !(staff && f.auto) ? 'Kirim pengajuan' : 'Pesan sekarang'}</Button></>}>
        {done ? (
          <div className="space-y-4 p-8 text-center">
            <span className={cn('mx-auto grid size-14 place-items-center rounded-full', done.status === 'approved' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>{done.status === 'approved' ? <CheckCircle2 className="size-7" /> : <Clock3 className="size-7" />}</span>
            <div><p className="text-[18px] font-semibold">{done.status === 'approved' ? 'Disetujui' : 'Menunggu persetujuan'}</p><p className="mt-1 text-[13.5px] text-fg-muted">Nomor <strong className="tnum text-fg">{done.number}</strong> · {space?.name}</p></div>
            {done.status !== 'approved' && <p className="mx-auto max-w-sm text-[13px] text-fg-muted">Slot ini ditahan untuk Anda sambil menunggu keputusan. Anda akan mendapat notifikasi.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <Field label="Fasilitas"><Select value={f.spaceId} onChange={(v) => { const s = spaces.find((x) => x.id === v)!; setF((x) => ({ ...x, spaceId: v, start: Math.max(s.rental!.openHour, Math.min(x.start, s.rental!.closeHour - 0.5)), end: Math.min(s.rental!.closeHour, Math.max(x.end, s.rental!.openHour + 0.5)), addons: [], attendees: String(Math.min(Number(x.attendees) || 1, s.capacity)) })); setErr('') }} options={spaces.map((s) => ({ value: s.id, label: s.name, description: `${s.capacity} orang · ${s.rental!.needsApproval ? 'perlu persetujuan' : 'langsung'}` }))} /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Tanggal"><Input type="date" min={today} max={dfFormat(addDays(new Date(), 365), 'yyyy-MM-dd')} value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
                <Field label="Mulai"><Select value={String(f.start)} onChange={(v) => { const s = Number(v); setF((x) => ({ ...x, start: s, end: x.end <= s ? Math.min(s + 1, r!.closeHour) : x.end })); setErr('') }} options={slots.slice(0, -1).map((h) => ({ value: String(h), label: hhmm(h) }))} /></Field>
                <Field label="Selesai"><Select value={String(f.end)} onChange={(v) => set('end', Number(v))} options={slots.filter((h) => h > f.start).map((h) => ({ value: String(h), label: hhmm(h) }))} /></Field>
              </div>
              {clash && <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] font-medium text-danger-soft-fg"><AlertTriangle className="mt-0.5 size-4 shrink-0" />Bentrok dengan “{clash.title}” ({hhmm(new Date(clash.start).getHours() + new Date(clash.start).getMinutes() / 60)}–{hhmm(new Date(clash.end).getHours() + new Date(clash.end).getMinutes() / 60)}, {clash.status === 'pending' ? 'menunggu persetujuan' : 'disetujui'}). Pilih waktu lain.</p>}
              {staff && <Field label="Penyewa"><Segmented value={f.type} onChange={(v) => { setF((x) => ({ ...x, type: v, name: v === 'internal' ? me.name : '', phone: v === 'internal' ? me.phone : '' })); setErr('') }} options={[{ value: 'internal', label: 'Internal (karyawan)' }, { value: 'external', label: 'Eksternal (pihak luar)' }]} /></Field>}
              {f.type === 'external' && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Field label="Nama penyewa" required><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field><Field label="Perusahaan / instansi"><Input value={f.company} onChange={(e) => set('company', e.target.value)} /></Field><Field label="No. HP" required><Input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field></div>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_130px]"><Field label="Acara / keperluan" required><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="mis. Pelatihan K3, rapat anggota" /></Field><Field label="Jumlah peserta" hint={`maks ${space?.capacity}`}><Input type="number" min={1} max={space?.capacity} value={f.attendees} onChange={(e) => set('attendees', e.target.value)} /></Field></div>
              {r && r.addonIds.length > 0 && <fieldset className="space-y-2"><legend className="text-[12.5px] font-medium text-fg-muted">Tambahan</legend><div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{addons.filter((a) => r.addonIds.includes(a.id)).map((a) => <label key={a.id} className={cn('flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px]', f.addons.includes(a.id) ? 'border-primary bg-primary-soft/50' : 'border-border hover:border-border-strong')}><Checkbox checked={f.addons.includes(a.id)} onChange={(v) => set('addons', v ? [...f.addons, a.id] : f.addons.filter((x) => x !== a.id))} aria-label={a.name} /><span className="min-w-0 flex-1">{a.name}</span><span className="tnum text-[12px] text-fg-muted">{(a.price / 1000).toLocaleString('id-ID')} rb/{a.per === 'event' ? 'acara' : a.per === 'hour' ? 'jam' : 'orang'}</span></label>)}</div></fieldset>}
              <Field label="Catatan" hint="opsional"><Textarea rows={2} value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="Kebutuhan khusus, tata letak ruangan, dll." /></Field>
            </div>

            <aside className="space-y-3 self-start rounded-xl border border-border bg-surface-sunken p-4 text-[13px] lg:sticky lg:top-0">
              <div><p className="text-[14.5px] font-semibold">{space?.name}</p><p className="text-[12px] text-fg-muted">{space?.capacity} orang · buka {r && `${hhmm(r.openHour)}–${hhmm(r.closeHour)}`}</p><div className="mt-2 flex flex-wrap gap-1">{r?.amenities.map((a) => <Badge key={a} tone="neutral" size="sm">{a}</Badge>)}</div></div>
              <div className="space-y-1.5 border-t border-border pt-3">
                <div className="flex justify-between"><span className="text-fg-muted">Durasi</span><span className="tnum">{q?.hours ?? 0} jam</span></div>
                <div className="flex justify-between"><span className="text-fg-muted">Sewa {f.type === 'external' ? '(eksternal)' : '(internal)'}</span><span className="tnum">{q && q.base > 0 ? fmtMoneyFull(q.base) : 'Gratis'}</span></div>
                {q?.addons.map((x) => <div key={x.addon.id} className="flex justify-between"><span className="text-fg-muted">{x.addon.name}</span><span className="tnum">{fmtMoneyFull(x.amount)}</span></div>)}
                <div className="flex justify-between border-t border-border pt-2 text-[15px] font-semibold"><span>Total</span><span className="tnum">{q && q.total > 0 ? fmtMoneyFull(q.total) : 'Rp 0'}</span></div>
              </div>
              <p className={cn('rounded-lg px-3 py-2 text-[12.5px]', needs && !(staff && f.auto) ? 'bg-warning-soft text-warning-soft-fg' : 'bg-success-soft text-success-soft-fg')}>{needs ? (staff && f.auto ? 'Akan disetujui langsung oleh Anda.' : f.type === 'external' ? 'Penyewa eksternal selalu perlu persetujuan Admin Fasilitas.' : 'Fasilitas ini perlu persetujuan Admin Fasilitas.') : 'Langsung disetujui, tidak perlu menunggu.'}</p>
              {staff && needs && <Checkbox checked={f.auto} onChange={(v) => set('auto', v)} label="Setujui langsung" />}
              {err && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] font-medium text-danger-soft-fg">{err}</p>}
            </aside>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
