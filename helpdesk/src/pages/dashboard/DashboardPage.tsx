import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CalendarCheck, CalendarClock, Check, CheckCheck, CheckCircle2, Clock, Flame, Inbox, MessageSquareReply, PlusCircle, QrCode, UserCheck, Wrench, Boxes } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/misc'
import { KpiCard } from '@/components/shared/PageHeader'
import { PriorityBadge, StatusBadge, UserChip } from '@/components/shared/badges'
import { EtaChip, EtaDialog } from '@/components/shared/Eta'
import { BarChart } from '@/components/charts/charts'
import { useTicketFlow } from '@/components/tickets/TicketFlow'
import { QuickActions, needsAttention } from '@/pages/tickets/TicketsPage'
import { useCompleteSchedule } from '@/pages/assets/forms'
import { useLookups, useSpaceLabel } from '@/hooks/useLookups'
import { useNow } from '@/hooks/useNow'
import { useMe, useStore } from '@/store/useStore'
import { dailyFlow } from '@/lib/metrics'
import { fmtAgo, fmtDate, fmtSmart, format } from '@/lib/format'
import { BOOKING_STATUS } from '@/lib/labels'
import { isOpenStatus } from '@/lib/sla'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import type { Ticket } from '@/data/types'

const greeting = () => { const h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam' }

export function DashboardPage() {
  const me = useMe()!
  return me.role === 'requester' ? <EmployeeHome /> : me.role === 'agent' ? <TechnicianHome /> : <AdminHome />
}

/* ------------------------------------------------------------------ karyawan */

function EmployeeHome() {
  const me = useMe()!
  const nav = useNavigate()
  const tickets = useStore((s) => s.tickets)
  const bookings = useStore((s) => s.bookings)
  const announcements = useStore((s) => s.announcements)
  const { space } = useLookups()
  const spaceLabel = useSpaceLabel()
  const mine = React.useMemo(() => tickets.filter((t) => t.requesterId === me.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [tickets, me.id])
  const active = mine.filter((t) => isOpenStatus(t.status))
  const confirm = mine.filter((t) => t.status === 'done' && !t.confirmedAt)
  const waitingMe = mine.filter((t) => t.status === 'pending' && t.pendingReason === 'requester')
  const myBookings = bookings.filter((b) => b.userId === me.id && b.kind === 'booking' && (b.status === 'approved' || b.status === 'pending') && new Date(b.end) > new Date()).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4)
  const incidents = tickets.filter((t) => isOpenStatus(t.status) && (t.priority === 'p1' || t.priority === 'p2') && t.requesterId !== me.id).sort((a, b) => a.priority.localeCompare(b.priority)).slice(0, 3)

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary-soft via-surface to-surface p-5 shadow-card sm:p-8">
        <div className="surface-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
        <div className="relative max-w-2xl">
          <p className="text-[13px] font-medium text-primary-soft-fg">{greeting()}, {me.name.split(' ')[0]}</p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[30px]">Ada masalah di fasilitas?</h1>
          <p className="mt-1.5 text-[14px] text-fg-muted">Laporkan dalam satu halaman. Anda bisa memantau siapa yang menangani dan kapan estimasi selesainya.</p>
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <Button variant="primary" size="lg" onClick={() => nav('/lapor')}><PlusCircle /> Lapor masalah</Button>
            <Button variant="secondary" size="lg" onClick={() => nav('/reservasi')}><CalendarCheck /> Pesan ruang / fasilitas</Button>
          </div>
        </div>
      </section>

      {announcements.map((a) => <div key={a.id} role="status" className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px]', a.tone === 'warning' ? 'border-warning/30 bg-warning-soft text-warning-soft-fg' : 'border-info/25 bg-info-soft text-info-soft-fg')}>{a.tone === 'warning' ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <CalendarClock className="mt-0.5 size-4 shrink-0" />}<p><span className="font-semibold">{a.title}.</span> <span className="opacity-90">{a.body}</span></p></div>)}

      {(confirm.length > 0 || waitingMe.length > 0) && (
        <Card className="border-warning/40"><CardHeader icon={<MessageSquareReply />} title="Menunggu tanggapan Anda" description="Satu ketukan saja supaya laporan bisa ditutup atau dilanjutkan." />
          <ul className="divide-y divide-border">{[...confirm, ...waitingMe].map((t) => <li key={t.id}><Link to={`/tiket/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-bg-muted"><span className="tnum text-[12.5px] text-fg-subtle">{t.number}</span><span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{t.title}</span>{t.status === 'done' ? <Badge tone="success" dot>Konfirmasi sudah beres?</Badge> : <Badge tone="warning" dot>Mohon balas</Badge>}<ArrowRight className="size-4 text-fg-subtle" /></Link></li>)}</ul>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Laporan saya yang berjalan" description={active.length ? `${active.length} laporan` : undefined} actions={<Button variant="ghost" size="sm" asChild><Link to="/laporan-saya">Semua <ArrowRight /></Link></Button>} />
          {active.length === 0 ? <EmptyState icon={<CheckCircle2 />} title="Tidak ada laporan berjalan" description="Semua laporan Anda sudah selesai. Terima kasih sudah membantu menjaga fasilitas." action={<Button variant="primary" onClick={() => nav('/lapor')}>Lapor masalah</Button>} /> : (
            <ul className="divide-y divide-border">{active.slice(0, 5).map((t) => (
              <li key={t.id}><Link to={`/tiket/${t.id}`} className="block space-y-2 px-4 py-3.5 hover:bg-bg-muted">
                <div className="flex items-center gap-2"><span className="tnum text-[12px] text-fg-subtle">{t.number}</span>{t.unreadForRequester && <span className="size-1.5 rounded-full bg-primary" aria-label="Ada pembaruan" />}<span className="ml-auto text-[12px] text-fg-subtle">{fmtAgo(t.updatedAt)}</span></div>
                <p className="text-[14px] font-medium">{t.title}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-fg-muted"><StatusBadge status={t.status} pending={t.pendingReason} /><span className="inline-flex items-center gap-1.5">{t.assigneeId ? <UserChip id={t.assigneeId} size="sm" /> : 'Menunggu teknisi'}</span><EtaChip ticket={t} perspective="requester" /></div>
              </Link></li>
            ))}</ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card><CardHeader title="Reservasi saya" icon={<CalendarCheck />} actions={<Button variant="ghost" size="sm" asChild><Link to="/reservasi?tab=daftar">Semua</Link></Button>} />
            {myBookings.length === 0 ? <p className="px-4 py-5 text-[13px] text-fg-muted">Belum ada reservasi mendatang.</p> : <ul className="divide-y divide-border">{myBookings.map((b) => <li key={b.id}><Link to="/reservasi?tab=daftar" className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-bg-muted"><span className="min-w-0"><span className="block truncate text-[13.5px] font-medium">{b.title}</span><span className="block text-[12px] text-fg-muted">{space.get(b.spaceId)?.name} · {fmtSmart(b.start)}</span></span><Badge tone={BOOKING_STATUS[b.status].tone} size="sm">{BOOKING_STATUS[b.status].label}</Badge></Link></li>)}</ul>}
          </Card>
          {incidents.length > 0 && <Card><CardHeader title="Gangguan yang sedang ditangani" description="Sudah diketahui — tidak perlu lapor ulang." icon={<Flame />} />
            <ul className="divide-y divide-border">{incidents.map((t) => <li key={t.id} className="space-y-1 px-4 py-3"><div className="flex items-center gap-2"><PriorityBadge priority={t.priority} compact /><span className="truncate text-[13.5px] font-medium">{t.title}</span></div><div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg-muted"><span>{spaceLabel(t.spaceId)}</span><EtaChip ticket={t} perspective="requester" /></div></li>)}</ul></Card>}
          <Card className="p-4"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-fg"><QrCode className="size-[18px]" /></span><div className="text-[13px]"><p className="font-semibold">Lihat stiker QR di mesin?</p><p className="mt-0.5 text-fg-muted">Pindai dengan kamera HP untuk lapor tanpa login dan tanpa mengetik lokasi. <Link to="/lapor-cepat" className="font-medium text-primary hover:underline">Coba sekarang</Link></p></div></div></Card>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ teknisi */

function TechnicianHome() {
  const me = useMe()!
  const nav = useNavigate()
  const tickets = useStore((s) => s.tickets)
  const pms = useStore((s) => s.pmSchedules)
  const assets = useStore((s) => s.assets)
  const { assign } = useStore.getState()
  const { asset } = useLookups()
  const spaceLabel = useSpaceLabel()
  const now = useNow(60_000)
  const flow = useTicketFlow()
  const done = useCompleteSchedule()
  const toast = useToast()
  const [etaFor, setEtaFor] = React.useState<Ticket | null>(null)
  const setEta = useStore((s) => s.setEta)

  const open = tickets.filter((t) => isOpenStatus(t.status))
  const mine = open.filter((t) => t.assigneeId === me.id).sort((a, b) => (a.etaAt ? new Date(a.etaAt).getTime() : 9e15) - (b.etaAt ? new Date(b.etaAt).getTime() : 9e15) || a.priority.localeCompare(b.priority))
  const noEta = mine.filter((t) => !t.etaAt && t.status !== 'new')
  const late = mine.filter((t) => t.etaAt && new Date(t.etaAt).getTime() < now)
  const queue = open.filter((t) => !t.assigneeId && (t.teamId === me.teamId || t.priority === 'p1')).sort((a, b) => a.priority.localeCompare(b.priority)).slice(0, 5)
  const myPms = pms.filter((p) => p.active && p.assigneeId === me.id && new Date(p.nextDueAt).getTime() < now + 86_400_000).sort((a, b) => a.nextDueAt.localeCompare(b.nextDueAt))
  const bad = assets.filter((a) => a.status === 'down')

  return (
    <div className="space-y-6">
      <div><p className="text-[13px] font-medium text-primary">{greeting()}, {me.name.split(' ')[0]}</p><h1 className="mt-0.5 text-[24px] font-semibold tracking-[-0.025em]">Tugas Anda hari ini</h1></div>

      {(noEta.length > 0 || late.length > 0) && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-[13.5px] text-warning-soft-fg"><Clock className="size-5 shrink-0" /><p className="min-w-0 flex-1">{late.length > 0 && <><strong>{late.length} tugas lewat ETA</strong> — perbarui estimasi agar pelapor tahu. </>}{noEta.length > 0 && <><strong>{noEta.length} tugas belum ada ETA.</strong></>}</p><Button size="sm" variant="secondary" onClick={() => setEtaFor(late[0] ?? noEta[0])}>Perbarui sekarang</Button></div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Tugas saya" value={mine.length} sub={`${mine.filter((t) => t.status === 'in_progress').length} sedang dikerjakan`} icon={<Inbox />} accent="primary" onClick={() => nav('/tiket?view=mine')} />
        <KpiCard label="Lewat ETA" value={late.length} sub="perlu estimasi baru" icon={<Clock />} accent={late.length ? 'danger' : 'success'} onClick={() => nav('/tiket?view=mine')} />
        <KpiCard label="Belum ditugaskan" value={queue.length} sub="di antrean tim Anda" icon={<UserCheck />} accent="warning" onClick={() => nav('/tiket?view=unassigned')} />
        <KpiCard label="Jadwal hari ini" value={myPms.length} sub={`${myPms.filter((p) => new Date(p.nextDueAt).getTime() < now).length} terlambat`} icon={<CalendarClock />} accent="accent" onClick={() => nav('/jadwal')} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Tugas saya" description="Paling mendesak di atas · ketuk ETA untuk mengubah" actions={<Button variant="ghost" size="sm" asChild><Link to="/tiket?view=mine">Buka antrean <ArrowRight /></Link></Button>} />
          {mine.length === 0 ? <EmptyState icon={<CheckCircle2 />} title="Tidak ada tugas" description="Ambil dari antrean belum ditugaskan di kanan." /> : (
            <ul className="divide-y divide-border">{mine.slice(0, 7).map((t) => (
              <li key={t.id} className="space-y-2.5 px-4 py-3.5">
                <Link to={`/tiket/${t.id}`} className="block"><div className="flex flex-wrap items-center gap-2"><PriorityBadge priority={t.priority} compact />{t.hazard && <Badge tone="danger" size="sm">K3</Badge>}<span className="tnum text-[12px] text-fg-subtle">{t.number}</span><StatusBadge status={t.status} pending={t.pendingReason} /></div><p className="mt-1.5 text-[14px] font-medium leading-snug">{t.title}</p><p className="text-[12px] text-fg-muted">{spaceLabel(t.spaceId)}{t.assetId ? ` · ${asset.get(t.assetId)?.name}` : ''}</p></Link>
                <div className="flex flex-wrap items-center justify-between gap-2"><button onClick={() => setEtaFor(t)} aria-label={`Ubah estimasi ${t.number}`} className="rounded-md hover:bg-bg-muted"><EtaChip ticket={t} /></button><QuickActions t={t} flow={flow} me={me.id} /></div>
              </li>
            ))}</ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card><CardHeader title="Antrean tim Anda" description="Belum ada yang menangani" />
            {queue.length === 0 ? <p className="px-4 py-5 text-[13px] text-fg-muted">Antrean kosong.</p> : <ul className="divide-y divide-border">{queue.map((t) => <li key={t.id} className="flex items-center gap-3 px-4 py-3"><Link to={`/tiket/${t.id}`} className="min-w-0 flex-1"><span className="flex items-center gap-2"><PriorityBadge priority={t.priority} compact /><span className="truncate text-[13.5px] font-medium">{t.title}</span></span><span className="block truncate text-[12px] text-fg-muted">{spaceLabel(t.spaceId)} · {fmtAgo(t.createdAt)}</span></Link><Button size="sm" variant="secondary" onClick={() => { assign(t.id, me.id); toast.push({ tone: 'success', title: `${t.number} diambil`, description: 'Jangan lupa isi estimasi selesai.', action: { label: 'Isi ETA', onClick: () => setEtaFor(t) } }) }}>Ambil</Button></li>)}</ul>}
          </Card>
          <Card><CardHeader title="Jadwal maintenance saya" icon={<CalendarClock />} actions={<Button variant="ghost" size="sm" asChild><Link to="/jadwal">Semua</Link></Button>} />
            {myPms.length === 0 ? <p className="px-4 py-5 text-[13px] text-fg-muted">Tidak ada jadwal jatuh tempo hari ini.</p> : <ul className="divide-y divide-border">{myPms.slice(0, 5).map((p) => { const l = new Date(p.nextDueAt).getTime() < now; return <li key={p.id} className="flex items-center gap-3 px-4 py-3"><span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{p.name}</span><span className={cn('block text-[12px]', l ? 'font-medium text-danger' : 'text-fg-muted')}>{l ? 'Terlambat · ' : ''}{fmtDate(p.nextDueAt)}</span></span><Button size="sm" variant={l ? 'primary' : 'secondary'} onClick={() => done.open(p)}><CheckCheck /> Selesai</Button></li> })}</ul>}
          </Card>
          {bad.length > 0 && <Card><CardHeader title="Aset rusak" icon={<Boxes />} /><ul className="divide-y divide-border">{bad.slice(0, 4).map((a) => <li key={a.id}><Link to={`/aset/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-bg-muted"><span className="min-w-0"><span className="block truncate text-[13.5px] font-medium">{a.name}</span><span className="block truncate text-[12px] text-fg-muted">{spaceLabel(a.spaceId)}</span></span><Badge tone="danger">Rusak</Badge></Link></li>)}</ul></Card>}
        </div>
      </div>
      {flow.node}
      {done.node}
      <EtaDialog open={!!etaFor} onOpenChange={(v) => !v && setEtaFor(null)} value={etaFor?.etaAt} priority={etaFor?.priority} requireReason allowClear description={etaFor ? `${etaFor.number} · ${etaFor.title}` : undefined} onSave={(e, r) => { if (etaFor) { setEta(etaFor.id, e, r); toast.push({ tone: 'success', title: e ? `Estimasi ${fmtSmart(e)}` : 'Estimasi dihapus' }) } }} />
    </div>
  )
}

/* ------------------------------------------------------------------ admin */

function AdminHome() {
  const me = useMe()!
  const nav = useNavigate()
  const tickets = useStore((s) => s.tickets)
  const users = useStore((s) => s.users)
  const bookings = useStore((s) => s.bookings)
  const pms = useStore((s) => s.pmSchedules)
  const assets = useStore((s) => s.assets)
  const { decideBooking } = useStore.getState()
  const { space, user } = useLookups()
  const spaceLabel = useSpaceLabel()
  const now = useNow(60_000)
  const flow = useTicketFlow()
  const toast = useToast()

  const open = React.useMemo(() => tickets.filter((t) => isOpenStatus(t.status)), [tickets])
  const unassigned = open.filter((t) => !t.assigneeId)
  const lateEta = open.filter((t) => t.etaAt && new Date(t.etaAt).getTime() < now)
  const attention = open.filter((t) => needsAttention(t, now)).sort((a, b) => a.priority.localeCompare(b.priority)).slice(0, 6)
  const serious = open.filter((t) => t.priority === 'p1' || t.hazard)
  const doneToday = tickets.filter((t) => t.resolvedAt && new Date(t.resolvedAt).toDateString() === new Date(now).toDateString()).length
  const techs = users.filter((u) => u.role !== 'requester')
  const board = techs.map((u) => ({ u, list: open.filter((t) => t.assigneeId === u.id).sort((a, b) => (a.etaAt ?? 'z').localeCompare(b.etaAt ?? 'z')) })).filter((x) => x.list.length > 0).sort((a, b) => b.list.length - a.list.length)
  const pendingBk = bookings.filter((b) => b.status === 'pending').sort((a, b) => a.start.localeCompare(b.start))
  const latePm = pms.filter((p) => p.active && new Date(p.nextDueAt).getTime() < now)
  const bad = assets.filter((a) => a.status === 'down' || a.status === 'degraded')
  const flowData = dailyFlow(tickets, 14)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[13px] font-medium text-primary">{greeting()}, {me.name.split(' ')[0]}</p><h1 className="mt-0.5 text-[24px] font-semibold tracking-[-0.025em]">Ringkasan hari ini</h1></div><p className="text-[12.5px] text-fg-muted">{format(new Date(now), 'EEEE, d MMMM yyyy')}</p></div>

      {serious.map((t) => (
        <Link key={t.id} to={`/tiket/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-danger-soft-fg shadow-card hover:shadow-pop">
          <Flame className="size-5 shrink-0" /><span className="min-w-0 flex-1 basis-[220px]"><span className="block text-[11px] font-bold uppercase tracking-[0.08em]">{t.hazard ? 'Berbahaya (K3)' : 'Darurat'} · {t.number}</span><span className="block truncate text-[14px] font-semibold">{t.title}</span></span>
          <span className="text-[12.5px]">{t.assigneeId ? `Ditangani ${user.get(t.assigneeId)?.name}` : 'BELUM ADA PENANGGUNG JAWAB'}</span><EtaChip ticket={t} className="!bg-white/50 !text-danger-soft-fg" />
        </Link>
      ))}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Belum ditugaskan" value={unassigned.length} sub="tugaskan teknisi sekarang" icon={<UserCheck />} accent={unassigned.length ? 'warning' : 'success'} onClick={() => nav('/tiket?view=unassigned')} />
        <KpiCard label="Lewat ETA" value={lateEta.length} sub="janji waktu terlewat" icon={<Clock />} accent={lateEta.length ? 'danger' : 'success'} onClick={() => nav('/tiket?view=attention')} />
        <KpiCard label="Sedang dikerjakan" value={open.filter((t) => t.status === 'in_progress').length} sub={`${open.filter((t) => t.status === 'pending').length} menunggu`} icon={<Wrench />} accent="accent" onClick={() => nav('/tiket?tampilan=papan&view=open')} />
        <KpiCard label="Selesai hari ini" value={doneToday} sub={`${open.length} masih terbuka`} icon={<CheckCircle2 />} accent="success" onClick={() => nav('/tiket?view=done')} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Siapa mengerjakan apa" description="Tugas aktif per orang beserta estimasi selesainya" actions={<Button variant="ghost" size="sm" asChild><Link to="/tiket?tampilan=papan&view=open">Papan <ArrowRight /></Link></Button>} />
          {board.length === 0 ? <EmptyState title="Belum ada tugas aktif" /> : (
            <ul className="divide-y divide-border">{board.map(({ u, list }) => (
              <li key={u.id} className="space-y-2 px-4 py-3">
                <div className="flex items-center justify-between gap-3"><UserChip id={u.id} showTitle /><Badge tone={list.length > 3 ? 'warning' : 'neutral'}>{list.length} aktif</Badge></div>
                <ul className="space-y-1 pl-8">{list.slice(0, 3).map((t) => <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]"><Link to={`/tiket/${t.id}`} className="min-w-0 flex-1 basis-[200px] truncate hover:text-primary hover:underline"><span className="tnum mr-1.5 text-fg-subtle">{t.number}</span>{t.title}</Link><StatusBadge status={t.status} /><EtaChip ticket={t} /></li>)}{list.length > 3 && <li className="text-[12px] text-fg-subtle">+{list.length - 3} lagi</li>}</ul>
              </li>
            ))}</ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card className={cn(pendingBk.length && 'border-warning/40')}><CardHeader title="Reservasi menunggu persetujuan" icon={<CalendarCheck />} actions={<Button variant="ghost" size="sm" asChild><Link to="/reservasi?tab=daftar">Semua</Link></Button>} />
            {pendingBk.length === 0 ? <p className="px-4 py-5 text-[13px] text-fg-muted">Tidak ada pengajuan menunggu.</p> : <ul className="divide-y divide-border">{pendingBk.slice(0, 4).map((b) => <li key={b.id} className="space-y-2 px-4 py-3"><div><p className="text-[13.5px] font-medium">{b.title}</p><p className="text-[12px] text-fg-muted">{space.get(b.spaceId)?.name} · {fmtSmart(b.start)} · {b.renterName}{b.company ? ` (${b.company})` : ''}</p></div><div className="flex gap-1.5"><Button size="sm" variant="primary" onClick={() => { decideBooking(b.id, true); toast.push({ tone: 'success', title: `${b.number} disetujui` }) }}><Check /> Setujui</Button><Button size="sm" variant="ghost" asChild><Link to="/reservasi?tab=daftar">Tolak / detail</Link></Button></div></li>)}</ul>}
          </Card>
          <Card><CardHeader title="Tiket masuk vs selesai" description="14 hari terakhir" /><CardBody><BarChart height={150} data={flowData.map((f) => ({ label: f.label, values: { created: f.created, resolved: f.resolved } }))} series={[{ key: 'created', label: 'Masuk', color: 'var(--series-1)' }, { key: 'resolved', label: 'Selesai', color: 'var(--series-3)' }]} /></CardBody></Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1"><CardHeader title="Perlu perhatian" description="ETA terlewat, target waktu, atau belum ada penanggung jawab" />
          {attention.length === 0 ? <p className="px-4 py-5 text-[13px] text-fg-muted">Semua terkendali.</p> : <ul className="divide-y divide-border">{attention.map((t) => <li key={t.id} className="space-y-1.5 px-4 py-3"><Link to={`/tiket/${t.id}`} className="flex items-center gap-2"><PriorityBadge priority={t.priority} compact /><span className="truncate text-[13.5px] font-medium">{t.title}</span></Link><div className="flex flex-wrap items-center justify-between gap-2">{t.assigneeId ? <UserChip id={t.assigneeId} size="sm" /> : <Button size="sm" variant="secondary" onClick={() => flow.open('assign', t)}>Tugaskan</Button>}<EtaChip ticket={t} /></div></li>)}</ul>}
        </Card>
        <Card><CardHeader title="Jadwal maintenance" icon={<CalendarClock />} actions={<Button variant="ghost" size="sm" asChild><Link to="/jadwal">Buka</Link></Button>} />
          <CardBody className="space-y-3"><div className="flex items-center justify-between rounded-lg bg-surface-sunken px-3 py-2.5"><div><p className="text-[12px] text-fg-muted">Terlambat</p><p className={cn('tnum text-[22px] font-semibold', latePm.length ? 'text-danger' : 'text-success')}>{latePm.length}</p></div><Button variant="secondary" size="sm" onClick={() => nav('/jadwal')}>Lihat</Button></div>
            <ul className="space-y-2">{latePm.slice(0, 4).map((p) => <li key={p.id} className="flex items-center justify-between gap-3 text-[13px]"><span className="min-w-0 truncate">{p.name}</span><span className="shrink-0 text-[12px] font-medium text-danger">{fmtDate(p.nextDueAt)}</span></li>)}</ul></CardBody>
        </Card>
        <Card><CardHeader title="Aset bermasalah" icon={<Boxes />} actions={<Button variant="ghost" size="sm" asChild><Link to="/aset">Aset</Link></Button>} />
          {bad.length === 0 ? <p className="px-4 py-5 text-[13px] text-fg-muted">Semua aset normal.</p> : <ul className="divide-y divide-border">{bad.sort((a, b) => (a.status === 'down' ? -1 : 1) - (b.status === 'down' ? -1 : 1)).slice(0, 6).map((a) => <li key={a.id}><Link to={`/aset/${a.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-muted"><span className={cn('size-2 rounded-full', a.status === 'down' ? 'bg-danger' : 'bg-warning')} /><span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{a.name}</span><span className="block truncate text-[12px] text-fg-muted">{spaceLabel(a.spaceId)}</span></span><Badge tone={a.status === 'down' ? 'danger' : 'warning'}>{a.status === 'down' ? 'Rusak' : 'Terganggu'}</Badge></Link></li>)}</ul>}
        </Card>
      </div>
      {flow.node}
    </div>
  )
}
