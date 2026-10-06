import { Link } from 'react-router-dom'
import { AlertTriangle, Mail, Phone, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { useStore } from '@/store/useStore'
import { woCost, DAY } from '@/lib/metrics'
import { fmtDate, fmtMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

export function VendorsPage() {
  const vendors = useStore((s) => s.vendors)
  const contracts = useStore((s) => s.contracts)
  const wos = useStore((s) => s.workOrders)
  const assets = useStore((s) => s.assets)
  const now = Date.now()
  const totalValue = contracts.reduce((t, c) => t + c.annualValue, 0)
  const sorted = [...contracts].sort((a, b) => a.endsAt.localeCompare(b.endsAt))
  const expired = contracts.filter((c) => new Date(c.endsAt).getTime() < now).length
  const soon = contracts.filter((c) => { const d = new Date(c.endsAt).getTime() - now; return d >= 0 && d < 60 * DAY }).length

  return (
    <div className="space-y-6">
      <PageHeader title="Vendors & contracts" description="Who we pay to look after the building, what they have promised and when it runs out." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[{ l: 'Annual contract value', v: fmtMoney(totalValue), s: `${contracts.length} contracts` }, { l: 'Expiring in 60 days', v: soon, s: 'plan the renewal now', warn: soon > 0 }, { l: 'Expired', v: expired, s: 'needs a decision', bad: expired > 0 }].map((k) => (
          <Card key={k.l}><CardBody className="p-4"><p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-fg-subtle">{k.l}</p><p className={cn('tnum mt-1.5 text-[24px] font-semibold tracking-[-0.02em]', k.bad && 'text-danger', k.warn && 'text-warning')}>{k.v}</p><p className="mt-1 text-[12px] text-fg-muted">{k.s}</p></CardBody></Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Contracts" description="Soonest to expire first" />
        <ul className="divide-y divide-border">
          {sorted.map((c) => {
            const v = vendors.find((x) => x.id === c.vendorId)!
            const left = Math.round((new Date(c.endsAt).getTime() - now) / DAY)
            const total = Math.round((new Date(c.endsAt).getTime() - new Date(c.startsAt).getTime()) / DAY)
            const used = Math.min(100, Math.max(0, ((total - left) / total) * 100))
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3.5">
                <div className="min-w-0 flex-1 basis-[260px]"><p className="text-[14px] font-semibold">{v.name}</p><p className="text-[12.5px] text-fg-muted">{c.title}</p><p className="mt-1 max-w-xl text-[12px] text-fg-subtle">{c.scope}</p></div>
                <div className="w-44"><div className="mb-1 flex justify-between text-[12px]"><span className="text-fg-muted">{fmtDate(c.startsAt)}</span><span className={cn('font-medium', left < 0 ? 'text-danger' : left < 60 ? 'text-warning' : 'text-fg-muted')}>{fmtDate(c.endsAt)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-neutral-soft"><div className={cn('h-full rounded-full', left < 0 ? 'bg-danger' : left < 60 ? 'bg-warning' : 'bg-primary')} style={{ width: `${used}%` }} /></div></div>
                <div className="w-24 text-right"><p className="tnum text-[14px] font-semibold">{fmtMoney(c.annualValue)}</p><p className="text-[11.5px] text-fg-subtle">per year</p></div>
                <div className="w-32 text-right">{left < 0 ? <Badge tone="danger"><AlertTriangle className="size-3" /> Expired {-left}d ago</Badge> : left < 60 ? <Badge tone="warning">{left}d left</Badge> : <Badge tone="success">Active</Badge>}{c.autoRenew && <p className="mt-1 text-[11px] text-fg-subtle">Auto-renews</p>}</div>
              </li>
            )
          })}
        </ul>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vendors.map((v) => {
          const vw = wos.filter((w) => w.vendorId === v.id)
          const cost = vw.reduce((t, w) => t + woCost(w).vendor, 0)
          const nAssets = assets.filter((a) => a.vendorId === v.id).length
          return (
            <Card key={v.id}><CardBody className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2"><div><p className="text-[14.5px] font-semibold">{v.name}</p><p className="text-[12.5px] text-fg-muted">{v.trade} · contact {v.contact}</p></div><span className="inline-flex items-center gap-1 rounded-md bg-warning-soft px-1.5 py-0.5 text-[12px] font-semibold text-warning-soft-fg"><Star className="size-3 fill-current" />{v.rating.toFixed(1)}</span></div>
              <dl className="grid grid-cols-3 gap-2 rounded-lg bg-surface-sunken p-2.5 text-center"><div><dt className="text-[11px] text-fg-subtle">Assets</dt><dd className="tnum text-[15px] font-semibold">{nAssets}</dd></div><div><dt className="text-[11px] text-fg-subtle">Jobs</dt><dd className="tnum text-[15px] font-semibold">{vw.length}</dd></div><div><dt className="text-[11px] text-fg-subtle">Response</dt><dd className="tnum text-[15px] font-semibold">{v.responseHours}h</dd></div></dl>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-fg-muted"><a href={`tel:${v.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary"><Phone className="size-3.5" />{v.phone}</a><a href={`mailto:${v.email}`} className="inline-flex items-center gap-1.5 hover:text-primary"><Mail className="size-3.5" />{v.email}</a></div>
              {cost > 0 && <p className="text-[12px] text-fg-subtle">Invoiced on work orders: {fmtMoney(cost)}</p>}
              {vw.length > 0 && <Link to="/work-orders" className="text-[12.5px] font-medium text-primary hover:underline">View work orders →</Link>}
            </CardBody></Card>
          )
        })}
      </div>
    </div>
  )
}
