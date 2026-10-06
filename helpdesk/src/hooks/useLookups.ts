import * as React from 'react'
import { useStore } from '@/store/useStore'

const by = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]))

/** id → record maps, rebuilt only when the underlying list changes. */
export function useLookups() {
  const users = useStore((s) => s.users)
  const teams = useStore((s) => s.teams)
  const spaces = useStore((s) => s.spaces)
  const buildings = useStore((s) => s.buildings)
  const categories = useStore((s) => s.categories)
  const assets = useStore((s) => s.assets)
  const assetCategories = useStore((s) => s.assetCategories)
  const vendors = useStore((s) => s.vendors)
  return React.useMemo(
    () => ({
      user: by(users),
      team: by(teams),
      space: by(spaces),
      building: by(buildings),
      category: by(categories),
      asset: by(assets),
      assetCategory: by(assetCategories),
      vendor: by(vendors),
    }),
    [users, teams, spaces, buildings, categories, assets, assetCategories, vendors],
  )
}

export type Lookups = ReturnType<typeof useLookups>

export function useSpaceLabel() {
  const { space, building } = useLookups()
  return React.useCallback(
    (id?: string) => {
      const s = id ? space.get(id) : undefined
      if (!s) return '—'
      const b = building.get(s.buildingId)
      const fl = s.floor < 0 ? `B${Math.abs(s.floor)}` : `L${s.floor}`
      return `${s.name} · ${b?.code} ${fl}`
    },
    [space, building],
  )
}
