import * as React from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, Command, LogOut, Monitor, Moon, PanelLeftClose, PanelLeftOpen, RotateCcw, Search, Sun,
  TriangleAlert, UserRound, Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_ICON, NAV } from './nav'
import { CommandPalette } from './CommandPalette'
import { TourGuide, startTour, useTourState } from '@/components/onboarding/Tour'
import { Kbd, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { Badge } from '@/components/ui/badge'
import { Segmented } from '@/components/ui/checkbox'
import { useTheme } from '@/hooks/useTheme'
import { useErp } from '@/store/useErp'
import { useAuth, useCurrentUser } from '@/store/useAuth'
import { useExceptions } from '@/hooks/useExceptions'
import { roleLabel } from '@/data/reference'
import { useToast } from '@/components/ui/toast'
import { fmtDateTime } from '@/lib/format'

export function AppShell() {
  const [collapsed, setCollapsed] = React.useState(() => localStorage.getItem('kn-sidebar') === '1')
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const { mode, setMode } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const store = useErp()
  const signOut = useAuth((s) => s.signOut)
  const resetTours = useTourState((s) => s.reset)
  const user = useCurrentUser()

  const initials = (user?.fullName ?? 'Kriyanusa User')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  React.useEffect(() => {
    localStorage.setItem('kn-sidebar', collapsed ? '1' : '0')
  }, [collapsed])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        setCollapsed((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const { exceptions, positions } = useExceptions()
  const critical = exceptions.filter((e) => e.severity === 'CRITICAL').length

  const badges: Record<string, number> = {
    exceptions: critical,
    projects: store.projects.filter((p) => p.status === 'WON' && p.stage !== 'CLOSED').length,
    inquiries: store.projects.filter((p) => p.status === 'OPEN').length,
    budgets: store.budgets.filter((b) => b.status === 'SUBMITTED').length,
    requests: store.requests.filter((r) => r.status === 'SUBMITTED').length,
    orders: store.orders.filter((o) => o.status === 'AWAITING_APPROVAL' || o.status === 'PARTIALLY_RECEIVED').length,
    receipts: store.receipts.filter((g) => g.qcResult === 'FAILED' || g.qcResult === 'PARTIAL').length,
    reorder: positions.filter((p) => p.belowReorder && p.onOrder <= 0).length,
    production: store.workOrders.filter((w) => w.status === 'ON_HOLD' || (w.status !== 'COMPLETED' && new Date(w.dueAt) < new Date())).length,
    shipments: store.shipments.filter((s) => !['SAILED', 'ARRIVED', 'CLOSED'].includes(s.status)).length,
    payables: store.bills.filter((b) => b.status === 'OVERDUE' || b.status === 'DISPUTED').length,
    receivables: store.invoices.filter((i) => i.status === 'OVERDUE').length,
  }

  const topExceptions = exceptions.slice(0, 6)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      {/* ---------------- sidebar ---------------- */}
      <aside
        className={cn(
          'relative z-20 flex shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out',
          collapsed ? 'w-[68px]' : 'w-[256px]',
        )}
      >
        <div className={cn('flex h-16 shrink-0 items-center gap-3 border-b border-border px-4', collapsed && 'justify-center px-0')}>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-fg">
            <BRAND_ICON className="size-[17px]" />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold leading-tight tracking-[-0.01em] text-fg">Kriyanusa</p>
              <p className="truncate text-[11px] leading-tight text-fg-subtle">Export Manufacturing</p>
            </div>
          )}
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-2.5 py-4">
          {NAV.map((group) => (
            <div key={group.label} className="mb-6 last:mb-0">
              {!collapsed && (
                <p className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-fg-subtle">
                  {group.label}
                </p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const count = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0
                  const link = (
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                          collapsed && 'justify-center px-0',
                          isActive
                            ? 'bg-primary-soft text-primary-soft-fg'
                            : 'text-fg-muted hover:bg-neutral-soft hover:text-fg',
                        )
                      }
                    >
                      <item.icon className="size-[16.5px] shrink-0" />
                      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                      {!collapsed && count > 0 && (
                        <Badge tone={item.badgeKey === 'exceptions' ? 'danger' : 'neutral'} size="sm">
                          {count}
                        </Badge>
                      )}
                    </NavLink>
                  )
                  return (
                    <li key={item.to}>
                      {collapsed ? (
                        <Tooltip content={`${item.label}${count ? ` · ${count}` : ''}`} side="right">
                          <span className="block">{link}</span>
                        </Tooltip>
                      ) : (
                        <Tooltip content={item.description ?? item.label} side="right">
                          <span className="block">{link}</span>
                        </Tooltip>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-2">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-[12.5px] font-medium text-fg-muted transition-colors hover:bg-neutral-soft hover:text-fg"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ---------------- main ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-6">
          <button
            onClick={() => setPaletteOpen(true)}
            data-tour="palette"
            className="flex h-9 min-w-0 max-w-sm flex-1 items-center gap-2 rounded-lg border border-border bg-surface-sunken px-3 text-[13px] text-fg-subtle transition-colors hover:border-border-strong hover:text-fg-muted"
          >
            <Search className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left">Search orders, buyers, items, suppliers…</span>
            <Kbd className="hidden sm:inline-flex">
              <Command className="size-3" />K
            </Kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <Menu>
              <MenuTrigger asChild>
                <button
                  data-tour="alerts"
                  className="relative grid size-9 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-neutral-soft hover:text-fg"
                >
                  <Bell className="size-[17px]" />
                  {critical > 0 && (
                    <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-danger text-[9px] font-bold text-white">
                      {critical}
                    </span>
                  )}
                </button>
              </MenuTrigger>
              <MenuContent align="end" className="w-[380px]">
                <MenuLabel>
                  {exceptions.length} open exception{exceptions.length === 1 ? '' : 's'} · {critical} critical
                </MenuLabel>
                <MenuSeparator />
                {topExceptions.length === 0 && (
                  <div className="px-3 py-6 text-center text-[12.5px] text-fg-muted">Nothing is on fire.</div>
                )}
                {topExceptions.map((e) => (
                  <MenuItem key={e.id} onSelect={() => navigate(e.to)}>
                    <TriangleAlert
                      className={cn(
                        'size-4 shrink-0',
                        e.severity === 'CRITICAL' ? 'text-danger' : e.severity === 'HIGH' ? 'text-warning' : 'text-info',
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-medium text-fg">{e.title}</span>
                      <span className="block truncate text-[11.5px] text-fg-muted">{e.area} · {e.entity}</span>
                    </span>
                  </MenuItem>
                ))}
                <MenuSeparator />
                <MenuItem onSelect={() => navigate('/')}>
                  <Search className="size-4" /> Open the control tower
                </MenuItem>
              </MenuContent>
            </Menu>

            <Segmented
              value={mode}
              onChange={(v) => setMode(v)}
              options={[
                { value: 'light', label: 'Light', icon: <Sun /> },
                { value: 'dark', label: 'Dark', icon: <Moon /> },
                { value: 'system', label: 'Auto', icon: <Monitor /> },
              ]}
            />

            <Separator vertical className="mx-1 h-6" />

            <Menu>
              <MenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-neutral-soft">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary-soft-fg">
                    {initials}
                  </span>
                  <span className="hidden min-w-0 text-left md:block">
                    <span className="block truncate text-[12.5px] font-medium leading-tight text-fg">{user?.fullName}</span>
                    <span className="block truncate text-[11px] leading-tight text-fg-subtle">{roleLabel(user?.role ?? 'VIEWER')}</span>
                  </span>
                </button>
              </MenuTrigger>
              <MenuContent align="end" className="w-64">
                <MenuLabel>{user?.email}</MenuLabel>
                <MenuSeparator />
                <MenuItem onSelect={() => navigate('/settings')}>
                  <UserRound className="size-4" /> Company & settings
                </MenuItem>
                <MenuItem
                  onSelect={() => {
                    resetTours()
                    startTour()
                  }}
                >
                  <Lightbulb className="size-4" /> Replay the tour
                </MenuItem>
                <MenuItem
                  onSelect={() => {
                    store.resetDemoData()
                    toast.push({ tone: 'success', title: 'Demo data reset', description: 'The seeded operating book is back exactly as it shipped.' })
                    navigate('/')
                  }}
                >
                  <RotateCcw className="size-4" /> Reset demo data
                </MenuItem>
                <MenuSeparator />
                <MenuItem
                  danger
                  onSelect={() => {
                    signOut()
                    navigate('/login')
                  }}
                >
                  <LogOut className="size-4" /> Sign out
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </header>

        <main key={location.pathname} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-6 py-7 lg:px-10 lg:py-8">
          <Outlet />
          <footer className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[11.5px] text-fg-subtle">
            <span>
              {store.company.legalName} · {store.company.registrationNo} · Front-end demonstration build, no backend
            </span>
            <span>Data last touched {fmtDateTime(store.activity[0]?.at ?? new Date().toISOString())}</span>
          </footer>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <TourGuide />
    </div>
  )
}

export { Link }
