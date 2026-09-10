import * as React from 'react'
import { Boxes, Container, FileCheck2, Truck } from 'lucide-react'
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
import type { Delivery } from '@/data/types'
import { deliveryDocGate, deliveryIsOpen, loadPlan } from '@/lib/commerce'
import {
  CONTAINER_FILL_FLOOR, CONTAINER_SPECS, DELIVERY_DOC_TYPES, DELIVERY_MODES, DELIVERY_STATUSES,
} from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'

const NEXT: Partial<Record<Delivery['status'], Delivery['status']>> = {
  PLANNED: 'PICKING', PICKING: 'PACKED', PACKED: 'LOADED', LOADED: 'IN_TRANSIT', IN_TRANSIT: 'DELIVERED',
}

export function DeliveriesPage() {
  const { deliveries, customers, products, advanceDelivery } = useMfg()
  const toast = useToast()
  const [mode, setMode] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<string[]>([])
  const [selectedId, setSelectedId] = React.useState<string>(deliveries.find((d) => deliveryIsOpen(d.status))?.id ?? deliveries[0]?.id ?? '')

  const selected = deliveries.find((d) => d.id === selectedId) ?? deliveries[0]
  const customer = (id: string) => customers.find((c) => c.id === id)

  const open = deliveries.filter((d) => deliveryIsOpen(d.status))
  const containerised = open.filter((d) => d.containerType !== 'NONE')
  const underloaded = containerised.filter((d) => loadPlan(d).underloaded)
  const docsBlocked = open.filter((d) => !deliveryDocGate(d).ok && ['PACKED', 'LOADED'].includes(d.status))
  const cbmOut = open.reduce((a, d) => a + loadPlan(d).cbm, 0)

  const columns: Column<Delivery>[] = [
    {
      key: 'code', header: 'Delivery', width: 'min-w-[230px]', pinned: true, sortable: true, sortValue: (d) => d.code,
      cell: (d) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{d.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{d.suratJalanNo} · {customer(d.customerId)?.name}</p>
        </div>
      ),
      exportValue: (d) => d.code,
    },
    {
      key: 'status', header: 'Status', width: 'w-[165px]', sortable: true, sortValue: (d) => d.status,
      cell: (d) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge value={d.status} size="sm" />
          {d.mode.startsWith('EXPORT') && <Badge tone="info" size="sm">export</Badge>}
        </div>
      ),
      exportValue: (d) => d.status,
    },
    {
      key: 'destination', header: 'Destination', width: 'min-w-[190px]',
      cell: (d) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg">{d.destination}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{DELIVERY_MODES.find((m) => m.value === d.mode)?.label} · {d.carrier}</p>
        </div>
      ),
      exportValue: (d) => d.destination,
    },
    {
      key: 'fill', header: 'Container fill', width: 'min-w-[210px]', sortable: true,
      headerHint: `A container below ${Math.round(CONTAINER_FILL_FLOOR * 100)}% of its cube is paying full freight for empty space.`,
      sortValue: (d) => loadPlan(d).fillPercent,
      cell: (d) => {
        const lp = loadPlan(d)
        if (d.containerType === 'NONE') return <span className="text-[12px] text-fg-subtle">not containerised</span>
        if (!d.units.length) return <span className="text-[12px] text-fg-subtle">nothing packed yet</span>
        return (
          <Tooltip content={lp.note}>
            <div>
              <div className="flex items-center gap-2">
                <Progress value={Math.min(100, lp.fillPercent)} tone={lp.underloaded ? 'warning' : 'success'} className="flex-1" size="sm" />
                <span className={`tnum shrink-0 text-[11.5px] font-semibold ${lp.underloaded ? 'text-warning' : 'text-fg-muted'}`}>{fmtPercent(lp.fillPercent, 0)}</span>
              </div>
              <p className="tnum mt-1 text-[11px] text-fg-muted">
                {fmtNumber(lp.cbm, 1)} / {fmtNumber(lp.capacityCbm, 1)} m³ · {CONTAINER_SPECS[d.containerType].label}
              </p>
            </div>
          </Tooltip>
        )
      },
      exportValue: (d) => loadPlan(d).fillPercent,
    },
    {
      key: 'docs', header: 'Documents', width: 'min-w-[220px]',
      cell: (d) => {
        const gate = deliveryDocGate(d)
        if (gate.ok) return <span className="text-[12px] text-success">All {gate.required} verified</span>
        return (
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-danger">{gate.done} of {gate.required}</p>
            <p className="line-clamp-2 text-[11px] leading-snug text-fg-muted">{gate.missing.join(', ')} outstanding</p>
          </div>
        )
      },
      exportValue: (d) => deliveryDocGate(d).missing.join(' | '),
    },
    {
      key: 'date', header: 'Dates', width: 'w-[160px]', sortable: true, sortValue: (d) => d.plannedDate,
      cell: (d) => (
        <div>
          <p className="tnum text-[12.5px] text-fg">plan {fmtDate(d.plannedDate)}</p>
          <p className="tnum text-[11px] text-fg-muted">
            {d.deliveredAt ? `signed ${fmtDate(d.deliveredAt, 'short')}` : d.dispatchedAt ? `left ${fmtDate(d.dispatchedAt, 'short')}` : 'not dispatched'}
          </p>
        </div>
      ),
      exportValue: (d) => d.plannedDate,
    },
    {
      key: 'short', header: 'Short', align: 'right', width: 'w-[110px]',
      cell: (d) => {
        const short = d.lines.reduce((a, l) => a + l.shortQuantity, 0)
        return short > 0
          ? <span className="tnum text-[12.5px] font-semibold text-warning">{fmtNumber(short)}</span>
          : <span className="text-[12px] text-fg-subtle">—</span>
      },
      exportValue: (d) => d.lines.reduce((a, l) => a + l.shortQuantity, 0),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Deliveries & packing"
        description="The container going the other way. A surat jalan is the only document that moves a sales order line, and an export container that sails on an unsubmitted PEB does not get a gate pass at the port."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open deliveries" value={fmtNumber(open.length)} icon={<Truck />} accent="primary" sub={`${fmtNumber(cbmOut, 1)} m³ waiting to leave`} />
        <KpiCard
          label="Containers under-filled"
          value={fmtNumber(underloaded.length)}
          icon={<Container />}
          accent={underloaded.length ? 'warning' : 'success'}
          sub={underloaded.length ? `${fmtNumber(underloaded.reduce((a, d) => a + (loadPlan(d).capacityCbm - loadPlan(d).cbm), 0), 1)} m³ of paid space sailing empty` : 'every box is loading properly'}
        />
        <KpiCard
          label="Held on documents"
          value={fmtNumber(docsBlocked.length)}
          icon={<FileCheck2 />}
          accent={docsBlocked.length ? 'danger' : 'success'}
          sub={docsBlocked.length ? docsBlocked[0].code : 'nothing waiting on paper'}
        />
        <KpiCard
          label="Delivered, last 90 days"
          value={fmtNumber(deliveries.filter((d) => d.status === 'DELIVERED' || d.status === 'PARTIALLY_ACCEPTED').length)}
          icon={<Boxes />} accent="accent"
          sub={`${fmtNumber(deliveries.filter((d) => d.status === 'PARTIALLY_ACCEPTED').length)} signed with something noted`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <DataTable
          data={deliveries}
          columns={columns}
          getId={(d) => d.id}
          getLabel={(d) => d.code}
          entityLabel="delivery"
          exportName="deliveries"
          storageKey="deliveries"
          searchText={(d) => `${d.code} ${d.suratJalanNo} ${customer(d.customerId)?.name ?? ''} ${d.destination} ${d.containerNo ?? ''} ${d.carrier}`}
          onRowClick={(d) => setSelectedId(d.id)}
          initialSort={{ key: 'date', dir: 'asc' }}
          rowTone={(d) => (loadPlan(d).underloaded ? 'bg-warning-soft/20' : undefined)}
          filters={[
            {
              key: 'status', label: 'Status', values: status, onChange: setStatus,
              options: DELIVERY_STATUSES.map((x) => ({ value: x.value, label: x.label })),
              match: (d, v) => v.includes(d.status),
            },
            {
              key: 'mode', label: 'Mode', values: mode, onChange: setMode,
              options: DELIVERY_MODES.map((x) => ({ value: x.value, label: x.label })),
              match: (d, v) => v.includes(d.mode),
            },
          ]}
        />

        <div className="flex flex-col gap-5">
          {!selected && <Card><CardBody><EmptyState title="Nothing to show" /></CardBody></Card>}
          {selected && (
            <>
              <Card>
                <CardHeader
                  icon={<Container />}
                  title={selected.code}
                  description={`${DELIVERY_MODES.find((m) => m.value === selected.mode)?.label} to ${selected.destination}`}
                  actions={<StatusBadge value={selected.status} size="sm" />}
                />
                <CardBody>
                  <MetaRow label="Surat jalan">{selected.suratJalanNo}</MetaRow>
                  <MetaRow label="Carrier">{selected.carrier}</MetaRow>
                  {selected.vehicleOrVessel && <MetaRow label="Vehicle / vessel">{selected.vehicleOrVessel}</MetaRow>}
                  {selected.containerNo && <MetaRow label="Container">{selected.containerNo}</MetaRow>}
                  {selected.sealNo && <MetaRow label="Seal">{selected.sealNo}</MetaRow>}
                  {selected.receivedBy && <MetaRow label="Signed by">{selected.receivedBy}</MetaRow>}
                  {selected.freightCost > 0 && <MetaRow label="Freight">{fmtCurrency(selected.freightCost)}</MetaRow>}
                  {selected.note && (
                    <>
                      <Separator className="my-2.5" />
                      <Because>{selected.note}</Because>
                    </>
                  )}
                  {NEXT[selected.status] && (
                    <>
                      <Separator className="my-3" />
                      <Button
                        size="sm" variant="primary" className="w-full"
                        onClick={() => {
                          const to = NEXT[selected.status]!
                          const gate = deliveryDocGate(selected)
                          advanceDelivery(selected.id, to)
                          if ((to === 'LOADED' || to === 'IN_TRANSIT') && !gate.ok) {
                            toast.push({ title: `${selected.code} is held`, description: `${gate.missing.join(', ')} still outstanding. The port will not issue a gate pass without them.`, tone: 'error' })
                          } else {
                            toast.push({ title: `${selected.code} → ${to.replace(/_/g, ' ').toLowerCase()}`, tone: 'success' })
                          }
                        }}
                      >
                        Advance to {NEXT[selected.status]!.replace(/_/g, ' ').toLowerCase()}
                      </Button>
                    </>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader icon={<Boxes />} title="Load plan" description="Marks, cartons, weight and cube — the packing list, in the form the freight is actually priced on." />
                <CardBody className="space-y-3">
                  {(() => {
                    const lp = loadPlan(selected)
                    return (
                      <>
                        {selected.containerType !== 'NONE' && (
                          <div>
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-[12px] text-fg-muted">Cube used</span>
                              <span className={`tnum text-[12.5px] font-semibold ${lp.underloaded ? 'text-warning' : 'text-success'}`}>{fmtPercent(lp.fillPercent, 0)}</span>
                            </div>
                            <Progress className="mt-1.5" value={Math.min(100, lp.fillPercent)} tone={lp.underloaded ? 'warning' : 'success'} size="sm" />
                            <div className="mt-1.5 flex items-baseline justify-between gap-3">
                              <span className="text-[12px] text-fg-muted">Payload used</span>
                              <span className="tnum text-[12px] text-fg-muted">{fmtPercent(lp.weightPercent, 0)}</span>
                            </div>
                            <Progress className="mt-1.5" value={Math.min(100, lp.weightPercent)} tone={lp.weightPercent > 90 ? 'danger' : 'primary'} size="sm" />
                          </div>
                        )}
                        <Because>{lp.note}</Because>
                        <Separator />
                        <div className="space-y-2">
                          {selected.units.length === 0 && <Because>Nothing packed yet.</Because>}
                          {selected.units.map((u) => (
                            <div key={u.id} className="rounded-lg border border-border bg-surface-sunken px-3 py-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate font-mono text-[11.5px] font-semibold text-fg">{u.mark}</p>
                                  <p className="truncate text-[11.5px] text-fg-muted">{products.find((p) => p.id === u.productId)?.name}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="tnum text-[12px] font-semibold text-fg">{fmtNumber(u.quantity)} pcs</p>
                                  <p className="tnum text-[11px] text-fg-muted">{u.cartons} ctn · {fmtNumber(u.cbm, 2)} m³ · {fmtNumber(u.grossWeightKg)} kg</p>
                                </div>
                              </div>
                              {u.note && <Because className="mt-1 text-[11px]">{u.note}</Because>}
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  })()}
                </CardBody>
              </Card>

              <Card>
                <CardHeader icon={<FileCheck2 />} title="Documents" description="What the container cannot leave without. Export-only papers are hidden on a domestic run." />
                <CardBody className="space-y-1.5">
                  {selected.documents
                    .filter((doc) => {
                      const meta = DELIVERY_DOC_TYPES.find((t) => t.value === doc.type)
                      return !meta?.exportOnly || selected.mode.startsWith('EXPORT')
                    })
                    .map((doc) => {
                      const meta = DELIVERY_DOC_TYPES.find((t) => t.value === doc.type)
                      return (
                        <div key={doc.id} className="flex items-start justify-between gap-3 py-1">
                          <Tooltip content={meta?.hint ?? ''}>
                            <div className="min-w-0">
                              <p className="truncate text-[12.5px] text-fg">{meta?.label ?? doc.type}</p>
                              {doc.reference && <p className="truncate font-mono text-[11px] text-fg-muted">{doc.reference}</p>}
                            </div>
                          </Tooltip>
                          <StatusBadge value={doc.status} size="sm" />
                        </div>
                      )
                    })}
                </CardBody>
              </Card>

              <Card>
                <CardHeader icon={<Truck />} title="Against the order" description="What each line owes, and what this load takes off it." />
                <CardBody className="space-y-2">
                  {selected.lines.map((l) => (
                    <div key={l.id} className="rounded-lg border border-border px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 truncate text-[12.5px] font-medium text-fg">{l.description}</p>
                        <p className="tnum shrink-0 text-[12.5px] font-semibold text-fg">{fmtNumber(l.quantity)} / {fmtNumber(l.orderedQuantity)}</p>
                      </div>
                      {l.shortQuantity > 0 && (
                        <p className="mt-1 text-[11.5px] leading-snug text-warning">
                          {fmtNumber(l.shortQuantity)} short. {l.shortReason}
                        </p>
                      )}
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
