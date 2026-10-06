import * as React from 'react'
import * as D from '@radix-ui/react-dialog'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, LogOut, Menu as MenuIcon, Moon, Plus, RotateCcw, Search, Sun, X, LifeBuoy } from 'lucide-react'
import { Avatar, Kbd } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import { useMe, useStore } from '@/store/useStore'
import { isOpenStatus } from '@/lib/sla'
import { BRAND, navFor, type NavItem } from './nav'
import { CommandPalette } from './CommandPalette'
import { Notifications } from './Notifications'
import { useToast } from '@/components/ui/toast'

const PERSONAS = ['u_anisa', 'u_budi', 'u_rina']
const ROLE_LABEL = { requester: 'Employee', agent: 'Agent', manager: 'Manager' }

function useBadges() {
  const me = useMe()!
  const tickets = useStore((s) => s.tickets)
  const wos = useStore((s) => s.workOrders)
  return React.useMemo(() => {
    const open = tickets.filter((t) => isOpenStatus(t.status))
    const now = Date.now()
    return {
      unassigned: open.filter((t) => !t.assigneeId).length,
      myOpen: tickets.filter((t) => t.requesterId === me.id && (isOpenStatus(t.status) || t.status === 'resolved')).length,
      overdueWo: wos.filter((w) => w.status !== 'completed' && w.status !== 'cancelled' && new Date(w.dueAt).getTime() < now).length,
    }
  }, [tickets, wos, me.id])
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-fg shadow-card">
        <LifeBuoy className="size-[18px]" />
      </span>
      {!compact && (
        <div className="leading-tight">
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-fg">{BRAND.name}</p>
          <p className="text-[11px] text-fg-subtle">Nusantara Group</p>
        </div>
      )}
    </div>
  )
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const me = useMe()!
  const badges = useBadges()
  const groups = navFor(me.role)
  return (
    <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin">
      {groups.map((g, gi) => (
        <div key={gi} className="space-y-0.5">
          {g.label && <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{g.label}</p>}
          {g.items.map((it) => (
            <NavRow key={it.to} item={it} count={it.badgeKey ? badges[it.badgeKey] : 0} onClick={onNavigate} />
          ))}
        </div>
      ))}
    </nav>
  )
}

function NavRow({ item, count, onClick }: { item: NavItem; count: number; onClick?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors',
          isActive ? 'bg-primary-soft text-primary-soft-fg' : 'text-fg-muted hover:bg-bg-muted hover:text-fg',
        )
      }
    >
      <item.icon className="size-[17px] shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {count > 0 && (
        <span className="tnum rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-[18px] text-primary-fg">{count}</span>
      )}
    </NavLink>
  )
}

export function AppShell() {
  const me = useMe()!
  const nav = useNavigate()
  const loc = useLocation()
  const { resolved, setMode } = useTheme()
  const signIn = useStore((s) => s.signIn)
  const signOut = useStore((s) => s.signOut)
  const reset = useStore((s) => s.resetDemo)
  const users = useStore((s) => s.users)
  const toast = useToast()
  const [drawer, setDrawer] = React.useState(false)
  const [palette, setPalette] = React.useState(false)
  const isStaff = me.role !== 'requester'

  React.useEffect(() => setDrawer(false), [loc.pathname])
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  // a new page starts at the top, like a real navigation
  React.useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-pop">Skip to content</a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-14 items-center border-b border-border px-4"><Brand /></div>
        <SidebarNav />
        <div className="border-t border-border p-3">
          <div className="rounded-lg bg-surface-sunken px-3 py-2.5 text-[12px] leading-relaxed text-fg-muted">
            <p className="font-semibold text-fg">Demo workspace</p>
            Mock data lives in your browser — changes are real but private to you.
          </div>
        </div>
      </aside>

      <D.Root open={drawer} onOpenChange={setDrawer}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-[60] bg-overlay/55 backdrop-blur-[2px] animate-fade-in lg:hidden" />
          <D.Content aria-describedby={undefined} className="fixed inset-y-0 left-0 z-[61] flex w-[280px] max-w-[86vw] flex-col bg-surface shadow-pop lg:hidden">
            <D.Title className="sr-only">Navigation</D.Title>
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <Brand />
              <D.Close asChild><Button variant="ghost" size="iconSm" aria-label="Close menu"><X /></Button></D.Close>
            </div>
            <SidebarNav onNavigate={() => setDrawer(false)} />
          </D.Content>
        </D.Portal>
      </D.Root>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-surface/90 px-3 backdrop-blur sm:px-5">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><MenuIcon /></Button>
          <button
            onClick={() => setPalette(true)}
            className="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-border bg-surface-sunken px-3 text-left text-[13px] text-fg-subtle transition-colors hover:border-border-strong sm:max-w-md sm:flex-none sm:basis-[420px]"
          >
            <Search className="size-4 shrink-0" />
            <span className="flex-1 truncate">{isStaff ? 'Search tickets, assets, articles…' : 'Search requests and help…'}</span>
            <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
          </button>
          <div className="flex-1" />
          <Button variant="primary" size="md" onClick={() => nav('/new')} className="hidden sm:inline-flex">
            <Plus /> {isStaff ? 'New ticket' : 'New request'}
          </Button>
          <Button variant="primary" size="icon" onClick={() => nav('/new')} className="sm:hidden" aria-label="New request"><Plus /></Button>
          <Notifications />
          <Button variant="ghost" size="icon" onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme" className="hidden sm:inline-flex">
            {resolved === 'dark' ? <Sun /> : <Moon />}
          </Button>
          <Menu>
            <MenuTrigger asChild>
              <button className="ml-0.5 flex items-center gap-2 rounded-lg p-1 hover:bg-bg-muted" aria-label="Account menu">
                <Avatar name={me.name} className="size-8 text-[11px]" />
                <span className="hidden text-left leading-tight md:block">
                  <span className="block text-[13px] font-medium text-fg">{me.name}</span>
                  <span className="block text-[11px] text-fg-subtle">{ROLE_LABEL[me.role]}</span>
                </span>
              </button>
            </MenuTrigger>
            <MenuContent className="w-[272px]">
              <div className="px-2.5 py-2">
                <p className="text-[13px] font-semibold">{me.name}</p>
                <p className="text-[12px] text-fg-muted">{me.title}</p>
              </div>
              <MenuSeparator />
              <MenuLabel>Switch demo persona</MenuLabel>
              {PERSONAS.map((id) => {
                const u = users.find((x) => x.id === id)!
                return (
                  <MenuItem key={id} icon={<ArrowLeftRight />} onSelect={() => { signIn(id); nav('/') }} className={me.id === id ? 'bg-primary-soft/60' : ''}>
                    <span className="flex w-full items-center justify-between gap-2">
                      <span>{u.name}</span>
                      <Badge size="sm" tone={u.role === 'manager' ? 'purple' : u.role === 'agent' ? 'accent' : 'neutral'}>{ROLE_LABEL[u.role]}</Badge>
                    </span>
                  </MenuItem>
                )
              })}
              <MenuSeparator />
              <MenuItem icon={<RotateCcw />} onSelect={() => { reset(); toast.push({ tone: 'success', title: 'Demo data reset', description: 'Fresh tickets, assets and bookings loaded.' }) }}>Reset demo data</MenuItem>
              <MenuItem icon={<LogOut />} onSelect={() => { signOut(); nav('/login') }}>Sign out</MenuItem>
            </MenuContent>
          </Menu>
        </header>

        <main id="main" className="mx-auto w-full max-w-[1440px] px-3 py-5 sm:px-6 sm:py-7">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={palette} onOpenChange={setPalette} />
    </div>
  )
}
