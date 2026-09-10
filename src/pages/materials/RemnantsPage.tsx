import * as React from 'react'
import { Clock, Recycle, Ruler, Trash2 } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import type { Remnant } from '@/data/types'
import { remnantState, remnantSummary, remnantValue } from '@/lib/conversion'
import {
  REMNANT_AGEING_DAYS, REMNANT_MIN_LENGTH_MM, REMNANT_STATUSES, REMNANT_VALUE_FACTORS,
} from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent } from '@/lib/format'

export function RemnantsPage() {
  const { remnants, items, warehouses, conversionOrders, consumeRemnant, writeOffRemnant, reserveRemnant } = useMfg()
  const toast = useToast()
  const [status, setStatus] = React.useState<string[]>([])
  const [flag, setFlag] = React.useState<string[]>([])

  const s = remnantSummary(remnants)
  const item = (id: string) => items.find((x) => x.id === id)

  /* what the rack holds, by material — the view a foreman actually stands in front of */
  const byMaterial = React.useMemo(() => {
    const map = new Map<string, { itemId: string; count: number; quantity: number; value: number; uom: string }>()
    remnants.filter((r) => r.status === 'AVAILABLE' || r.status === 'RESERVED').forEach((r) => {
      const row = map.get(r.itemId) ?? { itemId: r.itemId, count: 0, quantity: 0, value: 0, uom: r.uom }
      row.count += 1
      row.quantity += r.quantity
      row.value += remnantValue(r)
      map.set(r.itemId, row)
    })
    return [...map.values()].sort((a, b) => b.value - a.value)
  }, [remnants])

  const columns: Column<Remnant>[] = [
    {
      key: 'code', header: 'Piece', width: 'min-w-[230px]', pinned: true, sortable: true, sortValue: (r) => r.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-semibold text-fg">{r.code}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.species ?? item(r.itemId)?.name}</p>
        </div>
      ),
      exportValue: (r) => r.code,
    },
    {
      key: 'status', header: 'Status', width: 'w-[150px]', sortable: true, sortValue: (r) => r.status,
      cell: (r) => (
        <Tooltip content={REMNANT_STATUSES.find((x) => x.value === r.status)?.hint ?? ''}>
          <span><StatusBadge value={r.status} size="sm" /></span>
        </Tooltip>
      ),
      exportValue: (r) => r.status,
    },
    {
      key: 'size', header: 'Size', width: 'w-[185px]', sortable: true, sortValue: (r) => r.lengthMm ?? 0,
      headerHint: `Length is what decides whether a piece is still stock or already firewood. Below ${REMNANT_MIN_LENGTH_MM} mm the handling costs more than the wood.`,
      cell: (r) => (
        <div>
          <p className="tnum text-[12.5px] text-fg">
            {r.lengthMm ? `${fmtNumber(r.lengthMm)} × ${fmtNumber(r.widthMm ?? 0)} × ${fmtNumber(r.thicknessMm ?? 0)}` : '—'}
          </p>
          <p className="tnum text-[11px] text-fg-muted">{fmtNumber(r.quantity, 2)} {r.uom}</p>
        </div>
      ),
      exportValue: (r) => r.lengthMm,
    },
    {
      key: 'usable', header: 'Still good for', width: 'min-w-[290px]',
      headerHint: 'A register that only records that something exists is a register nobody picks from. This column is the reason the rack gets used.',
      cell: (r) => {
        const st = remnantState(r)
        return (
          <p className={`line-clamp-2 text-[11.5px] leading-snug ${st.belowMinimum ? 'text-fg-subtle' : 'text-fg-muted'}`}>
            {st.usableFor}
          </p>
        )
      },
      exportValue: (r) => remnantState(r).usableFor,
    },
    {
      key: 'value', header: 'Carried at', align: 'right', width: 'w-[160px]', sortable: true,
      headerHint: 'The material’s own unit cost, at the haircut a piece of this size and kind carries.',
      sortValue: (r) => remnantValue(r),
      cell: (r) => (
        <div>
          <p className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(remnantValue(r), 'IDR', { compact: true })}</p>
          <p className="tnum text-[11px] text-fg-muted">
            {fmtPercent(r.valueFactor * 100, 0)} of {fmtCurrency(r.parentUnitCost, 'IDR', { compact: true })}
          </p>
        </div>
      ),
      exportValue: (r) => Math.round(remnantValue(r)),
    },
    {
      key: 'age', header: 'On the rack', align: 'right', width: 'w-[135px]', sortable: true,
      sortValue: (r) => remnantState(r).ageDays,
      cell: (r) => {
        const st = remnantState(r)
        return (
          <div>
            <p className={`tnum text-[12.5px] font-semibold ${st.ageing ? 'text-danger' : 'text-fg'}`}>{st.ageDays} d</p>
            {st.ageing && <p className="text-[11px] text-danger">past {REMNANT_AGEING_DAYS}</p>}
          </div>
        )
      },
      exportValue: (r) => remnantState(r).ageDays,
    },
    {
      key: 'source', header: 'Came off', width: 'min-w-[180px]', defaultHidden: true,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[11.5px] text-fg-muted">
            {conversionOrders.find((o) => o.id === r.sourceConversionId)?.code ?? r.sourceWorkOrderId ?? '—'}
          </p>
          <p className="truncate text-[11px] text-fg-subtle">{warehouses.find((w) => w.id === r.warehouseId)?.name}</p>
        </div>
      ),
      exportValue: (r) => r.sourceConversionId ?? r.sourceWorkOrderId ?? '',
    },
    {
      key: 'do', header: '', align: 'right', width: 'w-[185px]',
      cell: (r) => {
        if (r.status === 'CONSUMED' || r.status === 'WRITTEN_OFF') {
          return <span className="text-[11.5px] text-fg-subtle">{fmtDate(r.consumedAt ?? r.writtenOffAt, 'short')}</span>
        }
        const st = remnantState(r)
        return (
          <div className="flex items-center justify-end gap-1.5">
            {r.status === 'AVAILABLE' && (
              <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); reserveRemnant(r.id); toast.push({ title: `${r.code} reserved`, tone: 'info' }) }}>
                Reserve
              </Button>
            )}
            <Button size="xs" variant="primary" onClick={(e) => { e.stopPropagation(); consumeRemnant(r.id); toast.push({ title: `${r.code} used`, description: 'That is a board somebody did not have to open.', tone: 'success' }) }}>
              Use
            </Button>
            {st.ageing && (
              <Tooltip content="Nobody used it in time. The value comes off the books.">
                <Button
                  size="iconXs" variant="dangerGhost"
                  onClick={(e) => { e.stopPropagation(); writeOffRemnant(r.id, `Written off after ${st.ageDays} days on the rack.`); toast.push({ title: `${r.code} written off`, tone: 'warning' }) }}
                >
                  <Trash2 />
                </Button>
              </Tooltip>
            )}
          </div>
        )
      },
      exportValue: () => '',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Offcuts & remnants"
        description="Bahan sisa. Every one of these is material that has already been bought, already been dried and already been cut — so the only question left is whether anybody looks at the rack before opening a new board."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="On the rack"
          value={fmtCurrency(s.availableValue, 'IDR', { compact: true })}
          icon={<Recycle />} accent="primary"
          sub={`${fmtNumber(s.available)} pieces available, ${fmtNumber(s.reserved)} reserved`}
        />
        <KpiCard
          label="Recovery rate"
          value={fmtPercent(s.recoveryRatePercent, 0)}
          icon={<Ruler />}
          accent={s.recoveryRatePercent >= 70 ? 'success' : 'warning'}
          sub="of everything ever racked that got used rather than written off"
        />
        <KpiCard
          label="Ageing out"
          value={fmtCurrency(s.ageingValue, 'IDR', { compact: true })}
          icon={<Clock />}
          accent={s.ageing ? 'danger' : 'success'}
          sub={s.ageing ? `${fmtNumber(s.ageing)} piece(s) past ${REMNANT_AGEING_DAYS} days` : 'nothing has gone stale'}
        />
        <KpiCard
          label="Saved so far"
          value={fmtCurrency(s.consumedValue, 'IDR', { compact: true })}
          icon={<Recycle />} accent="success"
          sub={`against ${fmtCurrency(s.writtenOffValue, 'IDR', { compact: true })} written off`}
        />
      </div>

      {s.ageing > 0 && (
        <Card>
          <CardBody className="py-3">
            <p className="text-[12.5px] text-fg">
              <span className="font-semibold text-danger">{fmtNumber(s.ageing)}</span> piece{s.ageing === 1 ? '' : 's'} have been on the rack longer than {REMNANT_AGEING_DAYS} days, worth {fmtCurrency(s.ageingValue, 'IDR', { compact: true })}.{' '}
              <span className="text-fg-muted">
                Either put them into a glue-up now or write them off — a rack nobody clears stops being inventory and becomes a place things go to be forgotten.
              </span>
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <DataTable
          data={remnants}
          columns={columns}
          getId={(r) => r.id}
          getLabel={(r) => r.code}
          entityLabel="remnant"
          exportName="remnants"
          storageKey="remnants"
          searchText={(r) => `${r.code} ${r.species ?? ''} ${item(r.itemId)?.name ?? ''} ${remnantState(r).usableFor}`}
          initialSort={{ key: 'value', dir: 'desc' }}
          rowTone={(r) => (remnantState(r).ageing ? 'bg-danger-soft/25' : r.status === 'RESERVED' ? 'bg-info-soft/20' : undefined)}
          filters={[
            {
              key: 'status', label: 'Status', values: status, onChange: setStatus,
              options: REMNANT_STATUSES.map((x) => ({ value: x.value, label: x.label })),
              match: (r, v) => v.includes(r.status),
            },
            {
              key: 'flag', label: 'Show', values: flag, onChange: setFlag,
              options: [
                { value: 'RACK', label: 'On the rack' },
                { value: 'AGEING', label: 'Ageing out' },
                { value: 'LONG', label: 'Long pieces (1 m and over)' },
              ],
              match: (r, v) =>
                (!v.includes('RACK') || r.status === 'AVAILABLE' || r.status === 'RESERVED')
                && (!v.includes('AGEING') || remnantState(r).ageing)
                && (!v.includes('LONG') || (r.lengthMm ?? 0) >= 1000),
            },
          ]}
        />

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader icon={<Recycle />} title="What the rack holds" description="By material and by value. The top line is the one to check before the next purchase requisition goes out." />
            <CardBody className="space-y-3">
              {byMaterial.length === 0 && <Because>The rack is empty.</Because>}
              {byMaterial.map((row) => (
                <div key={row.itemId}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[12.5px] font-medium text-fg">{item(row.itemId)?.name}</span>
                    <span className="tnum shrink-0 text-[12px] text-fg-muted">{fmtCurrency(row.value, 'IDR', { compact: true })}</span>
                  </div>
                  <Progress
                    className="mt-1.5"
                    value={byMaterial[0].value > 0 ? (row.value / byMaterial[0].value) * 100 : 0}
                    tone="success" size="sm"
                  />
                  <p className="tnum mt-1 text-[11px] text-fg-muted">
                    {fmtNumber(row.count)} piece{row.count === 1 ? '' : 's'} · {fmtNumber(row.quantity, 2)} {row.uom}
                  </p>
                </div>
              ))}
              <Because className="border-t border-border pt-3">
                The MRP run nets these before it suggests buying anything. A works that skips that step buys boards it already owns, twice a quarter, and never finds out.
              </Because>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Ruler />} title="What a piece is worth" description="A remnant is not carried at full cost. What it is worth depends on what it can still make." />
            <CardBody className="space-y-2">
              {REMNANT_VALUE_FACTORS.map((f) => (
                <div key={f.kind} className="flex items-start justify-between gap-3 py-1">
                  <Tooltip content={f.hint}>
                    <span className="min-w-0 text-[12.5px] text-fg">{f.kind}</span>
                  </Tooltip>
                  <Badge tone={f.factor >= 0.75 ? 'success' : f.factor >= 0.5 ? 'warning' : 'neutral'} size="sm">
                    {fmtPercent(f.factor * 100, 0)}
                  </Badge>
                </div>
              ))}
              <Separator className="my-1" />
              <Because>
                Below {REMNANT_MIN_LENGTH_MM} mm nothing is racked at all. Handling, tagging and the bay it sits in cost more than the timber, and pretending otherwise is how a rack fills up with pieces nobody will ever use.
              </Because>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
