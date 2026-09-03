import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Eye, Layers, ShoppingCart, Truck, Wallet } from 'lucide-react'
import type { PurchaseRequest } from '@/data/types'
import { monthLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import { prTotals } from '@/lib/procurement'

/**
 * The purchase request register. Every row here was produced by locking a
 * material request session — purchase requests are never typed in by hand,
 * which is why this page has no "New" button.
 */
export function PurchaseRequestsPage() {
  const nav = useNavigate()
  const can = useCan()
  const { purchaseRequests, mrSessions, suppliers, items, purchasePrices } = useErp()
  const [status, setStatus] = React.useState<string[]>([])
  const [supplierFilter, setSupplierFilter] = React.useState<string[]>([])

  const totalsOf = React.useCallback(
    (pr: PurchaseRequest) => prTotals(pr, purchasePrices, items),
    [purchasePrices, items],
  )
  const sessionOf = (pr: PurchaseRequest) => mrSessions.find((s) => s.id === pr.sessionId)

  /* Everything still waiting on purchasing: a draft is not yet an order. */
  const open = purchaseRequests.filter((p) => p.status === 'DRAFT' || p.status === 'ASSIGNED')
  const unassignedLines = open.reduce((a, p) => a + totalsOf(p).unassigned, 0)
  const openValue = open.reduce((a, p) => a + totalsOf(p).value, 0)
  const orderedValue = purchaseRequests
    .filter((p) => p.status === 'ORDERED')
    .reduce((a, p) => a + totalsOf(p).value, 0)

  const columns: Column<PurchaseRequest>[] = [
    {
      key: 'code', header: 'Code', width: 'w-[184px]', sortable: true, pinned: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => {
        const session = sessionOf(r)
        return (
          <div className="min-w-0">
            <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{r.code}</p>
            <p className="truncate text-[11px] text-fg-subtle">
              {session ? `from ${session.code}` : 'session removed'}
            </p>
          </div>
        )
      },
    },
    {
      key: 'period', header: 'Period', width: 'w-[132px]', sortable: true,
      sortValue: (r) => {
        const s = sessionOf(r)
        return s ? s.periodYear * 100 + s.periodMonth : 0
      },
      exportValue: (r) => {
        const s = sessionOf(r)
        return s ? `${monthLabel(s.periodMonth)} ${s.periodYear}` : ''
      },
      cell: (r) => {
        const s = sessionOf(r)
        if (!s) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-fg">{monthLabel(s.periodMonth)}</p>
            <p className="tnum text-[11px] text-fg-subtle">{s.periodYear}</p>
          </div>
        )
      },
    },
    {
      key: 'status', header: 'Status', width: 'w-[130px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'lines', header: 'Lines', width: 'w-[88px]', align: 'right', sortable: true,
      sortValue: (r) => r.lines.length, exportValue: (r) => r.lines.length,
      headerHint: 'One line per item, however many divisions asked for it',
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{r.lines.length}</span>,
    },
    {
      key: 'qty', header: 'Units', width: 'w-[96px]', align: 'right', sortable: true,
      sortValue: (r) => totalsOf(r).qty, exportValue: (r) => totalsOf(r).qty,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtNumber(totalsOf(r).qty)}</span>,
    },
    {
      key: 'divisions', header: 'Divisions', width: 'w-[104px]', align: 'right', sortable: true,
      sortValue: (r) => totalsOf(r).divisions, exportValue: (r) => totalsOf(r).divisions,
      headerHint: 'How many divisions are represented in the merge',
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{totalsOf(r).divisions}</span>,
    },
    {
      key: 'assigned', header: 'Assigned to suppliers', width: 'w-[196px]', sortable: true,
      sortValue: (r) => {
        const t = totalsOf(r)
        return t.lines ? t.assigned / t.lines : 0
      },
      exportValue: (r) => `${totalsOf(r).assigned}/${totalsOf(r).lines}`,
      headerHint: 'A line can only be priced once it has a supplier',
      cell: (r) => {
        const t = totalsOf(r)
        const pct = t.lines ? Math.round((t.assigned / t.lines) * 100) : 0
        return (
          <div className="w-[168px]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="tnum text-[12.5px] font-medium text-fg">
                {t.assigned}<span className="text-fg-subtle"> / {t.lines}</span>
              </span>
              <span className="text-[11px] text-fg-subtle">
                {t.suppliers} supplier{t.suppliers === 1 ? '' : 's'}
              </span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-soft">
              <div className={`h-full rounded-full ${pct === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    },
    {
      key: 'priced', header: 'Agreed prices', width: 'w-[136px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => totalsOf(r).priced, exportValue: (r) => `${totalsOf(r).priced}/${r.lines.length}`,
      headerHint: 'Lines carrying a negotiated price rather than a reference one',
      cell: (r) => (
        <span className="tnum text-[12.5px] text-fg-muted">
          {totalsOf(r).priced} / {r.lines.length}
        </span>
      ),
    },
    {
      key: 'value', header: 'Value', width: 'w-[150px]', align: 'right', sortable: true,
      sortValue: (r) => totalsOf(r).value, exportValue: (r) => Math.round(totalsOf(r).value),
      headerHint: 'Agreed price where there is one, last purchase price otherwise',
      cell: (r) => (
        <span className="tnum text-[12.5px] font-semibold text-fg">
          {fmtCurrency(totalsOf(r).value, 'IDR', { compact: true })}
        </span>
      ),
    },
    {
      key: 'createdAt', header: 'Raised', width: 'w-[156px]', sortable: true,
      sortValue: (r) => r.createdAt, exportValue: (r) => r.createdAt.slice(0, 10),
      cell: (r) => (
        <div className="min-w-0">
          <p className="tnum text-[12px] text-fg-muted">{fmtDate(r.createdAt)}</p>
          <p className="truncate text-[11px] text-fg-subtle">{r.createdBy}</p>
        </div>
      ),
    },
    {
      key: 'approved', header: 'Approved', width: 'w-[156px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.approvedAt ?? '', exportValue: (r) => r.approvedAt?.slice(0, 10) ?? '',
      cell: (r) =>
        r.approvedAt ? (
          <div className="min-w-0">
            <p className="tnum text-[12px] text-fg-muted">{fmtDate(r.approvedAt)}</p>
            <p className="truncate text-[11px] text-fg-subtle">{r.approvedBy}</p>
          </div>
        ) : (
          <span className="text-[12px] text-fg-subtle">—</span>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Purchase Requests"
        description="The recap of a locked session: every division's request merged into one line per item, ready to be split across suppliers."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open requests"
          value={open.length}
          icon={<ShoppingCart />}
          accent={open.length ? 'primary' : 'neutral'}
          sub={`${purchaseRequests.length} raised in total`}
        />
        <KpiCard
          label="Lines without a supplier"
          value={unassignedLines}
          icon={<Layers />}
          accent={unassignedLines ? 'warning' : 'success'}
          sub={unassignedLines ? 'assign a supplier to see its last price' : 'every open line is assigned'}
        />
        <KpiCard
          label="Open value"
          value={fmtCurrency(openValue, 'IDR', { compact: true })}
          icon={<Wallet />}
          accent="accent"
          sub="draft and assigned requests"
        />
        <KpiCard
          label="Ordered"
          value={fmtCurrency(orderedValue, 'IDR', { compact: true })}
          icon={<Truck />}
          accent="purple"
          sub={`${purchaseRequests.filter((p) => p.status === 'ORDERED').length} requests placed with suppliers`}
        />
      </div>

      <DataTable
        data={purchaseRequests}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => r.code}
        entityLabel="purchase request"
        storageKey="purchase-requests"
        allowExport={can('pr.export')}
        exportName="tata-gemilang-purchase-requests"
        searchText={(r) =>
          [r.code, r.status, sessionOf(r)?.code, r.createdBy, r.note, ...r.lines.map((l) => items.find((i) => i.id === l.itemId)?.name ?? '')]
            .filter(Boolean)
            .join(' ')
        }
        initialSort={{ key: 'code', dir: 'desc' }}
        onRowClick={(r) => nav(`/purchase-requests/${r.id}`)}
        rowTone={(r) => (r.status === 'DRAFT' ? 'bg-primary-soft/25' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['DRAFT', 'ASSIGNED', 'APPROVED', 'ORDERED', 'CANCELLED'].map((v) => ({ value: v, label: v.toLowerCase() })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'supplier', label: 'Supplier', values: supplierFilter, onChange: setSupplierFilter,
            options: suppliers.map((s) => ({ value: s.id, label: s.brandName ?? s.legalName })),
            match: (r, v) => r.lines.some((l) => l.supplierId && v.includes(l.supplierId)),
          },
        ]}
        rowActions={(r) => (
          <Tooltip content="Open the recap">
            <Button variant="ghost" size="iconXs" onClick={() => nav(`/purchase-requests/${r.id}`)}>
              <Eye />
            </Button>
          </Tooltip>
        )}
        footerSummary={(rows) => (
          <span className="tnum">
            {fmtCurrency(rows.reduce((a, r) => a + totalsOf(r).value, 0), 'IDR', { compact: true })} across{' '}
            {rows.reduce((a, r) => a + r.lines.length, 0)} lines in this view
          </span>
        )}
        emptyTitle="No purchase requests yet"
        emptyDescription="Lock a material request session and its recap will appear here."
        emptyAction={
          <Button variant="primary" size="sm" onClick={() => nav('/mr')}>
            <CheckCircle2 /> Go to material requests
          </Button>
        }
      />
    </>
  )
}
