import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { addDays, format, isSameDay, startOfDay } from 'date-fns'
import { BadgeCheck, Contact, LogIn, LogOut, Plus, QrCode, Search, UserCheck, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/misc'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { UserChip } from '@/components/shared/badges'
import { useMe, useStore } from '@/store/useStore'
import { fmtSmart, fmtTime } from '@/lib/format'
import { VISITOR_STATUS } from '@/lib/labels'
import type { Visitor } from '@/data/types'

function Pass({ v }: { v: Visitor }) {
  const host = useStore((s) => s.users.find((u) => u.id === v.hostId))
  return (
    <div className="mx-auto w-[260px] overflow-hidden rounded-2xl border border-border bg-white text-slate-900 shadow-pop">
      <div className="bg-[hsl(173_82%_20%)] px-4 py-3 text-white"><p className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">Visitor · Atrium</p><p className="text-[13px] opacity-80">Menara Nusantara</p></div>
      <div className="space-y-1 px-4 py-4 text-center"><p className="text-[22px] font-bold leading-tight">{v.name}</p><p className="text-[13px] text-slate-500">{v.company}</p><p className="pt-2 text-[12px] text-slate-500">Visiting <strong className="text-slate-800">{host?.name}</strong></p><p className="pt-1 text-[12px] text-slate-500">{format(new Date(v.expectedAt), 'EEE d MMM yyyy')}</p></div>
      <div className="border-t border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center"><p className="text-[10.5px] font-semibold uppercase tracking-widest text-slate-400">Pass code</p><p className="tnum text-[26px] font-bold tracking-[0.18em]">{v.passCode}</p></div>
    </div>
  )
}

export function VisitorsPage() {
  const me = useMe()!
  const [sp, setSp] = useSearchParams()
  const toast = useToast()
  const visitors = useStore((s) => s.visitors)
  const users = useStore((s) => s.users)
  const create = useStore((s) => s.createVisitor)
  const setStatus = useStore((s) => s.setVisitorStatus)
  const staff = me.role !== 'requester'
  const [tab, setTab] = React.useState<'today' | 'upcoming' | 'past'>('today')
  const [q, setQ] = React.useState('')
  const [invite, setInvite] = React.useState(sp.get('invite') === '1')
  const [pass, setPass] = React.useState<Visitor | null>(null)
  const [f, setF] = React.useState({ name: '', company: '', email: '', host: me.id, purpose: 'Client meeting', date: format(new Date(), 'yyyy-MM-dd'), time: '10:00', vehicle: '', nda: false })
  const [errs, setErrs] = React.useState<Record<string, string>>({})

  const today = startOfDay(new Date())
  const scope = visitors.filter((v) => staff || v.hostId === me.id)
  const filtered = scope.filter((v) => !q || `${v.name} ${v.company}`.toLowerCase().includes(q.toLowerCase()))
  const rows = {
    today: filtered.filter((v) => isSameDay(new Date(v.expectedAt), today)),
    upcoming: filtered.filter((v) => new Date(v.expectedAt) >= addDays(today, 1)),
    past: filtered.filter((v) => new Date(v.expectedAt) < today),
  }
  const list = [...rows[tab]].sort((a, b) => (tab === 'past' ? b.expectedAt.localeCompare(a.expectedAt) : a.expectedAt.localeCompare(b.expectedAt)))
  const t = scope.filter((v) => isSameDay(new Date(v.expectedAt), today))

  const submit = () => {
    const e: Record<string, string> = {}
    if (f.name.trim().length < 2) e.name = 'Enter the visitor’s full name.'
    if (!f.company.trim()) e.company = 'Which company are they from?'
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'That does not look like an email address.'
    setErrs(e)
    if (Object.keys(e).length) return
    const v = create({ name: f.name.trim(), company: f.company.trim(), email: f.email.trim(), hostId: f.host, purpose: f.purpose, expectedAt: new Date(`${f.date}T${f.time}`).toISOString(), vehicle: f.vehicle || undefined, ndaSigned: f.nda })
    setInvite(false); setSp({}, { replace: true }); setPass(v)
    setF({ ...f, name: '', company: '', email: '', vehicle: '', nda: false })
    toast.push({ tone: 'success', title: `${v.name} invited`, description: f.email ? `QR pass emailed to ${f.email}` : 'Share the pass code with your guest.' })
  }

  return (
    <div className="space-y-5">
      <PageHeader title={staff ? 'Visitors & reception' : 'Visitors'} description={staff ? 'Check guests in and out, print passes and see who is on site.' : 'Invite guests before they arrive so reception can wave them through.'} actions={<Button variant="primary" onClick={() => setInvite(true)}><Plus /> Invite a visitor</Button>} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Expected today" value={t.filter((v) => v.status === 'expected').length} icon={<Contact />} accent="accent" />
        <KpiCard label="On site now" value={t.filter((v) => v.status === 'checked_in').length} icon={<UserCheck />} accent="success" />
        <KpiCard label="Left today" value={t.filter((v) => v.status === 'checked_out').length} icon={<LogOut />} accent="primary" />
        <KpiCard label="Upcoming" value={rows.upcoming.length} sub="next 7 days" icon={<Users />} accent="purple" />
      </div>
      <Tabs value={tab} onChange={setTab} items={[{ value: 'today', label: 'Today', count: rows.today.length }, { value: 'upcoming', label: 'Upcoming', count: rows.upcoming.length }, { value: 'past', label: 'History' }]} />
      <div className="sm:max-w-xs"><Input leading={<Search className="size-4 text-fg-subtle" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or company" aria-label="Search visitors" /></div>
      <Card className="overflow-hidden">
        {list.length === 0 ? <EmptyState icon={<Contact />} title={tab === 'today' ? 'No visitors today' : 'Nothing here'} description={tab === 'today' ? 'Invite a guest and they will show up here with a QR pass.' : undefined} action={<Button variant="primary" onClick={() => setInvite(true)}>Invite a visitor</Button>} /> : (
          <ul className="divide-y divide-border">
            {list.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="w-20 shrink-0 text-center"><p className="tnum text-[15px] font-semibold">{fmtTime(v.expectedAt)}</p><p className="text-[11px] text-fg-subtle">{tab === 'today' ? 'expected' : fmtSmart(v.expectedAt).split(' ').slice(0, 2).join(' ')}</p></div>
                <div className="min-w-0 flex-1 basis-[220px]"><p className="truncate text-[14px] font-medium">{v.name} <span className="font-normal text-fg-muted">· {v.company}</span></p><p className="truncate text-[12px] text-fg-muted">{v.purpose}{v.vehicle ? ` · 🚗 ${v.vehicle}` : ''}</p></div>
                <div className="w-44"><UserChip id={v.hostId} size="sm" showTitle /></div>
                <Badge tone={VISITOR_STATUS[v.status].tone} dot>{VISITOR_STATUS[v.status].label}{v.status === 'checked_in' && ` · ${fmtTime(v.checkedInAt)}`}</Badge>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => setPass(v)} aria-label={`Show pass for ${v.name}`}><QrCode /> Pass</Button>
                  {staff && v.status === 'expected' && <Button variant="primary" size="sm" onClick={() => { setStatus(v.id, 'checked_in'); toast.push({ tone: 'success', title: `${v.name} checked in`, description: 'Host has been notified.' }) }}><LogIn /> Check in</Button>}
                  {staff && v.status === 'checked_in' && <Button variant="secondary" size="sm" onClick={() => { setStatus(v.id, 'checked_out'); toast.push({ tone: 'info', title: `${v.name} checked out` }) }}><LogOut /> Check out</Button>}
                  {v.status === 'expected' && (!staff || v.hostId === me.id) && <Button variant="ghost" size="sm" onClick={() => setStatus(v.id, 'cancelled')}>Cancel</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={invite} onOpenChange={(v) => { setInvite(v); if (!v) setSp({}, { replace: true }) }}>
        <DialogContent size="md" title="Invite a visitor" description="They get a QR pass by email. Reception sees them on today’s list." footer={<><Button variant="ghost" onClick={() => setInvite(false)}>Cancel</Button><Button variant="primary" onClick={submit}>Send invitation</Button></>}>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" required error={errs.name}><Input value={f.name} autoFocus onChange={(e) => setF({ ...f, name: e.target.value })} invalid={!!errs.name} /></Field>
              <Field label="Company" required error={errs.company}><Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} invalid={!!errs.company} /></Field>
            </div>
            <Field label="Email" hint="for the QR pass" error={errs.email}><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} invalid={!!errs.email} /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date"><Input type="date" min={format(new Date(), 'yyyy-MM-dd')} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
              <Field label="Arrival time"><Input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Purpose"><Select value={f.purpose} onChange={(v) => setF({ ...f, purpose: v })} options={['Client meeting', 'Interview', 'Vendor presentation', 'Audit', 'Equipment delivery', 'Contractor site visit', 'Partner workshop'].map((p) => ({ value: p, label: p }))} /></Field>
              {staff ? <Field label="Host"><Select value={f.host} onChange={(v) => setF({ ...f, host: v })} searchable options={users.filter((u) => u.role !== 'agent' || u.id === me.id).map((u) => ({ value: u.id, label: u.name, description: u.title }))} /></Field> : <Field label="Vehicle plate" hint="for parking"><Input value={f.vehicle} onChange={(e) => setF({ ...f, vehicle: e.target.value.toUpperCase() })} placeholder="B 1234 XYZ" /></Field>}
            </div>
            <Checkbox checked={f.nda} onChange={(v) => setF({ ...f, nda: v })} label="Visitor has signed our NDA" />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pass} onOpenChange={(v) => !v && setPass(null)}>
        {pass && (
          <DialogContent size="sm" title="Visitor pass" description="Show this QR/pass code at reception." footer={<><Button variant="ghost" onClick={() => setPass(null)}>Close</Button><Button variant="primary" onClick={() => window.print()}><BadgeCheck /> Print badge</Button></>}>
            <div className="bg-surface-sunken p-6"><Pass v={pass} /></div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
