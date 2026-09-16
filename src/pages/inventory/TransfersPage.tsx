import * as React from 'react'
import { ArrowLeftRight, ClipboardCheck } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { StatusBadge } from '@/components/shared/status'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtDate, fmtNumber, relativeLabel } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { countVariance } from '@/lib/inventory'
import { uomLabel } from '@/data/reference'

export function TransfersPage() {
  const store = useErp()
  const toast = useToast()
  const [view, setView] = React.useState<'transfers' | 'counts'>('transfers')

  const warehouseOf = (id: string) => store.warehouses.find((w) => w.id === id)
  const itemOf = (id: string) => store.items.find((i) => i.id === id)

  const inTransit = store.transfers.filter((t) => t.status === 'IN_TRANSIT')
  const openCounts = store.counts.filter((c) => c.status !== 'POSTED' && c.status !== 'CANCELLED')

  return (
    <div className="min-h-0">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Inventory</Badge>}
        title="Transfers & counts"
        description="Stock moving between the seven stores, and the counts that tell you what the ledger got wrong. A transfer that has left one warehouse and not arrived at the other belongs to neither — which is exactly why it needs watching."
        actions={
          <Tabs
            variant="pill"
            value={view}
            onChange={setView}
            items={[
              { value: 'transfers', label: 'Transfers', count: store.transfers.length },
              { value: 'counts', label: 'Stock counts', count: store.counts.length },
            ]}
          />
        }
      />

      {view === 'transfers' && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Transfers" value={String(store.transfers.length)} sub={`${store.transfers.filter((t) => t.status === 'RECEIVED').length} completed`} icon={<ArrowLeftRight />} accent="primary" />
            <KpiCard label="In transit" value={String(inTransit.length)} sub={inTransit.length ? 'stock nobody can pick' : 'nothing on the road'} accent={inTransit.length ? 'warning' : 'accent'} />
            <KpiCard
              label="Value moving"
              value={fmtCurrency(
                inTransit.reduce((a, t) => a + t.lines.reduce((la, l) => la + l.qty * (itemOf(l.itemId)?.standardCost ?? 0), 0), 0),
                'IDR',
                { compact: true },
              )}
              sub="between warehouses right now"
              accent="warning"
            />
            <KpiCard label="Drafts" value={String(store.transfers.filter((t) => t.status === 'DRAFT').length)} sub="raised but not issued" />
          </div>

          <div className="space-y-3">
            {store.transfers.length === 0 && <EmptyState title="No transfers" />}
            {store.transfers.map((t) => {
              const value = t.lines.reduce((a, l) => a + l.qty * (itemOf(l.itemId)?.standardCost ?? 0), 0)
              const age = Math.abs(Math.round((Date.now() - new Date(t.issuedAt).getTime()) / 86_400_000))
              return (
                <Card key={t.id} className={cn(t.status === 'IN_TRANSIT' && age > 5 && 'border-warning/45')}>
                  <CardHeader
                    icon={<ArrowLeftRight />}
                    title={
                      <span className="flex flex-wrap items-center gap-2">
                        {t.code}
                        <StatusBadge value={t.status} size="sm" />
                        {t.status === 'IN_TRANSIT' && age > 5 && <Badge size="sm" tone="warning">{age} days in transit</Badge>}
                      </span>
                    }
                    description={
                      <>
                        <span className="font-medium text-fg">{warehouseOf(t.fromWarehouseId)?.name}</span> →{' '}
                        <span className="font-medium text-fg">{warehouseOf(t.toWarehouseId)?.name}</span> · issued{' '}
                        {fmtDate(t.issuedAt)} by {t.issuedByName}
                      </>
                    }
                    actions={
                      t.status === 'IN_TRANSIT' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            store.receiveTransfer(t.id)
                            toast.push({ tone: 'success', title: 'Transfer received', description: `${t.code} booked into ${warehouseOf(t.toWarehouseId)?.name}.` })
                          }}
                        >
                          Book it in
                        </Button>
                      ) : (
                        <span className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(value, 'IDR', { compact: true })}</span>
                      )
                    }
                  />
                  <CardBody className="pb-2 pt-3">
                    <p className="text-[12.5px] leading-relaxed text-fg-muted">{t.reason}</p>
                  </CardBody>
                  <div className="border-t border-border">
                    <table className="w-full text-[12.5px]">
                      <thead>
                        <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                          <th className="px-5 py-2.5 font-medium">Item</th>
                          <th className="px-5 py-2.5 text-right font-medium">Sent</th>
                          <th className="px-5 py-2.5 text-right font-medium">Received</th>
                          <th className="px-5 py-2.5 text-right font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {t.lines.map((l) => {
                          const item = itemOf(l.itemId)
                          return (
                            <tr key={l.id}>
                              <td className="px-5 py-2.5">
                                <p className="text-fg">{item?.name}</p>
                                <p className="tnum text-[11.5px] text-fg-muted">{item?.sku}</p>
                              </td>
                              <td className="tnum px-5 py-2.5 text-right">{fmtNumber(l.qty, 2)} {uomLabel(l.uom)}</td>
                              <td className="tnum px-5 py-2.5 text-right text-fg-muted">
                                {l.receivedQty ? fmtNumber(l.receivedQty, 2) : <span className="text-warning-soft-fg">not yet</span>}
                              </td>
                              <td className="tnum px-5 py-2.5 text-right">{fmtCurrency(l.qty * (item?.standardCost ?? 0), 'IDR', { compact: true })}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {view === 'counts' && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Counts" value={String(store.counts.length)} sub={`${store.counts.filter((c) => c.status === 'POSTED').length} posted`} icon={<ClipboardCheck />} accent="primary" />
            <KpiCard label="Open" value={String(openCounts.length)} sub={openCounts.length ? 'the ledger is frozen against unconfirmed numbers' : 'nothing half-counted'} accent={openCounts.length ? 'warning' : 'accent'} />
            <KpiCard
              label="Value moved by counts"
              value={fmtCurrency(store.counts.filter((c) => c.status === 'POSTED').reduce((a, c) => a + countVariance(c, itemOf), 0), 'IDR', { compact: true })}
              sub="the number an auditor asks about"
              accent="warning"
            />
            <KpiCard label="Lines counted" value={String(store.counts.reduce((a, c) => a + c.lines.length, 0))} sub="across all counts" accent="accent" />
          </div>

          <div className="space-y-3">
            {store.counts.map((c) => {
              const variance = countVariance(c, itemOf)
              return (
                <Card key={c.id}>
                  <CardHeader
                    icon={<ClipboardCheck />}
                    title={
                      <span className="flex flex-wrap items-center gap-2">
                        {c.code}
                        <StatusBadge value={c.status} size="sm" />
                      </span>
                    }
                    description={
                      <>
                        {warehouseOf(c.warehouseId)?.name} · counted {fmtDate(c.countedAt)} by {c.countedByName}
                        {c.postedAt ? ` · posted ${fmtDate(c.postedAt)}` : ` · ${relativeLabel(c.countedAt)}, still open`}
                      </>
                    }
                    actions={
                      c.status !== 'POSTED' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            store.postCount(c.id)
                            toast.push({ tone: 'success', title: 'Count posted', description: `${c.code} adjusted the ledger by ${fmtCurrency(variance, 'IDR', { compact: true })}.` })
                          }}
                        >
                          Post the adjustments
                        </Button>
                      ) : (
                        <span className={cn('tnum text-[12.5px] font-semibold', variance < 0 ? 'text-danger' : 'text-success')}>
                          {fmtCurrency(variance, 'IDR', { compact: true })}
                        </span>
                      )
                    }
                  />
                  {c.note && (
                    <CardBody className="pb-2 pt-3">
                      <p className="text-[12.5px] leading-relaxed text-fg-muted">{c.note}</p>
                    </CardBody>
                  )}
                  <div className="scrollbar-thin max-h-[260px] overflow-y-auto border-t border-border">
                    <table className="w-full text-[12.5px]">
                      <thead className="sticky top-0 bg-surface">
                        <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                          <th className="px-5 py-2.5 font-medium">Item</th>
                          <th className="px-5 py-2.5 text-right font-medium">System</th>
                          <th className="px-5 py-2.5 text-right font-medium">Counted</th>
                          <th className="px-5 py-2.5 text-right font-medium">Difference</th>
                          <th className="px-5 py-2.5 text-right font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {c.lines.map((l) => {
                          const item = itemOf(l.itemId)
                          const diff = l.countedQty - l.systemQty
                          return (
                            <tr key={l.id} className={cn(Math.abs(diff) > 0.001 && 'bg-warning-soft/20')}>
                              <td className="px-5 py-2.5">
                                <p className="text-fg">{item?.name}</p>
                                <p className="tnum text-[11.5px] text-fg-muted">{item?.sku}</p>
                              </td>
                              <td className="tnum px-5 py-2.5 text-right text-fg-muted">{fmtNumber(l.systemQty, 2)}</td>
                              <td className="tnum px-5 py-2.5 text-right">{fmtNumber(l.countedQty, 2)}</td>
                              <td className={cn('tnum px-5 py-2.5 text-right font-medium', diff < 0 ? 'text-danger' : diff > 0 ? 'text-success' : 'text-fg-subtle')}>
                                {Math.abs(diff) < 0.001 ? '—' : `${diff > 0 ? '+' : ''}${fmtNumber(diff, 2)}`}
                              </td>
                              <td className="tnum px-5 py-2.5 text-right text-fg-muted">
                                {Math.abs(diff) < 0.001 ? '—' : fmtCurrency(diff * (item?.standardCost ?? 0), 'IDR', { compact: true })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
