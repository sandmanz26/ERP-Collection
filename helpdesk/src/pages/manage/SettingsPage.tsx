import * as React from 'react'
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriorityBadge } from '@/components/shared/badges'
import { Icon } from '@/components/shared/icons'
import { useLookups } from '@/hooks/useLookups'
import { useStore } from '@/store/useStore'
import { BUSINESS_HOURS, SLA_POLICIES } from '@/lib/sla'
import { fmtDuration, fmtMoneyFull } from '@/lib/format'
import { ROLE_LABEL, SPACE_KIND } from '@/lib/labels'
import { uid } from '@/lib/utils'
import type { Category, Priority, Role, Space, SpaceKind, User, Vendor } from '@/data/types'

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const ICONS = ['Zap', 'Flame', 'Snowflake', 'Droplets', 'Truck', 'Hammer', 'SprayCan', 'Bug', 'ShieldAlert', 'Wifi', 'CircleHelp']

export function SettingsPage() {
  const [tab, setTab] = React.useState<'lokasi' | 'kategori' | 'pengguna' | 'vendor' | 'target' | 'balasan' | 'demo'>('lokasi')
  return (
    <div className="space-y-5">
      <PageHeader title="Pengaturan" description="Data master yang dipakai di seluruh aplikasi: lokasi dan fasilitas sewa, kategori masalah, pengguna, vendor dan target waktu." className="pb-1" />
      <Tabs value={tab} onChange={setTab} items={[{ value: 'lokasi', label: 'Lokasi & fasilitas' }, { value: 'kategori', label: 'Kategori & tim' }, { value: 'pengguna', label: 'Pengguna' }, { value: 'vendor', label: 'Vendor' }, { value: 'target', label: 'Target waktu' }, { value: 'balasan', label: 'Balasan cepat' }, { value: 'demo', label: 'Data demo' }]} />
      {tab === 'lokasi' && <Spaces />}
      {tab === 'kategori' && <Categories />}
      {tab === 'pengguna' && <Users />}
      {tab === 'vendor' && <Vendors />}
      {tab === 'target' && <Targets />}
      {tab === 'balasan' && <Canned />}
      {tab === 'demo' && <Demo />}
    </div>
  )
}

const Row = ({ children, actions }: { children: React.ReactNode; actions: React.ReactNode }) => <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"><div className="min-w-0 flex-1 basis-[240px]">{children}</div><div className="flex items-center gap-1">{actions}</div></li>
const Actions = ({ onEdit, onDelete, label }: { onEdit: () => void; onDelete?: () => void; label: string }) => <><Button variant="ghost" size="iconSm" aria-label={`Ubah ${label}`} onClick={onEdit}><Pencil /></Button>{onDelete && <Button variant="ghost" size="iconSm" aria-label={`Hapus ${label}`} onClick={onDelete}><Trash2 /></Button>}</>

/* ------------------------------------------------------------------ lokasi */

function Spaces() {
  const spaces = useStore((s) => s.spaces)
  const buildings = useStore((s) => s.buildings)
  const addons = useStore((s) => s.addons)
  const assets = useStore((s) => s.assets)
  const { upsert, remove } = useStore.getState()
  const toast = useToast()
  const [edit, setEdit] = React.useState<Space | 'new' | null>(null)
  const [f, setF] = React.useState({ name: '', buildingId: '', kind: 'office' as SpaceKind, capacity: '0', rentable: false, rateExt: '0', rateInt: '0', open: '7', close: '18', approval: false, amen: '', addonIds: [] as string[], desc: '' })
  React.useEffect(() => {
    if (!edit) return
    if (edit === 'new') return setF({ name: '', buildingId: buildings[0].id, kind: 'office', capacity: '0', rentable: false, rateExt: '0', rateInt: '0', open: '7', close: '18', approval: false, amen: '', addonIds: [], desc: '' })
    const r = edit.rental
    setF({ name: edit.name, buildingId: edit.buildingId, kind: edit.kind, capacity: String(edit.capacity), rentable: !!r, rateExt: String(r?.rateExternal ?? 0), rateInt: String(r?.rateInternal ?? 0), open: String(r?.openHour ?? 7), close: String(r?.closeHour ?? 18), approval: r?.needsApproval ?? false, amen: r?.amenities.join(', ') ?? '', addonIds: r?.addonIds ?? [], desc: r?.description ?? '' })
  }, [edit, buildings])
  const save = () => {
    if (f.name.trim().length < 2) return
    const s: Space = { id: edit && edit !== 'new' ? edit.id : uid('sp'), name: f.name.trim(), buildingId: f.buildingId, kind: f.kind, capacity: Number(f.capacity) || 0, rental: f.rentable ? { rateExternal: Number(f.rateExt) || 0, rateInternal: Number(f.rateInt) || 0, needsApproval: f.approval, openHour: Number(f.open), closeHour: Number(f.close), amenities: f.amen.split(',').map((x) => x.trim()).filter(Boolean), addonIds: f.addonIds, description: f.desc.trim() || undefined } : undefined }
    upsert('spaces', s); toast.push({ tone: 'success', title: edit === 'new' ? 'Lokasi ditambahkan' : 'Lokasi diperbarui' }); setEdit(null)
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="primary" onClick={() => setEdit('new')}><Plus /> Tambah lokasi</Button></div>
      {buildings.map((b) => (
        <Card key={b.id} className="overflow-hidden"><CardHeader title={b.name} description={b.description} />
          <ul className="divide-y divide-border">{spaces.filter((s) => s.buildingId === b.id).map((s) => {
            const used = assets.filter((a) => a.spaceId === s.id).length
            return <Row key={s.id} actions={<Actions label={s.name} onEdit={() => setEdit(s)} onDelete={used ? undefined : () => { remove('spaces', s.id); toast.push({ tone: 'info', title: 'Lokasi dihapus' }) }} />}><p className="text-[13.5px] font-medium">{s.name}{s.rental && <Badge tone="accent" size="sm" className="ml-2">Bisa disewa</Badge>}</p><p className="text-[12px] text-fg-muted">{SPACE_KIND[s.kind]}{s.capacity ? ` · ${s.capacity} orang` : ''}{s.rental ? ` · ${fmtMoneyFull(s.rental.rateExternal)}/jam eksternal` : ''}{used ? ` · ${used} aset` : ''}</p></Row>
          })}</ul></Card>
      ))}
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent size="lg" title={edit === 'new' ? 'Tambah lokasi' : 'Ubah lokasi'} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Batal</Button><Button variant="primary" onClick={save} disabled={f.name.trim().length < 2}>Simpan</Button></>}>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="Nama" required><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field><Field label="Gedung / area"><Select value={f.buildingId} onChange={(v) => setF({ ...f, buildingId: v })} options={buildings.map((b) => ({ value: b.id, label: b.name }))} /></Field><Field label="Jenis"><Select value={f.kind} onChange={(v) => setF({ ...f, kind: v as SpaceKind })} options={(Object.keys(SPACE_KIND) as SpaceKind[]).map((k) => ({ value: k, label: SPACE_KIND[k] }))} /></Field><Field label="Kapasitas (orang)"><Input type="number" min={0} value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></Field></div>
            <div className="space-y-3 rounded-xl border border-border bg-surface-sunken p-4">
              <Checkbox checked={f.rentable} onChange={(v) => setF({ ...f, rentable: v })} label={<span className="font-medium">Bisa disewa / dipesan</span>} />
              {f.rentable && <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4"><Field label="Tarif karyawan / jam"><Input type="number" min={0} value={f.rateInt} onChange={(e) => setF({ ...f, rateInt: e.target.value })} /></Field><Field label="Tarif pihak luar / jam"><Input type="number" min={0} value={f.rateExt} onChange={(e) => setF({ ...f, rateExt: e.target.value })} /></Field><Field label="Buka (jam)"><Input type="number" min={0} max={23} value={f.open} onChange={(e) => setF({ ...f, open: e.target.value })} /></Field><Field label="Tutup (jam)"><Input type="number" min={1} max={24} value={f.close} onChange={(e) => setF({ ...f, close: e.target.value })} /></Field></div>
                <Checkbox checked={f.approval} onChange={(v) => setF({ ...f, approval: v })} label="Pemesanan karyawan juga perlu persetujuan (pihak luar selalu perlu)" />
                <Field label="Fasilitas ruangan" hint="pisahkan dengan koma"><Input value={f.amen} onChange={(e) => setF({ ...f, amen: e.target.value })} placeholder="Proyektor, AC, Whiteboard" /></Field>
                <Field label="Deskripsi"><Input value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} /></Field>
                <fieldset><legend className="mb-1.5 text-[12.5px] font-medium text-fg-muted">Tambahan yang tersedia</legend><div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{addons.map((a) => <Checkbox key={a.id} checked={f.addonIds.includes(a.id)} onChange={(v) => setF({ ...f, addonIds: v ? [...f.addonIds, a.id] : f.addonIds.filter((x) => x !== a.id) })} label={<span className="text-[13px]">{a.name} <span className="text-fg-subtle">· {fmtMoneyFull(a.price)}</span></span>} />)}</div></fieldset>
              </div>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ kategori */

function Categories() {
  const categories = useStore((s) => s.categories)
  const teams = useStore((s) => s.teams)
  const tickets = useStore((s) => s.tickets)
  const { upsert, remove } = useStore.getState()
  const { team } = useLookups()
  const toast = useToast()
  const [edit, setEdit] = React.useState<Category | 'new' | null>(null)
  const [f, setF] = React.useState({ name: '', teamId: 'tm_ga', priority: 'p3' as Priority, icon: 'CircleHelp', desc: '' })
  React.useEffect(() => { if (!edit) return; setF(edit === 'new' ? { name: '', teamId: teams[0].id, priority: 'p3', icon: 'CircleHelp', desc: '' } : { name: edit.name, teamId: edit.teamId, priority: edit.defaultPriority, icon: edit.icon, desc: edit.description }) }, [edit, teams])
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="primary" onClick={() => setEdit('new')}><Plus /> Tambah kategori</Button></div>
      <Card className="overflow-hidden"><ul className="divide-y divide-border">{categories.map((c) => { const n = tickets.filter((t) => t.categoryId === c.id).length; return <Row key={c.id} actions={<Actions label={c.name} onEdit={() => setEdit(c)} onDelete={n ? undefined : () => { remove('categories', c.id); toast.push({ tone: 'info', title: 'Kategori dihapus' }) }} />}><p className="flex items-center gap-2 text-[13.5px] font-medium"><Icon name={c.icon} className="size-4 text-primary" />{c.name}</p><p className="text-[12px] text-fg-muted">{c.description} · diteruskan ke <strong>{team.get(c.teamId)?.name}</strong> · {n} tiket</p><div className="mt-1"><PriorityBadge priority={c.defaultPriority} compact /></div></Row> })}</ul></Card>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent size="md" title={edit === 'new' ? 'Tambah kategori' : 'Ubah kategori'} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Batal</Button><Button variant="primary" disabled={f.name.trim().length < 3} onClick={() => { upsert('categories', { id: edit && edit !== 'new' ? edit.id : uid('c'), name: f.name.trim(), teamId: f.teamId, defaultPriority: f.priority, icon: f.icon, description: f.desc.trim() }); setEdit(null) }}>Simpan</Button></>}>
          <div className="space-y-4 p-5"><Field label="Nama" required><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field><Field label="Deskripsi singkat"><Input value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} /></Field><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="Diteruskan ke tim"><Select value={f.teamId} onChange={(v) => setF({ ...f, teamId: v })} options={teams.map((t) => ({ value: t.id, label: t.name }))} /></Field><Field label="Prioritas awal"><Select value={f.priority} onChange={(v) => setF({ ...f, priority: v as Priority })} options={[{ value: 'p1', label: 'Darurat' }, { value: 'p2', label: 'Tinggi' }, { value: 'p3', label: 'Sedang' }, { value: 'p4', label: 'Rendah' }]} /></Field></div><Field label="Ikon"><div className="flex flex-wrap gap-1.5">{ICONS.map((i) => <button key={i} type="button" aria-label={i} aria-pressed={f.icon === i} onClick={() => setF({ ...f, icon: i })} className={`grid size-9 place-items-center rounded-lg border ${f.icon === i ? 'border-primary bg-primary-soft text-primary-soft-fg' : 'border-border text-fg-muted hover:border-border-strong'}`}><Icon name={i} className="size-4" /></button>)}</div></Field></div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ pengguna */

function Users() {
  const users = useStore((s) => s.users).filter((u) => !u.system)
  const teams = useStore((s) => s.teams)
  const { upsert, remove } = useStore.getState()
  const { team } = useLookups()
  const toast = useToast()
  const [edit, setEdit] = React.useState<User | 'new' | null>(null)
  const [f, setF] = React.useState({ name: '', email: '', role: 'requester' as Role, title: '', dept: '', phone: '', teamId: '' })
  React.useEffect(() => { if (!edit) return; setF(edit === 'new' ? { name: '', email: '', role: 'requester', title: '', dept: '', phone: '', teamId: '' } : { name: edit.name, email: edit.email, role: edit.role, title: edit.title, dept: edit.dept, phone: edit.phone, teamId: edit.teamId ?? '' }) }, [edit])
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="primary" onClick={() => setEdit('new')}><Plus /> Tambah pengguna</Button></div>
      <Card className="overflow-hidden"><ul className="divide-y divide-border">{users.map((u) => <Row key={u.id} actions={<Actions label={u.name} onEdit={() => setEdit(u)} onDelete={['u_rina', 'u_budi', 'u_anisa'].includes(u.id) ? undefined : () => { remove('users', u.id); toast.push({ tone: 'info', title: 'Pengguna dihapus' }) }} />}><p className="text-[13.5px] font-medium">{u.name} <Badge tone={u.role === 'manager' ? 'purple' : u.role === 'agent' ? 'accent' : 'neutral'} size="sm" className="ml-1">{ROLE_LABEL[u.role]}</Badge></p><p className="text-[12px] text-fg-muted">{u.title}{u.teamId ? ` · ${team.get(u.teamId)?.name}` : ''} · {u.phone}</p></Row>)}</ul></Card>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent size="md" title={edit === 'new' ? 'Tambah pengguna' : 'Ubah pengguna'} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Batal</Button><Button variant="primary" disabled={f.name.trim().length < 3} onClick={() => { upsert('users', { id: edit && edit !== 'new' ? edit.id : uid('u'), name: f.name.trim(), email: f.email.trim(), role: f.role, title: f.title.trim(), dept: f.dept.trim(), phone: f.phone.trim(), teamId: f.teamId || undefined, homeSpaceId: edit && edit !== 'new' ? edit.homeSpaceId : undefined, vip: edit && edit !== 'new' ? edit.vip : undefined }); setEdit(null) }}>Simpan</Button></>}>
          <div className="space-y-4 p-5"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="Nama" required><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field><Field label="Peran"><Select value={f.role} onChange={(v) => setF({ ...f, role: v as Role })} options={[{ value: 'requester', label: 'Karyawan', description: 'Melapor dan memesan fasilitas' }, { value: 'agent', label: 'Teknisi', description: 'Menangani tiket dan jadwal' }, { value: 'manager', label: 'Admin', description: 'Menugaskan, menyetujui, mengelola' }]} /></Field><Field label="Jabatan"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field><Field label="Departemen"><Input value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value })} /></Field><Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field><Field label="No. HP"><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field></div>{f.role !== 'requester' && <Field label="Tim"><Select value={f.teamId || undefined} onChange={(v) => setF({ ...f, teamId: v })} options={teams.map((t) => ({ value: t.id, label: t.name }))} placeholder="Pilih tim" /></Field>}</div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ vendor */

function Vendors() {
  const vendors = useStore((s) => s.vendors)
  const { upsert, remove } = useStore.getState()
  const [edit, setEdit] = React.useState<Vendor | 'new' | null>(null)
  const [f, setF] = React.useState({ name: '', trade: '', contact: '', phone: '', email: '' })
  React.useEffect(() => { if (!edit) return; setF(edit === 'new' ? { name: '', trade: '', contact: '', phone: '', email: '' } : { name: edit.name, trade: edit.trade, contact: edit.contact, phone: edit.phone, email: edit.email }) }, [edit])
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="primary" onClick={() => setEdit('new')}><Plus /> Tambah vendor</Button></div>
      <Card className="overflow-hidden"><ul className="divide-y divide-border">{vendors.map((v) => <Row key={v.id} actions={<Actions label={v.name} onEdit={() => setEdit(v)} onDelete={() => remove('vendors', v.id)} />}><p className="text-[13.5px] font-medium">{v.name} <Badge tone="neutral" size="sm" className="ml-1">{v.trade}</Badge></p><p className="text-[12px] text-fg-muted">{v.contact} · <a href={`tel:${v.phone}`} className="hover:text-primary">{v.phone}</a> · {v.email}</p></Row>)}</ul></Card>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent size="md" title={edit === 'new' ? 'Tambah vendor' : 'Ubah vendor'} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Batal</Button><Button variant="primary" disabled={f.name.trim().length < 3} onClick={() => { upsert('vendors', { id: edit && edit !== 'new' ? edit.id : uid('v'), name: f.name.trim(), trade: f.trade.trim(), contact: f.contact.trim(), phone: f.phone.trim(), email: f.email.trim() }); setEdit(null) }}>Simpan</Button></>}>
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2"><Field label="Nama vendor" required><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field><Field label="Bidang"><Input value={f.trade} onChange={(e) => setF({ ...f, trade: e.target.value })} placeholder="mis. AC & chiller" /></Field><Field label="Kontak"><Input value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} /></Field><Field label="No. HP"><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field><Field label="Email" className="sm:col-span-2"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field></div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ lainnya */

function Targets() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
      <Card><CardHeader title="Target tanggapan dan penyelesaian" description="Batas layanan internal. Berbeda dari ETA, yang diisi teknisi untuk setiap pekerjaan." />
        <div className="overflow-x-auto"><table className="w-full min-w-[460px] text-[13px]"><thead className="border-b border-border bg-surface-sunken text-[11px] uppercase tracking-[0.06em] text-fg-subtle"><tr>{['Prioritas', 'Tanggapan pertama', 'Selesai dalam', 'Hitungan waktu'].map((h) => <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-border">{SLA_POLICIES.map((p) => <tr key={p.priority}><td className="px-4 py-3"><PriorityBadge priority={p.priority} /></td><td className="tnum px-4 py-3">{fmtDuration(p.responseMin * 60_000)}</td><td className="tnum px-4 py-3">{fmtDuration(p.resolveMin * 60_000)}</td><td className="px-4 py-3"><Badge tone={p.calendar === '24x7' ? 'danger' : 'neutral'}>{p.calendar === '24x7' ? 'Nonstop 24 jam' : 'Jam kerja'}</Badge></td></tr>)}</tbody></table></div></Card>
      <Card><CardHeader title="Jam kerja" /><CardBody className="space-y-4"><div className="flex flex-wrap gap-1.5">{DAYS.map((x, i) => <span key={x} className={BUSINESS_HOURS.days.includes(i) ? 'rounded-md bg-primary-soft px-2.5 py-1 text-[12.5px] font-semibold text-primary-soft-fg' : 'rounded-md bg-neutral-soft px-2.5 py-1 text-[12.5px] text-fg-subtle'}>{x}</span>)}</div><p className="text-[13.5px]"><span className="tnum font-semibold">{hm(BUSINESS_HOURS.startMin)} – {hm(BUSINESS_HOURS.endMin)}</span> <span className="text-fg-muted">WIB</span></p><p className="rounded-lg bg-surface-sunken p-3 text-[12.5px] leading-relaxed text-fg-muted">Tiket Darurat berjalan nonstop. Prioritas lain tidak dihitung di luar jam kerja, hari Minggu dan hari libur. Hitungan dijeda saat tiket berstatus Menunggu.</p></CardBody></Card>
    </div>
  )
}

function Canned() {
  const canned = useStore((s) => s.canned)
  const { addCanned, removeCanned } = useStore.getState()
  const toast = useToast()
  const [d, setD] = React.useState({ title: '', body: '' })
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
      <Card><CardHeader title="Balasan cepat" description="Teknisi menyisipkan ini dari kotak balasan. {{name}} diganti nama depan pelapor." /><ul className="divide-y divide-border">{canned.map((c) => <li key={c.id} className="flex items-start gap-3 px-4 py-3"><div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium">{c.title}</p><p className="mt-0.5 text-[12.5px] leading-relaxed text-fg-muted">{c.body}</p></div><Button variant="ghost" size="iconXs" aria-label={`Hapus ${c.title}`} onClick={() => removeCanned(c.id)}><Trash2 /></Button></li>)}</ul></Card>
      <Card><CardHeader title="Tambah balasan" /><CardBody className="space-y-3.5"><Field label="Nama"><Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></Field><Field label="Isi pesan"><Textarea rows={5} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} placeholder="Halo {{name}}, …" /></Field><Button variant="primary" disabled={!d.title.trim() || !d.body.trim()} onClick={() => { addCanned(d.title.trim(), d.body.trim()); setD({ title: '', body: '' }); toast.push({ tone: 'success', title: 'Balasan disimpan' }) }}><Plus /> Simpan</Button></CardBody></Card>
    </div>
  )
}

function Demo() {
  const reset = useStore((s) => s.resetDemo)
  const toast = useToast()
  return <Card className="max-w-xl"><CardHeader title="Data demo" description="Semua data di aplikasi ini hanya contoh dan tersimpan di browser Anda (localStorage). Tidak ada yang dikirim ke server." /><CardBody className="space-y-3"><p className="text-[13px] text-fg-muted">Reset untuk membuat ulang seluruh data: tiket, tugas, reservasi, dan notifikasi, dengan waktu relatif terhadap sekarang.</p><Button variant="outlineDanger" onClick={() => { reset(); toast.push({ tone: 'success', title: 'Data demo direset' }) }}><RotateCcw /> Reset data demo</Button></CardBody></Card>
}
