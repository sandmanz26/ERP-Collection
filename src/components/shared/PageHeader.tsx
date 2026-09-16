import * as React from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  meta?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-5 pb-7', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2.5 flex items-center gap-2">{eyebrow}</div>}
        <h1 className="text-[23px] font-semibold leading-tight tracking-[-0.022em] text-fg">{title}</h1>
        {description && <p className="mt-2.5 max-w-3xl text-[13.5px] leading-[1.65] text-fg-muted">{description}</p>}
        {meta && <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2.5">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function KpiCard({
  label,
  value,
  delta,
  deltaTone = 'neutral',
  sub,
  icon,
  accent,
  onClick,
}: {
  label: string
  value: React.ReactNode
  delta?: string
  deltaTone?: 'up' | 'down' | 'neutral'
  sub?: React.ReactNode
  icon?: React.ReactNode
  accent?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'purple'
  onClick?: () => void
}) {
  const accents = {
    primary: 'bg-primary-soft text-primary-soft-fg',
    accent: 'bg-accent-soft text-accent-soft-fg',
    success: 'bg-success-soft text-success-soft-fg',
    warning: 'bg-warning-soft text-warning-soft-fg',
    danger: 'bg-danger-soft text-danger-soft-fg',
    purple: 'bg-purple-soft text-purple-soft-fg',
  }
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'flex items-start gap-3.5 rounded-xl border border-border bg-surface px-5 py-[18px] text-left shadow-card transition-shadow',
        onClick && 'hover:border-border-strong hover:shadow-pop',
      )}
    >
      {icon && (
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-[18px]', accents[accent ?? 'primary'])}>
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase leading-tight tracking-[0.055em] text-fg-subtle">{label}</p>
        <p className="tnum mt-2 truncate text-[21px] font-semibold leading-none tracking-[-0.025em] text-fg">{value}</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {delta && (
            <span
              className={cn(
                'tnum text-[12px] font-semibold',
                deltaTone === 'up' && 'text-success',
                deltaTone === 'down' && 'text-danger',
                deltaTone === 'neutral' && 'text-fg-muted',
              )}
            >
              {delta}
            </span>
          )}
          {sub && <span className="text-[12px] leading-snug text-fg-muted">{sub}</span>}
        </div>
      </div>
    </Comp>
  )
}
