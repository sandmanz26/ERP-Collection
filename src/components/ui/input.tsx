import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  leading?: React.ReactNode
  trailing?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, leading, trailing, ...props }, ref) => {
    const field = (
      <input
        ref={ref}
        className={cn(
          'h-9 w-full rounded-lg border bg-surface px-3 text-[13.5px] text-fg shadow-[inset_0_1px_1px_hsl(var(--shadow-color)/0.04)] transition-[border-color,box-shadow] placeholder:text-fg-subtle',
          'focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/16',
          'disabled:cursor-not-allowed disabled:bg-bg-muted disabled:text-fg-subtle',
          invalid ? 'border-danger focus:border-danger focus:ring-danger/18' : 'border-border-strong/80',
          leading && 'pl-9',
          trailing && 'pr-9',
          className,
        )}
        {...props}
      />
    )
    if (!leading && !trailing) return field
    return (
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle [&_svg]:size-4">
            {leading}
          </span>
        )}
        {field}
        {trailing && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-subtle [&_svg]:size-4">{trailing}</span>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border bg-surface px-3 py-2 text-[13.5px] text-fg transition-[border-color,box-shadow] placeholder:text-fg-subtle',
        'focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/16 resize-y min-h-[76px]',
        invalid ? 'border-danger' : 'border-border-strong/80',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
