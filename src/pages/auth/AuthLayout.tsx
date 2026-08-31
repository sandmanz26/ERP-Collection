import * as React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Anchor, Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Segmented } from '@/components/ui/checkbox'
import { useTheme } from '@/hooks/useTheme'
import { company } from '@/data/seed3'

/** The three numbers on the marketing panel — real figures from the seeded book. */
const PROOF = [
  { value: '14', label: 'live export jobs' },
  { value: '23', label: 'containers on the water' },
  { value: '18', label: 'destination countries' },
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
  const { mode, setMode } = useTheme()
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-screen w-full bg-bg">
      {/* ---------- brand panel ---------- */}
      <aside className="relative hidden w-[46%] max-w-[620px] shrink-0 overflow-hidden bg-auth-panel lg:flex lg:flex-col">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 22%, rgb(255 255 255 / 0.9) 0, transparent 42%), radial-gradient(circle at 82% 78%, rgb(255 255 255 / 0.7) 0, transparent 46%)',
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
              <Anchor className="size-5" />
            </span>
            <div>
              <p className="text-[15px] font-semibold leading-tight tracking-[-0.01em]">Meridian Freight</p>
              <p className="text-[12px] leading-tight text-auth-panel-fg/70">Export Operations Suite</p>
            </div>
          </div>

          <div className="max-w-[430px]">
            <h1 className="text-[30px] font-semibold leading-[1.15] tracking-[-0.02em] xl:text-[34px]">
              Every cut-off, certificate and charge on one job record.
            </h1>
            <p className="mt-4 text-[14px] leading-relaxed text-auth-panel-fg/75">
              Quotation to settlement, with the gates that stop a container reaching the terminal without a VGM, a
              treatment certificate or an accepted export declaration.
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
            {company.legalName} · {company.registrationNo} · Business undertaken subject to ALFI Standard Trading
            Conditions.
          </p>
        </div>
      </aside>

      {/* ---------- form panel ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between px-5 lg:px-8">
          <Link to="/login" className="flex items-center gap-2.5 lg:invisible">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-fg">
              <Anchor className="size-[17px]" />
            </span>
            <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-fg">Meridian Freight</span>
          </Link>
          <Segmented
            value={mode}
            onChange={(v) => setMode(v)}
            options={[
              { value: 'light', label: 'Light', icon: <Sun /> },
              { value: 'dark', label: 'Dark', icon: <Moon /> },
              { value: 'system', label: 'Auto', icon: <Monitor /> },
            ]}
          />
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

/** A result banner that always says what happened *and* what to do about it. */
export function AuthNotice({
  tone,
  title,
  detail,
  action,
}: {
  tone: 'danger' | 'warning' | 'success' | 'info'
  title: string
  detail?: string
  action?: React.ReactNode
}) {
  const map = {
    danger: 'border-danger/30 bg-danger-soft text-danger-soft-fg',
    warning: 'border-warning/30 bg-warning-soft text-warning-soft-fg',
    success: 'border-success/30 bg-success-soft text-success-soft-fg',
    info: 'border-info/30 bg-info-soft text-info-soft-fg',
  } as const
  return (
    <div role="alert" className={cn('rounded-lg border px-3.5 py-3', map[tone])}>
      <p className="text-[13px] font-semibold leading-snug">{title}</p>
      {detail && <p className="mt-1 text-[12.5px] leading-relaxed opacity-85">{detail}</p>}
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  )
}

/** Live password strength, shown as the rules that are still unmet. */
export function PasswordRules({ problems, touched }: { problems: string[]; touched: boolean }) {
  if (!touched) return null
  if (!problems.length) {
    return <p className="text-[11.5px] font-medium text-success">Password meets every rule.</p>
  }
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {problems.map((p) => (
        <li key={p} className="text-[11.5px] text-fg-subtle before:mr-1 before:text-danger before:content-['·']">
          {p}
        </li>
      ))}
    </ul>
  )
}
