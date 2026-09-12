import * as React from 'react'
import { Link } from 'react-router-dom'
import { ClipboardCheck, PackageCheck, ShieldAlert, Truck } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, MetaRow, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import type { GoodsReceipt } from '@/data/types'
import { receiptState, receivingSummary } from '@/lib/receiving'
import {
  discrepancyMeta, QUARANTINE_SLA_DAYS, RECEIPT_DISCREPANCIES, RECEIPT_STATUSES,
  receiptIsOpen, receiptStatusMeta,
} from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'

export function ReceivingPage() {
  const {
    goodsReceipts, suppliers, items, warehouses, purchaseOrders, shipments,
    startCounting, acceptReceipt, putAwayReceipt, rejectReceipt,
  } = useMfg()
  const toast = useToast()
  const [status, setStatus] = React.useState<string[]>([])
  const [flag, setFlag] = React.useState<string[]>([])
  const [selectedId, setSelectedId] = React.useState(
    goodsReceipts.find((r) => receiptIsOpen(r.status))?.id ?? goodsReceipts[0]?.id ?? '',
  )

  const s = receivingSummary(goodsReceipts)
  const selected = goodsReceipts.find((r) => r.id === selectedId) ?? goodsReceipts[0]
  const supplier = (id: string) => suppliers.find((x) => x.id === id)

  const columns: Column<GoodsReceipt>[] = [
    {
      key: 'code', header: 'Receipt', width: 'min-w-[240px]', pinned: true, sortable: true, sortValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{r.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{supplier(r.supplierId)?.name}</p>
        </div>
      ),
      exportValue: (r) => r.code,
    },
    {
      key: 'status', header: 'Status', width: 'w-[165px]', sortable: true, sortValue: (r) => r.status,
      cell: (r) => (
        <Tooltip content={receiptStatusMeta(r.status)?.hint ?? ''}>
          <div className="min-w-0">
            <StatusBadge value={r.status} size="sm" />
            {r.status === 'AWAITING_QC' && (
              <p className={`mt-0.5 tnum text-[11px] ${receiptState(r).quarantineOverdue ? 'text-danger' : 'text-fg-muted'}`}>
                {receiptState(r).quarantineDays} d in quarantine
              </p>
            )}
          </div>
        </Tooltip>
      ),
      exportValue: (r) => r.status,
    },
    {
      key: 'against', header: 'Against', width: 'min-w-[175px]',
      cell: (r) => {
        const po = purchaseOrders.find((p) => p.id === r.purchaseOrderId)
        const sh = shipments.find((x) => x.id === r.shipmentId)
        return (
          <div className="min-w-0">
            {po && <Link to={`/purchasing/${po.id}`} className="truncate font-mono text-[11.5px] text-primary hover:underline">{po.code}</Link>}
            {sh && <Link to={`/imports/${sh.id}`} className="truncate font-mono text-[11.5px] text-primary hover:underline">{sh.code}</Link>}
            <p className="truncate text-[11px] text-fg-muted">{r.supplierDeliveryNote ?? 'no delivery note'}</p>
          </div>
        )
      },
      exportValue: (r) => r.purchaseOrderId ?? r.shipmentId ?? '',
    },
    {
      key: 'counts', header: 'Delivered vs accepted', width: 'min-w-[220px]',
      headerHint: 'What arrived against what we took in. The gap is the only honest measure of a supplier’s incoming quality.',
      cell: (r) => {
        const delivered = r.lines.reduce((a, l) => a + l.deliveredQuantity, 0)
        const accepted = r.lines.reduce((a, l) => a + l.acceptedQuantity, 0)
        const pct = delivered > 0 ? (accepted / delivered) * 100 : 0
        return (
          <div>
            <div className="flex items-center gap-2">
              <Progress value={pct} tone={pct === 100 ? 'success' : pct > 0 ? 'warning' : 'danger'} className="flex-1" size="sm" />
              <span className="tnum shrink-0 text-[11px] text-fg-muted">{fmtPercent(pct, 0)}</span>
            </div>
            <p className="tnum mt-1 text-[11px] text-fg-muted">
              {r.lines.length} line{r.lines.length === 1 ? '' : 's'} · {fmtCurrency(receiptState(r).acceptedValue, 'IDR', { compact: true })} taken in
            </p>
          </div>
        )
      },
      exportValue: (r) => receiptState(r).acceptedValue,
    },
    {
      key: 'discrepancy', header: 'What went wrong', width: 'min-w-[300px]',
      cell: (r) => {
        const bad = r.lines.filter((l) => l.discrepancy !== 'NONE')
        if (!bad.length) return <span className="text-[12px] text-success">Matches the order</span>
        return (
          <div className="min-w-0 space-y-0.5">
            {bad.slice(0, 2).map((l) => (
              <p key={l.id} className="line-clamp-2 text-[11.5px] leading-snug text-danger">
                <strong className="font-medium">{discrepancyMeta(l.discrepancy)?.label}.</strong> {l.discrepancyNote}
              </p>
            ))}
          </div>
        )
      },
      exportValue: (r) => r.lines.filter((l) => l.discrepancy !== 'NONE').map((l) => l.discrepancy).join(' | '),
    },
    {
      key: 'at', header: 'Received', width: 'w-[140px]', sortable: true, sortValue: (r) => r.receivedAt,
      cell: (r) => (
        <div>
          <p className="tnum text-[12.5px] text-fg">{fmtDate(r.receivedAt)}</p>
          <p className="truncate text-[11px] text-fg-muted">{r.receivedBy}</p>
        </div>
      ),
      exportValue: (r) => r.receivedAt,
    },
  ]

  const advance = (r: GoodsReceipt) => {
    if (r.status === 'DRAFT') {
      startCounting(r.id)
      toast.push({ title: `${r.code} counting`, description: `Checking against ${r.supplierDeliveryNote ?? 'the delivery note'}.`, tone: 'info' })
    } else if (r.status === 'COUNTING') {
      acceptReceipt(r.id)
      toast.push({
        title: `${r.code} taken in`,
        description: r.qcRequired
          ? 'Into quarantine. It is on the books and it is not issuable until inspection passes.'
          : 'No inspection needed — it can be racked straight away.',
        tone: 'success',
      })
    } else {
      putAwayReceipt(r.id)
      toast.push({ title: `${r.code} put away`, description: 'Lots created and the purchase order line moved. This is the moment it becomes stock.', tone: 'success' })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Goods receipt"
        description="Penerimaan barang. The lorry arriving is not the moment material becomes stock — between the two there is a count, an inspection and a put-away, and only the last of those makes anything issuable."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="At the gate"
          value={fmtNumber(s.openReceipts)}
          icon={<Truck />} accent="primary"
          sub={`${fmtCurrency(s.receivedThisMonthValue, 'IDR', { compact: true })} racked this month`}
        />
        <KpiCard
          label="Stuck in quarantine"
          value={fmtCurrency(s.quarantineValue, 'IDR', { compact: true })}
          icon={<ShieldAlert />}
          accent={s.quarantineOverdue ? 'danger' : s.inQuarantine ? 'warning' : 'success'}
          sub={s.inQuarantine ? `${fmtNumber(s.inQuarantine)} receipt(s), ${fmtNumber(s.quarantineOverdue)} past ${QUARANTINE_SLA_DAYS} days` : 'nothing waiting on inspection'}
        />
        <KpiCard
          label="Acceptance rate"
          value={fmtPercent(s.acceptanceRatePercent, 1)}
          icon={<PackageCheck />}
          accent={s.acceptanceRatePercent >= 98 ? 'success' : 'warning'}
          sub={`${fmtCurrency(s.rejectedValue, 'IDR', { compact: true })} refused in ninety days`}
        />
        <KpiCard
          label="Open discrepancies"
          value={fmtNumber(s.discrepancies)}
          icon={<ClipboardCheck />}
          accent={s.discrepancies ? 'warning' : 'success'}
          sub={s.discrepancies ? 'short, damaged or off specification' : 'everything matches its order'}
        />
      </div>

      {s.quarantineOverdue > 0 && (
        <Card>
          <CardBody className="py-3">
            <p className="text-[12.5px] text-fg">
              <span className="font-semibold text-danger">{fmtNumber(s.quarantineOverdue)}</span> receipt{s.quarantineOverdue === 1 ? '' : 's'} past the {QUARANTINE_SLA_DAYS}-day inspection service level, worth {fmtCurrency(s.quarantineValue, 'IDR', { compact: true })}.{' '}
              <span className="text-fg-muted">
                It is inventory we own and cannot issue — the worst of both. Either inspect it or send it back.
              </span>
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <DataTable
          data={goodsReceipts}
          columns={columns}
          getId={(r) => r.id}
          getLabel={(r) => r.code}
          entityLabel="receipt"
          exportName="goods-receipts"
          storageKey="receiving"
          searchText={(r) => `${r.code} ${supplier(r.supplierId)?.name ?? ''} ${r.supplierDeliveryNote ?? ''} ${r.lines.map((l) => l.description).join(' ')}`}
          onRowClick={(r) => setSelectedId(r.id)}
          initialSort={{ key: 'at', dir: 'desc' }}
          rowTone={(r) =>
            r.status === 'REJECTED' || receiptState(r).quarantineOverdue
              ? 'bg-danger-soft/25'
              : r.lines.some((l) => l.discrepancy !== 'NONE') && receiptIsOpen(r.status)
                ? 'bg-warning-soft/20'
                : undefined
          }
          filters={[
            {
              key: 'status', label: 'Status', values: status, onChange: setStatus,
              options: RECEIPT_STATUSES.map((x) => ({ value: x.value, label: x.label })),
              match: (r, v) => v.includes(r.status),
            },
            {
              key: 'flag', label: 'Show', values: flag, onChange: setFlag,
              options: [
                { value: 'OPEN', label: 'Still open' },
                { value: 'DISCREPANCY', label: 'With a discrepancy' },
                { value: 'QUARANTINE', label: 'In quarantine' },
              ],
              match: (r, v) =>
                (!v.includes('OPEN') || receiptIsOpen(r.status))
                && (!v.includes('DISCREPANCY') || r.lines.some((l) => l.discrepancy !== 'NONE'))
                && (!v.includes('QUARANTINE') || r.status === 'AWAITING_QC'),
            },
          ]}
        />

        <div className="flex flex-col gap-5">
          {!selected && <Card><CardBody><EmptyState title="Nothing to show" /></CardBody></Card>}
          {selected && (
            <>
              <Card>
                <CardHeader
                  icon={<Truck />}
                  title={selected.code}
                  description={receiptStatusMeta(selected.status)?.hint}
                  actions={<StatusBadge value={selected.status} size="sm" />}
                />
                <CardBody>
                  <MetaRow label="Supplier">{supplier(selected.supplierId)?.name}</MetaRow>
                  <MetaRow label="Their note">{selected.supplierDeliveryNote ?? '—'}</MetaRow>
                  <MetaRow label="Received">{fmtDate(selected.receivedAt)} · {selected.receivedBy}</MetaRow>
                  <MetaRow label="Gate">{warehouses.find((w) => w.id === selected.warehouseId)?.name}</MetaRow>
                  <MetaRow label="Inspection">
                    {selected.qcRequired
                      ? selected.qcPassedAt ? `Passed ${fmtDate(selected.qcPassedAt, 'short')}` : 'Required, not yet done'
                      : 'Not required'}
                  </MetaRow>
                  <MetaRow label="Taken in at">{fmtCurrency(receiptState(selected).acceptedValue, 'IDR', { compact: true })}</MetaRow>
                  {selected.note && (
                    <>
                      <Separator className="my-2.5" />
                      <Because>{selected.note}</Because>
                    </>
                  )}
                  {receiptIsOpen(selected.status) && (
                    <>
                      <Separator className="my-3" />
                      <div className="flex gap-2">
                        <Button size="sm" variant="primary" className="flex-1" onClick={() => advance(selected)}>
                          {selected.status === 'DRAFT' ? 'Start counting' : selected.status === 'COUNTING' ? 'Take it in' : 'Put away'}
                        </Button>
                        <Button
                          size="sm" variant="outlineDanger"
                          onClick={() => {
                            rejectReceipt(selected.id, 'Refused at the gate.')
                            toast.push({ title: `${selected.code} refused`, description: 'Nothing from this note is in stock.', tone: 'warning' })
                          }}
                        >
                          Refuse
                        </Button>
                      </div>
                      <Because className="mt-2 text-[11px]">{receiptState(selected).note}</Because>
                    </>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader icon={<ClipboardCheck />} title="Line by line" description="Ordered, delivered, accepted — and what happened to the difference." />
                <CardBody className="space-y-2.5">
                  {selected.lines.map((l) => {
                    const meta = discrepancyMeta(l.discrepancy)
                    const item = items.find((i) => i.id === l.itemId)
                    return (
                      <div
                        key={l.id}
                        className={`rounded-lg border px-3 py-2.5 ${l.discrepancy === 'NONE' ? 'border-border bg-surface-sunken' : 'border-warning/30 bg-warning-soft/20'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[12.5px] font-medium text-fg">{l.description}</p>
                            <p className="truncate font-mono text-[11px] text-fg-muted">{item?.code}</p>
                          </div>
                          {l.discrepancy !== 'NONE' && (
                            <Tooltip content={meta?.hint ?? ''}>
                              <span><Badge tone={meta?.chargeable ? 'danger' : 'warning'} size="sm">{meta?.label}</Badge></span>
                            </Tooltip>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-right">
                          <div>
                            <p className="text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">Ordered</p>
                            <p className="tnum text-[12px]">{fmtNumber(l.orderedQuantity, 2)}</p>
                          </div>
                          <div>
                            <p className="text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">Delivered</p>
                            <p className="tnum text-[12px]">{fmtNumber(l.deliveredQuantity, 2)}</p>
                          </div>
                          <div>
                            <p className="text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">Accepted</p>
                            <p className={`tnum text-[12px] font-semibold ${l.acceptedQuantity < l.deliveredQuantity ? 'text-danger' : 'text-fg'}`}>
                              {fmtNumber(l.acceptedQuantity, 2)}
                            </p>
                          </div>
                        </div>
                        {l.moisturePercent !== undefined && (
                          <p className={`tnum mt-1.5 text-[11px] ${item?.targetMoistureMax !== undefined && l.moisturePercent > item.targetMoistureMax ? 'font-medium text-danger' : 'text-fg-muted'}`}>
                            Moisture on arrival {l.moisturePercent}%
                            {item?.targetMoistureMax !== undefined && ` against a ${item.targetMoistureMin}–${item.targetMoistureMax}% band`}
                          </p>
                        )}
                        {l.supplierBatchNo && <p className="mt-0.5 font-mono text-[11px] text-fg-muted">batch {l.supplierBatchNo}</p>}
                        {l.discrepancyNote && <Because className="mt-1.5 text-[11px]">{l.discrepancyNote}</Because>}
                      </div>
                    )
                  })}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="What a discrepancy costs" description="Each of these has somebody to charge it to, and a window in which to do it." />
                <CardBody className="space-y-1.5">
                  {RECEIPT_DISCREPANCIES.filter((d) => d.value !== 'NONE').map((d) => (
                    <div key={d.value} className="flex items-start justify-between gap-3 py-0.5">
                      <Tooltip content={d.hint}>
                        <span className="text-[12.5px] text-fg">{d.label}</span>
                      </Tooltip>
                      <Badge tone={d.chargeable ? 'danger' : 'neutral'} size="sm">
                        {d.chargeable ? 'chargeable' : 'absorb'}
                      </Badge>
                    </div>
                  ))}
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
