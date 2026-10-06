import * as React from 'react'
import { addDays, startOfDay, startOfWeek } from 'date-fns'
import { CalendarCheck, CheckCircle2, Clock, Download, Inbox, Timer, Wallet, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Segmented } from '@/components/ui/checkbox'
import { BarChart, HBars } from '@/components/charts/charts'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { RatingFace } from '@/components/shared/Rating'
import { useLookups } from '@/hooks/useLookups'
import { useStore } from '@/store/useStore'
import { DAY, inRange, mttrMs, slaCompliance, woCost } from '@/lib/metrics'
import { downloadCsv } from '@/lib/csv'
import { fmtDuration, fmtMoney, format, pct } from '@/lib/format'
import { PRIORITY, STATUS } from '@/lib/labels'

export function ReportsPage() {
  const tickets = useStore((s) => s.tickets)
  const tasks = useStore((s) => s.tasks)
  const bookings = useStore((s) => s.bookings)
  const spaces = useStore((s) => s.spaces)
  const users = useStore((s) => s.users)
  const [days, setDays] = React.useState<'7' | '30' | '90'>('30')
  const { category, asset, building, space } = useLookups()
  const n = +days
  const now = Date.now()
  const from = now - n * DAY
  const prev = from - n * DAY

  const created = tickets.filter((t) => inRange(t.createdAt, from, now))
  const prevCreated = tickets.filter((t) => inRange(t.createdAt, prev, from))
  const resolved = tickets.filter((t) => inRange(t.resolvedAt, from, now))
  const sla = slaCompliance(tickets, from, now)
  const mttr = mttrMs(tickets, from, now)
  const ratings = tickets.filter((t) => t.rating && inRange(t.rating.at, from, now))
  const good = ratings.filter((t) => t.rating!.score >= 4).length

  const series = React.useMemo(() => {
    if (n <= 30) return Array.from({ length: n }, (_, i) => { const d = addDays(startOfDay(new Date()), -(n - 1 - i)); const a = d.getTime(), b = addDays(d, 1).getTime(); return { label: format(d, n > 14 ? 'd' : 'EEE d'), values: { created: tickets.filter((t) => inRange(t.createdAt, a, b)).length, resolved: tickets.filter((t) => inRange(t.resolvedAt, a, b)).length } } })
    const w0 = startOfWeek(new Date(from), { weekStartsOn: 1 })
    return Array.from({ length: Math.ceil(n / 7) + 1 }, (_, i) => { const d = addDays(w0, i * 7); const a = d.getTime(), b = addDays(d, 7).getTime(); return { label: format(d, 'd MMM'), values: { created: tickets.filter((t) => inRange(t.createdAt, a, b)).length, resolved: tickets.filter((t) => inRange(t.resolvedAt, a, b)).length } } })
  }, [tickets, n, from])

  const count = <T,>(rows: T[], key: (r: T) => string | undefined) => Object.entries(rows.reduce<Record<string, number>>((m, r) => { const k = key(r); if (k) m[k] = (m[k] ?? 0) + 1; return m }, {})).sort((a, b) => b[1] - a[1])
  const byCat = count(created, (t) => t.categoryId).slice(0, 7)
  const byAsset = count(created.filter((t) => t.assetId), (t) => t.assetId).slice(0, 6)
  const byBuilding = count(created, (t) => (t.spaceId ? space.get(t.spaceId)?.buildingId : undefined))

  const techRows = users.filter((u) => u.role !== 'requester').map((u) => {
    const mine = tickets.filter((t) => t.assigneeId === u.id)
    const done = mine.filter((t) => inRange(t.resolvedAt, from, now))
    return { u, active: mine.filter((t) => !['done', 'cancelled'].includes(t.status)).length, done: done.length, mttr: mttrMs(done, from, now), sla: slaCompliance(done, from, now) }
  }).filter((r) => r.active || r.done).sort((a, b) => b.done - a.done)

  const pmDone = tasks.filter((w) => w.type === 'preventive' && w.status === 'completed' && inRange(w.completedAt, from, now))
  const pmOnTime = pmDone.filter((w) => new Date(w.completedAt!).getTime() <= new Date(w.dueAt).getTime() + DAY)
  const cost = (type: string) => tasks.filter((w) => w.type === type && inRange(w.createdAt, from, now)).reduce((t, w) => t + woCost(w).total, 0)
  const costByAsset = Object.entries(tasks.filter((w) => w.assetId && inRange(w.createdAt, from, now)).reduce<Record<string, number>>((m, w) => ((m[w.assetId!] = (m[w.assetId!] ?? 0) + woCost(w).total), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const bk = bookings.filter((b) => b.kind === 'booking' && inRange(b.start, from, now + n * DAY))
  const approved = bk.filter((b) => b.status === 'approved')
  const revenue = approved.filter((b) => b.renterType === 'external').reduce((t, b) => t + b.fee, 0)
  const usage = spaces.filter((s) => s.rental).map((s) => {
    const hrs = approved.filter((b) => b.spaceId === s.id && inRange(b.start, from, now)).reduce((t, b) => t + (new Date(b.end).getTime() - new Date(b.start).getTime()) / 3_600_000, 0)
    const days = Math.max(1, Math.round(n * 5 / 7))
    return { s, hrs, util: hrs / (days * (s.rental!.closeHour - s.rental!.openHour)) }
  }).sort((a, b) => b.util - a.util)

  const delta = (cur: number, p: number) => (p ? { delta: `${cur >= p ? '▲' : '▼'} ${Math.abs(((cur - p) / p) * 100).toFixed(0)}%`, deltaTone: (cur <= p ? 'up' : 'down') as 'up' | 'down' } : {})

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan" description="Ringkasan untuk rapat bulanan: kinerja penanganan, biaya perawatan, dan pemakaian fasilitas."
        actions={<><Segmented value={days} onChange={setDays} options={[{ value: '7', label: '7 hari' }, { value: '30', label: '30 hari' }, { value: '90', label: '90 hari' }]} /><Button variant="secondary" onClick={() => downloadCsv(`laporan-tiket-${days}hari.csv`, [['Nomor', 'Judul', 'Kategori', 'Prioritas', 'Status', 'Dibuat', 'Selesai'], ...created.map((t) => [t.number, t.title, category.get(t.categoryId)?.name, PRIORITY[t.priority].label, STATUS[t.status].label, t.createdAt, t.resolvedAt])])}><Download /> Ekspor tiket</Button></>} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Tiket masuk" value={created.length} {...delta(created.length, prevCreated.length)} sub="vs periode lalu" icon={<Inbox />} accent="primary" />
        <KpiCard label="Selesai" value={resolved.length} icon={<CheckCircle2 />} accent="success" />
        <KpiCard label="Tepat target waktu" value={pct(sla.rate)} sub={`${sla.met} dari ${sla.total}`} icon={<Timer />} accent={sla.rate > 0.85 ? 'success' : 'warning'} />
        <KpiCard label="Rata-rata waktu selesai" value={fmtDuration(mttr)} sub="jam kerja, tanpa waktu tunda" icon={<Clock />} accent="accent" />
        <KpiCard label="Kepatuhan jadwal" value={pmDone.length ? pct(pmOnTime.length / pmDone.length) : '—'} sub={`${pmDone.length} pekerjaan berkala`} icon={<Wrench />} accent="primary" />
        <KpiCard label="Pendapatan sewa" value={fmtMoney(revenue)} sub="pihak luar, disetujui" icon={<Wallet />} accent="purple" />
      </div>

      <Card><CardHeader title="Tiket masuk vs selesai" description={n > 30 ? 'Per minggu' : 'Per hari'} /><CardBody><BarChart height={200} data={series} series={[{ key: 'created', label: 'Masuk', color: 'var(--series-1)' }, { key: 'resolved', label: 'Selesai', color: 'var(--series-3)' }]} /></CardBody></Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card><CardHeader title="Jenis masalah terbanyak" /><CardBody><HBars rows={byCat.map(([id, v]) => ({ label: category.get(id)?.name ?? id, value: v }))} /></CardBody></Card>
        <Card><CardHeader title="Aset paling sering bermasalah" description="Kandidat penggantian atau overhaul" /><CardBody>{byAsset.length ? <HBars color="var(--series-2)" rows={byAsset.map(([id, v]) => ({ label: asset.get(id)?.name ?? id, value: v, sub: asset.get(id)?.tag }))} /> : <p className="text-[13px] text-fg-muted">Belum ada tiket terkait aset.</p>}</CardBody></Card>
        <Card><CardHeader title="Per gedung / area" /><CardBody><HBars color="var(--series-4)" rows={byBuilding.map(([id, v]) => ({ label: building.get(id)?.name ?? id, value: v }))} /></CardBody></Card>
      </div>

      <Card className="overflow-hidden"><CardHeader title="Per teknisi" />
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-[13px]"><thead className="border-b border-border bg-surface-sunken text-[11px] uppercase tracking-[0.06em] text-fg-subtle"><tr>{['Teknisi', 'Aktif sekarang', 'Selesai', 'Rata-rata waktu', 'Tepat target'].map((h, i) => <th key={h} className={`px-4 py-2.5 font-semibold ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">{techRows.map(({ u, active, done, mttr: m, sla: s }) => <tr key={u.id}><td className="px-4 py-2.5"><span className="font-medium">{u.name}</span><span className="block text-[12px] text-fg-muted">{u.title}</span></td><td className="tnum px-4 py-2.5 text-right">{active}</td><td className="tnum px-4 py-2.5 text-right">{done}</td><td className="tnum px-4 py-2.5 text-right">{done ? fmtDuration(m) : '—'}</td><td className="tnum px-4 py-2.5 text-right">{s.total ? pct(s.rate) : '—'}</td></tr>)}</tbody></table></div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Biaya maintenance" description={`Tugas dibuat dalam ${days} hari terakhir`} icon={<Wrench />} />
          <CardBody className="space-y-5"><div className="grid grid-cols-3 gap-3 text-center">{[['Perbaikan', cost('corrective')], ['Berkala', cost('preventive')], ['Inspeksi', cost('inspection')]].map(([k, v]) => <div key={k as string} className="rounded-lg bg-surface-sunken p-3"><p className="text-[12px] text-fg-muted">{k}</p><p className="tnum mt-1 text-[17px] font-semibold">{fmtMoney(v as number)}</p></div>)}</div>
            {costByAsset.length > 0 && <div><p className="mb-2 text-[12.5px] font-medium text-fg-muted">Aset termahal</p><HBars color="var(--series-4)" format={fmtMoney} rows={costByAsset.map(([id, v]) => ({ label: asset.get(id)?.name ?? id, value: v }))} /></div>}</CardBody></Card>
        <Card><CardHeader title="Pemakaian fasilitas" description="Jam terpakai dibanding jam buka (hari kerja)" icon={<CalendarCheck />} />
          <CardBody className="space-y-4"><p className="text-[13px] text-fg-muted"><strong className="tnum text-fg">{approved.length}</strong> reservasi disetujui · <strong className="tnum text-fg">{bk.filter((b) => b.status === 'pending').length}</strong> menunggu · <strong className="tnum text-fg">{bk.filter((b) => b.renterType === 'external' && b.status === 'approved').length}</strong> eksternal</p>
            <HBars max={1} format={(v) => pct(v)} rows={usage.map((u) => ({ label: u.s.name, value: Math.min(1, u.util), sub: `${Math.round(u.hrs)} jam terpakai` }))} /></CardBody></Card>
      </div>

      <Card><CardHeader title="Kepuasan pelapor" description={`${ratings.length} penilaian`} /><CardBody>{ratings.length === 0 ? <p className="text-[13px] text-fg-muted">Belum ada penilaian pada periode ini.</p> : <div className="flex flex-wrap items-center gap-6"><div><p className="tnum text-[28px] font-semibold">{pct(good / ratings.length)}</p><p className="text-[12.5px] text-fg-muted">menilai “puas”</p></div><ul className="flex flex-wrap gap-2">{ratings.slice(0, 4).map((t) => <li key={t.id}><Badge tone="neutral"><RatingFace score={t.rating!.score} /> {t.rating!.comment ?? t.number}</Badge></li>)}</ul></div>}</CardBody></Card>
    </div>
  )
}
