import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Ban, CalendarClock, Check, ChevronDown, CircleDot, Copy, Flag, Lock, MessageSquare, MoreHorizontal, Pause, Paperclip, Pencil, Play, RotateCcw, Send, Sparkles, UserPlus, Wrench, Zap, CheckCircle2, Hourglass } from 'lucide-react'
import { Avatar, EmptyState, Separator } from '@/components/ui/misc'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/input'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { Icon } from '@/components/shared/icons'
import { PriorityBadge, SlaMeter, StatusBadge, TaskStatusBadge, UserChip } from '@/components/shared/badges'
import { EtaChip } from '@/components/shared/Eta'
import { Rating, RatingFace } from '@/components/shared/Rating'
import { useTicketFlow } from '@/components/tickets/TicketFlow'
import { useLookups, useSpaceLabel } from '@/hooks/useLookups'
import { useMe, useStore } from '@/store/useStore'
import { fmtAgo, fmtDateTime, fmtDuration } from '@/lib/format'
import { CHANNEL_LABEL, IMPACT, PENDING_LABEL, PRIORITY, STATUS } from '@/lib/labels'
import { isOpenStatus, policyFor } from '@/lib/sla'
import { cn } from '@/lib/utils'
import type { Activity, Priority, Ticket } from '@/data/types'

export function TicketDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const me = useMe()!
  const ticket = useStore((s) => s.tickets.find((t) => t.id === id))
  if (!ticket || (me.role === 'requester' && ticket.requesterId !== me.id)) {
    return <EmptyState icon={<Flag />} title="Tiket tidak ditemukan" description="Mungkin sudah dihapus, atau bukan laporan Anda." action={<Button variant="secondary" onClick={() => nav(-1)}><ArrowLeft /> Kembali</Button>} className="py-24" />
  }
  return <Detail t={ticket} staff={me.role !== 'requester'} />
}

/* ---------------------------------------------------------------- percakapan */

function eventText(a: Activity, name: (i?: string | null) => string) {
  switch (a.type) {
    case 'status': return a.from === 'done' && a.to === 'done' ? a.body ?? '' : a.to === 'in_progress' && (a.from === 'done') ? a.body ?? 'Dibuka kembali' : `${name(a.actorId)} mengubah status menjadi ${STATUS[a.to as keyof typeof STATUS]?.label ?? a.to}${a.body ? ` — ${a.body}` : ''}`
    case 'assign': return `${a.body}`
    case 'priority': return `${name(a.actorId)} mengubah prioritas ${PRIORITY[a.from as Priority]?.label} → ${PRIORITY[a.to as Priority]?.label}`
    case 'eta': return a.to ? `${name(a.actorId)}: ${a.body ?? 'Estimasi selesai'} → ${fmtDateTime(a.to)}` : `${name(a.actorId)}: ${a.body}`
    case 'task': return a.body ?? ''
    case 'rating': return `${name(a.actorId)} memberi penilaian${a.body ? ` — “${a.body}”` : ''}`
    default: return a.body ?? ''
  }
}

function Timeline({ t, staff }: { t: Ticket; staff: boolean }) {
  const { user } = useLookups()
  const name = (i?: string | null) => (i ? (i === 'u_guest' ? t.reporterName ?? 'Pelapor' : user.get(i)?.name ?? 'Seseorang') : 'Sistem')
  const items = t.activity.filter((a) => (staff ? true : !['note', 'assign', 'task', 'priority'].includes(a.type)))
  return (
    <ol className="space-y-4">
      {items.map((a) => {
        const isMsg = a.type === 'comment' || a.type === 'created' || a.type === 'note'
        if (!isMsg) return (
          <li key={a.id} className="flex items-center gap-3 pl-1 text-[12.5px] text-fg-muted">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-neutral-soft text-fg-subtle">{a.type === 'status' ? <CircleDot className="size-3.5" /> : a.type === 'assign' ? <UserPlus className="size-3.5" /> : a.type === 'task' ? <Wrench className="size-3.5" /> : a.type === 'eta' ? <CalendarClock className="size-3.5" /> : a.type === 'rating' ? <Sparkles className="size-3.5" /> : <Zap className="size-3.5" />}</span>
            <span className="min-w-0 flex-1">{eventText(a, name)}</span>
            <time className="shrink-0 text-[11.5px] text-fg-subtle" title={fmtDateTime(a.at)}>{fmtAgo(a.at)}</time>
          </li>
        )
        const note = a.type === 'note'
        const mine = a.actorId === t.requesterId
        return (
          <li key={a.id} className="flex gap-3">
            <Avatar name={name(a.actorId)} className="mt-0.5 size-8 text-[11px]" />
            <div className={cn('min-w-0 flex-1 rounded-xl border px-3.5 py-2.5', note ? 'border-warning/40 bg-warning-soft/60' : mine ? 'border-border bg-surface' : 'border-primary/20 bg-primary-soft/40')}>
              <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[13px] font-semibold">{name(a.actorId)}</span>
                {a.type === 'created' && <Badge size="sm" tone="neutral">Membuat laporan{t.reporterPhone ? ` · ${t.reporterPhone}` : ''}</Badge>}
                {note && <Badge size="sm" tone="warning"><Lock className="size-3" /> Catatan internal</Badge>}
                <time className="ml-auto text-[11.5px] text-fg-subtle" title={fmtDateTime(a.at)}>{fmtAgo(a.at)}</time>
              </div>
              <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">{a.body}</p>
              {a.type === 'created' && t.attachments && t.attachments.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{t.attachments.map((f, i) => <span key={i} className="inline-flex items-center gap-1.5 rounded-md bg-neutral-soft px-2 py-1 text-[12px]"><Paperclip className="size-3" />{f}</span>)}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function Composer({ t, staff }: { t: Ticket; staff: boolean }) {
  const comment = useStore((s) => s.comment)
  const canned = useStore((s) => s.canned)
  const { user } = useLookups()
  const [mode, setMode] = React.useState<'reply' | 'note'>('reply')
  const [text, setText] = React.useState('')
  const toast = useToast()
  if (t.status === 'cancelled') return <p className="rounded-xl bg-surface-sunken px-4 py-3 text-center text-[13px] text-fg-muted">Tiket ini dibatalkan.</p>
  const first = (t.reporterName ?? user.get(t.requesterId)?.name ?? 'Bapak/Ibu').split(' ')[0]
  const send = () => { if (!text.trim()) return; comment(t.id, text.trim(), mode === 'note'); setText(''); toast.push({ tone: 'success', title: mode === 'note' ? 'Catatan internal disimpan' : 'Balasan terkirim' }) }
  return (
    <div className={cn('rounded-xl border bg-surface shadow-card focus-within:ring-[3px] focus-within:ring-primary/16', mode === 'note' ? 'border-warning/50' : 'border-border-strong/70')}>
      {staff && <div className="flex items-center gap-1 border-b border-border px-2 pt-1.5"><Tabs value={mode} onChange={setMode} items={[{ value: 'reply', label: 'Balas pelapor', icon: <MessageSquare /> }, { value: 'note', label: 'Catatan internal', icon: <Lock /> }]} className="border-0" /></div>}
      <Textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send() }} placeholder={mode === 'note' ? 'Hanya terlihat oleh tim…' : staff ? `Balas ${first}…` : 'Tambahkan keterangan atau jawab pertanyaan teknisi…'} aria-label={mode === 'note' ? 'Catatan internal' : 'Balasan'} className="min-h-[84px] resize-none rounded-none border-0 bg-transparent shadow-none focus:ring-0" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-2.5 py-2">
        <div>{staff && mode === 'reply' && (
          <Menu><MenuTrigger asChild><Button variant="ghost" size="sm"><Sparkles /> Balasan cepat <ChevronDown className="!size-3" /></Button></MenuTrigger>
            <MenuContent align="start" className="w-72"><MenuLabel>Sisipkan template</MenuLabel>{canned.map((c) => <MenuItem key={c.id} onSelect={() => setText((x) => (x ? x + '\n\n' : '') + c.body.replace('{{name}}', first))}>{c.title}</MenuItem>)}</MenuContent></Menu>
        )}</div>
        <Button variant="primary" size="sm" onClick={send} disabled={!text.trim()}><Send /> {mode === 'note' ? 'Simpan catatan' : 'Kirim'}</Button>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- halaman */

const Row = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[92px_1fr] items-start gap-2 text-[13px]"><span className="text-fg-muted">{k}</span><span className="min-w-0 break-words">{children}</span></div>
)

function Detail({ t, staff }: { t: Ticket; staff: boolean }) {
  const me = useMe()!
  const nav = useNavigate()
  const { user, category, asset, team } = useLookups()
  const spaceLabel = useSpaceLabel()
  const store = useStore.getState()
  const tickets = useStore((s) => s.tickets)
  const tasks = useStore((s) => s.tasks)
  const toast = useToast()
  const flow = useTicketFlow()
  const [tab, setTab] = React.useState<'chat' | 'related'>('chat')
  const [reopenWhy, setReopenWhy] = React.useState('')
  const [score, setScore] = React.useState(0)
  const [fb, setFb] = React.useState('')

  const cat = category.get(t.categoryId)
  const req = t.reporterName ? { name: `${t.reporterName} (via QR)`, title: t.reporterPhone ?? 'Tanpa login', dept: '' } : user.get(t.requesterId)
  const a = t.assetId ? asset.get(t.assetId) : undefined
  const myTasks = tasks.filter((w) => t.taskIds.includes(w.id))
  const sameAsset = tickets.filter((x) => x.assetId && x.assetId === t.assetId && x.id !== t.id).sort((p, q) => q.createdAt.localeCompare(p.createdAt))
  const open = isOpenStatus(t.status)
  const needConfirm = t.status === 'done' && !t.confirmedAt
  const pol = policyFor(t.priority)

  const startLabel = t.status === 'pending' ? 'Lanjutkan' : t.assigneeId && t.assigneeId !== me.id ? 'Ambil alih' : 'Mulai kerja'
  const actions = (
    <>
      {(t.status === 'new' || t.status === 'assigned' || t.status === 'pending') && <Button variant="primary" onClick={() => flow.open('start', t)}><Play /> {startLabel}</Button>}
      {t.status === 'in_progress' && <><Button variant="secondary" onClick={() => flow.open('pending', t)}><Pause /> Tunda</Button><Button variant="primary" onClick={() => flow.open('done', t)}><Check /> Selesai</Button></>}
      {t.status === 'done' && <Button variant="secondary" onClick={() => flow.open('reopen', t)}><RotateCcw /> Buka kembali</Button>}
      {t.status === 'cancelled' && <Button variant="secondary" onClick={() => flow.open('reopen', t)}><RotateCcw /> Buka kembali</Button>}
    </>
  )

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <Link to={staff ? '/tiket' : '/laporan-saya'} className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> {staff ? 'Tiket' : 'Laporan saya'}</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tnum text-[13px] font-medium text-fg-subtle">{t.number}</span>
            <PriorityBadge priority={t.priority} />
            {t.hazard && <Badge tone="danger"><AlertTriangle className="size-3" /> Berbahaya (K3)</Badge>}
            {req && 'vip' in (user.get(t.requesterId) ?? {}) && user.get(t.requesterId)?.vip && <Badge tone="purple">VIP</Badge>}
          </div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.025em] sm:text-[24px]">{t.title}</h1>
        </div>
        {staff && <div className="hidden flex-wrap items-center gap-2 lg:flex">
          {actions}
          <Menu>
            <MenuTrigger asChild><Button variant="secondary" size="icon" aria-label="Aksi lain"><MoreHorizontal /></Button></MenuTrigger>
            <MenuContent>
              <MenuItem icon={<Wrench />} onSelect={() => { const k = store.createTask({ title: t.title, ticketId: t.id, priority: t.priority, assigneeId: t.assigneeId ?? me.id }); toast.push({ tone: 'success', title: `${k.number} dibuat`, action: { label: 'Buka', onClick: () => nav(`/tugas/${k.id}`) } }) }}>Buat tugas maintenance</MenuItem>
              <MenuItem icon={<Copy />} onSelect={() => { void navigator.clipboard?.writeText(window.location.href); toast.push({ tone: 'info', title: 'Tautan disalin' }) }}>Salin tautan</MenuItem>
              <MenuSeparator />
              <MenuItem icon={<Ban />} danger disabled={!open} onSelect={() => flow.open('cancel', t)}>Batalkan tiket</MenuItem>
            </MenuContent>
          </Menu>
        </div>}
      </div>

      {/* assign · ETA · status — the three things everyone asks about, together */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="space-y-1.5 p-4">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">{staff ? 'Teknisi' : 'Ditangani oleh'}</p>
            <div className="flex min-h-9 items-center justify-between gap-2">
              {t.assigneeId ? <UserChip id={t.assigneeId} showTitle /> : <span className="text-[14px] text-fg-muted">{open ? `Menunggu tim ${team.get(t.teamId)?.name}` : '—'}</span>}
              {staff && open && <Button variant="secondary" size="sm" onClick={() => flow.open('assign', t)}>{t.assigneeId ? <><Pencil /> Ubah</> : <><UserPlus /> Tugaskan</>}</Button>}
            </div>
          </div>
          <div className="space-y-1.5 p-4">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Estimasi selesai</p>
            <div className="flex min-h-9 items-center justify-between gap-2">
              {open ? <EtaChip ticket={t} perspective={staff ? 'staff' : 'requester'} className="!text-[14px]" /> : <span className="text-[14px]">{t.resolvedAt ? `Selesai ${fmtDateTime(t.resolvedAt)}` : '—'}</span>}
              {staff && open && <Button variant="secondary" size="sm" onClick={() => flow.open('eta', t)}>{t.etaAt ? <><Pencil /> Ubah</> : <><CalendarClock /> Atur</>}</Button>}
            </div>
            {t.pausedAt && <p className="text-[12px] text-fg-muted"><Hourglass className="mr-1 inline size-3" />{t.pendingReason ? PENDING_LABEL[t.pendingReason] : 'Ditunda'}</p>}
          </div>
          <div className="space-y-1.5 p-4">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Status</p>
            <div className="flex min-h-9 items-center justify-between gap-2">
              <StatusBadge status={t.status} pending={t.pendingReason} />
              {staff && <Menu>
                <MenuTrigger asChild><Button variant="secondary" size="sm">Ubah <ChevronDown className="!size-3" /></Button></MenuTrigger>
                <MenuContent>
                  <MenuLabel>Ubah status ke</MenuLabel>
                  <MenuItem disabled={t.status === 'in_progress'} onSelect={() => flow.open('start', t)}>Dikerjakan</MenuItem>
                  <MenuItem disabled={t.status === 'pending' || !open} onSelect={() => flow.open('pending', t)}>Menunggu…</MenuItem>
                  <MenuItem disabled={t.status === 'done' || !open} onSelect={() => flow.open('done', t)}>Selesai…</MenuItem>
                  <MenuItem disabled={t.status === 'new' || t.status === 'assigned' || !open} onSelect={() => { store.assign(t.id, undefined) }}>Kembalikan ke antrean</MenuItem>
                </MenuContent>
              </Menu>}
            </div>
          </div>
        </div>
      </Card>

      {!staff && t.status === 'pending' && t.pendingReason === 'requester' && <div role="status" className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-[13.5px] text-warning-soft-fg"><MessageSquare className="mt-0.5 size-4 shrink-0" /><p><strong>Kami menunggu balasan Anda.</strong> Jawab di bawah supaya teknisi bisa lanjut.</p></div>}

      {needConfirm && !staff && (
        <Card className="border-success/40"><CardBody className="space-y-4">
          <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-success-soft text-success"><CheckCircle2 className="size-5" /></span><div><p className="text-[15px] font-semibold">Sudah beres?</p><p className="mt-0.5 text-[13px] text-fg-muted">{t.resolutionNote ?? 'Teknisi menandai pekerjaan ini selesai.'}</p></div></div>
          <Field label="Bagaimana layanannya?"><Rating value={score} onChange={setScore} /></Field>
          {score > 0 && <Textarea rows={2} value={fb} onChange={(e) => setFb(e.target.value)} placeholder="Catatan (opsional)" />}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => { store.confirmDone(t.id, score ? { score, comment: fb || undefined } : undefined); toast.push({ tone: 'success', title: 'Terima kasih!', description: 'Konfirmasi Anda tercatat.' }) }}>Ya, sudah beres</Button>
            <Button variant="secondary" onClick={() => document.getElementById('reopen-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}><RotateCcw /> Belum beres</Button>
          </div>
          <div id="reopen-box" className="space-y-2"><Textarea rows={2} value={reopenWhy} onChange={(e) => setReopenWhy(e.target.value)} placeholder="Jika belum beres, ceritakan apa yang masih bermasalah…" />{reopenWhy.trim().length > 3 && <Button variant="outlineDanger" size="sm" onClick={() => store.reopen(t.id, reopenWhy.trim())}>Buka kembali tiket</Button>}</div>
        </CardBody></Card>
      )}
      {t.status === 'done' && t.confirmedAt && <div className="flex flex-wrap items-center gap-3 rounded-xl bg-success-soft px-4 py-3 text-[13.5px] text-success-soft-fg"><CheckCircle2 className="size-4" /> Dikonfirmasi pelapor {fmtAgo(t.confirmedAt)}{t.rating && <RatingFace score={t.rating.score} />}{t.rating?.comment && <span className="text-fg-muted">“{t.rating.comment}”</span>}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {staff && <Tabs value={tab} onChange={setTab} items={[{ value: 'chat', label: 'Percakapan' }, { value: 'related', label: 'Terkait', count: sameAsset.length + myTasks.length }]} />}
          {tab === 'chat' ? <><Timeline t={t} staff={staff} /><Composer t={t} staff={staff} /></> : (
            <div className="space-y-5">
              <Card><CardHeader title="Tugas maintenance" actions={<Button variant="ghost" size="xs" onClick={() => store.createTask({ title: t.title, ticketId: t.id, priority: t.priority, assigneeId: t.assigneeId ?? me.id })}>+ Buat</Button>} />
                {myTasks.length === 0 ? <p className="px-4 py-4 text-[13px] text-fg-muted">Belum ada. Buat tugas jika pekerjaan butuh checklist, material, atau vendor.</p> : <ul className="divide-y divide-border">{myTasks.map((w) => <li key={w.id}><Link to={`/tugas/${w.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-bg-muted"><span className="min-w-0"><span className="tnum block text-[12px] text-fg-subtle">{w.number}</span><span className="block truncate text-[13px] font-medium">{w.title}</span></span><TaskStatusBadge status={w.status} /></Link></li>)}</ul>}
              </Card>
              <Card><CardHeader title={a ? `Tiket lain pada ${a.name}` : 'Tiket lain pada aset ini'} />
                {sameAsset.length === 0 ? <p className="px-4 py-4 text-[13px] text-fg-muted">{a ? 'Tidak ada tiket lain.' : 'Tidak ada aset terkait.'}</p> : <ul className="divide-y divide-border">{sameAsset.slice(0, 8).map((r) => <li key={r.id}><Link to={`/tiket/${r.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-muted"><span className="tnum w-20 shrink-0 text-[12px] text-fg-subtle">{r.number}</span><span className="min-w-0 flex-1 truncate text-[13.5px]">{r.title}</span><StatusBadge status={r.status} /></Link></li>)}</ul>}
              </Card>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Detail" />
            <CardBody className="space-y-3.5">
              {staff && open && (
                <>
                  <Field label="Prioritas" hint={`Target selesai ${fmtDuration(pol.resolveMin * 60_000)}${pol.calendar === 'business' ? ' jam kerja' : ''}`}>
                    <Select value={t.priority} onChange={(v) => store.setPriority(t.id, v as Priority)} options={(['p1', 'p2', 'p3', 'p4'] as Priority[]).map((p) => ({ value: p, label: PRIORITY[p].label, description: PRIORITY[p].hint }))} />
                  </Field>
                  <Separator />
                </>
              )}
              <Row k="Pelapor"><span className="font-medium">{req?.name}</span><span className="block text-[12px] text-fg-muted">{req?.title}{req?.dept ? ` · ${req.dept}` : ''}</span></Row>
              <Row k="Kategori"><span className="inline-flex items-center gap-1.5"><Icon name={cat?.icon ?? ''} className="size-3.5 text-primary" />{cat?.name}</span></Row>
              <Row k="Lokasi">{spaceLabel(t.spaceId)}</Row>
              <Row k="Peralatan">{a ? <Link to={`/aset/${a.id}`} className="font-medium text-primary hover:underline">{a.name}<span className="block text-[12px] font-normal text-fg-muted">{a.tag}</span></Link> : <span className="text-fg-muted">—</span>}</Row>
              {t.impact && <Row k="Dampak">{IMPACT[t.impact].label}</Row>}
              <Row k="Saluran">{CHANNEL_LABEL[t.channel]}</Row>
              <Row k="Dibuat">{fmtDateTime(t.createdAt)}</Row>
              {!staff && open && <Row k="Prioritas"><PriorityBadge priority={t.priority} /></Row>}
              {t.rating && staff && <Row k="Penilaian"><RatingFace score={t.rating.score} /></Row>}
            </CardBody>
          </Card>
          {staff && (
            <Card>
              <CardHeader title="Target waktu internal" description="Batas layanan, terpisah dari estimasi teknisi" />
              <CardBody className="space-y-4"><SlaMeter ticket={t} which="response" label="Tanggapan pertama" /><SlaMeter ticket={t} which="resolve" label="Penyelesaian" /></CardBody>
            </Card>
          )}
          {!staff && open && !t.assigneeId && <Button variant="outlineDanger" className="w-full" onClick={() => flow.open('cancel', t)}><Ban /> Batalkan laporan</Button>}
        </aside>
      </div>

      {/* thumb-reach actions on a phone */}
      {staff && (open || t.status === 'done') && <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2 border-t border-border bg-surface/95 px-3 py-3 backdrop-blur lg:hidden">
        <Button variant="secondary" size="lg" onClick={() => flow.open('eta', t)} disabled={!open}><CalendarClock /> ETA</Button>
        <div className="flex flex-1 justify-end gap-2 [&_button]:h-11 [&_button]:px-5">{actions}</div>
      </div>}
      {flow.node}
    </div>
  )
}
