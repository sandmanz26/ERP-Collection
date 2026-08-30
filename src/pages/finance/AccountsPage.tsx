import * as React from 'react'
import { Boxes, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Account } from '@/data/types'
import { ACCOUNT_TYPE_META } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { Sheet } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/checkbox'
import { trialBalance } from '@/lib/analytics'
import { fmtCurrency, titleCase } from '@/lib/format'
import { uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

export function AccountsPage() {
  const toast = useToast()
  const { accounts, journal, removeAccounts, importAccounts } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Account | null>(null)
  const [deleting, setDeleting] = React.useState<Account | null>(null)
  const [type, setType] = React.useState<string[]>([])

  const balances = trialBalance(accounts, journal)
  const balanceOf = (a: Account) => balances.find((b) => b.account.code === a.code)?.balance ?? 0
  const used = new Set(journal.flatMap((j) => j.lines.map((l) => l.accountCode)))

  const columns: Column<Account>[] = [
    {
      key: 'code', header: 'Code', width: 'w-[112px]', pinned: true, sortable: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg">{r.code}</span>,
    },
    {
      key: 'name', header: 'Account name', width: 'min-w-[280px]', sortable: true,
      sortValue: (r) => r.name, exportValue: (r) => r.name,
      cell: (r) => <span className="text-fg">{r.name}</span>,
    },
    {
      key: 'type', header: 'Type', width: 'w-[176px]', sortable: true,
      sortValue: (r) => r.type, exportValue: (r) => r.type,
      cell: (r) => (
        <Badge tone={ACCOUNT_TYPE_META[r.type].tone as BadgeTone} size="sm">
          {ACCOUNT_TYPE_META[r.type].label}
        </Badge>
      ),
    },
    {
      key: 'normalBalance', header: 'Normal', width: 'w-[104px]', sortable: true,
      sortValue: (r) => r.normalBalance, exportValue: (r) => r.normalBalance,
      cell: (r) => <span className="text-[12px] text-fg-muted">{titleCase(r.normalBalance)}</span>,
    },
    {
      key: 'group', header: 'Statement', width: 'w-[164px]', sortable: true, defaultHidden: true,
      sortValue: (r) => ACCOUNT_TYPE_META[r.type].group,
      exportValue: (r) => ACCOUNT_TYPE_META[r.type].group,
      cell: (r) => <span className="text-[12px] text-fg-muted">{titleCase(ACCOUNT_TYPE_META[r.type].group)}</span>,
    },
    {
      key: 'currency', header: 'Currency', width: 'w-[100px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.currency, exportValue: (r) => r.currency,
      cell: (r) => <span className="font-mono text-[12px] text-fg-muted">{r.currency}</span>,
    },
    {
      key: 'balance', header: 'Balance', width: 'w-[168px]', align: 'right', sortable: true,
      sortValue: (r) => balanceOf(r), exportValue: (r) => Math.round(balanceOf(r)),
      cell: (r) => {
        const b = balanceOf(r)
        return (
          <span className={`tnum text-[12.5px] ${b === 0 ? 'text-fg-subtle' : 'font-medium text-fg'}`}>
            {b === 0 ? '—' : fmtCurrency(b, 'IDR', { compact: true })}
          </span>
        )
      },
    },
    {
      key: 'usage', header: 'Postings', width: 'w-[104px]', align: 'right', sortable: true,
      sortValue: (r) => journal.flatMap((j) => j.lines).filter((l) => l.accountCode === r.code).length,
      exportValue: (r) => journal.flatMap((j) => j.lines).filter((l) => l.accountCode === r.code).length,
      cell: (r) => {
        const n = journal.flatMap((j) => j.lines).filter((l) => l.accountCode === r.code).length
        return <span className="tnum text-[12.5px] text-fg-muted">{n}</span>
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="Chart of Accounts"
        description="The account structure behind the ledger, laid out the way an Indonesian forwarder needs it: freight revenue split by mode, cost of service separated from operating expense, and dedicated accounts for PPN, PPh 23 and consignment settlement."
        actions={
          <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus /> New account
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Accounts" value={accounts.length} icon={<Boxes />} accent="primary" sub={`${used.size} with postings`} />
        <KpiCard label="Revenue accounts" value={accounts.filter((a) => a.type === 'REVENUE').length} accent="success" sub="Split by service line" />
        <KpiCard label="Cost of service" value={accounts.filter((a) => a.type === 'COGS').length} accent="warning" sub="Direct shipment cost" />
        <KpiCard label="Unused accounts" value={accounts.length - used.size} accent="accent" sub="Candidates for cleanup" />
      </div>

      <DataTable
        data={accounts}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.code} — ${r.name}`}
        entityLabel="account"
        storageKey="accounts"
        exportName="chart-of-accounts"
        initialSort={{ key: 'code', dir: 'asc' }}
        pageSize={50}
        searchText={(r) => [r.code, r.name, r.type, r.currency].join(' ')}
        onRowClick={(r) => { setEditing(r); setFormOpen(true) }}
        filters={[
          {
            key: 'type', label: 'Account type', values: type, onChange: setType,
            options: Object.entries(ACCOUNT_TYPE_META).map(([k, v]) => ({ value: k, label: v.label })),
            match: (r, v) => v.includes(r.type),
          },
        ]}
        onDelete={(ids) => {
          removeAccounts(ids)
          toast.push({ tone: 'success', title: `${ids.length} accounts deleted` })
        }}
        cascadeWarning={(rows) => {
          const inUse = rows.filter((r) => used.has(r.code))
          return inUse.length
            ? [`${inUse.map((r) => r.code).join(', ')} still carry journal postings — those lines will lose their account name in the reports`]
            : []
        }}
        importFields={[
          { key: 'code', label: 'Account code', required: true },
          { key: 'name', label: 'Account name', required: true },
          { key: 'type', label: 'Type', required: true, hint: 'ASSET / LIABILITY / EQUITY / REVENUE / COGS / EXPENSE' },
          { key: 'normalBalance', label: 'Normal balance', hint: 'DEBIT / CREDIT' },
          { key: 'currency', label: 'Currency' },
        ]}
        importSample={{ code: '5-5600', name: 'Warehouse & Handling Cost', type: 'COGS', normalBalance: 'DEBIT', currency: 'IDR' }}
        toImportRow={(r) => ({
          code: r.code, name: r.name, type: r.type, normalBalance: r.normalBalance, currency: r.currency,
        })}
        onImport={(rows) => {
          const mapped = rows.map((r) => {
            const existing = accounts.find((a) => a.code === r.code)
            const t = (['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE'].includes(r.type) ? r.type : 'EXPENSE') as Account['type']
            return {
              id: existing?.id ?? uid('acc'),
              code: r.code,
              name: r.name,
              type: t,
              normalBalance: (r.normalBalance === 'CREDIT' || ['LIABILITY', 'EQUITY', 'REVENUE'].includes(t) ? 'CREDIT' : 'DEBIT') as Account['normalBalance'],
              isPostable: true,
              currency: (r.currency || 'IDR') as Account['currency'],
            } as Account
          })
          importAccounts(mapped)
          toast.push({ tone: 'success', title: `${mapped.length} accounts imported` })
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
      />

      <AccountForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="account"
        items={deleting ? [`${deleting.code} — ${deleting.name}`] : []}
        destructiveNote={deleting && used.has(deleting.code) ? 'This account carries journal postings.' : undefined}
        onConfirm={() => {
          if (deleting) {
            removeAccounts([deleting.id])
            toast.push({ tone: 'success', title: 'Account deleted' })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}

function AccountForm({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (v: boolean) => void; initial?: Account | null }) {
  const { upsertAccount } = useErp()
  const toast = useToast()
  const [draft, setDraft] = React.useState<Account>(() => blank())

  React.useEffect(() => {
    if (open) setDraft(initial ? structuredClone(initial) : blank())
  }, [open, initial])

  const set = <K extends keyof Account>(k: K, v: Account[K]) => setDraft((d) => ({ ...d, [k]: v }))

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-lg"
      title={initial ? `${initial.code} — ${initial.name}` : 'Create an account'}
      description="Account type decides which statement the balance lands on and which side is its normal balance."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              upsertAccount(draft)
              toast.push({ tone: 'success', title: initial ? 'Account updated' : 'Account created', description: `${draft.code} — ${draft.name}` })
              onOpenChange(false)
            }}
          >
            {initial ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 p-5">
        <Field label="Account code" required>
          <Input value={draft.code} onChange={(e) => set('code', e.target.value)} className="font-mono" placeholder="5-5600" />
        </Field>
        <Field label="Account name" required>
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Type">
          <Select
            value={draft.type}
            onChange={(v) => {
              set('type', v)
              set('normalBalance', ['LIABILITY', 'EQUITY', 'REVENUE'].includes(v) ? 'CREDIT' : 'DEBIT')
            }}
            options={Object.entries(ACCOUNT_TYPE_META).map(([k, v]) => ({
              value: k as Account['type'],
              label: v.label,
              description: titleCase(v.group),
            }))}
          />
        </Field>
        <Field label="Normal balance">
          <Select
            value={draft.normalBalance}
            onChange={(v) => set('normalBalance', v)}
            options={[
              { value: 'DEBIT', label: 'Debit', description: 'Assets, cost and expense' },
              { value: 'CREDIT', label: 'Credit', description: 'Liabilities, equity and revenue' },
            ]}
          />
        </Field>
        <Field label="Currency">
          <Select
            value={draft.currency}
            onChange={(v) => set('currency', v)}
            options={(['IDR', 'USD', 'EUR', 'SGD', 'AUD'] as const).map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Field label="Postable">
          <div className="flex h-9 items-center gap-2.5">
            <Switch checked={draft.isPostable} onChange={(v) => set('isPostable', v)} />
            <span className="text-[12.5px] text-fg-muted">
              {draft.isPostable ? 'Journal lines can be booked here' : 'Header account — roll-up only'}
            </span>
          </div>
        </Field>
      </div>
    </Sheet>
  )
}

function blank(): Account {
  return { id: uid('acc'), code: '', name: '', type: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, currency: 'IDR' }
}
