import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ExternalLink, Pencil, Plus, Receipt, Trash2 } from 'lucide-react'
import type { ChargeStatus, Project, ProjectCharge } from '@/data/types'
import { CHARGE_CODES } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { Sheet } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/checkbox'
import { chargeTotals, jobFinancials } from '@/lib/analytics'
import { fmtCurrency, fmtMoney, fmtNumber, fmtPercent, titleCase } from '@/lib/format'
import { uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

export function ChargesTable({ project, scoped }: { project?: Project; scoped?: boolean }) {
  const nav = useNavigate()
  const toast = useToast()
  const { charges, projects, packages, removeCharges, importCharges, upsertCharge } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ProjectCharge | null>(null)
  const [deleting, setDeleting] = React.useState<ProjectCharge | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [category, setCategory] = React.useState<string[]>([])

  const data = scoped && project ? charges.filter((c) => c.projectId === project.id) : charges
  const projectOf = (c: ProjectCharge) => projects.find((p) => p.id === c.projectId)
  const fin = jobFinancials(data)
  const pkg = project ? packages.find((p) => p.id === project.packageId) : undefined

  const columns: Column<ProjectCharge>[] = [
    {
      key: 'chargeCode', header: 'Code', width: 'w-[98px]', pinned: true, sortable: true,
      sortValue: (r) => r.chargeCode, exportValue: (r) => r.chargeCode,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.chargeCode}</span>,
    },
    {
      key: 'description', header: 'Charge', width: 'min-w-[220px]', sortable: true,
      sortValue: (r) => r.description, exportValue: (r) => r.description,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.description}</p>
          <p className="truncate text-[11px] text-fg-muted">
            {titleCase(r.category)}
            {r.fromPackage && <span className="ml-1.5 text-primary">· from package</span>}
            {!r.billable && <span className="ml-1.5 text-warning">· not billable</span>}
          </p>
        </div>
      ),
    },
    ...(!scoped
      ? [
          {
            key: 'project', header: 'Job', width: 'min-w-[150px]', sortable: true,
            sortValue: (r: ProjectCharge) => projectOf(r)?.code ?? '',
            exportValue: (r: ProjectCharge) => projectOf(r)?.code ?? '',
            cell: (r: ProjectCharge) => <span className="font-mono text-[11.5px] text-fg">{projectOf(r)?.code}</span>,
          } as Column<ProjectCharge>,
        ]
      : []),
    {
      key: 'basis', header: 'Basis', width: 'w-[136px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.basis, exportValue: (r) => r.basis,
      cell: (r) => <span className="text-[12px] text-fg-muted">{titleCase(r.basis)}</span>,
    },
    {
      key: 'quantity', header: 'Qty', width: 'w-[88px]', align: 'right', sortable: true,
      sortValue: (r) => r.quantity, exportValue: (r) => r.quantity,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtNumber(r.quantity, r.quantity % 1 ? 2 : 0)}</span>,
    },
    {
      key: 'buyRate', header: 'Buy rate', width: 'w-[118px]', align: 'right', sortable: true,
      sortValue: (r) => r.buyRate, exportValue: (r) => r.buyRate,
      cell: (r) => (
        <span className="tnum text-[12.5px] text-fg-muted">
          {r.currency} {fmtMoney(r.buyRate, r.currency)}
        </span>
      ),
    },
    {
      key: 'sellRate', header: 'Sell rate', width: 'w-[118px]', align: 'right', sortable: true,
      sortValue: (r) => r.sellRate, exportValue: (r) => r.sellRate,
      cell: (r) => (
        <span className="tnum text-[12.5px] font-medium text-fg">
          {r.currency} {fmtMoney(r.sellRate, r.currency)}
        </span>
      ),
    },
    {
      key: 'cost', header: 'Cost (IDR)', width: 'w-[130px]', align: 'right', sortable: true,
      sortValue: (r) => chargeTotals(r).cost, exportValue: (r) => Math.round(chargeTotals(r).cost),
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtCurrency(chargeTotals(r).cost, 'IDR', { compact: true })}</span>,
    },
    {
      key: 'revenue', header: 'Revenue (IDR)', width: 'w-[142px]', align: 'right', sortable: true,
      sortValue: (r) => chargeTotals(r).revenue, exportValue: (r) => Math.round(chargeTotals(r).revenue),
      cell: (r) => (
        <span className="tnum text-[12.5px] font-medium text-fg">
          {r.billable ? fmtCurrency(chargeTotals(r).revenue, 'IDR', { compact: true }) : '—'}
        </span>
      ),
    },
    {
      key: 'margin', header: 'Margin', width: 'w-[100px]', align: 'right', sortable: true,
      sortValue: (r) => (chargeTotals(r).revenue ? (chargeTotals(r).margin / chargeTotals(r).revenue) * 100 : -999),
      exportValue: (r) => Math.round(chargeTotals(r).margin),
      cell: (r) => {
        const t = chargeTotals(r)
        if (!r.billable || !t.revenue) return <span className="text-fg-subtle">—</span>
        const pct = (t.margin / t.revenue) * 100
        return <Badge tone={pct >= 20 ? 'success' : pct >= 8 ? 'warning' : 'danger'} size="sm">{pct.toFixed(0)}%</Badge>
      },
    },
    {
      key: 'tax', header: 'Tax', width: 'w-[110px]', sortable: true, defaultHidden: true,
      sortValue: (r) => Number(r.vatApplicable) * 2 + Number(r.whtApplicable),
      exportValue: (r) => [r.vatApplicable && 'VAT 11%', r.whtApplicable && 'WHT 2%'].filter(Boolean).join(' + '),
      cell: (r) => (
        <div className="flex gap-1">
          {r.vatApplicable && <Badge tone="info" size="sm">PPN</Badge>}
          {r.whtApplicable && <Badge tone="purple" size="sm">PPh 23</Badge>}
          {!r.vatApplicable && !r.whtApplicable && <span className="text-fg-subtle">—</span>}
        </div>
      ),
    },
    {
      key: 'vendor', header: 'Vendor', width: 'min-w-[170px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.vendor ?? '', exportValue: (r) => r.vendor ?? '',
      cell: (r) => <span className="text-[12px] text-fg-muted">{r.vendor ?? '—'}</span>,
    },
    {
      key: 'status', header: 'Status', width: 'w-[152px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'invoiceNo', header: 'Invoice', width: 'w-[150px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.invoiceNo ?? '', exportValue: (r) => r.invoiceNo ?? '',
      cell: (r) => <span className="font-mono text-[11.5px] text-fg-muted">{r.invoiceNo ?? '—'}</span>,
    },
  ]

  return (
    <>
      {scoped && project && (
        <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Tile label="Revenue" value={fmtCurrency(fin.revenue, 'IDR', { compact: true })} />
          <Tile label="Cost" value={fmtCurrency(fin.cost, 'IDR', { compact: true })} />
          <Tile
            label="Gross margin"
            value={fmtCurrency(fin.margin, 'IDR', { compact: true })}
            sub={fmtPercent(fin.marginPct)}
            tone={fin.marginPct >= 20 ? 'success' : fin.marginPct >= 8 ? 'warning' : 'danger'}
          />
          <Tile label="VAT (PPN 11%)" value={fmtCurrency(fin.vat, 'IDR', { compact: true })} />
          <Tile
            label="Awaiting approval"
            value={fin.unapproved > 0 ? fmtCurrency(fin.unapproved, 'IDR', { compact: true }) : 'None'}
            tone={fin.unapproved > 0 ? 'warning' : undefined}
            sub={fin.disputed > 0 ? `${fmtCurrency(fin.disputed, 'IDR', { compact: true })} disputed` : undefined}
          />
        </div>
      )}

      <DataTable
        data={data}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${projectOf(r)?.code ?? ''} ${r.chargeCode} — ${r.description}`}
        entityLabel="charge"
        storageKey={scoped ? 'project-charges' : 'charges'}
        exportName={scoped && project ? `charges-${project.code}` : 'charges'}
        initialSort={{ key: 'chargeCode', dir: 'asc' }}
        compactByDefault
        searchText={(r) => [r.chargeCode, r.description, r.vendor, r.invoiceNo, r.category, projectOf(r)?.code].join(' ')}
        onRowClick={(r) => { setEditing(r); setFormOpen(true) }}
        rowTone={(r) => (r.status === 'DISPUTED' ? 'bg-danger-soft/25' : r.sellRate < r.buyRate ? 'bg-warning-soft/25' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'INVOICED', 'PAID', 'DISPUTED'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'category', label: 'Category', values: category, onChange: setCategory,
            options: ['FREIGHT', 'ORIGIN', 'DESTINATION', 'CUSTOMS', 'DOCUMENTATION', 'TRUCKING', 'SURCHARGE', 'INSURANCE', 'PENALTY', 'OTHER'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.category),
          },
        ]}
        toolbarRight={
          project && (
            <>
              {pkg && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    const existing = new Set(data.map((c) => c.chargeCode))
                    const added = pkg.rateLines.filter((l) => !existing.has(l.chargeCode))
                    added.forEach((l) =>
                      upsertCharge({
                        id: uid('chg'), projectId: project.id, chargeCode: l.chargeCode, description: l.description,
                        category: CHARGE_CODES.find((c) => c.code === l.chargeCode)?.category ?? 'OTHER',
                        basis: l.basis, quantity: 1, buyRate: l.buyRate, sellRate: l.sellRate, currency: l.currency,
                        fxRate: project.fxRate, vatApplicable: l.vatApplicable, whtApplicable: false,
                        freightTerm: project.freightTerm, billable: true, status: 'DRAFT', fromPackage: true,
                        createdAt: new Date().toISOString(),
                      }),
                    )
                    toast.push({
                      tone: added.length ? 'success' : 'info',
                      title: added.length ? `${added.length} lines pulled from ${pkg.code}` : 'Already in sync',
                      description: added.length ? 'Quantities default to 1 — set them from the container count.' : 'Every package line is already on this charge sheet.',
                    })
                  }}
                >
                  <Receipt /> Sync from package
                </Button>
              )}
              <Button variant="primary" size="md" onClick={() => { setEditing(null); setFormOpen(true) }}>
                <Plus /> Add charge
              </Button>
            </>
          )
        }
        onDelete={(ids) => {
          removeCharges(ids)
          toast.push({ tone: 'success', title: `${ids.length} charge lines removed` })
        }}
        cascadeWarning={(rows) => {
          const invoiced = rows.filter((r) => r.status === 'INVOICED' || r.status === 'PAID')
          return invoiced.length
            ? [`${invoiced.length} of these are already invoiced — deleting them will not reverse the invoice or the ledger entry`]
            : []
        }}
        bulkActions={(rows, clear) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              rows.forEach((r) => upsertCharge({ ...r, status: 'APPROVED' }))
              toast.push({ tone: 'success', title: `${rows.length} charges approved` })
              clear()
            }}
          >
            <CheckCircle2 /> Approve
          </Button>
        )}
        importFields={[
          { key: 'projectCode', label: 'Project code', required: !scoped, hint: scoped ? `defaults to ${project?.code}` : undefined },
          { key: 'chargeCode', label: 'Charge code', required: true, hint: 'OFR, THC-O, DOC …' },
          { key: 'description', label: 'Description' },
          { key: 'basis', label: 'Basis', hint: 'PER_CONTAINER / PER_CBM / PER_BL …' },
          { key: 'quantity', label: 'Quantity', required: true },
          { key: 'buyRate', label: 'Buy rate', required: true },
          { key: 'sellRate', label: 'Sell rate', required: true },
          { key: 'currency', label: 'Currency' },
          { key: 'fxRate', label: 'FX rate to IDR' },
          { key: 'vendor', label: 'Vendor' },
          { key: 'status', label: 'Status' },
        ]}
        importSample={{
          projectCode: project?.code ?? 'PRJ-2026-0041', chargeCode: 'OFR', description: 'Ocean Freight',
          basis: 'PER_CONTAINER', quantity: '3', buyRate: '1180', sellRate: '1480', currency: 'USD',
          fxRate: '16250', vendor: 'Maersk Line', status: 'DRAFT',
        }}
        toImportRow={(r) => ({
          projectCode: projectOf(r)?.code ?? '', chargeCode: r.chargeCode, description: r.description,
          basis: r.basis, quantity: r.quantity, buyRate: r.buyRate, sellRate: r.sellRate,
          currency: r.currency, fxRate: r.fxRate, vendor: r.vendor ?? '', status: r.status,
        })}
        onImport={(rows) => {
          const mapped = rows
            .map((r) => {
              const proj = scoped && project ? project : projects.find((p) => p.code === r.projectCode)
              if (!proj) return null
              const meta = CHARGE_CODES.find((c) => c.code === r.chargeCode)
              return {
                id: uid('chg'), projectId: proj.id, chargeCode: r.chargeCode,
                description: r.description || meta?.name || r.chargeCode,
                category: meta?.category ?? 'OTHER',
                basis: (r.basis || meta?.basis || 'PER_SHIPMENT') as ProjectCharge['basis'],
                quantity: Number(r.quantity) || 1,
                buyRate: Number(r.buyRate) || 0,
                sellRate: Number(r.sellRate) || 0,
                currency: (r.currency || proj.currency) as ProjectCharge['currency'],
                fxRate: Number(r.fxRate) || proj.fxRate,
                vatApplicable: meta?.vat ?? false,
                whtApplicable: false,
                vendor: r.vendor || undefined,
                freightTerm: proj.freightTerm,
                billable: true,
                status: (r.status || 'DRAFT') as ChargeStatus,
                fromPackage: false,
                createdAt: new Date().toISOString(),
              } as ProjectCharge
            })
            .filter(Boolean) as ProjectCharge[]
          importCharges(mapped)
          toast.push({ tone: mapped.length ? 'success' : 'warning', title: mapped.length ? `${mapped.length} charges imported` : 'Nothing imported' })
        }}
        rowActions={(r) => (
          <>
            {!scoped && (
              <Tooltip content="Open job">
                <Button variant="ghost" size="iconXs" onClick={() => nav(`/projects/${r.projectId}?tab=charges`)}>
                  <ExternalLink />
                </Button>
              </Tooltip>
            )}
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
        emptyTitle="No charges yet"
        emptyDescription="Pull the rate card from the applied package, or key the lines by hand."
        footerSummary={(rows) => {
          const f = jobFinancials(rows)
          return (
            <span className="tnum">
              Revenue <span className="font-semibold text-fg">{fmtCurrency(f.revenue, 'IDR', { compact: true })}</span> · Cost{' '}
              <span className="font-semibold text-fg">{fmtCurrency(f.cost, 'IDR', { compact: true })}</span> · Margin{' '}
              <span className={`font-semibold ${f.marginPct >= 15 ? 'text-success' : f.marginPct >= 8 ? 'text-warning' : 'text-danger'}`}>
                {fmtCurrency(f.margin, 'IDR', { compact: true })} ({f.marginPct.toFixed(1)}%)
              </span>
            </span>
          )
        }}
      />

      {(project || editing) && (
        <ChargeForm
          open={formOpen}
          onOpenChange={setFormOpen}
          project={project ?? projects.find((p) => p.id === editing?.projectId)!}
          initial={editing}
        />
      )}

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="charge"
        items={deleting ? [`${deleting.chargeCode} — ${deleting.description}`] : []}
        destructiveNote={
          deleting && ['INVOICED', 'PAID'].includes(deleting.status)
            ? 'This line is already invoiced. Deleting it will not reverse the invoice or the ledger entry.'
            : undefined
        }
        onConfirm={() => {
          if (deleting) {
            removeCharges([deleting.id])
            toast.push({ tone: 'success', title: 'Charge removed' })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'success' | 'warning' | 'danger' }) {
  const toneCls =
    tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : tone === 'danger' ? 'text-danger' : 'text-fg'
  return (
    <div className="rounded-xl border border-border bg-surface px-3.5 py-3">
      <p className="truncate text-[11px] font-medium uppercase tracking-[0.06em] text-fg-subtle">{label}</p>
      <p className={`tnum mt-1.5 text-[17px] font-semibold leading-none tracking-[-0.02em] ${toneCls}`}>{value}</p>
      {sub && <p className="mt-1.5 text-[11.5px] text-fg-muted">{sub}</p>}
    </div>
  )
}

function ChargeForm({
  open,
  onOpenChange,
  project,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  project: Project
  initial?: ProjectCharge | null
}) {
  const { upsertCharge, containers, partners } = useErp()
  const toast = useToast()
  const [draft, setDraft] = React.useState<ProjectCharge>(() => blank(project))

  React.useEffect(() => {
    if (open) setDraft(initial ? structuredClone(initial) : blank(project))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const set = <K extends keyof ProjectCharge>(k: K, v: ProjectCharge[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const t = chargeTotals(draft)
  const boxes = containers.filter((c) => c.projectId === project.id)

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-2xl"
      eyebrow={<Badge tone="outline" size="sm">{project.code}</Badge>}
      title={initial ? `${draft.chargeCode} — ${draft.description}` : 'Add a charge line'}
      description="Buy is what the vendor bills you; sell is what the client is billed. The difference is the job's margin."
      footer={
        <>
          <div className="mr-auto flex items-center gap-3 text-[12px]">
            <span className="text-fg-muted">
              Cost <span className="tnum font-semibold text-fg">{fmtCurrency(t.cost, 'IDR', { compact: true })}</span>
            </span>
            <span className="text-fg-muted">
              Revenue <span className="tnum font-semibold text-fg">{fmtCurrency(t.revenue, 'IDR', { compact: true })}</span>
            </span>
            <Badge tone={t.revenue && t.margin / t.revenue >= 0.2 ? 'success' : t.margin < 0 ? 'danger' : 'warning'} size="sm">
              {t.revenue ? `${((t.margin / t.revenue) * 100).toFixed(0)}%` : '—'}
            </Badge>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              upsertCharge(draft)
              toast.push({ tone: 'success', title: initial ? 'Charge updated' : 'Charge added', description: `${draft.chargeCode} — ${draft.description}` })
              onOpenChange(false)
            }}
          >
            {initial ? 'Save' : 'Add charge'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Charge code" required className="sm:col-span-2">
          <Select
            searchable
            value={draft.chargeCode}
            onChange={(v) => {
              const meta = CHARGE_CODES.find((c) => c.code === v)!
              setDraft((d) => ({
                ...d, chargeCode: v, description: meta.name, category: meta.category, basis: meta.basis, vatApplicable: meta.vat,
              }))
            }}
            options={CHARGE_CODES.map((c) => ({ value: c.code, label: c.name, description: `${c.code} · ${titleCase(c.basis)}`, group: titleCase(c.category) }))}
          />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Input value={draft.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Basis">
          <Select
            value={draft.basis}
            onChange={(v) => set('basis', v)}
            options={(['PER_CONTAINER', 'PER_CBM', 'PER_KG', 'PER_TON', 'PER_BL', 'PER_SHIPMENT', 'PER_DOCUMENT', 'PERCENT_OF_VALUE'] as const).map((b) => ({ value: b, label: titleCase(b) }))}
          />
        </Field>
        <Field
          label="Quantity"
          required
          hint={draft.basis === 'PER_CONTAINER' ? `${boxes.length} containers on this job` : undefined}
        >
          <div className="flex gap-2">
            <Input type="number" value={draft.quantity} onChange={(e) => set('quantity', Number(e.target.value))} className="tnum" />
            {draft.basis === 'PER_CONTAINER' && boxes.length > 0 && (
              <Button variant="secondary" size="md" onClick={() => set('quantity', boxes.length)}>
                Use {boxes.length}
              </Button>
            )}
          </div>
        </Field>
        <Field label="Buy rate" hint="cost from the vendor">
          <Input type="number" value={draft.buyRate} onChange={(e) => set('buyRate', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Sell rate" hint="billed to the client">
          <Input
            type="number"
            value={draft.sellRate}
            onChange={(e) => set('sellRate', Number(e.target.value))}
            className="tnum"
            invalid={draft.sellRate < draft.buyRate}
          />
        </Field>
        <Field label="Currency">
          <Select
            value={draft.currency}
            onChange={(v) => set('currency', v)}
            options={(['USD', 'IDR', 'EUR', 'SGD', 'AUD', 'JPY', 'CNY'] as const).map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Field label="FX rate to IDR">
          <Input type="number" value={draft.fxRate} onChange={(e) => set('fxRate', Number(e.target.value))} className="tnum" />
        </Field>
        <Field label="Vendor" help="Nominating a managed partner links the cost to their scorecard and AP position.">
          <Select
            clearable
            searchable
            value={draft.partnerId ?? null}
            onClear={() => setDraft((d) => ({ ...d, partnerId: undefined, vendor: undefined }))}
            onChange={(v) => {
              const p = partners.find((x) => x.id === v)
              setDraft((d) => ({ ...d, partnerId: v, vendor: p?.name }))
            }}
            options={partners
              .filter((p) => p.status !== 'SUSPENDED')
              .map((p) => ({
                value: p.id,
                label: p.name,
                description: `${p.code} · ${p.types.map((t) => titleCase(t)).join(', ')}`,
              }))}
            placeholder={draft.vendor ?? 'Select a partner'}
            emptyLabel="No partner matches"
          />
        </Field>
        <Field label="Status">
          <Select
            value={draft.status}
            onChange={(v) => set('status', v)}
            options={[
              { value: 'DRAFT', label: 'Draft' },
              { value: 'PENDING_APPROVAL', label: 'Pending approval' },
              { value: 'APPROVED', label: 'Approved', description: 'Locked and ready to invoice' },
              { value: 'INVOICED', label: 'Invoiced' },
              { value: 'PAID', label: 'Paid' },
              { value: 'DISPUTED', label: 'Disputed', description: 'Raises an exception until resolved' },
            ]}
          />
        </Field>
        <Field label="Freight term">
          <Select
            value={draft.freightTerm}
            onChange={(v) => set('freightTerm', v)}
            options={[
              { value: 'PREPAID', label: 'Prepaid' },
              { value: 'COLLECT', label: 'Collect', description: 'Billed at destination, not to this client' },
            ]}
          />
        </Field>
        <div className="sm:col-span-2 grid gap-3 rounded-lg border border-border bg-surface-sunken p-3.5 sm:grid-cols-3">
          <label className="flex items-center gap-2.5 text-[12.5px] text-fg">
            <Switch checked={draft.billable} onChange={(v) => set('billable', v)} size="sm" /> Billable to client
          </label>
          <label className="flex items-center gap-2.5 text-[12.5px] text-fg">
            <Switch checked={draft.vatApplicable} onChange={(v) => set('vatApplicable', v)} size="sm" /> VAT / PPN 11%
          </label>
          <label className="flex items-center gap-2.5 text-[12.5px] text-fg">
            <Switch checked={draft.whtApplicable} onChange={(v) => set('whtApplicable', v)} size="sm" /> WHT / PPh 23 2%
          </label>
        </div>
        <Field label="Remarks" className="sm:col-span-2">
          <Textarea value={draft.remarks ?? ''} onChange={(e) => set('remarks', e.target.value)} rows={2} />
        </Field>
      </div>
    </Sheet>
  )
}

function blank(project: Project): ProjectCharge {
  return {
    id: uid('chg'), projectId: project.id, chargeCode: 'OFR', description: 'Ocean Freight', category: 'FREIGHT',
    basis: 'PER_CONTAINER', quantity: 1, buyRate: 0, sellRate: 0, currency: project.currency, fxRate: project.fxRate,
    vatApplicable: false, whtApplicable: false, freightTerm: project.freightTerm, billable: true, status: 'DRAFT',
    fromPackage: false, createdAt: new Date().toISOString(),
  }
}
