import * as React from 'react'
import { Link } from 'react-router-dom'
import { Flame, PackageSearch, Play, Ship, TriangleAlert, Warehouse } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because } from '@/components/shared/status'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import { useMrpLines } from '@/hooks/useDerived'
import type { MrpLine } from '@/data/types'
import { fmtDate, fmtNumber, relativeLabel } from '@/lib/format'
import { uid } from '@/lib/utils'
import { TODAY } from '@/data/clock'

const SUPPLY_ICON: Record<MrpLine['supplyKind'], React.ReactNode> = {
  ON_HAND: <Warehouse className="size-3.5" />,
  LOCAL_PO: <PackageSearch className="size-3.5" />,
  IMPORT: <Ship className="size-3.5" />,
  KILN: <Flame className="size-3.5" />,
  NONE: <TriangleAlert className="size-3.5" />,
}

const SUPPLY_TONE: Record<MrpLine['supplyKind'], 'success' | 'info' | 'primary' | 'warning' | 'danger'> = {
  ON_HAND: 'success', LOCAL_PO: 'info', IMPORT: 'primary', KILN: 'warning', NONE: 'danger',
}

export function MrpPage() {
  const s = useMfg()
  const toast = useToast()
  const lines = useMrpLines()
  const [supply, setSupply] = React.useState<string[]>([])
  const [only, setOnly] = React.useState<string[]>([])

  const shortages = lines.filter((l) => l.slackDays < 0 && l.grossRequirement > 0)
  const uncovered = lines.filter((l) => l.supplyKind === 'NONE' && l.netRequirement > 0)
  const worst = shortages[0]

  const columns: Column<MrpLine>[] = [
    {
      key: 'item', header: 'Item', width: 'min-w-[250px]', pinned: true, sortable: true, sortValue: (l) => l.itemCode,
      cell: (l) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold text-fg">{l.itemName}</p>
          <p className="truncate font-mono text-[11px] text-fg-muted">
            {l.itemCode}
            {l.imported && <span className="ml-1.5 text-info">imported</span>}
          </p>
        </div>
      ),
      exportValue: (l) => l.itemCode,
    },
    {
      key: 'gross', header: 'Gross req.', align: 'right', width: 'w-[110px]', sortable: true, sortValue: (l) => l.grossRequirement,
      headerHint: 'Exploded through every bill with yield and scrap applied',
      cell: (l) => <span className="tnum text-[12.5px]">{fmtNumber(l.grossRequirement, l.grossRequirement < 10 ? 2 : 0)}</span>,
      exportValue: (l) => l.grossRequirement,
    },
    {
      key: 'onHand', header: 'On hand', align: 'right', width: 'w-[100px]', sortable: true, sortValue: (l) => l.onHand,
      cell: (l) => <span className="tnum text-[12.5px] text-fg-muted">{fmtNumber(l.onHand, l.onHand < 10 ? 2 : 0)}</span>,
      exportValue: (l) => l.onHand,
    },
    {
      key: 'safety', header: 'Safety', align: 'right', width: 'w-[90px]', defaultHidden: true,
      headerHint: 'Excluded from netting — safety stock is not a buffer MRP is allowed to consume',
      cell: (l) => <span className="tnum text-[12.5px] text-fg-muted">{fmtNumber(l.safetyStock)}</span>,
      exportValue: (l) => l.safetyStock,
    },
    {
      key: 'sched', header: 'Scheduled', align: 'right', width: 'w-[110px]', sortable: true, sortValue: (l) => l.scheduledReceipts,
      cell: (l) => <span className="tnum text-[12.5px] text-fg-muted">{fmtNumber(l.scheduledReceipts, l.scheduledReceipts < 10 ? 2 : 0)}</span>,
      exportValue: (l) => l.scheduledReceipts,
    },
    {
      key: 'net', header: 'Net req.', align: 'right', width: 'w-[110px]', sortable: true, sortValue: (l) => l.netRequirement,
      cell: (l) => (
        <span className={`tnum text-[12.5px] ${l.netRequirement > 0 ? 'font-semibold text-danger' : 'text-fg-subtle'}`}>
          {l.netRequirement > 0 ? fmtNumber(l.netRequirement, l.netRequirement < 10 ? 2 : 0) : '—'}
        </span>
      ),
      exportValue: (l) => l.netRequirement,
    },
    {
      key: 'needed', header: 'Needed', width: 'w-[120px]', sortable: true, sortValue: (l) => l.requiredDate,
      cell: (l) => <span className="tnum text-[12.5px]">{fmtDate(l.requiredDate)}</span>,
      exportValue: (l) => l.requiredDate,
    },
    {
      key: 'available', header: 'Available', width: 'w-[130px]', sortable: true, sortValue: (l) => l.availableDate ?? '9999',
      headerHint: 'Not the ETA — the day it becomes legally issuable, after clearance and inland',
      cell: (l) =>
        l.availableDate ? (
          <div>
            <p className="tnum text-[12.5px]">{fmtDate(l.availableDate)}</p>
            <p className="tnum text-[11px] text-fg-muted">{relativeLabel(l.availableDate)}</p>
          </div>
        ) : l.supplyKind === 'NONE' ? (
          <span className="text-[12px] font-medium text-danger">nothing covers it</span>
        ) : (
          <span className="text-[12px] font-medium text-danger">part covered, rest not</span>
        ),
      exportValue: (l) => l.availableDate ?? '',
    },
    {
      key: 'slack', header: 'Slack', align: 'right', width: 'w-[110px]', sortable: true, sortValue: (l) => l.slackDays,
      tour: 'mrp-slack',
      headerHint: 'Available date less needed date. Negative means the material lands after the operation that wants it.',
      cell: (l) => {
        if (l.slackDays === -999) return <Badge tone="danger" size="sm">{l.supplyKind === 'NONE' ? 'no cover' : 'short'}</Badge>
        return (
          <span className={`tnum text-[13px] font-semibold ${l.slackDays < 0 ? 'text-danger' : l.slackDays < 5 ? 'text-warning' : 'text-success'}`}>
            {l.slackDays > 0 ? '+' : ''}{l.slackDays} d
          </span>
        )
      },
      exportValue: (l) => l.slackDays,
    },
    {
      key: 'coverage', header: 'What covers it, and why that date', width: 'min-w-[420px]', tour: 'mrp-coverage',
      cell: (l) => (
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5">
            <Badge tone={SUPPLY_TONE[l.supplyKind]} size="sm">
              {SUPPLY_ICON[l.supplyKind]}
              {l.supplyKind.replace(/_/g, ' ').toLowerCase()}
            </Badge>
            {l.shipmentId && (
              <Link to={`/imports/${l.shipmentId}`} className="text-[11px] font-medium text-primary hover:underline">
                open shipment
              </Link>
            )}
          </div>
          <p className="text-[12px] leading-relaxed text-fg-muted">{l.coverage}</p>
        </div>
      ),
      exportValue: (l) => l.coverage,
    },
    {
      key: 'demand', header: 'Demanded by', width: 'min-w-[260px]', defaultHidden: true,
      cell: (l) => (
        <div className="space-y-0.5">
          {l.demandFrom.slice(0, 3).map((d) => (
            <p key={d} className="truncate text-[11.5px] text-fg-muted">{d}</p>
          ))}
          {l.demandFrom.length > 3 && <p className="text-[11px] text-fg-subtle">and {l.demandFrom.length - 3} more</p>}
        </div>
      ),
      exportValue: (l) => l.demandFrom.join(' | '),
    },
    {
      key: 'suggest', header: 'Suggested order', align: 'right', width: 'w-[160px]',
      cell: (l) =>
        l.suggestedOrderQuantity > 0 ? (
          <Tooltip content={`Place by ${fmtDate(l.suggestedOrderDate)} to land on the needed date.`}>
            <div>
              <p className="tnum text-[12.5px] font-semibold text-fg">{fmtNumber(l.suggestedOrderQuantity)} {l.uom}</p>
              <p className="tnum text-[11px] text-fg-muted">place {fmtDate(l.suggestedOrderDate)}</p>
            </div>
          </Tooltip>
        ) : (
          <span className="text-[12px] text-fg-subtle">—</span>
        ),
      exportValue: (l) => l.suggestedOrderQuantity,
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="MRP run"
        description="Netting over a 90-day horizon. The useful output is not the plan — it is this exception list, and every line of it answers with a date and a cause rather than a quantity."
        meta={
          <>
            <span className="text-[12.5px] text-fg-muted">Horizon {s.settings.mrpHorizonDays} days from {fmtDate(TODAY)}</span>
            <span className="text-[12.5px] text-fg-muted">{lines.length} items netted</span>
            {s.mrpRuns[0] && <span className="text-[12.5px] text-fg-muted">Last recorded run {fmtDate(s.mrpRuns[0].at)}</span>}
          </>
        }
        actions={
          <Button
            onClick={() => {
              s.recordMrpRun({
                id: uid('mrp'), code: `MRP-${new Date().toISOString().slice(0, 10)}`, at: new Date().toISOString(),
                horizonDays: s.settings.mrpHorizonDays, runBy: 'PPIC',
                shortageCount: shortages.length,
                plannedPurchaseCount: lines.filter((l) => l.suggestedOrderQuantity > 0).length,
                plannedProductionCount: s.workOrders.filter((w) => w.status === 'PLANNED').length,
              })
              toast.push({
                tone: shortages.length ? 'error' : 'success',
                title: shortages.length ? `${shortages.length} shortages` : 'Nothing late',
                description: shortages.length
                  ? `Worst is ${shortages[0].itemCode}, ${-shortages[0].slackDays} days after it is needed.`
                  : 'Every requirement in the horizon is covered before the date it is wanted.',
              })
            }}
          >
            <Play /> Run and record
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Shortages"
          value={fmtNumber(shortages.length)}
          icon={<TriangleAlert />}
          accent={shortages.length ? 'danger' : 'success'}
          sub={worst ? `worst: ${worst.itemCode}, ${worst.slackDays === -999 ? 'no cover at all' : `${-worst.slackDays} days late`}` : 'everything lands in time'}
        />
        <KpiCard label="Nothing covering" value={fmtNumber(uncovered.length)} icon={<TriangleAlert />} accent={uncovered.length ? 'danger' : 'success'} sub="no stock, no order, no shipment" />
        <KpiCard label="Waiting on an import" value={fmtNumber(lines.filter((l) => l.supplyKind === 'IMPORT').length)} icon={<Ship />} accent="primary" sub="covered by something on the water" />
        <KpiCard label="Waiting on a kiln" value={fmtNumber(lines.filter((l) => l.supplyKind === 'KILN').length)} icon={<Flame />} accent="warning" sub="blocked at the moisture gate" />
      </div>

      {worst && worst.slackDays < 0 && (
        <Card className="border-danger/50">
          <CardBody className="flex flex-wrap items-start gap-4">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-fg">
                {worst.itemName} is the line that decides the plan
              </p>
              <Because className="mt-1">{worst.coverage}</Because>
              <div className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1.5">
                <span className="text-[12px] text-fg-muted">Needed <strong className="text-fg">{fmtDate(worst.requiredDate)}</strong></span>
                <span className="text-[12px] text-fg-muted">Available <strong className="text-danger">{worst.availableDate ? fmtDate(worst.availableDate) : 'never, as things stand'}</strong></span>
                <span className="text-[12px] text-fg-muted">
                  Demanded by <strong className="text-fg">{worst.demandFrom[0]}</strong>
                </span>
              </div>
              <Separator className="my-3" />
              <p className="text-[12.5px] leading-relaxed text-fg">
                <span className="font-medium text-primary">Do this — </span>
                {worst.slackDays === -999
                  ? `Raise a purchase order for ${fmtNumber(worst.suggestedOrderQuantity, worst.suggestedOrderQuantity < 10 ? 2 : 0)} ${worst.uom} today — nothing in stock or on order reaches this.`
                  : worst.supplyKind === 'IMPORT'
                    ? 'Re-sequence the work order so the operation that needs it runs last, split the release, or air-freight the balance and price the difference honestly. Do not quietly let the date slide.'
                    : worst.supplyKind === 'KILN'
                      ? 'Nothing to be done but wait for the batch to close in band. Move the operation, not the timber — issuing it wet buys a warranty claim eighteen months from now.'
                      : `Raise a purchase order for ${fmtNumber(worst.suggestedOrderQuantity)} ${worst.uom} today.`}
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <DataTable
        data={lines}
        columns={columns}
        getId={(l) => l.itemId}
        getLabel={(l) => l.itemCode}
        entityLabel="MRP line"
        exportName="mrp-run"
        storageKey="mrp"
        searchText={(l) => `${l.itemCode} ${l.itemName} ${l.coverage} ${l.demandFrom.join(' ')}`}
        initialSort={{ key: 'slack', dir: 'asc' }}
        rowTone={(l) => (l.slackDays < 0 && l.grossRequirement > 0 ? 'bg-danger-soft/25' : undefined)}
        compactByDefault
        pageSize={40}
        filters={[
          {
            key: 'supply', label: 'Covered by', values: supply, onChange: setSupply,
            options: (['ON_HAND', 'LOCAL_PO', 'IMPORT', 'KILN', 'NONE'] as const).map((v) => ({ value: v, label: v.replace(/_/g, ' ').toLowerCase() })),
            match: (l, v) => v.includes(l.supplyKind),
          },
          {
            key: 'only', label: 'Show', values: only, onChange: setOnly,
            options: [
              { value: 'LATE', label: 'Late only' },
              { value: 'IMPORTED', label: 'Imported only' },
              { value: 'NET', label: 'With a net requirement' },
            ],
            match: (l, v) =>
              (!v.includes('LATE') || (l.slackDays < 0 && l.grossRequirement > 0))
              && (!v.includes('IMPORTED') || l.imported)
              && (!v.includes('NET') || l.netRequirement > 0),
          },
        ]}
        emptyTitle="Nothing to net"
        emptyDescription="No demand inside the horizon and nothing below its reorder point."
      />
    </div>
  )
}
