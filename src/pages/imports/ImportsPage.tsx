import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Ship, TriangleAlert, Wallet } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { useMfg } from '@/store/useMfg'
import type { ImportShipment } from '@/data/types'
import {
  availableDate, customsValueIdr, documentCompleteness, freeTimeState, landedCostTotal, preferenceAtRisk,
} from '@/lib/importing'
import { demurrageExposure } from '@/lib/analytics'
import { portLabel, SHIPMENT_STATES, shipmentIsOpen, shipmentStateIndex } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, relativeLabel } from '@/lib/format'

export function ImportsPage() {
  const s = useMfg()
  const navigate = useNavigate()
  const [status, setStatus] = React.useState<string[]>([])
  const [lane, setLane] = React.useState<string[]>([])

  const open = s.shipments.filter((x) => shipmentIsOpen(x.status))
  const dem = demurrageExposure(s.shipments)
  /* only a clock that is still running is accruing — a received container's demurrage was paid long ago */
  const accruing = s.shipments.filter((x) => {
    const ft = freeTimeState(x)
    return ft.running && ft.chargeableDays > 0
  })
  /* and the ones about to start one */
  const ending = s.shipments.filter((x) => {
    const ft = freeTimeState(x)
    return ft.running && ft.chargeableDays === 0 && (ft.daysRemaining ?? 99) <= 2
  })
  const inTransitValue = open.reduce((a, x) => a + landedCostTotal(x), 0)

  const columns: Column<ImportShipment>[] = [
    {
      key: 'code', header: 'Shipment', width: 'min-w-[210px]', pinned: true, sortable: true, sortValue: (x) => x.code,
      cell: (x) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{x.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{s.suppliers.find((sp) => sp.id === x.supplierId)?.name}</p>
        </div>
      ),
      exportValue: (x) => x.code,
    },
    {
      key: 'state', header: 'State', width: 'min-w-[230px]', sortable: true, sortValue: (x) => shipmentStateIndex(x.status),
      tour: 'imports-state',
      cell: (x) => {
        const idx = shipmentStateIndex(x.status)
        const total = SHIPMENT_STATES.length - 2
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <StatusBadge value={x.status} size="sm" />
              {x.lane !== 'PENDING' && <StatusBadge value={x.lane} size="sm" />}
            </div>
            <Progress className="mt-1.5" value={(Math.min(idx, total) / total) * 100} tone={x.status === 'PERMIT_PENDING' ? 'danger' : 'primary'} size="sm" />
          </div>
        )
      },
      exportValue: (x) => x.status,
    },
    {
      key: 'route', header: 'Route', width: 'w-[220px]', defaultHidden: true,
      cell: (x) => (
        <div className="min-w-0">
          <p className="truncate text-[12px] text-fg">{portLabel(x.portOfLoading)}</p>
          <p className="truncate text-[11px] text-fg-muted">→ {portLabel(x.portOfDischarge)}</p>
        </div>
      ),
      exportValue: (x) => `${x.portOfLoading} > ${x.portOfDischarge}`,
    },
    {
      key: 'vessel', header: 'Vessel', width: 'w-[190px]',
      cell: (x) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg">{x.vessel ?? 'not booked'}</p>
          <p className="truncate font-mono text-[11px] text-fg-muted">{x.containerNo ?? x.voyage ?? '—'}</p>
        </div>
      ),
      exportValue: (x) => x.vessel ?? '',
    },
    {
      key: 'eta', header: 'ETA', width: 'w-[130px]', sortable: true, sortValue: (x) => x.eta ?? '9999',
      cell: (x) =>
        x.eta ? (
          <div>
            <p className="tnum text-[12.5px]">{fmtDate(x.eta)}</p>
            <p className="tnum text-[11px] text-fg-muted">{relativeLabel(x.eta)}</p>
          </div>
        ) : (
          <span className="text-[12px] text-fg-subtle">—</span>
        ),
      exportValue: (x) => x.eta ?? '',
    },
    {
      key: 'issuable', header: 'Issuable from', width: 'w-[210px]',
      headerHint: 'Never the ETA — arrival plus the lane plus the trucking plus incoming inspection',
      cell: (x) => {
        const est = availableDate(x, s.suppliers.find((sp) => sp.id === x.supplierId), s.items)
        return (
          <Tooltip content={est.explanation}>
            <div>
              <p className={`tnum text-[12.5px] font-semibold ${est.confident ? 'text-fg' : 'text-warning'}`}>{fmtDate(est.date)}</p>
              <p className="truncate text-[11px] text-fg-muted">{est.stage.replace(/_/g, ' ').toLowerCase()}</p>
            </div>
          </Tooltip>
        )
      },
      exportValue: (x) => availableDate(x, s.suppliers.find((sp) => sp.id === x.supplierId), s.items).date,
    },
    {
      key: 'freetime', header: 'Free time', width: 'w-[190px]', tour: 'imports-freetime',
      headerHint: 'Runs from discharge, not from arrival notice and not from the PIB',
      sortable: true, sortValue: (x) => -(freeTimeState(x).chargeableDays),
      cell: (x) => {
        const ft = freeTimeState(x)
        if (!ft.running) {
          return ft.accrued > 0
            ? <span className="tnum text-[12px] text-danger">{fmtCurrency(ft.accrued, 'IDR', { compact: true })} paid</span>
            : <span className="text-[12px] text-fg-subtle">—</span>
        }
        if (ft.chargeableDays > 0) {
          return (
            <div>
              <p className="tnum text-[12.5px] font-semibold text-danger">{ft.chargeableDays} day{ft.chargeableDays === 1 ? '' : 's'} over</p>
              <p className="tnum text-[11px] text-danger">{fmtCurrency(ft.accrued, 'IDR', { compact: true })} accrued</p>
            </div>
          )
        }
        return (
          <div>
            <p className={`tnum text-[12.5px] font-semibold ${(ft.daysRemaining ?? 9) <= 2 ? 'text-warning' : 'text-fg'}`}>
              {ft.daysRemaining} day{ft.daysRemaining === 1 ? '' : 's'} left
            </p>
            <p className="tnum text-[11px] text-fg-muted">lapses {fmtDate(ft.expiresOn)}</p>
          </div>
        )
      },
      exportValue: (x) => freeTimeState(x).chargeableDays,
    },
    {
      key: 'docs', header: 'Documents', width: 'w-[150px]',
      cell: (x) => {
        const c = documentCompleteness(x)
        return (
          <div>
            <div className="flex items-center gap-2">
              <Progress value={c.percent} tone={c.percent === 100 ? 'success' : c.percent > 70 ? 'warning' : 'danger'} className="flex-1" size="sm" />
              <span className="tnum shrink-0 text-[11px] text-fg-muted">{c.done}/{c.total}</span>
            </div>
          </div>
        )
      },
      exportValue: (x) => documentCompleteness(x).percent,
    },
    {
      key: 'preference', header: 'Preference at risk', align: 'right', width: 'w-[160px]',
      headerHint: 'Duty at the MFN rate against the rate the certificate of origin would buy',
      cell: (x) => {
        const p = preferenceAtRisk(x, s.items)
        if (!p) return <span className="text-[12px] text-fg-subtle">—</span>
        if (p.cooOnFile) return <span className="text-[12px] text-success">{p.scheme} honoured</span>
        return (
          <Tooltip content={`Without the certificate the duty is ${fmtCurrency(p.mfnDuty, 'IDR')} instead of ${fmtCurrency(p.preferentialDuty, 'IDR')}.`}>
            <span className="tnum text-[12.5px] font-semibold text-danger">{fmtCurrency(p.atRisk, 'IDR', { compact: true })}</span>
          </Tooltip>
        )
      },
      exportValue: (x) => preferenceAtRisk(x, s.items)?.atRisk ?? 0,
    },
    {
      key: 'value', header: 'Customs value', align: 'right', width: 'w-[150px]', sortable: true, sortValue: (x) => customsValueIdr(x),
      cell: (x) => <span className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(customsValueIdr(x), 'IDR', { compact: true })}</span>,
      exportValue: (x) => Math.round(customsValueIdr(x)),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><Ship className="size-3" /> Import</Badge>}
        title="Import shipments"
        description="Eleven states, and none of them skippable. The column that matters is not the ETA — it is the day the goods become legally issuable, which is arrival plus the lane plus the trucking, and which no stock report knows."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="In the pipeline" value={fmtNumber(open.length)} icon={<Ship />} accent="primary" sub={`${s.shipments.length} on record`} />
        <KpiCard label="Value in transit" value={fmtCurrency(inTransitValue, 'IDR', { compact: true })} icon={<Wallet />} accent="accent" sub="at landed cost, taxes excluded" />
        <KpiCard
          label="Demurrage accruing"
          value={fmtCurrency(dem.accruing, 'IDR', { compact: true })}
          icon={<TriangleAlert />}
          accent={dem.accruing ? 'danger' : ending.length ? 'warning' : 'success'}
          sub={accruing.length ? `${accruing.length} container${accruing.length === 1 ? '' : 's'} past free time` : ending.length ? `${ending.length} within two days of the deadline` : 'nothing over free time'}
        />
        <KpiCard label="Demurrage paid, to date" value={fmtCurrency(dem.paid, 'IDR', { compact: true })} icon={<Wallet />} accent="warning" sub="pure loss, and always someone’s decision" />
      </div>

      {/* ---------------- the pipeline, as a board ---------------- */}
      <Card>
        <CardHeader
          icon={<Ship />}
          title="The pipeline"
          description="Every live consignment against the state machine. A gate has to be satisfied before anything moves right."
        />
        <CardBody className="scrollbar-thin overflow-x-auto p-3">
          <div className="flex min-w-[900px] gap-2">
            {SHIPMENT_STATES.filter((st) => st.value !== 'CANCELLED' && st.value !== 'RECEIVED').map((st) => {
              const rows = open.filter((x) => x.status === st.value)
              return (
                <div key={st.value} className="min-w-[130px] flex-1">
                  <Tooltip content={st.gate}>
                    <p className="mb-2 truncate text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-subtle">{st.short}</p>
                  </Tooltip>
                  <div className="space-y-1.5">
                    {rows.map((x) => {
                      const ft = freeTimeState(x)
                      return (
                        <button
                          key={x.id}
                          onClick={() => navigate(`/imports/${x.id}`)}
                          className={`w-full rounded-lg border p-2 text-left transition-colors hover:border-border-strong ${
                            ft.chargeableDays > 0 ? 'border-danger/50 bg-danger-soft/30' : 'border-border bg-surface'
                          }`}
                        >
                          <p className="truncate font-mono text-[11px] font-semibold text-fg">{x.code}</p>
                          <p className="truncate text-[10.5px] text-fg-muted">
                            {s.suppliers.find((sp) => sp.id === x.supplierId)?.name.split(' ')[0]}
                          </p>
                          {x.lane !== 'PENDING' && (
                            <span className={`mt-1 inline-block rounded px-1 text-[9.5px] font-semibold uppercase ${
                              x.lane === 'RED' ? 'bg-danger text-white' : x.lane === 'YELLOW' ? 'bg-warning text-white' : 'bg-success text-white'
                            }`}>
                              {x.lane}
                            </span>
                          )}
                        </button>
                      )
                    })}
                    {rows.length === 0 && <div className="rounded-lg border border-dashed border-border py-3" />}
                  </div>
                </div>
              )
            })}
          </div>
        </CardBody>
        <CardBody className="border-t border-border py-3">
          <Because>
            {accruing.length
              ? `${accruing[0].code} is ${freeTimeState(accruing[0]).chargeableDays} day${freeTimeState(accruing[0]).chargeableDays === 1 ? '' : 's'} past free time at ${fmtCurrency(accruing[0].demurragePerDay, 'IDR', { compact: true })} a day. Everything else in the pipeline is cheaper to fix than that one.`
              : ending.length
                ? `${ending[0].code} has ${freeTimeState(ending[0]).daysRemaining} day${freeTimeState(ending[0]).daysRemaining === 1 ? '' : 's'} of free time left, at ${fmtCurrency(ending[0].demurragePerDay, 'IDR', { compact: true })} a day after that. It is cheaper to clear today than to explain the charge next week.`
                : 'Nothing is past its free time. Keep it that way — demurrage is the only cost in the book that buys nothing at all.'}
          </Because>
        </CardBody>
      </Card>

      <DataTable
        data={s.shipments}
        columns={columns}
        getId={(x) => x.id}
        getLabel={(x) => x.code}
        entityLabel="shipment"
        exportName="import-shipments"
        storageKey="imports"
        searchText={(x) => `${x.code} ${x.vessel ?? ''} ${x.containerNo ?? ''} ${x.billOfLadingNo ?? ''} ${x.pibNumber ?? ''} ${s.suppliers.find((sp) => sp.id === x.supplierId)?.name ?? ''}`}
        onRowClick={(x) => navigate(`/imports/${x.id}`)}
        initialSort={{ key: 'freetime', dir: 'asc' }}
        rowTone={(x) => (freeTimeState(x).chargeableDays > 0 ? 'bg-danger-soft/25' : x.status === 'PERMIT_PENDING' ? 'bg-warning-soft/25' : undefined)}
        filters={[
          {
            key: 'status', label: 'State', values: status, onChange: setStatus,
            options: SHIPMENT_STATES.map((st) => ({ value: st.value, label: st.label })),
            match: (x, v) => v.includes(x.status),
          },
          {
            key: 'lane', label: 'Lane', values: lane, onChange: setLane,
            options: [
              { value: 'GREEN', label: 'Green' },
              { value: 'YELLOW', label: 'Yellow' },
              { value: 'RED', label: 'Red' },
              { value: 'PENDING', label: 'Not channelled' },
            ],
            match: (x, v) => v.includes(x.lane),
          },
        ]}
      />
    </div>
  )
}
