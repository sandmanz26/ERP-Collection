import * as React from 'react'
import { cn } from '@/lib/utils'

export function Separator({ className, vertical }: { className?: string; vertical?: boolean }) {
  return <div role="separator" className={cn(vertical ? 'w-px self-stretch' : 'h-px w-full', 'bg-border', className)} />
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-bg-muted', className)}>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent [animation:shimmer_1.4s_infinite]" />
    </div>
  )
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong/70 bg-surface px-1.5 font-sans text-[10.5px] font-medium text-fg-muted shadow-[0_1px_0_hsl(var(--border-strong))]',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export function Progress({
  value,
  className,
  tone = 'primary',
  size = 'md',
}: {
  value: number
  className?: string
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'accent'
  size?: 'sm' | 'md' | 'lg'
}) {
  const bar = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    accent: 'bg-accent',
  }[tone]
  const h = { sm: 'h-1', md: 'h-1.5', lg: 'h-2.5' }[size]
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-neutral-soft', h, className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', bar)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function Avatar({ name, className, tone }: { name: string; className?: string; tone?: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  const palette = ['bg-primary-soft text-primary-soft-fg', 'bg-accent-soft text-accent-soft-fg', 'bg-purple-soft text-purple-soft-fg', 'bg-warning-soft text-warning-soft-fg', 'bg-success-soft text-success-soft-fg']
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length
  return (
    <span
      className={cn(
        'grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold tracking-tight',
        tone ?? palette[idx],
        className,
      )}
    >
      {letters}
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      {icon && (
        <span className="grid size-11 place-items-center rounded-xl border border-border bg-surface-sunken text-fg-subtle [&_svg]:size-5">
          {icon}
        </span>
      )}
      <div className="space-y-1">
        <p className="text-[14px] font-semibold text-fg">{title}</p>
        {description && <p className="mx-auto max-w-sm text-[12.5px] leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Stat({
  label,
  value,
  sub,
  className,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-fg-subtle">{label}</p>
      <p className="tnum text-[19px] font-semibold leading-none tracking-[-0.02em] text-fg">{value}</p>
      {sub && <p className="text-[12px] text-fg-muted">{sub}</p>}
    </div>
  )
}
