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
  /* Tie the label (and any error) to the control so screen readers and tests
     can find an input by its visible name. */
  const auto = React.useId()
  const id = htmlFor ?? auto
  const errId = `${id}-err`
  const only = React.Children.count(children) === 1 && React.isValidElement(children) ? (children as React.ReactElement<Record<string, unknown>>) : null
  const control =
    only && typeof only.type !== 'string' && (only.type as { displayName?: string }).displayName !== 'Select' && ('onChange' in only.props || 'value' in only.props) && !('options' in only.props)
      ? React.cloneElement(only, { id: (only.props.id as string) ?? id, 'aria-describedby': error ? errId : undefined, 'aria-invalid': error ? true : undefined })
      : children
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={only && control !== children ? ((only.props.id as string) ?? id) : htmlFor} required={required}>
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
      {control}
      {error && <span id={errId} role="alert" className="text-[11.5px] font-medium text-danger">{error}</span>}
    </div>
  )
}
