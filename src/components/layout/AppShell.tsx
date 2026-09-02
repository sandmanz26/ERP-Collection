import * as React from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Anchor, Bell, ChevronsLeft, Clock3, Command, Gauge, LayoutList, Lightbulb, LogOut, Monitor, Moon,
  PanelLeftClose, PanelLeftOpen, RotateCcw, Search, ShieldCheck, Sun, TriangleAlert,
  UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV, OPERATOR_NAV } from './nav'
import { CommandPalette } from './CommandPalette'
import { TourGuide, startTour, useTourState } from '@/components/onboarding/Tour'
import { Button } from '@/components/ui/button'
import { Kbd, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { Badge } from '@/components/ui/badge'
import { Segmented } from '@/components/ui/checkbox'
import { useTheme } from '@/hooks/useTheme'
import { useErp } from '@/store/useErp'
import { useAuth, useCurrentUser } from '@/store/useAuth'
import { incidentStatusOpen, roleLabel, stuffingIsOpen } from '@/data/reference'
import { buildExceptions } from '@/lib/analytics'
import { buildPhase2Exceptions, filingReadiness, isQuoteOpen } from '@/lib/analytics2'
import { buildPhase3Exceptions } from '@/lib/services'
import { buildStuffingExceptions, checkStuffing } from '@/lib/stuffing'
import { operatorBoard, operatorJobs } from '@/lib/operator'
import { fmtDateTime } from '@/lib/format'
import { useToast } from '@/components/ui/toast'

export function AppShell() {
  const [collapsed, setCollapsed] = React.useState(() => localStorage.getItem('mf-sidebar') === '1')
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const { mode, setMode } = useTheme()
  const location = useLocation()
  const store = useErp()
  const toast = useToast()
  const navigate = useNavigate()
  const signOut = useAuth((s) => s.signOut)
  const resetTours = useTourState((s) => s.reset)
  const user = useCurrentUser()
  const initials = (user?.fullName ?? 'Meridian User')
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

  const exceptions = React.useMemo(() => {
    const core = buildExceptions({
      projects: store.projects, containers: store.containers, documents: store.documents,
      charges: store.charges, customers: store.customers, invoices: store.invoices,
    })
    const extra = buildPhase2Exceptions({
      quotations: store.quotations, partners: store.partners, milestones: store.milestones,
      receipts: store.receipts, filings: store.filings, projects: store.projects, settings: store.settings,
    })
    const phase3 = buildPhase3Exceptions({
      projects: store.projects, containers: store.containers, documents: store.documents,
      jobServices: store.jobServices, services: store.services, incidents: store.incidents,
      company: store.company,
    })
    const yard = buildStuffingExceptions({
      projects: store.projects, charges: store.charges, stuffingJobs: store.stuffingJobs,
    })
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 } as const
    return [...core, ...extra, ...phase3, ...yard].sort((a, b) => order[a.severity] - order[b.severity])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    store.projects, store.containers, store.documents, store.charges, store.customers, store.invoices,
    store.quotations, store.partners, store.milestones, store.receipts, store.filings, store.settings,
    store.jobServices, store.services, store.incidents, store.company, store.stuffingJobs,
  ])
  const critical = exceptions.filter((e) => e.severity === 'CRITICAL').length

  /* An operator gets the four-phase workspace; everyone else gets the suite.
     Anyone can switch, because a supervisor needs to see what their operators see. */
  const [workspace, setWorkspace] = React.useState<'suite' | 'operator'>(() =>
    (localStorage.getItem('mf-workspace') as 'suite' | 'operator') ?? 'suite',
  )
  React.useEffect(() => {
    if (user?.role === 'OPERATOR') setWorkspace('operator')
  }, [user?.role])
  React.useEffect(() => {
    localStorage.setItem('mf-workspace', workspace)
  }, [workspace])

  const myBoard = React.useMemo(() => {
    const assigned = operatorJobs(store.projects, user)
    const jobs = assigned.length > 0 || user?.role === 'OPERATOR' ? assigned : store.projects.filter((p) => p.status !== 'CANCELLED')
    return operatorBoard(jobs, {
      containers: store.containers, documents: store.documents, charges: store.charges,
      stuffingJobs: store.stuffingJobs, milestones: store.milestones, filings: store.filings,
      jobServices: store.jobServices,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.projects, store.containers, store.documents, store.charges, store.stuffingJobs, store.milestones, store.filings, store.jobServices, user])

  const phaseCount = (key: string) => myBoard.byPhase.find((p) => p.phase.key === key)?.jobs.length ?? 0

  const badges: Record<string, number> = {
    projects: store.projects.filter((p) => p.status === 'ACTIVE').length,
    overdue: store.invoices.filter((i) => i.status === 'OVERDUE').length,
    exceptions: critical,
    quotes: store.quotations.filter(isQuoteOpen).length,
    customs: store.filings.filter((f) => f.status === 'DRAFT' && !filingReadiness(f).canSubmit).length,
    incidents: store.incidents.filter((i) => incidentStatusOpen(i.status)).length,
    stuffing: store.stuffingJobs.filter((j) => stuffingIsOpen(j.status) && checkStuffing(j).blockers.length > 0).length,
    myBlocking: myBoard.blocking,
    myIntake: myBoard.awaitingAcceptance,
    myExecute: phaseCount('EXECUTION'),
    myDocs: myBoard.needsPaperwork.length,
    myClosing: phaseCount('CLOSING'),
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      {/* ---------------- sidebar ---------------- */}
      <aside
        className={cn(
          'relative z-20 flex shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out',
          collapsed ? 'w-[62px]' : 'w-[236px]',
        )}
      >
        <div className={cn('flex h-14 items-center gap-2.5 border-b border-border px-3.5', collapsed && 'justify-center px-0')}>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-fg shadow-[inset_0_1px_0_0_rgb(255_255_255/0.2)]">
            <Anchor className="size-[17px]" />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold leading-tight tracking-[-0.01em] text-fg">Meridian Freight</p>
              <p className="truncate text-[11px] leading-tight text-fg-subtle">Export Operations Suite</p>
            </div>
          )}
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3">
          {(workspace === 'operator' ? OPERATOR_NAV : NAV).map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              {!collapsed && (
                <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">{group.label}</p>
              )}
              {collapsed && <Separator className="mx-auto mb-2 w-6" />}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const count = item.badgeKey ? badges[item.badgeKey] : 0
                  const link = (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-colors',
                          collapsed && 'justify-center px-0 py-2',
                          isActive
                            ? 'bg-primary-soft text-primary-soft-fg'
                            : 'text-fg-muted hover:bg-bg-muted hover:text-fg',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && !collapsed && (
                            <span className="absolute -left-2 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                          )}
                          <item.icon className={cn('size-[17px] shrink-0', isActive && 'text-primary')} />
                          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                          {!collapsed && count > 0 && (
                            <span
                              className={cn(
                                'tnum rounded px-1.5 py-0.5 text-[10.5px] font-semibold',
                                item.badgeKey === 'overdue' || item.badgeKey === 'customs'
                                  ? 'bg-danger-soft text-danger-soft-fg'
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

        <div className={cn('border-t border-border p-2', collapsed && 'flex justify-center')}>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg',
              collapsed && 'w-auto justify-center px-2',
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && (
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
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
          <button
            onClick={() => setPaletteOpen(true)}
            className="group flex h-9 w-full max-w-sm items-center gap-2.5 rounded-lg border border-border-strong/70 bg-bg-muted/60 px-3 text-left text-[13px] text-fg-subtle transition-colors hover:border-border-strong hover:bg-bg-muted"
          >
            <Search className="size-4" />
            <span className="flex-1 truncate">Search jobs, containers, customers…</span>
            <Kbd className="bg-surface">⌘K</Kbd>
          </button>

          <div className="flex-1" />

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
                    to={e.link}
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
                  store.resetDemoData()
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
              <MenuLabel>Workspace view</MenuLabel>
              <div className="px-1.5 py-1">
                <Segmented
                  value={workspace}
                  onChange={(v) => {
                    setWorkspace(v as 'suite' | 'operator')
                    navigate(v === 'operator' ? '/my' : '/')
                  }}
                  options={[
                    { value: 'operator', label: 'Operator', icon: <LayoutList /> },
                    { value: 'suite', label: 'Full suite', icon: <Gauge /> },
                  ]}
                  className="w-full [&>button]:flex-1"
                />
              </div>
              <p className="px-3 pb-1.5 text-[11px] leading-relaxed text-fg-subtle">
                {workspace === 'operator'
                  ? 'Four phases, only your jobs — the view an operator works in.'
                  : 'Every module in the suite, for supervisors and back office.'}
              </p>
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
