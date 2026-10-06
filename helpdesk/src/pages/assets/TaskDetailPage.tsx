import * as React from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Box, CalendarClock, Check, CheckCircle2, Clock, Pause, Pencil, Play, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriorityBadge, TaskStatusBadge, TaskTypeBadge, UserChip } from '@/components/shared/badges'
import { EtaDialog } from '@/components/shared/Eta'
import { useLookups, useSpaceLabel } from '@/hooks/useLookups'
import { useMe, useStore } from '@/store/useStore'
import { woCost } from '@/lib/metrics'
import { fmtDateTime, fmtMoneyFull, fmtSmart } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Priority, Task } from '@/data/types'

const progress = (w: Task) => (w.checklist.length ? Math.round((w.checklist.filter((c) => c.done).length / w.checklist.length) * 100) : 0)

export function TaskDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const task = useStore((s) => s.tasks.find((w) => w.id === id))
  if (id === 'baru') return <NewTask />
  if (!task) return <EmptyState title="Tugas tidak ditemukan" action={<Button variant="secondary" onClick={() => nav('/jadwal?tampilan=tugas')}><ArrowLeft /> Kembali</Button>} className="py-24" />
  return <Detail id={task.id} />
}

function Detail({ id }: { id: string }) {
  const me = useMe()!
  const w = useStore((s) => s.tasks.find((x) => x.id === id))!
  const s = useStore()
  const { asset, vendor } = useLookups()
  const spaceLabel = useSpaceLabel()
  const toast = useToast()
  const ticket = w.ticketId ? s.tickets.find((t) => t.id === w.ticketId) : undefined
  const a = w.assetId ? asset.get(w.assetId) : undefined
  const cost = woCost(w)
  const closed = w.status === 'completed' || w.status === 'cancelled'
  const [dlg, setDlg] = React.useState<'complete' | 'time' | 'material' | 'eta' | null>(null)
  const [note, setNote] = React.useState('')
  const [mins, setMins] = React.useState('30')
  const [mat, setMat] = React.useState({ name: '', qty: '1', cost: '' })
  const over = !closed && new Date(w.dueAt).getTime() < Date.now()
  const back = w.pmId ? '/jadwal' : '/jadwal?tampilan=tugas'

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <Link to={back} className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> Jadwal maintenance</Link>
      <PageHeader eyebrow={<><span className="tnum text-[13px] font-medium text-fg-subtle">{w.number}</span><TaskStatusBadge status={w.status} /><TaskTypeBadge type={w.type} /><PriorityBadge priority={w.priority} compact />{over && <Badge tone="danger">Lewat target</Badge>}</>} title={w.title} description={w.description}
        actions={closed ? (w.status === 'completed' && <Button variant="secondary" onClick={() => s.setTaskStatus(w.id, 'in_progress')}>Buka kembali</Button>) : (
          <>
            {w.status === 'in_progress' ? <Button variant="secondary" onClick={() => s.setTaskStatus(w.id, 'on_hold')}><Pause /> Tunda</Button> : <Button variant="secondary" onClick={() => { if (!w.assigneeId && !w.vendorId) s.patchTask(w.id, { assigneeId: me.id }); s.setTaskStatus(w.id, 'in_progress') }}><Play /> {w.status === 'on_hold' ? 'Lanjutkan' : 'Mulai'}</Button>}
            <Button variant="primary" onClick={() => setDlg('complete')}><Check /> Selesai…</Button>
          </>
        )} />

      <Card className="overflow-hidden"><div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="space-y-1.5 p-4"><p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Penanggung jawab</p><div className="min-h-9 pt-1">{w.vendorId ? <span className="text-[14px] font-medium">{vendor.get(w.vendorId)?.name} <span className="font-normal text-fg-muted">(vendor)</span></span> : <UserChip id={w.assigneeId} showTitle />}</div></div>
        <div className="space-y-1.5 p-4"><p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Target selesai</p><div className="flex min-h-9 items-center justify-between gap-2"><span className={cn('inline-flex items-center gap-1.5 text-[14px] font-medium', over && 'text-danger')}><CalendarClock className="size-4" />{closed && w.completedAt ? `Selesai ${fmtDateTime(w.completedAt)}` : fmtSmart(w.dueAt)}</span>{!closed && <Button variant="secondary" size="sm" onClick={() => setDlg('eta')}><Pencil /> Ubah</Button>}</div></div>
        <div className="space-y-1.5 p-4"><p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Kemajuan</p><div className="pt-2.5"><Progress value={progress(w)} tone={progress(w) === 100 ? 'success' : 'primary'} /><p className="mt-1.5 text-[12px] text-fg-muted">{w.checklist.filter((c) => c.done).length} dari {w.checklist.length} poin checklist</p></div></div>
      </div></Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Checklist" description="Centang saat dikerjakan; tulis temuan bila ada." />
            <ul className="divide-y divide-border">{w.checklist.map((c) => (
              <li key={c.id} className="space-y-2 px-4 py-3">
                <Checkbox checked={c.done} onChange={() => !closed && s.toggleCheck(w.id, c.id)} disabled={closed} label={<span className={cn('text-[14px]', c.done && 'text-fg-muted line-through')}>{c.text}</span>} />
                {(c.note || !closed) && <Input value={c.note ?? ''} onChange={(e) => s.noteCheck(w.id, c.id, e.target.value)} disabled={closed} placeholder="Temuan atau pembacaan…" className="h-8 text-[12.5px]" aria-label={`Catatan: ${c.text}`} />}
              </li>
            ))}</ul>
          </Card>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card><CardHeader title="Waktu kerja" icon={<Clock />} actions={!closed && <Button variant="ghost" size="xs" onClick={() => setDlg('time')}><Plus /> Catat</Button>} />
              {w.timeLogs.length === 0 ? <p className="px-4 py-5 text-[13px] text-fg-muted">Belum ada waktu tercatat.</p> : <ul className="divide-y divide-border">{w.timeLogs.map((l) => <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]"><span className="min-w-0"><UserChip id={l.userId} size="sm" />{l.note && <span className="block truncate text-[12px] text-fg-muted">{l.note}</span>}</span><span className="tnum shrink-0 font-semibold">{Math.floor(l.minutes / 60)}j {l.minutes % 60}m</span></li>)}</ul>}
            </Card>
            <Card><CardHeader title="Material & sparepart" icon={<Box />} actions={!closed && <Button variant="ghost" size="xs" onClick={() => setDlg('material')}><Plus /> Tambah</Button>} />
              {w.materials.length === 0 ? <p className="px-4 py-5 text-[13px] text-fg-muted">Belum ada material dipakai.</p> : <ul className="divide-y divide-border">{w.materials.map((m) => <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]"><span className="truncate">{m.qty}× {m.name}</span><span className="tnum shrink-0 text-fg-muted">{fmtMoneyFull(m.qty * m.unitCost)}</span></li>)}</ul>}
            </Card>
          </div>
          {w.completionNote && <Card className="border-success/40"><CardBody className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /><div><p className="text-[13px] font-semibold">Catatan penyelesaian</p><p className="mt-1 text-[13.5px] text-fg-muted">{w.completionNote}</p></div></CardBody></Card>}
        </div>
        <aside className="space-y-4">
          <Card><CardHeader title="Detail" /><CardBody className="space-y-3.5 text-[13px]">
            {([
              ['Aset', a ? <Link to={`/aset/${a.id}`} className="font-medium text-primary hover:underline">{a.name}</Link> : '—'],
              ['Lokasi', spaceLabel(w.spaceId ?? a?.spaceId)],
              ['Asal', ticket ? <Link to={`/tiket/${ticket.id}`} className="font-medium text-primary hover:underline">{ticket.number}</Link> : w.pmId ? 'Jadwal berkala' : 'Dibuat manual'],
              ['Dijadwalkan', fmtSmart(w.scheduledFor)], ['Mulai', fmtDateTime(w.startedAt)], ['Selesai', fmtDateTime(w.completedAt)],
            ] as [string, React.ReactNode][]).map(([k, v]) => <div key={k} className="grid grid-cols-[92px_1fr] gap-2"><span className="text-fg-muted">{k}</span><span className="min-w-0 break-words">{v}</span></div>)}
            {!closed && <><Separator /><Field label="Ganti teknisi"><Select value={w.assigneeId} onChange={(v) => s.patchTask(w.id, { assigneeId: v })} searchable options={s.users.filter((u) => u.role !== 'requester').map((u) => ({ value: u.id, label: u.name, description: u.title }))} /></Field></>}
          </CardBody></Card>
          <Card><CardHeader title="Biaya" /><CardBody className="space-y-2 text-[13px]">
            {[['Tenaga kerja', cost.labor], ['Material', cost.mats], ['Tagihan vendor', cost.vendor]].map(([k, v]) => <div key={k as string} className="flex justify-between"><span className="text-fg-muted">{k}</span><span className="tnum">{fmtMoneyFull(v as number)}</span></div>)}
            <Separator /><div className="flex justify-between text-[14px] font-semibold"><span>Total</span><span className="tnum">{fmtMoneyFull(cost.total)}</span></div><p className="text-[11.5px] text-fg-subtle">Tenaga kerja dihitung Rp 85.000 / jam.</p>
          </CardBody></Card>
        </aside>
      </div>

      <EtaDialog open={dlg === 'eta'} onOpenChange={(v) => !v && setDlg(null)} title="Ubah target selesai" description={w.number} value={w.dueAt} priority={w.priority} onSave={(e) => e && s.patchTask(w.id, { dueAt: e })} />
      <Dialog open={dlg === 'complete'} onOpenChange={(v) => !v && setDlg(null)}>
        <DialogContent size="sm" title={`Selesaikan ${w.number}`} description="Tercatat di riwayat aset." footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Batal</Button><Button variant="primary" disabled={note.trim().length < 5} onClick={() => { s.setTaskStatus(w.id, 'completed', note.trim()); setDlg(null); setNote(''); toast.push({ tone: 'success', title: `${w.number} selesai`, description: w.pmId ? 'Jadwal berikutnya sudah dihitung.' : ticket ? `${ticket.number} siap ditutup.` : undefined }) }}>Tandai selesai</Button></>}>
          <div className="space-y-3 p-5">{w.checklist.some((c) => !c.done) && <p className="rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning-soft-fg">{w.checklist.filter((c) => !c.done).length} poin belum dicentang — akan ditandai selesai.</p>}<Field label="Catatan penyelesaian" required><Textarea autoFocus rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Apa yang dikerjakan dan ditemukan?" /></Field></div>
        </DialogContent>
      </Dialog>
      <Dialog open={dlg === 'time'} onOpenChange={(v) => !v && setDlg(null)}>
        <DialogContent size="sm" title="Catat waktu kerja" footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Batal</Button><Button variant="primary" disabled={!(+mins > 0)} onClick={() => { s.logTime(w.id, +mins); setDlg(null) }}>Simpan</Button></>}><div className="p-5"><Field label="Menit"><Input type="number" min={5} step={5} value={mins} onChange={(e) => setMins(e.target.value)} autoFocus /></Field></div></DialogContent>
      </Dialog>
      <Dialog open={dlg === 'material'} onOpenChange={(v) => !v && setDlg(null)}>
        <DialogContent size="sm" title="Tambah material" footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Batal</Button><Button variant="primary" disabled={!mat.name.trim() || !(+mat.qty > 0)} onClick={() => { s.addMaterial(w.id, mat.name.trim(), +mat.qty, +mat.cost || 0); setMat({ name: '', qty: '1', cost: '' }); setDlg(null) }}>Tambah</Button></>}>
          <div className="space-y-3 p-5"><Field label="Nama"><Input value={mat.name} onChange={(e) => setMat({ ...mat, name: e.target.value })} autoFocus placeholder="mis. Kapasitor 35µF" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Jumlah"><Input type="number" min={1} value={mat.qty} onChange={(e) => setMat({ ...mat, qty: e.target.value })} /></Field><Field label="Harga satuan (Rp)"><Input type="number" min={0} value={mat.cost} onChange={(e) => setMat({ ...mat, cost: e.target.value })} /></Field></div></div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NewTask() {
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const create = useStore((s) => s.createTask)
  const assets = useStore((s) => s.assets)
  const users = useStore((s) => s.users)
  const me = useMe()!
  const { asset } = useLookups()
  const [title, setTitle] = React.useState('')
  const [assetId, setAssetId] = React.useState<string | undefined>(sp.get('aset') ?? undefined)
  const [priority, setPriority] = React.useState<Priority>('p3')
  const [who, setWho] = React.useState<string>(me.id)
  const [due, setDue] = React.useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 16))
  const [desc, setDesc] = React.useState('')
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to="/jadwal?tampilan=tugas" className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> Tugas</Link>
      <PageHeader title="Tugas maintenance baru" description="Untuk pekerjaan yang tidak berasal dari tiket — temuan saat keliling, atau pekerjaan terencana." />
      <Card><CardBody className="space-y-4 p-5">
        <Field label="Apa yang harus dikerjakan?" required><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="mis. Ganti belt AHU Area Packing" /></Field>
        <Field label="Rincian"><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Aset"><Select value={assetId} onChange={setAssetId} searchable clearable onClear={() => setAssetId(undefined)} placeholder="Opsional" options={assets.map((a) => ({ value: a.id, label: a.name, description: a.tag }))} /></Field>
          <Field label="Prioritas"><Select value={priority} onChange={setPriority} options={[{ value: 'p1', label: 'Darurat' }, { value: 'p2', label: 'Tinggi' }, { value: 'p3', label: 'Sedang' }, { value: 'p4', label: 'Rendah' }]} /></Field>
          <Field label="Teknisi"><Select value={who} onChange={setWho} searchable options={users.filter((u) => u.role !== 'requester').map((u) => ({ value: u.id, label: u.name, description: u.title }))} /></Field>
          <Field label="Target selesai"><Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
      </CardBody>
        <div className="flex justify-end gap-2 border-t border-border bg-surface-sunken/60 px-5 py-3.5"><Button variant="ghost" onClick={() => nav('/jadwal?tampilan=tugas')}>Batal</Button>
          <Button variant="primary" disabled={title.trim().length < 4} onClick={() => { const t = create({ title: title.trim(), description: desc || undefined, assetId, priority, assigneeId: who, dueAt: new Date(due).toISOString(), spaceId: assetId ? asset.get(assetId)?.spaceId : undefined }); nav(`/tugas/${t.id}`) }}>Buat tugas</Button></div>
      </Card>
    </div>
  )
}
