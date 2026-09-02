import * as React from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  disabled,
  className,
  label,
  'aria-label': ariaLabel,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  className?: string
  label?: React.ReactNode
  'aria-label'?: string
}) {
  const box = (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={cn(
        'grid size-[17px] shrink-0 place-items-center rounded-[5px] border transition-[background-color,border-color,box-shadow] duration-150',
        'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25',
        checked || indeterminate
          ? 'border-primary bg-primary text-primary-fg'
          : 'border-border-strong bg-surface hover:border-primary/60',
        disabled && 'cursor-not-allowed opacity-40',
        className,
      )}
    >
      {indeterminate ? <Minus className="size-3" strokeWidth={3.5} /> : checked ? <Check className="size-3" strokeWidth={3.5} /> : null}
    </button>
  )
  if (!label) return box
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-fg">
      {box}
      <span>{label}</span>
    </label>
  )
}

export function Switch({
  checked,
  onChange,
  disabled,
  size = 'md',
  className,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const w = size === 'sm' ? 'h-4 w-7' : 'h-5 w-9'
  const k = size === 'sm' ? 'size-3' : 'size-4'
  const t = size === 'sm' ? 'translate-x-3' : 'translate-x-4'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative shrink-0 rounded-full border border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25',
        checked ? 'bg-primary' : 'bg-border-strong',
        disabled && 'cursor-not-allowed opacity-45',
        w,
        className,
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-200',
          k,
          checked && t,
        )}
      />
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode }[]
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-sunken p-0.5',
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md font-medium transition-all duration-150 [&_svg]:size-3.5',
            size === 'sm' ? 'h-6 px-2 text-[12px]' : 'h-7 px-2.5 text-[12.5px]',
            value === o.value
              ? 'bg-surface text-fg shadow-card'
              : 'text-fg-muted hover:text-fg',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** A switch with the label and the sentence that explains what turning it on does. */
export function SwitchField({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3', disabled && 'cursor-not-allowed opacity-60')}>
      <Switch checked={checked} onChange={onChange} disabled={disabled} className="mt-0.5" />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-[11.5px] leading-relaxed text-fg-muted">{description}</span>}
      </span>
    </label>
  )
}
