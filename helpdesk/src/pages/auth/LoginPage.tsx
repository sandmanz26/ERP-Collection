import * as React from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { ArrowRight, BarChart3, Building2, ClipboardCheck, LifeBuoy, Wrench } from 'lucide-react'
import { Avatar } from '@/components/ui/misc'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useMe, useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

const PERSONAS = [
  { id: 'u_anisa', role: 'Employee', tone: 'neutral' as const, pitch: 'Report a problem, book a room, invite a visitor and track every request.', icon: ClipboardCheck },
  { id: 'u_budi', role: 'Agent', tone: 'accent' as const, pitch: 'Work the queue, run work orders from your phone, close out preventive maintenance.', icon: Wrench },
  { id: 'u_rina', role: 'Manager', tone: 'purple' as const, pitch: 'See SLA health, building risk, vendor contracts and cost across both buildings.', icon: BarChart3 },
]

export function LoginPage() {
  const me = useMe()
  const users = useStore((s) => s.users)
  const signIn = useStore((s) => s.signIn)
  const nav = useNavigate()
  const loc = useLocation()
  const [other, setOther] = React.useState<string>()
  const from = (loc.state as { from?: string } | null)?.from ?? '/'
  if (me) return <Navigate to={from} replace />

  const go = (id: string) => { signIn(id); nav(from, { replace: true }) }

  return (
    <div className="grid grid-cols-1 min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="relative hidden overflow-hidden bg-auth-panel p-12 text-auth-panel-fg lg:flex lg:flex-col lg:justify-between">
        <div className="surface-grid pointer-events-none absolute inset-0 opacity-[0.13]" />
        <div className="relative flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-white/15"><LifeBuoy className="size-5" /></span>
          <span className="text-[17px] font-semibold tracking-[-0.02em]">Atrium</span>
        </div>
        <div className="relative max-w-md space-y-6">
          <h1 className="text-[34px] font-semibold leading-[1.12] tracking-[-0.03em]">One front door for every problem in your building.</h1>
          <p className="text-[15px] leading-relaxed opacity-80">Tickets, work orders, assets, preventive maintenance, rooms and visitors — connected, so a leaking pipe becomes a job, a cost and a lesson.</p>
          <ul className="space-y-3 text-[14px]">
            {[[Building2, '2 buildings · 31 spaces · 41 tracked assets'], [Wrench, 'Corrective and preventive work in one place'], [ClipboardCheck, 'SLA clocks that pause when you are waiting on someone']].map(([I, t]) => {
              const Ic = I as typeof Wrench
              return <li key={t as string} className="flex items-center gap-3 opacity-90"><Ic className="size-4 shrink-0 opacity-70" />{t as string}</li>
            })}
          </ul>
        </div>
        <p className="relative text-[12px] opacity-60">Demo build · front-end only · all data is mock and stored in your browser</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[460px] space-y-7">
          <div className="space-y-2 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-fg"><LifeBuoy className="size-5" /></span>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-[24px] font-semibold tracking-[-0.025em]">Sign in to Atrium</h2>
            <p className="text-[13.5px] text-fg-muted">This demo has no passwords. Choose who you want to be — you can switch persona any time from the avatar menu.</p>
          </div>

          <div className="space-y-2.5">
            {PERSONAS.map((p) => {
              const u = users.find((x) => x.id === p.id)!
              return (
                <button key={p.id} onClick={() => go(p.id)} className={cn('group flex w-full items-center gap-3.5 rounded-xl border border-border bg-surface p-3.5 text-left shadow-card transition-all hover:border-primary/50 hover:shadow-pop')}>
                  <Avatar name={u.name} className="size-11 text-[13px]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[14.5px] font-semibold">{u.name}</span>
                      <Badge tone={p.tone} size="sm">{p.role}</Badge>
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-fg-muted">{p.pitch}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              )
            })}
          </div>

          <div className="space-y-2 border-t border-border pt-5">
            <p className="text-[12.5px] font-medium text-fg-muted">Or sign in as someone else</p>
            <div className="flex gap-2">
              <Select
                className="flex-1"
                value={other}
                onChange={setOther}
                searchable
                placeholder="Pick a colleague…"
                options={users.map((u) => ({ value: u.id, label: u.name, description: `${u.title} · ${u.role}` }))}
              />
              <Button variant="primary" disabled={!other} onClick={() => other && go(other)}>Continue</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
