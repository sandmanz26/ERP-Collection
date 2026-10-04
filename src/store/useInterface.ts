import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Which face the suite wears.
 *
 * `modern` is the interface the suite was built with. `classic` is the same
 * screens dressed the way a Bootstrap 3 admin template looked in 2017 — dark
 * sidebar, blue header bar, flat square buttons, bordered striped tables. It is
 * a second skin rather than a second set of pages, so a record, a permission or
 * a total can never differ between the two.
 *
 * It is a preference of the person at the keyboard, not a company setting, so
 * it lives in this browser and is not tied to a role.
 */
export type InterfaceStyle = 'modern' | 'classic'

export const INTERFACES: { value: InterfaceStyle; label: string; summary: string }[] = [
  {
    value: 'modern',
    label: 'Modern',
    summary: 'Soft corners, light surfaces and a quiet sidebar. The interface the suite was designed around.',
  },
  {
    value: 'classic',
    label: 'Classic',
    summary: 'A 2017-style Bootstrap admin: dark sidebar, blue header bar, square buttons, bordered striped tables.',
  },
]

interface InterfaceState {
  style: InterfaceStyle
  setStyle: (style: InterfaceStyle) => void
}

export const useInterface = create<InterfaceState>()(
  persist(
    (set) => ({
      style: 'modern',
      setStyle: (style) => set({ style }),
    }),
    { name: 'tata-gemilang-interface' },
  ),
)

/**
 * The stylesheet keys off an attribute on <html>, so it has to be there before
 * the first paint or a Classic user sees the modern interface flash by on every
 * reload. The store hydrates synchronously from localStorage, which is why this
 * can run at import time rather than inside an effect.
 */
function apply(style: InterfaceStyle) {
  document.documentElement.dataset.ui = style
}

apply(useInterface.getState().style)
useInterface.subscribe((state) => apply(state.style))
