import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Download, Plus, Search, UserPlus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '@/components/ui/menu'
import { EmptyState } from '@/components/ui/misc'
import { MultiSelect, Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriorityBadge, SlaChip, StatusBadge, UserChip } from '@/components/shared/badges'
import { useLookups, useSpaceLabel } from '@/hooks/useLookups'
import { useNow } from '@/hooks/useNow'
import { useMe, useStore } from '@/store/useStore'
import { downloadCsv } from '@/lib/csv'
import { fmtAgo, fmtDateTime } from '@/lib/format'
import { PRIORITY, STATUS } from '@/lib/labels'
import { isOpenStatus, worstSla } from '@/lib/sla'
import { cn } from '@/lib/utils'
import type { Priority, Ticket, TicketStatus } from '@/data/types'

type View = 'mine' | 'unassigned' | 'risk' | 'open' | 'done' | 'all'
type SortKey = 'urgency' | 'priority' | 'created' | 'updated'
const PAGE = 25

export function TicketsPage() {
  const me = useMe()!
  const nav = useNavigate()
  const toast = useToast()
  const [sp, setSp] = useSearchParams()
  const tickets = useStore((s) => s.tickets)
  const users = useStore((s) => s.users)
  const teams = useStore((s) => s.teams)
  const categories = useStore((s) => s.categories)
  const bulk = useStore((s) => s.bulk)
  const { user, category } = useLookups()
  const spaceLabel = useSpaceLabel()
  const now = useNow(60_000)

  const view = (sp.get('view') as View) || 'open'
  const [q, setQ] = React.useState(sp.get('q') ?? '')
  const [prios, setPrios] = React.useState<Priority[]>([])
  const [statuses, setStatuses] = React.useState<TicketStatus[]>([])
  const [teamId, setTeamId] = React.useState<string>()
  const [assignee, setAssignee] = React.useState<string>()
  const [catId, setCatId] = React.useState<string>()
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'urgency', dir: 1 })
  const [sel, setSel] = React.useState<Set<string>>(new Set())
  const [limit, setLimit] = React.useState(PAGE)

  const setView = (v: View) => { const n = new URLSearchParams(sp); n.set('view', v); setSp(n, { replace: true }); setSel(new Set()); setLimit(PAGE) }

  const counts = React.useMemo(() => {
    const open = tickets.filter((t) => isOpenStatus(t.status))
    return {
      mine: open.filter((t) => t.assigneeId === me.id).length,
      unassigned: open.filter((t) => !t.assigneeId).length,
      risk: open.filter((t) => ['breached', 'at_risk'].includes(worstSla(t, now).state)).length,
      open: open.length,
    }
  }, [tickets, me.id, now])

  const urgencyKey = React.useCallback((t: Ticket) => {
    const r = worstSla(t, now)
    const order: Record<string, number> = { breached: 0, at_risk: 1, ok: 2, paused: 3, met: 4, missed: 4, 'n/a': 5 }
    return order[r.state] * 1e14 + r.dueAt.getTime()
  }, [now])

  const rows = React.useMemo(() => {
    let r = tickets
    if (view === 'mine') r = r.filter((t) => t.assigneeId === me.id && isOpenStatus(t.status))
    else if (view === 'unassigned') r = r.filter((t) => !t.assigneeId && isOpenStatus(t.status))
    else if (view === 'risk') r = r.filter((t) => isOpenStatus(t.status) && ['breached', 'at_risk'].includes(worstSla(t, now).state))
    else if (view === 'open') r = r.filter((t) => isOpenStatus(t.status))
    else if (view === 'done') r = r.filter((t) => !isOpenStatus(t.status))
    const s = q.trim().toLowerCase()
    if (s) r = r.filter((t) => `${t.number} ${t.title} ${user.get(t.requesterId)?.name ?? ''}`.toLowerCase().includes(s))
    if (prios.length) r = r.filter((t) => prios.includes(t.priority))
    if (statuses.length) r = r.filter((t) => statuses.includes(t.status))
    if (teamId) r = r.filter((t) => t.teamId === teamId)
    if (catId) r = r.filter((t) => t.categoryId === catId)
    if (assignee) r = r.filter((t) => (assignee === 'none' ? !t.assigneeId : t.assigneeId === assignee))
    const cmp = {
      urgency: (a: Ticket, b: Ticket) => urgencyKey(a) - urgencyKey(b),
      priority: (a: Ticket, b: Ticket) => PRIORITY[a.priority].rank - PRIORITY[b.priority].rank || urgencyKey(a) - urgencyKey(b),
      created: (a: Ticket, b: Ticket) => b.createdAt.localeCompare(a.createdAt),
      updated: (a: Ticket, b: Ticket) => b.updatedAt.localeCompare(a.updatedAt),
    }[sort.key]
    return [...r].sort((a, b) => cmp(a, b) * sort.dir)
  }, [tickets, view, q, prios, statuses, teamId, catId, assignee, sort, me.id, now, user, urgencyKey])

  const visible = rows.slice(0, limit)
  const allSel = visible.length > 0 && visible.every((t) => sel.has(t.id))
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const filtersOn = prios.length + statuses.length + (teamId ? 1 : 0) + (assignee ? 1 : 0) + (catId ? 1 : 0) + (q ? 1 : 0)
  const clearFilters = () => { setQ(''); setPrios([]); setStatuses([]); setTeamId(undefined); setAssignee(undefined); setCatId(undefined) }

  const doBulk = (patch: Parameters<typeof bulk>[1], msg: string) => { bulk([...sel], patch); toast.push({ tone: 'success', title: `${sel.size} ticket${sel.size > 1 ? 's' : ''} ${msg}` }); setSel(new Set()) }
  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }))
  const sortHead = (k: SortKey, children: React.ReactNode, className?: string) => (
    <th key={k} className={cn('px-3 py-2.5 text-left', className)} aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => sortBy(k)} className="inline-flex items-center gap-1 font-semibold uppercase tracking-[0.06em] hover:text-fg">{children}{sort.key === k && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}</button>
    </th>
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tickets"
        description="Everything reported across both buildings. The default order is whatever will breach its SLA first."
        actions={<>
          <Button variant="secondary" onClick={() => { downloadCsv('tickets.csv', [['Number', 'Title', 'Priority', 'Status', 'Requester', 'Assignee', 'Created', 'Category'], ...rows.map((t) => [t.number, t.title, t.priority, t.status, user.get(t.requesterId)?.name, user.get(t.assigneeId ?? '')?.name, t.createdAt, category.get(t.categoryId)?.name])]); toast.push({ tone: 'success', title: `Exported ${rows.length} tickets` }) }}><Download /> Export</Button>
          <Button variant="primary" onClick={() => nav('/new')}><Plus /> New ticket</Button>
        </>}
        className="pb-1"
      />

      <Tabs
        value={view}
        onChange={setView}
        items={[
          { value: 'mine', label: 'Assigned to me', count: counts.mine },
          { value: 'unassigned', label: 'Unassigned', count: counts.unassigned },
          { value: 'risk', label: 'SLA at risk', count: counts.risk },
          { value: 'open', label: 'All open', count: counts.open },
          { value: 'done', label: 'Resolved & closed' },
          { value: 'all', label: 'Everything' },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64"><Input leading={<Search className="size-4 text-fg-subtle" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search number, title, requester" aria-label="Search tickets" /></div>
        <MultiSelect className="w-[140px]" values={prios} onChange={setPrios} placeholder="Priority" options={(['p1', 'p2', 'p3', 'p4'] as Priority[]).map((p) => ({ value: p, label: `${PRIORITY[p].short} ${PRIORITY[p].label}` }))} />
        <MultiSelect className="w-[140px]" values={statuses} onChange={setStatuses} placeholder="Status" options={(Object.keys(STATUS) as TicketStatus[]).map((s) => ({ value: s, label: STATUS[s].label }))} />
        <Select className="w-[170px]" value={teamId} onChange={setTeamId} clearable onClear={() => setTeamId(undefined)} placeholder="Any team" options={teams.map((t) => ({ value: t.id, label: t.name }))} />
        <Select className="w-[170px]" value={catId} onChange={setCatId} clearable onClear={() => setCatId(undefined)} placeholder="Any category" searchable options={categories.map((c) => ({ value: c.id, label: c.name }))} />
        <Select className="w-[170px]" value={assignee} onChange={setAssignee} clearable onClear={() => setAssignee(undefined)} placeholder="Any assignee" searchable options={[{ value: 'none', label: 'Unassigned' }, ...users.filter((u) => u.role !== 'requester').map((u) => ({ value: u.id, label: u.name }))]} />
        {filtersOn > 0 && <Button variant="ghost" size="sm" onClick={clearFilters}><X /> Clear {filtersOn}</Button>}
        <span className="ml-auto text-[12.5px] text-fg-muted" aria-live="polite">{rows.length} ticket{rows.length === 1 ? '' : 's'}</span>
      </div>

      {sel.size > 0 && (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary-soft px-3 py-2 shadow-pop" role="toolbar" aria-label="Bulk actions">
          <span className="text-[13px] font-semibold text-primary-soft-fg">{sel.size} selected</span>
          <span className="mx-1 h-4 w-px bg-primary/30" />
          <Menu>
            <MenuTrigger asChild><Button variant="secondary" size="sm"><UserPlus /> Assign</Button></MenuTrigger>
            <MenuContent align="start" className="max-h-72 overflow-y-auto"><MenuLabel>Assign to</MenuLabel>{users.filter((u) => u.role !== 'requester').map((u) => <MenuItem key={u.id} onSelect={() => doBulk({ assigneeId: u.id }, `assigned to ${u.name}`)}>{u.name}</MenuItem>)}</MenuContent>
          </Menu>
          <Menu>
            <MenuTrigger asChild><Button variant="secondary" size="sm">Priority</Button></MenuTrigger>
            <MenuContent align="start">{(['p1', 'p2', 'p3', 'p4'] as Priority[]).map((p) => <MenuItem key={p} onSelect={() => doBulk({ priority: p }, `set to ${PRIORITY[p].label}`)}>{PRIORITY[p].short} · {PRIORITY[p].label}</MenuItem>)}</MenuContent>
          </Menu>
          <Button variant="secondary" size="sm" onClick={() => doBulk({ status: 'in_progress' }, 'started')}>Start work</Button>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSel(new Set())}>Clear selection</Button>
        </div>
      )}

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={<Search />} title={filtersOn ? 'No tickets match these filters' : 'Nothing here'} description={filtersOn ? 'Try removing a filter or widening the search.' : view === 'mine' ? 'You have no open tickets assigned. Check the unassigned queue.' : undefined} action={filtersOn ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button> : view === 'mine' ? <Button variant="primary" onClick={() => setView('unassigned')}>Open unassigned</Button> : undefined} />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] text-[13px]">
                <thead className="border-b border-border bg-surface-sunken text-[11px] text-fg-subtle">
                  <tr>
                    <th className="w-10 px-3 py-2.5"><Checkbox checked={allSel} indeterminate={!allSel && visible.some((t) => sel.has(t.id))} onChange={(v) => setSel(v ? new Set(visible.map((t) => t.id)) : new Set())} aria-label="Select all" /></th>
                    {sortHead('priority', 'Priority', 'w-[84px]')}
                    <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-[0.06em]">Ticket</th>
                    <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-[0.06em]">Status</th>
                    {sortHead('urgency', 'SLA')}
                    <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-[0.06em]">Assignee</th>
                    {sortHead('updated', 'Updated', 'text-right')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((t) => (
                    <tr key={t.id} className={cn('group cursor-pointer transition-colors hover:bg-bg-muted/70', sel.has(t.id) && 'bg-primary-soft/40')} onClick={() => nav(`/tickets/${t.id}`)}>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}><Checkbox checked={sel.has(t.id)} onChange={() => toggle(t.id)} aria-label={`Select ${t.number}`} /></td>
                      <td className="px-3 py-2.5"><PriorityBadge priority={t.priority} compact /></td>
                      <td className="max-w-[420px] px-3 py-2.5">
                        <Link to={`/tickets/${t.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-fg group-hover:text-primary"><span className="tnum mr-2 font-normal text-fg-subtle">{t.number}</span>{t.title}</Link>
                        <span className="block truncate text-[12px] text-fg-muted">{user.get(t.requesterId)?.name} · {spaceLabel(t.spaceId)}</span>
                      </td>
                      <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
                      <td className="px-3 py-2.5"><SlaChip ticket={t} /></td>
                      <td className="px-3 py-2.5">{t.assigneeId ? <UserChip id={t.assigneeId} size="sm" /> : <Badge tone="warning" size="sm">Unassigned</Badge>}</td>
                      <td className="px-3 py-2.5 text-right text-[12.5px] text-fg-muted" title={fmtDateTime(t.updatedAt)}>{fmtAgo(t.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {visible.map((t) => (
                <li key={t.id}>
                  <Link to={`/tickets/${t.id}`} className="block space-y-1.5 px-4 py-3 active:bg-bg-muted">
                    <div className="flex items-center gap-2"><PriorityBadge priority={t.priority} compact /><span className="tnum text-[12px] text-fg-subtle">{t.number}</span><span className="ml-auto text-[12px] text-fg-subtle">{fmtAgo(t.updatedAt)}</span></div>
                    <p className="text-[14px] font-medium leading-snug">{t.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><StatusBadge status={t.status} /><SlaChip ticket={t} />{t.assigneeId ? <span className="text-[12px] text-fg-muted">{user.get(t.assigneeId)?.name}</span> : <Badge tone="warning" size="sm">Unassigned</Badge>}</div>
                  </Link>
                </li>
              ))}
            </ul>
            {rows.length > limit && (
              <div className="flex items-center justify-between border-t border-border bg-surface-sunken/60 px-4 py-3 text-[13px]">
                <span className="text-fg-muted">Showing {visible.length} of {rows.length}</span>
                <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + PAGE)}>Show {Math.min(PAGE, rows.length - limit)} more</Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
