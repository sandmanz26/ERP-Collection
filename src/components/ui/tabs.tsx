import * as React from 'react'
import { cn } from '@/lib/utils'

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
  variant = 'underline',
}: {
  value: T
  onChange: (v: T) => void
  items: { value: T; label: React.ReactNode; icon?: React.ReactNode; count?: number; badge?: React.ReactNode }[]
  className?: string
  variant?: 'underline' | 'pill'
}) {
  if (variant === 'pill') {
    return (
      <div className={cn('inline-flex items-center gap-1 rounded-xl border border-border bg-surface-sunken p-1', className)}>
        {items.map((it) => (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all [&_svg]:size-4',
              value === it.value ? 'bg-surface text-fg shadow-card' : 'text-fg-muted hover:text-fg',
            )}
          >
            {it.icon}
            {it.label}
            {it.count !== undefined && (
              <span className="tnum rounded bg-neutral-soft px-1.5 text-[11px] text-neutral-soft-fg">{it.count}</span>
            )}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div className={cn('flex items-center gap-0.5 border-b border-border', className)}>
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            'relative -mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors [&_svg]:size-4',
            value === it.value
              ? 'border-primary text-fg'
              : 'border-transparent text-fg-muted hover:border-border-strong hover:text-fg',
          )}
        >
          {it.icon}
          {it.label}
          {it.count !== undefined && (
            <span
              className={cn(
                'tnum rounded px-1.5 text-[11px]',
                value === it.value ? 'bg-primary-soft text-primary-soft-fg' : 'bg-neutral-soft text-neutral-soft-fg',
              )}
            >
              {it.count}
            </span>
          )}
          {it.badge}
        </button>
      ))}
    </div>
  )
}
