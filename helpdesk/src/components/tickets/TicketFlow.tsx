import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { EtaDialog, EtaFields, defaultEtaFor } from '@/components/shared/Eta'
import { useMe, useStore } from '@/store/useStore'
import { PENDING_LABEL } from '@/lib/labels'
import { isOpenStatus } from '@/lib/sla'
import { fmtSmart, toLocalInput } from '@/lib/format'
import type { PendingReason, Ticket } from '@/data/types'

export type FlowKind = 'start' | 'assign' | 'pending' | 'done' | 'eta' | 'cancel' | 'reopen'

/**
 * One place for every "change a ticket" dialog so the list, the board and the detail page behave identically.
 * `flow.open('done', ticket)` — then render `flow.node` once.
 */
export function useTicketFlow() {
  const [st, setSt] = React.useState<{ kind: FlowKind; id: string } | null>(null)
  const open = React.useCallback((kind: FlowKind, t: Pick<Ticket, 'id'>) => setSt({ kind, id: t.id }), [])
  const node = <FlowDialogs st={st} close={() => setSt(null)} />
  return { open, node }
}

function FlowDialogs({ st, close }: { st: { kind: FlowKind; id: string } | null; close: () => void }) {
  const t = useStore((s) => s.tickets.find((x) => x.id === st?.id))
  if (!st || !t) return null
  const k = st.kind
  return (
    <>
      {k === 'eta' && <EtaChange t={t} close={close} />}
      {k === 'start' && <StartWork t={t} close={close} />}
      {k === 'assign' && <Assign t={t} close={close} />}
      {k === 'pending' && <Pending t={t} close={close} />}
      {k === 'done' && <Done t={t} close={close} />}
      {(k === 'cancel' || k === 'reopen') && <Reason t={t} kind={k} close={close} />}
    </>
  )
}

type P = { t: Ticket; close: () => void }

function EtaChange({ t, close }: P) {
  const setEta = useStore((s) => s.setEta)
  const toast = useToast()
  return <EtaDialog open onOpenChange={(v) => !v && close()} value={t.etaAt} priority={t.priority} requireReason allowClear title={t.etaAt ? 'Ubah estimasi selesai' : 'Atur estimasi selesai'} onSave={(e, r) => { setEta(t.id, e, r); toast.push({ tone: 'success', title: e ? `Estimasi ${fmtSmart(e)}` : 'Estimasi dihapus', description: e ? 'Pelapor sudah diberi tahu.' : undefined }) }} />
}

function StartWork({ t, close }: P) {
  const me = useMe()!
  const { assign, setStatus } = useStore.getState()
  const toast = useToast()
  return (
    <EtaDialog open onOpenChange={(v) => !v && close()} title="Mulai kerja" description={t.assigneeId && t.assigneeId !== me.id ? 'Tiket ini ditugaskan ke orang lain. Anda akan mengambil alih.' : 'Kapan kira-kira selesai? Pelapor bisa melihatnya.'} value={t.etaAt} priority={t.priority} confirmLabel="Mulai kerja"
      onSkip={() => { if (t.assigneeId !== me.id && me.role !== 'requester') assign(t.id, me.id); setStatus(t.id, 'in_progress'); toast.push({ tone: 'info', title: 'Pekerjaan dimulai', description: 'Jangan lupa isi estimasi selesai.' }) }}
      onSave={(e) => { if (t.assigneeId !== me.id) assign(t.id, me.id); setStatus(t.id, 'in_progress', { etaAt: e }); toast.push({ tone: 'success', title: 'Pekerjaan dimulai', description: e ? `Estimasi selesai ${fmtSmart(e)}` : undefined }) }} />
  )
}

function Assign({ t, close }: P) {
  const users = useStore((s) => s.users)
  const tickets = useStore((s) => s.tickets)
  const teams = useStore((s) => s.teams)
  const assign = useStore((s) => s.assign)
  const toast = useToast()
  const [who, setWho] = React.useState<string | undefined>(t.assigneeId)
  const [eta, setEta] = React.useState(toLocalInput(t.etaAt ?? defaultEtaFor(t.priority).toISOString()))
  const staff = users.filter((u) => u.role !== 'requester')
  const load = (id: string) => tickets.filter((x) => x.assigneeId === id && isOpenStatus(x.status)).length
  const options = [...staff].sort((a, b) => Number(b.teamId === t.teamId) - Number(a.teamId === t.teamId) || load(a.id) - load(b.id)).map((u) => ({ value: u.id, label: u.name, description: `${u.title} · ${load(u.id)} tiket aktif`, group: u.teamId === t.teamId ? `Tim ${teams.find((x) => x.id === t.teamId)?.name} (disarankan)` : 'Tim lain' }))
  return (
    <Dialog open onOpenChange={(v) => !v && close()}>
      <DialogContent size="sm" title="Tugaskan teknisi" description={`${t.number} · ${t.title}`}
        footer={<><Button variant="ghost" onClick={close}>Batal</Button><Button variant="primary" disabled={!who} onClick={() => { assign(t.id, who, eta ? new Date(eta).toISOString() : undefined); toast.push({ tone: 'success', title: 'Teknisi ditugaskan', description: eta ? `Estimasi ${fmtSmart(new Date(eta).toISOString())}` : undefined }); close() }}>Tugaskan</Button></>}>
        <div className="space-y-4 p-5">
          <Field label="Teknisi" required><Select value={who} onChange={setWho} options={options} searchable placeholder="Pilih teknisi…" /></Field>
          <div className="space-y-2"><p className="text-[12.5px] font-medium text-fg-muted">Estimasi selesai</p><EtaFields value={eta} onChange={setEta} optional /></div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Pending({ t, close }: P) {
  const setStatus = useStore((s) => s.setStatus)
  const toast = useToast()
  const [reason, setReason] = React.useState<PendingReason>('parts')
  const [note, setNote] = React.useState('')
  const [eta, setEta] = React.useState('')
  return (
    <Dialog open onOpenChange={(v) => !v && close()}>
      <DialogContent size="sm" title="Tunda sementara" description="Beri tahu pelapor apa yang ditunggu dan kapan perkiraan lanjut. Hitungan target waktu dijeda."
        footer={<><Button variant="ghost" onClick={close}>Batal</Button><Button variant="primary" onClick={() => { setStatus(t.id, 'pending', { reason, note: note.trim() || undefined, etaAt: eta ? new Date(eta).toISOString() : undefined }); toast.push({ tone: 'info', title: 'Ditandai menunggu', description: PENDING_LABEL[reason] }); close() }}>Simpan</Button></>}>
        <div className="space-y-4 p-5">
          <Field label="Menunggu apa?"><Select value={reason} onChange={setReason} options={(Object.keys(PENDING_LABEL) as PendingReason[]).map((r) => ({ value: r, label: PENDING_LABEL[r].replace('Menunggu ', '') }))} /></Field>
          <Field label="Catatan" hint="opsional"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. kontaktor dipesan, tiba Kamis" /></Field>
          <div className="space-y-2"><p className="text-[12.5px] font-medium text-fg-muted">Perkiraan lanjut / selesai</p><EtaFields value={eta} onChange={setEta} optional /></div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Done({ t, close }: P) {
  const setStatus = useStore((s) => s.setStatus)
  const tasks = useStore((s) => s.tasks)
  const toast = useToast()
  const [note, setNote] = React.useState('')
  const open = tasks.filter((w) => t.taskIds.includes(w.id) && w.status !== 'completed' && w.status !== 'cancelled')
  return (
    <Dialog open onOpenChange={(v) => !v && close()}>
      <DialogContent size="sm" title="Tandai selesai" description="Pelapor akan diminta mengonfirmasi bahwa masalahnya sudah beres."
        footer={<><Button variant="ghost" onClick={close}>Batal</Button><Button variant="primary" disabled={note.trim().length < 6} onClick={() => { setStatus(t.id, 'done', { note: note.trim() }); toast.push({ tone: 'success', title: `${t.number} selesai` }); close() }}>Selesai</Button></>}>
        <div className="space-y-3 p-5">
          <Field label="Apa yang sudah dikerjakan?" required hint="dilihat pelapor"><Textarea autoFocus rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. Ganti kontaktor 25A dan uji 30 menit." /></Field>
          {open.length > 0 && <p className="rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning-soft-fg">Masih ada {open.length} tugas maintenance terkait yang belum selesai.</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Reason({ t, kind, close }: P & { kind: 'cancel' | 'reopen' }) {
  const { setStatus, reopen } = useStore.getState()
  const [why, setWhy] = React.useState('')
  const cancel = kind === 'cancel'
  return (
    <Dialog open onOpenChange={(v) => !v && close()}>
      <DialogContent size="sm" title={cancel ? 'Batalkan tiket?' : 'Buka kembali tiket'} description={cancel ? 'Untuk laporan ganda atau yang ditarik pelapor.' : undefined}
        footer={<><Button variant="ghost" onClick={close}>{cancel ? 'Tetap buka' : 'Batal'}</Button><Button variant={cancel ? 'danger' : 'primary'} disabled={why.trim().length < 4} onClick={() => { cancel ? setStatus(t.id, 'cancelled', { note: why.trim() }) : reopen(t.id, why.trim()); close() }}>{cancel ? 'Batalkan tiket' : 'Buka kembali'}</Button></>}>
        <div className="p-5"><Field label="Alasan" required><Textarea autoFocus rows={3} value={why} onChange={(e) => setWhy(e.target.value)} /></Field></div>
      </DialogContent>
    </Dialog>
  )
}
