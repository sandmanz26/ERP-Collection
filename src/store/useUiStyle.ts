import * as React from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Which interface the suite is drawn in.
 *
 * "modern" is the original design system. "classic" is a Bootstrap-3-era admin
 * skin: a dark sidebar, a coloured top bar, flat squared panels, striped tables
 * and 14px Helvetica. Both draw the same screens from the same data — the
 * choice is purely visual, stored per browser, and independent of light/dark.
 */
export type UiStyle = 'modern' | 'classic'

interface UiStyleState {
  style: UiStyle
  setStyle: (s: UiStyle) => void
}

export const useUiStyle = create<UiStyleState>()(
  persist(
    (set) => ({
      style: 'modern',
      setStyle: (style) => set({ style }),
    }),
    { name: 'kn-ui', version: 1 },
  ),
)

/** Keeps `<html data-ui>` in step with the store so the stylesheet can key off it. */
export function useApplyUiStyle() {
  const style = useUiStyle((s) => s.style)
  React.useEffect(() => {
    document.documentElement.dataset.ui = style
  }, [style])
}
