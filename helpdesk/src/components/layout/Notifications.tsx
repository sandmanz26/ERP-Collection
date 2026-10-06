import * as P from '@radix-ui/react-popover'
import { Bell, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import { fmtAgo } from '@/lib/format'
import { useMe, useStore } from '@/store/useStore'

const dot = { info: 'bg-info', warning: 'bg-warning', success: 'bg-success', danger: 'bg-danger' }

export function Notifications() {
  const me = useMe()!
  const all = useStore((s) => s.notifications)
  const markRead = useStore((s) => s.markRead)
  const markAll = useStore((s) => s.markAllRead)
  const nav = useNavigate()
  const mine = all.filter((n) => n.userId === me.id).sort((a, b) => b.at.localeCompare(a.at))
  const unread = mine.filter((n) => !n.read).length
  return (
    <P.Root>
      <P.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} className="relative">
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-surface">{unread}</span>
          )}
        </Button>
      </P.Trigger>
      <P.Portal>
        <P.Content align="end" sideOffset={8} className="z-[70] w-[min(380px,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-surface-raised shadow-pop animate-pop-in">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <p className="text-[13px] font-semibold">Notifications</p>
            <Button variant="ghost" size="xs" onClick={() => markAll(me.id)} disabled={!unread}>
              <CheckCheck /> Mark all read
            </Button>
          </div>
          <div className="scrollbar-thin max-h-[420px] overflow-y-auto">
            {mine.length === 0 ? (
              <EmptyState icon={<Bell />} title="You are all caught up" description="Updates on your requests will show up here." className="py-10" />
            ) : (
              mine.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    markRead(n.id)
                    if (n.to) nav(n.to)
                  }}
                  className={cn('flex w-full items-start gap-3 border-b border-border/60 px-3.5 py-3 text-left transition-colors last:border-0 hover:bg-bg-muted', !n.read && 'bg-primary-soft/40')}
                >
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : dot[n.tone ?? 'info'])} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[13px] leading-snug', n.read ? 'text-fg-muted' : 'font-medium text-fg')}>{n.text}</span>
                    <span className="mt-0.5 block text-[11.5px] text-fg-subtle">{fmtAgo(n.at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </P.Content>
      </P.Portal>
    </P.Root>
  )
}
