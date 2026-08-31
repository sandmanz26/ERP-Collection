import * as React from 'react'
import { AlertTriangle, BookOpen, CheckCircle2, Pencil, Plus, Scale, Trash2 } from 'lucide-react'
import type { JournalEntry, JournalLine } from '@/data/types'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { Sheet } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { journalIsBalanced } from '@/lib/analytics'
import { fmtCurrency, fmtDate, titleCase } from '@/lib/format'
import { nextCode, uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

export function LedgerPage() {
  const toast = useToast()
  const { journal, accounts, projects, removeJournal, importJournal, upsertJournal } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<JournalEntry | null>(null)
  const [deleting, setDeleting] = React.useState<JournalEntry | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [source, setSource] = React.useState<string[]>([])

  const posted = journal.filter((j) => j.status === 'POSTED')
  const unbalanced = journal.filter((j) => !journalIsBalanced(j).balanced)
  const totalDebits = posted.reduce((a, j) => a + j.lines.reduce((s, l) => s + l.debit, 0), 0)

  const columns: Column<JournalEntry>[] = [
    {
      key: 'entryNo', header: 'Entry', width: 'w-[150px]', pinned: true, sortable: true,
      sortValue: (r) => r.entryNo, exportValue: (r) => r.entryNo,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg">{r.entryNo}</span>,
    },
    {
      key: 'date', header: 'Date', width: 'w-[112px]', sortable: true,
      sortValue: (r) => r.date, exportValue: (r) => r.date,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtDate(r.date)}</span>,
    },
    {
      key: 'memo', header: 'Memo', width: 'min-w-[300px]', sortable: true,
      sortValue: (r) => r.memo, exportValue: (r) => r.memo,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg">{r.memo}</p>
          <p className="truncate text-[11px] text-fg-muted">
            {r.lines.length} lines
            {r.reference && <span className="ml-1.5 font-mono">{r.reference}</span>}
          </p>
        </div>
      ),
    },
    {
      key: 'source', header: 'Source', width: 'w-[168px]', sortable: true,
      sortValue: (r) => r.source, exportValue: (r) => r.source,
      cell: (r) => <Badge tone="outline" size="sm">{titleCase(r.source)}</Badge>,
    },
    {
      key: 'projectCode', header: 'Job', width: 'w-[150px]', sortable: true,
      sortValue: (r) => r.projectCode ?? '', exportValue: (r) => r.projectCode ?? '',
      cell: (r) => <span className="font-mono text-[11.5px] text-fg-muted">{r.projectCode ?? '—'}</span>,
    },
    {
      key: 'debit', header: 'Debit', width: 'w-[150px]', align: 'right', sortable: true,
      sortValue: (r) => r.lines.reduce((a, l) => a + l.debit, 0),
      exportValue: (r) => r.lines.reduce((a, l) => a + l.debit, 0),
      cell: (r) => <span className="tnum text-[12.5px] text-fg">{fmtCurrency(r.lines.reduce((a, l) => a + l.debit, 0), 'IDR', { compact: true })}</span>,
    },
    {
      key: 'credit', header: 'Credit', width: 'w-[150px]', align: 'right', sortable: true,
      sortValue: (r) => r.lines.reduce((a, l) => a + l.credit, 0),
      exportValue: (r) => r.lines.reduce((a, l) => a + l.credit, 0),
      cell: (r) => <span className="tnum text-[12.5px] text-fg">{fmtCurrency(r.lines.reduce((a, l) => a + l.credit, 0), 'IDR', { compact: true })}</span>,
    },
    {
      key: 'balanced', header: 'Balance', width: 'w-[120px]', align: 'center', sortable: true,
      sortValue: (r) => (journalIsBalanced(r).balanced ? 0 : 1),
      exportValue: (r) => (journalIsBalanced(r).balanced ? 'balanced' : `out by ${journalIsBalanced(r).difference}`),
      cell: (r) => {
        const b = journalIsBalanced(r)
        return b.balanced ? (
          <CheckCircle2 className="mx-auto size-4 text-success" />
        ) : (
          <Tooltip content={`Out of balance by ${fmtCurrency(Math.abs(b.difference), 'IDR')}`}>
            <AlertTriangle className="mx-auto size-4 text-danger" />
          </Tooltip>
        )
      },
    },
    {
      key: 'status', header: 'Status', width: 'w-[116px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'postedBy', header: 'Posted by', width: 'w-[160px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.postedBy ?? '', exportValue: (r) => r.postedBy ?? '',
      cell: (r) => <span className="text-[12px] text-fg-muted">{r.postedBy ?? '—'}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="General Ledger"
        description="Double-entry journal for the whole company. Every entry is validated for balance before it can be posted, and entries carry the job code so revenue and cost trace back to the shipment that earned them."
        actions={
          <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus /> New journal entry
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Entries" value={journal.length} icon={<BookOpen />} accent="primary" sub={`${posted.length} posted`} />
        <KpiCard label="Total debits posted" value={fmtCurrency(totalDebits, 'IDR', { compact: true })} icon={<Scale />} accent="accent" sub="Equals total credits" />
        <KpiCard label="Draft entries" value={journal.filter((j) => j.status === 'DRAFT').length} icon={<Pencil />} accent="warning" sub="Not yet in the reports" />
        <KpiCard label="Out of balance" value={unbalanced.length} icon={<AlertTriangle />} accent={unbalanced.length ? 'danger' : 'success'} sub={unbalanced.length ? 'Fix before posting' : 'Ledger is clean'} />
      </div>

      <DataTable
        data={journal}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.entryNo} — ${r.memo}`}
        entityLabel="journal entry"
        storageKey="journal"
        exportName="general-ledger"
        initialSort={{ key: 'date', dir: 'desc' }}
        searchText={(r) => [r.entryNo, r.memo, r.reference, r.projectCode, r.source, ...r.lines.map((l) => l.accountCode)].join(' ')}
        onRowClick={(r) => { setEditing(r); setFormOpen(true) }}
        rowTone={(r) => (!journalIsBalanced(r).balanced ? 'bg-danger-soft/25' : r.status === 'DRAFT' ? 'bg-warning-soft/15' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['DRAFT', 'POSTED', 'VOID'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'source', label: 'Source', values: source, onChange: setSource,
            options: ['MANUAL', 'AR_INVOICE', 'AP_BILL', 'PAYMENT', 'RECEIPT', 'ACCRUAL', 'FX_REVALUATION', 'CONSIGNMENT_SETTLEMENT'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.source),
          },
        ]}
        onDelete={(ids) => {
          removeJournal(ids)
          toast.push({ tone: 'success', title: `${ids.length} entries deleted` })
        }}
        cascadeWarning={(rows) => {
          const postedRows = rows.filter((r) => r.status === 'POSTED')
          return postedRows.length ? [`${postedRows.length} of these are posted — deleting them changes the trial balance and every report built on it`] : []
        }}
        bulkActions={(rows, clear) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const bad = rows.filter((r) => !journalIsBalanced(r).balanced)
              if (bad.length) {
                toast.push({ tone: 'error', title: 'Cannot post unbalanced entries', description: `${bad.map((b) => b.entryNo).join(', ')} do not balance.` })
                return
              }
              rows.forEach((r) => upsertJournal({ ...r, status: 'POSTED', postedAt: new Date().toISOString(), postedBy: 'Elena Marchetti' }))
              toast.push({ tone: 'success', title: `${rows.length} entries posted` })
              clear()
            }}
          >
            <CheckCircle2 /> Post
          </Button>
        )}
        importFields={[
          { key: 'entryNo', label: 'Entry number', required: true, hint: 'Lines with the same number join one entry' },
          { key: 'date', label: 'Date', required: true, hint: 'YYYY-MM-DD' },
          { key: 'memo', label: 'Memo', required: true },
          { key: 'source', label: 'Source' },
          { key: 'projectCode', label: 'Job code' },
          { key: 'accountCode', label: 'Account code', required: true },
          { key: 'lineDescription', label: 'Line description' },
          { key: 'debit', label: 'Debit' },
          { key: 'credit', label: 'Credit' },
          { key: 'status', label: 'Status' },
        ]}
        importSample={{
          entryNo: 'JV-2026-0500', date: '2026-09-01', memo: 'AR invoice example', source: 'AR_INVOICE',
          projectCode: 'PRJ-2026-0041', accountCode: '1-1300', lineDescription: 'Receivable', debit: '100000000',
          credit: '0', status: 'DRAFT',
        }}
        toImportRow={(r) =>
          r.lines.map((l) => ({
            entryNo: r.entryNo, date: r.date.slice(0, 10), memo: r.memo, source: r.source,
            projectCode: r.projectCode ?? '', accountCode: l.accountCode,
            lineDescription: l.description ?? '', debit: l.debit, credit: l.credit, status: r.status,
          }))
        }
        onImport={(rows) => {
          const map = new Map<string, JournalEntry>()
          rows.forEach((r) => {
            let e = map.get(r.entryNo)
            if (!e) {
              e = {
                id: uid('je'), entryNo: r.entryNo, date: r.date, memo: r.memo,
                source: (r.source || 'MANUAL') as JournalEntry['source'],
                projectCode: r.projectCode || undefined, currency: 'IDR', fxRate: 1,
                status: (r.status || 'DRAFT') as JournalEntry['status'], lines: [],
              }
              map.set(r.entryNo, e)
            }
            e.lines.push({
              id: uid('jl'), accountCode: r.accountCode, description: r.lineDescription || undefined,
              debit: Number(r.debit) || 0, credit: Number(r.credit) || 0, projectCode: r.projectCode || undefined,
            })
          })
          const list = Array.from(map.values())
          importJournal(list)
          const bad = list.filter((j) => !journalIsBalanced(j).balanced)
          toast.push({
            tone: bad.length ? 'warning' : 'success',
            title: `${list.length} entries imported`,
            description: bad.length ? `${bad.length} do not balance and are flagged in the table.` : undefined,
          })
        }}
        rowActions={(r) => (
          <>
            <Tooltip content="Edit">
              <Button variant="ghost" size="iconXs" onClick={() => { setEditing(r); setFormOpen(true) }}>
                <Pencil />
              </Button>
            </Tooltip>
            <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}>
                <Trash2 />
              </Button>
            </Tooltip>
          </>
        )}
        footerSummary={(rows) => {
          const d = rows.reduce((a, r) => a + r.lines.reduce((s, l) => s + l.debit, 0), 0)
          const c = rows.reduce((a, r) => a + r.lines.reduce((s, l) => s + l.credit, 0), 0)
          return (
            <span className="tnum">
              Dr <span className="font-semibold text-fg">{fmtCurrency(d, 'IDR', { compact: true })}</span> · Cr{' '}
              <span className="font-semibold text-fg">{fmtCurrency(c, 'IDR', { compact: true })}</span>
              {Math.abs(d - c) > 0.5 && <span className="ml-1.5 font-semibold text-danger">out by {fmtCurrency(Math.abs(d - c), 'IDR', { compact: true })}</span>}
            </span>
          )
        }}
      />

      <JournalForm open={formOpen} onOpenChange={setFormOpen} initial={editing} accounts={accounts} projectCodes={projects.map((p) => p.code)} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="journal entry"
        items={deleting ? [`${deleting.entryNo} — ${deleting.memo}`] : []}
        destructiveNote={deleting?.status === 'POSTED' ? 'This entry is posted. Removing it changes the trial balance.' : undefined}
        onConfirm={() => {
          if (deleting) {
            removeJournal([deleting.id])
            toast.push({ tone: 'success', title: 'Entry deleted' })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}

function JournalForm({
  open,
  onOpenChange,
  initial,
  accounts,
  projectCodes,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: JournalEntry | null
  accounts: ReturnType<typeof useErp.getState>['accounts']
  projectCodes: string[]
}) {
  const { journal, upsertJournal } = useErp()
  const toast = useToast()
  const [draft, setDraft] = React.useState<JournalEntry>(() => blank(journal))

  React.useEffect(() => {
    if (open) setDraft(initial ? structuredClone(initial) : blank(journal))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const set = <K extends keyof JournalEntry>(k: K, v: JournalEntry[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const patchLine = (id: string, patch: Partial<JournalLine>) =>
    setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))
  const balance = journalIsBalanced(draft)

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-3xl"
      eyebrow={<Badge tone={initial ? 'primary' : 'accent'} size="sm">{initial ? `Editing ${initial.entryNo}` : 'New entry'}</Badge>}
      title={initial ? initial.memo : 'Create a journal entry'}
      description="Debits must equal credits before the entry can be posted."
      footer={
        <>
          <div className="mr-auto flex items-center gap-3 text-[12px]">
            <span className="text-fg-muted">
              Dr <span className="tnum font-semibold text-fg">{fmtCurrency(balance.debit, 'IDR')}</span>
            </span>
            <span className="text-fg-muted">
              Cr <span className="tnum font-semibold text-fg">{fmtCurrency(balance.credit, 'IDR')}</span>
            </span>
            <Badge tone={balance.balanced ? 'success' : 'danger'} size="sm">
              {balance.balanced ? 'Balanced' : `Out by ${fmtCurrency(Math.abs(balance.difference), 'IDR')}`}
            </Badge>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              upsertJournal({ ...draft, status: 'DRAFT' })
              toast.push({ tone: 'success', title: 'Saved as draft' })
              onOpenChange(false)
            }}
          >
            Save draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!balance.balanced}
            onClick={() => {
              upsertJournal({ ...draft, status: 'POSTED', postedAt: new Date().toISOString(), postedBy: 'Elena Marchetti' })
              toast.push({ tone: 'success', title: 'Entry posted', description: draft.entryNo })
              onOpenChange(false)
            }}
          >
            Post entry
          </Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Entry number" required>
          <Input value={draft.entryNo} onChange={(e) => set('entryNo', e.target.value)} className="font-mono" />
        </Field>
        <Field label="Date" required>
          <DatePicker value={draft.date} onChange={(v) => set('date', v ?? draft.date)} />
        </Field>
        <Field label="Memo" required className="sm:col-span-2">
          <Textarea value={draft.memo} onChange={(e) => set('memo', e.target.value)} rows={2} />
        </Field>
        <Field label="Source">
          <Select
            value={draft.source}
            onChange={(v) => set('source', v)}
            options={(['MANUAL', 'AR_INVOICE', 'AP_BILL', 'PAYMENT', 'RECEIPT', 'ACCRUAL', 'FX_REVALUATION', 'CONSIGNMENT_SETTLEMENT'] as const).map((s) => ({ value: s, label: titleCase(s) }))}
          />
        </Field>
        <Field label="Job code" hint="optional — enables job costing">
          <Select
            clearable
            searchable
            value={draft.projectCode ?? null}
            onClear={() => set('projectCode', undefined)}
            onChange={(v) => set('projectCode', v)}
            options={projectCodes.map((c) => ({ value: c, label: c }))}
            placeholder="Company-level entry"
          />
        </Field>
        <Field label="Reference" className="sm:col-span-2">
          <Input value={draft.reference ?? ''} onChange={(e) => set('reference', e.target.value)} className="font-mono" placeholder="INV/AR/26/1250" />
        </Field>
      </div>

      <div className="border-t border-border bg-surface-sunken/50 p-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-fg">Journal lines</p>
          <Button
            variant="secondary"
            size="xs"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                lines: [...d.lines, { id: uid('jl'), accountCode: accounts[0].code, debit: 0, credit: 0 }],
              }))
            }
          >
            <Plus /> Add line
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="grid grid-cols-[1.5fr_1.2fr_0.9fr_0.9fr_36px] gap-2 border-b border-border bg-surface-sunken px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
            <span>Account</span>
            <span>Description</span>
            <span className="text-right">Debit</span>
            <span className="text-right">Credit</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {draft.lines.map((l) => (
              <div key={l.id} className="grid grid-cols-[1.5fr_1.2fr_0.9fr_0.9fr_36px] items-center gap-2 px-3 py-2">
                <Select
                  size="sm"
                  searchable
                  value={l.accountCode}
                  onChange={(v) => patchLine(l.id, { accountCode: v })}
                  options={accounts.map((a) => ({ value: a.code, label: `${a.code} ${a.name}`, description: titleCase(a.type), group: titleCase(a.type) }))}
                />
                <Input
                  value={l.description ?? ''}
                  onChange={(e) => patchLine(l.id, { description: e.target.value })}
                  className="h-8 text-[12.5px]"
                />
                <Input
                  type="number"
                  value={l.debit || ''}
                  onChange={(e) => patchLine(l.id, { debit: Number(e.target.value), credit: 0 })}
                  className="tnum h-8 text-right text-[12.5px]"
                />
                <Input
                  type="number"
                  value={l.credit || ''}
                  onChange={(e) => patchLine(l.id, { credit: Number(e.target.value), debit: 0 })}
                  className="tnum h-8 text-right text-[12.5px]"
                />
                <Button
                  variant="dangerGhost"
                  size="iconXs"
                  onClick={() => setDraft((d) => ({ ...d, lines: d.lines.filter((x) => x.id !== l.id) }))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1.5fr_1.2fr_0.9fr_0.9fr_36px] gap-2 border-t border-border bg-surface-sunken px-3 py-2 text-[12px] font-semibold">
            <span className="col-span-2 text-fg-muted">Totals</span>
            <span className="tnum text-right text-fg">{fmtCurrency(balance.debit, 'IDR')}</span>
            <span className="tnum text-right text-fg">{fmtCurrency(balance.credit, 'IDR')}</span>
            <span />
          </div>
        </div>
        {!balance.balanced && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-danger">
            <AlertTriangle className="size-3.5" />
            Debits and credits differ by {fmtCurrency(Math.abs(balance.difference), 'IDR')} — the entry can be saved as a draft
            but not posted.
          </p>
        )}
      </div>
    </Sheet>
  )
}

function blank(existing: JournalEntry[]): JournalEntry {
  return {
    id: uid('je'),
    entryNo: nextCode('JV', existing.map((j) => j.entryNo), 4, true),
    date: new Date().toISOString().slice(0, 10),
    memo: '', source: 'MANUAL', currency: 'IDR', fxRate: 1, status: 'DRAFT',
    lines: [
      { id: uid('jl'), accountCode: '1-1300', debit: 0, credit: 0 },
      { id: uid('jl'), accountCode: '4-4100', debit: 0, credit: 0 },
    ],
  }
}
