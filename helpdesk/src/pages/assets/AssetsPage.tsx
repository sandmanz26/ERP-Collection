import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Boxes, Download, FileUp, Plus, Search } from 'lucide-react'
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
import { useMe, useStore } from '@/store/useStore'
import { downloadCsv } from '@/lib/csv'
import { fmtDate } from '@/lib/format'
import { ASSET_STATUS, CRITICALITY } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { AssetFormDialog } from './forms'
import { AssetImportDialog } from './AssetImport'
import type { AssetStatus } from '@/data/types'

/** Soonest active routine for each asset — the "when is it next serviced" answer. */
export function useNextService() {
  const pms = useStore((s) => s.pmSchedules)
  return React.useMemo(() => {
    const m = new Map<string, string>()
    pms.filter((p) => p.active && p.assetId).forEach((p) => { const cur = m.get(p.assetId!); if (!cur || p.nextDueAt < cur) m.set(p.assetId!, p.nextDueAt) })
    return m
  }, [pms])
}

export function AssetsPage() {
  const me = useMe()!
  const nav = useNavigate()
  const assets = useStore((s) => s.assets)
  const cats = useStore((s) => s.assetCategories)
  const spaces = useStore((s) => s.spaces)
  const { assetCategory, vendor } = useLookups()
  const spaceLabel = useSpaceLabel()
  const next = useNextService()
  const staff = me.role !== 'requester'
  const [tab, setTab] = React.useState<'all' | AssetStatus | 'service' | 'warranty'>('all')
  const [cat, setCat] = React.useState<string>()
  const [loc, setLoc] = React.useState<string>()
  const [q, setQ] = React.useState('')
  const [form, setForm] = React.useState(false)
  const [imp, setImp] = React.useState(false)
  const now = Date.now()
  const overdue = (id: string) => { const n = next.get(id); return !!n && new Date(n).getTime() < now }

  const base = assets.filter((a) => a.status !== 'retired' || tab === 'retired')
  const rows = base.filter((a) => {
    if (tab === 'service') { if (!overdue(a.id)) return false }
    else if (tab === 'warranty') { if (!a.warrantyUntil || new Date(a.warrantyUntil).getTime() < now || new Date(a.warrantyUntil).getTime() > now + 90 * 86_400_000) return false }
    else if (tab !== 'all' && a.status !== tab) return false
    if (cat && a.categoryId !== cat) return false
    if (loc && a.spaceId !== loc) return false
    const s = q.trim().toLowerCase()
    return !s || `${a.name} ${a.tag} ${a.manufacturer} ${a.model} ${a.serial}`.toLowerCase().includes(s)
  })
  const c = (st: AssetStatus) => base.filter((a) => a.status === st).length

  return (
    <div className="space-y-4">
      <PageHeader title="Aset" description="Daftar peralatan dan fasilitas, kondisinya, dan kapan perawatan berikutnya. Tempel QR pada aset agar siapa pun bisa melapor lewat HP."
        actions={<>
          <Button variant="secondary" onClick={() => downloadCsv('aset.csv', [['Tag', 'Nama', 'Kategori', 'Lokasi', 'Kondisi', 'Kritikalitas', 'Servis terakhir', 'Servis berikutnya'], ...rows.map((a) => [a.tag, a.name, assetCategory.get(a.categoryId)?.name, spaceLabel(a.spaceId), ASSET_STATUS[a.status].label, CRITICALITY[a.criticality].label, a.lastServiceAt, next.get(a.id)])])}><Download /> <span className="hidden sm:inline">Ekspor</span></Button>
          {staff && <Button variant="secondary" onClick={() => setImp(true)}><FileUp /> Impor Excel/CSV</Button>}
          {staff && <Button variant="primary" onClick={() => setForm(true)}><Plus /> Tambah aset</Button>}
        </>} className="pb-1" />
      <Tabs value={tab} onChange={setTab} items={[{ value: 'all', label: 'Semua', count: base.length }, { value: 'down', label: 'Rusak', count: c('down') }, { value: 'degraded', label: 'Terganggu', count: c('degraded') }, { value: 'service', label: 'Servis terlambat', count: base.filter((a) => overdue(a.id)).length }, { value: 'warranty', label: 'Garansi segera habis' }]} />
      <div className="flex flex-wrap gap-2">
        <div className="w-full sm:w-72"><Input leading={<Search className="size-4 text-fg-subtle" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama, tag, merk, no. seri" aria-label="Cari aset" /></div>
        <Select className="w-[200px]" value={cat} onChange={setCat} clearable onClear={() => setCat(undefined)} placeholder="Semua kategori" options={cats.map((x) => ({ value: x.id, label: x.name }))} />
        <Select className="w-[200px]" value={loc} onChange={setLoc} clearable onClear={() => setLoc(undefined)} searchable placeholder="Semua lokasi" options={spaces.map((s) => ({ value: s.id, label: s.name }))} />
      </div>
      <Card className="overflow-hidden">
        {rows.length === 0 ? <EmptyState icon={<Boxes />} title={assets.length === 0 ? 'Belum ada aset' : 'Tidak ada aset yang cocok'} description={assets.length === 0 ? 'Mulai dengan impor daftar dari Excel atau tambah satu per satu.' : undefined} action={staff ? <div className="flex gap-2"><Button variant="secondary" onClick={() => setImp(true)}>Impor Excel/CSV</Button><Button variant="primary" onClick={() => setForm(true)}>Tambah aset</Button></div> : undefined} /> : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-[13px]">
                <thead className="border-b border-border bg-surface-sunken text-[11px] uppercase tracking-[0.06em] text-fg-subtle"><tr>{['Aset', 'Lokasi', 'Kondisi', 'Kritikalitas', 'Servis terakhir', 'Servis berikutnya', 'Vendor'].map((h) => <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-border">
                  {rows.map((a) => {
                    const n = next.get(a.id)
                    const late = overdue(a.id)
                    return (
                      <tr key={a.id} className="cursor-pointer hover:bg-bg-muted/70" onClick={() => nav(`/aset/${a.id}`)}>
                        <td className="px-3 py-2.5"><Link to={`/aset/${a.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2.5 font-medium hover:text-primary"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-fg"><Icon name={assetCategory.get(a.categoryId)?.icon ?? ''} className="size-4" /></span><span><span className="block">{a.name}</span><span className="tnum block text-[12px] font-normal text-fg-subtle">{a.tag}</span></span></Link></td>
                        <td className="px-3 py-2.5 text-fg-muted">{spaceLabel(a.spaceId)}</td>
                        <td className="px-3 py-2.5"><AssetStatusBadge status={a.status} /></td>
                        <td className="px-3 py-2.5"><CriticalityBadge level={a.criticality} /></td>
                        <td className="px-3 py-2.5 text-fg-muted">{fmtDate(a.lastServiceAt)}</td>
                        <td className="px-3 py-2.5">{n ? <span className={cn('inline-flex items-center gap-1', late ? 'font-semibold text-danger' : 'text-fg')}>{late && <AlertTriangle className="size-3.5" />}{fmtDate(n)}{late && ' · terlambat'}</span> : <span className="text-fg-subtle">Belum dijadwalkan</span>}</td>
                        <td className="px-3 py-2.5 text-fg-muted">{vendor.get(a.vendorId ?? '')?.name ?? 'Internal'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {rows.map((a) => { const n = next.get(a.id); return (
                <li key={a.id}><Link to={`/aset/${a.id}`} className="block space-y-1.5 px-4 py-3.5"><div className="flex items-center justify-between gap-2"><span className="text-[14.5px] font-medium">{a.name}</span><AssetStatusBadge status={a.status} /></div><p className="text-[12px] text-fg-muted">{a.tag} · {spaceLabel(a.spaceId)}</p><p className={cn('text-[12.5px]', overdue(a.id) ? 'font-medium text-danger' : 'text-fg-muted')}>{n ? `Servis berikutnya ${fmtDate(n)}${overdue(a.id) ? ' (terlambat)' : ''}` : 'Belum ada jadwal servis'}</p></Link></li>
              ) })}
            </ul>
          </>
        )}
      </Card>
      <p className="text-[12px] text-fg-subtle">{rows.length} aset ditampilkan.</p>
      <AssetFormDialog open={form} onOpenChange={setForm} onSaved={(a) => nav(`/aset/${a.id}`)} />
      <AssetImportDialog open={imp} onOpenChange={setImp} />
    </div>
  )
}
