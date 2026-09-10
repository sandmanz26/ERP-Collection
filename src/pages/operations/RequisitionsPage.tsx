import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck, ClipboardList, Clock, Stamp } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import type { PurchaseRequisition } from '@/data/types'
import { approvalState, requisitionIsOpen, requisitionValue } from '@/lib/operations'
import { APPROVAL_LADDER, REQUISITION_ORIGINS, REQUISITION_SLA_DAYS, REQUISITION_STATUSES } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import { daysBetween, TODAY } from '@/data/clock'

export function RequisitionsPage() {
  const { requisitions, suppliers, decideRequisition, convertRequisition, submitRequisition } = useMfg()
  const toast = useToast()
  const navigate = useNavigate()
  const [status, setStatus] = React.useState<string[]>([])
  const [origin, setOrigin] = React.useState<string[]>([])

  const open = requisitions.filter((r) => requisitionIsOpen(r.status))
  const waiting = requisitions.filter((r) => r.status === 'PENDING_APPROVAL' || r.status === 'SUBMITTED')
  const breaching = waiting.filter((r) => approvalState(r).breachingSla)
  const approved = requisitions.filter((r) => r.status === 'APPROVED')
  const daysLost = waiting.reduce((a, r) => a + approvalState(r).daysWaiting, 0)

  const columns: Column<PurchaseRequisition>[] = [
    {
      key: 'code', header: 'Requisition', width: 'min-w-[240px]', pinned: true, sortable: true, sortValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{r.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.requestedBy} · {r.department.toLowerCase()}</p>
        </div>
      ),
      exportValue: (r) => r.code,
    },
    {
      key: 'status', header: 'Status', width: 'w-[165px]', sortable: true, sortValue: (r) => r.status,
      cell: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge value={r.status} size="sm" />
          <Tooltip content={REQUISITION_ORIGINS.find((o) => o.value === r.origin)?.hint ?? ''}>
            <span><Badge tone="neutral" size="sm">{REQUISITION_ORIGINS.find((o) => o.value === r.origin)?.label}</Badge></span>
          </Tooltip>
        </div>
      ),
      exportValue: (r) => r.status,
    },
    {
      key: 'what', header: 'What it asks for', width: 'min-w-[300px]',
      cell: (r) => (
        <div className="min-w-0 space-y-0.5">
          {r.lines.slice(0, 2).map((l) => (
            <div key={l.id}>
              <p className="truncate text-[12.5px] text-fg">{fmtNumber(l.quantity)} {l.uom} · {l.description}</p>
              <p className="line-clamp-1 text-[11px] text-fg-muted">{l.justification}</p>
            </div>
          ))}
          {r.lines.length > 2 && <p className="text-[11px] text-fg-subtle">and {r.lines.length - 2} more</p>}
        </div>
      ),
      exportValue: (r) => r.lines.map((l) => l.description).join(' | '),
    },
    {
      key: 'value', header: 'Value', align: 'right', width: 'w-[145px]', sortable: true,
      sortValue: (r) => requisitionValue(r),
      cell: (r) => {
        const st = approvalState(r)
        return (
          <div>
            <p className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(st.value, 'IDR', { compact: true })}</p>
            <p className="tnum text-[11px] text-fg-muted">{st.required} signature{st.required === 1 ? '' : 's'}</p>
          </div>
        )
      },
      exportValue: (r) => Math.round(requisitionValue(r)),
    },
    {
      key: 'ladder', header: 'Sitting with', width: 'min-w-[230px]',
      headerHint: 'Who the requisition is actually on the desk of right now. The ladder is decided by value, not by department.',
      cell: (r) => {
        const st = approvalState(r)
        if (st.rejected) return <span className="text-[12px] text-danger">Rejected by {st.rejected.approverName}</span>
        if (st.complete) return <span className="text-[12px] text-success">All {st.required} given</span>
        if (!st.waitingOn) return <span className="text-[12px] text-fg-subtle">Not submitted</span>
        return (
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-fg">{st.waitingOn.approverName}</p>
            <p className="tnum text-[11px] text-fg-muted">
              level {st.waitingOn.level} of {st.required} · {st.given} given
            </p>
          </div>
        )
      },
      exportValue: (r) => approvalState(r).waitingOn?.approverName ?? '',
    },
    {
      key: 'waiting', header: 'Waiting', align: 'right', width: 'w-[125px]', sortable: true,
      headerHint: `Lead time spent on a desk is lead time gone. Anything past ${REQUISITION_SLA_DAYS} days is holding up the plan.`,
      sortValue: (r) => approvalState(r).daysWaiting,
      cell: (r) => {
        const st = approvalState(r)
        if (!st.daysWaiting) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <Tooltip content={st.leadTimeLost}>
            <span className={`tnum text-[12.5px] font-semibold ${st.breachingSla ? 'text-danger' : 'text-fg'}`}>{st.daysWaiting} d</span>
          </Tooltip>
        )
      },
      exportValue: (r) => approvalState(r).daysWaiting,
    },
    {
      key: 'needed', header: 'Needed by', width: 'w-[135px]', sortable: true, sortValue: (r) => r.neededBy,
      cell: (r) => {
        const late = requisitionIsOpen(r.status) && r.neededBy < TODAY
        return (
          <div>
            <p className={`tnum text-[12.5px] ${late ? 'font-semibold text-danger' : 'text-fg'}`}>{fmtDate(r.neededBy)}</p>
            <p className="tnum text-[11px] text-fg-muted">raised {fmtDate(r.raisedAt, 'short')}</p>
          </div>
        )
      },
      exportValue: (r) => r.neededBy,
    },
    {
      key: 'do', header: '', align: 'right', width: 'w-[175px]',
      cell: (r) => {
        const st = approvalState(r)
        if (r.status === 'DRAFT') {
          return (
            <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); submitRequisition(r.id); toast.push({ title: `${r.code} submitted`, tone: 'success' }) }}>
              Submit
            </Button>
          )
        }
        if (r.status === 'APPROVED') {
          return (
            <Button
              size="xs" variant="primary"
              onClick={(e) => {
                e.stopPropagation()
                convertRequisition(r.id)
                toast.push({ title: `${r.code} converted`, description: 'One purchase order per supplier, at the estimated costs.', tone: 'success', action: { label: 'Open purchasing', onClick: () => navigate('/purchasing') } })
              }}
            >
              Raise orders
            </Button>
          )
        }
        if (st.waitingOn) {
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                size="xs" variant="primary"
                onClick={(e) => { e.stopPropagation(); decideRequisition(r.id, st.waitingOn!.level, 'APPROVED'); toast.push({ title: `${r.code} signed at level ${st.waitingOn!.level}`, tone: 'success' }) }}
              >
                Approve
              </Button>
              <Button
                size="xs" variant="ghost"
                onClick={(e) => { e.stopPropagation(); decideRequisition(r.id, st.waitingOn!.level, 'REJECTED', 'Rejected from the requisition list.'); toast.push({ title: `${r.code} rejected`, tone: 'info' }) }}
              >
                Reject
              </Button>
            </div>
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
        title="Purchase requisitions"
        description="The ask before the order. Every day a requisition spends on a desk is a day of supplier lead time already spent — which is why this page counts the waiting rather than the approvals."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open requisitions" value={fmtNumber(open.length)} icon={<ClipboardList />} accent="primary" sub={`${fmtCurrency(open.reduce((a, r) => a + requisitionValue(r), 0), 'IDR', { compact: true })} of intent`} />
        <KpiCard
          label="Waiting for a signature"
          value={fmtNumber(waiting.length)}
          icon={<Stamp />} accent={breaching.length ? 'danger' : waiting.length ? 'warning' : 'success'}
          sub={breaching.length ? `${fmtNumber(breaching.length)} past the ${REQUISITION_SLA_DAYS}-day service level` : 'all inside the service level'}
        />
        <KpiCard
          label="Lead time on desks"
          value={`${fmtNumber(daysLost)} d`}
          icon={<Clock />} accent={daysLost > 6 ? 'danger' : 'warning'}
          sub="cumulative days spent waiting, not buying"
        />
        <KpiCard
          label="Approved, not yet ordered"
          value={fmtNumber(approved.length)}
          icon={<CheckCheck />} accent={approved.length ? 'warning' : 'success'}
          sub={approved.length ? 'signed off and still sitting in purchasing' : 'nothing signed is sitting'}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <DataTable
          data={requisitions}
          columns={columns}
          getId={(r) => r.id}
          getLabel={(r) => r.code}
          entityLabel="requisition"
          exportName="requisitions"
          storageKey="requisitions"
          searchText={(r) => `${r.code} ${r.requestedBy} ${r.department} ${r.lines.map((l) => `${l.description} ${l.justification}`).join(' ')}`}
          initialSort={{ key: 'waiting', dir: 'desc' }}
          rowTone={(r) => (approvalState(r).breachingSla ? 'bg-danger-soft/25' : undefined)}
          filters={[
            {
              key: 'status', label: 'Status', values: status, onChange: setStatus,
              options: REQUISITION_STATUSES.map((x) => ({ value: x.value, label: x.label })),
              match: (r, v) => v.includes(r.status),
            },
            {
              key: 'origin', label: 'Raised by', values: origin, onChange: setOrigin,
              options: REQUISITION_ORIGINS.map((x) => ({ value: x.value, label: x.label })),
              match: (r, v) => v.includes(r.origin),
            },
          ]}
        />

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader icon={<Stamp />} title="Who can sign for what" description="The ladder is decided by the value of the requisition, so a box of abrasives takes one signature and a container of walnut takes four." />
            <CardBody className="space-y-2">
              {APPROVAL_LADDER.map((rung) => (
                <div key={rung.level} className="flex items-baseline justify-between gap-3 py-1">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-fg">{rung.title}</p>
                    <p className="text-[11px] text-fg-muted">level {rung.level} · {rung.role.toLowerCase()}</p>
                  </div>
                  <span className="tnum shrink-0 text-[12px] text-fg-muted">
                    {rung.limit === Number.MAX_SAFE_INTEGER ? 'no ceiling' : `to ${fmtCurrency(rung.limit, 'IDR', { compact: true })}`}
                  </span>
                </div>
              ))}
              <Separator />
              <Because>
                A requisition needs every rung whose ceiling it clears — not just the one it lands on. That is what makes a large import order slow, and it is why the waiting column matters more than the approval count.
              </Because>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Clock />} title="On a desk right now" description="Ranked by what the delay is costing in lead time." />
            <CardBody className="space-y-3">
              {waiting.length === 0 && <Because>Nothing is waiting on a signature.</Because>}
              {waiting
                .slice()
                .sort((a, b) => approvalState(b).daysWaiting - approvalState(a).daysWaiting)
                .slice(0, 5)
                .map((r) => {
                  const st = approvalState(r)
                  return (
                    <div key={r.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[11.5px] font-semibold text-fg">{r.code}</p>
                          <p className="truncate text-[11.5px] text-fg-muted">{st.waitingOn?.approverName ?? 'unassigned'}</p>
                        </div>
                        <span className={`tnum shrink-0 text-[12px] font-semibold ${st.breachingSla ? 'text-danger' : 'text-warning'}`}>{st.daysWaiting} d</span>
                      </div>
                      <Because className="mt-1 text-[11px]">{st.leadTimeLost}</Because>
                      <Separator className="mt-2.5" />
                    </div>
                  )
                })}
              {suppliers.length > 0 && (
                <Because>
                  Every one of these has a supplier lead time behind it that starts the day the order is cut, not the day the requisition was raised.
                </Because>
              )}
            </CardBody>
          </Card>

          {requisitions.some((r) => r.status === 'REJECTED') && (
            <Card>
              <CardHeader title="Turned down" description="With the reason on the record, so the same ask does not simply come round again." />
              <CardBody className="space-y-2.5">
                {requisitions.filter((r) => r.status === 'REJECTED').map((r) => (
                  <div key={r.id}>
                    <p className="font-mono text-[11.5px] font-semibold text-fg">{r.code}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-fg-muted">{r.rejectedReason}</p>
                    <p className="tnum mt-0.5 text-[11px] text-fg-subtle">{daysBetween(r.raisedAt, TODAY)} days ago</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
