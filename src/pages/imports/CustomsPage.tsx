import * as React from 'react'
import { Link } from 'react-router-dom'
import { FileCheck2, Stamp, TriangleAlert } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { useMfg } from '@/store/useMfg'
import type { Permit } from '@/data/types'
import { documentCompleteness, pibGate, preferenceAtRisk } from '@/lib/importing'
import { clearanceByLane } from '@/lib/analytics'
import { CUSTOMS_OFFICES, laneMeta, LARTAS_TYPES, permitKindLabel, PERMIT_KINDS } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent, relativeLabel } from '@/lib/format'
import { daysBetween, TODAY } from '@/data/clock'

export function CustomsPage() {
  const s = useMfg()
  const [kind, setKind] = React.useState<string[]>([])

  const lanes = clearanceByLane(s.shipments)
  const declared = s.shipments.filter((x) => x.pibNumber)
  const incomplete = s.shipments.filter(
    (x) => ['ARRIVED', 'PIB_SUBMITTED', 'LANE_ASSIGNED'].includes(x.status) && !pibGate(x, s.items).ok,
  )
  const expiring = s.permits.filter((p) => p.expiresAt && daysBetween(TODAY, p.expiresAt) <= s.settings.permitWarningDays)
  const prefAtRisk = s.shipments
    .map((x) => ({ shipment: x, pref: preferenceAtRisk(x, s.items) }))
    .filter((x) => x.pref && !x.pref.cooOnFile)

  const permitColumns: Column<Permit>[] = [
    {
      key: 'kind', header: 'Permit', width: 'min-w-[260px]', pinned: true, sortable: true, sortValue: (p) => p.kind,
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold text-fg">{permitKindLabel(p.kind)}</p>
          <p className="truncate font-mono text-[11px] text-fg-muted">{p.number}</p>
        </div>
      ),
      exportValue: (p) => p.number,
    },
    {
      key: 'authority', header: 'Authority', width: 'w-[220px]',
      cell: (p) => (
        <Tooltip content={PERMIT_KINDS.find((x) => x.value === p.kind)?.hint ?? ''}>
          <span className="text-[12.5px] text-fg-muted">{p.authority}</span>
        </Tooltip>
      ),
      exportValue: (p) => p.authority,
    },
    {
      key: 'covers', header: 'Covers', width: 'min-w-[240px]',
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[11.5px] text-fg">{p.coversHsCodes.includes('*') ? 'every heading' : p.coversHsCodes.join(', ')}</p>
          {p.coversSpecies && <p className="truncate text-[11px] text-fg-muted">{p.coversSpecies.join(', ')}</p>}
        </div>
      ),
      exportValue: (p) => p.coversHsCodes.join(' '),
    },
    {
      key: 'issued', header: 'Issued', width: 'w-[120px]', sortable: true, sortValue: (p) => p.issuedAt,
      cell: (p) => <span className="tnum text-[12.5px]">{fmtDate(p.issuedAt)}</span>,
      exportValue: (p) => p.issuedAt,
    },
    {
      key: 'expires', header: 'Expires', width: 'w-[190px]', sortable: true, sortValue: (p) => p.expiresAt ?? '9999',
      cell: (p) => {
        if (!p.expiresAt) return <span className="text-[12px] text-fg-subtle">no expiry</span>
        const days = daysBetween(TODAY, p.expiresAt)
        return (
          <div>
            <p className={`tnum text-[12.5px] ${days < 0 ? 'font-semibold text-danger' : days <= 60 ? 'font-semibold text-warning' : 'text-fg'}`}>
              {fmtDate(p.expiresAt)}
            </p>
            <p className={`tnum text-[11px] ${days <= 60 ? 'text-warning' : 'text-fg-muted'}`}>{relativeLabel(p.expiresAt)}</p>
          </div>
        )
      },
      exportValue: (p) => p.expiresAt ?? '',
    },
    {
      key: 'shipment', header: 'Consignment', width: 'w-[160px]',
      cell: (p) => {
        const sh = s.shipments.find((x) => x.id === p.shipmentId)
        if (!sh) return <span className="text-[12px] text-fg-subtle">company-wide</span>
        return <Link to={`/imports/${sh.id}`} className="font-mono text-[12px] font-medium text-primary hover:underline">{sh.code}</Link>
      },
      exportValue: (p) => s.shipments.find((x) => x.id === p.shipmentId)?.code ?? '',
    },
    {
      key: 'note', header: 'Note', width: 'min-w-[340px]',
      cell: (p) => <p className="text-[12px] leading-relaxed text-fg-muted">{p.note ?? '—'}</p>,
      exportValue: (p) => p.note ?? '',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Customs & permits"
        description="The declaration register and the permits behind it. Every consignment is self-assessed and lodged through CEISA, then channelled hijau, kuning or merah — and the lane is not luck, it is a supplier’s paperwork record."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Declarations lodged" value={fmtNumber(declared.length)} icon={<Stamp />} accent="primary" sub={`${s.shipments.length} consignments on record`} />
        <KpiCard
          label="Incomplete declarations"
          value={fmtNumber(incomplete.length)}
          icon={<TriangleAlert />}
          accent={incomplete.length ? 'danger' : 'success'}
          sub={incomplete.length ? incomplete[0].code : 'every mandatory document is on file'}
        />
        <KpiCard
          label="Permits expiring"
          value={fmtNumber(expiring.length)}
          icon={<FileCheck2 />}
          accent={expiring.length ? 'warning' : 'success'}
          sub={`inside ${s.settings.permitWarningDays} days`}
        />
        <KpiCard
          label="Preference at risk"
          value={fmtCurrency(prefAtRisk.reduce((a, x) => a + (x.pref?.atRisk ?? 0), 0), 'IDR', { compact: true })}
          icon={<TriangleAlert />}
          accent={prefAtRisk.length ? 'danger' : 'success'}
          sub="duty riding on certificates that are not on file"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader title="Clearance by lane" description="Days from PIB to SPPB, on our own record. This is where the planning parameter comes from — not from a constant." />
          <CardBody className="space-y-4">
            {lanes.map((l) => {
              const meta = laneMeta(l.lane)
              return (
                <div key={l.lane}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-2 text-[12.5px] font-medium text-fg">
                      <StatusBadge value={l.lane} size="sm" />
                      <span className="text-fg-muted">{meta.local}</span>
                    </span>
                    <span className="tnum text-[12px] text-fg-muted">
                      {l.count} consignment{l.count === 1 ? '' : 's'} · {fmtNumber(l.averageDays, 1)} days average
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, (l.averageDays / 12) * 100)}
                    tone={l.lane === 'GREEN' ? 'success' : l.lane === 'YELLOW' ? 'warning' : 'danger'}
                    size="sm"
                  />
                  <Because className="mt-1 text-[11px]">
                    {meta.hint}
                    {l.worstDays > 0 && ` Worst on record: ${l.worstDays} days.`}
                  </Because>
                </div>
              )
            })}
            <Separator />
            <Because>
              The point of measuring this is not to complain about customs. It is that “red lane” becomes nine days rather
              than an unknown, and nine days is something a purchase order can be dated against.
            </Because>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<Stamp />} title="Declaration register" description="Every PIB, its channel and its release." />
          <CardBody className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                  <th className="py-2 pl-4 font-medium">Shipment</th>
                  <th className="px-2 py-2 font-medium">PIB</th>
                  <th className="px-2 py-2 font-medium">Lane</th>
                  <th className="px-2 py-2 font-medium">SPPB</th>
                  <th className="px-2 py-2 text-right font-medium">Days</th>
                  <th className="py-2 pr-4 text-right font-medium">Docs</th>
                </tr>
              </thead>
              <tbody>
                {s.shipments
                  .filter((x) => x.pibNumber || ['ARRIVED', 'PIB_SUBMITTED', 'LANE_ASSIGNED'].includes(x.status))
                  .sort((a, b) => ((a.pibDate ?? '9') < (b.pibDate ?? '9') ? 1 : -1))
                  .map((x) => {
                    const c = documentCompleteness(x)
                    const days = x.pibDate && x.sppbDate ? daysBetween(x.pibDate, x.sppbDate) : x.pibDate ? daysBetween(x.pibDate, TODAY) : null
                    return (
                      <tr key={x.id} className="border-b border-border/70 last:border-0 hover:bg-bg-muted/60">
                        <td className="py-2 pl-4">
                          <Link to={`/imports/${x.id}`} className="font-mono text-[12px] font-semibold text-fg hover:text-primary hover:underline">
                            {x.code}
                          </Link>
                          <p className="truncate text-[11px] text-fg-muted">{CUSTOMS_OFFICES.find((o) => o.code === x.customsOffice)?.name.replace('KPPBC ', '') ?? '—'}</p>
                        </td>
                        <td className="px-2 py-2">
                          <p className="font-mono text-[12px] text-fg">{x.pibNumber ?? '—'}</p>
                          <p className="tnum text-[10.5px] text-fg-muted">{fmtDate(x.pibDate, 'short')}</p>
                        </td>
                        <td className="px-2 py-2">
                          {x.lane === 'PENDING' ? <span className="text-[11.5px] text-fg-subtle">not channelled</span> : <StatusBadge value={x.lane} size="sm" />}
                        </td>
                        <td className="px-2 py-2">
                          <p className="font-mono text-[11.5px] text-fg-muted">{x.sppbNumber ?? '—'}</p>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <span className={`tnum text-[12px] ${days !== null && days > 7 ? 'font-semibold text-danger' : 'text-fg'}`}>
                            {days !== null ? days : '—'}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right">
                          <span className={`tnum text-[12px] ${c.percent === 100 ? 'text-success' : 'text-danger'}`}>{c.done}/{c.total}</span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>

      {incomplete.length > 0 && (
        <Card className="border-danger/50">
          <CardHeader icon={<TriangleAlert />} title="Declarations that cannot proceed" description="Everything downstream of a PIB waits on the piece of paper that is missing." />
          <CardBody className="space-y-3">
            {incomplete.map((x) => {
              const gate = pibGate(x, s.items)
              const ftDays = x.dischargedAt ? daysBetween(x.dischargedAt, TODAY) : 0
              return (
                <div key={x.id} className="rounded-lg border border-border bg-surface-sunken/60 p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link to={`/imports/${x.id}`} className="font-mono text-[12.5px] font-semibold text-fg hover:text-primary hover:underline">
                      {x.code} · {s.suppliers.find((sp) => sp.id === x.supplierId)?.name}
                    </Link>
                    <span className="tnum text-[11.5px] text-fg-muted">
                      discharged {ftDays} days ago, {x.freeTimeDays} days free
                    </span>
                  </div>
                  {gate.problems.map((p, i) => (
                    <div key={i} className="mt-1.5">
                      <p className="text-[12.5px] font-medium text-danger">{p.title}</p>
                      <Because>{p.detail}</Because>
                    </div>
                  ))}
                </div>
              )
            })}
          </CardBody>
        </Card>
      )}

      <DataTable
        data={s.permits}
        columns={permitColumns}
        getId={(p) => p.id}
        getLabel={(p) => p.number}
        entityLabel="permit"
        exportName="permits"
        storageKey="permits"
        searchText={(p) => `${p.number} ${p.authority} ${p.coversHsCodes.join(' ')} ${p.coversSpecies?.join(' ') ?? ''}`}
        initialSort={{ key: 'expires', dir: 'asc' }}
        rowTone={(p) => {
          if (!p.expiresAt) return undefined
          const days = daysBetween(TODAY, p.expiresAt)
          return days < 0 ? 'bg-danger-soft/30' : days <= 60 ? 'bg-warning-soft/25' : undefined
        }}
        filters={[
          {
            key: 'kind', label: 'Kind', values: kind, onChange: setKind,
            options: PERMIT_KINDS.map((x) => ({ value: x.value, label: x.label })),
            match: (p, v) => v.includes(p.kind),
          },
        ]}
        footerSummary={() => (
          <span className="text-[12px] text-fg-muted">
            {LARTAS_TYPES.filter((x) => x.value !== 'NONE').length} restriction regimes apply to this shopping list ·{' '}
            {fmtPercent((s.items.filter((i) => i.lartas !== 'NONE').length / s.items.length) * 100, 0)} of items are restricted
          </span>
        )}
      />
    </div>
  )
}
