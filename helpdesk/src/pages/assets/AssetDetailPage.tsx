import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCheck, Pencil, Plus, QrCode, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/misc'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { AssetStatusBadge, CriticalityBadge, PriorityBadge, StatusBadge, TaskStatusBadge, TaskTypeBadge } from '@/components/shared/badges'
import { useLookups, useSpaceLabel } from '@/hooks/useLookups'
import { useMe, useStore } from '@/store/useStore'
import { woCost } from '@/lib/metrics'
import { fmtDate, fmtMoney, fmtMoneyFull } from '@/lib/format'
import { ASSET_STATUS, FREQ_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { AssetFormDialog, ScheduleFormDialog, useCompleteSchedule } from './forms'
import type { AssetStatus } from '@/data/types'

/** A QR-looking label. A real build would encode the /lapor-cepat?aset= link. */
function QrBlock({ value }: { value: string }) {
  const cells = React.useMemo(() => {
    let h = 0
    for (const ch of value) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    const n = 21
    const out: boolean[] = []
    for (let i = 0; i < n * n; i++) { h = (h * 1664525 + 1013904223) >>> 0; out.push(h % 100 < 48) }
    const finder = (x: number, y: number) => { for (let dy = -1; dy < 8; dy++) for (let dx = -1; dx < 8; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= n || Y >= n) continue; const edge = dx === 0 || dy === 0 || dx === 6 || dy === 6; const inner = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4; out[Y * n + X] = dx >= 0 && dy >= 0 && dx <= 6 && dy <= 6 && (edge || inner) } }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7)
    return { out, n }
  }, [value])
  return <svg viewBox={`0 0 ${cells.n} ${cells.n}`} className="size-44 rounded-lg bg-white p-2" role="img" aria-label="Kode QR" shapeRendering="crispEdges">{cells.out.map((on, i) => on && <rect key={i} x={i % cells.n} y={Math.floor(i / cells.n)} width="1" height="1" fill="#0b1f1c" />)}</svg>
}

export function AssetDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const me = useMe()!
  const a = useStore((s) => s.assets.find((x) => x.id === id))
  const tickets = useStore((s) => s.tickets)
  const tasks = useStore((s) => s.tasks)
  const pms = useStore((s) => s.pmSchedules)
  const { updateAsset, generatePm } = useStore.getState()
  const { assetCategory, vendor, team } = useLookups()
  const spaceLabel = useSpaceLabel()
  const toast = useToast()
  const [tab, setTab] = React.useState<'jadwal' | 'riwayat' | 'tiket' | 'spek'>('jadwal')
  const [qr, setQr] = React.useState(false)
  const [edit, setEdit] = React.useState(false)
  const [sched, setSched] = React.useState<{ open: boolean; id?: string }>({ open: false })
  const done = useCompleteSchedule()
  const staff = me.role !== 'requester'

  if (!a) return <EmptyState title="Aset tidak ditemukan" action={<Button variant="secondary" onClick={() => nav('/aset')}><ArrowLeft /> Kembali</Button>} className="py-24" />
  const myTickets = tickets.filter((t) => t.assetId === a.id).sort((x, y) => y.createdAt.localeCompare(x.createdAt))
  const myTasks = tasks.filter((w) => w.assetId === a.id).sort((x, y) => y.createdAt.localeCompare(x.createdAt))
  const myPms = pms.filter((p) => p.assetId === a.id)
  const nextDue = [...myPms].filter((p) => p.active).sort((x, y) => x.nextDueAt.localeCompare(y.nextDueAt))[0]
  const late = nextDue && new Date(nextDue.nextDueAt).getTime() < Date.now()
  const cost12 = myTasks.filter((w) => new Date(w.createdAt).getTime() > Date.now() - 365 * 86_400_000).reduce((t, w) => t + woCost(w).total, 0)
  const warrantyLeft = a.warrantyUntil ? Math.round((new Date(a.warrantyUntil).getTime() - Date.now()) / 86_400_000) : null
  const age = (Date.now() - new Date(a.installedAt).getTime()) / (365 * 86_400_000)
  const openTickets = myTickets.filter((t) => t.status !== 'done' && t.status !== 'cancelled')

  return (
    <div className="space-y-5">
      <Link to="/aset" className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> Aset</Link>
      <PageHeader
        eyebrow={<><span className="tnum text-[13px] font-medium text-fg-subtle">{a.tag}</span><AssetStatusBadge status={a.status} /><CriticalityBadge level={a.criticality} /></>}
        title={a.name} description={`${assetCategory.get(a.categoryId)?.name} · ${spaceLabel(a.spaceId)}`}
        actions={<>
          <Button variant="secondary" onClick={() => setQr(true)}><QrCode /> Label QR</Button>
          {staff && <Button variant="secondary" onClick={() => setEdit(true)}><Pencil /> Ubah</Button>}
          <Button variant="primary" onClick={() => nav(`/lapor?aset=${a.id}`)}><AlertTriangle /> Lapor masalah</Button>
        </>} />

      {a.status === 'down' && <div role="alert" className="flex items-center gap-3 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-[13.5px] text-danger-soft-fg"><AlertTriangle className="size-5 shrink-0" /><span><strong>Aset ini sedang rusak.</strong> {openTickets.length ? <>Ada {openTickets.length} tiket aktif: {openTickets.map((t) => <Link key={t.id} to={`/tiket/${t.id}`} className="font-semibold underline">{t.number}</Link>).reduce<React.ReactNode[]>((acc, x, i) => (i ? [...acc, ', ', x] : [x]), [])}.</> : 'Belum ada tiket — buat laporan agar tim bergerak.'}</span></div>}

      {/* informasi maintenance — jawaban untuk "kapan terakhir, kapan berikutnya?" */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardBody className="p-4"><p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-fg-subtle">Servis terakhir</p><p className="mt-1.5 text-[20px] font-semibold tracking-[-0.02em]">{fmtDate(a.lastServiceAt)}</p><p className="mt-1 text-[12px] text-fg-muted">{vendor.get(a.vendorId ?? '')?.name ?? 'Tim internal'}</p></CardBody></Card>
        <Card className={cn(late && 'border-danger/40')}><CardBody className="p-4"><p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-fg-subtle">Servis berikutnya</p><p className={cn('mt-1.5 text-[20px] font-semibold tracking-[-0.02em]', late && 'text-danger')}>{nextDue ? fmtDate(nextDue.nextDueAt) : 'Belum ada jadwal'}</p><p className="mt-1 text-[12px] text-fg-muted">{nextDue ? `${late ? 'Terlambat · ' : ''}${nextDue.name}` : staff ? 'Buat jadwal agar tidak terlewat' : '—'}</p></CardBody></Card>
        <Card><CardBody className="p-4"><p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-fg-subtle">Garansi</p><p className="mt-1.5 flex items-center gap-1.5 text-[20px] font-semibold tracking-[-0.02em]">{warrantyLeft == null ? '—' : warrantyLeft > 0 ? <><ShieldCheck className="size-5 text-success" />{warrantyLeft} hari</> : 'Berakhir'}</p><p className="mt-1 text-[12px] text-fg-muted">{a.warrantyUntil ? `s.d. ${fmtDate(a.warrantyUntil)}` : 'Tidak ada data garansi'}</p></CardBody></Card>
        <Card><CardBody className="p-4"><p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-fg-subtle">Biaya maintenance 12 bln</p><p className="tnum mt-1.5 text-[20px] font-semibold tracking-[-0.02em]">{fmtMoney(cost12)}</p><p className="mt-1 text-[12px] text-fg-muted">{myTasks.filter((w) => w.type === 'corrective').length} perbaikan · umur {age.toFixed(1)} th</p></CardBody></Card>
      </div>

      <Tabs value={tab} onChange={setTab} items={[{ value: 'jadwal', label: 'Jadwal perawatan', count: myPms.length }, { value: 'riwayat', label: 'Riwayat pekerjaan', count: myTasks.length }, { value: 'tiket', label: 'Tiket', count: myTickets.length }, { value: 'spek', label: 'Spesifikasi' }]} />

      {tab === 'jadwal' && (
        <Card>
          <CardHeader title="Perawatan berkala" description="Pekerjaan rutin untuk menjaga aset ini tetap sehat." actions={staff && <Button variant="secondary" size="sm" onClick={() => setSched({ open: true })}><Plus /> Tambah jadwal</Button>} />
          {myPms.length === 0 ? <EmptyState icon={<CalendarClock />} title="Belum ada jadwal perawatan" description="Tanpa jadwal, perawatan baru dilakukan setelah rusak." action={staff ? <Button variant="primary" onClick={() => setSched({ open: true })}>Buat jadwal</Button> : undefined} /> : (
            <ul className="divide-y divide-border">
              {myPms.map((p) => { const l = new Date(p.nextDueAt).getTime() < Date.now() && p.active; return (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1 basis-[220px]"><p className="text-[13.5px] font-medium">{p.name}{!p.active && <Badge tone="neutral" size="sm" className="ml-2">Dijeda</Badge>}</p><p className="text-[12px] text-fg-muted">{FREQ_LABEL[p.frequency]} · {p.assigneeId ? '' : ''}{p.vendorId ? vendor.get(p.vendorId)?.name : team.get(p.teamId)?.name}</p></div>
                  <div className="w-40 text-[12.5px]"><p className={cn('font-medium', l && 'text-danger')}>{l ? 'Terlambat · ' : ''}{fmtDate(p.nextDueAt)}</p><p className="text-fg-subtle">Terakhir {fmtDate(p.lastDoneAt)}</p></div>
                  {staff && <div className="flex items-center gap-1.5"><Button variant="primary" size="sm" onClick={() => done.open(p)}><CheckCheck /> Sudah dikerjakan</Button><Button variant="ghost" size="sm" onClick={() => { const t = generatePm(p.id); if (t) nav(`/tugas/${t.id}`) }}>Buka tugas</Button><Button variant="ghost" size="iconSm" aria-label="Ubah jadwal" onClick={() => setSched({ open: true, id: p.id })}><Pencil /></Button></div>}
                </li>
              ) })}
            </ul>
          )}
        </Card>
      )}
      {tab === 'riwayat' && (
        <Card>{myTasks.length === 0 ? <EmptyState title="Belum ada pekerjaan tercatat" description="Setiap perbaikan dan perawatan akan tercatat di sini." /> : (
          <ul className="divide-y divide-border">{myTasks.map((w) => <li key={w.id}><Link to={`/tugas/${w.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-bg-muted"><TaskTypeBadge type={w.type} /><span className="min-w-0 flex-1 truncate text-[13.5px] font-medium"><span className="tnum mr-2 text-[12px] font-normal text-fg-subtle">{w.number}</span>{w.title}</span><span className="text-[12px] text-fg-muted">{fmtDate(w.completedAt ?? w.dueAt)}</span><span className="tnum w-24 text-right text-[12.5px] text-fg-muted">{fmtMoney(woCost(w).total)}</span><TaskStatusBadge status={w.status} /></Link></li>)}</ul>
        )}</Card>
      )}
      {tab === 'tiket' && (
        <Card>{myTickets.length === 0 ? <EmptyState title="Tidak ada tiket" description="Belum ada yang melaporkan masalah pada aset ini." action={<Button variant="secondary" onClick={() => nav(`/lapor?aset=${a.id}`)}>Lapor masalah</Button>} /> : (
          <ul className="divide-y divide-border">{myTickets.map((t) => <li key={t.id}><Link to={`/tiket/${t.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-bg-muted"><PriorityBadge priority={t.priority} compact /><span className="min-w-0 flex-1 truncate text-[13.5px]"><span className="tnum mr-2 text-[12px] text-fg-subtle">{t.number}</span>{t.title}</span><span className="text-[12px] text-fg-muted">{fmtDate(t.createdAt)}</span><StatusBadge status={t.status} /></Link></li>)}</ul>
        )}</Card>
      )}
      {tab === 'spek' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card><CardHeader title="Spesifikasi" /><CardBody className="space-y-3 text-[13px]">
            {([['Merk', a.manufacturer], ['Model', a.model], ['No. seri', a.serial], ['Terpasang', fmtDate(a.installedAt)], ['Nilai perolehan', fmtMoneyFull(a.purchaseCost)], ['Vendor', vendor.get(a.vendorId ?? '')?.name ?? 'Internal'], ['Catatan', a.notes ?? '—']] as [string, string][]).map(([k, v]) => <div key={k} className="grid grid-cols-[130px_1fr] gap-2"><span className="text-fg-muted">{k}</span><span className="break-words">{v || '—'}</span></div>)}
          </CardBody></Card>
          {staff && <Card><CardHeader title="Kondisi saat ini" description="Tampil di dashboard dan di semua laporan terkait." /><CardBody><Select value={a.status} onChange={(v) => { updateAsset(a.id, { status: v as AssetStatus }); toast.push({ tone: v === 'down' ? 'warning' : 'success', title: `${a.name}: ${ASSET_STATUS[v as AssetStatus].label.toLowerCase()}` }) }} options={(Object.keys(ASSET_STATUS) as AssetStatus[]).map((s) => ({ value: s, label: ASSET_STATUS[s].label }))} />
            <Button variant="ghost" size="sm" className="mt-3 text-danger" onClick={() => { updateAsset(a.id, { status: 'retired' }); toast.push({ tone: 'info', title: 'Aset dinonaktifkan' }); nav('/aset') }}>Nonaktifkan aset</Button></CardBody></Card>}
        </div>
      )}

      <Dialog open={qr} onOpenChange={setQr}>
        <DialogContent size="sm" title="Label QR aset" description="Cetak dan tempel di aset. Siapa pun yang memindai bisa melapor tanpa login." footer={<><Button variant="ghost" onClick={() => setQr(false)}>Tutup</Button><Button variant="primary" onClick={() => window.print()}>Cetak</Button></>}>
          <div className="flex flex-col items-center gap-3 p-6"><QrBlock value={a.id} /><div className="text-center"><p className="text-[15px] font-semibold">{a.name}</p><p className="tnum text-[13px] text-fg-muted">{a.tag}</p><p className="mt-1 text-[12px] text-fg-subtle">Pindai untuk melapor masalah</p></div><Link to={`/lapor-cepat?aset=${a.id}`} className="text-[12.5px] font-medium text-primary hover:underline" onClick={() => setQr(false)}>Simulasikan pemindaian →</Link></div>
        </DialogContent>
      </Dialog>

      <AssetFormDialog open={edit} onOpenChange={setEdit} asset={a} />
      <ScheduleFormDialog open={sched.open} onOpenChange={(v) => setSched((s) => ({ ...s, open: v }))} schedule={pms.find((p) => p.id === sched.id)} presetAssetId={a.id} />
      {done.node}
    </div>
  )
}
