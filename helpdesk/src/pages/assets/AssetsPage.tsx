import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Boxes, Download, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/misc'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { AssetStatusBadge, CriticalityBadge } from '@/components/shared/badges'
import { Icon } from '@/components/shared/icons'
import { useLookups, useSpaceLabel } from '@/hooks/useLookups'
import { useStore } from '@/store/useStore'
import { downloadCsv } from '@/lib/csv'
import { fmtDate, fmtMoney } from '@/lib/format'
import type { AssetStatus } from '@/data/types'
import { cn } from '@/lib/utils'

export function AssetsPage() {
  const nav = useNavigate()
  const assets = useStore((s) => s.assets)
  const cats = useStore((s) => s.assetCategories)
  const { assetCategory, vendor } = useLookups()
  const spaceLabel = useSpaceLabel()
  const [tab, setTab] = React.useState<'all' | AssetStatus | 'warranty'>('all')
  const [cat, setCat] = React.useState<string>()
  const [q, setQ] = React.useState('')
  const now = Date.now()
  const rows = assets.filter((a) => {
    if (tab === 'warranty') { if (!a.warrantyUntil || new Date(a.warrantyUntil).getTime() < now) return false }
    else if (tab !== 'all' && a.status !== tab) return false
    if (cat && a.categoryId !== cat) return false
    const s = q.trim().toLowerCase()
    return !s || `${a.name} ${a.tag} ${a.manufacturer} ${a.model} ${a.serial}`.toLowerCase().includes(s)
  })
  const c = (st: AssetStatus) => assets.filter((a) => a.status === st).length
  return (
    <div className="space-y-4">
      <PageHeader title="Assets" description="The register of everything we maintain. Scan a QR sticker on any item to report an issue with it pre-filled." actions={<Button variant="secondary" onClick={() => downloadCsv('assets.csv', [['Tag', 'Name', 'Category', 'Status', 'Criticality', 'Location'], ...rows.map((a) => [a.tag, a.name, assetCategory.get(a.categoryId)?.name, a.status, a.criticality, spaceLabel(a.spaceId)])])}><Download /> Export</Button>} className="pb-1" />
      <Tabs value={tab} onChange={setTab} items={[{ value: 'all', label: 'All', count: assets.length }, { value: 'down', label: 'Down', count: c('down') }, { value: 'degraded', label: 'Degraded', count: c('degraded') }, { value: 'operational', label: 'Operational', count: c('operational') }, { value: 'warranty', label: 'Under warranty' }]} />
      <div className="flex flex-wrap gap-2">
        <div className="w-full sm:w-72"><Input leading={<Search className="size-4 text-fg-subtle" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, tag, make, serial" aria-label="Search assets" /></div>
        <Select className="w-[190px]" value={cat} onChange={setCat} clearable onClear={() => setCat(undefined)} placeholder="All categories" options={cats.map((x) => ({ value: x.id, label: x.name }))} />
      </div>
      <Card className="overflow-hidden">
        {rows.length === 0 ? <EmptyState icon={<Boxes />} title="No assets match" /> : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-[13px]">
                <thead className="border-b border-border bg-surface-sunken text-[11px] uppercase tracking-[0.06em] text-fg-subtle"><tr>{['Asset', 'Category', 'Location', 'Status', 'Criticality', 'Last service', 'Vendor'].map((h) => <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-border">
                  {rows.map((a) => (
                    <tr key={a.id} className="cursor-pointer hover:bg-bg-muted/70" onClick={() => nav(`/assets/${a.id}`)}>
                      <td className="px-3 py-2.5"><Link to={`/assets/${a.id}`} onClick={(e) => e.stopPropagation()} className="block font-medium hover:text-primary">{a.name}</Link><span className="tnum text-[12px] text-fg-subtle">{a.tag}</span></td>
                      <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5 text-fg-muted"><Icon name={assetCategory.get(a.categoryId)?.icon ?? ''} className="size-3.5" />{assetCategory.get(a.categoryId)?.name}</span></td>
                      <td className="px-3 py-2.5 text-fg-muted">{spaceLabel(a.spaceId)}</td>
                      <td className="px-3 py-2.5"><AssetStatusBadge status={a.status} /></td>
                      <td className="px-3 py-2.5"><CriticalityBadge level={a.criticality} /></td>
                      <td className="px-3 py-2.5 text-fg-muted">{fmtDate(a.lastServiceAt)}</td>
                      <td className="px-3 py-2.5 text-fg-muted">{vendor.get(a.vendorId ?? '')?.name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {rows.map((a) => (
                <li key={a.id}><Link to={`/assets/${a.id}`} className="block space-y-1 px-4 py-3"><div className="flex items-center justify-between gap-2"><span className="text-[14px] font-medium">{a.name}</span><AssetStatusBadge status={a.status} /></div><p className="text-[12px] text-fg-muted">{a.tag} · {spaceLabel(a.spaceId)}</p><div className={cn('flex gap-2')}><CriticalityBadge level={a.criticality} /></div></Link></li>
              ))}
            </ul>
          </>
        )}
      </Card>
      <p className="text-[12px] text-fg-subtle">Replacement value of this selection: {fmtMoney(rows.reduce((t, a) => t + a.purchaseCost, 0))}</p>
    </div>
  )
}
