import * as React from 'react'
import { Handshake, ShieldAlert } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column, TableFilter } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { StatusBadge } from '@/components/shared/status'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { Sheet } from '@/components/ui/dialog'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { MetaRow } from '@/components/shared/status'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent, relativeDays, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { supplierScores } from '@/lib/procurement'
import { SUPPLIER_TYPES, supplierTypeLabel } from '@/data/reference'
import type { Supplier } from '@/data/types'

export function SuppliersPage() {
  const store = useErp()
  const [types, setTypes] = React.useState<string[]>([])
  const [statuses, setStatuses] = React.useState<string[]>([])
  const [certs, setCerts] = React.useState<string[]>([])
  const [open, setOpen] = React.useState<Supplier | null>(null)

  const scores = React.useMemo(
    () => supplierScores(store.suppliers, store.orders, store.receipts),
    [store.suppliers, store.orders, store.receipts],
  )
  const scoreFor = (id: string) => scores.find((s) => s.supplier.id === id)

  const expiring = store.suppliers.filter((s) => {
    if (!s.svlkExpiresAt) return false
    const d = relativeDays(s.svlkExpiresAt)
    return d !== null && d < store.settings.certificateWarningDays
  })

  const filters: TableFilter<Supplier>[] = [
    {
      key: 'type',
      label: 'Type',
      options: SUPPLIER_TYPES.map((t) => ({ value: t.value, label: t.label })),
      values: types,
      onChange: setTypes,
      match: (r, v) => v.includes(r.type),
    },
    {
      key: 'status',
      label: 'Status',
      options: ['ACTIVE', 'PROBATION', 'ON_HOLD', 'BLACKLISTED'].map((v) => ({ value: v, label: titleCase(v) })),
      values: statuses,
      onChange: setStatuses,
      match: (r, v) => v.includes(r.status),
    },
    {
      key: 'cert',
      label: 'Legality',
      options: [
        { value: 'SVLK', label: 'SVLK certified' },
        { value: 'FSC', label: 'FSC certified' },
        { value: 'EXPIRING', label: 'Certificate expiring' },
        { value: 'NONE', label: 'No legality certificate' },
      ],
      values: certs,
      onChange: setCerts,
      match: (r, v) =>
        v.some((x) => {
          if (x === 'SVLK') return r.svlkCertified
          if (x === 'FSC') return r.fscCertified
          if (x === 'NONE') return !r.svlkCertified
          const d = r.svlkExpiresAt ? relativeDays(r.svlkExpiresAt) : null
          return d !== null && d < store.settings.certificateWarningDays
        }),
    },
  ]

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier',
      width: 'min-w-[240px]',
      pinned: true,
      sortable: true,
      sortValue: (r) => r.name,
      exportValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.name}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.code} · {r.city}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: 'w-[170px]',
      sortable: true,
      sortValue: (r) => r.type,
      exportValue: (r) => r.type,
      cell: (r) => (
        <Tooltip content={SUPPLIER_TYPES.find((t) => t.value === r.type)?.hint ?? ''}>
          <span><Badge size="sm" tone="neutral">{supplierTypeLabel(r.type)}</Badge></span>
        </Tooltip>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[110px]',
      sortable: true,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'legality',
      header: 'Legality',
      width: 'w-[190px]',
      headerHint: 'SVLK is what carries timber into a V-Legal document. A lapse anywhere here breaks the chain.',
      exportValue: (r) => (r.svlkCertified ? `SVLK ${r.svlkNumber} exp ${r.svlkExpiresAt}` : 'none'),
      cell: (r) => {
        if (!r.svlkCertified) {
          return <span className="text-[12px] text-fg-subtle">not timber</span>
        }
        const left = r.svlkExpiresAt ? relativeDays(r.svlkExpiresAt) : null
        const tone = left === null ? 'neutral' : left < 0 ? 'danger' : left < 60 ? 'warning' : 'success'
        return (
          <div className="space-y-1">
            <Tooltip content={`${r.svlkNumber} · expires ${fmtDate(r.svlkExpiresAt)}`}>
              <span><Badge size="sm" tone={tone}>SVLK {left !== null ? (left < 0 ? 'expired' : `${left}d`) : ''}</Badge></span>
            </Tooltip>
            {r.fscCertified && <Badge size="sm" tone="accent">FSC</Badge>}
          </div>
        )
      },
    },
    {
      key: 'scores',
      header: 'Scorecard',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => scoreFor(r.id)?.composite ?? 0,
      exportValue: (r) => scoreFor(r.id)?.composite ?? 0,
      headerHint: 'Quality, punctuality and price, averaged.',
      cell: (r) => {
        const s = scoreFor(r.id)
        return (
          <div>
            <UtilisationBar pct={s?.composite ?? 0} className="w-24" label={`${s?.composite ?? 0} / 100`} />
          </div>
        )
      },
    },
    {
      key: 'ontime',
      header: 'On time',
      align: 'right',
      width: 'w-[120px]',
      sortable: true,
      sortValue: (r) => scoreFor(r.id)?.onTimePct ?? 0,
      exportValue: (r) => Math.round(scoreFor(r.id)?.onTimePct ?? 0),
      headerHint: 'Deliveries that arrived on or before the date the order promised.',
      cell: (r) => {
        const s = scoreFor(r.id)
        if (!s?.deliveries) return <span className="text-[12px] text-fg-subtle">no deliveries</span>
        return (
          <div className="text-right">
            <p className={`tnum font-medium ${s.onTimePct < 70 ? 'text-danger' : s.onTimePct < 88 ? 'text-warning' : 'text-success'}`}>
              {fmtPercent(s.onTimePct, 0)}
            </p>
            <p className="tnum text-[11px] text-fg-muted">{s.onTimeDeliveries} of {s.deliveries}</p>
          </div>
        )
      },
    },
    {
      key: 'reject',
      header: 'Rejected',
      align: 'right',
      width: 'w-[110px]',
      sortable: true,
      sortValue: (r) => scoreFor(r.id)?.rejectRatePct ?? 0,
      exportValue: (r) => Math.round((scoreFor(r.id)?.rejectRatePct ?? 0) * 10) / 10,
      cell: (r) => {
        const s = scoreFor(r.id)
        if (!s?.deliveredQty) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <span className={`tnum ${s.rejectRatePct > 5 ? 'text-danger' : 'text-fg-muted'}`}>
            {fmtPercent(s.rejectRatePct, 1)}
          </span>
        )
      },
    },
    {
      key: 'spend',
      header: 'Ordered',
      align: 'right',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => scoreFor(r.id)?.value ?? 0,
      exportValue: (r) => Math.round(scoreFor(r.id)?.value ?? 0),
      cell: (r) => {
        const s = scoreFor(r.id)
        return (
          <div className="text-right">
            <p className="tnum font-medium text-fg">{fmtCurrency(s?.value ?? 0, 'IDR', { compact: true })}</p>
            <p className="tnum text-[11px] text-fg-muted">{s?.orders ?? 0} orders · {fmtCurrency(s?.openValue ?? 0, 'IDR', { compact: true })} open</p>
          </div>
        )
      },
    },
    {
      key: 'terms',
      header: 'Terms',
      width: 'w-[130px]',
      defaultHidden: true,
      exportValue: (r) => `${r.paymentTermDays}d / ${r.leadTimeDays}d lead`,
      cell: (r) => (
        <span className="text-[12px] text-fg-muted">
          {r.paymentTermDays}d terms · {r.leadTimeDays}d lead
        </span>
      ),
    },
  ]

  const s = open ? scoreFor(open.id) : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Procurement</Badge>}
        title="Suppliers"
        description="Sawmills, panel mills, hardware importers and the village workshops that take carving and assembly on borongan terms. The scorecard is built from what they actually did — deliveries against the promised date, quantities rejected on arrival — not from an opinion somebody typed."
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Suppliers" value={String(store.suppliers.length)} sub={`${store.suppliers.filter((x) => x.status === 'ACTIVE').length} active`} icon={<Handshake />} accent="primary" />
        <KpiCard label="SVLK certified" value={String(store.suppliers.filter((x) => x.svlkCertified).length)} sub="can carry timber into a V-Legal document" accent="accent" />
        <KpiCard
          label="Certificates expiring"
          value={String(expiring.length)}
          sub={expiring.map((x) => x.name.split(' ').slice(0, 2).join(' ')).join(', ') || 'none inside the warning window'}
          icon={<ShieldAlert />}
          accent={expiring.length ? 'danger' : 'accent'}
        />
        <KpiCard
          label="Open commitment"
          value={fmtCurrency(scores.reduce((a, x) => a + x.openValue, 0), 'IDR', { compact: true })}
          sub="ordered and not yet delivered"
          accent="warning"
        />
      </div>

      <DataTable
        data={store.suppliers}
        columns={columns}
        filters={filters}
        getId={(r) => r.id}
        getLabel={(r) => r.name}
        entityLabel="suppliers"
        searchText={(r) => `${r.code} ${r.name} ${r.city} ${r.type} ${r.svlkNumber ?? ''} ${r.note ?? ''}`}
        onRowClick={(r) => setOpen(r)}
        onDelete={store.removeSuppliers}
        exportName="kriyanusa-suppliers"
        storageKey="suppliers"
        initialSort={{ key: 'spend', dir: 'desc' }}
        importFields={[
          { key: 'code', label: 'Code', required: true },
          { key: 'name', label: 'Name', required: true },
        ]}
        onImport={(rows) =>
          store.importSuppliers(rows.map((r, i) => ({ ...store.suppliers[0], id: `imp_s_${Date.now()}_${i}`, ...r })) as Supplier[])
        }
      />

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)} title={open?.name ?? ''} description={open ? `${supplierTypeLabel(open.type)} · ${open.city}` : ''}>
        {open && (
          <div className="space-y-4 p-5">
            {open.note && (
              <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2.5 text-[12.5px] leading-relaxed text-fg-muted">
                {open.note}
              </p>
            )}
            <Card>
              <CardHeader title="Trading" />
              <CardBody className="divide-y divide-border py-0">
                <MetaRow label="Status"><StatusBadge value={open.status} size="sm" /></MetaRow>
                <MetaRow label="Payment terms">{open.paymentTermDays} days</MetaRow>
                <MetaRow label="Lead time">{open.leadTimeDays} days</MetaRow>
                <MetaRow label="Tax id">{open.taxId}</MetaRow>
                <MetaRow label="Bank">{open.bankName} {open.bankAccountNo}</MetaRow>
                <MetaRow label="Trading since">{fmtDate(open.since)}</MetaRow>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Legality" description="What lets their timber enter our V-Legal chain." />
              <CardBody className="divide-y divide-border py-0">
                <MetaRow label="SVLK">
                  {open.svlkCertified ? `${open.svlkNumber}` : <span className="text-fg-subtle">not certified</span>}
                </MetaRow>
                <MetaRow label="SVLK expires">
                  {open.svlkExpiresAt ? (
                    <span className={(relativeDays(open.svlkExpiresAt) ?? 0) < 60 ? 'text-danger' : undefined}>
                      {fmtDate(open.svlkExpiresAt)} ({relativeDays(open.svlkExpiresAt)} days)
                    </span>
                  ) : '—'}
                </MetaRow>
                <MetaRow label="FSC">{open.fscCertified ? open.fscNumber : <span className="text-fg-subtle">no</span>}</MetaRow>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Performance" description="Computed from the orders and deliveries in the book." />
              <CardBody className="divide-y divide-border py-0">
                <MetaRow label="Orders placed">{s?.orders ?? 0}</MetaRow>
                <MetaRow label="Value ordered">{fmtCurrency(s?.value ?? 0, 'IDR', { compact: true })}</MetaRow>
                <MetaRow label="Still open">{fmtCurrency(s?.openValue ?? 0, 'IDR', { compact: true })}</MetaRow>
                <MetaRow label="Deliveries">{s?.deliveries ?? 0}</MetaRow>
                <MetaRow label="On time">{fmtPercent(s?.onTimePct ?? 0, 0)}</MetaRow>
                <MetaRow label="Quantity rejected">{fmtNumber(s?.rejectedQty ?? 0, 2)} of {fmtNumber(s?.deliveredQty ?? 0, 2)}</MetaRow>
                <MetaRow label="Published scores">
                  Q {open.qualityScore} · OT {open.onTimeScore} · £ {open.priceScore}
                </MetaRow>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Contacts" />
              <div className="divide-y divide-border">
                {open.contacts.map((c) => (
                  <div key={c.id} className="px-4 py-2.5">
                    <p className="text-[12.5px] font-medium text-fg">{c.name}</p>
                    <p className="text-[11.5px] text-fg-muted">{c.role} · {c.email} · {c.phone}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </Sheet>
    </div>
  )
}
