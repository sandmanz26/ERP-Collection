import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * How every register presents itself, and where the control that changes it
 * sits on screen.
 *
 * Two presentations, because the same table serves two people. Somebody
 * reconciling a month wants every column at once and will read a dense grid
 * all day. Somebody approving one request wants four columns and a way to
 * open the rest when a row actually raises a question. Neither is the "real"
 * view, so the choice belongs to the reader rather than to us — and it is
 * remembered, because nobody wants to make it twice.
 */
export type TableMode = 'detailed' | 'relaxed'

interface TableStyleState {
  mode: TableMode
  /** Where the floating control was dragged to. Null until somebody moves it. */
  x: number | null
  y: number | null
  /** Shrunk to a single button, for when it is in the way. */
  collapsed: boolean
  /**
   * How many registers are on screen. The control has nothing to change on a
   * detail page, so it only appears where a table can hear it. Not persisted —
   * it is a fact about this render, not a preference.
   */
  tables: number
  setMode: (mode: TableMode) => void
  setPosition: (x: number, y: number) => void
  setCollapsed: (collapsed: boolean) => void
  addTable: () => void
  removeTable: () => void
}

export const useTableStyle = create<TableStyleState>()(
  persist(
    (set) => ({
      mode: 'detailed',
      x: null,
      y: null,
      collapsed: false,
      tables: 0,
      setMode: (mode) => set({ mode }),
      setPosition: (x, y) => set({ x, y }),
      setCollapsed: (collapsed) => set({ collapsed }),
      addTable: () => set((s) => ({ tables: s.tables + 1 })),
      removeTable: () => set((s) => ({ tables: Math.max(0, s.tables - 1) })),
    }),
    {
      name: 'tata-gemilang-table-style',
      partialize: ({ mode, x, y, collapsed }) => ({ mode, x, y, collapsed }),
    },
  ),
)
