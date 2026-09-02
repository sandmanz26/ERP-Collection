import type * as React from 'react'

export interface Column<T> {
  key: string
  header: string
  /** tailwind width helper, e.g. 'w-[220px]' or 'min-w-[260px]' */
  width?: string
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
  sortValue?: (row: T) => string | number
  cell: (row: T) => React.ReactNode
  exportValue?: (row: T) => string | number | undefined
  hideable?: boolean
  defaultHidden?: boolean
  headerHint?: string
  /** pin this column to the left, after the checkbox */
  pinned?: boolean
  /** anchor for the onboarding tour, stamped on the column header */
  tour?: string
}

export interface TableFilter<T = unknown> {
  key: string
  label: string
  options: { value: string; label: string; icon?: React.ReactNode }[]
  values: string[]
  onChange: (values: string[]) => void
  match: (row: T, values: string[]) => boolean
}

export type SortState = { key: string; dir: 'asc' | 'desc' } | null

export interface ImportField {
  key: string
  label: string
  required?: boolean
  hint?: string
}
