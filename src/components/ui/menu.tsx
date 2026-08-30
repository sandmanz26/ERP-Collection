import * as React from 'react'
import * as M from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Menu = M.Root
export const MenuTrigger = M.Trigger

export function MenuContent({
  children,
  align = 'end',
  className,
  sideOffset = 6,
}: {
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
  sideOffset?: number
}) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-[70] min-w-[196px] overflow-hidden rounded-xl border border-border bg-surface-raised p-1 shadow-pop animate-pop-in',
          className,
        )}
      >
        {children}
      </M.Content>
    </M.Portal>
  )
}

export function MenuItem({
  children,
  onSelect,
  icon,
  danger,
  disabled,
  shortcut,
  className,
}: {
  children: React.ReactNode
  onSelect?: () => void
  icon?: React.ReactNode
  danger?: boolean
  disabled?: boolean
  shortcut?: string
  className?: string
}) {
  return (
    <M.Item
      disabled={disabled}
      onSelect={() => onSelect?.()}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] outline-none transition-colors [&_svg]:size-4',
        danger
          ? 'text-danger data-[highlighted]:bg-danger-soft'
          : 'text-fg data-[highlighted]:bg-primary-soft/70',
        disabled && 'pointer-events-none opacity-45',
        className,
      )}
    >
      {icon && <span className={cn('shrink-0', danger ? 'text-danger' : 'text-fg-muted')}>{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <span className="text-[11px] text-fg-subtle">{shortcut}</span>}
    </M.Item>
  )
}

export function MenuCheckItem({
  children,
  checked,
  onSelect,
}: {
  children: React.ReactNode
  checked: boolean
  onSelect: () => void
}) {
  return (
    <M.Item
      onSelect={(e) => {
        e.preventDefault()
        onSelect()
      }}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] text-fg outline-none data-[highlighted]:bg-primary-soft/70"
    >
      <span
        className={cn(
          'grid size-4 shrink-0 place-items-center rounded border transition-colors',
          checked ? 'border-primary bg-primary text-primary-fg' : 'border-border-strong',
        )}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className="flex-1 truncate">{children}</span>
    </M.Item>
  )
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <M.Label className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
      {children}
    </M.Label>
  )
}

export function MenuSeparator() {
  return <M.Separator className="my-1 h-px bg-border" />
}

export function MenuSub({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <M.Sub>
      <M.SubTrigger className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] text-fg outline-none data-[highlighted]:bg-primary-soft/70 data-[state=open]:bg-primary-soft/70 [&_svg]:size-4">
        {icon && <span className="text-fg-muted">{icon}</span>}
        <span className="flex-1">{label}</span>
        <ChevronRight className="size-3.5 text-fg-subtle" />
      </M.SubTrigger>
      <M.Portal>
        <M.SubContent className="z-[71] min-w-[180px] overflow-hidden rounded-xl border border-border bg-surface-raised p-1 shadow-pop animate-pop-in">
          {children}
        </M.SubContent>
      </M.Portal>
    </M.Sub>
  )
}
