import * as React from 'react'
import { CalendarClock, Gauge, TriangleAlert, Wrench } from 'lucide-react'
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
import { useCapacityLoad } from '@/hooks/useDerived'
import type { MaintenanceOrder } from '@/data/types'
import {
  centreAvailability, maintenanceCost, maintenanceIsOpen, maintenanceStatusNow, maintenanceSummary,
} from '@/lib/operations'
import { MAINTENANCE_KINDS, MAINTENANCE_STATUSES } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'
import { daysBetween, TODAY } from '@/data/clock'

export function MaintenancePage() {
  const { maintenanceOrders, workCentres, requisitions, startMaintenance, completeMaintenance } = useMfg()
  const loads = useCapacityLoad()
  const toast = useToast()
  const [kind, setKind] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<string[]>([])

  const s = maintenanceSummary(maintenanceOrders)
  const centre = (id: string) => workCentres.find((w) => w.id === id)

  /* the centres whose availability the open work actually eats into */
  const affected = workCentres
    .filter((w) => w.active)
    .map((w) => ({ centre: w, availability: centreAvailability(w, maintenanceOrders), load: loads.find((l) => l.workCentre.id === w.id) }))
    .filter((row) => row.availability.downtimeHours > 0)
    .sort((a, b) => b.availability.downtimeHours - a.availability.downtimeHours)

  const columns: Column<MaintenanceOrder>[] = [
    {
      key: 'code', header: 'Order', width: 'min-w-[260px]', pinned: true, sortable: true, sortValue: (m) => m.code,
      cell: (m) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{m.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{m.assetName}</p>
        </div>
      ),
      exportValue: (m) => m.code,
    },
    {
      key: 'kind', header: 'Kind', width: 'w-[160px]', sortable: true, sortValue: (m) => m.kind,
      cell: (m) => (
        <Tooltip content={MAINTENANCE_KINDS.find((k) => k.value === m.kind)?.hint ?? ''}>
          <span>
            <Badge tone={m.kind === 'BREAKDOWN' ? 'danger' : m.kind === 'PREVENTIVE' ? 'success' : 'info'} size="sm">
              {MAINTENANCE_KINDS.find((k) => k.value === m.kind)?.label}
            </Badge>
          </span>
        </Tooltip>
      ),
      exportValue: (m) => m.kind,
    },
    {
      key: 'status', header: 'Status', width: 'w-[155px]', sortable: true, sortValue: (m) => maintenanceStatusNow(m),
      cell: (m) => (
        <Tooltip content={MAINTENANCE_STATUSES.find((x) => x.value === maintenanceStatusNow(m))?.hint ?? ''}>
          <span><StatusBadge value={maintenanceStatusNow(m)} size="sm" /></span>
        </Tooltip>
      ),
      exportValue: (m) => maintenanceStatusNow(m),
    },
    {
      key: 'centre', header: 'Work centre', width: 'min-w-[190px]',
      cell: (m) => {
        const wc = centre(m.workCentreId)
        const load = loads.find((l) => l.workCentre.id === m.workCentreId)
        return (
          <div className="min-w-0">
            <p className="truncate text-[12.5px] text-fg">{wc?.name}</p>
            {load && (
              <p className="tnum truncate text-[11px] text-fg-muted">
                {fmtPercent(load.utilisation, 0)} loaded{load.utilisation > 100 ? ' — already over' : ''}
              </p>
            )}
          </div>
        )
      },
      exportValue: (m) => centre(m.workCentreId)?.name ?? '',
    },
    {
      key: 'downtime', header: 'Downtime', align: 'right', width: 'w-[135px]', sortable: true,
      headerHint: 'Hours the centre is off the plan. Capacity that ignores this promises a spray booth which is in pieces on Thursday.',
      sortValue: (m) => m.actualDowntimeHours ?? m.plannedDowntimeHours,
      cell: (m) => {
        const hours = m.actualDowntimeHours ?? m.plannedDowntimeHours
        const over = m.actualDowntimeHours !== undefined && m.actualDowntimeHours > m.plannedDowntimeHours
        return (
          <div>
            <p className={`tnum text-[12.5px] font-semibold ${over ? 'text-danger' : 'text-fg'}`}>{fmtNumber(hours)} h</p>
            {over && <p className="tnum text-[11px] text-danger">planned {fmtNumber(m.plannedDowntimeHours)}</p>}
          </div>
        )
      },
      exportValue: (m) => m.actualDowntimeHours ?? m.plannedDowntimeHours,
    },
    {
      key: 'due', header: 'Due', width: 'w-[150px]', sortable: true, sortValue: (m) => m.dueDate,
      cell: (m) => {
        const over = maintenanceIsOpen(m) && m.dueDate < TODAY
        const days = daysBetween(m.dueDate, TODAY)
        return (
          <div>
            <p className={`tnum text-[12.5px] ${over ? 'font-semibold text-danger' : 'text-fg'}`}>{fmtDate(m.dueDate)}</p>
            <p className="tnum text-[11px] text-fg-muted">
              {over ? `${days} day${days === 1 ? '' : 's'} over` : m.intervalDays ? `every ${m.intervalDays} days` : 'one-off'}
            </p>
          </div>
        )
      },
      exportValue: (m) => m.dueDate,
    },
    {
      key: 'cost', header: 'Cost', align: 'right', width: 'w-[130px]', sortable: true, defaultHidden: true,
      sortValue: (m) => maintenanceCost(m),
      cell: (m) => <span className="tnum text-[12.5px]">{fmtCurrency(maintenanceCost(m), 'IDR', { compact: true })}</span>,
      exportValue: (m) => Math.round(maintenanceCost(m)),
    },
    {
      key: 'why', header: 'Symptom & cause', width: 'min-w-[280px]',
      cell: (m) => (
        <div className="min-w-0">
          {m.symptom && <p className="line-clamp-1 text-[12px] text-fg">{m.symptom}</p>}
          {m.rootCause && <p className="line-clamp-2 text-[11px] leading-snug text-fg-muted">{m.rootCause}</p>}
          {!m.symptom && !m.rootCause && m.note && <p className="line-clamp-2 text-[11.5px] leading-snug text-fg-muted">{m.note}</p>}
        </div>
      ),
      exportValue: (m) => `${m.symptom ?? ''} ${m.rootCause ?? ''}`.trim(),
    },
    {
      key: 'do', header: '', align: 'right', width: 'w-[125px]',
      cell: (m) => {
        if (!maintenanceIsOpen(m)) return null
        if (m.status === 'IN_PROGRESS' || m.status === 'WAITING_PARTS') {
          return (
            <Button
              size="xs" variant="primary"
              onClick={(e) => { e.stopPropagation(); completeMaintenance(m.id, m.actualDowntimeHours ?? m.plannedDowntimeHours); toast.push({ title: `${m.code} closed`, description: `${centre(m.workCentreId)?.name} is back in service.`, tone: 'success' }) }}
            >
              Complete
            </Button>
          )
        }
        return (
          <Button
            size="xs" variant="secondary"
            onClick={(e) => { e.stopPropagation(); startMaintenance(m.id); toast.push({ title: `${m.code} started`, description: `${m.plannedDowntimeHours} hours off ${centre(m.workCentreId)?.name}.`, tone: 'info' }) }}
          >
            Start
          </Button>
        )
      },
      exportValue: () => '',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Maintenance"
        description="Hours the plan never gets. A capacity figure that counts every station as running every shift is a promise made on a machine that is in pieces — so downtime is netted off availability here before the schedule sees it."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Down now"
          value={fmtNumber(s.down)}
          icon={<TriangleAlert />} accent={s.down ? 'danger' : 'success'}
          sub={s.waitingParts ? `${fmtNumber(s.waitingParts)} waiting on a spare` : 'nothing stopped'}
        />
        <KpiCard
          label="Overdue"
          value={fmtNumber(s.overdue)}
          icon={<CalendarClock />} accent={s.overdue ? 'warning' : 'success'}
          sub={s.nextDue ? `${s.overdue ? 'worst' : 'next'}: ${s.nextDue.assetName}` : 'nothing past its interval'}
        />
        <KpiCard
          label="Downtime booked"
          value={`${fmtNumber(s.downtimeHours)} h`}
          icon={<Wrench />} accent="primary"
          sub="hours capacity has to give up"
        />
        <KpiCard
          label="Planned share"
          value={fmtPercent(s.preventiveSharePercent, 0)}
          icon={<Gauge />}
          accent={s.preventiveSharePercent >= 70 ? 'success' : 'warning'}
          sub="of the last quarter’s work — the health number"
        />
      </div>

      {s.waitingParts > 0 && (
        <Card>
          <CardBody className="py-3">
            <p className="text-[12.5px] text-fg">
              <span className="font-semibold text-danger">{s.waitingParts}</span> machine{s.waitingParts === 1 ? '' : 's'} stopped waiting on a spare.{' '}
              <span className="text-fg-muted">
                {requisitions.filter((r) => r.origin === 'MAINTENANCE' && (r.status === 'PENDING_APPROVAL' || r.status === 'SUBMITTED')).length > 0
                  ? 'The requisition for the part is itself waiting on a signature — two queues in series, one machine.'
                  : 'The part is on order.'}
              </span>
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <DataTable
          data={maintenanceOrders}
          columns={columns}
          getId={(m) => m.id}
          getLabel={(m) => m.code}
          entityLabel="maintenance order"
          exportName="maintenance"
          storageKey="maintenance"
          searchText={(m) => `${m.code} ${m.assetName} ${m.technician} ${m.symptom ?? ''} ${m.rootCause ?? ''}`}
          initialSort={{ key: 'due', dir: 'asc' }}
          rowTone={(m) => (m.status === 'WAITING_PARTS' || maintenanceStatusNow(m) === 'OVERDUE' ? 'bg-danger-soft/25' : undefined)}
          filters={[
            {
              key: 'kind', label: 'Kind', values: kind, onChange: setKind,
              options: MAINTENANCE_KINDS.map((x) => ({ value: x.value, label: x.label })),
              match: (m, v) => v.includes(m.kind),
            },
            {
              key: 'status', label: 'Status', values: status, onChange: setStatus,
              options: MAINTENANCE_STATUSES.map((x) => ({ value: x.value, label: x.label })),
              match: (m, v) => v.includes(maintenanceStatusNow(m)),
            },
          ]}
        />

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader
              icon={<Gauge />}
              title="Availability, next fortnight"
              description="Scheduled hours less the downtime already booked. This is the number a capacity promise should be made against."
            />
            <CardBody className="space-y-3">
              {affected.length === 0 && <Because>No downtime booked in the window — every centre has its full calendar.</Because>}
              {affected.map(({ centre: wc, availability, load }) => (
                <div key={wc.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-fg">{wc.name}</p>
                      <p className="tnum truncate text-[11px] text-fg-muted">
                        {fmtNumber(availability.availableHours, 0)} of {fmtNumber(availability.scheduledHours, 0)} h · {fmtNumber(availability.downtimeHours)} h down
                      </p>
                    </div>
                    <span className={`tnum shrink-0 text-[12.5px] font-semibold ${availability.availabilityPercent < 85 ? 'text-danger' : 'text-fg-muted'}`}>
                      {fmtPercent(availability.availabilityPercent, 0)}
                    </span>
                  </div>
                  <Progress className="mt-1.5" value={availability.availabilityPercent} tone={availability.availabilityPercent < 85 ? 'danger' : 'success'} size="sm" />
                  {load && load.utilisation > 100 && (
                    <p className="mt-1 text-[11px] text-danger">
                      Already loaded to {fmtPercent(load.utilisation, 0)} before the downtime is taken off. Something on this centre will not happen.
                    </p>
                  )}
                  <Separator className="mt-2.5" />
                </div>
              ))}
              <Because>
                Availability is the first of the three OEE terms. It is also the only one a planning system can act on before the fact.
              </Because>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Wrench />} title="What it costs" description="Parts, labour and the outside contractor, over the last quarter." />
            <CardBody>
              <MetaRow label="Quarter to date">{fmtCurrency(s.costThisQuarter, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Breakdown share">
                {fmtPercent(100 - s.preventiveSharePercent, 0)}
              </MetaRow>
              <Separator className="my-2.5" />
              <Because>
                The two numbers move against each other. Every point of planned work bought back is a point of unplanned work — and unplanned work costs more than the part, because it takes the hours out of a week that was already promised.
              </Because>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
