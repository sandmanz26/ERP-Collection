import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Inbox, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/misc'
import { Tabs } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriorityBadge, StatusBadge, UserChip } from '@/components/shared/badges'
import { EtaChip } from '@/components/shared/Eta'
import { Icon } from '@/components/shared/icons'
import { useLookups, useSpaceLabel } from '@/hooks/useLookups'
import { useMe, useStore } from '@/store/useStore'
import { fmtAgo } from '@/lib/format'
import { isOpenStatus } from '@/lib/sla'

export function MyReportsPage() {
  const me = useMe()!
  const nav = useNavigate()
  const tickets = useStore((s) => s.tickets)
  const { category } = useLookups()
  const spaceLabel = useSpaceLabel()
  const [tab, setTab] = React.useState<'open' | 'done'>('open')
  const [q, setQ] = React.useState('')
  const mine = React.useMemo(() => tickets.filter((t) => t.requesterId === me.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [tickets, me.id])
  const open = mine.filter((t) => isOpenStatus(t.status) || (t.status === 'done' && !t.confirmedAt))
  const done = mine.filter((t) => !open.includes(t))
  const list = (tab === 'open' ? open : done).filter((t) => !q || `${t.number} ${t.title}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader title="Laporan saya" description="Semua masalah yang pernah Anda laporkan, lengkap dengan estimasi selesainya." actions={<Button variant="primary" onClick={() => nav('/lapor')}><Plus /> Lapor masalah</Button>} className="pb-1" />
      <Tabs value={tab} onChange={setTab} items={[{ value: 'open', label: 'Berjalan', count: open.length }, { value: 'done', label: 'Selesai', count: done.length }]} />
      <Input leading={<Search className="size-4 text-fg-subtle" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari laporan saya" aria-label="Cari laporan saya" className="sm:max-w-xs" />
      <Card>
        {list.length === 0 ? <EmptyState icon={<Inbox />} title={q ? 'Tidak ditemukan' : tab === 'open' ? 'Tidak ada laporan berjalan' : 'Belum ada yang selesai'} description={tab === 'open' && !q ? 'Lihat fasilitas yang bermasalah? Laporkan, dan pantau estimasi selesainya di sini.' : undefined} action={tab === 'open' && !q ? <Button variant="primary" onClick={() => nav('/lapor')}>Lapor masalah</Button> : undefined} /> : (
          <ul className="divide-y divide-border">
            {list.map((t) => {
              const c = category.get(t.categoryId)
              const needConfirm = t.status === 'done' && !t.confirmedAt
              return (
                <li key={t.id}>
                  <Link to={`/tiket/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 hover:bg-bg-muted">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-fg"><Icon name={c?.icon ?? ''} className="size-5" /></span>
                    <span className="min-w-0 flex-1 basis-[220px]">
                      <span className="flex items-center gap-2"><span className="tnum text-[12px] text-fg-subtle">{t.number}</span>{t.unreadForRequester && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold uppercase text-primary-fg">Baru</span>}</span>
                      <span className="block truncate text-[14.5px] font-medium">{t.title}</span>
                      <span className="block truncate text-[12px] text-fg-muted">{spaceLabel(t.spaceId)} · diperbarui {fmtAgo(t.updatedAt)}</span>
                    </span>
                    <span className="flex flex-col items-start gap-1.5 sm:items-end">
                      <span className="flex items-center gap-2"><PriorityBadge priority={t.priority} compact /><StatusBadge status={t.status} pending={t.pendingReason} /></span>
                      {needConfirm ? <Badge tone="success">Mohon konfirmasi</Badge> : isOpenStatus(t.status) ? <span className="flex items-center gap-2 text-[12px] text-fg-muted">{t.assigneeId && <UserChip id={t.assigneeId} size="sm" />}<EtaChip ticket={t} perspective="requester" /></span> : null}
                    </span>
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
