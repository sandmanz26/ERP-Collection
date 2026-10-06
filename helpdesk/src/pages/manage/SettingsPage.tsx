import * as React from 'react'
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriorityBadge } from '@/components/shared/badges'
import { Icon } from '@/components/shared/icons'
import { useLookups } from '@/hooks/useLookups'
import { useStore } from '@/store/useStore'
import { BUSINESS_HOURS, SLA_POLICIES } from '@/lib/sla'
import { fmtDuration } from '@/lib/format'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export function SettingsPage() {
  const [tab, setTab] = React.useState<'sla' | 'routing' | 'teams' | 'canned' | 'demo'>('sla')
  const toast = useToast()
  const categories = useStore((s) => s.categories)
  const teams = useStore((s) => s.teams)
  const users = useStore((s) => s.users)
  const canned = useStore((s) => s.canned)
  const add = useStore((s) => s.addCanned)
  const remove = useStore((s) => s.removeCanned)
  const reset = useStore((s) => s.resetDemo)
  const { team } = useLookups()
  const [d, setD] = React.useState({ title: '', body: '' })

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="How tickets are routed, how fast we promise to respond, and who does the work." className="pb-1" />
      <Tabs value={tab} onChange={setTab} items={[{ value: 'sla', label: 'Service levels' }, { value: 'routing', label: 'Categories & routing', count: categories.length }, { value: 'teams', label: 'Teams', count: teams.length }, { value: 'canned', label: 'Canned replies', count: canned.length }, { value: 'demo', label: 'Demo data' }]} />

      {tab === 'sla' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader title="Response & resolution targets" description="The clock starts when a ticket is created and stops while it is pending." />
            <div className="overflow-x-auto"><table className="w-full min-w-[460px] text-[13px]"><thead className="border-b border-border bg-surface-sunken text-[11px] uppercase tracking-[0.06em] text-fg-subtle"><tr>{['Priority', 'First response', 'Resolution', 'Clock'].map((h) => <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">{SLA_POLICIES.map((p) => <tr key={p.priority}><td className="px-4 py-3"><PriorityBadge priority={p.priority} /></td><td className="tnum px-4 py-3">{fmtDuration(p.responseMin * 60_000)}</td><td className="tnum px-4 py-3">{fmtDuration(p.resolveMin * 60_000)}</td><td className="px-4 py-3"><Badge tone={p.calendar === '24x7' ? 'danger' : 'neutral'}>{p.calendar === '24x7' ? '24 × 7' : 'Business hours'}</Badge></td></tr>)}</tbody></table></div>
          </Card>
          <Card>
            <CardHeader title="Business hours" />
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-1.5">{DAYS.map((x, i) => <span key={x} className={BUSINESS_HOURS.days.includes(i) ? 'rounded-md bg-primary-soft px-2.5 py-1 text-[12.5px] font-semibold text-primary-soft-fg' : 'rounded-md bg-neutral-soft px-2.5 py-1 text-[12.5px] text-fg-subtle'}>{x}</span>)}</div>
              <p className="text-[13.5px]"><span className="tnum font-semibold">{hm(BUSINESS_HOURS.startMin)} – {hm(BUSINESS_HOURS.endMin)}</span> <span className="text-fg-muted">Jakarta (WIB)</span></p>
              <p className="rounded-lg bg-surface-sunken p-3 text-[12.5px] leading-relaxed text-fg-muted">Critical incidents ignore business hours. For everything else, nights, weekends and public holidays do not count against the clock.</p>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'routing' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-[13px]"><thead className="border-b border-border bg-surface-sunken text-[11px] uppercase tracking-[0.06em] text-fg-subtle"><tr>{['Category', 'Type', 'Routes to', 'Default priority'].map((h) => <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">{categories.map((c) => <tr key={c.id}><td className="px-4 py-2.5"><span className="inline-flex items-center gap-2 font-medium"><Icon name={c.icon} className="size-4 text-primary" />{c.name}</span><span className="block pl-6 text-[12px] text-fg-muted">{c.description}</span></td><td className="px-4 py-2.5"><Badge tone="outline">{c.kind === 'incident' ? 'Incident' : 'Request'}</Badge></td><td className="px-4 py-2.5">{team.get(c.teamId)?.name}</td><td className="px-4 py-2.5"><PriorityBadge priority={c.defaultPriority} compact /></td></tr>)}</tbody></table></div>
        </Card>
      )}

      {tab === 'teams' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{teams.map((t) => { const m = users.filter((u) => u.teamId === t.id); return <Card key={t.id}><CardBody className="space-y-3 p-4"><div><p className="text-[14.5px] font-semibold">{t.name}</p><p className="text-[12.5px] text-fg-muted">{t.description}</p></div><ul className="space-y-1.5">{m.map((u) => <li key={u.id} className="flex items-center justify-between text-[13px]"><span>{u.name}</span><span className="text-[12px] text-fg-muted">{u.title}</span></li>)}</ul><p className="text-[12px] text-fg-subtle">{categories.filter((c) => c.teamId === t.id).length} categories routed here</p></CardBody></Card> })}</div>
      )}

      {tab === 'canned' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Card><CardHeader title="Canned replies" description="Agents insert these from the reply box. {{name}} becomes the requester’s first name." />
            <ul className="divide-y divide-border">{canned.map((c) => <li key={c.id} className="flex items-start gap-3 px-4 py-3"><div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium">{c.title}</p><p className="mt-0.5 text-[12.5px] leading-relaxed text-fg-muted">{c.body}</p></div><Button variant="ghost" size="iconXs" aria-label={`Delete ${c.title}`} onClick={() => remove(c.id)}><Trash2 /></Button></li>)}</ul>
          </Card>
          <Card><CardHeader title="Add a reply" /><CardBody className="space-y-3.5"><Field label="Name"><Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="e.g. Ask for a photo" /></Field><Field label="Message"><Textarea rows={5} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} placeholder="Hi {{name}}, …" /></Field><Button variant="primary" disabled={!d.title.trim() || !d.body.trim()} onClick={() => { add(d.title.trim(), d.body.trim()); setD({ title: '', body: '' }); toast.push({ tone: 'success', title: 'Reply saved' }) }}><Plus /> Save reply</Button></CardBody></Card>
        </div>
      )}

      {tab === 'demo' && (
        <Card className="max-w-xl"><CardHeader title="Demo data" description="Everything in this workspace is mock data stored in your browser (localStorage). Nothing leaves your device." /><CardBody className="space-y-3"><p className="text-[13px] text-fg-muted">Reset to regenerate the whole book: tickets, work orders, bookings and visitors, with timestamps relative to right now.</p><Button variant="outlineDanger" onClick={() => { reset(); toast.push({ tone: 'success', title: 'Demo data reset' }) }}><RotateCcw /> Reset demo data</Button></CardBody></Card>
      )}
    </div>
  )
}
