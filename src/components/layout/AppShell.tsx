import * as React from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, ChevronsLeft, Clock3, Command, Lightbulb, LogOut, Monitor, Moon,
  ChevronRight, PanelLeft, PanelLeftClose, PanelLeftOpen, RotateCcw, Search, ShieldCheck, Sun, TreePine, TriangleAlert,
  UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV } from './nav'
import { CommandPalette } from './CommandPalette'
import { TourGuide, startTour, useTourState } from '@/components/onboarding/Tour'
import { Button } from '@/components/ui/button'
import { Kbd, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { Badge } from '@/components/ui/badge'
import { claimIsOpen, deliveryIsOpen, quoteIsLive } from '@/lib/commerce'
import { maintenanceIsOpen, maintenanceStatusNow, subcontractIsOpen } from '@/lib/operations'
import { conversionIsOpen, remnantState } from '@/lib/conversion'
import { Segmented } from '@/components/ui/checkbox'
import { useTheme } from '@/hooks/useTheme'
import { useMfg } from '@/store/useMfg'
import { useAuth, useCurrentUser } from '@/store/useAuth'
import { roleLabel, workOrderIsOpen } from '@/data/reference'
import { useCapacityLoad, useExceptions, useMrpLines } from '@/hooks/useDerived'
import { shipmentIsOpen } from '@/data/reference'
import { pibGate } from '@/lib/importing'
import { fmtDateTime } from '@/lib/format'
import { useToast } from '@/components/ui/toast'

export function AppShell() {
  const [collapsed, setCollapsed] = React.useState(() => localStorage.getItem('mf-sidebar') === '1')
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const { mode, setMode } = useTheme()
  const location = useLocation()
  const store = useMfg()
  const toast = useToast()
  const navigate = useNavigate()
  const signOut = useAuth((s) => s.signOut)
  const resetTours = useTourState((s) => s.reset)
  const user = useCurrentUser()
  const initials = (user?.fullName ?? 'Wanakarya User')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  React.useEffect(() => {
    localStorage.setItem('mf-sidebar', collapsed ? '1' : '0')
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

  /* below lg the rail is a drawer, not a column — otherwise it eats a phone screen */
  const [mobileOpen, setMobileOpen] = React.useState(false)
  React.useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const exceptions = useExceptions()
  const mrpLines = useMrpLines()
  const loads = useCapacityLoad()
  const critical = exceptions.filter((e) => e.severity === 'CRITICAL').length

  const badges: Record<string, number> = {
    exceptions: critical,
    shortages: mrpLines.filter((l) => l.slackDays < 0 && l.grossRequirement > 0).length,
    workOrders: store.workOrders.filter((w) => workOrderIsOpen(w.status)).length,
    imports: store.shipments.filter((s) => shipmentIsOpen(s.status)).length,
    customs: store.shipments.filter((s) => ['ARRIVED', 'PIB_SUBMITTED', 'LANE_ASSIGNED'].includes(s.status) && !pibGate(s, store.items).ok).length,
    qc: store.qcRecords.filter((q) => q.disposition === 'PENDING').length,
    kiln: store.kilnBatches.filter((b) => b.status === 'FAILED' || b.status === 'DRYING').length,
    orders: store.salesOrders.filter((o) => o.status === 'PENDING_CONFIRMATION' || o.status === 'CONFIRMED').length,
    overdue: store.invoices.filter((i) => i.status === 'OVERDUE').length,
    capacity: loads.filter((l) => l.utilisation > 100).length,
    quotations: store.quotations.filter((q) => quoteIsLive(q.status)).length,
    deliveries: store.deliveries.filter((dv) => deliveryIsOpen(dv.status)).length,
    claims: store.claims.filter((c) => claimIsOpen(c.status)).length,
    requisitions: store.requisitions.filter((r) => r.status === 'SUBMITTED' || r.status === 'PENDING_APPROVAL').length,
    maintenance: store.maintenanceOrders.filter((m) => maintenanceIsOpen(m) && ['OVERDUE', 'IN_PROGRESS', 'WAITING_PARTS'].includes(maintenanceStatusNow(m))).length,
    subcontract: store.subcontractOrders.filter((o) => subcontractIsOpen(o.status)).length,
    payments: store.payments.filter((p) => p.status === 'PENDING_APPROVAL' || p.status === 'BOUNCED').length,
    conversion: store.conversionOrders.filter((o) => conversionIsOpen(o.status)).length,
    remnants: store.remnants.filter((r) => remnantState(r).ageing).length,
  }

  /* the rail says where you can go; the breadcrumb says where you are */
  const crumb = React.useMemo(() => {
    for (const group of NAV) {
      const exact = group.items.find((i) => i.to === location.pathname)
      if (exact) return { group: group.label, page: exact.label }
    }
    /* a detail route inherits its list's identity */
    for (const group of NAV) {
      const parent = group.items
        .filter((i) => i.to !== '/')
        .find((i) => location.pathname.startsWith(`${i.to}/`))
      if (parent) return { group: group.label, page: parent.label }
    }
    return { group: 'Wanakarya', page: 'Control Tower' }
  }, [location.pathname])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      {/* ---------------- sidebar ---------------- */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-[hsl(24_20%_8%/0.55)] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[244px] flex-col bg-sidebar text-sidebar-fg shadow-[8px_0_32px_-12px_hsl(24_20%_8%/0.45)] transition-transform duration-200 ease-out',
          'lg:relative lg:z-20 lg:shrink-0 lg:translate-x-0 lg:shadow-none lg:transition-[width]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'lg:w-[64px]' : 'lg:w-[244px]',
        )}
      >
        <div className={cn('flex h-16 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-sidebar-accent text-[hsl(22_40%_14%)] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.28)]">
            <TreePine className="size-[19px]" />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold leading-tight tracking-[-0.015em]">Wanakarya</p>
              <p className="truncate text-[10.5px] font-medium uppercase leading-tight tracking-[0.08em] text-sidebar-muted">
                Production &amp; Import
              </p>
            </div>
          )}
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-2.5 pb-2">
          {NAV.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              {!collapsed ? (
                /* sticky, because at eight groups and thirty-six items you lose
                   track of which section you are scrolling through otherwise */
                <p className="sticky top-0 z-10 -mx-2.5 mb-1.5 bg-sidebar px-5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted/80">
                  {group.label}
                </p>
              ) : (
                <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" />
              )}
              <div className="space-y-[3px]">
                {group.items.map((item) => {
                  const count = item.badgeKey ? badges[item.badgeKey] : 0
                  const loud = ['overdue', 'customs', 'exceptions', 'claims', 'maintenance', 'remnants'].includes(item.badgeKey ?? '')
                  const link = (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-2.5 rounded-[9px] px-2.5 py-[8px] text-[13px] font-medium transition-colors',
                          collapsed && 'justify-center px-0 py-2.5',
                          isActive
                            ? 'bg-sidebar-active text-sidebar-fg'
                            : 'text-sidebar-fg/62 hover:bg-sidebar-hover hover:text-sidebar-fg',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span
                              className={cn(
                                'absolute top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-sidebar-accent',
                                collapsed ? 'left-0' : '-left-2.5',
                              )}
                            />
                          )}
                          <item.icon className={cn('size-[17px] shrink-0', isActive && 'text-sidebar-accent')} />
                          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                          {!collapsed && count > 0 && (
                            <span
                              className={cn(
                                'tnum rounded-full px-1.5 py-[1px] text-[10.5px] font-semibold',
                                loud ? 'bg-danger text-white' : 'bg-sidebar-fg/12 text-sidebar-fg/80',
                              )}
                            >
                              {count}
                            </span>
                          )}
                          {collapsed && count > 0 && (
                            <span
                              className={cn(
                                'absolute right-2 top-1.5 size-[7px] rounded-full ring-2 ring-sidebar',
                                loud ? 'bg-danger' : 'bg-sidebar-accent',
                              )}
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  )
                  return collapsed ? (
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

        <div className={cn('border-t border-sidebar-border p-2.5', collapsed && 'flex justify-center')}>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[12.5px] font-medium text-sidebar-fg/60 transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg',
              collapsed && 'w-auto justify-center px-2',
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Collapse</span>
                <Kbd className="border-sidebar-border bg-sidebar-hover text-sidebar-fg/70 shadow-none">⌘\</Kbd>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ---------------- main ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-bg px-4 sm:px-5 lg:px-7">
          <Button
            variant="ghost" size="icon" className="-ml-1 shrink-0 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <PanelLeft />
          </Button>

          {/* where you are, so the rail is not the only thing saying it */}
          <div className="min-w-0 flex-1">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12.5px]">
              <span className="truncate font-medium uppercase tracking-[0.07em] text-fg-subtle">{crumb.group}</span>
              <ChevronRight className="size-3 shrink-0 text-fg-subtle" />
              <span className="truncate font-semibold text-fg">{crumb.page}</span>
            </nav>
          </div>

          <button
            onClick={() => setPaletteOpen(true)}
            className="group hidden h-9 w-full max-w-xs items-center gap-2.5 rounded-full border border-border bg-surface px-3.5 text-left text-[12.5px] text-fg-subtle shadow-card transition-colors hover:border-border-strong md:flex"
          >
            <Search className="size-4" />
            <span className="flex-1 truncate">Search…</span>
            <Kbd className="bg-bg-muted">⌘K</Kbd>
          </button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setPaletteOpen(true)} aria-label="Search">
            <Search />
          </Button>

          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Exceptions">
                <Bell />
                {critical > 0 && (
                  <span className="absolute right-1.5 top-1.5 grid size-[15px] place-items-center rounded-full bg-danger text-[9.5px] font-bold text-white ring-2 ring-surface">
                    {critical}
                  </span>
                )}
              </Button>
            </MenuTrigger>
            <MenuContent className="w-[360px]">
              <MenuLabel>Live exceptions</MenuLabel>
              {exceptions.length === 0 && <p className="px-3 py-6 text-center text-[12.5px] text-fg-subtle">Nothing needs attention.</p>}
              <div className="scrollbar-thin max-h-80 overflow-y-auto">
                {exceptions.slice(0, 12).map((e) => (
                  <Link
                    key={e.id}
                    to={e.link ?? '/'}
                    className="flex gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-bg-muted"
                  >
                    <TriangleAlert
                      className={cn(
                        'mt-0.5 size-4 shrink-0',
                        e.severity === 'CRITICAL' ? 'text-danger' : e.severity === 'HIGH' ? 'text-warning' : 'text-fg-subtle',
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-medium text-fg">{e.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-fg-muted">{e.detail}</span>
                    </span>
                  </Link>
                ))}
              </div>
              <MenuSeparator />
              <MenuItem onSelect={() => (window.location.hash = '')}>
                <Link to="/" className="w-full">
                  Open the control tower
                </Link>
              </MenuItem>
            </MenuContent>
          </Menu>

          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Theme">
                {mode === 'dark' ? <Moon /> : mode === 'light' ? <Sun /> : <Monitor />}
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuLabel>Appearance</MenuLabel>
              <div className="px-1.5 py-1">
                <Segmented
                  value={mode}
                  onChange={(v) => setMode(v)}
                  options={[
                    { value: 'light', label: 'Light', icon: <Sun /> },
                    { value: 'dark', label: 'Dark', icon: <Moon /> },
                    { value: 'system', label: 'Auto', icon: <Monitor /> },
                  ]}
                  className="w-full [&>button]:flex-1"
                />
              </div>
              <MenuSeparator />
              <MenuLabel>Workspace</MenuLabel>
              <MenuItem
                icon={<RotateCcw />}
                onSelect={() => {
                  store.reseed()
                  toast.push({ tone: 'success', title: 'Demo data restored', description: 'All modules reset to the seeded dataset.' })
                }}
              >
                Reset demo data
              </MenuItem>
            </MenuContent>
          </Menu>

          <Separator vertical className="h-6" />

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
                  <Badge tone="primary" size="sm">{user ? roleLabel(user.role) : '—'}</Badge>
                  {user?.twoFactorEnabled && (
                    <Badge tone="success" size="sm">
                      <ShieldCheck className="size-3" />
                      2FA
                    </Badge>
                  )}
                </div>
              </div>
              <MenuSeparator />
              <MenuItem icon={<Lightbulb />} onSelect={() => startTour()}>
                Show me around this page
              </MenuItem>
              <MenuItem
                icon={<RotateCcw />}
                onSelect={() => {
                  resetTours()
                  toast.push({
                    tone: 'success',
                    title: 'Tours reset',
                    description: 'Each page will introduce itself again the next time you open it.',
                  })
                }}
              >
                Replay every tour
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={<UserRound />} onSelect={() => navigate('/settings')}>
                Company & account settings
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
          <div className="mx-auto flex min-h-full w-full max-w-[1560px] flex-col px-5 py-5 lg:px-7">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <TourGuide />
    </div>
  )
}

export function LastSync() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
      <Clock3 className="size-3.5" />
      Synced {fmtDateTime(new Date().toISOString())}
    </span>
  )
}

export { ChevronsLeft, Command, Badge }
