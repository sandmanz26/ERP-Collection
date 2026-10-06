import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Inbox, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/misc'
import { Tabs } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriorityBadge, StatusBadge } from '@/components/shared/badges'
import { Icon } from '@/components/shared/icons'
import { useLookups } from '@/hooks/useLookups'
import { useMe, useStore } from '@/store/useStore'
import { fmtAgo } from '@/lib/format'
import { PENDING_LABEL } from '@/lib/labels'
import { isOpenStatus } from '@/lib/sla'

export function RequestsPage() {
  const me = useMe()!
  const nav = useNavigate()
  const tickets = useStore((s) => s.tickets)
  const { category } = useLookups()
  const [tab, setTab] = React.useState<'open' | 'done'>('open')
  const [q, setQ] = React.useState('')
  const mine = React.useMemo(() => tickets.filter((t) => t.requesterId === me.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [tickets, me.id])
  const open = mine.filter((t) => isOpenStatus(t.status) || t.status === 'resolved')
  const done = mine.filter((t) => !open.includes(t))
  const list = (tab === 'open' ? open : done).filter((t) => !q || `${t.number} ${t.title}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader title="My requests" description="Everything you have raised, newest activity first." actions={<Button variant="primary" onClick={() => nav('/new')}><Plus /> New request</Button>} className="pb-1" />
      <Tabs value={tab} onChange={setTab} items={[{ value: 'open', label: 'Open', count: open.length }, { value: 'done', label: 'Closed', count: done.length }]} />
      <Input leading={<Search className="size-4 text-fg-subtle" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your requests" aria-label="Search your requests" className="sm:max-w-xs" />
      <Card>
        {list.length === 0 ? (
          <EmptyState icon={<Inbox />} title={q ? 'No matches' : tab === 'open' ? 'No open requests' : 'Nothing closed yet'} description={tab === 'open' && !q ? 'Raise one and follow it here from first reply to fix.' : undefined} action={tab === 'open' && !q ? <Button variant="primary" onClick={() => nav('/new')}>New request</Button> : undefined} />
        ) : (
          <ul className="divide-y divide-border">
            {list.map((t) => {
              const c = category.get(t.categoryId)
              return (
                <li key={t.id}>
                  <Link to={`/tickets/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 hover:bg-bg-muted">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-fg"><Icon name={c?.icon ?? ''} className="size-[18px]" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2"><span className="tnum text-[12px] text-fg-subtle">{t.number}</span>{t.unreadForRequester && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold uppercase text-primary-fg">Update</span>}</span>
                      <span className="block truncate text-[14px] font-medium">{t.title}</span>
                      <span className="block text-[12px] text-fg-muted">{c?.name} · updated {fmtAgo(t.updatedAt)}</span>
                    </span>
                    <span className="flex items-center gap-2"><PriorityBadge priority={t.priority} compact /><StatusBadge status={t.status} pending={t.pendingReason ? PENDING_LABEL[t.pendingReason].replace('Waiting on ', '') : undefined} /></span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
