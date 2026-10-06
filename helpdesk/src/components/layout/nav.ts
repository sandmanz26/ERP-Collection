import { Armchair, BarChart3, BookOpen, Building2, CalendarClock, CalendarDays, Contact, Cog, Home, Inbox, PlusCircle, Boxes, Truck, Wrench, type LucideIcon } from 'lucide-react'
import type { Role } from '@/data/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badgeKey?: 'unassigned' | 'myOpen' | 'overdueWo'
  keywords?: string
}
export interface NavGroup {
  label?: string
  items: NavItem[]
}

const requester: NavGroup[] = [
  {
    items: [
      { to: '/', label: 'Home', icon: Home, end: true },
      { to: '/new', label: 'New request', icon: PlusCircle, keywords: 'report issue create ticket' },
      { to: '/requests', label: 'My requests', icon: Inbox, badgeKey: 'myOpen', keywords: 'tickets status' },
    ],
  },
  {
    label: 'Workplace',
    items: [
      { to: '/rooms', label: 'Book a room', icon: CalendarDays, keywords: 'meeting reserve' },
      { to: '/visitors', label: 'Visitors', icon: Contact, keywords: 'guest invite pass' },
    ],
  },
  { label: 'Help', items: [{ to: '/help', label: 'Help articles', icon: BookOpen, keywords: 'knowledge base faq how to' }] },
]

const staff = (manager: boolean): NavGroup[] => [
  {
    items: [
      { to: '/', label: 'Dashboard', icon: Home, end: true },
      { to: '/tickets', label: 'Tickets', icon: Inbox, badgeKey: 'unassigned', keywords: 'queue incidents requests' },
    ],
  },
  {
    label: 'Building',
    items: [
      { to: '/work-orders', label: 'Work orders', icon: Wrench, badgeKey: 'overdueWo', keywords: 'maintenance jobs' },
      { to: '/assets', label: 'Assets', icon: Boxes, keywords: 'equipment register' },
      { to: '/maintenance', label: 'Preventive maintenance', icon: CalendarClock, keywords: 'pm schedule' },
      { to: '/spaces', label: 'Spaces', icon: Building2, keywords: 'floors rooms locations' },
    ],
  },
  {
    label: 'Workplace',
    items: [
      { to: '/rooms', label: 'Rooms & bookings', icon: Armchair },
      { to: '/visitors', label: 'Visitors & reception', icon: Contact },
    ],
  },
  {
    label: manager ? 'Manage' : 'Resources',
    items: [
      { to: '/help', label: 'Knowledge base', icon: BookOpen },
      ...(manager
        ? [
            { to: '/vendors', label: 'Vendors & contracts', icon: Truck },
            { to: '/reports', label: 'Reports', icon: BarChart3, keywords: 'analytics sla csat' },
            { to: '/settings', label: 'Settings', icon: Cog, keywords: 'sla categories teams' },
          ]
        : []),
    ],
  },
]

export const navFor = (role: Role): NavGroup[] => (role === 'requester' ? requester : staff(role === 'manager'))

export const BRAND = { name: "Atrium", tagline: "Help desk & building management" }
