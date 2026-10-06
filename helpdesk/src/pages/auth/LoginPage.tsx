import * as React from 'react'
import { useLocation, useNavigate, Navigate, Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, Inbox, LifeBuoy, QrCode, Wrench } from 'lucide-react'
import { Avatar } from '@/components/ui/misc'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useMe, useStore } from '@/store/useStore'
import { COMPANY, SITE } from '@/data/reference'

const PERSONAS = [
  { id: 'u_anisa', role: 'Karyawan', tone: 'neutral' as const, pitch: 'Lapor masalah fasilitas, pantau estimasi selesainya, ajukan sewa aula atau ruang meeting.' },
  { id: 'u_budi', role: 'Teknisi', tone: 'accent' as const, pitch: 'Lihat tugas hari ini, isi ETA, ubah status, dan tandai jadwal maintenance selesai.' },
  { id: 'u_rina', role: 'Admin', tone: 'purple' as const, pitch: 'Tugaskan teknisi, setujui reservasi, kelola aset, jadwal, dan lihat laporan.' },
]

export function LoginPage() {
  const me = useMe()
  const users = useStore((s) => s.users).filter((u) => !u.system)
  const signIn = useStore((s) => s.signIn)
  const nav = useNavigate()
  const loc = useLocation()
  const [other, setOther] = React.useState<string>()
  const from = (loc.state as { from?: string } | null)?.from ?? '/'
  if (me) return <Navigate to={from} replace />
  const go = (id: string) => { signIn(id); nav(from, { replace: true }) }

  return (
    <div className="grid grid-cols-1 min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-auth-panel p-12 text-auth-panel-fg lg:flex lg:flex-col lg:justify-between">
        <div className="surface-grid pointer-events-none absolute inset-0 opacity-[0.13]" />
        <div className="relative flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-white/15"><LifeBuoy className="size-5" /></span><span className="text-[17px] font-semibold tracking-[-0.02em]">Atrium</span></div>
        <div className="relative max-w-md space-y-6">
          <h1 className="text-[34px] font-semibold leading-[1.12] tracking-[-0.03em]">Masalah fasilitas pabrik, tercatat dan jelas kapan selesainya.</h1>
          <p className="text-[15px] leading-relaxed opacity-80">Satu tempat untuk lapor masalah, tugaskan teknisi, tahu estimasi selesai, jadwalkan perawatan, dan kelola sewa aula serta ruang meeting.</p>
          <ul className="space-y-3 text-[14px]">
            {[[Inbox, 'Tiket sederhana: teknisi · ETA · status'], [Wrench, 'Aset dan jadwal maintenance berkala'], [CalendarCheck, 'Penyewaan ruang meeting, aula, lapangan'], [QrCode, 'Lapor lewat scan QR tanpa login']].map(([I, t]) => { const Ic = I as typeof Wrench; return <li key={t as string} className="flex items-center gap-3 opacity-90"><Ic className="size-4 shrink-0 opacity-70" />{t as string}</li> })}
          </ul>
        </div>
        <p className="relative text-[12px] opacity-60">{COMPANY} · {SITE} · versi demo, semua data hanya contoh</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[460px] space-y-7">
          <div className="space-y-2 lg:hidden"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-fg"><LifeBuoy className="size-5" /></span></div>
          <div className="space-y-1.5">
            <h2 className="text-[24px] font-semibold tracking-[-0.025em]">Masuk ke Atrium</h2>
            <p className="text-[13.5px] text-fg-muted">Ini versi demo tanpa kata sandi. Pilih peran yang ingin dicoba — bisa diganti kapan saja dari menu akun.</p>
          </div>
          <div className="space-y-2.5">
            {PERSONAS.map((p) => {
              const u = users.find((x) => x.id === p.id)!
              return (
                <button key={p.id} onClick={() => go(p.id)} className="group flex w-full items-center gap-3.5 rounded-xl border border-border bg-surface p-3.5 text-left shadow-card transition-all hover:border-primary/50 hover:shadow-pop">
                  <Avatar name={u.name} className="size-11 text-[13px]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><span className="text-[14.5px] font-semibold">{u.name}</span><Badge tone={p.tone} size="sm">{p.role}</Badge></span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-fg-muted">{p.pitch}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              )
            })}
          </div>
          <div className="space-y-2 border-t border-border pt-5">
            <p className="text-[12.5px] font-medium text-fg-muted">Atau masuk sebagai orang lain</p>
            <div className="flex gap-2">
              <Select className="flex-1" value={other} onChange={setOther} searchable placeholder="Pilih nama…" options={users.map((u) => ({ value: u.id, label: u.name, description: `${u.title}` }))} />
              <Button variant="primary" disabled={!other} onClick={() => other && go(other)}>Lanjut</Button>
            </div>
          </div>
          <Link to="/lapor-cepat" className="flex items-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface-sunken p-3.5 text-[13px] hover:border-primary/50">
            <QrCode className="size-5 shrink-0 text-primary" />
            <span><strong className="block text-fg">Lapor cepat tanpa login</strong><span className="text-fg-muted">Seperti hasil scan QR di mesin atau area kerja.</span></span>
          </Link>
        </div>
      </section>
    </div>
  )
}
