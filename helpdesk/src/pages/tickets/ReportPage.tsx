import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, ImagePlus, LifeBuoy, Paperclip, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Icon } from '@/components/shared/icons'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/badges'
import { EtaChip } from '@/components/shared/Eta'
import { useMe, useStore } from '@/store/useStore'
import { useLookups } from '@/hooks/useLookups'
import { IMPACT, PRIORITY } from '@/lib/labels'
import { policyFor, isOpenStatus } from '@/lib/sla'
import { fmtDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Impact, Ticket } from '@/data/types'

const ASSET_TO_CATEGORY: Record<string, string> = { ac_utilitas: 'c_utilitas', ac_listrik: 'c_listrik', ac_ac: 'c_ac', ac_air: 'c_air', ac_k3: 'c_k3', ac_angkut: 'c_forklift', ac_it: 'c_it', ac_gedung: 'c_sipil' }

/** Short for the common cases: tap the problem type, say where, say what, say how bad. */
function ReportForm({ anonymous }: { anonymous?: boolean }) {
  const me = useMe()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const { category, space, building, team } = useLookups()
  const categories = useStore((s) => s.categories)
  const spaces = useStore((s) => s.spaces)
  const assets = useStore((s) => s.assets)
  const tickets = useStore((s) => s.tickets)
  const createTicket = useStore((s) => s.createTicket)

  const qrAsset = sp.get('aset') ? assets.find((a) => a.id === sp.get('aset')) : undefined
  const [categoryId, setCategoryId] = React.useState<string | undefined>(sp.get('kategori') ?? (qrAsset ? ASSET_TO_CATEGORY[qrAsset.categoryId] : undefined))
  const [spaceId, setSpaceId] = React.useState<string | undefined>(sp.get('lokasi') ?? qrAsset?.spaceId ?? me?.homeSpaceId)
  const [assetId, setAssetId] = React.useState<string | undefined>(qrAsset?.id)
  const [title, setTitle] = React.useState(sp.get('judul') ?? '')
  const [desc, setDesc] = React.useState('')
  const [impact, setImpact] = React.useState<Impact | undefined>()
  const [hazard, setHazard] = React.useState(false)
  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [files, setFiles] = React.useState<string[]>([])
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [done, setDone] = React.useState<Ticket | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const cat = categoryId ? category.get(categoryId) : undefined
  const priority = hazard ? 'p1' : impact ? IMPACT[impact].priority : cat?.defaultPriority ?? 'p3'

  const spaceOptions = React.useMemo(
    () => [...spaces].sort((a, b) => a.buildingId.localeCompare(b.buildingId) || a.name.localeCompare(b.name)).map((s) => ({ value: s.id, label: s.name, group: building.get(s.buildingId)?.name })),
    [spaces, building],
  )
  const assetOptions = React.useMemo(
    () => assets.filter((a) => a.status !== 'retired').map((a) => ({ a, near: a.spaceId === spaceId })).sort((x, y) => Number(y.near) - Number(x.near) || x.a.name.localeCompare(y.a.name)).map(({ a, near }) => ({ value: a.id, label: a.name, description: `${a.tag} · ${space.get(a.spaceId)?.name}`, group: near ? 'Di area ini' : 'Area lain' })),
    [assets, spaceId, space],
  )
  // warn about duplicates before they happen
  const similar = React.useMemo(() => tickets.filter((t) => isOpenStatus(t.status) && ((assetId && t.assetId === assetId) || (!assetId && categoryId && spaceId && t.spaceId === spaceId && t.categoryId === categoryId))).slice(0, 2), [tickets, assetId, categoryId, spaceId])

  const submit = () => {
    const e: Record<string, string> = {}
    if (!categoryId) e.cat = 'Pilih jenis masalahnya.'
    if (!spaceId) e.space = 'Pilih lokasinya.'
    if (title.trim().length < 5) e.title = 'Tulis judul singkat (minimal 5 huruf).'
    if (!impact) e.impact = 'Pilih seberapa besar dampaknya.'
    if (anonymous && name.trim().length < 2) e.name = 'Isi nama Anda agar teknisi bisa menghubungi.'
    setErrors(e)
    if (Object.keys(e).length) { const first = document.querySelector('[data-error="true"]'); first?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return }
    const t = createTicket({
      title: title.trim(), description: desc.trim() || title.trim(), categoryId: categoryId!, priority, spaceId, assetId, impact, hazard, attachments: files.length ? files : undefined,
      channel: anonymous || qrAsset ? 'qr' : 'portal', requesterId: anonymous ? 'u_guest' : undefined, reporterName: anonymous ? name.trim() : undefined, reporterPhone: anonymous ? phone.trim() || undefined : undefined,
    })
    setDone(t)
  }

  if (done) {
    const pol = policyFor(done.priority)
    return (
      <div className="mx-auto max-w-xl py-4 sm:py-10">
        <Card><CardBody className="space-y-5 p-6 text-center sm:p-8">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success"><CheckCircle2 className="size-7" /></span>
          <div className="space-y-1.5">
            <h1 className="text-[22px] font-semibold tracking-[-0.025em]">Laporan terkirim</h1>
            <p className="text-[14px] text-fg-muted">Nomor tiket <strong className="tnum text-fg">{done.number}</strong> — {done.title}</p>
          </div>
          <ol className="space-y-2.5 rounded-xl bg-surface-sunken p-4 text-left text-[13.5px]">
            <li className="flex gap-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />Diteruskan ke tim <strong>{team.get(done.teamId)?.name}</strong>.</li>
            <li className="flex gap-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />Ditanggapi paling lambat <strong>{fmtDuration(pol.responseMin * 60_000)}{pol.calendar === 'business' ? ' jam kerja' : ''}</strong>{done.priority === 'p1' ? ' — tim darurat sudah diberi tahu' : ''}.</li>
            <li className="flex gap-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />Teknisi akan mengisi <strong>estimasi selesai</strong> yang bisa Anda lihat di sini.</li>
          </ol>
          {done.priority === 'p1' && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger-soft-fg">Jika ada orang dalam bahaya sekarang, hubungi <strong>Pos Satpam ext. 100</strong> segera.</p>}
          <div className="flex flex-col-reverse justify-center gap-2 sm:flex-row">
            {anonymous ? <Button variant="secondary" onClick={() => { setDone(null); setTitle(''); setDesc(''); setFiles([]); setImpact(undefined); setHazard(false) }}>Lapor masalah lain</Button> : <Button variant="secondary" onClick={() => nav('/laporan-saya')}>Semua laporan saya</Button>}
            {!anonymous && <Button variant="primary" onClick={() => nav(`/tiket/${done.id}`)}>Lihat {done.number}</Button>}
          </div>
        </CardBody></Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {qrAsset && <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-[13.5px] text-primary-soft-fg"><LifeBuoy className="size-5 shrink-0" /><span>Anda melapor untuk <strong>{qrAsset.name}</strong> ({qrAsset.tag}) — lokasi dan jenis masalah sudah diisi.</span></div>}

      <section aria-labelledby="s1" data-error={!!errors.cat}>
        <h2 id="s1" className="mb-2.5 text-[14px] font-semibold">1. Masalahnya apa?</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.map((c) => (
            <button key={c.id} type="button" onClick={() => { setCategoryId(c.id); setErrors((x) => ({ ...x, cat: '' })) }} aria-pressed={categoryId === c.id}
              className={cn('flex min-h-[64px] items-center gap-2.5 rounded-xl border p-3 text-left text-[13.5px] font-medium transition-all', categoryId === c.id ? 'border-primary bg-primary-soft text-primary-soft-fg ring-2 ring-primary/20' : 'border-border bg-surface hover:border-border-strong', errors.cat && 'border-danger/50')}>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface/70 text-primary [&_svg]:size-[18px]"><Icon name={c.icon} /></span>
              <span className="leading-tight">{c.name}</span>
            </button>
          ))}
        </div>
        {errors.cat && <p role="alert" className="mt-1.5 text-[12px] font-medium text-danger">{errors.cat}</p>}
      </section>

      <section className="space-y-4" aria-labelledby="s2">
        <h2 id="s2" className="text-[14px] font-semibold">2. Di mana dan apa yang terjadi?</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-error={!!errors.space}>
          <Field label="Lokasi / area" required error={errors.space}><Select value={spaceId} onChange={(v) => { setSpaceId(v); setErrors((x) => ({ ...x, space: '' })) }} options={spaceOptions} searchable placeholder="Pilih area…" invalid={!!errors.space} /></Field>
          <Field label="Mesin / peralatan" hint="opsional"><Select value={assetId} onChange={setAssetId} options={assetOptions} searchable clearable onClear={() => setAssetId(undefined)} placeholder="Pilih jika terkait" /></Field>
        </div>
        {similar.length > 0 && (
          <aside className="rounded-xl border border-warning/40 bg-warning-soft/60 p-3.5" aria-label="Laporan serupa">
            <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-warning-soft-fg"><AlertTriangle className="size-4" /> Sudah ada laporan terbuka untuk {assetId ? 'peralatan ini' : 'area dan jenis ini'}</p>
            <ul className="space-y-2">{similar.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-surface/70 px-3 py-2 text-[13px]">
                <span className="tnum text-fg-subtle">{t.number}</span><span className="min-w-0 flex-1 font-medium">{t.title}</span><StatusBadge status={t.status} /><EtaChip ticket={t} perspective="requester" />
                {!anonymous && <Link to={`/tiket/${t.id}`} className="text-primary hover:underline">Lihat</Link>}
              </li>
            ))}</ul>
            <p className="mt-2 text-[12px] text-fg-muted">Jika ini masalah yang sama, tidak perlu lapor lagi. Jika berbeda, lanjutkan.</p>
          </aside>
        )}
        <Field label="Judul singkat" required error={errors.title} hint={`${title.length}/80`}><Input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} placeholder="mis. Lampu Line 2 mati 6 titik" invalid={!!errors.title} data-error={!!errors.title} /></Field>
        <Field label="Rincian" hint="opsional"><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Sejak kapan, apa yang terlihat/terdengar, sudah dicoba apa." /></Field>
        <div className="space-y-2">
          <input ref={fileRef} type="file" multiple accept="image/*" capture="environment" className="hidden" onChange={(e) => { const n = Array.from(e.target.files ?? []).map((f) => f.name); setFiles((f) => [...f, ...n]); e.target.value = '' }} />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => fileRef.current?.click()}><ImagePlus /> Tambah foto</Button>
            {files.map((f, i) => <span key={i} className="inline-flex items-center gap-1.5 rounded-md bg-neutral-soft px-2 py-1 text-[12px]"><Paperclip className="size-3" />{f}<button type="button" aria-label={`Hapus ${f}`} onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}><X className="size-3" /></button></span>)}
          </div>
        </div>
      </section>

      <section aria-labelledby="s3" data-error={!!errors.impact}>
        <h2 id="s3" className="mb-2.5 text-[14px] font-semibold">3. Seberapa mengganggu?</h2>
        <div className="grid gap-2" role="radiogroup" aria-label="Dampak">
          {(Object.keys(IMPACT) as Impact[]).map((k) => {
            const on = impact === k
            return (
              <label key={k} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors', on ? 'border-primary bg-primary-soft/50' : 'border-border hover:border-border-strong', errors.impact && 'border-danger/50')}>
                <input type="radio" name="impact" checked={on} onChange={() => { setImpact(k); setErrors((x) => ({ ...x, impact: '' })) }} className="mt-1 size-4 accent-[hsl(var(--primary))]" />
                <span className="min-w-0 flex-1"><span className="block text-[14px] font-medium">{IMPACT[k].label}</span><span className="block text-[12.5px] text-fg-muted">{IMPACT[k].hint}</span></span>
              </label>
            )
          })}
        </div>
        {errors.impact && <p role="alert" className="mt-1.5 text-[12px] font-medium text-danger">{errors.impact}</p>}
        <label className={cn('mt-2 flex cursor-pointer items-start gap-3 rounded-xl border p-3.5', hazard ? 'border-danger bg-danger-soft/60' : 'border-border hover:border-border-strong')}>
          <Checkbox checked={hazard} onChange={setHazard} aria-label="Berbahaya" />
          <span><span className="flex items-center gap-2 text-[14px] font-medium"><AlertTriangle className="size-4 text-danger" /> Berbahaya — ada risiko keselamatan (K3)</span><span className="block text-[12.5px] text-fg-muted">Percikan api, bau gas/hangus, lantai licin, mesin tanpa pengaman, risiko roboh. Langsung ditandai Darurat.</span></span>
        </label>
      </section>

      {anonymous && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-labelledby="s4"><h2 id="s4" className="sr-only">Data pelapor</h2>
          <Field label="Nama Anda" required error={errors.name}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Pak Joko (Operator Line 2)" invalid={!!errors.name} /></Field>
          <Field label="No. HP" hint="opsional"><Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08…" /></Field>
        </section>
      )}

      <div className="sticky bottom-0 -mx-3 flex items-center justify-between gap-3 border-t border-border bg-surface/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
        <div className="min-w-0 text-[12.5px] text-fg-muted">{cat ? <>Prioritas: <Badge tone={PRIORITY[priority].tone}>{PRIORITY[priority].label}</Badge> <span className="hidden sm:inline">· diteruskan ke {team.get(cat.teamId)?.name}</span></> : 'Pilih jenis masalah dulu'}</div>
        <Button variant="primary" size="lg" onClick={submit} className="shrink-0">Kirim laporan</Button>
      </div>
    </div>
  )
}

export function ReportPage() {
  const me = useMe()!
  return (
    <div>
      <PageHeader title={me.role === 'requester' ? 'Lapor masalah' : 'Buat tiket'} description="Cukup 1 halaman. Teknisi yang menangani akan mengisi estimasi selesainya." className="mx-auto max-w-2xl" />
      <ReportForm />
    </div>
  )
}

/** No sign-in: what a scanned QR sticker on a machine opens. */
export function PublicReportPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border bg-surface"><div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4"><span className="flex items-center gap-2 font-semibold"><span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-fg"><LifeBuoy className="size-[18px]" /></span>Atrium · Lapor cepat</span><Link to="/login" className="inline-flex items-center gap-1 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> Masuk</Link></div></header>
      <main className="mx-auto max-w-2xl px-4 py-6"><h1 className="mb-1 text-[22px] font-semibold tracking-[-0.025em]">Lapor masalah fasilitas</h1><p className="mb-6 text-[13.5px] text-fg-muted">Tidak perlu login. Cukup isi singkat — tim akan menindaklanjuti.</p><ReportForm anonymous /></main>
    </div>
  )
}
