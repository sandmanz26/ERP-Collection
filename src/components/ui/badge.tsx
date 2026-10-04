import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'ui-badge inline-flex items-center gap-1.5 whitespace-nowrap font-medium leading-none transition-colors',
  {
    variants: {
      tone: {
        neutral: 'ui-badge-neutral bg-neutral-soft text-neutral-soft-fg',
        primary: 'ui-badge-primary bg-primary-soft text-primary-soft-fg',
        accent: 'ui-badge-accent bg-accent-soft text-accent-soft-fg',
        success: 'ui-badge-success bg-success-soft text-success-soft-fg',
        warning: 'ui-badge-warning bg-warning-soft text-warning-soft-fg',
        danger: 'ui-badge-danger bg-danger-soft text-danger-soft-fg',
        info: 'ui-badge-info bg-info-soft text-info-soft-fg',
        purple: 'ui-badge-purple bg-purple-soft text-purple-soft-fg',
        outline: 'ui-badge-outline border border-border-strong text-fg-muted',
      },
      size: {
        sm: 'h-[19px] rounded px-1.5 text-[11px]',
        md: 'h-[22px] rounded-md px-2 text-[11.5px]',
        lg: 'h-7 rounded-md px-2.5 text-[12.5px]',
      },
      dot: { true: '', false: '' },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
)

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean
}

export function Badge({ className, tone, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}
