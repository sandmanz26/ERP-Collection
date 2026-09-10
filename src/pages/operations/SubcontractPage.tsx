import * as React from 'react'
import { Handshake, PackageOpen, Scissors, TriangleAlert } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, MetaRow, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import type { SubcontractOrder } from '@/data/types'
import { subcontractIsOpen, subcontractState, subcontractSummary } from '@/lib/operations'
import { PPH23_RATE, SUBCONTRACT_LOSS_TOLERANCE, SUBCONTRACT_STATUSES } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'

export function SubcontractPage() {
  const { subcontractOrders, suppliers, workOrders, sendSubcontract, receiveSubcontract } = useMfg()
  const toast = useToast()
  const [status, setStatus] = React.useState<string[]>([])
  const [flag, setFlag] = React.useState<string[]>([])

  const s = subcontractSummary(subcontractOrders, suppliers)
  const supplier = (id: string) => suppliers.find((x) => x.id === id)

  const columns: Column<SubcontractOrder>[] = [
    {
      key: 'code', header: 'Order', width: 'min-w-[250px]', pinned: true, sortable: true, sortValue: (o) => o.code,
      cell: (o) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{o.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{supplier(o.supplierId)?.name}</p>
        </div>
      ),
      exportValue: (o) => o.code,
    },
    {
      key: 'status', header: 'Status', width: 'w-[165px]', sortable: true, sortValue: (o) => o.status,
      cell: (o) => (
        <Tooltip content={SUBCONTRACT_STATUSES.find((x) => x.value === o.status)?.hint ?? ''}>
          <span><StatusBadge value={o.status} size="sm" /></span>
        </Tooltip>
      ),
      exportValue: (o) => o.status,
    },
    {
      key: 'service', header: 'Service', width: 'min-w-[260px]',
      cell: (o) => {
        const wo = workOrders.find((w) => w.id === o.workOrderId)
        return (
          <div className="min-w-0">
            <p className="truncate text-[12.5px] text-fg">{o.service}</p>
            <p className="truncate text-[11.5px] text-fg-muted">
              {fmtNumber(o.quantity)} × {fmtCurrency(o.unitRate, 'IDR', { compact: true })}
              {wo && ` · ${wo.code} op ${o.operationNo}`}
            </p>
          </div>
        )
      },
      exportValue: (o) => o.service,
    },
    {
      key: 'out', header: 'Value out there', align: 'right', width: 'w-[155px]', sortable: true,
      headerHint: 'Our stock, on somebody else’s floor. It is still our inventory, still our risk, and it is not in any stock report the warehouse runs.',
      sortValue: (o) => subcontractState(o).valueAtSubcontractor,
      cell: (o) => {
        const st = subcontractState(o)
        if (!st.valueAtSubcontractor) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <div>
            <p className="tnum text-[12.5px] font-semibold text-warning">{fmtCurrency(st.valueAtSubcontractor, 'IDR', { compact: true })}</p>
            <p className="tnum text-[11px] text-fg-muted">{fmtNumber(st.sent - st.returned - st.loss)} of {fmtNumber(st.sent)} still out</p>
          </div>
        )
      },
      exportValue: (o) => Math.round(subcontractState(o).valueAtSubcontractor),
    },
    {
      key: 'progress', header: 'Back so far', width: 'min-w-[200px]',
      cell: (o) => {
        const st = subcontractState(o)
        const pct = st.sent > 0 ? ((st.returned + st.loss) / st.sent) * 100 : 0
        return (
          <div>
            <div className="flex items-center gap-2">
              <Progress value={pct} tone={st.overdue ? 'danger' : pct === 100 ? 'success' : 'primary'} className="flex-1" size="sm" />
              <span className="tnum shrink-0 text-[11px] text-fg-muted">{fmtNumber(st.returned)}/{fmtNumber(st.sent)}</span>
            </div>
            <p className={`mt-1 truncate text-[11px] ${st.overdue ? 'font-medium text-danger' : 'text-fg-muted'}`}>{st.note}</p>
          </div>
        )
      },
      exportValue: (o) => `${subcontractState(o).returned}/${subcontractState(o).sent}`,
    },
    {
      key: 'loss', header: 'Loss', align: 'right', width: 'w-[125px]', sortable: true,
      headerHint: `Anything beyond ${Math.round(SUBCONTRACT_LOSS_TOLERANCE * 100)}% is a conversation, not a rounding difference.`,
      sortValue: (o) => subcontractState(o).lossPercent,
      cell: (o) => {
        const st = subcontractState(o)
        if (!st.loss) return <span className="text-[12px] text-success">none</span>
        return (
          <div>
            <p className={`tnum text-[12.5px] font-semibold ${st.lossBeyondTolerance ? 'text-danger' : 'text-fg'}`}>{fmtPercent(st.lossPercent, 1)}</p>
            <p className="tnum text-[11px] text-fg-muted">{fmtNumber(st.loss, 1)} units</p>
          </div>
        )
      },
      exportValue: (o) => subcontractState(o).lossPercent,
    },
    {
      key: 'due', header: 'Due back', width: 'w-[145px]', sortable: true, sortValue: (o) => o.dueBack,
      cell: (o) => {
        const st = subcontractState(o)
        return (
          <div>
            <p className={`tnum text-[12.5px] ${st.overdue ? 'font-semibold text-danger' : 'text-fg'}`}>{fmtDate(o.dueBack)}</p>
            <p className="tnum text-[11px] text-fg-muted">{o.returnedAt ? `back ${fmtDate(o.returnedAt, 'short')}` : o.sentAt ? `sent ${fmtDate(o.sentAt, 'short')}` : 'not sent'}</p>
          </div>
        )
      },
      exportValue: (o) => o.dueBack,
    },
    {
      key: 'money', header: 'Service & PPh 23', align: 'right', width: 'w-[165px]', defaultHidden: true,
      cell: (o) => {
        const st = subcontractState(o)
        return (
          <div>
            <p className="tnum text-[12.5px]">{fmtCurrency(st.serviceValue, 'IDR', { compact: true })}</p>
            <p className="tnum text-[11px] text-fg-muted">less {fmtCurrency(st.withheld, 'IDR', { compact: true })} withheld</p>
          </div>
        )
      },
      exportValue: (o) => Math.round(subcontractState(o).serviceValue),
    },
    {
      key: 'do', header: '', align: 'right', width: 'w-[125px]',
      cell: (o) => {
        if (!subcontractIsOpen(o.status)) return null
        if (o.status === 'ISSUED') {
          return (
            <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); sendSubcontract(o.id); toast.push({ title: `${o.code} sent`, description: 'The material left the gate — it is still our stock.', tone: 'info' }) }}>
              Send out
            </Button>
          )
        }
        const st = subcontractState(o)
        if (st.sent > st.returned + st.loss) {
          return (
            <Button
              size="xs" variant="primary"
              onClick={(e) => {
                e.stopPropagation()
                const returned: Record<string, number> = {}
                o.materials.forEach((m) => { returned[m.id] = Math.max(0, m.sentQuantity - m.returnedQuantity - m.lossQuantity) })
                receiveSubcontract(o.id, returned, {})
                toast.push({ title: `${o.code} received`, description: 'Booked back in full, pending incoming inspection.', tone: 'success' })
              }}
            >
              Receive
            </Button>
          )
        }
        return null
      },
      exportValue: () => '',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Subcontracting"
        description="Work that leaves the building — carving, glass and cut-and-sew. The material is still ours the whole time it is out, which is why it shows here and not in a stock report the warehouse can run."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Value at subcontractors"
          value={fmtCurrency(s.valueOut, 'IDR', { compact: true })}
          icon={<PackageOpen />} accent="warning"
          sub={`${fmtNumber(s.open)} open order${s.open === 1 ? '' : 's'}`}
        />
        <KpiCard
          label="Overdue back"
          value={fmtNumber(s.overdue)}
          icon={<TriangleAlert />} accent={s.overdue ? 'danger' : 'success'}
          sub={s.worstSupplier ? `${s.worstSupplier.supplier.name} has ${s.worstSupplier.lateOrders}` : 'everything is on time'}
        />
        <KpiCard
          label="Average turn"
          value={s.averageTurnDays ? `${fmtNumber(s.averageTurnDays, 0)} d` : '—'}
          icon={<Handshake />} accent="primary"
          sub="gate to gate, on the orders that came back"
        />
        <KpiCard
          label="Lost at subcontractors"
          value={fmtCurrency(s.lossValue, 'IDR', { compact: true })}
          icon={<Scissors />} accent={s.lossValue ? 'danger' : 'success'}
          sub={`PPh 23 withheld this year ${fmtCurrency(s.withheldThisYear, 'IDR', { compact: true })}`}
        />
      </div>

      {s.overdue > 0 && (
        <Card>
          <CardBody className="py-3">
            <p className="text-[12.5px] text-fg">
              <span className="font-semibold text-danger">{s.overdue}</span> subcontract order{s.overdue === 1 ? '' : 's'} past the date the work was due back.{' '}
              <span className="text-fg-muted">
                A routing operation cannot start behind it, and the work order behind that is what a customer date sits on. Late here is late three steps downstream.
              </span>
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <DataTable
          data={subcontractOrders}
          columns={columns}
          getId={(o) => o.id}
          getLabel={(o) => o.code}
          entityLabel="subcontract order"
          exportName="subcontract"
          storageKey="subcontract"
          searchText={(o) => `${o.code} ${supplier(o.supplierId)?.name ?? ''} ${o.service} ${o.deliveryNoteNo ?? ''}`}
          initialSort={{ key: 'due', dir: 'asc' }}
          rowTone={(o) => (subcontractState(o).overdue ? 'bg-danger-soft/25' : subcontractState(o).lossBeyondTolerance ? 'bg-warning-soft/20' : undefined)}
          filters={[
            {
              key: 'status', label: 'Status', values: status, onChange: setStatus,
              options: SUBCONTRACT_STATUSES.map((x) => ({ value: x.value, label: x.label })),
              match: (o, v) => v.includes(o.status),
            },
            {
              key: 'flag', label: 'Show', values: flag, onChange: setFlag,
              options: [
                { value: 'OPEN', label: 'Open only' },
                { value: 'OVERDUE', label: 'Overdue back' },
                { value: 'LOSS', label: 'Loss beyond tolerance' },
              ],
              match: (o, v) =>
                (!v.includes('OPEN') || subcontractIsOpen(o.status))
                && (!v.includes('OVERDUE') || subcontractState(o).overdue)
                && (!v.includes('LOSS') || subcontractState(o).lossBeyondTolerance),
            },
          ]}
        />

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader icon={<PackageOpen />} title="What is out there" description="Line by line, with what has come back and what has not." />
            <CardBody className="space-y-3">
              {subcontractOrders.filter((o) => subcontractIsOpen(o.status)).length === 0 && (
                <Because>Nothing is out at a subcontractor.</Because>
              )}
              {subcontractOrders.filter((o) => subcontractIsOpen(o.status)).map((o) => {
                const st = subcontractState(o)
                return (
                  <div key={o.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[11.5px] font-semibold text-fg">{o.code}</p>
                        <p className="truncate text-[11.5px] text-fg-muted">{supplier(o.supplierId)?.name}</p>
                      </div>
                      {st.overdue && <Badge tone="danger" size="sm">{st.daysLate}d late</Badge>}
                    </div>
                    {st.sent === 0 && (
                      <p className="mt-1 text-[11.5px] leading-snug text-fg-muted">
                        Issued, but nothing has left the gate yet — so nothing of ours is at risk on their floor.
                      </p>
                    )}
                    {o.materials
                      .map((m) => ({ m, out: Math.max(0, m.sentQuantity - m.returnedQuantity - m.lossQuantity) }))
                      .filter((x) => x.out > 0)
                      .map(({ m, out }) => (
                        <p key={m.id} className="mt-1 text-[11.5px] leading-snug text-fg-muted">
                          {fmtNumber(out)} {m.uom} of {m.description.toLowerCase()} still out
                          {', worth '}{fmtCurrency(out * m.unitValue, 'IDR', { compact: true })}
                        </p>
                      ))}
                    <Separator className="mt-2.5" />
                  </div>
                )
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Scissors />} title="The tax on services" description="PPh 23 is kept back at source on every domestic service invoice." />
            <CardBody>
              <MetaRow label="Rate">{fmtPercent(PPH23_RATE * 100, 0)}</MetaRow>
              <MetaRow label="Withheld this year">{fmtCurrency(s.withheldThisYear, 'IDR', { compact: true })}</MetaRow>
              <Separator className="my-2.5" />
              <Because>
                It is not a discount. The subcontractor reclaims it against their own income tax, and we are liable for it whether or not we remembered to keep it back — which is exactly the mistake that turns a Rp 385.000 carving rate into a Rp 392.700 one at the audit.
              </Because>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
