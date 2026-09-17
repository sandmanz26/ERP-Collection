import * as React from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, LogOut, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, RotateCcw, Search, Settings, ShieldCheck,
  ShieldHalf, TriangleAlert, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV } from './nav'
import { CommandPalette } from './CommandPalette'
import { TableStyleSwitcher } from '@/components/data-table/TableStyleSwitcher'
import { Button } from '@/components/ui/button'
import { Kbd, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useErp } from '@/store/useErp'
import { useAuth, useCurrentUser } from '@/store/useAuth'
import { primaryRoleName, rolesOf, useCan } from '@/lib/access'
import { buildAlerts, daysUntil, fulfilment, isLiveProject, stockStatus } from '@/lib/domain'
import { invoiceState } from '@/lib/finance'

export function AppShell() {
  const [collapsed, setCollapsed] = React.useState(() => localStorage.getItem('tg-sidebar') === '1')
  /* Below a laptop width there is no room for a 238px rail of labels, so the
     sidebar falls back to icons whatever the stored preference says. */
  const [narrow, setNarrow] = React.useState(() => window.matchMedia('(max-width: 1023px)').matches)
  /* On a phone even a 62px rail is a tenth of the screen, and a tooltip is not
     something a finger can ask for. There the sidebar leaves the layout
     entirely and comes back as a drawer over it, with its labels. */
  const [phone, setPhone] = React.useState(() => window.matchMedia('(max-width: 767px)').matches)
  const [drawer, setDrawer] = React.useState(false)
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const store = useErp()
  const signOut = useAuth((s) => s.signOut)
  const user = useCurrentUser()
  const can = useCan()
  /* The menu shows what the account may open. The route guard enforces it; this
     only saves people from clicking into a page that would refuse them. */
  const visibleNav = React.useMemo(
    () => NAV.map((group) => ({ ...group, items: group.items.filter((i) => can(i.permission)) })).filter((g) => g.items.length > 0),
    [can],
  )

  /* `/mr/my` sits under `/mr`, so without this both light up at once. A link
     matches exactly whenever another link lives beneath it. */
  const exactPaths = React.useMemo(() => {
    const all = NAV.flatMap((g) => g.items.map((i) => i.to))
    return new Set(all.filter((to) => all.some((other) => other !== to && other.startsWith(`${to}/`))))
  }, [])

  const initials = (user?.fullName ?? 'Tata Gemilang')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  React.useEffect(() => {
    localStorage.setItem('tg-sidebar', collapsed ? '1' : '0')
  }, [collapsed])

  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const onChange = (e: MediaQueryListEvent) => {
      setPhone(e.matches)
      if (!e.matches) setDrawer(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  /* Following a link is the whole point of the drawer, so it closes itself. */
  React.useEffect(() => setDrawer(false), [location.pathname])

  React.useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  /* On a phone the drawer always shows labels; the icon rail is a desktop idea. */
  const rail = !phone && (collapsed || narrow)

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

  const alerts = React.useMemo(
    () =>
      buildAlerts({
        projects: store.projects, clients: store.clients, buildings: store.buildings,
        positions: store.positions, items: store.items, stock: store.stock, warehouses: store.warehouses,
      }),
    [store.projects, store.clients, store.buildings, store.positions, store.items, store.stock, store.warehouses],
  )
  const critical = alerts.filter((a) => a.severity === 'CRITICAL').length

  const badges: Record<string, number> = {
    gaps: store.projects.filter((p) => isLiveProject(p) && fulfilment(p).gap > 0).length,
    approvals: store.projects.filter((p) => p.status === 'PENDING_APPROVAL').length,
    expiring: store.projects.filter((p) => isLiveProject(p) && daysUntil(p.periodEnd) <= 60 && daysUntil(p.periodEnd) >= 0).length,
    lowStock: store.stock.filter((s) => {
      const status = stockStatus(s, store.items.find((i) => i.id === s.itemId))
      return status === 'LOW' || status === 'OUT_OF_STOCK'
    }).length,
    overdueInvoices: store.invoices.filter((i) => invoiceState(i, store.clientReceipts).overdue).length,
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      {/* The drawer's backdrop. Only ever on a phone, and only while it is open. */}
      {phone && drawer && (
        <div
          className="fixed inset-0 z-40 bg-fg/40 backdrop-blur-[1px] animate-fade-in"
          onClick={() => setDrawer(false)}
          aria-hidden
        />
      )}

      {/* ---------------- sidebar ---------------- */}
      <aside
        className={cn(
          'z-20 flex shrink-0 flex-col border-r border-border bg-surface',
          phone
            ? cn(
                'fixed inset-y-0 left-0 z-50 w-[272px] shadow-pop transition-transform duration-200 ease-out',
                drawer ? 'translate-x-0' : '-translate-x-full',
              )
            : cn('relative transition-[width] duration-200 ease-out', rail ? 'w-[62px]' : 'w-[238px]'),
        )}
        aria-hidden={phone && !drawer}
      >
        <div className={cn('flex h-14 items-center gap-2.5 border-b border-border px-3.5', rail && 'justify-center px-0')}>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-fg shadow-[inset_0_1px_0_0_rgb(255_255_255/0.2)]">
            <ShieldHalf className="size-[17px]" />
          </span>
          {!rail && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold leading-tight tracking-[-0.01em] text-fg">Tata Gemilang</p>
              <p className="truncate text-[11px] leading-tight text-fg-subtle">Outsourcing Management</p>
            </div>
          )}
          {phone && (
            <Button variant="ghost" size="icon" onClick={() => setDrawer(false)} aria-label="Close the menu">
              <X />
            </Button>
          )}
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3">
          {visibleNav.map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              {!rail && (
                <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">{group.label}</p>
              )}
              {rail && <Separator className="mx-auto mb-2 w-6" />}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const count = item.badgeKey ? badges[item.badgeKey] : 0
                  const link = (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/' || exactPaths.has(item.to)}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-colors',
                          phone && 'py-2.5 text-[14px]',
                          rail && 'justify-center px-0 py-2',
                          isActive ? 'bg-primary-soft text-primary-soft-fg' : 'text-fg-muted hover:bg-bg-muted hover:text-fg',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && !rail && (
                            <span className="absolute -left-2 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                          )}
                          <item.icon className={cn('size-[17px] shrink-0', isActive && 'text-primary')} />
                          {!rail && <span className="flex-1 truncate">{item.label}</span>}
                          {!rail && count > 0 && (
                            <span
                              className={cn(
                                'tnum rounded px-1.5 py-0.5 text-[10.5px] font-semibold',
                                item.badgeKey === 'gaps' || item.badgeKey === 'lowStock'
                                  ? 'bg-warning-soft text-warning-soft-fg'
                                  : 'bg-neutral-soft text-neutral-soft-fg',
                              )}
                            >
                              {count}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  )
                  return rail ? (
                    <Tooltip key={item.to} content={item.label} side="right">
                      <div>{link}</div>
                    </Tooltip>
                  ) : (
                    link
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={cn('border-t border-border p-2', rail && 'flex justify-center', phone && 'hidden')}>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg',
              rail && 'w-auto justify-center px-2',
            )}
          >
            {rail ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!rail && (
              <>
                <span className="flex-1 text-left">Collapse</span>
                <Kbd>⌘\</Kbd>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ---------------- main ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 sm:gap-3 sm:px-4">
          {phone && (
            <Button variant="ghost" size="icon" onClick={() => setDrawer(true)} aria-label="Open the menu">
              <MenuIcon />
            </Button>
          )}

          {/* A search field wide enough to read its own placeholder does not fit
              next to the bell on a phone, so there it is the icon alone. */}
          {phone ? (
            <Button variant="ghost" size="icon" onClick={() => setPaletteOpen(true)} aria-label="Search">
              <Search />
            </Button>
          ) : (
            <button
              onClick={() => setPaletteOpen(true)}
              className="group flex h-9 w-full max-w-sm items-center gap-2.5 rounded-lg border border-border-strong/70 bg-bg-muted/60 px-3 text-left text-[13px] text-fg-subtle transition-colors hover:border-border-strong hover:bg-bg-muted"
            >
              <Search className="size-4" />
              <span className="flex-1 truncate">Search clients, projects, items…</span>
              <Kbd className="bg-surface">⌘K</Kbd>
            </button>
          )}

          <div className="flex-1" />

          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label={`Attention: ${alerts.length} items`}>
                <Bell />
                {critical > 0 && (
                  <span className="absolute right-1.5 top-1.5 grid size-[15px] place-items-center rounded-full bg-danger text-[9.5px] font-bold text-white ring-2 ring-surface">
                    {critical}
                  </span>
                )}
              </Button>
            </MenuTrigger>
            <MenuContent className="w-[min(380px,calc(100vw-1.5rem))]">
              <MenuLabel>Needs attention</MenuLabel>
              {alerts.length === 0 && (
                <p className="px-3 py-6 text-center text-[12.5px] text-fg-subtle">Every post is filled and every level is healthy.</p>
              )}
              <div className="scrollbar-thin max-h-80 overflow-y-auto">
                {alerts.slice(0, 12).map((a) => (
                  <Link key={a.id} to={a.link} className="flex gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-bg-muted">
                    <TriangleAlert
                      className={cn(
                        'mt-0.5 size-4 shrink-0',
                        a.severity === 'CRITICAL' ? 'text-danger' : a.severity === 'HIGH' ? 'text-warning' : 'text-fg-subtle',
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-medium text-fg">{a.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-fg-muted">{a.detail}</span>
                    </span>
                  </Link>
                ))}
              </div>
              <MenuSeparator />
              <MenuItem onSelect={() => navigate('/')}>Open the dashboard</MenuItem>
            </MenuContent>
          </Menu>

          <Separator vertical className="hidden h-6 sm:block" />

          <Menu>
            <MenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-1.5 transition-colors hover:bg-bg-muted"
                aria-label="Account menu"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-[11.5px] font-semibold text-primary-soft-fg">
                  {initials}
                </span>
                <div className="hidden text-left leading-tight lg:block">
                  <p className="text-[12.5px] font-medium text-fg">{user?.fullName ?? 'Signed out'}</p>
                  <p className="text-[11px] text-fg-subtle">{user?.jobTitle ?? '—'}</p>
                </div>
              </button>
            </MenuTrigger>
            <MenuContent align="end" className="w-64">
              <div className="px-2 py-1.5">
                <p className="truncate text-[13px] font-medium text-fg">{user?.fullName}</p>
                <p className="truncate text-[11.5px] text-fg-subtle">{user?.email}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone="primary" size="sm">{primaryRoleName(user, store.roles)}</Badge>
                  {rolesOf(user, store.roles).length > 1 && (
                    <Badge tone="neutral" size="sm">+{rolesOf(user, store.roles).length - 1} role</Badge>
                  )}
                  {user?.branchCode && <Badge tone="outline" size="sm">{user.branchCode}</Badge>}
                  {user?.twoFactorEnabled && (
                    <Badge tone="success" size="sm">
                      <ShieldCheck className="size-3" />
                      2FA
                    </Badge>
                  )}
                </div>
              </div>
              <MenuSeparator />
              {can('settings.view') && (
                <MenuItem icon={<Settings />} onSelect={() => navigate('/settings')}>
                  Company & account settings
                </MenuItem>
              )}
              <MenuItem
                icon={<RotateCcw />}
                onSelect={() => {
                  store.resetDemoData()
                  toast.push({ tone: 'success', title: 'Demo data restored', description: 'Every module is back to the seeded dataset.' })
                }}
              >
                Reset demo data
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                icon={<LogOut />}
                danger
                onSelect={() => {
                  signOut()
                  navigate('/login', { replace: true })
                }}
              >
                Sign out
              </MenuItem>
            </MenuContent>
          </Menu>
        </header>

        <main key={location.pathname} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[1720px] flex-col px-4 py-4 sm:px-5 sm:py-5 lg:px-7">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <TableStyleSwitcher />
    </div>
  )
}
