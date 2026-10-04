import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, Check, Lightbulb, LogOut, Menu as MenuIcon, Moon, RotateCcw, Search, Settings as SettingsIcon, Sun,
  Monitor, TriangleAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV } from './nav'
import { CommandPalette } from './CommandPalette'
import { TourGuide, startTour, useTourState } from '@/components/onboarding/Tour'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { useToast } from '@/components/ui/toast'
import { useTheme } from '@/hooks/useTheme'
import { useErp } from '@/store/useErp'
import { useAuth, useCurrentUser } from '@/store/useAuth'
import { roleLabel } from '@/data/reference'
import { fmtDateTime } from '@/lib/format'
import type { Exception } from '@/lib/exceptions'

/**
 * The classic shell — a Bootstrap-3-era admin layout: a coloured top bar with
 * the brand block on its left, a dark sidebar with a user panel and shouting
 * group headings, and a pale content well with a plain footer.
 *
 * It is a different structure rather than a recolour, which is why it is its
 * own component. The navigation, the badges and the palette are the same ones
 * the modern shell uses.
 */
export function ClassicShell({
  collapsed,
  setCollapsed,
  openPalette,
  badges,
  exceptions,
  critical,
  topExceptions,
  paletteOpen,
  setPaletteOpen,
}: {
  collapsed: boolean
  setCollapsed: (fn: (v: boolean) => boolean) => void
  openPalette: () => void
  badges: Record<string, number>
  exceptions: Exception[]
  critical: number
  topExceptions: Exception[]
  paletteOpen: boolean
  setPaletteOpen: (v: boolean) => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const store = useErp()
  const user = useCurrentUser()
  const signOut = useAuth((s) => s.signOut)
  const resetTours = useTourState((s) => s.reset)
  const { mode, setMode } = useTheme()

  const initials = (user?.fullName ?? 'KU')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className={cn('cl-wrapper', collapsed && 'cl-collapsed')}>
      {/* ---------------- top bar ---------------- */}
      <header className="cl-header">
        <Link to="/" className="cl-logo">
          <span className="cl-logo-mini">
            <b>K</b>F
          </span>
          <span className="cl-logo-lg">
            <b>Kriyanusa</b> ERP
          </span>
        </Link>

        <nav className="cl-navbar">
          <button className="cl-toggle" onClick={() => setCollapsed((v) => !v)} aria-label="Toggle navigation">
            <MenuIcon />
          </button>

          <button className="cl-search" onClick={openPalette} data-tour="palette">
            <Search />
            <span>Search orders, buyers, items…</span>
          </button>

          <div className="cl-nav-right">
            <Menu>
              <MenuTrigger asChild>
                <button className="cl-nav-btn" data-tour="alerts" aria-label="Notifications">
                  <Bell />
                  {exceptions.length > 0 && <span className="cl-count cl-count-warning">{critical || exceptions.length}</span>}
                </button>
              </MenuTrigger>
              <MenuContent align="end" className="w-[380px]">
                <MenuLabel>
                  You have {exceptions.length} notification{exceptions.length === 1 ? '' : 's'} · {critical} critical
                </MenuLabel>
                <MenuSeparator />
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
                <MenuItem onSelect={() => navigate('/')}>View all on the control tower</MenuItem>
              </MenuContent>
            </Menu>

            <Menu>
              <MenuTrigger asChild>
                <button className="cl-nav-btn" aria-label="Theme">
                  {mode === 'dark' ? <Moon /> : mode === 'light' ? <Sun /> : <Monitor />}
                </button>
              </MenuTrigger>
              <MenuContent align="end" className="w-44">
                <MenuLabel>Colour scheme</MenuLabel>
                <MenuSeparator />
                {(
                  [
                    ['light', 'Light', <Sun key="l" className="size-4" />],
                    ['dark', 'Dark', <Moon key="d" className="size-4" />],
                    ['system', 'Auto', <Monitor key="a" className="size-4" />],
                  ] as const
                ).map(([value, label, icon]) => (
                  <MenuItem key={value} onSelect={() => setMode(value)}>
                    {icon} {label} {mode === value && <Check className="ml-auto size-4" />}
                  </MenuItem>
                ))}
              </MenuContent>
            </Menu>

            <Menu>
              <MenuTrigger asChild>
                <button className="cl-nav-btn cl-user-btn">
                  <span className="cl-avatar cl-avatar-sm">{initials}</span>
                  <span className="cl-user-name">{user?.fullName}</span>
                </button>
              </MenuTrigger>
              <MenuContent align="end" className="w-64">
                <MenuLabel>{user?.email}</MenuLabel>
                <MenuSeparator />
                <MenuItem onSelect={() => navigate('/settings')}>
                  <SettingsIcon className="size-4" /> Settings & interface
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
                    toast.push({ tone: 'success', title: 'Demo data reset', description: 'The seeded operating book is back as it shipped.' })
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
        </nav>
      </header>

      {/* ---------------- sidebar ---------------- */}
      <aside className="cl-sidebar">
        <div className="cl-userpanel">
          <span className="cl-avatar">{initials}</span>
          <div className="cl-userpanel-text">
            <p>{user?.fullName}</p>
            <span>
              <i /> {roleLabel(user?.role ?? 'VIEWER')}
            </span>
          </div>
        </div>

        <ul className="cl-menu">
          {NAV.map((group) => (
            <li key={group.label} className="cl-menu-group">
              <p className="cl-menu-heading">{group.label}</p>
              <ul>
                {group.items.map((item) => {
                  const count = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0
                  return (
                    <li key={item.to}>
                      <NavLink to={item.to} end={item.end} title={item.label} className={({ isActive }) => cn('cl-menu-link', isActive && 'active')}>
                        <item.icon />
                        <span className="cl-menu-label">{item.label}</span>
                        {count > 0 && (
                          <span className={cn('cl-pill', item.badgeKey === 'exceptions' ? 'cl-pill-danger' : 'cl-pill-muted')}>{count}</span>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      </aside>

      {/* ---------------- content ---------------- */}
      <div className="cl-content-wrapper">
        <main key={location.pathname} className="cl-content">
          <Outlet />
        </main>
        <footer className="cl-footer">
          <span className="cl-footer-right">Front-end demonstration build · no backend · last touched {fmtDateTime(store.activity[0]?.at ?? new Date().toISOString())}</span>
          <strong>
            Copyright © {new Date().getFullYear()} {store.company.legalName}.
          </strong>{' '}
          All rights reserved.
        </footer>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <TourGuide />
    </div>
  )
}
