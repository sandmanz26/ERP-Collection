import * as L from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export function Icon({ name, className }: { name: string; className?: string }) {
  const C = ((L as unknown as Record<string, LucideIcon>)[name] ?? L.CircleHelp) as LucideIcon
  return <C className={className} />
}
