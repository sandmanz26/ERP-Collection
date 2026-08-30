import * as React from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip } from './tooltip'

export function Label({ className, children, required, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn('flex items-center gap-1 text-[12.5px] font-medium text-fg-muted', className)} {...props}>
      {children}
      {required && <span className="text-danger">*</span>}
    </label>
  )
}

export function Field({
  label,
  hint,
  help,
  error,
  required,
  className,
  children,
  htmlFor,
}: {
  label?: React.ReactNode
  hint?: React.ReactNode
  help?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
  htmlFor?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={htmlFor} required={required}>
            {label}
            {help && (
              <Tooltip content={help}>
                <Info className="size-3.5 text-fg-subtle" />
              </Tooltip>
            )}
          </Label>
          {hint && <span className="text-[11.5px] text-fg-subtle">{hint}</span>}
        </div>
      )}
      {children}
      {error && <span className="text-[11.5px] font-medium text-danger">{error}</span>}
    </div>
  )
}
