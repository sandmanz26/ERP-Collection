import * as React from 'react'
import { Ship, Truck, TriangleAlert } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because } from '@/components/shared/status'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress, Separator } from '@/components/ui/misc'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { useMfg } from '@/store/useMfg'
import type { Supplier } from '@/data/types'
import { supplierScorecards } from '@/lib/analytics'
import { countryFlag, countryName, paymentInstrumentLabel } from '@/data/reference'
import { fmtCurrency, fmtNumber, fmtPercent } from '@/lib/format'

export function SuppliersPage() {
  const s = useMfg()
  const [kind, setKind] = React.useState<string[]>([])
  const cards = supplierScorecards(s.suppliers, s.shipments, s.purchaseOrders)
  const byId = new Map(cards.map((c) => [c.supplier.id, c]))

  const overseas = s.suppliers.filter((x) => x.kind === 'OVERSEAS')
  const worstLane = cards
    .filter((c) => c.supplier.kind === 'OVERSEAS')
    .sort((a, b) => b.redLanePercent - a.redLanePercent)[0]

  const columns: Column<Supplier>[] = [
    {
      key: 'name', header: 'Supplier', width: 'min-w-[280px]', pinned: true, sortable: true, sortValue: (x) => x.name,
      cell: (x) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-fg">{x.name}</p>
          <p className="truncate text-[11.5px] text-fg-muted">
            {countryFlag(x.country)} {x.city}, {countryName(x.country)} · {x.code}
          </p>
        </div>
      ),
      exportValue: (x) => x.name,
    },
    {
      key: 'kind', header: 'Kind', width: 'w-[110px]', sortable: true, sortValue: (x) => x.kind,
      cell: (x) => <Badge tone={x.kind === 'OVERSEAS' ? 'info' : 'neutral'} size="sm">{x.kind === 'OVERSEAS' ? 'overseas' : 'local'}</Badge>,
      exportValue: (x) => x.kind,
    },
    {
      key: 'terms', header: 'Terms', width: 'w-[190px]',
      cell: (x) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg">{paymentInstrumentLabel(x.paymentInstrument)}</p>
          <p className="text-[11px] text-fg-muted">{x.incoterm} · {x.currency}</p>
        </div>
      ),
      exportValue: (x) => x.paymentInstrument,
    },
    {
      key: 'lead', header: 'Lead days', align: 'right', width: 'w-[110px]', sortable: true, sortValue: (x) => x.leadDays,
      cell: (x) => <span className="tnum text-[12.5px]">{x.leadDays}</span>,
      exportValue: (x) => x.leadDays,
    },
    {
      key: 'lanes', header: 'Lane history', width: 'w-[210px]',
      headerHint: 'How their consignments have historically been channelled — this is where the planning parameter comes from',
      sortable: true, sortValue: (x) => byId.get(x.id)?.redLanePercent ?? 0,
      cell: (x) => {
        if (x.kind === 'LOCAL') return <span className="text-[12px] text-fg-subtle">n/a</span>
        const h = x.laneHistory
        const total = h.green + h.yellow + h.red || 1
        return (
          <div>
            <div className="flex h-2 overflow-hidden rounded-full">
              <span className="bg-success" style={{ width: `${(h.green / total) * 100}%` }} />
              <span className="bg-warning" style={{ width: `${(h.yellow / total) * 100}%` }} />
              <span className="bg-danger" style={{ width: `${(h.red / total) * 100}%` }} />
            </div>
            <p className="tnum mt-1 text-[11px] text-fg-muted">
              {h.green} green · {h.yellow} yellow · <span className="text-danger">{h.red} red</span>
            </p>
          </div>
        )
      },
      exportValue: (x) => `${x.laneHistory.green}/${x.laneHistory.yellow}/${x.laneHistory.red}`,
    },
    {
      key: 'clearance', header: 'Clearance', align: 'right', width: 'w-[120px]', sortable: true,
      headerHint: 'Average days from PIB to SPPB, on their own record',
      sortValue: (x) => byId.get(x.id)?.clearanceDays ?? 0,
      cell: (x) => {
        if (x.kind === 'LOCAL') return <span className="text-[12px] text-fg-subtle">—</span>
        const days = byId.get(x.id)?.clearanceDays ?? x.avgClearanceDays
        return <span className={`tnum text-[12.5px] font-semibold ${days > 6 ? 'text-danger' : days > 3 ? 'text-warning' : 'text-success'}`}>{fmtNumber(days, 1)} d</span>
      },
      exportValue: (x) => byId.get(x.id)?.clearanceDays ?? 0,
    },
    {
      key: 'onTime', header: 'On time', align: 'right', width: 'w-[110px]', sortable: true, sortValue: (x) => x.onTimePercent,
      cell: (x) => <span className={`tnum text-[12.5px] ${x.onTimePercent < 80 ? 'text-danger' : 'text-fg'}`}>{fmtPercent(x.onTimePercent, 0)}</span>,
      exportValue: (x) => x.onTimePercent,
    },
    {
      key: 'docs', header: 'Doc accuracy', align: 'right', width: 'w-[130px]', sortable: true, sortValue: (x) => x.documentAccuracyPercent,
      headerHint: 'An invoice that disagrees with the packing list is the commonest yellow-lane hold there is',
      cell: (x) => <span className={`tnum text-[12.5px] ${x.documentAccuracyPercent < 85 ? 'text-danger' : 'text-fg'}`}>{fmtPercent(x.documentAccuracyPercent, 0)}</span>,
      exportValue: (x) => x.documentAccuracyPercent,
    },
    {
      key: 'demurrage', header: 'Demurrage caused', align: 'right', width: 'w-[160px]', sortable: true,
      sortValue: (x) => byId.get(x.id)?.demurrage ?? 0,
      cell: (x) => {
        const d = byId.get(x.id)?.demurrage ?? 0
        return <span className={`tnum text-[12.5px] ${d ? 'font-semibold text-danger' : 'text-fg-subtle'}`}>{d ? fmtCurrency(d, 'IDR', { compact: true }) : '—'}</span>
      },
      exportValue: (x) => byId.get(x.id)?.demurrage ?? 0,
    },
    {
      key: 'score', header: 'Score', align: 'right', width: 'w-[120px]', sortable: true, sortValue: (x) => byId.get(x.id)?.score ?? 0,
      headerHint: 'On-time 30%, quality 30%, document accuracy 25%, green-lane share 15%',
      cell: (x) => {
        const score = byId.get(x.id)?.score ?? 0
        return (
          <div>
            <p className={`tnum text-[13px] font-semibold ${score >= 90 ? 'text-success' : score >= 80 ? 'text-fg' : 'text-danger'}`}>{score}</p>
            <Progress value={score} tone={score >= 90 ? 'success' : score >= 80 ? 'primary' : 'danger'} size="sm" className="mt-1" />
          </div>
        )
      },
      exportValue: (x) => byId.get(x.id)?.score ?? 0,
    },
    {
      key: 'note', header: 'What we have learned', width: 'min-w-[380px]', defaultHidden: true,
      cell: (x) => <p className="text-[12px] leading-relaxed text-fg-muted">{x.note}</p>,
      exportValue: (x) => x.note ?? '',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><Truck className="size-3" /> Materials</Badge>}
        title="Suppliers"
        description="A scorecard is only worth having if it changes a plan. The lane history here is not a vanity metric — it is the parameter the MRP run uses to work out when a container becomes issuable."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Suppliers" value={fmtNumber(s.suppliers.length)} icon={<Truck />} accent="primary" sub={`${overseas.length} overseas`} />
        <KpiCard
          label="Best scorecard"
          value={cards[0]?.supplier.name.split(' ')[0] ?? '—'}
          icon={<Ship />}
          accent="success"
          sub={cards[0] ? `${cards[0].score} · ${fmtNumber(cards[0].clearanceDays, 1)} days to clear` : ''}
        />
        <KpiCard
          label="Most red lanes"
          value={worstLane ? fmtPercent(worstLane.redLanePercent, 0) : '—'}
          icon={<TriangleAlert />}
          accent="danger"
          sub={worstLane?.supplier.name.split(' ')[0]}
        />
        <KpiCard
          label="Demurrage caused"
          value={fmtCurrency(cards.reduce((a, c) => a + c.demurrage, 0), 'IDR', { compact: true })}
          icon={<TriangleAlert />}
          accent="warning"
          sub="paid, across every consignment on record"
        />
      </div>

      {worstLane && (
        <Card>
          <CardBody className="flex flex-wrap items-start gap-4">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-fg">
                {worstLane.supplier.name} draws a red lane on {fmtPercent(worstLane.redLanePercent, 0)} of their consignments
              </p>
              <Because className="mt-1">{worstLane.supplier.note}</Because>
              <Separator className="my-3" />
              <p className="text-[12.5px] leading-relaxed text-fg">
                <span className="font-medium text-primary">Why it matters — </span>
                every extra clearance day is a day the material is not issuable, and the plan is built on{' '}
                {fmtNumber(worstLane.clearanceDays, 1)} days rather than the two a clean supplier takes. Their goods have to be
                ordered {Math.round(worstLane.clearanceDays - 2)} days earlier for the same promise date.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <DataTable
        data={s.suppliers}
        columns={columns}
        getId={(x) => x.id}
        getLabel={(x) => x.name}
        entityLabel="supplier"
        exportName="suppliers"
        storageKey="suppliers"
        searchText={(x) => `${x.code} ${x.name} ${x.city} ${x.contact} ${x.note ?? ''}`}
        initialSort={{ key: 'score', dir: 'desc' }}
        filters={[
          {
            key: 'kind', label: 'Kind', values: kind, onChange: setKind,
            options: [{ value: 'OVERSEAS', label: 'Overseas' }, { value: 'LOCAL', label: 'Local' }],
            match: (x, v) => v.includes(x.kind),
          },
        ]}
      />
    </div>
  )
}
