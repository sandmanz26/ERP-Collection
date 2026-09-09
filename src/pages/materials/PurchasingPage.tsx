import * as React from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, PackageSearch, Send, TriangleAlert } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { useMfg } from '@/store/useMfg'
import type { PurchaseOrder } from '@/data/types'
import { permitGate } from '@/lib/importing'
import { paymentInstrumentLabel } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import { TODAY } from '@/data/clock'

export function PurchasingPage() {
  const s = useMfg()
  const toast = useToast()
  const [status, setStatus] = React.useState<string[]>([])
  const [kind, setKind] = React.useState<string[]>([])

  const valueOf = (po: PurchaseOrder) => po.lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0) * po.fxRateAtOrder
  const open = s.purchaseOrders.filter((p) => !['CLOSED', 'CANCELLED', 'RECEIVED'].includes(p.status))
  const awaitingApproval = s.purchaseOrders.filter((p) => p.status === 'PENDING_APPROVAL')

  /** The LARTAS release gate — a restricted order does not go to the supplier until the permit is right. */
  const gateFor = React.useCallback(
    (po: PurchaseOrder) => {
      const shipment = po.shipmentId ? s.shipments.find((x) => x.id === po.shipmentId) : undefined
      if (!shipment) return { ok: true, problems: [] as ReturnType<typeof permitGate>['problems'] }
      return permitGate(shipment, s.items, s.permits, s.settings.permitWarningDays)
    },
    [s.shipments, s.items, s.permits, s.settings.permitWarningDays],
  )

  const blocked = s.purchaseOrders.filter((p) => !['CLOSED', 'CANCELLED'].includes(p.status) && !gateFor(p).ok)

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'code', header: 'Order', width: 'min-w-[210px]', pinned: true, sortable: true, sortValue: (p) => p.code,
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{p.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{s.suppliers.find((x) => x.id === p.supplierId)?.name}</p>
        </div>
      ),
      exportValue: (p) => p.code,
    },
    {
      key: 'status', header: 'Status', width: 'w-[170px]', sortable: true, sortValue: (p) => p.status,
      cell: (p) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge value={p.status} size="sm" />
          <Badge tone={p.kind === 'OVERSEAS' ? 'info' : 'neutral'} size="sm">{p.kind === 'OVERSEAS' ? 'import' : 'local'}</Badge>
        </div>
      ),
      exportValue: (p) => p.status,
    },
    {
      key: 'gate', header: 'LARTAS gate', width: 'min-w-[300px]',
      headerHint: 'A restricted line does not go to the supplier until the permit is on file, covers the HS code and does not lapse before arrival',
      cell: (p) => {
        const gate = gateFor(p)
        if (!p.shipmentId) return <span className="text-[12px] text-fg-subtle">n/a — local</span>
        if (gate.ok) return <span className="text-[12px] text-success">Clear</span>
        return (
          <div className="space-y-0.5">
            {gate.problems.slice(0, 2).map((x, i) => (
              <p key={i} className="text-[11.5px] leading-snug text-danger">
                <strong className="font-medium">{x.title}.</strong> {x.detail}
              </p>
            ))}
          </div>
        )
      },
      exportValue: (p) => (gateFor(p).ok ? 'clear' : 'blocked'),
    },
    {
      key: 'lines', header: 'Lines', align: 'right', width: 'w-[100px]',
      cell: (p) => (
        <span className="tnum text-[12.5px]">
          {p.lines.filter((l) => l.receivedQuantity >= l.quantity).length}/{p.lines.length}
        </span>
      ),
      exportValue: (p) => p.lines.length,
    },
    {
      key: 'required', header: 'Required by', width: 'w-[130px]', sortable: true,
      sortValue: (p) => p.lines.map((l) => l.requiredDate).sort()[0] ?? '',
      cell: (p) => {
        const req = p.lines.map((l) => l.requiredDate).sort()[0]
        const late = req < TODAY && !['CLOSED', 'RECEIVED'].includes(p.status)
        return <span className={`tnum text-[12.5px] ${late ? 'font-semibold text-danger' : ''}`}>{fmtDate(req)}</span>
      },
      exportValue: (p) => p.lines.map((l) => l.requiredDate).sort()[0] ?? '',
    },
    {
      key: 'promised', header: 'Promised', width: 'w-[130px]', defaultHidden: true,
      cell: (p) => <span className="tnum text-[12.5px]">{fmtDate(p.lines.map((l) => l.promisedDate).filter(Boolean).sort()[0])}</span>,
      exportValue: (p) => p.lines[0]?.promisedDate ?? '',
    },
    {
      key: 'terms', header: 'Terms', width: 'w-[180px]', defaultHidden: true,
      cell: (p) => <span className="text-[12.5px] text-fg-muted">{paymentInstrumentLabel(p.paymentInstrument)} · {p.incoterm}</span>,
      exportValue: (p) => p.paymentInstrument,
    },
    {
      key: 'shipment', header: 'Shipment', width: 'w-[150px]',
      cell: (p) => {
        const sh = s.shipments.find((x) => x.id === p.shipmentId)
        if (!sh) return <span className="text-[12px] text-fg-subtle">—</span>
        return (
          <Link to={`/imports/${sh.id}`} className="font-mono text-[12px] font-medium text-primary hover:underline">
            {sh.code}
          </Link>
        )
      },
      exportValue: (p) => s.shipments.find((x) => x.id === p.shipmentId)?.code ?? '',
    },
    {
      key: 'value', header: 'Value', align: 'right', width: 'w-[160px]', sortable: true, sortValue: (p) => valueOf(p),
      cell: (p) => (
        <div>
          <p className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(valueOf(p), 'IDR', { compact: true })}</p>
          {p.currency !== 'IDR' && (
            <p className="tnum text-[11px] text-fg-muted">
              {fmtCurrency(p.lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0), p.currency, { compact: true })}
            </p>
          )}
        </div>
      ),
      exportValue: (p) => valueOf(p),
    },
    {
      key: 'action', header: '', width: 'w-[130px]',
      cell: (p) => {
        if (p.status === 'PENDING_APPROVAL') {
          return (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                s.approvePurchaseOrder(p.id)
                toast.push({ tone: 'success', title: `${p.code} approved` })
              }}
            >
              <CheckCircle2 /> Approve
            </Button>
          )
        }
        if (p.status === 'APPROVED') {
          const gate = gateFor(p)
          return (
            <Tooltip content={gate.ok ? 'Send to the supplier.' : gate.problems[0]?.remedy ?? ''}>
              <Button
                size="sm"
                variant={gate.ok ? 'secondary' : 'ghost'}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!gate.ok) {
                    toast.push({ tone: 'error', title: 'Blocked at the LARTAS gate', description: gate.problems[0]?.detail })
                    return
                  }
                  s.releasePurchaseOrder(p.id)
                  toast.push({ tone: 'success', title: `${p.code} released to the supplier` })
                }}
              >
                <Send /> Release
              </Button>
            </Tooltip>
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
        eyebrow={<Badge tone="primary" size="sm"><PackageSearch className="size-3" /> Materials</Badge>}
        title="Purchase orders"
        description="Local orders are simple. An import order is the head of a consignment, and it does not leave the building until the permit that covers its restricted lines is on file, matches their HS codes, and does not lapse before the vessel berths."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open orders" value={fmtNumber(open.length)} icon={<PackageSearch />} accent="primary" sub={`${fmtCurrency(open.reduce((a, p) => a + valueOf(p), 0), 'IDR', { compact: true })} committed`} />
        <KpiCard label="Awaiting approval" value={fmtNumber(awaitingApproval.length)} icon={<CheckCircle2 />} accent={awaitingApproval.length ? 'warning' : 'success'} />
        <KpiCard
          label="Blocked at the permit gate"
          value={fmtNumber(blocked.length)}
          icon={<TriangleAlert />}
          accent={blocked.length ? 'danger' : 'success'}
          sub={blocked.length ? blocked[0].code : 'every restricted line is covered'}
        />
        <KpiCard
          label="Import orders"
          value={fmtNumber(s.purchaseOrders.filter((p) => p.kind === 'OVERSEAS').length)}
          icon={<PackageSearch />}
          accent="accent"
          sub={`${s.purchaseOrders.filter((p) => p.kind === 'LOCAL').length} local`}
        />
      </div>

      {blocked.length > 0 && (
        <Card className="border-danger/50">
          <CardHeader
            icon={<TriangleAlert />}
            title={`${blocked.length} order${blocked.length === 1 ? '' : 's'} cannot be released`}
            description="A declaration that has lapsed by arrival is no declaration at all, and re-filing through SILK takes eleven working days."
          />
          <CardBody className="space-y-3">
            {blocked.map((p) => {
              const gate = gateFor(p)
              return (
                <div key={p.id} className="rounded-lg border border-border bg-surface-sunken/60 p-3">
                  <p className="font-mono text-[12.5px] font-semibold text-fg">
                    {p.code} · {s.suppliers.find((x) => x.id === p.supplierId)?.name}
                  </p>
                  {gate.problems.map((x, i) => (
                    <div key={i} className="mt-1.5">
                      <p className="text-[12.5px] font-medium text-danger">{x.title}</p>
                      <Because>{x.detail}</Because>
                      <p className="mt-0.5 text-[12px] text-fg">
                        <span className="font-medium text-primary">Do this — </span>
                        {x.remedy}
                      </p>
                    </div>
                  ))}
                </div>
              )
            })}
          </CardBody>
        </Card>
      )}

      <DataTable
        data={s.purchaseOrders}
        columns={columns}
        getId={(p) => p.id}
        getLabel={(p) => p.code}
        entityLabel="purchase order"
        exportName="purchase-orders"
        storageKey="purchasing"
        searchText={(p) => `${p.code} ${s.suppliers.find((x) => x.id === p.supplierId)?.name ?? ''} ${p.note ?? ''}`}
        initialSort={{ key: 'required', dir: 'asc' }}
        rowTone={(p) => (!['CLOSED', 'CANCELLED'].includes(p.status) && !gateFor(p).ok ? 'bg-danger-soft/25' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: Array.from(new Set(s.purchaseOrders.map((p) => p.status))).map((v) => ({ value: v, label: v.replace(/_/g, ' ') })),
            match: (p, v) => v.includes(p.status),
          },
          {
            key: 'kind', label: 'Kind', values: kind, onChange: setKind,
            options: [{ value: 'OVERSEAS', label: 'Import' }, { value: 'LOCAL', label: 'Local' }],
            match: (p, v) => v.includes(p.kind),
          },
        ]}
      />
    </div>
  )
}
