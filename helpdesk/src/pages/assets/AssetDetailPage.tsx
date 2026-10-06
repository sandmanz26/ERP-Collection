import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CalendarClock, Plus, QrCode, ShieldCheck, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/misc'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { AssetStatusBadge, CriticalityBadge, PriorityBadge, StatusBadge, WoStatusBadge, WoTypeBadge } from '@/components/shared/badges'
import { useLookups, useSpaceLabel } from '@/hooks/useLookups'
import { useMe, useStore } from '@/store/useStore'
import { woCost } from '@/lib/metrics'
import { fmtDate, fmtMoney, fmtMoneyFull } from '@/lib/format'
import { FREQ_LABEL } from '@/lib/pm'
import { ASSET_STATUS } from '@/lib/labels'
import type { AssetStatus } from '@/data/types'

/** A deterministic QR-looking code: a real scan would resolve to /new?asset=<id>. */
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
  return (
    <svg viewBox={`0 0 ${cells.n} ${cells.n}`} className="size-40 rounded-lg bg-white p-2" role="img" aria-label="QR code" shapeRendering="crispEdges">
      {cells.out.map((on, i) => on && <rect key={i} x={i % cells.n} y={Math.floor(i / cells.n)} width="1" height="1" fill="#0b1f1c" />)}
    </svg>
  )
}

export function AssetDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const me = useMe()!
  const a = useStore((s) => s.assets.find((x) => x.id === id))
  const tickets = useStore((s) => s.tickets)
  const wos = useStore((s) => s.workOrders)
  const pms = useStore((s) => s.pmSchedules)
  const patch = useStore((s) => s.patchAsset)
  const { assetCategory, vendor } = useLookups()
  const spaceLabel = useSpaceLabel()
  const toast = useToast()
  const [tab, setTab] = React.useState<'history' | 'tickets' | 'pm'>('history')
  const [qr, setQr] = React.useState(false)

  if (!a) return <EmptyState title="Asset not found" action={<Button variant="secondary" onClick={() => nav('/assets')}><ArrowLeft /> Back</Button>} className="py-24" />
  const myTickets = tickets.filter((t) => t.assetId === a.id).sort((x, y) => y.createdAt.localeCompare(x.createdAt))
  const myWos = wos.filter((w) => w.assetId === a.id).sort((x, y) => y.createdAt.localeCompare(x.createdAt))
  const myPms = pms.filter((p) => p.assetId === a.id)
  const cost12 = myWos.filter((w) => new Date(w.createdAt).getTime() > Date.now() - 365 * 86_400_000).reduce((t, w) => t + woCost(w).total, 0)
  const corrective = myWos.filter((w) => w.type === 'corrective').length
  const warrantyLeft = a.warrantyUntil ? Math.round((new Date(a.warrantyUntil).getTime() - Date.now()) / 86_400_000) : null
  const ageYears = (Date.now() - new Date(a.installedAt).getTime()) / (365 * 86_400_000)
  const staff = me.role !== 'requester'

  return (
    <div className="space-y-5">
      <Link to="/assets" className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> Assets</Link>
      <PageHeader
        eyebrow={<><span className="tnum text-[13px] font-medium text-fg-subtle">{a.tag}</span><AssetStatusBadge status={a.status} /><CriticalityBadge level={a.criticality} /></>}
        title={a.name}
        description={`${assetCategory.get(a.categoryId)?.name} · ${spaceLabel(a.spaceId)}`}
        actions={<>
          <Button variant="secondary" onClick={() => setQr(true)}><QrCode /> QR label</Button>
          <Button variant="secondary" onClick={() => nav(`/new?asset=${a.id}`)}><Plus /> Report issue</Button>
          {staff && <Button variant="primary" onClick={() => nav(`/work-orders/new?asset=${a.id}`)}><Wrench /> New work order</Button>}
        </>}
      />

      {a.status === 'down' && <div role="alert" className="flex items-center gap-3 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-[13.5px] text-danger-soft-fg"><AlertTriangle className="size-5 shrink-0" /><span><strong>This asset is down.</strong> {myTickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length} open ticket(s) are linked to it.</span></div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { l: 'Corrective jobs', v: corrective, s: `${myTickets.length} tickets raised` },
              { l: 'Maintenance cost · 12 mo', v: fmtMoney(cost12), s: `${myWos.length} work orders` },
              { l: 'Age', v: `${ageYears.toFixed(1)} yrs`, s: `Installed ${fmtDate(a.installedAt)}` },
            ].map((k) => <Card key={k.l}><CardBody className="p-4"><p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-fg-subtle">{k.l}</p><p className="tnum mt-1.5 text-[22px] font-semibold tracking-[-0.02em]">{k.v}</p><p className="mt-1 text-[12px] text-fg-muted">{k.s}</p></CardBody></Card>)}
          </div>

          <Tabs value={tab} onChange={setTab} items={[{ value: 'history', label: 'Service history', count: myWos.length }, { value: 'tickets', label: 'Tickets', count: myTickets.length }, { value: 'pm', label: 'Preventive plan', count: myPms.length }]} />
          {tab === 'history' && (
            <Card>
              {myWos.length === 0 ? <EmptyState title="No work recorded" description="Work orders against this asset build its service history." /> : (
                <ul className="divide-y divide-border">
                  {myWos.map((w) => (
                    <li key={w.id}><Link to={`/work-orders/${w.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-bg-muted"><WoTypeBadge type={w.type} /><span className="min-w-0 flex-1 truncate text-[13.5px] font-medium"><span className="tnum mr-2 text-[12px] font-normal text-fg-subtle">{w.number}</span>{w.title}</span><span className="text-[12px] text-fg-muted">{fmtDate(w.completedAt ?? w.dueAt)}</span><span className="tnum w-24 text-right text-[12.5px] text-fg-muted">{fmtMoney(woCost(w).total)}</span><WoStatusBadge status={w.status} /></Link></li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          {tab === 'tickets' && (
            <Card>
              {myTickets.length === 0 ? <EmptyState title="No tickets" description="Nobody has reported a problem with this asset." /> : (
                <ul className="divide-y divide-border">{myTickets.map((t) => <li key={t.id}><Link to={`/tickets/${t.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-bg-muted"><PriorityBadge priority={t.priority} compact /><span className="min-w-0 flex-1 truncate text-[13.5px]"><span className="tnum mr-2 text-[12px] text-fg-subtle">{t.number}</span>{t.title}</span><span className="text-[12px] text-fg-muted">{fmtDate(t.createdAt)}</span><StatusBadge status={t.status} /></Link></li>)}</ul>
              )}
            </Card>
          )}
          {tab === 'pm' && (
            <Card>
              {myPms.length === 0 ? <EmptyState icon={<CalendarClock />} title="No preventive plan" description="Add a schedule so this asset is serviced before it fails." action={staff ? <Button variant="secondary" asChild><Link to="/maintenance">Open maintenance</Link></Button> : undefined} /> : (
                <ul className="divide-y divide-border">{myPms.map((p) => <li key={p.id} className="px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="text-[13.5px] font-medium">{p.name}</span><span className="text-[12px] text-fg-muted">{FREQ_LABEL[p.frequency]}</span></div><p className="mt-0.5 text-[12px] text-fg-muted">Last {fmtDate(p.lastDoneAt)} · next due <span className={new Date(p.nextDueAt) < new Date() ? 'font-semibold text-danger' : ''}>{fmtDate(p.nextDueAt)}</span></p></li>)}</ul>
              )}
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Specification" />
            <CardBody className="space-y-3 text-[13px]">
              {([['Make', a.manufacturer], ['Model', a.model], ['Serial', a.serial], ['Installed', fmtDate(a.installedAt)], ['Replacement value', fmtMoneyFull(a.purchaseCost)], ['Vendor', vendor.get(a.vendorId ?? '')?.name ?? 'In-house'], ['Last service', fmtDate(a.lastServiceAt)]] as [string, string][]).map(([k, v]) => <div key={k} className="grid grid-cols-[110px_1fr] gap-2"><span className="text-fg-muted">{k}</span><span className="break-words">{v}</span></div>)}
              <div className="grid grid-cols-[110px_1fr] gap-2"><span className="text-fg-muted">Warranty</span><span className="inline-flex items-center gap-1.5">{warrantyLeft == null ? '—' : warrantyLeft > 0 ? <><ShieldCheck className="size-4 text-success" /> {fmtDate(a.warrantyUntil)} <span className="text-fg-muted">({warrantyLeft}d)</span></> : <span className="text-fg-muted">Expired {fmtDate(a.warrantyUntil)}</span>}</span></div>
            </CardBody>
          </Card>
          {staff && (
            <Card>
              <CardHeader title="Operating status" description="Visible on the building health panel." />
              <CardBody>
                <Select value={a.status} onChange={(v) => { patch(a.id, { status: v as AssetStatus }); toast.push({ tone: v === 'down' ? 'warning' : 'success', title: `${a.name} marked ${ASSET_STATUS[v as AssetStatus].label.toLowerCase()}` }) }} options={(Object.keys(ASSET_STATUS) as AssetStatus[]).map((s) => ({ value: s, label: ASSET_STATUS[s].label }))} />
              </CardBody>
            </Card>
          )}
        </aside>
      </div>

      <Dialog open={qr} onOpenChange={setQr}>
        <DialogContent size="sm" title="Asset label" description="Print and stick this on the equipment. Scanning opens a pre-filled report." footer={<><Button variant="ghost" onClick={() => setQr(false)}>Close</Button><Button variant="primary" onClick={() => window.print()}>Print</Button></>}>
          <div className="flex flex-col items-center gap-3 p-6"><QrBlock value={a.id} /><div className="text-center"><p className="text-[15px] font-semibold">{a.name}</p><p className="tnum text-[13px] text-fg-muted">{a.tag}</p><p className="mt-1 text-[12px] text-fg-subtle">Scan to report a problem</p></div>{a.id && <Link to={`/new?asset=${a.id}`} className="text-[12.5px] font-medium text-primary hover:underline" onClick={() => setQr(false)}>Simulate a scan →</Link>}</div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
