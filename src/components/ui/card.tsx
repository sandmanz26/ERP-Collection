import * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-border bg-surface shadow-card', className)} {...props} />
}

export function CardHeader({
  title,
  description,
  actions,
  icon,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-border px-4 py-3', className)} {...props}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && (
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-soft-fg [&_svg]:size-4">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {title && <h3 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-fg">{title}</h3>}
          {description && <p className="mt-0.5 text-[12.5px] leading-relaxed text-fg-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  )
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-between gap-3 border-t border-border bg-surface-sunken/60 px-4 py-3', className)} {...props} />
}
