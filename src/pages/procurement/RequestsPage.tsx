import * as React from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column, TableFilter } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { StatusBadge, MetaRow } from '@/components/shared/status'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { fmtCurrency, fmtDate, fmtNumber, relativeLabel, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { uomLabel, warehouseTypeLabel } from '@/data/reference'
import type { PurchaseRequest } from '@/data/types'

export function RequestsPage() {
  const store = useErp()
  const [statuses, setStatuses] = React.useState<string[]>([])
  const [open, setOpen] = React.useState<PurchaseRequest | null>(null)

  const value = (r: PurchaseRequest) => r.lines.reduce((a, l) => a + l.qty * l.estimatedUnitCost, 0)
  const orderedPct = (r: PurchaseRequest) => {
    const q = r.lines.reduce((a, l) => a + l.qty, 0)
    const o = r.lines.reduce((a, l) => a + l.orderedQty, 0)
    return q ? (o / q) * 100 : 0
  }

  const filters: TableFilter<PurchaseRequest>[] = [
    {
      key: 'status',
      label: 'Status',
      options: ['DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_ORDERED', 'ORDERED', 'REJECTED', 'CANCELLED'].map((v) => ({ value: v, label: titleCase(v) })),
      values: statuses,
      onChange: setStatuses,
      match: (r, v) => v.includes(r.status),
    },
  ]

  const columns: Column<PurchaseRequest>[] = [
    {
      key: 'code',
      header: 'Request',
      width: 'min-w-[160px]',
      pinned: true,
      sortable: true,
      sortValue: (r) => r.code,
      exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.requestedByName}</p>
        </div>
      ),
    },
    {
      key: 'project',
      header: 'For',
      width: 'min-w-[220px]',
      exportValue: (r) => store.projects.find((p) => p.id === r.projectId)?.code ?? 'stock',
      cell: (r) => {
        const p = store.projects.find((x) => x.id === r.projectId)
        if (!p) return <span className="text-[12px] text-fg-muted">Stock replenishment</span>
        return (
          <div className="min-w-0">
            <Link to={`/projects/${p.id}`} className="truncate font-medium text-fg hover:text-primary">{p.code}</Link>
            <p className="truncate text-[11.5px] text-fg-muted">{p.buyerName}</p>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-[150px]',
      sortable: true,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'lines',
      header: 'Lines',
      align: 'right',
      width: 'w-[80px]',
      sortable: true,
      sortValue: (r) => r.lines.length,
      exportValue: (r) => r.lines.length,
      cell: (r) => <span className="tnum">{r.lines.length}</span>,
    },
    {
      key: 'value',
      header: 'Estimated',
      align: 'right',
      width: 'w-[140px]',
      sortable: true,
      sortValue: (r) => value(r),
      exportValue: (r) => Math.round(value(r)),
      cell: (r) => <span className="tnum font-medium">{fmtCurrency(value(r), 'IDR', { compact: true })}</span>,
    },
    {
      key: 'ordered',
      header: 'Turned into orders',
      width: 'w-[160px]',
      cell: (r) => <UtilisationBar pct={orderedPct(r)} className="w-32" />,
    },
    {
      key: 'needed',
      header: 'Needed by',
      width: 'w-[140px]',
      sortable: true,
      sortValue: (r) => r.lines.map((l) => l.neededBy).sort()[0] ?? '',
      exportValue: (r) => r.lines.map((l) => l.neededBy).sort()[0] ?? '',
      cell: (r) => {
        const first = r.lines.map((l) => l.neededBy).sort()[0]
        return (
          <div>
            <p className="text-fg-muted">{fmtDate(first)}</p>
            <p className="text-[11px] text-fg-subtle">{relativeLabel(first)}</p>
          </div>
        )
      },
    },
    {
      key: 'requested',
      header: 'Raised',
      width: 'w-[130px]',
      defaultHidden: true,
      sortable: true,
      sortValue: (r) => r.requestedAt,
      exportValue: (r) => r.requestedAt,
      cell: (r) => <span className="text-fg-muted">{fmtDate(r.requestedAt)}</span>,
    },
  ]

  const waiting = store.requests.filter((r) => r.status === 'SUBMITTED')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Procurement</Badge>}
        title="Purchase requests"
        description="What the floor and the warehouse are asking for, before it becomes a commitment to a supplier. A request carries the budget line it came from, so purchasing can see whether the money for it was ever allowed."
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Requests" value={String(store.requests.length)} icon={<ClipboardList />} accent="primary" />
        <KpiCard label="Waiting for approval" value={String(waiting.length)} sub={waiting.map((r) => r.code).join(', ') || 'none'} accent={waiting.length ? 'warning' : 'accent'} />
        <KpiCard
          label="Estimated value"
          value={fmtCurrency(store.requests.reduce((a, r) => a + value(r), 0), 'IDR', { compact: true })}
          sub="at the estimator's prices"
          accent="accent"
        />
        <KpiCard
          label="Not yet ordered"
          value={fmtCurrency(
            store.requests.reduce((a, r) => a + r.lines.reduce((la, l) => la + Math.max(0, l.qty - l.orderedQty) * l.estimatedUnitCost, 0), 0),
            'IDR',
            { compact: true },
          )}
          sub="requested but no purchase order raised"
          accent="warning"
        />
      </div>

      <DataTable
        data={store.requests}
        columns={columns}
        filters={filters}
        getId={(r) => r.id}
        getLabel={(r) => r.code}
        entityLabel="requests"
        searchText={(r) => `${r.code} ${r.requestedByName} ${r.justification} ${r.lines.map((l) => l.description).join(' ')}`}
        onRowClick={(r) => setOpen(r)}
        onDelete={store.removeRequests}
        exportName="kriyanusa-purchase-requests"
        storageKey="requests"
        initialSort={{ key: 'needed', dir: 'asc' }}
        rowActions={(r) =>
          r.status === 'SUBMITTED' ? (
            <Button size="xs" variant="primary" onClick={() => store.approveRequest(r.id)}>Approve</Button>
          ) : null
        }
      />

      <Sheet
        open={!!open}
        onOpenChange={(v) => !v && setOpen(null)}
        title={open?.code ?? ''}
        description={open?.justification}
        width="max-w-3xl"
      >
        {open && (
          <div className="space-y-4 p-5">
            <Card>
              <CardHeader title="Request" />
              <CardBody className="divide-y divide-border py-0">
                <MetaRow label="Status"><StatusBadge value={open.status} size="sm" /></MetaRow>
                <MetaRow label="Raised by">{open.requestedByName} on {fmtDate(open.requestedAt)}</MetaRow>
                <MetaRow label="Approved by">{open.approvedByName ?? <span className="text-fg-subtle">not yet</span>}</MetaRow>
                <MetaRow label="Deliver to">
                  {store.warehouses.find((w) => w.id === open.warehouseId)?.name}{' '}
                  <span className="text-fg-subtle">
                    ({warehouseTypeLabel(store.warehouses.find((w) => w.id === open.warehouseId)?.type ?? 'RAW_MATERIAL')})
                  </span>
                </MetaRow>
                <MetaRow label="Estimated value">{fmtCurrency(value(open), 'IDR', { compact: true })}</MetaRow>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Lines" description="Quantities are the budget lines grossed up for wastage — what actually has to be bought, not what ends up in the piece." />
              <div className="scrollbar-thin overflow-x-auto">
                <table className="w-full min-w-[620px] text-[12.5px]">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                      <th className="px-4 py-2 font-medium">Item</th>
                      <th className="px-4 py-2 text-right font-medium">Requested</th>
                      <th className="px-4 py-2 text-right font-medium">Ordered</th>
                      <th className="px-4 py-2 text-right font-medium">Est. unit cost</th>
                      <th className="px-4 py-2 font-medium">Needed by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {open.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-2">
                          <p className="font-medium text-fg">{l.description}</p>
                          <p className="text-[11.5px] text-fg-muted">{store.items.find((i) => i.id === l.itemId)?.sku}</p>
                        </td>
                        <td className="tnum px-4 py-2 text-right">{fmtNumber(l.qty, 2)} {uomLabel(l.uom)}</td>
                        <td className="tnum px-4 py-2 text-right text-fg-muted">{fmtNumber(l.orderedQty, 2)}</td>
                        <td className="tnum px-4 py-2 text-right">{fmtCurrency(l.estimatedUnitCost, 'IDR', { compact: true })}</td>
                        <td className="px-4 py-2 text-fg-muted">{fmtDate(l.neededBy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </Sheet>
    </div>
  )
}
