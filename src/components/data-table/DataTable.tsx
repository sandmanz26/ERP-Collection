import * as React from 'react'
import {
  ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Columns3, Download, FileJson,
  FileSpreadsheet, Filter, Inbox, Rows3, Search, SlidersHorizontal, Trash2, Upload, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportCsv, exportJson } from '@/lib/csv'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Menu, MenuCheckItem, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { MultiSelect } from '@/components/ui/select'
import { EmptyState, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { ImportDialog } from './ImportDialog'
import type { Column, ImportField, SortState, TableFilter } from './types'

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  getId: (row: T) => string
  getLabel: (row: T) => string
  entityLabel: string
  searchText: (row: T) => string
  filters?: TableFilter<T>[]
  onRowClick?: (row: T) => void
  rowActions?: (row: T) => React.ReactNode
  onDelete?: (ids: string[]) => void
  cascadeWarning?: (rows: T[]) => string[]
  deleteNote?: string
  toolbarLeft?: React.ReactNode
  toolbarRight?: React.ReactNode
  bulkActions?: (rows: T[], clear: () => void) => React.ReactNode
  importFields?: ImportField[]
  onImport?: (rows: Record<string, string>[]) => void
  importSample?: Record<string, string>
  /** Shapes a row into the same columns the importer expects, so export → import round-trips.
   *  Return an array when one record expands into several CSV rows (a journal entry's lines, say). */
  toImportRow?: (row: T) => Record<string, unknown> | Record<string, unknown>[]
  exportName: string
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  rowTone?: (row: T) => string | undefined
  initialSort?: SortState
  pageSize?: number
  stickyActions?: boolean
  storageKey?: string
  compactByDefault?: boolean
  footerSummary?: (rows: T[]) => React.ReactNode
}

export function DataTable<T>({
  data,
  columns,
  getId,
  getLabel,
  entityLabel,
  searchText,
  filters = [],
  onRowClick,
  rowActions,
  onDelete,
  cascadeWarning,
  deleteNote,
  toolbarLeft,
  toolbarRight,
  bulkActions,
  importFields,
  onImport,
  importSample,
  toImportRow,
  exportName,
  emptyTitle,
  emptyDescription,
  emptyAction,
  rowTone,
  initialSort = null,
  pageSize: initialPageSize = 25,
  stickyActions = true,
  storageKey,
  compactByDefault,
  footerSummary,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState('')
  const [sort, setSort] = React.useState<SortState>(initialSort)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(initialPageSize)
  const [dense, setDense] = React.useState(!!compactByDefault)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [importOpen, setImportOpen] = React.useState(false)
  const [showFilters, setShowFilters] = React.useState(false)
  const [hidden, setHidden] = React.useState<Set<string>>(() => {
    const stored = storageKey ? localStorage.getItem(`cols:${storageKey}`) : null
    if (stored) return new Set(JSON.parse(stored) as string[])
    return new Set(columns.filter((c) => c.defaultHidden).map((c) => c.key))
  })

  React.useEffect(() => {
    if (storageKey) localStorage.setItem(`cols:${storageKey}`, JSON.stringify(Array.from(hidden)))
  }, [hidden, storageKey])

  const activeFilterCount = filters.reduce((a, f) => a + (f.values.length ? 1 : 0), 0)
  const visibleColumns = columns.filter((c) => !hidden.has(c.key))

  const filtered = React.useMemo(() => {
    let rows = data
    if (query.trim()) {
      const q = query.toLowerCase()
      rows = rows.filter((r) => searchText(r).toLowerCase().includes(q))
    }
    filters.forEach((f) => {
      if (f.values.length) rows = rows.filter((r) => f.match(r, f.values))
    })
    return rows
  }, [data, query, filters, searchText])

  const sorted = React.useMemo(() => {
    if (!sort) return filtered
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return filtered
    const value = col.sortValue ?? ((r: T) => String(col.exportValue?.(r) ?? ''))
    return filtered.slice().sort((a, b) => {
      const va = value(a)
      const vb = value(b)
      let cmp = 0
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb
      else cmp = String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' })
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sort, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  React.useEffect(() => setPage(1), [query, filters.map((f) => f.values.join()).join('|'), pageSize])

  const pageIds = paged.map(getId)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const somePageSelected = pageIds.some((id) => selected.has(id))
  const selectedRows = data.filter((r) => selected.has(getId(r)))

  const toggleAllOnPage = () => {
    const next = new Set(selected)
    if (allPageSelected) pageIds.forEach((id) => next.delete(id))
    else pageIds.forEach((id) => next.add(id))
    setSelected(next)
  }

  const toggleSort = (key: string) => {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: 'asc' }
      if (s.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  const exportRows = (rows: T[], format: 'csv' | 'json') => {
    const cols = visibleColumns
    const payload = rows.map((r) => {
      const o: Record<string, unknown> = {}
      cols.forEach((c) => (o[c.key] = c.exportValue ? c.exportValue(r) : stripNode(c.cell(r))))
      return o
    })
    if (format === 'csv') exportCsv(exportName, payload, cols.map((c) => ({ key: c.key, header: c.header })))
    else exportJson(exportName, payload)
  }

  const cellPad = dense ? 'px-3 py-1.5' : 'px-3 py-2.5'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ------------ toolbar ------------ */}
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <div className="relative min-w-[200px] flex-1 md:max-w-xs">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${entityLabel}…`}
            leading={<Search />}
            trailing={
              query ? (
                <button onClick={() => setQuery('')} className="grid size-4 place-items-center rounded hover:bg-neutral-soft">
                  <X className="size-3" />
                </button>
              ) : undefined
            }
          />
        </div>

        {filters.length > 0 && (
          <Button
            variant={showFilters || activeFilterCount ? 'subtle' : 'secondary'}
            size="md"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter />
            Filters
            {activeFilterCount > 0 && (
              <span className="tnum grid size-4 place-items-center rounded bg-primary text-[10.5px] font-semibold text-primary-fg">
                {activeFilterCount}
              </span>
            )}
          </Button>
        )}

        {toolbarLeft}
        <div className="flex-1" />
        {toolbarRight}

        <Menu>
          <MenuTrigger asChild>
            <Button variant="secondary" size="md">
              <Download />
              Export
            </Button>
          </MenuTrigger>
          <MenuContent>
            <MenuLabel>Export {entityLabel}</MenuLabel>
            <MenuItem icon={<FileSpreadsheet />} onSelect={() => exportRows(sorted, 'csv')}>
              Filtered view ({sorted.length}) · CSV
            </MenuItem>
            <MenuItem icon={<FileSpreadsheet />} disabled={!selected.size} onSelect={() => exportRows(selectedRows, 'csv')}>
              Selected ({selected.size}) · CSV
            </MenuItem>
            <MenuItem icon={<FileSpreadsheet />} onSelect={() => exportRows(data, 'csv')}>
              Everything ({data.length}) · CSV
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<FileJson />} onSelect={() => exportRows(sorted, 'json')}>
              Filtered view · JSON
            </MenuItem>
            {importFields && toImportRow && (
              <>
                <MenuSeparator />
                <MenuItem
                  icon={<FileSpreadsheet />}
                  onSelect={() => {
                    exportCsv(
                      `${exportName}-reimportable`,
                      sorted.flatMap((r) => {
                        const shaped = toImportRow(r)
                        return Array.isArray(shaped) ? shaped : [shaped]
                      }),
                      importFields.map((f) => ({ key: f.key, header: f.key })),
                    )
                  }}
                >
                  Re-importable file ({sorted.length})
                </MenuItem>
              </>
            )}
          </MenuContent>
        </Menu>

        {importFields && onImport && (
          <Button variant="secondary" size="md" onClick={() => setImportOpen(true)}>
            <Upload />
            Import
          </Button>
        )}

        <Menu>
          <MenuTrigger asChild>
            <Button variant="secondary" size="icon" aria-label="View options">
              <SlidersHorizontal />
            </Button>
          </MenuTrigger>
          <MenuContent>
            <MenuLabel>Density</MenuLabel>
            <MenuItem icon={<Rows3 />} onSelect={() => setDense(!dense)}>
              {dense ? 'Comfortable rows' : 'Compact rows'}
            </MenuItem>
            <MenuSeparator />
            <MenuLabel>
              <span className="inline-flex items-center gap-1.5">
                <Columns3 className="size-3" /> Columns
              </span>
            </MenuLabel>
            <div className="scrollbar-thin max-h-64 overflow-y-auto">
              {columns
                .filter((c) => c.hideable !== false)
                .map((c) => (
                  <MenuCheckItem
                    key={c.key}
                    checked={!hidden.has(c.key)}
                    onSelect={() =>
                      setHidden((h) => {
                        const next = new Set(h)
                        if (next.has(c.key)) next.delete(c.key)
                        else next.add(c.key)
                        return next
                      })
                    }
                  >
                    {c.header}
                  </MenuCheckItem>
                ))}
            </div>
            <MenuSeparator />
            <MenuItem onSelect={() => setHidden(new Set())}>Show all columns</MenuItem>
          </MenuContent>
        </Menu>
      </div>

      {/* ------------ filter row ------------ */}
      {showFilters && filters.length > 0 && (
        <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface-sunken px-3.5 py-3 animate-pop-in">
          {filters.map((f) => (
            <div key={f.key} className="min-w-[176px] flex-1 space-y-1.5">
              <label className="text-[11.5px] font-medium text-fg-muted">{f.label}</label>
              <MultiSelect size="sm" values={f.values} onChange={f.onChange} options={f.options} placeholder="Any" />
            </div>
          ))}
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => filters.forEach((f) => f.onChange([]))}>
              <X /> Reset
            </Button>
          )}
        </div>
      )}

      {/* ------------ bulk action bar ------------ */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3.5 py-2.5 animate-pop-in">
          <span className="text-[13px] font-semibold text-primary-soft-fg">
            {selected.size} {entityLabel}
            {selected.size === 1 ? '' : 's'} selected
          </span>
          {sorted.length > pageIds.length && !sorted.every((r) => selected.has(getId(r))) && (
            <button
              onClick={() => setSelected(new Set(sorted.map(getId)))}
              className="text-[12.5px] font-medium text-primary underline-offset-2 hover:underline"
            >
              Select all {sorted.length} in this view
            </button>
          )}
          <Separator vertical className="mx-1 h-5" />
          {bulkActions?.(selectedRows, () => setSelected(new Set()))}
          <Button variant="secondary" size="sm" onClick={() => exportRows(selectedRows, 'csv')}>
            <Download /> Export selected
          </Button>
          {onDelete && (
            <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
              <Trash2 /> Delete selected
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* ------------ table ------------ */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="scrollbar-thin h-full overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr>
                <th
                  className={cn(
                    'sticky left-0 top-0 z-30 w-10 border-b border-border bg-surface-sunken px-3',
                    dense ? 'py-1.5' : 'py-2',
                  )}
                >
                  <Checkbox
                    aria-label="Select all rows on this page"
                    checked={allPageSelected}
                    indeterminate={!allPageSelected && somePageSelected}
                    onChange={toggleAllOnPage}
                  />
                </th>
                {visibleColumns.map((c, i) => {
                  const isSorted = sort?.key === c.key
                  return (
                    <th
                      key={c.key}
                      className={cn(
                        'sticky top-0 z-20 whitespace-nowrap border-b border-border bg-surface-sunken text-left font-semibold text-fg-muted',
                        dense ? 'px-3 py-1.5' : 'px-3 py-2',
                        c.width,
                        c.align === 'right' && 'text-right',
                        c.align === 'center' && 'text-center',
                        c.pinned && 'left-10 z-30 shadow-sticky-r',
                        i === 0 && !c.pinned && '',
                      )}
                    >
                      {c.sortable === false ? (
                        <span className="text-[11.5px] uppercase tracking-[0.055em]">{c.header}</span>
                      ) : (
                        <button
                          onClick={() => toggleSort(c.key)}
                          className={cn(
                            'group inline-flex items-center gap-1 text-[11.5px] uppercase tracking-[0.055em] transition-colors hover:text-fg',
                            isSorted && 'text-fg',
                            c.align === 'right' && 'flex-row-reverse',
                          )}
                        >
                          {c.header}
                          {isSorted ? (
                            sort!.dir === 'asc' ? (
                              <ArrowUp className="size-3 text-primary" />
                            ) : (
                              <ArrowDown className="size-3 text-primary" />
                            )
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
                          )}
                        </button>
                      )}
                    </th>
                  )
                })}
                {rowActions && (
                  <th
                    className={cn(
                      'sticky top-0 z-30 w-[92px] border-b border-border bg-surface-sunken text-right text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted',
                      dense ? 'px-3 py-1.5' : 'px-3 py-2',
                      stickyActions && 'right-0 border-l border-border shadow-sticky-l',
                    )}
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => {
                const id = getId(row)
                const isSelected = selected.has(id)
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'group transition-colors',
                      onRowClick && 'cursor-pointer',
                      isSelected ? 'bg-primary-soft/45' : 'hover:bg-bg-muted/70',
                      rowTone?.(row),
                    )}
                  >
                    <td
                      className={cn(
                        'sticky left-0 z-10 w-10 border-b border-border px-3',
                        dense ? 'py-1.5' : 'py-2.5',
                        isSelected ? 'bg-[hsl(var(--primary-soft))]' : 'bg-surface group-hover:bg-[hsl(var(--bg-muted))]',
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        aria-label={`Select ${getLabel(row)}`}
                        checked={isSelected}
                        onChange={(next) => {
                          const s = new Set(selected)
                          if (next) s.add(id)
                          else s.delete(id)
                          setSelected(s)
                        }}
                      />
                    </td>
                    {visibleColumns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          'whitespace-nowrap border-b border-border align-middle text-fg',
                          cellPad,
                          c.width,
                          c.align === 'right' && 'text-right',
                          c.align === 'center' && 'text-center',
                          c.pinned &&
                            cn(
                              'sticky left-10 z-10 shadow-sticky-r',
                              isSelected ? 'bg-[hsl(var(--primary-soft))]' : 'bg-surface group-hover:bg-[hsl(var(--bg-muted))]',
                            ),
                        )}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                    {rowActions && (
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'border-b border-border text-right',
                          dense ? 'px-2 py-1' : 'px-2 py-2',
                          stickyActions && 'sticky right-0 z-10 border-l border-border shadow-sticky-l',
                          isSelected ? 'bg-[hsl(var(--primary-soft))]' : 'bg-surface group-hover:bg-[hsl(var(--bg-muted))]',
                        )}
                      >
                        <div className="flex items-center justify-end gap-0.5">{rowActions(row)}</div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {paged.length === 0 && (
            <EmptyState
              icon={<Inbox />}
              title={query || activeFilterCount ? `No ${entityLabel} matches this view` : emptyTitle ?? `No ${entityLabel} yet`}
              description={
                query || activeFilterCount
                  ? 'Try a broader search or reset the filters.'
                  : emptyDescription ?? `Records you create will appear here.`
              }
              action={
                query || activeFilterCount ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQuery('')
                      filters.forEach((f) => f.onChange([]))
                    }}
                  >
                    Reset view
                  </Button>
                ) : (
                  emptyAction
                )
              }
            />
          )}
        </div>
      </div>

      {/* ------------ footer ------------ */}
      <div className="flex flex-wrap items-center gap-3 pt-3 text-[12.5px] text-fg-muted">
        <span className="tnum">
          {sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of{' '}
          <span className="font-semibold text-fg">{sorted.length}</span>
          {sorted.length !== data.length && <span className="text-fg-subtle"> (filtered from {data.length})</span>}
        </span>
        {footerSummary && (
          <>
            <Separator vertical className="h-4" />
            {footerSummary(sorted)}
          </>
        )}
        <div className="flex-1" />
        <Menu>
          <MenuTrigger asChild>
            <Button variant="ghost" size="sm">
              {pageSize} per page
            </Button>
          </MenuTrigger>
          <MenuContent align="end">
            {[10, 25, 50, 100, 250].map((n) => (
              <MenuItem key={n} onSelect={() => setPageSize(n)}>
                {n} per page
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
        <div className="flex items-center gap-1">
          <Tooltip content="Previous page">
            <Button variant="secondary" size="iconSm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
              <ChevronLeft />
            </Button>
          </Tooltip>
          <span className="tnum px-2 text-[12.5px]">
            {safePage} / {totalPages}
          </span>
          <Tooltip content="Next page">
            <Button variant="secondary" size="iconSm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
              <ChevronRight />
            </Button>
          </Tooltip>
        </div>
      </div>

      {onDelete && (
        <ConfirmDelete
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          entityLabel={entityLabel}
          items={selectedRows.map(getLabel)}
          cascade={cascadeWarning?.(selectedRows)}
          destructiveNote={deleteNote}
          onConfirm={() => {
            onDelete(Array.from(selected))
            setSelected(new Set())
          }}
        />
      )}

      {importFields && onImport && (
        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          entityLabel={entityLabel}
          fields={importFields}
          onImport={onImport}
          sampleRow={importSample}
        />
      )}
    </div>
  )
}

/** best-effort text extraction from a rendered cell for CSV fallback */
function stripNode(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(stripNode).join(' ')
  if (React.isValidElement(node)) return stripNode((node.props as { children?: React.ReactNode }).children)
  return ''
}
