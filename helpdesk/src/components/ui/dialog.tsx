import * as React from 'react'
import * as D from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogClose = D.Close

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-[min(1180px,94vw)]',
}

export function DialogContent({
  children,
  className,
  size = 'md',
  title,
  description,
  icon,
  footer,
  onInteractOutside,
}: {
  children: React.ReactNode
  className?: string
  size?: keyof typeof sizes
  title?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  footer?: React.ReactNode
  onInteractOutside?: (e: Event) => void
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-[60] bg-overlay/55 backdrop-blur-[2px] animate-fade-in" />
      <D.Content
        onInteractOutside={onInteractOutside}
        className={cn(
          'fixed left-1/2 top-1/2 z-[61] flex max-h-[92vh] w-[94vw] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-pop animate-slide-up',
          sizes[size],
          className,
        )}
      >
        {(title || description) && (
          <div className="flex items-start gap-3 border-b border-border px-5 py-4">
            {icon && (
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-fg [&_svg]:size-4">
                {icon}
              </span>
            )}
            <div className="min-w-0 flex-1">
              {title && <D.Title className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{title}</D.Title>}
              {description && (
                <D.Description className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{description}</D.Description>
              )}
            </div>
            <D.Close asChild>
              <Button variant="ghost" size="iconSm" aria-label="Close">
                <X />
              </Button>
            </D.Close>
          </div>
        )}
        <div className="scrollbar-thin flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-sunken/60 px-5 py-3.5">{footer}</div>}
      </D.Content>
    </D.Portal>
  )
}

export function Sheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  footer,
  width = 'max-w-2xl',
  eyebrow,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  children: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  footer?: React.ReactNode
  width?: string
  eyebrow?: React.ReactNode
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-overlay/55 backdrop-blur-[2px] animate-fade-in" />
        <D.Content
          className={cn(
            'fixed inset-y-0 right-0 z-[61] flex w-full flex-col border-l border-border bg-surface shadow-pop',
            '[animation:slide-up_.24s_cubic-bezier(.16,1,.3,1)]',
            width,
          )}
        >
          <div className="flex items-start gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0 flex-1">
              {eyebrow && <div className="mb-1">{eyebrow}</div>}
              {title && <D.Title className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{title}</D.Title>}
              {description && <D.Description className="mt-1 text-[12.5px] text-fg-muted">{description}</D.Description>}
            </div>
            <D.Close asChild>
              <Button variant="ghost" size="iconSm" aria-label="Close">
                <X />
              </Button>
            </D.Close>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto">{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-sunken/60 px-5 py-3.5">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
