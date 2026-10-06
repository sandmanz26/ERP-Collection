import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 select-none disabled:pointer-events-none disabled:opacity-45 active:translate-y-px [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-fg shadow-[0_1px_0_0_hsl(var(--shadow-color)/0.12),inset_0_1px_0_0_rgb(255_255_255/0.16)] hover:bg-primary-hover',
        secondary:
          'bg-surface text-fg border border-border-strong/70 shadow-card hover:bg-bg-muted hover:border-border-strong',
        ghost: 'text-fg-muted hover:bg-bg-muted hover:text-fg',
        subtle: 'bg-bg-muted text-fg hover:bg-neutral-soft',
        danger: 'bg-danger text-white shadow-card hover:brightness-110',
        dangerGhost: 'text-danger hover:bg-danger-soft',
        outlineDanger: 'border border-danger/40 text-danger hover:bg-danger-soft',
        link: 'text-primary underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        xs: 'h-7 rounded-md px-2 text-[12px] [&_svg]:size-3.5',
        sm: 'h-8 rounded-md px-2.5 text-[13px] [&_svg]:size-4',
        md: 'h-9 rounded-lg px-3.5 text-[13.5px] [&_svg]:size-4',
        lg: 'h-11 rounded-lg px-5 text-[15px] [&_svg]:size-[18px]',
        icon: 'h-9 w-9 rounded-lg [&_svg]:size-4',
        iconSm: 'h-8 w-8 rounded-md [&_svg]:size-4',
        iconXs: 'h-7 w-7 rounded-md [&_svg]:size-3.5',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        /* A bare <button> inside a <form> submits it. Default to "button" so an
           action button placed in a form never fires the form by accident —
           submit buttons say so explicitly. */
        {...(asChild ? {} : { type: type ?? 'button' })}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'
export { buttonVariants }
