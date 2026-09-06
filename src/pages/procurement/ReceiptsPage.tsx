import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PackageCheck, Plus, Truck } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column, TableFilter } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { StatusBadge } from '@/components/shared/status'
import { cn, uid } from '@/lib/utils'
import { fmtDate, fmtNumber, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { orderProgress, lineNet } from '@/lib/procurement'
import { REJECT_REASONS, rejectReasonLabel, uomLabel } from '@/data/reference'
import type { GoodsReceipt, GoodsReceiptLine, RejectReason } from '@/data/types'

export function ReceiptsPage() {
  const navigate = useNavigate()
  const store = useErp()
  const toast = useToast()
  const [modes, setModes] = React.useState<string[]>([])
  const [qc, setQc] = React.useState<string[]>([])
  const [booking, setBooking] = React.useState(false)

  const filters: TableFilter<GoodsReceipt>[] = [
    {
      key: 'mode',
      label: 'How it arrived',
      options: [
        { value: 'FULL', label: 'Full — the whole order at once' },
        { value: 'PARTIAL', label: 'Partial — one of several deliveries' },
        { value: 'DIRECT', label: 'Direct — never touched our gate' },
      ],
      values: modes,
      onChange: setModes,
      match: (r, v) => v.includes(r.mode),
    },
    {
      key: 'qc',
      label: 'Inspection',
      options: ['PASSED', 'PARTIAL', 'FAILED', 'PENDING'].map((v) => ({ value: v, label: titleCase(v) })),
      values: qc,
      onChange: setQc,
      match: (r, v) => v.includes(r.qcResult),
    },
  ]

  const columns: Column<GoodsReceipt>[] = [
    {
      key: 'code',
      header: 'Receipt',
      width: 'min-w-[180px]',
      pinned: true,
      sortable: true,
      sortValue: (r) => r.code,
      exportValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{fmtDate(r.receivedAt)} · {r.receivedByName}</p>
        </div>
      ),
    },
    {
      key: 'mode',
      header: 'How it arrived',
      width: 'w-[190px]',
      tour: 'modes',
      sortable: true,
      sortValue: (r) => r.mode,
      exportValue: (r) => r.mode,
      headerHint: 'A purchase order rarely arrives the way it was ordered. Each delivery is its own record.',
      cell: (r) => (
        <div className="space-y-1">
          <Badge size="sm" tone={r.mode === 'FULL' ? 'success' : r.mode === 'DIRECT' ? 'purple' : 'warning'}>
            {titleCase(r.mode)} · delivery {r.sequence}
          </Badge>
          {r.deliveredToName && <p className="truncate text-[11px] text-fg-muted">{r.deliveredToName}</p>}
        </div>
      ),
    },
    {
      key: 'po',
      header: 'Against',
      width: 'min-w-[200px]',
      sortable: true,
      sortValue: (r) => r.poCode,
      exportValue: (r) => r.poCode,
      cell: (r) => (
        <div className="min-w-0">
          <Link to={`/purchase-orders/${r.poId}`} className="truncate font-medium text-fg hover:text-primary">{r.poCode}</Link>
          <p className="truncate text-[11.5px] text-fg-muted">{r.supplierName}</p>
        </div>
      ),
    },
    {
      key: 'note',
      header: 'Delivery note',
      width: 'w-[190px]',
      exportValue: (r) => r.deliveryNoteNo,
      cell: (r) => (
        <div className="min-w-0">
          <p className="tnum truncate text-fg">{r.deliveryNoteNo}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.vehicleNo} · {r.driverName}</p>
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Delivered / accepted',
      align: 'right',
      width: 'w-[160px]',
      sortable: true,
      sortValue: (r) => r.lines.reduce((a, l) => a + l.qtyDelivered, 0),
      exportValue: (r) => r.lines.reduce((a, l) => a + l.qtyAccepted, 0),
      cell: (r) => {
        const d = r.lines.reduce((a, l) => a + l.qtyDelivered, 0)
        const a = r.lines.reduce((x, l) => x + l.qtyAccepted, 0)
        return (
          <div className="text-right">
            <p className="tnum font-medium">{fmtNumber(a, 2)}</p>
            <p className="tnum text-[11px] text-fg-muted">of {fmtNumber(d, 2)} delivered</p>
          </div>
        )
      },
    },
    {
      key: 'qc',
      header: 'Inspection',
      width: 'w-[170px]',
      sortable: true,
      sortValue: (r) => r.qcResult,
      exportValue: (r) => r.qcResult,
      cell: (r) => {
        const rejected = r.lines.filter((l) => l.qtyRejected > 0)
        return (
          <div className="space-y-1">
            <StatusBadge value={r.qcResult} size="sm" />
            {rejected.map((l) => (
              <Tooltip key={l.id} content={`${fmtNumber(l.qtyRejected, 2)} ${uomLabel(l.uom)} of ${l.description}`}>
                <span className="block">
                  <Badge size="sm" tone="danger">{rejectReasonLabel(l.rejectReason ?? 'DEFECT')}</Badge>
                </span>
              </Tooltip>
            ))}
          </div>
        )
      },
    },
    {
      key: 'warehouse',
      header: 'Put away',
      width: 'w-[170px]',
      exportValue: (r) => store.warehouses.find((w) => w.id === r.warehouseId)?.name ?? '',
      cell: (r) => (
        <span className="text-[12px] text-fg-muted">
          {store.warehouses.find((w) => w.id === r.warehouseId)?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'legality',
      header: 'Legality',
      width: 'w-[150px]',
      defaultHidden: true,
      exportValue: (r) => r.lines.map((l) => l.legalityDocNo).filter(Boolean).join(' '),
      cell: (r) => {
        const docs = r.lines.map((l) => l.legalityDocNo).filter(Boolean)
        const missing = r.lines.some((l) => l.rejectReason === 'NO_LEGALITY_DOC')
        if (missing) return <Badge size="sm" tone="danger">missing</Badge>
        if (!docs.length) return <span className="text-[12px] text-fg-subtle">—</span>
        return <span className="tnum text-[11.5px] text-fg-muted">{docs[0]}</span>
      },
    },
  ]

  const partial = store.receipts.filter((r) => r.mode === 'PARTIAL')
  const direct = store.receipts.filter((r) => r.mode === 'DIRECT')
  const rejected = store.receipts.filter((r) => r.lines.some((l) => l.qtyRejected > 0))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Procurement</Badge>}
        title="Goods receipts"
        description="Eleven cubic metres of teak does not arrive as eleven cubic metres of teak. It arrives as four, then three, then a lorry that is short by half a metre and carries no legality document for the batch. Every one of those is a receipt, and the order's open balance is the sum of them."
        actions={
          <Button variant="primary" onClick={() => setBooking(true)}>
            <Plus /> Book in a delivery
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Deliveries booked" value={String(store.receipts.length)} sub={`against ${new Set(store.receipts.map((r) => r.poId)).size} orders`} icon={<PackageCheck />} accent="primary" />
        <KpiCard label="Part deliveries" value={String(partial.length)} sub="orders that arrived in pieces" icon={<Truck />} accent="warning" />
        <KpiCard label="Direct deliveries" value={String(direct.length)} sub="never entered the main gate" accent="purple" />
        <KpiCard
          label="With rejections"
          value={String(rejected.length)}
          sub={`${fmtNumber(store.receipts.reduce((a, r) => a + r.lines.reduce((x, l) => x + l.qtyRejected, 0), 0), 1)} units in quarantine`}
          accent={rejected.length ? 'danger' : 'accent'}
        />
      </div>

      <DataTable
        data={store.receipts}
        columns={columns}
        filters={filters}
        getId={(r) => r.id}
        getLabel={(r) => r.code}
        entityLabel="receipts"
        searchText={(r) => `${r.code} ${r.poCode} ${r.supplierName} ${r.deliveryNoteNo} ${r.vehicleNo ?? ''} ${r.driverName ?? ''} ${r.lines.map((l) => l.description).join(' ')}`}
        onRowClick={(r) => navigate(`/receipts/${r.id}`)}
        onDelete={store.removeReceipts}
        deleteNote="Deleting a receipt does not put the stock back. In a real build this would be a reversing movement, not a delete."
        exportName="kriyanusa-goods-receipts"
        storageKey="receipts"
        initialSort={{ key: 'code', dir: 'desc' }}
        rowTone={(r) => (r.qcResult === 'FAILED' ? 'bg-danger-soft/25' : undefined)}
      />

      <BookDeliverySheet open={booking} onOpenChange={setBooking} onDone={(code) => toast.push({ tone: 'success', title: 'Delivery booked in', description: `${code} posted. The order balance and the stock ledger both moved.` })} />
    </div>
  )
}

/* ================================================================
   Booking a delivery — the flow that makes partial and direct real
   ================================================================ */

function BookDeliverySheet({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onDone: (code: string) => void
}) {
  const store = useErp()
  const [poId, setPoId] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<'FULL' | 'PARTIAL' | 'DIRECT'>('PARTIAL')
  const [noteNo, setNoteNo] = React.useState('')
  const [vehicle, setVehicle] = React.useState('')
  const [driver, setDriver] = React.useState('')
  const [warehouseId, setWarehouseId] = React.useState<string>('wh_rm')
  const [qty, setQty] = React.useState<Record<string, { delivered: string; rejected: string; reason?: RejectReason; doc: string }>>({})

  const candidates = store.orders.filter((o) =>
    ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'].includes(o.status) &&
    o.lines.some((l) => l.receivedQty < l.qty),
  )
  const po = store.orders.find((o) => o.id === poId)

  React.useEffect(() => {
    if (!po) return
    setWarehouseId(po.warehouseId)
    setMode(po.deliveryMode === 'TO_SITE' ? 'DIRECT' : 'PARTIAL')
    setNoteNo(`SJ/${po.supplierName.split(' ')[1]?.slice(0, 3).toUpperCase() ?? 'SUP'}/${Math.floor(Math.random() * 9000 + 1000)}`)
    const next: typeof qty = {}
    po.lines.forEach((l) => {
      next[l.id] = { delivered: String(Math.max(0, Math.round((l.qty - l.receivedQty) * 100) / 100)), rejected: '0', doc: '' }
    })
    setQty(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poId])

  const post = () => {
    if (!po) return
    const sequence = store.receipts.filter((r) => r.poId === po.id).length + 1
    const lines: GoodsReceiptLine[] = po.lines
      .map((l) => {
        const entry = qty[l.id]
        const delivered = Number(entry?.delivered ?? 0)
        const rejectedQty = Math.min(delivered, Number(entry?.rejected ?? 0))
        return {
          id: uid('grl'),
          poLineId: l.id,
          itemId: l.itemId,
          description: l.description,
          uom: l.uom,
          qtyDelivered: delivered,
          qtyAccepted: Math.round((delivered - rejectedQty) * 1000) / 1000,
          qtyRejected: rejectedQty,
          rejectReason: rejectedQty > 0 ? entry?.reason ?? 'DEFECT' : undefined,
          legalityDocNo: entry?.doc || undefined,
          batchNo: `B${Date.now().toString().slice(-6)}`,
        }
      })
      .filter((l) => l.qtyDelivered > 0)

    if (!lines.length) return

    const anyReject = lines.some((l) => l.qtyRejected > 0)
    const allReject = lines.every((l) => l.qtyRejected >= l.qtyDelivered)
    const code = `GRN-26-${String(900 + store.receipts.length + 1).padStart(4, '0')}`

    const grn: GoodsReceipt = {
      id: uid('grn'),
      code,
      poId: po.id,
      poCode: po.code,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      projectId: po.projectId,
      mode,
      sequence,
      receivedAt: new Date().toISOString(),
      deliveryNoteNo: noteNo,
      vehicleNo: vehicle || undefined,
      driverName: driver || undefined,
      warehouseId,
      deliveredToName: mode === 'DIRECT' ? 'Delivered straight to the line' : undefined,
      qcResult: allReject ? 'FAILED' : anyReject ? 'PARTIAL' : 'PASSED',
      qcByName: 'Anita Kusuma',
      receivedByName: 'Yusuf Maulana',
      posted: true,
      lines,
    }
    store.postReceipt(grn)
    onDone(code)
    onOpenChange(false)
    setPoId(null)
  }

  const progress = po ? orderProgress(po, store.receipts) : null

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Book in a delivery"
      description="Posting this writes the accepted quantity into the receiving warehouse, the rejected quantity into the quarantine bay, and both back onto the purchase order line."
      width="max-w-3xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={!po} onClick={post}>Post the receipt</Button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        <Field label="Against which purchase order" required help="Only approved orders with something still outstanding can take a delivery.">
          <Select
            value={poId}
            onChange={setPoId}
            searchable
            placeholder="Choose an order…"
            options={candidates.map((o) => ({
              value: o.id,
              label: `${o.code} · ${o.supplierName}`,
              description: `${o.lines.filter((l) => l.receivedQty < l.qty).length} lines outstanding · expected ${fmtDate(o.expectedAt)}`,
            }))}
          />
        </Field>

        {po && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="How it arrived" help="Full is the whole order at once. Partial is one of several. Direct never entered the gate.">
                <Select
                  value={mode}
                  onChange={(v) => setMode(v)}
                  options={[
                    { value: 'FULL', label: 'Full delivery', description: 'Everything outstanding, in one lorry.' },
                    { value: 'PARTIAL', label: 'Part delivery', description: 'One of several against this order.' },
                    { value: 'DIRECT', label: 'Direct delivery', description: 'Straight to the workshop or the packing hall.' },
                  ]}
                />
              </Field>
              <Field label="Receiving store">
                <Select
                  value={warehouseId}
                  onChange={setWarehouseId}
                  options={store.warehouses.map((w) => ({ value: w.id, label: w.name, description: w.city }))}
                />
              </Field>
              <Field label="Supplier delivery note (surat jalan)" required>
                <Input value={noteNo} onChange={(e) => setNoteNo(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Vehicle">
                  <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="K 8812 GH" />
                </Field>
                <Field label="Driver">
                  <Input value={driver} onChange={(e) => setDriver(e.target.value)} placeholder="Slamet" />
                </Field>
              </div>
            </div>

            <Card>
              <CardHeader
                title="What actually turned up"
                description={`${progress?.receivedPct.toFixed(0)}% of this order is already in. Enter what the lorry brought, and what failed inspection at the gate.`}
              />
              <div className="scrollbar-thin overflow-x-auto">
                <table className="w-full min-w-[640px] text-[12.5px]">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                      <th className="px-4 py-2 font-medium">Item</th>
                      <th className="px-4 py-2 text-right font-medium">Outstanding</th>
                      <th className="px-4 py-2 font-medium">Delivered</th>
                      <th className="px-4 py-2 font-medium">Rejected</th>
                      <th className="px-4 py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {po.lines.map((l) => {
                      const item = store.items.find((i) => i.id === l.itemId)
                      const outstanding = Math.max(0, l.qty - l.receivedQty)
                      const entry = qty[l.id] ?? { delivered: '0', rejected: '0', doc: '' }
                      return (
                        <tr key={l.id}>
                          <td className="px-4 py-2">
                            <p className="font-medium text-fg">{l.description}</p>
                            <p className="text-[11.5px] text-fg-muted">
                              {item?.sku} · {fmtNumber(l.qty, 2)} {uomLabel(l.uom)} ordered at{' '}
                              {fmtNumber(lineNet(l))}
                            </p>
                            {item?.legalityControlled && (
                              <Input
                                className="mt-1.5"
                                value={entry.doc}
                                placeholder="Supplier legality reference for this batch"
                                onChange={(e) => setQty({ ...qty, [l.id]: { ...entry, doc: e.target.value } })}
                              />
                            )}
                          </td>
                          <td className="tnum px-4 py-2 text-right text-fg-muted">{fmtNumber(outstanding, 2)}</td>
                          <td className="px-4 py-2">
                            <Input
                              className="w-24"
                              value={entry.delivered}
                              onChange={(e) => setQty({ ...qty, [l.id]: { ...entry, delivered: e.target.value } })}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              className="w-20"
                              value={entry.rejected}
                              onChange={(e) => setQty({ ...qty, [l.id]: { ...entry, rejected: e.target.value } })}
                            />
                          </td>
                          <td className="px-4 py-2">
                            {Number(entry.rejected) > 0 ? (
                              <Select
                                size="sm"
                                value={entry.reason ?? 'DEFECT'}
                                onChange={(v) => setQty({ ...qty, [l.id]: { ...entry, reason: v as RejectReason } })}
                                options={REJECT_REASONS.map((r) => ({ value: r.value, label: r.label, description: r.hint }))}
                              />
                            ) : (
                              <span className="text-[12px] text-fg-subtle">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <CardBody className="border-t border-border">
                <p className={cn('text-[12px] leading-relaxed text-fg-muted')}>
                  Anything rejected goes to the quarantine bay rather than back to the supplier's account. It stays on our
                  books, it is not available to a work order, and the purchase order stays short by that quantity until the
                  supplier either replaces it or credits it.
                </p>
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </Sheet>
  )
}
