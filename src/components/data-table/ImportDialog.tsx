import * as React from 'react'
import { AlertTriangle, CheckCircle2, Download, FileUp, Table2, Upload } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { exportCsv, guessMapping, parseCsv, type CsvRow } from '@/lib/csv'
import { cn } from '@/lib/utils'
import type { ImportField } from './types'

export interface ImportResult {
  rows: CsvRow[]
  mapping: Record<string, string>
}

const plural = (word: string) => (word.endsWith('s') || word.endsWith('y') ? `${word} records` : `${word}s`)

export function ImportDialog({
  open,
  onOpenChange,
  entityLabel,
  fields,
  onImport,
  validate,
  sampleRow,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  entityLabel: string
  fields: ImportField[]
  onImport: (rows: Record<string, string>[]) => void
  validate?: (row: Record<string, string>, index: number) => string[]
  sampleRow?: Record<string, string>
}) {
  const [step, setStep] = React.useState<'upload' | 'map' | 'review'>('upload')
  const [fileName, setFileName] = React.useState('')
  const [headers, setHeaders] = React.useState<string[]>([])
  const [rows, setRows] = React.useState<CsvRow[]>([])
  const [mapping, setMapping] = React.useState<Record<string, string>>({})
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!open) {
      setStep('upload')
      setFileName('')
      setHeaders([])
      setRows([])
      setMapping({})
    }
  }, [open])

  const readFile = async (file: File) => {
    const text = await file.text()
    const parsed = parseCsv(text)
    setFileName(file.name)
    setHeaders(parsed.headers)
    setRows(parsed.rows)
    setMapping(guessMapping(parsed.headers, fields))
    setStep('map')
  }

  const mapped = React.useMemo(
    () =>
      rows.map((r) => {
        const o: Record<string, string> = {}
        fields.forEach((f) => {
          const src = mapping[f.key]
          o[f.key] = src ? (r[src] ?? '') : ''
        })
        return o
      }),
    [rows, mapping, fields],
  )

  const issues = React.useMemo(() => {
    const list: { row: number; message: string }[] = []
    mapped.forEach((r, i) => {
      fields.filter((f) => f.required).forEach((f) => {
        if (!r[f.key]?.trim()) list.push({ row: i + 1, message: `${f.label} is required` })
      })
      validate?.(r, i).forEach((m) => list.push({ row: i + 1, message: m }))
    })
    return list
  }, [mapped, fields, validate])

  const badRows = new Set(issues.map((i) => i.row))
  const validRows = mapped.filter((_, i) => !badRows.has(i + 1))
  const unmappedRequired = fields.filter((f) => f.required && !mapping[f.key])

  const downloadTemplate = () => {
    exportCsv(
      `${entityLabel.toLowerCase().replace(/\s+/g, '-')}-import-template`,
      [sampleRow ?? Object.fromEntries(fields.map((f) => [f.key, '']))],
      fields.map((f) => ({ key: f.key, header: f.key })),
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        icon={<Upload />}
        title={`Import ${plural(entityLabel)}`}
        description="Upload a CSV, map the columns, review what will be written. Rows with errors are skipped, not guessed."
        footer={
          <>
            <div className="mr-auto flex items-center gap-2 text-[12px] text-fg-muted">
              {(['upload', 'map', 'review'] as const).map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && <span className="text-fg-subtle">›</span>}
                  <span className={cn('capitalize', step === s && 'font-semibold text-fg')}>{s}</span>
                </React.Fragment>
              ))}
            </div>
            {step === 'map' && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button size="sm" variant="primary" disabled={unmappedRequired.length > 0} onClick={() => setStep('review')}>
                  Review {rows.length} rows
                </Button>
              </>
            )}
            {step === 'review' && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setStep('map')}>
                  Back
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={validRows.length === 0}
                  onClick={() => {
                    onImport(validRows)
                    onOpenChange(false)
                  }}
                >
                  <FileUp />
                  Import {validRows.length} rows
                </Button>
              </>
            )}
          </>
        }
      >
        {step === 'upload' && (
          <div className="p-5">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                const f = e.dataTransfer.files[0]
                if (f) readFile(f)
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
                dragging ? 'border-primary bg-primary-soft/50' : 'border-border-strong bg-surface-sunken hover:border-primary/60',
              )}
            >
              <span className="grid size-11 place-items-center rounded-xl border border-border bg-surface text-primary">
                <Upload className="size-5" />
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-fg">Drop a CSV file here, or click to browse</p>
                <p className="mt-1 text-[12px] text-fg-muted">
                  Quoted fields, embedded commas and UTF-8 BOM are all handled.
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) readFile(f)
                }}
              />
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-surface-sunken px-3.5 py-3">
              <Table2 className="mt-0.5 size-4 shrink-0 text-fg-muted" />
              <div className="flex-1 text-[12px] leading-relaxed text-fg-muted">
                <p className="font-medium text-fg">Not sure about the format?</p>
                <p>Download a template with every recognised column and one sample row.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={downloadTemplate}>
                <Download />
                Template
              </Button>
            </div>
          </div>
        )}

        {step === 'map' && (
          <div className="p-5">
            <div className="mb-4 flex items-center gap-2 text-[12.5px] text-fg-muted">
              <Badge tone="primary" size="sm">
                {fileName}
              </Badge>
              <span>
                {rows.length} rows · {headers.length} columns detected
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-[1fr_1fr] gap-px bg-border text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
                <div className="bg-surface-sunken px-3 py-2">System field</div>
                <div className="bg-surface-sunken px-3 py-2">CSV column</div>
              </div>
              <div className="divide-y divide-border">
                {fields.map((f) => (
                  <div key={f.key} className="grid grid-cols-[1fr_1fr] items-center gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-fg">
                        {f.label}
                        {f.required && <span className="ml-1 text-danger">*</span>}
                      </p>
                      {f.hint && <p className="truncate text-[11.5px] text-fg-muted">{f.hint}</p>}
                    </div>
                    <Select
                      size="sm"
                      searchable
                      clearable
                      value={mapping[f.key] ?? null}
                      onClear={() => setMapping((m) => ({ ...m, [f.key]: '' }))}
                      onChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))}
                      options={headers.map((h) => ({ value: h, label: h, description: rows[0]?.[h] || undefined }))}
                      placeholder="— skip this field —"
                      invalid={f.required && !mapping[f.key]}
                    />
                  </div>
                ))}
              </div>
            </div>
            {unmappedRequired.length > 0 && (
              <p className="mt-3 flex items-center gap-2 text-[12px] font-medium text-danger">
                <AlertTriangle className="size-4" />
                Map every required field first: {unmappedRequired.map((f) => f.label).join(', ')}
              </p>
            )}
          </div>
        )}

        {step === 'review' && (
          <div className="p-5">
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-fg-subtle">Rows in file</p>
                <p className="tnum mt-1 text-[18px] font-semibold text-fg">{rows.length}</p>
              </div>
              <div className="rounded-lg border border-success/30 bg-success-soft px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-success-soft-fg/80">Will import</p>
                <p className="tnum mt-1 text-[18px] font-semibold text-success-soft-fg">{validRows.length}</p>
              </div>
              <div className={cn('rounded-lg border px-3 py-2.5', issues.length ? 'border-danger/30 bg-danger-soft' : 'border-border bg-surface-sunken')}>
                <p className={cn('text-[11px] font-medium uppercase tracking-[0.07em]', issues.length ? 'text-danger-soft-fg/80' : 'text-fg-subtle')}>
                  Skipped
                </p>
                <p className={cn('tnum mt-1 text-[18px] font-semibold', issues.length ? 'text-danger-soft-fg' : 'text-fg')}>
                  {badRows.size}
                </p>
              </div>
            </div>

            {issues.length > 0 && (
              <div className="mb-4 rounded-lg border border-danger/25 bg-danger-soft/60 px-3.5 py-3">
                <p className="flex items-center gap-2 text-[12.5px] font-semibold text-danger-soft-fg">
                  <AlertTriangle className="size-4" /> {issues.length} problem{issues.length === 1 ? '' : 's'} found
                </p>
                <ul className="scrollbar-thin mt-2 max-h-28 space-y-0.5 overflow-y-auto text-[12px] text-danger-soft-fg/90">
                  {issues.slice(0, 30).map((it, i) => (
                    <li key={i}>
                      Row {it.row}: {it.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="scrollbar-thin max-h-64 overflow-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-[12px]">
                <thead className="sticky top-0 z-10 bg-surface-sunken">
                  <tr>
                    <th className="w-9 border-b border-border px-2 py-2" />
                    {fields.map((f) => (
                      <th key={f.key} className="whitespace-nowrap border-b border-border px-3 py-2 text-left font-semibold text-fg-muted">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mapped.slice(0, 100).map((r, i) => {
                    const bad = badRows.has(i + 1)
                    return (
                      <tr key={i} className={cn(bad && 'bg-danger-soft/40')}>
                        <td className="px-2 py-1.5 text-center">
                          {bad ? (
                            <AlertTriangle className="mx-auto size-3.5 text-danger" />
                          ) : (
                            <CheckCircle2 className="mx-auto size-3.5 text-success" />
                          )}
                        </td>
                        {fields.map((f) => (
                          <td key={f.key} className="max-w-[180px] truncate px-3 py-1.5 text-fg">
                            {r[f.key] || <span className="text-fg-subtle">—</span>}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
