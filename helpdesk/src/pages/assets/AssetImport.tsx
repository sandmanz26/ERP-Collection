import * as React from 'react'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useStore, type AssetImportRow } from '@/store/useStore'
import { downloadCsv, parseTable } from '@/lib/csv'

const COLS = ['nama', 'kategori', 'lokasi', 'merk', 'model', 'no_seri', 'kritikalitas', 'tanggal_pasang', 'nilai', 'catatan']

/** The client already has an asset list in Excel. Paste it or upload it as CSV — no retyping. */
export function AssetImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const cats = useStore((s) => s.assetCategories)
  const spaces = useStore((s) => s.spaces)
  const assets = useStore((s) => s.assets)
  const importAssets = useStore((s) => s.importAssets)
  const toast = useToast()
  const [text, setText] = React.useState('')
  const fileRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => { if (open) setText('') }, [open])

  const parsed = React.useMemo(() => {
    const table = parseTable(text)
    if (table.length < 2) return null
    const head = table[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'))
    const idx = (n: string) => head.indexOf(n)
    if (idx('nama') < 0) return { error: 'Kolom "nama" tidak ditemukan di baris pertama. Gunakan template.', rows: [] as { row: AssetImportRow; issues: string[]; skip: boolean }[] }
    const rows = table.slice(1).map((r) => {
      const g = (n: string) => (idx(n) >= 0 ? r[idx(n)] : undefined)
      const row: AssetImportRow = { name: g('nama') ?? '', category: g('kategori'), location: g('lokasi'), manufacturer: g('merk'), model: g('model'), serial: g('no_seri'), criticality: g('kritikalitas'), installed: g('tanggal_pasang'), cost: g('nilai') ? Number(String(g('nilai')).replace(/[^\d]/g, '')) : undefined, notes: g('catatan') }
      const issues: string[] = []
      if (!row.name.trim()) issues.push('tanpa nama')
      else if (assets.some((a) => a.name.toLowerCase() === row.name.trim().toLowerCase())) issues.push('sudah ada')
      if (row.category && !cats.some((c) => c.name.toLowerCase() === row.category!.toLowerCase())) issues.push(`kategori "${row.category}" tidak dikenal → ${cats[0].name}`)
      if (row.location && !spaces.some((s) => s.name.toLowerCase() === row.location!.toLowerCase())) issues.push(`lokasi "${row.location}" tidak dikenal → ${spaces[0].name}`)
      return { row, issues, skip: issues.some((i) => i === 'tanpa nama' || i === 'sudah ada') }
    })
    return { rows, error: undefined }
  }, [text, cats, spaces, assets])

  const ok = parsed ? parsed.rows.filter((r) => !r.skip) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" title="Impor aset dari Excel / CSV" description="Salin tabel dari Excel lalu tempel di bawah, atau unggah file CSV. Baris pertama harus berisi nama kolom."
        footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button><Button variant="primary" disabled={!ok.length} onClick={() => { const r = importAssets(ok.map((x) => x.row)); toast.push({ tone: 'success', title: `${r.added} aset diimpor`, description: r.skipped ? `${r.skipped} baris dilewati.` : undefined }); onOpenChange(false) }}>Impor {ok.length || ''} aset</Button></>}>
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => downloadCsv('template-aset.csv', [COLS, ['Kompresor Udara 3', cats[0].name, spaces[0].name, 'Atlas Copco', 'GA75', 'SN-1234', 'tinggi', '2024-03-15', '620000000', 'Cadangan']])}><Download /> Unduh template</Button>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); e.target.value = '' }} />
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}><Upload /> Unggah CSV</Button>
            <span className="text-[12px] text-fg-muted">Kolom: {COLS.join(', ')}. Kritikalitas: rendah / sedang / tinggi / kritis.</span>
          </div>
          <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={'nama\tkategori\tlokasi\nPompa Air 5\tAir & pompa\tPompa & Tandon Air'} aria-label="Data aset" className="font-mono text-[12.5px]" />
          {!parsed && text.trim() === '' && <div className="flex items-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface-sunken p-4 text-[13px] text-fg-muted"><FileSpreadsheet className="size-5 shrink-0" />Belum ada data. Tempel dari Excel atau unggah file untuk melihat pratinjau.</div>}
          {parsed?.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger-soft-fg">{parsed.error}</p>}
          {parsed && !parsed.error && (
            <div className="space-y-2">
              <p className="flex flex-wrap items-center gap-3 text-[13px]"><span className="inline-flex items-center gap-1.5 font-medium text-success"><CheckCircle2 className="size-4" /> {ok.length} siap diimpor</span>{parsed.rows.length - ok.length > 0 && <span className="inline-flex items-center gap-1.5 font-medium text-warning"><AlertTriangle className="size-4" /> {parsed.rows.length - ok.length} dilewati</span>}</p>
              <div className="scrollbar-thin max-h-64 overflow-auto rounded-lg border border-border">
                <table className="w-full text-[12.5px]"><thead className="sticky top-0 bg-surface-sunken text-[11px] uppercase tracking-[0.05em] text-fg-subtle"><tr><th className="px-3 py-2 text-left">Nama</th><th className="px-3 py-2 text-left">Kategori</th><th className="px-3 py-2 text-left">Lokasi</th><th className="px-3 py-2 text-left">Catatan impor</th></tr></thead>
                  <tbody className="divide-y divide-border">{parsed.rows.slice(0, 60).map((r, i) => <tr key={i} className={r.skip ? 'bg-warning-soft/40 text-fg-muted' : ''}><td className="px-3 py-1.5">{r.row.name || '—'}</td><td className="px-3 py-1.5">{r.row.category || '—'}</td><td className="px-3 py-1.5">{r.row.location || '—'}</td><td className="px-3 py-1.5">{r.issues.length ? r.issues.map((x) => <Badge key={x} tone={r.skip ? 'warning' : 'info'} size="sm" className="mr-1">{x}</Badge>) : <Badge tone="success" size="sm">OK</Badge>}</td></tr>)}</tbody></table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
