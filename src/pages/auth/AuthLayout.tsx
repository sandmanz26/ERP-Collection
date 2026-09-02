import * as React from 'react'
import { Link } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { ShieldHalf } from 'lucide-react'
import { company } from '@/data/seed-org'
import { clients } from '@/data/seed-clients'
import { projects } from '@/data/seed-projects'
import { deployedHeadcount, isLiveProject } from '@/lib/domain'

/** Three figures from the seeded book, so the panel is never a stock photograph. */
const PROOF = [
  { value: String(projects.filter(isLiveProject).length), label: 'contracts running' },
  {
    value: projects.filter(isLiveProject).reduce((a, p) => a + deployedHeadcount(p), 0).toLocaleString('en-US'),
    label: 'personnel on site today',
  },
  { value: String(clients.filter((c) => c.status === 'ACTIVE').length), label: 'active clients' },
]

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-screen w-full bg-bg">
      {/* ---------- brand panel ---------- */}
      <aside className="relative hidden w-[45%] max-w-[600px] shrink-0 overflow-hidden bg-auth-panel lg:flex lg:flex-col">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgb(255 255 255 / 0.9) 0, transparent 44%), radial-gradient(circle at 80% 80%, rgb(255 255 255 / 0.7) 0, transparent 46%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(255 255 255 / 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.6) 1px, transparent 1px)',
            backgroundSize: '38px 38px',
          }}
        />

        <div className="relative flex h-full flex-col justify-between p-10 text-auth-panel-fg xl:p-14">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <ShieldHalf className="size-5" />
            </span>
            <div>
              <p className="text-[15px] font-semibold leading-tight tracking-[-0.01em]">Tata Gemilang</p>
              <p className="text-[12px] leading-tight text-auth-panel-fg/70">Outsourcing Management System</p>
            </div>
          </div>

          <div className="max-w-[430px]">
            <h1 className="text-[30px] font-semibold leading-[1.15] tracking-[-0.02em] xl:text-[34px]">
              Every post filled, every building accounted for.
            </h1>
            <p className="mt-4 text-[14px] leading-relaxed text-auth-panel-fg/75">
              Clients, contracts and the people standing on site — plus the uniforms, chemicals and equipment it takes
              to put them there.
            </p>

            <dl className="mt-9 grid grid-cols-3 gap-4 border-t border-white/15 pt-6">
              {PROOF.map((p) => (
                <div key={p.label}>
                  <dt className="tnum text-[24px] font-semibold leading-none tracking-[-0.02em]">{p.value}</dt>
                  <dd className="mt-1.5 text-[11.5px] leading-snug text-auth-panel-fg/65">{p.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="max-w-[430px] text-[11px] leading-relaxed text-auth-panel-fg/50">
            {company.legalName} · {company.licenceNo} · Front-end demonstration build; all data is fictional and held in
            this browser.
          </p>
        </div>
      </aside>

      {/* ---------- form panel ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between px-5 lg:px-8">
          <Link to="/login" className="flex items-center gap-2.5 lg:invisible">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-fg">
              <ShieldHalf className="size-[17px]" />
            </span>
            <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-fg">Tata Gemilang</span>
          </Link>
        </header>

        <main className="scrollbar-thin flex flex-1 items-center justify-center overflow-y-auto px-5 pb-10 lg:px-8">
          <div key={pathname} className="w-full max-w-[416px] animate-[fade-in_180ms_ease-out]">
            <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-fg">{title}</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-muted">{subtitle}</p>
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-6 border-t border-border pt-5 text-[12.5px] text-fg-muted">{footer}</div>}
          </div>
        </main>
      </div>
    </div>
  )
}

/** A failure the person can act on: what happened, then what to do about it. */
export function AuthNotice({
  tone,
  message,
  remedy,
  action,
}: {
  tone: 'error' | 'success' | 'info'
  message: string
  remedy?: string
  action?: React.ReactNode
}) {
  const styles = {
    error: 'border-danger/30 bg-danger-soft text-danger-soft-fg',
    success: 'border-success/30 bg-success-soft text-success-soft-fg',
    info: 'border-info/30 bg-info-soft text-info-soft-fg',
  }[tone]
  return (
    <div className={`rounded-xl border px-3.5 py-3 ${styles}`} role="status">
      <p className="text-[12.5px] font-semibold leading-snug">{message}</p>
      {remedy && <p className="mt-1 text-[12px] leading-relaxed opacity-90">{remedy}</p>}
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  )
}
