import * as React from 'react'
import { Building, Pencil, Plus, Trash2, UserCog, Users } from 'lucide-react'
import type { Division } from '@/data/types'
import { BRANCHES } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { useAuth } from '@/store/useAuth'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { useToast } from '@/components/ui/toast'
import { uid } from '@/lib/utils'
import { useCan } from '@/lib/access'
import { fmtCurrency } from '@/lib/format'
import { mrRequestTotal } from '@/lib/procurement'

const blank = (): Division => ({
  id: uid('div'), code: '', name: '', headName: '', costCenter: '', branchCode: 'JKT',
  email: '', status: 'ACTIVE', notes: '', createdAt: new Date().toISOString(),
})

function DivisionForm({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Division | null
}) {
  const { divisions, upsertDivision } = useErp()
  const users = useAuth((s) => s.users)
  const toast = useToast()
  const [draft, setDraft] = React.useState<Division>(blank)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank())
      setErrors({})
    }
  }, [open, initial])

  const set = <K extends keyof Division>(k: K, v: Division[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.code.trim()) e.code = 'A division code is required'
    if (divisions.some((d) => d.code === draft.code && d.id !== draft.id)) e.code = 'This code is already used'
    if (!draft.name.trim()) e.name = 'The division name is required'
    if (!draft.costCenter.trim()) e.costCenter = 'A cost centre is required — the request is booked against it'
    if (!draft.headName.trim()) e.headName = 'Name the head; only they can submit the division request'
    setErrors(e)
    if (Object.keys(e).length) return
    upsertDivision(draft)
    toast.push({ tone: 'success', title: initial ? 'Division updated' : 'Division created', description: `${draft.code} — ${draft.name}` })
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-2xl"
      eyebrow={<Badge tone={initial ? 'primary' : 'accent'} size="sm">{initial ? `Editing ${initial.code}` : 'New division'}</Badge>}
      title={initial ? initial.name : 'Create a division'}
      description="A division files one material request per monthly session, submitted by its head."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save}>{initial ? 'Save changes' : 'Create division'}</Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Division code" required error={errors.code}>
          <Input value={draft.code} onChange={(e) => set('code', e.target.value.toUpperCase())} className="font-mono" placeholder="DIV-OPS" invalid={!!errors.code} />
        </Field>
        <Field label="Status" help="An inactive division cannot file a request.">
          <Select
            value={draft.status}
            onChange={(v) => set('status', v)}
            options={[
              { value: 'ACTIVE', label: 'Active', description: 'Can file a material request' },
              { value: 'INACTIVE', label: 'Inactive', description: 'Kept for history only' },
            ]}
          />
        </Field>
        <Field label="Division name" required error={errors.name} className="sm:col-span-2">
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Operasional Lapangan" invalid={!!errors.name} />
        </Field>
        <Field label="Head of division" required error={errors.headName}>
          <Input value={draft.headName} onChange={(e) => set('headName', e.target.value)} invalid={!!errors.headName} />
        </Field>
        <Field label="Head's account" help="The account that opens the division request page. Without it, nobody can submit.">
          <Select
            searchable
            clearable
            value={draft.headUserId ?? null}
            onChange={(v) => {
              const user = users.find((u) => u.id === v)
              setDraft((d) => ({ ...d, headUserId: v, headName: user?.fullName ?? d.headName }))
            }}
            onClear={() => set('headUserId', undefined)}
            placeholder="Not linked"
            options={users.map((u) => ({ value: u.id, label: u.fullName, description: `${u.jobTitle} · ${u.email}` }))}
          />
        </Field>
        <Field label="Cost centre" required error={errors.costCenter}>
          <Input value={draft.costCenter} onChange={(e) => set('costCenter', e.target.value.toUpperCase())} className="font-mono" placeholder="CC-2100" invalid={!!errors.costCenter} />
        </Field>
        <Field label="Branch">
          <Select value={draft.branchCode} onChange={(v) => set('branchCode', v)} options={BRANCHES.map((b) => ({ value: b.code, label: b.label }))} />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <Input type="email" value={draft.email ?? ''} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={2} />
        </Field>
      </div>
    </Sheet>
  )
}

export function DivisionsPage() {
  const toast = useToast()
  const can = useCan()
  const { divisions, mrRequests, items, removeDivisions } = useErp()
  const users = useAuth((s) => s.users)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Division | null>(null)
  const [deleting, setDeleting] = React.useState<Division | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [branch, setBranch] = React.useState<string[]>([])

  const requestsOf = (d: Division) => mrRequests.filter((r) => r.divisionId === d.id)
  const spendOf = (d: Division) =>
    requestsOf(d)
      .filter((r) => r.status === 'APPROVED')
      .reduce((a, r) => a + mrRequestTotal(r, items), 0)
  const headless = divisions.filter((d) => d.status === 'ACTIVE' && !d.headUserId)

  const columns: Column<Division>[] = [
    {
      key: 'code', header: 'Code', width: 'w-[118px]', pinned: true, sortable: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.code}</span>,
    },
    {
      key: 'name', header: 'Division', width: 'w-[260px] max-w-[260px]', sortable: true,
      sortValue: (r) => r.name, exportValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.name}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.notes || r.email || '—'}</p>
        </div>
      ),
    },
    {
      key: 'head', header: 'Head of division', width: 'w-[210px] max-w-[210px]', sortable: true,
      sortValue: (r) => r.headName, exportValue: (r) => r.headName,
      cell: (r) => {
        const account = users.find((u) => u.id === r.headUserId)
        return (
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-fg">{r.headName}</p>
            {account ? (
              <p className="truncate text-[11px] text-fg-subtle">{account.email}</p>
            ) : (
              <Badge tone="warning" size="sm">No account linked</Badge>
            )}
          </div>
        )
      },
    },
    {
      key: 'costCenter', header: 'Cost centre', width: 'w-[126px]', sortable: true,
      sortValue: (r) => r.costCenter, exportValue: (r) => r.costCenter,
      cell: (r) => <span className="font-mono text-[12px] text-fg-muted">{r.costCenter}</span>,
    },
    {
      key: 'branch', header: 'Branch', width: 'w-[110px]', sortable: true,
      sortValue: (r) => r.branchCode, exportValue: (r) => r.branchCode,
      cell: (r) => <span className="text-[12.5px] text-fg-muted">{r.branchCode}</span>,
    },
    {
      key: 'requests', header: 'MR filed', width: 'w-[104px]', align: 'right', sortable: true,
      sortValue: (r) => requestsOf(r).length, exportValue: (r) => requestsOf(r).length,
      headerHint: 'Requests filed across every session',
      cell: (r) => <span className="tnum text-[12.5px] text-fg">{requestsOf(r).length || '—'}</span>,
    },
    {
      key: 'spend', header: 'Approved value', width: 'w-[156px]', align: 'right', sortable: true,
      sortValue: spendOf, exportValue: (r) => Math.round(spendOf(r)),
      headerHint: 'Estimated value of everything this division has had approved',
      cell: (r) => (
        <span className="tnum text-[12.5px] font-medium text-fg">
          {spendOf(r) ? fmtCurrency(spendOf(r), 'IDR', { compact: true }) : '—'}
        </span>
      ),
    },
    {
      key: 'status', header: 'Status', width: 'w-[112px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
  ]

  return (
    <>
      <PageHeader
        title="Divisions"
        description="The company units that raise material requests. Each files one request per session, submitted by its head."
        actions={
          can('divisions.create') ? (
            <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus /> New division
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Divisions" value={divisions.length} icon={<Building />} accent="primary" sub={`${divisions.filter((d) => d.status === 'ACTIVE').length} can file a request`} />
        <KpiCard label="Branches covered" value={new Set(divisions.map((d) => d.branchCode)).size} icon={<Building />} accent="accent" sub={BRANCHES.map((b) => b.code).join(' · ')} />
        <KpiCard
          label="Without a head account"
          value={headless.length}
          icon={<UserCog />}
          accent={headless.length ? 'warning' : 'success'}
          sub={headless.length ? 'cannot submit a request until linked' : 'every active division can submit'}
        />
        <KpiCard label="Requests filed" value={mrRequests.length} icon={<Users />} accent="purple" sub="across every session" />
      </div>

      <DataTable
        data={divisions}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.code} — ${r.name}`}
        entityLabel="division"
        storageKey="divisions"
        allowExport={can('divisions.view')}
        exportName="tata-gemilang-divisions"
        searchText={(r) => [r.code, r.name, r.headName, r.costCenter, r.branchCode, r.email, r.notes].filter(Boolean).join(' ')}
        initialSort={{ key: 'code', dir: 'asc' }}
        onRowClick={can('divisions.edit') ? (r) => { setEditing(r); setFormOpen(true) } : undefined}
        rowTone={(r) => (r.status === 'INACTIVE' ? 'bg-bg-muted/60' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: [
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ],
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'branch', label: 'Branch', values: branch, onChange: setBranch,
            options: BRANCHES.map((b) => ({ value: b.code, label: b.label })),
            match: (r, v) => v.includes(r.branchCode),
          },
        ]}
        onDelete={
          can('divisions.delete')
            ? (ids) => {
                const withHistory = ids.filter((id) => mrRequests.some((r) => r.divisionId === id))
                if (withHistory.length) {
                  toast.push({
                    tone: 'error',
                    title: 'Deletion refused',
                    description: 'A division that has already filed a material request cannot be deleted — set it inactive instead, so the history keeps its name.',
                  })
                  return
                }
                removeDivisions(ids)
                toast.push({ tone: 'success', title: `${ids.length} division${ids.length === 1 ? '' : 's'} deleted` })
              }
            : undefined
        }
        deleteNote="A division with request history can only be set inactive, never deleted."
        rowActions={(r) => (
          <>
            {can('divisions.edit') && (
              <Tooltip content="Edit">
                <Button variant="ghost" size="iconXs" onClick={() => { setEditing(r); setFormOpen(true) }}>
                  <Pencil />
                </Button>
              </Tooltip>
            )}
            {can('divisions.delete') && (
              <Tooltip content="Delete">
                <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}>
                  <Trash2 />
                </Button>
              </Tooltip>
            )}
          </>
        )}
        emptyTitle="No divisions"
        emptyDescription="Create the units that will raise material requests."
      />

      <DivisionForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="division"
        items={deleting ? [`${deleting.code} — ${deleting.name}`] : []}
        cascade={deleting && requestsOf(deleting).length ? [`${requestsOf(deleting).length} material requests were filed by it`] : []}
        onConfirm={() => {
          if (!deleting) return
          if (requestsOf(deleting).length) {
            toast.push({ tone: 'error', title: 'Deletion refused', description: 'Set it inactive instead — its requests are part of the record.' })
            setDeleting(null)
            return
          }
          removeDivisions([deleting.id])
          toast.push({ tone: 'success', title: 'Division deleted', description: deleting.code })
          setDeleting(null)
        }}
      />
    </>
  )
}
