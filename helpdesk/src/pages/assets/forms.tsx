import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Segmented } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useStore } from '@/store/useStore'
import { useLookups } from '@/hooks/useLookups'
import { ASSET_STATUS, CRITICALITY, FREQ_LABEL } from '@/lib/labels'
import { addDays, format } from 'date-fns'
import type { Asset, AssetStatus, Criticality, PmFrequency, PmSchedule } from '@/data/types'

const dateInput = (iso?: string) => (iso ? format(new Date(iso), 'yyyy-MM-dd') : '')

/** Create or edit an asset. On create you can attach a maintenance routine in the same step. */
export function AssetFormDialog({ open, onOpenChange, asset, presetSpaceId, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; asset?: Asset; presetSpaceId?: string; onSaved?: (a: Asset) => void }) {
  const spaces = useStore((s) => s.spaces)
  const cats = useStore((s) => s.assetCategories)
  const vendors = useStore((s) => s.vendors)
  const buildings = useStore((s) => s.buildings)
  const { createAsset, updateAsset, createSchedule } = useStore.getState()
  const toast = useToast()
  const blank = { name: '', categoryId: '', spaceId: presetSpaceId ?? '', vendorId: '', manufacturer: '', model: '', serial: '', criticality: 'medium' as Criticality, status: 'operational' as AssetStatus, installedAt: '', warrantyUntil: '', cost: '', notes: '', plan: true, freq: 'monthly' as PmFrequency, first: format(addDays(new Date(), 7), 'yyyy-MM-dd') }
  const [f, setF] = React.useState(blank)
  const [errs, setErrs] = React.useState<Record<string, string>>({})
  React.useEffect(() => {
    if (!open) return
    setErrs({})
    setF(asset ? { ...blank, name: asset.name, categoryId: asset.categoryId, spaceId: asset.spaceId, vendorId: asset.vendorId ?? '', manufacturer: asset.manufacturer, model: asset.model, serial: asset.serial, criticality: asset.criticality, status: asset.status, installedAt: dateInput(asset.installedAt), warrantyUntil: dateInput(asset.warrantyUntil), cost: String(asset.purchaseCost || ''), notes: asset.notes ?? '', plan: false } : blank)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, asset])
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  const save = () => {
    const e: Record<string, string> = {}
    if (f.name.trim().length < 3) e.name = 'Isi nama aset (min. 3 huruf).'
    if (!f.categoryId) e.categoryId = 'Pilih kategori.'
    if (!f.spaceId) e.spaceId = 'Pilih lokasi.'
    setErrs(e)
    if (Object.keys(e).length) return
    const data = {
      name: f.name.trim(), categoryId: f.categoryId, spaceId: f.spaceId, vendorId: f.vendorId || undefined, manufacturer: f.manufacturer.trim(), model: f.model.trim(), serial: f.serial.trim(), criticality: f.criticality,
      status: f.status, installedAt: f.installedAt ? new Date(f.installedAt).toISOString() : new Date().toISOString(), warrantyUntil: f.warrantyUntil ? new Date(f.warrantyUntil).toISOString() : undefined, purchaseCost: Number(f.cost) || 0, notes: f.notes.trim() || undefined,
    }
    if (asset) { updateAsset(asset.id, data); toast.push({ tone: 'success', title: 'Aset diperbarui' }); onSaved?.({ ...asset, ...data }) }
    else {
      const a = createAsset(data)
      if (f.plan) createSchedule({ name: `Perawatan ${a.name}`, assetId: a.id, frequency: f.freq, nextDueAt: new Date(`${f.first}T08:00`).toISOString(), checklist: ['Pemeriksaan visual', 'Pembersihan', 'Uji fungsi', 'Catat temuan'], teamId: 'tm_mek', vendorId: a.vendorId, estMinutes: 60 })
      toast.push({ tone: 'success', title: `${a.name} ditambahkan`, description: f.plan ? `Jadwal ${FREQ_LABEL[f.freq].toLowerCase()} dibuat.` : undefined })
      onSaved?.(a)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" title={asset ? `Ubah ${asset.name}` : 'Tambah aset'} description={asset ? asset.tag : 'Data dasar dulu — detail lain bisa dilengkapi nanti.'} footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button><Button variant="primary" onClick={save}>{asset ? 'Simpan' : 'Tambah aset'}</Button></>}>
        <div className="space-y-4 p-5">
          <Field label="Nama aset" required error={errs.name}><Input value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus placeholder="mis. Kompresor Udara 3 (75 kW)" invalid={!!errs.name} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Kategori" required error={errs.categoryId}><Select value={f.categoryId} onChange={(v) => set('categoryId', v)} options={cats.map((c) => ({ value: c.id, label: c.name }))} placeholder="Pilih…" invalid={!!errs.categoryId} /></Field>
            <Field label="Lokasi" required error={errs.spaceId}><Select value={f.spaceId} onChange={(v) => set('spaceId', v)} searchable placeholder="Pilih area…" options={spaces.map((s) => ({ value: s.id, label: s.name, group: buildings.find((b) => b.id === s.buildingId)?.name }))} invalid={!!errs.spaceId} /></Field>
            <Field label="Merk"><Input value={f.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} /></Field>
            <Field label="Model / tipe"><Input value={f.model} onChange={(e) => set('model', e.target.value)} /></Field>
            <Field label="No. seri"><Input value={f.serial} onChange={(e) => set('serial', e.target.value)} /></Field>
            <Field label="Vendor perawatan" hint="opsional"><Select value={f.vendorId || undefined} onChange={(v) => set('vendorId', v)} clearable onClear={() => set('vendorId', '')} options={vendors.map((v) => ({ value: v.id, label: v.name, description: v.trade }))} placeholder="Internal" /></Field>
            <Field label="Tanggal pasang"><Input type="date" value={f.installedAt} onChange={(e) => set('installedAt', e.target.value)} /></Field>
            <Field label="Garansi sampai"><Input type="date" value={f.warrantyUntil} onChange={(e) => set('warrantyUntil', e.target.value)} /></Field>
            <Field label="Kritikalitas" help="Seberapa parah dampaknya ke produksi jika aset ini mati."><Select value={f.criticality} onChange={(v) => set('criticality', v as Criticality)} options={(Object.keys(CRITICALITY) as Criticality[]).map((c) => ({ value: c, label: CRITICALITY[c].label }))} /></Field>
            <Field label="Nilai perolehan (Rp)"><Input type="number" min={0} value={f.cost} onChange={(e) => set('cost', e.target.value)} /></Field>
            {asset && <Field label="Kondisi saat ini"><Select value={f.status} onChange={(v) => set('status', v as AssetStatus)} options={(Object.keys(ASSET_STATUS) as AssetStatus[]).map((s) => ({ value: s, label: ASSET_STATUS[s].label }))} /></Field>}
          </div>
          <Field label="Catatan"><Textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="mis. kapasitas, lokasi panel, kontak vendor" /></Field>
          {!asset && (
            <div className="space-y-3 rounded-xl border border-border bg-surface-sunken p-4">
              <Checkbox checked={f.plan} onChange={(v) => set('plan', v)} label={<span className="font-medium">Langsung buat jadwal perawatan</span>} />
              {f.plan && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Seberapa sering"><Select value={f.freq} onChange={(v) => set('freq', v as PmFrequency)} options={(Object.keys(FREQ_LABEL) as PmFrequency[]).map((k) => ({ value: k, label: FREQ_LABEL[k] }))} /></Field><Field label="Pertama kali"><Input type="date" value={f.first} onChange={(e) => set('first', e.target.value)} /></Field></div>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Create or edit a recurring maintenance routine — for an asset or for an area (cleaning, K3 rounds…). */
export function ScheduleFormDialog({ open, onOpenChange, schedule, presetAssetId }: { open: boolean; onOpenChange: (v: boolean) => void; schedule?: PmSchedule; presetAssetId?: string }) {
  const assets = useStore((s) => s.assets)
  const spaces = useStore((s) => s.spaces)
  const users = useStore((s) => s.users)
  const vendors = useStore((s) => s.vendors)
  const teams = useStore((s) => s.teams)
  const buildings = useStore((s) => s.buildings)
  const { createSchedule, updateSchedule } = useStore.getState()
  const { asset } = useLookups()
  const toast = useToast()
  const blank = { name: '', target: (presetAssetId ? 'asset' : 'asset') as 'asset' | 'space', assetId: presetAssetId ?? '', spaceId: '', freq: 'monthly' as PmFrequency, first: format(addDays(new Date(), 1), 'yyyy-MM-dd'), who: '', vendorId: '', est: '60', checklist: '', teamId: 'tm_mek' }
  const [f, setF] = React.useState(blank)
  const [errs, setErrs] = React.useState<Record<string, string>>({})
  React.useEffect(() => {
    if (!open) return
    setErrs({})
    setF(schedule ? { name: schedule.name, target: schedule.assetId ? 'asset' : 'space', assetId: schedule.assetId ?? '', spaceId: schedule.spaceId ?? '', freq: schedule.frequency, first: dateInput(schedule.nextDueAt), who: schedule.assigneeId ?? '', vendorId: schedule.vendorId ?? '', est: String(schedule.estMinutes), checklist: schedule.checklist.join('\n'), teamId: schedule.teamId } : blank)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, schedule])
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  const save = () => {
    const e: Record<string, string> = {}
    if (f.name.trim().length < 4) e.name = 'Beri nama pekerjaannya.'
    if (f.target === 'asset' && !f.assetId) e.target = 'Pilih asetnya.'
    if (f.target === 'space' && !f.spaceId) e.target = 'Pilih areanya.'
    if (!f.first) e.first = 'Tentukan tanggal pertama.'
    setErrs(e)
    if (Object.keys(e).length) return
    const data = {
      name: f.name.trim(), assetId: f.target === 'asset' ? f.assetId : undefined, spaceId: f.target === 'space' ? f.spaceId : undefined, frequency: f.freq, nextDueAt: new Date(`${f.first}T08:00`).toISOString(),
      checklist: f.checklist.split('\n').map((x) => x.trim()).filter(Boolean), teamId: f.teamId, assigneeId: f.who || undefined, vendorId: f.vendorId || undefined, estMinutes: Number(f.est) || 60,
    }
    if (schedule) { updateSchedule(schedule.id, data); toast.push({ tone: 'success', title: 'Jadwal diperbarui' }) }
    else { createSchedule({ ...data, checklist: data.checklist.length ? data.checklist : ['Periksa kondisi', 'Bersihkan', 'Uji fungsi', 'Catat temuan'] }); toast.push({ tone: 'success', title: 'Jadwal dibuat', description: `${FREQ_LABEL[f.freq]} mulai ${format(new Date(f.first), 'd MMM yyyy')}` }) }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" title={schedule ? 'Ubah jadwal maintenance' : 'Tambah jadwal maintenance'} description="Pekerjaan berulang yang harus dilakukan, lengkap dengan siapa yang bertanggung jawab." footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button><Button variant="primary" onClick={save}>{schedule ? 'Simpan' : 'Buat jadwal'}</Button></>}>
        <div className="space-y-4 p-5">
          <Field label="Nama pekerjaan" required error={errs.name}><Input value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus placeholder="mis. Servis kompresor, Pembersihan tandon air" invalid={!!errs.name} /></Field>
          <div className="space-y-2">
            <Segmented value={f.target} onChange={(v) => set('target', v)} options={[{ value: 'asset', label: 'Untuk aset' }, { value: 'space', label: 'Untuk area' }]} />
            {f.target === 'asset'
              ? <Field error={errs.target}><Select value={f.assetId || undefined} onChange={(v) => set('assetId', v)} searchable placeholder="Pilih aset…" options={assets.filter((a) => a.status !== 'retired').map((a) => ({ value: a.id, label: a.name, description: a.tag }))} invalid={!!errs.target} /></Field>
              : <Field error={errs.target}><Select value={f.spaceId || undefined} onChange={(v) => set('spaceId', v)} searchable placeholder="Pilih area…" options={spaces.map((s) => ({ value: s.id, label: s.name, group: buildings.find((b) => b.id === s.buildingId)?.name }))} invalid={!!errs.target} /></Field>}
            {f.target === 'asset' && f.assetId && <p className="text-[12px] text-fg-muted">Lokasi: {spaces.find((s) => s.id === asset.get(f.assetId)?.spaceId)?.name}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Seberapa sering"><Select value={f.freq} onChange={(v) => set('freq', v as PmFrequency)} options={(Object.keys(FREQ_LABEL) as PmFrequency[]).map((k) => ({ value: k, label: FREQ_LABEL[k] }))} /></Field>
            <Field label={schedule ? 'Jatuh tempo berikutnya' : 'Pertama kali'} error={errs.first}><Input type="date" value={f.first} onChange={(e) => set('first', e.target.value)} /></Field>
            <Field label="Perkiraan durasi" hint="menit"><Input type="number" min={5} step={5} value={f.est} onChange={(e) => set('est', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Tim"><Select value={f.teamId} onChange={(v) => set('teamId', v)} options={teams.map((t) => ({ value: t.id, label: t.name }))} /></Field>
            <Field label="Penanggung jawab" hint="teknisi"><Select value={f.who || undefined} onChange={(v) => set('who', v)} clearable onClear={() => set('who', '')} placeholder="Siapa saja di tim" searchable options={users.filter((u) => u.role !== 'requester').map((u) => ({ value: u.id, label: u.name, description: u.title }))} /></Field>
            <Field label="Atau vendor"><Select value={f.vendorId || undefined} onChange={(v) => set('vendorId', v)} clearable onClear={() => set('vendorId', '')} placeholder="Internal" options={vendors.map((v) => ({ value: v.id, label: v.name, description: v.trade }))} /></Field>
          </div>
          <Field label="Checklist" hint="satu poin per baris"><Textarea rows={5} value={f.checklist} onChange={(e) => set('checklist', e.target.value)} placeholder={'Periksa level oli\nBersihkan filter\nUji fungsi\nCatat temuan'} /></Field>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** "Sudah dikerjakan" in one step: optional note, then the schedule rolls forward. */
export function useCompleteSchedule() {
  const [pm, setPm] = React.useState<PmSchedule | null>(null)
  const [note, setNote] = React.useState('')
  const complete = useStore((s) => s.completeSchedule)
  const toast = useToast()
  const node = (
    <Dialog open={!!pm} onOpenChange={(v) => { if (!v) { setPm(null); setNote('') } }}>
      {pm && (
        <DialogContent size="sm" title="Tandai sudah dikerjakan" description={pm.name}
          footer={<><Button variant="ghost" onClick={() => setPm(null)}>Batal</Button><Button variant="primary" onClick={() => { complete(pm.id, note.trim() || undefined); toast.push({ tone: 'success', title: 'Tercatat selesai', description: `Jadwal berikutnya ${FREQ_LABEL[pm.frequency].toLowerCase()} — otomatis dihitung dari hari ini.` }); setPm(null); setNote('') }}>Tandai selesai</Button></>}>
          <div className="space-y-3 p-5">
            <Field label="Catatan" hint="opsional"><Textarea autoFocus rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Temuan atau hal yang perlu ditindaklanjuti" /></Field>
            <p className="text-[12.5px] text-fg-muted">Semua poin checklist dianggap selesai dan tanggal servis terakhir aset diperbarui. Perlu mengisi checklist rinci, waktu, atau material? Pakai <strong>Buka tugas</strong>.</p>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
  return { open: setPm, node }
}
