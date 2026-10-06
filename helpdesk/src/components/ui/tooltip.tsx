import * as React from 'react'
import * as T from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <T.Provider delayDuration={220} skipDelayDuration={300}>
    {children}
  </T.Provider>
)

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  className,
}: {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  className?: string
}) {
  if (!content) return <>{children}</>
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            'z-[80] max-w-[280px] rounded-lg bg-overlay px-2.5 py-1.5 text-[12px] leading-relaxed text-white shadow-lg animate-pop-in',
            className,
          )}
        >
          {content}
          <T.Arrow className="fill-overlay" width={10} height={5} />
        </T.Content>
      </T.Portal>
    </T.Root>
  )
}
