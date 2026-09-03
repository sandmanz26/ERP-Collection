import * as React from 'react'
import { Handshake, History, Pencil, Plus, Star, Trash2, TrendingUp } from 'lucide-react'
import type { ItemCategory, Supplier } from '@/data/types'
import { ITEM_CATEGORIES, PROVINCES, itemCategoryLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { MultiSelect, Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { EmptyState } from '@/components/ui/misc'
import { ConfirmDelete } from '@/components/ui/confirm'
import { useToast } from '@/components/ui/toast'
import { uid } from '@/lib/utils'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'

const blank = (): Supplier => ({
  id: uid('sup'), code: '', legalName: '', brandName: '', categories: [],
  picName: '', picPhone: '', picEmail: '', address: '', city: '', province: 'DKI Jakarta', npwp: '',
  paymentTermDays: 30, leadTimeDays: 14, bankName: '', bankAccount: '',
  rating: 4, onTimeRate: 90, status: 'ACTIVE', supplierSince: new Date().toISOString(), notes: '',
})

function SupplierForm({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Supplier | null
}) {
  const { suppliers, items, purchasePrices, upsertSupplier } = useErp()
  const toast = useToast()
  const [tab, setTab] = React.useState<'profile' | 'terms' | 'history'>('profile')
  const [draft, setDraft] = React.useState<Supplier>(blank)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank())
      setTab('profile')
      setErrors({})
    }
  }, [open, initial])

  const set = <K extends keyof Supplier>(k: K, v: Supplier[K]) => setDraft((d) => ({ ...d, [k]: v }))

  /** Everything this supplier has been paid, newest first. */
  const history = React.useMemo(
    () =>
      purchasePrices
        .filter((p) => p.supplierId === draft.id)
        .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt)),
    [purchasePrices, draft.id],
  )

  const save = () => {
    const e: Record<string, string> = {}
    if (!draft.code.trim()) e.code = 'A supplier code is required'
    if (suppliers.some((x) => x.code === draft.code && x.id !== draft.id)) e.code = 'This code is already used'
    if (!draft.legalName.trim()) e.legalName = 'The legal name is required'
    if (draft.categories.length === 0) e.categories = 'Name at least one category — it decides which purchase request lines can be assigned here'
    if (!draft.picName.trim()) e.picName = 'Name the contact person'
    if (draft.rating < 1 || draft.rating > 5) e.rating = 'Between 1 and 5'
    setErrors(e)
    if (Object.keys(e).length) return
    upsertSupplier(draft)
    toast.push({ tone: 'success', title: initial ? 'Supplier updated' : 'Supplier created', description: `${draft.code} — ${draft.legalName}` })
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-3xl"
      eyebrow={<Badge tone={initial ? 'primary' : 'accent'} size="sm">{initial ? `Editing ${initial.code}` : 'New supplier'}</Badge>}
      title={initial ? initial.legalName : 'Register a supplier'}
      description="The categories decide which purchase request lines this supplier can be assigned to."
      footer={
        <>
          <span className="mr-auto text-[12px] text-fg-muted">{history.length} recorded purchases</span>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save}>{initial ? 'Save changes' : 'Create supplier'}</Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        className="px-5"
        items={[
          { value: 'profile', label: 'Profile', icon: <Handshake /> },
          { value: 'terms', label: 'Terms & performance', icon: <TrendingUp /> },
          { value: 'history', label: 'Price history', icon: <History />, count: history.length },
        ]}
      />

      {tab === 'profile' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Supplier code" required error={errors.code}>
            <Input value={draft.code} onChange={(e) => set('code', e.target.value.toUpperCase())} className="font-mono" placeholder="SUP-0011" invalid={!!errors.code} />
          </Field>
          <Field label="Status" help="A blacklisted supplier can never be assigned to a purchase request line.">
            <Select
              value={draft.status}
              onChange={(v) => set('status', v)}
              options={[
                { value: 'ACTIVE', label: 'Active', description: 'Can be assigned and ordered from' },
                { value: 'ON_HOLD', label: 'On hold', description: 'Kept for price comparison only' },
                { value: 'BLACKLISTED', label: 'Blacklisted', description: 'Cannot be assigned at all' },
              ]}
            />
          </Field>
          <Field label="Legal name" required error={errors.legalName} className="sm:col-span-2">
            <Input value={draft.legalName} onChange={(e) => set('legalName', e.target.value)} placeholder="PT Contoh Pemasok Nusantara" invalid={!!errors.legalName} />
          </Field>
          <Field label="Brand name" hint="optional">
            <Input value={draft.brandName ?? ''} onChange={(e) => set('brandName', e.target.value)} />
          </Field>
          <Field label="NPWP">
            <Input value={draft.npwp ?? ''} onChange={(e) => set('npwp', e.target.value)} className="font-mono" />
          </Field>
          <Field label="Approved categories" required error={errors.categories} className="sm:col-span-2">
            <MultiSelect
              values={draft.categories}
              onChange={(v) => set('categories', v as ItemCategory[])}
              options={ITEM_CATEGORIES.map((c) => ({ value: c.value, label: c.label, description: c.description }))}
              placeholder="Pick at least one"
              maxTags={3}
            />
          </Field>
          <Field label="Contact person" required error={errors.picName}>
            <Input value={draft.picName} onChange={(e) => set('picName', e.target.value)} invalid={!!errors.picName} />
          </Field>
          <Field label="Contact phone">
            <Input value={draft.picPhone} onChange={(e) => set('picPhone', e.target.value)} />
          </Field>
          <Field label="Contact email" className="sm:col-span-2">
            <Input type="email" value={draft.picEmail ?? ''} onChange={(e) => set('picEmail', e.target.value)} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={draft.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field label="City">
            <Input value={draft.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="Province">
            <Select searchable value={draft.province} onChange={(v) => set('province', v)} options={PROVINCES.map((p) => ({ value: p, label: p }))} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={2} />
          </Field>
        </div>
      )}

      {tab === 'terms' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Payment term (days)">
            <Input type="number" value={draft.paymentTermDays} onChange={(e) => set('paymentTermDays', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Lead time (days)" help="Shown on a purchase request line so purchasing knows when to order.">
            <Input type="number" value={draft.leadTimeDays} onChange={(e) => set('leadTimeDays', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Minimum order value (IDR)" hint={draft.minOrderValue ? fmtCurrency(draft.minOrderValue, 'IDR', { compact: true }) : 'none'}>
            <Input
              type="number"
              value={draft.minOrderValue ?? ''}
              onChange={(e) => set('minOrderValue', e.target.value === '' ? undefined : Number(e.target.value))}
              className="tnum"
            />
          </Field>
          <Field label="Supplier since">
            <Input type="date" value={draft.supplierSince.slice(0, 10)} onChange={(e) => set('supplierSince', new Date(e.target.value).toISOString())} className="tnum" />
          </Field>
          <Field label="Rating (1–5)" required error={errors.rating}>
            <Input type="number" step={0.1} min={1} max={5} value={draft.rating} onChange={(e) => set('rating', Number(e.target.value))} className="tnum" invalid={!!errors.rating} />
          </Field>
          <Field label="On-time delivery (%)">
            <Input type="number" min={0} max={100} value={draft.onTimeRate} onChange={(e) => set('onTimeRate', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Bank">
            <Input value={draft.bankName ?? ''} onChange={(e) => set('bankName', e.target.value)} />
          </Field>
          <Field label="Account number">
            <Input value={draft.bankAccount ?? ''} onChange={(e) => set('bankAccount', e.target.value)} className="font-mono" />
          </Field>
        </div>
      )}

      {tab === 'history' && (
        <div className="p-5">
          {history.length === 0 ? (
            <EmptyState
              icon={<History />}
              title="Nothing purchased yet"
              description="Prices appear here once a purchase order against this supplier has been recorded. Until then, a purchase request line assigned to them shows no last price."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr>
                    {['Purchased', 'PO', 'Item', 'Qty', 'Unit price', 'Value'].map((h) => (
                      <th key={h} className="whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => {
                    const item = items.find((i) => i.id === row.itemId)
                    return (
                      <tr key={row.id}>
                        <td className="tnum whitespace-nowrap border-b border-border px-3 py-2 text-[12px] text-fg-muted">{fmtDate(row.purchasedAt)}</td>
                        <td className="whitespace-nowrap border-b border-border px-3 py-2 font-mono text-[11.5px] text-fg-subtle">{row.poNumber}</td>
                        <td className="border-b border-border px-3 py-2">
                          <p className="max-w-[240px] truncate text-[12.5px] font-medium text-fg">{item?.name ?? 'Removed item'}</p>
                          <p className="font-mono text-[11px] text-fg-subtle">{item?.sku}</p>
                        </td>
                        <td className="tnum border-b border-border px-3 py-2 text-right text-fg-muted">{fmtNumber(row.qty)}</td>
                        <td className="tnum whitespace-nowrap border-b border-border px-3 py-2 text-right font-medium text-fg">{fmtCurrency(row.unitPrice, 'IDR')}</td>
                        <td className="tnum whitespace-nowrap border-b border-border px-3 py-2 text-right text-fg-muted">{fmtCurrency(row.unitPrice * row.qty, 'IDR', { compact: true })}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}

export function SuppliersPage() {
  const toast = useToast()
  const can = useCan()
  const { suppliers, purchasePrices, purchaseRequests, items, removeSuppliers, importSuppliers } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Supplier | null>(null)
  const [deleting, setDeleting] = React.useState<Supplier | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [category, setCategory] = React.useState<string[]>([])

  const purchasesOf = (s: Supplier) => purchasePrices.filter((p) => p.supplierId === s.id)
  const spendOf = (s: Supplier) => purchasesOf(s).reduce((a, p) => a + p.unitPrice * p.qty, 0)
  const lastOf = (s: Supplier) => purchasesOf(s).sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))[0]
  const openLines = (s: Supplier) =>
    purchaseRequests
      .filter((pr) => pr.status !== 'CANCELLED')
      .flatMap((pr) => pr.lines)
      .filter((l) => l.supplierId === s.id).length

  const columns: Column<Supplier>[] = [
    {
      key: 'code', header: 'Code', width: 'w-[112px]', pinned: true, sortable: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.code}</span>,
    },
    {
      key: 'name', header: 'Supplier', width: 'w-[250px] max-w-[250px]', sortable: true,
      sortValue: (r) => r.legalName, exportValue: (r) => r.legalName,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.brandName || r.legalName}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.legalName} · {r.city}</p>
        </div>
      ),
    },
    {
      key: 'categories', header: 'Approved for', width: 'w-[210px] max-w-[210px]', sortable: true,
      sortValue: (r) => r.categories.join(','), exportValue: (r) => r.categories.join(' | '),
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.categories.slice(0, 2).map((c) => (
            <Badge key={c} tone="outline" size="sm">{itemCategoryLabel(c)}</Badge>
          ))}
          {r.categories.length > 2 && <Badge tone="neutral" size="sm">+{r.categories.length - 2}</Badge>}
        </div>
      ),
    },
    {
      key: 'terms', header: 'Terms', width: 'w-[150px]', sortable: true,
      sortValue: (r) => r.leadTimeDays, exportValue: (r) => `Net ${r.paymentTermDays} / ${r.leadTimeDays}d`,
      cell: (r) => (
        <div className="min-w-0">
          <p className="text-[12.5px] text-fg">Net {r.paymentTermDays}</p>
          <p className="tnum text-[11px] text-fg-subtle">{r.leadTimeDays} day lead time</p>
        </div>
      ),
    },
    {
      key: 'rating', header: 'Rating', width: 'w-[124px]', align: 'right', sortable: true,
      sortValue: (r) => r.rating, exportValue: (r) => r.rating,
      cell: (r) => (
        <div className="text-right">
          <p className="tnum inline-flex items-center gap-1 text-[12.5px] font-medium text-fg">
            <Star className={`size-3 ${r.rating >= 4.5 ? 'text-warning' : 'text-fg-subtle'}`} /> {r.rating.toFixed(1)}
          </p>
          <p className={`tnum text-[11px] ${r.onTimeRate < 80 ? 'text-danger' : 'text-fg-subtle'}`}>{r.onTimeRate}% on time</p>
        </div>
      ),
    },
    {
      key: 'purchases', header: 'Purchases', width: 'w-[118px]', align: 'right', sortable: true,
      sortValue: (r) => purchasesOf(r).length, exportValue: (r) => purchasesOf(r).length,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{purchasesOf(r).length || '—'}</span>,
    },
    {
      key: 'spend', header: 'Historic value', width: 'w-[156px]', align: 'right', sortable: true,
      sortValue: spendOf, exportValue: (r) => Math.round(spendOf(r)),
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{spendOf(r) ? fmtCurrency(spendOf(r), 'IDR', { compact: true }) : '—'}</span>,
    },
    {
      key: 'last', header: 'Last purchase', width: 'w-[142px]', sortable: true, defaultHidden: true,
      sortValue: (r) => lastOf(r)?.purchasedAt ?? '', exportValue: (r) => lastOf(r)?.purchasedAt.slice(0, 10) ?? '',
      cell: (r) => {
        const last = lastOf(r)
        if (!last) return <span className="text-[12px] text-fg-subtle">never</span>
        const item = items.find((i) => i.id === last.itemId)
        return (
          <div className="min-w-0">
            <p className="tnum text-[12px] text-fg-muted">{fmtDate(last.purchasedAt)}</p>
            <p className="truncate text-[11px] text-fg-subtle">{item?.sku}</p>
          </div>
        )
      },
    },
    {
      key: 'openLines', header: 'On open PR', width: 'w-[124px]', align: 'right', sortable: true,
      sortValue: openLines, exportValue: openLines,
      headerHint: 'Purchase request lines currently assigned to this supplier',
      cell: (r) => (openLines(r) ? <Badge tone="primary" size="sm">{openLines(r)} lines</Badge> : <span className="text-[12px] text-fg-subtle">—</span>),
    },
    {
      key: 'status', header: 'Status', width: 'w-[128px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
  ]

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Approved vendors, what they are approved to supply, and every price they have actually charged."
        actions={
          can('suppliers.create') ? (
            <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus /> New supplier
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Suppliers"
          value={suppliers.length}
          icon={<Handshake />}
          accent="primary"
          sub={`${suppliers.filter((s) => s.status === 'ACTIVE').length} active · ${suppliers.filter((s) => s.status !== 'ACTIVE').length} restricted`}
        />
        <KpiCard label="Recorded purchases" value={purchasePrices.length} icon={<History />} accent="accent" sub="the basis of every last price" />
        <KpiCard
          label="Historic value"
          value={fmtCurrency(purchasePrices.reduce((a, p) => a + p.unitPrice * p.qty, 0), 'IDR', { compact: true })}
          icon={<TrendingUp />}
          accent="purple"
          sub="across every recorded purchase order"
        />
        <KpiCard
          label="Below 85% on time"
          value={suppliers.filter((s) => s.onTimeRate < 85).length}
          icon={<Star />}
          accent={suppliers.filter((s) => s.onTimeRate < 85).length ? 'warning' : 'success'}
          sub="worth a conversation before the next order"
        />
      </div>

      <DataTable
        data={suppliers}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.code} — ${r.legalName}`}
        entityLabel="supplier"
        storageKey="suppliers"
        allowExport={can('suppliers.export')}
        exportName="tata-gemilang-suppliers"
        searchText={(r) => [r.code, r.legalName, r.brandName, r.picName, r.city, r.province, r.notes, ...r.categories].filter(Boolean).join(' ')}
        initialSort={{ key: 'code', dir: 'asc' }}
        onRowClick={(r) => { setEditing(r); setFormOpen(true) }}
        rowTone={(r) => (r.status === 'BLACKLISTED' ? 'bg-danger-soft/20' : r.status === 'ON_HOLD' ? 'bg-warning-soft/25' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: [
              { value: 'ACTIVE', label: 'Active' },
              { value: 'ON_HOLD', label: 'On hold' },
              { value: 'BLACKLISTED', label: 'Blacklisted' },
            ],
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'category', label: 'Approved for', values: category, onChange: setCategory,
            options: ITEM_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
            match: (r, v) => r.categories.some((c) => v.includes(c)),
          },
        ]}
        onDelete={
          can('suppliers.delete')
            ? (ids) => {
                removeSuppliers(ids)
                toast.push({ tone: 'success', title: `${ids.length} supplier${ids.length === 1 ? '' : 's'} deleted` })
              }
            : undefined
        }
        cascadeWarning={(rows) => {
          const prices = purchasePrices.filter((p) => rows.some((r) => r.id === p.supplierId))
          const lines = purchaseRequests.flatMap((pr) => pr.lines).filter((l) => rows.some((r) => r.id === l.supplierId))
          const out: string[] = []
          if (prices.length) out.push(`${prices.length} recorded purchases are deleted with them — the last price on those items disappears`)
          if (lines.length) out.push(`${lines.length} purchase request lines lose their assigned supplier`)
          return out
        }}
        deleteNote="Blacklisting keeps the price history; deleting does not."
        importFields={
          can('suppliers.import')
            ? [
                { key: 'code', label: 'Supplier code', required: true },
                { key: 'legalName', label: 'Legal name', required: true },
                { key: 'brandName', label: 'Brand name' },
                { key: 'categories', label: 'Approved categories', hint: 'separated by |, e.g. UNIFORM|PPE' },
                { key: 'picName', label: 'Contact person' },
                { key: 'picPhone', label: 'Contact phone' },
                { key: 'city', label: 'City' },
                { key: 'province', label: 'Province' },
                { key: 'paymentTermDays', label: 'Payment term (days)' },
                { key: 'leadTimeDays', label: 'Lead time (days)' },
                { key: 'rating', label: 'Rating 1–5' },
                { key: 'onTimeRate', label: 'On-time %' },
                { key: 'status', label: 'Status', hint: 'ACTIVE / ON_HOLD / BLACKLISTED' },
              ]
            : undefined
        }
        importSample={{
          code: 'SUP-0011', legalName: 'PT Contoh Pemasok Nusantara', brandName: 'Contoh Pemasok',
          categories: 'OFFICE_SUPPLY|CONSUMABLE', picName: 'Budi Santoso', picPhone: '+62 812 0000 1111',
          city: 'Jakarta Selatan', province: 'DKI Jakarta', paymentTermDays: '30', leadTimeDays: '7',
          rating: '4.2', onTimeRate: '92', status: 'ACTIVE',
        }}
        toImportRow={(r) => ({
          code: r.code, legalName: r.legalName, brandName: r.brandName ?? '', categories: r.categories.join('|'),
          picName: r.picName, picPhone: r.picPhone, city: r.city, province: r.province,
          paymentTermDays: r.paymentTermDays, leadTimeDays: r.leadTimeDays, rating: r.rating,
          onTimeRate: r.onTimeRate, status: r.status,
        })}
        onImport={
          can('suppliers.import')
            ? (rows) => {
                const mapped: Supplier[] = rows.map((row) => {
                  const existing = suppliers.find((x) => x.code === row.code)
                  return {
                    ...(existing ?? blank()),
                    id: existing?.id ?? uid('sup'),
                    code: row.code,
                    legalName: row.legalName,
                    brandName: row.brandName || undefined,
                    categories: (row.categories ?? '')
                      .split('|')
                      .map((c) => c.trim())
                      .filter((c) => ITEM_CATEGORIES.some((x) => x.value === c)) as ItemCategory[],
                    picName: row.picName ?? '',
                    picPhone: row.picPhone ?? '',
                    city: row.city ?? '',
                    province: row.province || 'DKI Jakarta',
                    paymentTermDays: Number(row.paymentTermDays) || 30,
                    leadTimeDays: Number(row.leadTimeDays) || 14,
                    rating: Number(row.rating) || 4,
                    onTimeRate: Number(row.onTimeRate) || 90,
                    status: (['ACTIVE', 'ON_HOLD', 'BLACKLISTED'].includes(row.status) ? row.status : 'ACTIVE') as Supplier['status'],
                  } as Supplier
                })
                importSuppliers(mapped)
                toast.push({ tone: 'success', title: `${mapped.length} supplier${mapped.length === 1 ? '' : 's'} imported` })
              }
            : undefined
        }
        rowActions={(r) => (
          <>
            <Tooltip content={can('suppliers.edit') ? 'Edit and see price history' : 'See price history'}>
              <Button variant="ghost" size="iconXs" onClick={() => { setEditing(r); setFormOpen(true) }}>
                <Pencil />
              </Button>
            </Tooltip>
            {can('suppliers.delete') && (
              <Tooltip content="Delete">
                <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}>
                  <Trash2 />
                </Button>
              </Tooltip>
            )}
          </>
        )}
        footerSummary={(rows) => (
          <span className="tnum">{fmtCurrency(rows.reduce((a, r) => a + spendOf(r), 0), 'IDR', { compact: true })} purchased from this view</span>
        )}
        emptyTitle="No suppliers"
        emptyDescription="Register the vendors a purchase request line can be assigned to."
      />

      <SupplierForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="supplier"
        items={deleting ? [`${deleting.code} — ${deleting.legalName}`] : []}
        cascade={deleting ? [`${purchasesOf(deleting).length} recorded purchases`, `${openLines(deleting)} purchase request lines assigned to them`] : []}
        onConfirm={() => {
          if (deleting) {
            removeSuppliers([deleting.id])
            toast.push({ tone: 'success', title: 'Supplier deleted', description: deleting.code })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
