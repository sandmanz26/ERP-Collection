import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Columns3, Download, List, Plus, Search, UserPlus, X, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox, Segmented } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '@/components/ui/menu'
import { EmptyState } from '@/components/ui/misc'
import { MultiSelect, Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriorityBadge, StatusBadge, UserChip } from '@/components/shared/badges'
import { EtaChip, EtaDialog } from '@/components/shared/Eta'
import { useTicketFlow, type FlowKind } from '@/components/tickets/TicketFlow'
import { useLookups, useSpaceLabel } from '@/hooks/useLookups'
import { useNow } from '@/hooks/useNow'
import { useMe, useStore } from '@/store/useStore'
import { downloadCsv } from '@/lib/csv'
import { fmtAgo, fmtDateTime, fmtSmart } from '@/lib/format'
import { BOARD_COLUMNS, PRIORITY, STATUS } from '@/lib/labels'
import { isOpenStatus, worstSla } from '@/lib/sla'
import { cn } from '@/lib/utils'
import type { Priority, Ticket, TicketStatus } from '@/data/types'

type View = 'mine' | 'unassigned' | 'attention' | 'open' | 'done' | 'all'
type SortKey = 'urgency' | 'priority' | 'eta' | 'updated'
const PAGE = 25

/** Needs a human soon: promised time passed, target at risk, or unowned and serious. */
export const needsAttention = (t: Ticket, now: number) => {
  if (!isOpenStatus(t.status)) return false
  if (t.etaAt && new Date(t.etaAt).getTime() < now) return true
  if (['breached', 'at_risk'].includes(worstSla(t, now).state)) return true
  return !t.assigneeId && (t.priority === 'p1' || t.priority === 'p2' || !!t.hazard)
}

export function TicketsPage() {
  const me = useMe()!
  const nav = useNavigate()
  const toast = useToast()
  const [sp, setSp] = useSearchParams()
  const tickets = useStore((s) => s.tickets)
  const users = useStore((s) => s.users)
  const teams = useStore((s) => s.teams)
  const categories = useStore((s) => s.categories)
  const { bulk, setEta } = useStore.getState()
  const { user, category } = useLookups()
  const spaceLabel = useSpaceLabel()
  const now = useNow(60_000)
  const flow = useTicketFlow()
  const [etaFor, setEtaFor] = React.useState<Ticket | null>(null)
  const [bulkEta, setBulkEta] = React.useState(false)

  const view = (sp.get('view') as View) || (me.role === 'agent' ? 'mine' : 'attention')
  const layout = sp.get('tampilan') === 'papan' ? 'papan' : 'daftar'
  const [q, setQ] = React.useState(sp.get('q') ?? '')
  const [prios, setPrios] = React.useState<Priority[]>([])
  const [statuses, setStatuses] = React.useState<TicketStatus[]>([])
  const [teamId, setTeamId] = React.useState<string>()
  const [assignee, setAssignee] = React.useState<string>()
  const [catId, setCatId] = React.useState<string>()
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'urgency', dir: 1 })
  const [sel, setSel] = React.useState<Set<string>>(new Set())
  const [limit, setLimit] = React.useState(PAGE)

  const put = (k: string, v?: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n, { replace: true }) }
  const setView = (v: View) => { put('view', v); setSel(new Set()); setLimit(PAGE) }

  const counts = React.useMemo(() => {
    const open = tickets.filter((t) => isOpenStatus(t.status))
    return { mine: open.filter((t) => t.assigneeId === me.id).length, unassigned: open.filter((t) => !t.assigneeId).length, attention: open.filter((t) => needsAttention(t, now)).length, open: open.length }
  }, [tickets, me.id, now])

  const urgency = React.useCallback((t: Ticket) => {
    const r = worstSla(t, now)
    const order: Record<string, number> = { breached: 0, at_risk: 1, ok: 2, paused: 3, met: 4, missed: 4, 'n/a': 5 }
    return (t.etaAt && new Date(t.etaAt).getTime() < now ? -1 : order[r.state]) * 1e14 + (t.etaAt ? new Date(t.etaAt).getTime() : r.dueAt.getTime())
  }, [now])

  const rows = React.useMemo(() => {
    let r = tickets
    if (view === 'mine') r = r.filter((t) => t.assigneeId === me.id && isOpenStatus(t.status))
    else if (view === 'unassigned') r = r.filter((t) => !t.assigneeId && isOpenStatus(t.status))
    else if (view === 'attention') r = r.filter((t) => needsAttention(t, now))
    else if (view === 'open') r = r.filter((t) => isOpenStatus(t.status))
    else if (view === 'done') r = r.filter((t) => !isOpenStatus(t.status))
    const s = q.trim().toLowerCase()
    if (s) r = r.filter((t) => `${t.number} ${t.title} ${t.reporterName ?? user.get(t.requesterId)?.name ?? ''}`.toLowerCase().includes(s))
    if (prios.length) r = r.filter((t) => prios.includes(t.priority))
    if (statuses.length) r = r.filter((t) => statuses.includes(t.status))
    if (teamId) r = r.filter((t) => t.teamId === teamId)
    if (catId) r = r.filter((t) => t.categoryId === catId)
    if (assignee) r = r.filter((t) => (assignee === 'none' ? !t.assigneeId : t.assigneeId === assignee))
    const cmp = {
      urgency: (a: Ticket, b: Ticket) => urgency(a) - urgency(b),
      priority: (a: Ticket, b: Ticket) => PRIORITY[a.priority].rank - PRIORITY[b.priority].rank || urgency(a) - urgency(b),
      eta: (a: Ticket, b: Ticket) => (a.etaAt ? new Date(a.etaAt).getTime() : 9e15) - (b.etaAt ? new Date(b.etaAt).getTime() : 9e15),
      updated: (a: Ticket, b: Ticket) => b.updatedAt.localeCompare(a.updatedAt),
    }[sort.key]
    return [...r].sort((a, b) => cmp(a, b) * sort.dir)
  }, [tickets, view, q, prios, statuses, teamId, catId, assignee, sort, me.id, now, user, urgency])

  const visible = layout === 'daftar' ? rows.slice(0, limit) : rows
  const allSel = visible.length > 0 && visible.every((t) => sel.has(t.id))
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const filtersOn = prios.length + statuses.length + (teamId ? 1 : 0) + (assignee ? 1 : 0) + (catId ? 1 : 0) + (q ? 1 : 0)
  const clearFilters = () => { setQ(''); setPrios([]); setStatuses([]); setTeamId(undefined); setAssignee(undefined); setCatId(undefined) }
  const doBulk = (patch: Parameters<typeof bulk>[1], msg: string) => { bulk([...sel], patch); toast.push({ tone: 'success', title: `${sel.size} tiket ${msg}` }); setSel(new Set()) }
  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }))
  const sortHead = (k: SortKey, label: string, className?: string) => (
    <th key={k} className={cn('px-3 py-2.5 text-left', className)} aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => sortBy(k)} className="inline-flex items-center gap-1 font-semibold uppercase tracking-[0.06em] hover:text-fg">{label}{sort.key === k && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}</button>
    </th>
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Tiket" description="Siapa mengerjakan apa, estimasi selesainya kapan, dan statusnya sekarang. Urutan bawaan: yang paling mendesak di atas." className="pb-1"
        actions={<>
          <Segmented size="sm" value={layout} onChange={(v) => put('tampilan', v === 'papan' ? 'papan' : undefined)} options={[{ value: 'daftar', label: 'Daftar', icon: <List className="size-3.5" /> }, { value: 'papan', label: 'Papan', icon: <Columns3 className="size-3.5" /> }]} />
          <Button variant="secondary" onClick={() => { downloadCsv('tiket.csv', [['Nomor', 'Judul', 'Prioritas', 'Status', 'Pelapor', 'Teknisi', 'ETA', 'Dibuat', 'Kategori'], ...rows.map((t) => [t.number, t.title, PRIORITY[t.priority].label, STATUS[t.status].label, t.reporterName ?? user.get(t.requesterId)?.name, user.get(t.assigneeId ?? '')?.name, t.etaAt, t.createdAt, category.get(t.categoryId)?.name])]); toast.push({ tone: 'success', title: `${rows.length} tiket diekspor` }) }}><Download /> <span className="hidden sm:inline">Ekspor</span></Button>
          <Button variant="primary" onClick={() => nav('/lapor')}><Plus /> Buat tiket</Button>
        </>} />

      <Tabs value={view} onChange={setView} items={[
        { value: 'mine', label: 'Tugas saya', count: counts.mine },
        { value: 'unassigned', label: 'Belum ditugaskan', count: counts.unassigned },
        { value: 'attention', label: 'Perlu perhatian', count: counts.attention },
        { value: 'open', label: 'Semua aktif', count: counts.open },
        { value: 'done', label: 'Selesai' },
        { value: 'all', label: 'Semua' },
      ]} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64"><Input leading={<Search className="size-4 text-fg-subtle" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nomor, judul, pelapor" aria-label="Cari tiket" /></div>
        <MultiSelect className="w-[150px]" values={prios} onChange={setPrios} placeholder="Prioritas" options={(['p1', 'p2', 'p3', 'p4'] as Priority[]).map((p) => ({ value: p, label: PRIORITY[p].label }))} />
        <MultiSelect className="w-[140px]" values={statuses} onChange={setStatuses} placeholder="Status" options={(Object.keys(STATUS) as TicketStatus[]).map((s) => ({ value: s, label: STATUS[s].label }))} />
        <Select className="w-[170px]" value={assignee} onChange={setAssignee} clearable onClear={() => setAssignee(undefined)} placeholder="Semua teknisi" searchable options={[{ value: 'none', label: 'Belum ditugaskan' }, ...users.filter((u) => u.role !== 'requester').map((u) => ({ value: u.id, label: u.name }))]} />
        <Select className="w-[170px]" value={teamId} onChange={setTeamId} clearable onClear={() => setTeamId(undefined)} placeholder="Semua tim" options={teams.map((t) => ({ value: t.id, label: t.name }))} />
        <Select className="w-[170px]" value={catId} onChange={setCatId} clearable onClear={() => setCatId(undefined)} placeholder="Semua kategori" searchable options={categories.map((c) => ({ value: c.id, label: c.name }))} />
        {filtersOn > 0 && <Button variant="ghost" size="sm" onClick={clearFilters}><X /> Hapus {filtersOn} filter</Button>}
        <span className="ml-auto text-[12.5px] text-fg-muted" aria-live="polite">{rows.length} tiket</span>
      </div>

      {sel.size > 0 && layout === 'daftar' && (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary-soft px-3 py-2 shadow-pop" role="toolbar" aria-label="Aksi massal">
          <span className="text-[13px] font-semibold text-primary-soft-fg">{sel.size} dipilih</span>
          <Menu>
            <MenuTrigger asChild><Button variant="secondary" size="sm"><UserPlus /> Tugaskan</Button></MenuTrigger>
            <MenuContent align="start" className="max-h-72 overflow-y-auto"><MenuLabel>Tugaskan ke</MenuLabel>{users.filter((u) => u.role !== 'requester').map((u) => <MenuItem key={u.id} onSelect={() => doBulk({ assigneeId: u.id }, `ditugaskan ke ${u.name}`)}>{u.name}</MenuItem>)}</MenuContent>
          </Menu>
          <Button variant="secondary" size="sm" onClick={() => setBulkEta(true)}>Atur ETA</Button>
          <Menu>
            <MenuTrigger asChild><Button variant="secondary" size="sm">Prioritas</Button></MenuTrigger>
            <MenuContent align="start">{(['p1', 'p2', 'p3', 'p4'] as Priority[]).map((p) => <MenuItem key={p} onSelect={() => doBulk({ priority: p }, `jadi ${PRIORITY[p].label}`)}>{PRIORITY[p].label}</MenuItem>)}</MenuContent>
          </Menu>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSel(new Set())}>Batal pilih</Button>
        </div>
      )}

      {rows.length === 0 ? (
        <Card><EmptyState icon={<Search />} title={filtersOn ? 'Tidak ada tiket yang cocok' : view === 'mine' ? 'Tidak ada tugas untuk Anda' : 'Tidak ada tiket'} description={filtersOn ? 'Coba kurangi filter atau ubah kata kunci.' : view === 'mine' ? 'Ambil tiket dari antrean "Belum ditugaskan".' : undefined} action={filtersOn ? <Button variant="secondary" onClick={clearFilters}>Hapus filter</Button> : view === 'mine' ? <Button variant="primary" onClick={() => setView('unassigned')}>Lihat belum ditugaskan</Button> : undefined} /></Card>
      ) : layout === 'papan' ? (
        <Board rows={rows} flow={flow} now={now} />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-[13px]">
              <thead className="border-b border-border bg-surface-sunken text-[11px] text-fg-subtle">
                <tr>
                  <th className="w-10 px-3 py-2.5"><Checkbox checked={allSel} indeterminate={!allSel && visible.some((t) => sel.has(t.id))} onChange={(v) => setSel(v ? new Set(visible.map((t) => t.id)) : new Set())} aria-label="Pilih semua" /></th>
                  {sortHead('priority', 'Prioritas', 'w-[110px]')}
                  <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-[0.06em]">Tiket</th>
                  <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-[0.06em]">Status</th>
                  <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-[0.06em]">Teknisi</th>
                  {sortHead('eta', 'Estimasi selesai')}
                  {sortHead('updated', 'Diperbarui', 'text-right')}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((t) => (
                  <tr key={t.id} className={cn('group cursor-pointer transition-colors hover:bg-bg-muted/70', sel.has(t.id) && 'bg-primary-soft/40')} onClick={() => nav(`/tiket/${t.id}`)}>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}><Checkbox checked={sel.has(t.id)} onChange={() => toggle(t.id)} aria-label={`Pilih ${t.number}`} /></td>
                    <td className="px-3 py-2.5"><PriorityBadge priority={t.priority} compact /></td>
                    <td className="max-w-[400px] px-3 py-2.5">
                      <Link to={`/tiket/${t.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-fg group-hover:text-primary"><span className="tnum mr-2 font-normal text-fg-subtle">{t.number}</span>{t.title}{t.hazard && <Badge tone="danger" size="sm" className="ml-2 align-middle"><AlertTriangle className="size-3" /> K3</Badge>}</Link>
                      <span className="block truncate text-[12px] text-fg-muted">{t.reporterName ?? user.get(t.requesterId)?.name} · {spaceLabel(t.spaceId)}</span>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={t.status} pending={t.pendingReason} /></td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      {isOpenStatus(t.status) ? <button onClick={() => flow.open('assign', t)} className="-mx-1.5 rounded-md px-1.5 py-1 text-left hover:bg-bg-muted" aria-label={`Ubah teknisi ${t.number}`}>{t.assigneeId ? <UserChip id={t.assigneeId} size="sm" /> : <Badge tone="warning" size="sm">Tugaskan…</Badge>}</button> : <UserChip id={t.assigneeId} size="sm" empty="—" />}
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      {isOpenStatus(t.status) ? <button onClick={() => setEtaFor(t)} className="-mx-1 rounded-md px-1 py-0.5 hover:bg-bg-muted" aria-label={`Ubah estimasi ${t.number}`}><EtaChip ticket={t} /></button> : <span className="text-[12px] text-fg-subtle">{t.resolvedAt ? `Selesai ${fmtSmart(t.resolvedAt)}` : '—'}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[12.5px] text-fg-muted" title={fmtDateTime(t.updatedAt)}>{fmtAgo(t.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-border md:hidden">
            {visible.map((t) => (
              <li key={t.id} className="space-y-2 px-4 py-3.5">
                <Link to={`/tiket/${t.id}`} className="block space-y-1.5">
                  <div className="flex items-center gap-2"><PriorityBadge priority={t.priority} compact /><span className="tnum text-[12px] text-fg-subtle">{t.number}</span>{t.hazard && <Badge tone="danger" size="sm">K3</Badge>}<span className="ml-auto text-[12px] text-fg-subtle">{fmtAgo(t.updatedAt)}</span></div>
                  <p className="text-[14.5px] font-medium leading-snug">{t.title}</p>
                  <p className="text-[12px] text-fg-muted">{spaceLabel(t.spaceId)}</p>
                </Link>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={t.status} pending={t.pendingReason} />{isOpenStatus(t.status) && <button onClick={() => setEtaFor(t)} aria-label={`Ubah estimasi ${t.number}`}><EtaChip ticket={t} /></button>}</div>
                <div className="flex items-center justify-between gap-2">{isOpenStatus(t.status) ? <button onClick={() => flow.open('assign', t)}>{t.assigneeId ? <UserChip id={t.assigneeId} size="sm" /> : <Badge tone="warning">Tugaskan…</Badge>}</button> : <UserChip id={t.assigneeId} size="sm" empty="—" />}
                  {isOpenStatus(t.status) && <QuickActions t={t} flow={flow} me={me.id} />}</div>
              </li>
            ))}
          </ul>
          {rows.length > limit && (
            <div className="flex items-center justify-between border-t border-border bg-surface-sunken/60 px-4 py-3 text-[13px]"><span className="text-fg-muted">Menampilkan {visible.length} dari {rows.length}</span><Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + PAGE)}>Tampilkan {Math.min(PAGE, rows.length - limit)} lagi</Button></div>
          )}
        </Card>
      )}

      {flow.node}
      <EtaDialog open={!!etaFor} onOpenChange={(v) => !v && setEtaFor(null)} value={etaFor?.etaAt} priority={etaFor?.priority} requireReason allowClear title={etaFor?.etaAt ? 'Ubah estimasi selesai' : 'Atur estimasi selesai'} description={etaFor ? `${etaFor.number} · ${etaFor.title}` : undefined} onSave={(e, r) => { if (etaFor) { setEta(etaFor.id, e, r); toast.push({ tone: 'success', title: e ? `Estimasi ${fmtSmart(e)}` : 'Estimasi dihapus' }) } }} />
      <EtaDialog open={bulkEta} onOpenChange={setBulkEta} title={`Atur ETA untuk ${sel.size} tiket`} onSave={(e) => e && doBulk({ etaAt: e }, 'diberi estimasi')} />
    </div>
  )
}

/** The three things a technician does most, one tap each. */
export function QuickActions({ t, flow, me }: { t: Ticket; flow: { open: (k: FlowKind, t: Ticket) => void }; me: string }) {
  if (t.status === 'new' || t.status === 'assigned' || t.status === 'pending') return <Button size="sm" variant="primary" onClick={() => flow.open('start', t)}>{t.status === 'pending' ? 'Lanjutkan' : t.assigneeId && t.assigneeId !== me ? 'Ambil alih' : 'Mulai kerja'}</Button>
  if (t.status === 'in_progress') return <div className="flex gap-1.5"><Button size="sm" variant="secondary" onClick={() => flow.open('pending', t)}>Tunda</Button><Button size="sm" variant="primary" onClick={() => flow.open('done', t)}>Selesai</Button></div>
  return null
}

/* ---------------------------------------------------------------- papan */

function Board({ rows, flow, now }: { rows: Ticket[]; flow: { open: (k: FlowKind, t: Ticket) => void }; now: number }) {
  const nav = useNavigate()
  const { user } = useLookups()
  const spaceLabel = useSpaceLabel()
  const [over, setOver] = React.useState<TicketStatus | null>(null)
  const weekAgo = now - 7 * 86_400_000
  const lists = BOARD_COLUMNS.map((c) => ({ c, list: rows.filter((t) => t.status === c && (c !== 'done' || new Date(t.resolvedAt ?? t.updatedAt).getTime() > weekAgo)) }))

  const drop = (status: TicketStatus, e: React.DragEvent) => {
    e.preventDefault(); setOver(null)
    const id = e.dataTransfer.getData('text/plain')
    const t = rows.find((x) => x.id === id)
    if (!t || t.status === status) return
    const kind: FlowKind | undefined = status === 'in_progress' ? 'start' : status === 'pending' ? 'pending' : status === 'done' ? 'done' : status === 'assigned' ? 'assign' : status === 'new' ? 'assign' : undefined
    if (kind) flow.open(kind, t)
  }

  return (
    <div>
      <p className="mb-2 text-[12.5px] text-fg-muted">Tarik kartu ke kolom lain untuk mengubah status — Anda akan diminta mengisi estimasi atau catatan bila perlu.</p>
      <div className="scrollbar-thin -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-3 sm:mx-0 sm:px-0">
        {lists.map(({ c, list }) => (
          <section key={c} onDragOver={(e) => { e.preventDefault(); setOver(c) }} onDragLeave={() => setOver((o) => (o === c ? null : o))} onDrop={(e) => drop(c, e)} aria-label={STATUS[c].label}
            className={cn('w-[290px] shrink-0 snap-start rounded-xl bg-surface-sunken p-2.5 transition-colors', over === c && 'ring-2 ring-primary/50 bg-primary-soft/40')}>
            <header className="mb-2 flex items-center justify-between px-1.5"><span className="text-[12.5px] font-semibold">{STATUS[c].label}{c === 'done' && <span className="ml-1 font-normal text-fg-subtle">· 7 hari</span>}</span><Badge size="sm" tone={STATUS[c].tone}>{list.length}</Badge></header>
            <div className="space-y-2">
              {list.slice(0, 20).map((t) => (
                <article key={t.id} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move' }} onClick={() => nav(`/tiket/${t.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && nav(`/tiket/${t.id}`)}
                  className="cursor-grab rounded-lg border border-border bg-surface p-3 shadow-card transition-shadow hover:shadow-pop active:cursor-grabbing">
                  <div className="mb-1.5 flex items-center justify-between gap-2"><PriorityBadge priority={t.priority} compact /><span className="tnum text-[11.5px] text-fg-subtle">{t.number}</span></div>
                  <p className="text-[13px] font-medium leading-snug">{t.title}</p>
                  <p className="mt-1 truncate text-[11.5px] text-fg-muted">{spaceLabel(t.spaceId)}</p>
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">{t.assigneeId ? <UserChip id={t.assigneeId} size="sm" /> : <Badge tone="warning" size="sm">Belum ditugaskan</Badge>}<EtaChip ticket={t} /></div>
                  {t.reporterName && <p className="mt-1.5 text-[11px] text-fg-subtle">Pelapor: {t.reporterName}</p>}
                  {!t.reporterName && user.get(t.requesterId) && null}
                </article>
              ))}
              {list.length === 0 && <p className="px-2 py-8 text-center text-[12px] text-fg-subtle">Kosong</p>}
              {list.length > 20 && <p className="px-2 py-2 text-center text-[12px] text-fg-subtle">+{list.length - 20} lainnya — gunakan filter</p>}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
